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

## Next: Phase 2 — preload → rs3buddy-api bridge
Replace the stub with a real bridge mapping the `NativeAddon` surface
(`recordRenderCalls`, `beginOverlay`, `getRsReady/Width/Height`, `debug.*`, etc.)
to rs3buddy-api's server/IPC. The `NativeAddon` interface in `launcher/src/inject.ts`
and `packages/alt1-launcher-api/src/types/native.ts` are the contract.
