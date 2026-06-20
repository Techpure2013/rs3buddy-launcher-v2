"use strict";

// src/app-window/preload-isolated.ts
var import_electron = require("electron");
var cachedState = { ready: 0, x: 0, y: 0, width: 0, height: 0, hwnd: 0 };
import_electron.ipcRenderer.invoke("rs3buddy:state:subscribe").then((state) => {
  if (state)
    cachedState = state;
}).catch(() => {
});
import_electron.ipcRenderer.on("rs3buddy:state:update", (_e, state) => {
  cachedState = state;
});
var DISPOSE = "rs3buddy:handle:dispose";
function invokeHandleSync(handleId, method, args = []) {
  const result = import_electron.ipcRenderer.sendSync("rs3buddy:handle:invokeSync", { handleId, method, args });
  if (result && result.error)
    throw new Error(result.error);
  return result?.data;
}
function toImageData(r) {
  if (!r || !r.data || !r.width || !r.height)
    return null;
  return new ImageData(new Uint8ClampedArray(r.data), r.width, r.height);
}
function batchInvokeSync(requests) {
  return import_electron.ipcRenderer.sendSync("rs3buddy:handle:batchInvokeSync", requests);
}
function hydrateTrackedTexture(s) {
  if (!s)
    return s;
  return {
    __handleId: s.__handleId,
    width: s.width,
    height: s.height,
    texid: s.texid,
    format: s.format,
    formatid: s.formatid,
    capture: (x, y, w, h) => {
      const r = invokeHandleSync(s.__handleId, "capture", [x, y, w, h]);
      return toImageData(r);
    },
    batchCapture: (rects) => {
      const reqs = rects.map((r) => ({ handleId: s.__handleId, method: "capture", args: [r.x, r.y, r.w, r.h] }));
      const results = batchInvokeSync(reqs);
      return results.map((r) => r?.data ? toImageData(r.data) : null);
    },
    upload: (img) => invokeHandleSync(s.__handleId, "upload", [{ width: img.width, height: img.height, data: img.data }]),
    getStaleRect: () => invokeHandleSync(s.__handleId, "getStaleRect"),
    dispose: () => import_electron.ipcRenderer.invoke(DISPOSE, s.__handleId)
  };
}
function hydrateVertexArraySnapshot(s) {
  if (!s)
    return s;
  return {
    __handleId: s.__handleId,
    base: s.base,
    indexBuffer: s.indexBuffer,
    attributes: s.attributes,
    dispose: () => import_electron.ipcRenderer.invoke(DISPOSE, s.__handleId)
  };
}
function hydrateGlProgram(s) {
  if (!s)
    return s;
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
    dispose: () => import_electron.ipcRenderer.invoke(DISPOSE, s.__handleId)
  };
}
function hydrateGlOverlay(s) {
  if (!s)
    return s;
  return {
    __handleId: s.__handleId,
    getUniformState: () => invokeHandleSync(s.__handleId, "getUniformState"),
    setUniformState: (data) => invokeHandleSync(s.__handleId, "setUniformState", [data]),
    stop: () => invokeHandleSync(s.__handleId, "stop"),
    dispose: () => import_electron.ipcRenderer.invoke(DISPOSE, s.__handleId)
  };
}
var streamCallbacks = /* @__PURE__ */ new Map();
var streamEndedCallbacks = /* @__PURE__ */ new Map();
var pendingStreamData = /* @__PURE__ */ new Map();
import_electron.ipcRenderer.on("rs3buddy:callback:streamData", (_e, data) => {
  const cb = streamCallbacks.get(data.streamId);
  if (cb) {
    cb(data.renders);
  } else {
    let pending = pendingStreamData.get(data.streamId);
    if (!pending) {
      pending = [];
      pendingStreamData.set(data.streamId, pending);
    }
    pending.push(data.renders);
  }
});
import_electron.ipcRenderer.on("rs3buddy:callback:streamEnded", (_e, data) => {
  streamCallbacks.delete(data.streamId);
  pendingStreamData.delete(data.streamId);
  const endCb = streamEndedCallbacks.get(data.streamId);
  if (endCb) {
    streamEndedCallbacks.delete(data.streamId);
    endCb();
  }
});
var glLogCallback = null;
import_electron.ipcRenderer.on("rs3buddy:callback:glLog", (_e, packet) => {
  if (glLogCallback)
    glLogCallback(packet);
});
var debugLogCallback = null;
import_electron.ipcRenderer.on("rs3buddy:callback:debugLog", (_e, data) => {
  if (debugLogCallback)
    debugLogCallback(data.message);
});
var rs3buddyProxy = {
  // --- Cached sync values ---
  getRsReady: () => cachedState.ready,
  getRsX: () => cachedState.x,
  getRsY: () => cachedState.y,
  getRsWidth: () => cachedState.width,
  getRsHeight: () => cachedState.height,
  getRsHwnd: () => cachedState.hwnd,
  // --- Async root methods ---
  capture: async (texid, x, y, w, h) => {
    const r = await import_electron.ipcRenderer.invoke("rs3buddy:root:capture", texid, x, y, w, h);
    if (!r || !r.width || !r.height)
      return null;
    return { width: r.width, height: r.height, data: r.data };
  },
  getRenderer: () => import_electron.ipcRenderer.invoke("rs3buddy:root:getRenderer"),
  getOpenGlState: async () => {
    return await import_electron.ipcRenderer.invoke("rs3buddy:root:getOpenGlState");
  },
  recordRenderCalls: async (options) => {
    return await import_electron.ipcRenderer.invoke("rs3buddy:gl:recordRenderCalls", options) || [];
  },
  streamRenderCalls: (options, callback) => {
    let streamId = null;
    let ended = false;
    let resolveEnded;
    const endedPromise = new Promise((resolve) => {
      resolveEnded = resolve;
    });
    const startPromise = import_electron.ipcRenderer.invoke("rs3buddy:stream:start", options).then((result) => {
      streamId = result.streamId;
      streamCallbacks.set(streamId, callback);
      streamEndedCallbacks.set(streamId, () => {
        ended = true;
        resolveEnded();
      });
      const pending = pendingStreamData.get(streamId);
      if (pending) {
        pendingStreamData.delete(streamId);
        for (const renders of pending) {
          callback(renders);
        }
      }
      return result;
    }).catch((err) => {
      console.error("[rs3buddy] Stream start failed:", err);
      ended = true;
      resolveEnded();
      throw err;
    });
    return {
      close: async () => {
        await startPromise.catch(() => {
        });
        if (streamId && !ended) {
          streamCallbacks.delete(streamId);
          streamEndedCallbacks.delete(streamId);
          pendingStreamData.delete(streamId);
          await import_electron.ipcRenderer.invoke("rs3buddy:stream:close", streamId);
          ended = true;
          resolveEnded();
        }
      },
      ended: endedPromise
    };
  },
  // --- GL Logging ---
  setGlLogCb: (cb) => {
    glLogCallback = cb;
    if (cb) {
      import_electron.ipcRenderer.invoke("rs3buddy:callback:subscribeGlLog");
    } else {
      import_electron.ipcRenderer.invoke("rs3buddy:callback:unsubscribeGlLog");
    }
  },
  getGlLogToggles: () => import_electron.ipcRenderer.invoke("rs3buddy:root:getGlLogToggles"),
  setGlLogToggles: (arr) => import_electron.ipcRenderer.invoke("rs3buddy:root:setGlLogToggles", arr),
  // --- Overlay / Creation (synchronous via sendSync) ---
  createProgram: (vertexShader, fragmentShader, inputs, uniforms) => {
    const result = import_electron.ipcRenderer.sendSync("rs3buddy:overlay:createProgramSync", vertexShader, fragmentShader, inputs, uniforms);
    if (result && result.error)
      throw new Error(result.error);
    return hydrateGlProgram(result?.data);
  },
  createVertexArray: (indexBuffer, inputs) => {
    const result = import_electron.ipcRenderer.sendSync("rs3buddy:overlay:createVertexArraySync", indexBuffer, inputs);
    if (result && result.error)
      throw new Error(result.error);
    return hydrateVertexArraySnapshot(result?.data);
  },
  createTexture: (img) => {
    const result = import_electron.ipcRenderer.sendSync("rs3buddy:overlay:createTextureSync", {
      width: img.width,
      height: img.height,
      data: img.data
    });
    if (result && result.error)
      throw new Error(result.error);
    return hydrateTrackedTexture(result?.data);
  },
  beginOverlay: (trigger, prog, vertexArray, options) => {
    const progHandleId = prog?.__handleId;
    const vasHandleId = vertexArray?.__handleId;
    const optsCopy = { ...options };
    if (options.samplers) {
      optsCopy.samplerHandleIds = {};
      for (const [loc, tex] of Object.entries(options.samplers)) {
        optsCopy.samplerHandleIds[loc] = tex.__handleId;
      }
      delete optsCopy.samplers;
    }
    const result = import_electron.ipcRenderer.sendSync("rs3buddy:overlay:beginOverlaySync", trigger, progHandleId, vasHandleId, optsCopy);
    if (result && result.error)
      throw new Error(result.error);
    return hydrateGlOverlay(result?.data);
  },
  // --- Mouse Position ---
  getMousePosition: () => import_electron.ipcRenderer.invoke("rs3buddy:mouse:getPosition"),
  // Compatibility shim: some apps access overlay.getMousePosition
  overlay: {
    getMousePosition: () => import_electron.ipcRenderer.invoke("rs3buddy:mouse:getPosition")
  },
  // --- Handle Bridge (for renderer-world shim) ---
  __invokeHandleSync: (handleId, method, args) => {
    return invokeHandleSync(handleId, method, args || []);
  },
  __batchInvokeSync: (requests) => {
    const results = import_electron.ipcRenderer.sendSync("rs3buddy:handle:batchInvokeSync", requests);
    return results;
  },
  __disposeHandle: (handleId) => {
    return import_electron.ipcRenderer.invoke(DISPOSE, handleId);
  },
  // --- Debug API ---
  debug: {
    getCurrentWorkingDirectory: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:getCwd"),
    readDirSync: (dir) => import_electron.ipcRenderer.invoke("rs3buddy:debug:readDir", dir),
    readFileSync: (file) => import_electron.ipcRenderer.invoke("rs3buddy:debug:readFile", file),
    copyFileSync: (from, to) => import_electron.ipcRenderer.invoke("rs3buddy:debug:copyFile", from, to),
    statSync: (file) => import_electron.ipcRenderer.invoke("rs3buddy:debug:stat", file),
    getExePids: (name, parent) => import_electron.ipcRenderer.invoke("rs3buddy:debug:getExePids", name, parent),
    injectDll: (pid, dllfile, memoryid, instanceid) => import_electron.ipcRenderer.invoke("rs3buddy:debug:injectDll", pid, dllfile, memoryid, instanceid),
    connectToOverlay: (pid) => import_electron.ipcRenderer.invoke("rs3buddy:debug:connectOverlay", pid),
    exitDll: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:exitDll"),
    getRsHwnd: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:getRsHwnd"),
    memoryState: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:memoryState"),
    handleStoreStats: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:handleStoreStats"),
    disposeAllHandles: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:disposeAllHandles"),
    getSharedMemorySizes: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:getSharedMemorySizes"),
    getAllGlObjects: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:getAllGlObjects"),
    getGlObjectStats: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:getGlObjectStats"),
    resetOpenGlState: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:resetOpenGlState"),
    killMemorySession: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:killMemorySession"),
    testRecordRenderCalls: () => import_electron.ipcRenderer.invoke("rs3buddy:debug:testRecordRenderCalls"),
    setLogCb: (cb) => {
      debugLogCallback = cb;
      import_electron.ipcRenderer.invoke("rs3buddy:debug:setLogCb", !!cb);
    }
  }
};
var appWindowApi = {
  close: () => import_electron.ipcRenderer.send("app-window:close"),
  getTitle: () => import_electron.ipcRenderer.invoke("app-window:get-title"),
  getGamePid: () => import_electron.ipcRenderer.invoke("app-window:get-game-pid"),
  notifyDailyInfoChanged: () => import_electron.ipcRenderer.send("invalidate-daily-info"),
  writeAppData: (appName, filename, data) => import_electron.ipcRenderer.invoke("app-data:write", appName, filename, data),
  readAppData: (appName, filename) => import_electron.ipcRenderer.invoke("app-data:read", appName, filename)
};
var Modifiers = {
  None: 0,
  Ctrl: 1,
  Alt: 2,
  Shift: 4,
  Win: 8,
  CtrlAlt: 3,
  CtrlShift: 5,
  AltShift: 6,
  CtrlAltShift: 7
};
var Keys = {
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  Num0: 48,
  Num1: 49,
  Num2: 50,
  Num3: 51,
  Num4: 52,
  Num5: 53,
  Num6: 54,
  Num7: 55,
  Num8: 56,
  Num9: 57,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  Space: 32,
  Enter: 13,
  Escape: 27,
  Tab: 9,
  Backspace: 8,
  Delete: 46,
  Insert: 45,
  Home: 36,
  End: 35,
  PageUp: 33,
  PageDown: 34,
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40
};
var hotkeyCallbacks = /* @__PURE__ */ new Map();
var actionCallbacks = /* @__PURE__ */ new Map();
import_electron.ipcRenderer.on("hotkey-pressed", (_event, data) => {
  const specificCb = hotkeyCallbacks.get(data.hotkeyId);
  if (specificCb)
    specificCb(data);
  const actionCb = actionCallbacks.get(data.action);
  if (actionCb)
    actionCb(data);
});
var cachedAppId = "";
async function getAppId() {
  if (!cachedAppId) {
    cachedAppId = await import_electron.ipcRenderer.invoke("app-window:get-title") || "unknown-app";
  }
  return cachedAppId;
}
var hotkeyApi = {
  Modifiers,
  Keys,
  // Old signature: register(modifiers, keyCode, action, callback?)
  // App never passes appId — we fetch it internally.
  async register(modifiers, keyCode, action, callback) {
    const appId = await getAppId();
    const result = await import_electron.ipcRenderer.invoke("hotkey:registerWithConflictCheck", modifiers, keyCode, action, appId, false);
    if (result.success && callback && result.hotkeyId > 0) {
      hotkeyCallbacks.set(result.hotkeyId, callback);
    }
    return result;
  },
  // Old signature: registerAccelerator(accelerator, action, callback?)
  // Main process handler is 'hotkey:registerAccelerator' — returns hotkeyId (number)
  async registerAccelerator(accelerator, action, callback) {
    const appId = await getAppId();
    const hotkeyId = await import_electron.ipcRenderer.invoke("hotkey:registerAccelerator", accelerator, action, appId);
    if (callback && hotkeyId > 0) {
      hotkeyCallbacks.set(hotkeyId, callback);
    }
    return hotkeyId;
  },
  async unregister(hotkeyId) {
    hotkeyCallbacks.delete(hotkeyId);
    return await import_electron.ipcRenderer.invoke("hotkey:unregister", hotkeyId);
  },
  async unregisterByAction(action) {
    actionCallbacks.delete(action);
    const appId = await getAppId();
    const all = await import_electron.ipcRenderer.invoke("hotkey:getAll", appId);
    const match = all?.find((h) => h.action === action);
    if (match) {
      hotkeyCallbacks.delete(match.id);
      return await import_electron.ipcRenderer.invoke("hotkey:unregister", match.id);
    }
    return false;
  },
  async unregisterAll() {
    const appId = await getAppId();
    hotkeyCallbacks.clear();
    return await import_electron.ipcRenderer.invoke("hotkey:unregisterApp", appId);
  },
  onAction(action, callback) {
    actionCallbacks.set(action, callback);
  },
  async getRegistered() {
    const appId = await getAppId();
    return await import_electron.ipcRenderer.invoke("hotkey:getAll", appId);
  },
  async isRegistered(action) {
    const appId = await getAppId();
    const all = await import_electron.ipcRenderer.invoke("hotkey:getAll", appId);
    return all?.some((h) => h.action === action) ?? false;
  },
  async getFocusState() {
    return await import_electron.ipcRenderer.invoke("focus:getState");
  },
  async setGlobalOverride(allow) {
    return await import_electron.ipcRenderer.invoke("focus:setGlobalOverride", allow);
  }
};
import_electron.contextBridge.exposeInMainWorld("_rs3buddy", rs3buddyProxy);
import_electron.contextBridge.exposeInMainWorld("appWindowApi", appWindowApi);
import_electron.contextBridge.exposeInMainWorld("rs3buddyHotkeys", hotkeyApi);
console.log("[PreloadIsolated] APIs exposed via contextBridge (_rs3buddy bridge)");
var RENDERER_SHIM = `
(function() {
  var _real = window._rs3buddy;
  if (!_real) { console.error('[rs3buddy-shim] _rs3buddy bridge not found!'); return; }

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

  // --- Create mutable window.rs3buddy wrapping frozen _rs3buddy bridge ---
  var rs3buddyApi = {
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
          // contextBridge freezes callback arguments \u2014 create mutable copies
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

  window.rs3buddy = rs3buddyApi;
  console.log('[rs3buddy-shim] Renderer-world API active (mutable wrapper over _rs3buddy bridge)');
})();
`;
import_electron.webFrame.executeJavaScript(RENDERER_SHIM).catch((err) => {
  console.error("[PreloadIsolated] webFrame.executeJavaScript failed, falling back to DOM injection:", err);
  const script = document.createElement("script");
  script.textContent = RENDERER_SHIM;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
});
var titlebarTitle = "Loading...";
var titlebarStyleElement = null;
var TITLEBAR_CSS = `
  #rs3buddy-titlebar {
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
  #rs3buddy-title {
    color: rgba(255, 255, 255, 0.9);
    font-size: 12px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    -webkit-app-region: drag;
  }
  #rs3buddy-close-btn {
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
  #rs3buddy-close-btn:hover {
    background: #e81123;
    color: #ffffff;
  }
  #rs3buddy-close-btn:active {
    background: #c50f1f;
  }
  #rs3buddy-close-btn svg {
    width: 12px;
    height: 12px;
  }
  #rs3buddy-minimize-btn {
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
  #rs3buddy-minimize-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }
  #rs3buddy-minimize-btn:active {
    background: rgba(255, 255, 255, 0.25);
  }
  #rs3buddy-minimize-btn svg {
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
function ensureTitlebarStyle() {
  if (titlebarStyleElement && titlebarStyleElement.parentNode)
    return;
  titlebarStyleElement = document.createElement("style");
  titlebarStyleElement.id = "rs3buddy-titlebar-style";
  titlebarStyleElement.textContent = TITLEBAR_CSS;
  if (document.head)
    document.head.appendChild(titlebarStyleElement);
}
function createTitlebarElement() {
  const titlebar = document.createElement("div");
  titlebar.id = "rs3buddy-titlebar";
  const titleText = document.createElement("span");
  titleText.id = "rs3buddy-title";
  titleText.textContent = titlebarTitle;
  const minimizeBtn = document.createElement("button");
  minimizeBtn.id = "rs3buddy-minimize-btn";
  minimizeBtn.title = "Minimize";
  minimizeBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path stroke="currentColor" stroke-width="1.5" d="M2,6 L10,6"/>
    </svg>
  `;
  minimizeBtn.addEventListener("click", () => import_electron.ipcRenderer.send("app-window:minimize"));
  const closeBtn = document.createElement("button");
  closeBtn.id = "rs3buddy-close-btn";
  closeBtn.title = "Close";
  closeBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path stroke="currentColor" stroke-width="1.5" d="M2,2 L10,10 M10,2 L2,10"/>
    </svg>
  `;
  closeBtn.addEventListener("click", () => import_electron.ipcRenderer.send("app-window:close"));
  titlebar.appendChild(titleText);
  titlebar.appendChild(minimizeBtn);
  titlebar.appendChild(closeBtn);
  return titlebar;
}
function injectTitlebar() {
  if (document.getElementById("rs3buddy-titlebar"))
    return;
  if (!document.body)
    return;
  ensureTitlebarStyle();
  document.body.insertBefore(createTitlebarElement(), document.body.firstChild);
}
function watchTitlebar() {
  const bodyObserver = new MutationObserver(() => {
    if (!document.getElementById("rs3buddy-titlebar") && document.body) {
      injectTitlebar();
    }
  });
  if (document.body)
    bodyObserver.observe(document.body, { childList: true });
  const htmlObserver = new MutationObserver(() => {
    if (document.body && !document.getElementById("rs3buddy-titlebar")) {
      bodyObserver.disconnect();
      injectTitlebar();
      bodyObserver.observe(document.body, { childList: true });
    }
  });
  htmlObserver.observe(document.documentElement, { childList: true });
  setInterval(() => {
    if (document.body && !document.getElementById("rs3buddy-titlebar")) {
      injectTitlebar();
      bodyObserver.disconnect();
      bodyObserver.observe(document.body, { childList: true });
    }
  }, 2e3);
}
import_electron.ipcRenderer.invoke("app-window:get-title").then((title) => {
  titlebarTitle = title;
  const el = document.getElementById("rs3buddy-title");
  if (el)
    el.textContent = title;
});
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    injectTitlebar();
    watchTitlebar();
  });
} else {
  injectTitlebar();
  watchTitlebar();
}
window.addEventListener("load", () => {
  if (!document.getElementById("rs3buddy-titlebar"))
    injectTitlebar();
});
