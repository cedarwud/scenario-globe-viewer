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
const M8A_V4_SELECTED_PAIR_ENDPOINT_RADIUS_METERS = 90_000;
const M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX = 560;

export interface SceneEndpointContext {
  endpoints: ReadonlyArray<EndpointRenderContext>;
  selectedPair: V4ResolvedStationPair | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

export function applyV4Camera(
  viewer: Viewer,
  sceneEndpointContext: SceneEndpointContext
): void {
  viewer.camera.cancelFlight();

  if (sceneEndpointContext.selectedPair && sceneEndpointContext.endpoints.length === 2) {
    const [endpointA, endpointB] = sceneEndpointContext.endpoints;
    const endpointAPosition = endpointA.renderMarker.displayPosition;
    const endpointBPosition = endpointB.renderMarker.displayPosition;
    const west = Math.min(endpointAPosition.lon, endpointBPosition.lon);
    const east = Math.max(endpointAPosition.lon, endpointBPosition.lon);
    const south = Math.min(endpointAPosition.lat, endpointBPosition.lat);
    const north = Math.max(endpointAPosition.lat, endpointBPosition.lat);
    const pairCenterLon = (west + east) / 2;
    const pairCenterLat = (south + north) / 2;

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        pairCenterLon,
        clamp(pairCenterLat, -82, 82),
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
    return;
  }

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
  let lonA = endpointAPosition.lon;
  let lonB = endpointBPosition.lon;
  if (Math.abs(lonA - lonB) > 180) {
    if (lonA < lonB) {
      lonA += 360;
    } else {
      lonB += 360;
    }
  }

  const midpointLon = ((lonA + lonB) / 2 + 540) % 360 - 180;
  const midpointLat = (endpointAPosition.lat + endpointBPosition.lat) / 2;
  const isPolarLike =
    cameraHint.pairGeometry === "polar" ||
    cameraHint.pairGeometry === "antipodal" ||
    cameraHint.pairGeometry === "empty-result";
  const targetLat = isPolarLike
    ? clamp(
        Math.max(Math.abs(endpointAPosition.lat), Math.abs(endpointBPosition.lat)) >= 66
          ? Math.sign(endpointAPosition.lat + endpointBPosition.lat || endpointAPosition.lat || 1) *
              64
          : midpointLat,
        -74,
        74
      )
    : clamp(midpointLat, -82, 82);

  viewer.camera.cancelFlight();
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      midpointLon,
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
