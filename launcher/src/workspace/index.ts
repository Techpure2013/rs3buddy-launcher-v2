/**
 * Workspace Module - Overlay Frame Approach
 * Creates overlay windows that surround the RS client without embedding
 * This avoids DirectX issues by keeping RS window completely native
 */

import type { BrowserWindow as BrowserWindowType } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { getBrowserWindow, getIpcMain } from '../electron';
import { getInstalledApps, getConfig } from '../config';
import { getCachedGamePath } from '../download';
import type { GameWindowInfo } from '../types';

// Stub functions for removed toolbar tracker
function startTracking(): void {}
function stopTracking(): void {}
function getCachedWindowInfo(): GameWindowInfo | null { return null; }
function setGamePid(_pid: number): void {}

// Constants
const TOOLBAR_HEIGHT = 36;
const BORDER_WIDTH = 4;

// State
let toolbarWindow: BrowserWindowType | null = null;
let leftBorder: BrowserWindowType | null = null;
let rightBorder: BrowserWindowType | null = null;
let bottomBorder: BrowserWindowType | null = null;
let rsProcess: ChildProcess | null = null;
let isActive = false;
let lastWindowInfo: GameWindowInfo | null = null;

/**
 * Get the root path for loading files
 */
function getRootPath(): string {
  return path.join(__dirname, '..', '..');
}

/**
 * Create the workspace overlay (toolbar + optional borders)
 */
export function createWorkspace(): BrowserWindowType {
  const BrowserWindow = getBrowserWindow();

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.focus();
    return toolbarWindow;
  }

  const rootPath = getRootPath();
  const preloadPath = path.join(rootPath, 'workspacePreload.js');
  const htmlPath = path.join(rootPath, 'workspace.html');

  console.log('[Workspace] Creating overlay frame');
  console.log('[Workspace]   Preload:', preloadPath);
  console.log('[Workspace]   HTML:', htmlPath);

  // Create the main toolbar window (sits above RS)
  toolbarWindow = new BrowserWindow({
    width: 800,
    height: TOOLBAR_HEIGHT,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  toolbarWindow.loadFile(htmlPath);

  // Create border windows for visual frame effect
  const borderOptions = {
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: false,
    hasShadow: false
  };

  // Left border
  leftBorder = new BrowserWindow({
    ...borderOptions,
    width: BORDER_WIDTH,
    height: 600
  });
  leftBorder.loadURL(`data:text/html,<html><body style="margin:0;background:rgba(0,150,255,0.5);"></body></html>`);

  // Right border
  rightBorder = new BrowserWindow({
    ...borderOptions,
    width: BORDER_WIDTH,
    height: 600
  });
  rightBorder.loadURL(`data:text/html,<html><body style="margin:0;background:rgba(0,150,255,0.5);"></body></html>`);

  // Bottom border
  bottomBorder = new BrowserWindow({
    ...borderOptions,
    width: 800,
    height: BORDER_WIDTH
  });
  bottomBorder.loadURL(`data:text/html,<html><body style="margin:0;background:rgba(0,150,255,0.5);"></body></html>`);

  // Make borders click-through
  leftBorder.setIgnoreMouseEvents(true);
  rightBorder.setIgnoreMouseEvents(true);
  bottomBorder.setIgnoreMouseEvents(true);

  toolbarWindow.on('closed', () => {
    cleanup();
    toolbarWindow = null;
  });

  // Show toolbar immediately so user can see status
  toolbarWindow.once('ready-to-show', () => {
    console.log('[Workspace] Toolbar ready, showing...');
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.show();
    }
  });

  isActive = true;
  return toolbarWindow;
}

/**
 * Position the overlay frame around the RS window
 */
function positionOverlay(windowInfo: GameWindowInfo): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return;

  const { x, y, width, height } = windowInfo;

  // Position toolbar above the RS window
  toolbarWindow.setBounds({
    x: x,
    y: y - TOOLBAR_HEIGHT,
    width: width,
    height: TOOLBAR_HEIGHT
  });

  // Position borders around RS window
  if (leftBorder && !leftBorder.isDestroyed()) {
    leftBorder.setBounds({
      x: x - BORDER_WIDTH,
      y: y - TOOLBAR_HEIGHT,
      width: BORDER_WIDTH,
      height: height + TOOLBAR_HEIGHT + BORDER_WIDTH
    });
  }

  if (rightBorder && !rightBorder.isDestroyed()) {
    rightBorder.setBounds({
      x: x + width,
      y: y - TOOLBAR_HEIGHT,
      width: BORDER_WIDTH,
      height: height + TOOLBAR_HEIGHT + BORDER_WIDTH
    });
  }

  if (bottomBorder && !bottomBorder.isDestroyed()) {
    bottomBorder.setBounds({
      x: x - BORDER_WIDTH,
      y: y + height,
      width: width + BORDER_WIDTH * 2,
      height: BORDER_WIDTH
    });
  }
}

/**
 * Show the overlay frame
 */
function showOverlay(): void {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.showInactive();
  }
  if (leftBorder && !leftBorder.isDestroyed()) {
    leftBorder.showInactive();
  }
  if (rightBorder && !rightBorder.isDestroyed()) {
    rightBorder.showInactive();
  }
  if (bottomBorder && !bottomBorder.isDestroyed()) {
    bottomBorder.showInactive();
  }
}

/**
 * Hide the overlay frame
 */
function hideOverlay(): void {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
  }
  if (leftBorder && !leftBorder.isDestroyed()) {
    leftBorder.hide();
  }
  if (rightBorder && !rightBorder.isDestroyed()) {
    rightBorder.hide();
  }
  if (bottomBorder && !bottomBorder.isDestroyed()) {
    bottomBorder.hide();
  }
}

/**
 * Handle window tracking updates
 */
function onWindowUpdate(windowInfo: GameWindowInfo | null): void {
  if (!isActive) {
    console.log('[Workspace] onWindowUpdate called but not active');
    return;
  }

  console.log('[Workspace] onWindowUpdate:', windowInfo ? `Found at ${windowInfo.x},${windowInfo.y} ${windowInfo.width}x${windowInfo.height}` : 'null');

  if (windowInfo) {
    // Check if position/size changed
    const changed = !lastWindowInfo ||
      lastWindowInfo.x !== windowInfo.x ||
      lastWindowInfo.y !== windowInfo.y ||
      lastWindowInfo.width !== windowInfo.width ||
      lastWindowInfo.height !== windowInfo.height;

    if (changed) {
      console.log('[Workspace] Position changed, updating overlay');
      positionOverlay(windowInfo);
      lastWindowInfo = { ...windowInfo };
    }

    // Show borders if RS found
    if (leftBorder && !leftBorder.isVisible()) {
      console.log('[Workspace] Showing borders around RS window');
      showOverlay();
      sendToWorkspace('workspace:status', { status: 'connected', message: 'Connected' });
    }
  } else {
    // RS window not found - hide borders but keep toolbar visible
    if (leftBorder && leftBorder.isVisible()) {
      console.log('[Workspace] RS not found, hiding borders');
      // Only hide borders, not toolbar
      if (leftBorder && !leftBorder.isDestroyed()) leftBorder.hide();
      if (rightBorder && !rightBorder.isDestroyed()) rightBorder.hide();
      if (bottomBorder && !bottomBorder.isDestroyed()) bottomBorder.hide();
      sendToWorkspace('workspace:status', { status: 'disconnected', message: 'Game window not found' });
    }
  }
}

/**
 * Launch RuneScape and attach the overlay
 */
export async function launchAndEmbed(): Promise<boolean> {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) {
    console.error('[Workspace] No workspace window');
    return false;
  }

  sendToWorkspace('workspace:status', { status: 'launching', message: 'Launching RuneScape...' });

  try {
    // Get RS client path
    const cachedPath = getCachedGamePath();
    const config = getConfig();
    const rsPath = cachedPath || config.rs2ClientPath;

    if (!rsPath) {
      sendToWorkspace('workspace:status', { status: 'error', message: 'RuneScape client not found' });
      return false;
    }

    console.log('[Workspace] Launching RS:', rsPath);

    rsProcess = spawn(rsPath, [], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(rsPath)
    });

    rsProcess.unref();

    rsProcess.on('error', (err) => {
      console.error('[Workspace] RS process error:', err);
      sendToWorkspace('workspace:status', { status: 'error', message: 'Failed to launch' });
    });

    // Start tracking the RS window
    sendToWorkspace('workspace:status', { status: 'loading', message: 'Waiting for game...' });

    // Wait a bit for RS to start, then begin tracking
    setTimeout(() => {
      startTracking(); // Tracking disabled - was: startTracking(onWindowUpdate, 100)
    }, 2000);

    return true;
  } catch (e) {
    console.error('[Workspace] Launch error:', e);
    sendToWorkspace('workspace:status', { status: 'error', message: 'Launch failed' });
    return false;
  }
}

/**
 * Send message to workspace renderer
 */
function sendToWorkspace(channel: string, data: unknown): void {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send(channel, data);
  }
}

/**
 * Initialize workspace IPC handlers
 */
export function initWorkspaceIpc(mainWindowRef: () => BrowserWindowType | null): void {
  const ipcMain = getIpcMain();

  ipcMain.on('workspace:minimize', () => {
    // Minimize RS window instead? Or just hide overlay
    hideOverlay();
  });

  ipcMain.on('workspace:maximize', () => {
    // Can't maximize RS from here, but could toggle border visibility
  });

  ipcMain.on('workspace:close', () => {
    cleanup();
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.close();
    }
  });

  ipcMain.on('workspace:launch', async () => {
    await launchAndEmbed();
  });

  ipcMain.on('workspace:retry', async () => {
    await launchAndEmbed();
  });

  ipcMain.handle('workspace:get-apps', () => {
    return getInstalledApps();
  });

  ipcMain.on('workspace:open-app-picker', () => {
    const mainWindow = mainWindowRef();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('show-add-app-modal');
    }
  });

  ipcMain.on('workspace:launch-app', (_event, data: { appUrl: string }) => {
    if (data?.appUrl) {
      const { createAppWindow } = require('../windows');
      const apps = getInstalledApps();
      const app = apps.find(a => a.appUrl === data.appUrl);
      if (app) {
        createAppWindow(app);
      }
    }
  });
}

/**
 * Cleanup resources
 */
function cleanup(): void {
  isActive = false;
  stopTracking();

  // Close border windows
  if (leftBorder && !leftBorder.isDestroyed()) {
    leftBorder.close();
  }
  if (rightBorder && !rightBorder.isDestroyed()) {
    rightBorder.close();
  }
  if (bottomBorder && !bottomBorder.isDestroyed()) {
    bottomBorder.close();
  }

  leftBorder = null;
  rightBorder = null;
  bottomBorder = null;
  rsProcess = null;
  lastWindowInfo = null;
}

/**
 * Get workspace window reference
 */
export function getWorkspaceWindow(): BrowserWindowType | null {
  return toolbarWindow;
}

/**
 * Check if workspace is active
 */
export function isWorkspaceActive(): boolean {
  return isActive && toolbarWindow !== null && !toolbarWindow.isDestroyed();
}
