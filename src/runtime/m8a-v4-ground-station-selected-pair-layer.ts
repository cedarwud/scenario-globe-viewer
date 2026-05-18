import {
  ArcType,
  BillboardGraphics,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  CustomDataSource,
  DistanceDisplayCondition,
  HorizontalOrigin,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  ModelGraphics,
  PointGraphics,
  PolylineArrowMaterialProperty,
  PolylineGraphics,
  SceneTransforms,
  VerticalOrigin,
  type Viewer
} from "cesium";

import type { ReplayClock, ReplayClockState } from "../features/time";
import type { V4ResolvedStationPair } from "../features/multi-station-selector/v4-route-selection";
import {
  buildDefaultTimeWindow,
  buildRuntimeTleSourceParseStats,
  computeRuntimeProjection,
  loadDefaultTleSources,
  parseRuntimeTleSources
} from "../features/multi-station-selector/runtime-projection";
import type { RuntimeDataCompletenessState } from "../features/multi-station-selector/runtime-data-completeness";
import {
  buildTleFirstSceneViewModel,
  type SceneActiveLink,
  type SceneActor,
  type SceneCameraHint,
  type TleFirstSceneViewModel
} from "../features/multi-station-selector/tle-first-scene-view-model";
import type {
  M8aV4GeoPosition,
  M8aV4OrbitClass
} from "./m8a-v4-ground-station-projection";
import {
  M8A_V4_LINK_FLOW_DIRECTIONS,
  M8A_V4_LINK_FLOW_PULSE_OFFSETS,
  M8A_V4_LINK_FLOW_REPLAY_CYCLES,
  type M8aV4LinkFlowDirection
} from "./m8a-v4-product-ux-model";
import {
  createSelectedPairOverlayDebugState,
  type SelectedPairOverlayDebugState
} from "./m8a-v4-ground-station-overlay-debug";

const M8A_V4_SELECTED_PAIR_SCENE_DEFAULT_DURATION_MINUTES = 360;
const M8A_V4_SELECTED_PAIR_SCENE_MIN_DURATION_MINUTES = 20;
const M8A_V4_SELECTED_PAIR_SCENE_MAX_DURATION_MINUTES = 480;

type SelectedPairLinkFlowRole = "displayRepresentative";

export interface SelectedPairLayerEndpointContext {
  readonly renderMarker: {
    readonly displayPosition: M8aV4GeoPosition;
  };
}

export interface InstallSelectedPairTleFirstSceneLayerOptions {
  readonly dataSource: CustomDataSource;
  readonly endpointA: SelectedPairLayerEndpointContext;
  readonly endpointB: SelectedPairLayerEndpointContext;
  readonly modelUri: string;
  readonly replayClock: ReplayClock;
  readonly selectedPair: V4ResolvedStationPair | null;
  readonly viewer: Viewer;
  readonly onStateChange: (state: SelectedPairOverlayDebugState) => void;
  readonly shouldSkip: () => boolean;
  readonly applyCameraHint: (cameraHint: SceneCameraHint) => void;
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

function resolveSelectedPairSceneDurationMinutes(search: URLSearchParams): number {
  const rawValue = search.get("durationMinutes");
  if (rawValue === null) {
    return M8A_V4_SELECTED_PAIR_SCENE_DEFAULT_DURATION_MINUTES;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return M8A_V4_SELECTED_PAIR_SCENE_DEFAULT_DURATION_MINUTES;
  }
  return clamp(
    Math.round(parsed),
    M8A_V4_SELECTED_PAIR_SCENE_MIN_DURATION_MINUTES,
    M8A_V4_SELECTED_PAIR_SCENE_MAX_DURATION_MINUTES
  );
}

export function resolveSelectedPairSceneTimeWindow(): {
  startUtc: string;
  endUtc: string;
} {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const rawStartUtc = search.get("startUtc");
  const startUtc =
    rawStartUtc && Number.isFinite(Date.parse(rawStartUtc))
      ? new Date(Date.parse(rawStartUtc)).toISOString()
      : new Date().toISOString();
  return buildDefaultTimeWindow(
    startUtc,
    resolveSelectedPairSceneDurationMinutes(search)
  );
}

function positionToCartesian(position: M8aV4GeoPosition): Cartesian3 {
  return Cartesian3.fromDegrees(
    position.lon,
    position.lat,
    position.heightMeters
  );
}

function resolveSelectedPairProjectionDate(
  viewModel: TleFirstSceneViewModel,
  replayState: ReplayClockState,
  time?: JulianDate
): Date {
  const projectionStartMs = Date.parse(viewModel.timeWindow.startUtc);
  const projectionStopMs = Date.parse(viewModel.timeWindow.endUtc);
  const replayRatio = time
    ? resolveReplayWindowRatio({
        ...replayState,
        currentTime: JulianDate.toDate(time).toISOString()
      })
    : resolveReplayWindowRatio(replayState);

  return new Date(
    projectionStartMs + (projectionStopMs - projectionStartMs) * replayRatio
  );
}

function resolveActiveSelectedPairLink(
  viewModel: TleFirstSceneViewModel,
  projectionDate: Date
): SceneActiveLink | null {
  const projectionMs = projectionDate.getTime();
  if (!Number.isFinite(projectionMs)) {
    return null;
  }

  for (const link of viewModel.activeLinks) {
    const fromMs = Date.parse(link.fromUtc);
    const toMs = Date.parse(link.toUtc);
    if (
      Number.isFinite(fromMs) &&
      Number.isFinite(toMs) &&
      fromMs <= projectionMs &&
      projectionMs < toMs
    ) {
      return link;
    }
  }

  return null;
}

function sceneActorOrbitClassToDisplayOrbit(
  actor: SceneActor
): M8aV4OrbitClass {
  switch (actor.orbitClass) {
    case "LEO":
      return "leo";
    case "MEO":
      return "meo";
    case "GEO":
      return "geo";
  }
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

function formatSelectedPairSatelliteLabel(satelliteId: string): string {
  return satelliteId.length > 18 ? `${satelliteId.slice(0, 18)}…` : satelliteId;
}

function resolveSceneActorPointColor(actor: SceneActor): Color {
  if (actor.role === "active") {
    return Color.fromCssColorString("#f7d46a").withAlpha(0.95);
  }
  if (actor.role === "candidate" || actor.role === "continuity") {
    return Color.fromCssColorString("#7ee2b8").withAlpha(0.86);
  }
  return Color.fromCssColorString("#9bc4e8").withAlpha(0.52);
}

function createSelectedPairActorPointStyle(actor: SceneActor): PointGraphics {
  return new PointGraphics({
    pixelSize: new ConstantProperty(actor.role === "active" ? 9 : 6),
    color: new ConstantProperty(resolveSceneActorPointColor(actor)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.95)
    ),
    outlineWidth: new ConstantProperty(actor.role === "active" ? 2 : 1),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createSelectedPairActorGlowStyle(actor: SceneActor): BillboardGraphics {
  const isActive = actor.role === "active";
  return new BillboardGraphics({
    image: new ConstantProperty(
      createActorGlowImageUri(sceneActorOrbitClassToDisplayOrbit(actor))
    ),
    width: new ConstantProperty(isActive ? 34 : 24),
    height: new ConstantProperty(isActive ? 34 : 24),
    color: new ConstantProperty(Color.WHITE.withAlpha(isActive ? 0.72 : 0.38)),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createSelectedPairActorModelStyle(
  modelUri: string,
  actor: SceneActor
): ModelGraphics | undefined {
  if (actor.role !== "active" && actor.role !== "continuity") {
    return undefined;
  }

  const orbitClass = sceneActorOrbitClassToDisplayOrbit(actor);
  return new ModelGraphics({
    uri: new ConstantProperty(modelUri),
    scale: new ConstantProperty(actor.role === "active" ? 1.08 : 0.84),
    minimumPixelSize: new ConstantProperty(
      orbitClass === "geo" ? 42 : orbitClass === "meo" ? 48 : 44
    ),
    maximumScale: new ConstantProperty(150_000)
  });
}

function createSelectedPairActorLabelStyle(
  actor: SceneActor,
  shouldShow: boolean
): LabelGraphics | undefined {
  if (!shouldShow) {
    return undefined;
  }

  return new LabelGraphics({
    text: new ConstantProperty(formatSelectedPairSatelliteLabel(actor.satelliteId)),
    font: "11px sans-serif",
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(Color.WHITE.withAlpha(0.9)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#0b1820").withAlpha(0.58)
    ),
    backgroundPadding: new Cartesian2(6, 3),
    pixelOffset: new Cartesian2(0, -18),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createSelectedPairHandoverCueLabelStyle(
  event: TleFirstSceneViewModel["handoverEvents"][number],
  replayClock: ReplayClock,
  viewModel: TleFirstSceneViewModel
): LabelGraphics {
  return new LabelGraphics({
    show: new CallbackProperty((time) => {
      const projectionDate = resolveSelectedPairProjectionDate(
        viewModel,
        replayClock.getState(),
        time
      );
      const eventMs = Date.parse(event.atUtc);
      const projectionMs = projectionDate.getTime();
      return (
        Number.isFinite(eventMs) &&
        Number.isFinite(projectionMs) &&
        Math.abs(projectionMs - eventMs) <= 120_000
      );
    }, false),
    text: new ConstantProperty(
      event.fromSatelliteId ? "HANDOVER" : "ACQUIRE"
    ),
    font: "700 11px sans-serif",
    scale: 0.92,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(Color.fromCssColorString("#f7d46a")),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.98)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#07131b").withAlpha(0.82)
    ),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset: new Cartesian2(0, -44),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function sceneSampleToCartesian(
  sample: SceneActor["sourceSamples"][number],
  viewModel: TleFirstSceneViewModel,
  result?: Cartesian3
): Cartesian3 {
  const target = result ?? new Cartesian3();
  const sourceX = sample.ecefKm.x * 1000;
  const sourceY = sample.ecefKm.y * 1000;
  const sourceZ = sample.ecefKm.z * 1000;

  if (!viewModel.displayPolicy.altitudeCompressionEnabled) {
    target.x = sourceX;
    target.y = sourceY;
    target.z = sourceZ;
    return target;
  }

  const sourceRadiusMeters = Math.sqrt(
    sourceX * sourceX + sourceY * sourceY + sourceZ * sourceZ
  );
  const earthRadiusMeters = 6_371_000;
  if (!Number.isFinite(sourceRadiusMeters) || sourceRadiusMeters <= 0) {
    target.x = sourceX;
    target.y = sourceY;
    target.z = sourceZ;
    return target;
  }

  const sourceAltitudeMeters = Math.max(sourceRadiusMeters - earthRadiusMeters, 0);
  const displayRadiusMeters =
    earthRadiusMeters +
    sourceAltitudeMeters * viewModel.displayPolicy.altitudeCompressionFactor;
  const scale = displayRadiusMeters / sourceRadiusMeters;
  target.x = sourceX * scale;
  target.y = sourceY * scale;
  target.z = sourceZ * scale;
  return target;
}

function resolveSceneActorRenderPosition(
  actor: SceneActor,
  viewModel: TleFirstSceneViewModel,
  projectionDate: Date,
  result?: Cartesian3
): Cartesian3 | undefined {
  const samples = actor.sourceSamples;
  if (samples.length === 0) {
    return undefined;
  }

  const projectionMs = projectionDate.getTime();
  if (!Number.isFinite(projectionMs)) {
    return sceneSampleToCartesian(samples[0], viewModel, result);
  }

  let previous = samples[0];
  for (let i = 1; i < samples.length; i += 1) {
    const next = samples[i];
    const previousMs = Date.parse(previous.atUtc);
    const nextMs = Date.parse(next.atUtc);
    if (
      Number.isFinite(previousMs) &&
      Number.isFinite(nextMs) &&
      previousMs <= projectionMs &&
      projectionMs <= nextMs
    ) {
      const ratio = clamp((projectionMs - previousMs) / (nextMs - previousMs), 0, 1);
      return sceneSampleToCartesian(
        {
          atUtc: projectionDate.toISOString(),
          ecefKm: {
            x: lerp(previous.ecefKm.x, next.ecefKm.x, ratio),
            y: lerp(previous.ecefKm.y, next.ecefKm.y, ratio),
            z: lerp(previous.ecefKm.z, next.ecefKm.z, ratio)
          }
        },
        viewModel,
        result
      );
    }
    if (Number.isFinite(nextMs) && nextMs <= projectionMs) {
      previous = next;
    }
  }

  return sceneSampleToCartesian(previous, viewModel, result);
}

function resolveSelectedPairActiveActorPosition(
  actorsById: ReadonlyMap<string, SceneActor>,
  viewModel: TleFirstSceneViewModel,
  projectionDate: Date,
  result?: Cartesian3
): Cartesian3 | undefined {
  const activeLink = resolveActiveSelectedPairLink(viewModel, projectionDate);
  if (!activeLink) {
    return undefined;
  }
  const actor = actorsById.get(activeLink.satelliteId);
  if (!actor) {
    return undefined;
  }
  return resolveSceneActorRenderPosition(actor, viewModel, projectionDate, result);
}

function createSelectedPairLinkFlowSegmentPositions(
  actorsById: ReadonlyMap<string, SceneActor>,
  endpointAPosition: Cartesian3,
  endpointBPosition: Cartesian3,
  replayClock: ReplayClock,
  viewModel: TleFirstSceneViewModel,
  direction: M8aV4LinkFlowDirection
): CallbackProperty {
  return new CallbackProperty((time) => {
    const projectionDate = resolveSelectedPairProjectionDate(
      viewModel,
      replayClock.getState(),
      time
    );
    const actorPosition = resolveSelectedPairActiveActorPosition(
      actorsById,
      viewModel,
      projectionDate,
      new Cartesian3()
    );

    if (!actorPosition) {
      return direction === "uplink"
        ? [endpointAPosition, endpointAPosition]
        : [endpointBPosition, endpointBPosition];
    }

    return direction === "uplink"
      ? [endpointAPosition, actorPosition]
      : [actorPosition, endpointBPosition];
  }, false);
}

function resolveSelectedPairLinkFlowEndpoints(
  actorsById: ReadonlyMap<string, SceneActor>,
  endpointAPosition: Cartesian3,
  endpointBPosition: Cartesian3,
  replayClock: ReplayClock,
  viewModel: TleFirstSceneViewModel,
  direction: M8aV4LinkFlowDirection,
  time?: JulianDate
): { start: Cartesian3; stop: Cartesian3 } {
  const projectionDate = resolveSelectedPairProjectionDate(
    viewModel,
    replayClock.getState(),
    time
  );
  const actorPosition = resolveSelectedPairActiveActorPosition(
    actorsById,
    viewModel,
    projectionDate,
    new Cartesian3()
  );
  if (!actorPosition) {
    return direction === "uplink"
      ? { start: endpointAPosition, stop: endpointAPosition }
      : { start: endpointBPosition, stop: endpointBPosition };
  }

  return direction === "uplink"
    ? { start: endpointAPosition, stop: actorPosition }
    : { start: actorPosition, stop: endpointBPosition };
}

function createSelectedPairLinkFlowVisibleProperty(
  replayClock: ReplayClock,
  viewModel: TleFirstSceneViewModel
): CallbackProperty {
  return new CallbackProperty((time) => {
    const projectionDate = resolveSelectedPairProjectionDate(
      viewModel,
      replayClock.getState(),
      time
    );
    return resolveActiveSelectedPairLink(viewModel, projectionDate) !== null;
  }, false);
}

function createSelectedPairLinkFlowPulseRotation(
  actorsById: ReadonlyMap<string, SceneActor>,
  endpointAPosition: Cartesian3,
  endpointBPosition: Cartesian3,
  replayClock: ReplayClock,
  viewModel: TleFirstSceneViewModel,
  direction: M8aV4LinkFlowDirection,
  viewer: Viewer
): CallbackProperty {
  return new CallbackProperty((time) => {
    const { start, stop } = resolveSelectedPairLinkFlowEndpoints(
      actorsById,
      endpointAPosition,
      endpointBPosition,
      replayClock,
      viewModel,
      direction,
      time
    );
    const startWindow = SceneTransforms.worldToWindowCoordinates(
      viewer.scene,
      start,
      new Cartesian2()
    );
    const stopWindow = SceneTransforms.worldToWindowCoordinates(
      viewer.scene,
      stop,
      new Cartesian2()
    );

    if (!startWindow || !stopWindow) {
      return 0;
    }
    const dx = stopWindow.x - startWindow.x;
    const dy = stopWindow.y - startWindow.y;
    return Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001
      ? 0
      : Math.atan2(-dy, dx);
  }, false);
}

function createSelectedPairLinkFlowPulsePosition(
  actorsById: ReadonlyMap<string, SceneActor>,
  endpointAPosition: Cartesian3,
  endpointBPosition: Cartesian3,
  replayClock: ReplayClock,
  viewModel: TleFirstSceneViewModel,
  direction: M8aV4LinkFlowDirection,
  pulseOffset: number
): CallbackPositionProperty {
  return new CallbackPositionProperty((time, result) => {
    const replayState = replayClock.getState();
    const replayRatio = time
      ? resolveReplayWindowRatio({
          ...replayState,
          currentTime: JulianDate.toDate(time).toISOString()
        })
      : resolveReplayWindowRatio(replayState);
    const { start, stop } = resolveSelectedPairLinkFlowEndpoints(
      actorsById,
      endpointAPosition,
      endpointBPosition,
      replayClock,
      viewModel,
      direction,
      time
    );
    const directionOffset = direction === "uplink" ? 0 : 0.11;
    const phase = normalizeUnit(
      replayRatio * M8A_V4_LINK_FLOW_REPLAY_CYCLES +
        pulseOffset +
        directionOffset
    );

    return Cartesian3.lerp(start, stop, phase, result ?? new Cartesian3());
  }, false);
}

function resolveLinkFlowColor(
  direction: M8aV4LinkFlowDirection,
  role: SelectedPairLinkFlowRole
): Color {
  const base = Color.fromCssColorString(direction === "uplink" ? "#f7d46a" : "#60d8ff");
  const alpha =
    role === "displayRepresentative"
      ? direction === "uplink"
        ? 0.94
        : 0.88
      : direction === "uplink"
        ? 0.48
        : 0.42;

  return base.withAlpha(alpha);
}

function resolveLinkFlowWidth(
  role: SelectedPairLinkFlowRole,
  direction: M8aV4LinkFlowDirection
): number {
  if (role === "displayRepresentative") {
    return direction === "uplink" ? 3.6 : 3.25;
  }

  return direction === "uplink" ? 2.25 : 2.05;
}

function createLinkFlowSegmentStyle(
  positions: CallbackProperty,
  direction: M8aV4LinkFlowDirection,
  role: SelectedPairLinkFlowRole
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: new ConstantProperty(resolveLinkFlowWidth(role, direction)),
    material: new PolylineArrowMaterialProperty(
      resolveLinkFlowColor(direction, role)
    ),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function createLinkFlowPulseStyle(
  direction: M8aV4LinkFlowDirection,
  role: SelectedPairLinkFlowRole,
  pulseIndex: number,
  rotation: CallbackProperty
): BillboardGraphics {
  const isPrimary = pulseIndex === 0;
  const dimensions =
    role === "displayRepresentative"
      ? isPrimary
        ? { width: 52, height: 24 }
        : { width: 42, height: 19 }
      : isPrimary
        ? { width: 34, height: 16 }
        : { width: 28, height: 13 };
  const packetColor = direction === "uplink" ? "#f7d46a" : "#60d8ff";
  const opacity =
    role === "displayRepresentative" ? (isPrimary ? 1 : 0.82) : 0.62;
  const text = direction === "uplink" ? "UP" : "DN";
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 42">',
    "<defs>",
    '<filter id="glow" x="-35%" y="-45%" width="170%" height="190%">',
    `<feDropShadow dx="0" dy="0" stdDeviation="3.2" flood-color="${packetColor}" flood-opacity="0.5"/>`,
    "</filter>",
    '<linearGradient id="body" x1="0%" x2="100%" y1="50%" y2="50%">',
    `<stop offset="0" stop-color="${packetColor}" stop-opacity="0.44"/>`,
    `<stop offset="0.55" stop-color="${packetColor}" stop-opacity="0.9"/>`,
    `<stop offset="1" stop-color="#ffffff" stop-opacity="0.96"/>`,
    "</linearGradient>",
    "</defs>",
    `<g opacity="${opacity}">`,
    `<circle cx="10" cy="21" r="2.7" fill="${packetColor}" opacity="0.22"/>`,
    `<circle cx="21" cy="21" r="3.3" fill="${packetColor}" opacity="0.38"/>`,
    `<circle cx="33" cy="21" r="4.1" fill="${packetColor}" opacity="0.58"/>`,
    '<g filter="url(#glow)">',
    '<path d="M38 10 H66 L86 21 L66 32 H38 L48 21 Z" fill="url(#body)" stroke="#06121a" stroke-opacity="0.7" stroke-width="2"/>',
    `<path d="M61 15 L75 21 L61 27" fill="none" stroke="${packetColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    '<path d="M66 15 L80 21 L66 27" fill="none" stroke="#ffffff" stroke-opacity="0.86" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    `<text x="53" y="25" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#06121a" fill-opacity="0.82">${text}</text>`,
    "</g>",
    "</g>",
    "</svg>"
  ].join("");

  return new BillboardGraphics({
    image: new ConstantProperty(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    ),
    width: new ConstantProperty(dimensions.width),
    height: new ConstantProperty(dimensions.height),
    rotation,
    alignedAxis: new ConstantProperty(Cartesian3.ZERO),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createLinkFlowLabelStyle(
  direction: M8aV4LinkFlowDirection
): LabelGraphics {
  return new LabelGraphics({
    text: new ConstantProperty(direction === "uplink" ? "UPLINK" : "DOWNLINK"),
    font: "600 12px sans-serif",
    scale: 0.92,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(resolveLinkFlowColor(direction, "displayRepresentative")),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.98)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#07131b").withAlpha(0.78)
    ),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset:
      direction === "uplink" ? new Cartesian2(0, -26) : new Cartesian2(0, 26),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin:
      direction === "uplink" ? VerticalOrigin.BOTTOM : VerticalOrigin.TOP,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

export async function installSelectedPairTleFirstSceneLayer({
  dataSource,
  endpointA,
  endpointB,
  modelUri,
  replayClock,
  selectedPair,
  viewer,
  onStateChange,
  shouldSkip,
  applyCameraHint
}: InstallSelectedPairTleFirstSceneLayerOptions): Promise<void> {
  if (!selectedPair) {
    onStateChange(createSelectedPairOverlayDebugState("not-requested"));
    return;
  }

  onStateChange(createSelectedPairOverlayDebugState("loading"));
  const sources = await loadDefaultTleSources();
  if (shouldSkip()) {
    return;
  }

  const tleRecords = parseRuntimeTleSources(sources);
  const tleParseStats = buildRuntimeTleSourceParseStats(sources);
  const result = computeRuntimeProjection({
    stationA: selectedPair.stationA,
    stationB: selectedPair.stationB,
    timeWindow: resolveSelectedPairSceneTimeWindow(),
    tleRecords,
    tleParseStats,
    rainRateMmPerHour: 0
  });
  const viewModel = buildTleFirstSceneViewModel({
    result,
    tleRecords,
    sourceMode: "tle-first-runtime"
  });
  const renderableActors = viewModel.actors.filter(
    (actor) => actor.sourceSamples.length > 0
  );
  const sceneDataCompleteness: RuntimeDataCompletenessState = {
    ...result.dataCompleteness,
    actorSourceCoverage: {
      renderedActorCount: renderableActors.length,
      tleBackedActorCount: renderableActors.filter(
        (actor) => actor.sourceClass === "tle-derived"
      ).length,
      fakeActorCount: 0
    },
    actorProvenance: renderableActors.map((actor) => ({
      satelliteId: actor.satelliteId,
      orbitClass: actor.orbitClass,
      sourceId: actor.sourceId,
      propagatedSampleCount: actor.sourceSamples.length,
      sampleCadenceSeconds: viewModel.timeWindow.sampleStepSeconds,
      firstPropagatedUtc: actor.sourceSamples[0]?.atUtc ?? null,
      lastPropagatedUtc:
        actor.sourceSamples.length > 0
          ? actor.sourceSamples[actor.sourceSamples.length - 1].atUtc
          : null,
      visibilityWindowCount: actor.visibilityWindows.length,
      provenance: {
        truthClass: actor.sourceClass,
        sourceId: actor.sourceId
      }
    }))
  };
  if (shouldSkip() || renderableActors.length === 0) {
    if (!shouldSkip()) {
      onStateChange(
        createSelectedPairOverlayDebugState("empty", {
          satelliteCount: renderableActors.length,
          actorCount: viewModel.actors.length,
          sourceMode: viewModel.sourceMode,
          pairGeometry: viewModel.cameraHint.pairGeometry,
          positionSampleCount: viewModel.actors.reduce(
            (total, actor) => total + actor.sourceSamples.length,
            0
          ),
          activeSelectionSampleCount: viewModel.activeLinks.length,
          handoverEventCount: viewModel.handoverEvents.length,
          emptyReasonCode: sceneDataCompleteness.emptyReasonCode,
          dataCompleteness: sceneDataCompleteness
        })
      );
      applyCameraHint(viewModel.cameraHint);
    }
    return;
  }

  const endpointAPosition = positionToCartesian(endpointA.renderMarker.displayPosition);
  const endpointBPosition = positionToCartesian(endpointB.renderMarker.displayPosition);
  const actorsById = new Map(
    renderableActors.map((actor) => [actor.satelliteId, actor])
  );
  const maxLabelCount = viewModel.displayPolicy.maxVisibleActorLabels;

  renderableActors.forEach((actor, index) => {
    const shouldShowLabel =
      index < maxLabelCount ||
      actor.role === "active" ||
      actor.role === "candidate" ||
      actor.role === "continuity";
    dataSource.entities.add({
      id: `m8a-v4-selected-pair-satellite-${actor.satelliteId}`,
      name: `Selected pair ${actor.orbitClass} ${actor.satelliteId}`,
      position: new CallbackPositionProperty((time, positionResult) => {
        const projectionDate = resolveSelectedPairProjectionDate(
          viewModel,
          replayClock.getState(),
          time
        );
        return (
          resolveSceneActorRenderPosition(
            actor,
            viewModel,
            projectionDate,
            positionResult
          ) ?? endpointAPosition
        );
      }, false),
      billboard: createSelectedPairActorGlowStyle(actor),
      point: createSelectedPairActorPointStyle(actor),
      model: createSelectedPairActorModelStyle(modelUri, actor),
      label: createSelectedPairActorLabelStyle(actor, shouldShowLabel),
      description: new ConstantProperty(
        `${actor.satelliteId}; ${actor.sourceClass} actor rendered with ${actor.displayTransform?.transformClass ?? "source"} transform.`
      )
    });
  });

  if (viewModel.activeLinks.length > 0) {
    dataSource.entities.add({
      id: "m8a-v4-selected-pair-runtime-link",
      name: "Selected pair runtime link overlay",
      polyline: new PolylineGraphics({
        show: new CallbackProperty((time) => {
          const projectionDate = resolveSelectedPairProjectionDate(
            viewModel,
            replayClock.getState(),
            time
          );
          return resolveActiveSelectedPairLink(viewModel, projectionDate) !== null;
        }, false),
        positions: new CallbackProperty((time) => {
          const projectionDate = resolveSelectedPairProjectionDate(
            viewModel,
            replayClock.getState(),
            time
          );
          const activeLink = resolveActiveSelectedPairLink(viewModel, projectionDate);
          if (!activeLink) {
            return [];
          }
          const actor = actorsById.get(activeLink.satelliteId);
          const actorPosition = actor
            ? resolveSceneActorRenderPosition(actor, viewModel, projectionDate)
            : undefined;
          if (!actorPosition) {
            return [];
          }
          return [endpointAPosition, actorPosition, endpointBPosition];
        }, false),
        width: new ConstantProperty(1.8),
        material: new ColorMaterialProperty(
          Color.fromCssColorString("#7ee2b8").withAlpha(0.32)
        ),
        arcType: ArcType.NONE
      }),
      description: new ConstantProperty(
        "Selected-pair runtime link overlay; active only inside the scene view-model link windows."
      )
    });

    for (const direction of M8A_V4_LINK_FLOW_DIRECTIONS) {
      const segment = createLinkFlowSegmentStyle(
        createSelectedPairLinkFlowSegmentPositions(
          actorsById,
          endpointAPosition,
          endpointBPosition,
          replayClock,
          viewModel,
          direction
        ),
        direction,
        "displayRepresentative"
      );
      segment.show = createSelectedPairLinkFlowVisibleProperty(
        replayClock,
        viewModel
      );
      dataSource.entities.add({
        id: `m8a-v4-selected-pair-link-flow-${direction}-segment`,
        name: `Selected pair ${direction} flow segment`,
        polyline: segment,
        description: new ConstantProperty(
          `Selected-pair ${direction} flow cue driven by the scene view-model active link.`
        )
      });

      for (const [pulseIndex, pulseOffset] of M8A_V4_LINK_FLOW_PULSE_OFFSETS.entries()) {
        const billboard = createLinkFlowPulseStyle(
          direction,
          "displayRepresentative",
          pulseIndex,
          createSelectedPairLinkFlowPulseRotation(
            actorsById,
            endpointAPosition,
            endpointBPosition,
            replayClock,
            viewModel,
            direction,
            viewer
          )
        );
        billboard.show = createSelectedPairLinkFlowVisibleProperty(
          replayClock,
          viewModel
        );
        const label =
          pulseIndex === 0 ? createLinkFlowLabelStyle(direction) : undefined;
        if (label) {
          label.show = createSelectedPairLinkFlowVisibleProperty(
            replayClock,
            viewModel
          );
        }
        dataSource.entities.add({
          id: `m8a-v4-selected-pair-link-flow-${direction}-pulse-${pulseIndex}`,
          name: `Selected pair ${direction} flow pulse ${pulseIndex + 1}`,
          position: createSelectedPairLinkFlowPulsePosition(
            actorsById,
            endpointAPosition,
            endpointBPosition,
            replayClock,
            viewModel,
            direction,
            pulseOffset
          ),
          billboard,
          label,
          description: new ConstantProperty(
            `Selected-pair moving ${direction} pulse; display cue only.`
          )
        });
      }
    }
  }

  const renderableEventCues = viewModel.handoverEvents.filter((event) =>
    actorsById.has(event.toSatelliteId)
  );
  for (const [index, event] of renderableEventCues.entries()) {
    const actor = actorsById.get(event.toSatelliteId);
    if (!actor) {
      continue;
    }
    dataSource.entities.add({
      id: `m8a-v4-selected-pair-handover-cue-${index}`,
      name: `Selected pair event cue ${index + 1}`,
      position: new CallbackPositionProperty((time, positionResult) => {
        const projectionDate = resolveSelectedPairProjectionDate(
          viewModel,
          replayClock.getState(),
          time
        );
        return (
          resolveSceneActorRenderPosition(
            actor,
            viewModel,
            projectionDate,
            positionResult
          ) ?? endpointAPosition
        );
      }, false),
      label: createSelectedPairHandoverCueLabelStyle(event, replayClock, viewModel),
      description: new ConstantProperty(
        `Selected-pair event cue for ${event.toSatelliteId}; driven by scene handover events.`
      )
    });
  }

  onStateChange(
    createSelectedPairOverlayDebugState("ready", {
      satelliteCount: viewModel.actors.length,
      actorCount: viewModel.actors.length,
      runtimeLinkVisible: viewModel.activeLinks.length > 0,
      positionSampleCount: viewModel.actors.reduce(
        (total, actor) => total + actor.sourceSamples.length,
        0
      ),
      activeSelectionSampleCount: viewModel.activeLinks.length,
      handoverEventCount: viewModel.handoverEvents.length,
      linkFlowCueCount:
        viewModel.activeLinks.length > 0
          ? M8A_V4_LINK_FLOW_DIRECTIONS.length *
            (M8A_V4_LINK_FLOW_PULSE_OFFSETS.length + 1)
          : 0,
      eventCueCount: renderableEventCues.length,
      sourceMode: viewModel.sourceMode,
      pairGeometry: viewModel.cameraHint.pairGeometry,
      emptyReasonCode: sceneDataCompleteness.emptyReasonCode,
      dataCompleteness: sceneDataCompleteness
    })
  );

  applyCameraHint(viewModel.cameraHint);
  viewer.scene.requestRender();
}
