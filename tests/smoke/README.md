# Smoke Tests

Phase 0 smoke is exposed through `npm test`, implemented in `scripts/verify-phase0.mjs`.

The current check verifies:

- the build completes
- copied Cesium runtime assets exist in `dist/`
- the walker fixture remains intact
- delivery-facing files stay neutral
- installed-package Cesium evidence still matches the repo's recorded assumptions

Runtime bootstrap and first-globe smoke are exposed through `node tests/smoke/bootstrap-loads-assets-and-workers.mjs`.

Phase 1 smoke is exposed through `npm run test:phase1`, which builds the repo, serves `dist/` locally, opens the built app in a headless browser, and checks that the bootstrap state reaches `ready`.

The current Phase 3.1 follow-up coverage also verifies:

- `1440x900` desktop HUD geometry against the native toolbar, credits, and timeline
- short-height HUD fallback behavior at the `max-height: 760px` boundary (`1440x760`)
- pointer pass-through from idle left and right HUD panels into the Cesium canvas
- CDP hover-then-click activation of the native geocoder control (hover to expose the real input hit target, then click the expanded input) plus coordinate-click activation of the native `BaseLayerPicker` toggle, with stacking checks that the expanded geocoder input and opened `BaseLayerPicker` stay above the HUD shell

This follow-up coverage does not claim full end-to-end user reachability for every downstream native-widget state. It proves the initial pointer activation path plus the relevant HUD pass-through and stacking facts only.
