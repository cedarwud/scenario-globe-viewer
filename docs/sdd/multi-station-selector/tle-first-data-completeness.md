# Multi-Station Selector — TLE-First Data Completeness

Draft date: 2026-05-18
Status: implemented through D7 on 2026-05-18

## Scope

This document defines the data-completeness plan for the selected-pair route:

```text
/?stationA=<stationId>&stationB=<stationId>
```

The goal is to make selected-pair the canonical runtime path for any two valid
registry stations. The route should use TLE-derived satellite identity,
propagated position samples, visibility windows, and modeled handover decisions
wherever local source data supports them. Any modeled value, public-registry
assumption, fixture fallback, or display-only transform must remain explicit.

This SDD is about data truth and fallback policy. It is not a camera-framing or
cinematic-layout SDD. A later visual SDD can use this contract to build a
demo-quality view for arbitrary station pairs without blurring data boundaries.

No new customer-specific identifier or project-external agency name is part of
this document's terminology.

## 1. Mission

The viewer should support this data story:

1. A reviewer opens a selected-pair URL with two registry station ids.
2. The runtime resolves those ids from the public registry.
3. Satellite actors are selected from local TLE sources, not hand-authored
   selected-pair fixtures.
4. Satellite positions and tracks are propagated from TLE records.
5. Visibility windows are computed from station geometry and propagated
   satellite positions.
6. Pair windows are intersections of both stations' visibility windows.
7. Handover events are modeled from pair windows and policy rules.
8. Link metrics are modeled and clearly labelled as modeled.
9. Empty or unsupported cases stay empty or unsupported; they must not create
   fake active satellites, fake links, or fake measured telemetry.

The target is **TLE-first, model-explicit, display-transform-explicit**. The
route should be honest about what is source-derived, modeled, and display-only.

## 2. Current State After 3D Pipeline Slices

As of commit `917c164`, selected-pair 3D has moved onto the
`TleFirstSceneViewModel` path:

- selected-pair 3D actors are built from runtime projection output and TLE
  records;
- actor source samples are propagated from TLE records into ECEF samples;
- active links and handover cues are driven by runtime projection events;
- zero-window selected-pair routes can render empty without fake actors;
- selected-pair scene state reports `sceneSourceMode = "tle-first-runtime"`;
- the fixed demo entry reports `sceneSourceMode = "fixture-fallback"`;
- the old selected-pair display adapter has been removed.

This is a substantial improvement, but it is not complete data provenance. The
remaining work is to make source inventory, staleness, station precision,
modeled metrics, fallback behavior, and audit evidence machine-readable and
testable.

### 2.1 Data realism ceiling

When D0-D7 are complete, selected-pair should represent the strongest truth
claim this project can make from public and local sources:

- registry stations, station precision metadata, and supported orbit metadata;
- local TLE records, bounded by the interactive per-orbit cap;
- propagated satellite samples and station-geometry visibility windows;
- pair-window intersections derived from those visibility windows;
- local physical and policy models, explicitly labelled as modeled outputs;
- empty or unsupported states when the inputs do not support an active scene.

This is intentionally not the same as operator measured service telemetry. The
selected-pair route must not claim real operator handover logs, measured
throughput, live congestion, or private gateway schedules.

Known ceilings for this SDD:

- The retained `operator-validated` fixture is a higher-authority exception for
  the retained fixed pair only. It is preserved as `fixture-fallback`; it is not
  the arbitrary selected-pair compute path.
- Interactive selected-pair compute keeps the existing 60-record cap per orbit
  class. This SDD requires the cap and source coverage to be visible; it does
  not remove the cap.
- Visible link metrics are based on the currently wired free-space path loss,
  rain attenuation, and gas absorption chain. The S.1528 / S.465 antenna
  pattern helper remains future wiring unless a later slice explicitly connects
  it to runtime projection.
- The visible handover result uses the `cross-orbit-live` policy. Other policy
  variants may exist in module code, but this SDD does not add a policy
  selector or claim operator policy truth.
- The first implementation does not perform live TLE refresh. Staleness is
  exposed as source health, and refreshed snapshots must be delivered by an
  explicit source-update workflow.

Going beyond this ceiling requires a separate decision: either inject a new
external authority package as a retained fixture, or open follow-up SDD work to
raise/remove compute caps, wire antenna gain into visible link metrics, add
live source refresh, add higher-fidelity ephemeris, or expose multiple policy
models.

## 3. Route Decision

### 3.1 Selected-pair is the canonical runtime route

The selected-pair route is the product route for arbitrary station pairs. It is
where TLE-first data completeness should be implemented.

### 3.2 Fixed demo remains fixture fallback

The fixed demo route remains useful as a visual and regression reference:

```text
/?scenePreset=regional&m8aV4GroundStationScene=1
```

It should not receive a separate data-realness retrofit. Its long-term role is
`fixture-fallback`. If the homepage CTA later moves to a selected-pair default,
that should be a route decision, not a hidden rewrite of the fixed fixture.

### 3.3 No ambiguous truth mode

Every route must expose one scene source mode:

| Mode | Meaning |
| --- | --- |
| `tle-first-runtime` | Selected-pair runtime data derived from registry stations, TLE sources, and explicit models |
| `fixture-fallback` | Curated fixed demo data retained for visual regression and legacy entry compatibility |

The UI may use polished display transforms in both modes, but the data mode
must remain visible to tests, debug state, and review copy.

This `sceneSourceMode` is a route-level mode and is distinct from the cell-level
truth classes defined in §4. A route in `tle-first-runtime` mode may still
surface individual cells classed as `modeled`, `display-only`, or `unavailable`.
Route mode answers "which provenance regime is this route running under"; cell
truth class answers "what is this single value sourced from".

## 4. Data Truth Classes

All selected-pair data should be assigned one truth class.

| Truth class | Source | May claim |
| --- | --- | --- |
| `tle-derived` | TLE propagation plus station geometry | Satellite identity, sampled position, station visibility, pair intersection |
| `public-registry-derived` | Station registry entry | Station id, name, operator family, disclosed coordinate precision, supported orbit/band metadata |
| `modeled` | Local physical or policy model | Handover decision, throughput estimate, jitter estimate, rain impact, latency estimate |
| `display-only` | Renderer/layout choice | Camera framing, altitude compression, label density, actor mesh, visual lane placement |
| `fixture-fallback` | Curated fixed demo fixture | Legacy fixed demo scene state only |
| `unavailable` | Missing source or unsupported case | No active actor/link; explain absence rather than simulate truth |

Hard rule: a value may move from a stronger truth class to a weaker display
class for readability, but it may not move from a weaker class to a stronger
claim.

## 5. Data Completeness Targets

### 5.1 TLE source inventory

The runtime must expose a source manifest for loaded TLE inputs:

- file path or source id;
- orbit class;
- record count;
- epoch range;
- generated or downloaded timestamp if available;
- parser failures;
- cap applied per orbit class;
- excluded records and reason category.

Acceptance target: a reviewer can tell whether a missing satellite is outside
the local source inventory, filtered by cap, invalid TLE, or unavailable for the
selected time window.

### 5.2 TLE staleness policy

The runtime must define a staleness threshold per source class. The first
implementation may be local-snapshot-only, but it still needs explicit state:

- `fresh` — source age is inside the configured threshold;
- `stale` — source age exceeds threshold but remains usable with warning;
- `unknown-age` — source timestamp is unavailable;
- `rejected` — source is too stale or invalid to use.

The first implementation does not need live network refresh. It must avoid
presenting a local snapshot as live data.

### 5.3 Station registry precision

Station coordinates are not equally precise. Runtime state must carry:

- registry id;
- raw lat/lon;
- disclosure precision (`exact-coords` | `operator-family-region` | `region-only`
  per the registry schema in `runtime-data-contract.md` Layer 1);
- source tier (`operator-validated` | `public-disclosed` | `geometric-derived`
  per `runtime-data-contract.md` Layer 3);
- whether render position equals source coordinates;
- whether operator-family or regional coordinates are being used.

Acceptance target: selected-pair output can distinguish exact coordinates from
operator-family regional coordinates without changing route shape.

### 5.4 Propagation and visibility provenance

Each rendered actor and visibility row should trace to:

- satellite id;
- TLE source id;
- propagated sample count over the selected time window;
- sample cadence;
- first and last propagated UTC;
- station elevation threshold;
- station A visibility window source;
- station B visibility window source;
- pair-intersection source.

The renderer may compress altitude or use visual lanes, but source samples must
remain available as source geometry evidence.

### 5.5 Handover model boundary

Handover decisions are modeled. Runtime state must carry:

- decision policy id;
- decision inputs used;
- from/to satellite ids;
- event UTC;
- reason kind;
- whether the event is initial acquisition or transition (derivable from
  `SceneHandoverEvent.fromSatelliteId === null` per the
  `tle-first-3d-pipeline.md` §5 contract; no separate flag is required if the
  null contract is preserved end-to-end);
- non-claim text explaining that this is a model output, not an operator log.

The selected-pair route must not imply measured network handover telemetry.

### 5.6 Link metric boundary

Throughput, jitter, latency, and rain impact are modeled values. Runtime state
must carry:

- model id;
- standards or local model module reference;
- input parameters;
- output unit;
- whether rain rate is user-controlled, fixture default, or unavailable;
- non-claim text.

Acceptance target: CSV, panel, and debug state all preserve modeled status.

### 5.7 Empty and unsupported cases

The system must preserve empty states instead of generating a pleasing fake
scene. Empty states include:

- no valid station pair;
- no shared supported orbit class;
- TLE source unavailable;
- all TLE records invalid or stale-rejected;
- no visibility windows in the selected time range;
- no pair intersection;
- no handover event after policy evaluation.

Each empty state should have a reason code. The 3D scene may still render
station endpoints and display context, but it must not render a fake active
satellite or fake active link.

### 5.8 Fixture fallback boundary

Fixture fallback is allowed only for the fixed demo route or an explicitly
labelled fallback state. Selected-pair runtime should not silently fall back to
fixture actors when TLE-first data is missing.

If a selected-pair route cannot compute TLE-first output, it should produce a
typed empty or unsupported state.

## 6. Proposed Runtime Contract Additions

The exact TypeScript names may evolve, but the runtime should expose data like
this.

```ts
export type RuntimeTruthClass =
  | "tle-derived"
  | "public-registry-derived"
  | "modeled"
  | "display-only"
  | "fixture-fallback"
  | "unavailable";

export type TleSourceHealth = "fresh" | "stale" | "unknown-age" | "rejected";

export interface RuntimeTleSourceManifestEntry {
  readonly sourceId: string;
  readonly orbitClass: "LEO" | "MEO" | "GEO";
  readonly recordCount: number;
  readonly acceptedRecordCount: number;
  readonly rejectedRecordCount: number;
  readonly parserFailureCount: number;
  readonly capApplied: number | null;
  readonly excludedRecordCount: number;
  readonly excludedReasonCategories: ReadonlyArray<string>;
  readonly epochStartUtc: string | null;
  readonly epochEndUtc: string | null;
  readonly sourceTimestampUtc: string | null;
  readonly health: TleSourceHealth;
}

export interface RuntimeProvenanceTag {
  readonly truthClass: RuntimeTruthClass;
  readonly sourceId: string;
  readonly modelId?: string;
  readonly nonClaim?: string;
}

export type RuntimeModeledOutputKind =
  | "handover"
  | "link-budget"
  | "throughput"
  | "jitter"
  | "latency"
  | "rain-impact";

export type RuntimeRainRateControlMode =
  | "user-controlled"
  | "fixture-default"
  | "unavailable";

export interface RuntimeModeledOutputMetadata {
  readonly kind: RuntimeModeledOutputKind;
  readonly modelId: string;
  readonly standardsRef: ReadonlyArray<string>;
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
  readonly outputUnit: string | null;
  readonly rainRateControlMode?: RuntimeRainRateControlMode;
  readonly provenance: RuntimeProvenanceTag;
  readonly nonClaim: string;
}

export interface RuntimeDataCompletenessState {
  // Reuse `SceneSourceMode` exported by `tle-first-scene-view-model.ts` rather
  // than redeclaring the literal union so the two contracts cannot drift.
  readonly routeMode: SceneSourceMode;
  readonly stationPrecision: ReadonlyArray<{
    readonly stationId: string;
    // Same registry-schema field as GroundStationDescriptor["disclosurePrecision"];
    // PublicRegistryStation is the selected-pair runtime source type.
    readonly disclosurePrecision: PublicRegistryStation["disclosurePrecision"];
    readonly sourceTier: PairSourceTier;
    readonly renderPositionIsSourceTruth: boolean;
    readonly provenance: RuntimeProvenanceTag;
  }>;
  readonly tleSources: ReadonlyArray<RuntimeTleSourceManifestEntry>;
  readonly actorSourceCoverage: {
    readonly renderedActorCount: number;
    readonly tleBackedActorCount: number;
    readonly fakeActorCount: 0;
  };
  readonly modeledOutputs: ReadonlyArray<RuntimeModeledOutputMetadata>;
  readonly displayTransforms: ReadonlyArray<RuntimeProvenanceTag>;
  readonly emptyReasonCode: string | null;
}
```

The state can be surfaced through the existing controller state, smoke capture,
CSV metadata, and side-panel source disclosure.

Minimum visible bindings for automated review:

- `[data-tle-telemetry-chip]` must expose source health, source count,
  accepted/rejected record counts, parser failure count, source timestamp, and
  staleness state either as data attributes or through the machine-readable
  debug snapshot.
- Row 6 source footer must gain a stable station precision disclosure target,
  proposed as `[data-station-precision-disclosure]`, with station id,
  disclosure precision, source tier, and render-position truth.
- The debug snapshot should expose the full `RuntimeDataCompletenessState`
  under one stable key so the D6 smoke can verify provenance without depending
  on screenshots.

## 7. Implementation Slices

### Slice D0 — Baseline data inventory

Document current bundled TLE sources, station registry precision distribution,
and selected-pair output fields.

Acceptance:

- one generated inventory artifact or checked SDD appendix lists TLE source
  counts, source timestamps, and station precision counts;
- no runtime behavior change;
- no change to the fixed-demo fixture-fallback path (route, fixture file,
  and reported `sceneSourceMode = "fixture-fallback"` remain identical).

This baseline can extend the existing
`docs/sdd/multi-station-selector/slice-0-baseline.md` (per-walkthrough panel
+ 3D observations) with a data-inventory appendix instead of starting a new
document.

### Slice D1 — TLE source manifest

Add a runtime manifest for loaded TLE sources.

Acceptance:

- selected-pair debug state exposes loaded TLE source count and health;
- parser failures and accepted/rejected record counts are visible;
- `[data-tle-telemetry-chip]` carries enough source-health state for smoke
  assertions;
- build and selected-pair smoke pass.

### Slice D2 — Station precision propagation

Carry station registry precision and source tier through runtime projection,
scene state, CSV metadata, and panel source disclosure.

Acceptance:

- selected-pair route can report exact vs regional station precision;
- endpoint render state exposes whether render position equals source truth;
- Row 6 source footer exposes `[data-station-precision-disclosure]`;
- no route accepts raw lat/lon outside registry ids.

### Slice D3 — Actor and visibility provenance

Attach provenance tags to actors, source samples, visibility windows, and pair
intersections.

Acceptance:

- every rendered selected-pair actor has a TLE source id;
- visibility rows can cite station A/B window sources and pair intersection;
- zero-window scenes remain empty and explain why.

### Slice D4 — Modeled output boundary

Attach model ids and non-claim text to handover, link metrics, rain impact,
latency, throughput, and jitter outputs.

Acceptance:

- side panel and CSV preserve modeled status;
- handover event state identifies policy id and reason kind;
- no modeled metric is labelled as measured telemetry.

### Slice D5 — Fallback refusal and empty-state hardening

Replace silent fallback opportunities with typed empty or unsupported reasons.

Acceptance:

- selected-pair route never uses fixed fixture actors as hidden fallback;
- empty-result route reports a reason code;
- `no-visibility-windows` is reserved for cases where both stations have zero
  station visibility windows; when only one side has no usable window, the pair
  still reports `no-pair-intersection`;
- smoke covers at least one no-window pair and one missing/unsupported source
  path.

### Slice D6 — Data completeness gates

Add automated checks for provenance coverage.

This SDD chooses a dedicated gate script:
`scripts/verify-tle-first-data-completeness.mjs`. The existing scene-view-model
runtime smoke should stay focused on route mode, actors, active links, cues, and
fixed-demo fallback; the data-completeness gate should fail independently when
provenance metadata is missing.

Acceptance:

- selected-pair runtime smoke asserts `fakeActorCount === 0`;
- data-completeness smoke asserts route mode and source health are present;
- data-completeness smoke asserts station precision disclosure is present;
- data-completeness smoke asserts modeled outputs include model id, inputs,
  output unit, and non-claim text;
- data-completeness smoke asserts empty reason code on at least one no-window
  route;
- random-pair budget still passes;
- 60x replay continuity still passes;
- fixed demo regression remains `fixture-fallback`.

### Slice D7 — Documentation closeout

Update runtime data contract, 3D pipeline SDD, and acceptance criteria to point
to the completed data boundary.

Acceptance:

- docs agree on selected-pair as canonical TLE-first runtime;
- fixed demo docs call it fixture fallback;
- no stale claims that selected-pair data is measured operator telemetry.

## 8. Acceptance Criteria

### A1. TLE-backed actors

For selected-pair runtime routes, every rendered satellite actor must have:

- satellite id;
- TLE source id;
- propagated sample count greater than zero;
- source time range.

`fakeActorCount` must be zero.

### A2. No fake active link

If no pair intersection exists, the runtime must not render an active link. The
scene may render endpoints and an empty state, but `runtimeLinkVisible` must be
false.

### A3. Source health visible

The runtime must expose TLE source health and source timestamp state. A local
snapshot may be usable, but it must not be represented as live data.
The review surface is `[data-tle-telemetry-chip]` plus the
`RuntimeDataCompletenessState.tleSources` debug payload.

### A4. Station precision visible

The runtime must expose each station's coordinate precision and whether the
render position is source truth.
The review surface is Row 6 `[data-station-precision-disclosure]` plus the
`RuntimeDataCompletenessState.stationPrecision` debug payload.

### A5. Modeled outputs labelled

Handover, link-budget, throughput, jitter, latency, and rain impact must carry
modeled provenance.
Each modeled output must expose kind, model id, standards/local model reference,
input summary, output unit, and non-claim text.

### A6. Fixture fallback isolated

The fixed demo route may remain `fixture-fallback`. Selected-pair routes must
not silently use that fixture path.

### A7. CSV and debug state preserve provenance

The CSV export and machine-readable debug state must preserve enough
provenance to review the data route without screenshots.

### A8. Visual transforms do not erase source truth

Cinematic layout may transform display positions later, but source samples and
display transforms must remain separate in state.

## 9. Verification Matrix

| Gate | Purpose |
| --- | --- |
| `npm run build` | Type and bundling regression |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | Scene adapter source guarantees |
| `node scripts/verify-tle-first-scene-view-model-runtime.mjs` | Selected-pair runtime mode, actor/link/cue, fixed fallback mode |
| `node scripts/verify-g1-bucket-a-coverage.mjs --port=<port>` | Requirement coverage surface |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=<dev-url> --port=<port> --seed=<int>` | Pair compute budget and random coverage |
| `node scripts/verify-information-density.mjs --port=<port>` | Panel density and no-overlap checks |
| `node scripts/verify-60x-replay-continuity.mjs --port=<port>` | Replay continuity and console/page error gate |
| `node scripts/verify-tle-first-data-completeness.mjs --port=<port>` | Selected-pair `fakeActorCount === 0`, route mode + source health visible, station-precision label visible, modeled-output metadata, empty reason code on no-window routes, fixed demo still `fixture-fallback` |

## 10. Non-Goals

- Do not claim real operator network handover logs.
- Do not claim measured throughput, jitter, or congestion.
- Do not claim exact antenna coordinates when the registry only has regional
  disclosure.
- Do not require live network TLE refresh in the first implementation.
- Do not make the fixed demo route the main data-realness investment target.
- Do not solve arbitrary-pair cinematic framing in this SDD.

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| TLE snapshot staleness | Propagated positions drift from current sky state | Expose source health and avoid live-data claims |
| Station precision mismatch | Regional coordinates look exact | Carry disclosure precision through state and copy |
| Model overclaim | Handover or throughput appears measured | Attach model ids and non-claim text |
| Empty-state pressure | Demo expectations encourage fake actors | Hard-gate `fakeActorCount === 0` and reason-coded empty states |
| Visual/data confusion | Cinematic layout hides source geometry | Keep source samples and display transforms separate |
| Source coverage gaps | Some valid pairs produce sparse results | Surface inventory coverage and rejected-source reasons |

## 12. Resolved Decisions For D0-D7

1. Initial source-health thresholds are LEO 14 days, MEO 30 days, and GEO 30
   days, evaluated against the selected projection window start.
2. D0-D7 remain local-snapshot-only. Live TLE refresh is not part of this
   implementation.
3. D0-D7 expose `fresh`, `stale`, and `unknown-age` as warning/debug states.
   The `rejected` state remains reserved for a future source-loader policy that
   actively blocks stale or invalid sources.
4. Empty reason codes are machine-readable first. The side panel keeps its
   existing user-facing empty copy, while debug state exposes
   `no-shared-supported-orbit`, `tle-source-unavailable`,
   `no-pair-intersection`, and related reason codes.
5. Homepage canonical CTA does not move in D0-D7. The fixed demo route remains
   the CTA and fixture fallback; selected-pair short URLs remain the canonical
   arbitrary-pair runtime.

   > The companion `tle-first-3d-pipeline.md` §12 #5 already resolved this for
   > Slice 4 of that SDD: the fixed demo route remains the CTA and reports
   > `fixture-fallback`; selected-pair short URLs report `tle-first-runtime`.

## 12.1 Implementation Closeout

D0-D7 landed in three implementation commits after this SDD was accepted,
followed by one review-hardening commit:

- `c0a32e4` — D0 data inventory appendix in `slice-0-baseline.md`.
- `82776a9` — D1-D5 runtime data-completeness metadata, panel/CSV bindings,
  and controller debug payload.
- `27075c1` — D6 smoke gate
  `scripts/verify-tle-first-data-completeness.mjs`.
- Review-hardening follow-up — adds per-actor provenance,
  per-visibility-window provenance, TLE parser stats propagation,
  custom missing/unsupported source-path smoke coverage, and row-level CSV
  provenance assertions after independent review.

Runtime source of truth:

- `RuntimeProjectionResult.dataCompleteness` carries the
  `RuntimeDataCompletenessState`.
- `selectedPairOverlay.dataCompleteness` exposes the same payload through the
  controller debug capture.
- `actorProvenance` traces rendered selected-pair actors to `tle:<orbit>`
  source ids, propagated sample counts over the selected time window, sample
  cadence, and source time range.
- `visibilityProvenance` traces each pair window to station A/B visibility
  sources and a pair-intersection source id.
- Row 6 exposes `[data-station-precision-disclosure="true"]`.
- `[data-tle-telemetry-chip="true"]` gains source count, accepted/rejected
  record counts, parser failure count, timestamp, and health dataset fields
  after projection render.
- CSV export now includes TLE source manifest, station precision, modeled
  outputs, actor provenance, visibility provenance, and data-completeness
  summary sections; the D6 smoke parses those sections and compares row values
  to the debug payload.

## 13. References

- `docs/sdd/multi-station-selector/tle-first-3d-pipeline.md`
- `docs/sdd/multi-station-selector/runtime-data-contract.md`
- `docs/sdd/multi-station-selector/acceptance-criteria.md`
- `docs/sdd/multi-station-selector/information-architecture.md`
- `docs/sdd/multi-station-selector/slice-0-baseline.md`
- `docs/sdd/multi-station-selector/delivery-summary.md`
- `src/features/multi-station-selector/tle-first-scene-view-model.ts`
- `src/features/multi-station-selector/runtime-projection.ts`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
