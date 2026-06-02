/**
 * Focus Detection Module
 * Detects when RuneScape client is the foreground window
 * Uses active-win package for cross-platform support
 *
 * ToS Compliance: Only uses OS-level window enumeration, no RS memory access
 */

import activeWindow from 'active-win';
import type { FocusState } from './types';

// Configuration
const POLL_INTERVAL_MS = 100;
const RS_WINDOW_PATTERNS = [
  /runescape/i
];
const RS_PROCESS_PATTERNS = [
  /rs2client/i
];

// State
let pollTimer: NodeJS.Timeout | null = null;
let firstPollDone = false;
let currentFocusState: FocusState = {
  isRsFocused: false,
  rsWindowTitle: null,
  rsPid: null,
  allowGlobalOverride: false,
  lastChecked: 0
};

// Callbacks for focus change notifications
type FocusChangeCallback = (state: FocusState) => void;
const focusChangeCallbacks: Set<FocusChangeCallback> = new Set();

/**
 * Check if a window title or process name matches RS patterns
 */
function isRsWindow(title: string | undefined, processName: string | undefined): boolean {
  if (title) {
    for (const pattern of RS_WINDOW_PATTERNS) {
      if (pattern.test(title)) return true;
    }
  }
  if (processName) {
    for (const pattern of RS_PROCESS_PATTERNS) {
      if (pattern.test(processName)) return true;
    }
  }
  return false;
}

/**
 * Poll for the current foreground window
 */
async function pollFocus(): Promise<void> {
  try {
    const win = await activeWindow();
    const now = Date.now();

    const newIsRsFocused = win ? isRsWindow(win.title, win.owner?.name) : false;
    const newTitle = win?.title || null;
    const newPid = win?.owner?.processId || null;

    // Check if focus state changed (or first poll)
    const focusChanged = !firstPollDone || currentFocusState.isRsFocused !== newIsRsFocused;
    firstPollDone = true;

    // Update state
    currentFocusState = {
      isRsFocused: newIsRsFocused,
      rsWindowTitle: newIsRsFocused ? newTitle : null,
      rsPid: newIsRsFocused ? newPid : null,
      allowGlobalOverride: currentFocusState.allowGlobalOverride,
      lastChecked: now
    };

    // Notify callbacks if focus changed
    if (focusChanged) {
      console.log(`[Focus] RS focus changed: ${newIsRsFocused ? 'FOCUSED' : 'UNFOCUSED'}${newIsRsFocused ? ` (${newTitle})` : ''}`);
      for (const callback of focusChangeCallbacks) {
        try {
          callback({ ...currentFocusState });
        } catch (e) {
          console.error('[Focus] Callback error:', e);
        }
      }
    }
  } catch (e) {
    // active-win can fail on some platforms/configurations
    console.error('[Focus] Poll error:', e);
  }
}

/**
 * Start polling for focus changes
 */
export function startFocusPolling(): void {
  if (pollTimer) {
    console.log('[Focus] Polling already started');
    return;
  }

  console.log('[Focus] Starting focus polling');

  // Initial poll
  pollFocus();

  // Start interval
  pollTimer = setInterval(pollFocus, POLL_INTERVAL_MS);
}

/**
 * Stop polling for focus changes
 */
export function stopFocusPolling(): void {
  if (pollTimer) {
    console.log('[Focus] Stopping focus polling');
    clearInterval(pollTimer);
    pollTimer = null;
    firstPollDone = false;
  }
}

/**
 * Get current focus state
 */
export function getFocusState(): FocusState {
  return { ...currentFocusState };
}

/**
 * Check if RS is currently focused
 */
export function isRsFocused(): boolean {
  return currentFocusState.isRsFocused;
}

/**
 * Set the global override flag
 * When true, hotkeys will fire even when RS is not focused
 */
export function setGlobalOverride(allow: boolean): void {
  if (currentFocusState.allowGlobalOverride !== allow) {
    console.log(`[Focus] Global override ${allow ? 'ENABLED' : 'DISABLED'}`);
    currentFocusState.allowGlobalOverride = allow;

    // Notify callbacks of the override change
    for (const callback of focusChangeCallbacks) {
      try {
        callback({ ...currentFocusState });
      } catch (e) {
        console.error('[Focus] Callback error:', e);
      }
    }
  }
}

/**
 * Register a callback for focus changes
 * Returns an unsubscribe function
 */
export function onFocusChange(callback: FocusChangeCallback): () => void {
  focusChangeCallbacks.add(callback);
  return () => {
    focusChangeCallbacks.delete(callback);
  };
}

/**
 * Get whether polling is active
 */
export function isPollingActive(): boolean {
  return pollTimer !== null;
}
