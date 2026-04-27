export const M8A_V4_GROUND_STATION_SCENARIO_ID =
  "m8a-v4-ground-station-multi-orbit-handover";
export const M8A_V4_GROUND_STATION_ARTIFACT_ID =
  "m8a-v4-taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
export const M8A_V4_GROUND_STATION_QUERY_PARAM =
  "m8aV4GroundStationScene";
export const M8A_V4_GROUND_STATION_QUERY_VALUE = "1";
export const M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID =
  "m8a-v4.3-ground-station-runtime-projection.v1";
export const M8A_V4_GROUND_STATION_MODEL_ASSET_ID =
  "generic-satellite-glb-simple-satellite-low-poly-free";
export const M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH =
  "assets/models/generic-satellite.glb";
export const M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE =
  "operator-family precision";

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

const SOURCE_POSITION_PRECISION =
  "CelesTrak NORAD GP TLE propagated to the TLE source epoch; display-context only";
const RENDER_POSITION_BASIS =
  "CelesTrak NORAD GP TLE propagated to projectionEpochUtc for viewer-owned display context; not active serving-satellite truth";
const RUNTIME_TRACK_BASIS =
  "V4.3 repo-owned display track generated from the accepted viewer-owned projection for first-frame East/Southeast Asia readability; not source truth, not an active service path, and not native RF handover.";

export const M8A_V4_GROUND_STATION_RUNTIME_PROJECTION: M8aV4GroundStationRuntimeProjection =
  {
    projectionId: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID,
    generatedFromArtifactId: M8A_V4_GROUND_STATION_ARTIFACT_ID,
    scenarioId: M8A_V4_GROUND_STATION_SCENARIO_ID,
    artifactStatus: "accepted",
    projectionEpochUtc: "2026-04-26T10:21:10Z",
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
    orbitActors: [
      {
        actorId: "oneweb-0386-leo-display-context",
        label: "ONEWEB-0386 LEO display-context",
        orbitClass: "leo",
        displayRole: "leo-moving-context-actor",
        operatorContext: "Eutelsat OneWeb",
        sourceLineage: [
          {
            sourceRefId: "celestrak-gp-oneweb-0386-49312",
            label: "CelesTrak NORAD GP TLE: ONEWEB-0386",
            url: "https://celestrak.org/NORAD/elements/gp.php?CATNR=49312&FORMAT=tle",
            accessedDate: "2026-04-26",
            supports: [
              "source-lineaged OneWeb LEO display-context actor",
              "TLE-derived source-position and render-position projection"
            ],
            sourceAuthority: "projection-note",
            sourceProvider: "CelesTrak",
            sourceProduct: "NORAD GP TLE",
            fetchedAtUtc: "2026-04-26T10:21:10Z",
            sourceRecordName: "ONEWEB-0386",
            tleLine1:
              "1 49312U 21090AK  26115.88297094  .00000138  00000+0  30722-3 0  9991",
            tleLine2:
              "2 49312  87.9152 284.8654 0001982  99.8596 260.2762 13.20769718222911"
          }
        ],
        sourceEpochUtc: "2026-04-25T21:11:28.689Z",
        projectionEpochUtc: "2026-04-26T10:21:10Z",
        freshnessClass: "fresh-display-context",
        sourcePosition: {
          positionKind: "source-orbit-position",
          lat: 0.000079,
          lon: 113.100908,
          heightMeters: 1184938,
          coordinateFrame: "wgs84",
          precision: SOURCE_POSITION_PRECISION
        },
        artifactRenderPosition: {
          positionKind: "sampled-replay-position",
          lat: 85.61995,
          lon: -56.751736,
          heightMeters: 1194128,
          coordinateFrame: "wgs84",
          renderPositionBasis: RENDER_POSITION_BASIS,
          renderPositionIsSourceTruth: false
        },
        runtimeDisplayTrack: {
          trackKind: "east-asia-display-context-track",
          start: {
            lat: 7.4,
            lon: 96.5,
            heightMeters: 1240000
          },
          stop: {
            lat: 34.8,
            lon: 128.8,
            heightMeters: 1300000
          },
          phaseOffset: 0,
          cycleRate: 1,
          renderTrackBasis: RUNTIME_TRACK_BASIS,
          renderTrackIsSourceTruth: false
        },
        motionMode: "replay-driven",
        evidenceClass: "display-context",
        modelAssetId: M8A_V4_GROUND_STATION_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        truthBoundary: {
          doesClaim: [
            "ONEWEB-0386 has a source-lineaged CelesTrak NORAD GP TLE record",
            "the sourcePosition and renderPosition are TLE-derived display-context orbit samples",
            "the actor may be rendered as a moving LEO display-context satellite"
          ],
          doesNotClaim: [
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover",
            "live operational truth",
            "OneWeb spacecraft body geometry"
          ],
          requiredDisplayBadges: [
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        },
        nonClaims: M8A_V4_GROUND_STATION_NON_CLAIMS
      },
      {
        actorId: "oneweb-0537-leo-display-context",
        label: "ONEWEB-0537 LEO display-context",
        orbitClass: "leo",
        displayRole: "leo-moving-context-actor",
        operatorContext: "Eutelsat OneWeb",
        sourceLineage: [
          {
            sourceRefId: "celestrak-gp-oneweb-0537-56046",
            label: "CelesTrak NORAD GP TLE: ONEWEB-0537",
            url: "https://celestrak.org/NORAD/elements/gp.php?CATNR=56046&FORMAT=tle",
            accessedDate: "2026-04-26",
            supports: [
              "source-lineaged OneWeb LEO display-context actor",
              "TLE-derived source-position and render-position projection"
            ],
            sourceAuthority: "projection-note",
            sourceProvider: "CelesTrak",
            sourceProduct: "NORAD GP TLE",
            fetchedAtUtc: "2026-04-26T10:21:10Z",
            sourceRecordName: "ONEWEB-0537",
            tleLine1:
              "1 56046U 23043A   26115.83269817 -.00000063  00000+0 -19895-3 0  9997",
            tleLine2:
              "2 56046  87.9080 239.1693 0001725 106.5327 253.5994 13.16594577152077"
          }
        ],
        sourceEpochUtc: "2026-04-25T19:59:05.121Z",
        projectionEpochUtc: "2026-04-26T10:21:10Z",
        freshnessClass: "fresh-display-context",
        sourcePosition: {
          positionKind: "source-orbit-position",
          lat: 0.000005,
          lon: 85.552557,
          heightMeters: 1201022,
          coordinateFrame: "wgs84",
          precision: SOURCE_POSITION_PRECISION
        },
        artifactRenderPosition: {
          positionKind: "sampled-replay-position",
          lat: -44.181974,
          lon: -132.70105,
          heightMeters: 1215919,
          coordinateFrame: "wgs84",
          renderPositionBasis: RENDER_POSITION_BASIS,
          renderPositionIsSourceTruth: false
        },
        runtimeDisplayTrack: {
          trackKind: "east-asia-display-context-track",
          start: {
            lat: -2.2,
            lon: 111.5,
            heightMeters: 1205000
          },
          stop: {
            lat: 29.5,
            lon: 146.2,
            heightMeters: 1275000
          },
          phaseOffset: 0.34,
          cycleRate: 1.08,
          renderTrackBasis: RUNTIME_TRACK_BASIS,
          renderTrackIsSourceTruth: false
        },
        motionMode: "replay-driven",
        evidenceClass: "display-context",
        modelAssetId: M8A_V4_GROUND_STATION_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        truthBoundary: {
          doesClaim: [
            "ONEWEB-0537 has a source-lineaged CelesTrak NORAD GP TLE record",
            "the sourcePosition and renderPosition are TLE-derived display-context orbit samples",
            "the actor may be rendered as a moving LEO display-context satellite"
          ],
          doesNotClaim: [
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover",
            "live operational truth",
            "OneWeb spacecraft body geometry"
          ],
          requiredDisplayBadges: [
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        },
        nonClaims: M8A_V4_GROUND_STATION_NON_CLAIMS
      },
      {
        actorId: "oneweb-0701-leo-display-context",
        label: "ONEWEB-0701 LEO display-context",
        orbitClass: "leo",
        displayRole: "leo-moving-context-actor",
        operatorContext: "Eutelsat OneWeb",
        sourceLineage: [
          {
            sourceRefId: "celestrak-gp-oneweb-0701-61607",
            label: "CelesTrak NORAD GP TLE: ONEWEB-0701",
            url: "https://celestrak.org/NORAD/elements/gp.php?CATNR=61607&FORMAT=tle",
            accessedDate: "2026-04-26",
            supports: [
              "source-lineaged OneWeb LEO display-context actor",
              "TLE-derived source-position and render-position projection"
            ],
            sourceAuthority: "projection-note",
            sourceProvider: "CelesTrak",
            sourceProduct: "NORAD GP TLE",
            fetchedAtUtc: "2026-04-26T10:21:10Z",
            sourceRecordName: "ONEWEB-0701",
            tleLine1:
              "1 61607U 24188P   26115.85253211  .00000024  00000+0  32713-4 0  9990",
            tleLine2:
              "2 61607  87.8848  46.6778 0001936  53.2979 306.8326 13.10375831 76459"
          }
        ],
        sourceEpochUtc: "2026-04-25T20:27:38.774Z",
        projectionEpochUtc: "2026-04-26T10:21:10Z",
        freshnessClass: "fresh-display-context",
        sourcePosition: {
          positionKind: "source-orbit-position",
          lat: -0.000012,
          lon: -114.098714,
          heightMeters: 1223711,
          coordinateFrame: "wgs84",
          precision: SOURCE_POSITION_PRECISION
        },
        artifactRenderPosition: {
          positionKind: "sampled-replay-position",
          lat: -29.370109,
          lon: -141.979431,
          heightMeters: 1234031,
          coordinateFrame: "wgs84",
          renderPositionBasis: RENDER_POSITION_BASIS,
          renderPositionIsSourceTruth: false
        },
        runtimeDisplayTrack: {
          trackKind: "east-asia-display-context-track",
          start: {
            lat: 38.5,
            lon: 104.5,
            heightMeters: 1230000
          },
          stop: {
            lat: 5.5,
            lon: 137.2,
            heightMeters: 1290000
          },
          phaseOffset: 0.68,
          cycleRate: 0.96,
          renderTrackBasis: RUNTIME_TRACK_BASIS,
          renderTrackIsSourceTruth: false
        },
        motionMode: "replay-driven",
        evidenceClass: "display-context",
        modelAssetId: M8A_V4_GROUND_STATION_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        truthBoundary: {
          doesClaim: [
            "ONEWEB-0701 has a source-lineaged CelesTrak NORAD GP TLE record",
            "the sourcePosition and renderPosition are TLE-derived display-context orbit samples",
            "the actor may be rendered as a moving LEO display-context satellite"
          ],
          doesNotClaim: [
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover",
            "live operational truth",
            "OneWeb spacecraft body geometry"
          ],
          requiredDisplayBadges: [
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        },
        nonClaims: M8A_V4_GROUND_STATION_NON_CLAIMS
      },
      {
        actorId: "o3b-mpower-f6-meo-display-context",
        label: "O3b mPOWER F6 MEO display-context",
        orbitClass: "meo",
        displayRole: "meo-moving-context-actor",
        operatorContext: "SES O3b mPOWER",
        sourceLineage: [
          {
            sourceRefId: "celestrak-gp-o3b-mpower-f6-58347",
            label: "CelesTrak NORAD GP TLE: O3B MPOWER F6",
            url: "https://celestrak.org/NORAD/elements/gp.php?CATNR=58347&FORMAT=tle",
            accessedDate: "2026-04-26",
            supports: [
              "source-lineaged O3b mPOWER MEO display-context actor",
              "TLE-derived source-position and render-position projection"
            ],
            sourceAuthority: "projection-note",
            sourceProvider: "CelesTrak",
            sourceProduct: "NORAD GP TLE",
            fetchedAtUtc: "2026-04-26T10:21:10Z",
            sourceRecordName: "O3B MPOWER F6",
            tleLine1:
              "1 58347U 23175B   26115.83785449 -.00000027  00000+0  00000+0 0  9996",
            tleLine2:
              "2 58347   0.0513   6.1734 0004729  18.9973 334.8506  5.00116222 45735"
          }
        ],
        sourceEpochUtc: "2026-04-25T20:06:30.627Z",
        projectionEpochUtc: "2026-04-26T10:21:10Z",
        freshnessClass: "fresh-display-context",
        sourcePosition: {
          positionKind: "source-orbit-position",
          lat: -0.002108,
          lon: -155.478133,
          heightMeters: 8058171,
          coordinateFrame: "wgs84",
          precision: SOURCE_POSITION_PRECISION
        },
        artifactRenderPosition: {
          positionKind: "sampled-replay-position",
          lat: -0.011005,
          lon: -20.830011,
          heightMeters: 8058871,
          coordinateFrame: "wgs84",
          renderPositionBasis: RENDER_POSITION_BASIS,
          renderPositionIsSourceTruth: false
        },
        runtimeDisplayTrack: {
          trackKind: "east-asia-display-context-track",
          start: {
            lat: -6.5,
            lon: 87.8,
            heightMeters: 8057000
          },
          stop: {
            lat: 27.5,
            lon: 137.8,
            heightMeters: 8082000
          },
          phaseOffset: 0.16,
          cycleRate: 0.42,
          renderTrackBasis: RUNTIME_TRACK_BASIS,
          renderTrackIsSourceTruth: false
        },
        motionMode: "replay-driven",
        evidenceClass: "display-context",
        modelAssetId: M8A_V4_GROUND_STATION_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        truthBoundary: {
          doesClaim: [
            "O3B MPOWER F6 has a source-lineaged CelesTrak NORAD GP TLE record",
            "the sourcePosition and renderPosition are TLE-derived display-context orbit samples",
            "the actor may be rendered as a moving MEO display-context satellite"
          ],
          doesNotClaim: [
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover",
            "live operational truth",
            "SES O3b mPOWER spacecraft body geometry"
          ],
          requiredDisplayBadges: [
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        },
        nonClaims: M8A_V4_GROUND_STATION_NON_CLAIMS
      },
      {
        actorId: "st-2-geo-continuity-anchor",
        label: "ST-2 GEO continuity anchor",
        orbitClass: "geo",
        displayRole: "geo-continuity-anchor",
        operatorContext: "ST-2 CHT/Singtel GEO service context",
        sourceLineage: [
          {
            sourceRefId: "celestrak-gp-st-2-37606",
            label: "CelesTrak NORAD GP TLE: ST-2",
            url: "https://celestrak.org/NORAD/elements/gp.php?CATNR=37606&FORMAT=tle",
            accessedDate: "2026-04-26",
            supports: [
              "source-lineaged ST-2 GEO continuity anchor",
              "TLE-derived source-position and render-position projection"
            ],
            sourceAuthority: "projection-note",
            sourceProvider: "CelesTrak",
            sourceProduct: "NORAD GP TLE",
            fetchedAtUtc: "2026-04-26T10:21:10Z",
            sourceRecordName: "ST-2",
            tleLine1:
              "1 37606U 11022B   26115.92748256 -.00000225  00000+0  00000+0 0  9994",
            tleLine2:
              "2 37606   0.0184 133.8186 0001849 266.6858 235.3367  1.00271160 54758"
          }
        ],
        sourceEpochUtc: "2026-04-25T22:15:34.493Z",
        projectionEpochUtc: "2026-04-26T10:21:10Z",
        freshnessClass: "fresh-display-context",
        sourcePosition: {
          positionKind: "source-orbit-position",
          lat: 0.014255,
          lon: 87.999875,
          heightMeters: 35790700,
          coordinateFrame: "wgs84",
          precision: SOURCE_POSITION_PRECISION
        },
        artifactRenderPosition: {
          positionKind: "near-fixed-geo-anchor",
          lat: -0.015029,
          lon: 88.033612,
          heightMeters: 35782072,
          coordinateFrame: "wgs84",
          renderPositionBasis:
            "CelesTrak NORAD GP TLE propagated to projectionEpochUtc for viewer-owned GEO continuity display context; not active serving-satellite truth",
          renderPositionIsSourceTruth: false
        },
        runtimeDisplayTrack: {
          trackKind: "east-asia-near-fixed-geo-anchor",
          start: {
            lat: -0.015029,
            lon: 88.033612,
            heightMeters: 35782072
          },
          stop: {
            lat: -0.015029,
            lon: 88.033612,
            heightMeters: 35782072
          },
          phaseOffset: 0,
          cycleRate: 0,
          renderTrackBasis:
            "Accepted projected GEO continuity anchor position; display context only, not active serving-satellite truth.",
          renderTrackIsSourceTruth: false
        },
        motionMode: "near-fixed-geo-anchor",
        evidenceClass: "display-context",
        modelAssetId: M8A_V4_GROUND_STATION_MODEL_ASSET_ID,
        modelTruth: "generic-satellite-mesh",
        truthBoundary: {
          doesClaim: [
            "ST-2 has a source-lineaged CelesTrak NORAD GP TLE record",
            "the sourcePosition and renderPosition are TLE-derived display-context orbit samples",
            "the actor may be rendered as a GEO continuity anchor"
          ],
          doesNotClaim: [
            "active serving satellite identity",
            "active gateway assignment",
            "pair-specific teleport path truth",
            "measured latency/jitter/throughput truth",
            "native RF handover",
            "live operational truth",
            "ST-2 spacecraft body geometry"
          ],
          requiredDisplayBadges: [
            "modeled service state",
            "not active satellite",
            "not native RF handover"
          ]
        },
        nonClaims: M8A_V4_GROUND_STATION_NON_CLAIMS
      }
    ],
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
