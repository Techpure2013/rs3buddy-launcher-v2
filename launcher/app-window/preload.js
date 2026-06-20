"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/native-stub.ts
var native_stub_exports = {};
__export(native_stub_exports, {
  createNativeStub: () => createNativeStub
});
function makeDebugStub() {
  const overrides = {
    getCurrentWorkingDirectory: () => process.cwd(),
    readDirSync: () => [],
    readFileSync: () => new Uint8Array(0),
    copyFileSync: () => void 0,
    statSync: () => ({ size: 0, modifiedTime: 0, isDirectory: false }),
    getExePids: () => [],
    injectDll: () => {
      log("debug.injectDll (stub)");
      return { ok: false };
    },
    connectToOverlay: () => {
      log("debug.connectToOverlay (stub)");
      return { ok: false };
    },
    exitDll: () => log("debug.exitDll (stub)"),
    getRsHwnd: () => 0,
    memoryState: () => null,
    getAllGlObjects: () => ({}),
    getGlObjectStats: () => null,
    getSharedMemorySizes: () => [],
    resetOpenGlState: async () => void 0,
    killMemorySession: async () => void 0,
    setLogCb: (_cb) => log("debug.setLogCb (stub)")
  };
  return makeProxy("debug", overrides);
}
function makeProxy(label, overrides) {
  return new Proxy(overrides, {
    get(target, prop) {
      if (prop in target)
        return target[prop];
      return (..._args) => {
        log(`${label}.${String(prop)} (stub no-op)`);
        return void 0;
      };
    }
  });
}
function createNativeStub() {
  const overrides = {
    __stub: true,
    // RS3Buddy replacement API — return-shape matters (numbers read directly).
    getRsReady: () => 0,
    getRsX: () => 0,
    getRsY: () => 0,
    getRsWidth: () => 0,
    getRsHeight: () => 0,
    getRsHwnd: () => 0,
    capture: async () => {
      throw new Error("[native-stub] capture: engine not wired (Phase 1)");
    },
    // Core OpenGL — callers iterate/await these.
    recordRenderCalls: async () => [],
    streamRenderCalls: () => {
      log("streamRenderCalls (stub) \u2014 returns inert stream object");
      return { stop: () => void 0, dispose: () => void 0 };
    },
    getOpenGlState: async () => ({}),
    getRenderer: () => null,
    // GL logging/debugging.
    setGlLogCb: (_cb) => log("setGlLogCb (stub)"),
    getGlLogToggles: () => new Uint8Array(0),
    setGlLogToggles: (_arr) => log("setGlLogToggles (stub)"),
    // Upload/overlay — return inert handles.
    createProgram: () => {
      log("createProgram (stub)");
      return {};
    },
    createVertexArray: () => {
      log("createVertexArray (stub)");
      return {};
    },
    createTexture: () => {
      log("createTexture (stub)");
      return {};
    },
    beginOverlay: () => {
      log("beginOverlay (stub)");
      return { stop: () => void 0, getUniformState: () => new Uint8Array(0) };
    },
    // Debug API (required sub-object).
    debug: makeDebugStub(),
    // Optional overlay extension.
    overlay: {
      init: () => false,
      shutdown: () => void 0,
      setConfig: () => void 0,
      addButton: () => false,
      removeButton: () => false,
      clearButtons: () => void 0,
      setTheme: () => void 0,
      setClickCallback: () => void 0,
      getMousePosition: () => ({ x: 0, y: 0 })
    }
  };
  return makeProxy("native", overrides);
}
var log;
var init_native_stub = __esm({
  "src/native-stub.ts"() {
    "use strict";
    log = (m) => {
      try {
        console.log("[native-stub] " + m);
      } catch {
      }
    };
  }
});

// src/app-window/preload.ts
var import_electron = require("electron");
var path = __toESM(require("path"));
var fs = require("fs");
var debugLogPath = `/tmp/rs3buddy-preload-${process.pid}.log`;
try {
  fs.writeFileSync(debugLogPath, `=== Preload IMMEDIATE START PID=${process.pid} time=${Date.now()} ===
`);
} catch (e) {
}
var debug = (msg) => {
  const fullMsg = `[PRELOAD ${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`;
  console.log(fullMsg.trim());
  try {
    fs.appendFileSync(debugLogPath, fullMsg);
  } catch (e) {
  }
  try {
    import_electron.ipcRenderer.send("debug-log", fullMsg.trim());
  } catch (e) {
  }
};
debug("Starting preload script...");
var SKIP_NATIVE_ADDON = process.env.SKIP_NATIVE_ADDON === "1";
if (SKIP_NATIVE_ADDON) {
  console.log("[AppWindowPreload] SKIP_NATIVE_ADDON is set - skipping native addon loading");
}
var IS_LINUX = process.platform === "linux";
function cleanupStaleSharedMemory() {
  if (!IS_LINUX)
    return;
  try {
    const shmDir = "/dev/shm";
    const files = fs.readdirSync(shmDir);
    const rs3buddyFiles = files.filter((f) => f.startsWith("rs3buddylink_"));
    if (rs3buddyFiles.length === 0)
      return;
    const runningPids = /* @__PURE__ */ new Set();
    try {
      const procFiles = fs.readdirSync("/proc");
      for (const f of procFiles) {
        const pid = parseInt(f, 10);
        if (!isNaN(pid)) {
          runningPids.add(pid);
        }
      }
    } catch (e) {
      debug("Could not read /proc: " + e);
      return;
    }
    let cleaned = 0;
    for (const file of rs3buddyFiles) {
      const match = file.match(/^rs3buddylink_(\d+)/);
      if (match) {
        const pid = parseInt(match[1], 10);
        if (!runningPids.has(pid)) {
          try {
            fs.unlinkSync(path.join(shmDir, file));
            cleaned++;
          } catch (e) {
          }
        }
      }
    }
    if (cleaned > 0) {
      debug(`Cleaned up ${cleaned} stale shared memory files`);
    }
  } catch (e) {
    debug("Error cleaning up shared memory: " + e);
  }
}
cleanupStaleSharedMemory();
function getNativeAddonPath() {
  if (SKIP_NATIVE_ADDON) {
    return null;
  }
  if (IS_LINUX) {
    debug("Linux detected - attempting direct addon loading in packaged app");
  }
  const preloadDir = __dirname;
  debug("Preload directory: " + preloadDir);
  const basePaths = [
    // Development paths from launcher/app-window (preload.js location)
    path.resolve(preloadDir, "..", "..", "build", "Release"),
    path.resolve(preloadDir, "..", "..", "build", "Debug"),
    // Alternative development paths
    path.resolve(preloadDir, "..", "..", "..", "build", "Release"),
    path.resolve(preloadDir, "..", "..", "..", "build", "Debug"),
    // Packaged app paths
    path.resolve(process.resourcesPath || "", "lib")
  ];
  for (const basePath of basePaths) {
    const addonPath2 = path.join(basePath, "addon.node");
    debug("Checking: " + addonPath2);
    if (fs.existsSync(addonPath2)) {
      debug("Found native addon at: " + addonPath2);
      return addonPath2;
    }
  }
  debug("ERROR: Native addon not found in any of the paths");
  return null;
}
var nativeAddon = null;
var addonPath = null;
var addonLoadError = null;
try {
  const { createNativeStub: createNativeStub2 } = (init_native_stub(), __toCommonJS(native_stub_exports));
  nativeAddon = createNativeStub2();
} catch (e) {
  debug("could not load native stub (continuing with null): " + e);
}
try {
  addonPath = getNativeAddonPath();
  debug("Platform: " + process.platform);
  debug("Addon path result: " + addonPath);
} catch (e) {
  debug("ERROR getting addon path: " + e);
  addonLoadError = e;
}
if (addonPath && !addonLoadError) {
  debug("Attempting to load native addon...");
  debug("Process type: " + process.type);
  debug("Node version: " + process.versions.node);
  debug("Electron version: " + process.versions.electron);
  try {
    debug("Calling require()...");
    nativeAddon = require(addonPath);
    debug("Native addon loaded successfully");
    debug("Addon keys: " + Object.keys(nativeAddon).join(", "));
    debug("Setting up Module._load hook...");
    const Module = require("module");
    const originalLoad = Module._load;
    const addonDir = path.dirname(addonPath);
    Module._load = function(request, parent, isMain) {
      if (request.endsWith("addon.node") || /addon-\d+\.node$/.test(request)) {
        debug("Intercepted addon load request: " + request);
        return nativeAddon;
      }
      if (request.endsWith("injected.dll") || /injected-\d+\.dll$/.test(request) || request.endsWith("injected.so") || /injected-\d+\.so$/.test(request)) {
        const libExt = process.platform === "win32" ? "injected.dll" : "injected.so";
        const injectedPath = path.join(addonDir, libExt);
        debug("Intercepted injected library request: " + injectedPath);
      }
      return originalLoad.apply(this, [request, parent, isMain]);
    };
    debug("Module loader hook installed");
    debug("Setting up debug log callback...");
    if (nativeAddon?.debug?.setLogCb) {
      nativeAddon.debug.setLogCb((message) => {
        if (message.includes("bufferdata")) {
          const m = message.match(/bufferdata (\d+)\->(\d+)/);
          if (m) {
            const dif = Number(m[1]) - Number(m[2]);
            if (dif > 1e6) {
              console.log("[NativeLog] Large alloc:", dif);
            }
          }
        } else {
          console.info("[NativeLog]", message);
        }
      });
    }
    debug("Debug log callback set up");
    debug("Checking RS ready status...");
    try {
      const rsReady = nativeAddon.getRsReady();
      debug("RS ready status: " + rsReady);
      if (rsReady) {
        try {
          const currentState = import_electron.ipcRenderer.sendSync("app-window:get-injection-state-sync");
          if (currentState && currentState.pid > 0) {
            let rsW = 0, rsH = 0;
            try {
              rsW = nativeAddon.getRsWidth();
              rsH = nativeAddon.getRsHeight();
            } catch (e) {
              debug("getRsWidth/Height threw (connection already dead): " + e);
            }
            const looksStale = rsW <= 0 || rsH <= 0;
            if (looksStale) {
              debug(`RS appears stale (size=${rsW}x${rsH}), disconnecting old session before reconnect`);
              try {
                nativeAddon.exitDll();
              } catch (e) {
                debug("exitDll error (ok): " + e);
              }
              const waitStart = Date.now();
              while (Date.now() - waitStart < 200) {
              }
              try {
                let result = null;
                if (currentState.dllPath) {
                  result = nativeAddon.debug.injectDll(currentState.pid, currentState.dllPath);
                } else {
                  debug("Empty dllPath = reconnect case, using connectToOverlay");
                  result = nativeAddon.debug.connectToOverlay(currentState.pid);
                }
                debug("Reconnection result: " + JSON.stringify(result));
                if (result) {
                  debug("Successfully reconnected to PID " + currentState.pid + "! Instance ID: " + result.instanceid);
                }
              } catch (e) {
                debug("Connection failed during reconnect (game may need restart): " + e);
              }
            } else {
              debug(`RS connection looks healthy (size=${rsW}x${rsH}), keeping current connection`);
            }
          }
        } catch (e) {
          debug("PID check during reconnect: " + e);
        }
      }
      if (!rsReady) {
        debug("RS not ready, attempting to connect SYNCHRONOUSLY...");
        const injectionState = import_electron.ipcRenderer.sendSync("app-window:get-injection-state-sync");
        debug("Got injection state (sync): " + JSON.stringify(injectionState));
        if (injectionState && injectionState.pid > 0) {
          debug("Main process already injected into PID: " + injectionState.pid);
          debug("Using DLL path: " + injectionState.dllPath);
          const addonDir2 = path.dirname(addonPath);
          if (IS_LINUX) {
            const shmPath = `/dev/shm/rs3buddylink_${injectionState.pid}`;
            debug("Checking for overlay shared memory at: " + shmPath);
            let shmExists = false;
            for (let retry = 0; retry < 10; retry++) {
              if (fs.existsSync(shmPath)) {
                shmExists = true;
                break;
              }
              if (retry < 9) {
                debug(`Shared memory not found yet, retry ${retry + 1}/10...`);
                const start = Date.now();
                while (Date.now() - start < 500) {
                }
              }
            }
            if (!shmExists) {
              debug("ERROR: Overlay shared memory not found after retries!");
            } else {
              const instPath = `/dev/shm/rs3buddylink_${injectionState.pid}_inst_1`;
              debug("Checking for GL server instance at: " + instPath);
              let instExists = false;
              for (let retry = 0; retry < 20; retry++) {
                if (fs.existsSync(instPath)) {
                  instExists = true;
                  break;
                }
                if (retry < 19) {
                  debug(`GL server instance not ready yet, retry ${retry + 1}/20...`);
                  const start = Date.now();
                  while (Date.now() - start < 500) {
                  }
                }
              }
              if (instExists) {
                debug("GL server instance memory found! Connecting...");
                try {
                  const result = nativeAddon.debug.injectDll(injectionState.pid, injectionState.dllPath);
                  debug("Connection result: " + JSON.stringify(result));
                  if (result) {
                    debug("Successfully connected to existing session! Instance ID: " + result.instanceid);
                  } else {
                    debug("Failed to connect to existing session");
                  }
                } catch (e) {
                  debug("Error connecting to session: " + e);
                }
              } else {
                debug("WARNING: GL server instance memory not found after 10s!");
              }
            }
          } else {
            try {
              let result = null;
              if (injectionState.dllPath) {
                result = nativeAddon.debug.injectDll(injectionState.pid, injectionState.dllPath);
              } else {
                debug("Empty dllPath = reconnect case, using connectToOverlay");
                result = nativeAddon.debug.connectToOverlay(injectionState.pid);
              }
              debug("Connection result: " + JSON.stringify(result));
              if (result) {
                debug("Successfully connected to existing session! Instance ID: " + result.instanceid);
              } else {
                debug("Failed to connect to existing session");
              }
            } catch (e) {
              debug("Error connecting to session: " + e);
            }
          }
        } else {
          debug("No injection state from main, trying SYNCHRONOUS direct injection...");
          const addonDir2 = path.dirname(addonPath);
          const pids = nativeAddon.debug.getExePids("rs2client.exe");
          debug("Found RS PIDs: " + JSON.stringify(pids));
          if (pids.length > 0) {
            const injectedLibPath = process.platform === "win32" ? path.join(addonDir2, "injected.dll") : path.join(addonDir2, "injected.so");
            debug("Attempting SYNC injection with: " + injectedLibPath);
            if (fs.existsSync(injectedLibPath)) {
              if (IS_LINUX) {
                const shmPath = `/dev/shm/rs3buddylink_${pids[0]}`;
                debug("Checking for overlay shared memory at: " + shmPath);
                let shmExists = false;
                for (let retry = 0; retry < 10; retry++) {
                  if (fs.existsSync(shmPath)) {
                    shmExists = true;
                    break;
                  }
                  if (retry < 9) {
                    debug(`Shared memory not found yet, retry ${retry + 1}/10...`);
                    const start = Date.now();
                    while (Date.now() - start < 500) {
                    }
                  }
                }
                if (shmExists) {
                  const instPath = `/dev/shm/rs3buddylink_${pids[0]}_inst_1`;
                  debug("Checking for GL server instance at: " + instPath);
                  let instExists = false;
                  for (let retry = 0; retry < 20; retry++) {
                    if (fs.existsSync(instPath)) {
                      instExists = true;
                      break;
                    }
                    if (retry < 19) {
                      debug(`GL server instance not ready yet, retry ${retry + 1}/20...`);
                      const start = Date.now();
                      while (Date.now() - start < 500) {
                      }
                    }
                  }
                  if (instExists) {
                    debug("GL server ready, calling connectToOverlay (SYNC)...");
                    try {
                      const result = nativeAddon.debug.connectToOverlay(pids[0]);
                      debug("SYNC connection result: " + JSON.stringify(result));
                      if (result && result.instanceid) {
                        debug("Notifying main process of injection state...");
                        import_electron.ipcRenderer.send("app-window:set-injection-state", {
                          pid: pids[0],
                          dllPath: injectedLibPath,
                          instanceId: result.instanceid
                        });
                      }
                    } catch (injectErr) {
                      debug("ERROR during SYNC connectToOverlay call: " + injectErr);
                    }
                  } else {
                    debug("WARNING: GL server instance memory not found after 10s!");
                  }
                } else {
                  debug("ERROR: Overlay shared memory not found after retries!");
                }
              } else {
                try {
                  debug("Calling injectDll (SYNC, Windows)...");
                  const result = nativeAddon.debug.injectDll(pids[0], injectedLibPath);
                  debug("SYNC injection result: " + JSON.stringify(result));
                  if (result && result.instanceid) {
                    import_electron.ipcRenderer.send("app-window:set-injection-state", {
                      pid: pids[0],
                      dllPath: injectedLibPath,
                      instanceId: result.instanceid
                    });
                  }
                } catch (injectErr) {
                  debug("ERROR during SYNC injectDll call: " + injectErr);
                }
              }
            } else {
              debug("ERROR: injected library not found at: " + injectedLibPath);
            }
          } else {
            debug("ERROR: No RS PIDs found!");
          }
        }
        const alreadyConnected = nativeAddon.getRsReady();
        if (alreadyConnected) {
          debug("Successfully connected SYNCHRONOUSLY!");
        } else {
          debug("WARNING: Sync connection did not succeed - app may have issues");
        }
      } else {
        debug("RS already hooked in this addon instance!");
      }
    } catch (e) {
      debug("Error checking RS status: " + e);
    }
  } catch (e) {
    debug("Failed to load native addon: " + e);
    debug("Stack: " + e.stack);
    addonLoadError = e;
    nativeAddon = null;
  }
}
debug("Preload main code complete, setting up globalThis.rs3buddy...");
if (addonLoadError) {
  debug("WARNING: Native addon failed to load - app will run without native features");
  debug("Error was: " + addonLoadError.message);
}
if (nativeAddon) {
  const addonDir = path.dirname(addonPath);
  globalThis.rs3buddyNativeDir = addonDir;
  debug("Native directory exposed as globalThis.rs3buddyNativeDir: " + addonDir);
  globalThis.rs3buddy = nativeAddon;
  debug("Native addon exposed as globalThis.rs3buddy");
  if (!nativeAddon.overlay) {
    nativeAddon.overlay = {};
  }
  let mouseLogCount = 0;
  nativeAddon.overlay.getMousePosition = () => {
    try {
      mouseLogCount++;
      const shouldLog = mouseLogCount <= 5 || mouseLogCount % 600 === 0;
      const result = import_electron.ipcRenderer.sendSync("native:getMousePosition-sync");
      if (shouldLog) {
        let localInfo = "";
        try {
          const rsX = nativeAddon.getRsX();
          const rsY = nativeAddon.getRsY();
          const rsW = nativeAddon.getRsWidth();
          const rsH = nativeAddon.getRsHeight();
          localInfo = ` localAddon:rs=(${rsX},${rsY}) size=(${rsW}x${rsH})`;
        } catch (e) {
          localInfo = ` localAddon:error=${e}`;
        }
        debug(`[Mouse] #${mouseLogCount} ipcResult=${result ? `(${result.x},${result.y})` : "null"}${localInfo}`);
      }
      return result;
    } catch (e) {
      if (mouseLogCount <= 5)
        debug("[Mouse] Error: " + e);
      return null;
    }
  };
  debug("overlay.getMousePosition patched (via launcher IPC)");
  const fsModule = require("fs");
  const originalStatSync = fsModule.statSync;
  fsModule.statSync = function(pathArg, options) {
    if (pathArg.endsWith("addon.node") || /addon-\d+\.node$/.test(pathArg)) {
      console.log("[AppWindowPreload] Intercepted statSync for:", pathArg);
      return {
        size: 1e6,
        mtimeMs: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: () => false,
        isFile: () => true
      };
    }
    if (pathArg.endsWith("injected.dll") || /injected-\d+\.dll$/.test(pathArg) || pathArg.endsWith("injected.so") || /injected-\d+\.so$/.test(pathArg)) {
      console.log("[AppWindowPreload] Intercepted statSync for:", pathArg);
      const libName = process.platform === "win32" ? "injected.dll" : "injected.so";
      const ourInjectedPath = path.join(addonDir, libName);
      if (fsModule.existsSync(ourInjectedPath)) {
        return originalStatSync.call(this, ourInjectedPath, options);
      }
      return {
        size: 5e5,
        mtimeMs: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: () => false,
        isFile: () => true
      };
    }
    return originalStatSync.call(this, pathArg, options);
  };
  console.log("[AppWindowPreload] fs.statSync hook installed");
  const originalReadFileSync = fsModule.readFileSync;
  fsModule.readFileSync = function(pathArg, options) {
    if (pathArg.endsWith("injected.dll") || /injected-\d+\.dll$/.test(pathArg) || pathArg.endsWith("injected.so") || /injected-\d+\.so$/.test(pathArg)) {
      console.log("[AppWindowPreload] Intercepted readFileSync for:", pathArg);
      const libName = process.platform === "win32" ? "injected.dll" : "injected.so";
      const ourInjectedPath = path.join(addonDir, libName);
      if (fsModule.existsSync(ourInjectedPath)) {
        return originalReadFileSync.call(this, ourInjectedPath, options);
      }
    }
    return originalReadFileSync.call(this, pathArg, options);
  };
  console.log("[AppWindowPreload] fs.readFileSync hook installed");
  const originalReaddirSync = fsModule.readdirSync;
  fsModule.readdirSync = function(pathArg, options) {
    if (pathArg.includes("build") && (pathArg.includes("release") || pathArg.includes("debug") || pathArg.includes("Release") || pathArg.includes("Debug"))) {
      console.log("[AppWindowPreload] Intercepted readdirSync for:", pathArg, "-> redirecting to:", addonDir);
      try {
        return originalReaddirSync.call(this, addonDir, options);
      } catch (e) {
        console.log("[AppWindowPreload] readdirSync redirect failed, using original path");
      }
    }
    return originalReaddirSync.call(this, pathArg, options);
  };
  console.log("[AppWindowPreload] fs.readdirSync hook installed");
  const originalCopyFileSync = fsModule.copyFileSync;
  fsModule.copyFileSync = function(src, dest) {
    if (src.endsWith("addon.node") || /addon-\d+\.node$/.test(src) || dest.endsWith("addon.node") || /addon-\d+\.node$/.test(dest)) {
      console.log("[AppWindowPreload] Skipping copyFileSync for addon (will use pre-loaded addon):", src, "->", dest);
      return;
    }
    if (src.endsWith("injected.dll") || /injected-\d+\.dll$/.test(src) || src.endsWith("injected.so") || /injected-\d+\.so$/.test(src)) {
      console.log("[AppWindowPreload] Intercepted copyFileSync for injected library:", src, "->", dest);
      const libName = process.platform === "win32" ? "injected.dll" : "injected.so";
      const ourInjectedPath = path.join(addonDir, libName);
      const destDir = path.dirname(dest);
      if (!fsModule.existsSync(destDir)) {
        fsModule.mkdirSync(destDir, { recursive: true });
      }
      if (fsModule.existsSync(ourInjectedPath)) {
        return originalCopyFileSync.call(this, ourInjectedPath, dest);
      }
    }
    return originalCopyFileSync.call(this, src, dest);
  };
  console.log("[AppWindowPreload] fs.copyFileSync hook installed");
} else {
  console.warn("[AppWindowPreload] Native addon not available, globalThis.rs3buddy will be null");
}
var appWindowApi = {
  close: () => import_electron.ipcRenderer.send("app-window:close"),
  getTitle: () => import_electron.ipcRenderer.invoke("app-window:get-title"),
  getGamePid: () => import_electron.ipcRenderer.invoke("app-window:get-game-pid"),
  /** Signal the launcher to refresh daily info (e.g. after VoS submission) */
  notifyDailyInfoChanged: () => import_electron.ipcRenderer.send("invalidate-daily-info"),
  /** Write a JSON file to the app's persistent data directory */
  writeAppData: (appName, filename, data) => import_electron.ipcRenderer.invoke("app-data:write", appName, filename, data),
  /** Read a JSON file from the app's persistent data directory */
  readAppData: (appName, filename) => import_electron.ipcRenderer.invoke("app-data:read", appName, filename)
};
window.appWindowApi = appWindowApi;
console.log("[AppWindowPreload] appWindowApi exposed");
var Modifiers = {
  None: 0,
  Ctrl: 1,
  Alt: 2,
  Shift: 4,
  Win: 8,
  // Common combinations
  CtrlAlt: 3,
  CtrlShift: 5,
  AltShift: 6,
  CtrlAltShift: 7
};
var Keys = {
  // Letters
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
  // Numbers
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
  // Function keys
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
  // Special
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
  console.log("[Hotkeys] Received hotkey event:", data);
  const specificCb = hotkeyCallbacks.get(data.hotkeyId);
  if (specificCb) {
    specificCb(data);
  }
  const actionCb = actionCallbacks.get(data.action);
  if (actionCb) {
    actionCb(data);
  }
});
async function showConflictResolutionDialog(result, action, appId, modifiers, keyCode, callback) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const request = {
    requestId,
    appName: appId,
    originalAccelerator: result.originalAccelerator,
    conflictingAppName: result.conflictingApp || "Unknown App",
    alternativeSuggestion: result.alternativeSuggestion
  };
  const response = await import_electron.ipcRenderer.invoke(
    "hotkey:showConflictDialog",
    request,
    modifiers,
    keyCode,
    action
  );
  if (response.useAlternative && result.alternativeSuggestion) {
    const newResult = await import_electron.ipcRenderer.invoke(
      "hotkey:registerWithConflictCheck",
      modifiers,
      keyCode,
      action,
      appId,
      true
    );
    if (newResult.success && callback && newResult.hotkeyId > 0) {
      hotkeyCallbacks.set(newResult.hotkeyId, callback);
    }
    return {
      hotkeyId: newResult.hotkeyId,
      usedAlternative: true,
      finalAccelerator: newResult.finalAccelerator
    };
  }
  return {
    hotkeyId: -1,
    usedAlternative: false,
    finalAccelerator: result.originalAccelerator
  };
}
async function showConflictResolutionDialogForAccelerator(result, action, appId, originalAccelerator, callback) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const request = {
    requestId,
    appName: appId,
    originalAccelerator,
    conflictingAppName: result.conflictingApp || "Unknown App",
    alternativeSuggestion: result.alternativeSuggestion
  };
  const response = await import_electron.ipcRenderer.invoke(
    "hotkey:showConflictDialog",
    request,
    0,
    // modifiers not needed for accelerator-based
    0,
    // keyCode not needed for accelerator-based
    action
  );
  if (response.useAlternative && result.alternativeSuggestion) {
    const suggestedKey = result.alternativeSuggestion.accelerator;
    const hotkeyId = await import_electron.ipcRenderer.invoke("hotkey:registerAccelerator", suggestedKey, action, appId);
    if (callback && hotkeyId > 0) {
      hotkeyCallbacks.set(hotkeyId, callback);
    }
    return {
      hotkeyId,
      usedAlternative: true,
      finalAccelerator: suggestedKey
    };
  }
  return {
    hotkeyId: -1,
    usedAlternative: false,
    finalAccelerator: originalAccelerator
  };
}
var hotkeyApi = {
  // Constants for easy access
  Modifiers,
  Keys,
  /**
   * Register a hotkey using modifier flags and key code
   * Automatically handles conflicts by suggesting alternative modifiers
   * @param modifiers Use Modifiers constants (e.g., Modifiers.Ctrl | Modifiers.Shift)
   * @param keyCode Use Keys constants (e.g., Keys.A)
   * @param action Unique action identifier for your app
   * @param callback Optional callback when hotkey is pressed
   * @returns Promise<number> Hotkey ID for later management (-1 if registration failed or user declined)
   *
   * @example
   * const id = await rs3buddyHotkeys.register(
   *   rs3buddyHotkeys.Modifiers.Ctrl | rs3buddyHotkeys.Modifiers.Shift,
   *   rs3buddyHotkeys.Keys.A,
   *   'my-action',
   *   (event) => console.log('Hotkey pressed!')
   * );
   */
  async register(modifiers, keyCode, action, callback) {
    const appId = await import_electron.ipcRenderer.invoke("app-window:get-title") || "unknown-app";
    const result = await import_electron.ipcRenderer.invoke(
      "hotkey:registerWithConflictCheck",
      modifiers,
      keyCode,
      action,
      appId,
      false
    );
    if (result.success) {
      if (callback && result.hotkeyId > 0) {
        hotkeyCallbacks.set(result.hotkeyId, callback);
      }
      return result.hotkeyId;
    }
    if (result.hadConflict) {
      const resolution = await showConflictResolutionDialog(
        result,
        action,
        appId,
        modifiers,
        keyCode,
        callback
      );
      return resolution.hotkeyId;
    }
    return -1;
  },
  /**
   * Register a hotkey using Electron accelerator string
   * Automatically handles conflicts by suggesting alternative modifiers
   * @param accelerator e.g., "Ctrl+Shift+A", "Alt+F1", "CommandOrControl+S"
   * @param action Unique action identifier
   * @param callback Optional callback when hotkey is pressed
   * @param skipConflictCheck Optional - if true, skips conflict UI and registers anyway
   * @returns Promise<number> Hotkey ID (-1 if registration failed or user declined)
   *
   * @example
   * const id = await rs3buddyHotkeys.registerAccelerator('Ctrl+Shift+R', 'reload-data');
   */
  async registerAccelerator(accelerator, action, callback, skipConflictCheck) {
    const appId = await import_electron.ipcRenderer.invoke("app-window:get-title") || "unknown-app";
    if (skipConflictCheck) {
      const hotkeyId = await import_electron.ipcRenderer.invoke("hotkey:registerAccelerator", accelerator, action, appId);
      if (callback && hotkeyId > 0) {
        hotkeyCallbacks.set(hotkeyId, callback);
      }
      return hotkeyId;
    }
    const conflict = await import_electron.ipcRenderer.invoke("hotkey:checkConflict", accelerator);
    const otherAppConflicts = conflict.conflictingHotkeys.filter((hk) => hk.appId !== appId);
    if (!conflict.hasConflict || otherAppConflicts.length === 0) {
      const hotkeyId = await import_electron.ipcRenderer.invoke("hotkey:registerAccelerator", accelerator, action, appId);
      if (callback && hotkeyId > 0) {
        hotkeyCallbacks.set(hotkeyId, callback);
      }
      return hotkeyId;
    }
    const alternative = await import_electron.ipcRenderer.invoke("hotkey:findAlternative", accelerator, appId);
    const result = {
      success: false,
      hotkeyId: -1,
      hadConflict: true,
      conflictingApp: otherAppConflicts[0]?.appId || "Unknown App",
      usedAlternative: false,
      originalAccelerator: accelerator,
      finalAccelerator: accelerator,
      alternativeSuggestion: alternative.available && alternative.alternative ? {
        accelerator: alternative.alternative,
        modifiers: alternative.alternativeModifiers || ""
      } : null
    };
    const resolution = await showConflictResolutionDialogForAccelerator(
      result,
      action,
      appId,
      accelerator,
      callback
    );
    return resolution.hotkeyId;
  },
  /**
   * Unregister a hotkey by ID
   */
  async unregister(hotkeyId) {
    hotkeyCallbacks.delete(hotkeyId);
    return await import_electron.ipcRenderer.invoke("hotkey:unregister", hotkeyId);
  },
  /**
   * Enable or disable a specific hotkey
   */
  async setEnabled(hotkeyId, enabled) {
    return await import_electron.ipcRenderer.invoke("hotkey:setEnabled", hotkeyId, enabled);
  },
  /**
   * Get all hotkeys registered by this app
   */
  async getAll() {
    const appId = await import_electron.ipcRenderer.invoke("app-window:get-title") || "unknown-app";
    return await import_electron.ipcRenderer.invoke("hotkey:getAll", appId);
  },
  /**
   * Listen for a specific action (alternative to callback in register)
   * @param action The action string to listen for
   * @param callback Function to call when the action is triggered
   * @returns Function to remove the listener
   *
   * @example
   * const unlisten = rs3buddyHotkeys.onAction('my-action', (event) => {
   *   console.log('Action triggered!', event);
   * });
   * // Later: unlisten();
   */
  onAction(action, callback) {
    actionCallbacks.set(action, callback);
    return () => {
      actionCallbacks.delete(action);
    };
  },
  /**
   * Check if global hotkeys are currently enabled
   */
  async isEnabled() {
    return await import_electron.ipcRenderer.invoke("hotkey:isGlobalEnabled");
  },
  // ============================================
  // NEW FEATURES - Rebinding, Conflicts, Focus
  // ============================================
  /**
   * Get formatted list of all hotkeys for UI display
   * @param appId Optional - filter by app ID
   * @returns Formatted hotkey data with display-friendly accelerators
   */
  async getFormattedList(appId) {
    return await import_electron.ipcRenderer.invoke("hotkey:getFormattedList", appId);
  },
  /**
   * Change a hotkey's key binding
   * @param hotkeyId The hotkey ID to rebind
   * @param newAccelerator New Electron accelerator string (e.g., "Ctrl+Shift+B")
   * @returns Success/error result
   */
  async updateAccelerator(hotkeyId, newAccelerator) {
    return await import_electron.ipcRenderer.invoke("hotkey:updateAccelerator", hotkeyId, newAccelerator);
  },
  /**
   * Reset a hotkey to its default binding
   * @param hotkeyId The hotkey ID to reset
   * @returns true if successful
   */
  async resetToDefault(hotkeyId) {
    return await import_electron.ipcRenderer.invoke("hotkey:resetToDefault", hotkeyId);
  },
  /**
   * Check if an accelerator conflicts with existing hotkeys
   * @param accelerator The accelerator to check
   * @param excludeId Optional hotkey ID to exclude from check
   * @returns Conflict info with list of conflicting hotkeys
   */
  async checkConflict(accelerator, excludeId) {
    return await import_electron.ipcRenderer.invoke("hotkey:checkConflict", accelerator, excludeId);
  },
  /**
   * Get hotkey system settings
   * @returns Current settings including globalEnabled and onlyWhenRsFocused
   */
  async getSettings() {
    return await import_electron.ipcRenderer.invoke("hotkey:getSettings");
  },
  /**
   * Update hotkey system settings
   * @param updates Partial settings to update
   */
  async updateSettings(updates) {
    return await import_electron.ipcRenderer.invoke("hotkey:updateSettings", updates);
  },
  /**
   * Get current RS focus state
   * @returns Focus state including whether RS is focused
   */
  async getFocusState() {
    return await import_electron.ipcRenderer.invoke("focus:getState");
  },
  /**
   * Set global override to allow hotkeys even when RS not focused
   * @param allow true to enable global override
   */
  async setGlobalOverride(allow) {
    return await import_electron.ipcRenderer.invoke("focus:setGlobalOverride", allow);
  }
};
window.rs3buddyHotkeys = hotkeyApi;
console.log("[AppWindowPreload] rs3buddyHotkeys API exposed");
if (nativeAddon) {
  window.native = nativeAddon;
  console.log("[AppWindowPreload] Native addon also exposed as window.native");
}
var titlebarTitle = "Loading...";
var titlebarStyleElement = null;
var TITLEBAR_CSS = `
  #rs3buddy-titlebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: linear-gradient(180deg, rgba(40, 40, 40, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 0 10px;
    z-index: 999999;
    -webkit-app-region: drag;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    transition: background-color 0.15s, color 0.15s;
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
  /* Push content below titlebar */
  html {
    overflow: auto !important;
  }
  body {
    overflow: auto !important;
    margin: 0 !important;
    padding: 28px 0 0 0 !important;
  }
  /* Custom scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.5);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(128, 128, 128, 0.7);
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
`;
function ensureTitlebarStyle() {
  if (titlebarStyleElement && titlebarStyleElement.parentNode)
    return;
  titlebarStyleElement = document.createElement("style");
  titlebarStyleElement.id = "rs3buddy-titlebar-style";
  titlebarStyleElement.textContent = TITLEBAR_CSS;
  if (document.head) {
    document.head.appendChild(titlebarStyleElement);
  }
}
function createTitlebarElement() {
  const titlebar = document.createElement("div");
  titlebar.id = "rs3buddy-titlebar";
  const titleText = document.createElement("span");
  titleText.id = "rs3buddy-title";
  titleText.textContent = titlebarTitle;
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
  titlebar.appendChild(closeBtn);
  return titlebar;
}
function injectTitlebar() {
  if (document.getElementById("rs3buddy-titlebar"))
    return;
  if (!document.body)
    return;
  ensureTitlebarStyle();
  const titlebar = createTitlebarElement();
  document.body.insertBefore(titlebar, document.body.firstChild);
  console.log("[Titlebar] Injected");
}
function watchTitlebar() {
  const bodyObserver = new MutationObserver(() => {
    if (!document.getElementById("rs3buddy-titlebar") && document.body) {
      console.log("[Titlebar] Detected removal, re-injecting");
      injectTitlebar();
    }
  });
  if (document.body) {
    bodyObserver.observe(document.body, { childList: true });
  }
  const htmlObserver = new MutationObserver(() => {
    if (document.body && !document.getElementById("rs3buddy-titlebar")) {
      console.log("[Titlebar] Detected body replacement, re-injecting");
      bodyObserver.disconnect();
      injectTitlebar();
      bodyObserver.observe(document.body, { childList: true });
    }
  });
  htmlObserver.observe(document.documentElement, { childList: true });
  setInterval(() => {
    if (document.body && !document.getElementById("rs3buddy-titlebar")) {
      console.log("[Titlebar] Periodic check: titlebar missing, re-injecting");
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
  if (!document.getElementById("rs3buddy-titlebar")) {
    console.log("[Titlebar] Re-injecting after window load");
    injectTitlebar();
  }
});
debug("Preload script complete!");
