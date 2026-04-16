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

- the Phase 3.1 HUD shell remains mounted as repo-owned structure, but now advertises `data-hud-visibility="hidden"` and takes no layout area in both `1440x900` and `1440x760`
- the native toolbar, timeline, and credits band remain visible while that placeholder shell stays hidden
- CDP hover-then-click activation of the native geocoder control plus coordinate-click activation of the native `BaseLayerPicker` toggle still work while the HUD placeholder remains hidden

This follow-up coverage does not claim full end-to-end user reachability for every downstream native-widget state. It proves the initial pointer activation path while the placeholder HUD shell is dormant only.
