import {
  CallbackPositionProperty,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  CustomDataSource,
  JulianDate,
  Math as CesiumMath,
  SceneTransforms,
  type Viewer
} from "cesium";
import {
  eciToEcf,
  gstime,
  propagate,
  twoline2satrec
} from "satellite.js";

import { clearDocumentTelemetry } from "../features/telemetry/document-telemetry";
import type { ReplayClock, ReplayClockState } from "../features/time";
import {
  resolveV4RouteSelection,
  type V4ResolvedStationPair
} from "../features/multi-station-selector/v4-route-selection";
import {
  type SceneCameraHint,
  type SceneSourceMode
} from "../features/multi-station-selector/tle-first-scene-view-model";
import {
  M8A_V4_GROUND_STATION_MODEL_PUBLIC_PATH,
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE,
  M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID,
  M8A_V4_GROUND_STATION_SCENARIO_ID,
  M8A_V46D_SIMULATION_HANDOVER_MODEL_ID,
  type M8aV4ActorDisplayRole,
  type M8aV4EndpointId,
  type M8aV4OrbitActorProjection,
  type M8aV4OrbitClass,
  type M8aV4RuntimeNarrativeNonClaims,
  type M8aV4ServiceStateWindow,
  type M8aV46dActorId,
  type M8aV46dSimulationHandoverWindow,
  type M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";
import { M8A_V4_TELEMETRY_KEYS } from "./m8a-v4-ground-station-telemetry-keys";
import { syncTelemetry } from "./m8a-v4-ground-station-telemetry-sync";
import {
  isM8aV4ItriF10PolicyPresetId,
  isM8aV4ItriF11RulePresetId,
  M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_LAYER_PAIRS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_STATUS_PAIRS,
  M8A_V4_CUSTOMER_DEMO_POLISH_DISPOSITION,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_TRUTH_BOUNDARY,
  M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY,
  M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION,
  M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS,
  M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT,
  M8A_V4_CUSTOMER_F09_EXTERNAL_TRUTH_DISPOSITION,
  M8A_V4_CUSTOMER_F09_MEASURED_THROUGHPUT_CLAIMED,
  M8A_V4_CUSTOMER_F09_METRIC_TRUTH,
  M8A_V4_CUSTOMER_F09_PROVENANCE,
  M8A_V4_CUSTOMER_F09_RATE_DISPOSITION,
  M8A_V4_CUSTOMER_F09_RATE_SURFACE_VERSION,
  M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID,
  M8A_V4_CUSTOMER_F10_POLICY_PRESET_MODE,
  M8A_V4_CUSTOMER_F10_POLICY_PRESETS,
  M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID,
  M8A_V4_CUSTOMER_F11_RULE_PRESET_MODE,
  M8A_V4_CUSTOMER_F11_RULE_PRESETS,
  M8A_V4_CUSTOMER_F16_EXPORT_ARTIFACT_TRUTH,
  M8A_V4_CUSTOMER_F16_EXPORT_DISPOSITION,
  M8A_V4_CUSTOMER_F16_EXPORT_FORMAT,
  M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE,
  M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION,
  M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION,
  M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED,
  M8A_V4_CUSTOMER_F16_EXTERNAL_TRUTH_DISPOSITION,
  M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS,
  M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED,
  M8A_V4_CUSTOMER_F16_ROUTE_OWNED_STATE_ONLY,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_COUNTS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT,
  M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_ARTIFACT,
  M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_GENERATED_AT_UTC,
  M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_STALE_AFTER_UTC,
  M8A_V4_CUSTOMER_PHASE7_1_F13_LEO_COUNT,
  M8A_V4_CUSTOMER_PHASE7_1_F13_TOTAL_COUNT,
  M8A_V4_CUSTOMER_POLICY_RULE_ARBITRARY_EDITOR_CLAIMED,
  M8A_V4_CUSTOMER_POLICY_RULE_BACKEND_CONTROL_CLAIMED,
  M8A_V4_CUSTOMER_POLICY_RULE_CONTROLS_VERSION,
  M8A_V4_CUSTOMER_POLICY_RULE_DISPOSITION,
  M8A_V4_CUSTOMER_POLICY_RULE_EXPORT_ADJACENT_TRUTH,
  M8A_V4_CUSTOMER_POLICY_RULE_EXTERNAL_TRUTH_DISPOSITION,
  M8A_V4_CUSTOMER_POLICY_RULE_LIVE_CONTROL_CLAIMED,
  M8A_V4_CUSTOMER_POLICY_RULE_MEASURED_DECISION_TRUTH_CLAIMED,
  M8A_V4_CUSTOMER_POLICY_RULE_NETWORK_CONTROL_CLAIMED,
  M8A_V4_CUSTOMER_POLICY_RULE_ROUTE_OWNED_STATE_ONLY,
  M8A_V4_CUSTOMER_POLICY_RULE_TRUTH_BOUNDARY,
  M8A_V4_CUSTOMER_REQUIREMENT_GAP_SURFACE_VERSION,
  M8A_V4_CUSTOMER_REQUIREMENT_GAP_TRUTH_LABELS,
  M8A_V4_CUSTOMER_REQUIREMENT_OPEN_IDS,
  M8A_V4_CUSTOMER_REQUIREMENT_STATUS_GROUPS,
  M8A_V4_CUSTOMER_ROUTE_NATIVE_MEASURED_TRUTH_CLAIMED,
  resolveF09RateClassCopy,
  resolveItriF10PolicyPreset,
  resolveItriF11RulePreset,
  type M8aV4F09NetworkSpeedClass,
  type M8aV4F09RateWindowRow,
  type M8aV4ItriF10PolicyPreset,
  type M8aV4ItriF10PolicyPresetId,
  type M8aV4ItriF11RulePreset,
  type M8aV4ItriF11RulePresetId,
  type M8aV4ItriF16ExportRecord,
  type M8aV4ItriF16RouteExportBundle,
  type M8aV4ItriAcceptanceCoverageRecord,
  type M8aV4ItriRequirementGroupId,
  type M8aV4ItriRequirementStatusGroup
} from "./m8a-v4-itri-demo-surfaces";
import {
  buildF09RateWindowRows
} from "./m8a-v4-itri-demo-renderers";
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
  installM8aV411VisualTokens,
  M8A_V411_VISUAL_TOKEN_DATA_SOURCE_NAME,
  M8A_V411_VISUAL_TOKEN_DEPTH_DISTANCES,
  M8A_V411_VISUAL_TOKENS_VERSION,
  M8A_V411_W3_DISK_RADIUS_METERS,
  type M8aV411VisualTokenController
} from "./m8a-v411-visual-tokens";
import {
  installM8aV411HoverPopoverController,
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
  disposeM8aV411TransientSurfaces,
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
  createM8aV411DefaultSourcesFilter,
  M8A_V411_SOURCES_ROLE_VERSION,
  type M8aV411SourcesFilter,
  type M8aV411SourcesTrigger
} from "./m8a-v411-sources-role";
import { installSelectedPairTleFirstSceneLayer, resolveSelectedPairSceneTimeWindow } from "./m8a-v4-ground-station-selected-pair-layer";
import {
  createSelectedPairOverlayDebugState,
  type SelectedPairOverlayDebugState
} from "./m8a-v4-ground-station-overlay-debug";
import {
  createProductUxRoot,
  ensureProductUxStructure,
  ensureV410ProductUxStructureReady,
  renderProductUxDetailContent
} from "./m8a-v4-ground-station-product-dom";
import {
  buildEndpointState,
  buildProductUxState,
  buildReplayWindowState,
  buildSimulationHandoverState,
  cloneState,
  M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE,
  notifyListeners,
  resolveReplayWindowRatio,
  resolveServiceStateWindow,
  resolveSimulationHandoverWindow,
  toEpochMilliseconds,
  toIsoTimestamp
} from "./m8a-v4-ground-station-state-builders";
import {
  createActorEntityOptions,
  createEndpointContextRibbonEntityOptions,
  createEndpointEntityOptions,
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
  type EndpointRenderRole,
  type LinkFlowPulseRenderHandle,
  type LinkFlowSegmentRenderHandle,
  type M8aV4ActorEmphasis,
  type RelationRenderHandle
} from "./m8a-v4-ground-station-cesium-entities";
import {
  resolveSceneAnnotationPlacement,
  resolveV49SceneNearRenderState
} from "./m8a-v4-ground-station-placement";
import {
  ensureM8aV411FooterChipRow,
  M8A_V411_FOOTER_CHIP_SYSTEM_VERSION,
  syncM8aV411FooterChipRow
} from "./m8a-v411-footer-chip-system";
import {
  createM8aV411ReviewerModeInitialState,
  isM8aV411ReviewAutoPauseElapsed,
  M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS,
  M8A_V411_REVIEWER_MODE_VERSION,
  readM8aV411ReviewerModePersistedToggle,
  resolveM8aV411ControlAvailability,
  resolveM8aV411ModeAnnouncement,
  transitionForFinalHoldEnter,
  transitionForInspectorClose,
  transitionForInspectorOpen,
  transitionForReviewAutoPauseElapsed,
  transitionForReviewAutoPauseStart,
  transitionForReviewModeToggle,
  transitionForUserPause,
  transitionForUserPlay,
  writeM8aV411ReviewerModePersistedToggle,
  type M8aV411ReplayClockMode,
  type M8aV411ReviewerModeState
} from "./m8a-v411-reviewer-mode";
import {
  buildV49TransitionEvent,
  M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
  M8A_V4_LINK_FLOW_CUE_MODE,
  M8A_V4_LINK_FLOW_CUE_VERSION,
  M8A_V4_LINK_FLOW_DIRECTIONS,
  M8A_V4_LINK_FLOW_PULSE_OFFSETS,
  M8A_V4_LINK_FLOW_RELATION_ROLES,
  M8A_V4_LINK_FLOW_REPLAY_CYCLES,
  M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
  M8A_V411_INSPECTOR_TABS,
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
  M8A_V49_TRANSITION_EVENT_DURATION_MS,
  resolveTimelineLabel,
  type M8aV411InspectorTab,
  type M8aV47DisclosureState,
  type M8aV47PlaybackMode,
  type M8aV47PlaybackMultiplier,
  type M8aV47PlaybackStatus,
  type M8aV47ProductPlaybackMultiplier,
  type M8aV48HandoverReviewViewModel,
  type M8aV48InfoClass,
  type M8aV49ProductComprehensionRuntime,
  type M8aV49TransitionEventRuntime,
  type M8aV4LinkFlowDirection,
  type M8aV4LinkFlowRelationRole,
  type M8aV4RelationRole
} from "./m8a-v4-product-ux-model";

export const M8A_V4_GROUND_STATION_DATA_SOURCE_NAME =
  "m8a-v4-ground-station-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_RUNTIME_STATE =
  "active-v4.3-continuous-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene";

const M8A_V4_CAMERA_LONGITUDE = 114;
const M8A_V4_CAMERA_LATITUDE = -44;
const M8A_V4_CAMERA_HEIGHT_METERS = 11_500_000;
const M8A_V4_CAMERA_HEADING_DEGREES = 0;
const M8A_V4_CAMERA_PITCH_DEGREES = -80;
const M8A_V4_CAMERA_SCREEN_UP_PAN_METERS = 4_000_000;
const M8A_V4_SELECTED_PAIR_ENDPOINT_RADIUS_METERS = 90_000;
const M8A_V4_SELECTED_PAIR_CAMERA_LATITUDE_OFFSET_DEGREES = 66;
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
const M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX = 560;
const M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS = 1;
const M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 3;
const M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 1;

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
  displayMotion: M8aV4ActorDisplayMotionState;
  propagationTimeUtc: string;
  emphasis: M8aV4ActorEmphasis["emphasis"];
  labelVisibility: "always-visible" | "hidden-context";
}

type M8aV4ActorDisplayMotionPolicy =
  | "monotonic-wrapped-display-pass"
  | "near-fixed-geo-guard";

interface M8aV4ActorDisplayMotionState {
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
  sceneSourceMode: SceneSourceMode;
  dataSourceName: typeof M8A_V4_GROUND_STATION_DATA_SOURCE_NAME;
  dataSourceAttached: boolean;
  endpointCount: 2;
  endpoints: ReadonlyArray<{
    endpointId: string;
    label: string;
    markerId: string;
    precisionBadge: string;
    renderPrecision: string;
    displayPositionIsSourceTruth: boolean;
    rawSourceCoordinatesRenderable: boolean;
    orbitEvidenceChips: ReadonlyArray<string>;
  }>;
  selectedPairOverlay: SelectedPairOverlayDebugState;
  actorCount: number;
  orbitActorCounts: Record<M8aV4OrbitClass, number>;
  actors: ReadonlyArray<M8aV4ActorRuntimeRecord>;
  actorLabelDensity: {
    policy: "representative-orbit-class-labels-only";
    v46ePolicy: "active-representative-label-with-endpoint-priority";
    viewportClass: "desktop" | "narrow";
    endpointLabelsPriority: true;
    candidateLabelsVisibleByDefault: false;
    fallbackLabelPolicy: "geo-representative-or-guard-state-only";
    preferredVisibleActorLabelCount: 1;
    visibleActorLabelCount: number;
    visibleActorLabelIds: ReadonlyArray<string>;
    alwaysVisibleActorLabelCount: number;
    alwaysVisibleActorLabelIds: ReadonlyArray<string>;
    hiddenContextActorLabelCount: number;
    desktopMaxAlwaysVisibleActorLabels: number;
    narrowMaxAlwaysVisibleActorLabels: number;
  };
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
  simulationHandoverModel: {
    modelId: typeof M8A_V46D_SIMULATION_HANDOVER_MODEL_ID;
    modelStatus: "accepted-contract";
    modelScope: "deterministic-display-context-state-machine";
    modelTruth: "simulation-output-not-operator-log";
    endpointPairId:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.endpointPairId;
    acceptedPairPrecision: "operator-family-only";
    route:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.route;
    sourceRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline";
    replayRatio: number;
    window: M8aV46dSimulationHandoverWindow;
    timeline: ReadonlyArray<M8aV46dSimulationHandoverWindow>;
    timelineWindowIds: ReadonlyArray<string>;
    validationExpectations:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.validationExpectations;
    forbiddenClaimScan:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.forbiddenClaimScan;
  };
  replayWindow: {
    startTimeUtc: string;
    stopTimeUtc: string;
    durationMs: number;
    playbackMultiplier: number;
    longestCurrentOneWebLeoActorId: string;
    longestCurrentOneWebLeoSourceRecordName: string;
    longestCurrentOneWebLeoMeanMotionRevPerDay: number;
    longestCurrentOneWebLeoPeriodMs: number;
    replayMarginMs: number;
    periodSource: "repo-owned-oneweb-tle-mean-motion";
  };
  productUx: {
    version: typeof M8A_V47_PRODUCT_UX_VERSION;
    uiIaVersion: typeof M8A_V48_UI_IA_VERSION;
    infoClassSeam: "data-m8a-v48-info-class";
    infoClassValues: ReadonlyArray<M8aV48InfoClass>;
    playbackPolicy: {
      defaultMultiplier: typeof M8A_V47_PRODUCT_DEFAULT_MULTIPLIER;
      guidedReviewMultiplier: typeof M8A_V47_GUIDED_REVIEW_MULTIPLIER;
      quickScanMultiplier: typeof M8A_V47_QUICK_SCAN_MULTIPLIER;
      debugTestMultiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER;
      productMultipliers: ReadonlyArray<M8aV47ProductPlaybackMultiplier>;
      normalControlsExposeDebugMultiplier: false;
      finalHoldDurationMs: typeof M8A_V47_FINAL_HOLD_DURATION_MS;
      finalHoldRangeMs: {
        min: typeof M8A_V47_FINAL_HOLD_MIN_MS;
        max: typeof M8A_V47_FINAL_HOLD_MAX_MS;
      };
      loopPolicy: "hold-final-state-then-restart";
    };
    playback: {
      multiplier: M8aV47PlaybackMultiplier;
      mode: M8aV47PlaybackMode;
      status: M8aV47PlaybackStatus;
      replayRatio: number;
      finalHoldActive: boolean;
      finalHoldStartedAtEpochMs: number | null;
      finalHoldCompletedAtEpochMs: number | null;
      finalHoldLoopCount: number;
      reviewElapsedDisplay: string;
      reviewDurationDisplay: string;
      simulatedReplayTimeDisplay: string;
      replayUtcDisplay: string;
    };
    informationHierarchy: readonly [
      "scene",
      "current-simulation-state",
      "playback-and-time",
      "truth-boundary-badges",
      "optional-detail"
    ];
    stateLabels: Record<M8aV46dSimulationHandoverWindowId, string>;
    activeWindowId: M8aV46dSimulationHandoverWindowId;
    activeProductLabel: string;
    reviewViewModel: M8aV48HandoverReviewViewModel;
    productComprehension: M8aV49ProductComprehensionRuntime;
    truthBadges: typeof M8A_V47_TRUTH_BADGES;
    disclosure: {
      state: M8aV47DisclosureState;
      detailsSheetState: M8aV47DisclosureState;
      boundarySurfaceState: M8aV47DisclosureState;
      sourcesRoleState: M8aV47DisclosureState;
      activeInspectorTab: M8aV411InspectorTab;
      sourcesFilter: M8aV411SourcesFilter;
      boundaryFullTruthDisclosureState: M8aV47DisclosureState;
      lines: typeof M8A_V47_DISCLOSURE_LINES;
    };
    layout: {
      viewportClass: "desktop" | "narrow";
      desktopPolicy: "compact-control-strip";
      narrowPolicy: "compact-control-strip-with-secondary-sheet";
      detailSheetState: M8aV47DisclosureState;
      boundarySurfaceState: M8aV47DisclosureState;
      sourcesRoleState: M8aV47DisclosureState;
      protectedZonePolicy:
        "endpoint-corridor-geo-guard-and-required-labels-non-obstruction";
      narrowRailDrawerState: M8aV47DisclosureState;
    };
    reviewerMode: {
      version: typeof M8A_V411_REVIEWER_MODE_VERSION;
      replayClockMode: M8aV411ReplayClockMode;
      pauseSource: M8aV411ReviewerModeState["pauseSource"];
      pinnedWindowId: M8aV411ReviewerModeState["pinnedWindowId"];
      pinnedWindowOrdinalLabel: string | null;
      pinnedReplayRatio: number | null;
      previousPlaybackState: M8aV411ReviewerModeState["previousPlaybackState"];
      toastSuppressed: boolean;
      reviewModeOn: boolean;
      manualPauseSpeedDeferred: boolean;
      announcement: ReturnType<typeof resolveM8aV411ModeAnnouncement>;
      controls: ReturnType<typeof resolveM8aV411ControlAvailability>;
      autoPauseDurationMs: typeof M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS;
    };
  };
  relationCues: {
    cueKind: "v4.6e-handover-visual-language-context-ribbons";
    displayRepresentativeActorId: M8aV46dActorId;
    candidateContextActorId: M8aV46dActorId;
    fallbackContextActorId: M8aV46dActorId;
    visibleContextRibbonCount: 2;
    visibleContextRibbonRoles: readonly ["displayRepresentative", "candidateContext"];
    dataFlowCueVersion: typeof M8A_V4_LINK_FLOW_CUE_VERSION;
    dataFlowCueMode: typeof M8A_V4_LINK_FLOW_CUE_MODE;
    dataFlowDirections: typeof M8A_V4_LINK_FLOW_DIRECTIONS;
    dataFlowPulseCount: number;
    dataFlowTruthBoundary: typeof M8A_V4_LINK_FLOW_TRUTH_BOUNDARY;
    fallbackGuardCueMode:
      | "low-opacity-geo-guard-cue"
      | "representative-context-ribbon-in-geo-continuity-guard";
    fallbackFullRibbonVisible: false;
    activeSatelliteTruth: "not-claimed";
    activeGatewayTruth: "not-claimed";
    pairSpecificTeleportPathTruth: "not-claimed";
    nativeRfHandoverTruth: "not-claimed";
  };
  requirementGapSurface: {
    version: typeof M8A_V4_CUSTOMER_REQUIREMENT_GAP_SURFACE_VERSION;
    route:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.route;
    endpointPairId:
      typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.endpointPairId;
    acceptedPairPrecision: "operator-family-only";
    truthBoundaryLabels: typeof M8A_V4_CUSTOMER_REQUIREMENT_GAP_TRUTH_LABELS;
    demoPolishDisposition: typeof M8A_V4_CUSTOMER_DEMO_POLISH_DISPOSITION;
    routeNativeMeasuredTruthClaimed:
      typeof M8A_V4_CUSTOMER_ROUTE_NATIVE_MEASURED_TRUTH_CLAIMED;
    groups: ReadonlyArray<M8aV4ItriRequirementStatusGroup>;
    openRequirementIds: ReadonlyArray<string>;
  };
  acceptanceLayer: {
    version: typeof M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION;
    layerId: typeof M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID;
    truthBoundary: typeof M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_TRUTH_BOUNDARY;
    requirementIds: typeof M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS;
    coverageRecords: ReadonlyArray<M8aV4ItriAcceptanceCoverageRecord>;
    requirementStatusPairs: ReadonlyArray<string>;
    requirementLayerPairs: ReadonlyArray<string>;
    externalFailIds: typeof M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS;
    boundedRouteRepresentationIds:
      typeof M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS;
    f13Phase71Evidence: {
      artifact: typeof M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_ARTIFACT;
      generatedAtUtc:
        typeof M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_GENERATED_AT_UTC;
      staleAfterUtc:
        typeof M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_STALE_AFTER_UTC;
      leoCount: typeof M8A_V4_CUSTOMER_PHASE7_1_F13_LEO_COUNT;
      totalCount: typeof M8A_V4_CUSTOMER_PHASE7_1_F13_TOTAL_COUNT;
      routeNativeScaleClaimed: false;
    };
    f13RouteNativeScaleReadiness: {
      version: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION;
      currentRouteActorCount: number;
      currentRouteLeoActorCount: number;
      currentRouteMeoActorCount: number;
      currentRouteGeoActorCount: number;
      readinessActorCount: number;
      readinessLeoActorCount: number;
      readinessMeoActorCount: number;
      readinessGeoActorCount: number;
      targetLeoCount:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT;
      targetReached: boolean;
      sourceType: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE;
      sourceMode: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE;
      sourceUrl: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL;
      dataSourceLabel:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL;
      publicSourceUsed:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED;
      builtAtUtc: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC;
      freshnessTimestampUtc:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC;
      freshnessNotes:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES;
      licenseNotes: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES;
      knownGaps:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS;
      nonClaims:
        typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS;
      routeNativeScaleClosureClaimed: false;
      externalValidationClosureClaimed: false;
      itriAuthorityClaimed: false;
    };
    externalValidationPackage: {
      artifact: typeof M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT;
      status: typeof M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS;
      failIds: typeof M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS;
    };
  };
  f09RateSurface: {
    version: typeof M8A_V4_CUSTOMER_F09_RATE_SURFACE_VERSION;
    disposition: typeof M8A_V4_CUSTOMER_F09_RATE_DISPOSITION;
    externalTruthDisposition:
      typeof M8A_V4_CUSTOMER_F09_EXTERNAL_TRUTH_DISPOSITION;
    currentWindowId: M8aV46dSimulationHandoverWindowId;
    currentOrbitClass: M8aV4OrbitClass;
    currentNetworkSpeedClass: M8aV4F09NetworkSpeedClass;
    currentClassLabel: string;
    currentBucketLabel: string;
    currentReviewLabel: string;
    provenance: typeof M8A_V4_CUSTOMER_F09_PROVENANCE;
    metricTruth: typeof M8A_V4_CUSTOMER_F09_METRIC_TRUTH;
    measuredThroughputClaimed:
      typeof M8A_V4_CUSTOMER_F09_MEASURED_THROUGHPUT_CLAIMED;
    rows: ReadonlyArray<M8aV4F09RateWindowRow>;
  };
  f16ExportSurface: {
    version: typeof M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION;
    schemaVersion: typeof M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION;
    disposition: typeof M8A_V4_CUSTOMER_F16_EXPORT_DISPOSITION;
    externalTruthDisposition:
      typeof M8A_V4_CUSTOMER_F16_EXTERNAL_TRUTH_DISPOSITION;
    artifactTruth: typeof M8A_V4_CUSTOMER_F16_EXPORT_ARTIFACT_TRUTH;
    exportFormat: typeof M8A_V4_CUSTOMER_F16_EXPORT_FORMAT;
    provenance: typeof M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE;
    routeOwnedStateOnly:
      typeof M8A_V4_CUSTOMER_F16_ROUTE_OWNED_STATE_ONLY;
    measuredValuesIncluded:
      typeof M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED;
    externalReportSystemTruthClaimed:
      typeof M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED;
    explicitNonClaims: typeof M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS;
    lastStatus: "ready" | M8aV4ItriF16ExportRecord["status"];
    lastGeneratedAtUtc: string;
    lastFilename: string;
    lastErrorMessage: string;
  };
  policyRuleControls: {
    version: typeof M8A_V4_CUSTOMER_POLICY_RULE_CONTROLS_VERSION;
    disposition: typeof M8A_V4_CUSTOMER_POLICY_RULE_DISPOSITION;
    externalTruthDisposition:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_EXTERNAL_TRUTH_DISPOSITION;
    truthBoundary: typeof M8A_V4_CUSTOMER_POLICY_RULE_TRUTH_BOUNDARY;
    exportAdjacentTruth:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_EXPORT_ADJACENT_TRUTH;
    f10RequirementId: "F-10";
    f11RequirementId: "F-11";
    policyPresetMode: typeof M8A_V4_CUSTOMER_F10_POLICY_PRESET_MODE;
    rulePresetMode: typeof M8A_V4_CUSTOMER_F11_RULE_PRESET_MODE;
    defaultPolicyPresetId: typeof M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID;
    defaultRulePresetId: typeof M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID;
    activePolicyPreset: M8aV4ItriF10PolicyPreset;
    activeRulePreset: M8aV4ItriF11RulePreset;
    policyPresets: typeof M8A_V4_CUSTOMER_F10_POLICY_PRESETS;
    rulePresets: typeof M8A_V4_CUSTOMER_F11_RULE_PRESETS;
    routeOwnedStateOnly:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_ROUTE_OWNED_STATE_ONLY;
    liveControlClaimed:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_LIVE_CONTROL_CLAIMED;
    backendControlClaimed:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_BACKEND_CONTROL_CLAIMED;
    networkControlClaimed:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_NETWORK_CONTROL_CLAIMED;
    arbitraryRuleEditorClaimed:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_ARBITRARY_EDITOR_CLAIMED;
    measuredDecisionTruthClaimed:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_MEASURED_DECISION_TRUTH_CLAIMED;
  };
  nonClaims: M8aV4RuntimeNarrativeNonClaims;
  proofSeam: typeof M8A_V4_GROUND_STATION_PROOF_SEAM;
  sourceLineage: {
    projectionRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
    serviceStateRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline";
    simulationHandoverRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline";
    rawPackageSideReadOwnership: "forbidden";
    rawSourcePathsIncluded: false;
  };
  modelAsset: typeof M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.modelAsset & {
    uri: string;
  };
}

export interface M8aV4GroundStationSceneController {
  getState(): M8aV4GroundStationSceneState;
  getLastF16RouteExport(): M8aV4ItriF16RouteExportBundle | null;
  exportF16RouteState(): M8aV4ItriF16RouteExportBundle;
  subscribe(listener: (state: M8aV4GroundStationSceneState) => void): () => void;
  play(): void;
  pause(): void;
  restart(): void;
  setPlaybackMultiplier(multiplier: M8aV47ProductPlaybackMultiplier): void;
  setDebugPlaybackMultiplier(
    multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
  ): void;
  /**
   * Re-anchor the V4 scene's selected-pair surfaces (endpoint A/B
   * markers, ribbon polyline, camera framing, selected-pair satellite
   * overlay) to a new resolved pair without a page reload. Wave 2 §A.6
   * extension — composition wires this to the selection-store so a
   * reselection during an existing session hot-mounts new endpoints.
   *
   * Passing `null` is a no-op; selection clear continues to dispose the
   * V4 controller via display-state.
   */
  setSelectedPair(pair: V4ResolvedStationPair | null): void;
  dispose(): void;
}

export interface M8aV4GroundStationSceneControllerOptions {
  viewer: Viewer;
  hudFrame: HTMLElement;
  replayClock: ReplayClock;
}

interface PropagatedActorPosition {
  cartesian: Cartesian3;
  propagationTimeUtc: string;
}

interface SceneEndpointContext {
  endpoints: ReadonlyArray<EndpointRenderContext>;
  selectedPair: V4ResolvedStationPair | null;
}

export function isM8aV4GroundStationRuntimeRequested(search: URLSearchParams): boolean {
  if (
    search.get(M8A_V4_GROUND_STATION_QUERY_PARAM) ===
    M8A_V4_GROUND_STATION_QUERY_VALUE
  ) {
    return true;
  }
  if (search.get("firstIntakeScenarioId") === M8A_V4_GROUND_STATION_SCENARIO_ID) {
    return true;
  }
  // Implicit V4 activation: a short URL with a valid stationA/stationB pair
  // resolves into the V4 ground-station scene without requiring the explicit
  // m8aV4GroundStationScene=1 flag. Lets reviewers share short demo links.
  return Boolean(resolveV4RouteSelection(search).resolvedPair);
}

function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
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

function resolveSelectedPairFromLocation(): V4ResolvedStationPair | null {
  if (typeof window === "undefined") {
    return null;
  }
  return resolveV4RouteSelection(new URLSearchParams(window.location.search))
    .resolvedPair;
}

function createSelectedPairEndpointContext(
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

function buildSceneEndpointContext(): SceneEndpointContext {
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

function resolveActorDisplayHeightMeters(
  orbitClass: M8aV4OrbitClass,
  pathProgress: number,
  loopRatio: number
): number {
  const heightBand = M8A_V4_DISPLAY_ORBIT_HEIGHT_METERS[orbitClass];
  return (
    lerp(heightBand.start, heightBand.stop, pathProgress) +
    Math.sin(loopRatio * Math.PI * 2) * heightBand.wobble
  );
}

function resolveActorDisplayMotionState(
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

function configureSelectedPairReplayClock(
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

function applyV4Camera(
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
        clamp(
          pairCenterLat - M8A_V4_SELECTED_PAIR_CAMERA_LATITUDE_OFFSET_DEGREES,
          -82,
          82
        ),
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

function applySelectedPairCameraHint(
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
    : clamp(midpointLat - M8A_V4_SELECTED_PAIR_CAMERA_LATITUDE_OFFSET_DEGREES, -82, 82);

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

function resolveViewportClass(): "desktop" | "narrow" {
  return window.innerWidth <= M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX
    ? "narrow"
    : "desktop";
}

function resolveFallbackGuardCueMode(
  simulationWindow: M8aV46dSimulationHandoverWindow
): M8aV4GroundStationSceneState["relationCues"]["fallbackGuardCueMode"] {
  return simulationWindow.windowId === "geo-continuity-guard"
    ? "representative-context-ribbon-in-geo-continuity-guard"
    : "low-opacity-geo-guard-cue";
}

function createHudRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "m8a-v4-ground-station-scene";
  root.dataset.m8aV4GroundStationScene = "true";
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.dataset.m8aV46eVisualLanguage = "true";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", "M8A V4.6E hidden runtime state seam");
  return root;
}

function renderHud(root: HTMLElement, state: M8aV4GroundStationSceneState): void {
  const activeStateLabel = resolveTimelineLabel(
    state.simulationHandoverModel.window.windowId
  );

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.dataset.m8aV46eVisualLanguage = "true";
  root.dataset.activeStateLabel = activeStateLabel;
  root.dataset.sceneSourceMode = state.sceneSourceMode;
  root.dataset.serviceWindowId = state.serviceState.window.windowId;
  root.dataset.simulationHandoverModelId =
    state.simulationHandoverModel.modelId;
  root.dataset.simulationHandoverWindowId =
    state.simulationHandoverModel.window.windowId;
  root.dataset.displayRepresentativeActorId =
    state.simulationHandoverModel.window.displayRepresentativeActorId;
  root.dataset.candidateContextActorIds = serializeList(
    state.simulationHandoverModel.window.candidateContextActorIds
  );
  root.dataset.fallbackContextActorIds = serializeList(
    state.simulationHandoverModel.window.fallbackContextActorIds
  );
  root.dataset.currentPrimaryOrbit =
    state.serviceState.window.currentPrimaryOrbitClass;
  root.dataset.nextCandidateOrbit =
    state.serviceState.window.nextCandidateOrbitClass;
  root.dataset.precisionBadge = M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
  root.dataset.visibleContextRibbonCount = String(
    state.relationCues.visibleContextRibbonCount
  );
  root.dataset.linkFlowCue = state.relationCues.dataFlowCueVersion;
  root.dataset.linkFlowCueMode = state.relationCues.dataFlowCueMode;
  root.dataset.linkFlowDirections = serializeList([
    ...state.relationCues.dataFlowDirections
  ]);
  root.dataset.linkFlowPulseCount = String(state.relationCues.dataFlowPulseCount);
  root.dataset.linkFlowTruthBoundary =
    state.relationCues.dataFlowTruthBoundary;
  root.dataset.fallbackGuardCueMode = state.relationCues.fallbackGuardCueMode;
  root.dataset.visibleActorLabelCount = String(
    state.actorLabelDensity.visibleActorLabelCount
  );
  root.dataset.visibleActorLabelIds = serializeList(
    state.actorLabelDensity.visibleActorLabelIds
  );
  root.dataset.rawItriSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;
  root.dataset.nonClaims = serializeJson(state.nonClaims);
  root.innerHTML = "";
}

function renderProductUx(
  root: HTMLElement,
  state: M8aV4GroundStationSceneState,
  viewer: Viewer,
  visualTokenController: M8aV411VisualTokenController,
  sceneEndpoints: ReadonlyArray<EndpointRenderContext>
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
    groupId: M8aV4ItriRequirementGroupId
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
  root.dataset.m8aV4ItriDemoViewFocusChoreography =
    focusChoreography.version;
  root.dataset.m8aV4ItriDemoViewFocusScope = focusChoreography.scope;
  root.dataset.m8aV4ItriDemoViewFocusVisibleContent = serializeList([
    ...focusChoreography.visibleContent
  ]);
  root.dataset.m8aV4ItriDemoViewFocusWindowId =
    focusChoreography.windowId;
  root.dataset.m8aV4ItriDemoViewFocusId = focusChoreography.focusId;
  root.dataset.m8aV4ItriDemoViewFocusPrimaryLabel =
    focusChoreography.primaryFocusLabel;
  root.dataset.m8aV4ItriDemoViewFocusOrbitClass =
    focusChoreography.focusOrbitClassToken;
  root.dataset.m8aV4ItriDemoViewFocusRole =
    focusChoreography.focusRole;
  root.dataset.m8aV4ItriDemoViewFocusBriefing =
    focusChoreography.briefingLine;
  root.dataset.m8aV4ItriDemoViewFocusWatch =
    focusChoreography.decisionWatch;
  root.dataset.m8aV4ItriDemoViewFocusNext =
    focusChoreography.nextFocusHint;
  root.dataset.m8aV4ItriDemoViewFocusVisualCue =
    focusChoreography.visualCue;
  root.dataset.m8aV4ItriDemoViewFocusSceneCue =
    focusChoreography.sceneCueLabel;
  root.dataset.m8aV4ItriDemoViewFocusSecondaryActorPolicy =
    focusChoreography.secondaryActorPolicy;
  root.dataset.m8aV4ItriDemoViewFocusSecondaryActorRoles = serializeList([
    ...focusChoreography.secondaryActorEmphasisRoles
  ]);
  root.dataset.m8aV4ItriDemoViewFocusNextContextVisible = String(
    focusChoreography.nextContextVisible
  );
  root.dataset.m8aV4ItriDemoViewFocusTruthBoundary =
    focusChoreography.truthBoundary;
  root.dataset.m8aV4ItriDemoViewDefaultFocus =
    M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION;
  root.dataset.m8aV4ItriDemoViewNarrow =
    M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION;
  root.dataset.m8aV4ItriDemoViewDefaultLayer =
    "L0-first-read-demo-stage";
  root.dataset.m8aV4ItriDemoViewDefaultInspectorOpen = String(sheetOpen);
  root.dataset.m8aV4ItriDemoViewDefaultRequirementMatrixVisible =
    String(evidencePanelOpen);
  root.dataset.m8aV4ItriDemoViewDefaultCurrentState =
    focusChoreography.primaryFocusLabel;
  root.dataset.m8aV4ItriDemoViewDefaultNextState =
    focusChoreography.nextFocusHint;
  root.dataset.m8aV4ItriDemoViewDefaultOrbitClass =
    focusChoreography.focusOrbitClassToken;
  root.dataset.m8aV4ItriDemoViewDefaultRateClass =
    f09RateSurface.currentClassLabel;
  root.dataset.m8aV4ItriDemoViewDefaultTruthBoundary =
    M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY;
  root.dataset.m8aV4ItriDemoViewAcceptanceLayer =
    acceptanceLayer.version;
  root.dataset.m8aV4ItriDemoViewAcceptanceLayerId =
    acceptanceLayer.layerId;
  root.dataset.m8aV4ItriDemoViewAcceptanceVisible =
    String(evidencePanelOpen);
  root.dataset.m8aV4ItriDemoViewAcceptanceRequirementIds = serializeList([
    ...acceptanceLayer.requirementIds
  ]);
  root.dataset.m8aV4ItriDemoViewAcceptanceRequirementStatuses =
    serializeList([...acceptanceLayer.requirementStatusPairs]);
  root.dataset.m8aV4ItriDemoViewAcceptanceRequirementLayers =
    serializeList([...acceptanceLayer.requirementLayerPairs]);
  root.dataset.m8aV4ItriDemoViewAcceptanceExternalFailIds = serializeList([
    ...acceptanceLayer.externalFailIds
  ]);
  root.dataset.m8aV4ItriDemoViewAcceptanceBoundedRouteIds = serializeList([
    ...acceptanceLayer.boundedRouteRepresentationIds
  ]);
  root.dataset.m8aV4ItriDemoViewAcceptanceF13Artifact =
    acceptanceLayer.f13Phase71Evidence.artifact;
  root.dataset.m8aV4ItriDemoViewAcceptanceF13FreshUntilUtc =
    acceptanceLayer.f13Phase71Evidence.staleAfterUtc;
  root.dataset.m8aV4ItriDemoViewAcceptanceF13RouteNativeScaleClaimed =
    String(acceptanceLayer.f13Phase71Evidence.routeNativeScaleClaimed);
  root.dataset.m8aV4ItriF13ScaleReadinessSurface =
    acceptanceLayer.f13RouteNativeScaleReadiness.version;
  root.dataset.m8aV4ItriF13ScaleReadinessTargetReached = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetReached
  );
  root.dataset.m8aV4ItriF13ScaleReadinessCurrentRouteActorCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.currentRouteActorCount
  );
  root.dataset.m8aV4ItriF13ScaleReadinessActorCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount
  );
  root.dataset.m8aV4ItriF13ScaleReadinessLeoCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessLeoActorCount
  );
  root.dataset.m8aV4ItriF13ScaleReadinessTargetLeoCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount
  );
  root.dataset.m8aV4ItriF13ScaleReadinessSourceType =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceType;
  root.dataset.m8aV4ItriF13ScaleReadinessSourceUrl =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceUrl;
  root.dataset.m8aV4ItriF13ScaleReadinessPublicSourceUsed = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.publicSourceUsed
  );
  root.dataset.m8aV4ItriF13ScaleReadinessBuiltAtUtc =
    acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc;
  root.dataset.m8aV4ItriF13ScaleReadinessFreshnessTimestampUtc =
    acceptanceLayer.f13RouteNativeScaleReadiness.freshnessTimestampUtc;
  root.dataset.m8aV4ItriF13ScaleReadinessClosureClaimed = String(
    acceptanceLayer.f13RouteNativeScaleReadiness
      .routeNativeScaleClosureClaimed
  );
  root.dataset.m8aV4ItriDemoViewAcceptanceExternalValidationArtifact =
    acceptanceLayer.externalValidationPackage.artifact;
  root.dataset.m8aV4ItriDemoViewAcceptanceExternalValidationStatus =
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
  root.dataset.m8aV4ItriRequirementGapSurface =
    requirementGapSurface.version;
  root.dataset.m8aV4ItriRequirementGapTruthLabels = serializeList([
    ...requirementGapSurface.truthBoundaryLabels
  ]);
  root.dataset.m8aV4ItriRequirementGapGroupIds = serializeList(
    requirementGapSurface.groups.map((group) => group.groupId)
  );
  root.dataset.m8aV4ItriRequirementGapGroupStatuses = serializeList(
    requirementGapSurface.groups.map((group) => `${group.groupId}:${group.status}`)
  );
  root.dataset.m8aV4ItriRequirementGapGroupDispositions = serializeList(
    requirementGapSurface.groups.map(
      (group) => `${group.groupId}:${group.disposition}`
    )
  );
  root.dataset.m8aV4ItriRequirementGapOpenIds = serializeList(
    requirementGapSurface.openRequirementIds
  );
  root.dataset.m8aV4ItriRequirementGapNotMountedIds = serializeList([
    ...requirementIdsForGroup("not-mounted-route-gap")
  ]);
  root.dataset.m8aV4ItriRequirementGapExternalValidationIds = serializeList([
    ...requirementIdsForGroup("external-validation-gap")
  ]);
  root.dataset.m8aV4ItriRequirementGapRepoSeamIds = serializeList([
    ...requirementIdsForGroup("bounded-repo-owned-seam")
  ]);
  root.dataset.m8aV4ItriRequirementGapBoundedRouteIds = serializeList([
    ...requirementIdsForGroup("bounded-route-representation")
  ]);
  root.dataset.m8aV4ItriRequirementGapRouteBaselineIds = serializeList([
    ...requirementIdsForGroup("route-owned-visual-baseline")
  ]);
  root.dataset.m8aV4ItriDemoPolishDisposition =
    requirementGapSurface.demoPolishDisposition;
  root.dataset.m8aV4ItriRouteNativeMeasuredTruthClaimed = String(
    requirementGapSurface.routeNativeMeasuredTruthClaimed
  );
  root.dataset.m8aV4ItriF09RateSurface = f09RateSurface.version;
  root.dataset.m8aV4ItriF09RateDisposition = f09RateSurface.disposition;
  root.dataset.m8aV4ItriF09ExternalTruthDisposition =
    f09RateSurface.externalTruthDisposition;
  root.dataset.m8aV4ItriF09CurrentWindowId = f09RateSurface.currentWindowId;
  root.dataset.m8aV4ItriF09CurrentClass =
    f09RateSurface.currentNetworkSpeedClass;
  root.dataset.m8aV4ItriF09CurrentBucket =
    f09RateSurface.currentBucketLabel;
  root.dataset.m8aV4ItriF09Provenance = f09RateSurface.provenance;
  root.dataset.m8aV4ItriF09MetricTruth = f09RateSurface.metricTruth;
  root.dataset.m8aV4ItriF09MeasuredThroughputClaimed = String(
    f09RateSurface.measuredThroughputClaimed
  );
  root.dataset.m8aV4ItriF09WindowClasses = serializeList(
    f09RateSurface.rows.map(
      (row) => `${row.windowId}:${row.networkSpeedClass}`
    )
  );
  root.dataset.m8aV4ItriF16ExportSurface = f16ExportSurface.version;
  root.dataset.m8aV4ItriF16ExportSchemaVersion =
    f16ExportSurface.schemaVersion;
  root.dataset.m8aV4ItriF16ExportDisposition =
    f16ExportSurface.disposition;
  root.dataset.m8aV4ItriF16ExternalTruthDisposition =
    f16ExportSurface.externalTruthDisposition;
  root.dataset.m8aV4ItriF16ExportArtifactTruth =
    f16ExportSurface.artifactTruth;
  root.dataset.m8aV4ItriF16ExportFormat = f16ExportSurface.exportFormat;
  root.dataset.m8aV4ItriF16RouteOwnedStateOnly = String(
    f16ExportSurface.routeOwnedStateOnly
  );
  root.dataset.m8aV4ItriF16MeasuredValuesIncluded = String(
    f16ExportSurface.measuredValuesIncluded
  );
  root.dataset.m8aV4ItriF16ExternalReportTruthClaimed = String(
    f16ExportSurface.externalReportSystemTruthClaimed
  );
  root.dataset.m8aV4ItriF16LastStatus = f16ExportSurface.lastStatus;
  root.dataset.m8aV4ItriF16LastGeneratedAtUtc =
    f16ExportSurface.lastGeneratedAtUtc;
  root.dataset.m8aV4ItriF16LastFilename = f16ExportSurface.lastFilename;
  root.dataset.m8aV4ItriPolicyRuleControlsSurface =
    policyRuleControls.version;
  root.dataset.m8aV4ItriPolicyRuleControlsDisposition =
    policyRuleControls.disposition;
  root.dataset.m8aV4ItriPolicyRuleExternalTruthDisposition =
    policyRuleControls.externalTruthDisposition;
  root.dataset.m8aV4ItriPolicyRuleTruthBoundary =
    policyRuleControls.truthBoundary;
  root.dataset.m8aV4ItriPolicyRuleExportAdjacentTruth =
    policyRuleControls.exportAdjacentTruth;
  root.dataset.m8aV4ItriF10PolicyPresetId =
    policyRuleControls.activePolicyPreset.presetId;
  root.dataset.m8aV4ItriF10PolicyPresetLabel =
    policyRuleControls.activePolicyPreset.label;
  root.dataset.m8aV4ItriF10PolicyPresetMode =
    policyRuleControls.policyPresetMode;
  root.dataset.m8aV4ItriF10PolicyPresetIds = serializeList(
    policyRuleControls.policyPresets.map((preset) => preset.presetId)
  );
  root.dataset.m8aV4ItriF11RulePresetId =
    policyRuleControls.activeRulePreset.presetId;
  root.dataset.m8aV4ItriF11RulePresetLabel =
    policyRuleControls.activeRulePreset.label;
  root.dataset.m8aV4ItriF11RulePresetMode =
    policyRuleControls.rulePresetMode;
  root.dataset.m8aV4ItriF11RulePresetIds = serializeList(
    policyRuleControls.rulePresets.map((preset) => preset.presetId)
  );
  root.dataset.m8aV4ItriF11RuleParameterChips = serializeList([
    ...policyRuleControls.activeRulePreset.parameterChips
  ]);
  root.dataset.m8aV4ItriPolicyRuleRouteOwnedStateOnly = String(
    policyRuleControls.routeOwnedStateOnly
  );
  root.dataset.m8aV4ItriPolicyRuleLiveControlClaimed = String(
    policyRuleControls.liveControlClaimed
  );
  root.dataset.m8aV4ItriPolicyRuleBackendControlClaimed = String(
    policyRuleControls.backendControlClaimed
  );
  root.dataset.m8aV4ItriPolicyRuleNetworkControlClaimed = String(
    policyRuleControls.networkControlClaimed
  );
  root.dataset.m8aV4ItriPolicyRuleArbitraryRuleEditorClaimed = String(
    policyRuleControls.arbitraryRuleEditorClaimed
  );
  root.dataset.m8aV4ItriPolicyRuleMeasuredDecisionTruthClaimed = String(
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
      defaultTruthCopy: M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY,
      fullReplaySimulatedSeconds:
        M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.replayDurationMs / 1000
    }
  });
}

function buildRequirementGapSurfaceState(): M8aV4GroundStationSceneState["requirementGapSurface"] {
  const model = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel;

  return {
    version: M8A_V4_CUSTOMER_REQUIREMENT_GAP_SURFACE_VERSION,
    route: model.route,
    endpointPairId: model.endpointPairId,
    acceptedPairPrecision: model.acceptedPairPrecision,
    truthBoundaryLabels: M8A_V4_CUSTOMER_REQUIREMENT_GAP_TRUTH_LABELS,
    demoPolishDisposition: M8A_V4_CUSTOMER_DEMO_POLISH_DISPOSITION,
    routeNativeMeasuredTruthClaimed:
      M8A_V4_CUSTOMER_ROUTE_NATIVE_MEASURED_TRUTH_CLAIMED,
    groups: M8A_V4_CUSTOMER_REQUIREMENT_STATUS_GROUPS,
    openRequirementIds: M8A_V4_CUSTOMER_REQUIREMENT_OPEN_IDS
  };
}

function buildAcceptanceLayerState(
  currentRouteActorCount: number,
  currentRouteOrbitActorCounts: Record<M8aV4OrbitClass, number>
): M8aV4GroundStationSceneState["acceptanceLayer"] {
  const readinessCounts = M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_COUNTS;
  const readinessTargetReached =
    readinessCounts.leo >= M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT;

  return {
    version: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION,
    layerId: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    truthBoundary: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_TRUTH_BOUNDARY,
    requirementIds: M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS,
    coverageRecords: M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS,
    requirementStatusPairs: M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_STATUS_PAIRS,
    requirementLayerPairs: M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_LAYER_PAIRS,
    externalFailIds: M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS,
    boundedRouteRepresentationIds:
      M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS,
    f13Phase71Evidence: {
      artifact: M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_ARTIFACT,
      generatedAtUtc:
        M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_GENERATED_AT_UTC,
      staleAfterUtc: M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_STALE_AFTER_UTC,
      leoCount: M8A_V4_CUSTOMER_PHASE7_1_F13_LEO_COUNT,
      totalCount: M8A_V4_CUSTOMER_PHASE7_1_F13_TOTAL_COUNT,
      routeNativeScaleClaimed: false
    },
    f13RouteNativeScaleReadiness: {
      version: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION,
      currentRouteActorCount,
      currentRouteLeoActorCount: currentRouteOrbitActorCounts.leo,
      currentRouteMeoActorCount: currentRouteOrbitActorCounts.meo,
      currentRouteGeoActorCount: currentRouteOrbitActorCounts.geo,
      readinessActorCount: readinessCounts.total,
      readinessLeoActorCount: readinessCounts.leo,
      readinessMeoActorCount: readinessCounts.meo,
      readinessGeoActorCount: readinessCounts.geo,
      targetLeoCount: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT,
      targetReached: readinessTargetReached,
      sourceType: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE,
      sourceMode: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE,
      sourceUrl: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL,
      dataSourceLabel: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL,
      publicSourceUsed: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED,
      builtAtUtc: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC,
      freshnessTimestampUtc:
        M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC,
      freshnessNotes: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES,
      licenseNotes: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES,
      knownGaps: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS,
      nonClaims: M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS,
      routeNativeScaleClosureClaimed: false,
      externalValidationClosureClaimed: false,
      itriAuthorityClaimed: false
    },
    externalValidationPackage: {
      artifact: M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT,
      status: M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS,
      failIds: M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS
    }
  };
}

function buildF09RateSurfaceState(
  simulationHandoverModel: M8aV4GroundStationSceneState["simulationHandoverModel"]
): M8aV4GroundStationSceneState["f09RateSurface"] {
  const currentWindow = simulationHandoverModel.window;
  const currentClass = currentWindow.boundedMetricClasses.networkSpeedClass;
  const classCopy = resolveF09RateClassCopy(currentClass);

  return {
    version: M8A_V4_CUSTOMER_F09_RATE_SURFACE_VERSION,
    disposition: M8A_V4_CUSTOMER_F09_RATE_DISPOSITION,
    externalTruthDisposition: M8A_V4_CUSTOMER_F09_EXTERNAL_TRUTH_DISPOSITION,
    currentWindowId: currentWindow.windowId,
    currentOrbitClass: currentWindow.displayRepresentativeOrbitClass,
    currentNetworkSpeedClass: currentClass,
    currentClassLabel: classCopy.classLabel,
    currentBucketLabel: classCopy.bucketLabel,
    currentReviewLabel: classCopy.reviewLabel,
    provenance: M8A_V4_CUSTOMER_F09_PROVENANCE,
    metricTruth: M8A_V4_CUSTOMER_F09_METRIC_TRUTH,
    measuredThroughputClaimed:
      M8A_V4_CUSTOMER_F09_MEASURED_THROUGHPUT_CLAIMED,
    rows: buildF09RateWindowRows()
  };
}

function buildF16ExportSurfaceState(
  latestExportRecord: M8aV4ItriF16ExportRecord | null
): M8aV4GroundStationSceneState["f16ExportSurface"] {
  return {
    version: M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION,
    schemaVersion: M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION,
    disposition: M8A_V4_CUSTOMER_F16_EXPORT_DISPOSITION,
    externalTruthDisposition: M8A_V4_CUSTOMER_F16_EXTERNAL_TRUTH_DISPOSITION,
    artifactTruth: M8A_V4_CUSTOMER_F16_EXPORT_ARTIFACT_TRUTH,
    exportFormat: M8A_V4_CUSTOMER_F16_EXPORT_FORMAT,
    provenance: M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE,
    routeOwnedStateOnly: M8A_V4_CUSTOMER_F16_ROUTE_OWNED_STATE_ONLY,
    measuredValuesIncluded: M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED,
    externalReportSystemTruthClaimed:
      M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED,
    explicitNonClaims: M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS,
    lastStatus: latestExportRecord?.status ?? "ready",
    lastGeneratedAtUtc: latestExportRecord?.generatedAtUtc ?? "",
    lastFilename: latestExportRecord?.filename ?? "",
    lastErrorMessage: latestExportRecord?.errorMessage ?? ""
  };
}

function buildPolicyRuleControlsState(
  activePolicyPresetId: M8aV4ItriF10PolicyPresetId,
  activeRulePresetId: M8aV4ItriF11RulePresetId
): M8aV4GroundStationSceneState["policyRuleControls"] {
  return {
    version: M8A_V4_CUSTOMER_POLICY_RULE_CONTROLS_VERSION,
    disposition: M8A_V4_CUSTOMER_POLICY_RULE_DISPOSITION,
    externalTruthDisposition:
      M8A_V4_CUSTOMER_POLICY_RULE_EXTERNAL_TRUTH_DISPOSITION,
    truthBoundary: M8A_V4_CUSTOMER_POLICY_RULE_TRUTH_BOUNDARY,
    exportAdjacentTruth: M8A_V4_CUSTOMER_POLICY_RULE_EXPORT_ADJACENT_TRUTH,
    f10RequirementId: "F-10",
    f11RequirementId: "F-11",
    policyPresetMode: M8A_V4_CUSTOMER_F10_POLICY_PRESET_MODE,
    rulePresetMode: M8A_V4_CUSTOMER_F11_RULE_PRESET_MODE,
    defaultPolicyPresetId: M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID,
    defaultRulePresetId: M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID,
    activePolicyPreset: resolveItriF10PolicyPreset(activePolicyPresetId),
    activeRulePreset: resolveItriF11RulePreset(activeRulePresetId),
    policyPresets: M8A_V4_CUSTOMER_F10_POLICY_PRESETS,
    rulePresets: M8A_V4_CUSTOMER_F11_RULE_PRESETS,
    routeOwnedStateOnly: M8A_V4_CUSTOMER_POLICY_RULE_ROUTE_OWNED_STATE_ONLY,
    liveControlClaimed: M8A_V4_CUSTOMER_POLICY_RULE_LIVE_CONTROL_CLAIMED,
    backendControlClaimed: M8A_V4_CUSTOMER_POLICY_RULE_BACKEND_CONTROL_CLAIMED,
    networkControlClaimed: M8A_V4_CUSTOMER_POLICY_RULE_NETWORK_CONTROL_CLAIMED,
    arbitraryRuleEditorClaimed:
      M8A_V4_CUSTOMER_POLICY_RULE_ARBITRARY_EDITOR_CLAIMED,
    measuredDecisionTruthClaimed:
      M8A_V4_CUSTOMER_POLICY_RULE_MEASURED_DECISION_TRUTH_CLAIMED
  };
}

function createF16ExportFilename(
  state: M8aV4GroundStationSceneState,
  generatedAtUtc: string
): string {
  const timestamp = generatedAtUtc.replaceAll(":", "-").replaceAll(".", "-");

  return `itri-demo-route-f16-bounded-${state.simulationHandoverModel.endpointPairId}-${timestamp}.json`;
}

function buildF16RouteExportBundle(
  state: M8aV4GroundStationSceneState,
  generatedAtUtc: string
): M8aV4ItriF16RouteExportBundle {
  const activeWindow = state.simulationHandoverModel.window;
  const filename = createF16ExportFilename(state, generatedAtUtc);

  return {
    schemaVersion: M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION,
    version: M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION,
    generatedAtUtc,
    routeId: state.simulationHandoverModel.route,
    scenarioId: state.scenarioId,
    endpointPair: {
      endpointPairId: state.simulationHandoverModel.endpointPairId,
      precision: state.simulationHandoverModel.acceptedPairPrecision,
      endpoints: state.endpoints.map((endpoint) => ({
        endpointId: endpoint.endpointId,
        label: endpoint.label,
        precisionBadge: endpoint.precisionBadge,
        renderPrecision: endpoint.renderPrecision,
        displayPositionIsSourceTruth: endpoint.displayPositionIsSourceTruth,
        rawSourceCoordinatesRenderable: endpoint.rawSourceCoordinatesRenderable,
        orbitEvidenceChips: [...endpoint.orbitEvidenceChips]
      }))
    },
    precision: state.simulationHandoverModel.acceptedPairPrecision,
    actorCounts: {
      leo: state.orbitActorCounts.leo,
      meo: state.orbitActorCounts.meo,
      geo: state.orbitActorCounts.geo,
      total: state.actorCount
    },
    activeModeledWindow: {
      windowId: activeWindow.windowId,
      windowLabel: resolveTimelineLabel(activeWindow.windowId),
      currentPrimaryOrbitClass: state.serviceState.window.currentPrimaryOrbitClass,
      nextCandidateOrbitClass: state.serviceState.window.nextCandidateOrbitClass,
      continuityFallbackOrbitClass:
        state.serviceState.window.continuityFallbackOrbitClass,
      displayRepresentativeOrbitClass:
        activeWindow.displayRepresentativeOrbitClass,
      boundedMetricClasses: { ...activeWindow.boundedMetricClasses },
      modelTruth: state.simulationHandoverModel.modelTruth
    },
    requirementStatusGroups: state.requirementGapSurface.groups.map((group) => ({
      ...group,
      requirementIds: [...group.requirementIds]
    })),
    f13ScaleReadiness: {
      version: state.acceptanceLayer.f13RouteNativeScaleReadiness.version,
      currentRouteActorCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .currentRouteActorCount,
      currentRouteLeoActorCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .currentRouteLeoActorCount,
      readinessActorCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount,
      readinessLeoActorCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .readinessLeoActorCount,
      readinessMeoActorCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .readinessMeoActorCount,
      readinessGeoActorCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .readinessGeoActorCount,
      targetLeoCount:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount,
      targetReached:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.targetReached,
      sourceType: state.acceptanceLayer.f13RouteNativeScaleReadiness.sourceType,
      sourceMode: state.acceptanceLayer.f13RouteNativeScaleReadiness.sourceMode,
      sourceUrl: state.acceptanceLayer.f13RouteNativeScaleReadiness.sourceUrl,
      publicSourceUsed:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.publicSourceUsed,
      builtAtUtc: state.acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc,
      freshnessTimestampUtc:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .freshnessTimestampUtc,
      licenseNotes:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.licenseNotes,
      freshnessNotes:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.freshnessNotes,
      knownGaps: [
        ...state.acceptanceLayer.f13RouteNativeScaleReadiness.knownGaps
      ],
      routeNativeScaleClosureClaimed:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .routeNativeScaleClosureClaimed,
      externalValidationClosureClaimed:
        state.acceptanceLayer.f13RouteNativeScaleReadiness
          .externalValidationClosureClaimed,
      itriAuthorityClaimed:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.itriAuthorityClaimed
    },
    f09BoundedRateDisposition: {
      requirementId: "F-09",
      disposition: state.f09RateSurface.disposition,
      externalTruthDisposition: state.f09RateSurface.externalTruthDisposition,
      currentWindowId: state.f09RateSurface.currentWindowId,
      currentNetworkSpeedClass:
        state.f09RateSurface.currentNetworkSpeedClass,
      currentClassLabel: state.f09RateSurface.currentClassLabel,
      currentBucketLabel: state.f09RateSurface.currentBucketLabel,
      provenance: state.f09RateSurface.provenance,
      metricTruth: state.f09RateSurface.metricTruth,
      measuredThroughputClaimed:
        state.f09RateSurface.measuredThroughputClaimed,
      rows: state.f09RateSurface.rows.map((row) => ({ ...row }))
    },
    policyRuleControls: {
      version: state.policyRuleControls.version,
      disposition: state.policyRuleControls.disposition,
      externalTruthDisposition:
        state.policyRuleControls.externalTruthDisposition,
      truthBoundary: state.policyRuleControls.truthBoundary,
      exportAdjacentTruth: state.policyRuleControls.exportAdjacentTruth,
      activePolicyPresetId:
        state.policyRuleControls.activePolicyPreset.presetId,
      activeRulePresetId: state.policyRuleControls.activeRulePreset.presetId,
      policyPresetMode: state.policyRuleControls.policyPresetMode,
      rulePresetMode: state.policyRuleControls.rulePresetMode,
      routeOwnedStateOnly: state.policyRuleControls.routeOwnedStateOnly,
      liveControlClaimed: state.policyRuleControls.liveControlClaimed,
      backendControlClaimed: state.policyRuleControls.backendControlClaimed,
      networkControlClaimed: state.policyRuleControls.networkControlClaimed,
      arbitraryRuleEditorClaimed:
        state.policyRuleControls.arbitraryRuleEditorClaimed,
      measuredDecisionTruthClaimed:
        state.policyRuleControls.measuredDecisionTruthClaimed
    },
    linkFlowCueMetadata: {
      version: state.relationCues.dataFlowCueVersion,
      mode: state.relationCues.dataFlowCueMode,
      directions: [...state.relationCues.dataFlowDirections],
      pulseCount: state.relationCues.dataFlowPulseCount,
      truthBoundary: state.relationCues.dataFlowTruthBoundary
    },
    provenance: {
      exportProvenance: M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE,
      generatedFromArtifactId: state.generatedFromArtifactId,
      projectionId: state.projectionId,
      projectionRead: state.sourceLineage.projectionRead,
      serviceStateRead: state.sourceLineage.serviceStateRead,
      simulationHandoverRead: state.sourceLineage.simulationHandoverRead,
      rawPackageSideReadOwnership: state.sourceLineage.rawPackageSideReadOwnership,
      rawSourcePathsIncluded: state.sourceLineage.rawSourcePathsIncluded
    },
    nonClaims: {
      explicitNonClaims: M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS,
      routeNarrativeNonClaims: state.nonClaims,
      measuredValuesIncluded: M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED,
      externalReportSystemTruthClaimed:
        M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED
    },
    exportFile: {
      format: M8A_V4_CUSTOMER_F16_EXPORT_FORMAT,
      filename
    }
  };
}

function downloadF16RouteExportBundle(
  bundle: M8aV4ItriF16RouteExportBundle
): void {
  const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = bundle.exportFile.filename;
  link.rel = "noopener";
  link.dataset.itriF16DownloadLink = "true";
  link.style.display = "none";
  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
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

export function createM8aV4GroundStationSceneController({
  viewer,
  hudFrame,
  replayClock
}: M8aV4GroundStationSceneControllerOptions): M8aV4GroundStationSceneController {
  const modelUri = resolveModelUri();
  const dataSource = new CustomDataSource(M8A_V4_GROUND_STATION_DATA_SOURCE_NAME);
  // sceneEndpointContext is reassigned by setSelectedPair (wave 2 §A.6
  // extension) so endpoint A/B markers + ribbon + camera framing can
  // re-anchor on a reselection without a page reload.
  let sceneEndpointContext = buildSceneEndpointContext();
  const visualTokenController: M8aV411VisualTokenController =
    installM8aV411VisualTokens(viewer);
  const hudRoot = createHudRoot();
  const productUxRoot = createProductUxRoot({
    focusChoreographyVersion:
      M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
    defaultFocusVersion: M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
    narrowVersion: M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION
  });
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
  let selectedPairOverlayState = createSelectedPairOverlayDebugState(
    sceneEndpointContext.selectedPair ? "loading" : "not-requested"
  );
  let selectedPairOverlayInstallGeneration = 0;
  let detailsDisclosureOpen = false;
  let boundaryDisclosureOpen = false;
  let sourcesDisclosureOpen = false;
  let activeInspectorTab: M8aV411InspectorTab = "decision";
  let sourcesFilter = createM8aV411DefaultSourcesFilter(
    "advanced-source-provenance"
  );
  let boundaryFullTruthDisclosureOpen = false;
  let finalHoldActive = false;
  let finalHoldStartedAtEpochMs: number | null = null;
  let finalHoldCompletedAtEpochMs: number | null = null;
  let finalHoldLoopCount = 0;
  let finalHoldTimeoutId: number | undefined;
  let resumeAfterFinalHold = true;
  let productLoopArmed = true;
  let latestSimulationWindow = resolveSimulationHandoverWindow(
    replayClock.getState()
  );
  let activeTransitionEvent: M8aV49TransitionEventRuntime | null = null;
  let transitionTimeoutId: number | undefined;
  let refreshAfterTransitionTimeout: (() => void) | null = null;
  let lastPointerActivatedControl: HTMLElement | null = null;
  let lastPointerActivatedAt = 0;
  let narrowRailDrawerOpen = false;
  let lastDetailsTriggerElement: HTMLElement | null = null;
  let lastRailTriggerElement: HTMLElement | null = null;
  let lastSyncReplayRatio = resolveReplayWindowRatio(replayClock.getState());
  let latestF16ExportRecord: M8aV4ItriF16ExportRecord | null = null;
  let latestF16ExportBundle: M8aV4ItriF16RouteExportBundle | null = null;
  let activePolicyPresetId: M8aV4ItriF10PolicyPresetId =
    M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID;
  let activeRulePresetId: M8aV4ItriF11RulePresetId =
    M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID;

  const reviewerModeStorage: Pick<Storage, "getItem" | "setItem"> | null =
    typeof window !== "undefined" && typeof window.localStorage === "object"
      ? window.localStorage
      : null;
  let reviewerModeState: M8aV411ReviewerModeState =
    createM8aV411ReviewerModeInitialState({
      reviewModeOn: readM8aV411ReviewerModePersistedToggle(reviewerModeStorage),
      nowEpochMs: Date.now()
    });
  let reviewAutoPauseTimeoutId: number | undefined;

  configureReplayClock(viewer, replayClock);
  applyV4Camera(viewer, sceneEndpointContext);
  hudFrame.dataset.hudVisibility = "m8a-v4";
  hudFrame.setAttribute("aria-hidden", "false");
  hudFrame.appendChild(hudRoot);
  hudFrame.appendChild(productUxRoot);

  let endpointA = sceneEndpointContext.endpoints.find(
    (endpoint) => endpoint.endpointRole === "endpoint-a"
  );
  let endpointB = sceneEndpointContext.endpoints.find(
    (endpoint) => endpoint.endpointRole === "endpoint-b"
  );

  if (!endpointA || !endpointB) {
    throw new Error("V4 ground-station scene requires both endpoint roles.");
  }

  for (const endpoint of sceneEndpointContext.endpoints) {
    dataSource.entities.add(createEndpointEntityOptions(endpoint));
  }

  dataSource.entities.add(
    createEndpointContextRibbonEntityOptions({
      endpointA,
      endpointB,
      selectedPairActive: sceneEndpointContext.selectedPair !== null
    })
  );

  const initialSelectedPairOverlayGeneration = ++selectedPairOverlayInstallGeneration;
  void installSelectedPairTleFirstSceneLayer({
    dataSource,
    endpointA,
    endpointB,
    modelUri,
    replayClock,
    selectedPair: sceneEndpointContext.selectedPair,
    viewer,
    onStateChange: (state) => {
      selectedPairOverlayState = state;
    },
    shouldSkip: () =>
      disposed ||
      initialSelectedPairOverlayGeneration !== selectedPairOverlayInstallGeneration,
    applyCameraHint: (cameraHint) =>
      applySelectedPairCameraHint(viewer, sceneEndpointContext, cameraHint)
  }).catch((error) => {
    selectedPairOverlayState = createSelectedPairOverlayDebugState("error", {
      errorMessage: error instanceof Error ? error.message : "unknown overlay error"
    });
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
    const displayMotion = resolveActorDisplayMotionState(actor, timeRatio);
    const propagationTimeUtc = time
      ? JulianDate.toDate(time).toISOString()
      : toIsoTimestamp(replayState.currentTime);

    if (track.trackKind === "east-asia-near-fixed-geo-anchor") {
      // Source GEO altitude stays in sourcePosition; render height is compressed
      // so one continuity anchor does not dominate the viewport framing.
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
      const emphasis = resolveActorEmphasis(actor, latestSimulationWindow);
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
            simulationWindow: latestSimulationWindow
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
        positionToCartesian(endpointA!.renderMarker.displayPosition),
        resolveActorRenderPosition(actor, time).cartesian,
        positionToCartesian(endpointB!.renderMarker.displayPosition)
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
        time,
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
  function setFixtureDrivenEntitiesVisible(visible: boolean): void {
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
    geoGuardCueEntity.show =
      visible && shouldShowGeoGuardCue(latestSimulationWindow);
  }

  const clearFinalHoldTimer = (): void => {
    if (typeof finalHoldTimeoutId === "number") {
      window.clearTimeout(finalHoldTimeoutId);
      finalHoldTimeoutId = undefined;
    }
  };

  const finishFinalHold = (): void => {
    if (disposed || !finalHoldActive) {
      return;
    }

    const shouldResume = resumeAfterFinalHold;
    finalHoldActive = false;
    finalHoldCompletedAtEpochMs = Date.now();
    finalHoldStartedAtEpochMs = null;
    finalHoldLoopCount += 1;
    finalHoldTimeoutId = undefined;
    replayClock.seek(replayClock.getState().startTime);

    if (shouldResume) {
      productLoopArmed = true;
      reviewerModeState = transitionForUserPlay(reviewerModeState, {
        nowEpochMs: Date.now()
      });
      replayClock.play();
    } else {
      productLoopArmed = false;
      replayClock.pause();
    }

    syncState();
  };

  const completeFinalHoldIfElapsed = (): boolean => {
    if (
      !finalHoldActive ||
      typeof finalHoldStartedAtEpochMs !== "number" ||
      Date.now() - finalHoldStartedAtEpochMs < M8A_V47_FINAL_HOLD_DURATION_MS
    ) {
      return false;
    }

    finishFinalHold();
    return true;
  };

  const startFinalHold = (): void => {
    if (disposed || finalHoldActive) {
      return;
    }

    finalHoldActive = true;
    finalHoldStartedAtEpochMs = Date.now();
    finalHoldCompletedAtEpochMs = null;
    resumeAfterFinalHold = true;
    productLoopArmed = true;
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForFinalHoldEnter(reviewerModeState, {
      nowEpochMs: Date.now()
    });
    replayClock.seek(replayClock.getState().stopTime);
    replayClock.pause();
    syncState();
    clearFinalHoldTimer();
    finalHoldTimeoutId = window.setTimeout(
      completeFinalHoldIfElapsed,
      M8A_V47_FINAL_HOLD_DURATION_MS
    );
  };

  const cancelFinalHold = (): void => {
    if (!finalHoldActive) {
      clearFinalHoldTimer();
      return;
    }

    finalHoldActive = false;
    finalHoldStartedAtEpochMs = null;
    resumeAfterFinalHold = false;
    productLoopArmed = false;
    clearFinalHoldTimer();
  };

  const setProductPlaybackMultiplier = (
    multiplier: M8aV47ProductPlaybackMultiplier
  ): void => {
    if (!M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS.includes(multiplier)) {
      throw new Error(`Unsupported V4.7 product playback multiplier: ${multiplier}`);
    }

    replayClock.setMultiplier(multiplier);
    syncState();
  };

  const setDebugTestPlaybackMultiplier = (
    multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
  ): void => {
    if (multiplier !== M8A_V47_DEBUG_TEST_MULTIPLIER) {
      throw new Error(`Unsupported V4.7 debug playback multiplier: ${multiplier}`);
    }

    replayClock.setMultiplier(multiplier);
    syncState();
  };

  const clearReviewAutoPauseTimer = (): void => {
    if (typeof reviewAutoPauseTimeoutId === "number") {
      window.clearTimeout(reviewAutoPauseTimeoutId);
      reviewAutoPauseTimeoutId = undefined;
    }
  };

  const scheduleReviewAutoPauseElapsed = (): void => {
    clearReviewAutoPauseTimer();
    reviewAutoPauseTimeoutId = window.setTimeout(() => {
      reviewAutoPauseTimeoutId = undefined;
      if (
        reviewerModeState.replayClockMode === "review-auto-paused" &&
        isM8aV411ReviewAutoPauseElapsed(reviewerModeState, Date.now())
      ) {
        reviewerModeState = transitionForReviewAutoPauseElapsed(
          reviewerModeState,
          { nowEpochMs: Date.now() }
        );
        productLoopArmed = true;
        replayClock.play();
        syncState();
      }
    }, M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS + 60);
  };

  const playProductReplay = (): void => {
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForUserPlay(reviewerModeState, {
      nowEpochMs: Date.now()
    });

    if (finalHoldActive) {
      resumeAfterFinalHold = true;
      productLoopArmed = true;
      syncState();
      return;
    }

    if (resolveReplayWindowRatio(replayClock.getState()) >= 1) {
      replayClock.seek(replayClock.getState().startTime);
    }

    productLoopArmed = true;
    replayClock.play();
    syncState();
  };

  const pauseProductReplay = (): void => {
    cancelFinalHold();
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForUserPause(reviewerModeState, {
      nowEpochMs: Date.now()
    });
    productLoopArmed = false;
    replayClock.pause();
    syncState();
  };

  const restartProductReplay = (): void => {
    const replayState = replayClock.getState();
    const shouldPlayAfterRestart = finalHoldActive || replayState.isPlaying;
    cancelFinalHold();
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForUserPlay(reviewerModeState, {
      nowEpochMs: Date.now()
    });
    replayClock.seek(replayState.startTime);

    if (shouldPlayAfterRestart) {
      productLoopArmed = true;
      replayClock.play();
    } else {
      productLoopArmed = false;
      replayClock.pause();
    }

    syncState();
  };

  const openInspectorDisclosure = (tab: M8aV411InspectorTab): void => {
    detailsDisclosureOpen = true;
    activeInspectorTab = tab;
    boundaryDisclosureOpen = false;
    sourcesDisclosureOpen = false;
    boundaryFullTruthDisclosureOpen = false;
    clearReviewAutoPauseTimer();
    const replayState = replayClock.getState();
    const pinnedRatio = resolveReplayWindowRatio(replayState);
    const pinnedWindow = resolveSimulationHandoverWindow(replayState);
    reviewerModeState = transitionForInspectorOpen(reviewerModeState, {
      pinnedWindowId: pinnedWindow.windowId,
      pinnedReplayRatio: pinnedRatio,
      nowEpochMs: Date.now()
    });
    productLoopArmed = false;
    replayClock.pause();
    syncState();
    const inspectorSheet = productUxRoot.querySelector<HTMLElement>(
      "[data-m8a-v48-inspector='true']"
    );
    if (inspectorSheet) {
      inspectorSheet.scrollTop = 0;
    }
  };

  const toggleDetailsDisclosure = (): void => {
    openInspectorDisclosure("decision");
  };

  const closeDetailsDisclosure = (): void => {
    detailsDisclosureOpen = false;
    boundaryDisclosureOpen = false;
    sourcesDisclosureOpen = false;
    boundaryFullTruthDisclosureOpen = false;
    activeInspectorTab = "decision";

    const wasPinned =
      reviewerModeState.replayClockMode === "inspector-pinned";
    const pinnedRatio = reviewerModeState.pinnedReplayRatio;
    reviewerModeState = transitionForInspectorClose(reviewerModeState, {
      nowEpochMs: Date.now()
    });

    if (wasPinned && typeof pinnedRatio === "number") {
      const replayState = replayClock.getState();
      const startMs = toEpochMilliseconds(replayState.startTime);
      const stopMs = toEpochMilliseconds(replayState.stopTime);
      const targetMs = startMs + (stopMs - startMs) * pinnedRatio;
      replayClock.seek(new Date(targetMs).toISOString());
    }

    if (
      reviewerModeState.replayClockMode === "running" &&
      !finalHoldActive
    ) {
      productLoopArmed = true;
      replayClock.play();
    }

    syncState();
  };

  const toggleReviewerMode = (): void => {
    const next = !reviewerModeState.reviewModeOn;
    reviewerModeState = transitionForReviewModeToggle(reviewerModeState, {
      reviewModeOn: next,
      nowEpochMs: Date.now()
    });
    writeM8aV411ReviewerModePersistedToggle(reviewerModeStorage, next);

    if (
      !next &&
      reviewerModeState.replayClockMode === "running" &&
      !finalHoldActive &&
      !replayClock.getState().isPlaying
    ) {
      productLoopArmed = true;
      replayClock.play();
    }

    clearReviewAutoPauseTimer();
    syncState();
  };

  const enterReviewAutoPauseIfApplicable = (): void => {
    if (
      !reviewerModeState.reviewModeOn ||
      reviewerModeState.replayClockMode !== "running" ||
      finalHoldActive
    ) {
      return;
    }

    reviewerModeState = transitionForReviewAutoPauseStart(reviewerModeState, {
      nowEpochMs: Date.now()
    });

    if (reviewerModeState.replayClockMode === "review-auto-paused") {
      productLoopArmed = false;
      replayClock.pause();
      scheduleReviewAutoPauseElapsed();
    }
  };

  const toggleBoundaryDisclosure = (): void => {
    boundaryDisclosureOpen = true;
    boundaryFullTruthDisclosureOpen = false;
    activeInspectorTab = "decision";
    // Conv 3: toggle-boundary is now triggered by footer chip (Truth button removed)
    productUxRoot.dataset.m8aV411FooterChipBoundaryBehavior =
      "footer-chip-opens-state-evidence-with-truth-tail-visible";
    syncState();
    productUxRoot
      .querySelector<HTMLElement>("[data-m8a-v411-inspector-role='state-evidence']")
      ?.scrollIntoView({ block: "nearest" });
  };

  const closeBoundaryDisclosure = (): void => {
    detailsDisclosureOpen = false;
    boundaryDisclosureOpen = false;
    sourcesDisclosureOpen = false;
    boundaryFullTruthDisclosureOpen = false;
    activeInspectorTab = "decision";
    syncState();
  };

  const focusSourcesRole = (): void => {
    const role = productUxRoot.querySelector<HTMLElement>(
      "[data-m8a-v411-inspector-role='sources']"
    );

    role?.scrollIntoView({ block: "nearest" });
    role?.focus({ preventScroll: true });
  };

  const sourceEndpointIds = new Set(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.map(
      (endpoint) => endpoint.endpointId
    )
  );
  const isEndpointId = (value: string): value is M8aV4EndpointId =>
    sourceEndpointIds.has(value as M8aV4EndpointId);

  const isOrbitClass = (value: string): value is M8aV4OrbitClass =>
    value === "leo" || value === "meo" || value === "geo";

  const resolveSourcesFilterFromElement = (
    element: HTMLElement,
    fallbackTrigger: M8aV411SourcesTrigger
  ): M8aV411SourcesFilter => {
    const trigger =
      (element.dataset.m8aV411SourcesTrigger as M8aV411SourcesTrigger | undefined) ??
      fallbackTrigger;
    const endpointCandidate =
      element.dataset.m8aV411SourcesEndpointId ??
      element.dataset.m8aV411HoverTargetId ??
      "";
    const orbitCandidate = element.dataset.m8aV411SourcesOrbitClass ?? "";

    return {
      trigger,
      endpointId: isEndpointId(endpointCandidate) ? endpointCandidate : "",
      orbitClass: isOrbitClass(orbitCandidate) ? orbitCandidate : ""
    };
  };

  const openSourcesDisclosure = (filter: M8aV411SourcesFilter): void => {
    detailsDisclosureOpen = true;
    sourcesDisclosureOpen = true;
    activeInspectorTab = "evidence";
    sourcesFilter = filter;
    productUxRoot.dataset.m8aV411PinnedHoverRole = "sources";
    productUxRoot.dataset.m8aV411PinnedSourcesTrigger = filter.trigger;
    productUxRoot.dataset.m8aV411SourcesAffordance =
      "advanced-source-provenance-toggle-only";
    syncState();
    focusSourcesRole();
  };

  const openSourcesFromElement = (
    element: HTMLElement,
    fallbackTrigger: M8aV411SourcesTrigger
  ): void => {
    openSourcesDisclosure(resolveSourcesFilterFromElement(element, fallbackTrigger));
  };

  const toggleSourceProvenanceDisclosure = (control: HTMLElement): void => {
    if (sourcesDisclosureOpen) {
      sourcesDisclosureOpen = false;
      syncState();
      return;
    }

    openSourcesFromElement(control, "advanced-source-provenance");
  };

  const hoverPopoverController = installM8aV411HoverPopoverController(
    productUxRoot,
    {
      pinStateEvidence: (target) => {
        detailsDisclosureOpen = true;
        productUxRoot.dataset.m8aV411PinnedHoverTargetKind =
          target.dataset.m8aV411HoverTargetKind ?? "";
        productUxRoot.dataset.m8aV411PinnedHoverTargetId =
          target.dataset.m8aV411HoverTargetId ?? "";
        productUxRoot.dataset.m8aV411PinnedHoverRole = "state-evidence";
        syncState();
      }
    }
  );

  const clearTransitionTimer = (): void => {
    if (typeof transitionTimeoutId === "number") {
      window.clearTimeout(transitionTimeoutId);
      transitionTimeoutId = undefined;
    }
  };

  const resolveVisibleTransitionEvent =
    (): M8aV49TransitionEventRuntime | null => {
      if (!activeTransitionEvent) {
        return null;
      }

      if (Date.now() >= activeTransitionEvent.expiresAtEpochMs) {
        return null;
      }

      return activeTransitionEvent;
    };

  const startTransitionEvent = (
    fromWindowId: M8aV46dSimulationHandoverWindowId,
    toWindowId: M8aV46dSimulationHandoverWindowId
  ): void => {
    if (fromWindowId === toWindowId) {
      return;
    }

    clearTransitionTimer();
    activeTransitionEvent = buildV49TransitionEvent(
      fromWindowId,
      toWindowId,
      Date.now()
    );
    transitionTimeoutId = window.setTimeout(() => {
      activeTransitionEvent = null;
      transitionTimeoutId = undefined;
      refreshAfterTransitionTimeout?.();
    }, M8A_V49_TRANSITION_EVENT_DURATION_MS);
  };

  const createState = (): M8aV4GroundStationSceneState => {
    const replayState = replayClock.getState();
    const serviceWindow = resolveServiceStateWindow(replayState);
    const simulationHandoverModel = buildSimulationHandoverState(replayState);
    const simulationWindow = simulationHandoverModel.window;
    const viewportClass = resolveViewportClass();
    const productUx = buildProductUxState({
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
      activeTransitionEvent: resolveVisibleTransitionEvent(),
      reviewerModeState,
      narrowRailDrawerOpen
    });
    const actorEmphasis =
      M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.map((actor) =>
        resolveActorEmphasis(actor, simulationWindow)
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
    const orbitActorCounts = {
      leo: actors.filter((actor) => actor.orbitClass === "leo").length,
      meo: actors.filter((actor) => actor.orbitClass === "meo").length,
      geo: actors.filter((actor) => actor.orbitClass === "geo").length
    };
    const visibleActorLabelIds = actors
      .filter((actor) => actor.labelVisibility === "always-visible")
      .map((actor) => actor.actorId);
    const hiddenContextActorLabelCount = actors.filter(
      (actor) => actor.labelVisibility === "hidden-context"
    ).length;

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
      sceneSourceMode: sceneEndpointContext.selectedPair
        ? "tle-first-runtime"
        : "fixture-fallback",
      dataSourceName: M8A_V4_GROUND_STATION_DATA_SOURCE_NAME,
      dataSourceAttached,
      endpointCount: 2,
      endpoints: buildEndpointState(sceneEndpointContext.endpoints),
      selectedPairOverlay: selectedPairOverlayState,
      actorCount: actors.length,
      orbitActorCounts,
      actors,
      actorLabelDensity: {
        policy: "representative-orbit-class-labels-only",
        v46ePolicy: "active-representative-label-with-endpoint-priority",
        viewportClass,
        endpointLabelsPriority: true,
        candidateLabelsVisibleByDefault: false,
        fallbackLabelPolicy: "geo-representative-or-guard-state-only",
        preferredVisibleActorLabelCount:
          M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS,
        visibleActorLabelCount: visibleActorLabelIds.length,
        visibleActorLabelIds,
        alwaysVisibleActorLabelCount: visibleActorLabelIds.length,
        alwaysVisibleActorLabelIds: visibleActorLabelIds,
        hiddenContextActorLabelCount,
        desktopMaxAlwaysVisibleActorLabels:
          M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS,
        narrowMaxAlwaysVisibleActorLabels:
          M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS
      },
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
      simulationHandoverModel,
      replayWindow: buildReplayWindowState(replayState),
      productUx,
      relationCues: {
        cueKind: "v4.6e-handover-visual-language-context-ribbons",
        displayRepresentativeActorId:
          simulationWindow.displayRepresentativeActorId,
        candidateContextActorId: simulationWindow.candidateContextActorIds[0],
        fallbackContextActorId: simulationWindow.fallbackContextActorIds[0],
        visibleContextRibbonCount: 2,
        visibleContextRibbonRoles: [
          "displayRepresentative",
          "candidateContext"
        ] as const,
        dataFlowCueVersion: M8A_V4_LINK_FLOW_CUE_VERSION,
        dataFlowCueMode: M8A_V4_LINK_FLOW_CUE_MODE,
        dataFlowDirections: M8A_V4_LINK_FLOW_DIRECTIONS,
        dataFlowPulseCount:
          M8A_V4_LINK_FLOW_RELATION_ROLES.length *
          M8A_V4_LINK_FLOW_DIRECTIONS.length *
          M8A_V4_LINK_FLOW_PULSE_OFFSETS.length,
        dataFlowTruthBoundary: M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
        fallbackGuardCueMode: resolveFallbackGuardCueMode(simulationWindow),
        fallbackFullRibbonVisible: false,
        activeSatelliteTruth: "not-claimed",
        activeGatewayTruth: "not-claimed",
        pairSpecificTeleportPathTruth: "not-claimed",
        nativeRfHandoverTruth: "not-claimed"
      },
      requirementGapSurface: buildRequirementGapSurfaceState(),
      acceptanceLayer: buildAcceptanceLayerState(actors.length, orbitActorCounts),
      f09RateSurface: buildF09RateSurfaceState(simulationHandoverModel),
      f16ExportSurface: buildF16ExportSurfaceState(latestF16ExportRecord),
      policyRuleControls: buildPolicyRuleControlsState(
        activePolicyPresetId,
        activeRulePresetId
      ),
      nonClaims:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.runtimeNarrativeNonClaims,
      proofSeam: M8A_V4_GROUND_STATION_PROOF_SEAM,
      sourceLineage: {
        projectionRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION",
        serviceStateRead:
          "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline",
        simulationHandoverRead:
          "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline",
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
    let nextState = createState();
    const previousWindowId = latestSimulationWindow.windowId;
    const nextWindowId = nextState.simulationHandoverModel.window.windowId;

    if (previousWindowId !== nextWindowId) {
      const nextRatio = nextState.productUx.playback.replayRatio;
      const ratioJump = Math.abs(nextRatio - lastSyncReplayRatio);
      // Only auto-pause for natural replay progression. A large jump (e.g.
      // user seek, controller.play after seek) is not a natural transition.
      const isNaturalProgression = ratioJump < 0.05;
      startTransitionEvent(previousWindowId, nextWindowId);
      if (isNaturalProgression) {
        enterReviewAutoPauseIfApplicable();
      }
      nextState = createState();
    }
    lastSyncReplayRatio = nextState.productUx.playback.replayRatio;

    latestSimulationWindow = nextState.simulationHandoverModel.window;
    const emphasisById = new Map(
      nextState.actors.map((actor) => [
        actor.actorId,
        resolveActorEmphasis(
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.find(
            (projectionActor) => projectionActor.actorId === actor.actorId
          ) ?? M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors[0],
          latestSimulationWindow
        )
      ])
    );

    for (const handle of actorHandles) {
      const emphasis = emphasisById.get(handle.actor.actorId);

      if (emphasis) {
        updateActorStyle(handle, emphasis, latestSimulationWindow);
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

    setFixtureDrivenEntitiesVisible(!sceneEndpointContext.selectedPair);

    renderHud(hudRoot, nextState);
    renderProductUx(
      productUxRoot,
      nextState,
      viewer,
      visualTokenController,
      sceneEndpointContext.endpoints
    );
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    return nextState;
  };
  const exportF16BoundedRouteJson = (): M8aV4ItriF16RouteExportBundle => {
    const stateForExport = syncState();
    const generatedAtUtc = new Date().toISOString();
    const bundle = buildF16RouteExportBundle(stateForExport, generatedAtUtc);

    try {
      downloadF16RouteExportBundle(bundle);
      latestF16ExportRecord = {
        generatedAtUtc,
        filename: bundle.exportFile.filename,
        status: "exported",
        errorMessage: ""
      };
      latestF16ExportBundle = bundle;
    } catch (error) {
      latestF16ExportRecord = {
        generatedAtUtc,
        filename: bundle.exportFile.filename,
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "unknown export error"
      };
      latestF16ExportBundle = bundle;
    }

    syncState();
    return bundle;
  };
  const setItriF10PolicyPreset = (
    presetId: M8aV4ItriF10PolicyPresetId
  ): void => {
    activePolicyPresetId = presetId;
    syncState();
  };
  const setItriF11RulePreset = (
    presetId: M8aV4ItriF11RulePresetId
  ): void => {
    activeRulePresetId = presetId;
    syncState();
  };
  refreshAfterTransitionTimeout = () => {
    if (!disposed) {
      syncState();
    }
  };

  const activateProductUxControl = (
    control: HTMLElement,
    event: MouseEvent | KeyboardEvent
  ): void => {
    const action = control.dataset.m8aV47Action;

    switch (action) {
      case "play":
        playProductReplay();
        break;
      case "pause":
        pauseProductReplay();
        break;
      case "restart":
        restartProductReplay();
        break;
      case "speed": {
        const multiplier = Number(control.dataset.m8aV47PlaybackMultiplier);

        if (
          multiplier === M8A_V47_GUIDED_REVIEW_MULTIPLIER ||
          multiplier === M8A_V47_PRODUCT_DEFAULT_MULTIPLIER ||
          multiplier === M8A_V47_QUICK_SCAN_MULTIPLIER
        ) {
          setProductPlaybackMultiplier(multiplier);
        }

        break;
      }
      case "toggle-disclosure":
        if (control instanceof HTMLElement) {
          lastDetailsTriggerElement = control;
        }
        toggleDetailsDisclosure();
        break;
      case "close-disclosure":
        closeDetailsDisclosure();
        if (lastDetailsTriggerElement) {
          window.setTimeout(() => {
            if (lastDetailsTriggerElement) {
              lastDetailsTriggerElement.focus({ preventScroll: true });
              lastDetailsTriggerElement = null;
            }
          }, 0);
        }
        break;
      case "toggle-boundary":
        toggleBoundaryDisclosure();
        break;
      case "toggle-source-provenance":
        toggleSourceProvenanceDisclosure(control);
        break;
      case "toggle-boundary-full-truth": {
        event.preventDefault();
        if (boundaryDisclosureOpen) {
          boundaryFullTruthDisclosureOpen = true;
          syncState();
        }

        break;
      }
      case "close-boundary":
        closeBoundaryDisclosure();
        break;
      case "switch-inspector-tab": {
        const tab = control.dataset.m8aV411InspectorTab;
        if (
          M8A_V411_INSPECTOR_TABS.includes(tab as M8aV411InspectorTab)
        ) {
          activeInspectorTab = tab as M8aV411InspectorTab;
          detailsDisclosureOpen = true;
          boundaryDisclosureOpen = false;
          sourcesDisclosureOpen = false;
          boundaryFullTruthDisclosureOpen = false;
          syncState();
        }
        break;
      }
      case "open-evidence": {
        openInspectorDisclosure("evidence");
        break;
      }
      case "toggle-review-mode": {
        toggleReviewerMode();
        break;
      }
      case "export-f16-bounded-route-json": {
        event.preventDefault();
        exportF16BoundedRouteJson();
        break;
      }
      case "open-handover-rail": {
        if (control instanceof HTMLElement) {
          lastRailTriggerElement = control;
        }
        narrowRailDrawerOpen = true;
        syncState();
        const drawer = productUxRoot.querySelector<HTMLElement>(
          "[data-m8a-v411-handover-rail='true']"
        );
        if (drawer) {
          window.setTimeout(() => {
            const focusTarget =
              drawer.querySelector<HTMLElement>(
                "[data-m8a-v411-rail-main-chip='true']"
              ) ?? drawer;
            if (focusTarget instanceof HTMLElement) {
              if (!focusTarget.hasAttribute("tabindex")) {
                focusTarget.setAttribute("tabindex", "-1");
              }
              focusTarget.focus({ preventScroll: true });
            }
          }, 0);
        }
        break;
      }
      case "close-handover-rail": {
        narrowRailDrawerOpen = false;
        syncState();
        if (lastRailTriggerElement) {
          lastRailTriggerElement.focus({ preventScroll: true });
          lastRailTriggerElement = null;
        }
        break;
      }
    }
  };

  const resolveProductUxControl = (event: MouseEvent): HTMLElement | null => {
    if (!(event.target instanceof Element)) {
      return null;
    }

    const control = event.target.closest<HTMLElement>("[data-m8a-v47-action]");

    if (!control || !productUxRoot.contains(control)) {
      return null;
    }

    return control;
  };

  const handleProductUxMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    const control = resolveProductUxControl(event);

    if (!control) {
      return;
    }

    lastPointerActivatedControl = control;
    lastPointerActivatedAt = window.performance.now();
    activateProductUxControl(control, event);
    window.setTimeout(() => {
      if (!disposed) {
        syncState();
      }
      if (lastPointerActivatedControl === control) {
        lastPointerActivatedControl = null;
      }
    }, 0);
  };

  const handleProductUxClick = (event: MouseEvent): void => {
    const control = resolveProductUxControl(event);

    if (!control) {
      return;
    }

    if (
      lastPointerActivatedControl === control &&
      window.performance.now() - lastPointerActivatedAt < 500
    ) {
      event.preventDefault();
      lastPointerActivatedControl = null;
      return;
    }

    activateProductUxControl(control, event);
  };

  const handleProductUxChange = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement) || !productUxRoot.contains(target)) {
      return;
    }

    if (target.matches("[data-itri-f10-policy-selector='true']")) {
      if (isM8aV4ItriF10PolicyPresetId(target.value)) {
        setItriF10PolicyPreset(target.value);
      }
      return;
    }

    if (target.matches("[data-itri-f11-rule-preset='true']")) {
      if (isM8aV4ItriF11RulePresetId(target.value)) {
        setItriF11RulePreset(target.value);
      }
    }
  };

  const matchMediaSafe = (query: string): boolean => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };

  const isNarrowModalActive = (): boolean => {
    if (!detailsDisclosureOpen) {
      return false;
    }
    return matchMediaSafe("(max-width: 1023px)");
  };

  const collectFocusableModalTargets = (
    container: HTMLElement
  ): HTMLElement[] => {
    const candidates = container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
        "details > summary"
      ].join(", ")
    );
    return Array.from(candidates).filter((element) => {
      if (element.hasAttribute("disabled")) {
        return false;
      }
      if (element.getAttribute("aria-hidden") === "true") {
        return false;
      }
      if (element.hidden) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return false;
      }
      return true;
    });
  };

  const handleProductUxKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (detailsDisclosureOpen) {
        event.preventDefault();
        closeDetailsDisclosure();
        if (lastDetailsTriggerElement) {
          window.setTimeout(() => {
            if (lastDetailsTriggerElement) {
              lastDetailsTriggerElement.focus({ preventScroll: true });
              lastDetailsTriggerElement = null;
            }
          }, 0);
        }
        return;
      }
      if (narrowRailDrawerOpen) {
        event.preventDefault();
        narrowRailDrawerOpen = false;
        syncState();
        if (lastRailTriggerElement) {
          lastRailTriggerElement.focus({ preventScroll: true });
          lastRailTriggerElement = null;
        }
        return;
      }
    }

    if (event.key === "Tab" && isNarrowModalActive()) {
      const sheet = productUxRoot.querySelector<HTMLElement>(
        "aside[data-m8a-v411-inspector-concurrency]"
      );
      if (sheet) {
        const focusables = collectFocusableModalTargets(sheet);
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
          return;
        }
        if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
          return;
        }
        if (active && !sheet.contains(active)) {
          event.preventDefault();
          first.focus({ preventScroll: true });
          return;
        }
      }
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const control = target.closest<HTMLElement>("[data-m8a-v47-action]");

    if (
      !control ||
      !productUxRoot.contains(control) ||
      control instanceof HTMLButtonElement
    ) {
      return;
    }

    event.preventDefault();
    activateProductUxControl(control, event);
  };

  productUxRoot.addEventListener("mouseup", handleProductUxMouseUp);
  productUxRoot.addEventListener("click", handleProductUxClick);
  productUxRoot.addEventListener("change", handleProductUxChange);
  productUxRoot.addEventListener("keydown", handleProductUxKeyDown);
  const removeFinalHoldClockListener = viewer.clock.onTick.addEventListener(
    () => {
      completeFinalHoldIfElapsed();
    }
  );

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

  const unsubscribeReplayClock = replayClock.onTick((replayState) => {
    if (
      productLoopArmed &&
      !finalHoldActive &&
      resolveReplayWindowRatio(replayState) >= 1
    ) {
      startFinalHold();
      return;
    }

    syncState();
  });

  /**
   * Wave-2 selection re-anchor: rebuild the endpoint markers, ribbon
   * polyline, camera framing, and selected-pair satellite overlay from a
   * freshly resolved pair without disposing the controller. Touches the
   * minimum entity surface — endpoint entities, ribbon entity, and the
   * selected-pair overlay entities. Fixture-driven actors, relations,
   * link-flow segments, and the productUx HUD are left untouched.
   */
  function applySelectedPair(pair: V4ResolvedStationPair | null): void {
    if (disposed) {
      return;
    }
    // Remove the existing endpoint + ribbon + selected-pair overlay
    // entities. The selected-pair overlay tags its satellite entities with
    // `m8a-v4-selected-pair-*` entity ids; iterate over a snapshot because
    // removeById mutates the live list.
    if (endpointA) {
      dataSource.entities.removeById(`m8a-v4-endpoint-${endpointA.endpointId}`);
    }
    if (endpointB) {
      dataSource.entities.removeById(`m8a-v4-endpoint-${endpointB.endpointId}`);
    }
    dataSource.entities.removeById(
      "m8a-v4-operator-family-endpoint-context-ribbon"
    );
    const overlayEntityIds = dataSource.entities.values
      .map((entity) => entity.id)
      .filter((id) =>
        typeof id === "string" &&
        (id === "m8a-v4-selected-pair-runtime-link" ||
          id.startsWith("m8a-v4-selected-pair-satellite-") ||
          id.startsWith("m8a-v4-selected-pair-link-flow-") ||
          id.startsWith("m8a-v4-selected-pair-handover-cue-"))
      );
    for (const id of overlayEntityIds) {
      dataSource.entities.removeById(id);
    }

    // Rebuild the scene endpoint context from the new pair. When pair is
    // null, the runtime projection's fixture-driven endpoints take over,
    // matching the bootstrap-time fallback shape from buildSceneEndpointContext.
    if (pair) {
      configureSelectedPairReplayClock(viewer, replayClock);
      setFixtureDrivenEntitiesVisible(false);
      sceneEndpointContext = {
        endpoints: [
          createSelectedPairEndpointContext(pair.stationA, "endpoint-a"),
          createSelectedPairEndpointContext(pair.stationB, "endpoint-b")
        ],
        selectedPair: pair
      };
    } else {
      configureReplayClock(viewer, replayClock);
      setFixtureDrivenEntitiesVisible(true);
      sceneEndpointContext = {
        endpoints: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints,
        selectedPair: null
      };
    }

    endpointA = sceneEndpointContext.endpoints.find(
      (endpoint) => endpoint.endpointRole === "endpoint-a"
    );
    endpointB = sceneEndpointContext.endpoints.find(
      (endpoint) => endpoint.endpointRole === "endpoint-b"
    );

    if (!endpointA || !endpointB) {
      return;
    }

    // Re-add the endpoint entities at the new positions.
    for (const endpoint of sceneEndpointContext.endpoints) {
      dataSource.entities.add(createEndpointEntityOptions(endpoint));
    }

    // Re-add the ribbon polyline at the new positions.
    dataSource.entities.add(
      createEndpointContextRibbonEntityOptions({
        endpointA,
        endpointB,
        selectedPairActive: sceneEndpointContext.selectedPair !== null
      })
    );

    // Reset the overlay debug state to `loading` while the async overlay
    // install re-runs; the onStateChange callback below resets it to
    // `ready`/`empty`/`error` as the projection completes.
    selectedPairOverlayState = createSelectedPairOverlayDebugState(
      sceneEndpointContext.selectedPair ? "loading" : "not-requested"
    );

    const selectedPairOverlayGeneration = ++selectedPairOverlayInstallGeneration;
    void installSelectedPairTleFirstSceneLayer({
      dataSource,
      endpointA,
      endpointB,
      modelUri,
      replayClock,
      selectedPair: sceneEndpointContext.selectedPair,
      viewer,
      onStateChange: (state) => {
        selectedPairOverlayState = state;
      },
      shouldSkip: () =>
        disposed ||
        selectedPairOverlayGeneration !== selectedPairOverlayInstallGeneration,
      applyCameraHint: (cameraHint) =>
        applySelectedPairCameraHint(viewer, sceneEndpointContext, cameraHint)
    }).catch((error) => {
      selectedPairOverlayState = createSelectedPairOverlayDebugState("error", {
        errorMessage:
          error instanceof Error ? error.message : "unknown overlay error"
      });
    });

    applyV4Camera(viewer, sceneEndpointContext);
    viewer.scene.requestRender();
  }

  return {
    getState(): M8aV4GroundStationSceneState {
      completeFinalHoldIfElapsed();
      return cloneState(createState());
    },
    getLastF16RouteExport(): M8aV4ItriF16RouteExportBundle | null {
      return latestF16ExportBundle
        ? JSON.parse(JSON.stringify(latestF16ExportBundle))
        : null;
    },
    exportF16RouteState(): M8aV4ItriF16RouteExportBundle {
      return exportF16BoundedRouteJson();
    },
    subscribe(listener: (state: M8aV4GroundStationSceneState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play(): void {
      playProductReplay();
    },
    pause(): void {
      pauseProductReplay();
    },
    restart(): void {
      restartProductReplay();
    },
    setPlaybackMultiplier(multiplier: M8aV47ProductPlaybackMultiplier): void {
      setProductPlaybackMultiplier(multiplier);
    },
    setDebugPlaybackMultiplier(
      multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
    ): void {
      setDebugTestPlaybackMultiplier(multiplier);
    },
    setSelectedPair(pair: V4ResolvedStationPair | null): void {
      applySelectedPair(pair);
    },
    dispose(): void {
      disposed = true;
      clearFinalHoldTimer();
      clearTransitionTimer();
      clearReviewAutoPauseTimer();
      activeTransitionEvent = null;
      refreshAfterTransitionTimeout = null;
      removeFinalHoldClockListener();
      unsubscribeReplayClock();
      listeners.clear();
      hoverPopoverController.dispose();
      visualTokenController.dispose();
      disposeM8aV411TransientSurfaces(productUxRoot);
      productUxRoot.removeEventListener("mouseup", handleProductUxMouseUp);
      productUxRoot.removeEventListener("click", handleProductUxClick);
      productUxRoot.removeEventListener("change", handleProductUxChange);
      productUxRoot.removeEventListener("keydown", handleProductUxKeyDown);
      hudRoot.remove();
      productUxRoot.remove();
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
