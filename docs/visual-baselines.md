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

The default Phase 2.12 capture is intentionally run without `VITE_CESIUM_SITE_TILESET_URL`. Under that condition, the `site` screenshot represents the site preset camera plus the dormant optional 3D tiles hook. No placeholder tileset is injected for baseline generation.

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
