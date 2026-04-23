# M8A Nearby Second-Endpoint Expansion Plan

Source note: this file is the first detailed `M8` expansion SDD after the
defendable first-case baseline closed. It does **not** reopen generic global
endpoint selection. It narrows expansion to a second real endpoint near the
already accepted first-case geography.

Related north star: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md).
Related expansion authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related program skeleton: see
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md).
Related detailed planning surfaces: see
[./m8a-second-endpoint-authority-package-plan.md](./m8a-second-endpoint-authority-package-plan.md),
[./m8a-runtime-ownership-widening-plan.md](./m8a-runtime-ownership-widening-plan.md),
[./m8a-nearby-two-endpoint-expression-plan.md](./m8a-nearby-two-endpoint-expression-plan.md),
[./m8a-satcom-info-expansion-plan.md](./m8a-satcom-info-expansion-plan.md), and
[./m8a-implementation-readiness-checklist.md](./m8a-implementation-readiness-checklist.md).
Related post-`M8A` follow-on: see
[./m8a-read-only-catalog-follow-on-plan.md](./m8a-read-only-catalog-follow-on-plan.md).
Related accepted first-case corridor package: see
[../../../itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21](</home/u24/papers/itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21>).

## Status

- Active `M8A` planning surface
- Post-first-case expansion SDD
- Planning-only until a new execution gate explicitly opens implementation

## Purpose

This file answers one narrow question:

What is the safest next expansion after the first defendable OneWeb + Intelsat
GEO aviation case, if the repo should move toward "two real endpoints on the
globe" without turning into a generic arbitrary-endpoint demo?

## Expansion Summary

`M8A` keeps the existing first endpoint and adds one second real endpoint near
that first endpoint's accepted geography.

The first endpoint remains anchored to the already accepted first-case runtime:

- `OneWeb LEO + Intelsat GEO`
- `commercial aviation`
- `service-layer switching`
- `isNativeRfHandover = false`
- accepted corridor:
  `interior British Columbia to Vancouver`

The new second endpoint should therefore be:

- real
- fixed
- geographically adjacent to the accepted corridor
- semantically clean enough to render on-globe without inventing serving truth

## Why Not Arbitrary Global Two-Endpoint Selection

That broader line is deliberately deferred because it would force all of these
at once:

- endpoint selection UX
- global endpoint inventory governance
- multiple-case runtime switching
- broader animation semantics
- more ambiguous truth-boundary wording

`M8A` avoids that by proving one smaller thing first:

Can the viewer show a second real endpoint near the existing first endpoint
while keeping the first-case truth boundary intact?

## M8A Scope

In scope:

- choose one second real endpoint in the same regional corridor narrative
- define the second endpoint's accepted position precision
- widen runtime from "single anchored endpoint narrative" to
  "first endpoint + nearby second endpoint"
- add minimal animation/scene expression needed to make the relation legible
- extend the satcom information surface only as far as needed for this
  two-endpoint nearby-case presentation

Out of scope:

- arbitrary endpoint picker
- second operator pair
- `MEO` exploratory runtime
- pair-specific GEO teleport pinning
- active OneWeb gateway selection
- any claim of measurement-truth handover metrics

## Accepted Starting Geometry

The geography for `M8A` is constrained by the first accepted corridor package:

- `Air Canada CRJ900 regional corridor (interior British Columbia to Vancouver)`

Therefore the second endpoint should be selected from one of these geography
buckets:

1. `Vancouver-adjacent`
2. `interior British Columbia corridor-adjacent`
3. `airport-adjacent within the accepted replay window narrative`

The point of this restriction is not realism theater. It is to keep the second
endpoint visually and semantically tied to the already accepted corridor-backed
first endpoint.

## Second-Endpoint Selection Rules

The second endpoint should satisfy all of the following:

1. it has a real publicly attributable identity
2. it has acceptable location precision:
   - `exact`
   - `facility-known`
   - or `site-level`
3. it does not require inventing pair-specific GEO teleport semantics
4. it does not require inventing active OneWeb gateway semantics
5. it can be explained as a communication endpoint, not merely a decorative map
   marker

Priority classes:

1. airport-adjacent fixed service endpoint
2. corridor-adjacent enterprise/backhaul endpoint
3. other fixed service endpoint in the same regional narrative

## Required Planning Outputs Before Implementation

`M8A` should not start code until these artifacts exist:

1. a second-endpoint authority package
   - endpoint identity
   - endpoint type
   - position precision
   - non-claims
2. a runtime ownership note
   - where the second endpoint lives relative to existing
     `EndpointOverlaySeed`, overlay runtime, and active-case narrative
3. an animation boundary note
   - what is animated
   - what remains static
   - what is still bounded presentation only
4. a satcom info widening note
   - exactly which new facts the panel may expose
   - which facts remain forbidden

## Proposed M8A Slices

### M8A.1 — Second-Endpoint Authority Package

Goal:

- freeze the second endpoint itself as a pre-runtime curation slice before
  runtime widens

Output:

- one accepted second-endpoint package tied to the first corridor geography

Must not include:

- runtime code
- second operator pair

Ownership note:

- `M8A.1` is owned by the research/curation side of
  `itri/multi-orbit/download/nearby-second-endpoints/`
- it is an accepted artifact-authoring slice, not viewer runtime implementation

### M8A.2 — Runtime Ownership Widening

Goal:

- make the viewer runtime capable of carrying the nearby second endpoint without
  breaking the first-case lane

Output:

- repo-owned runtime seam for "first endpoint + nearby second endpoint"

Must not include:

- arbitrary endpoint selection
- global case picker

### M8A.3 — Nearby Two-Endpoint Expression

Goal:

- express the first endpoint and second endpoint together in the running viewer

Output:

- globe-visible nearby two-endpoint expression
- minimal animation that clarifies relation, not generic handover theater

Must not include:

- serving-gateway inference
- false continuity claims across unproven infrastructure

### M8A.4 — Satcom Info Expansion

Goal:

- widen the viewer-facing information surface so the second endpoint meaning is
  legible

Output:

- panel/narrative updates for:
  - second endpoint identity
  - second endpoint precision
  - what remains unclaimed

Must not include:

- measurement-style claims
- MEO language
- generic worldwide endpoint comparison

## Exit Criteria

`M8A` is complete only when all of these are true:

1. the running viewer still preserves the accepted first-case truth boundary
2. a second real endpoint near the accepted corridor is visible and explainable
3. the scene reads as "existing first endpoint plus nearby second endpoint",
   not "arbitrary global endpoint pair"
4. the satcom information surface explains what the second endpoint is, what
   its precision is, and what is still not claimed
5. no code path invents active gateway, pair-specific GEO teleport, or
   measurement truth

## Not The Same As M8B Or M8C

This file does **not** authorize:

- `M8B` second-case operator expansion
- `M8C` MEO exploratory work

If those lines are needed later, they must be planned separately.

## Planned Follow-On After M8A

If `M8A` closes successfully, the next planned continuation should not be a
third runtime endpoint.

The next planned continuation is:

- a read-only confirmed-points catalog with grouping/filter taxonomy

That follow-on is documented separately in:

- [m8a-read-only-catalog-follow-on-plan.md](./m8a-read-only-catalog-follow-on-plan.md)

This ordering is intentional:

1. first prove the second endpoint in runtime
2. then expose a broader confirmed-points catalog safely
3. only later revisit whether any additional runtime endpoint authority should
   exist
