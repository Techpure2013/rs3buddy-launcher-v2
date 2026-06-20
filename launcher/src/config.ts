import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AppConfig, Session, InstalledApp, OAuthConfig, ToolbarSettings, HotkeysSettings, ToolbarProfile, ProfileAssignment } from './types';
import { getApp, getSafeStorage } from './electron';

// OAuth Configuration
export const OAUTH_CONFIG: OAuthConfig = {
  clientId: 'com_jagex_auth_desktop_launcher',
  origin: 'https://account.jagex.com',
  authApi: 'https://auth.jagex.com/game-session/v1',
  profileApi: 'https://secure.jagex.com/rs-profile/v1',
  redirectUri: 'https://secure.runescape.com/m=weblogin/launcher-redirect',
  scope: 'openid offline gamesso.token.create user.profile.read',
  consentClientId: '1fddee4e-b100-4f4e-b2b0-097f9088f9d2',
  consentRedirectUri: 'http://localhost'
};

// Data directories (initialized after app ready)
let dataDir: string | null = null;
let credsFile: string | null = null;
let appsFile: string | null = null;
let configFile: string | null = null;
let hotkeysFile: string | null = null;
let clientStatesFile: string | null = null;

// Default toolbar settings
const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
  posX: 10,
  posY: 10,
  themeIndex: 0,        // Dark
  layoutIndex: 0,       // Compact
  locked: false,
  autoHide: false,
  autoHideExpandMode: 0, // Hover
  hotkeysEnabled: true,
  scale: 1.0,
  opacity: 0.95
};

// Default hotkeys settings
const DEFAULT_HOTKEYS_SETTINGS: HotkeysSettings = {
  globalEnabled: true,
  onlyWhenRsFocused: true,
  registeredHotkeys: []
};

// Built-in apps shown in the launcher: HTTP-hosted web apps that consume the
// rs3buddy-api HTTP engine. (The in-engine alert monitor is part of the engine
// itself — not a launcher app — so it is not listed here.)
// BUILD_TYPE is set by build scripts (see build-config.ts)
import { BUILD_TYPE } from './build-config';
const IS_BETA_BUILD = BUILD_TYPE === 'beta';

// NOTE (rs3buddy-launcher-v2): the old patchrs-based local builtin apps
// (alt1-builtin://...) were removed — they depended on the stripped native and
// are being replaced by new apps that consume the rs3buddy-api HTTP engine.
// Only HTTP-hosted web apps remain. New apps get added here as they are built.
const HTTP_APPS: InstalledApp[] = [
  // Sentinel — AFK-Warden-style alert monitor. A web app built entirely on the
  // rs3buddy SDK (fetches the engine on :4400; draws the in-game overlay via the
  // API). DEV: serve apps/monitor on :3100 (from rs3buddy-api:
  //   npx serve -l 3100 apps/monitor
  // ). RELEASE: host it (e.g. techpure.dev) and swap the URLs below.
  {
    appName: 'Sentinel',
    displayName: 'Sentinel — Alert Monitor',
    description: 'AFK-Warden-style alert monitor built on the rs3buddy SDK.',
    appUrl: 'http://localhost:3100/index.html',
    configUrl: 'http://localhost:3100/appconfig.json',
    defaultWidth: 460,
    defaultHeight: 640,
    minWidth: 360,
    minHeight: 420,
  },
];

// BETA and ALL builds currently expose the same HTTP app list (no local builtins).
const BETA_APPS: InstalledApp[] = HTTP_APPS;
const ALL_APPS: InstalledApp[] = HTTP_APPS;

const BUILT_IN_APPS: InstalledApp[] = IS_BETA_BUILD ? BETA_APPS : ALL_APPS;

// Runtime state
let sessions: Session[] = [];
let installedApps: InstalledApp[] = [];
let config: AppConfig = {
  jagexLauncherPath: null,
  rs2ClientPath: null,
  alt1glLibPath: null,
  startMinimized: false,
  closeToTray: true,  // Default to closing to tray (stay running)
  toolbar: { ...DEFAULT_TOOLBAR_SETTINGS }
};
let hotkeysSettings: HotkeysSettings = { ...DEFAULT_HOTKEYS_SETTINGS };

// Initialize data directory
export function initDataDir(): void {
  dataDir = path.join(getApp().getPath('userData'), 'alt1gl');
  credsFile = path.join(dataDir, 'credentials.json');
  appsFile = path.join(dataDir, 'apps.json');
  configFile = path.join(dataDir, 'config.json');
  hotkeysFile = path.join(dataDir, 'hotkeys.json');
  clientStatesFile = path.join(dataDir, 'client-states.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  loadCredentials();
  loadApps();
  loadConfig();
  loadHotkeysSettings();
}

// Load stored credentials (supports both encrypted and legacy plaintext)
function loadCredentials(): void {
  try {
    if (!credsFile || !fs.existsSync(credsFile)) return;

    const safeStorage = getSafeStorage();
    const raw = fs.readFileSync(credsFile);

    // Try encrypted format first: encrypted files start with non-printable bytes
    if (safeStorage.isEncryptionAvailable() && raw.length > 0 && raw[0] !== 0x5B /* '[' */) {
      try {
        const decrypted = safeStorage.decryptString(raw);
        sessions = JSON.parse(decrypted);
        return;
      } catch {
        // Not encrypted or decryption failed - fall through to plaintext
      }
    }

    // Legacy plaintext JSON (starts with '[')
    const text = raw.toString('utf-8');
    sessions = JSON.parse(text);

    // Migrate: re-save as encrypted if possible
    if (safeStorage.isEncryptionAvailable()) {
      console.log('[Config] Migrating credentials to encrypted storage');
      saveCredentials();
    }
  } catch (e) {
    console.error('Failed to load credentials:', e);
    sessions = [];
  }
}

// Save credentials (encrypted with OS keychain when available)
export function saveCredentials(): void {
  try {
    if (!credsFile) return;

    const json = JSON.stringify(sessions);
    const safeStorage = getSafeStorage();

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(json);
      fs.writeFileSync(credsFile, encrypted);
    } else {
      // Fallback to plaintext if OS keychain unavailable (e.g. headless Linux)
      fs.writeFileSync(credsFile, JSON.stringify(sessions, null, 2));
    }
  } catch (e) {
    console.error('Failed to save credentials:', e);
  }
}

// Load installed apps
function loadApps(): void {
  try {
    console.log('[Config] Loading apps from:', appsFile);
    if (appsFile && fs.existsSync(appsFile)) {
      const data = fs.readFileSync(appsFile, 'utf-8');
      installedApps = JSON.parse(data);
      console.log('[Config] Loaded', installedApps.length, 'apps:', installedApps.map(a => a.appName));
    } else {
      console.log('[Config] Apps file does not exist:', appsFile);
    }
  } catch (e) {
    console.error('Failed to load apps:', e);
    installedApps = [];
  }
}

// Save apps
export function saveApps(): void {
  try {
    if (appsFile) {
      fs.writeFileSync(appsFile, JSON.stringify(installedApps, null, 2));
    }
  } catch (e) {
    console.error('Failed to save apps:', e);
  }
}

// Load config settings
function loadConfig(): void {
  try {
    console.log('[Config] Loading config from:', configFile);
    if (configFile && fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf-8');
      const saved = JSON.parse(data);
      // Merge saved toolbar settings with defaults
      const savedToolbar = saved.toolbar || {};
      const toolbar = { ...DEFAULT_TOOLBAR_SETTINGS, ...savedToolbar };
      // Merge saved settings with defaults (preserving detected paths)
      config = {
        ...config,
        ...saved,
        toolbar,
        toolbarProfiles: saved.toolbarProfiles || [],
        profileAssignments: saved.profileAssignments || [],
      };
      console.log('[Config] Loaded config:', {
        startMinimized: config.startMinimized,
        closeToTray: config.closeToTray,
        toolbar: config.toolbar
      });
    } else {
      console.log('[Config] Config file does not exist:', configFile);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

// Save config settings
export function saveConfig(): void {
  try {
    if (configFile) {
      // Only save user-configurable settings, not detected paths
      const toSave = {
        startMinimized: config.startMinimized,
        closeToTray: config.closeToTray,
        toolbar: config.toolbar,
        toolbarProfiles: config.toolbarProfiles,
        profileAssignments: config.profileAssignments,
        injectionSettings: config.injectionSettings,
      };
      fs.writeFileSync(configFile, JSON.stringify(toSave, null, 2));
    }
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// Get toolbar settings
export function getToolbarSettings(): ToolbarSettings {
  return config.toolbar || { ...DEFAULT_TOOLBAR_SETTINGS };
}

// Update toolbar settings (partial update)
export function updateToolbarSettings(updates: Partial<ToolbarSettings>): void {
  config.toolbar = { ...(config.toolbar || DEFAULT_TOOLBAR_SETTINGS), ...updates };
  saveConfig();
}

// ============================================
// Toolbar Profile Management
// ============================================

/** Ensure profiles array is persisted (materializes virtual default if needed) */
function ensureProfilesPersisted(): ToolbarProfile[] {
  if (!config.toolbarProfiles || config.toolbarProfiles.length === 0) {
    config.toolbarProfiles = [{
      id: 'default',
      name: 'Default',
      settings: getToolbarSettings(),
      createdAt: Date.now()
    }];
  }
  return config.toolbarProfiles;
}

/** Get all toolbar profiles. Always includes at least a "Default" profile. */
export function getToolbarProfiles(): ToolbarProfile[] {
  const profiles = config.toolbarProfiles || [];
  if (profiles.length === 0) {
    // Auto-create default profile from current settings
    return [{
      id: 'default',
      name: 'Default',
      settings: getToolbarSettings(),
      createdAt: Date.now()
    }];
  }
  return profiles;
}

/** Get a specific profile by ID */
export function getToolbarProfile(profileId: string): ToolbarProfile | undefined {
  return getToolbarProfiles().find(p => p.id === profileId);
}

/** Create a new toolbar profile */
export function createToolbarProfile(name: string, settings?: ToolbarSettings): ToolbarProfile {
  const { randomUUID } = require('crypto');
  const profile: ToolbarProfile = {
    id: randomUUID(),
    name,
    settings: settings ? { ...settings } : { ...DEFAULT_TOOLBAR_SETTINGS },
    createdAt: Date.now()
  };

  if (!config.toolbarProfiles) {
    config.toolbarProfiles = [];
  }
  config.toolbarProfiles.push(profile);
  saveConfig();
  return profile;
}

/** Update a profile's settings */
export function updateToolbarProfile(profileId: string, updates: Partial<ToolbarSettings>): boolean {
  const profiles = ensureProfilesPersisted();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;

  profile.settings = { ...profile.settings, ...updates };
  saveConfig();
  return true;
}

/** Rename a profile */
export function renameToolbarProfile(profileId: string, newName: string): boolean {
  const profiles = ensureProfilesPersisted();
  const profile = profiles.find(p => p.id === profileId);
  if (!profile) return false;

  profile.name = newName;
  saveConfig();
  return true;
}

/** Delete a profile (cannot delete if it's the last one) */
export function deleteToolbarProfile(profileId: string): boolean {
  const profiles = ensureProfilesPersisted();
  if (profiles.length <= 1) return false;
  const idx = profiles.findIndex(p => p.id === profileId);
  if (idx === -1) return false;

  profiles.splice(idx, 1);
  // Also remove any assignments pointing to this profile
  if (config.profileAssignments) {
    config.profileAssignments = config.profileAssignments.filter(a => a.profileId !== profileId);
  }
  saveConfig();
  return true;
}

/** Get profile assignments */
export function getProfileAssignments(): ProfileAssignment[] {
  return config.profileAssignments || [];
}

/** Assign a character to a profile */
export function assignProfileToCharacter(characterId: string, profileId: string, characterName?: string): void {
  if (!config.profileAssignments) {
    config.profileAssignments = [];
  }
  // Remove existing assignment for this character
  config.profileAssignments = config.profileAssignments.filter(a => a.characterId !== characterId);
  config.profileAssignments.push({ characterId, profileId, characterName });
  saveConfig();
}

/** Get the profile ID assigned to a character (or null for default) */
export function getProfileForCharacter(characterId: string): string | null {
  const assignment = (config.profileAssignments || []).find(a => a.characterId === characterId);
  return assignment?.profileId || null;
}

/** Get toolbar settings for a specific profile ID (falls back to default) */
export function getToolbarSettingsForProfile(profileId: string | null): ToolbarSettings {
  if (!profileId) return getToolbarSettings();
  const profile = getToolbarProfile(profileId);
  return profile?.settings || getToolbarSettings();
}

// Get data directory path
export function getDataDir(): string {
  if (!dataDir) {
    throw new Error('Data directory not initialized. Call initDataDir() first.');
  }
  return dataDir;
}

// Getters and setters
export function getSessions(): Session[] {
  return sessions;
}

export function setSessions(newSessions: Session[]): void {
  sessions = newSessions;
}

export function addSession(session: Session): void {
  sessions.push(session);
}

export function removeSession(sessionId: string): boolean {
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions.splice(index, 1);
    return true;
  }
  return false;
}

export function getInstalledApps(): InstalledApp[] {
  // Beta build: only show built-in beta apps, no user-installed apps
  if (IS_BETA_BUILD) {
    return [...BUILT_IN_APPS];
  }
  // Dev/Editor build: merge built-in apps with user-installed apps
  // Built-in apps come first, then user-installed apps
  // Avoid duplicates by checking configUrl
  const allApps = [...BUILT_IN_APPS];
  for (const app of installedApps) {
    if (!allApps.find(a => a.configUrl === app.configUrl)) {
      allApps.push(app);
    }
  }
  return allApps;
}

export function addApp(appConfig: InstalledApp): void {
  installedApps.push(appConfig);
}

export function removeApp(configUrl: string): boolean {
  const index = installedApps.findIndex(a => a.configUrl === configUrl);
  if (index !== -1) {
    installedApps.splice(index, 1);
    return true;
  }
  return false;
}

export function getConfig(): AppConfig {
  return config;
}

export function setConfig(newConfig: Partial<AppConfig>): void {
  config = { ...config, ...newConfig };
}

// Helper to recursively search for a file in directories
function findFileInDirs(dirs: string[], filename: string, maxDepth: number = 3): string | null {
  const searchDir = (dir: string, depth: number): string | null => {
    if (depth > maxDepth) return null;
    try {
      if (!fs.existsSync(dir)) return null;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
          return fullPath;
        }
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const found = searchDir(fullPath, depth + 1);
          if (found) return found;
        }
      }
    } catch {
      // Ignore errors (permission denied, etc.)
    }
    return null;
  };

  for (const dir of dirs) {
    const found = searchDir(dir, 0);
    if (found) return found;
  }
  return null;
}

// Check if a Flatpak app is installed
function isFlatpakAppInstalled(appId: string): boolean {
  try {
    const { execSync } = require('child_process');
    const output = execSync(`flatpak list --app 2>/dev/null | grep -i "${appId}"`, { encoding: 'utf-8', stdio: 'pipe' });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

// Find Jagex Launcher
export function findJagexLauncher(): string | null {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    const possiblePaths = [
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Jagex Launcher', 'JagexLauncher.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Jagex Launcher', 'JagexLauncher.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Jagex Launcher', 'JagexLauncher.exe'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    const searchDirs = [
      process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
      process.env.PROGRAMFILES || 'C:\\Program Files',
      process.env.LOCALAPPDATA || ''
    ].filter(Boolean);

    return findFileInDirs(searchDirs, 'JagexLauncher.exe', 3);
  } else {
    const home = os.homedir();

    // Check for Flatpak installation first
    if (isFlatpakAppInstalled('com.jagex.Launcher')) {
      return 'flatpak run com.jagex.Launcher';
    }

    const possiblePaths = [
      path.join(home, '.var/app/com.jagex.Launcher/data/jagex-launcher/jagex-launcher'),
      '/opt/jagex-launcher/jagex-launcher',
      path.join(home, '.local/bin/jagex-launcher'),
      '/usr/bin/jagex-launcher',
      '/usr/local/bin/jagex-launcher'
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    const searchDirs = [
      path.join(home, '.local/share'),
      path.join(home, '.var/app'),
      '/opt',
      '/usr/local/share'
    ];

    return findFileInDirs(searchDirs, 'jagex-launcher', 4);
  }
}

// Find RS2 Client
export function findRs2Client(): string | null {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    const possiblePaths = [
      'C:\\ProgramData\\Jagex\\launcher\\rs2client.exe',
      path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Jagex', 'launcher', 'rs2client.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Jagex', 'launcher', 'rs2client.exe'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    const searchDirs = [
      process.env.PROGRAMDATA || 'C:\\ProgramData',
      process.env.LOCALAPPDATA || '',
      process.env.APPDATA || ''
    ].filter(Boolean);

    return findFileInDirs(searchDirs, 'rs2client.exe', 4);
  } else {
    const home = os.homedir();

    // Check Flatpak data directory first - game is downloaded by Jagex Launcher
    // The rs2client binary is inside ~/.var/app/com.jagex.Launcher/data/
    const flatpakPaths = [
      path.join(home, '.var/app/com.jagex.Launcher/data/jagex-launcher/games/rs2client'),
      path.join(home, '.var/app/com.jagex.Launcher/data/jagex-launcher/games/RuneScape/rs2client'),
    ];

    for (const p of flatpakPaths) {
      if (fs.existsSync(p)) return p;
    }

    // Check for Flatpak games directory existence (game not downloaded yet)
    const flatpakGamesDir = path.join(home, '.var/app/com.jagex.Launcher/data/jagex-launcher/games');
    if (fs.existsSync(flatpakGamesDir)) {
      // Flatpak is installed but game hasn't been downloaded yet - that's okay
      // Return a placeholder indicating Flatpak installation exists
      return '(via Jagex Launcher Flatpak)';
    }

    const possiblePaths = [
      path.join(home, '.local/share/jagex-launcher/games/rs2client'),
      path.join(home, '.steam/steam/steamapps/compatdata/1343400/pfx/drive_c/ProgramData/Jagex/launcher/rs2client.exe'),
      path.join(home, '.local/share/Steam/steamapps/compatdata/1343400/pfx/drive_c/ProgramData/Jagex/launcher/rs2client.exe'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    const searchDirs = [
      path.join(home, '.var/app'),
      path.join(home, '.local/share'),
      path.join(home, '.steam')
    ];

    return findFileInDirs(searchDirs, 'rs2client', 5) || findFileInDirs(searchDirs, 'rs2client.exe', 5);
  }
}

// Find Alt1GL Library
export function findAlt1glLib(): string | null {
  const isWindows = process.platform === 'win32';
  const libName = isWindows ? 'injected.dll' : 'injected.so';

  // Check bundled path first (in packaged app)
  const bundledPath = path.join(process.resourcesPath || __dirname, 'lib', libName);
  if (fs.existsSync(bundledPath)) return bundledPath;

  // Check development paths - the library is built in the project root's build directory
  // __dirname in development is launcher/dist, so we need to go up to the project root
  const projectRoot = path.resolve(__dirname, '..', '..');
  const launcherRoot = path.resolve(__dirname, '..');

  const buildPaths = [
    // Project root build directory (where native addons are built)
    path.join(projectRoot, 'build', 'Release', libName),
    // Launcher's own build directory
    path.join(launcherRoot, 'build', 'Release', libName),
    // Alternative locations
    path.join(projectRoot, 'out', 'Release', libName),
    path.join(__dirname, 'lib', libName),
    // Absolute fallback for development
    '/home/techpure/Desktop/Alt1Launcher/build/Release/injected.so',
  ];

  for (const p of buildPaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

// Initialize config with detected paths
export function detectPaths(): void {
  config.jagexLauncherPath = findJagexLauncher();
  config.rs2ClientPath = findRs2Client();
  config.alt1glLibPath = findAlt1glLib();

  console.log('Detected paths:');
  console.log('  Jagex Launcher:', config.jagexLauncherPath || 'Not found');
  console.log('  RS2 Client:', config.rs2ClientPath || 'Not found');
  console.log('  Alt1GL Lib:', config.alt1glLibPath || 'Not found');
}

// Load hotkeys settings
function loadHotkeysSettings(): void {
  try {
    console.log('[Config] Loading hotkeys settings from:', hotkeysFile);
    if (hotkeysFile && fs.existsSync(hotkeysFile)) {
      const data = fs.readFileSync(hotkeysFile, 'utf-8');
      const saved = JSON.parse(data);
      hotkeysSettings = { ...DEFAULT_HOTKEYS_SETTINGS, ...saved };
      console.log('[Config] Loaded hotkeys settings:', {
        globalEnabled: hotkeysSettings.globalEnabled,
        onlyWhenRsFocused: hotkeysSettings.onlyWhenRsFocused,
        hotkeyCount: hotkeysSettings.registeredHotkeys.length
      });
    } else {
      console.log('[Config] Hotkeys settings file does not exist, using defaults');
    }
  } catch (e) {
    console.error('Failed to load hotkeys settings:', e);
    hotkeysSettings = { ...DEFAULT_HOTKEYS_SETTINGS };
  }
}

// Save hotkeys settings
export function saveHotkeysSettings(): void {
  try {
    if (hotkeysFile) {
      fs.writeFileSync(hotkeysFile, JSON.stringify(hotkeysSettings, null, 2));
      console.log('[Config] Saved hotkeys settings');
    }
  } catch (e) {
    console.error('Failed to save hotkeys settings:', e);
  }
}

// Get hotkeys settings
export function getHotkeysSettings(): HotkeysSettings {
  return { ...hotkeysSettings };
}

// Update hotkeys settings (partial update)
export function updateHotkeysSettings(updates: Partial<HotkeysSettings>): void {
  hotkeysSettings = { ...hotkeysSettings, ...updates };
  saveHotkeysSettings();
}

// Update a specific hotkey config in the registered list
export function updateHotkeyConfig(id: string, updates: Partial<import('./types').HotkeyConfig>): boolean {
  const index = hotkeysSettings.registeredHotkeys.findIndex(hk => hk.id === id);
  if (index === -1) return false;

  hotkeysSettings.registeredHotkeys[index] = {
    ...hotkeysSettings.registeredHotkeys[index],
    ...updates
  };
  saveHotkeysSettings();
  return true;
}

// Add a new hotkey config
export function addHotkeyConfig(config: import('./types').HotkeyConfig): void {
  // Remove any existing with same ID
  hotkeysSettings.registeredHotkeys = hotkeysSettings.registeredHotkeys.filter(hk => hk.id !== config.id);
  hotkeysSettings.registeredHotkeys.push(config);
  saveHotkeysSettings();
}

// Remove a hotkey config
export function removeHotkeyConfig(id: string): boolean {
  const initialLength = hotkeysSettings.registeredHotkeys.length;
  hotkeysSettings.registeredHotkeys = hotkeysSettings.registeredHotkeys.filter(hk => hk.id !== id);
  if (hotkeysSettings.registeredHotkeys.length !== initialLength) {
    saveHotkeysSettings();
    return true;
  }
  return false;
}

// Get a specific hotkey config by ID
export function getHotkeyConfig(id: string): import('./types').HotkeyConfig | undefined {
  return hotkeysSettings.registeredHotkeys.find(hk => hk.id === id);
}

// ============================================
// Client State Persistence (PID -> Character mapping)
// ============================================

interface PersistedClientState {
  characterId: string;
  characterName?: string;
  connectedAt: number;
}

/** Save a PID-to-character mapping (called when client is registered with character info) */
export function saveClientState(pid: number, characterId: string, characterName?: string): void {
  try {
    if (!clientStatesFile) return;
    let states: Record<string, PersistedClientState> = {};
    if (fs.existsSync(clientStatesFile)) {
      states = JSON.parse(fs.readFileSync(clientStatesFile, 'utf-8'));
    }
    states[String(pid)] = { characterId, characterName, connectedAt: Date.now() };
    fs.writeFileSync(clientStatesFile, JSON.stringify(states, null, 2));
    console.log(`[Config] Saved client state: PID ${pid} -> ${characterName || characterId}`);
  } catch (e) {
    console.error('[Config] Failed to save client state:', e);
  }
}

/** Load persisted character info for a PID (called on launcher restart when rediscovering clients) */
export function loadClientState(pid: number): { characterId: string; characterName?: string } | null {
  try {
    if (!clientStatesFile || !fs.existsSync(clientStatesFile)) return null;
    const states: Record<string, PersistedClientState> = JSON.parse(fs.readFileSync(clientStatesFile, 'utf-8'));
    const state = states[String(pid)];
    if (state) {
      console.log(`[Config] Loaded client state: PID ${pid} -> ${state.characterName || state.characterId}`);
      return { characterId: state.characterId, characterName: state.characterName };
    }
    return null;
  } catch (e) {
    console.error('[Config] Failed to load client state:', e);
    return null;
  }
}

/** Remove a PID's state (called when client stops) */
export function removeClientState(pid: number): void {
  try {
    if (!clientStatesFile || !fs.existsSync(clientStatesFile)) return;
    const states: Record<string, PersistedClientState> = JSON.parse(fs.readFileSync(clientStatesFile, 'utf-8'));
    if (states[String(pid)]) {
      delete states[String(pid)];
      fs.writeFileSync(clientStatesFile, JSON.stringify(states, null, 2));
      console.log(`[Config] Removed client state for PID ${pid}`);
    }
  } catch (e) {
    console.error('[Config] Failed to remove client state:', e);
  }
}

/** Clean up stale entries (PIDs that no longer exist). Call on startup. */
export function cleanupStaleClientStates(activePids: number[]): void {
  try {
    if (!clientStatesFile || !fs.existsSync(clientStatesFile)) return;
    const states: Record<string, PersistedClientState> = JSON.parse(fs.readFileSync(clientStatesFile, 'utf-8'));
    const activeSet = new Set(activePids.map(String));
    let changed = false;
    for (const pid of Object.keys(states)) {
      if (!activeSet.has(pid)) {
        console.log(`[Config] Cleaning up stale client state for PID ${pid}`);
        delete states[pid];
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(clientStatesFile, JSON.stringify(states, null, 2));
    }
  } catch (e) {
    console.error('[Config] Failed to cleanup stale client states:', e);
  }
}
