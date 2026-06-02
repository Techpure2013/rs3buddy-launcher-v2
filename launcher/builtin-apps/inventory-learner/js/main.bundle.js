(globalThis["webpackChunk"] = globalThis["webpackChunk"] || []).push([["main"],{

/***/ "./app/App.css"
/*!*********************!*\
  !*** ./app/App.css ***!
  \*********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./app/components/InventoryLearnerApp.tsx"
/*!************************************************!*\
  !*** ./app/components/InventoryLearnerApp.tsx ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _App_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../App.css */ "./app/App.css");
/* harmony import */ var _gl_TooltipItemLearner__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../gl/TooltipItemLearner */ "./gl/TooltipItemLearner.ts");
/* harmony import */ var _gl_GLBridgeAdapter__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../gl/GLBridgeAdapter */ "./gl/GLBridgeAdapter.ts");
/* harmony import */ var _types_itemApi__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../types/itemApi */ "./types/itemApi.ts");





const STORAGE_KEY_ITEMS = "inventoryLearnedItems";
const STORAGE_KEY_CALIBRATION = "inventoryMouseCalibration";
const STORAGE_KEY_PROFILES = "inventoryCalibrationProfiles";
const InventoryLearnerApp = () => {
    const [activeTab, setActiveTab] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("live");
    const [isPolling, setIsPolling] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [glAvailable, setGlAvailable] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [usingLocal, setUsingLocal] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [learnedItems, setLearnedItems] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
    const [lastDetection, setLastDetection] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
    const [isCalibrating, setIsCalibrating] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [calibrationState, setCalibrationState] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
    const [inventorySlots, setInventorySlots] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
    const [searchFilter, setSearchFilter] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("");
    const [profiles, setProfiles] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)([]);
    const [sessionLearned, setSessionLearned] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(0);
    const [lastLearnedItem, setLastLearnedItem] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);
    const [profileName, setProfileName] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("");
    const learnerRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
    const bridgeRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
    // Initialize GL bridge and learner
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        const alt1gl = globalThis.alt1gl;
        setGlAvailable(!!alt1gl);
        // Load saved items
        try {
            const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
            if (savedItems)
                setLearnedItems(JSON.parse(savedItems));
        }
        catch (e) {
            console.warn("[InventoryLearner] Failed to load saved items:", e);
        }
        // Load saved profiles
        try {
            const savedProfiles = localStorage.getItem(STORAGE_KEY_PROFILES);
            if (savedProfiles)
                setProfiles(JSON.parse(savedProfiles));
        }
        catch (e) {
            console.warn("[InventoryLearner] Failed to load saved profiles:", e);
        }
        // Initialize GL bridge if available
        if (alt1gl) {
            (0,_gl_GLBridgeAdapter__WEBPACK_IMPORTED_MODULE_3__.createGLBridge)().then((bridge) => {
                bridgeRef.current = bridge;
                const learner = new _gl_TooltipItemLearner__WEBPACK_IMPORTED_MODULE_2__.TooltipItemLearner(bridge);
                // Register listeners BEFORE importing data so emitted events are caught
                learner.onItemLearned((item) => {
                    setLearnedItems((prev) => {
                        const exists = prev.some((p) => p.pHash === item.pHash && p.name === item.name);
                        if (exists)
                            return prev;
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
                }
                catch (e) {
                    console.warn("[InventoryLearner] Failed to load calibration:", e);
                }
                // Import saved learned items into the learner
                try {
                    const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
                    if (savedItems) {
                        const items = JSON.parse(savedItems);
                        learner.importLearnedItems(items.map((i) => ({
                            iconHash: i.iconHash,
                            name: i.name,
                            pHash: i.pHash,
                        })));
                    }
                }
                catch (e) {
                    // Already warned above
                }
                // Init mouse tracking
                bridge.initMouseTracking();
                learnerRef.current = learner;
                globalThis._inventoryLearner = learner;
            }).catch((err) => {
                console.error("[InventoryLearner] Failed to create GL bridge:", err);
            });
        }
        return () => {
            learnerRef.current?.stopPolling();
        };
    }, []);
    // Toggle server
    const toggleServer = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        if (usingLocal) {
            (0,_types_itemApi__WEBPACK_IMPORTED_MODULE_4__.setProduction)();
            setUsingLocal(false);
        }
        else {
            (0,_types_itemApi__WEBPACK_IMPORTED_MODULE_4__.setLocal)();
            setUsingLocal(true);
        }
    }, [usingLocal]);
    // Toggle polling
    const togglePolling = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        const learner = learnerRef.current;
        if (!learner)
            return;
        if (isPolling) {
            learner.stopPolling();
            setIsPolling(false);
            setLastDetection("Polling stopped");
        }
        else {
            learner.startPolling(500);
            setIsPolling(true);
            setLastDetection("Polling started...");
        }
    }, [isPolling]);
    // Calibration controls
    const startCalibration = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(async () => {
        const learner = learnerRef.current;
        const bridge = bridgeRef.current;
        if (!learner || !bridge)
            return;
        // Must be polling for calibration to work
        if (!isPolling) {
            learner.startPolling(500);
            setIsPolling(true);
        }
        // Calibrate all 28 inventory slots
        await learner.startCalibration();
        setIsCalibrating(true);
    }, [isPolling]);
    const cancelCalibration = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        learnerRef.current?.cancelCalibration();
        setIsCalibrating(false);
    }, []);
    const skipCalibrationSlot = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        learnerRef.current?.skipCalibrationSlot();
    }, []);
    const clearCalibration = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        learnerRef.current?.clearCalibration();
        localStorage.removeItem(STORAGE_KEY_CALIBRATION);
        setCalibrationState(null);
    }, []);
    // Profile management
    const saveProfile = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        const learner = learnerRef.current;
        if (!learner || !profileName.trim())
            return;
        const calData = learner.exportCalibration();
        if (calData.length === 0)
            return;
        const profile = {
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
    const loadProfile = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((profile) => {
        const learner = learnerRef.current;
        if (!learner)
            return;
        learner.importCalibration(profile.data);
        localStorage.setItem(STORAGE_KEY_CALIBRATION, JSON.stringify(profile.data));
        setCalibrationState(learner.getCalibrationState());
        setLastDetection(`Loaded profile: ${profile.name}`);
    }, []);
    const deleteProfile = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((name) => {
        setProfiles((prev) => {
            const updated = prev.filter((p) => p.name !== name);
            localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
            return updated;
        });
    }, []);
    // Export/Import learned items
    const exportItems = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        const data = JSON.stringify(learnedItems, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory-learned-items-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [learnedItems]);
    const importItems = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const items = JSON.parse(reader.result);
                    setLearnedItems(items);
                    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
                    // Also import into the live learner
                    if (learnerRef.current) {
                        learnerRef.current.importLearnedItems(items.map((i) => ({
                            iconHash: i.iconHash,
                            name: i.name,
                            pHash: i.pHash,
                        })));
                    }
                    setLastDetection(`Imported ${items.length} items`);
                }
                catch (err) {
                    console.error("[InventoryLearner] Import failed:", err);
                    setLastDetection("Import failed - invalid JSON");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);
    const clearAllItems = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
        setLearnedItems([]);
        localStorage.removeItem(STORAGE_KEY_ITEMS);
        setLastDetection("Cleared all learned items");
    }, []);
    // Filter items for search
    const filteredItems = searchFilter
        ? learnedItems.filter((item) => item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (item.pHash && item.pHash.includes(searchFilter)))
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
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "app-container" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "app-header" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", { style: { margin: 0 } }, "Inventory Learner"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: `status-dot ${glAvailable ? "connected" : "disconnected"}`, title: glAvailable ? "GL Connected" : "GL Not Available" })),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "header-controls" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: `server-toggle ${usingLocal ? "local" : "prod"}`, onClick: toggleServer }, usingLocal ? "LOCAL" : "PROD"))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "tab-bar" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: `tab-btn ${activeTab === "live" ? "active" : ""}`, onClick: () => setActiveTab("live") }, "Live"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: `tab-btn ${activeTab === "learned" ? "active" : ""}`, onClick: () => setActiveTab("learned") }, "Learned Items"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: `tab-btn ${activeTab === "calibration" ? "active" : ""}`, onClick: () => setActiveTab("calibration") }, "Calibration")),
        activeTab === "live" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel", style: { backgroundColor: "rgba(52, 152, 219, 0.1)", border: "1px solid rgba(52, 152, 219, 0.3)" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title", style: { color: "#3498db" } }, "How to use:"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { className: "text-sm text-muted", style: { marginTop: 0, lineHeight: "1.6" } },
                    "1. Complete calibration first (see Calibration tab)",
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null),
                    "2. Click \"Start Polling\" below to begin detecting items in your inventory",
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("br", null),
                    "3. Hover over items to read their tooltips \u2014 the system will learn new items automatically")),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "flex-between" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title" }, "Detection"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: `btn ${isPolling ? "btn-danger" : "btn-success"}`, onClick: togglePolling, disabled: !glAvailable }, isPolling ? "Stop Polling" : "Start Polling")),
                lastDetection && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "detection-log" }, lastDetection))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stats-row" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-card" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-value" }, learnedItems.length),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-label" }, "Total Learned")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-card" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-value" }, sessionLearned),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-label" }, "This Session")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-card" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-value" }, learnedItems.filter((i) => i.pHash).length),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "stat-label" }, "With pHash"))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title" }, "Inventory Grid"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "inventory-grid" }, gridSlots.map((slot) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: slot.slot, className: `inventory-slot ${slot.hasItem ? "has-item" : ""} ${slot.itemName ? "detected" : ""}`, title: slot.itemName || `Slot ${slot.slot + 1}` }, slot.itemName
                    ? slot.itemName.slice(0, 4)
                    : slot.hasItem
                        ? "?"
                        : slot.slot + 1))))),
            lastLearnedItem && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title" }, "Last Learned"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "item-row", style: { borderBottom: "none" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "item-name" }, lastLearnedItem.name),
                    lastLearnedItem.pHash && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "item-hash" }, lastLearnedItem.pHash)),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: `item-source ${lastLearnedItem.source}` }, lastLearnedItem.source)))))),
        activeTab === "learned" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "flex-between mb-12" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title", style: { marginBottom: 0 } },
                        "Learned Items (",
                        filteredItems.length,
                        ")"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: 8 } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-outline", onClick: exportItems }, "Export"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-outline", onClick: importItems }, "Import"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-danger", onClick: clearAllItems, disabled: learnedItems.length === 0 }, "Clear All"))),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { className: "search-input", placeholder: "Search by name or pHash...", value: searchFilter, onChange: (e) => setSearchFilter(e.target.value) }),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "item-list" },
                    filteredItems.length === 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "text-center text-muted", style: { padding: 24 } }, searchFilter
                        ? "No items match your search"
                        : "No items learned yet. Start polling on the Live tab to begin learning.")),
                    filteredItems.map((item, idx) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: `${item.iconHash}-${idx}`, className: "item-row" },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "item-name" }, item.name),
                        item.pHash && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "item-hash" }, item.pHash)),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "item-confidence" },
                            Math.round(item.confidence * 100),
                            "%"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: `item-source ${item.source}` }, item.source)))))))),
        activeTab === "calibration" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title" }, "Mouse Calibration"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { className: "text-sm text-muted", style: { marginTop: 0, lineHeight: "1.6" } },
                    "Position your mouse cursor ",
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", null, "directly in the center"),
                    " of each inventory slot when prompted. The cursor must be precisely centered on the slot for accurate calibration. A tooltip must be visible for each slot to register \u2014 hover until the item tooltip appears. Each slot requires multiple samples, so hold still in the center until it moves to the next slot."),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "calibration-status" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: `calibration-badge ${calibrationState && calibrationState.calibratedSlots > 0
                            ? "active"
                            : "inactive"}` }, calibrationState && calibrationState.calibratedSlots > 0
                        ? `Calibrated: ${calibrationState.calibratedSlots} slots`
                        : "Not Calibrated")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: 8 } },
                    !isCalibrating ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-primary", onClick: startCalibration, disabled: !glAvailable }, "Start Calibration")) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-outline", onClick: skipCalibrationSlot }, "Skip Slot"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-danger", onClick: cancelCalibration }, "Cancel"))),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-outline", onClick: clearCalibration, disabled: isCalibrating }, "Clear Calibration"))),
            isCalibrating && calibrationState && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title" }, "In Progress"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "calibration-progress" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "calibration-progress-bar", style: {
                            width: `${(calibrationState.calibratedSlots /
                                calibrationState.totalSlots) *
                                100}%`,
                        } })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "calibration-slot-display" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "slot-number" },
                        "Slot ",
                        calibrationState.targetSlot + 1),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "slot-label" },
                        "Row",
                        " ",
                        Math.floor(calibrationState.targetSlot / (calibrationState.columns || 4)) + 1,
                        ", Col",
                        " ",
                        (calibrationState.targetSlot % (calibrationState.columns || 4)) + 1),
                    calibrationState.countdown > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "countdown-ring" }, calibrationState.countdown)),
                    calibrationState.capturing && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { color: '#4caf50', fontSize: '18px', fontWeight: 700, margin: '12px 0' } }, "CAPTURING \u2014 Hold Still!"))),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "text-center text-muted text-sm" }, calibrationState.message),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "text-center mt-8" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "text-sm text-muted" },
                        "Samples: ",
                        calibrationState.samplesCollected,
                        " /",
                        " ",
                        calibrationState.samplesNeeded)))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-title" }, "Calibration Profiles"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: 8, marginBottom: 12 } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { className: "search-input", style: { marginBottom: 0, flex: 1 }, placeholder: "Profile name...", value: profileName, onChange: (e) => setProfileName(e.target.value) }),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-primary", onClick: saveProfile, disabled: !profileName.trim() ||
                            !calibrationState ||
                            calibrationState.calibratedSlots === 0 }, "Save")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "profile-list" },
                    profiles.length === 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "text-center text-muted text-sm", style: { padding: 16 } }, "No saved profiles. Complete a calibration and save it here.")),
                    profiles.map((profile) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: profile.name, className: "profile-item" },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontWeight: 500 } }, profile.name),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "text-sm text-muted" },
                                profile.data.length,
                                " slots -",
                                " ",
                                new Date(profile.createdAt).toLocaleDateString())),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: 4 } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-outline", style: { padding: "4px 8px", fontSize: 11 }, onClick: () => loadProfile(profile) }, "Load"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "btn btn-danger", style: { padding: "4px 8px", fontSize: 11 }, onClick: () => deleteProfile(profile.name) }, "Delete")))))))))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (InventoryLearnerApp);


/***/ },

/***/ "./app/entrance/index.tsx"
/*!********************************!*\
  !*** ./app/entrance/index.tsx ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom_client__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom/client */ "../node_modules/react-dom/client.js");
/* harmony import */ var _components_InventoryLearnerApp__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/InventoryLearnerApp */ "./app/components/InventoryLearnerApp.tsx");



async function bootstrap() {
    const rootEl = document.getElementById("app");
    if (!rootEl)
        throw new Error("Missing #app element");
    react_dom_client__WEBPACK_IMPORTED_MODULE_1__.createRoot(rootEl).render(react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_InventoryLearnerApp__WEBPACK_IMPORTED_MODULE_2__["default"], null));
}
void bootstrap();


/***/ },

/***/ "./gl/GLBridgeAdapter.ts"
/*!*******************************!*\
  !*** ./gl/GLBridgeAdapter.ts ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GLBridgeAdapter: () => (/* binding */ GLBridgeAdapter),
/* harmony export */   createGLBridge: () => (/* binding */ createGLBridge)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _reflect2d__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reflect2d */ "./gl/reflect2d.ts");
/* harmony import */ var _spritecache__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./spritecache */ "./gl/spritecache.ts");
/**
 * GLBridge Adapter
 *
 * Bridges the GL layer to the inventory learner's detection system.
 * Implements the GLBridge interface for tooltip detection and item learning.
 */



/**
 * Adapter that implements GLBridge using the reflect2d system
 */
class GLBridgeAdapter {
    spriteCache;
    atlasTracker;
    uiScale = 1;
    constructor(spriteCache) {
        this.spriteCache = spriteCache;
        this.atlasTracker = new _reflect2d__WEBPACK_IMPORTED_MODULE_1__.AtlasTracker(spriteCache);
    }
    /**
     * Record render calls from the current frame
     */
    async recordRenderCalls(options) {
        const features = [];
        if (options.texturesnapshot)
            features.push('texturesnapshot');
        if (options.vertexarray)
            features.push('vertexarray');
        if (options.uniforms)
            features.push('uniforms');
        const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({
            features,
            maxframes: options.maxframes ?? 1,
        });
        return renders;
    }
    /**
     * Get UI elements from render data
     * Converts RS3 RenderRect format to our format
     */
    getUIState(renders) {
        const rs3State = (0,_reflect2d__WEBPACK_IMPORTED_MODULE_1__.getUIState)(renders, this.atlasTracker);
        const elements = rs3State.elements.map(el => this.convertRenderRect(el));
        return {
            elements,
            atlasTracker: this.atlasTracker,
        };
    }
    /**
     * Convert RS3 RenderRect to our RenderRect format
     */
    convertRenderRect(rs3Rect) {
        const sprite = rs3Rect.sprite;
        const known = sprite.known;
        const rawSprite = sprite;
        const spriteInfo = {
            hash: sprite.pixelhash,
            known: known ? {
                id: known.id,
                subId: known.subid,
                fontchr: known.fontchr ? {
                    chr: known.fontchr.chr,
                    charcode: known.fontchr.charcode,
                    x: known.fontchr.x,
                    y: known.fontchr.y,
                    width: known.fontchr.width,
                    height: known.fontchr.height,
                } : undefined,
                name: known.itemName ?? undefined,
                font: known.font,
            } : undefined,
            // Preserve raw texture data for pHash computation
            basetex: rawSprite.basetex,
            texX: rawSprite.x,
            texY: rawSprite.y,
            texWidth: rawSprite.width,
            texHeight: rawSprite.height,
        };
        // Color is already in ABGR format [A, B, G, R] with 0-255 values
        // RS3QB color array is [r, g, b, a] but values are 0-1 floats
        // Convert to 0-255 integers in [A, B, G, R] order
        const color = [
            Math.round(rs3Rect.color[3] * 255), // A
            Math.round(rs3Rect.color[2] * 255), // B
            Math.round(rs3Rect.color[1] * 255), // G
            Math.round(rs3Rect.color[0] * 255), // R
        ];
        return {
            x: rs3Rect.x,
            y: rs3Rect.y,
            width: rs3Rect.width,
            height: rs3Rect.height,
            color,
            sprite: spriteInfo,
        };
    }
    /**
     * Capture pixels from a texture or framebuffer
     */
    async capturePixels(textureId, x, y, width, height) {
        console.warn("[GLBridgeAdapter] capturePixels not fully implemented");
        return new Uint8Array(width * height * 4);
    }
    /**
     * Get current UI scale factor
     */
    getUIScale() {
        return this.uiScale;
    }
    /**
     * Set UI scale factor (call when detected or configured)
     */
    setUIScale(scale) {
        this.uiScale = scale;
    }
    screenMouseAvailable = false;
    electronScreen = null;
    /**
     * Initialize mouse position tracking.
     * Priority 1: Overlay API (via launcher preload or Electron IPC)
     * Priority 2: Electron screen API + RS3 window position (standalone mode)
     * Returns true if any mouse source is available.
     */
    async initMouseTracking() {
        // Check overlay API (set up by launcher preload via contextBridge proxy)
        if (_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.overlay?.getMousePosition) {
            console.log('[GLBridgeAdapter] Mouse tracking via overlay API: available');
            return true;
        }
        // Also check root-level getMousePosition (proxy compatibility)
        if (_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getMousePosition) {
            console.log('[GLBridgeAdapter] Mouse tracking via proxy API: available');
            return true;
        }
        console.log('[GLBridgeAdapter] Mouse tracking: not available');
        return false;
    }
    /**
     * Get current mouse position in GL viewport coordinates (Y-up).
     *
     * Priority 1: Overlay API (client coords from overlay DLL)
     * Priority 2: Electron screen cursor - RS3 window position (standalone)
     */
    getMousePositionGL(debug = false) {
        // Priority 1: Overlay API
        try {
            const clientPos = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.overlay?.getMousePosition();
            if (clientPos) {
                const viewportHeight = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsHeight() || 0;
                if (viewportHeight <= 0)
                    return null;
                const glX = clientPos.x;
                const glY = viewportHeight - clientPos.y;
                if (debug) {
                    console.log(`[MouseTrack] Overlay: Client(${clientPos.x}, ${clientPos.y}) -> GL(${glX}, ${glY})`);
                }
                if (glX < -10 || glY < -10 || glX > 10000 || glY > 10000)
                    return null;
                return { x: glX, y: glY };
            }
        }
        catch (e) {
            if (debug)
                console.warn('[MouseTrack] Overlay error:', e);
        }
        // Priority 2: Electron screen cursor + RS3 window position
        if (this.screenMouseAvailable && this.electronScreen) {
            try {
                const cursor = this.electronScreen.getCursorScreenPoint();
                if (!cursor || typeof cursor.x !== 'number')
                    return null;
                const rsX = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsX();
                const rsY = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsY();
                const rsWidth = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsWidth();
                const rsHeight = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsHeight();
                if (rsWidth <= 0 || rsHeight <= 0)
                    return null;
                // Convert screen coords to RS3 client coords
                const clientX = cursor.x - rsX;
                const clientY = cursor.y - rsY;
                // Check if cursor is within RS3 window
                if (clientX < 0 || clientY < 0 || clientX > rsWidth || clientY > rsHeight) {
                    return null;
                }
                // Convert client Y-down to GL Y-up
                const glX = clientX;
                const glY = rsHeight - clientY;
                if (debug) {
                    console.log(`[MouseTrack] Screen: Cursor(${cursor.x},${cursor.y}) RS(${rsX},${rsY}) -> Client(${clientX},${clientY}) -> GL(${glX},${glY})`);
                }
                return { x: glX, y: glY };
            }
            catch (e) {
                if (debug)
                    console.warn('[MouseTrack] Screen cursor error:', e);
            }
        }
        if (debug)
            console.log('[MouseTrack] No mouse position available');
        return null;
    }
    /**
     * Stop mouse tracking (cleanup)
     */
    stopMouseTracking() {
        this.screenMouseAvailable = false;
        this.electronScreen = null;
    }
    /**
     * Get the underlying sprite cache for direct access
     */
    getSpriteCache() {
        return this.spriteCache;
    }
    /**
     * Get the atlas tracker for direct access
     */
    getAtlasTracker() {
        return this.atlasTracker;
    }
    /**
     * Get item name from pHash (16-char hex string)
     */
    getItemByPHash(pHash) {
        return this.spriteCache.getItemByPHash(pHash);
    }
    /**
     * Find item by pHash with fuzzy matching
     */
    findItemByPHash(pHash, threshold = 10) {
        return this.spriteCache.findItemByPHash(pHash, threshold);
    }
}
/**
 * Create a GLBridge adapter with initialized sprite cache
 */
async function createGLBridge() {
    const spriteCache = new _spritecache__WEBPACK_IMPORTED_MODULE_2__.SpriteCache();
    await spriteCache.downloadCacheData();
    return new GLBridgeAdapter(spriteCache);
}


/***/ },

/***/ "./gl/TooltipItemLearner.ts"
/*!**********************************!*\
  !*** ./gl/TooltipItemLearner.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TOOLTIP_SPRITE_IDS: () => (/* binding */ TOOLTIP_SPRITE_IDS),
/* harmony export */   TooltipItemLearner: () => (/* binding */ TooltipItemLearner),
/* harmony export */   createTooltipLearner: () => (/* binding */ createTooltipLearner),
/* harmony export */   debugUniformNames: () => (/* binding */ debugUniformNames),
/* harmony export */   findMousePosition: () => (/* binding */ findMousePosition),
/* harmony export */   getMousePositionFromRender: () => (/* binding */ getMousePositionFromRender)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _phash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./phash */ "./gl/phash.ts");
/* harmony import */ var _types_itemApi__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../types/itemApi */ "./types/itemApi.ts");
/**
 * Tooltip Item Learner
 *
 * Auto-learns item names by detecting tooltips that appear when hovering
 * items in the inventory. Uses mouse position from the overlay API to
 * determine exactly which inventory slot is being hovered.
 *
 * Tooltip sprites: 4650, 4649, 4651, 35516
 * - These form a box around the item name text when hovering
 * - 35516 appears toward the center
 */



// Tooltip sprite IDs that form the tooltip background
const TOOLTIP_SPRITE_IDS = {
    topLeft: 4650,
    topRight: 4649,
    bottomLeft: 4651,
    center: 35516,
};
const TOOLTIP_ID_SET = new Set([
    TOOLTIP_SPRITE_IDS.topLeft,
    TOOLTIP_SPRITE_IDS.topRight,
    TOOLTIP_SPRITE_IDS.bottomLeft,
    TOOLTIP_SPRITE_IDS.center,
]);
/**
 * Extract mouse position from render invocation uniforms
 */
function getMousePositionFromRender(render) {
    if (!render.program?.uniforms || !render.uniformState)
        return null;
    const mouseUniform = render.program.uniforms.find((u) => u.name === 'uMouse' || u.name === 'mouse' || u.name === 'u_mouse');
    if (!mouseUniform)
        return null;
    try {
        const offset = mouseUniform.snapshotOffset;
        if (offset === undefined || offset < 0)
            return null;
        const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset + offset);
        const x = view.getFloat32(0, true);
        const y = view.getFloat32(4, true);
        if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x > 10000 || y > 10000) {
            return null;
        }
        return { x, y };
    }
    catch (e) {
        return null;
    }
}
/**
 * Debug: Log all uniform names from renders
 */
function debugUniformNames(renders) {
    const names = new Set();
    for (const render of renders) {
        if (render.program?.uniforms) {
            for (const u of render.program.uniforms) {
                names.add(u.name);
            }
        }
    }
    return Array.from(names).sort();
}
/**
 * Find mouse position from any render invocation that has the uMouse uniform
 */
function findMousePosition(renders) {
    for (const render of renders) {
        const pos = getMousePositionFromRender(render);
        if (pos)
            return pos;
    }
    return null;
}
/**
 * TooltipItemLearner - Auto-learns item names from inventory hover tooltips
 */
class TooltipItemLearner {
    glBridge;
    learnedItems = new Map();
    pHashIndex = new Map();
    listeners = new Set();
    renderStream = null;
    // Track last mouse position inside the inventory grid
    lastGridMousePos = null;
    lastGridMouseTime = 0;
    // Slot-vote confirmation system
    slotVotes = new Map();
    static VOTES_REQUIRED = 2;
    static MAX_INVENTORY_SLOTS = 28;
    debugMode = false;
    // pHash-based slot matching
    namePHashCandidates = new Map();
    // Slot pHash Validation Map
    slotPHashMap = new Map();
    slotPHashStability = new Map();
    static PHASH_STABLE_FRAMES = 2;
    // Last detected inventory slots (for external access, e.g. pre-calibration item detection)
    lastInventorySlots = [];
    // Inventory Mouse Calibration
    calibratedMousePositions = new Map();
    calibrationActive = false;
    calibrationSlotList = [];
    calibrationTargetIdx = 0;
    calibrationSamplesPerSlot = 3;
    calibrationListeners = new Set();
    calibrationCountdownFrames = 0;
    static CALIBRATION_COUNTDOWN_SECONDS = 4; // 4 second countdown per slot
    static CALIBRATION_FRAMES_PER_SECOND = 2; // ~500ms poll = 2 frames/sec
    calibrationNumCols = 4; // Actual detected columns for calibration display (not affected by MAX_INVENTORY_SLOTS cap)
    // UI text patterns that should never be learned as item names
    static REJECTED_PATTERNS = [
        /don'?t\s*show\s*this\s*again/i,
        /show\s*this\s*again/i,
        /are\s*you\s*sure/i,
        /click\s*here\s*to/i,
        /press\s*esc/i,
        /please\s*wait/i,
        /select\s*the\s*icon/i,
        /view\s*your\s*wealth/i,
        /to\s*view\s*your/i,
        /right[- ]?click/i,
        /drag\s*(and|&)?\s*drop/i,
        /hover\s*over/i,
        /left[- ]?click/i,
        /you\s*currently\s*have/i,
        /select\s*this\s*to/i,
        /open\s*the\s*price/i,
        // RS3 UI element tooltips (not inventory items)
        /\baction\s*bar\b/i,
        /\bsettings?\b/i,
        /\bworn\s*equipment\b/i,
        /\bfamiliar\s*(details?|options?)\b/i,
        /\bloot\s*inventory\b/i,
        /\bcustomise\b/i,
        /\bskill\s*guide\b/i,
        /\bminimise\b/i,
        /\bmaximise\b/i,
        /\bclose\s*window\b/i,
        /\bribbon\b/i,
        /\babilities?\s*book\b/i,
        /\bprayer\s*(?:list|book)\b/i,
        /\bspell\s*book\b/i,
        /\bbackpack\b/i,
        /\bequipment\s*(?:screen|stats?)\b/i,
    ];
    /**
     * Check if text looks like a UI instruction rather than an item name
     */
    static isInstructionalText(text) {
        const trimmed = text.trim();
        if (trimmed.endsWith('.'))
            return true;
        if (trimmed.endsWith('!'))
            return true;
        if (trimmed.length > 60)
            return true;
        const sentenceWords = ['the', 'to', 'your', 'you', 'for', 'this', 'that', 'from',
            'with', 'have', 'has', 'will', 'can', 'select', 'click', 'view', 'open',
            'press', 'drag', 'hover', 'please', 'would', 'should', 'must',
            'currently', 'here', 'items', 'or', 'interface'];
        const lowerWords = trimmed.toLowerCase().split(/\s+/);
        const sentenceWordCount = lowerWords.filter(w => sentenceWords.includes(w)).length;
        if (sentenceWordCount >= 3)
            return true;
        return false;
    }
    /**
     * Check if text looks like garbled OCR output rather than a real item name.
     * Garbled text has many single-char tokens, isolated digits, excessive punctuation.
     * Example: "Vanqu 1 is 0 h,00(0(m 0/a 1 a 1 0 g 0 g,i 0 c 0)0 1 00%"
     */
    static isGarbledText(text) {
        const trimmed = text.trim();
        if (trimmed.length < 3)
            return true;
        const tokens = trimmed.split(/\s+/);
        // If more than half of tokens are single characters, it's garbled
        const singleCharTokens = tokens.filter(t => t.length === 1).length;
        if (tokens.length >= 3 && singleCharTokens / tokens.length > 0.4)
            return true;
        // High punctuation density (parens, commas, slashes relative to length)
        const punctCount = (trimmed.match(/[(),\/\\%]/g) || []).length;
        if (punctCount > trimmed.length * 0.15)
            return true;
        // Excessive isolated digits (single digits separated by spaces)
        const isolatedDigits = tokens.filter(t => /^\d$/.test(t)).length;
        if (isolatedDigits >= 3)
            return true;
        return false;
    }
    // Inventory grid config
    gridConfig = {
        startX: 0,
        startY: 0,
        slotWidth: 40,
        slotHeight: 36,
        columns: 4,
        rows: 7,
        horizontalGap: 2,
        verticalGap: 2,
        actualGridTopY: 0,
        actualCellWidth: 0,
        actualCellHeight: 0,
    };
    // Actual detected column X and row Y positions
    columnPositions = [];
    rowPositions = [];
    // Inventory slot sprite ID
    INVENTORY_SLOT_SPRITE_ID = 18266;
    constructor(glBridge) {
        this.glBridge = glBridge;
    }
    /**
     * Set grid config
     */
    setGridConfig(config) {
        this.gridConfig = { ...config };
    }
    // ── Calibration API ──
    async startCalibration(slotIndices) {
        let detectedCols = this.gridConfig.columns;
        let detectedSlotList = null;
        try {
            console.log('[Calibration] Detecting inventory grid from GL sprites...');
            const renders = await this.glBridge.recordRenderCalls({
                texturesnapshot: true,
                uniforms: true,
                vertexarray: true,
            });
            const uiState = this.glBridge.getUIState(renders);
            const elements = uiState.elements;
            const slotSprites = elements.filter((el) => el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID);
            if (slotSprites.length >= 8) {
                // Also trigger autoCalibrate for normal detection if not done yet
                if (this.gridConfig.startX === 0 && this.gridConfig.startY === 0) {
                    this.detectFromElements(elements, renders, null);
                }
                const xClusters = this.clusterPositions(slotSprites.map((s) => s.x), 8)
                    .filter(c => c.count >= 2)
                    .sort((a, b) => a.center - b.center);
                const yClusters = this.clusterPositions(slotSprites.map((s) => s.y), 8)
                    .filter(c => c.count >= 2)
                    .sort((a, b) => a.center - b.center);
                if (xClusters.length >= 2 && yClusters.length >= 2) {
                    const colCenters = xClusters.map(c => c.center);
                    const rowCenters = [...yClusters.map(c => c.center)].reverse();
                    detectedCols = colCenters.length;
                    const numRows = rowCenters.length;
                    console.log(`[Calibration] Detected grid: ${detectedCols} columns × ${numRows} rows from ${slotSprites.length} slot sprites`);
                    const SLOT_W = 40;
                    const SLOT_H = 36;
                    const targets = [];
                    for (let row = 0; row < numRows; row++) {
                        for (let col = 0; col < detectedCols; col++) {
                            const slotIndex = row * detectedCols + col;
                            const slotX = colCenters[col];
                            const slotY = rowCenters[row];
                            const hasItem = elements.some((el) => {
                                if (el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID)
                                    return false;
                                if (el.sprite?.known?.fontchr)
                                    return false;
                                if (el.width < 10 || el.height < 10)
                                    return false;
                                return (el.x >= slotX - 2 &&
                                    el.y >= slotY - 2 &&
                                    el.x + el.width <= slotX + SLOT_W + 5 &&
                                    el.y + el.height <= slotY + SLOT_H + 5);
                            });
                            if (hasItem) {
                                targets.push(slotIndex);
                            }
                        }
                    }
                    if (targets.length > 0) {
                        detectedSlotList = targets;
                        console.log(`[Calibration] Found ${targets.length} slots with items: [${targets.join(', ')}]`);
                    }
                    else {
                        console.warn('[Calibration] No slots with items detected — will calibrate all slots');
                    }
                }
            }
            else {
                console.warn(`[Calibration] Only ${slotSprites.length} slot sprites found (need 8+) — running detectAndLearn fallback`);
                await this.detectAndLearn();
                detectedCols = this.gridConfig.columns;
            }
        }
        catch (e) {
            console.warn('[Calibration] Grid detection failed, using defaults:', e);
        }
        this.calibrationNumCols = detectedCols;
        if (slotIndices && slotIndices.length > 0) {
            this.calibrationSlotList = slotIndices;
        }
        else if (detectedSlotList && detectedSlotList.length > 0) {
            this.calibrationSlotList = detectedSlotList;
        }
        else {
            const total = Math.min(this.calibrationNumCols * this.gridConfig.rows, TooltipItemLearner.MAX_INVENTORY_SLOTS);
            this.calibrationSlotList = Array.from({ length: total }, (_, i) => i);
        }
        this.calibrationActive = true;
        this.calibrationTargetIdx = 0;
        this.calibratedMousePositions.clear();
        this.calibrationCountdownFrames = TooltipItemLearner.CALIBRATION_COUNTDOWN_SECONDS * TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND;
        console.log(`[Calibration] Started: ${this.calibrationSlotList.length} slots to calibrate (${this.calibrationSamplesPerSlot} samples each)`);
        console.log(`[Calibration] Grid: ${this.calibrationNumCols} columns (detected from sprites, no cap applied)`);
        this.emitCalibrationState();
    }
    /**
     * Test inventory detection — captures a frame, detects grid, computes pHash for each slot.
     * Call from console: _inventoryLearner.testInventory()
     */
    async testInventory() {
        console.log('[TestInventory] Capturing frame...');
        const renders = await this.glBridge.recordRenderCalls({
            texturesnapshot: true,
            uniforms: true,
            vertexarray: true,
        });
        const uiState = this.glBridge.getUIState(renders);
        const elements = uiState.elements;
        const slotSprites = elements.filter((el) => el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID);
        console.log(`[TestInventory] Found ${slotSprites.length} slot sprites, ${elements.length} total elements`);
        if (slotSprites.length < 4) {
            console.warn('[TestInventory] Not enough slot sprites. Is your inventory open?');
            return { columns: 0, rows: 0, slots: [] };
        }
        const xClusters = this.clusterPositions(slotSprites.map((s) => s.x), 8)
            .filter(c => c.count >= 2)
            .sort((a, b) => a.center - b.center);
        const yClusters = this.clusterPositions(slotSprites.map((s) => s.y), 8)
            .filter(c => c.count >= 2)
            .sort((a, b) => a.center - b.center);
        console.log(`[TestInventory] X clusters: ${xClusters.map(c => `X=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);
        console.log(`[TestInventory] Y clusters: ${yClusters.map(c => `Y=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);
        if (xClusters.length < 2 || yClusters.length < 2) {
            console.warn('[TestInventory] Not enough clusters for grid detection');
            return { columns: xClusters.length, rows: yClusters.length, slots: [] };
        }
        const colCenters = xClusters.map(c => c.center);
        // GL Y-up: row 0 (top of screen) = highest Y value
        const rowCenters = [...yClusters.map(c => c.center)].reverse();
        const numCols = colCenters.length;
        const numRows = rowCenters.length;
        console.log(`[TestInventory] Grid: ${numCols} columns x ${numRows} rows = ${numCols * numRows} slots`);
        const SLOT_W = 40;
        const SLOT_H = 36;
        const padding = 1;
        const slots = [];
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const slotIndex = row * numCols + col;
                const slotX = colCenters[col];
                const slotY = rowCenters[row];
                // Find all elements within this slot bounds
                const slotElements = elements.filter((el) => {
                    if (el.sprite?.known?.id === this.INVENTORY_SLOT_SPRITE_ID)
                        return false;
                    if (el.sprite?.known?.fontchr)
                        return false;
                    if (el.width < 10 || el.height < 10)
                        return false;
                    return (el.x >= slotX - 2 &&
                        el.y >= slotY - 2 &&
                        el.x + el.width <= slotX + SLOT_W + padding &&
                        el.y + el.height <= slotY + SLOT_H + padding);
                });
                const itemSprite = this.findItemSprite(slotElements);
                let pHashHex = '';
                // Compute pHash from the item sprite texture
                if (itemSprite) {
                    try {
                        const rawSprite = itemSprite.sprite;
                        const basetex = rawSprite.basetex;
                        if (basetex && typeof basetex.capture === 'function') {
                            const canCapture = typeof basetex.canCapture === 'function' ? basetex.canCapture() : true;
                            if (canCapture) {
                                const texX = rawSprite.texX ?? rawSprite.x ?? 0;
                                const texY = rawSprite.texY ?? rawSprite.y ?? 0;
                                const texW = rawSprite.texWidth ?? rawSprite.width ?? 0;
                                const texH = rawSprite.texHeight ?? rawSprite.height ?? 0;
                                const texDataW = basetex.width ?? 0;
                                const texDataH = basetex.height ?? 0;
                                if (texW > 0 && texH > 0 && texX >= 0 && texY >= 0 &&
                                    texX + texW <= texDataW && texY + texH <= texDataH) {
                                    const imgData = basetex.capture(texX, texY, texW, texH);
                                    const expectedLen = imgData ? imgData.width * imgData.height * 4 : 0;
                                    if (imgData && imgData.data && imgData.data.length >= expectedLen && imgData.width > 0 && imgData.height > 0) {
                                        const pHashValue = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.itemHash)(imgData.data, imgData.width, imgData.height);
                                        pHashHex = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.itemHashToHex)(pHashValue);
                                        if (pHashHex === '00000000000000000000000000000000' || pHashHex === 'ffffffffffffffffffffffffffffffff') {
                                            pHashHex = `INVALID(${pHashHex})`;
                                        }
                                    }
                                    else {
                                        pHashHex = 'CAPTURE_FAILED';
                                    }
                                }
                                else {
                                    pHashHex = 'BAD_BOUNDS';
                                }
                            }
                            else {
                                pHashHex = 'NO_CAPTURE';
                            }
                        }
                        else {
                            pHashHex = 'NO_BASETEX';
                        }
                    }
                    catch {
                        pHashHex = 'ERROR';
                    }
                }
                slots.push({ slot: slotIndex, row: row + 1, col: col + 1, hasItem: !!itemSprite, pHash: pHashHex });
            }
        }
        // Print nice formatted table
        console.log('\n[TestInventory] ═══════════════════════════════════════════════════════════');
        console.log(`[TestInventory] INVENTORY GRID: ${numCols} columns x ${numRows} rows`);
        console.log('[TestInventory] ═══════════════════════════════════════════════════════════');
        for (let row = 0; row < numRows; row++) {
            console.log(`[TestInventory] ─── Row ${row + 1} ───`);
            for (let col = 0; col < numCols; col++) {
                const s = slots[row * numCols + col];
                if (s.hasItem) {
                    console.log(`[TestInventory]   Slot ${String(s.slot).padStart(2)} │ R${s.row}C${s.col} │ ITEM │ pHash: ${s.pHash}`);
                }
                else {
                    console.log(`[TestInventory]   Slot ${String(s.slot).padStart(2)} │ R${s.row}C${s.col} │ empty │`);
                }
            }
        }
        const withItems = slots.filter(s => s.hasItem);
        console.log('[TestInventory] ═══════════════════════════════════════════════════════════');
        console.log(`[TestInventory] ${withItems.length} items found, ${slots.length - withItems.length} empty slots`);
        console.log('[TestInventory] ═══════════════════════════════════════════════════════════\n');
        return { columns: numCols, rows: numRows, slots };
    }
    cancelCalibration() {
        if (!this.calibrationActive)
            return;
        this.calibrationActive = false;
        console.log(`[Calibration] Cancelled. ${this.calibratedMousePositions.size} slots were calibrated.`);
        this.emitCalibrationState();
    }
    skipCalibrationSlot() {
        if (!this.calibrationActive)
            return;
        const slot = this.calibrationSlotList[this.calibrationTargetIdx];
        console.log(`[Calibration] Skipping slot ${slot + 1}`);
        this.calibrationTargetIdx++;
        this.calibrationCountdownFrames = TooltipItemLearner.CALIBRATION_COUNTDOWN_SECONDS * TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND;
        if (this.calibrationTargetIdx >= this.calibrationSlotList.length) {
            this.calibrationActive = false;
            console.log(`[Calibration] Complete! ${this.calibratedMousePositions.size} slots calibrated.`);
        }
        this.emitCalibrationState();
    }
    recordCalibrationSample(mousePos) {
        if (!this.calibrationActive)
            return false;
        // Countdown phase - wait before capturing
        if (this.calibrationCountdownFrames > 0) {
            this.calibrationCountdownFrames--;
            this.emitCalibrationState();
            return false;
        }
        const slot = this.calibrationSlotList[this.calibrationTargetIdx];
        let samples = this.calibratedMousePositions.get(slot);
        if (!samples) {
            samples = [];
            this.calibratedMousePositions.set(slot, samples);
        }
        samples.push({ x: mousePos.x, y: mousePos.y });
        console.log(`[Calibration] Slot ${slot + 1}: sample ${samples.length}/${this.calibrationSamplesPerSlot} at (${mousePos.x.toFixed(0)}, ${mousePos.y.toFixed(0)})`);
        if (samples.length >= this.calibrationSamplesPerSlot) {
            this.calibrationTargetIdx++;
            // Reset countdown for next slot
            this.calibrationCountdownFrames = TooltipItemLearner.CALIBRATION_COUNTDOWN_SECONDS * TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND;
            if (this.calibrationTargetIdx >= this.calibrationSlotList.length) {
                this.calibrationActive = false;
                console.log(`[Calibration] Complete! ${this.calibratedMousePositions.size} slots calibrated.`);
                this.logCalibrationSummary();
            }
            this.emitCalibrationState();
            return true;
        }
        this.emitCalibrationState();
        return false;
    }
    getCalibratedPosition(slot) {
        const samples = this.calibratedMousePositions.get(slot);
        if (!samples || samples.length === 0)
            return null;
        const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
        const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
        return { x: avgX, y: avgY };
    }
    isCalibrated() {
        return this.calibratedMousePositions.size > 0;
    }
    isCalibrating() {
        return this.calibrationActive;
    }
    getCalibrationState() {
        const targetIdx = this.calibrationTargetIdx;
        const slot = this.calibrationSlotList[targetIdx] ?? 0;
        const samples = this.calibratedMousePositions.get(slot);
        const collected = samples?.length ?? 0;
        const cols = this.calibrationNumCols;
        const row = Math.floor(slot / cols);
        const col = slot % cols;
        const countdown = Math.ceil(this.calibrationCountdownFrames / TooltipItemLearner.CALIBRATION_FRAMES_PER_SECOND);
        const capturing = this.calibrationActive && this.calibrationCountdownFrames <= 0;
        return {
            active: this.calibrationActive,
            targetSlot: slot,
            totalSlots: this.calibrationSlotList.length,
            samplesCollected: collected,
            samplesNeeded: this.calibrationSamplesPerSlot,
            calibratedSlots: this.calibratedMousePositions.size,
            countdown,
            capturing,
            columns: cols,
            message: this.calibrationActive
                ? this.calibrationCountdownFrames > 0
                    ? `Move to slot ${slot + 1} (row ${row + 1}, col ${col + 1}) — ${countdown}s...`
                    : `CAPTURING slot ${slot + 1} — Hold still! ${collected}/${this.calibrationSamplesPerSlot} samples`
                : this.calibratedMousePositions.size > 0
                    ? `Calibrated: ${this.calibratedMousePositions.size} slots`
                    : 'Not calibrated',
        };
    }
    onCalibrationStateChange(listener) {
        this.calibrationListeners.add(listener);
        return () => this.calibrationListeners.delete(listener);
    }
    clearCalibration() {
        this.calibratedMousePositions.clear();
        this.calibrationActive = false;
        console.log('[Calibration] Cleared all calibration data.');
        this.emitCalibrationState();
    }
    exportCalibration() {
        const result = [];
        for (const [slot, samples] of this.calibratedMousePositions) {
            if (samples.length > 0) {
                const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length;
                const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length;
                result.push({ slot, x: avgX, y: avgY });
            }
        }
        return result;
    }
    importCalibration(data) {
        this.calibratedMousePositions.clear();
        for (const entry of data) {
            this.calibratedMousePositions.set(entry.slot, [{ x: entry.x, y: entry.y }]);
        }
        console.log(`[Calibration] Imported ${data.length} calibrated positions.`);
        this.emitCalibrationState();
    }
    emitCalibrationState() {
        const state = this.getCalibrationState();
        for (const listener of this.calibrationListeners) {
            try {
                listener(state);
            }
            catch (e) {
                console.error('[Calibration] Listener error:', e);
            }
        }
    }
    logCalibrationSummary() {
        const columns = this.calibrationNumCols;
        console.log('[Calibration] === Summary ===');
        for (const [slot, samples] of this.calibratedMousePositions) {
            const avg = this.getCalibratedPosition(slot);
            if (avg) {
                const row = Math.floor(slot / columns);
                const col = slot % columns;
                console.log(`  Slot ${slot + 1} (row${row},col${col}): avg mouse (${avg.x.toFixed(0)}, ${avg.y.toFixed(0)}) from ${samples.length} samples`);
            }
        }
    }
    /**
     * Detect tooltip and learn item name if visible
     */
    async detectAndLearn() {
        const renders = await this.glBridge.recordRenderCalls({
            texturesnapshot: true,
            uniforms: true,
            vertexarray: true,
        });
        const mousePos = this.glBridge.getMousePositionGL();
        const uiState = this.glBridge.getUIState(renders);
        const result = this.detectFromElements(uiState.elements, renders, mousePos);
        // Release texture references to prevent memory leak
        // TextureSnapshot objects from native addon hold GPU memory
        for (const el of uiState.elements) {
            if (el.sprite) {
                el.sprite.basetex = undefined;
            }
        }
        return result;
    }
    /**
     * Detect tooltip from pre-captured elements
     */
    detectFromElements(elements, renders, preMousePos) {
        // Auto-calibrate grid if needed
        this.autoCalibrate(elements);
        // Track mouse grid position every frame
        const earlyMousePos = preMousePos ?? this.glBridge.getMousePositionGL();
        if (earlyMousePos) {
            const earlySlot = this.getNearestSlotGenerous(earlyMousePos.x, earlyMousePos.y);
            if (earlySlot !== null) {
                this.lastGridMousePos = { x: earlyMousePos.x, y: earlyMousePos.y, slot: earlySlot };
                this.lastGridMouseTime = Date.now();
            }
        }
        // Check if mouse is within inventory bounds (skip tooltip detection if outside)
        // Use calibrated mouse positions for bounds since raw grid positions vs mouse coords have ~300px IPC drift
        if (earlyMousePos && this.calibratedMousePositions.size >= 4) {
            const padding = 40;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const [, samples] of this.calibratedMousePositions) {
                for (const s of samples) {
                    if (s.x < minX)
                        minX = s.x;
                    if (s.x > maxX)
                        maxX = s.x;
                    if (s.y < minY)
                        minY = s.y;
                    if (s.y > maxY)
                        maxY = s.y;
                }
            }
            if (minX < Infinity) {
                const isMouseInBounds = earlyMousePos.x >= minX - padding && earlyMousePos.x <= maxX + padding &&
                    earlyMousePos.y >= minY - padding && earlyMousePos.y <= maxY + padding;
                if (!isMouseInBounds) {
                    this.debugMode && console.log(`[TooltipLearner] Mouse (${earlyMousePos.x.toFixed(0)},${earlyMousePos.y.toFixed(0)}) outside calibrated inventory bounds, skipping`);
                    return {
                        isVisible: false,
                        bounds: null,
                        text: null,
                        nearestSlot: null,
                        confidence: 0,
                    };
                }
            }
        }
        // Find tooltip elements by sprite ID
        const tooltipElements = elements.filter(el => el.sprite.known && TOOLTIP_ID_SET.has(el.sprite.known.id));
        let tooltipBounds = null;
        if (tooltipElements.length > 0) {
            this.debugMode && console.log(`[TooltipLearner] Found ${tooltipElements.length} tooltip sprites by ID`);
            const positions = tooltipElements.slice(0, 5).map(el => `ID:${el.sprite.known?.id} at (${el.x.toFixed(0)},${el.y.toFixed(0)})`);
            this.debugMode && console.log(`[TooltipLearner] Positions: ${positions.join(', ')}`);
            tooltipBounds = this.calculateTooltipBounds(tooltipElements);
            this.debugMode && console.log(`[TooltipLearner] calculateTooltipBounds result: ${tooltipBounds ? `(${tooltipBounds.x.toFixed(0)},${tooltipBounds.y.toFixed(0)}) ${tooltipBounds.width.toFixed(0)}x${tooltipBounds.height.toFixed(0)}` : 'null'}`);
        }
        // Fallback: detect tooltip by finding text character clusters near inventory
        if (!tooltipBounds) {
            tooltipBounds = this.detectTooltipByTextCluster(elements);
            if (tooltipBounds) {
                this.debugMode && console.log(`[TooltipLearner] Fallback detected tooltip: (${tooltipBounds.x.toFixed(0)},${tooltipBounds.y.toFixed(0)}) ${tooltipBounds.width.toFixed(0)}x${tooltipBounds.height.toFixed(0)}`);
            }
        }
        if (!tooltipBounds) {
            return {
                isVisible: false,
                bounds: null,
                text: null,
                nearestSlot: null,
                confidence: 0,
            };
        }
        // Extract text from tooltip area
        const { fullText, itemName } = this.extractTooltipText(elements, tooltipBounds);
        // Find inventory slots and their contents
        const inventorySlots = this.findInventorySlots(elements);
        this.lastInventorySlots = inventorySlots;
        // Update slot pHash map every frame
        this.updateSlotPHashMap(inventorySlots);
        // Detect hovered slot by highlight element count
        const hoveredByHighlight = this.detectHoveredSlotByHighlight(inventorySlots, elements);
        // Get mouse position
        let mousePos = preMousePos ?? null;
        if (!mousePos) {
            mousePos = this.glBridge.getMousePositionGL();
        }
        if (!mousePos) {
            const rawRenders = renders;
            mousePos = renders ? findMousePosition(rawRenders) : null;
        }
        // Calibration mode is now handled in startPolling (lightweight path)
        // so detectFromElements is never called during calibration
        let hoveredSlot = null;
        let confidence = 0.5;
        let detectionMethod = 'none';
        // Determine tooltip column
        const { columns } = this.gridConfig;
        const cellWidth = this.gridConfig.actualCellWidth || (this.gridConfig.slotWidth + 2);
        const tooltipCenterX = tooltipBounds.x + tooltipBounds.width / 2;
        let tooltipCol = -1;
        let bestColDist = Infinity;
        for (let c = 0; c < this.columnPositions.length; c++) {
            const colCenterX = this.columnPositions[c] + this.gridConfig.slotWidth / 2;
            const dist = Math.abs(tooltipCenterX - colCenterX);
            if (dist < bestColDist) {
                bestColDist = dist;
                tooltipCol = c;
            }
        }
        if (bestColDist > cellWidth * 1.5)
            tooltipCol = -1;
        // SLOT DETECTION - Calibrated mouse ONLY
        // When tooltipCol is known (from GL sprite coordinates), constrain search to that column.
        // This prevents IPC mouse drift from picking a slot in the wrong column.
        if (mousePos && this.calibratedMousePositions.size > 0) {
            // Compute inventory bounding box from calibrated positions (IPC mouse space).
            // Rejects tooltips from UI elements outside the inventory area.
            const BOUNDS_PADDING = 5;
            let boundsMinX = Infinity, boundsMaxX = -Infinity;
            let boundsMinY = Infinity, boundsMaxY = -Infinity;
            for (const [, calPosList] of this.calibratedMousePositions) {
                for (const calPos of calPosList) {
                    if (calPos.x < boundsMinX)
                        boundsMinX = calPos.x;
                    if (calPos.x > boundsMaxX)
                        boundsMaxX = calPos.x;
                    if (calPos.y < boundsMinY)
                        boundsMinY = calPos.y;
                    if (calPos.y > boundsMaxY)
                        boundsMaxY = calPos.y;
                }
            }
            const mouseOutOfBounds = mousePos.x < boundsMinX - BOUNDS_PADDING || mousePos.x > boundsMaxX + BOUNDS_PADDING ||
                mousePos.y < boundsMinY - BOUNDS_PADDING || mousePos.y > boundsMaxY + BOUNDS_PADDING;
            if (mouseOutOfBounds) {
                this.debugMode && console.log(`[TooltipLearner] Mouse (${mousePos.x.toFixed(0)},${mousePos.y.toFixed(0)}) outside inventory bounds [${boundsMinX.toFixed(0)}-${boundsMaxX.toFixed(0)}, ${boundsMinY.toFixed(0)}-${boundsMaxY.toFixed(0)}] — skipping`);
            }
            else {
                let bestDist = Infinity;
                let bestCalSlot = null;
                for (const [slotIdx] of this.calibratedMousePositions) {
                    // If tooltip column is known, only consider slots in that column
                    if (tooltipCol >= 0 && (slotIdx % columns) !== tooltipCol)
                        continue;
                    const calPos = this.getCalibratedPosition(slotIdx);
                    if (!calPos)
                        continue;
                    const dx = mousePos.x - calPos.x;
                    const dy = mousePos.y - calPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestCalSlot = slotIdx;
                    }
                }
                const cellDiag = Math.sqrt(cellWidth * cellWidth + (this.gridConfig.actualCellHeight || this.gridConfig.slotHeight) ** 2);
                if (bestCalSlot !== null && bestDist < cellDiag * 1.5) {
                    hoveredSlot = bestCalSlot;
                    confidence = 0.95;
                    detectionMethod = 'calibrated';
                    const calPos = this.getCalibratedPosition(bestCalSlot);
                    const calRow = Math.floor(bestCalSlot / columns);
                    const calCol = bestCalSlot % columns;
                    const slotPHash = this.slotPHashMap.get(bestCalSlot) ?? 'none';
                    console.log(`[DETECT] "${itemName ?? fullText}" → slot ${bestCalSlot + 1} (r${calRow}c${calCol}) | mouse=(${mousePos.x.toFixed(0)},${mousePos.y.toFixed(0)}) cal=(${calPos?.x.toFixed(0)},${calPos?.y.toFixed(0)}) dist=${bestDist.toFixed(0)}px | grid=${columns}x${this.gridConfig.rows} | slotPHash=${slotPHash} | tooltipCol=${tooltipCol}`);
                }
                else {
                    this.debugMode && console.log(`[TooltipLearner] CALIBRATED: no match within range (bestDist=${bestDist.toFixed(0)}px, threshold=${(cellDiag * 1.5).toFixed(0)}px)`);
                }
            } // end mouseOutOfBounds else
        }
        else {
            if (!mousePos) {
                this.debugMode && console.log(`[TooltipLearner] No mouse position available -- skipping slot detection`);
            }
            else {
                this.debugMode && console.log(`[TooltipLearner] No calibration data -- skipping slot detection. Run calibration first.`);
            }
        }
        // If we found a slot with an item, learn the association
        const nameToLearn = itemName || fullText;
        if (hoveredSlot !== null && nameToLearn && nameToLearn.length > 0) {
            const isRejected = TooltipItemLearner.REJECTED_PATTERNS.some(p => p.test(nameToLearn));
            const isInstruction = TooltipItemLearner.isInstructionalText(nameToLearn);
            const isGarbled = TooltipItemLearner.isGarbledText(nameToLearn);
            if (isRejected || isInstruction || isGarbled) {
                this.debugMode && console.log(`[TooltipLearner] Rejected ${isRejected ? 'UI pattern' : isGarbled ? 'garbled OCR' : 'instructional text'}: "${nameToLearn}"`);
                return {
                    isVisible: true,
                    bounds: tooltipBounds,
                    text: fullText,
                    nearestSlot: hoveredSlot,
                    confidence: 0,
                };
            }
            // Filter out non-inventory tooltips
            const firstLine = fullText?.split('\n')[0]?.trim() ?? '';
            const hasContextMenu = fullText ? /\+\d+ options/.test(fullText) : false;
            const verbWasStripped = itemName !== null && itemName !== firstLine;
            if (!verbWasStripped && hasContextMenu) {
                this.debugMode && console.log(`[TooltipLearner] Skipping non-inventory tooltip: "${firstLine}" (context menu with no inventory verb)`);
            }
            else {
                let slotInfo = inventorySlots.find(s => s.slot === hoveredSlot);
                const col = hoveredSlot % columns;
                // pHash intersection matching
                const columnSlotsWithItems = inventorySlots.filter(s => (s.slot % columns) === col && s.iconHash !== 0 && s.pHash);
                const currentColumnPHashes = new Set(columnSlotsWithItems.map(s => s.pHash));
                if (currentColumnPHashes.size > 0) {
                    const existing = this.namePHashCandidates.get(nameToLearn);
                    if (existing) {
                        const intersection = new Set();
                        for (const ph of existing) {
                            if (currentColumnPHashes.has(ph))
                                intersection.add(ph);
                        }
                        this.namePHashCandidates.set(nameToLearn, intersection);
                        this.debugMode && console.log(`[pHashMatch] "${nameToLearn}": intersected ${existing.size} x ${currentColumnPHashes.size} -> ${intersection.size} candidates`);
                        if (intersection.size === 1) {
                            const matchedPHash = Array.from(intersection)[0];
                            const matchedSlot = columnSlotsWithItems.find(s => s.pHash === matchedPHash);
                            if (matchedSlot) {
                                this.debugMode && console.log(`[pHashMatch] "${nameToLearn}" resolved to slot ${matchedSlot.slot + 1} via pHash ${matchedPHash}`);
                                slotInfo = matchedSlot;
                                hoveredSlot = matchedSlot.slot;
                                confidence = 0.92;
                            }
                        }
                    }
                    else {
                        // Cap size to prevent unbounded growth
                        if (this.namePHashCandidates.size > 200) {
                            this.namePHashCandidates.clear();
                        }
                        this.namePHashCandidates.set(nameToLearn, currentColumnPHashes);
                        this.debugMode && console.log(`[pHashMatch] "${nameToLearn}": first sighting, ${currentColumnPHashes.size} candidates in col ${col}`);
                    }
                }
                // Elimination fallback
                if (slotInfo && slotInfo.iconHash !== 0) {
                    const alreadyKnown = this.learnedItems.get(slotInfo.iconHash);
                    const nameAlreadyLearned = Array.from(this.learnedItems.values()).some(i => i.name === nameToLearn);
                    if (!nameAlreadyLearned && alreadyKnown && alreadyKnown.name !== nameToLearn) {
                        const allColumnSlotsWithItems = inventorySlots.filter(s => (s.slot % columns) === col && s.iconHash !== 0);
                        const unlearnedInColumn = allColumnSlotsWithItems.filter(s => !this.learnedItems.has(s.iconHash));
                        if (unlearnedInColumn.length === 1) {
                            this.debugMode && console.log(`[TooltipLearner] Elimination: "${nameToLearn}" must be slot ${unlearnedInColumn[0].slot + 1} (only unlearned slot in col ${col})`);
                            slotInfo = unlearnedInColumn[0];
                            hoveredSlot = slotInfo.slot;
                        }
                        else if (unlearnedInColumn.length > 1) {
                            this.debugMode && console.log(`[TooltipLearner] Elimination: ${unlearnedInColumn.length} unlearned slots in col ${col}, can't disambiguate yet`);
                        }
                    }
                }
                if (slotInfo && slotInfo.iconHash !== 0) {
                    // pHash Validation Gate
                    const validation = this.validateSlotByPHash(hoveredSlot, inventorySlots);
                    if (validation.valid && validation.pHash) {
                        this.debugMode && console.log(`[pHashValidation] Slot ${hoveredSlot + 1} VALIDATED (pHash: ${validation.pHash}) -- learning "${nameToLearn}" immediately`);
                        const existing = this.learnedItems.get(slotInfo.iconHash);
                        if (existing && existing.name === nameToLearn) {
                            // Already known
                        }
                        else {
                            const nameAlreadyLearned = Array.from(this.learnedItems.values()).some(i => i.name === nameToLearn);
                            if (!nameAlreadyLearned) {
                                const learnedItem = {
                                    name: nameToLearn,
                                    iconHash: slotInfo.iconHash,
                                    pHash: validation.pHash,
                                    learnedAt: Date.now(),
                                    confidence: 0.95,
                                    source: 'tooltip',
                                };
                                this.learnedItems.set(slotInfo.iconHash, learnedItem);
                                if (validation.pHash) {
                                    this.pHashIndex.set(validation.pHash, learnedItem);
                                }
                                for (const listener of this.listeners) {
                                    try {
                                        listener(learnedItem);
                                    }
                                    catch (e) {
                                        console.error('[TooltipLearner] Listener error:', e);
                                    }
                                }
                                (0,_types_itemApi__WEBPACK_IMPORTED_MODULE_2__.queueItem)({ name: learnedItem.name, pHash: learnedItem.pHash });
                                this.slotVotes.delete(nameToLearn);
                                this.debugMode && console.log(`[TooltipLearner] Learned "${nameToLearn}" via pHash validation (slot ${hoveredSlot + 1}, pHash: ${validation.pHash}, iconHash: ${slotInfo.iconHash})`);
                            }
                            else {
                                this.debugMode && console.log(`[TooltipLearner] "${nameToLearn}" already learned for different hash -- skipping`);
                            }
                        }
                    }
                    else {
                        this.debugMode && console.log(`[pHashValidation] Slot ${hoveredSlot + 1} NOT validated: ${validation.reason} -- using vote system`);
                        this.learnItemSync(slotInfo, nameToLearn);
                    }
                    this.debugMode && console.log(`[TooltipLearner] Processing slot ${hoveredSlot + 1}: "${nameToLearn}" (method: ${detectionMethod}, itemName: "${itemName}", fullText: "${fullText}")`);
                }
            }
        }
        return {
            isVisible: true,
            bounds: tooltipBounds,
            text: fullText,
            nearestSlot: hoveredSlot,
            confidence,
        };
    }
    /**
     * Get the inventory slot at a specific screen position
     */
    getSlotAtPosition(x, y) {
        const { slotWidth, slotHeight, columns, actualCellWidth, actualCellHeight } = this.gridConfig;
        const hitHalfW = (actualCellWidth > 0 ? actualCellWidth : slotWidth) / 2;
        const hitMaxY = (actualCellHeight > 0 ? actualCellHeight : slotHeight) * 2;
        if (this.columnPositions.length > 0 && this.rowPositions.length > 0) {
            let bestCol = -1;
            let bestColDist = Infinity;
            for (let c = 0; c < this.columnPositions.length; c++) {
                const colCenter = this.columnPositions[c] + slotWidth / 2;
                const dist = Math.abs(x - colCenter);
                if (dist < bestColDist && dist <= hitHalfW) {
                    bestColDist = dist;
                    bestCol = c;
                }
            }
            let bestRow = -1;
            let bestRowDist = Infinity;
            for (let r = 0; r < this.rowPositions.length; r++) {
                const rowCenter = this.rowPositions[r] + slotHeight / 2;
                const dist = Math.abs(y - rowCenter);
                if (dist < bestRowDist && dist <= hitMaxY) {
                    bestRowDist = dist;
                    bestRow = r;
                }
            }
            if (bestCol >= 0 && bestRow >= 0) {
                return bestRow * columns + bestCol;
            }
            return null;
        }
        // Fallback: step-based calculation
        const { startX, startY, rows, actualGridTopY } = this.gridConfig;
        const cellWidth = actualCellWidth > 0 ? actualCellWidth : (slotWidth + 2);
        const cellHeight = actualCellHeight > 0 ? actualCellHeight : (slotHeight + 2);
        const gridTopY = actualGridTopY > 0 ? actualGridTopY : startY;
        const col = Math.floor((x - startX + cellWidth / 2) / cellWidth);
        const row = Math.floor((gridTopY - y + cellHeight / 2) / cellHeight);
        if (col < 0 || col >= columns || row < 0 || row >= rows) {
            return null;
        }
        return row * columns + col;
    }
    /**
     * Find nearest inventory slot with generous tolerance
     */
    getNearestSlotGenerous(x, y) {
        const { slotWidth, slotHeight, columns, actualCellWidth, actualCellHeight } = this.gridConfig;
        if (this.columnPositions.length === 0 || this.rowPositions.length === 0)
            return null;
        const maxColDist = (actualCellWidth > 0 ? actualCellWidth : slotWidth) * 1.5;
        const maxRowDist = (actualCellHeight > 0 ? actualCellHeight : slotHeight) * 2.5;
        let bestCol = -1;
        let bestColDist = Infinity;
        for (let c = 0; c < this.columnPositions.length; c++) {
            const colCenter = this.columnPositions[c] + slotWidth / 2;
            const dist = Math.abs(x - colCenter);
            if (dist < bestColDist) {
                bestColDist = dist;
                bestCol = c;
            }
        }
        if (bestCol < 0 || bestColDist > maxColDist)
            return null;
        let bestRow = -1;
        let bestRowDist = Infinity;
        for (let r = 0; r < this.rowPositions.length; r++) {
            const rowCenter = this.rowPositions[r] + slotHeight / 2;
            const dist = Math.abs(y - rowCenter);
            if (dist < bestRowDist) {
                bestRowDist = dist;
                bestRow = r;
            }
        }
        if (bestRow < 0 || bestRowDist > maxRowDist)
            return null;
        const slotIdx = bestRow * columns + bestCol;
        if (slotIdx >= TooltipItemLearner.MAX_INVENTORY_SLOTS)
            return null;
        return slotIdx;
    }
    /**
     * Detect tooltip by finding clusters of text characters
     */
    detectTooltipByTextCluster(elements) {
        const textElements = elements.filter(el => {
            if (!el.sprite.known?.fontchr)
                return false;
            const color = el.color;
            if (color && (color[1] ?? 0) < 15 && (color[2] ?? 0) < 15 && (color[3] ?? 0) < 15) {
                return false;
            }
            return true;
        });
        if (textElements.length < 3)
            return null;
        const inventorySlots = elements.filter(el => el.sprite.known?.id === 18266);
        if (inventorySlots.length === 0)
            return null;
        const invMinX = Math.min(...inventorySlots.map(s => s.x));
        const invMaxX = Math.max(...inventorySlots.map(s => s.x + s.width));
        const invMinY = Math.min(...inventorySlots.map(s => s.y));
        const invMaxY = Math.max(...inventorySlots.map(s => s.y + s.height));
        const searchArea = {
            x: invMinX - 200,
            y: invMinY - 150,
            width: (invMaxX - invMinX) + 400,
            height: (invMaxY - invMinY) + 300,
        };
        const nearbyText = textElements.filter(el => el.x >= searchArea.x && el.x <= searchArea.x + searchArea.width &&
            el.y >= searchArea.y && el.y <= searchArea.y + searchArea.height);
        if (nearbyText.length < 3)
            return null;
        const Y_TOLERANCE = 8;
        const lines = [];
        const sorted = [...nearbyText].sort((a, b) => b.y - a.y);
        let currentLine = [];
        let currentY = -Infinity;
        for (const el of sorted) {
            if (currentLine.length === 0 || Math.abs(el.y - currentY) <= Y_TOLERANCE) {
                currentLine.push(el);
                currentY = currentLine.reduce((sum, e) => sum + e.y, 0) / currentLine.length;
            }
            else {
                if (currentLine.length >= 2)
                    lines.push(currentLine);
                currentLine = [el];
                currentY = el.y;
            }
        }
        if (currentLine.length >= 2)
            lines.push(currentLine);
        for (let i = 0; i < lines.length; i++) {
            for (let numLines = 1; numLines <= Math.min(4, lines.length - i); numLines++) {
                const cluster = lines.slice(i, i + numLines);
                const allChars = cluster.flat();
                const minX = Math.min(...allChars.map(c => c.x));
                const maxX = Math.max(...allChars.map(c => c.x + c.width));
                const minY = Math.min(...allChars.map(c => c.y));
                const maxY = Math.max(...allChars.map(c => c.y + c.height));
                const width = maxX - minX;
                const height = maxY - minY;
                if (width < 30 || width > 350)
                    continue;
                if (height < 8 || height > 150)
                    continue;
                const charDensity = allChars.length / (width * height) * 1000;
                if (charDensity < 0.1)
                    continue;
                const clusterText = allChars
                    .map(c => this.getFontChar(c.sprite.known?.fontchr))
                    .join('');
                const letterCount = (clusterText.match(/[a-zA-Z]/g) || []).length;
                const totalCount = clusterText.length;
                if (letterCount < 2 || letterCount / totalCount < 0.3) {
                    continue;
                }
                const clusterCenterX = (minX + maxX) / 2;
                const clusterBottom = minY;
                for (const slot of inventorySlots) {
                    const slotCenterX = slot.x + slot.width / 2;
                    const slotTop = slot.y + slot.height;
                    const dx = Math.abs(clusterCenterX - slotCenterX);
                    const dy = clusterBottom - slotTop;
                    if (dx < 100 && dy > -50 && dy < 150) {
                        this.debugMode && console.log(`[TooltipLearner] Fallback found: "${clusterText}" (${letterCount}/${totalCount} letters)`);
                        return {
                            x: minX - 5,
                            y: minY - 5,
                            width: width + 10,
                            height: height + 10,
                        };
                    }
                }
            }
        }
        return null;
    }
    /**
     * Calculate the bounding box of tooltip sprites
     */
    calculateTooltipBounds(elements) {
        if (elements.length === 0)
            return null;
        const centerSprites = elements.filter(el => el.sprite.known?.id === TOOLTIP_SPRITE_IDS.center);
        this.debugMode && console.log(`[calculateTooltipBounds] ${elements.length} tooltip elements, ${centerSprites.length} center sprites`);
        if (centerSprites.length > 0) {
            for (const center of centerSprites) {
                const nearby = elements.filter(el => {
                    const dx = Math.abs(el.x - center.x);
                    const dy = Math.abs(el.y - center.y);
                    return dx < 300 && dy < 200;
                });
                this.debugMode && console.log(`[calculateTooltipBounds] Center at (${center.x.toFixed(0)},${center.y.toFixed(0)}) has ${nearby.length} nearby`);
                if (nearby.length >= 2) {
                    let minX = Infinity, minY = Infinity;
                    let maxX = -Infinity, maxY = -Infinity;
                    for (const el of nearby) {
                        minX = Math.min(minX, el.x);
                        minY = Math.min(minY, el.y);
                        maxX = Math.max(maxX, el.x + el.width);
                        maxY = Math.max(maxY, el.y + el.height);
                    }
                    const width = maxX - minX;
                    const height = maxY - minY;
                    this.debugMode && console.log(`[calculateTooltipBounds] Cluster bounds: ${width.toFixed(0)}x${height.toFixed(0)}`);
                    if (width < 400 && height < 300 && width > 20 && height > 10) {
                        return { x: minX, y: minY, width, height };
                    }
                    else {
                        this.debugMode && console.log(`[calculateTooltipBounds] Rejected - size out of range`);
                    }
                }
            }
        }
        // Fallback: find any small cluster
        this.debugMode && console.log(`[calculateTooltipBounds] Trying fallback cluster detection...`);
        let bestCluster = null;
        let smallestArea = Infinity;
        for (const el of elements) {
            const nearby = elements.filter(other => {
                const dx = Math.abs(other.x - el.x);
                const dy = Math.abs(other.y - el.y);
                return dx < 200 && dy < 150;
            });
            if (nearby.length >= 2) {
                let minX = Infinity, minY = Infinity;
                let maxX = -Infinity, maxY = -Infinity;
                for (const n of nearby) {
                    minX = Math.min(minX, n.x);
                    minY = Math.min(minY, n.y);
                    maxX = Math.max(maxX, n.x + n.width);
                    maxY = Math.max(maxY, n.y + n.height);
                }
                const width = maxX - minX;
                const height = maxY - minY;
                const area = width * height;
                if (width < 350 && height < 250 && width > 20 && height > 10) {
                    if (area < smallestArea) {
                        smallestArea = area;
                        bestCluster = { x: minX, y: minY, width, height };
                    }
                }
            }
        }
        if (bestCluster) {
            this.debugMode && console.log(`[calculateTooltipBounds] Found cluster: ${bestCluster.width.toFixed(0)}x${bestCluster.height.toFixed(0)}`);
            return bestCluster;
        }
        this.debugMode && console.log(`[calculateTooltipBounds] No valid cluster found`);
        return null;
    }
    getFontChar(fontchr) {
        if (!fontchr)
            return '';
        if (typeof fontchr === 'string')
            return fontchr;
        if (typeof fontchr === 'object' && fontchr.chr)
            return fontchr.chr;
        return '';
    }
    isShadowText(color) {
        if (!color || !Array.isArray(color))
            return false;
        return (color[1] ?? 0) < 15 && (color[2] ?? 0) < 15 && (color[3] ?? 0) < 15;
    }
    normalizeColorValue(value) {
        if (value > 255) {
            return Math.round(Math.sqrt(value));
        }
        return value;
    }
    isColoredText(color) {
        if (!color || !Array.isArray(color))
            return false;
        const b = this.normalizeColorValue(color[1] ?? 0);
        const g = this.normalizeColorValue(color[2] ?? 0);
        const r = this.normalizeColorValue(color[3] ?? 0);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const spread = max - min;
        const avgColor = (r + g + b) / 3;
        const rDiff = Math.abs(r - avgColor);
        const gDiff = Math.abs(g - avgColor);
        const bDiff = Math.abs(b - avgColor);
        const maxDiff = Math.max(rDiff, gDiff, bDiff);
        if (maxDiff < 15 && avgColor > 140) {
            return false;
        }
        if (spread >= 20 || maxDiff >= 15) {
            return true;
        }
        return avgColor < 140 || spread > 10;
    }
    /**
     * Extract item name from first line using color detection
     */
    extractItemNameFromFirstLine(lineChars, gapThreshold) {
        const sorted = [...lineChars].sort((a, b) => a.x - b.x);
        let itemName = '';
        let prevEl = null;
        let prevChar = '';
        let inColoredSection = false;
        let debugColors = [];
        for (const el of sorted) {
            const thisChar = this.getFontChar(el.sprite.known.fontchr);
            if (prevEl && thisChar === prevChar && Math.abs(el.x - prevEl.x) <= 2) {
                continue;
            }
            const color = el.color;
            const isColored = this.isColoredText(color);
            if (debugColors.length < 15) {
                const r = this.normalizeColorValue(color?.[3] ?? 0);
                const g = this.normalizeColorValue(color?.[2] ?? 0);
                const b = this.normalizeColorValue(color?.[1] ?? 0);
                debugColors.push(`'${thisChar}':[R${r},G${g},B${b}]=${isColored ? 'COLOR' : 'white'}`);
            }
            if (isColored) {
                inColoredSection = true;
                if (prevEl && inColoredSection) {
                    const prevEnd = prevEl.x + prevEl.width;
                    const gap = el.x - prevEnd;
                    if (gap >= gapThreshold) {
                        itemName += ' ';
                    }
                }
                itemName += thisChar;
                prevEl = el;
                prevChar = thisChar;
            }
            else if (inColoredSection) {
                if (prevEl) {
                    const prevEnd = prevEl.x + prevEl.width;
                    const gap = el.x - prevEnd;
                    if (gap >= gapThreshold * 2) {
                        break;
                    }
                }
            }
        }
        this.debugMode && console.log(`[ColorDetect] ${debugColors.join(', ')}`);
        if (!itemName.trim()) {
            this.debugMode && console.log(`[ColorDetect] No colored text found, using full line`);
            return this.extractLineText(sorted, gapThreshold);
        }
        this.debugMode && console.log(`[ColorDetect] Extracted colored item name: "${itemName.trim()}"`);
        return itemName.trim();
    }
    extractLineText(lineChars, gapThreshold) {
        let lineText = '';
        let prevEl = null;
        let prevChar = '';
        for (const el of lineChars) {
            const thisChar = this.getFontChar(el.sprite.known.fontchr);
            if (prevEl && thisChar === prevChar && Math.abs(el.x - prevEl.x) <= 2) {
                continue;
            }
            if (prevEl) {
                const prevEnd = prevEl.x + prevEl.width;
                const gap = el.x - prevEnd;
                if (gap >= gapThreshold) {
                    lineText += ' ';
                }
            }
            lineText += thisChar;
            prevEl = el;
            prevChar = thisChar;
        }
        return lineText;
    }
    /**
     * Extract text from elements within tooltip bounds
     */
    extractTooltipText(elements, bounds) {
        const padding = 10;
        const tooltipElements = elements.filter(el => {
            return (el.x >= bounds.x - padding &&
                el.x <= bounds.x + bounds.width + padding &&
                el.y >= bounds.y - padding &&
                el.y <= bounds.y + bounds.height + padding);
        });
        if (tooltipElements.length === 0)
            return { fullText: null, itemName: null };
        const ACTION_BAR_FONT_ID = 494;
        const SORT_Y_TOLERANCE = 6;
        const fontElements = tooltipElements
            .filter(el => {
            if (!el.sprite.known?.fontchr)
                return false;
            if (this.isShadowText(el.color))
                return false;
            const fontId = el.sprite.known?.font?.basesprite?.id;
            if (fontId === ACTION_BAR_FONT_ID)
                return false;
            return true;
        })
            .sort((a, b) => {
            const yDiff = b.y - a.y;
            if (Math.abs(yDiff) > SORT_Y_TOLERANCE)
                return yDiff;
            return a.x - b.x;
        });
        if (fontElements.length === 0)
            return { fullText: null, itemName: null };
        // Group into lines by Y position
        const Y_LINE_TOLERANCE = 12;
        const lines = [];
        let currentLine = [];
        let currentLineY = -Infinity;
        for (const el of fontElements) {
            if (currentLine.length === 0 || Math.abs(el.y - currentLineY) <= Y_LINE_TOLERANCE) {
                currentLine.push(el);
                if (currentLine.length === 1) {
                    currentLineY = el.y;
                }
                else {
                    currentLineY = currentLine.reduce((sum, e) => sum + e.y, 0) / currentLine.length;
                }
            }
            else {
                if (currentLine.length > 0)
                    lines.push(currentLine);
                currentLine = [el];
                currentLineY = el.y;
            }
        }
        if (currentLine.length > 0)
            lines.push(currentLine);
        // Post-process: merge close lines
        const mergedLines = [];
        for (const line of lines) {
            const lineAvgY = line.reduce((sum, el) => sum + el.y, 0) / line.length;
            if (mergedLines.length > 0) {
                const prevLine = mergedLines[mergedLines.length - 1];
                const prevAvgY = prevLine.reduce((sum, el) => sum + el.y, 0) / prevLine.length;
                if (Math.abs(lineAvgY - prevAvgY) <= Y_LINE_TOLERANCE) {
                    prevLine.push(...line);
                    this.debugMode && console.log(`[Tooltip] Merged line at Y=${lineAvgY.toFixed(0)} with previous at Y=${prevAvgY.toFixed(0)}`);
                    continue;
                }
            }
            mergedLines.push([...line]);
        }
        this.debugMode && console.log(`[Tooltip] Line grouping: ${lines.length} initial -> ${mergedLines.length} merged (tolerance=${Y_LINE_TOLERANCE}px)`);
        // Process each line with smart spacing
        const textLines = [];
        for (const lineChars of mergedLines) {
            lineChars.sort((a, b) => a.x - b.x);
            const fontId = lineChars[0]?.sprite.known?.font?.basesprite?.id;
            const avgHeight = lineChars.reduce((sum, el) => sum + el.height, 0) / lineChars.length;
            let gapThreshold;
            if (fontId && fontId > 0) {
                const fontGapThresholds = {
                    645: 2, 646: 2, 647: 2, 648: 2,
                    649: 3, 650: 3,
                    651: 3, 652: 3,
                };
                gapThreshold = fontGapThresholds[fontId] ?? Math.max(2, Math.round(avgHeight * 0.25));
                this.debugMode && console.log(`[Tooltip] Using font ID ${fontId}, gap threshold: ${gapThreshold}px`);
            }
            else {
                gapThreshold = avgHeight < 10 ? 2 : 3;
                this.debugMode && console.log(`[Tooltip] Unknown font (ID ${fontId}), using conservative gap threshold: ${gapThreshold}px (avgH=${avgHeight.toFixed(1)})`);
            }
            let lineText = '';
            let prevEl = null;
            let prevChar = '';
            for (const el of lineChars) {
                const thisChar = this.getFontChar(el.sprite.known.fontchr);
                if (prevEl && thisChar === prevChar && Math.abs(el.x - prevEl.x) <= 2) {
                    continue;
                }
                if (prevEl) {
                    const prevEnd = prevEl.x + prevEl.width;
                    const gap = el.x - prevEnd;
                    if (gap >= gapThreshold) {
                        lineText += ' ';
                    }
                }
                lineText += thisChar;
                prevEl = el;
                prevChar = thisChar;
            }
            if (lineText.trim()) {
                textLines.push({ y: lineChars[0].y, text: lineText });
                this.debugMode && console.log(`[Tooltip] Line Y=${lineChars[0].y.toFixed(0)} avgH=${avgHeight.toFixed(1)} gap=${gapThreshold}px: "${lineText}"`);
            }
        }
        if (textLines.length === 0)
            return { fullText: null, itemName: null };
        textLines.sort((a, b) => b.y - a.y);
        const processedLines = textLines.map(l => ({
            y: l.y,
            text: this.autoSpaceText(l.text)
        }));
        const fullText = processedLines.map(l => l.text).join('\n') || null;
        // Extract item name from the first meaningful line
        let itemName = null;
        const meaningfulLine = processedLines.find(line => {
            const text = line.text.trim();
            if (text.length < 3)
                return false;
            if (/^['".,;:!?+\-\s]+$/.test(text))
                return false;
            if (text.startsWith('+'))
                return false;
            return true;
        });
        if (meaningfulLine) {
            const firstLine = meaningfulLine.text;
            this.debugMode && console.log(`[Tooltip] First meaningful line for item extraction: "${firstLine}"`);
            const actionVerbs = [
                'Get info', 'String', 'Unstring',
                'Eat', 'Use', 'Wear', 'Wield', 'Equip', 'Remove', 'Drop', 'Examine',
                'Drink', 'Read', 'Open', 'Close', 'Light', 'Extinguish', 'Empty',
                'Fill', 'Check', 'Activate', 'Deactivate', 'Bury', 'Scatter',
                'Cast', 'Plant', 'Pick', 'Harvest', 'Info',
                'Clean', 'Crush', 'Grind', 'Mix', 'Add', 'Combine', 'Split',
                'Craft', 'Fletch', 'Smith', 'Cook', 'Burn', 'Cut', 'Chop',
                'Mine', 'Smelt', 'Spin', 'Weave', 'Tan', 'Chip',
                'Rub', 'Break', 'Destroy', 'Disassemble', 'Dismantle',
                'Teleport', 'Configure', 'Adjust', 'Set', 'Tune',
                'Summon', 'Dismiss', 'Feed', 'Interact', 'Play',
                'Claim', 'Redeem', 'Inspect', 'Study', 'Investigate',
                'Sip', 'Apply', 'Invoke', 'Boost', 'Restore',
                'Assemble', 'Repair', 'Charge', 'Uncharge',
                'Toggle', 'Switch', 'Brandish', 'Flourish',
                'Offer', 'Sacrifice', 'Release',
            ];
            for (const verb of actionVerbs) {
                if (firstLine.toLowerCase().startsWith(verb.toLowerCase() + ' ')) {
                    itemName = firstLine.substring(verb.length + 1).trim();
                    this.debugMode && console.log(`[Tooltip] Extracted item name by removing verb "${verb}": "${itemName}"`);
                    break;
                }
            }
            if (!itemName) {
                if (!firstLine.startsWith('+') && !firstLine.match(/^\d/)) {
                    itemName = firstLine;
                    this.debugMode && console.log(`[Tooltip] Using first line as item name (no verb): "${itemName}"`);
                }
            }
        }
        // Fallback: color-based extraction
        if (!itemName && meaningfulLine) {
            const targetY = meaningfulLine.y;
            const targetLineChars = mergedLines.find(line => {
                const avgY = line.reduce((sum, el) => sum + el.y, 0) / line.length;
                return Math.abs(avgY - targetY) < 15;
            });
            if (targetLineChars && targetLineChars.length > 0) {
                const avgHeight = targetLineChars.reduce((sum, el) => sum + el.height, 0) / targetLineChars.length;
                const gapThreshold = avgHeight < 10 ? 2 : 3;
                itemName = this.extractItemNameFromFirstLine(targetLineChars, gapThreshold);
                if (itemName) {
                    itemName = this.autoSpaceText(itemName);
                    this.debugMode && console.log(`[Tooltip] Extracted item name by color: "${itemName}"`);
                }
            }
        }
        // Handle "X -> Y" arrow pattern
        if (itemName && itemName.includes('->')) {
            const arrowParts = itemName.split('->').map(s => s.trim());
            if (arrowParts.length >= 2 && arrowParts[1].length > 0) {
                this.debugMode && console.log(`[Tooltip] Arrow pattern in final name: "${itemName}" -> using target: "${arrowParts[1]}"`);
                itemName = arrowParts[1];
            }
        }
        return { fullText, itemName };
    }
    /**
     * Auto-space text to fix common missing space patterns
     */
    autoSpaceText(text) {
        let result = text;
        // Rule 1: digit -> letter
        result = result.replace(/(\d)([a-zA-Z])/g, '$1 $2');
        // Rule 2: letter -> digit (quantity)
        result = result.replace(/([a-z])(\d+)(?=[^a-zA-Z]|$)/gi, '$1 $2');
        // Rule 3: camelCase
        result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
        // Rule 4: common RS3 suffixes
        const commonSuffixes = ['torso', 'helm', 'legs', 'boots', 'gloves', 'shield', 'sword', 'bow', 'staff', 'wand', 'orb', 'cape', 'amulet', 'necklace', 'bracelet', 'options', 'charges', 'uses'];
        const ringSafePattern = /([lnst])(ring)(?:\s|$)/gi;
        for (const suffix of commonSuffixes) {
            const pattern = new RegExp(`([a-z])(${suffix})`, 'gi');
            result = result.replace(pattern, '$1 $2');
        }
        result = result.replace(ringSafePattern, '$1 $2');
        // Rule 5: common RS3 prefixes
        const commonPrefixes = ['Wear', 'Wield', 'Equip', 'Remove', 'Drop', 'Examine', 'Use', 'Eat', 'Drink', 'Read', 'Open', 'Close', 'Attack', 'Talk', 'Trade', 'Follow', 'Destroy'];
        for (const prefix of commonPrefixes) {
            const pattern = new RegExp(`^(${prefix})([A-Z])`, 'g');
            result = result.replace(pattern, '$1 $2');
        }
        // Rule 6: specific patterns
        result = result.replace(/([Ee]xoskeleton)(torso|helm|legs|boots|gloves)/gi, '$1 $2');
        result = result.replace(/(\+\d+)(options)/gi, '$1 $2');
        result = result.replace(/([aeiousnrt])(torso|helm|legs|boots|gloves|shield|cape)(?![a-z])/gi, '$1 $2');
        // Rule 7: orphaned trailing letters
        result = result.replace(/([a-zA-Z0-9]{2,}) ([sledintyhr])(?=[\s:;,.]|$)/gi, '$1$2');
        // Rule 8: spacing around colons
        result = result.replace(/ +:/g, ':');
        result = result.replace(/(\d) +,/g, '$1,');
        result = result.replace(/,\s+(\d)/g, ',$1');
        // Rule 9: OCR corrections
        const ocrCorrections = [
            [/\bl[1l]?[e3][v3][e3][l1]\b/gi, 'level'],
            [/\bl[1l]?[e3]v[e3][l1]\b/gi, 'level'],
            [/\bl1e3v1\b/gi, 'level'],
            [/\bleve1\b/gi, 'level'],
            [/\b1evel\b/gi, 'level'],
            [/\b1eve1\b/gi, 'level'],
            [/\bN[e3]xt\b/gi, 'Next'],
            [/\bn[e3]xt\b/gi, 'next'],
            [/\b[e3]xp[e3]ri[e3]nc[e3]\b/gi, 'experience'],
            [/\bExp[e3]ri[e3]nc[e3]\b/gi, 'Experience'],
            [/\btota[l1]\b/gi, 'total'],
            [/\bTota[l1]\b/gi, 'Total'],
            [/\bski[l1][l1]\b/gi, 'skill'],
            [/\bSki[l1][l1]\b/gi, 'Skill'],
            [/\bh[e3]a[l1]th\b/gi, 'health'],
            [/\bH[e3]a[l1]th\b/gi, 'Health'],
            [/\bpray[e3]r\b/gi, 'prayer'],
            [/\bPray[e3]r\b/gi, 'Prayer'],
            [/\batt[a4]ck\b/gi, 'attack'],
            [/\bd[e3]f[e3]nc[e3]\b/gi, 'defence'],
            [/\bstr[e3]ngth\b/gi, 'strength'],
            [/\bcurr[e3]nt\b/gi, 'current'],
            [/\bCurr[e3]nt\b/gi, 'Current'],
        ];
        for (const [pattern, replacement] of ocrCorrections) {
            result = result.replace(pattern, replacement);
        }
        // Clean up double spaces
        result = result.replace(/\s+/g, ' ').trim();
        return result;
    }
    /**
     * Auto-calibrate grid from inventory slot sprites
     */
    autoCalibrate(elements) {
        if (this.gridConfig.startX !== 0 || this.gridConfig.startY !== 0)
            return;
        const slotSprites = elements.filter(el => el.sprite.known?.id === this.INVENTORY_SLOT_SPRITE_ID);
        if (slotSprites.length < 8)
            return;
        const avgSlotWidth = slotSprites.reduce((sum, s) => sum + s.width, 0) / slotSprites.length;
        const avgSlotHeight = slotSprites.reduce((sum, s) => sum + s.height, 0) / slotSprites.length;
        const xClusters = this.clusterPositions(slotSprites.map(s => s.x), 8);
        const yClusters = this.clusterPositions(slotSprites.map(s => s.y), 8);
        const significantXClusters = xClusters.filter(c => c.count >= 2);
        const significantYClusters = yClusters.filter(c => c.count >= 2);
        this.debugMode && console.log(`[AutoCalibrate] Raw X clusters (count>=2): ${significantXClusters.map(c => `X=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);
        this.debugMode && console.log(`[AutoCalibrate] Raw Y clusters (count>=2): ${significantYClusters.map(c => `Y=${c.center.toFixed(0)}(n=${c.count})`).join(', ')}`);
        let columns = significantXClusters.sort((a, b) => a.center - b.center);
        const rows = significantYClusters.sort((a, b) => a.center - b.center);
        if (columns.length < 2 || rows.length < 2)
            return;
        // Cross-validate columns
        const rowYTolerance = 15;
        const minRowsRequired = Math.max(2, Math.ceil(rows.length / 2));
        columns = columns.filter(col => {
            const colSprites = slotSprites.filter(s => Math.abs(s.x - col.center) <= 8);
            const rowsHit = new Set();
            for (const sprite of colSprites) {
                for (let ri = 0; ri < rows.length; ri++) {
                    if (Math.abs(sprite.y - rows[ri].center) <= rowYTolerance) {
                        rowsHit.add(ri);
                        break;
                    }
                }
            }
            const valid = rowsHit.size >= minRowsRequired;
            if (!valid) {
                this.debugMode && console.log(`[AutoCalibrate] Rejecting column at X=${col.center.toFixed(0)}: only ${rowsHit.size}/${rows.length} row(s) hit (need >=${minRowsRequired}), sprites=${colSprites.length}`);
            }
            return valid;
        });
        if (columns.length < 2)
            return;
        const xSteps = [];
        for (let i = 1; i < columns.length; i++) {
            xSteps.push(columns[i].center - columns[i - 1].center);
        }
        const ySteps = [];
        for (let i = 1; i < rows.length; i++) {
            ySteps.push(rows[i].center - rows[i - 1].center);
        }
        const actualCellWidth = this.medianValue(xSteps);
        const actualCellHeight = this.medianValue(ySteps);
        const rowCenters = rows.map(r => r.center);
        const startX = columns[0].center;
        const gridTopY = rowCenters[rowCenters.length - 1];
        const gridBottomY = rowCenters[0];
        this.gridConfig.columns = columns.length;
        this.gridConfig.rows = rowCenters.length;
        this.gridConfig.startX = startX;
        this.gridConfig.startY = gridBottomY;
        this.gridConfig.actualGridTopY = gridTopY;
        this.gridConfig.actualCellWidth = actualCellWidth;
        this.gridConfig.actualCellHeight = actualCellHeight;
        this.gridConfig.slotWidth = avgSlotWidth;
        this.gridConfig.slotHeight = avgSlotHeight;
        this.columnPositions = columns.map(c => c.center);
        this.rowPositions = [...rowCenters].reverse();
        // Note: Don't trim columns/rows here. The RS3 inventory is genuinely 5x6=30 grid positions,
        // but only slots 0-27 are valid. The MAX_INVENTORY_SLOTS check in getNearestSlotGenerous
        // and other slot lookups handles rejecting slots 28-29.
        const totalSlots = this.gridConfig.columns * this.gridConfig.rows;
        this.debugMode && console.log(`[AutoCalibrate] Found ${slotSprites.length} slot sprites -> ${columns.length} cols, ${rowCenters.length} rows (${totalSlots} slots)`);
        this.debugMode && console.log(`[AutoCalibrate] Columns: ${columns.map(c => c.center.toFixed(0)).join(', ')}`);
        this.debugMode && console.log(`[AutoCalibrate] Rows (top->bottom): ${this.rowPositions.map(y => y.toFixed(0)).join(', ')}`);
        this.debugMode && console.log(`[AutoCalibrate] Cell step: ${actualCellWidth.toFixed(1)}x${actualCellHeight.toFixed(1)}`);
        this.debugMode && console.log(`[AutoCalibrate] Slot size: ${avgSlotWidth.toFixed(1)}x${avgSlotHeight.toFixed(1)}`);
    }
    clusterPositions(values, tolerance) {
        const sorted = [...values].sort((a, b) => a - b);
        const clusters = [];
        for (const val of sorted) {
            let merged = false;
            for (const cluster of clusters) {
                if (Math.abs(val - cluster.center) <= tolerance) {
                    cluster.sum += val;
                    cluster.count++;
                    cluster.center = cluster.sum / cluster.count;
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                clusters.push({ sum: val, count: 1, center: val });
            }
        }
        return clusters.map(c => ({ center: c.center, count: c.count }));
    }
    medianValue(values) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    getSlotBoundsInternal(slot, cellWidth, cellHeight, gridTopY) {
        const col = slot % this.gridConfig.columns;
        const row = Math.floor(slot / this.gridConfig.columns);
        return {
            x: this.gridConfig.startX + col * cellWidth,
            y: gridTopY - row * cellHeight,
        };
    }
    /**
     * Find inventory slots and their current contents
     */
    findInventorySlots(elements) {
        const slots = [];
        const slotCount = this.gridConfig.columns * this.gridConfig.rows;
        let loggedSlots = 0;
        for (let slot = 0; slot < slotCount; slot++) {
            const slotBounds = this.getSlotBounds(slot);
            if (!slotBounds)
                continue;
            const padding = 1;
            const slotElements = elements.filter(el => {
                const elCenterX = el.x + el.width / 2;
                const elCenterY = el.y + el.height / 2;
                return (elCenterX >= slotBounds.x - padding &&
                    elCenterX <= slotBounds.x + slotBounds.width + padding &&
                    elCenterY >= slotBounds.y - padding &&
                    elCenterY <= slotBounds.y + slotBounds.height + padding);
            });
            const itemSprite = this.findItemSprite(slotElements);
            // Compute pHash from item sprite's raw texture data
            let itemPHash;
            if (itemSprite) {
                try {
                    const rawSprite = itemSprite.sprite;
                    const basetex = rawSprite.basetex;
                    if (basetex && typeof basetex.capture === 'function') {
                        const canCapture = typeof basetex.canCapture === 'function' ? basetex.canCapture() : true;
                        if (canCapture) {
                            const texX = rawSprite.texX ?? rawSprite.x ?? 0;
                            const texY = rawSprite.texY ?? rawSprite.y ?? 0;
                            const texW = rawSprite.texWidth ?? rawSprite.width ?? 0;
                            const texH = rawSprite.texHeight ?? rawSprite.height ?? 0;
                            const texDataW = basetex.width ?? 0;
                            const texDataH = basetex.height ?? 0;
                            if (texW > 0 && texH > 0 && texX >= 0 && texY >= 0 &&
                                texX + texW <= texDataW && texY + texH <= texDataH) {
                                const imgData = basetex.capture(texX, texY, texW, texH);
                                const expectedLen = imgData ? imgData.width * imgData.height * 4 : 0;
                                if (imgData && imgData.data && imgData.data.length >= expectedLen && imgData.width > 0 && imgData.height > 0) {
                                    const pHashValue = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.itemHash)(imgData.data, imgData.width, imgData.height);
                                    const pHashHex = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.itemHashToHex)(pHashValue);
                                    // Reject degenerate hashes (all-zero = empty/freed texture, all-ones = fully transparent)
                                    if (pHashHex !== '00000000000000000000000000000000' && pHashHex !== 'ffffffffffffffffffffffffffffffff') {
                                        itemPHash = pHashHex;
                                    }
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    // pHash computation not available for this sprite
                }
            }
            if ((slot < 4 || slot === 24) && loggedSlots < 6) {
                const row = Math.floor(slot / this.gridConfig.columns);
                const col = slot % this.gridConfig.columns;
                this.debugMode && console.log(`[InventorySlots] Slot ${slot + 1} (row${row},col${col}): X=${slotBounds.x.toFixed(0)}, Y=${slotBounds.y.toFixed(0)}, elements=${slotElements.length}, hasItem=${itemSprite !== null}${itemPHash ? `, pHash=${itemPHash}` : ''}`);
                loggedSlots++;
            }
            // Release texture reference after pHash extraction to prevent memory leak
            if (itemSprite) {
                const rawSprite = itemSprite.sprite;
                if (rawSprite)
                    rawSprite.basetex = undefined;
            }
            slots.push({
                slot,
                ...slotBounds,
                iconHash: itemSprite?.sprite.hash ?? 0,
                pHash: itemPHash,
                iconElement: null, // Stripped after pHash extraction to prevent memory leak
            });
        }
        return slots;
    }
    updateSlotPHashMap(inventorySlots) {
        for (const slot of inventorySlots) {
            if (slot.pHash && slot.iconHash !== 0) {
                const prev = this.slotPHashStability.get(slot.slot);
                if (prev && prev.pHash === slot.pHash) {
                    prev.count++;
                }
                else {
                    this.slotPHashStability.set(slot.slot, { pHash: slot.pHash, count: 1 });
                }
                this.slotPHashMap.set(slot.slot, slot.pHash);
            }
            else {
                this.slotPHashMap.delete(slot.slot);
                this.slotPHashStability.delete(slot.slot);
            }
        }
    }
    getStableSlotPHash(slotIndex) {
        const stability = this.slotPHashStability.get(slotIndex);
        if (!stability)
            return null;
        if (stability.count >= TooltipItemLearner.PHASH_STABLE_FRAMES) {
            return stability.pHash;
        }
        return null;
    }
    validateSlotByPHash(guessedSlot, inventorySlots) {
        const stablePHash = this.getStableSlotPHash(guessedSlot);
        if (!stablePHash) {
            return { valid: false, pHash: null, reason: 'slot pHash not stable yet' };
        }
        const currentSlot = inventorySlots.find(s => s.slot === guessedSlot);
        if (!currentSlot || !currentSlot.pHash) {
            return { valid: false, pHash: null, reason: 'slot has no current pHash' };
        }
        if (currentSlot.pHash !== stablePHash) {
            return { valid: false, pHash: currentSlot.pHash, reason: `pHash changed this frame (was ${stablePHash}, now ${currentSlot.pHash})` };
        }
        return { valid: true, pHash: stablePHash, reason: 'pHash stable and consistent' };
    }
    /**
     * Detect hovered slot by highlight element count
     */
    detectHoveredSlotByHighlight(inventorySlots, allElements) {
        const slotsWithItems = inventorySlots.filter(s => s.iconHash !== 0);
        if (slotsWithItems.length < 2)
            return null;
        const padding = 1;
        const slotElementCounts = [];
        for (const slotInfo of slotsWithItems) {
            let count = 0;
            for (const el of allElements) {
                if (el.sprite.known?.fontchr)
                    continue;
                if (el.sprite.known?.id === this.INVENTORY_SLOT_SPRITE_ID)
                    continue;
                const elCenterX = el.x + el.width / 2;
                const elCenterY = el.y + el.height / 2;
                if (elCenterX >= slotInfo.x - padding &&
                    elCenterX <= slotInfo.x + slotInfo.width + padding &&
                    elCenterY >= slotInfo.y - padding &&
                    elCenterY <= slotInfo.y + slotInfo.height + padding) {
                    count++;
                }
            }
            slotElementCounts.push({ slot: slotInfo.slot, count });
        }
        slotElementCounts.sort((a, b) => b.count - a.count);
        const top = slotElementCounts[0];
        const secondTop = slotElementCounts[1];
        if (!top || !secondTop)
            return null;
        const gap = top.count - secondTop.count;
        const ratio = secondTop.count > 0 ? top.count / secondTop.count : top.count;
        if (gap >= 3 && ratio >= 1.5) {
            const { columns } = this.gridConfig;
            const row = Math.floor(top.slot / columns);
            const col = top.slot % columns;
            this.debugMode && console.log(`[HoverDetect] Slot ${top.slot + 1} (row${row},col${col}) has ${top.count} elements, next highest=${secondTop.count} (gap=${gap}, ratio=${ratio.toFixed(1)}x) -- likely hovered`);
            return top.slot;
        }
        const topFew = slotElementCounts.slice(0, 5).map(s => `slot${s.slot + 1}=${s.count}`).join(', ');
        this.debugMode && console.log(`[HoverDetect] No clear hover outlier: top=[${topFew}] (gap=${gap}, ratio=${ratio.toFixed(1)}x)`);
        return null;
    }
    findItemSprite(slotElements) {
        const itemCandidates = slotElements.filter(el => {
            if (el.sprite.known?.id === this.INVENTORY_SLOT_SPRITE_ID)
                return false;
            if (el.sprite.known?.fontchr)
                return false;
            return true;
        });
        if (itemCandidates.length === 0)
            return null;
        return itemCandidates.reduce((largest, current) => {
            const largestArea = largest.width * largest.height;
            const currentArea = current.width * current.height;
            return currentArea > largestArea ? current : largest;
        });
    }
    /**
     * Get bounds for a specific inventory slot
     */
    getSlotBounds(slot) {
        const { slotWidth, slotHeight, columns } = this.gridConfig;
        const col = slot % columns;
        const row = Math.floor(slot / columns);
        if (row >= this.gridConfig.rows || col >= columns) {
            return null;
        }
        if (this.columnPositions.length > col && this.rowPositions.length > row) {
            return {
                x: this.columnPositions[col],
                y: this.rowPositions[row],
                width: slotWidth,
                height: slotHeight,
            };
        }
        const { startX, actualGridTopY, actualCellWidth, actualCellHeight } = this.gridConfig;
        const cellWidth = actualCellWidth > 0 ? actualCellWidth : (slotWidth + 2);
        const cellHeight = actualCellHeight > 0 ? actualCellHeight : (slotHeight + 2);
        const gridTopY = actualGridTopY > 0 ? actualGridTopY : (this.gridConfig.startY + 6 * cellHeight);
        return {
            x: startX + col * cellWidth,
            y: gridTopY - row * cellHeight,
            width: slotWidth,
            height: slotHeight,
        };
    }
    /**
     * Find nearest slot from tooltip position
     */
    findNearestSlot(tooltipBounds, slots, mousePos) {
        const tooltipCenterX = tooltipBounds.x + tooltipBounds.width / 2;
        const tooltipTopY = tooltipBounds.y + tooltipBounds.height;
        const gridLeftX = this.columnPositions[0] ?? this.gridConfig.startX;
        const gridRightX = (this.columnPositions[this.columnPositions.length - 1] ?? gridLeftX) + this.gridConfig.slotWidth;
        const gridWidth = gridRightX - gridLeftX;
        const gridMarginX = Math.max(gridWidth / 2, 100);
        if (tooltipCenterX < gridLeftX - gridMarginX || tooltipCenterX > gridRightX + gridMarginX) {
            this.debugMode && console.log(`[SlotFind] Tooltip center X=${tooltipCenterX.toFixed(0)} outside inventory grid`);
            return null;
        }
        const gridTopY = this.rowPositions[0] ?? this.gridConfig.actualGridTopY;
        const gridBottomY = this.rowPositions[this.rowPositions.length - 1] ?? this.gridConfig.startY;
        const gridHeight = Math.abs(gridTopY - gridBottomY) + this.gridConfig.slotHeight;
        const maxYDistance = Math.max(gridHeight * 2, 500);
        const tooltipMidY = tooltipBounds.y + tooltipBounds.height / 2;
        const yDistFromGrid = (tooltipMidY > gridTopY + this.gridConfig.slotHeight)
            ? (tooltipMidY - gridTopY - this.gridConfig.slotHeight)
            : (tooltipMidY < gridBottomY)
                ? (gridBottomY - tooltipMidY)
                : 0;
        if (yDistFromGrid > maxYDistance) {
            this.debugMode && console.log(`[SlotFind] Tooltip Y=${tooltipMidY.toFixed(0)} too far from grid (dist=${yDistFromGrid.toFixed(0)}px)`);
            return null;
        }
        const { columns } = this.gridConfig;
        const cellWidth = this.gridConfig.actualCellWidth || (this.gridConfig.slotWidth + 2);
        let bestCol = -1;
        let bestColDist = Infinity;
        for (let c = 0; c < this.columnPositions.length; c++) {
            const colCenterX = this.columnPositions[c] + this.gridConfig.slotWidth / 2;
            const dist = Math.abs(tooltipCenterX - colCenterX);
            if (dist < bestColDist) {
                bestColDist = dist;
                bestCol = c;
            }
        }
        if (bestCol < 0 && this.gridConfig.startX > 0) {
            bestCol = Math.round((tooltipCenterX - this.gridConfig.startX - this.gridConfig.slotWidth / 2) / cellWidth);
            bestCol = Math.max(0, Math.min(columns - 1, bestCol));
            bestColDist = Math.abs(tooltipCenterX - (this.gridConfig.startX + bestCol * cellWidth + this.gridConfig.slotWidth / 2));
        }
        if (bestCol < 0)
            return null;
        if (bestColDist > cellWidth * 1.5)
            return null;
        const columnSlots = slots.filter(s => (s.slot % columns) === bestCol);
        const slotsWithItems = columnSlots.filter(s => s.iconHash !== 0);
        if (slotsWithItems.length === 1) {
            return slotsWithItems[0].slot;
        }
        const candidatePool = slotsWithItems.length > 0 ? slotsWithItems : columnSlots;
        let bestSlot = null;
        if (mousePos && this.calibratedMousePositions.size > 0) {
            let bestDist = Infinity;
            for (const slot of candidatePool) {
                const calPos = this.getCalibratedPosition(slot.slot);
                if (!calPos)
                    continue;
                const dx = mousePos.x - calPos.x;
                const dy = mousePos.y - calPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestSlot = slot;
                }
            }
        }
        if (mousePos && !bestSlot) {
            let bestYDist = Infinity;
            for (const slot of candidatePool) {
                const slotCenterY = slot.y + slot.height / 2;
                const yDist = Math.abs(slotCenterY - mousePos.y);
                if (yDist < bestYDist) {
                    bestYDist = yDist;
                    bestSlot = slot;
                }
            }
        }
        else if (!mousePos) {
            candidatePool.sort((a, b) => a.slot - b.slot);
            bestSlot = candidatePool[0] ?? null;
        }
        if (!bestSlot)
            return null;
        return bestSlot.slot;
    }
    /**
     * Learn an item association (sync version with voting)
     */
    learnItemSync(slotInfo, name) {
        const existing = this.learnedItems.get(slotInfo.iconHash);
        if (existing && existing.name === name) {
            return;
        }
        for (const [hash, item] of this.learnedItems) {
            if (item.name === name && hash !== slotInfo.iconHash) {
                this.debugMode && console.log(`[TooltipLearner] "${name}" already known (hash: ${hash}), skipping re-learn for hash ${slotInfo.iconHash}`);
                return;
            }
        }
        // Cap vote map size to prevent unbounded growth
        if (this.slotVotes.size > 100) {
            this.debugMode && console.log(`[TooltipLearner] Clearing stale vote data (${this.slotVotes.size} entries)`);
            this.slotVotes.clear();
        }
        let nameVotes = this.slotVotes.get(name);
        if (!nameVotes) {
            nameVotes = new Map();
            this.slotVotes.set(name, nameVotes);
        }
        const currentVotes = (nameVotes.get(slotInfo.iconHash) ?? 0) + 1;
        nameVotes.set(slotInfo.iconHash, currentVotes);
        this.debugMode && console.log(`[TooltipLearner] Vote for "${name}" -> hash ${slotInfo.iconHash}: ${currentVotes}/${TooltipItemLearner.VOTES_REQUIRED}`);
        if (currentVotes < TooltipItemLearner.VOTES_REQUIRED) {
            return;
        }
        this.slotVotes.delete(name);
        const learnedItem = {
            name,
            iconHash: slotInfo.iconHash,
            pHash: slotInfo.pHash,
            learnedAt: Date.now(),
            confidence: slotInfo.pHash ? 0.90 : 0.85,
            source: 'tooltip',
        };
        this.learnedItems.set(slotInfo.iconHash, learnedItem);
        if (slotInfo.pHash) {
            this.pHashIndex.set(slotInfo.pHash, learnedItem);
        }
        for (const listener of this.listeners) {
            try {
                listener(learnedItem);
            }
            catch (e) {
                console.error('[TooltipLearner] Listener error:', e);
            }
        }
        (0,_types_itemApi__WEBPACK_IMPORTED_MODULE_2__.queueItem)({ name: learnedItem.name, pHash: learnedItem.pHash });
        this.debugMode && console.log(`[TooltipLearner] Confirmed: "${name}" (hash: ${slotInfo.iconHash}${slotInfo.pHash ? `, pHash: ${slotInfo.pHash}` : ''})`);
    }
    async learnItem(slotInfo, name) {
        this.learnItemSync(slotInfo, name);
    }
    /**
     * Look up item name by hash
     */
    getItemName(iconHash) {
        return this.learnedItems.get(iconHash)?.name ?? null;
    }
    /**
     * Look up item name by pHash (cross-session)
     */
    getItemNameByPHash(pHash, maxDistance = 10) {
        const exact = this.pHashIndex.get(pHash);
        if (exact)
            return exact.name;
        for (const [storedHash, item] of this.pHashIndex) {
            const distance = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.hammingDistance)(BigInt('0x' + pHash), BigInt('0x' + storedHash));
            if (distance <= maxDistance) {
                return item.name;
            }
        }
        return null;
    }
    /**
     * Get all learned items
     */
    getLearnedItems() {
        return Array.from(this.learnedItems.values());
    }
    /**
     * Export learned items for persistence
     */
    exportLearnedItems() {
        return Array.from(this.learnedItems.values()).map(item => ({
            iconHash: item.iconHash,
            name: item.name,
            pHash: item.pHash,
        }));
    }
    /**
     * Import previously learned items
     */
    importLearnedItems(items) {
        for (const item of items) {
            const learnedItem = {
                name: item.name,
                iconHash: item.iconHash,
                pHash: item.pHash,
                learnedAt: Date.now(),
                confidence: 0.8,
                source: 'database',
            };
            this.learnedItems.set(item.iconHash, learnedItem);
            if (item.pHash) {
                this.pHashIndex.set(item.pHash, learnedItem);
            }
        }
        console.log(`[TooltipItemLearner] Imported ${items.length} items`);
    }
    /**
     * Register a callback for newly learned items
     */
    onItemLearned(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    /**
     * Get the inventory slots from the last detection run.
     * Useful for determining which slots have items before calibration.
     */
    getLastInventorySlots() {
        return this.lastInventorySlots;
    }
    /**
     * Start automatic tooltip learning
     */
    startPolling(intervalMs = 500) {
        if (this.renderStream)
            this.stopPolling();
        const features = ['texturesnapshot', 'uniforms', 'vertexarray'];
        this.renderStream = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.streamRenderCalls({ framecooldown: 600, features }, (renders) => {
            try {
                // During calibration, only capture mouse position — skip expensive GL pipeline
                if (this.calibrationActive) {
                    const mousePos = this.glBridge.getMousePositionGL();
                    if (mousePos) {
                        this.recordCalibrationSample(mousePos);
                    }
                    return;
                }
                // Process streamed render data through the same pipeline as detectAndLearn
                const mousePos = this.glBridge.getMousePositionGL();
                const uiState = this.glBridge.getUIState(renders);
                this.detectFromElements(uiState.elements, renders, mousePos);
                // Release texture references to prevent memory leak
                for (const el of uiState.elements) {
                    if (el.sprite) {
                        el.sprite.basetex = undefined;
                    }
                }
            }
            catch (err) {
                console.error('[TooltipItemLearner] Detection error:', err);
            }
        });
        console.log(`[TooltipItemLearner] Started streaming render calls (framecooldown: 600ms)`);
    }
    /**
     * Stop automatic tooltip learning
     */
    stopPolling() {
        if (this.renderStream) {
            this.renderStream.close();
            this.renderStream = null;
            console.log('[TooltipItemLearner] Stopped render stream');
        }
    }
}
/**
 * Create a configured TooltipItemLearner instance
 */
function createTooltipLearner(glBridge) {
    return new TooltipItemLearner(glBridge);
}


/***/ },

/***/ "./gl/avautils.ts"
/*!************************!*\
  !*** ./gl/avautils.ts ***!
  \************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   vartypes: () => (/* binding */ vartypes)
/* harmony export */ });
/**
 * Vertex attribute type utilities
 * Based on RS3QuestBuddyGL implementation
 */
const vartypes = {
    0x1400: { id: 0x1400, readfn: "getInt8", writefn: "setInt8", typeid: "i8", size: 1, constr: Int8Array, webgl: true },
    0x1401: { id: 0x1401, readfn: "getUint8", writefn: "setUint8", typeid: "u8", size: 1, constr: Uint8Array, webgl: true },
    0x1402: { id: 0x1402, readfn: "getInt16", writefn: "setInt16", typeid: "i16", size: 2, constr: Int16Array, webgl: true },
    0x1403: { id: 0x1403, readfn: "getUint16", writefn: "setUint16", typeid: "u16", size: 2, constr: Uint16Array, webgl: true },
    0x1404: { id: 0x1404, readfn: "getInt32", writefn: "setInt32", typeid: "i32", size: 4, constr: Int32Array, webgl: false },
    0x1405: { id: 0x1405, readfn: "getUint32", writefn: "setUint32", typeid: "u32", size: 4, constr: Uint32Array, webgl: false },
    0x1406: { id: 0x1406, readfn: "getFloat32", writefn: "setFloat32", typeid: "f32", size: 4, constr: Float32Array, webgl: true },
    0x140a: { id: 0x140a, readfn: "getFloat64", writefn: "setFloat64", typeid: "f64", size: 8, constr: Float64Array, webgl: false },
    0x140b: { id: 0x140b, readfn: "getFloat16", writefn: "setFloat16", typeid: "f16", size: 2, constr: null, webgl: false },
};


/***/ },

/***/ "./gl/crc32.ts"
/*!*********************!*\
  !*** ./gl/crc32.ts ***!
  \*********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CrcBuilder: () => (/* binding */ CrcBuilder),
/* harmony export */   crc32: () => (/* binding */ crc32)
/* harmony export */ });
// CRC-32 implementation - ported from RS3QuestBuddyBeta
// Based on https://blog.stalkr.net/2011/03/crc-32-forging.html
// Poly in "reversed" notation -- http://en.wikipedia.org/wiki/Cyclic_redundancy_check
const POLY = 0xedb88320; // CRC-32-IEEE 802.3
const crc32_table = new Uint32Array(256);
function build_crc_tables() {
    for (let i = 0; i < 256; i++) {
        let fwd = i;
        for (let j = 8; j > 0; j--) {
            if ((fwd & 1) == 1) {
                fwd = (fwd >>> 1) ^ POLY;
            }
            else {
                fwd >>>= 1;
            }
        }
        crc32_table[i] = fwd & 0xffffffff;
    }
}
build_crc_tables();
function crc32(buf, crc = 0, rangeStart = 0, rangeEnd = buf.length) {
    crc = crc ^ 0xffffffff;
    for (let i = rangeStart; i < rangeEnd; i++) {
        crc = (crc >>> 8) ^ crc32_table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
}
class CrcBuilder {
    crc;
    constructor(initcrc = 0) {
        this.crc = initcrc ^ 0xffffffff;
    }
    addbyte(byte) {
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ (byte & 0xff)) & 0xff];
    }
    addUint16(u16) {
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ (u16 & 0xff)) & 0xff];
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 16) & 0xff)) & 0xff];
    }
    addUint32(u16) {
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 0) & 0xff)) & 0xff];
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 16) & 0xff)) & 0xff];
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 24) & 0xff)) & 0xff];
        this.crc = (this.crc >>> 8) ^ crc32_table[(this.crc ^ ((u16 >> 32) & 0xff)) & 0xff];
    }
    get() {
        return (this.crc ^ 0xffffffff) >>> 0;
    }
    fork() {
        return new CrcBuilder(this.get());
    }
}


/***/ },

/***/ "./gl/patchrs_napi.ts"
/*!****************************!*\
  !*** ./gl/patchrs_napi.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
var __webpack_dirname__ = "/";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getProgramFlag: () => (/* binding */ getProgramFlag),
/* harmony export */   getVertexFlag: () => (/* binding */ getVertexFlag),
/* harmony export */   hookFirstClient: () => (/* binding */ hookFirstClient),
/* harmony export */   injectClient: () => (/* binding */ injectClient),
/* harmony export */   native: () => (/* binding */ native),
/* harmony export */   returnProgramFlags: () => (/* binding */ returnProgramFlags),
/* harmony export */   returnVertexFlags: () => (/* binding */ returnVertexFlags)
/* harmony export */ });
const isElectronBuild =  true && false;
const hasRealNodeModules = isElectronBuild || (typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    process.versions.node !== undefined);
// Path module - only available in Node.js/Electron
let path = null;
if (hasRealNodeModules) {
    try {
        // Use non-webpack require if available to avoid bundling issues
        const nodeRequire = typeof require !== 'undefined' ? require : __webpack_require__("./gl sync recursive");
        path = nodeRequire("path");
    }
    catch {
        // Not available
    }
}
// Determine app root - try multiple methods for different environments
function getAppRoot() {
    if (!path)
        return "";
    const nodeRequire = typeof require !== 'undefined' ? require : __webpack_require__("./gl sync recursive");
    // In Electron, use process.cwd() or app.getAppPath()
    if (typeof process !== 'undefined') {
        // Try to get Electron app path
        try {
            const { app } = nodeRequire('electron');
            if (app)
                return app.getAppPath();
        }
        catch { }
        // Try remote (renderer process)
        try {
            const remote = nodeRequire('@electron/remote');
            if (remote?.app)
                return remote.app.getAppPath();
        }
        catch { }
        // Fall back to process.cwd()
        if (process.cwd) {
            return process.cwd();
        }
    }
    // Last resort: use __dirname relative path
    return path.resolve(__webpack_dirname__, "../..");
}
let nativeReleaseDir = "";
let nativeDebugDir = "";
if (path && hasRealNodeModules) {
    const appRoot = getAppRoot();
    console.log("[patchrs_napi] App root:", appRoot);
    nativeReleaseDir = path.join(appRoot, "build/Release");
    nativeDebugDir = path.join(appRoot, "build/Debug");
    console.log("[patchrs_napi] Looking for native addon in:", nativeReleaseDir, "or", nativeDebugDir);
}
else {
    console.log("[patchrs_napi] Running in browser mode - native addon not available");
}
function resolvePath(...parts) {
    if (!path)
        return parts.join("/");
    return path.join(...parts);
}
var native = null;
function sequentialFilename(dir, dirfiles, template) {
    if (!path)
        return ["", ""];
    let regex = new RegExp(`${template.replace("#", "(\\d+)")}$`);
    let maxnum = 0;
    for (let file of dirfiles) {
        let m = file.match(regex);
        if (m) {
            maxnum = Math.max(maxnum, +m[1]);
        }
    }
    return [path.join(dir, template.replace("#", "" + (maxnum + 1))), (maxnum == 0 ? "" : path.join(dir, template.replace("#", "" + maxnum)))];
}
//TODO does not fix shared memory state
function reloadDll() {
    if (!hasRealNodeModules || !path) {
        throw new Error("Cannot load native addon in browser mode");
    }
    const nativeRequire = typeof require !== 'undefined' ? require : __webpack_require__("./gl sync recursive");
    const fs = nativeRequire("fs");
    let debugstat = null;
    let releasestat = null;
    try {
        debugstat = fs.statSync(resolvePath(nativeDebugDir, "addon.node"));
    }
    catch (e) { }
    try {
        releasestat = fs.statSync(resolvePath(nativeReleaseDir, "addon.node"));
    }
    catch (e) { }
    let pluginDir = "";
    if (debugstat && (!releasestat || debugstat.mtimeMs > releasestat.mtimeMs)) {
        console.log("using debug plugin");
        pluginDir = nativeDebugDir;
    }
    else if (releasestat) {
        console.log("using release plugin");
        pluginDir = nativeReleaseDir;
    }
    else {
        throw new Error("No native plugin found at " + nativeReleaseDir + " or " + nativeDebugDir);
    }
    let origfile = resolvePath(pluginDir, "addon.node");
    let [newfile, lastfile] = sequentialFilename(pluginDir, fs.readdirSync(pluginDir), "addon-#.node");
    fs.copyFileSync(origfile, newfile);
    // Use __non_webpack_require__ if available (webpack), otherwise use regular require
    native = nativeRequire(newfile);
    console.log("Loaded native addon from", newfile);
}
// Try to load native addon
// With contextIsolation, _alt1gl (contextBridge proxy) is available immediately during
// module init, but alt1gl (mutable wrapper with async method patching) is created later
// by the renderer-world shim. Use a Proxy that always reads from the latest available API.
try {
    if (typeof globalThis !== "undefined" && (globalThis.alt1gl || globalThis._alt1gl)) {
        console.log("[patchrs_napi] Using global alt1gl API (bridge:", !!globalThis._alt1gl, "shim:", !!globalThis.alt1gl, ")");
        native = new Proxy({}, {
            get(_target, prop) {
                const api = globalThis.alt1gl || globalThis._alt1gl;
                if (!api)
                    throw new Error('alt1gl API not available');
                return api[prop];
            }
        });
    }
    else if (hasRealNodeModules && path) {
        // Node.js/Electron environment - try to load native addon
        console.log("[patchrs_napi] Attempting to load native addon...");
        reloadDll();
    }
    else {
        // Pure browser mode - native addon not available
        console.log("[patchrs_napi] Browser mode - native addon not available");
    }
    // Verify the addon loaded correctly
    if (native) {
        console.log("[patchrs_napi] Native addon loaded successfully");
        const rsReady = native.getRsReady?.() ?? -1;
        console.log("[patchrs_napi] RS client ready status:", rsReady);
    }
}
catch (e) {
    console.error("[patchrs_napi] Failed to load native addon:", e);
    console.error("[patchrs_napi] Ensure the native addon is built in build/Release or build/Debug");
}
// Only set up logging callback if native addon is available
if (native && native.debug && typeof native.debug.setLogCb === 'function') {
    native.debug.setLogCb(e => {
        let m = e.match(/bufferdata (\d+)\->(\d+)/);
        if (m) {
            let dif = +m[1] - +m[2];
            if (dif > 1e6) {
                //console.log("large alloc: " + dif);
            }
        }
        else {
            //console.info(e)
        }
    });
}
function hookFirstClient() {
    var pids = native.debug.getExePids("rs2client.exe");
    if (pids.length == 0) {
        console.log("no rs pid found");
        return;
    }
    // slightly sketchy, on intel iGPU the client forks the process and the first pid just happens to be correct
    let hook = injectClient(pids[0]);
    if (!hook.details) {
        console.log("injectdll returned false");
    }
}
function injectClient(pid) {
    const isLinux = typeof process !== 'undefined' && process.platform === 'linux';
    let debugstat = null;
    let releasestat = null;
    // On Linux, also check globalThis.alt1glNativeDir which is set by preload
    let globalNativeDir = typeof globalThis !== 'undefined' ? globalThis.alt1glNativeDir : null;
    try {
        debugstat = native.debug.statSync(resolvePath(nativeDebugDir, "addon.node"));
    }
    catch (e) { }
    try {
        releasestat = native.debug.statSync(resolvePath(nativeReleaseDir, "addon.node"));
    }
    catch (e) { }
    // Also check the global native dir if local paths don't work
    let globalstat = null;
    if (globalNativeDir) {
        try {
            globalstat = native.debug.statSync(resolvePath(globalNativeDir, "addon.node"));
        }
        catch (e) { }
    }
    let nativeDir = "";
    if (debugstat && (!releasestat || debugstat.modifiedTime > releasestat.modifiedTime)) {
        console.log("using debug gl native");
        nativeDir = nativeDebugDir;
    }
    else if (releasestat) {
        console.log("using release gl native");
        nativeDir = nativeReleaseDir;
    }
    else if (globalstat && globalNativeDir) {
        console.log("using global native dir:", globalNativeDir);
        nativeDir = globalNativeDir;
    }
    else {
        throw new Error("No native plugin found");
    }
    if (isLinux) {
        // On Linux, we don't need to copy the library - just connect to the overlay
        // The overlay.so is already loaded via LD_PRELOAD
        console.log("Linux: connecting to overlay for pid", pid);
        let res = native.debug.connectToOverlay(pid);
        let hook = { dllname: resolvePath(nativeDir, "injected.so"), pid, details: res };
        return hook;
    }
    // Windows: copy DLL and inject
    let origfile = resolvePath(nativeDir, "injected.dll");
    let [newfile, lastfile] = sequentialFilename(nativeDir, native.debug.readDirSync(nativeDir), "injected-#.dll");
    let needsnew;
    if (!lastfile) {
        needsnew = true;
    }
    else {
        let origfiledata = native.debug.readFileSync(origfile);
        let currentfiledata = native.debug.readFileSync(lastfile);
        needsnew = false;
        if (origfiledata.length != currentfiledata.length) {
            needsnew = true;
        }
        else {
            for (let i = 0; i < origfiledata.length; i++) {
                if (origfiledata[i] != currentfiledata[i]) {
                    needsnew = true;
                    break;
                }
            }
        }
    }
    let dllname;
    if (needsnew) {
        native.debug.copyFileSync(origfile, newfile);
        dllname = newfile;
    }
    else {
        dllname = lastfile;
    }
    console.log(dllname);
    let res = native.debug.injectDll(pid, dllname);
    let hook = { dllname, pid, details: res };
    return hook;
}
let vertexFlagCounter = new Array(32).fill(false);
function getVertexFlag() {
    let index = vertexFlagCounter.indexOf(false);
    if (index == -1) {
        throw new Error();
    }
    vertexFlagCounter[index] = true;
    return 1 << index;
}
function returnVertexFlags(flag) {
    for (let i = 0; i < 32; i++) {
        if (flag & (1 << i)) {
            vertexFlagCounter[i] = false;
        }
    }
}
let vertexProgCounter = new Array(32).fill(false);
function getProgramFlag() {
    let index = vertexProgCounter.indexOf(false);
    if (index == -1) {
        throw new Error();
    }
    vertexProgCounter[index] = true;
    return 1 << index;
}
function returnProgramFlags(flag) {
    for (let i = 0; i < 32; i++) {
        if (flag & (1 << i)) {
            vertexProgCounter[i] = false;
        }
    }
}


/***/ },

/***/ "./gl/phash.ts"
/*!*********************!*\
  !*** ./gl/phash.ts ***!
  \*********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   aHash: () => (/* binding */ aHash),
/* harmony export */   dHash: () => (/* binding */ dHash),
/* harmony export */   dualHash: () => (/* binding */ dualHash),
/* harmony export */   findBestMatch: () => (/* binding */ findBestMatch),
/* harmony export */   fontHash: () => (/* binding */ fontHash),
/* harmony export */   hammingDistance: () => (/* binding */ hammingDistance),
/* harmony export */   hashToHex: () => (/* binding */ hashToHex),
/* harmony export */   hexToHash: () => (/* binding */ hexToHash),
/* harmony export */   isSimilar: () => (/* binding */ isSimilar),
/* harmony export */   itemHash: () => (/* binding */ itemHash),
/* harmony export */   itemHashToHex: () => (/* binding */ itemHashToHex),
/* harmony export */   pHashFromImageData: () => (/* binding */ pHashFromImageData)
/* harmony export */ });
/**
 * Perceptual Hash (pHash/dHash) Implementation
 *
 * Unlike CRC32 which changes completely with a single pixel difference,
 * perceptual hashes produce similar values for visually similar images.
 *
 * This allows matching item icons across client reloads where the
 * icons are re-rendered with minor pixel differences.
 */
/**
 * Compute a difference hash (dHash) for an image
 *
 * Algorithm:
 * 1. Resize to 9x8 grayscale (gives 72 pixels)
 * 2. Compare each pixel to its right neighbor
 * 3. If left > right, bit = 1, else bit = 0
 * 4. Produces 64-bit hash (8 rows x 8 comparisons)
 *
 * @param imageData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns 64-bit hash as bigint
 */
function dHash(imageData, width, height) {
    // Target size for hash computation
    const HASH_WIDTH = 9;
    const HASH_HEIGHT = 8;
    // Step 1: Resize to 9x8 grayscale
    const grayscale = resizeToGrayscale(imageData, width, height, HASH_WIDTH, HASH_HEIGHT);
    // Step 2: Compute difference hash
    let hash = 0n;
    let bit = 0n;
    for (let y = 0; y < HASH_HEIGHT; y++) {
        for (let x = 0; x < HASH_WIDTH - 1; x++) {
            const left = grayscale[y * HASH_WIDTH + x];
            const right = grayscale[y * HASH_WIDTH + x + 1];
            if (left > right) {
                hash |= (1n << bit);
            }
            bit++;
        }
    }
    return hash;
}
/**
 * Compute an average hash (aHash) for an image
 *
 * Algorithm:
 * 1. Resize to 8x8 grayscale
 * 2. Compute average pixel value
 * 3. Each pixel above average = 1, below = 0
 * 4. Produces 64-bit hash
 *
 * @param imageData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns 64-bit hash as bigint
 */
function aHash(imageData, width, height) {
    const HASH_SIZE = 8;
    // Step 1: Resize to 8x8 grayscale
    const grayscale = resizeToGrayscale(imageData, width, height, HASH_SIZE, HASH_SIZE);
    // Step 2: Compute average
    let sum = 0;
    for (let i = 0; i < grayscale.length; i++) {
        sum += grayscale[i];
    }
    const avg = sum / grayscale.length;
    // Step 3: Compute hash
    let hash = 0n;
    for (let i = 0; i < grayscale.length; i++) {
        if (grayscale[i] > avg) {
            hash |= (1n << BigInt(i));
        }
    }
    return hash;
}
/**
 * Resize image extracting a single color channel with bilinear interpolation.
 * Used for color-sensitive hashing.
 *
 * @param channelIndex - 0=R, 1=G, 2=B
 */
function resizeToChannel(imageData, srcWidth, srcHeight, dstWidth, dstHeight, channelIndex) {
    const result = new Array(dstWidth * dstHeight);
    const xRatio = srcWidth / dstWidth;
    const yRatio = srcHeight / dstHeight;
    for (let y = 0; y < dstHeight; y++) {
        for (let x = 0; x < dstWidth; x++) {
            const srcX = x * xRatio;
            const srcY = y * yRatio;
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = Math.min(x0 + 1, srcWidth - 1);
            const y1 = Math.min(y0 + 1, srcHeight - 1);
            const xFrac = srcX - x0;
            const yFrac = srcY - y0;
            const getChannel = (px, py) => {
                const idx = (py * srcWidth + px) * 4;
                const a = imageData[idx + 3];
                if (a < 128)
                    return 128; // Transparent → neutral
                return imageData[idx + channelIndex];
            };
            const c00 = getChannel(x0, y0);
            const c10 = getChannel(x1, y0);
            const c01 = getChannel(x0, y1);
            const c11 = getChannel(x1, y1);
            const top = c00 * (1 - xFrac) + c10 * xFrac;
            const bottom = c01 * (1 - xFrac) + c11 * xFrac;
            result[y * dstWidth + x] = top * (1 - yFrac) + bottom * yFrac;
        }
    }
    return result;
}
/**
 * Compute a 64-bit color-channel hash.
 *
 * Runs dHash separately on the Red and Green channels at 5x8 resolution,
 * producing 32 bits per channel (4 comparisons × 8 rows = 32).
 * Blue is omitted since R + G + grayscale already captures it.
 *
 * This distinguishes items with similar shapes but different colors
 * (e.g., green Avantoe seed vs red Strawberry seed).
 */
function colorChannelHash(imageData, width, height) {
    const CH_WIDTH = 5;
    const CH_HEIGHT = 8;
    const rValues = resizeToChannel(imageData, width, height, CH_WIDTH, CH_HEIGHT, 0);
    const gValues = resizeToChannel(imageData, width, height, CH_WIDTH, CH_HEIGHT, 1);
    let hash = 0n;
    let bit = 0n;
    // R-channel dHash: 32 bits (4 comparisons × 8 rows)
    for (let y = 0; y < CH_HEIGHT; y++) {
        for (let x = 0; x < CH_WIDTH - 1; x++) {
            if (rValues[y * CH_WIDTH + x] > rValues[y * CH_WIDTH + x + 1]) {
                hash |= (1n << bit);
            }
            bit++;
        }
    }
    // G-channel dHash: 32 bits (4 comparisons × 8 rows)
    for (let y = 0; y < CH_HEIGHT; y++) {
        for (let x = 0; x < CH_WIDTH - 1; x++) {
            if (gValues[y * CH_WIDTH + x] > gValues[y * CH_WIDTH + x + 1]) {
                hash |= (1n << bit);
            }
            bit++;
        }
    }
    return hash;
}
/**
 * Compute a 128-bit item hash combining structure and color information.
 *
 * - Low 64 bits: standard grayscale dHash (edge gradients)
 * - High 64 bits: color-channel dHash on R and G channels
 *
 * This produces a 32-character hex string that distinguishes items with
 * similar shapes but different colors, achieving near-zero collision rate
 * across RS3's ~30,000 unique items.
 *
 * @param imageData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns 128-bit hash as bigint
 */
function itemHash(imageData, width, height) {
    const structureHash = dHash(imageData, width, height);
    const colorHash = colorChannelHash(imageData, width, height);
    return (colorHash << 64n) | structureHash;
}
/**
 * Convert 128-bit item hash to 32-character hex string
 */
function itemHashToHex(hash) {
    return hash.toString(16).padStart(32, '0');
}
/**
 * Resize image to grayscale at target dimensions using bilinear interpolation
 */
function resizeToGrayscale(imageData, srcWidth, srcHeight, dstWidth, dstHeight) {
    const result = new Array(dstWidth * dstHeight);
    const xRatio = srcWidth / dstWidth;
    const yRatio = srcHeight / dstHeight;
    for (let y = 0; y < dstHeight; y++) {
        for (let x = 0; x < dstWidth; x++) {
            // Map to source coordinates
            const srcX = x * xRatio;
            const srcY = y * yRatio;
            // Bilinear interpolation
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = Math.min(x0 + 1, srcWidth - 1);
            const y1 = Math.min(y0 + 1, srcHeight - 1);
            const xFrac = srcX - x0;
            const yFrac = srcY - y0;
            // Get grayscale values at 4 corners
            const g00 = getGrayscale(imageData, srcWidth, x0, y0);
            const g10 = getGrayscale(imageData, srcWidth, x1, y0);
            const g01 = getGrayscale(imageData, srcWidth, x0, y1);
            const g11 = getGrayscale(imageData, srcWidth, x1, y1);
            // Interpolate
            const top = g00 * (1 - xFrac) + g10 * xFrac;
            const bottom = g01 * (1 - xFrac) + g11 * xFrac;
            const value = top * (1 - yFrac) + bottom * yFrac;
            result[y * dstWidth + x] = value;
        }
    }
    return result;
}
/**
 * Get grayscale value at pixel (x, y) from RGBA data
 * Uses luminance formula: 0.299*R + 0.587*G + 0.114*B
 */
function getGrayscale(imageData, width, x, y) {
    const idx = (y * width + x) * 4;
    const r = imageData[idx];
    const g = imageData[idx + 1];
    const b = imageData[idx + 2];
    const a = imageData[idx + 3];
    // If transparent, treat as white background
    if (a < 128) {
        return 255;
    }
    return 0.299 * r + 0.587 * g + 0.114 * b;
}
/**
 * Get alpha-based value for font character hashing
 * Uses alpha channel to differentiate visible vs transparent pixels
 * This works better for font characters (white text on transparent bg)
 */
function getAlphaValue(imageData, width, x, y) {
    const idx = (y * width + x) * 4;
    const a = imageData[idx + 3];
    // Invert: transparent (0) -> 255, opaque (255) -> 0
    // This makes visible pixels "dark" and transparent "light"
    return 255 - a;
}
/**
 * Resize image to alpha-based values at target dimensions
 * Used for font character hashing where shape matters more than color
 */
function resizeToAlpha(imageData, srcWidth, srcHeight, dstWidth, dstHeight) {
    const result = new Array(dstWidth * dstHeight);
    const xRatio = srcWidth / dstWidth;
    const yRatio = srcHeight / dstHeight;
    for (let y = 0; y < dstHeight; y++) {
        for (let x = 0; x < dstWidth; x++) {
            // Map to source coordinates
            const srcX = x * xRatio;
            const srcY = y * yRatio;
            // Bilinear interpolation
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = Math.min(x0 + 1, srcWidth - 1);
            const y1 = Math.min(y0 + 1, srcHeight - 1);
            const xFrac = srcX - x0;
            const yFrac = srcY - y0;
            // Get alpha values at 4 corners
            const a00 = getAlphaValue(imageData, srcWidth, x0, y0);
            const a10 = getAlphaValue(imageData, srcWidth, x1, y0);
            const a01 = getAlphaValue(imageData, srcWidth, x0, y1);
            const a11 = getAlphaValue(imageData, srcWidth, x1, y1);
            // Interpolate
            const top = a00 * (1 - xFrac) + a10 * xFrac;
            const bottom = a01 * (1 - xFrac) + a11 * xFrac;
            const value = top * (1 - yFrac) + bottom * yFrac;
            result[y * dstWidth + x] = value;
        }
    }
    return result;
}
/**
 * Compute a difference hash for font characters
 * Uses alpha channel instead of luminance to differentiate character shapes
 *
 * @param imageData - Raw RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @returns 64-bit hash as bigint
 */
function fontHash(imageData, width, height) {
    const HASH_WIDTH = 9;
    const HASH_HEIGHT = 8;
    // Resize using alpha values
    const alphaMap = resizeToAlpha(imageData, width, height, HASH_WIDTH, HASH_HEIGHT);
    // Compute difference hash
    let hash = 0n;
    let bit = 0n;
    for (let y = 0; y < HASH_HEIGHT; y++) {
        for (let x = 0; x < HASH_WIDTH - 1; x++) {
            const left = alphaMap[y * HASH_WIDTH + x];
            const right = alphaMap[y * HASH_WIDTH + x + 1];
            if (left > right) {
                hash |= (1n << bit);
            }
            bit++;
        }
    }
    return hash;
}
/**
 * Compute Hamming distance between two hashes
 *
 * Hamming distance = number of bits that differ
 * - 0 = identical
 * - 1-5 = very similar (likely same image with minor differences)
 * - 6-10 = somewhat similar
 * - 11+ = different images
 *
 * @param hash1 - First 64-bit hash
 * @param hash2 - Second 64-bit hash
 * @returns Number of differing bits (0-64)
 */
function hammingDistance(hash1, hash2) {
    let xor = hash1 ^ hash2;
    let distance = 0;
    while (xor > 0n) {
        distance += Number(xor & 1n);
        xor >>= 1n;
    }
    return distance;
}
/**
 * Check if two hashes are similar within a threshold
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @param threshold - Maximum Hamming distance to consider similar (default: 10)
 * @returns true if hashes are similar
 */
function isSimilar(hash1, hash2, threshold = 10) {
    return hammingDistance(hash1, hash2) <= threshold;
}
/**
 * Convert hash to hex string for storage/display
 */
function hashToHex(hash) {
    return hash.toString(16).padStart(16, '0');
}
/**
 * Convert hex string back to hash
 */
function hexToHash(hex) {
    return BigInt('0x' + hex);
}
/**
 * Compute perceptual hash from ImageData object
 */
function pHashFromImageData(img) {
    return dHash(img.data, img.width, img.height);
}
/**
 * Compute both CRC32 and pHash for comparison/migration
 */
function dualHash(imageData, width, height) {
    // Import crc32 dynamically to avoid circular deps
    const { crc32 } = __webpack_require__(/*! ./crc32 */ "./gl/crc32.ts");
    // CRC32 with the blue fix
    const data = new Uint8Array(imageData);
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] === 0)
            data[i + 2] = 1;
    }
    const crcHash = crc32(data);
    const perceptualHash = dHash(imageData, width, height);
    return {
        crc32: crcHash,
        pHash: perceptualHash,
        pHashHex: hashToHex(perceptualHash),
    };
}
/**
 * Find best match from a list of known hashes
 *
 * @param targetHash - Hash to match
 * @param knownHashes - Map of name -> hash
 * @param threshold - Maximum distance to consider a match
 * @returns Best match or null
 */
function findBestMatch(targetHash, knownHashes, threshold = 10) {
    let bestMatch = null;
    for (const [name, hash] of knownHashes) {
        const distance = hammingDistance(targetHash, hash);
        if (distance <= threshold) {
            if (!bestMatch || distance < bestMatch.distance) {
                bestMatch = { name, distance };
            }
        }
    }
    return bestMatch;
}


/***/ },

/***/ "./gl/reflect2d.ts"
/*!*************************!*\
  !*** ./gl/reflect2d.ts ***!
  \*************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AtlasTracker: () => (/* binding */ AtlasTracker),
/* harmony export */   getUIState: () => (/* binding */ getUIState),
/* harmony export */   pointBoxDistance: () => (/* binding */ pointBoxDistance),
/* harmony export */   rectContainsPoint: () => (/* binding */ rectContainsPoint),
/* harmony export */   rectsHaveOverlap: () => (/* binding */ rectsHaveOverlap)
/* harmony export */ });
/* harmony import */ var _renderprogram__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./renderprogram */ "./gl/renderprogram.ts");
/* harmony import */ var _spritecache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./spritecache */ "./gl/spritecache.ts");
/* harmony import */ var _phash__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./phash */ "./gl/phash.ts");



function rectsHaveOverlap(a, b) {
    let overlapx = (a.x >= b.x && a.x < b.x + b.width || b.x >= a.x && b.x < a.x + a.width);
    let overlapy = (a.y >= b.y && a.y < b.y + b.height || b.y >= a.y && b.y < a.y + a.height);
    return overlapx && overlapy;
}
function rectContainsPoint(rect, px, py) {
    return (px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height);
}
function pointBoxDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
class AtlasTextureSnapshotCache {
    static MAX_SPRITES = 2000;
    static MAX_FONTSHEETS = 50;
    sprites = new Map();
    fontsheets = [];
    whitesprite;
    lastChanges = [];
    snapshot;
    pHashNegativeCache = new Set();
    constructor(snap) {
        this.snapshot = snap;
        this.whitesprite = {
            x: -1, y: -1, height: 1, width: 1,
            pixelhash: 0,
            basetex: snap,
            known: _spritecache__WEBPACK_IMPORTED_MODULE_1__.emptySpriteInfo,
        };
    }
    cacheKey(x, y) {
        return (x << 16) | y;
    }
    adsorbKnowns(old) {
        if (!this.snapshot.isChild(old.snapshot)) {
            return false;
        }
        let edits = this.snapshot.changesSince(old.snapshot);
        this.lastChanges = edits;
        // keep known sprites that do not overlap edits
        for (let [key, val] of old.sprites.entries()) {
            if (!edits.some(edit => rectsHaveOverlap(edit, val))) {
                val.basetex = this.snapshot;
                this.sprites.set(key, val);
            }
        }
        for (let sheet of old.fontsheets) {
            if (!edits.some(edit => rectsHaveOverlap(edit, sheet.frag))) {
                this.fontsheets.push(sheet);
            }
        }
        // Cap fontsheets to prevent unbounded growth
        if (this.fontsheets.length > AtlasTextureSnapshotCache.MAX_FONTSHEETS) {
            this.fontsheets = this.fontsheets.slice(-AtlasTextureSnapshotCache.MAX_FONTSHEETS);
        }
        this.pHashNegativeCache = new Set(old.pHashNegativeCache);
        return true;
    }
    removeFragment(frag) {
        let oldkey = this.cacheKey(frag.x, frag.y);
        this.sprites.delete(oldkey);
    }
    findFragment(sprites, x, y, w, h) {
        let key = this.cacheKey(x, y);
        // let frag = this.sprites.find(q => q.x == x && q.y == y && q.width == w && q.height == h);
        let frag = this.sprites.get(key);
        if (frag && (frag.width != w || frag.height != h)) {
            console.log("overwrote atlas sprite with different size");
            frag = undefined;
        }
        if (!frag) {
            frag = this.getFragment(sprites, x, y, w, h, null);
        }
        return frag;
    }
    getHash(x, y, w, h) {
        let buf = (this.snapshot.canCapture() ? this.snapshot.capture(x, y, w, h) : new ImageData(w, h));
        return (0,_spritecache__WEBPACK_IMPORTED_MODULE_1__.imgcrc)(buf);
    }
    makeFragment(x, y, w, h, known = null) {
        let frag = {
            x: x, y: y, width: w, height: h,
            pixelhash: this.getHash(x, y, w, h),
            basetex: this.snapshot,
            known: known,
        };
        return frag;
    }
    getFragment(sprites, x, y, w, h, ifmatched) {
        let key = this.cacheKey(x, y);
        let hash = this.getHash(x, y, w, h);
        if (ifmatched && ifmatched.hash != hash) {
            return null;
        }
        let frag = {
            x: x, y: y, width: w, height: h,
            pixelhash: hash,
            basetex: this.snapshot,
            known: null,
        };
        this.sprites.set(key, frag);
        if (ifmatched) {
            frag.known = ifmatched;
        }
        else {
            let spritematch = sprites.hashes.get(hash);
            if (spritematch) {
                frag.known = spritematch;
            }
            else {
                // Try pHash matching for items (CRC32 varies across sessions)
                const pHashMatch = this.tryMatchByPHash(sprites, frag);
                if (pHashMatch) {
                    frag.known = pHashMatch;
                }
                else {
                    this.tryMatchFontChar(sprites, frag);
                }
            }
        }
        if (frag.known && frag.known.font) {
            if (frag.known.fontchr) {
                this.tryIdentifyFont(sprites, frag);
            }
        }
        // Evict oldest sprite entries if map too large
        if (this.sprites.size > AtlasTextureSnapshotCache.MAX_SPRITES) {
            const excess = this.sprites.size - AtlasTextureSnapshotCache.MAX_SPRITES;
            let removed = 0;
            for (const k of this.sprites.keys()) {
                this.sprites.delete(k);
                removed++;
                if (removed >= excess)
                    break;
            }
        }
        return frag;
    }
    /**
     * Try to match a sprite by pHash (perceptual hash)
     * Used for item identification since CRC32 varies across sessions
     */
    tryMatchByPHash(sprites, frag) {
        // Only try pHash for reasonably sized sprites (items are typically 30-40px)
        if (frag.width < 10 || frag.height < 10 || frag.width > 50 || frag.height > 50) {
            return null;
        }
        // Skip sprites that already failed matching
        if (this.pHashNegativeCache.has(frag.pixelhash)) {
            return null;
        }
        try {
            // Capture the sprite's pixels
            const imgData = frag.basetex.capture(frag.x, frag.y, frag.width, frag.height);
            // Compute pHash
            const pHashValue = (0,_phash__WEBPACK_IMPORTED_MODULE_2__.dHash)(imgData.data, imgData.width, imgData.height);
            const pHashHex = (0,_phash__WEBPACK_IMPORTED_MODULE_2__.hashToHex)(pHashValue);
            // Look up in sprite cache
            const match = sprites.findItemByPHash(pHashHex, 10);
            if (match) {
                console.log(`[pHash] Matched: ${pHashHex} -> "${match.name}" (distance: ${match.distance})`);
                // Create a SpriteInfo for this item
                const info = new _spritecache__WEBPACK_IMPORTED_MODULE_1__.SpriteInfo(-2, 0, frag.pixelhash); // -2 = item sprite
                info.itemName = match.name;
                info.pHash = match.pHash;
                return info;
            }
        }
        catch (e) {
            // Silently fail - not all sprites can be captured
        }
        // Cache this pixelhash as a negative result to avoid re-computing
        if (this.pHashNegativeCache.size > 5000) {
            this.pHashNegativeCache.clear(); // periodic reset to avoid unbounded growth
        }
        this.pHashNegativeCache.add(frag.pixelhash);
        return null;
    }
    tryMatchFontChar(sprites, frag) {
        if (frag.known) {
            return;
        }
        for (let { frag: fontfrag, font } of this.fontsheets) {
            if (!rectsHaveOverlap(fontfrag, frag)) {
                continue;
            }
            let match = font.unknownsubs.find(unk => rectContainsPoint(frag, fontfrag.x + unk.x, fontfrag.y + unk.y));
            let charcode = match?.charcode ?? "\uFFFD".charCodeAt(0);
            frag.known = font.identifyMissingCharacter(charcode, frag.x - frag.x, frag.y - frag.y, frag.width, frag.height, frag.pixelhash);
            sprites.hashes.set(frag.pixelhash, frag.known);
            break;
        }
    }
    tryIdentifyFont(sprites, charfrag) {
        if (!charfrag.known || !charfrag.known.fontchr || !charfrag.known.font) {
            return;
        }
        let font = charfrag.known.font;
        let fontchr = charfrag.known.fontchr;
        let fontx = charfrag.x - fontchr.x;
        let fonty = charfrag.y - fontchr.y;
        if (this.fontsheets.some(f => f.frag.x == fontx && f.frag.y == fonty)) {
            return;
        }
        let basekey = this.cacheKey(fontx, fonty);
        let basesprite = this.sprites.get(basekey);
        if (!basesprite || basesprite.known != charfrag.known.font?.basesprite) {
            let fontw = font.sheetwidth;
            let fonth = font.sheetheight;
            if (fontw == -1 || fonth == -1) {
                throw new Error("incomplete font");
            }
            let hash = this.getHash(fontx, fonty, fontw, fonth);
            if (hash == font.basesprite.hash) {
                let basefrag = this.makeFragment(fontx, fonty, fontw, fonth, font.basesprite);
                this.fontsheets.push({ font: font, frag: basefrag });
                // Cap fontsheets to prevent unbounded growth
                if (this.fontsheets.length > AtlasTextureSnapshotCache.MAX_FONTSHEETS) {
                    this.fontsheets = this.fontsheets.slice(-AtlasTextureSnapshotCache.MAX_FONTSHEETS);
                }
                console.log(`font ${font.spriteid} base matched by char ${fontchr.charcode}`);
                // detect fragments that belong to this font
                for (let chr of font.subs.values()) {
                    let fontchr = chr.fontchr;
                    this.getFragment(sprites, fontx + fontchr.x, fonty + fontchr.y, fontchr.width, fontchr.height, chr);
                }
                // try find fragments
                for (let frag of this.sprites.values()) {
                    if (frag.known || !rectsHaveOverlap(frag, basefrag)) {
                        continue;
                    }
                    let match = font.unknownsubs.find(unkchr => rectContainsPoint(frag, fontx + unkchr.x, fonty + unkchr.y));
                    let charcode = match?.charcode ?? "\uFFFD".charCodeAt(0);
                    let known = font.identifyMissingCharacter(charcode, frag.x - fontx, frag.y - fonty, frag.width, frag.height, frag.pixelhash);
                    frag.known = known;
                    sprites.hashes.set(frag.pixelhash, known);
                }
            }
        }
    }
}
class AtlasTracker {
    static MAX_CACHE_SIZE = 8;
    cache = new Map();
    spriteCache;
    constructor(spriteCache) {
        this.spriteCache = spriteCache;
    }
    getSubcache(tex) {
        let subcache = this.cache.get(tex);
        if (!subcache) {
            subcache = new AtlasTextureSnapshotCache(tex);
            for (let [key, val] of this.cache.entries()) {
                if (subcache.adsorbKnowns(val)) {
                    this.cache.delete(key);
                    break;
                }
            }
            this.cache.set(tex, subcache);
            // Evict oldest entries if cache too large
            if (this.cache.size > AtlasTracker.MAX_CACHE_SIZE) {
                const keysToDelete = [];
                let count = 0;
                for (const key of this.cache.keys()) {
                    if (key === tex)
                        continue; // don't evict the one we just added
                    keysToDelete.push(key);
                    count++;
                    if (this.cache.size - count <= AtlasTracker.MAX_CACHE_SIZE)
                        break;
                }
                for (const key of keysToDelete) {
                    const evicted = this.cache.get(key);
                    this.cache.delete(key);
                    // Dispose native TextureSnapshot to free GPU memory
                    try {
                        key.dispose();
                    }
                    catch (_) { /* already disposed */ }
                    // Also dispose the cached snapshot reference
                    if (evicted?.snapshot) {
                        try {
                            evicted.snapshot.dispose();
                        }
                        catch (_) { /* already disposed */ }
                    }
                }
            }
        }
        return subcache;
    }
}
function getUIState(renders, cache) {
    let elements = [];
    for (let render of renders) {
        // Guard against undefined program or vertexArray
        if (!render.program || !render.vertexArray || !render.vertexArray.attributes || render.vertexArray.attributes.length === 0) {
            continue;
        }
        let progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_0__.getProgramMeta)(render.program);
        if (!progmeta.isUi) {
            continue;
        }
        let data = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_0__.getRenderFunc)(render);
        if (!data.uniforms["uDiffuseMap"]) {
            continue;
        }
        let posget = data.getters["aVertexPosition2D"];
        let texget = data.getters["aTextureUV"];
        let texminget = data.getters["aTextureUVAtlasMin"];
        let texextget = data.getters["aTextureUVAtlasExtents"];
        let colget = data.getters["aVertexColour"];
        let samplerid = data.uniforms["uDiffuseMap"][0][0];
        let tex = render.samplers[samplerid];
        if (!tex) {
            // TODO fix underlying, this seems to happen after for some reason the uniform buffer is all 0
            console.log("ui texture sampler not found");
            continue;
        }
        let subcache = cache.getSubcache(tex);
        const eps = 0.4; //bias for weird rounding situation
        for (let a = 0; a < data.indices.length; a += 6) {
            let botleft = data.indices[a + 3];
            let topright = data.indices[a + 1];
            let botright = data.indices[a + 0];
            let topleft = data.indices[a + 2];
            let samplex = Math.floor(tex.width * texget(topleft, 0) + eps);
            let sampley = Math.floor(tex.height * texget(topleft, 1) + eps);
            let samplew = Math.floor(tex.width * texget(botright, 0) + eps) - samplex;
            let sampleh = Math.floor(tex.height * texget(botright, 1) + eps) - sampley;
            let texboxx = Math.floor(tex.width * texminget(topleft, 0) + eps);
            let texboxy = Math.floor(tex.height * texminget(topleft, 1) + eps);
            let texboxw = Math.floor(tex.width * texextget(topleft, 0) + eps);
            let texboxh = Math.floor(tex.height * texextget(topleft, 1) + eps);
            //deal with 1px profile sweeping, they have 0 width attribute arguments
            if (texboxw == 0 && samplew == 0 && texboxh != 0) {
                texboxw = 1;
                samplew = 1;
            }
            if (texboxh == 0 && sampleh == 0 && texboxw != 0) {
                texboxh = 1;
                sampleh = 1;
            }
            let xb = posget(botleft, 0);
            let yb = posget(botleft, 1);
            let dxx = posget(botright, 0) - xb;
            let dxy = posget(botright, 1) - yb;
            let dyx = posget(topleft, 0) - xb;
            let dyy = posget(topleft, 1) - yb;
            texboxw = Math.abs(texboxw);
            texboxh = Math.abs(texboxh);
            let frag;
            //hardcoded case in shader, this produces white
            if (samplex < -60000 || sampley < -60000) {
                frag = subcache.whitesprite;
            }
            else {
                if (dxx == 0 || dyy == 0) {
                    continue;
                }
                if (samplew == 0 || sampleh == 0) {
                    console.log("skipped zero size tex");
                    continue;
                }
                if (texboxw == 0 || texboxh == 0) {
                    console.log("skipped zero size tex bounding box");
                    continue;
                }
                frag = subcache.findFragment(cache.spriteCache, texboxx, texboxy, texboxw, texboxh);
            }
            let el = {
                sprite: frag,
                x: xb, y: yb,
                width: dxx, height: dyy,
                m12: dyx, m21: dxy,
                samplex: samplex - texboxx,
                sampley: sampley - texboxy,
                samplewidth: samplew,
                sampleheight: sampleh,
                color: [colget(botleft, 0), colget(botleft, 1), colget(botleft, 2), colget(botleft, 3)]
            };
            elements.push(el);
        }
    }
    return { elements, frametime: renders[0]?.ownFrameTime ?? 0, lastframetime: renders[0]?.lastFrameTime ?? 0 };
}


/***/ },

/***/ "./gl/renderprogram.ts"
/*!*****************************!*\
  !*** ./gl/renderprogram.ts ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   decodeUniformBuffer: () => (/* binding */ decodeUniformBuffer),
/* harmony export */   getProgramMeta: () => (/* binding */ getProgramMeta),
/* harmony export */   getRenderFunc: () => (/* binding */ getRenderFunc),
/* harmony export */   getUniformValue: () => (/* binding */ getUniformValue)
/* harmony export */ });
/* harmony import */ var _avautils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./avautils */ "./gl/avautils.ts");

var cachedPrograms = new WeakMap();
var vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];
function getProgramMeta(prog) {
    if (cachedPrograms.has(prog)) {
        return cachedPrograms.get(prog);
    }
    var r = fetchProgramMeta(prog);
    cachedPrograms.set(prog, r);
    return r;
}
function fetchProgramMeta(prog) {
    var fragdefines = [];
    var vertdefines = [];
    var reg = /^#define\s+(\w+)\s*$/gm;
    let m;
    while (m = reg.exec(prog.fragmentShader.source)) {
        fragdefines.push(m[1]);
    }
    while (m = reg.exec(prog.vertexShader.source)) {
        vertdefines.push(m[1]);
    }
    let isTinted = !!prog.fragmentShader.source.match(/\bgl_FragColor\s*=\s*uTint\b/);
    let isUiScaler = !!prog.fragmentShader.source.match(/\bLanczosShaderConsts\b/);
    let uTint = prog.uniforms.find(q => q.name == "uTint");
    let uHighlightScale = prog.uniforms.find(q => q.name == "uHighlightScale");
    let uBoneTransforms = prog.uniforms.find(q => q.name == "uBoneTransforms[0]");
    let uViewMatrix = prog.uniforms.find(q => q.name == "uViewMatrix");
    let uProjectionMatrix = prog.uniforms.find(q => q.name == "uProjectionMatrix");
    let uSrcUVRegion = prog.uniforms.find(q => q.name == "uSrcUVRegion");
    let uColourRemapWeightings = prog.uniforms.find(q => q.name == "uColourRemapWeightings");
    let aTexUV = prog.inputs.find(q => q.name == "aTextureUV");
    let aVertexNormal = prog.inputs.find(q => q.name == "aVertexNormal_BatchFlags");
    let aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
    let aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");
    let aVertexPosition2D = prog.inputs.find(q => q.name == "aVertexPosition2D");
    let aPos = prog.inputs.find(i => vertexPosAliases.indexOf(i.name) != -1);
    let isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");
    let isShadowRender = vertdefines.includes("MODEL_GEOMETRY_SHADOW_VS");
    return {
        uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
        uBones: uBoneTransforms,
        uTint: uTint,
        uHighlightScale: uHighlightScale,
        uViewMatrix: uViewMatrix,
        uProjectionMatrix: uProjectionMatrix,
        aPos: aPos,
        aColor: prog.inputs.find(q => q.name == "aVertexColour"),
        aTexUV: aTexUV,
        aTexMetaLookup: prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY_TilePositionXZ"),
        aBones: prog.inputs.find(q => q.name == "aVertexPosition_BoneLabel"),
        aSkinbones: prog.inputs.find(q => q.name == "aVertexSkinBones"),
        aVertexNormal_BatchFlags: aVertexNormal,
        aParticleSize: aParticleSize,
        isPostProcess: !!uColourRemapWeightings,
        isCompute: prog.computeShader.source.length != 0,
        isFloor: !!aMaterialSettingsSlotXY3,
        isFloorWater: !!aPos && aPos.name == "aWaterPosition_Depth",
        isAnimated: !!uBoneTransforms,
        isUi: !!aVertexPosition2D,
        isUiScaler: isUiScaler,
        isUiGameCopy: !!uSrcUVRegion,
        isParticles: !!aParticleSize,
        isLighted,
        isShadowRender,
        isTinted,
        isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,
        raw: prog,
        fragdefines,
        vertdefines,
        flags: {
            vertexcolor: fragdefines.includes("VERTEX_COLOUR"),
            texalpha: fragdefines.includes("TEXTURE_ALPHA_USAGE"),
            alpha: fragdefines.includes("ALPHA_ENABLED"),
            forceOpaque: fragdefines.includes("FORCE_OPAQUE"),
            albedoTexture: !!aTexUV,
            //TODO rt7 materials
            metalTexture: false,
            roughnessTexture: false
        }
    };
}
function getRenderFunc(json) {
    var program = getProgramMeta(json.program);
    var uniforms = decodeUniformBuffer(json.uniformState, program);
    var ntriangles = 0;
    for (let a = 0; a < json.renderRanges.length; a++) {
        if (json.renderMode == "triangles") {
            ntriangles += json.renderRanges[a].length / 3;
        }
        else {
            ntriangles += json.renderRanges[a].length - 2;
        }
    }
    var indices = new Uint32Array(ntriangles * 3);
    var nvertices = json.vertexArray.attributes[0].buffer.byteLength / json.vertexArray.attributes[0].stride;
    if (!json.vertexArray.indexBuffer || json.vertexArray.indexBuffer.byteLength == 0) {
        var id = 0;
        var offset = 0;
        //TODO don't know length in this mode, currently not working
        for (let a = 0; a < json.renderRanges.length; a++) {
            for (let b = 0; b < json.renderRanges[a].length;) {
                if (json.renderMode == "strips" && b != 0) {
                    id -= 2;
                    b -= 2;
                }
                indices[offset++] = id++;
                indices[offset++] = id++;
                indices[offset++] = id++;
                b += 3;
            }
        }
    }
    else {
        //convert and normalize vertex attributes
        var buf = json.vertexArray.indexBuffer;
        var indextype = _avautils__WEBPACK_IMPORTED_MODULE_0__.vartypes[json.indexType];
        var bufview = new indextype.constr(buf.buffer, buf.byteOffset, buf.byteLength / indextype.size);
        var indexsize = indextype.size;
        var c = 0;
        for (let a = 0; a < json.renderRanges.length; a++) {
            let b = 0;
            let ptr = json.renderRanges[a].start / indexsize;
            while (b < json.renderRanges[a].length) {
                if (json.renderMode == "strips" && b != 0) {
                    b -= 2;
                }
                indices[c++] = bufview[ptr + b++];
                indices[c++] = bufview[ptr + b++];
                indices[c++] = bufview[ptr + b++];
            }
        }
    }
    var getters = {};
    for (var a in program.raw.inputs) {
        var proginp = program.raw.inputs[a];
        var inp = json.vertexArray.attributes[proginp.location];
        if (inp) {
            // TODO this would be way more efficient with getAttributeView
            let buf = new DataView(inp.buffer.buffer, inp.buffer.byteOffset, inp.buffer.byteLength);
            var type = _avautils__WEBPACK_IMPORTED_MODULE_0__.vartypes[inp.scalartype];
            getters[proginp.name] = (function (inp, buf, type) {
                return function (i, vi) {
                    if (vi < inp.vectorlength) {
                        return buf[type.readfn](inp.offset + i * inp.stride + vi * type.size, true);
                    }
                    return (vi == 3 ? 1 : 1);
                };
            })(inp, buf, type);
        }
        else {
            getters[proginp.name] = () => 0;
        }
    }
    var keyframes = [{ time: 0, uniforms }];
    var utexatlasmeta = program.raw.uniforms.find(u => u.name == "uTextureAtlasSettings");
    var utexatlas = program.raw.uniforms.find(u => u.name == "uTextureAtlas");
    var texture = null;
    if (utexatlasmeta && utexatlas) {
        let atlas = json.samplers[uniforms[utexatlas.name][0][0]];
        let atlasmeta = json.samplers[uniforms[utexatlasmeta.name][0][0]];
        if (atlas && atlasmeta) {
            texture = { atlas, atlasmeta };
        }
    }
    return { uniforms, nvertices, raw: json, indices, getters, progmeta: program, keyframes, texture };
}
function decodeUniformBuffer(snap, program) {
    var uniforms = {};
    for (let uni of program.raw.uniforms) {
        if (!uni.snapshotTracked) {
            continue;
        }
        uniforms[uni.name] = getUniformValue(snap, uni);
    }
    return uniforms;
}
function getUniformValue(snap, uni) {
    var t = _avautils__WEBPACK_IMPORTED_MODULE_0__.vartypes[uni.type.scalarType];
    var v = [];
    var unireader = new DataView(snap.buffer, snap.byteOffset, snap.byteLength);
    for (let a = 0; a < uni.length; a++) {
        var sub = [];
        v.push(sub);
        for (let b = 0; b < uni.type.vectorLength; b++) {
            sub.push(unireader[t.readfn](uni.snapshotOffset + uni.type.vectorLength * uni.type.scalarSize * a + uni.type.scalarSize * b, true));
        }
    }
    return v;
}


/***/ },

/***/ "./gl/spritecache.ts"
/*!***************************!*\
  !*** ./gl/spritecache.ts ***!
  \***************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KnownSpriteSheet: () => (/* binding */ KnownSpriteSheet),
/* harmony export */   SpriteCache: () => (/* binding */ SpriteCache),
/* harmony export */   SpriteInfo: () => (/* binding */ SpriteInfo),
/* harmony export */   emptySpriteInfo: () => (/* binding */ emptySpriteInfo),
/* harmony export */   imgcrc: () => (/* binding */ imgcrc),
/* harmony export */   setApiBase: () => (/* binding */ setApiBase)
/* harmony export */ });
/* harmony import */ var _crc32__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./crc32 */ "./gl/crc32.ts");
/* harmony import */ var _phash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./phash */ "./gl/phash.ts");


// API configuration
const PRODUCTION_API_BASE = "https://www.techpure.dev/api";
const LOCAL_API_BASE = "http://localhost:42069/api";
let apiBase = PRODUCTION_API_BASE;
function setApiBase(url) { apiBase = url; }
// sprite hash files generated using runeapps model viewer https://runeapps.org/modelviewer
// scripts->cli->run
// alternatively use cli version and prepend `node dist/cli.js -o openrs2last`
// Data files served via alt1-builtin:// protocol from shared-data package
const SHARED_DATA_BASE = 'alt1-builtin://shared-data/data';
class SpriteInfo {
    id;
    subid;
    hash;
    pHash = null; // Perceptual hash (stable across sessions)
    fontchr = null;
    font = null;
    itemName = null; // Item name from Item-Hashes.json
    synonym; //circular linked list of synonyms
    constructor(id, subid, hash) {
        this.id = id;
        this.subid = subid;
        this.hash = hash;
        this.synonym = this;
    }
}
function imgcrc(img) {
    let data = img.data.slice();
    // for some reason *some times* 0 blue gets turned into 1 blue
    // always set it to 1 for hash computation
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] == 0) {
            data[i + 2] = 1;
        }
    }
    return (0,_crc32__WEBPACK_IMPORTED_MODULE_0__.crc32)(data);
}
class KnownSpriteSheet {
    spriteid;
    subs = new Set();
    unknownsubs = [];
    fontfile = null;
    basesprite;
    sheetwidth;
    sheetheight;
    constructor(spriteid, width, height, sheethash) {
        this.spriteid = spriteid;
        this.basesprite = new SpriteInfo(spriteid, 0, sheethash);
        this.basesprite.font = this;
        this.sheetwidth = width;
        this.sheetheight = height;
    }
    addFontFile(fontfile) {
        this.fontfile = fontfile;
        for (let chr of fontfile.characters) {
            if (!chr) {
                continue;
            }
            let sub = new SpriteInfo(fontfile.spriteid, chr.charcode, chr.hash);
            this.subs.add(sub);
            sub.font = this;
            sub.fontchr = chr;
        }
    }
    addUknownSub(dx, dy, charcode) {
        this.unknownsubs.push({ x: dx, y: dy, charcode: charcode });
    }
    addCharSprite(charcode, dx, dy, width, height, hash) {
        let known = new SpriteInfo(this.spriteid, charcode, hash);
        known.font = this;
        known.fontchr = {
            chr: String.fromCharCode(charcode),
            charcode: charcode,
            x: dx,
            y: dy,
            width: width,
            height: height,
            hash: known.hash,
            bearingy: 0, //unknown
        };
        this.subs.add(known);
        return known;
    }
    identifyMissingCharacter(charcode, dx, dy, width, height, hash) {
        let known = this.addCharSprite(charcode, dx, dy, width, height, hash);
        this.unknownsubs = this.unknownsubs.filter(c => c.charcode != charcode);
        console.log(`font char "${String.fromCharCode(charcode)}" matched by containment in font ${this.spriteid}`);
        return known;
    }
    resizeSheetBox() {
        if (this.unknownsubs.length == 0 && this.subs.size == 0) {
            throw new Error("no subs to size from");
        }
        let minx = Math.min.apply(null, [...this.subs.values().map(q => q.fontchr.x), ...this.unknownsubs.map(q => q.x)]);
        let miny = Math.min.apply(null, [...this.subs.values().map(q => q.fontchr.y), ...this.unknownsubs.map(q => q.y)]);
        let maxx = Math.max.apply(null, [...this.subs.values().map(q => q.fontchr.x + q.fontchr.width), ...this.unknownsubs.map(q => q.x + 1)]);
        let maxy = Math.max.apply(null, [...this.subs.values().map(q => q.fontchr.y + q.fontchr.height), ...this.unknownsubs.map(q => q.y + 1)]);
        this.sheetwidth = maxx - minx;
        this.sheetheight = maxy - miny;
        this.basesprite.hash = 0;
        for (let sub of this.subs) {
            sub.fontchr.x -= minx;
            sub.fontchr.y -= miny;
        }
        for (let chr of this.unknownsubs) {
            chr.x -= minx;
            chr.y -= miny;
        }
        return { dx: minx, dy: miny };
    }
    toJSON() {
        let res = {
            sheetwidth: this.sheetwidth,
            sheetheight: this.sheetheight,
            sheethash: this.basesprite.hash,
            spriteid: this.spriteid,
            characters: [...this.subs].map(s => s.fontchr).filter(c => c != null),
            unknownchars: [...this.unknownsubs],
        };
        return res;
    }
}
const whitePixelImage = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
const emptySpriteInfo = new SpriteInfo(-1, 0, imgcrc(whitePixelImage));
class SpriteCache {
    hashes = new Map();
    fonts = new Map();
    pHashItems = new Map(); // pHash hex -> item name
    readyResolvers = Promise.withResolvers();
    ready = this.readyResolvers.promise;
    constructor() {
        this.hashes.set(emptySpriteInfo.hash, emptySpriteInfo);
    }
    /**
     * Load item hashes from API
     * Uses pHash (perceptual hash) for cross-session stable item identification
     */
    async loadItemHashes() {
        try {
            const itemsUrl = `${apiBase}/items?limit=500`;
            console.log(`[SpriteCache] Loading items from API: ${itemsUrl}`);
            const response = await fetch(itemsUrl);
            if (!response.ok) {
                console.warn(`[SpriteCache] API returned ${response.status}`);
                return;
            }
            const result = await response.json();
            const items = result.items || [];
            let loaded = 0;
            for (const item of items) {
                if (!item.name || !item.pHash)
                    continue;
                this.pHashItems.set(item.pHash, item.name);
                loaded++;
            }
            console.log(`[SpriteCache] Loaded ${loaded} items from API`);
        }
        catch (err) {
            console.error("[SpriteCache] Failed to load item hashes from API:", err);
        }
    }
    /**
     * Get item name by perceptual hash (exact match)
     * @param pHashHex - 16-character hex string of the perceptual hash
     * @returns Item name or null if not found
     */
    getItemByPHash(pHashHex) {
        return this.pHashItems.get(pHashHex) ?? null;
    }
    /**
     * Find item by perceptual hash with fuzzy matching
     * Uses Hamming distance to find visually similar items
     * @param pHashHex - 16-character hex string of the perceptual hash
     * @param threshold - Maximum Hamming distance (default: 10, lower = stricter)
     * @returns Best match or null
     */
    findItemByPHash(pHashHex, threshold = 10) {
        // First try exact match
        const exactName = this.pHashItems.get(pHashHex);
        if (exactName) {
            return { name: exactName, distance: 0, pHash: pHashHex };
        }
        // Fuzzy match using Hamming distance
        const targetHash = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.hexToHash)(pHashHex);
        let bestMatch = null;
        for (const [storedPHash, name] of this.pHashItems) {
            const storedHash = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.hexToHash)(storedPHash);
            const distance = (0,_phash__WEBPACK_IMPORTED_MODULE_1__.hammingDistance)(targetHash, storedHash);
            if (distance <= threshold) {
                if (!bestMatch || distance < bestMatch.distance) {
                    bestMatch = { name, distance, pHash: storedPHash };
                }
            }
        }
        // Debug: log search if we have items to search
        if (this.pHashItems.size > 0 && !bestMatch) {
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) {
                console.log(`[SpriteCache] No pHash match for ${pHashHex} (${this.pHashItems.size} items in DB)`);
            }
        }
        return bestMatch;
    }
    /**
     * Check if an item exists by pHash
     */
    hasItemByPHash(pHashHex) {
        return this.pHashItems.has(pHashHex);
    }
    /**
     * Get all known items (for debugging/display)
     */
    getAllItems() {
        return Array.from(this.pHashItems.entries()).map(([pHash, name]) => ({
            pHash,
            name,
        }));
    }
    addSprite(info) {
        let prev = this.hashes.get(info.hash);
        if (prev) {
            info.synonym = prev.synonym;
            prev.synonym = info;
        }
        else {
            this.hashes.set(info.hash, info);
        }
        return info;
    }
    loadSpriteList(list) {
        list.forEach(spr => this.addSprite(new SpriteInfo(spr.id, spr.sub, spr.hash)));
    }
    loadCacheFontFile(fonts) {
        for (let fontjson of fonts) {
            let font = new KnownSpriteSheet(fontjson.spriteid, fontjson.sheetwidth, fontjson.sheetheight, fontjson.sheethash);
            font.addFontFile(fontjson);
            this.fonts.set(font.spriteid, font);
            font.subs.forEach(sub => this.addSprite(sub));
        }
    }
    loadCustomFontFile(fontjson) {
        let font = new KnownSpriteSheet(fontjson.spriteid, fontjson.sheetwidth, fontjson.sheetheight, fontjson.sheethash);
        for (let chr of fontjson.characters) {
            font.addCharSprite(chr.charcode, chr.x, chr.y, chr.width, chr.height, chr.hash);
        }
        for (let unk of fontjson.unknownchars) {
            font.addUknownSub(unk.x, unk.y, unk.charcode);
        }
        // TODO need unique id
        this.fonts.set(font.spriteid, font);
        font.subs.forEach(sub => this.addSprite(sub));
    }
    async downloadCacheData() {
        let spritedata = await fetch(`${SHARED_DATA_BASE}/spritehash.batch.json`).then(res => res.json());
        this.loadSpriteList(spritedata);
        let fontdata = await fetch(`${SHARED_DATA_BASE}/fonthash.batch.json`).then(res => res.json());
        this.loadCacheFontFile(fontdata);
        // Load all chat font sizes (10pt - 22pt)
        const chat10ptdata = await fetch(`${SHARED_DATA_BASE}/chat10pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat10ptdata);
        const chat12ptdata = await fetch(`${SHARED_DATA_BASE}/chat12pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat12ptdata);
        const chat14ptdata = await fetch(`${SHARED_DATA_BASE}/chat14pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat14ptdata);
        const chat16ptdata = await fetch(`${SHARED_DATA_BASE}/chat16pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat16ptdata);
        const chat18ptdata = await fetch(`${SHARED_DATA_BASE}/chat18pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat18ptdata);
        const chat20ptdata = await fetch(`${SHARED_DATA_BASE}/chat20pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat20ptdata);
        const chat22ptdata = await fetch(`${SHARED_DATA_BASE}/chat22pt.json`).then(res => res.json());
        this.loadCustomFontFile(chat22ptdata);
        // Load other font formats
        const s8x11ptdata = await fetch(`${SHARED_DATA_BASE}/8x11Chars.json`).then(res => res.json());
        this.loadCustomFontFile(s8x11ptdata);
        const s11x12ptdata = await fetch(`${SHARED_DATA_BASE}/11x12Chars.json`).then(res => res.json());
        this.loadCustomFontFile(s11x12ptdata);
        const s7x9ptdata = await fetch(`${SHARED_DATA_BASE}/7x9Chars.json`).then(res => res.json());
        this.loadCustomFontFile(s7x9ptdata);
        console.log(`[SpriteCache] Loaded ${this.fonts.size} font sheets with ${this.hashes.size} character hashes`);
        // Load discovered item hashes from API
        await this.loadItemHashes();
        this.readyResolvers.resolve();
    }
}
function imageMemCompare(a, b) {
    if (a.width != b.width || a.height != b.height) {
        return false;
    }
    // let simpletrue = simpleCompare(b, a, 0, 0, 5) < Infinity;
    // return simpletrue;
    let memtrue = true;
    for (let i = 0; i < a.data.length; i += 4) {
        if (a.data[i + 3] != b.data[i + 3]) {
            memtrue = false;
            break;
        }
        if (a.data[i + 3] == 0) {
            continue;
        }
        if (a.data[i + 0] != b.data[i + 0]) {
            memtrue = false;
            break;
        }
        if (a.data[i + 1] != b.data[i + 1]) {
            memtrue = false;
            break;
        }
        if (a.data[i + 2] != b.data[i + 2]) {
            memtrue = false;
            break;
        }
    }
    // // if (simpletrue != memtrue) {
    // // 	debugger;
    // // }
    return memtrue;
}


/***/ },

/***/ "./types/itemApi.ts"
/*!**************************!*\
  !*** ./types/itemApi.ts ***!
  \**************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   flushQueue: () => (/* binding */ flushQueue),
/* harmony export */   getAllItems: () => (/* binding */ getAllItems),
/* harmony export */   getItemApiBase: () => (/* binding */ getItemApiBase),
/* harmony export */   isApiAvailable: () => (/* binding */ isApiAvailable),
/* harmony export */   isLocal: () => (/* binding */ isLocal),
/* harmony export */   lookupItemByPHash: () => (/* binding */ lookupItemByPHash),
/* harmony export */   queueItem: () => (/* binding */ queueItem),
/* harmony export */   setItemApiBase: () => (/* binding */ setItemApiBase),
/* harmony export */   setLocal: () => (/* binding */ setLocal),
/* harmony export */   setProduction: () => (/* binding */ setProduction)
/* harmony export */ });
// Item API Client - connects to server for item persistence
const PRODUCTION_API_BASE = "https://www.techpure.dev/api";
const LOCAL_API_BASE = "http://localhost:42069/api";
let apiBase = PRODUCTION_API_BASE;
function setItemApiBase(url) { apiBase = url.replace(/\/$/, ""); }
function getItemApiBase() { return apiBase; }
function setLocal() { setItemApiBase(LOCAL_API_BASE); }
function setProduction() { setItemApiBase(PRODUCTION_API_BASE); }
function isLocal() { return apiBase === LOCAL_API_BASE; }
// Batch queue for debounced persistence
const batchQueue = [];
let flushTimer = null;
const DEBOUNCE_MS = 2000;
const BATCH_SIZE = 10;
function queueItem(item) {
    if (!item.pHash || item.pHash.length !== 32)
        return;
    // Deduplicate
    if (batchQueue.some(q => q.pHash === item.pHash))
        return;
    batchQueue.push(item);
    if (batchQueue.length >= BATCH_SIZE) {
        flushQueue();
    }
    else if (!flushTimer) {
        flushTimer = setTimeout(flushQueue, DEBOUNCE_MS);
    }
}
async function flushQueue() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (batchQueue.length === 0)
        return;
    const batch = batchQueue.splice(0, BATCH_SIZE);
    try {
        const response = await fetch(`${apiBase}/items/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch }),
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            console.warn(`[ItemApi] Batch failed: ${response.status}`);
        }
    }
    catch (e) {
        console.warn("[ItemApi] Batch persist failed:", e);
    }
    // If more items queued, schedule next flush
    if (batchQueue.length > 0) {
        flushTimer = setTimeout(flushQueue, DEBOUNCE_MS);
    }
}
async function lookupItemByPHash(pHash) {
    try {
        const response = await fetch(`${apiBase}/items/${encodeURIComponent(pHash)}`, {
            signal: AbortSignal.timeout(2000),
        });
        if (!response.ok)
            return null;
        return await response.json();
    }
    catch {
        return null;
    }
}
async function isApiAvailable() {
    try {
        const response = await fetch(`${apiBase}/items?limit=1`, {
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
async function getAllItems(limit = 500) {
    try {
        const response = await fetch(`${apiBase}/items?limit=${limit}`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok)
            return [];
        const result = await response.json();
        return result.items || [];
    }
    catch {
        return [];
    }
}


/***/ },

/***/ "./gl sync recursive"
/*!******************!*\
  !*** ./gl/ sync ***!
  \******************/
(module) {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = "./gl sync recursive";
module.exports = webpackEmptyContext;

/***/ }

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["vendor-react"], () => (__webpack_exec__("./app/entrance/index.tsx")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);
//# sourceMappingURL=main.bundle.js.map