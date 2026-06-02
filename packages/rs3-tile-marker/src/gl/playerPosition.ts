/**
 * Player Position Tracker
 * Finds player via occlusion mesh (tinted, animated mesh) and extracts position from model matrix
 * Based on RS3QuestBuddyGL implementation
 */

import * as patchrs from './patchrs_napi';
import { getProgramMeta, getUniformValue } from './renderprogram';

const TILESIZE = 512;

export interface PlayerPosition {
    x: number;
    y: number;
    z: number;
    rotation: number;
    vaoId: number;
    programId: number;
}

export interface CameraInfo {
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetZ: number;
    yaw: number;
}

export class PlayerPositionTracker {
    private debug: boolean;
    private cachedMesh: { vaoId: number; programId: number; timestamp: number } | null = null;
    private cacheTimeout: number;

    constructor(options: { debug?: boolean; cacheTimeout?: number } = {}) {
        this.debug = options.debug ?? false;
        this.cacheTimeout = options.cacheTimeout ?? 30000;
    }

    async getPosition(): Promise<PlayerPosition | null> {
        if (!patchrs.native) return null;

        try {
            const renders = await patchrs.native.recordRenderCalls({
                maxframes: 1,
                features: ["uniforms"],
                skipHandles: true,
            } as any);
            return this.findPlayer(renders);
        } catch (e) {
            if (this.debug) console.error("[PlayerPosition] Capture error:", e);
            return null;
        }
    }

    findPlayer(renders: patchrs.RenderInvocation[]): PlayerPosition | null {
        // Try fast path first if we have a cached mesh
        if (this.cachedMesh && Date.now() - this.cachedMesh.timestamp < this.cacheTimeout) {
            const cached = this.findCachedMesh(renders);
            if (cached) return cached;
        }

        // Full scan for player
        return this.scanForPlayer(renders);
    }

    private findCachedMesh(renders: patchrs.RenderInvocation[]): PlayerPosition | null {
        if (!this.cachedMesh) return null;

        for (const render of renders) {
            if (render.vertexObjectId !== this.cachedMesh.vaoId) continue;
            if (render.program?.programId !== this.cachedMesh.programId) continue;

            try {
                const progmeta = getProgramMeta(render.program);
                if (!progmeta.uModelMatrix) continue;

                const matrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as number[];
                if (!matrix || matrix.length < 16) continue;

                const x = Math.round(matrix[12] / TILESIZE) - 2;
                const y = matrix[13] / TILESIZE;
                const z = Math.round(matrix[14] / TILESIZE) - 1;

                if (x === 0 && z === 0) continue;

                return {
                    x, y, z,
                    rotation: Math.atan2(-matrix[8], matrix[0]),
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                };
            } catch {
                continue;
            }
        }

        this.cachedMesh = null;
        return null;
    }

    private scanForPlayer(renders: patchrs.RenderInvocation[]): PlayerPosition | null {
        interface Candidate {
            x: number; y: number; z: number;
            rawX: number; rawZ: number;
            rotation: number;
            vaoId: number;
            programId: number;
            tintAlpha: number;
            tint: number[];
            distFromCamera?: number;
        }

        const candidates: Candidate[] = [];

        for (const render of renders) {
            if (!render.program || !render.uniformState) continue;

            const hasFrag = typeof render.program.fragmentShader?.source === 'string';
            const hasVert = typeof render.program.vertexShader?.source === 'string';
            if (!hasFrag || !hasVert) continue;

            let progmeta;
            try {
                progmeta = getProgramMeta(render.program);
            } catch {
                continue;
            }

            // Must be tinted and animated (player has bones)
            if (!progmeta.isTinted || !progmeta.uTint || !progmeta.uModelMatrix) continue;
            if (!progmeta.isAnimated) continue;

            try {
                const tint = getUniformValue(render.uniformState, progmeta.uTint)[0] as number[];
                if (!tint || tint.length < 4) continue;

                // Occlusion: RGB ~0, alpha <= 0.6
                const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
                if (rgbSum > 0.1 || tint[3] > 0.6) continue;

                const matrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as number[];
                if (!matrix || matrix.length < 16) continue;

                const rawX = matrix[12];
                const rawZ = matrix[14];
                const x = Math.round(rawX / TILESIZE) - 2;
                const y = matrix[13] / TILESIZE;
                const z = Math.round(rawZ / TILESIZE) - 1;

                if (x === 0 && z === 0) continue;

                candidates.push({
                    x, y, z,
                    rawX, rawZ,
                    rotation: Math.atan2(-matrix[8], matrix[0]),
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                    tintAlpha: tint[3],
                    tint: [...tint],
                });
            } catch {
                continue;
            }
        }

        if (candidates.length === 0) return null;

        // Use camera to pick player (closest to camera target)
        const camera = this.extractCamera(renders);

        if (camera) {
            for (const c of candidates) {
                c.distFromCamera = Math.sqrt(
                    Math.pow(c.x - camera.targetX, 2) +
                    Math.pow(c.z - camera.targetZ, 2)
                );
            }
            candidates.sort((a, b) => (a.distFromCamera ?? 0) - (b.distFromCamera ?? 0));
        } else {
            candidates.sort((a, b) => Math.abs(a.tintAlpha - 0.5) - Math.abs(b.tintAlpha - 0.5));
        }

        const best = candidates[0];

        if (this.debug) {
            console.log(`[PlayerScan] ${candidates.length} candidates from ${renders.length} renders, picked pos=(${best.x}, ${best.z}) VAO=${best.vaoId}`);
        }

        this.cachedMesh = {
            vaoId: best.vaoId,
            programId: best.programId,
            timestamp: Date.now(),
        };

        if (this.debug) {
            console.log(`[PlayerPosition] Found at (${best.x.toFixed(1)}, ${best.z.toFixed(1)})`);
        }

        return {
            x: best.x,
            y: best.y,
            z: best.z,
            rotation: best.rotation,
            vaoId: best.vaoId,
            programId: best.programId,
        };
    }

    private extractCamera(renders: patchrs.RenderInvocation[]): CameraInfo | null {
        for (const render of renders) {
            const uViewMatrix = render.program?.uniforms?.find(u => u.name === "uViewMatrix");
            if (!uViewMatrix || !render.uniformState) continue;

            try {
                const v = getUniformValue(render.uniformState, uViewMatrix)[0] as number[];
                if (!v || v.length < 16) continue;

                const camX = -(v[0] * v[12] + v[1] * v[13] + v[2] * v[14]);
                const camY = -(v[4] * v[12] + v[5] * v[13] + v[6] * v[14]);
                const camZ = -(v[8] * v[12] + v[9] * v[13] + v[10] * v[14]);

                const fwdX = -v[2];
                const fwdY = -v[6];
                const fwdZ = -v[10];

                const yaw = Math.atan2(fwdX, fwdZ);

                if (fwdY >= 0) {
                    return {
                        x: camX / TILESIZE,
                        y: camY / TILESIZE,
                        z: camZ / TILESIZE,
                        targetX: camX / TILESIZE,
                        targetZ: camZ / TILESIZE,
                        yaw,
                    };
                }

                const t = -camY / fwdY;
                return {
                    x: camX / TILESIZE,
                    y: camY / TILESIZE,
                    z: camZ / TILESIZE,
                    targetX: (camX + t * fwdX) / TILESIZE,
                    targetZ: (camZ + t * fwdZ) / TILESIZE,
                    yaw,
                };
            } catch {
                continue;
            }
        }
        return null;
    }

    async getCamera(): Promise<CameraInfo | null> {
        if (!patchrs.native) return null;

        try {
            const renders = await patchrs.native.recordRenderCalls({
                maxframes: 1,
                features: ["uniforms"],
                skipHandles: true,
            } as any);
            return this.extractCamera(renders);
        } catch {
            return null;
        }
    }

    clearCache(): void {
        this.cachedMesh = null;
    }
}

// Singleton tracker
let _tracker: PlayerPositionTracker | null = null;

export async function getPlayerPosition(preRecordedRenders?: patchrs.RenderInvocation[]): Promise<PlayerPosition | null> {
    if (!_tracker) _tracker = new PlayerPositionTracker();
    if (preRecordedRenders) return _tracker.findPlayer(preRecordedRenders);
    return _tracker.getPosition();
}

export async function getPlayerTile(): Promise<{ x: number; z: number } | null> {
    const pos = await getPlayerPosition();
    return pos ? { x: pos.x, z: pos.z } : null;
}

export async function getCameraInfo(): Promise<CameraInfo | null> {
    if (!_tracker) _tracker = new PlayerPositionTracker();
    return _tracker.getCamera();
}

// =============================================================================
// Passive Player Tracker (uses streaming to continuously track player position)
// =============================================================================

/**
 * PassivePlayerTracker - Streaming-based player position tracking
 *
 * Uses streamRenderCalls to monitor renders and extract player position
 * from the tinted occlusion mesh's uModelMatrix uniform.
 *
 * This is more efficient than polling with recordRenderCalls because:
 * - No frame capture overhead
 * - Continuous updates without explicit polling
 * - Lower latency position tracking
 */
export class PassivePlayerTracker {
    private debug: boolean;
    private initialized = false;
    private stream: patchrs.StreamRenderObject | null = null;
    private currentPosition: PlayerPosition | null = null;
    private lastUpdateTime = 0;
    private processCounter = 0;

    constructor(options: { debug?: boolean } = {}) {
        this.debug = options.debug ?? false;
    }

    /**
     * Initialize streaming position tracking
     */
    async init(): Promise<boolean> {
        if (this.initialized && this.stream) return true;
        if (!patchrs.native) {
            console.error("[PassivePlayer] Native addon not available");
            return false;
        }

        console.log("[PassivePlayer] Initializing stream-based tracking...");

        try {
            // Start streaming render calls
            // Need uniforms to find the player mesh via getProgramMeta
            this.stream = patchrs.native.streamRenderCalls(
                {
                    features: ["uniforms"],
                    framecooldown: 500, // Post-contextIsolation: each callback serializes hundreds of renders over IPC; 100ms floods the renderer
                },
                (renders) => this.processRenders(renders)
            );

            this.initialized = true;
            console.log("[PassivePlayer] Stream initialized successfully");
            return true;
        } catch (e) {
            console.error("[PassivePlayer] Init error:", e);
            return false;
        }
    }

    /**
     * Process renders to find player position
     */
    private processRenders(renders: patchrs.RenderInvocation[]): void {
        this.processCounter++;
        const shouldLog = (this.processCounter % 30) === 1; // Log every 30th call

        // Find the player's tinted occlusion mesh and extract position
        let skippedNoShader = 0;
        let matchCount = 0;

        for (const render of renders) {
            if (!render.program || !render.uniformState) continue;

            const hasFrag = typeof render.program.fragmentShader?.source === 'string';
            const hasVert = typeof render.program.vertexShader?.source === 'string';
            if (!hasFrag || !hasVert) {
                skippedNoShader++;
                continue;
            }

            let progmeta;
            try {
                progmeta = getProgramMeta(render.program);
            } catch {
                continue;
            }

            // Look for tinted + animated mesh with uModelMatrix
            if (!progmeta.isTinted || !progmeta.uTint || !progmeta.isAnimated || !progmeta.uModelMatrix) continue;

            try {
                const tint = getUniformValue(render.uniformState, progmeta.uTint)[0] as number[];
                if (!tint || tint.length < 4) continue;

                // Occlusion: RGB ~0, alpha <= 0.6
                const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
                if (rgbSum > 0.1 || tint[3] > 0.6) continue;

                // Found player mesh - extract position from model matrix
                const matrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as number[];
                if (!matrix || matrix.length < 16) continue;

                const rawX = matrix[12];
                const rawY = matrix[13];
                const rawZ = matrix[14];

                if (rawX === 0 && rawZ === 0) continue;

                matchCount++;
                const x = Math.round(rawX / TILESIZE) - 2;
                const y = rawY / TILESIZE;
                const z = Math.round(rawZ / TILESIZE) - 1;

                if (shouldLog) {
                    console.log(`[PassivePlayer] MATCH #${matchCount}: VAO=${render.vertexObjectId} prog=${render.program.programId} ` +
                                `tint=[${tint.map(t => t.toFixed(3)).join(',')}] ` +
                                `pos=(${x}, ${z}) raw=(${rawX.toFixed(1)}, ${rawZ.toFixed(1)})`);
                }

                this.currentPosition = {
                    x,
                    y,
                    z,
                    rotation: Math.atan2(-matrix[8], matrix[0]),
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                };
                this.lastUpdateTime = Date.now();

                if (this.debug && (this.processCounter % 50) === 0) {
                    console.log("[PassivePlayer] Position:", x.toFixed(1), z.toFixed(1));
                }

                // Found player, stop searching this frame
                return;
            } catch {
                continue;
            }
        }

        // Only log failures occasionally to avoid spam
        if (this.debug && (this.processCounter % 100) === 0) {
            console.log(`[PassivePlayer] No player found in ${renders.length} renders (${skippedNoShader} skipped - no shader)`);
        }
    }

    /**
     * Get current player position (instant read from cached value)
     */
    getPosition(): PlayerPosition | null {
        // Return cached position if recent (within 500ms)
        if (this.currentPosition && Date.now() - this.lastUpdateTime < 500) {
            return this.currentPosition;
        }
        return null;
    }

    /**
     * Async version - just returns cached position (stream updates it automatically)
     */
    async getPositionAsync(): Promise<PlayerPosition | null> {
        return this.getPosition();
    }

    /**
     * Reinitialize (restart stream)
     */
    async reinit(): Promise<boolean> {
        this.stop();
        return this.init();
    }

    /**
     * Stop tracking
     */
    stop(): void {
        if (this.stream) {
            try {
                this.stream.close();
            } catch (e) {
                // Ignore close errors
            }
            this.stream = null;
        }
        this.currentPosition = null;
        this.initialized = false;
    }

    /**
     * Check if initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get last update timestamp
     */
    getLastUpdateTime(): number {
        return this.lastUpdateTime;
    }
}

// Singleton passive tracker
let _passiveTracker: PassivePlayerTracker | null = null;

/**
 * Get the singleton passive player tracker
 */
export function getPassiveTracker(): PassivePlayerTracker {
    if (!_passiveTracker) {
        _passiveTracker = new PassivePlayerTracker();
    }
    return _passiveTracker;
}

/**
 * Initialize passive tracking (call once at startup)
 */
export async function initPassiveTracking(options?: { debug?: boolean }): Promise<boolean> {
    if (!_passiveTracker) {
        _passiveTracker = new PassivePlayerTracker(options);
    }
    return _passiveTracker.init();
}

/**
 * Get player position from passive tracker (instant, no frame capture)
 */
export function getPassivePlayerPosition(): PlayerPosition | null {
    const tracker = getPassiveTracker();
    if (!tracker.isInitialized()) return null;
    return tracker.getPosition();
}

/**
 * Stop passive tracking
 */
export function stopPassiveTracking(): void {
    if (_passiveTracker) {
        _passiveTracker.stop();
        _passiveTracker = null;
    }
}
