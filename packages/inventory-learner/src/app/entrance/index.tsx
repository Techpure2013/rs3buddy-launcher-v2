import React from "react";
import ReactDOM from "react-dom/client";
import InventoryLearnerApp from "../components/InventoryLearnerApp";

async function bootstrap(): Promise<void> {
  const rootEl = document.getElementById("app");
  if (!rootEl) throw new Error("Missing #app element");
  ReactDOM.createRoot(rootEl).render(<InventoryLearnerApp />);
}

void bootstrap();
