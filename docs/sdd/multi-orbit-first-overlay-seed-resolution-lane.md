# Multi-Orbit First Overlay-Seed Resolution Lane

Source note: this file is a planning-stage continuation SDD for the next
accepted multi-orbit lane in `scenario-globe-viewer`. It exists only to lock
the first overlay-seed asset resolution authority after the accepted first-round
contract/adapters lane. Keep it synchronized by editing this repo directly. Do
not replace it with a symlink or hard link.

Related governance checkpoint: see
[../decisions/0009-multi-orbit-first-intake-contract-ordering.md](../decisions/0009-multi-orbit-first-intake-contract-ordering.md).
Related adoption proposal: see
[multi-orbit-contract-adoption-proposal.md](./multi-orbit-contract-adoption-proposal.md).
Related intake checklist: see
[multi-orbit-first-intake-checklist.md](./multi-orbit-first-intake-checklist.md).
Related current contracts: see [../data-contracts/scenario.md](../data-contracts/scenario.md)
and [../data-contracts/overlay-seeds.md](../data-contracts/overlay-seeds.md).

## Status

- Planning only
- Continuation-lane authority only
- No implementation code is implied by this document alone
- No widening of ADR 0009 is authorized by this document alone

## Purpose

This continuation SDD answers one narrow question:

How should the already-landed first-intake `ScenarioDefinition.context`
profile IDs resolve to repo-owned plain-data overlay seed assets without
widening into handover, trajectory, runtime, render, or HUD ownership?

## Approved Scope

This lane is limited to the first accepted overlay-seed asset resolution path
only.

Locked first-intake constants:

- `endpointProfileId = "aviation-endpoint-overlay-profile"`
- `infrastructureProfileId = "oneweb-gateway-pool-profile"`

Locked first-intake resolved semantics:

- the mobile endpoint remains trajectory-unresolved and may remain
  coordinate-free
- the provider-managed anchor may remain coordinate-free
- infrastructure remains a OneWeb eligible gateway pool rather than an active
  gateway assignment

This lane may define only:

- the exact repo-owned asset home for the first-intake endpoint and
  infrastructure seeds
- the exact planned resolver contract that consumes the already-landed
  `ScenarioDefinition.context` profile IDs
- the exact-match resolution rule for those two IDs
- the exact error conditions for missing, unsupported, and duplicate
  `profileId` resolution
- the exact stop boundary for the future implementation slice

## Forbidden Scope

This lane must not widen into:

- `handover-decision` semantics or new first consumers for deferred
  multi-orbit semantics
- mobile trajectory ownership, mobile snapshot resolution, or trajectory-backed
  endpoint placement
- runtime overlay wiring
- render-facing overlay adapters
- `overlay-manager` ownership or new manager responsibilities
- Cesium-facing payloads or runtime handles
- HUD, panel, explainer, or presentation work
- repo-wide generic profile registries
- additional first-intake `profileId` values beyond the two locked constants
- active, serving, selected, ranked, or otherwise resolved gateway assignment

## Exact Asset Home

The exact repo-owned asset home for this lane is:

- `src/features/overlays/first-intake-overlay-seeds.ts`

That asset home is planned as:

- a TypeScript plain-data module only
- the first-intake authority surface for one endpoint seed bundle and one
  infrastructure seed bundle
- a consumer of the already-landed `EndpointOverlaySeed` and
  `InfrastructureOverlaySeed` public shapes from `overlay-seeds`

That asset home must not contain:

- `Viewer`
- `Entity`
- `JulianDate`
- Cesium-facing runtime payloads
- overlay runtime attach/detach state
- render callbacks
- runtime handles of any kind

The first-intake asset content is locked to:

- one `EndpointOverlaySeed` with
  `profileId = "aviation-endpoint-overlay-profile"`
- one `InfrastructureOverlaySeed` with
  `profileId = "oneweb-gateway-pool-profile"`

## Exact Resolver Contract

The exact planned resolver contract file for this lane is:

- `src/features/overlays/overlay-seed-resolution.ts`

The planned resolver input contract is:

- `Pick<ScenarioContextRef, "endpointProfileId" | "infrastructureProfileId">`

The planned resolver output contract is:

- `{ resolvedEndpointSeed: EndpointOverlaySeed; resolvedInfrastructureSeed: InfrastructureOverlaySeed }`

Resolver boundary rules:

- the resolver consumes only the two scenario-context profile IDs plus the
  repo-owned first-intake asset home
- the resolver returns only plain-data resolved seed bundles
- the resolver does not return runtime-facing overlay state, Cesium-facing
  payloads, handover state, or trajectory state

## Exact-Match Resolution Rule

The resolver must apply exact match only.

Endpoint resolution:

- `endpointProfileId` must match
  `"aviation-endpoint-overlay-profile"` exactly
- no alias, prefix, suffix, partial, fuzzy, or fallback matching is allowed

Infrastructure resolution:

- `infrastructureProfileId` must match
  `"oneweb-gateway-pool-profile"` exactly
- no alias, prefix, suffix, partial, fuzzy, or fallback matching is allowed

Family boundary:

- endpoint IDs resolve only against endpoint seed assets
- infrastructure IDs resolve only against infrastructure seed assets
- the first lane must not introduce a repo-wide registry or cross-family
  lookup path

## Missing / Unsupported / Duplicate `profileId` Errors

The future implementation slice must treat the following as explicit resolver
errors.

### Missing `profileId` Error

Raise a missing `profileId` error when:

- `endpointProfileId` is absent, blank, or otherwise not provided
- `infrastructureProfileId` is absent, blank, or otherwise not provided

### Unsupported `profileId` Error

Raise an unsupported `profileId` error when:

- `endpointProfileId` is non-empty but not exactly
  `"aviation-endpoint-overlay-profile"`
- `infrastructureProfileId` is non-empty but not exactly
  `"oneweb-gateway-pool-profile"`

### Duplicate `profileId` Error

Raise a duplicate `profileId` error when:

- more than one endpoint seed in the asset home matches
  `"aviation-endpoint-overlay-profile"`
- more than one infrastructure seed in the asset home matches
  `"oneweb-gateway-pool-profile"`

This lane does not allow "pick one" fallback behavior when duplicates exist.

## Exact Stop Boundary

This lane stops at plain-data bundle resolution only.

The future implementation slice may resolve only:

- `resolvedEndpointSeed`
- `resolvedInfrastructureSeed`

The resolved endpoint bundle may preserve:

- a trajectory-unresolved mobile endpoint with no coordinates
- a provider-managed anchor with no coordinates

The resolved infrastructure bundle may preserve only:

- a OneWeb eligible gateway pool

The resolved infrastructure bundle must not imply:

- active gateway assignment
- serving gateway assignment
- selected gateway assignment
- ranked gateway assignment

Nothing in this lane authorizes follow-on work in:

- `handover-decision`
- trajectory ownership
- overlay runtime or render application
- `overlay-manager`
- HUD or presentation seams

## Non-Goals

This lane is not trying to:

- reopen or modify ADR 0009
- replace the first-round contract/adapters lane
- widen `ScenarioDefinition.context` beyond the already-landed two profile IDs
- turn the seed asset home into a generic registry
- solve future multi-intake overlay resolution
- infer exact aircraft position truth
- infer exact GEO anchor coordinates
- infer active OneWeb gateway assignment
- authorize runtime implementation by itself

## Acceptance Criteria For The Future Implementation Slice

The future implementation slice for this lane is acceptable only when all of
the following are true:

1. `src/features/overlays/first-intake-overlay-seeds.ts` exists as a
   TypeScript plain-data module only.
2. That asset home contains exactly one first-intake endpoint seed with
   `profileId = "aviation-endpoint-overlay-profile"`.
3. That asset home contains exactly one first-intake infrastructure seed with
   `profileId = "oneweb-gateway-pool-profile"`.
4. The endpoint seed preserves the accepted first-intake semantics:
   trajectory-unresolved mobile endpoint may remain coordinate-free, and the
   provider-managed anchor may remain coordinate-free.
5. The infrastructure seed preserves the accepted first-intake semantics:
   OneWeb eligible gateway pool only, with no active gateway assignment.
6. `src/features/overlays/overlay-seed-resolution.ts` exists as a plain-data
   resolver seam only.
7. That resolver consumes only
   `Pick<ScenarioContextRef, "endpointProfileId" | "infrastructureProfileId">`
   and returns only
   `{ resolvedEndpointSeed: EndpointOverlaySeed; resolvedInfrastructureSeed: InfrastructureOverlaySeed }`.
8. The resolver uses exact-match only and rejects missing, unsupported, and
   duplicate `profileId` cases explicitly.
9. The slice does not widen into handover, trajectory, runtime, render, HUD,
   or `overlay-manager` work.
