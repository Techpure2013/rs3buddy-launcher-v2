"use strict";

// src/workspace/preload.ts
var import_electron = require("electron");
var workspaceApi = {
  // Window controls
  minimize: () => import_electron.ipcRenderer.send("workspace:minimize"),
  maximize: () => import_electron.ipcRenderer.send("workspace:maximize"),
  close: () => import_electron.ipcRenderer.send("workspace:close"),
  // Game controls
  launch: () => import_electron.ipcRenderer.send("workspace:launch"),
  retry: () => import_electron.ipcRenderer.send("workspace:retry"),
  // Apps
  getApps: () => import_electron.ipcRenderer.invoke("workspace:get-apps"),
  openAppPicker: () => import_electron.ipcRenderer.send("workspace:open-app-picker"),
  launchApp: (appUrl) => import_electron.ipcRenderer.send("workspace:launch-app", { appUrl }),
  // Event listeners
  onStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("workspace:status", handler);
    return () => import_electron.ipcRenderer.removeListener("workspace:status", handler);
  },
  onEmbedded: (callback) => {
    const handler = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("workspace:embedded", handler);
    return () => import_electron.ipcRenderer.removeListener("workspace:embedded", handler);
  },
  onAppsUpdated: (callback) => {
    const handler = (_event, apps) => callback(apps);
    import_electron.ipcRenderer.on("workspace:apps-updated", handler);
    return () => import_electron.ipcRenderer.removeListener("workspace:apps-updated", handler);
  }
};
import_electron.contextBridge.exposeInMainWorld("workspaceApi", workspaceApi);
