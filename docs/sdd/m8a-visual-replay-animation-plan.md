# M8A Visual Replay Animation Plan

Source note: this child SDD belongs to the `R1V` umbrella. It controls the
moving current mobile cue, relation cue updates, animation proof, and animation
truth boundaries.

Parent SDD: see
[./m8a-visual-replay-integration-plan.md](./m8a-visual-replay-integration-plan.md).
Related time/camera SDD: see
[./m8a-visual-replay-time-and-camera-plan.md](./m8a-visual-replay-time-and-camera-plan.md).
Related `M8A.3` expression plan: see
[./m8a-nearby-two-endpoint-expression-plan.md](./m8a-nearby-two-endpoint-expression-plan.md).

## Status

- planning-only child SDD
- no implementation authority by itself
- depends on the shared replay time authority defined by the time/camera SDD

## Purpose

This file answers one question:

How should the accepted mobile endpoint and nearby fixed endpoint be animated
so the viewer can understand the bounded cross-orbit service-layer switching
context without mistaking the cue for satellite path, RF beam, or live service
truth?

## Runtime Inputs

Animation may consume only repo-owned seams:

- `firstIntakeMobileEndpointTrajectory`
- `firstIntakeNearbySecondEndpoint`
- `firstIntakeNearbySecondEndpointExpression`
- `firstIntakeOverlayExpression`
- the repo-owned replay clock

It must not side-read raw corridor or nearby endpoint package files.

## Moving Cue Decision

The current mobile cue must be derived from the accepted trajectory seam.

It must not remain clamped to one static waypoint for the whole viewer session.
The implementation must do one of the following:

- interpolate between adjacent trajectory samples based on replay time
- or use an equivalent Cesium time-dynamic position primitive that produces the
  same bounded replay behavior

The fixed YKA nearby second endpoint must remain fixed.

## Relation Cue Decision

The relation cue must update from:

- the replay-resolved current mobile cue position
- the fixed nearby second endpoint position

The relation cue may use presentation-only style changes such as:

- dashed line updates
- width changes
- subtle pulse or fade
- short-lived highlight

It must remain labeled and documented as:

- scene aid only
- presentation-only replay
- not satellite path truth

## Time Coupling

All animation state must derive from the single replay clock defined by the
time/camera SDD.

Forbidden:

- independent `setInterval` or `requestAnimationFrame` state that disagrees
  with replay time
- animation that continues while the replay clock is paused
- overlay or relation cue time state that disagrees with Cesium's timeline

## Animation Truth Boundary

Allowed animation:

- current mobile endpoint replay movement
- relation cue update between the moving mobile cue and fixed nearby endpoint
- presentation-only pulse, fade, or emphasis

Forbidden animation:

- fake satellite path arcs
- active gateway switching flashes
- pair-specific GEO teleport selection animation
- native RF handover theater
- RF beam visualization
- endpoint-to-endpoint communication success animation
- generic multi-orbit competition animation

## Acceptance Criteria

The animation slice is acceptable only when:

1. addressed route publishes the expected animation capture or telemetry
2. default route does not publish `R1V` animation state
3. advancing replay time changes the current mobile cue position
4. pausing replay time stops visible cue movement
5. relation cue endpoints update from the moving mobile cue and fixed endpoint
6. fixed YKA endpoint remains fixed
7. animation remains presentation-only and bounded-proxy
8. no active gateway, pair-specific GEO teleport, RF beam, native RF handover,
   or measurement-truth claim is introduced
9. no runtime, controller, or render code side-reads raw package files

## Required Validation

The future implementation should add or update validation for:

- build success
- addressed-route cue position changes after replay time advances
- paused replay does not continue moving the cue
- relation cue uses the replay-resolved current mobile position
- fixed endpoint coordinates remain stable
- non-claim fields remain present in capture or telemetry

## Stop Boundary

This file does not authorize:

- camera preset implementation by itself
- satcom overlay implementation
- real satellite rendering
- random satellite generation
- handover-decision changes
- physical-input truth changes
- arbitrary endpoint selector UI

