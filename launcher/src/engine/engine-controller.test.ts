import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "events";
import { createEngineController, type EngineChild } from "./engine-controller";

/** Fake child process: stdout emitter + kill spy + exit emitter. */
function fakeChild(): EngineChild & { emitReady: () => void; emitExit: (code: number) => void } {
  const stdout = new EventEmitter();
  const ee = new EventEmitter();
  const child: any = {
    stdout,
    killed: false,
    kill: vi.fn(() => { child.killed = true; ee.emit("exit", 0); return true; }),
    on: (ev: string, cb: (...a: any[]) => void) => ee.on(ev, cb),
    emitReady: () => stdout.emit("data", Buffer.from("[sdk-host] SDK server live on http://localhost:4400\n")),
    emitExit: (code: number) => ee.emit("exit", code),
  };
  return child;
}

describe("EngineController (child process)", () => {
  it("enableEngine spawns + resolves active once 'SDK server live' seen", async () => {
    const child = fakeChild();
    const spawnEngine = vi.fn(() => child);
    const c = createEngineController({ spawnEngine, port: 4400, readyTimeoutMs: 1000 });
    const p = c.enableEngine(123);
    child.emitReady();
    const status = await p;
    expect(spawnEngine).toHaveBeenCalledWith(123, 4400);
    expect(status.active).toBe(true);
    expect(status.pid).toBe(123);
  });

  it("enableEngine is idempotent for same pid", async () => {
    const child = fakeChild();
    const spawnEngine = vi.fn(() => child);
    const c = createEngineController({ spawnEngine, port: 4400, readyTimeoutMs: 1000 });
    const p1 = c.enableEngine(123); child.emitReady(); await p1;
    await c.enableEngine(123);
    expect(spawnEngine).toHaveBeenCalledTimes(1);
  });

  it("child exiting before ready -> detached with error", async () => {
    const child = fakeChild();
    const spawnEngine = vi.fn(() => child);
    const c = createEngineController({ spawnEngine, port: 4400, readyTimeoutMs: 1000 });
    const p = c.enableEngine(123);
    child.emitExit(1);
    const status = await p;
    expect(status.active).toBe(false);
    expect(status.error).toContain("exited");
  });

  it("ready timeout -> kills child, detached with error", async () => {
    const child = fakeChild();
    const spawnEngine = vi.fn(() => child);
    const c = createEngineController({ spawnEngine, port: 4400, readyTimeoutMs: 20 });
    const status = await c.enableEngine(123); // never emits ready
    expect(status.active).toBe(false);
    expect(status.error).toMatch(/timeout/i);
    expect(child.kill).toHaveBeenCalled();
  });

  it("disableEngine kills child; idempotent", async () => {
    const child = fakeChild();
    const spawnEngine = vi.fn(() => child);
    const c = createEngineController({ spawnEngine, port: 4400, readyTimeoutMs: 1000 });
    const p = c.enableEngine(123); child.emitReady(); await p;
    await c.disableEngine();
    await c.disableEngine();
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(c.isEngineActive()).toBe(false);
  });
});
