# M8A-V3 Entry And First-Impression Plan

Source note: this file defines discoverability and first-frame behavior for
`M8A-V3`. It exists because `M8A-V2` preserved the stable homepage and added an
explicit entry, but the resulting first impression was still too weak to signal
that the user had entered a materially different cross-orbit demo.

Parent SDD: see
[./m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
Related viewing/validation plans: see
[./m8a-v3-camera-and-overlay-convergence-plan.md](./m8a-v3-camera-and-overlay-convergence-plan.md)
and
[./m8a-v3-validation-and-acceptance-plan.md](./m8a-v3-validation-and-acceptance-plan.md).

## Status

- planning-only child SDD
- entry and first-impression authority only
- preserves the stable default-route requirement

## Purpose

This file answers two questions:

1. How should the demo be discovered without hidden query knowledge?
2. What must the user understand in the first addressed frame?

## Stable Entry Rule

`M8A-V3` keeps the existing baseline rule:

- bare `/` remains stable and outside demo state unless the user explicitly
  enters the demo

`M8A-V3` does not reopen homepage auto-entry by default.

## Canonical Discovery Pattern

`M8A-V3` locks a single canonical user-discovery authority. No parallel,
alternative, or fallback discovery pattern is maintained at the planning
layer, and later phases must not re-introduce one.

The locked canonical discovery pattern is:

- one explicit visible homepage/demo entry

This homepage entry is the only canonical user-discovery pattern for the
first-case demo.

Named routes, addressed query machinery, and equivalent addressed-state wiring
may still exist as internal transport details after explicit entry, but they
are not separate user-discovery authority and must never become the visible
discovery surface.

The bare default route `/` stays outside demo state. It does not auto-enter
demo state, does not auto-play a hidden cinematic, and does not redirect to
any addressed demo route. Demo state only begins when the user crosses the
explicit homepage/demo entry above.

The delivery branch must not require:

- hidden query knowledge
- dev-console knowledge
- a buried operator-only control
- a named route that acts as the only visible discovery surface
- a route that looks identical to the baseline until the user reads small text

## First-Impression Requirement

After explicit entry, the first addressed frame must immediately read as a
cross-orbit handover demo.

That means the user should be able to tell, before reading secondary details,
that:

- this is not the unchanged baseline homepage
- there is a specific handover story in progress
- the scene includes real geography, endpoint context, and orbit context
- replay motion has already started and the control surface is visible

## Required First-Frame Signals

The addressed first frame should reveal these signals quickly:

- aircraft/mobile endpoint cue
- fixed YKA endpoint cue
- visible `LEO` / `GEO` distinction or a dominant stage/motion cue that makes
  the orbit-class story obvious
- one compact satcom/truth-boundary surface
- one visible replay control surface showing that autoplay is already active

The first frame must not depend on the user reading:

- a large prose panel
- a bottom narrative strip
- a stacked set of top-corner panels with no clear priority

## Entry Visual-Signal Rule

The homepage entry itself should not read like a tiny metadata extension. It
should visibly signal:

- this is a demo entry
- this is the cross-orbit handover path
- this is the first-case story:
  `OneWeb LEO + Intelsat GEO aviation`

The entry may stay compact, but it must not be visually ignorable.

## Forbidden First-Impression Failure Modes

`M8A-V3` must reject any first-frame behavior where:

- the scene still looks like the baseline homepage plus extra labels
- the user sees several panels before seeing the handover story
- the user cannot tell where motion will come from
- the user has to read a paragraph to understand why the demo is different

## Acceptance Criteria

This child plan is satisfied only when:

1. the demo is explicitly discoverable from one visible homepage entry without
   hidden query knowledge
2. the default route remains stable and outside demo state
3. named route or addressed-query machinery, if retained, remains internal
   transport detail rather than standalone discovery authority
4. the addressed first frame is obviously different from the baseline viewer
5. the entry and first frame both clearly signal the cross-orbit handover story
6. the first frame exposes active motion plus visible replay control without
   relying on prose-heavy explanation
