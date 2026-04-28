import {
  ArcType,
  BillboardGraphics,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  EllipseGraphics,
  Entity,
  HorizontalOrigin,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  Math as CesiumMath,
  ModelGraphics,
  PointGraphics,
  PolylineDashMaterialProperty,
  PolylineGraphics,
  VerticalOrigin,
  type Viewer
} from "cesium";
import {
  eciToEcf,
  gstime,
  propagate,
  twoline2satrec
} from "satellite.js";

import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type { ReplayClock, ReplayClockState } from "../features/time";
import {
  M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH,
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE,
  M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID,
  M8A_V4_GROUND_STATION_SCENARIO_ID,
  M8A_V46D_SIMULATION_HANDOVER_MODEL_ID,
  type M8aV4ActorDisplayRole,
  type M8aV4EndpointId,
  type M8aV4EndpointProjection,
  type M8aV4GeoPosition,
  type M8aV4OrbitActorProjection,
  type M8aV4OrbitClass,
  type M8aV4RuntimeNarrativeNonClaims,
  type M8aV4ServiceStateWindow,
  type M8aV46dActorId,
  type M8aV46dSimulationHandoverWindow,
  type M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";

export const M8A_V4_GROUND_STATION_DATA_SOURCE_NAME =
  "m8a-v4-ground-station-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_RUNTIME_STATE =
  "active-v4.3-continuous-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene";

const M8A_V4_CAMERA_LONGITUDE = 114;
const M8A_V4_CAMERA_LATITUDE = -44;
const M8A_V4_CAMERA_HEIGHT_METERS = 11_500_000;
const M8A_V4_CAMERA_HEADING_DEGREES = 0;
const M8A_V4_CAMERA_PITCH_DEGREES = -80;
const M8A_V4_CAMERA_SCREEN_UP_PAN_METERS = 4_000_000;
const M8A_V4_MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const M8A_V4_FULL_LEO_ORBIT_REPLAY_MARGIN_MS = 5 * 60 * 1000;
const M8A_V47_PRODUCT_UX_VERSION =
  "m8a-v4.7-handover-product-ux-runtime.v1";
const M8A_V47_GUIDED_REVIEW_MULTIPLIER = 30;
const M8A_V47_PRODUCT_DEFAULT_MULTIPLIER = 60;
const M8A_V47_QUICK_SCAN_MULTIPLIER = 120;
const M8A_V47_DEBUG_TEST_MULTIPLIER = 240;
const M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS = [
  M8A_V47_GUIDED_REVIEW_MULTIPLIER,
  M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
  M8A_V47_QUICK_SCAN_MULTIPLIER
] as const;
const M8A_V47_FINAL_HOLD_DURATION_MS = 4_000;
const M8A_V47_FINAL_HOLD_MIN_MS = 3_000;
const M8A_V47_FINAL_HOLD_MAX_MS = 5_000;
const M8A_V47_TRUTH_BADGES = [
  "simulation output",
  "operator-family precision",
  "display-context actors"
] as const;
const M8A_V47_DISCLOSURE_LINES = [
  "Simulated display-context state, not an operator handover log.",
  "Source-lineaged display-context actors, not active serving satellites.",
  "Endpoint precision stays operator-family only.",
  "No active gateway assignment is claimed.",
  "No pair-specific teleport path is claimed.",
  "No measured latency, jitter, throughput, or continuity values are shown.",
  "No native RF handover is claimed."
] as const;
const M8A_V4_DISPLAY_ORBIT_HEIGHT_METERS = {
  leo: {
    start: 280_000,
    stop: 500_000,
    wobble: 30_000
  },
  meo: {
    start: 2_900_000,
    stop: 3_800_000,
    wobble: 80_000
  },
  geo: {
    start: 6_200_000,
    stop: 6_200_000,
    wobble: 0
  }
} satisfies Record<
  M8aV4OrbitClass,
  { start: number; stop: number; wobble: number }
>;
const M8A_V4_MEO_DISPLAY_LANE_LATITUDE_BIAS_DEGREES = 8;
const M8A_V4_MEO_DISPLAY_LANE_LONGITUDE_BIAS_DEGREES = -5;
const M8A_V4_ACTOR_GLOW_SIZE_PX = 24;
const M8A_V4_ACTOR_GLOW_MODEL_CENTER_OFFSETS = {
  leo: new Cartesian2(0, 0),
  meo: new Cartesian2(-2, -6),
  geo: new Cartesian2(0, -5)
} satisfies Record<M8aV4OrbitClass, Cartesian2>;
const M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX = 560;
const M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS = 1;
const M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 3;
const M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 1;
const M8A_V46E_TIMELINE_LABELS = {
  "leo-acquisition-context": "LEO acquire",
  "leo-aging-pressure": "LEO pressure",
  "meo-continuity-hold": "MEO hold",
  "leo-reentry-candidate": "LEO re-entry",
  "geo-continuity-guard": "GEO guard"
} satisfies Record<M8aV46dSimulationHandoverWindowId, string>;
const M8A_V46E_RELATION_ROLE_LABELS = {
  displayRepresentative: "representative context ribbon",
  candidateContext: "candidate context ribbon",
  fallbackContext: "GEO guard cue"
} satisfies Record<M8aV4RelationRole, string>;

const M8A_V4_TELEMETRY_KEYS = [
  "m8aV4GroundStationRuntimeState",
  "m8aV4GroundStationScenarioId",
  "m8aV4GroundStationProjectionId",
  "m8aV4GroundStationGeneratedFromArtifactId",
  "m8aV4GroundStationDataSourceName",
  "m8aV4GroundStationDataSourceAttached",
  "m8aV4GroundStationEndpointCount",
  "m8aV4GroundStationEndpointIds",
  "m8aV4GroundStationEndpointPrecision",
  "m8aV4GroundStationActorCount",
  "m8aV4GroundStationLeoActorCount",
  "m8aV4GroundStationMeoActorCount",
  "m8aV4GroundStationGeoActorCount",
  "m8aV4GroundStationActorIds",
  "m8aV46eVisualLanguage",
  "m8aV46eActiveStateLabel",
  "m8aV46eVisibleContextRibbonCount",
  "m8aV46eFallbackGuardCueMode",
  "m8aV46eVisibleActorLabelCount",
  "m8aV46eVisibleActorLabelIds",
  "m8aV4GroundStationAlwaysVisibleActorLabelCount",
  "m8aV4GroundStationAlwaysVisibleActorLabelIds",
  "m8aV4GroundStationHiddenContextActorLabelCount",
  "m8aV4GroundStationReplayDurationMs",
  "m8aV4GroundStationReplayMultiplier",
  "m8aV4GroundStationLongestOneWebLeoActorId",
  "m8aV4GroundStationLongestOneWebLeoPeriodMs",
  "m8aV4GroundStationReplayMarginMs",
  "m8aV4GroundStationServiceStateWindowId",
  "m8aV4GroundStationServiceStateSource",
  "m8aV4GroundStationCurrentPrimaryOrbit",
  "m8aV4GroundStationNextCandidateOrbit",
  "m8aV4GroundStationContinuityFallbackOrbit",
  "m8aV4GroundStationBoundedMetricsUsed",
  "m8aV46dSimulationHandoverModelId",
  "m8aV46dSimulationHandoverSource",
  "m8aV46dSimulationHandoverWindowId",
  "m8aV46dSimulationHandoverReplayRatio",
  "m8aV46dDisplayRepresentativeActorId",
  "m8aV46dCandidateContextActorIds",
  "m8aV46dFallbackContextActorIds",
  "m8aV46dBoundedMetricClasses",
  "m8aV46dWindowNonClaims",
  "m8aV47ProductUx",
  "m8aV47PlaybackDefaultMultiplier",
  "m8aV47PlaybackProductMultipliers",
  "m8aV47PlaybackDebugMultiplier",
  "m8aV47PlaybackMultiplier",
  "m8aV47PlaybackStatus",
  "m8aV47FinalHoldActive",
  "m8aV47ReplayProgressRatio",
  "m8aV47SimulatedReplayTime",
  "m8aV47ActiveProductLabel",
  "m8aV47ActiveWindowId",
  "m8aV47TruthBadges",
  "m8aV47LayoutPolicy",
  "m8aV4GroundStationRawItriSideReadOwnership",
  "m8aV4GroundStationRuntimeConsumptionRule",
  "m8aV4GroundStationProofSeam",
  "m8aV4GroundStationNonClaims"
] as const;

type M8aV47ProductPlaybackMultiplier =
  (typeof M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS)[number];
type M8aV47PlaybackMultiplier =
  | M8aV47ProductPlaybackMultiplier
  | typeof M8A_V47_DEBUG_TEST_MULTIPLIER;
type M8aV47PlaybackMode =
  | "guided-review"
  | "product-default"
  | "quick-scan"
  | "debug-test";
type M8aV47PlaybackStatus = "playing" | "paused" | "final-hold";
type M8aV47DisclosureState = "closed" | "open";

type M8aV4RelationRole =
  | "displayRepresentative"
  | "candidateContext"
  | "fallbackContext";

interface M8aV4ActorEmphasis {
  actorId: string;
  orbitClass: M8aV4OrbitClass;
  emphasis: "representative" | "candidate" | "fallback" | "context";
  modelScale: number;
  labelAlpha: number;
}

interface M8aV4ActorRuntimeRecord {
  actorId: string;
  label: string;
  orbitClass: M8aV4OrbitClass;
  displayRole: M8aV4ActorDisplayRole;
  operatorContext: string;
  sourceEpochUtc: string;
  projectionEpochUtc: string;
  motionMode: M8aV4OrbitActorProjection["motionMode"];
  evidenceClass: M8aV4OrbitActorProjection["evidenceClass"];
  modelAssetId: M8aV4OrbitActorProjection["modelAssetId"];
  modelTruth: M8aV4OrbitActorProjection["modelTruth"];
  sourcePositionEcefMeters: {
    x: number;
    y: number;
    z: number;
  };
  renderPositionEcefMeters: {
    x: number;
    y: number;
    z: number;
  };
  artifactRenderPosition: M8aV4OrbitActorProjection["artifactRenderPosition"];
  renderTrackBasis: string;
  renderTrackIsSourceTruth: false;
  propagationTimeUtc: string;
  emphasis: M8aV4ActorEmphasis["emphasis"];
  labelVisibility: "always-visible" | "hidden-context";
}

export interface M8aV4GroundStationSceneState {
  scenarioId: typeof M8A_V4_GROUND_STATION_SCENARIO_ID;
  runtimeState: typeof M8A_V4_GROUND_STATION_RUNTIME_STATE;
  directRoute: {
    queryParam: typeof M8A_V4_GROUND_STATION_QUERY_PARAM;
    queryValue: typeof M8A_V4_GROUND_STATION_QUERY_VALUE;
  };
  projectionId: typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID;
  generatedFromArtifactId:
    typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.generatedFromArtifactId;
  projectionSourceAuthority:
    typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.sourceAuthority;
  dataSourceName: typeof M8A_V4_GROUND_STATION_DATA_SOURCE_NAME;
  dataSourceAttached: boolean;
  endpointCount: 2;
  endpoints: ReadonlyArray<{
    endpointId: M8aV4EndpointId;
    label: string;
    markerId: string;
    precisionBadge: typeof M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
    renderPrecision: "bounded-operator-family-display-anchor";
    displayPositionIsSourceTruth: false;
    rawSourceCoordinatesRenderable: false;
    orbitEvidenceChips: ReadonlyArray<"LEO strong" | "MEO strong" | "GEO strong">;
  }>;
  actorCount: number;
  orbitActorCounts: Record<M8aV4OrbitClass, number>;
  actors: ReadonlyArray<M8aV4ActorRuntimeRecord>;
  actorLabelDensity: {
    policy: "representative-orbit-class-labels-only";
    v46ePolicy: "active-representative-label-with-endpoint-priority";
    viewportClass: "desktop" | "narrow";
    endpointLabelsPriority: true;
    candidateLabelsVisibleByDefault: false;
    fallbackLabelPolicy: "geo-representative-or-guard-state-only";
    preferredVisibleActorLabelCount: 1;
    visibleActorLabelCount: number;
    visibleActorLabelIds: ReadonlyArray<string>;
    alwaysVisibleActorLabelCount: number;
    alwaysVisibleActorLabelIds: ReadonlyArray<string>;
    hiddenContextActorLabelCount: number;
    desktopMaxAlwaysVisibleActorLabels: number;
    narrowMaxAlwaysVisibleActorLabels: number;
  };
  serviceState: {
    modelId:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.modelId;
    truthState: "modeled";
    truthBoundaryLabel: "operator-family-bounded-service-state";
    window: M8aV4ServiceStateWindow;
    timelineWindowIds: ReadonlyArray<string>;
    isNativeRfHandover: false;
    measuredLatency: false;
    measuredJitter: false;
    measuredThroughput: false;
  };
  simulationHandoverModel: {
    modelId: typeof M8A_V46D_SIMULATION_HANDOVER_MODEL_ID;
    modelStatus: "accepted-contract";
    modelScope: "deterministic-display-context-state-machine";
    modelTruth: "simulation-output-not-operator-log";
    endpointPairId:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.endpointPairId;
    acceptedPairPrecision: "operator-family-only";
    route:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.route;
    sourceRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline";
    replayRatio: number;
    window: M8aV46dSimulationHandoverWindow;
    timeline: ReadonlyArray<M8aV46dSimulationHandoverWindow>;
    timelineWindowIds: ReadonlyArray<string>;
    validationExpectations:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.validationExpectations;
    forbiddenClaimScan:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.forbiddenClaimScan;
  };
  replayWindow: {
    startTimeUtc: string;
    stopTimeUtc: string;
    durationMs: number;
    playbackMultiplier: number;
    longestCurrentOneWebLeoActorId: string;
    longestCurrentOneWebLeoSourceRecordName: string;
    longestCurrentOneWebLeoMeanMotionRevPerDay: number;
    longestCurrentOneWebLeoPeriodMs: number;
    replayMarginMs: number;
    periodSource: "repo-owned-oneweb-tle-mean-motion";
  };
  productUx: {
    version: typeof M8A_V47_PRODUCT_UX_VERSION;
    playbackPolicy: {
      defaultMultiplier: typeof M8A_V47_PRODUCT_DEFAULT_MULTIPLIER;
      guidedReviewMultiplier: typeof M8A_V47_GUIDED_REVIEW_MULTIPLIER;
      quickScanMultiplier: typeof M8A_V47_QUICK_SCAN_MULTIPLIER;
      debugTestMultiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER;
      productMultipliers: ReadonlyArray<M8aV47ProductPlaybackMultiplier>;
      normalControlsExposeDebugMultiplier: false;
      finalHoldDurationMs: typeof M8A_V47_FINAL_HOLD_DURATION_MS;
      finalHoldRangeMs: {
        min: typeof M8A_V47_FINAL_HOLD_MIN_MS;
        max: typeof M8A_V47_FINAL_HOLD_MAX_MS;
      };
      loopPolicy: "hold-final-state-then-restart";
    };
    playback: {
      multiplier: M8aV47PlaybackMultiplier;
      mode: M8aV47PlaybackMode;
      status: M8aV47PlaybackStatus;
      replayRatio: number;
      finalHoldActive: boolean;
      finalHoldStartedAtEpochMs: number | null;
      finalHoldCompletedAtEpochMs: number | null;
      finalHoldLoopCount: number;
      reviewElapsedDisplay: string;
      reviewDurationDisplay: string;
      simulatedReplayTimeDisplay: string;
      replayUtcDisplay: string;
    };
    informationHierarchy: readonly [
      "scene",
      "current-simulation-state",
      "playback-and-time",
      "truth-boundary-badges",
      "optional-detail"
    ];
    stateLabels: Record<M8aV46dSimulationHandoverWindowId, string>;
    activeWindowId: M8aV46dSimulationHandoverWindowId;
    activeProductLabel: string;
    truthBadges: typeof M8A_V47_TRUTH_BADGES;
    disclosure: {
      state: M8aV47DisclosureState;
      lines: typeof M8A_V47_DISCLOSURE_LINES;
    };
    layout: {
      viewportClass: "desktop" | "narrow";
      desktopPolicy: "right-review-rail";
      narrowPolicy: "minimal-strip-with-inspection-sheet";
      detailSheetState: M8aV47DisclosureState;
      protectedZonePolicy:
        "endpoint-corridor-geo-guard-and-required-labels-non-obstruction";
    };
  };
  relationCues: {
    cueKind: "v4.6e-handover-visual-language-context-ribbons";
    displayRepresentativeActorId: M8aV46dActorId;
    candidateContextActorId: M8aV46dActorId;
    fallbackContextActorId: M8aV46dActorId;
    visibleContextRibbonCount: 2;
    visibleContextRibbonRoles: readonly ["displayRepresentative", "candidateContext"];
    fallbackGuardCueMode:
      | "low-opacity-geo-guard-cue"
      | "representative-context-ribbon-in-geo-continuity-guard";
    fallbackFullRibbonVisible: false;
    activeSatelliteTruth: "not-claimed";
    activeGatewayTruth: "not-claimed";
    pairSpecificTeleportPathTruth: "not-claimed";
    nativeRfHandoverTruth: "not-claimed";
  };
  nonClaims: M8aV4RuntimeNarrativeNonClaims;
  proofSeam: typeof M8A_V4_GROUND_STATION_PROOF_SEAM;
  sourceLineage: {
    projectionRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
    serviceStateRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline";
    simulationHandoverRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline";
    rawPackageSideReadOwnership: "forbidden";
    rawSourcePathsIncluded: false;
  };
  modelAsset: typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.modelAsset & {
    uri: string;
  };
}

export interface M8aV4GroundStationSceneController {
  getState(): M8aV4GroundStationSceneState;
  subscribe(listener: (state: M8aV4GroundStationSceneState) => void): () => void;
  play(): void;
  pause(): void;
  restart(): void;
  setPlaybackMultiplier(multiplier: M8aV47ProductPlaybackMultiplier): void;
  setDebugPlaybackMultiplier(
    multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
  ): void;
  dispose(): void;
}

export interface M8aV4GroundStationSceneControllerOptions {
  viewer: Viewer;
  hudFrame: HTMLElement;
  replayClock: ReplayClock;
}

interface ActorRenderHandle {
  actor: M8aV4OrbitActorProjection;
  entity: Entity;
}

interface RelationRenderHandle {
  role: M8aV4RelationRole;
  entity: Entity;
}

interface PropagatedActorPosition {
  cartesian: Cartesian3;
  propagationTimeUtc: string;
}

interface M8aV4OneWebLeoPeriod {
  actorId: string;
  sourceRecordName: string;
  meanMotionRevPerDay: number;
  periodMs: number;
}

interface M8aV4ReplayProfile {
  longestOneWebLeoActorId: string;
  longestOneWebLeoSourceRecordName: string;
  longestOneWebLeoMeanMotionRevPerDay: number;
  longestOneWebLeoPeriodMs: number;
  replayMarginMs: number;
  replayDurationMs: number;
  playbackMultiplier: number;
  periodSource: "repo-owned-oneweb-tle-mean-motion";
}

export function isM8aV4GroundStationRuntimeRequested(search: URLSearchParams): boolean {
  return (
    search.get(M8A_V4_GROUND_STATION_QUERY_PARAM) ===
      M8A_V4_GROUND_STATION_QUERY_VALUE ||
    search.get("firstIntakeScenarioId") === M8A_V4_GROUND_STATION_SCENARIO_ID
  );
}

function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

function assertFiniteTimestamp(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must resolve to a finite timestamp.`);
  }
}

function toEpochMilliseconds(value: ReplayClockState["currentTime"]): number {
  const epochMs = typeof value === "number" ? value : Date.parse(value);
  assertFiniteTimestamp(epochMs, "m8aV4GroundStation.timestamp");
  return epochMs;
}

function toIsoTimestamp(value: ReplayClockState["currentTime"] | number): string {
  return new Date(toEpochMilliseconds(value)).toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeUnit(value: number): number {
  const normalized = value % 1;
  return normalized < 0 ? normalized + 1 : normalized;
}

function parseTleMeanMotionRevPerDay(
  tleLine2: string,
  actorId: string
): number {
  const meanMotion = Number(tleLine2.slice(52, 63).trim());

  if (!Number.isFinite(meanMotion) || meanMotion <= 0) {
    throw new Error(
      `Missing positive TLE mean motion for V4 actor ${actorId}.`
    );
  }

  return meanMotion;
}

function isCurrentOneWebLeoActor(actor: M8aV4OrbitActorProjection): boolean {
  const sourceRecordName = actor.sourceLineage[0]?.sourceRecordName ?? "";

  return (
    actor.orbitClass === "leo" &&
    actor.operatorContext.toLowerCase().includes("oneweb") &&
    sourceRecordName.toLowerCase().startsWith("oneweb-")
  );
}

function resolveCurrentOneWebLeoActorPeriods(
  actors: ReadonlyArray<M8aV4OrbitActorProjection>
): ReadonlyArray<M8aV4OneWebLeoPeriod> {
  return actors.filter(isCurrentOneWebLeoActor).map((actor) => {
    const lineage = actor.sourceLineage[0];

    if (!lineage) {
      throw new Error(`Missing V4 OneWeb LEO lineage for ${actor.actorId}.`);
    }

    const meanMotionRevPerDay = parseTleMeanMotionRevPerDay(
      lineage.tleLine2,
      actor.actorId
    );

    return {
      actorId: actor.actorId,
      sourceRecordName: lineage.sourceRecordName,
      meanMotionRevPerDay,
      periodMs: M8A_V4_MILLISECONDS_PER_DAY / meanMotionRevPerDay
    };
  });
}

function resolveLongestCurrentOneWebLeoActorPeriod(
  actors: ReadonlyArray<M8aV4OrbitActorProjection>
): M8aV4OneWebLeoPeriod {
  const periods = resolveCurrentOneWebLeoActorPeriods(actors);

  if (periods.length === 0) {
    throw new Error("V4.6A replay requires at least one current OneWeb LEO actor.");
  }

  return periods.reduce((longest, candidate) =>
    candidate.periodMs > longest.periodMs ? candidate : longest
  );
}

function buildFullLeoOrbitReplayProfile(): M8aV4ReplayProfile {
  const longestLeoPeriod = resolveLongestCurrentOneWebLeoActorPeriod(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors
  );

  return {
    longestOneWebLeoActorId: longestLeoPeriod.actorId,
    longestOneWebLeoSourceRecordName: longestLeoPeriod.sourceRecordName,
    longestOneWebLeoMeanMotionRevPerDay:
      longestLeoPeriod.meanMotionRevPerDay,
    longestOneWebLeoPeriodMs: longestLeoPeriod.periodMs,
    replayMarginMs: M8A_V4_FULL_LEO_ORBIT_REPLAY_MARGIN_MS,
    replayDurationMs: Math.ceil(
      longestLeoPeriod.periodMs + M8A_V4_FULL_LEO_ORBIT_REPLAY_MARGIN_MS
    ),
    playbackMultiplier: M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
    periodSource: "repo-owned-oneweb-tle-mean-motion"
  };
}

function lerp(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

const M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE =
  buildFullLeoOrbitReplayProfile();

function positionToCartesian(position: M8aV4GeoPosition): Cartesian3 {
  return Cartesian3.fromDegrees(
    position.lon,
    position.lat,
    position.heightMeters
  );
}

function positionToPlainMeters(cartesian: Cartesian3): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: cartesian.x,
    y: cartesian.y,
    z: cartesian.z
  };
}

function resolveReplayWindowRatio(replayState: ReplayClockState): number {
  const startMs = toEpochMilliseconds(replayState.startTime);
  const stopMs = toEpochMilliseconds(replayState.stopTime);
  const currentMs = toEpochMilliseconds(replayState.currentTime);
  const durationMs = stopMs - startMs;

  if (durationMs <= 0) {
    return 0;
  }

  return clamp((currentMs - startMs) / durationMs, 0, 1);
}

function resolveServiceStateWindow(
  replayState: ReplayClockState
): M8aV4ServiceStateWindow {
  const ratio = resolveReplayWindowRatio(replayState);

  return (
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline.find(
      (windowDefinition) =>
        ratio >= windowDefinition.startRatio &&
        ratio < windowDefinition.stopRatio
    ) ??
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline[
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline.length - 1
    ]
  );
}

function resolveSimulationHandoverWindow(
  replayState: ReplayClockState
): M8aV46dSimulationHandoverWindow {
  const ratio = resolveReplayWindowRatio(replayState);
  const timeline =
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline;

  return (
    timeline.find((windowDefinition) => {
      const isFinalWindow = windowDefinition.stopRatioExclusive === 1;

      return (
        ratio >= windowDefinition.startRatioInclusive &&
        (ratio < windowDefinition.stopRatioExclusive ||
          (isFinalWindow && ratio <= 1))
      );
    }) ?? timeline[timeline.length - 1]
  );
}

function resolveActorDisplayHeightMeters(
  orbitClass: M8aV4OrbitClass,
  easedRatio: number,
  loopRatio: number
): number {
  const heightBand = M8A_V4_DISPLAY_ORBIT_HEIGHT_METERS[orbitClass];
  return (
    lerp(heightBand.start, heightBand.stop, easedRatio) +
    Math.sin(loopRatio * Math.PI * 2) * heightBand.wobble
  );
}

function resolveModelUri(): string {
  const publicBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(
    M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH,
    publicBaseUrl
  ).toString();
}

function configureReplayClock(viewer: Viewer, replayClock: ReplayClock): void {
  const startMs = Date.parse(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.projectionEpochUtc
  );
  assertFiniteTimestamp(startMs, "m8aV4GroundStation.projectionEpochUtc");
  const stopMs =
    startMs + M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.replayDurationMs;
  const range = {
    start: new Date(startMs).toISOString(),
    stop: new Date(stopMs).toISOString()
  };

  replayClock.setMode("prerecorded", range);
  replayClock.seek(range.start);
  replayClock.setMultiplier(
    M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.playbackMultiplier
  );
  replayClock.play();
  viewer.timeline?.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
}

function applyV4Camera(viewer: Viewer): void {
  viewer.camera.cancelFlight();
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      M8A_V4_CAMERA_LONGITUDE,
      M8A_V4_CAMERA_LATITUDE,
      M8A_V4_CAMERA_HEIGHT_METERS
    ),
    orientation: {
      heading: CesiumMath.toRadians(M8A_V4_CAMERA_HEADING_DEGREES),
      pitch: CesiumMath.toRadians(M8A_V4_CAMERA_PITCH_DEGREES),
      roll: 0
    }
  });
  viewer.camera.moveUp(M8A_V4_CAMERA_SCREEN_UP_PAN_METERS);
  viewer.scene.requestRender();
}

function resolveEndpointColor(endpointId: M8aV4EndpointId): Color {
  return endpointId === "tw-cht-multi-orbit-ground-infrastructure"
    ? Color.fromCssColorString("#f4fbff")
    : Color.fromCssColorString("#7ee2b8");
}

function resolveActorGlowHex(orbitClass: M8aV4OrbitClass): string {
  switch (orbitClass) {
    case "leo":
      return "#ffffff";
    case "meo":
      return "#d46bff";
    case "geo":
      return "#ffb23f";
  }
}

function createActorGlowImageUri(orbitClass: M8aV4OrbitClass): string {
  const glowColor = resolveActorGlowHex(orbitClass);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">',
    '<stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>',
    `<stop offset="0.34" stop-color="${glowColor}" stop-opacity="0.62"/>`,
    `<stop offset="0.72" stop-color="${glowColor}" stop-opacity="0.24"/>`,
    `<stop offset="1" stop-color="${glowColor}" stop-opacity="0"/>`,
    "</radialGradient></defs>",
    '<circle cx="32" cy="32" r="32" fill="url(#g)"/>',
    "</svg>"
  ].join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolveActorGlowModelCenterOffset(
  orbitClass: M8aV4OrbitClass
): Cartesian2 {
  const offset = M8A_V4_ACTOR_GLOW_MODEL_CENTER_OFFSETS[orbitClass];

  return new Cartesian2(offset.x, offset.y);
}

function resolveActorLabelBackgroundColor(): Color {
  return Color.fromCssColorString("#0b1820").withAlpha(0.58);
}

function resolveViewportClass(): "desktop" | "narrow" {
  return window.innerWidth <= M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX
    ? "narrow"
    : "desktop";
}

function resolveTimelineLabel(
  windowId: M8aV46dSimulationHandoverWindowId
): string {
  return M8A_V46E_TIMELINE_LABELS[windowId];
}

function resolvePlaybackMode(
  multiplier: number
): M8aV47PlaybackMode {
  switch (multiplier) {
    case M8A_V47_GUIDED_REVIEW_MULTIPLIER:
      return "guided-review";
    case M8A_V47_PRODUCT_DEFAULT_MULTIPLIER:
      return "product-default";
    case M8A_V47_QUICK_SCAN_MULTIPLIER:
      return "quick-scan";
    case M8A_V47_DEBUG_TEST_MULTIPLIER:
      return "debug-test";
    default:
      return "product-default";
  }
}

function coercePlaybackMultiplier(
  multiplier: number
): M8aV47PlaybackMultiplier {
  return multiplier === M8A_V47_GUIDED_REVIEW_MULTIPLIER ||
    multiplier === M8A_V47_PRODUCT_DEFAULT_MULTIPLIER ||
    multiplier === M8A_V47_QUICK_SCAN_MULTIPLIER ||
    multiplier === M8A_V47_DEBUG_TEST_MULTIPLIER
    ? multiplier
    : M8A_V47_PRODUCT_DEFAULT_MULTIPLIER;
}

function formatReviewClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function buildSimulatedReplayTimeDisplay(
  replayRatio: number,
  replayDurationMs: number,
  multiplier: number
): {
  reviewElapsedDisplay: string;
  reviewDurationDisplay: string;
  simulatedReplayTimeDisplay: string;
} {
  const safeMultiplier =
    Number.isFinite(multiplier) && multiplier > 0
      ? multiplier
      : M8A_V47_PRODUCT_DEFAULT_MULTIPLIER;
  const reviewDurationSeconds = replayDurationMs / 1000 / safeMultiplier;
  const reviewElapsedSeconds = reviewDurationSeconds * replayRatio;
  const reviewElapsedDisplay = formatReviewClock(reviewElapsedSeconds);
  const reviewDurationDisplay = formatReviewClock(reviewDurationSeconds);

  return {
    reviewElapsedDisplay,
    reviewDurationDisplay,
    simulatedReplayTimeDisplay: `Sim replay ${reviewElapsedDisplay} / ${reviewDurationDisplay}`
  };
}

function resolvePlaybackStatus(
  replayState: ReplayClockState,
  finalHoldActive: boolean
): M8aV47PlaybackStatus {
  if (finalHoldActive) {
    return "final-hold";
  }

  return replayState.isPlaying ? "playing" : "paused";
}

function resolveFallbackGuardCueMode(
  simulationWindow: M8aV46dSimulationHandoverWindow
): M8aV4GroundStationSceneState["relationCues"]["fallbackGuardCueMode"] {
  return simulationWindow.windowId === "geo-continuity-guard"
    ? "representative-context-ribbon-in-geo-continuity-guard"
    : "low-opacity-geo-guard-cue";
}

function resolveActorEmphasis(
  actor: M8aV4OrbitActorProjection,
  simulationWindow: M8aV46dSimulationHandoverWindow
): M8aV4ActorEmphasis {
  const candidateActorIds =
    simulationWindow.candidateContextActorIds as readonly string[];
  const fallbackActorIds =
    simulationWindow.fallbackContextActorIds as readonly string[];
  const emphasis =
    actor.actorId === simulationWindow.displayRepresentativeActorId
      ? "representative"
      : candidateActorIds.includes(actor.actorId)
        ? "candidate"
        : fallbackActorIds.includes(actor.actorId)
          ? "fallback"
          : "context";

  return {
    actorId: actor.actorId,
    orbitClass: actor.orbitClass,
    emphasis,
    modelScale:
      emphasis === "representative"
        ? 1.22
        : emphasis === "candidate"
          ? 1.06
          : 0.9,
    labelAlpha: emphasis === "context" ? 0.62 : 0.94
  };
}

function createEndpointPointStyle(endpoint: M8aV4EndpointProjection): PointGraphics {
  return new PointGraphics({
    pixelSize: new ConstantProperty(11),
    color: new ConstantProperty(resolveEndpointColor(endpoint.endpointId)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 60_000_000)
  });
}

function createEndpointEllipseStyle(
  endpoint: M8aV4EndpointProjection
): EllipseGraphics {
  const color = resolveEndpointColor(endpoint.endpointId);

  return new EllipseGraphics({
    semiMajorAxis: new ConstantProperty(endpoint.renderMarker.displayRadiusMeters),
    semiMinorAxis: new ConstantProperty(endpoint.renderMarker.displayRadiusMeters),
    material: color.withAlpha(0.1),
    outline: new ConstantProperty(true),
    outlineColor: new ConstantProperty(color.withAlpha(0.65)),
    height: new ConstantProperty(endpoint.renderMarker.displayPosition.heightMeters)
  });
}

function createEndpointLabelStyle(endpoint: M8aV4EndpointProjection): LabelGraphics {
  return new LabelGraphics({
    text: new ConstantProperty(
      `${endpoint.renderMarker.label}\n${M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE}`
    ),
    font: "12px sans-serif",
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(Color.WHITE.withAlpha(0.96)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#0b1820").withAlpha(0.68)
    ),
    backgroundPadding: new Cartesian2(8, 5),
    pixelOffset: new Cartesian2(0, -32),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 60_000_000)
  });
}

function createActorGlowStyle(actor: M8aV4OrbitActorProjection): BillboardGraphics {
  return new BillboardGraphics({
    image: new ConstantProperty(createActorGlowImageUri(actor.orbitClass)),
    width: new ConstantProperty(M8A_V4_ACTOR_GLOW_SIZE_PX),
    height: new ConstantProperty(M8A_V4_ACTOR_GLOW_SIZE_PX),
    pixelOffset: new ConstantProperty(
      resolveActorGlowModelCenterOffset(actor.orbitClass)
    ),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
}

function createGeoGuardCueStyle(): BillboardGraphics {
  return new BillboardGraphics({
    image: new ConstantProperty(createActorGlowImageUri("geo")),
    width: new ConstantProperty(54),
    height: new ConstantProperty(54),
    color: new ConstantProperty(Color.WHITE.withAlpha(0.38)),
    pixelOffset: new ConstantProperty(resolveActorGlowModelCenterOffset("geo")),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function shouldRenderActorGlow(actor: M8aV4OrbitActorProjection): boolean {
  return actor.orbitClass !== "leo";
}

function shouldRenderActorLabel(
  actor: M8aV4OrbitActorProjection,
  simulationWindow: M8aV46dSimulationHandoverWindow
): boolean {
  return actor.actorId === simulationWindow.displayRepresentativeActorId;
}

function shouldShowGeoGuardCue(
  simulationWindow: M8aV46dSimulationHandoverWindow
): boolean {
  return simulationWindow.windowId !== "geo-continuity-guard";
}

function createActorLabelStyle(
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): LabelGraphics {
  const offset =
    actor.orbitClass === "geo"
      ? new Cartesian2(18, -34)
      : actor.orbitClass === "meo"
        ? new Cartesian2(-18, -34)
        : new Cartesian2(0, -36);

  return new LabelGraphics({
    text: new ConstantProperty(actor.label),
    font: "12px sans-serif",
    scale: 0.9,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    ),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(resolveActorLabelBackgroundColor()),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset: offset,
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createActorModelGraphics(
  modelUri: string,
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): ModelGraphics {
  return new ModelGraphics({
    uri: new ConstantProperty(modelUri),
    scale: new ConstantProperty(emphasis.modelScale),
    minimumPixelSize: new ConstantProperty(
      actor.orbitClass === "geo" ? 50 : actor.orbitClass === "meo" ? 58 : 52
    ),
    maximumScale: new ConstantProperty(180_000)
  });
}

function resolveRelationColor(role: M8aV4RelationRole): Color {
  switch (role) {
    case "displayRepresentative":
      return Color.fromCssColorString("#f7d46a").withAlpha(0.76);
    case "candidateContext":
      return Color.fromCssColorString("#7ee2b8").withAlpha(0.46);
    case "fallbackContext":
      return Color.fromCssColorString("#ffd166").withAlpha(0.2);
  }
}

function resolveRelationWidth(role: M8aV4RelationRole): number {
  switch (role) {
    case "displayRepresentative":
      return 2.35;
    case "candidateContext":
      return 1.45;
    case "fallbackContext":
      return 1.1;
  }
}

function createRelationStyle(
  positions: CallbackProperty,
  role: M8aV4RelationRole
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: new ConstantProperty(resolveRelationWidth(role)),
    material: new PolylineDashMaterialProperty({
      color: new ConstantProperty(resolveRelationColor(role)),
      gapColor: new ConstantProperty(
        Color.fromCssColorString("#06121a").withAlpha(0.04)
      ),
      dashLength: role === "displayRepresentative" ? 18 : 24
    }),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function updateActorStyle(
  handle: ActorRenderHandle,
  emphasis: M8aV4ActorEmphasis,
  simulationWindow: M8aV46dSimulationHandoverWindow
): void {
  if (handle.entity.model) {
    handle.entity.model.scale = new ConstantProperty(emphasis.modelScale);
    handle.entity.model.color = undefined;
    handle.entity.model.colorBlendAmount = undefined;
  }

  if (handle.entity.billboard) {
    handle.entity.billboard.image = new ConstantProperty(
      createActorGlowImageUri(handle.actor.orbitClass)
    );
    handle.entity.billboard.width = new ConstantProperty(
      M8A_V4_ACTOR_GLOW_SIZE_PX
    );
    handle.entity.billboard.height = new ConstantProperty(
      M8A_V4_ACTOR_GLOW_SIZE_PX
    );
    handle.entity.billboard.pixelOffset = new ConstantProperty(
      resolveActorGlowModelCenterOffset(handle.actor.orbitClass)
    );
  }

  if (shouldRenderActorLabel(handle.actor, simulationWindow)) {
    if (!handle.entity.label) {
      handle.entity.label = createActorLabelStyle(handle.actor, emphasis);
    }

    handle.entity.label.fillColor = new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    );
  } else {
    handle.entity.label = undefined;
  }
}

function updateRelationStyle(handle: RelationRenderHandle): void {
  if (!handle.entity.polyline) {
    return;
  }

  handle.entity.polyline.width = new ConstantProperty(
    resolveRelationWidth(handle.role)
  );
  handle.entity.polyline.material = new PolylineDashMaterialProperty({
    color: new ConstantProperty(resolveRelationColor(handle.role)),
    gapColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.04)
    ),
    dashLength: handle.role === "displayRepresentative" ? 18 : 24
  });
}

function createHudRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "m8a-v4-ground-station-scene";
  root.dataset.m8aV4GroundStationScene = "true";
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.dataset.m8aV46eVisualLanguage = "true";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", "M8A V4.6E hidden runtime state seam");
  return root;
}

function renderHud(root: HTMLElement, state: M8aV4GroundStationSceneState): void {
  const activeStateLabel = resolveTimelineLabel(
    state.simulationHandoverModel.window.windowId
  );

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.dataset.m8aV46eVisualLanguage = "true";
  root.dataset.activeStateLabel = activeStateLabel;
  root.dataset.serviceWindowId = state.serviceState.window.windowId;
  root.dataset.simulationHandoverModelId =
    state.simulationHandoverModel.modelId;
  root.dataset.simulationHandoverWindowId =
    state.simulationHandoverModel.window.windowId;
  root.dataset.displayRepresentativeActorId =
    state.simulationHandoverModel.window.displayRepresentativeActorId;
  root.dataset.candidateContextActorIds = serializeList(
    state.simulationHandoverModel.window.candidateContextActorIds
  );
  root.dataset.fallbackContextActorIds = serializeList(
    state.simulationHandoverModel.window.fallbackContextActorIds
  );
  root.dataset.currentPrimaryOrbit =
    state.serviceState.window.currentPrimaryOrbitClass;
  root.dataset.nextCandidateOrbit =
    state.serviceState.window.nextCandidateOrbitClass;
  root.dataset.precisionBadge = M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
  root.dataset.visibleContextRibbonCount = String(
    state.relationCues.visibleContextRibbonCount
  );
  root.dataset.fallbackGuardCueMode = state.relationCues.fallbackGuardCueMode;
  root.dataset.visibleActorLabelCount = String(
    state.actorLabelDensity.visibleActorLabelCount
  );
  root.dataset.visibleActorLabelIds = serializeList(
    state.actorLabelDensity.visibleActorLabelIds
  );
  root.dataset.rawItriSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;
  root.dataset.nonClaims = serializeJson(state.nonClaims);
  root.innerHTML = "";
}

function createProductUxRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "m8a-v47-product-ux";
  root.dataset.m8aV47ProductUx = "true";
  root.setAttribute("aria-label", "M8A V4.7 product review controls");
  return root;
}

function renderTruthBadges(): string {
  return M8A_V47_TRUTH_BADGES.map(
    (badge) => `<span data-m8a-v47-truth-badge="${badge}">${badge}</span>`
  ).join("");
}

function renderSpeedButtons(activeMultiplier: number): string {
  return M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS.map((multiplier) => {
    const isActive = activeMultiplier === multiplier;

    return [
      `<button type="button" class="m8a-v47-product-ux__speed"`,
      ` data-m8a-v47-action="speed"`,
      ` data-m8a-v47-playback-multiplier="${multiplier}"`,
      ` aria-pressed="${isActive ? "true" : "false"}">`,
      `${multiplier}x`,
      "</button>"
    ].join("");
  }).join("");
}

function renderStagePills(
  state: M8aV4GroundStationSceneState
): string {
  return state.simulationHandoverModel.timeline
    .map((windowDefinition) => {
      const label = state.productUx.stateLabels[windowDefinition.windowId];
      const isActive = windowDefinition.windowId === state.productUx.activeWindowId;

      return [
        `<span class="m8a-v47-product-ux__stage"`,
        ` data-m8a-v47-window-id="${windowDefinition.windowId}"`,
        ` data-active="${isActive ? "true" : "false"}">`,
        label,
        "</span>"
      ].join("");
    })
    .join("");
}

function renderDisclosureLines(): string {
  return M8A_V47_DISCLOSURE_LINES.map(
    (line) => `<li>${line}</li>`
  ).join("");
}

function renderProductUx(
  root: HTMLElement,
  state: M8aV4GroundStationSceneState
): void {
  const productUx = state.productUx;
  const activeMultiplier = productUx.playback.multiplier;
  const playbackAction =
    productUx.playback.status === "playing" ? "pause" : "play";
  const playbackLabel =
    productUx.playback.status === "playing" ? "Pause" : "Play";
  const sheetOpen = productUx.disclosure.state === "open";
  const progressValue = productUx.playback.replayRatio.toFixed(6);

  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  root.dataset.viewportClass = productUx.layout.viewportClass;
  root.dataset.playbackStatus = productUx.playback.status;
  root.dataset.playbackMultiplier = String(activeMultiplier);
  root.dataset.activeWindowId = productUx.activeWindowId;
  root.dataset.activeProductLabel = productUx.activeProductLabel;
  root.dataset.finalHoldActive = String(productUx.playback.finalHoldActive);
  root.dataset.replayProgressRatio = progressValue;
  root.dataset.truthDisclosure = productUx.disclosure.state;
  root.dataset.normalControlsExposeDebugMultiplier = "false";

  root.innerHTML = `
    <div class="m8a-v47-product-ux__rail" data-m8a-v47-ui-surface="desktop-rail">
      <div class="m8a-v47-product-ux__header">
        <span>Current simulation state</span>
        <strong data-m8a-v47-active-label="true">${productUx.activeProductLabel}</strong>
        <small>${productUx.playback.simulatedReplayTimeDisplay}</small>
      </div>
      <div class="m8a-v47-product-ux__controls" data-m8a-v47-control-group="playback">
        <button type="button" data-m8a-v47-action="${playbackAction}">${playbackLabel}</button>
        <button type="button" data-m8a-v47-action="restart">Restart</button>
      </div>
      <div class="m8a-v47-product-ux__speed-group" data-m8a-v47-control-group="speed">
        ${renderSpeedButtons(activeMultiplier)}
      </div>
      <div class="m8a-v47-product-ux__time">
        <span data-m8a-v47-time-label="simulated">${productUx.playback.simulatedReplayTimeDisplay}</span>
        <span data-m8a-v47-time-label="replay-utc">${productUx.playback.replayUtcDisplay}</span>
      </div>
      <progress class="m8a-v47-product-ux__progress" max="1" value="${progressValue}" data-m8a-v47-progress="true"></progress>
      <div class="m8a-v47-product-ux__stages" data-m8a-v47-label-map="v4.6d-window-id-to-product-label">
        ${renderStagePills(state)}
      </div>
      <div class="m8a-v47-product-ux__badges" data-m8a-v47-truth-badges="true">
        ${renderTruthBadges()}
      </div>
      <button type="button" class="m8a-v47-product-ux__disclosure-button" data-m8a-v47-action="toggle-disclosure" aria-expanded="${sheetOpen ? "true" : "false"}">Truth boundary</button>
    </div>
    <div class="m8a-v47-product-ux__strip" data-m8a-v47-ui-surface="narrow-strip">
      <strong data-m8a-v47-active-label="true">${productUx.activeProductLabel}</strong>
      <button type="button" data-m8a-v47-action="${playbackAction}">${playbackLabel}</button>
      <div class="m8a-v47-product-ux__strip-speeds">${renderSpeedButtons(activeMultiplier)}</div>
      <progress max="1" value="${progressValue}" data-m8a-v47-progress="true"></progress>
      <button type="button" data-m8a-v47-action="toggle-disclosure" aria-expanded="${sheetOpen ? "true" : "false"}">Details</button>
    </div>
    <aside class="m8a-v47-product-ux__sheet" data-m8a-v47-ui-surface="inspection-sheet" ${sheetOpen ? "" : "hidden"}>
      <div class="m8a-v47-product-ux__sheet-header">
        <strong>Truth boundary</strong>
        <button type="button" data-m8a-v47-action="close-disclosure">Close</button>
      </div>
      <div class="m8a-v47-product-ux__badges">
        ${renderTruthBadges()}
      </div>
      <ul>
        ${renderDisclosureLines()}
      </ul>
    </aside>
  `;
}

function cloneActorState(
  actor: M8aV4ActorRuntimeRecord
): M8aV4ActorRuntimeRecord {
  return {
    ...actor,
    sourcePositionEcefMeters: {
      ...actor.sourcePositionEcefMeters
    },
    renderPositionEcefMeters: {
      ...actor.renderPositionEcefMeters
    },
    artifactRenderPosition: {
      ...actor.artifactRenderPosition
    }
  };
}

function cloneState(
  state: M8aV4GroundStationSceneState
): M8aV4GroundStationSceneState {
  return {
    ...state,
    directRoute: {
      ...state.directRoute
    },
    endpoints: state.endpoints.map((endpoint) => ({
      ...endpoint,
      orbitEvidenceChips: [...endpoint.orbitEvidenceChips]
    })),
    orbitActorCounts: {
      ...state.orbitActorCounts
    },
    actors: state.actors.map(cloneActorState),
    actorLabelDensity: {
      ...state.actorLabelDensity,
      visibleActorLabelIds: [...state.actorLabelDensity.visibleActorLabelIds],
      alwaysVisibleActorLabelIds: [
        ...state.actorLabelDensity.alwaysVisibleActorLabelIds
      ]
    },
    serviceState: {
      ...state.serviceState,
      window: {
        ...state.serviceState.window,
        visibleCandidateOrbitClasses: [
          ...state.serviceState.window.visibleCandidateOrbitClasses
        ],
        reasonSignals: [...state.serviceState.window.reasonSignals],
        boundedMetricsUsed: [...state.serviceState.window.boundedMetricsUsed]
      },
      timelineWindowIds: [...state.serviceState.timelineWindowIds]
    },
    simulationHandoverModel: {
      ...state.simulationHandoverModel,
      window: {
        ...state.simulationHandoverModel.window,
        candidateContextOrbitClasses: [
          ...state.simulationHandoverModel.window.candidateContextOrbitClasses
        ],
        candidateContextActorIds: [
          ...state.simulationHandoverModel.window.candidateContextActorIds
        ],
        fallbackContextOrbitClasses: [
          ...state.simulationHandoverModel.window.fallbackContextOrbitClasses
        ],
        fallbackContextActorIds: [
          ...state.simulationHandoverModel.window.fallbackContextActorIds
        ],
        reasonSignalClasses: [
          ...state.simulationHandoverModel.window.reasonSignalClasses
        ],
        boundedMetricClasses: {
          ...state.simulationHandoverModel.window.boundedMetricClasses
        },
        nonClaims: {
          ...state.simulationHandoverModel.window.nonClaims
        }
      },
      timeline: state.simulationHandoverModel.timeline.map(
        (windowDefinition) => ({
          ...windowDefinition,
          candidateContextOrbitClasses: [
            ...windowDefinition.candidateContextOrbitClasses
          ],
          candidateContextActorIds: [
            ...windowDefinition.candidateContextActorIds
          ],
          fallbackContextOrbitClasses: [
            ...windowDefinition.fallbackContextOrbitClasses
          ],
          fallbackContextActorIds: [
            ...windowDefinition.fallbackContextActorIds
          ],
          reasonSignalClasses: [...windowDefinition.reasonSignalClasses],
          boundedMetricClasses: {
            ...windowDefinition.boundedMetricClasses
          },
          nonClaims: {
            ...windowDefinition.nonClaims
          }
        })
      ),
      timelineWindowIds: [...state.simulationHandoverModel.timelineWindowIds],
      validationExpectations: {
        ...state.simulationHandoverModel.validationExpectations,
        expectedActorCounts: {
          ...state.simulationHandoverModel.validationExpectations
            .expectedActorCounts
        },
        expectedWindowIds: [
          ...state.simulationHandoverModel.validationExpectations
            .expectedWindowIds
        ],
        requiredWindowNonClaimKeys: [
          ...state.simulationHandoverModel.validationExpectations
            .requiredWindowNonClaimKeys
        ]
      },
      forbiddenClaimScan: {
        ...state.simulationHandoverModel.forbiddenClaimScan,
        negatedFieldNames: [
          ...state.simulationHandoverModel.forbiddenClaimScan.negatedFieldNames
        ],
        forbiddenModelKeys: [
          ...state.simulationHandoverModel.forbiddenClaimScan.forbiddenModelKeys
        ]
      }
    },
    replayWindow: {
      ...state.replayWindow
    },
    productUx: {
      ...state.productUx,
      playbackPolicy: {
        ...state.productUx.playbackPolicy,
        productMultipliers: [...state.productUx.playbackPolicy.productMultipliers],
        finalHoldRangeMs: {
          ...state.productUx.playbackPolicy.finalHoldRangeMs
        }
      },
      playback: {
        ...state.productUx.playback
      },
      informationHierarchy: [
        ...state.productUx.informationHierarchy
      ] as M8aV4GroundStationSceneState["productUx"]["informationHierarchy"],
      stateLabels: {
        ...state.productUx.stateLabels
      },
      truthBadges: [...state.productUx.truthBadges] as typeof M8A_V47_TRUTH_BADGES,
      disclosure: {
        ...state.productUx.disclosure,
        lines: [
          ...state.productUx.disclosure.lines
        ] as typeof M8A_V47_DISCLOSURE_LINES
      },
      layout: {
        ...state.productUx.layout
      }
    },
    relationCues: {
      ...state.relationCues
    },
    nonClaims: {
      ...state.nonClaims
    },
    sourceLineage: {
      ...state.sourceLineage
    },
    modelAsset: {
      ...state.modelAsset
    }
  };
}

function notifyListeners(
  listeners: ReadonlySet<(state: M8aV4GroundStationSceneState) => void>,
  state: M8aV4GroundStationSceneState
): void {
  for (const listener of listeners) {
    listener(cloneState(state));
  }
}

function syncTelemetry(state: M8aV4GroundStationSceneState): void {
  syncDocumentTelemetry({
    m8aV4GroundStationRuntimeState: state.runtimeState,
    m8aV4GroundStationScenarioId: state.scenarioId,
    m8aV4GroundStationProjectionId: state.projectionId,
    m8aV4GroundStationGeneratedFromArtifactId: state.generatedFromArtifactId,
    m8aV4GroundStationDataSourceName: state.dataSourceName,
    m8aV4GroundStationDataSourceAttached: state.dataSourceAttached
      ? "true"
      : "false",
    m8aV4GroundStationEndpointCount: String(state.endpointCount),
    m8aV4GroundStationEndpointIds: serializeList(
      state.endpoints.map((endpoint) => endpoint.endpointId)
    ),
    m8aV4GroundStationEndpointPrecision:
      M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
    m8aV4GroundStationActorCount: String(state.actorCount),
    m8aV4GroundStationLeoActorCount: String(state.orbitActorCounts.leo),
    m8aV4GroundStationMeoActorCount: String(state.orbitActorCounts.meo),
    m8aV4GroundStationGeoActorCount: String(state.orbitActorCounts.geo),
    m8aV4GroundStationActorIds: serializeList(
      state.actors.map((actor) => actor.actorId)
    ),
    m8aV46eVisualLanguage: "true",
    m8aV46eActiveStateLabel: resolveTimelineLabel(
      state.simulationHandoverModel.window.windowId
    ),
    m8aV46eVisibleContextRibbonCount: String(
      state.relationCues.visibleContextRibbonCount
    ),
    m8aV46eFallbackGuardCueMode: state.relationCues.fallbackGuardCueMode,
    m8aV46eVisibleActorLabelCount: String(
      state.actorLabelDensity.visibleActorLabelCount
    ),
    m8aV46eVisibleActorLabelIds: serializeList(
      state.actorLabelDensity.visibleActorLabelIds
    ),
    m8aV4GroundStationAlwaysVisibleActorLabelCount: String(
      state.actorLabelDensity.alwaysVisibleActorLabelCount
    ),
    m8aV4GroundStationAlwaysVisibleActorLabelIds: serializeList(
      state.actorLabelDensity.alwaysVisibleActorLabelIds
    ),
    m8aV4GroundStationHiddenContextActorLabelCount: String(
      state.actorLabelDensity.hiddenContextActorLabelCount
    ),
    m8aV4GroundStationReplayDurationMs: String(state.replayWindow.durationMs),
    m8aV4GroundStationReplayMultiplier: String(
      state.replayWindow.playbackMultiplier
    ),
    m8aV4GroundStationLongestOneWebLeoActorId:
      state.replayWindow.longestCurrentOneWebLeoActorId,
    m8aV4GroundStationLongestOneWebLeoPeriodMs: String(
      state.replayWindow.longestCurrentOneWebLeoPeriodMs
    ),
    m8aV4GroundStationReplayMarginMs: String(
      state.replayWindow.replayMarginMs
    ),
    m8aV4GroundStationServiceStateWindowId:
      state.serviceState.window.windowId,
    m8aV4GroundStationServiceStateSource:
      state.sourceLineage.serviceStateRead,
    m8aV4GroundStationCurrentPrimaryOrbit:
      state.serviceState.window.currentPrimaryOrbitClass,
    m8aV4GroundStationNextCandidateOrbit:
      state.serviceState.window.nextCandidateOrbitClass,
    m8aV4GroundStationContinuityFallbackOrbit:
      state.serviceState.window.continuityFallbackOrbitClass,
    m8aV4GroundStationBoundedMetricsUsed: serializeList(
      state.serviceState.window.boundedMetricsUsed
    ),
    m8aV46dSimulationHandoverModelId:
      state.simulationHandoverModel.modelId,
    m8aV46dSimulationHandoverSource:
      state.simulationHandoverModel.sourceRead,
    m8aV46dSimulationHandoverWindowId:
      state.simulationHandoverModel.window.windowId,
    m8aV46dSimulationHandoverReplayRatio: String(
      state.simulationHandoverModel.replayRatio
    ),
    m8aV46dDisplayRepresentativeActorId:
      state.simulationHandoverModel.window.displayRepresentativeActorId,
    m8aV46dCandidateContextActorIds: serializeList(
      state.simulationHandoverModel.window.candidateContextActorIds
    ),
    m8aV46dFallbackContextActorIds: serializeList(
      state.simulationHandoverModel.window.fallbackContextActorIds
    ),
    m8aV46dBoundedMetricClasses: serializeJson(
      state.simulationHandoverModel.window.boundedMetricClasses
    ),
    m8aV46dWindowNonClaims: serializeJson(
      state.simulationHandoverModel.window.nonClaims
    ),
    m8aV47ProductUx: state.productUx.version,
    m8aV47PlaybackDefaultMultiplier: String(
      state.productUx.playbackPolicy.defaultMultiplier
    ),
    m8aV47PlaybackProductMultipliers: serializeList(
      state.productUx.playbackPolicy.productMultipliers.map(String)
    ),
    m8aV47PlaybackDebugMultiplier: String(
      state.productUx.playbackPolicy.debugTestMultiplier
    ),
    m8aV47PlaybackMultiplier: String(state.productUx.playback.multiplier),
    m8aV47PlaybackStatus: state.productUx.playback.status,
    m8aV47FinalHoldActive: String(
      state.productUx.playback.finalHoldActive
    ),
    m8aV47ReplayProgressRatio: String(
      state.productUx.playback.replayRatio
    ),
    m8aV47SimulatedReplayTime:
      state.productUx.playback.simulatedReplayTimeDisplay,
    m8aV47ActiveProductLabel: state.productUx.activeProductLabel,
    m8aV47ActiveWindowId: state.productUx.activeWindowId,
    m8aV47TruthBadges: serializeList([...state.productUx.truthBadges]),
    m8aV47LayoutPolicy: `${state.productUx.layout.desktopPolicy}|${state.productUx.layout.narrowPolicy}`,
    m8aV4GroundStationRawItriSideReadOwnership:
      state.sourceLineage.rawPackageSideReadOwnership,
    m8aV4GroundStationRuntimeConsumptionRule:
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.runtimeConsumptionRule,
    m8aV4GroundStationProofSeam: state.proofSeam,
    m8aV4GroundStationNonClaims: serializeJson(state.nonClaims)
  });
}

function buildEndpointState(): M8aV4GroundStationSceneState["endpoints"] {
  return M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.map((endpoint) => ({
    endpointId: endpoint.endpointId,
    label: endpoint.renderMarker.label,
    markerId: endpoint.renderMarker.markerId,
    precisionBadge: endpoint.renderMarker.requiredPrecisionBadge,
    renderPrecision: endpoint.coordinatePrecision.renderPrecision,
    displayPositionIsSourceTruth: endpoint.renderMarker.displayPositionIsSourceTruth,
    rawSourceCoordinatesRenderable: endpoint.sourceCoordinatesRenderable,
    orbitEvidenceChips: endpoint.orbitEvidenceChips.map((chip) => chip.chipLabel)
  }));
}

function buildReplayWindowState(
  replayState: ReplayClockState
): M8aV4GroundStationSceneState["replayWindow"] {
  const startMs = toEpochMilliseconds(replayState.startTime);
  const stopMs = toEpochMilliseconds(replayState.stopTime);

  return {
    startTimeUtc: toIsoTimestamp(startMs),
    stopTimeUtc: toIsoTimestamp(stopMs),
    durationMs: stopMs - startMs,
    playbackMultiplier: replayState.multiplier,
    longestCurrentOneWebLeoActorId:
      M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.longestOneWebLeoActorId,
    longestCurrentOneWebLeoSourceRecordName:
      M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.longestOneWebLeoSourceRecordName,
    longestCurrentOneWebLeoMeanMotionRevPerDay:
      M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.longestOneWebLeoMeanMotionRevPerDay,
    longestCurrentOneWebLeoPeriodMs:
      M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.longestOneWebLeoPeriodMs,
    replayMarginMs: M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.replayMarginMs,
    periodSource: M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.periodSource
  };
}

function buildSimulationHandoverState(
  replayState: ReplayClockState
): M8aV4GroundStationSceneState["simulationHandoverModel"] {
  const model = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel;

  return {
    modelId: model.modelId,
    modelStatus: model.modelStatus,
    modelScope: model.modelScope,
    modelTruth: model.modelTruth,
    endpointPairId: model.endpointPairId,
    acceptedPairPrecision: model.acceptedPairPrecision,
    route: model.route,
    sourceRead:
      "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline",
    replayRatio: resolveReplayWindowRatio(replayState),
    window: resolveSimulationHandoverWindow(replayState),
    timeline: model.timeline,
    timelineWindowIds: model.timeline.map((windowDefinition) => {
      return windowDefinition.windowId;
    }),
    validationExpectations: model.validationExpectations,
    forbiddenClaimScan: model.forbiddenClaimScan
  };
}

function buildProductUxState({
  replayState,
  simulationHandoverModel,
  viewportClass,
  finalHoldActive,
  finalHoldStartedAtEpochMs,
  finalHoldCompletedAtEpochMs,
  finalHoldLoopCount,
  truthDisclosureOpen
}: {
  replayState: ReplayClockState;
  simulationHandoverModel: M8aV4GroundStationSceneState["simulationHandoverModel"];
  viewportClass: "desktop" | "narrow";
  finalHoldActive: boolean;
  finalHoldStartedAtEpochMs: number | null;
  finalHoldCompletedAtEpochMs: number | null;
  finalHoldLoopCount: number;
  truthDisclosureOpen: boolean;
}): M8aV4GroundStationSceneState["productUx"] {
  const replayRatio = resolveReplayWindowRatio(replayState);
  const multiplier = coercePlaybackMultiplier(replayState.multiplier);
  const reviewTime = buildSimulatedReplayTimeDisplay(
    replayRatio,
    toEpochMilliseconds(replayState.stopTime) -
      toEpochMilliseconds(replayState.startTime),
    multiplier
  );
  const activeWindowId = simulationHandoverModel.window.windowId;
  const activeProductLabel = resolveTimelineLabel(activeWindowId);
  const disclosureState: M8aV47DisclosureState = truthDisclosureOpen
    ? "open"
    : "closed";

  return {
    version: M8A_V47_PRODUCT_UX_VERSION,
    playbackPolicy: {
      defaultMultiplier: M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
      guidedReviewMultiplier: M8A_V47_GUIDED_REVIEW_MULTIPLIER,
      quickScanMultiplier: M8A_V47_QUICK_SCAN_MULTIPLIER,
      debugTestMultiplier: M8A_V47_DEBUG_TEST_MULTIPLIER,
      productMultipliers: [...M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS],
      normalControlsExposeDebugMultiplier: false,
      finalHoldDurationMs: M8A_V47_FINAL_HOLD_DURATION_MS,
      finalHoldRangeMs: {
        min: M8A_V47_FINAL_HOLD_MIN_MS,
        max: M8A_V47_FINAL_HOLD_MAX_MS
      },
      loopPolicy: "hold-final-state-then-restart"
    },
    playback: {
      multiplier,
      mode: resolvePlaybackMode(multiplier),
      status: resolvePlaybackStatus(replayState, finalHoldActive),
      replayRatio,
      finalHoldActive,
      finalHoldStartedAtEpochMs,
      finalHoldCompletedAtEpochMs,
      finalHoldLoopCount,
      reviewElapsedDisplay: reviewTime.reviewElapsedDisplay,
      reviewDurationDisplay: reviewTime.reviewDurationDisplay,
      simulatedReplayTimeDisplay: reviewTime.simulatedReplayTimeDisplay,
      replayUtcDisplay: `Replay UTC ${toIsoTimestamp(replayState.currentTime)}`
    },
    informationHierarchy: [
      "scene",
      "current-simulation-state",
      "playback-and-time",
      "truth-boundary-badges",
      "optional-detail"
    ],
    stateLabels: {
      ...M8A_V46E_TIMELINE_LABELS
    },
    activeWindowId,
    activeProductLabel,
    truthBadges: M8A_V47_TRUTH_BADGES,
    disclosure: {
      state: disclosureState,
      lines: M8A_V47_DISCLOSURE_LINES
    },
    layout: {
      viewportClass,
      desktopPolicy: "right-review-rail",
      narrowPolicy: "minimal-strip-with-inspection-sheet",
      detailSheetState: disclosureState,
      protectedZonePolicy:
        "endpoint-corridor-geo-guard-and-required-labels-non-obstruction"
    }
  };
}

function resolveActorById(
  actors: ReadonlyArray<M8aV4OrbitActorProjection>,
  actorId: M8aV46dActorId
): M8aV4OrbitActorProjection {
  const actor = actors.find((candidate) => candidate.actorId === actorId);

  if (!actor) {
    throw new Error(`Missing V4.6D display-context actor ${actorId}.`);
  }

  return actor;
}

export function createM8aV4GroundStationSceneController({
  viewer,
  hudFrame,
  replayClock
}: M8aV4GroundStationSceneControllerOptions): M8aV4GroundStationSceneController {
  const modelUri = resolveModelUri();
  const dataSource = new CustomDataSource(M8A_V4_GROUND_STATION_DATA_SOURCE_NAME);
  const hudRoot = createHudRoot();
  const productUxRoot = createProductUxRoot();
  const listeners = new Set<(state: M8aV4GroundStationSceneState) => void>();
  const actorSatrecs = new Map(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) => {
      const lineage = actor.sourceLineage[0];

      if (!lineage) {
        throw new Error(`Missing V4 source lineage for ${actor.actorId}.`);
      }

      return [
        actor.actorId,
        twoline2satrec(lineage.tleLine1, lineage.tleLine2)
      ];
    })
  );
  let disposed = false;
  let dataSourceAttached = false;
  let truthDisclosureOpen = false;
  let finalHoldActive = false;
  let finalHoldStartedAtEpochMs: number | null = null;
  let finalHoldCompletedAtEpochMs: number | null = null;
  let finalHoldLoopCount = 0;
  let finalHoldTimeoutId: number | undefined;
  let resumeAfterFinalHold = true;
  let productLoopArmed = true;
  let latestSimulationWindow = resolveSimulationHandoverWindow(
    replayClock.getState()
  );

  configureReplayClock(viewer, replayClock);
  applyV4Camera(viewer);
  hudFrame.dataset.hudVisibility = "m8a-v4";
  hudFrame.setAttribute("aria-hidden", "false");
  hudFrame.appendChild(hudRoot);
  hudFrame.appendChild(productUxRoot);

  const endpointsById = new Map(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.map((endpoint) => [
      endpoint.endpointId,
      endpoint
    ])
  );
  const endpointA = endpointsById.get("tw-cht-multi-orbit-ground-infrastructure");
  const endpointB = endpointsById.get("sg-speedcast-singapore-teleport");

  if (!endpointA || !endpointB) {
    throw new Error("V4 ground-station scene requires both accepted endpoints.");
  }

  for (const endpoint of M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints) {
    dataSource.entities.add({
      id: `m8a-v4-endpoint-${endpoint.endpointId}`,
      name: endpoint.renderMarker.label,
      position: positionToCartesian(endpoint.renderMarker.displayPosition),
      point: createEndpointPointStyle(endpoint),
      ellipse: createEndpointEllipseStyle(endpoint),
      label: createEndpointLabelStyle(endpoint),
      description: new ConstantProperty(
        `${endpoint.endpointLabel}; ${M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE}; bounded display anchor, not exact site truth.`
      )
    });
  }

  dataSource.entities.add({
    id: "m8a-v4-operator-family-endpoint-context-ribbon",
    name: "Operator-family endpoint context ribbon",
    polyline: new PolylineGraphics({
      positions: new ConstantProperty([
        positionToCartesian(endpointA.renderMarker.displayPosition),
        positionToCartesian(endpointB.renderMarker.displayPosition)
      ]),
      width: new ConstantProperty(1.4),
      material: new PolylineDashMaterialProperty({
        color: new ConstantProperty(
          Color.fromCssColorString("#f4fbff").withAlpha(0.42)
        ),
        gapColor: new ConstantProperty(
          Color.fromCssColorString("#06121a").withAlpha(0.06)
        ),
        dashLength: 20
      }),
      arcType: ArcType.GEODESIC,
      clampToGround: false
    }),
    description: new ConstantProperty(
      "Endpoint pair context ribbon; operator-family precision; display context only."
    )
  });

  const resolveSourceOrbitPosition = (
    actor: M8aV4OrbitActorProjection,
    time?: JulianDate,
    result?: Cartesian3
  ): PropagatedActorPosition => {
    const satrec = actorSatrecs.get(actor.actorId);

    if (!satrec) {
      throw new Error(`Missing V4 satrec for ${actor.actorId}.`);
    }

    const propagationDate = time
      ? JulianDate.toDate(time)
      : new Date(toEpochMilliseconds(replayClock.getState().currentTime));
    const propagated = propagate(satrec, propagationDate);
    const target = result ?? new Cartesian3();

    if (!propagated?.position) {
      return {
        cartesian: positionToCartesian(actor.sourcePosition),
        propagationTimeUtc: propagationDate.toISOString()
      };
    }

    const positionEcfKilometers = eciToEcf(
      propagated.position,
      gstime(propagationDate)
    );
    target.x = positionEcfKilometers.x * 1000;
    target.y = positionEcfKilometers.y * 1000;
    target.z = positionEcfKilometers.z * 1000;

    return {
      cartesian: target,
      propagationTimeUtc: propagationDate.toISOString()
    };
  };

  const resolveActorRenderPosition = (
    actor: M8aV4OrbitActorProjection,
    time?: JulianDate,
    result?: Cartesian3
  ): PropagatedActorPosition => {
    const replayState = replayClock.getState();
    const timeRatio = time
      ? resolveReplayWindowRatio({
          ...replayState,
          currentTime: JulianDate.toDate(time).toISOString()
        })
      : resolveReplayWindowRatio(replayState);
    const track = actor.runtimeDisplayTrack;

    if (track.trackKind === "east-asia-near-fixed-geo-anchor") {
      // Source GEO altitude stays in sourcePosition; render height is compressed
      // so one continuity anchor does not dominate the viewport framing.
      return {
        cartesian: Cartesian3.fromDegrees(
          track.start.lon,
          track.start.lat,
          M8A_V4_DISPLAY_ORBIT_HEIGHT_METERS.geo.start,
          undefined,
          result ?? new Cartesian3()
        ),
        propagationTimeUtc: toIsoTimestamp(replayState.currentTime)
      };
    }

    const loopRatio = normalizeUnit(
      timeRatio * track.cycleRate + track.phaseOffset
    );
    const easedRatio = 0.5 - Math.cos(loopRatio * Math.PI * 2) * 0.5;
    const heightMeters = resolveActorDisplayHeightMeters(
      actor.orbitClass,
      easedRatio,
      loopRatio
    );

    return {
      cartesian: Cartesian3.fromDegrees(
        lerp(track.start.lon, track.stop.lon, easedRatio) +
          (actor.orbitClass === "meo"
            ? M8A_V4_MEO_DISPLAY_LANE_LONGITUDE_BIAS_DEGREES
            : 0),
        lerp(track.start.lat, track.stop.lat, easedRatio) +
          (actor.orbitClass === "meo"
            ? M8A_V4_MEO_DISPLAY_LANE_LATITUDE_BIAS_DEGREES
            : 0),
        heightMeters,
        undefined,
        result ?? new Cartesian3()
      ),
      propagationTimeUtc: toIsoTimestamp(replayState.currentTime)
    };
  };

  const createActorPositionProperty = (
    actor: M8aV4OrbitActorProjection
  ): CallbackPositionProperty => {
    return new CallbackPositionProperty((time, result) => {
      return resolveActorRenderPosition(actor, time, result).cartesian;
    }, false);
  };

  const initialEmphasisByActorId = new Map(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) => {
      const emphasis = resolveActorEmphasis(actor, latestSimulationWindow);
      return [actor.actorId, emphasis];
    })
  );
  const actorHandles =
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map(
      (actor): ActorRenderHandle => {
        const emphasis = initialEmphasisByActorId.get(actor.actorId);

        if (!emphasis) {
          throw new Error(`Missing V4 actor emphasis for ${actor.actorId}.`);
        }

        const entity = dataSource.entities.add({
          id: actor.actorId,
          name: actor.label,
          position: createActorPositionProperty(actor),
          billboard: shouldRenderActorGlow(actor)
            ? createActorGlowStyle(actor)
            : undefined,
          model: createActorModelGraphics(modelUri, actor, emphasis),
          label: shouldRenderActorLabel(actor, latestSimulationWindow)
            ? createActorLabelStyle(actor, emphasis)
            : undefined,
          description: new ConstantProperty(
            `${actor.label}: ${actor.evidenceClass}; not active satellite; not native RF handover.`
          )
        });

        return {
          actor,
          entity
        };
      }
    );

  const resolveRelationActorId = (
    role: M8aV4RelationRole,
    replayState: ReplayClockState
  ): M8aV46dActorId => {
    const simulationWindow = resolveSimulationHandoverWindow(replayState);

    if (role === "displayRepresentative") {
      return simulationWindow.displayRepresentativeActorId;
    }

    if (role === "candidateContext") {
      return simulationWindow.candidateContextActorIds[0];
    }

    return simulationWindow.fallbackContextActorIds[0];
  };

  const createRelationPositions = (
    role: M8aV4RelationRole
  ): CallbackProperty => {
    return new CallbackProperty((time) => {
      const replayState = replayClock.getState();
      const actor = resolveActorById(
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors,
        resolveRelationActorId(role, replayState)
      );

      return [
        positionToCartesian(endpointA.renderMarker.displayPosition),
        resolveActorRenderPosition(actor, time).cartesian,
        positionToCartesian(endpointB.renderMarker.displayPosition)
      ];
    }, false);
  };
  const createGeoGuardCuePosition = (): CallbackPositionProperty => {
    return new CallbackPositionProperty((time, result) => {
      const actor = resolveActorById(
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors,
        resolveRelationActorId("fallbackContext", replayClock.getState())
      );

      return resolveActorRenderPosition(actor, time, result).cartesian;
    }, false);
  };
  const relationHandles: ReadonlyArray<RelationRenderHandle> = [
    "displayRepresentative",
    "candidateContext"
  ].map((role) => {
    const relationRole = role as M8aV4RelationRole;
    const entity = dataSource.entities.add({
      id: `m8a-v46e-simulation-${relationRole}-context-ribbon`,
      name: `V4.6E ${M8A_V46E_RELATION_ROLE_LABELS[relationRole]}`,
      polyline: createRelationStyle(
        createRelationPositions(relationRole),
        relationRole
      ),
      description: new ConstantProperty(
        "V4.6E simulation display context from the repo-owned projection module."
      )
    });

    return {
      role: relationRole,
      entity
    };
  });
  const geoGuardCueEntity = dataSource.entities.add({
    id: "m8a-v46e-simulation-geo-guard-cue",
    name: "V4.6E GEO guard cue",
    position: createGeoGuardCuePosition(),
    billboard: createGeoGuardCueStyle(),
    description: new ConstantProperty(
      "Low-opacity GEO guard cue; simulation display context only."
    )
  });

  const clearFinalHoldTimer = (): void => {
    if (typeof finalHoldTimeoutId === "number") {
      window.clearTimeout(finalHoldTimeoutId);
      finalHoldTimeoutId = undefined;
    }
  };

  const finishFinalHold = (): void => {
    if (disposed || !finalHoldActive) {
      return;
    }

    const shouldResume = resumeAfterFinalHold;
    finalHoldActive = false;
    finalHoldCompletedAtEpochMs = Date.now();
    finalHoldStartedAtEpochMs = null;
    finalHoldLoopCount += 1;
    finalHoldTimeoutId = undefined;
    replayClock.seek(replayClock.getState().startTime);

    if (shouldResume) {
      productLoopArmed = true;
      replayClock.play();
    } else {
      productLoopArmed = false;
      replayClock.pause();
    }

    syncState();
  };

  const startFinalHold = (): void => {
    if (disposed || finalHoldActive) {
      return;
    }

    finalHoldActive = true;
    finalHoldStartedAtEpochMs = Date.now();
    finalHoldCompletedAtEpochMs = null;
    resumeAfterFinalHold = true;
    productLoopArmed = true;
    replayClock.seek(replayClock.getState().stopTime);
    replayClock.pause();
    syncState();
    clearFinalHoldTimer();
    finalHoldTimeoutId = window.setTimeout(
      finishFinalHold,
      M8A_V47_FINAL_HOLD_DURATION_MS
    );
  };

  const cancelFinalHold = (): void => {
    if (!finalHoldActive) {
      clearFinalHoldTimer();
      return;
    }

    finalHoldActive = false;
    finalHoldStartedAtEpochMs = null;
    resumeAfterFinalHold = false;
    productLoopArmed = false;
    clearFinalHoldTimer();
  };

  const setProductPlaybackMultiplier = (
    multiplier: M8aV47ProductPlaybackMultiplier
  ): void => {
    if (!M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS.includes(multiplier)) {
      throw new Error(`Unsupported V4.7 product playback multiplier: ${multiplier}`);
    }

    replayClock.setMultiplier(multiplier);
    syncState();
  };

  const setDebugTestPlaybackMultiplier = (
    multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
  ): void => {
    if (multiplier !== M8A_V47_DEBUG_TEST_MULTIPLIER) {
      throw new Error(`Unsupported V4.7 debug playback multiplier: ${multiplier}`);
    }

    replayClock.setMultiplier(multiplier);
    syncState();
  };

  const playProductReplay = (): void => {
    if (finalHoldActive) {
      resumeAfterFinalHold = true;
      productLoopArmed = true;
      syncState();
      return;
    }

    if (resolveReplayWindowRatio(replayClock.getState()) >= 1) {
      replayClock.seek(replayClock.getState().startTime);
    }

    productLoopArmed = true;
    replayClock.play();
    syncState();
  };

  const pauseProductReplay = (): void => {
    cancelFinalHold();
    productLoopArmed = false;
    replayClock.pause();
    syncState();
  };

  const restartProductReplay = (): void => {
    const replayState = replayClock.getState();
    const shouldPlayAfterRestart = finalHoldActive || replayState.isPlaying;
    cancelFinalHold();
    replayClock.seek(replayState.startTime);

    if (shouldPlayAfterRestart) {
      productLoopArmed = true;
      replayClock.play();
    } else {
      productLoopArmed = false;
      replayClock.pause();
    }

    syncState();
  };

  const toggleTruthDisclosure = (): void => {
    truthDisclosureOpen = !truthDisclosureOpen;
    syncState();
  };

  const closeTruthDisclosure = (): void => {
    truthDisclosureOpen = false;
    syncState();
  };

  const createState = (): M8aV4GroundStationSceneState => {
    const replayState = replayClock.getState();
    const serviceWindow = resolveServiceStateWindow(replayState);
    const simulationHandoverModel = buildSimulationHandoverState(replayState);
    const simulationWindow = simulationHandoverModel.window;
    const viewportClass = resolveViewportClass();
    const productUx = buildProductUxState({
      replayState,
      simulationHandoverModel,
      viewportClass,
      finalHoldActive,
      finalHoldStartedAtEpochMs,
      finalHoldCompletedAtEpochMs,
      finalHoldLoopCount,
      truthDisclosureOpen
    });
    const actorEmphasis =
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) =>
        resolveActorEmphasis(actor, simulationWindow)
      );
    const actorEmphasisById = new Map(
      actorEmphasis.map((emphasis) => [emphasis.actorId, emphasis])
    );
    const actors = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map(
      (actor): M8aV4ActorRuntimeRecord => {
        const sourcePropagated = resolveSourceOrbitPosition(actor);
        const renderPropagated = resolveActorRenderPosition(actor);
        const emphasis = actorEmphasisById.get(actor.actorId);

        if (!emphasis) {
          throw new Error(`Missing V4 emphasis for ${actor.actorId}.`);
        }

        return {
          actorId: actor.actorId,
          label: actor.label,
          orbitClass: actor.orbitClass,
          displayRole: actor.displayRole,
          operatorContext: actor.operatorContext,
          sourceEpochUtc: actor.sourceEpochUtc,
          projectionEpochUtc: actor.projectionEpochUtc,
          motionMode: actor.motionMode,
          evidenceClass: actor.evidenceClass,
          modelAssetId: actor.modelAssetId,
          modelTruth: actor.modelTruth,
          sourcePositionEcefMeters: positionToPlainMeters(
            sourcePropagated.cartesian
          ),
          renderPositionEcefMeters: positionToPlainMeters(
            renderPropagated.cartesian
          ),
          artifactRenderPosition: actor.artifactRenderPosition,
          renderTrackBasis: actor.runtimeDisplayTrack.renderTrackBasis,
          renderTrackIsSourceTruth:
            actor.runtimeDisplayTrack.renderTrackIsSourceTruth,
          propagationTimeUtc: sourcePropagated.propagationTimeUtc,
          emphasis: emphasis.emphasis,
          labelVisibility: shouldRenderActorLabel(actor, simulationWindow)
            ? "always-visible"
            : "hidden-context"
        };
      }
    );
    const orbitActorCounts = {
      leo: actors.filter((actor) => actor.orbitClass === "leo").length,
      meo: actors.filter((actor) => actor.orbitClass === "meo").length,
      geo: actors.filter((actor) => actor.orbitClass === "geo").length
    };
    const visibleActorLabelIds = actors
      .filter((actor) => actor.labelVisibility === "always-visible")
      .map((actor) => actor.actorId);
    const hiddenContextActorLabelCount = actors.filter(
      (actor) => actor.labelVisibility === "hidden-context"
    ).length;

    return {
      scenarioId: M8A_V4_GROUND_STATION_SCENARIO_ID,
      runtimeState: M8A_V4_GROUND_STATION_RUNTIME_STATE,
      directRoute: {
        queryParam: M8A_V4_GROUND_STATION_QUERY_PARAM,
        queryValue: M8A_V4_GROUND_STATION_QUERY_VALUE
      },
      projectionId: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.projectionId,
      generatedFromArtifactId:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.generatedFromArtifactId,
      projectionSourceAuthority:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.sourceAuthority,
      dataSourceName: M8A_V4_GROUND_STATION_DATA_SOURCE_NAME,
      dataSourceAttached,
      endpointCount: 2,
      endpoints: buildEndpointState(),
      actorCount: actors.length,
      orbitActorCounts,
      actors,
      actorLabelDensity: {
        policy: "representative-orbit-class-labels-only",
        v46ePolicy: "active-representative-label-with-endpoint-priority",
        viewportClass,
        endpointLabelsPriority: true,
        candidateLabelsVisibleByDefault: false,
        fallbackLabelPolicy: "geo-representative-or-guard-state-only",
        preferredVisibleActorLabelCount:
          M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS,
        visibleActorLabelCount: visibleActorLabelIds.length,
        visibleActorLabelIds,
        alwaysVisibleActorLabelCount: visibleActorLabelIds.length,
        alwaysVisibleActorLabelIds: visibleActorLabelIds,
        hiddenContextActorLabelCount,
        desktopMaxAlwaysVisibleActorLabels:
          M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS,
        narrowMaxAlwaysVisibleActorLabels:
          M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS
      },
      serviceState: {
        modelId:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.modelId,
        truthState:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.truthState,
        truthBoundaryLabel:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel
            .truthBoundaryLabel,
        window: serviceWindow,
        timelineWindowIds:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline.map(
            (windowDefinition) => windowDefinition.windowId
          ),
        isNativeRfHandover:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel
            .isNativeRfHandover,
        measuredLatency:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.metricPolicy
            .measuredLatency,
        measuredJitter:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.metricPolicy
            .measuredJitter,
        measuredThroughput:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.metricPolicy
            .measuredThroughput
      },
      simulationHandoverModel,
      replayWindow: buildReplayWindowState(replayState),
      productUx,
      relationCues: {
        cueKind: "v4.6e-handover-visual-language-context-ribbons",
        displayRepresentativeActorId:
          simulationWindow.displayRepresentativeActorId,
        candidateContextActorId: simulationWindow.candidateContextActorIds[0],
        fallbackContextActorId: simulationWindow.fallbackContextActorIds[0],
        visibleContextRibbonCount: 2,
        visibleContextRibbonRoles: [
          "displayRepresentative",
          "candidateContext"
        ] as const,
        fallbackGuardCueMode: resolveFallbackGuardCueMode(simulationWindow),
        fallbackFullRibbonVisible: false,
        activeSatelliteTruth: "not-claimed",
        activeGatewayTruth: "not-claimed",
        pairSpecificTeleportPathTruth: "not-claimed",
        nativeRfHandoverTruth: "not-claimed"
      },
      nonClaims:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.runtimeNarrativeNonClaims,
      proofSeam: M8A_V4_GROUND_STATION_PROOF_SEAM,
      sourceLineage: {
        projectionRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION",
        serviceStateRead:
          "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline",
        simulationHandoverRead:
          "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline",
        rawPackageSideReadOwnership: "forbidden",
        rawSourcePathsIncluded:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.rawSourcePathsIncluded
      },
      modelAsset: {
        ...M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.modelAsset,
        uri: modelUri
      }
    };
  };

  const syncState = (): M8aV4GroundStationSceneState => {
    const nextState = createState();
    latestSimulationWindow = nextState.simulationHandoverModel.window;
    const emphasisById = new Map(
      nextState.actors.map((actor) => [
        actor.actorId,
        resolveActorEmphasis(
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.find(
            (projectionActor) => projectionActor.actorId === actor.actorId
          ) ?? M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors[0],
          latestSimulationWindow
        )
      ])
    );

    for (const handle of actorHandles) {
      const emphasis = emphasisById.get(handle.actor.actorId);

      if (emphasis) {
        updateActorStyle(handle, emphasis, latestSimulationWindow);
      }
    }

    for (const handle of relationHandles) {
      updateRelationStyle(handle);
    }

    geoGuardCueEntity.show = shouldShowGeoGuardCue(latestSimulationWindow);

    renderHud(hudRoot, nextState);
    renderProductUx(productUxRoot, nextState);
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    return nextState;
  };

  const handleProductUxClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const control = event.target.closest<HTMLElement>("[data-m8a-v47-action]");

    if (!control || !productUxRoot.contains(control)) {
      return;
    }

    const action = control.dataset.m8aV47Action;

    switch (action) {
      case "play":
        playProductReplay();
        break;
      case "pause":
        pauseProductReplay();
        break;
      case "restart":
        restartProductReplay();
        break;
      case "speed": {
        const multiplier = Number(control.dataset.m8aV47PlaybackMultiplier);

        if (
          multiplier === M8A_V47_GUIDED_REVIEW_MULTIPLIER ||
          multiplier === M8A_V47_PRODUCT_DEFAULT_MULTIPLIER ||
          multiplier === M8A_V47_QUICK_SCAN_MULTIPLIER
        ) {
          setProductPlaybackMultiplier(multiplier);
        }

        break;
      }
      case "toggle-disclosure":
        toggleTruthDisclosure();
        break;
      case "close-disclosure":
        closeTruthDisclosure();
        break;
    }
  };

  productUxRoot.addEventListener("click", handleProductUxClick);

  syncState();

  void viewer.dataSources.add(dataSource).then(() => {
    if (disposed || viewer.isDestroyed()) {
      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }
      dataSourceAttached = false;
      return;
    }

    dataSourceAttached = true;
    dataSource.show = true;
    syncState();
  }).catch(() => {
    if (!disposed) {
      dataSourceAttached = false;
      syncState();
    }
  });

  const unsubscribeReplayClock = replayClock.onTick((replayState) => {
    if (
      productLoopArmed &&
      !finalHoldActive &&
      resolveReplayWindowRatio(replayState) >= 1
    ) {
      startFinalHold();
      return;
    }

    syncState();
  });

  return {
    getState(): M8aV4GroundStationSceneState {
      return cloneState(createState());
    },
    subscribe(listener: (state: M8aV4GroundStationSceneState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play(): void {
      playProductReplay();
    },
    pause(): void {
      pauseProductReplay();
    },
    restart(): void {
      restartProductReplay();
    },
    setPlaybackMultiplier(multiplier: M8aV47ProductPlaybackMultiplier): void {
      setProductPlaybackMultiplier(multiplier);
    },
    setDebugPlaybackMultiplier(
      multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
    ): void {
      setDebugTestPlaybackMultiplier(multiplier);
    },
    dispose(): void {
      disposed = true;
      clearFinalHoldTimer();
      unsubscribeReplayClock();
      listeners.clear();
      productUxRoot.removeEventListener("click", handleProductUxClick);
      hudRoot.remove();
      productUxRoot.remove();
      clearDocumentTelemetry(M8A_V4_TELEMETRY_KEYS);
      dataSourceAttached = false;
      dataSource.show = false;
      dataSource.entities.removeAll();

      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }

      if (!viewer.isDestroyed()) {
        viewer.scene.requestRender();
      }
    }
  };
}
