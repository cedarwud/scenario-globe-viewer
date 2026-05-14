import { syncDocumentTelemetry } from "../features/telemetry/document-telemetry";
import {
  M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION
} from "./m8a-v4-ground-station-projection";
import {
  M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY,
  type M8aV4ItriRequirementGroupId
} from "./m8a-v4-itri-demo-surfaces";
import {
  M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
  resolveTimelineLabel
} from "./m8a-v4-product-ux-model";
import {
  M8A_V411_DEMOTED_ACTOR_OPACITY,
  M8A_V411_GLANCE_RANK_SURFACE_VERSION,
  M8A_V411_GROUND_ORBIT_EVIDENCE_TRIPLET,
  M8A_V411_GROUND_STATION_SHORT_CHIP_COPY,
  M8A_V411_GROUND_STATION_SHORT_CHIP_FONT_SIZE_PX,
  M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_HEIGHT_PX,
  M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_WIDTH_PX,
  M8A_V411_SOURCE_PROVENANCE_BADGE,
  resolveM8aV411MicroCueCopy
} from "./m8a-v411-glance-rank-surface";
import {
  M8A_V411_SCENE_CONTEXT_CHIP_COPY,
  M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX,
  M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX,
  M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX,
  M8A_V411_SCENE_CONTEXT_CHIP_VERSION
} from "./m8a-v411-scene-context-chip";
import {
  M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME,
  M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES,
  M8A_V411_VISUAL_TOKENS_VERSION,
  M8A_V411_W3_DISK_RADIUS_METERS
} from "./m8a-v411-visual-tokens";
import {
  M8A_V411_SCENE_CUE_FADE_IN_MS,
  M8A_V411_SCENE_CUE_MAX_HEIGHT_PX,
  M8A_V411_SCENE_CUE_MAX_WIDTH_PX,
  M8A_V411_SCENE_CUE_PERSIST_MS,
  M8A_V411_TRANSIENT_SURFACE_VERSION,
  M8A_V411_TRANSITION_TOAST_DURATION_MS,
  M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO,
  M8A_V411_TRANSITION_TOAST_MAX_COUNT,
  M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX
} from "./m8a-v411-transition-toast";
import {
  M8A_V411_R2_READ_ONLY_CANDIDATES,
  M8A_V411_SOURCES_ROLE_VERSION
} from "./m8a-v411-sources-role";
import type { M8aV4GroundStationSceneState } from "./m8a-v4-ground-station-handover-scene-controller";

function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function syncTelemetry(state: M8aV4GroundStationSceneState): void {
  const transitionEventLayer =
    state.productUx.productComprehension.transitionEventLayer;
  const activeTransitionEvent = transitionEventLayer.activeEvent;
  const sequenceRail =
    state.productUx.productComprehension.handoverSequenceRail;
  const focusChoreography =
    state.productUx.productComprehension.focusChoreography;
  const boundaryAffordance =
    state.productUx.productComprehension.boundaryAffordance;
  const requirementGapSurface = state.requirementGapSurface;
  const acceptanceLayer = state.acceptanceLayer;
  const f09RateSurface = state.f09RateSurface;
  const f16ExportSurface = state.f16ExportSurface;
  const policyRuleControls = state.policyRuleControls;
  const requirementIdsForGroup = (
    groupId: M8aV4ItriRequirementGroupId
  ): readonly string[] =>
    requirementGapSurface.groups.find((group) => group.groupId === groupId)
      ?.requirementIds ?? [];
  const acceptanceLayerVisible =
    state.productUx.disclosure.sourcesRoleState === "open" ||
    (state.productUx.disclosure.detailsSheetState === "open" &&
      state.productUx.disclosure.activeInspectorTab === "evidence");

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
    m8aV4LinkFlowCue: state.relationCues.dataFlowCueVersion,
    m8aV4LinkFlowCueMode: state.relationCues.dataFlowCueMode,
    m8aV4LinkFlowDirections: serializeList([
      ...state.relationCues.dataFlowDirections
    ]),
    m8aV4LinkFlowPulseCount: String(state.relationCues.dataFlowPulseCount),
    m8aV4LinkFlowTruthBoundary:
      state.relationCues.dataFlowTruthBoundary,
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
    m8aV48UiIaVersion: state.productUx.uiIaVersion,
    m8aV48InfoClassSeam: state.productUx.infoClassSeam,
    m8aV48ReviewWindowId: state.productUx.reviewViewModel.windowId,
    m8aV48ReviewStateOrdinal:
      state.productUx.reviewViewModel.stateOrdinalLabel,
    m8aV48ReviewRepresentativeActorId:
      state.productUx.reviewViewModel.representativeActor.actorId,
    m8aV48ReviewCandidateContextActorIds: serializeList(
      state.productUx.reviewViewModel.candidateContextActors.map(
        (actor) => actor.actorId
      )
    ),
    m8aV48ReviewFallbackContextActorIds: serializeList(
      state.productUx.reviewViewModel.fallbackContextActors.map(
        (actor) => actor.actorId
      )
    ),
    m8aV48ReviewRelationCueRole:
      state.productUx.reviewViewModel.relationCueRole.displayLabel,
    m8aV48SceneAnchorState: serializeJson(
      state.productUx.reviewViewModel.sceneAnchorState
    ),
    m8aV49ProductComprehension:
      state.productUx.productComprehension.version,
    m8aV49SliceScope:
      state.productUx.productComprehension.scope,
    m8aV410FirstViewportComposition:
      state.productUx.productComprehension.firstViewportComposition.version,
    m8aV4ItriDemoViewFocusChoreography:
      M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
    m8aV4ItriDemoViewFocusScope: focusChoreography.scope,
    m8aV4ItriDemoViewFocusVisibleContent: serializeList([
      ...focusChoreography.visibleContent
    ]),
    m8aV4ItriDemoViewFocusWindowId: focusChoreography.windowId,
    m8aV4ItriDemoViewFocusId: focusChoreography.focusId,
    m8aV4ItriDemoViewFocusPrimaryLabel:
      focusChoreography.primaryFocusLabel,
    m8aV4ItriDemoViewFocusOrbitClass:
      focusChoreography.focusOrbitClassToken,
    m8aV4ItriDemoViewFocusRole: focusChoreography.focusRole,
    m8aV4ItriDemoViewFocusBriefing: focusChoreography.briefingLine,
    m8aV4ItriDemoViewFocusWatch: focusChoreography.decisionWatch,
    m8aV4ItriDemoViewFocusNext: focusChoreography.nextFocusHint,
    m8aV4ItriDemoViewFocusVisualCue: focusChoreography.visualCue,
    m8aV4ItriDemoViewFocusSceneCue: focusChoreography.sceneCueLabel,
    m8aV4ItriDemoViewFocusSecondaryActorPolicy:
      focusChoreography.secondaryActorPolicy,
    m8aV4ItriDemoViewFocusSecondaryActorRoles: serializeList([
      ...focusChoreography.secondaryActorEmphasisRoles
    ]),
    m8aV4ItriDemoViewFocusNextContextVisible: String(
      focusChoreography.nextContextVisible
    ),
    m8aV4ItriDemoViewFocusTruthBoundary:
      focusChoreography.truthBoundary,
    m8aV4ItriDemoViewDefaultFocus:
      M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
    m8aV4ItriDemoViewNarrow:
      M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION,
    m8aV4ItriDemoViewDefaultLayer:
      "L0-first-read-demo-stage",
    m8aV4ItriDemoViewDefaultInspectorOpen: String(
      state.productUx.disclosure.state === "open"
    ),
    m8aV4ItriDemoViewDefaultRequirementMatrixVisible: String(
      acceptanceLayerVisible
    ),
    m8aV4ItriDemoViewDefaultCurrentState:
      focusChoreography.primaryFocusLabel,
    m8aV4ItriDemoViewDefaultNextState:
      focusChoreography.nextFocusHint,
    m8aV4ItriDemoViewDefaultOrbitClass:
      focusChoreography.focusOrbitClassToken,
    m8aV4ItriDemoViewDefaultRateClass:
      f09RateSurface.currentClassLabel,
    m8aV4ItriDemoViewDefaultTruthBoundary:
      M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY,
    m8aV4ItriDemoViewAcceptanceLayer:
      acceptanceLayer.version,
    m8aV4ItriDemoViewAcceptanceLayerId:
      acceptanceLayer.layerId,
    m8aV4ItriDemoViewAcceptanceVisible: String(acceptanceLayerVisible),
    m8aV4ItriDemoViewAcceptanceRequirementIds: serializeList([
      ...acceptanceLayer.requirementIds
    ]),
    m8aV4ItriDemoViewAcceptanceRequirementStatuses: serializeList([
      ...acceptanceLayer.requirementStatusPairs
    ]),
    m8aV4ItriDemoViewAcceptanceRequirementLayers: serializeList([
      ...acceptanceLayer.requirementLayerPairs
    ]),
    m8aV4ItriDemoViewAcceptanceExternalFailIds: serializeList([
      ...acceptanceLayer.externalFailIds
    ]),
    m8aV4ItriDemoViewAcceptanceBoundedRouteIds: serializeList([
      ...acceptanceLayer.boundedRouteRepresentationIds
    ]),
    m8aV4ItriDemoViewAcceptanceF13Artifact:
      acceptanceLayer.f13Phase71Evidence.artifact,
    m8aV4ItriDemoViewAcceptanceF13FreshUntilUtc:
      acceptanceLayer.f13Phase71Evidence.staleAfterUtc,
    m8aV4ItriDemoViewAcceptanceF13RouteNativeScaleClaimed:
      String(acceptanceLayer.f13Phase71Evidence.routeNativeScaleClaimed),
    m8aV4ItriF13ScaleReadinessSurface:
      acceptanceLayer.f13RouteNativeScaleReadiness.version,
    m8aV4ItriF13ScaleReadinessTargetReached: String(
      acceptanceLayer.f13RouteNativeScaleReadiness.targetReached
    ),
    m8aV4ItriF13ScaleReadinessCurrentRouteActorCount: String(
      acceptanceLayer.f13RouteNativeScaleReadiness.currentRouteActorCount
    ),
    m8aV4ItriF13ScaleReadinessActorCount: String(
      acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount
    ),
    m8aV4ItriF13ScaleReadinessLeoCount: String(
      acceptanceLayer.f13RouteNativeScaleReadiness.readinessLeoActorCount
    ),
    m8aV4ItriF13ScaleReadinessTargetLeoCount: String(
      acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount
    ),
    m8aV4ItriF13ScaleReadinessSourceType:
      acceptanceLayer.f13RouteNativeScaleReadiness.sourceType,
    m8aV4ItriF13ScaleReadinessSourceUrl:
      acceptanceLayer.f13RouteNativeScaleReadiness.sourceUrl,
    m8aV4ItriF13ScaleReadinessPublicSourceUsed: String(
      acceptanceLayer.f13RouteNativeScaleReadiness.publicSourceUsed
    ),
    m8aV4ItriF13ScaleReadinessBuiltAtUtc:
      acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc,
    m8aV4ItriF13ScaleReadinessFreshnessTimestampUtc:
      acceptanceLayer.f13RouteNativeScaleReadiness.freshnessTimestampUtc,
    m8aV4ItriF13ScaleReadinessClosureClaimed: String(
      acceptanceLayer.f13RouteNativeScaleReadiness
        .routeNativeScaleClosureClaimed
    ),
    m8aV4ItriDemoViewAcceptanceExternalValidationArtifact:
      acceptanceLayer.externalValidationPackage.artifact,
    m8aV4ItriDemoViewAcceptanceExternalValidationStatus:
      acceptanceLayer.externalValidationPackage.status,
    m8aV410SliceScope:
      state.productUx.productComprehension.firstViewportComposition.scope,
    m8aV410SceneNarrativeVisibleContent: serializeList([
      ...state.productUx.productComprehension.firstViewportComposition
        .sceneNarrativeVisibleContent
    ]),
    m8aV410ControlsPriority:
      state.productUx.productComprehension.firstViewportComposition
        .controlsPriority,
    m8aV410FirstReadLine:
      state.productUx.productComprehension.activeWindowCopy.firstReadMessage,
    m8aV410WatchCueLine:
      state.productUx.productComprehension.activeWindowCopy.watchCueLabel,
    m8aV410NextLine:
      state.productUx.productComprehension.activeWindowCopy.nextLine,
    m8aV410HandoverSequenceRail: sequenceRail.version,
    m8aV410SequenceRailScope: sequenceRail.scope,
    m8aV410SequenceRailVisibleContent: serializeList([
      ...sequenceRail.visibleContent
    ]),
    m8aV410SequenceRailWindowIds: serializeList([
      ...sequenceRail.windowIds
    ]),
    m8aV410SequenceRailActiveWindowId: sequenceRail.activeWindowId,
    m8aV410SequenceRailNextWindowId: sequenceRail.nextWindowId,
    m8aV410SequenceRailActiveLabel: sequenceRail.activeProductLabel,
    m8aV410SequenceRailNextLabel: sequenceRail.nextProductLabel,
    m8aV410SequenceRailActiveOrdinal: sequenceRail.activeOrdinalLabel,
    m8aV410SequenceRailNextOrdinal: sequenceRail.nextOrdinalLabel,
    m8aV410SequenceRailTransitionFromWindowId:
      sequenceRail.transitionEvent.fromWindowId,
    m8aV410SequenceRailTransitionToWindowId:
      sequenceRail.transitionEvent.toWindowId,
    m8aV410SequenceRailViewportPolicy: sequenceRail.viewportPolicy,
    m8aV410BoundaryAffordance: boundaryAffordance.version,
    m8aV410BoundaryAffordanceScope: boundaryAffordance.scope,
    m8aV410BoundaryVisibleContent: serializeList([
      ...boundaryAffordance.visibleContent
    ]),
    m8aV410BoundaryCompactCopy: boundaryAffordance.compactCopy,
    m8aV410BoundarySecondaryCopy: boundaryAffordance.secondaryCopy,
    m8aV410BoundaryDetailsBehavior:
      boundaryAffordance.detailsBehavior,
    m8aV410BoundarySurfaceState:
      boundaryAffordance.boundarySurfaceState,
    m8aV410DetailsSheetState: boundaryAffordance.detailsSheetState,
    m8aV411GlanceRankSurface: M8A_V411_GLANCE_RANK_SURFACE_VERSION,
    m8aV411SliceScope: "slice1-glance-rank-surface",
    m8aV411SceneMicroCueCopy: resolveM8aV411MicroCueCopy(
      state.productUx.activeWindowId
    ),
    m8aV411SourceProvenanceBadge: M8A_V411_SOURCE_PROVENANCE_BADGE,
    m8aV411GroundOrbitEvidenceTriplet:
      M8A_V411_GROUND_ORBIT_EVIDENCE_TRIPLET,
    m8aV411GroundShortChipCopy: M8A_V411_GROUND_STATION_SHORT_CHIP_COPY,
    m8aV411GroundShortChipMaxWidthPx: String(
      M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_WIDTH_PX
    ),
    m8aV411GroundShortChipMaxHeightPx: String(
      M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_HEIGHT_PX
    ),
    m8aV411GroundShortChipFontSizePx: String(
      M8A_V411_GROUND_STATION_SHORT_CHIP_FONT_SIZE_PX
    ),
    m8aV411DemotedActorOpacity: String(M8A_V411_DEMOTED_ACTOR_OPACITY),
    m8aV411VisualTokens: M8A_V411_VISUAL_TOKENS_VERSION,
    m8aV411VisualTokenScope: "conv1-window-active-token",
    m8aV411VisualTokenDataSourceName:
      M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME,
    m8aV411VisualTokenW3RadiusMeters: String(
      M8A_V411_W3_DISK_RADIUS_METERS
    ),
    m8aV411VisualTokenW1MaxDistanceMeters: String(
      M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w1MaxMeters
    ),
    m8aV411VisualTokenW2MaxDistanceMeters: String(
      M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w2MaxMeters
    ),
    m8aV411VisualTokenW3MaxDistanceMeters: String(
      M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w3MaxMeters
    ),
    m8aV411VisualTokenW4MaxDistanceMeters: String(
      M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w4MaxMeters
    ),
    m8aV411VisualTokenW5MaxDistanceMeters: String(
      M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w5MaxMeters
    ),
    m8aV411SceneContextChip: M8A_V411_SCENE_CONTEXT_CHIP_VERSION,
    m8aV411SceneContextChipCopy: M8A_V411_SCENE_CONTEXT_CHIP_COPY,
    m8aV411SceneContextChipMaxWidthPx: String(
      M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX
    ),
    m8aV411SceneContextChipMaxHeightPx: String(
      M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX
    ),
    m8aV411SceneContextChipFontSizePx: String(
      M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX
    ),
    m8aV411OrbitClassChipCount: String(state.actors.length),
    m8aV411TransientSurface: M8A_V411_TRANSIENT_SURFACE_VERSION,
    m8aV411TransientSurfaceScope: "slice4-transition-toast",
    m8aV411TransitionToastDurationMs: String(
      M8A_V411_TRANSITION_TOAST_DURATION_MS
    ),
    m8aV411TransitionToastMaxCount: String(
      M8A_V411_TRANSITION_TOAST_MAX_COUNT
    ),
    m8aV411TransitionToastMaxWidthPx: String(
      M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX
    ),
    m8aV411TransitionToastMaxCanvasWidthRatio: String(
      M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO
    ),
    m8aV411SceneCueMaxWidthPx: String(M8A_V411_SCENE_CUE_MAX_WIDTH_PX),
    m8aV411SceneCueMaxHeightPx: String(M8A_V411_SCENE_CUE_MAX_HEIGHT_PX),
    m8aV411SceneCueFadeInMs: String(M8A_V411_SCENE_CUE_FADE_IN_MS),
    m8aV411SceneCuePersistMs: String(M8A_V411_SCENE_CUE_PERSIST_MS),
    m8aV411SourcesRole: M8A_V411_SOURCES_ROLE_VERSION,
    m8aV411SourcesRoleState: state.productUx.disclosure.sourcesRoleState,
    m8aV411SourcesFilter: serializeJson(
      state.productUx.disclosure.sourcesFilter
    ),
    m8aV411SourcesTleRowCount: String(state.actorCount),
    m8aV411SourcesGroundStationCount: String(state.endpointCount),
    m8aV411SourcesR2CandidateCount: String(
      M8A_V411_R2_READ_ONLY_CANDIDATES.length
    ),
    m8aV49PersistentAllowedContent: serializeList([
      ...state.productUx.productComprehension.persistentLayer
        .defaultVisibleContent
    ]),
    m8aV49PersistentDeniedDefaultContent: serializeList([
      ...state.productUx.productComprehension.persistentLayer
        .deniedDefaultVisibleContent
    ]),
    m8aV49PersistentTruthAffordance:
      state.productUx.productComprehension.persistentLayer.truthAffordanceLabel,
    m8aV49FirstReadMessage:
      state.productUx.productComprehension.activeWindowCopy.firstReadMessage,
    m8aV49WatchCueLabel:
      state.productUx.productComprehension.activeWindowCopy.watchCueLabel,
    m8aV49OrbitClassToken:
      state.productUx.productComprehension.activeWindowCopy.orbitClassToken,
    m8aV49WindowIds: serializeList(
      state.productUx.productComprehension.windowIds
    ),
    m8aV49SceneNearMeaningLayer:
      state.productUx.productComprehension.sceneNearMeaningLayer.scope,
    m8aV49SceneNearReliableVisibleContent: serializeList([
      ...state.productUx.productComprehension.sceneNearMeaningLayer
        .reliableVisibleContent
    ]),
    m8aV49SceneNearFallbackVisibleContent: serializeList([
      ...state.productUx.productComprehension.sceneNearMeaningLayer
        .fallbackVisibleContent
    ]),
    m8aV49SceneNearReliableAnchorRequired: String(
      state.productUx.productComprehension.sceneNearMeaningLayer
        .reliableAnchorRequired
    ),
    m8aV49SceneNearFallbackPolicy:
      state.productUx.productComprehension.sceneNearMeaningLayer.fallbackPolicy,
    m8aV49SceneNearConnectorPolicy:
      state.productUx.productComprehension.sceneNearMeaningLayer.connectorPolicy,
    m8aV49SceneNearActiveMeaning:
      state.productUx.productComprehension.sceneNearMeaningLayer.activeMeaning,
    m8aV49TransitionEventLayer: transitionEventLayer.scope,
    m8aV49TransitionEventTrigger: transitionEventLayer.trigger,
    m8aV49TransitionEventDurationMs: String(transitionEventLayer.durationMs),
    m8aV49TransitionEventVisibleContent: serializeList([
      ...transitionEventLayer.visibleContent
    ]),
    m8aV49TransitionEventDeniedVisibleContent: serializeList([
      ...transitionEventLayer.deniedVisibleContent
    ]),
    m8aV49TransitionEventVisible: String(Boolean(activeTransitionEvent)),
    m8aV49TransitionEventFromLabel:
      activeTransitionEvent?.fromProductLabel ?? "",
    m8aV49TransitionEventToLabel:
      activeTransitionEvent?.toProductLabel ?? "",
    m8aV49TransitionEventText: activeTransitionEvent?.summaryText ?? "",
    m8aV49TransitionEventContext: activeTransitionEvent?.contextText ?? "",
    m8aV49TransitionEventStateTruthSource:
      transitionEventLayer.currentStateTruthSource,
    m8aV49TransitionEventNonBlocking: transitionEventLayer.blockingPolicy,
    m8aV49InspectorLayer:
      state.productUx.productComprehension.inspectorLayer.scope,
    m8aV410InspectorEvidenceRedesign:
      state.productUx.productComprehension.inspectorLayer
        .v410EvidenceRedesignVersion,
    m8aV410InspectorEvidenceStructure: serializeList([
      ...state.productUx.productComprehension.inspectorLayer.evidenceStructure
    ]),
    m8aV410InspectorFirstReadRole:
      state.productUx.productComprehension.inspectorLayer.firstReadRole,
    m8aV410InspectorDeniedFirstReadRoles: serializeList([
      ...state.productUx.productComprehension.inspectorLayer
        .deniedFirstReadRoles
    ]),
    m8aV410InspectorNotClaimedContent: serializeList([
      ...state.productUx.productComprehension.inspectorLayer.notClaimedContent
    ]),
    m8aV410InspectorSurfaceSeparation:
      state.productUx.productComprehension.inspectorLayer.surfaceSeparation,
    m8aV49InspectorPrimaryVisibleContent: serializeList([
      ...state.productUx.productComprehension.inspectorLayer
        .primaryVisibleContent
    ]),
    m8aV49InspectorDeniedPrimaryContent: serializeList([
      ...state.productUx.productComprehension.inspectorLayer
        .deniedPrimaryVisibleContent
    ]),
    m8aV49InspectorDebugEvidenceContent: serializeList([
      ...state.productUx.productComprehension.inspectorLayer
        .debugEvidenceContent
    ]),
    m8aV49InspectorDebugEvidenceDefaultOpen: String(
      state.productUx.productComprehension.inspectorLayer
        .debugEvidenceDefaultOpen
    ),
    m8aV49InspectorTruthBoundaryPlacement:
      state.productUx.productComprehension.inspectorLayer
        .truthBoundaryPlacement,
    m8aV49InspectorMetadataPolicy:
      state.productUx.productComprehension.inspectorLayer.metadataPolicy,
    m8aV4GroundStationRawItriSideReadOwnership:
      state.sourceLineage.rawPackageSideReadOwnership,
    m8aV4GroundStationRuntimeConsumptionRule:
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.runtimeConsumptionRule,
    m8aV4GroundStationProofSeam: state.proofSeam,
    m8aV4GroundStationNonClaims: serializeJson(state.nonClaims),
    m8aV4ItriRequirementGapSurface: requirementGapSurface.version,
    m8aV4ItriRequirementGapTruthLabels: serializeList([
      ...requirementGapSurface.truthBoundaryLabels
    ]),
    m8aV4ItriRequirementGapGroupIds: serializeList(
      requirementGapSurface.groups.map((group) => group.groupId)
    ),
    m8aV4ItriRequirementGapGroupStatuses: serializeList(
      requirementGapSurface.groups.map((group) => `${group.groupId}:${group.status}`)
    ),
    m8aV4ItriRequirementGapGroupDispositions: serializeList(
      requirementGapSurface.groups.map(
        (group) => `${group.groupId}:${group.disposition}`
      )
    ),
    m8aV4ItriRequirementGapOpenIds: serializeList(
      requirementGapSurface.openRequirementIds
    ),
    m8aV4ItriRequirementGapNotMountedIds: serializeList([
      ...requirementIdsForGroup("not-mounted-route-gap")
    ]),
    m8aV4ItriRequirementGapExternalValidationIds: serializeList([
      ...requirementIdsForGroup("external-validation-gap")
    ]),
    m8aV4ItriRequirementGapRepoSeamIds: serializeList([
      ...requirementIdsForGroup("bounded-repo-owned-seam")
    ]),
    m8aV4ItriRequirementGapBoundedRouteIds: serializeList([
      ...requirementIdsForGroup("bounded-route-representation")
    ]),
    m8aV4ItriRequirementGapRouteBaselineIds: serializeList([
      ...requirementIdsForGroup("route-owned-visual-baseline")
    ]),
    m8aV4ItriDemoPolishDisposition:
      requirementGapSurface.demoPolishDisposition,
    m8aV4ItriRouteNativeMeasuredTruthClaimed: String(
      requirementGapSurface.routeNativeMeasuredTruthClaimed
    ),
    m8aV4ItriF09RateSurface: f09RateSurface.version,
    m8aV4ItriF09RateDisposition: f09RateSurface.disposition,
    m8aV4ItriF09ExternalTruthDisposition:
      f09RateSurface.externalTruthDisposition,
    m8aV4ItriF09CurrentWindowId: f09RateSurface.currentWindowId,
    m8aV4ItriF09CurrentClass: f09RateSurface.currentNetworkSpeedClass,
    m8aV4ItriF09CurrentBucket: f09RateSurface.currentBucketLabel,
    m8aV4ItriF09Provenance: f09RateSurface.provenance,
    m8aV4ItriF09MetricTruth: f09RateSurface.metricTruth,
    m8aV4ItriF09MeasuredThroughputClaimed: String(
      f09RateSurface.measuredThroughputClaimed
    ),
    m8aV4ItriF09WindowClasses: serializeList(
      f09RateSurface.rows.map(
        (row) => `${row.windowId}:${row.networkSpeedClass}`
      )
    ),
    m8aV4ItriF16ExportSurface: f16ExportSurface.version,
    m8aV4ItriF16ExportSchemaVersion: f16ExportSurface.schemaVersion,
    m8aV4ItriF16ExportDisposition: f16ExportSurface.disposition,
    m8aV4ItriF16ExternalTruthDisposition:
      f16ExportSurface.externalTruthDisposition,
    m8aV4ItriF16ExportArtifactTruth: f16ExportSurface.artifactTruth,
    m8aV4ItriF16ExportFormat: f16ExportSurface.exportFormat,
    m8aV4ItriF16RouteOwnedStateOnly: String(
      f16ExportSurface.routeOwnedStateOnly
    ),
    m8aV4ItriF16MeasuredValuesIncluded: String(
      f16ExportSurface.measuredValuesIncluded
    ),
    m8aV4ItriF16ExternalReportTruthClaimed: String(
      f16ExportSurface.externalReportSystemTruthClaimed
    ),
    m8aV4ItriF16LastStatus: f16ExportSurface.lastStatus,
    m8aV4ItriF16LastGeneratedAtUtc: f16ExportSurface.lastGeneratedAtUtc,
    m8aV4ItriF16LastFilename: f16ExportSurface.lastFilename,
    m8aV4ItriPolicyRuleControlsSurface: policyRuleControls.version,
    m8aV4ItriPolicyRuleControlsDisposition:
      policyRuleControls.disposition,
    m8aV4ItriPolicyRuleExternalTruthDisposition:
      policyRuleControls.externalTruthDisposition,
    m8aV4ItriPolicyRuleTruthBoundary:
      policyRuleControls.truthBoundary,
    m8aV4ItriPolicyRuleExportAdjacentTruth:
      policyRuleControls.exportAdjacentTruth,
    m8aV4ItriF10PolicyPresetId:
      policyRuleControls.activePolicyPreset.presetId,
    m8aV4ItriF10PolicyPresetLabel:
      policyRuleControls.activePolicyPreset.label,
    m8aV4ItriF10PolicyPresetMode:
      policyRuleControls.policyPresetMode,
    m8aV4ItriF10PolicyPresetIds: serializeList(
      policyRuleControls.policyPresets.map((preset) => preset.presetId)
    ),
    m8aV4ItriF11RulePresetId:
      policyRuleControls.activeRulePreset.presetId,
    m8aV4ItriF11RulePresetLabel:
      policyRuleControls.activeRulePreset.label,
    m8aV4ItriF11RulePresetMode:
      policyRuleControls.rulePresetMode,
    m8aV4ItriF11RulePresetIds: serializeList(
      policyRuleControls.rulePresets.map((preset) => preset.presetId)
    ),
    m8aV4ItriF11RuleParameterChips: serializeList([
      ...policyRuleControls.activeRulePreset.parameterChips
    ]),
    m8aV4ItriPolicyRuleRouteOwnedStateOnly: String(
      policyRuleControls.routeOwnedStateOnly
    ),
    m8aV4ItriPolicyRuleLiveControlClaimed: String(
      policyRuleControls.liveControlClaimed
    ),
    m8aV4ItriPolicyRuleBackendControlClaimed: String(
      policyRuleControls.backendControlClaimed
    ),
    m8aV4ItriPolicyRuleNetworkControlClaimed: String(
      policyRuleControls.networkControlClaimed
    ),
    m8aV4ItriPolicyRuleArbitraryRuleEditorClaimed: String(
      policyRuleControls.arbitraryRuleEditorClaimed
    ),
    m8aV4ItriPolicyRuleMeasuredDecisionTruthClaimed: String(
      policyRuleControls.measuredDecisionTruthClaimed
    )
  });
}
