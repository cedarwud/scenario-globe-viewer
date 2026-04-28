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
Related V4 scope reset: see
[../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md).

## Status

- planning-only roadmap
- no implementation authority by itself
- continuation map after the current `M8A` line

## Purpose

This file answers one question:

After the current approved work lands, what follow-on tracks are already known,
how important are they to the customer-side line, and what must be true before each one
opens?

## Track Classes

### Track A — Customer-Direct

These tracks directly strengthen the viewer's ability to satisfy the original
customer-side multi-orbit simulation / explanation line.

### Track B — Customer-Supporting

These tracks are not the core handover scene by themselves, but they materially
improve explainability, traceability, and safe reuse of confirmed assets.

### Track C — Optional Expansion

These tracks are real possibilities, but they should not open automatically
after the current line. They need explicit reopen authority.

## Planned Tracks

2026-04-25 routing note:

- `V4` is the current corrected product lane for the next homepage demo.
- `R2` remains useful, but it is still read-only and must not be treated as the
  V4 endpoint selector.
- The older `R1`/`R1V` sections remain for historical continuity and reusable
  technical foundation.

2026-04-28 closeout note:

- `V4.6A`, `V4.6B`, `V4.6D`, and `V4.6E` are complete in the current
  scenario-globe-viewer runtime baseline.
- `V4.7` product UX / playback / information architecture SDD is accepted as
  doc-only authority for the existing accepted V4 scene; runtime implementation
  completed after explicit opening, with commit hash pending at documentation
  time.
- `V4.6C/R2` remains catalog/source-only; no alternate endpoint B is
  runtime-ready.
- The next available tracks are primary-source hunt for new candidates, a `V5`
  decision gate only if new accepted endpoint-pair scenarios emerge, or legacy
  aviation/YKA cleanup only if explicitly opened.
- No runtime prompt is currently unblocked.

### R1 — Complete `M8A`

Class:

- Track A — Customer-Direct

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

- Track A — Customer-Direct

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

- read-only catalog/source surface exists
- no runtime selector
- no runtime promotion

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

- Track B — Customer-Supporting

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

### V4 — Ground-Station Multi-Orbit Handover Scene

Class:

- Track A — Customer-Direct

Goal:

- correct the next homepage demo away from the aviation/YKA narrative and
  toward a two-ground-station or ground-infrastructure endpoint pair
- require an endpoint-pair authority gate before runtime implementation
- support `LEO/MEO/GEO` only where evidence is accepted
- preserve V3.5 source-lineaged actor rendering as a technical foundation

Primary planning home:

- [m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md)

Supporting evidence:

- [../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md](../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md)
- [../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/candidate-matrix.json](../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/candidate-matrix.json)

Why it matters:

- stakeholder clarification showed the desired scene is not aircraft + YKA
- Taiwan/CHT currently has the strongest near-Taiwan `LEO/MEO/GEO` evidence
- no second country/site is accepted yet as full three-orbit endpoint truth
- this track prevents future agents from hardcoding a weak endpoint pair just
  because previous rendering infrastructure exists

Status:

- planning-only
- current corrected product lane

Open only when:

- ADR 0013 remains accepted
- endpoint-pair evidence is handled through the V4 authority gate
- no aircraft endpoint, YKA endpoint, ordinary handset `UE`, or arbitrary
  endpoint selector is introduced
- `R2` remains read-only

Blocked before implementation until:

- a V4 endpoint-pair authority package exists
- endpoint A/B coordinate precision and role are accepted
- the `LEO/MEO/GEO` evidence matrix is accepted
- fallback mode, if weaker than strict three-orbit acceptance, has explicit
  user approval

### VNext - Source-Grounded Multi-Orbit Simulation Roadmap

Class:

- Track A - Customer-Direct

Goal:

- continue from the completed `M8A-V4.5` ground-station scene into the richer
  source-grounded multi-orbit handover simulation now closed through
  `V4.6A/B/D/E`
- preserve source truth while allowing viewer-owned display projection,
  compressed orbit heights, and simulated service-state behavior
- keep the remaining decision gates explicit after replay, actor enrichment,
  handover model runtime, and visual-language runtime work have landed

Primary planning home:

- [m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md)
- [m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md)

Why it matters:

- `M8A-V4.6E` is now the accepted customer-visible simulation baseline
- the line still needs strict gates before adding endpoint candidates or
  selectable scenario semantics
- the roadmap keeps `R2` as read-only evidence support and prevents endpoint or
  satellite data from becoming pure presentation fiction

Status:

- planning-control SDD and closeout handoff
- `V4.6A/B/D/E` complete in runtime baseline
- `V4.7` product UX runtime complete in current change set
- `V4.6C/R2` catalog/source-only; no alternate endpoint B runtime-ready
- no additional runtime execution phase currently unblocked

Open only when:

- the work remains source-grounded simulation, not a claim of real operator
  handover events
- `R2` remains read-only and does not become a runtime selector
- new endpoint candidates and orbit actors are promoted through accepted
  source/projection gates before runtime use
- no aircraft, YKA, or handset endpoint is reintroduced
- old aviation/YKA surfaces remain historical/regression-only until a separate
  cleanup branch proves they can be removed or archived safely

Next available tracks:

- further primary-source hunt for new endpoint candidates only
- `V5` decision gate only if new accepted endpoint-pair scenarios emerge
- legacy aviation/YKA cleanup only if the cleanup/archive gate is explicitly
  opened

### R3 — Accepted Endpoint / Site Package Expansion

Class:

- Track B — Customer-Supporting

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

- Track B — Customer-Supporting

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

- Track B — Customer-Supporting

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

- Track B — Customer-Supporting

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

- the original customer-side line mentions `LEO/MEO/GEO`, but the current public
  evidence base is weaker for `OneWeb`-related MEO expansion than for GEO

Status:

- not approved

Requires explicit reopen:

- yes

## Recommended Order

The default order after the 2026-04-28 V4.6 closeout is:

1. continue primary-source hunt only for candidates that could become accepted
   endpoint-pair scenarios
2. open a `V5` decision gate only after new accepted endpoint-pair scenarios
   exist
3. keep legacy aviation/YKA cleanup closed unless the user explicitly opens the
   cleanup/archive gate
4. keep `R3 / R4 / R5 / R6` as supporting governance/catalog work only, without
   granting runtime selection authority

## Non-Goals Of This Roadmap

This roadmap does not authorize:

- direct code work by itself
- arbitrary endpoint pairing
- global endpoint selector UI
- third runtime endpoint participation
- second operator-pair implementation
- MEO runtime implementation
