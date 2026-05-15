# customer V4.13 Multi-Orbit Runtime Closure Evidence

Date: 2026-05-13

## Scope

This note records the V4.13 Phase 7.1 bounded public-TLE multi-orbit gate
closure. It covers viewer-side LEO/MEO/GEO runtime observation only.

It does not close customer orbit-model integration, measured network truth,
external validation, M8A-V4 endpoint authority, radio-layer handover, or
complete customer acceptance.

## Fixture Provenance

- LEO: existing V4.12 public Celestrak Starlink fixture,
  `public/fixtures/satellites/leo-scale/provenance.json`, `600` records.
- MEO: public Celestrak `gps-ops` plus `galileo`,
  `public/fixtures/satellites/multi-orbit/meo/provenance.json`, `65` records.
- GEO: public Celestrak `geo` deterministic top-30 active commercial subset,
  `public/fixtures/satellites/multi-orbit/geo/provenance.json`, `30` records.

Fixture builder:

```bash
node scripts/build-v4.13-multi-orbit-fixture.mjs \
  --gps-ops-input /tmp/sgv-gps-ops.tle \
  --galileo-input /tmp/sgv-galileo.tle \
  --geo-input /tmp/sgv-geo.tle \
  --captured-at 2026-05-13T01:28:37Z
```

## Retained Evidence

Command:

```bash
node tests/validation/run-phase7.1-viewer-scope-validation.mjs \
  --validation-profile-id multi-orbit-scale-1000 \
  --requested-overlay-mode multi-orbit-scale-points \
  --enforce-pass
```

Retained artifact:

`output/validation/phase7.1/2026-05-13T01-38-25.092Z-multi-orbit-scale-1000/summary.json`

Observed pass fields:

- `passFailSummary.requirementGatePassed = true`
- `observedRuntimeVariant.overlayRenderMode = "multi-orbit-scale-points"`
- `observedRuntimeVariant.overlayOrbitClassCounts = { leo: 600, meo: 65, geo: 30 }`
- `scaleRunParams.observedLeoCount = 600`
- `scaleRunParams.observedMeoCount = 65`
- `scaleRunParams.observedGeoCount = 30`
- `orbitScopeMatrix[leo/meo/geo].liveRuntimeCoverage.status = "observed"`

## ADR 0005 Re-Review

ADR `0005-perf-budget` was re-reviewed for V4.13 Phase 6. The retained perf
file is:

`output/validation/phase7.1/2026-05-13T01-38-25.092Z-multi-orbit-scale-1000/perf-measurement.json`

The V4.13 runtime remains inside the existing bounded-overlay posture:

- one Cesium `PointPrimitive` per copied public TLE
- no labels
- no paths or polylines
- no orbit-history accumulation
- class distinction uses color plus point size and outline width

The retained perf sample is a headless lower-bound runtime sample, not formal
Tier 1/Tier 2 hardware evidence. It records
`budgetComparison.adr0005BudgetExceeded = false` and
`budgetComparison.governanceCheckpointRequired = false`.
