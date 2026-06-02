/**
 * Serialized type definitions for the IPC proxy layer.
 *
 * Native C++ NAPI objects (TrackedTexture, TextureSnapshot, etc.) cannot cross
 * Electron's contextBridge boundary. These types define their serializable
 * representations: data properties are copied, live C++ objects become opaque
 * handle references (HandleRef), and methods become IPC calls.
 */

import type {
  GlShaderSource,
  PackedTypeInfo,
  GlUniformMeta,
  GlInputMeta,
  RenderInput,
  RenderRange,
  RenderMode,
} from '../inject';

// ============================================
// Handle System
// ============================================

/** Categories of C++ objects tracked in the HandleStore */
export enum HandleType {
  TrackedTexture = 1,
  TextureSnapshot = 2,
  VertexArraySnapshot = 3,
  GlProgram = 4,
  GlOverlay = 5,
  StreamRenderObject = 6,
  RenderInvocation = 7,
}

/** Opaque handle reference sent to the renderer */
export interface HandleRef {
  readonly __handleId: string;
  readonly __type: HandleType;
}

// ============================================
// Serialized Native Object Types
// ============================================

/** Serialized TrackedTexture - data props + handle (methods via IPC) */
export interface SerializedTrackedTexture extends HandleRef {
  readonly __type: HandleType.TrackedTexture;
  width: number;
  height: number;
  texid: number;
  format: string;
  formatid: number;
}

/** Serialized TextureSnapshot - data props + handle (methods via IPC) */
export interface SerializedTextureSnapshot extends HandleRef {
  readonly __type: HandleType.TextureSnapshot;
  width: number;
  height: number;
  texid: number;
  detached: boolean;
  base: SerializedTrackedTexture;
}

/**
 * Serialized VertexArraySnapshot.
 * Although its interface is data-only, the actual object is a NAPI wrapper
 * that must be passed back to native methods (e.g. beginOverlay).
 * Uint8Array buffers transfer efficiently via structured clone.
 */
export interface SerializedVertexArraySnapshot extends HandleRef {
  readonly __type: HandleType.VertexArraySnapshot;
  base: { skipmask: number };
  indexBuffer: Uint8Array;
  attributes: RenderInput[];
}

/**
 * Serialized GlProgram.
 * Data-only interface but backed by a NAPI object that native methods
 * require by reference (e.g. beginOverlay). All data is included for
 * read access in the renderer.
 */
export interface SerializedGlProgram extends HandleRef {
  readonly __type: HandleType.GlProgram;
  programId: number;
  vertexShader: GlShaderSource;
  fragmentShader: GlShaderSource;
  computeShader: GlShaderSource;
  uniforms: GlUniformMeta[];
  uniformBufferSize: number;
  inputs: GlInputMeta[];
  skipmask: number;
}

/** Serialized RenderInvocation - replaces sub-object references with handles */
export interface SerializedRenderInvocation extends HandleRef {
  readonly __type: HandleType.RenderInvocation;
  program: SerializedGlProgram;
  uniformState: Uint8Array;
  samplers: { [location: number]: SerializedTextureSnapshot };
  textures: { [location: number]: SerializedTrackedTexture };
  vertexArray: SerializedVertexArraySnapshot;
  renderRanges: RenderRange[];
  renderMode: RenderMode | 'unknown';
  indexType: number;
  vertexObjectId: number;
  lastFrameTime: number;
  ownFrameTime: number;
  viewport: { x: number; y: number; width: number; height: number };
  framebufferColorTexture: SerializedTrackedTexture | undefined;
  framebufferColorTextureId: number;
  framebufferDepthTexture: SerializedTrackedTexture | undefined;
  framebufferDepthTextureId: number;
  framebufferId: number;
  framenr: number;
  computeTextures: { index: number; textureid: number; access: number; format: number }[];
  computeBuffers: { index: number; bufferid: number }[];
}

/** Serialized GlOverlay - opaque handle, all interaction via IPC */
export interface SerializedGlOverlay extends HandleRef {
  readonly __type: HandleType.GlOverlay;
}

/** Serialized StreamRenderObject - opaque handle, close/ended via IPC */
export interface SerializedStreamRenderObject extends HandleRef {
  readonly __type: HandleType.StreamRenderObject;
}

/** Serialized GlState - programs and textures replaced with handles */
export interface SerializedGlState {
  programs: { [id: number]: SerializedGlProgram };
  textures: { [id: number]: SerializedTrackedTexture };
}

// ============================================
// State Push
// ============================================

/** Cached RS client state pushed from main process at 10Hz */
export interface CachedRsState {
  ready: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hwnd: number;
}

// ============================================
// IPC Channel Names
// ============================================

export const IpcChannels = {
  // Root addon methods (renderer -> main, ipcRenderer.invoke)
  ROOT_CAPTURE: 'alt1gl:root:capture',
  ROOT_GET_RENDERER: 'alt1gl:root:getRenderer',
  ROOT_GET_OPENGL_STATE: 'alt1gl:root:getOpenGlState',
  ROOT_GET_GL_LOG_TOGGLES: 'alt1gl:root:getGlLogToggles',
  ROOT_SET_GL_LOG_TOGGLES: 'alt1gl:root:setGlLogToggles',

  // GL recording (renderer -> main, invoke)
  GL_RECORD_RENDER_CALLS: 'alt1gl:gl:recordRenderCalls',

  // Streaming (renderer -> main, invoke + send)
  STREAM_START: 'alt1gl:stream:start',
  STREAM_CLOSE: 'alt1gl:stream:close',

  // Overlay creation (renderer -> main, invoke)
  OVERLAY_CREATE_PROGRAM: 'alt1gl:overlay:createProgram',
  OVERLAY_CREATE_VERTEX_ARRAY: 'alt1gl:overlay:createVertexArray',
  OVERLAY_CREATE_TEXTURE: 'alt1gl:overlay:createTexture',
  OVERLAY_BEGIN_OVERLAY: 'alt1gl:overlay:beginOverlay',

  // Handle operations (renderer -> main, invoke)
  HANDLE_INVOKE: 'alt1gl:handle:invoke',
  HANDLE_DISPOSE: 'alt1gl:handle:dispose',

  // Debug methods (renderer -> main, invoke)
  DEBUG_GET_CWD: 'alt1gl:debug:getCwd',
  DEBUG_READ_DIR: 'alt1gl:debug:readDir',
  DEBUG_READ_FILE: 'alt1gl:debug:readFile',
  DEBUG_COPY_FILE: 'alt1gl:debug:copyFile',
  DEBUG_STAT: 'alt1gl:debug:stat',
  DEBUG_GET_EXE_PIDS: 'alt1gl:debug:getExePids',
  DEBUG_INJECT_DLL: 'alt1gl:debug:injectDll',
  DEBUG_CONNECT_OVERLAY: 'alt1gl:debug:connectOverlay',
  DEBUG_EXIT_DLL: 'alt1gl:debug:exitDll',
  DEBUG_GET_RS_HWND: 'alt1gl:debug:getRsHwnd',
  DEBUG_MEMORY_STATE: 'alt1gl:debug:memoryState',
  DEBUG_GET_ALL_GL_OBJECTS: 'alt1gl:debug:getAllGlObjects',
  DEBUG_GET_GL_OBJECT_STATS: 'alt1gl:debug:getGlObjectStats',
  DEBUG_RESET_OPENGL_STATE: 'alt1gl:debug:resetOpenGlState',
  DEBUG_KILL_MEMORY_SESSION: 'alt1gl:debug:killMemorySession',
  DEBUG_SET_LOG_CB: 'alt1gl:debug:setLogCb',

  // Callbacks (main -> renderer, webContents.send)
  CALLBACK_STREAM_DATA: 'alt1gl:callback:streamData',
  CALLBACK_STREAM_ENDED: 'alt1gl:callback:streamEnded',
  CALLBACK_GL_LOG: 'alt1gl:callback:glLog',
  CALLBACK_DEBUG_LOG: 'alt1gl:callback:debugLog',

  // State push (main -> renderer, webContents.send at 10Hz)
  STATE_UPDATE: 'alt1gl:state:update',

  // Mouse position (renderer -> main, invoke)
  MOUSE_GET_POSITION: 'alt1gl:mouse:getPosition',
} as const;

export type IpcChannel = typeof IpcChannels[keyof typeof IpcChannels];

// ============================================
// Handle Method Invocation
// ============================================

/** Request to invoke a method on a handled object */
export interface HandleInvokeRequest {
  handleId: string;
  method: string;
  args: unknown[];
}

/** Allowed methods per handle type (whitelist for security). Set for O(1) lookup. */
export const ALLOWED_HANDLE_METHODS: Record<HandleType, ReadonlySet<string>> = {
  [HandleType.TrackedTexture]: new Set(['capture', 'upload', 'getStaleRect']),
  [HandleType.TextureSnapshot]: new Set([
    'capture', 'captureInto', 'changesSince', 'isChild',
    'canCapture', 'unref', 'ref', 'dispose',
  ]),
  [HandleType.VertexArraySnapshot]: new Set<string>(),
  [HandleType.GlProgram]: new Set<string>(),
  [HandleType.GlOverlay]: new Set(['getUniformState', 'setUniformState', 'stop']),
  [HandleType.StreamRenderObject]: new Set(['close']),
  [HandleType.RenderInvocation]: new Set(['dispose']),
};
