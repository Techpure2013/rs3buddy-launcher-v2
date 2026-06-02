/**
 * Tile Marker - Creates and manages tile overlay markers
 * Uses patchrs_napi for GL overlay rendering
 *
 * Key concepts:
 * - Geometry uses CHUNK-LOCAL coordinates (relative to chunk center)
 * - Model matrix positions the chunk in world space
 * - Triggers on floor vertexObjectId, not programId
 */

import {
    native,
    GlProgram,
    GlOverlay,
    RenderInvocation,
    RenderInput,
    GlAttributeArgument,
    GlUniformArgument,
    OverlayUniformSource
} from './patchrs_napi';

import {
    TILE_SIZE,
    CHUNK_SIZE,
    HEIGHT_SCALING,
    tileToChunk,
    tileToLocal,
    fetchHeightData
} from './heightData';

import { reportFloorChunk } from './instanceDetector';
import { getInstanceChunkBaseHeight } from './instanceHeightData';

// GL Constants
const GL_FLOAT = 0x1406;
const GL_UNSIGNED_BYTE = 0x1401;
const GL_FLOAT_MAT4 = 0x8B5C;
const GL_FLOAT_VEC3 = 0x8B51;
const GL_FLOAT_VEC2 = 0x8B50;

// Shaders matching alt1gl-main tilemarkers.ts
const TILE_VERT_SHADER = `
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 6) in vec3 aColor;

uniform highp mat4 uModelMatrix;
uniform highp mat4 uViewProjMatrix;

out vec4 ourColor;
out vec3 FragPos;

void main() {
    vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
    gl_Position = uViewProjMatrix * worldpos;
    FragPos = worldpos.xyz/worldpos.w;
    ourColor = vec4(aColor, 1.0);
}
`;

const TILE_FRAG_SHADER = `
#version 330 core
in vec3 FragPos;
in vec4 ourColor;

uniform vec3 uInvSunDirection;
uniform vec3 uSunColour;
uniform vec3 uAmbientColour;

out vec4 FragColor;

void main() {
    vec3 dx = dFdx(FragPos);
    vec3 dy = dFdy(FragPos);
    vec3 norm = normalize(cross(dx, dy));

    vec3 lightDir = normalize(-uInvSunDirection);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * uSunColour;
    vec3 lighting = clamp(diffuse + uAmbientColour, vec3(0.0), vec3(1.5));
    vec3 finalColor = ourColor.rgb * lighting;

    FragColor = vec4(finalColor * 0.5, ourColor.a);
}
`;

// Color presets
export const COLORS = {
    RED: [1.0, 0.2, 0.2, 1.0] as [number, number, number, number],
    GREEN: [0.2, 1.0, 0.2, 1.0] as [number, number, number, number],
    BLUE: [0.2, 0.4, 1.0, 1.0] as [number, number, number, number],
    YELLOW: [1.0, 1.0, 0.2, 1.0] as [number, number, number, number],
    CYAN: [0.2, 1.0, 1.0, 1.0] as [number, number, number, number],
    MAGENTA: [1.0, 0.2, 1.0, 1.0] as [number, number, number, number],
    ORANGE: [1.0, 0.5, 0.1, 1.0] as [number, number, number, number],
    WHITE: [1.0, 1.0, 1.0, 1.0] as [number, number, number, number],
};

export interface TileMarkerConfig {
    tileX: number;       // Public tile coords (for height data from runeapps)
    tileZ: number;
    renderTileX?: number; // Instance tile coords (for floor VAO matching). If unset, uses tileX/Z.
    renderTileZ?: number;
    level?: number;
    color?: [number, number, number, number];
    label?: string;
}

export interface ActiveMarker {
    id: string;
    config: TileMarkerConfig;
    overlay: GlOverlay | null;
    chunkX: number;
    chunkZ: number;
}

// Store for active markers
const activeMarkers = new Map<string, ActiveMarker>();

// Cached program (reused for all markers)
let tileProgram: GlProgram | null = null;

// Floor render info (includes vertexObjectId for triggering)
interface FloorRenderInfo {
    program: GlProgram;
    vertexObjectId: number;
    chunkX: number;
    chunkZ: number;
    modelY: number; // Y component from model matrix (base elevation)
    meshHash: string; // Stable identifier: programId + chunkPosition
}

// Map of chunk -> floor render info
const floorRenders = new Map<string, FloorRenderInfo>();

// Track wrong program mask for filtering
let wrongProgramMask = 0;

// Cooldown for detectFloorProgram to prevent cascading retries via IPC
let lastFloorDetectTime = 0;
const FLOOR_DETECT_COOLDOWN = 3000; // 3 seconds minimum between detections

// VAO stability: require a new vertexObjectId to be seen in 2 consecutive refreshes
// before reporting it as changed. Prevents thrashing from flip-flopping VAO IDs.
const pendingVaoChanges = new Map<string, number>(); // chunkKey → candidate vertexObjectId

/**
 * Check if any detected floor chunks are in instance space (chunkX >= 100).
 * More reliable than player position for determining instance state.
 */
export function hasInstanceFloorChunks(): boolean {
    for (const floor of floorRenders.values()) {
        if (floor.chunkX >= 100) return true;
    }
    return false;
}

/**
 * Check if native addon is available
 */
export function isNativeAvailable(): boolean {
    return native != null;
}

/**
 * Check if RS client is ready
 */
export function isRsReady(): boolean {
    return native?.getRsReady() > 0;
}

/**
 * Generate a unique marker ID
 */
function generateMarkerId(config: TileMarkerConfig): string {
    return `tile_${config.tileX}_${config.tileZ}_${config.level ?? 0}`;
}

/**
 * Create a translation matrix for positioning
 */
function createPositionMatrix(x: number, y: number, z: number): Float32Array {
    const m = new Float32Array(16);
    // Identity with translation
    m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
    m[12] = x; m[13] = y; m[14] = z;
    return m;
}

/**
 * Create geometry for a single tile using CHUNK-LOCAL coordinates
 * This matches tilemarkers.ts approach exactly
 * If no height data is available, creates a flat tile at Y=0
 */
async function createTileGeometry(
    tileX: number,
    tileZ: number,
    level: number,
    color: [number, number, number, number],
    renderTileX?: number,
    renderTileZ?: number
): Promise<{
    positions: Float32Array;
    colors: Uint8Array;
    indices: Uint8Array;
    chunkX: number;
    chunkZ: number;
    hasHeightData: boolean;
}> {
    // Public chunk/local — for height data from runeapps
    const { chunkX: publicChunkX, chunkZ: publicChunkZ } = tileToChunk(tileX, tileZ);
    const { localX: publicLocalX, localZ: publicLocalZ } = tileToLocal(tileX, tileZ);

    // Render chunk/local — for vertex positioning (defaults to public when no render coords)
    const rTileX = renderTileX ?? tileX;
    const rTileZ = renderTileZ ?? tileZ;
    const { chunkX: renderChunkX, chunkZ: renderChunkZ } = tileToChunk(rTileX, rTileZ);
    const { localX: renderLocalX, localZ: renderLocalZ } = tileToLocal(rTileX, rTileZ);

    // Fetch height data from PUBLIC chunk
    const heightData = await fetchHeightData(publicChunkX, publicChunkZ, level);
    if (!heightData) {
        console.warn(`[TileMarker] No height data for tile ${tileX},${tileZ} - using flat surface`);
    }

    // Root position (chunk center) - EXACTLY like tilemarkers.ts
    const rootx = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootz = -CHUNK_SIZE / 2 * TILE_SIZE;

    // Height offset to render above terrain
    const heightOffset = 1 / 32;

    // Get height at tile corners with bilinear interpolation
    // Falls back to flat surface (Y=0) if no height data
    // Height lookup uses PUBLIC local coords to index into public height data
    const getHeight = (subX: number, subZ: number): number => {
        if (!heightData) {
            return heightOffset * TILE_SIZE;  // Flat surface with small offset
        }

        const clampedX = Math.max(0, Math.min(CHUNK_SIZE - 1, heightLocalX));
        const clampedZ = Math.max(0, Math.min(CHUNK_SIZE - 1, heightLocalZ));
        const tileIndex = (clampedX + clampedZ * CHUNK_SIZE) * 5;

        const dx = 0.5 + subX;
        const dz = 0.5 + subZ;

        const y00 = heightData[tileIndex + 0] * HEIGHT_SCALING * (1 - dx) * (1 - dz);
        const y01 = heightData[tileIndex + 1] * HEIGHT_SCALING * dx * (1 - dz);
        const y10 = heightData[tileIndex + 2] * HEIGHT_SCALING * (1 - dx) * dz;
        const y11 = heightData[tileIndex + 3] * HEIGHT_SCALING * dx * dz;

        return y00 + y01 + y10 + y11 + heightOffset * TILE_SIZE;
    };

    // Vertex position uses RENDER local coords (where the tile sits in the render chunk)
    const tileLocalX = renderChunkX >= 100 ? renderLocalX : renderLocalX + 1;
    const tileLocalZ = renderLocalZ;

    // Height data indexed by PUBLIC local coords (into the public chunk's height array)
    const heightLocalX = publicChunkX >= 100 ? publicLocalX : publicLocalX + 1;
    const heightLocalZ = publicLocalZ;

    // Create quad vertices in chunk-local coordinates
    // Corners: SW, SE, NE, NW
    const pos: number[] = [];
    const colorData: number[] = [];

    // Convert color to 0-255 range for UNSIGNED_BYTE
    const colorBytes = [
        Math.floor(color[0] * 255),
        Math.floor(color[1] * 255),
        Math.floor(color[2] * 255)
    ];

    // SW corner (subX=-0.5, subZ=-0.5)
    pos.push((tileLocalX + 0) * TILE_SIZE + rootx);
    pos.push(getHeight(-0.5, -0.5));
    pos.push((tileLocalZ + 0) * TILE_SIZE + rootz);
    colorData.push(...colorBytes);

    // SE corner (subX=0.5, subZ=-0.5)
    pos.push((tileLocalX + 1) * TILE_SIZE + rootx);
    pos.push(getHeight(0.5, -0.5));
    pos.push((tileLocalZ + 0) * TILE_SIZE + rootz);
    colorData.push(...colorBytes);

    // NE corner (subX=0.5, subZ=0.5)
    pos.push((tileLocalX + 1) * TILE_SIZE + rootx);
    pos.push(getHeight(0.5, 0.5));
    pos.push((tileLocalZ + 1) * TILE_SIZE + rootz);
    colorData.push(...colorBytes);

    // NW corner (subX=-0.5, subZ=0.5)
    pos.push((tileLocalX + 0) * TILE_SIZE + rootx);
    pos.push(getHeight(-0.5, 0.5));
    pos.push((tileLocalZ + 1) * TILE_SIZE + rootz);
    colorData.push(...colorBytes);

    const positions = Float32Array.from(pos);
    const colors = Uint8Array.from(colorData);

    // Indices: two triangles forming a quad (counterclockwise winding)
    const indices = new Uint8Array([
        0, 2, 1,  // SE triangle
        0, 3, 2   // NW triangle
    ]);

    console.log(`[TileMarker] Created geometry for tile ${tileX},${tileZ} (render: ${rTileX},${rTileZ}) in chunk ${renderChunkX},${renderChunkZ}`);
    console.log(`[TileMarker] Render local: ${tileLocalX},${tileLocalZ}, height local: ${heightLocalX},${heightLocalZ}`);

    return { positions, colors, indices, chunkX: renderChunkX, chunkZ: renderChunkZ, hasHeightData: !!heightData };
}

/**
 * Initialize the tile program (call once)
 */
function initTileProgram(): GlProgram | null {
    if (!native) {
        console.error('[TileMarker] Native addon not initialized');
        return null;
    }

    if (tileProgram) {
        return tileProgram;
    }

    try {
        // Attribute inputs - color is vec3 (RGB), not vec4
        const inputs: GlAttributeArgument[] = [
            { name: 'aPos', location: 0, type: GL_FLOAT, length: 3 },
            { name: 'aColor', location: 6, type: GL_UNSIGNED_BYTE, length: 3 }
        ];

        // Uniform arguments - layout for snapshot buffer (matching alt1gl-main)
        // Total size: 64 (model) + 64 (viewproj) + 12 (ambient) + 12 (sundir) + 12 (suncolor) = 164 bytes
        const uniforms: GlUniformArgument[] = [
            { name: 'uModelMatrix', type: GL_FLOAT_MAT4, length: 1, snapshotOffset: 0, snapshotSize: 64 },
            { name: 'uViewProjMatrix', type: GL_FLOAT_MAT4, length: 1, snapshotOffset: 64, snapshotSize: 64 },
            { name: 'uAmbientColour', type: GL_FLOAT_VEC3, length: 1, snapshotOffset: 128, snapshotSize: 12 },
            { name: 'uInvSunDirection', type: GL_FLOAT_VEC3, length: 1, snapshotOffset: 140, snapshotSize: 12 },
            { name: 'uSunColour', type: GL_FLOAT_VEC3, length: 1, snapshotOffset: 152, snapshotSize: 12 }
        ];

        tileProgram = native.createProgram(TILE_VERT_SHADER, TILE_FRAG_SHADER, inputs, uniforms);
        console.log('[TileMarker] Tile program created');
        return tileProgram;
    } catch (e) {
        console.error('[TileMarker] Failed to create tile program:', e);
        return null;
    }
}

/**
 * Detect floor renders from game - stores vertexObjectId for each chunk
 * Floor programs have the 'aMaterialSettingsSlotXY3' input attribute
 */
export async function detectFloorProgram(force = false): Promise<boolean> {
    if (!native) return false;

    // Cooldown: avoid cascading IPC calls when multiple markers fail simultaneously
    const now = Date.now();
    if (!force && now - lastFloorDetectTime < FLOOR_DETECT_COOLDOWN) {
        return floorRenders.size > 0;
    }
    lastFloorDetectTime = now;

    try {
        console.log('[TileMarker] Detecting floor renders...');
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ["uniforms"],
            skipHandles: true,
        } as any);

        console.log(`[TileMarker] Got ${renders.length} renders`);

        // Build new floor map from recording results
        // Only replace existing data if we actually found floors — recording may
        // return 0 renders when MAX_CONCURRENT_RECORDINGS is hit (e.g. passive
        // stream occupies a slot), and destroying good data on empty results
        // leaves no fallback for markers.
        const newFloorRenders = new Map<string, FloorRenderInfo>();
        let floorCount = 0;

        // Look for floor renders - has 'aMaterialSettingsSlotXY3' input
        for (const render of renders) {
            if (!render.program) continue;

            // Floor meshes have this specific input attribute
            const isFloor = render.program.inputs.some(i => i.name === 'aMaterialSettingsSlotXY3');
            if (!isFloor) continue;

            floorCount++;

            // Extract chunk position from uModelMatrix
            const modelMatrixUniform = render.program.uniforms.find(u => u.name === 'uModelMatrix');
            if (!modelMatrixUniform || !render.uniformState) continue;

            const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset);
            const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
            const y = view.getFloat32(modelMatrixUniform.snapshotOffset + 13 * 4, true);
            const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);

            const chunkX = Math.floor(x / CHUNK_SIZE / TILE_SIZE);
            const chunkZ = Math.floor(z / CHUNK_SIZE / TILE_SIZE);
            const chunkKey = `${chunkX},${chunkZ}`;

            // Build wrong program mask for filtering (like TileOverlayManager)
            wrongProgramMask |= 1 << (render.program.programId % 32);

            // Store floor render info for this chunk
            if (!newFloorRenders.has(chunkKey)) {
                newFloorRenders.set(chunkKey, {
                    program: render.program,
                    vertexObjectId: render.vertexObjectId,
                    chunkX,
                    chunkZ,
                    modelY: y,
                    meshHash: `floor_${render.program.programId}_${chunkKey}`
                });
                // Report floor chunk to instance detector for fingerprinting
                reportFloorChunk(chunkX, chunkZ);
                console.log(`[TileMarker] Floor chunk ${chunkKey}: programId=${render.program.programId}, vertexObjectId=${render.vertexObjectId}`);
            }
        }

        // Only replace floor data if we actually found floors
        if (newFloorRenders.size > 0) {
            floorRenders.clear();
            for (const [key, value] of newFloorRenders) {
                floorRenders.set(key, value);
            }
        } else if (renders.length === 0) {
            // Recording was rejected (0 renders) — keep existing data intact
            console.warn(`[TileMarker] Recording returned 0 renders (concurrent limit?), keeping ${floorRenders.size} existing floor entries`);
        }

        console.log(`[TileMarker] Found ${floorCount} floor renders, ${floorRenders.size} unique chunks`);

        if (floorRenders.size > 0) {
            // Log first floor's uniforms for debugging
            const firstFloor = floorRenders.values().next().value;
            if (firstFloor) {
                const uniformNames = firstFloor.program.uniforms.map((u: any) => u.name).join(', ');
                console.log(`[TileMarker] Floor program uniforms: ${uniformNames}`);
            }
        }

        return floorRenders.size > 0;
    } catch (e) {
        console.error('[TileMarker] Failed to detect floor program:', e);
        return false;
    }
}

/**
 * Re-detect floor programs and check if any vertexObjectIds changed.
 * Returns chunk keys where the floor mesh ID changed (overlays need recreating).
 */
export async function refreshFloorPrograms(preRecordedRenders?: any[]): Promise<string[]> {
    if (!native && !preRecordedRenders) return [];

    try {
        const renders = preRecordedRenders ?? await native!.recordRenderCalls({
            maxframes: 1,
            features: ["uniforms"],
            skipHandles: true,
        } as any);

        const changedChunks: string[] = [];

        for (const render of renders) {
            if (!render.program) continue;

            const isFloor = render.program.inputs.some((i: any) => i.name === 'aMaterialSettingsSlotXY3');
            if (!isFloor) continue;

            const modelMatrixUniform = render.program.uniforms.find((u: any) => u.name === 'uModelMatrix');
            if (!modelMatrixUniform || !render.uniformState) continue;

            const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset);
            const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
            const y = view.getFloat32(modelMatrixUniform.snapshotOffset + 13 * 4, true);
            const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);

            const chunkX = Math.floor(x / CHUNK_SIZE / TILE_SIZE);
            const chunkZ = Math.floor(z / CHUNK_SIZE / TILE_SIZE);
            const chunkKey = `${chunkX},${chunkZ}`;

            wrongProgramMask |= 1 << (render.program.programId % 32);

            const existing = floorRenders.get(chunkKey);
            if (existing) {
                if (existing.vertexObjectId !== render.vertexObjectId) {
                    // VAO changed — check if this is the same candidate as last refresh
                    const pending = pendingVaoChanges.get(chunkKey);
                    if (pending === render.vertexObjectId) {
                        // Stable for 2 consecutive refreshes — apply the change
                        console.log(`[TileMarker] Floor mesh stable change for chunk ${chunkKey}: vertexObjectId ${existing.vertexObjectId} -> ${render.vertexObjectId}`);
                        existing.vertexObjectId = render.vertexObjectId;
                        existing.modelY = y;
                        pendingVaoChanges.delete(chunkKey);
                        changedChunks.push(chunkKey);
                    } else {
                        // First time seeing this new VAO — mark as pending, don't apply yet
                        pendingVaoChanges.set(chunkKey, render.vertexObjectId);
                    }
                } else {
                    // VAO matches current — clear any pending change
                    pendingVaoChanges.delete(chunkKey);
                }
            } else {
                // New floor chunk discovered
                floorRenders.set(chunkKey, {
                    program: render.program,
                    vertexObjectId: render.vertexObjectId,
                    chunkX,
                    chunkZ,
                    modelY: y,
                    meshHash: `floor_${render.program.programId}_${chunkKey}`
                });
                reportFloorChunk(chunkX, chunkZ);
                changedChunks.push(chunkKey);
            }
        }

        // NOTE: Do NOT remove floor entries for chunks not in the current frame.
        // The game only renders visible/on-screen chunks each frame. Off-screen
        // chunks still have valid floor meshes and their vertexObjectIds remain stable.
        // Floor entries are only cleared on full re-detection (detectFloorProgram).

        return changedChunks;
    } catch (e) {
        console.error('[TileMarker] Failed to refresh floor programs:', e);
        return [];
    }
}

/**
 * Get all active markers in specific chunks
 */
export function getMarkersInChunks(chunkKeys: string[]): ActiveMarker[] {
    const keySet = new Set(chunkKeys);
    return Array.from(activeMarkers.values()).filter(
        m => keySet.has(`${m.chunkX},${m.chunkZ}`)
    );
}

/**
 * Get floor render info for a specific chunk
 */
function getFloorForChunk(chunkX: number, chunkZ: number): FloorRenderInfo | null {
    const key = `${chunkX},${chunkZ}`;
    return floorRenders.get(key) ?? null;
}

/**
 * Find the nearest floor render to a given chunk
 * Returns the closest floor by Manhattan distance
 */
function getNearestFloor(targetChunkX: number, targetChunkZ: number): FloorRenderInfo | null {
    if (floorRenders.size === 0) return null;

    let nearestFloor: FloorRenderInfo | null = null;
    let nearestDistance = Infinity;

    for (const floor of floorRenders.values()) {
        const distance = Math.abs(floor.chunkX - targetChunkX) + Math.abs(floor.chunkZ - targetChunkZ);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestFloor = floor;
        }
    }

    if (nearestFloor) {
        console.log(`[TileMarker] Nearest floor to chunk ${targetChunkX},${targetChunkZ} is chunk ${nearestFloor.chunkX},${nearestFloor.chunkZ} (distance: ${nearestDistance})`);
    }

    return nearestFloor;
}

/**
 * Get any available floor render (first one found)
 */
function getAnyFloor(): FloorRenderInfo | null {
    const first = floorRenders.values().next();
    return first.done ? null : first.value;
}

/**
 * Add a tile marker
 */
export async function addMarker(config: TileMarkerConfig): Promise<ActiveMarker | null> {
    if (!native) {
        console.error('[TileMarker] Native addon not initialized');
        return null;
    }

    const id = generateMarkerId(config);

    // Remove existing marker at same position
    if (activeMarkers.has(id)) {
        await removeMarker(id);
    }

    // Ensure program is initialized
    const program = initTileProgram();
    if (!program) return null;

    const level = config.level ?? 0;
    const color = config.color ?? COLORS.CYAN;

    // Create geometry: PUBLIC coords for height data, RENDER coords for vertex positioning
    const geometry = await createTileGeometry(config.tileX, config.tileZ, level, color, config.renderTileX, config.renderTileZ);

    // For floor VAO matching: use renderTile coords if provided (instance coords),
    // otherwise use the same coords as the geometry (public/mainland).
    const renderX = config.renderTileX ?? config.tileX;
    const renderZ = config.renderTileZ ?? config.tileZ;
    const { chunkX: renderChunkX, chunkZ: renderChunkZ } = tileToChunk(renderX, renderZ);

    // Get floor render for the RENDER chunk (instance floor VAO), or fall back.
    let floorRender = getFloorForChunk(renderChunkX, renderChunkZ)
        ?? getNearestFloor(renderChunkX, renderChunkZ)
        ?? getAnyFloor();

    if (!floorRender) {
        console.error(`[TileMarker] No floor renders available at all - cannot create marker`);
        return null;
    }

    try {
        // Convert positions to Uint8Array view
        const posBuffer = new Uint8Array(geometry.positions.buffer);
        const colorBuffer = geometry.colors;

        // Create render inputs for vertex array - color is vec3 with stride 3
        const renderInputs: RenderInput[] = [
            {
                buffer: posBuffer,
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: GL_FLOAT,
                stride: 12,  // 3 floats * 4 bytes
                vectorlength: 3,
                normalized: false
            },
            {
                buffer: colorBuffer,
                enabled: true,
                location: 6,
                offset: 0,
                scalartype: GL_UNSIGNED_BYTE,
                stride: 3,  // 3 bytes (RGB)
                vectorlength: 3,
                normalized: true
            }
        ];

        // Convert indices to Uint16Array wrapped in Uint8Array (like TileOverlayManager)
        const indexBuffer = new Uint8Array(new Uint16Array(geometry.indices).buffer);

        // Create vertex array
        const vertexArray = native.createVertexArray(indexBuffer, renderInputs);

        // Uniform sources - copy lighting uniforms from floor program (matching alt1gl-main)
        const uniformSources: OverlayUniformSource[] = [
            { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' },
            { name: 'uAmbientColour', sourceName: 'uAmbientColour', type: 'program' },
            { name: 'uInvSunDirection', sourceName: 'uInvSunDirection', type: 'program' },
            { name: 'uSunColour', sourceName: 'uSunColour', type: 'program' }
        ];

        // Create uniform buffer with model matrix positioned at chunk center
        const uniformBuffer = new Uint8Array(164);  // Total size: 64+64+12+12+12

        // Position matrix - place at chunk center in WORLD SPACE.
        // When renderTile coords are provided (instance offset mode), use render chunk for
        // world positioning (so it appears in the instance) but use public height data.
        const worldChunkX = renderChunkX;
        const worldChunkZ = renderChunkZ;

        // With height data: vertex Y values are absolute world heights, baseY is just HEIGHT_SCALING offset
        // Without height data: vertices are flat (Y≈32), so baseY must match the floor's modelY
        // Instance (renderChunk >= 100): height data is relative offsets from captured baseWorldY
        let baseY: number;
        if (worldChunkX >= 100) {
            const instanceBaseY = getInstanceChunkBaseHeight(worldChunkX, worldChunkZ);
            baseY = (instanceBaseY ?? floorRender.modelY) + HEIGHT_SCALING;
        } else if (geometry.hasHeightData) {
            baseY = HEIGHT_SCALING;
        } else {
            // Fallback: no height data available, use floor's model Y to stay at correct altitude
            baseY = floorRender.modelY;
        }
        const modelMatrix = createPositionMatrix(
            (worldChunkX + 0.5) * TILE_SIZE * CHUNK_SIZE,
            baseY,
            (worldChunkZ + 0.5) * TILE_SIZE * CHUNK_SIZE
        );

        // Copy model matrix to uniform buffer
        new Float32Array(uniformBuffer.buffer, 0, 16).set(modelMatrix);

        // Render ranges - length is number of INDICES
        const renderRanges = [{ start: 0, length: geometry.indices.length }];

        const { chunkX: publicLogChunkX, chunkZ: publicLogChunkZ } = tileToChunk(config.tileX, config.tileZ);
        console.log(`[TileMarker] Creating overlay on chunk ${worldChunkX},${worldChunkZ}${renderChunkX !== publicLogChunkX ? ` (public: ${publicLogChunkX},${publicLogChunkZ})` : ''}`);
        console.log(`[TileMarker] Using vertexObjectId: ${floorRender.vertexObjectId}`);
        console.log(`[TileMarker] Model matrix position: ${(worldChunkX + 0.5) * TILE_SIZE * CHUNK_SIZE}, ${baseY}, ${(worldChunkZ + 0.5) * TILE_SIZE * CHUNK_SIZE} (floorModelY=${floorRender.modelY})`);
        console.log(`[TileMarker] Render ranges: ${JSON.stringify(renderRanges)}`);

        // Begin overlay - trigger on floor's vertexObjectId
        const overlay = native.beginOverlay(
            {
                skipProgramMask: wrongProgramMask,
                vertexObjectId: floorRender.vertexObjectId
            },
            program,
            vertexArray,
            {
                uniformSources: uniformSources,
                uniformBuffer: uniformBuffer,
                ranges: renderRanges
            }
        );

        if (!overlay) {
            console.error(`[TileMarker] beginOverlay returned null/undefined for tile ${config.tileX},${config.tileZ}`);
            return null;
        }

        console.log(`[TileMarker] Overlay created: hasStop=${typeof overlay.stop === 'function'}, handleId=${(overlay as any).__handleId ?? 'none'}`);

        const marker: ActiveMarker = {
            id,
            config,
            overlay,
            chunkX: geometry.chunkX,
            chunkZ: geometry.chunkZ
        };

        activeMarkers.set(id, marker);
        console.log(`[TileMarker] Added marker at ${config.tileX}, ${config.tileZ} (chunk ${geometry.chunkX},${geometry.chunkZ})`);

        return marker;
    } catch (e) {
        console.error('[TileMarker] Failed to create marker:', e);
        return null;
    }
}

/**
 * Remove a tile marker by ID
 */
export async function removeMarker(id: string): Promise<boolean> {
    const marker = activeMarkers.get(id);
    if (!marker) return false;

    if (marker.overlay) {
        try {
            marker.overlay.stop();
        } catch (e) {
            console.error('[TileMarker] Error removing overlay:', e);
        }
    }

    activeMarkers.delete(id);
    console.log(`[TileMarker] Removed marker ${id}`);
    return true;
}

/**
 * Remove marker by tile position
 */
export async function removeMarkerAt(tileX: number, tileZ: number, level: number = 0): Promise<boolean> {
    const id = generateMarkerId({ tileX, tileZ, level });
    return removeMarker(id);
}

/**
 * Clear all markers
 */
export async function clearAllMarkers(): Promise<void> {
    for (const [id] of activeMarkers) {
        await removeMarker(id);
    }
    console.log('[TileMarker] All markers cleared');
}

/**
 * Get all active markers
 */
export function getActiveMarkers(): ActiveMarker[] {
    return Array.from(activeMarkers.values());
}

/**
 * Check if a marker exists at position
 */
export function hasMarkerAt(tileX: number, tileZ: number, level: number = 0): boolean {
    const id = generateMarkerId({ tileX, tileZ, level });
    return activeMarkers.has(id);
}

/**
 * Toggle marker at position
 */
export async function toggleMarker(config: TileMarkerConfig): Promise<boolean> {
    const id = generateMarkerId(config);
    if (activeMarkers.has(id)) {
        await removeMarker(id);
        return false;
    } else {
        await addMarker(config);
        return true;
    }
}
