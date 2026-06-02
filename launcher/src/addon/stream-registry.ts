/**
 * StreamRegistry - Tracks active streamRenderCalls streams per window.
 *
 * Each stream is owned by a webContentsId. When stream data arrives from
 * the native addon callback, the registry routes it to the correct renderer
 * via webContents.send(). Enforces a per-window stream limit to prevent abuse.
 */

import * as crypto from 'crypto';
import type { WebContents } from 'electron';
import type { StreamRenderObject, RecordRenderOptions } from '../inject';
import { IpcChannels } from './types';
import type { SerializedRenderInvocation } from './types';
import { serializeRenderInvocationForStream } from './serializers';
import type { HandleStore } from './handle-store';

const MAX_STREAMS_PER_WINDOW = 5;

interface StreamEntry {
  streamId: string;
  ownerId: number;  // webContentsId
  stream: StreamRenderObject;
  webContents: WebContents;
  /** Persisted across frames — program serialization is stable within a session,
   *  so caching across callbacks avoids re-serializing the same shader source strings. */
  programCache: Map<number, any>;
}

export class StreamRegistry {
  private streams = new Map<string, StreamEntry>();
  private ownerIndex = new Map<number, Set<string>>();

  /**
   * Start a new stream. Creates the native streamRenderCalls and registers it.
   * Returns the streamId or throws if the limit is exceeded.
   */
  start(
    addon: { streamRenderCalls: (options: RecordRenderOptions, callback: (renders: any[]) => void) => StreamRenderObject },
    options: RecordRenderOptions,
    webContents: WebContents,
    store: HandleStore,
  ): string {
    const ownerId = webContents.id;

    // Enforce per-window limit. If limit is hit, close all existing streams for
    // this owner first — they're likely orphaned from a previous page load/reload.
    const ownerStreams = this.ownerIndex.get(ownerId);
    if (ownerStreams && ownerStreams.size >= MAX_STREAMS_PER_WINDOW) {
      console.log(`[StreamRegistry] Stream limit reached for owner ${ownerId}, closing ${ownerStreams.size} orphaned streams`);
      this.closeForOwner(ownerId);
    }

    const streamId = crypto.randomUUID();

    // NEVER register sampler handles for streams. In the old preload (direct addon),
    // stream callbacks ran in the renderer — the app called capture() synchronously
    // within the callback, and JS GC freed objects immediately after. In the IPC
    // architecture, captures happen asynchronously via round-trip IPC. By the time the
    // renderer tries to capture(), the DLL's shared memory is already consumed by the
    // next frame's data. At 50Hz, registering handles also accumulates ~25k native
    // objects (5s TTL × 50fps × ~100 textures), preventing DLL memory reclamation
    // and triggering CAPTURE_MIN_FREE failures.
    const needsSamplerHandles = false;

    // Create the native stream with a callback that serializes and forwards data
    let streamFrameCount = 0;
    const stream = addon.streamRenderCalls(options, (renders) => {
      const entry = this.streams.get(streamId);
      if (!entry || entry.webContents.isDestroyed()) {
        // Window gone - close the stream
        this.close(streamId);
        return;
      }

      streamFrameCount++;
      // Diagnostic: log native render count every ~10 frames
      if (streamFrameCount % 10 === 1 || renders.length === 0) {
        console.log(`[StreamRegistry] stream=${streamId.slice(0,8)} frame=${streamFrameCount} nativeRenders=${renders.length} features=${JSON.stringify(options.features)}`);
      }

      try {
        // Per-stream program cache: persists across frames since programs are stable
        // within a session. Avoids re-serializing the same shader source strings on every
        // frame (~30x reduction on first frame, near-zero cost on subsequent frames).
        const serialized: SerializedRenderInvocation[] = [];
        let serializeErrors = 0;
        for (const r of renders) {
          try {
            serialized.push(serializeRenderInvocationForStream(r, store, ownerId, entry.programCache, needsSamplerHandles));
          } catch (e) {
            serializeErrors++;
            if (serializeErrors <= 3) console.warn(`[StreamRegistry] Serialize error:`, e);
          }
        }
        if (serializeErrors > 0) console.warn(`[StreamRegistry] ${serializeErrors}/${renders.length} serialize errors for ${streamId}`);
        entry.webContents.send(IpcChannels.CALLBACK_STREAM_DATA, {
          streamId,
          renders: serialized,
        });
      } catch (e) {
        console.warn(`[StreamRegistry] Failed to serialize stream data for ${streamId}:`, e);
      }

      // CRITICAL: Free native shared memory for raw RenderInvocations.
      // Streams fire every frame (~50Hz). Without disposal, each frame's
      // ~1400 RenderInvocations accumulate in shared memory, filling the
      // 512MB heap in seconds and triggering CAPTURE_MIN_FREE.
      for (const r of renders) {
        try { if (typeof r?.dispose === 'function') r.dispose(); } catch (_) {}
      }
    });

    const entry: StreamEntry = { streamId, ownerId, stream, webContents, programCache: new Map() };
    this.streams.set(streamId, entry);

    // Index by owner
    let ownerSet = this.ownerIndex.get(ownerId);
    if (!ownerSet) {
      ownerSet = new Set();
      this.ownerIndex.set(ownerId, ownerSet);
    }
    ownerSet.add(streamId);

    // Auto-cleanup when the stream ends naturally, and notify renderer
    stream.ended.then(() => {
      const entry = this.streams.get(streamId);
      if (entry && !entry.webContents.isDestroyed()) {
        entry.webContents.send(IpcChannels.CALLBACK_STREAM_ENDED, { streamId });
      }
      this.remove(streamId);
    }).catch(() => {
      const entry = this.streams.get(streamId);
      if (entry && !entry.webContents.isDestroyed()) {
        entry.webContents.send(IpcChannels.CALLBACK_STREAM_ENDED, { streamId });
      }
      this.remove(streamId);
    });

    return streamId;
  }

  /** Close a stream by ID. Returns true if found and closed. */
  close(streamId: string): boolean {
    const entry = this.streams.get(streamId);
    if (!entry) return false;

    try {
      entry.stream.close();
    } catch (e) {
      // Stream may already be closed
    }

    this.remove(streamId);
    return true;
  }

  /** Close all streams owned by a specific webContentsId */
  closeForOwner(ownerId: number): number {
    const ownerSet = this.ownerIndex.get(ownerId);
    if (!ownerSet) return 0;

    const streamIds = [...ownerSet];
    let count = 0;
    for (const id of streamIds) {
      if (this.close(id)) count++;
    }
    return count;
  }

  /** Check if a stream exists and belongs to the expected owner */
  has(streamId: string, expectedOwner?: number): boolean {
    const entry = this.streams.get(streamId);
    if (!entry) return false;
    if (expectedOwner !== undefined && entry.ownerId !== expectedOwner) return false;
    return true;
  }

  /** Get active stream count */
  count(ownerId?: number): number {
    if (ownerId === undefined) return this.streams.size;
    return this.ownerIndex.get(ownerId)?.size ?? 0;
  }

  /** Close all streams */
  closeAll(): void {
    for (const entry of this.streams.values()) {
      try { entry.stream.close(); } catch { /* ignore */ }
    }
    this.streams.clear();
    this.ownerIndex.clear();
  }

  /** Remove a stream from tracking (without closing it) */
  private remove(streamId: string): void {
    const entry = this.streams.get(streamId);
    if (!entry) return;

    this.streams.delete(streamId);
    const ownerSet = this.ownerIndex.get(entry.ownerId);
    if (ownerSet) {
      ownerSet.delete(streamId);
      if (ownerSet.size === 0) {
        this.ownerIndex.delete(entry.ownerId);
      }
    }
  }
}
