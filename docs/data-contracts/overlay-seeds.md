# Overlay Seed Contract

## Purpose

`overlay-seeds` is the repo-owned plain-data seam for the first multi-orbit
intake's endpoint and infrastructure profile bundles.

This contract exists so:

- `scenario` can keep only narrow `endpointProfileId` /
  `infrastructureProfileId` references
- `physical-input` can stay metric-projection-owned
- overlay profile data can land without widening runtime, render, HUD, or
  trajectory ownership

## Current Public Source Of Truth

- `src/features/overlays/overlay-seeds.ts`
- `src/features/overlays/first-intake-overlay-seeds.ts`
- `src/features/overlays/overlay-seed-resolution.ts`
- `src/features/overlays/index.ts`

## Current Public Shape

```ts
type OverlaySeedCoordinatePrecision =
  | "exact"
  | "facility-known"
  | "site-level";

interface OverlaySeedCoordinates {
  lat: number;
  lon: number;
  precision: OverlaySeedCoordinatePrecision;
}

interface EndpointOverlaySeed {
  profileId: string;
  endpoints: EndpointOverlayNode[];
}

interface EndpointOverlayNode {
  endpointId: string;
  role: "endpoint-a" | "endpoint-b";
  entityType: string;
  positionMode: string;
  mobilityKind: "fixed" | "mobile" | "logical";
  renderClass: string;
  coordinates?: OverlaySeedCoordinates;
  notes?: string;
}

interface InfrastructureOverlaySeed {
  profileId: string;
  nodes: InfrastructureOverlayNode[];
}

interface InfrastructureOverlayNode {
  nodeId: string;
  provider: string;
  nodeType: string;
  networkRoles: string[];
  lat: number;
  lon: number;
  precision: OverlaySeedCoordinatePrecision;
  sourceAuthority?: string;
  notes?: string;
}
```

## First-Slice Rules

- both seed families stay keyed by `profileId`; do not add `scenarioId`
- `positionMode` and `renderClass` stay adapter-facing open strings in the
  first slice
- `mobile-snapshot-required` endpoints may omit `coordinates`
- `provider-managed-anchor` endpoints may omit `coordinates`
- infrastructure stays a profile-owned node pool and must not imply active
  gateway assignment
- first-intake asset resolution consumes only `endpointProfileId` /
  `infrastructureProfileId`, applies exact profile-id match only, and raises
  explicit missing, unsupported, and duplicate `profileId` errors
- both seeds stay serializable plain-data only and must not expose Cesium
  runtime classes, adapter instances, or HUD/render handles

## Ownership Boundary

`overlay-seeds` owns:

- endpoint and infrastructure profile bundles
- plain-data coordinate precision labeling
- narrow first-slice validation of those bundles

`overlay-seeds` does not own:

- scenario lifecycle or source switching
- physical-input metrics or provenance
- handover semantics
- runtime overlay rendering
- mobile-endpoint trajectory ingestion
