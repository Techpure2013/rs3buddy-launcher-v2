/**
 * Centralized Electron imports
 * This module provides lazy access to Electron APIs to avoid initialization issues
 */

import type {
  App,
  BrowserWindow as BrowserWindowType,
  IpcMain,
  Session,
  Net,
  Screen,
  NativeImage
} from 'electron';

// Cache for electron module
let electronModule: typeof import('electron') | null = null;

// Get the electron module (lazy load)
function getElectron(): typeof import('electron') {
  if (!electronModule) {
    electronModule = require('electron');
  }
  return electronModule!;
}

// Export getters for each electron API
export function getApp(): App {
  return getElectron().app;
}

export function getBrowserWindow(): typeof BrowserWindowType {
  return getElectron().BrowserWindow;
}

export function getIpcMain(): IpcMain {
  return getElectron().ipcMain;
}

export function getSession(): Session {
  return getElectron().session.defaultSession;
}

export function getNet(): Net {
  return getElectron().net;
}

export function getScreen(): Screen {
  return getElectron().screen;
}

export function getNativeImage() {
  return getElectron().nativeImage;
}

export function getSafeStorage() {
  return getElectron().safeStorage;
}

// Re-export types for convenience
export type { BrowserWindowType as BrowserWindow };
