# Physical Input Contract

## Purpose

`physical-input` 是 `Phase 6.5` 的 repo-owned plain-data seam。它的責任是把
scenario-bounded 的 antenna / rain attenuation / ITU-style requirement-bearing
inputs，以明確 provenance 與 deterministic projection materialize 成既有
decision layer 可消費的 candidate metrics。

這個 boundary 存在的原因是：

- `scenario` 只管 scenario identity / source / time coordination
- `replay-clock` 只管 evaluated time 與 active range
- `handover-decision` 只管 decision semantics 與 repo-owned outputs

因此 `physical-input` 必須獨立存在，不能被塞回 `ScenarioDefinition.sources`
或 UI-only readout。

## Current Public Source Of Truth

- `src/features/physical-input/physical-input.ts`
- `src/features/physical-input/physical-input-view-model.ts`
- `src/features/physical-input/bootstrap-physical-input-panel.ts`
- `src/runtime/bootstrap-physical-input-source.ts`
- `src/runtime/bootstrap-physical-input-controller.ts`

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

Multi-orbit planning consequence:

- as long as `CandidatePhysicalInputs` keeps `antenna`, `rain`, and `itu` as
  required families, any future first-round path-semantics widening must land
  together with a repo-owned bounded profile or equivalent static source of
  those families
- path semantics alone are not enough to materialize a valid
  `CandidatePhysicalInputs`
- this prevents adapters from emitting hardcoded, provenance-free metric
  literals just to satisfy the contract

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

## First-Slice Note

This contract is intentionally scoped to the `Phase 6.5` bootstrap slice only.
It proves a repo-owned physical-input seam and deterministic decision
consumption without claiming final truth calibration or opening `Phase 6.6`
validation paths.
