// Item API Client - connects to server for item persistence

const PRODUCTION_API_BASE = "https://www.techpure.dev/api";
const LOCAL_API_BASE = "http://localhost:42069/api";
let apiBase = PRODUCTION_API_BASE;

export function setItemApiBase(url: string) { apiBase = url.replace(/\/$/, ""); }
export function getItemApiBase(): string { return apiBase; }
export function setLocal() { setItemApiBase(LOCAL_API_BASE); }
export function setProduction() { setItemApiBase(PRODUCTION_API_BASE); }
export function isLocal(): boolean { return apiBase === LOCAL_API_BASE; }

export interface LearnedItemPayload {
  name: string;
  pHash: string;
}

export interface PersistedItem {
  id: number;
  name: string;
  pHash: string;
  firstSeen?: string;
  createdAt?: string;
}

// Batch queue for debounced persistence
const batchQueue: LearnedItemPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;
const BATCH_SIZE = 10;

export function queueItem(item: LearnedItemPayload): void {
  if (!item.pHash || item.pHash.length !== 32) return;
  // Deduplicate
  if (batchQueue.some(q => q.pHash === item.pHash)) return;
  batchQueue.push(item);

  if (batchQueue.length >= BATCH_SIZE) {
    flushQueue();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushQueue, DEBOUNCE_MS);
  }
}

export async function flushQueue(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (batchQueue.length === 0) return;

  const batch = batchQueue.splice(0, BATCH_SIZE);
  try {
    const response = await fetch(`${apiBase}/items/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batch }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(`[ItemApi] Batch failed: ${response.status}`);
    }
  } catch (e) {
    console.warn("[ItemApi] Batch persist failed:", e);
  }

  // If more items queued, schedule next flush
  if (batchQueue.length > 0) {
    flushTimer = setTimeout(flushQueue, DEBOUNCE_MS);
  }
}

export async function lookupItemByPHash(pHash: string): Promise<PersistedItem | null> {
  try {
    const response = await fetch(`${apiBase}/items/${encodeURIComponent(pHash)}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function isApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/items?limit=1`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAllItems(limit: number = 500): Promise<PersistedItem[]> {
  try {
    const response = await fetch(`${apiBase}/items?limit=${limit}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.items || [];
  } catch {
    return [];
  }
}
