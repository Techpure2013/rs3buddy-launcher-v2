import React from "react";
import ReactDOM from "react-dom/client";
import NpcApp from "../components/NpcApp";

async function bootstrap(): Promise<void> {
  const rootEl = document.getElementById("app");
  if (!rootEl) throw new Error("Missing #app element");
  ReactDOM.createRoot(rootEl).render(<NpcApp />);
}

void bootstrap();
