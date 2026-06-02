/**
 * Height data fetcher for terrain-aware overlays
 * Handles RS3 world coordinate system and terrain heights
 */

// RS3 World Constants
export const CHUNK_SIZE = 64;       // Tiles per chunk
export const TILE_SIZE = 512;       // World units per tile
export const HEIGHT_SCALING = TILE_SIZE / 32;  // Height scaling factor
export const MAX_FLOOR_LEVELS = 4;  // Floor levels 0-3

const HEIGHT_DATA_ENDPOINT = "https://runeapps.org/s3/map4/live/";
const HEIGHT_DATA_FALLBACK = "https://runeapps.org/s3/map4/1764321618/";

// Cache for loaded height data
const heightCache = new Map<string, Uint16Array | null>();
const pendingFetches = new Map<string, Promise<Uint16Array | null>>();

function getCacheKey(chunkX: number, chunkZ: number, level: number): string {
    return `${level}/${chunkX}-${chunkZ}`;
}

/**
 * Fetch height data for a chunk
 */
export async function fetchHeightData(
    chunkX: number,
    chunkZ: number,
    level: number = 0
): Promise<Uint16Array | null> {
    const key = getCacheKey(chunkX, chunkZ, level);

    // Check cache first — works for both normal and instance chunks.
    // Instance height data is populated by instanceHeightData.ts via setHeightCacheEntry().
    if (heightCache.has(key)) {
        return heightCache.get(key) ?? null;
    }

    if (pendingFetches.has(key)) {
        return pendingFetches.get(key)!;
    }

    // Instance chunks (X >= 100) have no static height data on runeapps.org.
    // Return null; the cache will be populated asynchronously when the instance
    // floor stream captures vertex data (see instanceHeightData.ts).
    if (chunkX >= 100) {
        return null;
    }

    const fetchPromise = (async (): Promise<Uint16Array | null> => {
        try {
            const path = `heightmesh-${level}/${chunkX}-${chunkZ}.bin`;
            const url = `${HEIGHT_DATA_ENDPOINT}${path}`;
            console.log(`[HeightData] Fetching ${url}`);

            let res = await fetch(url);
            if (res.status === 403) {
                const fallbackUrl = `${HEIGHT_DATA_FALLBACK}${path}`;
                console.log(`[HeightData] /live/ returned 403, trying versioned fallback: ${fallbackUrl}`);
                res = await fetch(fallbackUrl);
            }
            if (!res.ok) {
                console.warn(`[HeightData] Failed to fetch height data for chunk ${chunkX},${chunkZ}: ${res.status}`);
                heightCache.set(key, null);
                return null;
            }

            const data = new Uint16Array(await res.arrayBuffer());
            heightCache.set(key, data);
            return data;
        } catch (e) {
            console.error(`[HeightData] Error fetching height data:`, e);
            heightCache.set(key, null);
            return null;
        } finally {
            pendingFetches.delete(key);
        }
    })();

    pendingFetches.set(key, fetchPromise);
    return fetchPromise;
}

/**
 * Convert tile coordinates to chunk coordinates
 */
export function tileToChunk(tileX: number, tileZ: number): { chunkX: number; chunkZ: number } {
    return {
        chunkX: Math.floor(tileX / CHUNK_SIZE),
        chunkZ: Math.floor(tileZ / CHUNK_SIZE)
    };
}

/**
 * Convert tile coordinates to local position within a chunk
 */
export function tileToLocal(tileX: number, tileZ: number): { localX: number; localZ: number } {
    return {
        localX: ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
        localZ: ((tileZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    };
}

/**
 * Convert tile coordinates to world coordinates
 */
export function tileToWorld(tileX: number, tileZ: number): { worldX: number; worldZ: number } {
    return {
        worldX: tileX * TILE_SIZE,
        worldZ: tileZ * TILE_SIZE
    };
}

/**
 * Get terrain height at a specific tile position
 */
export function getHeightAtTile(
    heightData: Uint16Array,
    localX: number,
    localZ: number,
    subX: number = 0.5,
    subZ: number = 0.5
): number {
    // Each tile has 5 values: 4 corner heights + flags
    const tileIndex = (localX + localZ * CHUNK_SIZE) * 5;

    if (tileIndex < 0 || tileIndex + 4 >= heightData.length) {
        return 0;
    }

    // Bilinear interpolation of the 4 corner heights
    const y00 = heightData[tileIndex + 0] * HEIGHT_SCALING * (1 - subX) * (1 - subZ);
    const y01 = heightData[tileIndex + 1] * HEIGHT_SCALING * subX * (1 - subZ);
    const y10 = heightData[tileIndex + 2] * HEIGHT_SCALING * (1 - subX) * subZ;
    const y11 = heightData[tileIndex + 3] * HEIGHT_SCALING * subX * subZ;

    return y00 + y01 + y10 + y11;
}

/**
 * Get all 4 corner heights for a tile
 */
export function getTileCornerHeights(
    heightData: Uint16Array,
    localX: number,
    localZ: number
): [number, number, number, number] {
    const tileIndex = (localX + localZ * CHUNK_SIZE) * 5;

    if (tileIndex < 0 || tileIndex + 4 >= heightData.length) {
        return [0, 0, 0, 0];
    }

    return [
        heightData[tileIndex + 0] * HEIGHT_SCALING,
        heightData[tileIndex + 1] * HEIGHT_SCALING,
        heightData[tileIndex + 2] * HEIGHT_SCALING,
        heightData[tileIndex + 3] * HEIGHT_SCALING
    ];
}

/**
 * Get height at a world tile position (fetches data if needed)
 */
export async function getHeightAtWorldTile(
    tileX: number,
    tileZ: number,
    level: number = 0
): Promise<number> {
    const { chunkX, chunkZ } = tileToChunk(tileX, tileZ);
    const { localX, localZ } = tileToLocal(tileX, tileZ);

    const heightData = await fetchHeightData(chunkX, chunkZ, level);
    if (!heightData) {
        return 0;
    }

    return getHeightAtTile(heightData, localX, localZ);
}

/**
 * Get full world position (x, y, z) for a tile
 */
export async function getTileWorldPosition(
    tileX: number,
    tileZ: number,
    level: number = 0
): Promise<{ x: number; y: number; z: number }> {
    const { worldX, worldZ } = tileToWorld(tileX, tileZ);
    const y = await getHeightAtWorldTile(tileX, tileZ, level);

    return { x: worldX, y, z: worldZ };
}

/**
 * Clear the height data cache
 */
export function clearHeightCache(): void {
    heightCache.clear();
}

/**
 * Inject height data into the cache from an external source.
 * Used by instanceHeightData.ts to populate height data extracted
 * from GL floor mesh vertices for instance chunks.
 */
export function setHeightCacheEntry(
    chunkX: number,
    chunkZ: number,
    level: number,
    data: Uint16Array
): void {
    const key = getCacheKey(chunkX, chunkZ, level);
    heightCache.set(key, data);
}

/**
 * Preload height data for an area
 */
export async function preloadArea(
    minTileX: number,
    minTileZ: number,
    maxTileX: number,
    maxTileZ: number,
    level: number = 0
): Promise<void> {
    const minChunk = tileToChunk(minTileX, minTileZ);
    const maxChunk = tileToChunk(maxTileX, maxTileZ);

    const promises: Promise<Uint16Array | null>[] = [];

    for (let cx = minChunk.chunkX; cx <= maxChunk.chunkX; cx++) {
        for (let cz = minChunk.chunkZ; cz <= maxChunk.chunkZ; cz++) {
            promises.push(fetchHeightData(cx, cz, level));
        }
    }

    await Promise.all(promises);
}
