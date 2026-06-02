# Cesium Evidence

This file records the delivery-facing Cesium evidence that remains in the
tracked tree. Generated screenshots and local capture outputs are intentionally
kept out of version control.

## Runtime Evidence

- `cesium@1.140.0` is installed through npm and is not vendored into `src/`.
- `vite.config.ts` copies Cesium runtime assets into `dist/cesium/` during
  `npm run build`.
- `index.html` reserves `window.CESIUM_BASE_URL = "/cesium/";` before the
  application module runs.
- `src/core/cesium/bootstrap.ts` initializes Cesium's runtime base URL before
  the first `Viewer` is created.
- `src/main.ts` starts the bootstrap composition and imports the delivery CSS
  surfaces.

## Verification Evidence

- `npm run build` type-checks the repo and builds the Vite artifact.
- `npm test` runs selected-pair route governance, `npm run build`, and
  `scripts/verify-phase0.mjs`.
- `scripts/verify-phase0.mjs` checks copied Cesium assets, the walker fixture
  hash, installed Cesium package surfaces, and neutral delivery wording.
- `.github/workflows/structural-gates.yml` runs route governance, build,
  final large-file budgets, and the baseline browser smoke in CI.

## Boundary

The evidence above proves repo packaging and runtime integration. It does not
claim live network measurement, native RF handover, commercial SLA, or final
deployment dataset acceptance.
