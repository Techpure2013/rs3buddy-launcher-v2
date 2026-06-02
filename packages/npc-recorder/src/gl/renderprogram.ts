/**
 * Render program utilities for parsing shader metadata
 * Based on RS3QuestBuddyGL implementation
 */

import * as patchrs from './patchrs_napi';
import { vartypes } from './avautils';
import { CrcBuilder } from './crc32';

const cachedPrograms = new WeakMap<patchrs.GlProgram, ProgramMeta>();
const vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];

export type ProgramMeta = ReturnType<typeof fetchProgramMeta>;

export function getProgramMeta(prog: patchrs.GlProgram) {
    if (cachedPrograms.has(prog)) {
        return cachedPrograms.get(prog)!;
    }
    const r = fetchProgramMeta(prog);
    cachedPrograms.set(prog, r);
    return r;
}

function fetchProgramMeta(prog: patchrs.GlProgram) {
    const fragdefines: string[] = [];
    const vertdefines: string[] = [];
    const reg = /^#define\s+(\w+)\s*$/gm;
    let m: RegExpExecArray | null;

    while (m = reg.exec(prog.fragmentShader.source)) { fragdefines.push(m[1]); }
    while (m = reg.exec(prog.vertexShader.source)) { vertdefines.push(m[1]); }

    const isTinted = !!prog.fragmentShader.source.match(/\bgl_FragColor\s*=\s*uTint\b/);

    const uTint = prog.uniforms.find(q => q.name == "uTint");
    const uBoneTransforms = prog.uniforms.find(q => q.name == "uBoneTransforms[0]");
    const uViewMatrix = prog.uniforms.find(q => q.name == "uViewMatrix");

    const aVertexPosition2D = prog.inputs.find(q => q.name == "aVertexPosition2D");
    const aPos = prog.inputs.find(i => vertexPosAliases.indexOf(i.name) != -1);
    const aColor = prog.inputs.find(q => q.name == "aVertexColour");
    const aTexUV = prog.inputs.find(q => q.name == "aTextureUV");
    const aNormal = prog.inputs.find(q => q.name == "aVertexNormal_BatchFlags");
    const aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
    const aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");

    const isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");

    return {
        uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
        uBones: uBoneTransforms,
        uTint: uTint,
        uViewMatrix: uViewMatrix,

        aPos: aPos,
        aColor: aColor,
        aTexUV: aTexUV,
        aNormal: aNormal,

        isFloor: !!aMaterialSettingsSlotXY3,
        isAnimated: !!uBoneTransforms,
        isUi: !!aVertexPosition2D,
        isParticles: !!aParticleSize,
        isLighted,
        isTinted,
        isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,
        isShadowRender: fragdefines.includes("SHADOW_RENDER") || vertdefines.includes("SHADOW_RENDER"),

        raw: prog,
        fragdefines,
        vertdefines,
    };
}

export function getUniformValue(snap: Uint8Array, uni: patchrs.GlUniformMeta) {
    const t = vartypes[uni.type.scalarType as keyof typeof vartypes];
    const v: number[][] = [];
    const unireader = new DataView(snap.buffer, snap.byteOffset, snap.byteLength);

    for (let a = 0; a < uni.length; a++) {
        const sub: number[] = [];
        v.push(sub);
        for (let b = 0; b < uni.type.vectorLength; b++) {
            const offset = uni.snapshotOffset + uni.type.vectorLength * uni.type.scalarSize * a + uni.type.scalarSize * b;
            sub.push((unireader as any)[t.readfn](offset, true));
        }
    }
    return v;
}

export type RenderFunc = {
    render: patchrs.RenderInvocation;
    program: patchrs.GlProgram;
    vertexArray: patchrs.VertexArraySnapshot;
    uniformState: Uint8Array;
};

export function getRenderFunc(render: patchrs.RenderInvocation): RenderFunc {
    return {
        render,
        program: render.program,
        vertexArray: render.vertexArray,
        uniformState: render.uniformState,
    };
}

export interface MeshSprite {
    imageData: ImageData;
    width: number;
    height: number;
    close(): void;
}

// Helper: Read triangle indices from index buffer
function readIndices(indexBuffer: Uint8Array, indexType: number): number[] {
    const indices: number[] = [];
    const view = new DataView(indexBuffer.buffer, indexBuffer.byteOffset, indexBuffer.byteLength);

    if (indexType === 0x1403) { // GL_UNSIGNED_SHORT
        for (let i = 0; i + 1 < indexBuffer.length; i += 2) {
            indices.push(view.getUint16(i, true));
        }
    } else if (indexType === 0x1405) { // GL_UNSIGNED_INT
        for (let i = 0; i + 3 < indexBuffer.length; i += 4) {
            indices.push(view.getUint32(i, true));
        }
    } else { // GL_UNSIGNED_BYTE
        for (let i = 0; i < indexBuffer.length; i++) {
            indices.push(indexBuffer[i]);
        }
    }
    return indices;
}

function getAttributeView(attr: patchrs.RenderInput) {
    const type = vartypes[attr.scalartype as keyof typeof vartypes];
    if (!type || !type.constr) {
        // Unknown or unsupported scalar type (e.g. half-float) - return empty view
        const empty = new Float32Array(0);
        return [empty, 0, 1] as const;
    }
    const stride = Math.max(1, Math.floor(attr.stride / type.size));
    const availableBytes = Math.max(0, attr.buffer.byteLength - attr.offset);
    const availableElements = Math.floor(availableBytes / type.size);
    const len = Math.floor(availableElements / stride);
    if (len <= 0) {
        const empty = new Float32Array(0);
        return [empty, 0, stride] as const;
    }
    const view = new type.constr(attr.buffer.buffer, attr.buffer.byteOffset + attr.offset, len * stride) as Float32Array | Int16Array | Uint16Array;
    return [view, len, stride] as const;
}

export type MeshMeta = {
    vertexcenter: [number, number, number],
    vertexcount: number,
    posbufferhash: number,
    usedbones: number[]
}

export function generateMeshMeta(render: patchrs.RenderInvocation, progmeta: ProgramMeta): MeshMeta {
    let posinput = render.vertexArray.attributes[progmeta.aPos!.location];
    let [view, len, stride] = getAttributeView(posinput);

    let hash = new CrcBuilder();
    let sumx = 0, sumy = 0, sumz = 0;
    for (let i = 0; i < len; i++) {
        sumx += view[i * stride + 0];
        sumy += view[i * stride + 1];
        sumz += view[i * stride + 2];

        hash.addUint16(view[i * stride + 0]);
        hash.addUint16(view[i * stride + 1]);
        hash.addUint16(view[i * stride + 2]);
    }

    let boneids: number[] = [];
    // Note: aSkinbones and aBones not available in our ProgramMeta, skip bone extraction

    return {
        vertexcount: len,
        vertexcenter: [sumx / len, sumy / len, sumz / len],
        posbufferhash: hash.get(),
        usedbones: boneids
    };
}

// ---- WebGL2 sprite renderer (hardware-accelerated, matching RS3QuestBuddyBeta) ----

const SPRITE_VERT = `#version 300 es
in vec3 aPos;
in vec3 aCol;
in vec2 aUV;
in vec3 aNorm;
uniform mat4 uTransform;
out vec3 vCol;
out vec2 vUV;
out vec3 vNorm;
void main() {
    gl_Position = uTransform * vec4(aPos, 1.0);
    vCol = aCol;
    vUV = aUV;
    vNorm = aNorm;
}`;

const SPRITE_FRAG = `#version 300 es
precision highp float;
in vec3 vCol;
in vec2 vUV;
in vec3 vNorm;
uniform sampler2D uDiffuse;
uniform int uHasTexture;
out vec4 fragColor;
void main() {
    vec3 color = vCol;
    if (uHasTexture == 1) {
        vec4 texColor = texture(uDiffuse, vUV);
        if (texColor.a < 0.01) discard;
        color = texColor.rgb * vCol;
    }
    // Basic directional lighting
    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
    float ambient = 0.45;
    float diffuse = max(dot(normalize(vNorm), lightDir), 0.0) * 0.55;
    float light = ambient + diffuse;
    if (length(vNorm) < 0.01) light = 1.0; // No normals = full bright
    fragColor = vec4(color * light, 1.0);
}`;

let cachedSpriteCtx: {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    uTransform: WebGLUniformLocation;
    uDiffuse: WebGLUniformLocation;
    uHasTexture: WebGLUniformLocation;
    aPosLoc: number;
    aColLoc: number;
    aUVLoc: number;
    aNormLoc: number;
} | null = null;

function getSpriteGl() {
    if (cachedSpriteCtx) return cachedSpriteCtx;

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: true })!;
    if (!gl) throw new Error("WebGL2 not available");

    // Compile shaders
    const vert = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vert, SPRITE_VERT);
    gl.compileShader(vert);
    if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vert)!);

    const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(frag, SPRITE_FRAG);
    gl.compileShader(frag);
    if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(frag)!);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)!);
    gl.useProgram(prog);

    const aPosLoc = gl.getAttribLocation(prog, "aPos");
    const aColLoc = gl.getAttribLocation(prog, "aCol");
    const aUVLoc = gl.getAttribLocation(prog, "aUV");
    const aNormLoc = gl.getAttribLocation(prog, "aNorm");
    const uTransform = gl.getUniformLocation(prog, "uTransform")!;
    const uDiffuse = gl.getUniformLocation(prog, "uDiffuse")!;
    const uHasTexture = gl.getUniformLocation(prog, "uHasTexture")!;

    gl.enableVertexAttribArray(aPosLoc);
    gl.enableVertexAttribArray(aColLoc);
    gl.enableVertexAttribArray(aUVLoc);
    gl.enableVertexAttribArray(aNormLoc);

    cachedSpriteCtx = { canvas, gl, program: prog, uTransform, uDiffuse, uHasTexture, aPosLoc, aColLoc, aUVLoc, aNormLoc };
    return cachedSpriteCtx;
}

export async function renderToSprite(
    renderFuncs: RenderFunc[],
    scale: number,
    angle: "front" | "side",
    options?: { skipTextures?: boolean }
): Promise<MeshSprite | null> {
    const size = Math.max(64, Math.round(512 * scale));
    const floatsPerVert = 11; // 3 pos + 3 col + 2 uv + 3 norm

    try {
        // Collect mesh data from all render funcs
        let meshes: { buf: Float32Array, indices: Uint32Array, texData: ImageData | null }[] = [];
        let max = [-Infinity, -Infinity, -Infinity];
        let min = [Infinity, Infinity, Infinity];

        for (const rf of renderFuncs) {
            const progmeta = getProgramMeta(rf.program);

            const posLocation = progmeta.aPos?.location ?? 0;
            const posAttr = rf.vertexArray.attributes[posLocation];
            if (!posAttr || !posAttr.enabled || posAttr.vectorlength < 2) continue;

            const [posView, posLen, posStride] = getAttributeView(posAttr);

            // Read vertex colors
            const colorAttr = progmeta.aColor
                ? rf.vertexArray.attributes[progmeta.aColor.location]
                : null;

            let colorView: ArrayLike<number> | null = null;
            let colorLen = 0;
            let colorStride = 0;

            if (colorAttr && colorAttr.enabled) {
                const cv = getAttributeView(colorAttr);
                colorView = cv[0];
                colorLen = cv[1];
                colorStride = cv[2];
            }

            const colorIsFloat = colorAttr ? (colorAttr.scalartype === 0x1406) : false; // GL_FLOAT

            // Read texture UVs
            const uvAttr = progmeta.aTexUV
                ? rf.vertexArray.attributes[progmeta.aTexUV.location]
                : null;
            let uvView: ArrayLike<number> | null = null;
            let uvLen = 0;
            let uvStride = 0;
            if (uvAttr && uvAttr.enabled) {
                const uv = getAttributeView(uvAttr);
                uvView = uv[0];
                uvLen = uv[1];
                uvStride = uv[2];
            }

            // Read normals
            const normAttr = progmeta.aNormal
                ? rf.vertexArray.attributes[progmeta.aNormal.location]
                : null;
            let normView: ArrayLike<number> | null = null;
            let normLen = 0;
            let normStride = 0;
            if (normAttr && normAttr.enabled) {
                const nv = getAttributeView(normAttr);
                normView = nv[0];
                normLen = nv[1];
                normStride = nv[2];
            }
            const normIsFloat = normAttr ? (normAttr.scalartype === 0x1406) : false;

            // Build interleaved buffer: [x, y, z, r, g, b, u, v, nx, ny, nz] per vertex
            const buf = new Float32Array(floatsPerVert * posLen);
            for (let i = 0; i < posLen; i++) {
                const base = i * floatsPerVert;
                const px = posView[i * posStride + 0] || 0;
                const py = posView[i * posStride + 1] || 0;
                const pz = posAttr.vectorlength >= 3 ? (posView[i * posStride + 2] || 0) : 0;

                buf[base + 0] = px;
                buf[base + 1] = py;
                buf[base + 2] = pz;

                if (colorView && i < colorLen) {
                    const cr = colorView[i * colorStride + 0] || 0;
                    const cg = colorView[i * colorStride + 1] || 0;
                    const cb = colorView[i * colorStride + 2] || 0;
                    const colorScale = colorIsFloat ? 1 : 1 / 255;
                    buf[base + 3] = cr * colorScale;
                    buf[base + 4] = cg * colorScale;
                    buf[base + 5] = cb * colorScale;
                } else {
                    buf[base + 3] = 0.7;
                    buf[base + 4] = 0.7;
                    buf[base + 5] = 0.7;
                }

                // UVs
                if (uvView && i < uvLen) {
                    buf[base + 6] = uvView[i * uvStride + 0] || 0;
                    buf[base + 7] = uvView[i * uvStride + 1] || 0;
                } else {
                    buf[base + 6] = 0;
                    buf[base + 7] = 0;
                }

                // Normals
                if (normView && i < normLen) {
                    const nx = normView[i * normStride + 0] || 0;
                    const ny = normView[i * normStride + 1] || 0;
                    const nz = normStride >= 3 ? (normView[i * normStride + 2] || 0) : 0;
                    const normScale = normIsFloat ? 1 : 1 / 128; // int8 normals: -128 to 127
                    buf[base + 8] = nx * normScale;
                    buf[base + 9] = ny * normScale;
                    buf[base + 10] = nz * normScale;
                } else {
                    buf[base + 8] = 0;
                    buf[base + 9] = 0;
                    buf[base + 10] = 0;
                }

                max[0] = Math.max(max[0], px);
                max[1] = Math.max(max[1], py);
                max[2] = Math.max(max[2], pz);
                min[0] = Math.min(min[0], px);
                min[1] = Math.min(min[1], py);
                min[2] = Math.min(min[2], pz);
            }

            // Read indices (or generate sequential for non-indexed draws)
            let indices: Uint32Array;
            if (rf.vertexArray.indexBuffer.length > 0) {
                const rawIndices = readIndices(rf.vertexArray.indexBuffer, rf.render.indexType);
                indices = new Uint32Array(rawIndices);
            } else {
                // Non-indexed: generate sequential indices
                indices = new Uint32Array(posLen);
                for (let i = 0; i < posLen; i++) indices[i] = i;
            }

            // Capture diffuse texture if available (skip when opted out for performance)
            let texData: ImageData | null = null;
            if (!options?.skipTextures) {
                const samplerKeys = Object.keys(rf.render.samplers).map(Number);
                if (samplerKeys.length > 0 && uvView) {
                    try {
                        const sampler = rf.render.samplers[samplerKeys[0]];
                        if (sampler && sampler.canCapture()) {
                            texData = sampler.capture(0, 0, sampler.width, sampler.height);
                        }
                    } catch (e) {
                        // Texture capture failed, render without
                    }
                }
            }

            meshes.push({ buf, indices, texData });
        }

        if (meshes.length === 0) return null;

        // Compute bounding box dimensions
        const xsize = Math.max(1, max[0] - min[0]);
        const ysize = Math.max(1, max[1] - min[1]);
        const zsize = Math.max(1, max[2] - min[2]);

        // Center of bounding box
        const cx = (min[0] + max[0]) / 2;
        const cy = (min[1] + max[1]) / 2;
        const cz = (min[2] + max[2]) / 2;

        const padding = 1.1; // 10% margin
        const width = size;
        const height = size;
        let viewMatrix: Float32Array;

        if (angle === "front") {
            // Front view: X->screenX, Y->screenY (flipped), Z->depth
            const scale = 2.0 / (Math.max(xsize, ysize) * padding);
            const depthScale = 1.0 / Math.max(zsize, 1);
            viewMatrix = Float32Array.from([
                scale,  0,       0,           -cx * scale,
                0,      -scale,  0,            cy * scale,
                0,      0,       depthScale,  -cz * depthScale,
                0,      0,       0,            1
            ]);
        } else {
            // Side view: Z->screenX, Y->screenY (flipped), X->depth
            const scale = 2.0 / (Math.max(zsize, ysize) * padding);
            const depthScale = 1.0 / Math.max(xsize, 1);
            viewMatrix = Float32Array.from([
                0,          0,       scale,      -cz * scale,
                0,          -scale,  0,           cy * scale,
                depthScale, 0,       0,          -cx * depthScale,
                0,          0,       0,           1
            ]);
        }

        // Get WebGL context
        const { canvas, gl, program, uTransform, uDiffuse, uHasTexture, aPosLoc, aColLoc, aUVLoc, aNormLoc } = getSpriteGl();

        canvas.width = width;
        canvas.height = height;

        // Re-bind GL state after canvas resize (resize resets all WebGL state)
        gl.useProgram(program);
        gl.enableVertexAttribArray(aPosLoc);
        gl.enableVertexAttribArray(aColLoc);
        gl.enableVertexAttribArray(aUVLoc);
        gl.enableVertexAttribArray(aNormLoc);

        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.disable(gl.CULL_FACE);

        gl.uniformMatrix4fv(uTransform, true, viewMatrix);

        // Draw each mesh
        for (const mesh of meshes) {
            const indexBuf = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

            const attrBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, attrBuf);
            gl.bufferData(gl.ARRAY_BUFFER, mesh.buf, gl.STATIC_DRAW);

            const bytesPerVertex = floatsPerVert * 4; // 11 floats * 4 bytes
            gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, bytesPerVertex, 0);
            gl.vertexAttribPointer(aColLoc, 3, gl.FLOAT, false, bytesPerVertex, 3 * 4);
            gl.vertexAttribPointer(aUVLoc, 2, gl.FLOAT, false, bytesPerVertex, 6 * 4);
            gl.vertexAttribPointer(aNormLoc, 3, gl.FLOAT, false, bytesPerVertex, 8 * 4);

            // Handle texture
            let glTex: WebGLTexture | null = null;
            if (mesh.texData) {
                glTex = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, glTex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mesh.texData);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.uniform1i(uDiffuse, 0);
                gl.uniform1i(uHasTexture, 1);
            } else {
                gl.uniform1i(uHasTexture, 0);
            }

            gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_INT, 0);

            // Cleanup
            if (glTex) gl.deleteTexture(glTex);
            gl.deleteBuffer(attrBuf);
            gl.deleteBuffer(indexBuf);
        }

        // Read pixels back
        const imageData = new ImageData(width, height);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data, 0);

        return {
            imageData,
            width,
            height,
            close() { /* nothing to clean up - context is cached */ }
        };
    } catch (e) {
        console.warn("[renderToSprite] WebGL render failed:", e);
        return null;
    }
}
