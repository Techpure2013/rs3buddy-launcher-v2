/**
 * React hook for subscribing to visible markers for the map.
 * Uses useReducer + useLayoutEffect for subscription to avoid React 19's
 * useSyncExternalStore tearing detection which causes infinite loops
 * when derived selectors produce arrays with new references.
 */

import { useReducer, useRef, useLayoutEffect } from "react";
import { MarkerStore } from "./markerStore";
import type { TileMarker } from "./model";

function markersEqual(a: TileMarker[], b: TileMarker[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i], mb = b[i];
    if (ma.id !== mb.id || ma.x !== mb.x || ma.y !== mb.y ||
        ma.floor !== mb.floor || ma.color !== mb.color ||
        ma.label !== mb.label || ma.groupId !== mb.groupId) return false;
  }
  return true;
}

const forceUpdateReducer = (c: number): number => c + 1;

export function useVisibleMarkers(): TileMarker[] {
  const [, forceUpdate] = useReducer(forceUpdateReducer, 0);
  const valueRef = useRef<TileMarker[] | null>(null);

  // Compute current value during render
  const currentValue = MarkerStore.derived.visibleMarkersForMap();

  // Initialize or update ref if value changed
  if (valueRef.current === null || !markersEqual(valueRef.current, currentValue)) {
    valueRef.current = currentValue;
  }

  // Subscribe to store changes
  useLayoutEffect(() => {
    const unsub = MarkerStore.subscribeRaw(() => {
      const next = MarkerStore.derived.visibleMarkersForMap();
      if (valueRef.current === null || !markersEqual(valueRef.current, next)) {
        valueRef.current = next;
        forceUpdate(0);
      }
    });
    return unsub;
  }, []);

  return valueRef.current;
}
