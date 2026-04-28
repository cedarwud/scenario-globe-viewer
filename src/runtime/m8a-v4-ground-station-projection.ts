import v46bGroundStationProjectionArtifact from "../../public/fixtures/ground-station-projections/m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28.json";

export const M8A_V4_GROUND_STATION_SCENARIO_ID =
  "m8a-v4-ground-station-multi-orbit-handover";
export const M8A_V4_GROUND_STATION_ARTIFACT_ID =
  "m8a-v4.6b-taiwan-cht-speedcast-singapore-source-lineaged-orbit-actors-2026-04-28";
export const M8A_V4_GROUND_STATION_QUERY_PARAM =
  "m8aV4GroundStationScene";
export const M8A_V4_GROUND_STATION_QUERY_VALUE = "1";
export const M8A_V4_GROUND_STATION_ROUTE =
  "/?scenePreset=regional&m8aV4GroundStationScene=1";
export const M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID =
  "m8a-v4.6b-ground-station-runtime-projection.v1";
export const M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
export const M8A_V4_GROUND_STATION_MODEL_ASSET_ID =
  "generic-satellite-glb-simple-satellite-low-poly-free";
export const M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH =
  "assets/models/generic-satellite.glb";
export const M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE =
  "operator-family precision";
export const M8A_V46D_SIMULATION_HANDOVER_MODEL_ID =
  "m8a-v4.6d-simulation-handover-model.v1";

export type M8aV4OrbitClass = "leo" | "meo" | "geo";
export type M8aV4EndpointId =
  | "tw-cht-multi-orbit-ground-infrastructure"
  | "sg-speedcast-singapore-teleport";
export type M8aV4ActorDisplayRole =
  | "leo-moving-context-actor"
  | "meo-moving-context-actor"
  | "geo-continuity-anchor";
export type M8aV4ActorMotionMode =
  | "replay-driven"
  | "near-fixed-geo-anchor";

export interface M8aV4GeoPosition {
  lat: number;
  lon: number;
  heightMeters: number;
}

export interface M8aV4EvidenceSourceRef {
  sourceRefId: string;
  label: string;
  url?: string;
  accessedDate?: string;
  supports: ReadonlyArray<string>;
  sourceAuthority: "endpoint-pair-authority-package" | "projection-note";
}

export interface M8aV4EndpointProjection {
  endpointId: M8aV4EndpointId;
  endpointRole: "endpoint-a" | "endpoint-b";
  endpointLabel: string;
  countryOrRegion: "Taiwan" | "Singapore";
  operatorOrSiteFamily: string;
  sourceEndpointRole:
    | "operator-ground-infrastructure-endpoint"
    | "teleport-endpoint";
  infrastructureRole: string;
  sourceCoordinatesRenderable: false;
  sourceCoordinates: {
    lat: null;
    lon: null;
    heightMeters: null;
  };
  coordinatePrecision: {
    sourceCoordinatePrecision: "operator-family";
    acceptedPrecision: "operator-family-only";
    renderPrecision: "bounded-operator-family-display-anchor";
    precisionDisclosure: typeof M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
    exactSiteAccepted: false;
    sameSiteLeoMeoGeoAccepted: false;
  };
  renderMarker: {
    markerId: string;
    markerClass: "bounded-operator-family-marker";
    displayAnchorKind:
      | "taiwan-cht-operator-family-anchor"
      | "speedcast-singapore-teleport-operator-family-anchor";
    displayPosition: M8aV4GeoPosition;
    displayPositionBasis: string;
    displayPositionPrecision: "bounded-operator-family-display-anchor";
    displayRadiusMeters: number;
    label: string;
    requiredPrecisionBadge:
      typeof M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
    displayPositionIsSourceTruth: false;
    mustNotImply: ReadonlyArray<string>;
  };
  orbitEvidenceChips: ReadonlyArray<{
    orbitClass: M8aV4OrbitClass;
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
  }>;
  sourceLineage: ReadonlyArray<M8aV4EvidenceSourceRef>;
  truthBoundary: {
    doesClaim: ReadonlyArray<string>;
    doesNotClaim: ReadonlyArray<string>;
    requiredDisplayBadges: ReadonlyArray<
      | "operator-family precision"
      | "modeled service state"
      | "not active satellite"
      | "not native RF handover"
    >;
  };
}

export interface M8aV4OrbitActorProjection {
  actorId: string;
  label: string;
  orbitClass: M8aV4OrbitClass;
  displayRole: M8aV4ActorDisplayRole;
  operatorContext: string;
  sourceLineage: ReadonlyArray<
    M8aV4EvidenceSourceRef & {
      sourceProvider: "CelesTrak";
      sourceProduct: "NORAD GP TLE";
      fetchedAtUtc: string;
      sourceRecordName: string;
      tleLine1: string;
      tleLine2: string;
    }
  >;
  sourceEpochUtc: string;
  projectionEpochUtc: string;
  freshnessClass: "fresh-display-context";
  sourcePosition: M8aV4GeoPosition & {
    positionKind: "source-orbit-position";
    coordinateFrame: "wgs84";
    precision: string;
  };
  artifactRenderPosition: M8aV4GeoPosition & {
    positionKind: "sampled-replay-position" | "near-fixed-geo-anchor";
    coordinateFrame: "wgs84";
    renderPositionBasis: string;
    renderPositionIsSourceTruth: false;
  };
  runtimeDisplayTrack: {
    trackKind:
      | "east-asia-display-context-track"
      | "east-asia-near-fixed-geo-anchor";
    start: M8aV4GeoPosition;
    stop: M8aV4GeoPosition;
    phaseOffset: number;
    cycleRate: number;
    renderTrackBasis: string;
    renderTrackIsSourceTruth: false;
  };
  motionMode: M8aV4ActorMotionMode;
  evidenceClass: "display-context";
  modelAssetId: typeof M8A_V4_GROUND_STATION_MODEL_ASSET_ID;
  modelTruth: "generic-satellite-mesh";
  truthBoundary: {
    doesClaim: ReadonlyArray<string>;
    doesNotClaim: ReadonlyArray<string>;
    requiredDisplayBadges: ReadonlyArray<
      "modeled service state" | "not active satellite" | "not native RF handover"
    >;
  };
  nonClaims: M8aV4NonClaimSet;
}

export interface M8aV4ServiceStateWindow {
  windowId: string;
  startRatio: number;
  stopRatio: number;
  currentPrimaryOrbitClass: M8aV4OrbitClass;
  nextCandidateOrbitClass: M8aV4OrbitClass;
  visibleCandidateOrbitClasses: ReadonlyArray<M8aV4OrbitClass>;
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

export interface M8aV4ServiceCandidate {
  candidateId: string;
  orbitClass: M8aV4OrbitClass;
  pathRole: "primary" | "candidate" | "fallback" | "context";
  endpointPairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
  sourceEvidenceClass: "operator-family-evidence";
  serviceStateInputKind: "modeled";
}

export interface M8aV4ServiceStateModel {
  modelId: "m8a-v4-modeled-service-state.v1";
  decisionModel: "modeled-service-continuity";
  isNativeRfHandover: false;
  truthState: "modeled";
  truthBoundaryLabel: "operator-family-bounded-service-state";
  timeline: ReadonlyArray<M8aV4ServiceStateWindow>;
  candidateSet: ReadonlyArray<M8aV4ServiceCandidate>;
  metricPolicy: {
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
  };
}

export type M8aV46dActorId =
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

export type M8aV46dSimulationHandoverWindowId =
  | "leo-acquisition-context"
  | "leo-aging-pressure"
  | "meo-continuity-hold"
  | "leo-reentry-candidate"
  | "geo-continuity-guard";

export type M8aV46dHandoverPressureReason =
  | "leo-display-geometry-acquisition"
  | "leo-display-geometry-aging"
  | "meo-continuity-hold"
  | "leo-display-geometry-reentry"
  | "geo-continuity-guard";

export type M8aV46dReasonSignalClass =
  | "leo-candidate-entering-display-region"
  | "leo-candidate-aging-from-display-region"
  | "meo-wide-area-continuity-context"
  | "leo-candidate-reentry-context"
  | "geo-continuity-guard-context"
  | "operator-family-precision-disclosure"
  | "simulation-state-non-claim-disclosure";

export interface M8aV46dWindowMetricClasses {
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
}

export interface M8aV46dWindowNonClaims {
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

export interface M8aV46dSimulationHandoverWindow {
  windowId: M8aV46dSimulationHandoverWindowId;
  startRatioInclusive: number;
  stopRatioExclusive: number;
  stopPolicy: "exclusive-except-final-window";
  displayRepresentativeOrbitClass: M8aV4OrbitClass;
  displayRepresentativeActorId: M8aV46dActorId;
  candidateContextOrbitClasses: ReadonlyArray<M8aV4OrbitClass>;
  candidateContextActorIds: ReadonlyArray<M8aV46dActorId>;
  fallbackContextOrbitClasses: readonly ["geo"];
  fallbackContextActorIds: ReadonlyArray<M8aV46dActorId>;
  handoverPressureReason: M8aV46dHandoverPressureReason;
  reasonSignalClasses: ReadonlyArray<M8aV46dReasonSignalClass>;
  boundedMetricClasses: M8aV46dWindowMetricClasses;
  nonClaims: M8aV46dWindowNonClaims;
}

export interface M8aV46dActorSetReference {
  expectedLeoActors: 6;
  expectedMeoActors: 5;
  expectedGeoActors: 2;
  acceptedActorIds: ReadonlyArray<M8aV46dActorId>;
}

export interface M8aV46dActorGeometryInput {
  actorId: M8aV46dActorId;
  orbitClass: M8aV4OrbitClass;
  geometryClass:
    | "display-acquisition-context"
    | "display-aging-context"
    | "display-continuity-hold-context"
    | "display-reentry-context"
    | "display-continuity-guard-context";
  geometryTruth: "display-context-not-service-truth";
}

export interface M8aV46dBoundedMetricPolicy {
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

export interface M8aV46dSimulationHandoverInputs {
  replayRatio: number;
  replayRatioPolicy: "normalized-zero-to-one-over-v4.6a-full-leo-replay";
  windowSelection: "deterministic-ratio-window";
  endpointPairId: typeof M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID;
  acceptedPairPrecision: "operator-family-only";
  actorSetSource: "v4.6b-repo-owned-projection-runtime-module";
  actorIds: ReadonlyArray<M8aV46dActorId>;
  actorGeometryInputs: ReadonlyArray<M8aV46dActorGeometryInput>;
  metricPolicy: M8aV46dBoundedMetricPolicy;
  runtimeSourceBoundary: "repo-owned-projection-or-generated-module-only";
}

export interface M8aV46dSimulationHandoverValidationExpectations {
  expectedModelId: typeof M8A_V46D_SIMULATION_HANDOVER_MODEL_ID;
  expectedEndpointPairId: typeof M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID;
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
  requiredWindowNonClaimKeys: ReadonlyArray<keyof M8aV46dWindowNonClaims>;
}

export interface M8aV46dForbiddenClaimScanPolicy {
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

export interface M8aV46dSimulationHandoverModel {
  modelId: typeof M8A_V46D_SIMULATION_HANDOVER_MODEL_ID;
  modelStatus: "accepted-contract";
  modelScope: "deterministic-display-context-state-machine";
  modelTruth: "simulation-output-not-operator-log";
  endpointPairId: typeof M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID;
  acceptedPairPrecision: "operator-family-only";
  route: typeof M8A_V4_GROUND_STATION_ROUTE;
  baselineActorSet: M8aV46dActorSetReference;
  inputs: M8aV46dSimulationHandoverInputs;
  timeline: readonly [
    M8aV46dSimulationHandoverWindow,
    M8aV46dSimulationHandoverWindow,
    M8aV46dSimulationHandoverWindow,
    M8aV46dSimulationHandoverWindow,
    M8aV46dSimulationHandoverWindow
  ];
  validationExpectations: M8aV46dSimulationHandoverValidationExpectations;
  forbiddenClaimScan: M8aV46dForbiddenClaimScanPolicy;
}

export interface M8aV4NonClaimSet {
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

export interface M8aV4RuntimeNarrativeNonClaims {
  noYkaEndpoint: true;
  noAircraftEndpoint: true;
  noOrdinaryHandsetUe: true;
  noActiveServingSatelliteIdentity: true;
  noActiveGatewayAssignment: true;
  noPairSpecificTeleportPathTruth: true;
  noMeasuredLatencyJitterThroughputTruth: true;
  noNativeRfHandover: true;
}

type M8aV4AcceptedOrbitActorProjection = Omit<
  M8aV4OrbitActorProjection,
  "label" | "artifactRenderPosition" | "runtimeDisplayTrack"
> & {
  renderPosition: M8aV4OrbitActorProjection["artifactRenderPosition"];
};

interface M8aV4AcceptedGroundStationProjectionArtifact {
  artifactId: typeof M8A_V4_GROUND_STATION_ARTIFACT_ID;
  projectionEpochUtc: string;
  orbitActors: ReadonlyArray<M8aV4AcceptedOrbitActorProjection>;
}

export interface M8aV4GroundStationRuntimeProjection {
  projectionId: typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID;
  generatedFromArtifactId: typeof M8A_V4_GROUND_STATION_ARTIFACT_ID;
  scenarioId: typeof M8A_V4_GROUND_STATION_SCENARIO_ID;
  artifactStatus: "accepted";
  projectionEpochUtc: string;
  sourceAuthority: "repo-owned-generated-module-from-viewer-owned-artifact";
  runtimeConsumptionRule:
    "runtime-controller-render-consume-this-module-only-no-raw-itri-side-read";
  rawSourcePathsIncluded: false;
  sourcePackageLineage: {
    packageId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
    packageDate: "2026-04-26";
    packageAuthority: "endpoint-pair authority package";
    runtimeUse: "lineage-metadata-only-raw-paths-stripped-from-runtime-module";
  };
  precisionPolicy: {
    acceptedPairPrecision: "operator-family-only";
    endpointPrecisionSymmetry: "both-endpoints-operator-family";
    sourceCoordinateStatus: "raw-endpoint-coordinates-null";
    renderMarkerPolicy: "bounded-operator-family-display-anchor";
    requiredDisclosureLabel:
      typeof M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
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
  };
  modelAsset: {
    modelAssetId: typeof M8A_V4_GROUND_STATION_MODEL_ASSET_ID;
    publicPath: typeof M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH;
    modelTruth: "generic-satellite-mesh";
    nonClaim: "generic satellite mesh; not source spacecraft body geometry";
  };
  endpoints: readonly [
    M8aV4EndpointProjection,
    M8aV4EndpointProjection
  ];
  orbitEvidenceMatrix: {
    pairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
    strictThreeOrbitEligible: true;
    acceptedPrecision: "operator-family-only";
    acceptedOrbitClassesForRuntime: readonly ["leo", "meo", "geo"];
    fallbackMode: "not-used";
    endpointA: Record<M8aV4OrbitClass, "strong">;
    endpointB: Record<M8aV4OrbitClass, "strong">;
    strictEligibilityBoundary: string;
  };
  orbitActors: ReadonlyArray<M8aV4OrbitActorProjection>;
  serviceStateModel: M8aV4ServiceStateModel;
  simulationHandoverModel: M8aV46dSimulationHandoverModel;
  nonClaims: M8aV4NonClaimSet;
  runtimeNarrativeNonClaims: M8aV4RuntimeNarrativeNonClaims;
  validationExpectations: {
    expectedEndpointCount: 2;
    requiredEndpointPrecision: "operator-family-only";
    requiredOrbitChips: readonly ["leo", "meo", "geo"];
    rawSourceCoordinatesMustRemainNull: true;
    renderMarkersMustHaveBoundedDisplayPositions: true;
    runtimeRawItriSideReadAllowed: false;
    serviceStateTruth: "modeled";
    measuredMetricTruthAllowed: false;
  };
}

export const M8A_V4_GROUND_STATION_NON_CLAIMS: M8aV4NonClaimSet = {
  noExactSiteSelection: true,
  noSameSiteLeoMeoGeoProof: true,
  noLiveCrossOrbitHandoverProof: true,
  noActiveServingSatelliteIdentity: true,
  noActiveGatewayAssignment: true,
  noPairSpecificTeleportPathTruth: true,
  noMeasuredLatencyJitterThroughputTruth: true,
  noNativeRfHandover: true,
  noAircraftEndpoint: true,
  noOrdinaryHandsetUe: true
};

const M8A_V4_ACCEPTED_V46B_ARTIFACT =
  v46bGroundStationProjectionArtifact as M8aV4AcceptedGroundStationProjectionArtifact;

const M8A_V4_RUNTIME_TRACK_BASIS =
  "V4.6B repo-owned display track generated from the accepted viewer-owned projection for East/Southeast Asia readability; not source truth, not an active service path, and not native RF handover.";

const M8A_V4_RUNTIME_TRACK_PRESETS = {
  leo: [
    {
      start: { lat: 7.4, lon: 96.5, heightMeters: 1240000 },
      stop: { lat: 34.8, lon: 128.8, heightMeters: 1300000 },
      phaseOffset: 0,
      cycleRate: 1
    },
    {
      start: { lat: -2.2, lon: 111.5, heightMeters: 1205000 },
      stop: { lat: 29.5, lon: 146.2, heightMeters: 1275000 },
      phaseOffset: 0.17,
      cycleRate: 1.08
    },
    {
      start: { lat: 38.5, lon: 104.5, heightMeters: 1230000 },
      stop: { lat: 5.5, lon: 137.2, heightMeters: 1290000 },
      phaseOffset: 0.34,
      cycleRate: 0.96
    },
    {
      start: { lat: 18.5, lon: 88.0, heightMeters: 1210000 },
      stop: { lat: 42.0, lon: 119.0, heightMeters: 1280000 },
      phaseOffset: 0.51,
      cycleRate: 1.04
    },
    {
      start: { lat: -8.0, lon: 96.0, heightMeters: 1195000 },
      stop: { lat: 22.0, lon: 132.0, heightMeters: 1265000 },
      phaseOffset: 0.68,
      cycleRate: 1.12
    },
    {
      start: { lat: 31.0, lon: 137.0, heightMeters: 1220000 },
      stop: { lat: 2.0, lon: 105.0, heightMeters: 1295000 },
      phaseOffset: 0.85,
      cycleRate: 0.92
    }
  ],
  meo: [
    {
      start: { lat: -6.5, lon: 87.8, heightMeters: 8057000 },
      stop: { lat: 27.5, lon: 137.8, heightMeters: 8082000 },
      phaseOffset: 0.08,
      cycleRate: 0.42
    },
    {
      start: { lat: 4.5, lon: 93.5, heightMeters: 8055000 },
      stop: { lat: 18.5, lon: 148.0, heightMeters: 8080000 },
      phaseOffset: 0.28,
      cycleRate: 0.38
    },
    {
      start: { lat: 16.0, lon: 83.0, heightMeters: 8056000 },
      stop: { lat: 31.0, lon: 126.0, heightMeters: 8081000 },
      phaseOffset: 0.48,
      cycleRate: 0.44
    },
    {
      start: { lat: -10.0, lon: 115.0, heightMeters: 8054000 },
      stop: { lat: 15.0, lon: 145.0, heightMeters: 8083000 },
      phaseOffset: 0.68,
      cycleRate: 0.36
    },
    {
      start: { lat: 26.0, lon: 102.0, heightMeters: 8058000 },
      stop: { lat: -2.0, lon: 133.0, heightMeters: 8084000 },
      phaseOffset: 0.88,
      cycleRate: 0.4
    }
  ],
  geo: []
} satisfies Record<
  M8aV4OrbitClass,
  ReadonlyArray<{
    start: M8aV4GeoPosition;
    stop: M8aV4GeoPosition;
    phaseOffset: number;
    cycleRate: number;
  }>
>;

function resolveRuntimeActorLabel(
  actor: M8aV4AcceptedOrbitActorProjection
): string {
  const sourceRecordName = actor.sourceLineage[0]?.sourceRecordName ?? actor.actorId;

  if (actor.actorId === "st-2-geo-continuity-anchor") {
    return "ST-2 GEO continuity anchor";
  }

  return `${sourceRecordName} ${actor.orbitClass.toUpperCase()} display-context`;
}

function resolveRuntimeDisplayTrack(
  actor: M8aV4AcceptedOrbitActorProjection,
  orbitClassIndex: number
): M8aV4OrbitActorProjection["runtimeDisplayTrack"] {
  if (actor.orbitClass === "geo") {
    return {
      trackKind: "east-asia-near-fixed-geo-anchor",
      start: actor.renderPosition,
      stop: actor.renderPosition,
      phaseOffset: 0,
      cycleRate: 0,
      renderTrackBasis:
        "Accepted projected GEO display-context anchor position; display context only, not active serving-satellite truth.",
      renderTrackIsSourceTruth: false
    };
  }

  const presets = M8A_V4_RUNTIME_TRACK_PRESETS[actor.orbitClass];
  const preset = presets[orbitClassIndex % presets.length];

  if (!preset) {
    throw new Error(`Missing V4.6B display track preset for ${actor.actorId}.`);
  }

  return {
    trackKind: "east-asia-display-context-track",
    start: preset.start,
    stop: preset.stop,
    phaseOffset: preset.phaseOffset,
    cycleRate: preset.cycleRate,
    renderTrackBasis: M8A_V4_RUNTIME_TRACK_BASIS,
    renderTrackIsSourceTruth: false
  };
}

function buildV46bRuntimeOrbitActors(): ReadonlyArray<M8aV4OrbitActorProjection> {
  const orbitClassIndexes: Record<M8aV4OrbitClass, number> = {
    leo: 0,
    meo: 0,
    geo: 0
  };

  return M8A_V4_ACCEPTED_V46B_ARTIFACT.orbitActors.map((actor) => {
    const orbitClassIndex = orbitClassIndexes[actor.orbitClass];
    orbitClassIndexes[actor.orbitClass] += 1;
    const { renderPosition, ...actorWithoutRenderPosition } = actor;

    return {
      ...actorWithoutRenderPosition,
      label: resolveRuntimeActorLabel(actor),
      artifactRenderPosition: renderPosition,
      runtimeDisplayTrack: resolveRuntimeDisplayTrack(actor, orbitClassIndex)
    };
  });
}

const M8A_V46D_ACCEPTED_ACTOR_IDS = [
  "oneweb-0386-leo-display-context",
  "oneweb-0537-leo-display-context",
  "oneweb-0701-leo-display-context",
  "oneweb-0012-leo-display-context",
  "oneweb-0249-leo-display-context",
  "oneweb-0702-leo-display-context",
  "o3b-mpower-f6-meo-display-context",
  "o3b-mpower-f1-meo-display-context",
  "o3b-mpower-f2-meo-display-context",
  "o3b-mpower-f4-meo-display-context",
  "o3b-mpower-f3-meo-display-context",
  "st-2-geo-continuity-anchor",
  "ses-9-geo-display-context"
] as const satisfies readonly M8aV46dActorId[];

const M8A_V46D_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
] as const satisfies M8aV46dSimulationHandoverValidationExpectations["expectedWindowIds"];

const M8A_V46D_REQUIRED_WINDOW_NON_CLAIM_KEYS = [
  "noRealOperatorHandoverEvent",
  "noActiveServingSatelliteIdentity",
  "noActiveGatewayAssignment",
  "noPairSpecificTeleportPathTruth",
  "noMeasuredLatencyJitterThroughputTruth",
  "noNativeRfHandover",
  "noEndpointPairOrPrecisionChange",
  "noR2RuntimeSelector",
  "noRawItriOrLiveExternalRuntimeSource"
] as const satisfies ReadonlyArray<keyof M8aV46dWindowNonClaims>;

const M8A_V46D_WINDOW_NON_CLAIMS = {
  noRealOperatorHandoverEvent: true,
  noActiveServingSatelliteIdentity: true,
  noActiveGatewayAssignment: true,
  noPairSpecificTeleportPathTruth: true,
  noMeasuredLatencyJitterThroughputTruth: true,
  noNativeRfHandover: true,
  noEndpointPairOrPrecisionChange: true,
  noR2RuntimeSelector: true,
  noRawItriOrLiveExternalRuntimeSource: true
} satisfies M8aV46dWindowNonClaims;

const M8A_V46D_BOUNDED_METRIC_POLICY = {
  metricTruth: "modeled-bounded-class-not-measured",
  numericLatencyAllowed: false,
  numericJitterAllowed: false,
  numericThroughputAllowed: false,
  allowedMetricClasses: [
    "latency-class",
    "jitter-class",
    "network-speed-class",
    "continuity-class"
  ]
} satisfies M8aV46dBoundedMetricPolicy;

const M8A_V46D_ACTOR_GEOMETRY_CLASSES = {
  "oneweb-0386-leo-display-context": "display-acquisition-context",
  "oneweb-0537-leo-display-context": "display-aging-context",
  "oneweb-0701-leo-display-context": "display-acquisition-context",
  "oneweb-0012-leo-display-context": "display-aging-context",
  "oneweb-0249-leo-display-context": "display-aging-context",
  "oneweb-0702-leo-display-context": "display-reentry-context",
  "o3b-mpower-f6-meo-display-context": "display-continuity-hold-context",
  "o3b-mpower-f1-meo-display-context": "display-continuity-hold-context",
  "o3b-mpower-f2-meo-display-context": "display-continuity-hold-context",
  "o3b-mpower-f4-meo-display-context": "display-continuity-hold-context",
  "o3b-mpower-f3-meo-display-context": "display-continuity-hold-context",
  "st-2-geo-continuity-anchor": "display-continuity-guard-context",
  "ses-9-geo-display-context": "display-continuity-guard-context"
} satisfies Record<
  M8aV46dActorId,
  M8aV46dActorGeometryInput["geometryClass"]
>;

function isM8aV46dActorId(actorId: string): actorId is M8aV46dActorId {
  return (M8A_V46D_ACCEPTED_ACTOR_IDS as readonly string[]).includes(actorId);
}

function buildV46dActorGeometryInputs(
  actors: ReadonlyArray<M8aV4OrbitActorProjection>
): ReadonlyArray<M8aV46dActorGeometryInput> {
  const actorsById = new Map(actors.map((actor) => [actor.actorId, actor]));

  return M8A_V46D_ACCEPTED_ACTOR_IDS.map((actorId) => {
    const actor = actorsById.get(actorId);

    if (!actor || !isM8aV46dActorId(actor.actorId)) {
      throw new Error(`Missing V4.6D accepted display-context actor ${actorId}.`);
    }

    return {
      actorId,
      orbitClass: actor.orbitClass,
      geometryClass: M8A_V46D_ACTOR_GEOMETRY_CLASSES[actorId],
      geometryTruth: "display-context-not-service-truth"
    };
  });
}

function buildV46dSimulationHandoverModel(
  actors: ReadonlyArray<M8aV4OrbitActorProjection>
): M8aV46dSimulationHandoverModel {
  return {
    modelId: M8A_V46D_SIMULATION_HANDOVER_MODEL_ID,
    modelStatus: "accepted-contract",
    modelScope: "deterministic-display-context-state-machine",
    modelTruth: "simulation-output-not-operator-log",
    endpointPairId: M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID,
    acceptedPairPrecision: "operator-family-only",
    route: M8A_V4_GROUND_STATION_ROUTE,
    baselineActorSet: {
      expectedLeoActors: 6,
      expectedMeoActors: 5,
      expectedGeoActors: 2,
      acceptedActorIds: M8A_V46D_ACCEPTED_ACTOR_IDS
    },
    inputs: {
      replayRatio: 0,
      replayRatioPolicy: "normalized-zero-to-one-over-v4.6a-full-leo-replay",
      windowSelection: "deterministic-ratio-window",
      endpointPairId: M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID,
      acceptedPairPrecision: "operator-family-only",
      actorSetSource: "v4.6b-repo-owned-projection-runtime-module",
      actorIds: M8A_V46D_ACCEPTED_ACTOR_IDS,
      actorGeometryInputs: buildV46dActorGeometryInputs(actors),
      metricPolicy: M8A_V46D_BOUNDED_METRIC_POLICY,
      runtimeSourceBoundary: "repo-owned-projection-or-generated-module-only"
    },
    timeline: [
      {
        windowId: "leo-acquisition-context",
        startRatioInclusive: 0,
        stopRatioExclusive: 0.2,
        stopPolicy: "exclusive-except-final-window",
        displayRepresentativeOrbitClass: "leo",
        displayRepresentativeActorId: "oneweb-0386-leo-display-context",
        candidateContextOrbitClasses: ["leo", "leo", "meo"],
        candidateContextActorIds: [
          "oneweb-0537-leo-display-context",
          "oneweb-0701-leo-display-context",
          "o3b-mpower-f6-meo-display-context"
        ],
        fallbackContextOrbitClasses: ["geo"],
        fallbackContextActorIds: [
          "st-2-geo-continuity-anchor",
          "ses-9-geo-display-context"
        ],
        handoverPressureReason: "leo-display-geometry-acquisition",
        reasonSignalClasses: [
          "leo-candidate-entering-display-region",
          "operator-family-precision-disclosure",
          "simulation-state-non-claim-disclosure"
        ],
        boundedMetricClasses: {
          metricTruth: "modeled-bounded-class-not-measured",
          latencyClass: "leo-low-latency-context-class",
          jitterClass: "changing-geometry-class",
          networkSpeedClass: "candidate-capacity-context-class",
          continuityClass: "acquisition-context-class"
        },
        nonClaims: M8A_V46D_WINDOW_NON_CLAIMS
      },
      {
        windowId: "leo-aging-pressure",
        startRatioInclusive: 0.2,
        stopRatioExclusive: 0.4,
        stopPolicy: "exclusive-except-final-window",
        displayRepresentativeOrbitClass: "leo",
        displayRepresentativeActorId: "oneweb-0537-leo-display-context",
        candidateContextOrbitClasses: ["leo", "leo", "meo", "meo"],
        candidateContextActorIds: [
          "oneweb-0012-leo-display-context",
          "oneweb-0249-leo-display-context",
          "o3b-mpower-f1-meo-display-context",
          "o3b-mpower-f2-meo-display-context"
        ],
        fallbackContextOrbitClasses: ["geo"],
        fallbackContextActorIds: [
          "st-2-geo-continuity-anchor",
          "ses-9-geo-display-context"
        ],
        handoverPressureReason: "leo-display-geometry-aging",
        reasonSignalClasses: [
          "leo-candidate-aging-from-display-region",
          "operator-family-precision-disclosure",
          "simulation-state-non-claim-disclosure"
        ],
        boundedMetricClasses: {
          metricTruth: "modeled-bounded-class-not-measured",
          latencyClass: "leo-low-latency-context-class",
          jitterClass: "changing-geometry-class",
          networkSpeedClass: "candidate-capacity-context-class",
          continuityClass: "pressure-context-class"
        },
        nonClaims: M8A_V46D_WINDOW_NON_CLAIMS
      },
      {
        windowId: "meo-continuity-hold",
        startRatioInclusive: 0.4,
        stopRatioExclusive: 0.6,
        stopPolicy: "exclusive-except-final-window",
        displayRepresentativeOrbitClass: "meo",
        displayRepresentativeActorId: "o3b-mpower-f6-meo-display-context",
        candidateContextOrbitClasses: ["meo", "meo", "meo", "meo", "leo"],
        candidateContextActorIds: [
          "o3b-mpower-f1-meo-display-context",
          "o3b-mpower-f2-meo-display-context",
          "o3b-mpower-f4-meo-display-context",
          "o3b-mpower-f3-meo-display-context",
          "oneweb-0702-leo-display-context"
        ],
        fallbackContextOrbitClasses: ["geo"],
        fallbackContextActorIds: [
          "st-2-geo-continuity-anchor",
          "ses-9-geo-display-context"
        ],
        handoverPressureReason: "meo-continuity-hold",
        reasonSignalClasses: [
          "meo-wide-area-continuity-context",
          "operator-family-precision-disclosure",
          "simulation-state-non-claim-disclosure"
        ],
        boundedMetricClasses: {
          metricTruth: "modeled-bounded-class-not-measured",
          latencyClass: "meo-mid-latency-context-class",
          jitterClass: "continuity-hold-class",
          networkSpeedClass: "continuity-context-class",
          continuityClass: "hold-context-class"
        },
        nonClaims: M8A_V46D_WINDOW_NON_CLAIMS
      },
      {
        windowId: "leo-reentry-candidate",
        startRatioInclusive: 0.6,
        stopRatioExclusive: 0.82,
        stopPolicy: "exclusive-except-final-window",
        displayRepresentativeOrbitClass: "leo",
        displayRepresentativeActorId: "oneweb-0702-leo-display-context",
        candidateContextOrbitClasses: ["leo", "leo", "leo", "meo"],
        candidateContextActorIds: [
          "oneweb-0012-leo-display-context",
          "oneweb-0249-leo-display-context",
          "oneweb-0386-leo-display-context",
          "o3b-mpower-f4-meo-display-context"
        ],
        fallbackContextOrbitClasses: ["geo"],
        fallbackContextActorIds: [
          "st-2-geo-continuity-anchor",
          "ses-9-geo-display-context"
        ],
        handoverPressureReason: "leo-display-geometry-reentry",
        reasonSignalClasses: [
          "leo-candidate-reentry-context",
          "operator-family-precision-disclosure",
          "simulation-state-non-claim-disclosure"
        ],
        boundedMetricClasses: {
          metricTruth: "modeled-bounded-class-not-measured",
          latencyClass: "leo-low-latency-context-class",
          jitterClass: "changing-geometry-class",
          networkSpeedClass: "candidate-capacity-context-class",
          continuityClass: "reentry-context-class"
        },
        nonClaims: M8A_V46D_WINDOW_NON_CLAIMS
      },
      {
        windowId: "geo-continuity-guard",
        startRatioInclusive: 0.82,
        stopRatioExclusive: 1,
        stopPolicy: "exclusive-except-final-window",
        displayRepresentativeOrbitClass: "geo",
        displayRepresentativeActorId: "st-2-geo-continuity-anchor",
        candidateContextOrbitClasses: ["geo", "meo", "leo"],
        candidateContextActorIds: [
          "ses-9-geo-display-context",
          "o3b-mpower-f3-meo-display-context",
          "oneweb-0701-leo-display-context"
        ],
        fallbackContextOrbitClasses: ["geo"],
        fallbackContextActorIds: [
          "st-2-geo-continuity-anchor",
          "ses-9-geo-display-context"
        ],
        handoverPressureReason: "geo-continuity-guard",
        reasonSignalClasses: [
          "geo-continuity-guard-context",
          "operator-family-precision-disclosure",
          "simulation-state-non-claim-disclosure"
        ],
        boundedMetricClasses: {
          metricTruth: "modeled-bounded-class-not-measured",
          latencyClass: "geo-higher-latency-continuity-class",
          jitterClass: "continuity-guard-class",
          networkSpeedClass: "guard-context-class",
          continuityClass: "guard-context-class"
        },
        nonClaims: M8A_V46D_WINDOW_NON_CLAIMS
      }
    ],
    validationExpectations: {
      expectedModelId: M8A_V46D_SIMULATION_HANDOVER_MODEL_ID,
      expectedEndpointPairId: M8A_V4_GROUND_STATION_ENDPOINT_PAIR_ID,
      expectedPrecision: "operator-family-only",
      expectedActorCounts: {
        leo: 6,
        meo: 5,
        geo: 2
      },
      expectedWindowIds: M8A_V46D_WINDOW_IDS,
      windowsMustCoverZeroToOneWithoutGaps: true,
      actorIdsMustExistInV46bActorSet: true,
      actorOrbitClassesMustMatchModelRoles: true,
      endpointPairAndPrecisionMustRemainUnchanged: true,
      runtimeRawItriSideReadAllowed: false,
      measuredMetricTruthAllowed: false,
      requiredWindowNonClaimKeys: M8A_V46D_REQUIRED_WINDOW_NON_CLAIM_KEYS
    },
    forbiddenClaimScan: {
      scanPositiveClaimFields: true,
      scanRuntimeLabelsDerivedFromModel: true,
      allowForbiddenConceptsOnlyInNegatedFields: true,
      negatedFieldNames: [
        "nonClaims",
        "doesNotClaim",
        "requiredDisclosures",
        "validationExpectations",
        "forbiddenClaimScan"
      ],
      forbiddenModelKeys: [
        "servingSatelliteId",
        "activeServingSatelliteId",
        "activeGatewayId",
        "gatewayAssignmentId",
        "teleportPathId",
        "latencyMs",
        "jitterMs",
        "throughputMbps",
        "throughputGbps",
        "rfHandoverId",
        "operatorHandoverEventId"
      ]
    }
  };
}

const M8A_V4_RUNTIME_ORBIT_ACTORS = buildV46bRuntimeOrbitActors();

export const M8A_V4_GROUND_STATION_RUNTIME_PROJECTION: M8aV4GroundStationRuntimeProjection =
  {
    projectionId: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID,
    generatedFromArtifactId: M8A_V4_GROUND_STATION_ARTIFACT_ID,
    scenarioId: M8A_V4_GROUND_STATION_SCENARIO_ID,
    artifactStatus: "accepted",
    projectionEpochUtc: M8A_V4_ACCEPTED_V46B_ARTIFACT.projectionEpochUtc,
    sourceAuthority: "repo-owned-generated-module-from-viewer-owned-artifact",
    runtimeConsumptionRule:
      "runtime-controller-render-consume-this-module-only-no-raw-itri-side-read",
    rawSourcePathsIncluded: false,
    sourcePackageLineage: {
      packageId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26",
      packageDate: "2026-04-26",
      packageAuthority: "endpoint-pair authority package",
      runtimeUse: "lineage-metadata-only-raw-paths-stripped-from-runtime-module"
    },
    precisionPolicy: {
      acceptedPairPrecision: "operator-family-only",
      endpointPrecisionSymmetry: "both-endpoints-operator-family",
      sourceCoordinateStatus: "raw-endpoint-coordinates-null",
      renderMarkerPolicy: "bounded-operator-family-display-anchor",
      requiredDisclosureLabel: M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
      forbiddenUpgrades: [
        "exact-site",
        "site-family",
        "same-site-leo-meo-geo",
        "active-gateway",
        "active-serving-satellite",
        "pair-specific-teleport-path",
        "measured-performance",
        "native-rf-handover"
      ]
    },
    modelAsset: {
      modelAssetId: M8A_V4_GROUND_STATION_MODEL_ASSET_ID,
      publicPath: M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH,
      modelTruth: "generic-satellite-mesh",
      nonClaim: "generic satellite mesh; not source spacecraft body geometry"
    },
    endpoints: [
      {
        endpointId: "tw-cht-multi-orbit-ground-infrastructure",
        endpointRole: "endpoint-a",
        endpointLabel:
          "Taiwan / Chunghwa Telecom multi-orbit ground infrastructure",
        countryOrRegion: "Taiwan",
        operatorOrSiteFamily:
          "Chunghwa Telecom operator-family multi-orbit ground infrastructure",
        sourceEndpointRole: "operator-ground-infrastructure-endpoint",
        infrastructureRole:
          "operator-family ground infrastructure and satellite service context",
        sourceCoordinatesRenderable: false,
        sourceCoordinates: {
          lat: null,
          lon: null,
          heightMeters: null
        },
        coordinatePrecision: {
          sourceCoordinatePrecision: "operator-family",
          acceptedPrecision: "operator-family-only",
          renderPrecision: "bounded-operator-family-display-anchor",
          precisionDisclosure: M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
          exactSiteAccepted: false,
          sameSiteLeoMeoGeoAccepted: false
        },
        renderMarker: {
          markerId: "tw-cht-operator-family-display-anchor",
          markerClass: "bounded-operator-family-marker",
          displayAnchorKind: "taiwan-cht-operator-family-anchor",
          displayPosition: {
            lat: 23.6978,
            lon: 120.9605,
            heightMeters: 0
          },
          displayPositionBasis:
            "Viewer-selected Taiwan island visual anchor for CHT operator-family readability. This is not an exact CHT site coordinate and not raw source truth.",
          displayPositionPrecision: "bounded-operator-family-display-anchor",
          displayRadiusMeters: 160000,
          label: "Taiwan / CHT operator-family anchor",
          requiredPrecisionBadge: M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
          displayPositionIsSourceTruth: false,
          mustNotImply: [
            "exact CHT site selection",
            "same-site LEO/MEO/GEO proof",
            "active gateway assignment",
            "active serving satellite identity",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover"
          ]
        },
        orbitEvidenceChips: [
          {
            orbitClass: "leo",
            grade: "strong",
            acceptedPrecision: "operator-family-only",
            evidenceState: "evidence-backed-operator-family",
            chipLabel: "LEO strong",
            sourceRefs: [
              "cht-multi-orbit-capability",
              "cht-eutelsat-oneweb-partnership"
            ],
            notes: "Accepted at CHT operator-family precision only.",
            chipNonClaims: [
              "not-same-site-proof",
              "not-active-serving-satellite",
              "not-active-gateway",
              "not-pair-specific-path"
            ]
          },
          {
            orbitClass: "meo",
            grade: "strong",
            acceptedPrecision: "operator-family-only",
            evidenceState: "evidence-backed-operator-family",
            chipLabel: "MEO strong",
            sourceRefs: [
              "cht-multi-orbit-capability",
              "cht-ses-o3b-mpower-ground-station"
            ],
            notes:
              "Accepted at CHT operator-family precision only; exact same-site mapping remains unresolved.",
            chipNonClaims: [
              "not-same-site-proof",
              "not-active-serving-satellite",
              "not-active-gateway",
              "not-pair-specific-path"
            ]
          },
          {
            orbitClass: "geo",
            grade: "strong",
            acceptedPrecision: "operator-family-only",
            evidenceState: "evidence-backed-operator-family",
            chipLabel: "GEO strong",
            sourceRefs: [
              "cht-multi-orbit-capability",
              "cht-eutelsat-oneweb-partnership",
              "cht-satellite-services"
            ],
            notes: "Accepted at CHT operator-family precision only.",
            chipNonClaims: [
              "not-same-site-proof",
              "not-active-serving-satellite",
              "not-active-gateway",
              "not-pair-specific-path"
            ]
          }
        ],
        sourceLineage: [
          {
            sourceRefId: "cht-multi-orbit-capability",
            label: "CHT commercial GEO/MEO/LEO multi-orbit capability",
            url: "https://www.cht.com.tw/zh-tw/home/cht/messages/2025/1103-1000",
            accessedDate: "2026-04-25",
            supports: ["operator-family GEO/MEO/LEO multi-orbit capability"],
            sourceAuthority: "endpoint-pair-authority-package"
          },
          {
            sourceRefId: "cht-ses-o3b-mpower-ground-station",
            label: "CHT + SES O3b mPOWER MEO ground station",
            url: "https://www.cht.com.tw/en/home/cht/messages/2026/0122-1410",
            accessedDate: "2026-04-25",
            supports: [
              "operator-family MEO evidence",
              "Taiwan ground-infrastructure context"
            ],
            sourceAuthority: "endpoint-pair-authority-package"
          },
          {
            sourceRefId: "cht-eutelsat-oneweb-partnership",
            label: "CHT + Eutelsat OneWeb partnership",
            url: "https://www.cht.com.tw/en/home/cht/messages/2023/1115-1530",
            accessedDate: "2026-04-25",
            supports: [
              "operator-family LEO evidence",
              "integration with CHT GEO satellite services"
            ],
            sourceAuthority: "endpoint-pair-authority-package"
          }
        ],
        truthBoundary: {
          doesClaim: [
            "Taiwan/CHT is accepted as endpoint A at operator-family precision",
            "public evidence supports CHT operator-family LEO, MEO, and GEO capability",
            "CHT may be represented by a bounded Taiwan/CHT operator-family marker"
          ],
          doesNotClaim: [
            "exact CHT site-level endpoint selection",
            "same-site LEO/MEO/GEO capability proof",
            "live cross-orbit handover proof with Speedcast Singapore",
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover"
          ],
          requiredDisplayBadges: [
            "operator-family precision",
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        }
      },
      {
        endpointId: "sg-speedcast-singapore-teleport",
        endpointRole: "endpoint-b",
        endpointLabel: "Singapore / Speedcast Singapore Teleport",
        countryOrRegion: "Singapore",
        operatorOrSiteFamily:
          "Speedcast operator-family with bounded Singapore Teleport marker",
        sourceEndpointRole: "teleport-endpoint",
        infrastructureRole:
          "operator-family teleport and managed satellite service context",
        sourceCoordinatesRenderable: false,
        sourceCoordinates: {
          lat: null,
          lon: null,
          heightMeters: null
        },
        coordinatePrecision: {
          sourceCoordinatePrecision: "operator-family",
          acceptedPrecision: "operator-family-only",
          renderPrecision: "bounded-operator-family-display-anchor",
          precisionDisclosure: M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
          exactSiteAccepted: false,
          sameSiteLeoMeoGeoAccepted: false
        },
        renderMarker: {
          markerId: "sg-speedcast-singapore-teleport-operator-family-display-anchor",
          markerClass: "bounded-operator-family-marker",
          displayAnchorKind:
            "speedcast-singapore-teleport-operator-family-anchor",
          displayPosition: {
            lat: 1.3521,
            lon: 103.8198,
            heightMeters: 0
          },
          displayPositionBasis:
            "Viewer-selected Singapore national visual anchor for Speedcast Singapore Teleport operator-family readability. This is not an exact teleport coordinate and not raw source truth.",
          displayPositionPrecision: "bounded-operator-family-display-anchor",
          displayRadiusMeters: 25000,
          label: "Singapore / Speedcast operator-family anchor",
          requiredPrecisionBadge: M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
          displayPositionIsSourceTruth: false,
          mustNotImply: [
            "exact Speedcast Singapore same-site LEO/MEO/GEO proof",
            "active gateway assignment",
            "active serving satellite identity",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover"
          ]
        },
        orbitEvidenceChips: [
          {
            orbitClass: "leo",
            grade: "strong",
            acceptedPrecision: "operator-family-only",
            evidenceState: "evidence-backed-operator-family",
            chipLabel: "LEO strong",
            sourceRefs: [
              "speedcast-oneweb-leo-service",
              "speedcast-ngso-leo-meo-service"
            ],
            notes: "Accepted at Speedcast operator-family precision only.",
            chipNonClaims: [
              "not-same-site-proof",
              "not-active-serving-satellite",
              "not-active-gateway",
              "not-pair-specific-path"
            ]
          },
          {
            orbitClass: "meo",
            grade: "strong",
            acceptedPrecision: "operator-family-only",
            evidenceState: "evidence-backed-operator-family",
            chipLabel: "MEO strong",
            sourceRefs: [
              "speedcast-ngso-leo-meo-service",
              "speedcast-o3b-meo-managed-services"
            ],
            notes:
              "Accepted at Speedcast operator-family precision only; Singapore Teleport site-level MEO mapping remains unresolved.",
            chipNonClaims: [
              "not-same-site-proof",
              "not-active-serving-satellite",
              "not-active-gateway",
              "not-pair-specific-path"
            ]
          },
          {
            orbitClass: "geo",
            grade: "strong",
            acceptedPrecision: "operator-family-only",
            evidenceState: "evidence-backed-operator-family",
            chipLabel: "GEO strong",
            sourceRefs: [
              "speedcast-singapore-teleport-wta-tier4",
              "wta-speedcast-singapore-teleport-certification",
              "speedcast-teleport-network"
            ],
            notes:
              "Accepted at Speedcast operator-family precision with bounded Singapore Teleport marker.",
            chipNonClaims: [
              "not-same-site-proof",
              "not-active-serving-satellite",
              "not-active-gateway",
              "not-pair-specific-path"
            ]
          }
        ],
        sourceLineage: [
          {
            sourceRefId: "speedcast-singapore-teleport-wta-tier4",
            label: "Speedcast Singapore Teleport WTA Tier 4 certification",
            url: "https://www.speedcast.com/newsroom/press-releases/2024/speedcasts-teleport-in-singapore-joins-wtas-growing-list-of-tier-4-certified-teleports/",
            accessedDate: "2026-04-26",
            supports: [
              "real Speedcast Singapore Teleport marker context",
              "teleport facility existence and certification"
            ],
            sourceAuthority: "endpoint-pair-authority-package"
          },
          {
            sourceRefId: "speedcast-ngso-leo-meo-service",
            label: "Speedcast NGSO LEO/MEO service surface",
            url: "https://www.speedcast.com/our-solution/product/vsat-satellite/ngso-leo-meo/",
            accessedDate: "2026-04-26",
            supports: [
              "Speedcast operator-family LEO evidence",
              "Speedcast operator-family MEO evidence"
            ],
            sourceAuthority: "endpoint-pair-authority-package"
          },
          {
            sourceRefId: "speedcast-teleport-network",
            label: "Speedcast teleport network and hybrid satellite platform",
            url: "https://www.speedcast.com/about-us/teleports/",
            accessedDate: "2026-04-26",
            supports: [
              "Speedcast operator-family teleport and hybrid satellite service context"
            ],
            sourceAuthority: "endpoint-pair-authority-package"
          }
        ],
        truthBoundary: {
          doesClaim: [
            "Singapore/Speedcast is accepted as endpoint B at Speedcast operator-family precision",
            "public evidence supports Speedcast operator-family LEO, MEO, and GEO/teleport capability",
            "Speedcast may be represented by a bounded Singapore operator-family marker"
          ],
          doesNotClaim: [
            "that Speedcast Singapore Teleport itself is proven as the active same-site LEO/MEO/GEO serving site",
            "live cross-orbit handover proof with CHT",
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover"
          ],
          requiredDisplayBadges: [
            "operator-family precision",
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        }
      }
    ],
    orbitEvidenceMatrix: {
      pairId: "taiwan-cht-speedcast-singapore-operator-family-2026-04-26",
      strictThreeOrbitEligible: true,
      acceptedPrecision: "operator-family-only",
      acceptedOrbitClassesForRuntime: ["leo", "meo", "geo"],
      fallbackMode: "not-used",
      endpointA: {
        leo: "strong",
        meo: "strong",
        geo: "strong"
      },
      endpointB: {
        leo: "strong",
        meo: "strong",
        geo: "strong"
      },
      strictEligibilityBoundary:
        "Strict three-orbit eligibility is accepted only at operator-family precision. It is not site-family, site-level, same-site, active-gateway, active-satellite, measured-performance, pair-specific teleport-path, or native RF handover truth."
    },
    orbitActors: M8A_V4_RUNTIME_ORBIT_ACTORS,
    serviceStateModel: {
      modelId: "m8a-v4-modeled-service-state.v1",
      decisionModel: "modeled-service-continuity",
      isNativeRfHandover: false,
      truthState: "modeled",
      truthBoundaryLabel: "operator-family-bounded-service-state",
      timeline: [
        {
          windowId: "v4-modeled-window-01-leo-to-meo-context",
          startRatio: 0,
          stopRatio: 0.25,
          currentPrimaryOrbitClass: "leo",
          nextCandidateOrbitClass: "meo",
          visibleCandidateOrbitClasses: ["leo", "meo", "geo"],
          continuityFallbackOrbitClass: "geo",
          handoverPressureReason: "leo-geometry-changing",
          reasonSignals: [
            "moving LEO context creates changing geometry pressure",
            "MEO remains an operator-family service-context candidate",
            "GEO remains modeled continuity fallback"
          ],
          boundedMetricsUsed: ["latency-class", "continuity-class"],
          stateEvidenceClass: "modeled-service-state"
        },
        {
          windowId: "v4-modeled-window-02-meo-continuity-context",
          startRatio: 0.25,
          stopRatio: 0.5,
          currentPrimaryOrbitClass: "meo",
          nextCandidateOrbitClass: "leo",
          visibleCandidateOrbitClasses: ["leo", "meo", "geo"],
          continuityFallbackOrbitClass: "geo",
          handoverPressureReason: "meo-continuity-context",
          reasonSignals: [
            "MEO is modeled as wider-area continuity context",
            "LEO remains the next moving low-latency candidate",
            "GEO remains continuity fallback"
          ],
          boundedMetricsUsed: [
            "latency-class",
            "jitter-class",
            "continuity-class"
          ],
          stateEvidenceClass: "modeled-service-state"
        },
        {
          windowId: "v4-modeled-window-03-leo-candidate-aging",
          startRatio: 0.5,
          stopRatio: 0.75,
          currentPrimaryOrbitClass: "leo",
          nextCandidateOrbitClass: "geo",
          visibleCandidateOrbitClasses: ["leo", "meo", "geo"],
          continuityFallbackOrbitClass: "geo",
          handoverPressureReason: "leo-candidate-aging",
          reasonSignals: [
            "LEO context candidate ages out of the modeled useful window",
            "GEO remains available as modeled continuity fallback",
            "MEO remains visible service context"
          ],
          boundedMetricsUsed: [
            "latency-class",
            "network-speed-class",
            "continuity-class"
          ],
          stateEvidenceClass: "modeled-service-state"
        },
        {
          windowId: "v4-modeled-window-04-geo-fallback-continuity",
          startRatio: 0.75,
          stopRatio: 1,
          currentPrimaryOrbitClass: "geo",
          nextCandidateOrbitClass: "leo",
          visibleCandidateOrbitClasses: ["leo", "meo", "geo"],
          continuityFallbackOrbitClass: "geo",
          handoverPressureReason: "geo-fallback-continuity",
          reasonSignals: [
            "GEO is modeled as continuity fallback",
            "LEO candidate set re-enters as moving context",
            "policy remains balanced across accepted orbit evidence classes"
          ],
          boundedMetricsUsed: [
            "jitter-class",
            "network-speed-class",
            "continuity-class"
          ],
          stateEvidenceClass: "modeled-service-state"
        }
      ],
      candidateSet: [
        {
          candidateId: "v4-service-candidate-leo-operator-family",
          orbitClass: "leo",
          pathRole: "candidate",
          endpointPairId:
            "taiwan-cht-speedcast-singapore-operator-family-2026-04-26",
          sourceEvidenceClass: "operator-family-evidence",
          serviceStateInputKind: "modeled"
        },
        {
          candidateId: "v4-service-candidate-meo-operator-family",
          orbitClass: "meo",
          pathRole: "context",
          endpointPairId:
            "taiwan-cht-speedcast-singapore-operator-family-2026-04-26",
          sourceEvidenceClass: "operator-family-evidence",
          serviceStateInputKind: "modeled"
        },
        {
          candidateId: "v4-service-candidate-geo-continuity",
          orbitClass: "geo",
          pathRole: "fallback",
          endpointPairId:
            "taiwan-cht-speedcast-singapore-operator-family-2026-04-26",
          sourceEvidenceClass: "operator-family-evidence",
          serviceStateInputKind: "modeled"
        }
      ],
      metricPolicy: {
        metricTruth: "modeled-bounded-input",
        measuredLatency: false,
        measuredJitter: false,
        measuredThroughput: false,
        allowedMetricLabels: [
          "latency class",
          "jitter class",
          "network speed class",
          "continuity class"
        ]
      }
    },
    simulationHandoverModel: buildV46dSimulationHandoverModel(
      M8A_V4_RUNTIME_ORBIT_ACTORS
    ),
    nonClaims: M8A_V4_GROUND_STATION_NON_CLAIMS,
    runtimeNarrativeNonClaims: {
      noYkaEndpoint: true,
      noAircraftEndpoint: true,
      noOrdinaryHandsetUe: true,
      noActiveServingSatelliteIdentity: true,
      noActiveGatewayAssignment: true,
      noPairSpecificTeleportPathTruth: true,
      noMeasuredLatencyJitterThroughputTruth: true,
      noNativeRfHandover: true
    },
    validationExpectations: {
      expectedEndpointCount: 2,
      requiredEndpointPrecision: "operator-family-only",
      requiredOrbitChips: ["leo", "meo", "geo"],
      rawSourceCoordinatesMustRemainNull: true,
      renderMarkersMustHaveBoundedDisplayPositions: true,
      runtimeRawItriSideReadAllowed: false,
      serviceStateTruth: "modeled",
      measuredMetricTruthAllowed: false
    }
  };
