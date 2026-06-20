// OAuth Configuration
export interface OAuthConfig {
  clientId: string;
  origin: string;
  authApi: string;
  profileApi: string;
  redirectUri: string;
  scope: string;
  consentClientId: string;
  consentRedirectUri: string;
}

// OAuth Tokens from token exchange
export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Linked RuneScape account/character
export interface GameAccount {
  accountId: string;
  displayName: string;
  // Additional fields that may be present
  userHash?: string;
}

// Stored session with credentials
export interface Session {
  id: string;
  tokens: AuthTokens;
  consentIdToken: string;  // The consent id_token used for getting game sessions
  sessionId: string;  // JX_SESSION_ID for game launch
  accounts: GameAccount[];
  createdAt: number;
}

// Session data returned to renderer (without sensitive tokens)
export interface SessionInfo {
  id: string;
  accounts: GameAccount[];
  createdAt: number;
}

// Toolbar settings (persisted)
export interface ToolbarSettings {
  posX: number;
  posY: number;
  themeIndex: number;       // 0=Dark, 1=RuneScape, 2=Transparent, 3=TheGwafa, 4=TheNadayanayme
  layoutIndex: number;      // 0=Compact, 1=Normal, 2=Comfortable
  locked: boolean;
  autoHide: boolean;
  autoHideExpandMode: number; // 0=Hover, 1=Click
  hotkeysEnabled: boolean;
  scale: number;
  opacity: number;
}

/** A named toolbar profile containing its own ToolbarSettings */
export interface ToolbarProfile {
  id: string;           // UUID, stable identifier
  name: string;         // User-facing name ("Main", "Alt", "Skiller")
  settings: ToolbarSettings;
  createdAt: number;
}

/** Persisted profile assignments by character ID (survives restarts) */
export interface ProfileAssignment {
  characterId: string;     // RS character ID (stable across sessions)
  characterName?: string;  // Display name for UI
  profileId: string;       // Which profile to use
}

// App configuration (detected paths and settings)
export interface InjectionSettings {
  overlay: boolean;   // Inject overlay.dll (toolbar, IPC pipe)
  glHooks: boolean;   // Inject injected.dll (GL capture, render recording)
  autoInject: boolean; // Auto-inject on game launch
}

export interface AppConfig {
  jagexLauncherPath: string | null;
  rs2ClientPath: string | null;
  rs3buddyLibPath: string | null;
  startMinimized: boolean;  // Start minimized to system tray
  closeToTray: boolean;     // Close to tray instead of exiting
  toolbar?: ToolbarSettings;  // Toolbar customization settings
  toolbarProfiles?: ToolbarProfile[];       // Named profiles
  profileAssignments?: ProfileAssignment[]; // Character -> Profile mapping
  injectionSettings?: InjectionSettings;    // DLL injection preferences
}

// Installed RS3Buddy app
export interface InstalledApp {
  appName: string;
  displayName?: string;  // Optional custom display name (e.g., "AfkWarden (Dev)" or "AfkWarden (Prod)")
  description?: string;
  appUrl: string;
  configUrl: string;
  iconUrl?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

// Result types for IPC operations
export interface SuccessResult<T = void> {
  success: true;
  data?: T;
}

export interface ErrorResult {
  success: false;
  error: string;
}

export type Result<T = void> = SuccessResult<T> | ErrorResult;

// Launch options
export interface LaunchOptions {
  sessionIndex?: number;
  characterId?: string | null;
}

// Environment variables for game launch
export interface GameEnv extends NodeJS.ProcessEnv {
  JX_SESSION_ID?: string;
  JX_CHARACTER_ID?: string;
  JX_DISPLAY_NAME?: string;
  RS3BUDDY_DLL_PATH?: string;
  LD_PRELOAD?: string;
}

// JWT payload (decoded from id_token)
export interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
  [key: string]: unknown;
}

// Sessions API response
export interface SessionsApiResponse {
  sessionId: string;
}

// Connected client state (from tray.ts)
export interface ConnectedClient {
  id: number;           // Unique client ID
  pid: number;          // Process ID
  windowTitle: string;  // Window title (e.g., "RuneScape")
  connectedAt: number;  // Timestamp
  ipcChannel: string;   // Named pipe name for this client
  injected?: boolean;   // Whether overlay is injected
  characterId?: string; // Character ID (to prevent duplicate sessions)
  characterName?: string; // Character display name
}

// Window tracking callback info
export interface WindowInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameWindowInfo extends WindowInfo {
  hwnd: number;
  pid: number;
  title: string;
}

export type WindowTrackingCallback = (info: GameWindowInfo | null) => void;

// ============================================================================
// Hotkey System Types
// ============================================================================

// Focus state for hotkey system
export interface FocusState {
  isRsFocused: boolean;
  rsWindowTitle: string | null;
  rsPid: number | null;
  allowGlobalOverride: boolean;
  lastChecked: number;
}

// Persisted hotkey configuration
export interface HotkeyConfig {
  id: string;                    // UUID, stable across restarts
  appId: string;
  accelerator: string;           // Current accelerator
  defaultAccelerator: string;    // Original accelerator for reset
  action: string;
  enabled: boolean;
  description?: string;
}

// Settings for entire hotkey system
export interface HotkeysSettings {
  globalEnabled: boolean;
  onlyWhenRsFocused: boolean;
  registeredHotkeys: HotkeyConfig[];
}

// Formatted hotkey for UI display
export interface FormattedHotkey {
  id: string;
  displayAccelerator: string;
  action: string;
  appName: string;
  enabled: boolean;
  isDefault: boolean;
  description?: string;
}

// Conflict detection result
export interface ConflictInfo {
  hasConflict: boolean;
  conflictingHotkeys: Array<{
    id: number;
    appId: string;
    accelerator: string;
    action: string;
  }>;
}

// ============================================================================
// Toolbar IPC Types - Strictly typed for security
// ============================================================================

/** Channels sent FROM main TO toolbar renderer */
export interface ToolbarMainToRenderer {
  'toolbar:game-connected': GameWindowInfo;
  'toolbar:game-disconnected': void;
  'toolbar:injection-status': { success: boolean; message: string };
  'toolbar:position-update': WindowInfo;
}

/** Channels sent FROM toolbar renderer TO main */
export interface ToolbarRendererToMain {
  'toolbar:open-app-picker': void;
  'toolbar:launch-app': { appId: string; appUrl: string };
  'toolbar:close': void;
  'toolbar:minimize': void;
}

/** Invoke channels (renderer -> main with return value) */
export interface ToolbarInvokeChannels {
  'toolbar:get-game-info': GameWindowInfo | null;
  'toolbar:is-game-running': boolean;
  'toolbar:get-injection-status': { injected: boolean; pid: number | null };
  'toolbar:get-apps': InstalledApp[];
}

// Type helpers
export type ToolbarReceiveChannel = keyof ToolbarMainToRenderer;
export type ToolbarSendChannel = keyof ToolbarRendererToMain;
export type ToolbarInvokeChannel = keyof ToolbarInvokeChannels;

// ============================================================================
// Main Window IPC Types
// ============================================================================

// Hotkey conflict resolution request
export interface HotkeyConflictRequest {
  requestId: string;
  appName: string;
  originalAccelerator: string;
  conflictingAppName: string;
  alternativeSuggestion: {
    accelerator: string;
    modifiers: string;
  } | null;
}

// Hotkey conflict resolution response
export interface HotkeyConflictResponse {
  requestId: string;
  accepted: boolean;
  useAlternative: boolean;
  openSettings: boolean;
}

/** Channels sent FROM main TO main renderer */
export interface MainToRenderer {
  'game:started': { pid: number };
  'game:stopped': void;
  'game:injection-complete': { success: boolean };
  'download-progress': { message: string; progress?: number };
  'login-success': { session: SessionInfo };
  'login-error': { error: string };
  'session-logged-out': { sessionId: string };
  'show-add-app-modal': void;
  'show-settings': void;
  'hotkey:show-conflict-dialog': HotkeyConflictRequest;
}

export type MainReceiveChannel = keyof MainToRenderer;

// ============================================================================
// Preload API Types (exposed to renderer via contextBridge)
// ============================================================================

/** Typed API exposed to toolbar renderer */
export interface ToolbarAPI {
  send<K extends ToolbarSendChannel>(
    channel: K,
    data?: ToolbarRendererToMain[K]
  ): void;

  on<K extends ToolbarReceiveChannel>(
    channel: K,
    callback: (data: ToolbarMainToRenderer[K]) => void
  ): () => void;

  invoke<K extends ToolbarInvokeChannel>(
    channel: K
  ): Promise<ToolbarInvokeChannels[K]>;

  removeAllListeners(channel: ToolbarReceiveChannel): void;
}

/** Typed API exposed to main window renderer */
export interface LauncherAPI {
  // Config
  getConfig(): Promise<AppConfig>;

  // Sessions
  getSessions(): Promise<SessionInfo[]>;
  openLogin(): Promise<Result>;
  logout(sessionId: string): Promise<Result>;

  // Apps
  getApps(): Promise<InstalledApp[]>;
  addApp(url: string): Promise<Result>;
  removeApp(configUrl: string): Promise<Result>;

  // Game
  launchGame(options?: LaunchOptions): Promise<Result>;
  isGameRunning(): Promise<boolean>;
  getGamePid(): Promise<number | null>;

  // Toolbar
  showToolbar(): void;
  hideToolbar(): void;

  // Window
  minimize(): void;
  close(): void;

  // Events
  on<K extends MainReceiveChannel>(
    channel: K,
    callback: (data: MainToRenderer[K]) => void
  ): () => void;

  removeAllListeners(channel: MainReceiveChannel): void;
}

// Global window augmentation
declare global {
  interface Window {
    toolbarAPI?: ToolbarAPI;
    launcherAPI?: LauncherAPI;
  }
}

// ============================================
// News Feed Types
// ============================================

export interface NewsItem {
  title: string;
  category: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl: string | null;
  guid: string;
}

// ============================================
// Hiscores Types
// ============================================

export interface PlayerSkills {
  rank: number;
  totalLevel: number;
  attack: number;
  defence: number;
  strength: number;
  constitution: number;
  range: number;
  prayer: number;
  magic: number;
  cooking: number;
  woodcutting: number;
  fletching: number;
  fishing: number;
  firemaking: number;
  crafting: number;
  smithing: number;
  mining: number;
  herblore: number;
  agility: number;
  thieving: number;
  slayer: number;
  farming: number;
  runecrafting: number;
  hunter: number;
  construction: number;
  summoning: number;
  dungeoneering: number;
  divination: number;
  invention: number;
  archaeology: number;
  necromancy: number;
}
