# M8A Satcom Context Overlay Plan

Source note: this child SDD belongs to the `R1V` umbrella. It controls how
truth-bounded satcom information may return to the viewer after intrusive
floating panels are hidden and the replay is legible.

Parent SDD: see
[./m8a-visual-replay-integration-plan.md](./m8a-visual-replay-integration-plan.md).
Related `M8A.4` info plan: see
[./m8a-satcom-info-expansion-plan.md](./m8a-satcom-info-expansion-plan.md).
Related time/camera SDD: see
[./m8a-visual-replay-time-and-camera-plan.md](./m8a-visual-replay-time-and-camera-plan.md).

## Status

- planning-only child SDD
- no implementation authority by itself
- depends on `M8A.4` info ownership but does not rewrite it

## Purpose

This file answers one question:

Which satellite-communication facts should be visible while watching the
accepted two-endpoint replay, and how should they be shown without blocking the
scene or overclaiming truth?

## Presentation Decision

The first visible satcom context must not be a center-screen modal or large
floating explanatory card.

Allowed first surfaces:

- small layer badges
- compact corner panel
- minimal legend for cue meanings
- timeline annotations tied to the accepted replay range
- hover/click detail for the fixed endpoint or relation cue
- a minimal overlay paired with `endpoint-relation-cinematic`

The first visible information should be concise enough to help the viewer
watch the animation, not replace the animation with prose.

## Facts Allowed In First Overlay

The first overlay may expose only true, important, viewer-relevant facts:

- `OneWeb LEO + Intelsat GEO aviation`
- `service-layer switching`
- `not native RF handover`
- `presentation-only replay`
- `YKA fixed endpoint`
- `facility-known` precision
- historical corridor, not live measurement
- relation cue is a scene aid, not a satellite path

Longer detail may exist behind hover/click inspection or a collapsed detail
affordance.

## Required Non-Claims

Visible or inspectable context must preserve these non-claims:

- not measurement truth
- not active gateway assignment
- not pair-specific GEO teleport truth
- not RF beam truth
- not active onboard service proof for the replayed flight
- not native RF handover truth

## Time-Linked Overlay Rule

If any overlay contains time-dependent state, such as replay progress,
switching-stage language, or timeline annotation, it must derive from the same
repo replay clock used by Cesium's animation widget and timeline.

Forbidden:

- overlay state driven by a separate wall-clock timer
- timeline annotation that disagrees with Cesium's current time
- claims that a service switch occurred at an exact time unless that fact is
  separately authorized by repo-owned data

## Layout Rule

The overlay must not block the main viewing task.

Required behavior:

- no default center-screen panel
- no overlap with Cesium animation widget or timeline controls
- no overlap with the top-right cinematic affordance
- no full-width prose panel during replay
- mobile or narrow layouts must collapse rather than cover the scene

## Relationship To M8A.4

`M8A.4` info ownership remains valid.

This overlay plan may:

- reuse `M8A.4` info data
- keep `M8A.4` capture and telemetry alive
- hide the original floating panel by default
- reintroduce selected facts in smaller surfaces

It must not:

- delete `M8A.4` info ownership
- replace `M8A.4` with a generic satcom control center
- add arbitrary endpoint selection

## Acceptance Criteria

The overlay slice is acceptable only when:

1. no central explanatory panel blocks the replay by default
2. visible facts are concise and tied to accepted first-case context
3. non-claims remain visible or inspectable
4. any time-linked overlay state uses the same replay clock as Cesium
5. overlay layout does not occlude the moving cue, fixed endpoint, relation
   cue, Cesium timeline, or top-right cinematic affordance
6. default route does not publish `R1V` overlay state
7. no active gateway, pair-specific GEO teleport, RF beam, native RF handover,
   or measurement-truth claim is introduced
8. no runtime, controller, or render code side-reads raw package files,
   including raw nearby second-endpoint info package files

## Stop Boundary

This file does not authorize:

- animation implementation
- camera preset implementation
- satellite or constellation rendering
- endpoint selector UI
- broad satcom dashboard
- reintroducing the `R1V.1`-suppressed floating panels under a different name
- second operator-pair narrative
- `MEO`
