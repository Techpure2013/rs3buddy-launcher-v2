/**
 * Inject Logic - Extracted from inject.ts for testability.
 *
 * Pure functions for reconnection and cleanup with dependency injection.
 * The addon and state are passed as parameters instead of reading module globals.
 *
 * Zero dependencies on Electron, native addon, or any project module.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InjectionState {
  pid: number;
  dllPath: string;
  instanceId: number;
  memoryId: number;
}

/** Minimal addon interface for reconnection — structural typing, no import needed. */
export interface ReconnectableAddon {
  debug: {
    connectToOverlay(pid: number): { instanceid: number; memoryid?: number } | null;
  };
}

/** Minimal addon interface for cleanup. */
export interface CleanableAddon {
  debug: {
    exitDll(): void;
  };
}

// ─── Reconnection ───────────────────────────────────────────────────────────

export interface ReconnectResult {
  success: boolean;
  newActiveMemoryId: number | undefined;
  instanceId?: number;
}

/**
 * Reconnect to an existing overlay's shared memory.
 *
 * Calls exitDll() to clean up any existing session, then connectToOverlay()
 * to establish a new connection, then resetOpenGlState() (fire-and-forget)
 * to clear stale GL objects from the previous session.
 *
 * @param addon The native addon instance
 * @param pid RS client process ID
 * @param injectionStates Mutable map of tracked injection states
 * @param activeMemoryId Current active shared memory ID (undefined if none)
 * @returns Result with success flag and updated memory ID
 */
export function reconnectToOverlayPure(
  addon: ReconnectableAddon,
  pid: number,
  injectionStates: Map<number, InjectionState>,
  activeMemoryId: number | undefined,
): ReconnectResult {
  try {
    // NOTE: Do NOT call exitDll() before connectToOverlay().
    // The C++ connectToOverlay() already calls closeClientComms() internally.
    // Calling exitDll() first causes a mainIdle semaphore leak that races the pump thread.
    //
    // NOTE: Do NOT call resetOpenGlState() here.
    // It sends an IPC command to the DLL that can trigger exceptions in the GL server
    // if stale shared memory references from a previous session are still present,
    // which kills the HeapSession and permanently disconnects all channels.

    const result = addon.debug.connectToOverlay(pid);
    if (result) {
      const memoryId = result.memoryid ?? 0;
      const newActiveMemoryId = activeMemoryId === undefined ? memoryId : activeMemoryId;

      injectionStates.set(pid, {
        pid,
        dllPath: '',
        instanceId: result.instanceid,
        memoryId,
      });

      return { success: true, newActiveMemoryId, instanceId: result.instanceid };
    }

    return { success: false, newActiveMemoryId: activeMemoryId };
  } catch {
    return { success: false, newActiveMemoryId: activeMemoryId };
  }
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Clean up injection state. Calls exitDll() and clears the injection states map.
 * Does NOT handle filesystem cleanup (DLL copies) — that stays in inject.ts.
 *
 * @param addon The native addon instance (null-safe)
 * @param injectionStates Mutable map to clear
 */
export function cleanupInjectionPure(
  addon: CleanableAddon | null,
  injectionStates: Map<number, InjectionState>,
): void {
  if (addon) {
    try {
      addon.debug.exitDll();
    } catch {
      // May throw if no active session
    }
  }
  injectionStates.clear();
}
