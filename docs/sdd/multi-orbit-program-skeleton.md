# Multi-Orbit Program Skeleton

Source note: this file is the live repo-owned **program skeleton** for the
multi-orbit line in `scenario-globe-viewer`. It exists to keep the whole line
coherent after the first pre-code and first-slice planning passes, so later
agents do not mistake a completed slice for completion of the program itself.

Related north star: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md).
Related M8 expansion authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related follow-on roadmap: see
[./multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md).
Related governance checkpoint: see
[../decisions/0009-multi-orbit-first-intake-contract-ordering.md](../decisions/0009-multi-orbit-first-intake-contract-ordering.md).
Related first accepted intake case: see
[../../../itri/multi-orbit/prep/oneweb-intelsat-geo-aviation-intake.md](../../../itri/multi-orbit/prep/oneweb-intelsat-geo-aviation-intake.md).
Related accepted corridor package: see
[../../../itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21](</home/u24/papers/itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21>).
Related V4 scope reset: see
[../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md).
Related V4 SDD: see
[./m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md).
Related VNext roadmap: see
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related VNext planning-control handoff: see
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).

## Status

- Active continuation authority for the overall multi-orbit program skeleton
- Repo-owned planning surface
- Not a closed historical reference
- May be updated as slices land, but must preserve the north-star goal

## Purpose

This file answers one question that slice-level prompts cannot answer well:

What is the full implementation spine from the already-accepted first intake
case to a viewer-delivered multi-orbit demonstration, and what still remains
after any given slice lands?

## North-Star Summary

The historical first-case program was successful only when
`scenario-globe-viewer` could present a defensible first real-world case of:

- `OneWeb LEO + Intelsat GEO`
- `commercial aviation`
- `service-layer switching`
- `isNativeRfHandover = false`
- repo-owned bounded projection, not measurement truth

That first-case line is now historical foundation. After the 2026-04-25 scope
reset, the next product goal is a defensible ground-station multi-orbit scene:

- two ground-station or ground-infrastructure endpoints
- preferably cross-country near Taiwan
- no aircraft endpoint
- no ordinary handset `UE`
- `LEO/MEO/GEO` evidence accepted before runtime promotion
- continuous multi-satellite handover pressure

This corrected line is not complete when only contracts, adapters, or docs
exist. It also is not complete if it only replays the old aircraft/YKA story.

## Locked First-Case Assumptions

For the historical first-case and `M8A` line, keep these fixed:

- first intake case = `oneweb-intelsat-geo-aviation`
- endpoint A = aircraft-side connectivity stack
- endpoint B = provider-managed GEO anchor
- OneWeb side = eligible gateway pool
- mobile corridor package = `ac-cgojz-crj900-c06aa4-2026-04-21`
- first validated `pathControlMode` = `managed_service_switching`
- first delivery line stays `bounded-proxy`
- `handover-decision` widening stays bounded to the approved first-intake
  unsupported/no-op metadata lane

For the V4 line, these assumptions are superseded by ADR 0013 and the V4 SDD.
Do not carry the aircraft endpoint, YKA endpoint, or provider-managed GEO anchor
as V4 endpoint A/B.

## Current Repo Reality As Of 2026-04-23

The repo is no longer at "pre-code" or "slice 1 only".

Already landed in repo-owned code/doc surfaces:

1. `ScenarioDefinition.context`
2. overlay seed plain-data contracts
3. first-intake overlay seed resolution
4. `physical-input` path semantics
5. first static bounded metric profile
6. first path-projection adapter
7. first scenario-seed adapter
8. URL-addressed first-intake active scenario-session owner seam in the live app
9. dedicated first-intake non-bootstrap physical-input runtime lane
10. first operator-facing first-intake explainer/diagnostic consumer panel
11. dedicated mobile-endpoint trajectory contract plus accepted corridor-package
    ingestion seam with runtime-visible proof state

First-case baseline reconciliation:

- `M3` through `M7` are closed for the defendable first-case baseline
- that closed baseline now includes runtime scenario adoption, overlay
  expression, operator-facing semantics, corridor-backed mobile trajectory
  proof, and the active-case narrative in the running viewer
- general `M8` expansion remains forbidden by default
- the first accepted reopen path is now narrowed to `M8A`:
  corridor-adjacent second-endpoint expansion

## Scope Correction As Of 2026-04-25

Stakeholder clarification changed the next product target. The existing
aviation/YKA line remains useful history and V3.5 remains useful rendering
infrastructure, but the next planning lane is:

- `M8A-V4 = ground-station multi-orbit handover`

Current V4 authority:

- [../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md)
- [./m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md)
- [../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md](../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md)

At the time of the scope correction, no V4 code could be written until the
endpoint-pair authority gate accepted endpoint A/B and their `LEO/MEO/GEO`
evidence matrix.

## V4.5 And VNext Status As Of 2026-04-28

The original V4 pre-runtime gate has been satisfied for the first accepted
operator-family endpoint pair:

- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- accepted precision: `operator-family` only
- accepted projection artifact:
  `public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json`

The viewer line has progressed through:

- `M8A-V4.3` runtime implementation
- `M8A-V4.4` homepage entry
- `M8A-V4.5` visual acceptance/regression
- post-V4.5 visual cleanup for original satellite materials and MEO/GEO glow
  markers

Current continuation authority:

- [./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md)
- [./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md)

The next recommended execution phase is `V4.6A Full LEO Orbit Replay`.
Endpoint expansion, actor enrichment, and handover model work remain
phase-gated by the VNext roadmap. `R2` remains read-only and must not become a
runtime selector.

## Program Phases

The following phases describe the full spine. Already-landed phases remain in
the document so future agents can locate themselves on the line.

### Phase M0 — Research + Intake Closure

Goal:

- prove the first real-world case is worth implementing
- freeze the first accepted corridor-backed intake

Authority surface:

- `itri/multi-orbit/*`

Exit:

- first accepted corridor package exists
- first intake is stable
- pre-code readiness is closed

Current state:

- done

### Phase M1 — Contract Groundwork

Goal:

- land the narrow repo-owned contract surfaces needed for the first case

Includes:

- `ScenarioDefinition.context`
- `EndpointOverlaySeed`
- `InfrastructureOverlaySeed`
- `CandidatePhysicalInputs.pathRole`
- `CandidatePhysicalInputs.pathControlMode`
- `CandidatePhysicalInputs.infrastructureSelectionMode`
- first static bounded metric profile

Must not include:

- runtime render adoption
- `handover-decision` widening
- aircraft trajectory ingestion

Current state:

- substantially landed

### Phase M2 — First-Intake Adapter Groundwork

Goal:

- prove that the accepted first intake case can be translated into repo-owned
  contract shapes without breaking truth boundary

Includes:

- `scenario-seed-adapter`
- overlay-seed resolution
- `path-projection-adapter`

Must not include:

- runtime Cesium rendering
- HUD/panel presentation
- second seed

Current state:

- substantially landed

### Phase M3 — Runtime Adoption Of The First Intake Case

Goal:

- connect the already-landed first-case contract/adapter surfaces into the
  viewer's live scenario/runtime lane

Includes:

- choosing the exact runtime-owned entry seam for the first intake
- wiring first-intake scenario data into repo-owned scenario/runtime selection
- wiring first-intake path-projected physical-input data into the repo-owned
  physical-input lane
- keeping fallback/bootstrap demo paths intact unless explicitly replaced

Must not include:

- fake active gateway assignment
- fake GEO teleport pinning
- mobile trajectory ingestion
- full render polish

Exit:

- the live app can load the first intake through repo-owned runtime seams
- the live app still preserves the explicit bounded-proxy truth boundary

Current state:

- complete on the addressed first-intake scenario-session owner seam, with
  dedicated non-bootstrap physical-input adoption and explicit unsupported
  first-intake handover

### Phase M4 — Overlay Runtime Expression

Goal:

- express first-intake endpoint/infrastructure semantics in viewer runtime
  without collapsing truth and presentation

Includes:

- runtime-local expression of endpoint/infrastructure seeds
- precision-aware marker or node presentation
- infrastructure pool presentation that does not imply active selection

Must not include:

- aircraft corridor playback
- overclaiming endpoint position truth
- serving-gateway inference

Exit:

- endpoint/infrastructure semantics become visible in the viewer
- the scene still reads as bounded presentation, not measurement truth

Current state:

- closed for the defendable first-case baseline through the repo-owned
  first-intake overlay-expression runtime seam and browser-visible overlay
  expression panel

### Phase M5 — First Consumer For Deferred Multi-Orbit Semantics

Goal:

- create the first real consumer that justifies widening deferred
  `handover-decision` semantics

Possible first consumers:

- operator-facing explainer strip
- validation-facing semantic check
- repo-owned diagnostic summary

Only after a consumer exists may the repo consider:

- `HandoverDecisionSnapshot.isNativeRfHandover`
- `HandoverDecisionSnapshot.decisionModel`
- `truthBoundaryLabel` mirroring into decision results

Current state:

- slice A landed as a repo-owned operator-facing explainer/diagnostic panel
  tied to the active addressed first-intake case through the existing
  scenario-session and physical-input seams
- slice B landed only the approved widening seam:
  `HandoverDecisionSnapshot.decisionModel`,
  `HandoverDecisionSnapshot.isNativeRfHandover`, and
  `HandoverDecisionResult.semanticsBridge.truthBoundaryLabel`
  for the explicit first-intake unsupported/no-op lane, with the operator
  explainer now consuming those semantics from the runtime handover state

### Phase M6 — Mobile Endpoint Trajectory Seam

Goal:

- introduce a dedicated viewer-owned seam for the accepted aircraft corridor
  package without overloading `scenario`, `overlay-seeds`, or `physical-input`

Includes:

- defining a dedicated mobile-endpoint trajectory contract
- ingesting the accepted corridor package
- keeping corridor truth separate from equipage claims

Must not include:

- claiming tail-level installation truth
- inventing exact onboard service state beyond the accepted package boundary

Current state:

- slice A landed as a dedicated repo-owned `mobile-endpoint-trajectory`
  contract, accepted corridor-package ingestion adapter, and runtime-visible
  proof seam through capture plus document telemetry
- slice B landed the first active-case runtime-local consumer surface for
  `firstIntakeMobileEndpointTrajectory`, keeping corridor truth bounded to the
  historical replay package and leaving equipage/service truth explicitly
  unproven

### Phase M7 — First Delivery-Grade Viewer Narrative

Goal:

- make the first case understandable and defendable to a viewer/operator

Must visibly communicate:

- this is `OneWeb LEO + Intelsat GEO aviation`
- this is `service-layer switching`
- this is not native RF handover
- these metrics are bounded repo-owned proxy values
- OneWeb side is an eligible pool, not an active gateway assignment

Current state:

- closed for the defendable first-case baseline through the active-case
  narrative surface in the running viewer

### Phase M8 — Expansion Beyond The First Case

Goal:

- reserved only for explicit authority-directed expansion beyond the closed
  first-case baseline

Current state:

- no blanket reopen
- first accepted direction is now `M8A`, defined as:
  corridor-adjacent second-endpoint expansion near the accepted first-case
  geography
- detailed planning now lives in:
  - `m8a-nearby-second-endpoint-expansion-plan.md`
  - `m8a-second-endpoint-authority-package-plan.md`
  - `m8a-runtime-ownership-widening-plan.md`
  - `m8a-nearby-two-endpoint-expression-plan.md`
  - `m8a-satcom-info-expansion-plan.md`
  - `m8a-implementation-readiness-checklist.md`
- if `M8A` closes, the first planned continuation is a read-only confirmed
  points catalog and grouping surface, documented in:
  - `m8a-read-only-catalog-follow-on-plan.md`
- broader post-`M8A` follow-on ordering now lives in:
  - `multi-orbit-follow-on-roadmap.md`
- arbitrary global two-endpoint selection remains out of scope
- second operator-pair expansion remains out of scope
- `MEO` exploratory remains out of scope

### Phase M9 — V4 Ground-Station Scope Reset

Goal:

- correct the next viewer demo to use ground-station or ground-infrastructure
  endpoints rather than the aviation/YKA endpoint story

Includes:

- evidence snapshot for near-Taiwan ground-station endpoint candidates
- ADR 0013 scope reset
- V4 SDD
- endpoint-pair authority gate before implementation

Must not include:

- aircraft endpoint in the V4 scene
- YKA endpoint in the V4 scene
- ordinary handset `UE`
- arbitrary endpoint selector
- R2 runtime selection
- full `LEO/MEO/GEO` claims for a second country without accepted evidence

Current state:

- planning open
- evidence snapshot exists
- endpoint-pair authority package not yet accepted
- runtime implementation blocked until authority acceptance

## Reconciliation Note

- `M3` through `M7` are closed for the defendable first-case baseline
- `M8A` is closed/historical for the aviation/YKA expansion narrative
- `M8A-V4` is the current corrected planning lane for the next product demo
- broader arbitrary endpoint expansion remains forbidden unless explicit
  authority reopens it
- the north-star boundary and bounded-proxy truth line remain unchanged

## Hard Guardrails

Later agents must not treat the line as complete just because M1/M2 are landed.

The program is still incomplete if any of these are true:

- the live viewer still cannot load the first intake case
- the scene still cannot express endpoint/infrastructure semantics
- the truth boundary is only in docs, not in runtime-visible semantics
- `handover-decision` has no real multi-orbit consumer
- the accepted aircraft corridor package has no future ingestion path

## Agent Handoff Rule

Before any new implementation or control thread continues this line, it should
read:

1. [north-star.md](/home/u24/papers/itri/multi-orbit/north-star.md)
2. [m8-expansion-authority.md](/home/u24/papers/itri/multi-orbit/m8-expansion-authority.md)
3. [0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md)
4. [0009-multi-orbit-first-intake-contract-ordering.md](../decisions/0009-multi-orbit-first-intake-contract-ordering.md)
5. this file
6. the most specific live lane document that applies to the next slice

If those documents are not enough to answer "what remains after the current
slice?", the agent should stop and repair the planning surface before
implementing.
