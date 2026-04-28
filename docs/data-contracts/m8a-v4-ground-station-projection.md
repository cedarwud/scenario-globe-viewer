# M8A-V4 Ground-Station Projection Contract

Source note: this is the accepted planning-stage projection contract for
`M8A-V4.2`. It does not create runtime, frontend, render code, or an
implementation prompt. It defines the viewer-owned projected artifact that
must exist before `M8A-V4.3` runtime implementation can begin.

Related V4 SDD:
[../sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md](../sdd/m8a-v4-ground-station-multi-orbit-handover-plan.md).
Related endpoint-pair authority package:
[../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md](../../../itri/multi-orbit/download/ground-station-endpoint-pairs/taiwan-cht-speedcast-singapore-operator-family-2026-04-26/authority-package.md).
Accepted projected artifact:
[../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json](../../public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json).
Related V4.6B source/projection artifact:
[../../public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json](../../public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json).
Related V4.6B projection record:
[../sdd/m8a-v4.6b-source-lineaged-orbit-actor-projection.md](../sdd/m8a-v4.6b-source-lineaged-orbit-actor-projection.md).
Related V4.6D simulation handover model contract:
[../sdd/m8a-v4.6d-simulation-handover-model-contract.md](../sdd/m8a-v4.6d-simulation-handover-model-contract.md).

## Status

- accepted projection contract
- docs-only
- no runtime implementation authority
- accepted viewer-owned projected artifact:
  `public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json`
- accepted V4.6B source/projection actor-enrichment artifact:
  `public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json`
- V4.6B runtime consumption exists at commit `ddbd21c`
- accepted V4.6D model contract id:
  `m8a-v4.6d-simulation-handover-model.v1`
- endpoint A/B remain accepted only at operator-family precision

## Purpose

The viewer must not side-read raw `itri` research packages at runtime. V4.2
therefore defines one viewer-owned projected artifact shape that separates:

- raw endpoint source truth from display marker position
- coordinate-free operator-family precision from bounded visual anchors
- orbit evidence chips from active serving-satellite truth
- source lineage from renderer-owned display data
- modeled service-state inputs from measured operational truth

## Runtime Boundary

Runtime, controller, render, and UI code may consume only the accepted
viewer-owned projected artifact or a repo-owned module generated from it.

They must not read, import, fetch, or resolve:

- `itri/multi-orbit/download/...`
- endpoint-pair raw files such as `endpoint-a.json`, `endpoint-b.json`, or
  `orbit-evidence-matrix.json`
- raw source reports, candidate matrices, or external live feeds
- donor project folders

The accepted pattern is:

1. raw `itri` authority package
2. offline repo-owned projection step
3. viewer-owned projected plain-data artifact
4. V4 runtime consumption of only that artifact

## Accepted Artifact Location

The accepted V4.2 plain-data artifact is:

`public/fixtures/ground-station-projections/m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26.json`

The accepted V4.6B source/projection actor-enrichment artifact is:

`public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json`

This V4.6B artifact keeps the same endpoint pair and precision policy while
expanding only the source-lineaged `LEO/MEO/GEO` display-context actor set.
It is accepted as a projection gate, not as runtime rendering implementation.

This path follows the existing viewer-owned fixture pattern under
`public/fixtures/` while staying separate from runtime modules. Source paths
inside the artifact are lineage metadata only; V4.3 runtime code must not open
or resolve the raw `itri` package from those strings.

## Artifact Envelope

The projected artifact is serializable plain data with this envelope:

```ts
interface V4GroundStationProjectionArtifact {
  schemaVersion: "m8a-v4-ground-station-projection.v1";
  artifactId: string;
  scenarioId: "m8a-v4-ground-station-multi-orbit-handover";
  artifactStatus: "draft" | "accepted";
  projectionEpochUtc: string;
  sourcePackage: V4SourcePackageLineage;
  precisionPolicy: V4PrecisionPolicy;
  endpoints: readonly [V4ProjectedEndpoint, V4ProjectedEndpoint];
  orbitEvidenceMatrix: V4OrbitEvidenceMatrix;
  orbitActors: ReadonlyArray<V4ProjectedOrbitActor>;
  serviceStateModel: V4ModeledServiceStateModel;
  simulationHandoverModel?: V46dSimulationHandoverModel;
  nonClaims: V4NonClaimSet;
  validationExpectations: V4ProjectionValidationExpectations;
}
```

## Source Package Lineage

The artifact must preserve source lineage without making runtime read raw
source files:

```ts
interface V4SourcePackageLineage {
  packageId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  packageDate: "2026-04-26";
  packageAuthority: "itri/multi-orbit endpoint-pair authority package";
  sourceFiles: ReadonlyArray<{
    label:
      | "authority-package.md"
      | "endpoint-a.json"
      | "endpoint-b.json"
      | "orbit-evidence-matrix.json"
      | "position-and-precision.md"
      | "non-claims.md"
      | "acceptance.md";
    sourcePath: string;
    sourceRole: string;
  }>;
  projectedBy: string;
  projectionNotes: string;
}
```

`sourcePath` is lineage metadata only. Runtime must not open those paths.

Evidence references inside projected records should be copied into viewer-owned
lineage objects:

```ts
interface V4EvidenceSourceRef {
  sourceRefId: string;
  label: string;
  url?: string;
  accessedDate?: string;
  supports: ReadonlyArray<string>;
  sourceAuthority:
    | "endpoint-pair-authority-package"
    | "operator-public-source"
    | "projection-note";
}
```

## Precision Policy

Both endpoints must remain operator-family-only. V4.2 must not upgrade either
endpoint to site-family, site-level, same-site, active-gateway, or measured
truth.

```ts
interface V4PrecisionPolicy {
  acceptedPairPrecision: "operator-family-only";
  endpointPrecisionSymmetry: "both-endpoints-operator-family";
  sourceCoordinateStatus: "raw-endpoint-coordinates-null";
  renderMarkerPolicy: "bounded-operator-family-display-anchor";
  requiredDisclosureLabel: "operator-family precision";
  forbiddenUpgrades: ReadonlyArray<
    | "exact-site"
    | "site-family"
    | "same-site-leo-meo-geo"
    | "active-gateway"
    | "active-serving-satellite"
    | "pair-specific-teleport-path"
    | "measured-performance"
    | "native-rf-handover"
  >;
}
```

## Projected Endpoint

Each endpoint entry must carry source truth and render marker fields as
separate objects:

```ts
interface V4ProjectedEndpoint {
  endpointId:
    | "tw-cht-multi-orbit-ground-infrastructure"
    | "sg-speedcast-singapore-teleport";
  endpointRole: "endpoint-a" | "endpoint-b";
  endpointLabel: string;
  sourceTruth: V4EndpointSourceTruth;
  renderMarker: V4EndpointRenderMarker;
  coordinatePrecision: V4EndpointCoordinatePrecision;
  orbitEvidenceChips: readonly [
    V4OrbitEvidenceChip,
    V4OrbitEvidenceChip,
    V4OrbitEvidenceChip
  ];
  sourceLineage: ReadonlyArray<V4EvidenceSourceRef>;
  truthBoundary: V4TruthBoundary;
}
```

### Endpoint Source Truth

```ts
interface V4EndpointSourceTruth {
  countryOrRegion: "Taiwan" | "Singapore";
  operatorOrSiteFamily: string;
  sourceEndpointRole:
    | "operator-ground-infrastructure-endpoint"
    | "teleport-endpoint";
  infrastructureRole: string;
  acceptedPrecision: "operator-family-only";
  coordinatePrecision: "operator-family";
  sourceCoordinates: {
    lat: null;
    lon: null;
    heightMeters: null;
  };
  coordinateBasis: string;
  runtimeEligibilityFromSourcePackage: "planning-authority-only";
  unresolvedProof: ReadonlyArray<string>;
}
```

### Render Marker

The render marker is a bounded visual anchor selected by the viewer projection,
not an exact source coordinate.

```ts
interface V4EndpointRenderMarker {
  markerId: string;
  markerClass: "bounded-operator-family-marker";
  displayAnchorKind:
    | "taiwan-cht-operator-family-anchor"
    | "speedcast-singapore-teleport-operator-family-anchor";
  displayPosition: {
    lat: number;
    lon: number;
    heightMeters: number;
    coordinateFrame: "wgs84";
  };
  displayPositionBasis: string;
  displayPositionPrecision: "bounded-operator-family-display-anchor";
  displayRadiusMeters?: number;
  label: string;
  requiredPrecisionBadge: "operator-family precision";
  sourceTruthCoordinatesAreRenderable: false;
  displayPositionIsSourceTruth: false;
  mustNotImply: ReadonlyArray<string>;
}
```

V4.2 may choose display positions in the later projected artifact, but the
projection must document the basis for each position. The current raw endpoint
package intentionally provides no renderable latitude/longitude.

### Coordinate Precision

```ts
interface V4EndpointCoordinatePrecision {
  sourceCoordinatePrecision: "operator-family";
  acceptedPrecision: "operator-family-only";
  renderPrecision: "bounded-operator-family-display-anchor";
  precisionDisclosure: "operator-family precision";
  exactSiteAccepted: false;
  sameSiteLeoMeoGeoAccepted: false;
}
```

## Orbit Evidence Chips

Each endpoint must expose compact evidence chips for all three accepted orbit
classes, while preserving operator-family precision:

```ts
interface V4OrbitEvidenceChip {
  orbitClass: "leo" | "meo" | "geo";
  grade: "strong";
  acceptedPrecision: "operator-family-only";
  evidenceState: "evidence-backed-operator-family";
  chipLabel: "LEO strong" | "MEO strong" | "GEO strong";
  sourceRefs: ReadonlyArray<string>;
  notes: string;
  chipNonClaims: ReadonlyArray<
    | "not-same-site-proof"
    | "not-active-serving-satellite"
    | "not-active-gateway"
    | "not-pair-specific-path"
  >;
}
```

The pair-level evidence matrix should keep:

```ts
interface V4OrbitEvidenceMatrix {
  pairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  strictThreeOrbitEligible: true;
  acceptedPrecision: "operator-family-only";
  acceptedOrbitClassesForRuntime: readonly ["leo", "meo", "geo"];
  fallbackMode: "not-used";
  endpointA: Record<"leo" | "meo" | "geo", "strong">;
  endpointB: Record<"leo" | "meo" | "geo", "strong">;
  strictEligibilityBoundary: string;
}
```

## Orbit Actors

V4.3 may render orbit actors only from source-lineaged projected actor records.
The endpoint evidence chips do not themselves create actor positions.

```ts
interface V4ProjectedOrbitActor {
  actorId: string;
  orbitClass: "leo" | "meo" | "geo";
  displayRole:
    | "leo-moving-context-actor"
    | "meo-moving-context-actor"
    | "geo-continuity-anchor";
  operatorContext: string;
  sourceLineage: ReadonlyArray<V4EvidenceSourceRef>;
  sourceEpochUtc: string;
  projectionEpochUtc: string;
  freshnessClass:
    | "source-epoch-aligned"
    | "fresh-display-context"
    | "stale-display-context"
    | "operator-anchor-only";
  sourcePosition: V4ActorSourcePosition;
  renderPosition: V4ActorRenderPosition;
  motionMode:
    | "replay-driven"
    | "fixed-earth-relative"
    | "near-fixed-geo-anchor";
  evidenceClass: "display-context" | "modeled-service-context";
  modelAssetId: string;
  modelTruth: "generic-satellite-mesh";
  nonClaims: V4NonClaimSet;
}
```

Actor records must not claim active serving satellite identity unless a later
authority package explicitly accepts that stronger truth.

```ts
type V4ActorSourcePosition =
  | {
      positionKind: "source-orbit-position";
      lat: number;
      lon: number;
      heightMeters: number;
      coordinateFrame: "wgs84";
      precision: string;
    }
  | {
      positionKind: "operator-anchor-only";
      lat: null;
      lon: null;
      heightMeters: null;
      precision: "no-source-position";
    };

interface V4ActorRenderPosition {
  positionKind:
    | "sampled-replay-position"
    | "fixed-display-anchor"
    | "near-fixed-geo-anchor";
  lat: number;
  lon: number;
  heightMeters: number;
  coordinateFrame: "wgs84";
  renderPositionBasis: string;
  renderPositionIsSourceTruth: boolean;
}
```

## Modeled Service-State Inputs

The projection must include modeled service-state inputs so V4.3 does not
invent handover state inside render code.

```ts
interface V4ModeledServiceStateModel {
  modelId: "m8a-v4-modeled-service-state.v1";
  decisionModel: "modeled-service-continuity";
  isNativeRfHandover: false;
  truthState: "modeled";
  truthBoundaryLabel: "operator-family-bounded-service-state";
  timeline: ReadonlyArray<V4ServiceStateWindow>;
  candidateSet: ReadonlyArray<V4ServiceCandidate>;
  metricPolicy: V4ModeledMetricPolicy;
}

interface V4ServiceStateWindow {
  windowId: string;
  startRatio: number;
  stopRatio: number;
  currentPrimaryOrbitClass: "leo" | "meo" | "geo";
  nextCandidateOrbitClass: "leo" | "meo" | "geo";
  visibleCandidateOrbitClasses: ReadonlyArray<"leo" | "meo" | "geo">;
  continuityFallbackOrbitClass: "geo";
  handoverPressureReason:
    | "leo-geometry-changing"
    | "leo-candidate-aging"
    | "meo-continuity-context"
    | "geo-fallback-continuity"
    | "policy-balanced-continuity";
  reasonSignals: ReadonlyArray<string>;
  boundedMetricsUsed: ReadonlyArray<
    "latency-class" | "jitter-class" | "network-speed-class" | "continuity-class"
  >;
  stateEvidenceClass: "modeled-service-state";
}

interface V4ServiceCandidate {
  candidateId: string;
  orbitClass: "leo" | "meo" | "geo";
  pathRole: "primary" | "candidate" | "fallback" | "context";
  endpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  sourceEvidenceClass: "operator-family-evidence";
  serviceStateInputKind: "modeled";
}

interface V4ModeledMetricPolicy {
  metricTruth: "modeled-bounded-input";
  measuredLatency: false;
  measuredJitter: false;
  measuredThroughput: false;
  allowedMetricLabels: readonly [
    "latency class",
    "jitter class",
    "network speed class",
    "continuity class"
  ];
}
```

## V4.6D Simulation Handover Model Extension

`V4.6D` adds an accepted simulation handover model contract on top of the
existing projection seam. This is an additive contract extension. It does not
retroactively invalidate the accepted V4.2 or V4.6B artifacts, and it does not
authorize runtime implementation by itself.

The accepted model id is:

`m8a-v4.6d-simulation-handover-model.v1`

The model must preserve the current V4.6B runtime baseline:

- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision: `operator-family-only`
- runtime actor set: `6` LEO, `5` MEO, `2` GEO display-context actors
- source boundary: repo-owned projection artifact/module only

```ts
type V46dActorId =
  | "oneweb-0386-leo-display-context"
  | "oneweb-0537-leo-display-context"
  | "oneweb-0701-leo-display-context"
  | "oneweb-0012-leo-display-context"
  | "oneweb-0249-leo-display-context"
  | "oneweb-0702-leo-display-context"
  | "o3b-mpower-f6-meo-display-context"
  | "o3b-mpower-f1-meo-display-context"
  | "o3b-mpower-f2-meo-display-context"
  | "o3b-mpower-f4-meo-display-context"
  | "o3b-mpower-f3-meo-display-context"
  | "st-2-geo-continuity-anchor"
  | "ses-9-geo-display-context";

interface V46dSimulationHandoverModel {
  modelId: "m8a-v4.6d-simulation-handover-model.v1";
  modelStatus: "accepted-contract";
  modelScope: "deterministic-display-context-state-machine";
  modelTruth: "simulation-output-not-operator-log";
  endpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  acceptedPairPrecision: "operator-family-only";
  route: "/?scenePreset=regional&m8aV4GroundStationScene=1";
  inputs: V46dSimulationHandoverInputs;
  timeline: readonly [
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow,
    V46dSimulationHandoverWindow
  ];
  validationExpectations: V46dSimulationHandoverValidationExpectations;
  forbiddenClaimScan: V46dForbiddenClaimScanPolicy;
}

interface V46dSimulationHandoverInputs {
  replayRatio: number;
  replayRatioPolicy: "normalized-zero-to-one-over-v4.6a-full-leo-replay";
  windowSelection: "deterministic-ratio-window";
  endpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  acceptedPairPrecision: "operator-family-only";
  actorSetSource: "v4.6b-repo-owned-projection-runtime-module";
  actorIds: ReadonlyArray<V46dActorId>;
  metricPolicy: V46dBoundedMetricPolicy;
  runtimeSourceBoundary: "repo-owned-projection-or-generated-module-only";
}

interface V46dBoundedMetricPolicy {
  metricTruth: "modeled-bounded-class-not-measured";
  numericLatencyAllowed: false;
  numericJitterAllowed: false;
  numericThroughputAllowed: false;
  allowedMetricClasses: readonly [
    "latency-class",
    "jitter-class",
    "network-speed-class",
    "continuity-class"
  ];
}

interface V46dSimulationHandoverWindow {
  windowId:
    | "leo-acquisition-context"
    | "leo-aging-pressure"
    | "meo-continuity-hold"
    | "leo-reentry-candidate"
    | "geo-continuity-guard";
  startRatioInclusive: number;
  stopRatioExclusive: number;
  stopPolicy: "exclusive-except-final-window";
  displayRepresentativeOrbitClass: "leo" | "meo" | "geo";
  displayRepresentativeActorId: V46dActorId;
  candidateContextOrbitClasses: ReadonlyArray<"leo" | "meo" | "geo">;
  candidateContextActorIds: ReadonlyArray<V46dActorId>;
  fallbackContextOrbitClasses: readonly ["geo"];
  fallbackContextActorIds: ReadonlyArray<V46dActorId>;
  handoverPressureReason:
    | "leo-display-geometry-acquisition"
    | "leo-display-geometry-aging"
    | "meo-continuity-hold"
    | "leo-display-geometry-reentry"
    | "geo-continuity-guard";
  reasonSignalClasses: ReadonlyArray<string>;
  boundedMetricClasses: {
    metricTruth: "modeled-bounded-class-not-measured";
    latencyClass:
      | "leo-low-latency-context-class"
      | "meo-mid-latency-context-class"
      | "geo-higher-latency-continuity-class";
    jitterClass:
      | "changing-geometry-class"
      | "continuity-hold-class"
      | "continuity-guard-class";
    networkSpeedClass:
      | "candidate-capacity-context-class"
      | "continuity-context-class"
      | "guard-context-class";
    continuityClass:
      | "acquisition-context-class"
      | "pressure-context-class"
      | "hold-context-class"
      | "reentry-context-class"
      | "guard-context-class";
  };
  nonClaims: V46dWindowNonClaims;
}

interface V46dWindowNonClaims {
  noRealOperatorHandoverEvent: true;
  noActiveServingSatelliteIdentity: true;
  noActiveGatewayAssignment: true;
  noPairSpecificTeleportPathTruth: true;
  noMeasuredLatencyJitterThroughputTruth: true;
  noNativeRfHandover: true;
  noEndpointPairOrPrecisionChange: true;
  noR2RuntimeSelector: true;
  noRawItriOrLiveExternalRuntimeSource: true;
}

interface V46dSimulationHandoverValidationExpectations {
  expectedModelId: "m8a-v4.6d-simulation-handover-model.v1";
  expectedEndpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  expectedPrecision: "operator-family-only";
  expectedActorCounts: {
    leo: 6;
    meo: 5;
    geo: 2;
  };
  expectedWindowIds: readonly [
    "leo-acquisition-context",
    "leo-aging-pressure",
    "meo-continuity-hold",
    "leo-reentry-candidate",
    "geo-continuity-guard"
  ];
  windowsMustCoverZeroToOneWithoutGaps: true;
  actorIdsMustExistInV46bActorSet: true;
  actorOrbitClassesMustMatchModelRoles: true;
  endpointPairAndPrecisionMustRemainUnchanged: true;
  runtimeRawItriSideReadAllowed: false;
  measuredMetricTruthAllowed: false;
  requiredWindowNonClaimKeys: ReadonlyArray<keyof V46dWindowNonClaims>;
}

interface V46dForbiddenClaimScanPolicy {
  scanPositiveClaimFields: true;
  scanRuntimeLabelsDerivedFromModel: true;
  allowForbiddenConceptsOnlyInNegatedFields: true;
  negatedFieldNames: readonly [
    "nonClaims",
    "doesNotClaim",
    "requiredDisclosures",
    "validationExpectations",
    "forbiddenClaimScan"
  ];
  forbiddenModelKeys: ReadonlyArray<
    | "servingSatelliteId"
    | "activeServingSatelliteId"
    | "activeGatewayId"
    | "gatewayAssignmentId"
    | "teleportPathId"
    | "latencyMs"
    | "jitterMs"
    | "throughputMbps"
    | "throughputGbps"
    | "rfHandoverId"
    | "operatorHandoverEventId"
  >;
}
```

Accepted state windows:

| Window | Ratio range | Display representative | Candidate context ids | Fallback context ids |
| --- | --- | --- | --- | --- |
| `leo-acquisition-context` | `[0.00, 0.20)` | `oneweb-0386-leo-display-context` | `oneweb-0537-leo-display-context`, `oneweb-0701-leo-display-context`, `o3b-mpower-f6-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` |
| `leo-aging-pressure` | `[0.20, 0.40)` | `oneweb-0537-leo-display-context` | `oneweb-0012-leo-display-context`, `oneweb-0249-leo-display-context`, `o3b-mpower-f1-meo-display-context`, `o3b-mpower-f2-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` |
| `meo-continuity-hold` | `[0.40, 0.60)` | `o3b-mpower-f6-meo-display-context` | `o3b-mpower-f1-meo-display-context`, `o3b-mpower-f2-meo-display-context`, `o3b-mpower-f4-meo-display-context`, `o3b-mpower-f3-meo-display-context`, `oneweb-0702-leo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` |
| `leo-reentry-candidate` | `[0.60, 0.82)` | `oneweb-0702-leo-display-context` | `oneweb-0012-leo-display-context`, `oneweb-0249-leo-display-context`, `oneweb-0386-leo-display-context`, `o3b-mpower-f4-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` |
| `geo-continuity-guard` | `[0.82, 1.00]` | `st-2-geo-continuity-anchor` | `ses-9-geo-display-context`, `o3b-mpower-f3-meo-display-context`, `oneweb-0701-leo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` |

Accepted role names are:

- `displayRepresentativeActorId`
- `candidateContextActorIds`
- `fallbackContextActorIds`

Forbidden role names include:

- `servingSatelliteId`
- `activeServingSatelliteId`
- `activeGatewayId`
- `gatewayAssignmentId`
- `teleportPathId`

`V4.6D` validation must prove:

- windows cover `0..1` with no gaps and no overlaps
- every referenced actor id exists in the V4.6B actor set
- representative, candidate, and fallback actor orbit classes match their
  declared model roles
- endpoint pair and precision remain unchanged
- every window carries the required non-claims
- metric fields remain bounded classes and contain no numeric measured
  latency, jitter, throughput, or continuity values
- runtime source-boundary checks remain required for later implementation
- forbidden-claim scanning is explicit and machine-checkable

## Truth Boundary And Non-Claims

The projected artifact must carry machine-readable non-claims that can be
surfaced by validation and compact UI badges:

```ts
interface V4NonClaimSet {
  noExactSiteSelection: true;
  noSameSiteLeoMeoGeoProof: true;
  noLiveCrossOrbitHandoverProof: true;
  noActiveServingSatelliteIdentity: true;
  noActiveGatewayAssignment: true;
  noPairSpecificTeleportPathTruth: true;
  noMeasuredLatencyJitterThroughputTruth: true;
  noNativeRfHandover: true;
  noAircraftEndpoint: true;
  noOrdinaryHandsetUe: true;
}

interface V4TruthBoundary {
  doesClaim: ReadonlyArray<string>;
  doesNotClaim: ReadonlyArray<string>;
  requiredDisplayBadges: ReadonlyArray<
    | "operator-family precision"
    | "modeled service state"
    | "not active satellite"
    | "not native RF handover"
  >;
}
```

Validation expectations should also be represented in the artifact envelope so
future smoke tests can assert contract compliance without opening raw source
packages:

```ts
interface V4ProjectionValidationExpectations {
  expectedEndpointCount: 2;
  requiredEndpointPrecision: "operator-family-only";
  requiredOrbitChips: readonly ["leo", "meo", "geo"];
  rawSourceCoordinatesMustRemainNull: true;
  renderMarkersMustHaveBoundedDisplayPositions: true;
  runtimeRawItriSideReadAllowed: false;
  requiredNonClaimKeys: ReadonlyArray<keyof V4NonClaimSet>;
  serviceStateTruth: "modeled";
  measuredMetricTruthAllowed: false;
}
```

## Validation Expectations

Before V4.3 implementation starts, the accepted projection must make these
checks possible:

- exactly two endpoints exist
- both endpoints use `operator-family-only` precision
- both raw source coordinate objects remain null in source-truth fields
- both render markers have explicit bounded display positions
- each endpoint has `LEO`, `MEO`, and `GEO` strong evidence chips
- pair fallback mode is not used
- runtime-facing data includes no path that requires opening raw `itri`
  package files
- non-claims are present and machine-readable
- service-state windows are modeled and not measurement truth
- orbit actors, if present, are source-lineaged display-context records

## V4.3 Blockers

The V4.2 contract and endpoint/service-state projected artifact blockers are
closed. Runtime implementation remains blocked until the V4.3 execution thread
does the remaining runtime-specific work:

- add code that consumes only the viewer-owned artifact or a repo-owned module
  generated from it
- run a raw `itri` side-read scan against V4.3 runtime/controller/render code
- project source-lineaged moving `LEO`/`MEO` and `GEO` actor records before
  rendering orbit actors, or explicitly narrow actor rendering without
  violating the V4 SDD
- keep the artifact's modeled service-state inputs as modeled inputs, not
  measured truth
