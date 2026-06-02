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

## Next: Phase 2 remaining — preload → rs3buddy-api bridge
Replace the stub with a real bridge mapping the `NativeAddon` surface
(`recordRenderCalls`, `beginOverlay`, `getRsReady/Width/Height`, `debug.*`, etc.)
to rs3buddy-api's server/IPC so app windows use the engine. The `NativeAddon`
interface in `launcher/src/inject.ts` and `packages/alt1-launcher-api/src/types/native.ts`
are the contract. Also: package the engine bundle for shipping; multi-client engine instances.
