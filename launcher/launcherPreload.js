"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/build-config.ts
var build_config_exports = {};
__export(build_config_exports, {
  BUILD_TYPE: () => BUILD_TYPE
});
var BUILD_TYPE;
var init_build_config = __esm({
  "src/build-config.ts"() {
    "use strict";
    BUILD_TYPE = "dev";
  }
});

// src/launcher/preload.ts
var import_electron = require("electron");
function createEventListener(channel, callback) {
  const handler = (_event, data) => callback(data);
  import_electron.ipcRenderer.on(channel, handler);
  return () => import_electron.ipcRenderer.removeListener(channel, handler);
}
var api = {
  // Build info — imported from build-config.ts which is overwritten by build scripts
  isBetaBuild: (init_build_config(), __toCommonJS(build_config_exports)).BUILD_TYPE === "beta",
  // Config
  getConfig: () => import_electron.ipcRenderer.invoke("get-config"),
  // Sessions/Auth
  getSessions: () => import_electron.ipcRenderer.invoke("get-sessions"),
  openLogin: () => import_electron.ipcRenderer.invoke("open-login"),
  logout: (sessionId) => import_electron.ipcRenderer.invoke("logout", sessionId),
  // Apps
  getApps: () => import_electron.ipcRenderer.invoke("get-apps"),
  addApp: (url, displayName) => import_electron.ipcRenderer.invoke("add-app", url, displayName),
  removeApp: (configUrl) => import_electron.ipcRenderer.invoke("remove-app", configUrl),
  openApp: (app) => import_electron.ipcRenderer.send("open-app", app),
  // Injection settings
  setInjectionSettings: (settings) => import_electron.ipcRenderer.send("injection-settings-changed", settings),
  getInjectionSettings: () => import_electron.ipcRenderer.invoke("get-injection-settings"),
  // Launch
  launchRuneScape: (options) => import_electron.ipcRenderer.invoke("launch-runescape", options || {}),
  launchRuneScapeLegacy: (options) => import_electron.ipcRenderer.invoke("launch-runescape-legacy", options || {}),
  launchViaJagex: () => import_electron.ipcRenderer.invoke("launch-via-jagex"),
  testLaunch: () => import_electron.ipcRenderer.invoke("test-launch"),
  launchWorkspace: () => import_electron.ipcRenderer.send("launch-workspace"),
  // Game download
  downloadGame: () => import_electron.ipcRenderer.invoke("download-game"),
  checkGameUpdates: () => import_electron.ipcRenderer.invoke("check-game-updates"),
  getCachedGame: () => import_electron.ipcRenderer.invoke("get-cached-game"),
  onDownloadProgress: (callback) => createEventListener("download-progress", callback),
  // Jagex Launcher installation
  jagexLauncher: {
    checkInstalled: () => import_electron.ipcRenderer.invoke("jagex-launcher:check-installed"),
    isFlatpakAvailable: () => import_electron.ipcRenderer.invoke("jagex-launcher:flatpak-available"),
    getInstructions: () => import_electron.ipcRenderer.invoke("jagex-launcher:get-instructions"),
    installFlatpakSystem: () => import_electron.ipcRenderer.invoke("jagex-launcher:install-flatpak-system"),
    installFlatpak: () => import_electron.ipcRenderer.invoke("jagex-launcher:install-flatpak"),
    downloadWindows: () => import_electron.ipcRenderer.invoke("jagex-launcher:download-windows"),
    runInstaller: (installerPath) => import_electron.ipcRenderer.invoke("jagex-launcher:run-installer", installerPath),
    onInstallProgress: (callback) => createEventListener("jagex-launcher:install-progress", callback)
  },
  // Window controls
  minimizeWindow: () => import_electron.ipcRenderer.invoke("minimize-window"),
  closeWindow: () => import_electron.ipcRenderer.invoke("close-window"),
  // Path setters
  setJagexLauncherPath: (path) => import_electron.ipcRenderer.invoke("set-jagex-launcher-path", path),
  setRs2ClientPath: (path) => import_electron.ipcRenderer.invoke("set-rs2client-path", path),
  setAlt1glLibPath: (path) => import_electron.ipcRenderer.invoke("set-alt1gl-lib-path", path),
  // Startup settings
  getLaunchOnStartup: () => import_electron.ipcRenderer.invoke("get-launch-on-startup"),
  setLaunchOnStartup: (enabled) => import_electron.ipcRenderer.invoke("set-launch-on-startup", enabled),
  getStartMinimized: () => import_electron.ipcRenderer.invoke("get-start-minimized"),
  setStartMinimized: (enabled) => import_electron.ipcRenderer.invoke("set-start-minimized", enabled),
  // Connected clients
  getConnectedClients: () => import_electron.ipcRenderer.invoke("get-connected-clients"),
  // Events
  onLoginSuccess: (callback) => createEventListener("login-success", callback),
  onLoginError: (callback) => createEventListener("login-error", callback),
  onRs2ClientStarted: (callback) => createEventListener("rs2client-started", callback),
  onRs2ClientStopped: (callback) => createEventListener("rs2client-stopped", callback),
  onShowAddAppModal: (callback) => createEventListener("show-add-app-modal", () => callback()),
  onShowSettings: (callback) => createEventListener("show-settings", callback),
  onOverlayReady: (callback) => createEventListener("overlay-ready", () => callback()),
  onClientConnected: (callback) => createEventListener("client-connected", callback),
  onClientDisconnected: (callback) => createEventListener("client-disconnected", callback),
  onClientInjected: (callback) => createEventListener("client-injected", callback),
  onAppsUpdated: (callback) => createEventListener("apps-updated", () => callback()),
  // Hotkey management
  hotkeys: {
    getAll: (appId) => import_electron.ipcRenderer.invoke("hotkey:getFormattedList", appId),
    getSettings: () => import_electron.ipcRenderer.invoke("hotkey:getSettings"),
    updateSettings: (updates) => import_electron.ipcRenderer.invoke("hotkey:updateSettings", updates),
    isGlobalEnabled: () => import_electron.ipcRenderer.invoke("hotkey:isGlobalEnabled"),
    setGlobalEnabled: (enabled) => import_electron.ipcRenderer.invoke("hotkey:setGlobalEnabled", enabled),
    updateAccelerator: (hotkeyId, newAccelerator) => import_electron.ipcRenderer.invoke("hotkey:updateAccelerator", hotkeyId, newAccelerator),
    resetToDefault: (hotkeyId) => import_electron.ipcRenderer.invoke("hotkey:resetToDefault", hotkeyId)
  },
  // Hotkey conflict resolution
  onHotkeyConflict: (callback) => createEventListener("hotkey:show-conflict-dialog", callback),
  resolveHotkeyConflict: (response) => import_electron.ipcRenderer.send("hotkey:conflict-resolved", response),
  // Hotkey settings (simplified API for settings page)
  getHotkeySettings: async () => {
    const settings = await import_electron.ipcRenderer.invoke("hotkey:getSettings");
    return {
      enabled: settings.globalEnabled,
      onlyWhenFocused: settings.onlyWhenRsFocused
    };
  },
  getRegisteredHotkeys: () => import_electron.ipcRenderer.invoke("hotkey:getFormattedList"),
  rebindHotkey: (hotkeyId, newAccelerator) => import_electron.ipcRenderer.invoke("hotkey:updateAccelerator", hotkeyId, newAccelerator),
  setHotkeysEnabled: (enabled) => import_electron.ipcRenderer.invoke("hotkey:setGlobalEnabled", enabled),
  setHotkeysOnlyWhenFocused: (onlyWhenFocused) => import_electron.ipcRenderer.invoke("hotkey:setOnlyWhenFocused", onlyWhenFocused),
  // Click regions API
  registerClickRegion: (region) => import_electron.ipcRenderer.invoke("register-click-region", region),
  removeClickRegion: (id) => import_electron.ipcRenderer.invoke("remove-click-region", id),
  clearClickRegions: () => import_electron.ipcRenderer.invoke("clear-click-regions"),
  setClickInputEnabled: (enabled) => import_electron.ipcRenderer.invoke("set-click-input-enabled", enabled),
  hitTestRegion: (x, y) => import_electron.ipcRenderer.invoke("hit-test-region", x, y),
  onClickRegionHit: (callback) => createEventListener("click-region-hit", callback),
  // Font atlas API for overlay
  sendFontAtlas: (data) => import_electron.ipcRenderer.invoke("send-font-atlas", data),
  // Auto-update
  onUpdateAvailable: (callback) => createEventListener("update-available", callback),
  onEngineUpdateProgress: (callback) => createEventListener("engine-update-progress", callback),
  onUpdateDownloadProgress: (callback) => createEventListener("update-download-progress", callback),
  onUpdateStatus: (callback) => createEventListener("update-status", callback),
  checkForUpdate: () => import_electron.ipcRenderer.invoke("updater:check"),
  applyUpdate: () => import_electron.ipcRenderer.invoke("updater:apply"),
  // News & Hiscores
  getNews: () => import_electron.ipcRenderer.invoke("get-news"),
  getHiscores: (playerName) => import_electron.ipcRenderer.invoke("get-hiscores", playerName),
  getDailyInfo: () => import_electron.ipcRenderer.invoke("get-daily-info"),
  onRefreshDailyInfo: (callback) => createEventListener("refresh-daily-info", callback),
  geSearch: (query) => import_electron.ipcRenderer.invoke("ge-search", query),
  geItemInfo: (itemName, itemId) => import_electron.ipcRenderer.invoke("ge-item-info", itemName, itemId),
  openExternal: (url) => import_electron.ipcRenderer.invoke("open-external", url),
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version"),
  // Toolbar profiles
  profiles: {
    getAll: () => import_electron.ipcRenderer.invoke("profiles:getAll"),
    create: (name, settings) => import_electron.ipcRenderer.invoke("profiles:create", name, settings),
    update: (profileId, updates) => import_electron.ipcRenderer.invoke("profiles:update", profileId, updates),
    rename: (profileId, newName) => import_electron.ipcRenderer.invoke("profiles:rename", profileId, newName),
    delete: (profileId) => import_electron.ipcRenderer.invoke("profiles:delete", profileId),
    getAssignments: () => import_electron.ipcRenderer.invoke("profiles:getAssignments"),
    assign: (characterId, profileId, characterName) => import_electron.ipcRenderer.invoke("profiles:assign", characterId, profileId, characterName),
    getForPid: (pid) => import_electron.ipcRenderer.invoke("profiles:getForPid", pid),
    setForPid: (pid, profileId) => import_electron.ipcRenderer.invoke("profiles:setForPid", pid, profileId)
  }
};
import_electron.contextBridge.exposeInMainWorld("api", api);
console.log("[launcherPreload] Secure launcher API initialized");
