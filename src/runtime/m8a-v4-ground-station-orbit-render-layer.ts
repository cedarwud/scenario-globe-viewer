import {
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  JulianDate,
  SceneTransforms,
  type CustomDataSource,
  type Viewer
} from "cesium";
import {
  eciToEcf,
  gstime,
  propagate,
  twoline2satrec
} from "satellite.js";

import type { ReplayClock, ReplayClockState } from "../features/time";
import {
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  type M8aV4ActorDisplayRole,
  type M8aV4OrbitActorProjection,
  type M8aV4OrbitClass,
  type M8aV46dActorId,
  type M8aV46dSimulationHandoverWindow
} from "./m8a-v4-ground-station-projection";
import {
  createActorEntityOptions,
  createGeoGuardCueEntityOptions,
  createLinkFlowPulseEntityOptions,
  createLinkFlowSegmentEntityOptions,
  createRelationEntityOptions,
  positionToCartesian,
  resolveActorEmphasis,
  shouldRenderActorLabel,
  shouldShowGeoGuardCue,
  updateActorStyle,
  updateLinkFlowPulseStyle,
  updateLinkFlowSegmentStyle,
  updateRelationStyle,
  type ActorRenderHandle,
  type EndpointRenderContext,
  type LinkFlowPulseRenderHandle,
  type LinkFlowSegmentRenderHandle,
  type M8aV4ActorEmphasis,
  type RelationRenderHandle
} from "./m8a-v4-ground-station-cesium-entities";
import {
  M8A_V4_LINK_FLOW_DIRECTIONS,
  M8A_V4_LINK_FLOW_PULSE_OFFSETS,
  M8A_V4_LINK_FLOW_RELATION_ROLES,
  M8A_V4_LINK_FLOW_REPLAY_CYCLES,
  type M8aV4LinkFlowDirection,
  type M8aV4LinkFlowRelationRole,
  type M8aV4RelationRole
} from "./m8a-v4-product-ux-model";
import {
  resolveReplayWindowRatio,
  resolveSimulationHandoverWindow,
  toEpochMilliseconds,
  toIsoTimestamp
} from "./m8a-v4-ground-station-state-builders";

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

export type M8aV4ActorDisplayMotionPolicy =
  | "monotonic-wrapped-display-pass"
  | "near-fixed-geo-guard";

export interface M8aV4ActorDisplayMotionState {
  policy: M8aV4ActorDisplayMotionPolicy;
  sourceBoundary:
    "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.runtimeDisplayTrack";
  trackKind: M8aV4OrbitActorProjection["runtimeDisplayTrack"]["trackKind"];
  pathProgress: number;
  unwrappedTrackProgress: number;
  wrapIndex: number;
  phaseOffset: number;
  cycleRate: number;
  renderTrackBasis: string;
  renderTrackIsSourceTruth: false;
  truthBoundary:
    | "viewer-owned-display-projection-not-source-truth"
    | "near-fixed-geo-display-context-guard-not-service-truth";
}

export interface M8aV4ActorRuntimeRecord {
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
  displayMotion: M8aV4ActorDisplayMotionState;
  propagationTimeUtc: string;
  emphasis: M8aV4ActorEmphasis["emphasis"];
  labelVisibility: "always-visible" | "hidden-context";
}

interface PropagatedActorPosition {
  cartesian: Cartesian3;
  propagationTimeUtc: string;
}

export interface GroundStationOrbitRenderLayer {
  buildActorRuntimeRecords(
    replayState: ReplayClockState,
    simulationWindow: M8aV46dSimulationHandoverWindow
  ): ReadonlyArray<M8aV4ActorRuntimeRecord>;
  setFixtureDrivenEntitiesVisible(
    visible: boolean,
    simulationWindow: M8aV46dSimulationHandoverWindow
  ): void;
  sync(simulationWindow: M8aV46dSimulationHandoverWindow): void;
}

export interface GroundStationOrbitRenderLayerOptions {
  dataSource: CustomDataSource;
  endpointA: EndpointRenderContext;
  endpointB: EndpointRenderContext;
  modelUri: string;
  initialSimulationWindow: M8aV46dSimulationHandoverWindow;
  replayClock: ReplayClock;
  viewer: Viewer;
}

function normalizeUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function lerp(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

function positionToPlainMeters(cartesian: Cartesian3): {
  readonly x: number;
  readonly y: number;
  readonly z: number;
} {
  return {
    x: cartesian.x,
    y: cartesian.y,
    z: cartesian.z
  };
}

function resolveActorDisplayHeightMeters(
  orbitClass: M8aV4OrbitClass,
  ratio: number,
  wobbleRatio: number
): number {
  const config = M8A_V4_DISPLAY_ORBIT_HEIGHT_METERS[orbitClass];
  const base = lerp(config.start, config.stop, ratio);

  return base + Math.sin(wobbleRatio * Math.PI * 2) * config.wobble;
}

export function resolveActorDisplayMotionState(
  actor: M8aV4OrbitActorProjection,
  replayRatio: number
): M8aV4ActorDisplayMotionState {
  const track = actor.runtimeDisplayTrack;

  if (track.trackKind === "east-asia-near-fixed-geo-anchor") {
    return {
      policy: "near-fixed-geo-guard",
      sourceBoundary:
        "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.runtimeDisplayTrack",
      trackKind: track.trackKind,
      pathProgress: 0,
      unwrappedTrackProgress: 0,
      wrapIndex: 0,
      phaseOffset: track.phaseOffset,
      cycleRate: track.cycleRate,
      renderTrackBasis: track.renderTrackBasis,
      renderTrackIsSourceTruth: track.renderTrackIsSourceTruth,
      truthBoundary: "near-fixed-geo-display-context-guard-not-service-truth"
    };
  }

  const unwrappedTrackProgress =
    replayRatio * track.cycleRate + track.phaseOffset;

  return {
    policy: "monotonic-wrapped-display-pass",
    sourceBoundary:
      "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.runtimeDisplayTrack",
    trackKind: track.trackKind,
    pathProgress: normalizeUnit(unwrappedTrackProgress),
    unwrappedTrackProgress,
    wrapIndex: Math.floor(unwrappedTrackProgress),
    phaseOffset: track.phaseOffset,
    cycleRate: track.cycleRate,
    renderTrackBasis: track.renderTrackBasis,
    renderTrackIsSourceTruth: track.renderTrackIsSourceTruth,
    truthBoundary: "viewer-owned-display-projection-not-source-truth"
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

export function createGroundStationOrbitRenderLayer({
  dataSource,
  endpointA,
  endpointB,
  modelUri,
  initialSimulationWindow,
  replayClock,
  viewer
}: GroundStationOrbitRenderLayerOptions): GroundStationOrbitRenderLayer {
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
    const displayMotion = resolveActorDisplayMotionState(actor, timeRatio);
    const propagationTimeUtc = time
      ? JulianDate.toDate(time).toISOString()
      : toIsoTimestamp(replayState.currentTime);

    if (track.trackKind === "east-asia-near-fixed-geo-anchor") {
      return {
        cartesian: Cartesian3.fromDegrees(
          track.start.lon,
          track.start.lat,
          M8A_V4_DISPLAY_ORBIT_HEIGHT_METERS.geo.start,
          undefined,
          result ?? new Cartesian3()
        ),
        propagationTimeUtc
      };
    }

    const loopRatio = displayMotion.pathProgress;
    const heightMeters = resolveActorDisplayHeightMeters(
      actor.orbitClass,
      loopRatio,
      loopRatio
    );

    return {
      cartesian: Cartesian3.fromDegrees(
        lerp(track.start.lon, track.stop.lon, loopRatio) +
          (actor.orbitClass === "meo"
            ? M8A_V4_MEO_DISPLAY_LANE_LONGITUDE_BIAS_DEGREES
            : 0),
        lerp(track.start.lat, track.stop.lat, loopRatio) +
          (actor.orbitClass === "meo"
            ? M8A_V4_MEO_DISPLAY_LANE_LATITUDE_BIAS_DEGREES
            : 0),
        heightMeters,
        undefined,
        result ?? new Cartesian3()
      ),
      propagationTimeUtc
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
      const emphasis = resolveActorEmphasis(actor, initialSimulationWindow);
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

        const entity = dataSource.entities.add(
          createActorEntityOptions({
            actor,
            position: createActorPositionProperty(actor),
            modelUri,
            emphasis,
            simulationWindow: initialSimulationWindow
          })
        );

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
  const endpointALinkPosition = positionToCartesian(
    endpointA.renderMarker.displayPosition
  );
  const endpointBLinkPosition = positionToCartesian(
    endpointB.renderMarker.displayPosition
  );
  const resolveLinkFlowActor = (
    role: M8aV4LinkFlowRelationRole,
    replayState: ReplayClockState
  ): M8aV4OrbitActorProjection => {
    return resolveActorById(
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors,
      resolveRelationActorId(role, replayState)
    );
  };
  const createLinkFlowSegmentPositions = (
    role: M8aV4LinkFlowRelationRole,
    direction: M8aV4LinkFlowDirection
  ): CallbackProperty => {
    return new CallbackProperty((time) => {
      const actor = resolveLinkFlowActor(role, replayClock.getState());
      const actorPosition = resolveActorRenderPosition(
        actor,
        time,
        new Cartesian3()
      ).cartesian;

      return direction === "uplink"
        ? [endpointALinkPosition, actorPosition]
        : [actorPosition, endpointBLinkPosition];
    }, false);
  };
  const resolveLinkFlowSegmentEndpoints = (
    role: M8aV4LinkFlowRelationRole,
    direction: M8aV4LinkFlowDirection,
    time?: JulianDate
  ): { start: Cartesian3; stop: Cartesian3 } => {
    const actor = resolveLinkFlowActor(role, replayClock.getState());
    const actorPosition = resolveActorRenderPosition(
      actor,
      time,
      new Cartesian3()
    ).cartesian;

    return direction === "uplink"
      ? { start: endpointALinkPosition, stop: actorPosition }
      : { start: actorPosition, stop: endpointBLinkPosition };
  };
  const createLinkFlowPulseRotation = (
    role: M8aV4LinkFlowRelationRole,
    direction: M8aV4LinkFlowDirection
  ): CallbackProperty => {
    return new CallbackProperty((time) => {
      const { start, stop } = resolveLinkFlowSegmentEndpoints(
        role,
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

      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        return 0;
      }

      return Math.atan2(-dy, dx);
    }, false);
  };
  const createLinkFlowPulsePosition = (
    role: M8aV4LinkFlowRelationRole,
    direction: M8aV4LinkFlowDirection,
    pulseOffset: number
  ): CallbackPositionProperty => {
    return new CallbackPositionProperty((time, result) => {
      const replayState = replayClock.getState();
      const replayRatio = time
        ? resolveReplayWindowRatio({
            ...replayState,
            currentTime: JulianDate.toDate(time).toISOString()
          })
        : resolveReplayWindowRatio(replayState);
      const { start, stop } = resolveLinkFlowSegmentEndpoints(
        role,
        direction,
        time
      );
      const roleOffset = role === "displayRepresentative" ? 0 : 0.18;
      const directionOffset = direction === "uplink" ? 0 : 0.11;
      const phase = normalizeUnit(
        replayRatio * M8A_V4_LINK_FLOW_REPLAY_CYCLES +
          pulseOffset +
          roleOffset +
          directionOffset
      );

      return Cartesian3.lerp(start, stop, phase, result ?? new Cartesian3());
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
    const entity = dataSource.entities.add(
      createRelationEntityOptions(
        relationRole,
        createRelationPositions(relationRole)
      )
    );

    return {
      role: relationRole,
      entity
    };
  });
  const linkFlowSegmentHandles: ReadonlyArray<LinkFlowSegmentRenderHandle> =
    M8A_V4_LINK_FLOW_RELATION_ROLES.flatMap((role) =>
      M8A_V4_LINK_FLOW_DIRECTIONS.map((direction) => {
        const entity = dataSource.entities.add(
          createLinkFlowSegmentEntityOptions({
            role,
            direction,
            positions: createLinkFlowSegmentPositions(role, direction)
          })
        );

        return {
          role,
          direction,
          entity
        };
      })
    );
  const linkFlowPulseHandles: ReadonlyArray<LinkFlowPulseRenderHandle> =
    M8A_V4_LINK_FLOW_RELATION_ROLES.flatMap((role) =>
      M8A_V4_LINK_FLOW_DIRECTIONS.flatMap((direction) =>
        M8A_V4_LINK_FLOW_PULSE_OFFSETS.map((pulseOffset, pulseIndex) => {
          const entity = dataSource.entities.add(
            createLinkFlowPulseEntityOptions({
              role,
              direction,
              pulseIndex,
              position: createLinkFlowPulsePosition(
                role,
                direction,
                pulseOffset
              ),
              rotation: createLinkFlowPulseRotation(role, direction)
            })
          );

          return {
            role,
            direction,
            pulseIndex,
            entity
          };
        })
      )
    );
  const geoGuardCueEntity = dataSource.entities.add(
    createGeoGuardCueEntityOptions(createGeoGuardCuePosition())
  );

  return {
    buildActorRuntimeRecords(
      replayState,
      simulationWindow
    ): ReadonlyArray<M8aV4ActorRuntimeRecord> {
      const actorEmphasis =
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) =>
          resolveActorEmphasis(actor, simulationWindow)
        );
      const actorEmphasisById = new Map(
        actorEmphasis.map((emphasis) => [emphasis.actorId, emphasis])
      );

      return M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map(
        (actor) => {
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
            displayMotion: resolveActorDisplayMotionState(
              actor,
              resolveReplayWindowRatio(replayState)
            ),
            propagationTimeUtc: sourcePropagated.propagationTimeUtc,
            emphasis: emphasis.emphasis,
            labelVisibility: shouldRenderActorLabel(actor, simulationWindow)
              ? "always-visible"
              : "hidden-context"
          };
        }
      );
    },
    setFixtureDrivenEntitiesVisible(visible, simulationWindow): void {
      for (const handle of actorHandles) {
        handle.entity.show = visible;
      }
      for (const handle of relationHandles) {
        handle.entity.show = visible;
      }
      for (const handle of linkFlowSegmentHandles) {
        handle.entity.show = visible;
      }
      for (const handle of linkFlowPulseHandles) {
        handle.entity.show = visible;
      }
      geoGuardCueEntity.show = visible && shouldShowGeoGuardCue(simulationWindow);
    },
    sync(simulationWindow): void {
      const emphasisById = new Map(
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) => [
          actor.actorId,
          resolveActorEmphasis(actor, simulationWindow)
        ])
      );

      for (const handle of actorHandles) {
        const emphasis = emphasisById.get(handle.actor.actorId);

        if (emphasis) {
          updateActorStyle(handle, emphasis, simulationWindow);
        }
      }

      for (const handle of relationHandles) {
        updateRelationStyle(handle);
      }

      for (const handle of linkFlowSegmentHandles) {
        updateLinkFlowSegmentStyle(handle);
      }

      for (const handle of linkFlowPulseHandles) {
        updateLinkFlowPulseStyle(handle);
      }
    }
  };
}
