# M8A V4.12 F-13 LEO-Scale Runtime Plan

Date: 2026-05-12
Working phase name: **M8A V4.12 customer must-have followup (Phase 7.1 LEO-scale leg)**.

## 0. Status

Status: implemented for the F-13 LEO leg on 2026-05-12.

This file started as the planning SDD. The execution task authorized the
Phases 1..6 route-native LEO closure slice, with Phase 1 locked in
[m8a-v4.12-f13-impl-phase1-leo-scale-spec.md](./m8a-v4.12-f13-impl-phase1-leo-scale-spec.md).

Governance note: F-13 sits inside the Phase 7.1 evidence boundary, **not**
inside the V4.12 operator-HUD followup chain. It re-uses the V4.12 working
phase name for staging convenience only.

Parent contract:
[../data-contracts/phase7.1-validation-evidence.md](../data-contracts/phase7.1-validation-evidence.md).

Parent governance:
[phase-6-plus-requirement-centered-plan.md](./phase-6-plus-requirement-centered-plan.md).

Hard dependencies:

- ADR `0005-perf-budget` must be re-reviewed; perf budget changes require a
  governance checkpoint before code lands.
- Walker-only runtime path stays as the default; the LEO-scale path is
  toggle-mounted, never default-on.

## 1. customer Requirement Reference

Acceptance-report quote:

`/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md:26`:

```text
| F-13 | 支援至少 `500 LEO` | `待完成` | Current live runtime is still bounded to the copied walker proof line. | `7.1` |
```

customer README §2.7 quote:

`/home/u24/papers/itri/README.md:267-281`:

```text
- 支援 `>= 500 LEO` 模擬
  - kickoff 功能需求圖還直接舉例：`Starlink`、`OneWeb`
- 模擬速度可調
- 可在 `real time` 與預錄 `TLE` 情境間切換
```

Interpretation:

F-13 closes the LEO-scale leg of Phase 7.1. Multi-orbit MEO/GEO closure is
deferred to a separate Phase 7.1 slice. Public Starlink / OneWeb TLE may be
ingested as data input; this does not promote walker runtime into closure.

## 2. Current Scene Reality

### 2.0 Readiness Package Already Shipped (2026-05-12)

Commit `aeede21` `feat(itri): add F-13 scale readiness package` shipped a
route-exposed fixture/model-backed scale readiness surface on
`/?scenePreset=regional&m8aV4GroundStationScene=1` reporting `549/540 LEO + 6
MEO + 3 GEO`. See
[../intake/itri-f13-scale-readiness-evidence-addendum-2026-05-12.md](../intake/itri-f13-scale-readiness-evidence-addendum-2026-05-12.md).

That readiness surface is **readiness/demo evidence, not closure/proof**. Per
the addendum the remaining gap is:

- route-native `>=500 LEO` closure/proof
- customer authority acceptance
- live network truth (out of scope; permanent external dependency)
- customer orbit-model integration (out of scope; needs customer data)
- multi-orbit MEO/GEO live runtime closure (out of scope of this slice)

This plan therefore scopes the next slice as **route-native LEO-scale runtime
closure** built on the readiness surface, not a from-scratch ingestion path.

### 2.1 Evidence-Contract Live Runtime States

- `walker-only` — current default; copied 18-sat fixture
- `leo-scale-points` — overlay request mode for the LEO-scale leg
- `multi-orbit-scale-points` — overlay request mode for full multi-orbit leg

Existing seams:

- `src/runtime/satellite-overlay-controller.ts` — single repo-owned top-level
  controller
- `src/features/satellites/walker-fixture-adapter.ts` — walker TLE ingestion
- `src/features/satellites/adapter.ts` — adapter contract surface
- `tests/validation/run-phase7.1-viewer-scope-validation.mjs` — harness that
  reads capture-seam state and writes `summary.json`

What is missing for F-13 route-native closure (post-readiness):

1. Public-source TLE catalog (Celestrak Starlink) copied into
   `public/fixtures/satellites/leo-scale/` with provenance JSON, replacing or
   complementing the current walker-derived readiness fixture.
2. Non-walker bulk-TLE adapter that ingests the public catalog under the
   existing `SatelliteOverlayAdapter` contract.
3. Overlay controller `leo-scale-points` request path that consumes the new
   adapter on the canonical route, distinct from the walker fallback.
4. Perf evidence at route-native render: avg frame time, peak memory delta,
   drop-frame rate compared to ADR `0005-perf-budget`.
5. Phase 7.1 harness run with `--target-leo-count 500
   --requested-overlay-mode leo-scale-points --enforce-pass` producing
   `requirementGatePassed = true` for the LEO leg and **observed runtime
   variant** showing `overlayRenderMode = "leo-scale-points"` (not the
   walker-derived readiness fixture mode).
6. Acceptance-report row update from `部分完成` to
   `已完成（LEO leg, route-native, bounded overlay）`.

## 3. Goal / Acceptance Criteria

Goal: close the LEO-scale leg of Phase 7.1 by ingesting public ≥500 LEO TLE,
rendering them through a bounded overlay path, and producing retained
evidence that satisfies `evidenceBoundaryEstablished` **and**
`requirementGatePassed` for the LEO row.

F-13 LEO-leg closed requires:

1. A copied public TLE fixture under
   `public/fixtures/satellites/leo-scale/` with provenance JSON:
   - `source`: `Celestrak` or `Space-Track` URL captured at copy time
   - `capturedAt`: ISO 8601 timestamp
   - `epochCount`: integer ≥ 500
   - `licenseNote`: short repo-owned text
2. A non-walker adapter, e.g. `tle-bulk-adapter.ts`, that parses bulk TLE,
   propagates with SGP4, and returns serializable orbit points within the
   existing adapter contract.
3. Overlay controller `leo-scale-points` mode wired to that adapter, default
   off, toggle via existing capture-seam.
4. Retained evidence under `output/validation/phase7.1/<ISO8601>-<run>/`:
   - `summary.json` with `observedLeoCount >= 500`
   - `passFailSummary.requirementGatePassed = true` for the LEO leg
   - `orbitScopeMatrix[leo].liveRuntimeCoverage.status = "observed"`
   - MEO/GEO rows remain `walker-only` or `not-implemented` (honest)
5. Perf evidence captured in the same artifact directory:
   - avg frame time over a fixed sample window
   - peak memory delta vs walker baseline
   - drop-frame rate vs perf budget
6. No external NAT / tunnel / DUT / iperf / ping claim.
7. No claim of multi-orbit closure.

## 4. Scope / Non-Goals

In scope for future implementation:

- bulk TLE ingestion adapter;
- public LEO TLE fixture copy + provenance metadata;
- overlay controller LEO-scale path;
- harness run targeting `--target-leo-count 500 --enforce-pass`;
- perf measurement capture;
- retained evidence artifacts;
- ADR `0005-perf-budget` re-review delta.

Non-goals:

- no MEO/GEO ingestion (separate Phase 7.1 slice);
- no F-09 / F-10 / F-11 / F-16 work;
- no live `iperf` / `ping` measurement;
- no V4.11 ground-station scene change;
- no V-02..V-06 external validation closure;
- no per-satellite UI;
- no orbit-pruning, LOD, or animation polish beyond perf-budget compliance;
- no claim that 500 LEO under viewer runtime is equivalent to customer
  acceptance gate for multi-orbit scope.

## 5. Forbidden Claims

- `multi-orbit closure`
- `>=500 LEO + MEO + GEO closure`
- `Phase 7.1 full closure`
- `Starlink production parity`
- `OneWeb production parity`
- `live RF handover at scale`
- `measured throughput at scale`
- `external network validated`
- `Phase 8 unlocked by this slice`
- `customer acceptance complete`

Allowed copy:

- `LEO-scale evidence (≥500)`
- `Public TLE fixture, repo-copied`
- `Bounded overlay path`
- `Modeled, not measured.`

## 6. Phase Plan

Phase count: **6 implementation phases**.

### Phase 1 — Public TLE Source Decision + Fixture Copy

- decide between Celestrak (`stations.txt`, `starlink.txt`,
  `oneweb.txt`) or Space-Track bulk export;
- planning recommendation: Celestrak `starlink.txt` (largest LEO single-source
  catalog, public, low license risk for repo copy).
- capture provenance: source URL, captured-at timestamp, count, license note;
- write `public/fixtures/satellites/leo-scale/starlink-<capturedAt>.tle` and
  `provenance.json`;
- limit fixture to a deterministic subset (top N=600 by NORAD id) to keep
  bytes manageable;
- document copy procedure in `docs/visual-baselines.md` or sibling fixture doc.

### Phase 2 — Bulk TLE Adapter

- add `src/features/satellites/bulk-tle-adapter.ts`;
- reuse SGP4 propagation logic from walker adapter where possible;
- expose serializable orbit points within the existing
  `SatelliteOverlayAdapter` contract;
- support bounded epoch sampling cadence (e.g. 30s × 30 samples = 15 min);
- ensure adapter is pure data; no Cesium runtime classes leaked.

### Phase 3 — Overlay Controller LEO-Scale Path

- extend `src/runtime/satellite-overlay-controller.ts` request modes:
  `walker-points` (existing) + `leo-scale-points` (new);
- new mode loads bulk adapter, attaches PointPrimitive collection (no
  per-satellite Entity / Label / Path);
- detach path restores prior bounded state without leaks;
- expose `overlayRenderMode = "leo-scale-points"` on
  `document.documentElement.dataset` for harness consumption.

### Phase 4 — Perf Budget Reconciliation

- run with `leo-scale-points` mode for fixed sample window;
- capture: avg frame time, peak memory delta, drop-frame rate;
- compare against ADR `0005-perf-budget` thresholds;
- if budget would be exceeded, stop and request governance checkpoint
  before code lands.

### Phase 5 — Harness Run + Evidence Capture

- run:

```bash
node tests/validation/run-phase7.1-viewer-scope-validation.mjs \
  --validation-profile-id leo-scale-500 \
  --target-leo-count 500 \
  --requested-overlay-mode leo-scale-points \
  --enforce-pass
```

- harness produces retained artifacts per
  `data-contracts/phase7.1-validation-evidence.md` artifact tree;
- include perf evidence file `perf-measurement.json` alongside `summary.json`;
- confirm `summary.json` records:
  - `observedLeoCount >= 500`
  - `requirementGatePassed = true` for the LEO leg
  - MEO/GEO rows still honest as `walker-only` or `not-implemented`.

### Phase 6 — Close-Out Doc + Acceptance Note

- update `01-itri-requirement-inventory-and-status.md` F-13 row:
  `部分完成 → 已完成（LEO leg, bounded overlay, multi-orbit MEO/GEO still open）`;
- update Phase 7.1 evidence contract narrative if observed runtime variants
  diverged from spec;
- record acceptance note: scope, fixture source, fixture count, perf delta,
  artifact path;
- mark MEO/GEO leg as next Phase 7.1 slice; do not bundle here.

## 7. Skill Use Plan

Required queries:

```bash
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "large dataset rendering point cloud performance" --domain chart
```

Reuse ADR `0005-perf-budget` for thresholds. Reuse existing walker adapter
patterns for SGP4 propagation. No new UI surface in F-13.

## 8. V4.11 + Operator HUD Entanglement Check

Assessment: **independent**.

F-13 lives entirely on the satellite overlay controller path; it does not
touch Operator HUD, V4.11 scene, or any F-09/F-10/F-11/F-16 surface.

## 9. Open Questions For Planning / Control

1. Celestrak vs Space-Track: which source is preferred for license/provenance?
2. Fixture cap: 500, 600, 1000, or "all Starlink" — what's the perf-budget
   limit?
3. Epoch sampling cadence: 30s × 30 samples enough, or denser?
4. Render path: PointPrimitive collection vs PointCloud primitive — which is
   accepted by ADR `0005-perf-budget`?
5. Should the harness include a comparable walker baseline run in the same
   artifact dir for delta context?
6. Should fixture refresh cadence (re-pull from Celestrak) be policy or
   ad-hoc?
7. Should `multi-orbit-scale-points` request mode be stubbed (returns
   `not-implemented`) in this slice, or deferred entirely?

## 10. Acceptance Gates

- `summary.json` shows `observedLeoCount >= 500` and
  `requirementGatePassed = true` for the LEO leg.
- ADR `0005-perf-budget` re-review checked off (or amended with delta).
- Perf evidence file captures frame time, memory, drop-frame rate.
- MEO/GEO rows in `orbitScopeMatrix` remain honest (no false closure).
- No external NAT / tunnel / DUT claim added.
- Fixture provenance JSON present and valid.
- customer acceptance row updated honestly.

## 11. Open After Planning SDD

- exact starlink count cap;
- whether to ship OneWeb fixture in same slice or defer;
- whether to add an operator-visible LEO-scale toggle to Operator HUD (likely
  defer);
- whether to add a perf-budget dashboard surface in HUD (defer to D-03);
- whether F-13 LEO closure unblocks a marketing claim for customer demo (defer to
  acceptance package).

## 12. Implementation Close-Out

Closed slice: F-13 LEO leg only, route-native bounded overlay.

Landed implementation:

- Phase 1 spec:
  [m8a-v4.12-f13-impl-phase1-leo-scale-spec.md](./m8a-v4.12-f13-impl-phase1-leo-scale-spec.md)
- public fixture and provenance:
  `public/fixtures/satellites/leo-scale/provenance.json`
- fixture builder:
  `scripts/build-f13-leo-scale-fixture.mjs`
- non-walker ingestion:
  `src/features/satellites/bulk-tle-adapter.ts`
- route-native render path:
  `src/runtime/leo-scale-point-primitive-overlay-adapter.ts`
- controller mode:
  `src/runtime/satellite-overlay-controller.ts` reports
  `overlayRenderMode = "leo-scale-points"` for the LEO path
- retained evidence:
  `output/validation/phase7.1/2026-05-12T13-31-11.187Z-leo-scale-500/`

Evidence result:

- `observedLeoCount = 600`
- `passFailSummary.requirementGatePassed = true`
- `overlayRenderMode = "leo-scale-points"`
- MEO/GEO remain `not-implemented`

ADR `0005-perf-budget` was re-reviewed before Phase 4. The route-native LEO
path keeps one bounded point primitive per copied TLE, no labels, no paths, no
polylines, and no orbit-history accumulation. The retained perf artifact is a
headless lower-bound runtime sample, not a Tier 1/Tier 2 formal machine claim.
