# ADR 0003: Bundler And Bootstrap

## Status

Accepted

## Context

The repo needs a bundler path that keeps Cesium upstream-owned while still producing a delivery build with local runtime assets. Bootstrap also needs a deterministic base URL story before any Cesium import is added in Phase 1.

Evidence:

- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js:36-46` resolves the Cesium base URL from `CESIUM_BASE_URL` or `import.meta.url`.
- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js:63-75` and `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js:139-143` show the failure mode when a base URL cannot be resolved and the setter used to override it.
- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:91-125` and `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:237-245` show worker URLs and worker messages deriving from the Cesium base URL.
- `project/home-globe-reference-repos/cesium/packages/widgets/Source/widgets.css:1-18` shows the aggregate widget stylesheet that the future bootstrap path will load as one bundle.

## Decision

Use Vite as the repo bundler. Copy Cesium runtime assets from `node_modules/cesium/Build/Cesium/` into a delivery-local `cesium/` folder during build so that Workers, Assets, ThirdParty, and Widgets are served from the same deployment root.

Reserve `CESIUM_BASE_URL` in `index.html` and set it before the application module executes. Phase 0 prepares that path and asset copy only; actual Cesium rendering starts in Phase 1.

## Consequences

- The repo keeps Cesium as an external npm dependency instead of carrying a fork or vendored source tree.
- Runtime asset lookup has a fixed delivery path that works for both local development and built artifacts.
- Bootstrap code must continue to respect the shared `cesium/` asset root; ad hoc worker or asset paths are out of bounds.
