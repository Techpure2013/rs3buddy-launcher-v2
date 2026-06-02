import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HandleStore } from './handle-store';
import { HandleType } from './types';

describe('HandleStore', () => {
  let store: HandleStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new HandleStore();
  });

  afterEach(() => {
    store.disposeAll();
    vi.useRealTimers();
  });

  // ─── Registration ────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns a unique handle ID', () => {
      const id1 = store.register({ name: 'tex1' }, HandleType.TrackedTexture, 1);
      const id2 = store.register({ name: 'tex2' }, HandleType.TrackedTexture, 1);
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('stores the object retrievable by handle ID', () => {
      const obj = { name: 'myTexture' };
      const id = store.register(obj, HandleType.TrackedTexture, 1);
      expect(store.get(id)).toBe(obj);
    });

    it('increments the count', () => {
      expect(store.count()).toBe(0);
      store.register({}, HandleType.TrackedTexture, 1);
      expect(store.count()).toBe(1);
      store.register({}, HandleType.GlProgram, 1);
      expect(store.count()).toBe(2);
    });

    it('tracks transient handles separately', () => {
      const id = store.register({}, HandleType.RenderInvocation, 1, true);
      expect(store.has(id)).toBe(true);
      expect(store.getMeta(id)?.transient).toBe(true);
    });

    it('tracks non-transient handles', () => {
      const id = store.register({}, HandleType.GlProgram, 1, false);
      expect(store.getMeta(id)?.transient).toBe(false);
    });
  });

  // ─── Retrieval ───────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns null for unknown handle', () => {
      expect(store.get('nonexistent')).toBeNull();
    });

    it('validates expected type', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      expect(store.get(id, HandleType.TrackedTexture)).not.toBeNull();
      expect(store.get(id, HandleType.GlProgram)).toBeNull();
    });

    it('validates expected owner', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      expect(store.get(id, undefined, 1)).not.toBeNull();
      expect(store.get(id, undefined, 999)).toBeNull();
    });
  });

  describe('has', () => {
    it('returns true for existing handle', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      expect(store.has(id)).toBe(true);
    });

    it('returns false for disposed handle', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      store.dispose(id);
      expect(store.has(id)).toBe(false);
    });

    it('checks owner when provided', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      expect(store.has(id, 1)).toBe(true);
      expect(store.has(id, 2)).toBe(false);
    });
  });

  // ─── Disposal ────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('removes the handle from the store', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      expect(store.dispose(id)).toBe(true);
      expect(store.get(id)).toBeNull();
      expect(store.count()).toBe(0);
    });

    it('returns false for already-disposed handle', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1);
      store.dispose(id);
      expect(store.dispose(id)).toBe(false);
    });

    it('calls dispose() on TextureSnapshot objects', () => {
      const obj = { dispose: vi.fn() };
      const id = store.register(obj, HandleType.TextureSnapshot, 1);
      store.dispose(id);
      expect(obj.dispose).toHaveBeenCalledOnce();
    });

    it('calls dispose() on RenderInvocation objects', () => {
      const obj = { dispose: vi.fn() };
      const id = store.register(obj, HandleType.RenderInvocation, 1);
      store.dispose(id);
      expect(obj.dispose).toHaveBeenCalledOnce();
    });

    it('calls stop() on GlOverlay objects', () => {
      const obj = { stop: vi.fn() };
      const id = store.register(obj, HandleType.GlOverlay, 1);
      store.dispose(id);
      expect(obj.stop).toHaveBeenCalledOnce();
    });

    it('calls close() on StreamRenderObject objects', () => {
      const obj = { close: vi.fn() };
      const id = store.register(obj, HandleType.StreamRenderObject, 1);
      store.dispose(id);
      expect(obj.close).toHaveBeenCalledOnce();
    });

    it('does not double-dispose shared native objects', () => {
      const sharedObj = { dispose: vi.fn() };
      const id1 = store.register(sharedObj, HandleType.TextureSnapshot, 1);
      const id2 = store.register(sharedObj, HandleType.TextureSnapshot, 1);
      store.dispose(id1);
      store.dispose(id2);
      expect(sharedObj.dispose).toHaveBeenCalledOnce();
    });
  });

  // ─── Owner-based disposal ────────────────────────────────────────────────

  describe('disposeForOwner', () => {
    it('disposes all handles for a given owner', () => {
      store.register({}, HandleType.TrackedTexture, 1);
      store.register({}, HandleType.GlProgram, 1);
      store.register({}, HandleType.TrackedTexture, 2);
      expect(store.disposeForOwner(1)).toBe(2);
      expect(store.count()).toBe(1); // owner 2's handle remains
    });

    it('returns 0 for unknown owner', () => {
      expect(store.disposeForOwner(999)).toBe(0);
    });

    it('does not affect other owners', () => {
      const idOwner2 = store.register({}, HandleType.TrackedTexture, 2);
      store.register({}, HandleType.TrackedTexture, 1);
      store.disposeForOwner(1);
      expect(store.has(idOwner2)).toBe(true);
    });
  });

  // ─── Type-based disposal ─────────────────────────────────────────────────

  describe('disposeByType', () => {
    it('disposes only handles of the given type for the owner', () => {
      store.register({}, HandleType.RenderInvocation, 1);
      store.register({}, HandleType.RenderInvocation, 1);
      const keepId = store.register({}, HandleType.GlProgram, 1);
      expect(store.disposeByType(1, HandleType.RenderInvocation)).toBe(2);
      expect(store.has(keepId)).toBe(true);
      expect(store.count()).toBe(1);
    });

    it('does not affect other owners', () => {
      store.register({}, HandleType.RenderInvocation, 1);
      const other = store.register({}, HandleType.RenderInvocation, 2);
      store.disposeByType(1, HandleType.RenderInvocation);
      expect(store.has(other)).toBe(true);
    });
  });

  describe('disposeTransientByType', () => {
    it('disposes only transient handles of the given type', () => {
      const transient = store.register({}, HandleType.VertexArraySnapshot, 1, true);
      const permanent = store.register({}, HandleType.VertexArraySnapshot, 1, false);
      expect(store.disposeTransientByType(1, HandleType.VertexArraySnapshot)).toBe(1);
      expect(store.has(transient)).toBe(false);
      expect(store.has(permanent)).toBe(true);
    });
  });

  // ─── Transient sweep ─────────────────────────────────────────────────────

  describe('sweepTransient', () => {
    it('disposes transient handles older than TTL', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const id = store.register({}, HandleType.RenderInvocation, 1, true);
      const meta = store.getMeta(id);
      // Verify createdAt was captured with faked time
      expect(meta?.createdAt).toBe(now);

      // Advance system time past 5s TTL
      vi.setSystemTime(now + 6000);

      const swept = store.sweepTransient();
      expect(swept).toBeGreaterThanOrEqual(1);
      expect(store.has(id)).toBe(false);
    });

    it('keeps transient handles younger than TTL', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const id = store.register({}, HandleType.RenderInvocation, 1, true);

      // Only 1s has passed — well within the 5s TTL
      vi.setSystemTime(now + 1000);
      vi.advanceTimersByTime(1000);

      const swept = store.sweepTransient();
      expect(swept).toBe(0);
      expect(store.has(id)).toBe(true);
    });

    it('automatic sweep timer fires every 2s', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      store.register({}, HandleType.RenderInvocation, 1, true);

      // Advance past TTL + sweep interval
      vi.setSystemTime(now + 7000);
      vi.advanceTimersByTime(7000);

      // The sweep should have run automatically and cleaned up
      expect(store.count()).toBe(0);
    });
  });

  // ─── Auto-expire ─────────────────────────────────────────────────────────

  describe('auto-expire', () => {
    it('auto-expires RenderInvocation after 2 minutes', () => {
      const id = store.register({}, HandleType.RenderInvocation, 1, false);

      vi.advanceTimersByTime(120_001); // 2min + 1ms
      expect(store.has(id)).toBe(false);
    });

    it('auto-expires TextureSnapshot after 5 minutes', () => {
      const id = store.register({}, HandleType.TextureSnapshot, 1, false);

      vi.advanceTimersByTime(300_001); // 5min + 1ms
      expect(store.has(id)).toBe(false);
    });

    it('does NOT auto-expire TrackedTexture', () => {
      const id = store.register({}, HandleType.TrackedTexture, 1, false);

      vi.advanceTimersByTime(600_000); // 10 minutes
      expect(store.has(id)).toBe(true);
    });

    it('does NOT auto-expire GlProgram', () => {
      const id = store.register({}, HandleType.GlProgram, 1, false);

      vi.advanceTimersByTime(600_000);
      expect(store.has(id)).toBe(true);
    });

    it('touch() resets the auto-expire timer', () => {
      const id = store.register({}, HandleType.RenderInvocation, 1, false);

      // Advance 90s (within 2min)
      vi.advanceTimersByTime(90_000);
      expect(store.has(id)).toBe(true);

      // Touch to reset timer
      store.touch(id);

      // Advance another 90s — would have been 180s total without touch
      vi.advanceTimersByTime(90_000);
      expect(store.has(id)).toBe(true);

      // Advance past 2min from last touch
      vi.advanceTimersByTime(31_000);
      expect(store.has(id)).toBe(false);
    });
  });

  // ─── Stats ───────────────────────────────────────────────────────────────

  describe('stats', () => {
    it('returns count breakdown by type', () => {
      store.register({}, HandleType.TrackedTexture, 1);
      store.register({}, HandleType.TrackedTexture, 1);
      store.register({}, HandleType.GlProgram, 1);

      const s = store.stats();
      expect(s.total).toBe(3);
      expect(s.TrackedTexture).toBe(2);
      expect(s.GlProgram).toBe(1);
    });
  });

  // ─── Filtered count ──────────────────────────────────────────────────────

  describe('count with filters', () => {
    it('counts by owner', () => {
      store.register({}, HandleType.TrackedTexture, 1);
      store.register({}, HandleType.TrackedTexture, 2);
      store.register({}, HandleType.TrackedTexture, 2);
      expect(store.count({ ownerId: 2 })).toBe(2);
    });

    it('counts by type', () => {
      store.register({}, HandleType.TrackedTexture, 1);
      store.register({}, HandleType.GlProgram, 1);
      store.register({}, HandleType.GlProgram, 1);
      expect(store.count({ type: HandleType.GlProgram })).toBe(2);
    });

    it('counts by owner AND type', () => {
      store.register({}, HandleType.GlProgram, 1);
      store.register({}, HandleType.GlProgram, 2);
      store.register({}, HandleType.TrackedTexture, 1);
      expect(store.count({ ownerId: 1, type: HandleType.GlProgram })).toBe(1);
    });
  });

  // ─── disposeAll ──────────────────────────────────────────────────────────

  describe('disposeAll', () => {
    it('disposes everything', () => {
      store.register({}, HandleType.TrackedTexture, 1);
      store.register({}, HandleType.GlProgram, 2);
      store.register({}, HandleType.RenderInvocation, 3, true);

      const count = store.disposeAll();
      expect(count).toBe(3);
      expect(store.count()).toBe(0);
    });

    it('calls cleanup on all objects', () => {
      const obj1 = { dispose: vi.fn() };
      const obj2 = { stop: vi.fn() };
      store.register(obj1, HandleType.TextureSnapshot, 1);
      store.register(obj2, HandleType.GlOverlay, 1);

      store.disposeAll();
      expect(obj1.dispose).toHaveBeenCalledOnce();
      expect(obj2.stop).toHaveBeenCalledOnce();
    });
  });
});
