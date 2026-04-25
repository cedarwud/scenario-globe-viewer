# M8A-V2 Cross-Orbit Handover Umbrella Plan

Source note: this file is the canonical split-plan umbrella for the gated
`M8A-V2` branch in `scenario-globe-viewer`. It keeps the work under the
original `M8A` first-case authority and reframes the insufficient `R1V`
presentation draft into a clearer user-facing goal: a bounded, inspectable,
front-end demonstration of cross-orbit satellite handover.

Related authority: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md),
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md),
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md), and
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related draft context only: see
[./m8a-visual-replay-integration-plan.md](./m8a-visual-replay-integration-plan.md) and
[./m8a-satellite-evidence-promotion-plan.md](./m8a-satellite-evidence-promotion-plan.md).
Related presentation probe: see
[../../../scenario-globe-handover-demo/docs/local-handover-focus-demo-sdd.md](../../../scenario-globe-handover-demo/docs/local-handover-focus-demo-sdd.md)
and
[../../../scenario-globe-handover-demo/docs/local-focus-visual-refinement-sdd.md](../../../scenario-globe-handover-demo/docs/local-focus-visual-refinement-sdd.md).

## Status

- gated planning-only umbrella
- no runtime implementation authority by itself
- remains first-case-only:
  `OneWeb LEO + Intelsat GEO`, commercial aviation,
  `service-layer switching`, `isNativeRfHandover = false`
- does not reopen `M8B`, `M8C`, `MEO`, global endpoint selection, or a second
  operator pair

## Purpose

This file answers one control question:

What must the repo plan next if `M8A.1` through `M8A.4` are complete, the
current `R1V` draft is not enough for the user-facing goal, and the project now
needs an actual visual demonstration of bounded cross-orbit satellite handover
without breaking the first-case truth boundary?

## Current Gap

The current closed `M8A` seams already provide:

- an addressed first-intake first-case runtime owner
- the accepted replayable aircraft corridor seam
- the accepted fixed nearby second endpoint:
  `m8a-yka-operations-office-2026-04-23`
- bounded nearby-second-endpoint info and nearby two-endpoint expression
- first-case narrative truth:
  `OneWeb LEO + Intelsat GEO aviation`,
  `service-layer switching`,
  `isNativeRfHandover = false`,
  bounded-proxy, not measurement truth

The remaining problem is that the running scene can still read as:

- moving aircraft cue
- fixed nearby endpoint
- relation cue
- compact info

That is not yet a convincing cross-orbit handover visual demonstration.

`R1V` improved replay-time legibility, but it did not yet lock:

- which satellite or orbit-class data is acceptable runtime truth
- which orbit visuals remain display-context only
- a bounded handover-stage model separate from measurement truth
- a final orbit-class visual language that clearly differentiates LEO and GEO
- an explicit homepage/demo entry that does not rely on hidden user knowledge
- a final acceptance bar for saying the viewer now shows cross-orbit handover

## Scope Lock

`M8A-V2` remains under the original first-case authority:

- first pair stays `OneWeb LEO + Intelsat GEO`
- vertical stays commercial aviation
- endpoint A stays aircraft-side connectivity stack
- endpoint B stays provider-managed GEO anchor
- accepted nearby second endpoint stays
  `m8a-yka-operations-office-2026-04-23`
- service interpretation stays `service-layer switching`
- `isNativeRfHandover = false` stays explicit
- the line stays bounded-proxy, not measurement truth

## Recommendation From The Local Handover Demo

`scenario-globe-handover-demo` is useful for `M8A-V2`, but only as an
interaction and presentation probe.

Adopt these demo-proven patterns:

- one Cesium `Viewer`, not a second local-view page or second canvas
- an explicit demo entry plus a close/cinematic mode that takes the user
  directly to the action
- same-page camera choreography that keeps globe context and endpoint context
  connected
- truth / presentation / shell separation before Cesium entity mutation
- visual-channel separation: stage or role changes use color, shape, label, and
  relation emphasis; quality/confidence changes use thickness, opacity, glow,
  or compact metric glyphs
- optional inspectable details that do not block the scene

Do not adopt these demo-only surfaces as `M8A-V2` truth:

- synthetic constellation generation
- arbitrary clicked-site UE selection
- compressed three-proxy local sky corridor as satellite truth
- synthetic handover loop, beam-hopping loop, or handover counter
- UE-to-satellite RF beam or success-beam semantics
- any demo metric, ranking, or local-density lookup as delivery data

The practical recommendation is therefore:

- use the demo's same-page close-view and visual grammar ideas
- rebuild the data, state, and acceptance surfaces from
  `scenario-globe-viewer`'s accepted M8A seams and repo-owned projection
  contracts

## Customer-Side Requirement Alignment

The customer-side authority's original direction mentions `LEO/MEO/GEO`, TLE or equivalent orbit
tracking, link-quality-based switching, communication-time/rate presentation,
and a visually understandable 3D UI. `M8A-V2` should align with that direction
without pretending that this first branch has already solved every orbit class.

For this branch:

- `LEO` and `GEO` are the active visual orbit classes because the accepted
  first case is `OneWeb LEO + Intelsat GEO aviation`
- `MEO` remains evidence-gated and must not be rendered as an active handover
  participant in `M8A-V2`
- if the UI needs to acknowledge the full customer-side `LEO/MEO/GEO` target, `MEO` may
  appear only as an inactive requirement-trace or future-evidence chip, never as
  a current candidate, route, satellite, or service path
- the handover explanation should emphasize service-layer switching and bounded
  proxy metrics, not native RF handover

This keeps the first demo defensible while making the remaining `MEO` gap
visible instead of hiding it.

## Runtime Truth Base

The new branch may use only already accepted repo-owned seams as runtime truth:

- addressed first-intake scenario/session ownership for
  `app-oneweb-intelsat-geo-aviation`
- `firstIntakeMobileEndpointTrajectory`
- `firstIntakeNearbySecondEndpoint`
- `firstIntakeNearbySecondEndpointInfo`
- `firstIntakeOverlayExpression`
- `firstIntakePhysicalInput`
- `firstIntakeHandoverDecision`
- accepted first-case narrative semantics already carried by the repo
- the repo-owned replay clock
- one repo-owned `M8A-V2` bounded metric-class projection seam derived only
  from `firstIntakePhysicalInput`, `firstIntakeHandoverDecision`, and the
  shared replay clock; no other metric source is authorized for the first cut

Runtime/controller/render work must not side-read raw packages under:

- `itri/multi-orbit/download/aircraft-corridors/...`
- `itri/multi-orbit/download/nearby-second-endpoints/...`
- any other raw `itri/multi-orbit/download/...` package

## Visual Endpoint Definition

For the `M8A-V2` demo, the two visible communication endpoints should be:

1. the replayed aircraft/mobile endpoint from
   `firstIntakeMobileEndpointTrajectory`
2. the fixed YKA nearby endpoint from `firstIntakeNearbySecondEndpoint`

The provider-managed `GEO` anchor remains service-side context. It should help
explain the `Intelsat GEO` side of the story, but it must not be drawn as an
exact third ground endpoint, active teleport, or pair-specific GEO facility.

This distinction matters because the user-facing scene needs two real,
geographically legible endpoints while the evidence boundary still forbids
inventing a precise GEO teleport or active gateway.

## Child SDD Split

`M8A-V2` is split into these child plans:

1. [m8a-v2-satellite-evidence-and-data-contract-plan.md](./m8a-v2-satellite-evidence-and-data-contract-plan.md)
2. [m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md)
3. [m8a-v2-orbit-animation-and-visual-language-plan.md](./m8a-v2-orbit-animation-and-visual-language-plan.md)
4. [m8a-v2-cinematic-camera-and-viewing-plan.md](./m8a-v2-cinematic-camera-and-viewing-plan.md)
5. [m8a-v2-satcom-information-overlay-plan.md](./m8a-v2-satcom-information-overlay-plan.md)
6. [m8a-v2-validation-and-acceptance-plan.md](./m8a-v2-validation-and-acceptance-plan.md)

## Phase Breakdown

### M8A-V2.0 - SDD Split And Authority Lock

Goal:

- create the canonical split plan
- keep `M8A-V2` under first-case authority
- record that existing hotfix/runtime spillover is not accepted branch content

### M8A-V2.1 - Homepage/Demo Entry And Hotfix Cleanup

Goal:

- provide one explicit user-facing entry to the demo
- isolate or revert unapproved hotfix implementation edits before the new line
  is accepted for implementation

### M8A-V2.2 - Satellite Evidence/Data Projection Contract

Goal:

- define what can be used as accepted runtime truth
- define what satellite and orbit-class data stays display-context
- define the repo-owned projected display contract needed before orbit actors
  are rendered
- require real or source-lineaged orbit-context data for visible satellite
  actors; synthetic or random actors are not acceptable for this branch

### M8A-V2.3 - Bounded Handover State Model

Goal:

- create a presentation-only handover progression model that stays synchronized
  with replay time without pretending to be measurement truth or RF truth

### M8A-V2.4 - Orbit-Class Visual Language And Moving Satellite Cues

Goal:

- make `OneWeb LEO` and `Intelsat GEO` visibly different
- show satellite presence and time-driven motion
- keep the scene explicit about display-context vs accepted runtime truth
- use orbit-class actors, altitude bands, relation ribbons, and compact labels
  to make handover legible without importing RF beam theater from the demo repo

### M8A-V2.5 - Cinematic Close-View Camera Choreography

Goal:

- make the handover story legible near the aircraft/YKA corridor context
- keep Cesium animation widget and timeline synchronized with the same replay
  clock

### M8A-V2.6 - Satcom Information Overlay Redesign

Goal:

- replace blocking or prose-heavy explanation with compact, visual, useful
  satcom context
- make latency, jitter, speed, continuity, orbit class, endpoint precision, and
  truth-boundary status visible through badges, mini-metrics, stage chips, and
  scene-anchored labels rather than a small-font paragraph panel

### M8A-V2.7 - Visual Acceptance And Regression Suite

Goal:

- define the acceptance bar for claiming the demo now shows cross-orbit
  satellite handover
- lock regression proof for route entry, time sync, orbit-class visuals, state
  progression, and non-claims

## Minimum Visible Improvement

The first slice that produces a meaningful user-visible upgrade is `M8A-V2.4`,
but it must not start until `M8A-V2.1` cleanup plus `M8A-V2.2` and `M8A-V2.3`
contract/state lock are in place.

`M8A-V2.1` can improve discoverability, but it is not enough by itself to claim
that the viewer shows cross-orbit handover.

## Acceptance Summary

`M8A-V2` is complete only when the viewer can clearly show, in one explicit
demo entry:

- two geographically separated endpoints in the accepted first-case narrative
  - aircraft/mobile endpoint plus fixed YKA nearby endpoint
- visible satellite presence
- a legible distinction between `LEO` and `GEO`
- time-driven movement under the same replay clock used by Cesium
- a clear handover-state progression
- a close/cinematic view that makes the story readable near the endpoints
- compact satcom information with visible non-claims

The demo must still not claim:

- active gateway assignment
- pair-specific GEO teleport truth
- RF beam truth
- native RF handover truth
- measurement-truth performance
- arbitrary endpoint or operator expansion
- active `MEO` handover participation

## Planning Stop

This umbrella does not approve runtime code by itself.

Before implementation gate approval:

- the unapproved hotfix implementation edits must be isolated or reverted
- the child SDDs must remain the only authority for `M8A-V2`
- no implementation diff may silently import scope from the prior `R1V` draft
