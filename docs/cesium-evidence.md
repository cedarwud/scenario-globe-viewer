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
