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
