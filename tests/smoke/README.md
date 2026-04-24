# Smoke Tests

Phase 0 smoke is exposed through `npm test`, implemented in `scripts/verify-phase0.mjs`.

The current check verifies:

- the build completes
- copied Cesium runtime assets exist in `dist/`
- the walker fixture remains intact
- delivery-facing files stay neutral
- installed-package Cesium evidence still matches the repo's recorded assumptions

Runtime bootstrap and first-globe smoke are exposed through `node tests/smoke/bootstrap-loads-assets-and-workers.mjs`.

Phase 1 baseline smoke is exposed through `npm run test:phase1`, which rejects `VITE_CESIUM_SITE_TILESET_URL` as resolved by Vite production env loading (`process.env` plus repo-local `.env*`) before build, serves `dist/` locally, opens the built app in a headless browser, and checks that the baseline bootstrap state reaches `ready` with `buildingShowcase=off`, `buildingShowcaseSource=default-off`, `buildingShowcaseState=disabled`, `siteTilesetState=dormant`, and the current Phase 5.3 satellite overlay path still disabled on the accepted globe-only baseline.

The explicit OSM Buildings showcase coverage is exposed separately through `npm run test:phase1:showcase`. That command now also rejects `VITE_CESIUM_SITE_TILESET_URL` through the same Vite-resolved guard, rebuilds `dist/` on a sanitized baseline env so ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` cannot pollute the default-build semantics, verifies explicit query-driven opt-in wiring plus injected failure-state handling while keeping `siteTilesetState=dormant`, then rebuilds with an explicit `VITE_CESIUM_BUILDING_SHOWCASE=osm` override to cover the env-driven opt-in path. Its orchestration restores a guarded clean baseline `dist/` rebuild in a `finally` path, strips both ambient env vars before that cleanup rebuild, leaves the conflict-only configured site-hook URL out of the restored baseline assets even when showcase verification fails, and finishes with a minimal post-cleanup baseline smoke assertion for `buildingShowcase=off/default-off/disabled` plus `siteTilesetState=dormant`.

This showcase suite does not hard-gate live ion-backed happy-path success. Its live-network checks prove opt-in wiring and non-disabled showcase-state surfacing only, while the deterministic injected-failure scenarios verify that `error` and `degraded` handling remain non-fatal to bootstrap.

For the explicit mutual-exclusion policy, the same smoke harness is now promoted to the package-level command `npm run test:phase1:site-hook-conflict`: it builds with an explicit configured site-hook URL on that same sanitized baseline env, runs `--suite=site-hook-conflict`, requires `siteTilesetState=blocked` when `buildingShowcase=osm` is present instead of attaching both tilesets, and then restores a guarded clean baseline `dist/` rebuild in the same `finally`-backed orchestration path with ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` removed before the same post-cleanup baseline assertion.

The separate formal site dataset MVP coverage is exposed through `npm run test:phase1:site-dataset`: it builds with an explicit configured site-hook URL on that same sanitized baseline env, runs `--suite=site-dataset`, requires `scenePreset=site`, `buildingShowcase=off/default-off/disabled`, and `siteTilesetState=ready`, and then restores a guarded clean baseline `dist/` rebuild in the same `finally`-backed orchestration path with ambient `VITE_CESIUM_BUILDING_SHOWCASE` and `VITE_CESIUM_SITE_TILESET_URL` removed before the same post-cleanup baseline assertion. That suite proves the dataset-backed path separately from both the dormant baseline and the explicit OSM Buildings showcase.

Phase 5.1 overlay toggle coverage is exposed through `npm run test:phase5.1`: it rebuilds `dist/`, serves the built app locally, proves the default globe-only shell still starts with the overlay disabled, toggles the repo-owned top-level satellite overlay controller on through the existing capture seam, verifies that the walker-backed point path keeps its points while preserving the fixed labels derived only from existing `name` or fallback `id`, and widens only into bounded orbit polylines on that same path. The same harness proves `pathCount=0`, requires a non-zero polyline count only while enabled, keeps the native toolbar, timeline, credits, and status-only HUD intact, and exercises retry/error cleanup so disable and injected-failure paths still remove all runtime residue cleanly.

R1V.1 presentation suppression coverage is exposed through `npm run test:r1v.1`: it rebuilds `dist/`, serves the built app locally, proves the addressed first-intake route still resolves the `M8A.3` expression seam and `M8A.4` info seam, verifies the intrusive first-intake floating panels are mounted only as hidden/collapsed DOM ownership with `panelVisible=false`, and confirms the default route still publishes no `M8A` or `R1V` presentation state.

R1V.2 time-authority coverage is exposed through `npm run test:r1v.2`: it rebuilds `dist/`, serves the built app locally, proves the addressed first-intake route derives replay start/stop from the mobile trajectory seam, binds Cesium's animation widget and bottom timeline to that same addressed-route replay clock, verifies the route initializes paused at replay start with `60x`, confirms reset returns to replay start and paused, confirms replay stop clamps and pauses, and confirms the default route still publishes no `R1V` time-authority state.

R1V.3 animated cue and relation coverage is exposed through `npm run test:r1v.3`: it rebuilds `dist/`, serves the built app locally, proves the addressed first-intake route publishes the bounded replay-driven animation state on the existing nearby-second-endpoint expression seam, verifies the current mobile cue interpolates between accepted trajectory samples under the shared replay clock, confirms the relation cue endpoints update from the moving mobile cue and fixed YKA endpoint, confirms pausing replay stops further cue movement, and confirms the default route still publishes no `R1V` animation state.

R1V.4 cinematic camera preset coverage is exposed through `npm run test:r1v.4`: it rebuilds `dist/`, serves the built app locally, proves the addressed first-intake route publishes the bounded `endpoint-relation-cinematic` camera preset state, verifies exactly one top-right affordance exists for that preset, activates the affordance, confirms the camera moves to the accepted bounded scene preset, checks the preset bounds contain the accepted trajectory plus fixed YKA endpoint, rejects selector/catalog/global endpoint-navigation surfaces, and confirms the default route publishes no `R1V` camera-preset state.

R1V.5 minimal satcom context overlay coverage is exposed through `npm run test:r1v.5`: it rebuilds `dist/`, serves the built app locally, proves the addressed first-intake route publishes the compact satcom context overlay state, verifies the overlay stays out of the center-screen/timeline/top-right cinematic affordance zones, checks that visible and inspectable facts stay within the allowed R1V.5 set plus required non-claims, confirms overlay time state follows the shared R1V.2 replay authority, verifies R1V.1-suppressed panels remain suppressed, and confirms the default route publishes no `R1V.5` overlay state.

The current Phase 3.1-3.5 follow-up coverage also verifies:

- the repo-owned HUD shell remains mounted, now advertises `data-hud-visibility="status-only"`, keeps the left/right panels hidden, and leaves the status panel visible in both `1440x900` and `1440x760`
- the status panel surfaces a read-only timeline placeholder with time-only fields and no interactive controls
- the native toolbar, timeline, and credits band remain visible while that placeholder shell stays status-only
- CDP hover-then-click activation of the native geocoder control plus coordinate-click activation of the native `BaseLayerPicker` toggle still work while the timeline placeholder is present

This follow-up coverage does not claim full end-to-end user reachability for every downstream native-widget state. It proves the initial pointer activation path while the repo-owned HUD remains status-only and read-only.
