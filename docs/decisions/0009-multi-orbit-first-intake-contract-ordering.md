# ADR 0009: Multi-Orbit First Intake Contract Ordering

## Status

Accepted

## Context

The repo now has a converged multi-orbit prep surface under
`/home/u24/papers/itri/multi-orbit/`, plus a first accepted aircraft corridor
package for the `OneWeb LEO + Intelsat GEO aviation` intake case.

That closes the prep gate, but it also exposes a narrower implementation risk:

- the first accepted case needs a repo-owned contract delta
- `CandidatePhysicalInputs` still requires `antenna`, `rain`, and `itu`
  families
- the first multi-orbit widening proposal originally treated path semantics,
  adapters, and bounded metrics as separable phases
- the first implementation round still explicitly avoids runtime render, HUD,
  and corridor-ingestion work

Without a sharper ordering decision, the first slice risks doing one of two bad
things:

- shipping adapters that invent hardcoded metrics with no bounded-proxy
  provenance
- or widening public contracts before the repo has decided which first-round
  fields actually have a consumer

The repo needs one accepted planning decision that fixes:

- where the new multi-orbit `scenario` metadata lives
- how the first `physical-input` widening is paired with bounded metric inputs
- which surfaces are in scope for the first round
- which surfaces are explicitly deferred

## Decision

### 1. `ScenarioDefinition.context` Is A Top-Level Optional Field

The first multi-orbit `scenario` widening is a new optional top-level
`context` block on `ScenarioDefinition`.

It stays parallel to:

- `presentation`
- `time`
- `sources`

It must not be folded into `sources`.

The first-round use is intentionally narrow:

- `vertical`
- `truthBoundaryLabel`
- `endpointProfileId`
- `infrastructureProfileId`

### 2. First-Round `physical-input` Widening Must Land With A Static Profile

The first multi-orbit `physical-input` widening may add path semantics:

- `pathRole`
- `pathControlMode`
- `infrastructureSelectionMode`

But that widening must land together with a repo-owned bounded metric profile,
stored as static config rather than runtime calibration.

Reason:

- the existing public `CandidatePhysicalInputs` contract still requires
  `antenna`, `rain`, and `itu`
- therefore a first adapter cannot emit valid physical-input entries unless the
  repo already owns a bounded source for those families

The first-round profile is:

- repo-owned
- bounded-proxy only
- explicitly non-calibrated
- limited to the first aviation case

### 3. First-Round `pathControlMode` Stays Narrow

The first validated repo-owned `pathControlMode` is:

- `managed_service_switching`

Additional values are deferred until a later accepted intake actually forces
them. The first round must not close a larger enum just because the prep layer
can already describe richer semantics.

### 4. First Round Defers `handover-decision` Widening

`handover-decision` widening is deferred until a first consumer exists.

That means the first round does **not** widen:

- `HandoverDecisionSnapshot.isNativeRfHandover`
- `HandoverDecisionSnapshot.decisionModel`

The truth boundary still remains explicit through:

- the prep seed
- the accepted aircraft corridor package
- the static bounded metric profile
- repo tests and planning docs

### 5. Overlay Seeds Stay Plain-Data Only

The first round may define:

- `EndpointOverlaySeed`
- `InfrastructureOverlaySeed`

as plain-data profile-owned seed types only.

Those first-round seeds:

- stay keyed by `profileId`
- do not need `scenarioId`
- keep render-facing vocabulary adapter-owned/open
- do not imply runtime rendering

### 6. Aircraft Corridor Ingestion Is Deferred

The accepted aircraft corridor package does **not** fit the first-round overlay
seed contracts.

The repo reserves a later dedicated mobile-endpoint trajectory seam rather than
forcing the corridor into:

- `scenario`
- overlay seeds
- or `physical-input`

## Consequences

- The first round becomes smaller and more defensible:
  1. narrow `scenario` context
  2. plain-data overlay seed types
  3. `physical-input` path semantics plus bounded profile
  4. minimal first adapters
- The repo avoids inventing hardcoded first-round metric literals with no
  bounded-proxy provenance.
- The repo avoids widening `handover-decision` before any runtime, HUD, or
  validation consumer exists.
- The repo keeps the aircraft corridor package trajectory-backed but still
  outside runtime ownership until a later dedicated seam exists.
