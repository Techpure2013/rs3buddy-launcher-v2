/**
 * Collision Data - Fetches tile collision/walkability data from runeapps
 * Used to display which tiles are walkable/blocked in the game overlay
 */

import { CHUNK_SIZE, tileToChunk, tileToLocal } from './heightData';

// Runeapps collision data endpoint
const COLLISION_DATA_ENDPOINT = "https://runeapps.org/maps/mapcollision/coll-";

// Collision flags (from RS3 collision system)
export const COLLISION_FLAGS = {
    BLOCKED: 0x200000,      // Fully blocked tile
    BLOCKED_NORTH: 0x2,     // Blocked from north
    BLOCKED_EAST: 0x8,      // Blocked from east
    BLOCKED_SOUTH: 0x20,    // Blocked from south
    BLOCKED_WEST: 0x80,     // Blocked from west
    BLOCKED_NE: 0x4,        // Blocked northeast corner
    BLOCKED_SE: 0x10,       // Blocked southeast corner
    BLOCKED_SW: 0x40,       // Blocked southwest corner
    BLOCKED_NW: 0x1,        // Blocked northwest corner
    FLOOR: 0x40000,         // Has floor/is walkable base
    WATER: 0x100000,        // Water tile
};

// Cache for loaded collision data
const collisionCache = new Map<string, Uint32Array | null>();
const pendingFetches = new Map<string, Promise<Uint32Array | null>>();

function getCacheKey(chunkX: number, chunkZ: number, level: number): string {
    return `${level}/${chunkX}-${chunkZ}`;
}

/**
 * Fetch collision data for a chunk
 */
export async function fetchCollisionData(
    chunkX: number,
    chunkZ: number,
    level: number = 0
): Promise<Uint32Array | null> {
    // Instance chunks (X >= 100) have no static height data on runeapps.org
    if (chunkX >= 100) {
        return null;
    }

    const key = getCacheKey(chunkX, chunkZ, level);

    if (collisionCache.has(key)) {
        return collisionCache.get(key) ?? null;
    }

    if (pendingFetches.has(key)) {
        return pendingFetches.get(key)!;
    }

    const fetchPromise = (async (): Promise<Uint32Array | null> => {
        try {
            const url = `${COLLISION_DATA_ENDPOINT}${level}/${chunkX}-${chunkZ}.bin.gz`;
            console.log(`[CollisionData] Fetching ${url}`);

            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`[CollisionData] Failed to fetch collision data for chunk ${chunkX},${chunkZ}: ${res.status}`);
                collisionCache.set(key, null);
                return null;
            }

            const data = new Uint32Array(await res.arrayBuffer());
            collisionCache.set(key, data);
            return data;
        } catch (e) {
            console.error(`[CollisionData] Error fetching collision data:`, e);
            collisionCache.set(key, null);
            return null;
        } finally {
            pendingFetches.delete(key);
        }
    })();

    pendingFetches.set(key, fetchPromise);
    return fetchPromise;
}

/**
 * Get collision flags for a specific tile within a chunk
 */
export function getCollisionFlags(
    collisionData: Uint32Array,
    localX: number,
    localZ: number
): number {
    const index = localX + localZ * CHUNK_SIZE;
    if (index < 0 || index >= collisionData.length) {
        return 0;
    }
    return collisionData[index];
}

/**
 * Check if a tile is fully blocked
 */
export function isBlocked(flags: number): boolean {
    return (flags & COLLISION_FLAGS.BLOCKED) !== 0;
}

/**
 * Check if a tile is walkable (has floor and not blocked)
 */
export function isWalkable(flags: number): boolean {
    return (flags & COLLISION_FLAGS.FLOOR) !== 0 && !isBlocked(flags);
}

/**
 * Check if a tile has water
 */
export function isWater(flags: number): boolean {
    return (flags & COLLISION_FLAGS.WATER) !== 0;
}

/**
 * Get collision type classification for a tile
 */
export type CollisionType = 'walkable' | 'blocked' | 'water' | 'partial' | 'empty';

export function getCollisionType(flags: number): CollisionType {
    if (flags === 0) return 'empty';
    if (isBlocked(flags)) return 'blocked';
    if (isWater(flags)) return 'water';
    if (isWalkable(flags)) return 'walkable';

    // Has some collision but not fully blocked
    const directionBlocks = flags & (
        COLLISION_FLAGS.BLOCKED_NORTH |
        COLLISION_FLAGS.BLOCKED_EAST |
        COLLISION_FLAGS.BLOCKED_SOUTH |
        COLLISION_FLAGS.BLOCKED_WEST |
        COLLISION_FLAGS.BLOCKED_NE |
        COLLISION_FLAGS.BLOCKED_SE |
        COLLISION_FLAGS.BLOCKED_SW |
        COLLISION_FLAGS.BLOCKED_NW
    );

    if (directionBlocks !== 0) return 'partial';
    return 'empty';
}

/**
 * Get collision flags at a world tile position (fetches data if needed)
 */
export async function getCollisionFlagsAtTile(
    tileX: number,
    tileZ: number,
    level: number = 0
): Promise<number> {
    const { chunkX, chunkZ } = tileToChunk(tileX, tileZ);
    const { localX, localZ } = tileToLocal(tileX, tileZ);

    const collisionData = await fetchCollisionData(chunkX, chunkZ, level);
    if (!collisionData) {
        return 0;
    }

    return getCollisionFlags(collisionData, localX, localZ);
}

/**
 * Get tiles of a specific collision type in an area
 */
export async function getCollisionTilesInArea(
    minTileX: number,
    minTileZ: number,
    maxTileX: number,
    maxTileZ: number,
    level: number = 0,
    filter?: CollisionType[]
): Promise<{ x: number; z: number; type: CollisionType; flags: number }[]> {
    const results: { x: number; z: number; type: CollisionType; flags: number }[] = [];

    // Track chunks we need to fetch
    const chunksToFetch = new Set<string>();
    for (let x = minTileX; x <= maxTileX; x++) {
        for (let z = minTileZ; z <= maxTileZ; z++) {
            const { chunkX, chunkZ } = tileToChunk(x, z);
            chunksToFetch.add(`${chunkX},${chunkZ}`);
        }
    }

    // Fetch all chunks in parallel
    const chunkDataMap = new Map<string, Uint32Array | null>();
    await Promise.all(
        Array.from(chunksToFetch).map(async (key) => {
            const [cx, cz] = key.split(',').map(Number);
            const data = await fetchCollisionData(cx, cz, level);
            chunkDataMap.set(key, data);
        })
    );

    // Process tiles
    for (let x = minTileX; x <= maxTileX; x++) {
        for (let z = minTileZ; z <= maxTileZ; z++) {
            const { chunkX, chunkZ } = tileToChunk(x, z);
            const { localX, localZ } = tileToLocal(x, z);

            const chunkKey = `${chunkX},${chunkZ}`;
            const collisionData = chunkDataMap.get(chunkKey);

            if (!collisionData) continue;

            const flags = getCollisionFlags(collisionData, localX, localZ);
            const type = getCollisionType(flags);

            if (filter && !filter.includes(type)) continue;

            results.push({ x, z, type, flags });
        }
    }

    return results;
}

/**
 * Clear the collision data cache
 */
export function clearCollisionCache(): void {
    collisionCache.clear();
}

/**
 * Preload collision data for an area
 */
export async function preloadCollisionArea(
    minTileX: number,
    minTileZ: number,
    maxTileX: number,
    maxTileZ: number,
    level: number = 0
): Promise<void> {
    const minChunk = tileToChunk(minTileX, minTileZ);
    const maxChunk = tileToChunk(maxTileX, maxTileZ);

    const promises: Promise<Uint32Array | null>[] = [];

    for (let cx = minChunk.chunkX; cx <= maxChunk.chunkX; cx++) {
        for (let cz = minChunk.chunkZ; cz <= maxChunk.chunkZ; cz++) {
            promises.push(fetchCollisionData(cx, cz, level));
        }
    }

    await Promise.all(promises);
}
