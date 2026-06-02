/**
 * Isolated Preload Script - contextBridge based
 *
 * Exposes the Alt1GL API to renderer windows via IPC proxy.
 * Runs with contextIsolation: true and sandbox: true.
 * The native addon lives in the main process; this preload communicates
 * with it via ipcRenderer.invoke() and exposes a compatible API shape
 * through contextBridge.exposeInMainWorld().
 *
 * Sync methods (getRsReady, etc.) use cached values pushed at 10Hz.
 * Handle-backed methods (capture, dispose, etc.) are async.
 */

import { contextBridge, ipcRenderer, webFrame } from 'electron';

// ============================================
// 1. Cached RS Client State (10Hz sync)
// ============================================

let cachedState = { ready: 0, x: 0, y: 0, width: 0, height: 0, hwnd: 0 };

// Subscribe immediately - get current state and start receiving updates
ipcRenderer.invoke('alt1gl:state:subscribe').then(state => {
  if (state) cachedState = state;
}).catch(() => {
  // Addon may not be initialized yet
});

ipcRenderer.on('alt1gl:state:update', (_e, state) => {
  cachedState = state;
});

// ============================================
// 2. Handle Invocation Helpers
// ============================================

const INVOKE = 'alt1gl:handle:invoke';
const DISPOSE = 'alt1gl:handle:dispose';

function invokeHandle(handleId: string, method: string, args: unknown[] = []): Promise<unknown> {
  return ipcRenderer.invoke(INVOKE, { handleId, method, args });
}

/**
 * Synchronous handle method invocation via sendSync.
 * Used for hot-path TextureSnapshot/TrackedTexture/GlOverlay methods
 * called in tight synchronous loops (reflect2d sprite detection).
 */
function invokeHandleSync(handleId: string, method: string, args: unknown[] = []): unknown {
  const result = ipcRenderer.sendSync('alt1gl:handle:invokeSync', { handleId, method, args });
  if (result && result.error) throw new Error(result.error);
  return result?.data;
}

/** Reconstruct ImageData from IPC result { width, height, data } */
function toImageData(r: any): ImageData | null {
  if (!r || !r.data || !r.width || !r.height) return null;
  return new ImageData(new Uint8ClampedArray(r.data), r.width, r.height);
}

// ============================================
// 3. Handle Hydration Functions
// ============================================
// These convert serialized handle refs (data + __handleId) into
// proxy objects with methods that call IPC. contextBridge proxies
// the methods to the renderer world (Electron 28+).

function batchInvokeSync(requests: Array<{handleId: string, method: string, args: any[]}>): any[] {
  return ipcRenderer.sendSync('alt1gl:handle:batchInvokeSync', requests);
}

function hydrateTrackedTexture(s: any) {
  if (!s) return s;
  return {
    __handleId: s.__handleId,
    width: s.width,
    height: s.height,
    texid: s.texid,
    format: s.format,
    formatid: s.formatid,
    capture: (x: number, y: number, w: number, h: number) => {
      const r = invokeHandleSync(s.__handleId, 'capture', [x, y, w, h]);
      return toImageData(r) as ImageData;
    },
    batchCapture: (rects: Array<{x: number, y: number, w: number, h: number}>) => {
      const reqs = rects.map(r => ({ handleId: s.__handleId, method: 'capture', args: [r.x, r.y, r.w, r.h] }));
      const results = batchInvokeSync(reqs);
      return results.map((r: any) => r?.data ? toImageData(r.data) : null);
    },
    upload: (img: ImageData) =>
      invokeHandleSync(s.__handleId, 'upload', [{ width: img.width, height: img.height, data: img.data }]),
    getStaleRect: () => invokeHandleSync(s.__handleId, 'getStaleRect'),
    dispose: () => ipcRenderer.invoke(DISPOSE, s.__handleId),
  };
}

function hydrateTextureSnapshot(s: any) {
  if (!s) return s;
  return {
    __handleId: s.__handleId,
    width: s.width,
    height: s.height,
    texid: s.texid,
    detached: s.detached,
    base: hydrateTrackedTexture(s.base),
    capture: (x: number, y: number, w: number, h: number) => {
      const r = invokeHandleSync(s.__handleId, 'capture', [x, y, w, h]);
      return toImageData(r) as ImageData;
    },
    batchCapture: (rects: Array<{x: number, y: number, w: number, h: number}>) => {
      const reqs = rects.map(r => ({ handleId: s.__handleId, method: 'capture', args: [r.x, r.y, r.w, r.h] }));
      const results = batchInvokeSync(reqs);
      return results.map((r: any) => r?.data ? toImageData(r.data) : null);
    },
    captureInto: (img: ImageData, x: number, y: number, sx: number, sy: number, w: number, h: number) =>
      invokeHandleSync(s.__handleId, 'captureInto', [
        { width: img.width, height: img.height, data: img.data }, x, y, sx, sy, w, h,
      ]),
    changesSince: (oldSnap: any) =>
      invokeHandleSync(s.__handleId, 'changesSince', [oldSnap ? { __handleId: oldSnap.__handleId } : null]),
    isChild: (oldSnap: any) =>
      invokeHandleSync(s.__handleId, 'isChild', [oldSnap ? { __handleId: oldSnap.__handleId } : null]),
    canCapture: () => invokeHandleSync(s.__handleId, 'canCapture'),
    unref: () => invokeHandleSync(s.__handleId, 'unref'),
    ref: () => invokeHandleSync(s.__handleId, 'ref'),
    dispose: () => ipcRenderer.invoke(DISPOSE, s.__handleId),
  };
}

function hydrateVertexArraySnapshot(s: any) {
  if (!s) return s;
  return {
    __handleId: s.__handleId,
    base: s.base,
    indexBuffer: s.indexBuffer,
    attributes: s.attributes,
    dispose: () => ipcRenderer.invoke(DISPOSE, s.__handleId),
  };
}

function hydrateGlProgram(s: any) {
  if (!s) return s;
  // GlProgram is data-only (no methods), but keep __handleId for beginOverlay
  return {
    __handleId: s.__handleId,
    programId: s.programId,
    vertexShader: s.vertexShader,
    fragmentShader: s.fragmentShader,
    computeShader: s.computeShader,
    uniforms: s.uniforms,
    uniformBufferSize: s.uniformBufferSize,
    inputs: s.inputs,
    skipmask: s.skipmask,
    dispose: () => ipcRenderer.invoke(DISPOSE, s.__handleId),
  };
}

function hydrateRenderInvocation(s: any) {
  if (!s) return s;

  // Hydrate nested samplers (TextureSnapshot map)
  const samplers: any = {};
  if (s.samplers) {
    for (const loc of Object.keys(s.samplers)) {
      samplers[Number(loc)] = hydrateTextureSnapshot(s.samplers[Number(loc)]);
    }
  }

  // Hydrate nested textures (TrackedTexture map)
  const textures: any = {};
  if (s.textures) {
    for (const loc of Object.keys(s.textures)) {
      textures[Number(loc)] = hydrateTrackedTexture(s.textures[Number(loc)]);
    }
  }

  return {
    __handleId: s.__handleId,
    program: hydrateGlProgram(s.program),
    uniformState: s.uniformState,
    samplers,
    textures,
    vertexArray: hydrateVertexArraySnapshot(s.vertexArray),
    renderRanges: s.renderRanges,
    renderMode: s.renderMode,
    indexType: s.indexType,
    vertexObjectId: s.vertexObjectId,
    lastFrameTime: s.lastFrameTime,
    ownFrameTime: s.ownFrameTime,
    viewport: s.viewport,
    framebufferColorTexture: s.framebufferColorTexture
      ? hydrateTrackedTexture(s.framebufferColorTexture)
      : undefined,
    framebufferColorTextureId: s.framebufferColorTextureId,
    framebufferDepthTexture: s.framebufferDepthTexture
      ? hydrateTrackedTexture(s.framebufferDepthTexture)
      : undefined,
    framebufferDepthTextureId: s.framebufferDepthTextureId,
    framebufferId: s.framebufferId,
    framenr: s.framenr,
    computeTextures: s.computeTextures,
    computeBuffers: s.computeBuffers,
    dispose: () => ipcRenderer.invoke(DISPOSE, s.__handleId),
  };
}

function hydrateGlOverlay(s: any) {
  if (!s) return s;
  return {
    __handleId: s.__handleId,
    getUniformState: () => invokeHandleSync(s.__handleId, 'getUniformState'),
    setUniformState: (data: Uint8Array) => invokeHandleSync(s.__handleId, 'setUniformState', [data]),
    stop: () => invokeHandleSync(s.__handleId, 'stop'),
    dispose: () => ipcRenderer.invoke(DISPOSE, s.__handleId),
  };
}

function hydrateGlState(s: any) {
  if (!s) return s;
  const programs: any = {};
  for (const id of Object.keys(s.programs)) {
    programs[Number(id)] = hydrateGlProgram(s.programs[Number(id)]);
  }
  const textures: any = {};
  for (const id of Object.keys(s.textures)) {
    textures[Number(id)] = hydrateTrackedTexture(s.textures[Number(id)]);
  }
  return { programs, textures };
}

// ============================================
// 4. Stream Callback Proxying
// ============================================

const streamCallbacks = new Map<string, (renders: any[]) => void>();
const streamEndedCallbacks = new Map<string, () => void>();
const pendingStreamData = new Map<string, any[][]>();

ipcRenderer.on('alt1gl:callback:streamData', (_e, data: { streamId: string; renders: any[] }) => {
  const cb = streamCallbacks.get(data.streamId);
  if (cb) {
    cb(data.renders);
  } else {
    // Buffer data that arrives before callback is registered (race condition:
    // main process starts sending data before invoke() promise resolves)
    let pending = pendingStreamData.get(data.streamId);
    if (!pending) {
      pending = [];
      pendingStreamData.set(data.streamId, pending);
    }
    pending.push(data.renders);
  }
});

ipcRenderer.on('alt1gl:callback:streamEnded', (_e, data: { streamId: string }) => {
  streamCallbacks.delete(data.streamId);
  pendingStreamData.delete(data.streamId);
  const endCb = streamEndedCallbacks.get(data.streamId);
  if (endCb) {
    streamEndedCallbacks.delete(data.streamId);
    endCb();
  }
});

// ============================================
// 5. GL Log / Debug Log Callback Proxying
// ============================================

let glLogCallback: ((packet: any) => void) | null = null;

ipcRenderer.on('alt1gl:callback:glLog', (_e, packet: any) => {
  if (glLogCallback) glLogCallback(packet);
});

let debugLogCallback: ((message: string) => void) | null = null;

ipcRenderer.on('alt1gl:callback:debugLog', (_e, data: { message: string }) => {
  if (debugLogCallback) debugLogCallback(data.message);
});

// ============================================
// 6. Alt1GL Proxy API
// ============================================

const alt1glProxy = {
  // --- Cached sync values ---
  getRsReady: () => cachedState.ready,
  getRsX: () => cachedState.x,
  getRsY: () => cachedState.y,
  getRsWidth: () => cachedState.width,
  getRsHeight: () => cachedState.height,
  getRsHwnd: () => cachedState.hwnd,

  // --- Async root methods ---
  capture: async (texid: number, x: number, y: number, w: number, h: number) => {
    const r = await ipcRenderer.invoke('alt1gl:root:capture', texid, x, y, w, h);
    // Return raw {width, height, data} - NOT ImageData. contextBridge cannot
    // serialize ImageData across worlds. The renderer-world shim reconstructs it.
    if (!r || !r.width || !r.height) return null;
    return { width: r.width, height: r.height, data: r.data };
  },

  getRenderer: () => ipcRenderer.invoke('alt1gl:root:getRenderer'),

  getOpenGlState: async () => {
    return await ipcRenderer.invoke('alt1gl:root:getOpenGlState');
  },

  recordRenderCalls: async (options?: any) => {
    return (await ipcRenderer.invoke('alt1gl:gl:recordRenderCalls', options)) || [];
  },

  streamRenderCalls: (options: any, callback: (renders: any[]) => void) => {
    // Start stream via IPC, proxy callbacks
    let streamId: string | null = null;
    let ended = false;
    let resolveEnded: () => void;
    const endedPromise = new Promise<void>(resolve => { resolveEnded = resolve; });

    // Register callback BEFORE starting the stream to avoid race condition
    const startPromise = ipcRenderer.invoke('alt1gl:stream:start', options).then(result => {
      streamId = result.streamId;
      streamCallbacks.set(streamId!, callback);
      // Register ended callback so we know when the stream dies on the main side
      streamEndedCallbacks.set(streamId!, () => {
        ended = true;
        resolveEnded!();
      });
      // Flush any data that arrived before callback was registered
      const pending = pendingStreamData.get(streamId!);
      if (pending) {
        pendingStreamData.delete(streamId!);
        for (const renders of pending) {
          callback(renders);
        }
      }
      return result;
    }).catch(err => {
      console.error('[alt1gl] Stream start failed:', err);
      ended = true;
      resolveEnded!();
      throw err;
    });

    return {
      close: async () => {
        // Wait for stream to start before closing
        await startPromise.catch(() => {/* already ended */});
        if (streamId && !ended) {
          streamCallbacks.delete(streamId);
          streamEndedCallbacks.delete(streamId);
          pendingStreamData.delete(streamId);
          await ipcRenderer.invoke('alt1gl:stream:close', streamId);
          ended = true;
          resolveEnded!();
        }
      },
      ended: endedPromise,
    };
  },

  // --- GL Logging ---
  setGlLogCb: (cb: ((packet: any) => void) | null) => {
    glLogCallback = cb;
    if (cb) {
      ipcRenderer.invoke('alt1gl:callback:subscribeGlLog');
    } else {
      ipcRenderer.invoke('alt1gl:callback:unsubscribeGlLog');
    }
  },

  getGlLogToggles: () => ipcRenderer.invoke('alt1gl:root:getGlLogToggles'),
  setGlLogToggles: (arr: Uint8Array) => ipcRenderer.invoke('alt1gl:root:setGlLogToggles', arr),

  // --- Overlay / Creation (synchronous via sendSync) ---
  createProgram: (vertexShader: string, fragmentShader: string, inputs: any[], uniforms: any[]) => {
    const result = ipcRenderer.sendSync('alt1gl:overlay:createProgramSync', vertexShader, fragmentShader, inputs, uniforms);
    if (result && result.error) throw new Error(result.error);
    return hydrateGlProgram(result?.data);
  },

  createVertexArray: (indexBuffer: Uint8Array, inputs: any[]) => {
    const result = ipcRenderer.sendSync('alt1gl:overlay:createVertexArraySync', indexBuffer, inputs);
    if (result && result.error) throw new Error(result.error);
    return hydrateVertexArraySnapshot(result?.data);
  },

  createTexture: (img: ImageData) => {
    const result = ipcRenderer.sendSync('alt1gl:overlay:createTextureSync', {
      width: img.width, height: img.height, data: img.data,
    });
    if (result && result.error) throw new Error(result.error);
    return hydrateTrackedTexture(result?.data);
  },

  beginOverlay: (trigger: any, prog: any, vertexArray: any, options: any) => {
    // Pass handle IDs for prog and vertexArray so main process resolves them
    const progHandleId = prog?.__handleId;
    const vasHandleId = vertexArray?.__handleId;

    // Convert sampler TrackedTexture proxies to handle IDs
    const optsCopy = { ...options };
    if (options.samplers) {
      optsCopy.samplerHandleIds = {};
      for (const [loc, tex] of Object.entries(options.samplers)) {
        optsCopy.samplerHandleIds[loc] = (tex as any).__handleId;
      }
      delete optsCopy.samplers;
    }

    const result = ipcRenderer.sendSync('alt1gl:overlay:beginOverlaySync', trigger, progHandleId, vasHandleId, optsCopy);
    if (result && result.error) throw new Error(result.error);
    return hydrateGlOverlay(result?.data);
  },

  // --- Mouse Position ---
  getMousePosition: () => ipcRenderer.invoke('alt1gl:mouse:getPosition'),
  // Compatibility shim: some apps access overlay.getMousePosition
  overlay: {
    getMousePosition: () => ipcRenderer.invoke('alt1gl:mouse:getPosition'),
  },

  // --- Handle Bridge (for renderer-world shim) ---
  __invokeHandleSync: (handleId: string, method: string, args?: any[]) => {
    return invokeHandleSync(handleId, method, args || []);
  },
  __batchInvokeSync: (requests: Array<{handleId: string, method: string, args: any[]}>) => {
    const results = ipcRenderer.sendSync('alt1gl:handle:batchInvokeSync', requests);
    return results;
  },
  __disposeHandle: (handleId: string) => {
    return ipcRenderer.invoke(DISPOSE, handleId);
  },

  // --- Debug API ---
  debug: {
    getCurrentWorkingDirectory: () => ipcRenderer.invoke('alt1gl:debug:getCwd'),
    readDirSync: (dir: string) => ipcRenderer.invoke('alt1gl:debug:readDir', dir),
    readFileSync: (file: string) => ipcRenderer.invoke('alt1gl:debug:readFile', file),
    copyFileSync: (from: string, to: string) => ipcRenderer.invoke('alt1gl:debug:copyFile', from, to),
    statSync: (file: string) => ipcRenderer.invoke('alt1gl:debug:stat', file),
    getExePids: (name: string, parent?: number) => ipcRenderer.invoke('alt1gl:debug:getExePids', name, parent),
    injectDll: (pid: number, dllfile: string, memoryid?: number, instanceid?: number) =>
      ipcRenderer.invoke('alt1gl:debug:injectDll', pid, dllfile, memoryid, instanceid),
    connectToOverlay: (pid: number) => ipcRenderer.invoke('alt1gl:debug:connectOverlay', pid),
    exitDll: () => ipcRenderer.invoke('alt1gl:debug:exitDll'),
    getRsHwnd: () => ipcRenderer.invoke('alt1gl:debug:getRsHwnd'),
    memoryState: () => ipcRenderer.invoke('alt1gl:debug:memoryState'),
    handleStoreStats: () => ipcRenderer.invoke('alt1gl:debug:handleStoreStats'),
    disposeAllHandles: () => ipcRenderer.invoke('alt1gl:debug:disposeAllHandles'),
    getSharedMemorySizes: () => ipcRenderer.invoke('alt1gl:debug:getSharedMemorySizes'),
    getAllGlObjects: () => ipcRenderer.invoke('alt1gl:debug:getAllGlObjects'),
    getGlObjectStats: () => ipcRenderer.invoke('alt1gl:debug:getGlObjectStats'),
    resetOpenGlState: () => ipcRenderer.invoke('alt1gl:debug:resetOpenGlState'),
    killMemorySession: () => ipcRenderer.invoke('alt1gl:debug:killMemorySession'),
    testRecordRenderCalls: () => ipcRenderer.invoke('alt1gl:debug:testRecordRenderCalls'),
    setLogCb: (cb: ((message: string) => void) | null) => {
      debugLogCallback = cb;
      ipcRenderer.invoke('alt1gl:debug:setLogCb', !!cb);
    },
  },
};

// ============================================
// 7. App Window API (already IPC-based)
// ============================================

const appWindowApi = {
  close: () => ipcRenderer.send('app-window:close'),
  getTitle: () => ipcRenderer.invoke('app-window:get-title'),
  getGamePid: () => ipcRenderer.invoke('app-window:get-game-pid'),
  notifyDailyInfoChanged: () => ipcRenderer.send('invalidate-daily-info'),
  writeAppData: (appName: string, filename: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('app-data:write', appName, filename, data),
  readAppData: (appName: string, filename: string): Promise<string | null> =>
    ipcRenderer.invoke('app-data:read', appName, filename),
};

// ============================================
// 8. Hotkey API (already IPC-based)
// ============================================

const Modifiers = {
  None: 0x00, Ctrl: 0x01, Alt: 0x02, Shift: 0x04, Win: 0x08,
  CtrlAlt: 0x03, CtrlShift: 0x05, AltShift: 0x06, CtrlAltShift: 0x07,
} as const;

const Keys = {
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45,
  F: 0x46, G: 0x47, H: 0x48, I: 0x49, J: 0x4A,
  K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E, O: 0x4F,
  P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54,
  U: 0x55, V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,
  Num0: 0x30, Num1: 0x31, Num2: 0x32, Num3: 0x33, Num4: 0x34,
  Num5: 0x35, Num6: 0x36, Num7: 0x37, Num8: 0x38, Num9: 0x39,
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75,
  F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,
  Space: 0x20, Enter: 0x0D, Escape: 0x1B, Tab: 0x09,
  Backspace: 0x08, Delete: 0x2E, Insert: 0x2D,
  Home: 0x24, End: 0x23, PageUp: 0x21, PageDown: 0x22,
  Left: 0x25, Up: 0x26, Right: 0x27, Down: 0x28,
} as const;

const hotkeyCallbacks = new Map<number, (event: any) => void>();
const actionCallbacks = new Map<string, (event: any) => void>();

ipcRenderer.on('hotkey-pressed', (_event, data: { hotkeyId: number; action: string; accelerator: string }) => {
  const specificCb = hotkeyCallbacks.get(data.hotkeyId);
  if (specificCb) specificCb(data);
  const actionCb = actionCallbacks.get(data.action);
  if (actionCb) actionCb(data);
});

// Cache appId from main process (matches old preload behavior where appId was
// fetched internally, never passed by the app)
let cachedAppId = '';
async function getAppId(): Promise<string> {
  if (!cachedAppId) {
    cachedAppId = (await ipcRenderer.invoke('app-window:get-title') as string) || 'unknown-app';
  }
  return cachedAppId;
}

const hotkeyApi = {
  Modifiers,
  Keys,

  // Old signature: register(modifiers, keyCode, action, callback?)
  // App never passes appId — we fetch it internally.
  async register(modifiers: number, keyCode: number, action: string, callback?: (event: any) => void) {
    const appId = await getAppId();
    const result = await ipcRenderer.invoke('hotkey:registerWithConflictCheck', modifiers, keyCode, action, appId, false);
    if (result.success && callback && result.hotkeyId > 0) {
      hotkeyCallbacks.set(result.hotkeyId, callback);
    }
    return result;
  },

  // Old signature: registerAccelerator(accelerator, action, callback?)
  // Main process handler is 'hotkey:registerAccelerator' — returns hotkeyId (number)
  async registerAccelerator(accelerator: string, action: string, callback?: (event: any) => void) {
    const appId = await getAppId();
    const hotkeyId = await ipcRenderer.invoke('hotkey:registerAccelerator', accelerator, action, appId) as number;
    if (callback && hotkeyId > 0) {
      hotkeyCallbacks.set(hotkeyId, callback);
    }
    return hotkeyId;
  },

  async unregister(hotkeyId: number) {
    hotkeyCallbacks.delete(hotkeyId);
    return await ipcRenderer.invoke('hotkey:unregister', hotkeyId);
  },

  async unregisterByAction(action: string) {
    actionCallbacks.delete(action);
    // No direct handler — find hotkey by action and unregister by ID
    const appId = await getAppId();
    const all = await ipcRenderer.invoke('hotkey:getAll', appId) as any[];
    const match = all?.find((h: any) => h.action === action);
    if (match) {
      hotkeyCallbacks.delete(match.id);
      return await ipcRenderer.invoke('hotkey:unregister', match.id);
    }
    return false;
  },

  async unregisterAll() {
    const appId = await getAppId();
    hotkeyCallbacks.clear();
    return await ipcRenderer.invoke('hotkey:unregisterApp', appId);
  },

  onAction(action: string, callback: (event: any) => void) {
    actionCallbacks.set(action, callback);
  },

  async getRegistered() {
    const appId = await getAppId();
    return await ipcRenderer.invoke('hotkey:getAll', appId);
  },

  async isRegistered(action: string) {
    // No direct handler — check via getAll and filter
    const appId = await getAppId();
    const all = await ipcRenderer.invoke('hotkey:getAll', appId) as any[];
    return all?.some((h: any) => h.action === action) ?? false;
  },

  async getFocusState() {
    return await ipcRenderer.invoke('focus:getState');
  },

  async setGlobalOverride(allow: boolean) {
    return await ipcRenderer.invoke('focus:setGlobalOverride', allow);
  },
};

// ============================================
// 9. Expose via contextBridge
// ============================================

// Expose internal bridge as _alt1gl (frozen proxy). The renderer-world shim
// below creates the mutable window.alt1gl that apps actually use.
// We can't expose directly as 'alt1gl' because contextBridge freezes the
// object, making it impossible to wrap async methods that return objects
// needing method patching (Promise-resolved values are structured-cloned,
// stripping all functions from nested objects).
contextBridge.exposeInMainWorld('_alt1gl', alt1glProxy);
contextBridge.exposeInMainWorld('appWindowApi', appWindowApi);
contextBridge.exposeInMainWorld('alt1Hotkeys', hotkeyApi);

console.log('[PreloadIsolated] APIs exposed via contextBridge (_alt1gl bridge)');

// ============================================
// 10. Renderer-World Method Shim
// ============================================
// contextBridge exposes _alt1gl as a frozen proxy. Promise-resolved values
// are structured-cloned, stripping nested functions. This shim runs in the
// renderer's main world and creates window.alt1gl as a MUTABLE wrapper that
// patches async return values with handle-backed methods.

const RENDERER_SHIM = `
(function() {
  var _real = window._alt1gl;
  if (!_real) { console.error('[alt1gl-shim] _alt1gl bridge not found!'); return; }

  // --- ImageData reconstruction ---
  function toImageData(r) {
    if (!r || !r.data || !r.width || !r.height) return null;
    return new ImageData(new Uint8ClampedArray(r.data), r.width, r.height);
  }

  // --- Handle method patching for async return values ---
  function patchTrackedTexture(t) {
    if (!t || !t.__handleId || typeof t.capture === 'function') return t;
    t.capture = function(x, y, w, h) {
      return toImageData(_real.__invokeHandleSync(t.__handleId, 'capture', [x, y, w, h]));
    };
    t.batchCapture = function(rects) {
      var reqs = new Array(rects.length);
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        reqs[i] = { handleId: t.__handleId, method: 'capture', args: [r.x, r.y, r.w, r.h] };
      }
      var results = _real.__batchInvokeSync(reqs);
      var images = new Array(results.length);
      for (var j = 0; j < results.length; j++) {
        images[j] = results[j] && results[j].data ? toImageData(results[j].data) : null;
      }
      return images;
    };
    t.upload = function(img) {
      return _real.__invokeHandleSync(t.__handleId, 'upload', [
        { width: img.width, height: img.height, data: img.data }
      ]);
    };
    t.getStaleRect = function() {
      return _real.__invokeHandleSync(t.__handleId, 'getStaleRect');
    };
    return t;
  }

  function patchTextureSnapshot(s) {
    if (!s || !s.__handleId || typeof s.canCapture === 'function') return s;
    if (s.base) patchTrackedTexture(s.base);
    s.capture = function(x, y, w, h) {
      return toImageData(_real.__invokeHandleSync(s.__handleId, 'capture', [x, y, w, h]));
    };
    s.batchCapture = function(rects) {
      var reqs = new Array(rects.length);
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        reqs[i] = { handleId: s.__handleId, method: 'capture', args: [r.x, r.y, r.w, r.h] };
      }
      var results = _real.__batchInvokeSync(reqs);
      var images = new Array(results.length);
      for (var j = 0; j < results.length; j++) {
        images[j] = results[j] && results[j].data ? toImageData(results[j].data) : null;
      }
      return images;
    };
    s.captureInto = function(img, x, y, sx, sy, w, h) {
      return _real.__invokeHandleSync(s.__handleId, 'captureInto', [
        { width: img.width, height: img.height, data: img.data }, x, y, sx, sy, w, h
      ]);
    };
    s.changesSince = function(old) {
      return _real.__invokeHandleSync(s.__handleId, 'changesSince',
        [old && old.__handleId ? { __handleId: old.__handleId } : null]);
    };
    s.isChild = function(old) {
      return _real.__invokeHandleSync(s.__handleId, 'isChild',
        [old && old.__handleId ? { __handleId: old.__handleId } : null]);
    };
    s.canCapture = function() {
      return _real.__invokeHandleSync(s.__handleId, 'canCapture');
    };
    s.unref = function() { return _real.__invokeHandleSync(s.__handleId, 'unref'); };
    s.ref = function() { return _real.__invokeHandleSync(s.__handleId, 'ref'); };
    s.dispose = function() { return _real.__disposeHandle(s.__handleId); };
    return s;
  }

  function patchGlOverlay(o) {
    if (!o || !o.__handleId || typeof o.stop === 'function') return o;
    o.getUniformState = function() {
      return _real.__invokeHandleSync(o.__handleId, 'getUniformState');
    };
    o.setUniformState = function(data) {
      return _real.__invokeHandleSync(o.__handleId, 'setUniformState', [data]);
    };
    o.stop = function() {
      return _real.__invokeHandleSync(o.__handleId, 'stop');
    };
    return o;
  }

  function patchRender(r) {
    if (!r) return r;
    if (r.samplers) {
      for (var k in r.samplers) { patchTextureSnapshot(r.samplers[k]); }
    }
    if (r.textures) {
      for (var k in r.textures) { patchTrackedTexture(r.textures[k]); }
    }
    if (r.framebufferColorTexture) patchTrackedTexture(r.framebufferColorTexture);
    if (r.framebufferDepthTexture) patchTrackedTexture(r.framebufferDepthTexture);
    if (r.__handleId) r.dispose = function() { return _real.__disposeHandle(r.__handleId); };
    return r;
  }

  // --- Create mutable window.alt1gl wrapping frozen _alt1gl bridge ---
  var alt1 = {
    // Sync getters (cached state)
    getRsReady: function() { return _real.getRsReady(); },
    getRsX: function() { return _real.getRsX(); },
    getRsY: function() { return _real.getRsY(); },
    getRsWidth: function() { return _real.getRsWidth(); },
    getRsHeight: function() { return _real.getRsHeight(); },
    getRsHwnd: function() { return _real.getRsHwnd(); },

    // Capture returns raw {width, height, data} from preload; reconstruct ImageData here
    capture: async function(texid, x, y, w, h) {
      var r = await _real.capture(texid, x, y, w, h);
      return toImageData(r);
    },
    getRenderer: function() { return _real.getRenderer(); },

    // GL logging
    setGlLogCb: function(cb) { return _real.setGlLogCb(cb); },
    getGlLogToggles: function() { return _real.getGlLogToggles(); },
    setGlLogToggles: function(arr) { return _real.setGlLogToggles(arr); },

    // Sync overlay creation (contextBridge proxies sync return values properly,
    // but patch for safety in case nested functions are stripped)
    createProgram: function(vs, fs, inputs, uniforms) {
      return _real.createProgram(vs, fs, inputs, uniforms);
    },
    createVertexArray: function(ib, inputs) {
      return _real.createVertexArray(ib, inputs);
    },
    createTexture: function(img) {
      // Destructure ImageData before crossing contextBridge - ImageData objects
      // may not serialize properly (width/height are getter-only properties)
      var t = _real.createTexture({ width: img.width, height: img.height, data: img.data });
      return patchTrackedTexture(t);
    },
    beginOverlay: function(trigger, prog, va, options) {
      // Strip non-clonable properties (functions on patched objects) before
      // crossing contextBridge. The preload side only needs __handleId values.
      var cleanOpts = {};
      if (options) {
        for (var k in options) {
          if (k === 'samplers') {
            // Convert TrackedTexture objects (with methods) to plain handle IDs
            var samplerHandleIds = {};
            for (var loc in options.samplers) {
              var tex = options.samplers[loc];
              samplerHandleIds[loc] = tex && tex.__handleId ? tex.__handleId : tex;
            }
            cleanOpts.samplerHandleIds = samplerHandleIds;
          } else {
            cleanOpts[k] = options[k];
          }
        }
      }
      // Also strip methods from prog/va - only __handleId needed
      var cleanProg = prog && prog.__handleId ? { __handleId: prog.__handleId } : prog;
      var cleanVa = va && va.__handleId ? { __handleId: va.__handleId } : va;
      var o = _real.beginOverlay(trigger, cleanProg, cleanVa, cleanOpts);
      return patchGlOverlay(o);
    },

    // Mouse
    getMousePosition: function() { return _real.getMousePosition(); },
    overlay: { getMousePosition: function() { return _real.getMousePosition(); } },

    // Handle bridge (for direct handle method calls)
    __invokeHandleSync: function(hid, method, args) {
      return _real.__invokeHandleSync(hid, method, args);
    },
    __batchInvokeSync: function(requests) {
      return _real.__batchInvokeSync(requests);
    },
    __disposeHandle: function(hid) { return _real.__disposeHandle(hid); },

    // Debug API (forwarded)
    debug: {
      getCurrentWorkingDirectory: function() { return _real.debug.getCurrentWorkingDirectory(); },
      readDirSync: function(dir) { return _real.debug.readDirSync(dir); },
      readFileSync: function(file) { return _real.debug.readFileSync(file); },
      copyFileSync: function(from, to) { return _real.debug.copyFileSync(from, to); },
      statSync: function(file) { return _real.debug.statSync(file); },
      getExePids: function(name, parent) { return _real.debug.getExePids(name, parent); },
      injectDll: function(pid, dll, mem, inst) { return _real.debug.injectDll(pid, dll, mem, inst); },
      connectToOverlay: function(pid) { return _real.debug.connectToOverlay(pid); },
      exitDll: function() { return _real.debug.exitDll(); },
      getRsHwnd: function() { return _real.debug.getRsHwnd(); },
      memoryState: function() { return _real.debug.memoryState(); },
      handleStoreStats: function() { return _real.debug.handleStoreStats(); },
      disposeAllHandles: function() { return _real.debug.disposeAllHandles(); },
      getSharedMemorySizes: function() { return _real.debug.getSharedMemorySizes(); },
      getAllGlObjects: function() { return _real.debug.getAllGlObjects(); },
      getGlObjectStats: function() { return _real.debug.getGlObjectStats(); },
      resetOpenGlState: function() { return _real.debug.resetOpenGlState(); },
      killMemorySession: function() { return _real.debug.killMemorySession(); },
      testRecordRenderCalls: function() { return _real.debug.testRecordRenderCalls(); },
      setLogCb: function(cb) { return _real.debug.setLogCb(cb); },
    },

    // === PATCHED ASYNC METHODS (the whole reason for this shim) ===
    // Promise-resolved values are structured-cloned by contextBridge,
    // stripping all functions. We re-add them using __invokeHandleSync.

    recordRenderCalls: async function(options) {
      var renders = await _real.recordRenderCalls(options);
      if (renders) renders.forEach(patchRender);
      return renders;
    },

    getOpenGlState: async function() {
      var state = await _real.getOpenGlState();
      if (state && state.textures) {
        for (var k in state.textures) { patchTrackedTexture(state.textures[k]); }
      }
      return state;
    },

    streamRenderCalls: function(options, callback) {
      return _real.streamRenderCalls(options, function(renders) {
        if (renders) {
          // contextBridge freezes callback arguments — create mutable copies
          // using Object.assign (faster than for-in which walks prototype chain)
          var mutable = new Array(renders.length);
          for (var i = 0; i < renders.length; i++) {
            var r = renders[i];
            if (!r) { mutable[i] = r; continue; }
            var rc = Object.assign({}, r);
            if (r.samplers) {
              var samplers = {};
              var skeys = Object.keys(r.samplers);
              for (var si = 0; si < skeys.length; si++) {
                var sk = skeys[si];
                var sc = Object.assign({}, r.samplers[sk]);
                if (r.samplers[sk].base) sc.base = Object.assign({}, r.samplers[sk].base);
                samplers[sk] = sc;
              }
              rc.samplers = samplers;
            }
            if (r.textures) {
              var textures = {};
              var tkeys = Object.keys(r.textures);
              for (var ti = 0; ti < tkeys.length; ti++) {
                textures[tkeys[ti]] = Object.assign({}, r.textures[tkeys[ti]]);
              }
              rc.textures = textures;
            }
            mutable[i] = rc;
          }
          for (var j = 0; j < mutable.length; j++) patchRender(mutable[j]);
          callback(mutable);
        } else {
          callback(renders);
        }
      });
    },
  };

  window.alt1gl = alt1;
  console.log('[alt1gl-shim] Renderer-world API active (mutable wrapper over _alt1gl bridge)');
})();
`;

// Inject shim into renderer's main world BEFORE page scripts load.
// webFrame.executeJavaScript() runs code in the main world synchronously
// (guaranteed before page scripts), unlike DOM <script> injection which
// can race with the HTML parser and webpack bundles.
webFrame.executeJavaScript(RENDERER_SHIM).catch((err) => {
  console.error('[PreloadIsolated] webFrame.executeJavaScript failed, falling back to DOM injection:', err);
  // Fallback: DOM-based injection (may race with page scripts)
  const script = document.createElement('script');
  script.textContent = RENDERER_SHIM;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
});

// ============================================
// 11. Titlebar Injection (DOM, runs in preload world)
// ============================================

let titlebarTitle = 'Loading...';
let titlebarStyleElement: HTMLStyleElement | null = null;

const TITLEBAR_CSS = `
  #alt1gl-titlebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: rgb(35, 35, 35);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 0 10px;
    z-index: 999999;
    -webkit-app-region: drag;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    will-change: transform;
    contain: layout style;
  }
  #alt1gl-title {
    color: rgba(255, 255, 255, 0.9);
    font-size: 12px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    -webkit-app-region: drag;
  }
  #alt1gl-close-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
  }
  #alt1gl-close-btn:hover {
    background: #e81123;
    color: #ffffff;
  }
  #alt1gl-close-btn:active {
    background: #c50f1f;
  }
  #alt1gl-close-btn svg {
    width: 12px;
    height: 12px;
  }
  #alt1gl-minimize-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
    margin-right: 2px;
  }
  #alt1gl-minimize-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }
  #alt1gl-minimize-btn:active {
    background: rgba(255, 255, 255, 0.25);
  }
  #alt1gl-minimize-btn svg {
    width: 12px;
    height: 12px;
  }
  html { overflow: auto !important; }
  body {
    overflow: auto !important;
    margin: 0 !important;
    padding: 28px 0 0 0 !important;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); }
  ::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.5); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.7); }
  ::-webkit-scrollbar-corner { background: transparent; }
`;

function ensureTitlebarStyle(): void {
  if (titlebarStyleElement && titlebarStyleElement.parentNode) return;
  titlebarStyleElement = document.createElement('style');
  titlebarStyleElement.id = 'alt1gl-titlebar-style';
  titlebarStyleElement.textContent = TITLEBAR_CSS;
  if (document.head) document.head.appendChild(titlebarStyleElement);
}

function createTitlebarElement(): HTMLDivElement {
  const titlebar = document.createElement('div');
  titlebar.id = 'alt1gl-titlebar';

  const titleText = document.createElement('span');
  titleText.id = 'alt1gl-title';
  titleText.textContent = titlebarTitle;

  const minimizeBtn = document.createElement('button');
  minimizeBtn.id = 'alt1gl-minimize-btn';
  minimizeBtn.title = 'Minimize';
  minimizeBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path stroke="currentColor" stroke-width="1.5" d="M2,6 L10,6"/>
    </svg>
  `;
  minimizeBtn.addEventListener('click', () => ipcRenderer.send('app-window:minimize'));

  const closeBtn = document.createElement('button');
  closeBtn.id = 'alt1gl-close-btn';
  closeBtn.title = 'Close';
  closeBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path stroke="currentColor" stroke-width="1.5" d="M2,2 L10,10 M10,2 L2,10"/>
    </svg>
  `;
  closeBtn.addEventListener('click', () => ipcRenderer.send('app-window:close'));

  titlebar.appendChild(titleText);
  titlebar.appendChild(minimizeBtn);
  titlebar.appendChild(closeBtn);
  return titlebar;
}

function injectTitlebar(): void {
  if (document.getElementById('alt1gl-titlebar')) return;
  if (!document.body) return;
  ensureTitlebarStyle();
  document.body.insertBefore(createTitlebarElement(), document.body.firstChild);
}

function watchTitlebar(): void {
  const bodyObserver = new MutationObserver(() => {
    if (!document.getElementById('alt1gl-titlebar') && document.body) {
      injectTitlebar();
    }
  });
  if (document.body) bodyObserver.observe(document.body, { childList: true });

  const htmlObserver = new MutationObserver(() => {
    if (document.body && !document.getElementById('alt1gl-titlebar')) {
      bodyObserver.disconnect();
      injectTitlebar();
      bodyObserver.observe(document.body, { childList: true });
    }
  });
  htmlObserver.observe(document.documentElement, { childList: true });

  setInterval(() => {
    if (document.body && !document.getElementById('alt1gl-titlebar')) {
      injectTitlebar();
      bodyObserver.disconnect();
      bodyObserver.observe(document.body, { childList: true });
    }
  }, 2000);
}

// Fetch title
ipcRenderer.invoke('app-window:get-title').then((title: string) => {
  titlebarTitle = title;
  const el = document.getElementById('alt1gl-title');
  if (el) el.textContent = title;
});

// Inject when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { injectTitlebar(); watchTitlebar(); });
} else {
  injectTitlebar();
  watchTitlebar();
}

window.addEventListener('load', () => {
  if (!document.getElementById('alt1gl-titlebar')) injectTitlebar();
});
