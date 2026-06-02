/**
 * Labeled timeout wrapper for promises.
 *
 * Canonical implementation used by:
 * - launcher/src/addon/frame-cache.ts (via withCaptureTimeout)
 * - packages/npc-recorder/src/gl/npcOverlay.ts (inline copy — see comment there)
 *
 * Zero dependencies.
 */

/**
 * Wrap a promise with a timeout. Rejects with a labeled error if the
 * promise doesn't settle within `ms` milliseconds.
 *
 * The timeout is cleared when the promise settles, so no timers leak.
 *
 * @param promise The promise to wrap
 * @param ms Timeout duration in milliseconds
 * @param label Human-readable label included in the timeout error message
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
