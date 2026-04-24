# M8A-V3 Primary Scene Composition Plan

Source note: this file defines the default scene hierarchy for `M8A-V3`. It
exists because `M8A-V2` proved the necessary seams, but the addressed scene can
still read as several competing HUD layers rather than one clear cross-orbit
handover composition.

Parent SDD: see
[./m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
Related visual/support plans: see
[./m8a-v3-motion-and-replay-affordance-plan.md](./m8a-v3-motion-and-replay-affordance-plan.md)
and
[./m8a-v3-camera-and-overlay-convergence-plan.md](./m8a-v3-camera-and-overlay-convergence-plan.md).

## Status

- planning-only child SDD
- subject hierarchy and scene-level surface-budget authority only
- reuses `M8A-V2` truth-boundary seams

## Purpose

This file answers two questions:

1. What should be the primary visual subject in the addressed demo scene?
2. What default-visible surface budget and scene-level panel demotion budget
   should apply?

## Authority Boundary

This child plan owns, and only owns:

- subject hierarchy in the default addressed scene
- default-visible surface budget (which surfaces are default-visible, and how
  many)
- scene-level panel demotion budget (which default surfaces must be collapsed,
  merged, or removed because the scene reads panel-first)

This child plan does not own:

- close-view framing details
- overlay placement or visual behavior
- camera/overlay cooperation details
- the specific screen positions, sizing, or interaction behavior of any
  surface that already sits inside the default-visible budget

Those remain the responsibility of
[m8a-v3-camera-and-overlay-convergence-plan.md](./m8a-v3-camera-and-overlay-convergence-plan.md).

Where this plan names a surface (for example, the primary satcom information
surface or the replay/view control surface), it names it to count it against
the budget and to rank it in the subject hierarchy, not to fix its placement,
framing, or behavior. Surface placement and behavior are the camera/overlay
plan's responsibility.

## Composition Priority

The default addressed demo scene must prioritize, in this order:

1. Earth/corridor/geographic context
2. aircraft endpoint and fixed YKA endpoint
3. orbit-context movement and `LEO` / `GEO` distinction
4. one compact primary information surface
5. secondary inspectable detail

The scene must not invert this order by making panels the first thing the user
reads.

## Default Visible Surface Budget

The default addressed scene should expose at most:

- one primary satcom information surface
- one small viewing/replay control surface
- essential scene-anchored labels/badges

Everything else should be:

- scene-anchored
- collapsed by default
- inspectable on demand
- or removed entirely from the default presentation

`M8A-V3` should therefore treat these `M8A-V2` patterns as suspect unless
explicitly justified:

- top-center explanatory panel
- multiple persistent corner stacks with equal weight
- reintroduced bottom-centered narrative card

## Scene-Level Panel Demotion Budget

At the scene level, panel cleanup should demote, collapse, merge, or remove any
surface that causes the addressed default scene to read panel-first instead of
scene-first.

The scene-level budget therefore rejects:

- several equal-weight default HUD panels
- panel stacks that visually outrank the Earth/corridor/orbit subject
- prose-heavy default panels that delay the first scene read

## Globe Visibility Rule

The default addressed scene must leave a large uninterrupted viewing area where
the user can see:

- the Earth
- the route region
- endpoint relationship
- orbit-context motion

No default arrangement is acceptable if the user's immediate read is dominated
by UI chrome rather than the globe.

## Scene-Led Reading Rule

The scene should answer these questions before secondary text does:

- where are the two real communication endpoints?
- which orbit class is currently emphasized?
- is something moving?
- what is the current stage of the story?

If the answer still depends on reading several separate panels, the composition
has failed even if every panel is individually truthful.

## Preserved Truth Boundary

Composition cleanup must not widen truth claims.

The scene must preserve:

- accepted endpoint truth
- display-context orbit actors
- bounded-proxy metric interpretation
- provider-managed GEO anchor as service-side context only
- inactive/evidence-gated `MEO`, if shown

## Acceptance Criteria

This child plan is satisfied only when:

1. the globe and handover scene remain the primary subject
2. default-visible UI surfaces are reduced to one clear information surface plus
   necessary compact controls
3. default scene layout no longer reads as several competing panels
4. the user can identify endpoints and orbit-class story from the scene before
   reading secondary prose
5. no truth-boundary guarantee is weakened while reducing UI clutter
