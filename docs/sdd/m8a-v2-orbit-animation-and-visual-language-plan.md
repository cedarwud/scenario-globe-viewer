# M8A-V2 Orbit Animation And Visual Language Plan

Source note: this file defines how `M8A-V2` should make `OneWeb LEO` and
`Intelsat GEO` visibly different, time-driven, and legible without implying
false RF or serving-path truth.

Parent SDD: see
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md).
Related data/state plans: see
[./m8a-v2-satellite-evidence-and-data-contract-plan.md](./m8a-v2-satellite-evidence-and-data-contract-plan.md) and
[./m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md).

## Status

- planning-only child SDD
- visual-language and animation authority only
- first-case-only

## Purpose

This file answers two questions:

1. How should `LEO` and `GEO` be shown differently without overclaiming truth?
2. How should satellites, time, and handover-state progression animate under
   the existing replay clock?

## Core Visual Decision

The scene must show more than endpoint markers.

The minimum `M8A-V2` scene should contain:

- the moving aircraft/mobile endpoint cue
- the fixed YKA nearby endpoint
- one or more `LEO` context actors
- one `GEO` context anchor actor
- orbit-class labels or badges
- the existing bounded relation cue, updated to work with the handover-stage
  model

The visual target is a dual-scale cross-orbit handover scene:

- the globe/corridor context proves this is a real geographic route
- the close view makes the endpoint relationship and orbit-class transition
  readable without requiring manual camera hunting
- source-lineaged satellite actors make the scene feel physically grounded
- compact metric and stage cues explain why the service-layer switch is being
  shown

## Orbit-Class Difference Rules

`LEO` should read as:

- moving
- lower orbit-class context
- transient or pass-driven presence

`GEO` should read as:

- fixed or near-fixed earth-relative context
- provider-side anchor context
- persistent background continuity

The distinction should come from a combination of:

- motion behavior
- icon shape
- line style
- orbit-band treatment
- compact label wording

The distinction must not depend on prose alone.

## Adopted Demo Grammar

`scenario-globe-handover-demo` proved several useful presentation patterns, but
`M8A-V2` must apply them to real viewer data rather than porting the demo's
synthetic local stage.

Adopt:

- same-page close-view composition
- one-Viewer rendering
- role/stage color separation
- non-blocking scene-anchored labels
- truth / presentation / shell separation before Cesium mutations

Do not adopt:

- the demo's three synthetic local proxy satellites
- compressed local sky-corridor geometry as orbit truth
- synthetic handover cycle timing
- UE-to-satellite beam cones or success beams
- demo local-density or ranking data

For `M8A-V2`, the equivalent of the demo's local readability should come from
orbit bands, altitude separation, time-synchronized actor movement, relation
ribbons, endpoint markers, and camera framing.

## Meaningful Visual Information

The orbit visuals should encode useful satcom information directly in the
scene, not only in a side panel.

Required visual encodings:

- orbit class:
  distinct actor shapes, altitude-band treatment, and compact `LEO` / `GEO`
  labels
- active stage:
  stage-linked emphasis on the currently primary orbit class and relation cue
- source confidence:
  subtle badge or line-style difference between accepted runtime truth and
  display-context
- link-quality basis:
  compact relation styling derived from bounded-proxy latency, jitter, speed,
  or continuity classes; this is not measurement truth
- endpoint precision:
  marker/label treatment that distinguishes trajectory-backed mobile endpoint
  from facility-known fixed endpoint

## Allowed Motion

Allowed motion for `M8A-V2`:

- replay-clock-driven movement of the aircraft cue
- replay-clock-driven movement of `LEO` context actors
- fixed or near-fixed `GEO` context anchor behavior
- stage-linked emphasis shifts across `GEO`, dual-orbit, switch-window, and
  `LEO` emphasis states
- optional animated relation ribbon between endpoint context and orbit-class
  context, provided it reads as presentation emphasis rather than RF geometry

Forbidden motion:

- RF beam sweeps
- endpoint-to-satellite success beams
- gateway flash-selection theater
- pair-specific teleport jump claims
- arbitrary random satellite motion
- demo-style proxy recasting that looks like a real satellite handover event

## Truth Boundary

Orbit visuals must stay explicit about what they are:

- accepted first-case labels
- repo-owned display-context orbit actors
- bounded presentation-only stage emphasis

Orbit visuals must not imply:

- active serving satellite truth
- active gateway truth
- exact handover event truth
- RF path geometry

## Minimum Visible Slice

The first visibly improved user-facing slice should add:

- at least one visible `LEO` context actor
- one visible `GEO` context anchor
- shared replay-clock animation
- stage-linked emphasis that makes the cross-orbit story readable
- at least one compact visual metric cue explaining the bounded switch basis
- source/evidence styling that separates accepted endpoint truth from
  display-context satellite actors

That is the minimum slice that moves the viewer beyond the current
"moving endpoint plus nearby endpoint" state.

## Acceptance Criteria

This child plan is satisfied only when:

1. `LEO` and `GEO` read as different orbit classes without long prose
2. the scene shows visible satellite presence, not only endpoints
3. motion is driven by the shared replay clock
4. handover-stage progression changes visual emphasis over time
5. no beam truth, gateway truth, teleport truth, native RF handover truth, or
   measurement truth is implied
6. scene visuals carry endpoint precision, source confidence, and bounded
   link-quality basis without requiring a prose-heavy panel
