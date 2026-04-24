# M8A-V3 Validation And Acceptance Plan

Source note: this file defines validation ordering and the final acceptance bar
for `M8A-V3`. It exists because `M8A-V2` passed its technical acceptance line
while still failing to deliver a clearly successful user-facing demo.

Parent SDD: see
[./m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
Related child plans: see
[./m8a-v3-entry-and-first-impression-plan.md](./m8a-v3-entry-and-first-impression-plan.md),
[./m8a-v3-primary-scene-composition-plan.md](./m8a-v3-primary-scene-composition-plan.md),
[./m8a-v3-motion-and-replay-affordance-plan.md](./m8a-v3-motion-and-replay-affordance-plan.md), and
[./m8a-v3-camera-and-overlay-convergence-plan.md](./m8a-v3-camera-and-overlay-convergence-plan.md).

## Status

- planning-only child SDD
- validation and acceptance authority only
- no runtime implementation authority by itself

## Purpose

This file answers two questions:

1. What must remain preserved from `M8A-V2` while `M8A-V3` converges
   presentation?
2. What is the real final acceptance bar for a successful demo recovery?

## Mandatory Preservation Gate

Before `M8A-V3` implementation starts, the branch must explicitly preserve:

- the first-case authority lock
- the shared replay clock as sole time authority
- addressed first-case ownership
- accepted runtime truth / display-context / forbidden-claims split
- repo-owned metric-class seam
- repo-owned orbit-context seam
- repo-owned bounded handover-state seam
- repo-owned camera/overlay ownership boundaries
- no raw-package runtime/controller/render side-read
- no synthetic visible satellite actor promotion

`M8A-V3` is not allowed to "fix the demo" by discarding those protections.

## Phase Validation Order

### M8A-V3.0

Validate:

- all `M8A-V3` planning docs exist
- the docs state clearly that `M8A-V2` technical completion did not equal demo
  success
- no runtime code is changed as part of the planning split

### M8A-V3.1

Validate:

- visible demo discovery is through one explicit homepage entry
- default route stays outside demo state unless explicitly entered
- named route or addressed-query machinery, if retained, stays internal
  transport detail rather than standalone discovery authority
- first addressed frame is intentionally different from the baseline viewer

### M8A-V3.2

Validate:

- globe and handover scene are the primary visual subject
- default-visible panels are reduced to one clear primary information surface
  plus necessary compact controls
- no residual prose-heavy panel dominates the addressed route

### M8A-V3.3

Validate:

- motion visibility is obvious
- the branch implements the single locked canonical entry-time replay
  strategy: explicit demo entry starts autoplay, owned by the shared replay
  authority, with user pause/scrub/overview still available through that
  authority
- no autoplay / no-autoplay dual-track alternative is offered at any layer
- the user can still pause, scrub, or switch to overview without leaving the
  shared replay authority
- no second timer, hidden autoplay track, hidden cinematic track, or drift is
  introduced
- movement remains synchronized with the shared replay authority

### M8A-V3.4

Validate:

- close-view framing remains legible near the endpoints
- overlay remains compact and non-blocking
- camera and overlay no longer compete as separate first-class surfaces
- the globe remains visible and readable

### M8A-V3.5

Validate:

- final regression suite proves user-facing demo success rather than only
  technical continuity
- all preserved truth-boundary guarantees remain intact

## Final Acceptance Bar

### Hard Gates

These items are treated as hard gates. They cannot be weakened, relaxed,
counter-balanced by passing other criteria, or reduced to regression-only
expectations. If any hard gate fails, the branch cannot claim successful
`M8A-V3` presentation convergence, even if every other criterion below
passes:

- the Earth/corridor/orbit scene remains the primary subject
- the default addressed scene is not panel-led
- one compact primary information surface remains the default visible satcom
  surface
- user-facing presentation quality does not regress below
  `scenario-globe-handover-demo` on first-frame clarity, obvious motion,
  same-page focus readability, scene-first hierarchy, and non-blocking support
  UI

### Full Criteria

The branch may claim that it now successfully demonstrates cross-orbit
satellite handover only when all of the following are true. Items 4-7 are the
Hard Gates named above and are non-negotiable:

1. the demo is reachable from an explicit visible homepage entry
2. the user does not need hidden query knowledge
3. the first addressed frame is clearly different from the baseline viewer
4. the Earth/corridor/orbit scene remains the primary subject (Hard Gate)
5. the default addressed scene is not panel-led (Hard Gate)
6. one compact primary information surface remains the default visible satcom
   surface (Hard Gate)
7. user-facing presentation quality does not regress below
   `scenario-globe-handover-demo` on first-frame clarity, obvious motion,
   same-page focus readability, scene-first hierarchy, and non-blocking support
   UI (Hard Gate)
8. the scene shows the aircraft/mobile endpoint and fixed YKA endpoint without
   the user hunting through several panels
9. the scene shows visible satellite/orbit presence
10. `LEO` and `GEO` are distinguishable at a glance
11. replay-driven movement is obvious within the first few seconds
12. stage progression is understandable without relying on a prose-heavy panel
13. close-view composition makes the handover story legible near the endpoints
14. Cesium timeline, animation controls, orbit/context motion, camera, and
    overlay remain on the same replay authority
15. satcom information is compact, useful, and non-blocking
16. visible or inspectable non-claims remain intact
17. no runtime/controller/render path side-reads raw `itri` packages
18. no active gateway, pair-specific GEO teleport, RF beam, native RF
    handover, measurement truth, second operator pair, active `MEO`, or
    arbitrary endpoint scope is introduced
19. any visible satellite actor remains repo-owned, source-lineaged, and
    non-synthetic

## Regression Expectations

The final regression suite should prove at least:

- default route stays outside demo state unless explicitly entered
- explicit demo entry succeeds
- the first addressed frame is visually distinct from the baseline viewer
- Earth remains the primary subject in the addressed scene
- `LEO` and `GEO` visual semantics are both present
- replay-driven movement is visible early in the demo
- close-view framing remains legible
- overlay does not block the main scene or dominate the first read
- all required non-claims remain visible or inspectable
- source-lineage/evidence-class telemetry still exists for orbit-context actors
- bounded metric cues and stage cues remain on the shared replay authority
- no demo-local synthetic handover loop, beam loop, or proxy recasting appears
  in the delivery branch
- provider-managed GEO anchor context does not become a precise third endpoint
