# M8A V4.13 Multi-Orbit Scale Runtime Plan

Date: 2026-05-13
Working phase name: **M8A V4.13 Phase 7.1 multi-orbit gate closure**.

## 0. Status

Status: implemented on 2026-05-13 for the bounded public-TLE multi-orbit
viewer gate.

This file started as the planning SDD. The execution task authorized Phases
1..7 for V4.13, with Phase 1 locked in
[m8a-v4.13-impl-phase1-multi-orbit-spec.md](./m8a-v4.13-impl-phase1-multi-orbit-spec.md).

Parent contracts:

- [../data-contracts/phase7.1-validation-evidence.md](../data-contracts/phase7.1-validation-evidence.md)
- [./m8a-v4.12-followup-index.md](./m8a-v4.12-followup-index.md)

Hard dependencies:

- F-13 LEO leg already closed by commit `677faf5`. Bulk-TLE adapter +
  PointPrimitive overlay path already in place at
  `src/features/satellites/bulk-tle-adapter.ts` and
  `src/runtime/leo-scale-point-primitive-overlay-adapter.ts`.
- ADR `0005-perf-budget` must be re-reviewed; closer-to-the-ceiling
  multi-orbit render expected to widen perf footprint beyond the LEO-only
  slice.

## 1. ITRI Requirement Reference

Acceptance-report quotes:

`/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`:

- F-02 multi-orbit `部分完成`: contract carries orbit-class intent but no
  multi-orbit live runtime validation.
- F-13 `部分完成` (post-LEO-leg closure): LEO route-native closed; MEO/GEO
  remain `not-implemented`.

ITRI README §2.1:

```text
原始需求明確提到要整合 ITRI 自己開發的軌道模型，並點名：
- `LEO`
- `MEO`
- `GEO`
```

Interpretation:

V4.13 closes the **multi-orbit Phase 7.1 gate** by widening the existing
F-13 bulk-TLE adapter to ingest at least one MEO catalog and one GEO catalog,
attaching them through the existing overlay controller `multi-orbit-scale-points`
request mode, and producing a retained validation artifact whose
`orbitScopeMatrix` rows for `leo / meo / geo` all read `observed` with
non-zero live runtime counts.

V4.13 does **not** close:

- F-01 ITRI orbit-model integration (still needs ITRI-supplied model)
- F-02 full radio-layer handover at multi-orbit scale (different requirement)
- F-07/F-08/F-12 measured-truth chain
- V-02..V-06 external validation
- M8A-V4 ground-station endpoint-pair authority gate
- D-03 richer presentation composition

## 2. Current Scene Reality

After V4.12 close-out and F-13 fix:

- `src/features/satellites/bulk-tle-adapter.ts` parses TLE bulk text +
  propagates SGP4
- `src/runtime/leo-scale-point-primitive-overlay-adapter.ts` renders
  PointPrimitive collection
- `src/runtime/satellite-overlay-controller.ts` declares
  `multi-orbit-scale-points` mode but the fixture path is still synthetic
  (see `leo-scale-overlay-fixture.ts` for the multi-orbit synthetic
  fallback that ships today)
- `tests/validation/run-phase7.1-viewer-scope-validation.mjs` supports the
  `multi-orbit-scale-points` request mode but currently observes
  `synthetic-walker-derived` orbits for MEO/GEO, so the gate cannot reach
  full closure

What is missing:

1. Public MEO TLE fixture (planning recommendation: Celestrak `gps-ops` +
   `galileo` — combined ~50–60 active satellites) with provenance JSON
2. Public GEO TLE fixture (planning recommendation: Celestrak `geo` group
   filtered to commercial/military GEO sats — bounded to ~50 records to
   avoid bloat) with provenance JSON
3. Bulk-TLE adapter widening to tag each parsed record with `orbitClass`
   derived from epoch + mean motion (LEO: > 11 rev/day, MEO: 2–11, GEO:
   ~1 rev/day) — replacing the synthetic walker-derived class assignment
4. Overlay controller `multi-orbit-scale-points` mode wired to combined
   LEO + MEO + GEO catalog, exposing `satelliteOverlayRenderMode =
   "multi-orbit-scale-points"`
5. Harness profile `multi-orbit-scale-1000` (or equivalent) with
   `requiredOrbitClasses = ["leo", "meo", "geo"]` and per-class minimum
   count targets
6. Perf evidence captured at multi-orbit render
7. Acceptance-report row updates: F-02 `部分完成 → 已完成（bounded）`,
   F-13 `部分完成 → 已完成（bounded）`

## 3. Goal / Acceptance Criteria

Goal: close the Phase 7.1 multi-orbit gate by ingesting public MEO + GEO
TLE on top of the existing LEO fixture, rendering all three classes
through one bounded overlay path, and producing retained evidence whose
`requirementGatePassed = true` for the multi-orbit profile.

V4.13 closed requires:

1. Copied public MEO TLE fixture under
   `public/fixtures/satellites/multi-orbit/meo/` with provenance JSON:
   - `source`: Celestrak `gps-ops` + `galileo` URLs at copy time
   - `capturedAt`: ISO 8601 timestamp
   - `epochCount`: integer (planning target: ≥ 40)
   - `subsetPolicy`: short repo-owned text
   - `licenseNote`: short repo-owned text
2. Copied public GEO TLE fixture under
   `public/fixtures/satellites/multi-orbit/geo/` with provenance JSON:
   - similar shape; `epochCount` (planning target: ≥ 30)
3. Bulk-TLE adapter widened to:
   - tag each parsed record with `orbitClass` derived from mean motion
   - support catalog-merge across multiple input files
   - preserve provenance per source file
4. Overlay controller `multi-orbit-scale-points` mode:
   - loads LEO + MEO + GEO catalogs in sequence
   - renders one Cesium `PointPrimitive` per record; class-distinct
     visual treatment (size or color per class) **with color-not-only**
     fallback (size + outline) per ADR `0005-perf-budget` and a11y
   - reports `satelliteOverlayRenderMode = "multi-orbit-scale-points"`
     and `satelliteOverlayOrbitClassCounts.{leo,meo,geo}` non-zero
5. Harness profile `multi-orbit-scale-1000`:
   - `requiredOrbitClasses = ["leo", "meo", "geo"]`
   - `targetLeoCount = 500`, `targetMeoCount = 30`, `targetGeoCount = 20`
   - `--enforce-pass` returns non-zero only when any class fails
6. Retained artifact under
   `output/validation/phase7.1/<ISO8601>-multi-orbit-scale-1000/`:
   - `summary.json` shows `requirementGatePassed = true`
   - `orbitScopeMatrix[leo/meo/geo].liveRuntimeCoverage.status = "observed"`
   - `observedRuntimeVariant.overlayOrbitClassCounts` carries non-zero
     per-class counts
   - `perf-measurement.json` records frame time, memory delta, drop-frame
     rate vs ADR `0005-perf-budget`
7. Acceptance-report rows updated honestly:
   - F-02: `部分完成 → 已完成（bounded, public TLE only; no ITRI orbit-model integration）`
   - F-13: `部分完成 (LEO-leg-closed) → 已完成（multi-orbit, bounded, public TLE only）`
8. Forbidden-claim scan green; no measured-truth, native RF, active path,
   or external validation closure implied.

## 4. Scope / Non-Goals

In scope for future implementation:

- public MEO + GEO TLE fixture copy + provenance metadata
- bulk-TLE adapter widening for orbit-class tagging + multi-catalog merge
- overlay controller `multi-orbit-scale-points` route-native path
- harness `multi-orbit-scale-1000` profile + retained artifact
- ADR `0005-perf-budget` re-review delta if needed
- per-class visual differentiation (size + color, with a11y fallback)
- F-02 / F-13 acceptance-report row updates

Non-goals:

- no ITRI orbit-model integration (F-01)
- no radio-layer handover at multi-orbit scale
- no F-09 / F-10 / F-11 / F-16 changes
- no F-07/F-08/F-12 measured throughput
- no V-02..V-06 external stack
- no M8A-V4 ground-station endpoint pair adoption
- no D-03 presentation composition expansion
- no per-satellite Entity, Label, Path, or per-class UI controls
- no orbit-history accumulation
- no per-class scenario authoring
- no policy widening to per-orbit-class rules (would re-open F-11)

## 5. Forbidden Claims

- `multi-orbit radio-layer handover`
- `multi-orbit measurement-backed truth`
- `multi-orbit live network validated`
- `ITRI orbit model is integrated`
- `Starlink/OneWeb operational parity`
- `Intelsat/SES production parity`
- `GPS/Galileo production handover`
- `V-02 through V-06 closed`
- `Phase 8 unlocked by this slice`
- `M8A-V4 endpoint-pair gate resolved`
- `complete ITRI acceptance`

Allowed copy:

- `Multi-orbit public-TLE bounded overlay`
- `LEO + MEO + GEO public fixture`
- `Modeled, not measured.`
- `Repo-owned bounded multi-orbit projection`

## 6. Phase Plan

Phase count: **7 implementation phases**.

### Phase 1 — Phase 1 Spec Lock-In

Resolve §9 open questions before any code. Match the style of existing
F-13 Phase 1 spec (`m8a-v4.12-f13-impl-phase1-leo-scale-spec.md`):

- choose MEO source set (`gps-ops` only, or `gps-ops + galileo`)
- choose GEO source set + subset cap policy
- choose class-tag derivation rule (mean motion thresholds: LEO > 11
  rev/day, MEO 2–11, GEO 0.9–1.1)
- choose per-class visual treatment + a11y fallback
- choose harness profile id + per-class target counts
- decide whether perf budget must be re-reviewed before code or after
- decide whether the harness writes per-class artifacts or combined
- decide single-fixture-load vs sequential-catalog-load order

### Phase 2 — Public MEO + GEO Fixture Copy

- write fixture build script (or extend existing F-13 fetcher) to pull
  Celestrak catalogs, dedupe by NORAD, slice to cap, emit
  `provenance.json`
- commit fixture files under `public/fixtures/satellites/multi-orbit/`
- never check in API credentials; Celestrak is unauth

### Phase 3 — Bulk-TLE Adapter Widening

- extend parser to compute `orbitClass` per record
- extend type surface with `OrbitClass` ("leo" | "meo" | "geo")
- support multi-catalog merge with deterministic ordering
- preserve per-record provenance fields
- adapter remains pure data; no Cesium runtime classes leaked

### Phase 4 — Overlay Controller `multi-orbit-scale-points` Wiring

- extend `src/runtime/satellite-overlay-controller.ts` to load LEO + MEO +
  GEO sequentially when mode = `multi-orbit-scale-points`
- per-class PointPrimitive collection with class-distinct size + color +
  outline (color-not-only)
- expose `satelliteOverlayRenderMode = "multi-orbit-scale-points"` and
  `satelliteOverlayOrbitClassCounts` non-zero per class
- detach path restores prior state cleanly

### Phase 5 — Harness Profile + Retained Evidence

- extend
  `tests/validation/run-phase7.1-viewer-scope-validation.mjs` with
  `multi-orbit-scale-1000` profile
- per-class target count assertions in
  `requirementGatePassed` evaluation
- update `phase7.1-validation-evidence.md` contract for the new profile
- write `perf-measurement.json` alongside `summary.json`

### Phase 6 — ADR 0005 Re-Review

- read ADR `0005-perf-budget`
- measure multi-orbit render against budget
- if multi-orbit exceeds budget, decide:
  - reduce per-class cap (default fix)
  - update ADR with new budget delta (requires governance checkpoint)
  - downgrade visual treatment (no per-class size; only color)

### Phase 7 — Close-Out + Acceptance Update

- update `01-itri-requirement-inventory-and-status.md` F-02 + F-13 rows
- update `02-completed-capability-bundles.md` with V4.13 bundle entry
- update `phase-6-plus-requirement-centered-plan.md` V4.13 reference
- update `m8a-v4.12-followup-index.md` cross-link to V4.13
- record retained artifact path, perf delta, fixture provenance, smoke
  command

## 7. Skill Use Plan

Required queries during Phase 1:

```bash
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "color not only size shape data class" --domain ux
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "large dataset point cloud performance" --domain chart
```

Apply visual-encoding guidance to ensure orbit class is conveyed via at
least 2 channels (color + size, or color + outline, or size + symbol).
Apply ADR `0005-perf-budget` for render cost ceiling.

## 8. V4.11 / V4.12 Entanglement Check

Assessment: **independent**.

- V4.11 ground-station scene unchanged
- V4.12 operator HUD slices unchanged
- F-13 LEO fixture and adapter widened, not replaced
- Multi-orbit overlay path mounted via existing capture-seam toggle, not
  default-on

## 9. Open Questions For Planning / Control

1. MEO catalog: `gps-ops` only (~31 sats) or `gps-ops + galileo` (~57)?
   Larger catalog = more confident gate, more perf cost.
2. GEO catalog: full Celestrak `geo` group (~600+ historical) or filtered
   to 30 active commercial GEO sats?
3. Class-tag derivation: mean-motion threshold (simple, may misclassify
   highly elliptical orbits) or hybrid (mean motion + eccentricity)?
4. Per-class visual: size scale (LEO smallest, GEO largest) or color
   palette? Both?
5. Harness profile id: `multi-orbit-scale-1000` or `multi-orbit-scale-v1`?
6. Per-class target counts: hard-coded in profile or configurable via
   CLI flags?
7. Walker fallback: should the harness still allow walker-points as a
   baseline run for comparison?
8. Acceptance carve-out: F-02 closure rule — is bounded public TLE alone
   sufficient, or must the SDD document that "ITRI orbit-model integration"
   is a distinct successor requirement?

## 10. Acceptance Gates

- `summary.json` shows `requirementGatePassed = true` and non-zero counts
  for `leo / meo / geo` rows
- `overlayRenderMode = "multi-orbit-scale-points"` in
  `observedRuntimeVariant`
- ADR `0005-perf-budget` re-review checked off (or amended with delta)
- Fixture provenance JSON present and valid for both MEO and GEO
- Per-class visual differentiation passes color-not-only check
- No forbidden-claim copy in any new doc/artifact
- F-02 + F-13 rows updated honestly with new bounded-closure narrative

## 11. Open After Planning SDD

- exact CSV/JSON shape for retained artifact (current contract supports
  combined; per-class split would need contract widening)
- whether to ship a per-class operator HUD toggle (likely defer)
- whether to add a per-class label overlay (defer; would re-open per-sat
  UI scope)
- whether to update D-03 presentation composition once multi-orbit lands
  (M8A-V3 umbrella decision)
- whether bounded multi-orbit closure unblocks marketing claim for ITRI
  demo (acceptance package question, not SDD)

## 12. Dependency / Sequencing With Other Tracks

| Track | Relationship | Notes |
|---|---|---|
| F-09 / F-10 / F-11 / F-16 | independent | V4.12 chain closed; do not reopen |
| External validation (V-02..V-06) | independent; blocked on OMNeT++/INET | V4.13 does not advance external validation |
| M8A-V4 product anchor | partial overlap | V4.13 builds the multi-orbit substrate that M8A-V4 will eventually render endpoint-pair handover through; do not adopt M8A-V4 endpoints in V4.13 |
| D-03 presentation | downstream | richer composition may use V4.13 outputs once landed |
| F-01 ITRI orbit-model | distinct successor | V4.13 closes public-TLE bounded leg only; F-01 needs ITRI-supplied model |

V4.13 is the cleanest pre-M8A-V4 closure that the project can reach
without external authority gates.

## 13. Implementation Close-Out

Closed slice: V4.13 Phase 7.1 bounded public-TLE multi-orbit gate.

Landed implementation:

- Phase 1 spec:
  [m8a-v4.13-impl-phase1-multi-orbit-spec.md](./m8a-v4.13-impl-phase1-multi-orbit-spec.md)
- public MEO/GEO fixtures and provenance:
  `public/fixtures/satellites/multi-orbit/`
- fixture builder:
  `scripts/build-v4.13-multi-orbit-fixture.mjs`
- widened bulk TLE ingestion:
  `src/features/satellites/bulk-tle-adapter.ts`
- class-distinct point-primitive render path:
  `src/runtime/leo-scale-point-primitive-overlay-adapter.ts`
- controller mode:
  `src/runtime/satellite-overlay-controller.ts` reports
  `overlayRenderMode = "multi-orbit-scale-points"` for the V4.13 path
- retained evidence:
  `output/validation/phase7.1/2026-05-13T01-38-25.092Z-multi-orbit-scale-1000/`

Evidence result:

- `passFailSummary.requirementGatePassed = true`
- `observedRuntimeVariant.overlayRenderMode = "multi-orbit-scale-points"`
- `observedRuntimeVariant.overlayOrbitClassCounts = { leo: 600, meo: 65, geo: 30 }`
- `orbitScopeMatrix[leo/meo/geo].liveRuntimeCoverage.status = "observed"`

ADR `0005-perf-budget` was re-reviewed in Phase 6. The V4.13 path keeps one
bounded point primitive per copied public TLE, no labels, no paths, no
polylines, and no orbit-history accumulation. The retained perf artifact is a
headless lower-bound runtime sample and records no ADR 0005 budget exceedance
or governance checkpoint requirement.

This close-out is bounded public-TLE viewer evidence only. It does not close
ITRI orbit-model integration, measured traffic truth, external validation,
M8A-V4 endpoint authority, radio-layer handover, or complete ITRI acceptance.
