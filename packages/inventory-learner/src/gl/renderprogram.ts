
import * as patchrs from './patchrs_napi';
import { vartypeMeta, vartypes } from './avautils';
import { CrcBuilder } from './crc32';

var cachedPrograms = new WeakMap<patchrs.GlProgram, ProgramMeta>();
var vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];

export type RenderFunc = ReturnType<typeof getRenderFunc>;
export type ProgramMeta = ReturnType<typeof fetchProgramMeta>;

export function getProgramMeta(prog: patchrs.GlProgram) {
	if (cachedPrograms.has(prog)) {
		return cachedPrograms.get(prog)!;
	}
	var r = fetchProgramMeta(prog);
	cachedPrograms.set(prog, r);
	return r;
}

function fetchProgramMeta(prog: patchrs.GlProgram) {
	var fragdefines: string[] = [];
	var vertdefines: string[] = [];
	var reg = /^#define\s+(\w+)\s*$/gm;
	let m: RegExpExecArray | null;
	while (m = reg.exec(prog.fragmentShader.source)) { fragdefines.push(m[1]); }
	while (m = reg.exec(prog.vertexShader.source)) { vertdefines.push(m[1]); }
	let isTinted = !!prog.fragmentShader.source.match(/\bgl_FragColor\s*=\s*uTint\b/);
	let isUiScaler = !!prog.fragmentShader.source.match(/\bLanczosShaderConsts\b/);

	let uTint = prog.uniforms.find(q => q.name == "uTint");
	let uHighlightScale = prog.uniforms.find(q => q.name == "uHighlightScale");
	let uBoneTransforms = prog.uniforms.find(q => q.name == "uBoneTransforms[0]");
	let uViewMatrix = prog.uniforms.find(q => q.name == "uViewMatrix");
	let uProjectionMatrix = prog.uniforms.find(q => q.name == "uProjectionMatrix");
	let uSrcUVRegion = prog.uniforms.find(q => q.name == "uSrcUVRegion");
	let uColourRemapWeightings = prog.uniforms.find(q => q.name == "uColourRemapWeightings");

	let aTexUV = prog.inputs.find(q => q.name == "aTextureUV");
	let aVertexNormal = prog.inputs.find(q => q.name == "aVertexNormal_BatchFlags");
	let aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
	let aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");

	let aVertexPosition2D = prog.inputs.find(q => q.name == "aVertexPosition2D");
	let aPos = prog.inputs.find(i => vertexPosAliases.indexOf(i.name) != -1);

	let isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");
	let isShadowRender = vertdefines.includes("MODEL_GEOMETRY_SHADOW_VS");

	return {
		uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
		uBones: uBoneTransforms,
		uTint: uTint,
		uHighlightScale: uHighlightScale,
		uViewMatrix: uViewMatrix,
		uProjectionMatrix: uProjectionMatrix,

		aPos: aPos,
		aColor: prog.inputs.find(q => q.name == "aVertexColour"),
		aTexUV: aTexUV,
		aTexMetaLookup: prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY_TilePositionXZ"),
		aBones: prog.inputs.find(q => q.name == "aVertexPosition_BoneLabel"),
		aSkinbones: prog.inputs.find(q => q.name == "aVertexSkinBones"),
		aVertexNormal_BatchFlags: aVertexNormal,
		aParticleSize: aParticleSize,

		isPostProcess: !!uColourRemapWeightings,
		isCompute: prog.computeShader.source.length != 0,
		isFloor: !!aMaterialSettingsSlotXY3,
		isFloorWater: !!aPos && aPos.name == "aWaterPosition_Depth",
		isAnimated: !!uBoneTransforms,
		isUi: !!aVertexPosition2D,
		isUiScaler: isUiScaler,
		isUiGameCopy: !!uSrcUVRegion,
		isParticles: !!aParticleSize,
		isLighted,
		isShadowRender,
		isTinted,
		isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,

		raw: prog,
		fragdefines,
		vertdefines,
		flags: {
			vertexcolor: fragdefines.includes("VERTEX_COLOUR"),
			texalpha: fragdefines.includes("TEXTURE_ALPHA_USAGE"),
			alpha: fragdefines.includes("ALPHA_ENABLED"),
			forceOpaque: fragdefines.includes("FORCE_OPAQUE"),
			albedoTexture: !!aTexUV,
			//TODO rt7 materials
			metalTexture: false,
			roughnessTexture: false
		}
	}
}

export function getRenderFunc(json: patchrs.RenderInvocation) {
	var program = getProgramMeta(json.program);
	var uniforms = decodeUniformBuffer(json.uniformState, program)

	var ntriangles = 0;
	for (let a = 0; a < json.renderRanges.length; a++) {
		if (json.renderMode == "triangles") { ntriangles += json.renderRanges[a].length / 3; }
		else { ntriangles += json.renderRanges[a].length - 2; }
	}
	var indices = new Uint32Array(ntriangles * 3);
	var nvertices = json.vertexArray.attributes[0].buffer.byteLength / json.vertexArray.attributes[0].stride;

	if (!json.vertexArray.indexBuffer || json.vertexArray.indexBuffer.byteLength == 0) {
		var id = 0;
		var offset = 0;
		//TODO don't know length in this mode, currently not working
		for (let a = 0; a < json.renderRanges.length; a++) {
			for (let b = 0; b < json.renderRanges[a].length;) {
				if (json.renderMode == "strips" && b != 0) { id -= 2; b -= 2; }
				indices[offset++] = id++;
				indices[offset++] = id++;
				indices[offset++] = id++;
				b += 3;
			}
		}
	}
	else {
		//convert and normalize vertex attributes
		var buf = json.vertexArray.indexBuffer;
		var indextype = vartypes[json.indexType as keyof typeof vartypes];
		var bufview = new indextype.constr!(buf.buffer, buf.byteOffset, buf.byteLength / indextype.size);
		var indexsize = indextype.size;
		var c = 0;
		for (let a = 0; a < json.renderRanges.length; a++) {
			let b = 0;
			let ptr = json.renderRanges[a].start / indexsize;
			while (b < json.renderRanges[a].length) {
				if (json.renderMode == "strips" && b != 0) { b -= 2; }
				indices[c++] = bufview[ptr + b++];
				indices[c++] = bufview[ptr + b++];
				indices[c++] = bufview[ptr + b++];
			}
		}
	}

	var getters: { [varname: string]: (i: number, vi: number) => number } = {};
	for (var a in program.raw.inputs) {
		var proginp = program.raw.inputs[a];
		var inp = json.vertexArray.attributes[proginp.location];
		if (inp) {
			// TODO this would be way more efficient with getAttributeView
			let buf = new DataView(inp.buffer.buffer, inp.buffer.byteOffset, inp.buffer.byteLength);
			var type = vartypes[inp.scalartype as keyof typeof vartypes];
			getters[proginp.name] = (function (inp: patchrs.RenderInput, buf: DataView, type: vartypeMeta) {
				return function (i: number, vi: number) {
					if (vi < inp.vectorlength) { return buf[type.readfn](inp.offset + i * inp.stride + vi * type.size, true); }
					return (vi == 3 ? 1 : 1);
				}
			})(inp, buf, type);
		} else {
			getters[proginp.name] = () => 0;
		}
	}

	var keyframes = [{ time: 0, uniforms }];

	var utexatlasmeta = program.raw.uniforms.find(u => u.name == "uTextureAtlasSettings");
	var utexatlas = program.raw.uniforms.find(u => u.name == "uTextureAtlas");

	var texture: { atlas: patchrs.TextureSnapshot, atlasmeta: patchrs.TextureSnapshot } | null = null;
	if (utexatlasmeta && utexatlas) {
		let atlas = json.samplers[uniforms[utexatlas.name][0][0]];
		let atlasmeta = json.samplers[uniforms[utexatlasmeta.name][0][0]];

		if (atlas && atlasmeta) {
			texture = { atlas, atlasmeta };
		}
	}

	return { uniforms, nvertices, raw: json, indices, getters, progmeta: program, keyframes, texture };
}

export function decodeUniformBuffer(snap: Uint8Array, program: ProgramMeta) {
	var uniforms: { [name: string]: number[][] } = {};
	for (let uni of program.raw.uniforms) {
		if (!uni.snapshotTracked) { continue; }
		uniforms[uni.name] = getUniformValue(snap, uni);
	}
	return uniforms;
}

export function getUniformValue(snap: Uint8Array, uni: patchrs.GlUniformMeta) {
	var t = vartypes[uni.type.scalarType];
	var v: number[][] = [];
	var unireader = new DataView(snap.buffer, snap.byteOffset, snap.byteLength);
	for (let a = 0; a < uni.length; a++) {
		var sub: number[] = [];
		v.push(sub);
		for (let b = 0; b < uni.type.vectorLength; b++) {
			sub.push(unireader[t.readfn](uni.snapshotOffset + uni.type.vectorLength * uni.type.scalarSize * a + uni.type.scalarSize * b, true));
		}
	}
	return v;
}
