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
  Rectangle,
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
  type M8aV4ActorDisplayRole,
  type M8aV4EndpointId,
  type M8aV4EndpointProjection,
  type M8aV4GeoPosition,
  type M8aV4OrbitActorProjection,
  type M8aV4OrbitClass,
  type M8aV4RuntimeNarrativeNonClaims,
  type M8aV4ServiceStateWindow
} from "./m8a-v4-ground-station-projection";

export const M8A_V4_GROUND_STATION_DATA_SOURCE_NAME =
  "m8a-v4-ground-station-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_RUNTIME_STATE =
  "active-v4.3-continuous-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene";

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
  "m8aV4GroundStationServiceStateWindowId",
  "m8aV4GroundStationServiceStateSource",
  "m8aV4GroundStationCurrentPrimaryOrbit",
  "m8aV4GroundStationNextCandidateOrbit",
  "m8aV4GroundStationContinuityFallbackOrbit",
  "m8aV4GroundStationBoundedMetricsUsed",
  "m8aV4GroundStationRawItriSideReadOwnership",
  "m8aV4GroundStationRuntimeConsumptionRule",
  "m8aV4GroundStationProofSeam",
  "m8aV4GroundStationNonClaims"
] as const;

type M8aV4RelationRole = "primary" | "candidate" | "fallback";

interface M8aV4ActorEmphasis {
  actorId: string;
  orbitClass: M8aV4OrbitClass;
  emphasis: "primary" | "candidate" | "fallback" | "context";
  pointPixelSize: number;
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
  relationCues: {
    cueKind: "modeled-service-state-continuity-ribbons";
    primaryOrbitClass: M8aV4OrbitClass;
    nextCandidateOrbitClass: M8aV4OrbitClass;
    continuityFallbackOrbitClass: "geo";
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

function lerp(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

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
  const stopMs = startMs + 10 * 60 * 1000;
  const range = {
    start: new Date(startMs).toISOString(),
    stop: new Date(stopMs).toISOString()
  };

  replayClock.setMode("prerecorded", range);
  replayClock.seek(range.start);
  replayClock.setMultiplier(30);
  replayClock.play();
  viewer.timeline?.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
}

function applyV4Camera(viewer: Viewer): void {
  viewer.camera.cancelFlight();
  viewer.camera.flyTo({
    destination: Rectangle.fromDegrees(78, -15, 154, 43),
    orientation: {
      heading: CesiumMath.toRadians(8),
      pitch: CesiumMath.toRadians(-68),
      roll: 0
    },
    duration: 0.15,
    complete: () => {
      viewer.scene.requestRender();
    }
  });
}

function resolveOrbitColor(
  orbitClass: M8aV4OrbitClass,
  alpha = 1
): Color {
  switch (orbitClass) {
    case "leo":
      return Color.fromCssColorString("#62d8ff").withAlpha(alpha);
    case "meo":
      return Color.fromCssColorString("#b9f17d").withAlpha(alpha);
    case "geo":
      return Color.fromCssColorString("#ffd166").withAlpha(alpha);
  }
}

function resolveEndpointColor(endpointId: M8aV4EndpointId): Color {
  return endpointId === "tw-cht-multi-orbit-ground-infrastructure"
    ? Color.fromCssColorString("#f4fbff")
    : Color.fromCssColorString("#7ee2b8");
}

function resolveActorEmphasis(
  actor: M8aV4OrbitActorProjection,
  serviceWindow: M8aV4ServiceStateWindow
): M8aV4ActorEmphasis {
  const emphasis =
    actor.orbitClass === serviceWindow.currentPrimaryOrbitClass
      ? "primary"
      : actor.orbitClass === serviceWindow.nextCandidateOrbitClass
        ? "candidate"
        : actor.orbitClass === serviceWindow.continuityFallbackOrbitClass
          ? "fallback"
          : "context";

  return {
    actorId: actor.actorId,
    orbitClass: actor.orbitClass,
    emphasis,
    pointPixelSize:
      emphasis === "primary" ? 12 : emphasis === "candidate" ? 10 : 8,
    modelScale:
      emphasis === "primary" ? 1.22 : emphasis === "candidate" ? 1.06 : 0.9,
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

function createActorPointStyle(
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): PointGraphics {
  return new PointGraphics({
    pixelSize: new ConstantProperty(emphasis.pointPixelSize),
    color: new ConstantProperty(resolveOrbitColor(actor.orbitClass, 0.94)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
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
    backgroundColor: new ConstantProperty(
      resolveOrbitColor(actor.orbitClass, 0.2)
    ),
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
    maximumScale: new ConstantProperty(180_000),
    color: new ConstantProperty(resolveOrbitColor(actor.orbitClass, 0.9)),
    colorBlendAmount: new ConstantProperty(0.2)
  });
}

function resolveRelationColor(role: M8aV4RelationRole): Color {
  switch (role) {
    case "primary":
      return Color.fromCssColorString("#fff2a6").withAlpha(0.72);
    case "candidate":
      return Color.fromCssColorString("#7ee2b8").withAlpha(0.5);
    case "fallback":
      return Color.fromCssColorString("#ffd166").withAlpha(0.36);
  }
}

function resolveRelationWidth(role: M8aV4RelationRole): number {
  switch (role) {
    case "primary":
      return 2.5;
    case "candidate":
      return 1.7;
    case "fallback":
      return 1.2;
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
      dashLength: role === "primary" ? 18 : 24
    }),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function updateActorStyle(
  handle: ActorRenderHandle,
  emphasis: M8aV4ActorEmphasis
): void {
  const color = resolveOrbitColor(handle.actor.orbitClass, 0.9);

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
    dashLength: handle.role === "primary" ? 18 : 24
  });
}

function createHudRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "m8a-v4-ground-station-scene";
  root.dataset.m8aV4GroundStationScene = "true";
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", "M8A V4.3 ground station handover scene");
  return root;
}

function renderHud(root: HTMLElement, state: M8aV4GroundStationSceneState): void {
  root.dataset.serviceWindowId = state.serviceState.window.windowId;
  root.dataset.currentPrimaryOrbit =
    state.serviceState.window.currentPrimaryOrbitClass;
  root.dataset.nextCandidateOrbit =
    state.serviceState.window.nextCandidateOrbitClass;
  root.dataset.precisionBadge = M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
  root.dataset.rawItriSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;
  root.dataset.nonClaims = serializeJson(state.nonClaims);

  const endpointMarkup = state.endpoints
    .map(
      (endpoint) => `
        <div class="m8a-v4-ground-station-scene__endpoint">
          <span>${endpoint.label}</span>
          <strong>${endpoint.precisionBadge}</strong>
          <small>${endpoint.orbitEvidenceChips.join(" / ")}</small>
        </div>
      `
    )
    .join("");
  const stageMarkup = state.serviceState.timelineWindowIds
    .map(
      (windowId) => `
        <span
          class="m8a-v4-ground-station-scene__stage"
          data-active="${windowId === state.serviceState.window.windowId ? "true" : "false"}"
        >${windowId.replace("v4-modeled-window-", "")}</span>
      `
    )
    .join("");

  root.innerHTML = `
    <div class="m8a-v4-ground-station-scene__header">
      <span>V4.3 Continuous Multi-Orbit Handover</span>
      <strong>${state.serviceState.window.currentPrimaryOrbitClass.toUpperCase()} -> ${state.serviceState.window.nextCandidateOrbitClass.toUpperCase()}</strong>
    </div>
    <div class="m8a-v4-ground-station-scene__endpoints">
      ${endpointMarkup}
    </div>
    <div class="m8a-v4-ground-station-scene__orbit-strip">
      <span>LEO x${state.orbitActorCounts.leo}</span>
      <span>MEO x${state.orbitActorCounts.meo}</span>
      <span>GEO x${state.orbitActorCounts.geo}</span>
      <strong>${state.serviceState.window.handoverPressureReason}</strong>
    </div>
    <div class="m8a-v4-ground-station-scene__stages">
      ${stageMarkup}
    </div>
    <div class="m8a-v4-ground-station-scene__signals">
      ${state.serviceState.window.reasonSignals
        .map((signal) => `<span>${signal}</span>`)
        .join("")}
    </div>
    <div class="m8a-v4-ground-station-scene__nonclaims">
      <span>no aircraft</span>
      <span>no YKA</span>
      <span>no handset UE</span>
      <span>not active satellite</span>
      <span>not active gateway</span>
      <span>no pair-specific teleport path</span>
      <span>no measured latency/jitter/throughput</span>
      <span>not native RF handover</span>
    </div>
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

function resolveActorForOrbit(
  actors: ReadonlyArray<M8aV4OrbitActorProjection>,
  orbitClass: M8aV4OrbitClass,
  replayState: ReplayClockState
): M8aV4OrbitActorProjection {
  const candidates = actors.filter((actor) => actor.orbitClass === orbitClass);

  if (!candidates[0]) {
    throw new Error(`Missing V4 actor for ${orbitClass}.`);
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const ratio = resolveReplayWindowRatio(replayState);
  return candidates[Math.floor(ratio * candidates.length) % candidates.length];
}

export function createM8aV4GroundStationSceneController({
  viewer,
  hudFrame,
  replayClock
}: M8aV4GroundStationSceneControllerOptions): M8aV4GroundStationSceneController {
  const modelUri = resolveModelUri();
  const dataSource = new CustomDataSource(M8A_V4_GROUND_STATION_DATA_SOURCE_NAME);
  const hudRoot = createHudRoot();
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
  let latestServiceWindow = resolveServiceStateWindow(replayClock.getState());

  configureReplayClock(viewer, replayClock);
  applyV4Camera(viewer);
  hudFrame.dataset.hudVisibility = "m8a-v4";
  hudFrame.setAttribute("aria-hidden", "false");
  hudFrame.appendChild(hudRoot);

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
      "Endpoint pair context only. No pair-specific teleport path, active gateway, measured performance, or native RF handover truth."
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
      return {
        cartesian: Cartesian3.fromDegrees(
          track.start.lon,
          track.start.lat,
          track.start.heightMeters,
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
    const heightMeters =
      lerp(track.start.heightMeters, track.stop.heightMeters, easedRatio) +
      Math.sin(loopRatio * Math.PI * 2) *
        (actor.orbitClass === "meo" ? 90000 : 55000);

    return {
      cartesian: Cartesian3.fromDegrees(
        lerp(track.start.lon, track.stop.lon, easedRatio),
        lerp(track.start.lat, track.stop.lat, easedRatio),
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
      const emphasis = resolveActorEmphasis(actor, latestServiceWindow);
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
          point: createActorPointStyle(actor, emphasis),
          model: createActorModelGraphics(modelUri, actor, emphasis),
          label: createActorLabelStyle(actor, emphasis),
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

  const resolveRelationOrbit = (
    role: M8aV4RelationRole,
    replayState: ReplayClockState
  ): M8aV4OrbitClass => {
    const serviceWindow = resolveServiceStateWindow(replayState);

    if (role === "primary") {
      return serviceWindow.currentPrimaryOrbitClass;
    }

    if (role === "candidate") {
      return serviceWindow.nextCandidateOrbitClass;
    }

    return serviceWindow.continuityFallbackOrbitClass;
  };

  const createRelationPositions = (
    role: M8aV4RelationRole
  ): CallbackProperty => {
    return new CallbackProperty((time) => {
      const replayState = replayClock.getState();
      const orbitClass = resolveRelationOrbit(role, replayState);
      const actor = resolveActorForOrbit(
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors,
        orbitClass,
        replayState
      );

      return [
        positionToCartesian(endpointA.renderMarker.displayPosition),
        resolveActorRenderPosition(actor, time).cartesian,
        positionToCartesian(endpointB.renderMarker.displayPosition)
      ];
    }, false);
  };
  const relationHandles: ReadonlyArray<RelationRenderHandle> = [
    "primary",
    "candidate",
    "fallback"
  ].map((role) => {
    const relationRole = role as M8aV4RelationRole;
    const entity = dataSource.entities.add({
      id: `m8a-v4-modeled-service-${relationRole}-continuity-ribbon`,
      name: `V4 modeled ${relationRole} continuity ribbon`,
      polyline: createRelationStyle(
        createRelationPositions(relationRole),
        relationRole
      ),
      description: new ConstantProperty(
        "Modeled service-state continuity ribbon from artifact timeline. No RF beam, active serving satellite, active gateway, pair-specific teleport path, measured performance, or native RF handover truth."
      )
    });

    return {
      role: relationRole,
      entity
    };
  });

  const createState = (): M8aV4GroundStationSceneState => {
    const replayState = replayClock.getState();
    const serviceWindow = resolveServiceStateWindow(replayState);
    const actorEmphasis =
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) =>
        resolveActorEmphasis(actor, serviceWindow)
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
          emphasis: emphasis.emphasis
        };
      }
    );
    const orbitActorCounts = {
      leo: actors.filter((actor) => actor.orbitClass === "leo").length,
      meo: actors.filter((actor) => actor.orbitClass === "meo").length,
      geo: actors.filter((actor) => actor.orbitClass === "geo").length
    };

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
      relationCues: {
        cueKind: "modeled-service-state-continuity-ribbons",
        primaryOrbitClass: serviceWindow.currentPrimaryOrbitClass,
        nextCandidateOrbitClass: serviceWindow.nextCandidateOrbitClass,
        continuityFallbackOrbitClass: serviceWindow.continuityFallbackOrbitClass,
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
    latestServiceWindow = nextState.serviceState.window;
    const emphasisById = new Map(
      nextState.actors.map((actor) => [
        actor.actorId,
        resolveActorEmphasis(
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.find(
            (projectionActor) => projectionActor.actorId === actor.actorId
          ) ?? M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors[0],
          latestServiceWindow
        )
      ])
    );

    for (const handle of actorHandles) {
      const emphasis = emphasisById.get(handle.actor.actorId);

      if (emphasis) {
        updateActorStyle(handle, emphasis);
      }
    }

    for (const handle of relationHandles) {
      updateRelationStyle(handle);
    }

    renderHud(hudRoot, nextState);
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    return nextState;
  };

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
    dispose(): void {
      disposed = true;
      unsubscribeReplayClock();
      listeners.clear();
      hudRoot.remove();
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
