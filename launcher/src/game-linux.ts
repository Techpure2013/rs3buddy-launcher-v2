/**
 * Linux-specific game launch module
 * Uses LD_PRELOAD to load the overlay library instead of DLL injection
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig, getSessions } from './config';
import { refreshTokensIfNeeded } from './auth';
import { isCharacterPlaying } from './tray';
import { getApp } from './electron';
import { ensureLinuxDependencies, getLibraryDir } from './download';
import type { Result, GameEnv, LaunchOptions } from './types';

// Get the overlay library paths for LD_PRELOAD
// Returns both injected.so (GL hooks/shared memory) and overlay.so (toolbar) if found
export function getOverlayLibraryPaths(): string[] {
  const app = getApp();
  const isPackaged = app.isPackaged;

  let basePaths: string[];

  if (isPackaged) {
    const resourcesPath = path.join(path.dirname(app.getPath('exe')), 'resources', 'lib');
    basePaths = [resourcesPath];
  } else {
    const projectRoot = path.resolve(__dirname, '..', '..');
    basePaths = [
      // Check lib.target first (where gyp puts shared libraries)
      path.join(projectRoot, 'build', 'Release', 'lib.target'),
      path.join(projectRoot, 'build', 'Debug', 'lib.target'),
      path.join(projectRoot, '..', 'build', 'Release', 'lib.target'),
      path.join(projectRoot, '..', 'build', 'Debug', 'lib.target'),
      // Also check Release/Debug directly as fallback
      path.join(projectRoot, 'build', 'Release'),
      path.join(projectRoot, 'build', 'Debug'),
      path.join(projectRoot, '..', 'build', 'Release'),
      path.join(projectRoot, '..', 'build', 'Debug')
    ];
  }

  const foundLibs: string[] = [];

  // Only load overlay.so - it will internally load injected.so
  // Loading both via LD_PRELOAD causes conflicts
  // overlay.so: toolbar overlay + loads injected.so for GL hooks
  const requiredLibs = ['overlay.so'];

  for (const basePath of basePaths) {
    for (const libName of requiredLibs) {
      const libPath = path.join(basePath, libName);
      if (fs.existsSync(libPath) && !foundLibs.includes(libPath)) {
        console.log('[Linux] Found library:', libPath);
        foundLibs.push(libPath);
      }
    }
  }

  if (foundLibs.length === 0) {
    console.log('[Linux] No overlay libraries found in paths:', basePaths);
  }

  return foundLibs;
}

// Legacy function for compatibility
export function getOverlayLibraryPath(): string | null {
  const paths = getOverlayLibraryPaths();
  return paths.length > 0 ? paths[0] : null;
}

// Check if RuneScape is running on Linux
export function isRuneScapeRunning(): boolean {
  try {
    // Only look for rs2client - the actual game client
    // Don't match 'runescape' as that's just the launcher/updater process
    // The [r] bracket trick prevents pgrep from matching itself
    const output = execSync('pgrep -f "[r]s2client"', { encoding: 'utf-8' });
    return output.trim().length > 0;
  } catch {
    // pgrep returns non-zero if no processes found
    return false;
  }
}

// Get all RS2 Client PIDs on Linux
export function getAllRs2ClientPids(): number[] {
  try {
    // Only look for rs2client - the actual game client
    // The [r] bracket trick prevents pgrep from matching itself
    const output = execSync('pgrep -f "[r]s2client"', { encoding: 'utf-8' });
    const pids = output.trim().split('\n').filter(p => p.length > 0);
    return pids.map(p => parseInt(p));
  } catch {
    return [];
  }
}

// Get RS2 Client PID on Linux (backwards compatibility - returns first PID)
export function getRs2ClientPid(): number | null {
  const pids = getAllRs2ClientPids();
  return pids.length > 0 ? pids[0] : null;
}

// Check if the overlay Unix socket exists
export function doesOverlaySocketExist(pid: number): boolean {
  const socketPath = `/tmp/alt1gl-overlay-${pid}`;
  return fs.existsSync(socketPath);
}

// Check if the overlay shared memory exists (injected.so is loaded)
export function isOverlayLoaded(pid: number): boolean {
  const shmPath = `/dev/shm/alt1link_${pid}`;
  return fs.existsSync(shmPath);
}

// Check if the GL server instance is ready (fully initialized)
export function isGlServerReady(pid: number): boolean {
  const instPath = `/dev/shm/alt1link_${pid}_inst_1`;
  return fs.existsSync(instPath);
}

// Find a running RS client that already has the overlay loaded
export function findOverlayConnectedClient(): { pid: number; ready: boolean } | null {
  const pid = getRs2ClientPid();
  if (!pid) return null;

  const loaded = isOverlayLoaded(pid);
  if (!loaded) return null;

  const ready = isGlServerReady(pid);
  return { pid, ready };
}

// Launch RuneScape on Linux with LD_PRELOAD
export async function launchRuneScapeLinux(
  clientPath: string,
  options: LaunchOptions = {}
): Promise<Result> {
  const { sessionIndex = 0, characterId = null } = options;
  const sessions = getSessions();

  console.log('=== Launching RuneScape (Linux) ===');
  console.log('Client path:', clientPath);

  // Verify client exists
  if (!fs.existsSync(clientPath)) {
    return { success: false, error: 'Game client not found at: ' + clientPath };
  }

  const clientDir = path.dirname(clientPath);

  // Build environment
  const env: GameEnv = { ...process.env };

  // Set up LD_PRELOAD for overlay libraries (both injected.so and overlay.so)
  const overlayPaths = getOverlayLibraryPaths();
  if (overlayPaths.length > 0) {
    // Combine all libraries with existing LD_PRELOAD
    const existingPreload = env.LD_PRELOAD || '';
    const allLibs = existingPreload ? [existingPreload, ...overlayPaths] : overlayPaths;
    env.LD_PRELOAD = allLibs.join(':');
    console.log('[Linux] LD_PRELOAD set to:', env.LD_PRELOAD);
  } else {
    console.log('[Linux] WARNING: Overlay libraries not found, launching without overlay');
  }

  // Handle session/character credentials
  if (sessions.length > 0 && sessionIndex < sessions.length) {
    try {
      const session = await refreshTokensIfNeeded(sessionIndex);

      if (session) {
        let selectedAccountId: string | null = null;
        let selectedDisplayName: string | null = null;

        if (characterId && session.accounts) {
          const account = session.accounts.find(a => a.accountId === characterId);
          if (account) {
            selectedAccountId = account.accountId;
            selectedDisplayName = account.displayName;
          }
        } else if (session.accounts && session.accounts.length > 0) {
          selectedAccountId = session.accounts[0].accountId;
          selectedDisplayName = session.accounts[0].displayName;
        }

        // Check if character is already playing
        if (selectedAccountId) {
          const existingClient = isCharacterPlaying(selectedAccountId);
          if (existingClient) {
            return {
              success: false,
              error: `Character "${selectedDisplayName || selectedAccountId}" is already logged in (PID: ${existingClient.pid})`
            };
          }
        }

        // Set Jagex session environment variables
        env.JX_SESSION_ID = session.sessionId;
        if (selectedAccountId) {
          env.JX_CHARACTER_ID = selectedAccountId;
          env.JX_DISPLAY_NAME = selectedDisplayName || '';
        }

        console.log('[Linux] Session credentials set');
      }
    } catch (e) {
      console.error('[Linux] Failed to refresh session:', e);
    }
  }

  try {
    console.log('[Linux] Spawning game process...');

    // Check if this is a Windows exe (needs Wine/Proton)
    const isWindowsExe = clientPath.toLowerCase().endsWith('.exe');

    let command: string;
    let args: string[];

    if (isWindowsExe) {
      // Find Wine or Proton to run the Windows exe
      const wineCommand = findWineCommand();
      if (!wineCommand) {
        return {
          success: false,
          error: 'Wine or Proton not found. Please install Wine to run the Windows game client.\n\n' +
                 'Install Wine with:\n' +
                 '• Ubuntu/Debian: sudo apt install wine\n' +
                 '• Fedora: sudo dnf install wine\n' +
                 '• Arch: sudo pacman -S wine'
        };
      }
      command = wineCommand;
      args = [clientPath];
      console.log(`[Linux] Using Wine: ${wineCommand}`);
    } else {
      // Native Linux binary - make sure it's executable
      try {
        fs.chmodSync(clientPath, 0o755);
      } catch (e) {
        console.log('[Linux] Could not set executable permission:', e);
      }
      command = clientPath;
      args = [];
      console.log('[Linux] Running native Linux client (no Wine needed)');

      // Check and download required dependencies (libssl1.1, etc.)
      console.log('[Linux] Checking dependencies...');
      try {
        const libPath = await ensureLinuxDependencies((msg) => {
          console.log('[Linux] Dependencies:', msg);
        });

        if (libPath) {
          // Set LD_LIBRARY_PATH to include our bundled libraries
          const existingLibPath = env.LD_LIBRARY_PATH || '';
          env.LD_LIBRARY_PATH = existingLibPath ? `${libPath}:${existingLibPath}` : libPath;
          console.log('[Linux] LD_LIBRARY_PATH set to:', env.LD_LIBRARY_PATH);
        }
      } catch (depError) {
        console.error('[Linux] Failed to ensure dependencies:', depError);
        return {
          success: false,
          error: 'Failed to download required libraries (libssl1.1). Please check your internet connection and try again.\n\n' +
                 'Error: ' + (depError instanceof Error ? depError.message : String(depError))
        };
      }

    }

    // Set SDL environment variables for better compatibility (like Bolt does)
    env.SDL_VIDEODRIVER = 'x11';
    env.PULSE_PROP_OVERRIDE = "application.name='RuneScape' application.icon_name='runescape' media.role='game'";

    // Debug: Log all relevant environment variables
    console.log('[Linux] Environment for game launch:');
    console.log('  LD_PRELOAD:', env.LD_PRELOAD || '(not set)');
    console.log('  LD_LIBRARY_PATH:', env.LD_LIBRARY_PATH || '(not set)');
    console.log('  SDL_VIDEODRIVER:', env.SDL_VIDEODRIVER);
    console.log('  Command:', command);
    console.log('  Args:', args);
    console.log('  CWD:', clientDir);

    const child = spawn(command, args, {
      cwd: clientDir,
      env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']  // Capture stdout/stderr for debugging
    });

    // Log any output from the game process
    child.stdout?.on('data', (data) => {
      console.log('[Linux Game stdout]:', data.toString());
    });
    child.stderr?.on('data', (data) => {
      console.log('[Linux Game stderr]:', data.toString());
    });

    child.unref();

    console.log('[Linux] Game launched successfully with PID:', child.pid);
    return { success: true };
  } catch (e) {
    console.error('[Linux] Launch error:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Find Wine or Proton command
function findWineCommand(): string | null {
  const possibleCommands = [
    'wine',
    'wine64',
    '/usr/bin/wine',
    '/usr/bin/wine64',
    // Proton from Steam
    path.join(process.env.HOME || '', '.steam/steam/steamapps/common/Proton - Experimental/proton'),
    path.join(process.env.HOME || '', '.local/share/Steam/steamapps/common/Proton - Experimental/proton'),
  ];

  for (const cmd of possibleCommands) {
    try {
      // Check if command exists
      if (cmd.includes('/')) {
        // Absolute path - check if file exists
        if (fs.existsSync(cmd)) {
          return cmd;
        }
      } else {
        // Command name - use which to find it
        execSync(`which ${cmd}`, { encoding: 'utf-8' });
        return cmd;
      }
    } catch {
      // Command not found, try next
    }
  }

  return null;
}

// Launch via native Linux game client (Flatpak, Steam, etc.)
export async function launchViaSystemClient(options: LaunchOptions = {}): Promise<Result> {
  const config = getConfig();
  const clientPath = config.rs2ClientPath;

  if (!clientPath) {
    return { success: false, error: 'RS2 Client not found. Please install via Flatpak or Steam.' };
  }

  return launchRuneScapeLinux(clientPath, options);
}
