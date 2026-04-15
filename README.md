# scenario-globe-viewer

`scenario-globe-viewer` is a Cesium-based scenario globe delivery repo. It provides the standalone globe shell, delivery-side documentation, and bootstrap assets required to build a high-quality Earth-first scenario viewer without forking Cesium.

## Scope

- Use `cesium` as an npm dependency. Do not fork or vendor Cesium source into this repository.
- Build the globe foundation first. Phases 0-3 keep satellite work at the interface and hook level only.
- Treat archived viewer lines as postmortem-only references. Delivery authority lives in this repo's README, ADRs, and docs.
- Keep the default visual baseline on Cesium's native `Viewer` path. Local or on-prem imagery/terrain mirrors are opt-in deployment configuration, not a reason to disable native controls or replace native providers by default.

## Quick Start

1. Install dependencies with `npm install`.
2. Start the local shell with `npm run dev`.
3. Build the delivery artifact with `npm run build`.
4. Run the Phase 0 smoke suite with `npm test`.
5. Run the Phase 1 bootstrap smoke with `npm run test:phase1`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Type-check and build the delivery artifact with copied Cesium runtime assets |
| `npm test` | Build and verify Phase 0 outputs, fixture integrity, neutral wording, and installed-package Cesium evidence |
| `npm run test:phase1` | Build the repo and verify the first-globe bootstrap path in a headless browser |
| `npm run preview` | Preview the built artifact locally |

## Delivery Status

The current repo snapshot includes a completed Phase 0 baseline, a stable Phase 1 bootstrap path, and a small Cesium-native shell refinement slice:

- repo-local authority docs and ADRs are present
- `cesium@1.140.0` is pinned as the package strategy
- `CESIUM_BASE_URL` and runtime asset-copy plumbing are wired
- the walker TLE fixture is copied into `public/fixtures/`
- runtime Cesium bootstrap is active through `src/main.ts`
- the native `Viewer` shell, credits, `BaseLayerPicker`, `Geocoder`, `HomeButton`, timeline, and toolbar remain available by default
- explicit imagery and terrain URLs remain opt-in overrides, while the default terrain selection stays on Cesium's native `BaseLayerPicker` path
- the repo-owned preset layer now provides a global baseline plus a regional focus preset, with bootstrap-time `scenePreset` selection limited to those two presets and no preset UI shell
- a repo-local lighting toggle lives inside the native toolbar and uses Cesium-native scene controls rather than a repo-local rendering stack
- repo-local smoke commands exist at `npm test` and `npm run test:phase1`
- `docs/images/phase-1-baseline.png` remains the historical first-globe capture; ad hoc Playwright screenshots under `output/` are local validation artifacts and are not part of the delivery surface

## Phase 0 Deliverables

Phase 0 establishes:

- repo conventions and neutral delivery-side wording
- ADRs for package strategy, viewer strategy, bundler/bootstrap, deployment profile, and performance budget
- a minimal Vite + TypeScript scaffold with Cesium pinned as a dependency
- runtime asset-copy plumbing for `CESIUM_BASE_URL`
- copied public fixtures that do not create build-time dependencies on donor repos

## Repository Layout

Phase 0 targets the following top-level layout:

- `docs/`
- `public/fixtures/`
- `scripts/`
- `src/`
- `tests/smoke/`

Detailed structure, phase sequencing, deployment-profile policy, and preserved Cesium evidence are documented in `docs/architecture.md`, `docs/delivery-phases.md`, `docs/deployment-profiles.md`, and `docs/cesium-evidence.md`.
