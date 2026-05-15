# Physical Input Contract

## Purpose

`physical-input` is the `Phase 6.5` repo-owned plain-data seam. Its responsibility
is to take scenario-bounded antenna / rain attenuation / ITU-style
requirement-bearing inputs and materialize them, with explicit provenance and
deterministic projection, into candidate metrics consumable by the existing
decision layer.

This boundary exists because:

- `scenario` only handles scenario identity / source / time coordination
- `replay-clock` only handles evaluated time and active range
- `handover-decision` only handles decision semantics and repo-owned outputs

Therefore `physical-input` must exist independently and cannot be folded back
into `ScenarioDefinition.sources` or a UI-only readout.

## Current Public Source Of Truth

- `src/features/physical-input/physical-input.ts`
- `src/features/physical-input/static-bounded-metric-profile.ts`
- `src/features/physical-input/physical-input-view-model.ts`
- `src/features/physical-input/bootstrap-physical-input-panel.ts`
- `src/runtime/bootstrap-physical-input-source.ts`
- `src/runtime/bootstrap-physical-input-controller.ts`
- `src/runtime/first-intake-physical-input-source.ts`
- `src/runtime/first-intake-physical-input-controller.ts`
- `scripts/verify-phase6.5-physical-input-contract-widening.mjs`

## First-Slice Public Shape

Current first-slice public shape is:

```ts
type PhysicalInputFamily = "antenna" | "rain-attenuation" | "itu-style";
type PhysicalInputProvenanceKind = "bounded-proxy";

interface PhysicalInputProvenance {
  family: PhysicalInputFamily;
  kind: PhysicalInputProvenanceKind;
  label: string;
  detail: string;
  sourceRef?: string;
}

interface CandidatePhysicalInputs {
  candidateId: string;
  orbitClass: "leo" | "meo" | "geo";
  pathRole?: "primary" | "secondary" | "contrast";
  pathControlMode?: "managed_service_switching" | (string & {});
  infrastructureSelectionMode?:
    | "provider-managed"
    | "eligible-pool"
    | "resolved-fixed-node";
  antenna: AntennaPhysicalInputs;
  rain: RainPhysicalInputs;
  itu: ItuStylePhysicalInputs;
  baseMetrics?: {
    latencyMs: number;
    jitterMs: number;
    networkSpeedMbps: number;
  };
}

interface PhysicalInputWindow {
  startRatio: number;
  stopRatio: number;
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
}

interface PhysicalInputSourceEntry {
  scenarioId: string;
  windows: ReadonlyArray<PhysicalInputWindow>;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
}
```

The runtime bootstrap slice keeps an extra per-window `contextLabel`, but that
is still downstream of the same repo-owned source entry and does not widen the
core contract into presentation ownership.

## First Intake Static Bounded Metric Profile

The first repo-owned static bounded metric profile now lives at:

- `src/features/physical-input/static-bounded-metric-profile.ts`

This profile is intentionally narrow:

- first-intake-only for `app-oneweb-intelsat-geo-aviation`
- bounded-proxy only
- explicitly `non-calibrated`
- explicitly not measurement truth
- limited to `oneweb-leo-service-path` and `intelsat-geo-service-path`

The first repo-owned validated `pathControlMode` is still only:

- `managed_service_switching`

That means:

- the widened `PathControlMode` type stays open-ended for later accepted intake
  work
- the current repo-owned static profile rejects later values until a later slice
  explicitly widens validation
- this slice does not imply `handover-decision`, runtime bootstrap controller,
  adapter, render, HUD, or trajectory widening

Multi-orbit planning consequence:

- as long as `CandidatePhysicalInputs` keeps `antenna`, `rain`, and `itu` as
  required families, any future first-round path-semantics widening must land
  together with a repo-owned bounded profile or equivalent static source of
  those families
- path semantics alone are not enough to materialize a valid
  `CandidatePhysicalInputs`
- this prevents adapters from emitting hardcoded, provenance-free metric
  literals just to satisfy the contract

## M3 First-Intake Runtime Adoption

`M3 Slice C` adds a dedicated non-bootstrap runtime lane for
`app-oneweb-intelsat-geo-aviation`.

That lane resolves from:

- the first-intake seed lineage
- repo-owned scenario/runtime wiring
- `adaptFirstIntakeSeedToPhysicalInputSourceEntry()`
- `ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE`
- `createPhysicalInputState()`

It does not resolve from:

- `BOOTSTRAP_PHYSICAL_SOURCE_SEEDS`
- bootstrap fallback catalogs

Bootstrap physical-input behavior stays unchanged, and first-intake handover
remains explicitly unsupported/no-op outside this dedicated physical-input seam.

## Projection Ownership

Deterministic consumption path in the first slice is:

1. `scenarioId`
2. active replay range + evaluated time
3. active physical-input window
4. candidate physical inputs
5. projected `latencyMs / jitterMs / networkSpeedMbps`
6. `evaluateHandoverDecisionSnapshot()`

The projection logic is owned by `physical-input`, not by:

- `scenario`
- `replay-clock`
- UI components
- presentation/demo surfaces

## Provenance Rule

Every first-slice family must keep explicit provenance:

- `antenna`
- `rain-attenuation`
- `itu-style`

Current first slice uses `bounded-proxy` only. This must stay explicit in both
state and UI. The repo must not present these inputs as final physical truth,
measured truth, or validated ITU calibration.

## Current Boundaries

`physical-input` owns:

- scenario-bounded physical input catalogs
- family-level provenance
- deterministic physical-to-metric projection
- minimal physical-input readout state

`physical-input` does not own:

- scenario loading taxonomy
- replay control APIs
- handover result semantics
- validation / NAT / tunnel / DUT integration
- presentation-led contract definitions

## Scope Note

This contract still preserves the original `Phase 6.5` bootstrap seam while
also allowing the narrow `M3 Slice C` first-intake runtime adoption lane above.
Neither path claims final truth calibration or widens runtime handover semantics.
