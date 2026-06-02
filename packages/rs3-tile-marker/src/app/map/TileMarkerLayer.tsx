import React, { useEffect } from "react";
import { Rectangle, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { useMarkerSelector } from "../../state/useMarkerSelector";
import { useVisibleMarkers } from "../../state/useVisibleMarkers";
import { MarkerStore } from "../../state/markerStore";
import { gameToLatLng } from "../../utils/mapFunctions";

// Create a custom pane for markers to ensure they render above grid/capture layers
const MARKER_PANE = "markerPane";

const TileMarkerLayer: React.FC = () => {
  const map = useMap();
  const markers = useVisibleMarkers();
  const selectedId = useMarkerSelector((s) => s.selection.selectedMarkerId);

  // Create custom pane on mount (z-index 650 = above overlayPane's 400)
  useEffect(() => {
    if (!map.getPane(MARKER_PANE)) {
      map.createPane(MARKER_PANE);
      const pane = map.getPane(MARKER_PANE);
      if (pane) {
        pane.style.zIndex = "650";
      }
    }
  }, [map]);

  return (
    <>
      {markers.map((marker) => {
        const [lat, lng] = gameToLatLng(marker.x, marker.y);
        const bounds: LatLngBoundsExpression = [
          [lat - 0.5, lng - 0.5],
          [lat + 0.5, lng + 0.5],
        ];

        const isSelected = marker.id === selectedId;

        return (
          <Rectangle
            key={marker.id}
            bounds={bounds}
            pane={MARKER_PANE}
            pathOptions={{
              color: isSelected ? "#ffffff" : marker.color,
              fillColor: marker.color,
              fillOpacity: 0.6,
              weight: isSelected ? 4 : 3,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                MarkerStore.setSelection({ selectedMarkerId: marker.id });
              },
            }}
          >
            {marker.label && (
              <Tooltip permanent direction="center" className="marker-label">
                {marker.label}
              </Tooltip>
            )}
          </Rectangle>
        );
      })}
    </>
  );
};

export default TileMarkerLayer;
