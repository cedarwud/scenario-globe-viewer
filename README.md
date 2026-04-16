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
6. Optionally run the explicit OSM Buildings showcase smoke with `npm run test:phase1:showcase`.
7. Optionally run the dataset-enabled site smoke with `npm run test:phase1:site-dataset`.
8. Capture the Phase 2.12 preset baselines with `npm run capture:phase2.12`.
9. Optionally capture the separate dataset-enabled site artifact with `npm run capture:site-dataset`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Type-check and build the delivery artifact with copied Cesium runtime assets |
| `npm test` | Build and verify Phase 0 outputs, fixture integrity, neutral wording, and installed-package Cesium evidence |
| `npm run test:phase1` | Reject `VITE_CESIUM_SITE_TILESET_URL` resolved from shell env or repo-local `.env*`, build the repo, and verify the repo-owned Phase 1 baseline bootstrap path in a headless browser |
| `npm run test:phase1:showcase` | Reject `VITE_CESIUM_SITE_TILESET_URL` resolved from shell env or repo-local `.env*`, rebuild `dist/` on a sanitized baseline env, verify explicit OSM Buildings opt-in wiring plus failure-state handling separately from the baseline smoke, cover the env-driven opt-in path without hard-gating live ion happy-path success, and always restore a guarded clean baseline `dist/` rebuild afterward with ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` stripped before a minimal post-cleanup baseline assertion |
| `npm run test:phase1:site-hook-conflict` | Build with an explicit configured site-hook URL on the same sanitized baseline env, verify the formal mutual-exclusion path, require `siteTilesetState=blocked` while the OSM Buildings showcase is active, and always restore a guarded clean baseline `dist/` rebuild afterward with ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` stripped before the same post-cleanup baseline assertion |
| `npm run test:phase1:site-dataset` | Build with an explicit configured site-hook URL on the same sanitized baseline env, verify the dataset-backed `site` preset path reaches a visible ready state through Cesium's native 3D Tiles runtime, and always restore a guarded clean baseline `dist/` rebuild afterward with ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` stripped before the same post-cleanup baseline assertion |
| `npm run test:phase3.2` | Verify the Phase 3.2 replay-clock contract surface stays plain-data only, exports the repo-facing time module boundary, and avoids Cesium runtime-class leakage |
| `npm run capture:phase2.12` | Reject `VITE_CESIUM_SITE_TILESET_URL` resolved from shell env or repo-local `.env*`, build the repo, and capture repo-owned global/regional/site baseline screenshots |
| `npm run capture:site-dataset` | Build with an explicit configured site-hook URL on the same sanitized baseline env, capture the separate dataset-enabled `site` artifact, and always restore a guarded clean baseline `dist/` rebuild afterward |
| `npm run preview` | Preview the built artifact locally |

## OSM Showcase Opt-In

Use the OSM Buildings line only as an explicit showcase variant.

- URL opt-in: `http://localhost:5173/?buildingShowcase=osm`
- Env opt-in: set `VITE_CESIUM_BUILDING_SHOWCASE=osm` in `.env.local`, then restart `npm run dev`
- This path stays separate from the formal `site` dataset hook and from the default Phase 2 / Profile A baseline
- If OSM showcase is active, the configured formal `site` tileset hook is intentionally blocked

## Delivery Status

The current repo snapshot includes a completed Phase 0 baseline, a stable Phase 1 bootstrap path, and a small Cesium-native shell refinement slice:

- repo-local authority docs and ADRs are present
- `cesium@1.140.0` is pinned as the package strategy
- `CESIUM_BASE_URL` and runtime asset-copy plumbing are wired
- the walker TLE fixture is copied into `public/fixtures/`
- runtime Cesium bootstrap is active through `src/main.ts`
- the native `Viewer` shell, credits, `BaseLayerPicker`, `Geocoder`, `HomeButton`, timeline, and toolbar remain available by default
- explicit imagery and terrain URLs remain opt-in overrides, while the default terrain selection stays on Cesium's native `BaseLayerPicker` path
- the repo-owned preset layer now provides global, regional, and site presets, with bootstrap-time `scenePreset` selection staying query-driven and no preset UI shell
- the site preset can opt into a configured 3D tiles URL through `VITE_CESIUM_SITE_TILESET_URL`; the hook stays dormant by default, reports repo-local `siteTilesetState`, becomes dataset-backed when that URL is configured, and is blocked whenever the explicit OSM showcase is active
- an optional OSM Buildings showcase variant can be enabled explicitly through `?buildingShowcase=osm` or `VITE_CESIUM_BUILDING_SHOWCASE=osm`; it stays off by default, remains separate from the `site` preset and formal site tiles hook, and reports `loading`, `ready`, `degraded`, or `error` showcase state without failing bootstrap when ion-backed creation or later tile/content requests fail
- the formal site dataset MVP now uses the existing configured `site` hook, keeps the native `Cesium3DTileset.fromUrl(...)` path, reframes the camera through the native viewer zoom path once the tileset is attached, and treats the first visible tile as the runtime-ready success signal for the dataset-backed line
- the current `3.1` shell-framing slice only leaves a hidden-by-default HUD placeholder mounted in the DOM; visible HUD panels and real shell functionality are still future work
- the current `3.2` time slice adds a plain-data replay-clock contract under `src/features/time/`; it defines serializable mode/time/range semantics for later work without wiring live clock behavior into the app shell, HUD, or Cesium runtime yet
- the baseline smoke, showcase smoke, and Phase 2.12 capture commands now reject `VITE_CESIUM_SITE_TILESET_URL` as resolved by Vite production env loading, so shell env and repo-local `.env*` cannot pollute dormant site-hook baselines
- the showcase default-build path plus the shared showcase/site-hook conflict cleanup rebuild now strip ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL`, and the restore path finishes with a minimal runtime assertion that the rebuilt baseline reports `buildingShowcase=off`, `buildingShowcaseSource=default-off`, `buildingShowcaseState=disabled`, and `siteTilesetState=dormant`
- the separate showcase smoke now gates only explicit opt-in wiring plus deterministic non-fatal failure-state handling; it does not claim that a live ion-backed happy path has been hard-verified
- the formal site-hook conflict validation now lives at `npm run test:phase1:site-hook-conflict`, which verifies `siteTilesetState=blocked` instead of leaving that path as an ad hoc harness-only scenario
- the separate formal site dataset validation now lives at `npm run test:phase1:site-dataset`, which verifies `scenePreset=site`, showcase-off runtime state, and `siteTilesetState=ready` for a configured dataset-backed path without rewriting the dormant Phase 2.12 baseline
- Phase 2.12 review baselines now live under `docs/images/phase-2.12/`, with the capture method documented in `docs/visual-baselines.md`
- the separate formal site dataset artifact now lives under `docs/images/formal-site-dataset-mvp/`, with the capture method documented in `docs/visual-baselines.md`
- a repo-local lighting toggle lives inside the native toolbar and uses Cesium-native scene controls rather than a repo-local rendering stack
- repo-local smoke commands exist at `npm test` and `npm run test:phase1`
- the accepted Phase 2 close-out baseline is now a governance handoff point that should be fixed as its own commit/tag before any Phase 3.1 code lands
- formal multi-hardware Profile A measurement evidence is still missing, so full Phase 3 formal readiness is still `no-go`
- ADR `0008-phase-3-wsl-development-progression.md` now separates that formal readiness gate from a constrained WSL-backed Phase 3 development-progression gate, so routine `3.2+` implementation slices can continue under repo-owned build/smoke/capture/doc evidence without relabeling those passes as admissible measurement evidence
- in the current repo state, `3.2` is therefore `go with constraints` only for routine in-scope Phase 3 work; it is not blanket authorization for Phase 3 close-out, deployment-profile widening, or measurement-gate closure
- the repo-owned formal site dataset fixture under `public/fixtures/site-datasets/formal-site-mvp/` is validation-only and does not claim that a final delivery AOI has already been supplied
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
- `tests/visual/`

Detailed structure, phase sequencing, deployment-profile policy, preserved Cesium evidence, and visual baseline capture rules are documented in `docs/architecture.md`, `docs/delivery-phases.md`, `docs/deployment-profiles.md`, `docs/cesium-evidence.md`, and `docs/visual-baselines.md`.
