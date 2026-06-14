/**
 * Main Window Preload Script
 * Exposes a typed, secure API to the main launcher renderer
 * Uses contextBridge for security with context isolation
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { AppConfig, SessionInfo, InstalledApp, Result, LaunchOptions, ConnectedClient, HotkeyConflictRequest, HotkeyConflictResponse, FormattedHotkey, HotkeysSettings, ToolbarProfile, ProfileAssignment, ToolbarSettings } from '../types';
import type { ClickRegion, ClickEventData } from '../inject';

// Font atlas data structure
interface FontAtlasData {
  textureWidth: number;
  textureHeight: number;
  glyphWidth: number;
  glyphHeight: number;
  firstChar: number;
  lastChar: number;
  charsPerRow: number;
  pixels: Uint8Array;
  charWidths?: Uint8Array;  // Per-character advance widths for proportional spacing
}

// Jagex Launcher installation status
interface JagexLauncherStatus {
  installed: boolean;
  method?: string;
  path?: string;
}

// Developer SDK client manifest types (mirror launcher/src/sdk.ts)
interface SdkClientEntry {
  id: string;
  label: string;
  file: string;
  bytes?: number;
  sha256?: string;
  install: string;
  snippet: string;
}
interface SdkManifest {
  schemaVersion: number;
  clientsVersion: string;
  generatedAt?: string;
  clients: SdkClientEntry[];
}
interface SdkManifestResult {
  ok: boolean;
  manifest?: SdkManifest;
  error?: string;
  manifestUrl: string;
  placeholder: boolean;
}
interface SdkDownloadResult {
  success: boolean;
  folder?: string;
  error?: string;
}

// Define the main window API interface
interface LauncherRendererAPI {
  // Build info
  isBetaBuild: boolean;

  // Config
  getConfig(): Promise<AppConfig>;

  // Sessions/Auth
  getSessions(): Promise<SessionInfo[]>;
  openLogin(): Promise<Result>;
  logout(sessionId: string): Promise<Result>;

  // Apps
  getApps(): Promise<InstalledApp[]>;
  addApp(url: string, displayName?: string): Promise<Result>;
  removeApp(configUrl: string): Promise<Result>;
  openApp(app: InstalledApp): void;

  // Injection settings
  setInjectionSettings(settings: { overlay: boolean; glHooks: boolean; autoInject: boolean }): void;
  getInjectionSettings(): Promise<{ overlay: boolean; glHooks: boolean; autoInject: boolean }>;

  // Launch
  launchRuneScape(options?: LaunchOptions): Promise<Result>;
  launchRuneScapeLegacy(options?: LaunchOptions): Promise<Result>;
  launchViaJagex(): Promise<Result>;
  testLaunch(): Promise<Result>;
  launchWorkspace(): void;

  // Game download
  downloadGame(): Promise<Result<string>>;
  checkGameUpdates(): Promise<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }>;
  getCachedGame(): Promise<string | null>;
  onDownloadProgress(callback: (data: { message: string; progress?: number }) => void): () => void;

  // Jagex Launcher installation
  jagexLauncher: {
    checkInstalled(): Promise<JagexLauncherStatus>;
    isFlatpakAvailable(): Promise<boolean>;
    getInstructions(): Promise<string>;
    installFlatpakSystem(): Promise<{ success: boolean; error?: string }>;
    installFlatpak(): Promise<{ success: boolean; error?: string }>;
    downloadWindows(): Promise<{ success: boolean; installerPath?: string; error?: string }>;
    runInstaller(installerPath: string): Promise<{ success: boolean; error?: string }>;
    onInstallProgress(callback: (data: { message: string; progress?: number }) => void): () => void;
  };

  // Developer SDK tab
  sdk: {
    getManifest(): Promise<SdkManifestResult>;
    pickDirectory(): Promise<string | null>;
    downloadClient(entry: SdkClientEntry, destDir: string): Promise<SdkDownloadResult>;
    onDownloadProgress(callback: (data: { id: string; fraction: number }) => void): () => void;
  };

  // Window controls
  minimizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;

  // Path setters
  setJagexLauncherPath(path: string): Promise<Result>;
  setRs2ClientPath(path: string): Promise<Result>;
  setAlt1glLibPath(path: string): Promise<Result>;

  // Startup settings
  getLaunchOnStartup(): Promise<boolean>;
  setLaunchOnStartup(enabled: boolean): Promise<Result>;
  getStartMinimized(): Promise<boolean>;
  setStartMinimized(enabled: boolean): Promise<Result>;

  // Connected clients
  getConnectedClients(): Promise<ConnectedClient[]>;

  // Events
  onLoginSuccess(callback: (data: { session: SessionInfo }) => void): () => void;
  onLoginError(callback: (data: { error: string }) => void): () => void;
  onRs2ClientStarted(callback: (data: { pid: number; clientId: number }) => void): () => void;
  onRs2ClientStopped(callback: (data: { pid?: number }) => void): () => void;
  onShowAddAppModal(callback: () => void): () => void;
  onShowSettings(callback: (section?: string) => void): () => void;
  onOverlayReady(callback: () => void): () => void;
  onClientConnected(callback: (data: { client: ConnectedClient }) => void): () => void;
  onClientDisconnected(callback: (data: { clientId: number; pid?: number }) => void): () => void;
  onClientInjected(callback: (data: { clientId: number; pid: number; success: boolean }) => void): () => void;
  onAppsUpdated(callback: () => void): () => void;

  // Auto-update
  onUpdateAvailable(callback: (data: { version: string; size: number }) => void): () => void;
  /** Engine auto-update progress (download/extract/done/error) for the banner. */
  onEngineUpdateProgress(callback: (data: { phase: string; fraction?: number; version?: string | null; message?: string }) => void): () => void;
  onUpdateDownloadProgress(callback: (data: { percent: number }) => void): () => void;
  onUpdateStatus(callback: (data: { status: string }) => void): () => void;
  checkForUpdate(): Promise<{ version: string; size: number } | null>;
  applyUpdate(): Promise<void>;

  // News & Hiscores
  getNews(): Promise<Array<{ title: string; category: string; link: string; pubDate: string; description: string; imageUrl: string | null; guid: string }>>;
  getHiscores(playerName: string): Promise<string | null>;
  getDailyInfo(): Promise<any>;
  onRefreshDailyInfo(callback: () => void): () => void;
  geSearch(query: string): Promise<Array<{name: string; id: number | null; icon: string | null; source: string}>>;
  geItemInfo(itemName: string, itemId?: number): Promise<any>;
  openExternal(url: string): Promise<void>;
  getAppVersion(): Promise<string>;

  // Hotkey management
  hotkeys: {
    getAll(appId?: string): Promise<FormattedHotkey[]>;
    getSettings(): Promise<HotkeysSettings>;
    updateSettings(updates: Partial<HotkeysSettings>): Promise<void>;
    isGlobalEnabled(): Promise<boolean>;
    setGlobalEnabled(enabled: boolean): Promise<void>;
    updateAccelerator(hotkeyId: number, newAccelerator: string): Promise<Result>;
    resetToDefault(hotkeyId: number): Promise<Result>;
  };

  // Hotkey conflict resolution
  onHotkeyConflict(callback: (request: HotkeyConflictRequest) => void): () => void;
  resolveHotkeyConflict(response: HotkeyConflictResponse): void;

  // Hotkey settings (simplified API for settings page)
  getHotkeySettings(): Promise<{ enabled: boolean; onlyWhenFocused: boolean }>;
  getRegisteredHotkeys(): Promise<FormattedHotkey[]>;
  rebindHotkey(hotkeyId: string, newAccelerator: string): Promise<{ success: boolean; error?: string }>;
  setHotkeysEnabled(enabled: boolean): Promise<void>;
  setHotkeysOnlyWhenFocused(onlyWhenFocused: boolean): Promise<void>;

  // Click regions API
  registerClickRegion(region: ClickRegion): Promise<Result<number>>;
  removeClickRegion(id: number): Promise<Result>;
  clearClickRegions(): Promise<Result>;
  setClickInputEnabled(enabled: boolean): Promise<Result>;
  hitTestRegion(x: number, y: number): Promise<Result<number>>;
  onClickRegionHit(callback: (data: ClickEventData) => void): () => void;

  // Font atlas API for overlay
  sendFontAtlas(data: FontAtlasData): Promise<Result>;

  // Toolbar profiles
  profiles: {
    getAll(): Promise<ToolbarProfile[]>;
    create(name: string, settings?: ToolbarSettings): Promise<ToolbarProfile>;
    update(profileId: string, updates: Partial<ToolbarSettings>): Promise<boolean>;
    rename(profileId: string, newName: string): Promise<boolean>;
    delete(profileId: string): Promise<boolean>;
    getAssignments(): Promise<ProfileAssignment[]>;
    assign(characterId: string, profileId: string, characterName?: string): Promise<void>;
    getForPid(pid: number): Promise<string | null>;
    setForPid(pid: number, profileId: string): Promise<void>;
  };
}

// Helper to create event listeners with cleanup
function createEventListener<T>(
  channel: string,
  callback: (data: T) => void
): () => void {
  const handler = (_event: IpcRendererEvent, data: T) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

// The API implementation
const api: LauncherRendererAPI = {
  // Build info — imported from build-config.ts which is overwritten by build scripts
  isBetaBuild: require('../build-config').BUILD_TYPE === 'beta',

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),

  // Sessions/Auth
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  openLogin: () => ipcRenderer.invoke('open-login'),
  logout: (sessionId: string) => ipcRenderer.invoke('logout', sessionId),

  // Apps
  getApps: () => ipcRenderer.invoke('get-apps'),
  addApp: (url: string, displayName?: string) => ipcRenderer.invoke('add-app', url, displayName),
  removeApp: (configUrl: string) => ipcRenderer.invoke('remove-app', configUrl),
  openApp: (app: InstalledApp) => ipcRenderer.send('open-app', app),

  // Injection settings
  setInjectionSettings: (settings: { overlay: boolean; glHooks: boolean; autoInject: boolean }) =>
    ipcRenderer.send('injection-settings-changed', settings),
  getInjectionSettings: () => ipcRenderer.invoke('get-injection-settings'),

  // Launch
  launchRuneScape: (options?: LaunchOptions) =>
    ipcRenderer.invoke('launch-runescape', options || {}),
  launchRuneScapeLegacy: (options?: LaunchOptions) =>
    ipcRenderer.invoke('launch-runescape-legacy', options || {}),
  launchViaJagex: () => ipcRenderer.invoke('launch-via-jagex'),
  testLaunch: () => ipcRenderer.invoke('test-launch'),
  launchWorkspace: () => ipcRenderer.send('launch-workspace'),

  // Game download
  downloadGame: () => ipcRenderer.invoke('download-game'),
  checkGameUpdates: () => ipcRenderer.invoke('check-game-updates'),
  getCachedGame: () => ipcRenderer.invoke('get-cached-game'),
  onDownloadProgress: (callback) =>
    createEventListener('download-progress', callback),

  // Jagex Launcher installation
  jagexLauncher: {
    checkInstalled: () => ipcRenderer.invoke('jagex-launcher:check-installed'),
    isFlatpakAvailable: () => ipcRenderer.invoke('jagex-launcher:flatpak-available'),
    getInstructions: () => ipcRenderer.invoke('jagex-launcher:get-instructions'),
    installFlatpakSystem: () => ipcRenderer.invoke('jagex-launcher:install-flatpak-system'),
    installFlatpak: () => ipcRenderer.invoke('jagex-launcher:install-flatpak'),
    downloadWindows: () => ipcRenderer.invoke('jagex-launcher:download-windows'),
    runInstaller: (installerPath: string) => ipcRenderer.invoke('jagex-launcher:run-installer', installerPath),
    onInstallProgress: (callback) =>
      createEventListener('jagex-launcher:install-progress', callback),
  },

  // Developer SDK tab
  sdk: {
    getManifest: () => ipcRenderer.invoke('sdk:get-manifest'),
    pickDirectory: () => ipcRenderer.invoke('sdk:pick-directory'),
    downloadClient: (entry: SdkClientEntry, destDir: string) =>
      ipcRenderer.invoke('sdk:download-client', entry, destDir),
    onDownloadProgress: (callback) =>
      createEventListener('sdk:download-progress', callback),
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Path setters
  setJagexLauncherPath: (path: string) =>
    ipcRenderer.invoke('set-jagex-launcher-path', path),
  setRs2ClientPath: (path: string) =>
    ipcRenderer.invoke('set-rs2client-path', path),
  setAlt1glLibPath: (path: string) =>
    ipcRenderer.invoke('set-alt1gl-lib-path', path),

  // Startup settings
  getLaunchOnStartup: () => ipcRenderer.invoke('get-launch-on-startup'),
  setLaunchOnStartup: (enabled: boolean) =>
    ipcRenderer.invoke('set-launch-on-startup', enabled),
  getStartMinimized: () => ipcRenderer.invoke('get-start-minimized'),
  setStartMinimized: (enabled: boolean) =>
    ipcRenderer.invoke('set-start-minimized', enabled),

  // Connected clients
  getConnectedClients: () => ipcRenderer.invoke('get-connected-clients'),

  // Events
  onLoginSuccess: (callback) =>
    createEventListener('login-success', callback),
  onLoginError: (callback) =>
    createEventListener('login-error', callback),
  onRs2ClientStarted: (callback) =>
    createEventListener('rs2client-started', callback),
  onRs2ClientStopped: (callback) =>
    createEventListener('rs2client-stopped', callback),
  onShowAddAppModal: (callback) =>
    createEventListener('show-add-app-modal', () => callback()),
  onShowSettings: (callback) =>
    createEventListener('show-settings', callback),
  onOverlayReady: (callback) =>
    createEventListener('overlay-ready', () => callback()),
  onClientConnected: (callback) =>
    createEventListener('client-connected', callback),
  onClientDisconnected: (callback) =>
    createEventListener('client-disconnected', callback),
  onClientInjected: (callback) =>
    createEventListener('client-injected', callback),
  onAppsUpdated: (callback) =>
    createEventListener('apps-updated', () => callback()),

  // Hotkey management
  hotkeys: {
    getAll: (appId?: string) => ipcRenderer.invoke('hotkey:getFormattedList', appId),
    getSettings: () => ipcRenderer.invoke('hotkey:getSettings'),
    updateSettings: (updates) => ipcRenderer.invoke('hotkey:updateSettings', updates),
    isGlobalEnabled: () => ipcRenderer.invoke('hotkey:isGlobalEnabled'),
    setGlobalEnabled: (enabled: boolean) => ipcRenderer.invoke('hotkey:setGlobalEnabled', enabled),
    updateAccelerator: (hotkeyId: number, newAccelerator: string) =>
      ipcRenderer.invoke('hotkey:updateAccelerator', hotkeyId, newAccelerator),
    resetToDefault: (hotkeyId: number) => ipcRenderer.invoke('hotkey:resetToDefault', hotkeyId),
  },

  // Hotkey conflict resolution
  onHotkeyConflict: (callback) =>
    createEventListener('hotkey:show-conflict-dialog', callback),
  resolveHotkeyConflict: (response: HotkeyConflictResponse) =>
    ipcRenderer.send('hotkey:conflict-resolved', response),

  // Hotkey settings (simplified API for settings page)
  getHotkeySettings: async () => {
    const settings = await ipcRenderer.invoke('hotkey:getSettings');
    return {
      enabled: settings.globalEnabled,
      onlyWhenFocused: settings.onlyWhenRsFocused
    };
  },
  getRegisteredHotkeys: () => ipcRenderer.invoke('hotkey:getFormattedList'),
  rebindHotkey: (hotkeyId: string, newAccelerator: string) =>
    ipcRenderer.invoke('hotkey:updateAccelerator', hotkeyId, newAccelerator),
  setHotkeysEnabled: (enabled: boolean) => ipcRenderer.invoke('hotkey:setGlobalEnabled', enabled),
  setHotkeysOnlyWhenFocused: (onlyWhenFocused: boolean) =>
    ipcRenderer.invoke('hotkey:setOnlyWhenFocused', onlyWhenFocused),

  // Click regions API
  registerClickRegion: (region: ClickRegion) =>
    ipcRenderer.invoke('register-click-region', region),
  removeClickRegion: (id: number) =>
    ipcRenderer.invoke('remove-click-region', id),
  clearClickRegions: () =>
    ipcRenderer.invoke('clear-click-regions'),
  setClickInputEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('set-click-input-enabled', enabled),
  hitTestRegion: (x: number, y: number) =>
    ipcRenderer.invoke('hit-test-region', x, y),
  onClickRegionHit: (callback) =>
    createEventListener('click-region-hit', callback),

  // Font atlas API for overlay
  sendFontAtlas: (data: FontAtlasData) =>
    ipcRenderer.invoke('send-font-atlas', data),

  // Auto-update
  onUpdateAvailable: (callback) =>
    createEventListener('update-available', callback),
  onEngineUpdateProgress: (callback) =>
    createEventListener('engine-update-progress', callback),
  onUpdateDownloadProgress: (callback) =>
    createEventListener('update-download-progress', callback),
  onUpdateStatus: (callback) =>
    createEventListener('update-status', callback),
  checkForUpdate: () => ipcRenderer.invoke('updater:check'),
  applyUpdate: () => ipcRenderer.invoke('updater:apply'),

  // News & Hiscores
  getNews: () => ipcRenderer.invoke('get-news'),
  getHiscores: (playerName: string) => ipcRenderer.invoke('get-hiscores', playerName),
  getDailyInfo: () => ipcRenderer.invoke('get-daily-info'),
  onRefreshDailyInfo: (callback: () => void) => createEventListener('refresh-daily-info', callback),
  geSearch: (query: string) => ipcRenderer.invoke('ge-search', query),
  geItemInfo: (itemName: string, itemId?: number) => ipcRenderer.invoke('ge-item-info', itemName, itemId),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Toolbar profiles
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:getAll'),
    create: (name: string, settings?: ToolbarSettings) => ipcRenderer.invoke('profiles:create', name, settings),
    update: (profileId: string, updates: Partial<ToolbarSettings>) => ipcRenderer.invoke('profiles:update', profileId, updates),
    rename: (profileId: string, newName: string) => ipcRenderer.invoke('profiles:rename', profileId, newName),
    delete: (profileId: string) => ipcRenderer.invoke('profiles:delete', profileId),
    getAssignments: () => ipcRenderer.invoke('profiles:getAssignments'),
    assign: (characterId: string, profileId: string, characterName?: string) => ipcRenderer.invoke('profiles:assign', characterId, profileId, characterName),
    getForPid: (pid: number) => ipcRenderer.invoke('profiles:getForPid', pid),
    setForPid: (pid: number, profileId: string) => ipcRenderer.invoke('profiles:setForPid', pid, profileId),
  },
};

// Expose the typed API to the renderer
contextBridge.exposeInMainWorld('api', api);

// Add type declaration for window.api
declare global {
  interface Window {
    api: LauncherRendererAPI;
  }
}

console.log('[launcherPreload] Secure launcher API initialized');
