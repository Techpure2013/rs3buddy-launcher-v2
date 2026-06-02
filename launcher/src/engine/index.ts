import { spawn } from "child_process";
import * as path from "path";
import { app } from "electron";
import extract from "extract-zip";
import {
  createEngineController,
  type EngineController,
  type EngineStatus,
  type EngineChild,
} from "./engine-controller";
import { fetchText, downloadFile } from "./engine-download";
import { createEngineUpdater, type UpdateProgress } from "./engine-updater";

export type { EngineStatus };
export { decideEngineAction } from "./engine-decision";

/** Default port for the rs3buddy-api HTTP server (matches the SDK examples). */
const ENGINE_PORT = 4400;

/**
 * Engine artifact distribution base. The launcher GETs `version.json` from here
 * each launch (CDN, not API — no rate limit, no token) and downloads `engine.zip`
 * when newer. Override with RS3B_ENGINE_DIST_BASE (e.g. a mirror/proxy if the api
 * repo ever goes private).
 */
const ENGINE_DIST_BASE =
  process.env.RS3B_ENGINE_DIST_BASE ??
  "https://github.com/Techpure2013/rs3buddy-api/releases/latest/download/";

/** Cache root for the auto-updated engine: <userData>/engine. */
function engineCacheDir(): string {
  return path.join(app.getPath("userData"), "engine");
}

/**
 * Locate the spawnable `sdk-host.bundle.js`.
 *  1. RS3B_ENGINE_BUNDLE override (local dev against a sibling build) wins.
 *  2. else the auto-updater's cache: <userData>/engine/current/sdk-host.bundle.js.
 */
function engineBundlePath(): string {
  if (process.env.RS3B_ENGINE_BUNDLE) return process.env.RS3B_ENGINE_BUNDLE;
  return path.join(engineCacheDir(), "current", "sdk-host.bundle.js");
}

/**
 * Engine auto-updater. On startup `main.ts` calls checkAndUpdate() (non-blocking);
 * it downloads the latest engine into the cache and reports progress over the
 * 'engine-update-progress' IPC channel for the renderer banner.
 */
export const engineUpdater = createEngineUpdater({
  distBase: ENGINE_DIST_BASE,
  cacheDir: engineCacheDir(),
  fetchText,
  downloadZip: (url, dest, onP) => downloadFile(url, dest, (f) => onP?.(f)),
  extract: (zip, target) => extract(zip, { dir: target }),
  onProgress: (p: UpdateProgress) => {
    try {
      // Lazy require avoids a circular import + tolerates "window not ready yet".
      (require("../windows") as { sendToMainWindow: (c: string, ...a: unknown[]) => void })
        .sendToMainWindow("engine-update-progress", p);
    } catch {
      /* main window not ready */
    }
  },
});

/**
 * Production engine controller: spawns `node sdk-host.bundle.js` (the rs3buddy-api
 * engine) with the port + target game pid in the environment. The engine attaches
 * to RS3 and serves the HTTP API; the controller waits for its "SDK server live"
 * stdout line and kills it on disable. The launcher's own process never loads the
 * engine's native addon.
 */
export const engineController: EngineController = createEngineController({
  port: ENGINE_PORT,
  spawnEngine: (gamePid: number, port: number): EngineChild => {
    const bundle = engineBundlePath();
    console.log(`[Engine] spawning ${bundle} (game pid ${gamePid}, port ${port})`);
    const child = spawn(process.execPath, [bundle], {
      env: {
        ...process.env,
        RS3B_SDK_PORT: String(port),
        RS3B_GAME_PID: String(gamePid),
        // Make the Electron binary run the bundle as plain Node.
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stderr?.on("data", (b: Buffer) =>
      console.warn("[Engine:stderr] " + b.toString().trim()),
    );
    return child as unknown as EngineChild;
  },
});
