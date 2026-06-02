/**
 * Render program utilities for parsing shader metadata
 * Based on RS3QuestBuddyGL implementation
 */

import * as patchrs from './patchrs_napi';
import { vartypes } from './avautils';

// Cache by programId (number) instead of object reference.
// Post-contextIsolation, each IPC call returns a new JS object so WeakMap
// keys never match. programId is stable across calls for the same GL program.
const cachedPrograms = new Map<number, ProgramMeta>();
const vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];

export type ProgramMeta = ReturnType<typeof fetchProgramMeta>;

export function getProgramMeta(prog: patchrs.GlProgram) {
    const key = prog.programId;
    if (cachedPrograms.has(key)) {
        return cachedPrograms.get(key)!;
    }
    const r = fetchProgramMeta(prog);
    cachedPrograms.set(key, r);
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
    const aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
    const aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");

    const isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");

    return {
        uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
        uBones: uBoneTransforms,
        uTint: uTint,
        uViewMatrix: uViewMatrix,

        aPos: aPos,

        isFloor: !!aMaterialSettingsSlotXY3,
        isAnimated: !!uBoneTransforms,
        isUi: !!aVertexPosition2D,
        isParticles: !!aParticleSize,
        isLighted,
        isTinted,
        isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,

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
