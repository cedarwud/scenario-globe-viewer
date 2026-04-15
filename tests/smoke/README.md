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
