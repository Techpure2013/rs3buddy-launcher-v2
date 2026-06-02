// NPC Recorder App
import React from "react";
import { NpcOverlay, NpcMesh, NpcMeshGroup } from "../../gl/npcOverlay";
import { NpcCataloger, PendingNpcGroup, NpcVertexEntry } from "../../gl/npcCataloger";
import { extractBufferHashes, extractGroupedHashes } from "../../types/npcBufferHash";
import { getNpcApiClient, NpcApiClient, isLocal, setLocal, setProduction } from "../../types/npcApi";
import { NpcDbEntry, NpcSearchResultGrouped, NpcVariantSearchResult } from "../../types/npcTypes";
import { getRenderFunc, MeshSprite, renderToSprite } from "../../gl/renderprogram";

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
function TextureView({ tex, size = 128 }: { tex: ImageData | ImageBitmap; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cnv = canvasRef.current;
    if (cnv && tex) {
      cnv.width = tex.width;
      cnv.height = tex.height;
      const ctx = cnv.getContext("2d");
      if (ctx) {
        if (tex instanceof ImageData) {
          ctx.putImageData(tex, 0, 0);
        } else {
          ctx.drawImage(tex, 0, 0);
        }
      }
    }
  }, [tex]);

  return <canvas ref={canvasRef} style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}

// NPC Preview component - renders front and side views (single mesh)
interface NpcPreviewProps {
  npc: NpcMesh;
  size?: number;
}

function NpcPreview({ npc, size = 96 }: NpcPreviewProps) {
  const [sprites, setSprites] = React.useState<{ front: MeshSprite | null; side: MeshSprite | null }>({ front: null, side: null });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    let currentSprites: { front: MeshSprite | null; side: MeshSprite | null } = { front: null, side: null };
    setLoading(true);
    setSprites({ front: null, side: null });

    const renderSprites = async () => {
      try {
        const renderfunc = getRenderFunc(npc.render);
        const [front, side] = await Promise.all([
          renderToSprite([renderfunc], size / 512, "front", { skipTextures: size <= 128 }),
          renderToSprite([renderfunc], size / 512, "side", { skipTextures: size <= 128 }),
        ]);
        if (!cancelled) {
          currentSprites = { front, side };
          setSprites({ front, side });
          setLoading(false);
        } else {
          // Clean up if cancelled
          front?.close?.();
          side?.close?.();
        }
      } catch (e) {
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
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
          <span style={{ color: theme.textMuted, fontSize: "10px" }}>Loading...</span>
        </div>
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
          <span style={{ color: theme.textMuted, fontSize: "10px" }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {sprites.front ? (
        <div style={{ border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" }}>
          <TextureView tex={sprites.front.imageData} size={size} />
        </div>
      ) : (
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" }} />
      )}
      {sprites.side ? (
        <div style={{ border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" }}>
          <TextureView tex={sprites.side.imageData} size={size} />
        </div>
      ) : (
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" }} />
      )}
    </div>
  );
}

// NPC Group Preview component - renders ALL meshes in a group for full color
interface NpcGroupPreviewProps {
  group: NpcMeshGroup;
  size?: number;
}

function NpcGroupPreview({ group, size = 96 }: NpcGroupPreviewProps) {
  const [sprites, setSprites] = React.useState<{ front: MeshSprite | null; side: MeshSprite | null }>({ front: null, side: null });
  const [loading, setLoading] = React.useState(true);

  // Create a unique key from all mesh VAO IDs
  const groupKey = group.allMeshes.map(m => m.vaoId).sort().join("-");

  React.useEffect(() => {
    let cancelled = false;
    let currentSprites: { front: MeshSprite | null; side: MeshSprite | null } = { front: null, side: null };
    setLoading(true);
    setSprites({ front: null, side: null });

    const renderSprites = async () => {
      try {
        // Get render functions for ALL meshes in the group
        const renderFuncs = group.renders.map(r => getRenderFunc(r));

        const [front, side] = await Promise.all([
          renderToSprite(renderFuncs, size / 512, "front", { skipTextures: size <= 128 }),
          renderToSprite(renderFuncs, size / 512, "side", { skipTextures: size <= 128 }),
        ]);

        if (!cancelled) {
          currentSprites = { front, side };
          setSprites({ front, side });
          setLoading(false);
        } else {
          // Clean up if cancelled
          front?.close?.();
          side?.close?.();
        }
      } catch (e) {
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
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
          <span style={{ color: theme.textMuted, fontSize: "10px" }}>Loading...</span>
        </div>
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
          <span style={{ color: theme.textMuted, fontSize: "10px" }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {sprites.front ? (
        <div style={{ border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" }}>
          <TextureView tex={sprites.front.imageData} size={size} />
        </div>
      ) : (
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" }} />
      )}
      {sprites.side ? (
        <div style={{ border: `1px solid ${theme.borderLight}`, borderRadius: "4px", overflow: "hidden" }}>
          <TextureView tex={sprites.side.imageData} size={size} />
        </div>
      ) : (
        <div style={{ width: size, height: size, backgroundColor: theme.bgLight, borderRadius: "4px" }} />
      )}
    </div>
  );
}

type DbLookupResult = {
  npc: NpcDbEntry;
  matchType?: "buffer_hash" | "variant";
  variant_name?: string | null;
};

export default function App() {
  // Tab state
  const [activeTab, setActiveTab] = React.useState<"cataloger" | "lookup">("cataloger");

  // NPC Lookup tab state
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [lookupResults, setLookupResults] = React.useState<NpcSearchResultGrouped[]>([]);
  const [lookupSearching, setLookupSearching] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [selectedLookupNpc, setSelectedLookupNpc] = React.useState<NpcDbEntry | null>(null);
  const [loadingNpcDetails, setLoadingNpcDetails] = React.useState(false);

  // Cataloger state (uses grouped meshes for combined hashes)
  const [pendingGroups, setPendingGroups] = React.useState<PendingNpcGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = React.useState(0);
  const [focusedMeshIndex, setFocusedMeshIndex] = React.useState(0); // Which mesh in the group is highlighted
  const [catalogEntries, setCatalogEntries] = React.useState<NpcVertexEntry[]>([]);
  const [isScanning, setIsScanning] = React.useState(false); // Scanning in progress indicator

  // Database lookup state (keyed by hex hash string like "0x1A2B3C4D")
  const [npcDbResults, setNpcDbResults] = React.useState<Map<string, DbLookupResult | null>>(new Map());
  const [submitModalNpc, setSubmitModalNpc] = React.useState<NpcMesh | null>(null);
  const [submitModalGroup, setSubmitModalGroup] = React.useState<NpcMeshGroup | null>(null);
  const [submitNpcIdInput, setSubmitNpcIdInput] = React.useState("");
  const [submitStatus, setSubmitStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitIsVariant, setSubmitIsVariant] = React.useState(false);
  const [submitVariantName, setSubmitVariantName] = React.useState("");

  // Quick Add NPC submission
  const [jsonSubmitStatus, setJsonSubmitStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [jsonSubmitting, setJsonSubmitting] = React.useState(false);
  const [isVariant, setIsVariant] = React.useState(false);
  const [variantName, setVariantName] = React.useState("");

  // NPC name search state
  const [npcSearchQuery, setNpcSearchQuery] = React.useState("");
  const [npcSearchResults, setNpcSearchResults] = React.useState<NpcSearchResultGrouped[]>([]);
  const [npcSearching, setNpcSearching] = React.useState(false);
  const [selectedSearchNpc, setSelectedSearchNpc] = React.useState<NpcSearchResultGrouped | null>(null);

  // Variant search state (Lookup tab)
  const [lookupMode, setLookupMode] = React.useState<"npcs" | "variants">("npcs");
  const [variantSearchResults, setVariantSearchResults] = React.useState<NpcVariantSearchResult[]>([]);

  // Quick Add form fields (replacing JSON textarea)
  const [formNpcId, setFormNpcId] = React.useState("");
  const [formNpcName, setFormNpcName] = React.useState("");
  const [formBufferHash, setFormBufferHash] = React.useState("");

  // Server toggle
  const [usingLocal, setUsingLocal] = React.useState(isLocal());

  // Manual NPC entry state (for unknown NPCs)
  const [manualNpcName, setManualNpcName] = React.useState("");

  const overlayRef = React.useRef<NpcOverlay | null>(null);
  const apiClientRef = React.useRef<NpcApiClient | null>(null);
  const catalogerRef = React.useRef<NpcCataloger | null>(null);

  // Initialize overlay, cataloger, and API client
  React.useEffect(() => {
    overlayRef.current = new NpcOverlay();
    catalogerRef.current = new NpcCataloger();
    apiClientRef.current = getNpcApiClient();
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
  React.useEffect(() => {
    if (!submitIsVariant || !submitModalNpc) return;

    const npcId = selectedSearchNpc?.entries[0]?.id ?? parseInt(submitNpcIdInput, 10);
    if (isNaN(npcId) || npcId <= 0) return;

    const api = getNpcApiClient();
    api.getVariants(npcId).then(({ next_variant_name }) => {
      if (next_variant_name && !submitVariantName) {
        setSubmitVariantName(next_variant_name);
      }
    }).catch(() => {});
  }, [submitIsVariant, submitModalNpc, selectedSearchNpc, submitNpcIdInput, manualNpcName]);

  // Lookup tab - search NPCs by name (grouped results)
  const lookupTimeoutRef = React.useRef<number | null>(null);
  const handleLookupSearch = (query: string) => {
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Lookup] Search failed:", msg);
        setLookupError(msg);
        setLookupResults([]);
      }
      setLookupSearching(false);
    }, 300);
  };

  // Lookup tab - search variants by name
  const handleVariantSearch = (query: string) => {
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
      if (!apiClientRef.current) return;
      setLookupSearching(true);
      setLookupError(null);
      try {
        const results = await apiClientRef.current.searchVariantsByName(query, 50);
        setVariantSearchResults(results);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLookupError(msg);
        setVariantSearchResults([]);
      }
      setLookupSearching(false);
    }, 300);
  };

  // Fetch full NPC details when selecting from lookup
  const handleSelectLookupNpc = async (npcId: number) => {
    if (!apiClientRef.current) return;
    setLoadingNpcDetails(true);
    try {
      const npc = await apiClientRef.current.getById(npcId);
      setSelectedLookupNpc(npc);
    } catch (e) {
      console.error("Failed to fetch NPC details:", e);
    }
    setLoadingNpcDetails(false);
  };

  // Search NPCs by name (for submit modal)
  const searchTimeoutRef = React.useRef<number | null>(null);
  const handleNpcSearch = (query: string) => {
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
      if (!apiClientRef.current) return;
      setNpcSearching(true);
      try {
        const results = await apiClientRef.current.searchByNameGrouped(query, 500);
        setNpcSearchResults(results);
      } catch (e) {
        console.error("NPC search failed:", e);
        setNpcSearchResults([]);
      }
      setNpcSearching(false);
    }, 300);
  };

  // Submit a buffer hash to the database (uses combined hash if group is available)
  const handleSubmitBufferHash = async () => {
    if (!apiClientRef.current || !submitModalNpc) return;

    // Get NPC ID and name from selected search result or manual input
    let npcId: number;
    let npcName: string;

    if (selectedSearchNpc) {
      npcId = selectedSearchNpc.entries[0].id;
      npcName = selectedSearchNpc.entries[0].name;
    } else {
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
    let bufferHash: string;
    if (submitModalGroup) {
      const groupHashes = extractGroupedHashes(submitModalGroup.renders);
      bufferHash = groupHashes.combinedHash;
    } else {
      const bufferHashes = extractBufferHashes(submitModalNpc.render);
      bufferHash = bufferHashes.posBufferHash;
    }

    if (bufferHash === "0x00000000") {
      setSubmitStatus({ type: "error", message: "Could not extract buffer hash from NPC" });
      return;
    }

    setSubmitStatus(null);

    let result: { success: boolean; message?: string };

    if (submitIsVariant) {
      // Add as variant to existing NPC
      result = await apiClientRef.current.addVariant({
        npcId,
        bufferHash,
        variantName: submitVariantName.trim() || undefined,
      });
    } else {
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
    } else {
      setSubmitStatus({ type: "error", message: result.message || "Failed to submit NPC data" });
    }
  };

  // === Cataloger Functions ===

  // Scan nearby NPCs (all visible) with aggressive capture
  const handleScanAllVisible = async () => {
    if (!catalogerRef.current) return;

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
    } catch (e: any) {
      console.error("[Cataloger] Scan failed:", e?.message || e);
      setSubmitStatus({ type: "error", message: "Scan timed out or failed. Try closing and reopening the RS client, then restart the launcher." });
    } finally {
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
      const api = getNpcApiClient();

      if (isVariant) {
        let effectiveVariantName = variantName.trim();
        if (!effectiveVariantName && formNpcName.trim()) {
          // Auto-generate: fetch next variant number from server
          try {
            const { next_variant_name } = await api.getVariants(npcId);
            if (next_variant_name) {
              effectiveVariantName = next_variant_name;
            }
          } catch {}
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
        } else {
          setJsonSubmitStatus({ type: "error", message: "Failed to add variant" });
        }
      } else {
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
        } else {
          setJsonSubmitStatus({ type: "error", message: "Failed to add NPC" });
        }
      }
    } catch (e) {
      setJsonSubmitStatus({ type: "error", message: e instanceof Error ? e.message : "Failed to submit" });
    } finally {
      setJsonSubmitting(false);
    }
  };

  // Move to next NPC group
  const handleNextNpc = async () => {
    if (!catalogerRef.current || pendingGroups.length === 0) return;

    const nextIdx = currentGroupIndex + 1;
    if (nextIdx < pendingGroups.length) {
      setCurrentGroupIndex(nextIdx);
      setFocusedMeshIndex(0); // Reset to first mesh in new group
      await catalogerRef.current.highlightNpc(pendingGroups[nextIdx].group.mainMesh);
    }
  };

  // Move to previous NPC group
  const handlePrevNpc = async () => {
    if (!catalogerRef.current || pendingGroups.length === 0) return;

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
  const handleImportCatalog = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !catalogerRef.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        catalogerRef.current!.importJson(json);
        setCatalogEntries([...catalogerRef.current!.getVertexList().entries]);
        alert("Catalog imported successfully!");
      } catch (err) {
        alert("Failed to import catalog: " + err);
      }
    };
    reader.readAsText(file);
  };

  // Delete an entry from the catalog
  const handleDeleteEntry = (vertexCount: number) => {
    if (!catalogerRef.current) return;
    if (confirm(`Delete entry for vertex count ${vertexCount}?`)) {
      catalogerRef.current.removeEntry(vertexCount);
      setCatalogEntries([...catalogerRef.current.getVertexList().entries]);
    }
  };

  // Look up grouped NPCs in database by combined hash
  const lookupGroupsInDb = async (groups: NpcMeshGroup[]) => {
    console.log("[lookupGroupsInDb] Called with", groups.length, "groups");

    if (!apiClientRef.current) {
      console.warn("[lookupGroupsInDb] No API client available!");
      return;
    }

    const results = new Map<string, DbLookupResult | null>(npcDbResults);
    console.log("[lookupGroupsInDb] Existing cached results:", results.size);

    // Collect ALL hashes: combined group hashes + individual mesh hashes
    const hashSet = new Set<string>();
    for (const group of groups) {
      const groupHashes = extractGroupedHashes(group.renders);
      // Add combined hash
      if (groupHashes.combinedHash !== "0x00000000" && !results.has(groupHashes.combinedHash)) {
        hashSet.add(groupHashes.combinedHash);
      }
      // Add individual mesh hashes (DB may store per-mesh hashes)
      for (const mesh of group.allMeshes) {
        const meshHashes = extractBufferHashes(mesh.render);
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
            } else {
              console.log(`[NPC-DB] ✗ No match: ${result.hash}`);
            }
          }
          console.log("[lookupGroupsInDb] Found", foundCount, "NPCs in batch");
        }
      } catch (error) {
        console.error("[lookupGroupsInDb] API call failed:", error);
      }
    } else {
      console.log("[lookupGroupsInDb] No new hashes to lookup (all cached or zero)");
    }

    setNpcDbResults(results);
    console.log("[lookupGroupsInDb] Updated results cache, total entries:", results.size);
  };

  // Get database entry for a group by its combined hash
  const getGroupDbEntry = (combinedHash: string): DbLookupResult | null | undefined => {
    if (combinedHash === "0x00000000") return undefined;
    return npcDbResults.get(combinedHash);
  };

  // Get current NPC group being identified
  const currentGroup = pendingGroups[currentGroupIndex];
  const currentNpc = currentGroup?.group.mainMesh;

  return (
    <div style={{ padding: "10px", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "13px", backgroundColor: theme.bgDark, color: theme.textSecondary, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h1 style={{ margin: 0, color: theme.textPrimary, fontSize: "16px", fontWeight: 600 }}>NPC Recorder</h1>
        <button
          onClick={() => {
            if (usingLocal) {
              setProduction();
              setUsingLocal(false);
            } else {
              setLocal();
              setUsingLocal(true);
            }
          }}
          style={{
            padding: "4px 10px",
            fontSize: "10px",
            backgroundColor: usingLocal ? theme.colorWarning : theme.colorSuccess,
            color: theme.textPrimary,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {usingLocal ? "LOCAL" : "PROD"}
        </button>
      </div>

      {/* Tab Buttons */}
      <div style={{ display: "flex", gap: "0", marginBottom: "15px" }}>
        <button
          onClick={() => setActiveTab("cataloger")}
          style={{
            padding: "10px 20px",
            fontSize: "12px",
            backgroundColor: activeTab === "cataloger" ? theme.colorPurple : theme.bgInput,
            color: activeTab === "cataloger" ? theme.textPrimary : theme.textMuted,
            border: `1px solid ${activeTab === "cataloger" ? theme.colorPurple : theme.borderLight}`,
            borderRadius: "4px 0 0 4px",
            cursor: "pointer",
            fontWeight: activeTab === "cataloger" ? 600 : 400
          }}
        >
          NPC Cataloger
        </button>
        <button
          onClick={() => setActiveTab("lookup")}
          style={{
            padding: "10px 20px",
            fontSize: "12px",
            backgroundColor: activeTab === "lookup" ? theme.colorTeal : theme.bgInput,
            color: activeTab === "lookup" ? theme.textPrimary : theme.textMuted,
            border: `1px solid ${activeTab === "lookup" ? theme.colorTeal : theme.borderLight}`,
            borderLeft: "none",
            borderRadius: "0 4px 4px 0",
            cursor: "pointer",
            fontWeight: activeTab === "lookup" ? 600 : 400
          }}
        >
          NPC Lookup
        </button>
      </div>

      {/* Cataloger Tab */}
      {activeTab === "cataloger" && (
        <>
          {/* Instructions */}
          <div style={{ marginBottom: "12px", padding: "10px", backgroundColor: "rgba(52, 152, 219, 0.1)", borderRadius: "6px", border: `1px solid ${theme.colorInfo}`, fontSize: "11px", color: theme.textMuted, lineHeight: "1.6" }}>
            <div style={{ marginBottom: "4px", fontWeight: 600, color: theme.colorInfo, fontSize: "12px" }}>How to use:</div>
            <div>• Click "Scan" while in-game to capture all visible NPCs nearby</div>
            <div>• Use the arrow buttons to browse through detected NPCs</div>
            <div>• NPCs are automatically looked up in the database - green = known, yellow = unknown</div>
            <div>• Click "Submit to Database" on unknown NPCs to contribute to the database</div>
            <div>• You can search for the NPC by name, or enter the NPC ID from the RuneScape Wiki manually</div>
            <div>• Use "Quick Add NPC" to manually add an NPC by ID, name, and buffer hash</div>
          </div>

          {/* Scan Controls */}
          <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` }}>
            <button
              onClick={handleScanAllVisible}
              style={{
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
              }}
              disabled={isScanning}
            >
              {isScanning ? "Scanning..." : "Scan"}
            </button>
            <p style={{ margin: 0, fontSize: "11px", color: theme.textMuted, textAlign: "center" }}>
              {isScanning
                ? "Capturing frames..."
                : pendingGroups.length > 0
                  ? `Found ${pendingGroups.length} NPC(s) - Currently on ${currentGroupIndex + 1} of ${pendingGroups.length}`
                  : "Ready to scan"}
            </p>
          </div>

          {/* Quick Add NPC */}
          <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` }}>
            <div style={{ marginBottom: "8px", fontSize: "11px", fontWeight: 600, color: theme.textPrimary }}>
              Quick Add NPC
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "10px", color: theme.textMuted }}>NPC ID *</label>
                <input
                  type="number"
                  value={formNpcId}
                  onChange={e => setFormNpcId(e.target.value)}
                  placeholder="e.g. 15855"
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "10px", color: theme.textMuted }}>
                  {isVariant ? "NPC Name (optional)" : "NPC Name *"}
                </label>
                <input
                  type="text"
                  value={formNpcName}
                  onChange={e => setFormNpcName(e.target.value)}
                  placeholder="e.g. Town crier"
                  disabled={isVariant}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box", opacity: isVariant ? 0.5 : 1 }}
                />
              </div>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <label style={{ display: "block", marginBottom: "3px", fontSize: "10px", color: theme.textMuted }}>Buffer Hash *</label>
              <input
                type="text"
                value={formBufferHash}
                onChange={e => setFormBufferHash(e.target.value)}
                placeholder="e.g. 0x1A2B3C4D"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={isVariant}
                  onChange={e => setIsVariant(e.target.checked)}
                />
                Is Variant
              </label>
              {isVariant && (
                <input
                  type="text"
                  value={variantName}
                  onChange={e => setVariantName(e.target.value)}
                  placeholder="Variant name (auto-generated if empty)"
                  style={{ ...inputStyle, width: "180px" }}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={handleFormNpcSubmit}
                disabled={jsonSubmitting || !formNpcId || !formBufferHash || (!isVariant && !formNpcName)}
                style={buttonStyle(isVariant ? theme.colorPurple : theme.colorSuccess)}
              >
                {jsonSubmitting ? "Adding..." : isVariant ? "Add Variant" : "Add NPC"}
              </button>
              {jsonSubmitStatus && (
                <span style={{
                  fontSize: "11px",
                  color: jsonSubmitStatus.type === "success" ? theme.colorSuccess : theme.colorDanger,
                }}>
                  {jsonSubmitStatus.message}
                </span>
              )}
            </div>
          </div>

          {/* Current NPC Group - Buffer Hash Submission */}
          {currentGroup && currentNpc && (() => {
            const groupHashes = extractGroupedHashes(currentGroup.group.renders);
            const dbEntry = getGroupDbEntry(groupHashes.combinedHash);
            const isIdentified = dbEntry !== undefined && dbEntry !== null;
            const isUnknown = dbEntry === null;
            const hasBufferInDb = isIdentified && dbEntry.npc.buffer_hash !== undefined;
            const bufferMatches = hasBufferInDb && dbEntry.npc.buffer_hash === groupHashes.combinedHash;

            return (
              <div style={{
                marginBottom: "15px",
                padding: "15px",
                backgroundColor: isIdentified ? "rgba(39, 174, 96, 0.1)" : isUnknown ? "rgba(243, 156, 18, 0.1)" : theme.bgLight,
                borderRadius: "6px",
                border: `1px solid ${isIdentified ? theme.colorSuccess : isUnknown ? theme.colorWarning : theme.colorInfo}`
              }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary }}>
                  NPC {currentGroupIndex + 1} of {pendingGroups.length}
                  {isIdentified && <span style={{ marginLeft: "10px", color: theme.colorSuccess }}>{dbEntry.npc.name}</span>}
                  {isIdentified && dbEntry.matchType === "variant" && (
                    <span style={{ marginLeft: "8px", padding: "2px 6px", backgroundColor: "rgba(156, 39, 176, 0.3)", color: theme.colorPurple, borderRadius: "3px", fontSize: "10px" }}>
                      {dbEntry.variant_name || "Variant"}
                    </span>
                  )}
                  {isUnknown && <span style={{ marginLeft: "10px", color: theme.colorWarning }}>Unknown NPC</span>}
                  {bufferMatches && <span style={{ marginLeft: "10px", fontSize: "10px", color: theme.colorSuccess }}>(Linked)</span>}
                </h3>

                {/* NPC Info */}
                <div style={{ marginBottom: "10px", fontSize: "11px", backgroundColor: theme.bgInput, padding: "10px", borderRadius: "4px", color: theme.textSecondary }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                    <div><strong style={{ color: theme.textPrimary }}>Vertices:</strong> {currentGroup.group.totalVertexCount}</div>
                    <div><strong style={{ color: theme.textPrimary }}>Meshes:</strong> {currentGroup.group.meshCount}</div>
                    <div><strong style={{ color: theme.textPrimary }}>Distance:</strong> {currentGroup.distance.toFixed(1)} tiles</div>
                    {isIdentified && <div><strong style={{ color: theme.textPrimary }}>NPC ID:</strong> {dbEntry.npc.id}</div>}
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <strong style={{ color: theme.textPrimary }}>Combined Hash:</strong>
                    <code style={{ color: theme.colorInfo, fontFamily: "monospace", fontSize: "12px", backgroundColor: theme.bgMedium, padding: "3px 8px", borderRadius: "3px" }}>
                      {groupHashes.combinedHash}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(groupHashes.combinedHash)}
                      style={{ padding: "2px 6px", fontSize: "9px", cursor: "pointer", backgroundColor: theme.bgLight, color: theme.textMuted, border: `1px solid ${theme.borderLight}`, borderRadius: "3px" }}
                    >
                      Copy
                    </button>
                  </div>
                  {hasBufferInDb && !bufferMatches && (
                    <div style={{ marginTop: "6px", color: theme.colorPurple, fontSize: "10px" }}>
                      DB has different hash: {dbEntry.npc.buffer_hash}
                    </div>
                  )}
                </div>

                {/* Combined NPC Preview - renders all meshes together */}
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ marginBottom: "8px", fontSize: "10px", color: theme.textMuted }}>
                    Combined Preview (all {currentGroup.group.allMeshes.length} meshes):
                  </div>
                  <NpcGroupPreview group={currentGroup.group} size={120} />
                </div>

                {/* Individual meshes in group (click to highlight) */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ marginBottom: "8px", fontSize: "10px", color: theme.textMuted }}>
                    Individual meshes ({currentGroup.group.allMeshes.length}) - click to highlight:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {currentGroup.group.allMeshes.map((mesh, meshIdx) => {
                      const meshHash = extractBufferHashes(mesh.render);
                      const isFocused = meshIdx === focusedMeshIndex;
                      return (
                        <div
                          key={meshIdx}
                          onClick={async () => {
                            setFocusedMeshIndex(meshIdx);
                            if (catalogerRef.current) {
                              await catalogerRef.current.highlightNpc(mesh);
                            }
                          }}
                          style={{
                            backgroundColor: isFocused ? theme.bgLight : theme.bgInput,
                            padding: "6px",
                            borderRadius: "4px",
                            border: isFocused ? `2px solid ${theme.colorInfo}` : `1px solid ${theme.borderLight}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <NpcPreview npc={mesh} size={72} />
                          <div style={{ fontSize: "9px", color: isFocused ? theme.textPrimary : theme.textMuted, marginTop: "4px", textAlign: "center" }}>
                            V:{mesh.vertexCount}
                          </div>
                          <div style={{ fontSize: "8px", color: theme.textDim, textAlign: "center", wordBreak: "break-all" }}>
                            {meshHash.posBufferHash.slice(0, 10)}...
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={handlePrevNpc}
                    disabled={currentGroupIndex === 0}
                    style={{ ...buttonStyle(theme.borderLight), opacity: currentGroupIndex === 0 ? 0.5 : 1 }}
                  >
                    Prev
                  </button>

                  {/* Show appropriate action based on DB status */}
                  {bufferMatches ? (
                    <span style={{ padding: "8px 16px", fontSize: "14px", color: theme.colorSuccess }}>Already Linked</span>
                  ) : isIdentified && !hasBufferInDb ? (
                    <button
                      onClick={() => {
                        setSubmitModalNpc(currentNpc);
                        setSubmitModalGroup(currentGroup.group);
                        setSelectedSearchNpc({ entries: [{ id: dbEntry.npc.id, name: dbEntry.npc.name, lat: 0, lng: 0, floor: 0 }], total: 1 });
                        setSubmitNpcIdInput(dbEntry.npc.id.toString());
                        setSubmitStatus(null);
                        setSubmitIsVariant(false);
                        setSubmitVariantName("");
                      }}
                      style={buttonStyle(theme.colorInfo)}
                    >
                      Link Buffer to {dbEntry.npc.name}
                    </button>
                  ) : isUnknown ? (
                    <button
                      onClick={() => {
                        setSubmitModalNpc(currentNpc);
                        setSubmitModalGroup(currentGroup.group);
                        setSubmitNpcIdInput("");
                        setManualNpcName("");
                        setNpcSearchQuery("");
                        setSelectedSearchNpc(null);
                        setSubmitStatus(null);
                        setSubmitIsVariant(false);
                        setSubmitVariantName("");
                      }}
                      style={buttonStyle(theme.colorWarning)}
                    >
                      Submit to Database
                    </button>
                  ) : (
                    <span style={{ padding: "8px 16px", fontSize: "12px", color: theme.textMuted }}>Loading...</span>
                  )}

                  <button onClick={handleSkipNpc} style={buttonStyle(theme.borderLight)}>
                    Skip
                  </button>

                  <button
                    onClick={handleNextNpc}
                    disabled={currentGroupIndex >= pendingGroups.length - 1}
                    style={{ ...buttonStyle(theme.borderLight), opacity: currentGroupIndex >= pendingGroups.length - 1 ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Catalog Management */}
          <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={handleDownloadCatalog} style={buttonStyle(theme.colorSuccess)}>
                Download JSON
              </button>
              <label style={{ ...buttonStyle(theme.colorInfo), display: "inline-block", cursor: "pointer" }}>
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportCatalog}
                  style={{ display: "none" }}
                />
              </label>
              <span style={{ fontSize: "11px", color: theme.textMuted }}>
                {catalogEntries.length} entries in catalog
              </span>
            </div>
          </div>

          {/* Catalog Entries */}
          <div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary }}>Cataloged NPCs ({catalogEntries.length})</h3>
            {catalogEntries.length === 0 ? (
              <p style={{ color: theme.textMuted }}>No NPCs cataloged yet. Scan nearby NPCs to start.</p>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {catalogEntries.map((entry) => (
                  <div
                    key={entry.vertexCount}
                    style={{
                      padding: "10px",
                      marginBottom: "6px",
                      backgroundColor: theme.bgLight,
                      borderRadius: "6px",
                      fontSize: "11px",
                      border: `1px solid ${theme.borderLight}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <strong style={{ color: theme.textPrimary }}>{entry.name}</strong>
                      <span style={{ marginLeft: "10px", color: theme.textMuted }}>ID: {entry.npcId}</span>
                      <span style={{ marginLeft: "10px", color: theme.colorPurple }}>Vertices: {entry.vertexCount}</span>
                      {entry.notes && <span style={{ marginLeft: "10px", color: theme.textDim, fontStyle: "italic" }}>{entry.notes}</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(entry.vertexCount)}
                      style={{ padding: "2px 8px", fontSize: "10px", cursor: "pointer", backgroundColor: theme.colorDanger, color: theme.textPrimary, border: "none", borderRadius: "4px" }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* NPC Lookup Tab */}
      {activeTab === "lookup" && (
        <>
          {/* Instructions */}
          <div style={{ marginBottom: "12px", padding: "10px", backgroundColor: "rgba(52, 152, 219, 0.1)", borderRadius: "6px", border: `1px solid ${theme.colorInfo}`, fontSize: "11px", color: theme.textMuted, lineHeight: "1.6" }}>
            <div style={{ marginBottom: "4px", fontWeight: 600, color: theme.colorInfo, fontSize: "12px" }}>How to use:</div>
            <div>• Search for any NPC by name to see its database entry</div>
            <div>• Switch between "NPCs" and "Variants" search modes</div>
            <div>• Click on a result to see full details including locations, actions, and buffer hashes</div>
          </div>

          {/* Search Box */}
          <div style={{ marginBottom: "15px", padding: "15px", backgroundColor: theme.bgMedium, borderRadius: "6px", border: `1px solid ${theme.borderColor}` }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.colorTeal }}>Search NPC Database</h3>
            <div style={{ display: "flex", gap: "0", marginBottom: "10px" }}>
              <button
                onClick={() => { setLookupMode("npcs"); setVariantSearchResults([]); setLookupResults([]); setLookupQuery(""); }}
                style={{
                  padding: "6px 14px",
                  fontSize: "11px",
                  backgroundColor: lookupMode === "npcs" ? theme.colorTeal : theme.bgInput,
                  color: lookupMode === "npcs" ? theme.textPrimary : theme.textMuted,
                  border: `1px solid ${lookupMode === "npcs" ? theme.colorTeal : theme.borderLight}`,
                  borderRadius: "4px 0 0 4px",
                  cursor: "pointer",
                  fontWeight: lookupMode === "npcs" ? 600 : 400,
                }}
              >
                NPCs
              </button>
              <button
                onClick={() => { setLookupMode("variants"); setVariantSearchResults([]); setLookupResults([]); setLookupQuery(""); }}
                style={{
                  padding: "6px 14px",
                  fontSize: "11px",
                  backgroundColor: lookupMode === "variants" ? theme.colorPurple : theme.bgInput,
                  color: lookupMode === "variants" ? theme.textPrimary : theme.textMuted,
                  border: `1px solid ${lookupMode === "variants" ? theme.colorPurple : theme.borderLight}`,
                  borderRadius: "0 4px 4px 0",
                  cursor: "pointer",
                  fontWeight: lookupMode === "variants" ? 600 : 400,
                }}
              >
                Variants
              </button>
            </div>
            <input
              type="text"
              value={lookupQuery}
              onChange={e => lookupMode === "npcs" ? handleLookupSearch(e.target.value) : handleVariantSearch(e.target.value)}
              placeholder={lookupMode === "npcs" ? "Enter NPC name to search..." : "Search NPCs with variants..."}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "13px",
                backgroundColor: theme.bgInput,
                color: theme.textPrimary,
                border: `2px solid ${lookupMode === "npcs" ? theme.colorTeal : theme.colorPurple}`,
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
            {lookupSearching && <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: theme.colorTeal }}>Searching...</p>}
            {lookupError && (
              <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: theme.colorDanger }}>
                Search error: {lookupError}
              </p>
            )}
            {!lookupSearching && !lookupError && lookupMode === "npcs" && lookupResults.length > 0 && (
              <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: theme.textMuted }}>
                Found {lookupResults.length} unique NPC(s)
              </p>
            )}
            {!lookupSearching && !lookupError && lookupMode === "variants" && variantSearchResults.length > 0 && (
              <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: theme.textMuted }}>
                Found {variantSearchResults.length} NPC(s) with variants
              </p>
            )}
          </div>

          {/* Selected NPC Details */}
          {selectedLookupNpc && (
            <div style={{ marginBottom: "15px", padding: "15px", backgroundColor: theme.bgLight, borderRadius: "6px", border: `1px solid ${theme.colorSuccess}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <h3 style={{ margin: 0, color: theme.colorSuccess, fontSize: "14px", fontWeight: 600 }}>{selectedLookupNpc.name}</h3>
                <button
                  onClick={() => setSelectedLookupNpc(null)}
                  style={{ padding: "4px 8px", fontSize: "10px", backgroundColor: theme.colorDanger, color: theme.textPrimary, border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>

              {loadingNpcDetails ? (
                <p style={{ color: theme.textMuted }}>Loading details...</p>
              ) : (
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px", marginBottom: "15px" }}>
                    <strong style={{ color: theme.textMuted }}>NPC ID:</strong>
                    <span style={{ fontFamily: "monospace", color: theme.colorInfo }}>{selectedLookupNpc.id}</span>

                    <strong style={{ color: theme.textMuted }}>Bound Size:</strong>
                    <span>{selectedLookupNpc.bound_size ?? "N/A"} tile(s)</span>

                    {selectedLookupNpc.buffer_hash && (
                      <>
                        <strong style={{ color: theme.textMuted }}>Buffer Hash:</strong>
                        <span style={{ fontFamily: "monospace" }}>{selectedLookupNpc.buffer_hash}</span>
                      </>
                    )}

                    {selectedLookupNpc.npc_combat_level && selectedLookupNpc.npc_combat_level.length > 0 && (
                      <>
                        <strong style={{ color: theme.textMuted }}>Combat Level:</strong>
                        <span>{selectedLookupNpc.npc_combat_level.join(", ")}</span>
                      </>
                    )}
                  </div>

                  {/* Locations */}
                  <div style={{ marginTop: "10px" }}>
                    <strong style={{ display: "block", marginBottom: "8px", color: theme.textMuted }}>
                      Locations ({selectedLookupNpc.location?.length || 0}):
                    </strong>
                    {selectedLookupNpc.location && selectedLookupNpc.location.length > 0 ? (
                      <div style={{ maxHeight: "150px", overflowY: "auto", backgroundColor: theme.bgInput, padding: "8px", borderRadius: "4px" }}>
                        {selectedLookupNpc.location.map((loc, idx) => (
                          <div key={idx} style={{ padding: "4px 0", borderBottom: idx < selectedLookupNpc.location!.length - 1 ? `1px solid ${theme.borderLight}` : "none" }}>
                            <span style={{ fontFamily: "monospace", color: theme.textSecondary }}>
                              Lat: {loc.lat.toFixed(2)}, Lng: {loc.lng.toFixed(2)}
                            </span>
                            <span style={{ marginLeft: "10px", color: theme.textMuted }}>Floor: {loc.floor}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: theme.textDim }}>No locations recorded</p>
                    )}
                  </div>

                  {/* Actions */}
                  {selectedLookupNpc.actions && selectedLookupNpc.actions.length > 0 && (
                    <div style={{ marginTop: "10px" }}>
                      <strong style={{ display: "block", marginBottom: "5px", color: theme.textMuted }}>Actions:</strong>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {selectedLookupNpc.actions.map((action, idx) => {
                          const actionName = Object.values(action).find(v => v !== null);
                          return actionName ? (
                            <span key={idx} style={{ padding: "2px 8px", backgroundColor: "rgba(52, 152, 219, 0.2)", color: theme.colorInfo, borderRadius: "4px", fontSize: "11px" }}>
                              {actionName}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {lookupMode === "npcs" && lookupResults.length > 0 && !selectedLookupNpc && (
            <div>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary }}>Search Results</h3>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {lookupResults.map((group) => {
                  const first = group.entries[0];
                  return (
                    <div
                      key={first.id}
                      onClick={() => handleSelectLookupNpc(first.id)}
                      style={{
                        padding: "12px",
                        marginBottom: "8px",
                        backgroundColor: theme.bgLight,
                        borderRadius: "6px",
                        cursor: "pointer",
                        border: `1px solid ${theme.borderLight}`,
                        transition: "background-color 0.1s"
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.bgInput)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = theme.bgLight)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "13px", color: theme.textPrimary }}>{first.name}</strong>
                          <span style={{ marginLeft: "10px", color: theme.colorInfo, fontFamily: "monospace", fontSize: "11px" }}>ID: {first.id}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: theme.textMuted }}>
                          {group.entries.length} location(s)
                        </span>
                      </div>
                      {group.entries.length > 0 && (
                        <div style={{ marginTop: "6px", fontSize: "10px", color: theme.textMuted }}>
                          {group.entries.slice(0, 3).map((loc, idx) => (
                            <span key={idx} style={{ marginRight: "10px" }}>
                              ({loc.lat.toFixed(1)}, {loc.lng.toFixed(1)}) F{loc.floor}
                            </span>
                          ))}
                          {group.entries.length > 3 && <span>+{group.entries.length - 3} more</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant Search Results */}
          {lookupMode === "variants" && variantSearchResults.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 600, color: theme.textPrimary }}>
                Variant Results ({variantSearchResults.length} NPC{variantSearchResults.length !== 1 ? "s" : ""})
              </h3>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {variantSearchResults.map((npc) => (
                  <div
                    key={npc.npc_id}
                    style={{
                      padding: "12px",
                      marginBottom: "8px",
                      backgroundColor: theme.bgLight,
                      borderRadius: "6px",
                      border: `1px solid ${theme.borderLight}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: theme.textPrimary }}>{npc.npc_name}</strong>
                        <span style={{ marginLeft: "10px", color: theme.colorInfo, fontFamily: "monospace", fontSize: "11px" }}>ID: {npc.npc_id}</span>
                      </div>
                      <span style={{ padding: "2px 8px", backgroundColor: "rgba(156, 39, 176, 0.2)", color: theme.colorPurple, borderRadius: "4px", fontSize: "11px" }}>
                        {npc.variant_count} variant{npc.variant_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Primary hash */}
                    {npc.buffer_hash && (
                      <div style={{ fontSize: "10px", color: theme.textMuted, marginBottom: "6px" }}>
                        Primary: <code style={{ color: theme.colorInfo, fontFamily: "monospace" }}>{npc.buffer_hash}</code>
                      </div>
                    )}
                    {/* Variant list */}
                    {npc.variants.length > 0 && (
                      <div style={{ backgroundColor: theme.bgInput, borderRadius: "4px", padding: "6px" }}>
                        {npc.variants.map((v) => (
                          <div
                            key={v.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "4px 6px",
                              borderBottom: `1px solid ${theme.borderColor}`,
                              fontSize: "11px",
                            }}
                          >
                            <div>
                              <span style={{ color: theme.colorPurple, fontWeight: 600 }}>{v.variant_name || "Unnamed"}</span>
                              <code style={{ marginLeft: "8px", color: theme.textMuted, fontFamily: "monospace", fontSize: "10px" }}>{v.buffer_hash}</code>
                            </div>
                            <span style={{ color: theme.textDim, fontSize: "9px" }}>
                              {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {lookupQuery.length >= 2 && !lookupSearching && lookupResults.length === 0 && variantSearchResults.length === 0 && (
            <p style={{ color: theme.textMuted, textAlign: "center", padding: "20px" }}>
              No NPCs found matching "{lookupQuery}"
            </p>
          )}

          {lookupQuery.length < 2 && !selectedLookupNpc && (
            <p style={{ color: theme.textMuted, textAlign: "center", padding: "20px" }}>
              Enter at least 2 characters to search for NPCs
            </p>
          )}
        </>
      )}

      {/* Submit Buffer Hash Modal */}
      {submitModalNpc && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: theme.bgMedium,
            padding: "20px",
            borderRadius: "8px",
            width: "500px",
            maxWidth: "90%",
            maxHeight: "90vh",
            overflowY: "auto",
            border: `1px solid ${theme.borderLight}`
          }}>
            <h3 style={{ margin: "0 0 15px 0", color: theme.textPrimary }}>Link Scanned NPC to Database</h3>

            {/* Scanned NPC Info */}
            <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "rgba(52, 152, 219, 0.15)", borderRadius: "4px", fontSize: "12px", border: `1px solid ${theme.colorInfo}` }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px", color: theme.colorInfo }}>Scanned NPC:</div>
              <div style={{ color: theme.textSecondary }}><strong style={{ color: theme.textPrimary }}>Vertex Count:</strong> {submitModalNpc.vertexCount}</div>
              <div style={{ color: theme.textSecondary }}><strong style={{ color: theme.textPrimary }}>Buffer Hash:</strong> <span style={{ fontFamily: "monospace" }}>{extractBufferHashes(submitModalNpc.render).posBufferHash}</span></div>
              <div style={{ color: theme.textSecondary }}><strong style={{ color: theme.textPrimary }}>Position:</strong> ({submitModalNpc.position.x.toFixed(1)}, {submitModalNpc.position.y.toFixed(1)}, {submitModalNpc.position.z.toFixed(1)})</div>
            </div>

            {/* Selected NPC Display */}
            {selectedSearchNpc && (
              <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "rgba(39, 174, 96, 0.15)", borderRadius: "4px", border: `2px solid ${theme.colorSuccess}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "bold", color: theme.colorSuccess, fontSize: "16px" }}>{selectedSearchNpc.entries[0].name}</div>
                    <div style={{ fontSize: "12px", color: theme.textMuted }}>ID: {selectedSearchNpc.entries[0].id}</div>
                  </div>
                  <button
                    onClick={() => setSelectedSearchNpc(null)}
                    style={{ padding: "4px 8px", fontSize: "12px", backgroundColor: "rgba(231, 76, 60, 0.2)", color: theme.colorDanger, border: `1px solid ${theme.colorDanger}`, borderRadius: "4px", cursor: "pointer" }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Search by Name */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px", color: theme.textPrimary }}>
                Search NPC by Name:
              </label>
              <input
                type="text"
                value={npcSearchQuery}
                onChange={e => handleNpcSearch(e.target.value)}
                placeholder="Type NPC name to search..."
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  backgroundColor: theme.bgInput,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.borderLight}`,
                  borderRadius: "4px",
                  boxSizing: "border-box"
                }}
              />
              {npcSearching && <p style={{ margin: "5px 0 0 0", fontSize: "11px", color: theme.colorInfo }}>Searching...</p>}
            </div>

            {/* Search Results */}
            {npcSearchResults.length > 0 && !selectedSearchNpc && (
              <div style={{ marginBottom: "15px", maxHeight: "200px", overflowY: "auto", border: `1px solid ${theme.borderLight}`, borderRadius: "4px" }}>
                {npcSearchResults.map((group, idx) => {
                  const first = group.entries[0];
                  return (
                    <div
                      key={`${first.id}-${idx}`}
                      onClick={() => {
                        setSelectedSearchNpc(group);
                        setNpcSearchResults([]);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: idx < npcSearchResults.length - 1 ? `1px solid ${theme.borderColor}` : "none",
                        backgroundColor: theme.bgLight,
                        transition: "background-color 0.1s"
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.bgInput)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = theme.bgLight)}
                    >
                      <div style={{ fontWeight: "bold", color: theme.textPrimary }}>{first.name}</div>
                      <div style={{ fontSize: "11px", color: theme.textMuted }}>ID: {first.id}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual Entry (fallback) */}
            {!selectedSearchNpc && (
              <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: theme.bgLight, borderRadius: "4px", border: `1px solid ${theme.borderColor}` }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: theme.textMuted }}>
                  Or enter NPC details manually:
                </label>
                <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "3px", fontSize: "11px", color: theme.textDim }}>NPC ID *</label>
                    <input
                      type="number"
                      value={submitNpcIdInput}
                      onChange={e => setSubmitNpcIdInput(e.target.value)}
                      placeholder="e.g. 1234"
                      style={{
                        width: "100%",
                        padding: "6px",
                        fontSize: "13px",
                        backgroundColor: theme.bgInput,
                        color: theme.textPrimary,
                        border: `1px solid ${theme.borderLight}`,
                        borderRadius: "4px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", marginBottom: "3px", fontSize: "11px", color: theme.textDim }}>NPC Name *</label>
                    <input
                      type="text"
                      value={manualNpcName}
                      onChange={e => setManualNpcName(e.target.value)}
                      placeholder="e.g. Hans"
                      style={{
                        width: "100%",
                        padding: "6px",
                        fontSize: "13px",
                        backgroundColor: theme.bgInput,
                        color: theme.textPrimary,
                        border: `1px solid ${theme.borderLight}`,
                        borderRadius: "4px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: "10px", color: theme.textDim }}>
                  Tip: Get the NPC ID from the RuneScape Wiki URL (e.g., /w/Hans?id=<strong>1234</strong>)
                </p>
              </div>
            )}

            {/* Is Variant Checkbox */}
            <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: theme.bgLight, borderRadius: "4px", border: `1px solid ${theme.borderColor}` }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={submitIsVariant}
                  onChange={e => setSubmitIsVariant(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px", color: theme.textPrimary }}>Add as Variant</span>
                <span style={{ fontSize: "11px", color: theme.textMuted }}>(for NPCs with multiple appearances)</span>
              </label>
              {submitIsVariant && (
                <div style={{ marginTop: "8px" }}>
                  <input
                    type="text"
                    value={submitVariantName}
                    onChange={e => setSubmitVariantName(e.target.value)}
                    placeholder="Variant name (optional, e.g. 'male', 'female', 'dwarf')"
                    style={{
                      width: "100%",
                      padding: "6px",
                      fontSize: "12px",
                      backgroundColor: theme.bgInput,
                      color: theme.textPrimary,
                      border: `1px solid ${theme.borderLight}`,
                      borderRadius: "4px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              )}
            </div>

            {submitStatus && (
              <div style={{
                marginBottom: "15px",
                padding: "10px",
                borderRadius: "4px",
                backgroundColor: submitStatus.type === "success" ? "rgba(39, 174, 96, 0.2)" : "rgba(231, 76, 60, 0.2)",
                color: submitStatus.type === "success" ? theme.colorSuccess : theme.colorDanger,
                border: `1px solid ${submitStatus.type === "success" ? theme.colorSuccess : theme.colorDanger}`
              }}>
                {submitStatus.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setSubmitModalNpc(null);
                  setSubmitNpcIdInput("");
                  setManualNpcName("");
                  setNpcSearchQuery("");
                  setNpcSearchResults([]);
                  setSelectedSearchNpc(null);
                  setSubmitStatus(null);
                  setSubmitIsVariant(false);
                  setSubmitVariantName("");
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: theme.bgInput,
                  color: theme.textSecondary,
                  border: `1px solid ${theme.borderLight}`,
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBufferHash}
                disabled={!selectedSearchNpc && (!submitNpcIdInput || (!submitIsVariant && !manualNpcName))}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  opacity: (!selectedSearchNpc && (!submitNpcIdInput || (!submitIsVariant && !manualNpcName))) ? 0.5 : 1,
                  backgroundColor: theme.colorSuccess,
                  color: theme.textPrimary,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Button style helper (dark theme)
const buttonStyle = (bg: string) => ({
  padding: "8px 16px",
  fontSize: "14px",
  backgroundColor: bg,
  color: theme.textPrimary,
  border: "none",
  borderRadius: "4px",
  cursor: "pointer"
});

// Input style helper (dark theme)
const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  backgroundColor: theme.bgInput,
  border: `1px solid ${theme.borderLight}`,
  borderRadius: "4px",
  color: theme.textPrimary,
  fontSize: "12px",
};

// Checkbox label style
const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  color: theme.textSecondary,
  cursor: "pointer",
};
