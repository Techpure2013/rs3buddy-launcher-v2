/**
 * Hotkey Management System
 * Provides per-app hotkey registration with enable/disable support
 */

import { globalShortcut, BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import {
  getHotkeysSettings,
  addHotkeyConfig,
  removeHotkeyConfig,
  getHotkeyConfig,
  updateHotkeyConfig
} from './config';
import { getFocusState } from './focus';
import { registerOverlayHotkey, unregisterOverlayHotkey } from './overlay-ipc';
import type { HotkeyConfig, FormattedHotkey, ConflictInfo } from './types';

// ============================================
// Types
// ============================================

export interface HotkeyInfo {
  id: number;
  appId: string;
  accelerator: string;  // Electron accelerator format: "Ctrl+Shift+A"
  action: string;
  enabled: boolean;
  windowId?: number;    // BrowserWindow webContents id to send events to
}

export interface HotkeyEvent {
  hotkeyId: number;
  action: string;
  accelerator: string;
}

// ============================================
// State
// ============================================

const hotkeys = new Map<number, HotkeyInfo>();
let nextId = 1;
let globalEnabled = true;

// Track which accelerators are currently registered with Electron
const registeredAccelerators = new Set<string>();

// Map runtime IDs to persistent UUIDs and vice versa
const idToUuid = new Map<number, string>();
const uuidToId = new Map<string, number>();

// Track which apps have open windows
const openAppIds = new Set<string>();

// ============================================
// Helper Functions
// ============================================

/**
 * Find an existing hotkey matching appId and action
 * Returns the runtime ID if found, undefined otherwise
 */
function findExistingHotkey(appId: string, action: string): number | undefined {
  for (const [id, hk] of hotkeys) {
    if (hk.appId === appId && hk.action === action) {
      return id;
    }
  }
  return undefined;
}

/**
 * Internal: Register a hotkey by accelerator with optional persistence skip
 */
function registerHotkeyByAcceleratorInternal(
  accelerator: string,
  action: string,
  appId: string = 'unknown',
  windowId?: number,
  skipPersistence: boolean = false
): number {
  // Dedup: if this app already has a hotkey for this action, reuse it.
  // Do NOT update the accelerator — the persisted value is the user's choice.
  // Apps always send their default accelerator on re-register, which would
  // overwrite the user's custom binding.
  const existingId = findExistingHotkey(appId, action);
  if (existingId !== undefined) {
    const existing = hotkeys.get(existingId)!;
    if (windowId !== undefined) {
      existing.windowId = windowId;
    }
    console.log(`[Hotkeys] Dedup: reusing hotkey ${existingId} for ${action} (app: ${appId}, keeping accelerator: ${existing.accelerator})`);
    return existingId;
  }

  const id = nextId++;

  const info: HotkeyInfo = {
    id,
    appId,
    accelerator,
    action,
    enabled: true,
    windowId,
  };

  hotkeys.set(id, info);
  updateAcceleratorRegistration(accelerator);

  if (!skipPersistence) {
    // Generate UUID and persist
    const uuid = randomUUID();
    idToUuid.set(id, uuid);
    uuidToId.set(uuid, id);

    const hotkeyConfig: HotkeyConfig = {
      id: uuid,
      appId,
      accelerator,
      defaultAccelerator: accelerator,
      action,
      enabled: true
    };
    addHotkeyConfig(hotkeyConfig);
  }

  console.log(`[Hotkeys] Registered hotkey ${id}: ${accelerator} -> ${action} (app: ${appId})`);
  return id;
}

// ============================================
// Persistence Initialization
// ============================================

/**
 * Initialize hotkey persistence - restore hotkeys from config
 * Call this on app startup after config is loaded
 */
export function initHotkeyPersistence(): void {
  const settings = getHotkeysSettings();
  console.log('[Hotkeys] Initializing persistence, found', settings.registeredHotkeys.length, 'saved hotkeys');

  // Set global enabled state from settings
  globalEnabled = settings.globalEnabled;

  for (const config of settings.registeredHotkeys) {
    if (!config.enabled) continue;

    // Register the hotkey and map IDs (skip persistence save since we're loading)
    const runtimeId = registerHotkeyByAcceleratorInternal(
      config.accelerator,
      config.action,
      config.appId,
      undefined,
      true // skipPersistence flag
    );

    idToUuid.set(runtimeId, config.id);
    uuidToId.set(config.id, runtimeId);

    // Start disabled - will be enabled when app window opens
    const hk = hotkeys.get(runtimeId);
    if (hk) {
      hk.enabled = false;
      updateAcceleratorRegistration(hk.accelerator);
    }

    console.log('[Hotkeys] Restored hotkey:', config.id, '->', config.accelerator);
  }
}

/**
 * Notify hotkey system that an app window has opened
 */
export function onAppWindowOpened(appId: string): void {
  openAppIds.add(appId);
  // Re-enable any disabled hotkeys for this app
  for (const hk of hotkeys.values()) {
    if (hk.appId === appId && !hk.enabled) {
      hk.enabled = true;
      updateAcceleratorRegistration(hk.accelerator);
    }
  }
  console.log(`[Hotkeys] App window opened: ${appId}, enabled hotkeys`);
}

/**
 * Notify hotkey system that an app window has closed
 */
export function onAppWindowClosed(appId: string): void {
  openAppIds.delete(appId);
  // Disable hotkeys for this app (don't unregister - keep in persistence)
  for (const hk of hotkeys.values()) {
    if (hk.appId === appId && hk.enabled) {
      hk.enabled = false;
      updateAcceleratorRegistration(hk.accelerator);
    }
  }
  console.log(`[Hotkeys] App window closed: ${appId}, disabled hotkeys`);
}

// ============================================
// Key Code Conversion
// ============================================

// Convert modifier flags to Electron accelerator prefix
function modifiersToAccelerator(modifiers: number): string {
  const parts: string[] = [];
  if (modifiers & 0x01) parts.push('Ctrl');
  if (modifiers & 0x02) parts.push('Alt');
  if (modifiers & 0x04) parts.push('Shift');
  if (modifiers & 0x08) parts.push('Super');  // Win key
  return parts.join('+');
}

// Convert virtual key code to Electron key name
function keyCodeToName(keyCode: number): string {
  // Letters A-Z
  if (keyCode >= 0x41 && keyCode <= 0x5A) {
    return String.fromCharCode(keyCode);
  }

  // Numbers 0-9
  if (keyCode >= 0x30 && keyCode <= 0x39) {
    return String.fromCharCode(keyCode);
  }

  // Function keys F1-F24
  if (keyCode >= 0x70 && keyCode <= 0x87) {
    return `F${keyCode - 0x70 + 1}`;
  }

  // Numpad 0-9
  if (keyCode >= 0x60 && keyCode <= 0x69) {
    return `num${keyCode - 0x60}`;
  }

  // Special keys
  const specialKeys: { [key: number]: string } = {
    0x08: 'Backspace',
    0x09: 'Tab',
    0x0D: 'Enter',
    0x1B: 'Escape',
    0x20: 'Space',
    0x21: 'PageUp',
    0x22: 'PageDown',
    0x23: 'End',
    0x24: 'Home',
    0x25: 'Left',
    0x26: 'Up',
    0x27: 'Right',
    0x28: 'Down',
    0x2D: 'Insert',
    0x2E: 'Delete',
    0x6A: 'nummult',
    0x6B: 'numadd',
    0x6D: 'numsub',
    0x6E: 'numdec',
    0x6F: 'numdiv',
    0xBA: ';',
    0xBB: '=',
    0xBC: ',',
    0xBD: '-',
    0xBE: '.',
    0xBF: '/',
    0xC0: '`',
    0xDB: '[',
    0xDC: '\\',
    0xDD: ']',
    0xDE: "'",
  };

  return specialKeys[keyCode] || `VK${keyCode.toString(16).toUpperCase()}`;
}

// Build Electron accelerator string from modifiers and key code
export function buildAccelerator(modifiers: number, keyCode: number): string {
  const modStr = modifiersToAccelerator(modifiers);
  const keyName = keyCodeToName(keyCode);
  return modStr ? `${modStr}+${keyName}` : keyName;
}

// ============================================
// Internal Functions
// ============================================

function updateAcceleratorRegistration(accelerator: string): void {
  // Check if any enabled hotkey uses this accelerator
  let shouldBeRegistered = false;

  if (globalEnabled) {
    for (const hk of hotkeys.values()) {
      if (hk.accelerator === accelerator && hk.enabled) {
        shouldBeRegistered = true;
        break;
      }
    }
  }

  const isRegistered = registeredAccelerators.has(accelerator);

  if (shouldBeRegistered && !isRegistered) {
    // Register the accelerator
    try {
      const success = globalShortcut.register(accelerator, () => {
        onHotkeyPressed(accelerator);
      });
      if (success) {
        registeredAccelerators.add(accelerator);
        console.log(`[Hotkeys] Registered: ${accelerator}`);
      } else {
        console.warn(`[Hotkeys] Failed to register: ${accelerator}`);
      }
    } catch (e) {
      console.error(`[Hotkeys] Error registering ${accelerator}:`, e);
    }
  } else if (!shouldBeRegistered && isRegistered) {
    // Unregister the accelerator
    try {
      globalShortcut.unregister(accelerator);
      registeredAccelerators.delete(accelerator);
      console.log(`[Hotkeys] Unregistered: ${accelerator}`);
    } catch (e) {
      console.error(`[Hotkeys] Error unregistering ${accelerator}:`, e);
    }
  }
}

function onHotkeyPressed(accelerator: string): void {
  if (!globalEnabled) return;

  // Focus check - only fire if RS is focused (when setting enabled)
  const settings = getHotkeysSettings();
  if (settings.onlyWhenRsFocused) {
    const focusState = getFocusState();
    if (!focusState.isRsFocused && !focusState.allowGlobalOverride) {
      console.log(`[Hotkeys] Suppressed ${accelerator} - RS not focused`);
      return;
    }
  }

  // Find all enabled hotkeys with this accelerator and dispatch events
  for (const hk of hotkeys.values()) {
    if (hk.accelerator === accelerator && hk.enabled) {
      dispatchHotkeyEvent(hk);
    }
  }
}

function dispatchHotkeyEvent(hk: HotkeyInfo): void {
  const event: HotkeyEvent = {
    hotkeyId: hk.id,
    action: hk.action,
    accelerator: hk.accelerator,
  };

  console.log(`[Hotkeys] Dispatching: ${hk.action} (${hk.accelerator}) to app ${hk.appId}`);

  // If we have a specific window ID, send to that window
  if (hk.windowId) {
    const allWindows = BrowserWindow.getAllWindows();
    for (const win of allWindows) {
      if (win.webContents.id === hk.windowId && !win.isDestroyed()) {
        win.webContents.send('hotkey-pressed', event);
        return;
      }
    }
  }

  // Otherwise, send to all windows with matching appId in their URL or title
  // This is a fallback - apps should provide windowId when registering
  const allWindows = BrowserWindow.getAllWindows();
  for (const win of allWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('hotkey-pressed', event);
    }
  }
}

/**
 * Handle a hotkey event from the overlay DLL (via named pipe IPC).
 * The DLL detects key presses in the RS3 process and sends them here.
 * Looks up the registered hotkey by appId + action and dispatches to windows.
 */
export function handleOverlayHotkeyEvent(event: { hotkeyId: number; appId: string; action: string }): void {
  if (!globalEnabled) return;

  // Find matching hotkey by appId + action
  for (const hk of hotkeys.values()) {
    if (hk.appId === event.appId && hk.action === event.action && hk.enabled) {
      console.log(`[Hotkeys] DLL hotkey: ${hk.action} (${hk.accelerator}) for app ${hk.appId}`);
      dispatchHotkeyEvent(hk);
      return;
    }
  }

  console.log(`[Hotkeys] DLL hotkey not found: appId=${event.appId} action=${event.action}`);
}

// ============================================
// Public API
// ============================================

/**
 * Register a hotkey
 * @param modifiers Modifier flags (Ctrl=1, Alt=2, Shift=4, Win=8)
 * @param keyCode Virtual key code
 * @param action Action identifier string
 * @param appId App identifier
 * @param windowId Optional webContents ID for targeted dispatch
 * @returns Hotkey ID
 */
export function registerHotkey(
  modifiers: number,
  keyCode: number,
  action: string,
  appId: string = 'unknown',
  windowId?: number
): number {
  const accelerator = buildAccelerator(modifiers, keyCode);

  // Dedup: if this app already has a hotkey for this action, update it instead
  const existingId = findExistingHotkey(appId, action);
  if (existingId !== undefined) {
    const existing = hotkeys.get(existingId)!;
    if (existing.accelerator !== accelerator) {
      // Accelerator changed - update it
      updateHotkeyAccelerator(existingId, accelerator);
    }
    // Update windowId if provided
    if (windowId !== undefined) {
      existing.windowId = windowId;
    }
    // Always re-notify DLL (it may have lost registrations after context recreation)
    registerOverlayHotkey(appId, modifiers, keyCode, action);
    console.log(`[Hotkeys] Dedup: reusing hotkey ${existingId} for ${action} (app: ${appId})`);
    return existingId;
  }

  const id = nextId++;

  const info: HotkeyInfo = {
    id,
    appId,
    accelerator,
    action,
    enabled: true,
    windowId,
  };

  hotkeys.set(id, info);
  updateAcceleratorRegistration(accelerator);

  // Generate UUID and persist
  const uuid = randomUUID();
  idToUuid.set(id, uuid);
  uuidToId.set(uuid, id);

  const hotkeyConfig: HotkeyConfig = {
    id: uuid,
    appId,
    accelerator,
    defaultAccelerator: accelerator,
    action,
    enabled: true
  };
  addHotkeyConfig(hotkeyConfig);

  // Notify overlay DLL about the new hotkey
  registerOverlayHotkey(appId, modifiers, keyCode, action);

  console.log(`[Hotkeys] Registered hotkey ${id}: ${accelerator} -> ${action} (app: ${appId})`);
  return id;
}

/**
 * Register a hotkey using Electron accelerator string directly
 */
export function registerHotkeyByAccelerator(
  accelerator: string,
  action: string,
  appId: string = 'unknown',
  windowId?: number
): number {
  return registerHotkeyByAcceleratorInternal(accelerator, action, appId, windowId, false);
}

/**
 * Unregister a hotkey by ID
 */
export function unregisterHotkey(hotkeyId: number): boolean {
  const hk = hotkeys.get(hotkeyId);
  if (!hk) return false;

  const accelerator = hk.accelerator;

  // Notify overlay to remove this hotkey
  unregisterOverlayHotkey(hk.appId, hk.action);

  hotkeys.delete(hotkeyId);
  updateAcceleratorRegistration(accelerator);

  // Remove from persistence
  const uuid = idToUuid.get(hotkeyId);
  if (uuid) {
    removeHotkeyConfig(uuid);
    idToUuid.delete(hotkeyId);
    uuidToId.delete(uuid);
  }

  console.log(`[Hotkeys] Unregistered hotkey ${hotkeyId}`);
  return true;
}

/**
 * Unregister all hotkeys for an app
 */
export function unregisterAppHotkeys(appId: string): number {
  const toRemove: number[] = [];
  const acceleratorsToUpdate = new Set<string>();

  for (const [id, hk] of hotkeys) {
    if (hk.appId === appId) {
      toRemove.push(id);
      acceleratorsToUpdate.add(hk.accelerator);
      // Notify overlay to remove this hotkey
      unregisterOverlayHotkey(hk.appId, hk.action);
    }
  }

  for (const id of toRemove) {
    hotkeys.delete(id);
  }

  for (const acc of acceleratorsToUpdate) {
    updateAcceleratorRegistration(acc);
  }

  console.log(`[Hotkeys] Unregistered ${toRemove.length} hotkeys for app ${appId}`);
  return toRemove.length;
}

/**
 * Unregister all hotkeys for a window
 */
export function unregisterWindowHotkeys(windowId: number): number {
  const toRemove: number[] = [];
  const acceleratorsToUpdate = new Set<string>();

  for (const [id, hk] of hotkeys) {
    if (hk.windowId === windowId) {
      toRemove.push(id);
      acceleratorsToUpdate.add(hk.accelerator);
      // Notify overlay to remove this hotkey
      unregisterOverlayHotkey(hk.appId, hk.action);
    }
  }

  for (const id of toRemove) {
    hotkeys.delete(id);
  }

  for (const acc of acceleratorsToUpdate) {
    updateAcceleratorRegistration(acc);
  }

  console.log(`[Hotkeys] Unregistered ${toRemove.length} hotkeys for window ${windowId}`);
  return toRemove.length;
}

/**
 * Enable or disable a hotkey
 */
export function setHotkeyEnabled(hotkeyId: number, enabled: boolean): boolean {
  const hk = hotkeys.get(hotkeyId);
  if (!hk) return false;

  if (hk.enabled !== enabled) {
    hk.enabled = enabled;
    updateAcceleratorRegistration(hk.accelerator);
    console.log(`[Hotkeys] Hotkey ${hotkeyId} ${enabled ? 'enabled' : 'disabled'}`);
  }
  return true;
}

/**
 * Enable or disable all hotkeys globally
 */
export function setGlobalEnabled(enabled: boolean): void {
  if (globalEnabled !== enabled) {
    globalEnabled = enabled;

    // Update all accelerator registrations
    const allAccelerators = new Set<string>();
    for (const hk of hotkeys.values()) {
      allAccelerators.add(hk.accelerator);
    }

    for (const acc of allAccelerators) {
      updateAcceleratorRegistration(acc);
    }

    console.log(`[Hotkeys] Global hotkeys ${enabled ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Check if global hotkeys are enabled
 */
export function isGlobalEnabled(): boolean {
  return globalEnabled;
}

/**
 * Get all registered hotkeys
 */
export function getRegisteredHotkeys(appId?: string): HotkeyInfo[] {
  const result: HotkeyInfo[] = [];
  for (const hk of hotkeys.values()) {
    if (!appId || hk.appId === appId) {
      result.push({ ...hk });
    }
  }
  return result;
}

/**
 * Get a hotkey by ID
 */
export function getHotkey(hotkeyId: number): HotkeyInfo | undefined {
  const hk = hotkeys.get(hotkeyId);
  return hk ? { ...hk } : undefined;
}

/**
 * Clear all hotkeys
 */
export function clearAllHotkeys(): void {
  // Unregister all from Electron
  for (const acc of registeredAccelerators) {
    try {
      globalShortcut.unregister(acc);
    } catch {
      // Ignore
    }
  }
  registeredAccelerators.clear();
  hotkeys.clear();
  console.log('[Hotkeys] Cleared all hotkeys');
}

/**
 * Cleanup - call on app quit
 */
export function cleanup(): void {
  clearAllHotkeys();
  globalShortcut.unregisterAll();
  console.log('[Hotkeys] Cleanup complete');
}

// ============================================
// Rebinding Support
// ============================================

/**
 * Update a hotkey's accelerator (rebind to a new key combination)
 */
export function updateHotkeyAccelerator(
  hotkeyId: number,
  newAccelerator: string
): { success: boolean; error?: string } {
  const hk = hotkeys.get(hotkeyId);
  if (!hk) {
    return { success: false, error: 'Hotkey not found' };
  }

  // Validate accelerator format (basic check)
  if (!newAccelerator || newAccelerator.trim() === '') {
    return { success: false, error: 'Invalid accelerator' };
  }

  const oldAccelerator = hk.accelerator;

  // Unregister old accelerator
  hk.enabled = false;
  updateAcceleratorRegistration(oldAccelerator);

  // Update to new accelerator
  hk.accelerator = newAccelerator;
  hk.enabled = true;
  updateAcceleratorRegistration(newAccelerator);

  // Update persistence
  const uuid = idToUuid.get(hotkeyId);
  if (uuid) {
    updateHotkeyConfig(uuid, { accelerator: newAccelerator });
  }

  console.log(`[Hotkeys] Rebound hotkey ${hotkeyId}: ${oldAccelerator} -> ${newAccelerator}`);
  return { success: true };
}

/**
 * Update a hotkey's accelerator by UUID (for UI rebind)
 */
export function updateHotkeyAcceleratorByUuid(
  uuid: string,
  newAccelerator: string
): { success: boolean; error?: string } {
  const runtimeId = uuidToId.get(uuid);
  if (runtimeId === undefined) {
    return { success: false, error: 'Hotkey not found' };
  }
  return updateHotkeyAccelerator(runtimeId, newAccelerator);
}

/**
 * Reset a hotkey to its default accelerator
 */
export function resetHotkeyToDefault(hotkeyId: number): boolean {
  const uuid = idToUuid.get(hotkeyId);
  if (!uuid) return false;

  const config = getHotkeyConfig(uuid);
  if (!config || !config.defaultAccelerator) return false;

  const result = updateHotkeyAccelerator(hotkeyId, config.defaultAccelerator);
  return result.success;
}

// ============================================
// Conflict Detection
// ============================================

/**
 * Modifier combinations to try when finding alternatives
 * Ordered by preference (simpler combinations first)
 */
const MODIFIER_ALTERNATIVES = [
  0x01,       // Ctrl
  0x02,       // Alt
  0x04,       // Shift
  0x03,       // Ctrl+Alt
  0x05,       // Ctrl+Shift
  0x06,       // Alt+Shift
  0x07,       // Ctrl+Alt+Shift
];

/**
 * Convert modifier flags to accelerator prefix
 */
function modifierFlagsToPrefix(modifiers: number): string {
  const parts: string[] = [];
  if (modifiers & 0x01) parts.push('Ctrl');
  if (modifiers & 0x02) parts.push('Alt');
  if (modifiers & 0x04) parts.push('Shift');
  if (modifiers & 0x08) parts.push('Super');
  return parts.join('+');
}

/**
 * Extract the key part from an accelerator (e.g., "Ctrl+Shift+A" -> "A")
 */
function extractKeyFromAccelerator(accelerator: string): string {
  const parts = accelerator.split('+');
  return parts[parts.length - 1];
}

/**
 * Extract modifier flags from an accelerator string
 */
function extractModifiersFromAccelerator(accelerator: string): number {
  let modifiers = 0;
  const upper = accelerator.toUpperCase();
  if (upper.includes('CTRL') || upper.includes('CONTROL')) modifiers |= 0x01;
  if (upper.includes('ALT')) modifiers |= 0x02;
  if (upper.includes('SHIFT')) modifiers |= 0x04;
  if (upper.includes('SUPER') || upper.includes('WIN') || upper.includes('META')) modifiers |= 0x08;
  return modifiers;
}

/**
 * Check if an accelerator conflicts with existing hotkeys
 */
export function checkConflict(accelerator: string, excludeId?: number): ConflictInfo {
  const conflicts: Array<{
    id: number;
    appId: string;
    accelerator: string;
    action: string;
  }> = [];

  for (const [id, hk] of hotkeys) {
    if (hk.accelerator.toLowerCase() === accelerator.toLowerCase() && id !== excludeId) {
      conflicts.push({
        id,
        appId: hk.appId,
        accelerator: hk.accelerator,
        action: hk.action
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictingHotkeys: conflicts
  };
}

/**
 * Find an available alternative accelerator for the same key
 * Returns null if no alternative is available
 */
export function findAlternativeAccelerator(
  requestedAccelerator: string,
  excludeAppId?: string
): {
  available: boolean;
  alternative: string | null;
  originalModifiers: string;
  alternativeModifiers: string | null;
  key: string;
} {
  const key = extractKeyFromAccelerator(requestedAccelerator);
  const requestedModifiers = extractModifiersFromAccelerator(requestedAccelerator);
  const originalModifiersStr = modifierFlagsToPrefix(requestedModifiers);

  // Try each modifier combination
  for (const modifiers of MODIFIER_ALTERNATIVES) {
    // Skip the originally requested modifier combination
    if (modifiers === requestedModifiers) continue;

    const alternativeAccelerator = modifiers > 0
      ? `${modifierFlagsToPrefix(modifiers)}+${key}`
      : key;

    // Check if this alternative is available
    let isAvailable = true;
    for (const hk of hotkeys.values()) {
      if (hk.accelerator.toLowerCase() === alternativeAccelerator.toLowerCase()) {
        // If it's the same app, that's okay (they can have multiple)
        if (excludeAppId && hk.appId === excludeAppId) continue;
        isAvailable = false;
        break;
      }
    }

    if (isAvailable) {
      return {
        available: true,
        alternative: alternativeAccelerator,
        originalModifiers: originalModifiersStr,
        alternativeModifiers: modifierFlagsToPrefix(modifiers),
        key
      };
    }
  }

  // No alternative found
  return {
    available: false,
    alternative: null,
    originalModifiers: originalModifiersStr,
    alternativeModifiers: null,
    key
  };
}

/**
 * Result of attempting to register with conflict resolution
 */
export interface ConflictResolutionResult {
  success: boolean;
  hotkeyId: number;
  hadConflict: boolean;
  conflictingApp?: string;
  usedAlternative: boolean;
  originalAccelerator: string;
  finalAccelerator: string;
  alternativeSuggestion?: {
    accelerator: string;
    modifiers: string;
  } | null;
}

/**
 * Internal registration function for conflict resolution
 * This is used by registerHotkeyWithConflictCheck
 */
function registerHotkeyInternal(
  modifiers: number,
  keyCode: number,
  action: string,
  appId: string,
  windowId?: number,
  persist: boolean = true
): number {
  const accelerator = buildAccelerator(modifiers, keyCode);

  // Dedup: if this app already has a hotkey for this action, reuse it
  const existingId = findExistingHotkey(appId, action);
  if (existingId !== undefined) {
    const existing = hotkeys.get(existingId)!;
    if (existing.accelerator !== accelerator) {
      updateHotkeyAccelerator(existingId, accelerator);
    }
    if (windowId !== undefined) {
      existing.windowId = windowId;
    }
    // Always re-notify DLL (it may have lost registrations after context recreation)
    registerOverlayHotkey(appId, modifiers, keyCode, action);
    console.log(`[Hotkeys] Dedup: reusing hotkey ${existingId} for ${action} (app: ${appId})`);
    return existingId;
  }

  const id = nextId++;

  // Generate UUID for persistence
  const uuid = randomUUID();

  const info: HotkeyInfo = {
    id,
    appId,
    accelerator,
    action,
    enabled: true,
    windowId,
  };

  hotkeys.set(id, info);

  // Map IDs
  idToUuid.set(id, uuid);
  uuidToId.set(uuid, id);

  updateAcceleratorRegistration(accelerator);

  // Persist to config
  if (persist) {
    addHotkeyConfig({
      id: uuid,
      appId,
      accelerator,
      defaultAccelerator: accelerator,
      action,
      enabled: true,
      description: undefined
    });
  }

  // Notify overlay DLL about the new hotkey
  registerOverlayHotkey(appId, modifiers, keyCode, action);

  console.log(`[Hotkeys] Registered hotkey ${id}: ${accelerator} -> ${action} (app: ${appId})`);
  return id;
}

/**
 * Internal registration by accelerator string for conflict resolution
 */
function registerHotkeyByAcceleratorForConflict(
  accelerator: string,
  action: string,
  appId: string,
  windowId?: number,
  persist: boolean = true
): number {
  // Dedup: if this app already has a hotkey for this action, reuse it.
  // Do NOT update the accelerator — the persisted value is the user's choice.
  // Apps always send their default accelerator on re-register, which would
  // overwrite the user's custom binding.
  const existingId = findExistingHotkey(appId, action);
  if (existingId !== undefined) {
    const existing = hotkeys.get(existingId)!;
    if (windowId !== undefined) {
      existing.windowId = windowId;
    }
    console.log(`[Hotkeys] Dedup: reusing hotkey ${existingId} for ${action} (app: ${appId}, keeping accelerator: ${existing.accelerator})`);
    return existingId;
  }

  const id = nextId++;

  // Generate UUID for persistence
  const uuid = randomUUID();

  const info: HotkeyInfo = {
    id,
    appId,
    accelerator,
    action,
    enabled: true,
    windowId,
  };

  hotkeys.set(id, info);

  // Map IDs
  idToUuid.set(id, uuid);
  uuidToId.set(uuid, id);

  updateAcceleratorRegistration(accelerator);

  // Persist to config
  if (persist) {
    addHotkeyConfig({
      id: uuid,
      appId,
      accelerator,
      defaultAccelerator: accelerator,
      action,
      enabled: true,
      description: undefined
    });
  }

  console.log(`[Hotkeys] Registered hotkey ${id}: ${accelerator} -> ${action} (app: ${appId})`);
  return id;
}

/**
 * Register a hotkey with automatic conflict detection and alternative suggestion
 * This is the smart registration that handles conflicts gracefully
 */
export function registerHotkeyWithConflictCheck(
  modifiers: number,
  keyCode: number,
  action: string,
  appId: string,
  windowId?: number,
  autoAcceptAlternative: boolean = false
): ConflictResolutionResult {
  const requestedAccelerator = buildAccelerator(modifiers, keyCode);

  // Check for conflicts (excluding this app's own hotkeys)
  const conflict = checkConflict(requestedAccelerator);
  const hasConflictWithOtherApp = conflict.hasConflict &&
    conflict.conflictingHotkeys.some(hk => hk.appId !== appId);

  if (!hasConflictWithOtherApp) {
    // No conflict - register normally
    const id = registerHotkeyInternal(modifiers, keyCode, action, appId, windowId, true);
    return {
      success: id > 0,
      hotkeyId: id,
      hadConflict: false,
      usedAlternative: false,
      originalAccelerator: requestedAccelerator,
      finalAccelerator: requestedAccelerator
    };
  }

  // There's a conflict - find alternative
  const conflictingAppId = conflict.conflictingHotkeys.find(hk => hk.appId !== appId)?.appId || 'Unknown App';
  const alternative = findAlternativeAccelerator(requestedAccelerator, appId);

  if (autoAcceptAlternative && alternative.available && alternative.alternative) {
    // Auto-accept the alternative
    const id = registerHotkeyByAcceleratorForConflict(alternative.alternative, action, appId, windowId, true);
    return {
      success: id > 0,
      hotkeyId: id,
      hadConflict: true,
      conflictingApp: conflictingAppId,
      usedAlternative: true,
      originalAccelerator: requestedAccelerator,
      finalAccelerator: alternative.alternative,
      alternativeSuggestion: {
        accelerator: alternative.alternative,
        modifiers: alternative.alternativeModifiers || ''
      }
    };
  }

  // Return conflict info without registering - let the caller handle UI
  return {
    success: false,
    hotkeyId: -1,
    hadConflict: true,
    conflictingApp: conflictingAppId,
    usedAlternative: false,
    originalAccelerator: requestedAccelerator,
    finalAccelerator: requestedAccelerator,
    alternativeSuggestion: alternative.available ? {
      accelerator: alternative.alternative!,
      modifiers: alternative.alternativeModifiers || ''
    } : null
  };
}

// ============================================
// Tooltip Data Formatting
// ============================================

/**
 * Format accelerator for human-readable display
 */
function formatAcceleratorForDisplay(accelerator: string): string {
  return accelerator
    .replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')
    .replace('CmdOrCtrl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')
    .replace('Super', process.platform === 'darwin' ? 'Cmd' : 'Win');
}

/**
 * Get formatted list of hotkeys for UI display
 */
export function getFormattedList(appId?: string): FormattedHotkey[] {
  const result: FormattedHotkey[] = [];

  for (const [id, hk] of hotkeys) {
    if (appId && hk.appId !== appId) continue;

    const uuid = idToUuid.get(id);
    const config = uuid ? getHotkeyConfig(uuid) : undefined;

    result.push({
      id: uuid || String(id),
      displayAccelerator: formatAcceleratorForDisplay(hk.accelerator),
      action: hk.action,
      appName: hk.appId,
      enabled: hk.enabled,
      isDefault: config ? (hk.accelerator === config.defaultAccelerator) : true,
      description: config?.description
    });
  }

  return result;
}
