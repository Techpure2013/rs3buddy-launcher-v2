/**
 * AddonManager - Singleton that owns the native addon and handle store.
 *
 * Centralizes addon lifecycle: loading, state polling, handle cleanup,
 * and the 10Hz cached state push to isolated renderer windows.
 */

import { loadNativeAddon } from '../inject';
import type { NativeAddon } from '../inject';
import { HandleStore } from './handle-store';
import type { CachedRsState } from './types';

// Polyfill ImageData for the main process. The native C++ addon constructs
// ImageData objects via the global constructor (NAPI: env.Global().Get("ImageData")).
// This class only exists in renderer/browser contexts, not Node.js/main process.
// Without it, all capture() calls throw "Invalid argument".
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8ClampedArray;
    readonly colorSpace: string = 'srgb';

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        // new ImageData(width, height)
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        // new ImageData(data, width, height)
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height ?? (dataOrWidth.length / (widthOrHeight * 4));
      }
    }
  };
  console.log('[AddonManager] ImageData polyfill installed for main process');
}

const STATE_PUSH_INTERVAL_MS = 500; // 2Hz — reduced from 10Hz to lower IPC overhead

class AddonManagerImpl {
  private addon: NativeAddon | null = null;
  private handleStore: HandleStore | null = null;
  private statePushInterval: ReturnType<typeof setInterval> | null = null;
  private cachedState: CachedRsState = { ready: 0, x: 0, y: 0, width: 0, height: 0, hwnd: 0 };
  private stateListeners = new Set<(state: CachedRsState) => void>();
  private initialized = false;

  /** Initialize the addon manager. Safe to call multiple times. */
  init(): boolean {
    if (this.initialized) return this.addon !== null;

    this.initialized = true;
    this.handleStore = new HandleStore();
    this.addon = loadNativeAddon();

    if (!this.addon) {
      console.warn('[AddonManager] Native addon not available');
      return false;
    }

    if (this.addon) {
      try {
        const ready = this.addon.getRsReady();
        console.log('[AddonManager] Initial getRsReady():', ready);
      } catch (e) {
        console.log('[AddonManager] getRsReady() threw on init (expected):', e);
      }
    }

    this.startStatePush();
    console.log('[AddonManager] Initialized');
    return true;
  }

  /** Get the native addon instance (null if not loaded) */
  getAddon(): NativeAddon | null {
    return this.addon;
  }

  /** Get the handle store */
  getHandleStore(): HandleStore {
    if (!this.handleStore) {
      this.handleStore = new HandleStore();
    }
    return this.handleStore;
  }

  /** Get the latest cached RS client state */
  getCachedState(): CachedRsState {
    return this.cachedState;
  }

  /**
   * Register a listener for state updates (called at 10Hz).
   * Used by ipc-handlers to push state to isolated renderer windows.
   */
  onStateUpdate(listener: (state: CachedRsState) => void): () => void {
    this.stateListeners.add(listener);
    return () => { this.stateListeners.delete(listener); };
  }

  /**
   * Clean up all handles owned by a webContentsId.
   * Call this when a window is destroyed.
   */
  cleanupForWindow(webContentsId: number): void {
    if (!this.handleStore) return;
    const count = this.handleStore.disposeForOwner(webContentsId);
    if (count > 0) {
      console.log(`[AddonManager] Disposed ${count} handles for window ${webContentsId}`);
    }
  }

  /** Shut down the addon manager and release all resources */
  shutdown(): void {
    this.stopStatePush();

    if (this.handleStore) {
      this.handleStore.disposeAll();
    }

    this.stateListeners.clear();
    this.addon = null;
    this.initialized = false;
    console.log('[AddonManager] Shut down');
  }

  /** Start the 10Hz state polling loop */
  private startStatePush(): void {
    if (this.statePushInterval) return;

    this.statePushInterval = setInterval(() => {
      this.pollState();
    }, STATE_PUSH_INTERVAL_MS);
  }

  private stopStatePush(): void {
    if (this.statePushInterval) {
      clearInterval(this.statePushInterval);
      this.statePushInterval = null;
    }
  }

  /** Poll the addon for current RS client state and notify listeners */
  private pollState(): void {
    if (!this.addon) return;

    const newState: CachedRsState = {
      ready: 0, x: 0, y: 0, width: 0, height: 0, hwnd: 0,
    };

    try {
      newState.ready = this.addon.getRsReady();
    } catch (e) {
      // getRsReady failed - leave as 0
    }

    if (newState.ready) {
      try { newState.x = this.addon.getRsX(); } catch {}
      try { newState.y = this.addon.getRsY(); } catch {}
      try { newState.width = this.addon.getRsWidth(); } catch {}
      try { newState.height = this.addon.getRsHeight(); } catch {}
      try { newState.hwnd = this.addon.getRsHwnd(); } catch {}
    }

    // Log state transitions
    if (newState.ready && !this.cachedState.ready) {
      console.log(`[AddonManager] RS client connected! ${newState.width}x${newState.height} hwnd=${newState.hwnd}`);
    } else if (!newState.ready && this.cachedState.ready) {
      console.log('[AddonManager] RS client disconnected');
    }

    // Only push if state actually changed
    if (
      newState.ready !== this.cachedState.ready ||
      newState.x !== this.cachedState.x ||
      newState.y !== this.cachedState.y ||
      newState.width !== this.cachedState.width ||
      newState.height !== this.cachedState.height ||
      newState.hwnd !== this.cachedState.hwnd
    ) {
      this.cachedState = newState;
      for (const listener of this.stateListeners) {
        try {
          listener(newState);
        } catch (e) {
          console.warn('[AddonManager] State listener error:', e);
        }
      }
    }
  }
}

/** Singleton instance */
export const addonManager = new AddonManagerImpl();
