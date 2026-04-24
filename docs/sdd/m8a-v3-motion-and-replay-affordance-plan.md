# M8A-V3 Motion And Replay Affordance Plan

Source note: this file defines how `M8A-V3` should make motion obvious. It
exists because `M8A-V2` synchronized orbit, state, camera, and overlay to one
replay authority, but that alone did not guarantee that the user would clearly
perceive motion or understand where it comes from.

Parent SDD: see
[./m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
Related V2 authority: see
[./m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md),
[./m8a-v2-orbit-animation-and-visual-language-plan.md](./m8a-v2-orbit-animation-and-visual-language-plan.md), and
[./m8a-v2-cinematic-camera-and-viewing-plan.md](./m8a-v2-cinematic-camera-and-viewing-plan.md).

## Status

- planning-only child SDD
- motion/replay-affordance authority only
- preserves the single replay-clock rule

## Purpose

This file answers two questions:

1. How should the user recognize that motion exists?
2. What entry-time replay behavior is acceptable?

## Single-Authority Rule

`M8A-V3` keeps the `M8A-V2` time rule:

- one replay authority
- one Cesium timeline/animation authority
- one orbit/state/camera/overlay time base

No second timer, separate autoplay track, camera-only drift, or overlay-only
drift is allowed.

## Motion Visibility Requirement

The demo is not acceptable if replay-driven movement exists only in telemetry or
in subtle stage chips.

Movement must be obvious through at least one of:

- immediately visible `LEO` motion after entry
- immediately visible camera reframing linked to replay progression
- a visible replay surface that shows autoplay is already in progress and still
  exposes user control

## Canonical Entry-Time Replay Strategy

`M8A-V3` locks a single canonical entry-time replay strategy. No autoplay /
no-autoplay dual-track alternative is maintained at the planning layer, and
later phases must not re-introduce one.

The locked canonical strategy is:

- explicit demo entry starts autoplay immediately
- autoplay is owned by the same shared replay authority that drives Cesium,
  handover state, camera, and overlay
- the user can still pause, scrub, or switch to overview through that same
  replay/view system

This strategy must stay:

- replay-authority-owned
- stage-model-owned
- timeline-aligned

It must not become:

- a second timer
- a hidden autoplay track
- a hidden cinematic track
- an independent autoplay loop running beside, but not through, the shared
  replay authority

## Operational Consequence

From the locked canonical strategy:

- explicit demo entry lands in a stable close-view composition
- replay motion begins immediately in an obvious, authority-safe way
- user agency stays available through the same shared replay/view controls

## Forbidden Motion Failure Modes

`M8A-V3` must reject:

- a scene where motion exists but is not obvious
- a scene where the user cannot tell what will animate
- a scene where camera moves but orbit/context appears static
- a scene where motion is blocked by panel clutter

## Acceptance Criteria

This child plan is satisfied only when:

1. replay-driven motion is obvious early in the demo experience
2. the entry-time replay behavior is locked to a single canonical strategy:
   autoplay on explicit demo entry, owned by the shared replay authority,
   with user pause/scrub/overview still available through that same authority
3. no autoplay / no-autoplay dual-track alternative is offered at any layer
4. motion stays on the shared replay authority used by Cesium, camera, state,
   and overlay
5. the user does not need to guess where animation comes from
6. no second timer, hidden autoplay track, or hidden cinematic track is
   introduced
