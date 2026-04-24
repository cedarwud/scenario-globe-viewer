# M8A-V3 Presentation Convergence Umbrella Plan

Source note: this file is the canonical recovery umbrella for `M8A-V3` in
`scenario-globe-viewer`. It exists because `M8A-V2` completed the bounded
engineering line for cross-orbit handover demonstration, but that technical
completion did not yet converge into a convincing user-facing demo.

Related authority: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md),
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md),
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md),
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md),
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md), and
[./m8a-v2-validation-and-acceptance-plan.md](./m8a-v2-validation-and-acceptance-plan.md).
Related presentation probe: see
[../../../scenario-globe-handover-demo/docs/local-handover-focus-demo-sdd.md](../../../scenario-globe-handover-demo/docs/local-handover-focus-demo-sdd.md)
and
[../../../scenario-globe-handover-demo/docs/local-focus-visual-refinement-sdd.md](../../../scenario-globe-handover-demo/docs/local-focus-visual-refinement-sdd.md).

## Status

- planning-only umbrella
- convergence/recovery authority only
- no runtime implementation authority by itself
- preserves first-case lock:
  `OneWeb LEO + Intelsat GEO`, commercial aviation,
  `service-layer switching`, `isNativeRfHandover = false`
- does not reopen `M8B`, `M8C`, active `MEO`, arbitrary endpoint selection,
  global endpoint navigation, or a second operator pair

## Purpose

This file answers one control question:

What should the repo plan next when `M8A-V2` has already built defensible
truth-boundary, replay, orbit-context, state-model, camera, overlay, and
validation seams, but the resulting branch still fails to read as an obvious,
effective cross-orbit handover demo?

## Confirmed V2 Outcome

`M8A-V2` successfully built or locked:

- explicit demo-entry wiring
- shared replay authority
- addressed first-case ownership
- accepted-runtime-truth vs display-context vs forbidden-claims separation
- repo-owned metric-class seam
- repo-owned orbit-context seam
- repo-owned bounded handover-state seam
- repo-owned orbit visual-language seam
- repo-owned two-mode camera seam
- repo-owned compact satcom overlay seam
- replay-synchronized acceptance/regression proof

That means `M8A-V2` is not a null effort. The branch now has reusable bounded
engineering assets.

The remaining problem is user-facing:

- homepage difference is too weak
- addressed-route first impression is not obviously different from the baseline
- multiple HUD surfaces compete with the globe
- the Earth/corridor/orbit story is not the uncontested primary subject
- movement is too hidden, too weak, or too dependent on the user discovering
  replay controls
- technical acceptance can pass while the demo still feels like a crowded
  validation shell

`M8A-V3` therefore treats the current state as:

- technical completion of the V2 engineering line
- demonstration failure in presentation convergence

## Scope Lock

`M8A-V3` remains under the original first-case authority:

- first pair stays `OneWeb LEO + Intelsat GEO`
- vertical stays commercial aviation
- endpoint A stays aircraft-side connectivity stack
- endpoint B stays provider-managed GEO anchor
- accepted nearby second endpoint stays
  `m8a-yka-operations-office-2026-04-23`
- service interpretation stays `service-layer switching`
- `isNativeRfHandover = false` stays explicit
- the branch stays bounded-proxy, not measurement truth

## Preserved Engineering Assets

`M8A-V3` must preserve these `M8A-V2` assets unless a later authority document
explicitly supersedes one of them:

- shared replay clock as the only time authority
- addressed first-case scenario ownership
- accepted runtime truth / display-context / forbidden-claims split
- repo-owned metric-class seam
- repo-owned orbit-context seam
- repo-owned bounded handover-state seam
- repo-owned orbit visual-language seam
- repo-owned cinematic camera seam
- repo-owned satcom overlay seam
- no raw-package runtime/controller/render side-read
- no synthetic visible satellite actor promotion

The recovery line exists to reuse these assets, not to throw them away and
start inventing truth again.

## Non-Goals

`M8A-V3` must not:

- reopen the data-contract problem already solved in `M8A-V2`
- add new operator pairs, active `MEO`, or arbitrary endpoint browsing
- add a second page, second Cesium `Viewer`, or synthetic local-sky runtime
- widen claims into active gateway truth, RF truth, teleport truth, or
  measurement truth
- grow new validation-first UI surfaces that compete with the scene
- use the recovery line as an excuse to add more controllers before the demo is
  visually coherent

## Recovery Principle

The next line must optimize for user-visible demonstration quality first.

The branch should read like:

- one obvious entry
- one obvious first frame
- one obvious moving handover story
- one obvious primary information surface
- one obvious way to tell what is truth, display-context, and non-claim

It must not read like:

- one globe plus several competing proof panels
- one route that technically contains the demo but does not visually announce
  it
- one scene where the user has to infer motion or story from labels alone

## Presentation Requirement Reset

`scenario-globe-handover-demo` remains useful, but only as a presentation probe.
`M8A-V3` should inherit its strengths more explicitly than `M8A-V2` did:

- same-page focus
- a stable default close-view composition
- obvious recovery/overview behavior
- strong subject hierarchy
- motion that is obvious without reading panel text

`M8A-V3` must still reject the demo's synthetic truth surfaces:

- synthetic proxy-satellite handover loops
- synthetic beam cones
- arbitrary endpoint picking
- local-sky proxy corridor as delivery truth
- demo-only metrics or rankings

## Presentation Benchmark Rule

`scenario-globe-handover-demo` is not a clone target and not a truth source.
`M8A-V3` must preserve `scenario-globe-viewer`'s own truth boundary, accepted
corridor context, and bounded first-case semantics.

However, as a user-facing presentation benchmark, `M8A-V3` must not regress
below the demo probe in:

- first-frame clarity
- obvious motion
- same-page focus readability
- scene-first hierarchy
- non-blocking support UI

This does not mean `M8A-V3` should look identical to the demo probe. It means
the delivery branch may differ in style or data grounding, but it must not land
in a visibly weaker presentation state while claiming that convergence has
improved.

## Child SDD Split

`M8A-V3` is split into these child plans:

1. [m8a-v3-entry-and-first-impression-plan.md](./m8a-v3-entry-and-first-impression-plan.md)
2. [m8a-v3-primary-scene-composition-plan.md](./m8a-v3-primary-scene-composition-plan.md)
3. [m8a-v3-motion-and-replay-affordance-plan.md](./m8a-v3-motion-and-replay-affordance-plan.md)
4. [m8a-v3-camera-and-overlay-convergence-plan.md](./m8a-v3-camera-and-overlay-convergence-plan.md)
5. [m8a-v3-validation-and-acceptance-plan.md](./m8a-v3-validation-and-acceptance-plan.md)

## Phase Breakdown

### M8A-V3.0 - Authority Lock And Recovery Framing

Goal:

- record that `M8A-V2` engineering assets are preserved
- record that technical completion did not equal demo success
- define presentation convergence as the new authority problem

### M8A-V3.1 - Entry And First-Impression Reset

Goal:

- make the demo visibly discoverable
- make the first addressed frame clearly different from the baseline viewer
- prevent the homepage/demo entry from reading like a minor metadata change

### M8A-V3.2 - Primary Scene Composition Reset

Goal:

- make globe, endpoints, relation, and orbit motion the primary read
- remove or demote non-primary default HUD surfaces
- recover a clear subject hierarchy

### M8A-V3.3 - Motion And Replay Affordance Recovery

Goal:

- make movement obvious without requiring the user to hunt for it
- lock a single canonical entry-time replay strategy (autoplay on explicit
  demo entry, owned by the shared replay authority, with user pause/scrub/
  overview still available through that authority)
- reject any autoplay / no-autoplay dual-track alternative at the planning
  layer
- keep all motion on the shared replay authority

### M8A-V3.4 - Camera And Overlay Convergence

Goal:

- make the close-view composition readable without burying the globe
- keep satcom information compact and supportive
- ensure camera and overlay help the scene instead of competing with it

### M8A-V3.5 - Final Acceptance Reset

Goal:

- make user-facing demo success the real acceptance bar
- keep the V2 truth-boundary guarantees intact while resetting presentation
  quality expectations

## High-Level Acceptance Direction

`M8A-V3` is complete only when:

1. the demo is still reachable from an explicit visible homepage entry
2. the first addressed frame is clearly different from the baseline viewer
3. the Earth/corridor/orbit scene remains the primary subject
4. the user can identify aircraft endpoint, YKA endpoint, `LEO`, and `GEO`
   without hunting through multiple panels
5. replay-driven movement is obvious within the first few seconds
6. stage progression is understandable without reading a prose paragraph
7. default HUD layout no longer overwhelms the globe
8. satcom information remains compact, non-blocking, and truth-bounded
9. all `M8A-V2` truth-boundary protections remain intact
