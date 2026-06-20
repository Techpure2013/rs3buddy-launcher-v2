/**
 * RS3Buddy Protocol Handler
 * Handles rs3buddy:// URLs for app installation and other actions
 *
 * Supported URLs:
 * - rs3buddy://addapp/https://example.com/appconfig.json
 * - rs3buddy://addapp/localhost:3000/appconfig.json
 */

import * as path from 'path';
import { getApp } from './electron';
import { fetchAppConfig } from './utils';
import { getInstalledApps, addApp, saveApps } from './config';
import { getMainWindow, sendToMainWindow } from './windows';

// Protocol name (without ://)
const PROTOCOL_NAME = 'rs3buddy';

// Track pending protocol URL (received before app was ready)
let pendingProtocolUrl: string | null = null;

/**
 * Register rs3buddy:// as a protocol handler
 * Must be called before app.whenReady()
 */
export function registerProtocol(): void {
  const app = getApp();

  // Try Electron's built-in registration first
  let success = false;
  if (process.defaultApp) {
    // Development mode - need to pass the script path
    if (process.argv.length >= 2) {
      const scriptPath = path.resolve(process.argv[1]);
      console.log(`[Protocol] Dev mode - registering with script: ${scriptPath}`);
      success = app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [scriptPath]);
    }
  } else {
    // Production mode
    success = app.setAsDefaultProtocolClient(PROTOCOL_NAME);
  }

  if (success) {
    console.log(`[Protocol] Registered ${PROTOCOL_NAME}:// protocol handler via Electron API`);
    return;
  }

  console.log(`[Protocol] Electron API registration failed, trying manual registry fallback...`);

  // Fallback: Manually write Windows registry entry
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');

      let command: string;
      if (process.defaultApp && process.argv.length >= 2) {
        const scriptPath = path.resolve(process.argv[1]);
        command = `"${process.execPath}" "${scriptPath}" "%1"`;
      } else {
        command = `"${process.execPath}" "%1"`;
      }

      // Create the protocol key structure
      execSync(`reg add "HKCU\\Software\\Classes\\${PROTOCOL_NAME}" /ve /d "URL:RS3Buddy Protocol" /f`, { stdio: 'ignore' });
      execSync(`reg add "HKCU\\Software\\Classes\\${PROTOCOL_NAME}" /v "URL Protocol" /d "" /f`, { stdio: 'ignore' });
      execSync(`reg add "HKCU\\Software\\Classes\\${PROTOCOL_NAME}\\shell\\open\\command" /ve /d "${command.replace(/"/g, '\\"')}" /f`, { stdio: 'ignore' });

      console.log(`[Protocol] Registered ${PROTOCOL_NAME}:// via manual registry fallback`);
      console.log(`[Protocol] Command: ${command}`);
    } catch (err) {
      console.error(`[Protocol] Manual registry fallback failed:`, err);
    }
  }
}

/**
 * Remove protocol handler registration
 */
export function unregisterProtocol(): void {
  const app = getApp();

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      const scriptPath = path.resolve(process.argv[1]);
      app.removeAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [scriptPath]);
    }
  } else {
    app.removeAsDefaultProtocolClient(PROTOCOL_NAME);
  }

  // Also try removing manual registry entry
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      execSync(`reg delete "HKCU\\Software\\Classes\\${PROTOCOL_NAME}" /f`, { stdio: 'ignore' });
    } catch {
      // Ignore - key might not exist
    }
  }

  console.log(`[Protocol] Unregistered ${PROTOCOL_NAME}:// protocol handler`);
}

/**
 * Parse an rs3buddy:// URL and extract the action and payload
 */
function parseProtocolUrl(url: string): { action: string; payload: string } | null {
  // Expected format: rs3buddy://action/payload
  // Example: rs3buddy://addapp/https://example.com/appconfig.json

  const match = url.match(/^rs3buddy:\/\/([^/]+)\/(.+)$/i);
  if (!match) {
    console.log('[Protocol] Invalid URL format:', url);
    return null;
  }

  return {
    action: match[1].toLowerCase(),
    payload: match[2]
  };
}

/**
 * Handle an rs3buddy:// URL
 */
export async function handleProtocolUrl(url: string): Promise<void> {
  console.log('[Protocol] Handling URL:', url);

  const parsed = parseProtocolUrl(url);
  if (!parsed) {
    return;
  }

  const { action, payload } = parsed;

  switch (action) {
    case 'addapp':
      await handleAddApp(payload);
      break;

    default:
      console.log('[Protocol] Unknown action:', action);
  }
}

/**
 * Handle rs3buddy://addapp/... URL
 */
async function handleAddApp(configUrl: string): Promise<void> {
  console.log('[Protocol] Adding app from:', configUrl);

  // Show and focus the main window
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }

  try {
    // Fetch the app config
    const appConfig = await fetchAppConfig(configUrl);
    const apps = getInstalledApps();

    // Check if already installed
    if (apps.find(a => a.configUrl === configUrl)) {
      console.log('[Protocol] App already installed:', appConfig.appName);
      sendToMainWindow('protocol-error', {
        action: 'addapp',
        error: `${appConfig.appName} is already installed`
      });
      return;
    }

    // Security: Require user confirmation before installing third-party apps
    const { dialog } = require('electron');
    const result = await dialog.showMessageBox(mainWindow || undefined, {
      type: 'warning',
      buttons: ['Cancel', 'Install'],
      defaultId: 0,
      cancelId: 0,
      title: 'Install Third-Party App',
      message: `Install "${appConfig.appName || 'Unknown App'}"?`,
      detail: `Source: ${configUrl}\n\nThird-party apps can access game data including screen content, overlay rendering, and GL state. Only install apps from sources you trust.`,
    });

    if (result.response !== 1) {
      console.log('[Protocol] User cancelled app installation:', appConfig.appName);
      return;
    }

    // Add the app
    addApp(appConfig);
    saveApps();

    console.log('[Protocol] App installed:', appConfig.appName);
    sendToMainWindow('protocol-app-added', {
      app: appConfig
    });

    // Refresh the apps list in the UI
    sendToMainWindow('apps-updated', {});

  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[Protocol] Failed to add app:', error);
    sendToMainWindow('protocol-error', {
      action: 'addapp',
      error: `Failed to add app: ${error}`
    });
  }
}

/**
 * Store a protocol URL to be processed after app is ready
 */
export function setPendingProtocolUrl(url: string): void {
  pendingProtocolUrl = url;
}

/**
 * Get and clear any pending protocol URL
 */
export function consumePendingProtocolUrl(): string | null {
  const url = pendingProtocolUrl;
  pendingProtocolUrl = null;
  return url;
}

/**
 * Check if a URL is an rs3buddy:// protocol URL
 */
export function isProtocolUrl(url: string): boolean {
  return url.toLowerCase().startsWith('rs3buddy://');
}

/**
 * Extract protocol URL from command line arguments
 * Windows passes the URL as the last argument when launching via protocol
 */
export function getProtocolUrlFromArgs(args: string[]): string | null {
  // Look for rs3buddy:// URL in arguments
  for (const arg of args) {
    if (isProtocolUrl(arg)) {
      return arg;
    }
  }
  return null;
}
