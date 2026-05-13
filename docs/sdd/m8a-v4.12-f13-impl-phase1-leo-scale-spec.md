# M8A V4.12 F-13 Implementation Phase 1 LEO-Scale Spec

Date: 2026-05-12
Status: locked for Phases 2..6 execution.

## Scope

This spec locks the Phase 1 choices for the F-13 LEO-scale route-native
closure slice only. It builds on the F-13 readiness package shipped on
2026-05-12 and does not widen scope into F-09/F-10/F-11/F-16, MEO/GEO
closure, ITRI authority acceptance, or measured network truth.

## Locked Decisions

1. Public source: use Celestrak `starlink` GP/TLE export at
   `https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle`.
   Space-Track is deferred because it requires credentialed access and would
   make fixture refresh non-reproducible for repo validation.
2. Fixture cap: copy a deterministic 600-record subset sorted by NORAD catalog
   id. This clears the `>=500 LEO` gate with headroom while keeping fixture
   bytes and render work bounded.
3. Sampling cadence: render one current propagated point per satellite for the
   LEO-scale runtime gate. No orbit track sampling is enabled for this mode.
   The cadence is therefore the replay-clock tick cadence, bounded by Cesium
   explicit render requests.
4. Render path: use Cesium `PointPrimitiveCollection` for
   `leo-scale-points`. The existing walker `CustomDataSource` point + label +
   polyline path remains the walker baseline and is not reused as the closure
   path.
5. Walker baseline comparison: include a same-run walker baseline observation
   in `perf-measurement.json` for delta context. The pass/fail gate remains the
   LEO leg, not walker parity.
6. Fixture refresh policy: fixture refresh is ad-hoc and explicit for this
   slice. A refresh must rerun the copy/subset command, update provenance, and
   rerun the Phase 7.1 validation artifact. No scheduled refresh policy is
   created here.
7. Multi-orbit stub: keep `multi-orbit-scale-points` available as the existing
   readiness/demo mode only. This slice does not add MEO/GEO ingestion, does
   not make MEO/GEO rows pass, and does not claim multi-orbit closure.

## ADR 0005 Pre-Phase-4 Check

ADR `0005-perf-budget` was re-reviewed for this implementation slice before
Phase 4. The relevant bound is that constrained overlay widening must keep
explicit local bounds and avoid unbounded orbit-history accumulation. The
Phase 1 decision therefore rejects per-satellite Entity labels/paths/polylines
for `leo-scale-points` and uses one bounded point primitive per copied LEO TLE.

If Phase 4 evidence shows the LEO point-primitive path exceeds the existing
budget posture or needs new budget semantics, implementation must stop for a
governance checkpoint before close-out.
