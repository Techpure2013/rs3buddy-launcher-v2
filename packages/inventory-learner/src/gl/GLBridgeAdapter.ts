/**
 * GLBridge Adapter
 *
 * Bridges the GL layer to the inventory learner's detection system.
 * Implements the GLBridge interface for tooltip detection and item learning.
 */

import * as patchrs from './patchrs_napi';
import { AtlasTracker, getUIState, type RenderRect as RS3RenderRect } from './reflect2d';
import { SpriteCache, type SpriteInfo as RS3SpriteInfo } from './spritecache';

// Types for the detection system
export type RGBAColor = [number, number, number, number];

export interface FontCharInfo {
  chr: string;
  charcode?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface KnownSprite {
  id: number;
  subId?: number;
  fontchr?: FontCharInfo;
  name?: string;
  font?: any;
}

export interface SpriteInfo {
  hash: number;
  known?: KnownSprite;
  // Raw texture data for pHash computation (preserved from GL layer)
  basetex?: any;
  texX?: number;
  texY?: number;
  texWidth?: number;
  texHeight?: number;
}

export interface RenderRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: RGBAColor;
  sprite: SpriteInfo;
}

export interface RenderRecordOptions {
  texturesnapshot?: boolean;
  vertexarray?: boolean;
  uniforms?: boolean;
  maxframes?: number;
}

export interface UIState {
  elements: RenderRect[];
  atlasTracker: AtlasTracker;
}

export interface GLBridge {
  recordRenderCalls(options: RenderRecordOptions): Promise<patchrs.RenderInvocation[]>;
  getUIState(renders: patchrs.RenderInvocation[]): UIState;
  capturePixels(textureId: number, x: number, y: number, width: number, height: number): Promise<Uint8Array>;
  getUIScale(): number;
}


/**
 * Adapter that implements GLBridge using the reflect2d system
 */
export class GLBridgeAdapter implements GLBridge {
  private spriteCache: SpriteCache;
  private atlasTracker: AtlasTracker;
  private uiScale: number = 1;

  constructor(spriteCache: SpriteCache) {
    this.spriteCache = spriteCache;
    this.atlasTracker = new AtlasTracker(spriteCache);
  }

  /**
   * Record render calls from the current frame
   */
  async recordRenderCalls(options: RenderRecordOptions): Promise<patchrs.RenderInvocation[]> {
    type FeatureType = "vertexarray" | "uniforms" | "textures" | "texturesnapshot" | "texturecapture" | "computebindings" | "framebuffer" | "full";
    const features: FeatureType[] = [];
    if (options.texturesnapshot) features.push('texturesnapshot');
    if (options.vertexarray) features.push('vertexarray');
    if (options.uniforms) features.push('uniforms');

    const renders = await patchrs.native.recordRenderCalls({
      features,
      maxframes: options.maxframes ?? 1,
    });
    return renders;
  }

  /**
   * Get UI elements from render data
   * Converts RS3 RenderRect format to our format
   */
  getUIState(renders: patchrs.RenderInvocation[]): UIState {
    const rs3State = getUIState(renders, this.atlasTracker);
    const elements = rs3State.elements.map(el => this.convertRenderRect(el));

    return {
      elements,
      atlasTracker: this.atlasTracker,
    };
  }

  /**
   * Convert RS3 RenderRect to our RenderRect format
   */
  private convertRenderRect(rs3Rect: RS3RenderRect): RenderRect {
    const sprite = rs3Rect.sprite;
    const known = sprite.known;

    const rawSprite = sprite as any;
    const spriteInfo: SpriteInfo = {
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
    const color: RGBAColor = [
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
  async capturePixels(
    textureId: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Uint8Array> {
    console.warn("[GLBridgeAdapter] capturePixels not fully implemented");
    return new Uint8Array(width * height * 4);
  }

  /**
   * Get current UI scale factor
   */
  getUIScale(): number {
    return this.uiScale;
  }

  /**
   * Set UI scale factor (call when detected or configured)
   */
  setUIScale(scale: number): void {
    this.uiScale = scale;
  }

  private screenMouseAvailable = false;
  private electronScreen: any = null;

  /**
   * Initialize mouse position tracking.
   * Priority 1: Overlay API (via launcher preload or Electron IPC)
   * Priority 2: Electron screen API + RS3 window position (standalone mode)
   * Returns true if any mouse source is available.
   */
  async initMouseTracking(): Promise<boolean> {
    // Check overlay API (set up by launcher preload via contextBridge proxy)
    if (patchrs.native.overlay?.getMousePosition) {
      console.log('[GLBridgeAdapter] Mouse tracking via overlay API: available');
      return true;
    }

    // Also check root-level getMousePosition (proxy compatibility)
    if ((patchrs.native as any).getMousePosition) {
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
  getMousePositionGL(debug: boolean = false): { x: number; y: number } | null {
    // Priority 1: Overlay API
    try {
      const clientPos = patchrs.native.overlay?.getMousePosition();
      if (clientPos) {
        const viewportHeight = patchrs.native.getRsHeight() || 0;
        if (viewportHeight <= 0) return null;

        const glX = clientPos.x;
        const glY = viewportHeight - clientPos.y;

        if (debug) {
          console.log(`[MouseTrack] Overlay: Client(${clientPos.x}, ${clientPos.y}) -> GL(${glX}, ${glY})`);
        }

        if (glX < -10 || glY < -10 || glX > 10000 || glY > 10000) return null;
        return { x: glX, y: glY };
      }
    } catch (e) {
      if (debug) console.warn('[MouseTrack] Overlay error:', e);
    }

    // Priority 2: Electron screen cursor + RS3 window position
    if (this.screenMouseAvailable && this.electronScreen) {
      try {
        const cursor = this.electronScreen.getCursorScreenPoint();
        if (!cursor || typeof cursor.x !== 'number') return null;

        const rsX = patchrs.native.getRsX();
        const rsY = patchrs.native.getRsY();
        const rsWidth = patchrs.native.getRsWidth();
        const rsHeight = patchrs.native.getRsHeight();

        if (rsWidth <= 0 || rsHeight <= 0) return null;

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
      } catch (e) {
        if (debug) console.warn('[MouseTrack] Screen cursor error:', e);
      }
    }

    if (debug) console.log('[MouseTrack] No mouse position available');
    return null;
  }

  /**
   * Stop mouse tracking (cleanup)
   */
  stopMouseTracking(): void {
    this.screenMouseAvailable = false;
    this.electronScreen = null;
  }

  /**
   * Get the underlying sprite cache for direct access
   */
  getSpriteCache(): SpriteCache {
    return this.spriteCache;
  }

  /**
   * Get the atlas tracker for direct access
   */
  getAtlasTracker(): AtlasTracker {
    return this.atlasTracker;
  }

  /**
   * Get item name from pHash (16-char hex string)
   */
  getItemByPHash(pHash: string): string | null {
    return this.spriteCache.getItemByPHash(pHash);
  }

  /**
   * Find item by pHash with fuzzy matching
   */
  findItemByPHash(pHash: string, threshold: number = 10): { name: string; distance: number; pHash: string } | null {
    return this.spriteCache.findItemByPHash(pHash, threshold);
  }
}

/**
 * Create a GLBridge adapter with initialized sprite cache
 */
export async function createGLBridge(): Promise<GLBridgeAdapter> {
  const spriteCache = new SpriteCache();
  await spriteCache.downloadCacheData();
  return new GLBridgeAdapter(spriteCache);
}
