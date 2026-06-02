import React, { useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { useMarkerSelector } from "../../state/useMarkerSelector";
import { MarkerStore } from "../../state/markerStore";
import {
  getBounds,
  getInstanceBounds,
  getMapOptions,
  getTileLayerConfig,
  latLngToGame,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "../../utils/mapFunctions";
import TileMarkerLayer from "./TileMarkerLayer";
import PlayerPositionLayer from "./PlayerPositionLayer";
import FollowPlayerHandler from "./FollowPlayerHandler";
import TileGridLayer from "./TileGridLayer";
import InstanceGridLayer from "./InstanceGridLayer";

const MAP_OPTIONS = getMapOptions();
const MAP_BOUNDS = getBounds();
const INSTANCE_MAP_BOUNDS = getInstanceBounds();

// Click handler component - uses useMapEvents hook inside MapContainer
const MapClickHandler: React.FC = () => {
  const clickToAddMode = useMarkerSelector((s) => s.ui.clickToAddMode);

  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      console.log("[MapClickHandler] Click! latlng=", e.latlng.lat, e.latlng.lng, "clickToAdd=", clickToAddMode);
      if (!clickToAddMode) return;

      const { x, y } = latLngToGame(e.latlng.lat, e.latlng.lng);
      console.log("[MapClickHandler] Game coords:", x, y);
      const marker = MarkerStore.addMarker(x, y);
      console.log("[MapClickHandler] Added:", marker?.id, "instance=", !!marker?.instanceContext);
    },
  });

  return null;
};

/**
 * Handles dynamic map bounds and view when entering/leaving instance space.
 * Runs bounds expansion both synchronously during render and in useEffect
 * to ensure it happens regardless of React's effect scheduling.
 */
const MapInstanceHandler: React.FC<{
  isInstance: boolean;
  rawIsInInstance: boolean;
  hasOffset: boolean;
}> = ({ isInstance, rawIsInInstance, hasOffset }) => {
  const map = useMap();
  const lastIsInstance = useRef(isInstance);
  const lastRawInInstance = useRef(rawIsInInstance);

  // Synchronous bounds update during render (runs immediately, not deferred)
  if (isInstance !== lastIsInstance.current) {
    console.log("[MapInstanceHandler] SYNC bounds update, isInstance=", isInstance);
    try {
      if (isInstance) {
        map.setMaxBounds(INSTANCE_MAP_BOUNDS);
        const pos = MarkerStore.getState().playerPosition;
        if (pos) {
          map.setView([pos.y + 0.5, pos.x + 0.5], 4, { animate: false });
          console.log("[MapInstanceHandler] Panned to", pos.x, pos.y);
        }
      } else {
        const pos = MarkerStore.getState().playerPosition;
        if (pos) {
          const clampedLat = Math.max(0, Math.min(12800, pos.y));
          const clampedLng = Math.max(0, Math.min(6400, pos.x));
          map.setView([clampedLat + 0.5, clampedLng + 0.5], map.getZoom(), { animate: false });
        }
        map.setMaxBounds(MAP_BOUNDS);
      }
    } catch (e) {
      console.error("[MapInstanceHandler] ERROR:", e);
    }
    lastIsInstance.current = isInstance;
  }

  // Detect entering instance WITH offset (showInstanceMap stays false→false,
  // but we still need to pan to the converted public position)
  if (rawIsInInstance && !lastRawInInstance.current && hasOffset) {
    console.log("[MapInstanceHandler] Entered instance with offset — panning to public position");
    const pos = MarkerStore.getState().playerPosition;
    if (pos) {
      const clampedLat = Math.max(0, Math.min(12800, pos.y));
      const clampedLng = Math.max(0, Math.min(6400, pos.x));
      map.setMaxBounds(MAP_BOUNDS);
      map.setView([clampedLat + 0.5, clampedLng + 0.5], map.getZoom(), { animate: false });
    }
  }
  lastRawInInstance.current = rawIsInInstance;

  // Also run in effect as backup (catches initial mount)
  useEffect(() => {
    console.log("[MapInstanceHandler] effect isInstance=", isInstance);
    try {
      if (isInstance) {
        map.setMaxBounds(INSTANCE_MAP_BOUNDS);
        const pos = MarkerStore.getState().playerPosition;
        if (pos) {
          map.setView([pos.y + 0.5, pos.x + 0.5], 4, { animate: false });
        }
      } else {
        map.setMaxBounds(MAP_BOUNDS);
      }
    } catch (e) {
      console.error("[MapInstanceHandler] effect ERROR:", e);
    }
  }, [map, isInstance]);

  return null;
};

const MapCenter: React.FC = () => {
  const floor = useMarkerSelector((s) => s.selection.floor);
  const isInInstance = useMarkerSelector((s) => s.currentInstance?.isInstance ?? false);
  const hasOffset = useMarkerSelector((s) => s.instanceOffset != null);

  // When offset is active, player coords are converted to public space —
  // show public map tiles and bounds instead of the instance grid.
  const showInstanceMap = isInInstance && !hasOffset;

  console.log("[MapCenter] render isInInstance=", isInInstance, "hasOffset=", hasOffset, "showInstanceMap=", showInstanceMap);

  const layers = useMemo(() => {
    const config = getTileLayerConfig(floor);
    return [
      { key: "topdown", ...config.topdown },
      { key: "walls", ...config.walls },
    ];
  }, [floor]);

  return (
    <div className="map-container">
      <MapContainer
        crs={MAP_OPTIONS.crs}
        bounds={MAP_BOUNDS}
        id="map"
        zoom={DEFAULT_ZOOM}
        minZoom={MAP_OPTIONS.minZoom}
        maxZoom={MAP_OPTIONS.maxZoom}
        maxBounds={MAP_OPTIONS.maxBounds}
        zoomSnap={MAP_OPTIONS.zoomSnap}
        zoomDelta={MAP_OPTIONS.zoomDelta}
        zoomControl={false}
        dragging={true}
        doubleClickZoom={false}
        tap={false}
        center={DEFAULT_CENTER}
      >
        {/* Dynamic bounds + view handler */}
        <MapInstanceHandler isInstance={showInstanceMap} rawIsInInstance={isInInstance} hasOffset={hasOffset} />

        {/* Conditional layers: runeapps tiles or instance grid */}
        {/* When offset is active, show public map even though we're in an instance */}
        {showInstanceMap ? (
          <InstanceGridLayer />
        ) : (
          <>
            {layers.map((layer) => (
              <TileLayer
                key={`${layer.key}-${floor}`}
                url={layer.url}
                tileSize={layer.tileSize}
                maxNativeZoom={layer.maxNativeZoom}
                minZoom={layer.minZoom}
                opacity={layer.opacity}
                className={layer.className}
                noWrap={true}
                bounds={MAP_BOUNDS}
              />
            ))}
          </>
        )}

        {/* Tile grid overlay (only on main map / offset mode) */}
        {!showInstanceMap && <TileGridLayer />}

        {/* Tile markers layer */}
        <TileMarkerLayer />

        {/* Player position marker */}
        <PlayerPositionLayer />

        {/* Follow player handler */}
        <FollowPlayerHandler />

        {/* Map click handler */}
        <MapClickHandler />
      </MapContainer>
    </div>
  );
};

export default MapCenter;
