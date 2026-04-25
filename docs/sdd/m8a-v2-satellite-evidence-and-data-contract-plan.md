# M8A-V2 Satellite Evidence And Data Contract Plan

Source note: this file defines the evidence and data boundary for `M8A-V2`.
Its job is to answer which facts are accepted runtime truth, which orbit or
satellite facts may appear only as display-context, and which claims remain
forbidden until a later source-backed promotion gate exists.

Parent SDD: see
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md).
Related draft context: see
[./m8a-satellite-evidence-promotion-plan.md](./m8a-satellite-evidence-promotion-plan.md).

## Status

- planning-only child SDD
- no rendering authority by itself
- first-case-only and nearby-second-endpoint-only

## Purpose

This file answers three questions:

1. What existing data may be used as accepted runtime truth?
2. What satellite or constellation material is only display-context?
3. What cannot be rendered or claimed yet?

## Accepted Runtime Truth

For `M8A-V2`, accepted runtime truth means already accepted repo-owned semantic
or contract truth. It does not mean live network truth or measurement truth.

Accepted runtime truth is limited to:

- first-case label:
  `OneWeb LEO + Intelsat GEO aviation`
- service interpretation:
  `service-layer switching`
- explicit non-claim:
  `isNativeRfHandover = false`
- bounded-proxy / not-measurement-truth semantics
- endpoint A identity:
  aircraft-side connectivity stack
- endpoint B identity:
  provider-managed GEO anchor
- accepted aircraft corridor replay seam:
  `firstIntakeMobileEndpointTrajectory`
- accepted nearby second endpoint seam:
  `firstIntakeNearbySecondEndpoint`
- accepted nearby second-endpoint info seam:
  `firstIntakeNearbySecondEndpointInfo`
- accepted nearby endpoint package identity and precision:
  `m8a-yka-operations-office-2026-04-23`,
  `facility-known`
- existing overlay-expression semantics for first-case and nearby endpoint
- existing replay-clock contract as the single time authority seam
- source-lineage references for any projected orbit-context actor promoted by
  this child plan

These truths are allowed to drive:

- route ownership
- replay bounds
- endpoint labels and precision labels
- bounded handover-state progression
- orbit-class display-context selection

## Visible Endpoint Truth

The first `M8A-V2` scene should render exactly two communication endpoints:

- aircraft/mobile endpoint:
  trajectory-backed, replayed from `firstIntakeMobileEndpointTrajectory`
- YKA fixed endpoint:
  facility-known, rendered from `firstIntakeNearbySecondEndpoint`

The provider-managed `GEO` anchor remains a semantic service-side context for
the `Intelsat GEO` side. It is not a third precise ground endpoint and must not
be converted into a pair-specific teleport or active ground facility.

## Display-Context Only

The following may appear only as display-context in `M8A-V2` unless a later
repo-owned promotion gate explicitly upgrades them:

- visible orbit-class actors used to show `LEO` presence
- visible orbit-class actors used to show `GEO` context
- non-serving satellite motion used to communicate orbit-class difference
- eligible OneWeb gateway pool references or inspectable inventory notes
- any generic satellite overlay seam already present in the repo
- walker-derived fixture, scale, or stress evidence
- any orbit bands, altitude cues, or context tracks used only to make the
  scene legible

Display-context means:

- useful for viewer explanation
- explicitly labeled as contextual or presentation-only
- never the basis for active gateway, teleport, serving-satellite, or RF truth
- still backed by a real or documented source lineage when the actor is drawn
  as a named satellite, constellation, or orbit-class representative

## Metric Cue Source Contract

`M8A-V2` must not invent latency, jitter, speed, or continuity cues.

Before bounded metric cues appear in orbit visuals, stage chips, or overlay
surfaces, the repo should define one projected metric-class seam for `M8A-V2`.

That seam may be sourced only from:

- `firstIntakePhysicalInput.getState().physicalInput`
- `firstIntakeHandoverDecision.getState()` for service interpretation and
  machine-readable non-claim alignment
- the shared replay clock for deterministic time binding

That seam must carry at least:

- `scenarioId`
- `replayTimeUtc`
- `latencyClass`
- `jitterClass`
- `speedClass`
- `continuityClass`
- `metricSourceLineage`
- `projectionMode = bounded-proxy-classification`
- machine-readable non-claims for:
  - measurement truth
  - active gateway assignment
  - pair-specific GEO teleport
  - RF beam truth
  - native RF handover truth

That seam must not read from:

- bootstrap-only default-route communication surfaces
- raw package files
- ad hoc UI constants
- external live fetches at render time

## Realistic Satellite Data Requirement

`M8A-V2` should not use random satellites or the demo repo's synthetic
constellation as visible orbit actors.

The first implementation may use source-backed display-context actors, even if
they are not promoted to serving-satellite truth:

- `OneWeb LEO` context actors may be projected from a repo-owned ingestion of
  a public OneWeb ephemeris/TLE-equivalent source, such as CelesTrak OneWeb
  SupGP or an official OneWeb ephemeris-derived artifact
- `Intelsat GEO` context may be represented by a source-lineaged GEO
  satellite/operator anchor record or by an explicitly semantic
  provider-managed GEO anchor if no pair-specific satellite/teleport truth is
  accepted
- every visible actor must carry `sourceLineage`, `evidenceClass`,
  `positionPrecision`, `motionMode`, `sourceEpochUtc`, `projectionEpochUtc`,
  `freshnessClass`, and machine-readable non-claims

If the replay window is historical, visible satellite actors must come from a
replay-date-aligned archived snapshot or repo-owned projection artifact. The
first cut must not silently mix a 2026-04-21 aircraft replay with unrelated
current-day public ephemeris and present that combination as historically
grounded context.

This lets the frontend look and feel realistic while keeping the contract
honest: the actors explain orbit-class context and the service-layer story;
they do not become active serving satellite truth.

## MEO Handling

`M8A-V2` must not promote `MEO` into the active handover scene.

If the UX needs to show the full customer-side `LEO/MEO/GEO` target, `MEO` can appear
only as:

- an inactive orbit-family status chip
- a future evidence-gate item
- a read-only comparison note in an inspectable detail surface

It must not appear as:

- a visible active satellite actor
- a candidate path
- a handover state
- a service path
- a route or relation cue

## Not Renderable Or Claimable Yet

`M8A-V2` must not render or claim any of the following as truth:

- active OneWeb gateway assignment
- pair-specific GEO teleport coordinate
- active serving satellite identity
- unqualified current/live ephemeris as historical replay truth
- RF beam truth
- native RF handover truth
- measurement-truth latency, jitter, throughput, or continuity
- arbitrary or random satellites
- walker fixture as OneWeb truth
- raw `itri/multi-orbit/download/...` package reads from runtime/controller/render
- second operator pair
- active `MEO` participation
- endpoint A or endpoint B rewrite

## Required Repo-Owned Projection Contract

Before orbit-class actors are rendered, the repo should define one projected
display-context seam for `M8A-V2`.

That projected seam should carry at least:

- `scenarioId`
- `actorId`
- `orbitClass`: `leo` or `geo`
- `displayRole`:
  - `leo-context-actor`
  - `geo-context-anchor`
  - `inactive-meo-requirement-trace` only if the UX explicitly needs a customer-side
    full-orbit-family status indicator
- `evidenceClass`:
  - `accepted-runtime-truth`
  - `display-context`
  - `evidence-gated-inactive`
- `motionMode`:
  - `replay-driven`
  - `fixed-earth-relative`
  - `not-rendered`
- `positionPrecision`
- `sourceEpochUtc`
- `projectionEpochUtc`
- `freshnessClass`
- `sourceLineage`
- `visualImportance`:
  - `primary`
  - `secondary`
  - `context`
  - `inactive-gap`
- machine-readable non-claims for:
  - active gateway assignment
  - pair-specific GEO teleport
  - RF beam truth
  - native RF handover truth
  - measurement truth
  - live operational truth
  - active MEO participation

This contract is allowed to support:

- visible orbit-class difference
- moving `LEO` context actors
- fixed or near-fixed `GEO` context anchors
- compact labels and legends

This contract is not allowed to support:

- direct serving-path claims
- per-scene operational routing claims
- turning contextual actors into endpoint B

## Consumption Rule

Runtime/controller/render code may consume only the repo-owned projected
display seam. It must not side-read:

- nearby endpoint package files
- corridor package files
- raw satellite-source packages
- raw customer-side download artifacts

## Initial Classification Inventory

### Accepted Runtime Truth

- replay window and trajectory bounds from `firstIntakeMobileEndpointTrajectory`
- fixed YKA nearby endpoint label, position, and precision
- first-case semantic labels and non-claims
- provider-managed GEO anchor as semantic role only

### Display-Context

- visual `LEO` presence
- visual `GEO` presence
- orbit bands, movement, and scene-legibility aids
- gateway-pool context wording

### Rejected For Viewer Truth In This Branch

- serving gateway identity
- pair-specific GEO teleport
- exact public teleport node
- live satellite ephemeris truth
- RF beam geometry
- active MEO handover participation

## Acceptance Criteria

This child plan is satisfied only when:

1. accepted runtime truth is listed explicitly and narrowly
2. display-context is separated explicitly from runtime truth
3. forbidden claims remain machine-readable and not only prose
4. a repo-owned projected seam is required before orbit actors can render
5. runtime/controller/render side-read of raw package files remains forbidden
6. visible satellite actors are source-lineaged and not demo-synthetic
7. `MEO` is either absent from the scene or clearly inactive/evidence-gated
8. bounded metric cues are sourced only from the repo-owned metric-class seam
9. visible historical orbit-context actors declare epoch/freshness explicitly
