# M8A Runtime Ownership Widening Plan

Source note: this file defines the narrow runtime ownership needed for `M8A`.
It exists so the repo can carry a nearby second endpoint as its own seam
without mutating the closed first-case baseline into a generic endpoint
selection framework.

Related expansion authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related authority package plan: see
[./m8a-second-endpoint-authority-package-plan.md](./m8a-second-endpoint-authority-package-plan.md).
Related first-case runtime seam: see
[../data-contracts/scenario.md](../data-contracts/scenario.md),
[../data-contracts/overlay-seeds.md](../data-contracts/overlay-seeds.md), and
[../data-contracts/mobile-endpoint-trajectory.md](../data-contracts/mobile-endpoint-trajectory.md).

## Status

- Planning-only runtime ownership SDD
- Pre-implementation only
- No rendering or HUD authority by itself

## Purpose

This file answers one narrow question:

How should the repo carry a nearby second endpoint at runtime without
overloading the existing first-intake `scenario`, `overlay-seeds`,
`physical-input`, or `mobile-endpoint-trajectory` seams?

## Core Runtime Decision

`M8A` must not repurpose the existing first-case meaning of:

- `endpoint-a = aircraft-side connectivity stack`
- `endpoint-b = provider-managed GEO anchor`

Instead, `M8A` introduces a supplemental runtime-owned seam for:

- one accepted nearby second endpoint

That means the second endpoint is:

- additional
- runtime-owned
- bounded to the first addressed case

It is **not** a semantic rewrite of endpoint B.

## Planned Contract Home

The future plain-data contract home for this seam is:

- `src/features/nearby-second-endpoint/nearby-second-endpoint.ts`

The future runtime source/controller homes are planned as:

- `src/runtime/first-intake-nearby-second-endpoint-source.ts`
- `src/runtime/first-intake-nearby-second-endpoint-controller.ts`

The future public contract doc home is planned as:

- `docs/data-contracts/nearby-second-endpoint.md`

## Planned Public Shape

The first public shape should stay narrow and serializable:

```ts
interface NearbySecondEndpointSourceEntry {
  scenarioId: "app-oneweb-intelsat-geo-aviation";
  endpointId: string;
  endpointLabel: string;
  endpointType: string;
  geographyBucket: string;
  positionPrecision: "exact" | "facility-known" | "site-level";
  coordinateReference: "WGS84";
  coordinates: {
    lat: number;
    lon: number;
  };
  narrativeRole: "nearby-fixed-second-endpoint";
  truthBoundary: {
    activeGatewayAssignment: "not-claimed";
    pairSpecificGeoTeleport: "not-claimed";
    measurementTruth: "not-claimed";
  };
}
```

This shape must stay:

- plain-data only
- single-endpoint only for the first `M8A` line
- first-case-only

## Ownership Boundary

This new seam owns:

- accepted second endpoint identity
- accepted second endpoint coordinates + precision
- explicit nearby-second-endpoint truth boundary

This new seam does not own:

- scenario selection UX
- physical-input projection
- handover decisions
- aircraft corridor ingestion
- overlay rendering
- satcom panel wording

## Runtime Resolution Rule

The new seam must resolve only when all of these are true:

1. the addressed scenario is exactly `app-oneweb-intelsat-geo-aviation`
2. the first-intake runtime surface owns the active scenario session
3. one accepted second-endpoint package exists

It must not resolve:

- for default bootstrap paths
- for unsupported scenario IDs
- as a global registry

## Capture / Telemetry Rule

The future controller should join the existing first-intake proof lineage
rather than inventing a parallel telemetry family.

That means the future controller may expose:

- one net-new field on `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__`
- one namespaced addition to the existing document-telemetry stream

But those surfaces must read only:

- the runtime-owned second-endpoint seam
- not raw package files directly

Planned naming rule:

- capture seam joins the existing first-intake capture payload as
  `firstIntakeNearbySecondEndpoint`
- document telemetry joins the existing first-intake telemetry namespace under
  `firstIntakeNearbySecondEndpoint*`

This first slice does not authorize a standalone second capture root or a
parallel unrelated telemetry family.

## Acceptance Criteria For The Future Implementation Slice

The future runtime widening slice is acceptable only when:

1. the repo has one dedicated plain-data contract for the nearby second
   endpoint
2. that contract stays separate from `scenario`, `overlay-seeds`,
   `physical-input`, and `mobile-endpoint-trajectory`
3. endpoint B remains `provider-managed-anchor`
4. the new seam activates only for the addressed first-case lane
5. the new seam preserves explicit non-claims for gateway/teleport/measurement
   truth

## Stop Boundary

This file does not authorize:

- globe markers
- animated relation lines
- panel UI
- satcom copy changes
- second-case selector behavior
