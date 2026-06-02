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

/***/ "./app/App.tsx"
/*!*********************!*\
  !*** ./app/App.tsx ***!
  \*********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _map_MapCenter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./map/MapCenter */ "./app/map/MapCenter.tsx");
/* harmony import */ var _components_MarkerPanel__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/MarkerPanel */ "./app/components/MarkerPanel.tsx");
/* harmony import */ var _App_css__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./App.css */ "./app/App.css");




const App = () => {
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "app-container" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_map_MapCenter__WEBPACK_IMPORTED_MODULE_1__["default"], null),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_MarkerPanel__WEBPACK_IMPORTED_MODULE_2__["default"], null)));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (App);


/***/ },

/***/ "./app/components/MarkerPanel.tsx"
/*!****************************************!*\
  !*** ./app/components/MarkerPanel.tsx ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconCheck.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconDownload.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconEyeOff.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconEye.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconPencil.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconPlus.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconTrash.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconUpload.mjs");
/* harmony import */ var _tabler_icons_react__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @tabler/icons-react */ "../node_modules/@tabler/icons-react/dist/esm/icons/IconX.mjs");
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");
/* harmony import */ var _state_useVisibleMarkers__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../state/useVisibleMarkers */ "./state/useVisibleMarkers.ts");
/* harmony import */ var _state_markerStore__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../../state/markerStore */ "./state/markerStore.ts");
/* harmony import */ var _gl_overlayManager__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../../gl/overlayManager */ "./gl/overlayManager.ts");






const MarkerPanel = () => {
    const panelOpen = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.ui.panelOpen);
    const followPlayer = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.ui.followPlayer);
    const clickToAddMode = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.ui.clickToAddMode);
    const showGrid = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.ui.showGrid);
    const showOverlayGrid = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.ui.showOverlayGrid);
    const showOverlayCollision = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.ui.showOverlayCollision);
    const floor = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.selection.floor);
    const groups = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.groups);
    const activeGroupId = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.selection.activeGroupId);
    const activeGroup = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s, d) => d.activeGroup());
    const markers = (0,_state_useVisibleMarkers__WEBPACK_IMPORTED_MODULE_11__.useVisibleMarkers)();
    const playerX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.playerPosition?.x ?? null);
    const playerY = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.playerPosition?.y ?? null);
    const playerFloor = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.playerPosition?.floor ?? null);
    const totalMarkers = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.markers.length);
    const isInInstance = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s, d) => d.isInInstance());
    const instanceLabel = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s, d) => d.currentInstanceLabel());
    const instanceEntranceKey = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.entranceKey ?? '');
    const instanceEntranceX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.entranceX ?? null);
    const instanceEntranceZ = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.entranceZ ?? null);
    const instanceEntryTileX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.entryTileX ?? null);
    const instanceEntryTileZ = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.entryTileZ ?? null);
    const instanceMinX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.minTileX ?? null);
    const instanceMinZ = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.minTileZ ?? null);
    const instanceMaxX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.maxTileX ?? null);
    const instanceMaxZ = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.currentInstance?.maxTileZ ?? null);
    const instanceMarkerCount = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => s.markers.filter(m => m.instanceContext != null).length);
    const instanceMatchingCount = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => {
        const key = s.currentInstance?.entranceKey;
        if (!key)
            return 0;
        return s.markers.filter(m => m.instanceContext?.entranceKey === key).length;
    });
    const storedEntranceKeys = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_10__.useMarkerSelector)((s) => {
        const keys = new Set();
        for (const m of s.markers) {
            if (m.instanceContext?.entranceKey)
                keys.add(m.instanceContext.entranceKey);
        }
        return Array.from(keys).join(' | ') || '(none)';
    });
    const [newGroupName, setNewGroupName] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("");
    const [showGroupForm, setShowGroupForm] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [editingGroup, setEditingGroup] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [editGroupName, setEditGroupName] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("");
    const [showMarkerList, setShowMarkerList] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false);
    const [instanceLabelInput, setInstanceLabelInput] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)("");
    if (!panelOpen)
        return null;
    const handleFloorChange = (newFloor) => {
        _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setSelection({ floor: newFloor });
    };
    const handleAddGroup = () => {
        if (!newGroupName.trim())
            return;
        _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.addGroup(newGroupName.trim());
        setNewGroupName("");
        setShowGroupForm(false);
    };
    const startEditingGroup = () => {
        if (activeGroup) {
            setEditingGroup(true);
            setEditGroupName(activeGroup.name);
        }
    };
    const saveGroupName = () => {
        if (activeGroup && editGroupName.trim()) {
            _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.updateGroup(activeGroup.id, { name: editGroupName.trim() });
        }
        setEditingGroup(false);
        setEditGroupName("");
    };
    const cancelEditingGroup = () => {
        setEditingGroup(false);
        setEditGroupName("");
    };
    const handleExport = () => {
        const data = _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.exportMarkers();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tile-markers.json";
        a.click();
        URL.revokeObjectURL(url);
    };
    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file)
                return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                    // Direct marker array
                    _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.importMarkers(data);
                }
                else if (data.meshMappings || (data.offset && data.offset.dLng !== undefined)) {
                    // Instance Tile Mapper JSON — store mesh mappings for auto-offset
                    if (data.meshMappings && data.meshMappings.length > 0) {
                        _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setMeshMappings(data.meshMappings);
                        console.log(`[MarkerPanel] Loaded ${data.meshMappings.length} mesh→public mappings`);
                    }
                    // Also store legacy offset if present (valid for current session only)
                    const off = data.offset ? { dLng: data.offset.dLng, dLat: data.offset.dLat } : null;
                    if (off) {
                        (0,_gl_overlayManager__WEBPACK_IMPORTED_MODULE_13__.setInstanceOffset)(off);
                        console.log(`[MarkerPanel] Legacy offset loaded: dLng=${off.dLng}, dLat=${off.dLat}`);
                    }
                    // Save entrance tiles as known instances (for auto-offset on re-entry)
                    if (data.entranceTiles && Array.isArray(data.entranceTiles) && off) {
                        for (const tile of data.entranceTiles) {
                            const entranceKey = `${tile.lng},${tile.lat}`;
                            _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.saveKnownInstance(entranceKey, 0, 0, '', off);
                        }
                        console.log(`[MarkerPanel] Saved ${data.entranceTiles.length} entrance tile(s) with offset`);
                    }
                    // Create tile markers from captured mesh chunks
                    const markers = [];
                    const floorVal = data.floor ?? 0;
                    let id = 0;
                    // Reference point
                    if (data.publicReference) {
                        markers.push({
                            id: `itm-ref-${id++}`,
                            x: data.publicReference.lng,
                            y: data.publicReference.lat,
                            floor: floorVal,
                            color: '#ff4444',
                            label: 'REF (spawn)',
                        });
                    }
                    // Mesh chunk borders (converted to public coords via offset)
                    if (data.meshData?.chunks) {
                        for (const chunk of data.meshData.chunks) {
                            const pubLngMin = chunk.tileRange.lngMin + data.offset.dLng;
                            const pubLngMax = chunk.tileRange.lngMax + data.offset.dLng;
                            const pubLatMin = chunk.tileRange.latMin + data.offset.dLat;
                            const pubLatMax = chunk.tileRange.latMax + data.offset.dLat;
                            const label = `${chunk.chunkX},${chunk.chunkZ}`;
                            // Chunk border markers (every 4 tiles)
                            for (let x = pubLngMin; x < pubLngMax; x += 4) {
                                markers.push({ id: `itm-b-${id++}`, x, y: pubLatMin, floor: floorVal, color: '#00d4ff', label });
                                markers.push({ id: `itm-b-${id++}`, x, y: pubLatMax - 1, floor: floorVal, color: '#00d4ff', label });
                            }
                            for (let z = pubLatMin + 4; z < pubLatMax - 1; z += 4) {
                                markers.push({ id: `itm-b-${id++}`, x: pubLngMin, y: z, floor: floorVal, color: '#00d4ff', label });
                                markers.push({ id: `itm-b-${id++}`, x: pubLngMax - 1, y: z, floor: floorVal, color: '#00d4ff', label });
                            }
                            // Chunk center
                            markers.push({
                                id: `itm-c-${id++}`,
                                x: Math.floor((pubLngMin + pubLngMax) / 2),
                                y: Math.floor((pubLatMin + pubLatMax) / 2),
                                floor: floorVal,
                                color: '#ffaa00',
                                label: `C ${label}`,
                            });
                        }
                    }
                    if (markers.length > 0) {
                        _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.importMarkers(markers);
                        console.log(`[MarkerPanel] Created ${markers.length} markers from mesh data`);
                    }
                    // Set floor to match the offset data
                    if (data.floor !== undefined) {
                        _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setSelection({ floor: data.floor });
                    }
                }
            }
            catch (err) {
                console.error("Failed to import:", err);
            }
        };
        input.click();
    };
    const handleImportOffset = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file)
                return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                console.log("[MarkerPanel] Offset file keys:", Object.keys(data));
                // Try multiple formats
                let off = null;
                if (data.offset && typeof data.offset.dLng === 'number') {
                    off = { dLng: data.offset.dLng, dLat: data.offset.dLat };
                }
                else if (typeof data.dLng === 'number') {
                    off = { dLng: data.dLng, dLat: data.dLat };
                }
                if (off) {
                    (0,_gl_overlayManager__WEBPACK_IMPORTED_MODULE_13__.setInstanceOffset)(off);
                    console.log(`[MarkerPanel] Instance offset loaded: dLng=${off.dLng}, dLat=${off.dLat}`);
                    // Save entrance tiles as known instances
                    if (data.entranceTiles && Array.isArray(data.entranceTiles)) {
                        for (const tile of data.entranceTiles) {
                            const entranceKey = `${tile.lng},${tile.lat}`;
                            _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.saveKnownInstance(entranceKey, 0, 0, '', off);
                        }
                        console.log(`[MarkerPanel] Saved ${data.entranceTiles.length} entrance tile(s) with offset`);
                    }
                }
                else {
                    console.warn("[MarkerPanel] No offset found in file. Data:", JSON.stringify(data).substring(0, 200));
                }
            }
            catch (err) {
                console.error("Failed to import offset:", err);
            }
        };
        input.click();
    };
    const handleClearOffset = () => {
        (0,_gl_overlayManager__WEBPACK_IMPORTED_MODULE_13__.setInstanceOffset)(null);
    };
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "marker-panel marker-panel-compact" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "panel-header" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "panel-title" }, "Tile Markers"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "marker-count-header" },
                markers.length,
                "/",
                totalMarkers)),
        playerX !== null && playerY !== null && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "player-coords-compact" },
            playerX,
            ", ",
            playerY,
            " F",
            playerFloor ?? 0)),
        isInInstance && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "instance-indicator" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "instance-badge" }, "INSTANCE"),
            instanceLabel ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "instance-label" }, instanceLabel)) : instanceEntranceKey ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "instance-label-form" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", className: "compact-input", placeholder: "Name this instance...", value: instanceLabelInput, onChange: (e) => setInstanceLabelInput(e.target.value), onKeyDown: (e) => {
                        if (e.key === "Enter" && instanceLabelInput.trim()) {
                            _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.labelCurrentInstance(instanceLabelInput.trim());
                            setInstanceLabelInput("");
                        }
                        if (e.key === "Escape")
                            setInstanceLabelInput("");
                    }, autoFocus: true }),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: () => {
                        if (instanceLabelInput.trim()) {
                            _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.labelCurrentInstance(instanceLabelInput.trim());
                            setInstanceLabelInput("");
                        }
                    }, title: "Save instance name" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_1__["default"], { size: 12 })))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "instance-detecting" }, "Detecting...")))),
        isInInstance && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "instance-debug", style: { fontSize: '10px', padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', margin: '4px 8px', fontFamily: 'monospace', color: '#aaa' } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { color: '#ff0', fontWeight: 'bold', marginBottom: '2px' } }, "Instance Debug"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Entrance: (",
                instanceEntranceX,
                ", ",
                instanceEntranceZ,
                ")"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Entry Tile: (",
                instanceEntryTileX,
                ", ",
                instanceEntryTileZ,
                ")"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Bounds: (",
                instanceMinX,
                ",",
                instanceMinZ,
                ") - (",
                instanceMaxX,
                ",",
                instanceMaxZ,
                ")"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Entrance Key: ",
                instanceEntranceKey || '(none)'),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Stored Keys: ",
                storedEntranceKeys),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Selection Floor: ",
                floor),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Player Floor: ",
                playerFloor ?? '?'),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Instance markers (total): ",
                instanceMarkerCount),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Instance markers (matching key): ",
                instanceMatchingCount),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                "Visible on map: ",
                markers.length),
            markers.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2px' } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { color: '#0ff', fontSize: '9px' } }, "Resolved marker coords:"),
                markers.slice(0, 5).map((m, i) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: i, style: { fontSize: '9px' } },
                    "#",
                    i,
                    ": abs=(",
                    m.x,
                    ", ",
                    m.y,
                    ") f=",
                    m.floor,
                    " ",
                    m.instanceContext ? `rel=(${m.x - (instanceEntryTileX ?? 0)}, ${m.y - (instanceEntryTileZ ?? 0)})` : 'main'))))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: '2px', color: '#f80' } },
                "Player at: (",
                playerX,
                ", ",
                playerY,
                ")"))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-section" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-row" }, showGroupForm ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", className: "compact-input", placeholder: "Group name", value: newGroupName, onChange: (e) => setNewGroupName(e.target.value), onKeyDown: (e) => {
                        if (e.key === "Enter")
                            handleAddGroup();
                        if (e.key === "Escape")
                            setShowGroupForm(false);
                    }, autoFocus: true }),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: handleAddGroup, title: "Add" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_1__["default"], { size: 12 })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: () => setShowGroupForm(false), title: "Cancel" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_9__["default"], { size: 12 })))) : editingGroup ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", className: "compact-input", value: editGroupName, onChange: (e) => setEditGroupName(e.target.value), onKeyDown: (e) => {
                        if (e.key === "Enter")
                            saveGroupName();
                        if (e.key === "Escape")
                            cancelEditingGroup();
                    }, autoFocus: true }),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: saveGroupName, title: "Save" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_1__["default"], { size: 12 })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: cancelEditingGroup, title: "Cancel" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_9__["default"], { size: 12 })))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("select", { className: "group-dropdown", value: activeGroupId || "default", onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setSelection({ activeGroupId: e.target.value }) }, groups.map((group) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("option", { key: group.id, value: group.id },
                    group.name,
                    " ",
                    !group.visible && "(H)")))),
                activeGroup && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "color", className: "compact-color", value: activeGroup.color, onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.updateGroup(activeGroup.id, { color: e.target.value }), title: "Color" })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: () => setShowGroupForm(true), title: "Add Group" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_6__["default"], { size: 12 })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: startEditingGroup, title: "Rename" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_5__["default"], { size: 12 })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn", onClick: () => activeGroup && _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.toggleGroupVisibility(activeGroup.id), title: activeGroup?.visible ? "Hide" : "Show" }, activeGroup?.visible ? react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_4__["default"], { size: 12 }) : react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_3__["default"], { size: 12 })),
                activeGroupId !== "default" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn danger", onClick: () => activeGroupId && _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.removeGroup(activeGroupId), title: "Delete Group" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_7__["default"], { size: 12 }))))))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-section" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "floor-selector compact" }, [-1, 0, 1, 2, 3].map((f) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { key: f, className: floor === f ? "active" : "", onClick: () => handleFloorChange(f) }, f))))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-section" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-row toggles" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { className: "compact-toggle" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: clickToAddMode, onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setUi({ clickToAddMode: e.target.checked }) }),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "Add")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { className: "compact-toggle" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: followPlayer, onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setUi({ followPlayer: e.target.checked }) }),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "Follow")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { className: "compact-toggle" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: showGrid, onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setUi({ showGrid: e.target.checked }) }),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "Grid")))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-section" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-row toggles" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { className: "compact-toggle" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: showOverlayGrid, onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setUi({ showOverlayGrid: e.target.checked }) }),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "GL Grid")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { className: "compact-toggle" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: showOverlayCollision, onChange: (e) => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.setUi({ showOverlayCollision: e.target.checked }) }),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, "Collision")))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-section" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn-full", onClick: () => setShowMarkerList(!showMarkerList) },
                showMarkerList ? "Hide" : "Show",
                " Markers (",
                markers.length,
                ")"),
            showMarkerList && markers.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "marker-list-compact" }, markers.map((marker) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: marker.id, className: "marker-item-compact" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "color-dot-small", style: { backgroundColor: marker.color } }),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { className: "coords-compact" },
                    marker.x,
                    ", ",
                    marker.y),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn danger", onClick: () => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.removeMarker(marker.id), title: "Delete" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_7__["default"], { size: 10 })))))))),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-section" },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "compact-row actions" },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn-action", onClick: handleExport, title: "Export" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_2__["default"], { size: 12 }),
                    " Export"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn-action", onClick: handleImport, title: "Import markers or offset" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_8__["default"], { size: 12 }),
                    " Import"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn-action", onClick: handleImportOffset, title: "Load instance offset from Instance Tile Mapper" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_8__["default"], { size: 12 }),
                    " Offset"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn-action", onClick: handleClearOffset, title: "Clear instance offset" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_9__["default"], { size: 12 }),
                    " Clr Offset"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { className: "compact-btn-action danger", onClick: () => _state_markerStore__WEBPACK_IMPORTED_MODULE_12__.MarkerStore.clearMarkers(floor, activeGroupId), title: "Clear markers on this floor" },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_tabler_icons_react__WEBPACK_IMPORTED_MODULE_7__["default"], { size: 12 }),
                    " Clear")))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MarkerPanel);


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
/* harmony import */ var _state_markerStore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../state/markerStore */ "./state/markerStore.ts");
/* harmony import */ var _App__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../App */ "./app/App.tsx");
/* harmony import */ var _gl_overlayManager__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../gl/overlayManager */ "./gl/overlayManager.ts");




// Import overlay manager - it handles native detection internally

async function bootstrap() {
    // Initialize the marker store (loads persisted state)
    await _state_markerStore__WEBPACK_IMPORTED_MODULE_2__.MarkerStore.initialize();
    // Start overlay manager if native addon is available
    if (_gl_overlayManager__WEBPACK_IMPORTED_MODULE_4__.isNativeAvailable()) {
        console.log("[Bootstrap] Native addon available, starting overlay manager...");
        _gl_overlayManager__WEBPACK_IMPORTED_MODULE_4__.startOverlayManager();
    }
    else {
        console.log("[Bootstrap] Native addon not available - player tracking disabled");
    }
    const rootEl = document.getElementById("root");
    if (!rootEl)
        throw new Error("Missing #root element");
    react_dom_client__WEBPACK_IMPORTED_MODULE_1__.createRoot(rootEl).render(react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_App__WEBPACK_IMPORTED_MODULE_3__["default"], null));
}
void bootstrap();


/***/ },

/***/ "./app/map/FollowPlayerHandler.tsx"
/*!*****************************************!*\
  !*** ./app/map/FollowPlayerHandler.tsx ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/hooks.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! leaflet */ "../node_modules/leaflet/dist/leaflet-src.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(leaflet__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");
/* harmony import */ var _utils_mapFunctions__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils/mapFunctions */ "./utils/mapFunctions.ts");





const FollowPlayerHandler = () => {
    const map = (0,react_leaflet__WEBPACK_IMPORTED_MODULE_1__.useMap)();
    const followPlayer = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.ui.followPlayer);
    // Subscribe to primitive position fields to avoid re-renders from object ref changes
    const playerX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.playerPosition?.x ?? null);
    const playerY = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.playerPosition?.y ?? null);
    const lastPositionRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        if (!followPlayer || playerX === null || playerY === null)
            return;
        // Check if position actually changed
        const last = lastPositionRef.current;
        if (last && last.x === playerX && last.y === playerY) {
            return;
        }
        lastPositionRef.current = { x: playerX, y: playerY };
        // Pan to player position
        const [lat, lng] = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_4__.gameToLatLng)(playerX, playerY);
        const target = [lat + 0.5, lng + 0.5];
        // Check if target is within current maxBounds before panning
        // (avoids clamping when MapBoundsHandler hasn't expanded bounds yet)
        const maxBounds = map.options.maxBounds;
        if (maxBounds) {
            const bounds = leaflet__WEBPACK_IMPORTED_MODULE_2__.latLngBounds(maxBounds);
            if (!bounds.contains(target)) {
                // Target outside current bounds - skip this pan, MapBoundsHandler will handle it
                return;
            }
        }
        map.panTo(target, {
            animate: true,
            duration: 0.3,
        });
    }, [map, followPlayer, playerX, playerY]);
    return null;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (FollowPlayerHandler);


/***/ },

/***/ "./app/map/InstanceGridLayer.tsx"
/*!***************************************!*\
  !*** ./app/map/InstanceGridLayer.tsx ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/hooks.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! leaflet */ "../node_modules/leaflet/dist/leaflet-src.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(leaflet__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");




/**
 * Renders a dark grid background for instance space.
 * Shows chunk boundaries, tile grid, and coordinate labels.
 * Also highlights detected floor chunks from the instance detector.
 */
const InstanceGridLayer = () => {
    const map = (0,react_leaflet__WEBPACK_IMPORTED_MODULE_1__.useMap)();
    // Subscribe to individual primitive fields to avoid effect re-runs from object ref changes
    const isInstance = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.isInstance ?? false);
    const minTileX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.minTileX ?? 0);
    const minTileZ = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.minTileZ ?? 0);
    const maxTileX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.maxTileX ?? 0);
    const maxTileZ = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.maxTileZ ?? 0);
    const instanceLabel = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.label ?? "");
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        const mapRef = map;
        // Dark background with grid
        const GridLayer = leaflet__WEBPACK_IMPORTED_MODULE_2__.GridLayer.extend({
            createTile: function (coords) {
                const tile = document.createElement("canvas");
                const tileSize = this.getTileSize();
                tile.width = tileSize.x;
                tile.height = tileSize.y;
                const ctx = tile.getContext("2d");
                if (!ctx)
                    return tile;
                const zoom = coords.z;
                // Dark background
                ctx.fillStyle = "#0f0f1a";
                ctx.fillRect(0, 0, tileSize.x, tileSize.y);
                // Get the bounds of this tile in game coordinates
                const nwPoint = leaflet__WEBPACK_IMPORTED_MODULE_2__.point(coords.x * tileSize.x, coords.y * tileSize.y);
                const sePoint = leaflet__WEBPACK_IMPORTED_MODULE_2__.point((coords.x + 1) * tileSize.x, (coords.y + 1) * tileSize.y);
                const nwLatLng = mapRef.unproject(nwPoint, zoom);
                const seLatLng = mapRef.unproject(sePoint, zoom);
                const minLng = Math.min(nwLatLng.lng, seLatLng.lng);
                const maxLng = Math.max(nwLatLng.lng, seLatLng.lng);
                const minLat = Math.min(nwLatLng.lat, seLatLng.lat);
                const maxLat = Math.max(nwLatLng.lat, seLatLng.lat);
                // Draw chunk grid (every 64 tiles) - bright cyan lines
                const chunkSize = 64;
                ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
                ctx.lineWidth = 2;
                const startChunkLng = Math.ceil(minLng / chunkSize) * chunkSize;
                const endChunkLng = Math.floor(maxLng / chunkSize) * chunkSize;
                for (let lng = startChunkLng; lng <= endChunkLng; lng += chunkSize) {
                    const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(nwLatLng.lat, lng), zoom);
                    const pixelX = point.x - nwPoint.x;
                    if (pixelX >= 0 && pixelX <= tileSize.x) {
                        ctx.beginPath();
                        ctx.moveTo(pixelX, 0);
                        ctx.lineTo(pixelX, tileSize.y);
                        ctx.stroke();
                    }
                }
                const startChunkLat = Math.ceil(minLat / chunkSize) * chunkSize;
                const endChunkLat = Math.floor(maxLat / chunkSize) * chunkSize;
                for (let lat = startChunkLat; lat <= endChunkLat; lat += chunkSize) {
                    const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(lat, nwLatLng.lng), zoom);
                    const pixelY = point.y - nwPoint.y;
                    if (pixelY >= 0 && pixelY <= tileSize.y) {
                        ctx.beginPath();
                        ctx.moveTo(0, pixelY);
                        ctx.lineTo(tileSize.x, pixelY);
                        ctx.stroke();
                    }
                }
                // Chunk coordinate labels at intersections
                if (zoom >= 2) {
                    ctx.fillStyle = "rgba(0, 200, 255, 0.7)";
                    ctx.font = `${Math.max(9, zoom * 2)}px monospace`;
                    for (let lng = startChunkLng; lng <= endChunkLng; lng += chunkSize) {
                        for (let lat = startChunkLat; lat <= endChunkLat; lat += chunkSize) {
                            const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(lat, lng), zoom);
                            const pixelX = point.x - nwPoint.x;
                            const pixelY = point.y - nwPoint.y;
                            if (pixelX >= 0 && pixelX <= tileSize.x && pixelY >= 0 && pixelY <= tileSize.y) {
                                const chunkX = Math.floor(lng / chunkSize);
                                const chunkZ = Math.floor(lat / chunkSize);
                                ctx.fillText(`${chunkX},${chunkZ}`, pixelX + 3, pixelY - 3);
                            }
                        }
                    }
                }
                // Draw tile grid at higher zoom levels
                if (zoom >= 4) {
                    ctx.strokeStyle = "rgba(80, 80, 120, 0.35)";
                    ctx.lineWidth = 0.5;
                    const startLng = Math.ceil(minLng);
                    const endLng = Math.floor(maxLng);
                    for (let lng = startLng; lng <= endLng; lng++) {
                        const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(nwLatLng.lat, lng), zoom);
                        const pixelX = point.x - nwPoint.x;
                        if (pixelX >= 0 && pixelX <= tileSize.x) {
                            ctx.beginPath();
                            ctx.moveTo(pixelX, 0);
                            ctx.lineTo(pixelX, tileSize.y);
                            ctx.stroke();
                        }
                    }
                    const startLat = Math.ceil(minLat);
                    const endLat = Math.floor(maxLat);
                    for (let lat = startLat; lat <= endLat; lat++) {
                        const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(lat, nwLatLng.lng), zoom);
                        const pixelY = point.y - nwPoint.y;
                        if (pixelY >= 0 && pixelY <= tileSize.y) {
                            ctx.beginPath();
                            ctx.moveTo(0, pixelY);
                            ctx.lineTo(tileSize.x, pixelY);
                            ctx.stroke();
                        }
                    }
                }
                // Ensure canvas tiles don't intercept pointer events
                tile.style.pointerEvents = "none";
                return tile;
            },
        });
        const gridLayer = new GridLayer({
            tileSize: 256,
            opacity: 1,
            className: "instance-grid-layer",
            interactive: false,
        });
        gridLayer.addTo(map);
        return () => {
            map.removeLayer(gridLayer);
        };
    }, [map]);
    // Highlight detected floor chunks as rectangles
    // Dependencies are all primitives to avoid effect re-runs from object ref changes
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        if (!isInstance)
            return;
        // Only draw if we have meaningful bounds (not just player pos)
        if (minTileX === maxTileX && minTileZ === maxTileZ)
            return;
        // Highlight the instance bounding box
        const bounds = [
            [minTileZ, minTileX],
            [maxTileZ, maxTileX],
        ];
        const rect = leaflet__WEBPACK_IMPORTED_MODULE_2__.rectangle(bounds, {
            color: "#ff8800",
            fillColor: "#ff8800",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "8, 4",
        });
        rect.addTo(map);
        // Add label for the instance area
        const label = instanceLabel || "Instance Area";
        const tooltip = leaflet__WEBPACK_IMPORTED_MODULE_2__.tooltip({
            permanent: true,
            direction: "top",
            className: "instance-area-label",
            offset: [0, -20],
        })
            .setLatLng([maxTileZ, (minTileX + maxTileX) / 2])
            .setContent(label);
        tooltip.addTo(map);
        return () => {
            map.removeLayer(rect);
            map.removeLayer(tooltip);
        };
    }, [map, isInstance, minTileX, minTileZ, maxTileX, maxTileZ, instanceLabel]);
    return null;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (InstanceGridLayer);


/***/ },

/***/ "./app/map/MapCenter.tsx"
/*!*******************************!*\
  !*** ./app/map/MapCenter.tsx ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/hooks.js");
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/MapContainer.js");
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/TileLayer.js");
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");
/* harmony import */ var _state_markerStore__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../state/markerStore */ "./state/markerStore.ts");
/* harmony import */ var _utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../utils/mapFunctions */ "./utils/mapFunctions.ts");
/* harmony import */ var _TileMarkerLayer__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./TileMarkerLayer */ "./app/map/TileMarkerLayer.tsx");
/* harmony import */ var _PlayerPositionLayer__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./PlayerPositionLayer */ "./app/map/PlayerPositionLayer.tsx");
/* harmony import */ var _FollowPlayerHandler__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./FollowPlayerHandler */ "./app/map/FollowPlayerHandler.tsx");
/* harmony import */ var _TileGridLayer__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./TileGridLayer */ "./app/map/TileGridLayer.tsx");
/* harmony import */ var _InstanceGridLayer__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./InstanceGridLayer */ "./app/map/InstanceGridLayer.tsx");










const MAP_OPTIONS = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.getMapOptions)();
const MAP_BOUNDS = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.getBounds)();
const INSTANCE_MAP_BOUNDS = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.getInstanceBounds)();
// Click handler component - uses useMapEvents hook inside MapContainer
const MapClickHandler = () => {
    const clickToAddMode = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__.useMarkerSelector)((s) => s.ui.clickToAddMode);
    (0,react_leaflet__WEBPACK_IMPORTED_MODULE_1__.useMapEvents)({
        click: (e) => {
            console.log("[MapClickHandler] Click! latlng=", e.latlng.lat, e.latlng.lng, "clickToAdd=", clickToAddMode);
            if (!clickToAddMode)
                return;
            const { x, y } = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.latLngToGame)(e.latlng.lat, e.latlng.lng);
            console.log("[MapClickHandler] Game coords:", x, y);
            const marker = _state_markerStore__WEBPACK_IMPORTED_MODULE_5__.MarkerStore.addMarker(x, y);
            console.log("[MapClickHandler] Added:", marker?.id, "instance=", !!marker?.instanceContext);
        },
    });
    return null;
};
/**
 * Handles dynamic map bounds and view when entering/leaving instance space.
 * Runs bounds expansion both synchronously during render and in useEffect
 * to ensure it happens regardless of React's effect scheduling.
 */
const MapInstanceHandler = ({ isInstance, rawIsInInstance, hasOffset }) => {
    const map = (0,react_leaflet__WEBPACK_IMPORTED_MODULE_1__.useMap)();
    const lastIsInstance = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(isInstance);
    const lastRawInInstance = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(rawIsInInstance);
    // Synchronous bounds update during render (runs immediately, not deferred)
    if (isInstance !== lastIsInstance.current) {
        console.log("[MapInstanceHandler] SYNC bounds update, isInstance=", isInstance);
        try {
            if (isInstance) {
                map.setMaxBounds(INSTANCE_MAP_BOUNDS);
                const pos = _state_markerStore__WEBPACK_IMPORTED_MODULE_5__.MarkerStore.getState().playerPosition;
                if (pos) {
                    map.setView([pos.y + 0.5, pos.x + 0.5], 4, { animate: false });
                    console.log("[MapInstanceHandler] Panned to", pos.x, pos.y);
                }
            }
            else {
                const pos = _state_markerStore__WEBPACK_IMPORTED_MODULE_5__.MarkerStore.getState().playerPosition;
                if (pos) {
                    const clampedLat = Math.max(0, Math.min(12800, pos.y));
                    const clampedLng = Math.max(0, Math.min(6400, pos.x));
                    map.setView([clampedLat + 0.5, clampedLng + 0.5], map.getZoom(), { animate: false });
                }
                map.setMaxBounds(MAP_BOUNDS);
            }
        }
        catch (e) {
            console.error("[MapInstanceHandler] ERROR:", e);
        }
        lastIsInstance.current = isInstance;
    }
    // Detect entering instance WITH offset (showInstanceMap stays false→false,
    // but we still need to pan to the converted public position)
    if (rawIsInInstance && !lastRawInInstance.current && hasOffset) {
        console.log("[MapInstanceHandler] Entered instance with offset — panning to public position");
        const pos = _state_markerStore__WEBPACK_IMPORTED_MODULE_5__.MarkerStore.getState().playerPosition;
        if (pos) {
            const clampedLat = Math.max(0, Math.min(12800, pos.y));
            const clampedLng = Math.max(0, Math.min(6400, pos.x));
            map.setMaxBounds(MAP_BOUNDS);
            map.setView([clampedLat + 0.5, clampedLng + 0.5], map.getZoom(), { animate: false });
        }
    }
    lastRawInInstance.current = rawIsInInstance;
    // Also run in effect as backup (catches initial mount)
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        console.log("[MapInstanceHandler] effect isInstance=", isInstance);
        try {
            if (isInstance) {
                map.setMaxBounds(INSTANCE_MAP_BOUNDS);
                const pos = _state_markerStore__WEBPACK_IMPORTED_MODULE_5__.MarkerStore.getState().playerPosition;
                if (pos) {
                    map.setView([pos.y + 0.5, pos.x + 0.5], 4, { animate: false });
                }
            }
            else {
                map.setMaxBounds(MAP_BOUNDS);
            }
        }
        catch (e) {
            console.error("[MapInstanceHandler] effect ERROR:", e);
        }
    }, [map, isInstance]);
    return null;
};
const MapCenter = () => {
    const floor = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__.useMarkerSelector)((s) => s.selection.floor);
    const isInInstance = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__.useMarkerSelector)((s) => s.currentInstance?.isInstance ?? false);
    const hasOffset = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__.useMarkerSelector)((s) => s.instanceOffset != null);
    // When offset is active, player coords are converted to public space —
    // show public map tiles and bounds instead of the instance grid.
    const showInstanceMap = isInInstance && !hasOffset;
    console.log("[MapCenter] render isInInstance=", isInInstance, "hasOffset=", hasOffset, "showInstanceMap=", showInstanceMap);
    const layers = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
        const config = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.getTileLayerConfig)(floor);
        return [
            { key: "topdown", ...config.topdown },
            { key: "walls", ...config.walls },
        ];
    }, [floor]);
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { className: "map-container" },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_leaflet__WEBPACK_IMPORTED_MODULE_2__.MapContainer, { crs: MAP_OPTIONS.crs, bounds: MAP_BOUNDS, id: "map", zoom: _utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_ZOOM, minZoom: MAP_OPTIONS.minZoom, maxZoom: MAP_OPTIONS.maxZoom, maxBounds: MAP_OPTIONS.maxBounds, zoomSnap: MAP_OPTIONS.zoomSnap, zoomDelta: MAP_OPTIONS.zoomDelta, zoomControl: false, dragging: true, doubleClickZoom: false, tap: false, center: _utils_mapFunctions__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_CENTER },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(MapInstanceHandler, { isInstance: showInstanceMap, rawIsInInstance: isInInstance, hasOffset: hasOffset }),
            showInstanceMap ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_InstanceGridLayer__WEBPACK_IMPORTED_MODULE_11__["default"], null)) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null, layers.map((layer) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_leaflet__WEBPACK_IMPORTED_MODULE_3__.TileLayer, { key: `${layer.key}-${floor}`, url: layer.url, tileSize: layer.tileSize, maxNativeZoom: layer.maxNativeZoom, minZoom: layer.minZoom, opacity: layer.opacity, className: layer.className, noWrap: true, bounds: MAP_BOUNDS }))))),
            !showInstanceMap && react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_TileGridLayer__WEBPACK_IMPORTED_MODULE_10__["default"], null),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_TileMarkerLayer__WEBPACK_IMPORTED_MODULE_7__["default"], null),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_PlayerPositionLayer__WEBPACK_IMPORTED_MODULE_8__["default"], null),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_FollowPlayerHandler__WEBPACK_IMPORTED_MODULE_9__["default"], null),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(MapClickHandler, null))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MapCenter);


/***/ },

/***/ "./app/map/PlayerPositionLayer.tsx"
/*!*****************************************!*\
  !*** ./app/map/PlayerPositionLayer.tsx ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/CircleMarker.js");
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/Tooltip.js");
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");
/* harmony import */ var _utils_mapFunctions__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../utils/mapFunctions */ "./utils/mapFunctions.ts");




const PlayerPositionLayer = () => {
    // Subscribe to primitive fields to avoid re-renders from object ref changes
    const playerX = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.playerPosition?.x ?? null);
    const playerY = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.playerPosition?.y ?? null);
    const playerFloor = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.playerPosition?.floor ?? null);
    const currentFloor = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.selection.floor);
    const isInInstance = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.currentInstance?.isInstance ?? false);
    // Don't render if no position
    if (playerX === null || playerY === null || playerFloor === null)
        return null;
    // In instance mode, always show player marker; on main map, filter by floor
    if (!isInInstance && playerFloor !== currentFloor)
        return null;
    const [lat, lng] = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_4__.gameToLatLng)(playerX, playerY);
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_leaflet__WEBPACK_IMPORTED_MODULE_1__.CircleMarker, { center: [lat + 0.5, lng + 0.5], radius: 8, pathOptions: {
            color: "#00ff00",
            fillColor: "#00ff00",
            fillOpacity: 0.5,
            weight: 3,
        } },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_leaflet__WEBPACK_IMPORTED_MODULE_2__.Tooltip, { permanent: true, direction: "top", offset: [0, -10] },
            "You: ",
            playerX,
            ", ",
            playerY)));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (PlayerPositionLayer);


/***/ },

/***/ "./app/map/TileGridLayer.tsx"
/*!***********************************!*\
  !*** ./app/map/TileGridLayer.tsx ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/hooks.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! leaflet */ "../node_modules/leaflet/dist/leaflet-src.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(leaflet__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");




/**
 * Renders a grid showing individual tile boundaries
 * Uses map's CRS projection for proper alignment with game coordinates
 */
const TileGridLayer = () => {
    const map = (0,react_leaflet__WEBPACK_IMPORTED_MODULE_1__.useMap)();
    const showGrid = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.ui.showGrid);
    const floor = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_3__.useMarkerSelector)((s) => s.selection.floor);
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        if (!showGrid)
            return;
        // Capture map reference for use in tile creation
        const mapRef = map;
        // Custom GridLayer that draws tile boundaries aligned with game coordinates
        const GridLayer = leaflet__WEBPACK_IMPORTED_MODULE_2__.GridLayer.extend({
            createTile: function (coords) {
                const tile = document.createElement("canvas");
                const tileSize = this.getTileSize();
                tile.width = tileSize.x;
                tile.height = tileSize.y;
                const ctx = tile.getContext("2d");
                if (!ctx)
                    return tile;
                const zoom = coords.z;
                // Only draw grid at zoom level 3 and above for performance
                if (zoom < 3)
                    return tile;
                // Get the bounds of this tile in layer point coordinates
                const nwPoint = leaflet__WEBPACK_IMPORTED_MODULE_2__.point(coords.x * tileSize.x, coords.y * tileSize.y);
                const sePoint = leaflet__WEBPACK_IMPORTED_MODULE_2__.point((coords.x + 1) * tileSize.x, (coords.y + 1) * tileSize.y);
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
                    const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(nwLatLng.lat, lng), zoom);
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
                    const point = mapRef.project(leaflet__WEBPACK_IMPORTED_MODULE_2__.latLng(lat, nwLatLng.lng), zoom);
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
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TileGridLayer);


/***/ },

/***/ "./app/map/TileMarkerLayer.tsx"
/*!*************************************!*\
  !*** ./app/map/TileMarkerLayer.tsx ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/hooks.js");
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/Rectangle.js");
/* harmony import */ var react_leaflet__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-leaflet */ "../node_modules/react-leaflet/lib/Tooltip.js");
/* harmony import */ var _state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../state/useMarkerSelector */ "./state/useMarkerSelector.ts");
/* harmony import */ var _state_useVisibleMarkers__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../state/useVisibleMarkers */ "./state/useVisibleMarkers.ts");
/* harmony import */ var _state_markerStore__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../state/markerStore */ "./state/markerStore.ts");
/* harmony import */ var _utils_mapFunctions__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../utils/mapFunctions */ "./utils/mapFunctions.ts");






// Create a custom pane for markers to ensure they render above grid/capture layers
const MARKER_PANE = "markerPane";
const TileMarkerLayer = () => {
    const map = (0,react_leaflet__WEBPACK_IMPORTED_MODULE_1__.useMap)();
    const markers = (0,_state_useVisibleMarkers__WEBPACK_IMPORTED_MODULE_5__.useVisibleMarkers)();
    const selectedId = (0,_state_useMarkerSelector__WEBPACK_IMPORTED_MODULE_4__.useMarkerSelector)((s) => s.selection.selectedMarkerId);
    // Create custom pane on mount (z-index 650 = above overlayPane's 400)
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
        if (!map.getPane(MARKER_PANE)) {
            map.createPane(MARKER_PANE);
            const pane = map.getPane(MARKER_PANE);
            if (pane) {
                pane.style.zIndex = "650";
            }
        }
    }, [map]);
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null, markers.map((marker) => {
        const [lat, lng] = (0,_utils_mapFunctions__WEBPACK_IMPORTED_MODULE_7__.gameToLatLng)(marker.x, marker.y);
        const bounds = [
            [lat - 0.5, lng - 0.5],
            [lat + 0.5, lng + 0.5],
        ];
        const isSelected = marker.id === selectedId;
        return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_leaflet__WEBPACK_IMPORTED_MODULE_2__.Rectangle, { key: marker.id, bounds: bounds, pane: MARKER_PANE, pathOptions: {
                color: isSelected ? "#ffffff" : marker.color,
                fillColor: marker.color,
                fillOpacity: 0.6,
                weight: isSelected ? 4 : 3,
            }, eventHandlers: {
                click: (e) => {
                    e.originalEvent.stopPropagation();
                    _state_markerStore__WEBPACK_IMPORTED_MODULE_6__.MarkerStore.setSelection({ selectedMarkerId: marker.id });
                },
            } }, marker.label && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement(react_leaflet__WEBPACK_IMPORTED_MODULE_3__.Tooltip, { permanent: true, direction: "center", className: "marker-label" }, marker.label))));
    })));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (TileMarkerLayer);


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

/***/ "./gl/heightData.ts"
/*!**************************!*\
  !*** ./gl/heightData.ts ***!
  \**************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CHUNK_SIZE: () => (/* binding */ CHUNK_SIZE),
/* harmony export */   HEIGHT_SCALING: () => (/* binding */ HEIGHT_SCALING),
/* harmony export */   MAX_FLOOR_LEVELS: () => (/* binding */ MAX_FLOOR_LEVELS),
/* harmony export */   TILE_SIZE: () => (/* binding */ TILE_SIZE),
/* harmony export */   clearHeightCache: () => (/* binding */ clearHeightCache),
/* harmony export */   fetchHeightData: () => (/* binding */ fetchHeightData),
/* harmony export */   getHeightAtTile: () => (/* binding */ getHeightAtTile),
/* harmony export */   getHeightAtWorldTile: () => (/* binding */ getHeightAtWorldTile),
/* harmony export */   getTileCornerHeights: () => (/* binding */ getTileCornerHeights),
/* harmony export */   getTileWorldPosition: () => (/* binding */ getTileWorldPosition),
/* harmony export */   preloadArea: () => (/* binding */ preloadArea),
/* harmony export */   setHeightCacheEntry: () => (/* binding */ setHeightCacheEntry),
/* harmony export */   tileToChunk: () => (/* binding */ tileToChunk),
/* harmony export */   tileToLocal: () => (/* binding */ tileToLocal),
/* harmony export */   tileToWorld: () => (/* binding */ tileToWorld)
/* harmony export */ });
/**
 * Height data fetcher for terrain-aware overlays
 * Handles RS3 world coordinate system and terrain heights
 */
// RS3 World Constants
const CHUNK_SIZE = 64; // Tiles per chunk
const TILE_SIZE = 512; // World units per tile
const HEIGHT_SCALING = TILE_SIZE / 32; // Height scaling factor
const MAX_FLOOR_LEVELS = 4; // Floor levels 0-3
const HEIGHT_DATA_ENDPOINT = "https://runeapps.org/s3/map4/live/";
const HEIGHT_DATA_FALLBACK = "https://runeapps.org/s3/map4/1764321618/";
// Cache for loaded height data
const heightCache = new Map();
const pendingFetches = new Map();
function getCacheKey(chunkX, chunkZ, level) {
    return `${level}/${chunkX}-${chunkZ}`;
}
/**
 * Fetch height data for a chunk
 */
async function fetchHeightData(chunkX, chunkZ, level = 0) {
    const key = getCacheKey(chunkX, chunkZ, level);
    // Check cache first — works for both normal and instance chunks.
    // Instance height data is populated by instanceHeightData.ts via setHeightCacheEntry().
    if (heightCache.has(key)) {
        return heightCache.get(key) ?? null;
    }
    if (pendingFetches.has(key)) {
        return pendingFetches.get(key);
    }
    // Instance chunks (X >= 100) have no static height data on runeapps.org.
    // Return null; the cache will be populated asynchronously when the instance
    // floor stream captures vertex data (see instanceHeightData.ts).
    if (chunkX >= 100) {
        return null;
    }
    const fetchPromise = (async () => {
        try {
            const path = `heightmesh-${level}/${chunkX}-${chunkZ}.bin`;
            const url = `${HEIGHT_DATA_ENDPOINT}${path}`;
            console.log(`[HeightData] Fetching ${url}`);
            let res = await fetch(url);
            if (res.status === 403) {
                const fallbackUrl = `${HEIGHT_DATA_FALLBACK}${path}`;
                console.log(`[HeightData] /live/ returned 403, trying versioned fallback: ${fallbackUrl}`);
                res = await fetch(fallbackUrl);
            }
            if (!res.ok) {
                console.warn(`[HeightData] Failed to fetch height data for chunk ${chunkX},${chunkZ}: ${res.status}`);
                heightCache.set(key, null);
                return null;
            }
            const data = new Uint16Array(await res.arrayBuffer());
            heightCache.set(key, data);
            return data;
        }
        catch (e) {
            console.error(`[HeightData] Error fetching height data:`, e);
            heightCache.set(key, null);
            return null;
        }
        finally {
            pendingFetches.delete(key);
        }
    })();
    pendingFetches.set(key, fetchPromise);
    return fetchPromise;
}
/**
 * Convert tile coordinates to chunk coordinates
 */
function tileToChunk(tileX, tileZ) {
    return {
        chunkX: Math.floor(tileX / CHUNK_SIZE),
        chunkZ: Math.floor(tileZ / CHUNK_SIZE)
    };
}
/**
 * Convert tile coordinates to local position within a chunk
 */
function tileToLocal(tileX, tileZ) {
    return {
        localX: ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
        localZ: ((tileZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
    };
}
/**
 * Convert tile coordinates to world coordinates
 */
function tileToWorld(tileX, tileZ) {
    return {
        worldX: tileX * TILE_SIZE,
        worldZ: tileZ * TILE_SIZE
    };
}
/**
 * Get terrain height at a specific tile position
 */
function getHeightAtTile(heightData, localX, localZ, subX = 0.5, subZ = 0.5) {
    // Each tile has 5 values: 4 corner heights + flags
    const tileIndex = (localX + localZ * CHUNK_SIZE) * 5;
    if (tileIndex < 0 || tileIndex + 4 >= heightData.length) {
        return 0;
    }
    // Bilinear interpolation of the 4 corner heights
    const y00 = heightData[tileIndex + 0] * HEIGHT_SCALING * (1 - subX) * (1 - subZ);
    const y01 = heightData[tileIndex + 1] * HEIGHT_SCALING * subX * (1 - subZ);
    const y10 = heightData[tileIndex + 2] * HEIGHT_SCALING * (1 - subX) * subZ;
    const y11 = heightData[tileIndex + 3] * HEIGHT_SCALING * subX * subZ;
    return y00 + y01 + y10 + y11;
}
/**
 * Get all 4 corner heights for a tile
 */
function getTileCornerHeights(heightData, localX, localZ) {
    const tileIndex = (localX + localZ * CHUNK_SIZE) * 5;
    if (tileIndex < 0 || tileIndex + 4 >= heightData.length) {
        return [0, 0, 0, 0];
    }
    return [
        heightData[tileIndex + 0] * HEIGHT_SCALING,
        heightData[tileIndex + 1] * HEIGHT_SCALING,
        heightData[tileIndex + 2] * HEIGHT_SCALING,
        heightData[tileIndex + 3] * HEIGHT_SCALING
    ];
}
/**
 * Get height at a world tile position (fetches data if needed)
 */
async function getHeightAtWorldTile(tileX, tileZ, level = 0) {
    const { chunkX, chunkZ } = tileToChunk(tileX, tileZ);
    const { localX, localZ } = tileToLocal(tileX, tileZ);
    const heightData = await fetchHeightData(chunkX, chunkZ, level);
    if (!heightData) {
        return 0;
    }
    return getHeightAtTile(heightData, localX, localZ);
}
/**
 * Get full world position (x, y, z) for a tile
 */
async function getTileWorldPosition(tileX, tileZ, level = 0) {
    const { worldX, worldZ } = tileToWorld(tileX, tileZ);
    const y = await getHeightAtWorldTile(tileX, tileZ, level);
    return { x: worldX, y, z: worldZ };
}
/**
 * Clear the height data cache
 */
function clearHeightCache() {
    heightCache.clear();
}
/**
 * Inject height data into the cache from an external source.
 * Used by instanceHeightData.ts to populate height data extracted
 * from GL floor mesh vertices for instance chunks.
 */
function setHeightCacheEntry(chunkX, chunkZ, level, data) {
    const key = getCacheKey(chunkX, chunkZ, level);
    heightCache.set(key, data);
}
/**
 * Preload height data for an area
 */
async function preloadArea(minTileX, minTileZ, maxTileX, maxTileZ, level = 0) {
    const minChunk = tileToChunk(minTileX, minTileZ);
    const maxChunk = tileToChunk(maxTileX, maxTileZ);
    const promises = [];
    for (let cx = minChunk.chunkX; cx <= maxChunk.chunkX; cx++) {
        for (let cz = minChunk.chunkZ; cz <= maxChunk.chunkZ; cz++) {
            promises.push(fetchHeightData(cx, cz, level));
        }
    }
    await Promise.all(promises);
}


/***/ },

/***/ "./gl/instanceDetector.ts"
/*!********************************!*\
  !*** ./gl/instanceDetector.ts ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   INSTANCE_CHUNK_THRESHOLD: () => (/* binding */ INSTANCE_CHUNK_THRESHOLD),
/* harmony export */   INSTANCE_TILE_THRESHOLD: () => (/* binding */ INSTANCE_TILE_THRESHOLD),
/* harmony export */   createInstanceContext: () => (/* binding */ createInstanceContext),
/* harmony export */   getEntranceKey: () => (/* binding */ getEntranceKey),
/* harmony export */   getEntranceTile: () => (/* binding */ getEntranceTile),
/* harmony export */   getEntryTile: () => (/* binding */ getEntryTile),
/* harmony export */   getInstanceBounds: () => (/* binding */ getInstanceBounds),
/* harmony export */   getInstanceOrigin: () => (/* binding */ getInstanceOrigin),
/* harmony export */   getObservedChunkCount: () => (/* binding */ getObservedChunkCount),
/* harmony export */   isInInstanceSpace: () => (/* binding */ isInInstanceSpace),
/* harmony export */   isInstanceChunk: () => (/* binding */ isInstanceChunk),
/* harmony export */   reportFloorChunk: () => (/* binding */ reportFloorChunk),
/* harmony export */   resetInstanceTracking: () => (/* binding */ resetInstanceTracking),
/* harmony export */   setEntranceTile: () => (/* binding */ setEntranceTile),
/* harmony export */   setEntryTile: () => (/* binding */ setEntryTile),
/* harmony export */   updateInstanceBounds: () => (/* binding */ updateInstanceBounds)
/* harmony export */ });
/* harmony import */ var _heightData__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./heightData */ "./gl/heightData.ts");
/**
 * Instance Detection Service
 * Detects when the player is in an RS3 instanced area and tracks
 * entrance position for stable instance identification across sessions.
 *
 * RS3 coordinate space:
 * - Main map: tile X 0-6399 (chunk X 0-99)
 * - Instance space: tile X >= 6400 (chunk X >= 100)
 * - Small instances: 128x128 tiles, Z < 5248
 * - Large instances: 320x320 tiles, Z >= 5248
 *
 * Identification strategy:
 * - When entering an instance, the player's last surface-world position is
 *   recorded as the "entrance tile". This is deterministic (same door/portal
 *   always has the same coords) and used as the stable instance identifier.
 * - The first tile visited inside the instance is the "entry tile", used as
 *   the coordinate origin for relative marker storage.
 * - Floor chunks are still tracked for grid bounds display but NOT for
 *   identification.
 */

// Instance space boundary (tile coordinates)
const INSTANCE_TILE_THRESHOLD = 6400;
// Chunk boundary (INSTANCE_TILE_THRESHOLD / CHUNK_SIZE)
const INSTANCE_CHUNK_THRESHOLD = 100;
// Tracked floor chunk positions in current instance (for grid bounds display)
const instanceFloorChunks = new Set();
// Entrance tile: the player's last surface-world position before entering
let entranceTile = null;
// Entry tile: the first tile the player visits inside the instance (coordinate origin)
let entryTile = null;
/**
 * Check if a tile X coordinate is in instance space
 */
function isInInstanceSpace(tileX) {
    return tileX >= INSTANCE_TILE_THRESHOLD;
}
/**
 * Check if a chunk X coordinate is in instance space
 */
function isInstanceChunk(chunkX) {
    return chunkX >= INSTANCE_CHUNK_THRESHOLD;
}
/**
 * Report a floor chunk observed in the current instance.
 * Called by tileGrid streaming when new floor chunks are detected.
 * Used for grid bounds display only, NOT for identification.
 */
function reportFloorChunk(chunkX, chunkZ) {
    if (!isInstanceChunk(chunkX))
        return;
    const key = `${chunkX},${chunkZ}`;
    if (instanceFloorChunks.has(key))
        return;
    instanceFloorChunks.add(key);
}
/**
 * Set the entrance tile (surface world position before instance entry).
 * This is the stable identifier for the instance.
 */
function setEntranceTile(x, z) {
    entranceTile = { x, z };
    console.log(`[InstanceDetector] Entrance tile set: ${x},${z}`);
}
/**
 * Get the entrance key string ("x,z") for instance identification.
 * Returns null if no entrance tile has been set.
 */
function getEntranceKey() {
    if (!entranceTile)
        return null;
    return `${entranceTile.x},${entranceTile.z}`;
}
/**
 * Get the entrance tile coordinates.
 */
function getEntranceTile() {
    return entranceTile;
}
/**
 * Set the entry tile (first tile visited inside the instance).
 * This is used as the coordinate origin for relative marker storage.
 */
function setEntryTile(x, z) {
    entryTile = { x, z };
    console.log(`[InstanceDetector] Entry tile set: ${x},${z}`);
}
/**
 * Get the entry tile coordinates (coordinate origin inside the instance).
 */
function getEntryTile() {
    return entryTile;
}
/**
 * Get the bounding box origin (min X, min Z) of observed floor chunks.
 * Used for grid display only.
 */
function getInstanceOrigin() {
    if (instanceFloorChunks.size === 0)
        return null;
    let minX = Infinity, minZ = Infinity;
    for (const key of instanceFloorChunks) {
        const [x, z] = key.split(',').map(Number);
        // Convert chunk coords to tile coords
        const tileX = x * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE;
        const tileZ = z * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE;
        if (tileX < minX)
            minX = tileX;
        if (tileZ < minZ)
            minZ = tileZ;
    }
    return { originX: minX, originZ: minZ };
}
/**
 * Get the full bounding box of observed floor chunks in tile coordinates.
 * Used for InstanceGridLayer bounds display.
 */
function getInstanceBounds() {
    if (instanceFloorChunks.size === 0)
        return null;
    let minX = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxZ = -Infinity;
    for (const key of instanceFloorChunks) {
        const [x, z] = key.split(',').map(Number);
        const tileX = x * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE;
        const tileZ = z * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE;
        if (tileX < minX)
            minX = tileX;
        if (tileZ < minZ)
            minZ = tileZ;
        if (tileX + _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE > maxX)
            maxX = tileX + _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE;
        if (tileZ + _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE > maxZ)
            maxZ = tileZ + _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE;
    }
    return { minTileX: minX, minTileZ: minZ, maxTileX: maxX, maxTileZ: maxZ };
}
/**
 * Create an InstanceContext when entering an instance.
 * Uses the entrance tile for identification and entry tile for coordinate origin.
 */
function createInstanceContext(entranceX, entranceZ, entryTileX, entryTileZ) {
    return {
        isInstance: true,
        minTileX: entryTileX,
        minTileZ: entryTileZ,
        maxTileX: entryTileX,
        maxTileZ: entryTileZ,
        entranceX,
        entranceZ,
        entryTileX,
        entryTileZ,
        label: null,
        entranceKey: `${entranceX},${entranceZ}`,
        detectedAt: Date.now(),
    };
}
/**
 * Update an InstanceContext with the latest floor chunk bounds data.
 * Only updates grid bounds, NOT identification fields.
 */
function updateInstanceBounds(ctx) {
    const bounds = getInstanceBounds();
    if (!bounds)
        return ctx;
    return {
        ...ctx,
        minTileX: bounds.minTileX,
        minTileZ: bounds.minTileZ,
        maxTileX: bounds.maxTileX,
        maxTileZ: bounds.maxTileZ,
    };
}
/**
 * Reset instance tracking state (call when leaving an instance)
 */
function resetInstanceTracking() {
    instanceFloorChunks.clear();
    entranceTile = null;
    entryTile = null;
    console.log('[InstanceDetector] Tracking reset');
}
/**
 * Get the number of observed floor chunks
 */
function getObservedChunkCount() {
    return instanceFloorChunks.size;
}


/***/ },

/***/ "./gl/instanceHeightData.ts"
/*!**********************************!*\
  !*** ./gl/instanceHeightData.ts ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   captureInstanceHeights: () => (/* binding */ captureInstanceHeights),
/* harmony export */   clearInstanceHeightCache: () => (/* binding */ clearInstanceHeightCache),
/* harmony export */   extractHeightFromFloorMesh: () => (/* binding */ extractHeightFromFloorMesh),
/* harmony export */   getInstanceChunkBaseHeight: () => (/* binding */ getInstanceChunkBaseHeight),
/* harmony export */   hasInstanceHeightData: () => (/* binding */ hasInstanceHeightData)
/* harmony export */ });
/* harmony import */ var _heightData__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./heightData */ "./gl/heightData.ts");
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _renderprogram__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./renderprogram */ "./gl/renderprogram.ts");
/**
 * Instance Height Data - Extracts terrain height from GL floor mesh vertices
 * for instance areas where static height data from runeapps.org is unavailable.
 *
 * Approach:
 * 1. Capture floor mesh render calls with "vertexarray" feature
 * 2. Read vertex positions from the position attribute buffer
 * 3. Map vertices to tile corners and build a Uint16Array height grid
 *    matching the format from runeapps.org (64x64 tiles, 5 values each)
 * 4. Inject into heightData.ts cache via setHeightCacheEntry() so
 *    fetchHeightData() returns it transparently for instance chunks
 *
 * Fallback: when vertex buffer extraction fails, uses the floor render's
 * model matrix Y as a flat per-chunk height (better than Y=0).
 */



// GL scalar type constants
const GL_FLOAT = 0x1406;
const GL_HALF_FLOAT = 0x140B;
const GL_SHORT = 0x1402;
// Track which instance chunks have been captured (for dedup and cleanup)
const capturedInstanceChunks = new Set();
// Per-chunk base world Y (minimum world Y across all vertices in the chunk)
const instanceChunkBaseHeight = new Map();
function getCacheKey(chunkX, chunkZ) {
    return `${chunkX}-${chunkZ}`;
}
/**
 * Check if height data has already been captured for an instance chunk
 */
function hasInstanceHeightData(chunkX, chunkZ) {
    return capturedInstanceChunks.has(getCacheKey(chunkX, chunkZ));
}
/**
 * Get the base world Y height for an instance chunk (minimum world Y across all vertices).
 * Returns null if the chunk has not been captured yet.
 */
function getInstanceChunkBaseHeight(chunkX, chunkZ) {
    return instanceChunkBaseHeight.get(getCacheKey(chunkX, chunkZ)) ?? null;
}
/**
 * Create a flat height grid with a uniform height value derived from the model matrix Y.
 * Used as fallback when vertex buffer extraction is not available.
 */
function createFlatHeightData(modelY) {
    const heightData = new Uint16Array(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * 5);
    const rawHeight = 0; // Base height tracked separately in instanceChunkBaseHeight
    for (let tz = 0; tz < _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE; tz++) {
        for (let tx = 0; tx < _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE; tx++) {
            const tileIdx = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 5;
            heightData[tileIdx + 0] = rawHeight; // SW
            heightData[tileIdx + 1] = rawHeight; // SE
            heightData[tileIdx + 2] = rawHeight; // NW
            heightData[tileIdx + 3] = rawHeight; // NE
            // heightData[tileIdx + 4] = 0; // flags
        }
    }
    console.log(`[InstanceHeight] Created flat height data: modelY=${modelY}, rawHeight=${rawHeight} (base height tracked separately)`);
    return heightData;
}
/**
 * Read a float value from a buffer attribute, handling different scalar types.
 */
function readFloat(dv, byteOff, scalarType) {
    if (scalarType === GL_FLOAT) {
        return dv.getFloat32(byteOff, true);
    }
    else if (scalarType === GL_HALF_FLOAT) {
        // Decode IEEE 754 half-precision float
        const bits = dv.getUint16(byteOff, true);
        const sign = (bits >> 15) & 1;
        const exp = (bits >> 10) & 0x1F;
        const frac = bits & 0x3FF;
        if (exp === 0) {
            return (sign ? -1 : 1) * Math.pow(2, -14) * (frac / 1024);
        }
        else if (exp === 31) {
            return frac ? NaN : (sign ? -Infinity : Infinity);
        }
        return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 1024);
    }
    else if (scalarType === GL_SHORT) {
        return dv.getInt16(byteOff, true);
    }
    // Default: treat as float
    return dv.getFloat32(byteOff, true);
}
/**
 * Get byte size of a scalar type
 */
function scalarSize(scalarType) {
    if (scalarType === GL_FLOAT)
        return 4;
    if (scalarType === GL_HALF_FLOAT)
        return 2;
    if (scalarType === GL_SHORT)
        return 2;
    return 4; // default float
}
/**
 * Extract height data from a floor mesh render's vertex buffer.
 * Builds a Uint16Array(64*64*5) matching the format from runeapps.org:
 *   Per tile: [cornerSW, cornerSE, cornerNW, cornerNE, flags]
 *
 * Floor mesh vertices are in chunk-local coordinates:
 *   root = (-CHUNK_SIZE/2 * TILE_SIZE, 0, -CHUNK_SIZE/2 * TILE_SIZE)
 *   i.e. (-16384, 0, -16384)
 *
 * Vertex (vx, vy, vz) maps to tile corner:
 *   cornerX = round((vx - rootx) / TILE_SIZE)  -- range 0..64
 *   cornerZ = round((vz - rootz) / TILE_SIZE)  -- range 0..64
 *   height  = (modelY + vy - baseWorldY) / HEIGHT_SCALING -- stored as Uint16
 */
function extractHeightFromFloorMesh(render, chunkX, chunkZ, modelY) {
    if (!render.vertexArray) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: no vertexArray on render`);
        return null;
    }
    if (!render.vertexArray.attributes || render.vertexArray.attributes.length === 0) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: no attributes in vertexArray`);
        return null;
    }
    const meta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_2__.getProgramMeta)(render.program);
    // Try to find position attribute:
    // 1. Use meta.aPos (matches vertexPosAliases)
    // 2. Fallback: find by name containing "Position" or "Pos"
    // 3. Fallback: use attribute at location 0
    let posAttr = null;
    let posScalarType = GL_FLOAT;
    if (meta.aPos) {
        posAttr = render.vertexArray.attributes.find(a => a.enabled && a.location === meta.aPos.location) ?? null;
        if (posAttr) {
            posScalarType = posAttr.scalartype || GL_FLOAT;
            console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: found position attr via meta.aPos (loc=${meta.aPos.location}, bufLen=${posAttr.buffer?.length ?? 0})`);
        }
    }
    if (!posAttr) {
        // Fallback: try to find any enabled vec3+ attribute at location 0
        posAttr = render.vertexArray.attributes.find(a => a.enabled && a.location === 0 && a.vectorlength >= 3) ?? null;
        if (posAttr) {
            posScalarType = posAttr.scalartype || GL_FLOAT;
            console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: using fallback attr at location 0 (bufLen=${posAttr.buffer?.length ?? 0})`);
        }
    }
    if (!posAttr) {
        // Last fallback: first enabled attribute with vectorlength >= 3
        posAttr = render.vertexArray.attributes.find(a => a.enabled && a.vectorlength >= 3) ?? null;
        if (posAttr) {
            posScalarType = posAttr.scalartype || GL_FLOAT;
            console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: using first vec3+ attr (loc=${posAttr.location}, bufLen=${posAttr.buffer?.length ?? 0})`);
        }
    }
    if (!posAttr) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: no suitable position attribute found`);
        // Log all attributes for diagnosis
        for (const attr of render.vertexArray.attributes) {
            console.log(`[InstanceHeight]   attr: loc=${attr.location} enabled=${attr.enabled} vecLen=${attr.vectorlength} type=${attr.scalartype} bufLen=${attr.buffer?.length ?? 0} stride=${attr.stride} offset=${attr.offset}`);
        }
        return null;
    }
    if (!posAttr.buffer || posAttr.buffer.length === 0) {
        console.warn(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: position attribute buffer is empty (length=${posAttr.buffer?.length ?? 'null'})`);
        console.warn(`[InstanceHeight]   This likely means the "vertexarray" feature does not capture buffer data on this platform.`);
        return null;
    }
    // Height data: 64x64 tiles, 5 Uint16 values each (4 corner heights + flags)
    const heightData = new Uint16Array(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * 5);
    // Track which corners have been set (for gap-filling)
    const cornerSet = new Uint8Array(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * 4);
    const rootx = -(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE / 2) * _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE; // -16384
    const rootz = -(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE / 2) * _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE;
    const sSize = scalarSize(posScalarType);
    const defaultStride = sSize * (posAttr.vectorlength || 3);
    const stride = posAttr.stride || defaultStride;
    const offset = posAttr.offset || 0;
    const dv = new DataView(posAttr.buffer.buffer, posAttr.buffer.byteOffset);
    const numVertices = Math.floor((posAttr.buffer.length - offset) / stride);
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: extracting from ${numVertices} vertices (stride=${stride}, offset=${offset}, scalarType=0x${posScalarType.toString(16)}, bufLen=${posAttr.buffer.length})`);
    // Log first few vertices for debugging
    const logCount = Math.min(3, numVertices);
    for (let i = 0; i < logCount; i++) {
        const byteOff = offset + i * stride;
        if (byteOff + sSize * 3 > posAttr.buffer.length)
            break;
        const vx = readFloat(dv, byteOff, posScalarType);
        const vy = readFloat(dv, byteOff + sSize, posScalarType);
        const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);
        console.log(`[InstanceHeight]   vertex[${i}]: (${vx.toFixed(1)}, ${vy.toFixed(1)}, ${vz.toFixed(1)})`);
    }
    // PASS 1: Find minimum world Y across all vertices in the chunk
    let minWorldY = Infinity;
    for (let i = 0; i < numVertices; i++) {
        const byteOff = offset + i * stride;
        if (byteOff + sSize * 3 > posAttr.buffer.length)
            break;
        const vx = readFloat(dv, byteOff, posScalarType);
        const vy = readFloat(dv, byteOff + sSize, posScalarType);
        const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);
        if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz))
            continue;
        const cornerX = Math.round((vx - rootx) / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
        const cornerZ = Math.round((vz - rootz) / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
        if (cornerX < 0 || cornerX > _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE || cornerZ < 0 || cornerZ > _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE)
            continue;
        const worldY = modelY + vy;
        if (worldY < minWorldY)
            minWorldY = worldY;
    }
    if (!isFinite(minWorldY))
        minWorldY = modelY;
    // Store the base height for this chunk
    const baseWorldY = minWorldY;
    instanceChunkBaseHeight.set(getCacheKey(chunkX, chunkZ), baseWorldY);
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: baseWorldY=${baseWorldY.toFixed(1)} (modelY=${modelY.toFixed(1)}, minVertexY=${(baseWorldY - modelY).toFixed(1)})`);
    // PASS 2: Store heights as non-negative offsets from baseWorldY
    let processedCount = 0;
    let outOfBoundsCount = 0;
    for (let i = 0; i < numVertices; i++) {
        const byteOff = offset + i * stride;
        if (byteOff + sSize * 3 > posAttr.buffer.length)
            break;
        const vx = readFloat(dv, byteOff, posScalarType);
        const vy = readFloat(dv, byteOff + sSize, posScalarType);
        const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);
        if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz))
            continue;
        const cornerX = Math.round((vx - rootx) / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
        const cornerZ = Math.round((vz - rootz) / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
        if (cornerX < 0 || cornerX > _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE || cornerZ < 0 || cornerZ > _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) {
            outOfBoundsCount++;
            continue;
        }
        // Height as offset from base, always non-negative
        const worldY = modelY + vy;
        const heightVal = Math.round((worldY - baseWorldY) / _heightData__WEBPACK_IMPORTED_MODULE_0__.HEIGHT_SCALING);
        const heightU16 = Math.max(0, Math.min(65535, heightVal));
        const setCorner = (tx, tz, cornerIdx) => {
            if (tx < 0 || tx >= _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE || tz < 0 || tz >= _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE)
                return;
            const tileIdx = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 5;
            heightData[tileIdx + cornerIdx] = heightU16;
            cornerSet[(tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 4 + cornerIdx] = 1;
        };
        setCorner(cornerX, cornerZ, 0);
        setCorner(cornerX - 1, cornerZ, 1);
        setCorner(cornerX, cornerZ - 1, 2);
        setCorner(cornerX - 1, cornerZ - 1, 3);
        processedCount++;
    }
    // Fill gaps: for tiles with some but not all corners set, average from set ones
    let fullCoverage = 0;
    let partialCoverage = 0;
    for (let tz = 0; tz < _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE; tz++) {
        for (let tx = 0; tx < _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE; tx++) {
            const base = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 4;
            const tileIdx = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 5;
            let setCount = 0;
            let sum = 0;
            for (let c = 0; c < 4; c++) {
                if (cornerSet[base + c]) {
                    setCount++;
                    sum += heightData[tileIdx + c];
                }
            }
            if (setCount === 4) {
                fullCoverage++;
            }
            else if (setCount > 0) {
                partialCoverage++;
                // Fill missing corners with average of set corners
                const avg = Math.round(sum / setCount);
                for (let c = 0; c < 4; c++) {
                    if (!cornerSet[base + c]) {
                        heightData[tileIdx + c] = avg;
                    }
                }
            }
            // flags word (index 4) stays 0 — no collision data for instances
        }
    }
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: processed ${processedCount} vertices (${outOfBoundsCount} out-of-bounds), ` +
        `${fullCoverage} full tiles, ${partialCoverage} partial tiles`);
    if (fullCoverage + partialCoverage === 0)
        return null;
    return heightData;
}
/**
 * Extract height data from MULTIPLE floor render invocations for the same chunk.
 * RS3 may render stairs, slopes, and terrain features as separate draw calls.
 * This combines all vertices to build a complete height map.
 */
function extractHeightFromMultipleRenders(renders, chunkX, chunkZ, modelYs) {
    // If only one render, delegate to single-render extractor
    if (renders.length === 1) {
        return extractHeightFromFloorMesh(renders[0], chunkX, chunkZ, modelYs[0]);
    }
    const rootx = -(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE / 2) * _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE;
    const rootz = -(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE / 2) * _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE;
    const allVertices = [];
    for (let r = 0; r < renders.length; r++) {
        const render = renders[r];
        const modelY = modelYs[r];
        if (!render.vertexArray?.attributes?.length)
            continue;
        const meta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_2__.getProgramMeta)(render.program);
        // Find position attribute (same logic as extractHeightFromFloorMesh)
        let posAttr = null;
        let posScalarType = GL_FLOAT;
        if (meta.aPos) {
            posAttr = render.vertexArray.attributes.find(a => a.enabled && a.location === meta.aPos.location) ?? null;
        }
        if (!posAttr) {
            posAttr = render.vertexArray.attributes.find(a => a.enabled && a.location === 0 && a.vectorlength >= 3) ?? null;
        }
        if (!posAttr) {
            posAttr = render.vertexArray.attributes.find(a => a.enabled && a.vectorlength >= 3) ?? null;
        }
        if (!posAttr?.buffer?.length)
            continue;
        posScalarType = posAttr.scalartype || GL_FLOAT;
        const sSize = scalarSize(posScalarType);
        const defaultStride = sSize * (posAttr.vectorlength || 3);
        const stride = posAttr.stride || defaultStride;
        const offset = posAttr.offset || 0;
        const dv = new DataView(posAttr.buffer.buffer, posAttr.buffer.byteOffset);
        const numVertices = Math.floor((posAttr.buffer.length - offset) / stride);
        for (let i = 0; i < numVertices; i++) {
            const byteOff = offset + i * stride;
            if (byteOff + sSize * 3 > posAttr.buffer.length)
                break;
            const vx = readFloat(dv, byteOff, posScalarType);
            const vy = readFloat(dv, byteOff + sSize, posScalarType);
            const vz = readFloat(dv, byteOff + sSize * 2, posScalarType);
            if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz))
                continue;
            const cornerX = Math.round((vx - rootx) / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
            const cornerZ = Math.round((vz - rootz) / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
            if (cornerX < 0 || cornerX > _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE || cornerZ < 0 || cornerZ > _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE)
                continue;
            allVertices.push({ cornerX, cornerZ, worldY: modelY + vy });
        }
        console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ} render[${r}]: ${numVertices} vertices (modelY=${modelY.toFixed(0)})`);
    }
    if (allVertices.length === 0)
        return null;
    // Find minimum world Y across ALL vertices from ALL renders
    let minWorldY = Infinity;
    for (const v of allVertices) {
        if (v.worldY < minWorldY)
            minWorldY = v.worldY;
    }
    if (!isFinite(minWorldY))
        minWorldY = modelYs[0];
    const baseWorldY = minWorldY;
    instanceChunkBaseHeight.set(getCacheKey(chunkX, chunkZ), baseWorldY);
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: baseWorldY=${baseWorldY.toFixed(1)} from ${allVertices.length} total vertices across ${renders.length} renders`);
    // Build height grid from all vertices
    const heightData = new Uint16Array(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * 5);
    const cornerSet = new Uint8Array(_heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE * 4);
    let processedCount = 0;
    for (const v of allVertices) {
        const heightVal = Math.round((v.worldY - baseWorldY) / _heightData__WEBPACK_IMPORTED_MODULE_0__.HEIGHT_SCALING);
        const heightU16 = Math.max(0, Math.min(65535, heightVal));
        const setCorner = (tx, tz, cornerIdx) => {
            if (tx < 0 || tx >= _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE || tz < 0 || tz >= _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE)
                return;
            const tileIdx = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 5;
            // Use the HIGHER value when multiple renders provide data for the same corner
            // (prefer the visible floor surface over underground geometry)
            if (!cornerSet[(tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 4 + cornerIdx] || heightData[tileIdx + cornerIdx] < heightU16) {
                heightData[tileIdx + cornerIdx] = heightU16;
                cornerSet[(tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 4 + cornerIdx] = 1;
            }
        };
        setCorner(v.cornerX, v.cornerZ, 0);
        setCorner(v.cornerX - 1, v.cornerZ, 1);
        setCorner(v.cornerX, v.cornerZ - 1, 2);
        setCorner(v.cornerX - 1, v.cornerZ - 1, 3);
        processedCount++;
    }
    // Fill gaps
    let fullCoverage = 0;
    let partialCoverage = 0;
    for (let tz = 0; tz < _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE; tz++) {
        for (let tx = 0; tx < _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE; tx++) {
            const base = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 4;
            const tileIdx = (tx + tz * _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE) * 5;
            let setCount = 0;
            let sum = 0;
            for (let c = 0; c < 4; c++) {
                if (cornerSet[base + c]) {
                    setCount++;
                    sum += heightData[tileIdx + c];
                }
            }
            if (setCount === 4) {
                fullCoverage++;
            }
            else if (setCount > 0) {
                partialCoverage++;
                const avg = Math.round(sum / setCount);
                for (let c = 0; c < 4; c++) {
                    if (!cornerSet[base + c])
                        heightData[tileIdx + c] = avg;
                }
            }
        }
    }
    console.log(`[InstanceHeight] Chunk ${chunkX},${chunkZ}: merged ${processedCount} vertices, ${fullCoverage} full tiles, ${partialCoverage} partial tiles`);
    if (fullCoverage + partialCoverage === 0)
        return null;
    return heightData;
}
/**
 * One-shot capture of instance height data.
 * Records one frame of render calls with vertex buffers and extracts heights
 * for all visible instance floor chunks. Injects results into heightData's cache.
 *
 * When vertex extraction fails (e.g. buffer data not available), falls back
 * to using the floor render's model matrix Y as a flat height per chunk.
 *
 * Returns the number of chunks successfully processed.
 */
async function captureInstanceHeights() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_1__.native)
        return 0;
    try {
        console.log('[InstanceHeight] Starting one-shot vertex capture...');
        const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_1__.native.recordRenderCalls({
            maxframes: 1,
            features: ["vertexarray", "uniforms"]
        });
        console.log(`[InstanceHeight] Recorded ${renders.length} total renders`);
        // Phase 1: Group all instance floor renders by chunk
        const chunkFloorRenders = new Map();
        let floorCount = 0;
        let instanceFloorCount = 0;
        for (const render of renders) {
            if (!render.program)
                continue;
            const isFloor = render.program.inputs.some((i) => i.name === 'aMaterialSettingsSlotXY3');
            if (!isFloor)
                continue;
            floorCount++;
            const modelMatrixUniform = render.program.uniforms.find((u) => u.name === 'uModelMatrix');
            if (!modelMatrixUniform || !render.uniformState)
                continue;
            const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset);
            const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
            const y = view.getFloat32(modelMatrixUniform.snapshotOffset + 13 * 4, true);
            const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);
            const cx = Math.floor(x / _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
            const cz = Math.floor(z / _heightData__WEBPACK_IMPORTED_MODULE_0__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_0__.TILE_SIZE);
            if (cx < 100)
                continue;
            instanceFloorCount++;
            // Skip chunks already captured in a PREVIOUS capture call
            if (hasInstanceHeightData(cx, cz))
                continue;
            const key = getCacheKey(cx, cz);
            if (!chunkFloorRenders.has(key)) {
                chunkFloorRenders.set(key, { renders: [], modelYs: [] });
            }
            const group = chunkFloorRenders.get(key);
            group.renders.push(render);
            group.modelYs.push(y);
        }
        console.log(`[InstanceHeight] ${floorCount} floor renders, ${instanceFloorCount} instance floors, ${chunkFloorRenders.size} chunks to process`);
        // Phase 2: Process each chunk with ALL its floor renders
        let newCount = 0;
        let vertexSuccessCount = 0;
        let fallbackCount = 0;
        for (const [key, { renders: chunkRenders, modelYs }] of chunkFloorRenders) {
            const parts = key.split('-');
            const cx = parseInt(parts[0]);
            const cz = parseInt(parts[1]);
            console.log(`[InstanceHeight] Processing chunk ${cx},${cz} with ${chunkRenders.length} floor render(s)`);
            const heightData = extractHeightFromMultipleRenders(chunkRenders, cx, cz, modelYs);
            if (heightData) {
                (0,_heightData__WEBPACK_IMPORTED_MODULE_0__.setHeightCacheEntry)(cx, cz, 0, heightData);
                capturedInstanceChunks.add(key);
                newCount++;
                vertexSuccessCount++;
            }
            else {
                // Fallback: use first render's model matrix Y
                console.log(`[InstanceHeight] Vertex extraction failed for chunk ${cx},${cz} — using model matrix Y fallback (y=${modelYs[0].toFixed(1)})`);
                const flatData = createFlatHeightData(modelYs[0]);
                instanceChunkBaseHeight.set(key, modelYs[0]);
                (0,_heightData__WEBPACK_IMPORTED_MODULE_0__.setHeightCacheEntry)(cx, cz, 0, flatData);
                capturedInstanceChunks.add(key);
                newCount++;
                fallbackCount++;
            }
        }
        console.log(`[InstanceHeight] Summary: ${floorCount} floor renders, ${instanceFloorCount} instance floors, ` +
            `${vertexSuccessCount} vertex-extracted, ${fallbackCount} fallback-flat, ${newCount} total captured`);
        return newCount;
    }
    catch (e) {
        console.error('[InstanceHeight] Capture failed:', e);
        return 0;
    }
}
/**
 * Clear tracking of captured instance chunks.
 * Note: also clears the entire heightData cache since instance entries
 * are mixed in with it. Called when leaving an instance.
 */
function clearInstanceHeightCache() {
    const size = capturedInstanceChunks.size;
    capturedInstanceChunks.clear();
    instanceChunkBaseHeight.clear();
    // Clear heightData cache to remove stale instance entries.
    // Normal world chunks will be re-fetched on demand.
    (0,_heightData__WEBPACK_IMPORTED_MODULE_0__.clearHeightCache)();
    if (size > 0) {
        console.log(`[InstanceHeight] Cleared ${size} instance height entries`);
    }
}


/***/ },

/***/ "./gl/overlayManager.ts"
/*!******************************!*\
  !*** ./gl/overlayManager.ts ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   forceUpdate: () => (/* binding */ forceUpdate),
/* harmony export */   getInstanceOffset: () => (/* binding */ getInstanceOffset),
/* harmony export */   getLastPlayerPosition: () => (/* binding */ getLastPlayerPosition),
/* harmony export */   isClientReady: () => (/* binding */ isClientReady),
/* harmony export */   isNativeAvailable: () => (/* binding */ isNativeAvailable),
/* harmony export */   setInstanceOffset: () => (/* binding */ setInstanceOffset),
/* harmony export */   startOverlayManager: () => (/* binding */ startOverlayManager),
/* harmony export */   stopOverlayManager: () => (/* binding */ stopOverlayManager)
/* harmony export */ });
/* harmony import */ var _playerPosition__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./playerPosition */ "./gl/playerPosition.ts");
/* harmony import */ var _tileGrid__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./tileGrid */ "./gl/tileGrid.ts");
/* harmony import */ var _tileMarker__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./tileMarker */ "./gl/tileMarker.ts");
/* harmony import */ var _state_markerStore__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../state/markerStore */ "./state/markerStore.ts");
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _instanceDetector__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./instanceDetector */ "./gl/instanceDetector.ts");
/* harmony import */ var _heightData__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./heightData */ "./gl/heightData.ts");
/* harmony import */ var _instanceHeightData__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./instanceHeightData */ "./gl/instanceHeightData.ts");
/**
 * Overlay Manager - Manages GL overlays and player position tracking
 * Runs in the renderer process and keeps overlays synced with player position
 */









// Tracking interval in ms
const POSITION_POLL_INTERVAL = 3000; // Shared recording: position + floor VAO check in one IPC call
const OVERLAY_UPDATE_INTERVAL = 1000;
const HOOK_RETRY_INTERVAL = 5000;
const FLOOR_REFRESH_INTERVAL = 30000; // Instance height capture only (VAO refresh merged into position poll)
const FLOOR_CHECK_EVERY_N_POLLS = 5; // Check floor VAOs every 5th position poll (= every 15s)
let positionPollTimer = null;
let overlayUpdateTimer = null;
let hookRetryTimer = null;
let floorRefreshTimer = null;
let isRunning = false;
let isHooked = false;
let isPollingPosition = false; // Guard against overlapping async polls
let positionPollCount = 0; // Counter for periodic floor check
let lastPosition = null;
let wasInInstance = false;
let isTransitioning = false; // Guard: block floor refresh during instance transitions
let isRefreshingFloors = false; // Guard: prevent overlapping floor refresh async ops
let instanceHeightCaptureCount = 0; // Cap instance height captures to avoid perpetual IPC
const MAX_INSTANCE_HEIGHT_CAPTURES = 4; // Stop capturing after this many attempts
// Last known surface-world position (when NOT in instance) for entrance-linking
let lastSurfacePosition = null;
// Instance-to-public tile offset (from Instance Tile Mapper)
// When set, instance coordinates are converted to public for map display
let instanceOffset = null;
/**
 * Set the instance-to-public tile offset.
 * When the player is in instance space, their position will be converted
 * to public coordinates using this offset for map display.
 * Call with null to clear.
 */
function setInstanceOffset(offset) {
    instanceOffset = offset;
    _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.setInstanceOffset(offset);
    if (offset) {
        console.log(`[OverlayManager] Instance offset set: dLng=${offset.dLng}, dLat=${offset.dLat}`);
        // Immediately convert stored player position to public coords.
        // Without this, MapInstanceHandler reads the old instance position and pans
        // to the wrong place (the next position poll would convert it, but too late).
        const currentPos = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().playerPosition;
        if (currentPos && currentPos.x > 6400) {
            _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.setPlayerPosition({
                x: currentPos.x + offset.dLng,
                y: currentPos.y + offset.dLat,
                floor: currentPos.floor,
            });
            console.log(`[OverlayManager] Converted position: (${currentPos.x + offset.dLng}, ${currentPos.y + offset.dLat})`);
        }
        // Persist offset to known instance for instant re-entry next time
        const ctx = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().currentInstance;
        if (ctx?.isInstance && ctx.entranceKey) {
            _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.saveKnownInstance(ctx.entranceKey, ctx.entryTileX, ctx.entryTileZ, ctx.label ?? undefined, offset);
        }
    }
    else {
        console.log('[OverlayManager] Instance offset cleared');
    }
}
function getInstanceOffset() {
    return instanceOffset;
}
/**
 * Auto-compute instance offset by matching floor mesh hashes against stored mappings.
 * Called when entering an instance and mesh mappings are available.
 * Scans current floor renders, hashes them, finds a match, computes offset.
 */
async function autoComputeOffsetFromMeshes() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native)
        return false;
    const mappings = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().meshMappings;
    if (!mappings || mappings.length === 0)
        return false;
    // Build lookup: hash → publicChunk
    const hashToPublic = new Map();
    for (const m of mappings) {
        hashToPublic.set(m.meshHash, { x: m.publicChunkX, z: m.publicChunkZ });
    }
    console.log(`[OverlayManager] Auto-matching: ${hashToPublic.size} mesh mappings available`);
    try {
        // Capture floor renders with vertex data for hashing
        const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native.recordRenderCalls({
            maxframes: 1,
            framecooldown: 100,
            features: ['vertexarray', 'uniforms'],
            hasInput: 'aMaterialSettingsSlotXY3'
        });
        for (const r of renders) {
            if (!r.program?.inputs?.find((q) => q.name === 'aMaterialSettingsSlotXY3'))
                continue;
            // Get instance chunk coords from model matrix
            const modelU = r.program.uniforms.find((u) => u.name === 'uModelMatrix');
            if (!modelU || !r.uniformState)
                continue;
            const mv = new DataView(r.uniformState.buffer, r.uniformState.byteOffset + modelU.snapshotOffset);
            const instanceChunkX = Math.floor(mv.getFloat32(48, true) / _heightData__WEBPACK_IMPORTED_MODULE_6__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_6__.TILE_SIZE);
            const instanceChunkZ = Math.floor(mv.getFloat32(56, true) / _heightData__WEBPACK_IMPORTED_MODULE_6__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_6__.TILE_SIZE);
            // Skip non-instance chunks
            if (instanceChunkX < 100)
                continue;
            // Hash the vertex data
            const va = r.vertexArray;
            if (!va)
                continue;
            const attrs = (va.attributes || []).filter((a) => a != null);
            const posAttr = attrs.find((a) => a.enabled && a.buffer && a.buffer.length > 0 && a.vectorlength >= 2);
            if (!posAttr)
                continue;
            // FNV-1a hash (same as Instance Tile Mapper)
            let h = 0x811c9dc5;
            const buf = posAttr.buffer;
            for (let i = 0; i < Math.min(buf.length, 4096); i++) {
                h ^= buf[i];
                h = Math.imul(h, 0x01000193);
            }
            const hash = (h >>> 0).toString(16).padStart(8, '0');
            // Check for match
            const publicChunk = hashToPublic.get(hash);
            if (publicChunk) {
                // Compute offset: publicChunk * CHUNK_SIZE - instanceChunk * CHUNK_SIZE
                const dLng = (publicChunk.x - instanceChunkX) * _heightData__WEBPACK_IMPORTED_MODULE_6__.CHUNK_SIZE;
                const dLat = (publicChunk.z - instanceChunkZ) * _heightData__WEBPACK_IMPORTED_MODULE_6__.CHUNK_SIZE;
                console.log(`[OverlayManager] MESH MATCH! hash=${hash} instance chunk (${instanceChunkX},${instanceChunkZ}) → public chunk (${publicChunk.x},${publicChunk.z})`);
                console.log(`[OverlayManager] Auto-computed offset: dLng=${dLng}, dLat=${dLat}`);
                setInstanceOffset({ dLng, dLat });
                return true;
            }
        }
        console.log('[OverlayManager] No mesh hash matches found');
        return false;
    }
    catch (e) {
        console.error('[OverlayManager] Auto-offset error:', e);
        return false;
    }
}
// Track synced markers (map marker ID -> GL marker ID)
const syncedMarkers = new Map();
// Streaming floor detector for instance grid bounds display
let instanceFloorStream = null;
const knownFloorProgs = new WeakMap();
/**
 * Start streaming floor chunk detection for instance grid bounds display.
 * Uses the same aMaterialSettingsSlotXY3 attribute as tileGrid/tileMarker
 * but runs continuously to ensure all chunks are detected.
 */
function startInstanceFloorStream() {
    if (instanceFloorStream || !_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native)
        return;
    console.log('[OverlayManager] Starting instance floor stream...');
    const stream = _patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native.streamRenderCalls({
        features: ["uniforms"],
        framecooldown: 500,
    }, (renders) => {
        let newChunks = 0;
        for (const render of renders) {
            if (!render.program)
                continue;
            // Check cache first
            if (knownFloorProgs.has(render.program)) {
                if (!knownFloorProgs.get(render.program))
                    continue;
            }
            else {
                const isFloor = render.program.inputs.some((i) => i.name === 'aMaterialSettingsSlotXY3');
                knownFloorProgs.set(render.program, isFloor);
                if (!isFloor)
                    continue;
            }
            // Extract chunk position from model matrix
            const modelMatrixUniform = render.program.uniforms.find((u) => u.name === 'uModelMatrix');
            if (!modelMatrixUniform || !render.uniformState)
                continue;
            try {
                const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset);
                const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
                const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);
                const chunkX = Math.floor(x / _heightData__WEBPACK_IMPORTED_MODULE_6__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_6__.TILE_SIZE);
                const chunkZ = Math.floor(z / _heightData__WEBPACK_IMPORTED_MODULE_6__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_6__.TILE_SIZE);
                if ((0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.isInstanceChunk)(chunkX)) {
                    (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.reportFloorChunk)(chunkX, chunkZ);
                    newChunks++;
                }
            }
            catch {
                continue;
            }
        }
        // Update instance bounds if new chunks were found
        if (newChunks > 0) {
            const currentCtx = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().currentInstance;
            if (currentCtx?.isInstance) {
                const updated = (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.updateInstanceBounds)(currentCtx);
                _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.setInstanceContext(updated);
            }
        }
    });
    instanceFloorStream = {
        close: () => {
            try {
                stream.close();
            }
            catch { }
        }
    };
}
/**
 * Stop the instance floor stream
 */
function stopInstanceFloorStream() {
    if (instanceFloorStream) {
        instanceFloorStream.close();
        instanceFloorStream = null;
        console.log('[OverlayManager] Stopped instance floor stream');
    }
}
/**
 * Check if the native addon is available (running in Electron with game hooked)
 */
function isNativeAvailable() {
    return _patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native != null;
}
/**
 * Check if the RS client is hooked and ready
 */
function isClientReady() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native)
        return false;
    try {
        return _patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native.getRsReady() > 0;
    }
    catch {
        return false;
    }
}
/**
 * Try to connect to RS3 client (check existing connection first, then try to hook)
 */
function tryHookClient() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native)
        return false;
    // First check if already connected (e.g., shared with another Alt1GL app)
    if (isClientReady()) {
        if (!isHooked) {
            console.log('[OverlayManager] Already connected to RS3 client (existing hook)');
            isHooked = true;
        }
        return true;
    }
    // Not connected, try to hook
    try {
        console.log('[OverlayManager] Attempting to hook RS3 client...');
        (0,_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.hookFirstClient)();
        isHooked = isClientReady();
        if (isHooked) {
            console.log('[OverlayManager] Successfully hooked RS3 client');
        }
        else {
            console.log('[OverlayManager] Hook attempted but client not ready yet');
        }
        return isHooked;
    }
    catch (e) {
        console.log('[OverlayManager] Failed to hook client:', e);
        return false;
    }
}
/**
 * Poll player position and update the store.
 * Does ONE recordRenderCalls per poll — the same renders feed both player detection
 * and (periodically) floor VAO refresh, avoiding duplicate IPC.
 */
async function pollPlayerPosition() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native)
        return;
    // Guard: prevent overlapping async polls from stacking up via setInterval
    if (isPollingPosition)
        return;
    isPollingPosition = true;
    // Check if client is ready before polling
    if (!isClientReady()) {
        isPollingPosition = false;
        return;
    }
    try {
        // Single recording shared between position detection and floor VAO refresh
        const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native.recordRenderCalls({
            maxframes: 1,
            features: ["uniforms"],
            skipHandles: true,
        });
        const pos = await (0,_playerPosition__WEBPACK_IMPORTED_MODULE_0__.getPlayerPosition)(renders);
        // Periodically check floor VAO changes from same recording (no extra IPC call)
        positionPollCount++;
        if (positionPollCount % FLOOR_CHECK_EVERY_N_POLLS === 0
            && !isTransitioning && !isRefreshingFloors && syncedMarkers.size > 0) {
            try {
                const changedChunks = await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.refreshFloorPrograms(renders);
                if (changedChunks.length > 0) {
                    console.log(`[OverlayManager] Floor VAOs changed in ${changedChunks.length} chunks`);
                    const affectedMarkers = _tileMarker__WEBPACK_IMPORTED_MODULE_2__.getMarkersInChunks(changedChunks);
                    if (affectedMarkers.length > 0) {
                        for (const marker of affectedMarkers) {
                            for (const [storeId, glId] of syncedMarkers) {
                                if (glId === marker.id) {
                                    await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.removeMarker(glId);
                                    syncedMarkers.delete(storeId);
                                    break;
                                }
                            }
                        }
                        await syncAllMarkers();
                    }
                }
            }
            catch (floorErr) {
                console.error('[OverlayManager] Floor VAO check error:', floorErr);
            }
        }
        if (pos) {
            let displayX = pos.x;
            let displayY = pos.z; // z becomes y for map coordinates
            // Use floor mesh detection (stable) rather than player coords to determine instance state
            const inInstanceByFloor = (0,_tileMarker__WEBPACK_IMPORTED_MODULE_2__.hasInstanceFloorChunks)();
            const storeOffset = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().instanceOffset;
            const activeOffset = instanceOffset || storeOffset;
            // Log position periodically (not every poll — reduces console spam)
            if (positionPollCount % 10 === 1) {
                console.log(`[OverlayManager] Pos: (${pos.x}, ${pos.z}) instanceFloor=${inInstanceByFloor} offset=${activeOffset ? `${activeOffset.dLng},${activeOffset.dLat}` : 'none'}`);
            }
            if (inInstanceByFloor && activeOffset) {
                displayX = pos.x + activeOffset.dLng;
                displayY = pos.z + activeOffset.dLat;
            }
            const isInstance = (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.isInInstanceSpace)(pos.x);
            const newPosition = {
                x: displayX,
                y: displayY,
                floor: 0, // TODO: Detect floor from height
            };
            lastPosition = pos;
            _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.setPlayerPosition(newPosition);
            // Track last surface position for entrance-linking
            if (!isInstance) {
                lastSurfacePosition = { x: pos.x, z: pos.z };
            }
            // Instance detection
            if (isInstance !== wasInInstance) {
                isTransitioning = true; // Block floor refresh during transition
                if (isInstance) {
                    // Entered instance
                    instanceHeightCaptureCount = 0; // Reset for new instance session
                    console.log(`[OverlayManager] Entered instance area at ${pos.x}, ${pos.z}`);
                    // Record entrance tile (last surface position before entering)
                    const entranceX = lastSurfacePosition?.x ?? 0;
                    const entranceZ = lastSurfacePosition?.z ?? 0;
                    (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.setEntranceTile)(entranceX, entranceZ);
                    const entranceKey = `${entranceX},${entranceZ}`;
                    console.log(`[OverlayManager] Entrance tile: ${entranceKey}`);
                    // Record entry tile (first position inside instance = coordinate origin)
                    (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.setEntryTile)(pos.x, pos.z);
                    console.log(`[OverlayManager] Entry tile: ${pos.x},${pos.z}`);
                    // Create instance context immediately (no waiting for fingerprint!)
                    const ctx = (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.createInstanceContext)(entranceX, entranceZ, pos.x, pos.z);
                    // Check for known instance match by entrance key.
                    // Use proximity matching (within 3 tiles) since the 3s poll interval
                    // means lastSurfacePosition may be a tile or two off from the actual entrance.
                    const knownInstances = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getKnownInstances();
                    const known = knownInstances.find(k => k.entranceKey === entranceKey)
                        ?? knownInstances.find(k => {
                            const parts = k.entranceKey.split(',');
                            if (parts.length !== 2)
                                return false;
                            const kx = Number(parts[0]);
                            const kz = Number(parts[1]);
                            return Math.abs(kx - entranceX) <= 3 && Math.abs(kz - entranceZ) <= 3;
                        });
                    if (known) {
                        ctx.label = known.instanceLabel;
                        console.log(`[OverlayManager] Auto-matched instance: ${known.instanceLabel}`);
                        // Instantly apply saved offset — no waiting for mesh matching
                        if (known.savedOffset) {
                            console.log(`[OverlayManager] Applying saved offset: dLng=${known.savedOffset.dLng}, dLat=${known.savedOffset.dLat}`);
                            setInstanceOffset(known.savedOffset);
                        }
                    }
                    _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.setInstanceContext(ctx);
                    // Auto-save entrance key to knownInstances for re-identification
                    _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.saveKnownInstance(entranceKey, pos.x, pos.z, known?.instanceLabel, known?.savedOffset);
                    // Start streaming floor detector for grid bounds display (not identification)
                    startInstanceFloorStream();
                    // One-shot floor detection as fast path, with retries
                    _tileMarker__WEBPACK_IMPORTED_MODULE_2__.detectFloorProgram().then(async (found) => {
                        isTransitioning = false; // Unblock floor refresh
                        // Auto-compute offset from mesh hash matching
                        // Do this AFTER floor detection so we have renders available
                        const mappings = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().meshMappings;
                        if (mappings && mappings.length > 0 && !instanceOffset) {
                            console.log('[OverlayManager] Attempting auto-offset from mesh hashes...');
                            const matched = await autoComputeOffsetFromMeshes();
                            if (matched) {
                                // Save the computed offset for future instant re-entry
                                _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.saveKnownInstance(entranceKey, pos.x, pos.z, known?.instanceLabel, instanceOffset);
                                // Re-sync markers with new offset
                                syncAllMarkers();
                            }
                        }
                        if (!found) {
                            setTimeout(async () => {
                                if (wasInInstance) {
                                    console.log('[OverlayManager] Retrying floor detection...');
                                    await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.detectFloorProgram();
                                    // Retry mesh matching too
                                    if (_state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().meshMappings?.length > 0 && !instanceOffset) {
                                        autoComputeOffsetFromMeshes();
                                    }
                                }
                            }, 2000);
                        }
                    });
                    // Sync markers for the matched instance (initially flat, before height data)
                    syncAllMarkers();
                    // Capture instance height data from floor mesh vertices.
                    // Delay slightly to allow the game to render instance chunks first.
                    setTimeout(async () => {
                        if (!wasInInstance)
                            return;
                        const count = await (0,_instanceHeightData__WEBPACK_IMPORTED_MODULE_7__.captureInstanceHeights)();
                        if (count > 0) {
                            console.log(`[OverlayManager] Instance height captured for ${count} chunks, re-syncing markers...`);
                            await resyncAllMarkers();
                        }
                        else {
                            // Retry after more time — instance may still be loading
                            setTimeout(async () => {
                                if (!wasInInstance)
                                    return;
                                const retryCount = await (0,_instanceHeightData__WEBPACK_IMPORTED_MODULE_7__.captureInstanceHeights)();
                                if (retryCount > 0) {
                                    console.log(`[OverlayManager] Instance height retry captured ${retryCount} chunks, re-syncing markers...`);
                                    await resyncAllMarkers();
                                }
                            }, 3000);
                        }
                    }, 1500);
                }
                else {
                    // Left instance
                    console.log('[OverlayManager] Left instance area');
                    instanceHeightCaptureCount = 0;
                    stopInstanceFloorStream();
                    (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.resetInstanceTracking)();
                    (0,_instanceHeightData__WEBPACK_IMPORTED_MODULE_7__.clearInstanceHeightCache)();
                    _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.setInstanceContext(null);
                    // Clear session offset (will be recomputed via mesh matching on next entry)
                    setInstanceOffset(null);
                    // Re-detect floor programs for the main map before syncing markers
                    await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.detectFloorProgram();
                    isTransitioning = false; // Unblock floor refresh
                    // Re-sync to show main map markers
                    syncAllMarkers();
                }
                wasInInstance = isInstance;
            }
        }
    }
    catch (e) {
        console.error('[OverlayManager] Failed to get player position:', e);
    }
    finally {
        isPollingPosition = false;
    }
}
// Track current overlay state to avoid redundant calls
let currentOverlaySettings = { grid: false, collision: false };
/**
 * Update overlays based on current settings
 * The new tileGrid API uses streamRenderCalls to automatically track floor chunks
 */
function updateOverlayState() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native)
        return;
    const state = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState();
    const { showOverlayGrid, showOverlayCollision } = state.ui;
    const newSettings = {
        grid: showOverlayGrid,
        collision: showOverlayCollision,
    };
    // Only update if settings changed
    if (newSettings.grid === currentOverlaySettings.grid &&
        newSettings.collision === currentOverlaySettings.collision) {
        return;
    }
    currentOverlaySettings = newSettings;
    try {
        if (newSettings.grid || newSettings.collision) {
            (0,_tileGrid__WEBPACK_IMPORTED_MODULE_1__.startOverlay)(newSettings);
            console.log('[OverlayManager] Started overlay:', newSettings);
        }
        else {
            (0,_tileGrid__WEBPACK_IMPORTED_MODULE_1__.stopOverlay)();
            console.log('[OverlayManager] Stopped overlay');
        }
    }
    catch (e) {
        console.error('[OverlayManager] Failed to update overlay:', e);
    }
}
/**
 * Convert hex color to RGBA array
 */
function hexToRgba(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255,
            1.0
        ];
    }
    return [1.0, 0.2, 0.2, 1.0]; // Default red
}
/**
 * Sync a single marker to GL overlay
 */
async function syncMarkerToGL(marker) {
    if (!isClientReady())
        return;
    let tileX = Math.floor(marker.x);
    let tileZ = Math.floor(marker.y); // map y -> game z
    let renderTileX;
    let renderTileZ;
    // Instance marker: translate relative coords to absolute
    if (marker.instanceContext) {
        const currentInstance = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().currentInstance;
        if (!currentInstance?.isInstance)
            return; // Not in instance, skip
        if (!currentInstance.entranceKey ||
            currentInstance.entranceKey !== marker.instanceContext.entranceKey) {
            return; // Wrong instance, skip
        }
        // Translate relative -> absolute using current entry tile as origin
        tileX = Math.floor(marker.x + currentInstance.entryTileX);
        tileZ = Math.floor(marker.y + currentInstance.entryTileZ);
    }
    // Instance offset: markers stored at PUBLIC coords, GL needs INSTANCE coords for VAO.
    // Use floor mesh detection (stable) rather than player coords to determine instance state.
    // Keep public coords for height data, reverse offset for floor VAO matching.
    const storeOff = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState().instanceOffset;
    const activeOff = instanceOffset || storeOff;
    if (activeOff && (0,_tileMarker__WEBPACK_IMPORTED_MODULE_2__.hasInstanceFloorChunks)() && !marker.instanceContext) {
        renderTileX = tileX - activeOff.dLng;
        renderTileZ = tileZ - activeOff.dLat;
    }
    const glMarkerId = `tile_${tileX}_${tileZ}_${marker.floor}`;
    // Skip if already synced
    if (syncedMarkers.get(marker.id) === glMarkerId)
        return;
    // Remove old GL marker if position changed
    const oldGlId = syncedMarkers.get(marker.id);
    if (oldGlId && oldGlId !== glMarkerId) {
        await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.removeMarker(oldGlId);
    }
    try {
        const result = await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.addMarker({
            tileX,
            tileZ,
            renderTileX,
            renderTileZ,
            level: marker.floor,
            color: hexToRgba(marker.color),
            label: marker.label,
        });
        if (result) {
            syncedMarkers.set(marker.id, result.id);
            console.log(`[OverlayManager] Synced marker ${marker.id} to GL at ${tileX},${tileZ}`);
        }
    }
    catch (e) {
        console.error(`[OverlayManager] Failed to sync marker ${marker.id}:`, e);
    }
}
/**
 * Remove a marker from GL overlay
 */
async function removeMarkerFromGL(markerId) {
    const glId = syncedMarkers.get(markerId);
    if (glId) {
        await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.removeMarker(glId);
        syncedMarkers.delete(markerId);
        console.log(`[OverlayManager] Removed GL marker for ${markerId}`);
    }
}
/**
 * Force re-sync all markers by removing existing GL overlays and recreating them.
 * Used after instance height data becomes available so markers get proper terrain heights.
 */
async function resyncAllMarkers() {
    if (!isClientReady())
        return;
    // Remove all existing GL overlays
    for (const [markerId, glId] of syncedMarkers) {
        await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.removeMarker(glId);
    }
    syncedMarkers.clear();
    // Re-detect floor programs (they may have changed)
    await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.detectFloorProgram();
    // Re-sync all visible markers (will now use cached height data)
    await syncAllMarkers();
}
/**
 * Periodically check if floor mesh IDs changed and resync affected markers.
 * Floor meshes can change when the game recreates vertex objects (camera movement, etc.)
 */
/**
 * Instance height capture only — VAO refresh is now merged into pollPlayerPosition
 * via shared recording. This timer handles the heavier vertex-data capture for
 * instance terrain heights, which needs its own recording with 'vertexarray' feature.
 */
async function refreshFloorMeshes() {
    if (!isClientReady() || isTransitioning || isRefreshingFloors)
        return;
    // Only needed for instance height capture (VAO refresh is in position poll)
    if (!wasInInstance || instanceHeightCaptureCount >= MAX_INSTANCE_HEIGHT_CAPTURES)
        return;
    isRefreshingFloors = true;
    try {
        instanceHeightCaptureCount++;
        const newCount = await (0,_instanceHeightData__WEBPACK_IMPORTED_MODULE_7__.captureInstanceHeights)();
        if (newCount > 0) {
            console.log(`[OverlayManager] Instance heights: ${newCount} chunks (attempt ${instanceHeightCaptureCount}/${MAX_INSTANCE_HEIGHT_CAPTURES})`);
            await resyncAllMarkers();
        }
    }
    catch (e) {
        console.error('[OverlayManager] Instance height capture error:', e);
    }
    finally {
        isRefreshingFloors = false;
    }
}
let isSyncingMarkers = false;
let syncAgainAfterCurrent = false;
/**
 * Sync all visible markers to GL overlays
 */
async function syncAllMarkers() {
    if (!isClientReady())
        return;
    // Re-entry guard: if already syncing, schedule a re-run after current finishes
    if (isSyncingMarkers) {
        syncAgainAfterCurrent = true;
        return;
    }
    isSyncingMarkers = true;
    const state = _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.getState();
    const rawIsInstance = state.currentInstance?.isInstance ?? false;
    const hasActiveOffset = state.instanceOffset != null;
    // When offset is active, markers are stored at public coords without instanceContext —
    // treat as non-instance for filtering so they pass visibility check.
    const isInstance = rawIsInstance && !hasActiveOffset;
    const currentEntranceKey = state.currentInstance?.entranceKey ?? '';
    const visibleGroupIds = new Set(state.groups.filter(g => g.visible).map(g => g.id));
    // Filter markers appropriate for current context
    const visibleMarkers = state.markers.filter(m => {
        // Group visibility check
        if (!visibleGroupIds.has(m.groupId || 'default'))
            return false;
        if (isInstance) {
            // In instance (no offset): show only instance markers matching current entrance key
            if (!m.instanceContext)
                return false;
            return currentEntranceKey && m.instanceContext.entranceKey === currentEntranceKey;
        }
        else {
            // On main map or instance with offset: show non-instance markers
            return !m.instanceContext;
        }
    });
    // Track which markers should exist
    const visibleMarkerIds = new Set(visibleMarkers.map(m => m.id));
    // Remove GL markers that are no longer visible
    for (const [markerId, glId] of syncedMarkers) {
        if (!visibleMarkerIds.has(markerId)) {
            await _tileMarker__WEBPACK_IMPORTED_MODULE_2__.removeMarker(glId);
            syncedMarkers.delete(markerId);
        }
    }
    // Sync all visible markers
    for (const marker of visibleMarkers) {
        await syncMarkerToGL(marker);
    }
    isSyncingMarkers = false;
    // If another sync was requested while we were running, do one more pass
    if (syncAgainAfterCurrent) {
        syncAgainAfterCurrent = false;
        syncAllMarkers();
    }
}
/**
 * Start the overlay manager
 */
function startOverlayManager() {
    if (isRunning)
        return;
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_4__.native) {
        console.log('[OverlayManager] Native addon not available, skipping');
        return;
    }
    console.log('[OverlayManager] Starting...');
    isRunning = true;
    // Try to hook the client immediately
    const hooked = tryHookClient();
    if (!hooked) {
        // Set up retry timer to keep trying to hook
        console.log('[OverlayManager] Will retry hooking every', HOOK_RETRY_INTERVAL, 'ms');
        hookRetryTimer = setInterval(() => {
            if (tryHookClient()) {
                console.log('[OverlayManager] Client now hooked, starting position polling');
                if (hookRetryTimer) {
                    clearInterval(hookRetryTimer);
                    hookRetryTimer = null;
                }
            }
        }, HOOK_RETRY_INTERVAL);
    }
    // Start polling player position (will check if hooked before polling)
    positionPollTimer = setInterval(pollPlayerPosition, POSITION_POLL_INTERVAL);
    // Start overlay update loop
    overlayUpdateTimer = setInterval(updateOverlayState, OVERLAY_UPDATE_INTERVAL);
    // Start periodic floor mesh refresh to detect vertexObjectId changes
    floorRefreshTimer = setInterval(refreshFloorMeshes, FLOOR_REFRESH_INTERVAL);
    // Subscribe to UI changes to update overlay immediately
    _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.subscribe((s) => ({
        showOverlayGrid: s.ui.showOverlayGrid,
        showOverlayCollision: s.ui.showOverlayCollision
    }), () => {
        // Trigger immediate overlay update when settings change
        updateOverlayState();
    });
    // Subscribe to marker changes to sync to GL (debounced to avoid cascading)
    let syncDebounceTimer = null;
    _state_markerStore__WEBPACK_IMPORTED_MODULE_3__.MarkerStore.subscribe((s) => ({
        markers: s.markers,
        groups: s.groups,
    }), () => {
        // Debounce: coalesce rapid marker changes into a single sync
        if (syncDebounceTimer)
            clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
            syncDebounceTimer = null;
            syncAllMarkers();
        }, 200);
    });
    // Initial poll
    pollPlayerPosition();
    // Initial marker sync: detect floors first (one IPC call), then sync markers
    // Without floor data, every marker triggers its own detection → IPC cascade
    _tileMarker__WEBPACK_IMPORTED_MODULE_2__.detectFloorProgram(true).then(() => {
        syncAllMarkers();
    });
}
/**
 * Stop the overlay manager
 */
function stopOverlayManager() {
    if (!isRunning)
        return;
    console.log('[OverlayManager] Stopping...');
    isRunning = false;
    if (positionPollTimer) {
        clearInterval(positionPollTimer);
        positionPollTimer = null;
    }
    if (overlayUpdateTimer) {
        clearInterval(overlayUpdateTimer);
        overlayUpdateTimer = null;
    }
    if (hookRetryTimer) {
        clearInterval(hookRetryTimer);
        hookRetryTimer = null;
    }
    if (floorRefreshTimer) {
        clearInterval(floorRefreshTimer);
        floorRefreshTimer = null;
    }
    // Reset instance tracking
    (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_5__.resetInstanceTracking)();
    wasInInstance = false;
    lastSurfacePosition = null;
    // Clear all GL markers
    _tileMarker__WEBPACK_IMPORTED_MODULE_2__.clearAllMarkers();
    syncedMarkers.clear();
    (0,_tileGrid__WEBPACK_IMPORTED_MODULE_1__.stopOverlay)();
    currentOverlaySettings = { grid: false, collision: false };
}
/**
 * Get the current player position (from last poll)
 */
function getLastPlayerPosition() {
    return lastPosition;
}
/**
 * Force an immediate position poll and overlay update
 */
async function forceUpdate() {
    await pollPlayerPosition();
    await updateOverlayState();
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

/***/ "./gl/playerPosition.ts"
/*!******************************!*\
  !*** ./gl/playerPosition.ts ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PassivePlayerTracker: () => (/* binding */ PassivePlayerTracker),
/* harmony export */   PlayerPositionTracker: () => (/* binding */ PlayerPositionTracker),
/* harmony export */   getCameraInfo: () => (/* binding */ getCameraInfo),
/* harmony export */   getPassivePlayerPosition: () => (/* binding */ getPassivePlayerPosition),
/* harmony export */   getPassiveTracker: () => (/* binding */ getPassiveTracker),
/* harmony export */   getPlayerPosition: () => (/* binding */ getPlayerPosition),
/* harmony export */   getPlayerTile: () => (/* binding */ getPlayerTile),
/* harmony export */   initPassiveTracking: () => (/* binding */ initPassiveTracking),
/* harmony export */   stopPassiveTracking: () => (/* binding */ stopPassiveTracking)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _renderprogram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./renderprogram */ "./gl/renderprogram.ts");
/**
 * Player Position Tracker
 * Finds player via occlusion mesh (tinted, animated mesh) and extracts position from model matrix
 * Based on RS3QuestBuddyGL implementation
 */


const TILESIZE = 512;
class PlayerPositionTracker {
    debug;
    cachedMesh = null;
    cacheTimeout;
    constructor(options = {}) {
        this.debug = options.debug ?? false;
        this.cacheTimeout = options.cacheTimeout ?? 30000;
    }
    async getPosition() {
        if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native)
            return null;
        try {
            const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({
                maxframes: 1,
                features: ["uniforms"],
                skipHandles: true,
            });
            return this.findPlayer(renders);
        }
        catch (e) {
            if (this.debug)
                console.error("[PlayerPosition] Capture error:", e);
            return null;
        }
    }
    findPlayer(renders) {
        // Try fast path first if we have a cached mesh
        if (this.cachedMesh && Date.now() - this.cachedMesh.timestamp < this.cacheTimeout) {
            const cached = this.findCachedMesh(renders);
            if (cached)
                return cached;
        }
        // Full scan for player
        return this.scanForPlayer(renders);
    }
    findCachedMesh(renders) {
        if (!this.cachedMesh)
            return null;
        for (const render of renders) {
            if (render.vertexObjectId !== this.cachedMesh.vaoId)
                continue;
            if (render.program?.programId !== this.cachedMesh.programId)
                continue;
            try {
                const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
                if (!progmeta.uModelMatrix)
                    continue;
                const matrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
                if (!matrix || matrix.length < 16)
                    continue;
                const x = Math.round(matrix[12] / TILESIZE) - 2;
                const y = matrix[13] / TILESIZE;
                const z = Math.round(matrix[14] / TILESIZE) - 1;
                if (x === 0 && z === 0)
                    continue;
                return {
                    x, y, z,
                    rotation: Math.atan2(-matrix[8], matrix[0]),
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                };
            }
            catch {
                continue;
            }
        }
        this.cachedMesh = null;
        return null;
    }
    scanForPlayer(renders) {
        const candidates = [];
        for (const render of renders) {
            if (!render.program || !render.uniformState)
                continue;
            const hasFrag = typeof render.program.fragmentShader?.source === 'string';
            const hasVert = typeof render.program.vertexShader?.source === 'string';
            if (!hasFrag || !hasVert)
                continue;
            let progmeta;
            try {
                progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            }
            catch {
                continue;
            }
            // Must be tinted and animated (player has bones)
            if (!progmeta.isTinted || !progmeta.uTint || !progmeta.uModelMatrix)
                continue;
            if (!progmeta.isAnimated)
                continue;
            try {
                const tint = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uTint)[0];
                if (!tint || tint.length < 4)
                    continue;
                // Occlusion: RGB ~0, alpha <= 0.6
                const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
                if (rgbSum > 0.1 || tint[3] > 0.6)
                    continue;
                const matrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
                if (!matrix || matrix.length < 16)
                    continue;
                const rawX = matrix[12];
                const rawZ = matrix[14];
                const x = Math.round(rawX / TILESIZE) - 2;
                const y = matrix[13] / TILESIZE;
                const z = Math.round(rawZ / TILESIZE) - 1;
                if (x === 0 && z === 0)
                    continue;
                candidates.push({
                    x, y, z,
                    rawX, rawZ,
                    rotation: Math.atan2(-matrix[8], matrix[0]),
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                    tintAlpha: tint[3],
                    tint: [...tint],
                });
            }
            catch {
                continue;
            }
        }
        if (candidates.length === 0)
            return null;
        // Use camera to pick player (closest to camera target)
        const camera = this.extractCamera(renders);
        if (camera) {
            for (const c of candidates) {
                c.distFromCamera = Math.sqrt(Math.pow(c.x - camera.targetX, 2) +
                    Math.pow(c.z - camera.targetZ, 2));
            }
            candidates.sort((a, b) => (a.distFromCamera ?? 0) - (b.distFromCamera ?? 0));
        }
        else {
            candidates.sort((a, b) => Math.abs(a.tintAlpha - 0.5) - Math.abs(b.tintAlpha - 0.5));
        }
        const best = candidates[0];
        if (this.debug) {
            console.log(`[PlayerScan] ${candidates.length} candidates from ${renders.length} renders, picked pos=(${best.x}, ${best.z}) VAO=${best.vaoId}`);
        }
        this.cachedMesh = {
            vaoId: best.vaoId,
            programId: best.programId,
            timestamp: Date.now(),
        };
        if (this.debug) {
            console.log(`[PlayerPosition] Found at (${best.x.toFixed(1)}, ${best.z.toFixed(1)})`);
        }
        return {
            x: best.x,
            y: best.y,
            z: best.z,
            rotation: best.rotation,
            vaoId: best.vaoId,
            programId: best.programId,
        };
    }
    extractCamera(renders) {
        for (const render of renders) {
            const uViewMatrix = render.program?.uniforms?.find(u => u.name === "uViewMatrix");
            if (!uViewMatrix || !render.uniformState)
                continue;
            try {
                const v = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, uViewMatrix)[0];
                if (!v || v.length < 16)
                    continue;
                const camX = -(v[0] * v[12] + v[1] * v[13] + v[2] * v[14]);
                const camY = -(v[4] * v[12] + v[5] * v[13] + v[6] * v[14]);
                const camZ = -(v[8] * v[12] + v[9] * v[13] + v[10] * v[14]);
                const fwdX = -v[2];
                const fwdY = -v[6];
                const fwdZ = -v[10];
                const yaw = Math.atan2(fwdX, fwdZ);
                if (fwdY >= 0) {
                    return {
                        x: camX / TILESIZE,
                        y: camY / TILESIZE,
                        z: camZ / TILESIZE,
                        targetX: camX / TILESIZE,
                        targetZ: camZ / TILESIZE,
                        yaw,
                    };
                }
                const t = -camY / fwdY;
                return {
                    x: camX / TILESIZE,
                    y: camY / TILESIZE,
                    z: camZ / TILESIZE,
                    targetX: (camX + t * fwdX) / TILESIZE,
                    targetZ: (camZ + t * fwdZ) / TILESIZE,
                    yaw,
                };
            }
            catch {
                continue;
            }
        }
        return null;
    }
    async getCamera() {
        if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native)
            return null;
        try {
            const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({
                maxframes: 1,
                features: ["uniforms"],
                skipHandles: true,
            });
            return this.extractCamera(renders);
        }
        catch {
            return null;
        }
    }
    clearCache() {
        this.cachedMesh = null;
    }
}
// Singleton tracker
let _tracker = null;
async function getPlayerPosition(preRecordedRenders) {
    if (!_tracker)
        _tracker = new PlayerPositionTracker();
    if (preRecordedRenders)
        return _tracker.findPlayer(preRecordedRenders);
    return _tracker.getPosition();
}
async function getPlayerTile() {
    const pos = await getPlayerPosition();
    return pos ? { x: pos.x, z: pos.z } : null;
}
async function getCameraInfo() {
    if (!_tracker)
        _tracker = new PlayerPositionTracker();
    return _tracker.getCamera();
}
// =============================================================================
// Passive Player Tracker (uses streaming to continuously track player position)
// =============================================================================
/**
 * PassivePlayerTracker - Streaming-based player position tracking
 *
 * Uses streamRenderCalls to monitor renders and extract player position
 * from the tinted occlusion mesh's uModelMatrix uniform.
 *
 * This is more efficient than polling with recordRenderCalls because:
 * - No frame capture overhead
 * - Continuous updates without explicit polling
 * - Lower latency position tracking
 */
class PassivePlayerTracker {
    debug;
    initialized = false;
    stream = null;
    currentPosition = null;
    lastUpdateTime = 0;
    processCounter = 0;
    constructor(options = {}) {
        this.debug = options.debug ?? false;
    }
    /**
     * Initialize streaming position tracking
     */
    async init() {
        if (this.initialized && this.stream)
            return true;
        if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native) {
            console.error("[PassivePlayer] Native addon not available");
            return false;
        }
        console.log("[PassivePlayer] Initializing stream-based tracking...");
        try {
            // Start streaming render calls
            // Need uniforms to find the player mesh via getProgramMeta
            this.stream = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.streamRenderCalls({
                features: ["uniforms"],
                framecooldown: 500, // Post-contextIsolation: each callback serializes hundreds of renders over IPC; 100ms floods the renderer
            }, (renders) => this.processRenders(renders));
            this.initialized = true;
            console.log("[PassivePlayer] Stream initialized successfully");
            return true;
        }
        catch (e) {
            console.error("[PassivePlayer] Init error:", e);
            return false;
        }
    }
    /**
     * Process renders to find player position
     */
    processRenders(renders) {
        this.processCounter++;
        const shouldLog = (this.processCounter % 30) === 1; // Log every 30th call
        // Find the player's tinted occlusion mesh and extract position
        let skippedNoShader = 0;
        let matchCount = 0;
        for (const render of renders) {
            if (!render.program || !render.uniformState)
                continue;
            const hasFrag = typeof render.program.fragmentShader?.source === 'string';
            const hasVert = typeof render.program.vertexShader?.source === 'string';
            if (!hasFrag || !hasVert) {
                skippedNoShader++;
                continue;
            }
            let progmeta;
            try {
                progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            }
            catch {
                continue;
            }
            // Look for tinted + animated mesh with uModelMatrix
            if (!progmeta.isTinted || !progmeta.uTint || !progmeta.isAnimated || !progmeta.uModelMatrix)
                continue;
            try {
                const tint = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uTint)[0];
                if (!tint || tint.length < 4)
                    continue;
                // Occlusion: RGB ~0, alpha <= 0.6
                const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
                if (rgbSum > 0.1 || tint[3] > 0.6)
                    continue;
                // Found player mesh - extract position from model matrix
                const matrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
                if (!matrix || matrix.length < 16)
                    continue;
                const rawX = matrix[12];
                const rawY = matrix[13];
                const rawZ = matrix[14];
                if (rawX === 0 && rawZ === 0)
                    continue;
                matchCount++;
                const x = Math.round(rawX / TILESIZE) - 2;
                const y = rawY / TILESIZE;
                const z = Math.round(rawZ / TILESIZE) - 1;
                if (shouldLog) {
                    console.log(`[PassivePlayer] MATCH #${matchCount}: VAO=${render.vertexObjectId} prog=${render.program.programId} ` +
                        `tint=[${tint.map(t => t.toFixed(3)).join(',')}] ` +
                        `pos=(${x}, ${z}) raw=(${rawX.toFixed(1)}, ${rawZ.toFixed(1)})`);
                }
                this.currentPosition = {
                    x,
                    y,
                    z,
                    rotation: Math.atan2(-matrix[8], matrix[0]),
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                };
                this.lastUpdateTime = Date.now();
                if (this.debug && (this.processCounter % 50) === 0) {
                    console.log("[PassivePlayer] Position:", x.toFixed(1), z.toFixed(1));
                }
                // Found player, stop searching this frame
                return;
            }
            catch {
                continue;
            }
        }
        // Only log failures occasionally to avoid spam
        if (this.debug && (this.processCounter % 100) === 0) {
            console.log(`[PassivePlayer] No player found in ${renders.length} renders (${skippedNoShader} skipped - no shader)`);
        }
    }
    /**
     * Get current player position (instant read from cached value)
     */
    getPosition() {
        // Return cached position if recent (within 500ms)
        if (this.currentPosition && Date.now() - this.lastUpdateTime < 500) {
            return this.currentPosition;
        }
        return null;
    }
    /**
     * Async version - just returns cached position (stream updates it automatically)
     */
    async getPositionAsync() {
        return this.getPosition();
    }
    /**
     * Reinitialize (restart stream)
     */
    async reinit() {
        this.stop();
        return this.init();
    }
    /**
     * Stop tracking
     */
    stop() {
        if (this.stream) {
            try {
                this.stream.close();
            }
            catch (e) {
                // Ignore close errors
            }
            this.stream = null;
        }
        this.currentPosition = null;
        this.initialized = false;
    }
    /**
     * Check if initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get last update timestamp
     */
    getLastUpdateTime() {
        return this.lastUpdateTime;
    }
}
// Singleton passive tracker
let _passiveTracker = null;
/**
 * Get the singleton passive player tracker
 */
function getPassiveTracker() {
    if (!_passiveTracker) {
        _passiveTracker = new PassivePlayerTracker();
    }
    return _passiveTracker;
}
/**
 * Initialize passive tracking (call once at startup)
 */
async function initPassiveTracking(options) {
    if (!_passiveTracker) {
        _passiveTracker = new PassivePlayerTracker(options);
    }
    return _passiveTracker.init();
}
/**
 * Get player position from passive tracker (instant, no frame capture)
 */
function getPassivePlayerPosition() {
    const tracker = getPassiveTracker();
    if (!tracker.isInitialized())
        return null;
    return tracker.getPosition();
}
/**
 * Stop passive tracking
 */
function stopPassiveTracking() {
    if (_passiveTracker) {
        _passiveTracker.stop();
        _passiveTracker = null;
    }
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
/* harmony export */   getProgramMeta: () => (/* binding */ getProgramMeta),
/* harmony export */   getUniformValue: () => (/* binding */ getUniformValue)
/* harmony export */ });
/* harmony import */ var _avautils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./avautils */ "./gl/avautils.ts");
/**
 * Render program utilities for parsing shader metadata
 * Based on RS3QuestBuddyGL implementation
 */

// Cache by programId (number) instead of object reference.
// Post-contextIsolation, each IPC call returns a new JS object so WeakMap
// keys never match. programId is stable across calls for the same GL program.
const cachedPrograms = new Map();
const vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];
function getProgramMeta(prog) {
    const key = prog.programId;
    if (cachedPrograms.has(key)) {
        return cachedPrograms.get(key);
    }
    const r = fetchProgramMeta(prog);
    cachedPrograms.set(key, r);
    return r;
}
function fetchProgramMeta(prog) {
    const fragdefines = [];
    const vertdefines = [];
    const reg = /^#define\s+(\w+)\s*$/gm;
    let m;
    while (m = reg.exec(prog.fragmentShader.source)) {
        fragdefines.push(m[1]);
    }
    while (m = reg.exec(prog.vertexShader.source)) {
        vertdefines.push(m[1]);
    }
    const isTinted = !!prog.fragmentShader.source.match(/\bgl_FragColor\s*=\s*uTint\b/);
    const uTint = prog.uniforms.find(q => q.name == "uTint");
    const uBoneTransforms = prog.uniforms.find(q => q.name == "uBoneTransforms[0]");
    const uViewMatrix = prog.uniforms.find(q => q.name == "uViewMatrix");
    const aVertexPosition2D = prog.inputs.find(q => q.name == "aVertexPosition2D");
    const aPos = prog.inputs.find(i => vertexPosAliases.indexOf(i.name) != -1);
    const aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
    const aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");
    const isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");
    return {
        uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
        uBones: uBoneTransforms,
        uTint: uTint,
        uViewMatrix: uViewMatrix,
        aPos: aPos,
        isFloor: !!aMaterialSettingsSlotXY3,
        isAnimated: !!uBoneTransforms,
        isUi: !!aVertexPosition2D,
        isParticles: !!aParticleSize,
        isLighted,
        isTinted,
        isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,
        raw: prog,
        fragdefines,
        vertdefines,
    };
}
function getUniformValue(snap, uni) {
    const t = _avautils__WEBPACK_IMPORTED_MODULE_0__.vartypes[uni.type.scalarType];
    const v = [];
    const unireader = new DataView(snap.buffer, snap.byteOffset, snap.byteLength);
    for (let a = 0; a < uni.length; a++) {
        const sub = [];
        v.push(sub);
        for (let b = 0; b < uni.type.vectorLength; b++) {
            const offset = uni.snapshotOffset + uni.type.vectorLength * uni.type.scalarSize * a + uni.type.scalarSize * b;
            sub.push(unireader[t.readfn](offset, true));
        }
    }
    return v;
}


/***/ },

/***/ "./gl/tileGrid.ts"
/*!************************!*\
  !*** ./gl/tileGrid.ts ***!
  \************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CHUNK_SIZE: () => (/* binding */ CHUNK_SIZE),
/* harmony export */   TILE_SIZE: () => (/* binding */ TILE_SIZE),
/* harmony export */   floorTracker: () => (/* binding */ floorTracker),
/* harmony export */   isGridActive: () => (/* binding */ isOverlayActive),
/* harmony export */   isNativeAvailable: () => (/* binding */ isNativeAvailable),
/* harmony export */   isOverlayActive: () => (/* binding */ isOverlayActive),
/* harmony export */   startOverlay: () => (/* binding */ startOverlay),
/* harmony export */   stopGrid: () => (/* binding */ stopOverlay),
/* harmony export */   stopOverlay: () => (/* binding */ stopOverlay),
/* harmony export */   stopOverlays: () => (/* binding */ stopOverlay)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _renderprogram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./renderprogram */ "./gl/renderprogram.ts");
/* harmony import */ var _instanceDetector__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./instanceDetector */ "./gl/instanceDetector.ts");
/**
 * Tile Grid & Collision Overlay - Renders tile boundaries and collision data in the game
 * Based on alt1gl tilemarkers.ts implementation using streamRenderCalls
 */



// Constants
const CHUNK_SIZE = 64;
const TILE_SIZE = 512;
const HEIGHT_SCALING = TILE_SIZE / 32;
// GL Constants
const GL_FLOAT = 0x1406;
const GL_UNSIGNED_BYTE = 0x1401;
const GL_FLOAT_MAT4 = 0x8B5C;
const GL_FLOAT_VEC3 = 0x8B51;
const GL_FLOAT_VEC2 = 0x8B50;
// Mask for filtering programs (skip non-floor shaders)
let wrongProgramMask = 1 << 5;
// Shaders matching tilemarkers.ts
const VERT_SHADER = `
    #version 330 core
    layout (location = 0) in vec3 aPos;
    layout (location = 6) in vec3 aColor;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    uniform highp vec2 uMouse;
    out vec4 ourColor;
    out vec3 FragPos;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        gl_Position = uViewProjMatrix * worldpos;
        FragPos = worldpos.xyz/worldpos.w;
        ourColor = vec4(aColor,1.0);
    }`;
const FRAG_SHADER = `
    #version 330 core

    in vec3 FragPos;
    in vec4 ourColor;

    uniform vec3 uInvSunDirection;
    uniform vec3 uSunColour;
    uniform vec3 uAmbientColour;

    out vec4 FragColor;

    void main() {
        vec3 dx = dFdx(FragPos);
        vec3 dy = dFdy(FragPos);
        vec3 norm = normalize(cross(dx, dy));

        vec3 lightDir = normalize(-uInvSunDirection);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * uSunColour;
        vec3 lighting = diffuse + uAmbientColour;
        vec3 finalColor = ourColor.rgb * lighting;

        FragColor = vec4(finalColor*0.5, ourColor.a);
    }`;
// Uniform type definitions
const uniformTypes = {
    float: { type: GL_FLOAT, len: 1, size: 4, int: false },
    vec2: { type: GL_FLOAT_VEC2, len: 2, size: 4 * 2, int: false },
    vec3: { type: GL_FLOAT_VEC3, len: 3, size: 4 * 3, int: false },
    mat4: { type: GL_FLOAT_MAT4, len: 16, size: 4 * 16, int: false },
};
// Uniform snapshot builder helper
class UniformSnapshotBuilder {
    args;
    mappings;
    view;
    buffer;
    constructor(init) {
        this.args = [];
        this.mappings = {};
        let offset = 0;
        for (const [name, type] of Object.entries(init)) {
            const t = uniformTypes[type];
            if (!t) {
                throw new Error("unknown uniform type " + type);
            }
            const entry = { name, length: 1, type: t.type, snapshotOffset: offset, snapshotSize: t.size };
            this.args.push(entry);
            this.mappings[name] = {
                write: (v) => {
                    if (v.length !== t.len) {
                        throw new Error("mismatch uniform length");
                    }
                    for (let i = 0; i < t.len; i++) {
                        this.view.setFloat32(entry.snapshotOffset + i * 4, v[i], true);
                    }
                },
                read: () => {
                    const out = [];
                    for (let i = 0; i < t.len; i++) {
                        out.push(this.view.getFloat32(entry.snapshotOffset + i * 4, true));
                    }
                    return out;
                }
            };
            offset += t.size;
        }
        const data = new ArrayBuffer(offset);
        this.view = new DataView(data);
        this.buffer = new Uint8Array(data);
    }
}
// Position matrix helper
function positionMatrix(x, y, z) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}
// Create collision mesh for a chunk
function mapsquareCollisionMesh(file) {
    const tallonly = true;
    const pos = [];
    const color = [];
    const index = [];
    const rootx = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootz = -CHUNK_SIZE / 2 * TILE_SIZE;
    let vertexindex = 0;
    const writevertex = (tilex, tilez, dx, dy, dz, vertcol) => {
        const tileindex = (tilex + tilez * CHUNK_SIZE) * 5;
        const y00 = file[tileindex + 0] * HEIGHT_SCALING * (1 - dx) * (1 - dz);
        const y01 = file[tileindex + 1] * HEIGHT_SCALING * dx * (1 - dz);
        const y10 = file[tileindex + 2] * HEIGHT_SCALING * (1 - dx) * dz;
        const y11 = file[tileindex + 3] * HEIGHT_SCALING * dx * dz;
        pos.push((tilex + dx) * TILE_SIZE + rootx, y00 + y01 + y10 + y11 + dy * TILE_SIZE, (tilez + dz) * TILE_SIZE + rootz);
        color.push(...vertcol);
        return vertexindex++;
    };
    const writebox = (tilex, tilez, dx, dy, dz, sizex, sizey, sizez, col) => {
        const v000 = writevertex(tilex, tilez, dx, dy, dz, col);
        const v001 = writevertex(tilex, tilez, dx + sizex, dy, dz, col);
        const v010 = writevertex(tilex, tilez, dx, dy + sizey, dz, col);
        const v011 = writevertex(tilex, tilez, dx + sizex, dy + sizey, dz, col);
        const v100 = writevertex(tilex, tilez, dx, dy, dz + sizez, col);
        const v101 = writevertex(tilex, tilez, dx + sizex, dy, dz + sizez, col);
        const v110 = writevertex(tilex, tilez, dx, dy + sizey, dz + sizez, col);
        const v111 = writevertex(tilex, tilez, dx + sizex, dy + sizey, dz + sizez, col);
        index.push(v000, v011, v001, v000, v010, v011);
        index.push(v001, v111, v101, v001, v011, v111);
        index.push(v000, v110, v010, v000, v100, v110);
        index.push(v010, v111, v011, v010, v110, v111);
        index.push(v000, v101, v100, v000, v001, v101);
        index.push(v100, v111, v110, v100, v101, v111);
    };
    const getcollision = (n, idx) => Math.floor(n / (3 ** idx)) % 3;
    for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const tileindex = (z * CHUNK_SIZE + x) * 5;
            const collision = file[tileindex + 4];
            const center = getcollision(collision, 0);
            if (tallonly ? center === 2 : center !== 0) {
                const height = center === 2 ? 1.6 : 0.3;
                writebox(x, z, 0.05, 0, 0.05, 0.9, height, 0.9, [80, 50, 50, 255]);
            }
            for (let dir = 0; dir < 4; dir++) {
                const side = getcollision(collision, 1 + dir);
                if (tallonly ? side === 2 : side !== 0) {
                    const height = side === 2 ? 1.8 : 0.5;
                    const vertcol = [190, 40, 40, 255];
                    if (dir === 0)
                        writebox(x, z, 0, 0, 0, 0.15, height, 1, vertcol);
                    if (dir === 1)
                        writebox(x, z, 0, 0, 0.85, 1, height, 0.15, vertcol);
                    if (dir === 2)
                        writebox(x, z, 0.85, 0, 0, 0.15, height, 1, vertcol);
                    if (dir === 3)
                        writebox(x, z, 0, 0, 0, 1, height, 0.15, vertcol);
                }
                const corner = getcollision(collision, 5 + dir);
                if (tallonly ? corner === 2 : corner !== 0) {
                    const height = corner === 2 ? 1.8 : 0.5;
                    const vertcol = [190, 40, 40, 255];
                    if (dir === 0)
                        writebox(x, z, 0, 0, 0.85, 0.15, height, 0.15, vertcol);
                    if (dir === 1)
                        writebox(x, z, 0.85, 0, 0.85, 0.15, height, 0.15, vertcol);
                    if (dir === 2)
                        writebox(x, z, 0.85, 0, 0, 0.15, height, 0.15, vertcol);
                    if (dir === 3)
                        writebox(x, z, 0, 0, 0, 0.15, height, 0.15, vertcol);
                }
            }
        }
    }
    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(color).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    };
}
// Create grid mesh (walkmesh blocking) for a chunk
function loadWalkmeshBlocking(file) {
    const pos = [];
    const color = [];
    const index = [];
    const rootx = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootz = -CHUNK_SIZE / 2 * TILE_SIZE;
    let vertexindex = 0;
    const diagcut = 0.2;
    const wallcol = [60, 20, 20, 255];
    const wallsize = 0.06;
    const bordercol = [0, 0, 0, 255];
    const bordersize = 0.012;
    const writevertex = (tilex, tilez, subx, subz, dy, vertcol, rotation) => {
        if (rotation % 2 === 1)
            [subx, subz] = [-subz, subx];
        if (rotation >= 2) {
            subx = -subx;
            subz = -subz;
        }
        const dx = 0.5 + subx;
        const dz = 0.5 + subz;
        dy += 1 / 32;
        const tileindex = (tilex + tilez * CHUNK_SIZE) * 5;
        const y00 = file[tileindex + 0] * HEIGHT_SCALING * (1 - dx) * (1 - dz);
        const y01 = file[tileindex + 1] * HEIGHT_SCALING * dx * (1 - dz);
        const y10 = file[tileindex + 2] * HEIGHT_SCALING * (1 - dx) * dz;
        const y11 = file[tileindex + 3] * HEIGHT_SCALING * dx * dz;
        pos.push((tilex + dx) * TILE_SIZE + rootx, y00 + y01 + y10 + y11 + dy * TILE_SIZE, (tilez + dz) * TILE_SIZE + rootz);
        color.push(...vertcol);
        return vertexindex++;
    };
    const writeline = (x, z, size, col, leftcut, rightcut, dir) => {
        const left = leftcut ? -diagcut : -0.5;
        const right = rightcut ? diagcut : 0.5;
        const v0 = writevertex(x, z, left, -0.5, 0, col, dir);
        const v1 = writevertex(x, z, right, -0.5, 0, col, dir);
        const v2 = writevertex(x, z, right - size, -0.5 + size, 0, col, dir);
        const v3 = writevertex(x, z, left + size, -0.5 + size, 0, col, dir);
        index.push(v0, v2, v1, v0, v3, v2);
    };
    const writediag = (x, z, size, col, dir) => {
        const v0 = writevertex(x, z, diagcut, -0.5, 0, col, dir);
        const v1 = writevertex(x, z, 0.5, -diagcut, 0, col, dir);
        const v2 = writevertex(x, z, 0.5 - size, -diagcut + size, 0, col, dir);
        const v3 = writevertex(x, z, diagcut - size, -0.5 + size, 0, col, dir);
        index.push(v0, v2, v1, v0, v3, v2);
    };
    const getcollision = (n, idx) => Math.floor(n / (3 ** idx)) % 3;
    const findcollision = (x, z, idx) => {
        if (x < 0 || z < 0 || x >= CHUNK_SIZE || z >= CHUNK_SIZE)
            return 0;
        const tileindex = (x + z * CHUNK_SIZE) * 5;
        const flags = file[tileindex + 4];
        return getcollision(flags, idx);
    };
    for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const center = findcollision(x, z, 0);
            if (center !== 0)
                continue;
            const west = findcollision(x, z, 1) !== 0 || findcollision(x - 1, z, 0) !== 0 || findcollision(x - 1, z, 3) !== 0;
            const south = findcollision(x, z, 4) !== 0 || findcollision(x, z - 1, 0) !== 0 || findcollision(x, z - 1, 2) !== 0;
            const east = findcollision(x, z, 3) !== 0 || findcollision(x + 1, z, 0) !== 0 || findcollision(x + 1, z, 1) !== 0;
            const north = findcollision(x, z, 2) !== 0 || findcollision(x, z + 1, 0) !== 0 || findcollision(x, z + 1, 4) !== 0;
            const sw = south && west;
            const se = south && east;
            const nw = north && west;
            const ne = north && east;
            if (se)
                writediag(x, z, wallsize, wallcol, 0);
            if (ne)
                writediag(x, z, wallsize, wallcol, 1);
            if (nw)
                writediag(x, z, wallsize, wallcol, 2);
            if (sw)
                writediag(x, z, wallsize, wallcol, 3);
            writeline(x, z, south ? wallsize : bordersize, south ? wallcol : bordercol, sw, se, 0);
            writeline(x, z, east ? wallsize : bordersize, east ? wallcol : bordercol, se, ne, 1);
            writeline(x, z, north ? wallsize : bordersize, north ? wallcol : bordercol, ne, nw, 2);
            writeline(x, z, west ? wallsize : bordersize, west ? wallcol : bordercol, nw, sw, 3);
        }
    }
    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(color).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    };
}
// Create overlay program
function floorOverlayProgram() {
    const uniforms = new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4",
        uAmbientColour: "vec3",
        uInvSunDirection: "vec3",
        uSunColour: "vec3",
        uMouse: "vec2"
    });
    const uniformsources = [
        { type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix" },
        { type: "program", name: "uAmbientColour", sourceName: "uAmbientColour" },
        { type: "program", name: "uInvSunDirection", sourceName: "uInvSunDirection" },
        { type: "program", name: "uSunColour", sourceName: "uSunColour" },
        { type: "builtin", name: "uMouse", sourceName: "mouse" }
    ];
    const program = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createProgram(VERT_SHADER, FRAG_SHADER, [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
        { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 3 }
    ], uniforms.args);
    return { uniforms, program, uniformsources };
}
// Floor overlay chunk class
class FloorOverlayChunk {
    chunkx;
    chunkz;
    chunklevel;
    stopped = false;
    loaded = false;
    failed = false;
    targetVertexObject;
    overlayhandles = [];
    lastMatched = 0;
    settings;
    async load() {
        // Instance chunks: no static height/collision data available from runeapps.org
        if (this.chunkx >= 100) {
            console.log(`[TileGrid] Instance chunk ${this.chunkx},${this.chunkz} - skipping static data fetch`);
            // Mark as loaded so we don't retry
            this.loaded = true;
            return;
        }
        const endpoint = "https://runeapps.org/s3/map4/live/";
        const fallbackEndpoint = "https://runeapps.org/s3/map4/1764321618/";
        try {
            const path = `heightmesh-${this.chunklevel}/${this.chunkx}-${this.chunkz}.bin`;
            let res = await fetch(`${endpoint}${path}`);
            if (res.status === 403) {
                res = await fetch(`${fallbackEndpoint}${path}`);
            }
            if (!res.ok) {
                this.failed = true;
                this.loaded = true;
                return;
            }
            const data = new Uint16Array(await res.arrayBuffer());
            if (this.settings.collision) {
                const mesh = mapsquareCollisionMesh(data);
                const vertex = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createVertexArray(mesh.index, [
                    { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
                    { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 3 },
                ]);
                const { program, uniforms, uniformsources } = floorOverlayProgram();
                uniforms.mappings.uModelMatrix.write(positionMatrix((this.chunkx + 0.5) * TILE_SIZE * CHUNK_SIZE, TILE_SIZE / 32, (this.chunkz + 0.5) * TILE_SIZE * CHUNK_SIZE));
                this.overlayhandles.push(_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({ skipProgramMask: wrongProgramMask, vertexObjectId: this.targetVertexObject }, program, vertex, {
                    uniformSources: uniformsources,
                    uniformBuffer: uniforms.buffer
                }));
            }
            if (this.settings.grid) {
                const mesh = loadWalkmeshBlocking(data);
                const vertex = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createVertexArray(mesh.index, [
                    { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
                    { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 3 },
                ]);
                const { program, uniforms, uniformsources } = floorOverlayProgram();
                uniforms.mappings.uModelMatrix.write(positionMatrix((this.chunkx + 0.5) * TILE_SIZE * CHUNK_SIZE, TILE_SIZE / 32, (this.chunkz + 0.5) * TILE_SIZE * CHUNK_SIZE));
                this.overlayhandles.push(_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({ skipProgramMask: wrongProgramMask, vertexObjectId: this.targetVertexObject }, program, vertex, {
                    uniformSources: uniformsources,
                    uniformBuffer: uniforms.buffer
                }));
            }
            console.log("[TileGrid] Loaded chunk", this.chunkx, this.chunkz);
            this.loaded = true;
            if (this.stopped) {
                this.stop();
            }
        }
        catch (e) {
            console.error("[TileGrid] Failed to load chunk:", e);
            this.failed = true;
            this.loaded = true;
        }
    }
    stop() {
        this.stopped = true;
        this.overlayhandles.forEach(q => q.stop());
        console.log("[TileGrid] Stopping chunk", this.chunkx, this.chunkz);
    }
    constructor(render, settings) {
        const uniform = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, render.program.uniforms.find(q => q.name === "uModelMatrix"));
        this.chunkx = Math.floor(uniform[0][12] / CHUNK_SIZE / TILE_SIZE);
        this.chunkz = Math.floor(uniform[0][14] / CHUNK_SIZE / TILE_SIZE);
        console.log("[TileGrid] Loading chunk", this.chunkx, this.chunkz);
        // Report floor chunk to instance detector for fingerprinting
        (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_2__.reportFloorChunk)(this.chunkx, this.chunkz);
        this.chunklevel = 0;
        this.targetVertexObject = render.vertexObjectId;
        this.settings = settings;
        this.load();
    }
}
// Active floor tracker
let activeTracker = null;
/**
 * Start the floor tracker for grid/collision overlays
 */
function floorTracker(settings) {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native) {
        console.error("[TileGrid] Native addon not available");
        return null;
    }
    const knownProgs = new WeakMap();
    const chunks = new Map();
    let stopped = false;
    const stream = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.streamRenderCalls({
        features: ["uniforms"],
        framecooldown: 500, // Check more frequently for floor changes
        skipProgramMask: wrongProgramMask,
        // Don't use skipVerticesMask - we handle deduplication via chunks map
        // This allows vertex objects to reappear after cleanup for floor switching
    }, renders => {
        if (stopped)
            return;
        let newChunks = 0;
        for (const render of renders) {
            if (!knownProgs.has(render.program)) {
                if (render.program.inputs.find(q => q.name === "aMaterialSettingsSlotXY3")) {
                    knownProgs.set(render.program, {});
                }
                else {
                    render.program.skipmask |= wrongProgramMask;
                    continue;
                }
            }
            // Check if we already have this chunk
            if (!chunks.has(render.vertexObjectId)) {
                chunks.set(render.vertexObjectId, new FloorOverlayChunk(render, settings));
                newChunks++;
            }
            chunks.get(render.vertexObjectId).lastMatched = Date.now();
        }
        if (newChunks > 0) {
            console.log("[TileGrid] floortrack: added", newChunks, "new chunks, total:", chunks.size);
        }
        // Clean up old chunks (5 minutes timeout for floor switching)
        const deadline = Date.now() - 5 * 60 * 1000;
        for (const [vao, chunk] of chunks) {
            if (chunk.lastMatched < deadline) {
                chunk.stop();
                chunks.delete(vao);
                console.log("[TileGrid] Cleaned up stale chunk");
            }
        }
    });
    const close = () => {
        stopped = true;
        stream.close();
        chunks.forEach(q => q.stop());
    };
    return { stream, close };
}
/**
 * Start grid/collision overlay
 */
function startOverlay(settings) {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native) {
        console.error("[TileGrid] Native addon not available");
        return false;
    }
    // Stop existing tracker
    stopOverlay();
    if (!settings.collision && !settings.grid) {
        return true;
    }
    activeTracker = floorTracker(settings);
    return activeTracker !== null;
}
/**
 * Stop all overlays
 */
function stopOverlay() {
    if (activeTracker) {
        activeTracker.close();
        activeTracker = null;
    }
}
/**
 * Check if overlay is active
 */
function isOverlayActive() {
    return activeTracker !== null;
}
/**
 * Check if native addon is available
 */
function isNativeAvailable() {
    return _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native != null;
}
// Legacy exports for backwards compatibility


// For debugging - expose floorTracker globally
if (typeof globalThis !== 'undefined') {
    globalThis.floorTracker = floorTracker;
}


/***/ },

/***/ "./gl/tileMarker.ts"
/*!**************************!*\
  !*** ./gl/tileMarker.ts ***!
  \**************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COLORS: () => (/* binding */ COLORS),
/* harmony export */   addMarker: () => (/* binding */ addMarker),
/* harmony export */   clearAllMarkers: () => (/* binding */ clearAllMarkers),
/* harmony export */   detectFloorProgram: () => (/* binding */ detectFloorProgram),
/* harmony export */   getActiveMarkers: () => (/* binding */ getActiveMarkers),
/* harmony export */   getMarkersInChunks: () => (/* binding */ getMarkersInChunks),
/* harmony export */   hasInstanceFloorChunks: () => (/* binding */ hasInstanceFloorChunks),
/* harmony export */   hasMarkerAt: () => (/* binding */ hasMarkerAt),
/* harmony export */   isNativeAvailable: () => (/* binding */ isNativeAvailable),
/* harmony export */   isRsReady: () => (/* binding */ isRsReady),
/* harmony export */   refreshFloorPrograms: () => (/* binding */ refreshFloorPrograms),
/* harmony export */   removeMarker: () => (/* binding */ removeMarker),
/* harmony export */   removeMarkerAt: () => (/* binding */ removeMarkerAt),
/* harmony export */   toggleMarker: () => (/* binding */ toggleMarker)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _heightData__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./heightData */ "./gl/heightData.ts");
/* harmony import */ var _instanceDetector__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./instanceDetector */ "./gl/instanceDetector.ts");
/* harmony import */ var _instanceHeightData__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./instanceHeightData */ "./gl/instanceHeightData.ts");
/**
 * Tile Marker - Creates and manages tile overlay markers
 * Uses patchrs_napi for GL overlay rendering
 *
 * Key concepts:
 * - Geometry uses CHUNK-LOCAL coordinates (relative to chunk center)
 * - Model matrix positions the chunk in world space
 * - Triggers on floor vertexObjectId, not programId
 */




// GL Constants
const GL_FLOAT = 0x1406;
const GL_UNSIGNED_BYTE = 0x1401;
const GL_FLOAT_MAT4 = 0x8B5C;
const GL_FLOAT_VEC3 = 0x8B51;
const GL_FLOAT_VEC2 = 0x8B50;
// Shaders matching alt1gl-main tilemarkers.ts
const TILE_VERT_SHADER = `
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 6) in vec3 aColor;

uniform highp mat4 uModelMatrix;
uniform highp mat4 uViewProjMatrix;

out vec4 ourColor;
out vec3 FragPos;

void main() {
    vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
    gl_Position = uViewProjMatrix * worldpos;
    FragPos = worldpos.xyz/worldpos.w;
    ourColor = vec4(aColor, 1.0);
}
`;
const TILE_FRAG_SHADER = `
#version 330 core
in vec3 FragPos;
in vec4 ourColor;

uniform vec3 uInvSunDirection;
uniform vec3 uSunColour;
uniform vec3 uAmbientColour;

out vec4 FragColor;

void main() {
    vec3 dx = dFdx(FragPos);
    vec3 dy = dFdy(FragPos);
    vec3 norm = normalize(cross(dx, dy));

    vec3 lightDir = normalize(-uInvSunDirection);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * uSunColour;
    vec3 lighting = clamp(diffuse + uAmbientColour, vec3(0.0), vec3(1.5));
    vec3 finalColor = ourColor.rgb * lighting;

    FragColor = vec4(finalColor * 0.5, ourColor.a);
}
`;
// Color presets
const COLORS = {
    RED: [1.0, 0.2, 0.2, 1.0],
    GREEN: [0.2, 1.0, 0.2, 1.0],
    BLUE: [0.2, 0.4, 1.0, 1.0],
    YELLOW: [1.0, 1.0, 0.2, 1.0],
    CYAN: [0.2, 1.0, 1.0, 1.0],
    MAGENTA: [1.0, 0.2, 1.0, 1.0],
    ORANGE: [1.0, 0.5, 0.1, 1.0],
    WHITE: [1.0, 1.0, 1.0, 1.0],
};
// Store for active markers
const activeMarkers = new Map();
// Cached program (reused for all markers)
let tileProgram = null;
// Map of chunk -> floor render info
const floorRenders = new Map();
// Track wrong program mask for filtering
let wrongProgramMask = 0;
// Cooldown for detectFloorProgram to prevent cascading retries via IPC
let lastFloorDetectTime = 0;
const FLOOR_DETECT_COOLDOWN = 3000; // 3 seconds minimum between detections
// VAO stability: require a new vertexObjectId to be seen in 2 consecutive refreshes
// before reporting it as changed. Prevents thrashing from flip-flopping VAO IDs.
const pendingVaoChanges = new Map(); // chunkKey → candidate vertexObjectId
/**
 * Check if any detected floor chunks are in instance space (chunkX >= 100).
 * More reliable than player position for determining instance state.
 */
function hasInstanceFloorChunks() {
    for (const floor of floorRenders.values()) {
        if (floor.chunkX >= 100)
            return true;
    }
    return false;
}
/**
 * Check if native addon is available
 */
function isNativeAvailable() {
    return _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native != null;
}
/**
 * Check if RS client is ready
 */
function isRsReady() {
    return _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native?.getRsReady() > 0;
}
/**
 * Generate a unique marker ID
 */
function generateMarkerId(config) {
    return `tile_${config.tileX}_${config.tileZ}_${config.level ?? 0}`;
}
/**
 * Create a translation matrix for positioning
 */
function createPositionMatrix(x, y, z) {
    const m = new Float32Array(16);
    // Identity with translation
    m[0] = 1;
    m[5] = 1;
    m[10] = 1;
    m[15] = 1;
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
}
/**
 * Create geometry for a single tile using CHUNK-LOCAL coordinates
 * This matches tilemarkers.ts approach exactly
 * If no height data is available, creates a flat tile at Y=0
 */
async function createTileGeometry(tileX, tileZ, level, color, renderTileX, renderTileZ) {
    // Public chunk/local — for height data from runeapps
    const { chunkX: publicChunkX, chunkZ: publicChunkZ } = (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.tileToChunk)(tileX, tileZ);
    const { localX: publicLocalX, localZ: publicLocalZ } = (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.tileToLocal)(tileX, tileZ);
    // Render chunk/local — for vertex positioning (defaults to public when no render coords)
    const rTileX = renderTileX ?? tileX;
    const rTileZ = renderTileZ ?? tileZ;
    const { chunkX: renderChunkX, chunkZ: renderChunkZ } = (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.tileToChunk)(rTileX, rTileZ);
    const { localX: renderLocalX, localZ: renderLocalZ } = (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.tileToLocal)(rTileX, rTileZ);
    // Fetch height data from PUBLIC chunk
    const heightData = await (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.fetchHeightData)(publicChunkX, publicChunkZ, level);
    if (!heightData) {
        console.warn(`[TileMarker] No height data for tile ${tileX},${tileZ} - using flat surface`);
    }
    // Root position (chunk center) - EXACTLY like tilemarkers.ts
    const rootx = -_heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE / 2 * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE;
    const rootz = -_heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE / 2 * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE;
    // Height offset to render above terrain
    const heightOffset = 1 / 32;
    // Get height at tile corners with bilinear interpolation
    // Falls back to flat surface (Y=0) if no height data
    // Height lookup uses PUBLIC local coords to index into public height data
    const getHeight = (subX, subZ) => {
        if (!heightData) {
            return heightOffset * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE; // Flat surface with small offset
        }
        const clampedX = Math.max(0, Math.min(_heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE - 1, heightLocalX));
        const clampedZ = Math.max(0, Math.min(_heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE - 1, heightLocalZ));
        const tileIndex = (clampedX + clampedZ * _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE) * 5;
        const dx = 0.5 + subX;
        const dz = 0.5 + subZ;
        const y00 = heightData[tileIndex + 0] * _heightData__WEBPACK_IMPORTED_MODULE_1__.HEIGHT_SCALING * (1 - dx) * (1 - dz);
        const y01 = heightData[tileIndex + 1] * _heightData__WEBPACK_IMPORTED_MODULE_1__.HEIGHT_SCALING * dx * (1 - dz);
        const y10 = heightData[tileIndex + 2] * _heightData__WEBPACK_IMPORTED_MODULE_1__.HEIGHT_SCALING * (1 - dx) * dz;
        const y11 = heightData[tileIndex + 3] * _heightData__WEBPACK_IMPORTED_MODULE_1__.HEIGHT_SCALING * dx * dz;
        return y00 + y01 + y10 + y11 + heightOffset * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE;
    };
    // Vertex position uses RENDER local coords (where the tile sits in the render chunk)
    const tileLocalX = renderChunkX >= 100 ? renderLocalX : renderLocalX + 1;
    const tileLocalZ = renderLocalZ;
    // Height data indexed by PUBLIC local coords (into the public chunk's height array)
    const heightLocalX = publicChunkX >= 100 ? publicLocalX : publicLocalX + 1;
    const heightLocalZ = publicLocalZ;
    // Create quad vertices in chunk-local coordinates
    // Corners: SW, SE, NE, NW
    const pos = [];
    const colorData = [];
    // Convert color to 0-255 range for UNSIGNED_BYTE
    const colorBytes = [
        Math.floor(color[0] * 255),
        Math.floor(color[1] * 255),
        Math.floor(color[2] * 255)
    ];
    // SW corner (subX=-0.5, subZ=-0.5)
    pos.push((tileLocalX + 0) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootx);
    pos.push(getHeight(-0.5, -0.5));
    pos.push((tileLocalZ + 0) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootz);
    colorData.push(...colorBytes);
    // SE corner (subX=0.5, subZ=-0.5)
    pos.push((tileLocalX + 1) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootx);
    pos.push(getHeight(0.5, -0.5));
    pos.push((tileLocalZ + 0) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootz);
    colorData.push(...colorBytes);
    // NE corner (subX=0.5, subZ=0.5)
    pos.push((tileLocalX + 1) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootx);
    pos.push(getHeight(0.5, 0.5));
    pos.push((tileLocalZ + 1) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootz);
    colorData.push(...colorBytes);
    // NW corner (subX=-0.5, subZ=0.5)
    pos.push((tileLocalX + 0) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootx);
    pos.push(getHeight(-0.5, 0.5));
    pos.push((tileLocalZ + 1) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE + rootz);
    colorData.push(...colorBytes);
    const positions = Float32Array.from(pos);
    const colors = Uint8Array.from(colorData);
    // Indices: two triangles forming a quad (counterclockwise winding)
    const indices = new Uint8Array([
        0, 2, 1, // SE triangle
        0, 3, 2 // NW triangle
    ]);
    console.log(`[TileMarker] Created geometry for tile ${tileX},${tileZ} (render: ${rTileX},${rTileZ}) in chunk ${renderChunkX},${renderChunkZ}`);
    console.log(`[TileMarker] Render local: ${tileLocalX},${tileLocalZ}, height local: ${heightLocalX},${heightLocalZ}`);
    return { positions, colors, indices, chunkX: renderChunkX, chunkZ: renderChunkZ, hasHeightData: !!heightData };
}
/**
 * Initialize the tile program (call once)
 */
function initTileProgram() {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native) {
        console.error('[TileMarker] Native addon not initialized');
        return null;
    }
    if (tileProgram) {
        return tileProgram;
    }
    try {
        // Attribute inputs - color is vec3 (RGB), not vec4
        const inputs = [
            { name: 'aPos', location: 0, type: GL_FLOAT, length: 3 },
            { name: 'aColor', location: 6, type: GL_UNSIGNED_BYTE, length: 3 }
        ];
        // Uniform arguments - layout for snapshot buffer (matching alt1gl-main)
        // Total size: 64 (model) + 64 (viewproj) + 12 (ambient) + 12 (sundir) + 12 (suncolor) = 164 bytes
        const uniforms = [
            { name: 'uModelMatrix', type: GL_FLOAT_MAT4, length: 1, snapshotOffset: 0, snapshotSize: 64 },
            { name: 'uViewProjMatrix', type: GL_FLOAT_MAT4, length: 1, snapshotOffset: 64, snapshotSize: 64 },
            { name: 'uAmbientColour', type: GL_FLOAT_VEC3, length: 1, snapshotOffset: 128, snapshotSize: 12 },
            { name: 'uInvSunDirection', type: GL_FLOAT_VEC3, length: 1, snapshotOffset: 140, snapshotSize: 12 },
            { name: 'uSunColour', type: GL_FLOAT_VEC3, length: 1, snapshotOffset: 152, snapshotSize: 12 }
        ];
        tileProgram = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createProgram(TILE_VERT_SHADER, TILE_FRAG_SHADER, inputs, uniforms);
        console.log('[TileMarker] Tile program created');
        return tileProgram;
    }
    catch (e) {
        console.error('[TileMarker] Failed to create tile program:', e);
        return null;
    }
}
/**
 * Detect floor renders from game - stores vertexObjectId for each chunk
 * Floor programs have the 'aMaterialSettingsSlotXY3' input attribute
 */
async function detectFloorProgram(force = false) {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native)
        return false;
    // Cooldown: avoid cascading IPC calls when multiple markers fail simultaneously
    const now = Date.now();
    if (!force && now - lastFloorDetectTime < FLOOR_DETECT_COOLDOWN) {
        return floorRenders.size > 0;
    }
    lastFloorDetectTime = now;
    try {
        console.log('[TileMarker] Detecting floor renders...');
        const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({
            maxframes: 1,
            features: ["uniforms"],
            skipHandles: true,
        });
        console.log(`[TileMarker] Got ${renders.length} renders`);
        // Build new floor map from recording results
        // Only replace existing data if we actually found floors — recording may
        // return 0 renders when MAX_CONCURRENT_RECORDINGS is hit (e.g. passive
        // stream occupies a slot), and destroying good data on empty results
        // leaves no fallback for markers.
        const newFloorRenders = new Map();
        let floorCount = 0;
        // Look for floor renders - has 'aMaterialSettingsSlotXY3' input
        for (const render of renders) {
            if (!render.program)
                continue;
            // Floor meshes have this specific input attribute
            const isFloor = render.program.inputs.some(i => i.name === 'aMaterialSettingsSlotXY3');
            if (!isFloor)
                continue;
            floorCount++;
            // Extract chunk position from uModelMatrix
            const modelMatrixUniform = render.program.uniforms.find(u => u.name === 'uModelMatrix');
            if (!modelMatrixUniform || !render.uniformState)
                continue;
            const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset);
            const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
            const y = view.getFloat32(modelMatrixUniform.snapshotOffset + 13 * 4, true);
            const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);
            const chunkX = Math.floor(x / _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE);
            const chunkZ = Math.floor(z / _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE);
            const chunkKey = `${chunkX},${chunkZ}`;
            // Build wrong program mask for filtering (like TileOverlayManager)
            wrongProgramMask |= 1 << (render.program.programId % 32);
            // Store floor render info for this chunk
            if (!newFloorRenders.has(chunkKey)) {
                newFloorRenders.set(chunkKey, {
                    program: render.program,
                    vertexObjectId: render.vertexObjectId,
                    chunkX,
                    chunkZ,
                    modelY: y,
                    meshHash: `floor_${render.program.programId}_${chunkKey}`
                });
                // Report floor chunk to instance detector for fingerprinting
                (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_2__.reportFloorChunk)(chunkX, chunkZ);
                console.log(`[TileMarker] Floor chunk ${chunkKey}: programId=${render.program.programId}, vertexObjectId=${render.vertexObjectId}`);
            }
        }
        // Only replace floor data if we actually found floors
        if (newFloorRenders.size > 0) {
            floorRenders.clear();
            for (const [key, value] of newFloorRenders) {
                floorRenders.set(key, value);
            }
        }
        else if (renders.length === 0) {
            // Recording was rejected (0 renders) — keep existing data intact
            console.warn(`[TileMarker] Recording returned 0 renders (concurrent limit?), keeping ${floorRenders.size} existing floor entries`);
        }
        console.log(`[TileMarker] Found ${floorCount} floor renders, ${floorRenders.size} unique chunks`);
        if (floorRenders.size > 0) {
            // Log first floor's uniforms for debugging
            const firstFloor = floorRenders.values().next().value;
            if (firstFloor) {
                const uniformNames = firstFloor.program.uniforms.map((u) => u.name).join(', ');
                console.log(`[TileMarker] Floor program uniforms: ${uniformNames}`);
            }
        }
        return floorRenders.size > 0;
    }
    catch (e) {
        console.error('[TileMarker] Failed to detect floor program:', e);
        return false;
    }
}
/**
 * Re-detect floor programs and check if any vertexObjectIds changed.
 * Returns chunk keys where the floor mesh ID changed (overlays need recreating).
 */
async function refreshFloorPrograms(preRecordedRenders) {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native && !preRecordedRenders)
        return [];
    try {
        const renders = preRecordedRenders ?? await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({
            maxframes: 1,
            features: ["uniforms"],
            skipHandles: true,
        });
        const changedChunks = [];
        for (const render of renders) {
            if (!render.program)
                continue;
            const isFloor = render.program.inputs.some((i) => i.name === 'aMaterialSettingsSlotXY3');
            if (!isFloor)
                continue;
            const modelMatrixUniform = render.program.uniforms.find((u) => u.name === 'uModelMatrix');
            if (!modelMatrixUniform || !render.uniformState)
                continue;
            const view = new DataView(render.uniformState.buffer, render.uniformState.byteOffset);
            const x = view.getFloat32(modelMatrixUniform.snapshotOffset + 12 * 4, true);
            const y = view.getFloat32(modelMatrixUniform.snapshotOffset + 13 * 4, true);
            const z = view.getFloat32(modelMatrixUniform.snapshotOffset + 14 * 4, true);
            const chunkX = Math.floor(x / _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE);
            const chunkZ = Math.floor(z / _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE / _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE);
            const chunkKey = `${chunkX},${chunkZ}`;
            wrongProgramMask |= 1 << (render.program.programId % 32);
            const existing = floorRenders.get(chunkKey);
            if (existing) {
                if (existing.vertexObjectId !== render.vertexObjectId) {
                    // VAO changed — check if this is the same candidate as last refresh
                    const pending = pendingVaoChanges.get(chunkKey);
                    if (pending === render.vertexObjectId) {
                        // Stable for 2 consecutive refreshes — apply the change
                        console.log(`[TileMarker] Floor mesh stable change for chunk ${chunkKey}: vertexObjectId ${existing.vertexObjectId} -> ${render.vertexObjectId}`);
                        existing.vertexObjectId = render.vertexObjectId;
                        existing.modelY = y;
                        pendingVaoChanges.delete(chunkKey);
                        changedChunks.push(chunkKey);
                    }
                    else {
                        // First time seeing this new VAO — mark as pending, don't apply yet
                        pendingVaoChanges.set(chunkKey, render.vertexObjectId);
                    }
                }
                else {
                    // VAO matches current — clear any pending change
                    pendingVaoChanges.delete(chunkKey);
                }
            }
            else {
                // New floor chunk discovered
                floorRenders.set(chunkKey, {
                    program: render.program,
                    vertexObjectId: render.vertexObjectId,
                    chunkX,
                    chunkZ,
                    modelY: y,
                    meshHash: `floor_${render.program.programId}_${chunkKey}`
                });
                (0,_instanceDetector__WEBPACK_IMPORTED_MODULE_2__.reportFloorChunk)(chunkX, chunkZ);
                changedChunks.push(chunkKey);
            }
        }
        // NOTE: Do NOT remove floor entries for chunks not in the current frame.
        // The game only renders visible/on-screen chunks each frame. Off-screen
        // chunks still have valid floor meshes and their vertexObjectIds remain stable.
        // Floor entries are only cleared on full re-detection (detectFloorProgram).
        return changedChunks;
    }
    catch (e) {
        console.error('[TileMarker] Failed to refresh floor programs:', e);
        return [];
    }
}
/**
 * Get all active markers in specific chunks
 */
function getMarkersInChunks(chunkKeys) {
    const keySet = new Set(chunkKeys);
    return Array.from(activeMarkers.values()).filter(m => keySet.has(`${m.chunkX},${m.chunkZ}`));
}
/**
 * Get floor render info for a specific chunk
 */
function getFloorForChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    return floorRenders.get(key) ?? null;
}
/**
 * Find the nearest floor render to a given chunk
 * Returns the closest floor by Manhattan distance
 */
function getNearestFloor(targetChunkX, targetChunkZ) {
    if (floorRenders.size === 0)
        return null;
    let nearestFloor = null;
    let nearestDistance = Infinity;
    for (const floor of floorRenders.values()) {
        const distance = Math.abs(floor.chunkX - targetChunkX) + Math.abs(floor.chunkZ - targetChunkZ);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestFloor = floor;
        }
    }
    if (nearestFloor) {
        console.log(`[TileMarker] Nearest floor to chunk ${targetChunkX},${targetChunkZ} is chunk ${nearestFloor.chunkX},${nearestFloor.chunkZ} (distance: ${nearestDistance})`);
    }
    return nearestFloor;
}
/**
 * Get any available floor render (first one found)
 */
function getAnyFloor() {
    const first = floorRenders.values().next();
    return first.done ? null : first.value;
}
/**
 * Add a tile marker
 */
async function addMarker(config) {
    if (!_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native) {
        console.error('[TileMarker] Native addon not initialized');
        return null;
    }
    const id = generateMarkerId(config);
    // Remove existing marker at same position
    if (activeMarkers.has(id)) {
        await removeMarker(id);
    }
    // Ensure program is initialized
    const program = initTileProgram();
    if (!program)
        return null;
    const level = config.level ?? 0;
    const color = config.color ?? COLORS.CYAN;
    // Create geometry: PUBLIC coords for height data, RENDER coords for vertex positioning
    const geometry = await createTileGeometry(config.tileX, config.tileZ, level, color, config.renderTileX, config.renderTileZ);
    // For floor VAO matching: use renderTile coords if provided (instance coords),
    // otherwise use the same coords as the geometry (public/mainland).
    const renderX = config.renderTileX ?? config.tileX;
    const renderZ = config.renderTileZ ?? config.tileZ;
    const { chunkX: renderChunkX, chunkZ: renderChunkZ } = (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.tileToChunk)(renderX, renderZ);
    // Get floor render for the RENDER chunk (instance floor VAO), or fall back.
    let floorRender = getFloorForChunk(renderChunkX, renderChunkZ)
        ?? getNearestFloor(renderChunkX, renderChunkZ)
        ?? getAnyFloor();
    if (!floorRender) {
        console.error(`[TileMarker] No floor renders available at all - cannot create marker`);
        return null;
    }
    try {
        // Convert positions to Uint8Array view
        const posBuffer = new Uint8Array(geometry.positions.buffer);
        const colorBuffer = geometry.colors;
        // Create render inputs for vertex array - color is vec3 with stride 3
        const renderInputs = [
            {
                buffer: posBuffer,
                enabled: true,
                location: 0,
                offset: 0,
                scalartype: GL_FLOAT,
                stride: 12, // 3 floats * 4 bytes
                vectorlength: 3,
                normalized: false
            },
            {
                buffer: colorBuffer,
                enabled: true,
                location: 6,
                offset: 0,
                scalartype: GL_UNSIGNED_BYTE,
                stride: 3, // 3 bytes (RGB)
                vectorlength: 3,
                normalized: true
            }
        ];
        // Convert indices to Uint16Array wrapped in Uint8Array (like TileOverlayManager)
        const indexBuffer = new Uint8Array(new Uint16Array(geometry.indices).buffer);
        // Create vertex array
        const vertexArray = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createVertexArray(indexBuffer, renderInputs);
        // Uniform sources - copy lighting uniforms from floor program (matching alt1gl-main)
        const uniformSources = [
            { name: 'uViewProjMatrix', sourceName: 'uViewProjMatrix', type: 'program' },
            { name: 'uAmbientColour', sourceName: 'uAmbientColour', type: 'program' },
            { name: 'uInvSunDirection', sourceName: 'uInvSunDirection', type: 'program' },
            { name: 'uSunColour', sourceName: 'uSunColour', type: 'program' }
        ];
        // Create uniform buffer with model matrix positioned at chunk center
        const uniformBuffer = new Uint8Array(164); // Total size: 64+64+12+12+12
        // Position matrix - place at chunk center in WORLD SPACE.
        // When renderTile coords are provided (instance offset mode), use render chunk for
        // world positioning (so it appears in the instance) but use public height data.
        const worldChunkX = renderChunkX;
        const worldChunkZ = renderChunkZ;
        // With height data: vertex Y values are absolute world heights, baseY is just HEIGHT_SCALING offset
        // Without height data: vertices are flat (Y≈32), so baseY must match the floor's modelY
        // Instance (renderChunk >= 100): height data is relative offsets from captured baseWorldY
        let baseY;
        if (worldChunkX >= 100) {
            const instanceBaseY = (0,_instanceHeightData__WEBPACK_IMPORTED_MODULE_3__.getInstanceChunkBaseHeight)(worldChunkX, worldChunkZ);
            baseY = (instanceBaseY ?? floorRender.modelY) + _heightData__WEBPACK_IMPORTED_MODULE_1__.HEIGHT_SCALING;
        }
        else if (geometry.hasHeightData) {
            baseY = _heightData__WEBPACK_IMPORTED_MODULE_1__.HEIGHT_SCALING;
        }
        else {
            // Fallback: no height data available, use floor's model Y to stay at correct altitude
            baseY = floorRender.modelY;
        }
        const modelMatrix = createPositionMatrix((worldChunkX + 0.5) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE, baseY, (worldChunkZ + 0.5) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE);
        // Copy model matrix to uniform buffer
        new Float32Array(uniformBuffer.buffer, 0, 16).set(modelMatrix);
        // Render ranges - length is number of INDICES
        const renderRanges = [{ start: 0, length: geometry.indices.length }];
        const { chunkX: publicLogChunkX, chunkZ: publicLogChunkZ } = (0,_heightData__WEBPACK_IMPORTED_MODULE_1__.tileToChunk)(config.tileX, config.tileZ);
        console.log(`[TileMarker] Creating overlay on chunk ${worldChunkX},${worldChunkZ}${renderChunkX !== publicLogChunkX ? ` (public: ${publicLogChunkX},${publicLogChunkZ})` : ''}`);
        console.log(`[TileMarker] Using vertexObjectId: ${floorRender.vertexObjectId}`);
        console.log(`[TileMarker] Model matrix position: ${(worldChunkX + 0.5) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE}, ${baseY}, ${(worldChunkZ + 0.5) * _heightData__WEBPACK_IMPORTED_MODULE_1__.TILE_SIZE * _heightData__WEBPACK_IMPORTED_MODULE_1__.CHUNK_SIZE} (floorModelY=${floorRender.modelY})`);
        console.log(`[TileMarker] Render ranges: ${JSON.stringify(renderRanges)}`);
        // Begin overlay - trigger on floor's vertexObjectId
        const overlay = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({
            skipProgramMask: wrongProgramMask,
            vertexObjectId: floorRender.vertexObjectId
        }, program, vertexArray, {
            uniformSources: uniformSources,
            uniformBuffer: uniformBuffer,
            ranges: renderRanges
        });
        if (!overlay) {
            console.error(`[TileMarker] beginOverlay returned null/undefined for tile ${config.tileX},${config.tileZ}`);
            return null;
        }
        console.log(`[TileMarker] Overlay created: hasStop=${typeof overlay.stop === 'function'}, handleId=${overlay.__handleId ?? 'none'}`);
        const marker = {
            id,
            config,
            overlay,
            chunkX: geometry.chunkX,
            chunkZ: geometry.chunkZ
        };
        activeMarkers.set(id, marker);
        console.log(`[TileMarker] Added marker at ${config.tileX}, ${config.tileZ} (chunk ${geometry.chunkX},${geometry.chunkZ})`);
        return marker;
    }
    catch (e) {
        console.error('[TileMarker] Failed to create marker:', e);
        return null;
    }
}
/**
 * Remove a tile marker by ID
 */
async function removeMarker(id) {
    const marker = activeMarkers.get(id);
    if (!marker)
        return false;
    if (marker.overlay) {
        try {
            marker.overlay.stop();
        }
        catch (e) {
            console.error('[TileMarker] Error removing overlay:', e);
        }
    }
    activeMarkers.delete(id);
    console.log(`[TileMarker] Removed marker ${id}`);
    return true;
}
/**
 * Remove marker by tile position
 */
async function removeMarkerAt(tileX, tileZ, level = 0) {
    const id = generateMarkerId({ tileX, tileZ, level });
    return removeMarker(id);
}
/**
 * Clear all markers
 */
async function clearAllMarkers() {
    for (const [id] of activeMarkers) {
        await removeMarker(id);
    }
    console.log('[TileMarker] All markers cleared');
}
/**
 * Get all active markers
 */
function getActiveMarkers() {
    return Array.from(activeMarkers.values());
}
/**
 * Check if a marker exists at position
 */
function hasMarkerAt(tileX, tileZ, level = 0) {
    const id = generateMarkerId({ tileX, tileZ, level });
    return activeMarkers.has(id);
}
/**
 * Toggle marker at position
 */
async function toggleMarker(config) {
    const id = generateMarkerId(config);
    if (activeMarkers.has(id)) {
        await removeMarker(id);
        return false;
    }
    else {
        await addMarker(config);
        return true;
    }
}


/***/ },

/***/ "./state/markerStore.ts"
/*!******************************!*\
  !*** ./state/markerStore.ts ***!
  \******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MarkerStore: () => (/* binding */ MarkerStore),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var idb_keyval__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! idb-keyval */ "../node_modules/idb-keyval/dist/index.js");
/* harmony import */ var immer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! immer */ "../node_modules/immer/dist/immer.mjs");
/**
 * MarkerStore - Immer-based singleton store following RS3QuestMapBuddy pattern
 */


const STORAGE_KEY = "rs3tm:marker_state:v4";
const CURRENT_VERSION = 4;
const DEFAULT_GROUP = {
    id: "default",
    name: "Default",
    color: "#ff4444",
    visible: true,
};
const initialState = {
    version: CURRENT_VERSION,
    markers: [],
    groups: [DEFAULT_GROUP],
    selection: {
        floor: 0,
        selectedMarkerId: null,
        activeGroupId: "default",
    },
    ui: {
        panelOpen: true,
        lowProfileMode: true,
        followPlayer: true,
        showGrid: false,
        defaultColor: "#ff4444",
        clickToAddMode: true,
        showOverlayGrid: false,
        showOverlayCollision: false,
    },
    playerPosition: null,
    instanceOffset: null,
    meshMappings: [],
    currentInstance: null,
    knownInstances: [],
};
let state = initialState;
const listeners = new Set();
const rawListeners = new Set();
// Memoization cache for visibleMarkersForMap to prevent infinite re-render loops
// with useSyncExternalStore (getSnapshot must return stable references).
// We cache both inputs (for fast invalidation) and the previous result
// (for deep comparison to return the same array ref when output is equivalent).
let _mapMarkersCache = null;
function arraysDeepEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const ma = a[i], mb = b[i];
        if (ma.id !== mb.id || ma.x !== mb.x || ma.y !== mb.y ||
            ma.floor !== mb.floor || ma.color !== mb.color ||
            ma.label !== mb.label || ma.groupId !== mb.groupId)
            return false;
    }
    return true;
}
// Debounced persistence
let persistTimer = null;
const schedulePersist = () => {
    if (persistTimer !== null)
        window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
        void (0,idb_keyval__WEBPACK_IMPORTED_MODULE_0__.set)(STORAGE_KEY, JSON.stringify(state));
        persistTimer = null;
    }, 150);
};
function migrate(raw) {
    if (!raw || typeof raw.version !== "number")
        return initialState;
    // Migrate: merge with initialState to add new fields
    const migrated = {
        ...initialState,
        ...raw,
        version: CURRENT_VERSION,
        // Deep merge nested objects to preserve new fields
        selection: { ...initialState.selection, ...raw.selection },
        ui: { ...initialState.ui, ...raw.ui },
    };
    // Migrate from v1 to v2 (add groups)
    if (!migrated.groups || migrated.groups.length === 0) {
        migrated.groups = [DEFAULT_GROUP];
    }
    if (!migrated.selection.activeGroupId) {
        migrated.selection.activeGroupId = "default";
    }
    // Assign ungrouped markers to default group
    migrated.markers = migrated.markers.map(m => ({
        ...m,
        groupId: m.groupId || "default",
    }));
    // Migrate from v2 to v3 (add instance support)
    if (!migrated.currentInstance) {
        migrated.currentInstance = null;
    }
    if (!migrated.knownInstances) {
        migrated.knownInstances = [];
    }
    // Existing markers without instanceContext are main map markers
    migrated.markers = migrated.markers.map(m => ({
        ...m,
        instanceContext: m.instanceContext ?? null,
    }));
    // Migrate from v3 to v4 (fingerprint -> entrance-linking)
    if (raw.version <= 3) {
        // Migrate marker instanceContexts: rename fields
        migrated.markers = migrated.markers.map(m => {
            if (!m.instanceContext)
                return m;
            const oldCtx = m.instanceContext;
            return {
                ...m,
                instanceContext: {
                    entranceKey: oldCtx.instanceFingerprint ?? oldCtx.entranceKey ?? '',
                    instanceLabel: oldCtx.instanceLabel ?? '',
                    entryTileX: oldCtx.originX ?? oldCtx.entryTileX ?? 0,
                    entryTileZ: oldCtx.originZ ?? oldCtx.entryTileZ ?? 0,
                },
            };
        });
        // Migrate knownInstances: rename fields
        migrated.knownInstances = migrated.knownInstances.map((k) => ({
            entranceKey: k.instanceFingerprint ?? k.entranceKey ?? '',
            instanceLabel: k.instanceLabel ?? '',
            entryTileX: k.originX ?? k.entryTileX ?? 0,
            entryTileZ: k.originZ ?? k.entryTileZ ?? 0,
        }));
        // Migrate currentInstance if present
        if (migrated.currentInstance) {
            const oldInst = migrated.currentInstance;
            migrated.currentInstance = {
                isInstance: oldInst.isInstance ?? false,
                minTileX: oldInst.minTileX ?? 0,
                minTileZ: oldInst.minTileZ ?? 0,
                maxTileX: oldInst.maxTileX ?? 0,
                maxTileZ: oldInst.maxTileZ ?? 0,
                entranceX: oldInst.originX ?? oldInst.entranceX ?? 0,
                entranceZ: oldInst.originZ ?? oldInst.entranceZ ?? 0,
                entryTileX: oldInst.originX ?? oldInst.entryTileX ?? 0,
                entryTileZ: oldInst.originZ ?? oldInst.entryTileZ ?? 0,
                label: oldInst.label ?? null,
                entranceKey: oldInst.chunkFingerprint ?? oldInst.entranceKey ?? '',
                detectedAt: oldInst.detectedAt ?? Date.now(),
            };
        }
    }
    return migrated;
}
const isEqualShallow = (a, b) => {
    if (Object.is(a, b))
        return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null)
        return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length)
        return false;
    for (const k of ak) {
        if (!Object.prototype.hasOwnProperty.call(b, k))
            return false;
        if (!Object.is(a[k], b[k]))
            return false;
    }
    return true;
};
function generateId(prefix = "marker") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
const MarkerStore = {
    // Load from IDB at app boot
    async initialize() {
        try {
            let raw = await (0,idb_keyval__WEBPACK_IMPORTED_MODULE_0__.get)(STORAGE_KEY);
            // Fall back to v3 storage key for migration
            if (!raw) {
                raw = await (0,idb_keyval__WEBPACK_IMPORTED_MODULE_0__.get)("rs3tm:marker_state:v3");
            }
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            state = migrate(parsed);
        }
        catch {
            // ignore; keep initial
        }
    },
    getState() {
        return state;
    },
    // Derived selectors that compute on demand (not persisted)
    derived: {
        selectedMarker() {
            const { markers, selection } = state;
            if (!selection.selectedMarkerId)
                return undefined;
            return markers.find((m) => m.id === selection.selectedMarkerId);
        },
        markersOnCurrentFloor() {
            const { markers, selection } = state;
            return markers.filter((m) => m.floor === selection.floor);
        },
        activeGroup() {
            const { groups, selection } = state;
            return groups.find((g) => g.id === selection.activeGroupId);
        },
        visibleMarkersOnCurrentFloor() {
            const { markers, groups, selection } = state;
            const visibleGroupIds = new Set(groups.filter(g => g.visible).map(g => g.id));
            return markers.filter((m) => m.floor === selection.floor &&
                visibleGroupIds.has(m.groupId || "default"));
        },
        visibleMarkersForMap() {
            const { markers, groups, selection, currentInstance } = state;
            // Fast path: if all input refs unchanged, return cached result
            if (_mapMarkersCache &&
                _mapMarkersCache.markers === markers &&
                _mapMarkersCache.groups === groups &&
                _mapMarkersCache.floor === selection.floor &&
                _mapMarkersCache.currentInstance === currentInstance) {
                return _mapMarkersCache.result;
            }
            const visibleGroupIds = new Set(groups.filter(g => g.visible).map(g => g.id));
            const isInstance = currentInstance?.isInstance ?? false;
            const entranceKey = currentInstance?.entranceKey ?? '';
            const filtered = markers.filter((m) => {
                const floorMatch = m.floor === selection.floor;
                const groupMatch = visibleGroupIds.has(m.groupId || "default");
                if (!floorMatch || !groupMatch) {
                    return false;
                }
                if (isInstance) {
                    if (!m.instanceContext) {
                        return false;
                    }
                    const keyMatch = entranceKey && m.instanceContext.entranceKey === entranceKey;
                    return keyMatch;
                }
                else {
                    if (m.instanceContext) {
                        return false;
                    }
                    return true;
                }
            });
            // Resolve instance marker coords to absolute for map display
            let result;
            if (isInstance && currentInstance) {
                result = filtered.map(m => {
                    if (m.instanceContext) {
                        const absX = m.x + currentInstance.entryTileX;
                        const absY = m.y + currentInstance.entryTileZ;
                        return {
                            ...m,
                            x: absX,
                            y: absY,
                        };
                    }
                    return m;
                });
            }
            else {
                result = filtered;
            }
            // Deep compare output: return previous result ref if contents are identical
            // This prevents useSyncExternalStore infinite loops when inputs change
            // but computed output is the same (e.g. currentInstance ref changes but
            // origin coords are the same, producing identical resolved markers)
            if (_mapMarkersCache && arraysDeepEqual(_mapMarkersCache.result, result)) {
                _mapMarkersCache = { markers, groups, floor: selection.floor, currentInstance, result: _mapMarkersCache.result };
                return _mapMarkersCache.result;
            }
            _mapMarkersCache = { markers, groups, floor: selection.floor, currentInstance, result };
            return result;
        },
        isInInstance() {
            return state.currentInstance?.isInstance ?? false;
        },
        instanceMarkers() {
            return state.markers.filter(m => m.instanceContext != null);
        },
        mainMapMarkers() {
            return state.markers.filter(m => !m.instanceContext);
        },
        currentInstanceLabel() {
            return state.currentInstance?.label ?? null;
        },
    },
    // Subscribe to specific slices to minimize re-renders
    subscribe(selector, cb) {
        let last = selector(state, this.derived);
        cb(last);
        const listener = (_changed, next) => {
            const selected = selector(next, this.derived);
            if (!isEqualShallow(selected, last)) {
                last = selected;
                cb(selected);
            }
        };
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    // Subscribe to any state change (for useSyncExternalStore)
    subscribeRaw(cb) {
        rawListeners.add(cb);
        return () => rawListeners.delete(cb);
    },
    // Low-level update API with Immer recipe
    update(recipe, changedKeys) {
        const next = (0,immer__WEBPACK_IMPORTED_MODULE_1__.produce)(state, recipe);
        if (next === state)
            return;
        state = next;
        schedulePersist();
        const changed = new Set(changedKeys ?? []);
        for (const l of Array.from(listeners))
            l(changed, state);
        for (const l of Array.from(rawListeners))
            l();
    },
    // Convenience setters
    setSelection(patch) {
        this.update((draft) => {
            draft.selection = { ...draft.selection, ...patch };
        }, ["selection"]);
    },
    setUi(patch) {
        this.update((draft) => {
            draft.ui = { ...draft.ui, ...patch };
        }, ["ui"]);
    },
    setPlayerPosition(position) {
        // Skip no-op: avoid triggering listeners when position hasn't changed
        const cur = state.playerPosition;
        if (cur && position && cur.x === position.x && cur.y === position.y && cur.floor === position.floor)
            return;
        if (!cur && !position)
            return;
        this.update((draft) => {
            draft.playerPosition = position;
        }, ["playerPosition"]);
    },
    setInstanceOffset(offset) {
        this.update((draft) => {
            draft.instanceOffset = offset;
        }, ["instanceOffset"]);
    },
    setMeshMappings(mappings) {
        this.update((draft) => {
            draft.meshMappings = mappings;
        }, ["meshMappings"]);
    },
    setInstanceContext(context) {
        // Skip no-op: avoid triggering listeners when instance context hasn't meaningfully changed
        const cur = state.currentInstance;
        if (!cur && !context)
            return;
        if (cur && context &&
            cur.isInstance === context.isInstance &&
            cur.entranceX === context.entranceX &&
            cur.entranceZ === context.entranceZ &&
            cur.entryTileX === context.entryTileX &&
            cur.entryTileZ === context.entryTileZ &&
            cur.minTileX === context.minTileX &&
            cur.minTileZ === context.minTileZ &&
            cur.maxTileX === context.maxTileX &&
            cur.maxTileZ === context.maxTileZ &&
            cur.entranceKey === context.entranceKey &&
            cur.label === context.label)
            return;
        this.update((draft) => {
            draft.currentInstance = context;
        }, ["currentInstance"]);
    },
    labelCurrentInstance(label) {
        this.update((draft) => {
            if (draft.currentInstance) {
                draft.currentInstance.label = label;
                // Add/update in known instances
                const key = draft.currentInstance.entranceKey;
                if (key) {
                    const existing = draft.knownInstances.findIndex((i) => i.entranceKey === key);
                    const ctx = {
                        entranceKey: key,
                        instanceLabel: label,
                        entryTileX: draft.currentInstance.entryTileX,
                        entryTileZ: draft.currentInstance.entryTileZ,
                    };
                    if (existing >= 0) {
                        draft.knownInstances[existing] = ctx;
                    }
                    else {
                        draft.knownInstances.push(ctx);
                    }
                }
            }
        }, ["currentInstance", "knownInstances"]);
    },
    // Save or update a known instance entry (auto-saves entrance key for re-identification)
    saveKnownInstance(entranceKey, entryTileX, entryTileZ, label, offset) {
        this.update((draft) => {
            const existing = draft.knownInstances.findIndex((i) => i.entranceKey === entranceKey);
            if (existing >= 0) {
                // Update entry tile (may differ between sessions), keep existing label if no new one
                draft.knownInstances[existing].entryTileX = entryTileX;
                draft.knownInstances[existing].entryTileZ = entryTileZ;
                if (label) {
                    draft.knownInstances[existing].instanceLabel = label;
                }
                if (offset) {
                    draft.knownInstances[existing].savedOffset = offset;
                }
            }
            else {
                draft.knownInstances.push({
                    entranceKey,
                    instanceLabel: label || "",
                    entryTileX,
                    entryTileZ,
                    savedOffset: offset ?? undefined,
                });
            }
        }, ["knownInstances"]);
    },
    getKnownInstances() {
        return state.knownInstances;
    },
    // Group management
    addGroup(name, color) {
        const group = {
            id: generateId("group"),
            name,
            color: color || state.ui.defaultColor,
            visible: true,
        };
        this.update((draft) => {
            draft.groups.push(group);
            draft.selection.activeGroupId = group.id;
        }, ["groups", "selection"]);
        return group;
    },
    removeGroup(id) {
        if (id === "default")
            return; // Can't delete default group
        this.update((draft) => {
            draft.groups = draft.groups.filter((g) => g.id !== id);
            // Move markers from deleted group to default
            draft.markers = draft.markers.map((m) => m.groupId === id ? { ...m, groupId: "default" } : m);
            // Switch to default if active group was deleted
            if (draft.selection.activeGroupId === id) {
                draft.selection.activeGroupId = "default";
            }
        }, ["groups", "markers", "selection"]);
    },
    updateGroup(id, patch) {
        this.update((draft) => {
            const group = draft.groups.find((g) => g.id === id);
            if (group) {
                Object.assign(group, patch);
            }
        }, ["groups"]);
    },
    toggleGroupVisibility(id) {
        this.update((draft) => {
            const group = draft.groups.find((g) => g.id === id);
            if (group) {
                group.visible = !group.visible;
            }
        }, ["groups"]);
    },
    // Marker management
    addMarker(x, y, floor, color, label) {
        const activeGroup = state.groups.find(g => g.id === state.selection.activeGroupId);
        const currentInstance = state.currentInstance;
        // Determine coordinates and instance context
        let markerX = x;
        let markerY = y;
        let instanceCtx = null;
        if (currentInstance?.isInstance && !state.instanceOffset) {
            // Old path (no offset): store as relative coordinates from entry tile
            markerX = x - currentInstance.entryTileX;
            markerY = y - currentInstance.entryTileZ;
            instanceCtx = {
                entranceKey: currentInstance.entranceKey,
                instanceLabel: currentInstance.label || "",
                entryTileX: currentInstance.entryTileX,
                entryTileZ: currentInstance.entryTileZ,
            };
        }
        // When instanceOffset is active: x,y are public coords from the map.
        // Store directly — the offset handles instance↔public mapping.
        const marker = {
            id: generateId("marker"),
            x: markerX,
            y: markerY,
            floor: floor ?? state.selection.floor,
            color: color ?? activeGroup?.color ?? state.ui.defaultColor,
            label,
            groupId: state.selection.activeGroupId || "default",
            instanceContext: instanceCtx,
        };
        console.log(`[MarkerStore] addMarker at (${markerX},${markerY}) floor=${marker.floor}${instanceCtx ? ` instance="${instanceCtx.entranceKey}"` : ''}`);
        this.update((draft) => {
            draft.markers.push(marker);
        }, ["markers"]);
        return marker;
    },
    removeMarker(id) {
        this.update((draft) => {
            draft.markers = draft.markers.filter((m) => m.id !== id);
            if (draft.selection.selectedMarkerId === id) {
                draft.selection.selectedMarkerId = null;
            }
        }, ["markers", "selection"]);
    },
    updateMarker(id, patch) {
        this.update((draft) => {
            const marker = draft.markers.find((m) => m.id === id);
            if (marker) {
                Object.assign(marker, patch);
            }
        }, ["markers"]);
    },
    clearMarkers(floor, groupId) {
        this.update((draft) => {
            if (floor !== undefined && groupId !== undefined) {
                draft.markers = draft.markers.filter((m) => !(m.floor === floor && m.groupId === groupId));
            }
            else if (floor !== undefined) {
                draft.markers = draft.markers.filter((m) => m.floor !== floor);
            }
            else if (groupId !== undefined) {
                draft.markers = draft.markers.filter((m) => m.groupId !== groupId);
            }
            else {
                draft.markers = [];
            }
            draft.selection.selectedMarkerId = null;
        }, ["markers", "selection"]);
    },
    importMarkers(markers) {
        this.update((draft) => {
            // Assign new IDs to avoid conflicts
            const imported = markers.map((m) => ({
                ...m,
                id: generateId("marker"),
                groupId: m.groupId || state.selection.activeGroupId || "default",
            }));
            draft.markers.push(...imported);
        }, ["markers"]);
    },
    exportMarkers() {
        return [...state.markers];
    },
    exportGroup(groupId) {
        const group = state.groups.find(g => g.id === groupId);
        if (!group)
            return null;
        const markers = state.markers.filter(m => m.groupId === groupId);
        return { group, markers };
    },
    reset() {
        this.update((draft) => {
            draft.version = initialState.version;
            draft.markers = [];
            draft.groups = [DEFAULT_GROUP];
            draft.selection = { ...initialState.selection };
            draft.ui = { ...initialState.ui };
            draft.playerPosition = null;
            draft.currentInstance = null;
            draft.knownInstances = [];
        }, ["markers", "groups", "selection", "ui", "playerPosition", "currentInstance", "knownInstances"]);
    },
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MarkerStore);


/***/ },

/***/ "./state/useMarkerSelector.ts"
/*!************************************!*\
  !*** ./state/useMarkerSelector.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useMarkerSelector: () => (/* binding */ useMarkerSelector)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _markerStore__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./markerStore */ "./state/markerStore.ts");
/**
 * React hook for subscribing to MarkerStore state slices.
 * Uses useReducer + useEffect for subscription to avoid React 19's
 * useSyncExternalStore tearing detection which causes infinite loops
 * when getSnapshot produces derived values with new references.
 */


function isEqualShallow(a, b) {
    if (Object.is(a, b))
        return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null)
        return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length)
        return false;
    for (const k of ak) {
        if (!Object.prototype.hasOwnProperty.call(b, k))
            return false;
        if (!Object.is(a[k], b[k]))
            return false;
    }
    return true;
}
// Force-update reducer: incrementing a counter always produces a new state,
// which triggers a re-render. The actual selected value is read from a ref
// during render (not stored in React state), so React never compares it.
const forceUpdateReducer = (c) => c + 1;
function useMarkerSelector(selector) {
    const [, forceUpdate] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useReducer)(forceUpdateReducer, 0);
    const selectorRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(selector);
    const valueRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(undefined);
    const initializedRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
    // Always keep the selector ref fresh
    selectorRef.current = selector;
    // Compute current value during render (synchronous, no tearing issues)
    const currentValue = selectorRef.current(_markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.getState(), _markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.derived);
    // On first render, initialize the ref
    if (!initializedRef.current) {
        valueRef.current = currentValue;
        initializedRef.current = true;
    }
    // If the value changed since last render, update the ref
    if (!isEqualShallow(valueRef.current, currentValue)) {
        valueRef.current = currentValue;
    }
    // Subscribe to store changes — use useLayoutEffect to subscribe
    // before browser paint, avoiding visual tearing
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect)(() => {
        const unsub = _markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.subscribeRaw(() => {
            const next = selectorRef.current(_markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.getState(), _markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.derived);
            if (!isEqualShallow(valueRef.current, next)) {
                valueRef.current = next;
                forceUpdate(0);
            }
        });
        return unsub;
    }, []);
    return valueRef.current;
}


/***/ },

/***/ "./state/useVisibleMarkers.ts"
/*!************************************!*\
  !*** ./state/useVisibleMarkers.ts ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useVisibleMarkers: () => (/* binding */ useVisibleMarkers)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _markerStore__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./markerStore */ "./state/markerStore.ts");
/**
 * React hook for subscribing to visible markers for the map.
 * Uses useReducer + useLayoutEffect for subscription to avoid React 19's
 * useSyncExternalStore tearing detection which causes infinite loops
 * when derived selectors produce arrays with new references.
 */


function markersEqual(a, b) {
    if (a === b)
        return true;
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const ma = a[i], mb = b[i];
        if (ma.id !== mb.id || ma.x !== mb.x || ma.y !== mb.y ||
            ma.floor !== mb.floor || ma.color !== mb.color ||
            ma.label !== mb.label || ma.groupId !== mb.groupId)
            return false;
    }
    return true;
}
const forceUpdateReducer = (c) => c + 1;
function useVisibleMarkers() {
    const [, forceUpdate] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useReducer)(forceUpdateReducer, 0);
    const valueRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
    // Compute current value during render
    const currentValue = _markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.derived.visibleMarkersForMap();
    // Initialize or update ref if value changed
    if (valueRef.current === null || !markersEqual(valueRef.current, currentValue)) {
        valueRef.current = currentValue;
    }
    // Subscribe to store changes
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useLayoutEffect)(() => {
        const unsub = _markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.subscribeRaw(() => {
            const next = _markerStore__WEBPACK_IMPORTED_MODULE_1__.MarkerStore.derived.visibleMarkersForMap();
            if (valueRef.current === null || !markersEqual(valueRef.current, next)) {
                valueRef.current = next;
                forceUpdate(0);
            }
        });
        return unsub;
    }, []);
    return valueRef.current;
}


/***/ },

/***/ "./utils/mapFunctions.ts"
/*!*******************************!*\
  !*** ./utils/mapFunctions.ts ***!
  \*******************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_CENTER: () => (/* binding */ DEFAULT_CENTER),
/* harmony export */   DEFAULT_ZOOM: () => (/* binding */ DEFAULT_ZOOM),
/* harmony export */   gameToLatLng: () => (/* binding */ gameToLatLng),
/* harmony export */   getBounds: () => (/* binding */ getBounds),
/* harmony export */   getInstanceBounds: () => (/* binding */ getInstanceBounds),
/* harmony export */   getMapOptions: () => (/* binding */ getMapOptions),
/* harmony export */   getTileLayerConfig: () => (/* binding */ getTileLayerConfig),
/* harmony export */   isValidFloor: () => (/* binding */ isValidFloor),
/* harmony export */   latLngToGame: () => (/* binding */ latLngToGame)
/* harmony export */ });
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! leaflet */ "../node_modules/leaflet/dist/leaflet-src.js");
/* harmony import */ var leaflet__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(leaflet__WEBPACK_IMPORTED_MODULE_0__);
/**
 * RS3 Map utilities - coordinate system and Leaflet CRS configuration
 * Based on RS3QuestMapBuddy patterns
 */

// RS3 map dimensions
const mapSize = {
    chunks: { x: 100, y: 200 },
    chunkSize: { x: 64, y: 64 },
};
const chunkOffset = { x: 16, z: 16 };
/**
 * Get the Leaflet bounds for the RS3 main map
 */
function getBounds() {
    return new leaflet__WEBPACK_IMPORTED_MODULE_0__.LatLngBounds([0, 0], [mapSize.chunks.y * mapSize.chunkSize.y, mapSize.chunks.x * mapSize.chunkSize.x]);
}
/**
 * Get extended bounds that include instance space.
 * Instance space starts at X=6400 and can extend to ~16384.
 */
function getInstanceBounds() {
    return new leaflet__WEBPACK_IMPORTED_MODULE_0__.LatLngBounds([0, 0], [16384, 16384]);
}
/**
 * Get configured map options with RS3's CRS transformation
 */
function getMapOptions() {
    const crs = leaflet__WEBPACK_IMPORTED_MODULE_0__.CRS.Simple;
    // Apply RS3 coordinate transformation
    // @ts-ignore - Leaflet typing doesn't expose transformation setter
    crs.transformation = leaflet__WEBPACK_IMPORTED_MODULE_0__.transformation(1, chunkOffset.x + 0.5, -1, mapSize.chunks.y * mapSize.chunkSize.y - (chunkOffset.z + 0.5));
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
function getTileLayerConfig(floor) {
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
function gameToLatLng(x, y) {
    return [y, x];
}
/**
 * Convert Leaflet LatLng to game coordinates (tile center)
 * Returns the center of the clicked tile (e.g., clicking tile 3200-3201 returns 3200.5)
 */
function latLngToGame(lat, lng) {
    // Get tile center: floor to get tile corner, then add 0.5 for center
    return { x: Math.floor(lng) + 0.5, y: Math.floor(lat) + 0.5 };
}
/**
 * Check if a floor value is valid
 */
function isValidFloor(floor) {
    return floor >= -1 && floor <= 3;
}
/**
 * Default center point (near Lumbridge)
 */
const DEFAULT_CENTER = [3233, 3222];
const DEFAULT_ZOOM = 4;


/***/ }

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["vendor-react","vendor-leaflet","vendors"], () => (__webpack_exec__("./app/entrance/index.tsx")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);
//# sourceMappingURL=main.bundle.js.map