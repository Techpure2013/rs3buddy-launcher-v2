/**
 * Auto-updater for portable builds (Windows .exe / Linux .AppImage)
 * Checks GitHub Releases for newer versions and self-updates via platform-specific swap script
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import { spawn } from 'child_process';
import { getApp } from './electron';
import { sendToMainWindow, silentDestroyOverlay } from './windows';
import { destroyTray } from './tray';
import { cleanup as cleanupHotkeys } from './hotkeys';
import { stopProcessMonitor } from './game';
import { stopFocusPolling } from './focus';

const GITHUB_REPO = 'Techpure2013/RS3LauncherBuddy';
const UPDATE_CHECK_DELAY_MS = 10_000; // 10 seconds after startup

interface GitHubRelease {
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

let pendingUpdate: { version: string; downloadUrl: string; size: number; checksumUrl: string | null } | null = null;

export function getPendingUpdate() {
  return pendingUpdate;
}

/**
 * Compare two semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Fetch JSON from a URL via https
 */
function fetchJson(url: string, maxRedirects = 5): Promise<any> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }
    const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); // drain the response so the socket can be reused
        fetchJson(res.headers.location, maxRedirects - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('error', reject);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Download a file to disk with progress reporting
 */
function downloadFile(url: string, destPath: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    const maxRedirects = 5;
    const doDownload = (downloadUrl: string) => {
      if (++redirects > maxRedirects) { reject(new Error('Too many redirects')); return; }
      const req = https.get(downloadUrl, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res) => {
        // Follow redirects (GitHub uses them for asset downloads)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          doDownload(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const totalSize = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;

        const file = fs.createWriteStream(destPath);
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (totalSize > 0 && onProgress) {
            onProgress(Math.round((downloaded / totalSize) * 100));
          }
        });
        res.on('error', (err) => {
          file.destroy();
          fs.unlink(destPath, () => {});
          reject(err);
        });
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
        file.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
      req.on('error', reject);
      req.setTimeout(300_000, () => { req.destroy(); reject(new Error('Download timeout')); });
    };
    doDownload(url);
  });
}

/**
 * Check for updates and return release info if a newer version exists
 */
export async function checkForUpdate(): Promise<{ version: string; downloadUrl: string; size: number } | null> {
  try {
    const app = getApp();
    const currentVersion = app.getVersion();
    console.log(`[Updater] Current version: ${currentVersion}`);

    const release: GitHubRelease = await fetchJson(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
    );

    const remoteVersion = release.tag_name;
    console.log(`[Updater] Latest release: ${remoteVersion}`);

    if (compareSemver(remoteVersion, currentVersion) <= 0) {
      console.log('[Updater] Already up to date');
      return null;
    }

    // Find the platform-appropriate asset
    const isLinux = process.platform === 'linux';
    const asset = isLinux
      ? release.assets.find(a => a.name.endsWith('.AppImage'))
      : release.assets.find(a => a.name.endsWith('.exe'));
    if (!asset) {
      console.warn(`[Updater] No ${isLinux ? '.AppImage' : '.exe'} asset found in release`);
      return null;
    }

    console.log(`[Updater] Update available: ${currentVersion} → ${remoteVersion}`);

    // Look for a SHA256 checksum file for integrity verification
    const checksumAsset = release.assets.find(a => a.name === asset.name + '.sha256');

    pendingUpdate = {
      version: remoteVersion.replace(/^v/, ''),
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      checksumUrl: checksumAsset?.browser_download_url || null
    };
    return pendingUpdate;
  } catch (e) {
    console.error('[Updater] Failed to check for updates:', e);
    return null;
  }
}

/**
 * Fetch text content from a URL (for checksum files)
 */
function fetchText(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }
    const req = https.get(url, { headers: { 'User-Agent': 'RS3-Launcher-Buddy' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        fetchText(res.headers.location, maxRedirects - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('error', reject);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Compute SHA256 hash of a file
 */
function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Download the update and apply it via platform-specific swap script
 */
export async function downloadAndApplyUpdate(downloadUrl: string): Promise<void> {
  const app = getApp();
  const desktopDir = app.getPath('desktop');
  const tempDir = app.getPath('temp');
  const isLinux = process.platform === 'linux';
  const exeName = isLinux ? 'RS3 Launcher Buddy.AppImage' : 'RS3 Launcher Buddy.exe';
  const desktopExePath = path.join(desktopDir, exeName);

  console.log(`[Updater] Downloading to desktop: ${desktopExePath}`);

  // Download the new binary directly to the desktop
  await downloadFile(downloadUrl, desktopExePath, (pct) => {
    sendToMainWindow('update-download-progress', { percent: pct });
  });

  // Verify file size matches expected
  if (pendingUpdate?.size) {
    const stat = fs.statSync(desktopExePath);
    if (stat.size !== pendingUpdate.size) {
      fs.unlinkSync(desktopExePath);
      throw new Error(`Download size mismatch: expected ${pendingUpdate.size}, got ${stat.size}`);
    }
  }

  // Compute SHA256 and verify against checksum file if available
  const fileHash = await hashFile(desktopExePath);
  console.log(`[Updater] Downloaded file SHA256: ${fileHash}`);

  if (pendingUpdate?.checksumUrl) {
    try {
      const checksumText = await fetchText(pendingUpdate.checksumUrl);
      // Format: "hash  filename" or just "hash"
      const expectedHash = checksumText.trim().split(/\s+/)[0].toLowerCase();
      if (expectedHash && fileHash !== expectedHash) {
        fs.unlinkSync(desktopExePath);
        throw new Error(`SHA256 mismatch: expected ${expectedHash}, got ${fileHash}`);
      }
      console.log('[Updater] SHA256 checksum verified successfully');
    } catch (e: any) {
      if (e.message?.includes('mismatch')) throw e; // Re-throw actual mismatches
      console.warn('[Updater] Could not fetch checksum file, skipping verification:', e.message);
    }
  } else {
    console.warn('[Updater] No checksum file available - hash logged for audit only');
  }

  sendToMainWindow('update-download-progress', { percent: 100 });
  sendToMainWindow('update-status', { status: 'restarting' });

  console.log('[Updater] Download complete, launching update script...');

  const pid = process.pid;

  if (isLinux) {
    // Linux: bash script to wait for exit, then launch new AppImage from desktop
    const shPath = path.join(tempDir, 'alt1gl-update.sh');
    const sh = `#!/bin/bash
# Wait for the launcher process to exit
while kill -0 ${pid} 2>/dev/null; do sleep 0.5; done
sleep 1

# Make executable and launch from desktop
chmod +x "${desktopExePath}"
nohup "${desktopExePath}" &>/dev/null &

# Clean up
rm -f "${shPath}"
`;
    fs.writeFileSync(shPath, sh, { mode: 0o755 });

    spawn('bash', [shPath], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } else {
    // Windows: VBScript to wait for exit, then launch new exe from desktop
    const vbsPath = path.join(tempDir, 'alt1gl-update.vbs');

    const vbs = [
      'Set wshShell = CreateObject("WScript.Shell")',
      '',
      "' Wait for the launcher process to exit",
      'On Error Resume Next',
      'Do While True',
      `    Set procs = GetObject("winmgmts:").ExecQuery("SELECT ProcessId FROM Win32_Process WHERE ProcessId = ${pid}")`,
      '    If procs.Count = 0 Then Exit Do',
      '    WScript.Sleep 500',
      'Loop',
      'On Error GoTo 0',
      '',
      'WScript.Sleep 1000',
      '',
      "' Launch the new exe from desktop",
      `wshShell.Run """${desktopExePath}""", 1, False`,
      '',
      "' Clean up this script",
      'On Error Resume Next',
      'CreateObject("Scripting.FileSystemObject").DeleteFile WScript.ScriptFullName, True',
    ].join('\r\n');
    fs.writeFileSync(vbsPath, vbs, 'utf-8');

    spawn('wscript.exe', [vbsPath], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  }

  // Do synchronous cleanup before force-exiting so no traces are left behind
  // (tray icon, hotkeys, IPC socket, process monitor, focus polling)
  console.log('[Updater] Cleaning up before exit...');
  try { stopProcessMonitor(); } catch (e) { /* ignore */ }
  try { stopFocusPolling(); } catch (e) { /* ignore */ }
  try { silentDestroyOverlay(); } catch (e) { /* ignore */ }
  try { destroyTray(); } catch (e) { /* ignore */ }
  try { cleanupHotkeys(); } catch (e) { /* ignore */ }

  // Force-exit immediately (bypasses async before-quit handler that would delay exit)
  console.log('[Updater] Force-exiting for update...');
  app.exit(0);
}

/**
 * Initialize the auto-updater (call after app is ready)
 */
export function initAutoUpdater(): void {
  // Only auto-update on Windows and Linux
  if (process.platform !== 'win32' && process.platform !== 'linux') {
    console.log('[Updater] Skipping auto-update on unsupported platform');
    return;
  }

  // Don't check in dev mode
  if (process.defaultApp) {
    console.log('[Updater] Skipping auto-update in dev mode');
    return;
  }

  setTimeout(async () => {
    const update = await checkForUpdate();
    if (update) {
      sendToMainWindow('update-available', {
        version: update.version,
        size: update.size
      });
    }
  }, UPDATE_CHECK_DELAY_MS);
}
