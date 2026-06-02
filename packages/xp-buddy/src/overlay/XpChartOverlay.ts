/**
 * XP Chart Overlay - Renders XP charts as moveable GL overlays
 * Supports 4K scaling and resolution-aware position persistence
 */

import * as patchrs from "../util/patchrs_napi";
import { getProgramMeta } from "../render/renderprogram";

// OpenGL constants
const GL_FLOAT = 0x1406;
const GL_FLOAT_VEC2 = 0x8b50;
const GL_FLOAT_VEC4 = 0x8b52;
const GL_SAMPLER_2D = 0x8b5e;
const GL_INT = 0x1404;

// Max data points for chart (fixed size for shader uniform array)
const MAX_DATA_POINTS = 64;

// Position storage key prefix
const POSITION_STORAGE_KEY_PREFIX = "xpChartOverlay:position:";

// Vertex shader for chart quad
const vertShader = `
  #version 330 core
  layout (location = 0) in vec2 aPos;
  layout (location = 1) in vec2 aUV;

  uniform vec2 uScreenSize;
  uniform vec2 uPosition;
  uniform vec2 uSize;
  uniform float uFlipY;

  out vec2 vUV;
  out vec2 vTextUV;
  out vec2 vPixelPos;

  void main() {
    vec2 scaledPos = aPos * uSize;
    vec2 screenPos = scaledPos + uPosition;
    vec2 ndc = (screenPos / uScreenSize) * 2.0 - 1.0;
    if (uFlipY > 0.5) {
      ndc.y = -ndc.y;
    }
    gl_Position = vec4(ndc, 0.0, 1.0);
    vUV = aUV;
    // For text texture: flip V when in 4K mode (uFlipY = 0) to correct orientation
    vTextUV = vec2(aUV.x, uFlipY > 0.5 ? aUV.y : 1.0 - aUV.y);
    // For chart content: flip Y pixel position in 4K mode so chart renders right-side up
    vec2 pixelPos = aPos * uSize;
    vPixelPos = vec2(pixelPos.x, uFlipY > 0.5 ? pixelPos.y : uSize.y - pixelPos.y);
  }
`;

// Fragment shader - draws chart + text texture overlay
const fragShader = `
  #version 330 core
  in vec2 vUV;
  in vec2 vTextUV;
  in vec2 vPixelPos;

  uniform vec2 uSize;           // Overlay size in pixels
  uniform vec4 uBgColor;        // Background color
  uniform vec4 uLineColor;      // Line/border color
  uniform vec4 uGridColor;      // Grid line color
  uniform float uDataPoints[${MAX_DATA_POINTS}];  // Normalized data values (0-1)
  uniform int uDataCount;       // Actual number of data points
  uniform float uCornerRadius;  // Corner radius in pixels
  uniform sampler2D uTextTex;   // Text overlay texture

  out vec4 FragColor;

  // Rounded box SDF
  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  // Line segment distance
  float lineSegmentDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec2 pixelSize = uSize;
    vec2 center = pixelSize * 0.5;
    vec2 halfSize = center;

    // Chart area margins (bottom for text info)
    float marginLeft = 6.0;
    float marginBottom = 24.0;  // Space for XP/hr and time text
    float marginTop = 6.0;
    float marginRight = 6.0;

    // Chart area size
    vec2 chartSize = vec2(pixelSize.x - marginLeft - marginRight, pixelSize.y - marginTop - marginBottom);

    // Position relative to center for rounded box
    vec2 posFromCenter = vPixelPos - center;

    // Rounded rectangle background
    float boxDist = roundedBoxSDF(posFromCenter, halfSize - 1.0, uCornerRadius);
    float boxMask = 1.0 - smoothstep(-1.0, 1.0, boxDist);

    // Border
    float borderDist = abs(boxDist) - 1.5;
    float borderMask = 1.0 - smoothstep(-1.0, 1.0, borderDist);

    // Start with background
    vec3 color = uBgColor.rgb;
    float alpha = uBgColor.a * boxMask;

    // Chart position: X from left margin, Y flipped (0 at bottom of chart)
    vec2 chartPos = vec2(
      vPixelPos.x - marginLeft,
      (pixelSize.y - marginBottom) - vPixelPos.y  // Flip Y so 0 is at bottom
    );

    bool inChart = chartPos.x >= 0.0 && chartPos.x <= chartSize.x &&
                   chartPos.y >= 0.0 && chartPos.y <= chartSize.y;

    // Draw grid lines
    if (inChart) {
      // Horizontal grid lines (3 lines)
      for (int i = 0; i <= 2; i++) {
        float gridY = chartSize.y * float(i) / 2.0;
        float gridDist = abs(chartPos.y - gridY);
        if (gridDist < 0.5) {
          color = mix(color, uGridColor.rgb, 0.3);
        }
      }

      // Vertical grid lines
      int numVertLines = max(uDataCount - 1, 4);
      for (int i = 0; i <= numVertLines; i++) {
        float gridX = chartSize.x * float(i) / float(numVertLines);
        float gridDist = abs(chartPos.x - gridX);
        if (gridDist < 0.5) {
          color = mix(color, uGridColor.rgb, 0.2);
        }
      }
    }

    // Draw the data line
    if (uDataCount >= 2) {
      float minDist = 1000.0;

      for (int i = 0; i < ${MAX_DATA_POINTS} - 1; i++) {
        if (i >= uDataCount - 1) break;

        float x0 = chartSize.x * float(i) / float(uDataCount - 1);
        float y0 = chartSize.y * uDataPoints[i];
        float x1 = chartSize.x * float(i + 1) / float(uDataCount - 1);
        float y1 = chartSize.y * uDataPoints[i + 1];

        float d = lineSegmentDist(chartPos, vec2(x0, y0), vec2(x1, y1));
        minDist = min(minDist, d);
      }

      // Line with subtle glow
      float lineWidth = 2.0;
      float lineMask = 1.0 - smoothstep(lineWidth - 0.5, lineWidth + 0.5, minDist);
      float glowMask = 1.0 - smoothstep(lineWidth, lineWidth + 6.0, minDist);

      color = mix(color, uLineColor.rgb, glowMask * 0.15);
      color = mix(color, uLineColor.rgb, lineMask);
    }

    // Apply border
    color = mix(color, uLineColor.rgb, borderMask * boxMask);

    // Sample text texture (vTextUV has correct orientation for both 1080p and 4K)
    vec4 textSample = texture(uTextTex, vTextUV);

    // Alpha blend text over chart
    color = mix(color, textSample.rgb, textSample.a);
    float finalAlpha = alpha * boxMask + textSample.a * (1.0 - alpha * boxMask);

    FragColor = vec4(color, max(alpha * boxMask, textSample.a));
  }
`;

// Simple texture-only fragment shader for expanded mode (renders pre-drawn canvas)
const fragShaderTextureOnly = `
  #version 330 core
  in vec2 vUV;
  in vec2 vTextUV;
  in vec2 vPixelPos;

  uniform vec2 uSize;
  uniform float uCornerRadius;
  uniform sampler2D uTextTex;   // Pre-rendered canvas texture

  out vec4 FragColor;

  // Rounded box SDF
  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 center = uSize * 0.5;
    vec2 posFromCenter = vPixelPos - center;

    // Rounded rectangle mask
    float boxDist = roundedBoxSDF(posFromCenter, center - 1.0, uCornerRadius);
    float boxMask = 1.0 - smoothstep(-1.0, 1.0, boxDist);

    // Sample the pre-rendered canvas texture
    vec4 texColor = texture(uTextTex, vTextUV);

    // Apply rounded corners
    FragColor = vec4(texColor.rgb, texColor.a * boxMask);
  }
`;

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface ChartRenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Data for GL chart rendering */
export interface ChartData {
  dataPoints: number[];      // Raw XP/hr values
  lineColor: [number, number, number, number];  // RGBA 0-1
  width: number;
  height: number;
  xpPerHour?: number;        // For display
  elapsedMs?: number;        // Session time
  // Optional: pre-rendered ImageData for expanded mode (bypasses GL chart rendering)
  expandedImageData?: ImageData;
}

/** UI Framebuffer info */
interface UIFramebufferInfo {
  framebufferId: number;
  width: number;
  height: number;
}

/** UI scale state */
export interface UIScaleInfo {
  isScaled: boolean;
  uiWidth: number;
  uiHeight: number;
  screenWidth: number;
  screenHeight: number;
  scaleX: number;
  scaleY: number;
  scalingTextureId: number;
}

/**
 * Format number with K/M suffix
 */
function formatXpRate(xpPerHour: number): string {
  if (xpPerHour >= 1000000) {
    return (xpPerHour / 1000000).toFixed(1) + "M";
  } else if (xpPerHour >= 1000) {
    return (xpPerHour / 1000).toFixed(1) + "K";
  }
  return Math.round(xpPerHour).toString();
}

/**
 * Format elapsed time as HH:MM:SS or MM:SS
 */
function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Create text overlay texture as ImageData
 */
function createTextOverlayImageData(
  width: number,
  height: number,
  xpPerHour: number,
  elapsedMs: number,
  lineColor: [number, number, number, number]
): ImageData {
  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Clear with transparent
  ctx.clearRect(0, 0, width, height);

  // Convert line color to brighter CSS (boost by 30%)
  const r = Math.min(255, Math.round(lineColor[0] * 255 * 1.3 + 50));
  const g = Math.min(255, Math.round(lineColor[1] * 255 * 1.3 + 50));
  const b = Math.min(255, Math.round(lineColor[2] * 255 * 1.3 + 50));
  const colorStr = `rgb(${r}, ${g}, ${b})`;

  // Draw XP/hr rate at bottom left
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = colorStr;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";
  ctx.fillText(formatXpRate(xpPerHour) + "/hr", 8, height - 6);

  // Draw elapsed time at bottom right
  ctx.font = "12px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
  ctx.textAlign = "right";
  ctx.fillText(formatElapsedTime(elapsedMs), width - 8, height - 6);

  return ctx.getImageData(0, 0, width, height);
}

// Default UI scale state
let uiScaleState: UIScaleInfo = {
  isScaled: false,
  uiWidth: 1920,
  uiHeight: 1080,
  screenWidth: 1920,
  screenHeight: 1080,
  scaleX: 1,
  scaleY: 1,
  scalingTextureId: 0,
};

/**
 * Get current UI scale info
 */
export function getUIScaleInfo(): UIScaleInfo {
  return uiScaleState;
}

/**
 * Get current UI scale state (alias for getUIScaleInfo)
 */
export function getUIScaleState(): UIScaleInfo {
  return uiScaleState;
}

/**
 * Set UI scale state from external source
 */
export function setUIScaleState(state: Partial<UIScaleInfo>): void {
  uiScaleState = { ...uiScaleState, ...state };
}

/**
 * XP Chart Overlay class
 * Renders charts as textured GL overlays that can be positioned anywhere on screen
 */
export class XpChartOverlay {
  private overlayHandle: patchrs.GlOverlay | null = null;
  private position: OverlayPosition = { x: 50, y: 50 };
  private size = { width: 300, height: 180 };
  private uiSize: { width: number; height: number } | null = null;
  private uiFramebufferInfo: UIFramebufferInfo | null = null;
  private isVisible = false;
  private textureId: number = 0;
  private program: patchrs.GlProgram | null = null;
  private programTextureOnly: patchrs.GlProgram | null = null;
  private vertexArray: patchrs.VertexArraySnapshot | null = null;
  private lastRenderResult: ChartRenderResult | null = null;
  private lastChartData: ChartData | null = null;
  private textTexture: patchrs.TrackedTexture | null = null;

  // Operation serialization to prevent race conditions
  private pendingOperation: Promise<void> | null = null;
  private operationSeq = 0;

  // Uniform buffer size for chart shader
  private static readonly UNIFORM_BUFFER_SIZE = 96 + MAX_DATA_POINTS * 4; // 352 bytes
  // Uniform buffer size for texture-only shader (simpler layout)
  private static readonly TEXTURE_UNIFORM_BUFFER_SIZE = 32; // uScreenSize(8) + uPosition(8) + uSize(8) + uFlipY(4) + uCornerRadius(4)

  constructor() {
    this.position = this.loadPosition();
    this.updateUISize();
  }

  /**
   * Stop any existing overlay synchronously - call before creating new one
   */
  private stopOverlaySync(): void {
    if (this.overlayHandle) {
      try {
        this.overlayHandle.stop();
      } catch (e) {
        console.warn("[XpChartOverlay] Error stopping overlay:", e);
      }
      this.overlayHandle = null;
    }
  }

  /**
   * Update UI size from current state
   */
  private updateUISize(): void {
    this.uiSize = {
      width: uiScaleState.uiWidth,
      height: uiScaleState.uiHeight,
    };
  }

  /**
   * Get position storage key for current resolution
   */
  private getPositionStorageKey(): string {
    const width = this.uiSize?.width ?? 1920;
    const height = this.uiSize?.height ?? 1080;
    return `${POSITION_STORAGE_KEY_PREFIX}${width}x${height}`;
  }

  /**
   * Load position from localStorage
   */
  private loadPosition(): OverlayPosition {
    try {
      const key = this.getPositionStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("[XpChartOverlay] Failed to load position:", e);
    }
    return { x: 50, y: 50 };
  }

  /**
   * Save position to localStorage
   */
  private savePosition(): void {
    try {
      const key = this.getPositionStorageKey();
      localStorage.setItem(key, JSON.stringify(this.position));
    } catch (e) {
      console.warn("[XpChartOverlay] Failed to save position:", e);
    }
  }

  /**
   * Set overlay position
   */
  setPosition(x: number, y: number): void {
    // Clamp to valid bounds
    const maxX = (this.uiSize?.width ?? 1920) - this.size.width;
    const maxY = (this.uiSize?.height ?? 1080) - this.size.height;
    this.position = {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
    this.savePosition();

    // Recreate overlay at new position if visible
    if (this.isVisible && this.lastRenderResult) {
      // Hide and re-show to ensure clean state
      this.show(this.lastRenderResult).catch(e => {
        console.warn("[XpChartOverlay] Failed to update position:", e);
      });
    }
  }

  /**
   * Get current position
   */
  getPosition(): OverlayPosition {
    return { ...this.position };
  }

  /**
   * Get overlay size
   */
  getSize(): { width: number; height: number } {
    return { ...this.size };
  }

  /**
   * Get UI bounds
   */
  getUIBounds(): { width: number; height: number } {
    return {
      width: this.uiSize?.width ?? 1920,
      height: this.uiSize?.height ?? 1080,
    };
  }

  /**
   * Update position live without recreating overlay
   */
  private updatePositionLive(): void {
    if (!this.overlayHandle || !this.isVisible) return;

    try {
      const uniformState = this.overlayHandle.getUniformState();
      const view = new DataView(uniformState.buffer, uniformState.byteOffset, uniformState.byteLength);

      // uPosition is at offset 8 (after uScreenSize which is 2 floats = 8 bytes)
      if (uiScaleState.isScaled && this.uiFramebufferInfo) {
        // 4K mode: use UI coordinates with Y flip (GL Y=0 at bottom)
        const glPositionY = this.uiFramebufferInfo.height - this.position.y - this.size.height;
        view.setFloat32(8, this.position.x, true);
        view.setFloat32(12, glPositionY, true);
      } else {
        // 1080p mode: direct screen coordinates
        view.setFloat32(8, this.position.x, true);
        view.setFloat32(12, this.position.y, true);
      }

      this.overlayHandle.setUniformState(uniformState);
    } catch (e) {
      console.warn("[XpChartOverlay] Live position update failed:", e);
    }
  }

  /**
   * Find UI framebuffer from render data
   */
  private async findUIFramebuffer(): Promise<UIFramebufferInfo | null> {
    try {
      const screenRenders = await patchrs.native.recordRenderCalls({
        maxframes: 1,
        features: ["texturesnapshot"],
        framebufferId: 0,
      });

      // Find Lanczos scaler program
      let scalingTextureId = 0;
      for (const render of screenRenders) {
        if (!render.program) continue;
        const progMeta = getProgramMeta(render.program);

        if (progMeta.isUiScaler) {
          const textureData = render.samplers || render.textures || {};
          const sampler = Object.values(textureData)[0] as patchrs.TextureSnapshot | undefined;
          if (sampler) {
            scalingTextureId = sampler.texid;
            break;
          }
        }
      }

      if (scalingTextureId > 0) {
        const uiRenders = await patchrs.native.recordRenderCalls({
          maxframes: 1,
          features: [],
          framebufferTexture: scalingTextureId,
        });

        const uiRender = uiRenders.find(r => r.viewport);
        if (uiRender?.viewport) {
          return {
            framebufferId: uiRender.framebufferId,
            width: uiRender.viewport.width,
            height: uiRender.viewport.height,
          };
        }
      }

      // Fallback: find UI program in screen renders
      for (const render of screenRenders) {
        if (!render.program) continue;
        const progMeta = getProgramMeta(render.program);

        if (progMeta.isUi && render.viewport) {
          return {
            framebufferId: render.framebufferId,
            width: render.viewport.width,
            height: render.viewport.height,
          };
        }
      }

      // Final fallback
      const viewport = screenRenders.find(r => r.viewport)?.viewport;
      if (viewport) {
        return {
          framebufferId: 0,
          width: viewport.width,
          height: viewport.height,
        };
      }

      return null;
    } catch (e) {
      console.warn("[XpChartOverlay] Failed to find UI framebuffer:", e);
      return null;
    }
  }

  /**
   * Create shader program for pure GL chart rendering
   * Uniform buffer layout:
   * - uScreenSize: vec2, offset 0
   * - uPosition: vec2, offset 8
   * - uSize: vec2, offset 16
   * - uFlipY: float, offset 24
   * - uCornerRadius: float, offset 28
   * - uBgColor: vec4, offset 32
   * - uLineColor: vec4, offset 48
   * - uGridColor: vec4, offset 64
   * - uDataCount: int, offset 80
   * - padding: 12 bytes, offset 84 (align to 16 for array)
   * - uDataPoints: float[64], offset 96
   * Total: 352 bytes
   */
  private createProgram(): patchrs.GlProgram {
    return patchrs.native.createProgram(
      vertShader,
      fragShader,
      [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 2 },
        { location: 1, name: "aUV", type: GL_FLOAT, length: 2 },
      ],
      [
        { name: "uScreenSize", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 0, snapshotSize: 8 },
        { name: "uPosition", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 8, snapshotSize: 8 },
        { name: "uSize", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 16, snapshotSize: 8 },
        { name: "uFlipY", length: 1, type: GL_FLOAT, snapshotOffset: 24, snapshotSize: 4 },
        { name: "uCornerRadius", length: 1, type: GL_FLOAT, snapshotOffset: 28, snapshotSize: 4 },
        { name: "uBgColor", length: 1, type: GL_FLOAT_VEC4, snapshotOffset: 32, snapshotSize: 16 },
        { name: "uLineColor", length: 1, type: GL_FLOAT_VEC4, snapshotOffset: 48, snapshotSize: 16 },
        { name: "uGridColor", length: 1, type: GL_FLOAT_VEC4, snapshotOffset: 64, snapshotSize: 16 },
        { name: "uDataCount", length: 1, type: GL_INT, snapshotOffset: 80, snapshotSize: 4 },
        // Padding at 84-95 (12 bytes) for 16-byte alignment
        { name: "uDataPoints", length: MAX_DATA_POINTS, type: GL_FLOAT, snapshotOffset: 96, snapshotSize: MAX_DATA_POINTS * 4 },
      ]
    );
  }

  /**
   * Create texture-only program for expanded mode (renders pre-drawn canvas)
   * Uniform buffer layout:
   * - uScreenSize: vec2, offset 0
   * - uPosition: vec2, offset 8
   * - uSize: vec2, offset 16
   * - uFlipY: float, offset 24
   * - uCornerRadius: float, offset 28
   * Total: 32 bytes
   */
  private createProgramTextureOnly(): patchrs.GlProgram {
    return patchrs.native.createProgram(
      vertShader,
      fragShaderTextureOnly,
      [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 2 },
        { location: 1, name: "aUV", type: GL_FLOAT, length: 2 },
      ],
      [
        { name: "uScreenSize", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 0, snapshotSize: 8 },
        { name: "uPosition", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 8, snapshotSize: 8 },
        { name: "uSize", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 16, snapshotSize: 8 },
        { name: "uFlipY", length: 1, type: GL_FLOAT, snapshotOffset: 24, snapshotSize: 4 },
        { name: "uCornerRadius", length: 1, type: GL_FLOAT, snapshotOffset: 28, snapshotSize: 4 },
      ]
    );
  }

  /**
   * Create vertex array for textured quad
   */
  private createVertexArray(): patchrs.VertexArraySnapshot {
    // Unit quad with UV coordinates
    const vertices = new Float32Array([
      // Position  UV
      0, 0,       0, 0,  // Top-left
      1, 0,       1, 0,  // Top-right
      1, 1,       1, 1,  // Bottom-right
      0, 1,       0, 1,  // Bottom-left
    ]);

    // CCW winding
    const indices = new Uint16Array([
      0, 3, 2,
      0, 2, 1,
    ]);

    const posBuffer = new Uint8Array(vertices.buffer);

    return patchrs.native.createVertexArray(
      new Uint8Array(indices.buffer),
      [
        {
          location: 0,
          buffer: posBuffer,
          enabled: true,
          normalized: false,
          offset: 0,
          scalartype: GL_FLOAT,
          stride: 16,
          vectorlength: 2,
        },
        {
          location: 1,
          buffer: posBuffer,
          enabled: true,
          normalized: false,
          offset: 8,
          scalartype: GL_FLOAT,
          stride: 16,
          vectorlength: 2,
        },
      ]
    );
  }

  /**
   * Build uniform buffer for chart shader
   */
  private buildUniformBuffer(chartData: ChartData): ArrayBuffer {
    const uniformBuffer = new ArrayBuffer(XpChartOverlay.UNIFORM_BUFFER_SIZE);
    const view = new DataView(uniformBuffer);

    const isScaled = uiScaleState.isScaled;
    const screenWidth = this.uiFramebufferInfo?.width ?? uiScaleState.screenWidth;
    const screenHeight = this.uiFramebufferInfo?.height ?? uiScaleState.screenHeight;

    // Use all data points (up to MAX_DATA_POINTS for shader array limit)
    // Data is already downsampled to ~60 points in index.tsx to show full session history
    const dataPoints = chartData.dataPoints.slice(0, MAX_DATA_POINTS);

    // Normalize data points to 0-1 range
    const minVal = Math.min(...dataPoints) * 0.9;
    const maxVal = Math.max(...dataPoints) * 1.1;
    const range = maxVal - minVal || 1;
    const normalizedData = dataPoints.map(v => (v - minVal) / range);

    if (isScaled && this.uiFramebufferInfo) {
      // 4K mode: render to UI framebuffer in UI coordinates (not scaled)
      // The UI framebuffer is at UI resolution (e.g., 1920x1080), not screen resolution
      // Position Y needs to be flipped for GL (Y=0 at bottom)
      const glPositionY = this.uiFramebufferInfo.height - this.position.y - this.size.height;

      view.setFloat32(0, this.uiFramebufferInfo.width, true);   // uScreenSize.x (UI resolution)
      view.setFloat32(4, this.uiFramebufferInfo.height, true);  // uScreenSize.y (UI resolution)
      view.setFloat32(8, this.position.x, true);                 // uPosition.x (UI coords)
      view.setFloat32(12, glPositionY, true);                    // uPosition.y (GL Y-flipped)
      view.setFloat32(16, this.size.width, true);                // uSize.x (UI size)
      view.setFloat32(20, this.size.height, true);               // uSize.y (UI size)
      view.setFloat32(24, 0.0, true);                            // uFlipY (no flip for UI fb)
    } else {
      // 1080p mode: use direct coordinates
      view.setFloat32(0, screenWidth, true);
      view.setFloat32(4, screenHeight, true);
      view.setFloat32(8, this.position.x, true);
      view.setFloat32(12, this.position.y, true);
      view.setFloat32(16, this.size.width, true);
      view.setFloat32(20, this.size.height, true);
      view.setFloat32(24, 1.0, true);                            // uFlipY
    }

    // uCornerRadius
    view.setFloat32(28, 8.0, true);

    // uBgColor - dark gray
    view.setFloat32(32, 30 / 255, true);   // R
    view.setFloat32(36, 30 / 255, true);   // G
    view.setFloat32(40, 35 / 255, true);   // B
    view.setFloat32(44, 0.95, true);       // A

    // uLineColor - from chart data
    view.setFloat32(48, chartData.lineColor[0], true);
    view.setFloat32(52, chartData.lineColor[1], true);
    view.setFloat32(56, chartData.lineColor[2], true);
    view.setFloat32(60, chartData.lineColor[3], true);

    // uGridColor - subtle gray
    view.setFloat32(64, 0.3, true);
    view.setFloat32(68, 0.3, true);
    view.setFloat32(72, 0.3, true);
    view.setFloat32(76, 0.4, true);

    // uDataCount
    view.setInt32(80, normalizedData.length, true);

    // Padding at 84-95

    // uDataPoints array at offset 96
    for (let i = 0; i < normalizedData.length && i < MAX_DATA_POINTS; i++) {
      view.setFloat32(96 + i * 4, normalizedData[i], true);
    }

    return uniformBuffer;
  }

  /**
   * Build uniform buffer for texture-only shader (for expanded canvas rendering)
   */
  private buildTextureUniformBuffer(): ArrayBuffer {
    const uniformBuffer = new ArrayBuffer(XpChartOverlay.TEXTURE_UNIFORM_BUFFER_SIZE);
    const view = new DataView(uniformBuffer);

    const isScaled = uiScaleState.isScaled;
    const screenWidth = this.uiFramebufferInfo?.width ?? uiScaleState.screenWidth;
    const screenHeight = this.uiFramebufferInfo?.height ?? uiScaleState.screenHeight;

    if (isScaled && this.uiFramebufferInfo) {
      // 4K mode: render to UI framebuffer in UI coordinates
      const glPositionY = this.uiFramebufferInfo.height - this.position.y - this.size.height;

      view.setFloat32(0, this.uiFramebufferInfo.width, true);   // uScreenSize.x
      view.setFloat32(4, this.uiFramebufferInfo.height, true);  // uScreenSize.y
      view.setFloat32(8, this.position.x, true);                 // uPosition.x
      view.setFloat32(12, glPositionY, true);                    // uPosition.y
      view.setFloat32(16, this.size.width, true);                // uSize.x
      view.setFloat32(20, this.size.height, true);               // uSize.y
      view.setFloat32(24, 0.0, true);                            // uFlipY
    } else {
      // 1080p mode: direct screen coordinates
      view.setFloat32(0, screenWidth, true);
      view.setFloat32(4, screenHeight, true);
      view.setFloat32(8, this.position.x, true);
      view.setFloat32(12, this.position.y, true);
      view.setFloat32(16, this.size.width, true);
      view.setFloat32(20, this.size.height, true);
      view.setFloat32(24, 1.0, true);                            // uFlipY
    }

    // uCornerRadius
    view.setFloat32(28, 6.0, true);

    return uniformBuffer;
  }

  /**
   * Show overlay with chart data (pure GL rendering)
   */
  async showChart(chartData: ChartData): Promise<void> {
    const mySeq = ++this.operationSeq;

    this.lastChartData = chartData;
    this.size = { width: chartData.width, height: chartData.height };

    this.stopOverlaySync();
    this.isVisible = false;

    // Find UI framebuffer (async)
    if (!this.uiFramebufferInfo) {
      this.uiFramebufferInfo = await this.findUIFramebuffer();
      if (mySeq !== this.operationSeq) return;
    }

    // Create vertex array if needed
    if (!this.vertexArray) {
      this.vertexArray = this.createVertexArray();
    }

    const isScaled = uiScaleState.isScaled;
    const useUIFramebuffer = isScaled && this.uiFramebufferInfo && this.uiFramebufferInfo.framebufferId > 0;

    // Check if we have pre-rendered image data (expanded mode with multi-line chart)
    if (chartData.expandedImageData) {
      // Use texture-only program for pre-rendered canvas
      if (!this.programTextureOnly) {
        this.programTextureOnly = this.createProgramTextureOnly();
      }

      const uniformBuffer = this.buildTextureUniformBuffer();
      this.textTexture = patchrs.native.createTexture(chartData.expandedImageData);

      if (mySeq !== this.operationSeq) return;
      this.stopOverlaySync();

      try {
        const filter = useUIFramebuffer
          ? { framebufferId: this.uiFramebufferInfo!.framebufferId }
          : {};

        this.overlayHandle = patchrs.native.beginOverlay(
          filter,
          this.programTextureOnly,
          this.vertexArray,
          {
            uniformSources: [],
            uniformBuffer: new Uint8Array(uniformBuffer),
            renderMode: "triangles",
            trigger: "frameend",
            alphaBlend: true,
            samplers: { 0: this.textTexture },
          }
        );
        this.isVisible = true;
        console.log(`[XpChartOverlay] Showing expanded overlay (texture mode) at (${this.position.x}, ${this.position.y}), size ${this.size.width}x${this.size.height}`);
      } catch (e) {
        console.error("[XpChartOverlay] Failed to create expanded overlay:", e);
      }
    } else {
      // Use shader-based chart program for compact mode
      if (!this.program) {
        this.program = this.createProgram();
      }

      const uniformBuffer = this.buildUniformBuffer(chartData);

      // Create text overlay texture at overlay resolution
      const textImageData = createTextOverlayImageData(
        chartData.width,
        chartData.height,
        chartData.xpPerHour ?? 0,
        chartData.elapsedMs ?? 0,
        chartData.lineColor
      );
      this.textTexture = patchrs.native.createTexture(textImageData);

      if (mySeq !== this.operationSeq) return;
      this.stopOverlaySync();

      try {
        const filter = useUIFramebuffer
          ? { framebufferId: this.uiFramebufferInfo!.framebufferId }
          : {};

        this.overlayHandle = patchrs.native.beginOverlay(
          filter,
          this.program,
          this.vertexArray,
          {
            uniformSources: [],
            uniformBuffer: new Uint8Array(uniformBuffer),
            renderMode: "triangles",
            trigger: "frameend",
            alphaBlend: true,
            samplers: { 0: this.textTexture },
          }
        );
        this.isVisible = true;
        console.log(`[XpChartOverlay] Showing GL chart at (${this.position.x}, ${this.position.y}), size ${this.size.width}x${this.size.height}, isScaled=${uiScaleState.isScaled}`);
      } catch (e) {
        console.error("[XpChartOverlay] Failed to create overlay:", e);
      }
    }
  }

  /**
   * Legacy show method - converts canvas to chart data
   * @deprecated Use showChart() instead
   */
  async show(renderResult: ChartRenderResult): Promise<void> {
    // For backwards compatibility, create a simple chart with placeholder data
    await this.showChart({
      dataPoints: [0.5],  // Single point placeholder
      lineColor: [0, 0.83, 1, 1],  // Cyan (#00d4ff)
      width: renderResult.width,
      height: renderResult.height,
    });
  }

  /**
   * Hide overlay
   */
  hide(): void {
    // Increment sequence to cancel any pending show operations
    ++this.operationSeq;
    this.stopOverlaySync();
    this.isVisible = false;
  }

  /**
   * Update chart with new data - swaps overlays to minimize flicker
   */
  async updateChart(chartData: ChartData): Promise<void> {
    this.lastChartData = chartData;

    // If not visible or no handle, just show
    if (!this.isVisible || !this.overlayHandle) {
      await this.showChart(chartData);
      return;
    }

    // Size changed - need full recreate
    if (chartData.width !== this.size.width || chartData.height !== this.size.height) {
      await this.showChart(chartData);
      return;
    }

    const isScaled = uiScaleState.isScaled;
    const useUIFramebuffer = isScaled && this.uiFramebufferInfo && this.uiFramebufferInfo.framebufferId > 0;

    // Select program and build uniform buffer based on mode
    let uniformBuffer: ArrayBuffer;
    let program: patchrs.GlProgram;

    if (chartData.expandedImageData) {
      // Texture-only mode for expanded view
      if (!this.programTextureOnly) {
        this.programTextureOnly = this.createProgramTextureOnly();
      }
      uniformBuffer = this.buildTextureUniformBuffer();
      program = this.programTextureOnly;
      this.textTexture = patchrs.native.createTexture(chartData.expandedImageData);
    } else {
      // Shader-based chart mode for compact view
      if (!this.program) {
        this.program = this.createProgram();
      }
      uniformBuffer = this.buildUniformBuffer(chartData);
      program = this.program;

      // Create text overlay texture
      const textImageData = createTextOverlayImageData(
        chartData.width,
        chartData.height,
        chartData.xpPerHour ?? 0,
        chartData.elapsedMs ?? 0,
        chartData.lineColor
      );
      this.textTexture = patchrs.native.createTexture(textImageData);
    }

    try {
      const filter = useUIFramebuffer
        ? { framebufferId: this.uiFramebufferInfo!.framebufferId }
        : {};

      const newHandle = patchrs.native.beginOverlay(
        filter,
        program,
        this.vertexArray!,
        {
          uniformSources: [],
          uniformBuffer: new Uint8Array(uniformBuffer),
          renderMode: "triangles",
          trigger: "frameend",
          alphaBlend: true,
          samplers: { 0: this.textTexture },
        }
      );

      const oldHandle = this.overlayHandle;
      this.overlayHandle = newHandle;

      if (oldHandle) {
        try {
          oldHandle.stop();
        } catch (e) {
          // Ignore
        }
      }
    } catch (e) {
      console.warn("[XpChartOverlay] Chart update failed:", e);
      await this.showChart(chartData);
    }
  }

  /**
   * Legacy update method
   * @deprecated Use updateChart() instead
   */
  async update(renderResult: ChartRenderResult): Promise<void> {
    await this.show(renderResult);
  }

  /**
   * Check if overlay is visible
   */
  isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Handle resolution change
   */
  handleResolutionChange(info: UIScaleInfo): void {
    this.uiSize = { width: info.uiWidth, height: info.uiHeight };
    this.uiFramebufferInfo = null;

    // Load position for new resolution
    this.position = this.loadPosition();

    // Clamp position to valid bounds
    const maxX = Math.max(0, info.uiWidth - this.size.width);
    const maxY = Math.max(0, info.uiHeight - this.size.height);
    this.position = {
      x: Math.max(0, Math.min(this.position.x, maxX)),
      y: Math.max(0, Math.min(this.position.y, maxY)),
    };
  }

  /**
   * Dispose overlay and cleanup
   */
  dispose(): void {
    ++this.operationSeq;  // Cancel any pending operations
    this.stopOverlaySync();
    this.isVisible = false;
    this.program = null;
    this.vertexArray = null;
    this.lastRenderResult = null;
  }
}

// Global singleton
let globalOverlay: XpChartOverlay | null = null;

export function getXpChartOverlay(): XpChartOverlay {
  if (!globalOverlay) {
    globalOverlay = new XpChartOverlay();
  }
  return globalOverlay;
}
