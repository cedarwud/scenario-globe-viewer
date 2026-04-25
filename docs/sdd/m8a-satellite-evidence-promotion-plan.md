# M8A Satellite Evidence Promotion Plan

Source note: this child SDD belongs to the `R1V` umbrella. It controls the
evidence gate required before satellite, constellation, gateway, or teleport
context can move beyond display-context or explanatory use.

Parent SDD: see
[./m8a-visual-replay-integration-plan.md](./m8a-visual-replay-integration-plan.md).
Related satcom overlay SDD: see
[./m8a-satcom-context-overlay-plan.md](./m8a-satcom-context-overlay-plan.md).
Related roadmap: see
[./multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md).

## Status

- `R1V.6` docs-only evidence gate executed
- no rendering implementation authority by itself
- no satellite, constellation, gateway, or teleport data is promoted to
  renderable truth by this file
- plan stop reached for this slice

## Purpose

This file answers one question:

What must be true before `R1V` or a later follow-on may render satellite,
constellation, gateway, or teleport context as more than display-context?

## Current Evidence Boundary

Authority-backed context may inform future scope:

- `OneWeb LEO + Intelsat GEO aviation` is the accepted first-case pair
- the accepted first-case semantics are service-layer switching and
  bounded-proxy, with `isNativeRfHandover = false`
- OneWeb gateway representation is an eligible gateway pool, not an active
  gateway assignment
- Intelsat GEO ground-anchor representation is a provider-managed logical
  anchor, not a pinned public teleport coordinate
- repo-owned satellite overlay contracts and validation evidence exist, but
  walker-backed fixtures remain smoke/display proof paths unless promoted by a
  later authority gate

## R1V.6 Reviewed Source Surfaces

This gate reviewed only existing repo and workspace authority surfaces. It did
not perform internet refresh, external feed ingestion, or runtime validation.

Reviewed authority and planning surfaces:

- `itri/README.md`
- `itri/multi-orbit/README.md`
- `itri/multi-orbit/north-star.md`
- `itri/multi-orbit/m8-expansion-authority.md`
- `itri/multi-orbit/baseline/current-state-summary.md`
- `itri/multi-orbit/report/third-report.md`
- `itri/multi-orbit/report/third-report-adoption-2026-04-22.md`
- `itri/multi-orbit/prep/oneweb-intelsat-geo-aviation-intake.md`
- `itri/multi-orbit/prep/research-to-app-mapping.md`
- `itri/multi-orbit/prep/viewer-contract-widening-proposal.md`
- `itri/multi-orbit/prep/oneweb-gateway-pool-selection-decision.md`
- `itri/multi-orbit/prep/intelsat-ground-anchor-representation-decision.md`
- `itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json`
- `itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23/authority-package.md`
- `itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23/checks/acceptance.md`
- `system-model-refs/simulator-parameter-spec.md`
- `docs/data-contracts/satellite-overlay.md`
- `docs/data-contracts/phase7.1-validation-evidence.md`
- `docs/sdd/multi-orbit-first-intake-contract-sketch.md`
- `docs/sdd/multi-orbit-first-intake-checklist.md`
- `docs/sdd/multi-orbit-first-overlay-seed-resolution-lane.md`
- `docs/sdd/m8a-satcom-context-overlay-plan.md`
- `docs/sdd/m8a-visual-replay-animation-plan.md`
- `docs/sdd/m8a-visual-replay-time-and-camera-plan.md`
- current repo source/test surfaces for the satellite overlay contract,
  walker-derived fixture path, and Phase 7.1 validation harness

## Evidence Classes

Future evidence review should classify each candidate fact as one of:

- accepted runtime truth
- display-context
- explanatory-only
- candidate evidence
- reference-only
- rejected for viewer use

The classification must be explicit before any rendering implementation starts.

## R1V.6 Evidence Classification Inventory

This inventory separates scene truth, display-context, and future candidate
evidence. "Accepted runtime truth" here means an already accepted repo-owned
semantic or contract truth; it does not mean measured network truth.

| Evidence item | Source surface | Classification | R1V.6 decision |
|---|---|---|---|
| `OneWeb LEO + Intelsat GEO aviation` first-case label | `north-star.md`, `current-state-summary.md`, aviation seed, R1V/M8A SDDs | accepted runtime truth | Accepted as the current first-case semantic label for the addressed viewer route. This is not accepted as real-time satellite position truth. |
| `service-layer switching`, `bounded-proxy`, and `isNativeRfHandover = false` | aviation seed, intake docs, R1V overlay/time/animation SDDs | accepted runtime truth | Accepted as the service interpretation and truth boundary. It blocks native RF handover, RF beam, measurement-truth, and direct satellite-path wording. |
| YKA nearby second endpoint identity and `facility-known` precision | accepted M8A YKA authority package and acceptance check | accepted runtime truth | Accepted only for the fixed nearby endpoint identity, precision, and non-claims. It does not authorize active gateway, serving gateway, pair-specific teleport, tail-level equipage, onboard service, or measured performance truth. |
| Intelsat GEO side as `provider-managed-anchor` / `logical-anchor` | Intelsat ground-anchor representation decision, aviation seed, intake docs | accepted runtime truth | Accepted as a semantic provider-managed anchor. No public teleport coordinate is accepted or renderable as pair-specific truth. |
| customer-side requirement pressure for `LEO`, `MEO`, `GEO`, and TLE-driven orbit input | `itri/README.md` | explanatory-only | Explains why future satellite-source work may matter to the wider program. It does not authorize R1V real satellite rendering, MEO work, or non-R1V roadmap expansion. |
| OneWeb six-site canonical gateway pool | OneWeb gateway-pool decision, aviation seed, contract sketch, overlay-seed lane | display-context | May remain infrastructure context for an eligible pool only. It is not an active, serving, selected, ranked, or per-scene gateway assignment. |
| 2025 FCC STA evidence for the six US OneWeb sites | `third-report.md`, adoption note | candidate evidence | Useful future lineage for gateway metadata, but not yet written into the machine-readable canonical inventory by the adoption note and not enough to select one active gateway for the replay. |
| Non-US OneWeb gateway/SNP/facility notes such as Yellowknife, Pitea, and Hartebeesthoek | `third-report.md`, `current-state-summary.md` | reference-only | Keep as research context. They are not part of the R1V first-case display set and do not become active gateway truth. |
| OneWeb official ephemeris repository and `ltef.csv` | `third-report.md`, `current-state-summary.md` | candidate evidence | Candidate upstream orbit source for a future real-satellite projection contract. R1V.6 does not ingest it, define its schema, or render positions from it. |
| CelesTrak OneWeb SupGP feed | `third-report.md`, `current-state-summary.md` | candidate evidence | Candidate standardized ingestion bridge for future OneWeb positions. It still needs repo-owned lineage, freshness, frame-conversion, and non-live-truth rules before rendering. |
| Space-Track operator ephemeris workflow | `third-report.md`, `current-state-summary.md` | reference-only | Treat as operator exchange/upload background, not a direct public runtime feed for this viewer slice. |
| Existing `SatelliteFixture` / `SatelliteOverlayAdapter` contract with `tle`, `czml`, and `sample-series` | `docs/data-contracts/satellite-overlay.md`, `src/features/satellites/adapter.ts` | accepted runtime truth | Accepted as a generic repo-owned fixture/adapter seam. It does not identify OneWeb satellites and does not promote any source to constellation truth. |
| Copied 18-satellite walker TLE fixture | satellite-overlay contract, smoke docs, runtime overlay path | display-context | Valid only as smoke/display proof for fixture ingestion and overlay lifecycle. It must not be read as OneWeb constellation truth. |
| Walker-derived `leo-scale-points` and `multi-orbit-scale-points` generation, including `>= 500 LEO` validation paths | `phase7.1-validation-evidence.md`, validation harness, runtime overlay controller | display-context | Valid only as bounded scale/validation evidence. It must not be treated as OneWeb constellation truth, live operational truth, or closure of real LEO/MEO/GEO source coverage. |
| System-model `synthetic-walker`, `starlink-like`, and `oneweb-like` constellation presets | `system-model-refs/simulator-parameter-spec.md` | reference-only | Useful simulator parameter context only. These assumptions must not be copied into the viewer as real constellation geometry or real OneWeb operational positions. |
| Pair-specific Intelsat teleport coordinate | Intelsat ground-anchor decision, current-state gaps, intake docs | rejected for viewer use | Rejected for R1V and first-case viewer use unless a later public source chain and repo-owned projection contract promote a resolved fixed node. |
| Per-scene active OneWeb gateway assignment | gateway-pool decision, current-state gaps, intake docs | rejected for viewer use | Rejected for R1V and first-case viewer use. The eligible pool remains display-context until later per-scene evidence proves otherwise. |
| RF beam truth, native RF handover truth, and measured latency/jitter/throughput/service-continuity truth | R1V SDDs, M8A package non-claims, metric-profile gaps | rejected for viewer use | Rejected for this slice. Future bounded metrics must remain repo-owned projection fields and cannot be presented as measurement truth without a separate accepted source chain and gate. |

## Display-Context Separation

The current `R1V` implementation can complete without real satellite,
constellation, gateway, or teleport rendering.

Accepted runtime truth for `R1V` is limited to:

- the first-case label
- service-layer switching semantics
- bounded-proxy / not-measurement-truth semantics
- `isNativeRfHandover = false`
- the accepted replay trajectory seam
- the accepted fixed YKA nearby second endpoint seam
- the provider-managed GEO anchor semantic
- the eligible-pool OneWeb gateway semantic

Display-context may include:

- eligible OneWeb gateway pool wording or inventory references
- source-lineage notes that explain why the pool is not an active assignment
- relation-cue and overlay non-claims
- satellite-overlay validation facts that are explicitly marked as fixture or
  scale evidence

Display-context must not become:

- active gateway assignment
- pair-specific GEO teleport
- live OneWeb satellite positions
- real-time constellation operations
- RF beam truth
- native RF handover truth
- measurement-truth latency, jitter, throughput, or service continuity

## Promotion Requirements

Before any real satellite, constellation, gateway, or teleport data is rendered
as more than display-context, the repo must have:

- a repo-owned projection contract
- source lineage that identifies upstream authority
- precision and freshness rules
- non-claim fields
- default-route exclusion rules
- validation that prevents raw package side-reads
- acceptance criteria approved by a new gate

### Required Projection Contract Shape

A later promotion gate must define a repo-owned projection contract before any
real satellite, constellation, gateway, or teleport rendering starts.

That contract must define at least:

- source identity and source class, such as official upstream ephemeris,
  standardized owner-data bridge, regulator filing, regulator operation
  authority, or provider-managed logical anchor
- source lineage back to the exact local or upstream authority used
- acquisition time and source timestamp
- validity or freshness window
- coordinate frame and conversion path, including ECI/TEME/ECEF/WGS84 handling
  when applicable
- precision class, such as exact, facility-known, site-level, logical-anchor,
  or unavailable
- operational status and whether that status is source-backed, unknown, or
  intentionally not claimed
- evidence class from this SDD's vocabulary
- non-claim fields for active assignment, pair-specific teleport, RF beam,
  native RF handover, measurement truth, and live service truth
- default-route exclusion behavior

The contract must keep raw source ingestion outside render/controller code.
Render and controller code may consume only the repo-owned projected seam.

### Source Lineage Rules

A future source package must record which authority supports each field.

Minimum required lineage:

- OneWeb satellite positions: official OneWeb ephemeris artifact or a named
  standardized bridge such as CelesTrak OneWeb SupGP, with the bridge's
  relationship to owner/operator-supplied data recorded
- OneWeb gateway positions: regulator or canonical baseline lineage per node,
  separated from any operational-status lineage
- Intelsat GEO anchor: provider-managed logical anchor unless a later public
  source chain safely promotes a resolved fixed site
- gateway or teleport display: source per node, precision per node, and a
  boolean non-claim for active per-scene assignment

Lineage must be field-level, not just package-level. A position source must not
silently prove operational assignment, and operational authority must not
silently prove per-scene routing.

### Precision And Freshness Rules

A later gate must define fail-closed rules for precision and freshness.

Minimum requirements:

- stale orbital data cannot render as current operational truth
- source timestamps must be visible to validation
- official ephemeris and bridge feeds must carry explicit validity windows
- generated or transformed samples must carry the source epoch and projection
  epoch
- gateway and teleport nodes must carry precision labels
- facility-known and logical-anchor data must not render with exact-coordinate
  semantics
- any unknown operational status must remain unknown in the projected output

### Non-Claim Fields

The projected seam must carry explicit non-claim fields, not just prose.

Required non-claim fields:

- `isLiveOperationalTruth = false` unless a later gate proves otherwise
- `isMeasurementTruth = false`
- `isNativeRfHandover = false`
- `hasRfBeamTruth = false`
- `hasActiveGatewayAssignment = false`
- `hasPairSpecificTeleport = false`
- `hasTailLevelEquipageProof = false` for the current aviation corridor unless
  a later source chain promotes it
- `defaultRouteExcluded = true`

Names may differ in the final contract, but equivalent machine-readable
semantics are required.

### Default-Route Exclusion Rules

Any future promoted satellite, constellation, gateway, or teleport surface must
stay excluded from the default route unless a specific gate says otherwise.

Validation must prove:

- the default route publishes no promoted satellite/gateway/teleport projection
  state
- the addressed route publishes only projected repo-owned state
- query parameters or local toggles cannot turn raw source packages into
  renderable truth on the default route

### Raw Side-Read Prevention

Validation for a future promotion gate must prevent runtime/controller/render
code from side-reading:

- raw `itri/multi-orbit/download/...` packages
- raw aircraft corridor or nearby-second-endpoint package files
- raw gateway baseline files
- raw ephemeris or SupGP source artifacts
- external network feeds

The accepted pattern is:

1. raw source package
2. repo-owned ingestion/projection adapter
3. repo-owned projected plain-data seam
4. render/controller consumption of only that seam

Static validation should scan the future changed runtime/controller/render
files for forbidden raw paths and direct fetches. Runtime validation should
prove that capture/telemetry reports projected state, source timestamps,
freshness status, non-claim fields, and default-route exclusion.

## R1V.6 Decision

This gate promotes no new renderable satellite, constellation, gateway, or
teleport truth.

The decision is:

- keep current `R1V` real-satellite and infrastructure evidence as inventory,
  display-context, explanatory material, candidate evidence, reference-only
  material, or rejected material according to the table above
- keep the current viewer implementation free of real satellite rendering
- keep walker-backed and scale validation paths out of OneWeb constellation
  truth
- require a new gate before any repo-owned projection contract or rendering
  work starts

## Recommended Next Gate

There is no automatic next implementation gate from `R1V.6`.

If future work wants real satellite, constellation, gateway, or teleport
rendering, the next gate should be a new docs-first, `R1V`-scoped projection
contract proposal. It must be approved before code and must not reopen `R2`,
`M8B`, `M8C`, `MEO`, arbitrary endpoint selection, second operator-pair work,
or non-`R1V` roadmap expansion by implication.

## Hard Prohibitions Before Promotion

Until a dedicated promotion gate approves otherwise, the viewer must not:

- render random satellites
- render a synthetic/walker fixture as OneWeb constellation truth
- render real OneWeb constellation positions as live operational truth
- claim an active OneWeb gateway assignment
- claim a pair-specific Intelsat GEO teleport
- claim RF beam truth
- claim native RF handover truth
- claim measurement-truth latency, jitter, throughput, or service continuity

## Allowed Before Promotion

Before promotion, `R1V` may still use satellite/infrastructure material as:

- display-context labels
- explanatory non-claim text
- future-scope notes
- evidence inventory rows
- authority review artifacts

This use must not imply live service truth.

## Relationship To Animation And Overlay

The animation and overlay SDDs may reference service-layer switching context.

They must not depend on real satellite rendering unless this evidence SDD
produces a later approved projection contract. The first `R1V` implementation
line should make the two endpoint cues and relation cue legible without waiting
for real constellation rendering.

## Acceptance Criteria

The evidence gate is acceptable only when:

1. relevant OneWeb, Intelsat, gateway, teleport, and satellite evidence is
   inventoried
2. each fact is classified by evidence class
3. display-context facts are separated from accepted runtime truth
4. synthetic fixtures are not promoted into real constellation truth
5. no future rendering path is proposed without a repo-owned projection
   contract requirement
6. no implementation renders real satellite or infrastructure truth before the
   promotion gate is accepted

## Stop Boundary

This file does not authorize:

- real satellite rendering implementation
- random satellite generation
- gateway assignment UI
- teleport selection UI
- RF beam visualization
- native RF handover wording
- measurement-truth performance display
- arbitrary endpoint selector UI

## Plan Stop

`R1V.6` stops at this docs-only inventory and classification gate.

Do not continue to `R2`, `M8B`, `M8C`, `MEO`, real satellite rendering,
gateway rendering, teleport rendering, or any non-`R1V` planning without a new
gate.
