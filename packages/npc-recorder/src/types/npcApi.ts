// NPC API Client - connects to RS3QuestBuddyServer
import {
  NpcDbEntry,
  NpcSearchResult,
  NpcSearchResultGrouped,
  NpcHashLookupResult,
  NpcBatchLookupResult,
  NpcHashVariant,
  NpcVariantSearchResult,
  CreateNpcPayload,
} from "./npcTypes";

// Server URLs
const PRODUCTION_API_BASE = "https://www.techpure.dev/api";
const LOCAL_API_BASE = "http://localhost:42069/api";
const DEFAULT_API_BASE = PRODUCTION_API_BASE;

export interface NpcApiClient {
  /** Search NPCs by name (min 2 chars) */
  searchNpcs(query: string, limit?: number): Promise<NpcSearchResult[]>;

  /** Search NPCs by name, grouped by NPC id */
  searchByNameGrouped(query: string, limit?: number): Promise<NpcSearchResultGrouped[]>;

  /** Get NPC by ID */
  getNpcById(id: number): Promise<NpcDbEntry | null>;

  /** Get NPC by ID (alias) */
  getById(id: number): Promise<NpcDbEntry | null>;

  /** Create a new NPC */
  createNpc(payload: CreateNpcPayload): Promise<NpcDbEntry | null>;

  /** Lookup NPC by buffer hash */
  lookupByBufferHash(hash: string): Promise<NpcHashLookupResult>;

  /** Batch lookup NPCs by buffer hashes (max 100) */
  batchLookupByHash(hashes: string[]): Promise<NpcBatchLookupResult>;

  /** Add location to an NPC (auto-creates if npcName provided) */
  addLocation(
    npcId: number,
    location: { lat: number; lng: number; floor?: number },
    npcName?: string
  ): Promise<{ success: boolean; created?: boolean }>;

  /** Update buffer hash for an NPC */
  updateBufferHash(npcId: number, bufferHash: string): Promise<boolean>;

  /** Add a hash variant for an NPC */
  addVariant(
    opts: { npcId: number; bufferHash: string; variantName?: string }
  ): Promise<{ success: boolean }>;

  /** List all variants for an NPC */
  getVariants(npcId: number): Promise<{ variants: NpcHashVariant[]; next_variant_name: string }>;

  /** Search NPCs with their variants by name */
  searchVariantsByName(query: string, limit?: number): Promise<NpcVariantSearchResult[]>;

  /** Delete a variant by hash */
  deleteVariant(hash: string): Promise<boolean>;

  /** Submit NPC data (create + set buffer hash) */
  submitNpcData(opts: {
    npcId: number;
    name: string;
    bufferHash: string;
  }): Promise<{ success: boolean }>;

  /** Submit NPC data (legacy compat - calls createNpc) */
  submitNpc(entry: NpcDbEntry): Promise<boolean>;
}

let apiClient: NpcApiClient | null = null;
let apiBase = DEFAULT_API_BASE;

export function setApiBase(url: string): void {
  apiBase = url.replace(/\/$/, "");
  apiClient = null; // Force recreation
}

export function getApiBase(): string {
  return apiBase;
}

export function setLocal(): void {
  setApiBase(LOCAL_API_BASE);
}

export function setProduction(): void {
  setApiBase(PRODUCTION_API_BASE);
}

export function isLocal(): boolean {
  return apiBase === LOCAL_API_BASE;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export function getNpcApiClient(): NpcApiClient {
  if (!apiClient) {
    apiClient = {
      async searchNpcs(
        query: string,
        limit: number = 100
      ): Promise<NpcSearchResult[]> {
        try {
          const params = new URLSearchParams({ name: query, limit: String(limit) });
          return await fetchJson<NpcSearchResult[]>(
            `${apiBase}/npcs?${params}`
          );
        } catch (e) {
          console.warn("[NpcApi] searchNpcs failed:", e);
          return [];
        }
      },

      async searchByNameGrouped(
        query: string,
        limit: number = 500
      ): Promise<NpcSearchResultGrouped[]> {
        const params = new URLSearchParams({ name: query, limit: String(limit) });
        const flat = await fetchJson<NpcSearchResult[]>(
          `${apiBase}/npcs?${params}`
        );
        console.log(`[NpcApi] searchByNameGrouped: got ${flat.length} flat results for "${query}" (limit=${limit})`);
        // Group by NPC id
        const byId = new Map<number, NpcSearchResult[]>();
        for (const r of flat) {
          const arr = byId.get(r.id) || [];
          arr.push(r);
          byId.set(r.id, arr);
        }
        return Array.from(byId.values()).map((entries) => ({
          entries,
          total: entries.length,
        }));
      },

      async getNpcById(id: number): Promise<NpcDbEntry | null> {
        try {
          return await fetchJson<NpcDbEntry>(`${apiBase}/npcs/${id}`);
        } catch (e) {
          console.warn("[NpcApi] getNpcById failed:", e);
          return null;
        }
      },

      async getById(id: number): Promise<NpcDbEntry | null> {
        return this.getNpcById(id);
      },

      async createNpc(payload: CreateNpcPayload): Promise<NpcDbEntry | null> {
        try {
          return await fetchJson<NpcDbEntry>(`${apiBase}/npcs`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } catch (e) {
          console.warn("[NpcApi] createNpc failed:", e);
          return null;
        }
      },

      async lookupByBufferHash(hash: string): Promise<NpcHashLookupResult> {
        try {
          return await fetchJson<NpcHashLookupResult>(
            `${apiBase}/npcs/lookup/hash/${encodeURIComponent(hash)}`
          );
        } catch (e) {
          console.warn("[NpcApi] lookupByBufferHash failed:", e);
          return { found: false };
        }
      },

      async batchLookupByHash(hashes: string[]): Promise<NpcBatchLookupResult> {
        try {
          return await fetchJson<NpcBatchLookupResult>(
            `${apiBase}/npcs/lookup/batch`,
            {
              method: "POST",
              body: JSON.stringify({ hashes }),
            }
          );
        } catch (e) {
          console.warn("[NpcApi] batchLookupByHash failed:", e);
          return { results: [] };
        }
      },

      async addLocation(
        npcId: number,
        location: { lat: number; lng: number; floor?: number },
        npcName?: string
      ): Promise<{ success: boolean; created?: boolean }> {
        try {
          return await fetchJson(`${apiBase}/npcs/${npcId}/locations`, {
            method: "POST",
            body: JSON.stringify({ ...location, npcName }),
          });
        } catch (e) {
          console.warn("[NpcApi] addLocation failed:", e);
          return { success: false };
        }
      },

      async updateBufferHash(
        npcId: number,
        bufferHash: string
      ): Promise<boolean> {
        try {
          await fetchJson(`${apiBase}/npcs/${npcId}/buffer-hash`, {
            method: "POST",
            body: JSON.stringify({ buffer_hash: bufferHash }),
          });
          return true;
        } catch (e) {
          console.warn("[NpcApi] updateBufferHash failed:", e);
          return false;
        }
      },

      async addVariant(
        opts: { npcId: number; bufferHash: string; variantName?: string }
      ): Promise<{ success: boolean }> {
        try {
          await fetchJson<NpcHashVariant>(
            `${apiBase}/npcs/${opts.npcId}/variants`,
            {
              method: "POST",
              body: JSON.stringify({
                buffer_hash: opts.bufferHash,
                variant_name: opts.variantName,
              }),
            }
          );
          return { success: true };
        } catch (e) {
          console.warn("[NpcApi] addVariant failed:", e);
          return { success: false };
        }
      },

      async getVariants(npcId: number): Promise<{ variants: NpcHashVariant[]; next_variant_name: string }> {
        try {
          const res = await fetchJson<{ variants: NpcHashVariant[]; next_variant_name: string }>(
            `${apiBase}/npcs/${npcId}/variants`
          );
          return { variants: res.variants, next_variant_name: res.next_variant_name };
        } catch (e) {
          console.warn("[NpcApi] getVariants failed:", e);
          return { variants: [], next_variant_name: "Variant 1" };
        }
      },

      async searchVariantsByName(
        query: string,
        limit: number = 50
      ): Promise<NpcVariantSearchResult[]> {
        try {
          const params = new URLSearchParams({ name: query, limit: String(limit) });
          return await fetchJson<NpcVariantSearchResult[]>(
            `${apiBase}/npcs/variants/search?${params}`
          );
        } catch (e) {
          console.warn("[NpcApi] searchVariantsByName failed:", e);
          return [];
        }
      },

      async deleteVariant(hash: string): Promise<boolean> {
        try {
          await fetchJson(
            `${apiBase}/npcs/variants/${encodeURIComponent(hash)}`,
            { method: "DELETE" }
          );
          return true;
        } catch (e) {
          console.warn("[NpcApi] deleteVariant failed:", e);
          return false;
        }
      },

      async submitNpcData(opts: {
        npcId: number;
        name: string;
        bufferHash: string;
      }): Promise<{ success: boolean }> {
        try {
          // Try to create the NPC first
          const created = await this.createNpc({
            id: opts.npcId,
            name: opts.name,
            buffer_hash: opts.bufferHash,
          });
          if (created) return { success: true };

          // If NPC already exists (409), just update the buffer hash
          const updated = await this.updateBufferHash(opts.npcId, opts.bufferHash);
          return { success: updated };
        } catch (e) {
          console.warn("[NpcApi] submitNpcData failed:", e);
          return { success: false };
        }
      },

      async submitNpc(entry: NpcDbEntry): Promise<boolean> {
        // Legacy compat - wraps createNpc
        try {
          const result = await this.createNpc({
            id: entry.id,
            name: entry.name,
            buffer_hash: entry.buffer_hash,
          });
          return result !== null;
        } catch {
          return false;
        }
      },
    };
  }
  return apiClient;
}
