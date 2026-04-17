# Visual Baselines

Phase 2.12 captures three review baselines for the active preset runtime:

- `docs/images/phase-2.12/global-preset-baseline.png`
- `docs/images/phase-2.12/regional-preset-baseline.png`
- `docs/images/phase-2.12/site-preset-baseline.png`

These PNGs are repo-owned delivery artifacts, not temporary outputs. For Phase 2 formal close-out, they are the visual half of the accepted globe-only evidence chain when paired with `npm run test:phase1` and the runtime notes in `docs/cesium-evidence.md`. They do not, by themselves, claim that a separate long-duration soak artifact already exists.

Use the repo-owned capture harness:

```bash
npm run capture:phase2.12
```

The command rebuilds `dist/`, serves the built app locally, opens a fresh headless browser per preset, and writes the screenshots directly into `docs/images/phase-2.12/`.

## Capture Conditions

- deployment profile: Profile A / Cesium-native default
- viewport: `1440x900`
- browser timezone: `UTC`
- bootstrap selection path: query-driven `scenePreset`
- building showcase guard: the harness requires `buildingShowcase=off`, `buildingShowcaseSource=default-off`, and `buildingShowcaseState=disabled` before capture
- site hook guard: the command rejects `VITE_CESIUM_SITE_TILESET_URL` as resolved by Vite production env loading (`process.env` plus repo-local `.env*`) before build, and runtime readiness requires `siteTilesetState=dormant`
- native shell: preserved, including `Geocoder`, `BaseLayerPicker`, credits, animation widget, timeline, and toolbar
- visual guard: the existing fog-default / bloom-off smoke values must still pass before capture
- overlay state: navigation-help onboarding is dismissed before the screenshot so the preset frame itself stays reviewable
- clock seed: the browser `Date` value is fixed to `2026-04-16T00:00:10.250Z` before app bootstrap so the native animation/timeline chrome stays close to a repeatable state across recaptures
- native clock stabilization: after bootstrap readiness, the harness pauses the native Cesium clock and waits for the camera plus `scene.globe.tilesLoaded` state to settle before capture

The capture harness does not rewrite preset framing, provider policy, or tiles behavior. It only stabilizes browser conditions around the existing runtime.

## Preset Notes

- `global`: centered global baseline framing from `923220a`
- `regional`: regional focus framing from `359724f`
- `site`: site framing from `a012738`

The default Phase 2.12 capture is intentionally run without `VITE_CESIUM_SITE_TILESET_URL` and without the OSM Buildings showcase opt-in (`?buildingShowcase=osm` or `VITE_CESIUM_BUILDING_SHOWCASE=osm`). The command now refuses to run when that site-hook env var resolves through shell env or repo-local `.env*`, and the harness asserts both the disabled showcase state and `siteTilesetState=dormant` before capture. Under that condition, the `site` screenshot represents the site preset camera plus the dormant optional 3D tiles hook. No placeholder tileset is injected for baseline generation, and live ion-backed building content is not part of the baseline path.

The formal site dataset MVP is captured as a separate artifact set. It does not overwrite the dormant-hook Phase 2.12 screenshots, and it stays distinct from both the OSM Buildings showcase and the Phase 3.1 HUD follow-up artifact. ADR `0007-formal-site-dataset-integration-governance.md` defines that separation.

## Formal Site Dataset MVP Artifact

- `docs/images/formal-site-dataset-mvp/site-preset-dataset-enabled.png`

Use the separate repo-owned capture harness:

```bash
npm run capture:site-dataset
```

Capture conditions:

- deployment profile: explicit Profile B dataset-backed site-hook variant on top of the same Cesium-native viewer shell
- viewport: `1440x900`
- bootstrap selection path: query-driven `scenePreset=site`
- dataset source: explicit `VITE_CESIUM_SITE_TILESET_URL` configured to the repo-owned validation fixture under `public/fixtures/site-datasets/formal-site-mvp/`
- showcase guard: the harness requires `buildingShowcase=off`, `buildingShowcaseSource=default-off`, and `buildingShowcaseState=disabled`
- site-hook success guard: runtime readiness requires `siteTilesetState=ready` and a `siteTilesetDetail` string confirming that the configured dataset loaded through the native 3D Tiles path
- separation rule: the orchestration restores a clean dormant baseline rebuild afterward so the dataset-enabled artifact does not pollute the accepted Phase 2.12 baseline path

This artifact records the formal site dataset MVP only. It proves the existing `site` preset hook can render a configured dataset-backed building model through Cesium's native runtime. It does not claim that the final delivery AOI has already been supplied, and it does not close the missing admissible Tier 1 / Tier 2 Profile A measurement gate.

## Phase 5.2 Label Review Artifact

- `docs/images/phase-5.2-labels/global-preset-overlay-labels.png`

Capture conditions:

- deployment profile: Profile A / Cesium-native default
- viewport: `1440x900`
- bootstrap selection path: default `global` preset
- overlay state: the accepted Phase 5.2 review line records the default-off startup path followed by the existing single repo-owned top-level walker-backed overlay controller through the narrow capture seam
- label scope: fixed runtime-local labels only, derived from existing `name` or fallback `id` on the landed point path
- no-go guard: `pathCount=0`, `polylineCount=0`, no per-satellite controls, and no overlay HUD / user-facing overlay UI
- shell guard: the repo-owned HUD remains status-only with left/right panels hidden, while the native toolbar, native timeline, and native credits remain visible
- baseline guard: this historical line remains separate from the dormant Phase 2.12 preset screenshots, the formal site dataset artifact line, and the current Phase 5.3 orbit review line
- clock seed: the browser `Date` value is fixed to `2026-04-16T00:00:10.250Z` before app bootstrap
- native clock stabilization: the original review pass paused the native Cesium clock, waited for overlay readiness plus projected labels in view, and only then captured the screenshot

This artifact is a preserved historical cleanliness line for the bounded Phase 5.2 label-only widening. It does not replace the accepted Phase 2.12 baseline, does not replace the formal site dataset MVP artifact, does not describe the current Phase 5.3 orbit-widened runtime by itself, and does not claim admissible measurement evidence.

## Phase 5.3 Orbit Review Artifact

- `docs/images/phase-5.3-orbits/global-preset-overlay-orbits.png`

Use the separate repo-owned capture harness:

```bash
npm run capture:phase5.3-orbits
```

Capture conditions for this separate review line:

- deployment profile: Profile A / Cesium-native default
- viewport: `1440x900`
- bootstrap selection path: default `global` preset
- overlay state: the default startup path remains `satelliteOverlay=off/default-off/disabled`, and the same single repo-owned top-level walker-backed overlay controller is then enabled through the narrow capture seam
- orbit scope: the landed point path plus fixed runtime-local labels remain present, and the only new widening is bounded Cesium polyline orbits on that same path
- no-go guard: `pathCount=0`, `polylineCount>0` only while enabled, no per-satellite controls, and no overlay HUD / user-facing overlay UI
- shell guard: the repo-owned HUD remains status-only with left/right panels hidden, while the native toolbar, native timeline, and native credits remain visible
- separation guard: this line must not overwrite the dormant Phase 2.12 preset screenshots, the preserved Phase 5.2 label line, or the formal site dataset artifact line
- capture note: the current slice records the separate artifact line through its own dedicated package-level capture command while keeping the automated guardrails in `npm run test:phase5.1`
- performance note: the orbit geometry remains a repo-local bounded path with a fixed upper sample budget; this line is review-only and not admissible measurement evidence

This artifact line records the constrained Phase 5.3 orbit widening only. It stays separate from the preserved Phase 5.2 label-only review line and from the accepted Phase 2.12 close-out baseline.

## Phase 3.1 Follow-Up Approval Artifact

- `docs/images/phase-3.1-follow-up/hud-shell-global-1440x900.png`

This PNG is a review-only Phase 3.1 HUD-shell follow-up artifact captured on top of commit `a45a34e`. It is not a Phase 2.12 baseline, does not replace the accepted Phase 2 close-out screenshots, and must not be cited as admissible measurement evidence.

It is now also historical with respect to the active runtime shell: the empty HUD placeholder remains mounted in the DOM, but the placeholder chrome is hidden by default until real HUD functionality lands.

Capture conditions:

- deployment profile: Profile A / Cesium-native default
- viewport: `1440x900`
- bootstrap selection path: default `global` preset
- native shell: preserved, including `Geocoder`, `BaseLayerPicker`, credits, animation widget, timeline, toolbar, and lighting toggle
- HUD scope: empty-panel frame only; no replay clock, overlay manager, or satellite runtime features enabled
- capture note: this follow-up approval screenshot records the HUD shell after the desktop bottom-clearance adjustment from a fresh local build with the native controls idle and no dropdowns open; unlike Phase 2.12, it does not freeze the native clock
- validation note: the interactive-state coexistence checks for expanded geocoder and opened `BaseLayerPicker` live in `npm run test:phase1` rather than in this PNG
