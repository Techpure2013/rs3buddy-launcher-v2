import { useEffect } from "react";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { useMarkerSelector } from "../../state/useMarkerSelector";

/**
 * Renders a grid showing individual tile boundaries
 * Uses map's CRS projection for proper alignment with game coordinates
 */
const TileGridLayer: React.FC = () => {
  const map = useMap();
  const showGrid = useMarkerSelector((s) => s.ui.showGrid);
  const floor = useMarkerSelector((s) => s.selection.floor);

  useEffect(() => {
    if (!showGrid) return;

    // Capture map reference for use in tile creation
    const mapRef = map;

    // Custom GridLayer that draws tile boundaries aligned with game coordinates
    const GridLayer = L.GridLayer.extend({
      createTile: function (coords: L.Coords) {
        const tile = document.createElement("canvas");
        const tileSize = this.getTileSize();
        tile.width = tileSize.x;
        tile.height = tileSize.y;

        const ctx = tile.getContext("2d");
        if (!ctx) return tile;

        const zoom = coords.z;

        // Only draw grid at zoom level 3 and above for performance
        if (zoom < 3) return tile;

        // Get the bounds of this tile in layer point coordinates
        const nwPoint = L.point(coords.x * tileSize.x, coords.y * tileSize.y);
        const sePoint = L.point((coords.x + 1) * tileSize.x, (coords.y + 1) * tileSize.y);

        // Convert layer points to game coordinates (lat/lng)
        // Using map.unproject which applies the CRS transformation
        const nwLatLng = mapRef.unproject(nwPoint, zoom);
        const seLatLng = mapRef.unproject(sePoint, zoom);

        // Game coordinates (in our CRS, lat = game Y, lng = game X)
        const minLng = Math.min(nwLatLng.lng, seLatLng.lng);
        const maxLng = Math.max(nwLatLng.lng, seLatLng.lng);
        const minLat = Math.min(nwLatLng.lat, seLatLng.lat);
        const maxLat = Math.max(nwLatLng.lat, seLatLng.lat);

        // Grid line style - subtle black lines
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1;

        // Draw vertical lines at integer X (lng) coordinates
        const startLng = Math.ceil(minLng);
        const endLng = Math.floor(maxLng);
        for (let lng = startLng; lng <= endLng; lng++) {
          // Convert game coordinate back to pixel position within this tile
          const point = mapRef.project(L.latLng(nwLatLng.lat, lng), zoom);
          const pixelX = point.x - nwPoint.x;
          if (pixelX >= 0 && pixelX <= tileSize.x) {
            ctx.beginPath();
            ctx.moveTo(pixelX, 0);
            ctx.lineTo(pixelX, tileSize.y);
            ctx.stroke();
          }
        }

        // Draw horizontal lines at integer Y (lat) coordinates
        const startLat = Math.ceil(minLat);
        const endLat = Math.floor(maxLat);
        for (let lat = startLat; lat <= endLat; lat++) {
          // Convert game coordinate back to pixel position within this tile
          const point = mapRef.project(L.latLng(lat, nwLatLng.lng), zoom);
          const pixelY = point.y - nwPoint.y;
          if (pixelY >= 0 && pixelY <= tileSize.y) {
            ctx.beginPath();
            ctx.moveTo(0, pixelY);
            ctx.lineTo(tileSize.x, pixelY);
            ctx.stroke();
          }
        }

        return tile;
      },
    });

    const gridLayer = new GridLayer({
      tileSize: 256,
      opacity: 1,
      className: "tile-grid-layer",
    });

    gridLayer.addTo(map);

    return () => {
      map.removeLayer(gridLayer);
    };
  }, [map, showGrid, floor]); // Re-create grid when floor changes

  return null;
};

export default TileGridLayer;
