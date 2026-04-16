# ADR 0005: Performance Budget

## Status

Accepted

## Context

Phase 2 implementation is complete, but the repo still does not have exact multi-hardware FPS captures or a dedicated long-duration globe-only soak artifact. Close-out authority therefore has to record the evidence that actually exists now rather than restating the Phase 0 plan.

Evidence:

- A local `npm run build` on `2026-04-16` produced `dist/assets/index-0Zb1XPjf.js` at `4,057.61 kB` minified / `1,086.78 kB` gzip and `dist/assets/index-B59-uA_5.css` at `24.53 kB` / `5.51 kB` gzip.
- The same build copied `389` Cesium runtime items and produced `7.8M` of repo-served Cesium runtime assets under `dist/cesium/` (`Assets` `4.7M`, `Workers` `1.3M`, `ThirdParty` `1.1M`, `Widgets` `744K`).
- The same build still emits Vite's large-chunk warning plus a direct `eval` warning from `node_modules/protobufjs/dist/minimal/protobuf.js:662`.
- `tests/smoke/bootstrap-loads-assets-and-workers.mjs:315-430` is the current globe-only runtime smoke. It verifies the default global plus `regional` and `site` preset paths reach `ready`, preserve the native `Viewer` shell, and keep the fog-default / bloom-off guard intact under a headless SwiftShader browser.
- `tests/visual/capture-three-preset-baselines.mjs:356-463` plus `docs/visual-baselines.md` define the repo-owned Phase 2.12 visual-baseline capture flow. The harness freezes the native clock, waits for `scene.globe.tilesLoaded`, and captures the accepted global, regional, and site framing without inventing a parallel render path.
- The default `site` baseline intentionally runs without `VITE_CESIUM_SITE_TILESET_URL`, so the optional 3D tiles hook remains dormant unless a configured dataset is supplied.
- `node_modules/@cesium/engine/Source/Scene/Scene.js:665-694` documents `requestRenderMode` and `maximumRenderTimeChange` as built-in rendering budget controls.
- `node_modules/@cesium/engine/Source/Scene/Scene.js:698-705` shows render requests also being driven by request and task completion events.

## Decision

Accept the current Phase 2 close-out performance budget authority as follows:

- The default measurement baseline is Profile A, the Cesium-native globe-only runtime, with no replay stack and no satellite overlays.
- Phase 2 close-out accepts the current bundle shape and warning provenance as the authoritative baseline rather than pretending that full hardware-tier certification already exists.
- The large-chunk warning is accepted as a current bundle-shape residual, not as a runtime failure.
- The `protobufjs` `eval` warning is accepted as an upstream dependency-chain residual until a targeted mitigation is justified.
- The current repo-owned runtime evidence for Phase 2 is the combination of `npm run test:phase1` and the Phase 2.12 visual baselines. This is enough to close out Phase 2 governance, but it is not a claim that a dedicated long-duration soak or tiered FPS campaign has already been completed.
- Reference tiers remain:
  - Tier 1: Apple Silicon M1 or M2 class machine, Chromium 120+ at 1080p full window, target 60 FPS during globe-only preset switching.
  - Tier 2: Intel UHD 620 or 630 class integrated graphics, Chromium 120+ at 1080p full window, target at least 30 FPS and no collapse below 20 FPS during preset switching.
  - Tier 3: software raster or comparable lower-bound environment, used only to confirm the app still runs and not as a quality gate.
- Exact hardware, browser, driver, and FPS capture must be recorded at the pre-Phase-3 or earliest Phase 3 checkpoint before overlay or replay work can proceed.

Measurements will use the globe-only baseline under the Cesium-native default profile, with no satellite overlays and no replay stack enabled. If an explicit local/on-prem provider override is measured, record it as a separate deployment-profile variant rather than the default baseline.

## Consequences

- Phase 2 formal close-out may rely on the measured build output, the repo-owned smoke harness, and the repo-owned Phase 2.12 screenshots.
- Phase 3 readiness remains `no-go` until the repo records the deferred hardware-tier measurements and decides whether bundle mitigation or upstream warning mitigation is required before application framing grows.
- The future performance layer should prefer Cesium's explicit-render controls before introducing custom throttling behavior.
- Any future long-duration soak artifact must be added as distinct evidence; it must not be implied retroactively by the current smoke checks or screenshots.
