/**
 * Serializers - Convert live C++ NAPI objects to serializable plain objects.
 *
 * Each serializer extracts data properties from a native object, registers
 * it in the HandleStore, and returns a serialized form with handle references
 * that can cross the contextBridge via Electron IPC structured clone.
 */

import { HandleStore } from './handle-store';
import { HandleType } from './types';
import type {
  SerializedTrackedTexture,
  SerializedTextureSnapshot,
  SerializedVertexArraySnapshot,
  SerializedGlProgram,
  SerializedRenderInvocation,
  SerializedGlOverlay,
  SerializedStreamRenderObject,
  SerializedGlState,
} from './types';
import type {
  TrackedTexture,
  TextureSnapshot,
  VertexArraySnapshot,
  GlProgram,
  RenderInvocation,
  GlOverlay,
  StreamRenderObject,
  GlState,
} from '../inject';

/**
 * Serialize a TrackedTexture. Extracts data properties and registers a handle.
 */
export function serializeTrackedTexture(
  tex: TrackedTexture,
  store: HandleStore,
  ownerId: number,
  transient = false,
): SerializedTrackedTexture {
  const handleId = store.register(tex, HandleType.TrackedTexture, ownerId, transient);
  return {
    __handleId: handleId,
    __type: HandleType.TrackedTexture,
    width: tex.width,
    height: tex.height,
    texid: tex.texid,
    format: tex.format,
    formatid: tex.formatid,
  };
}

/**
 * Serialize a TextureSnapshot. Its `base` TrackedTexture also gets a handle.
 */
export function serializeTextureSnapshot(
  snap: TextureSnapshot,
  store: HandleStore,
  ownerId: number,
  transient = false,
): SerializedTextureSnapshot {
  const handleId = store.register(snap, HandleType.TextureSnapshot, ownerId, transient);
  return {
    __handleId: handleId,
    __type: HandleType.TextureSnapshot,
    width: snap.width,
    height: snap.height,
    texid: snap.texid,
    detached: snap.detached,
    base: snap.base
      ? serializeTrackedTexture(snap.base, store, ownerId, transient)
      : undefined as any,
  };
}

/**
 * Serialize a VertexArraySnapshot. Uint8Array buffers transfer via structured clone.
 */
export function serializeVertexArraySnapshot(
  vas: VertexArraySnapshot,
  store: HandleStore,
  ownerId: number,
  transient = false,
): SerializedVertexArraySnapshot {
  const handleId = store.register(vas, HandleType.VertexArraySnapshot, ownerId, transient);
  return {
    __handleId: handleId,
    __type: HandleType.VertexArraySnapshot,
    base: { skipmask: vas.base?.skipmask ?? 0 },
    indexBuffer: vas.indexBuffer,
    attributes: vas.attributes.map(attr => ({
      buffer: attr.buffer,
      enabled: attr.enabled,
      location: attr.location,
      offset: attr.offset,
      scalartype: attr.scalartype,
      stride: attr.stride,
      vectorlength: attr.vectorlength,
      normalized: attr.normalized,
    })),
  };
}

/**
 * Serialize a GlProgram. All fields are data-only, but the NAPI object
 * itself must be retained for native methods like beginOverlay.
 *
 * When skipHandle is true, no handle is registered (for stream data that
 * is read-only and never needs method calls via handleId).
 */
export function serializeGlProgram(
  prog: GlProgram,
  store: HandleStore,
  ownerId: number,
  transient = false,
  skipHandle = false,
): SerializedGlProgram {
  const handleId = skipHandle ? '' : store.register(prog, HandleType.GlProgram, ownerId, transient);
  return {
    __handleId: handleId,
    __type: HandleType.GlProgram,
    programId: prog.programId,
    vertexShader: { source: prog.vertexShader?.source ?? '', id: prog.vertexShader?.id ?? 0, type: prog.vertexShader?.type ?? 0 },
    fragmentShader: { source: prog.fragmentShader?.source ?? '', id: prog.fragmentShader?.id ?? 0, type: prog.fragmentShader?.type ?? 0 },
    computeShader: { source: prog.computeShader?.source ?? '', id: prog.computeShader?.id ?? 0, type: prog.computeShader?.type ?? 0 },
    uniforms: prog.uniforms.map(u => ({
      name: u.name,
      blockArraystride: u.blockArraystride,
      blockIndex: u.blockIndex,
      blockOffset: u.blockOffset,
      length: u.length,
      location: u.location,
      snapshotOffset: u.snapshotOffset,
      snapshotTracked: u.snapshotTracked,
      type: { type: u.type.type, known: u.type.known, scalarType: u.type.scalarType, scalarSize: u.type.scalarSize, vectorLength: u.type.vectorLength },
    })),
    uniformBufferSize: prog.uniformBufferSize,
    inputs: prog.inputs.map(i => ({
      name: i.name,
      length: i.length,
      location: i.location,
      type: { type: i.type.type, known: i.type.known, scalarType: i.type.scalarType, scalarSize: i.type.scalarSize, vectorLength: i.type.vectorLength },
    })),
    skipmask: prog.skipmask,
  };
}

/** Dedup caches for serializeRenderInvocation — avoids redundant UUID generation,
 *  shader string copies, and timer allocation when many renders share the same
 *  programs, textures, and vertex arrays. */
export interface RenderSerializationCache {
  programs: Map<number, SerializedGlProgram>;
  textures: Map<number, SerializedTrackedTexture>;
  snapshots: Map<number, SerializedTextureSnapshot>;
  vertexArrays: Map<number, SerializedVertexArraySnapshot>;
}

export function createRenderSerializationCache(): RenderSerializationCache {
  return { programs: new Map(), textures: new Map(), snapshots: new Map(), vertexArrays: new Map() };
}

function serializeTrackedTextureDedup(
  tex: TrackedTexture, store: HandleStore, ownerId: number,
  cache: RenderSerializationCache,
): SerializedTrackedTexture {
  let cached = cache.textures.get(tex.texid);
  if (cached) return cached;
  cached = serializeTrackedTexture(tex, store, ownerId, true);
  cache.textures.set(tex.texid, cached);
  return cached;
}

function serializeVertexArraySnapshotDedup(
  vas: VertexArraySnapshot,
  vertexObjectId: number,
  store: HandleStore,
  ownerId: number,
  cache: RenderSerializationCache,
): SerializedVertexArraySnapshot {
  let cached = cache.vertexArrays.get(vertexObjectId);
  if (cached) return cached;
  cached = serializeVertexArraySnapshot(vas, store, ownerId, true);
  cache.vertexArrays.set(vertexObjectId, cached);
  return cached;
}

function serializeTextureSnapshotDedup(
  snap: TextureSnapshot, store: HandleStore, ownerId: number,
  cache: RenderSerializationCache,
): SerializedTextureSnapshot {
  let cached = cache.snapshots.get(snap.texid);
  if (cached) return cached;
  const handleId = store.register(snap, HandleType.TextureSnapshot, ownerId, true);
  cached = {
    __handleId: handleId,
    __type: HandleType.TextureSnapshot,
    width: snap.width, height: snap.height, texid: snap.texid, detached: snap.detached,
    base: snap.base
      ? serializeTrackedTextureDedup(snap.base, store, ownerId, cache)
      : undefined as any,
  };
  cache.snapshots.set(snap.texid, cached);
  return cached;
}

/**
 * Serialize a RenderInvocation. Sub-objects (program, textures, vertex array)
 * each get their own handles for independent method calls.
 *
 * When a cache is provided, programs/textures/snapshots are deduplicated by ID.
 * This avoids redundant UUID generation, shader string copies, and setTimeout
 * timers when 100+ renders share the same few programs and textures.
 */
export function serializeRenderInvocation(
  inv: RenderInvocation,
  store: HandleStore,
  ownerId: number,
  cache?: RenderSerializationCache,
): SerializedRenderInvocation {
  const handleId = store.register(inv, HandleType.RenderInvocation, ownerId, true);

  // Serialize sampler TextureSnapshots (deduplicated if cache provided)
  const samplers: { [loc: number]: SerializedTextureSnapshot } = {};
  if (inv.samplers) {
    for (const loc of Object.keys(inv.samplers)) {
      const snap = inv.samplers[Number(loc)];
      if (snap) {
        samplers[Number(loc)] = cache
          ? serializeTextureSnapshotDedup(snap, store, ownerId, cache)
          : serializeTextureSnapshot(snap, store, ownerId, true);
      }
    }
  }

  // Serialize TrackedTextures (deduplicated if cache provided)
  const textures: { [loc: number]: SerializedTrackedTexture } = {};
  if (inv.textures) {
    for (const loc of Object.keys(inv.textures)) {
      const tex = inv.textures[Number(loc)];
      if (tex) {
        textures[Number(loc)] = cache
          ? serializeTrackedTextureDedup(tex, store, ownerId, cache)
          : serializeTrackedTexture(tex, store, ownerId, true);
      }
    }
  }

  // Serialize program (deduplicated if cache provided)
  let serializedProg: SerializedGlProgram | undefined;
  if (inv.program) {
    if (cache) {
      serializedProg = cache.programs.get(inv.program.programId);
      if (!serializedProg) {
        serializedProg = serializeGlProgram(inv.program, store, ownerId, true);
        cache.programs.set(inv.program.programId, serializedProg);
      }
    } else {
      serializedProg = serializeGlProgram(inv.program, store, ownerId, true);
    }
  }

  const vp = inv.viewport;

  return {
    __handleId: handleId,
    __type: HandleType.RenderInvocation,
    program: serializedProg as any,
    uniformState: inv.uniformState,
    samplers,
    textures,
    // NEVER deduplicate VertexArraySnapshots — RS3 reuses the same VAO across
    // draw calls but streams different vertex data between draws. The DLL
    // captures each snapshot independently, so each has unique buffer content.
    // Deduplicating by vertexObjectId served stale vertex data from the first
    // draw, losing later batches (e.g. VoS icon sprites in UI rendering).
    vertexArray: inv.vertexArray
      ? serializeVertexArraySnapshot(inv.vertexArray, store, ownerId, true)
      : undefined as any,
    renderRanges: (inv.renderRanges || []).map(r => ({ start: r.start, length: r.length })),
    renderMode: inv.renderMode,
    indexType: inv.indexType,
    vertexObjectId: inv.vertexObjectId,
    lastFrameTime: inv.lastFrameTime,
    ownFrameTime: inv.ownFrameTime,
    viewport: vp ? { x: vp.x, y: vp.y, width: vp.width, height: vp.height } : { x: 0, y: 0, width: 0, height: 0 },
    framebufferColorTexture: inv.framebufferColorTexture
      ? (cache ? serializeTrackedTextureDedup(inv.framebufferColorTexture, store, ownerId, cache)
               : serializeTrackedTexture(inv.framebufferColorTexture, store, ownerId, true))
      : undefined,
    framebufferColorTextureId: inv.framebufferColorTextureId ?? 0,
    framebufferDepthTexture: inv.framebufferDepthTexture
      ? (cache ? serializeTrackedTextureDedup(inv.framebufferDepthTexture, store, ownerId, cache)
               : serializeTrackedTexture(inv.framebufferDepthTexture, store, ownerId, true))
      : undefined,
    framebufferDepthTextureId: inv.framebufferDepthTextureId ?? 0,
    framebufferId: inv.framebufferId ?? 0,
    framenr: inv.framenr ?? 0,
    computeTextures: (inv.computeTextures || []).map(ct => ({
      index: ct.index, textureid: ct.textureid, access: ct.access, format: ct.format,
    })),
    computeBuffers: (inv.computeBuffers || []).map(cb => ({
      index: cb.index, bufferid: cb.bufferid,
    })),
  };
}

/**
 * Lightweight render serialization for stream callbacks.
 * - Skips handle registration (stream data is read-only, renderer never calls methods)
 * - Deduplicates programs by programId (structured clone shares object references)
 *
 * This avoids the per-callback cost of hundreds of crypto.randomUUID() calls,
 * setTimeout registrations, and redundant shader source strings in the IPC payload.
 */
export function serializeRenderInvocationForStream(
  inv: RenderInvocation,
  store: HandleStore,
  ownerId: number,
  programCache: Map<number, SerializedGlProgram>,
  registerSamplerHandles = false,
): SerializedRenderInvocation {
  // Serialize program with deduplication — same programId reuses the same object reference.
  // Electron's structured clone deduplicates shared references, so shader source strings
  // are only sent once per unique program instead of once per render.
  let serializedProg: SerializedGlProgram | undefined;
  if (inv.program) {
    const pid = inv.program.programId;
    serializedProg = programCache.get(pid);
    if (!serializedProg) {
      serializedProg = serializeGlProgram(inv.program, store, ownerId, true, true);
      programCache.set(pid, serializedProg);
    }
  }

  // Serialize samplers — with or without handle registration
  const samplers: { [loc: number]: SerializedTextureSnapshot } = {};
  if (inv.samplers) {
    for (const loc of Object.keys(inv.samplers)) {
      const snap = inv.samplers[Number(loc)];
      if (snap) {
        if (registerSamplerHandles) {
          samplers[Number(loc)] = serializeTextureSnapshot(snap, store, ownerId, true);
        } else {
          samplers[Number(loc)] = {
            __handleId: '', __type: HandleType.TextureSnapshot,
            width: snap.width, height: snap.height, texid: snap.texid, detached: snap.detached,
            base: snap.base ? {
              __handleId: '', __type: HandleType.TrackedTexture,
              width: snap.base.width, height: snap.base.height,
              texid: snap.base.texid, format: snap.base.format, formatid: snap.base.formatid,
            } : undefined as any,
          };
        }
      }
    }
  }

  const textures: { [loc: number]: SerializedTrackedTexture } = {};
  if (inv.textures) {
    for (const loc of Object.keys(inv.textures)) {
      const tex = inv.textures[Number(loc)];
      if (tex) {
        textures[Number(loc)] = {
          __handleId: '', __type: HandleType.TrackedTexture,
          width: tex.width, height: tex.height,
          texid: tex.texid, format: tex.format, formatid: tex.formatid,
        };
      }
    }
  }

  const vp = inv.viewport;

  return {
    __handleId: '',
    __type: HandleType.RenderInvocation,
    program: serializedProg as any,
    uniformState: inv.uniformState,
    samplers,
    textures,
    vertexArray: inv.vertexArray
      ? {
          __handleId: '', __type: HandleType.VertexArraySnapshot,
          base: { skipmask: inv.vertexArray.base?.skipmask ?? 0 },
          indexBuffer: inv.vertexArray.indexBuffer,
          attributes: inv.vertexArray.attributes.map(attr => ({
            buffer: attr.buffer, enabled: attr.enabled, location: attr.location,
            offset: attr.offset, scalartype: attr.scalartype, stride: attr.stride,
            vectorlength: attr.vectorlength, normalized: attr.normalized,
          })),
        }
      : undefined as any,
    renderRanges: (inv.renderRanges || []).map(r => ({ start: r.start, length: r.length })),
    renderMode: inv.renderMode,
    indexType: inv.indexType,
    vertexObjectId: inv.vertexObjectId,
    lastFrameTime: inv.lastFrameTime,
    ownFrameTime: inv.ownFrameTime,
    viewport: vp ? { x: vp.x, y: vp.y, width: vp.width, height: vp.height } : { x: 0, y: 0, width: 0, height: 0 },
    framebufferColorTexture: undefined,
    framebufferColorTextureId: inv.framebufferColorTextureId ?? 0,
    framebufferDepthTexture: undefined,
    framebufferDepthTextureId: inv.framebufferDepthTextureId ?? 0,
    framebufferId: inv.framebufferId ?? 0,
    framenr: inv.framenr ?? 0,
    computeTextures: (inv.computeTextures || []).map(ct => ({
      index: ct.index, textureid: ct.textureid, access: ct.access, format: ct.format,
    })),
    computeBuffers: (inv.computeBuffers || []).map(cb => ({
      index: cb.index, bufferid: cb.bufferid,
    })),
  };
}

/**
 * Serialize a GlOverlay (opaque handle - all interaction via IPC).
 */
export function serializeGlOverlay(
  overlay: GlOverlay,
  store: HandleStore,
  ownerId: number,
): SerializedGlOverlay {
  const handleId = store.register(overlay, HandleType.GlOverlay, ownerId);
  return {
    __handleId: handleId,
    __type: HandleType.GlOverlay,
  };
}

/**
 * Serialize a StreamRenderObject (opaque handle).
 */
export function serializeStreamRenderObject(
  stream: StreamRenderObject,
  store: HandleStore,
  ownerId: number,
): SerializedStreamRenderObject {
  const handleId = store.register(stream, HandleType.StreamRenderObject, ownerId);
  return {
    __handleId: handleId,
    __type: HandleType.StreamRenderObject,
  };
}

/**
 * Serialize the full OpenGL state. Programs are data-heavy but handle-backed;
 * textures are handle-backed with data properties.
 */
export function serializeGlState(
  state: GlState,
  store: HandleStore,
  ownerId: number,
): SerializedGlState {
  const programs: SerializedGlState['programs'] = {};
  for (const id of Object.keys(state.programs)) {
    programs[Number(id)] = serializeGlProgram(state.programs[Number(id)], store, ownerId, true);
  }

  const textures: SerializedGlState['textures'] = {};
  for (const id of Object.keys(state.textures)) {
    textures[Number(id)] = serializeTrackedTexture(state.textures[Number(id)], store, ownerId, true);
  }

  return { programs, textures };
}
