# M8A-V3.5 Source-Lineaged Orbit Actor Recovery Plan

Source note: this file is the execution-facing recovery child plan for
`M8A-V3.5`. It turns the existing `M8A-V2` minimum visible slice into a
bounded implementation target without reopening first-case truth, endpoint
scope, RF handover truth, or measurement truth.

Parent SDD: see
[./m8a-v3-presentation-convergence-umbrella-plan.md](./m8a-v3-presentation-convergence-umbrella-plan.md).
Related authority: see
[./m8a-v2-satellite-evidence-and-data-contract-plan.md](./m8a-v2-satellite-evidence-and-data-contract-plan.md),
[./m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md),
[./m8a-v2-orbit-animation-and-visual-language-plan.md](./m8a-v2-orbit-animation-and-visual-language-plan.md),
[./m8a-v3-validation-and-acceptance-plan.md](./m8a-v3-validation-and-acceptance-plan.md), and
[../decisions/0011-source-lineaged-orbit-context-actor-gate.md](../decisions/0011-source-lineaged-orbit-context-actor-gate.md).

## Status

- planning-only child SDD
- next implementation authority for the V3.5 recovery slice
- no runtime implementation by itself
- first-case-only:
  `OneWeb LEO + Intelsat GEO`, commercial aviation,
  `service-layer switching`, `isNativeRfHandover = false`

## Purpose

This file answers one implementation-control question:

How should the next development thread make the viewer visibly read as a
two-endpoint cross-orbit handover demo while using source-lineaged orbit
context and preserving all truth boundaries?

## Current Gap

The current viewer has useful real-data foundations:

- replayed aircraft/mobile endpoint
- fixed YKA nearby endpoint
- first-case `OneWeb LEO + Intelsat GEO aviation` semantics
- bounded-proxy physical input and metric classes
- replay authority, camera, and compact overlay foundations

The visible handover story is still weak because:

- abstract orbit arcs and relation lines are not enough to read as satellite
  actors
- the scene does not yet show a source-lineaged moving `LEO` context actor and
  a fixed or near-fixed `GEO` context anchor
- the presentation-state progression is not yet the single obvious visual
  driver for actors, relation cues, and compact metrics

`M8A-V3.5` exists to close that visible recovery gap, not to create a new
truth model.

## Scope

In scope:

- a viewer-owned source-lineaged orbit-context projection artifact
- at least one moving `OneWeb LEO` context actor
- one fixed or near-fixed `Intelsat GEO` continuity anchor
- generic `satellite.glb` mesh use with attribution and non-claims
- a minimum four-state presentation progression:
  - `geo-context`
  - `dual-orbit`
  - `switch-window`
  - `leo-context`
- compact metric cue sourced only from the bounded metric-class seam
- stage-linked visual emphasis shared by actors, relation cue, and overlay
- screenshot/browser acceptance that verifies first-frame clarity and early
  motion

Out of scope:

- active serving-satellite identity
- active gateway assignment
- pair-specific GEO teleport coordinate
- RF beam or endpoint-to-satellite success beam
- native RF handover truth
- measurement-truth latency, jitter, throughput, or continuity
- Starlink mesh promotion for OneWeb or Intelsat
- demo synthetic proxy actors or synthetic handover loops
- active `MEO` participation
- arbitrary endpoint selection or a second operator pair

## Source And Projection Rules

### Raw Source Package

The implementation may create or reuse an archived source package for orbit
actor evidence under the `itri/multi-orbit` authority surface, for example:

`itri/multi-orbit/download/orbit-actors/<snapshot-date>/`

That package may contain upstream source snapshots, source URLs, fetch notes,
checksums, and source-lineage notes.

The renderer must not read that raw package.

### Viewer-Owned Projection Artifact

The viewer must consume a repo-owned projected display artifact or module.
The projected seam must carry at least:

- `scenarioId`
- `actorId`
- `orbitClass`: `leo` or `geo`
- `displayRole`: `leo-context-actor` or `geo-context-anchor`
- `operatorContext`: `OneWeb` or `Intelsat`
- `sourceLineage`
- `sourceEpochUtc`
- `projectionEpochUtc`
- `freshnessClass`
- `positionPrecision`
- `motionMode`: `replay-driven` or `fixed-earth-relative`
- `evidenceClass = display-context`
- `modelAssetId`
- `modelTruth = generic-satellite-mesh`
- machine-readable non-claims for:
  - active serving satellite
  - active gateway assignment
  - pair-specific GEO teleport
  - RF beam truth
  - native RF handover truth
  - measurement truth
  - live operational truth

The first implementation should prefer a source-lineaged `OneWeb` public
ephemeris/TLE-equivalent source for `LEO` and a source-lineaged `Intelsat` GEO
satellite or operator anchor source for `GEO`.

If a source epoch cannot be aligned to the aircraft replay date, the projected
artifact must mark the mismatch through `freshnessClass` and must not present
the actor as historical replay truth.

## Model Asset Rule

The planned visual mesh is:

`satellite.glb`

It may be copied into the viewer repo only with a third-party notice that
records:

- title: `Simple Satellite Low Poly Free`
- author: `DjalalxJay`
- source URL
- license: `CC-BY-4.0`
- modification notes, if any
- non-claim:
  `generic satellite mesh; not OneWeb or Intelsat spacecraft body geometry`

`starlink.glb` must not be used for OneWeb or Intelsat in this branch.

The demo repo's `sat.glb` must not be used as the delivery default because its
`CC-BY-NC-4.0` license is not acceptable for this default asset path without a
separate approval.

## Presentation State Rule

`M8A-V3.5` must not widen `handover-decision` truth to fake an active
handover.

The implementation should create or use a separate presentation-only state
model that is synchronized to the shared replay clock and bounded metric
classes. It should drive:

- actor emphasis
- relation ribbon emphasis
- compact stage strip
- metric glyph or cue
- endpoint marker emphasis

The minimum states are:

1. `geo-context`
   - `GEO` continuity anchor is visually primary
   - `LEO` context is visible but secondary
2. `dual-orbit`
   - both orbit classes are visible and balanced
   - relation cue indicates service-layer overlap, not RF geometry
3. `switch-window`
   - compact metric cue and relation emphasis explain the bounded switch basis
   - no exact handover event or active satellite claim
4. `leo-context`
   - moving `LEO` context actor becomes visually primary
   - `GEO` continuity anchor remains visible as context

## Visual Grammar

The viewer may borrow from `scenario-globe-handover-demo` only as
presentation grammar:

- same-page close-view focus
- large readable satellite actors
- stage color separation
- non-blocking labels
- motion that is obvious in the first few seconds

It must not borrow:

- synthetic local proxy satellites
- synthetic handover loop timing
- compressed local sky geometry as orbit truth
- beam cones
- active serving/pending labels

Recommended labels:

- `OneWeb LEO context`
- `Intelsat GEO continuity anchor`
- `display-context`
- `bounded proxy`
- `not RF handover`

Avoid:

- `SERVING`
- `PENDING`
- `handover target`
- `active satellite`
- `gateway selected`

## Implementation Slice Order

### Slice 1: Projection Contract And Asset Governance

Deliver:

- ADR 0011 accepted and linked
- this V3.5 child plan linked from the V3 umbrella and validation plan
- source-lineaged orbit actor projection shape finalized
- `satellite.glb` attribution/notice requirements recorded
- no runtime code yet if this is handled by a planning thread

### Slice 2: Source-Lineaged Actor Plus Minimal State Skeleton

Deliver:

- viewer-owned projected orbit-context artifact or module
- moving `LEO` context actor
- fixed or near-fixed `GEO` continuity anchor
- shared replay-clock placement/update
- four-state presentation skeleton
- compact metric cue connected to bounded-proxy classes
- actor labels and non-claims

This is the first implementation slice and should not be split into an
actor-only task.

### Slice 3: Scene Composition And Overlay Refinement

Deliver:

- close-view framing tuned around the two endpoints and visible orbit actors
- compact stage strip / metric glyph / truth badge / relation ribbon alignment
- overlay remains supportive and non-blocking
- query/deep-link path remains available for tests and capture
- ADR 0010 is not superseded unless a separate homepage-entry decision is
  accepted

### Slice 4: Acceptance Capture And Regression

Deliver:

- build and focused smoke coverage
- browser visual acceptance across addressed route and default route
- screenshots proving:
  - first-frame clarity
  - visible satellite presence
  - early replay-driven motion
  - `LEO`/`GEO` distinction
  - stage progression
  - non-blocking overlay
  - source/evidence/non-claim visibility or inspectability

## Acceptance Criteria

`M8A-V3.5` can be accepted only when:

1. a visible moving `OneWeb LEO` context actor is present
2. a visible fixed or near-fixed `Intelsat GEO` continuity anchor is present
3. both actors consume viewer-owned projected display data, not raw packages
4. `satellite.glb` is recorded as a generic mesh with attribution and
   non-claims
5. no Starlink or demo non-commercial mesh is promoted into the delivery path
6. presentation state changes actor, relation, and compact metric emphasis
7. motion and state derive from the shared replay authority
8. the scene remains readable as two endpoints plus cross-orbit context without
   a prose-heavy panel
9. default route does not publish promoted satellite actor state
10. no active gateway, teleport, RF, serving-satellite, native handover,
    measurement-truth, active `MEO`, or second-pair claim is introduced
11. screenshot/browser evidence shows that the result is visually stronger than
    the V3.4 dashed-line/orbit-arc recovery state

## Handoff To Implementation

An implementation thread must read this file first, then implement only the
requested slice. It must report deviations separately if source availability,
license evidence, Cesium model rendering, or visual acceptance prevents the
planned scope from landing exactly as written.
