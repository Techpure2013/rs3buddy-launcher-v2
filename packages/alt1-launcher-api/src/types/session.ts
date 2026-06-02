/**
 * Session and Configuration Type Definitions
 *
 * This module provides TypeScript types for Alt1GL Launcher sessions,
 * authentication, app configuration, and related data structures.
 */

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

// App configuration (detected paths and settings)
export interface AppConfig {
  jagexLauncherPath: string | null;
  rs2ClientPath: string | null;
  alt1glLibPath: string | null;
  startMinimized: boolean;  // Start minimized to system tray
  closeToTray: boolean;     // Close to tray instead of exiting
  toolbar?: ToolbarSettings;  // Toolbar customization settings
}

// Installed Alt1 app
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
