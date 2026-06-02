/**
 * Instance Height Data - Extracts terrain height from GL floor mesh vertices
 * for instance areas where static height data from runeapps.org is unavailable.
 *
 * Approach:
 * 1. Capture floor mesh render calls with "vertexarray" feature
 * 2. Read vertex positions from the position attribute buffer
 * 3. Map vertices to tile corners and build a Uint16Array height grid
 *    matching the format from runeapps.org (64x64 tiles, 5 values each)
 * 4. Inject into heightData.ts cache via setHeightCacheEntry() so
 *    fetchHeightData() returns it transparently for instance chunks
 *
 * Fallback: when vertex buffer extraction fails, uses the floor render's
 * model matrix Y as a flat per-chunk height (better than Y=0).
 */

import {
    CHUNK_SIZE,
    TILE_SIZE,
    HEIGHT_SCALING,
    setHeightCacheEntry,
    clearHeightCache
} from './heightData';
import { native, RenderInvocation, RenderInput } from './patchrs_napi';
import { getProgramMeta } from './renderprogram';

// GL scalar type constants
const GL_FLOAT = 0x1406;
const GL_HALF_FLOAT = 0x140B;
const GL_SHORT = 0x1402;

// Track which instance chunks have been captured (for dedup and cleanup)
const capturedInstanceChunks = new Set<string>();

// Per-chunk base world Y (minimum world Y across all vertices in the chunk)
const instanceChunkBaseHeight = new Map<string, number>();

function getCacheKey(chunkX: number, chunkZ: number): string {
    return `${chunkX}-${chunkZ}`;
}

/**
 * Check if height data has already been captured for an instance chunk
 */
export function hasInstanceHeightData(chunkX: number, chunkZ: number): boolean {
    return capturedInstanceChunks.has(getCacheKey(chunkX, chunkZ));
}

/**
 * Get the base world Y height for an instance chunk (minimum world Y across all vertices).
 * Returns null if the chunk has not been captured yet.
 */
export function getInstanceChunkBaseHeight(chunkX: number, chunkZ: number): number | null {
    return instanceChunkBaseHeight.get(getCacheKey(chunkX, chunkZ)) ?? null;
}

/**
 * Create a flat height grid with a uniform height value derived from the model matrix Y.
 * Used as fallback when vertex buffer extraction is not available.
 */
function createFlatHeightData(modelY: number): Uint16Array {
    const heightData = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * 5);
    const rawHeight = 0; // Base height tracked separately in instanceChunkBaseHeight

    for (let tz = 0; tz < CHUNK_SIZE; tz++) {
        for (let tx = 0; tx < CHUNK_SIZE; tx++) {
            const tileIdx = (tx + tz * CHUNK_SIZE) * 5;
            heightData[tileIdx + 0] = rawHeight; // SW
            heightData[tileIdx + 1] = rawHeight; // SE
            heightData[tileIdx + 2] = rawHeight; // NW
            heightData[tileIdx + 3] = rawHeight; // NE
            // heightData[tileIdx + 4] = 0; // flags
        }
    }

    console.log(`[InstanceHeight] Created flat height data: modelY=${modelY}, rawHeight=${rawHeight} (base height tracked separately)`);
    return heightData;
}

/**
 * Read a float value from a buffer attribute, handling different scalar types.
 */
function readFloat(dv: DataView, byteOff: number, scalarType: number): number {
    if (scalarType === GL_FLOAT) {
        return dv.getFloat32(byteOff, true);
    } else if (scalarType === GL_HALF_FLOAT) {
        // Decode IEEE 754 half-precision float
        const bits = dv.getUint16(byteOff, true);
        const sign = (bits >> 15) & 1;
        const exp = (bits >> 10) & 0x1F;
        const frac = bits & 0x3FF;
        if (exp === 0) {
            return (sign ? -1 : 1) * Math.pow(2, -14) * (frac / 1024);
        } else if (exp === 31) {
            return frac ? NaN : (sign ? -Infinity : Infinity);
        }
        return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 1024);
    } else if (scalarType === GL_SHORT) {
        return dv.getInt16(byteOff, true);
    }
    // Default: treat as float
    return dv.getFloat32(byteOff, true);
}

/**
 * Get byte size of a scalar type
 */
function scalarSize(scalarType: number): number {
    if (scalarType === GL_FLOAT) return 4;
    if (scalarType === GL_HALF_FLOAT) return 2;
    if (scalarType === GL_SHORT) return 2;
    return 4; // default float
}

/**
 * Extract height data from a floor mesh render's vertex buffer.
 * Builds a Uint16Array(64*64*5) matching the format from runeapps.org:
 *   Per tile: [cornerSW, cornerSE, cornerNW, cornerNE, flags]
 *
 * Floor mesh vertices are in chunk-local coordinates:
 *   root = (-CHUNK_SIZE/2 * TILE_SIZE, 0, -CHUNK_SIZE/2 * TILE_SIZE)
 *   i.e. (-16384, 0, -16384)
 *
 * Vertex (vx, vy, vz) maps to tile corner:
 *   cornerX = round((vx - rootx) / TILE_SIZE)  -- range 0..64
 *   cornerZ = round((vz - rootz) / TILE_SIZE)  -- range 0..64
 *   height  = (modelY + vy - baseWorldY) / HEIGHT_SCALING -- stored as Uint16
 */
export function extractHeightFromFloorMesh(
    render: RenderInvocation,
    chunkX: number,
    chunkZ: number,
    modelY: number
): Uint16Array | null {
    if (!render.vertexArray) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: no vertexArray on render`);
        return null;
    }
    if (!render.vertexArray.attributes || render.vertexArray.attributes.length === 0) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: no attributes in vertexArray`);
        return null;
    }

    const meta = getProgramMeta(render.program);

    // Try to find position attribute:
    // 1. Use meta.aPos (matches vertexPosAliases)
    // 2. Fallback: find by name containing "Position" or "Pos"
    // 3. Fallback: use attribute at location 0
    let posAttr: RenderInput | null = null;
    let posScalarType = GL_FLOAT;

    if (meta.aPos) {
        posAttr = render.vertexArray.attributes.find(
            a => a.enabled && a.location === meta.aPos!.location
        ) ?? null;
        if (posAttr) {
            posScalarType = posAttr.scalartype || GL_FLOAT;
            console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: found position attr via meta.aPos (loc=${meta.aPos.location}, bufLen=${posAttr.buffer?.length ?? 0})`);
        }
    }

    if (!posAttr) {
        // Fallback: try to find any enabled vec3+ attribute at location 0
        posAttr = render.vertexArray.attributes.find(
            a => a.enabled && a.location === 0 && a.vectorlength >= 3
        ) ?? null;
        if (posAttr) {
            posScalarType = posAttr.scalartype || GL_FLOAT;
            console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: using fallback attr at location 0 (bufLen=${posAttr.buffer?.length ?? 0})`);
        }
    }

    if (!posAttr) {
        // Last fallback: first enabled attribute with vectorlength >= 3
        posAttr = render.vertexArray.attributes.find(
            a => a.enabled && a.vectorlength >= 3
        ) ?? null;
        if (posAttr) {
            posScalarType = posAttr.scalartype || GL_FLOAT;
            console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: using first vec3+ attr (loc=${posAttr.location}, bufLen=${posAttr.buffer?.length ?? 0})`);
        }
    }

    if (!posAttr) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: no suitable position attribute found`);
        // Log all attributes for diagnosis
        for (const attr of render.vertexArray.attributes) {
            console.log(`[InstanceHeight]   attr: loc=${attr.location} enabled=${attr.enabled} vecLen=${attr.vectorlength} type=${attr.scalartype} bufLen=${attr.buffer?.length ?? 0} stride=${attr.stride} offset=${attr.offset}`);
        }
        return null;
    }

    if (!posAttr.buffer || posAttr.buffer.length === 0) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: position attribute buffer is empty (length=${posAttr.buffer?.length ?? 'null'})`);
        console.warn(`[InstanceHeight]   This likely means the "vertexarray" feature does not capture buffer data on this platform.`);
        return null;
    }

    // Height data: 64x64 tiles, 5 Uint16 values each (4 corner heights + flags)
    const heightData = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * 5);
    // Track which corners have been set (for gap-filling)
    const cornerSet = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * 4);

    const rootx = -(CHUNK_SIZE / 2) * TILE_SIZE; // -16384
    const rootz = -(CHUNK_SIZE / 2) * TILE_SIZE;

    const sSize = scalarSize(posScalarType);
    const defaultStride = sSize * (posAttr.vectorlength || 3);
    const stride = posAttr.stride || defaultStride;
    const offset = posAttr.offset || 0;
    const dv = new DataView(posAttr.buffer.buffer, posAttr.buffer.byteOffset);
    const numVertices = Math.floor((posAttr.buffer.length - offset) / stride);

    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: extracting from ${numVertices} vertices (stride=${stride}, offset=${offset}, scalarType=0x${posScalarType.toString(16)}, bufLen=${posAttr.buffer.length})`);

    // Log first few vertices for debugging
    const logCount = Math.min(3, numVertices);
    for (let i = 0; i < logCount; i++) {
        const byteOff = offset + i * stride;
        if (byteOff + sSize * 3 > posAttr.buffer.length) break;
        const vx = readFloat(dv, byteOff, posScalarType);
        const vy = readFloat(dv, byteOff + sSize, posScalarType);
        const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);
        console.log(`[InstanceHeight]   vertex[${i}]: (${vx.toFixed(1)}, ${vy.toFixed(1)}, ${vz.toFixed(1)})`);
    }

    // PASS 1: Find minimum world Y across all vertices in the chunk
    let minWorldY = Infinity;

    for (let i = 0; i < numVertices; i++) {
        const byteOff = offset + i * stride;
        if (byteOff + sSize * 3 > posAttr.buffer.length) break;

        const vx = readFloat(dv, byteOff, posScalarType);
        const vy = readFloat(dv, byteOff + sSize, posScalarType);
        const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);

        if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz)) continue;

        const cornerX = Math.round((vx - rootx) / TILE_SIZE);
        const cornerZ = Math.round((vz - rootz) / TILE_SIZE);
        if (cornerX < 0 || cornerX > CHUNK_SIZE || cornerZ < 0 || cornerZ > CHUNK_SIZE) continue;

        const worldY = modelY + vy;
        if (worldY < minWorldY) minWorldY = worldY;
    }

    if (!isFinite(minWorldY)) minWorldY = modelY;

    // Store the base height for this chunk
    const baseWorldY = minWorldY;
    instanceChunkBaseHeight.set(getCacheKey(chunkX, chunkZ), baseWorldY);
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: baseWorldY=${baseWorldY.toFixed(1)} (modelY=${modelY.toFixed(1)}, minVertexY=${(baseWorldY - modelY).toFixed(1)})`);

    // PASS 2: Store heights as non-negative offsets from baseWorldY
    let processedCount = 0;
    let outOfBoundsCount = 0;

    for (let i = 0; i < numVertices; i++) {
        const byteOff = offset + i * stride;
        if (byteOff + sSize * 3 > posAttr.buffer.length) break;

        const vx = readFloat(dv, byteOff, posScalarType);
        const vy = readFloat(dv, byteOff + sSize, posScalarType);
        const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);

        if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz)) continue;

        const cornerX = Math.round((vx - rootx) / TILE_SIZE);
        const cornerZ = Math.round((vz - rootz) / TILE_SIZE);

        if (cornerX < 0 || cornerX > CHUNK_SIZE || cornerZ < 0 || cornerZ > CHUNK_SIZE) {
            outOfBoundsCount++;
            continue;
        }

        // Height as offset from base, always non-negative
        const worldY = modelY + vy;
        const heightVal = Math.round((worldY - baseWorldY) / HEIGHT_SCALING);
        const heightU16 = Math.max(0, Math.min(65535, heightVal));

        const setCorner = (tx: number, tz: number, cornerIdx: number) => {
            if (tx < 0 || tx >= CHUNK_SIZE || tz < 0 || tz >= CHUNK_SIZE) return;
            const tileIdx = (tx + tz * CHUNK_SIZE) * 5;
            heightData[tileIdx + cornerIdx] = heightU16;
            cornerSet[(tx + tz * CHUNK_SIZE) * 4 + cornerIdx] = 1;
        };

        setCorner(cornerX, cornerZ, 0);
        setCorner(cornerX - 1, cornerZ, 1);
        setCorner(cornerX, cornerZ - 1, 2);
        setCorner(cornerX - 1, cornerZ - 1, 3);
        processedCount++;
    }

    // Fill gaps: for tiles with some but not all corners set, average from set ones
    let fullCoverage = 0;
    let partialCoverage = 0;

    for (let tz = 0; tz < CHUNK_SIZE; tz++) {
        for (let tx = 0; tx < CHUNK_SIZE; tx++) {
            const base = (tx + tz * CHUNK_SIZE) * 4;
            const tileIdx = (tx + tz * CHUNK_SIZE) * 5;
            let setCount = 0;
            let sum = 0;

            for (let c = 0; c < 4; c++) {
                if (cornerSet[base + c]) {
                    setCount++;
                    sum += heightData[tileIdx + c];
                }
            }

            if (setCount === 4) {
                fullCoverage++;
            } else if (setCount > 0) {
                partialCoverage++;
                // Fill missing corners with average of set corners
                const avg = Math.round(sum / setCount);
                for (let c = 0; c < 4; c++) {
                    if (!cornerSet[base + c]) {
                        heightData[tileIdx + c] = avg;
                    }
                }
            }
            // flags word (index 4) stays 0 — no collision data for instances
        }
    }

    console.log(
        `[InstanceHeight] Chunk ${chunkX},${chunkZ}: processed ${processedCount} vertices (${outOfBoundsCount} out-of-bounds), ` +
        `${fullCoverage} full tiles, ${partialCoverage} partial tiles`
    );

    if (fullCoverage + partialCoverage === 0) return null;

    return heightData;
}

/**
 * Extract height data from MULTIPLE floor render invocations for the same chunk.
 * RS3 may render stairs, slopes, and terrain features as separate draw calls.
 * This combines all vertices to build a complete height map.
 */
function extractHeightFromMultipleRenders(
    renders: RenderInvocation[],
    chunkX: number,
    chunkZ: number,
    modelYs: number[]
): Uint16Array | null {
    // If only one render, delegate to single-render extractor
    if (renders.length === 1) {
        return extractHeightFromFloorMesh(renders[0], chunkX, chunkZ, modelYs[0]);
    }

    const rootx = -(CHUNK_SIZE / 2) * TILE_SIZE;
    const rootz = -(CHUNK_SIZE / 2) * TILE_SIZE;

    // Collect ALL vertices from ALL renders with their world Y
    interface VertexInfo { cornerX: number; cornerZ: number; worldY: number; }
    const allVertices: VertexInfo[] = [];

    for (let r = 0; r < renders.length; r++) {
        const render = renders[r];
        const modelY = modelYs[r];

        if (!render.vertexArray?.attributes?.length) continue;

        const meta = getProgramMeta(render.program);

        // Find position attribute (same logic as extractHeightFromFloorMesh)
        let posAttr: RenderInput | null = null;
        let posScalarType = GL_FLOAT;

        if (meta.aPos) {
            posAttr = render.vertexArray.attributes.find(
                a => a.enabled && a.location === meta.aPos!.location
            ) ?? null;
        }
        if (!posAttr) {
            posAttr = render.vertexArray.attributes.find(
                a => a.enabled && a.location === 0 && a.vectorlength >= 3
            ) ?? null;
        }
        if (!posAttr) {
            posAttr = render.vertexArray.attributes.find(
                a => a.enabled && a.vectorlength >= 3
            ) ?? null;
        }
        if (!posAttr?.buffer?.length) continue;

        posScalarType = posAttr.scalartype || GL_FLOAT;
        const sSize = scalarSize(posScalarType);
        const defaultStride = sSize * (posAttr.vectorlength || 3);
        const stride = posAttr.stride || defaultStride;
        const offset = posAttr.offset || 0;
        const dv = new DataView(posAttr.buffer.buffer, posAttr.buffer.byteOffset);
        const numVertices = Math.floor((posAttr.buffer.length - offset) / stride);

        for (let i = 0; i < numVertices; i++) {
            const byteOff = offset + i * stride;
            if (byteOff + sSize * 3 > posAttr.buffer.length) break;

            const vx = readFloat(dv, byteOff, posScalarType);
            const vy = readFloat(dv, byteOff + sSize, posScalarType);
            const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);

            if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz)) continue;

            const cornerX = Math.round((vx - rootx) / TILE_SIZE);
            const cornerZ = Math.round((vz - rootz) / TILE_SIZE);
            if (cornerX < 0 || cornerX > CHUNK_SIZE || cornerZ < 0 || cornerZ > CHUNK_SIZE) continue;

            allVertices.push({ cornerX, cornerZ, worldY: modelY + vy });
        }

        console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ} render[${r}]: ${numVertices} vertices (modelY=${modelY.toFixed(0)})`);
    }

    if (allVertices.length === 0) return null;

    // Find minimum world Y across ALL vertices from ALL renders
    let minWorldY = Infinity;
    for (const v of allVertices) {
        if (v.worldY < minWorldY) minWorldY = v.worldY;
    }
    if (!isFinite(minWorldY)) minWorldY = modelYs[0];

    const baseWorldY = minWorldY;
    instanceChunkBaseHeight.set(getCacheKey(chunkX, chunkZ), baseWorldY);
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: baseWorldY=${baseWorldY.toFixed(1)} from ${allVertices.length} total vertices across ${renders.length} renders`);

    // Build height grid from all vertices
    const heightData = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * 5);
    const cornerSet = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * 4);

    let processedCount = 0;
    for (const v of allVertices) {
        const heightVal = Math.round((v.worldY - baseWorldY) / HEIGHT_SCALING);
        const heightU16 = Math.max(0, Math.min(65535, heightVal));

        const setCorner = (tx: number, tz: number, cornerIdx: number) => {
            if (tx < 0 || tx >= CHUNK_SIZE || tz < 0 || tz >= CHUNK_SIZE) return;
            const tileIdx = (tx + tz * CHUNK_SIZE) * 5;
            // Use the HIGHER value when multiple renders provide data for the same corner
            // (prefer the visible floor surface over underground geometry)
            if (!cornerSet[(tx + tz * CHUNK_SIZE) * 4 + cornerIdx] || heightData[tileIdx + cornerIdx] < heightU16) {
                heightData[tileIdx + cornerIdx] = heightU16;
                cornerSet[(tx + tz * CHUNK_SIZE) * 4 + cornerIdx] = 1;
            }
        };

        setCorner(v.cornerX, v.cornerZ, 0);
        setCorner(v.cornerX - 1, v.cornerZ, 1);
        setCorner(v.cornerX, v.cornerZ - 1, 2);
        setCorner(v.cornerX - 1, v.cornerZ - 1, 3);
        processedCount++;
    }

    // Fill gaps
    let fullCoverage = 0;
    let partialCoverage = 0;
    for (let tz = 0; tz < CHUNK_SIZE; tz++) {
        for (let tx = 0; tx < CHUNK_SIZE; tx++) {
            const base = (tx + tz * CHUNK_SIZE) * 4;
            const tileIdx = (tx + tz * CHUNK_SIZE) * 5;
            let setCount = 0;
            let sum = 0;
            for (let c = 0; c < 4; c++) {
                if (cornerSet[base + c]) { setCount++; sum += heightData[tileIdx + c]; }
            }
            if (setCount === 4) {
                fullCoverage++;
            } else if (setCount > 0) {
                partialCoverage++;
                const avg = Math.round(sum / setCount);
                for (let c = 0; c < 4; c++) {
                    if (!cornerSet[base + c]) heightData[tileIdx + c] = avg;
                }
            }
        }
    }

    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: merged ${processedCount} vertices, ${fullCoverage} full tiles, ${partialCoverage} partial tiles`);
    if (fullCoverage + partialCoverage === 0) return null;
    return heightData;
}

/**
 * One-shot capture of instance height data.
 * Records one frame of render calls with vertex buffers and extracts heights
 * for all visible instance floor chunks. Injects results into heightData's cache.
 *
 * When vertex extraction fails (e.g. buffer data not available), falls back
 * to using the floor render's model matrix Y as a flat height per chunk.
 *
 * Returns the number of chunks successfully processed.
 */
export async function captureInstanceHeights(): Promise<number> {
    if (!native) return 0;

    try {
        console.log('[InstanceHeight] Starting one-shot vertex capture...');

        const renders = await native.recordRenderCalls({
            maxframes: 1,
            features: ["vertexarray", "uniforms"]
        });

        console.log(`[InstanceHeight] Recorded ${renders.length} total renders`);

        // Phase 1: Group all instance floor renders by chunk
        const chunkFloorRenders = new Map<string, { renders: RenderInvocation[], modelYs: number[] }>();
        let floorCount = 0;
        let instanceFloorCount = 0;

        for (const render of renders) {
            if (!render.program) continue;

            const isFloor = render.program.inputs.some(
                (i: { name: string }) => i.name === 'aMaterialSettingsSlotXY3'
            );
            if (!isFloor) continue;
            floorCount++;

            const modelMatrixUniform = render.program.uniforms.find(
                (u: { name: string }) => u.name === 'uModelMatrix'
            );
            if (!modelMatrixUniform || !render.uniformState) continue;

            const view = new DataView(
                render.uniformState.buffer,
                render.uniformState.byteOffset
            );
            const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
            const y = view.getFloat32(modelMatrixUniform.snapshotOffset + 13 * 4, true);
            const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);

            const cx = Math.floor(x / CHUNK_SIZE / TILE_SIZE);
            const cz = Math.floor(z / CHUNK_SIZE / TILE_SIZE);

            if (cx < 100) continue;
            instanceFloorCount++;

            // Skip chunks already captured in a PREVIOUS capture call
            if (hasInstanceHeightData(cx, cz)) continue;

            const key = getCacheKey(cx, cz);
            if (!chunkFloorRenders.has(key)) {
                chunkFloorRenders.set(key, { renders: [], modelYs: [] });
            }
            const group = chunkFloorRenders.get(key)!;
            group.renders.push(render);
            group.modelYs.push(y);
        }

        console.log(`[InstanceHeight] ${floorCount} floor renders, ${instanceFloorCount} instance floors, ${chunkFloorRenders.size} chunks to process`);

        // Phase 2: Process each chunk with ALL its floor renders
        let newCount = 0;
        let vertexSuccessCount = 0;
        let fallbackCount = 0;

        for (const [key, { renders: chunkRenders, modelYs }] of chunkFloorRenders) {
            const parts = key.split('-');
            const cx = parseInt(parts[0]);
            const cz = parseInt(parts[1]);

            console.log(`[InstanceHeight] Processing chunk ${cx},${cz} with ${chunkRenders.length} floor render(s)`);

            const heightData = extractHeightFromMultipleRenders(chunkRenders, cx, cz, modelYs);
            if (heightData) {
                setHeightCacheEntry(cx, cz, 0, heightData);
                capturedInstanceChunks.add(key);
                newCount++;
                vertexSuccessCount++;
            } else {
                // Fallback: use first render's model matrix Y
                console.log(`[InstanceHeight] Vertex extraction failed for chunk ${cx},${cz} — using model matrix Y fallback (y=${modelYs[0].toFixed(1)})`);
                const flatData = createFlatHeightData(modelYs[0]);
                instanceChunkBaseHeight.set(key, modelYs[0]);
                setHeightCacheEntry(cx, cz, 0, flatData);
                capturedInstanceChunks.add(key);
                newCount++;
                fallbackCount++;
            }
        }

        console.log(
            `[InstanceHeight] Summary: ${floorCount} floor renders, ${instanceFloorCount} instance floors, ` +
            `${vertexSuccessCount} vertex-extracted, ${fallbackCount} fallback-flat, ${newCount} total captured`
        );
        return newCount;
    } catch (e) {
        console.error('[InstanceHeight] Capture failed:', e);
        return 0;
    }
}

/**
 * Clear tracking of captured instance chunks.
 * Note: also clears the entire heightData cache since instance entries
 * are mixed in with it. Called when leaving an instance.
 */
export function clearInstanceHeightCache(): void {
    const size = capturedInstanceChunks.size;
    capturedInstanceChunks.clear();
    instanceChunkBaseHeight.clear();
    // Clear heightData cache to remove stale instance entries.
    // Normal world chunks will be re-fetched on demand.
    clearHeightCache();
    if (size > 0) {
        console.log(`[InstanceHeight] Cleared ${size} instance height entries`);
    }
}
