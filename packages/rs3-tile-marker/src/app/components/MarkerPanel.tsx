import React, { useState } from "react";
import { IconPlus, IconTrash, IconDownload, IconUpload, IconEye, IconEyeOff, IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import { useMarkerSelector } from "../../state/useMarkerSelector";
import { useVisibleMarkers } from "../../state/useVisibleMarkers";
import { MarkerStore } from "../../state/markerStore";
import { setInstanceOffset } from "../../gl/overlayManager";

const MarkerPanel: React.FC = () => {
  const panelOpen = useMarkerSelector((s) => s.ui.panelOpen);
  const followPlayer = useMarkerSelector((s) => s.ui.followPlayer);
  const clickToAddMode = useMarkerSelector((s) => s.ui.clickToAddMode);
  const showGrid = useMarkerSelector((s) => s.ui.showGrid);
  const showOverlayGrid = useMarkerSelector((s) => s.ui.showOverlayGrid);
  const showOverlayCollision = useMarkerSelector((s) => s.ui.showOverlayCollision);
  const floor = useMarkerSelector((s) => s.selection.floor);
  const groups = useMarkerSelector((s) => s.groups);
  const activeGroupId = useMarkerSelector((s) => s.selection.activeGroupId);
  const activeGroup = useMarkerSelector((s, d) => d.activeGroup());
  const markers = useVisibleMarkers();
  const playerX = useMarkerSelector((s) => s.playerPosition?.x ?? null);
  const playerY = useMarkerSelector((s) => s.playerPosition?.y ?? null);
  const playerFloor = useMarkerSelector((s) => s.playerPosition?.floor ?? null);
  const totalMarkers = useMarkerSelector((s) => s.markers.length);
  const isInInstance = useMarkerSelector((s, d) => d.isInInstance());
  const instanceLabel = useMarkerSelector((s, d) => d.currentInstanceLabel());
  const instanceEntranceKey = useMarkerSelector((s) => s.currentInstance?.entranceKey ?? '');
  const instanceEntranceX = useMarkerSelector((s) => s.currentInstance?.entranceX ?? null);
  const instanceEntranceZ = useMarkerSelector((s) => s.currentInstance?.entranceZ ?? null);
  const instanceEntryTileX = useMarkerSelector((s) => s.currentInstance?.entryTileX ?? null);
  const instanceEntryTileZ = useMarkerSelector((s) => s.currentInstance?.entryTileZ ?? null);
  const instanceMinX = useMarkerSelector((s) => s.currentInstance?.minTileX ?? null);
  const instanceMinZ = useMarkerSelector((s) => s.currentInstance?.minTileZ ?? null);
  const instanceMaxX = useMarkerSelector((s) => s.currentInstance?.maxTileX ?? null);
  const instanceMaxZ = useMarkerSelector((s) => s.currentInstance?.maxTileZ ?? null);
  const instanceMarkerCount = useMarkerSelector((s) => s.markers.filter(m => m.instanceContext != null).length);
  const instanceMatchingCount = useMarkerSelector((s) => {
    const key = s.currentInstance?.entranceKey;
    if (!key) return 0;
    return s.markers.filter(m => m.instanceContext?.entranceKey === key).length;
  });
  const storedEntranceKeys = useMarkerSelector((s) => {
    const keys = new Set<string>();
    for (const m of s.markers) {
      if (m.instanceContext?.entranceKey) keys.add(m.instanceContext.entranceKey);
    }
    return Array.from(keys).join(' | ') || '(none)';
  });

  const [newGroupName, setNewGroupName] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [showMarkerList, setShowMarkerList] = useState(false);
  const [instanceLabelInput, setInstanceLabelInput] = useState("");

  if (!panelOpen) return null;

  const handleFloorChange = (newFloor: number) => {
    MarkerStore.setSelection({ floor: newFloor });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    MarkerStore.addGroup(newGroupName.trim());
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
      MarkerStore.updateGroup(activeGroup.id, { name: editGroupName.trim() });
    }
    setEditingGroup(false);
    setEditGroupName("");
  };

  const cancelEditingGroup = () => {
    setEditingGroup(false);
    setEditGroupName("");
  };

  const handleExport = () => {
    const data = MarkerStore.exportMarkers();
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
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          // Direct marker array
          MarkerStore.importMarkers(data);
        } else if (data.meshMappings || (data.offset && data.offset.dLng !== undefined)) {
          // Instance Tile Mapper JSON — store mesh mappings for auto-offset
          if (data.meshMappings && data.meshMappings.length > 0) {
            MarkerStore.setMeshMappings(data.meshMappings);
            console.log(`[MarkerPanel] Loaded ${data.meshMappings.length} mesh→public mappings`);
          }

          // Also store legacy offset if present (valid for current session only)
          const off = data.offset ? { dLng: data.offset.dLng, dLat: data.offset.dLat } : null;
          if (off) {
            setInstanceOffset(off);
            console.log(`[MarkerPanel] Legacy offset loaded: dLng=${off.dLng}, dLat=${off.dLat}`);
          }

          // Save entrance tiles as known instances (for auto-offset on re-entry)
          const pubRef = data.publicReference
            ? { x: data.publicReference.lng, y: data.publicReference.lat }
            : null;
          if (data.entranceTiles && Array.isArray(data.entranceTiles) && off) {
            for (const tile of data.entranceTiles) {
              const entranceKey = `${tile.lng},${tile.lat}`;
              MarkerStore.saveKnownInstance(entranceKey, 0, 0, '', off, pubRef);
            }
            console.log(`[MarkerPanel] Saved ${data.entranceTiles.length} entrance tile(s) with offset + publicRef`);
          }

          // Create tile markers from captured mesh chunks
          const markers: any[] = [];
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
            MarkerStore.importMarkers(markers);
            console.log(`[MarkerPanel] Created ${markers.length} markers from mesh data`);
          }

          // Set floor to match the offset data
          if (data.floor !== undefined) {
            MarkerStore.setSelection({ floor: data.floor });
          }
        }
      } catch (err) {
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
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        console.log("[MarkerPanel] Offset file keys:", Object.keys(data));

        // Try multiple formats
        let off: { dLng: number; dLat: number } | null = null;
        if (data.offset && typeof data.offset.dLng === 'number') {
          off = { dLng: data.offset.dLng, dLat: data.offset.dLat };
        } else if (typeof data.dLng === 'number') {
          off = { dLng: data.dLng, dLat: data.dLat };
        }

        if (off) {
          setInstanceOffset(off);
          console.log(`[MarkerPanel] Instance offset loaded: dLng=${off.dLng}, dLat=${off.dLat}`);

          // Save entrance tiles as known instances
          const pubRef2 = data.publicReference
            ? { x: data.publicReference.lng, y: data.publicReference.lat }
            : null;
          if (data.entranceTiles && Array.isArray(data.entranceTiles)) {
            for (const tile of data.entranceTiles) {
              const entranceKey = `${tile.lng},${tile.lat}`;
              MarkerStore.saveKnownInstance(entranceKey, 0, 0, '', off, pubRef2);
            }
            console.log(`[MarkerPanel] Saved ${data.entranceTiles.length} entrance tile(s) with offset + publicRef`);
          }
        } else {
          console.warn("[MarkerPanel] No offset found in file. Data:", JSON.stringify(data).substring(0, 200));
        }
      } catch (err) {
        console.error("Failed to import offset:", err);
      }
    };
    input.click();
  };

  const handleClearOffset = () => {
    setInstanceOffset(null);
  };

  return (
    <div className="marker-panel marker-panel-compact">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">Tile Markers</span>
        <span className="marker-count-header">{markers.length}/{totalMarkers}</span>
      </div>

      {/* Player Position */}
      {playerX !== null && playerY !== null && (
        <div className="player-coords-compact">
          {playerX}, {playerY} F{playerFloor ?? 0}
        </div>
      )}

      {/* Instance Indicator */}
      {isInInstance && (
        <div className="instance-indicator">
          <span className="instance-badge">INSTANCE</span>
          {instanceLabel ? (
            <span className="instance-label">{instanceLabel}</span>
          ) : instanceEntranceKey ? (
            <div className="instance-label-form">
              <input
                type="text"
                className="compact-input"
                placeholder="Name this instance..."
                value={instanceLabelInput}
                onChange={(e) => setInstanceLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && instanceLabelInput.trim()) {
                    MarkerStore.labelCurrentInstance(instanceLabelInput.trim());
                    setInstanceLabelInput("");
                  }
                  if (e.key === "Escape") setInstanceLabelInput("");
                }}
                autoFocus
              />
              <button
                className="compact-btn"
                onClick={() => {
                  if (instanceLabelInput.trim()) {
                    MarkerStore.labelCurrentInstance(instanceLabelInput.trim());
                    setInstanceLabelInput("");
                  }
                }}
                title="Save instance name"
              >
                <IconCheck size={12} />
              </button>
            </div>
          ) : (
            <span className="instance-detecting">Detecting...</span>
          )}
        </div>
      )}

      {/* Instance Debug Info */}
      {isInInstance && (
        <div className="instance-debug" style={{ fontSize: '10px', padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', margin: '4px 8px', fontFamily: 'monospace', color: '#aaa' }}>
          <div style={{ color: '#ff0', fontWeight: 'bold', marginBottom: '2px' }}>Instance Debug</div>
          <div>Entrance: ({instanceEntranceX}, {instanceEntranceZ})</div>
          <div>Entry Tile: ({instanceEntryTileX}, {instanceEntryTileZ})</div>
          <div>Bounds: ({instanceMinX},{instanceMinZ}) - ({instanceMaxX},{instanceMaxZ})</div>
          <div>Entrance Key: {instanceEntranceKey || '(none)'}</div>
          <div>Stored Keys: {storedEntranceKeys}</div>
          <div>Selection Floor: {floor}</div>
          <div>Player Floor: {playerFloor ?? '?'}</div>
          <div>Instance markers (total): {instanceMarkerCount}</div>
          <div>Instance markers (matching key): {instanceMatchingCount}</div>
          <div>Visible on map: {markers.length}</div>
          {markers.length > 0 && (
            <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2px' }}>
              <div style={{ color: '#0ff', fontSize: '9px' }}>Resolved marker coords:</div>
              {markers.slice(0, 5).map((m, i) => (
                <div key={i} style={{ fontSize: '9px' }}>
                  #{i}: abs=({m.x}, {m.y}) f={m.floor} {m.instanceContext ? `rel=(${m.x - (instanceEntryTileX ?? 0)}, ${m.y - (instanceEntryTileZ ?? 0)})` : 'main'}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '2px', color: '#f80' }}>
            Player at: ({playerX}, {playerY})
          </div>
        </div>
      )}

      {/* Group Row */}
      <div className="compact-section">
        <div className="compact-row">
          {showGroupForm ? (
            <>
              <input
                type="text"
                className="compact-input"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddGroup();
                  if (e.key === "Escape") setShowGroupForm(false);
                }}
                autoFocus
              />
              <button className="compact-btn" onClick={handleAddGroup} title="Add">
                <IconCheck size={12} />
              </button>
              <button className="compact-btn" onClick={() => setShowGroupForm(false)} title="Cancel">
                <IconX size={12} />
              </button>
            </>
          ) : editingGroup ? (
            <>
              <input
                type="text"
                className="compact-input"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveGroupName();
                  if (e.key === "Escape") cancelEditingGroup();
                }}
                autoFocus
              />
              <button className="compact-btn" onClick={saveGroupName} title="Save">
                <IconCheck size={12} />
              </button>
              <button className="compact-btn" onClick={cancelEditingGroup} title="Cancel">
                <IconX size={12} />
              </button>
            </>
          ) : (
            <>
              <select
                className="group-dropdown"
                value={activeGroupId || "default"}
                onChange={(e) => MarkerStore.setSelection({ activeGroupId: e.target.value })}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} {!group.visible && "(H)"}
                  </option>
                ))}
              </select>
              {activeGroup && (
                <input
                  type="color"
                  className="compact-color"
                  value={activeGroup.color}
                  onChange={(e) => MarkerStore.updateGroup(activeGroup.id, { color: e.target.value })}
                  title="Color"
                />
              )}
              <button className="compact-btn" onClick={() => setShowGroupForm(true)} title="Add Group">
                <IconPlus size={12} />
              </button>
              <button className="compact-btn" onClick={startEditingGroup} title="Rename">
                <IconPencil size={12} />
              </button>
              <button
                className="compact-btn"
                onClick={() => activeGroup && MarkerStore.toggleGroupVisibility(activeGroup.id)}
                title={activeGroup?.visible ? "Hide" : "Show"}
              >
                {activeGroup?.visible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
              </button>
              {activeGroupId !== "default" && (
                <button
                  className="compact-btn danger"
                  onClick={() => activeGroupId && MarkerStore.removeGroup(activeGroupId)}
                  title="Delete Group"
                >
                  <IconTrash size={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floor Selector */}
      <div className="compact-section">
        <div className="floor-selector compact">
          {[-1, 0, 1, 2, 3].map((f) => (
            <button
              key={f}
              className={floor === f ? "active" : ""}
              onClick={() => handleFloorChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="compact-section">
        <div className="compact-row toggles">
          <label className="compact-toggle">
            <input
              type="checkbox"
              checked={clickToAddMode}
              onChange={(e) => MarkerStore.setUi({ clickToAddMode: e.target.checked })}
            />
            <span>Add</span>
          </label>
          <label className="compact-toggle">
            <input
              type="checkbox"
              checked={followPlayer}
              onChange={(e) => MarkerStore.setUi({ followPlayer: e.target.checked })}
            />
            <span>Follow</span>
          </label>
          <label className="compact-toggle">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => MarkerStore.setUi({ showGrid: e.target.checked })}
            />
            <span>Grid</span>
          </label>
        </div>
      </div>

      {/* GL Overlay Toggles */}
      <div className="compact-section">
        <div className="compact-row toggles">
          <label className="compact-toggle">
            <input
              type="checkbox"
              checked={showOverlayGrid}
              onChange={(e) => MarkerStore.setUi({ showOverlayGrid: e.target.checked })}
            />
            <span>GL Grid</span>
          </label>
          <label className="compact-toggle">
            <input
              type="checkbox"
              checked={showOverlayCollision}
              onChange={(e) => MarkerStore.setUi({ showOverlayCollision: e.target.checked })}
            />
            <span>Collision</span>
          </label>
        </div>
      </div>

      {/* Marker List Toggle */}
      <div className="compact-section">
        <button
          className="compact-btn-full"
          onClick={() => setShowMarkerList(!showMarkerList)}
        >
          {showMarkerList ? "Hide" : "Show"} Markers ({markers.length})
        </button>
        {showMarkerList && markers.length > 0 && (
          <div className="marker-list-compact">
            {markers.map((marker) => (
              <div key={marker.id} className="marker-item-compact">
                <div
                  className="color-dot-small"
                  style={{ backgroundColor: marker.color }}
                />
                <span className="coords-compact">
                  {marker.x}, {marker.y}
                </span>
                <button
                  className="compact-btn danger"
                  onClick={() => MarkerStore.removeMarker(marker.id)}
                  title="Delete"
                >
                  <IconTrash size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="compact-section">
        <div className="compact-row actions">
          <button className="compact-btn-action" onClick={handleExport} title="Export">
            <IconDownload size={12} /> Export
          </button>
          <button className="compact-btn-action" onClick={handleImport} title="Import markers or offset">
            <IconUpload size={12} /> Import
          </button>
          <button className="compact-btn-action" onClick={handleImportOffset} title="Load instance offset from Instance Tile Mapper">
            <IconUpload size={12} /> Offset
          </button>
          <button className="compact-btn-action" onClick={handleClearOffset} title="Clear instance offset">
            <IconX size={12} /> Clr Offset
          </button>
          <button
            className="compact-btn-action danger"
            onClick={() => MarkerStore.clearMarkers(floor, activeGroupId)}
            title="Clear markers on this floor"
          >
            <IconTrash size={12} /> Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkerPanel;
