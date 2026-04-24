import {
  BoundingSphere,
  Cartesian3,
  Cartographic,
  HeadingPitchRange,
  Math as CesiumMath,
  type Viewer
} from "cesium";

import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type {
  FirstIntakeMobileEndpointTrajectoryController
} from "./first-intake-mobile-endpoint-trajectory-controller";
import type {
  FirstIntakeNearbySecondEndpointController
} from "./first-intake-nearby-second-endpoint-controller";
import type {
  FirstIntakeNearbySecondEndpointExpressionController
} from "./first-intake-nearby-second-endpoint-expression-controller";

const FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_TELEMETRY_KEYS = [
  "firstIntakeCameraPresetState",
  "firstIntakeCameraPresetScenarioId",
  "firstIntakeCameraPresetKey",
  "firstIntakeCameraPresetAffordanceMounted",
  "firstIntakeCameraPresetAffordancePlacement",
  "firstIntakeCameraPresetSelectionModel",
  "firstIntakeCameraPresetActivationState",
  "firstIntakeCameraPresetActivationCount",
  "firstIntakeCameraPresetFitStrategy",
  "firstIntakeCameraPresetMobileEndpointId",
  "firstIntakeCameraPresetFixedEndpointId",
  "firstIntakeCameraPresetRelationCueKind",
  "firstIntakeCameraPresetTrajectoryWaypointCount",
  "firstIntakeCameraPresetBoundsWest",
  "firstIntakeCameraPresetBoundsSouth",
  "firstIntakeCameraPresetBoundsEast",
  "firstIntakeCameraPresetBoundsNorth",
  "firstIntakeCameraPresetTargetLat",
  "firstIntakeCameraPresetTargetLon",
  "firstIntakeCameraPresetRangeMeters",
  "firstIntakeCameraPresetHeadingDegrees",
  "firstIntakeCameraPresetPitchDegrees",
  "firstIntakeCameraPresetRawPackageSideReadOwnership",
  "firstIntakeCameraPresetProofSeam"
] as const;

export const FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_KEY =
  "endpoint-relation-cinematic";
export const FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_RUNTIME_STATE =
  "active-addressed-route-camera-preset";
export const FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeCinematicCameraPreset";

const AFFORDANCE_PLACEMENT = "cesium-top-right-toolbar";
const CINEMATIC_PITCH_DEGREES = -52;
const MINIMUM_CAMERA_RANGE_METERS = 18_000;
const CAMERA_RANGE_SCALAR = 3.4;

interface CoordinateDegrees {
  lat: number;
  lon: number;
}

interface TargetCoordinateDegrees extends CoordinateDegrees {
  heightMeters: number;
}

interface BoundsDegrees {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface CinematicViewFrame {
  boundingSphere: BoundingSphere;
  boundsDegrees: BoundsDegrees;
  targetCoordinates: TargetCoordinateDegrees;
  headingDegrees: number;
  pitchDegrees: typeof CINEMATIC_PITCH_DEGREES;
  rangeMeters: number;
}

export interface FirstIntakeCinematicCameraPresetState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  presetState: typeof FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_RUNTIME_STATE;
  presetKey: typeof FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_KEY;
  affordance: {
    mounted: boolean;
    placement: typeof AFFORDANCE_PLACEMENT;
    controlKind: "single-button";
    exposesSelector: false;
    exposesCatalog: false;
    exposesGlobalEndpointNavigation: false;
  };
  selectionModel: "single-bounded-preset";
  activation: {
    active: boolean;
    activationCount: number;
    lastActivatedAtUtc?: string;
  };
  fit: {
    strategy: "stable-bounding-accepted-scene-extent";
    boundsDegrees: BoundsDegrees;
    targetCoordinates: CoordinateDegrees;
    targetHeightMeters: number;
    headingDegrees: number;
    pitchDegrees: typeof CINEMATIC_PITCH_DEGREES;
    rangeMeters: number;
  };
  includedSceneObjects: {
    mobileEndpointId: string;
    fixedEndpointId: string;
    relationCueKind: "moving-mobile-to-fixed-nearby-endpoint";
    trajectoryWaypointCount: number;
  };
  proofSeam: typeof FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_PROOF_SEAM;
  sourceLineage: {
    trajectoryRead: "trajectoryController.getState().trajectory.trajectory.points";
    nearbySecondEndpointRead: "nearbySecondEndpointController.getState().endpoint";
    relationCueRead: "expressionController.getState().animation.relationCueMode";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeCinematicCameraPresetController {
  getState(): FirstIntakeCinematicCameraPresetState;
  activatePreset(): void;
  dispose(): void;
}

export interface FirstIntakeCinematicCameraPresetControllerOptions {
  viewer: Viewer;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  trajectoryController: FirstIntakeMobileEndpointTrajectoryController;
  nearbySecondEndpointController: FirstIntakeNearbySecondEndpointController;
  expressionController: FirstIntakeNearbySecondEndpointExpressionController;
}

const CINEMATIC_PRESET_ICON = `
<span class="viewer-cinematic-preset-mark" aria-hidden="true">
  <svg class="viewer-cinematic-preset-icon" viewBox="0 0 32 32">
    <path d="M7 20.5 15.5 12l4.25 4.25L25.5 10.5" />
    <path d="M21.75 10.5h3.75v3.75" />
    <path d="M7.5 22.5h17" />
    <path d="M10 18.25a2.25 2.25 0 1 0 0.01 0" />
    <path d="M22 12.25a2.25 2.25 0 1 0 0.01 0" />
  </svg>
  <span class="viewer-cinematic-preset-label">2PT</span>
</span>
`;

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must resolve to a finite number.`);
  }
}

function cloneBounds(bounds: BoundsDegrees): BoundsDegrees {
  return {
    west: bounds.west,
    south: bounds.south,
    east: bounds.east,
    north: bounds.north
  };
}

function cloneCoordinate(coordinate: CoordinateDegrees): CoordinateDegrees {
  return {
    lat: coordinate.lat,
    lon: coordinate.lon
  };
}

function cloneTargetCoordinate(
  coordinate: TargetCoordinateDegrees
): TargetCoordinateDegrees {
  return {
    lat: coordinate.lat,
    lon: coordinate.lon,
    heightMeters: coordinate.heightMeters
  };
}

function cloneState(
  state: FirstIntakeCinematicCameraPresetState
): FirstIntakeCinematicCameraPresetState {
  return {
    ...state,
    affordance: {
      ...state.affordance
    },
    activation: {
      ...state.activation
    },
    fit: {
      ...state.fit,
      boundsDegrees: cloneBounds(state.fit.boundsDegrees),
      targetCoordinates: cloneCoordinate(state.fit.targetCoordinates),
      targetHeightMeters: state.fit.targetHeightMeters
    },
    includedSceneObjects: {
      ...state.includedSceneObjects
    },
    sourceLineage: {
      ...state.sourceLineage
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(value: number): number {
  const normalized = ((((value + 180) % 360) + 360) % 360) - 180;

  return Object.is(normalized, -0) ? 0 : normalized;
}

function resolvePaddedBounds(coordinates: ReadonlyArray<CoordinateDegrees>): BoundsDegrees {
  if (coordinates.length === 0) {
    throw new Error("R1V.4 camera preset requires scene coordinates.");
  }

  const lats = coordinates.map((coordinate) => coordinate.lat);
  const lons = coordinates.map((coordinate) => coordinate.lon);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const latSpan = Math.max(north - south, 0.01);
  const lonSpan = Math.max(east - west, 0.01);
  const latPadding = Math.max(latSpan * 0.22, 0.04);
  const lonPadding = Math.max(lonSpan * 0.22, 0.04);

  return {
    west: normalizeLongitude(clamp(west - lonPadding, -180, 180)),
    south: clamp(south - latPadding, -90, 90),
    east: normalizeLongitude(clamp(east + lonPadding, -180, 180)),
    north: clamp(north + latPadding, -90, 90)
  };
}

function resolveInitialBearingDegrees(
  start: CoordinateDegrees,
  end: CoordinateDegrees
): number {
  const startLat = CesiumMath.toRadians(start.lat);
  const endLat = CesiumMath.toRadians(end.lat);
  const deltaLon = CesiumMath.toRadians(end.lon - start.lon);
  const y = Math.sin(deltaLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLon);

  return (CesiumMath.toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function resolveCameraHeadingDegrees(
  trajectoryCoordinates: ReadonlyArray<CoordinateDegrees>,
  fixedEndpointCoordinates: CoordinateDegrees
): number {
  const firstTrajectoryPoint = trajectoryCoordinates[0] ?? fixedEndpointCoordinates;
  const lastTrajectoryPoint =
    trajectoryCoordinates[trajectoryCoordinates.length - 1] ??
    fixedEndpointCoordinates;
  const corridorBearing = resolveInitialBearingDegrees(
    firstTrajectoryPoint,
    lastTrajectoryPoint
  );

  return (corridorBearing + 205) % 360;
}

function toCartesian(coordinate: CoordinateDegrees): Cartesian3 {
  assertFiniteNumber(coordinate.lat, "coordinate.lat");
  assertFiniteNumber(coordinate.lon, "coordinate.lon");

  return Cartesian3.fromDegrees(coordinate.lon, coordinate.lat, 0);
}

function toCoordinate(cartesian: Cartesian3): TargetCoordinateDegrees {
  const cartographic = Cartographic.fromCartesian(cartesian);

  return {
    lat: CesiumMath.toDegrees(cartographic.latitude),
    lon: CesiumMath.toDegrees(cartographic.longitude),
    heightMeters: cartographic.height
  };
}

function resolveCinematicViewFrame({
  trajectoryCoordinates,
  fixedEndpointCoordinates
}: {
  trajectoryCoordinates: ReadonlyArray<CoordinateDegrees>;
  fixedEndpointCoordinates: CoordinateDegrees;
}): CinematicViewFrame {
  const sceneCoordinates = [...trajectoryCoordinates, fixedEndpointCoordinates];
  const scenePoints = sceneCoordinates.map((coordinate) => toCartesian(coordinate));
  const boundingSphere = BoundingSphere.fromPoints(scenePoints);
  const rangeMeters = Math.max(
    boundingSphere.radius * CAMERA_RANGE_SCALAR,
    MINIMUM_CAMERA_RANGE_METERS
  );

  return {
    boundingSphere,
    boundsDegrees: resolvePaddedBounds(sceneCoordinates),
    targetCoordinates: toCoordinate(boundingSphere.center),
    headingDegrees: resolveCameraHeadingDegrees(
      trajectoryCoordinates,
      fixedEndpointCoordinates
    ),
    pitchDegrees: CINEMATIC_PITCH_DEGREES,
    rangeMeters
  };
}

function getToolbar(viewer: Viewer): HTMLElement | null {
  return viewer.container.querySelector<HTMLElement>(".cesium-viewer-toolbar");
}

function getInsertBeforeNode(toolbar: HTMLElement): ChildNode | null {
  const geocoderContainer = toolbar.querySelector(".cesium-viewer-geocoderContainer");

  if (!(geocoderContainer instanceof HTMLElement)) {
    return toolbar.firstChild;
  }

  return geocoderContainer.nextElementSibling;
}

function syncButtonState(
  button: HTMLButtonElement,
  state: FirstIntakeCinematicCameraPresetState
): void {
  button.ariaPressed = String(state.activation.active);
  button.ariaLabel = "Frame endpoint relation cinematic view";
  button.title = "Frame endpoint relation cinematic view";
  button.dataset.r1vCameraPresetState = state.activation.active
    ? "active"
    : "available";
  button.dataset.r1vCameraPresetDiscoverable = "primary-view-control";
}

function syncTelemetry(state: FirstIntakeCinematicCameraPresetState): void {
  syncDocumentTelemetry({
    firstIntakeCameraPresetState: state.presetState,
    firstIntakeCameraPresetScenarioId: state.scenarioId,
    firstIntakeCameraPresetKey: state.presetKey,
    firstIntakeCameraPresetAffordanceMounted: state.affordance.mounted
      ? "true"
      : "false",
    firstIntakeCameraPresetAffordancePlacement: state.affordance.placement,
    firstIntakeCameraPresetSelectionModel: state.selectionModel,
    firstIntakeCameraPresetActivationState: state.activation.active
      ? "active"
      : "available",
    firstIntakeCameraPresetActivationCount: String(
      state.activation.activationCount
    ),
    firstIntakeCameraPresetFitStrategy: state.fit.strategy,
    firstIntakeCameraPresetMobileEndpointId:
      state.includedSceneObjects.mobileEndpointId,
    firstIntakeCameraPresetFixedEndpointId:
      state.includedSceneObjects.fixedEndpointId,
    firstIntakeCameraPresetRelationCueKind:
      state.includedSceneObjects.relationCueKind,
    firstIntakeCameraPresetTrajectoryWaypointCount: String(
      state.includedSceneObjects.trajectoryWaypointCount
    ),
    firstIntakeCameraPresetBoundsWest: state.fit.boundsDegrees.west.toFixed(6),
    firstIntakeCameraPresetBoundsSouth: state.fit.boundsDegrees.south.toFixed(6),
    firstIntakeCameraPresetBoundsEast: state.fit.boundsDegrees.east.toFixed(6),
    firstIntakeCameraPresetBoundsNorth: state.fit.boundsDegrees.north.toFixed(6),
    firstIntakeCameraPresetTargetLat: state.fit.targetCoordinates.lat.toFixed(6),
    firstIntakeCameraPresetTargetLon: state.fit.targetCoordinates.lon.toFixed(6),
    firstIntakeCameraPresetRangeMeters: state.fit.rangeMeters.toFixed(2),
    firstIntakeCameraPresetHeadingDegrees: state.fit.headingDegrees.toFixed(3),
    firstIntakeCameraPresetPitchDegrees: String(state.fit.pitchDegrees),
    firstIntakeCameraPresetRawPackageSideReadOwnership:
      state.sourceLineage.rawPackageSideReadOwnership,
    firstIntakeCameraPresetProofSeam: state.proofSeam
  });
}

export function createFirstIntakeCinematicCameraPresetController({
  viewer,
  scenarioSurface,
  trajectoryController,
  nearbySecondEndpointController,
  expressionController
}: FirstIntakeCinematicCameraPresetControllerOptions): FirstIntakeCinematicCameraPresetController {
  const runtimeState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const trajectoryState = trajectoryController.getState();
  const nearbySecondEndpointState = nearbySecondEndpointController.getState();
  const expressionState = expressionController.getState();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "First-intake cinematic camera preset only mounts for the matched addressed case."
    );
  }

  if (
    trajectoryState.scenarioId !== addressedEntry.scenarioId ||
    trajectoryState.addressResolution !== "matched"
  ) {
    throw new Error(
      "First-intake cinematic camera preset requires the matched trajectory seam."
    );
  }

  if (
    nearbySecondEndpointState.scenarioId !== addressedEntry.scenarioId ||
    nearbySecondEndpointState.addressResolution !== "matched"
  ) {
    throw new Error(
      "First-intake cinematic camera preset requires the matched nearby fixed endpoint seam."
    );
  }

  if (
    expressionState.scenarioId !== addressedEntry.scenarioId ||
    expressionState.addressResolution !== "matched" ||
    expressionState.animation.relationCueMode !==
      "moving-mobile-to-fixed-nearby-endpoint"
  ) {
    throw new Error(
      "First-intake cinematic camera preset requires the moving relation cue expression seam."
    );
  }

  const trajectoryCoordinates =
    trajectoryState.trajectory.trajectory.points.map((point) => ({
      lat: point.lat,
      lon: point.lon
    }));
  const fixedEndpointCoordinates = {
    lat: nearbySecondEndpointState.endpoint.coordinates.lat,
    lon: nearbySecondEndpointState.endpoint.coordinates.lon
  };
  const viewFrame = resolveCinematicViewFrame({
    trajectoryCoordinates,
    fixedEndpointCoordinates
  });
  let affordanceMounted = false;
  let active = false;
  let activationCount = 0;
  let lastActivatedAtUtc: string | undefined;

  const createState = (): FirstIntakeCinematicCameraPresetState => {
    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      presetState: FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_RUNTIME_STATE,
      presetKey: FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_KEY,
      affordance: {
        mounted: affordanceMounted,
        placement: AFFORDANCE_PLACEMENT,
        controlKind: "single-button",
        exposesSelector: false,
        exposesCatalog: false,
        exposesGlobalEndpointNavigation: false
      },
      selectionModel: "single-bounded-preset",
      activation: {
        active,
        activationCount,
        ...(lastActivatedAtUtc ? { lastActivatedAtUtc } : {})
      },
      fit: {
        strategy: "stable-bounding-accepted-scene-extent",
        boundsDegrees: cloneBounds(viewFrame.boundsDegrees),
        targetCoordinates: cloneTargetCoordinate(viewFrame.targetCoordinates),
        targetHeightMeters: viewFrame.targetCoordinates.heightMeters,
        headingDegrees: viewFrame.headingDegrees,
        pitchDegrees: viewFrame.pitchDegrees,
        rangeMeters: viewFrame.rangeMeters
      },
      includedSceneObjects: {
        mobileEndpointId: trajectoryState.trajectory.endpointId,
        fixedEndpointId: nearbySecondEndpointState.endpoint.endpointId,
        relationCueKind: "moving-mobile-to-fixed-nearby-endpoint",
        trajectoryWaypointCount:
          trajectoryState.trajectory.trajectory.points.length
      },
      proofSeam: FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_PROOF_SEAM,
      sourceLineage: {
        trajectoryRead:
          "trajectoryController.getState().trajectory.trajectory.points",
        nearbySecondEndpointRead:
          "nearbySecondEndpointController.getState().endpoint",
        relationCueRead:
          "expressionController.getState().animation.relationCueMode",
        rawPackageSideReadOwnership: "forbidden"
      }
    };
  };

  const syncState = (button?: HTMLButtonElement): void => {
    const nextState = createState();
    syncTelemetry(nextState);

    if (button) {
      syncButtonState(button, nextState);
    }

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  };

  const applyCinematicView = (): void => {
    viewer.camera.cancelFlight();
    viewer.camera.flyToBoundingSphere(viewFrame.boundingSphere, {
      duration: 0,
      offset: new HeadingPitchRange(
        CesiumMath.toRadians(viewFrame.headingDegrees),
        CesiumMath.toRadians(viewFrame.pitchDegrees),
        viewFrame.rangeMeters
      ),
      complete: () => {
        viewer.scene.requestRender();
      }
    });
  };

  const toolbar = getToolbar(viewer);
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cesium-button cesium-toolbar-button viewer-cinematic-preset-button";
  button.dataset.r1vCameraPreset = FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_KEY;
  button.dataset.r1vCameraPresetAffordance = "true";
  button.innerHTML = CINEMATIC_PRESET_ICON;

  const handleClick = (): void => {
    applyCinematicView();
    active = true;
    activationCount += 1;
    lastActivatedAtUtc = new Date().toISOString();
    syncState(button);
  };

  button.addEventListener("click", handleClick);

  if (toolbar) {
    affordanceMounted = true;
    toolbar.insertBefore(button, getInsertBeforeNode(toolbar));
  }

  syncState(button);

  return {
    getState(): FirstIntakeCinematicCameraPresetState {
      return cloneState(createState());
    },
    activatePreset(): void {
      handleClick();
    },
    dispose(): void {
      button.removeEventListener("click", handleClick);
      button.remove();
      affordanceMounted = false;
      clearDocumentTelemetry(FIRST_INTAKE_CINEMATIC_CAMERA_PRESET_TELEMETRY_KEYS);

      if (!viewer.isDestroyed()) {
        viewer.scene.requestRender();
      }
    }
  };
}
