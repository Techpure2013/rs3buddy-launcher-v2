import type { NativeAddon } from "./inject";

/**
 * Phase 1 stub for the native engine.
 *
 * The native addon (`addon.node` / patchrs) has been stripped from this repo;
 * rs3buddy-api is not wired in yet (that is Phase 2). This stub satisfies the
 * full `NativeAddon` interface so the Electron shell boots and app windows load
 * without an engine. Every method is a safe no-op; reads return "not ready"
 * sentinels.
 *
 * Implementation: a Proxy returns a no-op function for ANY accessed member that
 * we don't explicitly override, so the stub can never throw "x is not a function"
 * no matter what an app calls — current or future. The explicit overrides below
 * are the methods whose RETURN SHAPE matters (callers read fields / iterate),
 * so a bare no-op returning undefined would break them.
 */

const log = (m: string): void => {
  try {
    console.log("[native-stub] " + m);
  } catch {
    /* ignore */
  }
};

function makeDebugStub(): any {
  const overrides: Record<string, (...args: any[]) => any> = {
    getCurrentWorkingDirectory: () => process.cwd(),
    readDirSync: () => [],
    readFileSync: () => new Uint8Array(0),
    copyFileSync: () => undefined,
    statSync: () => ({ size: 0, modifiedTime: 0, isDirectory: false }),
    getExePids: () => [],
    injectDll: () => { log("debug.injectDll (stub)"); return { ok: false } as any; },
    connectToOverlay: () => { log("debug.connectToOverlay (stub)"); return { ok: false } as any; },
    exitDll: () => log("debug.exitDll (stub)"),
    getRsHwnd: () => 0,
    memoryState: () => null,
    getAllGlObjects: () => ({}),
    getGlObjectStats: () => null,
    getSharedMemorySizes: () => [],
    resetOpenGlState: async () => undefined,
    killMemorySession: async () => undefined,
    setLogCb: (_cb: (message: string) => void) => log("debug.setLogCb (stub)"),
  };
  return makeProxy("debug", overrides);
}

function makeProxy(label: string, overrides: Record<string, any>): any {
  return new Proxy(overrides, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      // Unknown member: return a safe no-op function. Covers any method the
      // shell calls that we didn't anticipate — it logs once and returns undefined.
      return (..._args: any[]) => {
        log(`${label}.${String(prop)} (stub no-op)`);
        return undefined;
      };
    },
  });
}

export function createNativeStub(): NativeAddon {
  const overrides: Record<string, any> = {
    __stub: true,

    // Alt1 replacement API — return-shape matters (numbers read directly).
    getRsReady: () => 0,
    getRsX: () => 0,
    getRsY: () => 0,
    getRsWidth: () => 0,
    getRsHeight: () => 0,
    getRsHwnd: () => 0,
    capture: async () => { throw new Error("[native-stub] capture: engine not wired (Phase 1)"); },

    // Core OpenGL — callers iterate/await these.
    recordRenderCalls: async () => [],
    streamRenderCalls: () => {
      log("streamRenderCalls (stub) — returns inert stream object");
      return { stop: () => undefined, dispose: () => undefined } as any;
    },
    getOpenGlState: async () => ({}) as any,
    getRenderer: () => null,

    // GL logging/debugging.
    setGlLogCb: (_cb: any) => log("setGlLogCb (stub)"),
    getGlLogToggles: () => new Uint8Array(0),
    setGlLogToggles: (_arr: Uint8Array) => log("setGlLogToggles (stub)"),

    // Upload/overlay — return inert handles.
    createProgram: () => { log("createProgram (stub)"); return {} as any; },
    createVertexArray: () => { log("createVertexArray (stub)"); return {} as any; },
    createTexture: () => { log("createTexture (stub)"); return {} as any; },
    beginOverlay: () => {
      log("beginOverlay (stub)");
      return { stop: () => undefined, getUniformState: () => new Uint8Array(0) } as any;
    },

    // Debug API (required sub-object).
    debug: makeDebugStub(),

    // Optional overlay extension.
    overlay: {
      init: () => false,
      shutdown: () => undefined,
      setConfig: () => undefined,
      addButton: () => false,
      removeButton: () => false,
      clearButtons: () => undefined,
      setTheme: () => undefined,
      setClickCallback: () => undefined,
      getMousePosition: () => ({ x: 0, y: 0 }),
    },
  };
  return makeProxy("native", overrides) as NativeAddon;
}
