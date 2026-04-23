# Mobile Endpoint Trajectory Contract

## Purpose

`mobile-endpoint-trajectory` is the dedicated repo-owned plain-data seam for
accepted historical mobile corridor packages. In `M6 Slice A`, its only job is
to ingest the accepted aircraft corridor package for the first multi-orbit case
without forcing that ownership into:

- `scenario`
- `overlay-seeds`
- `physical-input`

This seam exists so the viewer can keep corridor truth as replayable historical
trajectory provenance while still leaving equipage truth and active-service
truth explicitly unproven.

## Current Public Source Of Truth

- `src/features/mobile-endpoint-trajectory/mobile-endpoint-trajectory.ts`
- `src/runtime/first-intake-mobile-endpoint-trajectory-source.ts`
- `src/runtime/first-intake-mobile-endpoint-trajectory-controller.ts`
- `src/runtime/first-intake-mobile-endpoint-trajectory-consumer-controller.ts`
- `src/runtime/bootstrap/composition.ts`

## First Public Shape

```ts
type MobileEndpointTrajectoryTruthKind = "historical-corridor-package";
type MobileEndpointTrajectoryCoordinateReference = "WGS84";

interface MobileEndpointTrajectoryPoint {
  sequence: number;
  pointTimeUtc: string;
  offsetSeconds: number;
  lon: number;
  lat: number;
  onGround: boolean;
  altitudeBaroFt: number | null;
  altitudeGeomFt: number | null;
  groundSpeedKt: number | null;
  headingDeg: number | null;
  baroRateFpm: number | null;
  sourceCode: string;
}

interface MobileEndpointTrajectoryPackage {
  recordId: string;
  seedId: string;
  truthKind: MobileEndpointTrajectoryTruthKind;
  coordinateReference: MobileEndpointTrajectoryCoordinateReference;
  waypointCount: number;
  windowStartUtc: string;
  windowEndUtc: string;
  sourceFamily: string;
  sourceService: string;
  artifactType: "GeoJSON";
  artifactPath: string;
  artifactHashSha256: string;
  points: ReadonlyArray<MobileEndpointTrajectoryPoint>;
}

interface MobileEndpointTrajectoryTruthBoundary {
  corridorTruth: "replayable-historical-trajectory-package";
  equipageTruth: "not-proven-at-tail-level";
  serviceTruth: "not-proven-active-on-this-flight";
  identifierSemantics: "audit-only";
  onewebGatewaySemantics: "eligible-pool-only";
  geoAnchorSemantics: "provider-managed-anchor";
  activeGatewayAssignment: "not-claimed";
  pairSpecificGeoTeleport: "not-claimed";
}

interface MobileEndpointTrajectorySourceEntry {
  scenarioId: string;
  endpointId: string;
  endpointRole: "endpoint-a" | "endpoint-b";
  mobilityKind: "mobile";
  trajectory: MobileEndpointTrajectoryPackage;
  truthBoundary: MobileEndpointTrajectoryTruthBoundary;
}
```

`M6 Slice A` intentionally keeps this shape narrow:

- one accepted first-case package only
- one mobile endpoint only: `aircraft-stack`
- one historical replay artifact only
- one explicit truth-boundary block separating corridor truth from
  equipage/service truth

## Accepted Package Ingestion

The first repo-owned ingestion seam is:

- `adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry()`

It adapts the accepted corridor package:

- `itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21/trajectory-source-record.json`
- `itri/multi-orbit/download/aircraft-corridors/ac-cgojz-crj900-c06aa4-2026-04-21/artifacts/normalized/trajectory-replay.geojson`

The adapter must preserve:

- `recordId`
- `seedId`
- replay window start/stop
- `WGS84`
- `447` waypoints
- replay artifact path + SHA-256 hash

It must not convert:

- `ICAO24`
- registration
- tail-like provenance

into runtime equipage or active-service truth.

## Ownership Boundary

`mobile-endpoint-trajectory` owns:

- accepted mobile corridor package identity
- replayable historical trajectory points
- artifact-level provenance
- explicit corridor/equipage/service truth-boundary labeling

`mobile-endpoint-trajectory` does not own:

- scenario identity or scenario switching
- overlay seed resolution
- physical-input metrics
- handover decision semantics
- playback/render runtime
- aircraft marker animation

## Runtime Proof

The first runtime-visible proof seam is:

- `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectory`

`M6 Slice A` also mirrors the same ingestion state through document telemetry so
smoke and validation readers can confirm:

- the accepted package was ingested
- the waypoint count stayed frozen
- the truth boundary stayed explicit

## First Active-Case Consumer

`M6 Slice B` adds the first runtime-local consumer for the seam:

- consumer seam:
  `createFirstIntakeMobileEndpointTrajectoryConsumerController()`
- runtime trajectory seam read:
  `createFirstIntakeMobileEndpointTrajectoryController()`
  via `trajectoryController.getState().trajectory`
- consumer proof seam:
  `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectoryConsumer`

This consumer exists only for the matched addressed first-intake owner path and
must not side-read:

- `freeze-record.md`
- `trajectory-source-record.json`
- raw package artifacts

It is allowed to communicate only the bounded corridor facts already carried by
the runtime seam, including:

- accepted corridor package id
- historical replay package nature
- waypoint/window provenance
- `not-proven-at-tail-level`
- `not-proven-active-on-this-flight`

## Scope Notes

This contract does not yet add:

- playback ownership
- render ownership
- active service inference
- active gateway assignment
- pair-specific GEO teleport claims
- tail-level equipage claims
