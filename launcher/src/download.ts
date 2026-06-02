/**
 * Game Download Module
 * Downloads the actual RS3 game executable from Jagex's Direct6 CDN
 * On Linux, downloads the native .deb package and extracts the binary
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as zlib from 'zlib';
import { execSync } from 'child_process';
import { getDataDir } from './config';

// Direct6 CDN URL for game downloads
const DIRECT6_URL = 'https://jagex.akamaized.net/direct6/';
const RS3_WIN_PATH = 'runescape-win'; // Path for RS3 Windows client

// Linux uses a different distribution method - Debian APT repository
const LINUX_CONTENT_URL = 'https://content.runescape.com/downloads/ubuntu/';
const LINUX_PACKAGES_PATH = 'dists/trusty/non-free/binary-amd64/Packages';

// Platform detection
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Game metadata
interface Direct6Token {
  id: string;
  version: string;
}

interface CatalogConfig {
  remote: {
    baseUrl: string;
    pieceFormat: string;
  };
}

interface Catalog {
  metafile: string;
  config: CatalogConfig;
}

interface MetafileData {
  id: string;
  pieces: {
    digests: string[];
  };
  files: Array<{
    name: string;
    size: number;
  }>;
}

// Cache for downloaded game
let cachedExePath: string | null = null;
let cachedExeHash: string | null = null;

// Progress callback type
type ProgressCallback = (message: string, progress?: number) => void;

// Fetch JSON from URL
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'RS3-Launcher-Buddy/2.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Fetch raw text from URL
function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'RS3-Launcher-Buddy/2.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.end();
  });
}

// Fetch binary data from URL
function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'RS3-Launcher-Buddy/2.0'
      }
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.end();
  });
}

// Decode JWT-like token (split by ., base64 decode the payload)
function decodeToken<T>(token: string): T {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid token format');
  }
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload);
}

// Fix URL to use HTTPS and working CDN domains
function fixUrl(url: string): string {
  return url
    .replace(/^http:\/\/(.{5})-akamai\.aws\.snxd\.com\//i, 'https://$1.akamaized.net/')
    .replace(/^http:/i, 'https:');
}

// Convert base64 to hex string
function base64ToHex(base64: string): string {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.toString('hex');
}

// Get the path where we store the downloaded game
function getGameCachePath(): string {
  const dataDir = getDataDir();
  if (isLinux) {
    // Native Linux binary extracted from .deb
    return path.join(dataDir, 'runescape');
  }
  // Windows exe
  return path.join(dataDir, 'rs3windows.exe');
}

// Get the path for the hash file
function getGameHashPath(): string {
  const dataDir = getDataDir();
  if (isLinux) {
    return path.join(dataDir, 'runescape.sha256');
  }
  return path.join(dataDir, 'rs3windows.sha256');
}

// Check if we have a cached game that's up to date
export function getCachedGamePath(): string | null {
  const exePath = getGameCachePath();
  const hashPath = getGameHashPath();

  if (fs.existsSync(exePath) && fs.existsSync(hashPath)) {
    return exePath;
  }

  return null;
}

// Get the cached hash
function getCachedHash(): string | null {
  const hashPath = getGameHashPath();
  if (fs.existsSync(hashPath)) {
    return fs.readFileSync(hashPath, 'utf-8').trim();
  }
  return null;
}

// Save the hash
function saveHash(hash: string): void {
  const hashPath = getGameHashPath();
  fs.writeFileSync(hashPath, hash);
}

// Extract the native Linux binary from a .deb file
// Uses ar and tar commands which are standard on Linux
function extractLinuxBinaryFromDeb(debPath: string, outputPath: string): void {
  const dataDir = getDataDir();
  const tempDir = path.join(dataDir, 'temp_extract');

  // Clean up temp dir if exists
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Extract data.tar.xz from .deb using ar
    execSync(`ar x "${debPath}" data.tar.xz`, { cwd: tempDir, stdio: 'pipe' });

    const dataTarPath = path.join(tempDir, 'data.tar.xz');
    if (!fs.existsSync(dataTarPath)) {
      // Try data.tar.gz as fallback
      execSync(`ar x "${debPath}" data.tar.gz`, { cwd: tempDir, stdio: 'pipe' });
    }

    // Extract the game binary from data.tar
    // The binary is at ./usr/share/games/runescape-launcher/runescape
    const tarFile = fs.existsSync(path.join(tempDir, 'data.tar.xz')) ? 'data.tar.xz' : 'data.tar.gz';
    execSync(
      `tar -xf "${tarFile}" --strip-components=5 ./usr/share/games/runescape-launcher/runescape`,
      { cwd: tempDir, stdio: 'pipe' }
    );

    const extractedBinary = path.join(tempDir, 'runescape');
    if (!fs.existsSync(extractedBinary)) {
      throw new Error('Failed to extract runescape binary from .deb');
    }

    // Move to final location and make executable
    fs.copyFileSync(extractedBinary, outputPath);
    fs.chmodSync(outputPath, 0o755);

  } finally {
    // Clean up temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  }
}

// Parse Debian Packages file format into key-value pairs
function parseDebianPackages(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(': ');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 2);
      result[key] = value;
    }
  }
  return result;
}

// Download a file with progress callback
function downloadFile(url: string, destPath: string, onProgress?: ProgressCallback): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'RS3-Launcher-Buddy/2.0'
      }
    };

    const file = fs.createWriteStream(destPath);

    const req = https.request(options, (res) => {
      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      res.on('data', (chunk: Buffer) => {
        file.write(chunk);
        downloadedSize += chunk.length;
        if (totalSize > 0 && onProgress) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          onProgress(`Downloading... ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`, progress);
        }
      });

      res.on('end', () => {
        file.end(() => {
          // Wait for file to be fully written before resolving
          resolve();
        });
      });

      res.on('error', (err) => {
        file.end();
        fs.unlinkSync(destPath);
        reject(err);
      });
    });

    req.on('error', (err) => {
      file.end();
      reject(err);
    });

    req.end();
  });
}

// Download the native Linux client (.deb) from Jagex's Debian repository
async function downloadRS3LinuxClient(onProgress?: ProgressCallback): Promise<string> {
  const log = (msg: string, progress?: number) => {
    console.log(msg);
    onProgress?.(msg, progress);
  };

  try {
    log('Checking for Linux game updates...');

    // Step 1: Fetch the Debian Packages file to get version info and download URL
    const packagesUrl = `${LINUX_CONTENT_URL}${LINUX_PACKAGES_PATH}`;
    log('Fetching Linux package metadata...');
    const packagesText = await fetchText(packagesUrl);

    const packageInfo = parseDebianPackages(packagesText);

    if (!packageInfo.Filename || !packageInfo.Size || !packageInfo.SHA256) {
      throw new Error('Could not parse package metadata from Debian repository');
    }

    const version = packageInfo.Version || 'unknown';
    const sha256 = packageInfo.SHA256;
    const debFilename = packageInfo.Filename;
    const debSize = parseInt(packageInfo.Size, 10);

    log(`Latest Linux version: ${version} (SHA256: ${sha256.substring(0, 16)}...)`);

    // Check if we already have this version
    const cachedHash = getCachedHash();
    const cachedPath = getCachedGamePath();

    if (cachedHash === sha256 && cachedPath && fs.existsSync(cachedPath)) {
      log('Linux game client is up-to-date');
      return cachedPath;
    }

    // Step 2: Download the .deb file
    const debUrl = `${LINUX_CONTENT_URL}${debFilename}`;
    log(`Downloading Linux game client (${Math.round(debSize / 1024 / 1024)}MB)...`);

    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const tempDebPath = path.join(dataDir, 'runescape.deb');
    await downloadFile(debUrl, tempDebPath, onProgress);

    // Step 3: Extract the binary from the .deb
    log('Extracting native Linux binary from .deb...');
    const binaryPath = getGameCachePath();
    extractLinuxBinaryFromDeb(tempDebPath, binaryPath);

    // Clean up the .deb file
    fs.unlinkSync(tempDebPath);

    // Save the hash for future update checks
    saveHash(sha256);

    log('Linux game client downloaded successfully!', 100);
    return binaryPath;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Linux download failed: ${message}`);
    throw error;
  }
}

// Download and cache the RS3 client
// On Linux, downloads native .deb and extracts binary
// On Windows, downloads the Windows exe
export async function downloadRS3Client(
  onProgress?: ProgressCallback
): Promise<string> {
  // Use native Linux client on Linux
  if (isLinux) {
    return downloadRS3LinuxClient(onProgress);
  }
  const log = (msg: string, progress?: number) => {
    console.log(msg);
    onProgress?.(msg, progress);
  };

  try {
    log('Checking for game updates...');

    // Step 1: Get the environment metadata
    const metaUrl = `${DIRECT6_URL}${RS3_WIN_PATH}/${RS3_WIN_PATH}.json`;
    log(`Fetching game metadata...`);
    const metaResponse = await fetchText(metaUrl);

    const envData = decodeToken<{ environments: { production: Direct6Token } }>(metaResponse);
    const production = envData.environments.production;

    log(`Latest version: ${production.version} (${production.id})`);

    // Check if we already have this version
    const cachedHash = getCachedHash();
    const cachedPath = getCachedGamePath();

    if (cachedHash === production.id && cachedPath) {
      log('Game client is up-to-date');
      return cachedPath;
    }

    // Step 2: Get the catalog for this version
    log('Fetching game catalog...');
    const catalogUrl = `${DIRECT6_URL}${RS3_WIN_PATH}/catalog/${production.id}/catalog.json`;
    const catalogResponse = await fetchText(catalogUrl);
    const catalog = decodeToken<Catalog>(catalogResponse);

    // Step 3: Get the metafile
    log('Fetching file list...');
    const metafileResponse = await fetchText(fixUrl(catalog.metafile));
    const metafile = decodeToken<MetafileData>(metafileResponse);

    // Step 4: Find the exe in the file list
    let exeOffset = 0;
    let exeSize: number | null = null;

    for (const file of metafile.files) {
      if (file.name.endsWith('.exe')) {
        if (exeSize !== null) {
          throw new Error('Multiple exe files found in game data');
        }
        exeSize = file.size;
      } else if (exeSize === null) {
        exeOffset += file.size;
      }
    }

    if (exeSize === null) {
      throw new Error('No exe file found in game data');
    }

    log(`Found game executable: offset=${exeOffset}, size=${exeSize}`);

    // Step 5: Download all the pieces
    const totalPieces = metafile.pieces.digests.length;
    log(`Downloading game client (${totalPieces} pieces)...`);

    const baseUrl = fixUrl(catalog.config.remote.baseUrl);
    const pieceFormat = catalog.config.remote.pieceFormat;

    const pieces: Buffer[] = [];
    for (let i = 0; i < totalPieces; i++) {
      const digest = metafile.pieces.digests[i];
      const hexDigest = base64ToHex(digest);

      const pieceUrl = baseUrl + pieceFormat
        .replace('{SubString:0,2,{TargetDigest}}', hexDigest.substring(0, 2))
        .replace('{TargetDigest}', hexDigest);

      const progress = Math.round((i / totalPieces) * 100);
      log(`Downloading piece ${i + 1}/${totalPieces}...`, progress);

      const compressedData = await fetchBuffer(pieceUrl);

      // The data has a 6-byte header before the gzip data
      const gzipData = compressedData.slice(6);
      const decompressed = zlib.gunzipSync(gzipData);
      pieces.push(decompressed);
    }

    // Step 6: Combine all pieces and extract the exe
    log('Extracting game executable...');
    const fullData = Buffer.concat(pieces);
    const exeData = fullData.slice(exeOffset, exeOffset + exeSize);

    // Step 7: Save the exe
    const exePath = getGameCachePath();
    const dataDir = getDataDir();

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(exePath, exeData);
    saveHash(production.id);

    log('Game client downloaded successfully!', 100);
    return exePath;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Download failed: ${message}`);
    throw error;
  }
}

// Check if the game is available on Linux (via Jagex Launcher, Steam, or Flatpak)
export function isGameAvailableOnLinux(): { available: boolean; installMethod?: string; path?: string } {
  if (isWindows) {
    return { available: false }; // Not applicable on Windows
  }

  const home = process.env.HOME || '';
  const possibleInstalls = [
    {
      method: 'Flatpak',
      paths: [
        path.join(home, '.var/app/com.jagex.Launcher/data/jagex-launcher/games/rs2client'),
        path.join(home, '.var/app/com.jagex.Launcher/data/jagex-launcher'),
      ]
    },
    {
      method: 'Native',
      paths: [
        path.join(home, '.local/share/jagex-launcher/games/rs2client'),
        path.join(home, '.local/share/jagex-launcher'),
      ]
    },
    {
      method: 'Steam/Proton',
      paths: [
        path.join(home, '.steam/steam/steamapps/compatdata/1343400/pfx/drive_c/ProgramData/Jagex/launcher/rs2client.exe'),
        path.join(home, '.local/share/Steam/steamapps/compatdata/1343400/pfx/drive_c/ProgramData/Jagex/launcher/rs2client.exe'),
      ]
    }
  ];

  for (const install of possibleInstalls) {
    for (const p of install.paths) {
      if (fs.existsSync(p)) {
        return { available: true, installMethod: install.method, path: p };
      }
    }
  }

  return { available: false };
}

// Get Linux installation instructions
export function getLinuxInstallInstructions(): string {
  return `To play RuneScape 3 on Linux, install the game using one of these methods:

**Option 1: Flatpak (Recommended)**
\`\`\`
flatpak remote-add --user JagexLauncher https://jagexlauncher.flatpak.mcswain.dev/JagexLauncher.flatpakrepo
flatpak install --user JagexLauncher com.jagex.Launcher
\`\`\`

**Option 2: Steam**
1. Install Steam
2. Search for "RuneScape" in the store
3. Install it (runs via Proton automatically)

After installing, restart RS3 Launcher Buddy to detect the game.`;
}

// ============================================
// Linux Dependency Management
// ============================================

// URLs for required libraries from Ubuntu archives
const LIBSSL_DEB_URL = 'https://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2.24_amd64.deb';
const LIBSSL_DEB_FILENAME = 'libssl1.1_1.1.1f-1ubuntu2.24_amd64.deb';

const LIBSDL2_DEB_URL = 'https://archive.ubuntu.com/ubuntu/pool/universe/libs/libsdl2/libsdl2-2.0-0_2.0.10+dfsg1-3_amd64.deb';
const LIBSDL2_DEB_FILENAME = 'libsdl2-2.0-0_2.0.10+dfsg1-3_amd64.deb';

// All required libraries that we bundle
const REQUIRED_LIBRARIES = [
  'libssl.so.1.1',
  'libcrypto.so.1.1',
  'libSDL2-2.0.so.0'
];

// Get the path to our bundled libraries directory
export function getLibraryDir(): string {
  return path.join(getDataDir(), 'lib');
}

// Check if the required libraries are present
export function checkLinuxDependencies(): { missing: string[]; libraryPath: string | null } {
  if (!isLinux) {
    return { missing: [], libraryPath: null };
  }

  const libDir = getLibraryDir();
  const missing: string[] = [];

  for (const lib of REQUIRED_LIBRARIES) {
    const libPath = path.join(libDir, lib);
    if (!fs.existsSync(libPath)) {
      missing.push(lib);
    }
  }

  if (missing.length === 0) {
    return { missing: [], libraryPath: libDir };
  }

  return { missing, libraryPath: null };
}

// Extract libraries from a .deb file
function extractLibrariesFromDeb(debPath: string, outputDir: string, libraries: string[]): void {
  const tempDir = path.join(getDataDir(), 'temp_lib_extract');

  console.log(`[Linux] Extracting from deb: ${debPath}`);
  console.log(`[Linux] Temp dir: ${tempDir}`);
  console.log(`[Linux] Output dir: ${outputDir}`);

  // Verify the deb file exists and has content
  if (!fs.existsSync(debPath)) {
    throw new Error(`Deb file does not exist: ${debPath}`);
  }
  const debStats = fs.statSync(debPath);
  console.log(`[Linux] Deb file size: ${debStats.size} bytes`);
  if (debStats.size < 1000) {
    throw new Error(`Deb file too small (${debStats.size} bytes), download may have failed`);
  }

  // Clean up temp dir if exists
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Extract data.tar from .deb using ar
    // First list contents to see what's available
    let arListOutput: string;
    try {
      arListOutput = execSync(`ar -t "${debPath}"`, { encoding: 'utf-8' });
      console.log(`[Linux] Deb contents: ${arListOutput.trim().replace(/\n/g, ', ')}`);
    } catch (e) {
      throw new Error(`Failed to list deb contents: ${e}`);
    }

    // Try to extract the data archive
    let extracted = false;
    const formats = ['data.tar.xz', 'data.tar.zst', 'data.tar.gz', 'data.tar'];
    for (const format of formats) {
      if (arListOutput.includes(format)) {
        try {
          execSync(`ar x "${debPath}" ${format}`, { cwd: tempDir, stdio: 'pipe' });
          console.log(`[Linux] Extracted ${format} successfully`);
          extracted = true;
          break;
        } catch (e) {
          console.log(`[Linux] Failed to extract ${format}: ${e}`);
        }
      }
    }

    if (!extracted) {
      throw new Error(`Could not extract data archive from deb. Contents: ${arListOutput}`);
    }

    // Find the data.tar file
    let dataTar = '';
    for (const ext of formats) {
      if (fs.existsSync(path.join(tempDir, ext))) {
        dataTar = ext;
        break;
      }
    }

    if (!dataTar) {
      const tempContents = fs.readdirSync(tempDir);
      throw new Error(`Could not find data.tar in temp dir. Contents: ${tempContents.join(', ')}`);
    }

    console.log(`[Linux] Found data archive: ${dataTar}`);

    // Extract the libraries from data.tar
    // Libraries are typically in ./usr/lib/x86_64-linux-gnu/
    execSync(`tar -xf "${dataTar}" -C "${tempDir}"`, { cwd: tempDir, stdio: 'pipe' });

    // Find and copy the libraries
    const libSearchPaths = [
      path.join(tempDir, 'usr', 'lib', 'x86_64-linux-gnu'),
      path.join(tempDir, 'usr', 'lib'),
      path.join(tempDir, 'lib', 'x86_64-linux-gnu'),
      path.join(tempDir, 'lib'),
    ];

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const lib of libraries) {
      let found = false;
      for (const searchPath of libSearchPaths) {
        const libPath = path.join(searchPath, lib);
        if (fs.existsSync(libPath)) {
          const destPath = path.join(outputDir, lib);
          // Follow symlinks to get the actual file
          const realPath = fs.realpathSync(libPath);
          fs.copyFileSync(realPath, destPath);
          fs.chmodSync(destPath, 0o755);
          console.log(`[Linux] Extracted ${lib} to ${destPath}`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`[Linux] Warning: Could not find ${lib} in .deb`);
      }
    }

  } finally {
    // Clean up temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  }
}

// Download and install missing Linux dependencies
export async function downloadLinuxDependencies(onProgress?: ProgressCallback): Promise<string> {
  if (!isLinux) {
    throw new Error('This function is only available on Linux');
  }

  const log = (msg: string, progress?: number) => {
    console.log(msg);
    onProgress?.(msg, progress);
  };

  const libDir = getLibraryDir();
  const dataDir = getDataDir();

  // Ensure directories exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  try {
    // Download and extract libssl1.1 (contains both libssl and libcrypto)
    log('Downloading libssl1.1...', 0);
    const sslDebPath = path.join(dataDir, LIBSSL_DEB_FILENAME);
    await downloadFile(LIBSSL_DEB_URL, sslDebPath, (msg, progress) => {
      log(`Downloading libssl1.1: ${msg}`, progress ? progress * 0.4 : undefined);
    });

    log('Extracting libssl1.1...', 40);
    extractLibrariesFromDeb(sslDebPath, libDir, ['libssl.so.1.1', 'libcrypto.so.1.1']);
    fs.unlinkSync(sslDebPath);

    // Download and extract libSDL2
    log('Downloading libSDL2...', 50);
    const sdlDebPath = path.join(dataDir, LIBSDL2_DEB_FILENAME);
    await downloadFile(LIBSDL2_DEB_URL, sdlDebPath, (msg, progress) => {
      log(`Downloading libSDL2: ${msg}`, progress ? 50 + progress * 0.4 : undefined);
    });

    log('Extracting libSDL2...', 90);
    extractLibrariesFromDeb(sdlDebPath, libDir, ['libSDL2-2.0.so.0']);
    fs.unlinkSync(sdlDebPath);

    log('All libraries installed successfully!', 100);
    return libDir;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Failed to download dependencies: ${message}`);
    throw error;
  }
}

// Ensure all Linux dependencies are installed
// Returns the LD_LIBRARY_PATH to use, or null if system libraries are sufficient
export async function ensureLinuxDependencies(onProgress?: ProgressCallback): Promise<string | null> {
  if (!isLinux) {
    return null;
  }

  const { missing, libraryPath } = checkLinuxDependencies();

  if (missing.length === 0) {
    console.log('[Linux] All required libraries are present');
    return libraryPath;
  }

  console.log('[Linux] Missing libraries:', missing.join(', '));

  // Check if they're available on the system
  try {
    const gamePath = getCachedGamePath();
    if (gamePath && fs.existsSync(gamePath)) {
      const lddOutput = execSync(`ldd "${gamePath}" 2>&1`, { encoding: 'utf-8' });
      const hasAllLibs = !lddOutput.includes('not found');
      if (hasAllLibs) {
        console.log('[Linux] System has all required libraries');
        return null;
      }
    }
  } catch {
    // ldd failed, continue with downloading
  }

  // Download the missing dependencies
  onProgress?.('Downloading required libraries...');
  const libPath = await downloadLinuxDependencies(onProgress);
  return libPath;
}

// Check if game needs update (without downloading)
export async function checkForUpdates(): Promise<{ needsUpdate: boolean; currentVersion?: string; latestVersion?: string }> {
  try {
    const metaUrl = `${DIRECT6_URL}jagex-win/jagex-win.json`;
    const metaResponse = await fetchText(metaUrl);

    const envData = decodeToken<{ environments: { production: Direct6Token } }>(metaResponse);
    const production = envData.environments.production;

    const cachedHash = getCachedHash();

    return {
      needsUpdate: cachedHash !== production.id,
      currentVersion: cachedHash || undefined,
      latestVersion: production.id
    };
  } catch {
    return { needsUpdate: false };
  }
}

// ============================================
// Jagex Launcher Installation
// ============================================

// Jagex Launcher download URLs
const JAGEX_LAUNCHER_WIN_URL = 'https://www.jagex.com/download';
const JAGEX_LAUNCHER_WIN_DIRECT = 'https://content.runescape.com/downloads/JagexLauncher.exe';
const FLATPAK_APP_ID = 'com.jagex.Launcher';
// Jagex Launcher is NOT on official Flathub - it's a community Flatpak from USA-RedDragon
const JAGEX_LAUNCHER_FLATPAK_REPO = 'https://jagexlauncher.flatpak.mcswain.dev/JagexLauncher.flatpakrepo';
const JAGEX_LAUNCHER_REMOTE_NAME = 'JagexLauncher';

// Check if Jagex Launcher is installed
export function isJagexLauncherInstalled(): { installed: boolean; method?: string; path?: string } {
  const home = process.env.HOME || '';

  if (isWindows) {
    const possiblePaths = [
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Jagex Launcher', 'JagexLauncher.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Jagex Launcher', 'JagexLauncher.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Jagex Launcher', 'JagexLauncher.exe'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return { installed: true, method: 'Windows', path: p };
      }
    }
    return { installed: false };
  }

  if (isLinux) {
    // Check Flatpak installation
    try {
      const output = execSync(`flatpak list --app | grep -i "${FLATPAK_APP_ID}"`, { encoding: 'utf-8', stdio: 'pipe' });
      if (output.trim().length > 0) {
        return { installed: true, method: 'Flatpak', path: `flatpak run ${FLATPAK_APP_ID}` };
      }
    } catch {
      // Not installed via Flatpak
    }

    // Check native installation
    const nativePaths = [
      path.join(home, '.local/share/jagex-launcher/jagex-launcher'),
      '/opt/jagex-launcher/jagex-launcher',
      '/usr/bin/jagex-launcher',
      '/usr/local/bin/jagex-launcher'
    ];

    for (const p of nativePaths) {
      if (fs.existsSync(p)) {
        return { installed: true, method: 'Native', path: p };
      }
    }

    return { installed: false };
  }

  return { installed: false };
}

// Check if Flatpak is available on the system
export function isFlatpakAvailable(): boolean {
  if (!isLinux) return false;
  try {
    execSync('which flatpak', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Install Flatpak on the system (requires sudo/pkexec)
export async function installFlatpakSystem(onProgress?: ProgressCallback): Promise<{ success: boolean; error?: string }> {
  if (!isLinux) {
    return { success: false, error: 'Flatpak installation is only available on Linux' };
  }

  const log = (msg: string, progress?: number) => {
    console.log('[Flatpak Install]', msg);
    onProgress?.(msg, progress);
  };

  try {
    const { spawn } = require('child_process');

    // Detect package manager and build command
    let installCmd: string[];

    // Check which package manager is available
    try {
      execSync('which apt', { encoding: 'utf-8', stdio: 'pipe' });
      // Debian/Ubuntu - use apt
      installCmd = ['apt', 'install', '-y', 'flatpak'];
    } catch {
      try {
        execSync('which dnf', { encoding: 'utf-8', stdio: 'pipe' });
        // Fedora - use dnf
        installCmd = ['dnf', 'install', '-y', 'flatpak'];
      } catch {
        try {
          execSync('which pacman', { encoding: 'utf-8', stdio: 'pipe' });
          // Arch - use pacman
          installCmd = ['pacman', '-S', '--noconfirm', 'flatpak'];
        } catch {
          return { success: false, error: 'Could not detect package manager (apt, dnf, or pacman required)' };
        }
      }
    }

    log('Installing Flatpak (this requires your password)...', 10);

    return new Promise((resolve) => {
      // Use pkexec for graphical sudo prompt
      const child = spawn('pkexec', installCmd, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        const line = data.toString();
        console.log('[Flatpak Install stdout]', line);
        log(line.trim(), 50);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const line = data.toString();
        stderr += line;
        console.log('[Flatpak Install stderr]', line);
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          // Now add Flathub repository
          log('Adding Flathub repository...', 80);

          const flathubChild = spawn('flatpak', ['remote-add', '--if-not-exists', 'flathub', 'https://flathub.org/repo/flathub.flatpakrepo'], {
            stdio: ['ignore', 'pipe', 'pipe']
          });

          flathubChild.on('close', (flathubCode: number) => {
            if (flathubCode === 0) {
              log('Flatpak installed successfully!', 100);
              resolve({ success: true });
            } else {
              // Flatpak installed but flathub failed - still consider it a success
              log('Flatpak installed (Flathub may need manual setup)', 100);
              resolve({ success: true });
            }
          });

          flathubChild.on('error', () => {
            // Flatpak installed but couldn't add flathub - still consider it a success
            resolve({ success: true });
          });
        } else if (code === 126 || code === 127) {
          // User cancelled the pkexec dialog
          resolve({ success: false, error: 'Installation cancelled by user' });
        } else {
          resolve({ success: false, error: `Installation failed (code ${code}): ${stderr}` });
        }
      });

      child.on('error', (err: Error) => {
        if (err.message.includes('ENOENT')) {
          resolve({ success: false, error: 'pkexec not found. Please install Flatpak manually using:\nsudo apt install flatpak' });
        } else {
          resolve({ success: false, error: `Failed to run installer: ${err.message}` });
        }
      });
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Installation failed: ${msg}` };
  }
}

// Helper to run a flatpak install command and wait for completion
function runFlatpakInstall(args: string[], onProgress?: (msg: string) => void): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const child = spawn('flatpak', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      console.log('[Flatpak stdout]', line);
      if (line.includes('%')) {
        const match = line.match(/(\d+)%/);
        if (match) {
          onProgress?.(`Installing... ${match[1]}%`);
        }
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      stderr += line;
      console.log('[Flatpak stderr]', line);
    });

    child.on('close', (code: number) => {
      if (code === 0 || stderr.includes('already installed') || stderr.includes('is already installed')) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr });
      }
    });

    child.on('error', (err: Error) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// GPU detection result
interface GpuInfo {
  vendor: 'nvidia' | 'amd' | 'intel' | 'unknown';
  nvidiaDriverVersion?: string;  // Format: "570-195-03" for flatpak
}

// Detect GPU vendor and driver information
function detectGpuInfo(): GpuInfo {
  // Check for NVIDIA first
  try {
    // Method 1: Check if nvidia-smi exists and get driver version
    const nvidiaSmi = execSync('nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null', {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();

    if (nvidiaSmi) {
      // Convert driver version like "570.195.03" to flatpak format "570-195-03"
      const flatpakVersion = nvidiaSmi.replace(/\./g, '-');
      console.log('[GPU] Detected NVIDIA driver:', nvidiaSmi, '-> flatpak:', flatpakVersion);
      return { vendor: 'nvidia', nvidiaDriverVersion: flatpakVersion };
    }
  } catch {
    // nvidia-smi not available
  }

  // Method 2: Check /proc for nvidia driver
  try {
    if (fs.existsSync('/proc/driver/nvidia/version')) {
      const version = fs.readFileSync('/proc/driver/nvidia/version', 'utf-8');
      // Parse: "NVRM version: NVIDIA UNIX x86_64 Kernel Module  570.195.03  ..."
      const match = version.match(/(\d+\.\d+\.\d+)/);
      if (match) {
        const flatpakVersion = match[1].replace(/\./g, '-');
        console.log('[GPU] Detected NVIDIA from /proc:', match[1], '-> flatpak:', flatpakVersion);
        return { vendor: 'nvidia', nvidiaDriverVersion: flatpakVersion };
      }
    }
  } catch {
    // /proc/driver/nvidia not available
  }

  // Method 3: Check existing flatpak GL drivers for nvidia
  try {
    const output = execSync('flatpak list --runtime 2>/dev/null | grep -i "org.freedesktop.Platform.GL.nvidia"', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    // Parse: "nvidia-570-195-03  org.freedesktop.Platform.GL.nvidia-570-195-03  1.4  user"
    const match = output.match(/nvidia-(\d+-\d+-\d+)/);
    if (match) {
      console.log('[GPU] Detected NVIDIA from existing flatpak driver:', match[1]);
      return { vendor: 'nvidia', nvidiaDriverVersion: match[1] };
    }
  } catch {
    // No nvidia flatpak driver found
  }

  // Check for AMD or Intel using lspci
  try {
    const lspci = execSync('lspci 2>/dev/null | grep -iE "VGA|3D|Display"', {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).toLowerCase();

    if (lspci.includes('nvidia')) {
      // NVIDIA detected but couldn't get driver version
      console.log('[GPU] NVIDIA detected via lspci but no driver version found');
      return { vendor: 'nvidia' };
    } else if (lspci.includes('amd') || lspci.includes('radeon') || lspci.includes('ati')) {
      console.log('[GPU] AMD GPU detected');
      return { vendor: 'amd' };
    } else if (lspci.includes('intel')) {
      console.log('[GPU] Intel GPU detected');
      return { vendor: 'intel' };
    }
  } catch {
    // lspci not available
  }

  console.log('[GPU] Could not detect GPU vendor, will use Mesa drivers');
  return { vendor: 'unknown' };
}

// Install Jagex Launcher via Flatpak (Linux)
// Uses community Flatpak from https://github.com/USA-RedDragon/jagex-launcher-linux-flatpak
export async function installJagexLauncherFlatpak(onProgress?: ProgressCallback): Promise<{ success: boolean; error?: string }> {
  if (!isLinux) {
    return { success: false, error: 'Flatpak installation is only available on Linux' };
  }

  if (!isFlatpakAvailable()) {
    return { success: false, error: 'Flatpak is not installed. Please install Flatpak first.' };
  }

  const log = (msg: string, progress?: number) => {
    console.log('[Flatpak]', msg);
    onProgress?.(msg, progress);
  };

  try {
    // ========================================
    // Step 1: Configure Flatpak Repositories
    // ========================================
    log('Step 1/6: Configuring Flatpak repositories...', 2);

    // Add Flathub for dependencies (org.freedesktop.Platform, etc.)
    log('Adding Flathub repository (for dependencies)...', 3);
    try {
      execSync('flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo', { stdio: 'pipe' });
      log('Flathub repository configured', 4);
    } catch {
      try {
        execSync('flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo', { stdio: 'pipe' });
        log('Flathub repository configured (system-wide)', 4);
      } catch {
        // Ignore - flathub might already exist
        log('Flathub repository already exists', 4);
      }
    }

    // Add the JagexLauncher custom repository
    log('Adding JagexLauncher repository...', 5);
    try {
      execSync(`flatpak remote-add --user --if-not-exists ${JAGEX_LAUNCHER_REMOTE_NAME} ${JAGEX_LAUNCHER_FLATPAK_REPO}`, { stdio: 'pipe' });
      log('JagexLauncher repository configured', 6);
    } catch (e) {
      try {
        execSync(`flatpak remote-add --if-not-exists ${JAGEX_LAUNCHER_REMOTE_NAME} ${JAGEX_LAUNCHER_FLATPAK_REPO}`, { stdio: 'pipe' });
        log('JagexLauncher repository configured (system-wide)', 6);
      } catch {
        return { success: false, error: `Failed to add JagexLauncher repository. You may need to run:\nflatpak remote-add --user ${JAGEX_LAUNCHER_REMOTE_NAME} ${JAGEX_LAUNCHER_FLATPAK_REPO}` };
      }
    }

    // ========================================
    // Step 2: Install Jagex Launcher (~1.3 GB)
    // ========================================
    log('Step 2/6: Installing Jagex Launcher (~1.3 GB)...', 8);
    log('Downloading Jagex Launcher and Wine runtime...', 10);

    const launcherResult = await runFlatpakInstall(
      ['install', '--user', '-y', JAGEX_LAUNCHER_REMOTE_NAME, FLATPAK_APP_ID],
      (msg) => log(msg, 15)
    );

    if (!launcherResult.success && !launcherResult.error?.includes('already installed')) {
      return { success: false, error: `Jagex Launcher installation failed: ${launcherResult.error}` };
    }

    if (launcherResult.error?.includes('already installed')) {
      log('Jagex Launcher already installed, continuing...', 35);
    } else {
      log('Jagex Launcher installed successfully', 35);
    }

    // ========================================
    // Step 3: Install 32-bit Compatibility (~108 MB)
    // ========================================
    log('Step 3/6: Installing 32-bit compatibility libraries (~108 MB)...', 38);
    log('This provides 32-bit Linux libraries required by Wine...', 40);

    const compatResult = await runFlatpakInstall(
      ['install', '--user', '-y', 'flathub', 'org.freedesktop.Platform.Compat.i386/x86_64/23.08'],
      (msg) => log(msg, 45)
    );

    if (!compatResult.success && !compatResult.error?.includes('already installed')) {
      log('Warning: 32-bit compat libraries may not have installed properly', 50);
      console.log('[Flatpak] 32-bit compat install issue:', compatResult.error);
    } else {
      log('32-bit compatibility libraries installed', 50);
    }

    // ========================================
    // Step 4: Detect Graphics Hardware
    // ========================================
    log('Step 4/6: Detecting graphics hardware...', 52);
    const gpuInfo = detectGpuInfo();

    let gpuDescription = '';
    switch (gpuInfo.vendor) {
      case 'nvidia':
        gpuDescription = gpuInfo.nvidiaDriverVersion
          ? `NVIDIA GPU detected (driver: ${gpuInfo.nvidiaDriverVersion.replace(/-/g, '.')})`
          : 'NVIDIA GPU detected (driver version unknown)';
        break;
      case 'amd':
        gpuDescription = 'AMD GPU detected (using Mesa/RADV drivers)';
        break;
      case 'intel':
        gpuDescription = 'Intel GPU detected (using Mesa drivers)';
        break;
      default:
        gpuDescription = 'GPU vendor unknown (using Mesa drivers)';
    }
    log(gpuDescription, 55);

    // ========================================
    // Step 5: Install 32-bit Graphics Drivers
    // ========================================
    if (gpuInfo.vendor === 'nvidia' && gpuInfo.nvidiaDriverVersion) {
      // NVIDIA GPU detected with known driver version
      log(`Step 5/6: Installing 32-bit NVIDIA drivers (~208 MB)...`, 58);
      log(`Driver version: ${gpuInfo.nvidiaDriverVersion.replace(/-/g, '.')}`, 60);

      const nvidiaResult = await runFlatpakInstall(
        ['install', '--user', '-y', 'flathub', `org.freedesktop.Platform.GL32.nvidia-${gpuInfo.nvidiaDriverVersion}/x86_64/1.4`],
        (msg) => log(msg, 70)
      );

      if (!nvidiaResult.success && !nvidiaResult.error?.includes('already installed')) {
        log('NVIDIA 32-bit driver not available, falling back to Mesa...', 75);
        console.log('[Flatpak] NVIDIA GL32 install issue:', nvidiaResult.error);

        log('Installing Mesa 32-bit drivers as fallback (~182 MB)...', 78);
        const mesaResult = await runFlatpakInstall(
          ['install', '--user', '-y', 'flathub', 'org.freedesktop.Platform.GL32.default/x86_64/23.08'],
          (msg) => log(msg, 85)
        );
        if (mesaResult.success || mesaResult.error?.includes('already installed')) {
          log('Mesa 32-bit drivers installed (fallback)', 88);
        }
      } else {
        log('NVIDIA 32-bit drivers installed', 88);
      }
    } else if (gpuInfo.vendor === 'nvidia') {
      // NVIDIA detected but no driver version - try to find it or use Mesa
      log(`Step 5/6: Installing 32-bit graphics drivers...`, 58);
      log('NVIDIA detected but driver version unknown, using Mesa drivers...', 60);

      const mesaResult = await runFlatpakInstall(
        ['install', '--user', '-y', 'flathub', 'org.freedesktop.Platform.GL32.default/x86_64/23.08'],
        (msg) => log(msg, 75)
      );
      if (mesaResult.success || mesaResult.error?.includes('already installed')) {
        log('Mesa 32-bit drivers installed', 88);
      }
    } else {
      // AMD, Intel, or unknown - use Mesa drivers
      const driverDesc = gpuInfo.vendor === 'amd' ? 'AMD (Mesa/RADV)' :
                         gpuInfo.vendor === 'intel' ? 'Intel (Mesa)' : 'Mesa';
      log(`Step 5/6: Installing 32-bit ${driverDesc} drivers (~182 MB)...`, 58);

      const gl32Result = await runFlatpakInstall(
        ['install', '--user', '-y', 'flathub', 'org.freedesktop.Platform.GL32.default/x86_64/23.08'],
        (msg) => log(msg, 75)
      );

      if (!gl32Result.success && !gl32Result.error?.includes('already installed')) {
        log('Warning: 32-bit graphics drivers may not have installed properly', 88);
        console.log('[Flatpak] GL32 install issue:', gl32Result.error);
      } else {
        log(`${driverDesc} 32-bit drivers installed`, 88);
      }
    }

    // ========================================
    // Step 6: Initialize Wine Environment
    // ========================================
    log('Step 6/6: Preparing Wine environment...', 90);
    const home = process.env.HOME || '';
    const wineDataDir = path.join(home, '.var/app/com.jagex.Launcher/data/wine');

    if (fs.existsSync(wineDataDir)) {
      log('Clearing old Wine prefix for clean initialization...', 92);
      try {
        fs.rmSync(wineDataDir, { recursive: true, force: true });
        log('Wine prefix cleared', 95);
      } catch (e) {
        log('Could not clear Wine prefix (not critical)', 95);
        console.log('[Flatpak] Could not clear Wine prefix:', e);
      }
    } else {
      log('Wine environment ready for first-run initialization', 95);
    }

    // ========================================
    // Installation Complete
    // ========================================
    log('Installation complete! Jagex Launcher is ready to use.', 100);
    return { success: true };

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Installation failed: ${msg}` };
  }
}

// Download Jagex Launcher installer for Windows
export async function downloadJagexLauncherWindows(onProgress?: ProgressCallback): Promise<{ success: boolean; installerPath?: string; error?: string }> {
  if (!isWindows) {
    return { success: false, error: 'Windows installer download is only available on Windows' };
  }

  const log = (msg: string, progress?: number) => {
    console.log('[JagexLauncher]', msg);
    onProgress?.(msg, progress);
  };

  try {
    log('Downloading Jagex Launcher installer...', 0);

    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const installerPath = path.join(dataDir, 'JagexLauncher.exe');

    await downloadFile(JAGEX_LAUNCHER_WIN_DIRECT, installerPath, (msg, progress) => {
      log(msg, progress);
    });

    log('Download complete!', 100);
    return { success: true, installerPath };

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Download failed: ${msg}` };
  }
}

// Run the downloaded Windows installer
export function runJagexLauncherInstaller(installerPath: string): { success: boolean; error?: string } {
  if (!isWindows) {
    return { success: false, error: 'Windows installer can only be run on Windows' };
  }

  if (!fs.existsSync(installerPath)) {
    return { success: false, error: 'Installer not found' };
  }

  try {
    const { spawn } = require('child_process');
    // Run the installer (it will show its own GUI)
    const child = spawn(installerPath, [], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Failed to run installer: ${msg}` };
  }
}

// Get installation instructions for current platform
export function getJagexLauncherInstallInstructions(): string {
  if (isWindows) {
    return `To install Jagex Launcher on Windows:

1. Click "Download & Install" to download the installer
2. Run the downloaded installer
3. Follow the installation prompts
4. Restart Alt1GL Launcher to detect the installation`;
  }

  if (isLinux) {
    const hasFlatpak = isFlatpakAvailable();

    if (hasFlatpak) {
      return `To install Jagex Launcher on Linux:

**Option 1: One-click Install (Recommended)**
Click "Install via Flatpak" below

**Option 2: Manual Terminal Install**
\`\`\`
flatpak remote-add --user JagexLauncher ${JAGEX_LAUNCHER_FLATPAK_REPO}
flatpak install --user JagexLauncher com.jagex.Launcher
\`\`\`

After installation, restart RS3 Launcher Buddy to detect it.`;
    } else {
      return `To install Jagex Launcher on Linux:

**Step 1: Install Flatpak** (if not already installed)
\`\`\`
# Ubuntu/Debian
sudo apt install flatpak

# Fedora
sudo dnf install flatpak

# Arch
sudo pacman -S flatpak
\`\`\`

**Step 2: Install Jagex Launcher**
\`\`\`
flatpak remote-add --user JagexLauncher ${JAGEX_LAUNCHER_FLATPAK_REPO}
flatpak install --user JagexLauncher com.jagex.Launcher
\`\`\`

After installation, restart RS3 Launcher Buddy to detect it.`;
    }
  }

  return 'Jagex Launcher installation is not supported on this platform.';
}
