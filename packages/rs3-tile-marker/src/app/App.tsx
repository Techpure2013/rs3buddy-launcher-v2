import React from "react";
import MapCenter from "./map/MapCenter";
import MarkerPanel from "./components/MarkerPanel";
import "./App.css";

const App: React.FC = () => {
  return (
    <div className="app-container">
      <MapCenter />
      <MarkerPanel />
    </div>
  );
};

export default App;
