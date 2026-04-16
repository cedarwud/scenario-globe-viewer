# Cesium Evidence Ledger

Source note: this file preserves the Cesium-specific conclusions that this repo depends on, using installed-package paths where possible and a frozen summary for upstream docs that are not shipped through npm.

## Why This File Exists

This repo needs durable Cesium evidence without depending on workspace-local reference repos. The rule is:

1. Prefer installed-package source paths under `node_modules/`.
2. Preserve repo-local summaries for upstream Cesium surfaces that are not distributed with the npm packages.
3. Keep ADRs and code comments pointing here or to installed-package paths, not to unrelated workspace locations.

## Installed-Package Checks

### Package Strategy

- `node_modules/cesium/package.json:2-55` pins the umbrella package at `1.140.0` and maps it to `@cesium/engine` and `@cesium/widgets`.

### Base URL And Runtime Assets

- `node_modules/@cesium/engine/Source/Core/buildModuleUrl.js:42-46` reads `CESIUM_BASE_URL` before falling back to `import.meta.url`.
- `node_modules/@cesium/engine/Source/Core/buildModuleUrl.js:64-67` throws when the base URL cannot be derived.
- `node_modules/@cesium/engine/Source/Core/buildModuleUrl.js:139-142` exposes the base-url override setter.
- `node_modules/@cesium/engine/Source/Core/TaskProcessor.js:91-125` derives worker module URLs from the shared Cesium base URL.
- `node_modules/@cesium/engine/Source/Core/TaskProcessor.js:237-243` sends the resolved Cesium base URL into worker messages.
- `node_modules/@cesium/widgets/Source/widgets.css:1-19` is the aggregate widget stylesheet entry point.

### Viewer Strategy

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:1-39` shows `Viewer` composing engine primitives and widget modules into the higher-level shell.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:281-284` documents the constructor toggles for `baseLayerPicker` and `geocoder`.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:416-428` guards `baseLayerPicker`-specific options.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-588` shows conditional Geocoder construction.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-656` shows conditional BaseLayerPicker construction.

### OSM Buildings Showcase

- `node_modules/@cesium/engine/Source/Scene/createOsmBuildingsAsync.js:1-79` shows Cesium's native OSM Buildings helper resolving the ion-backed asset and applying Cesium-managed default styling without a repo-local buildings pipeline.
- `node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:2135-2140` shows that helper delegating to `Cesium3DTileset.fromIonAssetId(...)`, which keeps loading, credits, and tileset lifecycle on Cesium's standard 3D Tiles path.

### Performance Budget Anchors

- `node_modules/@cesium/engine/Source/Scene/Scene.js:665-694` documents `requestRenderMode` and `maximumRenderTimeChange`.
- `node_modules/@cesium/engine/Source/Scene/Scene.js:698-705` shows rendering also being triggered by request and task completion events.

## Preserved Upstream Guidance

The npm packages do not ship Sandcastle, Specs, or Cesium's historical deployment guides. This repo preserves the stable conclusions it needs from those surfaces:

- Cesium-native `Viewer` defaults remain a valid repo baseline, including native controls and provider choices, unless an explicit product or deployment requirement says otherwise.
- Local or on-prem imagery, terrain, and tileset hosting remain supported through explicit provider configuration, but they are opt-in overrides rather than the only compliant default path.
- Static Cesium runtime assets should be served from an HTTP(S) path, not loaded from `file://`.
- When deeper Cesium behavior is unclear, the investigation order is Sandcastle, then Source, then Specs before any repo-local implementation is invented.

These conclusions were verified against the upstream Cesium reference material during repo bootstrap on `2026-04-15`. If the Cesium version pin changes or the bootstrap approach changes, re-verify and update this file in the same change set.

## Repo-Level Verification

`npm test` verifies the current Phase 0 assumptions by checking:

- built asset-copy output in `dist/`
- walker fixture integrity
- neutral delivery wording
- installed-package Cesium source surfaces referenced above

This file is the delivery-local evidence anchor for Phase 0 through Phase 2.

## Phase 2 Close-Out Runtime Evidence

The current repo does not claim a separate 24-hour globe-only soak artifact. Phase 2 formal close-out relies on the repo-owned evidence chain below:

- `scripts/site-hook-guard.mjs` plus the package-script entry points in `package.json` now resolve Vite's production env surface before build, so shell env plus repo-local `.env`, `.env.local`, `.env.production`, and `.env.production.local` all count as disallowed `VITE_CESIUM_SITE_TILESET_URL` pollution for the baseline smoke, showcase smoke, or Phase 2.12 capture.
- `tests/smoke/bootstrap-loads-assets-and-workers.mjs:390-425`, `tests/smoke/bootstrap-loads-assets-and-workers.mjs:880-939`, `tests/smoke/bootstrap-loads-assets-and-workers.mjs:1007-1081`, and `tests/smoke/bootstrap-loads-assets-and-workers.mjs:1288-1293` drive default-global, regional-query, and site-query scenarios under a headless SwiftShader browser and require `bootstrapState === "ready"`, the selected preset, `buildingShowcase=off/default-off/disabled`, `siteTilesetState=dormant`, the preserved native `Viewer` shell, and the fog-default / bloom-off guard.
- `tests/smoke/bootstrap-loads-assets-and-workers.mjs` plus `npm run test:phase1:site-hook-conflict` keep the OSM Buildings showcase coverage separate from that baseline gate: the showcase command verifies explicit query/env opt-in wiring while keeping `siteTilesetState=dormant`, deterministic failure handling still checks `error` / `degraded`, and the promoted site-hook conflict entry requires `siteTilesetState=blocked` when a configured site hook and `buildingShowcase=osm` are both present.
- `tests/visual/capture-three-preset-baselines.mjs:294-360`, `tests/visual/capture-three-preset-baselines.mjs:446-468`, `tests/visual/capture-three-preset-baselines.mjs:520-545`, and `tests/visual/capture-three-preset-baselines.mjs:631-633` dismiss navigation help, freeze the native clock, wait for `scene.globe.tilesLoaded` plus camera stabilization, require `buildingShowcase=off/default-off/disabled` with `siteTilesetState=dormant`, and then capture the preset screenshots written to `docs/images/phase-2.12/`.
- `docs/visual-baselines.md:3-41` records the capture conditions and the accepted baseline framing, including the centered global baseline, the capture-time rejection of shell or repo-local `.env*` `VITE_CESIUM_SITE_TILESET_URL` pollution, and the dormant site tiles hook when that env var is unset.
- The repo-owned screenshot artifacts are `docs/images/phase-2.12/global-preset-baseline.png`, `docs/images/phase-2.12/regional-preset-baseline.png`, and `docs/images/phase-2.12/site-preset-baseline.png`.

This evidence chain intentionally describes a dormant-hook baseline. The formal site dataset MVP therefore keeps its runtime and visual evidence separate rather than retroactively rewriting the current Phase 2 close-out record.

This evidence is sufficient to describe the current Phase 2 globe-only baseline. Any future long-duration soak or multi-hardware performance campaign must be added as new evidence rather than inferred from these artifacts.

## Formal Site Dataset MVP Evidence

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:1974-1992` shows the native `Viewer.zoomTo(...)` path for a `Cesium3DTileset`, which keeps dataset framing inside Cesium's viewer shell instead of a repo-local camera controller.
- `node_modules/@cesium/engine/Source/Widget/CesiumWidget.js:1444-1464` shows that the viewer-zoom path resolves to Cesium's own `camera.viewBoundingSphere(...)` framing behavior for a `Cesium3DTileset`.
- `node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:589-744` documents the native `loadProgress`, `allTilesLoaded`, `initialTilesLoaded`, `tileLoad`, `tileFailed`, and `tileVisible` event surfaces used by the repo-local runtime status reporting.
- `node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:3305-3322` shows Cesium raising `allTilesLoaded` and `initialTilesLoaded` from the internal tiles-loaded state once pending requests and tile processing reach zero for the current view.
- `src/features/globe/site-3d-tiles-hook.ts` keeps the formal site dataset line on `Cesium3DTileset.fromUrl(...)`, cancels the preset-level generic flight when the configured dataset attaches, reframes through the native `Viewer.zoomTo(...)` path, and reports `ready` when visible dataset-backed tile content is present.
- `public/fixtures/site-datasets/formal-site-mvp/README.md` records that the repo-owned fixture is a validation-only dataset for this MVP and is not a claim that a final delivery AOI has already been supplied.
- `scripts/formal-site-dataset-fixture.mjs`, `scripts/phase1-cleanup-orchestration.mjs`, `tests/smoke/bootstrap-loads-assets-and-workers.mjs`, and the package command `npm run test:phase1:site-dataset` build with an explicit configured dataset URL, require `scenePreset=site`, `buildingShowcase=off/default-off/disabled`, and `siteTilesetState=ready`, then restore a clean dormant baseline build afterward.
- `scripts/site-dataset-visual-orchestration.mjs`, `tests/visual/capture-site-dataset-integration.mjs`, and the package command `npm run capture:site-dataset` capture the separate dataset-enabled artifact at `docs/images/formal-site-dataset-mvp/site-preset-dataset-enabled.png` and then restore the dormant baseline build afterward.

This evidence is sufficient to show that the current formal site dataset MVP reaches a visible dataset-backed runtime through the accepted Cesium-native hook. It is not evidence that the final delivery dataset has already been integrated, and it does not replace the missing admissible Tier 1 / Tier 2 Profile A measurements.

## Pre-Phase-3 Measurement Feasibility

As of `2026-04-16`, this workspace still cannot produce admissible Tier 1 or Tier 2 Profile A performance evidence for the repo.

- `uname -a` reports `Linux ... microsoft-standard-WSL2` on `x86_64`.
- `lscpu` in that workspace reports `Intel(R) Core(TM) Ultra 9 285H`, and Linux `google-chrome --version` reports `145.0.7632.67`.
- `DISPLAY=:0` and `WAYLAND_DISPLAY=wayland-0` are present, but `glxinfo -B` still cannot open display `:0`, so this pass does not have a usable Linux GPU / driver surface for admissible measurement.
- `lspci -nn` is not available in this workspace, so there is no repo-owned Linux PCI enumeration path for a native VGA or 3D controller record.
- A mounted Windows Chrome install tree is visible under `/mnt/c/Program Files/Google/Chrome/Application/`, but direct host-binary execution through `cmd.exe`, `powershell.exe`, and `chrome.exe` all fail from this workspace with `UtilBindVsockAnyPort:307: socket failed 1`. This means the current pass cannot pivot to a native Windows browser measurement flow either.
- `tests/smoke/bootstrap-loads-assets-and-workers.mjs:379-382` launches the repo-owned browser smoke with `--use-angle=swiftshader`, which is suitable for lower-bound smoke but not for Tier 1 or Tier 2 hardware evidence.

The `2026-04-16` admissible-measurement pass stayed within the intended gate scope:

- Profile A only
- Cesium-native default only
- globe-only baseline only
- `global`, `regional`, and `site` preset coverage only
- preset-switch FPS and stability only

Current pass result:

- Tier 1 admissible record: not collected
- Tier 2 admissible record: not collected
- Gate-evidence status: no admissible measurements were produced in this workspace
- Governance status: blocker evidence only; do not treat this pass as formal gate evidence

This workspace is sufficient for build, smoke, repo-owned visual-baseline refreshes, the formal site dataset MVP validation line, and constrained Phase 3 development progression under WSL. It is not sufficient for the required real-machine capture. Formal Phase 3 readiness therefore remains open until exact machine model, OS, browser version, GPU / driver surface, 1080p window condition, preset coverage, preset-switch FPS, and stability notes are recorded on admissible Profile A Tier 1 and Tier 2 reference machines.

ADR `0005-perf-budget.md` records the matching governance decision for build warnings: the large-chunk warning is accepted and deferred, and the upstream `protobufjs` `eval` warning is accepted as an upstream dependency risk. ADR `0006-phase-3.1-execution-governance.md` records the historical decision that allowed the first constrained WSL-backed `3.1` start without treating this workspace as admissible measurement evidence. ADR `0008-phase-3-wsl-development-progression.md` records the current decision to separate formal readiness from ongoing WSL-backed Phase 3 implementation progression. None of those decisions replace the missing measurement gate.

## Phase 2 Globe Evidence

### Stage 2.1 Atmosphere Baseline

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/atmosphere/main.js:6-10` shows the atmosphere example pulling `scene.skyAtmosphere` and `scene.globe` from a standard `Viewer`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/atmosphere/main.js:60-97` shows the phase-relevant knobs: `showGroundAtmosphere`, `groundAtmosphere*`, and `skyAtmosphere*`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Globe.js:191-246` defines the ground-atmosphere properties used by the repo baseline.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/SkyAtmosphere.js:51-154` defines the sky-atmosphere switches and scattering controls, including `perFragmentAtmosphere`.

### Stage 2.2 Lighting Baseline

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/lighting/main.js:1-11` shows the upstream lighting example enabling `scene.globe.enableLighting`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/lighting/main.js:126-139` shows the default lighting reset path using `dynamicAtmosphereLighting`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Globe.js:153-188` defines `enableLighting`, `dynamicAtmosphereLighting`, `dynamicAtmosphereLightingFromSun`, and `lambertDiffuseMultiplier`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/DynamicAtmosphereLightingTypeSpec.js:3-42` verifies that lighting stays off until `enableLighting` is true and that the sun-vs-scene-light switch is driven by `dynamicAtmosphereLightingFromSun`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/GlobeSpec.js:52-103` verifies the lighting and dynamic-atmosphere rendering path.

### Stage 2.3 Star Background

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/mars/main.js:4-12` shows a `Viewer` wiring `skyBox: Cesium.SkyBox.createEarthSkyBox()` as the native star background path.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/google-streetview-panorama/main.js:264-268` shows the scene returning to the Earth sky box through `viewer.scene.skyBox = Cesium.SkyBox.createEarthSkyBox()`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/scene-rendering-performance/main.js:34-41` shows Cesium treating `scene.skyBox.show` as the upstream toggle instead of a custom background implementation.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/SkyBox.js:139-158` defines `SkyBox.createEarthSkyBox()` and the built-in Tycho star textures it resolves from Cesium assets.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Scene.js:284-334` defines `Scene#skyBox` and makes `backgroundColor` only the fallback when no sky box is present.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/SkyBoxSpec.js:33-47` verifies that a `SkyBox` assigned to `scene.skyBox` participates in rendering.

### Stage 2.4 Fog And Post-Process

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/fog/main.js:20-64` shows the native fog tuning path through `viewer.scene.fog`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/mars/main.js:37-40` shows Cesium's built-in bloom stage being enabled without adding a custom fragment shader.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Fog.js:11-164` defines the fog controls used here, including `density`, `visualDensityScalar`, `heightScalar`, `heightFalloff`, `maxHeight`, and `minimumBrightness`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/FogSpec.js:18-58` verifies that fog disables above `maxHeight` and that the configured values pass through to frame state.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/PostProcessStageCollection.js:32-56` defines the built-in bloom stage and its default-disabled baseline.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/PostProcessStageCollectionSpec.js:13-31` verifies that the collection exposes `bloom` as a native post-process stage.

### Stage 2.5 Imagery Provider Defaults And Optional Overrides

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:295-299` documents the default imagery selection rules used by `Viewer`, including the `selectedImageryProviderViewModel`, `imageryProviderViewModels`, and `baseLayer` paths.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-588` and `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:645-678` show that `Geocoder`, `BaseLayerPicker`, and explicit `baseLayer` replacement are all optional runtime choices rather than a mandatory offline shell pattern.
- `node_modules/@cesium/widgets/Source/BaseLayerPicker/createDefaultImageryProviderViewModels.js:16-118` shows Cesium's native imagery-provider catalog, including the default Cesium-ion-backed entries and other upstream-owned imagery choices.
- `node_modules/@cesium/engine/Source/Scene/TileMapServiceImageryProvider.js:18-27` and `node_modules/@cesium/engine/Source/Scene/TileMapServiceImageryProvider.js:108-149` define the explicit TMS override path used when a deployment chooses mirrored or local imagery instead of the native default provider set.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-16` remains useful as an example of an explicit local-TMS configuration, but this repo no longer treats that example as the required default shell.

### Stage 2.6 Terrain Provider Defaults And Optional Overrides

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:297-303` documents the native terrain entry points, including default ellipsoid terrain plus explicit `selectedTerrainProviderViewModel`, `terrainProviderViewModels`, `terrainProvider`, and `terrain`.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:681-699` shows that custom terrain injection is an explicit override path layered on top of the standard `Viewer` shell.
- `node_modules/@cesium/widgets/Source/BaseLayerPicker/createDefaultTerrainProviderViewModels.js:12-44` shows Cesium's native terrain choices, including `WGS84 Ellipsoid` and `Cesium World Terrain`.
- `node_modules/@cesium/engine/Source/Core/CesiumTerrainProvider.js:1191-1207` defines `CesiumTerrainProvider.fromUrl(...)` for explicit local, mirrored, or on-prem terrain datasets.
- `node_modules/@cesium/engine/Specs/Scene/TerrainSpec.js:15-58`, `node_modules/@cesium/engine/Specs/Core/EllipsoidTerrainProviderSpec.js:18-36`, and `node_modules/@cesium/widgets/Specs/Viewer/ViewerSpec.js:99-105` plus `node_modules/@cesium/widgets/Specs/Viewer/ViewerSpec.js:425-436` verify the native terrain baseline, the ellipsoid fallback path, and the explicit terrain-injection behavior.

### Stage 2.7 Camera Language - FlyTo Tuning

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/mars/main.js:180-184` shows scene-level camera transitions using Cesium's native `camera.flyTo(...)` path.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/scene-rendering-performance/main.js:28-36` shows `camera.flyHome(0.0)` being used as the upstream reset path for scene cleanup.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:290-303` defines `Camera.DEFAULT_VIEW_RECTANGLE` and `Camera.DEFAULT_VIEW_FACTOR`, while `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:1542-1573` shows `flyHome(duration)` consuming those defaults.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:3310-3367` documents the `flyTo` tuning inputs used here, including `orientation`, `duration`, `maximumHeight`, `pitchAdjustHeight`, and `easingFunction`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/HomeButton/HomeButtonViewModel.js:13-24` shows the built-in home button dispatching `camera.flyHome(duration)`, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:598-611` shows `Viewer` wiring the home-button command into the delivery shell.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/CameraSpec.js:3621-3662` verifies `flyTo` option forwarding, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/CameraSpec.js:3771-3838` verifies `flyHome` behavior across scene modes, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/CameraSpec.js:4318-4344` verifies `flyTo` with a rectangle destination plus orientation.

### Stage 2.8 Scene Preset Interface

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:1542-1575` shows Cesium's home-view path staying driven by `Camera.DEFAULT_VIEW_RECTANGLE`, `Camera.DEFAULT_VIEW_FACTOR`, and `camera.flyTo(...)`, so the repo-local preset seam only needs plain camera-view data rather than a parallel camera controller.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js:3310-3367` defines the minimal flight data the repo needs now: destination, orientation, duration, `maximumHeight`, and `pitchAdjustHeight`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/HomeButton/HomeButtonViewModel.js:13-26` shows the native home button delegating to `scene.camera.flyHome(duration)`, which keeps Phase 2.8 focused on preset data instead of a repo-local shell command layer.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:281-304`, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:564-590`, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:599-618`, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:644-703`, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:747-756` show native `Viewer` controls, sky defaults, provider catalogs, home-button wiring, base-layer selection, and timeline remaining inside the Cesium shell; those stay outside the Phase 2.8 preset contract.

### Stage 2.9 Global Preset Implementation

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:295-303` shows the preset-relevant `Viewer` constructor inputs staying at the plain-data level: selected imagery, selected terrain, provider catalogs, and default sky behavior.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-703` shows `BaseLayerPicker` selection and explicit terrain overrides remaining part of the native `Viewer` construction path, so the first global preset can stay a single repo-local wiring layer instead of a separate preset shell.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-618` and `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:747-756` show `Geocoder`, `HomeButton`, and timeline remaining native shell responsibilities rather than preset-owned UI.
- `node_modules/@cesium/engine/Source/Scene/Camera.js:290-303`, `node_modules/@cesium/engine/Source/Scene/Camera.js:1542-1575`, and `node_modules/@cesium/engine/Source/Scene/Camera.js:3310-3367` show that a global preset only needs rectangle, orientation, and flight data to drive the baseline home view and initial framing through Cesium's native camera path.

### Stage 2.10 Regional Preset Implementation

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:295-303` shows bootstrap-time preset selection still staying at the plain-data `Viewer` constructor boundary: imagery, terrain, provider catalogs, and default sky behavior.
- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:564-618`, `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:644-703`, and `node_modules/@cesium/widgets/Source/Viewer/Viewer.js:747-756` show `Geocoder`, `HomeButton`, `BaseLayerPicker`, credits, and timeline remaining owned by Cesium's native shell while the repo swaps only preset data.
- `node_modules/@cesium/engine/Source/Scene/Camera.js:1542-1575` and `node_modules/@cesium/engine/Source/Scene/Camera.js:3310-3367` show that the regional preset can reuse the same rectangle/orientation/flight contract as the global preset, without adding a repo-local camera controller or early site-specific hook fields.

### Stage 2.11 Site Preset With Optional 3D Tiles Hook

- `node_modules/@cesium/engine/Source/Scene/Camera.js:1542-1575` and `node_modules/@cesium/engine/Source/Scene/Camera.js:3310-3367` show that the site preset can keep reusing the same rectangle/orientation/flight contract as the global and regional presets, so the first site preset does not need a parallel camera controller.
- `node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:155-200` documents Cesium's native `Cesium3DTileset.fromUrl(...)` loading path and the standard `scene.primitives.add(tileset)` attachment pattern for 3D tiles.
- `node_modules/@cesium/engine/Source/Scene/Cesium3DTileset.js:2187-2208` shows `fromUrl(...)` remaining an async wrapper around Cesium's own tileset resource loading, which keeps the repo hook at the configured-URL boundary instead of inventing a parallel tiles pipeline.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/3d-tiles-photogrammetry/main.js:3-10` shows the same native pattern in Sandcastle: create a `Viewer`, load a tileset, add it to `scene.primitives`, and optionally frame it with camera logic outside the tiles loader itself.
