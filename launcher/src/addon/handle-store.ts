/**
 * HandleStore - Maps opaque handle IDs to live C++ NAPI objects.
 *
 * Non-serializable native objects (TrackedTexture, TextureSnapshot, etc.)
 * are stored here in the main process. Renderers receive string handle IDs
 * and interact with the objects via IPC calls routed through this store.
 *
 * Handles are scoped to a webContentsId (owner) so they can be bulk-disposed
 * when a window closes. Optional auto-expire timers prevent leaks from
 * abandoned handles.
 */

import * as crypto from 'crypto';
import { HandleType } from './types';

export interface HandleEntry {
  id: string;
  type: HandleType;
  object: unknown;
  ownerId: number; // webContentsId
  createdAt: number;
  expireTimer: ReturnType<typeof setTimeout> | null;
  transient: boolean; // true = from recordRenderCalls, safe to dispose native memory
}

/** Default auto-expire durations per handle type (ms). 0 = no auto-expire. */
const AUTO_EXPIRE_MS: Record<HandleType, number> = {
  [HandleType.TrackedTexture]: 0,           // Long-lived, managed by GL state
  [HandleType.TextureSnapshot]: 300_000,    // 5min - external apps may hold snapshot refs
  [HandleType.VertexArraySnapshot]: 0,      // Created once, reused for overlays
  [HandleType.GlProgram]: 0,               // Long-lived shader programs
  [HandleType.GlOverlay]: 0,               // Active until explicitly stopped
  [HandleType.StreamRenderObject]: 0,       // Active until stream closes
  [HandleType.RenderInvocation]: 120_000,   // 2min - external apps may hold render refs
};

export class HandleStore {
  private handles = new Map<string, HandleEntry>();
  private ownerIndex = new Map<number, Set<string>>();
  /** Track native objects already cleaned up to prevent double-dispose when
   *  multiple handles reference the same underlying C++ object (e.g. after
   *  deduplicating recordRenderCalls captures). */
  private disposedObjects = new WeakSet<object>();

  // --- Transient handle sweep ---
  // Transient handles (from recordRenderCalls serialization) used to get individual
  // setTimeout timers. At DialogBoxReader's rate (~2 DIRECT calls per 150ms, ~1400
  // renders each), that created ~40k+ timers in a 2s window, choking the event loop.
  // A single periodic sweep replaces all of them.
  private transientHandles = new Set<string>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly TRANSIENT_TTL_MS = 5_000;  // 5s safety margin
  private static readonly SWEEP_INTERVAL_MS = 2_000; // sweep every 2s

  /** Register a native object and return its handle ID */
  register(object: unknown, type: HandleType, ownerId: number, transient = false): string {
    const id = crypto.randomUUID();

    const entry: HandleEntry = {
      id,
      type,
      object,
      ownerId,
      createdAt: Date.now(),
      expireTimer: null,
      transient,
    };

    if (transient) {
      // Transient handles: no per-handle timer, cleaned up by periodic sweep.
      this.transientHandles.add(id);
      this.ensureSweep();
    } else {
      // Long-lived handles: per-handle timer if configured for this type.
      const expireMs = AUTO_EXPIRE_MS[type];
      if (expireMs > 0) {
        entry.expireTimer = setTimeout(() => {
          this.dispose(id);
        }, expireMs);
      }
    }

    this.handles.set(id, entry);

    // Index by owner for bulk cleanup
    let ownerSet = this.ownerIndex.get(ownerId);
    if (!ownerSet) {
      ownerSet = new Set();
      this.ownerIndex.set(ownerId, ownerSet);
    }
    ownerSet.add(id);

    return id;
  }

  /** Start the sweep timer if not already running */
  private ensureSweep(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweepTransient(), HandleStore.SWEEP_INTERVAL_MS);
  }

  /** Dispose transient handles older than TRANSIENT_TTL_MS. Returns count disposed. */
  sweepTransient(): number {
    const cutoff = Date.now() - HandleStore.TRANSIENT_TTL_MS;
    const toDispose: string[] = [];
    for (const id of this.transientHandles) {
      const entry = this.handles.get(id);
      if (!entry) {
        toDispose.push(id); // stale reference, clean up
        continue;
      }
      if (entry.createdAt < cutoff) {
        toDispose.push(id);
      }
    }
    for (const id of toDispose) {
      this.transientHandles.delete(id);
      if (this.handles.has(id)) this.dispose(id);
    }
    // Stop sweeping when no transient handles remain
    if (this.transientHandles.size === 0 && this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    return toDispose.length;
  }

  /** Get the native object for a handle, with type and owner validation */
  get(handleId: string, expectedType?: HandleType, expectedOwner?: number): unknown | null {
    const entry = this.handles.get(handleId);
    if (!entry) return null;
    if (expectedType !== undefined && entry.type !== expectedType) return null;
    if (expectedOwner !== undefined && entry.ownerId !== expectedOwner) return null;
    return entry.object;
  }

  /** Get handle metadata without the object */
  getMeta(handleId: string): Omit<HandleEntry, 'object' | 'expireTimer'> | null {
    const entry = this.handles.get(handleId);
    if (!entry) return null;
    return { id: entry.id, type: entry.type, ownerId: entry.ownerId, createdAt: entry.createdAt, transient: entry.transient };
  }

  /** Get the full entry in a single Map lookup (hot-path optimization for invokeSync) */
  getEntry(handleId: string): HandleEntry | null {
    return this.handles.get(handleId) ?? null;
  }

  /** Dispose a single handle, running cleanup if the object supports it */
  dispose(handleId: string): boolean {
    const entry = this.handles.get(handleId);
    if (!entry) return false;

    // Clear auto-expire timer
    if (entry.expireTimer) {
      clearTimeout(entry.expireTimer);
    }

    // Remove from transient tracking (no-op if not transient)
    this.transientHandles.delete(handleId);

    // Run type-specific cleanup on the native object
    this.cleanupObject(entry);

    // Remove from indices
    this.handles.delete(handleId);
    const ownerSet = this.ownerIndex.get(entry.ownerId);
    if (ownerSet) {
      ownerSet.delete(handleId);
      if (ownerSet.size === 0) {
        this.ownerIndex.delete(entry.ownerId);
      }
    }

    return true;
  }

  /** Dispose all handles owned by a specific webContentsId */
  disposeForOwner(ownerId: number): number {
    const ownerSet = this.ownerIndex.get(ownerId);
    if (!ownerSet) return 0;

    // Copy the set since dispose() modifies it
    const handleIds = [...ownerSet];
    let count = 0;
    for (const id of handleIds) {
      if (this.dispose(id)) count++;
    }

    return count;
  }

  /** Check if a handle exists and belongs to the expected owner */
  has(handleId: string, expectedOwner?: number): boolean {
    const entry = this.handles.get(handleId);
    if (!entry) return false;
    if (expectedOwner !== undefined && entry.ownerId !== expectedOwner) return false;
    return true;
  }

  /** Get count of active handles, optionally filtered by owner or type */
  count(filter?: { ownerId?: number; type?: HandleType }): number {
    if (!filter) return this.handles.size;

    let n = 0;
    for (const entry of this.handles.values()) {
      if (filter.ownerId !== undefined && entry.ownerId !== filter.ownerId) continue;
      if (filter.type !== undefined && entry.type !== filter.type) continue;
      n++;
    }
    return n;
  }

  /** Reset auto-expire timer for a handle (e.g. after it's accessed) */
  touch(handleId: string): void {
    const entry = this.handles.get(handleId);
    if (!entry) return;

    const expireMs = AUTO_EXPIRE_MS[entry.type];
    if (expireMs > 0) {
      if (entry.expireTimer) clearTimeout(entry.expireTimer);
      entry.expireTimer = setTimeout(() => {
        this.dispose(handleId);
      }, expireMs);
    }
  }

  /** Dispose all handles of a specific type for a given owner.
   *  Used to free previous recordRenderCalls batch before creating a new one. */
  disposeByType(ownerId: number, type: HandleType): number {
    const ownerSet = this.ownerIndex.get(ownerId);
    if (!ownerSet) return 0;

    const toDispose: string[] = [];
    for (const id of ownerSet) {
      const entry = this.handles.get(id);
      if (entry && entry.type === type) toDispose.push(id);
    }
    let count = 0;
    for (const id of toDispose) {
      if (this.dispose(id)) count++;
    }
    return count;
  }

  /** Dispose only TRANSIENT handles of a specific type for a given owner.
   *  Safe for VAS: only frees recording captures, not overlay vertex arrays. */
  disposeTransientByType(ownerId: number, type: HandleType): number {
    const ownerSet = this.ownerIndex.get(ownerId);
    if (!ownerSet) return 0;

    const toDispose: string[] = [];
    for (const id of ownerSet) {
      const entry = this.handles.get(id);
      if (entry && entry.type === type && entry.transient) toDispose.push(id);
    }
    let count = 0;
    for (const id of toDispose) {
      if (this.dispose(id)) count++;
    }
    return count;
  }

  /** Dispose all handles (for testing/cleanup). Returns count disposed. */
  disposeAll(): number {
    const ids = [...this.handles.keys()];
    let count = 0;
    for (const id of ids) {
      if (this.dispose(id)) count++;
    }
    return count;
  }

  /** Get handle count breakdown by type */
  stats(): Record<string, number> {
    const result: Record<string, number> = { total: this.handles.size };
    for (const entry of this.handles.values()) {
      const typeName = HandleType[entry.type] || `unknown_${entry.type}`;
      result[typeName] = (result[typeName] || 0) + 1;
    }
    return result;
  }

  /** Run type-specific cleanup on a native object.
   *  Safe for shared objects: if another handle already disposed this native
   *  object, the WeakSet check skips the duplicate cleanup call. */
  private cleanupObject(entry: HandleEntry): void {
    try {
      const obj = entry.object as any;
      if (!obj || typeof obj !== 'object') return;
      if (this.disposedObjects.has(obj)) return; // Already cleaned up by another handle
      this.disposedObjects.add(obj);
      switch (entry.type) {
        case HandleType.TextureSnapshot:
          if (typeof obj?.dispose === 'function') obj.dispose();
          break;
        case HandleType.RenderInvocation:
          if (typeof obj?.dispose === 'function') obj.dispose();
          break;
        case HandleType.GlOverlay:
          if (typeof obj?.stop === 'function') obj.stop();
          break;
        case HandleType.StreamRenderObject:
          if (typeof obj?.close === 'function') obj.close();
          break;
        case HandleType.VertexArraySnapshot:
          // Only dispose TRANSIENT VAS (from recordRenderCalls captures).
          // Non-transient VAS (from createVertexArray for overlays) must NOT be
          // disposed — active overlays hold references and disposal causes
          // SubImage assertion failures ("subx + subwidth >= subx").
          if (entry.transient && typeof obj?.dispose === 'function') obj.dispose();
          break;
        // TrackedTexture, GlProgram: no cleanup needed (long-lived, managed by GL state)
      }
    } catch (e) {
      console.warn(`[HandleStore] Cleanup failed for ${HandleType[entry.type]} ${entry.id}:`, e);
    }
  }
}
