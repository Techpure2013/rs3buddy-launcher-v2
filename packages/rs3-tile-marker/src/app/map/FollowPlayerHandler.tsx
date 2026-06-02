import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { useMarkerSelector } from "../../state/useMarkerSelector";
import { gameToLatLng } from "../../utils/mapFunctions";

const FollowPlayerHandler: React.FC = () => {
  const map = useMap();
  const followPlayer = useMarkerSelector((s) => s.ui.followPlayer);
  // Subscribe to primitive position fields to avoid re-renders from object ref changes
  const playerX = useMarkerSelector((s) => s.playerPosition?.x ?? null);
  const playerY = useMarkerSelector((s) => s.playerPosition?.y ?? null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!followPlayer || playerX === null || playerY === null) return;

    // Check if position actually changed
    const last = lastPositionRef.current;
    if (last && last.x === playerX && last.y === playerY) {
      return;
    }

    lastPositionRef.current = { x: playerX, y: playerY };

    // Pan to player position
    const [lat, lng] = gameToLatLng(playerX, playerY);
    const target: [number, number] = [lat + 0.5, lng + 0.5];

    // Check if target is within current maxBounds before panning
    // (avoids clamping when MapBoundsHandler hasn't expanded bounds yet)
    const maxBounds = map.options.maxBounds;
    if (maxBounds) {
      const bounds = L.latLngBounds(maxBounds as L.LatLngBoundsExpression);
      if (!bounds.contains(target)) {
        // Target outside current bounds - skip this pan, MapBoundsHandler will handle it
        return;
      }
    }

    map.panTo(target, {
      animate: true,
      duration: 0.3,
    });
  }, [map, followPlayer, playerX, playerY]);

  return null;
};

export default FollowPlayerHandler;
