import React, { useState, useEffect, useRef, useCallback } from "react";
import "../App.css";
import { TooltipItemLearner, type CalibrationState } from "../../gl/TooltipItemLearner";
import { GLBridgeAdapter, createGLBridge } from "../../gl/GLBridgeAdapter";
import { setLocal, setProduction, isLocal as isLocalApi } from "../../types/itemApi";
import type { LearnedItem, InventorySlotInfo, CalibrationProfile } from "../../types/itemTypes";

const STORAGE_KEY_ITEMS = "inventoryLearnedItems";
const STORAGE_KEY_CALIBRATION = "inventoryMouseCalibration";
const STORAGE_KEY_PROFILES = "inventoryCalibrationProfiles";

const InventoryLearnerApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"live" | "learned" | "calibration">("live");
  const [isPolling, setIsPolling] = useState(false);
  const [glAvailable, setGlAvailable] = useState(false);
  const [usingLocal, setUsingLocal] = useState(false);
  const [learnedItems, setLearnedItems] = useState<LearnedItem[]>([]);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationState, setCalibrationState] = useState<CalibrationState | null>(null);
  const [inventorySlots, setInventorySlots] = useState<InventorySlotInfo[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [profiles, setProfiles] = useState<CalibrationProfile[]>([]);
  const [sessionLearned, setSessionLearned] = useState(0);
  const [lastLearnedItem, setLastLearnedItem] = useState<LearnedItem | null>(null);
  const [profileName, setProfileName] = useState("");

  const learnerRef = useRef<TooltipItemLearner | null>(null);
  const bridgeRef = useRef<GLBridgeAdapter | null>(null);

  // Initialize GL bridge and learner
  useEffect(() => {
    const alt1gl = (globalThis as any).alt1gl;
    setGlAvailable(!!alt1gl);

    // Load saved items
    try {
      const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (savedItems) setLearnedItems(JSON.parse(savedItems));
    } catch (e) {
      console.warn("[InventoryLearner] Failed to load saved items:", e);
    }

    // Load saved profiles
    try {
      const savedProfiles = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
    } catch (e) {
      console.warn("[InventoryLearner] Failed to load saved profiles:", e);
    }

    // Initialize GL bridge if available
    if (alt1gl) {
      createGLBridge().then((bridge) => {
        bridgeRef.current = bridge;
        const learner = new TooltipItemLearner(bridge);

        // Register listeners BEFORE importing data so emitted events are caught
        learner.onItemLearned((item) => {
          setLearnedItems((prev) => {
            const exists = prev.some((p) => p.pHash === item.pHash && p.name === item.name);
            if (exists) return prev;
            const updated = [...prev, item];
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
            return updated;
          });
          setSessionLearned((prev) => prev + 1);
          setLastLearnedItem(item);
          setLastDetection(`Learned: ${item.name} (${item.source})`);
        });

        learner.onCalibrationStateChange((state) => {
          setCalibrationState(state);
          setIsCalibrating(state.active);

          // Auto-save calibration when complete
          if (!state.active && state.calibratedSlots > 0) {
            const calData = learner.exportCalibration();
            localStorage.setItem(STORAGE_KEY_CALIBRATION, JSON.stringify(calData));
          }
        });

        // Import saved calibration (listeners already registered, UI will update)
        try {
          const savedCal = localStorage.getItem(STORAGE_KEY_CALIBRATION);
          if (savedCal) {
            learner.importCalibration(JSON.parse(savedCal));
          }
        } catch (e) {
          console.warn("[InventoryLearner] Failed to load calibration:", e);
        }

        // Import saved learned items into the learner
        try {
          const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
          if (savedItems) {
            const items: LearnedItem[] = JSON.parse(savedItems);
            learner.importLearnedItems(
              items.map((i) => ({
                iconHash: i.iconHash,
                name: i.name,
                pHash: i.pHash,
              }))
            );
          }
        } catch (e) {
          // Already warned above
        }

        // Init mouse tracking
        bridge.initMouseTracking();

        learnerRef.current = learner;
        (globalThis as any)._inventoryLearner = learner;
      }).catch((err) => {
        console.error("[InventoryLearner] Failed to create GL bridge:", err);
      });
    }

    return () => {
      learnerRef.current?.stopPolling();
    };
  }, []);

  // Toggle server
  const toggleServer = useCallback(() => {
    if (usingLocal) {
      setProduction();
      setUsingLocal(false);
    } else {
      setLocal();
      setUsingLocal(true);
    }
  }, [usingLocal]);

  // Toggle polling
  const togglePolling = useCallback(() => {
    const learner = learnerRef.current;
    if (!learner) return;

    if (isPolling) {
      learner.stopPolling();
      setIsPolling(false);
      setLastDetection("Polling stopped");
    } else {
      learner.startPolling(500);
      setIsPolling(true);
      setLastDetection("Polling started...");
    }
  }, [isPolling]);

  // Calibration controls
  const startCalibration = useCallback(async () => {
    const learner = learnerRef.current;
    const bridge = bridgeRef.current;
    if (!learner || !bridge) return;

    // Must be polling for calibration to work
    if (!isPolling) {
      learner.startPolling(500);
      setIsPolling(true);
    }

    // Calibrate all 28 inventory slots
    await learner.startCalibration();
    setIsCalibrating(true);
  }, [isPolling]);

  const cancelCalibration = useCallback(() => {
    learnerRef.current?.cancelCalibration();
    setIsCalibrating(false);
  }, []);

  const skipCalibrationSlot = useCallback(() => {
    learnerRef.current?.skipCalibrationSlot();
  }, []);

  const clearCalibration = useCallback(() => {
    learnerRef.current?.clearCalibration();
    localStorage.removeItem(STORAGE_KEY_CALIBRATION);
    setCalibrationState(null);
  }, []);

  // Profile management
  const saveProfile = useCallback(() => {
    const learner = learnerRef.current;
    if (!learner || !profileName.trim()) return;

    const calData = learner.exportCalibration();
    if (calData.length === 0) return;

    const profile: CalibrationProfile = {
      name: profileName.trim(),
      data: calData,
      createdAt: Date.now(),
    };

    setProfiles((prev) => {
      const updated = [...prev.filter((p) => p.name !== profile.name), profile];
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
      return updated;
    });
    setProfileName("");
  }, [profileName]);

  const loadProfile = useCallback((profile: CalibrationProfile) => {
    const learner = learnerRef.current;
    if (!learner) return;

    learner.importCalibration(profile.data);
    localStorage.setItem(STORAGE_KEY_CALIBRATION, JSON.stringify(profile.data));
    setCalibrationState(learner.getCalibrationState());
    setLastDetection(`Loaded profile: ${profile.name}`);
  }, []);

  const deleteProfile = useCallback((name: string) => {
    setProfiles((prev) => {
      const updated = prev.filter((p) => p.name !== name);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Export/Import learned items
  const exportItems = useCallback(() => {
    const data = JSON.stringify(learnedItems, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-learned-items-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [learnedItems]);

  const importItems = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const items: LearnedItem[] = JSON.parse(reader.result as string);
          setLearnedItems(items);
          localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));

          // Also import into the live learner
          if (learnerRef.current) {
            learnerRef.current.importLearnedItems(
              items.map((i) => ({
                iconHash: i.iconHash,
                name: i.name,
                pHash: i.pHash,
              }))
            );
          }
          setLastDetection(`Imported ${items.length} items`);
        } catch (err) {
          console.error("[InventoryLearner] Import failed:", err);
          setLastDetection("Import failed - invalid JSON");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const clearAllItems = useCallback(() => {
    setLearnedItems([]);
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    setLastDetection("Cleared all learned items");
  }, []);

  // Filter items for search
  const filteredItems = searchFilter
    ? learnedItems.filter((item) =>
        item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.pHash && item.pHash.includes(searchFilter))
      )
    : learnedItems;

  // Build a 7x4 grid display from inventorySlots
  const gridSlots = Array.from({ length: 28 }, (_, i) => {
    const slotInfo = inventorySlots.find((s) => s.slot === i);
    const itemName = slotInfo?.itemName || learnedItems.find((li) => li.iconHash === slotInfo?.iconHash)?.name;
    return {
      slot: i,
      hasItem: slotInfo ? slotInfo.iconHash !== 0 : false,
      itemName: itemName || null,
    };
  });

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ margin: 0 }}>Inventory Learner</h1>
          <span
            className={`status-dot ${glAvailable ? "connected" : "disconnected"}`}
            title={glAvailable ? "GL Connected" : "GL Not Available"}
          />
        </div>
        <div className="header-controls">
          <button
            className={`server-toggle ${usingLocal ? "local" : "prod"}`}
            onClick={toggleServer}
          >
            {usingLocal ? "LOCAL" : "PROD"}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          Live
        </button>
        <button
          className={`tab-btn ${activeTab === "learned" ? "active" : ""}`}
          onClick={() => setActiveTab("learned")}
        >
          Learned Items
        </button>
        <button
          className={`tab-btn ${activeTab === "calibration" ? "active" : ""}`}
          onClick={() => setActiveTab("calibration")}
        >
          Calibration
        </button>
      </div>

      {/* ── Live Tab ── */}
      {activeTab === "live" && (
        <div>
          {/* Instructions */}
          <div className="panel" style={{ backgroundColor: "rgba(52, 152, 219, 0.1)", border: "1px solid rgba(52, 152, 219, 0.3)" }}>
            <div className="panel-title" style={{ color: "#3498db" }}>How to use:</div>
            <p className="text-sm text-muted" style={{ marginTop: 0, lineHeight: "1.6" }}>
              1. Complete calibration first (see Calibration tab)<br />
              2. Click "Start Polling" below to begin detecting items in your inventory<br />
              3. Hover over items to read their tooltips — the system will learn new items automatically
            </p>
          </div>

          {/* Controls */}
          <div className="panel">
            <div className="flex-between">
              <div className="panel-title">Detection</div>
              <button
                className={`btn ${isPolling ? "btn-danger" : "btn-success"}`}
                onClick={togglePolling}
                disabled={!glAvailable}
              >
                {isPolling ? "Stop Polling" : "Start Polling"}
              </button>
            </div>

            {/* Detection status */}
            {lastDetection && (
              <div className="detection-log">{lastDetection}</div>
            )}
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{learnedItems.length}</div>
              <div className="stat-label">Total Learned</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{sessionLearned}</div>
              <div className="stat-label">This Session</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {learnedItems.filter((i) => i.pHash).length}
              </div>
              <div className="stat-label">With pHash</div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="panel">
            <div className="panel-title">Inventory Grid</div>
            <div className="inventory-grid">
              {gridSlots.map((slot) => (
                <div
                  key={slot.slot}
                  className={`inventory-slot ${
                    slot.hasItem ? "has-item" : ""
                  } ${slot.itemName ? "detected" : ""}`}
                  title={slot.itemName || `Slot ${slot.slot + 1}`}
                >
                  {slot.itemName
                    ? slot.itemName.slice(0, 4)
                    : slot.hasItem
                    ? "?"
                    : slot.slot + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Last Learned */}
          {lastLearnedItem && (
            <div className="panel">
              <div className="panel-title">Last Learned</div>
              <div className="item-row" style={{ borderBottom: "none" }}>
                <span className="item-name">{lastLearnedItem.name}</span>
                {lastLearnedItem.pHash && (
                  <span className="item-hash">{lastLearnedItem.pHash}</span>
                )}
                <span className={`item-source ${lastLearnedItem.source}`}>
                  {lastLearnedItem.source}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Learned Items Tab ── */}
      {activeTab === "learned" && (
        <div>
          <div className="panel">
            <div className="flex-between mb-12">
              <div className="panel-title" style={{ marginBottom: 0 }}>
                Learned Items ({filteredItems.length})
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-outline" onClick={exportItems}>
                  Export
                </button>
                <button className="btn btn-outline" onClick={importItems}>
                  Import
                </button>
                <button
                  className="btn btn-danger"
                  onClick={clearAllItems}
                  disabled={learnedItems.length === 0}
                >
                  Clear All
                </button>
              </div>
            </div>

            <input
              className="search-input"
              placeholder="Search by name or pHash..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />

            <div className="item-list">
              {filteredItems.length === 0 && (
                <div className="text-center text-muted" style={{ padding: 24 }}>
                  {searchFilter
                    ? "No items match your search"
                    : "No items learned yet. Start polling on the Live tab to begin learning."}
                </div>
              )}
              {filteredItems.map((item, idx) => (
                <div key={`${item.iconHash}-${idx}`} className="item-row">
                  <span className="item-name">{item.name}</span>
                  {item.pHash && (
                    <span className="item-hash">{item.pHash}</span>
                  )}
                  <span className="item-confidence">
                    {Math.round(item.confidence * 100)}%
                  </span>
                  <span className={`item-source ${item.source}`}>
                    {item.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Calibration Tab ── */}
      {activeTab === "calibration" && (
        <div>
          {/* Status */}
          <div className="panel">
            <div className="panel-title">Mouse Calibration</div>
            <p className="text-sm text-muted" style={{ marginTop: 0, lineHeight: "1.6" }}>
              Position your mouse cursor <strong>directly in the center</strong> of each inventory slot when prompted.
              The cursor must be precisely centered on the slot for accurate calibration.
              A tooltip must be visible for each slot to register — hover until the item tooltip appears.
              Each slot requires multiple samples, so hold still in the center until it moves to the next slot.
            </p>

            <div className="calibration-status">
              <span
                className={`calibration-badge ${
                  calibrationState && calibrationState.calibratedSlots > 0
                    ? "active"
                    : "inactive"
                }`}
              >
                {calibrationState && calibrationState.calibratedSlots > 0
                  ? `Calibrated: ${calibrationState.calibratedSlots} slots`
                  : "Not Calibrated"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!isCalibrating ? (
                <button
                  className="btn btn-primary"
                  onClick={startCalibration}
                  disabled={!glAvailable}
                >
                  Start Calibration
                </button>
              ) : (
                <>
                  <button className="btn btn-outline" onClick={skipCalibrationSlot}>
                    Skip Slot
                  </button>
                  <button className="btn btn-danger" onClick={cancelCalibration}>
                    Cancel
                  </button>
                </>
              )}
              <button
                className="btn btn-outline"
                onClick={clearCalibration}
                disabled={isCalibrating}
              >
                Clear Calibration
              </button>
            </div>
          </div>

          {/* Calibration Progress */}
          {isCalibrating && calibrationState && (
            <div className="panel">
              <div className="panel-title">In Progress</div>
              <div className="calibration-progress">
                <div
                  className="calibration-progress-bar"
                  style={{
                    width: `${
                      (calibrationState.calibratedSlots /
                        calibrationState.totalSlots) *
                      100
                    }%`,
                  }}
                />
              </div>
              <div className="calibration-slot-display">
                <div className="slot-number">
                  Slot {calibrationState.targetSlot + 1}
                </div>
                <div className="slot-label">
                  Row{" "}
                  {Math.floor(calibrationState.targetSlot / (calibrationState.columns || 4)) + 1}, Col{" "}
                  {(calibrationState.targetSlot % (calibrationState.columns || 4)) + 1}
                </div>
                {calibrationState.countdown > 0 && (
                  <div className="countdown-ring">{calibrationState.countdown}</div>
                )}
                {calibrationState.capturing && (
                  <div style={{ color: '#4caf50', fontSize: '18px', fontWeight: 700, margin: '12px 0' }}>
                    CAPTURING — Hold Still!
                  </div>
                )}
              </div>
              <div className="text-center text-muted text-sm">
                {calibrationState.message}
              </div>
              <div className="text-center mt-8">
                <span className="text-sm text-muted">
                  Samples: {calibrationState.samplesCollected} /{" "}
                  {calibrationState.samplesNeeded}
                </span>
              </div>
            </div>
          )}

          {/* Profiles */}
          <div className="panel">
            <div className="panel-title">Calibration Profiles</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                className="search-input"
                style={{ marginBottom: 0, flex: 1 }}
                placeholder="Profile name..."
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={saveProfile}
                disabled={
                  !profileName.trim() ||
                  !calibrationState ||
                  calibrationState.calibratedSlots === 0
                }
              >
                Save
              </button>
            </div>

            <div className="profile-list">
              {profiles.length === 0 && (
                <div className="text-center text-muted text-sm" style={{ padding: 16 }}>
                  No saved profiles. Complete a calibration and save it here.
                </div>
              )}
              {profiles.map((profile) => (
                <div key={profile.name} className="profile-item">
                  <div>
                    <div style={{ fontWeight: 500 }}>{profile.name}</div>
                    <div className="text-sm text-muted">
                      {profile.data.length} slots -{" "}
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => loadProfile(profile)}
                    >
                      Load
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => deleteProfile(profile.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryLearnerApp;
