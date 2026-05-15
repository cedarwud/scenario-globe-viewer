# M8A V4.13 Implementation Phase 1 Multi-Orbit Spec

Date: 2026-05-13
Status: locked for Phases 2..7 execution.

## Scope

This spec locks the Phase 1 choices for the V4.13 Phase 7.1
multi-orbit gate closure slice only. It builds on the V4.12 F-13 LEO leg
and widens that route-native bounded overlay path to public MEO and GEO
TLE fixtures. It does not adopt M8A-V4 ground-station endpoints, does not
  integrate an customer orbit model, and does not claim measured network truth,
  radio-layer handover, external validation completion, or complete customer
  acceptance.

## Locked Decisions

1. MEO catalog source set: use Celestrak `gps-ops` plus `galileo` GP/TLE
   exports:
   - `https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle`
   - `https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle`
   The combined public catalog gives the gate enough headroom for the
   `targetMeoCount = 30` assertion while staying unauthenticated and
   reproducible for repo validation.
2. GEO catalog source set and filter policy: use Celestrak `geo` GP/TLE
   export and commit a deterministic top-30 active commercial GEO subset
   sorted by NORAD catalog id. The subset must exclude obvious debris,
   rocket bodies, transfer objects, and non-operational analyst records
   when those are present in the public group text.
3. Orbit-class derivation rule: derive `orbitClass` from TLE mean motion in
   revolutions per day:
   - `leo`: `meanMotionRevPerDay > 11`
   - `geo`: `0.9 <= meanMotionRevPerDay <= 1.1`
   - `meo`: `1.1 < meanMotionRevPerDay <= 11`, excluding the GEO band
   This resolves the live `gps-ops` + `galileo` source set explicitly:
   current Galileo public TLEs sit near `1.7` rev/day and remain MEO for
   this gate.
   Highly elliptical or otherwise out-of-band records are not target
   fixtures for this slice. If such a record is accidentally included, the
   adapter must keep the derivation deterministic and the provenance/subset
   policy must document the source of the edge case; HEO is a successor
   classification problem, not a V4.13 gate requirement.
4. Per-class visual treatment and accessibility fallback: render all classes
   through Cesium `PointPrimitiveCollection` with class-distinct color,
   point size, and outline. Color is not the only encoding: LEO remains the
   smallest point, MEO is medium, and GEO is largest, with outline width
   retained across classes. The retained validation artifact also exposes
   per-class counts as non-visual evidence.
5. Harness profile id: use `multi-orbit-scale-1000`. The id names the
   Phase 7.1 multi-orbit scale gate profile; it does not promise exactly
   1,000 rendered satellites.
6. Per-class target counts: hard-code the profile defaults as
   `targetLeoCount = 500`, `targetMeoCount = 30`, and `targetGeoCount = 20`.
   CLI overrides may remain available for diagnostics, but
   `--enforce-pass` for `multi-orbit-scale-1000` must fail when any target
   class is below its profile minimum.
7. Walker baseline comparison: run the walker baseline once in the same
   validation session for perf delta context. The walker baseline is not a
   requirement gate and must not weaken the multi-orbit pass/fail rules.
8. F-02 carve-out wording: close F-02 only as a bounded public-TLE
   multi-orbit runtime visualization. The acceptance copy must state:
   `bounded public TLE only; customer orbit-model integration is a distinct
   successor requirement`.
9. ADR 0005 re-review timing: ADR `0005-perf-budget` is re-read before
   implementation and re-reviewed in Phase 6 against the retained
   multi-orbit perf sample. If the multi-orbit render exceeds the existing
   bounded-overlay posture, implementation must stop for a governance
   checkpoint before close-out or commit.
10. Artifact shape: keep the retained Phase 7.1 artifact combined, matching
    `docs/data-contracts/phase7.1-validation-evidence.md`, and add
    per-class target/count fields rather than splitting per-class artifact
    trees.
11. Catalog load order and merge: load LEO, then MEO, then GEO catalogs and
    merge deterministically. Within each class, preserve source order after
    deterministic fixture slicing/deduplication by NORAD catalog id. Later
    catalogs may not silently overwrite earlier records with the same NORAD
    id; duplicate ids are skipped with earlier source precedence.

## ADR 0005 Pre-Implementation Check

ADR `0005-perf-budget` was re-read for this implementation slice before
runtime/source edits. The V4.13 implementation stays inside the existing
bounded-overlay posture by using one point primitive per copied public TLE,
no labels, no paths, no polylines, no orbit-history accumulation, and no
per-satellite entity track.

Phase 6 must record a retained perf comparison for the multi-orbit profile.
If the evidence shows budget exceedance or requires new budget semantics,
the task must stop for governance review rather than reducing the claim
quality in close-out copy.
