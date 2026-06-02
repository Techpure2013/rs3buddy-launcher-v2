/**
 * CallbackRegistry - Manages GL log and debug log callback subscriptions.
 *
 * The native addon supports a single global callback for GL logs and debug logs.
 * This registry multiplexes that single callback to multiple renderer windows,
 * forwarding log data via webContents.send().
 */

import type { WebContents } from 'electron';
import type { NativeAddon } from '../inject';
import { IpcChannels } from './types';

interface CallbackEntry {
  ownerId: number;
  webContents: WebContents;
}

export class CallbackRegistry {
  private glLogSubscribers = new Map<number, CallbackEntry>();
  private debugLogSubscribers = new Map<number, CallbackEntry>();
  private glLogInstalled = false;
  private debugLogInstalled = false;

  /**
   * Subscribe a window to GL log events.
   * Installs the native callback on first subscriber.
   */
  subscribeGlLog(webContents: WebContents, addon: NativeAddon): void {
    const ownerId = webContents.id;
    if (this.glLogSubscribers.has(ownerId)) return;

    this.glLogSubscribers.set(ownerId, { ownerId, webContents });

    if (!this.glLogInstalled) {
      addon.setGlLogCb((packet) => {
        this.broadcastGlLog(packet);
      });
      this.glLogInstalled = true;
    }
  }

  /** Unsubscribe a window from GL log events */
  unsubscribeGlLog(ownerId: number, addon: NativeAddon): void {
    this.glLogSubscribers.delete(ownerId);

    if (this.glLogSubscribers.size === 0 && this.glLogInstalled) {
      addon.setGlLogCb(null);
      this.glLogInstalled = false;
    }
  }

  /**
   * Subscribe a window to debug log events.
   * Installs the native callback on first subscriber.
   */
  subscribeDebugLog(webContents: WebContents, addon: NativeAddon): void {
    const ownerId = webContents.id;
    if (this.debugLogSubscribers.has(ownerId)) return;

    this.debugLogSubscribers.set(ownerId, { ownerId, webContents });

    if (!this.debugLogInstalled) {
      addon.debug.setLogCb((message) => {
        this.broadcastDebugLog(message);
      });
      this.debugLogInstalled = true;
    }
  }

  /** Unsubscribe a window from debug log events */
  unsubscribeDebugLog(ownerId: number, addon: NativeAddon): void {
    this.debugLogSubscribers.delete(ownerId);

    if (this.debugLogSubscribers.size === 0 && this.debugLogInstalled) {
      addon.debug.setLogCb(() => {});
      this.debugLogInstalled = false;
    }
  }

  /** Unsubscribe a window from all callbacks */
  unsubscribeAll(ownerId: number, addon: NativeAddon): void {
    this.unsubscribeGlLog(ownerId, addon);
    this.unsubscribeDebugLog(ownerId, addon);
  }

  /** Clean up all callbacks */
  shutdown(addon: NativeAddon | null): void {
    this.glLogSubscribers.clear();
    this.debugLogSubscribers.clear();

    if (addon) {
      if (this.glLogInstalled) {
        try { addon.setGlLogCb(null); } catch { /* ignore */ }
        this.glLogInstalled = false;
      }
      if (this.debugLogInstalled) {
        try { addon.debug.setLogCb(() => {}); } catch { /* ignore */ }
        this.debugLogInstalled = false;
      }
    }
  }

  /** Broadcast GL log packet to all subscribers */
  private broadcastGlLog(packet: { id: number; thread: number; data: Uint8Array }): void {
    for (const entry of this.glLogSubscribers.values()) {
      if (entry.webContents.isDestroyed()) continue;
      try {
        entry.webContents.send(IpcChannels.CALLBACK_GL_LOG, packet);
      } catch {
        // Window may have been destroyed between check and send
      }
    }
  }

  /** Broadcast debug log message to all subscribers */
  private broadcastDebugLog(message: string): void {
    for (const entry of this.debugLogSubscribers.values()) {
      if (entry.webContents.isDestroyed()) continue;
      try {
        entry.webContents.send(IpcChannels.CALLBACK_DEBUG_LOG, { message });
      } catch {
        // Window may have been destroyed between check and send
      }
    }
  }
}
