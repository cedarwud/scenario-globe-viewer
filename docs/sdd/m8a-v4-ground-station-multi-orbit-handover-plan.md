# M8A-V4 Ground-Station Multi-Orbit Handover Plan

Source note: this file is a planning-only SDD for the corrected next viewer
scene. It does not authorize code changes by itself. It replaces the
aviation/YKA product narrative for the next homepage demo with a
ground-station-centered endpoint pair, while reusing the V3.5 rendering
infrastructure where appropriate.

Related decision:
[../decisions/0013-ground-station-multi-orbit-scope-reset.md](../decisions/0013-ground-station-multi-orbit-scope-reset.md).
Related evidence package:
[../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md](../../../itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/README.md).
Related endpoint-pair template:
[../../../itri/multi-orbit/prep/v4-ground-station-endpoint-pair-authority-package-template.md](../../../itri/multi-orbit/prep/v4-ground-station-endpoint-pair-authority-package-template.md).
Related accepted endpoint-pair package:
[../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md](../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md).
Related accepted V4.2 projection contract:
[../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md).
Related accepted V4.2 projected artifact:
[../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json](../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json).
Related VNext continuation roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related VNext planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).
Related technical foundation:
[./m8a-v3.5-source-lineaged-orbit-actor-recovery-plan.md](./m8a-v3.5-source-lineaged-orbit-actor-recovery-plan.md).

## Status

- planning-only SDD
- no implementation authority by itself
- supersedes the `M8A` aviation/YKA product narrative for the next homepage
  demo
- preserves completed `M8A` and `M8A-V3.5` work as historical and technical
  foundation

## Product Goal

The next viewer scene should show a defensible ground-station-centered
multi-orbit communication scenario:

- two ground-station or ground-infrastructure endpoints
- preferably in two countries near Taiwan
- no aircraft endpoint
- no ordinary handset `UE`
- source-backed endpoint identities and coordinate precision
- source-lineaged `LEO`, `MEO`, and `GEO` satellite/context actors where
  evidence supports them
- continuous handover pressure from moving satellites rather than a one-shot
  switch
- visible truth boundaries between real evidence and modeled service decision

The desired user read is:

> two real ground infrastructure endpoints are communicating through a
> multi-orbit satellite service context; moving non-GEO satellites create
> continuing handover pressure, and the scene shows how service continuity can
> shift across `LEO`, `MEO`, and `GEO` layers without claiming unproven
> measured operational truth.

## Corrected Scope

### In Scope

- endpoint-pair authority gate for ground-station candidates
- Taiwan / Chunghwa Telecom as the current strongest primary endpoint
  candidate
- second-country endpoint selection from a documented candidate package
- `LEO/MEO/GEO` evidence grading before runtime promotion
- reuse of V3.5 source-lineaged satellite actor architecture
- multi-satellite context, especially multiple moving `LEO` actors
- `MEO` actors only when source-lineaged orbit data and evidence are present
- `GEO` continuity actor or anchor
- continuous handover presentation state model
- homepage/direct-demo planning after endpoint authority is accepted
- browser/screenshot acceptance criteria for the later implementation

### Out Of Scope

- continuing the aircraft/YKA narrative as the main V4 demo
- using YKA as endpoint A or endpoint B for the V4 ground-station pair
- ordinary handset `UE` as endpoint
- aircraft endpoint
- arbitrary endpoint selector UI
- turning `R2` into a runtime selector
- exact active serving satellite truth unless separately proven
- exact active gateway assignment
- pair-specific teleport path truth
- native RF handover across unrelated constellations
- measured latency/jitter/throughput truth
- fake satellite actors, random orbital motion, or demo synthetic proxy loops

## Evidence Baseline

The 2026-04-25 evidence snapshot is now historical baseline context. It graded
candidates as follows before the 2026-04-26 endpoint-pair authority package:

| Candidate | Region | `LEO` | `MEO` | `GEO` | V4 status |
| --- | --- | --- | --- | --- | --- |
| Chunghwa Telecom multi-orbit ground infrastructure | Taiwan | strong | strong | strong | preferred primary endpoint |
| CHT Yangmingshan / Taipei / Fang-Shan earth-station family | Taiwan | partial | partial | strong | site-family candidate |
| NT Sirindhorn OneWeb SNP Gateway | Thailand | strong | gap | partial | second-country candidate, not three-orbit accepted |
| Singtel Bukit Timah Satellite Earth Station | Singapore | partial | gap | strong | second-country candidate, not three-orbit accepted |
| Speedcast Singapore Teleport | Singapore | partial | partial | strong | promising second-country candidate |
| Japan KDDI/SoftBank service family | Japan | strong | gap | strong | LEO/GEO country-family candidate |
| Korea KT SAT/OneWeb service family | South Korea | partial | gap | strong | LEO/GEO country-family candidate |

The 2026-04-25 historical planning conclusion was:

- Taiwan/CHT is the only near-Taiwan candidate with strong public evidence
  across all three orbit classes.
- No second country/site had been accepted yet as a full `LEO/MEO/GEO`
  ground-station endpoint.
- Therefore, implementation must not start by hardcoding a second endpoint.
  The second endpoint must pass an authority package first.

The accepted 2026-04-26 baseline supersedes that historical conclusion for the
current V4 path:

- the first accepted endpoint-pair authority package is
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- endpoint A is Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B is Singapore / Speedcast Singapore Teleport
- both endpoints are accepted only at operator-family precision
- both endpoint families have accepted `LEO/MEO/GEO` evidence at
  operator-family precision
- this is not the weaker `LEO/GEO` fallback mode
- no site-family, site-level, same-site, active-gateway, active-satellite,
  pair-specific teleport-path, measured-performance, or native RF handover
  truth is accepted
- V4.2 has accepted the viewer-owned projection contract and the concrete
  projected artifact at
  `public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json`
- V4.3 runtime must consume only projected viewer-owned data and must not
  side-read the raw `itri` authority package

## Endpoint-Pair Authority Gate

Before any V4 runtime implementation, create an accepted endpoint-pair package
under the `itri/multi-orbit` authority surface, for example:

`itri/multi-orbit/download/ground-station-endpoint-pairs/<pair-id>/`

The package must include at least:

- `authority-package.md`
- `endpoint-a.json`
- `endpoint-b.json`
- `orbit-evidence-matrix.json`
- `position-and-precision.md`
- `non-claims.md`
- `acceptance.md`

### Required Fields

Each endpoint record must include:

- `endpointId`
- `endpointLabel`
- `countryOrRegion`
- `operatorOrSiteFamily`
- `endpointRole`
- `infrastructureRole`
- `coordinates`
- `coordinatePrecision`
- `coordinateBasis`
- `sourceAuthority`
- `orbitEvidence`
  - `leo`
  - `meo`
  - `geo`
- `runtimeEligibility`
- `truthBoundary`

### Endpoint Roles

Allowed endpoint roles:

- `ground-station-endpoint`
- `teleport-endpoint`
- `gateway-or-snp-endpoint`
- `operator-ground-infrastructure-endpoint`
- `modeled-service-node-with-real-coordinate`

Forbidden endpoint roles:

- `aircraft-endpoint`
- `ordinary-handset-ue`
- `synthetic-demo-point`
- `pair-specific-teleport-claim-without-source`

### Strict Three-Orbit Acceptance

Strict V4 acceptance requires both endpoint A and endpoint B to have accepted
public evidence for all three orbit classes at either:

- exact site level
- site-family level with explicit coordinate precision
- operator ground-infrastructure level with a bounded visual marker

If endpoint B cannot meet this standard, implementation must stop or the user
must explicitly approve a weaker fallback.

### Weaker Fallback Requires Explicit Approval

A weaker fallback may be planned only if the user explicitly accepts it:

- endpoint A is full `LEO/MEO/GEO`
- endpoint B is real cross-country ground infrastructure with only `LEO/GEO`
  evidence
- `MEO` is shown as Taiwan-side or service-context only
- the UI labels endpoint B as not independently MEO-confirmed

This fallback is not approved by this SDD by default.

## Satellite Actor Rules

V4 may reuse the V3.5 source-lineaged actor architecture, but must widen it
only through a new projected artifact or module.

Required orbit actors:

- multiple moving `LEO` actors
- at least one moving `MEO` actor if the endpoint-pair gate accepts MEO
  participation
- one fixed or near-fixed `GEO` continuity actor or anchor

The actor data must include:

- source lineage
- source URL
- source epoch
- projection epoch
- orbit class
- operator context
- freshness class
- source position
- render position
- render truth boundary
- non-claims

The renderer must not side-read raw research packages or live external feeds.
It must consume a viewer-owned projected artifact.

## Handover Model

V4 needs a new presentation/service-state model. It must not reuse the V3.5
four-state actor emphasis as if it were operational handover truth.

The minimum model should express:

- current primary orbit class
- next candidate orbit class
- visible candidate set
- continuity fallback state
- handover pressure reason
- bounded metrics used by the modeled decision
- whether the state is evidence-backed, modeled, or display-context

The visual story should be continuous:

- new `LEO` satellites enter and leave useful geometry
- `MEO` provides wider-area lower-handover-rate context when accepted
- `GEO` remains the continuity/fallback layer
- the scene never implies a single one-time handover that ends the story

## V4.2 Viewer-Owned Projection Contract

V4.2 owns the contract between the accepted raw `itri` authority package and
the future V4 runtime scene. It is a planning and projection-contract phase,
not a runtime implementation phase.

The accepted contract is:

- [../data-contracts/m8a-v4-ground-station-projection.md](../data-contracts/m8a-v4-ground-station-projection.md)

The accepted projected artifact is:

- [../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json](../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json)

The projected artifact must include:

- endpoint source truth, including endpoint id, label, country or region,
  operator or site family, endpoint role, infrastructure role, source
  coordinate status, accepted precision, source authority, unresolved proof,
  and truth boundary
- render marker position, as a separate bounded operator-family display
  anchor with latitude, longitude, height, display basis, display precision,
  precision badge, and explicit `displayPositionIsSourceTruth = false`
- coordinate precision, keeping both endpoint A and endpoint B at
  `operator-family-only` precision with no site-family, site-level, or
  same-site `LEO/MEO/GEO` upgrade
- orbit evidence chips for `LEO`, `MEO`, and `GEO`, including grade, accepted
  precision, source refs, notes, and chip-level non-claims
- source lineage, including source package id, package date, package file
  labels, source role, projection epoch, and projection notes
- truth-boundary and non-claim fields for exact site, same-site
  `LEO/MEO/GEO`, live handover, active serving satellite, active gateway,
  pair-specific teleport path, measured performance, native RF handover,
  aircraft endpoint, and ordinary handset `UE`
- modeled handover/service-state inputs, including current primary orbit
  class, next candidate orbit class, visible candidate set, continuity
  fallback state, handover pressure reason, bounded metric classes, and
  whether each state is evidence-backed, modeled, or display-context

Runtime, controller, render, and UI code must not side-read raw `itri`
packages. They may consume only the accepted viewer-owned projected artifact or
a repo-owned module generated from it.

The accepted projection path is:

1. raw `itri` endpoint-pair authority package
2. offline repo-owned projection step
3. viewer-owned projected plain-data artifact
4. V4.3 runtime consumption of only that artifact

V4.2 exit criteria:

- projection contract accepted or explicitly superseded
- concrete viewer-owned projected artifact location selected
- endpoint source truth and render marker position are separate fields
- both endpoints remain operator-family-only
- orbit evidence chips preserve the accepted `LEO/MEO/GEO` grades
- modeled service-state inputs are provided without measurement-truth claims
- source lineage is preserved without runtime side-reading raw `itri` files
- validation expectations include a raw side-read scan before V4.3 closes

## Visual And Homepage Direction

The eventual V4 homepage experience should:

- expose a clear top-right handover/demo affordance
- enter the V4 ground-station scene directly
- show both endpoint markers immediately
- show multiple satellite actors across accepted orbit classes
- use obvious speed/time controls suitable for satellite movement
- avoid prose-heavy panels
- keep source/evidence badges compact and inspectable

The old addressed route may remain for regression and smoke coverage, but V4
should not depend on a hidden route as the primary user path.

## Phase Breakdown

### V4.0 Evidence Closeout

Goal:

- finish the current evidence package and decide whether another source hunt
  is required for Singapore, Thailand, Japan, or Korea.

Exit criteria:

- `candidate-matrix.json` is current
- candidate statuses are explicit
- no candidate is accidentally promoted to runtime

### V4.1 Endpoint-Pair Authority Package

Goal:

- create and accept one endpoint-pair package.

Accepted 2026-04-26 endpoint pair:

- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- precision: operator-family-only for both endpoints
- orbit evidence: `LEO/MEO/GEO` strong for both endpoint families at
  operator-family precision
- fallback mode: not used

Exit criteria:

- endpoint A/B are selected
- coordinate precision is accepted
- `LEO/MEO/GEO` evidence matrix is accepted
- non-claims are accepted
- fallback mode, if any, has explicit user approval

### V4.2 Viewer-Owned Projection Contract

Goal:

- design the viewer-owned data seam for ground endpoints, orbit actors, and
  modeled service states.

Exit criteria:

- runtime does not read raw `itri` packages
- actor data and endpoint data have source lineage
- display positions are separated from source truth where projection is used
- both endpoint A and endpoint B remain operator-family-only precision
- orbit evidence chips, source lineage, truth-boundary/non-claims, and modeled
  service-state inputs are defined before runtime work starts
- concrete projected artifact location is selected before V4.3 implementation

### V4.3 Continuous Multi-Orbit Handover Scene

Goal:

- implement the first runtime scene from the accepted V4 projection contract.

Exit criteria:

- two ground endpoints are visible
- multiple moving `LEO` actors are visible
- accepted `MEO` and `GEO` actors/anchors are visible
- service-state progression is continuous
- no aircraft/YKA labels remain in the V4 scene

### V4.4 Homepage Entry

Goal:

- make V4 reachable from the homepage through an obvious affordance.

Exit criteria:

- no hidden-route-only discovery
- first viewport clearly reads as a ground-station multi-orbit scene
- old V3/V3.5 routes remain only as regression/deep-link surfaces

### V4.5 Visual Acceptance And Regression

Goal:

- lock browser/screenshot acceptance for the corrected scene.

Exit criteria:

- desktop screenshot proves both endpoints, accepted orbit actors, timeline,
  and compact truth boundary
- mobile or narrow viewport does not overlap key labels
- default route and V4 route truth boundaries are checked
- forbidden claim scan passes

## Acceptance Criteria

V4 planning is accepted when:

1. the evidence package records all current ground-station candidates and gaps
2. ADR 0013 is accepted
3. this SDD is linked from the roadmap and handoff index
4. V4 does not depend on aircraft or YKA as endpoint A/B
5. R2 remains read-only
6. endpoint-pair authority is required before code
7. strict three-orbit acceptance and fallback rules are explicit

V4 implementation is not accepted until:

1. an endpoint-pair authority package exists
2. endpoint A/B source and coordinate precision are accepted
3. the orbit evidence matrix is accepted
4. the V4.2 viewer-owned projection contract is accepted
5. the concrete projected artifact exists in the viewer repo
6. the viewer consumes only projected repo-owned data
7. the scene shows continuous multi-satellite handover pressure
8. forbidden claims remain absent

## Prompt For Future Implementation Thread

Use this only after V4.2 projection contract and a concrete viewer-owned
projected artifact are accepted:

```text
Read the canonical SDD first and implement only the requested V4 phase. Do not
rewrite the plan and do not promote endpoint candidates that have not passed the
V4 endpoint-pair authority gate.

Canonical SDD:
- scenario-globe-viewer/docs/sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md

Evidence package:
- itri/multi-orbit/download/ground-station-endpoint-candidates/2026-04-25/
- itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/

Projection contract:
- scenario-globe-viewer/docs/data-contracts/m8a-v4-ground-station-projection.md

Projected artifact:
- scenario-globe-viewer/public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json

This run should implement only:
- <phase_name>

Constraints:
- no aircraft endpoint
- no ordinary handset UE
- no YKA endpoint in the V4 scene
- no arbitrary endpoint selector
- no raw itri package side-read from runtime
- no exact serving satellite, gateway assignment, teleport path, or measurement
  truth unless explicitly present in the accepted projection contract

Return only:
- Changed files
- What was implemented
- Validation results
- Deviations from SDD
- Remaining work
```
