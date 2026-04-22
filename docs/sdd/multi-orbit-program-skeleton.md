# Multi-Orbit Program Skeleton

Source note: this file is the live repo-owned **program skeleton** for the
multi-orbit line in `scenario-globe-viewer`. It exists to keep the whole line
coherent after the first pre-code and first-slice planning passes, so later
agents do not mistake a completed slice for completion of the program itself.

Related north star: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md).
Related governance checkpoint: see
[../decisions/0009-multi-orbit-first-intake-contract-ordering.md](../decisions/0009-multi-orbit-first-intake-contract-ordering.md).
Related first accepted intake case: see
[../../../itri/multi-orbit/prep/oneweb-intelsat-geo-aviation-intake.md](../../../itri/multi-orbit/prep/oneweb-intelsat-geo-aviation-intake.md).
Related accepted corridor package: see
[../../../itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21](</home/u24/papers/itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21>).

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

The program is successful only when `scenario-globe-viewer` can present a
defensible first real-world case of:

- `OneWeb LEO + Intelsat GEO`
- `commercial aviation`
- `service-layer switching`
- `isNativeRfHandover = false`
- repo-owned bounded projection, not measurement truth

This line is not complete when only contracts, adapters, or docs exist.

## Locked First-Case Assumptions

Unless a later accepted authority explicitly changes them, keep these fixed:

- first intake case = `oneweb-intelsat-geo-aviation`
- endpoint A = aircraft-side connectivity stack
- endpoint B = provider-managed GEO anchor
- OneWeb side = eligible gateway pool
- mobile corridor package = `ac-cgojz-crj900-c06aa4-2026-04-21`
- first validated `pathControlMode` = `managed_service_switching`
- first delivery line stays `bounded-proxy`
- `handover-decision` widening remains deferred until a first consumer exists

## Current Repo Reality As Of 2026-04-22

The repo is no longer at "pre-code" or "slice 1 only".

Already landed in repo-owned code/doc surfaces:

1. `ScenarioDefinition.context`
2. overlay seed plain-data contracts
3. first-intake overlay seed resolution
4. `physical-input` path semantics
5. first static bounded metric profile
6. first path-projection adapter
7. first scenario-seed adapter

Not yet landed as a finished viewer-delivered capability:

1. runtime adoption of the first intake case into the live scenario/runtime path
2. overlay runtime/render expression for endpoint/infrastructure semantics
3. any repo-owned consumer for `handover-decision` multi-orbit semantics
4. aircraft corridor ingestion seam
5. end-to-end first-case operator-facing explanation inside the running viewer

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

- not yet complete

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

- not yet complete

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

- not yet started

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

- explicitly deferred

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

- not yet complete

### Phase M8 — Expansion Beyond The First Case

Goal:

- only after the first case is end-to-end defendable, decide whether to adopt
  a second case such as tactical or cruise

Must not happen before:

- M3 and M4 are solid
- M5 decision semantics have a real consumer
- the first case reads coherently in the viewer

Current state:

- forbidden for now

## Immediate Next Questions

The next live planning questions should now be:

1. Which runtime seam should own first-intake scenario adoption in M3?
2. How should first-intake physical-input adoption coexist with existing
   bootstrap physical-input sources?
3. What is the smallest runtime-visible expression that proves M3 is real
   without prematurely opening M4 or M5?

These are better next-step questions than asking whether Slice 1 is done.

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
2. [0009-multi-orbit-first-intake-contract-ordering.md](../decisions/0009-multi-orbit-first-intake-contract-ordering.md)
3. this file
4. the most specific live lane document that applies to the next slice

If those four are not enough to answer "what remains after the current slice?",
the agent should stop and repair the planning surface before implementing.
