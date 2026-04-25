import {
  ArcType,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  Entity,
  HorizontalOrigin,
  JulianDate,
  LabelGraphics,
  LabelStyle,
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

import type { PhysicalInputState } from "../features/physical-input/physical-input";
import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type { ReplayClock, ReplayClockState } from "../features/time";
import type {
  FirstIntakePhysicalInputController
} from "./first-intake-physical-input-controller";
import {
  FIRST_INTAKE_GENERIC_SATELLITE_MODEL_PUBLIC_PATH,
  FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DISPLAY_PROJECTION_MODE,
  FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION,
  FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_ID,
  FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID,
  type FirstIntakeOrbitContextActorProjectionRecord,
  type FirstIntakeOrbitContextModelAssetProjection,
  type FirstIntakeOrbitContextNonClaims,
  type FirstIntakeOrbitContextOrbitClass
} from "./first-intake-orbit-context-actor-projection";

const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_TELEMETRY_KEYS = [
  "firstIntakeOrbitContextActorState",
  "firstIntakeOrbitContextActorScenarioId",
  "firstIntakeOrbitContextActorProjectionId",
  "firstIntakeOrbitContextActorDataSourceName",
  "firstIntakeOrbitContextActorDataSourceAttached",
  "firstIntakeOrbitContextActorCount",
  "firstIntakeOrbitContextActorIds",
  "firstIntakeOrbitContextActorLabels",
  "firstIntakeOrbitContextActorEvidenceClasses",
  "firstIntakeOrbitContextActorFreshnessClasses",
  "firstIntakeOrbitContextActorPositionPrecisions",
  "firstIntakeOrbitContextActorMotionModes",
  "firstIntakeOrbitContextActorSourceEpochs",
  "firstIntakeOrbitContextActorProjectionEpochs",
  "firstIntakeOrbitContextActorModelAssetId",
  "firstIntakeOrbitContextActorModelTruth",
  "firstIntakeOrbitContextActorPresentationState",
  "firstIntakeOrbitContextActorPresentationStateSource",
  "firstIntakeOrbitContextActorMetricCueKind",
  "firstIntakeOrbitContextActorMetricCueSummary",
  "firstIntakeOrbitContextActorRequiredNonClaims",
  "firstIntakeOrbitContextActorDisplayProjectionMode",
  "firstIntakeOrbitContextActorDisplayProjectionBoundary",
  "firstIntakeOrbitContextActorRawPackageSideReadOwnership",
  "firstIntakeOrbitContextActorProofSeam"
] as const;

export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DATA_SOURCE_NAME =
  "first-intake-source-lineaged-orbit-context-actors";
export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_RUNTIME_STATE =
  "active-addressed-route-source-lineaged-orbit-context-actors";
export const FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeOrbitContextActors";

const RELATION_CUE_ENTITY_ID =
  "first-intake-orbit-context-service-layer-relation-cue";
const ORBIT_CONTEXT_STAGE_STRIP_SURFACE =
  "m8a-v3.5-compact-orbit-context-stage-strip";
const PRESENTATION_STATE_SOURCE =
  "repo-owned-bounded-presentation-model";
const RAW_PACKAGE_SIDE_READ_OWNERSHIP = "forbidden";
const DISPLAY_PROJECTION_MODE =
  FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DISPLAY_PROJECTION_MODE;
const SOURCE_POSITION_BOUNDARY =
  "sourceOrbitPositionEcefMeters = TLE-derived source position";
const RENDER_POSITION_BOUNDARY =
  "renderPositionEcefMeters = close-view display projection";
const RENDER_POSITION_HISTORICAL_TRUTH = "not-claimed";
const DISPLAY_CONTEXT_CHIP_TEXT = "display-context";
const NOT_ACTIVE_SERVICE_TEXT = "not active serving satellite";
const REPLAY_START_FALLBACK_UTC = "2026-04-21T01:28:07.420000Z";
const LEO_DISPLAY_TRACK_START = {
  lat: 50.6,
  lon: -122,
  heightMeters: 100_000
} as const;
const LEO_DISPLAY_TRACK_STOP = {
  lat: 49.4,
  lon: -120.2,
  heightMeters: 100_000
} as const;
const GEO_DISPLAY_ANCHOR = {
  lat: 49.4,
  lon: -122.6,
  heightMeters: 100_000
} as const;

const PRESENTATION_WINDOWS = [
  {
    stateKey: "geo-context",
    stateLabel: "geo-context",
    startRatio: 0,
    stopRatio: 0.25,
    primaryOrbitClass: "geo",
    secondaryOrbitClass: "leo",
    activeEndpointFocus: "provider-managed-geo-anchor-context",
    dominantSwitchReason: "continuity-context"
  },
  {
    stateKey: "dual-orbit",
    stateLabel: "dual-orbit",
    startRatio: 0.25,
    stopRatio: 0.5,
    primaryOrbitClass: "geo",
    secondaryOrbitClass: "leo",
    activeEndpointFocus: "mobile-aircraft-endpoint",
    dominantSwitchReason: "service-layer-overlap"
  },
  {
    stateKey: "switch-window",
    stateLabel: "switch-window",
    startRatio: 0.5,
    stopRatio: 0.72,
    primaryOrbitClass: "leo",
    secondaryOrbitClass: "geo",
    activeEndpointFocus: "mobile-aircraft-endpoint",
    dominantSwitchReason: "bounded-proxy-latency-and-speed-class"
  },
  {
    stateKey: "leo-context",
    stateLabel: "leo-context",
    startRatio: 0.72,
    stopRatio: 1,
    primaryOrbitClass: "leo",
    secondaryOrbitClass: "geo",
    activeEndpointFocus: "mobile-aircraft-endpoint",
    dominantSwitchReason: "leo-context-primary"
  }
] as const;

export type FirstIntakeOrbitContextPresentationStateKey =
  (typeof PRESENTATION_WINDOWS)[number]["stateKey"];

type ActiveEndpointFocus =
  (typeof PRESENTATION_WINDOWS)[number]["activeEndpointFocus"];
type DominantSwitchReason =
  (typeof PRESENTATION_WINDOWS)[number]["dominantSwitchReason"];

type PresentationWindowDefinition = (typeof PRESENTATION_WINDOWS)[number];

interface PropagatedActorPosition {
  cartesian: Cartesian3;
  propagationTimeUtc: string;
}

interface ActorEmphasisState {
  actorId: string;
  orbitClass: FirstIntakeOrbitContextOrbitClass;
  emphasis: "primary" | "balanced" | "secondary";
  modelScale: number;
  pointPixelSize: number;
  labelAlpha: number;
}

interface OrbitContextActorRenderHandle {
  actor: FirstIntakeOrbitContextActorProjectionRecord;
  entity: Entity;
}

export interface FirstIntakeOrbitContextPresentationState {
  scenarioId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID;
  stateKey: FirstIntakeOrbitContextPresentationStateKey;
  stateLabel: string;
  replayTimeUtc: string;
  replayWindowSource: "firstIntakeReplayTimeAuthority.replayClock";
  stateWindowStartUtc: string;
  stateWindowStopUtc: string;
  primaryOrbitClass: FirstIntakeOrbitContextOrbitClass;
  secondaryOrbitClass: FirstIntakeOrbitContextOrbitClass;
  activeEndpointFocus: ActiveEndpointFocus;
  dominantSwitchReason: DominantSwitchReason;
  visualCueLevel: "low" | "medium" | "high";
  stateSource: typeof PRESENTATION_STATE_SOURCE;
  nonClaims: {
    isNativeRfHandover: false;
    isMeasurementTruth: false;
    hasActiveGatewayAssignment: false;
    hasPairSpecificGeoTeleport: false;
    hasRfBeamTruth: false;
    hasActiveMeoParticipation: false;
  };
}

export interface FirstIntakeOrbitContextMetricCue {
  cueKind: "bounded-proxy-classification";
  projectionMode: "bounded-proxy-classification";
  latencyClass: "leo-lower" | "geo-lower" | "balanced";
  jitterClass: "leo-lower" | "geo-lower" | "balanced";
  speedClass: "leo-higher" | "geo-higher" | "balanced";
  continuityClass:
    | "geo-continuity-context"
    | "dual-orbit-overlap"
    | "bounded-switch-window"
    | "leo-context-primary";
  summaryLabel: string;
  sourceLineage: {
    physicalInputRead: "firstIntakePhysicalInputController.getState().physicalInput";
    replayClockRead: "replayClock.getState()";
    projectionMode: "bounded-proxy-classification";
  };
  nonClaims: {
    measurementTruth: false;
    activeGatewayAssignment: false;
    pairSpecificGeoTeleport: false;
    rfBeamTruth: false;
    nativeRfHandoverTruth: false;
  };
}

export interface FirstIntakeOrbitContextActorRuntimeRecord {
  scenarioId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID;
  actorId: string;
  label: FirstIntakeOrbitContextActorProjectionRecord["label"];
  orbitClass: FirstIntakeOrbitContextOrbitClass;
  displayRole: FirstIntakeOrbitContextActorProjectionRecord["displayRole"];
  operatorContext: FirstIntakeOrbitContextActorProjectionRecord["operatorContext"];
  sourceLineage: FirstIntakeOrbitContextActorProjectionRecord["sourceLineage"];
  sourceEpochUtc: string;
  projectionEpochUtc: string;
  freshnessClass: FirstIntakeOrbitContextActorProjectionRecord["freshnessClass"];
  positionPrecision: FirstIntakeOrbitContextActorProjectionRecord["positionPrecision"];
  motionMode: FirstIntakeOrbitContextActorProjectionRecord["motionMode"];
  evidenceClass: FirstIntakeOrbitContextActorProjectionRecord["evidenceClass"];
  modelAssetId: FirstIntakeOrbitContextActorProjectionRecord["modelAssetId"];
  modelTruth: FirstIntakeOrbitContextActorProjectionRecord["modelTruth"];
  nonClaims: FirstIntakeOrbitContextNonClaims;
  currentPositionEcefMeters: {
    x: number;
    y: number;
    z: number;
  };
  sourceOrbitPositionEcefMeters: {
    x: number;
    y: number;
    z: number;
  };
  renderPositionEcefMeters: {
    x: number;
    y: number;
    z: number;
  };
  renderProjection: typeof DISPLAY_PROJECTION_MODE;
  propagationTimeUtc: string;
  emphasis: ActorEmphasisState["emphasis"];
}

export interface FirstIntakeOrbitContextActorControllerState {
  scenarioId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  runtimeState: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_RUNTIME_STATE;
  projectionId: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION_ID;
  projectionSourceAuthority:
    typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.sourceAuthority;
  dataSourceName: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DATA_SOURCE_NAME;
  dataSourceAttached: boolean;
  actorCount: number;
  modelAsset: FirstIntakeOrbitContextModelAssetProjection & {
    uri: string;
  };
  actors: ReadonlyArray<FirstIntakeOrbitContextActorRuntimeRecord>;
  presentationState: FirstIntakeOrbitContextPresentationState;
  actorEmphasis: ReadonlyArray<ActorEmphasisState>;
  relationCue: {
    cueKind: "presentation-only-service-layer-context-ribbon";
    sourceActorIds: ReadonlyArray<string>;
    presentationBoundary: "bounded-presentation-only";
    satellitePathTruth: "not-claimed";
    rfBeamTruth: "not-claimed";
    activeGatewayTruth: "not-claimed";
    geoTeleportTruth: "not-claimed";
    widthPixels: number;
  };
  metricCue: FirstIntakeOrbitContextMetricCue;
  overlayCue: {
    surface: typeof ORBIT_CONTEXT_STAGE_STRIP_SURFACE;
    visible: boolean;
    placement: "bottom-center-compact-above-native-timeline";
  };
  proofSeam: typeof FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROOF_SEAM;
  sourceLineage: {
    projectionRead: "FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION";
    physicalInputRead: "firstIntakePhysicalInputController.getState().physicalInput";
    replayClockRead: "replayClock.getState()";
    displayProjectionRead: typeof DISPLAY_PROJECTION_MODE;
    rawPackageSideReadOwnership: typeof RAW_PACKAGE_SIDE_READ_OWNERSHIP;
  };
  displayProjectionBoundary: {
    sourcePosition: typeof SOURCE_POSITION_BOUNDARY;
    renderPosition: typeof RENDER_POSITION_BOUNDARY;
    renderPositionHistoricalTruth: typeof RENDER_POSITION_HISTORICAL_TRUTH;
  };
}

export interface FirstIntakeOrbitContextActorController {
  getState(): FirstIntakeOrbitContextActorControllerState;
  subscribe(
    listener: (state: FirstIntakeOrbitContextActorControllerState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeOrbitContextActorControllerOptions {
  viewer: Viewer;
  hudFrame: HTMLElement;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  replayClock: ReplayClock;
  physicalInputController: FirstIntakePhysicalInputController;
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
  assertFiniteTimestamp(epochMs, "orbitContextActor.replayTime");
  return epochMs;
}

function toIsoTimestamp(value: ReplayClockState["currentTime"] | number): string {
  const epochMs = typeof value === "number" ? value : Date.parse(value);
  assertFiniteTimestamp(epochMs, "orbitContextActor.timestamp");
  return new Date(epochMs).toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveWindowTimestamp(
  replayState: ReplayClockState,
  ratio: number
): string {
  const startMs = toEpochMilliseconds(replayState.startTime);
  const stopMs = toEpochMilliseconds(replayState.stopTime);
  return toIsoTimestamp(startMs + (stopMs - startMs) * ratio);
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

function resolvePresentationWindow(
  replayState: ReplayClockState
): PresentationWindowDefinition {
  const ratio = resolveReplayWindowRatio(replayState);

  return (
    PRESENTATION_WINDOWS.find(
      (windowDefinition) =>
        ratio >= windowDefinition.startRatio &&
        ratio < windowDefinition.stopRatio
    ) ?? PRESENTATION_WINDOWS[PRESENTATION_WINDOWS.length - 1]
  );
}

function resolveVisualCueLevel(
  stateKey: FirstIntakeOrbitContextPresentationStateKey
): FirstIntakeOrbitContextPresentationState["visualCueLevel"] {
  if (stateKey === "switch-window") {
    return "high";
  }

  if (stateKey === "dual-orbit") {
    return "medium";
  }

  return "low";
}

function resolvePresentationState(
  replayState: ReplayClockState
): FirstIntakeOrbitContextPresentationState {
  const windowDefinition = resolvePresentationWindow(replayState);

  return {
    scenarioId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID,
    stateKey: windowDefinition.stateKey,
    stateLabel: windowDefinition.stateLabel,
    replayTimeUtc: toIsoTimestamp(replayState.currentTime),
    replayWindowSource: "firstIntakeReplayTimeAuthority.replayClock",
    stateWindowStartUtc: resolveWindowTimestamp(
      replayState,
      windowDefinition.startRatio
    ),
    stateWindowStopUtc: resolveWindowTimestamp(
      replayState,
      windowDefinition.stopRatio
    ),
    primaryOrbitClass: windowDefinition.primaryOrbitClass,
    secondaryOrbitClass: windowDefinition.secondaryOrbitClass,
    activeEndpointFocus: windowDefinition.activeEndpointFocus,
    dominantSwitchReason: windowDefinition.dominantSwitchReason,
    visualCueLevel: resolveVisualCueLevel(windowDefinition.stateKey),
    stateSource: PRESENTATION_STATE_SOURCE,
    nonClaims: {
      isNativeRfHandover: false,
      isMeasurementTruth: false,
      hasActiveGatewayAssignment: false,
      hasPairSpecificGeoTeleport: false,
      hasRfBeamTruth: false,
      hasActiveMeoParticipation: false
    }
  };
}

function compareLower(
  left: number,
  right: number
): "leo-lower" | "geo-lower" | "balanced" {
  if (Math.abs(left - right) <= 1) {
    return "balanced";
  }

  return left < right ? "leo-lower" : "geo-lower";
}

function compareHigher(
  left: number,
  right: number
): "leo-higher" | "geo-higher" | "balanced" {
  if (Math.abs(left - right) <= 1) {
    return "balanced";
  }

  return left > right ? "leo-higher" : "geo-higher";
}

function resolveContinuityClass(
  stateKey: FirstIntakeOrbitContextPresentationStateKey
): FirstIntakeOrbitContextMetricCue["continuityClass"] {
  if (stateKey === "geo-context") {
    return "geo-continuity-context";
  }

  if (stateKey === "dual-orbit") {
    return "dual-orbit-overlap";
  }

  if (stateKey === "switch-window") {
    return "bounded-switch-window";
  }

  return "leo-context-primary";
}

function resolveMetricCueSummary(
  stateKey: FirstIntakeOrbitContextPresentationStateKey
): string {
  if (stateKey === "geo-context") {
    return "GEO continuity context";
  }

  if (stateKey === "dual-orbit") {
    return "Dual-orbit overlap";
  }

  if (stateKey === "switch-window") {
    return "Bounded switch window";
  }

  return "LEO context primary";
}

function resolveMetricCue(
  physicalInput: PhysicalInputState,
  presentationState: FirstIntakeOrbitContextPresentationState
): FirstIntakeOrbitContextMetricCue {
  const leoMetrics = physicalInput.projectedMetrics.find(
    (metrics) => metrics.orbitClass === "leo"
  );
  const geoMetrics = physicalInput.projectedMetrics.find(
    (metrics) => metrics.orbitClass === "geo"
  );

  if (!leoMetrics || !geoMetrics) {
    throw new Error(
      "M8A-V3.5 orbit context metric cue requires LEO and GEO bounded metrics."
    );
  }

  return {
    cueKind: "bounded-proxy-classification",
    projectionMode: "bounded-proxy-classification",
    latencyClass: compareLower(leoMetrics.latencyMs, geoMetrics.latencyMs),
    jitterClass: compareLower(leoMetrics.jitterMs, geoMetrics.jitterMs),
    speedClass: compareHigher(
      leoMetrics.networkSpeedMbps,
      geoMetrics.networkSpeedMbps
    ),
    continuityClass: resolveContinuityClass(presentationState.stateKey),
    summaryLabel: resolveMetricCueSummary(presentationState.stateKey),
    sourceLineage: {
      physicalInputRead:
        "firstIntakePhysicalInputController.getState().physicalInput",
      replayClockRead: "replayClock.getState()",
      projectionMode: "bounded-proxy-classification"
    },
    nonClaims: {
      measurementTruth: false,
      activeGatewayAssignment: false,
      pairSpecificGeoTeleport: false,
      rfBeamTruth: false,
      nativeRfHandoverTruth: false
    }
  };
}

function resolveActorEmphasis(
  actor: FirstIntakeOrbitContextActorProjectionRecord,
  presentationState: FirstIntakeOrbitContextPresentationState
): ActorEmphasisState {
  const isPrimary = actor.orbitClass === presentationState.primaryOrbitClass;
  const isDual = presentationState.stateKey === "dual-orbit";
  const isSwitchWindow = presentationState.stateKey === "switch-window";
  const emphasis = isDual ? "balanced" : isPrimary ? "primary" : "secondary";

  return {
    actorId: actor.actorId,
    orbitClass: actor.orbitClass,
    emphasis,
    modelScale:
      emphasis === "primary" ? 1.2 : emphasis === "balanced" ? 1.04 : 0.82,
    pointPixelSize:
      emphasis === "primary" || isSwitchWindow ? 12 : emphasis === "balanced" ? 10 : 7,
    labelAlpha: emphasis === "secondary" ? 0.68 : 0.96
  };
}

function resolveActorColor(
  orbitClass: FirstIntakeOrbitContextOrbitClass,
  emphasis: ActorEmphasisState["emphasis"]
): Color {
  const baseColor =
    orbitClass === "leo"
      ? Color.fromCssColorString("#71e4ff")
      : Color.fromCssColorString("#f4c968");
  const alpha = emphasis === "secondary" ? 0.58 : 0.92;
  return baseColor.withAlpha(alpha);
}

function resolveRelationColor(
  presentationState: FirstIntakeOrbitContextPresentationState
): Color {
  if (presentationState.stateKey === "switch-window") {
    return Color.fromCssColorString("#fff2a6").withAlpha(0.7);
  }

  if (presentationState.stateKey === "dual-orbit") {
    return Color.fromCssColorString("#b9f4ff").withAlpha(0.56);
  }

  return Color.fromCssColorString("#e9d49a").withAlpha(0.34);
}

function resolveRelationWidth(
  presentationState: FirstIntakeOrbitContextPresentationState
): number {
  if (presentationState.stateKey === "switch-window") {
    return 2.4;
  }

  if (presentationState.stateKey === "dual-orbit") {
    return 1.9;
  }

  return 1.1;
}

function resolveModelUri(): string {
  const publicBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(
    FIRST_INTAKE_GENERIC_SATELLITE_MODEL_PUBLIC_PATH,
    publicBaseUrl
  ).toString();
}

function createActorLabelStyle(
  actor: FirstIntakeOrbitContextActorProjectionRecord,
  emphasis: ActorEmphasisState
): LabelGraphics {
  return new LabelGraphics({
    text: new ConstantProperty(actor.label),
    font: "12px sans-serif",
    scale: 0.9,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    ),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#031018").withAlpha(0.94)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString(
        actor.orbitClass === "leo" ? "#053441" : "#4b3408"
      ).withAlpha(0.62)
    ),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset:
      actor.orbitClass === "leo"
        ? new Cartesian2(-18, -38)
        : new Cartesian2(18, -38),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
}

function createActorPointStyle(
  actor: FirstIntakeOrbitContextActorProjectionRecord,
  emphasis: ActorEmphasisState
): PointGraphics {
  return new PointGraphics({
    pixelSize: new ConstantProperty(emphasis.pointPixelSize),
    color: new ConstantProperty(
      resolveActorColor(actor.orbitClass, emphasis.emphasis)
    ),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#031018").withAlpha(0.96)
    ),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
}

function createActorModelGraphics(
  modelUri: string,
  actor: FirstIntakeOrbitContextActorProjectionRecord,
  emphasis: ActorEmphasisState
): ModelGraphics {
  return new ModelGraphics({
    uri: new ConstantProperty(modelUri),
    scale: new ConstantProperty(emphasis.modelScale),
    minimumPixelSize: new ConstantProperty(actor.orbitClass === "leo" ? 54 : 46),
    maximumScale: new ConstantProperty(120_000),
    color: new ConstantProperty(
      resolveActorColor(actor.orbitClass, emphasis.emphasis)
    ),
    colorBlendAmount: new ConstantProperty(0.18)
  });
}

function createRelationCueStyle(
  positions: CallbackProperty,
  presentationState: FirstIntakeOrbitContextPresentationState
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: new ConstantProperty(resolveRelationWidth(presentationState)),
    material: new PolylineDashMaterialProperty({
      color: new ConstantProperty(resolveRelationColor(presentationState)),
      gapColor: new ConstantProperty(
        Color.fromCssColorString("#031018").withAlpha(0.06)
      ),
      dashLength: 18
    }),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function createStageStripRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "m8a-v35-orbit-context-stage-strip";
  root.dataset.m8aV35OrbitContextStageStrip = "true";
  root.setAttribute("aria-label", "Orbit context stage");
  return root;
}

function renderStageStrip(
  root: HTMLElement,
  state: FirstIntakeOrbitContextActorControllerState
): void {
  root.dataset.surface = state.overlayCue.surface;
  root.dataset.presentationState = state.presentationState.stateKey;
  root.dataset.metricCueKind = state.metricCue.cueKind;
  root.dataset.metricCueSummary = state.metricCue.summaryLabel;
  root.dataset.requiredNonClaims = serializeJson(
    state.presentationState.nonClaims
  );
  root.dataset.rawPackageSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;
  root.dataset.sourcePositionBoundary =
    state.displayProjectionBoundary.sourcePosition;
  root.dataset.renderPositionBoundary =
    state.displayProjectionBoundary.renderPosition;
  root.dataset.renderPositionHistoricalTruth =
    state.displayProjectionBoundary.renderPositionHistoricalTruth;
  root.dataset.sourceOrbitPositionEcefMeters = serializeJson(
    state.actors.map((actor) => ({
      actorId: actor.actorId,
      position: actor.sourceOrbitPositionEcefMeters
    }))
  );
  root.dataset.renderPositionEcefMeters = serializeJson(
    state.actors.map((actor) => ({
      actorId: actor.actorId,
      position: actor.renderPositionEcefMeters
    }))
  );

  root.innerHTML = `
    <div class="m8a-v35-orbit-context-stage-strip__stages">
      ${PRESENTATION_WINDOWS.map(
        (windowDefinition) => `
          <span
            class="m8a-v35-orbit-context-stage-strip__stage"
            data-stage-key="${windowDefinition.stateKey}"
            data-active="${windowDefinition.stateKey === state.presentationState.stateKey ? "true" : "false"}"
          >${windowDefinition.stateKey}</span>
        `
      ).join("")}
    </div>
    <div class="m8a-v35-orbit-context-stage-strip__cue">
      <span>${DISPLAY_CONTEXT_CHIP_TEXT}</span>
      <strong>${state.metricCue.summaryLabel}</strong>
      <span>${NOT_ACTIVE_SERVICE_TEXT}</span>
    </div>
    <div class="m8a-v35-orbit-context-stage-strip__boundary">
      <span>TLE source position</span>
      <span>close-view display projection</span>
      <span>historical location not claimed</span>
    </div>
  `;
}

function cloneActorState(
  actor: FirstIntakeOrbitContextActorRuntimeRecord
): FirstIntakeOrbitContextActorRuntimeRecord {
  return {
    ...actor,
    sourceLineage: {
      ...actor.sourceLineage
    },
    nonClaims: {
      ...actor.nonClaims
    },
    currentPositionEcefMeters: {
      ...actor.currentPositionEcefMeters
    },
    sourceOrbitPositionEcefMeters: {
      ...actor.sourceOrbitPositionEcefMeters
    },
    renderPositionEcefMeters: {
      ...actor.renderPositionEcefMeters
    }
  };
}

function cloneState(
  state: FirstIntakeOrbitContextActorControllerState
): FirstIntakeOrbitContextActorControllerState {
  return {
    ...state,
    modelAsset: {
      ...state.modelAsset
    },
    actors: state.actors.map(cloneActorState),
    presentationState: {
      ...state.presentationState,
      nonClaims: {
        ...state.presentationState.nonClaims
      }
    },
    actorEmphasis: state.actorEmphasis.map((emphasis) => ({ ...emphasis })),
    relationCue: {
      ...state.relationCue,
      sourceActorIds: [...state.relationCue.sourceActorIds]
    },
    metricCue: {
      ...state.metricCue,
      sourceLineage: {
        ...state.metricCue.sourceLineage
      },
      nonClaims: {
        ...state.metricCue.nonClaims
      }
    },
    overlayCue: {
      ...state.overlayCue
    },
    sourceLineage: {
      ...state.sourceLineage
    },
    displayProjectionBoundary: {
      ...state.displayProjectionBoundary
    }
  };
}

function notifyListeners(
  listeners: ReadonlySet<
    (state: FirstIntakeOrbitContextActorControllerState) => void
  >,
  state: FirstIntakeOrbitContextActorControllerState
): void {
  for (const listener of listeners) {
    listener(cloneState(state));
  }
}

function syncTelemetry(state: FirstIntakeOrbitContextActorControllerState): void {
  syncDocumentTelemetry({
    firstIntakeOrbitContextActorState: state.runtimeState,
    firstIntakeOrbitContextActorScenarioId: state.scenarioId,
    firstIntakeOrbitContextActorProjectionId: state.projectionId,
    firstIntakeOrbitContextActorDataSourceName: state.dataSourceName,
    firstIntakeOrbitContextActorDataSourceAttached: state.dataSourceAttached
      ? "true"
      : "false",
    firstIntakeOrbitContextActorCount: String(state.actorCount),
    firstIntakeOrbitContextActorIds: serializeList(
      state.actors.map((actor) => actor.actorId)
    ),
    firstIntakeOrbitContextActorLabels: serializeList(
      state.actors.map((actor) => actor.label)
    ),
    firstIntakeOrbitContextActorEvidenceClasses: serializeList(
      state.actors.map((actor) => actor.evidenceClass)
    ),
    firstIntakeOrbitContextActorFreshnessClasses: serializeList(
      state.actors.map((actor) => actor.freshnessClass)
    ),
    firstIntakeOrbitContextActorPositionPrecisions: serializeList(
      state.actors.map((actor) => actor.positionPrecision)
    ),
    firstIntakeOrbitContextActorMotionModes: serializeList(
      state.actors.map((actor) => actor.motionMode)
    ),
    firstIntakeOrbitContextActorSourceEpochs: serializeList(
      state.actors.map((actor) => actor.sourceEpochUtc)
    ),
    firstIntakeOrbitContextActorProjectionEpochs: serializeList(
      state.actors.map((actor) => actor.projectionEpochUtc)
    ),
    firstIntakeOrbitContextActorModelAssetId: state.modelAsset.modelAssetId,
    firstIntakeOrbitContextActorModelTruth: state.modelAsset.modelTruth,
    firstIntakeOrbitContextActorPresentationState:
      state.presentationState.stateKey,
    firstIntakeOrbitContextActorPresentationStateSource:
      state.presentationState.stateSource,
    firstIntakeOrbitContextActorMetricCueKind: state.metricCue.cueKind,
    firstIntakeOrbitContextActorMetricCueSummary: state.metricCue.summaryLabel,
    firstIntakeOrbitContextActorRequiredNonClaims: serializeJson(
      state.presentationState.nonClaims
    ),
    firstIntakeOrbitContextActorDisplayProjectionMode:
      state.sourceLineage.displayProjectionRead,
    firstIntakeOrbitContextActorDisplayProjectionBoundary: serializeJson(
      state.displayProjectionBoundary
    ),
    firstIntakeOrbitContextActorRawPackageSideReadOwnership:
      state.sourceLineage.rawPackageSideReadOwnership,
    firstIntakeOrbitContextActorProofSeam: state.proofSeam
  });
}

function updateActorStyle(
  handle: OrbitContextActorRenderHandle,
  emphasis: ActorEmphasisState
): void {
  const color = resolveActorColor(handle.actor.orbitClass, emphasis.emphasis);

  if (handle.entity.model) {
    handle.entity.model.scale = new ConstantProperty(emphasis.modelScale);
    handle.entity.model.color = new ConstantProperty(color);
  }

  if (handle.entity.point) {
    handle.entity.point.pixelSize = new ConstantProperty(emphasis.pointPixelSize);
    handle.entity.point.color = new ConstantProperty(color);
  }

  if (handle.entity.label) {
    handle.entity.label.fillColor = new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    );
  }
}

function updateRelationStyle(
  relationCueEntity: Entity,
  presentationState: FirstIntakeOrbitContextPresentationState
): void {
  if (!relationCueEntity.polyline) {
    return;
  }

  relationCueEntity.polyline.width = new ConstantProperty(
    resolveRelationWidth(presentationState)
  );
  relationCueEntity.polyline.material = new PolylineDashMaterialProperty({
    color: new ConstantProperty(resolveRelationColor(presentationState)),
    gapColor: new ConstantProperty(
      Color.fromCssColorString("#031018").withAlpha(0.06)
    ),
    dashLength: 18
  });
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

function normalizeUnit(value: number): number {
  const normalized = value % 1;

  return normalized < 0 ? normalized + 1 : normalized;
}

function lerp(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

function resolveSourceDrivenDisplayRatio(sourcePositionEcef: Cartesian3): number {
  const sourceLongitudePhase =
    Math.atan2(sourcePositionEcef.y, sourcePositionEcef.x) / (Math.PI * 2);

  return normalizeUnit(sourceLongitudePhase * 8 + 0.18);
}

export function createFirstIntakeOrbitContextActorController({
  viewer,
  hudFrame,
  scenarioSurface,
  replayClock,
  physicalInputController
}: FirstIntakeOrbitContextActorControllerOptions): FirstIntakeOrbitContextActorController {
  const runtimeState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "M8A-V3.5 orbit context actors only mount for the matched addressed case."
    );
  }

  if (
    addressedEntry.scenarioId !==
    FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.scenarioId
  ) {
    throw new Error(
      "M8A-V3.5 orbit context actors must stay on the first OneWeb + Intelsat GEO scenario."
    );
  }

  const modelUri = resolveModelUri();
  const dataSource = new CustomDataSource(
    FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DATA_SOURCE_NAME
  );
  const stageStripRoot = createStageStripRoot();
  const listeners = new Set<
    (state: FirstIntakeOrbitContextActorControllerState) => void
  >();
  const satrecs = new Map(
    FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors.map((actor) => [
      actor.actorId,
      twoline2satrec(
        actor.sourceLineage.tleLine1,
        actor.sourceLineage.tleLine2
      )
    ])
  );
  const replayStartMs = toEpochMilliseconds(
    replayClock.getState().startTime ?? REPLAY_START_FALLBACK_UTC
  );
  let disposed = false;
  let dataSourceAttached = false;
  let latestPresentationState = resolvePresentationState(replayClock.getState());

  const resolveSourceOrbitPosition = (
    actor: FirstIntakeOrbitContextActorProjectionRecord,
    time?: JulianDate,
    result?: Cartesian3
  ): PropagatedActorPosition => {
    const satrec = satrecs.get(actor.actorId);
    if (!satrec) {
      throw new Error(`Missing M8A-V3.5 satrec for ${actor.actorId}.`);
    }

    const propagationDate =
      actor.motionMode === "fixed-earth-relative"
        ? new Date(replayStartMs)
        : time
          ? JulianDate.toDate(time)
          : new Date(toEpochMilliseconds(replayClock.getState().currentTime));
    const propagated = propagate(satrec, propagationDate);

    if (!propagated?.position) {
      throw new Error(`M8A-V3.5 propagation failed for ${actor.actorId}.`);
    }

    const positionEcfKilometers = eciToEcf(
      propagated.position,
      gstime(propagationDate)
    );
    const target = result ?? new Cartesian3();
    target.x = positionEcfKilometers.x * 1000;
    target.y = positionEcfKilometers.y * 1000;
    target.z = positionEcfKilometers.z * 1000;

    return {
      cartesian: target,
      propagationTimeUtc: propagationDate.toISOString()
    };
  };

  const resolveActorRenderPosition = (
    actor: FirstIntakeOrbitContextActorProjectionRecord,
    time?: JulianDate,
    result?: Cartesian3
  ): PropagatedActorPosition => {
    const sourcePosition = resolveSourceOrbitPosition(actor, time);
    const target = result ?? new Cartesian3();

    if (actor.motionMode === "fixed-earth-relative") {
      return {
        cartesian: Cartesian3.fromDegrees(
          GEO_DISPLAY_ANCHOR.lon,
          GEO_DISPLAY_ANCHOR.lat,
          GEO_DISPLAY_ANCHOR.heightMeters,
          undefined,
          target
        ),
        propagationTimeUtc: sourcePosition.propagationTimeUtc
      };
    }

    const displayRatio = resolveSourceDrivenDisplayRatio(
      sourcePosition.cartesian
    );
    const displayHeightMeters =
      lerp(
        LEO_DISPLAY_TRACK_START.heightMeters,
        LEO_DISPLAY_TRACK_STOP.heightMeters,
        displayRatio
      ) +
      Math.sin(displayRatio * Math.PI) * 24_000;

    return {
      cartesian: Cartesian3.fromDegrees(
        lerp(LEO_DISPLAY_TRACK_START.lon, LEO_DISPLAY_TRACK_STOP.lon, displayRatio),
        lerp(LEO_DISPLAY_TRACK_START.lat, LEO_DISPLAY_TRACK_STOP.lat, displayRatio),
        displayHeightMeters,
        undefined,
        target
      ),
      propagationTimeUtc: sourcePosition.propagationTimeUtc
    };
  };

  const createActorPositionProperty = (
    actor: FirstIntakeOrbitContextActorProjectionRecord
  ): CallbackPositionProperty => {
    return new CallbackPositionProperty((time, result) => {
      return resolveActorRenderPosition(actor, time, result).cartesian;
    }, false);
  };

  const initialEmphasisByActorId = new Map(
    FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors.map((actor) => {
      const emphasis = resolveActorEmphasis(actor, latestPresentationState);
      return [actor.actorId, emphasis];
    })
  );

  const actorHandles = FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors.map(
    (actor): OrbitContextActorRenderHandle => {
      const emphasis = initialEmphasisByActorId.get(actor.actorId);
      if (!emphasis) {
        throw new Error(`Missing M8A-V3.5 actor emphasis for ${actor.actorId}.`);
      }

      const entity = dataSource.entities.add({
        id: actor.actorId,
        name: actor.label,
        position: createActorPositionProperty(actor),
        point: createActorPointStyle(actor, emphasis),
        model: createActorModelGraphics(modelUri, actor, emphasis),
        label: createActorLabelStyle(actor, emphasis),
        description: new ConstantProperty(
          `${actor.label}: ${actor.evidenceClass}; ${DISPLAY_CONTEXT_CHIP_TEXT}; ${NOT_ACTIVE_SERVICE_TEXT}.`
        )
      });

      return {
        actor,
        entity
      };
    }
  );
  const relationPositions = new CallbackProperty((time) => {
    const [leoActor, geoActor] = FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors;
    return [
      resolveActorRenderPosition(leoActor, time).cartesian,
      resolveActorRenderPosition(geoActor, time).cartesian
    ];
  }, false);
  const relationCueEntity = dataSource.entities.add({
    id: RELATION_CUE_ENTITY_ID,
    name: "Orbit context presentation relation cue",
    position: new CallbackPositionProperty((time, result) => {
      const [leoActor, geoActor] = FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors;
      return Cartesian3.midpoint(
        resolveActorRenderPosition(leoActor, time).cartesian,
        resolveActorRenderPosition(geoActor, time).cartesian,
        result ?? new Cartesian3()
      );
    }, false),
    polyline: createRelationCueStyle(relationPositions, latestPresentationState),
    description: new ConstantProperty(
      "Presentation-only service-layer context ribbon. No radio-link geometry, satellite path truth, gateway-assignment truth, or GEO teleport truth."
    )
  });

  const createState = (): FirstIntakeOrbitContextActorControllerState => {
    const replayState = replayClock.getState();
    const physicalInputState = physicalInputController.getState();
    const presentationState = resolvePresentationState(replayState);
    const metricCue = resolveMetricCue(
      physicalInputState.physicalInput,
      presentationState
    );
    const actorEmphasis = FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors.map(
      (actor) => resolveActorEmphasis(actor, presentationState)
    );
    const actorEmphasisById = new Map(
      actorEmphasis.map((emphasis) => [emphasis.actorId, emphasis])
    );
    const actors = FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.actors.map(
      (actor): FirstIntakeOrbitContextActorRuntimeRecord => {
        const sourcePropagated = resolveSourceOrbitPosition(actor);
        const renderPropagated = resolveActorRenderPosition(actor);
        const emphasis = actorEmphasisById.get(actor.actorId);

        if (!emphasis) {
          throw new Error(`Missing M8A-V3.5 emphasis for ${actor.actorId}.`);
        }

        return {
          scenarioId: actor.scenarioId,
          actorId: actor.actorId,
          label: actor.label,
          orbitClass: actor.orbitClass,
          displayRole: actor.displayRole,
          operatorContext: actor.operatorContext,
          sourceLineage: {
            ...actor.sourceLineage
          },
          sourceEpochUtc: actor.sourceEpochUtc,
          projectionEpochUtc: actor.projectionEpochUtc,
          freshnessClass: actor.freshnessClass,
          positionPrecision: actor.positionPrecision,
          motionMode: actor.motionMode,
          evidenceClass: actor.evidenceClass,
          modelAssetId: actor.modelAssetId,
          modelTruth: actor.modelTruth,
          nonClaims: {
            ...actor.nonClaims
          },
          currentPositionEcefMeters: positionToPlainMeters(
            sourcePropagated.cartesian
          ),
          sourceOrbitPositionEcefMeters: positionToPlainMeters(
            sourcePropagated.cartesian
          ),
          renderPositionEcefMeters: positionToPlainMeters(
            renderPropagated.cartesian
          ),
          renderProjection: DISPLAY_PROJECTION_MODE,
          propagationTimeUtc: sourcePropagated.propagationTimeUtc,
          emphasis: emphasis.emphasis
        };
      }
    );

    return {
      scenarioId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_SCENARIO_ID,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      runtimeState: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_RUNTIME_STATE,
      projectionId: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.projectionId,
      projectionSourceAuthority:
        FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.sourceAuthority,
      dataSourceName: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_DATA_SOURCE_NAME,
      dataSourceAttached,
      actorCount: actors.length,
      modelAsset: {
        ...FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION.modelAsset,
        uri: modelUri
      },
      actors,
      presentationState,
      actorEmphasis,
      relationCue: {
        cueKind: "presentation-only-service-layer-context-ribbon",
        sourceActorIds: actors.map((actor) => actor.actorId),
        presentationBoundary: "bounded-presentation-only",
        satellitePathTruth: "not-claimed",
        rfBeamTruth: "not-claimed",
        activeGatewayTruth: "not-claimed",
        geoTeleportTruth: "not-claimed",
        widthPixels: resolveRelationWidth(presentationState)
      },
      metricCue,
      overlayCue: {
        surface: ORBIT_CONTEXT_STAGE_STRIP_SURFACE,
        visible: stageStripRoot.isConnected && !stageStripRoot.hidden,
        placement: "bottom-center-compact-above-native-timeline"
      },
      proofSeam: FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROOF_SEAM,
      sourceLineage: {
        projectionRead: "FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_PROJECTION",
        physicalInputRead:
          "firstIntakePhysicalInputController.getState().physicalInput",
        replayClockRead: "replayClock.getState()",
        displayProjectionRead: DISPLAY_PROJECTION_MODE,
        rawPackageSideReadOwnership: RAW_PACKAGE_SIDE_READ_OWNERSHIP
      },
      displayProjectionBoundary: {
        sourcePosition: SOURCE_POSITION_BOUNDARY,
        renderPosition: RENDER_POSITION_BOUNDARY,
        renderPositionHistoricalTruth: RENDER_POSITION_HISTORICAL_TRUTH
      }
    };
  };

  const syncState = (): FirstIntakeOrbitContextActorControllerState => {
    const nextState = createState();
    latestPresentationState = nextState.presentationState;
    const emphasisById = new Map(
      nextState.actorEmphasis.map((emphasis) => [emphasis.actorId, emphasis])
    );

    for (const handle of actorHandles) {
      const emphasis = emphasisById.get(handle.actor.actorId);
      if (emphasis) {
        updateActorStyle(handle, emphasis);
      }
    }

    updateRelationStyle(relationCueEntity, nextState.presentationState);
    renderStageStrip(stageStripRoot, nextState);
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    return nextState;
  };

  hudFrame.appendChild(stageStripRoot);
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

  const unsubscribeReplayClock = replayClock.onTick(() => {
    syncState();
  });
  const unsubscribePhysicalInput = physicalInputController.subscribe(() => {
    syncState();
  });

  return {
    getState(): FirstIntakeOrbitContextActorControllerState {
      return cloneState(createState());
    },
    subscribe(
      listener: (state: FirstIntakeOrbitContextActorControllerState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      disposed = true;
      unsubscribeReplayClock();
      unsubscribePhysicalInput();
      listeners.clear();
      stageStripRoot.remove();
      clearDocumentTelemetry(FIRST_INTAKE_ORBIT_CONTEXT_ACTOR_TELEMETRY_KEYS);
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
