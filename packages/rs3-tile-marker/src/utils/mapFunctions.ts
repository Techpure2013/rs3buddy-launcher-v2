/**
 * RS3 Map utilities - coordinate system and Leaflet CRS configuration
 * Based on RS3QuestMapBuddy patterns
 */

import * as L from "leaflet";
import type { MapOptions, LatLngBounds } from "leaflet";

// RS3 map dimensions
const mapSize = {
  chunks: { x: 100, y: 200 },
  chunkSize: { x: 64, y: 64 },
};

const chunkOffset = { x: 16, z: 16 };

/**
 * Get the Leaflet bounds for the RS3 main map
 */
export function getBounds(): LatLngBounds {
  return new L.LatLngBounds(
    [0, 0],
    [mapSize.chunks.y * mapSize.chunkSize.y, mapSize.chunks.x * mapSize.chunkSize.x]
  );
}

/**
 * Get extended bounds that include instance space.
 * Instance space starts at X=6400 and can extend to ~16384.
 */
export function getInstanceBounds(): LatLngBounds {
  return new L.LatLngBounds(
    [0, 0],
    [16384, 16384]
  );
}

/**
 * Get configured map options with RS3's CRS transformation
 */
export function getMapOptions(): MapOptions {
  const crs = L.CRS.Simple;

  // Apply RS3 coordinate transformation
  // @ts-ignore - Leaflet typing doesn't expose transformation setter
  crs.transformation = L.transformation(
    1,
    chunkOffset.x + 0.5,
    -1,
    mapSize.chunks.y * mapSize.chunkSize.y - (chunkOffset.z + 0.5)
  );

  return {
    crs: crs,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    minZoom: 2,
    maxZoom: 6,
    zoomControl: false,
    maxBounds: getBounds(),
    maxBoundsViscosity: 0.5,
  };
}

/**
 * Get tile layer configuration for a specific floor
 */
export function getTileLayerConfig(floor: number) {
  return {
    topdown: {
      url: `https://runeapps.org/s3/map4/live/topdown-${floor}/{z}/{x}-{y}.webp`,
      tileSize: 512,
      maxNativeZoom: 6,
      minZoom: 2,
      opacity: 0.8,
      className: "map-topdown",
      updateWhenZooming: false,
      updateInterval: 100,
      keepBuffer: 100,
      updateWhenIdle: true,
    },
    walls: {
      url: `https://runeapps.org/s3/map4/live/walls-${floor}/{z}/{x}-{y}.svg`,
      tileSize: 512,
      maxNativeZoom: 3,
      minNativeZoom: 3,
      minZoom: 2,
      opacity: 0.6,
      className: "map-walls",
      updateWhenIdle: true,
      updateInterval: 50,
      keepBuffer: 100,
    },
  };
}

/**
 * Convert game coordinates to Leaflet LatLng
 * In RS3: X is east-west, Y is north-south
 * In Leaflet: lat is Y, lng is X
 */
export function gameToLatLng(x: number, y: number): [number, number] {
  return [y, x];
}

/**
 * Convert Leaflet LatLng to game coordinates (tile center)
 * Returns the center of the clicked tile (e.g., clicking tile 3200-3201 returns 3200.5)
 */
export function latLngToGame(lat: number, lng: number): { x: number; y: number } {
  // Get tile center: floor to get tile corner, then add 0.5 for center
  return { x: Math.floor(lng) + 0.5, y: Math.floor(lat) + 0.5 };
}

/**
 * Check if a floor value is valid
 */
export function isValidFloor(floor: number): boolean {
  return floor >= -1 && floor <= 3;
}

/**
 * Default center point (near Lumbridge)
 */
export const DEFAULT_CENTER: [number, number] = [3233, 3222];
export const DEFAULT_ZOOM = 4;
