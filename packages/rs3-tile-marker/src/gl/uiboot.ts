/**
 * RS3 Tile Marker - Electron Main Process
 * Handles window creation and native addon integration
 */

import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;

// Check if a URL was passed as argument (for dev mode)
const devUrl = process.argv[2];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: "RS3 Tile Marker",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    resizable: true,
    backgroundColor: "#1a1a2e",
  });

  if (devUrl && devUrl.startsWith("http")) {
    // Dev mode: load from webpack dev server
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load the built HTML file
    const indexPath = path.join(__dirname, "index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC handlers for player position updates from GL hooks
ipcMain.handle("get-player-position", async () => {
  // This will be connected to the native addon for live position
  // For now, return null to indicate no position available
  try {
    // TODO: Integrate with patchrs_napi.ts for live position
    return null;
  } catch {
    return null;
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
