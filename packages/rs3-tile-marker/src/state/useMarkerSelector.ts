/**
 * React hook for subscribing to MarkerStore state slices.
 * Uses useReducer + useEffect for subscription to avoid React 19's
 * useSyncExternalStore tearing detection which causes infinite loops
 * when getSnapshot produces derived values with new references.
 */

import { useReducer, useRef, useLayoutEffect } from "react";
import type { MarkerState } from "./model";
import { MarkerStore } from "./markerStore";

function isEqualShallow(a: unknown, b: unknown): boolean {
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
}

// Force-update reducer: incrementing a counter always produces a new state,
// which triggers a re-render. The actual selected value is read from a ref
// during render (not stored in React state), so React never compares it.
const forceUpdateReducer = (c: number): number => c + 1;

export function useMarkerSelector<T>(
  selector: (s: MarkerState, d: typeof MarkerStore.derived) => T
): T {
  const [, forceUpdate] = useReducer(forceUpdateReducer, 0);

  const selectorRef = useRef(selector);
  const valueRef = useRef<T>(undefined as T);
  const initializedRef = useRef(false);

  // Always keep the selector ref fresh
  selectorRef.current = selector;

  // Compute current value during render (synchronous, no tearing issues)
  const currentValue = selectorRef.current(MarkerStore.getState(), MarkerStore.derived);

  // On first render, initialize the ref
  if (!initializedRef.current) {
    valueRef.current = currentValue;
    initializedRef.current = true;
  }

  // If the value changed since last render, update the ref
  if (!isEqualShallow(valueRef.current as unknown, currentValue as unknown)) {
    valueRef.current = currentValue;
  }

  // Subscribe to store changes — use useLayoutEffect to subscribe
  // before browser paint, avoiding visual tearing
  useLayoutEffect(() => {
    const unsub = MarkerStore.subscribeRaw(() => {
      const next = selectorRef.current(MarkerStore.getState(), MarkerStore.derived);
      if (!isEqualShallow(valueRef.current as unknown, next as unknown)) {
        valueRef.current = next;
        forceUpdate(0);
      }
    });
    return unsub;
  }, []);

  return valueRef.current;
}
