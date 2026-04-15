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

### Performance Budget Anchors

- `node_modules/@cesium/engine/Source/Scene/Scene.js:665-694` documents `requestRenderMode` and `maximumRenderTimeChange`.
- `node_modules/@cesium/engine/Source/Scene/Scene.js:698-705` shows rendering also being triggered by request and task completion events.

## Preserved Upstream Guidance

The npm packages do not ship Cesium's offline guide, Sandcastle, or Specs. This repo preserves the stable conclusions it needs from those surfaces:

- Offline delivery must not depend on Cesium's default online imagery or online geocoding.
- Offline delivery should disable or replace `BaseLayerPicker` and `Geocoder` rather than exposing online defaults.
- Static Cesium assets should be served from an HTTP(S) path, not loaded from `file://`.
- When deeper Cesium behavior is unclear, the investigation order is Sandcastle, then Source, then Specs before any repo-local implementation is invented.

These conclusions were verified against the upstream Cesium reference material during repo bootstrap on `2026-04-15`. If the Cesium version pin changes or the bootstrap approach changes, re-verify and update this file in the same change set.

## Repo-Level Verification

`npm test` verifies the current Phase 0 assumptions by checking:

- built asset-copy output in `dist/`
- walker fixture integrity
- neutral delivery wording
- installed-package Cesium source surfaces referenced above

This file is the delivery-local evidence anchor for Phase 0 through Phase 2.

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

### Stage 2.5 Offline Imagery Provider Setup

- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-16` shows the offline Cesium pattern: `baseLayerPicker: false`, `geocoder: false`, and `TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl(\"Assets/Textures/NaturalEarthII\"))`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/imagery-layers-texture-filters/main.js:12-20` shows `TileMapServiceImageryProvider.fromUrl` consuming the bundled `Assets/Textures/NaturalEarthII` tiles.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:289-299`, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:416-428`, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:565-588`, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:645-678` define the `baseLayer`, `baseLayerPicker`, and `geocoder` construction rules.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/TileMapServiceImageryProvider.js:18-27` and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/TileMapServiceImageryProvider.js:108-149` define `fromUrl` and the `credit` option for tiled offline imagery.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:196-205`, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:332-341`, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:549-556` verify disabling `baseLayerPicker`, disabling `geocoder`, and setting a custom `baseLayer`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/TileMapServiceImageryProviderSpec.js:106-119` verifies `fromUrl`, while `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/TileMapServiceImageryProviderSpec.js:280-296` verifies that explicit credits remain attached to the provider.

### Stage 2.6 Terrain Provider (Offline-First)

- `/home/u24/papers/project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md:3-15` states that offline apps must avoid Cesium's online defaults and either disable the picker or replace its terrain sources with offline ones.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/terrain/main.js:4-18` shows Cesium's standard terrain boot path, while `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/terrain/main.js:48-99` shows the supported fallback between `Terrain.fromWorldTerrain()` and `EllipsoidTerrainProvider`.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/CesiumTerrainProvider.js:1191-1207` defines `CesiumTerrainProvider.fromUrl(...)` for hosted quantized-mesh or heightmap terrain datasets.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Terrain.js:43-100` defines the async `Terrain` helper and its `readyEvent` / `errorEvent` fallback hooks.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:299-303` documents `terrainProvider` versus `terrain`, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:681-699` shows how `Viewer` applies those two terrain entry points.
- `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Scene/TerrainSpec.js:15-58` verifies `Terrain` ready/error events, `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/EllipsoidTerrainProviderSpec.js:18-36` verifies the ellipsoid fallback provider, and `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:99-105` plus `/home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js:425-436` verify the default ellipsoid baseline and explicit `terrainProvider` injection path.
