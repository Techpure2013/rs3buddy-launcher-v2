import * as fs from "fs";
import * as path from "path";
import { isNewer, parseVersionJson, assetUrl } from "./engine-version";

const ENGINE_ZIP = "engine.zip";
const VERSION_JSON = "version.json";
const BUNDLE = "sdk-host.bundle.js";

export type UpdateProgress =
  | { phase: "checking" }
  | { phase: "downloading"; fraction: number }
  | { phase: "extracting" }
  | { phase: "done"; version: string }
  | { phase: "uptodate"; version: string | null }
  | { phase: "error"; message: string };

export interface EngineUpdaterDeps {
  distBase: string; // ENGINE_DIST_BASE
  cacheDir: string; // <userData>/engine
  fetchText: (url: string) => Promise<string>;
  downloadZip: (url: string, dest: string, onProgress?: (f: number) => void) => Promise<void>;
  extract: (zip: string, targetDir: string) => Promise<void>;
  onProgress?: (p: UpdateProgress) => void;
}

export interface UpdateResult {
  updated: boolean;
  version: string | null;
  error?: string;
}

export interface EngineUpdater {
  checkAndUpdate(): Promise<UpdateResult>;
  /** Absolute path to the spawnable bundle in the current cache, or null. */
  currentBundlePath(): string | null;
}

export function createEngineUpdater(deps: EngineUpdaterDeps): EngineUpdater {
  const { distBase, cacheDir } = deps;
  const emit = (p: UpdateProgress): void => {
    try {
      deps.onProgress?.(p);
    } catch {
      /* ignore */
    }
  };

  function localVersion(): string | null {
    try {
      return parseVersionJson(fs.readFileSync(path.join(cacheDir, VERSION_JSON), "utf8"));
    } catch {
      return null;
    }
  }

  function currentBundlePath(): string | null {
    const p = path.join(cacheDir, "current", BUNDLE);
    return fs.existsSync(p) ? p : null;
  }

  async function checkAndUpdate(): Promise<UpdateResult> {
    fs.mkdirSync(cacheDir, { recursive: true });
    const local = localVersion();
    emit({ phase: "checking" });

    let remote: string | null = null;
    try {
      remote = parseVersionJson(await deps.fetchText(assetUrl(distBase, VERSION_JSON)));
    } catch (e) {
      const msg = (e as Error).message;
      emit({ phase: "error", message: msg });
      return { updated: false, version: local, error: msg };
    }
    if (!remote) {
      const msg = "remote version.json malformed";
      emit({ phase: "error", message: msg });
      return { updated: false, version: local, error: msg };
    }
    if (!isNewer(remote, local)) {
      emit({ phase: "uptodate", version: local });
      return { updated: false, version: local };
    }

    // Download zip -> temp, extract to versioned dir, verify bundle, swap current.
    const tmpZip = path.join(cacheDir, `download-${remote}.zip`);
    const versionDir = path.join(cacheDir, remote);
    try {
      await deps.downloadZip(assetUrl(distBase, ENGINE_ZIP), tmpZip, (f) =>
        emit({ phase: "downloading", fraction: f }),
      );
      emit({ phase: "extracting" });
      fs.rmSync(versionDir, { recursive: true, force: true });
      await deps.extract(tmpZip, versionDir);
      if (!fs.existsSync(path.join(versionDir, BUNDLE))) {
        const msg = `extracted engine missing ${BUNDLE}`;
        emit({ phase: "error", message: msg });
        return { updated: false, version: local, error: msg };
      }
      // Swap `current` to mirror the freshly-verified versionDir, then write the
      // version marker last (so a crash mid-swap leaves the old marker).
      const currentDir = path.join(cacheDir, "current");
      fs.rmSync(currentDir, { recursive: true, force: true });
      fs.cpSync(versionDir, currentDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, VERSION_JSON), JSON.stringify({ version: remote }));
      fs.rmSync(tmpZip, { force: true });
      emit({ phase: "done", version: remote });
      return { updated: true, version: remote };
    } catch (e) {
      const msg = (e as Error).message;
      fs.rmSync(tmpZip, { force: true });
      emit({ phase: "error", message: msg });
      return { updated: false, version: local, error: msg };
    }
  }

  return { checkAndUpdate, currentBundlePath };
}
