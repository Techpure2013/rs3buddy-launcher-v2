/**
 * Owns the rs3buddy-api engine as a CHILD PROCESS, gated by the autoInject toggle.
 *
 * enableEngine(gamePid): spawn the engine process; resolve "active" once it logs
 *   "SDK server live" on stdout. On early exit or ready-timeout -> kill + detached
 *   with an error (retryable). disableEngine(): kill the child; idempotent.
 *
 * The spawner is injected so this is unit-testable with a fake child (no real
 * process / native). Production wiring (engine/index.ts) provides a spawner that
 * launches `node sdk-host.bundle.js` with RS3B_SDK_PORT set.
 *
 * "Off means off": when disabled there is NO child process at all.
 */
import type { EventEmitter } from "events";

export interface EngineStatus {
  active: boolean;
  pid: number | null; // the RS game pid this engine targets
  port: number | null;
  error: string | null;
}

/** Minimal child-process shape the controller needs (real ChildProcess satisfies it). */
export interface EngineChild {
  stdout: Pick<EventEmitter, "on"> | null;
  kill(signal?: string): boolean;
  on(event: "exit", listener: (code: number | null) => void): unknown;
  killed?: boolean;
}

export interface EngineControllerDeps {
  /** Spawn the engine targeting RS `gamePid`, serving on `port`. Returns the child. */
  spawnEngine: (gamePid: number, port: number) => EngineChild;
  port: number;
  /** How long to wait for the "server live" line before giving up. Default 15000. */
  readyTimeoutMs?: number;
}

export interface EngineController {
  enableEngine(gamePid: number): Promise<EngineStatus>;
  disableEngine(): Promise<void>;
  isEngineActive(): boolean;
  getStatus(): EngineStatus;
}

const READY_MARKER = "SDK server live";

export function createEngineController(deps: EngineControllerDeps): EngineController {
  const readyTimeoutMs = deps.readyTimeoutMs ?? 15000;
  let child: EngineChild | null = null;
  let status: EngineStatus = { active: false, pid: null, port: null, error: null };

  function reset(error: string | null): void {
    child = null;
    status = { active: false, pid: null, port: null, error };
  }

  async function disableEngine(): Promise<void> {
    if (!child) {
      status = { active: false, pid: null, port: null, error: null };
      return;
    }
    const c = child;
    child = null;
    status = { active: false, pid: null, port: null, error: null };
    try {
      c.kill();
    } catch (e) {
      console.warn(`[Engine] kill threw: ${(e as Error).message}`);
    }
    console.log("[Engine] stopped");
  }

  async function enableEngine(gamePid: number): Promise<EngineStatus> {
    if (status.active && status.pid === gamePid) return status; // idempotent
    if (child) await disableEngine(); // re-target a different pid

    return await new Promise<EngineStatus>((resolve) => {
      let settled = false;
      const finish = (s: EngineStatus): void => {
        if (!settled) {
          settled = true;
          resolve(s);
        }
      };

      let spawned: EngineChild;
      try {
        spawned = deps.spawnEngine(gamePid, deps.port);
      } catch (e) {
        reset(`spawn failed: ${(e as Error).message}`);
        finish(status);
        return;
      }
      child = spawned;

      const timer = setTimeout(() => {
        // Set the timeout error + settle BEFORE killing — the kill may
        // synchronously emit "exit", and we must not let that clobber the
        // timeout reason (the exit handler is guarded by `settled`).
        reset("engine start timeout");
        finish(status);
        try {
          spawned.kill();
        } catch {
          /* ignore */
        }
      }, readyTimeoutMs);

      spawned.stdout?.on("data", (buf: Buffer) => {
        if (buf.toString().includes(READY_MARKER)) {
          clearTimeout(timer);
          status = { active: true, pid: gamePid, port: deps.port, error: null };
          console.log(`[Engine] live (pid ${gamePid}, port ${deps.port})`);
          finish(status);
        }
      });

      spawned.on("exit", (code) => {
        clearTimeout(timer);
        if (settled) {
          // Already resolved (ready, or timed-out-and-killed). If we WERE active,
          // a later crash should detach so the next detect can retry.
          if (status.active) reset(`engine exited (code ${code})`);
          return;
        }
        // Exited before we ever settled => failed to come up.
        reset(`engine exited before ready (code ${code})`);
        finish(status);
      });
    });
  }

  return {
    enableEngine,
    disableEngine,
    isEngineActive: () => status.active,
    getStatus: () => ({ ...status }),
  };
}
