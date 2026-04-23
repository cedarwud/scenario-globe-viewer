# M8A Second-Endpoint Authority Package Plan

Source note: this file defines the pre-implementation authority package that
must exist before `M8A` runtime work may begin. It keeps the second endpoint as
an explicitly accepted truth artifact rather than letting runtime code invent
its identity, precision, or meaning.

Related expansion authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related M8A spine: see
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related first accepted corridor package: see
[../../../itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21](</home/u24/papers/itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21>).

## Status

- Planning-only authority-package SDD
- No implementation authority by itself
- Must be satisfied before `M8A.2` runtime work

## Slice Classification

This file defines `M8A.1`.

`M8A.1` is:

- a pre-runtime curation / artifact-authoring slice
- owned on the `itri/multi-orbit` side
- allowed to produce an accepted second-endpoint package

`M8A.1` is not:

- viewer runtime implementation
- overlay/runtime code work
- a reason to open `M8A.2` early

## Purpose

This file answers one narrow question:

What exact artifact package must exist so the repo can add a nearby second
endpoint without inventing identity, location precision, or communication
meaning in runtime code?

## Exact Package Home

The authority package for the second endpoint must live under:

- `itri/multi-orbit/download/nearby-second-endpoints/<package_id>/`

This location is intentional:

- it stays beside other accepted artifact packages
- it keeps accepted external-source truth outside runtime code
- it prevents later agents from hiding endpoint truth inside SDD prose only

## Required Package Contents

Each accepted second-endpoint package must contain:

1. `authority-package.md`
   - human-readable package summary
   - why this endpoint was selected
   - why it is better than other nearby candidates
2. `position.json`
   - machine-readable endpoint identity and precision
3. `sources.md`
   - source chain with direct links/filings/records
4. `non-claims.md`
   - explicit truth-boundary statements for what this package does not prove
5. `checks/acceptance.md`
   - acceptance outcome for the package

Optional but encouraged:

- `artifacts/`
- `notes/`

## Required Identity Fields

`position.json` must capture at least:

- `packageId`
- `endpointId`
- `endpointLabel`
- `endpointType`
- `endpointRoleForM8A`
- `geographyBucket`
- `positionPrecision`
- `coordinateReference`
- `sourceAuthority`
- `locationNarrative`

Coordinates may be:

- exact
- facility-known
- site-level

If later reviewers need qualifiers such as "strong site-level", record them in
free text, not in the primary enum.

They must not be:

- guessed from map screenshots
- inferred from untraceable community posts
- downgraded into "close enough" decorative markers

## Selection Rules

The accepted second endpoint must satisfy all of the following:

1. it is real and publicly attributable
2. it is fixed, not another mobile endpoint
3. it remains within the accepted first-corridor geography
4. it can be explained as a communication endpoint
5. it does not require pair-specific GEO teleport claims
6. it does not require active OneWeb gateway claims

Priority order:

1. airport-adjacent fixed service endpoint
2. corridor-adjacent enterprise/backhaul endpoint
3. other fixed service endpoint in the same narrative geography

## Forbidden Package Claims

The package must not claim:

- active gateway assignment
- serving gateway assignment
- pair-specific GEO teleport
- tail-level equipage proof
- active onboard service proof for the replayed flight
- measurement-truth latency/jitter/throughput

## Runtime Hand-Off Boundary

This package is allowed to hand off only:

- endpoint identity
- endpoint type
- accepted coordinate precision
- allowed viewer-facing narrative
- explicit non-claims

This package must not hand off:

- physical-input metrics
- handover decision outputs
- render handles
- Cesium-facing payloads
- generic endpoint-picker vocabularies

## Acceptance Criteria

The authority package is acceptable only when:

1. one package exists under
   `itri/multi-orbit/download/nearby-second-endpoints/<package_id>/`
2. the package ties itself explicitly to the accepted first corridor geography
3. `position.json` contains machine-readable identity and precision
4. `sources.md` traces the source chain clearly enough to defend the endpoint
5. `non-claims.md` keeps truth boundary explicit
6. the endpoint can be carried into viewer runtime without inventing active
   gateway or GEO teleport semantics

## Stop Boundary

This file does not authorize:

- runtime widening
- overlay rendering
- animation
- panel implementation
- second operator-pair work
- `MEO` exploratory work
