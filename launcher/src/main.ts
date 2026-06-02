/**
 * RS3 Launcher Buddy - Main Process Entry Point
 * TypeScript version 2.0
 *
 * This launcher uses a native OpenGL overlay library for the in-game toolbar,
 * not Electron overlay windows.
 */

// Direct electron import for main process entry point
// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron');
const { app, BrowserWindow, protocol, net } = electron;
import * as path from 'path';
import * as fs from 'fs';

import type { BrowserWindow as BrowserWindowType } from 'electron';
import { initDataDir, detectPaths, getConfig, saveConfig, getSessions, removeSession, saveCredentials, saveClientState, loadClientState, removeClientState, cleanupStaleClientStates } from './config';
import { setProcessCallbacks, startProcessMonitor, stopProcessMonitor, getPendingLaunch, clearPendingLaunch, getAllRs2ClientPids, setAutoInject, setUseOverlay, doesOverlayPipeExist, markPidInjected } from './game';
import { cleanupLegacyDllCopies, tryConnectToExistingClient, injectIntoProcess, isInjected, isInjectedPid, reconnectToOverlay } from './inject';
import {
  createMainWindow,
  getMainWindow,
  sendToMainWindow,
  initWorkspaceIpc,
  initAppWindowIpc,
  onGameStarted,
  onGameStopped,
  destroyOverlay,
  silentDestroyOverlay,
  createAppWindow,
  minimizeAllAppWindows,
  restoreAllAppWindows
} from './windows';
import { initIpcHandlers, initAuthCallbacks } from './ipc';
import {
  initTray,
  destroyTray,
  registerClient,
  unregisterClientByPid,
  getClientCount,
  getClientByPid,
  updateClientInjected,
  refreshTrayMenu
} from './tray';
import { openLoginWindow, setLoginCallbacks } from './auth';
import {
  registerProtocol,
  handleProtocolUrl,
  getProtocolUrlFromArgs,
  isProtocolUrl
} from './protocol';
import { cleanup as cleanupHotkeys, setGlobalEnabled, initHotkeyPersistence } from './hotkeys';
import { startFocusPolling, stopFocusPolling, onFocusChange, getFocusState } from './focus';
import { getHotkeysSettings } from './config';
import { initAutoUpdater } from './updater';
import { addonManager } from './addon/addon-manager';
import { registerAddonIpcHandlers, shutdownAddonIpc } from './addon/ipc-handlers';

// Version marker
console.log('=== RS3 Launcher Buddy ===');

// Set app name for proper Linux desktop integration
// This must be done before app.whenReady()
if (process.platform === 'linux') {
  // Set the app name to match the WM_CLASS expected by the .desktop file
  // The .desktop file uses StartupWMClass=rs3-launcher-buddy
  // This, combined with --class=rs3-launcher-buddy in the start script, ensures
  // the dock/taskbar correctly associates the window with the .desktop entry
  app.name = 'rs3-launcher-buddy';
  app.setName('rs3-launcher-buddy');

  // Set the desktop filename hint for GNOME
  // This helps GNOME find the correct .desktop file
  if (typeof app.setDesktopName === 'function') {
    app.setDesktopName('rs3-launcher-buddy.desktop');
  }
}

// Register alt1:// protocol handler early (before app.whenReady)
registerProtocol();

// Register alt1-builtin:// protocol for serving built-in app files
// Must be done before app.whenReady() for scheme privileges
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'alt1-builtin',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

// Make this a single-instance app so protocol URLs are forwarded to existing instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit
  console.log('[Main] Another instance is running, quitting...');
  app.quit();
} else {
  // Handle second instance (protocol URL from another launch)
  app.on('second-instance', (_event: Electron.Event, commandLine: string[], _workingDirectory: string) => {
    console.log('[Main] Second instance detected, command line:', commandLine);

    // Look for alt1:// URL in command line
    const protocolUrl = getProtocolUrlFromArgs(commandLine);
    if (protocolUrl) {
      console.log('[Main] Protocol URL from second instance:', protocolUrl);
      handleProtocolUrl(protocolUrl);
    }

    // Focus the main window
    const mainWin = getMainWindow();
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  });
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error(error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

// Main window reference
let mainWindow: BrowserWindowType | null = null;

// Track if we're actually quitting vs just closing windows
let isQuitting = false;

// Initialize the application
function initialize(): void {
  // Initialize data directory and load saved data
  initDataDir();

  // Clean up any old DLL copies from build directory (legacy location)
  // This helps prevent node-gyp rebuild issues
  cleanupLegacyDllCopies();

  // Check if we should start minimized
  const config = getConfig();
  const shouldStartMinimized = config.startMinimized;
  console.log('[Main] Start minimized setting:', shouldStartMinimized);

  // Create the main window
  mainWindow = createMainWindow();

  // Hide window if start minimized is enabled
  if (shouldStartMinimized && mainWindow) {
    console.log('[Main] Starting minimized to tray');
    mainWindow.hide();
  }

  // Make main window minimize to tray or exit based on closeToTray setting
  mainWindow?.on('close', (event) => {
    const currentConfig = getConfig();
    console.log('[Main] Window close event, isQuitting:', isQuitting, 'closeToTray:', currentConfig.closeToTray);

    if (!isQuitting) {
      if (currentConfig.closeToTray !== false) {
        // Close to tray - hide window but keep running (default behavior)
        console.log('[Main] Hiding to tray instead of closing');
        event.preventDefault();
        mainWindow?.hide();
      } else {
        // Actually quit the application
        console.log('[Main] closeToTray is false, quitting app');
        isQuitting = true;
        app.quit();
      }
    }
  });

  // Initialize system tray
  initTray({
    onShowMainWindow: () => {
      mainWindow?.show();
      mainWindow?.focus();
    },
    onShowSettings: () => {
      mainWindow?.show();
      mainWindow?.focus();
      // Send message to renderer to show settings tab
      sendToMainWindow('show-settings', {});
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
    onClientSelected: (clientId) => {
      console.log(`[Main] Client selected: ${clientId}`);
      // TODO: Could focus/bring that client's game window to front
    },
    onLaunchApp: (appConfig) => {
      console.log(`[Main] Launching app from tray: ${appConfig.appName}`);
      createAppWindow(appConfig);
    },
    onLogin: () => {
      console.log('[Main] Login requested from tray');
      if (mainWindow) {
        openLoginWindow(mainWindow);
      }
    },
    onLogout: () => {
      console.log('[Main] Logout requested from tray');
      const sessions = getSessions();
      if (sessions.length > 0) {
        // Remove first session (primary account)
        removeSession(sessions[0].id);
        saveCredentials();
        refreshTrayMenu();
        // Notify the main window
        sendToMainWindow('session-logged-out', { sessionId: sessions[0].id });
      }
    }
  });

  // Detect game paths
  detectPaths();

  // Set up IPC handlers
  initIpcHandlers();

  // Set up auth callbacks
  initAuthCallbacks();

  // Initialize workspace IPC handlers
  initWorkspaceIpc(() => getMainWindow());

  // Initialize app window IPC handlers
  initAppWindowIpc();

  // Initialize the addon manager (loads native addon, starts state polling)
  // and register IPC handlers for isolated preload windows
  addonManager.init();
  registerAddonIpcHandlers();

  // Load saved injection settings from config and apply BEFORE game detection starts
  const ipcMain = require('electron').ipcMain;
  try {
    const savedConfig = getConfig();
    const injSettings = (savedConfig as any).injectionSettings;
    if (injSettings) {
      const enabled = injSettings.autoInject ?? false;
      setAutoInject(enabled);
      setUseOverlay(injSettings.overlay ?? enabled);
      console.log('[Main] Loaded injection settings from config:', { enabled, overlay: injSettings.overlay });
    } else {
      // No saved settings — default to OFF (user must explicitly enable)
      setAutoInject(false);
      setUseOverlay(false);
      console.log('[Main] No injection settings found — defaulting to OFF');
    }
  } catch (e) {
    console.log('[Main] Could not load injection settings:', e);
    setAutoInject(false);
    setUseOverlay(false);
  }

  // Listen for injection settings changes from renderer (single consolidated handler)
  ipcMain.on('injection-settings-changed', (_event: any, settings: { enabled?: boolean; overlay: boolean; glHooks: boolean; autoInject: boolean }) => {
    const enabled = settings.enabled ?? settings.autoInject;
    setAutoInject(enabled);
    setUseOverlay(enabled);
    console.log('[Main] GL Overlay:', enabled ? 'ENABLED' : 'DISABLED');

    // Persist to config (was previously in ipc.ts — now consolidated here)
    try {
      const config = getConfig();
      (config as any).injectionSettings = { overlay: enabled, glHooks: enabled, autoInject: enabled };
      saveConfig();
    } catch (e) {
      console.error('[Main] Failed to save injection settings:', e);
    }

    // If just enabled, immediately inject/reconnect all existing RS clients
    if (enabled) {
      const pids = getAllRs2ClientPids();
      for (const pid of pids) {
        // Per-PID check — don't skip other PIDs just because one is injected
        if (isInjectedPid(pid)) {
          console.log('[Main] PID already injected, skipping:', pid);
          continue;
        }

        // Mark PID to prevent process monitor from racing us
        markPidInjected(pid);

        // Check if overlay pipe exists (DLL already loaded from previous session)
        if (doesOverlayPipeExist(pid)) {
          console.log('[Main] Overlay pipe found for PID:', pid, '— reconnecting to shared memory');
          try {
            const reconnected = reconnectToOverlay(pid);
            console.log('[Main] Reconnect result for PID:', pid, reconnected);
            if (reconnected) {
              onGameStarted(pid);
            }
          } catch (e) {
            console.error('[Main] Reconnect failed for PID:', pid, e);
          }
          continue;
        }

        // Fresh injection
        console.log('[Main] GL Overlay enabled — injecting into RS client PID:', pid);
        try {
          const success = injectIntoProcess(pid, true);
          if (success) {
            console.log('[Main] Injection succeeded for PID:', pid);
            onGameStarted(pid);
          }
        } catch (e) {
          console.error('[Main] Injection failed for PID:', pid, e);
        }
      }
    }
  });

  // Track current game PID for injection callback
  let currentGamePid = 0;

  // Set up game process callbacks
  setProcessCallbacks(
    (pid: number) => {
      console.log('RuneScape started, PID:', pid);
      currentGamePid = pid;

      // Get pending launch info (character that was being launched)
      const pendingLaunch = getPendingLaunch();
      let characterId = pendingLaunch?.characterId;
      let characterName = pendingLaunch?.characterName;

      // Clear the pending launch - we're associating it with this PID now
      clearPendingLaunch();

      // If no pending launch (e.g. launcher restarted while game running),
      // check persisted client state for this PID
      if (!characterId) {
        const persisted = loadClientState(pid);
        if (persisted) {
          characterId = persisted.characterId;
          characterName = persisted.characterName;
          console.log(`[Main] Restored character from persisted state: ${characterName || characterId}`);
        }
      }

      // Register this client in the tray with character info
      const client = registerClient(pid, 'RuneScape', characterId, characterName);
      console.log(`[Main] Client registered: ID=${client.id}, Character: ${characterName || 'unknown'}, Total clients: ${getClientCount()}`);

      // Persist PID-to-character mapping for launcher restart recovery
      if (characterId) {
        saveClientState(pid, characterId, characterName);
      }

      // Send both legacy event and new client event
      sendToMainWindow('rs2client-started', { pid, clientId: client.id });
      sendToMainWindow('client-connected', { client });
      // NOTE: Don't configure overlay here - wait for injection to complete
      // The DLL injection happens 2 seconds after detection
    },
    (pid?: number) => {
      console.log('RuneScape stopped, PID:', pid);

      // Get client info before unregistering
      const client = pid ? getClientByPid(pid) : undefined;
      const clientId = client?.id;

      // Unregister this client from the tray
      if (pid) {
        unregisterClientByPid(pid);
        console.log(`[Main] Client unregistered, remaining clients: ${getClientCount()}`);
      }

      // Remove persisted client state for this PID
      if (pid) {
        removeClientState(pid);
      }

      currentGamePid = 0;
      sendToMainWindow('rs2client-stopped', { pid });
      if (clientId !== undefined) {
        sendToMainWindow('client-disconnected', { clientId, pid });
      }
      onGameStopped(pid);
    },
    (success: boolean, pid?: number) => {
      // Injection complete callback - NOW configure the overlay
      const targetPid = pid || currentGamePid;
      console.log('[Main] DLL injection complete for PID:', targetPid, success ? 'SUCCESS' : 'FAILED');
      console.log('[Main] Injection timestamp:', new Date().toISOString());

      // Update client injection status
      if (targetPid > 0) {
        updateClientInjected(targetPid, success);
        const client = getClientByPid(targetPid);
        if (client) {
          sendToMainWindow('client-injected', {
            clientId: client.id,
            pid: targetPid,
            success
          });
        }
      }

      if (success && targetPid > 0) {
        // Verify shared memory was actually established before configuring overlay.
        // If memoryid was undefined, the DLL loaded but communication isn't ready —
        // calling onGameStarted would trigger native API calls against invalid memory → crash.
        const injState = require('./inject').getInjectionStateForPid(targetPid);
        if (injState && (injState.memoryId === 0 || injState.memoryId == null)) {
          console.warn('[Main] Injection succeeded but shared memory not established for PID:', targetPid);
          console.warn('[Main] Skipping overlay configuration — will retry via reconnect');
          // Schedule a reconnect attempt after DLL has had time to fully initialize
          setTimeout(() => {
            try {
              console.log('[Main] Attempting delayed reconnect for PID:', targetPid);
              const reconnected = reconnectToOverlay(targetPid);
              if (reconnected) {
                console.log('[Main] Delayed reconnect succeeded, configuring overlay now');
                onGameStarted(targetPid);
              } else {
                console.warn('[Main] Delayed reconnect failed for PID:', targetPid);
              }
            } catch (e) {
              console.error('[Main] Delayed reconnect error:', e);
            }
          }, 5000);
        } else {
          console.log('[Main] Injection succeeded, waiting 1 second for overlay DLL to initialize...');
          setTimeout(() => {
            console.log('[Main] Now configuring native overlay for PID:', targetPid);
            onGameStarted(targetPid);
          }, 1000);
        }
      }
    }
  );

  // Clean up stale client states (PIDs that closed while launcher was down)
  cleanupStaleClientStates(getAllRs2ClientPids());

  // Start the process monitor to detect any RuneScape clients
  // This runs regardless of how the client was launched (through launcher or externally)
  console.log('[Main] Starting process monitor for RuneScape client detection');
  startProcessMonitor();

  // Start focus polling for hotkey system
  startFocusPolling();

  // Connect focus changes to hotkey system
  onFocusChange((state) => {
    const settings = getHotkeysSettings();
    if (settings.onlyWhenRsFocused) {
      setGlobalEnabled(state.isRsFocused || state.allowGlobalOverride);
    }

    // Minimize/restore app windows with the RS client.
    // Don't minimize if an app window or the launcher itself is focused —
    // only minimize when a completely unrelated window takes focus.
    if (state.isRsFocused) {
      restoreAllAppWindows();
    } else {
      // Check if any of our own windows are focused
      const BrowserWindow = require('electron').BrowserWindow;
      const focused = BrowserWindow.getFocusedWindow();
      if (!focused) {
        // No Electron window focused — user switched to a different app
        minimizeAllAppWindows();
      }
      // If one of our windows is focused, don't minimize anything
    }
  });

  // Restore persisted hotkeys
  initHotkeyPersistence();

  // Immediate focus sync — shortcuts start disabled if RS isn't focused
  const settings = getHotkeysSettings();
  if (settings.onlyWhenRsFocused) {
    const currentFocus = getFocusState();
    setGlobalEnabled(currentFocus.isRsFocused || currentFocus.allowGlobalOverride);
  }

  // Try to connect to an existing RS client that has overlay loaded (Linux)
  // This allows restarting the launcher without restarting the game
  if (process.platform !== 'win32') {
    console.log('[Main] Checking for existing RS client with overlay...');
    tryConnectToExistingClient().then(pid => {
      if (pid) {
        console.log(`[Main] Auto-connected to existing RS client (PID: ${pid})`);
        sendToMainWindow('game-status', { running: true, pid });
      }
    }).catch(err => {
      console.log('[Main] Error checking for existing client:', err);
    });
  }
}

// App ready handler
app.whenReady().then(() => {
  if (!gotTheLock) return;
  initialize();

  // Register alt1-builtin:// protocol handler to serve built-in app files
  // URL format: alt1-builtin://app-name/path/to/file
  // Example: alt1-builtin://rs3-tile-marker/index.html
  protocol.handle('alt1-builtin', async (request: { url: string }) => {
    const url = new URL(request.url);
    const appName = url.hostname;  // e.g., "rs3-tile-marker"
    const filePath = url.pathname; // e.g., "/index.html"

    // Determine base path for the app's built files
    let builtinAppsPath: string;
    if (app.isPackaged) {
      // Production: use resources/builtin-apps/<app-name>
      builtinAppsPath = path.join(process.resourcesPath, 'builtin-apps', appName);
    } else {
      // Development: __dirname is launcher/dist/, so go up to launcher/ then to packages/
      const launcherDir = path.join(__dirname, '..');
      const packagesPath = path.join(launcherDir, '..', 'packages', appName, 'dist');
      const builtinPath = path.join(launcherDir, 'builtin-apps', appName);

      // Prefer packages/<app>/dist if it exists, otherwise fall back to builtin-apps/<app>
      builtinAppsPath = fs.existsSync(packagesPath) ? packagesPath : builtinPath;
    }

    const fullPath = path.join(builtinAppsPath, filePath);
    console.log(`[Protocol] alt1-builtin://${appName}${filePath} -> ${fullPath}`);

    // Security: ensure the path is within the builtin-apps directory
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(path.normalize(builtinAppsPath))) {
      console.error('[Protocol] Path traversal attempt blocked:', fullPath);
      return new Response('Forbidden', { status: 403 });
    }

    // Convert to proper file:// URL (handles Windows paths with drive letters)
    let fileUrl: string;
    if (process.platform === 'win32') {
      // Windows: C:\path\to\file -> file:///C:/path/to/file
      fileUrl = `file:///${normalizedPath.replace(/\\/g, '/')}`;
    } else {
      // Linux/Mac: /path/to/file -> file:///path/to/file
      fileUrl = `file://${normalizedPath}`;
    }

    const response = await net.fetch(fileUrl);
    // Disable caching in development so rebuilds take effect immediately
    if (!app.isPackaged) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      headers.set('Pragma', 'no-cache');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  });

  console.log('[Protocol] Registered alt1-builtin:// file protocol handler');

  // Check if launched with a protocol URL
  const protocolUrl = getProtocolUrlFromArgs(process.argv);
  if (protocolUrl) {
    console.log('[Main] Launched with protocol URL:', protocolUrl);
    // Delay slightly to ensure window is ready
    setTimeout(() => handleProtocolUrl(protocolUrl), 500);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });

  // macOS: Handle protocol URL when app is already running
  app.on('open-url', (event: Electron.Event, url: string) => {
    event.preventDefault();
    console.log('[Main] open-url event:', url);
    if (isProtocolUrl(url)) {
      handleProtocolUrl(url);
    }
  });

  // Check for updates after startup
  initAutoUpdater();
});

// Window all closed handler - don't quit, stay in tray
app.on('window-all-closed', () => {
  // Don't quit - Alt1GL runs in the system tray
  // Only quit on macOS if isQuitting is true
  if (process.platform === 'darwin' && isQuitting) {
    app.quit();
  }
  // On Windows/Linux, we stay running in the tray
});

// Before quit handler - need to do async cleanup before actually quitting
let cleanupInProgress = false;

app.on('before-quit', async (event: Electron.Event) => {
  // If cleanup already done, allow quit
  if (cleanupInProgress) {
    console.log('[Main] Cleanup already in progress, allowing quit');
    return;
  }

  // Prevent quit until cleanup is done
  event.preventDefault();
  cleanupInProgress = true;
  isQuitting = true;

  // Safety timeout - force exit if cleanup takes too long
  const forceExitTimer = setTimeout(() => {
    console.error('[Main] Cleanup timed out after 5 seconds, forcing exit');
    app.exit(1);
  }, 5000);

  console.log('[Main] ========================================');
  console.log('[Main] Before quit - starting full cleanup...');
  console.log('[Main] Timestamp:', new Date().toISOString());

  stopProcessMonitor();
  console.log('[Main] Process monitor stopped');

  stopFocusPolling();
  console.log('[Main] Focus polling stopped');

  try {
    // === Silent Disconnect (NO Shutdown, NO DLL ejection) ===
    // Just close the IPC socket without sending any message.
    // The DLL detects the broken pipe, resets, and keeps listening for new connections.
    // Toolbar and hotkeys stay active in the game. When the launcher restarts,
    // it can reconnect to the existing overlay via the pipe.
    console.log('[Main] Silently disconnecting overlay IPC (no Shutdown sent)...');
    silentDestroyOverlay();
    console.log('[Main] Overlay IPC disconnected (DLL keeps running, pipe ready for reconnect)');
  } catch (e) {
    console.error('[Main] Overlay cleanup error:', e);
  }

  destroyTray();
  console.log('[Main] Tray destroyed');

  cleanupHotkeys();
  console.log('[Main] Hotkeys cleaned up');

  shutdownAddonIpc();
  addonManager.shutdown();
  console.log('[Main] Addon IPC and manager shut down');

  console.log('[Main] Cleanup complete, quitting...');
  console.log('[Main] ========================================');
  // Clear timeout and force immediate exit without re-triggering event handlers
  clearTimeout(forceExitTimer);
  app.exit(0);
});

// Export for testing
export { mainWindow };
