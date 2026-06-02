import { useEffect } from "react";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { useMarkerSelector } from "../../state/useMarkerSelector";

/**
 * Renders a dark grid background for instance space.
 * Shows chunk boundaries, tile grid, and coordinate labels.
 * Also highlights detected floor chunks from the instance detector.
 */
const InstanceGridLayer: React.FC = () => {
  const map = useMap();
  // Subscribe to individual primitive fields to avoid effect re-runs from object ref changes
  const isInstance = useMarkerSelector((s) => s.currentInstance?.isInstance ?? false);
  const minTileX = useMarkerSelector((s) => s.currentInstance?.minTileX ?? 0);
  const minTileZ = useMarkerSelector((s) => s.currentInstance?.minTileZ ?? 0);
  const maxTileX = useMarkerSelector((s) => s.currentInstance?.maxTileX ?? 0);
  const maxTileZ = useMarkerSelector((s) => s.currentInstance?.maxTileZ ?? 0);
  const instanceLabel = useMarkerSelector((s) => s.currentInstance?.label ?? "");

  useEffect(() => {
    const mapRef = map;

    // Dark background with grid
    const GridLayer = L.GridLayer.extend({
      createTile: function (coords: L.Coords) {
        const tile = document.createElement("canvas");
        const tileSize = this.getTileSize();
        tile.width = tileSize.x;
        tile.height = tileSize.y;

        const ctx = tile.getContext("2d");
        if (!ctx) return tile;

        const zoom = coords.z;

        // Dark background
        ctx.fillStyle = "#0f0f1a";
        ctx.fillRect(0, 0, tileSize.x, tileSize.y);

        // Get the bounds of this tile in game coordinates
        const nwPoint = L.point(coords.x * tileSize.x, coords.y * tileSize.y);
        const sePoint = L.point((coords.x + 1) * tileSize.x, (coords.y + 1) * tileSize.y);
        const nwLatLng = mapRef.unproject(nwPoint, zoom);
        const seLatLng = mapRef.unproject(sePoint, zoom);

        const minLng = Math.min(nwLatLng.lng, seLatLng.lng);
        const maxLng = Math.max(nwLatLng.lng, seLatLng.lng);
        const minLat = Math.min(nwLatLng.lat, seLatLng.lat);
        const maxLat = Math.max(nwLatLng.lat, seLatLng.lat);

        // Draw chunk grid (every 64 tiles) - bright cyan lines
        const chunkSize = 64;

        ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
        ctx.lineWidth = 2;

        const startChunkLng = Math.ceil(minLng / chunkSize) * chunkSize;
        const endChunkLng = Math.floor(maxLng / chunkSize) * chunkSize;
        for (let lng = startChunkLng; lng <= endChunkLng; lng += chunkSize) {
          const point = mapRef.project(L.latLng(nwLatLng.lat, lng), zoom);
          const pixelX = point.x - nwPoint.x;
          if (pixelX >= 0 && pixelX <= tileSize.x) {
            ctx.beginPath();
            ctx.moveTo(pixelX, 0);
            ctx.lineTo(pixelX, tileSize.y);
            ctx.stroke();
          }
        }

        const startChunkLat = Math.ceil(minLat / chunkSize) * chunkSize;
        const endChunkLat = Math.floor(maxLat / chunkSize) * chunkSize;
        for (let lat = startChunkLat; lat <= endChunkLat; lat += chunkSize) {
          const point = mapRef.project(L.latLng(lat, nwLatLng.lng), zoom);
          const pixelY = point.y - nwPoint.y;
          if (pixelY >= 0 && pixelY <= tileSize.y) {
            ctx.beginPath();
            ctx.moveTo(0, pixelY);
            ctx.lineTo(tileSize.x, pixelY);
            ctx.stroke();
          }
        }

        // Chunk coordinate labels at intersections
        if (zoom >= 2) {
          ctx.fillStyle = "rgba(0, 200, 255, 0.7)";
          ctx.font = `${Math.max(9, zoom * 2)}px monospace`;
          for (let lng = startChunkLng; lng <= endChunkLng; lng += chunkSize) {
            for (let lat = startChunkLat; lat <= endChunkLat; lat += chunkSize) {
              const point = mapRef.project(L.latLng(lat, lng), zoom);
              const pixelX = point.x - nwPoint.x;
              const pixelY = point.y - nwPoint.y;
              if (pixelX >= 0 && pixelX <= tileSize.x && pixelY >= 0 && pixelY <= tileSize.y) {
                const chunkX = Math.floor(lng / chunkSize);
                const chunkZ = Math.floor(lat / chunkSize);
                ctx.fillText(`${chunkX},${chunkZ}`, pixelX + 3, pixelY - 3);
              }
            }
          }
        }

        // Draw tile grid at higher zoom levels
        if (zoom >= 4) {
          ctx.strokeStyle = "rgba(80, 80, 120, 0.35)";
          ctx.lineWidth = 0.5;

          const startLng = Math.ceil(minLng);
          const endLng = Math.floor(maxLng);
          for (let lng = startLng; lng <= endLng; lng++) {
            const point = mapRef.project(L.latLng(nwLatLng.lat, lng), zoom);
            const pixelX = point.x - nwPoint.x;
            if (pixelX >= 0 && pixelX <= tileSize.x) {
              ctx.beginPath();
              ctx.moveTo(pixelX, 0);
              ctx.lineTo(pixelX, tileSize.y);
              ctx.stroke();
            }
          }

          const startLat = Math.ceil(minLat);
          const endLat = Math.floor(maxLat);
          for (let lat = startLat; lat <= endLat; lat++) {
            const point = mapRef.project(L.latLng(lat, nwLatLng.lng), zoom);
            const pixelY = point.y - nwPoint.y;
            if (pixelY >= 0 && pixelY <= tileSize.y) {
              ctx.beginPath();
              ctx.moveTo(0, pixelY);
              ctx.lineTo(tileSize.x, pixelY);
              ctx.stroke();
            }
          }
        }

        // Ensure canvas tiles don't intercept pointer events
        tile.style.pointerEvents = "none";
        return tile;
      },
    });

    const gridLayer = new GridLayer({
      tileSize: 256,
      opacity: 1,
      className: "instance-grid-layer",
      interactive: false,
    });

    gridLayer.addTo(map);

    return () => {
      map.removeLayer(gridLayer);
    };
  }, [map]);

  // Highlight detected floor chunks as rectangles
  // Dependencies are all primitives to avoid effect re-runs from object ref changes
  useEffect(() => {
    if (!isInstance) return;

    // Only draw if we have meaningful bounds (not just player pos)
    if (minTileX === maxTileX && minTileZ === maxTileZ) return;

    // Highlight the instance bounding box
    const bounds: L.LatLngBoundsExpression = [
      [minTileZ, minTileX],
      [maxTileZ, maxTileX],
    ];

    const rect = L.rectangle(bounds, {
      color: "#ff8800",
      fillColor: "#ff8800",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "8, 4",
    });

    rect.addTo(map);

    // Add label for the instance area
    const label = instanceLabel || "Instance Area";

    const tooltip = L.tooltip({
      permanent: true,
      direction: "top",
      className: "instance-area-label",
      offset: [0, -20],
    })
      .setLatLng([maxTileZ, (minTileX + maxTileX) / 2])
      .setContent(label);

    tooltip.addTo(map);

    return () => {
      map.removeLayer(rect);
      map.removeLayer(tooltip);
    };
  }, [map, isInstance, minTileX, minTileZ, maxTileX, maxTileZ, instanceLabel]);

  return null;
};

export default InstanceGridLayer;
