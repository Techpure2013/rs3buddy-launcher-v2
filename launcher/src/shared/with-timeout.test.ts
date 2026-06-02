import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout } from './with-timeout';

/**
 * Tests for shared/with-timeout.ts — the REAL canonical timeout utility.
 * Used by frame-cache.ts and npcOverlay.ts (inline copy).
 */

describe('withTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resolves when promise completes within timeout', async () => {
    const p = withTimeout(Promise.resolve(42), 5000, 'test');
    await expect(p).resolves.toBe(42);
  });

  it('rejects with labeled timeout message', async () => {
    const p = withTimeout(new Promise(() => {}), 5000, 'myScan');
    vi.advanceTimersByTime(5001);
    await expect(p).rejects.toThrow('myScan timed out after 5000ms');
  });

  it('includes the label and duration in error message', async () => {
    const p = withTimeout(new Promise(() => {}), 3000, 'scanGrouped');
    vi.advanceTimersByTime(3001);
    try {
      await p;
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.message).toBe('scanGrouped timed out after 3000ms');
    }
  });

  it('propagates the original error if promise rejects before timeout', async () => {
    const p = withTimeout(
      Promise.reject(new Error('DLL crash')),
      5000,
      'test',
    );
    await expect(p).rejects.toThrow('DLL crash');
  });

  it('clears timeout when promise resolves', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    await withTimeout(Promise.resolve('fast'), 5000, 'test');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('clears timeout when promise rejects', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    await withTimeout(Promise.reject(new Error('fail')), 5000, 'test').catch(() => {});
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('does not fire timeout after promise resolves', async () => {
    let timedOut = false;
    const p = withTimeout(
      new Promise<string>(resolve => setTimeout(() => resolve('ok'), 100)),
      5000,
      'test',
    );
    p.catch(() => { timedOut = true; });

    vi.advanceTimersByTime(100); // resolve
    await p;

    vi.advanceTimersByTime(5000); // past timeout — should not fire
    expect(timedOut).toBe(false);
  });

  it('works with different value types', async () => {
    await expect(withTimeout(Promise.resolve('string'), 1000, 't')).resolves.toBe('string');
    await expect(withTimeout(Promise.resolve(123), 1000, 't')).resolves.toBe(123);
    await expect(withTimeout(Promise.resolve(null), 1000, 't')).resolves.toBeNull();
    await expect(withTimeout(Promise.resolve([1, 2, 3]), 1000, 't')).resolves.toEqual([1, 2, 3]);
  });

  it('timeout of 0ms fires immediately', async () => {
    const p = withTimeout(new Promise(() => {}), 0, 'instant');
    vi.advanceTimersByTime(1);
    await expect(p).rejects.toThrow('instant timed out after 0ms');
  });
});
