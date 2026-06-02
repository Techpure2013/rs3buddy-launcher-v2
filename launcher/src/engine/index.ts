import { spawn } from "child_process";
import * as path from "path";
import {
  createEngineController,
  type EngineController,
  type EngineStatus,
  type EngineChild,
} from "./engine-controller";

export type { EngineStatus };
export { decideEngineAction } from "./engine-decision";

/** Default port for the rs3buddy-api HTTP server (matches the SDK examples). */
const ENGINE_PORT = 4400;

/**
 * Locate the rs3buddy-api `sdk-host.bundle.js`. Override with RS3B_ENGINE_BUNDLE.
 * Default: the sibling rs3buddy-api checkout next to this launcher repo.
 * Resolved from __dirname (dist/engine or src/engine — both 3 levels under the
 * repo root, whose sibling is rs3buddy-api).
 */
function engineBundlePath(): string {
  if (process.env.RS3B_ENGINE_BUNDLE) return process.env.RS3B_ENGINE_BUNDLE;
  return path.resolve(
    __dirname,
    "..", "..", "..", "..",
    "rs3buddy-api", "rundir", "js", "sdk-host.bundle.js",
  );
}

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
