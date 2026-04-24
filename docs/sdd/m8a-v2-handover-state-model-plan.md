# M8A-V2 Handover State Model Plan

Source note: this file defines the bounded handover-stage model for `M8A-V2`.
It exists so the demo can show a clear progression of cross-orbit service
switching without overstating RF truth, measurement truth, or raw operational
event truth.

Parent SDD: see
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md).
Related evidence contract: see
[./m8a-v2-satellite-evidence-and-data-contract-plan.md](./m8a-v2-satellite-evidence-and-data-contract-plan.md).

## Status

- planning-only child SDD
- presentation-state authority only
- does not rewrite the existing `handover-decision` contract

## Purpose

This file answers one question:

How should the demo express a handover-state progression that is readable to a
user and synchronized with replay time while staying explicit that the state is
a repo-owned bounded presentation model rather than measurement truth?

## Core Decision

`M8A-V2` should not overload the current first-intake `handover-decision`
surface into a richer operational claim.

Instead, it should define one new presentation-only state model for the demo.

That state model exists to drive:

- orbit-class emphasis
- timeline annotations
- camera choreography
- compact satcom stage wording

It does not exist to claim:

- exact network event timing
- active gateway switching truth
- native RF handover
- measured continuity or performance

## Required State Properties

The demo-state seam should carry at least:

- `scenarioId`
- `stateKey`
- `stateLabel`
- `replayWindowSource`
- `stateWindowStartUtc`
- `stateWindowStopUtc`
- `primaryOrbitClass`
- `secondaryOrbitClass`
- `activeEndpointFocus`:
  - `mobile-aircraft-endpoint`
  - `nearby-fixed-endpoint`
  - `provider-managed-geo-anchor-context`
- bounded-proxy `qualityVector` values or classes for:
  - latency
  - jitter
  - speed
  - continuity or availability
- `dominantSwitchReason`
- `visualCueLevel` for scene emphasis, separate from decision truth
- `stateSource = repo-owned-bounded-presentation-model`
- machine-readable non-claims for:
  - `isNativeRfHandover = false`
  - `isMeasurementTruth = false`
  - `hasActiveGatewayAssignment = false`
  - `hasPairSpecificGeoTeleport = false`
  - `hasRfBeamTruth = false`
  - `hasActiveMeoParticipation = false`

## First State Progression

The first `M8A-V2` demo should use exactly four states:

1. `geo-context-primary`
   - establish the provider-managed GEO anchor context
   - keep the aircraft and nearby endpoint legible
   - do not yet imply final service outcome

2. `dual-orbit-overlap`
   - show both `LEO` and `GEO` context together
   - emphasize that the viewer is now in a cross-orbit story, not a generic
     two-endpoint replay
   - surface bounded latency/jitter/speed comparison as compact visual cues

3. `bounded-switch-window`
   - emphasize the service-layer switching story
   - drive the strongest orbit-class contrast and relation-cue emphasis
   - remain explicit that this is a bounded demonstration stage, not measured
     routing truth
   - show the dominant switch reason through stage chips or metric glyphs,
     not through a fake RF beam or gateway flash

4. `leo-context-primary`
   - leave `LEO` as the visually emphasized context actor
   - keep `GEO` visible as contextual continuity, not removed from the story

## Time Ownership Rule

The handover-state model must derive from the same replay clock used by:

- Cesium animation widget
- Cesium timeline
- orbit-class actor animation
- compact satcom overlay

No second timer or free-running UI state is allowed.

## Initial Windowing Rule

The first implementation may define the four state windows from repo-owned
replay fractions or explicitly recorded replay subranges.

That is acceptable only if:

- the state source is clearly labeled as repo-owned bounded presentation
- the windows are deterministic and testable
- the overlay and timeline do not claim that a source measured these exact
  event boundaries
- any quality-vector values shown during the windows are labeled as bounded
  projection classes, not live or measured network data

## Difference From The Demo Handover Loop

The local handover demo uses an eight-second synthetic loop and a serving-id
counter to prove readability. `M8A-V2` should not port that loop.

For `M8A-V2`:

- state windows derive from the accepted replay range or deterministic replay
  fractions
- stage transitions explain service-layer switching between `GEO` context and
  `LEO` context
- metric cues derive from repo-owned bounded projection classes
- no state transition should claim a measured event, RF handover, active
  gateway switch, pair-specific teleport, or active `MEO` path

## Relationship To Existing M8A Truth

The state model may consume:

- accepted replay window and trajectory seam
- accepted nearby second endpoint seam
- accepted first-case narrative semantics
- the projected orbit-context seam defined by the data-contract child plan
- the repo-owned bounded metric-class seam sourced only from
  `firstIntakePhysicalInput`, `firstIntakeHandoverDecision`, and the shared
  replay clock

It must not mutate:

- endpoint A meaning
- endpoint B meaning
- physical-input truth
- existing `handover-decision` truth semantics

## Acceptance Criteria

This child plan is satisfied only when:

1. the state model is separate from `handover-decision`
2. the state model is synchronized to the shared replay clock
3. the state progression is explicit and finite
4. the state model carries machine-readable non-claims
5. no stage wording implies RF truth, measurement truth, active gateway truth,
   or pair-specific GEO teleport truth
6. the state model can drive visual metric cues for latency, jitter, speed, and
   continuity without turning them into measurement truth
