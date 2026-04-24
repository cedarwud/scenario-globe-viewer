# M8A-V2 Cinematic Camera And Viewing Plan

Source note: this file defines the user-facing entry and viewing behavior for
`M8A-V2`. It exists so the demo is discoverable from the homepage or another
explicit entry and so the cross-orbit handover story is legible near the
endpoints rather than only from a far-away globe view.

Parent SDD: see
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md).
Related state/visual plans: see
[./m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md) and
[./m8a-v2-orbit-animation-and-visual-language-plan.md](./m8a-v2-orbit-animation-and-visual-language-plan.md).

## Status

- planning-only child SDD
- viewing-entry authority only
- no implementation authority by itself

## Purpose

This file answers two questions:

1. What homepage or demo-entry behavior is allowed?
2. How should the close/cinematic view make the handover story legible?

## Allowed Entry Behavior

`M8A-V2` must not require the user to know hidden query parameters.

Allowed entry patterns:

1. homepage default directly opens the `M8A-V2` demo
2. homepage presents one explicit visible entry to the `M8A-V2` demo
3. a dedicated visible demo route exists, such as a named demo path

For the first implementation, the approved pattern is:

- keep the existing default route stable
- add one explicit visible homepage/demo entry for
  `cross-orbit handover demo`

Existing query or addressed-route machinery may remain an internal transport
detail, but it must not be a user-discovery requirement.

## Viewing Modes

The first `M8A-V2` demo should provide exactly two user-facing viewing modes:

- `demo-overview`
- `handover-close-view`

`handover-close-view` should be the default demo entry mode because the user
goal is endpoint-legible handover storytelling, not only global inspection.

## Close-View Requirements

The close view must keep the following legible at once:

- aircraft/mobile endpoint cue
- fixed YKA nearby endpoint
- relation cue
- at least one `LEO` context actor or its handover-stage emphasis
- the `GEO` context anchor or its continuity cue
- compact satcom stage information
- endpoint precision/state cues for the mobile corridor and facility-known
  fixed endpoint
- compact bounded metric cues that explain the service-layer switch basis

The provider-managed `GEO` anchor may appear as service context, but the camera
must not frame it as a precise third ground endpoint or active teleport.

The camera should not force the user to manually hunt for the action.

## Local-Demo Adaptation Boundary

The close view should borrow the demo repo's same-page focus idea, not its
synthetic local-sky truth.

Allowed carry-over from `scenario-globe-handover-demo`:

- smooth same-page camera move into the readable action zone
- one-click or explicit-entry arrival at a stable close composition
- Home/overview recovery behavior if it fits existing viewer controls
- single-Viewer truth / presentation / shell separation
- foreground emphasis on endpoints, relation cue, and orbit actors while
  letting terrain/buildings recede as context

Forbidden carry-over:

- arbitrary double-click endpoint placement
- a second local-view page or second Cesium `Viewer`
- compressed proxy satellites that replace source-lineaged orbit actors
- demo beam cones or UE handover loops
- camera movement driven by a standalone timer

The first implementation should therefore read as a cinematic inspection of a
real replay corridor, not as a port of the demo's synthetic local handover
stage.

## Recommended Storyboard

The first close-view preset should make the handover readable in four replay
segments:

1. establish the aircraft corridor and YKA fixed endpoint in the same regional
   composition
2. reveal `GEO` continuity and `LEO` moving context as distinct orbit classes
3. tighten framing during the bounded switch window so relation and metric
   cues are visible without covering the scene
4. settle with `LEO` emphasis while keeping `GEO` context visible as continuity

The overview mode should exist for orientation, but the default demo entry
should start in the close-view story because that is the user-facing goal.

## Synchronization Rule

Camera choreography must stay synchronized with the same replay authority used
by:

- Cesium animation widget
- Cesium timeline
- orbit-class actor animation
- handover-stage model

No camera-only timer or autoplay track is allowed to drift from replay time.

## Camera Behavior

The first implementation may use:

- one stable cinematic preset
- one stable overview preset
- deterministic stage-linked reframing within the bounded accepted corridor

It must not open:

- arbitrary endpoint navigation
- global selector behavior
- catalog browsing behavior
- freeform cinematic scripting unrelated to replay time

## Acceptance Criteria

This child plan is satisfied only when:

1. the demo is reachable from an explicit visible entry
2. the user does not need hidden query knowledge
3. the existing default route remains stable and outside `M8A-V2` demo state
   unless the explicit entry is used
4. close view makes the handover story legible near the endpoints
5. Cesium animation widget and timeline stay synchronized with the same replay
   authority as the demo camera/state
6. the viewing model does not widen into arbitrary endpoint or catalog
   navigation
7. the close view preserves real corridor/endpoint context and does not replace
   it with synthetic local-sky proxy truth
