import { spawn, exec, execSync, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { app, dialog, shell } from 'electron';
import { getConfig, getSessions } from './config';
import { refreshTokensIfNeeded, decodeJwtPayload } from './auth';
import { downloadRS3Client, getCachedGamePath } from './download';
import { injectIntoProcess, isInjected as checkInjected, loadNativeAddon, resetInjectionState, resetInjectionStateForPid, reconnectToOverlay } from './inject';
import { isCharacterPlaying } from './tray';
import type { Result, GameEnv, LaunchOptions } from './types';

// Platform detection
const isLinux = process.platform === 'linux';
const isWindows = process.platform === 'win32';

// Import Linux-specific module conditionally
import * as gameLinux from './game-linux';

// Download progress callback
type DownloadProgressCallback = (message: string, progress?: number) => void;
let downloadProgressCallback: DownloadProgressCallback | null = null;

export function setDownloadProgressCallback(callback: DownloadProgressCallback | null): void {
  downloadProgressCallback = callback;
}

// Process tracking
let runescapeProcess: ChildProcess | null = null;
let processMonitorInterval: NodeJS.Timeout | null = null;
let autoInjectEnabled = false; // Default OFF — user must enable GL Overlay toggle
let useOverlayDll = false;

export function setUseOverlay(enabled: boolean): void {
  useOverlayDll = enabled;
}

// Multi-client tracking
const knownPids = new Set<number>();
const injectedPids = new Set<number>();

/** Mark a PID as injected (prevents process monitor from double-injecting) */
export function markPidInjected(pid: number): void {
  injectedPids.add(pid);
  knownPids.add(pid); // Also add to known so process monitor doesn't re-discover it
}
// Track PIDs that need confirmation (seen once, waiting for second sighting)
const pendingPids = new Map<number, number>(); // pid -> first seen timestamp

// Callbacks for process events
let onClientStarted: ((pid: number) => void) | null = null;
let onClientStopped: ((pid?: number) => void) | null = null;
let onInjectionComplete: ((success: boolean, pid?: number) => void) | null = null;

// Track pending launches - character info waiting for process to start
// Key: timestamp, Value: { characterId, characterName, launchedAt }
interface PendingLaunch {
  characterId: string;
  characterName?: string;
  launchedAt: number;
}
let pendingLaunch: PendingLaunch | null = null;

// Get the pending launch info (called when client starts to associate characterId with PID)
export function getPendingLaunch(): PendingLaunch | null {
  return pendingLaunch;
}

// Clear pending launch (called after client is registered)
export function clearPendingLaunch(): void {
  pendingLaunch = null;
}

// Set process event callbacks
export function setProcessCallbacks(
  onStarted: (pid: number) => void,
  onStopped: (pid?: number) => void,
  onInjected?: (success: boolean, pid?: number) => void
): void {
  onClientStarted = onStarted;
  onClientStopped = onStopped;
  onInjectionComplete = onInjected || null;
}

// Enable/disable auto-injection
export function setAutoInject(enabled: boolean): void {
  autoInjectEnabled = enabled;
}

// Check if auto-inject is enabled
export function isAutoInjectEnabled(): boolean {
  return autoInjectEnabled;
}

// Check if native addon is available for injection
export function isNativeAddonAvailable(): boolean {
  return loadNativeAddon() !== null;
}

// Re-export injection status check
export { isInjected } from './inject';

// Check if RuneScape is running
export function isRuneScapeRunning(): boolean {
  if (isLinux) {
    return gameLinux.isRuneScapeRunning();
  }

  // Windows implementation
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq rs2client.exe" /NH', { encoding: 'utf-8' });
    return output.toLowerCase().includes('rs2client.exe');
  } catch {
    return false;
  }
}

// Check if OUR overlay/injected DLLs are already loaded in a process
// Must be specific to avoid false positives from Steam (GameOverlayRenderer64.dll), Discord, etc.
function isDllLoadedInProcess(pid: number): boolean {
  if (!isWindows) return false;
  try {
    const output = execSync(`tasklist /M /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf-8', timeout: 5000 });
    // Only match OUR exact DLL names: overlay.dll, overlay-1.dll, injected.dll, injected-2.dll, etc.
    // \b prevents matching GameOverlayRenderer64.dll, SteamOverlay.dll, etc.
    const hasOverlay = /\boverlay(-\d+)?\.dll\b/i.test(output);
    const hasInjected = /\binjected(-\d+)?\.dll\b/i.test(output);
    if (hasOverlay || hasInjected) {
      console.log('[Game] Alt1GL DLL already loaded in PID:', pid,
        hasOverlay ? '(overlay)' : '', hasInjected ? '(injected)' : '');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Check if the overlay IPC pipe exists for a given PID
export function doesOverlayPipeExist(pid: number): boolean {
  if (isLinux) {
    return gameLinux.doesOverlaySocketExist(pid);
  }

  // Windows implementation - use fs.existsSync on the pipe path (faster than PowerShell)
  try {
    const pipePath = `//./pipe/alt1gl-overlay-${pid}`;
    return fs.existsSync(pipePath);
  } catch {
    return false;
  }
}

// Get all RS2 Client PIDs
export function getAllRs2ClientPids(): number[] {
  if (isLinux) {
    return gameLinux.getAllRs2ClientPids?.() ?? [gameLinux.getRs2ClientPid()].filter((p): p is number => p !== null);
  }

  // Windows implementation
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq rs2client.exe" /FO CSV /NH', { encoding: 'utf-8' });
    const pids: number[] = [];
    const regex = /"rs2client\.exe","(\d+)"/gi;
    let match;
    while ((match = regex.exec(output)) !== null) {
      pids.push(parseInt(match[1]));
    }
    return pids;
  } catch {
    return [];
  }
}

// Get RS2 Client PID (backwards compatibility - returns first PID)
export function getRs2ClientPid(): number | null {
  const pids = getAllRs2ClientPids();
  return pids.length > 0 ? pids[0] : null;
}

// Check for crash reports on Desktop after client stops
function checkForCrashReport(pid: number): void {
  try {
    const desktopPath = app.getPath('desktop');
    const files = fs.readdirSync(desktopPath)
      .filter(f => (f.startsWith('RS3-Launcher-Buddy-Crash-Report-') || f.startsWith('alt1gl-crash-')) && f.endsWith('.txt'))
      .map(f => ({
        name: f,
        path: path.join(desktopPath, f),
        mtime: fs.statSync(path.join(desktopPath, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) return;

    // Only care about reports from the last 10 seconds (recent crash)
    const recentReport = files[0];
    const ageMs = Date.now() - recentReport.mtime;
    if (ageMs > 10000) return;

    console.log(`[Game] Crash report detected: ${recentReport.name}`);

    // Read the report content
    const content = fs.readFileSync(recentReport.path, 'utf-8');

    // Extract the "WHAT HAPPENED" section for the dialog
    const whatMatch = content.match(/WHAT HAPPENED\n-+\n([\s\S]*?)\n\n/);
    const whatHappened = whatMatch ? whatMatch[1].trim() : 'The overlay encountered a problem.';

    dialog.showMessageBox({
      type: 'warning',
      title: 'RS3 Launcher Buddy - Crash Report',
      message: 'The GL overlay encountered a problem.',
      detail: whatHappened + '\n\nA crash report has been saved to your Desktop:\n' + recentReport.name,
      buttons: ['Open Report', 'OK'],
      defaultId: 1,
      noLink: true
    }).then(result => {
      if (result.response === 0) {
        shell.openPath(recentReport.path);
      }
    });
  } catch (e) {
    // Don't let crash report detection itself cause errors
    console.log('[Game] Error checking for crash reports:', e);
  }
}

// Start process monitor
export function startProcessMonitor(): void {
  if (processMonitorInterval) return;

  processMonitorInterval = setInterval(() => {
    const currentPids = new Set(getAllRs2ClientPids());

    // Detect NEW clients (require 2 consecutive sightings to filter transient processes)
    for (const pid of currentPids) {
      if (knownPids.has(pid)) continue; // Already tracked

      if (!pendingPids.has(pid)) {
        // First sighting - add to pending, don't act yet
        pendingPids.set(pid, Date.now());
        console.log('[Game] New rs2client.exe spotted, PID:', pid, '- confirming next cycle...');
        continue;
      }

      // Second sighting - this is a real client
      pendingPids.delete(pid);
      console.log('[Game] New RS client confirmed! PID:', pid);
      knownPids.add(pid);
      onClientStarted?.(pid);

      // Check if overlay pipe exists (reconnect case)
      const pipeExists = doesOverlayPipeExist(pid);

      if (isLinux) {
        // On Linux, overlay is loaded via LD_PRELOAD at launch time
        console.log('[Game] Linux mode - overlay loaded via LD_PRELOAD');
        if (pipeExists) {
          console.log('[Game] Overlay socket found - overlay is active');
          onInjectionComplete?.(true, pid);
        } else {
          // Give overlay time to initialize and create socket
          setTimeout(() => {
            const socketNowExists = doesOverlayPipeExist(pid);
            console.log('[Game] Overlay socket check after delay:', socketNowExists);
            onInjectionComplete?.(socketNowExists, pid);
          }, 2000);
        }
      } else {
        // Windows DLL injection
        if (pipeExists) {
          // Overlay DLL is already loaded and its pipe is active.
          // Do NOT re-inject - reconnect to existing shared memory instead.
          console.log('[Game] Overlay pipe found for PID:', pid, '- reconnecting to shared memory (skipping re-injection)');
          injectedPids.add(pid);
          const reconnected = reconnectToOverlay(pid);
          console.log('[Game] Shared memory reconnect result:', reconnected);
          onInjectionComplete?.(reconnected, pid);
        } else if (autoInjectEnabled && !injectedPids.has(pid)) {
          // Check if DLLs are already loaded from a previous session
          // This prevents the boost shared_ptr assertion crash from re-injection
          if (isDllLoadedInProcess(pid)) {
            // DLL is still loaded from a previous session. The pipe may be listening
            // (DLL auto-resets pipe on client disconnect). Reconnect to shared memory.
            console.log('[Game] Overlay DLL already loaded in PID:', pid, '- reconnecting to shared memory (skipping re-injection)');
            injectedPids.add(pid);
            const reconnected = reconnectToOverlay(pid);
            console.log('[Game] Shared memory reconnect result:', reconnected);
            onInjectionComplete?.(reconnected, pid);
          } else {
            injectedPids.add(pid);
            console.log('[Game] Auto-injecting into PID:', pid, 'useOverlay:', useOverlayDll);
            setTimeout(() => {
              try {
                const success = injectIntoProcess(pid, useOverlayDll);

                // If injection returned true but shared memory wasn't established
                // (memoryid undefined), retry via reconnect after the DLL has time to init
                if (success) {
                  const state = require('./inject').getInjectionState();
                  if (state && (state.memoryId === 0 || state.memoryId == null)) {
                    console.log('[Game] Shared memory not established, scheduling reconnect retry...');
                    setTimeout(() => {
                      try {
                        console.log('[Game] Retrying shared memory reconnect for PID:', pid);
                        const reconnected = reconnectToOverlay(pid);
                        console.log('[Game] Reconnect retry result:', reconnected);
                        onInjectionComplete?.(reconnected, pid);
                      } catch (e) {
                        console.error('[Game] Reconnect retry failed:', e);
                        onInjectionComplete?.(false, pid);
                      }
                    }, 3000);
                    return; // Don't call onInjectionComplete yet — wait for reconnect
                  }
                }

                onInjectionComplete?.(success, pid);
              } catch (err) {
                console.error('[Game] Injection crashed:', err);
                onInjectionComplete?.(false, pid);
              }
            }, 2000);
          }
        }
      }
    }

    // Detect STOPPED clients
    for (const pid of knownPids) {
      if (!currentPids.has(pid)) {
        console.log('[Game] RS client stopped, PID:', pid);
        knownPids.delete(pid);
        injectedPids.delete(pid);
        if (!isLinux) {
          resetInjectionStateForPid(pid);
        }
        onClientStopped?.(pid);

        // Check for crash reports on Desktop (written by the overlay DLL)
        checkForCrashReport(pid);
      }
    }

    // Also clean up any pending PIDs that have disappeared
    for (const [pid] of pendingPids) {
      if (!currentPids.has(pid)) {
        pendingPids.delete(pid);
      }
    }
  }, 2000);
}

// Stop process monitor
export function stopProcessMonitor(): void {
  if (processMonitorInterval) {
    clearInterval(processMonitorInterval);
    processMonitorInterval = null;
  }
}

// Launch RuneScape using downloaded game client (recommended method)
export async function launchWithDownloadedClient(options: LaunchOptions = {}): Promise<Result> {
  const { sessionIndex = 0, characterId = null } = options;
  const sessions = getSessions();

  console.log('=== Launching RuneScape (Downloaded Client) ===');
  console.log('Platform:', isLinux ? 'Linux' : 'Windows');
  console.log('Session index:', sessionIndex);
  console.log('Character ID:', characterId);

  // Download or get cached game executable
  let clientPath: string;
  try {
    const cachedPath = getCachedGamePath();
    if (cachedPath) {
      console.log('Using cached game client:', cachedPath);
      clientPath = cachedPath;
    } else {
      console.log('Downloading game client...');
      clientPath = await downloadRS3Client(downloadProgressCallback || undefined);
      console.log('Downloaded game client to:', clientPath);
    }
  } catch (e) {
    console.error('Failed to get game client:', e);
    return { success: false, error: `Failed to download game: ${e instanceof Error ? e.message : String(e)}` };
  }

  // On Linux, use the dedicated Linux launcher with LD_PRELOAD
  if (isLinux) {
    const result = await gameLinux.launchRuneScapeLinux(clientPath, options);
    if (result.success) {
      startProcessMonitor();
    }
    return result;
  }

  const clientDir = path.dirname(clientPath);

  // Build environment with credentials
  const env: GameEnv = { ...process.env };

  if (sessions.length > 0 && sessionIndex < sessions.length) {
    try {
      const session = await refreshTokensIfNeeded(sessionIndex);
      console.log('Session:', session ? 'found' : 'not found');

      if (session) {
        console.log('Session details:');
        console.log('  Session ID: [REDACTED]');
        console.log('  Session created at:', new Date(session.createdAt).toISOString());
        console.log('  Session age (minutes):', Math.round((Date.now() - session.createdAt) / 60000));
        console.log('  Accounts:', session.accounts?.length);

        // Check JWT expiration without logging sensitive payload
        const sessionPayload = decodeJwtPayload(session.sessionId);
        if (sessionPayload) {
          console.log('Session ID is a JWT');
          if (sessionPayload.exp) {
            const expiresIn = Math.round((sessionPayload.exp * 1000 - Date.now()) / 60000);
            console.log('  Expires in (minutes):', expiresIn);
          }
        } else {
          console.log('Session ID is NOT a JWT (or failed to decode)');
        }

        // Select character first
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

        // Check if this character is already playing
        if (selectedAccountId) {
          const existingClient = isCharacterPlaying(selectedAccountId);
          if (existingClient) {
            console.log('[Game] Character already playing:', selectedDisplayName, 'PID:', existingClient.pid);
            return {
              success: false,
              error: `Character "${selectedDisplayName || selectedAccountId}" is already logged in (PID: ${existingClient.pid})`
            };
          }

          // Set pending launch so we can associate this character with the process when it starts
          pendingLaunch = {
            characterId: selectedAccountId,
            characterName: selectedDisplayName || undefined,
            launchedAt: Date.now()
          };
          console.log('[Game] Set pending launch for character:', selectedDisplayName);
        }

        // Set the required environment variables for game session
        env.JX_SESSION_ID = session.sessionId;
        if (selectedAccountId) {
          env.JX_CHARACTER_ID = selectedAccountId;
          env.JX_DISPLAY_NAME = selectedDisplayName || '';
        }

        console.log('Environment variables set:');
        console.log('  JX_SESSION_ID:', env.JX_SESSION_ID ? '[SET]' : '[NOT SET]');
        console.log('  JX_CHARACTER_ID:', env.JX_CHARACTER_ID);
        console.log('  JX_DISPLAY_NAME:', env.JX_DISPLAY_NAME);
      }
    } catch (e) {
      console.error('Failed to refresh session:', e);
    }
  }

  try {
    console.log('Spawning game process...');

    // Spawn the downloaded executable directly with environment variables
    // This should work because it's the real game executable, not the stub
    const child = spawn(clientPath, [], {
      cwd: clientDir,
      env,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    runescapeProcess = child;

    startProcessMonitor();
    console.log('Game launched successfully');
    return { success: true };
  } catch (e) {
    console.error('Launch error:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Launch RuneScape with credentials (legacy method using stub launcher)
export async function launchRuneScape(options: LaunchOptions = {}): Promise<Result> {
  const { sessionIndex = 0, characterId = null } = options;
  const config = getConfig();
  const sessions = getSessions();
  const clientPath = config.rs2ClientPath;

  if (!clientPath) {
    return { success: false, error: 'RS2 Client not found' };
  }

  console.log('=== Launching RuneScape ===');
  console.log('Client path:', clientPath);
  console.log('Session index:', sessionIndex);
  console.log('Character ID:', characterId);

  // Verify the client exists
  if (!fs.existsSync(clientPath)) {
    console.error('Client path does not exist:', clientPath);
    return { success: false, error: 'RS2 Client path does not exist' };
  }

  const isWindows = process.platform === 'win32';
  const clientDir = path.dirname(clientPath);
  console.log('Client directory:', clientDir);

  // Build environment
  const env: GameEnv = { ...process.env };

  // Set up library injection/preload (disabled for now to test)
  // if (config.alt1glLibPath) {
  //   if (isWindows) {
  //     env.ALT1GL_DLL_PATH = config.alt1glLibPath;
  //   } else {
  //     env.LD_PRELOAD = config.alt1glLibPath;
  //   }
  // }

  // Build command line arguments - using JX_ environment vars (Jagex format)
  const args: string[] = [];

  // Add Jagex session credentials if we have them
  if (sessions.length > 0 && sessionIndex < sessions.length) {
    try {
      const session = await refreshTokensIfNeeded(sessionIndex);
      console.log('Session:', session ? 'found' : 'not found');
      console.log('Session ID:', session?.sessionId ? '[SET]' : '[NOT SET]');
      console.log('Session accounts:', session?.accounts?.length);

      if (session) {
        // If character specified, add character info
        let selectedAccountId: string | null = null;
        let selectedDisplayName: string | null = null;
        if (characterId && session.accounts) {
          const account = session.accounts.find(a => a.accountId === characterId);
          if (account) {
            selectedAccountId = account.accountId;
            selectedDisplayName = account.displayName;
          }
        } else if (session.accounts && session.accounts.length > 0) {
          // Use first account
          selectedAccountId = session.accounts[0].accountId;
          selectedDisplayName = session.accounts[0].displayName;
        }

        // Check if this character is already playing
        if (selectedAccountId) {
          const existingClient = isCharacterPlaying(selectedAccountId);
          if (existingClient) {
            console.log('[Game] Character already playing:', selectedDisplayName, 'PID:', existingClient.pid);
            return {
              success: false,
              error: `Character "${selectedDisplayName || selectedAccountId}" is already logged in (PID: ${existingClient.pid})`
            };
          }

          // Set pending launch so we can associate this character with the process when it starts
          pendingLaunch = {
            characterId: selectedAccountId,
            characterName: selectedDisplayName || undefined,
            launchedAt: Date.now()
          };
          console.log('[Game] Set pending launch for character:', selectedDisplayName);
        }

        // Pass the required environment variables
        env.JX_SESSION_ID = session.sessionId;
        if (selectedAccountId) {
          env.JX_CHARACTER_ID = selectedAccountId;
          env.JX_DISPLAY_NAME = selectedDisplayName || '';
        }

        console.log('Environment vars set:');
        console.log('  JX_SESSION_ID:', env.JX_SESSION_ID ? '[SET]' : '[NOT SET]');
        console.log('  JX_CHARACTER_ID:', env.JX_CHARACTER_ID);
        console.log('  JX_DISPLAY_NAME:', env.JX_DISPLAY_NAME);
      }
    } catch (e) {
      console.error('Failed to refresh session:', e);
    }
  } else {
    console.log('No sessions available');
  }

  try {
    console.log('Launching rs2client...');

    // Build command: set env vars, then use "start" to launch
    // This avoids ACCESS_VIOLATION while passing credentials
    let command = '';

    if (env.JX_SESSION_ID) {
      command += `set "JX_SESSION_ID=${env.JX_SESSION_ID}" && `;
    }
    if (env.JX_CHARACTER_ID) {
      command += `set "JX_CHARACTER_ID=${env.JX_CHARACTER_ID}" && `;
    }
    if (env.JX_DISPLAY_NAME) {
      command += `set "JX_DISPLAY_NAME=${env.JX_DISPLAY_NAME}" && `;
    }

    // Use start to launch - this inherits the env vars we just set
    command += `start "" "${clientPath}"`;

    console.log('Command (credentials hidden):', command.replace(/JX_SESSION_ID=[^"]*/, 'JX_SESSION_ID=***'));

    exec(command, { cwd: clientDir }, (error, stdout, stderr) => {
      if (error) {
        console.error('Launch error:', error);
      }
      if (stdout) console.log('stdout:', stdout);
      if (stderr) console.log('stderr:', stderr);
    });

    startProcessMonitor();
    console.log('rs2client launch initiated');
    return { success: true };
  } catch (e) {
    console.error('Launch error:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Test launch - use Windows start command (launches via Explorer)
export function testLaunchRs2Client(): Result {
  const config = getConfig();
  const clientPath = config.rs2ClientPath;

  if (!clientPath) {
    return { success: false, error: 'RS2 Client not found' };
  }

  console.log('=== TEST LAUNCH (Windows start command) ===');
  console.log('Client path:', clientPath);

  const clientDir = path.dirname(clientPath);

  try {
    // Use Windows "start" command which launches through Explorer
    // This makes explorer.exe the parent process, not node.exe
    const command = `start "" "${clientPath}"`;
    console.log('Executing:', command);

    exec(command, { cwd: clientDir }, (error, stdout, stderr) => {
      if (error) {
        console.error('Start command error:', error);
      }
      if (stdout) console.log('stdout:', stdout);
      if (stderr) console.log('stderr:', stderr);
    });

    console.log('Start command executed');
    return { success: true };
  } catch (e) {
    console.error('Test launch error:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Launch via Jagex Launcher (fallback)
export function launchViaJagexLauncher(): Result {
  const config = getConfig();
  const launcherPath = config.jagexLauncherPath;

  if (!launcherPath) {
    return { success: false, error: 'Jagex Launcher not found' };
  }

  const env = { ...process.env };

  if (isLinux) {
    // On Linux, set LD_PRELOAD for overlay
    const overlayPath = gameLinux.getOverlayLibraryPath();
    if (overlayPath) {
      const existingPreload = env.LD_PRELOAD || '';
      env.LD_PRELOAD = existingPreload ? `${existingPreload}:${overlayPath}` : overlayPath;
      console.log('[Linux] LD_PRELOAD set to:', env.LD_PRELOAD);
    }
  } else if (config.alt1glLibPath) {
    // Windows: Set DLL path (used by injection)
    env.ALT1GL_DLL_PATH = config.alt1glLibPath;
  }

  const spawnOptions = {
    detached: true,
    stdio: 'ignore' as const,
    env
  };

  try {
    // Handle Flatpak command (e.g., "flatpak run com.jagex.Launcher")
    let command: string;
    let args: string[];

    if (launcherPath.startsWith('flatpak run ')) {
      // Split Flatpak command into executable and arguments
      command = 'flatpak';
      args = launcherPath.slice('flatpak '.length).split(' ');
    } else {
      command = launcherPath;
      args = [];
    }

    console.log('[Launch] Command:', command, 'Args:', args);

    // For Flatpak, don't set LD_PRELOAD as it won't work inside the sandbox
    // The overlay needs to be injected differently for Flatpak apps
    const isFlatpak = launcherPath.startsWith('flatpak');

    if (isFlatpak) {
      // For Flatpak, run the full command through shell
      // This is more reliable for launching GUI applications
      console.log('[Launch] Running Flatpak command through shell:', launcherPath);
      runescapeProcess = spawn(launcherPath, [], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: process.env
      });

      // Log any output for debugging
      runescapeProcess.stdout?.on('data', (data) => {
        console.log('[Launch Flatpak stdout]:', data.toString());
      });
      runescapeProcess.stderr?.on('data', (data) => {
        console.log('[Launch Flatpak stderr]:', data.toString());
      });
    } else {
      runescapeProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore' as const,
        env
      });
    }

    runescapeProcess.on('error', (err) => {
      console.error('[Launch] Spawn error:', err);
    });

    runescapeProcess.unref();
    startProcessMonitor();
    return { success: true };
  } catch (e) {
    console.error('[Launch] Exception:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
