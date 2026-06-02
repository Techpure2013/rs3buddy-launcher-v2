/**
 * Overlay Manager - Manages GL overlays and player position tracking
 * Runs in the renderer process and keeps overlays synced with player position
 */

import {
    getPlayerPosition,
    PlayerPosition,
} from './playerPosition';
import { startOverlay, stopOverlay, OverlaySettings } from './tileGrid';
import * as TileMarker from './tileMarker';
import { MarkerStore } from '../state/markerStore';
import type { TileMarker as TileMarkerModel } from '../state/model';
import { native, hookFirstClient } from './patchrs_napi';
import {
    isInInstanceSpace,
    createInstanceContext,
    updateInstanceBounds,
    resetInstanceTracking,
    setEntranceTile,
    setEntryTile,
    reportFloorChunk,
    isInstanceChunk,
} from './instanceDetector';
import { hasInstanceFloorChunks } from './tileMarker';
import { TILE_SIZE, CHUNK_SIZE } from './heightData';
import { captureInstanceHeights, clearInstanceHeightCache } from './instanceHeightData';

// Tracking interval in ms
const POSITION_POLL_INTERVAL = 3000; // Shared recording: position + floor VAO check in one IPC call
const OVERLAY_UPDATE_INTERVAL = 1000;
const HOOK_RETRY_INTERVAL = 5000;
const FLOOR_REFRESH_INTERVAL = 30000; // Instance height capture only (VAO refresh merged into position poll)
const FLOOR_CHECK_EVERY_N_POLLS = 5; // Check floor VAOs every 5th position poll (= every 15s)

let positionPollTimer: ReturnType<typeof setInterval> | null = null;
let overlayUpdateTimer: ReturnType<typeof setInterval> | null = null;
let hookRetryTimer: ReturnType<typeof setInterval> | null = null;
let floorRefreshTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let isHooked = false;
let isPollingPosition = false; // Guard against overlapping async polls
let positionPollCount = 0; // Counter for periodic floor check
let lastPosition: PlayerPosition | null = null;
let wasInInstance = false;
let isTransitioning = false; // Guard: block floor refresh during instance transitions
let isRefreshingFloors = false; // Guard: prevent overlapping floor refresh async ops
let instanceHeightCaptureCount = 0; // Cap instance height captures to avoid perpetual IPC
const MAX_INSTANCE_HEIGHT_CAPTURES = 4; // Stop capturing after this many attempts
// Last known surface-world position (when NOT in instance) for entrance-linking
let lastSurfacePosition: { x: number; z: number } | null = null;

// Instance-to-public tile offset (from Instance Tile Mapper)
// When set, instance coordinates are converted to public for map display
let instanceOffset: { dLng: number; dLat: number } | null = null;

/**
 * Set the instance-to-public tile offset.
 * When the player is in instance space, their position will be converted
 * to public coordinates using this offset for map display.
 * Call with null to clear.
 */
export function setInstanceOffset(offset: { dLng: number; dLat: number } | null): void {
    instanceOffset = offset;
    MarkerStore.setInstanceOffset(offset);

    if (offset) {
        console.log(`[OverlayManager] Instance offset set: dLng=${offset.dLng}, dLat=${offset.dLat}`);

        // Immediately convert stored player position to public coords.
        // Without this, MapInstanceHandler reads the old instance position and pans
        // to the wrong place (the next position poll would convert it, but too late).
        const currentPos = MarkerStore.getState().playerPosition;
        if (currentPos && currentPos.x > 6400) {
            MarkerStore.setPlayerPosition({
                x: currentPos.x + offset.dLng,
                y: currentPos.y + offset.dLat,
                floor: currentPos.floor,
            });
            console.log(`[OverlayManager] Converted position: (${currentPos.x + offset.dLng}, ${currentPos.y + offset.dLat})`);
        }

        // Persist offset to known instance for instant re-entry next time
        const ctx = MarkerStore.getState().currentInstance;
        if (ctx?.isInstance && ctx.entranceKey) {
            MarkerStore.saveKnownInstance(
                ctx.entranceKey,
                ctx.entryTileX,
                ctx.entryTileZ,
                ctx.label ?? undefined,
                offset
            );
        }
    } else {
        console.log('[OverlayManager] Instance offset cleared');
    }
}

export function getInstanceOffset(): { dLng: number; dLat: number } | null {
    return instanceOffset;
}

/**
 * Auto-compute instance offset by matching floor mesh hashes against stored mappings.
 * Called when entering an instance and mesh mappings are available.
 * Scans current floor renders, hashes them, finds a match, computes offset.
 */
async function autoComputeOffsetFromMeshes(): Promise<boolean> {
    if (!native) return false;

    const mappings = MarkerStore.getState().meshMappings;
    if (!mappings || mappings.length === 0) return false;

    // Build lookup: hash → publicChunk
    const hashToPublic = new Map<string, { x: number; z: number }>();
    for (const m of mappings) {
        hashToPublic.set(m.meshHash, { x: m.publicChunkX, z: m.publicChunkZ });
    }

    console.log(`[OverlayManager] Auto-matching: ${hashToPublic.size} mesh mappings available`);

    try {
        // Capture floor renders with vertex data for hashing
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            framecooldown: 100,
            features: ['vertexarray', 'uniforms'],
            hasInput: 'aMaterialSettingsSlotXY3'
        } as any);

        for (const r of renders) {
            if (!r.program?.inputs?.find((q: any) => q.name === 'aMaterialSettingsSlotXY3')) continue;

            // Get instance chunk coords from model matrix
            const modelU = r.program.uniforms.find((u: any) => u.name === 'uModelMatrix');
            if (!modelU || !r.uniformState) continue;
            const mv = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + modelU.snapshotOffset);
            const instanceChunkX = Math.floor(mv.getFloat32(48, true) / CHUNK_SIZE / TILE_SIZE);
            const instanceChunkZ = Math.floor(mv.getFloat32(56, true) / CHUNK_SIZE / TILE_SIZE);

            // Skip non-instance chunks
            if (instanceChunkX < 100) continue;

            // Hash the vertex data
            const va = r.vertexArray;
            if (!va) continue;
            const attrs = (va.attributes || []).filter((a: any) => a != null);
            const posAttr = attrs.find((a: any) => a.enabled && a.buffer && a.buffer.length > 0 && a.vectorlength >= 2);
            if (!posAttr) continue;

            // FNV-1a hash (same as Instance Tile Mapper)
            let h = 0x811c9dc5;
            const buf = posAttr.buffer;
            for (let i = 0; i < Math.min(buf.length, 4096); i++) {
                h ^= buf[i];
                h = Math.imul(h, 0x01000193);
            }
            const hash = (h >>> 0).toString(16).padStart(8, '0');

            // Check for match
            const publicChunk = hashToPublic.get(hash);
            if (publicChunk) {
                // Compute offset: publicChunk * CHUNK_SIZE - instanceChunk * CHUNK_SIZE
                const dLng = (publicChunk.x - instanceChunkX) * CHUNK_SIZE;
                const dLat = (publicChunk.z - instanceChunkZ) * CHUNK_SIZE;

                console.log(`[OverlayManager] MESH MATCH! hash=${hash} instance chunk (${instanceChunkX},${instanceChunkZ}) → public chunk (${publicChunk.x},${publicChunk.z})`);
                console.log(`[OverlayManager] Auto-computed offset: dLng=${dLng}, dLat=${dLat}`);

                setInstanceOffset({ dLng, dLat });
                return true;
            }
        }

        console.log('[OverlayManager] No mesh hash matches found');
        return false;
    } catch (e) {
        console.error('[OverlayManager] Auto-offset error:', e);
        return false;
    }
}

// Track synced markers (map marker ID -> GL marker ID)
const syncedMarkers = new Map<string, string>();

// Streaming floor detector for instance grid bounds display
let instanceFloorStream: { close: () => void } | null = null;
const knownFloorProgs = new WeakMap<any, boolean>();

/**
 * Start streaming floor chunk detection for instance grid bounds display.
 * Uses the same aMaterialSettingsSlotXY3 attribute as tileGrid/tileMarker
 * but runs continuously to ensure all chunks are detected.
 */
function startInstanceFloorStream(): void {
    if (instanceFloorStream || !native) return;

    console.log('[OverlayManager] Starting instance floor stream...');

    const stream = native.streamRenderCalls(
        {
            features: ["uniforms"],
            framecooldown: 500,
        },
        (renders) => {
            let newChunks = 0;
            for (const render of renders) {
                if (!render.program) continue;

                // Check cache first
                if (knownFloorProgs.has(render.program)) {
                    if (!knownFloorProgs.get(render.program)) continue;
                } else {
                    const isFloor = render.program.inputs.some(
                        (i: any) => i.name === 'aMaterialSettingsSlotXY3'
                    );
                    knownFloorProgs.set(render.program, isFloor);
                    if (!isFloor) continue;
                }

                // Extract chunk position from model matrix
                const modelMatrixUniform = render.program.uniforms.find(
                    (u: any) => u.name === 'uModelMatrix'
                );
                if (!modelMatrixUniform || !render.uniformState) continue;

                try {
                    const view = new DataView(
                        render.uniformState.buffer,
                        render.uniformState.byteOffset
                    );
                    const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
                    const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);

                    const chunkX = Math.floor(x / CHUNK_SIZE / TILE_SIZE);
                    const chunkZ = Math.floor(z / CHUNK_SIZE / TILE_SIZE);

                    if (isInstanceChunk(chunkX)) {
                        reportFloorChunk(chunkX, chunkZ);
                        newChunks++;
                    }
                } catch {
                    continue;
                }
            }

            // Update instance bounds if new chunks were found
            if (newChunks > 0) {
                const currentCtx = MarkerStore.getState().currentInstance;
                if (currentCtx?.isInstance) {
                    const updated = updateInstanceBounds(currentCtx);
                    MarkerStore.setInstanceContext(updated);
                }
            }
        }
    );

    instanceFloorStream = {
        close: () => {
            try { stream.close(); } catch {}
        }
    };
}

/**
 * Stop the instance floor stream
 */
function stopInstanceFloorStream(): void {
    if (instanceFloorStream) {
        instanceFloorStream.close();
        instanceFloorStream = null;
        console.log('[OverlayManager] Stopped instance floor stream');
    }
}

/**
 * Check if the native addon is available (running in Electron with game hooked)
 */
export function isNativeAvailable(): boolean {
    return native != null;
}

/**
 * Check if the RS client is hooked and ready
 */
export function isClientReady(): boolean {
    if (!native) return false;
    try {
        return native.getRsReady() > 0;
    } catch {
        return false;
    }
}

/**
 * Try to connect to RS3 client (check existing connection first, then try to hook)
 */
function tryHookClient(): boolean {
    if (!native) return false;

    // First check if already connected (e.g., shared with another Alt1GL app)
    if (isClientReady()) {
        if (!isHooked) {
            console.log('[OverlayManager] Already connected to RS3 client (existing hook)');
            isHooked = true;
        }
        return true;
    }

    // Not connected, try to hook
    try {
        console.log('[OverlayManager] Attempting to hook RS3 client...');
        hookFirstClient();
        isHooked = isClientReady();
        if (isHooked) {
            console.log('[OverlayManager] Successfully hooked RS3 client');
        } else {
            console.log('[OverlayManager] Hook attempted but client not ready yet');
        }
        return isHooked;
    } catch (e) {
        console.log('[OverlayManager] Failed to hook client:', e);
        return false;
    }
}

/**
 * Poll player position and update the store.
 * Does ONE recordRenderCalls per poll — the same renders feed both player detection
 * and (periodically) floor VAO refresh, avoiding duplicate IPC.
 */
async function pollPlayerPosition(): Promise<void> {
    if (!native) return;

    // Guard: prevent overlapping async polls from stacking up via setInterval
    if (isPollingPosition) return;
    isPollingPosition = true;

    // Check if client is ready before polling
    if (!isClientReady()) {
        isPollingPosition = false;
        return;
    }

    try {
        // Single recording shared between position detection and floor VAO refresh
        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ["uniforms"],
            skipHandles: true,
        } as any);

        const pos = await getPlayerPosition(renders);

        // Periodically check floor VAO changes from same recording (no extra IPC call)
        positionPollCount++;
        if (positionPollCount % FLOOR_CHECK_EVERY_N_POLLS === 0
            && !isTransitioning && !isRefreshingFloors && syncedMarkers.size > 0) {
            try {
                const changedChunks = await TileMarker.refreshFloorPrograms(renders);
                if (changedChunks.length > 0) {
                    console.log(`[OverlayManager] Floor VAOs changed in ${changedChunks.length} chunks`);
                    const affectedMarkers = TileMarker.getMarkersInChunks(changedChunks);
                    if (affectedMarkers.length > 0) {
                        for (const marker of affectedMarkers) {
                            for (const [storeId, glId] of syncedMarkers) {
                                if (glId === marker.id) {
                                    await TileMarker.removeMarker(glId);
                                    syncedMarkers.delete(storeId);
                                    break;
                                }
                            }
                        }
                        await syncAllMarkers();
                    }
                }
            } catch (floorErr) {
                console.error('[OverlayManager] Floor VAO check error:', floorErr);
            }
        }

        if (pos) {
            let displayX = pos.x;
            let displayY = pos.z; // z becomes y for map coordinates

            // Use floor mesh detection (stable) rather than player coords to determine instance state
            const inInstanceByFloor = hasInstanceFloorChunks();
            const storeOffset = MarkerStore.getState().instanceOffset;
            const activeOffset = instanceOffset || storeOffset;

            // Log position periodically (not every poll — reduces console spam)
            if (positionPollCount % 10 === 1) {
                console.log(`[OverlayManager] Pos: (${pos.x}, ${pos.z}) instanceFloor=${inInstanceByFloor} offset=${activeOffset ? `${activeOffset.dLng},${activeOffset.dLat}` : 'none'}`);
            }

            if (inInstanceByFloor && activeOffset) {
                displayX = pos.x + activeOffset.dLng;
                displayY = pos.z + activeOffset.dLat;
            }

            const isInstance = isInInstanceSpace(pos.x);

            const newPosition = {
                x: displayX,
                y: displayY,
                floor: 0, // TODO: Detect floor from height
            };

            lastPosition = pos;
            MarkerStore.setPlayerPosition(newPosition);

            // Track last surface position for entrance-linking
            if (!isInstance) {
                lastSurfacePosition = { x: pos.x, z: pos.z };
            }

            // Instance detection
            if (isInstance !== wasInInstance) {
                isTransitioning = true; // Block floor refresh during transition
                if (isInstance) {
                    // Entered instance
                    instanceHeightCaptureCount = 0; // Reset for new instance session
                    console.log(`[OverlayManager] Entered instance area at ${pos.x}, ${pos.z}`);

                    // Record entrance tile (last surface position before entering)
                    const entranceX = lastSurfacePosition?.x ?? 0;
                    const entranceZ = lastSurfacePosition?.z ?? 0;
                    setEntranceTile(entranceX, entranceZ);
                    const entranceKey = `${entranceX},${entranceZ}`;
                    console.log(`[OverlayManager] Entrance tile: ${entranceKey}`);

                    // Record entry tile (first position inside instance = coordinate origin)
                    setEntryTile(pos.x, pos.z);
                    console.log(`[OverlayManager] Entry tile: ${pos.x},${pos.z}`);

                    // Create instance context immediately (no waiting for fingerprint!)
                    const ctx = createInstanceContext(entranceX, entranceZ, pos.x, pos.z);

                    // Check for known instance match by entrance key.
                    // Use proximity matching (within 3 tiles) since the 3s poll interval
                    // means lastSurfacePosition may be a tile or two off from the actual entrance.
                    const knownInstances = MarkerStore.getKnownInstances();
                    const known = knownInstances.find(k => k.entranceKey === entranceKey)
                        ?? knownInstances.find(k => {
                            const parts = k.entranceKey.split(',');
                            if (parts.length !== 2) return false;
                            const kx = Number(parts[0]);
                            const kz = Number(parts[1]);
                            return Math.abs(kx - entranceX) <= 3 && Math.abs(kz - entranceZ) <= 3;
                        });
                    if (known) {
                        ctx.label = known.instanceLabel;
                        console.log(`[OverlayManager] Auto-matched instance: ${known.instanceLabel}`);

                        // Set saved offset as flag (switches map to public mode).
                        // The actual GL offset will be recomputed by mesh matching for this session.
                        if (known.savedOffset) {
                            // Set offset flag WITHOUT position conversion — we'll set position directly from publicReference
                            instanceOffset = known.savedOffset;
                            MarkerStore.setInstanceOffset(known.savedOffset);
                        }

                        // Pan map to exact public reference point (stable across visits).
                        // Don't use offset math — instance coords change every visit.
                        if (known.publicReference) {
                            MarkerStore.setPlayerPosition({
                                x: known.publicReference.x,
                                y: known.publicReference.y,
                                floor: 0,
                            });
                            console.log(`[OverlayManager] Set position to publicReference: (${known.publicReference.x}, ${known.publicReference.y})`);
                        } else if (known.savedOffset) {
                            // Fallback: use offset conversion if no publicReference saved
                            setInstanceOffset(known.savedOffset);
                        }
                    }

                    MarkerStore.setInstanceContext(ctx);

                    // Auto-save entrance key to knownInstances for re-identification
                    MarkerStore.saveKnownInstance(
                        entranceKey,
                        pos.x,
                        pos.z,
                        known?.instanceLabel,
                        known?.savedOffset
                    );

                    // Start streaming floor detector for grid bounds display (not identification)
                    startInstanceFloorStream();

                    // One-shot floor detection as fast path, with retries
                    TileMarker.detectFloorProgram().then(async (found) => {
                        isTransitioning = false; // Unblock floor refresh

                        // Auto-compute offset from mesh hash matching
                        // Do this AFTER floor detection so we have renders available
                        const mappings = MarkerStore.getState().meshMappings;
                        if (mappings && mappings.length > 0 && !instanceOffset) {
                            console.log('[OverlayManager] Attempting auto-offset from mesh hashes...');
                            const matched = await autoComputeOffsetFromMeshes();
                            if (matched) {
                                // Save the computed offset for future instant re-entry
                                MarkerStore.saveKnownInstance(
                                    entranceKey,
                                    pos.x,
                                    pos.z,
                                    known?.instanceLabel,
                                    instanceOffset
                                );
                                // Re-sync markers with new offset
                                syncAllMarkers();
                            }
                        }

                        if (!found) {
                            setTimeout(async () => {
                                if (wasInInstance) {
                                    console.log('[OverlayManager] Retrying floor detection...');
                                    await TileMarker.detectFloorProgram();
                                    // Retry mesh matching too
                                    if (MarkerStore.getState().meshMappings?.length > 0 && !instanceOffset) {
                                        autoComputeOffsetFromMeshes();
                                    }
                                }
                            }, 2000);
                        }
                    });

                    // Sync markers for the matched instance (initially flat, before height data)
                    syncAllMarkers();

                    // Capture instance height data from floor mesh vertices.
                    // Delay slightly to allow the game to render instance chunks first.
                    setTimeout(async () => {
                        if (!wasInInstance) return;
                        const count = await captureInstanceHeights();
                        if (count > 0) {
                            console.log(`[OverlayManager] Instance height captured for ${count} chunks, re-syncing markers...`);
                            await resyncAllMarkers();
                        } else {
                            // Retry after more time — instance may still be loading
                            setTimeout(async () => {
                                if (!wasInInstance) return;
                                const retryCount = await captureInstanceHeights();
                                if (retryCount > 0) {
                                    console.log(`[OverlayManager] Instance height retry captured ${retryCount} chunks, re-syncing markers...`);
                                    await resyncAllMarkers();
                                }
                            }, 3000);
                        }
                    }, 1500);
                } else {
                    // Left instance
                    console.log('[OverlayManager] Left instance area');
                    instanceHeightCaptureCount = 0;
                    stopInstanceFloorStream();
                    resetInstanceTracking();
                    clearInstanceHeightCache();
                    MarkerStore.setInstanceContext(null);

                    // Clear session offset (will be recomputed via mesh matching on next entry)
                    setInstanceOffset(null);

                    // Re-detect floor programs for the main map before syncing markers
                    await TileMarker.detectFloorProgram();
                    isTransitioning = false; // Unblock floor refresh

                    // Re-sync to show main map markers
                    syncAllMarkers();
                }
                wasInInstance = isInstance;
            }
        }
    } catch (e) {
        console.error('[OverlayManager] Failed to get player position:', e);
    } finally {
        isPollingPosition = false;
    }
}

// Track current overlay state to avoid redundant calls
let currentOverlaySettings: OverlaySettings = { grid: false, collision: false };

/**
 * Update overlays based on current settings
 * The new tileGrid API uses streamRenderCalls to automatically track floor chunks
 */
function updateOverlayState(): void {
    if (!native) return;

    const state = MarkerStore.getState();
    const { showOverlayGrid, showOverlayCollision } = state.ui;

    const newSettings: OverlaySettings = {
        grid: showOverlayGrid,
        collision: showOverlayCollision,
    };

    // Only update if settings changed
    if (newSettings.grid === currentOverlaySettings.grid &&
        newSettings.collision === currentOverlaySettings.collision) {
        return;
    }

    currentOverlaySettings = newSettings;

    try {
        if (newSettings.grid || newSettings.collision) {
            startOverlay(newSettings);
            console.log('[OverlayManager] Started overlay:', newSettings);
        } else {
            stopOverlay();
            console.log('[OverlayManager] Stopped overlay');
        }
    } catch (e) {
        console.error('[OverlayManager] Failed to update overlay:', e);
    }
}

/**
 * Convert hex color to RGBA array
 */
function hexToRgba(hex: string): [number, number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ];
    }
    return [1.0, 0.2, 0.2, 1.0]; // Default red
}

/**
 * Sync a single marker to GL overlay
 */
async function syncMarkerToGL(marker: TileMarkerModel): Promise<void> {
    if (!isClientReady()) return;

    let tileX = Math.floor(marker.x);
    let tileZ = Math.floor(marker.y); // map y -> game z
    let renderTileX: number | undefined;
    let renderTileZ: number | undefined;

    // Instance marker: translate relative coords to absolute
    if (marker.instanceContext) {
        const currentInstance = MarkerStore.getState().currentInstance;
        if (!currentInstance?.isInstance) return; // Not in instance, skip
        if (!currentInstance.entranceKey ||
            currentInstance.entranceKey !== marker.instanceContext.entranceKey) {
            return; // Wrong instance, skip
        }

        // Translate relative -> absolute using current entry tile as origin
        tileX = Math.floor(marker.x + currentInstance.entryTileX);
        tileZ = Math.floor(marker.y + currentInstance.entryTileZ);
    }

    // Instance offset: markers stored at PUBLIC coords, GL needs INSTANCE coords for VAO.
    // Use floor mesh detection (stable) rather than player coords to determine instance state.
    // Keep public coords for height data, reverse offset for floor VAO matching.
    const storeOff = MarkerStore.getState().instanceOffset;
    const activeOff = instanceOffset || storeOff;
    if (activeOff && hasInstanceFloorChunks() && !marker.instanceContext) {
        renderTileX = tileX - activeOff.dLng;
        renderTileZ = tileZ - activeOff.dLat;
    }

    const glMarkerId = `tile_${tileX}_${tileZ}_${marker.floor}`;

    // Skip if already synced
    if (syncedMarkers.get(marker.id) === glMarkerId) return;

    // Remove old GL marker if position changed
    const oldGlId = syncedMarkers.get(marker.id);
    if (oldGlId && oldGlId !== glMarkerId) {
        await TileMarker.removeMarker(oldGlId);
    }

    try {
        const result = await TileMarker.addMarker({
            tileX,
            tileZ,
            renderTileX,
            renderTileZ,
            level: marker.floor,
            color: hexToRgba(marker.color),
            label: marker.label,
        });

        if (result) {
            syncedMarkers.set(marker.id, result.id);
            console.log(`[OverlayManager] Synced marker ${marker.id} to GL at ${tileX},${tileZ}`);
        }
    } catch (e) {
        console.error(`[OverlayManager] Failed to sync marker ${marker.id}:`, e);
    }
}

/**
 * Remove a marker from GL overlay
 */
async function removeMarkerFromGL(markerId: string): Promise<void> {
    const glId = syncedMarkers.get(markerId);
    if (glId) {
        await TileMarker.removeMarker(glId);
        syncedMarkers.delete(markerId);
        console.log(`[OverlayManager] Removed GL marker for ${markerId}`);
    }
}

/**
 * Force re-sync all markers by removing existing GL overlays and recreating them.
 * Used after instance height data becomes available so markers get proper terrain heights.
 */
async function resyncAllMarkers(): Promise<void> {
    if (!isClientReady()) return;

    // Remove all existing GL overlays
    for (const [markerId, glId] of syncedMarkers) {
        await TileMarker.removeMarker(glId);
    }
    syncedMarkers.clear();

    // Re-detect floor programs (they may have changed)
    await TileMarker.detectFloorProgram();

    // Re-sync all visible markers (will now use cached height data)
    await syncAllMarkers();
}

/**
 * Periodically check if floor mesh IDs changed and resync affected markers.
 * Floor meshes can change when the game recreates vertex objects (camera movement, etc.)
 */
/**
 * Instance height capture only — VAO refresh is now merged into pollPlayerPosition
 * via shared recording. This timer handles the heavier vertex-data capture for
 * instance terrain heights, which needs its own recording with 'vertexarray' feature.
 */
async function refreshFloorMeshes(): Promise<void> {
    if (!isClientReady() || isTransitioning || isRefreshingFloors) return;

    // Only needed for instance height capture (VAO refresh is in position poll)
    if (!wasInInstance || instanceHeightCaptureCount >= MAX_INSTANCE_HEIGHT_CAPTURES) return;

    isRefreshingFloors = true;
    try {
        instanceHeightCaptureCount++;
        const newCount = await captureInstanceHeights();
        if (newCount > 0) {
            console.log(`[OverlayManager] Instance heights: ${newCount} chunks (attempt ${instanceHeightCaptureCount}/${MAX_INSTANCE_HEIGHT_CAPTURES})`);
            await resyncAllMarkers();
        }
    } catch (e) {
        console.error('[OverlayManager] Instance height capture error:', e);
    } finally {
        isRefreshingFloors = false;
    }
}

let isSyncingMarkers = false;
let syncAgainAfterCurrent = false;

/**
 * Sync all visible markers to GL overlays
 */
async function syncAllMarkers(): Promise<void> {
    if (!isClientReady()) return;

    // Re-entry guard: if already syncing, schedule a re-run after current finishes
    if (isSyncingMarkers) {
        syncAgainAfterCurrent = true;
        return;
    }
    isSyncingMarkers = true;

    const state = MarkerStore.getState();
    const rawIsInstance = state.currentInstance?.isInstance ?? false;
    const hasActiveOffset = state.instanceOffset != null;
    // When offset is active, markers are stored at public coords without instanceContext —
    // treat as non-instance for filtering so they pass visibility check.
    const isInstance = rawIsInstance && !hasActiveOffset;
    const currentEntranceKey = state.currentInstance?.entranceKey ?? '';

    const visibleGroupIds = new Set(
        state.groups.filter(g => g.visible).map(g => g.id)
    );

    // Filter markers appropriate for current context
    const visibleMarkers = state.markers.filter(m => {
        // Group visibility check
        if (!visibleGroupIds.has(m.groupId || 'default')) return false;

        if (isInstance) {
            // In instance (no offset): show only instance markers matching current entrance key
            if (!m.instanceContext) return false;
            return currentEntranceKey && m.instanceContext.entranceKey === currentEntranceKey;
        } else {
            // On main map or instance with offset: show non-instance markers
            return !m.instanceContext;
        }
    });

    // Track which markers should exist
    const visibleMarkerIds = new Set(visibleMarkers.map(m => m.id));

    // Remove GL markers that are no longer visible
    for (const [markerId, glId] of syncedMarkers) {
        if (!visibleMarkerIds.has(markerId)) {
            await TileMarker.removeMarker(glId);
            syncedMarkers.delete(markerId);
        }
    }

    // Sync all visible markers
    for (const marker of visibleMarkers) {
        await syncMarkerToGL(marker);
    }

    isSyncingMarkers = false;

    // If another sync was requested while we were running, do one more pass
    if (syncAgainAfterCurrent) {
        syncAgainAfterCurrent = false;
        syncAllMarkers();
    }
}

/**
 * Start the overlay manager
 */
export function startOverlayManager(): void {
    if (isRunning) return;
    if (!native) {
        console.log('[OverlayManager] Native addon not available, skipping');
        return;
    }

    console.log('[OverlayManager] Starting...');
    isRunning = true;

    // Try to hook the client immediately
    const hooked = tryHookClient();

    if (!hooked) {
        // Set up retry timer to keep trying to hook
        console.log('[OverlayManager] Will retry hooking every', HOOK_RETRY_INTERVAL, 'ms');
        hookRetryTimer = setInterval(() => {
            if (tryHookClient()) {
                console.log('[OverlayManager] Client now hooked, starting position polling');
                if (hookRetryTimer) {
                    clearInterval(hookRetryTimer);
                    hookRetryTimer = null;
                }
            }
        }, HOOK_RETRY_INTERVAL);
    }

    // Start polling player position (will check if hooked before polling)
    positionPollTimer = setInterval(pollPlayerPosition, POSITION_POLL_INTERVAL);

    // Start overlay update loop
    overlayUpdateTimer = setInterval(updateOverlayState, OVERLAY_UPDATE_INTERVAL);

    // Start periodic floor mesh refresh to detect vertexObjectId changes
    floorRefreshTimer = setInterval(refreshFloorMeshes, FLOOR_REFRESH_INTERVAL);

    // Subscribe to UI changes to update overlay immediately
    MarkerStore.subscribe(
        (s) => ({
            showOverlayGrid: s.ui.showOverlayGrid,
            showOverlayCollision: s.ui.showOverlayCollision
        }),
        () => {
            // Trigger immediate overlay update when settings change
            updateOverlayState();
        }
    );

    // Subscribe to marker changes to sync to GL (debounced to avoid cascading)
    let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    MarkerStore.subscribe(
        (s) => ({
            markers: s.markers,
            groups: s.groups,
        }),
        () => {
            // Debounce: coalesce rapid marker changes into a single sync
            if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
            syncDebounceTimer = setTimeout(() => {
                syncDebounceTimer = null;
                syncAllMarkers();
            }, 200);
        }
    );

    // Initial poll
    pollPlayerPosition();

    // Initial marker sync: detect floors first (one IPC call), then sync markers
    // Without floor data, every marker triggers its own detection → IPC cascade
    TileMarker.detectFloorProgram(true).then(() => {
        syncAllMarkers();
    });
}

/**
 * Stop the overlay manager
 */
export function stopOverlayManager(): void {
    if (!isRunning) return;

    console.log('[OverlayManager] Stopping...');
    isRunning = false;

    if (positionPollTimer) {
        clearInterval(positionPollTimer);
        positionPollTimer = null;
    }

    if (overlayUpdateTimer) {
        clearInterval(overlayUpdateTimer);
        overlayUpdateTimer = null;
    }

    if (hookRetryTimer) {
        clearInterval(hookRetryTimer);
        hookRetryTimer = null;
    }

    if (floorRefreshTimer) {
        clearInterval(floorRefreshTimer);
        floorRefreshTimer = null;
    }

    // Reset instance tracking
    resetInstanceTracking();
    wasInInstance = false;
    lastSurfacePosition = null;

    // Clear all GL markers
    TileMarker.clearAllMarkers();
    syncedMarkers.clear();

    stopOverlay();
    currentOverlaySettings = { grid: false, collision: false };
}

/**
 * Get the current player position (from last poll)
 */
export function getLastPlayerPosition(): PlayerPosition | null {
    return lastPosition;
}

/**
 * Force an immediate position poll and overlay update
 */
export async function forceUpdate(): Promise<void> {
    await pollPlayerPosition();
    await updateOverlayState();
}
