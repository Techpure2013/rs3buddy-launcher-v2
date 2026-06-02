/**
 * DLL Injection Module
 * Handles loading the native addon and injecting the Alt1GL DLL into the game process
 *
 * This module provides a clean interface to:
 * - Load the native addon
 * - Inject the DLL into the game process
 * - Communicate with the overlay library
 */

import * as path from 'path';
import * as fs from 'fs';
import { getApp } from './electron';
import { reconnectToOverlayPure } from './inject-logic';
export type { InjectionState } from './inject-logic';

// Click event data from injected DLL
export interface ClickEventData {
  regionId: number;
  mouseX: number;
  mouseY: number;
  button: number;
  isDown: boolean;
}

// Overlay theme type
export type OverlayTheme = 'dark' | 'light' | 'runescape';

// Overlay position type
export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Overlay configuration
export interface OverlayConfig {
  visible?: boolean;
  expanded?: boolean;
  theme?: OverlayTheme;
  position?: OverlayPosition;
  offsetX?: number;
  offsetY?: number;
}

// Button configuration
export interface OverlayButton {
  id: number;
  label: string;
  userData?: string;  // e.g., app URL
}

// Button click event
export interface ButtonClickEvent {
  buttonId: number;
  userData: string;
}

// Click region for input detection
export interface ClickRegion {
  id?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  userData?: string;
}

// ============================================
// patchrs_napi.ts types (complete)
// ============================================

// Vertex array with skip mask
export interface VertexArray {
  skipmask: number;
}

// Tracked texture from GL
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

// Texture snapshot
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

// GL Shader source
export interface GlShaderSource {
  source: string;
  id: number;
  type: 'fragment' | 'vertex' | 'other';
}

// Render input for vertex data
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

// Packed type info
export interface PackedTypeInfo {
  type: number;
  known: boolean;
  scalarType: number;
  scalarSize: number;
  vectorLength: number;
}

// GL Uniform metadata
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

// GL Uniform argument for createProgram
export interface GlUniformArgument {
  name: string;
  type: number;
  length: number;
  snapshotOffset: number;
  snapshotSize: number;
}

// GL Attribute argument for createProgram
export interface GlAttributeArgument {
  length: number;
  location: number;
  type: number;
  name: string;
}

// GL Input metadata
export interface GlInputMeta {
  name: string;
  length: number;
  location: number;
  type: PackedTypeInfo;
}

// GL Program
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

// Vertex array snapshot
export interface VertexArraySnapshot {
  base: VertexArray;
  indexBuffer: Uint8Array;
  attributes: RenderInput[];
}

// Render range
export interface RenderRange {
  start: number;
  length: number;
}

// Render mode type
export type RenderMode = 'triangles' | 'strips' | 'fans';

// Render invocation (result of recordRenderCalls)
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

// GL State
export interface GlState {
  programs: { [id: number]: GlProgram };
  textures: { [id: number]: TrackedTexture };
}

// Render filter for GL operations
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

// Record render options
export interface RecordRenderOptions extends RenderFilter {
  maxframes?: number;
  timeout?: number;
  framecooldown?: number;
  features?: ('vertexarray' | 'uniforms' | 'textures' | 'texturesnapshot' | 'texturecapture' | 'computebindings' | 'framebuffer' | 'full')[];
}

// Renderer info
export interface RendererInfo {
  glRenderer: string;
  glVendor: string;
  glVersion: string;
  glShaderVersion: string;
  glExtensions: string[];
}

// Stream render object
export interface StreamRenderObject {
  close: () => Promise<void>;
  ended: Promise<void>;
}

// Overlay uniform source
export interface OverlayUniformSource {
  name: string;
  sourceName: string;
  type: 'program' | 'builtin';
  program?: GlProgram;
}

// GL Overlay option for beginOverlay
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

// GL Overlay result
export interface GlOverlay {
  getUniformState: () => Uint8Array;
  setUniformState: (data: Uint8Array) => void;
  stop: () => void;
}

// Inject state result
export type InjectState = { memoryid: number; instanceid: number } | null;

// Debug API interface (from patchrs_napi.ts)
export interface DebugApi {
  getCurrentWorkingDirectory(): string;
  readDirSync(dir: string): string[];
  readFileSync(file: string): Uint8Array;
  copyFileSync(from: string, to: string): void;
  statSync(file: string): { size: number; modifiedTime: number; isDirectory: boolean };
  getExePids(name: string, parent?: number): number[];
  injectDll(pid: number, dllfile: string, memoryid?: number, instanceid?: number): InjectState;
  connectToOverlay(pid: number): InjectState;
  exitDll(): void;
  getRsHwnd(): number;
  memoryState(): { size: number; free: number; used: number; sanity: boolean; allocs: number; namedobjects: number; uniqueobjects: number; namedAllocations: Array<{ name: string; itemSize: number }> } | null;
  getAllGlObjects(): any;
  getGlObjectStats(): { size: number; count: number; counts: Record<string, number>; subsizes: Record<string, number> } | null;
  getSharedMemorySizes(): number[];
  resetOpenGlState(): Promise<void>;
  killMemorySession(): Promise<void>;
  setLogCb(cb: (message: string) => void): void;
}

// Native addon interface (Alt1GlClient from patchrs_napi.ts)
export interface NativeAddon {
  // Alt1 replacement API
  getRsReady(): number;
  getRsX(): number;
  getRsY(): number;
  getRsWidth(): number;
  getRsHeight(): number;
  getRsHwnd(): number;
  capture(texid: number, x: number, y: number, w: number, h: number): Promise<ImageData>;

  // Core OpenGL
  recordRenderCalls(options?: RecordRenderOptions): Promise<RenderInvocation[]>;
  streamRenderCalls(options: RecordRenderOptions, callback: (progress: RenderInvocation[]) => void): StreamRenderObject;
  getOpenGlState(): Promise<GlState>;
  getRenderer(): RendererInfo | null;

  // GL logging/debugging
  setGlLogCb(cb: ((packet: { id: number; thread: number; data: Uint8Array }) => any) | null): void;
  getGlLogToggles(): Uint8Array;
  setGlLogToggles(arr: Uint8Array): void;

  // Upload/overlay
  createProgram(vertexshader: string, fragmentshader: string, inputs: GlAttributeArgument[], uniforms: GlUniformArgument[]): GlProgram;
  createVertexArray(indexbuffer: Uint8Array, inputs: RenderInput[]): VertexArraySnapshot;
  createTexture(img: ImageData): TrackedTexture;
  beginOverlay(trigger: RenderFilter, prog: GlProgram | undefined, vertexarray: VertexArraySnapshot | undefined, options: GlOverlayOption): GlOverlay;

  // Debug API
  debug: DebugApi;

  // Alt1GL overlay library interface (optional, our extension)
  overlay?: {
    init(width: number, height: number): boolean;
    shutdown(): void;
    setConfig(config: OverlayConfig): void;
    addButton(button: OverlayButton): boolean;
    removeButton(id: number): boolean;
    clearButtons(): void;
    setTheme(theme: OverlayTheme): void;
    setClickCallback(callback: ((event: ButtonClickEvent) => void) | null): void;
  };
}

let nativeAddon: NativeAddon | null = null;
const injectionStates = new Map<number, { pid: number; dllPath: string; instanceId: number; memoryId: number }>();
let activeMemoryId: number | undefined;

// Get base paths for native files
function getBasePaths(): string[] {
  const app = getApp();
  const isPackaged = app.isPackaged;

  if (isPackaged) {
    const resourcesPath = path.join(path.dirname(app.getPath('exe')), 'resources', 'lib');
    return [resourcesPath];
  } else {
    const projectRoot = path.resolve(__dirname, '..', '..');
    return [
      path.join(projectRoot, 'build', 'Release'),
      path.join(projectRoot, 'build', 'Debug'),
      path.join(projectRoot, '..', 'build', 'Release'),
      path.join(projectRoot, '..', 'build', 'Debug')
    ];
  }
}

// Platform-specific library extensions
const isWindows = process.platform === 'win32';
const libExtension = isWindows ? '.dll' : '.so';

// Get paths to native files (supports both Windows DLL and Linux .so)
function getNativePaths(): { addonPath: string; dllPath: string; overlayDllPath: string; nativeDir: string } | null {
  const basePaths = getBasePaths();

  for (const basePath of basePaths) {
    const addonPath = path.join(basePath, 'addon.node');
    const dllPath = path.join(basePath, `injected${libExtension}`);
    const overlayDllPath = path.join(basePath, `overlay${libExtension}`);

    console.log('[Inject] Checking path:', basePath);
    console.log('[Inject]   addon.node exists:', fs.existsSync(addonPath));
    console.log(`[Inject]   injected${libExtension} exists:`, fs.existsSync(dllPath));
    console.log(`[Inject]   overlay${libExtension} exists:`, fs.existsSync(overlayDllPath));

    // On Linux, we only need addon.node and overlay.so (no injection needed - uses LD_PRELOAD)
    // On Windows, we need addon.node and injected.dll
    const requiredLibExists = isWindows ? fs.existsSync(dllPath) : fs.existsSync(overlayDllPath);

    if (fs.existsSync(addonPath) && requiredLibExists) {
      console.log('[Inject] Found native files in:', basePath);
      const hasOverlay = fs.existsSync(overlayDllPath);
      console.log(`[Inject] Overlay ${libExtension} available:`, hasOverlay);
      if (!hasOverlay && isWindows) {
        console.log(`[Inject] WARNING: overlay${libExtension} not found! Only injected${libExtension} will be used.`);
        console.log('[Inject] The IPC toolbar will NOT be available without overlay library');
      }
      return { addonPath, dllPath, overlayDllPath: hasOverlay ? overlayDllPath : dllPath, nativeDir: basePath };
    }
  }

  console.error('Native addon or library not found in any of:', basePaths);
  return null;
}

// Find addon.node path (does NOT require DLLs — needed for reconnecting to shared memory)
function findAddonPath(): string | null {
  const basePaths = getBasePaths();
  for (const basePath of basePaths) {
    const addonPath = path.join(basePath, 'addon.node');
    if (fs.existsSync(addonPath)) {
      return addonPath;
    }
  }
  return null;
}

// Load the native addon
// Only requires addon.node — DLLs are checked separately when injection is needed.
// This allows reconnecting to shared memory after a crash even if DLLs aren't co-located.
export function loadNativeAddon(): NativeAddon | null {
  if (nativeAddon) {
    return nativeAddon;
  }

  // First try the full path search (addon + DLLs together)
  const paths = getNativePaths();
  const addonPath = paths?.addonPath ?? findAddonPath();

  if (!addonPath) {
    console.error('Cannot load native addon: addon.node not found');
    return null;
  }

  try {
    console.log('Loading native addon from:', addonPath);
    const requireFn = typeof __non_webpack_require__ !== 'undefined'
      ? __non_webpack_require__
      : require;
    nativeAddon = requireFn(addonPath) as NativeAddon;
    console.log('Native addon loaded successfully');
    return nativeAddon;
  } catch (e) {
    console.error('Failed to load native addon:', e);
    return null;
  }
}

// Alias for backwards compatibility
export const getNativeAddon = loadNativeAddon;

// Get the DLL copy directory (separate from build dir to avoid node-gyp clean issues)
function getDllCopyDir(): string {
  const app = getApp();
  const userDataPath = app.getPath('userData');
  const dllCopyDir = path.join(userDataPath, 'dll-copies');

  // Ensure directory exists
  if (!fs.existsSync(dllCopyDir)) {
    fs.mkdirSync(dllCopyDir, { recursive: true });
  }

  return dllCopyDir;
}

// Clean up old DLL copies from the build directory (legacy location)
// This helps prevent node-gyp rebuild issues
export function cleanupLegacyDllCopies(): void {
  const paths = getNativePaths();
  if (!paths) return;

  const nativeDir = paths.nativeDir;
  console.log('[Inject] Cleaning up legacy DLL copies from:', nativeDir);

  try {
    const files = fs.readdirSync(nativeDir);
    const patterns = [/^overlay-\d+\.dll$/, /^injected-\d+\.dll$/];

    for (const file of files) {
      if (patterns.some(p => p.test(file))) {
        const filePath = path.join(nativeDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log('[Inject] Deleted legacy DLL copy:', filePath);
        } catch (e) {
          // File might be locked by running RS process - that's OK
          console.log('[Inject] Could not delete (may be in use):', filePath);
        }
      }
    }
  } catch (e) {
    console.error('[Inject] Error cleaning up legacy DLLs:', e);
  }
}

// Get the DLL path, copying to a unique filename if needed
// DLL copies are stored in userData to avoid node-gyp rebuild issues
function getInjectableDllPath(nativeDir: string, baseDllPath: string, prefix: string = 'injected'): string {
  try {
    // Store DLL copies in userData directory instead of build directory
    const copyDir = getDllCopyDir();
    const files = fs.readdirSync(copyDir);
    const pattern = new RegExp(`^${prefix}-\\d+\\.dll$`);
    const matchedFiles = files.filter(f => pattern.test(f));

    let maxNum = 0;
    for (const file of matchedFiles) {
      const match = file.match(new RegExp(`^${prefix}-(\\d+)\\.dll$`));
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1]));
      }
    }

    const lastFile = maxNum > 0 ? path.join(copyDir, `${prefix}-${maxNum}.dll`) : null;

    if (lastFile && fs.existsSync(lastFile)) {
      const origStat = fs.statSync(baseDllPath);
      const lastStat = fs.statSync(lastFile);

      if (origStat.size === lastStat.size) {
        const origData = fs.readFileSync(baseDllPath);
        const lastData = fs.readFileSync(lastFile);

        if (origData.equals(lastData)) {
          console.log('[Inject] Using existing DLL copy:', lastFile);
          return lastFile;
        }
      }
    }

    const newNum = maxNum + 1;
    const newFile = path.join(copyDir, `${prefix}-${newNum}.dll`);
    console.log('[Inject] Creating new DLL copy:', newFile);
    fs.copyFileSync(baseDllPath, newFile);

    // Also copy injected.dll to the same directory if we're copying overlay.dll
    if (prefix === 'overlay') {
      const injectedSrc = path.join(nativeDir, 'injected.dll');
      const injectedDst = path.join(copyDir, 'injected.dll');
      if (fs.existsSync(injectedSrc)) {
        // Always copy to ensure it's up to date
        fs.copyFileSync(injectedSrc, injectedDst);
        console.log('[Inject] Copied injected.dll to:', injectedDst);
      }
    }

    return newFile;
  } catch (e) {
    console.error('[Inject] Error preparing DLL for injection:', e);
    return baseDllPath;
  }
}

// Inject DLL into a process
export function injectIntoProcess(pid: number, useOverlay: boolean = true): boolean {
  console.log('[Inject] ========================================');
  console.log('[Inject] Starting injection for PID:', pid, 'useOverlay:', useOverlay);
  const existingState = injectionStates.get(pid);
  console.log('[Inject] Current injection state for PID:', existingState ? `Instance ${existingState.instanceId}` : 'none');

  // Guard: don't re-inject a PID that's already injected (prevents boost shared_ptr crash)
  if (existingState) {
    console.log('[Inject] PID', pid, 'already has injection state (Instance', existingState.instanceId, ') — skipping re-injection');
    return true;
  }

  const addon = loadNativeAddon();
  if (!addon) {
    console.error('[Inject] Cannot inject: native addon not loaded');
    return false;
  }

  const paths = getNativePaths();
  if (!paths) {
    console.error('[Inject] Cannot inject: native files not found');
    return false;
  }

  try {
    const baseDll = useOverlay ? paths.overlayDllPath : paths.dllPath;
    const prefix = useOverlay && paths.overlayDllPath !== paths.dllPath ? 'overlay' : 'injected';
    console.log('[Inject] Base DLL:', baseDll);
    console.log('[Inject] DLL prefix:', prefix);

    // getInjectableDllPath handles copying to userData directory and also copies injected.dll
    const dllPath = getInjectableDllPath(paths.nativeDir, baseDll, prefix);
    console.log('[Inject] DLL path ready:', dllPath);

    // Check existing memory state before injection
    try {
      const memState = addon.debug.memoryState();
      console.log('[Inject] Memory state before injection:', memState ? 'active' : 'none');
    } catch (e) {
      console.log('[Inject] Could not get memory state (expected if not yet injected)');
    }

    // NOTE: Do NOT call exitDll() before injectDll().
    // The C++ injectDll() already calls closeClientComms() internally.
    // Extra exitDll() causes a mainIdle semaphore leak that races the pump thread.

    console.log('[Inject] Calling injectDll...', activeMemoryId !== undefined ? `(sharing memory session ${activeMemoryId})` : '(new memory session)');
    const result = addon.debug.injectDll(pid, dllPath, activeMemoryId);

    if (result) {
      console.log('[Inject] Injection successful!');
      console.log('[Inject]   Memory ID:', result.memoryid);
      console.log('[Inject]   Instance ID:', result.instanceid);
      console.log('[Inject]   DLL Type:', prefix === 'overlay' ? 'OVERLAY (with IPC toolbar)' : 'INJECTED ONLY (no toolbar)');
      console.log('[Inject]   DLL Path:', dllPath);

      // Guard: if memoryid is undefined, the shared memory handshake failed.
      // The DLL loaded but communication isn't ready. Don't poison activeMemoryId
      // and don't call any native APIs that require valid shared memory.
      if (result.memoryid == null) {
        console.warn('[Inject] WARNING: memoryid is undefined — shared memory handshake failed');
        console.warn('[Inject] DLL was injected but communication not established. Will retry via reconnect.');
        // Still store the state so we know this PID was attempted
        injectionStates.set(pid, { pid, dllPath, instanceId: result.instanceid, memoryId: 0 });
        console.log('[Inject] ========================================');
        return true; // DLL loaded, but caller should expect limited functionality until reconnect
      }

      if (activeMemoryId === undefined) {
        activeMemoryId = result.memoryid;
        console.log('[Inject]   Established shared memory session:', activeMemoryId);
      }
      injectionStates.set(pid, { pid, dllPath, instanceId: result.instanceid, memoryId: result.memoryid });

      // Check memory state after injection (safe now — memoryid is valid)
      try {
        const memState = addon.debug.memoryState();
        console.log('[Inject] Memory state after injection:', memState);
      } catch (e) {
        console.log('[Inject] Could not get memory state after injection:', e);
      }

      // Provide clear next steps based on DLL type
      if (prefix === 'overlay') {
        console.log('[Inject] Overlay DLL injected - IPC pipe should be created at:');
        console.log(`[Inject]   \\\\.\\pipe\\alt1gl-overlay-${pid}`);
      } else {
        console.log('[Inject] NOTE: Only injected.dll was loaded - no IPC toolbar support');
      }

      console.log('[Inject] ========================================');
      return true;
    } else {
      console.error('[Inject] Injection failed - injectDll returned null');
      console.log('[Inject] ========================================');
      return false;
    }
  } catch (e) {
    console.error('[Inject] Injection error:', e);
    console.log('[Inject] ========================================');
    return false;
  }
}

// Find and inject into running RS client
export function injectIntoRunningClient(): boolean {
  const addon = loadNativeAddon();
  if (!addon) {
    console.error('Cannot find client: native addon not loaded');
    return false;
  }

  try {
    // Native addon handles .exe extension automatically on Linux
    const pids = addon.debug.getExePids('rs2client.exe');
    console.log('Found RS client PIDs:', pids);

    if (pids.length === 0) {
      console.log('No RS client found');
      return false;
    }

    return injectIntoProcess(pids[0]);
  } catch (e) {
    console.error('Error finding RS client:', e);
    return false;
  }
}

// Check if injection is active (any process)
export function isInjected(): boolean {
  return injectionStates.size > 0;
}

// Check if a specific PID is already injected
export function isInjectedPid(pid: number): boolean {
  return injectionStates.has(pid);
}

// Get injection state (backwards compatibility - returns first state)
export function getInjectionState(): { pid: number; dllPath: string; instanceId: number } | null {
  const firstState = injectionStates.values().next().value || null;
  console.log('[Inject] getInjectionState called, returning first state:', firstState);
  return firstState;
}

// Get injection state for specific PID
export function getInjectionStateForPid(pid: number): { pid: number; dllPath: string; instanceId: number; memoryId: number } | null {
  return injectionStates.get(pid) || null;
}

// Set injection state (used when preload connects directly)
export function setInjectionState(state: { pid: number; dllPath: string; instanceId: number; memoryId?: number } | null): void {
  console.log('[Inject] setInjectionState called with:', state);
  if (state) {
    const memoryId = state.memoryId ?? 0;
    injectionStates.set(state.pid, { ...state, memoryId });
  }
}

// Reset injection state for specific PID
export function resetInjectionStateForPid(pid: number): void {
  console.log('[Inject] Resetting injection state for PID:', pid);
  injectionStates.delete(pid);
  if (injectionStates.size === 0) {
    console.log('[Inject] Last client disconnected, cleaning up native addon connection');
    // CRITICAL: Call exitDll() to tear down the pump thread and release the
    // shared memory reference BEFORE it becomes stale. Without this, the pump
    // thread holds a pointer to the dead process's shared memory, and the next
    // injectDll() call crashes when closeClientComms() tries to join the stale thread.
    const addon = loadNativeAddon();
    if (addon) {
      try {
        addon.debug.exitDll();
        console.log('[Inject] Native addon connection cleaned up');
      } catch (e) {
        console.log('[Inject] exitDll during cleanup:', e);
      }
    }
    activeMemoryId = undefined;
  }
}

// Reset injection state (call when game process exits - clears all)
export function resetInjectionState(): void {
  console.log('[Inject] Resetting all injection states');
  const addon = loadNativeAddon();
  if (addon) {
    try {
      addon.debug.exitDll();
    } catch {}
  }
  injectionStates.clear();
  activeMemoryId = undefined;
}

// Reconnect to an already-injected overlay's shared memory without re-injecting the DLL.
// Used when the launcher restarts while the game (with DLL loaded) is still running.
// Returns true if the shared memory session was re-established.
export function reconnectToOverlay(pid: number): boolean {
  const addon = loadNativeAddon();
  if (!addon) {
    console.error('[Inject] Cannot reconnect: native addon not loaded');
    return false;
  }

  console.log('[Inject] Reconnecting to existing overlay shared memory for PID:', pid);
  const result = reconnectToOverlayPure(addon, pid, injectionStates, activeMemoryId);

  if (result.success) {
    console.log('[Inject] Reconnected to overlay shared memory!');
    console.log('[Inject]   Instance ID:', result.instanceId);
    if (result.newActiveMemoryId !== undefined) {
      activeMemoryId = result.newActiveMemoryId;
      console.log('[Inject]   Re-established shared memory session:', activeMemoryId);
    }
  } else {
    console.error('[Inject] Reconnection failed for PID:', pid);
  }

  return result.success;
}

// Clean up DLL injection (call on launcher exit)
// Note: By the time this is called, shutdownAllOverlays() should have already
// sent RequestUnload to the overlay DLL, causing it to:
//   1. Restore all IAT hooks (GL function pointers)
//   2. Shut down IPC pipe, toolbar, hotkeys, input hooks
//   3. FreeLibrary injected.dll from within the game process
//   4. FreeLibraryAndExitThread to eject itself (overlay.dll)
//
// This function handles the Node.js side cleanup (shared memory, pump thread)
export function cleanupInjection(): void {
  console.log('[Inject] Cleaning up injection...');
  const addon = loadNativeAddon();
  if (addon) {
    try {
      // exitDll() cleans up: shared memory mapping, message pump thread, JS handles
      addon.debug.exitDll();
      console.log('[Inject] Native addon cleanup complete (shared memory + pump thread)');
    } catch (e) {
      console.error('[Inject] Native addon cleanup error:', e);
    }
  }

  // Clean up stale DLL copies that are no longer in use
  cleanupDllCopies();

  injectionStates.clear();
  activeMemoryId = undefined;
  console.log('[Inject] All injection states cleared');
}

// Clean up old DLL copies from the userData directory
// These accumulate over time as new versions are copied for injection
export function cleanupDllCopies(): void {
  try {
    const copyDir = getDllCopyDir();
    if (!fs.existsSync(copyDir)) return;

    const files = fs.readdirSync(copyDir);
    const dllPatterns = [/^overlay-\d+\.dll$/, /^injected-\d+\.dll$/, /^injected\.dll$/];
    let deletedCount = 0;

    for (const file of files) {
      if (dllPatterns.some(p => p.test(file))) {
        const filePath = path.join(copyDir, file);
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log('[Inject] Deleted DLL copy:', filePath);
        } catch (e) {
          // File might still be locked by game process if unload hasn't completed
          console.log('[Inject] Could not delete DLL copy (may still be in use):', filePath);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[Inject] Cleaned up ${deletedCount} DLL copies`);
    }
  } catch (e) {
    console.error('[Inject] Error cleaning up DLL copies:', e);
  }
}

// Check if RS client is ready
export function isRsReady(): boolean {
  const addon = loadNativeAddon();
  if (!addon) return false;
  try {
    // getRsReady returns number (0 = not ready, non-zero = ready)
    return addon.getRsReady() !== 0;
  } catch {
    return false;
  }
}

// Check if OpenGL is ready
export function isGlReady(): boolean {
  const addon = loadNativeAddon();
  if (!addon) return false;
  try {
    const renderer = addon.getRenderer();
    return renderer !== null;
  } catch {
    return false;
  }
}

// Wait for OpenGL to be ready
export async function waitForGlReady(maxWaitMs: number = 15000, intervalMs: number = 500): Promise<boolean> {
  const startTime = Date.now();
  let checkCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    checkCount++;
    const ready = isGlReady();
    if (checkCount <= 3 || checkCount % 10 === 0) {
      console.log(`[Inject] GL check #${checkCount}: ready=${ready}, elapsed=${Date.now() - startTime}ms`);
    }
    if (ready) {
      console.log(`[Inject] GL ready after ${Date.now() - startTime}ms (${checkCount} checks)`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  console.log(`[Inject] GL not ready after ${maxWaitMs}ms timeout (${checkCount} checks)`);
  return false;
}

// ============================================
// Overlay Library Interface
// ============================================

// Configure the overlay
export function configureOverlay(config: OverlayConfig): void {
  const addon = loadNativeAddon();
  if (!addon?.overlay) {
    console.log('[Overlay] Overlay not available');
    return;
  }

  try {
    addon.overlay.setConfig(config);
    console.log('[Overlay] Config applied');
  } catch (e) {
    console.error('[Overlay] Failed to set config:', e);
  }
}

// Set overlay theme
export function setOverlayTheme(theme: OverlayTheme): void {
  const addon = loadNativeAddon();
  if (!addon?.overlay) return;

  try {
    addon.overlay.setTheme(theme);
    console.log('[Overlay] Theme set to:', theme);
  } catch (e) {
    console.error('[Overlay] Failed to set theme:', e);
  }
}

// Add button to overlay
export function addOverlayButton(button: OverlayButton): boolean {
  const addon = loadNativeAddon();
  if (!addon?.overlay) return false;

  try {
    return addon.overlay.addButton(button);
  } catch (e) {
    console.error('[Overlay] Failed to add button:', e);
    return false;
  }
}

// Remove button from overlay
export function removeOverlayButton(id: number): boolean {
  const addon = loadNativeAddon();
  if (!addon?.overlay) return false;

  try {
    return addon.overlay.removeButton(id);
  } catch (e) {
    console.error('[Overlay] Failed to remove button:', e);
    return false;
  }
}

// Clear all overlay buttons
export function clearOverlayButtons(): void {
  const addon = loadNativeAddon();
  if (!addon?.overlay) return;

  try {
    addon.overlay.clearButtons();
  } catch (e) {
    console.error('[Overlay] Failed to clear buttons:', e);
  }
}

// Set button click callback
export function setOverlayClickCallback(callback: ((event: ButtonClickEvent) => void) | null): void {
  const addon = loadNativeAddon();
  if (!addon?.overlay) return;

  try {
    addon.overlay.setClickCallback(callback);
  } catch (e) {
    console.error('[Overlay] Failed to set click callback:', e);
  }
}

// Show overlay
export function showOverlay(): void {
  configureOverlay({ visible: true });
}

// Hide overlay
export function hideOverlay(): void {
  configureOverlay({ visible: false });
}

// ============================================
// Auto-connect to existing RS client (Linux)
// ============================================

/**
 * Try to connect to an already-running RS client that has injected.so loaded.
 * This is useful when restarting the launcher without restarting the game.
 * Returns the PID if connected, null otherwise.
 */
export async function tryConnectToExistingClient(): Promise<number | null> {
  const isLinux = process.platform !== 'win32';
  if (!isLinux) {
    // Windows uses DLL injection which requires being there at start
    return null;
  }

  const addon = loadNativeAddon();
  if (!addon) {
    console.log('[Inject] Cannot check for existing client: addon not loaded');
    return null;
  }

  try {
    // Find running RS client
    const pids = addon.debug.getExePids('rs2client.exe');
    if (pids.length === 0) {
      console.log('[Inject] No RS client found running');
      return null;
    }

    const pid = pids[0];
    console.log(`[Inject] Found RS client PID: ${pid}`);

    // Check if shared memory exists (overlay is loaded)
    const fs = await import('fs');
    const shmPath = `/dev/shm/alt1link_${pid}`;
    const instPath = `/dev/shm/alt1link_${pid}_inst_1`;

    if (!fs.existsSync(shmPath)) {
      console.log(`[Inject] No shared memory at ${shmPath} - overlay not loaded for this process`);
      return null;
    }

    // Wait for GL server to be ready (instance memory)
    let ready = false;
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(instPath)) {
        ready = true;
        break;
      }
      console.log(`[Inject] Waiting for GL server instance... (${i + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!ready) {
      console.log('[Inject] GL server not ready after waiting');
      return null;
    }

    console.log('[Inject] Found existing overlay, connecting...');

    // Connect to the overlay
    const result = (addon.debug as any).connectToOverlay(pid);
    if (result && result.instanceid) {
      console.log(`[Inject] Connected to existing overlay! Instance: ${result.instanceid}`);

      // Set injection state so app windows can also connect
      setInjectionState({
        pid,
        dllPath: '/dev/shm/alt1link_' + pid,  // Virtual path to indicate connection
        instanceId: result.instanceid
      });

      return pid;
    } else {
      console.log('[Inject] Failed to connect to existing overlay');
      return null;
    }
  } catch (e) {
    console.error('[Inject] Error connecting to existing client:', e);
    return null;
  }
}

// Declare __non_webpack_require__ for TypeScript
declare const __non_webpack_require__: NodeJS.Require | undefined;
