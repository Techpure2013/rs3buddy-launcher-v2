import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FrameCache,
  isCacheable,
  withCaptureTimeout,
  getSerializedResultCacheKey,
  FRAME_CACHE_TTL,
  CAPTURE_TIMEOUT_MS,
} from './frame-cache';

/**
 * Tests for frame-cache.ts — the REAL extracted module.
 * These import and test actual production code, not copies.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// withCaptureTimeout
// ═══════════════════════════════════════════════════════════════════════════════

const FAKE_TIMER_OPTS = { shouldAdvanceTime: false, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] as const };

describe('withCaptureTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resolves when the underlying promise resolves in time', async () => {
    const p = withCaptureTimeout(
      new Promise<string>(resolve => setTimeout(() => resolve('ok'), 100)),
      5000,
    );
    vi.advanceTimersByTime(100);
    await expect(p).resolves.toBe('ok');
  });

  it('rejects with timeout error when underlying promise never resolves', async () => {
    const p = withCaptureTimeout(new Promise<string>(() => {}), 5000);
    vi.advanceTimersByTime(5001);
    await expect(p).rejects.toThrow('recordRenderCalls timed out');
  });

  it('uses custom label in error message when provided', async () => {
    const p = withCaptureTimeout(new Promise<string>(() => {}), 3000, 'myLabel');
    vi.advanceTimersByTime(3001);
    await expect(p).rejects.toThrow('myLabel timed out after 3000ms');
  });

  it('rejects with the underlying error if it rejects before timeout', async () => {
    const p = withCaptureTimeout(
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('dll error')), 100)),
      5000,
    );
    vi.advanceTimersByTime(100);
    await expect(p).rejects.toThrow('dll error');
  });

  it('clears the timeout when the promise resolves', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const p = withCaptureTimeout(Promise.resolve('fast'), 5000);
    await p;
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('clears the timeout when the promise rejects', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const p = withCaptureTimeout(Promise.reject(new Error('fail')), 5000);
    await p.catch(() => {});
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isCacheable
// ═══════════════════════════════════════════════════════════════════════════════

describe('isCacheable', () => {
  it('returns true for default options (maxframes:1, no timeout)', () => {
    expect(isCacheable({ maxframes: 1, features: ['uniforms', 'vertexarray'] })).toBe(true);
  });

  it('returns true when no options are provided', () => {
    expect(isCacheable()).toBe(true);
    expect(isCacheable(undefined)).toBe(true);
  });

  it('returns false when timeout is set', () => {
    expect(isCacheable({ maxframes: 1, timeout: 10000 })).toBe(false);
  });

  it('returns false for multi-frame captures', () => {
    expect(isCacheable({ maxframes: 2 })).toBe(false);
    expect(isCacheable({ maxframes: 5 })).toBe(false);
  });

  it('returns false for texturecapture feature', () => {
    expect(isCacheable({ maxframes: 1, features: ['texturecapture'] })).toBe(false);
  });

  it('returns false for texturesnapshot feature', () => {
    expect(isCacheable({ maxframes: 1, features: ['texturesnapshot'] })).toBe(false);
  });

  it('returns true for uniforms + vertexarray features', () => {
    expect(isCacheable({ maxframes: 1, features: ['uniforms', 'vertexarray'] })).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getSerializedResultCacheKey
// ═══════════════════════════════════════════════════════════════════════════════

describe('getSerializedResultCacheKey', () => {
  it('includes generation and owner', () => {
    const key = getSerializedResultCacheKey(1, 42);
    expect(key).toContain('1:42:');
  });

  it('includes filter options when present', () => {
    const key = getSerializedResultCacheKey(1, 42, { programId: 5, vertexObjectId: 10 });
    expect(key).toContain(':5:');
    expect(key).toContain(':10:');
  });

  it('different options produce different keys', () => {
    const k1 = getSerializedResultCacheKey(1, 1, { programId: 1 });
    const k2 = getSerializedResultCacheKey(1, 1, { programId: 2 });
    expect(k1).not.toBe(k2);
  });

  it('different generations produce different keys', () => {
    const k1 = getSerializedResultCacheKey(1, 1);
    const k2 = getSerializedResultCacheKey(2, 1);
    expect(k1).not.toBe(k2);
  });

  it('handles undefined options gracefully', () => {
    const key = getSerializedResultCacheKey(1, 1);
    expect(key).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constants', () => {
  it('FRAME_CACHE_TTL is 500ms', () => {
    expect(FRAME_CACHE_TTL).toBe(500);
  });

  it('CAPTURE_TIMEOUT_MS is 10000ms', () => {
    expect(CAPTURE_TIMEOUT_MS).toBe(10000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FrameCache
// ═══════════════════════════════════════════════════════════════════════════════

describe('FrameCache', () => {
  let cache: FrameCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new FrameCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Basic creation ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts at generation 0', () => {
      expect(cache.generation).toBe(0);
    });

    it('has no pending capture', () => {
      expect(cache.hasPendingCapture).toBe(false);
    });

    it('has empty known features', () => {
      expect(cache.knownFeatures.size).toBe(0);
    });
  });

  // ─── getOrCreateCapture ──────────────────────────────────────────────

  describe('getOrCreateCapture', () => {
    it('creates a new capture on first call', () => {
      const impl = vi.fn(() => Promise.resolve([{ id: 1 }]));
      const { hit } = cache.getOrCreateCapture(['uniforms'], impl);
      expect(hit).toBe(false);
      expect(impl).toHaveBeenCalledOnce();
      expect(cache.generation).toBe(1);
    });

    it('returns cache hit for concurrent in-flight calls', () => {
      const impl = vi.fn(() => new Promise<any[]>(resolve => setTimeout(() => resolve([]), 500)));
      const r1 = cache.getOrCreateCapture(['uniforms'], impl);
      const r2 = cache.getOrCreateCapture(['uniforms'], impl);

      expect(r1.hit).toBe(false);
      expect(r2.hit).toBe(true);
      expect(impl).toHaveBeenCalledOnce();
      expect(r1.promise).toBe(r2.promise);
    });

    it('returns cache hit within TTL after completion', async () => {
      const impl = vi.fn(() => Promise.resolve([{ id: 1 }]));
      const r1 = cache.getOrCreateCapture(['uniforms'], impl);
      await r1.promise;

      const r2 = cache.getOrCreateCapture(['uniforms'], impl);
      expect(r2.hit).toBe(true);
      expect(impl).toHaveBeenCalledOnce();
    });

    it('creates new capture after TTL expires', async () => {
      const impl = vi.fn(() => Promise.resolve([{ id: 1 }]));
      const r1 = cache.getOrCreateCapture(['uniforms'], impl);
      await r1.promise;

      vi.advanceTimersByTime(FRAME_CACHE_TTL + 100);

      const r2 = cache.getOrCreateCapture(['uniforms'], impl);
      expect(r2.hit).toBe(false);
      expect(impl).toHaveBeenCalledTimes(2);
    });

    it('cache miss when requested features are not covered', async () => {
      const impl = vi.fn(() => Promise.resolve([]));
      const r1 = cache.getOrCreateCapture(['uniforms'], impl);
      await r1.promise;

      const r2 = cache.getOrCreateCapture(['vertexarray'], impl);
      expect(r2.hit).toBe(false);
      expect(impl).toHaveBeenCalledTimes(2);
    });

    it('learns features across calls', async () => {
      const impl = vi.fn(() => Promise.resolve([]));
      cache.getOrCreateCapture(['uniforms'], impl);
      cache.getOrCreateCapture(['vertexarray'], impl);
      expect(cache.knownFeatures.has('uniforms')).toBe(true);
      expect(cache.knownFeatures.has('vertexarray')).toBe(true);
    });

    it('increments generation on each new capture', async () => {
      const impl = vi.fn(() => Promise.resolve([]));

      cache.getOrCreateCapture(['uniforms'], impl);
      expect(cache.generation).toBe(1);

      // Wait for completion + TTL expiry
      await cache.getOrCreateCapture(['uniforms'], impl).promise;
      vi.advanceTimersByTime(FRAME_CACHE_TTL + 100);

      cache.getOrCreateCapture(['uniforms'], impl);
      expect(cache.generation).toBe(2);
    });

    it('calls onOldCapture when replacing a completed capture', async () => {
      const impl = vi.fn(() => Promise.resolve([{ id: 1 }]));
      const onOld = vi.fn();

      const r1 = cache.getOrCreateCapture(['uniforms'], impl);
      await r1.promise;
      vi.advanceTimersByTime(FRAME_CACHE_TTL + 100);

      cache.getOrCreateCapture(['uniforms'], impl, onOld);
      expect(onOld).toHaveBeenCalledOnce();
    });
  });

  // ─── Error behavior ──────────────────────────────────────────────────

  describe('error behavior', () => {
    it('DLL error clears cache', async () => {
      const impl = vi.fn(() => Promise.reject(new Error('DLL crash')));
      const { promise } = cache.getOrCreateCapture(['uniforms'], impl);
      await promise.catch(() => {});
      await vi.advanceTimersByTimeAsync(0); // flush microtasks

      expect(cache.hasPendingCapture).toBe(false);
    });
  });

  // ─── Serialization cache ─────────────────────────────────────────────

  describe('serialization cache', () => {
    it('stores and retrieves serialized results', () => {
      const data = [{ id: 1 }, { id: 2 }];
      cache.setSerializedResult('key1', data);
      expect(cache.getSerializedResult('key1')).toBe(data);
    });

    it('returns undefined for unknown key', () => {
      expect(cache.getSerializedResult('unknown')).toBeUndefined();
    });

    it('clears serialized results on new generation', async () => {
      const impl = vi.fn(() => Promise.resolve([]));

      cache.getOrCreateCapture(['uniforms'], impl);
      cache.setSerializedResult('key1', [{ id: 1 }]);
      expect(cache.getSerializedResult('key1')).toBeTruthy();

      // Force new generation
      await cache.getOrCreateCapture(['uniforms'], impl).promise;
      vi.advanceTimersByTime(FRAME_CACHE_TTL + 100);
      cache.getOrCreateCapture(['uniforms'], impl);

      // Serialized cache should have been cleared
      expect(cache.getSerializedResult('key1')).toBeUndefined();
    });
  });

  // ─── Owner serialization cache ───────────────────────────────────────

  describe('owner serialization cache', () => {
    it('creates cache via factory on first call', () => {
      const factory = vi.fn(() => ({ programs: new Map() }));
      const result = cache.getOwnerSerializationCache(1, factory);
      expect(factory).toHaveBeenCalledOnce();
      expect(result).toEqual({ programs: expect.any(Map) });
    });

    it('reuses cache for same owner and generation', () => {
      const factory = vi.fn(() => ({ id: Math.random() }));
      const r1 = cache.getOwnerSerializationCache(1, factory);
      const r2 = cache.getOwnerSerializationCache(1, factory);
      expect(r1).toBe(r2);
      expect(factory).toHaveBeenCalledOnce();
    });

    it('creates new cache after generation change', async () => {
      const impl = vi.fn(() => Promise.resolve([]));
      const factory = vi.fn(() => ({ gen: cache.generation }));

      cache.getOrCreateCapture(['uniforms'], impl);
      const r1 = cache.getOwnerSerializationCache(1, factory);

      // Force new generation
      await cache.getOrCreateCapture(['uniforms'], impl).promise;
      vi.advanceTimersByTime(FRAME_CACHE_TTL + 100);
      cache.getOrCreateCapture(['uniforms'], impl);

      const r2 = cache.getOwnerSerializationCache(1, factory);
      expect(r2).not.toBe(r1);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Diagnostic state ────────────────────────────────────────────────

  describe('diagnosticState', () => {
    it('reflects current state', async () => {
      const impl = vi.fn(() => Promise.resolve([]));

      let state = cache.diagnosticState();
      expect(state.generation).toBe(0);
      expect(state.hasPending).toBe(false);

      cache.getOrCreateCapture(['uniforms', 'vertexarray'], impl);
      state = cache.diagnosticState();
      expect(state.generation).toBe(1);
      expect(state.hasPending).toBe(true);
      expect(state.knownFeatureCount).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-app shared cache (using REAL FrameCache)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Multi-app shared cache (real FrameCache)', () => {
  let cache: FrameCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new FrameCache();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('3 apps sharing one capture — only 1 DLL call', () => {
    const impl = vi.fn(() => Promise.resolve([{ id: 1 }]));

    const r1 = cache.getOrCreateCapture(['uniforms'], impl);
    const r2 = cache.getOrCreateCapture(['uniforms'], impl);
    const r3 = cache.getOrCreateCapture(['uniforms'], impl);

    expect(r1.hit).toBe(false);
    expect(r2.hit).toBe(true);
    expect(r3.hit).toBe(true);
    expect(impl).toHaveBeenCalledOnce();
    expect(r1.promise).toBe(r2.promise);
    expect(r2.promise).toBe(r3.promise);
  });

  // Note: timeout tests removed — the JS-side timeout wrapper was causing
  // the DLL pump thread's health check to fail. The DLL has its own 10s
  // timeout (IPCTIMEOUTMS) that handles hung captures natively.
});
