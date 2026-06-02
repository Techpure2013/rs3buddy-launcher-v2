/**
 * Frame Cache - Extracted from ipc-handlers.ts for testability.
 *
 * Manages the shared frame cache for recordRenderCalls. All cacheable
 * calls (maxframes:1, no timeout, no texture capture) share a single
 * DLL capture promise. This prevents multiple apps from hammering the
 * DLL with redundant captures.
 *
 * Zero dependencies on Electron, native addon, or any project module.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** TTL for completed captures. Subsequent calls within this window reuse the cached result. */
export const FRAME_CACHE_TTL = 500; // ms

/** Safety timeout for DLL recordRenderCalls to prevent infinite hangs. */
export const CAPTURE_TIMEOUT_MS = 10000; // ms

// ─── Pure functions ─────────────────────────────────────────────────────────

/** Wrap a promise with a labeled timeout. Rejects if the promise doesn't settle within `ms`. */
export function withCaptureTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(label
        ? `${label} timed out after ${ms}ms`
        : `recordRenderCalls timed out`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Check if a recordRenderCalls request can use the frame cache.
 * Non-cacheable: multi-frame, explicit timeout, texturecapture, texturesnapshot.
 */
export function isCacheable(options?: { maxframes?: number; timeout?: number; features?: string[] }): boolean {
  const maxframes = options?.maxframes ?? 1;
  if (maxframes !== 1) return false;
  if (options?.timeout) return false;
  if (options?.features?.includes('texturecapture')) return false;
  if (options?.features?.includes('texturesnapshot')) return false;
  return true;
}

/**
 * Build a cache key for serialized results.
 * Used to avoid re-serializing ~1400 renders when the same owner makes
 * repeated calls with the same options within one frame cache window.
 */
export function getSerializedResultCacheKey(gen: number, owner: number, options?: any): string {
  const o = options || {};
  return `${gen}:${owner}:${o.programId ?? ''}:${o.vertexObjectId ?? ''}:${o.framebufferId ?? ''}:${o.framebufferTexture ?? ''}:${o.hasInput ?? ''}:${o.skipHandles ?? ''}`;
}

// ─── FrameCache class ───────────────────────────────────────────────────────

export class FrameCache {
  private _promise: Promise<any[]> | null = null;
  private _completedAt = 0; // 0 = in-flight, >0 = Date.now() timestamp
  private _features = new Set<string>();
  private _generation = 0;
  private _knownFeatures = new Set<string>();

  // Per-owner serialization caches, tied to generation.
  private _ownerCaches = new Map<number, { gen: number; cache: any }>();

  // Serialized result cache — avoids re-serializing when the same owner
  // makes repeated calls with the same options within one cache window.
  private _serializedResults = new Map<string, any[]>();

  /** Current cache generation. Increments on each new DLL capture. */
  get generation(): number { return this._generation; }

  /** Set of all features ever requested by cacheable calls. */
  get knownFeatures(): ReadonlySet<string> { return this._knownFeatures; }

  /** Whether there is an in-flight or recently completed capture. */
  get hasPendingCapture(): boolean { return this._promise !== null; }

  /**
   * Get a cached or new DLL capture. Returns the shared promise + hit flag.
   *
   * @param requestedFeatures Features needed by this caller (e.g. ['uniforms', 'vertexarray'])
   * @param captureImpl Callback that performs the actual DLL recordRenderCalls.
   *   Called only on cache miss. The returned promise is wrapped with CAPTURE_TIMEOUT_MS.
   * @param onOldCapture Optional callback to dispose old capture's renders when replaced.
   */
  getOrCreateCapture(
    requestedFeatures: string[],
    captureImpl: () => Promise<any[]>,
    onOldCapture?: (oldPromise: Promise<any[]>) => void,
  ): { promise: Promise<any[]>; hit: boolean } {
    // Learn features for future captures
    for (const f of requestedFeatures) this._knownFeatures.add(f);

    const hasPromise = !!this._promise;
    const featuresOk = hasPromise && requestedFeatures.every(f => this._features.has(f));
    const now = Date.now();
    const age = this._completedAt > 0 ? now - this._completedAt : -1;

    if (hasPromise && featuresOk) {
      // In-flight → always join (concurrent calls share the pending capture)
      if (this._completedAt === 0) {
        return { promise: this._promise!, hit: true };
      }
      // Completed → serve if within TTL
      if (age < FRAME_CACHE_TTL) {
        return { promise: this._promise!, hit: true };
      }
    }

    // Cache miss: new generation
    this._generation++;
    this._serializedResults.clear();

    // Notify caller about old capture for disposal
    if (this._promise && onOldCapture) {
      onOldCapture(this._promise);
    }

    // Capture with ALL known features (not just current request).
    const promise = captureImpl();

    this._promise = promise;
    this._features = new Set(this._knownFeatures);
    this._completedAt = 0; // in-flight

    // On completion: record timestamp for TTL checks.
    promise.then(() => {
      if (this._promise === promise) {
        this._completedAt = Date.now();
      }
    }).catch(() => {
      // On error (including timeout): clear cache so next call retries
      if (this._promise === promise) {
        this._promise = null;
        this._features = new Set();
        this._completedAt = 0;
      }
    });

    return { promise, hit: false };
  }

  /**
   * Get or create a per-owner serialization cache, tied to the current generation.
   * Caches are invalidated when the generation changes (new DLL capture).
   */
  getOwnerSerializationCache<T>(owner: number, factory: () => T): T {
    const existing = this._ownerCaches.get(owner);
    if (existing && existing.gen === this._generation) return existing.cache as T;
    const cache = factory();
    this._ownerCaches.set(owner, { gen: this._generation, cache });
    return cache;
  }

  /** Get a cached serialized result by key. */
  getSerializedResult(key: string): any[] | undefined {
    return this._serializedResults.get(key);
  }

  /** Store a serialized result. */
  setSerializedResult(key: string, result: any[]): void {
    this._serializedResults.set(key, result);
  }

  /** Clear all serialized results (called on generation change). */
  clearSerializedResults(): void {
    this._serializedResults.clear();
  }

  /** Diagnostic state for logging/debugging. */
  diagnosticState(): { generation: number; hasPending: boolean; completedAt: number; featureCount: number; knownFeatureCount: number } {
    return {
      generation: this._generation,
      hasPending: this._promise !== null,
      completedAt: this._completedAt,
      featureCount: this._features.size,
      knownFeatureCount: this._knownFeatures.size,
    };
  }
}
