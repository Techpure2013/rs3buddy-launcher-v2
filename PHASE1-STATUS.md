# Phase 1 — Scaffold stripped shell: COMPLETE

Part of "RS3Buddy Launcher featuring RS3Buddy-API which supports multi-languaged
development" — replacing the launcher's old native (patchrs / injected / overlay)
with the rs3buddy-api engine. See
`rs3buddy-api/docs/specs/2026-06-01-launcher-engine-fusion-design.md`.

## What this repo is
A new repo (`rs3buddy-launcher-v2`) seeded from the RS3Buddy-launcher shell with
all old native stripped out. The Electron shell + web-app platform are intact; the
native engine is stubbed pending Phase 2.

## Done
- Seeded from launcher shell; stripped native: `injected/`, `overlay/`, `patchrs/`,
  `binding.gyp`, `build_injected.bat`, node-gyp build wiring, `node-addon-api`.
- `launcher/src/native-stub.ts` — a Proxy-based stub implementing the full
  `NativeAddon` interface (safe no-ops; reads return "not ready" sentinels).
- `loadNativeAddon()` (`launcher/src/inject.ts`) returns the stub; the real
  addon.node loader is preserved as a commented PHASE 2 block.
- `app-window/preload.ts` defaults `nativeAddon` to the stub so app windows load
  without an engine.

## Verified
- `npm run build:all` → exit 0 (tsc + esbuild, stub bundled into preload.js).
- `electron . --dev` boots and runs without crashing on missing native. Logs show:
  - `[Inject] Phase 1 stub active — native engine not wired yet.`
  - `[AddonManager] Initial getRsReady(): 0` → `[AddonManager] Initialized`
  - Full shell up: IPC handlers, process monitor, hotkeys, tray, RS client detected
    + registered (PID), news feed.
  - STDERR "Native addon or library not found" is the expected graceful message
    (informational, not a crash).

## Phase 2 Slice 1 — Toggle-gated engine injection (child process): COMPLETE
- rs3buddy-api: `sdk-host` bundled to a standalone engine process (webpack `sdk-host`
  entry → `rundir/js/sdk-host.bundle.js`). Runs under plain node; connects to RS3 +
  serves the HTTP API.
- Launcher engine module (`launcher/src/engine/`):
  - `engine-decision.ts` — pure toggle truth table (6 vitest cases).
  - `engine-controller.ts` — child-process lifecycle: spawn → wait for "SDK server
    live" stdout → active; early-exit/timeout → kill + detached+error (5 vitest cases).
  - `index.ts` — production singleton; spawns `node sdk-host.bundle.js` with
    RS3B_SDK_PORT (sibling rs3buddy-api checkout; override via RS3B_ENGINE_BUNDLE).
- Wired to the EXISTING autoInject toggle:
  - `main.ts` `injection-settings-changed` → enable/disableEngine.
  - `game.ts` game-detect (while toggle on) → enableEngine; `main.ts` game-stop → disableEngine.
- "Off means off" VERIFIED: boot with toggle default-off → no `[Engine] spawning`/
  `[Engine] live`; no engine child process. Tests: vitest `src/engine` 11/11 pass.
- Note: old inject path (`injectIntoProcess`/`reconnectToOverlay`) left in place
  (Phase 1 stub = no-op); its removal belongs to a later slice once the full API map lands.

## Phase 2 Slice 2 — Runtime engine auto-update: COMPLETE
- Engine ships independently of the launcher; users auto-get the latest versioned
  native at startup. No file copying, no launcher reinstall.
- Launcher engine module additions:
  - `engine-version.ts` — pure isNewer / parseVersionJson / assetUrl (7 tests).
  - `engine-download.ts` — redirect-following fetchText + downloadFile(progress).
  - `engine-updater.ts` — check `version.json` → download `engine.zip` → extract →
    verify bundle → atomically swap `<userData>/engine/current` (5 tests; offline-safe).
  - `index.ts` — `engineUpdater` singleton; `engineBundlePath()` now resolves the
    cached `<userData>/engine/current/sdk-host.bundle.js` (RS3B_ENGINE_BUNDLE still overrides).
  - `main.ts` — non-blocking `engineUpdater.checkAndUpdate()` at startup.
  - renderer banner (`renderer.ts` + `styles.css` + preload `onEngineUpdateProgress`):
    bottom progress bar while downloading; auto-dismiss; no banner if up to date.
- Distribution: `ENGINE_DIST_BASE` = `…/releases/latest/download/` (CDN, NOT the
  GitHub API — dodges the 60/hr rate limit; no token in the public launcher).
  Override via `RS3B_ENGINE_DIST_BASE` (mirror/proxy if the api repo goes private).
- rs3buddy-api: `npm run release:engine <version>` (`scripts/release-engine.mjs`)
  builds + publishes `engine.zip` + `version.json` as Release `engine-vX.Y.Z` to the
  public `Techpure2013/rs3buddy-engine` repo via local `gh` auth (tag and version.json
  aligned; no CI / token). See `rs3buddy-api/RELEASING.md`.
- VERIFIED: 23/23 vitest pass; build clean; offline boot → graceful
  `[Main] Engine update check: ECONNREFUSED`, launcher boots fine, no crash.
- Not yet proven E2E: real auto-update needs a published engine release (mocked + offline paths tested).

## Next: Phase 2 remaining — preload → rs3buddy-api app bridge
New HTTP-based apps consume the engine's API (the patchrs apps were dropped). When
apps need engine data, they call the rs3buddy-api HTTP server (the typed clients).
Also remaining: finishing the native occlusion/player-tracking engine itself;
overlay reconciliation (Phase 3); multi-client engine instances.
