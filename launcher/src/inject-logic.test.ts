import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  reconnectToOverlayPure,
  cleanupInjectionPure,
} from './inject-logic';
import type {
  InjectionState,
  ReconnectableAddon,
  CleanableAddon,
} from './inject-logic';

/**
 * Tests for inject-logic.ts — the REAL extracted module.
 * Tests import actual production code, not copies.
 */

// ─── Mock addon factory ─────────────────────────────────────────────────────

function createMockAddon(): ReconnectableAddon & CleanableAddon {
  return {
    debug: {
      exitDll: vi.fn(),
      connectToOverlay: vi.fn((_pid: number) => ({ instanceid: 1, memoryid: 100 })),
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// reconnectToOverlayPure
// ═══════════════════════════════════════════════════════════════════════════════

describe('reconnectToOverlayPure', () => {
  let addon: ReturnType<typeof createMockAddon>;
  let states: Map<number, InjectionState>;

  beforeEach(() => {
    addon = createMockAddon();
    states = new Map();
  });

  it('does NOT call exitDll (C++ connectToOverlay handles cleanup internally)', () => {
    reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(addon.debug.exitDll).not.toHaveBeenCalled();
  });

  it('calls connectToOverlay with the PID', () => {
    reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(addon.debug.connectToOverlay).toHaveBeenCalledWith(12345);
  });

  it('returns success:true on successful connection', () => {
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.success).toBe(true);
  });

  it('stores injection state on success', () => {
    reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(states.has(12345)).toBe(true);
    const state = states.get(12345)!;
    expect(state.instanceId).toBe(1);
    expect(state.memoryId).toBe(100);
    expect(state.pid).toBe(12345);
  });

  it('sets newActiveMemoryId when activeMemoryId was undefined', () => {
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.newActiveMemoryId).toBe(100);
  });

  it('preserves existing activeMemoryId when already set', () => {
    const result = reconnectToOverlayPure(addon, 12345, states, 42);
    expect(result.newActiveMemoryId).toBe(42);
  });

  it('returns success:false when connectToOverlay returns null', () => {
    (addon.debug.connectToOverlay as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.success).toBe(false);
    expect(states.has(12345)).toBe(false);
  });

  it('handles connectToOverlay throwing', () => {
    (addon.debug.connectToOverlay as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('failed'); });
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.success).toBe(false);
  });

  it('returns instanceId on success', () => {
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.instanceId).toBe(1);
  });

  it('handles memoryid being undefined in result', () => {
    (addon.debug.connectToOverlay as ReturnType<typeof vi.fn>).mockReturnValue({ instanceid: 5 });
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.success).toBe(true);
    expect(result.newActiveMemoryId).toBe(0); // defaults to 0
    expect(states.get(12345)?.memoryId).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// cleanupInjectionPure
// ═══════════════════════════════════════════════════════════════════════════════

describe('cleanupInjectionPure', () => {
  it('calls exitDll on the addon', () => {
    const addon = createMockAddon();
    const states = new Map<number, InjectionState>();
    cleanupInjectionPure(addon, states);
    expect(addon.debug.exitDll).toHaveBeenCalledOnce();
  });

  it('clears all injection states', () => {
    const addon = createMockAddon();
    const states = new Map<number, InjectionState>();
    states.set(1, { pid: 1, dllPath: '', instanceId: 1, memoryId: 0 });
    states.set(2, { pid: 2, dllPath: '', instanceId: 2, memoryId: 0 });
    cleanupInjectionPure(addon, states);
    expect(states.size).toBe(0);
  });

  it('handles null addon gracefully', () => {
    const states = new Map<number, InjectionState>();
    states.set(1, { pid: 1, dllPath: '', instanceId: 1, memoryId: 0 });
    cleanupInjectionPure(null, states);
    expect(states.size).toBe(0);
  });

  it('handles exitDll throwing', () => {
    const addon = createMockAddon();
    (addon.debug.exitDll as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('no session'); });
    const states = new Map<number, InjectionState>();
    states.set(1, { pid: 1, dllPath: '', instanceId: 1, memoryId: 0 });
    cleanupInjectionPure(addon, states);
    expect(states.size).toBe(0); // still cleared despite error
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Full reconnection scenario
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full reconnection scenario', () => {
  it('reconnect → verify state → cleanup → verify clean', () => {
    const addon = createMockAddon();
    const states = new Map<number, InjectionState>();

    // Reconnect
    const result = reconnectToOverlayPure(addon, 12345, states, undefined);
    expect(result.success).toBe(true);
    expect(states.size).toBe(1);

    // Cleanup
    cleanupInjectionPure(addon, states);
    expect(states.size).toBe(0);
  });

  it('multiple PIDs tracked independently', () => {
    const addon = createMockAddon();
    const states = new Map<number, InjectionState>();

    let callCount = 0;
    (addon.debug.connectToOverlay as ReturnType<typeof vi.fn>).mockImplementation((pid: number) => {
      callCount++;
      return { instanceid: callCount, memoryid: pid };
    });

    reconnectToOverlayPure(addon, 111, states, undefined);
    reconnectToOverlayPure(addon, 222, states, undefined);
    reconnectToOverlayPure(addon, 333, states, undefined);

    expect(states.size).toBe(3);
    expect(states.get(111)?.instanceId).toBe(1);
    expect(states.get(222)?.instanceId).toBe(2);
    expect(states.get(333)?.instanceId).toBe(3);
  });
});
