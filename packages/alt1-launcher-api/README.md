# alt1-launcher-api

TypeScript types and detection helpers for Alt1 Launcher apps. This package provides full type safety and runtime utilities for interacting with the Alt1GL native addon, hotkey system, and app window APIs.

## Installation

```bash
npm install alt1-launcher-api
```

## Quick Start

The simplest way to get started is to check if your app is running in Alt1GL, then access the available APIs:

```typescript
import { isAlt1GL, requireAlt1GL, requireHotkeys, Modifiers, Keys } from 'alt1-launcher-api';

// Check if running in Alt1GL
if (isAlt1GL()) {
  // Get the native addon for screen capture and game state
  const native = requireAlt1GL();

  // Check if the RuneScape client is connected
  if (native.getRsReady()) {
    console.log('RuneScape is ready!');
  }

  // Register a hotkey for your app
  const hotkeys = requireHotkeys();
  const hotkeyId = await hotkeys.register(
    Modifiers.Ctrl | Modifiers.Shift,
    Keys.R,
    'reload-data',
    () => console.log('Reload hotkey activated!')
  );
} else {
  console.warn('This app is not running in Alt1GL');
}
```


## Platform Support

Alt1GL works on both Windows and Linux, with the API being largely platform-agnostic. Most code works unchanged across both platforms, but there are important platform-specific differences to be aware of.

### Platform Implementation Details

**Windows**: Alt1GL uses DLL injection to hook directly into the RuneScape client for efficient screen capture and overlay communication.

**Linux**: Alt1GL uses `LD_PRELOAD` and shared memory (`/dev/shm`) for overlay communication since direct DLL injection is not available on Linux.

### Platform-Specific API Behavior

Some API methods behave differently depending on your platform:

| Method | Windows | Linux |
|--------|---------|-------|
| `getRsHwnd()` | Returns the window handle (HWND) | Returns 0 (HWND is a Windows concept) |
| `injectDll()` | Injects a DLL into the RuneScape process | Connects to shared memory instead |
| `connectToOverlay()` | Connects to the overlay | **Recommended for explicit Linux overlay connection** |

If you need to detect the platform at runtime, use the platform detection utilities:

```typescript
import { getPlatform, isWindows, isLinux } from 'alt1-launcher-api';

// Get the current platform
const platform = getPlatform(); // Returns 'windows' or 'linux'

// Use convenience functions
if (isWindows()) {
  console.log('Running on Windows - DLL injection available');
}

if (isLinux()) {
  console.log('Running on Linux - using LD_PRELOAD and shared memory');
  // Use connectToOverlay() for explicit overlay connection on Linux
}
```

### Windows-Only Features

The window handle (HWND) is only available on Windows. The `getRsHwnd()` method returns 0 on Linux:

```typescript
const native = requireAlt1GL();

// Windows: returns a valid window handle
// Linux: returns 0
const hwnd = native.getRsHwnd();

if (hwnd > 0) {
  // Safe to use HWND on Windows
  console.log(`Game window handle: ${hwnd}`);
}
```

### Linux-Specific Overlay Connection

On Linux, explicitly connect to the overlay using `connectToOverlay()`:

```typescript
const native = requireAlt1GL();

// Explicit overlay connection (recommended for Linux)
await native.connectToOverlay();

// Now you can use screen capture and other overlay features
const imageData = await native.capture(0, 100, 100, 200, 200);
```

### Cross-Platform Best Practices

1. **Use platform detection** - Check the platform at runtime if you have platform-specific code
2. **Gracefully handle missing features** - Always check return values (e.g., check if `hwnd > 0`)
3. **Test on both platforms** - Platform-agnostic code isn't guaranteed to work identically
4. **Use `connectToOverlay()` explicitly** - On Linux, this ensures proper overlay connection before using capture


### Native Build Architecture

Alt1GL builds platform-specific native libraries:

| Component | Windows | Linux |
|-----------|---------|-------|
| Node Addon | `addon.node` | `addon.node` |
| Injected Library | `injected.dll` | `injected.so` |
| Overlay Library | `overlay.dll` | `overlay.so` |

**Windows** uses:
- DLL injection via `injectDll()`
- Win32 API for window management (HWND)
- Named pipes for IPC

**Linux** uses:
- LD_PRELOAD for library loading
- Shared memory at `/dev/shm/alt1link_{pid}`
- X11 for window management
- POSIX IPC

Note: This package (`alt1-launcher-api`) provides **TypeScript types only**. The native libraries are bundled with the Alt1GL Launcher application.


## Core Concepts

### Detection Functions

All Alt1GL APIs are optional and only available when running inside the Alt1GL launcher. Use these functions to safely access them:

| Function | Returns | Throws |
|----------|---------|--------|
| `isAlt1GL()` | `boolean` | Never |
| `getNative()` | `Alt1GLNative \| null` | Never |
| `requireAlt1GL()` | `Alt1GLNative` | Yes, if not in Alt1GL |
| `getHotkeys()` | `HotkeyAPI \| null` | Never |
| `requireHotkeys()` | `HotkeyAPI` | Yes, if not in Alt1GL |
| `getAppWindow()` | `AppWindowAPI \| null` | Never |
| `requireAppWindow()` | `AppWindowAPI` | Yes, if not in Alt1GL |

The `require*` variants are useful when your app absolutely needs Alt1GL features. The `get*` variants let you gracefully handle running outside the launcher.

## API Reference

### Native Addon API

The native addon (`Alt1GLNative`) provides access to screen capture, game state, and renderer information.

#### Game State

```typescript
const native = requireAlt1GL();

// Check if RuneScape is connected
if (native.getRsReady()) {
  // Get game window dimensions and position
  const x = native.getRsX();
  const y = native.getRsY();
  const width = native.getRsWidth();
  const height = native.getRsHeight();

  // Windows only: get the window handle (returns 0 on Linux)
  const hwnd = native.getRsHwnd();
}
```

#### Screen Capture

Capture pixels directly from the game window or OpenGL textures:

```typescript
const native = requireAlt1GL();

// Capture from the main framebuffer (texid=0)
const imageData = await native.capture(0, 100, 100, 200, 200);

// Image data contains pixel information you can analyze
console.log(`Captured ${imageData.width}x${imageData.height} pixels`);
```

The `capture()` method can handle both synchronous and asynchronous returns depending on the platform.

#### Renderer Information

Access details about the OpenGL renderer:

```typescript
const native = requireAlt1GL();

const renderInfo = native.getRenderer();
if (renderInfo) {
  console.log(`GPU: ${renderInfo.glVendor} ${renderInfo.glRenderer}`);
  console.log(`OpenGL Version: ${renderInfo.glVersion}`);
  console.log(`GLSL Version: ${renderInfo.glShaderVersion}`);
  console.log(`Extensions: ${renderInfo.glExtensions.length} supported`);
}
```

#### OpenGL State Inspection

Query all currently tracked OpenGL objects:

```typescript
const native = requireAlt1GL();

const state = await native.getOpenGlState();

// Access textures and programs
Object.entries(state.textures).forEach(([texid, texture]) => {
  console.log(`Texture ${texid}: ${texture.width}x${texture.height} (${texture.format})`);
});
```

#### Recording Render Calls

For advanced analysis, record OpenGL render calls:

```typescript
const native = requireAlt1GL();

const renderCalls = await native.recordRenderCalls({
  // Optional filtering options
});

console.log(`Recorded ${renderCalls.length} render calls`);
```

### Hotkey API

Register global hotkeys for your app. Hotkeys work even when the app window is not focused.

#### Basic Registration

```typescript
const hotkeys = requireHotkeys();

// Register with modifier flags and key code
const hotkeyId = await hotkeys.register(
  Modifiers.Ctrl | Modifiers.Shift,  // Modifiers are flags that can be combined
  Keys.A,                              // Virtual key code
  'my-action',                         // Unique action identifier
  (event) => {
    console.log(`Hotkey triggered: ${event.action}`);
  }
);
```

#### Accelerator String Registration

You can also use human-readable Electron accelerator strings:

```typescript
const hotkeys = requireHotkeys();

// Supports common formats
await hotkeys.registerAccelerator(
  'Ctrl+Shift+A',
  'my-action',
  (event) => console.log('Hotkey pressed!')
);
```

#### Managing Hotkeys

```typescript
const hotkeys = requireHotkeys();

// Get all hotkeys registered by your app
const allHotkeys = await hotkeys.getAll();
allHotkeys.forEach(hk => {
  console.log(`${hk.action}: ${hk.accelerator} (${hk.enabled ? 'enabled' : 'disabled'})`);
});

// Enable or disable a specific hotkey
await hotkeys.setEnabled(hotkeyId, false);

// Unregister a hotkey
await hotkeys.unregister(hotkeyId);

// Check if global hotkeys are currently enabled in the system
const enabled = await hotkeys.isEnabled();
```

#### Event Listening

Listen for specific actions without registering a hotkey:

```typescript
const hotkeys = requireHotkeys();

// Listen for a specific action
const unsubscribe = hotkeys.onAction('my-action', (event) => {
  console.log('Action triggered:', event);
});

// Later, stop listening
unsubscribe();
```

### Modifier Keys and Key Codes

Constants are provided for common modifiers and keys:

```typescript
import { Modifiers, Keys } from 'alt1-launcher-api';

// Modifiers can be combined with bitwise OR
const ctrlShift = Modifiers.Ctrl | Modifiers.Shift;
const ctrlAltShift = Modifiers.Ctrl | Modifiers.Alt | Modifiers.Shift;

// Pre-combined modifiers are available
const ctrl = Modifiers.Ctrl;
const ctrlAlt = Modifiers.CtrlAlt;

// Many key codes are supported
Keys.A;              // Letter keys
Keys.Num0;           // Number keys (top row)
Keys.F1;             // Function keys
Keys.Space;          // Space bar
Keys.Enter;          // Enter key
Keys.Escape;         // Escape key
Keys.Tab;            // Tab key
Keys.Left;           // Arrow keys
Keys.Numpad0;        // Numpad keys
```

### App Window API

Control the app window and query game process information:

```typescript
import { requireAppWindow } from 'alt1-launcher-api';

const appWindow = requireAppWindow();

// Get the window title
const title = await appWindow.getTitle();
console.log(`Window title: ${title}`);

// Get the connected game process ID
const gamePid = await appWindow.getGamePid();
if (gamePid) {
  console.log(`Connected to game process: ${gamePid}`);
} else {
  console.log('Not connected to a game');
}

// Close the app window
appWindow.close();
```

## Advanced Patterns

### Safe API Access Pattern

For libraries or shared code that might run outside Alt1GL:

```typescript
import { getNative, getHotkeys } from 'alt1-launcher-api';

// Gracefully handle being called outside Alt1GL
function setupHotkey() {
  const hotkeys = getHotkeys();
  if (!hotkeys) {
    console.log('Hotkeys not available (not running in Alt1GL)');
    return;
  }

  hotkeys.register(0x04, 0x41, 'my-action', () => {
    // handle hotkey
  });
}

setupHotkey();
```

### Require Pattern

For apps that absolutely need Alt1GL:

```typescript
import { requireAlt1GL, requireHotkeys } from 'alt1-launcher-api';

// Fails fast if Alt1GL is not available
try {
  const native = requireAlt1GL();
  const hotkeys = requireHotkeys();

  // Your code here...
} catch (error) {
  console.error('Alt1GL is required to run this app');
  process.exit(1);
}
```

### Checking Runtime Availability

Some features may not be available on all platforms:

```typescript
const native = requireAlt1GL();

// Only available on Windows
const hwnd = native.getRsHwnd();
if (hwnd > 0) {
  // Window handle is available
}

// Check renderer info for advanced graphics features
const renderInfo = native.getRenderer();
if (renderInfo?.glExtensions.includes('GL_EXT_framebuffer_object')) {
  // Can use framebuffer objects
}
```

## Type Guards

Type guards are provided for checking object types:

```typescript
import {
  isTrackedTexture,
  isTextureSnapshot,
  isNativeAddonLoaded
} from 'alt1-launcher-api';

const someValue = getSomeValue();

if (isTrackedTexture(someValue)) {
  // someValue is TrackedTexture
  const snapshot = someValue.capture(0, 0, 100, 100);
}

if (isTextureSnapshot(someValue)) {
  // someValue is TextureSnapshot
  someValue.dispose();
}

if (isNativeAddonLoaded(someValue)) {
  // someValue is Alt1GLNative
  someValue.getRsReady();
}
```

## Global Type Augmentation

When you import this package, TypeScript will automatically augment the global types with Alt1GL APIs:

```typescript
// Available on globalThis
declare global {
  var alt1gl: Alt1GLNative | undefined;

  interface Window {
    alt1Hotkeys?: HotkeyAPI;
    alt1gl?: Alt1GLNative;
    appWindowApi?: AppWindowAPI;
    native?: Alt1GLNative;
  }
}
```

This allows you to safely access `window.alt1Hotkeys` and `globalThis.alt1gl` with full type safety.

## Examples

### Complete Hotkey Setup

```typescript
import {
  isAlt1GL,
  requireAlt1GL,
  requireHotkeys,
  Modifiers,
  Keys
} from 'alt1-launcher-api';

async function initializeApp() {
  if (!isAlt1GL()) {
    console.error('This app requires Alt1GL');
    return;
  }

  const native = requireAlt1GL();
  const hotkeys = requireHotkeys();

  // Wait for game to be ready
  if (!native.getRsReady()) {
    console.log('Waiting for RuneScape to connect...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Get game window info
  const gameWidth = native.getRsWidth();
  const gameHeight = native.getRsHeight();
  console.log(`Game window: ${gameWidth}x${gameHeight}`);

  // Register multiple hotkeys
  const reloadId = await hotkeys.register(
    Modifiers.Ctrl | Modifiers.Shift,
    Keys.R,
    'reload',
    () => location.reload()
  );

  const captureId = await hotkeys.register(
    Modifiers.Ctrl | Modifiers.Alt,
    Keys.S,
    'capture-screen',
    async () => {
      const img = await native.capture(0, 0, gameWidth, gameHeight);
      console.log('Captured screenshot');
    }
  );

  console.log('App initialized successfully');
}

initializeApp();
```

### Analyzing Screen Content

```typescript
import { requireAlt1GL } from 'alt1-launcher-api';

async function analyzeGameScreen() {
  const native = requireAlt1GL();

  // Capture a region of the screen
  const imageData = await native.capture(0, 100, 100, 300, 300);

  // Analyze pixels
  const data = imageData.data;
  let redPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Count pixels that are primarily red
    if (r > 200 && g < 100 && b < 100 && a > 200) {
      redPixels++;
    }
  }

  console.log(`Found ${redPixels} red pixels`);
}
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All APIs are fully typed for excellent IDE support and type safety.

```typescript
// Types are automatically available
import type {
  Alt1GLNative,
  TrackedTexture,
  TextureSnapshot,
  RenderInfo,
  HotkeyAPI,
  AppWindowAPI,
  Session,
  InstalledApp
} from 'alt1-launcher-api';

// Use them in your code
const renderInfo: RenderInfo | null = native.getRenderer();
```

## Compatibility

- **Node.js**: 14+
- **Browsers**: Modern browsers with ES2020 support
- **Alt1GL**: Version 2.0.0+

## License

MIT

## Related

- [Alt1 Launcher](https://github.com/alt1gl/launcher) - The Alt1GL launcher application
- [Alt1 Community](https://alt1.app) - Community resources and app directory
