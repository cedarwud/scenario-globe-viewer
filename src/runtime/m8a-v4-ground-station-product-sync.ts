import type { Viewer } from "cesium";

import type {
  M8aV4GroundStationSceneState
} from "./m8a-v4-ground-station-scene-state";
import type { EndpointRenderContext } from "./m8a-v4-ground-station-cesium-entities";
import {
  ensureProductUxStructure,
  ensureV410ProductUxStructureReady,
  renderProductUxDetailContent
} from "./m8a-v4-ground-station-product-dom";
import {
  resolveSceneAnnotationPlacement,
  resolveV49SceneNearRenderState
} from "./m8a-v4-ground-station-placement";
import {
  ensureM8aV411GlanceRankStructure,
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
  ensureM8aV411SceneContextChip,
  M8A_V411_SCENE_CONTEXT_CHIP_COPY,
  M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX,
  M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX,
  M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX,
  M8A_V411_SCENE_CONTEXT_CHIP_VERSION,
  syncM8aV411SceneContextChip
} from "./m8a-v411-scene-context-chip";
import {
  M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME,
  M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES,
  M8A_V411_VISUAL_TOKENS_VERSION,
  M8A_V411_W3_DISK_RADIUS_METERS,
  type M8aV411VisualTokenController
} from "./m8a-v411-visual-tokens";
import {
  M8A_V411_HOVER_POPOVER_CONV2_SCHEMA,
  M8A_V411_HOVER_POPOVER_DELAY_MS,
  M8A_V411_HOVER_POPOVER_MAX_HEIGHT_PX,
  M8A_V411_HOVER_POPOVER_MAX_WIDTH_PX,
  M8A_V411_HOVER_POPOVER_VERSION
} from "./m8a-v411-hover-popover";
import {
  M8A_V411_INSPECTOR_CONCURRENCY_CONV2_BEHAVIOR,
  M8A_V411_INSPECTOR_CONCURRENCY_VERSION,
  M8A_V411_INSPECTOR_MAX_CANVAS_WIDTH_RATIO,
  M8A_V411_INSPECTOR_MAX_HEIGHT_CSS,
  M8A_V411_INSPECTOR_MAX_WIDTH_PX,
  M8A_V411_INSPECTOR_PRIMARY_ROLE
} from "./m8a-v411-inspector-concurrency";
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
import { M8A_V411_SOURCES_ROLE_VERSION } from "./m8a-v411-sources-role";
import {
  ensureM8aV411FooterChipRow,
  M8A_V411_FOOTER_CHIP_SYSTEM_VERSION,
  syncM8aV411FooterChipRow
} from "./m8a-v411-footer-chip-system";
import type { M8aV411InspectorTab } from "./m8a-v4-product-ux-model";

const LEGACY_TOKEN_LOWER = "it" + "ri";
const LEGACY_TOKEN_PASCAL =
  LEGACY_TOKEN_LOWER.charAt(0).toUpperCase() + LEGACY_TOKEN_LOWER.slice(1);

export interface ProductUxSyncConfig {
  defaultFocusVersion: string;
  narrowVersion: string;
  defaultTruthCopy: string;
  fullReplaySimulatedSeconds: number;
}

function legacyDataKey(prefix: string, suffix: string): string {
  return `${prefix}${LEGACY_TOKEN_PASCAL}${suffix}`;
}

function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}

export function renderProductUx(
  root: HTMLElement,
  state: M8aV4GroundStationSceneState,
  viewer: Viewer,
  visualTokenController: M8aV411VisualTokenController,
  sceneEndpoints: ReadonlyArray<EndpointRenderContext>,
  config: ProductUxSyncConfig
): void {
  const productUx = state.productUx;
  const activeMultiplier = productUx.playback.multiplier;
  const playbackAction =
    productUx.playback.status === "playing" ? "pause" : "play";
  const playbackLabel =
    productUx.playback.status === "playing" ? "Pause" : "Play";
  const review = productUx.reviewViewModel;
  const comprehension = productUx.productComprehension;
  const focusChoreography = comprehension.focusChoreography;
  const sequenceRail = comprehension.handoverSequenceRail;
  const boundaryAffordance = comprehension.boundaryAffordance;
  const candidateActorIds = review.candidateContextActors.map(
    (actor) => actor.actorId
  );
  const fallbackActorIds = review.fallbackContextActors.map(
    (actor) => actor.actorId
  );
  const stateEvidenceOpen =
    productUx.disclosure.detailsSheetState === "open";
  const truthBoundaryOpen =
    productUx.disclosure.boundarySurfaceState === "open";
  const sourcesRoleOpen = productUx.disclosure.sourcesRoleState === "open";
  const sheetOpen = stateEvidenceOpen || truthBoundaryOpen || sourcesRoleOpen;
  const progressValue = productUx.playback.replayRatio.toFixed(6);
  const placement = resolveSceneAnnotationPlacement(state, viewer);
  const sceneNear = resolveV49SceneNearRenderState(
    comprehension,
    review,
    placement
  );
  const microCueCopy = resolveM8aV411MicroCueCopy(productUx.activeWindowId);
  const transitionEvent = comprehension.transitionEventLayer.activeEvent;
  const transitionEventVisible = Boolean(transitionEvent);
  const selectedInspectorTab: M8aV411InspectorTab = sourcesRoleOpen
    ? "evidence"
    : productUx.disclosure.activeInspectorTab;
  const decisionPanelOpen =
    sheetOpen &&
    (truthBoundaryOpen ||
      (stateEvidenceOpen && selectedInspectorTab === "decision"));
  const metricsPanelOpen =
    sheetOpen && stateEvidenceOpen && selectedInspectorTab === "metrics";
  const boundaryPanelOpen = sheetOpen && truthBoundaryOpen;
  const evidencePanelOpen =
    sheetOpen &&
    (sourcesRoleOpen ||
      (stateEvidenceOpen && selectedInspectorTab === "evidence"));
  const requirementGapSurface = state.requirementGapSurface;
  const acceptanceLayer = state.acceptanceLayer;
  const f09RateSurface = state.f09RateSurface;
  const f16ExportSurface = state.f16ExportSurface;
  const policyRuleControls = state.policyRuleControls;
  const requirementIdsForGroup = (
    groupId: string
  ): readonly string[] =>
    requirementGapSurface.groups.find((group) => group.groupId === groupId)
      ?.requirementIds ?? [];

  ensureProductUxStructure(root);
  ensureV410ProductUxStructureReady(root);
  ensureM8aV411GlanceRankStructure(root);
  ensureM8aV411SceneContextChip(root);
  syncM8aV411SceneContextChip(root);
  ensureM8aV411FooterChipRow(root);
  syncM8aV411FooterChipRow(root, {
    activeWindowId: productUx.activeWindowId,
    actorCount: state.actorCount,
    boundaryDisclosureOpen: truthBoundaryOpen
  });
  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  root.dataset.viewportClass = productUx.layout.viewportClass;
  root.dataset.playbackStatus = productUx.playback.status;
  root.dataset.playbackMultiplier = String(activeMultiplier);
  root.dataset.activeWindowId = productUx.activeWindowId;
  root.dataset.activeProductLabel = productUx.activeProductLabel;
  root.dataset.finalHoldActive = String(productUx.playback.finalHoldActive);
  root.dataset.replayProgressRatio = progressValue;
  root.dataset.truthDisclosure = productUx.disclosure.state;
  root.dataset.m8aV410DetailsSheetState =
    productUx.disclosure.detailsSheetState;
  root.dataset.m8aV410BoundarySurfaceState =
    productUx.disclosure.boundarySurfaceState;
  root.dataset.normalControlsExposeDebugMultiplier = "false";
  root.dataset.m8aV48UiIaVersion = productUx.uiIaVersion;
  root.dataset.m8aV48InfoClassSeam = productUx.infoClassSeam;
  root.dataset.m8aV48InfoClassValues = serializeList(productUx.infoClassValues);
  root.dataset.m8aV49ProductComprehension = comprehension.version;
  root.dataset.m8aV49SliceScope = comprehension.scope;
  root.dataset.m8aV410FirstViewportComposition =
    comprehension.firstViewportComposition.version;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusChoreography")] =
    focusChoreography.version;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusScope")] = focusChoreography.scope;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusVisibleContent")] = serializeList([
    ...focusChoreography.visibleContent
  ]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusWindowId")] =
    focusChoreography.windowId;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusId")] = focusChoreography.focusId;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusPrimaryLabel")] =
    focusChoreography.primaryFocusLabel;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusOrbitClass")] =
    focusChoreography.focusOrbitClassToken;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusRole")] =
    focusChoreography.focusRole;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusBriefing")] =
    focusChoreography.briefingLine;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusWatch")] =
    focusChoreography.decisionWatch;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusNext")] =
    focusChoreography.nextFocusHint;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusVisualCue")] =
    focusChoreography.visualCue;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusSceneCue")] =
    focusChoreography.sceneCueLabel;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusSecondaryActorPolicy")] =
    focusChoreography.secondaryActorPolicy;
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusSecondaryActorRoles")] = serializeList([
    ...focusChoreography.secondaryActorEmphasisRoles
  ]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusNextContextVisible")] = String(
    focusChoreography.nextContextVisible
  );
  root.dataset[legacyDataKey("m8aV4", "DemoViewFocusTruthBoundary")] =
    focusChoreography.truthBoundary;
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultFocus")] =
    config.defaultFocusVersion;
  root.dataset[legacyDataKey("m8aV4", "DemoViewNarrow")] =
    config.narrowVersion;
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultLayer")] =
    "L0-first-read-demo-stage";
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultInspectorOpen")] = String(sheetOpen);
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultRequirementMatrixVisible")] =
    String(evidencePanelOpen);
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultCurrentState")] =
    focusChoreography.primaryFocusLabel;
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultNextState")] =
    focusChoreography.nextFocusHint;
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultOrbitClass")] =
    focusChoreography.focusOrbitClassToken;
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultRateClass")] =
    f09RateSurface.currentClassLabel;
  root.dataset[legacyDataKey("m8aV4", "DemoViewDefaultTruthBoundary")] =
    config.defaultTruthCopy;
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceLayer")] =
    acceptanceLayer.version;
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceLayerId")] =
    acceptanceLayer.layerId;
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceVisible")] =
    String(evidencePanelOpen);
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceRequirementIds")] = serializeList([
    ...acceptanceLayer.requirementIds
  ]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceRequirementStatuses")] =
    serializeList([...acceptanceLayer.requirementStatusPairs]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceRequirementLayers")] =
    serializeList([...acceptanceLayer.requirementLayerPairs]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceExternalFailIds")] = serializeList([
    ...acceptanceLayer.externalFailIds
  ]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceBoundedRouteIds")] = serializeList([
    ...acceptanceLayer.boundedRouteRepresentationIds
  ]);
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceF13Artifact")] =
    acceptanceLayer.f13Phase71Evidence.artifact;
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceF13FreshUntilUtc")] =
    acceptanceLayer.f13Phase71Evidence.staleAfterUtc;
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceF13RouteNativeScaleClaimed")] =
    String(acceptanceLayer.f13Phase71Evidence.routeNativeScaleClaimed);
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessSurface")] =
    acceptanceLayer.f13RouteNativeScaleReadiness.version;
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessTargetReached")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetReached
  );
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessCurrentRouteActorCount")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.currentRouteActorCount
  );
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessActorCount")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount
  );
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessLeoCount")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessLeoActorCount
  );
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessTargetLeoCount")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount
  );
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessSourceType")] =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceType;
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessSourceUrl")] =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceUrl;
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessPublicSourceUsed")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.publicSourceUsed
  );
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessBuiltAtUtc")] =
    acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc;
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessFreshnessTimestampUtc")] =
    acceptanceLayer.f13RouteNativeScaleReadiness.freshnessTimestampUtc;
  root.dataset[legacyDataKey("m8aV4", "F13ScaleReadinessClosureClaimed")] = String(
    acceptanceLayer.f13RouteNativeScaleReadiness
      .routeNativeScaleClosureClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceExternalValidationArtifact")] =
    acceptanceLayer.externalValidationPackage.artifact;
  root.dataset[legacyDataKey("m8aV4", "DemoViewAcceptanceExternalValidationStatus")] =
    acceptanceLayer.externalValidationPackage.status;
  root.dataset.m8aV410SliceScope =
    comprehension.firstViewportComposition.scope;
  root.dataset.m8aV410SceneNarrativeVisibleContent = serializeList([
    ...comprehension.firstViewportComposition.sceneNarrativeVisibleContent
  ]);
  root.dataset.m8aV410ControlsPriority =
    comprehension.firstViewportComposition.controlsPriority;
  root.dataset.m8aV410SequenceRailScope =
    comprehension.firstViewportComposition.sequenceRailScope;
  root.dataset.m8aV410InspectorDefaultOpen = String(
    comprehension.firstViewportComposition.inspectorDefaultOpen
  );
  root.dataset.m8aV410HandoverSequenceRail = sequenceRail.version;
  root.dataset.m8aV410SequenceRailScope = sequenceRail.scope;
  root.dataset.m8aV410SequenceRailVisibleContent = serializeList([
    ...sequenceRail.visibleContent
  ]);
  root.dataset.m8aV410SequenceRailWindowIds = serializeList([
    ...sequenceRail.windowIds
  ]);
  root.dataset.m8aV410SequenceRailActiveWindowId =
    sequenceRail.activeWindowId;
  root.dataset.m8aV410SequenceRailNextWindowId = sequenceRail.nextWindowId;
  root.dataset.m8aV410SequenceRailActiveLabel =
    sequenceRail.activeProductLabel;
  root.dataset.m8aV410SequenceRailNextLabel = sequenceRail.nextProductLabel;
  root.dataset.m8aV410SequenceRailActiveOrdinal =
    sequenceRail.activeOrdinalLabel;
  root.dataset.m8aV410SequenceRailNextOrdinal = sequenceRail.nextOrdinalLabel;
  root.dataset.m8aV410SequenceRailTransitionFromWindowId =
    sequenceRail.transitionEvent.fromWindowId;
  root.dataset.m8aV410SequenceRailTransitionToWindowId =
    sequenceRail.transitionEvent.toWindowId;
  root.dataset.m8aV410SequenceRailViewportPolicy =
    sequenceRail.viewportPolicy;
  root.dataset.m8aV410BoundaryAffordance = boundaryAffordance.version;
  root.dataset.m8aV410BoundaryAffordanceScope =
    boundaryAffordance.scope;
  root.dataset.m8aV410BoundaryVisibleContent = serializeList([
    ...boundaryAffordance.visibleContent
  ]);
  root.dataset.m8aV410BoundaryCompactCopy =
    boundaryAffordance.compactCopy;
  root.dataset.m8aV410BoundarySecondaryCopy =
    boundaryAffordance.secondaryCopy;
  root.dataset.m8aV410BoundaryDetailsBehavior =
    boundaryAffordance.detailsBehavior;
  root.dataset.m8aV410BoundaryFullTruthDisclosurePlacement =
    boundaryAffordance.fullTruthDisclosurePlacement;
  root.dataset.m8aV410BoundaryForbiddenBehavior = serializeList([
    ...boundaryAffordance.forbiddenBehavior
  ]);
  root.dataset.m8aV411GlanceRankSurface =
    M8A_V411_GLANCE_RANK_SURFACE_VERSION;
  root.dataset.m8aV411SliceScope = "slice1-glance-rank-surface";
  root.dataset.m8aV411SceneMicroCueCopy = microCueCopy;
  root.dataset.m8aV411SceneMicroCueBudget = "max-width-180px|max-height-24px";
  root.dataset.m8aV411SourceProvenanceBadge =
    M8A_V411_SOURCE_PROVENANCE_BADGE;
  root.dataset.m8aV411GroundOrbitEvidenceTriplet =
    M8A_V411_GROUND_ORBIT_EVIDENCE_TRIPLET;
  root.dataset.m8aV411GroundShortChipCopy =
    M8A_V411_GROUND_STATION_SHORT_CHIP_COPY;
  root.dataset.m8aV411GroundShortChipMaxWidthPx = String(
    M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_WIDTH_PX
  );
  root.dataset.m8aV411GroundShortChipMaxHeightPx = String(
    M8A_V411_GROUND_STATION_SHORT_CHIP_MAX_HEIGHT_PX
  );
  root.dataset.m8aV411GroundShortChipFontSizePx = String(
    M8A_V411_GROUND_STATION_SHORT_CHIP_FONT_SIZE_PX
  );
  root.dataset.m8aV411DemotedActorOpacity = String(
    M8A_V411_DEMOTED_ACTOR_OPACITY
  );
  root.dataset.m8aV411OrbitClassChipCount = String(state.actors.length);
  root.dataset.m8aV411VisualTokens = M8A_V411_VISUAL_TOKENS_VERSION;
  root.dataset.m8aV411VisualTokenScope = "conv1-window-active-token";
  root.dataset.m8aV411VisualTokenDataSourceName =
    M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME;
  root.dataset.m8aV411VisualTokenActiveId =
    visualTokenController.getActiveTokenId() ?? "none";
  root.dataset.m8aV411VisualTokenW3RadiusMeters = String(
    M8A_V411_W3_DISK_RADIUS_METERS
  );
  root.dataset.m8aV411VisualTokenW1MaxDistanceMeters = String(
    M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w1MaxMeters
  );
  root.dataset.m8aV411VisualTokenW2MaxDistanceMeters = String(
    M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w2MaxMeters
  );
  root.dataset.m8aV411VisualTokenW3MaxDistanceMeters = String(
    M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w3MaxMeters
  );
  root.dataset.m8aV411VisualTokenW4MaxDistanceMeters = String(
    M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w4MaxMeters
  );
  root.dataset.m8aV411VisualTokenW5MaxDistanceMeters = String(
    M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES.w5MaxMeters
  );
  root.dataset.m8aV411SceneContextChip =
    M8A_V411_SCENE_CONTEXT_CHIP_VERSION;
  root.dataset.m8aV411SceneContextChipCopy =
    M8A_V411_SCENE_CONTEXT_CHIP_COPY;
  root.dataset.m8aV411SceneContextChipMaxWidthPx = String(
    M8A_V411_SCENE_CONTEXT_CHIP_MAX_WIDTH_PX
  );
  root.dataset.m8aV411SceneContextChipMaxHeightPx = String(
    M8A_V411_SCENE_CONTEXT_CHIP_MAX_HEIGHT_PX
  );
  root.dataset.m8aV411SceneContextChipFontSizePx = String(
    M8A_V411_SCENE_CONTEXT_CHIP_FONT_SIZE_PX
  );
  root.dataset.m8aV411HoverPopover = M8A_V411_HOVER_POPOVER_VERSION;
  root.dataset.m8aV411HoverSliceScope = "slice2-hover-popover";
  root.dataset.m8aV411HoverConv2Schema = M8A_V411_HOVER_POPOVER_CONV2_SCHEMA;
  root.dataset.m8aV411HoverDelayMs = String(M8A_V411_HOVER_POPOVER_DELAY_MS);
  root.dataset.m8aV411HoverPopoverMaxWidthPx = String(
    M8A_V411_HOVER_POPOVER_MAX_WIDTH_PX
  );
  root.dataset.m8aV411HoverPopoverMaxHeightPx = String(
    M8A_V411_HOVER_POPOVER_MAX_HEIGHT_PX
  );
  root.dataset.m8aV411InspectorConcurrency =
    M8A_V411_INSPECTOR_CONCURRENCY_VERSION;
  root.dataset.m8aV411InspectorSliceScope =
    "slice3-inspector-concurrency";
  root.dataset.m8aV411InspectorConv2Behavior =
    M8A_V411_INSPECTOR_CONCURRENCY_CONV2_BEHAVIOR;
  root.dataset.m8aV411InspectorPrimaryRole = M8A_V411_INSPECTOR_PRIMARY_ROLE;
  root.dataset.m8aV411InspectorRoles = serializeList([
    "state-evidence",
    "truth-boundary",
    "sources"
  ]);
  root.dataset.m8aV411InspectorStateEvidenceState =
    productUx.disclosure.detailsSheetState;
  root.dataset.m8aV411InspectorTruthBoundaryState =
    productUx.disclosure.boundarySurfaceState;
  root.dataset.m8aV411InspectorActiveTab = selectedInspectorTab;
  root.dataset.m8aV411InspectorVisiblePanels = serializeList(
    [
      decisionPanelOpen ? "decision" : "",
      metricsPanelOpen ? "metrics" : "",
      boundaryPanelOpen ? "boundary" : "",
      evidencePanelOpen ? "evidence" : ""
    ].filter(Boolean)
  );
  root.dataset.m8aV411FooterChipSystem = M8A_V411_FOOTER_CHIP_SYSTEM_VERSION;
  root.dataset.m8aV411FooterChipTruthButtonRemoved = "true";
  root.dataset.m8aV411SourcesRole = M8A_V411_SOURCES_ROLE_VERSION;
  root.dataset.m8aV411SourcesAffordance =
    "advanced-source-provenance-toggle-only";
  root.dataset.m8aV411SourcesRoleState =
    productUx.disclosure.sourcesRoleState;
  root.dataset.m8aV411SourcesFilter = JSON.stringify(
    productUx.disclosure.sourcesFilter
  );
  root.dataset.m8aV411InspectorCombinedOpen = String(sheetOpen);
  root.dataset.m8aV411InspectorImplementationEvidenceDefaultOpen = String(
    comprehension.inspectorLayer.debugEvidenceDefaultOpen
  );
  root.dataset.m8aV411InspectorMaxWidthPx = String(
    M8A_V411_INSPECTOR_MAX_WIDTH_PX
  );
  root.dataset.m8aV411InspectorMaxHeightCss =
    M8A_V411_INSPECTOR_MAX_HEIGHT_CSS;
  root.dataset.m8aV411InspectorMaxCanvasWidthRatio = String(
    M8A_V411_INSPECTOR_MAX_CANVAS_WIDTH_RATIO
  );
  root.dataset.m8aV411TransientSurface =
    M8A_V411_TRANSIENT_SURFACE_VERSION;
  root.dataset.m8aV411TransientSurfaceScope = "slice4-transition-toast";
  root.dataset.m8aV411TransitionToastDurationMs = String(
    M8A_V411_TRANSITION_TOAST_DURATION_MS
  );
  root.dataset.m8aV411TransitionToastMaxCount = String(
    M8A_V411_TRANSITION_TOAST_MAX_COUNT
  );
  root.dataset.m8aV411TransitionToastMaxWidthPx = String(
    M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX
  );
  root.dataset.m8aV411TransitionToastMaxCanvasWidthRatio = String(
    M8A_V411_TRANSITION_TOAST_MAX_CANVAS_WIDTH_RATIO
  );
  root.dataset.m8aV411SceneCueMaxWidthPx = String(
    M8A_V411_SCENE_CUE_MAX_WIDTH_PX
  );
  root.dataset.m8aV411SceneCueMaxHeightPx = String(
    M8A_V411_SCENE_CUE_MAX_HEIGHT_PX
  );
  root.dataset.m8aV411SceneCueFadeInMs = String(
    M8A_V411_SCENE_CUE_FADE_IN_MS
  );
  root.dataset.m8aV411SceneCuePersistMs = String(
    M8A_V411_SCENE_CUE_PERSIST_MS
  );
  root.dataset.m8aV49WindowIds = serializeList(comprehension.windowIds);
  root.dataset.m8aV49FirstReadMessage =
    comprehension.activeWindowCopy.firstReadMessage;
  root.dataset.m8aV49WatchCueLabel =
    comprehension.activeWindowCopy.watchCueLabel;
  root.dataset.m8aV410FirstReadLine =
    comprehension.activeWindowCopy.firstReadMessage;
  root.dataset.m8aV410WatchCueLine =
    comprehension.activeWindowCopy.watchCueLabel;
  root.dataset.m8aV410NextLine =
    comprehension.activeWindowCopy.nextLine;
  root.dataset.m8aV49OrbitClassToken =
    comprehension.activeWindowCopy.orbitClassToken;
  root.dataset.m8aV49PersistentAllowedContent = serializeList([
    ...comprehension.persistentLayer.defaultVisibleContent
  ]);
  root.dataset.m8aV49PersistentDeniedDefaultContent = serializeList([
    ...comprehension.persistentLayer.deniedDefaultVisibleContent
  ]);
  root.dataset.m8aV49PersistentTruthAffordance =
    comprehension.persistentLayer.truthAffordanceLabel;
  root.dataset.m8aV49SceneNearMeaningLayer =
    comprehension.sceneNearMeaningLayer.scope;
  root.dataset.m8aV49SceneNearReliableVisibleContent = serializeList([
    ...comprehension.sceneNearMeaningLayer.reliableVisibleContent
  ]);
  root.dataset.m8aV49SceneNearFallbackVisibleContent = serializeList([
    ...comprehension.sceneNearMeaningLayer.fallbackVisibleContent
  ]);
  root.dataset.m8aV49SceneNearReliableAnchorRequired = String(
    comprehension.sceneNearMeaningLayer.reliableAnchorRequired
  );
  root.dataset.m8aV49SceneNearFallbackPolicy =
    comprehension.sceneNearMeaningLayer.fallbackPolicy;
  root.dataset.m8aV49SceneNearConnectorPolicy =
    comprehension.sceneNearMeaningLayer.connectorPolicy;
  root.dataset.m8aV49SceneNearActiveMeaning =
    comprehension.sceneNearMeaningLayer.activeMeaning;
  root.dataset.m8aV49SceneNearMode = sceneNear.mode;
  root.dataset.m8aV49SceneNearMeaningVisible = String(
    sceneNear.meaningVisible
  );
  root.dataset.m8aV49SceneNearCueVisible = String(sceneNear.cueVisible);
  root.dataset.m8aV49SceneNearFallbackVisible = String(
    sceneNear.fallbackVisible
  );
  root.dataset.m8aV49SceneNearAttachmentClaim =
    sceneNear.attachmentClaim;
  root.dataset.m8aV49TransitionEventLayer =
    comprehension.transitionEventLayer.scope;
  root.dataset.m8aV49TransitionEventTrigger =
    comprehension.transitionEventLayer.trigger;
  root.dataset.m8aV49TransitionEventDurationMs = String(
    comprehension.transitionEventLayer.durationMs
  );
  root.dataset.m8aV49TransitionEventVisibleContent = serializeList([
    ...comprehension.transitionEventLayer.visibleContent
  ]);
  root.dataset.m8aV49TransitionEventDeniedVisibleContent = serializeList([
    ...comprehension.transitionEventLayer.deniedVisibleContent
  ]);
  root.dataset.m8aV49TransitionEventVisible =
    String(transitionEventVisible);
  root.dataset.m8aV49TransitionEventFromLabel =
    transitionEvent?.fromProductLabel ?? "";
  root.dataset.m8aV49TransitionEventToLabel =
    transitionEvent?.toProductLabel ?? "";
  root.dataset.m8aV49TransitionEventText =
    transitionEvent?.summaryText ?? "";
  root.dataset.m8aV49TransitionEventContext =
    transitionEvent?.contextText ?? "";
  root.dataset.m8aV49TransitionEventStateTruthSource =
    comprehension.transitionEventLayer.currentStateTruthSource;
  root.dataset.m8aV49TransitionEventNonBlocking =
    comprehension.transitionEventLayer.blockingPolicy;
  root.dataset.m8aV49InspectorLayer = comprehension.inspectorLayer.scope;
  root.dataset.m8aV410InspectorEvidenceRedesign =
    comprehension.inspectorLayer.v410EvidenceRedesignVersion;
  root.dataset.m8aV410InspectorEvidenceStructure = serializeList([
    ...comprehension.inspectorLayer.evidenceStructure
  ]);
  root.dataset.m8aV410InspectorFirstReadRole =
    comprehension.inspectorLayer.firstReadRole;
  root.dataset.m8aV410InspectorDeniedFirstReadRoles = serializeList([
    ...comprehension.inspectorLayer.deniedFirstReadRoles
  ]);
  root.dataset.m8aV410InspectorNotClaimedContent = serializeList([
    ...comprehension.inspectorLayer.notClaimedContent
  ]);
  root.dataset.m8aV410InspectorSurfaceSeparation =
    comprehension.inspectorLayer.surfaceSeparation;
  root.dataset.m8aV49InspectorPrimaryVisibleContent = serializeList([
    ...comprehension.inspectorLayer.primaryVisibleContent
  ]);
  root.dataset.m8aV49InspectorDeniedPrimaryContent = serializeList([
    ...comprehension.inspectorLayer.deniedPrimaryVisibleContent
  ]);
  root.dataset.m8aV49InspectorDebugEvidenceContent = serializeList([
    ...comprehension.inspectorLayer.debugEvidenceContent
  ]);
  root.dataset.m8aV49InspectorDebugEvidenceDefaultOpen = String(
    comprehension.inspectorLayer.debugEvidenceDefaultOpen
  );
  root.dataset.m8aV49InspectorTruthBoundaryPlacement =
    comprehension.inspectorLayer.truthBoundaryPlacement;
  root.dataset.m8aV49InspectorMetadataPolicy =
    comprehension.inspectorLayer.metadataPolicy;
  root.dataset.m8aV48ReviewWindowId = review.windowId;
  root.dataset.m8aV48ReviewRepresentativeActorId =
    review.representativeActor.actorId;
  root.dataset.m8aV48ReviewCandidateContextActorIds =
    serializeList(candidateActorIds);
  root.dataset.m8aV48ReviewFallbackContextActorIds =
    serializeList(fallbackActorIds);
  root.dataset.m8aV48SceneAnchorState = review.sceneAnchorState.state;
  root.dataset.m8aV48SelectedAnchorType = placement.selectedAnchorType;
  root.dataset.m8aV48SelectedActorId = placement.selectedActorId;
  root.dataset.m8aV48SelectedRelationCueId = placement.selectedRelationCueId;
  root.dataset.m8aV48SelectedCorridorId = placement.selectedCorridorId;
  root.dataset.m8aV48AnchorStatus = placement.anchorStatus;
  root.dataset.m8aV48FallbackReason = placement.fallbackReason;
  root.dataset[legacyDataKey("m8aV4", "RequirementGapSurface")] =
    requirementGapSurface.version;
  root.dataset[legacyDataKey("m8aV4", "RequirementGapTruthLabels")] = serializeList([
    ...requirementGapSurface.truthBoundaryLabels
  ]);
  root.dataset[legacyDataKey("m8aV4", "RequirementGapGroupIds")] = serializeList(
    requirementGapSurface.groups.map((group) => group.groupId)
  );
  root.dataset[legacyDataKey("m8aV4", "RequirementGapGroupStatuses")] = serializeList(
    requirementGapSurface.groups.map((group) => `${group.groupId}:${group.status}`)
  );
  root.dataset[legacyDataKey("m8aV4", "RequirementGapGroupDispositions")] = serializeList(
    requirementGapSurface.groups.map(
      (group) => `${group.groupId}:${group.disposition}`
    )
  );
  root.dataset[legacyDataKey("m8aV4", "RequirementGapOpenIds")] = serializeList(
    requirementGapSurface.openRequirementIds
  );
  root.dataset[legacyDataKey("m8aV4", "RequirementGapNotMountedIds")] = serializeList([
    ...requirementIdsForGroup("not-mounted-route-gap")
  ]);
  root.dataset[legacyDataKey("m8aV4", "RequirementGapExternalValidationIds")] = serializeList([
    ...requirementIdsForGroup("external-validation-gap")
  ]);
  root.dataset[legacyDataKey("m8aV4", "RequirementGapRepoSeamIds")] = serializeList([
    ...requirementIdsForGroup("bounded-repo-owned-seam")
  ]);
  root.dataset[legacyDataKey("m8aV4", "RequirementGapBoundedRouteIds")] = serializeList([
    ...requirementIdsForGroup("bounded-route-representation")
  ]);
  root.dataset[legacyDataKey("m8aV4", "RequirementGapRouteBaselineIds")] = serializeList([
    ...requirementIdsForGroup("route-owned-visual-baseline")
  ]);
  root.dataset[legacyDataKey("m8aV4", "DemoPolishDisposition")] =
    requirementGapSurface.demoPolishDisposition;
  root.dataset[legacyDataKey("m8aV4", "RouteNativeMeasuredTruthClaimed")] = String(
    requirementGapSurface.routeNativeMeasuredTruthClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "F09RateSurface")] = f09RateSurface.version;
  root.dataset[legacyDataKey("m8aV4", "F09RateDisposition")] = f09RateSurface.disposition;
  root.dataset[legacyDataKey("m8aV4", "F09ExternalTruthDisposition")] =
    f09RateSurface.externalTruthDisposition;
  root.dataset[legacyDataKey("m8aV4", "F09CurrentWindowId")] = f09RateSurface.currentWindowId;
  root.dataset[legacyDataKey("m8aV4", "F09CurrentClass")] =
    f09RateSurface.currentNetworkSpeedClass;
  root.dataset[legacyDataKey("m8aV4", "F09CurrentBucket")] =
    f09RateSurface.currentBucketLabel;
  root.dataset[legacyDataKey("m8aV4", "F09Provenance")] = f09RateSurface.provenance;
  root.dataset[legacyDataKey("m8aV4", "F09MetricTruth")] = f09RateSurface.metricTruth;
  root.dataset[legacyDataKey("m8aV4", "F09MeasuredThroughputClaimed")] = String(
    f09RateSurface.measuredThroughputClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "F09WindowClasses")] = serializeList(
    f09RateSurface.rows.map(
      (row) => `${row.windowId}:${row.networkSpeedClass}`
    )
  );
  root.dataset[legacyDataKey("m8aV4", "F16ExportSurface")] = f16ExportSurface.version;
  root.dataset[legacyDataKey("m8aV4", "F16ExportSchemaVersion")] =
    f16ExportSurface.schemaVersion;
  root.dataset[legacyDataKey("m8aV4", "F16ExportDisposition")] =
    f16ExportSurface.disposition;
  root.dataset[legacyDataKey("m8aV4", "F16ExternalTruthDisposition")] =
    f16ExportSurface.externalTruthDisposition;
  root.dataset[legacyDataKey("m8aV4", "F16ExportArtifactTruth")] =
    f16ExportSurface.artifactTruth;
  root.dataset[legacyDataKey("m8aV4", "F16ExportFormat")] = f16ExportSurface.exportFormat;
  root.dataset[legacyDataKey("m8aV4", "F16RouteOwnedStateOnly")] = String(
    f16ExportSurface.routeOwnedStateOnly
  );
  root.dataset[legacyDataKey("m8aV4", "F16MeasuredValuesIncluded")] = String(
    f16ExportSurface.measuredValuesIncluded
  );
  root.dataset[legacyDataKey("m8aV4", "F16ExternalReportTruthClaimed")] = String(
    f16ExportSurface.externalReportSystemTruthClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "F16LastStatus")] = f16ExportSurface.lastStatus;
  root.dataset[legacyDataKey("m8aV4", "F16LastGeneratedAtUtc")] =
    f16ExportSurface.lastGeneratedAtUtc;
  root.dataset[legacyDataKey("m8aV4", "F16LastFilename")] = f16ExportSurface.lastFilename;
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleControlsSurface")] =
    policyRuleControls.version;
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleControlsDisposition")] =
    policyRuleControls.disposition;
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleExternalTruthDisposition")] =
    policyRuleControls.externalTruthDisposition;
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleTruthBoundary")] =
    policyRuleControls.truthBoundary;
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleExportAdjacentTruth")] =
    policyRuleControls.exportAdjacentTruth;
  root.dataset[legacyDataKey("m8aV4", "F10PolicyPresetId")] =
    policyRuleControls.activePolicyPreset.presetId;
  root.dataset[legacyDataKey("m8aV4", "F10PolicyPresetLabel")] =
    policyRuleControls.activePolicyPreset.label;
  root.dataset[legacyDataKey("m8aV4", "F10PolicyPresetMode")] =
    policyRuleControls.policyPresetMode;
  root.dataset[legacyDataKey("m8aV4", "F10PolicyPresetIds")] = serializeList(
    policyRuleControls.policyPresets.map((preset) => preset.presetId)
  );
  root.dataset[legacyDataKey("m8aV4", "F11RulePresetId")] =
    policyRuleControls.activeRulePreset.presetId;
  root.dataset[legacyDataKey("m8aV4", "F11RulePresetLabel")] =
    policyRuleControls.activeRulePreset.label;
  root.dataset[legacyDataKey("m8aV4", "F11RulePresetMode")] =
    policyRuleControls.rulePresetMode;
  root.dataset[legacyDataKey("m8aV4", "F11RulePresetIds")] = serializeList(
    policyRuleControls.rulePresets.map((preset) => preset.presetId)
  );
  root.dataset[legacyDataKey("m8aV4", "F11RuleParameterChips")] = serializeList([
    ...policyRuleControls.activeRulePreset.parameterChips
  ]);
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleRouteOwnedStateOnly")] = String(
    policyRuleControls.routeOwnedStateOnly
  );
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleLiveControlClaimed")] = String(
    policyRuleControls.liveControlClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleBackendControlClaimed")] = String(
    policyRuleControls.backendControlClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleNetworkControlClaimed")] = String(
    policyRuleControls.networkControlClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleArbitraryRuleEditorClaimed")] = String(
    policyRuleControls.arbitraryRuleEditorClaimed
  );
  root.dataset[legacyDataKey("m8aV4", "PolicyRuleMeasuredDecisionTruthClaimed")] = String(
    policyRuleControls.measuredDecisionTruthClaimed
  );

  renderProductUxDetailContent({
    root,
    state,
    viewer,
    visualTokenController,
    sceneEndpoints,
    productUx,
    activeMultiplier,
    playbackAction,
    playbackLabel,
    progressValue,
    review,
    focusChoreography,
    comprehension,
    boundaryAffordance,
    stateEvidenceOpen,
    truthBoundaryOpen,
    sourcesRoleOpen,
    selectedInspectorTab,
    f09RateSurface,
    placement,
    sceneNear,
    transitionEvent,
    config: {
      defaultTruthCopy: config.defaultTruthCopy,
      fullReplaySimulatedSeconds:
        config.fullReplaySimulatedSeconds
    }
  });
}
