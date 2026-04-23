# M8A Read-Only Catalog Follow-On Plan

Source note: this file defines the first planned follow-on after `M8A` runtime
delivery. It is intentionally **not** a runtime communication selector plan.
Its purpose is to let the viewer show already-confirmed points on the globe and
in supporting UI without implying that every listed point is eligible for live
scenario participation.

Related north star: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md).
Related M8 expansion authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related M8A spine: see
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related program skeleton: see
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md).

## Status

- planning-only follow-on SDD
- post-`M8A` continuation lane
- no implementation authority by itself

## Purpose

This file answers one narrow question:

Once `M8A` is complete, what is the safest next step if the viewer should show
more confirmed points, grouped and filterable, without reopening arbitrary
global endpoint selection or implying live communication eligibility?

## Core Decision

The first follow-on after `M8A` should be:

- a read-only confirmed-points catalog
- with group taxonomy and filterable presentation
- but without runtime selection authority

That means the catalog may show:

- accepted fixed endpoints
- accepted endpoint-like seams
- accepted infrastructure points
- candidate points if clearly labeled
- logical anchors if clearly marked as coordinate-free

It must not imply:

- every listed point can enter runtime
- every listed point can communicate with every other listed point
- generic arbitrary endpoint selection
- global multi-case control UI

## Why This Follow-On Comes Next

This follow-on is deliberately placed after `M8A` because:

1. the repo first proves one controlled second-endpoint runtime expansion
2. the catalog then widens visibility safely, without forcing a third runtime
   endpoint
3. the truth boundary remains legible because the catalog is read-only

This is significantly safer than introducing:

- a third runtime endpoint
- a multi-endpoint communication selector
- a global accepted endpoint registry used directly by runtime

## Proposed Scope

In scope:

- one repo-owned read-only catalog surface
- point grouping by:
  - `kind`
  - `status`
  - `precision`
  - `runtimeEligibility`
  - `communicationGroups`
- map display for fixed points with coordinates
- table or list display for all confirmed items
- explicit distinction between:
  - `accepted`
  - `candidate`
  - `reference-only`
  - `display-only`
  - `runtime-eligible`

Out of scope:

- direct scenario launching from the catalog
- free-form endpoint pairing
- live communication eligibility across arbitrary catalog members
- introducing a third runtime-participating point
- `MEO` expansion

## Planned Taxonomy

The first catalog should distinguish at least these fields:

- `kind`
  - `fixed-endpoint`
  - `gateway`
  - `logical-anchor`
  - `mobile-corridor`
- `status`
  - `accepted`
  - `candidate`
  - `reference-only`
- `precision`
  - `exact`
  - `facility-known`
  - `site-level`
  - `coordinate-free`
- `runtimeEligibility`
  - `display-only`
  - `candidate-only`
  - `accepted-runtime`
- `communicationGroups`
  - one or more family/group labels

## Grouping Rule

`communicationGroups` must not mean:

- all members are proven to communicate live with one another

Instead, they mean:

- the point belongs to the same accepted scenario family
- or the same viewer runtime eligibility family

This keeps future filtering useful without overclaiming live service truth.

## First Expected Members

The first catalog should be able to express at least:

- first-case aircraft-side endpoint seam
- first-case provider-managed GEO anchor seam
- OneWeb eligible gateway pool points
- accepted nearby second endpoint:
  - `YKA Kamloops Airport Operations Office`
- nearby candidate points if included:
  - clearly labeled as non-runtime and non-accepted where appropriate

## Acceptance Criteria For The Future Follow-On Slice

The follow-on is acceptable only when:

1. the catalog is visibly read-only
2. accepted, candidate, and reference-only states are explicit
3. runtime eligibility is explicit
4. coordinate-free items are not forced into fake coordinates
5. the UI does not imply arbitrary point-to-point communication authority

## Stop Boundary

This file does not authorize:

- third-endpoint runtime work
- arbitrary endpoint selector UI
- new communication claims
- M8B second operator-pair expansion
- M8C MEO exploratory work
