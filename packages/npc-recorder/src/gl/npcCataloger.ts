/**
 * NPC Cataloger - Build a database of NPC vertex counts mapped to IDs and names
 *
 * Workflow:
 * 1. Scan NPCs within a radius of the player
 * 2. Present each NPC for identification
 * 3. User inputs NPC ID and name
 * 4. Save to npcVertexList.json
 */

import * as patchrs from "./patchrs_napi";
import { NpcOverlay, NpcMesh, NpcMeshGroup, NpcFilter } from "./npcOverlay";
import { extractGroupedHashes, computeCombinedHash } from "../types/npcBufferHash";

/** Wrap async functions to capture and log stack traces on error */
function wrapWithStackTrace<T extends (...args: any[]) => Promise<any>>(fn: T, name: string): T {
  return (async (...args: any[]) => {
    const callStack = new Error().stack; // Capture stack at call time
    try {
      return await fn(...args);
    } catch (e: any) {
      console.error(`\n========== ERROR IN ${name} ==========`);
      console.error("Error:", e?.message || e);
      console.error("\n--- Call Stack (where the function was called from) ---");
      console.error(callStack);
      console.error("\n--- Error Stack (where the error was thrown) ---");
      console.error(e?.stack || "No stack available");
      console.error("==========================================\n");
      throw e;
    }
  }) as T;
}

/** Log detailed RS hook status */
function logRsHookStatus(context: string): void {
  try {
    const ready = patchrs.native.getRsReady();
    const width = patchrs.native.getRsWidth();
    const height = patchrs.native.getRsHeight();
    const renderer = patchrs.native.getRenderer();
    const glStats = patchrs.native.debug.getGlObjectStats();

    console.log(`[RS Hook Status - ${context}]`);
    console.log(`  Ready: ${ready}`);
    console.log(`  Window: ${width}x${height}`);
    console.log(`  Renderer: ${renderer ? `${renderer.glRenderer} (${renderer.glVendor})` : 'null'}`);
    console.log(`  GL Objects: ${glStats ? `count=${glStats.count}, size=${glStats.size}` : 'null'}`);
    if (glStats?.counts) {
      console.log(`  GL Object counts:`, glStats.counts);
    }

    // Check for RS process
    const pids = patchrs.native.debug.getExePids("rs2client.exe");
    console.log(`  RS Client PIDs: ${pids.length > 0 ? pids.join(', ') : 'none found'}`);
  } catch (e) {
    console.error(`[RS Hook Status - ${context}] Error getting status:`, e);
  }
}

/** Clean up memory to prevent chunk exhaustion */
async function cleanupMemory(): Promise<void> {
  try {
    const statsBefore = patchrs.native.debug.getGlObjectStats();
    if (statsBefore) {
      const freedCount = statsBefore.count;
      const freedSize = (statsBefore.size / 1024 / 1024).toFixed(2);
      console.log(`[NpcCataloger] Cleaning up GL: ${freedCount} objects, ${freedSize}MB`);
      if (statsBefore.counts && Object.keys(statsBefore.counts).length > 0) {
        console.log(`  Object types:`, statsBefore.counts);
      }
    }

    await patchrs.native.debug.resetOpenGlState();

    const statsAfter = patchrs.native.debug.getGlObjectStats();
    if (statsAfter && statsBefore) {
      const freed = statsBefore.count - statsAfter.count;
      const freedMB = ((statsBefore.size - statsAfter.size) / 1024 / 1024).toFixed(2);
      console.log(`[NpcCataloger] Freed ${freed} objects (${freedMB}MB)`);
    }
  } catch (e) {
    console.error("[NpcCataloger] Error during memory cleanup:", e);
  }
}

/** Check if RS process is hooked - if not, memory exhaustion likely occurred */
async function ensureRsHooked(): Promise<boolean> {
  try {
    const ready = patchrs.native.getRsReady();

    if (!ready) {
      console.error("[NpcCataloger] RS process not ready - memory exhaustion likely occurred!");
      console.error("[NpcCataloger] The app needs to be restarted to recover.");
      logRsHookStatus("connection lost");
      return false;
    }
    return true;
  } catch (e) {
    console.error("[NpcCataloger] Error checking RS process:", e);
    logRsHookStatus("error state");
    return false;
  }
}

/** Entry in the NPC vertex list */
export interface NpcVertexEntry {
  /** Vertex count of the NPC mesh */
  vertexCount: number;
  /** RuneScape NPC ID */
  npcId: number;
  /** NPC name */
  name: string;
  /** Optional notes */
  notes?: string;
  /** When this entry was added */
  addedAt: string;
}

/** The full NPC vertex list structure */
export interface NpcVertexList {
  version: number;
  lastUpdated: string;
  entries: NpcVertexEntry[];
}

/** NPC group pending identification (uses combined hash) */
export interface PendingNpcGroup {
  group: NpcMeshGroup;
  distance: number;
}

/**
 * NPC Cataloger class - helps build a database of NPC vertex counts
 */
export class NpcCataloger {
  private overlay: NpcOverlay;
  private vertexList: NpcVertexList;
  private currentHighlightHandle: patchrs.GlOverlay | null = null;
  private scanCount: number = 0;

  constructor() {
    this.overlay = new NpcOverlay();
    this.vertexList = this.loadVertexList();
  }

  /** Clean up GL memory - call this periodically or when memory issues occur */
  async cleanup(): Promise<void> {
    await cleanupMemory();
  }

  /** Log current RS hook status */
  logStatus(context: string = "manual"): void {
    logRsHookStatus(context);
  }

  /** Load existing vertex list from localStorage or create new */
  private loadVertexList(): NpcVertexList {
    try {
      const stored = localStorage.getItem("npcVertexList");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("[NpcCataloger] Failed to load vertex list:", e);
    }
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      entries: [],
    };
  }

  /** Save vertex list to localStorage */
  private saveVertexList(): void {
    this.vertexList.lastUpdated = new Date().toISOString();
    localStorage.setItem("npcVertexList", JSON.stringify(this.vertexList));
  }

  /** Get the current vertex list */
  getVertexList(): NpcVertexList {
    return this.vertexList;
  }

  /** Check if a vertex count is already cataloged */
  isVertexCountCataloged(vertexCount: number): NpcVertexEntry | undefined {
    return this.vertexList.entries.find(e => e.vertexCount === vertexCount);
  }

  /**
   * Scan for NPC groups within a radius of the player (uses combined hashes)
   * @param radiusTiles - Radius in tiles (default: 5), use 0 for all visible
   */
  async scanNearbyNpcsGrouped(radiusTiles: number = 5): Promise<PendingNpcGroup[]> {
    this.scanCount++;
    console.log(`[NpcCataloger] Scan #${this.scanCount} - radius: ${radiusTiles}`);

    // Scan all NPC groups using single-frame capture
    let allGroups: NpcMeshGroup[];

    try {
      allGroups = await this.overlay.scanGrouped({
        excludeFloor: true,
        // maxMeshCount defaults to 15 - groups with >15 meshes are filtered unless they have bones
      });
    } catch (e: any) {
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
    const screenWidth = patchrs.native.getRsWidth() || 1920;
    const screenHeight = patchrs.native.getRsHeight() || 1080;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // Count how many have screenPos
    const withScreenPos = allGroups.filter(g => g.mainMesh.screenPos).length;
    console.log("[NpcCataloger] Groups with screenPos:", withScreenPos, "of", allGroups.length);

    let playerGroup: NpcMeshGroup | null = null;
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
      const seenHashes = new Set<number>();
      const dedupedGroups: PendingNpcGroup[] = [];
      for (const pending of sortedGroups) {
        const combined = computeCombinedHash(pending.group.renders);
        if (combined.num === 0) {
          // No valid hash, include it anyway (might be incomplete capture)
          dedupedGroups.push(pending);
        } else if (!seenHashes.has(combined.num)) {
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
      const seenHashes = new Set<number>();
      const dedupedGroups: PendingNpcGroup[] = [];
      for (const pending of allPending) {
        const combined = computeCombinedHash(pending.group.renders);
        if (combined.num === 0) {
          dedupedGroups.push(pending);
        } else if (!seenHashes.has(combined.num)) {
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
    const nearbyGroups: PendingNpcGroup[] = [];

    for (const group of allGroups) {
      // Skip the player
      if (group.mainMesh.vaoId === playerGroup.mainMesh.vaoId) continue;

      // Calculate distance in tiles
      const dx = group.position.x - playerPos.x;
      const dz = group.position.z - playerPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Skip if outside radius
      if (distance > radiusTiles) continue;

      nearbyGroups.push({
        group,
        distance,
      });
    }

    console.log("[NpcCataloger] After radius filter:", nearbyGroups.length, "groups within", radiusTiles, "tiles");

    // Sort by distance (closest first)
    nearbyGroups.sort((a, b) => a.distance - b.distance);

    // Deduplicate by combined hash (same mesh appearing at multiple positions or same entity rendered multiple times)
    const seenHashes = new Set<number>();
    const dedupedGroups: PendingNpcGroup[] = [];
    for (const pending of nearbyGroups) {
      const combined = computeCombinedHash(pending.group.renders);
      if (combined.num === 0) {
        // No valid hash, include it anyway (might be incomplete capture)
        dedupedGroups.push(pending);
      } else if (!seenHashes.has(combined.num)) {
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
  async highlightNpc(npc: NpcMesh, color?: [number, number, number, number]): Promise<patchrs.GlOverlay | null> {
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
    } catch (e) {
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
  async highlightAllVisible(radiusTiles: number = 0, maxArrows: number = 3): Promise<{ handles: patchrs.GlOverlay[]; groups: PendingNpcGroup[] }> {
    // Clear all previous overlays first to prevent memory buildup
    await this.clearAll();

    console.log("[NpcCataloger] Scanning visible NPCs...");

    const groups = await this.scanNearbyNpcsGrouped(radiusTiles);
    const handles: patchrs.GlOverlay[] = [];

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
      } catch (e) {
        console.warn("[NpcCataloger] Failed to highlight group:", e);
        break; // Stop if we encounter errors to prevent cascade
      }
    }

    console.log(`[NpcCataloger] Highlighted ${handles.length} of ${groups.length} NPCs`);
    return { handles, groups };
  }

  /** Clear current highlight */
  async clearHighlight(): Promise<void> {
    if (this.currentHighlightHandle !== null) {
      await this.overlay.stop(this.currentHighlightHandle);
      this.currentHighlightHandle = null;
    }
  }

  /** Clear all overlays */
  async clearAll(): Promise<void> {
    const activeCount = this.overlay.getActiveCount();
    console.log(`[NpcCataloger] clearAll - stopping ${activeCount} active overlays`);
    await this.overlay.stopAll();
    this.currentHighlightHandle = null;
  }

  /**
   * Add an NPC to the catalog
   */
  addEntry(vertexCount: number, npcId: number, name: string, notes?: string): void {
    // Check if already exists
    const existing = this.vertexList.entries.findIndex(e => e.vertexCount === vertexCount);

    const entry: NpcVertexEntry = {
      vertexCount,
      npcId,
      name,
      notes,
      addedAt: new Date().toISOString(),
    };

    if (existing >= 0) {
      // Update existing
      this.vertexList.entries[existing] = entry;
    } else {
      // Add new
      this.vertexList.entries.push(entry);
    }

    this.saveVertexList();
  }

  /**
   * Remove an entry from the catalog
   */
  removeEntry(vertexCount: number): boolean {
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
  exportJson(): string {
    return JSON.stringify(this.vertexList, null, 2);
  }

  /**
   * Import a vertex list from JSON
   */
  importJson(json: string): void {
    try {
      const imported = JSON.parse(json) as NpcVertexList;
      if (imported.entries && Array.isArray(imported.entries)) {
        this.vertexList = imported;
        this.saveVertexList();
      }
    } catch (e) {
      console.error("[NpcCataloger] Failed to import JSON:", e);
      throw e;
    }
  }

  /**
   * Download the vertex list as a file
   */
  downloadJson(): void {
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
  lookupByVertexCount(vertexCount: number): NpcVertexEntry | undefined {
    return this.vertexList.entries.find(e => e.vertexCount === vertexCount);
  }

  /**
   * Look up NPC info by NPC ID
   */
  lookupByNpcId(npcId: number): NpcVertexEntry | undefined {
    return this.vertexList.entries.find(e => e.npcId === npcId);
  }

  /**
   * Search entries by name
   */
  searchByName(query: string): NpcVertexEntry[] {
    const lower = query.toLowerCase();
    return this.vertexList.entries.filter(e =>
      e.name.toLowerCase().includes(lower)
    );
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
  async rescanGroupMultiFrame(
    group: NpcMeshGroup,
    frameCount: number = 6,
    frameDelay: number = 100
  ): Promise<NpcMeshGroup> {
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
  getOverlay(): NpcOverlay {
    return this.overlay;
  }

}
