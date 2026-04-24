# M8A-V3 Camera And Overlay Convergence Plan

Source note: this file defines how `M8A-V3` should converge camera, overlay,
and residual support UI into one coherent demo reading. It exists because
`M8A-V2` already built camera and overlay seams, but the delivery branch still
allows too many surfaces to compete for attention.

Parent SDD: see
[./m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
Related V2 authority: see
[./m8a-v2-cinematic-camera-and-viewing-plan.md](./m8a-v2-cinematic-camera-and-viewing-plan.md)
and
[./m8a-v2-satcom-information-overlay-plan.md](./m8a-v2-satcom-information-overlay-plan.md).

## Status

- planning-only child SDD
- close-view framing and overlay-behavior authority only
- preserves the one-Viewer rule

## Purpose

This file answers two questions:

1. How should camera and overlay cooperate instead of competing?
2. How should close-view framing and overlay behavior work inside the
   composition-defined surface budget?

## Authority Boundary

This child plan owns, and only owns:

- close-view framing
- overlay placement and visual behavior
- camera/overlay cooperation inside the composition-defined surface budget

This child plan does not own:

- primary subject hierarchy
- the default-visible surface budget (which surfaces are default-visible, and
  how many)
- scene-level panel demotion budget (whether a default surface should be
  collapsed, merged, or removed for scene-first reading)
- adding, removing, or re-ranking default-visible surfaces

Those remain the responsibility of
[m8a-v3-primary-scene-composition-plan.md](./m8a-v3-primary-scene-composition-plan.md).

This plan regulates placement, framing, and behavior only for surfaces whose
existence in the default scene is already approved by the composition plan.
It must not restate which surfaces are default-visible, must not introduce a
parallel budget, and must not treat camera/overlay cooperation as a reason to
widen the composition-defined budget.

## Preserved Viewing Model

`M8A-V3` keeps the `M8A-V2` viewing model unless a later authority explicitly
reopens it:

- `handover-close-view`
- `demo-overview`

The close view remains the default story mode.

## Convergence Rule

Camera and overlay must support one shared scene-led reading:

- the camera establishes where the story is
- the scene shows the endpoints and orbit story
- the overlay explains only what the scene cannot safely convey by itself

No default arrangement is acceptable if the user feels they are looking at
several independent UI modules instead of one demo.

## Composition-Budget Compliance

The composition plan already owns the default-visible surface budget. This
child plan must not widen that budget.

Inside the allowed budget, camera and overlay convergence should prefer:

- placing the primary satcom overlay so it stays subordinate to the scene
- placing the replay control surface so it remains easy to reach without
  masking the globe
- scene-anchored endpoint/orbit labels only where needed for legibility

Inside that same budget, this child plan should demote, merge, or remove:

- overlay placements that cover the active handover zone
- duplicate stage/boundary cues spread across multiple surfaces
- framing/overlay combinations that make the scene read like several equally
  weighted HUD modules

## Close-View Legibility Rule

The default close view must keep all of the following readable at once:

- aircraft/mobile endpoint cue
- fixed YKA endpoint cue
- accepted runtime relation cue
- `LEO` context actor or `LEO` emphasis
- `GEO` continuity context
- compact stage and bounded metric cues

It must do this without covering so much of the screen that the user loses the
globe.

## Overlay Rule

The overlay remains secondary to the scene.

It may:

- summarize stage
- summarize bounded metric classes
- summarize endpoint identity and precision
- expose non-claims one click away

It must not:

- become the main reading surface
- reintroduce large explanatory prose cards
- cover the main scene, timeline, or the active handover zone

## Acceptance Criteria

This child plan is satisfied only when:

1. close-view and overview remain available without expanding into arbitrary
   navigation
2. close-view framing and overlay placement stay within the composition-defined
   surface budget and do not reintroduce competing default panels
3. camera framing and overlay layout both improve scene readability
4. overlay remains compact, non-blocking, and truth-bounded
5. the globe and orbit motion stay visually dominant
