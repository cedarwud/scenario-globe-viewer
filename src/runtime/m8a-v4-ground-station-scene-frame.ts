import {
  Cartesian3,
  Math as CesiumMath,
  type Viewer
} from "cesium";

import type { ReplayClock } from "../features/time";
import {
  resolveV4RouteSelection,
  type V4ResolvedStationPair
} from "../features/multi-station-selector/v4-route-selection";
import type { SceneCameraHint } from "../features/multi-station-selector/tle-first-scene-view-model";
import {
  M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH,
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  M8A_V4_GROUND_STATION_SCENARIO_ID
} from "./m8a-v4-ground-station-projection";
import {
  type EndpointRenderContext,
  type EndpointRenderRole
} from "./m8a-v4-ground-station-cesium-entities";
import { resolveSelectedPairSceneTimeWindow } from "./m8a-v4-ground-station-selected-pair-layer";
import { M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE } from "./m8a-v4-ground-station-state-builders";

const M8A_V4_CAMERA_LONGITUDE = 114;
const M8A_V4_CAMERA_LATITUDE = -44;
const M8A_V4_CAMERA_HEIGHT_METERS = 11_500_000;
const M8A_V4_CAMERA_HEADING_DEGREES = 0;
const M8A_V4_CAMERA_PITCH_DEGREES = -80;
const M8A_V4_CAMERA_SCREEN_UP_PAN_METERS = 4_000_000;
const M8A_V4_SELECTED_PAIR_CAMERA_LATITUDE_OFFSET_DEGREES = 66;
const M8A_V4_SELECTED_PAIR_SCREEN_UP_PAN_METERS = 5_500_000;
const M8A_V4_SELECTED_PAIR_SHORT_BASELINE_SCREEN_UP_PAN_METERS = 6_100_000;
const M8A_V4_EMPTY_RESULT_SCREEN_UP_PAN_METERS = 3_000_000;
const M8A_V4_SELECTED_PAIR_ENDPOINT_RADIUS_METERS = 90_000;
const M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX = 560;

function isCanonicalWalkthroughPair(stationAId: string, stationBId: string): boolean {
  const ids = [stationAId, stationBId].sort();
  const canonicalPairs = [
    ["ksat-svalsat-svalbard", "ksat-tromso"],
    ["ksat-svalsat-svalbard", "ksat-trollsat-antarctica"],
    ["intelsat-fuchsstadt", "intelsat-atlanta"],
    ["singtel-bukit-timah", "measat-cyberjaya"],
    ["cht-yangmingshan", "sansa-hartebeesthoek"]
  ];
  return canonicalPairs.some(
    ([a, b]) => ids[0] === a && ids[1] === b
  );
}

export interface SceneEndpointContext {
  endpoints: ReadonlyArray<EndpointRenderContext>;
  selectedPair: V4ResolvedStationPair | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

function resolveEndpointMidpoint(
  endpointAPosition: EndpointRenderContext["renderMarker"]["displayPosition"],
  endpointBPosition: EndpointRenderContext["renderMarker"]["displayPosition"]
): { readonly lat: number; readonly lon: number } {
  let lonA = endpointAPosition.lon;
  let lonB = endpointBPosition.lon;
  if (Math.abs(lonA - lonB) > 180) {
    if (lonA < lonB) {
      lonA += 360;
    } else {
      lonB += 360;
    }
  }

  return {
    lat: (endpointAPosition.lat + endpointBPosition.lat) / 2,
    lon: normalizeLongitude((lonA + lonB) / 2)
  };
}

function resolveSelectedPairDemoCameraLatitude(pairCenterLat: number): number {
  return clamp(
    pairCenterLat - M8A_V4_SELECTED_PAIR_CAMERA_LATITUDE_OFFSET_DEGREES,
    -82,
    82
  );
}

function resolveEndpointDistanceDegrees(
  endpointAPosition: EndpointRenderContext["renderMarker"]["displayPosition"],
  endpointBPosition: EndpointRenderContext["renderMarker"]["displayPosition"]
): number {
  const latA = CesiumMath.toRadians(endpointAPosition.lat);
  const latB = CesiumMath.toRadians(endpointBPosition.lat);
  const deltaLat = latB - latA;
  const deltaLon = CesiumMath.toRadians(endpointBPosition.lon - endpointAPosition.lon);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return CesiumMath.toDegrees(2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function resolveInitialSelectedPairScreenUpPanMeters(
  endpointAPosition: EndpointRenderContext["renderMarker"]["displayPosition"],
  endpointBPosition: EndpointRenderContext["renderMarker"]["displayPosition"]
): number {
  const isPolarPair =
    Math.max(Math.abs(endpointAPosition.lat), Math.abs(endpointBPosition.lat)) >= 66;
  if (isPolarPair) {
    return M8A_V4_SELECTED_PAIR_SCREEN_UP_PAN_METERS;
  }
  return resolveEndpointDistanceDegrees(endpointAPosition, endpointBPosition) < 35
    ? M8A_V4_SELECTED_PAIR_SHORT_BASELINE_SCREEN_UP_PAN_METERS
    : M8A_V4_SELECTED_PAIR_SCREEN_UP_PAN_METERS;
}

function resolveSelectedPairScreenUpPanMeters(
  pairGeometry: SceneCameraHint["pairGeometry"]
): number {
  if (pairGeometry === "empty-result") {
    return M8A_V4_EMPTY_RESULT_SCREEN_UP_PAN_METERS;
  }
  if (pairGeometry === "short-baseline") {
    return M8A_V4_SELECTED_PAIR_SHORT_BASELINE_SCREEN_UP_PAN_METERS;
  }
  return M8A_V4_SELECTED_PAIR_SCREEN_UP_PAN_METERS;
}

function applyDemoOrbitCamera(
  viewer: Viewer,
  camera: {
    readonly lon: number;
    readonly lat: number;
    readonly heightMeters?: number;
    readonly screenUpPanMeters?: number;
    readonly pitchDeg?: number;
    readonly headingDeg?: number;
  }
): void {
  const heightMeters = camera.heightMeters ?? M8A_V4_CAMERA_HEIGHT_METERS;
  const panMeters =
    camera.screenUpPanMeters ??
    M8A_V4_CAMERA_SCREEN_UP_PAN_METERS *
      Math.min(heightMeters / M8A_V4_CAMERA_HEIGHT_METERS, 1);
  const pitchDeg = camera.pitchDeg ?? M8A_V4_CAMERA_PITCH_DEGREES;
  const headingDeg = camera.headingDeg ?? M8A_V4_CAMERA_HEADING_DEGREES;

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      camera.lon,
      clamp(camera.lat, -82, 82),
      heightMeters
    ),
    orientation: {
      heading: CesiumMath.toRadians(headingDeg),
      pitch: CesiumMath.toRadians(pitchDeg),
      roll: 0
    }
  });
  viewer.camera.moveUp(panMeters);
  viewer.scene.requestRender();
}

export function isM8aV4GroundStationRuntimeRequested(
  search: URLSearchParams
): boolean {
  if (
    search.get(M8A_V4_GROUND_STATION_QUERY_PARAM) ===
    M8A_V4_GROUND_STATION_QUERY_VALUE
  ) {
    return true;
  }
  if (search.get("firstIntakeScenarioId") === M8A_V4_GROUND_STATION_SCENARIO_ID) {
    return true;
  }
  return Boolean(resolveV4RouteSelection(search).resolvedPair);
}

function resolveSelectedPairFromLocation(): V4ResolvedStationPair | null {
  if (typeof window === "undefined") {
    return null;
  }
  return resolveV4RouteSelection(new URLSearchParams(window.location.search))
    .resolvedPair;
}

export function createSelectedPairEndpointContext(
  station: V4ResolvedStationPair["stationA"],
  endpointRole: EndpointRenderRole
): EndpointRenderContext {
  const roleLabel = endpointRole === "endpoint-a" ? "A" : "B";
  const precisionBadge = station.disclosurePrecision || "public registry coordinate";

  return {
    endpointId: `selected-${endpointRole}-${station.id}`,
    endpointRole,
    endpointLabel: `${station.country} / ${station.name}`,
    sourceCoordinatesRenderable: true,
    coordinatePrecision: {
      renderPrecision: precisionBadge
    },
    renderMarker: {
      markerId: `selected-${endpointRole}-${station.id}`,
      displayPosition: {
        lat: station.lat,
        lon: station.lon,
        heightMeters: 0
      },
      displayRadiusMeters: M8A_V4_SELECTED_PAIR_ENDPOINT_RADIUS_METERS,
      label: `${roleLabel}: ${station.name}`,
      requiredPrecisionBadge: precisionBadge,
      displayPositionIsSourceTruth: true
    },
    orbitEvidenceChips: station.supportedOrbits.map((orbitClass) => ({
      chipLabel: `${orbitClass} public`
    }))
  };
}

export function buildSceneEndpointContext(): SceneEndpointContext {
  const selectedPair = resolveSelectedPairFromLocation();

  if (!selectedPair) {
    return {
      endpoints: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints,
      selectedPair: null
    };
  }

  return {
    endpoints: [
      createSelectedPairEndpointContext(selectedPair.stationA, "endpoint-a"),
      createSelectedPairEndpointContext(selectedPair.stationB, "endpoint-b")
    ],
    selectedPair
  };
}

export function resolveModelUri(): string {
  const publicBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(
    M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH,
    publicBaseUrl
  ).toString();
}

export function configureReplayClock(
  viewer: Viewer,
  replayClock: ReplayClock
): void {
  const startMs = Date.parse(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.projectionEpochUtc
  );
  if (!Number.isFinite(startMs)) {
    throw new Error("Invalid m8aV4GroundStation.projectionEpochUtc timestamp");
  }
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

export function configureSelectedPairReplayClock(
  viewer: Viewer,
  replayClock: ReplayClock
): void {
  const windowRange = resolveSelectedPairSceneTimeWindow();
  replayClock.setMode("prerecorded", {
    start: windowRange.startUtc,
    stop: windowRange.endUtc
  });
  replayClock.seek(windowRange.startUtc);
  replayClock.setMultiplier(
    M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.playbackMultiplier
  );
  replayClock.play();
  viewer.timeline?.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
}

interface CameraScales {
  readonly heightScale: number;
  readonly panScale: number;
}

function calculateCameraScales(): CameraScales {
  if (typeof window === "undefined") {
    return { heightScale: 1.0, panScale: 1.0 };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  // 1. Aspect ratio scaling (primarily for narrow screen width constraint)
  let aspectScale = 1.0;
  if (aspect > 1.6) {
    aspectScale = Math.min(aspect / 1.6, 2.0);
  } else if (aspect < 1.1) {
    aspectScale = 1.1 / aspect;
  }

  // 2. Height scaling (primarily for vertical screen height constraint to avoid UI overlays)
  // We use a reference height of 1200px to ensure plenty of room for timeline overlays
  // even on standard 900px/1080px screens.
  let verticalScale = 1.0;
  if (height < 1200) {
    verticalScale = Math.min(1200 / height, 2.5);
  }

  const heightScale = Math.max(aspectScale, verticalScale);

  // 3. Pan scaling (to avoid pushing Earth behind timeline/controls when height is small)
  let panScale = 1.0;
  if (height < 1200) {
    panScale = Math.max(0.1, (height / 1200) ** 2);
  } else {
    panScale = aspectScale;
  }

  return { heightScale, panScale };
}


export function applyV4Camera(
  viewer: Viewer,
  sceneEndpointContext: SceneEndpointContext
): void {
  viewer.camera.cancelFlight();

  if (sceneEndpointContext.selectedPair && sceneEndpointContext.endpoints.length === 2) {
    const [endpointA, endpointB] = sceneEndpointContext.endpoints;
    const endpointAPosition = endpointA.renderMarker.displayPosition;
    const endpointBPosition = endpointB.renderMarker.displayPosition;
    const pairCenter = resolveEndpointMidpoint(endpointAPosition, endpointBPosition);

    const { stationA, stationB } = sceneEndpointContext.selectedPair;
    const isWalkthrough = isCanonicalWalkthroughPair(stationA.id, stationB.id);
    const distanceDeg = resolveEndpointDistanceDegrees(endpointAPosition, endpointBPosition);
    const pairSupportsGeo = !isWalkthrough &&
      distanceDeg < 75 &&
      (stationA.supportedOrbits.includes("GEO") || stationB.supportedOrbits.includes("GEO"));

    if (pairSupportsGeo) {
      // GEO satellites are rendered at ~6,000 km display altitude (not real
      // 35,786 km). The default camera height (11.5 Mm) is sufficient. Use a
      // smaller latitude offset so the camera stays closer to the stations.
      //
      // If the stations are in the Northern hemisphere (pairCenter.lat >= 0),
      // the equator (and GEO satellites) is South of them. Placing the camera
      // North of the midpoint and looking South (heading 180°) positions the
      // GEO satellites in the upper background sky rather than blocked at the bottom.
      // For Southern hemisphere stations, the inverse applies.
      const geoLatitudeOffset = 25;
      const isNorthern = pairCenter.lat >= 0;
      const geoCameraLat = isNorthern
        ? clamp(pairCenter.lat + geoLatitudeOffset, -82, 82)
        : clamp(pairCenter.lat - geoLatitudeOffset, -82, 82);

      const { heightScale, panScale } = calculateCameraScales();

      applyDemoOrbitCamera(viewer, {
        lon: pairCenter.lon,
        lat: geoCameraLat,
        heightMeters: 13_000_000 * heightScale,
        screenUpPanMeters: 1_000_000 * panScale,
        pitchDeg: -72,
        headingDeg: isNorthern ? 180 : 0
      });
      return;
    }

    const { heightScale, panScale } = calculateCameraScales();

    applyDemoOrbitCamera(viewer, {
      lon: pairCenter.lon,
      lat: resolveSelectedPairDemoCameraLatitude(pairCenter.lat),
      heightMeters: M8A_V4_CAMERA_HEIGHT_METERS * heightScale,
      screenUpPanMeters: resolveInitialSelectedPairScreenUpPanMeters(
        endpointAPosition,
        endpointBPosition
      ) * panScale,
      pitchDeg: M8A_V4_CAMERA_PITCH_DEGREES
    });
    return;
  }

  applyDemoOrbitCamera(viewer, {
    lon: M8A_V4_CAMERA_LONGITUDE,
    lat: M8A_V4_CAMERA_LATITUDE
  });
}

export function applySelectedPairCameraHint(
  viewer: Viewer,
  sceneEndpointContext: SceneEndpointContext,
  cameraHint: SceneCameraHint
): void {
  if (!sceneEndpointContext.selectedPair || sceneEndpointContext.endpoints.length !== 2) {
    return;
  }

  const [endpointA, endpointB] = sceneEndpointContext.endpoints;
  const endpointAPosition = endpointA.renderMarker.displayPosition;
  const endpointBPosition = endpointB.renderMarker.displayPosition;
  const midpoint = resolveEndpointMidpoint(endpointAPosition, endpointBPosition);
  const usesWideHintCamera =
    cameraHint.pairGeometry === "antipodal";

  viewer.camera.cancelFlight();

  if (!usesWideHintCamera) {
    const { stationA, stationB } = sceneEndpointContext.selectedPair!;
    const isWalkthrough = isCanonicalWalkthroughPair(stationA.id, stationB.id);
    const distanceDeg = resolveEndpointDistanceDegrees(endpointAPosition, endpointBPosition);
    const pairSupportsGeo = !isWalkthrough &&
      distanceDeg < 75 &&
      (stationA.supportedOrbits.includes("GEO") || stationB.supportedOrbits.includes("GEO"));

    if (pairSupportsGeo) {
      const geoLatitudeOffset = 25;
      const isNorthern = midpoint.lat >= 0;
      const geoCameraLat = isNorthern
        ? clamp(midpoint.lat + geoLatitudeOffset, -82, 82)
        : clamp(midpoint.lat - geoLatitudeOffset, -82, 82);

      const { heightScale, panScale } = calculateCameraScales();

      applyDemoOrbitCamera(viewer, {
        lon: midpoint.lon,
        lat: geoCameraLat,
        heightMeters: Math.max(13_000_000, cameraHint.suggestedAltitudeKm * 1000) * heightScale,
        screenUpPanMeters: 1_000_000 * panScale,
        pitchDeg: -72,
        headingDeg: isNorthern ? 180 : 0
      });
      return;
    }

    const { heightScale, panScale } = calculateCameraScales();

    applyDemoOrbitCamera(viewer, {
      lon: midpoint.lon,
      lat: resolveSelectedPairDemoCameraLatitude(midpoint.lat),
      heightMeters: Math.max(M8A_V4_CAMERA_HEIGHT_METERS, cameraHint.suggestedAltitudeKm * 1000) * heightScale,
      screenUpPanMeters: resolveSelectedPairScreenUpPanMeters(cameraHint.pairGeometry) * panScale,
      pitchDeg: M8A_V4_CAMERA_PITCH_DEGREES
    });
    return;
  }

  const targetLat = clamp(
    Math.max(Math.abs(endpointAPosition.lat), Math.abs(endpointBPosition.lat)) >= 66
      ? Math.sign(endpointAPosition.lat + endpointBPosition.lat || endpointAPosition.lat || 1) *
          64
      : midpoint.lat,
    -74,
    74
  );

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      midpoint.lon,
      targetLat,
      cameraHint.suggestedAltitudeKm * 1000
    ),
    orientation: {
      heading: CesiumMath.toRadians(cameraHint.suggestedHeadingDeg),
      pitch: CesiumMath.toRadians(cameraHint.suggestedPitchDeg),
      roll: 0
    }
  });
  viewer.scene.requestRender();
}

export function resolveViewportClass(): "desktop" | "narrow" {
  return typeof window !== "undefined" &&
    window.innerWidth <= M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX
    ? "narrow"
    : "desktop";
}
