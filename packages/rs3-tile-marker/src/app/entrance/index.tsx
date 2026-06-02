import React from "react";
import ReactDOM from "react-dom/client";
import { MarkerStore } from "../../state/markerStore";
import App from "../App";
// Import overlay manager - it handles native detection internally
import * as overlayManager from "../../gl/overlayManager";

async function bootstrap(): Promise<void> {
  // Initialize the marker store (loads persisted state)
  await MarkerStore.initialize();

  // Start overlay manager if native addon is available
  if (overlayManager.isNativeAvailable()) {
    console.log("[Bootstrap] Native addon available, starting overlay manager...");
    overlayManager.startOverlayManager();
  } else {
    console.log("[Bootstrap] Native addon not available - player tracking disabled");
  }

  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");

  ReactDOM.createRoot(rootEl).render(<App />);
}

void bootstrap();
