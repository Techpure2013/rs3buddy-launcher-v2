(globalThis["webpackChunk"] = globalThis["webpackChunk"] || []).push([["main"],{

/***/ "./app/components/NpcApp.tsx"
/*!***********************************!*\
  !*** ./app/components/NpcApp.tsx ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ App)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "../node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _gl_npcOverlay__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../gl/npcOverlay */ "./gl/npcOverlay.ts");
/* harmony import */ var _gl_npcCataloger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../gl/npcCataloger */ "./gl/npcCataloger.ts");
/* harmony import */ var _types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../types/npcBufferHash */ "./types/npcBufferHash.ts");
/* harmony import */ var _types_npcApi__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../types/npcApi */ "./types/npcApi.ts");
/* harmony import */ var _gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../gl/renderprogram */ "./gl/renderprogram.ts");
// NPC Recorder App






// Dark theme colors (matching The_Sentinel)
const theme = {
    bgDark: "#1a1a1a",
    bgMedium: "#252525",
    bgLight: "#2d2d2d",
    bgInput: "#333",
    borderColor: "#333",
    borderLight: "#444",
    textPrimary: "#fff",
    textSecondary: "#e0e0e0",
    textMuted: "#888",
    textDim: "#666",
    colorSuccess: "#27ae60",
    colorDanger: "#e74c3c",
    colorWarning: "#f39c12",
    colorInfo: "#3498db",
    colorTeal: "#00897B",
    colorPurple: "#9C27B0",
};
// Component to render a texture to a canvas
function TextureView({ tex, size = 128 }) {
    const canvasRef = react__WEBPACK_IMPORTED_MODULE_0___default().useRef(null);
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        const cnv = canvasRef.current;
        if (cnv && tex) {
            cnv.width = tex.width;
            cnv.height = tex.height;
            const ctx = cnv.getContext("2d");
            if (ctx) {
                if (tex instanceof ImageData) {
                    ctx.putImageData(tex, 0, 0);
                }
                else {
                    ctx.drawImage(tex, 0, 0);
                }
            }
        }
    }, [tex]);
    return react__WEBPACK_IMPORTED_MODULE_0___default().createElement("canvas", { ref: canvasRef, style: { width: size, height: size, imageRendering: "pixelated" } });
}
function NpcPreview({ npc, size = 96 }) {
    const [sprites, setSprites] = react__WEBPACK_IMPORTED_MODULE_0___default().useState({ front: null, side: null });
    const [loading, setLoading] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(true);
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        let cancelled = false;
        let currentSprites = { front: null, side: null };
        setLoading(true);
        setSprites({ front: null, side: null });
        const renderSprites = async () => {
            try {
                const renderfunc = (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__.getRenderFunc)(npc.render);
                const [front, side] = await Promise.all([
                    (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__.renderToSprite)([renderfunc], size / 512, "front", { skipTextures: size <= 128 }),
                    (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__.renderToSprite)([renderfunc], size / 512, "side", { skipTextures: size <= 128 }),
                ]);
                if (!cancelled) {
                    currentSprites = { front, side };
                    setSprites({ front, side });
                    setLoading(false);
                }
                else {
                    // Clean up if cancelled
                    front?.close?.();
                    side?.close?.();
                }
            }
            catch (e) {
                console.error("[NpcPreview] Failed to render sprites:", e);
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        renderSprites();
        return () => {
            cancelled = true;
            // Clean up old sprites when unmounting or re-rendering
            currentSprites.front?.close?.();
            currentSprites.side?.close?.();
        };
    }, [npc.vaoId, size]);
    if (loading) {
        return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { color: theme.textMuted, fontSize: "10px" } }, "Loading...")),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { color: theme.textMuted, fontSize: "10px" } }, "Loading..."))));
    }
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
        sprites.front ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(TextureView, { tex: sprites.front.imageData, size: size }))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" } })),
        sprites.side ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(TextureView, { tex: sprites.side.imageData, size: size }))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" } }))));
}
function NpcGroupPreview({ group, size = 96 }) {
    const [sprites, setSprites] = react__WEBPACK_IMPORTED_MODULE_0___default().useState({ front: null, side: null });
    const [loading, setLoading] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(true);
    // Create a unique key from all mesh VAO IDs
    const groupKey = group.allMeshes.map(m => m.vaoId).sort().join("-");
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        let cancelled = false;
        let currentSprites = { front: null, side: null };
        setLoading(true);
        setSprites({ front: null, side: null });
        const renderSprites = async () => {
            try {
                // Get render functions for ALL meshes in the group
                const renderFuncs = group.renders.map(r => (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__.getRenderFunc)(r));
                const [front, side] = await Promise.all([
                    (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__.renderToSprite)(renderFuncs, size / 512, "front", { skipTextures: size <= 128 }),
                    (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_5__.renderToSprite)(renderFuncs, size / 512, "side", { skipTextures: size <= 128 }),
                ]);
                if (!cancelled) {
                    currentSprites = { front, side };
                    setSprites({ front, side });
                    setLoading(false);
                }
                else {
                    // Clean up if cancelled
                    front?.close?.();
                    side?.close?.();
                }
            }
            catch (e) {
                console.error("[NpcGroupPreview] Failed to render sprites:", e);
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        renderSprites();
        return () => {
            cancelled = true;
            // Clean up old sprites when unmounting or re-rendering
            currentSprites.front?.close?.();
            currentSprites.side?.close?.();
        };
    }, [groupKey, size]);
    if (loading) {
        return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { color: theme.textMuted, fontSize: "10px" } }, "Loading...")),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { color: theme.textMuted, fontSize: "10px" } }, "Loading..."))));
    }
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
        sprites.front ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(TextureView, { tex: sprites.front.imageData, size: size }))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" } })),
        sprites.side ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement(TextureView, { tex: sprites.side.imageData, size: size }))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" } }))));
}
function App() {
    // Tab state
    const [activeTab, setActiveTab] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("cataloger");
    // NPC Lookup tab state
    const [lookupQuery, setLookupQuery] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    const [lookupResults, setLookupResults] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    const [lookupSearching, setLookupSearching] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    const [lookupError, setLookupError] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    const [selectedLookupNpc, setSelectedLookupNpc] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    const [loadingNpcDetails, setLoadingNpcDetails] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    // Cataloger state (uses grouped meshes for combined hashes)
    const [pendingGroups, setPendingGroups] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    const [currentGroupIndex, setCurrentGroupIndex] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(0);
    const [focusedMeshIndex, setFocusedMeshIndex] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(0); // Which mesh in the group is highlighted
    const [catalogEntries, setCatalogEntries] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    const [isScanning, setIsScanning] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false); // Scanning in progress indicator
    // Database lookup state (keyed by hex hash string like "0x1A2B3C4D")
    const [npcDbResults, setNpcDbResults] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(new Map());
    const [submitModalNpc, setSubmitModalNpc] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    const [submitModalGroup, setSubmitModalGroup] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    const [submitNpcIdInput, setSubmitNpcIdInput] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    const [submitStatus, setSubmitStatus] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    const [submitIsVariant, setSubmitIsVariant] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    const [submitVariantName, setSubmitVariantName] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    // Quick Add NPC submission
    const [jsonSubmitStatus, setJsonSubmitStatus] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    const [jsonSubmitting, setJsonSubmitting] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    const [isVariant, setIsVariant] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    const [variantName, setVariantName] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    // NPC name search state
    const [npcSearchQuery, setNpcSearchQuery] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    const [npcSearchResults, setNpcSearchResults] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    const [npcSearching, setNpcSearching] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(false);
    const [selectedSearchNpc, setSelectedSearchNpc] = react__WEBPACK_IMPORTED_MODULE_0___default().useState(null);
    // Variant search state (Lookup tab)
    const [lookupMode, setLookupMode] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("npcs");
    const [variantSearchResults, setVariantSearchResults] = react__WEBPACK_IMPORTED_MODULE_0___default().useState([]);
    // Quick Add form fields (replacing JSON textarea)
    const [formNpcId, setFormNpcId] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    const [formNpcName, setFormNpcName] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    const [formBufferHash, setFormBufferHash] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    // Server toggle
    const [usingLocal, setUsingLocal] = react__WEBPACK_IMPORTED_MODULE_0___default().useState((0,_types_npcApi__WEBPACK_IMPORTED_MODULE_4__.isLocal)());
    // Manual NPC entry state (for unknown NPCs)
    const [manualNpcName, setManualNpcName] = react__WEBPACK_IMPORTED_MODULE_0___default().useState("");
    const overlayRef = react__WEBPACK_IMPORTED_MODULE_0___default().useRef(null);
    const apiClientRef = react__WEBPACK_IMPORTED_MODULE_0___default().useRef(null);
    const catalogerRef = react__WEBPACK_IMPORTED_MODULE_0___default().useRef(null);
    // Initialize overlay, cataloger, and API client
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        overlayRef.current = new _gl_npcOverlay__WEBPACK_IMPORTED_MODULE_1__.NpcOverlay();
        catalogerRef.current = new _gl_npcCataloger__WEBPACK_IMPORTED_MODULE_2__.NpcCataloger();
        apiClientRef.current = (0,_types_npcApi__WEBPACK_IMPORTED_MODULE_4__.getNpcApiClient)();
        setCatalogEntries(catalogerRef.current.getVertexList().entries);
        // Cleanup function for window close/beforeunload
        const cleanupOverlays = () => {
            console.log("[NpcOverlay] Cleaning up overlays on close...");
            overlayRef.current?.stopAll();
            catalogerRef.current?.clearAll();
        };
        // Handle window/tab close - ensures overlays are cleared when client closes
        window.addEventListener("beforeunload", cleanupOverlays);
        return () => {
            window.removeEventListener("beforeunload", cleanupOverlays);
            cleanupOverlays();
        };
    }, []);
    // Auto-suggest variant name when "Add as Variant" is checked in submit modal
    react__WEBPACK_IMPORTED_MODULE_0___default().useEffect(() => {
        if (!submitIsVariant || !submitModalNpc)
            return;
        const npcId = selectedSearchNpc?.entries[0]?.id ?? parseInt(submitNpcIdInput, 10);
        if (isNaN(npcId) || npcId <= 0)
            return;
        const api = (0,_types_npcApi__WEBPACK_IMPORTED_MODULE_4__.getNpcApiClient)();
        api.getVariants(npcId).then(({ next_variant_name }) => {
            if (next_variant_name && !submitVariantName) {
                setSubmitVariantName(next_variant_name);
            }
        }).catch(() => { });
    }, [submitIsVariant, submitModalNpc, selectedSearchNpc, submitNpcIdInput, manualNpcName]);
    // Lookup tab - search NPCs by name (grouped results)
    const lookupTimeoutRef = react__WEBPACK_IMPORTED_MODULE_0___default().useRef(null);
    const handleLookupSearch = (query) => {
        setLookupQuery(query);
        setSelectedLookupNpc(null);
        if (lookupTimeoutRef.current) {
            clearTimeout(lookupTimeoutRef.current);
        }
        if (query.length < 2) {
            setLookupResults([]);
            return;
        }
        lookupTimeoutRef.current = window.setTimeout(async () => {
            if (!apiClientRef.current) {
                console.error("[Lookup] No API client!");
                setLookupError("API client not initialized");
                return;
            }
            setLookupSearching(true);
            setLookupError(null);
            try {
                console.log("[Lookup] Searching for:", query);
                const results = await apiClientRef.current.searchByNameGrouped(query, 500);
                console.log("[Lookup] Got", results.length, "grouped results");
                setLookupResults(results);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error("[Lookup] Search failed:", msg);
                setLookupError(msg);
                setLookupResults([]);
            }
            setLookupSearching(false);
        }, 300);
    };
    // Lookup tab - search variants by name
    const handleVariantSearch = (query) => {
        setLookupQuery(query);
        setSelectedLookupNpc(null);
        if (lookupTimeoutRef.current) {
            clearTimeout(lookupTimeoutRef.current);
        }
        if (query.length < 2) {
            setVariantSearchResults([]);
            return;
        }
        lookupTimeoutRef.current = window.setTimeout(async () => {
            if (!apiClientRef.current)
                return;
            setLookupSearching(true);
            setLookupError(null);
            try {
                const results = await apiClientRef.current.searchVariantsByName(query, 50);
                setVariantSearchResults(results);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setLookupError(msg);
                setVariantSearchResults([]);
            }
            setLookupSearching(false);
        }, 300);
    };
    // Fetch full NPC details when selecting from lookup
    const handleSelectLookupNpc = async (npcId) => {
        if (!apiClientRef.current)
            return;
        setLoadingNpcDetails(true);
        try {
            const npc = await apiClientRef.current.getById(npcId);
            setSelectedLookupNpc(npc);
        }
        catch (e) {
            console.error("Failed to fetch NPC details:", e);
        }
        setLoadingNpcDetails(false);
    };
    // Search NPCs by name (for submit modal)
    const searchTimeoutRef = react__WEBPACK_IMPORTED_MODULE_0___default().useRef(null);
    const handleNpcSearch = (query) => {
        setNpcSearchQuery(query);
        setSelectedSearchNpc(null);
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (query.length < 2) {
            setNpcSearchResults([]);
            return;
        }
        // Debounce the search
        searchTimeoutRef.current = window.setTimeout(async () => {
            if (!apiClientRef.current)
                return;
            setNpcSearching(true);
            try {
                const results = await apiClientRef.current.searchByNameGrouped(query, 500);
                setNpcSearchResults(results);
            }
            catch (e) {
                console.error("NPC search failed:", e);
                setNpcSearchResults([]);
            }
            setNpcSearching(false);
        }, 300);
    };
    // Submit a buffer hash to the database (uses combined hash if group is available)
    const handleSubmitBufferHash = async () => {
        if (!apiClientRef.current || !submitModalNpc)
            return;
        // Get NPC ID and name from selected search result or manual input
        let npcId;
        let npcName;
        if (selectedSearchNpc) {
            npcId = selectedSearchNpc.entries[0].id;
            npcName = selectedSearchNpc.entries[0].name;
        }
        else {
            npcId = parseInt(submitNpcIdInput, 10);
            npcName = manualNpcName.trim();
            if (isNaN(npcId) || npcId <= 0) {
                setSubmitStatus({ type: "error", message: "Please enter a valid NPC ID" });
                return;
            }
            if (!submitIsVariant && !npcName) {
                setSubmitStatus({ type: "error", message: "Please enter the NPC name" });
                return;
            }
        }
        // Use combined hash from group if available, otherwise use individual mesh hash
        let bufferHash;
        if (submitModalGroup) {
            const groupHashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractGroupedHashes)(submitModalGroup.renders);
            bufferHash = groupHashes.combinedHash;
        }
        else {
            const bufferHashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractBufferHashes)(submitModalNpc.render);
            bufferHash = bufferHashes.posBufferHash;
        }
        if (bufferHash === "0x00000000") {
            setSubmitStatus({ type: "error", message: "Could not extract buffer hash from NPC" });
            return;
        }
        setSubmitStatus(null);
        let result;
        if (submitIsVariant) {
            // Add as variant to existing NPC
            result = await apiClientRef.current.addVariant({
                npcId,
                bufferHash,
                variantName: submitVariantName.trim() || undefined,
            });
        }
        else {
            // Use the submitNpcData method that handles both create and update
            result = await apiClientRef.current.submitNpcData({
                npcId,
                name: npcName,
                bufferHash,
            });
        }
        if (result.success) {
            const successMsg = submitIsVariant
                ? `Variant hash added to ${npcName} (ID: ${npcId})${submitVariantName ? ` as "${submitVariantName}"` : ""}!`
                : `Buffer hash linked to ${npcName} (ID: ${npcId})!`;
            setSubmitStatus({ type: "success", message: successMsg });
            // Refresh the lookup to see the new entry
            const response = await apiClientRef.current.lookupByBufferHash(bufferHash);
            if (response.found && response.npc) {
                const newResults = new Map(npcDbResults);
                newResults.set(bufferHash, response.npc ? {
                    npc: response.npc,
                    matchType: response.matchType,
                    variant_name: response.variant_name,
                } : null);
                setNpcDbResults(newResults);
            }
            // Close modal after a short delay
            setTimeout(() => {
                setSubmitModalNpc(null);
                setSubmitModalGroup(null);
                setSubmitNpcIdInput("");
                setManualNpcName("");
                setNpcSearchQuery("");
                setNpcSearchResults([]);
                setSelectedSearchNpc(null);
                setSubmitStatus(null);
                setSubmitIsVariant(false);
                setSubmitVariantName("");
            }, 1500);
        }
        else {
            setSubmitStatus({ type: "error", message: result.message || "Failed to submit NPC data" });
        }
    };
    // === Cataloger Functions ===
    // Scan nearby NPCs (all visible) with aggressive capture
    const handleScanAllVisible = async () => {
        if (!catalogerRef.current)
            return;
        setIsScanning(true);
        try {
            // Stop all existing overlays before starting new scan
            await catalogerRef.current.clearAll();
            if (overlayRef.current) {
                await overlayRef.current.stopAll();
            }
            // Single-frame scan with no radius filter (0 = all visible)
            const allGroups = await catalogerRef.current.scanNearbyNpcsGrouped(0);
            console.log("[Cataloger] Scan All Visible returned", allGroups.length, "NPC groups");
            setPendingGroups(allGroups);
            setCurrentGroupIndex(0);
            setFocusedMeshIndex(0);
            // Look up groups in the database by combined hash
            if (allGroups.length > 0) {
                const groups = allGroups.map(p => p.group);
                await lookupGroupsInDb(groups);
                // Highlight first NPC group's main mesh
                await catalogerRef.current.highlightNpc(allGroups[0].group.mainMesh);
            }
        }
        catch (e) {
            console.error("[Cataloger] Scan failed:", e?.message || e);
            setSubmitStatus({ type: "error", message: "Scan timed out or failed. Try closing and reopening the RS client, then restart the launcher." });
        }
        finally {
            setIsScanning(false);
        }
    };
    // Submit NPC via form fields
    const handleFormNpcSubmit = async () => {
        const npcId = parseInt(formNpcId, 10);
        if (isNaN(npcId) || npcId <= 0) {
            setJsonSubmitStatus({ type: "error", message: "Please enter a valid NPC ID" });
            return;
        }
        if (!formBufferHash.trim()) {
            setJsonSubmitStatus({ type: "error", message: "Please enter a buffer hash" });
            return;
        }
        setJsonSubmitting(true);
        setJsonSubmitStatus(null);
        try {
            const api = (0,_types_npcApi__WEBPACK_IMPORTED_MODULE_4__.getNpcApiClient)();
            if (isVariant) {
                let effectiveVariantName = variantName.trim();
                if (!effectiveVariantName && formNpcName.trim()) {
                    // Auto-generate: fetch next variant number from server
                    try {
                        const { next_variant_name } = await api.getVariants(npcId);
                        if (next_variant_name) {
                            effectiveVariantName = next_variant_name;
                        }
                    }
                    catch { }
                }
                const result = await api.addVariant({
                    npcId,
                    bufferHash: formBufferHash.trim(),
                    variantName: effectiveVariantName || undefined,
                });
                if (result.success) {
                    setJsonSubmitStatus({ type: "success", message: `Added variant for NPC ID: ${npcId}${variantName ? ` (${variantName})` : " (auto-named)"}` });
                    setFormNpcId("");
                    setFormBufferHash("");
                    setVariantName("");
                }
                else {
                    setJsonSubmitStatus({ type: "error", message: "Failed to add variant" });
                }
            }
            else {
                if (!formNpcName.trim()) {
                    setJsonSubmitStatus({ type: "error", message: "Please enter an NPC name" });
                    setJsonSubmitting(false);
                    return;
                }
                const created = await api.createNpc({
                    id: npcId,
                    name: formNpcName.trim(),
                    buffer_hash: formBufferHash.trim(),
                });
                if (created) {
                    setJsonSubmitStatus({ type: "success", message: `Added NPC: ${formNpcName.trim()} (ID: ${npcId})` });
                    setFormNpcId("");
                    setFormNpcName("");
                    setFormBufferHash("");
                }
                else {
                    setJsonSubmitStatus({ type: "error", message: "Failed to add NPC" });
                }
            }
        }
        catch (e) {
            setJsonSubmitStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to submit" });
        }
        finally {
            setJsonSubmitting(false);
        }
    };
    // Move to next NPC group
    const handleNextNpc = async () => {
        if (!catalogerRef.current || pendingGroups.length === 0)
            return;
        const nextIdx = currentGroupIndex + 1;
        if (nextIdx < pendingGroups.length) {
            setCurrentGroupIndex(nextIdx);
            setFocusedMeshIndex(0); // Reset to first mesh in new group
            await catalogerRef.current.highlightNpc(pendingGroups[nextIdx].group.mainMesh);
        }
    };
    // Move to previous NPC group
    const handlePrevNpc = async () => {
        if (!catalogerRef.current || pendingGroups.length === 0)
            return;
        const prevIdx = currentGroupIndex - 1;
        if (prevIdx >= 0) {
            setCurrentGroupIndex(prevIdx);
            setFocusedMeshIndex(0); // Reset to first mesh in new group
            await catalogerRef.current.highlightNpc(pendingGroups[prevIdx].group.mainMesh);
        }
    };
    // Skip current NPC without identifying
    const handleSkipNpc = async () => {
        await handleNextNpc();
    };
    // Download the catalog as JSON
    const handleDownloadCatalog = () => {
        catalogerRef.current?.downloadJson();
    };
    // Import catalog from file
    const handleImportCatalog = (event) => {
        const file = event.target.files?.[0];
        if (!file || !catalogerRef.current)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result;
                catalogerRef.current.importJson(json);
                setCatalogEntries([...catalogerRef.current.getVertexList().entries]);
                alert("Catalog imported successfully!");
            }
            catch (err) {
                alert("Failed to import catalog: " + err);
            }
        };
        reader.readAsText(file);
    };
    // Delete an entry from the catalog
    const handleDeleteEntry = (vertexCount) => {
        if (!catalogerRef.current)
            return;
        if (confirm(`Delete entry for vertex count ${vertexCount}?`)) {
            catalogerRef.current.removeEntry(vertexCount);
            setCatalogEntries([...catalogerRef.current.getVertexList().entries]);
        }
    };
    // Look up grouped NPCs in database by combined hash
    const lookupGroupsInDb = async (groups) => {
        console.log("[lookupGroupsInDb] Called with", groups.length, "groups");
        if (!apiClientRef.current) {
            console.warn("[lookupGroupsInDb] No API client available!");
            return;
        }
        const results = new Map(npcDbResults);
        console.log("[lookupGroupsInDb] Existing cached results:", results.size);
        // Collect ALL hashes: combined group hashes + individual mesh hashes
        const hashSet = new Set();
        for (const group of groups) {
            const groupHashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractGroupedHashes)(group.renders);
            // Add combined hash
            if (groupHashes.combinedHash !== "0x00000000" && !results.has(groupHashes.combinedHash)) {
                hashSet.add(groupHashes.combinedHash);
            }
            // Add individual mesh hashes (DB may store per-mesh hashes)
            for (const mesh of group.allMeshes) {
                const meshHashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractBufferHashes)(mesh.render);
                if (meshHashes.posBufferHash !== "0x00000000" && !results.has(meshHashes.posBufferHash)) {
                    hashSet.add(meshHashes.posBufferHash);
                }
            }
        }
        const hashValues = Array.from(hashSet);
        console.log("[lookupGroupsInDb] Hashes to lookup:", hashValues.length, "(combined + individual)");
        console.log(`[NPC-DB] Looking up ${hashValues.length} hashes: ${hashValues.join(', ')}`);
        if (hashValues.length > 0) {
            try {
                // Batch lookup in chunks of 100 (API limit)
                for (let i = 0; i < hashValues.length; i += 100) {
                    const chunk = hashValues.slice(i, i + 100);
                    console.log("[lookupGroupsInDb] Calling batchLookupByHash with", chunk.length, "hashes (batch", Math.floor(i / 100) + 1, ")");
                    const response = await apiClientRef.current.batchLookupByHash(chunk);
                    let foundCount = 0;
                    for (const result of response.results) {
                        results.set(result.hash, result.npc ? {
                            npc: result.npc,
                            matchType: result.matchType,
                            variant_name: result.variant_name,
                        } : null);
                        if (result.found && result.npc) {
                            foundCount++;
                            console.log("[lookupGroupsInDb] Found NPC:", result.npc.name, "for hash", result.hash);
                            console.log(`[NPC-DB] ✓ MATCH: ${result.hash} → ${result.npc?.name} (ID: ${result.npc?.id}, DB hash: ${result.npc?.buffer_hash})`);
                        }
                        else {
                            console.log(`[NPC-DB] ✗ No match: ${result.hash}`);
                        }
                    }
                    console.log("[lookupGroupsInDb] Found", foundCount, "NPCs in batch");
                }
            }
            catch (error) {
                console.error("[lookupGroupsInDb] API call failed:", error);
            }
        }
        else {
            console.log("[lookupGroupsInDb] No new hashes to lookup (all cached or zero)");
        }
        setNpcDbResults(results);
        console.log("[lookupGroupsInDb] Updated results cache, total entries:", results.size);
    };
    // Get database entry for a group by its combined hash
    const getGroupDbEntry = (combinedHash) => {
        if (combinedHash === "0x00000000")
            return undefined;
        return npcDbResults.get(combinedHash);
    };
    // Get current NPC group being identified
    const currentGroup = pendingGroups[currentGroupIndex];
    const currentNpc = currentGroup?.group.mainMesh;
    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { padding: "10px", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", backgroundColor: theme.bgDark, color: theme.textSecondary, minHeight: "100vh" } },
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h1", { style: { margin: 0, color: theme.textPrimary, fontSize: "16px", fontWeight: 600 } }, "NPC Recorder"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => {
                    if (usingLocal) {
                        (0,_types_npcApi__WEBPACK_IMPORTED_MODULE_4__.setProduction)();
                        setUsingLocal(false);
                    }
                    else {
                        (0,_types_npcApi__WEBPACK_IMPORTED_MODULE_4__.setLocal)();
                        setUsingLocal(true);
                    }
                }, style: {
                    padding: "4px 10px",
                    fontSize: "10px",
                    backgroundColor: usingLocal ? theme.colorWarning : theme.colorSuccess,
                    color: theme.textPrimary,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 600,
                } }, usingLocal ? "LOCAL" : "PROD")),
        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "0", marginBottom: "15px" } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => setActiveTab("cataloger"), style: {
                    padding: "10px 20px",
                    fontSize: "12px",
                    backgroundColor: activeTab === "cataloger" ? theme.colorPurple : theme.bgInput,
                    color: activeTab === "cataloger" ? theme.textPrimary : theme.textMuted,
                    border: `1px solid ${activeTab === "cataloger" ? theme.colorPurple : theme.borderLight}`,
                    borderRadius: "4px 0 0 4px",
                    cursor: "pointer",
                    fontWeight: activeTab === "cataloger" ? 600 : 400
                } }, "NPC Cataloger"),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => setActiveTab("lookup"), style: {
                    padding: "10px 20px",
                    fontSize: "12px",
                    backgroundColor: activeTab === "lookup" ? theme.colorTeal : theme.bgInput,
                    color: activeTab === "lookup" ? theme.textPrimary : theme.textMuted,
                    border: `1px solid ${activeTab === "lookup" ? theme.colorTeal : theme.borderLight}`,
                    borderLeft: "none",
                    borderRadius: "0 4px 4px 0",
                    cursor: "pointer",
                    fontWeight: activeTab === "lookup" ? 600 : 400
                } }, "NPC Lookup")),
        activeTab === "cataloger" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "12px", padding: "10px", backgroundColor: "rgba(52, 152, 219, 0.1)", borderRadius: "6px", border: `1px solid ${theme.colorInfo}`, fontSize: "11px", color: theme.textMuted, lineHeight: "1.6" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "4px", fontWeight: 600, color: theme.colorInfo, fontSize: "12px" } }, "How to use:"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Click \"Scan\" while in-game to capture all visible NPCs nearby"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Use the arrow buttons to browse through detected NPCs"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 NPCs are automatically looked up in the database - green = known, yellow = unknown"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Click \"Submit to Database\" on unknown NPCs to contribute to the database"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 You can search for the NPC by name, or enter the NPC ID from the RuneScape Wiki manually"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Use \"Quick Add NPC\" to manually add an NPC by ID, name, and buffer hash")),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "12px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handleScanAllVisible, style: {
                        width: "100%",
                        padding: "12px 20px",
                        fontSize: "15px",
                        fontWeight: 600,
                        backgroundColor: isScanning ? theme.textMuted : theme.colorTeal,
                        color: theme.textPrimary,
                        border: "none",
                        borderRadius: "6px",
                        cursor: isScanning ? "not-allowed" : "pointer",
                        marginBottom: "8px",
                    }, disabled: isScanning }, isScanning ? "Scanning..." : "Scan"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: 0, fontSize: "11px", color: theme.textMuted, textAlign: "center" } }, isScanning
                    ? "Capturing frames..."
                    : pendingGroups.length > 0
                        ? `Found ${pendingGroups.length} NPC(s) - Currently on ${currentGroupIndex + 1} of ${pendingGroups.length}`
                        : "Ready to scan")),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "12px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "8px", fontSize: "11px", fontWeight: 600, color: theme.textPrimary } }, "Quick Add NPC"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { flex: 1 } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "3px", fontSize: "10px", color: theme.textMuted } }, "NPC ID *"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "number", value: formNpcId, onChange: e => setFormNpcId(e.target.value), placeholder: "e.g. 15855", style: { ...inputStyle, width: "100%", boxSizing: "border-box" } })),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { flex: 2 } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "3px", fontSize: "10px", color: theme.textMuted } }, isVariant ? "NPC Name (optional)" : "NPC Name *"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: formNpcName, onChange: e => setFormNpcName(e.target.value), placeholder: "e.g. Town crier", disabled: isVariant, style: { ...inputStyle, width: "100%", boxSizing: "border-box", opacity: isVariant ? 0.5 : 1 } }))),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "8px" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "3px", fontSize: "10px", color: theme.textMuted } }, "Buffer Hash *"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: formBufferHash, onChange: e => setFormBufferHash(e.target.value), placeholder: "e.g. 0x1A2B3C4D", style: { ...inputStyle, width: "100%", boxSizing: "border-box", fontFamily: "monospace" } })),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: checkboxLabelStyle },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: isVariant, onChange: e => setIsVariant(e.target.checked) }),
                        "Is Variant"),
                    isVariant && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: variantName, onChange: e => setVariantName(e.target.value), placeholder: "Variant name (auto-generated if empty)", style: { ...inputStyle, width: "180px" } }))),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "10px", alignItems: "center" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handleFormNpcSubmit, disabled: jsonSubmitting || !formNpcId || !formBufferHash || (!isVariant && !formNpcName), style: buttonStyle(isVariant ? theme.colorPurple : theme.colorSuccess) }, jsonSubmitting ? "Adding..." : isVariant ? "Add Variant" : "Add NPC"),
                    jsonSubmitStatus && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: {
                            fontSize: "11px",
                            color: jsonSubmitStatus.type === "success" ? theme.colorSuccess : theme.colorDanger,
                        } }, jsonSubmitStatus.message)))),
            currentGroup && currentNpc && (() => {
                const groupHashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractGroupedHashes)(currentGroup.group.renders);
                const dbEntry = getGroupDbEntry(groupHashes.combinedHash);
                const isIdentified = dbEntry !== undefined && dbEntry !== null;
                const isUnknown = dbEntry === null;
                const hasBufferInDb = isIdentified && dbEntry.npc.buffer_hash !== undefined;
                const bufferMatches = hasBufferInDb && dbEntry.npc.buffer_hash === groupHashes.combinedHash;
                return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: {
                        marginBottom: "15px",
                        padding: "15px",
                        backgroundColor: isIdentified ? "rgba(39, 174, 96, 0.1)" : isUnknown ? "rgba(243, 156, 18, 0.1)" : theme.bgLight,
                        borderRadius: "6px",
                        border: `1px solid ${isIdentified ? theme.colorSuccess : isUnknown ? theme.colorWarning : theme.colorInfo}`
                    } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary } },
                        "NPC ",
                        currentGroupIndex + 1,
                        " of ",
                        pendingGroups.length,
                        isIdentified && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.colorSuccess } }, dbEntry.npc.name),
                        isIdentified && dbEntry.matchType === "variant" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "8px", padding: "2px 6px", backgroundColor: "rgba(156, 39, 176, 0.3)", color: theme.colorPurple, borderRadius: "3px", fontSize: "10px" } }, dbEntry.variant_name || "Variant")),
                        isUnknown && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.colorWarning } }, "Unknown NPC"),
                        bufferMatches && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", fontSize: "10px", color: theme.colorSuccess } }, "(Linked)")),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "10px", fontSize: "11px", backgroundColor: theme.bgInput, padding: "10px", borderRadius: "4px", color: theme.textSecondary } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "15px" } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Vertices:"),
                                " ",
                                currentGroup.group.totalVertexCount),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Meshes:"),
                                " ",
                                currentGroup.group.meshCount),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Distance:"),
                                " ",
                                currentGroup.distance.toFixed(1),
                                " tiles"),
                            isIdentified && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "NPC ID:"),
                                " ",
                                dbEntry.npc.id)),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Combined Hash:"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("code", { style: { color: theme.colorInfo, fontFamily: "monospace", fontSize: "12px", backgroundColor: theme.bgMedium, padding: "3px 8px", borderRadius: "3px" } }, groupHashes.combinedHash),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => navigator.clipboard.writeText(groupHashes.combinedHash), style: { padding: "2px 6px", fontSize: "9px", cursor: "pointer", backgroundColor: theme.bgLight, color: theme.textMuted, border: `1px solid ${theme.borderLight}`, borderRadius: "3px" } }, "Copy")),
                        hasBufferInDb && !bufferMatches && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: "6px", color: theme.colorPurple, fontSize: "10px" } },
                            "DB has different hash: ",
                            dbEntry.npc.buffer_hash))),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "8px", fontSize: "10px", color: theme.textMuted } },
                            "Combined Preview (all ",
                            currentGroup.group.allMeshes.length,
                            " meshes):"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement(NpcGroupPreview, { group: currentGroup.group, size: 120 })),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "10px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "8px", fontSize: "10px", color: theme.textMuted } },
                            "Individual meshes (",
                            currentGroup.group.allMeshes.length,
                            ") - click to highlight:"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px" } }, currentGroup.group.allMeshes.map((mesh, meshIdx) => {
                            const meshHash = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractBufferHashes)(mesh.render);
                            const isFocused = meshIdx === focusedMeshIndex;
                            return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: meshIdx, onClick: async () => {
                                    setFocusedMeshIndex(meshIdx);
                                    if (catalogerRef.current) {
                                        await catalogerRef.current.highlightNpc(mesh);
                                    }
                                }, style: {
                                    backgroundColor: isFocused ? theme.bgLight : theme.bgInput,
                                    padding: "6px",
                                    borderRadius: "4px",
                                    border: isFocused ? `2px solid ${theme.colorInfo}` : `1px solid ${theme.borderLight}`,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                } },
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(NpcPreview, { npc: mesh, size: 72 }),
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: "9px", color: isFocused ? theme.textPrimary : theme.textMuted, marginTop: "4px", textAlign: "center" } },
                                    "V:",
                                    mesh.vertexCount),
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: "8px", color: theme.textDim, textAlign: "center", wordBreak: "break-all" } },
                                    meshHash.posBufferHash.slice(0, 10),
                                    "...")));
                        }))),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handlePrevNpc, disabled: currentGroupIndex === 0, style: { ...buttonStyle(theme.borderLight), opacity: currentGroupIndex === 0 ? 0.5 : 1 } }, "Prev"),
                        bufferMatches ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { padding: "8px 16px", fontSize: "14px", color: theme.colorSuccess } }, "Already Linked")) : isIdentified && !hasBufferInDb ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => {
                                setSubmitModalNpc(currentNpc);
                                setSubmitModalGroup(currentGroup.group);
                                setSelectedSearchNpc({ entries: [{ id: dbEntry.npc.id, name: dbEntry.npc.name, lat: 0, lng: 0, floor: 0 }], total: 1 });
                                setSubmitNpcIdInput(dbEntry.npc.id.toString());
                                setSubmitStatus(null);
                                setSubmitIsVariant(false);
                                setSubmitVariantName("");
                            }, style: buttonStyle(theme.colorInfo) },
                            "Link Buffer to ",
                            dbEntry.npc.name)) : isUnknown ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => {
                                setSubmitModalNpc(currentNpc);
                                setSubmitModalGroup(currentGroup.group);
                                setSubmitNpcIdInput("");
                                setManualNpcName("");
                                setNpcSearchQuery("");
                                setSelectedSearchNpc(null);
                                setSubmitStatus(null);
                                setSubmitIsVariant(false);
                                setSubmitVariantName("");
                            }, style: buttonStyle(theme.colorWarning) }, "Submit to Database")) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { padding: "8px 16px", fontSize: "12px", color: theme.textMuted } }, "Loading...")),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handleSkipNpc, style: buttonStyle(theme.borderLight) }, "Skip"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handleNextNpc, disabled: currentGroupIndex >= pendingGroups.length - 1, style: { ...buttonStyle(theme.borderLight), opacity: currentGroupIndex >= pendingGroups.length - 1 ? 0.5 : 1 } }, "Next"))));
            })(),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "12px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap", alignItems: "center" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handleDownloadCatalog, style: buttonStyle(theme.colorSuccess) }, "Download JSON"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { ...buttonStyle(theme.colorInfo), display: "inline-block", cursor: "pointer" } },
                        "Import JSON",
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "file", accept: ".json", onChange: handleImportCatalog, style: { display: "none" } })),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontSize: "11px", color: theme.textMuted } },
                        catalogEntries.length,
                        " entries in catalog"))),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary } },
                    "Cataloged NPCs (",
                    catalogEntries.length,
                    ")"),
                catalogEntries.length === 0 ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { color: theme.textMuted } }, "No NPCs cataloged yet. Scan nearby NPCs to start.")) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { maxHeight: "300px", overflowY: "auto" } }, catalogEntries.map((entry) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: entry.vertexCount, style: {
                        padding: "10px",
                        marginBottom: "6px",
                        backgroundColor: theme.bgLight,
                        borderRadius: "6px",
                        fontSize: "11px",
                        border: `1px solid ${theme.borderLight}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, entry.name),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.textMuted } },
                            "ID: ",
                            entry.npcId),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.colorPurple } },
                            "Vertices: ",
                            entry.vertexCount),
                        entry.notes && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.textDim, fontStyle: "italic" } }, entry.notes)),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => handleDeleteEntry(entry.vertexCount), style: { padding: "2px 8px", fontSize: "10px", cursor: "pointer", backgroundColor: theme.colorDanger, color: theme.textPrimary, border: "none", borderRadius: "4px" } }, "Delete"))))))))),
        activeTab === "lookup" && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "12px", padding: "10px", backgroundColor: "rgba(52, 152, 219, 0.1)", borderRadius: "6px", border: `1px solid ${theme.colorInfo}`, fontSize: "11px", color: theme.textMuted, lineHeight: "1.6" } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "4px", fontWeight: 600, color: theme.colorInfo, fontSize: "12px" } }, "How to use:"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Search for any NPC by name to see its database entry"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Switch between \"NPCs\" and \"Variants\" search modes"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null, "\u2022 Click on a result to see full details including locations, actions, and buffer hashes")),
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "15px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.colorTeal } }, "Search NPC Database"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "0", marginBottom: "10px" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => { setLookupMode("npcs"); setVariantSearchResults([]); setLookupResults([]); setLookupQuery(""); }, style: {
                            padding: "6px 14px",
                            fontSize: "11px",
                            backgroundColor: lookupMode === "npcs" ? theme.colorTeal : theme.bgInput,
                            color: lookupMode === "npcs" ? theme.textPrimary : theme.textMuted,
                            border: `1px solid ${lookupMode === "npcs" ? theme.colorTeal : theme.borderLight}`,
                            borderRadius: "4px 0 0 4px",
                            cursor: "pointer",
                            fontWeight: lookupMode === "npcs" ? 600 : 400,
                        } }, "NPCs"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => { setLookupMode("variants"); setVariantSearchResults([]); setLookupResults([]); setLookupQuery(""); }, style: {
                            padding: "6px 14px",
                            fontSize: "11px",
                            backgroundColor: lookupMode === "variants" ? theme.colorPurple : theme.bgInput,
                            color: lookupMode === "variants" ? theme.textPrimary : theme.textMuted,
                            border: `1px solid ${lookupMode === "variants" ? theme.colorPurple : theme.borderLight}`,
                            borderRadius: "0 4px 4px 0",
                            cursor: "pointer",
                            fontWeight: lookupMode === "variants" ? 600 : 400,
                        } }, "Variants")),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: lookupQuery, onChange: e => lookupMode === "npcs" ? handleLookupSearch(e.target.value) : handleVariantSearch(e.target.value), placeholder: lookupMode === "npcs" ? "Enter NPC name to search..." : "Search NPCs with variants...", style: {
                        width: "100%",
                        padding: "10px",
                        fontSize: "13px",
                        backgroundColor: theme.bgInput,
                        color: theme.textPrimary,
                        border: `2px solid ${lookupMode === "npcs" ? theme.colorTeal : theme.colorPurple}`,
                        borderRadius: "4px",
                        boxSizing: "border-box"
                    } }),
                lookupSearching && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: "8px 0 0 0", fontSize: "11px", color: theme.colorTeal } }, "Searching..."),
                lookupError && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: "8px 0 0 0", fontSize: "11px", color: theme.colorDanger } },
                    "Search error: ",
                    lookupError)),
                !lookupSearching && !lookupError && lookupMode === "npcs" && lookupResults.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: "8px 0 0 0", fontSize: "11px", color: theme.textMuted } },
                    "Found ",
                    lookupResults.length,
                    " unique NPC(s)")),
                !lookupSearching && !lookupError && lookupMode === "variants" && variantSearchResults.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: "8px 0 0 0", fontSize: "11px", color: theme.textMuted } },
                    "Found ",
                    variantSearchResults.length,
                    " NPC(s) with variants"))),
            selectedLookupNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "15px", backgroundColor: theme.bgLight, borderRadius: "6px", border: `1px solid ${theme.colorSuccess}` } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: 0, color: theme.colorSuccess, fontSize: "14px", fontWeight: 600 } }, selectedLookupNpc.name),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => setSelectedLookupNpc(null), style: { padding: "4px 8px", fontSize: "10px", backgroundColor: theme.colorDanger, color: theme.textPrimary, border: "none", borderRadius: "4px", cursor: "pointer" } }, "Close")),
                loadingNpcDetails ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { color: theme.textMuted } }, "Loading details...")) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: "12px", color: theme.textSecondary } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px", marginBottom: "15px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textMuted } }, "NPC ID:"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontFamily: "monospace", color: theme.colorInfo } }, selectedLookupNpc.id),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textMuted } }, "Bound Size:"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null,
                            selectedLookupNpc.bound_size ?? "N/A",
                            " tile(s)"),
                        selectedLookupNpc.buffer_hash && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textMuted } }, "Buffer Hash:"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontFamily: "monospace" } }, selectedLookupNpc.buffer_hash))),
                        selectedLookupNpc.npc_combat_level && selectedLookupNpc.npc_combat_level.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement((react__WEBPACK_IMPORTED_MODULE_0___default().Fragment), null,
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textMuted } }, "Combat Level:"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null, selectedLookupNpc.npc_combat_level.join(", "))))),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: "10px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { display: "block", marginBottom: "8px", color: theme.textMuted } },
                            "Locations (",
                            selectedLookupNpc.location?.length || 0,
                            "):"),
                        selectedLookupNpc.location && selectedLookupNpc.location.length > 0 ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { maxHeight: "150px", overflowY: "auto", backgroundColor: theme.bgInput, padding: "8px", borderRadius: "4px" } }, selectedLookupNpc.location.map((loc, idx) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: idx, style: { padding: "4px 0", borderBottom: idx < selectedLookupNpc.location.length - 1 ? `1px solid ${theme.borderLight}` : "none" } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontFamily: "monospace", color: theme.textSecondary } },
                                "Lat: ",
                                loc.lat.toFixed(2),
                                ", Lng: ",
                                loc.lng.toFixed(2)),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.textMuted } },
                                "Floor: ",
                                loc.floor)))))) : (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: 0, color: theme.textDim } }, "No locations recorded"))),
                    selectedLookupNpc.actions && selectedLookupNpc.actions.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: "10px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { display: "block", marginBottom: "5px", color: theme.textMuted } }, "Actions:"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "5px", flexWrap: "wrap" } }, selectedLookupNpc.actions.map((action, idx) => {
                            const actionName = Object.values(action).find(v => v !== null);
                            return actionName ? (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { key: idx, style: { padding: "2px 8px", backgroundColor: "rgba(52, 152, 219, 0.2)", color: theme.colorInfo, borderRadius: "4px", fontSize: "11px" } }, actionName)) : null;
                        })))))))),
            lookupMode === "npcs" && lookupResults.length > 0 && !selectedLookupNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary } }, "Search Results"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { maxHeight: "400px", overflowY: "auto" } }, lookupResults.map((group) => {
                    const first = group.entries[0];
                    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: first.id, onClick: () => handleSelectLookupNpc(first.id), style: {
                            padding: "12px",
                            marginBottom: "8px",
                            backgroundColor: theme.bgLight,
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: `1px solid ${theme.borderLight}`,
                            transition: "background-color 0.1s"
                        }, onMouseEnter: e => (e.currentTarget.style.backgroundColor = theme.bgInput), onMouseLeave: e => (e.currentTarget.style.backgroundColor = theme.bgLight) },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { fontSize: "13px", color: theme.textPrimary } }, first.name),
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.colorInfo, fontFamily: "monospace", fontSize: "11px" } },
                                    "ID: ",
                                    first.id)),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontSize: "11px", color: theme.textMuted } },
                                group.entries.length,
                                " location(s)")),
                        group.entries.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: "6px", fontSize: "10px", color: theme.textMuted } },
                            group.entries.slice(0, 3).map((loc, idx) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { key: idx, style: { marginRight: "10px" } },
                                "(",
                                loc.lat.toFixed(1),
                                ", ",
                                loc.lng.toFixed(1),
                                ") F",
                                loc.floor))),
                            group.entries.length > 3 && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", null,
                                "+",
                                group.entries.length - 3,
                                " more")))));
                })))),
            lookupMode === "variants" && variantSearchResults.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary } },
                    "Variant Results (",
                    variantSearchResults.length,
                    " NPC",
                    variantSearchResults.length !== 1 ? "s" : "",
                    ")"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { maxHeight: "400px", overflowY: "auto" } }, variantSearchResults.map((npc) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: npc.npc_id, style: {
                        padding: "12px",
                        marginBottom: "8px",
                        backgroundColor: theme.bgLight,
                        borderRadius: "6px",
                        border: `1px solid ${theme.borderLight}`,
                    } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { fontSize: "13px", color: theme.textPrimary } }, npc.npc_name),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { marginLeft: "10px", color: theme.colorInfo, fontFamily: "monospace", fontSize: "11px" } },
                                "ID: ",
                                npc.npc_id)),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { padding: "2px 8px", backgroundColor: "rgba(156, 39, 176, 0.2)", color: theme.colorPurple, borderRadius: "4px", fontSize: "11px" } },
                            npc.variant_count,
                            " variant",
                            npc.variant_count !== 1 ? "s" : "")),
                    npc.buffer_hash && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: "10px", color: theme.textMuted, marginBottom: "6px" } },
                        "Primary: ",
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("code", { style: { color: theme.colorInfo, fontFamily: "monospace" } }, npc.buffer_hash))),
                    npc.variants.length > 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { backgroundColor: theme.bgInput, borderRadius: "4px", padding: "6px" } }, npc.variants.map((v) => (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: v.id, style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "4px 6px",
                            borderBottom: `1px solid ${theme.borderColor}`,
                            fontSize: "11px",
                        } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { color: theme.colorPurple, fontWeight: 600 } }, v.variant_name || "Unnamed"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("code", { style: { marginLeft: "8px", color: theme.textMuted, fontFamily: "monospace", fontSize: "10px" } }, v.buffer_hash)),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { color: theme.textDim, fontSize: "9px" } }, new Date(v.created_at).toLocaleDateString())))))))))))),
            lookupQuery.length >= 2 && !lookupSearching && lookupResults.length === 0 && variantSearchResults.length === 0 && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { color: theme.textMuted, textAlign: "center", padding: "20px" } },
                "No NPCs found matching \"",
                lookupQuery,
                "\"")),
            lookupQuery.length < 2 && !selectedLookupNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { color: theme.textMuted, textAlign: "center", padding: "20px" } }, "Enter at least 2 characters to search for NPCs")))),
        submitModalNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: {
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.85)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            } },
            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: {
                    backgroundColor: theme.bgMedium,
                    padding: "20px",
                    borderRadius: "8px",
                    width: "500px",
                    maxWidth: "90%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    border: `1px solid ${theme.borderLight}`
                } },
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("h3", { style: { margin: "0 0 15px 0", color: theme.textPrimary } }, "Link Scanned NPC to Database"),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "10px", backgroundColor: "rgba(52, 152, 219, 0.15)", borderRadius: "4px", fontSize: "12px", border: `1px solid ${theme.colorInfo}` } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontWeight: "bold", marginBottom: "5px", color: theme.colorInfo } }, "Scanned NPC:"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { color: theme.textSecondary } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Vertex Count:"),
                        " ",
                        submitModalNpc.vertexCount),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { color: theme.textSecondary } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Buffer Hash:"),
                        " ",
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontFamily: "monospace" } }, (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_3__.extractBufferHashes)(submitModalNpc.render).posBufferHash)),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { color: theme.textSecondary } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", { style: { color: theme.textPrimary } }, "Position:"),
                        " (",
                        submitModalNpc.position.x.toFixed(1),
                        ", ",
                        submitModalNpc.position.y.toFixed(1),
                        ", ",
                        submitModalNpc.position.z.toFixed(1),
                        ")")),
                selectedSearchNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "10px", backgroundColor: "rgba(39, 174, 96, 0.15)", borderRadius: "4px", border: `2px solid ${theme.colorSuccess}` } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", null,
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontWeight: "bold", color: theme.colorSuccess, fontSize: "16px" } }, selectedSearchNpc.entries[0].name),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: "12px", color: theme.textMuted } },
                                "ID: ",
                                selectedSearchNpc.entries[0].id)),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => setSelectedSearchNpc(null), style: { padding: "4px 8px", fontSize: "12px", backgroundColor: "rgba(231, 76, 60, 0.2)", color: theme.colorDanger, border: `1px solid ${theme.colorDanger}`, borderRadius: "4px", cursor: "pointer" } }, "Clear")))),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px", color: theme.textPrimary } }, "Search NPC by Name:"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: npcSearchQuery, onChange: e => handleNpcSearch(e.target.value), placeholder: "Type NPC name to search...", style: {
                            width: "100%",
                            padding: "8px",
                            fontSize: "14px",
                            backgroundColor: theme.bgInput,
                            color: theme.textPrimary,
                            border: `1px solid ${theme.borderLight}`,
                            borderRadius: "4px",
                            boxSizing: "border-box"
                        } }),
                    npcSearching && react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: "5px 0 0 0", fontSize: "11px", color: theme.colorInfo } }, "Searching...")),
                npcSearchResults.length > 0 && !selectedSearchNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", maxHeight: "200px", overflowY: "auto", border: `1px solid ${theme.borderLight}`, borderRadius: "4px" } }, npcSearchResults.map((group, idx) => {
                    const first = group.entries[0];
                    return (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { key: `${first.id}-${idx}`, onClick: () => {
                            setSelectedSearchNpc(group);
                            setNpcSearchResults([]);
                        }, style: {
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: idx < npcSearchResults.length - 1 ? `1px solid ${theme.borderColor}` : "none",
                            backgroundColor: theme.bgLight,
                            transition: "background-color 0.1s"
                        }, onMouseEnter: e => (e.currentTarget.style.backgroundColor = theme.bgInput), onMouseLeave: e => (e.currentTarget.style.backgroundColor = theme.bgLight) },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontWeight: "bold", color: theme.textPrimary } }, first.name),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { fontSize: "11px", color: theme.textMuted } },
                            "ID: ",
                            first.id)));
                }))),
                !selectedSearchNpc && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "10px", backgroundColor: theme.bgLight, borderRadius: "4px", border: `1px solid ${theme.borderColor}` } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "5px", fontSize: "12px", color: theme.textMuted } }, "Or enter NPC details manually:"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "10px", marginBottom: "8px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { flex: 1 } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "3px", fontSize: "11px", color: theme.textDim } }, "NPC ID *"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "number", value: submitNpcIdInput, onChange: e => setSubmitNpcIdInput(e.target.value), placeholder: "e.g. 1234", style: {
                                    width: "100%",
                                    padding: "6px",
                                    fontSize: "13px",
                                    backgroundColor: theme.bgInput,
                                    color: theme.textPrimary,
                                    border: `1px solid ${theme.borderLight}`,
                                    borderRadius: "4px",
                                    boxSizing: "border-box"
                                } })),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { flex: 2 } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "block", marginBottom: "3px", fontSize: "11px", color: theme.textDim } }, "NPC Name *"),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: manualNpcName, onChange: e => setManualNpcName(e.target.value), placeholder: "e.g. Hans", style: {
                                    width: "100%",
                                    padding: "6px",
                                    fontSize: "13px",
                                    backgroundColor: theme.bgInput,
                                    color: theme.textPrimary,
                                    border: `1px solid ${theme.borderLight}`,
                                    borderRadius: "4px",
                                    boxSizing: "border-box"
                                } }))),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("p", { style: { margin: 0, fontSize: "10px", color: theme.textDim } },
                        "Tip: Get the NPC ID from the RuneScape Wiki URL (e.g., /w/Hans?id=",
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("strong", null, "1234"),
                        ")"))),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: "15px", padding: "10px", backgroundColor: theme.bgLight, borderRadius: "4px", border: `1px solid ${theme.borderColor}` } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "checkbox", checked: submitIsVariant, onChange: e => setSubmitIsVariant(e.target.checked), style: { width: "16px", height: "16px", cursor: "pointer" } }),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontSize: "13px", color: theme.textPrimary } }, "Add as Variant"),
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontSize: "11px", color: theme.textMuted } }, "(for NPCs with multiple appearances)")),
                    submitIsVariant && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginTop: "8px" } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("input", { type: "text", value: submitVariantName, onChange: e => setSubmitVariantName(e.target.value), placeholder: "Variant name (optional, e.g. 'male', 'female', 'dwarf')", style: {
                                width: "100%",
                                padding: "6px",
                                fontSize: "12px",
                                backgroundColor: theme.bgInput,
                                color: theme.textPrimary,
                                border: `1px solid ${theme.borderLight}`,
                                borderRadius: "4px",
                                boxSizing: "border-box"
                            } })))),
                submitStatus && (react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: {
                        marginBottom: "15px",
                        padding: "10px",
                        borderRadius: "4px",
                        backgroundColor: submitStatus.type === "success" ? "rgba(39, 174, 96, 0.2)" : "rgba(231, 76, 60, 0.2)",
                        color: submitStatus.type === "success" ? theme.colorSuccess : theme.colorDanger,
                        border: `1px solid ${submitStatus.type === "success" ? theme.colorSuccess : theme.colorDanger}`
                    } }, submitStatus.message)),
                react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: "flex", gap: "10px", justifyContent: "flex-end" } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: () => {
                            setSubmitModalNpc(null);
                            setSubmitNpcIdInput("");
                            setManualNpcName("");
                            setNpcSearchQuery("");
                            setNpcSearchResults([]);
                            setSelectedSearchNpc(null);
                            setSubmitStatus(null);
                            setSubmitIsVariant(false);
                            setSubmitVariantName("");
                        }, style: {
                            padding: "8px 16px",
                            fontSize: "14px",
                            backgroundColor: theme.bgInput,
                            color: theme.textSecondary,
                            border: `1px solid ${theme.borderLight}`,
                            borderRadius: "4px",
                            cursor: "pointer"
                        } }, "Cancel"),
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement("button", { onClick: handleSubmitBufferHash, disabled: !selectedSearchNpc && (!submitNpcIdInput || (!submitIsVariant && !manualNpcName)), style: {
                            padding: "8px 16px",
                            fontSize: "14px",
                            opacity: (!selectedSearchNpc && (!submitNpcIdInput || (!submitIsVariant && !manualNpcName))) ? 0.5 : 1,
                            backgroundColor: theme.colorSuccess,
                            color: theme.textPrimary,
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        } }, "Submit")))))));
}
// Button style helper (dark theme)
const buttonStyle = (bg) => ({
    padding: "8px 16px",
    fontSize: "14px",
    backgroundColor: bg,
    color: theme.textPrimary,
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
});
// Input style helper (dark theme)
const inputStyle = {
    padding: "6px 8px",
    backgroundColor: theme.bgInput,
    border: `1px solid ${theme.borderLight}`,
    borderRadius: "4px",
    color: theme.textPrimary,
    fontSize: "12px",
};
// Checkbox label style
const checkboxLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: theme.textSecondary,
    cursor: "pointer",
};


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
/* harmony import */ var _components_NpcApp__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../components/NpcApp */ "./app/components/NpcApp.tsx");



async function bootstrap() {
    const rootEl = document.getElementById("app");
    if (!rootEl)
        throw new Error("Missing #app element");
    react_dom_client__WEBPACK_IMPORTED_MODULE_1__.createRoot(rootEl).render(react__WEBPACK_IMPORTED_MODULE_0___default().createElement(_components_NpcApp__WEBPACK_IMPORTED_MODULE_2__["default"], null));
}
void bootstrap();


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

/***/ "./gl/constants.ts"
/*!*************************!*\
  !*** ./gl/constants.ts ***!
  \*************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   tilesize: () => (/* binding */ tilesize)
/* harmony export */ });
/** Size of one game tile in world units */
const tilesize = 512;


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

/***/ "./gl/npcCataloger.ts"
/*!****************************!*\
  !*** ./gl/npcCataloger.ts ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NpcCataloger: () => (/* binding */ NpcCataloger)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _npcOverlay__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./npcOverlay */ "./gl/npcOverlay.ts");
/* harmony import */ var _types_npcBufferHash__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../types/npcBufferHash */ "./types/npcBufferHash.ts");
/**
 * NPC Cataloger - Build a database of NPC vertex counts mapped to IDs and names
 *
 * Workflow:
 * 1. Scan NPCs within a radius of the player
 * 2. Present each NPC for identification
 * 3. User inputs NPC ID and name
 * 4. Save to npcVertexList.json
 */



/** Wrap async functions to capture and log stack traces on error */
function wrapWithStackTrace(fn, name) {
    return (async (...args) => {
        const callStack = new Error().stack; // Capture stack at call time
        try {
            return await fn(...args);
        }
        catch (e) {
            console.error(`\n========== ERROR IN ${name} ==========`);
            console.error("Error:", e?.message || e);
            console.error("\n--- Call Stack (where the function was called from) ---");
            console.error(callStack);
            console.error("\n--- Error Stack (where the error was thrown) ---");
            console.error(e?.stack || "No stack available");
            console.error("==========================================\n");
            throw e;
        }
    });
}
/** Log detailed RS hook status */
function logRsHookStatus(context) {
    try {
        const ready = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsReady();
        const width = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsWidth();
        const height = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsHeight();
        const renderer = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRenderer();
        const glStats = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.getGlObjectStats();
        console.log(`[RS Hook Status - ${context}]`);
        console.log(`  Ready: ${ready}`);
        console.log(`  Window: ${width}x${height}`);
        console.log(`  Renderer: ${renderer ? `${renderer.glRenderer} (${renderer.glVendor})` : 'null'}`);
        console.log(`  GL Objects: ${glStats ? `count=${glStats.count}, size=${glStats.size}` : 'null'}`);
        if (glStats?.counts) {
            console.log(`  GL Object counts:`, glStats.counts);
        }
        // Check for RS process
        const pids = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.getExePids("rs2client.exe");
        console.log(`  RS Client PIDs: ${pids.length > 0 ? pids.join(', ') : 'none found'}`);
    }
    catch (e) {
        console.error(`[RS Hook Status - ${context}] Error getting status:`, e);
    }
}
/** Clean up memory to prevent chunk exhaustion */
async function cleanupMemory() {
    try {
        const statsBefore = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.getGlObjectStats();
        if (statsBefore) {
            const freedCount = statsBefore.count;
            const freedSize = (statsBefore.size / 1024 / 1024).toFixed(2);
            console.log(`[NpcCataloger] Cleaning up GL: ${freedCount} objects, ${freedSize}MB`);
            if (statsBefore.counts && Object.keys(statsBefore.counts).length > 0) {
                console.log(`  Object types:`, statsBefore.counts);
            }
        }
        await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.resetOpenGlState();
        const statsAfter = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.getGlObjectStats();
        if (statsAfter && statsBefore) {
            const freed = statsBefore.count - statsAfter.count;
            const freedMB = ((statsBefore.size - statsAfter.size) / 1024 / 1024).toFixed(2);
            console.log(`[NpcCataloger] Freed ${freed} objects (${freedMB}MB)`);
        }
    }
    catch (e) {
        console.error("[NpcCataloger] Error during memory cleanup:", e);
    }
}
/** Check if RS process is hooked - if not, memory exhaustion likely occurred */
async function ensureRsHooked() {
    try {
        const ready = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsReady();
        if (!ready) {
            console.error("[NpcCataloger] RS process not ready - memory exhaustion likely occurred!");
            console.error("[NpcCataloger] The app needs to be restarted to recover.");
            logRsHookStatus("connection lost");
            return false;
        }
        return true;
    }
    catch (e) {
        console.error("[NpcCataloger] Error checking RS process:", e);
        logRsHookStatus("error state");
        return false;
    }
}
/**
 * NPC Cataloger class - helps build a database of NPC vertex counts
 */
class NpcCataloger {
    overlay;
    vertexList;
    currentHighlightHandle = null;
    scanCount = 0;
    constructor() {
        this.overlay = new _npcOverlay__WEBPACK_IMPORTED_MODULE_1__.NpcOverlay();
        this.vertexList = this.loadVertexList();
    }
    /** Clean up GL memory - call this periodically or when memory issues occur */
    async cleanup() {
        await cleanupMemory();
    }
    /** Log current RS hook status */
    logStatus(context = "manual") {
        logRsHookStatus(context);
    }
    /** Load existing vertex list from localStorage or create new */
    loadVertexList() {
        try {
            const stored = localStorage.getItem("npcVertexList");
            if (stored) {
                return JSON.parse(stored);
            }
        }
        catch (e) {
            console.warn("[NpcCataloger] Failed to load vertex list:", e);
        }
        return {
            version: 1,
            lastUpdated: new Date().toISOString(),
            entries: [],
        };
    }
    /** Save vertex list to localStorage */
    saveVertexList() {
        this.vertexList.lastUpdated = new Date().toISOString();
        localStorage.setItem("npcVertexList", JSON.stringify(this.vertexList));
    }
    /** Get the current vertex list */
    getVertexList() {
        return this.vertexList;
    }
    /** Check if a vertex count is already cataloged */
    isVertexCountCataloged(vertexCount) {
        return this.vertexList.entries.find(e => e.vertexCount === vertexCount);
    }
    /**
     * Scan for NPC groups within a radius of the player (uses combined hashes)
     * @param radiusTiles - Radius in tiles (default: 5), use 0 for all visible
     */
    async scanNearbyNpcsGrouped(radiusTiles = 5) {
        this.scanCount++;
        console.log(`[NpcCataloger] Scan #${this.scanCount} - radius: ${radiusTiles}`);
        // Scan all NPC groups using single-frame capture
        let allGroups;
        try {
            allGroups = await this.overlay.scanGrouped({
                excludeFloor: true,
                // maxMeshCount defaults to 15 - groups with >15 meshes are filtered unless they have bones
            });
        }
        catch (e) {
            console.error("[NpcCataloger] Scan error:", e?.message || e);
            logRsHookStatus("scan error");
            throw e;
        }
        console.log("[NpcCataloger] Found", allGroups.length, "total NPC groups from scan");
        if (allGroups.length === 0) {
            console.warn("[NpcCataloger] No NPC groups found in scan");
            return [];
        }
        // Find the player (closest to screen center)
        const screenWidth = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsWidth() || 1920;
        const screenHeight = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsHeight() || 1080;
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        // Count how many have screenPos
        const withScreenPos = allGroups.filter(g => g.mainMesh.screenPos).length;
        console.log("[NpcCataloger] Groups with screenPos:", withScreenPos, "of", allGroups.length);
        let playerGroup = null;
        let closestDist = Infinity;
        for (const group of allGroups) {
            if (group.mainMesh.screenPos) {
                const dx = group.mainMesh.screenPos.x - centerX;
                const dy = group.mainMesh.screenPos.y - centerY;
                const dist = dx * dx + dy * dy;
                if (dist < closestDist) {
                    closestDist = dist;
                    playerGroup = group;
                }
            }
        }
        // If radius is 0, return all visible groups (no filtering)
        if (radiusTiles === 0) {
            // Sort by screen distance from center (roughly closer to player first)
            const sortedGroups = allGroups
                .filter(g => !playerGroup || g.mainMesh.vaoId !== playerGroup.mainMesh.vaoId) // Exclude player if found
                .map(group => {
                let screenDist = Infinity;
                if (group.mainMesh.screenPos) {
                    const dx = group.mainMesh.screenPos.x - centerX;
                    const dy = group.mainMesh.screenPos.y - centerY;
                    screenDist = Math.sqrt(dx * dx + dy * dy);
                }
                return { group, distance: screenDist / 100 }; // Rough approximation
            });
            sortedGroups.sort((a, b) => a.distance - b.distance);
            // Deduplicate by combined hash (same mesh appearing at multiple positions or same entity rendered multiple times)
            const seenHashes = new Set();
            const dedupedGroups = [];
            for (const pending of sortedGroups) {
                const combined = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_2__.computeCombinedHash)(pending.group.renders);
                if (combined.num === 0) {
                    // No valid hash, include it anyway (might be incomplete capture)
                    dedupedGroups.push(pending);
                }
                else if (!seenHashes.has(combined.num)) {
                    seenHashes.add(combined.num);
                    dedupedGroups.push(pending);
                }
            }
            console.log(`[NpcCataloger] Radius 0 - ${sortedGroups.length} groups, ${dedupedGroups.length} unique (${sortedGroups.length - dedupedGroups.length} duplicates removed)`);
            return dedupedGroups;
        }
        if (!playerGroup) {
            console.warn("[NpcCataloger] Could not identify player - no groups have screenPos");
            // Fallback: just return all groups without distance filtering, but still dedupe
            console.log("[NpcCataloger] Returning all groups without player-relative filtering");
            const allPending = allGroups.map(group => ({ group, distance: 0 }));
            // Deduplicate by combined hash
            const seenHashes = new Set();
            const dedupedGroups = [];
            for (const pending of allPending) {
                const combined = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_2__.computeCombinedHash)(pending.group.renders);
                if (combined.num === 0) {
                    dedupedGroups.push(pending);
                }
                else if (!seenHashes.has(combined.num)) {
                    seenHashes.add(combined.num);
                    dedupedGroups.push(pending);
                }
            }
            console.log(`[NpcCataloger] Fallback dedup: ${dedupedGroups.length} unique (${allPending.length - dedupedGroups.length} duplicates removed)`);
            return dedupedGroups;
        }
        const playerPos = playerGroup.position;
        console.log("[NpcCataloger] Player position:", playerPos.x.toFixed(1), playerPos.y.toFixed(1), playerPos.z.toFixed(1));
        // Filter groups within radius (excluding player)
        const nearbyGroups = [];
        for (const group of allGroups) {
            // Skip the player
            if (group.mainMesh.vaoId === playerGroup.mainMesh.vaoId)
                continue;
            // Calculate distance in tiles
            const dx = group.position.x - playerPos.x;
            const dz = group.position.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            // Skip if outside radius
            if (distance > radiusTiles)
                continue;
            nearbyGroups.push({
                group,
                distance,
            });
        }
        console.log("[NpcCataloger] After radius filter:", nearbyGroups.length, "groups within", radiusTiles, "tiles");
        // Sort by distance (closest first)
        nearbyGroups.sort((a, b) => a.distance - b.distance);
        // Deduplicate by combined hash (same mesh appearing at multiple positions or same entity rendered multiple times)
        const seenHashes = new Set();
        const dedupedGroups = [];
        for (const pending of nearbyGroups) {
            const combined = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_2__.computeCombinedHash)(pending.group.renders);
            if (combined.num === 0) {
                // No valid hash, include it anyway (might be incomplete capture)
                dedupedGroups.push(pending);
            }
            else if (!seenHashes.has(combined.num)) {
                seenHashes.add(combined.num);
                dedupedGroups.push(pending);
            }
        }
        console.log(`[NpcCataloger] After dedup: ${dedupedGroups.length} unique (${nearbyGroups.length - dedupedGroups.length} duplicates removed)`);
        return dedupedGroups;
    }
    /**
     * Highlight a specific NPC with a 3D arrow above their head
     */
    async highlightNpc(npc, color) {
        // Clear previous highlight first to prevent memory buildup
        await this.clearHighlight();
        console.log("[NpcCataloger] highlightNpc vaoId:", npc.vaoId, "vertexCount:", npc.vertexCount);
        try {
            const handle = await this.overlay.drawArrowAboveNpc(npc, {
                color: color ?? [255, 255, 0, 200],
                size: 0.5,
                height: 2.0,
            });
            this.currentHighlightHandle = handle;
            return handle;
        }
        catch (e) {
            console.error("[NpcCataloger] Failed to highlight NPC:", e);
            return null;
        }
    }
    /**
     * Highlight all visible NPCs with arrows
     * @param radiusTiles Radius filter (0 = all visible)
     * @param maxArrows Maximum number of arrows to draw (default: 3) - prevents memory exhaustion
     * @returns Array of handles for the highlights
     */
    async highlightAllVisible(radiusTiles = 0, maxArrows = 3) {
        // Clear all previous overlays first to prevent memory buildup
        await this.clearAll();
        console.log("[NpcCataloger] Scanning visible NPCs...");
        const groups = await this.scanNearbyNpcsGrouped(radiusTiles);
        const handles = [];
        // Limit arrows to prevent memory exhaustion that crashes RS connection
        const arrowsToCreate = Math.min(groups.length, maxArrows);
        if (groups.length > maxArrows) {
            console.warn(`[NpcCataloger] Found ${groups.length} NPCs but limiting to ${maxArrows} arrows to prevent memory issues`);
        }
        for (let i = 0; i < arrowsToCreate; i++) {
            const pending = groups[i];
            try {
                const handle = await this.overlay.draw3DArrowAboveNpc(pending.group.mainMesh, {
                    color: [255, 255, 0, 200], // Yellow
                    size: 0.5,
                    height: 2.0,
                });
                if (handle !== null) {
                    handles.push(handle);
                }
            }
            catch (e) {
                console.warn("[NpcCataloger] Failed to highlight group:", e);
                break; // Stop if we encounter errors to prevent cascade
            }
        }
        console.log(`[NpcCataloger] Highlighted ${handles.length} of ${groups.length} NPCs`);
        return { handles, groups };
    }
    /** Clear current highlight */
    async clearHighlight() {
        if (this.currentHighlightHandle !== null) {
            await this.overlay.stop(this.currentHighlightHandle);
            this.currentHighlightHandle = null;
        }
    }
    /** Clear all overlays */
    async clearAll() {
        const activeCount = this.overlay.getActiveCount();
        console.log(`[NpcCataloger] clearAll - stopping ${activeCount} active overlays`);
        await this.overlay.stopAll();
        this.currentHighlightHandle = null;
    }
    /**
     * Add an NPC to the catalog
     */
    addEntry(vertexCount, npcId, name, notes) {
        // Check if already exists
        const existing = this.vertexList.entries.findIndex(e => e.vertexCount === vertexCount);
        const entry = {
            vertexCount,
            npcId,
            name,
            notes,
            addedAt: new Date().toISOString(),
        };
        if (existing >= 0) {
            // Update existing
            this.vertexList.entries[existing] = entry;
        }
        else {
            // Add new
            this.vertexList.entries.push(entry);
        }
        this.saveVertexList();
    }
    /**
     * Remove an entry from the catalog
     */
    removeEntry(vertexCount) {
        const idx = this.vertexList.entries.findIndex(e => e.vertexCount === vertexCount);
        if (idx >= 0) {
            this.vertexList.entries.splice(idx, 1);
            this.saveVertexList();
            return true;
        }
        return false;
    }
    /**
     * Export the vertex list as a JSON string
     */
    exportJson() {
        return JSON.stringify(this.vertexList, null, 2);
    }
    /**
     * Import a vertex list from JSON
     */
    importJson(json) {
        try {
            const imported = JSON.parse(json);
            if (imported.entries && Array.isArray(imported.entries)) {
                this.vertexList = imported;
                this.saveVertexList();
            }
        }
        catch (e) {
            console.error("[NpcCataloger] Failed to import JSON:", e);
            throw e;
        }
    }
    /**
     * Download the vertex list as a file
     */
    downloadJson() {
        const json = this.exportJson();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "npcVertexList.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    /**
     * Look up NPC info by vertex count
     */
    lookupByVertexCount(vertexCount) {
        return this.vertexList.entries.find(e => e.vertexCount === vertexCount);
    }
    /**
     * Look up NPC info by NPC ID
     */
    lookupByNpcId(npcId) {
        return this.vertexList.entries.find(e => e.npcId === npcId);
    }
    /**
     * Search entries by name
     */
    searchByName(query) {
        const lower = query.toLowerCase();
        return this.vertexList.entries.filter(e => e.name.toLowerCase().includes(lower));
    }
    /**
     * Rescan a specific NPC group to capture all mesh parts across multiple frames.
     * Use this when an NPC appears to be missing mesh parts (weapons, accessories, etc.)
     *
     * @param group The NPC group to rescan
     * @param frameCount Number of frames to capture (default: 6)
     * @param frameDelay Delay between frames in ms (default: 100)
     * @returns Updated group with all mesh parts found across frames
     */
    async rescanGroupMultiFrame(group, frameCount = 6, frameDelay = 100) {
        console.log(`[NpcCataloger] Rescanning group at position (${group.position.x.toFixed(2)}, ${group.position.y.toFixed(2)}, ${group.position.z.toFixed(2)})`);
        console.log(`[NpcCataloger] Original: ${group.meshCount} meshes, ${group.totalVertexCount} total vertices`);
        const updatedGroup = await this.overlay.rescanGroupMultiFrame(group, {
            frameCount,
            frameDelay,
            positionTolerance: 0.1,
        });
        console.log(`[NpcCataloger] After rescan: ${updatedGroup.meshCount} meshes, ${updatedGroup.totalVertexCount} total vertices`);
        return updatedGroup;
    }
    /**
     * Get the underlying NpcOverlay instance (for advanced operations)
     */
    getOverlay() {
        return this.overlay;
    }
}


/***/ },

/***/ "./gl/npcOverlay.ts"
/*!**************************!*\
  !*** ./gl/npcOverlay.ts ***!
  \**************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NpcOverlay: () => (/* binding */ NpcOverlay),
/* harmony export */   PLAYER_BUFFER_HASH: () => (/* binding */ PLAYER_BUFFER_HASH)
/* harmony export */ });
/* harmony import */ var _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./patchrs_napi */ "./gl/patchrs_napi.ts");
/* harmony import */ var _renderprogram__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./renderprogram */ "./gl/renderprogram.ts");
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./constants */ "./gl/constants.ts");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! three */ "../node_modules/three/build/three.module.js");
/* harmony import */ var _types_npcBufferHash__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../types/npcBufferHash */ "./types/npcBufferHash.ts");
/**
 * NPC Overlay - Detect and highlight NPCs in the 3D world
 */





/** Wrap a promise with a JS-level timeout. Does NOT pass timeout to the native addon,
 *  so recordRenderCalls remains cacheable in the IPC layer. */
function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });
}
// OpenGL constants
const GL_FLOAT = 0x1406;
const GL_UNSIGNED_BYTE = 0x1401;
// GL_TRIANGLES constant removed - renderMode now uses string "triangles"
const GL_FLOAT_MAT4 = 0x8b5c;
const GL_FLOAT_VEC3 = 0x8b51;
// Known player buffer hash - used to identify the player's position on the map
// This hash is the combined hash of the player's mesh group
// Update this value by running a scan and finding your own character
const PLAYER_BUFFER_HASH = "0xF14E10A3"; // TODO: Replace with actual player hash
// Simple passthrough fragment shader
const fragShader = `
  #version 330 core
  in vec4 vColor;
  out vec4 FragColor;
  void main() {
    FragColor = vColor;
  }
`;
// Fragment shader with flat normals computed from derivatives (like tilemarkers)
const fragShaderLit = `
  #version 330 core
  in vec3 FragPos;
  in vec4 vColor;
  uniform mat4 uSunlightViewMatrix;
  uniform vec3 uSunColour;
  uniform vec3 uAmbientColour;
  out vec4 FragColor;
  void main() {
    vec3 dx = dFdx(FragPos);
    vec3 dy = dFdy(FragPos);
    vec3 norm = normalize(cross(dx, dy));
    norm.z = -norm.z;
    vec3 lightDir = normalize(-uSunlightViewMatrix[2].xyz);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 lighting = diff * uSunColour + uAmbientColour;
    lighting = max(lighting, vec3(0.3));
    FragColor = vec4(vColor.rgb * lighting, vColor.a);
  }
`;
function toColorTuple(color) {
    if (Array.isArray(color))
        return color;
    return [color.r, color.g, color.b, color.a];
}
// Bitwise mask for filtering programs
const SKIP_PROGRAM_MASK = 1 << 5;
class NpcOverlay {
    overlayHandles = [];
    viewProjMatrix = null;
    screenWidth = 1920;
    screenHeight = 1080;
    activeStream = null;
    constructor() {
        this.updateScreenSize();
    }
    updateScreenSize() {
        this.screenWidth = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsWidth() || 1920;
        this.screenHeight = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.getRsHeight() || 1080;
    }
    /**
     * Start a streaming scan that continuously detects NPCs.
     * Filters out floor and non-boned items using bitwise masking for performance.
     * Uses native framecooldown (500ms) to reduce memory pressure and prevent RS disconnection.
     *
     * @param options Streaming options including callbacks and filter
     * @returns A function to stop the stream
     */
    startStreamingScan(options = {}) {
        const { onNpcs, onGroups, onIncomplete, onError, filter } = options;
        // Stop any existing stream
        this.stopStreamingScan();
        try {
            // For streaming, only use uniforms (lightweight) - skip heavy vertex buffer data
            // Hash computation requires inputs but causes memory issues in streaming mode
            // Use scanGrouped() for on-demand hash computation instead
            const streamFeatures = ["uniforms", "vertexarray"];
            if (filter?.includeTextures) {
                streamFeatures.push("textures");
            }
            this.activeStream = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.streamRenderCalls({
                features: streamFeatures,
                framecooldown: 2000, // 2 second cooldown like tilemarkers
                skipProgramMask: onGroups ? 0 : SKIP_PROGRAM_MASK,
            }, (renders) => {
                try {
                    // Monitor shared memory usage to detect exhaustion before disconnect
                    const memState = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.memoryState();
                    if (memState) {
                        const pctUsed = memState.used / memState.size;
                        if (pctUsed > 0.9) {
                            // Critical - try to free memory before disconnect
                            const usedMB = (memState.used / (1024 * 1024)).toFixed(1);
                            const totalMB = (memState.size / (1024 * 1024)).toFixed(1);
                            console.error(`[NpcOverlay] 🚨 CRITICAL: Shared memory at ${usedMB}/${totalMB}MB (${(pctUsed * 100).toFixed(1)}%) - attempting cleanup`);
                            _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.resetOpenGlState().catch(() => { });
                        }
                        else if (pctUsed > 0.8) {
                            const usedMB = (memState.used / (1024 * 1024)).toFixed(1);
                            console.warn(`[NpcOverlay] ⚠️ Shared memory high: ${usedMB}MB (${(pctUsed * 100).toFixed(1)}%)`);
                        }
                    }
                    // If onGroups is provided, use grouped scanning (combines all mesh parts per NPC)
                    if (onGroups) {
                        const groups = this.scanGroupedFromRenders(renders, { ...filter, excludeFloor: true });
                        if (groups.length > 0) {
                            onGroups(groups);
                        }
                        // Report incomplete positions (only uTint found, no main mesh)
                        if (onIncomplete) {
                            const incompletePositions = this.getLastIncompletePositions();
                            if (incompletePositions.length > 0) {
                                onIncomplete(incompletePositions);
                            }
                        }
                        return;
                    }
                    // Otherwise use individual mesh scanning (legacy behavior)
                    const npcs = [];
                    for (const render of renders) {
                        if (!render.vertexArray)
                            continue;
                        const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
                        // Skip UI elements
                        if (progmeta.isUi)
                            continue;
                        // Skip if no model matrix (not a positioned object)
                        if (!progmeta.uModelMatrix)
                            continue;
                        // Filter: Skip floor meshes - mark program to skip in future
                        if (progmeta.isFloor) {
                            render.program.skipmask |= SKIP_PROGRAM_MASK;
                            continue;
                        }
                        // Filter: Must have bones AND be main mesh (matching npcview exactly)
                        // npcview: if (!progMeta.uBones || !progMeta.isMainMesh) return null;
                        if (!progmeta.uBones || !progmeta.isMainMesh) {
                            render.program.skipmask |= SKIP_PROGRAM_MASK;
                            continue;
                        }
                        const vertexCount = render.vertexArray.indexBuffer?.length || 0;
                        const maxVertexCount = filter?.maxVertexCount ?? 10000;
                        if (vertexCount > maxVertexCount)
                            continue;
                        // Apply additional vertex count filters if specified
                        if (filter?.vertexCount !== undefined) {
                            if (typeof filter.vertexCount === "number") {
                                if (vertexCount !== filter.vertexCount)
                                    continue;
                            }
                            else {
                                if (filter.vertexCount.min !== undefined && vertexCount < filter.vertexCount.min)
                                    continue;
                                if (filter.vertexCount.max !== undefined && vertexCount > filter.vertexCount.max)
                                    continue;
                            }
                        }
                        if (filter?.vertexCounts !== undefined && filter.vertexCounts.length > 0) {
                            if (!filter.vertexCounts.includes(vertexCount))
                                continue;
                        }
                        // Extract position from model matrix
                        const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
                        const modelMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray(rotmatrix);
                        const x = rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 1.5;
                        const y = rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
                        const z = rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 0.5;
                        const yRotation = -Math.atan2(rotmatrix[8], rotmatrix[0]);
                        // Update view projection matrix
                        if (!this.viewProjMatrix) {
                            const projuni = progmeta.raw.uniforms.find((q) => q.name === "uViewProjMatrix");
                            if (projuni) {
                                this.viewProjMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray((0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, projuni)[0]);
                            }
                        }
                        // Calculate screen position
                        let screenPos;
                        if (this.viewProjMatrix) {
                            const worldPos = new three__WEBPACK_IMPORTED_MODULE_3__.Vector3(rotmatrix[12], rotmatrix[13], rotmatrix[14]);
                            const clipPos = worldPos.applyMatrix4(this.viewProjMatrix);
                            screenPos = {
                                x: (clipPos.x * 0.5 + 0.5) * this.screenWidth,
                                y: (1 - (clipPos.y * 0.5 + 0.5)) * this.screenHeight,
                                z: clipPos.z,
                            };
                        }
                        // Capture textures if requested
                        let textures;
                        if (render.samplers && Object.keys(render.samplers).length > 0) {
                            textures = [];
                            for (const [samplerId, snapshot] of Object.entries(render.samplers)) {
                                if (snapshot && snapshot.canCapture()) {
                                    textures.push({
                                        samplerId: parseInt(samplerId, 10),
                                        texId: snapshot.texid,
                                        width: snapshot.width,
                                        height: snapshot.height,
                                        snapshot,
                                    });
                                }
                            }
                            if (textures.length === 0)
                                textures = undefined;
                        }
                        npcs.push({
                            vaoId: render.vertexObjectId,
                            programId: render.program.programId,
                            vertexCount,
                            position: { x, y, z },
                            rotation: yRotation,
                            modelMatrix,
                            screenPos,
                            hasBones: true, // We already filtered for bones
                            render,
                            progmeta,
                            textures,
                        });
                    }
                    // Call the callback with detected NPCs
                    if (npcs.length > 0 && onNpcs) {
                        onNpcs(npcs);
                    }
                }
                catch (e) {
                    onError?.(e instanceof Error ? e : new Error(String(e)));
                }
            });
            console.log("[NpcOverlay] Streaming scan started", onGroups ? "(grouped mode)" : "(individual mode)");
        }
        catch (e) {
            onError?.(e instanceof Error ? e : new Error(String(e)));
        }
        return () => this.stopStreamingScan();
    }
    /**
     * Stop the active streaming scan
     */
    stopStreamingScan() {
        if (this.activeStream) {
            try {
                this.activeStream.close();
            }
            catch {
                // Ignore errors when stopping
            }
            this.activeStream = null;
            console.log("[NpcOverlay] Streaming scan stopped");
        }
    }
    /**
     * Check if streaming scan is active
     */
    isStreaming() {
        return this.activeStream !== null;
    }
    async scan(filter) {
        const features = ["uniforms", "vertexarray"];
        if (filter?.includeTextures) {
            features.push("texturesnapshot");
        }
        console.log("[NpcOverlay] Recording render calls...");
        const renders = await withTimeout(_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features }), 10000, "scan");
        console.log("[NpcOverlay] Got", renders.length, "render calls");
        const result = this.scanFromRenders(renders, filter);
        console.log("[NpcOverlay] scanFromRenders returned", result.length, "meshes");
        return result;
    }
    scanFromRenders(renders, filter) {
        const meshes = [];
        for (const render of renders) {
            if (!render.vertexArray)
                continue;
            const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            if (progmeta.isUi)
                continue;
            if (!progmeta.uModelMatrix)
                continue;
            // If mainMeshOnly is set, require both uBones AND isMainMesh (matching npcview/streaming)
            if (filter?.mainMeshOnly) {
                if (!progmeta.uBones || !progmeta.isMainMesh)
                    continue;
            }
            else {
                // Default behavior: accept either isMainMesh or isTinted
                if (!progmeta.isMainMesh && !progmeta.isTinted)
                    continue;
            }
            const vertexCount = render.vertexArray.indexBuffer?.length || 0;
            const maxVertexCount = filter?.maxVertexCount ?? 10000;
            if (vertexCount > maxVertexCount)
                continue;
            if (filter) {
                if (filter.excludeFloor && progmeta.isFloor)
                    continue;
                if (filter.vertexCount !== undefined) {
                    if (typeof filter.vertexCount === "number") {
                        if (vertexCount !== filter.vertexCount)
                            continue;
                    }
                    else {
                        if (filter.vertexCount.min !== undefined && vertexCount < filter.vertexCount.min)
                            continue;
                        if (filter.vertexCount.max !== undefined && vertexCount > filter.vertexCount.max)
                            continue;
                    }
                }
                if (filter.vertexCounts !== undefined && filter.vertexCounts.length > 0) {
                    if (!filter.vertexCounts.includes(vertexCount))
                        continue;
                }
                if (filter.hasBones !== undefined && !!progmeta.uBones !== filter.hasBones)
                    continue;
            }
            const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
            const modelMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray(rotmatrix);
            const x = rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 1.5;
            const y = rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
            const z = rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 0.5;
            const yRotation = -Math.atan2(rotmatrix[8], rotmatrix[0]);
            if (!this.viewProjMatrix) {
                const projuni = progmeta.raw.uniforms.find((q) => q.name === "uViewProjMatrix");
                if (projuni) {
                    this.viewProjMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray((0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, projuni)[0]);
                }
            }
            let screenPos;
            if (this.viewProjMatrix) {
                const worldPos = new three__WEBPACK_IMPORTED_MODULE_3__.Vector3(rotmatrix[12], rotmatrix[13], rotmatrix[14]);
                const clipPos = worldPos.applyMatrix4(this.viewProjMatrix);
                screenPos = {
                    x: (clipPos.x * 0.5 + 0.5) * this.screenWidth,
                    y: (1 - (clipPos.y * 0.5 + 0.5)) * this.screenHeight,
                    z: clipPos.z,
                };
            }
            let textures;
            if (render.samplers && Object.keys(render.samplers).length > 0) {
                textures = [];
                for (const [samplerId, snapshot] of Object.entries(render.samplers)) {
                    if (snapshot && snapshot.canCapture()) {
                        textures.push({
                            samplerId: parseInt(samplerId, 10),
                            texId: snapshot.texid,
                            width: snapshot.width,
                            height: snapshot.height,
                            snapshot,
                        });
                    }
                }
                if (textures.length === 0)
                    textures = undefined;
            }
            meshes.push({
                vaoId: render.vertexObjectId,
                programId: render.program.programId,
                vertexCount,
                position: { x, y, z },
                rotation: yRotation,
                modelMatrix,
                screenPos,
                hasBones: !!progmeta.uBones,
                render,
                progmeta,
                textures,
            });
        }
        if (filter?.excludeSelf && meshes.length > 0) {
            const centerX = this.screenWidth / 2;
            const centerY = this.screenHeight / 2;
            let closestIdx = -1;
            let closestDist = Infinity;
            for (let i = 0; i < meshes.length; i++) {
                const mesh = meshes[i];
                if (mesh.screenPos) {
                    const dx = mesh.screenPos.x - centerX;
                    const dy = mesh.screenPos.y - centerY;
                    const dist = dx * dx + dy * dy;
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIdx = i;
                    }
                }
            }
            if (closestIdx >= 0) {
                meshes.splice(closestIdx, 1);
            }
        }
        return meshes;
    }
    /**
     * Scan and group meshes by model matrix.
     * Returns NPC groups where each group contains all mesh parts for one entity.
     * Useful for computing combined hashes that include body + weapons + accessories.
     */
    async scanGrouped(filter) {
        // Log memory before scan
        this.logMemoryStatus();
        // NOTE: Removed "texturesnapshot" - TextureSnapshots are massive memory hogs (can be 500MB+)
        // Only use textures when explicitly needed for texture capture
        const features = ["uniforms", "vertexarray"];
        if (filter?.includeTextures) {
            features.push("texturesnapshot");
        }
        const renders = await withTimeout(_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features }), 10000, "scanGrouped");
        // Check memory after capturing renders
        const memState = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.memoryState();
        if (memState && memState.used / memState.size > 0.8) {
            const usedMB = (memState.used / (1024 * 1024)).toFixed(1);
            console.warn(`[scanGrouped] ⚠️ Memory after capture: ${usedMB}MB (${((memState.used / memState.size) * 100).toFixed(1)}%)`);
        }
        return this.scanGroupedFromRenders(renders, filter);
    }
    /**
     * Scan and group meshes, with multi-frame capture for better coverage.
     * Captures multiple frames to catch meshes that render at different times.
     * Includes periodic memory cleanup to prevent exhaustion.
     *
     * @param filter Filter options including retryIncomplete and retryDelay
     * @returns Object with groups, incomplete positions, and scan statistics
     */
    async scanGroupedWithRetry(filter) {
        const startTime = performance.now();
        const isAggressive = filter?.aggressiveScan ?? false;
        // Aggressive mode: more frames, longer capture, animation cycle detection
        // Increased to catch NPCs on different elevations/floors
        const maxFrames = filter?.maxFrames ?? (isAggressive ? 20 : 8);
        const baseDelay = filter?.retryDelay ?? (isAggressive ? 100 : 50);
        const noNewMeshThreshold = filter?.noNewMeshThreshold ?? 4;
        // Collect minimal render data across multiple frames
        const allRenders = [];
        const seenVaoIds = new Set();
        const programIdsFound = new Set();
        // Statistics tracking
        let totalRenderCalls = 0;
        let framesCaptured = 0;
        let consecutiveNoNewMeshes = 0;
        let earlyStopReason;
        console.log(`[NpcOverlay] Starting ${isAggressive ? 'AGGRESSIVE' : 'normal'} scan (MEMORY-SAFE)...`);
        console.log(`[NpcOverlay] Max frames: ${maxFrames}, delay: ${baseDelay}ms, early stop after ${noNewMeshThreshold} empty frames`);
        // Log initial memory state
        this.logMemoryStatus();
        // Small delay before first capture to ensure game is in a good state
        await new Promise(resolve => setTimeout(resolve, 50));
        // Try capturing multiple times if first attempt returns nothing
        let initialRenders = [];
        for (let attempt = 0; attempt < 3; attempt++) { // Reduced from 5 to 3
            initialRenders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features: ["uniforms", "vertexarray"] }); // Removed "textures" to save memory
            if (initialRenders.length > 0)
                break;
            console.log(`[NpcOverlay] Initial capture attempt ${attempt + 1} returned 0 renders, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 50 + attempt * 50));
        }
        framesCaptured++;
        totalRenderCalls += initialRenders.length;
        console.log(`[NpcOverlay] Initial frame: ${initialRenders.length} render calls`);
        for (const render of initialRenders) {
            if (!seenVaoIds.has(render.vertexObjectId)) {
                seenVaoIds.add(render.vertexObjectId);
                // Store only essential data
                allRenders.push({
                    vertexObjectId: render.vertexObjectId,
                    programId: render.program.programId,
                    uniformState: render.uniformState,
                    vertexArray: render.vertexArray,
                    program: render.program,
                    samplers: render.samplers,
                    renderRanges: render.renderRanges,
                    renderMode: render.renderMode,
                    indexType: render.indexType,
                });
                programIdsFound.add(render.program.programId);
            }
        }
        const initialMeshCount = allRenders.length;
        console.log(`[NpcOverlay] Initial unique meshes: ${initialMeshCount}`);
        // Capture additional frames with animation cycle detection
        for (let frame = 0; frame < maxFrames; frame++) {
            // Use staggered delays: base, base*1.5, base, base*2, base, etc.
            // This helps catch meshes that render at different intervals
            const delay = frame % 3 === 1 ? baseDelay * 1.5 : frame % 3 === 2 ? baseDelay * 2 : baseDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
            const frameRenders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features: ["uniforms", "vertexarray"] });
            framesCaptured++;
            totalRenderCalls += frameRenders.length;
            let newMeshes = 0;
            for (const render of frameRenders) {
                if (!seenVaoIds.has(render.vertexObjectId)) {
                    seenVaoIds.add(render.vertexObjectId);
                    allRenders.push({
                        vertexObjectId: render.vertexObjectId,
                        programId: render.program.programId,
                        uniformState: render.uniformState,
                        vertexArray: render.vertexArray,
                        program: render.program,
                        samplers: render.samplers,
                        renderRanges: render.renderRanges,
                        renderMode: render.renderMode,
                        indexType: render.indexType,
                    });
                    programIdsFound.add(render.program.programId);
                    newMeshes++;
                }
            }
            if (newMeshes > 0) {
                consecutiveNoNewMeshes = 0;
                console.log(`[NpcOverlay] Frame ${frame + 2}: +${newMeshes} new meshes (total: ${allRenders.length})`);
            }
            else {
                consecutiveNoNewMeshes++;
                // Animation cycle detection: stop if no new meshes for threshold frames
                if (consecutiveNoNewMeshes >= noNewMeshThreshold) {
                    earlyStopReason = `No new meshes for ${noNewMeshThreshold} consecutive frames (animation cycle complete)`;
                    console.log(`[NpcOverlay] ${earlyStopReason}`);
                    break;
                }
            }
            // Progress logging every 3 frames (reduced from 5)
            if ((frame + 1) % 3 === 0) {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                console.log(`[NpcOverlay] Progress: ${frame + 2}/${maxFrames + 1} frames, ${allRenders.length} unique meshes, ${elapsed}s elapsed`);
                // Check memory every 3 frames
                const memState = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.memoryState();
                if (memState) {
                    const pctUsed = memState.used / memState.size;
                    const usedMB = (memState.used / (1024 * 1024)).toFixed(1);
                    if (pctUsed > 0.9) {
                        console.error(`[NpcOverlay] 🚨 CRITICAL memory: ${usedMB}MB (${(pctUsed * 100).toFixed(1)}%) - stopping scan early`);
                        earlyStopReason = `Memory critical (${(pctUsed * 100).toFixed(0)}%)`;
                        break;
                    }
                    else if (pctUsed > 0.7) {
                        console.warn(`[NpcOverlay] ⚠️ Memory: ${usedMB}MB (${(pctUsed * 100).toFixed(1)}%)`);
                    }
                }
            }
        }
        // Final cleanup after capture loop
        console.log(`[NpcOverlay] Post-capture cleanup...`);
        try {
            await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.resetOpenGlState();
        }
        catch (e) {
            console.warn(`[NpcOverlay] Post-capture cleanup failed:`, e);
        }
        const captureTimeMs = performance.now() - startTime;
        const newMeshesFromRetry = allRenders.length - initialMeshCount;
        console.log(`[NpcOverlay] Capture complete: ${allRenders.length} unique meshes in ${(captureTimeMs / 1000).toFixed(2)}s`);
        console.log(`[NpcOverlay] Found ${newMeshesFromRetry} additional meshes from multi-frame capture`);
        console.log(`[NpcOverlay] Unique program IDs: ${programIdsFound.size}`);
        // Process all collected renders with fuzzy grouping
        // Cast MinimalRenderData to RenderInvocation - they share the essential fields
        const allGroups = this.scanGroupedFromRenders(allRenders, filter);
        const incomplete = this.getLastIncompletePositions();
        // Compile statistics
        const statistics = {
            totalFramesCaptured: framesCaptured,
            totalRenderCalls,
            uniqueMeshesFound: allRenders.length,
            groupsFormed: allGroups.length,
            incompletePositions: incomplete.length,
            captureTimeMs,
            skippedByFilter: this._lastFilterStats || {
                ui: 0, floor: 0, noMatrix: 0, notMesh: 0, noVerts: 0
            },
            programIdsFound,
            earlyStopReason,
        };
        // Store statistics for UI access
        this._lastScanStatistics = statistics;
        console.log(`[NpcOverlay] Grouped into ${allGroups.length} NPC groups`);
        if (incomplete.length > 0) {
            console.log(`[NpcOverlay] ${incomplete.length} positions still incomplete (tint only)`);
        }
        return { groups: allGroups, incomplete, statistics };
    }
    /**
     * Get statistics from the last scan operation
     */
    getLastScanStatistics() {
        return this._lastScanStatistics;
    }
    /**
     * Rescan a specific position across multiple frames to capture all mesh parts.
     * Captures a full animation cycle worth of frames to find all mesh variations.
     *
     * @param targetGroup The NPC group to rescan (uses its position)
     * @param options Optional settings for frame count and delay
     * @returns Updated group with all mesh parts found across frames
     */
    async rescanGroupMultiFrame(targetGroup, options = {}) {
        // More aggressive defaults - capture ~2 seconds of animation
        const frameCount = options.frameCount ?? 20;
        const frameDelay = options.frameDelay ?? 100;
        const tolerance = options.positionTolerance ?? 0.5; // Larger tolerance for attached items
        // Target position and rotation to match
        const targetX = targetGroup.position.x;
        const targetY = targetGroup.position.y;
        const targetZ = targetGroup.position.z;
        const targetRotation = targetGroup.mainMesh.rotation;
        console.log(`[NpcOverlay] Rescanning position (${targetX.toFixed(2)}, ${targetY.toFixed(2)}, ${targetZ.toFixed(2)}) rot=${targetRotation.toFixed(2)}`);
        console.log(`[NpcOverlay] Capturing ${frameCount} frames over ${(frameCount * frameDelay / 1000).toFixed(1)}s for full animation cycle...`);
        // Collect all unique meshes at this position across multiple frames
        const collectedMeshes = [];
        const collectedRenders = [];
        const seenVaoIds = new Set();
        // Track stats
        let totalRendersChecked = 0;
        let skippedWrongPos = 0;
        let skippedWrongRot = 0;
        // Add existing meshes from the target group
        for (const mesh of targetGroup.allMeshes) {
            if (!seenVaoIds.has(mesh.vaoId)) {
                seenVaoIds.add(mesh.vaoId);
                collectedMeshes.push(mesh);
                collectedRenders.push(mesh.render);
            }
        }
        console.log(`[NpcOverlay] Starting with ${collectedMeshes.length} meshes from original group`);
        // Capture multiple frames to catch all animation states
        for (let frame = 0; frame < frameCount; frame++) {
            await new Promise(resolve => setTimeout(resolve, frameDelay));
            // NOTE: Removed "textures" - TextureSnapshots are massive memory hogs
            const frameRenders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features: ["uniforms", "vertexarray"] });
            let newMeshes = 0;
            for (const render of frameRenders) {
                if (!render.vertexArray)
                    continue;
                totalRendersChecked++;
                // Skip if already seen
                if (seenVaoIds.has(render.vertexObjectId))
                    continue;
                const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
                // Skip UI and floor
                if (progmeta.isUi)
                    continue;
                if (progmeta.isFloor)
                    continue;
                if (!progmeta.uModelMatrix)
                    continue;
                // Accept ANY mesh with a model matrix (very permissive for animation capture)
                // We'll filter by position/rotation instead
                const vertexCount = render.vertexArray.indexBuffer?.length || 0;
                if (vertexCount === 0)
                    continue;
                const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
                const x = rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 1.5;
                const y = rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
                const z = rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 0.5;
                const yRotation = -Math.atan2(rotmatrix[8], rotmatrix[0]);
                // Check position - use XZ distance (horizontal), Y can vary more for held items
                const dxz = Math.sqrt((x - targetX) ** 2 + (z - targetZ) ** 2);
                const dy = Math.abs(y - targetY);
                // Position must be close horizontally, but allow more vertical variation
                if (dxz > tolerance) {
                    skippedWrongPos++;
                    continue;
                }
                if (dy > tolerance * 3) {
                    skippedWrongPos++;
                    continue;
                } // More vertical tolerance
                // Rotation should be similar (within ~30 degrees)
                let rotDiff = Math.abs(yRotation - targetRotation);
                if (rotDiff > Math.PI)
                    rotDiff = 2 * Math.PI - rotDiff;
                if (rotDiff > 0.5) {
                    skippedWrongRot++;
                    continue;
                } // ~30 degrees tolerance
                // This mesh belongs to the target NPC
                seenVaoIds.add(render.vertexObjectId);
                newMeshes++;
                const modelMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray(rotmatrix);
                let screenPos;
                if (this.viewProjMatrix) {
                    const worldPos = new three__WEBPACK_IMPORTED_MODULE_3__.Vector3(rotmatrix[12], rotmatrix[13], rotmatrix[14]);
                    const clipPos = worldPos.applyMatrix4(this.viewProjMatrix);
                    screenPos = {
                        x: (clipPos.x * 0.5 + 0.5) * this.screenWidth,
                        y: (1 - (clipPos.y * 0.5 + 0.5)) * this.screenHeight,
                        z: clipPos.z,
                    };
                }
                const mesh = {
                    vaoId: render.vertexObjectId,
                    programId: render.program.programId,
                    vertexCount,
                    position: { x, y, z },
                    rotation: yRotation,
                    modelMatrix,
                    screenPos,
                    hasBones: !!progmeta.uBones,
                    render,
                    progmeta,
                };
                collectedMeshes.push(mesh);
                collectedRenders.push(render);
            }
            if (newMeshes > 0) {
                console.log(`[NpcOverlay] Frame ${frame + 1}/${frameCount}: +${newMeshes} new meshes (total: ${collectedMeshes.length})`);
            }
        }
        console.log(`[NpcOverlay] Rescan complete: ${collectedMeshes.length} total meshes (was ${targetGroup.allMeshes.length})`);
        console.log(`[NpcOverlay] Checked ${totalRendersChecked} renders, skipped: pos=${skippedWrongPos}, rot=${skippedWrongRot}`);
        // Deduplicate meshes by position buffer hash
        const seenMeshHashes = new Set();
        const uniqueMeshes = [];
        const uniqueRenders = [];
        for (let i = 0; i < collectedMeshes.length; i++) {
            const mesh = collectedMeshes[i];
            const hashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_4__.extractBufferHashes)(mesh.render);
            if (hashes.posBufferHashNum === 0 || !seenMeshHashes.has(hashes.posBufferHashNum)) {
                if (hashes.posBufferHashNum !== 0) {
                    seenMeshHashes.add(hashes.posBufferHashNum);
                }
                uniqueMeshes.push(mesh);
                uniqueRenders.push(collectedRenders[i]);
            }
        }
        console.log(`[NpcOverlay] After dedup: ${uniqueMeshes.length} unique meshes (${collectedMeshes.length - uniqueMeshes.length} duplicates removed)`);
        // Find the best main mesh (with bones, or largest)
        let mainMesh = uniqueMeshes.find(m => m.hasBones && m.progmeta.isMainMesh);
        if (!mainMesh) {
            mainMesh = uniqueMeshes.reduce((a, b) => a.vertexCount > b.vertexCount ? a : b);
        }
        const totalVertexCount = uniqueMeshes.reduce((sum, m) => sum + m.vertexCount, 0);
        return {
            mainMesh,
            allMeshes: uniqueMeshes,
            renders: uniqueRenders,
            totalVertexCount,
            meshCount: uniqueMeshes.length,
            position: targetGroup.position,
            modelMatrix: targetGroup.modelMatrix,
        };
    }
    /**
     * Group meshes from render invocations by model matrix.
     * Supports fuzzy position grouping for attached items with slight position variations.
     */
    scanGroupedFromRenders(renders, filter) {
        // Position tolerance for fuzzy grouping (in tiles)
        const tolerance = filter?.positionTolerance ?? 0.1;
        const toleranceMultiplier = Math.round(1 / tolerance); // Convert tolerance to rounding factor
        const groups = new Map();
        // Debug counters - store for statistics
        let skippedUi = 0, skippedFloor = 0, skippedNoMatrix = 0, skippedNotMesh = 0, skippedNoVerts = 0, accepted = 0;
        for (const render of renders) {
            if (!render.vertexArray)
                continue;
            const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            // Skip UI and floor
            if (progmeta.isUi) {
                skippedUi++;
                continue;
            }
            if (filter?.excludeFloor !== false && progmeta.isFloor) {
                // Log first few skipped floors that have bones (might be NPCs)
                if (progmeta.uBones && skippedFloor < 3) {
                    console.log(`[NpcOverlay] Skipping as floor but has bones! verts:${render.vertexArray.indexBuffer?.length || 0}`);
                }
                skippedFloor++;
                continue;
            }
            if (!progmeta.uModelMatrix) {
                skippedNoMatrix++;
                continue;
            }
            // Accept meshes that are: main mesh, tinted, OR have bones (animated)
            // This catches NPCs that might not have lighting defines but are still animated entities
            if (!progmeta.isMainMesh && !progmeta.isTinted && !progmeta.uBones) {
                // Log first few skipped for debugging - include more metadata to diagnose missing NPCs
                if (skippedNotMesh < 10) {
                    const verts = render.vertexArray.indexBuffer?.length || 0;
                    console.log(`[NpcOverlay] Skipping mesh - verts:${verts} isMainMesh:${progmeta.isMainMesh} isTinted:${progmeta.isTinted} hasBones:${!!progmeta.uBones} isLighted:${progmeta.isLighted} isParticles:${progmeta.isParticles} isShadow:${progmeta.isShadowRender} isFloor:${progmeta.isFloor} fragDefines:${progmeta.fragdefines.slice(0, 3).join(',')}`);
                }
                skippedNotMesh++;
                continue;
            }
            const vertexCount = render.vertexArray.indexBuffer?.length || 0;
            if (vertexCount === 0) {
                skippedNoVerts++;
                continue;
            }
            // Skip blank meshes (no valid buffer hash) - these are auxiliary meshes like shadows/hitboxes
            const bufferHashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_4__.extractBufferHashes)(render);
            if (bufferHashes.posBufferHash === "0x00000000") {
                skippedNoVerts++; // Count as no verts since it's effectively empty
                continue;
            }
            accepted++;
            // Log first few accepted meshes with significant vertex counts for debugging
            if (accepted <= 5 && vertexCount > 500) {
                console.log(`[NpcOverlay] ACCEPTED mesh - verts:${vertexCount} isMainMesh:${progmeta.isMainMesh} isTinted:${progmeta.isTinted} hasBones:${!!progmeta.uBones} isLighted:${progmeta.isLighted}`);
            }
            const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
            const x = rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 1.5;
            const y = rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
            const z = rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 0.5;
            const yRotation = -Math.atan2(rotmatrix[8], rotmatrix[0]);
            // JS-side diagnostic: log raw matrix positions to compare with C++ uniformDiag
            if (accepted <= 20) {
                console.log(`[NpcOverlay] JS uniformDiag[${accepted}]: raw=[${rotmatrix[12].toFixed(1)},${rotmatrix[13].toFixed(1)},${rotmatrix[14].toFixed(1)}] tile=[${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}] bufLen=${render.uniformState?.byteLength} snapshotOff=${progmeta.uModelMatrix.snapshotOffset}`);
            }
            const modelMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray(rotmatrix);
            // Create a key from the model matrix (position + rotation)
            // Use tolerance-based rounding for fuzzy grouping
            const matrixKey = `${Math.round(x * toleranceMultiplier)}_${Math.round(y * toleranceMultiplier)}_${Math.round(z * toleranceMultiplier)}_${Math.round(yRotation * 100)}`;
            // Get/update viewProjMatrix
            if (!this.viewProjMatrix) {
                const projuni = progmeta.raw.uniforms.find((q) => q.name === "uViewProjMatrix");
                if (projuni) {
                    this.viewProjMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray((0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, projuni)[0]);
                }
            }
            let screenPos;
            if (this.viewProjMatrix) {
                const worldPos = new three__WEBPACK_IMPORTED_MODULE_3__.Vector3(rotmatrix[12], rotmatrix[13], rotmatrix[14]);
                const clipPos = worldPos.applyMatrix4(this.viewProjMatrix);
                screenPos = {
                    x: (clipPos.x * 0.5 + 0.5) * this.screenWidth,
                    y: (1 - (clipPos.y * 0.5 + 0.5)) * this.screenHeight,
                    z: clipPos.z,
                };
            }
            const mesh = {
                vaoId: render.vertexObjectId,
                programId: render.program.programId,
                vertexCount,
                position: { x, y, z },
                rotation: yRotation,
                modelMatrix,
                screenPos,
                hasBones: !!progmeta.uBones,
                render,
                progmeta,
            };
            if (!groups.has(matrixKey)) {
                groups.set(matrixKey, { meshes: [], renders: [], matrix: modelMatrix, centroid: { x, y, z } });
            }
            const group = groups.get(matrixKey);
            group.meshes.push(mesh);
            group.renders.push(render);
            // Update centroid as running average
            const n = group.meshes.length;
            group.centroid.x = ((n - 1) * group.centroid.x + x) / n;
            group.centroid.y = ((n - 1) * group.centroid.y + y) / n;
            group.centroid.z = ((n - 1) * group.centroid.z + z) / n;
        }
        // Store filter statistics for scan statistics
        this._lastFilterStats = {
            ui: skippedUi,
            floor: skippedFloor,
            noMatrix: skippedNoMatrix,
            notMesh: skippedNotMesh,
            noVerts: skippedNoVerts,
        };
        // Log filter statistics
        console.log(`[NpcOverlay] Filter stats: ${renders.length} renders → ${accepted} accepted (UI:${skippedUi}, Floor:${skippedFloor}, NoMatrix:${skippedNoMatrix}, NotMesh:${skippedNotMesh}, NoVerts:${skippedNoVerts})`);
        console.log(`[NpcOverlay] Grouped into ${groups.size} position groups`);
        // Convert to NpcMeshGroup array and track incomplete positions
        const result = [];
        const incomplete = [];
        let groupsWithBones = 0, groupsNoBones = 0;
        // Define mesh count limit outside loop for use in logging
        const maxMeshCount = filter?.maxMeshCount ?? 15;
        for (const [key, group] of groups) {
            // Find the main mesh using priority:
            // 1. Mesh with both bones AND isMainMesh (ideal case)
            // 2. Largest mesh with bones (animated but not marked as main - like Death)
            // 3. Fallback to largest mesh overall
            let mainMesh = group.meshes.find(m => m.hasBones && m.progmeta.isMainMesh);
            if (!mainMesh) {
                // Look for meshes with bones, pick the largest
                const meshesWithBones = group.meshes.filter(m => m.hasBones);
                if (meshesWithBones.length > 0) {
                    mainMesh = meshesWithBones.reduce((a, b) => a.vertexCount > b.vertexCount ? a : b);
                }
                else {
                    // No bones, fallback to largest mesh
                    mainMesh = group.meshes.reduce((a, b) => a.vertexCount > b.vertexCount ? a : b);
                }
            }
            // Check if this group is a valid NPC
            // Valid if: ANY mesh has bones (animated), OR main mesh is isMainMesh (lighted 3D object)
            const anyMeshHasBones = group.meshes.some(m => m.hasBones);
            const isValidNpc = anyMeshHasBones || mainMesh.progmeta.isMainMesh;
            if (!isValidNpc) {
                groupsNoBones++;
                // Check if any mesh is tinted (has uTint) - indicates incomplete render
                const tintedMeshes = group.meshes.filter(m => m.progmeta.isTinted);
                if (tintedMeshes.length > 0) {
                    // This is an incomplete position - only tint/occlusion rendered
                    const pos = tintedMeshes[0].position;
                    incomplete.push({
                        key,
                        position: pos,
                        screenPos: tintedMeshes[0].screenPos,
                        tintedMeshCount: tintedMeshes.length,
                        modelMatrix: group.matrix,
                    });
                }
                continue;
            }
            groupsWithBones++;
            // Deduplicate meshes within this group by position buffer hash
            const seenMeshHashes = new Set();
            const uniqueMeshes = [];
            const uniqueRenders = [];
            for (let i = 0; i < group.meshes.length; i++) {
                const mesh = group.meshes[i];
                const hashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_4__.extractBufferHashes)(mesh.render);
                if (hashes.posBufferHashNum === 0 || !seenMeshHashes.has(hashes.posBufferHashNum)) {
                    if (hashes.posBufferHashNum !== 0) {
                        seenMeshHashes.add(hashes.posBufferHashNum);
                    }
                    uniqueMeshes.push(mesh);
                    uniqueRenders.push(group.renders[i]);
                }
            }
            const totalVertexCount = uniqueMeshes.reduce((sum, m) => sum + m.vertexCount, 0);
            // Check if ANY mesh in the group has bones (animated entity = NPC)
            const groupHasBones = uniqueMeshes.some(m => m.hasBones);
            // Filter out groups with too many meshes (likely terrain/complex objects, not NPCs)
            // EXCEPTION: Groups with bones are NPCs and should NEVER be filtered
            const hasTooManyMeshes = uniqueMeshes.length > maxMeshCount;
            if (!groupHasBones && hasTooManyMeshes) {
                continue;
            }
            // Log NPCs with many meshes kept due to bones
            if (groupHasBones && hasTooManyMeshes) {
                console.log(`[NpcOverlay] Keeping NPC with bones: ${uniqueMeshes.length} meshes, ${totalVertexCount} verts (would be filtered without bones)`);
            }
            // Use the main mesh from unique meshes if it was deduplicated
            if (!uniqueMeshes.includes(mainMesh)) {
                mainMesh = uniqueMeshes.find(m => m.hasBones && m.progmeta.isMainMesh) ||
                    uniqueMeshes.reduce((a, b) => a.vertexCount > b.vertexCount ? a : b);
            }
            result.push({
                mainMesh,
                allMeshes: uniqueMeshes,
                renders: uniqueRenders,
                totalVertexCount,
                meshCount: uniqueMeshes.length,
                position: mainMesh.position,
                modelMatrix: group.matrix,
            });
        }
        // Count NPCs with many meshes in results
        const manyMeshNpcs = result.filter(g => g.meshCount > maxMeshCount && g.allMeshes.some(m => m.hasBones));
        console.log(`[NpcOverlay] Groups: ${groupsWithBones} valid NPCs (bones or mainMesh), ${groupsNoBones} skipped (tint-only or non-NPC), ${incomplete.length} incomplete`);
        if (manyMeshNpcs.length > 0) {
            console.log(`[NpcOverlay] Kept ${manyMeshNpcs.length} NPCs with many meshes (bones override filter): ${manyMeshNpcs.map(g => `${g.meshCount}m`).join(', ')}`);
        }
        // Sort by distance from screen center (closest first)
        const centerX = this.screenWidth / 2;
        const centerY = this.screenHeight / 2;
        result.sort((a, b) => {
            const aDist = a.mainMesh.screenPos
                ? Math.hypot(a.mainMesh.screenPos.x - centerX, a.mainMesh.screenPos.y - centerY)
                : Infinity;
            const bDist = b.mainMesh.screenPos
                ? Math.hypot(b.mainMesh.screenPos.x - centerX, b.mainMesh.screenPos.y - centerY)
                : Infinity;
            return aDist - bDist;
        });
        // Store incomplete positions for potential retry
        this._lastIncompletePositions = incomplete;
        return result;
    }
    /**
     * Get incomplete positions from the last scan (positions with only tinted meshes)
     */
    getLastIncompletePositions() {
        return this._lastIncompletePositions || [];
    }
    async highlightNpc(npc, options = {}) {
        const { color = { r: 255, g: 0, b: 0, a: 200 }, thickness = 0.03, size = 0.4, } = options;
        console.log("[NpcOverlay] highlightNpc called with vaoId:", npc.vaoId, "options:", options);
        const colorTuple = toColorTuple(color);
        const progmeta = npc.progmeta;
        if (!progmeta) {
            console.error("[NpcOverlay] NPC has no progmeta");
            return null;
        }
        const uViewProjMatrix = progmeta.raw.uniforms.find((q) => q.name === "uViewProjMatrix");
        if (!uViewProjMatrix || !progmeta.uModelMatrix) {
            console.error("[NpcOverlay] NPC program missing required uniforms. uViewProjMatrix:", !!uViewProjMatrix, "uModelMatrix:", !!progmeta.uModelMatrix);
            return null;
        }
        console.log("[NpcOverlay] Creating highlight overlay with radius:", size, "thickness:", thickness);
        const radius = size * _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
        const t = thickness * _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
        const segments = 32;
        const pos = [];
        const colors = [];
        const indices = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            pos.push(cos * (radius + t), 0, sin * (radius + t));
            colors.push(...colorTuple);
            pos.push(cos * radius, 0, sin * radius);
            colors.push(...colorTuple);
        }
        for (let i = 0; i < segments; i++) {
            const i0 = i * 2;
            indices.push(i0, i0 + 1, i0 + 2);
            indices.push(i0 + 1, i0 + 3, i0 + 2);
        }
        const vertex = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createVertexArray(new Uint8Array(Uint16Array.from(indices).buffer), [
            {
                location: 0,
                buffer: new Uint8Array(Float32Array.from(pos).buffer),
                enabled: true,
                normalized: false,
                offset: 0,
                scalartype: GL_FLOAT,
                stride: 12,
                vectorlength: 3,
            },
            {
                location: 6,
                buffer: Uint8Array.from(colors),
                enabled: true,
                normalized: true,
                offset: 0,
                scalartype: GL_UNSIGNED_BYTE,
                stride: 4,
                vectorlength: 4,
            },
        ]);
        const localShader = `
      #version 330 core
      layout (location = 0) in vec3 aPos;
      layout (location = 6) in vec4 aColor;
      uniform mat4 uViewProjMatrix;
      uniform mat4 uModelMatrix;
      out vec4 vColor;
      void main() {
        vec4 worldPos = uModelMatrix * vec4(aPos, 1.0);
        gl_Position = uViewProjMatrix * worldPos;
        vColor = aColor;
      }
    `;
        const program = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createProgram(localShader, fragShader, [
            { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
            { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4 },
        ], [
            { name: "uViewProjMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 0, snapshotSize: 64 },
            { name: "uModelMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 64, snapshotSize: 64 },
        ]);
        try {
            console.log("[NpcOverlay] Calling beginOverlay with vertexObjectId:", npc.vaoId);
            const handle = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({ vertexObjectId: npc.vaoId }, program, vertex, {
                uniformSources: [
                    { name: "uViewProjMatrix", sourceName: uViewProjMatrix.name, type: "program" },
                    { name: "uModelMatrix", sourceName: progmeta.uModelMatrix.name, type: "program" },
                ],
                renderMode: "triangles",
                trigger: "after",
            });
            console.log("[NpcOverlay] beginOverlay returned handle:", handle);
            this.overlayHandles.push(handle);
            return handle;
        }
        catch (e) {
            console.error("[NpcOverlay] Failed to create overlay:", e);
            return null;
        }
    }
    /**
     * Highlight an NPC by replacing its fragment shader with a tinted version.
     * Follows chunkman's replaceGlslMain pattern:
     * - Keep original vertex shader UNCHANGED (bone transforms handled natively)
     * - Only modify fragment shader: rename main() -> originalMain(), append tint
     * - Use sequential uniform layout (like UniformSnapshotBuilder) with length:1
     * - Forward ALL uniforms from original program via uniformSources
     */
    async highlightNpcShaderReplace(npc, options = {}) {
        const { color = { r: 255, g: 0, b: 0, a: 200 }, alpha = 0.6 } = options;
        const colorTuple = toColorTuple(color);
        const r = colorTuple[0] / 255;
        const g = colorTuple[1] / 255;
        const b = colorTuple[2] / 255;
        const origProg = npc.render.program;
        console.log("[NpcOverlay] highlightNpcShaderReplace - programId:", origProg.programId, "vaoId:", npc.vaoId, "uniforms:", origProg.uniforms.length, "inputs:", origProg.inputs.length, "uniformBufferSize:", origProg.uniformBufferSize);
        try {
            // UBO-backed uniforms (blockIndex >= 0) like bone transforms are read directly
            // from bound UBOs by the shader. Including them in createProgram args would cause
            // the native code to try glUniform* uploads on UBO locations → GL errors.
            // Only include regular (non-UBO) uniforms in our snapshot buffer.
            const regularUniforms = origProg.uniforms.filter(u => u.blockIndex < 0);
            const uboUniforms = origProg.uniforms.filter(u => u.blockIndex >= 0);
            if (uboUniforms.length > 0) {
                console.log("[NpcOverlay] Skipping UBO uniforms:", uboUniforms.map(u => `${u.name}[${u.length}] block=${u.blockIndex}`));
            }
            // Build uniform layout with SEQUENTIAL offsets, length:1 for regular uniforms
            // (matches chunkman's UniformSnapshotBuilder pattern)
            let offset = 0;
            const uniforms = [];
            for (const u of regularUniforms) {
                const size = u.type.scalarSize * u.type.vectorLength; // size of 1 element
                uniforms.push({
                    name: u.name,
                    type: u.type.type,
                    length: 1,
                    snapshotOffset: offset,
                    snapshotSize: size,
                });
                offset += size;
            }
            // Build inputs from original program
            const inputs = origProg.inputs.map(i => ({
                name: i.name,
                length: i.length,
                location: i.location,
                type: i.type.type,
            }));
            // Keep vertex shader COMPLETELY UNCHANGED
            // (bone transforms, view/proj matrices, etc. all stay as-is)
            const vertShader = origProg.vertexShader.source;
            // Modify fragment shader using replaceGlslMain pattern
            const origFragSrc = origProg.fragmentShader.source;
            const outMatch = origFragSrc.match(/out\s+vec4\s+(\w+)/);
            const fragOutput = outMatch ? outMatch[1] : "gl_FragColor";
            // Robust regex: handle void main(), void main(void), varying whitespace/newlines
            const mainRegex = /void\s+main\s*\(\s*(?:void\s*)?\)\s*\{/;
            const mainMatched = mainRegex.test(origFragSrc);
            if (!mainMatched) {
                console.error("[NpcOverlay] FAILED to match main() in fragment shader! First 500 chars:", origFragSrc.slice(0, 500));
                return null;
            }
            // Instead of renaming main→originalMain (leaves dead UBO-referencing code),
            // truncate at main() and write a minimal replacement.
            // This keeps all declarations (UBOs, varyings, helpers) but removes original body.
            const mainIndex = origFragSrc.search(mainRegex);
            const preamble = origFragSrc.substring(0, mainIndex);
            console.log("[NpcOverlay] fragOutput:", fragOutput, "mainIndex:", mainIndex);
            console.log("[NpcOverlay] preamble (last 200):", preamble.slice(-200));
            const modifiedFrag = preamble + `
void main() {
    ${fragOutput} = vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1.0);
}
`;
            // Forward only regular (non-UBO) uniforms from original program at draw time.
            // UBO uniforms (bones etc.) are read directly from still-bound UBOs by the shader.
            const uniformSources = regularUniforms.map(u => ({
                name: u.name,
                sourceName: u.name,
                type: "program",
            }));
            console.log("[NpcOverlay] Shader replace:", "regular uniforms:", uniforms.length, "UBO uniforms (skipped):", uboUniforms.length, "bufferSize:", offset, "fragOutput:", fragOutput, "mainMatched:", mainMatched);
            // Debug: log shader sources for troubleshooting
            console.log("[NpcOverlay] Vert shader (first 200):", vertShader.slice(0, 200));
            console.log("[NpcOverlay] Frag shader (last 400):", modifiedFrag.slice(-400));
            const prog = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createProgram(vertShader, modifiedFrag, inputs, uniforms);
            // Don't provide uniformBuffer - let native use program's own buffer.
            // Native allocates to uniformBufferSize and processUniformCopy fills it.
            // Use both vertexObjectId AND programId filters to target this specific NPC.
            const handle = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({ vertexObjectId: npc.vaoId, programId: origProg.programId }, prog, undefined, {
                trigger: "replace",
                uniformSources,
                renderMode: "triangles",
            });
            console.log("[NpcOverlay] Shader replace overlay created, handle:", handle);
            this.overlayHandles.push(handle);
            return handle;
        }
        catch (e) {
            console.error("[NpcOverlay] highlightNpcShaderReplace failed:", e);
            return null;
        }
    }
    /**
     * Highlight all meshes in an NPC group by replacing their fragment shaders.
     */
    async highlightGroupShaderReplace(group, options = {}) {
        const handles = [];
        for (const mesh of group.allMeshes) {
            const handle = await this.highlightNpcShaderReplace(mesh, options);
            if (handle) {
                handles.push(handle);
            }
        }
        return handles;
    }
    async drawArrowAboveNpc(npc, options = {}) {
        const { color = { r: 255, g: 255, b: 0, a: 255 }, size = 0.3, height = 2.5 } = options;
        const colorTuple = toColorTuple(color);
        const progmeta = npc.progmeta;
        const uViewProjMatrix = progmeta.raw.uniforms.find((q) => q.name === "uViewProjMatrix");
        if (!uViewProjMatrix || !progmeta.uModelMatrix) {
            console.error("[NpcOverlay] NPC program missing required uniforms");
            return null;
        }
        const arrowSize = size * _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
        const arrowHeight = height * _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
        const pos = [];
        const colors = [];
        const indices = [];
        const tipY = arrowHeight - arrowSize * 1.5;
        const baseY = arrowHeight;
        const stemWidth = arrowSize * 0.25;
        const stemTop = arrowHeight + arrowSize * 0.8;
        // Plane 1 (XY) - arrow head
        pos.push(0, tipY, 0);
        colors.push(...colorTuple);
        pos.push(-arrowSize * 0.6, baseY, 0);
        colors.push(...colorTuple);
        pos.push(arrowSize * 0.6, baseY, 0);
        colors.push(...colorTuple);
        indices.push(0, 1, 2, 0, 2, 1);
        // Plane 1 - stem
        pos.push(-stemWidth, baseY, 0);
        colors.push(...colorTuple);
        pos.push(stemWidth, baseY, 0);
        colors.push(...colorTuple);
        pos.push(stemWidth, stemTop, 0);
        colors.push(...colorTuple);
        pos.push(-stemWidth, stemTop, 0);
        colors.push(...colorTuple);
        indices.push(3, 4, 5, 3, 5, 6, 3, 5, 4, 3, 6, 5);
        // Plane 2 (YZ) - arrow head
        const v = 7;
        pos.push(0, tipY, 0);
        colors.push(...colorTuple);
        pos.push(0, baseY, -arrowSize * 0.6);
        colors.push(...colorTuple);
        pos.push(0, baseY, arrowSize * 0.6);
        colors.push(...colorTuple);
        indices.push(v, v + 1, v + 2, v, v + 2, v + 1);
        // Plane 2 - stem
        pos.push(0, baseY, -stemWidth);
        colors.push(...colorTuple);
        pos.push(0, baseY, stemWidth);
        colors.push(...colorTuple);
        pos.push(0, stemTop, stemWidth);
        colors.push(...colorTuple);
        pos.push(0, stemTop, -stemWidth);
        colors.push(...colorTuple);
        indices.push(v + 3, v + 4, v + 5, v + 3, v + 5, v + 6, v + 3, v + 5, v + 4, v + 3, v + 6, v + 5);
        const vertex = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createVertexArray(new Uint8Array(Uint16Array.from(indices).buffer), [
            {
                location: 0,
                buffer: new Uint8Array(Float32Array.from(pos).buffer),
                enabled: true,
                normalized: false,
                offset: 0,
                scalartype: GL_FLOAT,
                stride: 12,
                vectorlength: 3,
            },
            {
                location: 6,
                buffer: Uint8Array.from(colors),
                enabled: true,
                normalized: true,
                offset: 0,
                scalartype: GL_UNSIGNED_BYTE,
                stride: 4,
                vectorlength: 4,
            },
        ]);
        const arrowShader = `
      #version 330 core
      layout (location = 0) in vec3 aPos;
      layout (location = 6) in vec4 aColor;
      uniform mat4 uViewProjMatrix;
      uniform mat4 uModelMatrix;
      out vec3 FragPos;
      out vec4 vColor;
      void main() {
        vec3 npcPos = vec3(uModelMatrix[3][0], uModelMatrix[3][1], uModelMatrix[3][2]);
        vec4 worldPos = vec4(npcPos + aPos, 1.0);
        gl_Position = uViewProjMatrix * worldPos;
        FragPos = worldPos.xyz;
        vColor = aColor;
      }
    `;
        const uSunlightViewMatrix = progmeta.raw.uniforms.find((q) => q.name === "uSunlightViewMatrix");
        const uSunColour = progmeta.raw.uniforms.find((q) => q.name === "uSunColour");
        const uAmbientColour = progmeta.raw.uniforms.find((q) => q.name === "uAmbientColour");
        const hasLighting = uSunlightViewMatrix && uSunColour && uAmbientColour;
        const uniforms = [
            { name: "uViewProjMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 0, snapshotSize: 64 },
            { name: "uModelMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 64, snapshotSize: 64 },
        ];
        const uniformSources = [
            { name: "uViewProjMatrix", sourceName: uViewProjMatrix.name, type: "program" },
            { name: "uModelMatrix", sourceName: progmeta.uModelMatrix.name, type: "program" },
        ];
        if (hasLighting) {
            uniforms.push({ name: "uSunlightViewMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 128, snapshotSize: 64 }, { name: "uSunColour", length: 1, type: GL_FLOAT_VEC3, snapshotOffset: 192, snapshotSize: 12 }, { name: "uAmbientColour", length: 1, type: GL_FLOAT_VEC3, snapshotOffset: 204, snapshotSize: 12 });
            uniformSources.push({ name: "uSunlightViewMatrix", sourceName: uSunlightViewMatrix.name, type: "program" }, { name: "uSunColour", sourceName: uSunColour.name, type: "program" }, { name: "uAmbientColour", sourceName: uAmbientColour.name, type: "program" });
        }
        const program = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createProgram(arrowShader, hasLighting ? fragShaderLit : fragShader, [
            { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
            { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4 },
        ], uniforms);
        try {
            const handle = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({ vertexObjectId: npc.vaoId }, program, vertex, { uniformSources, renderMode: "triangles", trigger: "after" });
            this.overlayHandles.push(handle);
            return handle;
        }
        catch (e) {
            console.error("[NpcOverlay] Failed to create arrow overlay:", e);
            return null;
        }
    }
    /**
     * Estimate NPC height from vertex data by finding max Y in position buffer
     * Returns height in tiles
     */
    estimateNpcHeight(npc) {
        try {
            const progmeta = npc.progmeta;
            if (!progmeta.aPos)
                return 2.5; // Default height
            const posAttr = npc.render.vertexArray.attributes.find(a => a.location === progmeta.aPos.location);
            if (!posAttr || !posAttr.buffer)
                return 2.5;
            // Read position buffer as floats (assuming GL_FLOAT vec3)
            const floatView = new Float32Array(posAttr.buffer.buffer, posAttr.buffer.byteOffset, posAttr.buffer.byteLength / 4);
            const stride = posAttr.stride / 4; // Stride in floats
            const offset = posAttr.offset / 4; // Offset in floats
            let maxY = 0;
            const numVerts = Math.floor(floatView.length / stride);
            // Sample every 100th vertex for performance (good enough for height estimate)
            const step = Math.max(1, Math.floor(numVerts / 1000));
            for (let i = 0; i < numVerts; i += step) {
                const yIdx = i * stride + offset + 1; // Y is second component
                if (yIdx < floatView.length) {
                    maxY = Math.max(maxY, floatView[yIdx]);
                }
            }
            // Convert from world units to tiles and add some padding
            const heightInTiles = maxY / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize + 0.5;
            console.log(`[NpcOverlay] Estimated NPC height: ${heightInTiles.toFixed(2)} tiles (maxY: ${maxY.toFixed(0)})`);
            return Math.max(2.5, heightInTiles); // Minimum 2.5 tiles
        }
        catch (e) {
            console.warn("[NpcOverlay] Failed to estimate NPC height:", e);
            return 2.5;
        }
    }
    async draw3DArrowAboveNpc(npc, options = {}) {
        // Auto-calculate height if not specified and autoHeight is true (default)
        const autoHeight = options.autoHeight !== false;
        const estimatedHeight = autoHeight && options.height === undefined ? this.estimateNpcHeight(npc) : undefined;
        // Reduced default segments from 12 to 6 for better memory efficiency
        const { color = { r: 255, g: 255, b: 0, a: 255 }, size = 0.3, height = estimatedHeight ?? 2.5, segments = 6 } = options;
        const colorTuple = toColorTuple(color);
        const progmeta = npc.progmeta;
        const uViewProjMatrix = progmeta.raw.uniforms.find((q) => q.name === "uViewProjMatrix");
        if (!uViewProjMatrix || !progmeta.uModelMatrix) {
            console.error("[NpcOverlay] NPC program missing required uniforms");
            return null;
        }
        const arrowSize = size * _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
        const arrowHeight = height * _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
        const pos = [];
        const normals = [];
        const colors = [];
        const indices = [];
        // Cone (arrow head)
        const coneRadius = arrowSize * 0.6;
        const coneHeight = arrowSize * 1.5;
        const coneBaseY = arrowHeight;
        const coneTipY = arrowHeight - coneHeight;
        pos.push(0, coneTipY, 0);
        normals.push(0, -1, 0);
        colors.push(...colorTuple);
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * coneRadius;
            const z = Math.sin(angle) * coneRadius;
            pos.push(x, coneBaseY, z);
            const nx = Math.cos(angle);
            const nz = Math.sin(angle);
            const ny = coneRadius / coneHeight;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals.push(nx / len, -ny / len, nz / len);
            colors.push(...colorTuple);
        }
        for (let i = 0; i < segments; i++) {
            indices.push(0, 1 + i, 1 + ((i + 1) % segments));
        }
        const coneBaseCenterIdx = pos.length / 3;
        pos.push(0, coneBaseY, 0);
        normals.push(0, 1, 0);
        colors.push(...colorTuple);
        for (let i = 0; i < segments; i++) {
            indices.push(coneBaseCenterIdx, 1 + ((i + 1) % segments), 1 + i);
        }
        // Cylinder (stem)
        const stemRadius = arrowSize * 0.2;
        const stemBottomY = coneBaseY;
        const stemTopY = arrowHeight + arrowSize * 0.8;
        const stemBottomStartIdx = pos.length / 3;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            pos.push(Math.cos(angle) * stemRadius, stemBottomY, Math.sin(angle) * stemRadius);
            normals.push(Math.cos(angle), 0, Math.sin(angle));
            colors.push(...colorTuple);
        }
        const stemTopStartIdx = pos.length / 3;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            pos.push(Math.cos(angle) * stemRadius, stemTopY, Math.sin(angle) * stemRadius);
            normals.push(Math.cos(angle), 0, Math.sin(angle));
            colors.push(...colorTuple);
        }
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const b0 = stemBottomStartIdx + i;
            const b1 = stemBottomStartIdx + next;
            const t0 = stemTopStartIdx + i;
            const t1 = stemTopStartIdx + next;
            indices.push(b0, b1, t1, b0, t1, t0);
        }
        const topCapCenterIdx = pos.length / 3;
        pos.push(0, stemTopY, 0);
        normals.push(0, 1, 0);
        colors.push(...colorTuple);
        for (let i = 0; i < segments; i++) {
            indices.push(topCapCenterIdx, stemTopStartIdx + i, stemTopStartIdx + ((i + 1) % segments));
        }
        const vertex = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createVertexArray(new Uint8Array(Uint16Array.from(indices).buffer), [
            { location: 0, buffer: new Uint8Array(Float32Array.from(pos).buffer), enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 12, vectorlength: 3 },
            { location: 1, buffer: new Uint8Array(Float32Array.from(normals).buffer), enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 12, vectorlength: 3 },
            { location: 6, buffer: Uint8Array.from(colors), enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 4 },
        ]);
        const arrow3DShader = `
      #version 330 core
      layout (location = 0) in vec3 aPos;
      layout (location = 1) in vec3 aNormal;
      layout (location = 6) in vec4 aColor;
      uniform mat4 uViewProjMatrix;
      uniform mat4 uModelMatrix;
      out vec3 FragPos;
      out vec3 vNormal;
      out vec4 vColor;
      void main() {
        vec3 npcPos = vec3(uModelMatrix[3][0], uModelMatrix[3][1], uModelMatrix[3][2]);
        vec4 worldPos = vec4(npcPos + aPos, 1.0);
        gl_Position = uViewProjMatrix * worldPos;
        FragPos = worldPos.xyz;
        vNormal = aNormal;
        vColor = aColor;
      }
    `;
        const fragShader3DLit = `
      #version 330 core
      in vec3 FragPos;
      in vec3 vNormal;
      in vec4 vColor;
      uniform mat4 uSunlightViewMatrix;
      uniform vec3 uSunColour;
      uniform vec3 uAmbientColour;
      out vec4 FragColor;
      void main() {
        vec3 norm = normalize(vNormal);
        vec3 lightDir = normalize(-uSunlightViewMatrix[2].xyz);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 lighting = max(diff * uSunColour + uAmbientColour, vec3(0.3));
        FragColor = vec4(vColor.rgb * lighting, vColor.a);
      }
    `;
        const fragShader3DUnlit = `
      #version 330 core
      in vec3 FragPos;
      in vec3 vNormal;
      in vec4 vColor;
      out vec4 FragColor;
      void main() {
        FragColor = vColor;
      }
    `;
        const uSunlightViewMatrix = progmeta.raw.uniforms.find((q) => q.name === "uSunlightViewMatrix");
        const uSunColour = progmeta.raw.uniforms.find((q) => q.name === "uSunColour");
        const uAmbientColour = progmeta.raw.uniforms.find((q) => q.name === "uAmbientColour");
        const hasLighting = uSunlightViewMatrix && uSunColour && uAmbientColour;
        const uniforms = [
            { name: "uViewProjMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 0, snapshotSize: 64 },
            { name: "uModelMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 64, snapshotSize: 64 },
        ];
        const uniformSources = [
            { name: "uViewProjMatrix", sourceName: uViewProjMatrix.name, type: "program" },
            { name: "uModelMatrix", sourceName: progmeta.uModelMatrix.name, type: "program" },
        ];
        if (hasLighting) {
            uniforms.push({ name: "uSunlightViewMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 128, snapshotSize: 64 }, { name: "uSunColour", length: 1, type: GL_FLOAT_VEC3, snapshotOffset: 192, snapshotSize: 12 }, { name: "uAmbientColour", length: 1, type: GL_FLOAT_VEC3, snapshotOffset: 204, snapshotSize: 12 });
            uniformSources.push({ name: "uSunlightViewMatrix", sourceName: uSunlightViewMatrix.name, type: "program" }, { name: "uSunColour", sourceName: uSunColour.name, type: "program" }, { name: "uAmbientColour", sourceName: uAmbientColour.name, type: "program" });
        }
        const program = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.createProgram(arrow3DShader, hasLighting ? fragShader3DLit : fragShader3DUnlit, [
            { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
            { location: 1, name: "aNormal", type: GL_FLOAT, length: 3 },
            { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4 },
        ], uniforms);
        try {
            const handle = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.beginOverlay({ vertexObjectId: npc.vaoId }, program, vertex, { uniformSources, renderMode: "triangles", trigger: "after" });
            this.overlayHandles.push(handle);
            return handle;
        }
        catch (e) {
            console.error("[NpcOverlay] Failed to create 3D arrow overlay:", e);
            return null;
        }
    }
    async draw3DArrowsAboveAll(filter, options) {
        const npcs = await this.scan(filter);
        const handles = [];
        for (const npc of npcs) {
            const handle = await this.draw3DArrowAboveNpc(npc, options);
            if (handle !== null)
                handles.push(handle);
        }
        return handles;
    }
    async drawArrowsAboveAll(filter, options) {
        const npcs = await this.scan(filter);
        const handles = [];
        for (const npc of npcs) {
            const handle = await this.drawArrowAboveNpc(npc, options);
            if (handle !== null)
                handles.push(handle);
        }
        return handles;
    }
    async highlightAll(filter, options) {
        const npcs = await this.scan(filter);
        const handles = [];
        for (const npc of npcs) {
            const handle = await this.highlightNpc(npc, options);
            if (handle !== null)
                handles.push(handle);
        }
        return handles;
    }
    async highlightByVertexCount(vertexCount, options) {
        const filter = { excludeFloor: true };
        if (Array.isArray(vertexCount)) {
            filter.vertexCounts = vertexCount;
        }
        else {
            filter.vertexCount = vertexCount;
        }
        return this.highlightAll(filter, options);
    }
    /**
     * Find an NPC by hash - accumulates meshes across frames then computes hash.
     * Required for NPCs like Death with 35 meshes where combined hash needs all parts.
     */
    async findByHashStreaming(targetHashNum, maxFrames = 15) {
        const { extractBufferHashes, computeCombinedHash, toHexHash } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ../types/npcBufferHash */ "./types/npcBufferHash.ts"));
        console.log(`[NpcOverlay] Hash search for ${toHexHash(targetHashNum)}...`);
        // Accumulate meshes at each position across frames (key: posKey, value: vaoId -> render)
        const positionMeshes = new Map();
        let framesWithNoNew = 0;
        for (let frame = 0; frame < maxFrames; frame++) {
            if (frame > 0)
                await new Promise(r => setTimeout(r, 60));
            const renders = await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features: ["uniforms", "vertexarray"] });
            let newMeshes = 0;
            for (const render of renders) {
                const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
                if (progmeta.isUi || progmeta.isFloor || !progmeta.uModelMatrix)
                    continue;
                if (!progmeta.isMainMesh && !progmeta.isTinted && !progmeta.uBones)
                    continue;
                const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
                const posKey = `${Math.round(rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize * 10)},${Math.round(rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize * 10)}`;
                if (!positionMeshes.has(posKey))
                    positionMeshes.set(posKey, new Map());
                const meshMap = positionMeshes.get(posKey);
                if (!meshMap.has(render.vertexObjectId)) {
                    meshMap.set(render.vertexObjectId, render);
                    newMeshes++;
                }
            }
            if (newMeshes === 0) {
                if (++framesWithNoNew >= 3)
                    break;
            }
            else {
                framesWithNoNew = 0;
                console.log(`[NpcOverlay] Frame ${frame + 1}: +${newMeshes} meshes`);
            }
        }
        // Compute hashes for all positions with accumulated meshes
        console.log(`[NpcOverlay] Computing hashes for ${positionMeshes.size} positions...`);
        for (const [posKey, meshMap] of positionMeshes) {
            const groupRenders = Array.from(meshMap.values());
            const combined = computeCombinedHash(groupRenders);
            if (combined.num === targetHashNum) {
                console.log(`[NpcOverlay] MATCH! ${posKey}, ${groupRenders.length} meshes`);
                return this.buildGroupFromRenders(groupRenders);
            }
            for (const render of groupRenders) {
                if (extractBufferHashes(render).posBufferHashNum === targetHashNum) {
                    console.log(`[NpcOverlay] MATCH! Individual at ${posKey}`);
                    return this.buildGroupFromRenders(groupRenders);
                }
            }
        }
        // Debug: show what we found
        const samples = Array.from(positionMeshes.entries()).slice(0, 5)
            .map(([k, m]) => `${k}(${m.size}m):${computeCombinedHash(Array.from(m.values())).hex}`);
        console.log(`[NpcOverlay] Sample hashes:`, samples);
        return null;
    }
    /**
     * Build an NpcMeshGroup from render invocations (helper for streaming search)
     */
    buildGroupFromRenders(renders) {
        const meshes = [];
        let mainMesh = null;
        for (const render of renders) {
            if (!render.vertexArray)
                continue;
            const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            const vertexCount = render.vertexArray.indexBuffer?.length || 0;
            const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
            const modelMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray(rotmatrix);
            const mesh = {
                vaoId: render.vertexObjectId,
                programId: render.program.programId,
                vertexCount,
                position: {
                    x: rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize,
                    y: rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize,
                    z: rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize,
                },
                rotation: -Math.atan2(rotmatrix[8], rotmatrix[0]),
                modelMatrix,
                hasBones: !!progmeta.uBones,
                render,
                progmeta,
            };
            meshes.push(mesh);
            // Track main mesh (with bones, or largest)
            if (progmeta.uBones && progmeta.isMainMesh) {
                if (!mainMesh || vertexCount > mainMesh.vertexCount) {
                    mainMesh = mesh;
                }
            }
        }
        // Deduplicate meshes by position buffer hash
        const seenMeshHashes = new Set();
        const uniqueMeshes = [];
        const uniqueRenders = [];
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            const hashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_4__.extractBufferHashes)(mesh.render);
            if (hashes.posBufferHashNum === 0 || !seenMeshHashes.has(hashes.posBufferHashNum)) {
                if (hashes.posBufferHashNum !== 0) {
                    seenMeshHashes.add(hashes.posBufferHashNum);
                }
                uniqueMeshes.push(mesh);
                uniqueRenders.push(renders[i]);
            }
        }
        // Fallback to largest mesh if no bones found
        if (!mainMesh || !uniqueMeshes.includes(mainMesh)) {
            mainMesh = uniqueMeshes.find(m => m.hasBones && m.progmeta.isMainMesh) ||
                uniqueMeshes.reduce((a, b) => a.vertexCount > b.vertexCount ? a : b);
        }
        const totalVertexCount = uniqueMeshes.reduce((sum, m) => sum + m.vertexCount, 0);
        const group = {
            mainMesh,
            allMeshes: uniqueMeshes,
            renders: uniqueRenders,
            totalVertexCount,
            meshCount: uniqueMeshes.length,
            position: mainMesh.position,
            modelMatrix: mainMesh.modelMatrix,
        };
        return { mesh: mainMesh, group };
    }
    /**
     * Scan for an NPC with a specific buffer hash and highlight it
     * Uses streaming search to avoid memory exhaustion on large NPCs like Death (2.5M vertices)
     * @param bufferHash The position buffer hash as hex string (e.g., "0x1A2B3C4D")
     * @param options Highlight options
     * @returns The overlay handle if found and highlighted, null otherwise
     */
    async highlightByBufferHash(bufferHash, options) {
        const { fromHexHash, computeCombinedHash } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ../types/npcBufferHash */ "./types/npcBufferHash.ts"));
        console.log("[NpcOverlay] Scanning for NPC with buffer hash:", bufferHash);
        // Parse target hash to number for fast comparison
        const targetHashNum = fromHexHash(bufferHash);
        // Use single-frame scan (same as scan all NPCs)
        const groups = await this.scanGrouped({
            excludeFloor: true,
            // maxMeshCount defaults to 15 - groups with >15 meshes filtered unless they have bones
        });
        console.log(`[NpcOverlay] Scanned ${groups.length} groups, searching for hash ${bufferHash}...`);
        // Search for matching combined hash
        for (const group of groups) {
            const combined = computeCombinedHash(group.renders);
            if (combined.num === targetHashNum) {
                console.log(`[NpcOverlay] Found NPC! Meshes: ${group.meshCount}, Vertices: ${group.totalVertexCount}`);
                const handle = await this.highlightNpc(group.mainMesh, options);
                return { handle, npc: group.mainMesh, group };
            }
        }
        console.log("[NpcOverlay] No NPC found with buffer hash:", bufferHash);
        return { handle: null, npc: null, group: null };
    }
    /**
     * Scan for an NPC with a specific buffer hash and draw an arrow above it
     * Uses single-frame scan (same as scan all NPCs)
     * @param bufferHash The position buffer hash as hex string (e.g., "0x1A2B3C4D")
     */
    async arrowByBufferHash(bufferHash, options) {
        const { fromHexHash, computeCombinedHash } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ../types/npcBufferHash */ "./types/npcBufferHash.ts"));
        console.log("[NpcOverlay] Scanning for NPC with buffer hash (arrow):", bufferHash);
        // Parse target hash to number for fast comparison
        const targetHashNum = fromHexHash(bufferHash);
        // Use single-frame scan (same as scan all NPCs)
        const groups = await this.scanGrouped({
            excludeFloor: true,
            // maxMeshCount defaults to 15 - groups with >15 meshes filtered unless they have bones
        });
        console.log(`[NpcOverlay] Scanned ${groups.length} groups, searching for hash ${bufferHash}...`);
        // Search for matching combined hash
        for (const group of groups) {
            const combined = computeCombinedHash(group.renders);
            if (combined.num === targetHashNum) {
                console.log(`[NpcOverlay] Found NPC! Meshes: ${group.meshCount}, Vertices: ${group.totalVertexCount}`);
                const handle = await this.draw3DArrowAboveNpc(group.mainMesh, options);
                return { handle, npc: group.mainMesh, group };
            }
        }
        console.log("[NpcOverlay] No NPC found with buffer hash:", bufferHash);
        return { handle: null, npc: null, group: null };
    }
    /**
     * Find the player's position using the known player buffer hash.
     * This helps identify where the player is on the map for accurate NPC positioning.
     *
     * @param playerHash Optional custom player hash. If not provided, uses PLAYER_BUFFER_HASH constant.
     * @returns Player position and mesh group if found, null otherwise
     */
    async findPlayer(playerHash) {
        const { fromHexHash, computeCombinedHash } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ../types/npcBufferHash */ "./types/npcBufferHash.ts"));
        const hashToFind = playerHash ?? PLAYER_BUFFER_HASH;
        // Don't search if using placeholder hash
        if (hashToFind === "0x00000000") {
            console.log("[NpcOverlay] Player hash not configured. Set PLAYER_BUFFER_HASH or pass a hash to findPlayer()");
            return null;
        }
        console.log("[NpcOverlay] Searching for player with hash:", hashToFind);
        const targetHashNum = fromHexHash(hashToFind);
        // Use single-frame scan
        const groups = await this.scanGrouped({
            excludeFloor: true,
        });
        for (const group of groups) {
            const combined = computeCombinedHash(group.renders);
            if (combined.num === targetHashNum) {
                console.log(`[NpcOverlay] Found player at position: (${group.position.x.toFixed(2)}, ${group.position.y.toFixed(2)}, ${group.position.z.toFixed(2)})`);
                return {
                    position: group.position,
                    group,
                    combinedHash: combined.hex,
                };
            }
        }
        console.log("[NpcOverlay] Player not found with hash:", hashToFind);
        return null;
    }
    /**
     * Scan all NPCs and return them with positions relative to the player.
     * Useful for mapping NPC locations when the player's position is known.
     *
     * @param playerHash Optional custom player hash
     * @returns Object with player position, all NPCs, and relative positions
     */
    async scanWithPlayerReference(playerHash) {
        const { computeCombinedHash, fromHexHash } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! ../types/npcBufferHash */ "./types/npcBufferHash.ts"));
        const hashToFind = playerHash ?? PLAYER_BUFFER_HASH;
        const targetHashNum = hashToFind !== "0x00000000" ? fromHexHash(hashToFind) : 0;
        console.log("[NpcOverlay] Scanning with player reference...");
        const groups = await this.scanGrouped({
            excludeFloor: true,
        });
        let playerData = null;
        const npcs = [];
        // First pass: find player and collect all NPCs
        for (const group of groups) {
            const combined = computeCombinedHash(group.renders);
            // Check if this is the player
            if (targetHashNum !== 0 && combined.num === targetHashNum) {
                playerData = {
                    position: group.position,
                    group,
                };
                console.log(`[NpcOverlay] Found player at: (${group.position.x.toFixed(2)}, ${group.position.y.toFixed(2)}, ${group.position.z.toFixed(2)})`);
            }
            npcs.push({
                group,
                combinedHash: combined.hex,
                relativePosition: null, // Will be calculated after finding player
            });
        }
        // Second pass: calculate relative positions if player was found
        if (playerData) {
            for (const npc of npcs) {
                npc.relativePosition = {
                    x: npc.group.position.x - playerData.position.x,
                    y: npc.group.position.y - playerData.position.y,
                    z: npc.group.position.z - playerData.position.z,
                };
            }
        }
        console.log(`[NpcOverlay] Scanned ${npcs.length} entities, player ${playerData ? 'found' : 'not found'}`);
        return { player: playerData, npcs };
    }
    async getVertexCountStats() {
        const npcs = await this.scan({ excludeFloor: true });
        const counts = new Map();
        for (const npc of npcs) {
            counts.set(npc.vertexCount, (counts.get(npc.vertexCount) || 0) + 1);
        }
        return counts;
    }
    captureTexture(npc, textureIndex = 0) {
        if (!npc.textures || npc.textures.length === 0)
            return null;
        if (textureIndex >= npc.textures.length)
            return null;
        const tex = npc.textures[textureIndex];
        if (!tex.snapshot.canCapture())
            return null;
        try {
            return tex.snapshot.capture(0, 0, tex.width, tex.height);
        }
        catch {
            return null;
        }
    }
    captureAllTextures(npc) {
        const results = [];
        if (!npc.textures || npc.textures.length === 0)
            return results;
        for (let i = 0; i < npc.textures.length; i++) {
            const tex = npc.textures[i];
            if (tex.snapshot.canCapture()) {
                try {
                    results.push({
                        index: i,
                        samplerId: tex.samplerId,
                        texId: tex.texId,
                        width: tex.width,
                        height: tex.height,
                        imageData: tex.snapshot.capture(0, 0, tex.width, tex.height),
                    });
                }
                catch {
                    // skip
                }
            }
        }
        return results;
    }
    async scanWithTextures(filter) {
        return this.scan({ ...filter, includeTextures: true });
    }
    async stop(handle) {
        try {
            handle.stop();
            const idx = this.overlayHandles.indexOf(handle);
            if (idx !== -1)
                this.overlayHandles.splice(idx, 1);
        }
        catch {
            // ignore
        }
    }
    async stopAll() {
        console.log(`[NpcOverlay] stopAll - stopping ${this.overlayHandles.length} overlays`);
        for (const handle of this.overlayHandles) {
            try {
                handle.stop();
            }
            catch (e) {
                console.warn(`[NpcOverlay] Failed to stop overlay:`, e);
            }
        }
        this.overlayHandles = [];
        // Clean up GL resources to prevent memory exhaustion
        try {
            await _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.resetOpenGlState();
        }
        catch {
            // Ignore cleanup errors
        }
        console.log("[NpcOverlay] All overlays stopped and memory cleaned");
    }
    getActiveCount() {
        return this.overlayHandles.length;
    }
    /**
     * Get shared memory status to monitor for exhaustion.
     * Disconnect happens when 512MB is nearly full.
     */
    getMemoryStatus() {
        const memState = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.memoryState();
        if (!memState)
            return null;
        const pctUsed = (memState.used / memState.size) * 100;
        return {
            used: memState.used,
            size: memState.size,
            free: memState.free,
            pctUsed,
            warning: pctUsed > 80,
        };
    }
    /**
     * Log detailed memory status for debugging disconnects.
     */
    logMemoryStatus() {
        const mem = this.getMemoryStatus();
        if (!mem) {
            console.log("[NpcOverlay] Memory: Not connected");
            return;
        }
        const usedMB = (mem.used / (1024 * 1024)).toFixed(1);
        const totalMB = (mem.size / (1024 * 1024)).toFixed(1);
        const freeMB = (mem.free / (1024 * 1024)).toFixed(1);
        const icon = mem.warning ? "⚠️" : "✓";
        console.log(`[NpcOverlay] Memory: ${icon} ${usedMB}/${totalMB}MB used (${mem.pctUsed.toFixed(1)}%), ${freeMB}MB free`);
    }
    /**
     * Debug function: Dump ALL meshes without filtering to find "hidden" NPCs like Death.
     * This captures everything with a model matrix and logs detailed info about each mesh.
     */
    async debugDumpAllMeshes() {
        console.log("\n========== DEBUG: DUMPING ALL MESHES (NO FILTERING) ==========\n");
        const renders = await withTimeout(_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features: ["uniforms", "vertexarray"] }), 10000, "debugDumpAllMeshes");
        console.log(`[DEBUG] Total render calls: ${renders?.length ?? 0}`);
        const meshes = [];
        for (const render of renders) {
            if (!render.vertexArray)
                continue;
            const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            // Skip only UI - we want to see EVERYTHING else
            if (progmeta.isUi)
                continue;
            if (!progmeta.uModelMatrix)
                continue;
            const vertexCount = render.vertexArray.indexBuffer?.length || 0;
            if (vertexCount === 0)
                continue;
            const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
            const x = Math.round(rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize * 10) / 10;
            const y = Math.round(rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize * 10) / 10;
            const z = Math.round(rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize * 10) / 10;
            meshes.push({
                vaoId: render.vertexObjectId,
                verts: vertexCount,
                x, y, z,
                isMainMesh: progmeta.isMainMesh,
                isTinted: progmeta.isTinted,
                hasBones: !!progmeta.uBones,
                isLighted: progmeta.isLighted,
                isFloor: progmeta.isFloor,
                isUi: progmeta.isUi,
                isParticles: progmeta.isParticles,
                isShadow: progmeta.isShadowRender,
                fragDefines: progmeta.fragdefines.slice(0, 5),
            });
        }
        // Sort by vertex count descending
        meshes.sort((a, b) => b.verts - a.verts);
        // Log the top 30 meshes by vertex count
        console.log(`\n[DEBUG] Top 30 meshes by vertex count:`);
        for (let i = 0; i < Math.min(30, meshes.length); i++) {
            const m = meshes[i];
            const flags = [
                m.isMainMesh ? "MAIN" : "",
                m.isTinted ? "TINT" : "",
                m.hasBones ? "BONE" : "",
                m.isLighted ? "LIT" : "",
                m.isFloor ? "FLOOR" : "",
                m.isParticles ? "PART" : "",
                m.isShadow ? "SHAD" : "",
            ].filter(f => f).join(",");
            console.log(`  ${i + 1}. verts:${m.verts} pos:(${m.x},${m.y},${m.z}) flags:[${flags}] defines:[${m.fragDefines.join(",")}]`);
        }
        // Group by approximate position to find entities
        const posGroups = new Map();
        for (const m of meshes) {
            const key = `${Math.round(m.x)},${Math.round(m.z)}`;
            if (!posGroups.has(key))
                posGroups.set(key, []);
            posGroups.get(key).push(m);
        }
        console.log(`\n[DEBUG] Mesh groups by position (${posGroups.size} unique positions):`);
        const sortedGroups = Array.from(posGroups.entries())
            .map(([pos, meshes]) => ({ pos, meshes, totalVerts: meshes.reduce((sum, m) => sum + m.verts, 0) }))
            .sort((a, b) => b.totalVerts - a.totalVerts);
        for (let i = 0; i < Math.min(15, sortedGroups.length); i++) {
            const g = sortedGroups[i];
            const hasMain = g.meshes.some(m => m.isMainMesh);
            const hasBones = g.meshes.some(m => m.hasBones);
            const allFloor = g.meshes.every(m => m.isFloor);
            console.log(`  ${g.pos}: ${g.meshes.length} meshes, ${g.totalVerts} total verts, MAIN:${hasMain} BONES:${hasBones} ${allFloor ? "(all floor)" : ""}`);
        }
        console.log("\n========== END DEBUG DUMP ==========\n");
    }
    /**
     * Scan ALL meshes without filtering - returns NpcMeshGroups that can be viewed in catalog.
     * Use this to find NPCs like Death that get filtered out by normal scans.
     * Note: Still skips floor to prevent memory exhaustion, but accepts everything else.
     */
    async scanAllUnfiltered() {
        console.log("\n========== UNFILTERED SCAN: Capturing ALL meshes (except floor) ==========\n");
        // Log memory before scan
        this.logMemoryStatus();
        // NOTE: Removed "textures" - TextureSnapshots are massive memory hogs (can grow to 500MB+)
        const renders = await withTimeout(_patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.recordRenderCalls({ maxframes: 1, features: ["uniforms", "vertexarray"] }), 10000, "scanAllUnfiltered");
        // Check memory after capturing renders
        const memState = _patchrs_napi__WEBPACK_IMPORTED_MODULE_0__.native.debug.memoryState();
        if (memState) {
            const pctUsed = memState.used / memState.size;
            const usedMB = (memState.used / (1024 * 1024)).toFixed(1);
            if (pctUsed > 0.8) {
                console.warn(`[UNFILTERED] ⚠️ Memory after capture: ${usedMB}MB (${(pctUsed * 100).toFixed(1)}%)`);
            }
        }
        console.log(`[UNFILTERED] Total render calls: ${renders.length}`);
        // Group by position (same logic as scanGroupedFromRenders but minimal filtering)
        const tolerance = 0.15;
        const groups = new Map();
        let skippedFloor = 0;
        let skippedUi = 0;
        for (const render of renders) {
            if (!render.vertexArray)
                continue;
            const progmeta = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getProgramMeta)(render.program);
            // Skip UI
            if (progmeta.isUi) {
                skippedUi++;
                continue;
            }
            if (!progmeta.uModelMatrix)
                continue;
            // Skip floor to prevent memory exhaustion (floor tiles are massive)
            if (progmeta.isFloor) {
                skippedFloor++;
                continue;
            }
            const vertexCount = render.vertexArray.indexBuffer?.length || 0;
            if (vertexCount === 0)
                continue;
            const rotmatrix = (0,_renderprogram__WEBPACK_IMPORTED_MODULE_1__.getUniformValue)(render.uniformState, progmeta.uModelMatrix)[0];
            const x = rotmatrix[12] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 1.5;
            const y = rotmatrix[13] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize;
            const z = rotmatrix[14] / _constants__WEBPACK_IMPORTED_MODULE_2__.tilesize - 0.5;
            const yRotation = -Math.atan2(rotmatrix[8], rotmatrix[0]);
            const modelMatrix = new three__WEBPACK_IMPORTED_MODULE_3__.Matrix4().fromArray(rotmatrix);
            // Round position for grouping
            const roundedX = Math.round(x / tolerance) * tolerance;
            const roundedZ = Math.round(z / tolerance) * tolerance;
            const groupKey = `${roundedX.toFixed(2)},${roundedZ.toFixed(2)}`;
            const mesh = {
                render,
                vaoId: render.vertexObjectId,
                programId: render.program.programId,
                vertexCount,
                position: { x, y, z },
                rotation: yRotation,
                modelMatrix,
                hasBones: !!progmeta.uBones,
                progmeta,
            };
            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    meshes: [],
                    renders: [],
                    matrix: modelMatrix,
                    centroid: { x, y, z },
                });
            }
            const group = groups.get(groupKey);
            group.meshes.push(mesh);
            group.renders.push(render);
        }
        // Convert to NpcMeshGroup array
        const result = [];
        for (const [key, group] of groups) {
            // Deduplicate meshes within this group by position buffer hash
            const seenMeshHashes = new Set();
            const uniqueMeshes = [];
            const uniqueRenders = [];
            for (let i = 0; i < group.meshes.length; i++) {
                const mesh = group.meshes[i];
                const hashes = (0,_types_npcBufferHash__WEBPACK_IMPORTED_MODULE_4__.extractBufferHashes)(mesh.render);
                if (hashes.posBufferHashNum === 0 || !seenMeshHashes.has(hashes.posBufferHashNum)) {
                    if (hashes.posBufferHashNum !== 0) {
                        seenMeshHashes.add(hashes.posBufferHashNum);
                    }
                    uniqueMeshes.push(mesh);
                    uniqueRenders.push(group.renders[i]);
                }
            }
            // Sort meshes by vertex count descending
            uniqueMeshes.sort((a, b) => b.vertexCount - a.vertexCount);
            // Main mesh is the largest one
            const mainMesh = uniqueMeshes[0];
            const totalVertexCount = uniqueMeshes.reduce((sum, m) => sum + m.vertexCount, 0);
            result.push({
                mainMesh,
                allMeshes: uniqueMeshes,
                renders: uniqueRenders,
                totalVertexCount,
                meshCount: uniqueMeshes.length,
                position: group.centroid,
                modelMatrix: group.matrix,
            });
        }
        // Sort by total vertex count descending
        result.sort((a, b) => b.totalVertexCount - a.totalVertexCount);
        // Limit to top 50 groups to prevent memory exhaustion when browsing
        const maxGroups = 50;
        const limitedResult = result.slice(0, maxGroups);
        console.log(`[UNFILTERED] Skipped: ${skippedFloor} floor, ${skippedUi} UI`);
        console.log(`[UNFILTERED] Created ${result.length} mesh groups (returning top ${limitedResult.length})`);
        for (let i = 0; i < Math.min(15, limitedResult.length); i++) {
            const g = limitedResult[i];
            const hasMain = g.allMeshes.some(m => m.progmeta.isMainMesh);
            const hasBones = g.allMeshes.some(m => m.hasBones);
            const isTinted = g.allMeshes.some(m => m.progmeta.isTinted);
            const isLighted = g.allMeshes.some(m => m.progmeta.isLighted);
            console.log(`  ${i + 1}. pos:(${g.position.x.toFixed(1)},${g.position.z.toFixed(1)}) ${g.meshCount} meshes, ${g.totalVertexCount} verts, MAIN:${hasMain} BONES:${hasBones} TINT:${isTinted} LIT:${isLighted}`);
        }
        console.log("\n========== END UNFILTERED SCAN ==========\n");
        return limitedResult;
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

/***/ "./gl/renderprogram.ts"
/*!*****************************!*\
  !*** ./gl/renderprogram.ts ***!
  \*****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateMeshMeta: () => (/* binding */ generateMeshMeta),
/* harmony export */   getProgramMeta: () => (/* binding */ getProgramMeta),
/* harmony export */   getRenderFunc: () => (/* binding */ getRenderFunc),
/* harmony export */   getUniformValue: () => (/* binding */ getUniformValue),
/* harmony export */   renderToSprite: () => (/* binding */ renderToSprite)
/* harmony export */ });
/* harmony import */ var _avautils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./avautils */ "./gl/avautils.ts");
/* harmony import */ var _crc32__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./crc32 */ "./gl/crc32.ts");
/**
 * Render program utilities for parsing shader metadata
 * Based on RS3QuestBuddyGL implementation
 */


const cachedPrograms = new WeakMap();
const vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];
function getProgramMeta(prog) {
    if (cachedPrograms.has(prog)) {
        return cachedPrograms.get(prog);
    }
    const r = fetchProgramMeta(prog);
    cachedPrograms.set(prog, r);
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
    const aColor = prog.inputs.find(q => q.name == "aVertexColour");
    const aTexUV = prog.inputs.find(q => q.name == "aTextureUV");
    const aNormal = prog.inputs.find(q => q.name == "aVertexNormal_BatchFlags");
    const aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
    const aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");
    const isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");
    return {
        uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
        uBones: uBoneTransforms,
        uTint: uTint,
        uViewMatrix: uViewMatrix,
        aPos: aPos,
        aColor: aColor,
        aTexUV: aTexUV,
        aNormal: aNormal,
        isFloor: !!aMaterialSettingsSlotXY3,
        isAnimated: !!uBoneTransforms,
        isUi: !!aVertexPosition2D,
        isParticles: !!aParticleSize,
        isLighted,
        isTinted,
        isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,
        isShadowRender: fragdefines.includes("SHADOW_RENDER") || vertdefines.includes("SHADOW_RENDER"),
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
function getRenderFunc(render) {
    return {
        render,
        program: render.program,
        vertexArray: render.vertexArray,
        uniformState: render.uniformState,
    };
}
// Helper: Read triangle indices from index buffer
function readIndices(indexBuffer, indexType) {
    const indices = [];
    const view = new DataView(indexBuffer.buffer, indexBuffer.byteOffset, indexBuffer.byteLength);
    if (indexType === 0x1403) { // GL_UNSIGNED_SHORT
        for (let i = 0; i + 1 < indexBuffer.length; i += 2) {
            indices.push(view.getUint16(i, true));
        }
    }
    else if (indexType === 0x1405) { // GL_UNSIGNED_INT
        for (let i = 0; i + 3 < indexBuffer.length; i += 4) {
            indices.push(view.getUint32(i, true));
        }
    }
    else { // GL_UNSIGNED_BYTE
        for (let i = 0; i < indexBuffer.length; i++) {
            indices.push(indexBuffer[i]);
        }
    }
    return indices;
}
function getAttributeView(attr) {
    const type = _avautils__WEBPACK_IMPORTED_MODULE_0__.vartypes[attr.scalartype];
    if (!type || !type.constr) {
        // Unknown or unsupported scalar type (e.g. half-float) - return empty view
        const empty = new Float32Array(0);
        return [empty, 0, 1];
    }
    const stride = Math.max(1, Math.floor(attr.stride / type.size));
    const availableBytes = Math.max(0, attr.buffer.byteLength - attr.offset);
    const availableElements = Math.floor(availableBytes / type.size);
    const len = Math.floor(availableElements / stride);
    if (len <= 0) {
        const empty = new Float32Array(0);
        return [empty, 0, stride];
    }
    const view = new type.constr(attr.buffer.buffer, attr.buffer.byteOffset + attr.offset, len * stride);
    return [view, len, stride];
}
function generateMeshMeta(render, progmeta) {
    let posinput = render.vertexArray.attributes[progmeta.aPos.location];
    let [view, len, stride] = getAttributeView(posinput);
    let hash = new _crc32__WEBPACK_IMPORTED_MODULE_1__.CrcBuilder();
    let sumx = 0, sumy = 0, sumz = 0;
    for (let i = 0; i < len; i++) {
        sumx += view[i * stride + 0];
        sumy += view[i * stride + 1];
        sumz += view[i * stride + 2];
        hash.addUint16(view[i * stride + 0]);
        hash.addUint16(view[i * stride + 1]);
        hash.addUint16(view[i * stride + 2]);
    }
    let boneids = [];
    // Note: aSkinbones and aBones not available in our ProgramMeta, skip bone extraction
    return {
        vertexcount: len,
        vertexcenter: [sumx / len, sumy / len, sumz / len],
        posbufferhash: hash.get(),
        usedbones: boneids
    };
}
// ---- WebGL2 sprite renderer (hardware-accelerated, matching RS3QuestBuddyBeta) ----
const SPRITE_VERT = `#version 300 es
in vec3 aPos;
in vec3 aCol;
in vec2 aUV;
in vec3 aNorm;
uniform mat4 uTransform;
out vec3 vCol;
out vec2 vUV;
out vec3 vNorm;
void main() {
    gl_Position = uTransform * vec4(aPos, 1.0);
    vCol = aCol;
    vUV = aUV;
    vNorm = aNorm;
}`;
const SPRITE_FRAG = `#version 300 es
precision highp float;
in vec3 vCol;
in vec2 vUV;
in vec3 vNorm;
uniform sampler2D uDiffuse;
uniform int uHasTexture;
out vec4 fragColor;
void main() {
    vec3 color = vCol;
    if (uHasTexture == 1) {
        vec4 texColor = texture(uDiffuse, vUV);
        if (texColor.a < 0.01) discard;
        color = texColor.rgb * vCol;
    }
    // Basic directional lighting
    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
    float ambient = 0.45;
    float diffuse = max(dot(normalize(vNorm), lightDir), 0.0) * 0.55;
    float light = ambient + diffuse;
    if (length(vNorm) < 0.01) light = 1.0; // No normals = full bright
    fragColor = vec4(color * light, 1.0);
}`;
let cachedSpriteCtx = null;
function getSpriteGl() {
    if (cachedSpriteCtx)
        return cachedSpriteCtx;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl)
        throw new Error("WebGL2 not available");
    // Compile shaders
    const vert = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert, SPRITE_VERT);
    gl.compileShader(vert);
    if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(vert));
    const frag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag, SPRITE_FRAG);
    gl.compileShader(frag);
    if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(frag));
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const aPosLoc = gl.getAttribLocation(prog, "aPos");
    const aColLoc = gl.getAttribLocation(prog, "aCol");
    const aUVLoc = gl.getAttribLocation(prog, "aUV");
    const aNormLoc = gl.getAttribLocation(prog, "aNorm");
    const uTransform = gl.getUniformLocation(prog, "uTransform");
    const uDiffuse = gl.getUniformLocation(prog, "uDiffuse");
    const uHasTexture = gl.getUniformLocation(prog, "uHasTexture");
    gl.enableVertexAttribArray(aPosLoc);
    gl.enableVertexAttribArray(aColLoc);
    gl.enableVertexAttribArray(aUVLoc);
    gl.enableVertexAttribArray(aNormLoc);
    cachedSpriteCtx = { canvas, gl, program: prog, uTransform, uDiffuse, uHasTexture, aPosLoc, aColLoc, aUVLoc, aNormLoc };
    return cachedSpriteCtx;
}
async function renderToSprite(renderFuncs, scale, angle, options) {
    const size = Math.max(64, Math.round(512 * scale));
    const floatsPerVert = 11; // 3 pos + 3 col + 2 uv + 3 norm
    try {
        // Collect mesh data from all render funcs
        let meshes = [];
        let max = [-Infinity, -Infinity, -Infinity];
        let min = [Infinity, Infinity, Infinity];
        for (const rf of renderFuncs) {
            const progmeta = getProgramMeta(rf.program);
            const posLocation = progmeta.aPos?.location ?? 0;
            const posAttr = rf.vertexArray.attributes[posLocation];
            if (!posAttr || !posAttr.enabled || posAttr.vectorlength < 2)
                continue;
            const [posView, posLen, posStride] = getAttributeView(posAttr);
            // Read vertex colors
            const colorAttr = progmeta.aColor
                ? rf.vertexArray.attributes[progmeta.aColor.location]
                : null;
            let colorView = null;
            let colorLen = 0;
            let colorStride = 0;
            if (colorAttr && colorAttr.enabled) {
                const cv = getAttributeView(colorAttr);
                colorView = cv[0];
                colorLen = cv[1];
                colorStride = cv[2];
            }
            const colorIsFloat = colorAttr ? (colorAttr.scalartype === 0x1406) : false; // GL_FLOAT
            // Read texture UVs
            const uvAttr = progmeta.aTexUV
                ? rf.vertexArray.attributes[progmeta.aTexUV.location]
                : null;
            let uvView = null;
            let uvLen = 0;
            let uvStride = 0;
            if (uvAttr && uvAttr.enabled) {
                const uv = getAttributeView(uvAttr);
                uvView = uv[0];
                uvLen = uv[1];
                uvStride = uv[2];
            }
            // Read normals
            const normAttr = progmeta.aNormal
                ? rf.vertexArray.attributes[progmeta.aNormal.location]
                : null;
            let normView = null;
            let normLen = 0;
            let normStride = 0;
            if (normAttr && normAttr.enabled) {
                const nv = getAttributeView(normAttr);
                normView = nv[0];
                normLen = nv[1];
                normStride = nv[2];
            }
            const normIsFloat = normAttr ? (normAttr.scalartype === 0x1406) : false;
            // Build interleaved buffer: [x, y, z, r, g, b, u, v, nx, ny, nz] per vertex
            const buf = new Float32Array(floatsPerVert * posLen);
            for (let i = 0; i < posLen; i++) {
                const base = i * floatsPerVert;
                const px = posView[i * posStride + 0] || 0;
                const py = posView[i * posStride + 1] || 0;
                const pz = posAttr.vectorlength >= 3 ? (posView[i * posStride + 2] || 0) : 0;
                buf[base + 0] = px;
                buf[base + 1] = py;
                buf[base + 2] = pz;
                if (colorView && i < colorLen) {
                    const cr = colorView[i * colorStride + 0] || 0;
                    const cg = colorView[i * colorStride + 1] || 0;
                    const cb = colorView[i * colorStride + 2] || 0;
                    const colorScale = colorIsFloat ? 1 : 1 / 255;
                    buf[base + 3] = cr * colorScale;
                    buf[base + 4] = cg * colorScale;
                    buf[base + 5] = cb * colorScale;
                }
                else {
                    buf[base + 3] = 0.7;
                    buf[base + 4] = 0.7;
                    buf[base + 5] = 0.7;
                }
                // UVs
                if (uvView && i < uvLen) {
                    buf[base + 6] = uvView[i * uvStride + 0] || 0;
                    buf[base + 7] = uvView[i * uvStride + 1] || 0;
                }
                else {
                    buf[base + 6] = 0;
                    buf[base + 7] = 0;
                }
                // Normals
                if (normView && i < normLen) {
                    const nx = normView[i * normStride + 0] || 0;
                    const ny = normView[i * normStride + 1] || 0;
                    const nz = normStride >= 3 ? (normView[i * normStride + 2] || 0) : 0;
                    const normScale = normIsFloat ? 1 : 1 / 128; // int8 normals: -128 to 127
                    buf[base + 8] = nx * normScale;
                    buf[base + 9] = ny * normScale;
                    buf[base + 10] = nz * normScale;
                }
                else {
                    buf[base + 8] = 0;
                    buf[base + 9] = 0;
                    buf[base + 10] = 0;
                }
                max[0] = Math.max(max[0], px);
                max[1] = Math.max(max[1], py);
                max[2] = Math.max(max[2], pz);
                min[0] = Math.min(min[0], px);
                min[1] = Math.min(min[1], py);
                min[2] = Math.min(min[2], pz);
            }
            // Read indices (or generate sequential for non-indexed draws)
            let indices;
            if (rf.vertexArray.indexBuffer.length > 0) {
                const rawIndices = readIndices(rf.vertexArray.indexBuffer, rf.render.indexType);
                indices = new Uint32Array(rawIndices);
            }
            else {
                // Non-indexed: generate sequential indices
                indices = new Uint32Array(posLen);
                for (let i = 0; i < posLen; i++)
                    indices[i] = i;
            }
            // Capture diffuse texture if available (skip when opted out for performance)
            let texData = null;
            if (!options?.skipTextures) {
                const samplerKeys = Object.keys(rf.render.samplers).map(Number);
                if (samplerKeys.length > 0 && uvView) {
                    try {
                        const sampler = rf.render.samplers[samplerKeys[0]];
                        if (sampler && sampler.canCapture()) {
                            texData = sampler.capture(0, 0, sampler.width, sampler.height);
                        }
                    }
                    catch (e) {
                        // Texture capture failed, render without
                    }
                }
            }
            meshes.push({ buf, indices, texData });
        }
        if (meshes.length === 0)
            return null;
        // Compute bounding box dimensions
        const xsize = Math.max(1, max[0] - min[0]);
        const ysize = Math.max(1, max[1] - min[1]);
        const zsize = Math.max(1, max[2] - min[2]);
        // Center of bounding box
        const cx = (min[0] + max[0]) / 2;
        const cy = (min[1] + max[1]) / 2;
        const cz = (min[2] + max[2]) / 2;
        const padding = 1.1; // 10% margin
        const width = size;
        const height = size;
        let viewMatrix;
        if (angle === "front") {
            // Front view: X->screenX, Y->screenY (flipped), Z->depth
            const scale = 2.0 / (Math.max(xsize, ysize) * padding);
            const depthScale = 1.0 / Math.max(zsize, 1);
            viewMatrix = Float32Array.from([
                scale, 0, 0, -cx * scale,
                0, -scale, 0, cy * scale,
                0, 0, depthScale, -cz * depthScale,
                0, 0, 0, 1
            ]);
        }
        else {
            // Side view: Z->screenX, Y->screenY (flipped), X->depth
            const scale = 2.0 / (Math.max(zsize, ysize) * padding);
            const depthScale = 1.0 / Math.max(xsize, 1);
            viewMatrix = Float32Array.from([
                0, 0, scale, -cz * scale,
                0, -scale, 0, cy * scale,
                depthScale, 0, 0, -cx * depthScale,
                0, 0, 0, 1
            ]);
        }
        // Get WebGL context
        const { canvas, gl, program, uTransform, uDiffuse, uHasTexture, aPosLoc, aColLoc, aUVLoc, aNormLoc } = getSpriteGl();
        canvas.width = width;
        canvas.height = height;
        // Re-bind GL state after canvas resize (resize resets all WebGL state)
        gl.useProgram(program);
        gl.enableVertexAttribArray(aPosLoc);
        gl.enableVertexAttribArray(aColLoc);
        gl.enableVertexAttribArray(aUVLoc);
        gl.enableVertexAttribArray(aNormLoc);
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.disable(gl.CULL_FACE);
        gl.uniformMatrix4fv(uTransform, true, viewMatrix);
        // Draw each mesh
        for (const mesh of meshes) {
            const indexBuf = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
            const attrBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, attrBuf);
            gl.bufferData(gl.ARRAY_BUFFER, mesh.buf, gl.STATIC_DRAW);
            const bytesPerVertex = floatsPerVert * 4; // 11 floats * 4 bytes
            gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, bytesPerVertex, 0);
            gl.vertexAttribPointer(aColLoc, 3, gl.FLOAT, false, bytesPerVertex, 3 * 4);
            gl.vertexAttribPointer(aUVLoc, 2, gl.FLOAT, false, bytesPerVertex, 6 * 4);
            gl.vertexAttribPointer(aNormLoc, 3, gl.FLOAT, false, bytesPerVertex, 8 * 4);
            // Handle texture
            let glTex = null;
            if (mesh.texData) {
                glTex = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, glTex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mesh.texData);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.uniform1i(uDiffuse, 0);
                gl.uniform1i(uHasTexture, 1);
            }
            else {
                gl.uniform1i(uHasTexture, 0);
            }
            gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_INT, 0);
            // Cleanup
            if (glTex)
                gl.deleteTexture(glTex);
            gl.deleteBuffer(attrBuf);
            gl.deleteBuffer(indexBuf);
        }
        // Read pixels back
        const imageData = new ImageData(width, height);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data, 0);
        return {
            imageData,
            width,
            height,
            close() { }
        };
    }
    catch (e) {
        console.warn("[renderToSprite] WebGL render failed:", e);
        return null;
    }
}


/***/ },

/***/ "./types/npcApi.ts"
/*!*************************!*\
  !*** ./types/npcApi.ts ***!
  \*************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getApiBase: () => (/* binding */ getApiBase),
/* harmony export */   getNpcApiClient: () => (/* binding */ getNpcApiClient),
/* harmony export */   isLocal: () => (/* binding */ isLocal),
/* harmony export */   setApiBase: () => (/* binding */ setApiBase),
/* harmony export */   setLocal: () => (/* binding */ setLocal),
/* harmony export */   setProduction: () => (/* binding */ setProduction)
/* harmony export */ });
// Server URLs
const PRODUCTION_API_BASE = "https://www.techpure.dev/api";
const LOCAL_API_BASE = "http://localhost:42069/api";
const DEFAULT_API_BASE = PRODUCTION_API_BASE;
let apiClient = null;
let apiBase = DEFAULT_API_BASE;
function setApiBase(url) {
    apiBase = url.replace(/\/$/, "");
    apiClient = null; // Force recreation
}
function getApiBase() {
    return apiBase;
}
function setLocal() {
    setApiBase(LOCAL_API_BASE);
}
function setProduction() {
    setApiBase(PRODUCTION_API_BASE);
}
function isLocal() {
    return apiBase === LOCAL_API_BASE;
}
async function fetchJson(url, options) {
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
}
function getNpcApiClient() {
    if (!apiClient) {
        apiClient = {
            async searchNpcs(query, limit = 100) {
                try {
                    const params = new URLSearchParams({ name: query, limit: String(limit) });
                    return await fetchJson(`${apiBase}/npcs?${params}`);
                }
                catch (e) {
                    console.warn("[NpcApi] searchNpcs failed:", e);
                    return [];
                }
            },
            async searchByNameGrouped(query, limit = 500) {
                const params = new URLSearchParams({ name: query, limit: String(limit) });
                const flat = await fetchJson(`${apiBase}/npcs?${params}`);
                console.log(`[NpcApi] searchByNameGrouped: got ${flat.length} flat results for "${query}" (limit=${limit})`);
                // Group by NPC id
                const byId = new Map();
                for (const r of flat) {
                    const arr = byId.get(r.id) || [];
                    arr.push(r);
                    byId.set(r.id, arr);
                }
                return Array.from(byId.values()).map((entries) => ({
                    entries,
                    total: entries.length,
                }));
            },
            async getNpcById(id) {
                try {
                    return await fetchJson(`${apiBase}/npcs/${id}`);
                }
                catch (e) {
                    console.warn("[NpcApi] getNpcById failed:", e);
                    return null;
                }
            },
            async getById(id) {
                return this.getNpcById(id);
            },
            async createNpc(payload) {
                try {
                    return await fetchJson(`${apiBase}/npcs`, {
                        method: "POST",
                        body: JSON.stringify(payload),
                    });
                }
                catch (e) {
                    console.warn("[NpcApi] createNpc failed:", e);
                    return null;
                }
            },
            async lookupByBufferHash(hash) {
                try {
                    return await fetchJson(`${apiBase}/npcs/lookup/hash/${encodeURIComponent(hash)}`);
                }
                catch (e) {
                    console.warn("[NpcApi] lookupByBufferHash failed:", e);
                    return { found: false };
                }
            },
            async batchLookupByHash(hashes) {
                try {
                    return await fetchJson(`${apiBase}/npcs/lookup/batch`, {
                        method: "POST",
                        body: JSON.stringify({ hashes }),
                    });
                }
                catch (e) {
                    console.warn("[NpcApi] batchLookupByHash failed:", e);
                    return { results: [] };
                }
            },
            async addLocation(npcId, location, npcName) {
                try {
                    return await fetchJson(`${apiBase}/npcs/${npcId}/locations`, {
                        method: "POST",
                        body: JSON.stringify({ ...location, npcName }),
                    });
                }
                catch (e) {
                    console.warn("[NpcApi] addLocation failed:", e);
                    return { success: false };
                }
            },
            async updateBufferHash(npcId, bufferHash) {
                try {
                    await fetchJson(`${apiBase}/npcs/${npcId}/buffer-hash`, {
                        method: "POST",
                        body: JSON.stringify({ buffer_hash: bufferHash }),
                    });
                    return true;
                }
                catch (e) {
                    console.warn("[NpcApi] updateBufferHash failed:", e);
                    return false;
                }
            },
            async addVariant(opts) {
                try {
                    await fetchJson(`${apiBase}/npcs/${opts.npcId}/variants`, {
                        method: "POST",
                        body: JSON.stringify({
                            buffer_hash: opts.bufferHash,
                            variant_name: opts.variantName,
                        }),
                    });
                    return { success: true };
                }
                catch (e) {
                    console.warn("[NpcApi] addVariant failed:", e);
                    return { success: false };
                }
            },
            async getVariants(npcId) {
                try {
                    const res = await fetchJson(`${apiBase}/npcs/${npcId}/variants`);
                    return { variants: res.variants, next_variant_name: res.next_variant_name };
                }
                catch (e) {
                    console.warn("[NpcApi] getVariants failed:", e);
                    return { variants: [], next_variant_name: "Variant 1" };
                }
            },
            async searchVariantsByName(query, limit = 50) {
                try {
                    const params = new URLSearchParams({ name: query, limit: String(limit) });
                    return await fetchJson(`${apiBase}/npcs/variants/search?${params}`);
                }
                catch (e) {
                    console.warn("[NpcApi] searchVariantsByName failed:", e);
                    return [];
                }
            },
            async deleteVariant(hash) {
                try {
                    await fetchJson(`${apiBase}/npcs/variants/${encodeURIComponent(hash)}`, { method: "DELETE" });
                    return true;
                }
                catch (e) {
                    console.warn("[NpcApi] deleteVariant failed:", e);
                    return false;
                }
            },
            async submitNpcData(opts) {
                try {
                    // Try to create the NPC first
                    const created = await this.createNpc({
                        id: opts.npcId,
                        name: opts.name,
                        buffer_hash: opts.bufferHash,
                    });
                    if (created)
                        return { success: true };
                    // If NPC already exists (409), just update the buffer hash
                    const updated = await this.updateBufferHash(opts.npcId, opts.bufferHash);
                    return { success: updated };
                }
                catch (e) {
                    console.warn("[NpcApi] submitNpcData failed:", e);
                    return { success: false };
                }
            },
            async submitNpc(entry) {
                // Legacy compat - wraps createNpc
                try {
                    const result = await this.createNpc({
                        id: entry.id,
                        name: entry.name,
                        buffer_hash: entry.buffer_hash,
                    });
                    return result !== null;
                }
                catch {
                    return false;
                }
            },
        };
    }
    return apiClient;
}


/***/ },

/***/ "./types/npcBufferHash.ts"
/*!********************************!*\
  !*** ./types/npcBufferHash.ts ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   computeCombinedHash: () => (/* binding */ computeCombinedHash),
/* harmony export */   extractBufferHashes: () => (/* binding */ extractBufferHashes),
/* harmony export */   extractGroupedHashes: () => (/* binding */ extractGroupedHashes),
/* harmony export */   fromHexHash: () => (/* binding */ fromHexHash),
/* harmony export */   getHashId: () => (/* binding */ getHashId),
/* harmony export */   toHexHash: () => (/* binding */ toHexHash),
/* harmony export */   toMeshGroupInfos: () => (/* binding */ toMeshGroupInfos)
/* harmony export */ });
/* harmony import */ var _gl_renderprogram__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../gl/renderprogram */ "./gl/renderprogram.ts");
/* harmony import */ var _gl_crc32__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../gl/crc32 */ "./gl/crc32.ts");
/**
 * NPC Buffer Hash Utilities
 * Uses CRC-32 of vertex position data for NPC identification.
 * Compatible with RS3QuestBuddyBeta hashing algorithm.
 */


/**
 * Convert numeric hash to hex string format
 * @param num 32-bit unsigned integer
 * @returns Hex string like "0x1A2B3C4D"
 */
function toHexHash(num) {
    return "0x" + (num >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
/**
 * Convert hex hash string to numeric value
 * @param hex Hex string like "0x1A2B3C4D"
 * @returns 32-bit unsigned integer
 */
function fromHexHash(hex) {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    return parseInt(clean, 16) >>> 0;
}
/**
 * Extract buffer hashes from a render invocation using CRC-32 of vertex positions.
 * Uses generateMeshMeta for compatibility with RS3QuestBuddyBeta.
 */
function extractBufferHashes(render) {
    const progmeta = (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_0__.getProgramMeta)(render.program);
    if (!progmeta.aPos) {
        return {
            posBufferHash: "0x00000000",
            posBufferHashNum: 0,
            indexBufferHash: "0x00000000",
            combinedHash: "0x00000000",
        };
    }
    try {
        const meshMeta = (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_0__.generateMeshMeta)(render, progmeta);
        const hashNum = meshMeta.posbufferhash >>> 0;
        const hashHex = toHexHash(hashNum);
        return {
            posBufferHash: hashHex,
            posBufferHashNum: hashNum,
            indexBufferHash: hashHex,
            combinedHash: hashHex,
        };
    }
    catch (e) {
        console.warn("[extractBufferHashes] Failed to generate mesh meta:", e);
        return {
            posBufferHash: "0x00000000",
            posBufferHashNum: 0,
            indexBufferHash: "0x00000000",
            combinedHash: "0x00000000",
        };
    }
}
/**
 * Compute combined hash from multiple render invocations.
 * Collects UNIQUE mesh hashes (deduplicates repeats), sorts them,
 * then combines via CRC-32 - matching RS3QuestBuddyBeta behavior.
 */
function computeCombinedHash(renders) {
    if (renders.length === 0) {
        return { hex: "0x00000000", num: 0 };
    }
    const uniqueHashes = new Set();
    for (const render of renders) {
        const progmeta = (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_0__.getProgramMeta)(render.program);
        if (!progmeta.aPos)
            continue;
        try {
            const meshMeta = (0,_gl_renderprogram__WEBPACK_IMPORTED_MODULE_0__.generateMeshMeta)(render, progmeta);
            uniqueHashes.add(meshMeta.posbufferhash >>> 0);
        }
        catch {
            // Skip meshes that fail
        }
    }
    if (uniqueHashes.size === 0) {
        return { hex: "0x00000000", num: 0 };
    }
    const sortedHashes = Array.from(uniqueHashes).sort((a, b) => a - b);
    const combined = new _gl_crc32__WEBPACK_IMPORTED_MODULE_1__.CrcBuilder();
    for (const hash of sortedHashes) {
        combined.addUint32(hash);
    }
    const num = combined.get() >>> 0;
    return { hex: toHexHash(num), num };
}
/**
 * Get short hash identifier from buffer hashes
 */
function getHashId(hashes) {
    return hashes.posBufferHash.substring(0, 10);
}
/**
 * Extract grouped hashes from multiple render invocations
 */
function extractGroupedHashes(renders) {
    if (renders.length === 0) {
        return {
            posBufferHash: "0x00000000",
            combinedHash: "0x00000000",
        };
    }
    const mainHashes = extractBufferHashes(renders[0]);
    const combined = computeCombinedHash(renders);
    return {
        posBufferHash: mainHashes.posBufferHash,
        combinedHash: combined.hex,
    };
}
/**
 * Convert NpcMeshGroup array to NpcMeshGroupInfo array
 */
function toMeshGroupInfos(groups) {
    return groups.map((group) => {
        const hashes = extractGroupedHashes(group.renders);
        return {
            hashId: getHashId(hashes),
            meshCount: group.meshCount,
            combinedHash: hashes.combinedHash,
        };
    });
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
/******/ __webpack_require__.O(0, ["vendor-react","vendor-three"], () => (__webpack_exec__("./app/entrance/index.tsx")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);
//# sourceMappingURL=main.bundle.js.map