/**
 * DebugZoneOverlay - Draws a debug rectangle on the game screen
 * Shows the XP detection zone with a colored border and semi-transparent fill.
 */
import * as patchrs from "../util/patchrs_napi";
import { getUIScaleState, UIScaleInfo } from "./XpChartOverlay";

// OpenGL constants
const GL_FLOAT = 0x1406;
const GL_FLOAT_VEC2 = 0x8b50;
const GL_FLOAT_VEC4 = 0x8b52;

export interface DebugZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Vertex shader - screen space quad
const vertShader = `
  #version 330 core
  layout (location = 0) in vec2 aPos;

  uniform vec2 uScreenSize;
  uniform vec2 uPosition;
  uniform vec2 uSize;
  uniform float uFlipY;

  out vec2 vLocalPos;

  void main() {
    vec2 scaledPos = aPos * uSize;
    vec2 screenPos = scaledPos + uPosition;
    vec2 ndc = (screenPos / uScreenSize) * 2.0 - 1.0;
    if (uFlipY > 0.5) {
      ndc.y = -ndc.y;
    }
    gl_Position = vec4(ndc, 0.0, 1.0);
    vLocalPos = aPos * uSize; // pixel position within the quad
  }
`;

// Fragment shader - bordered rectangle with semi-transparent fill
const fragShader = `
  #version 330 core
  in vec2 vLocalPos;

  uniform vec2 uSize;
  uniform vec4 uBorderColor;
  uniform vec4 uFillColor;

  out vec4 FragColor;

  void main() {
    float borderWidth = 2.0;

    // Check if we're on the border
    bool onBorder = vLocalPos.x < borderWidth || vLocalPos.x > uSize.x - borderWidth
                 || vLocalPos.y < borderWidth || vLocalPos.y > uSize.y - borderWidth;

    if (onBorder) {
      FragColor = uBorderColor;
    } else {
      FragColor = uFillColor;
    }
  }
`;

// Uniform buffer layout:
// uScreenSize: vec2, offset 0 (8 bytes)
// uPosition: vec2, offset 8 (8 bytes)
// uSize: vec2, offset 16 (8 bytes)
// uFlipY: float, offset 24 (4 bytes)
// padding: 4 bytes at offset 28
// uBorderColor: vec4, offset 32 (16 bytes)
// uFillColor: vec4, offset 48 (16 bytes)
// Total: 64 bytes
const UNIFORM_BUFFER_SIZE = 64;

export class DebugZoneOverlay {
  private program: patchrs.GlProgram | null = null;
  private vertexArray: patchrs.VertexArraySnapshot | null = null;
  private overlayHandle: patchrs.GlOverlay | null = null;
  private zone: DebugZone = { x: 400, y: 30, width: 600, height: 170 };
  private visible = false;

  private createProgram(): patchrs.GlProgram {
    return patchrs.native.createProgram(
      vertShader,
      fragShader,
      [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 2 },
      ],
      [
        { name: "uScreenSize", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 0, snapshotSize: 8 },
        { name: "uPosition", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 8, snapshotSize: 8 },
        { name: "uSize", length: 1, type: GL_FLOAT_VEC2, snapshotOffset: 16, snapshotSize: 8 },
        { name: "uFlipY", length: 1, type: GL_FLOAT, snapshotOffset: 24, snapshotSize: 4 },
        // 4 bytes padding at 28
        { name: "uBorderColor", length: 1, type: GL_FLOAT_VEC4, snapshotOffset: 32, snapshotSize: 16 },
        { name: "uFillColor", length: 1, type: GL_FLOAT_VEC4, snapshotOffset: 48, snapshotSize: 16 },
      ]
    );
  }

  private createVertexArray(): patchrs.VertexArraySnapshot {
    const vertices = new Float32Array([
      0, 0,  // Top-left
      1, 0,  // Top-right
      1, 1,  // Bottom-right
      0, 1,  // Bottom-left
    ]);
    const indices = new Uint16Array([0, 3, 2, 0, 2, 1]);

    return patchrs.native.createVertexArray(
      new Uint8Array(indices.buffer),
      [{
        location: 0,
        buffer: new Uint8Array(vertices.buffer),
        enabled: true,
        normalized: false,
        offset: 0,
        scalartype: GL_FLOAT,
        stride: 8,
        vectorlength: 2,
      }]
    );
  }

  private buildUniformBuffer(): ArrayBuffer {
    const buf = new ArrayBuffer(UNIFORM_BUFFER_SIZE);
    const view = new DataView(buf);

    const scaleState = getUIScaleState();
    const screenWidth = scaleState.uiWidth || scaleState.screenWidth || 1920;
    const screenHeight = scaleState.uiHeight || scaleState.screenHeight || 1080;
    const flipY = scaleState.isScaled ? 0.0 : 1.0;

    // uScreenSize
    view.setFloat32(0, screenWidth, true);
    view.setFloat32(4, screenHeight, true);
    // uPosition
    view.setFloat32(8, this.zone.x, true);
    view.setFloat32(12, this.zone.y, true);
    // uSize
    view.setFloat32(16, this.zone.width, true);
    view.setFloat32(20, this.zone.height, true);
    // uFlipY
    view.setFloat32(24, flipY, true);
    // padding at 28
    // uBorderColor (bright green, 90% alpha)
    view.setFloat32(32, 0.0, true);   // R
    view.setFloat32(36, 1.0, true);   // G
    view.setFloat32(40, 0.0, true);   // B
    view.setFloat32(44, 0.9, true);   // A
    // uFillColor (green tint, 10% alpha)
    view.setFloat32(48, 0.0, true);   // R
    view.setFloat32(52, 1.0, true);   // G
    view.setFloat32(56, 0.0, true);   // B
    view.setFloat32(60, 0.1, true);   // A

    return buf;
  }

  async show(zone?: DebugZone): Promise<void> {
    if (zone) this.zone = { ...zone };

    this.stopOverlay();

    if (!this.program) {
      this.program = this.createProgram();
    }
    if (!this.vertexArray) {
      this.vertexArray = this.createVertexArray();
    }

    const uniformBuffer = this.buildUniformBuffer();

    try {
      this.overlayHandle = patchrs.native.beginOverlay(
        {},
        this.program,
        this.vertexArray,
        {
          uniformSources: [],
          uniformBuffer: new Uint8Array(uniformBuffer),
          renderMode: "triangles",
          trigger: "frameend",
          alphaBlend: true,
        }
      );
      this.visible = true;
      console.log(`[DebugZone] Showing zone at (${this.zone.x}, ${this.zone.y}) ${this.zone.width}x${this.zone.height}`);
    } catch (e) {
      console.error("[DebugZone] Failed to create overlay:", e);
    }
  }

  async updateZone(zone: DebugZone): Promise<void> {
    this.zone = { ...zone };
    if (this.visible && this.overlayHandle) {
      // Update uniforms in place
      const uniformBuffer = this.buildUniformBuffer();
      try {
        this.overlayHandle.setUniformState(new Uint8Array(uniformBuffer));
      } catch {
        // If setUniformState fails, recreate
        await this.show(zone);
      }
    }
  }

  hide(): void {
    this.stopOverlay();
    this.visible = false;
  }

  isShowing(): boolean {
    return this.visible;
  }

  getZone(): DebugZone {
    return { ...this.zone };
  }

  private stopOverlay(): void {
    if (this.overlayHandle) {
      try {
        this.overlayHandle.stop();
      } catch {
        // ignore
      }
      this.overlayHandle = null;
    }
  }

  dispose(): void {
    this.hide();
    this.program = null;
    this.vertexArray = null;
  }
}
