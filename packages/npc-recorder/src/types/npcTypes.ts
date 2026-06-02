// NPC Types - matching RS3QuestBuddyServer database schema

export interface NpcDbEntry {
  id: number;
  name: string;
  models?: number[];
  head_models?: number[];
  color_replacements?: [number, number][];
  material_replacements?: [number, number][];
  actions?: Array<Record<string, string>>;
  action_cursors?: Array<Record<string, number>>;
  location?: Array<{ lat: number; lng: number; floor: number }>;
  npc_combat_level?: number[];
  animation_group?: number[];
  movement_capabilities?: number[];
  bound_size?: number;
  buffer_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NpcSearchResult {
  id: number;
  name: string;
  lat: number;
  lng: number;
  floor: number;
}

export interface NpcSearchResultGrouped {
  entries: NpcSearchResult[];
  total: number;
}

export interface NpcHashLookupResult {
  found: boolean;
  npc?: NpcDbEntry;
  matchType?: "buffer_hash" | "variant";
  variant_name?: string | null;
}

export interface NpcBatchLookupResult {
  results: Array<{
    hash: string;
    found: boolean;
    npc?: NpcDbEntry;
    matchType?: "buffer_hash" | "variant";
    variant_name?: string | null;
  }>;
}

export interface NpcHashVariant {
  id: number;
  npc_id: number;
  buffer_hash: string;
  variant_name?: string | null;
  created_at?: string;
}

export interface NpcVariantSearchResult {
  npc_id: number;
  npc_name: string;
  buffer_hash: string | null;
  variant_count: number;
  variants: Array<{
    id: number;
    buffer_hash: string;
    variant_name: string | null;
    created_at: string;
  }>;
}

export interface NpcMeshGroupInfo {
  hashId: string;
  meshCount: number;
  combinedHash: string;
}

export interface CreateNpcPayload {
  id: number;
  name: string;
  models?: number[];
  headModels?: number[];
  color_replacements?: [number, number][];
  material_replacements?: [number, number][];
  actions?: Array<Record<string, string>>;
  action_cursors?: Array<Record<string, number>>;
  location?: Array<{ lat: number; lng: number; floor?: number }>;
  npc_combat_level?: number[];
  animation_group?: number[];
  movement_capabilities?: number[];
  bound_size?: number;
  buffer_hash?: string;
}
