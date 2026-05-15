# customer F-13 LEO-Scale Runtime Closure Evidence

Date: 2026-05-12

Scope: F-13 LEO leg only. This note does not claim MEO/GEO closure, customer
authority acceptance, measured traffic truth, active satellite/gateway/path
truth, customer orbit-model integration, or full Phase 7.1 closure.

## Closed Bounded Slice

The viewer now exposes a route-native LEO-scale overlay mode:
`leo-scale-points`.

The mode loads the copied public Celestrak Starlink TLE fixture under
`public/fixtures/satellites/leo-scale/`, propagates the copied records through
the non-walker bulk TLE adapter, and renders one bounded Cesium
`PointPrimitive` per copied LEO TLE. It does not use the walker fallback path
for the LEO gate.

## Fixture Provenance

| Field | Value |
| --- | --- |
| Source | `Celestrak` |
| Source URL | `https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle` |
| Captured at UTC | `2026-05-12T12:35:35.000Z` |
| Copied fixture | `public/fixtures/satellites/leo-scale/starlink-2026-05-12T12-35-35Z.tle` |
| Raw record count | `10313` |
| Copied LEO count | `600` |
| Subset policy | deterministic first `600` records sorted by NORAD catalog id |

## Retained Evidence

Artifact directory:

`output/validation/phase7.1/2026-05-12T13-31-11.187Z-leo-scale-500/`

Key `summary.json` results:

| Field | Value |
| --- | --- |
| `validationProfile.id` | `leo-scale-500` |
| `scaleRunParams.observedLeoCount` | `600` |
| `passFailSummary.requirementGatePassed` | `true` |
| `overlayRenderMode` | `leo-scale-points` |
| `observedRuntimeVariant.overlayMode` | `leo-scale-points` |
| `observedRuntimeVariant.overlayPointCount` | `600` |
| LEO live coverage | `observed` |
| MEO/GEO live coverage | `not-implemented` |

Perf evidence is retained in `perf-measurement.json`. ADR
`0005-perf-budget` was re-reviewed before the perf pass. The route-native LEO
path stays within the ADR's bounded-overlay posture: one point primitive per
copied TLE, no labels, no paths, no polylines, and no orbit-history
accumulation. The recorded frame samples are headless lower-bound evidence,
not Tier 1/Tier 2 formal machine evidence.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run build` | Pass; retained Vite large-chunk and upstream `protobufjs` eval warnings remain ADR-tracked. |
| `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id leo-scale-500 --target-leo-count 500 --requested-overlay-mode leo-scale-points --enforce-pass` | Pass; wrote the retained artifact above. |

## Remaining Gaps

- MEO/GEO live runtime coverage remains open for a later Phase 7.1 slice.
- customer authority acceptance remains external and is not claimed here.
- Measured throughput, latency, jitter, packet loss, `ping`, and `iperf`
  truth remain out of scope.
- customer orbit-model integration remains open pending customer-provided data.
