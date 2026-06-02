/**
 * Windows Module
 * Manages all BrowserWindows - main window and app windows
 * Native OpenGL overlay is handled by the overlay-lib, not Electron
 */

import type { BrowserWindow as BrowserWindowType, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getBrowserWindow, getIpcMain, getScreen } from './electron';
import { getInstalledApps, getToolbarSettings, updateToolbarSettings, getToolbarSettingsForProfile, updateToolbarProfile } from './config';
import { waitForGlReady, getInjectionState, getInjectionStateForPid, setInjectionState, loadNativeAddon } from './inject';
import {
  onAppWindowOpened,
  onAppWindowClosed,
  setGlobalEnabled as setHotkeysGlobalEnabled,
  isGlobalEnabled as isHotkeysGlobalEnabled,
  getFormattedList as getFormattedHotkeys,
  updateHotkeyAccelerator,
  handleOverlayHotkeyEvent,
} from './hotkeys';
import {
  connectToOverlay,
  disconnectOverlay,
  silentDisconnectOverlay,
  disconnectOverlayClient,
  shutdownAllOverlays,
  isOverlayConnected,
  setOverlayConfig,
  setOverlayTheme,
  setOverlayVisible,
  setOverlayPosition,
  addOverlayAppButton,
  clearOverlayAppButtons,
  setOverlayClickCallback,
  setOverlayHotkeyCallback,
  setOverlayConfigChangedCallback,
  setOverlayLayout,
  updateOverlayAppsMenu,
  updateOverlaySettingsMenu,
  sendOverlayAppIcon,
  clearOverlayAppIcons,
  setOverlayAutoHide,
  setOverlayAutoHideExpandMode,
  setOverlayHotkeysEnabled,
  setOverlayLocked,
  setOverlayScale,
  waitForContextReady,
  setOverlayContextReadyCallback,
  ToolbarLayout,
  AutoHideExpandMode,
} from './overlay-ipc';
import type { InstalledApp } from './types';
import type { MenuItem } from './overlay-ipc';
import { getNativeImage } from './electron';
import { cleanupWindowIpc } from './addon/ipc-handlers';

/** Runtime mapping: game PID -> active toolbar profile ID */
const pidProfileMap: Map<number, string> = new Map();

/** Get the active profile ID for a game client */
export function getProfileForPid(pid: number): string | null {
  return pidProfileMap.get(pid) || null;
}

/** Set the profile for a game client PID */
export function setProfileForPid(pid: number, profileId: string): void {
  pidProfileMap.set(pid, profileId);
}

/** Clear profile tracking for a PID */
function clearProfileForPid(pid: number): void {
  pidProfileMap.delete(pid);
}

/** Get the effective overlay scale.
 * The overlay renders in the RS client's physical GL pixel space, so DPI scaling
 * should NOT be applied - the user's scale preference is the actual scale.
 */
function getEffectiveScale(userScale: number, _pid?: number): number {
  return userScale;
}

// Re-export workspace functionality
export {
  createWorkspace,
  getWorkspaceWindow,
  isWorkspaceActive,
  initWorkspaceIpc,
  launchAndEmbed
} from './workspace';

// Theme name to index mapping (Light removed, new themes added)
// 0=Dark, 1=RuneScape, 2=Transparent, 3=TheGwafa, 4=TheNadayanayme
const THEME_MAP: Record<string, number> = {
  'dark': 0,
  'runescape': 1,
  'transparent': 2,
  'thegwafa': 3,
  'thenadayanayme': 4
};

export type OverlayTheme = 'dark' | 'runescape' | 'transparent' | 'thegwafa' | 'thenadayanayme';

// Main window reference
let mainWindow: BrowserWindowType | null = null;
let currentGamePid: number = 0;

// Get root directory path
function getRootPath(): string {
  return path.join(__dirname, '..');
}

// Create main window
export function createMainWindow(): BrowserWindowType {
  const BrowserWindow = getBrowserWindow();
  const { nativeImage } = require('electron');
  const rootPath = getRootPath();

  // Load icon - try favicon.ico first (proper multi-size), then PNG fallbacks
  const iconPaths = [
    path.join(rootPath, 'assets', 'favicon.ico'),
    path.join(__dirname, '..', 'assets', 'favicon.ico'),
    path.join(__dirname, '..', '..', 'assets', 'favicon.ico'),
    path.join(rootPath, 'assets', 'RS3QuestBuddyLauncher.png'),
    path.join(__dirname, '..', 'assets', 'RS3QuestBuddyLauncher.png'),
    path.join(rootPath, 'assets', 'icon.png'),
    path.join(__dirname, '..', 'assets', 'icon.png'),
  ];

  let icon = null;
  for (const iconPath of iconPaths) {
    try {
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) {
        icon = img;
        console.log('[Windows] Using icon from:', iconPath);
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  if (!icon) {
    console.log('[Windows] Warning: No icon found, using default');
  }

  // Build window options
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 500,
    height: 800,
    frame: false,
    resizable: true,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      preload: path.join(rootPath, 'launcherPreload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: icon || path.join(rootPath, 'assets', 'icon.png'),
    title: 'RS3 Launcher Buddy'
  };

  // On Linux, set WM_CLASS for proper taskbar/dock integration
  // This must match the StartupWMClass in the .desktop file
  if (process.platform === 'linux') {
    // Set the app ID which affects WM_CLASS
    const { app } = require('electron');
    // Try to set the WM class through app before window creation
    try {
      // The --class=rs3-launcher-buddy in the start script should handle this
      // But we also need to ensure the app name is set
      app.name = 'rs3-launcher-buddy';
    } catch (e) {
      console.log('[Windows] Could not set app name:', e);
    }
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile(path.join(rootPath, 'index.html'));

  // On Linux, explicitly set the icon after window creation for better compatibility
  if (process.platform === 'linux' && icon) {
    mainWindow.setIcon(icon);
  }

  return mainWindow;
}

// Get main window reference
export function getMainWindow(): BrowserWindowType | null {
  return mainWindow;
}

// Track open app windows for IPC
const appWindows = new Map<number, { window: BrowserWindowType; title: string; gamePid: number }>();

/** Apps that have been migrated to the isolated preload (contextIsolation: true). */
// Create app window (tied to a specific game client)
export function createAppWindow(appConfig: InstalledApp, gamePid?: number): BrowserWindowType {
  const BrowserWindow = getBrowserWindow();
  const { nativeImage } = require('electron');
  const rootPath = getRootPath();

  // Use the game PID from the parameter, or fall back to the current game PID
  const associatedGamePid = gamePid ?? currentGamePid;

  // Load icon for app windows
  const iconPaths = [
    path.join(rootPath, 'assets', 'favicon.ico'),
    path.join(__dirname, '..', 'assets', 'favicon.ico'),
    path.join(rootPath, 'assets', 'RS3QuestBuddyLauncher.png'),
    path.join(__dirname, '..', 'assets', 'RS3QuestBuddyLauncher.png'),
    path.join(rootPath, 'assets', 'icon.png'),
    path.join(__dirname, '..', 'assets', 'icon.png'),
  ];

  let icon = null;
  for (const iconPath of iconPaths) {
    try {
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) {
        icon = img;
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  const appWindow = new BrowserWindow({
    width: appConfig.defaultWidth || 400,
    height: appConfig.defaultHeight || 500,
    minWidth: appConfig.minWidth || 150,
    minHeight: appConfig.minHeight || 80,
    title: appConfig.displayName || appConfig.appName || 'RS3 Buddy App',
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    icon: icon || undefined,
    useContentSize: true,
    webPreferences: {
      preload: path.join(rootPath, 'app-window', 'preload-isolated.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: true,
    }
  });

  // On Linux, explicitly set icon after creation
  if (process.platform === 'linux' && icon) {
    appWindow.setIcon(icon);
  }

  const windowId = appWindow.id;
  appWindows.set(windowId, {
    window: appWindow,
    title: appConfig.displayName || appConfig.appName || 'RS3 Buddy App',
    gamePid: associatedGamePid
  });

  // Add custom headers to mimic Alt1/browser requests
  // This fixes 403 errors from servers that check User-Agent or Referer
  appWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders };

      // Set User-Agent to look like Alt1
      headers['User-Agent'] = 'Alt1/1.0 (Alt1GL Launcher)';

      // Set Referer for runeapps.org requests
      if (details.url.includes('runeapps.org')) {
        headers['Referer'] = 'https://runeapps.org/';
        headers['Origin'] = 'https://runeapps.org';
      }

      // For all HTTPS requests from alt1-builtin:// origin, set Origin to match
      // the target URL's origin. This prevents CORS preflight failures when
      // servers don't recognize alt1-builtin:// as a valid origin.
      if (details.url.startsWith('https://')) {
        try {
          const targetOrigin = new URL(details.url).origin;
          headers['Origin'] = targetOrigin;
        } catch {}
      }

      callback({ requestHeaders: headers });
    }
  );

  // Security: Add Content-Security-Policy to restrict resource loading
  appWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      // Add CSP
      responseHeaders['Content-Security-Policy'] = [
            "default-src 'self' alt1-builtin: https: http://localhost http://127.0.0.1; " +
            "script-src 'self' alt1-builtin: https: 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' alt1-builtin: https: 'unsafe-inline'; " +
            "img-src 'self' alt1-builtin: https: http: data: blob:; " +
            "connect-src 'self' alt1-builtin: https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; " +
            "font-src 'self' alt1-builtin: https: data:; " +
            "object-src 'none'; " +
            "base-uri 'self'"
      ];

      // Inject/override CORS headers for cross-origin API requests from alt1-builtin:// origin.
      // The browser compares the response ACAO header against the page's real origin
      // (alt1-builtin://app-name), so we must always set ACAO to * regardless of what
      // the server sends back. Servers that echo the Origin header would return
      // ACAO: https://example.com which doesn't match alt1-builtin://.
      if (details.url.startsWith('https://') && details.resourceType !== 'mainFrame') {
        // Remove any existing ACAO header (case-insensitive) before setting ours
        for (const key of Object.keys(responseHeaders)) {
          if (key.toLowerCase() === 'access-control-allow-origin') {
            delete responseHeaders[key];
          }
        }
        responseHeaders['Access-Control-Allow-Origin'] = ['*'];
        responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
        responseHeaders['Access-Control-Allow-Headers'] = ['Content-Type, Authorization'];

        // CORS preflight (OPTIONS): server may return non-2xx (404/405/500) which
        // causes the browser to reject the preflight even with correct CORS headers.
        // Override to 200 so the actual request can proceed.
        if (details.method === 'OPTIONS' && details.statusCode && details.statusCode >= 300) {
          callback({ responseHeaders, statusLine: 'HTTP/1.1 200 OK' });
          return;
        }
      }

      callback({ responseHeaders });
    }
  );

  // Enable hotkeys for this app
  onAppWindowOpened(appConfig.configUrl || appConfig.appUrl);

  // Clean up IPC handles when webContents is destroyed
  appWindow.webContents.on('destroyed', () => {
    cleanupWindowIpc(appWindow.webContents.id);
  });

  // Clean up when closed
  appWindow.on('closed', () => {
    // Disable hotkeys for this app (keep them persisted for when app reopens)
    onAppWindowClosed(appConfig.configUrl || appConfig.appUrl);
    appWindows.delete(windowId);
  });

  // Security: Validate app URL scheme before loading
  const appUrl = appConfig.appUrl;
  const isAllowedScheme =
    appUrl.startsWith('alt1-builtin://') ||
    appUrl.startsWith('https://') ||
    appUrl.startsWith('http://localhost') ||
    appUrl.startsWith('http://127.0.0.1');

  if (!isAllowedScheme) {
    console.error(`[Windows] SECURITY: Blocked app with disallowed URL scheme: ${appUrl}`);
    appWindow.close();
    return appWindow;
  }

  // Security: Restrict navigation to the app's own origin and allowed schemes
  appWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowed =
      navigationUrl.startsWith('alt1-builtin://') ||
      navigationUrl.startsWith(appUrl.split('/').slice(0, 3).join('/')) || // same origin
      navigationUrl.startsWith('http://localhost') ||
      navigationUrl.startsWith('http://127.0.0.1');
    if (!allowed) {
      console.warn(`[Windows] SECURITY: Blocked navigation to: ${navigationUrl}`);
      event.preventDefault();
    }
  });

  // Handle window.open calls from app windows
  appWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    const allowed =
      url.startsWith('alt1-builtin://') ||
      url.startsWith('https://') ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url === 'about:blank' ||
      url === '' ||
      url.startsWith('blob:') ||
      url.endsWith('emptypage.html');

    if (!allowed) {
      console.warn(`[Windows] SECURITY: Blocked window.open to: ${url}`);
      return { action: 'deny' };
    }

    // Open https:// links in the system browser (Discord, Wiki, BuyMeACoffee, etc.)
    if (url.startsWith('https://') || url.startsWith('http://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }

    // Allow popup windows for same-origin content (image popouts, etc.)
    // Parse width/height from features string if present
    let width = 400;
    let height = 400;
    if (features) {
      const wMatch = features.match(/width=(\d+)/);
      const hMatch = features.match(/height=(\d+)/);
      if (wMatch) width = parseInt(wMatch[1], 10);
      if (hMatch) height = parseInt(hMatch[1], 10);
    }

    console.log(`[Windows] Allowing popup window: ${url} (${width}x${height})`);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width,
        height,
        frame: true,
        resizable: true,
        alwaysOnTop: false,
        webPreferences: {
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
        },
      },
    };
  });

  appWindow.loadURL(appUrl);

  // Only open DevTools in dev mode
  if (process.defaultApp) {
    appWindow.webContents.openDevTools({ mode: 'detach' });
  }

  console.log(`[Windows] App window created for ${appConfig.appName}, associated with game PID: ${associatedGamePid}`);
  return appWindow;
}

// Get app window info by webContents id (for IPC)
function getAppWindowByWebContents(webContentsId: number): { window: BrowserWindowType; title: string; gamePid: number } | undefined {
  for (const [, info] of appWindows) {
    if (info.window.webContents.id === webContentsId) {
      return info;
    }
  }
  return undefined;
}

// Get the game PID associated with a webContents (for IPC routing)
export function getGamePidForWebContents(webContentsId: number): number {
  const info = getAppWindowByWebContents(webContentsId);
  return info?.gamePid || 0;
}

/**
 * Minimize all app windows (called when RS client loses focus/minimizes)
 */
export function minimizeAllAppWindows(): void {
  for (const [, info] of appWindows) {
    if (info.window && !info.window.isDestroyed() && !info.window.isMinimized()) {
      info.window.minimize();
    }
  }
}

/**
 * Restore all app windows (called when RS client gains focus)
 */
export function restoreAllAppWindows(): void {
  for (const [, info] of appWindows) {
    if (info.window && !info.window.isDestroyed() && info.window.isMinimized()) {
      info.window.restore();
    }
  }
}

// Send event to main window
export function sendToMainWindow(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// ============================================
// Native OpenGL Overlay Functions
// ============================================

// Icon size for overlay menu (square)
const ICON_SIZE = 24;

/**
 * Convert image buffer to RGBA pixels for overlay
 */
function imageBufferToRgba(nativeImage: typeof import('electron').nativeImage, buffer: Buffer): Uint8Array | null {
  try {
    const image = nativeImage.createFromBuffer(buffer);
    if (image.isEmpty()) {
      return null;
    }

    // Resize to icon size
    const resized = image.resize({ width: ICON_SIZE, height: ICON_SIZE, quality: 'best' });
    const bitmap = resized.toBitmap();

    // Convert BGRA to RGBA
    const rgba = new Uint8Array(bitmap.length);
    for (let i = 0; i < bitmap.length; i += 4) {
      rgba[i] = bitmap[i + 2];     // R (was B)
      rgba[i + 1] = bitmap[i + 1]; // G
      rgba[i + 2] = bitmap[i];     // B (was R)
      rgba[i + 3] = bitmap[i + 3]; // A
    }

    return rgba;
  } catch {
    return null;
  }
}

/**
 * Fetch an app icon and convert it to RGBA pixels
 * Handles http://, https://, file://, and alt1-builtin:// URLs
 */
async function fetchAppIconPixels(iconUrl: string): Promise<Uint8Array | null> {
  try {
    const nativeImage = getNativeImage();
    const fs = await import('fs');
    const pathModule = await import('path');

    // Handle file:// URLs
    if (iconUrl.startsWith('file://')) {
      try {
        let filePath = iconUrl.replace('file://', '');
        // Handle Windows file:///C:/... format
        if (filePath.startsWith('/') && filePath[2] === ':') {
          filePath = filePath.substring(1);
        }
        // Normalize path separators
        filePath = filePath.replace(/\//g, pathModule.sep);

        if (!fs.existsSync(filePath)) {
          console.log(`[Overlay] Icon file not found: ${filePath}`);
          return null;
        }
        const buffer = fs.readFileSync(filePath);
        return imageBufferToRgba(nativeImage, buffer);
      } catch (e) {
        console.log(`[Overlay] Error loading file:// icon: ${e}`);
        return null;
      }
    }

    // Handle alt1-builtin:// URLs - resolve to local file
    if (iconUrl.startsWith('alt1-builtin://')) {
      try {
        const url = new URL(iconUrl);
        const appName = url.hostname;
        const iconPath = url.pathname;

        // Determine base path (same logic as main.ts protocol handler)
        const { app } = await import('electron');
        let builtinAppsPath: string;
        if (app.isPackaged) {
          builtinAppsPath = pathModule.join(process.resourcesPath, 'builtin-apps', appName);
        } else {
          const launcherDir = pathModule.join(__dirname, '..');
          const packagesPath = pathModule.join(launcherDir, '..', 'packages', appName, 'dist');
          const builtinPath = pathModule.join(launcherDir, 'builtin-apps', appName);
          builtinAppsPath = fs.existsSync(packagesPath) ? packagesPath : builtinPath;
        }

        const fullPath = pathModule.join(builtinAppsPath, iconPath);
        if (!fs.existsSync(fullPath)) {
          console.log(`[Overlay] Built-in icon not found: ${fullPath}`);
          return null;
        }
        const buffer = fs.readFileSync(fullPath);
        return imageBufferToRgba(nativeImage, buffer);
      } catch (e) {
        console.log(`[Overlay] Error loading alt1-builtin:// icon: ${e}`);
        return null;
      }
    }

    // Handle http:// and https:// URLs
    if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
      const https = await import('https');
      const http = await import('http');

      return new Promise((resolve) => {
        const protocol = iconUrl.startsWith('https') ? https : http;
        const timeout = setTimeout(() => {
          console.log(`[Overlay] Icon fetch timeout: ${iconUrl}`);
          resolve(null);
        }, 5000);

        const req = protocol.get(iconUrl, (response) => {
          if (response.statusCode !== 200) {
            clearTimeout(timeout);
            console.log(`[Overlay] Icon fetch failed (${response.statusCode}): ${iconUrl}`);
            resolve(null);
            return;
          }

          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => {
            clearTimeout(timeout);
            const buffer = Buffer.concat(chunks);
            resolve(imageBufferToRgba(nativeImage, buffer));
          });
          response.on('error', () => {
            clearTimeout(timeout);
            resolve(null);
          });
        });

        req.on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });
    }

    // Unknown protocol
    console.log(`[Overlay] Unknown icon URL protocol: ${iconUrl}`);
    return null;
  } catch (e) {
    console.log(`[Overlay] Error fetching icon: ${e}`);
    return null;
  }
}

/**
 * Send app icons to overlay
 */
async function sendAppIconsToOverlay(apps: InstalledApp[]): Promise<void> {
  // Clear existing icons first
  clearOverlayAppIcons();

  // Send each app's icon
  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    if (!app.iconUrl) continue;

    const menuItemId = 200 + i;
    const pixels = await fetchAppIconPixels(app.iconUrl);

    if (pixels) {
      const sent = sendOverlayAppIcon(menuItemId, ICON_SIZE, ICON_SIZE, pixels);
      console.log(`[Overlay] App icon ${app.appName}: ${sent ? 'sent' : 'failed'}`);
    }
  }
}

/**
 * Build apps menu items from installed apps
 * Uses displayName if set, otherwise falls back to appName
 */
function buildAppsMenuItems(apps: InstalledApp[]): MenuItem[] {
  const menuItems: MenuItem[] = [];
  if (apps.length > 0) {
    for (let i = 0; i < apps.length; i++) {
      menuItems.push({
        id: 200 + i,
        label: apps[i].displayName || apps[i].appName,
        userData: apps[i].appUrl,
        enabled: true
      });
    }
    menuItems.push({ id: 0, label: '', separator: true });
  } else {
    menuItems.push({ id: 299, label: 'No apps installed', enabled: false });
    menuItems.push({ id: 0, label: '', separator: true });
  }
  menuItems.push({ id: 298, label: 'Add App...', userData: 'browse' });
  return menuItems;
}

/**
 * Refresh the overlay apps menu
 * Call this when apps are added or removed
 */
export async function refreshOverlayAppsMenu(): Promise<void> {
  if (!isOverlayConnected()) {
    console.log('[Overlay] Not connected, apps menu will sync on next connect');
    return;
  }

  const apps = getInstalledApps();
  console.log('[Overlay] Refreshing apps menu with', apps.length, 'apps');

  const appsMenuItems: MenuItem[] = buildAppsMenuItems(apps);
  const result = updateOverlayAppsMenu(appsMenuItems);
  console.log('[Overlay] Apps menu refresh result:', result);

  // Also update icons
  if (apps.length > 0) {
    sendAppIconsToOverlay(apps).catch(e => {
      console.log('[Overlay] Error refreshing app icons:', e);
    });
  }
}

/**
 * Configure the native OpenGL overlay/toolbar
 * Called when game starts and GL is ready
 */
export async function configureNativeOverlay(pid: number, theme: OverlayTheme = 'dark'): Promise<void> {
  console.log('[Overlay] ========================================');
  console.log('[Overlay] Configuring native OpenGL overlay for PID:', pid);
  console.log('[Overlay] Timestamp:', new Date().toISOString());

  // First, try to connect directly - if DLL is already injected, pipe should exist
  console.log('[Overlay] Trying direct IPC connection first...');
  let connected = await connectToOverlay(pid);

  if (connected) {
    console.log('[Overlay] Direct connection successful - DLL already active');
  } else {
    console.log('[Overlay] Direct connection failed, waiting for GL to be ready...');
    console.log('[Overlay] Waiting for GL to be ready (up to 10 seconds)...');
    const glReadyStart = Date.now();
    const glReady = await waitForGlReady(10000, 200);
    const glReadyTime = Date.now() - glReadyStart;
    console.log(`[Overlay] GL ready check took ${glReadyTime}ms, result: ${glReady}`);
    if (!glReady) {
      console.log('[Overlay] GL NOT READY after 10 seconds - this may happen if:');
      console.log('[Overlay]   1. The DLL injection failed');
      console.log('[Overlay]   2. The RS client was started before the DLL was injected');
      console.log('[Overlay]   3. The GL context hook is not working');
      console.log('[Overlay] Will still attempt IPC connection...');
    }

    console.log('[Overlay] Connecting to overlay IPC pipe...');

    // Try to connect to the overlay's IPC pipe
    // The overlay DLL creates the pipe in ipc::init() during DLL_PROCESS_ATTACH
    // When injecting into an already-running client, there may be a delay before
    // the pipe is fully created, so we retry multiple times with increasing delays

    const retryDelays = [500, 1000, 2000, 3000, 5000]; // milliseconds

    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));

      console.log(`[Overlay] Connection attempt ${attempt + 1}/${retryDelays.length}...`);
      connected = await connectToOverlay(pid);

      if (connected) {
        console.log(`[Overlay] Connected on attempt ${attempt + 1}`);
        break;
      }

      console.log(`[Overlay] Attempt ${attempt + 1} failed, ${attempt < retryDelays.length - 1 ? `retrying in ${retryDelays[attempt + 1]}ms...` : 'giving up'}`);
    }
  }

  if (!connected) {
    console.log('[Overlay] Failed to connect to overlay IPC after all retries');
    console.log('[Overlay] Possible causes:');
    console.log('[Overlay]   1. The overlay DLL was not injected (only injected.dll)');
    console.log('[Overlay]   2. The overlay DLL failed to initialize');
    console.log('[Overlay]   3. The IPC pipe creation failed');
    console.log('[Overlay] Use DebugView to see overlay.dll debug output');
    return;
  }

  console.log('[Overlay] Connected to overlay IPC');

  // Wait for ContextReady before sending configuration
  // This ensures the overlay has initialized its GL resources
  console.log('[Overlay] Waiting for ContextReady from overlay...');
  const contextReady = await waitForContextReady(pid, 15000); // 15 second timeout
  if (!contextReady) {
    console.log('[Overlay] WARNING: Did not receive ContextReady within timeout');
    console.log('[Overlay] Proceeding anyway - overlay may not be fully initialized');
  } else {
    console.log('[Overlay] Received ContextReady - overlay is fully initialized');
  }

  // Load profile-specific toolbar settings
  const profileId = getProfileForPid(pid);
  const savedSettings = getToolbarSettingsForProfile(profileId);
  console.log('[Overlay] Loaded toolbar settings for profile:', profileId || 'default', savedSettings);

  // Initialize local state from saved settings
  overlayLocked = savedSettings.locked;
  overlayAutoHide = savedSettings.autoHide;
  overlayAutoHideExpandMode = savedSettings.autoHideExpandMode as AutoHideExpandMode;
  overlayHotkeysEnabled = savedSettings.hotkeysEnabled;
  currentThemeIndex = savedSettings.themeIndex;
  currentLayoutIndex = savedSettings.layoutIndex;
  // Configure overlay with saved settings
  setOverlayConfig({
    posX: savedSettings.posX,
    posY: savedSettings.posY,
    anchor: 0, // TopLeft (anchor is computed dynamically)
    orientation: 0, // Horizontal
    scale: getEffectiveScale(savedSettings.scale, pid),
    opacity: savedSettings.opacity,
    themeIndex: savedSettings.themeIndex,
    locked: savedSettings.locked,
    autoHide: savedSettings.autoHide
  });

  // Apply layout
  setOverlayLayout(savedSettings.layoutIndex as ToolbarLayout);

  // Apply auto-hide expand mode
  setOverlayAutoHideExpandMode(savedSettings.autoHideExpandMode as AutoHideExpandMode);

  // Apply hotkeys enabled state
  setOverlayHotkeysEnabled(savedSettings.hotkeysEnabled);
  setHotkeysGlobalEnabled(savedSettings.hotkeysEnabled);

  // NOTE: Apps are now in the menu only - no toolbar buttons for apps
  // The toolbar only shows a single hamburger menu button
  clearOverlayAppButtons();
  const apps = getInstalledApps();
  console.log('[Overlay] Installed apps:', apps.length, apps.map(a => a.appName));

  // Build and send apps menu
  const appsMenuItems: MenuItem[] = buildAppsMenuItems(apps);
  console.log('[Overlay] Sending apps menu with', appsMenuItems.length, 'items');
  const appsResult = updateOverlayAppsMenu(appsMenuItems);
  console.log('[Overlay] Apps menu send result:', appsResult);

  // Build and send settings menu - structure: Apps, Theme, Layout, Lock Position, Auto-Hide, Hotkeys
  try {
    console.log('[Overlay] *** Building settings menu items...');
    const settingsMenuItems: MenuItem[] = [
      { id: 100, label: 'Apps', userData: 'apps', hasSubmenu: true },    // Apps submenu
      { id: 101, label: 'Theme', userData: 'theme', hasSubmenu: true },
      { id: 102, label: 'Layout', userData: 'layout', hasSubmenu: true },
      { id: 0, label: '', separator: true },
      { id: 103, label: 'Lock Position', userData: 'lock' },
      { id: 104, label: 'Auto-Hide', userData: 'autohide' },  // Toggle, no submenu
      { id: 105, label: 'Open Hotkeys...', userData: 'open_hotkeys' },  // Opens launcher hotkey settings
    ];
    updateOverlaySettingsMenu(settingsMenuItems);
  } catch (e) {
    console.error('[Overlay] *** ERROR sending settings menu:', e);
  }


  // Send app icons (async, don't wait) - after settings menu to avoid interference
  if (apps.length > 0) {
    sendAppIconsToOverlay(apps).catch(e => {
      console.log('[Overlay] Error sending app icons:', e);
    });
  }

  // Explicitly ensure toolbar is visible after all configuration
  console.log('[Overlay] Setting toolbar visible');
  setOverlayVisible(true);

  // Re-send position as the very last thing, AFTER all layout/button/menu changes.
  // Earlier setOverlayConfig sets position first, but subsequent setOverlayLayout,
  // clearOverlayAppButtons, and menu updates trigger rebuildLayout() on the overlay
  // which changes toolbar dimensions. This final setOverlayPosition ensures the
  // saved position sticks after all dimension changes are complete.
  console.log(`[Overlay] Final position set: (${savedSettings.posX}, ${savedSettings.posY})`);
  setOverlayPosition(savedSettings.posX, savedSettings.posY);

  // Set up persistent context ready handler for lobby->game GL context recreation.
  // When the RS client transitions from lobby to game, the GL context is destroyed
  // and recreated. We must re-send the toolbar config to ensure correct position,
  // re-send font texture and app icons (GL resources are invalid on new context).
  setOverlayContextReadyCallback((width, height) => {
    console.log(`[Overlay] GL context recreated (${width}x${height}), re-sending configuration`);
    const profileId = getProfileForPid(pid);
    const currentSettings = getToolbarSettingsForProfile(profileId);
    setOverlayConfig({
      posX: currentSettings.posX,
      posY: currentSettings.posY,
      anchor: 0,
      orientation: 0,
      scale: getEffectiveScale(currentSettings.scale, pid),
      opacity: currentSettings.opacity,
      themeIndex: currentSettings.themeIndex,
      locked: currentSettings.locked,
      autoHide: currentSettings.autoHide
    });
    setOverlayLayout(currentSettings.layoutIndex as ToolbarLayout);
    setOverlayAutoHideExpandMode(currentSettings.autoHideExpandMode as AutoHideExpandMode);
    setOverlayVisible(true);
    setOverlayPosition(currentSettings.posX, currentSettings.posY);

    // Re-send app icons (GL textures are invalid on new context)
    const apps = getInstalledApps();
    if (apps.length > 0) {
      sendAppIconsToOverlay(apps).catch(e => {
        console.log('[Overlay] Error re-sending app icons after context recreation:', e);
      });
    }
  });

  // Set up click handler to launch apps and handle menu items
  setOverlayClickCallback((event) => {
    console.log('[Overlay] Click:', event.buttonId, event.userData);

    // Handle system toolbar buttons
    if (event.buttonId === -1) {
      // Settings button - menu opens on hover, but click could toggle
      console.log('[Overlay] Settings clicked');
      return;
    }
    if (event.buttonId === -2) {
      // Apps button - menu opens on hover
      console.log('[Overlay] Apps clicked');
      return;
    }

    // Handle apps menu items (200-299 range)
    if (event.buttonId >= 200 && event.buttonId < 300) {
      if (event.userData === 'browse') {
        console.log('[Overlay] Add App clicked - opening modal');
        // Show main window and trigger add app modal
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('show-add-app-modal');
        }
        return;
      }
      // Launch app by URL
      const installedApps = getInstalledApps();
      const app = installedApps.find(a => a.appUrl === event.userData);
      if (app) {
        console.log('[Overlay] Launching app:', app.appName);
        createAppWindow(app, event.pid);
      }
      return;
    }

    // Handle settings menu items (100-199 range)
    if (event.buttonId >= 100 && event.buttonId < 200) {
      handleSettingsMenuItem(event.buttonId, event.userData);
      return;
    }


    // Handle submenu items (1000+ range - theme/layout submenus)
    if (event.buttonId >= 1000 && event.buttonId < 1100) {
      handleSettingsMenuItem(event.buttonId, event.userData);
      return;
    }

    // Handle toolbar app buttons (100+ range for legacy buttons)
    if (event.buttonId >= 100) {
      const installedApps = getInstalledApps();
      const app = installedApps.find(a => a.appUrl === event.userData);
      if (app) {
        createAppWindow(app, event.pid);
      }
    }
  });

  // Set up DLL hotkey handler - forwards key presses detected in RS3 process to app windows
  setOverlayHotkeyCallback((event) => {
    handleOverlayHotkeyEvent(event);
  });

  // Listen for config changes from overlay (e.g., when user drags it)
  setOverlayConfigChangedCallback((config) => {
    // Save toolbar position and settings to the correct profile
    const activeProfileId = getProfileForPid(pid);
    const updates = {
      posX: config.posX,
      posY: config.posY,
      themeIndex: config.themeIndex,
      locked: config.locked,
      autoHide: config.autoHide,
      scale: config.scale,
      opacity: config.opacity
    };

    if (activeProfileId && activeProfileId !== 'default') {
      updateToolbarProfile(activeProfileId, updates);
    } else {
      updateToolbarSettings(updates);
    }
  });

  console.log(`[Overlay] Native overlay configured with ${apps.length} apps`);

  // Notify renderer that overlay is ready (for font atlas)
  sendToMainWindow('overlay-ready', {});

}

// Current overlay settings state (for toggling)
let overlayLocked = false;
let overlayAutoHide = false;
let overlayAutoHideExpandMode: AutoHideExpandMode = AutoHideExpandMode.Hover;
let overlayHotkeysEnabled = true;  // Hotkeys enabled by default
let currentThemeIndex = 0;
let currentLayoutIndex = 0; // 0=Compact, 1=Normal, 2=Comfortable

/** Save toolbar settings to the correct profile for the current active game client */
function saveToolbarSettingsUpdate(updates: Partial<import('./types').ToolbarSettings>): void {
  const activeProfileId = getProfileForPid(currentGamePid);
  if (activeProfileId && activeProfileId !== 'default') {
    updateToolbarProfile(activeProfileId, updates);
  } else {
    updateToolbarSettings(updates);
  }
}

/**
 * Handle settings menu item clicks
 */
function handleSettingsMenuItem(id: number, userData: string): void {
  console.log('[Overlay] Settings item:', id, userData);

  // Handle submenu items (theme:N, layout:N)
  if (userData.startsWith('theme:')) {
    const themeIndex = parseInt(userData.split(':')[1], 10);
    // 0=Dark, 1=RuneScape, 2=Transparent, 3=TheGwafa, 4=TheNadayanayme
    if (!isNaN(themeIndex) && themeIndex >= 0 && themeIndex <= 4) {
      currentThemeIndex = themeIndex;
      setOverlayTheme(themeIndex);
      saveToolbarSettingsUpdate({ themeIndex });
      const themeNames = ['Dark', 'RuneScape', 'Transparent', 'The Gwafa', 'The Nadayanayme'];
      console.log('[Overlay] Theme set to:', themeNames[themeIndex]);
    }
    return;
  }

  if (userData.startsWith('layout:')) {
    const layoutIndex = parseInt(userData.split(':')[1], 10);
    // 0=Compact, 1=Normal, 2=Comfortable
    if (!isNaN(layoutIndex) && layoutIndex >= 0 && layoutIndex <= 2) {
      currentLayoutIndex = layoutIndex;
      setOverlayLayout(layoutIndex as ToolbarLayout);
      saveToolbarSettingsUpdate({ layoutIndex });
      const layoutNames = ['Compact', 'Normal', 'Comfortable'];
      console.log('[Overlay] Layout set to:', layoutNames[layoutIndex]);
    }
    return;
  }

  // Handle expand mode (under Layout menu)
  if (userData.startsWith('expand:')) {
    const mode = userData.split(':')[1];
    if (mode === 'hover') {
      overlayAutoHideExpandMode = AutoHideExpandMode.Hover;
      setOverlayAutoHideExpandMode(AutoHideExpandMode.Hover);
      saveToolbarSettingsUpdate({ autoHideExpandMode: AutoHideExpandMode.Hover });
      console.log('[Overlay] Expand mode set to hover');
    } else if (mode === 'click') {
      overlayAutoHideExpandMode = AutoHideExpandMode.Click;
      setOverlayAutoHideExpandMode(AutoHideExpandMode.Click);
      saveToolbarSettingsUpdate({ autoHideExpandMode: AutoHideExpandMode.Click });
      console.log('[Overlay] Expand mode set to click');
    }
    return;
  }

  // Handle autohide toggle (simple on/off)
  if (userData === 'autohide') {
    overlayAutoHide = !overlayAutoHide;
    setOverlayAutoHide(overlayAutoHide);
    saveToolbarSettingsUpdate({ autoHide: overlayAutoHide });
    console.log('[Overlay] Auto-hide toggled:', overlayAutoHide ? 'on' : 'off');
    return;
  }

  // Handle hotkeys toggle (enable/disable all hotkeys)
  if (userData === 'hotkeys') {
    overlayHotkeysEnabled = !overlayHotkeysEnabled;
    setOverlayHotkeysEnabled(overlayHotkeysEnabled);
    setHotkeysGlobalEnabled(overlayHotkeysEnabled);  // Also toggle app hotkeys
    saveToolbarSettingsUpdate({ hotkeysEnabled: overlayHotkeysEnabled });
    console.log('[Overlay] Hotkeys toggled:', overlayHotkeysEnabled ? 'on' : 'off');
    return;
  }

  // Legacy autohide submenu items (kept for backwards compatibility)
  if (userData.startsWith('autohide:')) {
    const mode = userData.split(':')[1];
    switch (mode) {
      case 'off':
        overlayAutoHide = false;
        setOverlayAutoHide(false);
        console.log('[Overlay] Auto-hide disabled');
        break;
      case 'hover':
        overlayAutoHide = true;
        overlayAutoHideExpandMode = AutoHideExpandMode.Hover;
        setOverlayAutoHide(true);
        setOverlayAutoHideExpandMode(AutoHideExpandMode.Hover);
        console.log('[Overlay] Auto-hide enabled with hover-to-expand');
        break;
      case 'click':
        overlayAutoHide = true;
        overlayAutoHideExpandMode = AutoHideExpandMode.Click;
        setOverlayAutoHide(true);
        setOverlayAutoHideExpandMode(AutoHideExpandMode.Click);
        console.log('[Overlay] Auto-hide enabled with click-to-expand');
        break;
    }
    return;
  }

  switch (userData) {
    case 'theme':
      // Clicking on Theme parent now opens submenu, but keep cycling as fallback
      currentThemeIndex = (currentThemeIndex + 1) % 5;  // 5 themes now
      setOverlayTheme(currentThemeIndex);
      saveToolbarSettingsUpdate({ themeIndex: currentThemeIndex });
      const themeNames2 = ['Dark', 'RuneScape', 'Transparent', 'The Gwafa', 'The Nadayanayme'];
      console.log('[Overlay] Theme changed to:', themeNames2[currentThemeIndex]);
      break;

    case 'layout':
      // Clicking on Layout parent now opens submenu, but keep cycling as fallback
      currentLayoutIndex = (currentLayoutIndex + 1) % 2;  // Only 2 layouts now
      setOverlayLayout(currentLayoutIndex as ToolbarLayout);
      saveToolbarSettingsUpdate({ layoutIndex: currentLayoutIndex });
      const layoutNames = ['Compact', 'Comfortable'];
      console.log('[Overlay] Layout changed to:', layoutNames[currentLayoutIndex]);
      break;

    case 'lock':
      overlayLocked = !overlayLocked;
      setOverlayLocked(overlayLocked);
      saveToolbarSettingsUpdate({ locked: overlayLocked });
      console.log('[Overlay] Lock position:', overlayLocked);
      break;

    case 'autohide':
      // Fallback for clicking parent - cycle through modes
      if (!overlayAutoHide) {
        overlayAutoHide = true;
        overlayAutoHideExpandMode = AutoHideExpandMode.Hover;
        setOverlayAutoHide(true);
        setOverlayAutoHideExpandMode(AutoHideExpandMode.Hover);
        saveToolbarSettingsUpdate({ autoHide: true, autoHideExpandMode: AutoHideExpandMode.Hover });
        console.log('[Overlay] Auto-hide enabled (hover mode)');
      } else if (overlayAutoHideExpandMode === AutoHideExpandMode.Hover) {
        overlayAutoHideExpandMode = AutoHideExpandMode.Click;
        setOverlayAutoHideExpandMode(AutoHideExpandMode.Click);
        saveToolbarSettingsUpdate({ autoHideExpandMode: AutoHideExpandMode.Click });
        console.log('[Overlay] Auto-hide switched to click mode');
      } else {
        overlayAutoHide = false;
        setOverlayAutoHide(false);
        saveToolbarSettingsUpdate({ autoHide: false });
        console.log('[Overlay] Auto-hide disabled');
      }
      break;

    case 'hotkeys':
    case 'open_hotkeys':
      console.log('[Overlay] Opening hotkey settings');
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('show-settings', 'hotkeys');
      }
      break;

    case 'about':
      console.log('[Overlay] About clicked');
      // Could show about dialog
      break;
  }
}




/**
 * Called when game starts
 */
export function onGameStarted(pid: number): void {
  console.log('[Windows] Game started, PID:', pid);
  currentGamePid = pid;

  // On Linux, we use LD_PRELOAD instead of DLL injection
  // Log native addon state for debugging (optional, non-critical)
  if (process.platform !== 'linux') {
    try {
      const alt1gl = require('./alt1gl');
      alt1gl.logNativeState();
    } catch (e) {
      // alt1gl module may not exist - this is optional debug logging
      console.log('[Windows] alt1gl debug module not available (this is OK)');
    }
  }

  // Configure native overlay after a short delay
  configureNativeOverlay(pid, 'dark').catch(e => {
    console.error('[Windows] Failed to configure overlay:', e);
  });

  // Reload all open app windows so their preload scripts reconnect
  // to the new game client's shared memory. Without this, app windows
  // opened for a previous RS client keep a stale native addon connection.
  // Delay the reload to give the injected DLL time to fully initialize its
  // shared memory heap and GL server. Connecting too early causes assertion
  // failures in BufferData::data() because the heap isn't ready yet.
  setTimeout(() => {
    for (const [windowId, info] of appWindows) {
      if (info.window.isDestroyed()) continue;

      if (info.gamePid === pid) {
        // Window was created for this client -- reload to pick up fresh shared memory
        console.log(`[Windows] Reloading app window "${info.title}" (id=${windowId}) for PID ${pid} (reconnect)`);
        info.window.webContents.reload();
      } else if (info.gamePid === 0) {
        // Window created before any client connected -- assign to new client
        console.log(`[Windows] Assigning orphaned app window "${info.title}" (id=${windowId}) to PID ${pid}`);
        info.gamePid = pid;
        info.window.webContents.reload();
      } else {
        // Window belongs to a different client -- leave it alone
        console.log(`[Windows] Skipping app window "${info.title}" (id=${windowId}) -- belongs to PID ${info.gamePid}`);
      }
    }
  }, 3000);
}

/**
 * Called when game stops
 */
export function onGameStopped(pid?: number): void {
  console.log('[Windows] Game stopped, PID:', pid);
  if (pid) {
    // Disconnect just that client - callbacks are on the client object
    // and get cleaned up when disconnectOverlayClient removes it from the map
    disconnectOverlayClient(pid);
    clearProfileForPid(pid);
    // Only reset currentGamePid if it matches the stopped client
    if (currentGamePid === pid) {
      currentGamePid = 0;
    }
  } else {
    // Disconnect all (legacy behavior)
    disconnectOverlay();
    currentGamePid = 0;
    setOverlayClickCallback(null);
    setOverlayConfigChangedCallback(null);
  }
}

/**
 * Cleanup overlay resources (sync version for quick disconnect)
 */
export function destroyOverlay(): void {
  disconnectOverlay();
  setOverlayClickCallback(null);
  setOverlayConfigChangedCallback(null);
}

/**
 * Silently disconnect overlay without sending Shutdown message.
 * Use on launcher exit - the DLL detects the broken pipe, resets, and keeps
 * listening for new connections. Toolbar and hotkeys stay active in the game.
 */
export function silentDestroyOverlay(): void {
  silentDisconnectOverlay();
  setOverlayClickCallback(null);
  setOverlayConfigChangedCallback(null);
}

/**
 * Cleanup overlay resources with proper shutdown (async version for app exit)
 * Sends shutdown command to overlay DLL before disconnecting
 */
export async function destroyOverlayAsync(): Promise<void> {
  await shutdownAllOverlays();
  setOverlayClickCallback(null);
  setOverlayConfigChangedCallback(null);
}

/**
 * Show the toolbar overlay
 */
export function showToolbar(): void {
  if (isOverlayConnected()) {
    setOverlayVisible(true);
  }
}

/**
 * Hide the toolbar overlay
 */
export function hideToolbar(): void {
  if (isOverlayConnected()) {
    setOverlayVisible(false);
  }
}

/**
 * Set overlay theme
 */
export function setToolbarTheme(theme: OverlayTheme): void {
  if (isOverlayConnected()) {
    const themeIndex = THEME_MAP[theme] ?? 0;
    setOverlayTheme(themeIndex);
  }
}

// ============================================
// App Window IPC Handlers
// ============================================

/**
 * Initialize IPC handlers for app window controls
 */
export function initAppWindowIpc(): void {
  const ipcMain = getIpcMain();
  const BrowserWindow = getBrowserWindow();

  // Helper to get BrowserWindow from event
  const getWindowFromEvent = (event: IpcMainEvent | IpcMainInvokeEvent) => {
    return BrowserWindow.fromWebContents(event.sender);
  };

  // Close app window
  ipcMain.on('app-window:close', (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  // Minimize app window
  ipcMain.on('app-window:minimize', (event: IpcMainEvent) => {
    const win = getWindowFromEvent(event);
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  // Get window title
  ipcMain.handle('app-window:get-title', (event: IpcMainInvokeEvent): string => {
    const info = getAppWindowByWebContents(event.sender.id);
    return info?.title || 'RS3 Buddy App';
  });

  // Get the game PID this app window is associated with
  ipcMain.handle('app-window:get-game-pid', (event: IpcMainInvokeEvent): number => {
    const info = getAppWindowByWebContents(event.sender.id);
    return info?.gamePid || 0;
  });

  // Security: Sanitize path components to prevent directory traversal
  const sanitizePathComponent = (name: string): string => {
    return name.replace(/[\/\\]/g, '').replace(/\.\./g, '');
  };

  // App data persistence - allows builtin apps to read/write JSON files
  // Files stored in userData/alt1gl/app-data/{appName}/
  ipcMain.handle('app-data:write', async (_event: IpcMainInvokeEvent, appName: string, filename: string, data: string): Promise<boolean> => {
    try {
      const { app } = require('electron');
      const safeAppName = sanitizePathComponent(appName);
      const safeFilename = sanitizePathComponent(filename);
      if (!safeAppName || !safeFilename) {
        console.error('[app-data:write] SECURITY: Invalid app name or filename after sanitization');
        return false;
      }
      const baseDir = path.resolve(app.getPath('userData'), 'alt1gl', 'app-data');
      const dir = path.join(baseDir, safeAppName);
      const fullPath = path.resolve(path.join(dir, safeFilename));
      if (!fullPath.startsWith(baseDir)) {
        console.error('[app-data:write] SECURITY: Path traversal blocked:', fullPath);
        return false;
      }
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, data, 'utf-8');
      return true;
    } catch (e) {
      console.error('[app-data:write] Error:', e);
      return false;
    }
  });

  ipcMain.handle('app-data:read', async (_event: IpcMainInvokeEvent, appName: string, filename: string): Promise<string | null> => {
    try {
      const { app } = require('electron');
      const safeAppName = sanitizePathComponent(appName);
      const safeFilename = sanitizePathComponent(filename);
      if (!safeAppName || !safeFilename) {
        console.error('[app-data:read] SECURITY: Invalid app name or filename after sanitization');
        return null;
      }
      const baseDir = path.resolve(app.getPath('userData'), 'alt1gl', 'app-data');
      const filePath = path.resolve(path.join(baseDir, safeAppName, safeFilename));
      if (!filePath.startsWith(baseDir)) {
        console.error('[app-data:read] SECURITY: Path traversal blocked:', filePath);
        return null;
      }
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      return null;
    } catch (e) {
      console.error('[app-data:read] Error:', e);
      return null;
    }
  });

  // Get injection state (so app windows can connect to existing shared memory)
  ipcMain.handle('app-window:get-injection-state', (event: IpcMainInvokeEvent): { pid: number; dllPath: string; instanceId: number } | null => {
    const info = getAppWindowByWebContents(event.sender.id);
    const targetPid = info?.gamePid || 0;
    if (targetPid > 0) {
      return getInjectionStateForPid(targetPid);
    }
    return getInjectionState();
  });

  // Synchronous version of get-injection-state for preload script
  // This is needed so the addon can connect BEFORE the app code runs
  ipcMain.on('app-window:get-injection-state-sync', (event: Electron.IpcMainEvent) => {
    const info = getAppWindowByWebContents(event.sender.id);
    const targetPid = info?.gamePid || 0;
    if (targetPid > 0) {
      event.returnValue = getInjectionStateForPid(targetPid);
    } else {
      event.returnValue = getInjectionState();
    }
  });

  // Set injection state (from preload when it connects directly)
  ipcMain.on('app-window:set-injection-state', (_event: Electron.IpcMainEvent, state: { pid: number; dllPath: string; instanceId: number }) => {
    console.log('[Windows] Received set-injection-state from preload:', state);
    setInjectionState(state);
  });

  console.log('[Windows] App window IPC handlers initialized');
}
