import React from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { useMarkerSelector } from "../../state/useMarkerSelector";
import { gameToLatLng } from "../../utils/mapFunctions";

const PlayerPositionLayer: React.FC = () => {
  // Subscribe to primitive fields to avoid re-renders from object ref changes
  const playerX = useMarkerSelector((s) => s.playerPosition?.x ?? null);
  const playerY = useMarkerSelector((s) => s.playerPosition?.y ?? null);
  const playerFloor = useMarkerSelector((s) => s.playerPosition?.floor ?? null);
  const currentFloor = useMarkerSelector((s) => s.selection.floor);
  const isInInstance = useMarkerSelector((s) => s.currentInstance?.isInstance ?? false);

  // Don't render if no position
  if (playerX === null || playerY === null || playerFloor === null) return null;
  // In instance mode, always show player marker; on main map, filter by floor
  if (!isInInstance && playerFloor !== currentFloor) return null;

  const [lat, lng] = gameToLatLng(playerX, playerY);

  return (
    <CircleMarker
      center={[lat + 0.5, lng + 0.5]} // Center of tile
      radius={8}
      pathOptions={{
        color: "#00ff00",
        fillColor: "#00ff00",
        fillOpacity: 0.5,
        weight: 3,
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -10]}>
        You: {playerX}, {playerY}
      </Tooltip>
    </CircleMarker>
  );
};

export default PlayerPositionLayer;
