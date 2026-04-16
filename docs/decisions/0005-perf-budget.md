# ADR 0005: Performance Budget

## Status

Accepted

## Context

Phase 2 implementation is complete, but the repo still does not have exact multi-hardware FPS captures or a dedicated long-duration globe-only soak artifact. Close-out authority therefore has to record the evidence that actually exists now rather than restating the Phase 0 plan. The repo also needs a clear separation between "formal measurement gate still open" and "narrow WSL-backed development may continue" so that later Phase 3 work does not silently rewrite the gate semantics.

Evidence:

- A local `npm run build` on `2026-04-16` produced `dist/assets/index-0Zb1XPjf.js` at `4,057.61 kB` minified / `1,086.78 kB` gzip and `dist/assets/index-B59-uA_5.css` at `24.53 kB` / `5.51 kB` gzip.
- The same build copied `389` Cesium runtime items and produced `7.8M` of repo-served Cesium runtime assets under `dist/cesium/` (`Assets` `4.7M`, `Workers` `1.3M`, `ThirdParty` `1.1M`, `Widgets` `744K`).
- The same build still emits Vite's large-chunk warning plus a direct `eval` warning from `node_modules/protobufjs/dist/minimal/protobuf.js:662`.
- The currently accessible workspace for this governance pass is `Linux ... microsoft-standard-WSL2` on `x86_64`, with `lscpu` reporting `Intel(R) Core(TM) Ultra 9 285H` and `google-chrome --version` reporting `145.0.7632.67`.
- In that same workspace, `DISPLAY=:0` and `WAYLAND_DISPLAY=wayland-0` are present, but `glxinfo -B` still cannot open display `:0`.
- `lspci -nn` is not available in the workspace, so this pass does not have a repo-owned Linux PCI enumeration path for a native VGA or 3D controller record.
- A mounted Windows Chrome install tree is visible under `/mnt/c/Program Files/Google/Chrome/Application/`, but direct host-binary execution through `cmd.exe`, `powershell.exe`, and `chrome.exe` all fail from this workspace with `UtilBindVsockAnyPort:307: socket failed 1`. The current pass therefore cannot pivot to a native Windows browser measurement path either.
- `tests/smoke/bootstrap-loads-assets-and-workers.mjs:315-430` is the current globe-only runtime smoke. It verifies the default global plus `regional` and `site` preset paths reach `ready`, preserve the native `Viewer` shell, and keep the fog-default / bloom-off guard intact under a headless SwiftShader browser.
- `tests/smoke/bootstrap-loads-assets-and-workers.mjs:379-382` explicitly launches the repo-owned browser smoke with `--use-angle=swiftshader`.
- `tests/visual/capture-three-preset-baselines.mjs:356-463` plus `docs/visual-baselines.md` define the repo-owned Phase 2.12 visual-baseline capture flow. The harness freezes the native clock, waits for `scene.globe.tilesLoaded`, and captures the accepted global, regional, and site framing without inventing a parallel render path.
- The default `site` baseline intentionally runs without `VITE_CESIUM_SITE_TILESET_URL`, so the optional 3D tiles hook remains dormant unless a configured dataset is supplied.
- `node_modules/@cesium/engine/Source/Scene/Scene.js:665-694` documents `requestRenderMode` and `maximumRenderTimeChange` as built-in rendering budget controls.
- `node_modules/@cesium/engine/Source/Scene/Scene.js:698-705` shows render requests also being driven by request and task completion events.

## Decision

The pre-Phase-3 governance position is:

| Item | Current state | Risk | Phase 3 impact |
|---|---|---|---|
| Tier 1 / Tier 2 Profile A measurement gate | Missing. The required globe-only real-machine captures have not been recorded yet, and the currently accessible workspace is a WSL2 environment with no admissible Linux GPU / driver surface and no working native Windows browser interop path. | The repo still lacks exact reference-machine FPS evidence for the mandatory pre-Phase-3 gate. | Blocks formal Phase 3 readiness and close-out. ADR `0006-phase-3.1-execution-governance.md` may still allow a separately approved `3.1` shell-framing slice. |
| Large chunk warning | Verified again on `2026-04-16` from the current `4,057.61 kB` main JS chunk. | Larger initial bundle cost and less headroom for later phases, but no repo-owned evidence of runtime failure from this warning alone. | Accept and defer. This warning does not block Phase 3 by itself. |
| Upstream `protobufjs` `eval` warning | Verified again on `2026-04-16` from `node_modules/protobufjs/dist/minimal/protobuf.js:662`. | Tooling and security-review noise plus minifier constraints remain in the upstream dependency chain. | Accept as upstream dependency risk. This warning does not block Phase 3 by itself while provenance remains upstream and repo code adds no new `eval` path. |

The default measurement baseline remains Profile A, the Cesium-native globe-only runtime, with no replay stack and no satellite overlays. The current repo-owned runtime evidence for Phase 2 is still the combination of `npm run test:phase1` and the Phase 2.12 visual baselines. That evidence closes out Phase 2 governance, but it is not a claim that a dedicated tiered FPS campaign has already been completed.

Reference tiers remain:

- Tier 1: Apple Silicon M1 or M2 class machine, Chromium 120+ at 1080p full window, target 60 FPS during globe-only preset switching.
- Tier 2: Intel UHD 620 or 630 class integrated graphics, Chromium 120+ at 1080p full window, target at least 30 FPS and no collapse below 20 FPS during preset switching.
- Tier 3: software raster or comparable lower-bound environment, used only to confirm the app still runs and not as a quality gate.

Any admissible Tier 1 or Tier 2 record must include exact machine model, OS, browser version, GPU or driver surface, window size, preset coverage, preset-switch FPS, and stability notes during globe-only Profile A runs.

Measurements will use the globe-only baseline under the Cesium-native default profile, with no satellite overlays and no replay stack enabled. If an explicit local/on-prem provider override is measured, record it as a separate deployment-profile variant rather than the default baseline.

The `2026-04-16` admissible-measurement pass stayed within that scope, but it produced no admissible Tier 1 or Tier 2 records because the currently accessible workspace is still a WSL2 environment with no usable Linux GPU / driver surface and no working native Windows browser interop path. That pass therefore contributes blocker provenance only and must not be cited as formal gate evidence.

## Consequences

- Phase 2 formal close-out may rely on the measured build output, the repo-owned smoke harness, and the repo-owned Phase 2.12 screenshots.
- The accepted Phase 2 close-out state should be fixed as its own commit/tag before the first Phase 3.1 implementation commit lands.
- Phase 3 formal readiness remains open until the repo records admissible Tier 1 and Tier 2 Profile A measurement evidence in repo-owned authority.
- ADR `0006-phase-3.1-execution-governance.md` may authorize a constrained WSL-backed `3.1` shell-framing start before that measurement gate closes, but that exception does not satisfy the missing measurement evidence.
- The large chunk warning and the upstream `protobufjs` `eval` warning remain tracked, but under this decision they do not independently block Phase 3.
- The future performance layer should prefer Cesium's explicit-render controls before introducing custom throttling behavior.
- Any future long-duration soak artifact must be added as distinct evidence; it must not be implied retroactively by the current smoke checks or screenshots.
