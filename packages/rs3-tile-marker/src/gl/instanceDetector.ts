/**
 * Instance Detection Service
 * Detects when the player is in an RS3 instanced area and tracks
 * entrance position for stable instance identification across sessions.
 *
 * RS3 coordinate space:
 * - Main map: tile X 0-6399 (chunk X 0-99)
 * - Instance space: tile X >= 6400 (chunk X >= 100)
 * - Small instances: 128x128 tiles, Z < 5248
 * - Large instances: 320x320 tiles, Z >= 5248
 *
 * Identification strategy:
 * - When entering an instance, the player's last surface-world position is
 *   recorded as the "entrance tile". This is deterministic (same door/portal
 *   always has the same coords) and used as the stable instance identifier.
 * - The first tile visited inside the instance is the "entry tile", used as
 *   the coordinate origin for relative marker storage.
 * - Floor chunks are still tracked for grid bounds display but NOT for
 *   identification.
 */

import type { InstanceContext } from '../state/model';
import { CHUNK_SIZE } from './heightData';

// Instance space boundary (tile coordinates)
export const INSTANCE_TILE_THRESHOLD = 6400;
// Chunk boundary (INSTANCE_TILE_THRESHOLD / CHUNK_SIZE)
export const INSTANCE_CHUNK_THRESHOLD = 100;

// Tracked floor chunk positions in current instance (for grid bounds display)
const instanceFloorChunks = new Set<string>();

// Entrance tile: the player's last surface-world position before entering
let entranceTile: { x: number; z: number } | null = null;

// Entry tile: the first tile the player visits inside the instance (coordinate origin)
let entryTile: { x: number; z: number } | null = null;

/**
 * Check if a tile X coordinate is in instance space
 */
export function isInInstanceSpace(tileX: number): boolean {
    return tileX >= INSTANCE_TILE_THRESHOLD;
}

/**
 * Check if a chunk X coordinate is in instance space
 */
export function isInstanceChunk(chunkX: number): boolean {
    return chunkX >= INSTANCE_CHUNK_THRESHOLD;
}

/**
 * Report a floor chunk observed in the current instance.
 * Called by tileGrid streaming when new floor chunks are detected.
 * Used for grid bounds display only, NOT for identification.
 */
export function reportFloorChunk(chunkX: number, chunkZ: number): void {
    if (!isInstanceChunk(chunkX)) return;

    const key = `${chunkX},${chunkZ}`;
    if (instanceFloorChunks.has(key)) return;

    instanceFloorChunks.add(key);
}

/**
 * Set the entrance tile (surface world position before instance entry).
 * This is the stable identifier for the instance.
 */
export function setEntranceTile(x: number, z: number): void {
    entranceTile = { x, z };
    console.log(`[InstanceDetector] Entrance tile set: ${x},${z}`);
}

/**
 * Get the entrance key string ("x,z") for instance identification.
 * Returns null if no entrance tile has been set.
 */
export function getEntranceKey(): string | null {
    if (!entranceTile) return null;
    return `${entranceTile.x},${entranceTile.z}`;
}

/**
 * Get the entrance tile coordinates.
 */
export function getEntranceTile(): { x: number; z: number } | null {
    return entranceTile;
}

/**
 * Set the entry tile (first tile visited inside the instance).
 * This is used as the coordinate origin for relative marker storage.
 */
export function setEntryTile(x: number, z: number): void {
    entryTile = { x, z };
    console.log(`[InstanceDetector] Entry tile set: ${x},${z}`);
}

/**
 * Get the entry tile coordinates (coordinate origin inside the instance).
 */
export function getEntryTile(): { x: number; z: number } | null {
    return entryTile;
}

/**
 * Get the bounding box origin (min X, min Z) of observed floor chunks.
 * Used for grid display only.
 */
export function getInstanceOrigin(): { originX: number; originZ: number } | null {
    if (instanceFloorChunks.size === 0) return null;

    let minX = Infinity, minZ = Infinity;
    for (const key of instanceFloorChunks) {
        const [x, z] = key.split(',').map(Number);
        // Convert chunk coords to tile coords
        const tileX = x * CHUNK_SIZE;
        const tileZ = z * CHUNK_SIZE;
        if (tileX < minX) minX = tileX;
        if (tileZ < minZ) minZ = tileZ;
    }

    return { originX: minX, originZ: minZ };
}

/**
 * Get the full bounding box of observed floor chunks in tile coordinates.
 * Used for InstanceGridLayer bounds display.
 */
export function getInstanceBounds(): {
    minTileX: number; minTileZ: number;
    maxTileX: number; maxTileZ: number;
} | null {
    if (instanceFloorChunks.size === 0) return null;

    let minX = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxZ = -Infinity;

    for (const key of instanceFloorChunks) {
        const [x, z] = key.split(',').map(Number);
        const tileX = x * CHUNK_SIZE;
        const tileZ = z * CHUNK_SIZE;
        if (tileX < minX) minX = tileX;
        if (tileZ < minZ) minZ = tileZ;
        if (tileX + CHUNK_SIZE > maxX) maxX = tileX + CHUNK_SIZE;
        if (tileZ + CHUNK_SIZE > maxZ) maxZ = tileZ + CHUNK_SIZE;
    }

    return { minTileX: minX, minTileZ: minZ, maxTileX: maxX, maxTileZ: maxZ };
}

/**
 * Create an InstanceContext when entering an instance.
 * Uses the entrance tile for identification and entry tile for coordinate origin.
 */
export function createInstanceContext(
    entranceX: number,
    entranceZ: number,
    entryTileX: number,
    entryTileZ: number,
): InstanceContext {
    return {
        isInstance: true,
        minTileX: entryTileX,
        minTileZ: entryTileZ,
        maxTileX: entryTileX,
        maxTileZ: entryTileZ,
        entranceX,
        entranceZ,
        entryTileX,
        entryTileZ,
        label: null,
        entranceKey: `${entranceX},${entranceZ}`,
        detectedAt: Date.now(),
    };
}

/**
 * Update an InstanceContext with the latest floor chunk bounds data.
 * Only updates grid bounds, NOT identification fields.
 */
export function updateInstanceBounds(ctx: InstanceContext): InstanceContext {
    const bounds = getInstanceBounds();
    if (!bounds) return ctx;

    return {
        ...ctx,
        minTileX: bounds.minTileX,
        minTileZ: bounds.minTileZ,
        maxTileX: bounds.maxTileX,
        maxTileZ: bounds.maxTileZ,
    };
}

/**
 * Reset instance tracking state (call when leaving an instance)
 */
export function resetInstanceTracking(): void {
    instanceFloorChunks.clear();
    entranceTile = null;
    entryTile = null;
    console.log('[InstanceDetector] Tracking reset');
}

/**
 * Get the number of observed floor chunks
 */
export function getObservedChunkCount(): number {
    return instanceFloorChunks.size;
}
