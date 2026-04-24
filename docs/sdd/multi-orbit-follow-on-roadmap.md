# Multi-Orbit Follow-On Roadmap

Source note: this file is the post-first-case, post-`M8A` execution roadmap.
It exists to make later work explicit before it begins, so future agents do not
reopen old research or improvise a new direction after one slice closes.

Related north star: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md).
Related program skeleton: see
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md).
Related `M8` authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related research/planning index: see
[../../../itri/multi-orbit/research-and-planning-index.md](../../../itri/multi-orbit/research-and-planning-index.md).

## Status

- planning-only roadmap
- no implementation authority by itself
- continuation map after the current `M8A` line

## Purpose

This file answers one question:

After the current approved work lands, what follow-on tracks are already known,
how important are they to the ITRI line, and what must be true before each one
opens?

## Track Classes

### Track A — ITRI-Direct

These tracks directly strengthen the viewer's ability to satisfy the original
ITRI multi-orbit simulation / explanation line.

### Track B — ITRI-Supporting

These tracks are not the core handover scene by themselves, but they materially
improve explainability, traceability, and safe reuse of confirmed assets.

### Track C — Optional Expansion

These tracks are real possibilities, but they should not open automatically
after the current line. They need explicit reopen authority.

## Planned Tracks

### R1 — Complete `M8A`

Class:

- Track A — ITRI-Direct

Goal:

- finish the nearby-second-endpoint runtime line through:
  - `M8A.2` runtime ownership widening
  - `M8A.3` nearby two-endpoint expression
  - `M8A.4` satcom-info expansion

Why it matters:

- it turns the closed first-case baseline into a controlled two-endpoint viewer
  scene without reopening global selection

Status:

- complete

Open only when:

- `M8A.1` accepted package exists
- `m8a-implementation-readiness-checklist.md` is satisfied

### R1V — `M8A` Visual Replay Integration

Class:

- Track A — ITRI-Direct

Goal:

- make the completed `M8A` nearby-second-endpoint scene usable as a bounded
  animated viewer demonstration by aligning:
  - Cesium animation widget
  - Cesium timeline
  - repo-owned replay clock
  - moving current mobile cue
  - fixed nearby second-endpoint marker
  - presentation-only relation cue
  - one first close/cinematic camera preset
  - non-blocking satcom context overlays
  - explicit satellite/constellation evidence boundary

Primary planning home:

- [m8a-visual-replay-integration-plan.md](./m8a-visual-replay-integration-plan.md)

Child planning homes:

- [m8a-visual-replay-time-and-camera-plan.md](./m8a-visual-replay-time-and-camera-plan.md)
- [m8a-visual-replay-animation-plan.md](./m8a-visual-replay-animation-plan.md)
- [m8a-satcom-context-overlay-plan.md](./m8a-satcom-context-overlay-plan.md)
- [m8a-satellite-evidence-promotion-plan.md](./m8a-satellite-evidence-promotion-plan.md)

Why it matters:

- `M8A.3` and `M8A.4` proved runtime and viewer seams, but the viewer still
  needs one coherent replay-time and camera story before the two-endpoint
  scene is legible as an animation
- it lets the project repair presentation clutter without deleting accepted
  `M8A` capture or telemetry seams

Status:

- planned

Open only when:

- `M8A` is complete
- the work remains first-case-plus-nearby-second-endpoint only
- floating-panel suppression, time integration, animation, and camera behavior
  stay presentation-only
- the first close/cinematic camera mode remains a bounded preset, not an
  arbitrary endpoint navigation model
- satcom information remains non-blocking and truth-bounded
- satellite, constellation, gateway, and teleport references remain
  display-context or future evidence scope unless a repo-owned projection
  contract promotes them
- no arbitrary endpoint selection, second operator pair, `MEO`, active gateway
  assignment, pair-specific GEO teleport, or measurement-truth performance
  semantics are introduced

### R2 — Read-Only Confirmed-Points Catalog

Class:

- Track B — ITRI-Supporting

Goal:

- build a read-only catalog surface for confirmed points, grouped and
  filterable, without granting runtime selection authority

Primary planning home:

- [m8a-read-only-catalog-follow-on-plan.md](./m8a-read-only-catalog-follow-on-plan.md)

Why it matters:

- it exposes the already confirmed research and accepted packages to users
  safely
- it reduces pressure to jump straight into arbitrary endpoint selection

Status:

- planned

Open only when:

- `M8A` is functionally closed
- group/status/precision taxonomy remains explicit

### R3 — Accepted Endpoint / Site Package Expansion

Class:

- Track B — ITRI-Supporting

Goal:

- add more accepted or candidate endpoint/site packages without automatically
  granting runtime participation

Examples:

- additional nearby fixed endpoints
- more accepted gateway / facility packages
- better packaged candidate points for future catalog use

Why it matters:

- it grows the evidence-backed inventory without forcing runtime complexity

Status:

- planned

Open only when:

- each new package has its own accepted authority package or clearly labeled
  candidate package
- no new runtime claim is implied by mere inclusion

### R4 — Gateway / Ground-Node Catalog Normalization

Class:

- Track B — ITRI-Supporting

Goal:

- normalize the already researched OneWeb gateway / ground-node data into a
  viewer-safe catalog surface

Why it matters:

- the research line already has meaningful gateway data
- a clean catalog would make the existing infrastructure semantics easier to
  inspect and explain

Status:

- planned

Open only when:

- canonical precision/status/evidence rules remain explicit
- facility-known and site-level points are not overdrawn as exact runtime
  truths

### R5 — Operator Pair / Evidence Matrix Surface

Class:

- Track B — ITRI-Supporting

Goal:

- expose the already researched operator-pair evidence grades in a read-only
  viewer information surface

Why it matters:

- it helps explain why the current implementation anchor was chosen
- it can make public/proven/plausible distinctions legible without reopening
  runtime scope

Status:

- planned

Open only when:

- the matrix is explicitly informational
- it does not imply every listed pair is implemented

### R6 — Endpoint Inventory Governance Surface

Class:

- Track B — ITRI-Supporting

Goal:

- formalize a stable classification for:
  - `accepted`
  - `candidate`
  - `reference-only`
  - `display-only`
  - `runtime-eligible`

Why it matters:

- later catalog and selection work becomes much safer if the inventory states
  are formalized first

Status:

- planned

Open only when:

- the governance surface stays independent from arbitrary runtime selection

### R7 — Second GEO Case

Class:

- Track C — Optional Expansion

Goal:

- add a second defendable GEO-related case beyond the current first-case line

Why it matters:

- it could broaden the multi-orbit story while staying closer to stronger
  public evidence than MEO

Status:

- not approved

Requires explicit reopen:

- yes

### R8 — MEO Exploratory Governance / Planning

Class:

- Track C — Optional Expansion

Goal:

- prepare a bounded exploratory lane for `MEO`, without prematurely claiming a
  defendable implementation anchor

Why it matters:

- the original ITRI line mentions `LEO/MEO/GEO`, but the current public
  evidence base is weaker for `OneWeb`-related MEO expansion than for GEO

Status:

- not approved

Requires explicit reopen:

- yes

## Recommended Order

The default order after current work is:

1. finish `R1 = M8A`
2. open `R2 = read-only confirmed-points catalog`
3. optionally run `R3 / R4 / R5 / R6` in a controlled sequence
4. only then consider whether `R7` or `R8` should reopen

## Non-Goals Of This Roadmap

This roadmap does not authorize:

- direct code work by itself
- arbitrary endpoint pairing
- global endpoint selector UI
- third runtime endpoint participation
- second operator-pair implementation
- MEO runtime implementation
