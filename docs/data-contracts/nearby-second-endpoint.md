# Nearby Second-Endpoint Contract

## Purpose

`nearby-second-endpoint` is the dedicated repo-owned plain-data seam for
`M8A.2` runtime ownership widening. Its only job in this first slice is to
carry one accepted nearby fixed second endpoint for the addressed first intake
case without collapsing that ownership back into:

- `scenario`
- `overlay-seeds`
- `physical-input`
- `mobile-endpoint-trajectory`

This seam exists so the repo can adopt the accepted `YKA` package as runtime
data while keeping endpoint B unchanged as `provider-managed-anchor`.

## Current Public Source Of Truth

- `src/features/nearby-second-endpoint/nearby-second-endpoint.ts`
- `src/features/nearby-second-endpoint/accepted-nearby-second-endpoint-source-data.ts`
- `src/runtime/first-intake-nearby-second-endpoint-source.ts`
- `src/runtime/first-intake-nearby-second-endpoint-controller.ts`
- `docs/data-contracts/nearby-second-endpoint-info.md`
- `src/runtime/bootstrap/composition.ts`

## First Public Shape

```ts
type NearbySecondEndpointScenarioId = "app-oneweb-intelsat-geo-aviation";
type NearbySecondEndpointPositionPrecision =
  | "exact"
  | "facility-known"
  | "site-level";
type NearbySecondEndpointCoordinateReference = "WGS84";
type NearbySecondEndpointNarrativeRole = "nearby-fixed-second-endpoint";

interface NearbySecondEndpointSourceEntry {
  scenarioId: NearbySecondEndpointScenarioId;
  endpointId: string;
  endpointLabel: string;
  endpointType: string;
  geographyBucket: string;
  positionPrecision: NearbySecondEndpointPositionPrecision;
  coordinateReference: NearbySecondEndpointCoordinateReference;
  coordinates: {
    lat: number;
    lon: number;
  };
  narrativeRole: NearbySecondEndpointNarrativeRole;
  truthBoundary: {
    activeGatewayAssignment: "not-claimed";
    pairSpecificGeoTeleport: "not-claimed";
    measurementTruth: "not-claimed";
  };
}
```

`M8A.2` intentionally keeps this shape narrow:

- one accepted package only:
  `m8a-yka-operations-office-2026-04-23`
- one addressed first-intake scenario only:
  `app-oneweb-intelsat-geo-aviation`
- one nearby fixed endpoint only:
  `endpoint-yka-operations-office`
- one explicit truth-boundary block with no gateway, teleport, or measurement
  claims

## Accepted Package Ingestion

The first repo-owned ingestion seam is:

- `adaptAcceptedNearbySecondEndpointPackageToSourceEntry()`

The first repo-owned plain-data projection seam is:

- `ACCEPTED_NEARBY_SECOND_ENDPOINT_POSITION_PROJECTION`
  in `src/features/nearby-second-endpoint/accepted-nearby-second-endpoint-source-data.ts`

It adapts the accepted authority package:

- `itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23/authority-package.md`
- `itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23/position.json`
- `itri/multi-orbit/download/nearby-second-endpoints/m8a-yka-operations-office-2026-04-23/non-claims.md`

The adapter must preserve:

- the fixed first-case-only `scenarioId`
- endpoint identity, label, type, and geography bucket
- accepted `facility-known` precision
- `WGS84` coordinates
- `nearby-fixed-second-endpoint` narrative role
- explicit `not-claimed` truth boundary for:
  - `activeGatewayAssignment`
  - `pairSpecificGeoTeleport`
  - `measurementTruth`

It must not turn the accepted package into:

- a global endpoint registry
- an endpoint B rewrite
- a runtime/controller/render side-read of raw `itri` package files
- a source of physical-input or handover semantics

## Runtime Raw-Package Guardrail

The accepted `itri` package remains the implementation-time authority source,
but `M8A.2` runtime-owned code must read only the repo-owned plain-data seam:

- `src/features/nearby-second-endpoint/accepted-nearby-second-endpoint-source-data.ts`

That means:

- `src/runtime/first-intake-nearby-second-endpoint-source.ts` may preserve
  accepted package provenance strings in `sourceLineage`
- `src/runtime/first-intake-nearby-second-endpoint-controller.ts` may publish
  those provenance strings as metadata
- runtime/controller/render must not directly import or read:
  - `authority-package.md`
  - `position.json`
  - `non-claims.md`
  under `itri/multi-orbit/download/nearby-second-endpoints/...`

## Ownership Boundary

`nearby-second-endpoint` owns:

- the accepted nearby second-endpoint identity
- accepted coordinates plus precision
- the explicit nearby second-endpoint truth boundary
- the first runtime-visible proof seam for this package

`nearby-second-endpoint` does not own:

- scenario selection or addressed-session resolution
- endpoint A or endpoint B semantics
- overlay expression or Cesium marker ownership
- physical-input metrics
- mobile replay trajectory ownership
- handover decision semantics
- panel or narrative wording

## Runtime Proof

The first runtime-visible proof seam is:

- `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpoint`

`M8A.2` also mirrors the same state through document telemetry under the
existing first-intake namespace:

- `firstIntakeNearbySecondEndpoint*`

This controller exists only for the matched addressed first-intake owner path.
Default bootstrap routes and unsupported scenario ids must not publish this
capture or telemetry seam.

## M8A.4 Supplemental Info Surface

The supplemental info surface for this seam is documented separately in
[nearby-second-endpoint-info.md](./nearby-second-endpoint-info.md). It consumes
the runtime-owned nearby second-endpoint seam plus existing first-case
narrative context to explain the accepted YKA endpoint, its `facility-known`
precision, its `interior-bc-corridor-adjacent` geography bucket, and the
explicit non-claims. It must not side-read raw package files or widen this
contract into arbitrary endpoint selection.

## Scope Notes

This contract does not yet add:

- arbitrary endpoint selection
- a second operator pair
- `MEO`
