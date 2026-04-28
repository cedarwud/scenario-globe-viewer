# M8A-VNext Planning Control Handoff

Source note: this is a handoff report for a new planning/control thread. It is
not an execution plan by itself and does not authorize new runtime
implementation. Use it to quickly recover the current state, then use the
canonical SDDs below to make phase decisions.

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
4. [m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md)
5. [multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md)
6. [multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md)
7. [../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md)

Supporting accepted data:

- [../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json](../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json)
- [../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md](../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md)
- [../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/r2-endpoint-evidence-catalog-2026-04-28.md](../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/r2-endpoint-evidence-catalog-2026-04-28.md)

## Current Implementation Baseline

The V4 ground-station line is no longer pre-runtime.

Completed:

- `M8A-V4.2` projection contract and projected artifact accepted
- `M8A-V4.3` runtime implementation completed
- `M8A-V4.4` homepage entry completed
- `M8A-V4.5` visual acceptance/regression completed
- `M8A-V4.6A` full LEO orbit replay completed at commit `6d7fd74`
- `M8A-V4.6B` orbit actor runtime consumption completed at commit `ddbd21c`
- `M8A-V4.6D` simulation handover model contract accepted at commit `b8dbad0`
- `M8A-V4.6D` simulation handover model runtime completed at commit `c4142b4`
- `M8A-V4.6E` handover visual language completed at commit `db85439`
- `M8A-V4.6C/R2` source/catalog boundary documented at commit `e5d99c7`
- `R2` root endpoint evidence catalog added at commit `d061c676`
- `R2` alternate endpoint B MEO no-change hunt documented at commit `c8e30b2e`
- previous visual refinements for orbit actor material, MEO/GEO color
  distinction, glow billboards, and model-centered glow alignment remain part of
  the baseline
- VNext roadmap SDD added

Current direct route:

- `/?scenePreset=regional&m8aV4GroundStationScene=1`

Current data path:

- runtime consumes repo-owned generated/projection data
- runtime must not side-read raw `itri` authority or candidate packages

Recent important commits:

- `e5d99c7 Document M8A V4.6C R2 catalog boundary`
- `db85439 Implement M8A V4.6E handover visual language`
- `c4142b4 Implement M8A V4.6D simulation handover model`
- `b8dbad0 Document M8A V4.6D handover model contract`
- `ddbd21c Implement M8A V4.6B orbit actor runtime consumption`
- `6d7fd74 Implement M8A V4.6A full LEO replay`
- `c8e30b2e Document R2 alternate endpoint MEO no-change hunt`
- `d061c676 Add V4.6C R2 endpoint evidence catalog`
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

- `6` OneWeb `LEO` display-context actors
- `5` O3b mPOWER `MEO` display-context actors
- `2` `GEO` display-context actors
- all are source-lineaged from CelesTrak NORAD GP TLE records

Approximate orbital periods from current TLE mean motion:

- OneWeb `LEO`: about `109-110` minutes
- O3b mPOWER `MEO`: about `288` minutes
- ST-2 `GEO`: about `24` hours

Current replay:

- covers at least one full current OneWeb `LEO` orbit period
- V4.6D runtime uses the normalized replay ratio as its deterministic window
  selector
- V4.6D runtime exposes five deterministic display-context windows:
  `leo-acquisition-context`, `leo-aging-pressure`, `meo-continuity-hold`,
  `leo-reentry-candidate`, and `geo-continuity-guard`

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
- V4.6E compact display-state surface is visible and bounded to the viewport
- V4.6E persistent badges are `simulation output`, `operator-family
  precision`, and `display-context actors`
- V4.6E timeline labels are `LEO acquire`, `LEO pressure`, `MEO hold`, `LEO
  re-entry`, and `GEO guard`
- V4.6E relation cues render at most representative plus candidate context
  ribbons; fallback context remains a low-opacity GEO guard cue except in the
  GEO guard state
- V4.6E actor labels follow the active-representative label policy with endpoint
  priority; candidate labels are hidden by default
- large legacy V4 HUD/floating panel remains hidden by default

## Current Planning Decision

The V4.6 runtime-bearing line is closed through `V4.6E`. The canonical roadmap
state is now:

1. `V4.6A` - full `LEO` orbit cycle replay complete
2. `V4.6B` - source-lineaged `LEO/MEO/GEO` actor enrichment complete
3. `V4.6C/R2` - endpoint expansion remains catalog/source-only
4. `V4.6D` - simulation handover model contract and runtime complete
5. `V4.6E` - handover visual language complete

Current phase status:

- `V4.6A`, `V4.6B`, `V4.6D`, and `V4.6E` are complete in the runtime baseline
- `V4.6C/R2` has source/catalog updates only; it does not create a runtime
  selector or accepted selectable scenario set
- no alternate endpoint B outside Speedcast Singapore is runtime-ready
- no runtime implementation prompt is currently unblocked

## Remaining Available Tracks

The only available next tracks are:

1. further primary-source hunt for new endpoint candidates only
2. `V5` decision gate only if new accepted endpoint-pair scenarios emerge
3. legacy aviation/YKA cleanup only if the cleanup/archive gate is explicitly
   opened

Do not create a runtime prompt unless a new accepted authority package and
viewer-owned projection unblock a runtime phase.

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

2026-04-28 closeout result:

- current accepted endpoint B remains Speedcast Singapore at
  `operator-family-only` precision
- the R2 catalog and no-change MEO source-hunt do not promote any alternate
  endpoint B
- blocked alternate endpoint B families remain catalog/source-hunt targets only

## Existing Documents Checked

Checked during this handoff pass:

- `docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md`
- `docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md`
- `docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md`
- `docs/sdd/multi-orbit-follow-on-roadmap.md`
- `docs/sdd/multi-orbit-program-skeleton.md`
- `../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/r2-endpoint-evidence-catalog-2026-04-28.md`

Closeout sync result:

- this handoff and the VNext roadmap now record that `V4.6A/B/D/E` are complete
- `V4.6C/R2` is recorded as catalog/source-only with no runtime-ready alternate
  endpoint B
- the follow-on roadmap now routes the next work to source hunt, V5 gate, or
  explicit legacy cleanup only
- `m8a-v4-ground-station-multi-orbit-handover-plan.md` remains valid as the V4
  baseline and should not be rewritten just to become a VNext roadmap

## Prompt For New Planning-Control Thread

```text
You are the planning/control thread for scenario-globe-viewer M8A-VNext.
Please answer in Traditional Chinese. Do not start runtime implementation unless
explicitly instructed.

First read:
- docs/sdd/m8a-vnext-planning-control-handoff.md
- docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md
- docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md
- docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md
- docs/data-contracts/m8a-v4-ground-station-projection.md
- docs/sdd/multi-orbit-follow-on-roadmap.md
- docs/sdd/multi-orbit-program-skeleton.md
- docs/decisions/0013-ground-station-multi-orbit-scope-reset.md

Current direction:
- Maintain the closed V4.6 source-grounded multi-orbit handover simulation
  baseline.
- Do not invent endpoints, satellites, measured metrics, gateway assignments,
  pair-specific paths, or real operator handover logs for presentation.
- Keep R2 read-only; it supports endpoint evidence expansion but is not a
  runtime selector.
- V4.6A, V4.6B, V4.6D, and V4.6E are complete in the current runtime baseline.
- V4.6C/R2 remains catalog/source-only; no alternate endpoint B is
  runtime-ready.
- Do not create a runtime prompt unless new accepted endpoint-pair scenarios
  emerge and a viewer-owned projection unblocks runtime use.

Return:
- Current understanding
- Accepted planning baseline
- Remaining blocked gates
- Recommended next source/planning track
- Blockers
- Runtime prompt only if implementation is truly unblocked
```
