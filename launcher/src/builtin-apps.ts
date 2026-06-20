/**
 * Built-in app static server (main process).
 *
 * The launcher ships a handful of first-party web apps (e.g. Sentinel) under a
 * `builtin-apps/` directory. Rather than requiring the user to run an external
 * dev server (the old `npx serve -l 3100` flow), the launcher serves that
 * directory itself from a tiny loopback HTTP server started at launch.
 *
 *   GET http://127.0.0.1:3100/sentinel/index.html
 *     -> <builtin-apps-root>/sentinel/index.html
 *
 * Implemented with only Node's built-in `http` + `fs` (no extra dependencies).
 * The app-window config (see config.ts HTTP_APPS) points the Sentinel entry at
 * http://127.0.0.1:3100/sentinel/index.html, so the apps are available with no
 * external server.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { getApp } from './electron';

/** Loopback host + port the built-in app server binds to. */
const HOST = '127.0.0.1';
const PORT = 3100;

/** MIME types for the static assets we serve. Unknown types fall back to octet-stream. */
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let server: http.Server | null = null;
let resolvedRoot: string | null = null;

/**
 * Resolve the built-in apps root directory robustly across dev + packaged
 * layouts. Returns the first candidate that exists, in priority order:
 *   1. RS3BUDDY_BUILTIN_APPS env override (local dev / testing)
 *   2. <appPath>/builtin-apps                 (dev: appPath = launcher/)
 *   3. <appPath>/../builtin-apps              (repo-root fallback)
 *   4. <resourcesPath>/builtin-apps           (packaged: extraResources)
 *   5. <__dirname>/builtin-apps               (dist-relative fallback)
 *   6. <__dirname>/../builtin-apps            (dist/.. = launcher/, dev fallback)
 */
function resolveBuiltinAppsRoot(): string | null {
  const candidates: string[] = [];

  if (process.env.RS3BUDDY_BUILTIN_APPS) {
    candidates.push(process.env.RS3BUDDY_BUILTIN_APPS);
  }

  let appPath = '';
  try {
    appPath = getApp().getAppPath();
  } catch {
    // app may not be ready / available — fall through to the other candidates.
  }
  if (appPath) {
    candidates.push(path.join(appPath, 'builtin-apps'));
    candidates.push(path.join(appPath, '..', 'builtin-apps'));
  }

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'builtin-apps'));
  }

  candidates.push(path.join(__dirname, 'builtin-apps'));
  candidates.push(path.join(__dirname, '..', 'builtin-apps'));

  for (const dir of candidates) {
    try {
      if (dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir;
      }
    } catch {
      // ignore and try the next candidate
    }
  }
  return null;
}

/** Map a file extension to a Content-Type. */
function contentTypeFor(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * Start the built-in app static server on 127.0.0.1:3100.
 *
 * Safe to call once at startup. If the port is already in use (e.g. a previous
 * launcher instance or a stray `serve`), it logs a warning and does NOT crash —
 * the existing server presumably already serves the same content.
 */
export function startBuiltinAppServer(): void {
  if (server) {
    console.log('[BuiltinApps] Server already running');
    return;
  }

  resolvedRoot = resolveBuiltinAppsRoot();
  if (!resolvedRoot) {
    console.warn('[BuiltinApps] No builtin-apps directory found — not starting server. ' +
      'Looked relative to appPath, resourcesPath, and __dirname.');
    return;
  }
  console.log(`[BuiltinApps] Serving built-in apps from: ${resolvedRoot}`);

  const root = resolvedRoot;

  server = http.createServer((req, res) => {
    // Permissive CORS so the served apps (and any SDK consumer) can fetch freely.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    // Parse + decode the pathname only (drop query string / hash).
    let pathname = '/';
    try {
      pathname = decodeURIComponent(new URL(req.url || '/', `http://${HOST}:${PORT}`).pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    // Resolve against the root and guard against path traversal.
    const safeRel = path.normalize(pathname).replace(/^([/\\])+/, '');
    const fullPath = path.join(root, safeRel);
    const normalizedRoot = path.normalize(root + path.sep);
    if (!path.normalize(fullPath + path.sep).startsWith(normalizedRoot) &&
        path.normalize(fullPath) !== path.normalize(root)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(fullPath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      res.setHeader('Content-Type', contentTypeFor(fullPath));
      res.setHeader('Content-Length', String(stat.size));
      // Built-in apps update with the launcher, not at runtime — don't let the
      // webview cache a stale index.html/app.js across updates.
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

      if (req.method === 'HEAD') {
        res.writeHead(200);
        res.end();
        return;
      }

      res.writeHead(200);
      const stream = fs.createReadStream(fullPath);
      stream.on('error', () => {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      stream.pipe(res);
    });
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[BuiltinApps] Port ${PORT} already in use — not starting a second server. ` +
        'Built-in apps will be served by the existing listener.');
    } else {
      console.error('[BuiltinApps] Server error:', err);
    }
    // Never let a server error take down the launcher.
    server = null;
  });

  server.listen(PORT, HOST, () => {
    console.log(`[BuiltinApps] Listening on http://${HOST}:${PORT}/`);
  });
}

/** Stop the built-in app server (called from the quit/cleanup path). */
export function stopBuiltinAppServer(): void {
  if (!server) return;
  try {
    server.close();
    console.log('[BuiltinApps] Server stopped');
  } catch (e) {
    console.error('[BuiltinApps] Error stopping server:', e);
  }
  server = null;
  resolvedRoot = null;
}
