# M8A Visual Replay Time And Camera Plan

Source note: this child SDD belongs to the `R1V` umbrella. It controls replay
time ownership, Cesium widget/timeline integration, playback defaults, reset
behavior, and the first close/cinematic camera preset.

Parent SDD: see
[./m8a-visual-replay-integration-plan.md](./m8a-visual-replay-integration-plan.md).
Related `M8A.3` expression plan: see
[./m8a-nearby-two-endpoint-expression-plan.md](./m8a-nearby-two-endpoint-expression-plan.md).

## Status

- planning-only child SDD
- no implementation authority by itself
- first-case-plus-nearby-second-endpoint only

## Purpose

This file answers two questions:

1. How should Cesium's animation widget, Cesium's bottom timeline, and the repo
   replay clock share one time authority?
2. What is the first bounded close/cinematic view that should make the accepted
   two-endpoint scene legible?

## Runtime Inputs

Time and camera work may consume only repo-owned seams:

- `firstIntakeMobileEndpointTrajectory` for replay window and trajectory
  samples
- `firstIntakeNearbySecondEndpoint` for the fixed YKA position
- `firstIntakeNearbySecondEndpointExpression`
- `firstIntakeOverlayExpression`
- the repo-owned replay clock wrapping `Viewer.clock`

It must not side-read:

- raw corridor package files
- raw nearby second-endpoint package files
- raw `itri/multi-orbit/download/...` package files from runtime, controller,
  or render code

## Time Ownership Decision

There must be exactly one active replay time authority for the addressed
first-intake scene.

Allowed:

- use Cesium's `Viewer.clock` as the physical clock object
- wrap that clock through the repo-owned replay clock contract
- bind Cesium's left animation widget and bottom timeline to that same clock
- let app controls call the same replay clock contract

Forbidden:

- a second JavaScript timer for the cue, relation line, or overlay state
- wall-clock movement while the Cesium timeline shows replay time
- UI play/pause controls that update only local display state
- silently falling back to current real time when the accepted replay range is
  required

## Playback Defaults

`R1V` fixes these addressed-route defaults:

- replay start:
  `2026-04-21T01:28:07.420000Z`
- replay stop:
  `2026-04-21T02:09:36.690000Z`
- source of those times:
  `firstIntakeMobileEndpointTrajectory.trajectory.windowStartUtc` and
  `windowEndUtc`, adapted from the accepted corridor package
- initial addressed-route state:
  paused at replay start
- default multiplier:
  `60x`
- first allowed multiplier set:
  `1x`, `10x`, `30x`, `60x`, `120x`
- end-of-range behavior:
  clamp at replay stop and pause
- loop policy:
  no automatic loop in the first implementation
- reset behavior:
  pause playback, seek to replay start, restore `60x`, keep the currently
  selected viewing mode, and update replay-driven state from the same clock

Any later loop mode must still use the same Cesium/repo replay clock.

These timestamps are the current accepted trajectory seam values. Runtime code
should derive them from the seam and validate against these values, not create
a second hard-coded source of truth.

## Camera Decision

The first camera work should add exactly one high-value viewing preset:

- `endpoint-relation-cinematic`

The preset should be entered through one top-right icon/button. The affordance
must not expose a selector, catalog, or arbitrary endpoint navigation model.

## Preset Inputs

The preset must derive its target from repo-owned first-intake scene state:

- accepted corridor trajectory bounds
- replayed mobile aircraft endpoint position over the accepted time range
- fixed `endpoint-yka-operations-office` position
- relation cue extent between the moving cue and the fixed endpoint

It must not read raw package files at runtime.

## Dynamic Framing Requirement

The `endpoint-relation-cinematic` preset must be useful as replay time moves.

It should not require the user to manually keep adjusting zoom or pan to see
the accepted scene. The implementation may satisfy this by:

- computing a stable bounding volume that fits the fixed endpoint, accepted
  trajectory extent, and relation cue extent
- or updating the camera target from the current replay position while keeping
  the fixed endpoint and relation cue legible

The first implementation does not need to make every arbitrary zoom distance
look good. It only needs one deliberate preset that supports the accepted
two-endpoint replay.

## Required In-View Elements

The preset should fit:

- the fixed nearby endpoint
- the moving aircraft/mobile endpoint
- the relation cue
- enough corridor context to understand motion direction
- minimal service-layer switching context labels or badges, if the overlay
  slice has been implemented

## Truth Boundary

Camera behavior is presentation-only.

It may:

- guide the viewer through the accepted scene
- improve legibility of the moving cue and relation cue
- support service-layer switching explanation

It must not:

- imply arbitrary scenario selection
- promote the nearby second endpoint into endpoint B
- imply active service relationship truth
- imply native RF handover truth

## Acceptance Criteria

The time/camera work is acceptable only when:

### Time Authority

1. Cesium animation widget, Cesium timeline, and app replay state agree
2. addressed route initializes at replay start, paused, with `60x`
3. allowed multipliers are constrained to `1x`, `10x`, `30x`, `60x`, `120x`
4. reaching replay stop clamps and pauses
5. reset seeks to replay start, pauses, and restores `60x`
6. default route does not publish the `R1V` time/camera state

### Camera Preset

7. `endpoint-relation-cinematic` is a single preset reachable from one
   top-right affordance
8. the preset shows both endpoint cues and the relation cue without requiring
   arbitrary manual zoom polish
9. no runtime, controller, or render code side-reads raw package files

## Stop Boundary

This file does not authorize:

- cue interpolation implementation by itself
- satcom overlay redesign
- satellite or constellation rendering
- arbitrary endpoint navigation
- global selector
- active gateway, pair-specific GEO teleport, RF beam, native RF handover, or
  measurement-truth claims
