# Cesium Navigation Index

Source note: this file is a condensed manual rewrite of the active workspace engineering index dated 2026-04-15. Keep it as repo-owned text. Do not replace it with a symlink or hard link.

## First Rule

If a Cesium API, behavior, data flow, or visual result is unclear, follow this order:

1. [cesium-evidence.md](./cesium-evidence.md) for the repo's preserved bootstrap, viewer, deployment-profile, and performance conclusions
2. `node_modules/@cesium/engine/Source/` or `node_modules/@cesium/widgets/Source/` for the installed package source that backs this repo's current version pin
3. If a full Cesium source checkout is available, use upstream Sandcastle, then Source, then Specs before inventing a new behavior

Do not fill gaps by guesswork before this check is complete.

## Entry Points By Topic

### Package And Runtime Assets

- `node_modules/cesium/package.json`
- `node_modules/cesium/Build/Cesium/Workers/`
- `node_modules/cesium/Build/Cesium/Assets/`
- `node_modules/cesium/Build/Cesium/ThirdParty/`
- `node_modules/cesium/Build/Cesium/Widgets/`

Use these when validating the version pin, bundled asset roots, and delivery-facing copy layout.

### Bootstrap

- `node_modules/@cesium/engine/Source/Core/buildModuleUrl.js`
- `node_modules/@cesium/engine/Source/Core/TaskProcessor.js`
- `node_modules/@cesium/widgets/Source/widgets.css`
- [cesium-evidence.md](./cesium-evidence.md)

Use these when working on `CESIUM_BASE_URL`, asset paths, workers, or deployment-specific provider overrides.

### Viewer Shell

- `node_modules/@cesium/widgets/Source/Viewer/Viewer.js`
- [cesium-evidence.md](./cesium-evidence.md)

Use these when choosing wrapper strategy, configuring built-in controls, or checking what `Viewer` wires together by default.

### Camera And Globe Quality

- `node_modules/@cesium/engine/Source/Scene/Camera.js`
- `node_modules/@cesium/engine/Source/Scene/Globe.js`
- `node_modules/@cesium/engine/Source/Scene/Scene.js`
- [cesium-evidence.md](./cesium-evidence.md)

Use these when Phase 2 starts shaping globe quality, preset transitions, and camera behavior.

### Time And Overlay Contracts

- `node_modules/@cesium/engine/Source/Core/Clock.js`
- `node_modules/@cesium/engine/Source/Core/JulianDate.js`
- `node_modules/@cesium/engine/Source/DataSources/Entity.js`
- `node_modules/@cesium/engine/Source/DataSources/SampledPositionProperty.js`

Use these after Phase 2, when replay and overlay contracts need source-backed confirmation.

### Monorepo-Only Surfaces

The npm packages do not ship Sandcastle examples, Specs, or Cesium's historical deployment guides. If a change depends on those deeper surfaces, use a full Cesium source checkout and keep the repo-local conclusion synchronized in [cesium-evidence.md](./cesium-evidence.md) or the relevant ADR.

## Repo-Specific Reading Order

1. ADR 0001-0005 in `docs/decisions/`
2. [cesium-evidence.md](./cesium-evidence.md)
3. [architecture.md](./architecture.md)
4. [delivery-phases.md](./delivery-phases.md)
5. [cesium-adoption-boundary.md](./cesium-adoption-boundary.md)
6. [deployment-profiles.md](./deployment-profiles.md)
7. this navigation index

## Archive Exclusion

Archived viewer lines are postmortem-only references. They are not the authority source for this repo's Cesium bootstrap, viewer strategy, deployment profile, or phase sequence.
