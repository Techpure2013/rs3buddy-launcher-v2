/**
 * Developer SDK Module (main process)
 *
 * Powers the "SDK" launcher tab: lets a developer fetch the rs3buddy client
 * library manifest and download + extract the client package for their language.
 *
 * Network + extraction reuse the launcher's existing infrastructure:
 *   - redirect-following HTTP from ./engine/engine-download
 *   - zip extraction via the already-bundled `extract-zip` dependency
 *     (same library used by ./engine/index.ts for the engine auto-updater).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import extract from 'extract-zip';
import { fetchText, downloadFile } from './engine/engine-download';

// ============================================================================
// CONFIGURE ME: public clients manifest URL
// ----------------------------------------------------------------------------
// Set this to the public release URL of `clients-manifest.json` (the file that
// lists each language client + its zip). The per-client zip is resolved RELATIVE
// to this URL (same directory + the entry's `file`), so the manifest and the
// zips must be published side-by-side.
//
// Override at runtime (dev / mirror / proxy) with RS3B_CLIENTS_MANIFEST_URL.
//
// PLACEHOLDER — replace with the real URL before shipping.
// ============================================================================
export const MANIFEST_URL =
  process.env.RS3B_CLIENTS_MANIFEST_URL ??
  'https://github.com/Techpure2013/rs3buddy-clients/releases/latest/download/clients-manifest.json';

/** A single language client entry in the manifest. */
export interface ClientManifestEntry {
  id: string;
  label: string;
  file: string;
  bytes?: number;
  sha256?: string;
  install: string;
  snippet: string;
}

/** The clients manifest shape (schemaVersion 1). */
export interface ClientsManifest {
  schemaVersion: number;
  clientsVersion: string;
  generatedAt?: string;
  clients: ClientManifestEntry[];
}

/** Result of a client download+extract. */
export interface SdkDownloadResult {
  success: boolean;
  /** Absolute path of the folder the client was extracted into. */
  folder?: string;
  error?: string;
}

/** True if MANIFEST_URL is still the documented placeholder. */
export function isManifestUrlPlaceholder(): boolean {
  return MANIFEST_URL.includes('example.com');
}

/**
 * Resolve a manifest entry's `file` to an absolute zip URL: same directory as
 * MANIFEST_URL + the file name. Uses the URL constructor so query strings and
 * nested paths in the manifest URL are handled correctly.
 *
 * Exported for testability of the resolution logic.
 */
export function resolveClientZipUrl(manifestUrl: string, file: string): string {
  // `new URL(file, base)` resolves `file` relative to the base's directory.
  // e.g. base ".../releases/clients-manifest.json" + "rs3buddy-python.zip"
  //   -> ".../releases/rs3buddy-python.zip"
  return new URL(file, manifestUrl).toString();
}

/** Minimal runtime validation that a parsed object matches the manifest shape. */
export function validateManifest(data: unknown): ClientsManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Manifest is not a JSON object');
  }
  const m = data as Partial<ClientsManifest>;
  if (!Array.isArray(m.clients)) {
    throw new Error('Manifest is missing a "clients" array');
  }
  if (typeof m.clientsVersion !== 'string') {
    throw new Error('Manifest is missing "clientsVersion"');
  }
  // Keep only well-formed entries so one bad row doesn't break the whole tab.
  const clients = m.clients.filter(
    (c): c is ClientManifestEntry =>
      !!c &&
      typeof c.id === 'string' &&
      typeof c.label === 'string' &&
      typeof c.file === 'string' &&
      typeof c.install === 'string' &&
      typeof c.snippet === 'string',
  );
  return {
    schemaVersion: typeof m.schemaVersion === 'number' ? m.schemaVersion : 1,
    clientsVersion: m.clientsVersion,
    generatedAt: typeof m.generatedAt === 'string' ? m.generatedAt : undefined,
    clients,
  };
}

/**
 * Fetch + parse + validate the clients manifest. Throws a friendly Error if the
 * URL is unset, unreachable, or the payload is malformed.
 */
export async function fetchClientsManifest(): Promise<ClientsManifest> {
  if (isManifestUrlPlaceholder()) {
    throw new Error(
      'The clients manifest URL is not configured yet. Set MANIFEST_URL in launcher/src/sdk.ts (or RS3B_CLIENTS_MANIFEST_URL).',
    );
  }
  let text: string;
  try {
    text = await fetchText(MANIFEST_URL);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach the clients manifest (${msg}). You may be offline.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The clients manifest is not valid JSON.');
  }
  return validateManifest(parsed);
}

/**
 * Download the zip for a manifest entry and extract it into `destDir`.
 * Reports progress (0..1) via the optional callback. The zip is downloaded to a
 * temp file first, extracted, then the temp file is removed.
 */
export async function downloadAndExtractClient(
  entry: ClientManifestEntry,
  destDir: string,
  onProgress?: (fraction: number) => void,
): Promise<SdkDownloadResult> {
  if (isManifestUrlPlaceholder()) {
    return {
      success: false,
      error: 'The clients manifest URL is not configured yet.',
    };
  }
  if (!destDir) {
    return { success: false, error: 'No destination folder was chosen.' };
  }

  const zipUrl = resolveClientZipUrl(MANIFEST_URL, entry.file);
  // Unique temp file so concurrent downloads can't clobber each other.
  const tmpZip = path.join(
    os.tmpdir(),
    `rs3buddy-client-${entry.id}-${Date.now()}.zip`,
  );

  try {
    fs.mkdirSync(destDir, { recursive: true });

    await downloadFile(zipUrl, tmpZip, (f) => onProgress?.(f));

    // extract-zip (2.0.1) — same library the engine updater uses.
    await extract(tmpZip, { dir: destDir });

    return { success: true, folder: destDir };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Download or extract failed: ${msg}` };
  } finally {
    fs.rm(tmpZip, { force: true }, () => {
      /* best-effort temp cleanup */
    });
  }
}
