import {
  ArcType,
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  ConstantPositionProperty,
  CustomDataSource,
  HorizontalOrigin,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  PointGraphics,
  PolylineDashMaterialProperty,
  PolylineGraphics,
  VerticalOrigin,
  type Viewer
} from "cesium";

import type {
  NearbySecondEndpointPositionPrecision
} from "../features/nearby-second-endpoint/nearby-second-endpoint";
import type {
  MobileEndpointTrajectoryPoint
} from "../features/mobile-endpoint-trajectory/mobile-endpoint-trajectory";
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
  FirstIntakeMobileEndpointTrajectoryController
} from "./first-intake-mobile-endpoint-trajectory-controller";
import type {
  FirstIntakeNearbySecondEndpointController
} from "./first-intake-nearby-second-endpoint-controller";
import type {
  FirstIntakeOverlayExpressionController
} from "./first-intake-overlay-expression-controller";

const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_TELEMETRY_KEYS = [
  "firstIntakeNearbySecondEndpointExpressionState",
  "firstIntakeNearbySecondEndpointExpressionScenarioId",
  "firstIntakeNearbySecondEndpointExpressionCurrentMobileEndpointId",
  "firstIntakeNearbySecondEndpointExpressionCurrentMobileWaypointSequence",
  "firstIntakeNearbySecondEndpointExpressionCurrentMobileWaypointTimeUtc",
  "firstIntakeNearbySecondEndpointExpressionFixedEndpointId",
  "firstIntakeNearbySecondEndpointExpressionFixedEndpointPositionPrecision",
  "firstIntakeNearbySecondEndpointExpressionRelationCueKind",
  "firstIntakeNearbySecondEndpointExpressionRelationCueLabel",
  "firstIntakeNearbySecondEndpointExpressionRelationCuePresentationBoundary",
  "firstIntakeNearbySecondEndpointExpressionRelationCueSatellitePathTruth",
  "firstIntakeNearbySecondEndpointExpressionRelationCueActiveGatewayTruth",
  "firstIntakeNearbySecondEndpointExpressionRelationCueGeoTeleportTruth",
  "firstIntakeNearbySecondEndpointExpressionRelationCueRfBeamTruth",
  "firstIntakeNearbySecondEndpointExpressionDataSourceAttached",
  "firstIntakeNearbySecondEndpointExpressionDataSourceName",
  "firstIntakeNearbySecondEndpointExpressionProofSeam"
] as const;

export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_DATA_SOURCE_NAME =
  "first-intake-nearby-second-endpoint-expression";
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointExpression";

const CURRENT_MOBILE_CUE_ENTITY_ID = "first-intake-current-mobile-endpoint-cue";
const FIXED_NEARBY_ENDPOINT_ENTITY_ID =
  "first-intake-fixed-nearby-second-endpoint";
const RELATION_CUE_ENTITY_ID = "first-intake-nearby-endpoint-relation-cue";
const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_ENTITY_IDS = [
  CURRENT_MOBILE_CUE_ENTITY_ID,
  FIXED_NEARBY_ENDPOINT_ENTITY_ID,
  RELATION_CUE_ENTITY_ID
] as const;

const RELATION_CUE_LABEL_TEXT = "Scene aid only";
const RELATION_CUE_DESCRIPTION =
  "Presentation-only scene aid between the current mobile endpoint cue and the nearby fixed second endpoint. Not claimed satellite path, active gateway, GEO teleport, or RF beam truth.";

interface ResolvedTrajectorySample {
  point: MobileEndpointTrajectoryPoint;
  timestampMs: number;
}

export interface FirstIntakeNearbySecondEndpointExpressionCurrentMobileCueState {
  endpointId: string;
  cueKind: "current-mobile-endpoint-position";
  sourceSeam: string;
  samplingMode: "accepted-trajectory-waypoint-snapshot";
  waypointSequence: number;
  pointTimeUtc: string;
  offsetSeconds: number;
  coordinateReference: "WGS84";
  coordinates: {
    lat: number;
    lon: number;
  };
}

export interface FirstIntakeNearbySecondEndpointExpressionFixedEndpointState {
  endpointId: string;
  endpointLabel: string;
  endpointType: string;
  cueKind: "fixed-nearby-second-endpoint";
  sourceSeam: string;
  positionPrecision: NearbySecondEndpointPositionPrecision;
  coordinateReference: "WGS84";
  coordinates: {
    lat: number;
    lon: number;
  };
}

export interface FirstIntakeNearbySecondEndpointExpressionRelationCueState {
  cueKind: "presentation-only-relation-cue";
  label: typeof RELATION_CUE_LABEL_TEXT;
  presentationBoundary: "bounded-presentation-only";
  satellitePathTruth: "not-claimed";
  activeGatewayTruth: "not-claimed";
  geoTeleportTruth: "not-claimed";
  rfBeamTruth: "not-claimed";
}

export interface FirstIntakeNearbySecondEndpointExpressionState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  expressionState: "active-addressed-case";
  truthBoundaryLabel?: string;
  gatewayPoolSemantics: "eligible-gateway-pool";
  activeGatewayClaim: "not-claimed";
  dataSourceName: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_DATA_SOURCE_NAME;
  dataSourceAttached: boolean;
  entityCount: number;
  entityIds:
    ReadonlyArray<
      typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_ENTITY_IDS[number]
    >;
  proofSeam: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_PROOF_SEAM;
  currentMobileCue: FirstIntakeNearbySecondEndpointExpressionCurrentMobileCueState;
  fixedEndpoint: FirstIntakeNearbySecondEndpointExpressionFixedEndpointState;
  relationCue: FirstIntakeNearbySecondEndpointExpressionRelationCueState;
  sourceLineage: {
    nearbySecondEndpointRead: "nearbySecondEndpointController.getState().endpoint";
    trajectoryRead: "trajectoryController.getState().trajectory.trajectory.points";
    overlayExpressionRead: "overlayExpressionController.getState()";
    replayClockRead: "replayClock.getState().currentTime";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeNearbySecondEndpointExpressionController {
  getState(): FirstIntakeNearbySecondEndpointExpressionState;
  subscribe(
    listener: (state: FirstIntakeNearbySecondEndpointExpressionState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeNearbySecondEndpointExpressionControllerOptions {
  viewer: Viewer;
  replayClock: ReplayClock;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  nearbySecondEndpointController: FirstIntakeNearbySecondEndpointController;
  trajectoryController: FirstIntakeMobileEndpointTrajectoryController;
  overlayExpressionController: FirstIntakeOverlayExpressionController;
}

function createMobileCuePointStyle(): PointGraphics {
  return new PointGraphics({
    pixelSize: 12,
    color: Color.fromCssColorString("#ffb24d").withAlpha(0.96),
    outlineColor: Color.fromCssColorString("#2b1700").withAlpha(0.96),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
}

function createFixedEndpointPointStyle(): PointGraphics {
  return new PointGraphics({
    pixelSize: 10,
    color: Color.fromCssColorString("#6dd3ff").withAlpha(0.95),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.94),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
}

function createLabelStyle(text: string): LabelGraphics {
  return new LabelGraphics({
    text: new ConstantProperty(text),
    font: "11px sans-serif",
    scale: 0.82,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: Color.WHITE.withAlpha(0.96),
    outlineColor: Color.fromCssColorString("#04121c").withAlpha(0.92),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: Color.fromCssColorString("#04121c").withAlpha(0.6),
    pixelOffset: new Cartesian2(0, -18),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  });
}

function createRelationCueStyle(
  positions: CallbackProperty
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: 1.75,
    material: new PolylineDashMaterialProperty({
      color: Color.fromCssColorString("#ffe0a6").withAlpha(0.72),
      gapColor: Color.fromCssColorString("#ffe0a6").withAlpha(0.08),
      dashLength: 12
    }),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function assertFiniteTimestamp(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must resolve to a finite timestamp.`);
  }
}

function resolveTimestampMs(value: ReplayClockState["currentTime"]): number {
  const resolved =
    typeof value === "number" ? value : Date.parse(value);

  assertFiniteTimestamp(resolved, "replayClock.currentTime");
  return resolved;
}

function toResolvedTrajectorySamples(
  points: ReadonlyArray<MobileEndpointTrajectoryPoint>
): ReadonlyArray<ResolvedTrajectorySample> {
  return points.map((point, index) => {
    const timestampMs = Date.parse(point.pointTimeUtc);
    assertFiniteTimestamp(
      timestampMs,
      `trajectory.points[${index}].pointTimeUtc`
    );

    return {
      point,
      timestampMs
    };
  });
}

function resolveCurrentTrajectorySample(
  samples: ReadonlyArray<ResolvedTrajectorySample>,
  replayTimeMs: number
): ResolvedTrajectorySample {
  if (samples.length === 0) {
    throw new Error(
      "First-intake nearby second-endpoint expression requires trajectory points."
    );
  }

  let low = 0;
  let high = samples.length - 1;

  if (replayTimeMs <= samples[low].timestampMs) {
    return samples[low];
  }

  if (replayTimeMs >= samples[high].timestampMs) {
    return samples[high];
  }

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = samples[middle];

    if (candidate.timestampMs === replayTimeMs) {
      return candidate;
    }

    if (candidate.timestampMs < replayTimeMs) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return samples[Math.max(0, high)];
}

function cloneState(
  state: FirstIntakeNearbySecondEndpointExpressionState
): FirstIntakeNearbySecondEndpointExpressionState {
  return {
    ...state,
    entityIds: [...state.entityIds],
    currentMobileCue: {
      ...state.currentMobileCue,
      coordinates: {
        ...state.currentMobileCue.coordinates
      }
    },
    fixedEndpoint: {
      ...state.fixedEndpoint,
      coordinates: {
        ...state.fixedEndpoint.coordinates
      }
    },
    relationCue: {
      ...state.relationCue
    },
    sourceLineage: {
      ...state.sourceLineage
    }
  };
}

function notifyListeners(
  listeners: ReadonlySet<
    (state: FirstIntakeNearbySecondEndpointExpressionState) => void
  >,
  state: FirstIntakeNearbySecondEndpointExpressionState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function syncTelemetry(
  state: FirstIntakeNearbySecondEndpointExpressionState
): void {
  syncDocumentTelemetry({
    firstIntakeNearbySecondEndpointExpressionState: state.expressionState,
    firstIntakeNearbySecondEndpointExpressionScenarioId: state.scenarioId,
    firstIntakeNearbySecondEndpointExpressionCurrentMobileEndpointId:
      state.currentMobileCue.endpointId,
    firstIntakeNearbySecondEndpointExpressionCurrentMobileWaypointSequence:
      String(state.currentMobileCue.waypointSequence),
    firstIntakeNearbySecondEndpointExpressionCurrentMobileWaypointTimeUtc:
      state.currentMobileCue.pointTimeUtc,
    firstIntakeNearbySecondEndpointExpressionFixedEndpointId:
      state.fixedEndpoint.endpointId,
    firstIntakeNearbySecondEndpointExpressionFixedEndpointPositionPrecision:
      state.fixedEndpoint.positionPrecision,
    firstIntakeNearbySecondEndpointExpressionRelationCueKind:
      state.relationCue.cueKind,
    firstIntakeNearbySecondEndpointExpressionRelationCueLabel:
      state.relationCue.label,
    firstIntakeNearbySecondEndpointExpressionRelationCuePresentationBoundary:
      state.relationCue.presentationBoundary,
    firstIntakeNearbySecondEndpointExpressionRelationCueSatellitePathTruth:
      state.relationCue.satellitePathTruth,
    firstIntakeNearbySecondEndpointExpressionRelationCueActiveGatewayTruth:
      state.relationCue.activeGatewayTruth,
    firstIntakeNearbySecondEndpointExpressionRelationCueGeoTeleportTruth:
      state.relationCue.geoTeleportTruth,
    firstIntakeNearbySecondEndpointExpressionRelationCueRfBeamTruth:
      state.relationCue.rfBeamTruth,
    firstIntakeNearbySecondEndpointExpressionDataSourceAttached:
      state.dataSourceAttached ? "true" : "false",
    firstIntakeNearbySecondEndpointExpressionDataSourceName:
      state.dataSourceName,
    firstIntakeNearbySecondEndpointExpressionProofSeam: state.proofSeam
  });
}

export function createFirstIntakeNearbySecondEndpointExpressionController({
  viewer,
  replayClock,
  scenarioSurface,
  nearbySecondEndpointController,
  trajectoryController,
  overlayExpressionController
}: FirstIntakeNearbySecondEndpointExpressionControllerOptions): FirstIntakeNearbySecondEndpointExpressionController {
  const runtimeState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const nearbySecondEndpointState = nearbySecondEndpointController.getState();
  const trajectoryState = trajectoryController.getState();
  const overlayExpressionState = overlayExpressionController.getState();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "First-intake nearby second-endpoint expression only mounts for the matched addressed case."
    );
  }

  if (
    nearbySecondEndpointState.scenarioId !== addressedEntry.scenarioId ||
    nearbySecondEndpointState.addressResolution !== "matched"
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires the matched nearby second-endpoint seam."
    );
  }

  if (
    trajectoryState.scenarioId !== addressedEntry.scenarioId ||
    trajectoryState.addressResolution !== "matched"
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires the matched mobile trajectory seam."
    );
  }

  if (
    overlayExpressionState.scenarioId !== addressedEntry.scenarioId ||
    overlayExpressionState.addressResolution !== "matched"
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires the matched overlay expression seam."
    );
  }

  if (
    overlayExpressionState.gatewayPoolSemantics !== "eligible-gateway-pool" ||
    overlayExpressionState.activeGatewayClaim !== "not-claimed"
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires the bounded first-intake overlay gateway semantics."
    );
  }

  if (
    nearbySecondEndpointState.endpoint.truthBoundary.activeGatewayAssignment !==
      "not-claimed" ||
    nearbySecondEndpointState.endpoint.truthBoundary.pairSpecificGeoTeleport !==
      "not-claimed" ||
    nearbySecondEndpointState.endpoint.truthBoundary.measurementTruth !==
      "not-claimed"
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires the nearby second-endpoint seam to preserve its non-claims."
    );
  }

  if (
    trajectoryState.trajectory.truthBoundary.activeGatewayAssignment !==
      "not-claimed" ||
    trajectoryState.trajectory.truthBoundary.pairSpecificGeoTeleport !==
      "not-claimed"
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires the mobile trajectory seam to preserve its non-claims."
    );
  }

  if (
    trajectoryState.trajectory.endpointId ===
    nearbySecondEndpointState.endpoint.endpointId
  ) {
    throw new Error(
      "Nearby second-endpoint expression requires a fixed second endpoint distinct from the mobile trajectory endpoint."
    );
  }

  const resolvedTrajectorySamples = toResolvedTrajectorySamples(
    trajectoryState.trajectory.trajectory.points
  );
  const listeners = new Set<
    (state: FirstIntakeNearbySecondEndpointExpressionState) => void
  >();
  const dataSource = new CustomDataSource(
    FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_DATA_SOURCE_NAME
  );
  const fixedEndpointCartesian = Cartesian3.fromDegrees(
    nearbySecondEndpointState.endpoint.coordinates.lon,
    nearbySecondEndpointState.endpoint.coordinates.lat,
    0
  );
  const midpointScratch = new Cartesian3();
  let dataSourceAttached = false;
  let disposed = false;

  const resolveCurrentSample = (
    replayTime: ReplayClockState["currentTime"]
  ): ResolvedTrajectorySample => {
    return resolveCurrentTrajectorySample(
      resolvedTrajectorySamples,
      resolveTimestampMs(replayTime)
    );
  };

  const resolveCurrentMobileCartesian = (
    time?: JulianDate,
    result?: Cartesian3
  ): Cartesian3 => {
    const replayTime = time
      ? JulianDate.toIso8601(time, 3)
      : replayClock.getState().currentTime;
    const sample = resolveCurrentSample(replayTime);

    return Cartesian3.fromDegrees(
      sample.point.lon,
      sample.point.lat,
      0,
      undefined,
      result
    );
  };

  const relationPositions = new CallbackProperty((time) => {
    return [
      resolveCurrentMobileCartesian(time),
      Cartesian3.clone(fixedEndpointCartesian)
    ];
  }, false);

  dataSource.entities.add({
    id: CURRENT_MOBILE_CUE_ENTITY_ID,
    name: "Current mobile endpoint cue",
    position: new CallbackPositionProperty(resolveCurrentMobileCartesian, false),
    point: createMobileCuePointStyle(),
    label: createLabelStyle("Current mobile cue"),
    description: new ConstantProperty(
      "Current mobile endpoint cue derived from the accepted historical mobile-endpoint trajectory seam."
    )
  });

  dataSource.entities.add({
    id: FIXED_NEARBY_ENDPOINT_ENTITY_ID,
    name: nearbySecondEndpointState.endpoint.endpointLabel,
    position: new ConstantPositionProperty(fixedEndpointCartesian),
    point: createFixedEndpointPointStyle(),
    label: createLabelStyle(nearbySecondEndpointState.endpoint.endpointLabel),
    description: new ConstantProperty(
      "Fixed nearby second endpoint derived from the repo-owned nearby second-endpoint seam."
    )
  });

  dataSource.entities.add({
    id: RELATION_CUE_ENTITY_ID,
    name: "Nearby endpoint relation cue",
    position: new CallbackPositionProperty((time, result) => {
      return Cartesian3.midpoint(
        resolveCurrentMobileCartesian(time),
        fixedEndpointCartesian,
        result ?? midpointScratch
      );
    }, false),
    label: createLabelStyle(RELATION_CUE_LABEL_TEXT),
    polyline: createRelationCueStyle(relationPositions),
    description: new ConstantProperty(RELATION_CUE_DESCRIPTION)
  });

  const createState = (): FirstIntakeNearbySecondEndpointExpressionState => {
    const currentSample = resolveCurrentSample(replayClock.getState().currentTime);

    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      expressionState: "active-addressed-case",
      truthBoundaryLabel: overlayExpressionState.truthBoundaryLabel,
      gatewayPoolSemantics: overlayExpressionState.gatewayPoolSemantics,
      activeGatewayClaim: overlayExpressionState.activeGatewayClaim,
      dataSourceName:
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_DATA_SOURCE_NAME,
      dataSourceAttached,
      entityCount:
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_ENTITY_IDS.length,
      entityIds: [...FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_ENTITY_IDS],
      proofSeam:
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_PROOF_SEAM,
      currentMobileCue: {
        endpointId: trajectoryState.trajectory.endpointId,
        cueKind: "current-mobile-endpoint-position",
        sourceSeam: trajectoryState.proofSeam,
        samplingMode: "accepted-trajectory-waypoint-snapshot",
        waypointSequence: currentSample.point.sequence,
        pointTimeUtc: currentSample.point.pointTimeUtc,
        offsetSeconds: currentSample.point.offsetSeconds,
        coordinateReference: "WGS84",
        coordinates: {
          lat: currentSample.point.lat,
          lon: currentSample.point.lon
        }
      },
      fixedEndpoint: {
        endpointId: nearbySecondEndpointState.endpoint.endpointId,
        endpointLabel: nearbySecondEndpointState.endpoint.endpointLabel,
        endpointType: nearbySecondEndpointState.endpoint.endpointType,
        cueKind: "fixed-nearby-second-endpoint",
        sourceSeam: nearbySecondEndpointState.proofSeam,
        positionPrecision: nearbySecondEndpointState.endpoint.positionPrecision,
        coordinateReference:
          nearbySecondEndpointState.endpoint.coordinateReference,
        coordinates: {
          lat: nearbySecondEndpointState.endpoint.coordinates.lat,
          lon: nearbySecondEndpointState.endpoint.coordinates.lon
        }
      },
      relationCue: {
        cueKind: "presentation-only-relation-cue",
        label: RELATION_CUE_LABEL_TEXT,
        presentationBoundary: "bounded-presentation-only",
        satellitePathTruth: "not-claimed",
        activeGatewayTruth: overlayExpressionState.activeGatewayClaim,
        geoTeleportTruth:
          nearbySecondEndpointState.endpoint.truthBoundary.pairSpecificGeoTeleport,
        rfBeamTruth: "not-claimed"
      },
      sourceLineage: {
        nearbySecondEndpointRead:
          "nearbySecondEndpointController.getState().endpoint",
        trajectoryRead:
          "trajectoryController.getState().trajectory.trajectory.points",
        overlayExpressionRead: "overlayExpressionController.getState()",
        replayClockRead: "replayClock.getState().currentTime",
        rawPackageSideReadOwnership: "forbidden"
      }
    };
  };

  const syncState = (): void => {
    const nextState = createState();
    syncTelemetry(nextState);
    notifyListeners(listeners, cloneState(nextState));

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
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
    if (!disposed) {
      syncState();
    }
  });

  return {
    getState(): FirstIntakeNearbySecondEndpointExpressionState {
      return cloneState(createState());
    },
    subscribe(
      listener: (state: FirstIntakeNearbySecondEndpointExpressionState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      disposed = true;
      unsubscribeReplayClock();
      listeners.clear();
      clearDocumentTelemetry(
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_EXPRESSION_TELEMETRY_KEYS
      );
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
