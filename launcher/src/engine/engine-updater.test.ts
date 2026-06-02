import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createEngineUpdater } from "./engine-updater";

let cacheDir: string;
beforeEach(() => { cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "engtest-")); });
afterEach(() => { fs.rmSync(cacheDir, { recursive: true, force: true }); });

function deps(over: Partial<Parameters<typeof createEngineUpdater>[0]> = {}) {
  return {
    distBase: "https://x/dl/",
    cacheDir,
    fetchText: vi.fn(async () => '{"version":"1.0.0"}'),
    downloadZip: vi.fn(async (_url: string, dest: string) => { fs.writeFileSync(dest, "zipbytes"); }),
    // fake extract: create sdk-host.bundle.js in the target dir
    extract: vi.fn(async (_zip: string, target: string) => {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "sdk-host.bundle.js"), "// engine");
    }),
    onProgress: vi.fn(),
    ...over,
  };
}

describe("EngineUpdater", () => {
  it("downloads + extracts + points current when no cache", async () => {
    const d = deps();
    const u = createEngineUpdater(d);
    const r = await u.checkAndUpdate();
    expect(r.updated).toBe(true);
    expect(r.version).toBe("1.0.0");
    expect(fs.existsSync(path.join(cacheDir, "current", "sdk-host.bundle.js"))).toBe(true);
    expect(fs.readFileSync(path.join(cacheDir, "version.json"), "utf8")).toContain("1.0.0");
  });

  it("skips download when cached version is current", async () => {
    fs.writeFileSync(path.join(cacheDir, "version.json"), '{"version":"1.0.0"}');
    const d = deps();
    const u = createEngineUpdater(d);
    const r = await u.checkAndUpdate();
    expect(r.updated).toBe(false);
    expect(d.downloadZip).not.toHaveBeenCalled();
  });

  it("does NOT swap current if extracted bundle missing", async () => {
    const d = deps({ extract: vi.fn(async (_z: string, target: string) => { fs.mkdirSync(target, { recursive: true }); /* no bundle */ }) });
    const u = createEngineUpdater(d);
    const r = await u.checkAndUpdate();
    expect(r.updated).toBe(false);
    expect(r.error).toMatch(/bundle|missing/i);
    expect(fs.existsSync(path.join(cacheDir, "current"))).toBe(false);
  });

  it("uses cache + reports error when fetch fails and cache exists", async () => {
    fs.mkdirSync(path.join(cacheDir, "current"), { recursive: true });
    fs.writeFileSync(path.join(cacheDir, "current", "sdk-host.bundle.js"), "// old");
    fs.writeFileSync(path.join(cacheDir, "version.json"), '{"version":"0.9.0"}');
    const d = deps({ fetchText: vi.fn(async () => { throw new Error("network down"); }) });
    const u = createEngineUpdater(d);
    const r = await u.checkAndUpdate();
    expect(r.updated).toBe(false);
    expect(r.error).toMatch(/network/i);
    expect(u.currentBundlePath()).toContain("current");
  });

  it("reports progress during download", async () => {
    const d = deps({ downloadZip: vi.fn(async (_u: string, dest: string, onP?: (f: number) => void) => { onP?.(0.5); onP?.(1); fs.writeFileSync(dest, "z"); }) });
    const u = createEngineUpdater(d);
    await u.checkAndUpdate();
    expect(d.onProgress).toHaveBeenCalled();
  });
});
