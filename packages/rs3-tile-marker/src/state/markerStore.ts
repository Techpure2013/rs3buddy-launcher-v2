/**
 * MarkerStore - Immer-based singleton store following RS3QuestMapBuddy pattern
 */

import { get, set } from "idb-keyval";
import { produce, Draft } from "immer";
import type {
  MarkerState,
  DerivedSelectors,
  SelectionState,
  UiState,
  TileMarker,
  PlayerPosition,
  MarkerGroup,
  InstanceContext,
  InstanceMarkerContext,
} from "./model";

type Listener = (changedKeys: ReadonlySet<string>, next: MarkerState) => void;
type RawListener = () => void;

const STORAGE_KEY = "rs3tm:marker_state:v4";
const CURRENT_VERSION = 4;

const DEFAULT_GROUP: MarkerGroup = {
  id: "default",
  name: "Default",
  color: "#ff4444",
  visible: true,
};

const initialState: MarkerState = {
  version: CURRENT_VERSION,
  markers: [],
  groups: [DEFAULT_GROUP],
  selection: {
    floor: 0,
    selectedMarkerId: null,
    activeGroupId: "default",
  },
  ui: {
    panelOpen: true,
    lowProfileMode: true,
    followPlayer: true,
    showGrid: false,
    defaultColor: "#ff4444",
    clickToAddMode: true,
    showOverlayGrid: false,
    showOverlayCollision: false,
  },
  playerPosition: null,
  instanceOffset: null,
  meshMappings: [],
  currentInstance: null,
  knownInstances: [],
};

let state: MarkerState = initialState;
const listeners = new Set<Listener>();
const rawListeners = new Set<RawListener>();

// Memoization cache for visibleMarkersForMap to prevent infinite re-render loops
// with useSyncExternalStore (getSnapshot must return stable references).
// We cache both inputs (for fast invalidation) and the previous result
// (for deep comparison to return the same array ref when output is equivalent).
let _mapMarkersCache: {
  markers: TileMarker[];
  groups: MarkerGroup[];
  floor: number;
  currentInstance: InstanceContext | null;
  result: TileMarker[];
} | null = null;

function arraysDeepEqual(a: TileMarker[], b: TileMarker[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i], mb = b[i];
    if (ma.id !== mb.id || ma.x !== mb.x || ma.y !== mb.y ||
        ma.floor !== mb.floor || ma.color !== mb.color ||
        ma.label !== mb.label || ma.groupId !== mb.groupId) return false;
  }
  return true;
}

// Debounced persistence
let persistTimer: number | null = null;
const schedulePersist = () => {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void set(STORAGE_KEY, JSON.stringify(state));
    persistTimer = null;
  }, 150);
};

function migrate(raw: MarkerState): MarkerState {
  if (!raw || typeof raw.version !== "number") return initialState;

  // Migrate: merge with initialState to add new fields
  const migrated: MarkerState = {
    ...initialState,
    ...raw,
    version: CURRENT_VERSION,
    // Deep merge nested objects to preserve new fields
    selection: { ...initialState.selection, ...raw.selection },
    ui: { ...initialState.ui, ...raw.ui },
  };

  // Migrate from v1 to v2 (add groups)
  if (!migrated.groups || migrated.groups.length === 0) {
    migrated.groups = [DEFAULT_GROUP];
  }
  if (!migrated.selection.activeGroupId) {
    migrated.selection.activeGroupId = "default";
  }
  // Assign ungrouped markers to default group
  migrated.markers = migrated.markers.map(m => ({
    ...m,
    groupId: m.groupId || "default",
  }));

  // Migrate from v2 to v3 (add instance support)
  if (!migrated.currentInstance) {
    migrated.currentInstance = null;
  }
  if (!migrated.knownInstances) {
    migrated.knownInstances = [];
  }
  // Existing markers without instanceContext are main map markers
  migrated.markers = migrated.markers.map(m => ({
    ...m,
    instanceContext: m.instanceContext ?? null,
  }));

  // Migrate from v3 to v4 (fingerprint -> entrance-linking)
  if (raw.version <= 3) {
    // Migrate marker instanceContexts: rename fields
    migrated.markers = migrated.markers.map(m => {
      if (!m.instanceContext) return m;
      const oldCtx = m.instanceContext as any;
      return {
        ...m,
        instanceContext: {
          entranceKey: oldCtx.instanceFingerprint ?? oldCtx.entranceKey ?? '',
          instanceLabel: oldCtx.instanceLabel ?? '',
          entryTileX: oldCtx.originX ?? oldCtx.entryTileX ?? 0,
          entryTileZ: oldCtx.originZ ?? oldCtx.entryTileZ ?? 0,
        },
      };
    });

    // Migrate knownInstances: rename fields
    migrated.knownInstances = migrated.knownInstances.map((k: any) => ({
      entranceKey: k.instanceFingerprint ?? k.entranceKey ?? '',
      instanceLabel: k.instanceLabel ?? '',
      entryTileX: k.originX ?? k.entryTileX ?? 0,
      entryTileZ: k.originZ ?? k.entryTileZ ?? 0,
    }));

    // Migrate currentInstance if present
    if (migrated.currentInstance) {
      const oldInst = migrated.currentInstance as any;
      migrated.currentInstance = {
        isInstance: oldInst.isInstance ?? false,
        minTileX: oldInst.minTileX ?? 0,
        minTileZ: oldInst.minTileZ ?? 0,
        maxTileX: oldInst.maxTileX ?? 0,
        maxTileZ: oldInst.maxTileZ ?? 0,
        entranceX: oldInst.originX ?? oldInst.entranceX ?? 0,
        entranceZ: oldInst.originZ ?? oldInst.entranceZ ?? 0,
        entryTileX: oldInst.originX ?? oldInst.entryTileX ?? 0,
        entryTileZ: oldInst.originZ ?? oldInst.entryTileZ ?? 0,
        label: oldInst.label ?? null,
        entranceKey: oldInst.chunkFingerprint ?? oldInst.entranceKey ?? '',
        detectedAt: oldInst.detectedAt ?? Date.now(),
      };
    }
  }

  return migrated;
}

const isEqualShallow = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null)
    return false;
  const ak = Object.keys(a as Record<string, unknown>);
  const bk = Object.keys(b as Record<string, unknown>);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
};

function generateId(prefix: string = "marker"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const MarkerStore = {
  // Load from IDB at app boot
  async initialize(): Promise<void> {
    try {
      let raw = await get<string>(STORAGE_KEY);
      // Fall back to v3 storage key for migration
      if (!raw) {
        raw = await get<string>("rs3tm:marker_state:v3");
      }
      if (!raw) return;
      const parsed = JSON.parse(raw) as MarkerState;
      state = migrate(parsed);
    } catch {
      // ignore; keep initial
    }
  },

  getState(): MarkerState {
    return state;
  },

  // Derived selectors that compute on demand (not persisted)
  derived: {
    selectedMarker(): TileMarker | undefined {
      const { markers, selection } = state;
      if (!selection.selectedMarkerId) return undefined;
      return markers.find((m) => m.id === selection.selectedMarkerId);
    },
    markersOnCurrentFloor(): TileMarker[] {
      const { markers, selection } = state;
      return markers.filter((m) => m.floor === selection.floor);
    },
    activeGroup(): MarkerGroup | undefined {
      const { groups, selection } = state;
      return groups.find((g) => g.id === selection.activeGroupId);
    },
    visibleMarkersOnCurrentFloor(): TileMarker[] {
      const { markers, groups, selection } = state;
      const visibleGroupIds = new Set(groups.filter(g => g.visible).map(g => g.id));
      return markers.filter((m) =>
        m.floor === selection.floor &&
        visibleGroupIds.has(m.groupId || "default")
      );
    },
    visibleMarkersForMap(): TileMarker[] {
      const { markers, groups, selection, currentInstance } = state;

      // Fast path: if all input refs unchanged, return cached result
      if (
        _mapMarkersCache &&
        _mapMarkersCache.markers === markers &&
        _mapMarkersCache.groups === groups &&
        _mapMarkersCache.floor === selection.floor &&
        _mapMarkersCache.currentInstance === currentInstance
      ) {
        return _mapMarkersCache.result;
      }

      const visibleGroupIds = new Set(groups.filter(g => g.visible).map(g => g.id));
      const isInstance = currentInstance?.isInstance ?? false;
      const entranceKey = currentInstance?.entranceKey ?? '';

      const filtered = markers.filter((m) => {
        const floorMatch = m.floor === selection.floor;
        const groupMatch = visibleGroupIds.has(m.groupId || "default");

        if (!floorMatch || !groupMatch) {
          return false;
        }

        if (isInstance) {
          if (!m.instanceContext) {
            return false;
          }
          const keyMatch = entranceKey && m.instanceContext.entranceKey === entranceKey;
          return keyMatch;
        } else {
          if (m.instanceContext) {
            return false;
          }
          return true;
        }
      });

      // Resolve instance marker coords to absolute for map display
      let result: TileMarker[];
      if (isInstance && currentInstance) {
        result = filtered.map(m => {
          if (m.instanceContext) {
            const absX = m.x + currentInstance.entryTileX;
            const absY = m.y + currentInstance.entryTileZ;
            return {
              ...m,
              x: absX,
              y: absY,
            };
          }
          return m;
        });
      } else {
        result = filtered;
      }

      // Deep compare output: return previous result ref if contents are identical
      // This prevents useSyncExternalStore infinite loops when inputs change
      // but computed output is the same (e.g. currentInstance ref changes but
      // origin coords are the same, producing identical resolved markers)
      if (_mapMarkersCache && arraysDeepEqual(_mapMarkersCache.result, result)) {
        _mapMarkersCache = { markers, groups, floor: selection.floor, currentInstance, result: _mapMarkersCache.result };
        return _mapMarkersCache.result;
      }

      _mapMarkersCache = { markers, groups, floor: selection.floor, currentInstance, result };
      return result;
    },
    isInInstance(): boolean {
      return state.currentInstance?.isInstance ?? false;
    },
    instanceMarkers(): TileMarker[] {
      return state.markers.filter(m => m.instanceContext != null);
    },
    mainMapMarkers(): TileMarker[] {
      return state.markers.filter(m => !m.instanceContext);
    },
    currentInstanceLabel(): string | null {
      return state.currentInstance?.label ?? null;
    },
  } as DerivedSelectors,

  // Subscribe to specific slices to minimize re-renders
  subscribe<T>(
    selector: (s: MarkerState, d: DerivedSelectors) => T,
    cb: (value: T) => void
  ): () => void {
    let last = selector(state, this.derived);
    cb(last);
    const listener: Listener = (_changed, next) => {
      const selected = selector(next, this.derived);
      if (!isEqualShallow(selected as unknown, last as unknown)) {
        last = selected;
        cb(selected);
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Subscribe to any state change (for useSyncExternalStore)
  subscribeRaw(cb: () => void): () => void {
    rawListeners.add(cb);
    return () => rawListeners.delete(cb);
  },

  // Low-level update API with Immer recipe
  update(recipe: (draft: Draft<MarkerState>) => void, changedKeys?: string[]) {
    const next = produce(state, recipe);
    if (next === state) return;
    state = next;

    schedulePersist();
    const changed = new Set<string>(changedKeys ?? []);
    for (const l of Array.from(listeners)) l(changed, state);
    for (const l of Array.from(rawListeners)) l();
  },

  // Convenience setters
  setSelection(patch: Partial<SelectionState>) {
    this.update(
      (draft) => {
        draft.selection = { ...draft.selection, ...patch };
      },
      ["selection"]
    );
  },

  setUi(patch: Partial<UiState>) {
    this.update(
      (draft) => {
        draft.ui = { ...draft.ui, ...patch };
      },
      ["ui"]
    );
  },

  setPlayerPosition(position: PlayerPosition | null) {
    // Skip no-op: avoid triggering listeners when position hasn't changed
    const cur = state.playerPosition;
    if (cur && position && cur.x === position.x && cur.y === position.y && cur.floor === position.floor) return;
    if (!cur && !position) return;
    this.update(
      (draft) => {
        draft.playerPosition = position;
      },
      ["playerPosition"]
    );
  },

  setInstanceOffset(offset: import('./model').InstanceOffset | null) {
    this.update(
      (draft) => {
        draft.instanceOffset = offset;
      },
      ["instanceOffset"]
    );
  },

  setMeshMappings(mappings: import('./model').MeshMapping[]) {
    this.update(
      (draft) => {
        draft.meshMappings = mappings;
      },
      ["meshMappings"]
    );
  },

  setInstanceContext(context: InstanceContext | null) {
    // Skip no-op: avoid triggering listeners when instance context hasn't meaningfully changed
    const cur = state.currentInstance;
    if (!cur && !context) return;
    if (cur && context &&
        cur.isInstance === context.isInstance &&
        cur.entranceX === context.entranceX &&
        cur.entranceZ === context.entranceZ &&
        cur.entryTileX === context.entryTileX &&
        cur.entryTileZ === context.entryTileZ &&
        cur.minTileX === context.minTileX &&
        cur.minTileZ === context.minTileZ &&
        cur.maxTileX === context.maxTileX &&
        cur.maxTileZ === context.maxTileZ &&
        cur.entranceKey === context.entranceKey &&
        cur.label === context.label) return;
    this.update(
      (draft) => {
        draft.currentInstance = context;
      },
      ["currentInstance"]
    );
  },

  labelCurrentInstance(label: string) {
    this.update(
      (draft) => {
        if (draft.currentInstance) {
          draft.currentInstance.label = label;
          // Add/update in known instances
          const key = draft.currentInstance.entranceKey;
          if (key) {
            const existing = draft.knownInstances.findIndex(
              (i) => i.entranceKey === key
            );
            const ctx: InstanceMarkerContext = {
              entranceKey: key,
              instanceLabel: label,
              entryTileX: draft.currentInstance.entryTileX,
              entryTileZ: draft.currentInstance.entryTileZ,
            };
            if (existing >= 0) {
              draft.knownInstances[existing] = ctx;
            } else {
              draft.knownInstances.push(ctx);
            }
          }
        }
      },
      ["currentInstance", "knownInstances"]
    );
  },

  // Save or update a known instance entry (auto-saves entrance key for re-identification)
  saveKnownInstance(entranceKey: string, entryTileX: number, entryTileZ: number, label?: string, offset?: { dLng: number; dLat: number } | null, publicRef?: { x: number; y: number } | null) {
    this.update(
      (draft) => {
        const existing = draft.knownInstances.findIndex(
          (i) => i.entranceKey === entranceKey
        );
        if (existing >= 0) {
          draft.knownInstances[existing].entryTileX = entryTileX;
          draft.knownInstances[existing].entryTileZ = entryTileZ;
          if (label) {
            draft.knownInstances[existing].instanceLabel = label;
          }
          if (offset) {
            draft.knownInstances[existing].savedOffset = offset;
          }
          if (publicRef) {
            draft.knownInstances[existing].publicReference = publicRef;
          }
        } else {
          draft.knownInstances.push({
            entranceKey,
            instanceLabel: label || "",
            entryTileX,
            entryTileZ,
            savedOffset: offset ?? undefined,
            publicReference: publicRef ?? undefined,
          });
        }
      },
      ["knownInstances"]
    );
  },

  getKnownInstances(): InstanceMarkerContext[] {
    return state.knownInstances;
  },

  // Group management
  addGroup(name: string, color?: string) {
    const group: MarkerGroup = {
      id: generateId("group"),
      name,
      color: color || state.ui.defaultColor,
      visible: true,
    };
    this.update(
      (draft) => {
        draft.groups.push(group);
        draft.selection.activeGroupId = group.id;
      },
      ["groups", "selection"]
    );
    return group;
  },

  removeGroup(id: string) {
    if (id === "default") return; // Can't delete default group
    this.update(
      (draft) => {
        draft.groups = draft.groups.filter((g) => g.id !== id);
        // Move markers from deleted group to default
        draft.markers = draft.markers.map((m) =>
          m.groupId === id ? { ...m, groupId: "default" } : m
        );
        // Switch to default if active group was deleted
        if (draft.selection.activeGroupId === id) {
          draft.selection.activeGroupId = "default";
        }
      },
      ["groups", "markers", "selection"]
    );
  },

  updateGroup(id: string, patch: Partial<Omit<MarkerGroup, "id">>) {
    this.update(
      (draft) => {
        const group = draft.groups.find((g) => g.id === id);
        if (group) {
          Object.assign(group, patch);
        }
      },
      ["groups"]
    );
  },

  toggleGroupVisibility(id: string) {
    this.update(
      (draft) => {
        const group = draft.groups.find((g) => g.id === id);
        if (group) {
          group.visible = !group.visible;
        }
      },
      ["groups"]
    );
  },

  // Marker management
  addMarker(x: number, y: number, floor?: number, color?: string, label?: string) {
    const activeGroup = state.groups.find(g => g.id === state.selection.activeGroupId);
    const currentInstance = state.currentInstance;

    // Determine coordinates and instance context
    let markerX = x;
    let markerY = y;
    let instanceCtx: InstanceMarkerContext | null = null;

    if (currentInstance?.isInstance && !state.instanceOffset) {
      // Old path (no offset): store as relative coordinates from entry tile
      markerX = x - currentInstance.entryTileX;
      markerY = y - currentInstance.entryTileZ;
      instanceCtx = {
        entranceKey: currentInstance.entranceKey,
        instanceLabel: currentInstance.label || "",
        entryTileX: currentInstance.entryTileX,
        entryTileZ: currentInstance.entryTileZ,
      };
    }
    // When instanceOffset is active: x,y are public coords from the map.
    // Store directly — the offset handles instance↔public mapping.

    const marker: TileMarker = {
      id: generateId("marker"),
      x: markerX,
      y: markerY,
      floor: floor ?? state.selection.floor,
      color: color ?? activeGroup?.color ?? state.ui.defaultColor,
      label,
      groupId: state.selection.activeGroupId || "default",
      instanceContext: instanceCtx,
    };

    console.log(`[MarkerStore] addMarker at (${markerX},${markerY}) floor=${marker.floor}${instanceCtx ? ` instance="${instanceCtx.entranceKey}"` : ''}`);

    this.update(
      (draft) => {
        draft.markers.push(marker);
      },
      ["markers"]
    );
    return marker;
  },

  removeMarker(id: string) {
    this.update(
      (draft) => {
        draft.markers = draft.markers.filter((m) => m.id !== id);
        if (draft.selection.selectedMarkerId === id) {
          draft.selection.selectedMarkerId = null;
        }
      },
      ["markers", "selection"]
    );
  },

  updateMarker(id: string, patch: Partial<Omit<TileMarker, "id">>) {
    this.update(
      (draft) => {
        const marker = draft.markers.find((m) => m.id === id);
        if (marker) {
          Object.assign(marker, patch);
        }
      },
      ["markers"]
    );
  },

  clearMarkers(floor?: number, groupId?: string) {
    this.update(
      (draft) => {
        if (floor !== undefined && groupId !== undefined) {
          draft.markers = draft.markers.filter((m) => !(m.floor === floor && m.groupId === groupId));
        } else if (floor !== undefined) {
          draft.markers = draft.markers.filter((m) => m.floor !== floor);
        } else if (groupId !== undefined) {
          draft.markers = draft.markers.filter((m) => m.groupId !== groupId);
        } else {
          draft.markers = [];
        }
        draft.selection.selectedMarkerId = null;
      },
      ["markers", "selection"]
    );
  },

  importMarkers(markers: TileMarker[]) {
    this.update(
      (draft) => {
        // Assign new IDs to avoid conflicts
        const imported = markers.map((m) => ({
          ...m,
          id: generateId("marker"),
          groupId: m.groupId || state.selection.activeGroupId || "default",
        }));
        draft.markers.push(...imported);
      },
      ["markers"]
    );
  },

  exportMarkers(): TileMarker[] {
    return [...state.markers];
  },

  exportGroup(groupId: string): { group: MarkerGroup; markers: TileMarker[] } | null {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return null;
    const markers = state.markers.filter(m => m.groupId === groupId);
    return { group, markers };
  },

  reset() {
    this.update(
      (draft) => {
        draft.version = initialState.version;
        draft.markers = [];
        draft.groups = [DEFAULT_GROUP];
        draft.selection = { ...initialState.selection };
        draft.ui = { ...initialState.ui };
        draft.playerPosition = null;
        draft.currentInstance = null;
        draft.knownInstances = [];
      },
      ["markers", "groups", "selection", "ui", "playerPosition", "currentInstance", "knownInstances"]
    );
  },
};

export default MarkerStore;
