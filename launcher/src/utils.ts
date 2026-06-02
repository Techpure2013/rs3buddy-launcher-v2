import { getNet } from './electron';
import type { InstalledApp } from './types';

// Response type for net.request
interface NetResponse {
  statusCode: number;
  on(event: 'data', listener: (chunk: Buffer) => void): void;
  on(event: 'end', listener: () => void): void;
}

// Check if a URL is absolute (has protocol)
function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^localhost/i.test(url) || /^127\.0\.0\.1/i.test(url);
}

// Normalize localhost/127.0.0.1 URL to have http:// prefix
function normalizeUrl(url: string): string {
  // Add http:// to localhost or 127.0.0.1 URLs without protocol
  if (/^localhost(:\d+)?/i.test(url) || /^127\.0\.0\.1(:\d+)?/i.test(url)) {
    return 'http://' + url;
  }
  return url;
}

// Fetch app config from URL (supports localhost for development)
export async function fetchAppConfig(url: string): Promise<InstalledApp> {
  const net = getNet();
  const normalizedUrl = normalizeUrl(url);

  return new Promise((resolve, reject) => {
    const request = net.request(normalizedUrl);
    let data = '';

    request.on('response', (response: NetResponse) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk: Buffer) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          // Check if response looks like HTML instead of JSON
          const trimmed = data.trim();
          if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
            reject(new Error('Server returned HTML instead of JSON. Check that the URL points to an appconfig.json file.'));
            return;
          }

          if (!trimmed) {
            reject(new Error('Server returned empty response'));
            return;
          }

          const config = JSON.parse(data) as InstalledApp;

          // Validate required fields
          if (!config.appName) {
            reject(new Error('Invalid app config: missing appName'));
            return;
          }

          // Resolve relative URLs against the config URL base
          const baseUrl = normalizedUrl.substring(0, normalizedUrl.lastIndexOf('/') + 1);

          if (config.iconUrl && !isAbsoluteUrl(config.iconUrl)) {
            config.iconUrl = baseUrl + config.iconUrl;
          }
          if (config.appUrl && !isAbsoluteUrl(config.appUrl)) {
            config.appUrl = baseUrl + config.appUrl;
          }

          // Store the original URL as configUrl
          config.configUrl = url;

          resolve(config);
        } catch (e) {
          // Provide clearer error for JSON parse failures
          if (e instanceof SyntaxError) {
            reject(new Error('Invalid JSON in app config. Make sure the URL returns valid JSON.'));
          } else {
            reject(e);
          }
        }
      });
    });

    request.on('error', (err) => {
      // Provide helpful error for localhost connection refused
      if (err.message?.includes('ECONNREFUSED')) {
        reject(new Error(`Cannot connect to ${url}. Is your dev server running?`));
      } else {
        reject(err);
      }
    });
    request.end();
  });
}

// Format session ID for display (truncated)
export function formatSessionId(sessionId: string | undefined, length: number = 20): string {
  if (!sessionId) return 'N/A';
  if (sessionId.length <= length) return sessionId;
  return sessionId.substring(0, length) + '...';
}

// Format error for logging
export function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

// Check if running on Windows
export function isWindows(): boolean {
  return process.platform === 'win32';
}

// Check if running on macOS
export function isMac(): boolean {
  return process.platform === 'darwin';
}

// Check if running on Linux
export function isLinux(): boolean {
  return process.platform === 'linux';
}
