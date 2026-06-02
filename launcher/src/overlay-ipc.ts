/**
 * Overlay IPC Client
 * Communicates with the injected overlay via:
 * - Windows: Named pipes (\\.\pipe\alt1gl-overlay-{pid})
 * - Linux: Unix domain sockets (/tmp/alt1gl-overlay-{pid})
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Get the appropriate socket/pipe path for the platform
function getSocketPath(pid: number): string {
  if (isWindows) {
    return `\\\\.\\pipe\\alt1gl-overlay-${pid}`;
  } else {
    // Linux uses Unix domain sockets in /tmp
    return `/tmp/alt1gl-overlay-${pid}`;
  }
}

// Message types - must match overlay/src/ipc.h
enum MsgType {
  // Overlay -> Launcher (events)
  HotkeyTriggered = 0x01,
  ToolbarClicked = 0x02,
  ContextReady = 0x03,
  MouseEvent = 0x04,
  ConfigChanged = 0x05,
  ToolbarDragged = 0x06,

  // Launcher -> Overlay (commands)
  RegisterHotkey = 0x10,
  UnregisterHotkey = 0x11,
  UpdateToolbar = 0x12,
  SetTheme = 0x13,
  AddButton = 0x14,
  RemoveButton = 0x15,
  SetVisible = 0x16,
  SetPosition = 0x17,
  SetConfig = 0x18,
  AddAppButton = 0x19,
  ClearAppButtons = 0x1A,
  SetScale = 0x1B,
  SetOpacity = 0x1C,
  SetLocked = 0x1D,
  SetAutoHide = 0x1E,
  SetOrientation = 0x1F,
  UpdateAppsMenu = 0x20,
  UpdateSettingsMenu = 0x21,
  SetLayout = 0x22,
  MenuItemClicked = 0x23,
  UpdateHotkeysMenu = 0x2A,
  SetFontTexture = 0x24,
  SetAppIcon = 0x25,
  ClearAppIcons = 0x26,
  SetAutoHideExpandMode = 0x27,
  SetHotkeysEnabled = 0x28,
  Shutdown = 0x29,  // Tell overlay to clean up and prepare for DLL unload
  MousePositionUpdate = 0x07,  // Mouse position update (overlay -> launcher)
  RequestUnload = 0x2B,  // Request overlay DLL to restore hooks and fully unload itself
}

// Auto-hide expand mode enum
export enum AutoHideExpandMode {
  Hover = 0,
  Click = 1
}

export interface OverlayConfig {
  posX?: number;
  posY?: number;
  anchor?: number;
  orientation?: number;
  scale?: number;
  opacity?: number;
  themeIndex?: number;
  locked?: boolean;
  autoHide?: boolean;
}

export interface ButtonClickEvent {
  buttonId: number;
  userData: string;
  pid: number;
}

export interface HotkeyEvent {
  hotkeyId: number;
  appId: string;
  action: string;
}

export interface ConfigChangedEvent {
  posX: number;
  posY: number;
  anchor: number;
  orientation: number;
  scale: number;
  opacity: number;
  themeIndex: number;
  locked: boolean;
  autoHide: boolean;
}

export interface MenuItem {
  id: number;
  label: string;
  userData?: string;
  enabled?: boolean;
  separator?: boolean;
  hasSubmenu?: boolean;
  checked?: boolean;
}

// Layout options
export enum ToolbarLayout {
  Compact = 0,     // 24px buttons
  Normal = 1,      // 32px buttons (default)
  Comfortable = 2, // 40px buttons
}

type ClickCallback = (event: ButtonClickEvent) => void;
type HotkeyCallback = (event: HotkeyEvent) => void;
type ConfigChangedCallback = (event: ConfigChangedEvent) => void;
type ContextReadyCallback = (width: number, height: number) => void;

class OverlayIpcClient {
  private socket: net.Socket | null = null;
  private connected = false;
  private targetPid: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private recvBuffer: Buffer = Buffer.alloc(0);
  private glReady = false; // True after ContextReady message received
  private lastMousePosition: { clientX: number; clientY: number; viewportW: number; viewportH: number; valid: boolean } | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15; // Stop after 15 failed attempts (~2 minutes with backoff)

  private clickCallback: ClickCallback | null = null;
  private hotkeyCallback: HotkeyCallback | null = null;
  private configChangedCallback: ConfigChangedCallback | null = null;
  private contextReadyCallback: ContextReadyCallback | null = null;

  // Queue for GL-related messages sent before context is ready
  private pendingGlMessages: Array<{ type: MsgType; payload: Buffer; large: boolean }> = [];

  connect(pid: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.targetPid = pid;
      const socketPath = getSocketPath(pid);

      console.log(`[OverlayIPC] Connecting to ${socketPath}...`);

      // Platform-specific socket/pipe existence check
      if (isWindows) {
        // Windows: Check if pipe exists using powershell
        const { exec } = require('child_process');
        exec(`powershell -Command "Get-ChildItem \\\\.\\pipe\\ | Where-Object { $_.Name -like '*alt1gl*' } | Select-Object -ExpandProperty Name"`, (error: any, stdout: string, stderr: string) => {
          if (stdout.trim()) {
            console.log(`[OverlayIPC] Found Alt1GL pipes: ${stdout.trim().split('\n').join(', ')}`);
          } else {
            console.log('[OverlayIPC] No Alt1GL pipes found in system');
          }
        });
      } else {
        // Linux: Check if socket file exists
        if (fs.existsSync(socketPath)) {
          console.log(`[OverlayIPC] Found socket file: ${socketPath}`);
        } else {
          console.log(`[OverlayIPC] Socket file not found: ${socketPath}`);
        }
      }

      let resolved = false;
      const resolveOnce = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      console.log('[OverlayIPC] Creating connection...');
      this.socket = net.createConnection(socketPath, () => {
        console.log('[OverlayIPC] Connected to overlay successfully!');
        this.connected = true;
        this.reconnectAttempts = 0;
        resolveOnce(true);
      });

      this.socket.on('data', (data) => this.handleData(data));

      this.socket.on('error', (err: NodeJS.ErrnoException) => {
        const errorDetails = {
          message: err.message,
          code: err.code,
          syscall: err.syscall,
        };
        console.log('[OverlayIPC] Connection error:', JSON.stringify(errorDetails));

        // Provide helpful messages for common errors
        if (err.code === 'ENOENT') {
          console.log('[OverlayIPC] Error: Pipe does not exist - overlay DLL may not have created it');
        } else if (err.code === 'ECONNREFUSED') {
          console.log('[OverlayIPC] Error: Connection refused - pipe exists but overlay not accepting connections');
        } else if (err.code === 'EPIPE') {
          console.log('[OverlayIPC] Error: Broken pipe - overlay disconnected');
        } else if (err.code === 'EAGAIN') {
          console.log('[OverlayIPC] Error: EAGAIN - overlay socket listen backlog full, overlay may still be initializing');
        }

        this.connected = false;
        resolveOnce(false);
      });

      this.socket.on('close', () => {
        console.log('[OverlayIPC] Connection closed');
        this.connected = false;
        this.scheduleReconnect();
      });

      this.socket.on('connect', () => {
        console.log('[OverlayIPC] Socket connect event fired');
      });

      this.socket.on('ready', () => {
        console.log('[OverlayIPC] Socket ready event fired');
      });

      this.socket.on('timeout', () => {
        console.log('[OverlayIPC] Socket timeout event fired');
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.connected && !resolved) {
          console.log('[OverlayIPC] Connection timeout after 5 seconds');
          console.log('[OverlayIPC] Socket state:', {
            connecting: this.socket?.connecting,
            destroyed: this.socket?.destroyed,
            readyState: this.socket?.readyState
          });
          this.socket?.destroy();
          resolveOnce(false);
        }
      }, 5000);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.targetPid) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[OverlayIPC] Giving up reconnect after ${this.reconnectAttempts} attempts for PID ${this.targetPid}`);
      this.targetPid = 0;
      return;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s, capped at 30s
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected && this.targetPid) {
        try {
          process.kill(this.targetPid, 0);
          console.log(`[OverlayIPC] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
          this.connect(this.targetPid);
        } catch {
          console.log(`[OverlayIPC] Process ${this.targetPid} no longer exists, stopping reconnect`);
          this.targetPid = 0;
        }
      }
    }, delay);
  }

  // Send shutdown command to overlay before disconnecting
  shutdown(): boolean {
    if (!this.connected || !this.socket) {
      return false;
    }
    console.log(`[OverlayIPC] Sending shutdown to PID ${this.targetPid}`);
    return this.send(MsgType.Shutdown, Buffer.alloc(0));
  }

  // Request the overlay DLL to restore all hooks and fully unload itself from the game process
  requestUnload(): boolean {
    if (!this.connected || !this.socket) {
      return false;
    }
    console.log(`[OverlayIPC] Sending RequestUnload to PID ${this.targetPid}`);
    return this.send(MsgType.RequestUnload, Buffer.alloc(0));
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.targetPid = 0;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.glReady = false;
    this.pendingGlMessages = [];
  }

  // Graceful shutdown: send shutdown message, wait briefly, then disconnect
  gracefulShutdown(): void {
    if (this.connected) {
      this.shutdown();
      // Give overlay a moment to clean up before destroying socket
      setTimeout(() => this.disconnect(), 100);
    } else {
      this.disconnect();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleData(data: Buffer): void {
    this.recvBuffer = Buffer.concat([this.recvBuffer, data]);

    while (this.recvBuffer.length >= 3) {
      const type = this.recvBuffer.readUInt8(0);
      const payloadSize = this.recvBuffer.readUInt16LE(1);

      if (this.recvBuffer.length < 3 + payloadSize) {
        break; // Wait for more data
      }

      const payload = this.recvBuffer.subarray(3, 3 + payloadSize);
      this.recvBuffer = this.recvBuffer.subarray(3 + payloadSize);

      this.handleMessage(type as MsgType, payload);
    }
  }

  private handleMessage(type: MsgType, payload: Buffer): void {
    switch (type) {
      case MsgType.ToolbarClicked: {
        if (payload.length >= 8) {
          const buttonId = payload.readInt32LE(0);
          const userDataLen = payload.readUInt32LE(4);
          const userData = payload.subarray(8, 8 + userDataLen).toString('utf8');
          console.log('[OverlayIPC] Button clicked:', buttonId, userData, 'hasCallback:', !!this.clickCallback);
          if (this.clickCallback) {
            console.log('[OverlayIPC] Invoking click callback for buttonId:', buttonId, 'userData:', userData);
            this.clickCallback({ buttonId, userData, pid: this.targetPid });
          } else {
            console.log('[OverlayIPC] WARNING: No click callback registered!');
          }
        } else {
          console.log('[OverlayIPC] Button clicked payload too short:', payload.length, 'expected >= 8');
        }
        break;
      }

      case MsgType.HotkeyTriggered: {
        if (payload.length >= 12) {
          const hotkeyId = payload.readInt32LE(0);
          const appIdLen = payload.readUInt32LE(4);
          const actionLen = payload.readUInt32LE(8);
          const appId = payload.subarray(12, 12 + appIdLen).toString('utf8');
          const action = payload.subarray(12 + appIdLen, 12 + appIdLen + actionLen).toString('utf8');
          console.log('[OverlayIPC] Hotkey triggered:', hotkeyId, appId, action);
          if (this.hotkeyCallback) {
            this.hotkeyCallback({ hotkeyId, appId, action });
          }
        }
        break;
      }

      case MsgType.ConfigChanged: {
        if (payload.length >= 17) {
          const event: ConfigChangedEvent = {
            posX: payload.readFloatLE(0),
            posY: payload.readFloatLE(4),
            anchor: payload.readUInt8(8),
            orientation: payload.readUInt8(9),
            scale: payload.readFloatLE(10),
            opacity: payload.readFloatLE(14),
            themeIndex: payload.readUInt8(18),
            locked: payload.readUInt8(19) !== 0,
            autoHide: payload.readUInt8(20) !== 0,
          };
          console.log('[OverlayIPC] Config changed:', event);
          if (this.configChangedCallback) {
            this.configChangedCallback(event);
          }
        }
        break;
      }

      case MsgType.ContextReady: {
        if (payload.length >= 12) {
          const processId = payload.readUInt32LE(0);
          const width = payload.readInt32LE(4);
          const height = payload.readInt32LE(8);
          console.log('[OverlayIPC] Context ready:', processId, width, height);

          // Mark GL ready
          this.glReady = true;

          // Flush queued GL messages with a small delay to ensure overlay
          // processes them on the next frame (after initialization is complete)
          const pendingMessages = [...this.pendingGlMessages];
          this.pendingGlMessages = [];

          if (pendingMessages.length > 0) {
            console.log(`[OverlayIPC] GL now ready, will flush ${pendingMessages.length} queued messages after short delay`);
            setTimeout(() => {
              console.log(`[OverlayIPC] Flushing ${pendingMessages.length} queued GL messages now`);
              for (const msg of pendingMessages) {
                const typeName = this.getMsgTypeName(msg.type);
                console.log(`[OverlayIPC] Sending queued message: type=0x${msg.type.toString(16)} (${typeName}), size=${msg.payload.length}`);
                if (msg.large) {
                  this.sendLarge(msg.type, msg.payload);
                } else {
                  this.send(msg.type, msg.payload);
                }
              }
            }, 100); // Wait 100ms (~6 frames at 60fps) for overlay to be fully ready
          }

          if (this.contextReadyCallback) {
            this.contextReadyCallback(width, height);
          }
        }
        break;
      }

      case MsgType.ToolbarDragged: {
        // Position changed by dragging - handled by ConfigChanged message
        break;
      }

      case MsgType.MousePositionUpdate: {
        // Physical pixel client coords from overlay DLL (GetCursorPos + ScreenToClient)
        if (payload.length >= 17) {
          this.lastMousePosition = {
            clientX: payload.readInt32LE(0),
            clientY: payload.readInt32LE(4),
            viewportW: payload.readInt32LE(8),
            viewportH: payload.readInt32LE(12),
            valid: payload.readUInt8(16) !== 0,
          };
        }
        break;
      }

      default:
        console.log('[OverlayIPC] Unknown message type:', type, 'payload length:', payload.length);
    }
  }

  private send(type: MsgType, payload: Buffer): boolean {
    if (!this.socket || !this.connected) {
      console.log('[OverlayIPC] send() failed: socket=', !!this.socket, 'connected=', this.connected, 'type=0x' + type.toString(16));
      return false;
    }

    const header = Buffer.alloc(3);
    header.writeUInt8(type, 0);
    header.writeUInt16LE(payload.length, 1);

    try {
      const fullMessage = Buffer.concat([header, payload]);
      const written = this.socket.write(fullMessage);
      console.log('[OverlayIPC] Sent message type=0x' + type.toString(16) + ' (' + this.getMsgTypeName(type) + ') payload=' + payload.length + ' bytes, write returned=' + written);
      return true;
    } catch (e) {
      console.error('[OverlayIPC] Send error:', e);
      return false;
    }
  }

  private getMsgTypeName(type: MsgType): string {
    const names: Record<number, string> = {
      0x10: 'RegisterHotkey',
      0x11: 'UnregisterHotkey',
      0x12: 'SetTheme',
      0x13: 'SetScale',
      0x14: 'SetOpacity',
      0x15: 'SetLocked',
      0x16: 'SetVisible',
      0x17: 'SetPosition',
      0x18: 'SetConfig',
      0x19: 'AddAppButton',
      0x1A: 'ClearAppButtons',
      0x1B: 'RemoveButton',
      0x1C: 'SetAutoHide',
      0x1D: 'SetAutoHideExpandMode',
      0x1E: 'SetHotkeysEnabled',
      0x1F: 'SetOrientation',
      0x20: 'UpdateAppsMenu',
      0x21: 'UpdateSettingsMenu',
      0x22: 'SetLayout',
      0x24: 'SetFontTexture',
      0x25: 'SetAppIcon',
      0x26: 'ClearAppIcons',
      0x29: 'Shutdown',
      0x2A: 'UpdateHotkeysMenu',
    };
    return names[type] || 'Unknown';
  }

  updateHotkeysMenu(items: MenuItem[]): boolean {
    return this.updateMenu(MsgType.UpdateHotkeysMenu, items);
  }

  // Commands

  setConfig(config: OverlayConfig): boolean {
    const payload = Buffer.alloc(21);
    payload.writeFloatLE(config.posX ?? 10, 0);
    payload.writeFloatLE(config.posY ?? 10, 4);
    payload.writeUInt8(config.anchor ?? 0, 8);
    payload.writeUInt8(config.orientation ?? 0, 9);
    payload.writeFloatLE(config.scale ?? 1.0, 10);
    payload.writeFloatLE(config.opacity ?? 0.95, 14);
    payload.writeUInt8(config.themeIndex ?? 0, 18);
    payload.writeUInt8(config.locked ? 1 : 0, 19);
    payload.writeUInt8(config.autoHide ? 1 : 0, 20);
    return this.send(MsgType.SetConfig, payload);
  }

  setTheme(themeIndex: number): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(themeIndex, 0);
    return this.send(MsgType.SetTheme, payload);
  }

  setVisible(visible: boolean): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(visible ? 1 : 0, 0);
    return this.send(MsgType.SetVisible, payload);
  }

  setPosition(x: number, y: number): boolean {
    const payload = Buffer.alloc(8);
    payload.writeFloatLE(x, 0);
    payload.writeFloatLE(y, 4);
    return this.send(MsgType.SetPosition, payload);
  }

  setScale(scale: number): boolean {
    const payload = Buffer.alloc(4);
    payload.writeFloatLE(scale, 0);
    return this.send(MsgType.SetScale, payload);
  }

  setOpacity(opacity: number): boolean {
    const payload = Buffer.alloc(4);
    payload.writeFloatLE(opacity, 0);
    return this.send(MsgType.SetOpacity, payload);
  }

  setLocked(locked: boolean): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(locked ? 1 : 0, 0);
    return this.send(MsgType.SetLocked, payload);
  }

  setAutoHide(autoHide: boolean): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(autoHide ? 1 : 0, 0);
    return this.send(MsgType.SetAutoHide, payload);
  }

  setAutoHideExpandMode(mode: AutoHideExpandMode): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(mode, 0);
    return this.send(MsgType.SetAutoHideExpandMode, payload);
  }

  setHotkeysEnabled(enabled: boolean): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(enabled ? 1 : 0, 0);
    return this.send(MsgType.SetHotkeysEnabled, payload);
  }

  setOrientation(orientation: number): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(orientation, 0);
    return this.send(MsgType.SetOrientation, payload);
  }

  setLayout(layout: ToolbarLayout): boolean {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(layout, 0);
    return this.send(MsgType.SetLayout, payload);
  }

  updateAppsMenu(items: MenuItem[]): boolean {
    return this.updateMenu(MsgType.UpdateAppsMenu, items);
  }

  updateSettingsMenu(items: MenuItem[]): boolean {
    return this.updateMenu(MsgType.UpdateSettingsMenu, items);
  }

  private updateMenu(msgType: MsgType, items: MenuItem[]): boolean {
    // Calculate total size needed
    let totalSize = 2; // itemCount (uint16)
    for (const item of items) {
      const labelBuf = Buffer.from(item.label || '', 'utf8');
      const userDataBuf = Buffer.from(item.userData || '', 'utf8');
      // MenuItemPayload: id(4) + enabled(1) + separator(1) + hasSubmenu(1) + checked(1) + labelLen(2) + userDataLen(2) = 12
      totalSize += 12 + labelBuf.length + userDataBuf.length;
    }

    const payload = Buffer.alloc(totalSize);
    let offset = 0;

    // Write item count
    payload.writeUInt16LE(items.length, offset);
    offset += 2;

    // Write each item
    for (const item of items) {
      const labelBuf = Buffer.from(item.label || '', 'utf8');
      const userDataBuf = Buffer.from(item.userData || '', 'utf8');

      payload.writeInt32LE(item.id, offset); offset += 4;
      payload.writeUInt8(item.enabled !== false ? 1 : 0, offset); offset += 1;
      payload.writeUInt8(item.separator ? 1 : 0, offset); offset += 1;
      payload.writeUInt8(item.hasSubmenu ? 1 : 0, offset); offset += 1;
      payload.writeUInt8(item.checked ? 1 : 0, offset); offset += 1;
      payload.writeUInt16LE(labelBuf.length, offset); offset += 2;
      payload.writeUInt16LE(userDataBuf.length, offset); offset += 2;
      labelBuf.copy(payload, offset); offset += labelBuf.length;
      userDataBuf.copy(payload, offset); offset += userDataBuf.length;
    }

    return this.send(msgType, payload);
  }

  addAppButton(buttonId: number, label: string, userData: string): boolean {
    const labelBuf = Buffer.from(label, 'utf8');
    const userDataBuf = Buffer.from(userData, 'utf8');
    const payload = Buffer.alloc(12 + labelBuf.length + userDataBuf.length);

    payload.writeInt32LE(buttonId, 0);
    payload.writeUInt32LE(labelBuf.length, 4);
    payload.writeUInt32LE(userDataBuf.length, 8);
    labelBuf.copy(payload, 12);
    userDataBuf.copy(payload, 12 + labelBuf.length);

    return this.send(MsgType.AddAppButton, payload);
  }

  removeButton(buttonId: number): boolean {
    const payload = Buffer.alloc(4);
    payload.writeInt32LE(buttonId, 0);
    return this.send(MsgType.RemoveButton, payload);
  }

  clearAppButtons(): boolean {
    return this.send(MsgType.ClearAppButtons, Buffer.alloc(0));
  }

  registerHotkey(appId: string, modifiers: number, keyCode: number, action: string): boolean {
    const appIdBuf = Buffer.from(appId, 'utf8');
    const actionBuf = Buffer.from(action, 'utf8');
    const payload = Buffer.alloc(16 + appIdBuf.length + actionBuf.length);

    payload.writeUInt32LE(modifiers, 0);
    payload.writeUInt32LE(keyCode, 4);
    payload.writeUInt32LE(appIdBuf.length, 8);
    payload.writeUInt32LE(actionBuf.length, 12);
    appIdBuf.copy(payload, 16);
    actionBuf.copy(payload, 16 + appIdBuf.length);

    return this.send(MsgType.RegisterHotkey, payload);
  }

  unregisterHotkey(appId: string, action: string): boolean {
    const appIdBuf = Buffer.from(appId, 'utf8');
    const actionBuf = Buffer.from(action, 'utf8');
    const payload = Buffer.alloc(8 + appIdBuf.length + actionBuf.length);

    payload.writeUInt32LE(appIdBuf.length, 0);
    payload.writeUInt32LE(actionBuf.length, 4);
    appIdBuf.copy(payload, 8);
    actionBuf.copy(payload, 8 + appIdBuf.length);

    return this.send(MsgType.UnregisterHotkey, payload);
  }

  /**
   * Send font texture to overlay
   * Header: textureWidth(4) + textureHeight(4) + glyphWidth(4) + glyphHeight(4) +
   *         firstChar(4) + lastChar(4) + charsPerRow(4) + charWidthsSize(4) = 32 bytes
   * Followed by RGBA pixel data, then charWidths array
   */
  sendFontTexture(
    textureWidth: number,
    textureHeight: number,
    glyphWidth: number,
    glyphHeight: number,
    firstChar: number,
    lastChar: number,
    charsPerRow: number,
    pixels: Uint8Array,
    charWidths?: Uint8Array
  ): boolean {
    const headerSize = 32;
    const charWidthsSize = charWidths ? charWidths.length : 0;
    const payload = Buffer.alloc(headerSize + pixels.length + charWidthsSize);

    payload.writeUInt32LE(textureWidth, 0);
    payload.writeUInt32LE(textureHeight, 4);
    payload.writeUInt32LE(glyphWidth, 8);
    payload.writeUInt32LE(glyphHeight, 12);
    payload.writeUInt32LE(firstChar, 16);
    payload.writeUInt32LE(lastChar, 20);
    payload.writeUInt32LE(charsPerRow, 24);
    payload.writeUInt32LE(charWidthsSize, 28);
    payload.set(pixels, headerSize);
    if (charWidths && charWidthsSize > 0) {
      payload.set(charWidths, headerSize + pixels.length);
    }

    // Queue if GL not ready yet
    if (!this.glReady) {
      console.log('[OverlayIPC] GL not ready, queuing SetFontTexture message');
      this.pendingGlMessages.push({ type: MsgType.SetFontTexture, payload, large: true });
      return true;
    }

    // Use extended send for large payloads
    return this.sendLarge(MsgType.SetFontTexture, payload);
  }

  // Send app icon texture to overlay
  sendAppIcon(appId: number, width: number, height: number, pixels: Uint8Array): boolean {
    const headerSize = 12; // appId (4) + width (4) + height (4)
    const payload = Buffer.alloc(headerSize + pixels.length);

    payload.writeInt32LE(appId, 0);
    payload.writeUInt32LE(width, 4);
    payload.writeUInt32LE(height, 8);
    payload.set(pixels, headerSize);

    // Queue if GL not ready yet
    if (!this.glReady) {
      console.log(`[OverlayIPC] GL not ready, queuing SetAppIcon message for appId=${appId}`);
      this.pendingGlMessages.push({ type: MsgType.SetAppIcon, payload, large: true });
      return true;
    }

    return this.sendLarge(MsgType.SetAppIcon, payload);
  }

  // Clear all app icons from overlay
  clearAppIcons(): boolean {
    // Queue if GL not ready yet (needs GL context to delete textures)
    if (!this.glReady) {
      console.log('[OverlayIPC] GL not ready, queuing ClearAppIcons message');
      this.pendingGlMessages.push({ type: MsgType.ClearAppIcons, payload: Buffer.alloc(0), large: false });
      return true;
    }
    return this.send(MsgType.ClearAppIcons, Buffer.alloc(0));
  }

  // Extended send for large payloads (uses 32-bit length instead of 16-bit)
  private sendLarge(type: MsgType, payload: Buffer): boolean {
    if (!this.socket || !this.connected) {
      return false;
    }

    // Header: type (1) + length marker 0xFFFF (2) + actual length (4) = 7 bytes
    const header = Buffer.alloc(7);
    header.writeUInt8(type, 0);
    header.writeUInt16LE(0xFFFF, 1);  // Marker for extended length
    header.writeUInt32LE(payload.length, 3);

    try {
      this.socket.write(Buffer.concat([header, payload]));
      return true;
    } catch (e) {
      console.error('[OverlayIPC] Send error:', e);
      return false;
    }
  }

  // Callbacks

  setClickCallback(callback: ClickCallback | null): void {
    this.clickCallback = callback;
  }

  setHotkeyCallback(callback: HotkeyCallback | null): void {
    this.hotkeyCallback = callback;
  }

  setConfigChangedCallback(callback: ConfigChangedCallback | null): void {
    this.configChangedCallback = callback;
  }

  setContextReadyCallback(callback: ContextReadyCallback | null): void {
    this.contextReadyCallback = callback;
  }

  isGlReady(): boolean {
    return this.glReady;
  }

  /** Get latest mouse position from overlay DLL (physical pixel client coords) */
  getMousePosition(): { clientX: number; clientY: number; viewportW: number; viewportH: number } | null {
    if (!this.lastMousePosition || !this.lastMousePosition.valid) return null;
    return this.lastMousePosition;
  }
}

// Multi-client management
const overlayClients: Map<number, OverlayIpcClient> = new Map();
let activeClientPid: number = 0;

// Legacy singleton for backwards compatibility
const overlayIpc = new OverlayIpcClient();

// Get or create client for a PID
function getOrCreateClient(pid: number): OverlayIpcClient {
  let client = overlayClients.get(pid);
  if (!client) {
    client = new OverlayIpcClient();
    overlayClients.set(pid, client);
  }
  return client;
}

// Get active client
function getActiveClient(): OverlayIpcClient | null {
  if (activeClientPid === 0) return null;
  return overlayClients.get(activeClientPid) || null;
}

// Connect to a specific client by PID
export async function connectToOverlay(pid: number): Promise<boolean> {
  const client = getOrCreateClient(pid);
  const success = await client.connect(pid);
  if (success) {
    activeClientPid = pid;
    console.log(`[OverlayIPC] Connected to client PID ${pid}, now active`);
  }
  return success;
}

// Disconnect a specific client
export function disconnectOverlayClient(pid: number): void {
  const client = overlayClients.get(pid);
  if (client) {
    client.gracefulShutdown();
    overlayClients.delete(pid);
    console.log(`[OverlayIPC] Disconnected client PID ${pid}`);
    // If this was the active client, find another or clear
    if (activeClientPid === pid) {
      const remainingPids = Array.from(overlayClients.keys());
      activeClientPid = remainingPids.length > 0 ? remainingPids[0] : 0;
      console.log(`[OverlayIPC] Active client now: ${activeClientPid || 'none'}`);
    }
  }
}

// Disconnect all clients (legacy compatibility)
export function disconnectOverlay(): void {
  for (const [, client] of overlayClients) {
    client.gracefulShutdown();
  }
  overlayClients.clear();
  activeClientPid = 0;
}

// Silently disconnect all clients without sending Shutdown message.
// The DLL detects the broken pipe and goes back to listening for new connections.
// Toolbar and hotkeys stay active in the game - launcher can reconnect later.
export function silentDisconnectOverlay(): void {
  for (const [, client] of overlayClients) {
    client.disconnect();
  }
  overlayClients.clear();
  activeClientPid = 0;
}

// Shutdown all overlays and wait for cleanup (call on app exit)
export async function shutdownAllOverlays(): Promise<void> {
  console.log('[OverlayIPC] Shutting down all overlays...');
  const clientPids = Array.from(overlayClients.keys());
  const clients = Array.from(overlayClients.values());

  console.log(`[OverlayIPC] Found ${clients.length} overlay client(s) to shut down, PIDs: ${clientPids.join(', ')}`);

  // Send RequestUnload to all connected clients (preferred) or fall back to Shutdown
  // RequestUnload tells the DLL to: restore IAT hooks -> shutdown overlay -> FreeLibraryAndExitThread
  let unloadsSent = 0;
  for (const client of clients) {
    if (client.isConnected()) {
      const sent = client.requestUnload();
      if (sent) {
        unloadsSent++;
        console.log(`[OverlayIPC] RequestUnload message sent to PID`);
      } else {
        // Fall back to regular shutdown if requestUnload fails
        const shutdownSent = client.shutdown();
        console.log(`[OverlayIPC] Fallback Shutdown message sent: ${shutdownSent}`);
      }
    } else {
      console.log('[OverlayIPC] Client not connected, skipping unload message');
    }
  }

  console.log(`[OverlayIPC] Sent ${unloadsSent} RequestUnload message(s)`);

  // Wait for overlays to fully unload themselves
  // The DLL needs time to: restore IAT patches, stop rendering, close IPC pipe, FreeLibraryAndExitThread
  // Give more time than before since the DLL is doing a full self-unload
  const waitTime = unloadsSent > 0 ? 1500 : 100;
  console.log(`[OverlayIPC] Waiting ${waitTime}ms for overlay DLL self-unload...`);
  await new Promise(resolve => setTimeout(resolve, waitTime));

  // Now disconnect all (sockets may already be closed if DLL unloaded)
  for (const client of clients) {
    try {
      client.disconnect();
    } catch (e) {
      // Socket may already be closed if DLL unloaded successfully
      console.log('[OverlayIPC] Client disconnect (may already be closed):', e);
    }
  }

  overlayClients.clear();
  activeClientPid = 0;
  console.log('[OverlayIPC] All overlays shut down and ejected');
}

// Check if any overlay is connected
export function isOverlayConnected(): boolean {
  return activeClientPid !== 0 && (getActiveClient()?.isConnected() ?? false);
}

// Check if a specific PID is connected
export function isOverlayConnectedToPid(pid: number): boolean {
  return overlayClients.get(pid)?.isConnected() ?? false;
}

// Get all connected client PIDs
export function getConnectedOverlayPids(): number[] {
  return Array.from(overlayClients.entries())
    .filter(([_, client]) => client.isConnected())
    .map(([pid, _]) => pid);
}

// Get count of connected clients
export function getConnectedOverlayCount(): number {
  return getConnectedOverlayPids().length;
}

// Helper to broadcast to all connected clients
function broadcastToAll<T>(fn: (client: OverlayIpcClient) => T): T | false {
  const client = getActiveClient();
  if (!client) return false;
  return fn(client);
}

// Config/settings - apply to active client
export function setOverlayConfig(config: OverlayConfig): boolean {
  return broadcastToAll(c => c.setConfig(config)) as boolean ?? false;
}

export function setOverlayTheme(themeIndex: number): boolean {
  return broadcastToAll(c => c.setTheme(themeIndex)) as boolean ?? false;
}

export function setOverlayVisible(visible: boolean): boolean {
  return broadcastToAll(c => c.setVisible(visible)) as boolean ?? false;
}

export function setOverlayPosition(x: number, y: number): boolean {
  return broadcastToAll(c => c.setPosition(x, y)) as boolean ?? false;
}

export function setOverlayScale(scale: number): boolean {
  return broadcastToAll(c => c.setScale(scale)) as boolean ?? false;
}

export function setOverlayOpacity(opacity: number): boolean {
  return broadcastToAll(c => c.setOpacity(opacity)) as boolean ?? false;
}

export function setOverlayLocked(locked: boolean): boolean {
  return broadcastToAll(c => c.setLocked(locked)) as boolean ?? false;
}

export function setOverlayAutoHide(autoHide: boolean): boolean {
  return broadcastToAll(c => c.setAutoHide(autoHide)) as boolean ?? false;
}

export function setOverlayAutoHideExpandMode(mode: AutoHideExpandMode): boolean {
  return broadcastToAll(c => c.setAutoHideExpandMode(mode)) as boolean ?? false;
}

export function setOverlayHotkeysEnabled(enabled: boolean): boolean {
  return broadcastToAll(c => c.setHotkeysEnabled(enabled)) as boolean ?? false;
}

export function addOverlayAppButton(buttonId: number, label: string, userData: string): boolean {
  return broadcastToAll(c => c.addAppButton(buttonId, label, userData)) as boolean ?? false;
}

export function removeOverlayButton(buttonId: number): boolean {
  return broadcastToAll(c => c.removeButton(buttonId)) as boolean ?? false;
}

export function clearOverlayAppButtons(): boolean {
  return broadcastToAll(c => c.clearAppButtons()) as boolean ?? false;
}

export function registerOverlayHotkey(appId: string, modifiers: number, keyCode: number, action: string): boolean {
  return broadcastToAll(c => c.registerHotkey(appId, modifiers, keyCode, action)) as boolean ?? false;
}

export function unregisterOverlayHotkey(appId: string, action: string): boolean {
  return broadcastToAll(c => c.unregisterHotkey(appId, action)) as boolean ?? false;
}

// Callbacks are set on the active client
export function setOverlayClickCallback(callback: ClickCallback | null): void {
  const client = getActiveClient();
  if (client) {
    console.log('[OverlayIPC] Setting click callback on active client PID:', activeClientPid);
    client.setClickCallback(callback);
  } else {
    console.log('[OverlayIPC] WARNING: No active client to set click callback on! activeClientPid:', activeClientPid);
  }
}

export function setOverlayHotkeyCallback(callback: HotkeyCallback | null): void {
  const client = getActiveClient();
  if (client) client.setHotkeyCallback(callback);
}

export function setOverlayConfigChangedCallback(callback: ConfigChangedCallback | null): void {
  const client = getActiveClient();
  if (client) client.setConfigChangedCallback(callback);
}

export function setOverlayContextReadyCallback(callback: ContextReadyCallback | null): void {
  const client = getActiveClient();
  if (client) client.setContextReadyCallback(callback);
}

export function isOverlayGlReady(): boolean {
  const client = getActiveClient();
  return client?.isGlReady() ?? false;
}

/** Get latest mouse position from overlay DLL (physical pixel client coords, no DPI issues) */
export function getOverlayMousePosition(): { clientX: number; clientY: number; viewportW: number; viewportH: number } | null {
  const client = getActiveClient();
  return client?.getMousePosition() ?? null;
}

/** Get mouse position from a specific overlay client by PID */
export function getOverlayMousePositionForPid(pid: number): { clientX: number; clientY: number; viewportW: number; viewportH: number } | null {
  const client = overlayClients.get(pid);
  return client?.getMousePosition() ?? null;
}

export function setOverlayLayout(layout: ToolbarLayout): boolean {
  return broadcastToAll(c => c.setLayout(layout)) as boolean ?? false;
}

export function updateOverlayAppsMenu(items: MenuItem[]): boolean {
  return broadcastToAll(c => c.updateAppsMenu(items)) as boolean ?? false;
}

export function updateOverlaySettingsMenu(items: MenuItem[]): boolean {
  return broadcastToAll(c => c.updateSettingsMenu(items)) as boolean ?? false;
}

export function updateOverlayHotkeysMenu(items: MenuItem[]): boolean {
  return broadcastToAll(c => c.updateHotkeysMenu(items)) as boolean ?? false;
}

export function sendOverlayFontTexture(
  textureWidth: number,
  textureHeight: number,
  glyphWidth: number,
  glyphHeight: number,
  firstChar: number,
  lastChar: number,
  charsPerRow: number,
  pixels: Uint8Array,
  charWidths?: Uint8Array
): boolean {
  return broadcastToAll(c => c.sendFontTexture(
    textureWidth, textureHeight, glyphWidth, glyphHeight,
    firstChar, lastChar, charsPerRow, pixels, charWidths
  )) as boolean ?? false;
}

export function sendOverlayAppIcon(
  appId: number,
  width: number,
  height: number,
  pixels: Uint8Array
): boolean {
  return broadcastToAll(c => c.sendAppIcon(appId, width, height, pixels)) as boolean ?? false;
}

export function clearOverlayAppIcons(): boolean {
  return broadcastToAll(c => c.clearAppIcons()) as boolean ?? false;
}

/**
 * Wait for ContextReady message from a specific overlay client
 * Returns true if ContextReady was received, false on timeout
 */
export function waitForContextReady(pid: number, timeoutMs: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const client = overlayClients.get(pid);
    if (!client) {
      console.log(`[OverlayIPC] waitForContextReady: No client for PID ${pid}`);
      resolve(false);
      return;
    }

    // If already GL ready, resolve immediately
    if (client.isGlReady()) {
      console.log(`[OverlayIPC] waitForContextReady: Already GL ready for PID ${pid}`);
      resolve(true);
      return;
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`[OverlayIPC] waitForContextReady: Timeout waiting for PID ${pid}`);
        // Remove the callback
        client.setContextReadyCallback(null);
        resolve(false);
      }
    }, timeoutMs);

    // Set up callback to resolve when ContextReady is received
    client.setContextReadyCallback((width, height) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`[OverlayIPC] waitForContextReady: Received ContextReady ${width}x${height} for PID ${pid}`);
        // Clear the callback - we only needed it once
        client.setContextReadyCallback(null);
        resolve(true);
      }
    });

    console.log(`[OverlayIPC] waitForContextReady: Waiting for ContextReady from PID ${pid} (timeout: ${timeoutMs}ms)`);
  });
}

// Export for backwards compatibility (not recommended for multi-client)
export { overlayIpc };
