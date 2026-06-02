/**
 * System Tray Management
 *
 * Handles:
 * - System tray icon (Windows/Linux)
 * - Multi-client tracking
 * - Tray context menu
 * - Client status display
 */

import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';

// Re-export ConnectedClient from types (canonical definition)
export type { ConnectedClient } from './types';
import type { ConnectedClient, InstalledApp } from './types';
import { getInstalledApps, getSessions, getConfig, setConfig, saveConfig } from './config';

// Module state
let tray: Tray | null = null;
let connectedClients: Map<number, ConnectedClient> = new Map();
let nextClientId = 1;
let onShowMainWindow: (() => void) | null = null;
let onShowSettings: (() => void) | null = null;
let onQuit: (() => void) | null = null;
let onClientSelected: ((clientId: number) => void) | null = null;
let onLaunchApp: ((app: InstalledApp) => void) | null = null;
let onLogout: (() => void) | null = null;
let onLogin: (() => void) | null = null;

// Store callbacks for retry
let storedCallbacks: {
  onShowMainWindow?: () => void;
  onShowSettings?: () => void;
  onQuit?: () => void;
  onClientSelected?: (clientId: number) => void;
  onLaunchApp?: (app: InstalledApp) => void;
  onLogout?: () => void;
  onLogin?: () => void;
} | null = null;

/**
 * Initialize the system tray
 */
export function initTray(callbacks: {
  onShowMainWindow?: () => void;
  onShowSettings?: () => void;
  onQuit?: () => void;
  onClientSelected?: (clientId: number) => void;
  onLaunchApp?: (app: InstalledApp) => void;
  onLogout?: () => void;
  onLogin?: () => void;
}): void {
  storedCallbacks = callbacks;
  onShowMainWindow = callbacks.onShowMainWindow || null;
  onShowSettings = callbacks.onShowSettings || null;
  onQuit = callbacks.onQuit || null;
  onClientSelected = callbacks.onClientSelected || null;
  onLaunchApp = callbacks.onLaunchApp || null;
  onLogout = callbacks.onLogout || null;
  onLogin = callbacks.onLogin || null;

  createTrayWithRetry(3);
}

/**
 * Create tray with retry mechanism for Windows timing issues
 */
function createTrayWithRetry(maxRetries: number, attempt: number = 1): void {
  console.log(`[Tray] Creating tray (attempt ${attempt}/${maxRetries})...`);

  // Create tray icon
  const iconPath = getIconPath();
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    console.log('[Tray] Icon from path is empty, using default icon');
    icon = createDefaultIcon();
  } else {
    console.log('[Tray] Using icon from path, size:', icon.getSize());
  }

  try {
    tray = new Tray(icon);
    tray.setToolTip('RS3 Launcher Buddy - No clients connected');
    console.log('[Tray] Tray created successfully');

    // Set up context menu
    updateTrayMenu();

    // Handle click (Windows: show menu, Linux: may vary)
    tray.on('click', () => {
      if (process.platform === 'win32') {
        tray?.popUpContextMenu();
      } else {
        onShowMainWindow?.();
      }
    });

    // Handle double-click on Windows to show main window
    tray.on('double-click', () => {
      onShowMainWindow?.();
    });

    console.log('[Tray] System tray initialized');
  } catch (e) {
    console.error(`[Tray] Failed to create tray (attempt ${attempt}):`, e);

    // Retry after a delay on Windows (timing issues)
    if (attempt < maxRetries && process.platform === 'win32') {
      const delay = attempt * 500; // 500ms, 1000ms, 1500ms...
      console.log(`[Tray] Retrying in ${delay}ms...`);
      setTimeout(() => {
        createTrayWithRetry(maxRetries, attempt + 1);
      }, delay);
    } else {
      console.error('[Tray] Failed to create tray after all retries');
    }
  }
}

/**
 * Get the appropriate icon path for the platform
 */
function getIconPath(): string {
  // Try favicon.ico first (proper multi-size ICO), then PNG fallbacks
  const iconNames = process.platform === 'win32'
    ? ['favicon.ico', 'RS3QuestBuddyLauncher.png', 'icon.ico', 'icon.png']
    : ['RS3QuestBuddyLauncher.png', 'favicon.ico', 'icon.png'];

  // Try multiple locations and formats
  for (const iconName of iconNames) {
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'assets', iconName),
      path.join(__dirname, '..', 'assets', iconName),
      path.join(app.getAppPath(), 'assets', iconName),
    ];

    for (const p of possiblePaths) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          console.log('[Tray] Found icon at:', p);
          return p;
        }
      } catch {
        // Continue to next path
      }
    }
  }

  console.log('[Tray] No icon found, will use default');
  return '';
}

/**
 * Create a default icon if none found
 */
function createDefaultIcon(): Electron.NativeImage {
  // Create a simple 16x16 green circle icon
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 6;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - centerX + 0.5;
      const dy = y - centerY + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const idx = (y * size + x) * 4;

      if (dist <= radius) {
        // Green circle
        canvas[idx + 0] = 0x00;   // R
        canvas[idx + 1] = 0xDD;   // G
        canvas[idx + 2] = 0x00;   // B
        canvas[idx + 3] = 0xFF;   // A
      } else {
        // Transparent
        canvas[idx + 0] = 0x00;
        canvas[idx + 1] = 0x00;
        canvas[idx + 2] = 0x00;
        canvas[idx + 3] = 0x00;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

/**
 * Create a greyed out version of an icon
 */
function createGreyedIcon(icon: Electron.NativeImage): Electron.NativeImage {
  const size = icon.getSize();
  const bitmap = icon.toBitmap();

  // Convert to greyscale and reduce opacity
  for (let i = 0; i < bitmap.length; i += 4) {
    const r = bitmap[i];
    const g = bitmap[i + 1];
    const b = bitmap[i + 2];
    const a = bitmap[i + 3];

    // Convert to greyscale using luminance formula
    const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    bitmap[i] = grey;
    bitmap[i + 1] = grey;
    bitmap[i + 2] = grey;
    // Reduce alpha slightly for a more "inactive" look
    bitmap[i + 3] = Math.round(a * 0.6);
  }

  return nativeImage.createFromBuffer(bitmap, { width: size.width, height: size.height });
}

// Cache the icons to avoid recreating them every time
let cachedActiveIcon: Electron.NativeImage | null = null;
let cachedGreyedIcon: Electron.NativeImage | null = null;

/**
 * Update the tray context menu
 */
function updateTrayMenu(): void {
  if (!tray) return;

  const clientCount = connectedClients.size;
  const isConnected = clientCount > 0;

  // Update tray icon based on connection status (greyed when no clients)
  updateTrayIcon(isConnected);

  const statusText = clientCount === 0
    ? 'No clients connected'
    : clientCount === 1
      ? '1 client connected'
      : `${clientCount} clients connected`;

  // Check login state
  const sessions = getSessions();
  const isLoggedIn = sessions.length > 0;

  // Get installed apps
  const installedApps = getInstalledApps();

  // Build menu items
  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'RS3 Launcher Buddy',
      enabled: false,
    },
    {
      // Show connectivity status with indicator
      label: isConnected ? `● ${statusText}` : `○ ${statusText}`,
      enabled: false,
    },
    { type: 'separator' },
  ];

  // Add apps submenu if any installed
  if (installedApps.length > 0) {
    menuItems.push({
      label: 'Apps',
      submenu: installedApps.map((appConfig) => ({
        label: appConfig.displayName || appConfig.appName,
        click: () => onLaunchApp?.(appConfig),
      })),
    });
    menuItems.push({ type: 'separator' });
  }

  // Add client list if any connected
  if (clientCount > 0) {
    menuItems.push({
      label: 'Connected Clients',
      submenu: Array.from(connectedClients.values()).map((client) => ({
        label: `${client.windowTitle || `Client ${client.id}`} (PID: ${client.pid})`,
        click: () => onClientSelected?.(client.id),
      })),
    });
    menuItems.push({ type: 'separator' });
  }

  // Get current settings
  const appConfig = getConfig();

  // Standard menu items
  menuItems.push(
    {
      label: 'Open RS3 Launcher Buddy',
      click: () => onShowMainWindow?.(),
    },
    {
      label: 'Settings',
      click: () => onShowSettings?.(),
    },
    { type: 'separator' },
    {
      label: 'Close to Tray',
      type: 'checkbox',
      checked: appConfig.closeToTray,
      click: () => {
        const newValue = !appConfig.closeToTray;
        setConfig({ closeToTray: newValue });
        saveConfig();
        console.log('[Tray] Close to tray toggled:', newValue);
        updateTrayMenu();  // Refresh to update checkbox state
      },
    },
    { type: 'separator' }
  );

  // Show Login or Logout based on session state
  if (isLoggedIn) {
    // Show account info and logout option
    const accountName = sessions[0]?.accounts?.[0]?.displayName || 'Account';
    menuItems.push({
      label: `Logged in as: ${accountName}`,
      enabled: false,
    });
    menuItems.push({
      label: 'Logout',
      click: () => {
        console.log('[Tray] Logout clicked');
        onLogout?.();
      },
    });
  } else {
    menuItems.push({
      label: 'Login (Optional)',
      sublabel: 'For quick-launch feature',
      click: () => {
        console.log('[Tray] Login clicked');
        onLogin?.();
      },
    });
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => onQuit?.(),
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);

  // Update tooltip with connectivity indicator
  const tooltipIcon = isConnected ? '●' : '○';
  tray.setToolTip(`RS3 Launcher Buddy ${tooltipIcon} ${statusText}`);

  // Update tray icon based on connectivity (green dot overlay when connected)
  updateTrayIcon(isConnected);
}

/**
 * Update tray icon to show connectivity status
 * - Connected: Icon with green indicator dot
 * - Disconnected: Greyed out icon
 */
function updateTrayIcon(isConnected: boolean): void {
  if (!tray) return;

  // Initialize cached icons if needed
  if (!cachedActiveIcon) {
    const iconPath = getIconPath();
    cachedActiveIcon = iconPath ? nativeImage.createFromPath(iconPath) : null;
    if (!cachedActiveIcon || cachedActiveIcon.isEmpty()) {
      cachedActiveIcon = createDefaultIcon();
    }
  }

  if (!cachedGreyedIcon && cachedActiveIcon) {
    cachedGreyedIcon = createGreyedIcon(cachedActiveIcon);
  }

  if (isConnected) {
    // Use icon with green connectivity indicator on all platforms
    const connectedIcon = createConnectedIcon();
    if (connectedIcon && !connectedIcon.isEmpty()) {
      tray.setImage(connectedIcon);
      return;
    }
    // Fall back to normal active icon
    if (cachedActiveIcon) {
      tray.setImage(cachedActiveIcon);
    }
  } else {
    // Not connected - use greyed out icon
    if (cachedGreyedIcon) {
      tray.setImage(cachedGreyedIcon);
    }
  }
}

/**
 * Create icon with green connectivity indicator
 */
function createConnectedIcon(): Electron.NativeImage | null {
  try {
    // Try to load base icon and add green dot
    const iconPath = getIconPath();
    if (!iconPath) return null;

    const baseIcon = nativeImage.createFromPath(iconPath);
    if (baseIcon.isEmpty()) return null;

    // Get the icon as a buffer and modify it
    const size = baseIcon.getSize();
    const buffer = baseIcon.toBitmap();

    // Add a small green circle in the bottom-right corner
    const dotRadius = Math.max(3, Math.floor(size.width / 6));
    const dotX = size.width - dotRadius - 2;
    const dotY = size.height - dotRadius - 2;

    // Platform-specific pixel format:
    // Windows: BGRA
    // Linux/macOS: RGBA
    const isWindows = process.platform === 'win32';

    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const dx = x - dotX;
        const dy = y - dotY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= dotRadius) {
          const idx = (y * size.width + x) * 4;
          if (isWindows) {
            // BGRA format on Windows
            buffer[idx + 0] = 0x00;   // B
            buffer[idx + 1] = 0xDD;   // G - bright green
            buffer[idx + 2] = 0x00;   // R
            buffer[idx + 3] = 0xFF;   // A
          } else {
            // RGBA format on Linux/macOS
            buffer[idx + 0] = 0x00;   // R
            buffer[idx + 1] = 0xDD;   // G - bright green
            buffer[idx + 2] = 0x00;   // B
            buffer[idx + 3] = 0xFF;   // A
          }
        }
      }
    }

    return nativeImage.createFromBuffer(buffer, { width: size.width, height: size.height });
  } catch (e) {
    console.log('[Tray] Failed to create connected icon:', e);
    return null;
  }
}

/**
 * Refresh the tray menu (call when apps list changes)
 */
export function refreshTrayMenu(): void {
  updateTrayMenu();
}

/**
 * Register a new connected client
 */
export function registerClient(
  pid: number,
  windowTitle: string = 'RuneScape',
  characterId?: string,
  characterName?: string
): ConnectedClient {
  // Check if this PID is already registered
  for (const client of connectedClients.values()) {
    if (client.pid === pid) {
      console.log(`[Tray] Client with PID ${pid} already registered as ID ${client.id}`);
      // Update character info if provided
      if (characterId) {
        client.characterId = characterId;
        client.characterName = characterName;
      }
      return client;
    }
  }

  const client: ConnectedClient = {
    id: nextClientId++,
    pid,
    windowTitle,
    connectedAt: Date.now(),
    ipcChannel: `alt1gl-${pid}`,
    characterId,
    characterName,
  };

  connectedClients.set(client.id, client);
  updateTrayMenu();

  console.log(`[Tray] Client registered: ID=${client.id}, PID=${pid}, Channel=${client.ipcChannel}, Character=${characterName || characterId || 'unknown'}`);

  return client;
}

/**
 * Check if a character is already playing (to prevent duplicate sessions)
 */
export function isCharacterPlaying(characterId: string): ConnectedClient | undefined {
  for (const client of connectedClients.values()) {
    if (client.characterId === characterId) {
      return client;
    }
  }
  return undefined;
}

/**
 * Update character info for an existing client
 */
export function updateClientCharacter(clientId: number, characterId: string, characterName?: string): void {
  const client = connectedClients.get(clientId);
  if (client) {
    client.characterId = characterId;
    client.characterName = characterName;
    console.log(`[Tray] Client ${clientId} character updated: ${characterName || characterId}`);
  }
}

/**
 * Unregister a disconnected client
 */
export function unregisterClient(clientId: number): void {
  const client = connectedClients.get(clientId);
  if (client) {
    connectedClients.delete(clientId);
    updateTrayMenu();
    console.log(`[Tray] Client unregistered: ID=${clientId}, PID=${client.pid}`);
  }
}

/**
 * Unregister client by PID (useful when process exits)
 */
export function unregisterClientByPid(pid: number): void {
  for (const [id, client] of connectedClients) {
    if (client.pid === pid) {
      unregisterClient(id);
      return;
    }
  }
}

/**
 * Get a client by ID
 */
export function getClient(clientId: number): ConnectedClient | undefined {
  return connectedClients.get(clientId);
}

/**
 * Get client by PID
 */
export function getClientByPid(pid: number): ConnectedClient | undefined {
  for (const client of connectedClients.values()) {
    if (client.pid === pid) return client;
  }
  return undefined;
}

/**
 * Get all connected clients
 */
export function getConnectedClients(): ConnectedClient[] {
  return Array.from(connectedClients.values());
}

/**
 * Get the number of connected clients
 */
export function getClientCount(): number {
  return connectedClients.size;
}

/**
 * Update client window title (e.g., when character name is detected)
 */
export function updateClientTitle(clientId: number, windowTitle: string): void {
  const client = connectedClients.get(clientId);
  if (client) {
    client.windowTitle = windowTitle;
    updateTrayMenu();
  }
}

/**
 * Update client injection status
 */
export function updateClientInjected(pid: number, injected: boolean): void {
  for (const client of connectedClients.values()) {
    if (client.pid === pid) {
      client.injected = injected;
      updateTrayMenu();
      return;
    }
  }
}

/**
 * Destroy the tray
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
    console.log('[Tray] System tray destroyed');
  }
}

/**
 * Check if tray is initialized
 */
export function isTrayInitialized(): boolean {
  return tray !== null;
}

/**
 * Reinitialize tray if it's not showing
 * Call this if the user reports the tray icon is missing
 */
export function reinitializeTray(): boolean {
  console.log('[Tray] Reinitializing tray...');

  // Destroy existing tray if any
  if (tray) {
    try {
      tray.destroy();
    } catch (e) {
      console.log('[Tray] Error destroying old tray:', e);
    }
    tray = null;
  }

  // Recreate with stored callbacks
  if (storedCallbacks) {
    createTrayWithRetry(3);
    return true;
  } else {
    console.error('[Tray] No stored callbacks, cannot reinitialize');
    return false;
  }
}
