# M8A-VNext Multi-Orbit Simulation Roadmap

Source note: this is a planning-control SDD for the next multi-orbit line after
the completed `M8A-V4.5` ground-station scene. It does not authorize runtime
implementation by itself. Execution remains phase-gated and must preserve the
truth boundaries below.

Related V4 SDD:
[./m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md).
Related V4 projection contract:
[../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md).
Related follow-on roadmap:
[./multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md).
Related scope reset:
[../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md).
Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).
Related V4.6B source/projection record:
[./m8a-v4.6b-source-lineaged-orbit-actor-projection.md](./m8a-v4.6b-source-lineaged-orbit-actor-projection.md).

## Status

- planning-control SDD
- doc-only continuation plan
- no runtime implementation authority by itself
- intended handoff surface for the next planning/control thread

## Product Direction

The next line should evolve the current `M8A-V4` scene into a
source-grounded multi-orbit handover simulation. The viewer should make a
defensible scenario feel richer and more complete without fabricating the
underlying endpoints, orbit actors, or operational handover facts.

The core rule is:

> display may be projected, compressed, or visually abstracted; source data must
> remain traceable and must not be invented for presentation richness.

This means:

- public/source-lineaged data should drive endpoint candidates and orbit actors
- render positions, camera framing, height compression, glow markers, labels,
  and line styling may be viewer-owned display projections
- service-state and handover behavior may be simulation/model output, but must
  not be described as a real operator handover log
- the viewer may show plausible handover behavior and decision pressure, but it
  must not claim active serving satellite, active gateway, pair-specific
  teleport path, measured performance, or native RF handover truth

## Current Baseline

Completed baseline:

- `M8A-V4.3` runtime consumes a repo-owned projection/module
- `M8A-V4.4` homepage entry exists
- `M8A-V4.5` visual acceptance/regression exists
- the direct V4 route is `/?scenePreset=regional&m8aV4GroundStationScene=1`
- the homepage entry opens that route and the old aviation/YKA demo remains
  historical/regression-only

Accepted endpoint pair:

- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- accepted pair precision: `operator-family` only
- no site-family, site-level, same-site, active gateway, active satellite,
  pair-specific path, measured metric, or native RF handover truth is accepted

Current orbit actors:

- `3` source-lineaged OneWeb `LEO` display-context actors
- `1` source-lineaged O3b mPOWER `MEO` display-context actor
- `1` source-lineaged ST-2 `GEO` continuity anchor
- actors are based on CelesTrak NORAD GP TLE lineage
- actors are display context only; they are not active serving satellites

Current visual baseline:

- globe camera is focused on the accepted Taiwan/Singapore endpoint pair
- orbit display heights are compressed for readability
- `LEO` actors use the original generic satellite model without extra point
  markers
- `MEO` and `GEO` actors use distinct translucent glow billboards aligned toward
  the visible model center
- endpoint markers retain their own ground/infrastructure colors
- the V4 HUD is hidden by default after the visual cleanup

Current replay baseline:

- runtime replay window is approximately `10` simulated minutes
- current OneWeb `LEO` actors have orbital periods near `109-110` minutes
- current O3b mPOWER `MEO` actor has an orbital period near `288` minutes
- current ST-2 `GEO` actor has an orbital period near `24` hours

## Legacy Aviation/YKA Retention And Cleanup Gate

The old aviation/YKA line is not a VNext product path. It is retained only as a
historical/regression surface while it still protects shared viewer behavior.

Short-term retention purpose:

- preserve regression coverage for route bootstrap and addressed-scene loading
- preserve replay-clock and Cesium lifecycle regression coverage
- preserve telemetry/capture seam regression coverage
- preserve historical context for why V4/VNext superseded the aviation/YKA
  product narrative
- preserve reusable technical patterns until VNext has equal or better coverage

It must not:

- appear as a recommended homepage/product entry for VNext
- be used as a VNext endpoint candidate
- reintroduce aircraft, YKA, or handset endpoints into the ground-station scope
- be used to justify handover claims in the source-grounded simulation line

Cleanup branch may open when all conditions are true:

- VNext has route bootstrap, replay, telemetry, and visual smoke coverage that
  no longer depends on the aviation/YKA endpoint pair
- the old route has no homepage or product entry
- shared helper code has either been reused by VNext or isolated from old
  endpoint semantics
- historical documentation remains sufficient to explain why the old line was
  superseded
- the user explicitly opens a legacy cleanup/archive task

Possible cleanup outcomes:

- delete unused old route/controller/fixture/test surfaces
- archive historical docs and fixtures outside active product paths
- keep narrow regression tests only if they protect shared viewer behavior
- leave untouched any historical docs needed for provenance

## Non-Negotiable Guardrails

The following remain hard constraints for all VNext phases:

- no aircraft endpoint in the VNext/V4 ground-station scope
- no YKA endpoint in the VNext/V4 ground-station scope
- no ordinary handset `UE` endpoint
- `V3.5` is technical foundation only, not product-scope authority
- `R2` remains read-only and must not become a runtime selector
- runtime must not side-read raw `itri` authority or candidate packages
- runtime may consume only repo-owned projected artifacts or generated modules
- endpoint A/B precision must be compared at the same precision class
- new endpoint candidates require evidence grading before runtime promotion
- new accepted endpoint pairs require an authority package before runtime use
- new orbit actors require source-lineaged TLE, ephemeris, or equivalent
  projection input before runtime use
- display-context actors must not be treated as active serving satellites
- service-state simulation must not be presented as a real operator handover log
- no measured latency, jitter, throughput, gateway assignment, pair-specific
  path, or native RF handover claim may appear without a new accepted evidence
  source that explicitly supports it

## Development Spine

The recommended development order is:

1. extend the replay to a full `LEO` orbit cycle
2. enrich the source-lineaged `LEO/MEO/GEO` actor set
3. expand endpoint candidates and accepted selectable scenarios
4. design the simulation handover model and visual language on top of the
   richer data

This order keeps the early work low-risk. It improves the demo without first
requiring new endpoint authority or new operational handover evidence.

## Phase V4.6A - Full LEO Orbit Replay

Goal:

- make the current accepted V4 scene run across at least one full `LEO` orbital
  period instead of a short `10` minute sample

Why this should be first:

- it does not require new endpoints
- it does not require new satellite actors
- it does not change endpoint precision
- it improves the simulator feel while preserving the existing source lineage
- the current `LEO` actors already have TLE-derived periods near `109-110`
  minutes

Required changes:

- update the V4 replay range to cover at least the longest current OneWeb
  `LEO` actor period, with a small margin
- use a playback multiplier that keeps the demo usable in browser review
- keep the service-state timeline ratio-driven unless a later phase replaces it
- keep `MEO` and `GEO` as slower moving context/fallback layers

Acceptance criteria:

- replay range is at least one full current `LEO` orbit period
- smoke test verifies the replay range and multiplier
- the existing endpoint pair remains unchanged
- orbit actor count remains unchanged in this phase
- forbidden-claim scan remains clean
- desktop and narrow screenshots remain visually legible
- no raw `itri` side-read is introduced

Implementation status:

- unblocked for execution after this SDD is accepted

## Phase V4.6B - Source-Lineaged Orbit Actor Enrichment

Goal:

- add more real-source `LEO`, `MEO`, and `GEO` display-context actors so the
  scene feels like a multi-orbit environment rather than a minimal proof

Required source rule:

- every new actor must have source-lineaged TLE, ephemeris, or equivalent
  projection input
- no actor may be added only because the scene needs more visual density
- runtime must consume repo-owned projection/module output, not live external
  sources

Recommended actor target:

- more `LEO` actors than the current three, enough to show constellation motion
- more than one `MEO` actor if source-lineaged O3b mPOWER/O3b records are
  available and accepted
- at least one additional `GEO` continuity/context actor if source lineage is
  accepted

Visual requirements:

- not every actor should have a visible label
- primary/candidate/fallback actors may have labels
- context actors should usually render as low-noise models or glow markers
- line connections should remain limited to the simulated service state, not all
  visible actors

Acceptance criteria:

- projected artifact or generated module records every new actor's source
  lineage
- actor counts are validated by smoke tests
- no new actor is treated as active serving satellite truth
- label density remains controlled on desktop and narrow viewports
- screenshots show a richer scene without obscuring the endpoint pair

Implementation status:

- source/projection gate accepted for a richer actor set in
  [m8a-v4.6b-source-lineaged-orbit-actor-projection.md](./m8a-v4.6b-source-lineaged-orbit-actor-projection.md)
- runtime rendering remains not implemented for the enriched actor set until a
  later execution phase updates the repo-owned generated module and runtime
  tests

## Phase V4.6C - Endpoint Expansion And Selectable Scenarios

Goal:

- expand beyond the current Taiwan/CHT + Speedcast Singapore pair into a set of
  evidence-backed endpoint candidates and, later, accepted selectable scenario
  pairs

Relationship to `R2`:

- `R2` is the read-only endpoint/candidate evidence catalog
- `R2` may support endpoint expansion research and comparison
- `R2` must not become a runtime endpoint selector
- runtime selection may only use accepted viewer-owned projections generated
  after promotion from the evidence catalog

Required source rule:

- endpoint candidates need official, operator, regulator, teleport
  certification, satellite operator, or equivalent primary sources for
  promotion evidence
- supporting news or secondary summaries may provide context but cannot promote
  a candidate by themselves

Candidate evaluation must record:

- `LEO`, `MEO`, and `GEO` evidence class
- precision class: operator-family, site-family, site-level, or same-site
- compatibility with Taiwan/CHT at the same precision class
- missing evidence by orbit class
- explicit non-claims

Recommended endpoint expansion path:

1. use `R2`/evidence work to expand candidate pool
2. select one candidate pair for authority-package promotion
3. create or update an endpoint-pair authority package
4. create a viewer-owned projection artifact for the accepted pair
5. only then expose a runtime scenario choice

Acceptance criteria:

- no candidate appears in runtime as an endpoint before promotion
- accepted pairs have authority packages
- runtime scenario choices read accepted projections only
- the UI labels precision class clearly
- site-level/same-site truth is never implied unless accepted for both
  endpoints

Implementation status:

- planning/source-hunt can proceed in parallel with V4.6A
- runtime selectable scenarios remain blocked until accepted projections exist

## Phase V4.6D - Simulation Handover Model

Goal:

- turn the current simple ratio-based service-state sequence into a clearer
  source-grounded simulation model for possible multi-orbit handover behavior

Simulation scope:

- this phase models plausible service-state decisions using accepted endpoint
  and actor context
- it does not claim real operator handover events
- it should remain explicit that the model is simulation output

Model inputs may include:

- current replay time
- visible actor geometry
- orbit class
- endpoint pair scenario
- candidate/fallback policy
- bounded metric classes such as latency class, continuity class, jitter class,
  and network-speed class

Model outputs should include:

- current primary orbit class
- current highlighted actor or actor group, if any
- next candidate orbit class
- fallback orbit class
- handover pressure reason
- visible reason signals
- non-claims attached to the state

Acceptance criteria:

- model output is machine-readable
- visual labels clearly separate simulation state from source truth
- no active serving satellite or gateway claim is introduced
- smoke tests verify the state sequence and non-claim text

Implementation status:

- should start after V4.6A
- can start before V4.6B only if it remains compatible with later actor
  enrichment

## Phase V4.6E - Handover Visual Language

Goal:

- redesign how simulated handover information appears in the scene so the richer
  actor and endpoint data remains readable

Visual questions to decide:

- should the scene show a timeline, legend, compact HUD, or route ribbon
- which actor labels are always visible, conditional, or hidden
- how primary/candidate/fallback roles map to line weight, color, glow, or
  motion
- how to show non-claims without reintroducing a large blocking floating panel
- how to distinguish endpoint precision from orbit actor display context

Acceptance criteria:

- desktop and narrow screenshots remain legible
- labels do not overlap in the primary camera view
- endpoint markers remain distinct from orbit actor markers
- the scene communicates simulated handover state without claiming operational
  truth

Implementation status:

- should follow at least V4.6A
- should be revisited after V4.6B if actor density increases substantially

## Phase V5 Decision Gate

The line should remain `V4.6` while it is improving the accepted
Taiwan/CHT-Speedcast scenario and its immediate simulation presentation.

Promote to `V5` only if at least one of the following becomes true:

- multiple accepted endpoint-pair scenarios become runtime selectable
- the handover simulation model becomes a reusable subsystem rather than a
  single-scene state sequence
- actor enrichment requires a broader data contract than the current V4
  projection can safely cover
- the visual language changes enough that the scene becomes a new product mode
  instead of a V4 continuation

## Recommended Next Step

The recommended next execution phase is:

`V4.6A Full LEO Orbit Replay`

Reason:

- it is already unblocked by existing source-lineaged actor data
- it makes the demo more complete
- it does not require new endpoint or actor authority
- it is a small, testable runtime change

Endpoint expansion and actor enrichment should start as planning/source work in
parallel, but should not block V4.6A.

## Files Likely To Change Later

V4.6A likely changes:

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `tests/smoke/verify-m8a-v4.5-visual-acceptance-regression-runtime.mjs` or a
  new `V4.6A` smoke test
- `package.json` if a new test script is added

V4.6B likely changes:

- `public/fixtures/ground-station-projections/*.json`
- `src/runtime/m8a-v4-ground-station-projection.ts` only in a later runtime
  consumption phase, not in the source/projection-only pass
- actor projection or validation scripts if introduced
- visual smoke tests

V4.6C likely changes:

- `itri/multi-orbit/download/ground-station-endpoint-candidates/*`
- `itri/multi-orbit/download/ground-station-endpoint-pairs/*`
- `docs/data-contracts/m8a-v4-ground-station-projection.md` if selectable
  projections need a contract extension
- viewer-owned projection artifacts after authority acceptance

V4.6D/E likely changes:

- `docs/data-contracts/m8a-v4-ground-station-projection.md`
- `src/runtime/m8a-v4-ground-station-projection.ts`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- smoke and visual acceptance tests

## Execution Prompt - V4.6A

Use this prompt only after the planning-control thread accepts this SDD and
explicitly opens V4.6A:

```text
Read the canonical SDD first and implement only V4.6A Full LEO Orbit Replay.

Canonical SDD:
- docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md

Supporting docs:
- docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md
- docs/data-contracts/m8a-v4-ground-station-projection.md

Scope:
- Extend the M8A-V4 replay window to cover at least one complete current
  OneWeb LEO orbital period.
- Choose a playback multiplier that keeps browser review practical.
- Keep the accepted endpoint pair unchanged.
- Do not add actors.
- Do not add endpoints.
- Do not change source truth or precision class.
- Preserve no-active-satellite/gateway/path/metrics/native-RF-handover
  non-claims.

Validation:
- run build
- run or add a focused V4.6A smoke test verifying replay range, multiplier,
  actor counts, endpoint counts, and forbidden-claim scan
- run V4.5 visual regression if the camera or visual timing changes

Return:
- changed files
- what was implemented
- validation results
- deviations from SDD
- remaining work
```

## Execution Prompt - V4.6B Source/Projection

Use this prompt only after a planning-control thread decides which source
families to add:

```text
Do not change runtime rendering yet.

Read:
- docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md
- docs/data-contracts/m8a-v4-ground-station-projection.md

Goal:
- Produce accepted source-lineaged projection records for additional LEO/MEO/GEO
  display-context actors.

Rules:
- no synthetic actor records
- no live runtime source reads
- every actor needs source lineage, source epoch, projection epoch, source
  position, render position, truth boundary, and non-claims
- actors remain display-context and not active serving satellites

Return:
- source families reviewed
- actor records added or rejected
- files changed
- validation results
- runtime implementation prompt only if projection is accepted
```

## Execution Prompt - Endpoint Expansion / R2

Use this prompt for source-hunt planning, not runtime:

```text
Do not write runtime code.

Read:
- docs/sdd/m8a-vnext-multi-orbit-simulation-roadmap.md
- docs/sdd/multi-orbit-follow-on-roadmap.md
- docs/sdd/m8a-read-only-catalog-follow-on-plan.md

Goal:
- Expand the read-only endpoint evidence catalog and identify which candidates
  could be promoted toward accepted endpoint-pair authority packages.

Rules:
- R2 remains read-only
- no runtime selector
- promotion evidence must be official/operator/regulator/teleport
  certification/satellite-operator source
- label operator-family, site-family, site-level, and same-site precision
  separately
- compare every candidate against Taiwan/CHT at compatible precision

Return:
- candidates reviewed
- missing evidence by orbit class
- precision compatibility
- promotion recommendation
- files to update
- exact user decision needed before authority-package creation
```
