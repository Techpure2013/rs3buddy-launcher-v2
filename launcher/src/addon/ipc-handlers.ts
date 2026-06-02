/**
 * IPC Handlers - Registers all alt1gl:* ipcMain.handle() channels.
 *
 * These handlers bridge isolated renderer windows to the native addon
 * in the main process. Each handler validates the sender, delegates to
 * the addon, serializes results with handle references, and returns
 * structured-clone-compatible data.
 */

import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { getIpcMain, getScreen } from '../electron';
import { addonManager } from './addon-manager';
import { HandleType, IpcChannels, ALLOWED_HANDLE_METHODS } from './types';
import type { HandleInvokeRequest } from './types';
import {
  serializeTrackedTexture,
  serializeTextureSnapshot,
  serializeVertexArraySnapshot,
  serializeGlProgram,
  serializeRenderInvocation,
  serializeRenderInvocationForStream,
  serializeGlOverlay,
  serializeGlState,
  createRenderSerializationCache,
} from './serializers';
import { StreamRegistry } from './stream-registry';
import { CallbackRegistry } from './callback-registry';
import {
  FrameCache,
  isCacheable,
  getSerializedResultCacheKey,
} from './frame-cache';
import type {
  RecordRenderOptions,
  RenderFilter,
  GlAttributeArgument,
  GlUniformArgument,
  RenderInput,
  GlOverlayOption,
} from '../inject';

let streamRegistry: StreamRegistry;
let callbackRegistry: CallbackRegistry;
const stateSubscribers = new Map<number, WebContents>();

/** Get the addon or throw a consistent error */
function requireAddon() {
  const addon = addonManager.getAddon();
  if (!addon) throw new Error('Native addon not loaded');
  return addon;
}

/** Get the handle store */
function getStore() {
  return addonManager.getHandleStore();
}

/** Get the sender's webContentsId */
function ownerId(event: IpcMainInvokeEvent): number {
  return event.sender.id;
}

/**
 * Register all alt1gl:* IPC handlers.
 * Call once after app is ready and addon is initialized.
 */
export function registerAddonIpcHandlers(): void {
  const ipcMain = getIpcMain();
  streamRegistry = new StreamRegistry();
  callbackRegistry = new CallbackRegistry();

  // ==========================================
  // Root addon methods
  // ==========================================

  ipcMain.handle(IpcChannels.ROOT_CAPTURE, async (event: IpcMainInvokeEvent, texid: number, x: number, y: number, w: number, h: number) => {
    const addon = requireAddon();
    const img = await addon.capture(texid, x, y, w, h);
    if (!img || !img.width || !img.height) return null;
    // ImageData transfers via structured clone (Uint8ClampedArray + width + height)
    return { width: img.width, height: img.height, data: img.data };
  });

  ipcMain.handle(IpcChannels.ROOT_GET_RENDERER, (_event: IpcMainInvokeEvent) => {
    const addon = requireAddon();
    return addon.getRenderer();
  });

  ipcMain.handle(IpcChannels.ROOT_GET_OPENGL_STATE, async (event: IpcMainInvokeEvent) => {
    const addon = requireAddon();
    const state = await addon.getOpenGlState();
    return serializeGlState(state, getStore(), ownerId(event));
  });

  ipcMain.handle(IpcChannels.ROOT_GET_GL_LOG_TOGGLES, (_event: IpcMainInvokeEvent) => {
    const addon = requireAddon();
    return addon.getGlLogToggles();
  });

  ipcMain.handle(IpcChannels.ROOT_SET_GL_LOG_TOGGLES, (_event: IpcMainInvokeEvent, arr: Uint8Array) => {
    const addon = requireAddon();
    addon.setGlLogToggles(arr);
  });

  // ==========================================
  // GL Recording
  // ==========================================

  // --- Frame Cache ---
  // All frame cache logic (caching, TTL, timeout, generation tracking) is
  // extracted into frame-cache.ts for testability. See that module for details.
  const frameCache = new FrameCache();

  function getOwnerSerializationCache(owner: number): ReturnType<typeof createRenderSerializationCache> {
    return frameCache.getOwnerSerializationCache(owner, createRenderSerializationCache);
  }

  /** Adapter: wraps FrameCache.getOrCreateCapture with addon call + old-capture disposal */
  function getOrCreateCapture(requestedFeatures: string[]): { promise: Promise<any[]>; hit: boolean } {
    const addon = requireAddon();
    const allFeatures = [...frameCache.knownFeatures, ...requestedFeatures];
    // Deduplicate — knownFeatures grows over time
    const captureFeatures = [...new Set(allFeatures)];

    return frameCache.getOrCreateCapture(
      requestedFeatures,
      () => addon.recordRenderCalls({ maxframes: 1, features: captureFeatures } as any),
      (oldPromise) => {
        // Dispose old cached renders to free DLL shared memory
        oldPromise.then((oldRenders: any[]) => {
          for (const r of oldRenders) {
            try { if (typeof r?.dispose === 'function') r.dispose(); } catch (_) {}
          }
        }).catch(() => {});
      },
    );
  }

  /** Serialize render results for a specific request, applying JS-side filters.
   *  When a renderCache is provided, programs/textures/snapshots are deduplicated
   *  across calls (critical for frame cache: prevents duplicate handles for the
   *  same native objects, which caused use-after-dispose on auto-expire). */
  function filterAndSerialize(
    renders: any[],
    options: RecordRenderOptions & { skipHandles?: boolean; hasInput?: string } | undefined,
    owner: number,
    programCache?: Map<number, any>,
    renderCache?: ReturnType<typeof createRenderSerializationCache>,
  ): any[] {
    // Apply DLL-side filters in JS (the cached capture has no filters)
    let filtered = renders;
    if (options) {
      if (options.programId !== undefined) {
        filtered = filtered.filter((r: any) => r.program?.programId === options.programId);
      }
      if (options.vertexObjectId !== undefined) {
        filtered = filtered.filter((r: any) => r.vertexObjectId === options.vertexObjectId);
      }
      if (options.framebufferId !== undefined) {
        filtered = filtered.filter((r: any) => (r.framebufferId ?? 0) === options.framebufferId);
      }
      if (options.framebufferTexture !== undefined) {
        filtered = filtered.filter((r: any) => (r.framebufferColorTextureId ?? 0) === options.framebufferTexture);
      }
      // Filter by program input name — dramatically reduces serialization for
      // callers that only need floor renders (~50-100 vs ~1400 total)
      if (options.hasInput) {
        const inputName = options.hasInput;
        filtered = filtered.filter((r: any) => r.program?.inputs?.some((i: any) => i.name === inputName));
      }
    }

    const store = getStore();
    if (options?.skipHandles) {
      const cache = programCache ?? new Map<number, any>();
      const results: any[] = [];
      for (const r of filtered) {
        try { results.push(serializeRenderInvocationForStream(r, store, owner, cache)); }
        catch { /* skip */ }
      }
      return results;
    }
    const cache = renderCache ?? createRenderSerializationCache();
    const results: any[] = [];
    for (const r of filtered) {
      try { results.push(serializeRenderInvocation(r, store, owner, cache)); }
      catch { /* skip */ }
    }
    return results;
  }

  // Diagnostic logging toggle — set via alt1gl:debug:setRecordLog IPC
  // Disabled by default; per-call logs drown out health checks.
  // Enable via: alt1gl.debug.setRecordLog(true) in renderer console
  let recordCallLog = false;

  // Recording throttle — the DLL needs 2-5s to GC after a full recording
  // (texturesnapshot+vertexarray+uniforms creates 500-900MB of DLL-internal
  // objects). Without throttling, the app hammers 20-46 failed 0-render calls
  // between each successful recording. This wastes CPU and can prevent the
  // DLL's GC from running (it runs during frameSwap, but recording requests
  // may preempt it).
  //
  // Strategy: after a successful DIRECT recording with heavy features,
  // suppress additional DIRECT calls for a brief interval. Return the
  // LAST successful result during this window (stale by 1-2 frames).
  let consecutiveZeroRenders = 0;
  let lastZeroRenderLog = 0;
  let lastDirectResult: any[] | null = null;
  let lastDirectResultTime = 0;
  let lastDirectResultOwner = 0;
  const DIRECT_THROTTLE_MS = 2000; // 2s — matches DLL GC cycle observed in memprobe

  // Periodic memory probe — runs every 5s to track shared memory trajectory.
  // This is lightweight (no recording, just reads DLL stats).
  let memProbeInterval: ReturnType<typeof setInterval> | null = null;
  let memProbeStartedAt = 0;
  function startMemoryProbe() {
    if (memProbeInterval) return;
    memProbeStartedAt = Date.now();
    memProbeInterval = setInterval(() => {
      try {
        const addon = addonManager.getAddon();
        if (!addon) return;
        const mem = addon.debug?.memoryState?.();
        const objStats = addon.debug?.getGlObjectStats?.();
        const handleStats = getStore().stats();
        const streamCount = streamRegistry?.count() ?? 0;
        const elapsed = ((Date.now() - memProbeStartedAt) / 1000).toFixed(0);
        const freeMB = mem ? (mem.free / 1024 / 1024).toFixed(1) : '?';
        const totalMB = mem ? (mem.size / 1024 / 1024).toFixed(0) : '?';
        console.log(`[IPC:memprobe] t+${elapsed}s | sharedMem: ${freeMB}MB free / ${totalMB}MB | allocs=${mem?.allocs ?? '?'} | zeroStreak=${consecutiveZeroRenders}`);
        if (objStats) {
          const subsizes = Object.fromEntries(
            Object.entries(objStats.subsizes || {}).map(([k, v]) => [k, ((v as number) / 1024 / 1024).toFixed(1) + 'MB'])
          );
          console.log(`  glObjs: count=${objStats.count}, size=${(objStats.size / 1024 / 1024).toFixed(1)}MB | ${JSON.stringify(objStats.counts)} | ${JSON.stringify(subsizes)}`);
        }
        console.log(`  handles: ${JSON.stringify(handleStats)} | streams: ${streamCount}`);
      } catch (e: any) {
        console.log(`[IPC:memprobe] ERROR: ${e.message}`);
      }
    }, 5000);
  }
  function stopMemoryProbe() {
    if (memProbeInterval) {
      clearInterval(memProbeInterval);
      memProbeInterval = null;
    }
  }

  ipcMain.handle(IpcChannels.GL_RECORD_RENDER_CALLS, async (event: IpcMainInvokeEvent, options?: RecordRenderOptions & { skipHandles?: boolean; hasInput?: string }) => {
    const owner = ownerId(event);
    const t0 = performance.now();
    const log = recordCallLog;

    // Non-cacheable calls (multi-frame, timeout, texturecapture) go direct
    if (!isCacheable(options)) {
      // DIRECT throttle: after a successful recording, the DLL needs 2-5s to
      // GC its internal objects (VAS: 300-470MB, buffers: 140MB). During this
      // window, return the last successful result instead of hammering the DLL
      // with calls that will return 0 renders. This dramatically reduces the
      // 20-46 wasted 0-render calls between each successful recording.
      const now = performance.now();
      if (lastDirectResult && lastDirectResultOwner === owner &&
          now - lastDirectResultTime < DIRECT_THROTTLE_MS) {
        console.log(`[IPC:recordRenderCalls] DIRECT throttled — returning cached ${lastDirectResult!.length} renders (age=${(now - lastDirectResultTime).toFixed(0)}ms)`);
        return lastDirectResult;
      }

      const addon = requireAddon();

      // Dispose previous DIRECT call's handles for this owner BEFORE creating
      // new ones. In the old direct-addon architecture, JS GC freed native
      // objects within ~1s. The handle store's TTL kept them alive for 15s,
      // causing ~90k objects to accumulate in shared memory (3 calls/sec ×
      // 2000 renders × 15s). This explicit cleanup mimics the old GC behavior.
      const store = getStore();
      store.disposeByType(owner, HandleType.RenderInvocation);
      store.disposeByType(owner, HandleType.TextureSnapshot);
      // Dispose only TRANSIENT VAS (from previous recordRenderCalls captures).
      // Non-transient VAS (from createVertexArray for overlays) are left intact.
      // Without this, VAS objects accumulate at ~47MB/sec and fill 512MB shared
      // memory in ~10 seconds, crashing the DLL.
      store.disposeTransientByType(owner, HandleType.VertexArraySnapshot);

      // Strip framebufferId from DLL options — apply it in JS instead.
      // The DLL's native framebufferId filter returns 0 renders when RS3 uses
      // UI scaling (all draws go to a sub-framebuffer, not framebuffer 0).
      // framebufferTexture is kept — it's a DLL-native feature for targeting
      // specific texture-backed framebuffers.
      let dllOptions = options;
      if (options?.framebufferId !== undefined) {
        const { framebufferId: _stripped, ...rest } = options;
        dllOptions = rest as typeof options;
      }

      // Keep maxframes as-is (default 1). maxframes:2 was tried but DOUBLES
      // frozen buffer creation (copy-on-write) in the DLL, which fills shared
      // memory faster and triggers CAPTURE_MIN_FREE sooner — causing the very
      // 0-render problem it was meant to fix.

      const t1 = performance.now();
      const renders = await addon.recordRenderCalls(dllOptions);
      const t2 = performance.now();
      const rawCount = renders?.length ?? 0;
      if (rawCount === 0) {
        consecutiveZeroRenders++;
        const now = Date.now();
        // Log first 5 zero-render events, then every 10s
        if (consecutiveZeroRenders <= 5 || now - lastZeroRenderLog > 10000) {
          lastZeroRenderLog = now;
          const mem = addon.debug?.memoryState?.();
          const freeMB = mem ? (mem.free / 1024 / 1024).toFixed(1) : '?';
          console.log(`[IPC:recordRenderCalls] DIRECT 0 renders (#${consecutiveZeroRenders}) | freeMem=${freeMB}MB | dllOptions: ${JSON.stringify(dllOptions)}`);
        }
        startMemoryProbe();
      } else {
        if (consecutiveZeroRenders > 0) {
          console.log(`[IPC:recordRenderCalls] DIRECT recovered after ${consecutiveZeroRenders} zero-render calls — got ${rawCount} renders`);
          stopMemoryProbe();
        }
        consecutiveZeroRenders = 0;
      }
      if (log) {
        console.log(`[IPC:recordRenderCalls] DIRECT path | ${rawCount} renders in ${(t2 - t1).toFixed(1)}ms`);
      }
      // filterAndSerialize applies framebufferId filter in JS (line ~241)
      const result = filterAndSerialize(renders, options, owner);

      // CRITICAL: Free native shared memory for ALL raw RenderInvocations.
      // The DLL creates ~1400 RenderInvocations per frame in shared memory.
      // Serialization already extracted all data into plain JS objects.
      // Sub-objects (VAS, textures) are separate allocations with their own
      // handles — disposing the RenderInvocation doesn't affect them.
      // Without this, shared memory fills at ~47MB/sec and crashes the DLL.
      for (const r of renders) {
        try { if (typeof r?.dispose === 'function') r.dispose(); } catch (_) {}
      }

      // Immediately dispose transient VAS handles created during serialization.
      // VAS has ZERO allowed handle methods — apps never call methods on them.
      // The serializer already extracted all vertex data into the serialized
      // result. Keeping them alive wastes ~251MB of shared memory until the
      // next recording call's disposeTransientByType. Free it NOW.
      store.disposeTransientByType(owner, HandleType.VertexArraySnapshot);

      // Cache successful DIRECT result for throttle window.
      // During the DLL's 2-5s GC cycle, subsequent calls return 0 renders.
      // Serving this cached result avoids 20-46 wasted 0-render calls.
      if (result.length > 0) {
        lastDirectResult = result;
        lastDirectResultTime = performance.now();
        lastDirectResultOwner = owner;
      }

      return result;
    }

    // Cacheable: use frame cache + serialized result cache.
    const requestedFeatures = options?.features || [];
    const { promise, hit } = getOrCreateCapture(requestedFeatures);
    const t1 = performance.now();
    const renders = await promise;
    const t2 = performance.now();

    const rawCount = renders?.length ?? 0;
    if (rawCount === 0) {
      consecutiveZeroRenders++;
      const now = Date.now();
      if (consecutiveZeroRenders <= 5 || now - lastZeroRenderLog > 10000) {
        lastZeroRenderLog = now;
        const addon = requireAddon();
        const mem = addon.debug?.memoryState?.();
        const freeMB = mem ? (mem.free / 1024 / 1024).toFixed(1) : '?';
        console.log(`[IPC:recordRenderCalls] CACHE 0 renders (#${consecutiveZeroRenders}, ${hit ? 'HIT' : 'MISS'}) | freeMem=${freeMB}MB`);
      }
      startMemoryProbe();
    } else {
      if (consecutiveZeroRenders > 0) {
        console.log(`[IPC:recordRenderCalls] CACHE recovered after ${consecutiveZeroRenders} zero-render calls — got ${rawCount} renders`);
        stopMemoryProbe();
      }
      consecutiveZeroRenders = 0;
    }
    if (log) {
      console.log(`[IPC:recordRenderCalls] CACHE path (${hit ? 'HIT' : 'MISS'}, gen=${frameCache.generation}) | ${rawCount} renders | wait: ${(t2 - t1).toFixed(1)}ms`);
    }

    const resultKey = getSerializedResultCacheKey(frameCache.generation, owner, options);
    const cachedResult = frameCache.getSerializedResult(resultKey);
    if (cachedResult) {
      if (log) console.log(`[IPC:recordRenderCalls]   serialized cache HIT: ${cachedResult.length} results | total: ${(performance.now() - t0).toFixed(1)}ms`);
      return cachedResult;
    }

    const ownerCache = getOwnerSerializationCache(owner);
    const result = filterAndSerialize(renders, options, owner, undefined, ownerCache);
    const t3 = performance.now();
    if (log) {
      console.log(`[IPC:recordRenderCalls]   filterAndSerialize: ${result.length}/${renders?.length ?? 0} results (${(t3 - t2).toFixed(1)}ms) | hasInput=${options?.hasInput ?? 'none'} | total: ${(t3 - t0).toFixed(1)}ms`);
    }
    frameCache.setSerializedResult(resultKey, result);
    return result;
  });

  // ==========================================
  // Diagnostic: end-to-end recordRenderCalls test
  // ==========================================

  ipcMain.handle('alt1gl:debug:testRecordRenderCalls', async () => {
    const report: string[] = [];
    const addon = requireAddon();
    report.push(`[DiagnosticTest] Starting end-to-end recordRenderCalls test`);

    // Helper: dispose all raw renders to free DLL shared memory
    function disposeRenders(renders: any[]) {
      if (!renders) return;
      for (const r of renders) {
        try { if (typeof r?.dispose === 'function') r.dispose(); } catch (_) {}
      }
    }

    // Test 1: Raw addon.recordRenderCalls with minimal options (no features = no frozen buffers)
    try {
      const t0 = performance.now();
      const renders = await addon.recordRenderCalls({ maxframes: 1, features: [] });
      const t1 = performance.now();
      report.push(`[Test1] addon.recordRenderCalls({maxframes:1, features:[]}) => ${renders?.length ?? 'null'} renders in ${(t1 - t0).toFixed(1)}ms`);
      if (renders && renders.length > 0) {
        const r = renders[0];
        report.push(`  sample[0]: programId=${r?.program?.programId}, vertexObjectId=${r?.vertexObjectId}, inputCount=${r?.program?.inputs?.length ?? '?'}`);
        if (r?.program?.inputs?.length > 0) {
          report.push(`  inputs: [${r.program.inputs.slice(0, 5).map((i: any) => i.name).join(', ')}]`);
        }
      }
      disposeRenders(renders);
    } catch (e: any) {
      report.push(`[Test1] ERROR: ${e?.message ?? e}`);
    }

    // Test 2: With uniforms feature (creates frozen buffers — only run if Test 1 succeeded)
    try {
      const t0 = performance.now();
      const renders = await addon.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
      const t1 = performance.now();
      report.push(`[Test2] addon.recordRenderCalls({maxframes:1, features:['uniforms']}) => ${renders?.length ?? 'null'} renders in ${(t1 - t0).toFixed(1)}ms`);

      // Count floor programs
      let floorCount = 0;
      if (renders) {
        for (const r of renders) {
          if (r?.program?.inputs?.some?.((i: any) => i.name === 'aMaterialSettingsSlotXY3')) {
            floorCount++;
          }
        }
      }
      report.push(`  floor renders (aMaterialSettingsSlotXY3): ${floorCount}`);
      disposeRenders(renders);
    } catch (e: any) {
      report.push(`[Test2] ERROR: ${e?.message ?? e}`);
    }

    // Test 3: Serialization test — serialize one render to check for errors
    try {
      const renders = await addon.recordRenderCalls({ maxframes: 1, features: ['uniforms'] });
      if (renders && renders.length > 0) {
        const store = getStore();
        let serializeOk = 0, serializeFail = 0;
        const errors: string[] = [];
        for (const r of renders.slice(0, 10)) {
          try {
            serializeRenderInvocation(r, store, 0, createRenderSerializationCache());
            serializeOk++;
          } catch (e: any) {
            serializeFail++;
            if (errors.length < 3) errors.push(e?.message ?? String(e));
          }
        }
        report.push(`[Test3] Serialization: ${serializeOk} ok, ${serializeFail} failed (of ${Math.min(renders.length, 10)} tested)`);
        if (errors.length > 0) report.push(`  errors: ${errors.join(' | ')}`);
      } else {
        report.push(`[Test3] Skipped — no renders to serialize`);
      }
      disposeRenders(renders);
    } catch (e: any) {
      report.push(`[Test3] ERROR: ${e?.message ?? e}`);
    }

    // Test 4: Frame cache state
    const diag = frameCache.diagnosticState();
    report.push(`[Test4] Frame cache: gen=${diag.generation}, knownFeatures=${diag.knownFeatureCount}, hasPending=${diag.hasPending}, features=${diag.featureCount}`);

    // Test 5: getRenderer (sanity check)
    try {
      const renderer = addon.getRenderer();
      report.push(`[Test5] getRenderer: ${renderer ? `${renderer.glRenderer} / ${renderer.glVersion}` : 'null'}`);
    } catch (e: any) {
      report.push(`[Test5] ERROR: ${e?.message ?? e}`);
    }

    console.log(report.join('\n'));
    return report;
  });

  // ==========================================
  // Streaming
  // ==========================================

  ipcMain.handle(IpcChannels.STREAM_START, (event: IpcMainInvokeEvent, options: RecordRenderOptions) => {
    const addon = requireAddon();
    const streamId = streamRegistry.start(addon, options, event.sender, getStore());
    return { streamId };
  });

  ipcMain.handle(IpcChannels.STREAM_CLOSE, (event: IpcMainInvokeEvent, streamId: string) => {
    if (!streamRegistry.has(streamId, ownerId(event))) {
      throw new Error('Stream not found or not owned by this window');
    }
    streamRegistry.close(streamId);
  });

  // ==========================================
  // Overlay Creation
  // ==========================================

  ipcMain.handle(IpcChannels.OVERLAY_CREATE_PROGRAM, (
    event: IpcMainInvokeEvent,
    vertexShader: string,
    fragmentShader: string,
    inputs: GlAttributeArgument[],
    uniforms: GlUniformArgument[],
  ) => {
    const addon = requireAddon();
    const prog = addon.createProgram(vertexShader, fragmentShader, inputs, uniforms);
    return serializeGlProgram(prog, getStore(), ownerId(event));
  });

  ipcMain.handle(IpcChannels.OVERLAY_CREATE_VERTEX_ARRAY, (
    event: IpcMainInvokeEvent,
    indexBuffer: Uint8Array,
    inputs: RenderInput[],
  ) => {
    const addon = requireAddon();
    const vas = addon.createVertexArray(indexBuffer, inputs);
    return serializeVertexArraySnapshot(vas, getStore(), ownerId(event));
  });

  ipcMain.handle(IpcChannels.OVERLAY_CREATE_TEXTURE, (event: IpcMainInvokeEvent, imgData: { width: number; height: number; data: Uint8ClampedArray }) => {
    const addon = requireAddon();
    // Reconstruct ImageData from transferred components.
    // Cast needed: structured clone preserves Uint8ClampedArray but TS
    // sees ArrayBufferLike which includes SharedArrayBuffer.
    const img = new ImageData(
      new Uint8ClampedArray(imgData.data) as unknown as Uint8ClampedArray<ArrayBuffer>,
      imgData.width,
      imgData.height,
    );
    const tex = addon.createTexture(img);
    return serializeTrackedTexture(tex, getStore(), ownerId(event));
  });

  ipcMain.handle(IpcChannels.OVERLAY_BEGIN_OVERLAY, (
    event: IpcMainInvokeEvent,
    trigger: RenderFilter,
    progHandleId: string | undefined,
    vasHandleId: string | undefined,
    options: GlOverlayOption & { samplerHandleIds?: { [loc: number]: string } },
  ) => {
    const addon = requireAddon();
    const store = getStore();
    const owner = ownerId(event);

    // Resolve handle references back to native objects
    const prog = progHandleId
      ? store.get(progHandleId, HandleType.GlProgram, owner) as any
      : undefined;
    const vas = vasHandleId
      ? store.get(vasHandleId, HandleType.VertexArraySnapshot, owner) as any
      : undefined;

    // Resolve sampler handle IDs to native TrackedTexture objects
    if (options.samplerHandleIds) {
      const samplers: { [loc: number]: any } = {};
      for (const [loc, handleId] of Object.entries(options.samplerHandleIds)) {
        const tex = store.get(handleId, HandleType.TrackedTexture, owner);
        if (tex) samplers[Number(loc)] = tex;
      }
      options.samplers = samplers;
      delete options.samplerHandleIds;
    }

    const overlay = addon.beginOverlay(trigger, prog, vas, options);
    return serializeGlOverlay(overlay, store, owner);
  });

  // ==========================================
  // Synchronous Overlay Creation (sendSync)
  // ==========================================
  // Factory methods use sendSync so app code can call them synchronously
  // (zero breaking changes for developers). These are called once at setup,
  // not in render loops, so blocking briefly is acceptable.

  ipcMain.on('alt1gl:overlay:createProgramSync', (event, vertexShader: string, fragmentShader: string, inputs: GlAttributeArgument[], uniforms: GlUniformArgument[]) => {
    try {
      const addon = requireAddon();
      const prog = addon.createProgram(vertexShader, fragmentShader, inputs, uniforms);
      const result = { data: serializeGlProgram(prog, getStore(), event.sender.id) };
      event.returnValue = result;
    } catch (e: any) {
      event.returnValue = { error: e.message || 'Unknown error' };
    }
  });

  ipcMain.on('alt1gl:overlay:createVertexArraySync', (event, indexBuffer: Uint8Array, inputs: RenderInput[]) => {
    try {
      const addon = requireAddon();
      const vas = addon.createVertexArray(indexBuffer, inputs);
      const result = { data: serializeVertexArraySnapshot(vas, getStore(), event.sender.id) };
      event.returnValue = result;
    } catch (e: any) {
      event.returnValue = { error: e.message || 'Unknown error' };
    }
  });

  ipcMain.on('alt1gl:overlay:createTextureSync', (event, imgData: { width: number; height: number; data: Uint8ClampedArray }) => {
    try {
      const addon = requireAddon();
      if (!imgData || typeof imgData.width !== 'number' || typeof imgData.height !== 'number' || !imgData.data) {
        event.returnValue = { error: `Invalid texture data: width=${imgData?.width}, height=${imgData?.height}, hasData=${!!imgData?.data}` };
        return;
      }
      if (imgData.width <= 0 || imgData.height <= 0) {
        event.returnValue = { error: `Invalid texture dimensions: ${imgData.width}x${imgData.height}` };
        return;
      }
      const img = new ImageData(
        new Uint8ClampedArray(imgData.data) as unknown as Uint8ClampedArray<ArrayBuffer>,
        imgData.width,
        imgData.height,
      );
      const tex = addon.createTexture(img);
      const result = { data: serializeTrackedTexture(tex, getStore(), event.sender.id) };
      event.returnValue = result;
    } catch (e: any) {
      event.returnValue = { error: e.message || 'Unknown error' };
    }
  });

  ipcMain.on('alt1gl:overlay:beginOverlaySync', (event, trigger: RenderFilter, progHandleId: string | undefined, vasHandleId: string | undefined, options: GlOverlayOption & { samplerHandleIds?: { [loc: number]: string } }) => {
    try {
      const addon = requireAddon();
      const store = getStore();
      const owner = event.sender.id;

      const prog = progHandleId
        ? store.get(progHandleId, HandleType.GlProgram, owner) as any
        : undefined;
      const vas = vasHandleId
        ? store.get(vasHandleId, HandleType.VertexArraySnapshot, owner) as any
        : undefined;

      if (progHandleId && !prog) {
        console.warn(`[beginOverlay] Program handle ${progHandleId} NOT FOUND (owner=${owner}, storeSize=${store.count()})`);
      }
      if (vasHandleId && !vas) {
        console.warn(`[beginOverlay] VAS handle ${vasHandleId} NOT FOUND (owner=${owner}, storeSize=${store.count()})`);
      }

      if (options.samplerHandleIds) {
        const samplers: { [loc: number]: any } = {};
        for (const [loc, handleId] of Object.entries(options.samplerHandleIds)) {
          const tex = store.get(handleId, HandleType.TrackedTexture, owner);
          if (tex) samplers[Number(loc)] = tex;
        }
        options.samplers = samplers;
        delete options.samplerHandleIds;
      }

      const overlay = addon.beginOverlay(trigger, prog, vas, options);
      const result = { data: serializeGlOverlay(overlay, store, owner) };
      event.returnValue = result;
    } catch (e: any) {
      console.error(`[beginOverlay] FAILED:`, e);
      event.returnValue = { error: e.message || 'Unknown error' };
    }
  });

  // ==========================================
  // Handle Operations
  // ==========================================

  ipcMain.handle(IpcChannels.HANDLE_INVOKE, async (event: IpcMainInvokeEvent, request: HandleInvokeRequest) => {
    const store = getStore();
    const owner = ownerId(event);

    // Single Map lookup
    const entry = store.getEntry(request.handleId);
    if (!entry) throw new Error('Handle not found');
    if (entry.ownerId !== owner) throw new Error('Handle not owned by this window');

    // Set.has() — O(1) whitelist check
    const allowed = ALLOWED_HANDLE_METHODS[entry.type];
    if (!allowed.has(request.method)) {
      throw new Error(`Method '${request.method}' not allowed on ${HandleType[entry.type]}`);
    }

    const obj = entry.object as any;
    if (!obj || typeof obj[request.method] !== 'function') {
      throw new Error(`Method '${request.method}' not found on object`);
    }

    // Reset auto-expire timer only for types that auto-expire
    if (entry.expireTimer) {
      store.touch(request.handleId);
    }

    // Resolve handle references in args (e.g. changesSince(otherSnapshot))
    const resolvedArgs = request.args.map(arg => {
      if (arg && typeof arg === 'object' && (arg as any).__handleId) {
        const resolved = store.get((arg as any).__handleId, undefined, owner);
        if (resolved) return resolved;
      }
      return arg;
    });

    const result = obj[request.method](...resolvedArgs);

    // Handle async results
    const resolved = result instanceof Promise ? await result : result;

    // Serialize result if it's a native object
    return serializeHandleResult(resolved);
  });

  // ==========================================
  // Synchronous Handle Invocation (sendSync)
  // ==========================================
  // Used for hot-path TextureSnapshot/TrackedTexture/GlOverlay methods
  // that are called in tight synchronous loops (reflect2d sprite detection).
  // These native methods are already synchronous; sendSync preserves that.

  ipcMain.on('alt1gl:handle:invokeSync', (event, request: HandleInvokeRequest) => {
    try {
      const store = getStore();
      const owner = event.sender.id;

      // Single Map lookup — getEntry returns the full entry (hot-path optimization)
      const entry = store.getEntry(request.handleId);
      if (!entry) { event.returnValue = { error: 'Handle not found' }; return; }
      if (entry.ownerId !== owner) { event.returnValue = { error: 'Handle not owned by this window' }; return; }

      // Set.has() — O(1) instead of Array.includes() O(n)
      const allowed = ALLOWED_HANDLE_METHODS[entry.type];
      if (!allowed.has(request.method)) {
        event.returnValue = { error: `Method '${request.method}' not allowed on ${HandleType[entry.type]}` };
        return;
      }

      const obj = entry.object as any;
      if (!obj || typeof obj[request.method] !== 'function') {
        event.returnValue = { error: `Method '${request.method}' not found on object` };
        return;
      }

      // Inline touch: only reset timer for types that auto-expire (avoids extra Map.get)
      if (entry.expireTimer) {
        store.touch(request.handleId);
      }

      // Lazy arg resolution: only allocate new array if an arg has __handleId
      let resolvedArgs = request.args;
      for (let i = 0; i < request.args.length; i++) {
        const arg = request.args[i];
        if (arg && typeof arg === 'object' && (arg as any).__handleId) {
          if (resolvedArgs === request.args) resolvedArgs = [...request.args];
          resolvedArgs[i] = store.get((arg as any).__handleId, undefined, owner) ?? arg;
        }
      }

      const result = obj[request.method](...resolvedArgs);
      event.returnValue = { data: serializeHandleResult(result) };
    } catch (e: any) {
      event.returnValue = { error: e.message || 'Unknown error' };
    }
  });

  // ==========================================
  // Batch Synchronous Handle Invocation
  // ==========================================
  // Single IPC round-trip for N handle method calls. Critical for sprite
  // detection loops that call capture() 50-200 times per cycle.

  ipcMain.on('alt1gl:handle:batchInvokeSync', (event, requests: HandleInvokeRequest[]) => {
    const store = getStore();
    const owner = event.sender.id;
    const results: any[] = new Array(requests.length);

    // Cache: when many calls target the same handle (common for capture loops),
    // skip re-validating the same entry
    let lastHandleId = '';
    let lastEntry: any = null;
    let lastObj: any = null;

    for (let i = 0; i < requests.length; i++) {
      try {
        const req = requests[i];
        let entry, obj;

        if (req.handleId === lastHandleId) {
          // Same handle as last call — skip validation
          entry = lastEntry;
          obj = lastObj;
        } else {
          entry = store.getEntry(req.handleId);
          if (!entry || entry.ownerId !== owner) {
            results[i] = { error: 'Handle not found' };
            continue;
          }
          const allowed = ALLOWED_HANDLE_METHODS[entry.type];
          if (!allowed.has(req.method)) {
            results[i] = { error: 'Method not allowed' };
            continue;
          }
          obj = entry.object as any;
          if (!obj) {
            results[i] = { error: 'Object not found' };
            continue;
          }
          lastHandleId = req.handleId;
          lastEntry = entry;
          lastObj = obj;
        }

        // Lazy arg resolution
        let args = req.args;
        for (let j = 0; j < req.args.length; j++) {
          const arg = req.args[j];
          if (arg && typeof arg === 'object' && (arg as any).__handleId) {
            if (args === req.args) args = [...req.args];
            args[j] = store.get((arg as any).__handleId, undefined, owner) ?? arg;
          }
        }

        const result = obj[req.method](...args);
        results[i] = { data: serializeHandleResult(result) };
      } catch (e: any) {
        results[i] = { error: e.message || 'Unknown error' };
      }
    }

    event.returnValue = results;
  });

  ipcMain.handle(IpcChannels.HANDLE_DISPOSE, (event: IpcMainInvokeEvent, handleId: string) => {
    const store = getStore();
    // Silent no-op if handle already gone (auto-expired, already disposed, or wrong owner).
    // Callers often dispose in finally blocks where the handle may already be cleaned up.
    if (!store.has(handleId, ownerId(event))) return;
    store.dispose(handleId);
  });

  // ==========================================
  // Debug API
  // ==========================================

  ipcMain.handle(IpcChannels.DEBUG_GET_CWD, () => {
    return requireAddon().debug.getCurrentWorkingDirectory();
  });

  ipcMain.handle(IpcChannels.DEBUG_READ_DIR, (_event: IpcMainInvokeEvent, dir: string) => {
    return requireAddon().debug.readDirSync(dir);
  });

  ipcMain.handle(IpcChannels.DEBUG_READ_FILE, (_event: IpcMainInvokeEvent, file: string) => {
    return requireAddon().debug.readFileSync(file);
  });

  ipcMain.handle(IpcChannels.DEBUG_COPY_FILE, (_event: IpcMainInvokeEvent, from: string, to: string) => {
    return requireAddon().debug.copyFileSync(from, to);
  });

  ipcMain.handle(IpcChannels.DEBUG_STAT, (_event: IpcMainInvokeEvent, file: string) => {
    return requireAddon().debug.statSync(file);
  });

  ipcMain.handle(IpcChannels.DEBUG_GET_EXE_PIDS, (_event: IpcMainInvokeEvent, name: string, parent?: number) => {
    return requireAddon().debug.getExePids(name, parent);
  });

  ipcMain.handle(IpcChannels.DEBUG_INJECT_DLL, (_event: IpcMainInvokeEvent, pid: number, dllfile: string, memoryid?: number, instanceid?: number) => {
    return requireAddon().debug.injectDll(pid, dllfile, memoryid, instanceid);
  });

  ipcMain.handle(IpcChannels.DEBUG_CONNECT_OVERLAY, (_event: IpcMainInvokeEvent, pid: number) => {
    const addon = requireAddon();
    return addon.debug.connectToOverlay?.(Number(pid)) ?? null;
  });

  ipcMain.handle(IpcChannels.DEBUG_EXIT_DLL, () => {
    requireAddon().debug.exitDll();
  });

  ipcMain.handle(IpcChannels.DEBUG_GET_RS_HWND, () => {
    return requireAddon().debug.getRsHwnd();
  });

  ipcMain.handle(IpcChannels.DEBUG_MEMORY_STATE, () => {
    const mem = requireAddon().debug.memoryState();
    if (!mem) return null;
    return JSON.parse(JSON.stringify(mem));
  });

  ipcMain.handle('alt1gl:debug:handleStoreStats', () => {
    return getStore().stats();
  });

  ipcMain.handle('alt1gl:debug:disposeAllHandles', () => {
    return getStore().disposeAll();
  });

  ipcMain.handle(IpcChannels.DEBUG_GET_ALL_GL_OBJECTS, () => {
    const objs = requireAddon().debug.getAllGlObjects();
    // Deep-copy NAPI result to ensure structured clone compatibility
    return JSON.parse(JSON.stringify(objs));
  });

  ipcMain.handle(IpcChannels.DEBUG_GET_GL_OBJECT_STATS, () => {
    const stats = requireAddon().debug.getGlObjectStats();
    if (!stats) return null;
    // NAPI objects have non-enumerable properties that don't survive
    // structured clone or even spread. JSON roundtrip forces full serialization.
    return JSON.parse(JSON.stringify(stats));
  });

  ipcMain.handle('alt1gl:debug:getSharedMemorySizes', () => {
    const sizes = requireAddon().debug.getSharedMemorySizes();
    return Array.from(sizes || []);
  });

  ipcMain.handle(IpcChannels.DEBUG_RESET_OPENGL_STATE, async () => {
    return requireAddon().debug.resetOpenGlState();
  });

  ipcMain.handle(IpcChannels.DEBUG_KILL_MEMORY_SESSION, async () => {
    return requireAddon().debug.killMemorySession();
  });

  ipcMain.handle(IpcChannels.DEBUG_SET_LOG_CB, (event: IpcMainInvokeEvent, enable: boolean) => {
    const addon = requireAddon();
    if (enable) {
      callbackRegistry.subscribeDebugLog(event.sender, addon);
    } else {
      callbackRegistry.unsubscribeDebugLog(ownerId(event), addon);
    }
  });

  // ==========================================
  // GL Log Callback
  // ==========================================

  // Subscribing to GL log is done via the set-gl-log-toggles + a subscribe channel
  ipcMain.handle('alt1gl:callback:subscribeGlLog', (event: IpcMainInvokeEvent) => {
    callbackRegistry.subscribeGlLog(event.sender, requireAddon());
  });

  ipcMain.handle('alt1gl:callback:unsubscribeGlLog', (event: IpcMainInvokeEvent) => {
    callbackRegistry.unsubscribeGlLog(ownerId(event), requireAddon());
  });

  // ==========================================
  // Mouse Position
  // ==========================================

  ipcMain.handle(IpcChannels.MOUSE_GET_POSITION, () => {
    try {
      const point = getScreen().getCursorScreenPoint();
      return { x: point.x, y: point.y };
    } catch {
      return null;
    }
  });

  // ==========================================
  // State Push Subscription
  // ==========================================

  // Windows subscribe to receive 10Hz cached RS state updates.
  // The preload caches these locally for synchronous getRsReady/X/Y/Width/Height.
  ipcMain.handle('alt1gl:state:subscribe', (event: IpcMainInvokeEvent) => {
    stateSubscribers.set(event.sender.id, event.sender);
    // Send current state immediately so the window doesn't start with stale zeros
    return addonManager.getCachedState();
  });

  ipcMain.handle('alt1gl:state:unsubscribe', (event: IpcMainInvokeEvent) => {
    stateSubscribers.delete(event.sender.id);
  });

  // Forward state updates to all subscribed windows
  addonManager.onStateUpdate((state) => {
    for (const [id, wc] of stateSubscribers) {
      if (wc.isDestroyed()) {
        stateSubscribers.delete(id);
        continue;
      }
      wc.send(IpcChannels.STATE_UPDATE, state);
    }
  });

  console.log('[IpcHandlers] All alt1gl:* handlers registered');
}

/**
 * Serialize a handle method invocation result.
 * Most methods return plain serializable data, but capture() returns ImageData
 * which needs manual serialization (not auto-cloneable across IPC).
 */
function serializeHandleResult(result: unknown): unknown {
  if (result == null || typeof result !== 'object') return result;

  // ImageData from capture(): duck-type check (width, height, Uint8ClampedArray data)
  const r = result as any;
  if (r.data instanceof Uint8ClampedArray && typeof r.width === 'number' && typeof r.height === 'number') {
    return { width: r.width, height: r.height, data: r.data };
  }

  return result;
}

/**
 * Clean up all IPC resources for a destroyed window.
 * Call from webContents 'destroyed' event handler.
 */
export function cleanupWindowIpc(webContentsId: number): void {
  // Remove from state push subscribers
  stateSubscribers.delete(webContentsId);

  const addon = addonManager.getAddon();

  // Close all streams owned by this window
  if (streamRegistry) {
    const closed = streamRegistry.closeForOwner(webContentsId);
    if (closed > 0) console.log(`[IpcHandlers] Closed ${closed} streams for window ${webContentsId}`);
  }

  // Unsubscribe from callbacks
  if (callbackRegistry && addon) {
    callbackRegistry.unsubscribeAll(webContentsId, addon);
  }

  // Dispose handles (done by AddonManager)
  addonManager.cleanupForWindow(webContentsId);
}

/**
 * Shut down all IPC resources. Call on app exit.
 */
export function shutdownAddonIpc(): void {
  if (streamRegistry) streamRegistry.closeAll();
  if (callbackRegistry) callbackRegistry.shutdown(addonManager.getAddon());
}

/** Get the stream registry (for testing or external access) */
export function getStreamRegistry(): StreamRegistry { return streamRegistry; }

/** Get the callback registry (for testing or external access) */
export function getCallbackRegistry(): CallbackRegistry { return callbackRegistry; }
