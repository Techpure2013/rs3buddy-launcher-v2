/**
 * Native Addon Type Definitions
 *
 * Comprehensive TypeScript types for the Alt1GL Native Addon.
 * This module provides type-safe interfaces for interacting with the
 * native OpenGL capture and injection functionality.
 */

// ============================================
// Core Texture Types
// ============================================

/**
 * Tracked OpenGL texture with capture capabilities
 */
export interface TrackedTexture {
  width: number;
  height: number;
  texid: number;
  format: string;
  formatid: number;
  capture(subx: number, suby: number, w: number, h: number): ImageData;
  upload(img: ImageData): void;
  getStaleRect(): { x: number; y: number; width: number; height: number } | null;
}

/**
 * Snapshot of a texture at a specific point in time
 */
export interface TextureSnapshot {
  width: number;
  height: number;
  texid: number;
  detached: boolean;
  base: TrackedTexture;
  capture(subx: number, suby: number, w: number, h: number): ImageData;
  captureInto(img: ImageData, x: number, y: number, subx: number, suby: number, w: number, h: number): void;
  changesSince(oldtex: TextureSnapshot): { x: number; y: number; width: number; height: number }[];
  isChild(oldtex: TextureSnapshot): boolean;
  canCapture(): boolean;
  unref(): void;
  ref(): void;
  dispose(): void;
}

// ============================================
// Shader and Program Types
// ============================================

export interface GlShaderSource {
  source: string;
  id: number;
  type: 'fragment' | 'vertex' | 'other';
}

export interface PackedTypeInfo {
  type: number;
  known: boolean;
  scalarType: number;
  scalarSize: number;
  vectorLength: number;
}

export interface GlUniformMeta {
  name: string;
  blockArraystride: number;
  blockIndex: number;
  blockOffset: number;
  length: number;
  location: number;
  snapshotOffset: number;
  snapshotTracked: number;
  type: PackedTypeInfo;
}

export interface GlUniformArgument {
  name: string;
  type: number;
  length: number;
  snapshotOffset: number;
  snapshotSize: number;
}

export interface GlAttributeArgument {
  length: number;
  location: number;
  type: number;
  name: string;
}

export interface GlInputMeta {
  name: string;
  length: number;
  location: number;
  type: PackedTypeInfo;
}

export interface GlProgram {
  vertexShader: GlShaderSource;
  fragmentShader: GlShaderSource;
  computeShader: GlShaderSource;
  programId: number;
  uniforms: GlUniformMeta[];
  uniformBufferSize: number;
  inputs: GlInputMeta[];
  skipmask: number;
}

// ============================================
// Vertex Array Types
// ============================================

export interface VertexArray {
  skipmask: number;
}

export interface RenderInput {
  buffer: Uint8Array;
  enabled: boolean;
  location: number;
  offset: number;
  scalartype: number;
  stride: number;
  vectorlength: number;
  normalized: boolean;
}

export interface VertexArraySnapshot {
  base: VertexArray;
  indexBuffer: Uint8Array;
  attributes: RenderInput[];
}

// ============================================
// Render Types
// ============================================

export interface RenderRange {
  start: number;
  length: number;
}

export type RenderMode = 'triangles' | 'strips' | 'fans';

export interface RenderInvocation {
  program: GlProgram;
  uniformState: Uint8Array;
  samplers: { [location: number]: TextureSnapshot };
  textures: { [location: number]: TrackedTexture };
  vertexArray: VertexArraySnapshot;
  renderRanges: RenderRange[];
  renderMode: RenderMode | 'unknown';
  indexType: number;
  vertexObjectId: number;
  lastFrameTime: number;
  ownFrameTime: number;
  viewport: { x: number; y: number; width: number; height: number };
  framebufferColorTexture: TrackedTexture | undefined;
  framebufferColorTextureId: number;
  framebufferDepthTexture: TrackedTexture | undefined;
  framebufferDepthTextureId: number;
  framebufferId: number;
  framenr: number;
  computeTextures: { index: number; textureid: number; access: number; format: number }[];
  computeBuffers: { index: number; bufferid: number }[];
  dispose(): void;
}

export interface RenderFilter {
  maxPerFrame?: number;
  vertexObjectId?: number;
  programId?: number;
  framebufferId?: number;
  framebufferTexture?: number;
  framebufferDepth?: number;
  skipVerticesMask?: number;
  useVerticesMask?: number;
  skipProgramMask?: number;
  useProgramMask?: number;
  includeCompute?: boolean;
  includeDraw?: boolean;
}

export interface RecordRenderOptions extends RenderFilter {
  maxframes?: number;
  timeout?: number;
  framecooldown?: number;
  features?: ('vertexarray' | 'uniforms' | 'textures' | 'texturesnapshot' | 'texturecapture' | 'computebindings' | 'framebuffer' | 'full')[];
}

// ============================================
// State Types
// ============================================

export interface RenderInfo {
  glRenderer: string;
  glVendor: string;
  glVersion: string;
  glShaderVersion: string;
  glExtensions: string[];
}

export type RendererInfo = RenderInfo;

export interface OpenGLState {
  programs: { [id: number]: GlProgram };
  textures: { [id: number]: TrackedTexture };
}

export type GlState = OpenGLState;

// ============================================
// Streaming Types
// ============================================

export interface StreamRenderObject {
  close: () => Promise<void>;
  ended: Promise<void>;
}

// ============================================
// Overlay Types
// ============================================

export interface OverlayUniformSource {
  name: string;
  sourceName: string;
  type: 'program' | 'builtin';
  program?: GlProgram;
}

export interface GlOverlayOption {
  trigger?: 'before' | 'after' | 'replace' | 'frameend' | 'passive';
  alphaBlend?: boolean;
  ranges?: RenderRange[];
  renderMode?: RenderMode;
  uniformBuffer?: Uint8Array;
  uniformSources?: OverlayUniformSource[];
  samplers?: { [location: number]: TrackedTexture };
  duration?: number;
}

export interface GlOverlay {
  getUniformState: () => Uint8Array;
  setUniformState: (data: Uint8Array) => void;
  stop: () => void;
}

export type OverlayTheme = 'dark' | 'light' | 'runescape';
export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface OverlayConfig {
  visible?: boolean;
  expanded?: boolean;
  theme?: OverlayTheme;
  position?: OverlayPosition;
  offsetX?: number;
  offsetY?: number;
}

export interface OverlayButton {
  id: number;
  label: string;
  userData?: string;
}

export interface ButtonClickEvent {
  buttonId: number;
  userData: string;
}

export interface ClickRegion {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  userData?: string;
}

export interface ClickEventData {
  regionId: number;
  mouseX: number;
  mouseY: number;
  button: number;
  isDown: boolean;
}

export interface OverlayLibrary {
  init(width: number, height: number): boolean;
  shutdown(): void;
  setConfig(config: OverlayConfig): void;
  addButton(button: OverlayButton): boolean;
  removeButton(id: number): boolean;
  clearButtons(): void;
  setTheme(theme: OverlayTheme): void;
  setClickCallback(callback: ((event: ButtonClickEvent) => void) | null): void;
}

// ============================================
// Debug API
// ============================================

export type InjectState = { memoryid: number; instanceid: number } | null;

export interface DebugApi {
  getCurrentWorkingDirectory(): string;
  readDirSync(dir: string): string[];
  readFileSync(file: string): Uint8Array;
  copyFileSync(from: string, to: string): void;
  statSync(file: string): { size: number; modifiedTime: number; isDirectory: boolean };
  getExePids(name: string, parent?: number): number[];
  injectDll(pid: number, dllfile: string, memoryid?: number, instanceid?: number): InjectState;
  connectToOverlay?(pid: number): { instanceid: number } | null;
  exitDll(): void;
  getRsHwnd(): number;
  memoryState(): { size: number; free: number; used: number; sanity: boolean; allocs: number; namedobjects: number } | null;
  getAllGlObjects(): any;
  getGlObjectStats(): { size: number; count: number; counts: Record<string, number>; subsizes: Record<string, number> } | null;
  resetOpenGlState(): Promise<void>;
  killMemorySession(): Promise<void>;
  setLogCb(cb: (message: string) => void): void;
}

// ============================================
// Main Native Addon Interface
// ============================================

export interface Alt1GLNative {
  // Alt1 Replacement API
  getRsReady(): number;
  getRsX(): number;
  getRsY(): number;
  getRsWidth(): number;
  getRsHeight(): number;
  getRsHwnd(): number;
  capture(texid: number, x: number, y: number, w: number, h: number): Promise<ImageData>;

  // Core OpenGL
  getRenderer(): RendererInfo | null;
  getOpenGlState(): Promise<GlState>;
  recordRenderCalls(options?: RecordRenderOptions): Promise<RenderInvocation[]>;
  streamRenderCalls(options: RecordRenderOptions, callback: (progress: RenderInvocation[]) => void): StreamRenderObject;

  // GL Logging/Debugging
  setGlLogCb(cb: ((packet: { id: number; thread: number; data: Uint8Array }) => any) | null): void;
  getGlLogToggles(): Uint8Array;
  setGlLogToggles(arr: Uint8Array): void;

  // Upload/Overlay
  createProgram(vertexshader: string, fragmentshader: string, inputs: GlAttributeArgument[], uniforms: GlUniformArgument[]): GlProgram;
  createVertexArray(indexbuffer: Uint8Array, inputs: RenderInput[]): VertexArraySnapshot;
  createTexture(img: ImageData): TrackedTexture;
  beginOverlay(trigger: RenderFilter, prog: GlProgram | undefined, vertexarray: VertexArraySnapshot | undefined, options: GlOverlayOption): GlOverlay;

  // Debug API
  debug: DebugApi;

  // Alt1GL Overlay Library (Optional Extension)
  overlay?: OverlayLibrary;
}

// ============================================
// Type Guards
// ============================================

export function isTrackedTexture(value: any): value is TrackedTexture {
  return value && typeof value === 'object' && typeof value.width === 'number' && typeof value.height === 'number' && typeof value.texid === 'number' && typeof value.capture === 'function' && typeof value.upload === 'function';
}

export function isTextureSnapshot(value: any): value is TextureSnapshot {
  return value && typeof value === 'object' && typeof value.width === 'number' && typeof value.height === 'number' && typeof value.texid === 'number' && typeof value.detached === 'boolean' && typeof value.capture === 'function' && typeof value.dispose === 'function';
}

export function isNativeAddonLoaded(value: any): value is Alt1GLNative {
  return value && typeof value === 'object' && typeof value.getRsReady === 'function' && typeof value.capture === 'function' && typeof value.getRenderer === 'function' && typeof value.debug === 'object';
}

// ============================================
// Platform Detection
// ============================================

export type Platform = 'windows' | 'linux';

export function getPlatform(): Platform {
  if (typeof process !== 'undefined' && process.platform === 'linux') {
    return 'linux';
  }
  return 'windows';
}

export function isWindows(): boolean {
  return getPlatform() === 'windows';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}
