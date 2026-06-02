/**
 * Alt1GL API - Detection helpers, constants, and types for Alt1GL apps
 *
 * Apps running in Alt1GL have access to:
 * - `globalThis.alt1gl` - Native addon for GL capture/overlay
 * - `window.alt1Hotkeys` - Hotkey registration API
 *
 * Usage:
 * ```typescript
 * import { isAlt1GL, Modifiers, Keys, getHotkeys } from 'alt1gl-api';
 *
 * if (isAlt1GL()) {
 *   // Register a hotkey
 *   const hotkeys = getHotkeys();
 *   const id = await hotkeys.register(
 *     Modifiers.Ctrl | Modifiers.Shift,
 *     Keys.R,
 *     'reload-data',
 *     () => console.log('Hotkey pressed!')
 *   );
 * }
 * ```
 */

// Re-export all types
export * from './types';

import type { Alt1GLNative, AppWindowAPI } from './types';

// ============================================
// Modifier Key Constants
// ============================================

/**
 * Modifier key flags for hotkey registration
 */
export const Modifiers = {
  None: 0x00,
  Ctrl: 0x01,
  Alt: 0x02,
  Shift: 0x04,
  Win: 0x08,
  // Combinations
  CtrlAlt: 0x03,
  CtrlShift: 0x05,
  AltShift: 0x06,
  CtrlAltShift: 0x07,
} as const;

export type ModifierFlags = typeof Modifiers[keyof typeof Modifiers];

// ============================================
// Virtual Key Codes (common ones)
// ============================================

/**
 * Common virtual key codes
 */
export const Keys = {
  // Letters
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45,
  F: 0x46, G: 0x47, H: 0x48, I: 0x49, J: 0x4A,
  K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E, O: 0x4F,
  P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54,
  U: 0x55, V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,

  // Numbers
  Num0: 0x30, Num1: 0x31, Num2: 0x32, Num3: 0x33, Num4: 0x34,
  Num5: 0x35, Num6: 0x36, Num7: 0x37, Num8: 0x38, Num9: 0x39,

  // Function keys
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74,
  F6: 0x75, F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79,
  F11: 0x7A, F12: 0x7B,

  // Special keys
  Space: 0x20,
  Enter: 0x0D,
  Tab: 0x09,
  Escape: 0x1B,
  Backspace: 0x08,
  Delete: 0x2E,
  Insert: 0x2D,
  Home: 0x24,
  End: 0x23,
  PageUp: 0x21,
  PageDown: 0x22,

  // Arrow keys
  Left: 0x25,
  Up: 0x26,
  Right: 0x27,
  Down: 0x28,

  // Numpad
  Numpad0: 0x60, Numpad1: 0x61, Numpad2: 0x62, Numpad3: 0x63, Numpad4: 0x64,
  Numpad5: 0x65, Numpad6: 0x66, Numpad7: 0x67, Numpad8: 0x68, Numpad9: 0x69,
  NumpadMultiply: 0x6A,
  NumpadAdd: 0x6B,
  NumpadSubtract: 0x6D,
  NumpadDecimal: 0x6E,
  NumpadDivide: 0x6F,
} as const;

export type KeyCode = typeof Keys[keyof typeof Keys];

// ============================================
// Hotkey Types
// ============================================

/**
 * Event data passed to hotkey callbacks
 */
export interface HotkeyEvent {
  hotkeyId: number;
  action: string;
  accelerator: string;
}

/**
 * Information about a registered hotkey
 */
export interface HotkeyInfo {
  id: number;
  appId: string;
  accelerator: string;
  action: string;
  enabled: boolean;
  windowId?: number;
}

/**
 * Formatted hotkey for UI display
 */
export interface FormattedHotkey {
  id: string;
  displayAccelerator: string;
  action: string;
  appName: string;
  enabled: boolean;
  isDefault: boolean;
  description?: string;
}

/**
 * Conflict detection result
 */
export interface ConflictInfo {
  hasConflict: boolean;
  conflictingHotkeys: Array<{
    id: number;
    appId: string;
    accelerator: string;
    action: string;
  }>;
}

/**
 * Hotkey system settings
 */
export interface HotkeySettings {
  globalEnabled: boolean;
  onlyWhenRsFocused: boolean;
}

/**
 * Focus state information
 */
export interface FocusState {
  isRsFocused: boolean;
  rsWindowTitle: string | null;
  rsPid: number | null;
  allowGlobalOverride: boolean;
}

/**
 * Hotkey callback function type
 */
export type HotkeyCallback = (event: HotkeyEvent) => void;

/**
 * Hotkey API interface available at window.alt1Hotkeys
 */
export interface HotkeyAPI {
  /** Modifier key constants */
  Modifiers: typeof Modifiers;
  /** Key code constants */
  Keys: typeof Keys;

  /**
   * Register a hotkey using modifier flags and key code
   * @param modifiers Use Modifiers constants (e.g., Modifiers.Ctrl | Modifiers.Shift)
   * @param keyCode Use Keys constants (e.g., Keys.A)
   * @param action Unique action identifier for your app
   * @param callback Optional callback when hotkey is pressed
   * @returns Promise<number> Hotkey ID for later management
   */
  register(
    modifiers: number,
    keyCode: number,
    action: string,
    callback?: HotkeyCallback
  ): Promise<number>;

  /**
   * Register a hotkey using Electron accelerator string
   * @param accelerator e.g., "Ctrl+Shift+A", "Alt+F1"
   * @param action Unique action identifier
   * @param callback Optional callback when hotkey is pressed
   * @returns Promise<number> Hotkey ID
   */
  registerAccelerator(
    accelerator: string,
    action: string,
    callback?: HotkeyCallback
  ): Promise<number>;

  /**
   * Unregister a hotkey by ID
   */
  unregister(hotkeyId: number): Promise<boolean>;

  /**
   * Enable or disable a specific hotkey
   */
  setEnabled(hotkeyId: number, enabled: boolean): Promise<boolean>;

  /**
   * Get all hotkeys registered by this app
   */
  getAll(): Promise<HotkeyInfo[]>;

  /**
   * Listen for a specific action
   * @returns Function to remove the listener
   */
  onAction(action: string, callback: HotkeyCallback): () => void;

  /**
   * Check if global hotkeys are currently enabled
   */
  isEnabled(): Promise<boolean>;

  /**
   * Get formatted list of hotkeys for UI display
   */
  getFormattedList(appId?: string): Promise<FormattedHotkey[]>;

  /**
   * Change a hotkey's key binding
   * @param hotkeyId The hotkey ID to rebind
   * @param newAccelerator New accelerator string
   */
  updateAccelerator(hotkeyId: number, newAccelerator: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Reset a hotkey to its default binding
   */
  resetToDefault(hotkeyId: number): Promise<boolean>;

  /**
   * Check if an accelerator conflicts with existing hotkeys
   */
  checkConflict(accelerator: string, excludeId?: number): Promise<ConflictInfo>;

  /**
   * Get hotkey system settings
   */
  getSettings(): Promise<HotkeySettings>;

  /**
   * Update hotkey system settings
   */
  updateSettings(updates: Partial<HotkeySettings>): Promise<void>;

  /**
   * Get current RS focus state
   */
  getFocusState(): Promise<FocusState>;

  /**
   * Set global override for hotkeys when RS not focused
   */
  setGlobalOverride(allow: boolean): Promise<void>;
}

// ============================================
// Detection & Access
// ============================================

/**
 * Check if running inside Alt1GL
 * @returns true if native addon is available
 */
export function isAlt1GL(): boolean {
  return typeof globalThis !== 'undefined' && 'alt1gl' in globalThis && (globalThis as any).alt1gl != null;
}

/**
 * Get the native Alt1GL addon
 * @returns Native addon or null if not available
 */
export function getNative(): Alt1GLNative | null {
  if (isAlt1GL()) {
    return (globalThis as any).alt1gl;
  }
  return null;
}

/**
 * Require Alt1GL - throws if not available
 * @returns Native addon
 * @throws Error if not running in Alt1GL
 */
export function requireAlt1GL(): Alt1GLNative {
  const native = getNative();
  if (!native) {
    throw new Error('Alt1GL is not available. This app must run inside the Alt1GL launcher.');
  }
  return native;
}

/**
 * Get the hotkey API
 * @returns HotkeyAPI or null if not available
 */
export function getHotkeys(): HotkeyAPI | null {
  if (typeof window !== 'undefined' && 'alt1Hotkeys' in window) {
    return (window as any).alt1Hotkeys as HotkeyAPI;
  }
  return null;
}

/**
 * Require hotkey API - throws if not available
 * @returns HotkeyAPI
 * @throws Error if not running in Alt1GL
 */
export function requireHotkeys(): HotkeyAPI {
  const api = getHotkeys();
  if (!api) {
    throw new Error('Hotkey API is not available. This app must run inside the Alt1GL launcher.');
  }
  return api;
}

// ============================================
// Global Type Augmentation
// ============================================

declare global {
  // eslint-disable-next-line no-var
  var alt1gl: Alt1GLNative | undefined;

  interface Window {
    alt1Hotkeys?: HotkeyAPI;
    alt1gl?: Alt1GLNative;
    appWindowApi?: AppWindowAPI;
    native?: Alt1GLNative;
  }
}
