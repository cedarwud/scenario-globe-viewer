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
| `npm run test:phase3.3` | Build the repo, open the default runtime in a headless browser, and verify the Phase 3.3 real-time replay-clock seam still drives Cesium's native `viewer.clock` for `getState`, `play`, `pause`, `setMultiplier`, `seek`, and `onTick` without real-time regressions |
| `npm run test:phase3.4` | Build the repo, open the default runtime in a headless browser, and verify the Phase 3.4 prerecorded replay-clock seam switches mode, reuses the active interval when `range` is omitted, keeps state plain-data, clamps seek/playback to the clip bounds, keeps `onTick` live, and can switch back to the real-time path cleanly |
| `npm run test:phase3.5` | Build the repo, open the default runtime in a headless browser, and verify the repo-owned status-panel timeline placeholder stays read-only, renders only time information from the replay-clock contract, and preserves Cesium's native toolbar, timeline, and credits |
| `npm run test:phase3.6` | Verify the Phase 3.6 overlay-manager module exists as a repo-owned export seam, keeps overlay state plain-data, stays off the live runtime path, and does not leak Cesium runtime classes, fixture ingestion, or walker adapter wiring into the contract |
| `npm run test:phase3.7` | Verify the Phase 3.7 satellite adapter module exists as a repo-owned export seam, keeps fixture/sample data plain-data and serializable, requires `overlay-manager` to import the formal adapter interface, and still avoids Cesium runtime classes, walker adapter wiring, and live satellite runtime integration |
| `npm run test:phase4.1` | Verify the walker fixture adapter keeps TLE parsing, SGP4 propagation, frame conversion, and bounded orbit sampling inside the adapter seam while staying off the live runtime path |
| `npm run test:phase5.1` | Build the repo, open the default runtime in a headless browser, and verify the default-off walker-backed overlay toggle path keeps points plus fixed labels while widening only into bounded Cesium polyline orbits on that same path without widening into per-satellite or overlay UI work |
| `npm run test:phase6.1` | Verify the Phase 6.1 scenario coordination module resolves plain-data downstream inputs, emits a deterministic switch plan, and stays off the live runtime path |
| `npm run capture:phase2.12` | Reject `VITE_CESIUM_SITE_TILESET_URL` resolved from shell env or repo-local `.env*`, build the repo, and capture repo-owned global/regional/site baseline screenshots |
| `npm run capture:phase5.3-orbits` | Reject `VITE_CESIUM_SITE_TILESET_URL` resolved from shell env or repo-local `.env*`, build the repo, enable the bounded orbit-widened overlay path on the global preset through the capture seam, and write the separate Phase 5.3 orbit review artifact |
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
- the formal site dataset MVP now uses the existing configured `site` hook, keeps the native `Cesium3DTileset.fromUrl(...)` path, reframes the camera through the native viewer zoom path once the tileset is attached, and reports runtime `ready` / `degraded` state from the native tileset event path when initial tiles finish loading or visible dataset content is observed
- the current `3.1-3.5` shell/time slices keep the repo-owned HUD frame mounted, leave the left/right panels hidden, and now surface a status-only timeline placeholder in the status panel without replacing Cesium's native timeline
- the current `3.2-3.5` time slices now pair a plain-data replay-clock contract under `src/features/time/` with Cesium-backed real-time and prerecorded implementations in `src/features/time/cesium-replay-clock.ts`; the runtime keeps `viewer.clock` as the only time source, exposes the adapter through the narrow capture seam for targeted validation, also consumes the same plain-data state locally for the read-only HUD placeholder, treats prerecorded mode as a clamped playback clip on that same clock, and reuses the active `startTime`/`stopTime` interval when `setMode('prerecorded')` omits `range`
- the current `3.6-3.7` overlay/satellite interface slices now add a repo-owned overlay manager contract under `src/features/overlays/` plus a formal satellite adapter contract under `src/features/satellites/`; app-facing overlay state and satellite fixture/sample data stay serializable, `overlay-manager` now imports the formal adapter interface, manager ownership still stops at attach/detach, top-level visibility, and disposal, and those public seams stay stable even though the current runtime now consumes them through a narrow default-off walker-backed overlay path
- the current Phase 5.1-5.3 satellite overlay slice stays behind the single repo-owned top-level controller, keeps default startup globe-only, reuses the existing walker ingestion seam, renders the landed point path plus fixed runtime-local labels from existing `name` or fallback `id`, widens only into bounded Cesium polyline orbits with `Entity.path` still disabled, and cleans up the runtime path completely on disable/retry without adding overlay HUD controls or per-satellite UI
- the preserved Phase 5.2 label-only review artifact line remains under `docs/images/phase-5.2-labels/`; it stays distinct from both the dormant Phase 2.12 preset baselines and the formal site dataset MVP artifact
- the current bounded Phase 5.3 orbit widening now has its own separate review artifact line under `docs/images/phase-5.3-orbits/`; it must stay distinct from the preserved Phase 5.2 label line, the dormant Phase 2.12 baselines, and the formal site dataset MVP artifact
- the current Phase 6.1 slice now includes a repo-owned `scenario` module under `src/features/scenario/`; it records scenario identity/source/lifecycle boundaries, resolves downstream plain-data inputs, emits deterministic switch/unload plans, keeps a thin current-scenario facade state, and is still not wired into `src/main.ts` or any live runtime coordination path
- the baseline smoke, showcase smoke, and Phase 2.12 capture commands now reject `VITE_CESIUM_SITE_TILESET_URL` as resolved by Vite production env loading, so shell env and repo-local `.env*` cannot pollute dormant site-hook baselines
- the showcase default-build path plus the shared showcase/site-hook conflict cleanup rebuild now strip ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL`, and the restore path finishes with a minimal runtime assertion that the rebuilt baseline reports `buildingShowcase=off`, `buildingShowcaseSource=default-off`, `buildingShowcaseState=disabled`, and `siteTilesetState=dormant`
- the separate showcase smoke now gates only explicit opt-in wiring plus deterministic non-fatal failure-state handling; it does not claim that a live ion-backed happy path has been hard-verified
- the formal site-hook conflict validation now lives at `npm run test:phase1:site-hook-conflict`, which verifies `siteTilesetState=blocked` instead of leaving that path as an ad hoc harness-only scenario
- the separate formal site dataset validation now lives at `npm run test:phase1:site-dataset`, which verifies `scenePreset=site`, showcase-off runtime state, and `siteTilesetState=ready` for a configured dataset-backed path without rewriting the dormant Phase 2.12 baseline
- Phase 2.12 review baselines now live under `docs/images/phase-2.12/`, with the capture method documented in `docs/visual-baselines.md`
- the separate formal site dataset artifact now lives under `docs/images/formal-site-dataset-mvp/`, with the capture method documented in `docs/visual-baselines.md`
- a repo-local lighting toggle lives inside the native toolbar and uses Cesium-native scene controls rather than a repo-local rendering stack
- repo-local smoke and targeted validation commands now exist at `npm test`, `npm run test:phase1`, `npm run test:phase3.3`, `npm run test:phase3.4`, `npm run test:phase3.5`, `npm run test:phase3.6`, `npm run test:phase3.7`, and `npm run test:phase6.1`
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

Detailed structure, phase sequencing, deployment-profile policy, preserved Cesium evidence, visual baseline capture rules, and the current repo-owned contract surfaces are documented in `docs/architecture.md`, `docs/delivery-phases.md`, `docs/deployment-profiles.md`, `docs/cesium-evidence.md`, `docs/visual-baselines.md`, and `docs/data-contracts/{scene-preset,replay-clock,satellite-overlay,scenario}.md`.
