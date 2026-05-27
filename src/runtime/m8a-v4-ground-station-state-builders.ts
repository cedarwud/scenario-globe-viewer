import type { ReplayClockState } from "../features/time";
import {
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  type M8aV46dSimulationHandoverWindow,
  type M8aV4OrbitActorProjection,
  type M8aV4ServiceStateWindow
} from "./m8a-v4-ground-station-projection";
import type { EndpointRenderContext } from "./m8a-v4-ground-station-cesium-entities";
import type {
  M8aV4GroundStationSceneState
} from "./m8a-v4-ground-station-scene-state";
import type { M8aV411SourcesFilter } from "./m8a-v411-sources-role";
import {
  M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS,
  M8A_V411_REVIEWER_MODE_VERSION,
  resolveM8aV411ControlAvailability,
  resolveM8aV411ModeAnnouncement,
  resolveM8aV411WindowOrdinalLabel,
  type M8aV411ReviewerModeState
} from "./m8a-v411-reviewer-mode";
import {
  buildSimulatedReplayTimeDisplay,
  buildV48HandoverReviewViewModel,
  buildV49ProductComprehensionRuntime,
  coercePlaybackMultiplier,
  M8A_V46E_TIMELINE_LABELS,
  M8A_V47_DEBUG_TEST_MULTIPLIER,
  M8A_V47_DISCLOSURE_LINES,
  M8A_V47_FINAL_HOLD_DURATION_MS,
  M8A_V47_FINAL_HOLD_MAX_MS,
  M8A_V47_FINAL_HOLD_MIN_MS,
  M8A_V47_GUIDED_REVIEW_MULTIPLIER,
  M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
  M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS,
  M8A_V47_PRODUCT_UX_VERSION,
  M8A_V47_QUICK_SCAN_MULTIPLIER,
  M8A_V47_TRUTH_BADGES,
  M8A_V48_UI_IA_VERSION,
  resolvePlaybackMode,
  resolvePlaybackStatus,
  resolveTimelineLabel,
  type M8aV411InspectorTab,
  type M8aV47DisclosureState,
  type M8aV49TransitionEventRuntime
} from "./m8a-v4-product-ux-model";

const M8A_V4_MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const M8A_V4_FULL_LEO_ORBIT_REPLAY_MARGIN_MS = 5 * 60 * 1000;

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

interface ProductUxStateBuilderArgs {
  replayState: ReplayClockState;
  simulationHandoverModel: M8aV4GroundStationSceneState["simulationHandoverModel"];
  viewportClass: "desktop" | "narrow";
  finalHoldActive: boolean;
  finalHoldStartedAtEpochMs: number | null;
  finalHoldCompletedAtEpochMs: number | null;
  finalHoldLoopCount: number;
  detailsDisclosureOpen: boolean;
  boundaryDisclosureOpen: boolean;
  sourcesDisclosureOpen: boolean;
  sourcesFilter: M8aV411SourcesFilter;
  boundaryFullTruthDisclosureOpen: boolean;
  activeInspectorTab: M8aV411InspectorTab;
  activeTransitionEvent: M8aV49TransitionEventRuntime | null;
  reviewerModeState: M8aV411ReviewerModeState;
  narrowRailDrawerOpen: boolean;
}

function assertFiniteTimestamp(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must resolve to a finite timestamp.`);
  }
}

export function toEpochMilliseconds(
  value: ReplayClockState["currentTime"]
): number {
  const epochMs = typeof value === "number" ? value : Date.parse(value);
  assertFiniteTimestamp(epochMs, "m8aV4GroundStation.timestamp");
  return epochMs;
}

export function toIsoTimestamp(
  value: ReplayClockState["currentTime"] | number
): string {
  return new Date(toEpochMilliseconds(value)).toISOString();
}

function clampUnit(value: number): number {
  return Math.min(Math.max(value, 0), 1);
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

export const M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE =
  buildFullLeoOrbitReplayProfile();

export function resolveReplayWindowRatio(replayState: ReplayClockState): number {
  const startMs = toEpochMilliseconds(replayState.startTime);
  const stopMs = toEpochMilliseconds(replayState.stopTime);
  const currentMs = toEpochMilliseconds(replayState.currentTime);
  const durationMs = stopMs - startMs;

  if (durationMs <= 0) {
    return 0;
  }

  return clampUnit((currentMs - startMs) / durationMs);
}

export function resolveServiceStateWindow(
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

export function resolveSimulationHandoverWindow(
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

export function buildEndpointState(
  endpoints: ReadonlyArray<EndpointRenderContext>
): M8aV4GroundStationSceneState["endpoints"] {
  return endpoints.map((endpoint) => ({
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

export function buildReplayWindowState(
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

export function buildSimulationHandoverState(
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

export function buildProductUxState({
  replayState,
  simulationHandoverModel,
  viewportClass,
  finalHoldActive,
  finalHoldStartedAtEpochMs,
  finalHoldCompletedAtEpochMs,
  finalHoldLoopCount,
  detailsDisclosureOpen,
  boundaryDisclosureOpen,
  sourcesDisclosureOpen,
  sourcesFilter,
  boundaryFullTruthDisclosureOpen,
  activeInspectorTab,
  activeTransitionEvent,
  reviewerModeState,
  narrowRailDrawerOpen
}: ProductUxStateBuilderArgs): M8aV4GroundStationSceneState["productUx"] {
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
  const reviewViewModel =
    buildV48HandoverReviewViewModel(simulationHandoverModel);
  const detailsDisclosureState: M8aV47DisclosureState =
    detailsDisclosureOpen ? "open" : "closed";
  const boundaryDisclosureState: M8aV47DisclosureState =
    boundaryDisclosureOpen ? "open" : "closed";
  const sourcesDisclosureState: M8aV47DisclosureState =
    sourcesDisclosureOpen ? "open" : "closed";
  const inspectorDisclosureState: M8aV47DisclosureState =
    detailsDisclosureOpen || boundaryDisclosureOpen || sourcesDisclosureOpen
      ? "open"
      : "closed";
  const boundaryFullTruthDisclosureState: M8aV47DisclosureState =
    boundaryFullTruthDisclosureOpen ? "open" : "closed";
  const productComprehension =
    buildV49ProductComprehensionRuntime(
      simulationHandoverModel,
      activeTransitionEvent,
      detailsDisclosureState,
      boundaryDisclosureState,
      boundaryFullTruthDisclosureState
    );

  return {
    version: M8A_V47_PRODUCT_UX_VERSION,
    uiIaVersion: M8A_V48_UI_IA_VERSION,
    infoClassSeam: "data-m8a-v48-info-class",
    infoClassValues: ["fixed", "dynamic", "disclosure", "control"],
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
    reviewViewModel,
    productComprehension,
    truthBadges: M8A_V47_TRUTH_BADGES,
    disclosure: {
      state: inspectorDisclosureState,
      detailsSheetState: detailsDisclosureState,
      boundarySurfaceState: boundaryDisclosureState,
      sourcesRoleState: sourcesDisclosureState,
      activeInspectorTab,
      sourcesFilter,
      boundaryFullTruthDisclosureState,
      lines: M8A_V47_DISCLOSURE_LINES
    },
    layout: {
      viewportClass,
      desktopPolicy: "compact-control-strip",
      narrowPolicy: "compact-control-strip-with-secondary-sheet",
      detailSheetState: inspectorDisclosureState,
      boundarySurfaceState: boundaryDisclosureState,
      sourcesRoleState: sourcesDisclosureState,
      protectedZonePolicy:
        "endpoint-corridor-geo-guard-and-required-labels-non-obstruction",
      narrowRailDrawerState: narrowRailDrawerOpen ? "open" : "closed"
    },
    reviewerMode: {
      version: M8A_V411_REVIEWER_MODE_VERSION,
      replayClockMode: reviewerModeState.replayClockMode,
      pauseSource: reviewerModeState.pauseSource,
      pinnedWindowId: reviewerModeState.pinnedWindowId,
      pinnedWindowOrdinalLabel: resolveM8aV411WindowOrdinalLabel(
        reviewerModeState.pinnedWindowId
      ),
      pinnedReplayRatio: reviewerModeState.pinnedReplayRatio,
      previousPlaybackState: reviewerModeState.previousPlaybackState,
      toastSuppressed: reviewerModeState.toastSuppressed,
      reviewModeOn: reviewerModeState.reviewModeOn,
      manualPauseSpeedDeferred: reviewerModeState.manualPauseSpeedDeferred,
      announcement: resolveM8aV411ModeAnnouncement(reviewerModeState),
      controls: resolveM8aV411ControlAvailability(reviewerModeState),
      autoPauseDurationMs: M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS
    }
  };
}

function cloneActorState(
  actor: M8aV4GroundStationSceneState["actors"][number]
): M8aV4GroundStationSceneState["actors"][number] {
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
    },
    displayMotion: {
      ...actor.displayMotion
    }
  };
}

export function cloneState(
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
    selectedPairOverlay: {
      ...state.selectedPairOverlay
    },
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
      reviewViewModel: {
        ...state.productUx.reviewViewModel,
        representativeActor: {
          ...state.productUx.reviewViewModel.representativeActor
        },
        candidateContextActors:
          state.productUx.reviewViewModel.candidateContextActors.map(
            (actor) => ({ ...actor })
          ),
        fallbackContextActors:
          state.productUx.reviewViewModel.fallbackContextActors.map((actor) => ({
            ...actor
          })),
        relationCueRole: {
          ...state.productUx.reviewViewModel.relationCueRole
        },
        sceneAnchorState: {
          ...state.productUx.reviewViewModel.sceneAnchorState
        }
      },
      productComprehension: {
        ...state.productUx.productComprehension,
        handoverSequenceRail: {
          ...state.productUx.productComprehension.handoverSequenceRail,
          windowIds: [
            ...state.productUx.productComprehension.handoverSequenceRail
              .windowIds
          ],
          visibleContent: [
            ...state.productUx.productComprehension.handoverSequenceRail
              .visibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["handoverSequenceRail"]["visibleContent"],
          items:
            state.productUx.productComprehension.handoverSequenceRail.items.map(
              (item) => ({ ...item })
            ),
          transitionEvent: {
            ...state.productUx.productComprehension.handoverSequenceRail
              .transitionEvent
          }
        },
        boundaryAffordance: {
          ...state.productUx.productComprehension.boundaryAffordance,
          visibleContent: [
            ...state.productUx.productComprehension.boundaryAffordance
              .visibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["boundaryAffordance"]["visibleContent"],
          forbiddenBehavior: [
            ...state.productUx.productComprehension.boundaryAffordance
              .forbiddenBehavior
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["boundaryAffordance"]["forbiddenBehavior"]
        },
        focusChoreography: {
          ...state.productUx.productComprehension.focusChoreography,
          visibleContent: [
            ...state.productUx.productComprehension.focusChoreography
              .visibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["focusChoreography"]["visibleContent"],
          secondaryActorEmphasisRoles: [
            ...state.productUx.productComprehension.focusChoreography
              .secondaryActorEmphasisRoles
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["focusChoreography"]["secondaryActorEmphasisRoles"]
        },
        windowIds: [...state.productUx.productComprehension.windowIds],
        activeWindowCopy: {
          ...state.productUx.productComprehension.activeWindowCopy
        },
        copyInventory: state.productUx.productComprehension.copyInventory.map(
          (copy) => ({ ...copy })
        ),
        persistentLayer: {
          ...state.productUx.productComprehension.persistentLayer,
          defaultVisibleContent: [
            ...state.productUx.productComprehension.persistentLayer
              .defaultVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["persistentLayer"]["defaultVisibleContent"],
          deniedDefaultVisibleContent: [
            ...state.productUx.productComprehension.persistentLayer
              .deniedDefaultVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["persistentLayer"]["deniedDefaultVisibleContent"]
        },
        sceneNearMeaningLayer: {
          ...state.productUx.productComprehension.sceneNearMeaningLayer,
          reliableVisibleContent: [
            ...state.productUx.productComprehension.sceneNearMeaningLayer
              .reliableVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["sceneNearMeaningLayer"]["reliableVisibleContent"],
          fallbackVisibleContent: [
            ...state.productUx.productComprehension.sceneNearMeaningLayer
              .fallbackVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["sceneNearMeaningLayer"]["fallbackVisibleContent"]
        },
        transitionEventLayer: {
          ...state.productUx.productComprehension.transitionEventLayer,
          visibleContent: [
            ...state.productUx.productComprehension.transitionEventLayer
              .visibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["transitionEventLayer"]["visibleContent"],
          deniedVisibleContent: [
            ...state.productUx.productComprehension.transitionEventLayer
              .deniedVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["transitionEventLayer"]["deniedVisibleContent"],
          activeEvent: state.productUx.productComprehension.transitionEventLayer
            .activeEvent
            ? {
                ...state.productUx.productComprehension.transitionEventLayer
                  .activeEvent
              }
            : null
        },
        inspectorLayer: {
          ...state.productUx.productComprehension.inspectorLayer,
          evidenceStructure: [
            ...state.productUx.productComprehension.inspectorLayer
              .evidenceStructure
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["inspectorLayer"]["evidenceStructure"],
          primaryVisibleContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .primaryVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["inspectorLayer"]["primaryVisibleContent"],
          deniedPrimaryVisibleContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .deniedPrimaryVisibleContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["inspectorLayer"]["deniedPrimaryVisibleContent"],
          debugEvidenceContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .debugEvidenceContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["inspectorLayer"]["debugEvidenceContent"],
          deniedFirstReadRoles: [
            ...state.productUx.productComprehension.inspectorLayer
              .deniedFirstReadRoles
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["inspectorLayer"]["deniedFirstReadRoles"],
          notClaimedContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .notClaimedContent
          ] as M8aV4GroundStationSceneState["productUx"]["productComprehension"]["inspectorLayer"]["notClaimedContent"]
        }
      },
      truthBadges: [
        ...state.productUx.truthBadges
      ] as M8aV4GroundStationSceneState["productUx"]["truthBadges"],
      disclosure: {
        ...state.productUx.disclosure,
        sourcesFilter: {
          ...state.productUx.disclosure.sourcesFilter
        },
        lines: [
          ...state.productUx.disclosure.lines
        ] as M8aV4GroundStationSceneState["productUx"]["disclosure"]["lines"]
      },
      layout: {
        ...state.productUx.layout
      }
    },
    relationCues: {
      ...state.relationCues
    },
    requirementGapSurface: {
      ...state.requirementGapSurface,
      truthBoundaryLabels: [
        ...state.requirementGapSurface.truthBoundaryLabels
      ] as M8aV4GroundStationSceneState["requirementGapSurface"]["truthBoundaryLabels"],
      groups: state.requirementGapSurface.groups.map((group) => ({
        ...group,
        requirementIds: [...group.requirementIds]
      })),
      openRequirementIds: [
        ...state.requirementGapSurface.openRequirementIds
      ]
    },
    acceptanceLayer: {
      ...state.acceptanceLayer,
      requirementIds: [
        ...state.acceptanceLayer.requirementIds
      ] as M8aV4GroundStationSceneState["acceptanceLayer"]["requirementIds"],
      coverageRecords: state.acceptanceLayer.coverageRecords.map((record) => ({
        ...record
      })),
      requirementStatusPairs: [
        ...state.acceptanceLayer.requirementStatusPairs
      ],
      requirementLayerPairs: [
        ...state.acceptanceLayer.requirementLayerPairs
      ],
      externalFailIds: [
        ...state.acceptanceLayer.externalFailIds
      ] as M8aV4GroundStationSceneState["acceptanceLayer"]["externalFailIds"],
      boundedRouteRepresentationIds: [
        ...state.acceptanceLayer.boundedRouteRepresentationIds
      ] as M8aV4GroundStationSceneState["acceptanceLayer"]["boundedRouteRepresentationIds"],
      f13Phase71Evidence: {
        ...state.acceptanceLayer.f13Phase71Evidence
      },
      f13RouteNativeScaleReadiness: {
        ...state.acceptanceLayer.f13RouteNativeScaleReadiness,
        knownGaps: [
          ...state.acceptanceLayer.f13RouteNativeScaleReadiness.knownGaps
        ] as M8aV4GroundStationSceneState["acceptanceLayer"]["f13RouteNativeScaleReadiness"]["knownGaps"],
        nonClaims: [
          ...state.acceptanceLayer.f13RouteNativeScaleReadiness.nonClaims
        ] as M8aV4GroundStationSceneState["acceptanceLayer"]["f13RouteNativeScaleReadiness"]["nonClaims"]
      },
      externalValidationPackage: {
        ...state.acceptanceLayer.externalValidationPackage,
        failIds: [
          ...state.acceptanceLayer.externalValidationPackage.failIds
        ] as M8aV4GroundStationSceneState["acceptanceLayer"]["externalValidationPackage"]["failIds"]
      }
    },
    f09RateSurface: {
      ...state.f09RateSurface,
      rows: state.f09RateSurface.rows.map((row) => ({ ...row }))
    },
    f16ExportSurface: {
      ...state.f16ExportSurface,
      explicitNonClaims: [
        ...state.f16ExportSurface.explicitNonClaims
      ] as M8aV4GroundStationSceneState["f16ExportSurface"]["explicitNonClaims"]
    },
    policyRuleControls: {
      ...state.policyRuleControls,
      activePolicyPreset: state.policyRuleControls.activePolicyPreset,
      activeRulePreset: state.policyRuleControls.activeRulePreset,
      policyPresets: state.policyRuleControls.policyPresets,
      rulePresets: state.policyRuleControls.rulePresets
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

export function notifyListeners(
  listeners: ReadonlySet<(state: M8aV4GroundStationSceneState) => void>,
  state: M8aV4GroundStationSceneState
): void {
  for (const listener of listeners) {
    listener(cloneState(state));
  }
}
