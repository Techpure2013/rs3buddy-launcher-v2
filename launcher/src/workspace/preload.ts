/**
 * Workspace Preload Script
 * Exposes secure IPC bridge to renderer
 */

import { contextBridge, ipcRenderer } from 'electron';

// Define the API exposed to the renderer
const workspaceApi = {
  // Window controls
  minimize: () => ipcRenderer.send('workspace:minimize'),
  maximize: () => ipcRenderer.send('workspace:maximize'),
  close: () => ipcRenderer.send('workspace:close'),

  // Game controls
  launch: () => ipcRenderer.send('workspace:launch'),
  retry: () => ipcRenderer.send('workspace:retry'),

  // Apps
  getApps: () => ipcRenderer.invoke('workspace:get-apps'),
  openAppPicker: () => ipcRenderer.send('workspace:open-app-picker'),
  launchApp: (appUrl: string) => ipcRenderer.send('workspace:launch-app', { appUrl }),

  // Event listeners
  onStatus: (callback: (data: { status: string; message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string; message: string }) => callback(data);
    ipcRenderer.on('workspace:status', handler);
    return () => ipcRenderer.removeListener('workspace:status', handler);
  },

  onEmbedded: (callback: (data: { hwnd: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { hwnd: number }) => callback(data);
    ipcRenderer.on('workspace:embedded', handler);
    return () => ipcRenderer.removeListener('workspace:embedded', handler);
  },

  onAppsUpdated: (callback: (apps: any[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, apps: any[]) => callback(apps);
    ipcRenderer.on('workspace:apps-updated', handler);
    return () => ipcRenderer.removeListener('workspace:apps-updated', handler);
  }
};

// Expose the API
contextBridge.exposeInMainWorld('workspaceApi', workspaceApi);

// Type declaration for TypeScript
declare global {
  interface Window {
    workspaceApi: typeof workspaceApi;
  }
}
