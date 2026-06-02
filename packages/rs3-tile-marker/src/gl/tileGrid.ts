/**
 * Tile Grid & Collision Overlay - Renders tile boundaries and collision data in the game
 * Based on alt1gl tilemarkers.ts implementation using streamRenderCalls
 */

import {
    native,
    GlProgram,
    GlOverlay,
    RenderInput,
    GlAttributeArgument,
    GlUniformArgument,
    OverlayUniformSource,
    RenderInvocation,
    StreamRenderObject
} from './patchrs_napi';

import { getUniformValue } from './renderprogram';
import { reportFloorChunk } from './instanceDetector';

// Constants
export const CHUNK_SIZE = 64;
export const TILE_SIZE = 512;
const HEIGHT_SCALING = TILE_SIZE / 32;

// GL Constants
const GL_FLOAT = 0x1406;
const GL_UNSIGNED_BYTE = 0x1401;
const GL_FLOAT_MAT4 = 0x8B5C;
const GL_FLOAT_VEC3 = 0x8B51;
const GL_FLOAT_VEC2 = 0x8B50;

// Mask for filtering programs (skip non-floor shaders)
let wrongProgramMask = 1 << 5;

// Shaders matching tilemarkers.ts
const VERT_SHADER = `
    #version 330 core
    layout (location = 0) in vec3 aPos;
    layout (location = 6) in vec3 aColor;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    uniform highp vec2 uMouse;
    out vec4 ourColor;
    out vec3 FragPos;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        gl_Position = uViewProjMatrix * worldpos;
        FragPos = worldpos.xyz/worldpos.w;
        ourColor = vec4(aColor,1.0);
    }`;

const FRAG_SHADER = `
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
        vec3 lighting = diffuse + uAmbientColour;
        vec3 finalColor = ourColor.rgb * lighting;

        FragColor = vec4(finalColor*0.5, ourColor.a);
    }`;

// Uniform type definitions
const uniformTypes = {
    float: { type: GL_FLOAT, len: 1, size: 4, int: false },
    vec2: { type: GL_FLOAT_VEC2, len: 2, size: 4 * 2, int: false },
    vec3: { type: GL_FLOAT_VEC3, len: 3, size: 4 * 3, int: false },
    mat4: { type: GL_FLOAT_MAT4, len: 16, size: 4 * 16, int: false },
};

// Uniform snapshot builder helper
class UniformSnapshotBuilder<T extends { [name: string]: keyof typeof uniformTypes }> {
    args: GlUniformArgument[];
    mappings: { [name in keyof T]: { write: (v: number[]) => void, read: () => number[] } };
    view: DataView;
    buffer: Uint8Array;

    constructor(init: T) {
        this.args = [];
        this.mappings = {} as any;
        let offset = 0;
        for (const [name, type] of Object.entries(init)) {
            const t = uniformTypes[type as keyof typeof uniformTypes];
            if (!t) { throw new Error("unknown uniform type " + type); }
            const entry: GlUniformArgument = { name, length: 1, type: t.type, snapshotOffset: offset, snapshotSize: t.size };
            this.args.push(entry);
            this.mappings[name as keyof T] = {
                write: (v: number[]) => {
                    if (v.length !== t.len) { throw new Error("mismatch uniform length"); }
                    for (let i = 0; i < t.len; i++) {
                        this.view.setFloat32(entry.snapshotOffset + i * 4, v[i], true);
                    }
                },
                read: () => {
                    const out: number[] = [];
                    for (let i = 0; i < t.len; i++) {
                        out.push(this.view.getFloat32(entry.snapshotOffset + i * 4, true));
                    }
                    return out;
                }
            };
            offset += t.size;
        }
        const data = new ArrayBuffer(offset);
        this.view = new DataView(data);
        this.buffer = new Uint8Array(data);
    }
}

// Position matrix helper
function positionMatrix(x: number, y: number, z: number): number[] {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}

// Create collision mesh for a chunk
function mapsquareCollisionMesh(file: Uint16Array) {
    const tallonly = true;
    const pos: number[] = [];
    const color: number[] = [];
    const index: number[] = [];
    const rootx = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootz = -CHUNK_SIZE / 2 * TILE_SIZE;

    let vertexindex = 0;
    const writevertex = (tilex: number, tilez: number, dx: number, dy: number, dz: number, vertcol: number[]) => {
        const tileindex = (tilex + tilez * CHUNK_SIZE) * 5;
        const y00 = file[tileindex + 0] * HEIGHT_SCALING * (1 - dx) * (1 - dz);
        const y01 = file[tileindex + 1] * HEIGHT_SCALING * dx * (1 - dz);
        const y10 = file[tileindex + 2] * HEIGHT_SCALING * (1 - dx) * dz;
        const y11 = file[tileindex + 3] * HEIGHT_SCALING * dx * dz;
        pos.push(
            (tilex + dx) * TILE_SIZE + rootx,
            y00 + y01 + y10 + y11 + dy * TILE_SIZE,
            (tilez + dz) * TILE_SIZE + rootz
        );
        color.push(...vertcol);
        return vertexindex++;
    };

    const writebox = (tilex: number, tilez: number, dx: number, dy: number, dz: number, sizex: number, sizey: number, sizez: number, col: number[]) => {
        const v000 = writevertex(tilex, tilez, dx, dy, dz, col);
        const v001 = writevertex(tilex, tilez, dx + sizex, dy, dz, col);
        const v010 = writevertex(tilex, tilez, dx, dy + sizey, dz, col);
        const v011 = writevertex(tilex, tilez, dx + sizex, dy + sizey, dz, col);
        const v100 = writevertex(tilex, tilez, dx, dy, dz + sizez, col);
        const v101 = writevertex(tilex, tilez, dx + sizex, dy, dz + sizez, col);
        const v110 = writevertex(tilex, tilez, dx, dy + sizey, dz + sizez, col);
        const v111 = writevertex(tilex, tilez, dx + sizex, dy + sizey, dz + sizez, col);
        index.push(v000, v011, v001, v000, v010, v011);
        index.push(v001, v111, v101, v001, v011, v111);
        index.push(v000, v110, v010, v000, v100, v110);
        index.push(v010, v111, v011, v010, v110, v111);
        index.push(v000, v101, v100, v000, v001, v101);
        index.push(v100, v111, v110, v100, v101, v111);
    };

    const getcollision = (n: number, idx: number) => Math.floor(n / (3 ** idx)) % 3;

    for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tileindex = (z * CHUNK_SIZE + x) * 5;
            const collision = file[tileindex + 4];
            const center = getcollision(collision, 0);
            if (tallonly ? center === 2 : center !== 0) {
                const height = center === 2 ? 1.6 : 0.3;
                writebox(x, z, 0.05, 0, 0.05, 0.9, height, 0.9, [80, 50, 50, 255]);
            }
            for (let dir = 0; dir < 4; dir++) {
                const side = getcollision(collision, 1 + dir);
                if (tallonly ? side === 2 : side !== 0) {
                    const height = side === 2 ? 1.8 : 0.5;
                    const vertcol = [190, 40, 40, 255];
                    if (dir === 0) writebox(x, z, 0, 0, 0, 0.15, height, 1, vertcol);
                    if (dir === 1) writebox(x, z, 0, 0, 0.85, 1, height, 0.15, vertcol);
                    if (dir === 2) writebox(x, z, 0.85, 0, 0, 0.15, height, 1, vertcol);
                    if (dir === 3) writebox(x, z, 0, 0, 0, 1, height, 0.15, vertcol);
                }
                const corner = getcollision(collision, 5 + dir);
                if (tallonly ? corner === 2 : corner !== 0) {
                    const height = corner === 2 ? 1.8 : 0.5;
                    const vertcol = [190, 40, 40, 255];
                    if (dir === 0) writebox(x, z, 0, 0, 0.85, 0.15, height, 0.15, vertcol);
                    if (dir === 1) writebox(x, z, 0.85, 0, 0.85, 0.15, height, 0.15, vertcol);
                    if (dir === 2) writebox(x, z, 0.85, 0, 0, 0.15, height, 0.15, vertcol);
                    if (dir === 3) writebox(x, z, 0, 0, 0, 0.15, height, 0.15, vertcol);
                }
            }
        }
    }

    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(color).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    };
}

// Create grid mesh (walkmesh blocking) for a chunk
function loadWalkmeshBlocking(file: Uint16Array) {
    const pos: number[] = [];
    const color: number[] = [];
    const index: number[] = [];
    const rootx = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootz = -CHUNK_SIZE / 2 * TILE_SIZE;

    let vertexindex = 0;
    const diagcut = 0.2;
    const wallcol = [60, 20, 20, 255];
    const wallsize = 0.06;
    const bordercol = [0, 0, 0, 255];
    const bordersize = 0.012;

    const writevertex = (tilex: number, tilez: number, subx: number, subz: number, dy: number, vertcol: number[], rotation: number) => {
        if (rotation % 2 === 1) [subx, subz] = [-subz, subx];
        if (rotation >= 2) { subx = -subx; subz = -subz; }

        const dx = 0.5 + subx;
        const dz = 0.5 + subz;
        dy += 1 / 32;

        const tileindex = (tilex + tilez * CHUNK_SIZE) * 5;
        const y00 = file[tileindex + 0] * HEIGHT_SCALING * (1 - dx) * (1 - dz);
        const y01 = file[tileindex + 1] * HEIGHT_SCALING * dx * (1 - dz);
        const y10 = file[tileindex + 2] * HEIGHT_SCALING * (1 - dx) * dz;
        const y11 = file[tileindex + 3] * HEIGHT_SCALING * dx * dz;
        pos.push(
            (tilex + dx) * TILE_SIZE + rootx,
            y00 + y01 + y10 + y11 + dy * TILE_SIZE,
            (tilez + dz) * TILE_SIZE + rootz
        );
        color.push(...vertcol);
        return vertexindex++;
    };

    const writeline = (x: number, z: number, size: number, col: number[], leftcut: boolean, rightcut: boolean, dir: number) => {
        const left = leftcut ? -diagcut : -0.5;
        const right = rightcut ? diagcut : 0.5;
        const v0 = writevertex(x, z, left, -0.5, 0, col, dir);
        const v1 = writevertex(x, z, right, -0.5, 0, col, dir);
        const v2 = writevertex(x, z, right - size, -0.5 + size, 0, col, dir);
        const v3 = writevertex(x, z, left + size, -0.5 + size, 0, col, dir);
        index.push(v0, v2, v1, v0, v3, v2);
    };

    const writediag = (x: number, z: number, size: number, col: number[], dir: number) => {
        const v0 = writevertex(x, z, diagcut, -0.5, 0, col, dir);
        const v1 = writevertex(x, z, 0.5, -diagcut, 0, col, dir);
        const v2 = writevertex(x, z, 0.5 - size, -diagcut + size, 0, col, dir);
        const v3 = writevertex(x, z, diagcut - size, -0.5 + size, 0, col, dir);
        index.push(v0, v2, v1, v0, v3, v2);
    };

    const getcollision = (n: number, idx: number) => Math.floor(n / (3 ** idx)) % 3;
    const findcollision = (x: number, z: number, idx: number) => {
        if (x < 0 || z < 0 || x >= CHUNK_SIZE || z >= CHUNK_SIZE) return 0;
        const tileindex = (x + z * CHUNK_SIZE) * 5;
        const flags = file[tileindex + 4];
        return getcollision(flags, idx);
    };

    for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const center = findcollision(x, z, 0);
            if (center !== 0) continue;

            const west = findcollision(x, z, 1) !== 0 || findcollision(x - 1, z, 0) !== 0 || findcollision(x - 1, z, 3) !== 0;
            const south = findcollision(x, z, 4) !== 0 || findcollision(x, z - 1, 0) !== 0 || findcollision(x, z - 1, 2) !== 0;
            const east = findcollision(x, z, 3) !== 0 || findcollision(x + 1, z, 0) !== 0 || findcollision(x + 1, z, 1) !== 0;
            const north = findcollision(x, z, 2) !== 0 || findcollision(x, z + 1, 0) !== 0 || findcollision(x, z + 1, 4) !== 0;

            const sw = south && west;
            const se = south && east;
            const nw = north && west;
            const ne = north && east;

            if (se) writediag(x, z, wallsize, wallcol, 0);
            if (ne) writediag(x, z, wallsize, wallcol, 1);
            if (nw) writediag(x, z, wallsize, wallcol, 2);
            if (sw) writediag(x, z, wallsize, wallcol, 3);

            writeline(x, z, south ? wallsize : bordersize, south ? wallcol : bordercol, sw, se, 0);
            writeline(x, z, east ? wallsize : bordersize, east ? wallcol : bordercol, se, ne, 1);
            writeline(x, z, north ? wallsize : bordersize, north ? wallcol : bordercol, ne, nw, 2);
            writeline(x, z, west ? wallsize : bordersize, west ? wallcol : bordercol, nw, sw, 3);
        }
    }

    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(color).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    };
}

// Create overlay program
function floorOverlayProgram() {
    const uniforms = new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4",
        uAmbientColour: "vec3",
        uInvSunDirection: "vec3",
        uSunColour: "vec3",
        uMouse: "vec2"
    });

    const uniformsources: OverlayUniformSource[] = [
        { type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix" },
        { type: "program", name: "uAmbientColour", sourceName: "uAmbientColour" },
        { type: "program", name: "uInvSunDirection", sourceName: "uInvSunDirection" },
        { type: "program", name: "uSunColour", sourceName: "uSunColour" },
        { type: "builtin", name: "uMouse", sourceName: "mouse" }
    ];

    const program = native.createProgram(VERT_SHADER, FRAG_SHADER, [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
        { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 3 }
    ], uniforms.args);

    return { uniforms, program, uniformsources };
}

// Overlay settings
export interface OverlaySettings {
    collision: boolean;
    grid: boolean;
}

// Floor overlay chunk class
class FloorOverlayChunk {
    chunkx: number;
    chunkz: number;
    chunklevel: number;

    stopped = false;
    loaded = false;
    failed = false;

    targetVertexObject: number;
    overlayhandles: GlOverlay[] = [];
    lastMatched = 0;
    settings: OverlaySettings;

    async load() {
        // Instance chunks: no static height/collision data available from runeapps.org
        if (this.chunkx >= 100) {
            console.log(`[TileGrid] Instance chunk ${this.chunkx},${this.chunkz} - skipping static data fetch`);
            // Mark as loaded so we don't retry
            this.loaded = true;
            return;
        }

        const endpoint = "https://runeapps.org/s3/map4/live/";
        const fallbackEndpoint = "https://runeapps.org/s3/map4/1764321618/";
        try {
            const path = `heightmesh-${this.chunklevel}/${this.chunkx}-${this.chunkz}.bin`;
            let res = await fetch(`${endpoint}${path}`);
            if (res.status === 403) {
                res = await fetch(`${fallbackEndpoint}${path}`);
            }
            if (!res.ok) {
                this.failed = true;
                this.loaded = true;
                return;
            }

            const data = new Uint16Array(await res.arrayBuffer());

            if (this.settings.collision) {
                const mesh = mapsquareCollisionMesh(data);
                const vertex = native.createVertexArray(mesh.index, [
                    { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
                    { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 3 },
                ]);
                const { program, uniforms, uniformsources } = floorOverlayProgram();
                uniforms.mappings.uModelMatrix.write(positionMatrix((this.chunkx + 0.5) * TILE_SIZE * CHUNK_SIZE, TILE_SIZE / 32, (this.chunkz + 0.5) * TILE_SIZE * CHUNK_SIZE));

                this.overlayhandles.push(native.beginOverlay({ skipProgramMask: wrongProgramMask, vertexObjectId: this.targetVertexObject }, program, vertex, {
                    uniformSources: uniformsources,
                    uniformBuffer: uniforms.buffer
                }));
            }

            if (this.settings.grid) {
                const mesh = loadWalkmeshBlocking(data);
                const vertex = native.createVertexArray(mesh.index, [
                    { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
                    { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 3 },
                ]);
                const { program, uniforms, uniformsources } = floorOverlayProgram();
                uniforms.mappings.uModelMatrix.write(positionMatrix((this.chunkx + 0.5) * TILE_SIZE * CHUNK_SIZE, TILE_SIZE / 32, (this.chunkz + 0.5) * TILE_SIZE * CHUNK_SIZE));

                this.overlayhandles.push(native.beginOverlay({ skipProgramMask: wrongProgramMask, vertexObjectId: this.targetVertexObject }, program, vertex, {
                    uniformSources: uniformsources,
                    uniformBuffer: uniforms.buffer
                }));
            }

            console.log("[TileGrid] Loaded chunk", this.chunkx, this.chunkz);
            this.loaded = true;

            if (this.stopped) {
                this.stop();
            }
        } catch (e) {
            console.error("[TileGrid] Failed to load chunk:", e);
            this.failed = true;
            this.loaded = true;
        }
    }

    stop() {
        this.stopped = true;
        this.overlayhandles.forEach(q => q.stop());
        console.log("[TileGrid] Stopping chunk", this.chunkx, this.chunkz);
    }

    constructor(render: RenderInvocation, settings: OverlaySettings) {
        const uniform = getUniformValue(render.uniformState, render.program.uniforms.find(q => q.name === "uModelMatrix")!);
        this.chunkx = Math.floor(uniform[0][12] / CHUNK_SIZE / TILE_SIZE);
        this.chunkz = Math.floor(uniform[0][14] / CHUNK_SIZE / TILE_SIZE);
        console.log("[TileGrid] Loading chunk", this.chunkx, this.chunkz);

        // Report floor chunk to instance detector for fingerprinting
        reportFloorChunk(this.chunkx, this.chunkz);
        this.chunklevel = 0;
        this.targetVertexObject = render.vertexObjectId;
        this.settings = settings;
        this.load();
    }
}

// Active floor tracker
let activeTracker: { stream: StreamRenderObject; close: () => void } | null = null;

/**
 * Start the floor tracker for grid/collision overlays
 */
export function floorTracker(settings: OverlaySettings) {
    if (!native) {
        console.error("[TileGrid] Native addon not available");
        return null;
    }

    const knownProgs = new WeakMap<GlProgram, object>();
    const chunks = new Map<number, FloorOverlayChunk>();
    let stopped = false;

    const stream = native.streamRenderCalls({
        features: ["uniforms"],
        framecooldown: 500, // Check more frequently for floor changes
        skipProgramMask: wrongProgramMask,
        // Don't use skipVerticesMask - we handle deduplication via chunks map
        // This allows vertex objects to reappear after cleanup for floor switching
    }, renders => {
        if (stopped) return;

        let newChunks = 0;
        for (const render of renders) {
            if (!knownProgs.has(render.program)) {
                if (render.program.inputs.find(q => q.name === "aMaterialSettingsSlotXY3")) {
                    knownProgs.set(render.program, {});
                } else {
                    render.program.skipmask |= wrongProgramMask;
                    continue;
                }
            }

            // Check if we already have this chunk
            if (!chunks.has(render.vertexObjectId)) {
                chunks.set(render.vertexObjectId, new FloorOverlayChunk(render, settings));
                newChunks++;
            }
            chunks.get(render.vertexObjectId)!.lastMatched = Date.now();
        }

        if (newChunks > 0) {
            console.log("[TileGrid] floortrack: added", newChunks, "new chunks, total:", chunks.size);
        }

        // Clean up old chunks (5 minutes timeout for floor switching)
        const deadline = Date.now() - 5 * 60 * 1000;
        for (const [vao, chunk] of chunks) {
            if (chunk.lastMatched < deadline) {
                chunk.stop();
                chunks.delete(vao);
                console.log("[TileGrid] Cleaned up stale chunk");
            }
        }
    });

    const close = () => {
        stopped = true;
        stream.close();
        chunks.forEach(q => q.stop());
    };

    return { stream, close };
}

/**
 * Start grid/collision overlay
 */
export function startOverlay(settings: OverlaySettings): boolean {
    if (!native) {
        console.error("[TileGrid] Native addon not available");
        return false;
    }

    // Stop existing tracker
    stopOverlay();

    if (!settings.collision && !settings.grid) {
        return true;
    }

    activeTracker = floorTracker(settings);
    return activeTracker !== null;
}

/**
 * Stop all overlays
 */
export function stopOverlay(): void {
    if (activeTracker) {
        activeTracker.close();
        activeTracker = null;
    }
}

/**
 * Check if overlay is active
 */
export function isOverlayActive(): boolean {
    return activeTracker !== null;
}

/**
 * Check if native addon is available
 */
export function isNativeAvailable(): boolean {
    return native != null;
}

// Legacy exports for backwards compatibility
export { stopOverlay as stopOverlays, stopOverlay as stopGrid };
export { isOverlayActive as isGridActive };

// For debugging - expose floorTracker globally
if (typeof globalThis !== 'undefined') {
    (globalThis as any).floorTracker = floorTracker;
}
