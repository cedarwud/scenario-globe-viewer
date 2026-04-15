# Cesium Navigation Index

Source note: this file is a condensed manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it as repo-owned text. Do not replace it with a symlink or hard link.

## First Rule

If a Cesium API, behavior, data flow, or visual result is unclear, follow this order:

1. `project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/`
2. `project/home-globe-reference-repos/cesium/packages/engine/Source/` or `project/home-globe-reference-repos/cesium/packages/widgets/Source/`
3. `project/home-globe-reference-repos/cesium/packages/engine/Specs/` or `project/home-globe-reference-repos/cesium/packages/widgets/Specs/`

Do not fill gaps by guesswork before this check is complete.

## Entry Points By Topic

### Bootstrap

- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js`
- `project/home-globe-reference-repos/cesium/packages/widgets/Source/widgets.css`
- `project/home-globe-reference-repos/cesium/Documentation/OfflineGuide/README.md`

Use these when working on `CESIUM_BASE_URL`, asset paths, workers, or offline deployment.

### Viewer Shell

- `project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js`
- `project/home-globe-reference-repos/cesium/packages/widgets/Specs/Viewer/ViewerSpec.js`

Use these when choosing wrapper strategy, shutting down built-in controls, or checking what `Viewer` wires together by default.

### Camera And Globe Quality

- `project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/camera-tutorial/main.js`
- `project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/atmosphere/`
- `project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/fog/`
- `project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/lighting/`
- `project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Camera.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Source/Scene/Globe.js`

Use these when Phase 2 starts shaping globe quality, preset transitions, and camera behavior.

### Time And Overlay Contracts

- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/Clock.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Source/Core/JulianDate.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Source/DataSources/Entity.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Source/DataSources/SampledPositionProperty.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/ClockSpec.js`
- `project/home-globe-reference-repos/cesium/packages/engine/Specs/DataSources/SampledPositionPropertySpec.js`

Use these after Phase 2, when replay and overlay contracts need source-backed confirmation.

## Repo-Specific Reading Order

1. ADR 0001-0005 in `docs/decisions/`
2. [architecture.md](./architecture.md)
3. [delivery-phases.md](./delivery-phases.md)
4. [cesium-adoption-boundary.md](./cesium-adoption-boundary.md)
5. this navigation index

## Archive Exclusion

Archived viewer lines are postmortem-only references. They are not the authority source for this repo's Cesium bootstrap, viewer strategy, deployment profile, or phase sequence.
