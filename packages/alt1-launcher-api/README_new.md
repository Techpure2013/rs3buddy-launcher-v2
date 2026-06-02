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

**Linux**: Alt1GL uses \`LD_PRELOAD\` and shared memory (\`/dev/shm\`) for overlay communication since direct DLL injection is not available on Linux.

### Platform-Specific API Behavior

Some API methods behave differently depending on your platform:

| Method | Windows | Linux |
|--------|---------|-------|
| \`getRsHwnd()\` | Returns the window handle (HWND) | Returns 0 (HWND is a Windows concept) |
| \`injectDll()\` | Injects a DLL into the RuneScape process | Connects to shared memory instead |
| \`connectToOverlay()\` | Connects to the overlay | **Recommended for explicit Linux overlay connection** |

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

The window handle (HWND) is only available on Windows. The \`getRsHwnd()\` method returns 0 on Linux:

```typescript
const native = requireAlt1GL();

// Windows: returns a valid window handle
// Linux: returns 0
const hwnd = native.getRsHwnd();

if (hwnd > 0) {
  // Safe to use HWND on Windows
  console.log(\`Game window handle: \${hwnd}\`);
}
```

### Linux-Specific Overlay Connection

On Linux, explicitly connect to the overlay using \`connectToOverlay()\`:

```typescript
const native = requireAlt1GL();

// Explicit overlay connection (recommended for Linux)
await native.connectToOverlay();

// Now you can use screen capture and other overlay features
const imageData = await native.capture(0, 100, 100, 200, 200);
```

### Cross-Platform Best Practices

1. **Use platform detection** - Check the platform at runtime if you have platform-specific code
2. **Gracefully handle missing features** - Always check return values (e.g., check if \`hwnd > 0\`)
3. **Test on both platforms** - Platform-agnostic code isn't guaranteed to work identically
4. **Use \`connectToOverlay()\` explicitly** - On Linux, this ensures proper overlay connection before using capture

### Native Build Architecture

Alt1GL builds platform-specific native libraries:

| Component | Windows | Linux |
|-----------|---------|-------|
| Node Addon | \`addon.node\` | \`addon.node\` |
| Injected Library | \`injected.dll\` | \`injected.so\` |
| Overlay Library | \`overlay.dll\` | \`overlay.so\` |

**Windows** uses:
- DLL injection via \`injectDll()\`
- Win32 API for window management (HWND)
- Named pipes for IPC

**Linux** uses:
- LD_PRELOAD for library loading
- Shared memory at \`/dev/shm/alt1link_{pid}\`
- X11 for window management
- POSIX IPC

Note: This package (\`alt1-launcher-api\`) provides **TypeScript types only**. The native libraries are bundled with the Alt1GL Launcher application.
