/**
 * State model type definitions
 */

export interface MarkerGroup {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface InstanceMarkerContext {
  entranceKey: string;        // "x,z" of surface entrance tile - stable identifier
  instanceLabel: string;
  entryTileX: number;         // First tile inside instance (coordinate origin)
  entryTileZ: number;
  savedOffset?: InstanceOffset | null; // Used as flag for hasOffset (triggers public map mode)
  publicReference?: { x: number; y: number } | null; // Exact public position to pan to on entry
}

export interface InstanceContext {
  isInstance: boolean;
  minTileX: number;
  minTileZ: number;
  maxTileX: number;
  maxTileZ: number;
  entranceX: number;          // Surface world position before instance entry
  entranceZ: number;
  entryTileX: number;         // First tile inside instance (coordinate origin)
  entryTileZ: number;
  label: string | null;
  entranceKey: string;        // "x,z" stable identifier
  detectedAt: number;
}

export interface TileMarker {
  id: string;
  x: number;
  y: number;
  floor: number;
  color: string;
  label?: string;
  groupId?: string;
  instanceContext?: InstanceMarkerContext | null;
}

export interface PlayerPosition {
  x: number;
  y: number;
  floor: number;
}

export interface SelectionState {
  floor: number;
  selectedMarkerId: string | null;
  activeGroupId: string | null;
}

export interface UiState {
  panelOpen: boolean;
  lowProfileMode: boolean;
  followPlayer: boolean;
  showGrid: boolean;
  defaultColor: string;
  clickToAddMode: boolean;
  // GL Overlay options (rendered in-game)
  showOverlayGrid: boolean;
  showOverlayCollision: boolean;
}

export interface InstanceOffset {
  dLng: number;
  dLat: number;
}

export interface MeshMapping {
  meshHash: string;
  publicChunkX: number;
  publicChunkZ: number;
  floor: number;
}

export interface MarkerState {
  version: number;
  markers: TileMarker[];
  groups: MarkerGroup[];
  selection: SelectionState;
  instanceOffset: InstanceOffset | null;
  meshMappings: MeshMapping[];
  ui: UiState;
  playerPosition: PlayerPosition | null;
  currentInstance: InstanceContext | null;
  knownInstances: InstanceMarkerContext[];
}

export interface DerivedSelectors {
  selectedMarker(): TileMarker | undefined;
  markersOnCurrentFloor(): TileMarker[];
  activeGroup(): MarkerGroup | undefined;
  visibleMarkersOnCurrentFloor(): TileMarker[];
  /** Returns markers for map display with absolute coordinates resolved */
  visibleMarkersForMap(): TileMarker[];
  isInInstance(): boolean;
  instanceMarkers(): TileMarker[];
  mainMapMarkers(): TileMarker[];
  currentInstanceLabel(): string | null;
}
