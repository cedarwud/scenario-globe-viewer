# Multi-Orbit Contract Adoption Proposal (Closed Pre-Contract Proposal Reference)

Source note: this file is a closed pre-contract proposal reference for the
original repo-local planning pass that framed the first real-world multi-orbit
service handover case in `scenario-globe-viewer`. It is retained for
historical/provenance context only. Live continuation authority for this lane
remains
[multi-orbit-first-overlay-seed-resolution-lane.md](./multi-orbit-first-overlay-seed-resolution-lane.md).
Keep it synchronized by editing this repo directly. Do not replace it with a
symlink or hard link.

Related structure: see [../architecture.md](../architecture.md).
Related governance checkpoint: see
[../decisions/0009-multi-orbit-first-intake-contract-ordering.md](../decisions/0009-multi-orbit-first-intake-contract-ordering.md).
Related continuation lane authority: see
[multi-orbit-first-overlay-seed-resolution-lane.md](./multi-orbit-first-overlay-seed-resolution-lane.md).
Related requirement-centered plan: see
[phase-6-plus-requirement-centered-plan.md](./phase-6-plus-requirement-centered-plan.md).
Related current contracts: see [../data-contracts/scenario.md](../data-contracts/scenario.md),
[../data-contracts/physical-input.md](../data-contracts/physical-input.md), and
[../data-contracts/document-telemetry.md](../data-contracts/document-telemetry.md).
Upstream research authority: see
[../../../itri/multi-orbit/README.md](../../../itri/multi-orbit/README.md).
Related canonical baseline: see
[../../../itri/multi-orbit/data/multi-orbit-operator-baseline.json](../../../itri/multi-orbit/data/multi-orbit-operator-baseline.json),
[../../../itri/multi-orbit/data/endpoint-taxonomy-baseline.json](../../../itri/multi-orbit/data/endpoint-taxonomy-baseline.json),
and
[../../../itri/multi-orbit/data/oneweb-gateway-position-baseline.json](../../../itri/multi-orbit/data/oneweb-gateway-position-baseline.json).
Related prep bridge: see
[../../../itri/multi-orbit/prep/viewer-contract-widening-proposal.md](../../../itri/multi-orbit/prep/viewer-contract-widening-proposal.md),
[../../../itri/multi-orbit/prep/endpoint-overlay-seed-draft.md](../../../itri/multi-orbit/prep/endpoint-overlay-seed-draft.md),
and
[../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json](../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json).

## Status

- Closed pre-contract proposal reference
- Historical/provenance reference only
- Not live continuation authority for this lane
- Live continuation authority remains
  `multi-orbit-first-overlay-seed-resolution-lane.md`
- No contract widening is accepted by this document alone
- No runtime code change is implied by this proposal
- The target is a first repo-owned contract delta for a real-world case, not a
  generic all-orbits master schema

## Purpose

This proposal exists to answer one question:

How should `scenario-globe-viewer` adopt the first real-world multi-orbit
service-handover case without collapsing research truth, path semantics, and
bounded runtime projections into one oversized contract?

The current recommended first case is:

- `OneWeb LEO + Intelsat GEO`
- `commercial aviation`
- `aircraft onboard connectivity stack`
- `service-layer switching`
- `isNativeRfHandover = false`

This proposal treats that case as the first intake because it has the strongest
public proof and the cleanest path to a defensible viewer scenario.

## Current Constraint Summary

### `scenario`

Current `ScenarioDefinition` is intentionally narrow and currently owns:

- scenario identity
- scenario label
- preset selection
- time mode and optional range
- source-family references for satellite, site-dataset, and validation

It does **not** currently own:

- endpoint A/B semantics
- candidate-path semantics
- provider-side infrastructure intent
- truth-boundary labeling for real-world pairing vs bounded runtime projection

### `physical-input`

Current `physical-input` is the correct place for bounded deterministic
projection, but its public contract currently focuses on:

- antenna / rain / ITU-style proxy families
- candidate IDs plus orbit classes
- projected latency / jitter / network-speed metrics
- explicit bounded-proxy provenance

It does **not** yet carry first-class path semantics such as:

- service role (`primary`, `secondary`, `contrast`)
- path-control mode
- infrastructure-selection mode

### `handover-decision`

Current `handover-decision` already owns:

- policy ID
- current-serving candidate
- candidate metrics
- reason signals
- truth state

But it does **not** yet distinguish whether a decision came from:

- `service-layer switching`
- `sd-wan orchestration`
- `bonding`

### Endpoint Overlay

The current repo also has no repo-owned plain-data seed for endpoint-side
renderable entities that can stay separate from `scenario`, `physical-input`,
and `handover-decision`.

### Infrastructure Overlay

The current repo has overlay ownership boundaries, but it does not yet have a
repo-owned plain-data seed for provider-side infrastructure nodes that can stay
separate from `scenario`, `physical-input`, and `handover-decision`.

## Adoption Target

This proposal is explicitly about first adoption of one real-world case. It is
**not** about making the whole repo immediately understand every future:

- `LEO/MEO/GEO` combination
- tri-orbit case
- provider inventory taxonomy
- mobile endpoint trajectory system

## Proposed Minimal Contract Delta

### 1. `scenario` Should Gain A Narrow Context Block

The first widening proposal for `ScenarioDefinition` should stay narrow:

```ts
type TruthBoundaryLabel = "real-pairing-bounded-runtime-projection";

interface ScenarioContextRef {
  vertical?: string;
  truthBoundaryLabel?: TruthBoundaryLabel;
  endpointProfileId?: string;
  infrastructureProfileId?: string;
}
```

Suggested meaning:

- `vertical`
  - `commercial_aviation`
- `truthBoundaryLabel`
  - `real-pairing-bounded-runtime-projection`
- `endpointProfileId`
  - adapter-facing pointer to an `EndpointOverlaySeed.profileId`
- `infrastructureProfileId`
  - adapter-facing pointer to an `InfrastructureOverlaySeed.profileId`

This `context` block should be an optional **top-level** field on
`ScenarioDefinition`, parallel to `presentation`, `time`, and `sources`. It
must not be folded into `sources`.

First-version resolution rule:

- resolve `endpointProfileId` by exact profile-ID match inside the same intake
  asset set
- resolve `infrastructureProfileId` the same way
- do not introduce a repo-wide registry in the first delta

`scenario.intent` remains prep-only and does not enter the first repo-owned
viewer contract delta.

This keeps `scenario` at the metadata and coordination layer. It does **not**
turn `ScenarioDefinition` into a full endpoint/infrastructure payload.

### 2. `physical-input` Should Gain Path-Semantic Fields

The first widening proposal for `CandidatePhysicalInputs` should add:

```ts
type PathControlMode = "managed_service_switching" | (string & {});

interface CandidatePhysicalInputs {
  candidateId: string;
  orbitClass: "leo" | "meo" | "geo";
  pathRole?: "primary" | "secondary" | "contrast";
  pathControlMode?: PathControlMode;
  infrastructureSelectionMode?:
    | "provider-managed"
    | "eligible-pool"
    | "resolved-fixed-node";
  ...
}
```

Reason:

- The current repo already routes deterministic physical-input windows into the
  decision layer.
- The first real-world case needs path semantics to survive that translation.
- Without these fields, different real-world scenarios will be flattened into
  indistinguishable bounded proxies.
- The first validated viewer-side value is currently only
  `managed_service_switching`. Later values should stay deferred until a later
  accepted intake actually forces them.

This widening should not land by itself. While `CandidatePhysicalInputs`
continues to require `antenna`, `rain`, and `itu` families, the first
path-semantics widening must land together with a repo-owned static bounded
metric profile so the first adapter does not emit hardcoded numbers without
provenance.

### 3. `handover-decision` Should Gain Decision-Model Labeling Later

The first widening proposal for `handover-decision` should be deferred until a
first consumer exists. If a later slice needs it, it should stay minimal:

```ts
interface HandoverDecisionSnapshot {
  ...
  isNativeRfHandover?: boolean;
  decisionModel?:
    | "service-layer-switching"
    | "sd-wan-orchestrated-switching"
    | "bonded-managed-service";
}
```

And the existing semantics bridge can be widened slightly:

```ts
interface HandoverDecisionResult {
  ...
  semanticsBridge: {
    truthState: HandoverTruthState;
    truthBoundaryLabel?: TruthBoundaryLabel;
  };
}
```

Reason:

- In the current first-round plan there is no runtime, HUD, or validation
  consumer for these fields yet.
- The truth boundary can stay explicit through the seed, the static bounded
  profile, and repo tests without widening `handover-decision` prematurely.
- Deferring this widening avoids public-surface churn before the first consumer
  shapes the final field semantics.

### 4. Endpoint Overlay Should Stay A Separate Plain-Data Seed

Endpoint-side renderable entities should also stay out of `scenario` and
`physical-input`.

Adopt a separate plain-data seed, for example:

```ts
interface EndpointOverlaySeed {
  profileId: string;
  endpoints: EndpointOverlayNode[];
}
```

Rules:

- `mobile-snapshot-required` endpoints may omit coordinates until a later
  snapshot-resolution step
- `provider-managed-anchor` endpoints may remain logical-coordinate-free
- `ScenarioDefinition.context.endpointProfileId` must point at this seed
- render-facing fields such as `renderClass` or `positionMode` should remain
  adapter-facing open strings in the first round rather than a renderer-owned
  closed enum
- the frozen aircraft corridor does not yet fit this seed and should reserve a
  later dedicated mobile-endpoint trajectory seam instead of being stuffed into
  overlay ownership

### 5. Infrastructure Should Stay A Separate Plain-Data Seed

Provider-side infrastructure should **not** be widened into `scenario` or
`physical-input`.

Instead, adopt a separate plain-data seed later, for example:

```ts
interface InfrastructureOverlaySeed {
  profileId: string;
  nodes: InfrastructureOverlayNode[];
}
```

Reason:

- overlay ownership stays overlay-owned
- `scenario` stays scenario-owned
- `physical-input` stays metric-projection-owned

The first infrastructure seed should also stay profile-driven and must not
pretend to resolve one active OneWeb gateway assignment.

## Vocabulary Boundary

- `TruthBoundaryLabel` is a closed enum in the first delta and currently allows
  only `real-pairing-bounded-runtime-projection`
- `handover-decision` labels are deferred until a first consumer exists
- viewer-owned `pathControlMode` is intentionally only validated for
  `managed_service_switching` in the first round; later values must be proven by
  later intake work
- if a future intake needs a new validated viewer-side `pathControlMode`,
  widening must happen before intake rather than inside implementation

## First Intake Mapping

For the first adoption target, the repo should assume:

- endpoint A is mobile and aviation-specific
- endpoint B is a logical/provider-managed anchor
- OneWeb ground nodes are an eligible pool, not a falsely pinned active site
- bounded runtime metrics remain adapter-generated

This means the repo should **not** rush to widen contracts around:

- exact aircraft trajectory truth
- exact Intelsat GEO anchor coordinates
- a falsely claimed active OneWeb gateway assignment

## What Must Stay Out Of The First Delta

Do **not** use the first widening proposal to introduce:

- a generic tri-orbit master schema
- raw research baseline import into repo-owned runtime contracts
- source-authority metadata inside `handover-decision`
- exact mobile trajectory ownership inside `scenario`
- provider infrastructure ownership inside `physical-input`

## Acceptance Gates Before Contract Work

Before this proposal turns into actual repo-owned contract edits, the following
must remain true:

1. The first intake case is still `OneWeb + Intelsat GEO aviation`
2. `isNativeRfHandover = false` remains explicit
3. provider-managed anchor semantics stay accepted for the GEO side
4. eligible-pool semantics stay accepted for the OneWeb gateway side
5. runtime metrics remain bounded projection, not research truth

If any of those five points drift, the repo risks mixing real-world research
truth and runtime simulation truth too early.

## First Intake Delta

The minimum first delta should include:

- `ScenarioDefinition.context.vertical`
- `ScenarioDefinition.context.truthBoundaryLabel`
- `ScenarioDefinition.context.endpointProfileId`
- `ScenarioDefinition.context.infrastructureProfileId`
- separate `EndpointOverlaySeed`
- separate `InfrastructureOverlaySeed`
- `CandidatePhysicalInputs.pathRole`
- `CandidatePhysicalInputs.pathControlMode`
- `CandidatePhysicalInputs.infrastructureSelectionMode`
- aviation bounded metric profile as a repo-owned static config
- `scenario-seed-adapter`
- `path-projection-adapter`

## Recommended Sequence

1. Accept this proposal direction at the planning level
2. Define the smallest repo-owned contract delta across:
   - `scenario`
   - `physical-input`
3. Pair the first `physical-input` widening with the first repo-owned static
   bounded metric profile
4. Design only the first two adapters:
   - `scenario-seed-adapter`
   - `path-projection-adapter`
5. Defer `handover-decision` widening, overlay adapters, mobile trajectory
   ingestion, and runtime/HUD work to later slices

## Explicit Non-Goals

This proposal does **not**:

- close Phase 8
- reopen Phase 6 ordering authority
- authorize another overlay-heavy expansion by default
- claim that the current repo already models all real-world multi-orbit cases
- authorize code changes by itself
