// Import types for TypeScript
import type { IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import { getIpcMain, getApp } from './electron';
import * as fs from 'fs';
import * as https from 'https';
import {
  getConfig,
  setConfig,
  getSessions,
  removeSession,
  saveCredentials,
  getInstalledApps,
  addApp,
  removeApp,
  saveApps,
  saveConfig,
  getHotkeysSettings,
  updateHotkeysSettings,
  getToolbarProfiles,
  createToolbarProfile,
  updateToolbarProfile,
  renameToolbarProfile,
  deleteToolbarProfile,
  getProfileAssignments,
  assignProfileToCharacter
} from './config';
import { openLoginWindow, setLoginCallbacks } from './auth';
import {
  launchRuneScape,
  launchViaJagexLauncher,
  testLaunchRs2Client,
  launchWithDownloadedClient,
  setDownloadProgressCallback
} from './game';
import {
  downloadRS3Client,
  checkForUpdates,
  getCachedGamePath,
  isJagexLauncherInstalled,
  isFlatpakAvailable,
  installFlatpakSystem,
  installJagexLauncherFlatpak,
  downloadJagexLauncherWindows,
  runJagexLauncherInstaller,
  getJagexLauncherInstallInstructions
} from './download';
import { fetchAppConfig } from './utils';
import {
  getMainWindow,
  createAppWindow,
  showToolbar,
  hideToolbar,
  sendToMainWindow,
  createWorkspace,
  refreshOverlayAppsMenu,
  getGamePidForWebContents,
  getProfileForPid,
  setProfileForPid
} from './windows';
import {
  sendOverlayFontTexture,
  isOverlayConnected,
  getOverlayMousePosition,
  getOverlayMousePositionForPid
} from './overlay-ipc';
import { getConnectedClients, refreshTrayMenu } from './tray';
import * as hotkeys from './hotkeys';
import {
  getFormattedList,
  updateHotkeyAccelerator,
  updateHotkeyAcceleratorByUuid,
  resetHotkeyToDefault,
  checkConflict,
  getRegisteredHotkeys,
  registerHotkeyWithConflictCheck,
  findAlternativeAccelerator,
  buildAccelerator
} from './hotkeys';
import type { ConflictResolutionResult } from './hotkeys';
import { getFocusState, setGlobalOverride } from './focus';
import { loadNativeAddon } from './inject';
import { checkForUpdate, downloadAndApplyUpdate, getPendingUpdate } from './updater';
import { fetchNews } from './news';
import type { SessionInfo, Result, InstalledApp, ConnectedClient, HotkeysSettings, FocusState, FormattedHotkey, ConflictInfo, HotkeyConflictRequest, HotkeyConflictResponse } from './types';

// Initialize IPC handlers
export function initIpcHandlers(): void {
  const ipcMain = getIpcMain();
  const app = getApp();

  // Debug logging from renderer processes - outputs to terminal stderr
  ipcMain.on('debug-log', (_event, msg: string) => {
    process.stderr.write(msg + '\n');
  });

  // Config
  ipcMain.handle('get-config', () => getConfig());

  // GL Overlay injection settings — single source of truth.
  // The 'injection-settings-changed' handler is in main.ts (consolidated to avoid split-brain).
  // This just exposes the current state for renderer queries.
  ipcMain.handle('get-injection-settings', () => {
    try {
      const saved = (getConfig() as any).injectionSettings;
      if (saved) {
        const enabled = saved.autoInject ?? false;
        return { enabled, overlay: enabled, glHooks: enabled, autoInject: enabled };
      }
    } catch {}
    return { enabled: false, overlay: false, glHooks: false, autoInject: false };
  });

  // Sessions (return safe data without tokens)
  ipcMain.handle('get-sessions', (): SessionInfo[] => {
    return getSessions().map(s => ({
      id: s.id,
      accounts: s.accounts,
      createdAt: s.createdAt
    }));
  });

  // Apps
  ipcMain.handle('get-apps', () => getInstalledApps());

  // Connected clients
  ipcMain.handle('get-connected-clients', (): ConnectedClient[] => {
    return getConnectedClients();
  });

  // Login
  ipcMain.handle('open-login', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      openLoginWindow(mainWindow);
    }
    return { success: true };
  });

  // Logout
  ipcMain.handle('logout', (_event: IpcMainInvokeEvent, sessionId: string): Result => {
    const removed = removeSession(sessionId);
    if (removed) {
      saveCredentials();
      return { success: true };
    }
    return { success: false, error: 'Session not found' };
  });

  // Launch game - uses downloaded client (recommended)
  ipcMain.handle('launch-runescape', async (_event: IpcMainInvokeEvent, options?: { sessionIndex?: number; characterId?: string | null }) => {
    // Set up progress callback to send to renderer
    setDownloadProgressCallback((message, progress) => {
      sendToMainWindow('download-progress', { message, progress });
    });

    try {
      // Use the new method that downloads the actual game client
      return await launchWithDownloadedClient({
        sessionIndex: options?.sessionIndex || 0,
        characterId: options?.characterId
      });
    } finally {
      setDownloadProgressCallback(null);
    }
  });

  // Legacy launch using stub launcher (fallback)
  ipcMain.handle('launch-runescape-legacy', async (_event: IpcMainInvokeEvent, options?: { sessionIndex?: number; characterId?: string | null }) => {
    return launchRuneScape({
      sessionIndex: options?.sessionIndex || 0,
      characterId: options?.characterId
    });
  });

  ipcMain.handle('launch-via-jagex', () => {
    return launchViaJagexLauncher();
  });

  ipcMain.handle('test-launch', () => {
    return testLaunchRs2Client();
  });

  // Download game client
  ipcMain.handle('download-game', async () => {
    setDownloadProgressCallback((message, progress) => {
      sendToMainWindow('download-progress', { message, progress });
    });

    try {
      const exePath = await downloadRS3Client();
      return { success: true, path: exePath };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      setDownloadProgressCallback(null);
    }
  });

  // Check for game updates
  ipcMain.handle('check-game-updates', async () => {
    return checkForUpdates();
  });

  // Get cached game path
  ipcMain.handle('get-cached-game', () => {
    return getCachedGamePath();
  });

  // ============================================
  // Jagex Launcher Installation
  // ============================================

  // Check if Jagex Launcher is installed
  ipcMain.handle('jagex-launcher:check-installed', () => {
    return isJagexLauncherInstalled();
  });

  // Check if Flatpak is available (Linux only)
  ipcMain.handle('jagex-launcher:flatpak-available', () => {
    return isFlatpakAvailable();
  });

  // Get installation instructions
  ipcMain.handle('jagex-launcher:get-instructions', () => {
    return getJagexLauncherInstallInstructions();
  });

  // Install Flatpak itself (Linux only, requires sudo)
  ipcMain.handle('jagex-launcher:install-flatpak-system', async () => {
    return installFlatpakSystem((message, progress) => {
      sendToMainWindow('jagex-launcher:install-progress', { message, progress });
    });
  });

  // Install via Flatpak (Linux)
  ipcMain.handle('jagex-launcher:install-flatpak', async () => {
    const result = await installJagexLauncherFlatpak((message, progress) => {
      sendToMainWindow('jagex-launcher:install-progress', { message, progress });
    });

    if (result.success) {
      // Refresh detected paths
      const { detectPaths } = require('./config');
      detectPaths();
    }

    return result;
  });

  // Download Windows installer
  ipcMain.handle('jagex-launcher:download-windows', async () => {
    return downloadJagexLauncherWindows((message, progress) => {
      sendToMainWindow('jagex-launcher:install-progress', { message, progress });
    });
  });

  // Run Windows installer
  ipcMain.handle('jagex-launcher:run-installer', (_event: IpcMainInvokeEvent, installerPath: string) => {
    return runJagexLauncherInstaller(installerPath);
  });

  // App management
  ipcMain.handle('add-app', async (_event: IpcMainInvokeEvent, url: string, displayName?: string): Promise<Result> => {
    try {
      const appConfig = await fetchAppConfig(url);
      const apps = getInstalledApps();

      // Check if already installed
      if (apps.find(a => a.configUrl === url)) {
        return { success: false, error: 'App already installed' };
      }

      // Set custom display name if provided
      if (displayName) {
        appConfig.displayName = displayName;
      }

      addApp(appConfig);
      saveApps();

      // Refresh overlay apps menu and tray menu
      refreshOverlayAppsMenu();
      refreshTrayMenu();

      // Notify main window renderer to refresh app list
      sendToMainWindow('apps-updated', {});

      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle('remove-app', (_event: IpcMainInvokeEvent, configUrl: string): Result => {
    const removed = removeApp(configUrl);
    if (removed) {
      saveApps();

      // Refresh overlay apps menu and tray menu
      refreshOverlayAppsMenu();
      refreshTrayMenu();

      // Notify main window renderer to refresh app list
      sendToMainWindow('apps-updated', {});

      return { success: true };
    }
    return { success: false, error: 'App not found' };
  });

  // Window controls
  ipcMain.handle('minimize-window', () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle('close-window', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      // This will trigger the 'close' event on the window,
      // which handles closeToTray logic
      mainWindow.close();
    }
  });

  // Path setters
  ipcMain.handle('set-jagex-launcher-path', (_event: IpcMainInvokeEvent, newPath: string): Result => {
    if (fs.existsSync(newPath)) {
      setConfig({ jagexLauncherPath: newPath });
      return { success: true };
    }
    return { success: false, error: 'Path does not exist' };
  });

  ipcMain.handle('set-rs2client-path', (_event: IpcMainInvokeEvent, newPath: string): Result => {
    if (fs.existsSync(newPath)) {
      setConfig({ rs2ClientPath: newPath });
      return { success: true };
    }
    return { success: false, error: 'Path does not exist' };
  });

  ipcMain.handle('set-alt1gl-lib-path', (_event: IpcMainInvokeEvent, newPath: string): Result => {
    if (fs.existsSync(newPath)) {
      setConfig({ alt1glLibPath: newPath });
      return { success: true };
    }
    return { success: false, error: 'Path does not exist' };
  });

  // Launch on startup settings
  ipcMain.handle('get-launch-on-startup', (): boolean => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle('set-launch-on-startup', (_event: IpcMainInvokeEvent, enabled: boolean): Result => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        // On Windows, this starts the app minimized to tray
        openAsHidden: enabled
      });
      console.log(`[IPC] Launch on startup ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
    } catch (e) {
      console.error('[IPC] Failed to set login item settings:', e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  // Start minimized to tray setting
  ipcMain.handle('get-start-minimized', (): boolean => {
    return getConfig().startMinimized;
  });

  ipcMain.handle('set-start-minimized', (_event: IpcMainInvokeEvent, enabled: boolean): Result => {
    try {
      setConfig({ startMinimized: enabled });
      saveConfig();
      console.log(`[IPC] Start minimized ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
    } catch (e) {
      console.error('[IPC] Failed to set start minimized:', e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  // Toolbar IPC (using on instead of handle for one-way messages)
  ipcMain.on('show-toolbar', () => {
    showToolbar();
  });

  ipcMain.on('hide-toolbar', () => {
    hideToolbar();
  });

  ipcMain.on('show-main-window', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.on('toolbar-add-app', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('show-add-app-modal');
    }
  });

  ipcMain.on('open-app', (_event: IpcMainEvent, appData: InstalledApp) => {
    createAppWindow(appData);
  });

  // Launch workspace (embedded RS client mode)
  ipcMain.on('launch-workspace', () => {
    console.log('[IPC] Launching workspace mode');
    createWorkspace();
  });

  // Font atlas for overlay
  ipcMain.handle('send-font-atlas', (_event: IpcMainInvokeEvent, data: {
    textureWidth: number;
    textureHeight: number;
    glyphWidth: number;
    glyphHeight: number;
    firstChar: number;
    lastChar: number;
    charsPerRow: number;
    pixels: Uint8Array;
    charWidths?: Uint8Array;
  }): Result => {
    if (!isOverlayConnected()) {
      return { success: false, error: 'Overlay not connected' };
    }

    const sent = sendOverlayFontTexture(
      data.textureWidth,
      data.textureHeight,
      data.glyphWidth,
      data.glyphHeight,
      data.firstChar,
      data.lastChar,
      data.charsPerRow,
      data.pixels,
      data.charWidths
    );

    if (sent) {
      console.log('[IPC] Font atlas sent to overlay (with charWidths:', !!data.charWidths, ')');
      return { success: true };
    }
    return { success: false, error: 'Failed to send font atlas' };
  });

  // ============================================
  // Hotkey API
  // ============================================

  // Register a hotkey (using modifier flags and key code)
  ipcMain.handle('hotkey:register', (
    event: IpcMainInvokeEvent,
    modifiers: number,
    keyCode: number,
    action: string,
    appId?: string
  ): number => {
    // Use the webContents id for targeted dispatch
    const windowId = event.sender.id;
    return hotkeys.registerHotkey(modifiers, keyCode, action, appId || 'unknown', windowId);
  });

  // Register a hotkey using accelerator string (e.g., "Ctrl+Shift+A")
  ipcMain.handle('hotkey:registerAccelerator', (
    event: IpcMainInvokeEvent,
    accelerator: string,
    action: string,
    appId?: string
  ): number => {
    const windowId = event.sender.id;
    return hotkeys.registerHotkeyByAccelerator(accelerator, action, appId || 'unknown', windowId);
  });

  // Unregister a hotkey by ID
  ipcMain.handle('hotkey:unregister', (
    _event: IpcMainInvokeEvent,
    hotkeyId: number
  ): boolean => {
    return hotkeys.unregisterHotkey(hotkeyId);
  });

  // Unregister all hotkeys for an app
  ipcMain.handle('hotkey:unregisterApp', (
    _event: IpcMainInvokeEvent,
    appId: string
  ): number => {
    return hotkeys.unregisterAppHotkeys(appId);
  });

  // Enable or disable a specific hotkey
  ipcMain.handle('hotkey:setEnabled', (
    _event: IpcMainInvokeEvent,
    hotkeyId: number,
    enabled: boolean
  ): boolean => {
    return hotkeys.setHotkeyEnabled(hotkeyId, enabled);
  });

  // Enable or disable all hotkeys globally
  ipcMain.handle('hotkey:setGlobalEnabled', (
    _event: IpcMainInvokeEvent,
    enabled: boolean
  ): void => {
    hotkeys.setGlobalEnabled(enabled);
  });

  // Check if global hotkeys are enabled
  ipcMain.handle('hotkey:isGlobalEnabled', (): boolean => {
    return hotkeys.isGlobalEnabled();
  });

  // Get all registered hotkeys (optionally filtered by app)
  ipcMain.handle('hotkey:getAll', (
    _event: IpcMainInvokeEvent,
    appId?: string
  ): hotkeys.HotkeyInfo[] => {
    return hotkeys.getRegisteredHotkeys(appId);
  });

  // Get a specific hotkey by ID
  ipcMain.handle('hotkey:get', (
    _event: IpcMainInvokeEvent,
    hotkeyId: number
  ): hotkeys.HotkeyInfo | undefined => {
    return hotkeys.getHotkey(hotkeyId);
  });

  // Clear all hotkeys
  ipcMain.handle('hotkey:clearAll', (): void => {
    hotkeys.clearAllHotkeys();
  });

  // ============================================
  // Hotkey Management IPC Handlers (New)
  // ============================================

  // Register hotkey with smart conflict detection and resolution
  ipcMain.handle('hotkey:registerWithConflictCheck', (
    event: IpcMainInvokeEvent,
    modifiers: number,
    keyCode: number,
    action: string,
    appId?: string,
    autoAcceptAlternative?: boolean
  ): ConflictResolutionResult => {
    const windowId = event.sender.id;
    return registerHotkeyWithConflictCheck(
      modifiers,
      keyCode,
      action,
      appId || 'unknown',
      windowId,
      autoAcceptAlternative || false
    );
  });

  // Find alternative accelerator for conflict resolution
  ipcMain.handle('hotkey:findAlternative', (
    _event: IpcMainInvokeEvent,
    accelerator: string,
    excludeAppId?: string
  ): { available: boolean; alternative: string | null; originalModifiers: string; alternativeModifiers: string | null; key: string } => {
    return findAlternativeAccelerator(accelerator, excludeAppId);
  });

  // Build accelerator from modifiers and keyCode
  ipcMain.handle('hotkey:buildAccelerator', (
    _event: IpcMainInvokeEvent,
    modifiers: number,
    keyCode: number
  ): string => {
    return buildAccelerator(modifiers, keyCode);
  });

  // Get formatted list of hotkeys for UI display
  ipcMain.handle('hotkey:getFormattedList', (_event: IpcMainInvokeEvent, appId?: string): FormattedHotkey[] => {
    return getFormattedList(appId);
  });

  // Update hotkey accelerator (rebind) - accepts numeric ID or UUID string
  ipcMain.handle('hotkey:updateAccelerator', (
    _event: IpcMainInvokeEvent,
    hotkeyId: number | string,
    newAccelerator: string
  ): { success: boolean; error?: string } => {
    if (typeof hotkeyId === 'string') {
      return updateHotkeyAcceleratorByUuid(hotkeyId, newAccelerator);
    }
    return updateHotkeyAccelerator(hotkeyId, newAccelerator);
  });

  // Reset hotkey to default accelerator
  ipcMain.handle('hotkey:resetToDefault', (
    _event: IpcMainInvokeEvent,
    hotkeyId: number
  ): boolean => {
    return resetHotkeyToDefault(hotkeyId);
  });

  // Check for accelerator conflicts
  ipcMain.handle('hotkey:checkConflict', (
    _event: IpcMainInvokeEvent,
    accelerator: string,
    excludeId?: number
  ): ConflictInfo => {
    return checkConflict(accelerator, excludeId);
  });

  // Get hotkey settings
  ipcMain.handle('hotkey:getSettings', (): HotkeysSettings => {
    return getHotkeysSettings();
  });

  // Update hotkey settings
  ipcMain.handle('hotkey:updateSettings', (
    _event: IpcMainInvokeEvent,
    updates: Partial<HotkeysSettings>
  ): void => {
    updateHotkeysSettings(updates);
  });

  // Set only when RS focused setting
  ipcMain.handle('hotkey:setOnlyWhenFocused', (
    _event: IpcMainInvokeEvent,
    onlyWhenFocused: boolean
  ): void => {
    updateHotkeysSettings({ onlyWhenRsFocused: onlyWhenFocused });
  });

  // ============================================
  // Hotkey Conflict Resolution IPC
  // ============================================

  // Store pending conflict resolution requests
  const pendingConflictRequests = new Map<string, {
    resolve: (response: HotkeyConflictResponse) => void;
    appId: string;
    modifiers: number;
    keyCode: number;
    action: string;
    windowId: number;
  }>();

  // App window requests conflict resolution dialog
  ipcMain.handle('hotkey:showConflictDialog', async (
    event: IpcMainInvokeEvent,
    request: HotkeyConflictRequest,
    modifiers: number,
    keyCode: number,
    action: string
  ): Promise<HotkeyConflictResponse> => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return {
        requestId: request.requestId,
        accepted: false,
        useAlternative: false,
        openSettings: false
      };
    }

    // Show main window and focus it
    mainWindow.show();
    mainWindow.focus();

    // Send to main window renderer
    mainWindow.webContents.send('hotkey:show-conflict-dialog', request);

    // Wait for response
    return new Promise((resolve) => {
      pendingConflictRequests.set(request.requestId, {
        resolve,
        appId: request.appName,
        modifiers,
        keyCode,
        action,
        windowId: event.sender.id
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (pendingConflictRequests.has(request.requestId)) {
          pendingConflictRequests.delete(request.requestId);
          resolve({
            requestId: request.requestId,
            accepted: false,
            useAlternative: false,
            openSettings: false
          });
        }
      }, 60000);
    });
  });

  // Main window sends conflict resolution response
  ipcMain.on('hotkey:conflict-resolved', (
    _event: IpcMainEvent,
    response: HotkeyConflictResponse
  ) => {
    const pending = pendingConflictRequests.get(response.requestId);
    if (pending) {
      pendingConflictRequests.delete(response.requestId);
      pending.resolve(response);
    }
  });

  // ============================================
  // Focus State IPC Handlers
  // ============================================

  // Get current focus state
  ipcMain.handle('focus:getState', (): FocusState => {
    return getFocusState();
  });

  // Set global override (for special events)
  ipcMain.handle('focus:setGlobalOverride', (
    _event: IpcMainInvokeEvent,
    allow: boolean
  ): void => {
    setGlobalOverride(allow);
  });

  // ============================================
  // Toolbar Profile IPC Handlers
  // ============================================
  initProfileIpcHandlers();

  // ============================================
  // Auto-Update IPC Handlers
  // ============================================
  initUpdaterIpcHandlers();

  // ============================================
  // News & Hiscores IPC Handlers
  // ============================================
  initNewsAndHiscoresHandlers();

  // ============================================
  // Alt1 Compatibility API (for legacy Alt1 apps)
  // Note: Most Alt1GL API is now accessed directly via native addon
  // These are kept for apps using the Alt1-style overlay API
  // ============================================

  // Store active overlays by group (for Alt1 compat layer)
  const overlayGroups = new Map<string, any[]>();

  ipcMain.handle('alt1:overlayTextEx', async (
    _event: IpcMainInvokeEvent,
    data: { str: string; color: number; size: number; x: number; y: number; time: number; fontname: string; centered: boolean; shadow: boolean; group: string }
  ): Promise<boolean> => {
    try {
      console.log(`[Alt1Compat] overlayTextEx "${data.str}" at (${data.x}, ${data.y}) font=${data.fontname}`);
      return true;
    } catch (e) {
      console.error('[Alt1Compat] overlayTextEx failed:', e);
      return false;
    }
  });

  ipcMain.handle('alt1:overlayLine', async (
    _event: IpcMainInvokeEvent,
    data: { color: number; width: number; x1: number; y1: number; x2: number; y2: number; time: number; group: string }
  ): Promise<boolean> => {
    try {
      console.log(`[Alt1Compat] overlayLine from (${data.x1}, ${data.y1}) to (${data.x2}, ${data.y2})`);
      return true;
    } catch (e) {
      console.error('[Alt1Compat] overlayLine failed:', e);
      return false;
    }
  });

  ipcMain.handle('alt1:overlayImage', async (
    _event: IpcMainInvokeEvent,
    data: { x: number; y: number; imgstr: string; imgwidth: number; time: number; group: string }
  ): Promise<boolean> => {
    try {
      console.log(`[Alt1Compat] overlayImage at (${data.x}, ${data.y}) width=${data.imgwidth}`);
      return true;
    } catch (e) {
      console.error('[Alt1Compat] overlayImage failed:', e);
      return false;
    }
  });

  ipcMain.handle('alt1:overlayRefreshGroup', async (
    _event: IpcMainInvokeEvent,
    group: string
  ): Promise<void> => {
    console.log(`[Alt1Compat] overlayRefreshGroup: ${group}`);
  });

  ipcMain.handle('alt1:overlayClearGroup', async (
    _event: IpcMainInvokeEvent,
    group: string
  ): Promise<void> => {
    const overlays = overlayGroups.get(group);
    if (overlays) {
      for (const overlay of overlays) {
        try {
          if (overlay?.stop) overlay.stop();
        } catch {
          // Ignore errors
        }
      }
      overlayGroups.delete(group);
    }
    console.log(`[Alt1Compat] overlayClearGroup: ${group}`);
  });

  ipcMain.handle('alt1:showNotification', async (
    _event: IpcMainInvokeEvent,
    data: { title: string; msg: string; icon: string }
  ): Promise<void> => {
    // Use Electron's notification API
    const { Notification } = require('electron');
    new Notification({
      title: data.title,
      body: data.msg,
    }).show();
  });

  ipcMain.handle('alt1:setTooltip', async (
    _event: IpcMainInvokeEvent,
    text: string
  ): Promise<void> => {
    console.log(`[Alt1Compat] setTooltip: ${text}`);
  });

  ipcMain.handle('alt1:clearTooltip', async (): Promise<void> => {
    console.log('[Alt1Compat] clearTooltip');
  });

  ipcMain.handle('alt1:setTitleBarText', async (
    _event: IpcMainInvokeEvent,
    text: string
  ): Promise<void> => {
    console.log(`[Alt1Compat] setTitleBarText: ${text}`);
  });

  ipcMain.handle('alt1:setTaskbarProgress', async (
    _event: IpcMainInvokeEvent,
    data: { type: number; progress: number }
  ): Promise<void> => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      // Map Alt1 progress types to Electron
      // 0=reset, 1=progress, 2=error, 3=unknown, 4=paused
      const modeMap: { [key: number]: 'none' | 'normal' | 'error' | 'indeterminate' | 'paused' } = {
        0: 'none',
        1: 'normal',
        2: 'error',
        3: 'indeterminate',
        4: 'paused',
      };
      mainWindow.setProgressBar(data.progress, { mode: modeMap[data.type] || 'none' });
    }
  });

  ipcMain.handle('alt1:identifyAppUrl', async (
    _event: IpcMainInvokeEvent,
    url: string
  ): Promise<void> => {
    console.log(`[Alt1Compat] identifyAppUrl: ${url}`);
  });

  // ============================================
  // Native Addon IPC (for Linux - renderer can't load addon directly)
  // ============================================
  initNativeAddonIpc();
}

// Set up auth callbacks to send events to renderer
export function initAuthCallbacks(): void {
  setLoginCallbacks(
    (session) => {
      sendToMainWindow('login-success', { session });
      // Refresh tray menu to show logged-in state
      refreshTrayMenu();
    },
    (error) => {
      sendToMainWindow('login-error', { error });
    }
  );
}

// ============================================
// Native Addon IPC Handlers
// For Linux where renderer can't load addon directly
// ============================================
function initNativeAddonIpc(): void {
  const ipcMain = getIpcMain();

  // Get RS ready status
  ipcMain.handle('native:getRsReady', (): number => {
    const addon = loadNativeAddon();
    if (!addon) return 0;
    try {
      return addon.getRsReady();
    } catch (e) {
      console.error('[NativeIPC] getRsReady error:', e);
      return 0;
    }
  });

  // Get RS window position
  ipcMain.handle('native:getRsX', (): number => {
    const addon = loadNativeAddon();
    if (!addon) return 0;
    try {
      return addon.getRsX();
    } catch (e) {
      return 0;
    }
  });

  ipcMain.handle('native:getRsY', (): number => {
    const addon = loadNativeAddon();
    if (!addon) return 0;
    try {
      return addon.getRsY();
    } catch (e) {
      return 0;
    }
  });

  ipcMain.handle('native:getRsWidth', (): number => {
    const addon = loadNativeAddon();
    if (!addon) return 0;
    try {
      return addon.getRsWidth();
    } catch (e) {
      return 0;
    }
  });

  ipcMain.handle('native:getRsHeight', (): number => {
    const addon = loadNativeAddon();
    if (!addon) return 0;
    try {
      return addon.getRsHeight();
    } catch (e) {
      return 0;
    }
  });

  // Capture screen/texture
  ipcMain.handle('native:capture', async (
    _event: IpcMainInvokeEvent,
    texid: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): Promise<ImageData | null> => {
    const addon = loadNativeAddon();
    if (!addon) return null;
    try {
      return await addon.capture(texid, x, y, w, h);
    } catch (e) {
      console.error('[NativeIPC] capture error:', e);
      return null;
    }
  });

  // Get renderer info
  ipcMain.handle('native:getRenderer', (): any => {
    const addon = loadNativeAddon();
    if (!addon) return null;
    try {
      return addon.getRenderer();
    } catch (e) {
      console.error('[NativeIPC] getRenderer error:', e);
      return null;
    }
  });

  // Get OpenGL state
  ipcMain.handle('native:getOpenGlState', async (): Promise<any> => {
    const addon = loadNativeAddon();
    if (!addon) return null;
    try {
      return await addon.getOpenGlState();
    } catch (e) {
      console.error('[NativeIPC] getOpenGlState error:', e);
      return null;
    }
  });

  // Record render calls
  ipcMain.handle('native:recordRenderCalls', async (
    _event: IpcMainInvokeEvent,
    options?: any
  ): Promise<any[]> => {
    const addon = loadNativeAddon();
    if (!addon) return [];
    try {
      return await addon.recordRenderCalls(options);
    } catch (e) {
      console.error('[NativeIPC] recordRenderCalls error:', e);
      return [];
    }
  });

  // Debug API
  ipcMain.handle('native:debug:getExePids', (
    _event: IpcMainInvokeEvent,
    name: string,
    parent?: number
  ): number[] => {
    const addon = loadNativeAddon();
    if (!addon?.debug) return [];
    try {
      return addon.debug.getExePids(name, parent);
    } catch (e) {
      console.error('[NativeIPC] getExePids error:', e);
      return [];
    }
  });

  ipcMain.handle('native:debug:memoryState', (): any => {
    const addon = loadNativeAddon();
    if (!addon?.debug) return null;
    try {
      return addon.debug.memoryState();
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('native:debug:getRsHwnd', (): number => {
    const addon = loadNativeAddon();
    if (!addon?.debug) return 0;
    try {
      return addon.debug.getRsHwnd();
    } catch (e) {
      return 0;
    }
  });

  // Get mouse position relative to RS3 client area (client coords: top-left origin, Y-down)
  // Apps use this to determine which inventory slot the cursor is over.
  //
  // The overlay DLL calls GetCursorPos + ScreenToClient inside the RS3 process,
  // giving us physical pixel client coords that exactly match the GL viewport.
  // This avoids all DPI conversion issues between Electron's logical coords and
  // Win32's physical coords on multi-monitor setups.

  function getMouseFromOverlay(shouldLog: boolean, tag: string, gamePid?: number): { x: number; y: number } | null {
    const pos = gamePid ? getOverlayMousePositionForPid(gamePid) : getOverlayMousePosition();
    if (!pos) {
      if (shouldLog) console.log(`[${tag}] Overlay mouse position not available (pid=${gamePid || 'active'})`);
      return null;
    }
    if (shouldLog) {
      console.log(`[${tag}] overlay client=(${pos.clientX},${pos.clientY}) viewport=(${pos.viewportW}x${pos.viewportH}) pid=${gamePid || 'active'}`);
    }
    return { x: pos.clientX, y: pos.clientY };
  }

  ipcMain.handle('native:getMousePosition', (event): { x: number; y: number } | null => {
    const gamePid = getGamePidForWebContents(event.sender.id);
    return getMouseFromOverlay(false, 'MouseAsync', gamePid || undefined);
  });

  // Sync version for high-frequency polling (apps call this every frame)
  let mouseSyncCallCount = 0;
  ipcMain.on('native:getMousePosition-sync', (event) => {
    mouseSyncCallCount++;
    const shouldLog = mouseSyncCallCount <= 20 || mouseSyncCallCount % 300 === 0;
    const gamePid = getGamePidForWebContents(event.sender.id);
    event.returnValue = getMouseFromOverlay(shouldLog, 'MouseSync', gamePid || undefined);
  });

  // Lightweight cursor position for renderer processes that can't access electron.screen
  ipcMain.on('get-cursor-screen-point', (event) => {
    try {
      const { screen } = require('electron');
      event.returnValue = screen.getCursorScreenPoint();
    } catch {
      event.returnValue = null;
    }
  });

  console.log('[IPC] Native addon IPC handlers registered');
}

// ============================================
// Toolbar Profile IPC Handlers
// ============================================
function initProfileIpcHandlers(): void {
  const ipcMain = getIpcMain();

  ipcMain.handle('profiles:getAll', () => {
    return getToolbarProfiles();
  });

  ipcMain.handle('profiles:create', (_event: IpcMainInvokeEvent, name: string, settings?: any) => {
    return createToolbarProfile(name, settings);
  });

  ipcMain.handle('profiles:update', (_event: IpcMainInvokeEvent, profileId: string, updates: any) => {
    return updateToolbarProfile(profileId, updates);
  });

  ipcMain.handle('profiles:rename', (_event: IpcMainInvokeEvent, profileId: string, newName: string) => {
    return renameToolbarProfile(profileId, newName);
  });

  ipcMain.handle('profiles:delete', (_event: IpcMainInvokeEvent, profileId: string) => {
    return deleteToolbarProfile(profileId);
  });

  ipcMain.handle('profiles:getAssignments', () => {
    return getProfileAssignments();
  });

  ipcMain.handle('profiles:assign', (_event: IpcMainInvokeEvent, characterId: string, profileId: string, characterName?: string) => {
    assignProfileToCharacter(characterId, profileId, characterName);
  });

  ipcMain.handle('profiles:getForPid', (_event: IpcMainInvokeEvent, pid: number) => {
    return getProfileForPid(pid);
  });

  ipcMain.handle('profiles:setForPid', (_event: IpcMainInvokeEvent, pid: number, profileId: string) => {
    setProfileForPid(pid, profileId);
  });

  console.log('[IPC] Toolbar profile IPC handlers registered');
}

// ============================================
// Auto-Update API
// ============================================

function initUpdaterIpcHandlers(): void {
  const ipcMain = getIpcMain();

  ipcMain.handle('updater:check', async (): Promise<{ version: string; size: number } | null> => {
    const update = await checkForUpdate();
    if (!update) return null;
    return { version: update.version, size: update.size };
  });

  ipcMain.handle('updater:apply', async (): Promise<void> => {
    const update = getPendingUpdate();
    if (update) {
      await downloadAndApplyUpdate(update.downloadUrl);
    }
  });

  console.log('[IPC] Auto-updater IPC handlers registered');
}

// ============================================
// News & Hiscores API
// ============================================

function initNewsAndHiscoresHandlers(): void {
  const ipcMain = getIpcMain();

  ipcMain.handle('get-news', async () => {
    return fetchNews();
  });

  ipcMain.handle('get-daily-info', async () => {
    const { getDailyInfo } = require('./daily-info');
    return getDailyInfo();
  });

  // App windows can signal that daily info should refresh (e.g. VoS Reader after submission)
  ipcMain.on('invalidate-daily-info', () => {
    const { clearDailyInfoCache } = require('./daily-info');
    clearDailyInfoCache();
    sendToMainWindow('refresh-daily-info', {});
  });

  ipcMain.handle('get-hiscores', async (_event: IpcMainInvokeEvent, playerName: string) => {
    return fetchHiscoresRaw(playerName);
  });

  ipcMain.handle('open-external', async (_event: IpcMainInvokeEvent, url: string) => {
    // Only allow http/https URLs for security
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const { shell } = require('electron');
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('get-app-version', () => {
    const { getApp } = require('./electron');
    return getApp().getVersion();
  });

  ipcMain.handle('ge-search', async (_event: IpcMainInvokeEvent, query: string) => {
    if (!query || query.length < 2) return [];

    // Try geprice.com first
    const geResults = await new Promise<any[]>((resolve) => {
      const url = `https://api.geprice.com/api/items/search/${encodeURIComponent(query)}`;
      const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
        if (res.statusCode !== 200) { resolve([]); return; }
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const items = (parsed.items || parsed || []).slice(0, 6);
            resolve(items.map((i: any) => ({ name: i.name, id: i.id, icon: i.icon, source: 'geprice' })));
          } catch { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    });

    if (geResults.length > 0) return geResults;

    // Fallback to RS Wiki opensearch
    return new Promise((resolve) => {
      const url = `https://runescape.wiki/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&format=json&namespace=0`;
      const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
        if (res.statusCode !== 200) { resolve([]); return; }
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const names: string[] = parsed[1] || [];
            resolve(names.filter((n: string) => !n.includes('(') && !n.includes('disambiguation')).slice(0, 6).map((n: string) => ({ name: n, id: null, icon: null, source: 'wiki' })));
          } catch { resolve([]); }
        });
      });
      req.on('error', () => resolve([]));
      req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    });
  });

  ipcMain.handle('ge-item-info', async (_event: IpcMainInvokeEvent, itemName: string, itemId?: number) => {
    if (!itemName) return null;
    const encodedName = itemName.replace(/ /g, '_');

    // Fetch from geprice.com (item summary for weekly change) + WeirdGloop (price + history) + Wiki (description) in parallel
    const [gePriceData, latestPrice, historyData, wikiData] = await Promise.all([
      // geprice.com - get item price history for weekly change data
      itemId ? new Promise<any>((resolve) => {
        const url = `https://api.geprice.com/api/prices/${itemId}`;
        const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
          if (res.statusCode !== 200) { resolve(null); return; }
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      }) : Promise.resolve(null),
      // WeirdGloop latest price
      new Promise<any>((resolve) => {
        const url = `https://api.weirdgloop.org/exchange/history/rs/latest?name=${encodeURIComponent(encodedName)}`;
        const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
          if (res.statusCode !== 200) { resolve(null); return; }
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      }),
      // WeirdGloop 90-day history for chart
      new Promise<any>((resolve) => {
        const url = `https://api.weirdgloop.org/exchange/history/rs/last90d?name=${encodeURIComponent(encodedName)}`;
        const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
          if (res.statusCode !== 200) { resolve(null); return; }
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(10000, () => { req.destroy(); resolve(null); });
      }),
      // Wiki for extended description
      new Promise<any>((resolve) => {
        const url = `https://runescape.wiki/api.php?action=query&titles=${encodeURIComponent(encodedName)}&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=100&format=json`;
        const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
          if (res.statusCode !== 200) { resolve(null); return; }
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      })
    ]);

    // Parse wiki data for description and fallback image
    let wikiImage = '';
    let description = '';
    let wikiUrl = `https://runescape.wiki/w/${encodeURIComponent(encodedName)}`;
    if (wikiData?.query?.pages) {
      const page = Object.values(wikiData.query.pages)[0] as any;
      if (page) {
        wikiImage = page.thumbnail?.source || '';
        description = page.extract || '';
      }
    }

    // Use geprice icon if we have itemId, otherwise wiki image
    const image = itemId ? `https://media.geprice.com/icon-large/${itemId}.webp` : wikiImage;

    // Parse WeirdGloop price data
    let price = 0;
    let volume = 0;
    let weirdGloopId = '';
    if (latestPrice && latestPrice[itemName]) {
      price = latestPrice[itemName].price || 0;
      volume = latestPrice[itemName].volume || 0;
      weirdGloopId = latestPrice[itemName].id || '';
    }

    // Parse geprice.com structured response (lastBuy, lastSell, weekChange, weekChangePercentage)
    // Note: GEPrices only tracks popular items - untracked items return null (404)
    let weeklyChange = 0;
    let weeklyChangePercent = 0;
    let lastReportedPrice = 0;
    if (gePriceData && typeof gePriceData === 'object' && !Array.isArray(gePriceData)) {
      lastReportedPrice = gePriceData.lastBuy || gePriceData.lastSell || 0;
      weeklyChange = typeof gePriceData.weekChange === 'number' ? gePriceData.weekChange : 0;
      // weekChangePercentage comes as a string like "+inf%" or "5.2%" - parse carefully
      if (typeof gePriceData.weekChangePercentage === 'string') {
        const pct = parseFloat(gePriceData.weekChangePercentage.replace('%', ''));
        if (isFinite(pct)) weeklyChangePercent = pct;
      } else if (typeof gePriceData.weekChangePercentage === 'number' && isFinite(gePriceData.weekChangePercentage)) {
        weeklyChangePercent = gePriceData.weekChangePercentage;
      }
    }

    // Parse 90-day history for chart
    let history: Array<{ price: number; timestamp: number }> = [];
    if (historyData && historyData[itemName]) {
      history = historyData[itemName].map((h: any) => ({ price: h.price, timestamp: h.timestamp }));
    }

    // Extract recent trade reports from geprice.com (if available)
    let reports: Array<{ date: string; price: number; reporter: string; type: string }> = [];
    if (gePriceData && Array.isArray(gePriceData.reports)) {
      reports = gePriceData.reports.slice(0, 10).map((r: any) => ({
        date: r.date || '',
        price: r.price || 0,
        reporter: r.reporter || 'Unknown',
        type: r.transactionType || ''
      }));
    }

    return {
      name: itemName,
      itemId: itemId || weirdGloopId,
      price: price || lastReportedPrice,
      volume,
      image,
      description,
      wikiUrl,
      history,
      weeklyChange,
      weeklyChangePercent,
      reports,
      source: (itemId && gePriceData) ? 'geprice' : 'wiki'
    };
  });

  console.log('[IPC] News & Hiscores IPC handlers registered');
}

/**
 * Fetch raw hiscores data from techpure.dev API proxy
 */
function fetchHiscoresRaw(playerName: string): Promise<string | null> {
  const url = `https://techpure.dev/api/hiscores?player=${encodeURIComponent(playerName)}`;

  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res: any) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const redirectReq = https.get(res.headers.location, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (redirectRes: any) => {
          if (redirectRes.statusCode !== 200) { resolve(null); return; }
          let data = '';
          redirectRes.on('data', (chunk: string) => data += chunk);
          redirectRes.on('end', () => resolve(data));
        });
        redirectReq.on('error', () => resolve(null));
        redirectReq.setTimeout(15_000, () => { redirectReq.destroy(); resolve(null); });
        return;
      }
      if (res.statusCode !== 200) { resolve(null); return; }
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15_000, () => { req.destroy(); resolve(null); });
  });
}
