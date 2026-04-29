# M8A-VNext Multi-Orbit Simulation Roadmap

Source note: this planning-control SDD began as the next multi-orbit line after
the completed `M8A-V4.5` ground-station scene. It now also records the
`V4.6A/B/D/E` closeout state. It does not authorize new runtime implementation
by itself. Execution remains phase-gated and must preserve the truth boundaries
below.

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
Related accepted V4.6D simulation handover model contract:
[./m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md).
Related V4.7 product UX SDD:
[./m8a-v4.7-handover-product-ux-plan.md](./m8a-v4.7-handover-product-ux-plan.md).
Related V4.7.1 product UX correction SDD:
[./m8a-v4.7.1-handover-product-ux-correction-plan.md](./m8a-v4.7.1-handover-product-ux-correction-plan.md).
Related V4.7.1 final handoff:
[./m8a-v4.7.1-handover-product-ux-final-handoff.md](./m8a-v4.7.1-handover-product-ux-final-handoff.md).
Related V4.8 handover demonstration UI IA SDD:
[./m8a-v4.8-handover-demonstration-ui-ia-plan.md](./m8a-v4.8-handover-demonstration-ui-ia-plan.md).
Related V4.8 Phase 1 final handoff:
[./m8a-v4.8-handover-demonstration-ui-ia-phase1-final-handoff.md](./m8a-v4.8-handover-demonstration-ui-ia-phase1-final-handoff.md).
Related V4.6C/R2 endpoint evidence catalog review:
[../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/r2-endpoint-evidence-catalog-2026-04-28.md](../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/r2-endpoint-evidence-catalog-2026-04-28.md).

## Status

- planning-control SDD
- doc-only continuation plan
- V4.6 closeout synchronized 2026-04-28
- V4.7 product UX SDD accepted 2026-04-28
- V4.7.1 product usability correction accepted and closed 2026-04-29
- V4.8 handover demonstration UI IA SDD accepted and Phase 1 runtime closed
  2026-04-29
- no runtime implementation authority by itself
- intended handoff surface for the next planning/control thread

## Product Direction

The line evolves the current `M8A-V4` scene into a
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
- `M8A-V4.6A` full LEO replay exists at commit `6d7fd74`
- `M8A-V4.6B` orbit actor runtime consumption exists at commit `ddbd21c`
- `M8A-V4.6D` simulation handover model contract exists at commit `b8dbad0`
- `M8A-V4.6D` simulation handover model runtime exists at commit `c4142b4`
- `M8A-V4.6E` handover visual language exists at commit `db85439`
- `M8A-V4.6E` floating HUD is hidden at commit `1f33697`
- `M8A-V4.7` product UX / playback / information architecture runtime
  implementation completed at commit `26781b8`
- `M8A-V4.7.1` product usability correction is accepted and closed at head
  `a48b0a6`; final runtime obstruction fix completed at commit `9604bde`
- `M8A-V4.8` handover demonstration UI IA SDD is accepted as doc-only
  planning authority; Phase 1 UI IA runtime seam completed at commit
  `8c846a4`
- remaining `M8A-V4.8` runtime phases are not open
- `M8A-V4.6C/R2` source/catalog boundary exists at commit `e5d99c7`
- the `R2` root endpoint evidence catalog exists at commit `d061c676`
- the `R2` alternate endpoint B MEO no-change hunt exists at commit `c8e30b2e`
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

- `6` source-lineaged OneWeb `LEO` display-context actors
- `5` source-lineaged O3b mPOWER `MEO` display-context actors
- `2` source-lineaged `GEO` display-context actors
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
- the large legacy V4 HUD is hidden by default after the visual cleanup
- V4.6E adds a compact display-state surface with persistent truth-boundary
  badges, five simulation-state timeline labels, role legend, and a non-claim
  disclosure
- commit `1f33697` hides the V4.6E floating HUD; the HUD root is retained only
  as a runtime/test seam and is not accepted visible product UX
- V4.6E limits relation cues to representative plus candidate context ribbons;
  fallback context uses a low-opacity GEO guard cue except in the GEO guard
  window
- V4.6E keeps actor labels sparse through the active-representative label
  policy with endpoint priority

Current replay baseline:

- runtime replay window covers at least one full current OneWeb `LEO` period
- current OneWeb `LEO` actors have orbital periods near `109-110` minutes
- current O3b mPOWER `MEO` actor has an orbital period near `288` minutes
- current ST-2 `GEO` actor has an orbital period near `24` hours
- V4.6D runtime uses the normalized replay ratio to select one of five
  deterministic simulation windows

Current endpoint expansion baseline:

- `V4.6C/R2` is catalog/source-hunt support only
- Speedcast Singapore remains the only accepted endpoint B for the current
  runtime pair
- no alternate endpoint B is runtime-ready
- no selectable scenario set is accepted

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

The original recommended development order was:

1. extend the replay to a full `LEO` orbit cycle
2. enrich the source-lineaged `LEO/MEO/GEO` actor set
3. expand endpoint candidates and accepted selectable scenarios
4. design the simulation handover model and visual language on top of the
   richer data

Closeout status:

- runtime-bearing steps `1`, `2`, and `4` are complete through `V4.6E`
- endpoint expansion step `3` remains catalog/source-only because no alternate
  endpoint B is runtime-ready
- `V4.7` product UX runtime implementation is complete for the accepted single
  scenario; no additional runtime phase is unblocked by this roadmap alone

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

- completed at commit `6d7fd74`

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
- runtime consumption of the enriched actor set exists at commit `ddbd21c`

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

- planning/source-hunt can proceed as follow-on source work
- runtime selectable scenarios remain blocked until accepted projections exist
- 2026-04-28 R2 catalog review updated the candidate matrix fields for source
  authority type, precision class, promotion readiness, missing evidence by
  orbit class, Taiwan/CHT precision compatibility, and explicit non-claims
- Speedcast Singapore remains the already accepted endpoint B for the current
  pair at `operator-family-only` precision; no alternate endpoint B is
  currently runtime-ready
- 2026-04-28 alternate endpoint B MEO no-change hunt did not change candidate
  status, precision class, runtime readiness, or promotion recommendation

## Phase V4.6D - Simulation Handover Model

Goal:

- turn the current simple ratio-based service-state sequence into a clearer
  source-grounded simulation model for possible multi-orbit handover behavior

Accepted contract:

- [m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md)
- model id: `m8a-v4.6d-simulation-handover-model.v1`
- contract surface: additive extension to
  [../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md)
- runtime implementation completed at commit `c4142b4`

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

- display representative orbit class
- `displayRepresentativeActorId`
- `candidateContextActorIds`
- `fallbackContextActorIds`
- handover pressure reason
- visible reason signals
- non-claims attached to the state

Forbidden role names:

- `servingSatelliteId`
- `activeServingSatelliteId`
- `activeGatewayId`
- `gatewayAssignmentId`
- `teleportPathId`

Accepted deterministic state windows:

1. `leo-acquisition-context`
2. `leo-aging-pressure`
3. `meo-continuity-hold`
4. `leo-reentry-candidate`
5. `geo-continuity-guard`

Acceptance criteria:

- model output is machine-readable
- windows cover the replay range with no gaps or overlaps
- actor ids referenced by the model exist in the V4.6B actor set
- actor orbit classes match model roles
- endpoint pair and precision remain unchanged
- metric outputs are bounded classes only and contain no numeric measured
  latency, jitter, throughput, or continuity values
- every state/window carries required non-claims
- forbidden-claim scan is explicit and machine-checkable
- visual labels clearly separate simulation state from source truth
- no active serving satellite or gateway claim is introduced
- smoke tests verify the state sequence and non-claim text

Implementation status:

- contract accepted at commit `b8dbad0`
- runtime implementation completed at commit `c4142b4`
- no further `V4.6D` runtime prompt is open in this closeout state

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

- completed at commit `db85439`
- compact display-state surface, sparse actor labels, role legend,
  representative/candidate context ribbons, low-opacity GEO guard cue, and
  non-claim disclosure are in the accepted runtime baseline
- follow-up cleanup `1f33697` hides the V4.6E floating HUD; the HUD root remains
  only as a runtime/test seam and is not accepted visible UX

## Phase V4.7 - Handover Product UX, Playback, And Information Architecture

Goal:

- define product-grade playback, information hierarchy, layout,
  non-obstruction, viewport, disclosure, and visual validation policy for the
  accepted Taiwan/CHT-Speedcast V4 scene

Planning home:

- [m8a-v4.7-handover-product-ux-plan.md](./m8a-v4.7-handover-product-ux-plan.md)

Scope:

- product UX
- playback speed policy
- loop, hold, pause, and restart semantics
- simulated time display semantics
- information architecture
- layout and non-obstruction policy
- desktop and narrow viewport behavior
- truth-boundary disclosure strategy
- visual validation criteria

Non-goals:

- `V5`
- `R2` runtime promotion
- endpoint expansion
- selector work
- model truth expansion
- new data source work

Key product UX decisions:

- `240x` is dev/debug only and must not be product default
- `60x` is the recommended product default
- `30x` is available for guided review
- `120x` is available for quick scan
- bottom HUD and top-left HUD are not accepted primary layouts
- a new floating HUD is not the default product solution
- a right-side review rail or reserved control column may be evaluated only if
  camera composition and non-obstruction validation pass
- narrow viewport defaults to a minimal status/control strip, with detail in a
  user-triggered drawer or sheet

Acceptance criteria:

- playback policy and end-hold behavior are deterministic
- time display is labeled as simulated replay time, not live/operator time
- desktop and narrow screenshots prove the primary scene is not obstructed
- persistent truth-boundary badges remain visible or inspectable
- forbidden-claim scan remains clean
- no raw `itri` side-read is introduced
- route, endpoint pair, precision, actor set, and V4.6D model truth remain
  unchanged

Implementation status:

- SDD accepted as doc-only product UX authority
- `V4.7` runtime implementation completed at commit `26781b8` after explicit
  opening
- `V4.7.1` product usability correction accepted and closed at head `a48b0a6`
- validation passed: `npm run test:m8a-v4.7.1`,
  `npm run test:m8a-v4.6d`, `npm run test:m8a-v4.6e`,
  `npm run test:m8a-v4.6a`, and `npm run test:m8a-v4.6b`
- no deviations from route, endpoint pair, precision, actor set, source
  boundary, or V4.6D model truth were reported

## Phase V5 Decision Gate

The line should remain `V4.6` while it is improving the accepted
Taiwan/CHT-Speedcast scenario and its immediate simulation presentation.

For this closeout, do not promote to `V5` for more presentation polish, model
label changes, or source catalog edits alone.

Promote to `V5` only if new accepted endpoint-pair scenarios emerge and the
viewer needs a scenario-selection/product-mode decision gate. Those scenarios
must have accepted authority packages and viewer-owned projections before any
runtime prompt is created.

## Recommended Next Step

No additional runtime execution phase is currently unblocked.

The current V4.7/V4.7.1 product UX track is implemented and closed:

`M8A-V4.7 product UX / playback / information architecture SDD`

`M8A-V4.7.1 product usability correction SDD and final handoff`

The current V4.8 Phase 1 UI IA runtime slice is implemented and closed:

`M8A-V4.8 handover demonstration UI IA Phase 1 final handoff`

The next available decisions are:

- keep further runtime work closed and continue source/candidate work
- open the next `V4.8` runtime slice only after an explicit user decision
- open a new decision gate only when new accepted scope exists

Other available tracks remain:

`Further primary-source hunt for new candidates only`

Reason:

- `V4.6A/B/D/E` are already complete in the runtime baseline
- `V4.6C/R2` did not promote any alternate endpoint B
- `V4.7/V4.7.1` is a product UX correction line for the accepted single
  scenario, not a runtime selector or source expansion
- `V4.8` is a demonstration UI IA line for the same accepted single scenario,
  not a runtime selector or source expansion; Phase 1 is closed, while scene
  evidence mapping, motion correction, layout/camera pass, and full visual
  acceptance remain separate unopened phases
- V5 is blocked until new accepted endpoint-pair scenarios exist
- legacy aviation/YKA cleanup is blocked until the user explicitly opens that
  cleanup/archive gate

## Files Likely To Change Later

Further primary-source hunt likely changes:

- `../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md`
- `../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/candidate-matrix.json`
- `../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/r2-endpoint-evidence-catalog-2026-04-28.md`

V5 gate work may later change, only after accepted endpoint-pair scenarios
exist:

- `../../../itri/multi-orbit/download/ground-station-endpoint-pairs/*`
- `docs/data-contracts/m8a-v4-ground-station-projection.md`
- viewer-owned projection artifacts under `public/fixtures/ground-station-projections/`
- runtime and smoke tests only after a new runtime prompt is genuinely unblocked

V4.7/V4.7.1 runtime correction is closed with these accepted surfaces:

- playback policy and controls
- product information architecture
- desktop/narrow layout and disclosure surfaces
- visual and playback smoke tests

Future V4.7/V4.7.1 corrections are closed from this record. Any new runtime
work needs a new explicit planning/control decision.

Remaining V4.8 runtime work, if later opened, may change only:

- frontend information architecture
- dynamic handover inspector content
- scene evidence mapping / annotation semantics
- orbit motion display policy
- layout simplification and validation for the accepted single scenario

Legacy aviation/YKA cleanup may later change old route, fixture, and regression
surfaces only if the cleanup/archive gate is explicitly opened.

## Runtime Prompt Policy

No additional runtime prompt is open from this closeout state.

Do not create an endpoint or selector runtime implementation prompt unless all
of the following are true:

- a new endpoint-pair scenario has an accepted authority package
- the accepted scenario has a viewer-owned projection artifact or generated
  module contract
- the user explicitly opens the corresponding runtime phase
- R2 remains read-only and no raw `itri` package is read at runtime

Do not create a future V4.7/V4.7.1 correction runtime prompt unless all of the
following are true:

- [m8a-v4.7-handover-product-ux-plan.md](./m8a-v4.7-handover-product-ux-plan.md)
  is accepted
- [m8a-v4.7.1-handover-product-ux-final-handoff.md](./m8a-v4.7.1-handover-product-ux-final-handoff.md)
  is read as the latest closeout state
- the user explicitly opens a new runtime implementation decision
- implementation scope is limited to playback policy, information architecture,
  layout, disclosure, and validation
- route, endpoint pair, precision, actor set, source boundary, and V4.6D model
  truth remain unchanged

Do not create a remaining V4.8 runtime implementation prompt unless all of the
following are true:

- [m8a-v4.8-handover-demonstration-ui-ia-plan.md](./m8a-v4.8-handover-demonstration-ui-ia-plan.md)
  is accepted
- [m8a-v4.8-handover-demonstration-ui-ia-phase1-final-handoff.md](./m8a-v4.8-handover-demonstration-ui-ia-phase1-final-handoff.md)
  is read as the latest Phase 1 closeout state
- the user explicitly opens the next V4.8 runtime phase
- implementation scope is limited to demonstration UI IA, dynamic inspector
  content, scene evidence mapping, orbit motion display correction, layout
  simplification, and validation upgrades
- route, endpoint pair, precision, actor set, source boundary, and V4.6D model
  truth remain unchanged
