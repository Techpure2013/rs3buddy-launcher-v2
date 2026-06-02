/**
 * Window API types for Alt1 Launcher app windows
 * @module window
 */

/**
 * API for controlling the app window
 */
export interface AppWindowAPI {
  /**
   * Close the app window
   */
  close(): void;

  /**
   * Get the window title
   * @returns Promise resolving to the window title
   */
  getTitle(): Promise<string>;

  /**
   * Get the game process ID, or null if not connected
   * @returns Promise resolving to the PID or null
   */
  getGamePid(): Promise<number | null>;
}

/**
 * Window position and size information
 */
export interface WindowInfo {
  /** X coordinate of the window */
  x: number;
  /** Y coordinate of the window */
  y: number;
  /** Width of the window */
  width: number;
  /** Height of the window */
  height: number;
}

/**
 * Game window information including handle and process details
 */
export interface GameWindowInfo extends WindowInfo {
  /** Window handle (HWND on Windows) */
  hwnd: number;
  /** Process ID of the game */
  pid: number;
  /** Window title */
  title: string;
}

/**
 * Get the app window API or null if not available
 * @returns The app window API if available, otherwise null
 */
export function getAppWindow(): AppWindowAPI | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any).appWindowApi || null;
}

/**
 * Require app window API - throws if not available
 * @returns The app window API
 * @throws {Error} If the app window API is not available
 */
export function requireAppWindow(): AppWindowAPI {
  const api = getAppWindow();
  if (!api) {
    throw new Error('App window API is not available. This function can only be called from within an Alt1 app window.');
  }
  return api;
}
