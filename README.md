# RS3 Launcher Buddy

A standalone launcher and overlay for RuneScape. **Supports both Windows and Linux.**

## Download

Download the latest release from the [Releases page](https://github.com/Techpure2013/RS3LauncherBuddy/releases).

| Platform | Format |
|----------|--------|
| Windows | Portable `.exe` (no install required) |
| Linux | `.AppImage` |

Or [build from source](#building) for the latest development version.

## Features

- **Native Overlay** - Renders directly in the game's rendering context for zero-latency overlays
- **Auto-Update** - Automatically checks for new versions and updates in-place
- **Cross-Platform** - Full support for Windows and Linux (including Flatpak)
- **System Tray Integration** - Runs in background with greyed icon when no clients connected
- **Multi-Account Support** - Launch multiple characters with duplicate session prevention
- **Multi-Client Support** - Run multiple RS3 clients simultaneously; each client's app windows are isolated and won't interfere with each other
- **Named Toolbar Profiles** - Create multiple toolbar configurations (position, theme, scale, layout) and assign them to different characters or game clients
- **Resilient App Titlebar** - App window titlebars automatically recover if removed by single-page app navigation or DOM replacement
- **Built-in Apps** - Ships with RS3 Tile Marker, supports custom app development
- **Close to Tray** - X button minimizes to tray instead of quitting
- **Hotkey System** - Global hotkeys with full management UI:
  - Enable/disable hotkeys globally
  - "Only when RS focused" mode for game-specific hotkeys
  - Per-app hotkey display with rebinding support
  - Conflict detection with smart alternative suggestions
  - Conditional hotkeys - only active when their app is open
- **One-Click Install** - `alt1://` protocol for easy app installation
- **One-Click Jagex Launcher Setup** - Automated Flatpak installation on Linux with GPU detection
- **NPC Recorder** - Scan, identify, and catalog NPCs by buffer hash with variant support and auto-naming
- **Inventory Learner** - Automatically learns item names from hover tooltips using perceptual hashing (128-bit color+structure hash) for cross-session identification
- **IAT Watchdog** - Detects and repairs competing DLL hooks with tamper reporting
- **Instance Area Support** - Tile markers work in instanced dungeons/boss arenas with fingerprint-based auto-matching
- **FreeType Font Rendering** - Native anti-aliased text rendering in the overlay using embedded IBM Plex Sans

## Security Notice

**This application uses code injection to hook into the game's rendering pipeline.** Before you run for the hills, here's why and what it actually does:

### Why Code Injection?

The overlay needs to render directly on top of the RuneScape client. Unlike screen-capture based tools, we hook into the game's OpenGL rendering pipeline to:
- Draw overlays without screen capture latency
- Access game UI data directly from GPU textures
- Render at native frame rates

### Platform-Specific Approaches

| Platform | Method | Description |
|----------|--------|-------------|
| Windows | DLL Injection | Injects `injected.dll` and `overlay.dll` into the game process |
| Linux | LD_PRELOAD | Uses environment variable to load `overlay.so` at process start |

The Linux approach is more transparent - you can see exactly what libraries are being loaded via the `LD_PRELOAD` environment variable.

### What Does the Injected Code Do?

| Component | What It Does | Source Location |
|-----------|--------------|-----------------|
| `injected.dll` / `injected.so` | Hooks `SwapBuffers`/`eglSwapBuffers` to intercept frame rendering, provides texture/framebuffer access | [`injected/`](injected/) |
| `overlay.dll` / `overlay.so` | Renders toolbar, handles hotkeys, draws overlay graphics | [`overlay/`](overlay/) |
| Injection Protection (Windows) | Blocks other tools from injecting competing DLLs | [`injected/hooks/injection_protection.cpp`](injected/hooks/injection_protection.cpp) |

### What It Does NOT Do

- Does not send any data to external servers
- Does not modify game memory or game state
- Does not automate gameplay (no botting)
- Does not capture passwords or credentials
- Does not persist outside the game process

### Verify It Yourself

This project is fully open source. You can:
1. **Read the code** - Every file is available in this repository
2. **Build from source** - See build instructions below
3. **Check the hooks** - All hooked functions are in [`injected/hooks/`](injected/hooks/), [`overlay/src/platform/windows/hooks.cpp`](overlay/src/platform/windows/hooks.cpp), and [`overlay/src/platform/linux/hooks.c`](overlay/src/platform/linux/hooks.c)
4. **Review IPC** - Communication protocol is in [`overlay/src/ipc.cpp`](overlay/src/ipc.cpp) and [`overlay/src/platform/linux/ipc_posix.cpp`](overlay/src/platform/linux/ipc_posix.cpp)

### Key Files to Review

If you want to understand what's happening under the hood:

**Windows:**
- **Entry point**: [`injected/main.cpp`](injected/main.cpp) - DLL initialization
- **GL hooks**: [`injected/hooks/winhook.cpp`](injected/hooks/winhook.cpp) - SwapBuffers hook
- **Overlay rendering**: [`overlay/src/renderer.cpp`](overlay/src/renderer.cpp) - Drawing code
- **Launcher injection**: [`launcher/src/inject.ts`](launcher/src/inject.ts) - How injection works

**Linux:**
- **Entry point**: [`injected/main_linux.cpp`](injected/main_linux.cpp) - Shared library initialization
- **GL hooks**: [`overlay/src/platform/linux/hooks.c`](overlay/src/platform/linux/hooks.c) - eglSwapBuffers hook
- **IPC**: [`overlay/src/platform/linux/ipc_posix.cpp`](overlay/src/platform/linux/ipc_posix.cpp) - POSIX shared memory
- **Launcher**: [`launcher/src/game-linux.ts`](launcher/src/game-linux.ts) - LD_PRELOAD setup

---

## Linux Installation

Fully supports Linux with automated setup for the Jagex Launcher.

### Prerequisites

- **Flatpak** - Used to install and run the Jagex Launcher
- **X11** - The overlay requires X11 (Wayland is not yet supported)
- **OpenGL** - Your graphics drivers must support OpenGL

### One-Click Jagex Launcher Setup

Includes a built-in installer that automatically:

1. **Installs Flatpak** (if not present) - Prompts for your password via pkexec
2. **Adds the Flathub repository** - For 32-bit compatibility libraries
3. **Adds the JagexLauncher repository** - Community Flatpak from [USA-RedDragon](https://github.com/USA-RedDragon/jagex-launcher-linux-flatpak)
4. **Installs Jagex Launcher** (~1.3 GB) - Includes Wine runtime
5. **Installs 32-bit compatibility** (~108 MB) - `org.freedesktop.Platform.Compat.i386`
6. **Detects your GPU** - Automatically identifies NVIDIA, AMD, or Intel
7. **Installs correct 32-bit drivers**:
   - **NVIDIA**: Installs matching `GL32.nvidia-XXX-XX-XX` for your driver version
   - **AMD/Intel**: Installs `GL32.default` (Mesa drivers)

Just click "Install Jagex Launcher" in the settings and the setup process handles everything.

### Manual Flatpak Installation

If you prefer to install manually:

```bash
# Add the JagexLauncher repository
flatpak remote-add --user JagexLauncher https://jagexlauncher.flatpak.mcswain.dev/JagexLauncher.flatpakrepo

# Install the launcher
flatpak install --user JagexLauncher com.jagex.Launcher

# Install 32-bit compatibility
flatpak install --user flathub org.freedesktop.Platform.Compat.i386/x86_64/23.08

# Install 32-bit graphics drivers (choose one based on your GPU):
# For NVIDIA (replace XXX-XX-XX with your driver version, e.g., 570-195-03):
flatpak install --user flathub org.freedesktop.Platform.GL32.nvidia-XXX-XX-XX/x86_64/1.4

# For AMD/Intel:
flatpak install --user flathub org.freedesktop.Platform.GL32.default/x86_64/23.08
```

### Linux Desktop Integration

To have the launcher appear correctly in your desktop's application menu with its icon:

1. **Create a `.desktop` file** at `~/.local/share/applications/rs3-launcher-buddy.desktop`:

```ini
[Desktop Entry]
Name=RS3 Launcher Buddy
Comment=RS3 Launcher Buddy for RuneScape
Exec=/path/to/electron /path/to/RS3LauncherBuddy/launcher --class=rs3-launcher-buddy
Icon=rs3-launcher-buddy
Terminal=false
Type=Application
Categories=Game;
StartupWMClass=rs3-launcher-buddy
```

2. **Install the icon** to `~/.local/share/icons/hicolor/256x256/apps/`:

```bash
mkdir -p ~/.local/share/icons/hicolor/256x256/apps
cp /path/to/RS3LauncherBuddy/launcher/assets/icon.png ~/.local/share/icons/hicolor/256x256/apps/rs3-launcher-buddy.png
```

3. **Update the icon cache**:

```bash
gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor
```

The `--class=rs3-launcher-buddy` flag and `StartupWMClass=rs3-launcher-buddy` ensure your desktop environment correctly associates the running window with the launcher entry for proper taskbar/dock integration.

### Troubleshooting Linux

**Issue: "libssl.so.1.1 not found"**

The launcher automatically downloads legacy `libssl1.1` and `libSDL2` libraries if they're missing from your system. These are stored in `~/.local/share/alt1gl/lib/` and loaded via `LD_LIBRARY_PATH`.

**Issue: Overlay not appearing**

Check the log files:
```bash
# Check overlay library logs
ls -la /tmp/alt1gl_native_*.log /tmp/alt1gl_overlay_so_*.log

# View recent logs
tail -100 /tmp/alt1gl_native_$(pgrep -f rs2client).log
```

**Issue: GPU detection failed**

If NVIDIA drivers aren't detected, you can manually install the 32-bit driver:
```bash
# Check your driver version
nvidia-smi --query-gpu=driver_version --format=csv,noheader
# Example output: 570.195.03

# Install matching flatpak driver (replace dots with dashes)
flatpak install --user flathub org.freedesktop.Platform.GL32.nvidia-570-195-03/x86_64/1.4
```

---

## Project Structure

```
rs3-launcher-buddy/
├── launcher/              # Electron launcher application
│   ├── src/              # TypeScript source files
│   │   ├── game.ts       # Windows game management
│   │   ├── game-linux.ts # Linux game management (LD_PRELOAD)
│   │   ├── download.ts   # Game & Jagex Launcher download/install
│   │   └── ...
│   ├── assets/           # Icons and images
│   ├── builtin-apps/     # Compiled built-in apps (generated)
│   └── *.html            # HTML templates
├── overlay/              # OpenGL overlay library (C++)
│   ├── src/
│   │   ├── platform/
│   │   │   ├── windows/  # Windows-specific (DLL hooks)
│   │   │   └── linux/    # Linux-specific (LD_PRELOAD, POSIX IPC)
│   │   └── ...
│   └── include/          # Public headers
├── injected/             # GL hooks library
│   ├── hooks/            # Windows API hook implementations
│   ├── opengl/           # OpenGL function hooking
│   │   ├── gldefs.cpp       # Windows GL definitions
│   │   ├── gldefs_linux.cpp # Linux GL definitions
│   │   └── ...
│   ├── main.cpp          # Windows DLL entry point
│   └── main_linux.cpp    # Linux shared library entry point
├── patchrs/              # Native Node.js addon
│   ├── patchrs.cpp       # Windows implementation
│   └── patchrs_linux.cpp # Linux implementation
├── packages/             # NPM packages & built-in apps
│   ├── alt1-launcher-api/   # TypeScript types for app developers
│   ├── rs3-tile-marker/     # Built-in tile marker app (React)
│   ├── npc-recorder/        # NPC identification and cataloging
│   ├── inventory-learner/   # Inventory item learning via tooltips
│   ├── vos-reader/          # Voice of Seren auto-detection
│   ├── shared-data/         # Shared sprite hash & font data
│   └── gl-debug-app/        # OpenGL debug/inspection tool
├── shared/               # Shared protocol definitions
├── binding.gyp           # Node-gyp build config (multi-platform)
└── package.json          # Root package config
```

## Building

### Prerequisites

**All Platforms:**
- Node.js 18+
- Python 3.x (for node-gyp)
- Boost 1.90+ (headers only)

**Windows:**
- Visual Studio Build Tools 2022

**Linux:**
- GCC/G++ with C++17 support
- OpenGL development headers
- X11 development headers

```bash
# Ubuntu/Debian
sudo apt install build-essential libgl-dev libx11-dev libboost-dev

# Fedora
sudo dnf install gcc-c++ mesa-libGL-devel libX11-devel boost-devel

# Arch
sudo pacman -S base-devel mesa libx11 boost
```

### Installing Boost

Download Boost from https://www.boost.org/releases/latest/

**Windows - Option 1: Scoop (recommended)**
```powershell
scoop install boost
```

**Windows - Option 2: Manual Install**
1. Download `boost_1_90_0.zip` from the link above
2. Extract to `C:\boost` or your preferred location
3. Set environment variable:
   ```powershell
   [Environment]::SetEnvironmentVariable("BOOST_INCLUDEDIR", "C:\boost\boost_1_90_0", "User")
   ```

**Windows - Option 3: vcpkg**
```powershell
vcpkg install boost:x64-windows
```

**Linux:**
Boost headers are usually available via your package manager (see prerequisites above).

The build system auto-detects Boost in these locations:

**Windows:**
- `%BOOST_INCLUDEDIR%`
- `%USERPROFILE%\scoop\apps\boost\boost_1_90_0`
- `%BOOST_ROOT%\include`
- `%VCPKG_ROOT%\installed\x64-windows\include`

**Linux:**
- `/usr/include`
- `/usr/local/include`
- `$BOOST_INCLUDEDIR`

### Build Steps

```bash
# Install dependencies
npm install
cd launcher && npm install && cd ..

# Build native overlay library
npm run build:native

# Build built-in apps (RS3 Tile Marker)
npm run build:apps

# Build launcher
npm run build:launcher

# Or build everything (native + apps + launcher)
npm run build

# Quick build (launcher only, skip native/apps)
npm run build:quick
```

### Packaging

```bash
# Package for Windows (portable .exe)
npm run package:win

# Package for Linux (AppImage)
npm run package:linux

# Package for both platforms
npm run package:all
```

Output files are placed in `launcher/release/`.

### Built-in Apps

Built-in apps are located in `packages/` and compiled to `launcher/builtin-apps/`:

| App | Description |
|-----|-------------|
| **RS3 Tile Marker** | Mark tiles on the game world with instance area support |
| **NPC Recorder** | Scan, identify, and catalog NPCs with variant tracking |
| **Inventory Learner** | Auto-learn item names from tooltips with pHash matching |
| **VoS Reader** | Auto-detect Voice of Seren clans via GL sprite detection with wiki fallback |
| **Shared Data** | Shared sprite hash and font data served via alt1-builtin:// protocol |
| **GL Debug App** | Debug and inspect OpenGL render state |

```bash
# Build all built-in apps
npm run build:apps

# Or build a specific app
cd packages/rs3-tile-marker && npm install && npm run build
```

## Running

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Architecture

### Overlay Library

The overlay library is a standalone OpenGL rendering library that provides:

- **Toolbar rendering** with customizable themes and layouts
- **Menu system** with submenus, toggles, and checkmarks
- **Button/icon rendering** with app icons
- **Text rendering** with FreeType anti-aliased fonts (embedded IBM Plex Sans)
- **Click region management** for interactive overlays
- **Theme/color management** with 5 built-in themes
- **Auto-hide mode** with hover or click expansion
- **Hotkey management** via overlay menu

#### Toolbar Menu Structure

The overlay toolbar provides a hamburger menu with:

| Menu Item | Submenu | Description |
|-----------|---------|-------------|
| Apps | → App list | Launch installed apps |
| Theme | → Theme list | Switch between Dark, RuneScape, Transparent, etc. |
| Layout | → Size/Expand options | Compact, Normal, or Comfortable; Hover or Click expand |
| Menu Direction | → Auto/Down/Left/Right | Control where menus open |
| Lock Position | Toggle | Prevent accidental toolbar dragging |
| Auto-Hide | Toggle | Collapse toolbar when not in use |
| Hotkeys | → Hotkey settings | Enable/disable, view registered hotkeys |

It uses legacy OpenGL for compatibility with game contexts and can be integrated into any OpenGL application.

### Launcher

The launcher (`launcher/`) is an Electron application that:

- Manages game accounts
- Handles code injection (DLL on Windows, LD_PRELOAD on Linux)
- Configures the overlay
- Provides a UI for apps
- **Linux**: Installs Jagex Launcher via Flatpak with GPU detection

### Communication / IPC

The launcher communicates with the native overlay code via:

| Platform | Method | Location |
|----------|--------|----------|
| Windows | Named pipes | `\\.\pipe\alt1gl-*` |
| Linux | POSIX shared memory | `/dev/shm/alt1link_<pid>` |

The protocol is defined in `shared/protocol.h` and kept minimal for stability.

### Linux-Specific Architecture

On Linux, the overlay uses a different injection strategy:

1. **LD_PRELOAD**: The launcher sets `LD_PRELOAD=overlay.so` when starting the game
2. **EGL Hooking**: `overlay.so` intercepts `eglSwapBuffers` calls
3. **Shared Memory**: Creates `/dev/shm/alt1link_<pid>` for launcher communication
4. **GL Server**: Instance memory at `/dev/shm/alt1link_<pid>_inst_<n>`

This approach is more transparent than Windows DLL injection - you can see exactly what's being loaded by checking the `LD_PRELOAD` environment variable.

## Hotkey Management

Includes a comprehensive hotkey management system accessible from both the overlay toolbar and the launcher settings.

### Settings UI

The **Settings → Hotkeys** section provides:

| Feature | Description |
|---------|-------------|
| **Enable Hotkeys** | Global toggle to enable/disable all hotkeys |
| **Only When RS Focused** | When enabled, hotkeys only fire when the RuneScape window is active |
| **Per-App Hotkey List** | Shows each app's registered hotkeys with counts |
| **Rebind Support** | Click any hotkey to rebind it to a different key combination |

### Focus-Based Filtering

The "Only When RS Focused" setting is useful when:
- You use the same key combinations in other applications
- You want hotkeys to be game-specific
- You're alt-tabbing frequently between windows

When enabled, hotkeys are **suppressed** (not triggered) if the RS window isn't focused. You'll see log messages like:
```
[Hotkeys] Suppressed Ctrl+Shift+R - RS not focused
```

To allow hotkeys regardless of focus, uncheck "Only When RS Focused" in Settings → Hotkeys.

## Toolbar Profiles

Named toolbar profiles let you save different toolbar configurations and assign them per-character.

### Creating Profiles

In **Settings → Toolbar Profiles**, you can:

| Action | Description |
|--------|-------------|
| **Create** | Create a new profile with default toolbar settings |
| **Rename** | Give profiles meaningful names (e.g., "Main", "Alt", "Skiller") |
| **Delete** | Remove profiles you no longer need (at least one must remain) |

Each profile stores its own:
- Toolbar position (X, Y)
- Theme (Dark, RuneScape, Transparent, etc.)
- Layout (Compact, Normal, Comfortable)
- Scale and opacity
- Lock position and auto-hide settings

### Assigning Profiles to Characters

The **Character Assignments** section shows all available characters from:
- **Logged-in accounts** - Characters from your Jagex account sessions
- **Connected clients** - Game clients currently running (including non-login RS2 clients)

Click **Assign** or **Change** to select which profile a character should use. When that character's game client connects, the overlay automatically loads their assigned profile settings.

Assignments persist across sessions for logged-in characters. For non-login clients, profile assignment lasts for the current session.

### Multi-Client Behavior

When running multiple game clients:
- Each client uses its own profile's toolbar settings independently
- Dragging the toolbar on one client only updates that client's profile
- App windows are isolated per-client and won't reload when a new client connects

### Overlay Menu

From the in-game overlay toolbar:
1. Click the **Menu** button (hamburger icon)
2. Hover over **Hotkeys** to see:
   - Toggle to enable/disable all hotkeys
   - List of registered hotkeys by app
   - **Manage Hotkeys...** to open the full settings page

### Conflict Resolution

When an app tries to register a hotkey that's already in use:
1. A dialog appears showing the conflict
2. An alternative key combination is suggested (e.g., `Alt+` instead of `Ctrl+`)
3. You can accept the alternative or open settings to manually rebind

## Themes

Built-in themes:
- **Dark** - Dark background with green accents (default)
- **RuneScape** - Brown/gold theme matching RS3's style
- **Transparent** - Minimal, semi-transparent overlay
- **The Gwafa** - Community theme
- **The Nadayanayme** - Community theme

The launcher also includes Light theme in the settings UI.

Custom themes can be created via the API or config file.

## Developing Apps

Supports loading apps from localhost for easy development.

### App Config Format

Create an `appconfig.json` file:

```json
{
  "appName": "My Dev App",
  "description": "App in development",
  "appUrl": "index.html",
  "iconUrl": "icon.png",
  "defaultWidth": 400,
  "defaultHeight": 500,
  "minWidth": 200,
  "minHeight": 150
}
```

### Running a Dev Server

Start your dev server (e.g., Vite, webpack-dev-server, or simple HTTP server):

```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx serve -p 3000

# Using Vite
npm run dev
```

### Adding Your Dev App

In the launcher, add your app using your localhost URL:

```
http://localhost:3000/appconfig.json
```

Or just:

```
localhost:3000/appconfig.json
```

The launcher will:
- Automatically add `http://` if missing
- Resolve relative URLs (`appUrl`, `iconUrl`) against your dev server
- Show helpful errors if your server isn't running

### API Access

Apps have access to these APIs:

| API | Purpose |
|-----|---------|
| `window.alt1gl` | Native addon for GL capture and overlay rendering |
| `window.alt1Hotkeys` | Global hotkey registration |

#### Native Addon (`alt1gl`)

The native addon provides direct access to OpenGL capture and overlay:

```javascript
// Check if running in the launcher
if (window.alt1gl) {
  // Check if GL context is ready
  const ready = alt1gl.isGlReady();

  // Capture a region (returns ImageData-like object)
  const capture = alt1gl.capture(x, y, width, height);

  // Draw overlay text
  alt1gl.overlayText('Hello!', 0xFFFFFF, 16, 100, 100);
}
```

#### Hotkey API (`alt1Hotkeys`)

Register global hotkeys that work even when your app is in the background:

```javascript
const hotkeys = window.alt1Hotkeys;

// Register using modifier flags + key code
const id = await hotkeys.register(
  hotkeys.Modifiers.Ctrl | hotkeys.Modifiers.Shift,
  hotkeys.Keys.R,
  'reload-data',
  (event) => console.log('Hotkey pressed!')
);

// Or use Electron accelerator strings
const id2 = await hotkeys.registerAccelerator(
  'Alt+F1',
  'show-help',
  (event) => showHelp()
);

// Enable/disable hotkeys
await hotkeys.setEnabled(id, false);

// Unregister when done
await hotkeys.unregister(id);

// Check current settings
const settings = await hotkeys.getSettings();
console.log('Hotkeys enabled:', settings.globalEnabled);
console.log('Only when RS focused:', settings.onlyWhenRsFocused);

// Check if RS is currently focused
const focusState = await hotkeys.getFocusState();
if (focusState.isRsFocused) {
  console.log('RS window is active');
}

// Allow hotkeys even when RS not focused (app-specific override)
await hotkeys.setGlobalOverride(true);
```

**Available Modifiers:** `None`, `Ctrl`, `Alt`, `Shift`, `Win`, `CtrlAlt`, `CtrlShift`, `AltShift`, `CtrlAltShift`

**Available Keys:** `A-Z`, `Num0-9`, `F1-F12`, `Space`, `Enter`, `Tab`, `Escape`, `Arrow keys`, `Numpad`, and more.

### TypeScript Support

Install the `alt1-launcher-api` package for TypeScript types and detection helpers:

```bash
npm install alt1-launcher-api
```

```typescript
import { isAlt1GL, getHotkeys, Modifiers, Keys } from 'alt1-launcher-api';

if (isAlt1GL()) {
  const hotkeys = getHotkeys();
  if (hotkeys) {
    await hotkeys.register(
      Modifiers.Ctrl | Modifiers.Shift,
      Keys.R,
      'my-action',
      () => console.log('Triggered!')
    );
  }
}
```

### One-Click Install Links

Supports `alt1://` protocol URLs for one-click app installation. Add a link to your website:

```html
<a href="alt1://addapp/https://example.com/appconfig.json">
  Install My App
</a>
```

For localhost development:
```html
<a href="alt1://addapp/http://localhost:3000/appconfig.json">
  Install Dev App
</a>
```

When clicked, the launcher will:
1. Open (or focus if already running)
2. Fetch the app config
3. Add the app to the installed apps list
4. Immediately refresh the app list in the UI

## Configuration

The overlay reads its configuration from `alt1gl_overlay.json` in the user's config directory:

```json
{
  "theme": "dark",
  "position": "top-right",
  "offsetX": 10,
  "offsetY": 10,
  "visible": true,
  "expanded": false
}
```

## License

MIT
