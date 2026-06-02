/**
 * App Window Preload Script
 * Loads native addon and exposes Alt1GL API for apps
 * Works with nodeIntegration enabled to match alt1gl-main behavior
 */

// IMMEDIATE logging before ANY imports - to detect if preload even starts
const fs = require('fs');
const debugLogPath = `/tmp/alt1gl-preload-${process.pid}.log`;
try {
  fs.writeFileSync(debugLogPath, `=== Preload IMMEDIATE START PID=${process.pid} time=${Date.now()} ===\n`);
} catch (e) {
  // Can't even write to log file
}

import { ipcRenderer } from 'electron';
import * as path from 'path';

const debug = (msg: string) => {
  const fullMsg = `[PRELOAD ${new Date().toISOString()}] ${msg}\n`;
  console.log(fullMsg.trim());
  try {
    fs.appendFileSync(debugLogPath, fullMsg);
  } catch (e) {
    // ignore write errors
  }
  // Also send to main process
  try {
    ipcRenderer.send('debug-log', fullMsg.trim());
  } catch (e) {
    // ipcRenderer might not be ready
  }
};

debug('Starting preload script...');

// DEBUG: Skip native addon loading to test if that's causing the crash
const SKIP_NATIVE_ADDON = process.env.SKIP_NATIVE_ADDON === '1';
if (SKIP_NATIVE_ADDON) {
  console.log('[AppWindowPreload] SKIP_NATIVE_ADDON is set - skipping native addon loading');
}

const IS_LINUX = process.platform === 'linux';

// Clean up stale shared memory files from previous sessions (Linux only)
function cleanupStaleSharedMemory() {
  if (!IS_LINUX) return;

  try {
    const shmDir = '/dev/shm';
    const files = fs.readdirSync(shmDir);
    const alt1Files = files.filter((f: string) => f.startsWith('alt1link_'));

    if (alt1Files.length === 0) return;

    // Get list of running process IDs
    const runningPids = new Set<number>();
    try {
      const procFiles = fs.readdirSync('/proc');
      for (const f of procFiles) {
        const pid = parseInt(f, 10);
        if (!isNaN(pid)) {
          runningPids.add(pid);
        }
      }
    } catch (e) {
      debug('Could not read /proc: ' + e);
      return;
    }

    let cleaned = 0;
    for (const file of alt1Files) {
      // Parse PID from filename like "alt1link_12345" or "alt1link_12345_inst_1"
      const match = file.match(/^alt1link_(\d+)/);
      if (match) {
        const pid = parseInt(match[1], 10);
        // If the process is not running, remove the shared memory file
        if (!runningPids.has(pid)) {
          try {
            fs.unlinkSync(path.join(shmDir, file));
            cleaned++;
          } catch (e) {
            // Ignore errors (file might be in use or permission denied)
          }
        }
      }
    }

    if (cleaned > 0) {
      debug(`Cleaned up ${cleaned} stale shared memory files`);
    }
  } catch (e) {
    debug('Error cleaning up shared memory: ' + e);
  }
}

// Run cleanup on startup
cleanupStaleSharedMemory();

// Get the native addon path from the launcher's build directory
function getNativeAddonPath(): string | null {
  if (SKIP_NATIVE_ADDON) {
    return null;
  }
  // On Linux, try to load the native addon directly first
  // If it crashes, we'll need to use IPC to communicate with the main process
  if (IS_LINUX) {
    debug('Linux detected - attempting direct addon loading in packaged app');
  }
  // In development, the preload.js is at launcher/dist/app-window/preload.js
  // Native files are at build/Release or build/Debug
  const preloadDir = __dirname;
  debug('Preload directory: ' + preloadDir);

  // Try various paths relative to the launcher structure
  // Our project builds patchrs addon.node and injected.dll
  const basePaths = [
    // Development paths from launcher/app-window (preload.js location)
    path.resolve(preloadDir, '..', '..', 'build', 'Release'),
    path.resolve(preloadDir, '..', '..', 'build', 'Debug'),
    // Alternative development paths
    path.resolve(preloadDir, '..', '..', '..', 'build', 'Release'),
    path.resolve(preloadDir, '..', '..', '..', 'build', 'Debug'),
    // Packaged app paths
    path.resolve(process.resourcesPath || '', 'lib'),
  ];

  for (const basePath of basePaths) {
    const addonPath = path.join(basePath, 'addon.node');
    debug('Checking: ' + addonPath);
    if (fs.existsSync(addonPath)) {
      debug('Found native addon at: ' + addonPath);
      return addonPath;
    }
  }

  debug('ERROR: Native addon not found in any of the paths');
  return null;
}

// Load the native addon - wrapped in try/catch to ensure UI loads even if addon fails
let nativeAddon: any = null;
let addonPath: string | null = null;
let addonLoadError: Error | null = null;

try {
  addonPath = getNativeAddonPath();
  debug('Platform: ' + process.platform);
  debug('Addon path result: ' + addonPath);
} catch (e) {
  debug('ERROR getting addon path: ' + e);
  addonLoadError = e as Error;
}

if (addonPath && !addonLoadError) {
  debug('Attempting to load native addon...');
  debug('Process type: ' + process.type);
  debug('Node version: ' + process.versions.node);
  debug('Electron version: ' + process.versions.electron);

  try {
    // Use regular require since we have nodeIntegration enabled
    debug('Calling require()...');
    nativeAddon = require(addonPath);
    debug('Native addon loaded successfully');
    debug('Addon keys: ' + Object.keys(nativeAddon).join(', '));

    debug('Setting up Module._load hook...');
    // IMPORTANT: Hook Module._load to redirect addon.node loads to our path
    // This allows apps bundled with patchrs_napi to find the addon even though
    // they look for it in ./build/release/addon.node
    const Module = require('module');
    const originalLoad = Module._load;
    const addonDir = path.dirname(addonPath);

    Module._load = function(request: string, parent: any, isMain: boolean) {
      // Intercept requests for addon.node or addon-*.node
      if (request.endsWith('addon.node') || /addon-\d+\.node$/.test(request)) {
        debug('Intercepted addon load request: ' + request);
        return nativeAddon;
      }
      // Intercept requests for injected library paths (for injectDll)
      // Handle both .dll (Windows) and .so (Linux)
      if (request.endsWith('injected.dll') || /injected-\d+\.dll$/.test(request) ||
          request.endsWith('injected.so') || /injected-\d+\.so$/.test(request)) {
        // Return the path to our injected library
        const libExt = process.platform === 'win32' ? 'injected.dll' : 'injected.so';
        const injectedPath = path.join(addonDir, libExt);
        debug('Intercepted injected library request: ' + injectedPath);
      }
      return originalLoad.apply(this, [request, parent, isMain]);
    };
    debug('Module loader hook installed');

    // Set up debug log callback
    debug('Setting up debug log callback...');
    if (nativeAddon?.debug?.setLogCb) {
      nativeAddon.debug.setLogCb((message: string) => {
        // Filter out noisy buffer allocation messages
        if (message.includes('bufferdata')) {
          const m = message.match(/bufferdata (\d+)\->(\d+)/);
          if (m) {
            const dif = Number(m[1]) - Number(m[2]);
            if (dif > 1e6) {
              console.log('[NativeLog] Large alloc:', dif);
            }
          }
        } else {
          console.info('[NativeLog]', message);
        }
      });
    }

    debug('Debug log callback set up');

    // Check if RS is already hooked (by main process), if not try to connect
    // This is similar to hookFirstClient() in patchrs_napi.ts
    debug('Checking RS ready status...');
    try {
      const rsReady = nativeAddon.getRsReady();
      debug('RS ready status: ' + rsReady);

      // When the page is reloaded after a new RS client starts (onGameStarted),
      // the cached native addon may report rsReady=true from the old (dead) shared memory.
      // We must cleanly disconnect first, then connect to the new PID.
      // IMPORTANT: Do NOT call exitDll() then injectDll() on a connection that may have
      // stale shared memory - this can corrupt the game-side heap and cause assertion
      // failures in injected.dll. Instead, always exitDll() first (safe teardown) and
      // then only injectDll() for the new PID if it differs from what we had.
      if (rsReady) {
        try {
          const currentState = ipcRenderer.sendSync('app-window:get-injection-state-sync') as { pid: number; dllPath: string; instanceId: number } | null;
          if (currentState && currentState.pid > 0) {
            // Check if the window size makes sense (dead connections return stale/garbage values)
            let rsW = 0, rsH = 0;
            try {
              rsW = nativeAddon.getRsWidth();
              rsH = nativeAddon.getRsHeight();
            } catch (e) {
              debug('getRsWidth/Height threw (connection already dead): ' + e);
            }
            const looksStale = rsW <= 0 || rsH <= 0;
            if (looksStale) {
              debug(`RS appears stale (size=${rsW}x${rsH}), disconnecting old session before reconnect`);
              // Cleanly tear down the old connection without touching shared memory
              try { nativeAddon.exitDll(); } catch (e) { debug('exitDll error (ok): ' + e); }

              // Small delay to let the old shared memory settle before opening new connection
              const waitStart = Date.now();
              while (Date.now() - waitStart < 200) { /* busy wait */ }

              try {
                let result: any = null;
                if (currentState.dllPath) {
                  result = nativeAddon.debug.injectDll(currentState.pid, currentState.dllPath);
                } else {
                  debug('Empty dllPath = reconnect case, using connectToOverlay');
                  result = nativeAddon.debug.connectToOverlay(currentState.pid);
                }
                debug('Reconnection result: ' + JSON.stringify(result));
                if (result) {
                  debug('Successfully reconnected to PID ' + currentState.pid + '! Instance ID: ' + result.instanceid);
                }
              } catch (e) {
                debug('Connection failed during reconnect (game may need restart): ' + e);
              }
            } else {
              debug(`RS connection looks healthy (size=${rsW}x${rsH}), keeping current connection`);
            }
          }
        } catch (e) {
          debug('PID check during reconnect: ' + e);
        }
      }

      if (!rsReady) {
        debug('RS not ready, attempting to connect SYNCHRONOUSLY...');

        // IMPORTANT: We need to connect BEFORE the app code runs.
        // Use sendSync to get injection state synchronously so the addon is connected
        // before globalThis.alt1gl is used by the app.
        const injectionState = ipcRenderer.sendSync('app-window:get-injection-state-sync') as { pid: number; dllPath: string; instanceId: number } | null;
        debug('Got injection state (sync): ' + JSON.stringify(injectionState));

        if (injectionState && injectionState.pid > 0) {
          // Main process already injected - use the same DLL path to connect
          debug('Main process already injected into PID: ' + injectionState.pid);
          debug('Using DLL path: ' + injectionState.dllPath);

          // Get the addon directory for checking shared memory
          const addonDir = path.dirname(addonPath!);

          // On Linux, check if overlay shared memory exists before trying to connect
          if (IS_LINUX) {
            const shmPath = `/dev/shm/alt1link_${injectionState.pid}`;
            debug('Checking for overlay shared memory at: ' + shmPath);

            let shmExists = false;
            for (let retry = 0; retry < 10; retry++) {
              if (fs.existsSync(shmPath)) {
                shmExists = true;
                break;
              }
              if (retry < 9) {
                debug(`Shared memory not found yet, retry ${retry + 1}/10...`);
                // Synchronous sleep
                const start = Date.now();
                while (Date.now() - start < 500) { /* busy wait 500ms */ }
              }
            }

            if (!shmExists) {
              debug('ERROR: Overlay shared memory not found after retries!');
            } else {
              // Also check for instance memory
              const instPath = `/dev/shm/alt1link_${injectionState.pid}_inst_1`;
              debug('Checking for GL server instance at: ' + instPath);
              let instExists = false;
              for (let retry = 0; retry < 20; retry++) {
                if (fs.existsSync(instPath)) {
                  instExists = true;
                  break;
                }
                if (retry < 19) {
                  debug(`GL server instance not ready yet, retry ${retry + 1}/20...`);
                  const start = Date.now();
                  while (Date.now() - start < 500) { /* busy wait 500ms */ }
                }
              }

              if (instExists) {
                debug('GL server instance memory found! Connecting...');
                try {
                  const result = nativeAddon.debug.injectDll(injectionState.pid, injectionState.dllPath);
                  debug('Connection result: ' + JSON.stringify(result));
                  if (result) {
                    debug('Successfully connected to existing session! Instance ID: ' + result.instanceid);
                  } else {
                    debug('Failed to connect to existing session');
                  }
                } catch (e) {
                  debug('Error connecting to session: ' + e);
                }
              } else {
                debug('WARNING: GL server instance memory not found after 10s!');
              }
            }
          } else {
            // Windows path - connect to shared memory
            try {
              let result: any = null;
              if (injectionState.dllPath) {
                // Fresh injection - use injectDll with DLL path
                result = nativeAddon.debug.injectDll(injectionState.pid, injectionState.dllPath);
              } else {
                // Reconnect case (launcher restarted, DLL already loaded) - use connectToOverlay
                debug('Empty dllPath = reconnect case, using connectToOverlay');
                result = nativeAddon.debug.connectToOverlay(injectionState.pid);
              }
              debug('Connection result: ' + JSON.stringify(result));
              if (result) {
                debug('Successfully connected to existing session! Instance ID: ' + result.instanceid);
              } else {
                debug('Failed to connect to existing session');
              }
            } catch (e) {
              debug('Error connecting to session: ' + e);
            }
          }
        } else {
          // No injection state from main - try SYNCHRONOUS direct injection
          // This is critical: we must connect BEFORE globalThis.alt1gl is exposed
          debug('No injection state from main, trying SYNCHRONOUS direct injection...');
          const addonDir = path.dirname(addonPath!);
          const pids = nativeAddon.debug.getExePids('rs2client.exe');
          debug('Found RS PIDs: ' + JSON.stringify(pids));

          if (pids.length > 0) {
            const injectedLibPath = process.platform === 'win32'
              ? path.join(addonDir, 'injected.dll')
              : path.join(addonDir, 'injected.so');
            debug('Attempting SYNC injection with: ' + injectedLibPath);

            if (fs.existsSync(injectedLibPath)) {
              // On Linux, wait for shared memory to be ready
              if (IS_LINUX) {
                const shmPath = `/dev/shm/alt1link_${pids[0]}`;
                debug('Checking for overlay shared memory at: ' + shmPath);

                let shmExists = false;
                for (let retry = 0; retry < 10; retry++) {
                  if (fs.existsSync(shmPath)) {
                    shmExists = true;
                    break;
                  }
                  if (retry < 9) {
                    debug(`Shared memory not found yet, retry ${retry + 1}/10...`);
                    const start = Date.now();
                    while (Date.now() - start < 500) { /* busy wait 500ms */ }
                  }
                }

                if (shmExists) {
                  // Also check for instance memory
                  const instPath = `/dev/shm/alt1link_${pids[0]}_inst_1`;
                  debug('Checking for GL server instance at: ' + instPath);
                  let instExists = false;
                  for (let retry = 0; retry < 20; retry++) {
                    if (fs.existsSync(instPath)) {
                      instExists = true;
                      break;
                    }
                    if (retry < 19) {
                      debug(`GL server instance not ready yet, retry ${retry + 1}/20...`);
                      const start = Date.now();
                      while (Date.now() - start < 500) { /* busy wait 500ms */ }
                    }
                  }

                  if (instExists) {
                    debug('GL server ready, calling connectToOverlay (SYNC)...');
                    try {
                      // Linux uses connectToOverlay instead of injectDll
                      const result = nativeAddon.debug.connectToOverlay(pids[0]);
                      debug('SYNC connection result: ' + JSON.stringify(result));
                      if (result && result.instanceid) {
                        debug('Notifying main process of injection state...');
                        ipcRenderer.send('app-window:set-injection-state', {
                          pid: pids[0],
                          dllPath: injectedLibPath,
                          instanceId: result.instanceid
                        });
                      }
                    } catch (injectErr) {
                      debug('ERROR during SYNC connectToOverlay call: ' + injectErr);
                    }
                  } else {
                    debug('WARNING: GL server instance memory not found after 10s!');
                  }
                } else {
                  debug('ERROR: Overlay shared memory not found after retries!');
                }
              } else {
                // Windows - connect directly
                try {
                  debug('Calling injectDll (SYNC, Windows)...');
                  const result = nativeAddon.debug.injectDll(pids[0], injectedLibPath);
                  debug('SYNC injection result: ' + JSON.stringify(result));
                  if (result && result.instanceid) {
                    ipcRenderer.send('app-window:set-injection-state', {
                      pid: pids[0],
                      dllPath: injectedLibPath,
                      instanceId: result.instanceid
                    });
                  }
                } catch (injectErr) {
                  debug('ERROR during SYNC injectDll call: ' + injectErr);
                }
              }
            } else {
              debug('ERROR: injected library not found at: ' + injectedLibPath);
            }
          } else {
            debug('ERROR: No RS PIDs found!');
          }
        }

        // Check if sync path succeeded
        const alreadyConnected = nativeAddon.getRsReady();
        if (alreadyConnected) {
          debug('Successfully connected SYNCHRONOUSLY!');
        } else {
          debug('WARNING: Sync connection did not succeed - app may have issues');
        }
      } else {
        debug('RS already hooked in this addon instance!');
      }
    } catch (e) {
      debug('Error checking RS status: ' + e);
    }
  } catch (e) {
    debug('Failed to load native addon: ' + e);
    debug('Stack: ' + (e as Error).stack);
    addonLoadError = e as Error;
    nativeAddon = null;  // Ensure we don't use a partially loaded addon
  }
}

debug('Preload main code complete, setting up globalThis.alt1gl...');
if (addonLoadError) {
  debug('WARNING: Native addon failed to load - app will run without native features');
  debug('Error was: ' + addonLoadError.message);
}

// Expose native addon as globalThis.alt1gl for patchrs_napi.ts compatibility
// This is the key - patchrs_napi.ts checks for this in non-webpack (CEF) environments
if (nativeAddon) {
  // Get the addon directory - used for exposing path and for fs hooks
  const addonDir = path.dirname(addonPath!);

  // Also expose the native directory so apps can find the libraries
  (globalThis as any).alt1glNativeDir = addonDir;
  debug('Native directory exposed as globalThis.alt1glNativeDir: ' + addonDir);
  (globalThis as any).alt1gl = nativeAddon;
  debug('Native addon exposed as globalThis.alt1gl');

  // Use the launcher's main-process IPC for mouse position with debug diagnostics.
  if (!nativeAddon.overlay) {
    nativeAddon.overlay = {};
  }

  let mouseLogCount = 0;
  nativeAddon.overlay.getMousePosition = (): { x: number; y: number } | null => {
    try {
      mouseLogCount++;
      const shouldLog = mouseLogCount <= 5 || mouseLogCount % 600 === 0;

      // Sync IPC to main process - returns physical pixel client coords or null
      const result = ipcRenderer.sendSync('native:getMousePosition-sync');

      if (shouldLog) {
        // Also log what the renderer's own addon thinks for comparison
        let localInfo = '';
        try {
          const rsX = nativeAddon!.getRsX();
          const rsY = nativeAddon!.getRsY();
          const rsW = nativeAddon!.getRsWidth();
          const rsH = nativeAddon!.getRsHeight();
          localInfo = ` localAddon:rs=(${rsX},${rsY}) size=(${rsW}x${rsH})`;
        } catch (e) {
          localInfo = ` localAddon:error=${e}`;
        }

        debug(`[Mouse] #${mouseLogCount} ipcResult=${result ? `(${result.x},${result.y})` : 'null'}${localInfo}`);
      }

      return result;
    } catch (e) {
      if (mouseLogCount <= 5) debug('[Mouse] Error: ' + e);
      return null;
    }
  };
  debug('overlay.getMousePosition patched (via launcher IPC)');

  // CRITICAL: Also hook fs.statSync to make addon.node paths appear to exist
  // This is needed because patchrs_napi.ts checks if files exist before requiring
  const fsModule = require('fs');
  const originalStatSync = fsModule.statSync;

  fsModule.statSync = function(pathArg: string, options?: any) {
    // Intercept statSync calls for addon.node
    if (pathArg.endsWith('addon.node') || /addon-\d+\.node$/.test(pathArg)) {
      console.log('[AppWindowPreload] Intercepted statSync for:', pathArg);
      // Return fake stats that look like a recent file
      return {
        size: 1000000,
        mtimeMs: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: () => false,
        isFile: () => true
      };
    }
    // Intercept statSync calls for injected library (.dll on Windows, .so on Linux)
    if (pathArg.endsWith('injected.dll') || /injected-\d+\.dll$/.test(pathArg) ||
        pathArg.endsWith('injected.so') || /injected-\d+\.so$/.test(pathArg)) {
      console.log('[AppWindowPreload] Intercepted statSync for:', pathArg);
      // Check if our injected library exists
      const libName = process.platform === 'win32' ? 'injected.dll' : 'injected.so';
      const ourInjectedPath = path.join(addonDir, libName);
      if (fsModule.existsSync(ourInjectedPath)) {
        return originalStatSync.call(this, ourInjectedPath, options);
      }
      // Return fake stats
      return {
        size: 500000,
        mtimeMs: Date.now(),
        modifiedTime: Date.now(),
        isDirectory: () => false,
        isFile: () => true
      };
    }
    return originalStatSync.call(this, pathArg, options);
  };
  console.log('[AppWindowPreload] fs.statSync hook installed');

  // Also hook fs.readFileSync for library files (.dll on Windows, .so on Linux)
  const originalReadFileSync = fsModule.readFileSync;
  fsModule.readFileSync = function(pathArg: string, options?: any) {
    if (pathArg.endsWith('injected.dll') || /injected-\d+\.dll$/.test(pathArg) ||
        pathArg.endsWith('injected.so') || /injected-\d+\.so$/.test(pathArg)) {
      console.log('[AppWindowPreload] Intercepted readFileSync for:', pathArg);
      const libName = process.platform === 'win32' ? 'injected.dll' : 'injected.so';
      const ourInjectedPath = path.join(addonDir, libName);
      if (fsModule.existsSync(ourInjectedPath)) {
        return originalReadFileSync.call(this, ourInjectedPath, options);
      }
    }
    return originalReadFileSync.call(this, pathArg, options);
  };
  console.log('[AppWindowPreload] fs.readFileSync hook installed');

  // Hook fs.readdirSync to return our native files directory contents
  const originalReaddirSync = fsModule.readdirSync;
  fsModule.readdirSync = function(pathArg: string, options?: any) {
    // If looking in build/release or build/debug, return contents of our addon dir
    if (pathArg.includes('build') && (pathArg.includes('release') || pathArg.includes('debug') || pathArg.includes('Release') || pathArg.includes('Debug'))) {
      console.log('[AppWindowPreload] Intercepted readdirSync for:', pathArg, '-> redirecting to:', addonDir);
      try {
        return originalReaddirSync.call(this, addonDir, options);
      } catch (e) {
        console.log('[AppWindowPreload] readdirSync redirect failed, using original path');
      }
    }
    return originalReaddirSync.call(this, pathArg, options);
  };
  console.log('[AppWindowPreload] fs.readdirSync hook installed');

  // Hook fs.copyFileSync to skip addon copies (we intercept require anyway)
  const originalCopyFileSync = fsModule.copyFileSync;
  fsModule.copyFileSync = function(src: string, dest: string) {
    if (src.endsWith('addon.node') || /addon-\d+\.node$/.test(src) || dest.endsWith('addon.node') || /addon-\d+\.node$/.test(dest)) {
      console.log('[AppWindowPreload] Skipping copyFileSync for addon (will use pre-loaded addon):', src, '->', dest);
      // Skip the copy - we'll intercept the require and return our pre-loaded addon
      return;
    }
    // Handle both .dll (Windows) and .so (Linux) for injected library
    if (src.endsWith('injected.dll') || /injected-\d+\.dll$/.test(src) ||
        src.endsWith('injected.so') || /injected-\d+\.so$/.test(src)) {
      console.log('[AppWindowPreload] Intercepted copyFileSync for injected library:', src, '->', dest);
      const libName = process.platform === 'win32' ? 'injected.dll' : 'injected.so';
      const ourInjectedPath = path.join(addonDir, libName);
      // Make sure destination directory exists
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
  console.log('[AppWindowPreload] fs.copyFileSync hook installed');
} else {
  console.warn('[AppWindowPreload] Native addon not available, globalThis.alt1gl will be null');
}

// Window control API (keep for titlebar close button)
const appWindowApi = {
  close: () => ipcRenderer.send('app-window:close'),
  getTitle: () => ipcRenderer.invoke('app-window:get-title'),
  getGamePid: () => ipcRenderer.invoke('app-window:get-game-pid'),
  /** Signal the launcher to refresh daily info (e.g. after VoS submission) */
  notifyDailyInfoChanged: () => ipcRenderer.send('invalidate-daily-info'),
  /** Write a JSON file to the app's persistent data directory */
  writeAppData: (appName: string, filename: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('app-data:write', appName, filename, data),
  /** Read a JSON file from the app's persistent data directory */
  readAppData: (appName: string, filename: string): Promise<string | null> =>
    ipcRenderer.invoke('app-data:read', appName, filename),
};

// Expose appWindowApi globally
(window as any).appWindowApi = appWindowApi;
console.log('[AppWindowPreload] appWindowApi exposed');

// ============================================
// Hotkey API for app developers
// ============================================

// Modifier key constants
const Modifiers = {
  None: 0x00,
  Ctrl: 0x01,
  Alt: 0x02,
  Shift: 0x04,
  Win: 0x08,
  // Common combinations
  CtrlAlt: 0x03,
  CtrlShift: 0x05,
  AltShift: 0x06,
  CtrlAltShift: 0x07,
} as const;

// Common key codes
const Keys = {
  // Letters
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45,
  F: 0x46, G: 0x47, H: 0x48, I: 0x49, J: 0x4A,
  K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E, O: 0x4F,
  P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54,
  U: 0x55, V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,
  // Numbers
  Num0: 0x30, Num1: 0x31, Num2: 0x32, Num3: 0x33, Num4: 0x34,
  Num5: 0x35, Num6: 0x36, Num7: 0x37, Num8: 0x38, Num9: 0x39,
  // Function keys
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75,
  F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,
  // Special
  Space: 0x20, Enter: 0x0D, Escape: 0x1B, Tab: 0x09,
  Backspace: 0x08, Delete: 0x2E, Insert: 0x2D,
  Home: 0x24, End: 0x23, PageUp: 0x21, PageDown: 0x22,
  Left: 0x25, Up: 0x26, Right: 0x27, Down: 0x28,
} as const;

// Hotkey callback storage
const hotkeyCallbacks = new Map<number, (event: any) => void>();
const actionCallbacks = new Map<string, (event: any) => void>();

// Listen for hotkey events from main process
ipcRenderer.on('hotkey-pressed', (_event, data: { hotkeyId: number; action: string; accelerator: string }) => {
  console.log('[Hotkeys] Received hotkey event:', data);

  // Call specific hotkey callback
  const specificCb = hotkeyCallbacks.get(data.hotkeyId);
  if (specificCb) {
    specificCb(data);
  }

  // Call action-based callback
  const actionCb = actionCallbacks.get(data.action);
  if (actionCb) {
    actionCb(data);
  }
});

// ============================================
// Conflict Resolution via Main Window
// ============================================

interface ConflictResolutionResult {
  success: boolean;
  hotkeyId: number;
  hadConflict: boolean;
  conflictingApp?: string;
  usedAlternative: boolean;
  originalAccelerator: string;
  finalAccelerator: string;
  alternativeSuggestion?: {
    accelerator: string;
    modifiers: string;
  } | null;
}

interface HotkeyConflictResponse {
  requestId: string;
  accepted: boolean;
  useAlternative: boolean;
  openSettings: boolean;
}

/**
 * Show conflict resolution dialog via main launcher window
 * Returns the hotkey ID if registered, or -1 if user declined
 */
async function showConflictResolutionDialog(
  result: ConflictResolutionResult,
  action: string,
  appId: string,
  modifiers: number,
  keyCode: number,
  callback?: (event: any) => void
): Promise<{ hotkeyId: number; usedAlternative: boolean; finalAccelerator: string }> {
  // Generate unique request ID
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Build conflict request for main window
  const request = {
    requestId,
    appName: appId,
    originalAccelerator: result.originalAccelerator,
    conflictingAppName: result.conflictingApp || 'Unknown App',
    alternativeSuggestion: result.alternativeSuggestion
  };

  // Send to main process which forwards to main window
  const response = await ipcRenderer.invoke(
    'hotkey:showConflictDialog',
    request,
    modifiers,
    keyCode,
    action
  ) as HotkeyConflictResponse;

  if (response.useAlternative && result.alternativeSuggestion) {
    // User accepted alternative - register with it
    const newResult = await ipcRenderer.invoke(
      'hotkey:registerWithConflictCheck',
      modifiers, keyCode, action, appId, true
    ) as ConflictResolutionResult;

    if (newResult.success && callback && newResult.hotkeyId > 0) {
      hotkeyCallbacks.set(newResult.hotkeyId, callback);
    }

    return {
      hotkeyId: newResult.hotkeyId,
      usedAlternative: true,
      finalAccelerator: newResult.finalAccelerator
    };
  }

  // User declined or opened settings
  return {
    hotkeyId: -1,
    usedAlternative: false,
    finalAccelerator: result.originalAccelerator
  };
}

/**
 * Show conflict resolution dialog for accelerator-based registration
 */
async function showConflictResolutionDialogForAccelerator(
  result: ConflictResolutionResult,
  action: string,
  appId: string,
  originalAccelerator: string,
  callback?: (event: any) => void
): Promise<{ hotkeyId: number; usedAlternative: boolean; finalAccelerator: string }> {
  // Generate unique request ID
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Build conflict request for main window
  const request = {
    requestId,
    appName: appId,
    originalAccelerator: originalAccelerator,
    conflictingAppName: result.conflictingApp || 'Unknown App',
    alternativeSuggestion: result.alternativeSuggestion
  };

  // Send to main process which forwards to main window
  const response = await ipcRenderer.invoke(
    'hotkey:showConflictDialog',
    request,
    0, // modifiers not needed for accelerator-based
    0, // keyCode not needed for accelerator-based
    action
  ) as HotkeyConflictResponse;

  if (response.useAlternative && result.alternativeSuggestion) {
    // User accepted alternative - register with it
    const suggestedKey = result.alternativeSuggestion.accelerator;
    const hotkeyId = await ipcRenderer.invoke('hotkey:registerAccelerator', suggestedKey, action, appId);

    if (callback && hotkeyId > 0) {
      hotkeyCallbacks.set(hotkeyId, callback);
    }

    return {
      hotkeyId,
      usedAlternative: true,
      finalAccelerator: suggestedKey
    };
  }

  // User declined or opened settings
  return {
    hotkeyId: -1,
    usedAlternative: false,
    finalAccelerator: originalAccelerator
  };
}

// Hotkey API interface
interface HotkeyInfo {
  id: number;
  appId: string;
  accelerator: string;
  action: string;
  enabled: boolean;
  windowId?: number;
}

const hotkeyApi = {
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
   * const id = await alt1Hotkeys.register(
   *   alt1Hotkeys.Modifiers.Ctrl | alt1Hotkeys.Modifiers.Shift,
   *   alt1Hotkeys.Keys.A,
   *   'my-action',
   *   (event) => console.log('Hotkey pressed!')
   * );
   */
  async register(
    modifiers: number,
    keyCode: number,
    action: string,
    callback?: (event: { hotkeyId: number; action: string; accelerator: string }) => void
  ): Promise<number> {
    const appId = await ipcRenderer.invoke('app-window:get-title') || 'unknown-app';

    // Use smart conflict detection
    const result = await ipcRenderer.invoke(
      'hotkey:registerWithConflictCheck',
      modifiers, keyCode, action, appId, false
    ) as ConflictResolutionResult;

    if (result.success) {
      // No conflict, registered successfully
      if (callback && result.hotkeyId > 0) {
        hotkeyCallbacks.set(result.hotkeyId, callback);
      }
      return result.hotkeyId;
    }

    if (result.hadConflict) {
      // Conflict detected - show resolution dialog
      const resolution = await showConflictResolutionDialog(
        result, action, appId, modifiers, keyCode, callback
      );
      return resolution.hotkeyId;
    }

    // Registration failed for other reason
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
   * const id = await alt1Hotkeys.registerAccelerator('Ctrl+Shift+R', 'reload-data');
   */
  async registerAccelerator(
    accelerator: string,
    action: string,
    callback?: (event: { hotkeyId: number; action: string; accelerator: string }) => void,
    skipConflictCheck?: boolean
  ): Promise<number> {
    const appId = await ipcRenderer.invoke('app-window:get-title') || 'unknown-app';

    if (skipConflictCheck) {
      // Legacy behavior - register directly without conflict check
      const hotkeyId = await ipcRenderer.invoke('hotkey:registerAccelerator', accelerator, action, appId);
      if (callback && hotkeyId > 0) {
        hotkeyCallbacks.set(hotkeyId, callback);
      }
      return hotkeyId;
    }

    // Check for conflicts first
    const conflict = await ipcRenderer.invoke('hotkey:checkConflict', accelerator) as {
      hasConflict: boolean;
      conflictingHotkeys: Array<{ id: number; appId: string; accelerator: string; action: string }>;
    };

    // Filter conflicts to only include OTHER apps
    const otherAppConflicts = conflict.conflictingHotkeys.filter(hk => hk.appId !== appId);

    if (!conflict.hasConflict || otherAppConflicts.length === 0) {
      // No conflict with other apps - register directly
      const hotkeyId = await ipcRenderer.invoke('hotkey:registerAccelerator', accelerator, action, appId);
      if (callback && hotkeyId > 0) {
        hotkeyCallbacks.set(hotkeyId, callback);
      }
      return hotkeyId;
    }

    // Find alternative
    const alternative = await ipcRenderer.invoke('hotkey:findAlternative', accelerator, appId) as {
      available: boolean;
      alternative: string | null;
      originalModifiers: string;
      alternativeModifiers: string | null;
      key: string;
    };

    // Create a ConflictResolutionResult-like object for the dialog
    const result: ConflictResolutionResult = {
      success: false,
      hotkeyId: -1,
      hadConflict: true,
      conflictingApp: otherAppConflicts[0]?.appId || 'Unknown App',
      usedAlternative: false,
      originalAccelerator: accelerator,
      finalAccelerator: accelerator,
      alternativeSuggestion: alternative.available && alternative.alternative ? {
        accelerator: alternative.alternative,
        modifiers: alternative.alternativeModifiers || ''
      } : null
    };

    // Show conflict dialog
    const resolution = await showConflictResolutionDialogForAccelerator(
      result, action, appId, accelerator, callback
    );

    return resolution.hotkeyId;
  },

  /**
   * Unregister a hotkey by ID
   */
  async unregister(hotkeyId: number): Promise<boolean> {
    hotkeyCallbacks.delete(hotkeyId);
    return await ipcRenderer.invoke('hotkey:unregister', hotkeyId);
  },

  /**
   * Enable or disable a specific hotkey
   */
  async setEnabled(hotkeyId: number, enabled: boolean): Promise<boolean> {
    return await ipcRenderer.invoke('hotkey:setEnabled', hotkeyId, enabled);
  },

  /**
   * Get all hotkeys registered by this app
   */
  async getAll(): Promise<HotkeyInfo[]> {
    const appId = await ipcRenderer.invoke('app-window:get-title') || 'unknown-app';
    return await ipcRenderer.invoke('hotkey:getAll', appId);
  },

  /**
   * Listen for a specific action (alternative to callback in register)
   * @param action The action string to listen for
   * @param callback Function to call when the action is triggered
   * @returns Function to remove the listener
   *
   * @example
   * const unlisten = alt1Hotkeys.onAction('my-action', (event) => {
   *   console.log('Action triggered!', event);
   * });
   * // Later: unlisten();
   */
  onAction(
    action: string,
    callback: (event: { hotkeyId: number; action: string; accelerator: string }) => void
  ): () => void {
    actionCallbacks.set(action, callback);
    return () => {
      actionCallbacks.delete(action);
    };
  },

  /**
   * Check if global hotkeys are currently enabled
   */
  async isEnabled(): Promise<boolean> {
    return await ipcRenderer.invoke('hotkey:isGlobalEnabled');
  },

  // ============================================
  // NEW FEATURES - Rebinding, Conflicts, Focus
  // ============================================

  /**
   * Get formatted list of all hotkeys for UI display
   * @param appId Optional - filter by app ID
   * @returns Formatted hotkey data with display-friendly accelerators
   */
  async getFormattedList(appId?: string): Promise<Array<{
    id: string;
    displayAccelerator: string;
    action: string;
    appName: string;
    enabled: boolean;
    isDefault: boolean;
    description?: string;
  }>> {
    return await ipcRenderer.invoke('hotkey:getFormattedList', appId);
  },

  /**
   * Change a hotkey's key binding
   * @param hotkeyId The hotkey ID to rebind
   * @param newAccelerator New Electron accelerator string (e.g., "Ctrl+Shift+B")
   * @returns Success/error result
   */
  async updateAccelerator(hotkeyId: number, newAccelerator: string): Promise<{ success: boolean; error?: string }> {
    return await ipcRenderer.invoke('hotkey:updateAccelerator', hotkeyId, newAccelerator);
  },

  /**
   * Reset a hotkey to its default binding
   * @param hotkeyId The hotkey ID to reset
   * @returns true if successful
   */
  async resetToDefault(hotkeyId: number): Promise<boolean> {
    return await ipcRenderer.invoke('hotkey:resetToDefault', hotkeyId);
  },

  /**
   * Check if an accelerator conflicts with existing hotkeys
   * @param accelerator The accelerator to check
   * @param excludeId Optional hotkey ID to exclude from check
   * @returns Conflict info with list of conflicting hotkeys
   */
  async checkConflict(accelerator: string, excludeId?: number): Promise<{
    hasConflict: boolean;
    conflictingHotkeys: Array<{
      id: number;
      appId: string;
      accelerator: string;
      action: string;
    }>;
  }> {
    return await ipcRenderer.invoke('hotkey:checkConflict', accelerator, excludeId);
  },

  /**
   * Get hotkey system settings
   * @returns Current settings including globalEnabled and onlyWhenRsFocused
   */
  async getSettings(): Promise<{
    globalEnabled: boolean;
    onlyWhenRsFocused: boolean;
  }> {
    return await ipcRenderer.invoke('hotkey:getSettings');
  },

  /**
   * Update hotkey system settings
   * @param updates Partial settings to update
   */
  async updateSettings(updates: { globalEnabled?: boolean; onlyWhenRsFocused?: boolean }): Promise<void> {
    return await ipcRenderer.invoke('hotkey:updateSettings', updates);
  },

  /**
   * Get current RS focus state
   * @returns Focus state including whether RS is focused
   */
  async getFocusState(): Promise<{
    isRsFocused: boolean;
    rsWindowTitle: string | null;
    rsPid: number | null;
    allowGlobalOverride: boolean;
  }> {
    return await ipcRenderer.invoke('focus:getState');
  },

  /**
   * Set global override to allow hotkeys even when RS not focused
   * @param allow true to enable global override
   */
  async setGlobalOverride(allow: boolean): Promise<void> {
    return await ipcRenderer.invoke('focus:setGlobalOverride', allow);
  }
};

// Expose hotkey API globally
(window as any).alt1Hotkeys = hotkeyApi;
console.log('[AppWindowPreload] alt1Hotkeys API exposed');

// Also expose the native addon directly on window for convenience
if (nativeAddon) {
  (window as any).native = nativeAddon;
  console.log('[AppWindowPreload] Native addon also exposed as window.native');
}

// ============================================
// Resilient Titlebar Injection
// ============================================

// Shared titlebar state
let titlebarTitle = 'Loading...';
let titlebarStyleElement: HTMLStyleElement | null = null;

// The CSS for the titlebar (extracted so we can re-inject it)
const TITLEBAR_CSS = `
  #alt1gl-titlebar {
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
    transition: background-color 0.15s, color 0.15s;
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

/** Ensure the <style> element exists in document.head */
function ensureTitlebarStyle(): void {
  if (titlebarStyleElement && titlebarStyleElement.parentNode) return;

  titlebarStyleElement = document.createElement('style');
  titlebarStyleElement.id = 'alt1gl-titlebar-style';
  titlebarStyleElement.textContent = TITLEBAR_CSS;

  if (document.head) {
    document.head.appendChild(titlebarStyleElement);
  }
}

/** Create the titlebar DOM element */
function createTitlebarElement(): HTMLDivElement {
  const titlebar = document.createElement('div');
  titlebar.id = 'alt1gl-titlebar';

  const titleText = document.createElement('span');
  titleText.id = 'alt1gl-title';
  titleText.textContent = titlebarTitle;

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
  titlebar.appendChild(closeBtn);

  return titlebar;
}

/** Inject the titlebar into the current document.body (idempotent) */
function injectTitlebar(): void {
  if (document.getElementById('alt1gl-titlebar')) return;
  if (!document.body) return;

  ensureTitlebarStyle();

  const titlebar = createTitlebarElement();
  document.body.insertBefore(titlebar, document.body.firstChild);

  console.log('[Titlebar] Injected');
}

/** Set up a MutationObserver that re-injects the titlebar if it is removed */
function watchTitlebar(): void {
  // Watch document.body for child removal
  const bodyObserver = new MutationObserver(() => {
    if (!document.getElementById('alt1gl-titlebar') && document.body) {
      console.log('[Titlebar] Detected removal, re-injecting');
      injectTitlebar();
    }
  });

  if (document.body) {
    bodyObserver.observe(document.body, { childList: true });
  }

  // Watch document.documentElement for body replacement (e.g. full page navigation)
  const htmlObserver = new MutationObserver(() => {
    if (document.body && !document.getElementById('alt1gl-titlebar')) {
      console.log('[Titlebar] Detected body replacement, re-injecting');
      bodyObserver.disconnect();
      injectTitlebar();
      bodyObserver.observe(document.body, { childList: true });
    }
  });

  htmlObserver.observe(document.documentElement, { childList: true });

  // Safety net: periodic check every 2 seconds
  setInterval(() => {
    if (document.body && !document.getElementById('alt1gl-titlebar')) {
      console.log('[Titlebar] Periodic check: titlebar missing, re-injecting');
      injectTitlebar();
      bodyObserver.disconnect();
      bodyObserver.observe(document.body, { childList: true });
    }
  }, 2000);
}

// Fetch title once, cache it for re-injection
ipcRenderer.invoke('app-window:get-title').then((title: string) => {
  titlebarTitle = title;
  const el = document.getElementById('alt1gl-title');
  if (el) el.textContent = title;
});

// Inject when DOM is ready and start watching
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectTitlebar();
    watchTitlebar();
  });
} else {
  injectTitlebar();
  watchTitlebar();
}

// Also re-inject after full page load (some frameworks render late)
window.addEventListener('load', () => {
  if (!document.getElementById('alt1gl-titlebar')) {
    console.log('[Titlebar] Re-injecting after window load');
    injectTitlebar();
  }
});

debug('Preload script complete!');

// Type declarations
declare global {
  interface Window {
    appWindowApi: typeof appWindowApi;
    alt1gl: any;
    native: any;
  }
}
