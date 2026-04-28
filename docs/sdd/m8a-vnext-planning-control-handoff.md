# M8A-VNext Planning Control Handoff

Source note: this is a handoff report for a new planning/control thread. It is
not an execution plan by itself and does not authorize runtime implementation.
Use it to quickly recover the current state, then use the canonical SDDs below
to make phase decisions.

## Status

- handoff report
- doc-only
- current as of 2026-04-28
- intended reader: the next M8A-VNext planning/control thread

## Read Order For New Control Thread

Read these first:

1. [m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md)
2. [m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md)
3. [../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md)
4. [multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md)
5. [multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md)
6. [../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md)

Supporting accepted data:

- [../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json](../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json)
- [../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md](../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md)

## Current Implementation Baseline

The V4 ground-station line is no longer pre-runtime.

Completed:

- `M8A-V4.2` projection contract and projected artifact accepted
- `M8A-V4.3` runtime implementation completed
- `M8A-V4.4` homepage entry completed
- `M8A-V4.5` visual acceptance/regression completed
- subsequent visual refinements for orbit actor material, MEO/GEO color
  distinction, glow billboards, and model-centered glow alignment completed
- VNext roadmap SDD added

Current direct route:

- `/?scenePreset=regional&m8aV4GroundStationScene=1`

Current data path:

- runtime consumes repo-owned generated/projection data
- runtime must not side-read raw `itri` authority or candidate packages

Recent important commits:

- `12dc878 Add M8A VNext multi-orbit simulation roadmap`
- `3059f73 Center M8A V4 orbit glow markers on models`
- `f01bdb2 Use glow billboards for M8A V4 orbit markers`
- `3debcea Differentiate M8A V4 orbit point markers`

## Current Scenario Facts

Accepted endpoint pair:

- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- pair id: `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision: `operator-family` only for both endpoints

Current orbit actor set:

- `3` OneWeb `LEO` display-context actors
- `1` O3b mPOWER `MEO` display-context actor
- `1` ST-2 `GEO` continuity anchor
- all are source-lineaged from CelesTrak NORAD GP TLE records

Approximate orbital periods from current TLE mean motion:

- OneWeb `LEO`: about `109-110` minutes
- O3b mPOWER `MEO`: about `288` minutes
- ST-2 `GEO`: about `24` hours

Current replay:

- about `10` simulated minutes
- this is intentionally shorter than one full `LEO` orbit
- VNext recommends extending the replay first

## Legacy Aviation/YKA Retention

The old aviation/YKA endpoint line is not a VNext product path. It remains only
as historical/regression surface until a later cleanup branch proves it can be
removed or archived safely.

Current retention purpose:

- route bootstrap regression
- replay-clock and Cesium lifecycle regression
- telemetry/capture seam regression
- historical explanation for the V4 scope reset
- reusable technical patterns that VNext has not fully replaced yet

Do not use it for:

- VNext endpoint candidates
- homepage/product promotion
- source-grounded handover simulation scope
- evidence that aircraft/YKA should return to V4/VNext

Cleanup may be planned later only after:

- VNext has equal or better route/replay/telemetry/visual regression coverage
- old aviation/YKA routes have no homepage or product entry
- no VNext runtime or smoke test needs the old endpoint pair for shared viewer
  behavior
- historical documentation remains sufficient
- the user explicitly opens a legacy cleanup/archive task

## Truth Boundary

Highest-level rule:

> display may be projected, compressed, or visually abstracted; source data must
> remain traceable and must not be invented for presentation richness.

Allowed:

- viewer-owned render positions
- compressed orbit display heights
- camera framing and model-centered glow alignment
- simulation/model service-state behavior
- source-lineaged TLE/ephemeris display-context actors
- endpoint candidates supported by accepted evidence packages

Not allowed without new accepted evidence:

- active serving satellite claim
- active gateway assignment
- pair-specific teleport path claim
- measured latency, jitter, or throughput truth
- native RF handover claim
- site-level or same-site claim when only operator-family precision is accepted
- fake endpoint or satellite records added only for visual density

## Current Visual Decisions

Keep these unless a later visual-language phase explicitly changes them:

- globe camera is focused on the Taiwan/Singapore endpoint pair
- earth is framed low enough to leave upper sky for satellites
- orbit display heights are compressed for readability
- `LEO` actors keep the original generic satellite model material
- `LEO` actors have no extra point/glow marker
- `MEO` uses a distinct purple translucent glow billboard
- `GEO` uses a distinct gold translucent glow billboard
- MEO/GEO glow billboards are offset toward the visible model center
- endpoint ground markers keep their own white/green endpoint colors
- large V4 HUD/floating panel is hidden by default

## Current Planning Decision

The next planning direction is not merely a handoff. The canonical roadmap is
now:

1. `V4.6A` - extend replay to a full `LEO` orbit cycle
2. `V4.6B` - enrich source-lineaged `LEO/MEO/GEO` actors
3. `V4.6C` - expand endpoint candidates and accepted selectable scenarios
4. `V4.6D` - design the simulation handover model
5. `V4.6E` - redesign handover visual language as needed

The recommended next execution phase is:

- `V4.6A Full LEO Orbit Replay`

Reason:

- it is already unblocked by existing source-lineaged actor data
- it does not require new endpoint authority
- it does not require new actors
- it improves the simulator behavior before adding more scene density

## Parallel Planning Work

These may proceed in parallel as planning/source work, but should not block
`V4.6A`:

- `R2` endpoint evidence/catalog expansion
- Endpoint B and alternate endpoint-pair source hunts
- additional source-lineaged `LEO/MEO/GEO` actor source/projection planning
- simulation handover model requirements
- handover visual-language concepts

## R2 Clarification

`R2` is endpoint expansion support, but only as a read-only evidence/catalog
surface.

`R2` may:

- gather endpoint candidates
- classify `LEO/MEO/GEO` evidence
- mark operator-family, site-family, site-level, or same-site precision
- compare precision compatibility with Taiwan/CHT
- recommend candidates for authority-package promotion

`R2` must not:

- become a runtime endpoint selector
- directly feed runtime choices
- promote candidates without accepted evidence
- bypass endpoint-pair authority packages

Runtime selectable scenarios, if later built, must consume accepted
viewer-owned projections only.

## Existing Documents Checked

Checked during this handoff pass:

- `docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md`
- `docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md`
- `docs/sdd/multi-orbit-follow-on-roadmap.md`
- `docs/sdd/multi-orbit-program-skeleton.md`

Required sync found:

- `multi-orbit-program-skeleton.md` needed a current V4.5/VNext status update
  because it still emphasized the old pre-runtime V4 gate.
- `m8a-vnext-multi-orbit-simulation-roadmap.md` needed a link to this handoff.
- `multi-orbit-follow-on-roadmap.md` already has the VNext entry and does not
  need a structural rewrite in this pass.
- `m8a-v4-ground-station-multi-orbit-handover-plan.md` remains valid as the V4
  baseline and should not be rewritten just to become a VNext roadmap.

## Prompt For New Planning-Control Thread

```text
You are the planning/control thread for scenario-globe-viewer M8A-VNext.
Please answer in Traditional Chinese. Do not start runtime implementation unless
explicitly instructed.

First read:
- docs/sdd/m8a-vnext-planning-control-handoff.md
- docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md
- docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md
- docs/data-contracts/m8a-v4-ground-station-projection.md
- docs/sdd/multi-orbit-follow-on-roadmap.md
- docs/sdd/multi-orbit-program-skeleton.md
- docs/decisions/0013-ground-station-multi-orbit-scope-reset.md

Current direction:
- Build a source-grounded multi-orbit handover simulation.
- Do not invent endpoints, satellites, measured metrics, gateway assignments,
  pair-specific paths, or real operator handover logs for presentation.
- Keep R2 read-only; it supports endpoint evidence expansion but is not a
  runtime selector.
- Current recommended execution phase is V4.6A Full LEO Orbit Replay.

Return:
- Current understanding
- Accepted planning baseline
- Whether V4.6A is ready to open
- Parallel planning/source tracks
- Blockers
- Execution prompt only if implementation is truly unblocked
```
