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
  EllipseGraphics,
  Entity,
  HorizontalOrigin,
  JulianDate,
  LabelGraphics,
  LabelStyle,
  Math as CesiumMath,
  ModelGraphics,
  PointGraphics,
  PolylineArrowMaterialProperty,
  PolylineDashMaterialProperty,
  PolylineGraphics,
  SceneTransforms,
  VerticalOrigin,
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
  buildDefaultTimeWindow,
  computeRuntimeProjection,
  loadDefaultTleSources,
  parseRuntimeTleSources
} from "../features/multi-station-selector/runtime-projection";
import {
  buildTleFirstSceneViewModel,
  type SceneActor,
  type SceneActiveLink,
  type SceneCameraHint,
  type TleFirstSceneViewModel
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
  type M8aV4GeoPosition,
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
  renderM8aV411GlanceRankSurface,
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
  M8A_V411_HOVER_POPOVER_VERSION,
  syncM8aV411HoverPopoverTargets
} from "./m8a-v411-hover-popover";
import {
  M8A_V411_INSPECTOR_CONCURRENCY_CONV2_BEHAVIOR,
  M8A_V411_INSPECTOR_CONCURRENCY_VERSION,
  M8A_V411_INSPECTOR_MAX_CANVAS_WIDTH_RATIO,
  M8A_V411_INSPECTOR_MAX_HEIGHT_CSS,
  M8A_V411_INSPECTOR_MAX_WIDTH_PX,
  M8A_V411_INSPECTOR_PRIMARY_ROLE,
  resolveM8aV411StateEvidenceCopy,
  resolveM8aV411PhaseCRailCopy,
  resolveM8aV411PhaseCMetricsCopy
} from "./m8a-v411-inspector-concurrency";
import {
  deriveM8aV411CountdownRemaining,
  M8A_V411_COUNTDOWN_FONT_SIZE_PX,
  M8A_V411_COUNTDOWN_FOOTNOTE_TEXT,
  M8A_V411_COUNTDOWN_GAP_FROM_MICRO_CUE_PX,
  M8A_V411_COUNTDOWN_SURFACE_VERSION,
  renderM8aV411CountdownSurface
} from "./m8a-v411-countdown-surface";
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
  M8A_V411_TRANSITION_TOAST_MAX_WIDTH_PX,
  renderM8aV411TransientSurfaces
} from "./m8a-v411-transition-toast";
import {
  createM8aV411DefaultSourcesFilter,
  M8A_V411_SOURCES_ROLE_VERSION,
  type M8aV411SourcesFilter,
  type M8aV411SourcesTrigger
} from "./m8a-v411-sources-role";
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
  resolveM8aV411WindowOrdinalLabel,
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
  buildSimulatedReplayTimeDisplay,
  buildV48HandoverReviewViewModel,
  buildV49ProductComprehensionRuntime,
  buildV49TransitionEvent,
  coercePlaybackMultiplier,
  M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_VISIBLE_CONTENT,
  M8A_V4_LINK_FLOW_CUE_MODE,
  M8A_V4_LINK_FLOW_CUE_VERSION,
  M8A_V4_LINK_FLOW_DIRECTIONS,
  M8A_V4_LINK_FLOW_PULSE_OFFSETS,
  M8A_V4_LINK_FLOW_RELATION_ROLES,
  M8A_V4_LINK_FLOW_REPLAY_CYCLES,
  M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
  M8A_V410_BOUNDARY_AFFORDANCE_VISIBLE_CONTENT,
  M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION,
  M8A_V410_INSPECTOR_DENIED_FIRST_READ_ROLES,
  M8A_V410_INSPECTOR_EVIDENCE_STRUCTURE,
  M8A_V410_INSPECTOR_NOT_CLAIMED_CONTENT,
  M8A_V410_SEQUENCE_RAIL_VISIBLE_CONTENT,
  M8A_V411_INSPECTOR_TABS,
  M8A_V46E_RELATION_ROLE_LABELS,
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
  M8A_V49_INSPECTOR_DEBUG_EVIDENCE_CONTENT,
  M8A_V49_INSPECTOR_DENIED_PRIMARY_CONTENT,
  M8A_V49_INSPECTOR_PRIMARY_VISIBLE_CONTENT,
  M8A_V49_PERSISTENT_ALLOWED_CONTENT,
  M8A_V49_PERSISTENT_DENIED_DEFAULT_CONTENT,
  M8A_V49_PRODUCT_COMPREHENSION_VERSION,
  M8A_V49_SCENE_NEAR_FALLBACK_VISIBLE_CONTENT,
  M8A_V49_SCENE_NEAR_RELIABLE_VISIBLE_CONTENT,
  M8A_V49_TRANSITION_EVENT_DENIED_VISIBLE_CONTENT,
  M8A_V49_TRANSITION_EVENT_DURATION_MS,
  M8A_V49_TRANSITION_EVENT_VISIBLE_CONTENT,
  M8A_V410_PRODUCT_UX_STRUCTURE_VERSION,
  resolvePlaybackMode,
  resolvePlaybackStatus,
  resolveTimelineLabel,
  type M8aV410BoundaryAffordanceRuntime,
  type M8aV411InspectorTab,
  type M8aV47DisclosureState,
  type M8aV47PlaybackMode,
  type M8aV47PlaybackMultiplier,
  type M8aV47PlaybackStatus,
  type M8aV47ProductPlaybackMultiplier,
  type M8aV48HandoverReviewViewModel,
  type M8aV48InfoClass,
  type M8aV48ReviewActorReference,
  type M8aV48SceneAnchorFallbackReason,
  type M8aV48SceneAnchorPlacement,
  type M8aV48SceneAnchorProtectionRect,
  type M8aV48SceneAnchorRuntimeStatus,
  type M8aV49ProductComprehensionRuntime,
  type M8aV49SceneNearRenderState,
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
const M8A_V4_SELECTED_PAIR_SCENE_DEFAULT_DURATION_MINUTES = 360;
const M8A_V4_SELECTED_PAIR_SCENE_MIN_DURATION_MINUTES = 20;
const M8A_V4_SELECTED_PAIR_SCENE_MAX_DURATION_MINUTES = 480;
const M8A_V4_MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const M8A_V4_FULL_LEO_ORBIT_REPLAY_MARGIN_MS = 5 * 60 * 1000;
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
const M8A_V4_ACTOR_GLOW_SIZE_PX = 24;
const M8A_V4_ACTOR_GLOW_MODEL_CENTER_OFFSETS = {
  leo: new Cartesian2(0, 0),
  meo: new Cartesian2(-2, -6),
  geo: new Cartesian2(0, -5)
} satisfies Record<M8aV4OrbitClass, Cartesian2>;
const M8A_V46E_NARROW_VIEWPORT_MAX_WIDTH_PX = 560;
const M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS = 1;
const M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 3;
const M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 1;
interface M8aV4ActorEmphasis {
  actorId: string;
  orbitClass: M8aV4OrbitClass;
  emphasis: "representative" | "candidate" | "fallback" | "context";
  modelScale: number;
  labelAlpha: number;
}

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

type SelectedPairOverlayDebugStatus =
  | "not-requested"
  | "loading"
  | "ready"
  | "empty"
  | "error";

interface SelectedPairOverlayDebugState {
  status: SelectedPairOverlayDebugStatus;
  satelliteCount: number;
  actorCount: number;
  runtimeLinkVisible: boolean;
  positionSampleCount: number;
  activeSelectionSampleCount: number;
  handoverEventCount: number;
  linkFlowCueCount: number;
  eventCueCount: number;
  sourceMode: TleFirstSceneViewModel["sourceMode"] | "";
  pairGeometry: SceneCameraHint["pairGeometry"] | "";
  errorMessage: string;
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

interface ActorRenderHandle {
  actor: M8aV4OrbitActorProjection;
  entity: Entity;
}

interface RelationRenderHandle {
  role: M8aV4RelationRole;
  entity: Entity;
}

interface LinkFlowSegmentRenderHandle {
  role: M8aV4LinkFlowRelationRole;
  direction: M8aV4LinkFlowDirection;
  entity: Entity;
}

interface LinkFlowPulseRenderHandle {
  role: M8aV4LinkFlowRelationRole;
  direction: M8aV4LinkFlowDirection;
  pulseIndex: number;
  entity: Entity;
}

interface PropagatedActorPosition {
  cartesian: Cartesian3;
  propagationTimeUtc: string;
}

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

type EndpointRenderRole = "endpoint-a" | "endpoint-b";

interface EndpointRenderContext {
  endpointId: string;
  endpointRole: EndpointRenderRole;
  endpointLabel: string;
  sourceCoordinatesRenderable: boolean;
  coordinatePrecision: {
    renderPrecision: string;
  };
  renderMarker: {
    markerId: string;
    displayPosition: M8aV4GeoPosition;
    displayRadiusMeters: number;
    label: string;
    requiredPrecisionBadge: string;
    displayPositionIsSourceTruth: boolean;
  };
  orbitEvidenceChips: ReadonlyArray<{
    chipLabel: string;
  }>;
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

function toIsoTimestamp(value: ReplayClockState["currentTime"] | number): string {
  return new Date(toEpochMilliseconds(value)).toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeUnit(value: number): number {
  const normalized = value % 1;
  return normalized < 0 ? normalized + 1 : normalized;
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

function lerp(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

const M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE =
  buildFullLeoOrbitReplayProfile();

function positionToCartesian(position: M8aV4GeoPosition): Cartesian3 {
  return Cartesian3.fromDegrees(
    position.lon,
    position.lat,
    position.heightMeters
  );
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

function resolveSelectedPairSceneTimeWindow(): { startUtc: string; endUtc: string } {
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

function resolveServiceStateWindow(
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

function resolveSimulationHandoverWindow(
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
  assertFiniteTimestamp(startMs, "m8aV4GroundStation.projectionEpochUtc");
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

function resolveEndpointColor(
  endpointId: string,
  endpointRole?: EndpointRenderRole
): Color {
  return endpointId === "tw-cht-multi-orbit-ground-infrastructure" ||
    endpointRole === "endpoint-a"
    ? Color.fromCssColorString("#f4fbff")
    : Color.fromCssColorString("#7ee2b8");
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

function resolveActorGlowModelCenterOffset(
  orbitClass: M8aV4OrbitClass
): Cartesian2 {
  const offset = M8A_V4_ACTOR_GLOW_MODEL_CENTER_OFFSETS[orbitClass];

  return new Cartesian2(offset.x, offset.y);
}

function resolveActorLabelBackgroundColor(): Color {
  return Color.fromCssColorString("#0b1820").withAlpha(0.58);
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

function resolveActorEmphasis(
  actor: M8aV4OrbitActorProjection,
  simulationWindow: M8aV46dSimulationHandoverWindow
): M8aV4ActorEmphasis {
  const candidateActorIds =
    simulationWindow.candidateContextActorIds as readonly string[];
  const fallbackActorIds =
    simulationWindow.fallbackContextActorIds as readonly string[];
  const emphasis =
    actor.actorId === simulationWindow.displayRepresentativeActorId
      ? "representative"
      : candidateActorIds.includes(actor.actorId)
        ? "candidate"
        : fallbackActorIds.includes(actor.actorId)
          ? "fallback"
          : "context";

  return {
    actorId: actor.actorId,
    orbitClass: actor.orbitClass,
    emphasis,
    modelScale:
      emphasis === "representative"
        ? 1.22
        : emphasis === "candidate"
          ? 1.06
          : 0.9,
    labelAlpha: emphasis === "context" ? 0.62 : 0.94
  };
}

// Wave 4.2 — endpoint A/B visual unification with the registry markers.
// The registry station-markers module draws solid green / blue canvas
// circles (r=4.5 px tri-orbit, r=3.5 px dual-orbit) via a BillboardCollection
// per features/multi-station-selector/station-markers.ts. The V4 controller
// previously drew its endpoints as a PointGraphics circle with a separate
// ellipse on the ground; this differed visually from the registry markers
// and made the user see two unrelated dot styles for "the selected pair"
// vs. "the registry markers". This unification keeps the existing entity
// scaffolding but swaps the rendering to a BillboardGraphics with a
// drawn-circle PNG at the slightly larger 6.5 px radius (endpoint > registry)
// and an always-visible big "A" or "B" label adjacent to the marker.
function drawEndpointCircleDataUri(
  radius: number,
  fillCss: string,
  outlineCss: string,
  outlineWidth: number
): string {
  const pad = Math.ceil(outlineWidth) + 1;
  const total = (radius + pad) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.clearRect(0, 0, total, total);
  ctx.beginPath();
  ctx.arc(total / 2, total / 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillCss;
  ctx.fill();
  ctx.strokeStyle = outlineCss;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();
  return canvas.toDataURL();
}

function resolveEndpointCircleCss(endpoint: EndpointRenderContext): {
  readonly fillCss: string;
  readonly outlineCss: string;
} {
  // Echo the registry tri-orbit circle stroke colour for slot A and the
  // dual-orbit blue stroke for slot B so the eye reads "selected pair"
  // as a higher-saturation version of the registry markers.
  const isSlotA =
    endpoint.endpointRole === "endpoint-a" ||
    endpoint.endpointId === "tw-cht-multi-orbit-ground-infrastructure";
  return isSlotA
    ? { fillCss: "rgba(126,226,184,0.96)", outlineCss: "rgba(2,20,31,0.96)" }
    : { fillCss: "rgba(155,196,232,0.94)", outlineCss: "rgba(2,20,31,0.96)" };
}

function createEndpointBillboardStyle(
  endpoint: EndpointRenderContext
): BillboardGraphics {
  const { fillCss, outlineCss } = resolveEndpointCircleCss(endpoint);
  const dataUri = drawEndpointCircleDataUri(6.5, fillCss, outlineCss, 2);
  return new BillboardGraphics({
    image: new ConstantProperty(dataUri),
    verticalOrigin: new ConstantProperty(VerticalOrigin.CENTER),
    horizontalOrigin: new ConstantProperty(HorizontalOrigin.CENTER),
    disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
    distanceDisplayCondition: new ConstantProperty(
      new DistanceDisplayCondition(0, 60_000_000)
    )
  });
}

function createEndpointEllipseStyle(
  endpoint: EndpointRenderContext
): EllipseGraphics {
  const color = resolveEndpointColor(endpoint.endpointId, endpoint.endpointRole);

  return new EllipseGraphics({
    semiMajorAxis: new ConstantProperty(endpoint.renderMarker.displayRadiusMeters),
    semiMinorAxis: new ConstantProperty(endpoint.renderMarker.displayRadiusMeters),
    material: color.withAlpha(0.1),
    outline: new ConstantProperty(true),
    outlineColor: new ConstantProperty(color.withAlpha(0.65)),
    height: new ConstantProperty(endpoint.renderMarker.displayPosition.heightMeters)
  });
}

function createEndpointLabelStyle(
  endpoint: EndpointRenderContext
): LabelGraphics {
  const roleLetter =
    endpoint.endpointRole === "endpoint-a" ? "A" : "B";
  const roleColorCss =
    endpoint.endpointRole === "endpoint-a" ? "#ffd166" : "#9bc4e8";
  return new LabelGraphics({
    show: new ConstantProperty(true),
    text: new ConstantProperty(roleLetter),
    font: "bold 14px Inter, system-ui, sans-serif",
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(Color.fromCssColorString(roleColorCss)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#02141f").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.76)
    ),
    backgroundPadding: new Cartesian2(6, 3),
    pixelOffset: new Cartesian2(12, -14),
    horizontalOrigin: HorizontalOrigin.LEFT,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 60_000_000)
  });
}


function formatSelectedPairSatelliteLabel(satelliteId: string): string {
  return satelliteId.length > 18 ? `${satelliteId.slice(0, 18)}…` : satelliteId;
}

function createActorGlowStyle(actor: M8aV4OrbitActorProjection): BillboardGraphics {
  return new BillboardGraphics({
    image: new ConstantProperty(createActorGlowImageUri(actor.orbitClass)),
    width: new ConstantProperty(M8A_V4_ACTOR_GLOW_SIZE_PX),
    height: new ConstantProperty(M8A_V4_ACTOR_GLOW_SIZE_PX),
    pixelOffset: new ConstantProperty(
      resolveActorGlowModelCenterOffset(actor.orbitClass)
    ),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 90_000_000)
  });
}

function createGeoGuardCueStyle(): BillboardGraphics {
  return new BillboardGraphics({
    image: new ConstantProperty(createActorGlowImageUri("geo")),
    width: new ConstantProperty(54),
    height: new ConstantProperty(54),
    color: new ConstantProperty(Color.WHITE.withAlpha(0.38)),
    pixelOffset: new ConstantProperty(resolveActorGlowModelCenterOffset("geo")),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function shouldRenderActorGlow(actor: M8aV4OrbitActorProjection): boolean {
  return actor.orbitClass !== "leo";
}

function shouldRenderActorLabel(
  actor: M8aV4OrbitActorProjection,
  simulationWindow: M8aV46dSimulationHandoverWindow
): boolean {
  return actor.actorId === simulationWindow.displayRepresentativeActorId;
}

function shouldShowGeoGuardCue(
  simulationWindow: M8aV46dSimulationHandoverWindow
): boolean {
  return simulationWindow.windowId !== "geo-continuity-guard";
}

function createActorLabelStyle(
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): LabelGraphics {
  const offset =
    actor.orbitClass === "geo"
      ? new Cartesian2(18, -34)
      : actor.orbitClass === "meo"
        ? new Cartesian2(-18, -34)
        : new Cartesian2(0, -36);

  return new LabelGraphics({
    text: new ConstantProperty(actor.label),
    font: "12px sans-serif",
    scale: 0.9,
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    ),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(resolveActorLabelBackgroundColor()),
    backgroundPadding: new Cartesian2(8, 4),
    pixelOffset: offset,
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 100_000_000)
  });
}

function createActorModelGraphics(
  modelUri: string,
  actor: M8aV4OrbitActorProjection,
  emphasis: M8aV4ActorEmphasis
): ModelGraphics {
  return new ModelGraphics({
    uri: new ConstantProperty(modelUri),
    scale: new ConstantProperty(emphasis.modelScale),
    minimumPixelSize: new ConstantProperty(
      actor.orbitClass === "geo" ? 50 : actor.orbitClass === "meo" ? 58 : 52
    ),
    maximumScale: new ConstantProperty(180_000)
  });
}

function resolveRelationColor(role: M8aV4RelationRole): Color {
  switch (role) {
    case "displayRepresentative":
      return Color.fromCssColorString("#f7d46a").withAlpha(0.76);
    case "candidateContext":
      return Color.fromCssColorString("#7ee2b8").withAlpha(0.46);
    case "fallbackContext":
      return Color.fromCssColorString("#ffd166").withAlpha(0.2);
  }
}

function resolveRelationWidth(role: M8aV4RelationRole): number {
  switch (role) {
    case "displayRepresentative":
      return 2.35;
    case "candidateContext":
      return 1.45;
    case "fallbackContext":
      return 1.1;
  }
}

function resolveLinkFlowColor(
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole
): Color {
  const base = Color.fromCssColorString(resolveLinkFlowHex(direction));
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

function resolveLinkFlowHex(direction: M8aV4LinkFlowDirection): string {
  return direction === "uplink" ? "#f7d46a" : "#60d8ff";
}

function resolveLinkFlowWidth(
  role: M8aV4LinkFlowRelationRole,
  direction: M8aV4LinkFlowDirection
): number {
  if (role === "displayRepresentative") {
    return direction === "uplink" ? 3.6 : 3.25;
  }

  return direction === "uplink" ? 2.25 : 2.05;
}

function resolveLinkFlowPacketDimensions(
  role: M8aV4LinkFlowRelationRole,
  pulseIndex: number
): { width: number; height: number } {
  if (role === "displayRepresentative") {
    return pulseIndex === 0
      ? { width: 52, height: 24 }
      : { width: 42, height: 19 };
  }

  return pulseIndex === 0
    ? { width: 34, height: 16 }
    : { width: 28, height: 13 };
}

function createLinkFlowPacketImageUri(
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole,
  pulseIndex: number
): string {
  const packetColor = resolveLinkFlowHex(direction);
  const opacity =
    role === "displayRepresentative" ? (pulseIndex === 0 ? 1 : 0.82) : 0.62;
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

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createRelationStyle(
  positions: CallbackProperty,
  role: M8aV4RelationRole
): PolylineGraphics {
  return new PolylineGraphics({
    positions,
    width: new ConstantProperty(resolveRelationWidth(role)),
    material: new ColorMaterialProperty(resolveRelationColor(role).withAlpha(0.22)),
    arcType: ArcType.NONE,
    clampToGround: false
  });
}

function createLinkFlowSegmentStyle(
  positions: CallbackProperty,
  direction: M8aV4LinkFlowDirection,
  role: M8aV4LinkFlowRelationRole
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
  role: M8aV4LinkFlowRelationRole,
  pulseIndex: number,
  rotation: CallbackProperty
): BillboardGraphics {
  const dimensions = resolveLinkFlowPacketDimensions(role, pulseIndex);

  return new BillboardGraphics({
    image: new ConstantProperty(
      createLinkFlowPacketImageUri(direction, role, pulseIndex)
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

function updateActorStyle(
  handle: ActorRenderHandle,
  emphasis: M8aV4ActorEmphasis,
  simulationWindow: M8aV46dSimulationHandoverWindow
): void {
  if (handle.entity.model) {
    handle.entity.model.scale = new ConstantProperty(emphasis.modelScale);
    handle.entity.model.color = undefined;
    handle.entity.model.colorBlendAmount = undefined;
  }

  if (handle.entity.billboard) {
    handle.entity.billboard.image = new ConstantProperty(
      createActorGlowImageUri(handle.actor.orbitClass)
    );
    handle.entity.billboard.width = new ConstantProperty(
      M8A_V4_ACTOR_GLOW_SIZE_PX
    );
    handle.entity.billboard.height = new ConstantProperty(
      M8A_V4_ACTOR_GLOW_SIZE_PX
    );
    handle.entity.billboard.pixelOffset = new ConstantProperty(
      resolveActorGlowModelCenterOffset(handle.actor.orbitClass)
    );
  }

  if (shouldRenderActorLabel(handle.actor, simulationWindow)) {
    if (!handle.entity.label) {
      handle.entity.label = createActorLabelStyle(handle.actor, emphasis);
    }

    handle.entity.label.fillColor = new ConstantProperty(
      Color.WHITE.withAlpha(emphasis.labelAlpha)
    );
  } else {
    handle.entity.label = undefined;
  }
}

function updateRelationStyle(handle: RelationRenderHandle): void {
  if (!handle.entity.polyline) {
    return;
  }

  handle.entity.polyline.width = new ConstantProperty(
    resolveRelationWidth(handle.role)
  );
  handle.entity.polyline.material = new ColorMaterialProperty(
    resolveRelationColor(handle.role).withAlpha(0.22)
  );
}

function updateLinkFlowSegmentStyle(handle: LinkFlowSegmentRenderHandle): void {
  if (!handle.entity.polyline) {
    return;
  }

  handle.entity.polyline.width = new ConstantProperty(
    resolveLinkFlowWidth(handle.role, handle.direction)
  );
  handle.entity.polyline.material = new PolylineArrowMaterialProperty(
    resolveLinkFlowColor(handle.direction, handle.role)
  );
}

function updateLinkFlowPulseStyle(handle: LinkFlowPulseRenderHandle): void {
  if (!handle.entity.billboard) {
    return;
  }

  const dimensions = resolveLinkFlowPacketDimensions(
    handle.role,
    handle.pulseIndex
  );
  handle.entity.billboard.image = new ConstantProperty(
    createLinkFlowPacketImageUri(
      handle.direction,
      handle.role,
      handle.pulseIndex
    )
  );
  handle.entity.billboard.width = new ConstantProperty(dimensions.width);
  handle.entity.billboard.height = new ConstantProperty(dimensions.height);
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

function createProductUxRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "m8a-v47-product-ux";
  root.dataset.m8aV47ProductUx = "true";
  root.dataset.m8aV48UiIaVersion = M8A_V48_UI_IA_VERSION;
  root.dataset.m8aV49ProductComprehension =
    M8A_V49_PRODUCT_COMPREHENSION_VERSION;
  root.dataset.m8aV410FirstViewportComposition =
    M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION;
  root.dataset.m8aV4ItriDemoViewFocusChoreography =
    M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION;
  root.dataset.m8aV4ItriDemoViewDefaultFocus =
    M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION;
  root.dataset.m8aV4ItriDemoViewNarrow =
    M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION;
  root.dataset.m8aV411GlanceRankSurface =
    M8A_V411_GLANCE_RANK_SURFACE_VERSION;
  root.dataset.m8aV411HoverPopover = M8A_V411_HOVER_POPOVER_VERSION;
  root.dataset.m8aV411TransientSurface =
    M8A_V411_TRANSIENT_SURFACE_VERSION;
  root.setAttribute("aria-label", "M8A V4.11 handover review workspace");
  return root;
}

function renderSpeedButtons(activeMultiplier: number): string {
  return M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS.map((multiplier) => {
    const isActive = activeMultiplier === multiplier;

    return [
      `<button type="button" class="m8a-v47-product-ux__speed"`,
      ` data-m8a-v47-action="speed"`,
      ` data-m8a-v47-playback-multiplier="${multiplier}"`,
      ` data-m8a-v48-info-class="control"`,
      ` aria-pressed="${isActive ? "true" : "false"}">`,
      `${multiplier}x`,
      "</button>"
    ].join("");
  }).join("");
}

function formatReviewActor(actor: M8aV48ReviewActorReference): string {
  return `${actor.label} (${actor.actorId})`;
}

function formatReviewActorList(
  actors: ReadonlyArray<M8aV48ReviewActorReference>
): string {
  return actors.map(formatReviewActor).join(", ");
}

function ensureProductUxStructure(root: HTMLElement): void {
  if (
    root.dataset.m8aV410ProductUxStructureVersion ===
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION
  ) {
    return;
  }

  if (
    root.dataset.m8aV471StableControls === "true" &&
    root.dataset.m8aV49StructureVersion === M8A_V49_PRODUCT_COMPREHENSION_VERSION
  ) {
    return;
  }

  root.innerHTML = `
    <div class="m8a-v47-product-ux__scene-connector" data-m8a-v48-scene-connector="true" aria-hidden="true" hidden></div>
    <div class="m8a-v47-product-ux__strip" data-m8a-v47-ui-surface="compact-control-strip" data-m8a-v47-control-strip="true">
      <button type="button" class="m8a-v47-product-ux__play-toggle" data-m8a-v47-action="pause" data-m8a-v47-control-id="play-pause" data-m8a-v48-info-class="control">Pause</button>
      <button type="button" data-m8a-v47-action="restart" data-m8a-v47-control-id="restart" data-m8a-v48-info-class="control">Restart</button>
      <div class="m8a-v47-product-ux__strip-speeds" data-m8a-v47-control-group="speed">
        ${renderSpeedButtons(M8A_V47_PRODUCT_DEFAULT_MULTIPLIER)}
      </div>
    </div>
  `;
  root.dataset.m8aV471StableControls = "true";
  root.dataset.m8aV49StructureVersion = M8A_V49_PRODUCT_COMPREHENSION_VERSION;
  root.dataset.m8aV410ProductUxStructureVersion =
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION;
}

function getProductUxElement(
  root: HTMLElement,
  selector: string
): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing V4.7.1 product UX element: ${selector}`);
  }

  return element;
}

function ensureV410ProductUxStructureReady(root: HTMLElement): void {
  if (
    root.dataset.m8aV410ProductUxStructureVersion ===
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION
  ) {
    return;
  }

  // After wave 3 deletions there are no required inner selectors beyond the
  // base strip; the version-gate above is enough to short-circuit re-render.
  return;
}

function updateProductUxText(
  root: HTMLElement,
  selector: string,
  value: string
): void {
  for (const element of root.querySelectorAll<HTMLElement>(selector)) {
    element.textContent = value;
  }
}

function rectsIntersect(
  left: M8aV48SceneAnchorProtectionRect,
  right: M8aV48SceneAnchorProtectionRect
): boolean {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  );
}

function buildRect(
  left: number,
  top: number,
  width: number,
  height: number
): M8aV48SceneAnchorProtectionRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  };
}

function buildPointProtectionRect(
  x: number,
  y: number,
  width: number,
  height: number
): M8aV48SceneAnchorProtectionRect {
  return buildRect(x - width / 2, y - height / 2, width, height);
}

function buildUnionProtectionRect(
  points: ReadonlyArray<{ x: number; y: number }>,
  padding: number
): M8aV48SceneAnchorProtectionRect | null {
  if (points.length === 0) {
    return null;
  }

  const left = Math.min(...points.map((point) => point.x)) - padding;
  const right = Math.max(...points.map((point) => point.x)) + padding;
  const top = Math.min(...points.map((point) => point.y)) - padding;
  const bottom = Math.max(...points.map((point) => point.y)) + padding;

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function projectSceneAnchorPoint(
  viewer: Viewer,
  cartesian: Cartesian3
): {
  x: number;
  y: number;
  projected: boolean;
  inFrontOfCamera: boolean;
} {
  const canvasRect = viewer.scene.canvas.getBoundingClientRect();
  const point = viewer.scene.cartesianToCanvasCoordinates(cartesian);
  const cameraToPoint = Cartesian3.subtract(
    cartesian,
    viewer.camera.positionWC,
    new Cartesian3()
  );
  const inFrontOfCamera =
    Cartesian3.dot(cameraToPoint, viewer.camera.directionWC) > 0;

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return {
      x: canvasRect.left + canvasRect.width / 2,
      y: canvasRect.top + canvasRect.height / 2,
      projected: false,
      inFrontOfCamera
    };
  }

  return {
    x: canvasRect.left + point.x,
    y: canvasRect.top + point.y,
    projected: true,
    inFrontOfCamera
  };
}

function resolveConnectorStart(
  annotationRect: M8aV48SceneAnchorProtectionRect,
  anchorX: number,
  anchorY: number
): {
  x: number;
  y: number;
} {
  const clampedX = clamp(anchorX, annotationRect.left, annotationRect.right);
  const clampedY = clamp(anchorY, annotationRect.top, annotationRect.bottom);
  const distances = [
    {
      x: annotationRect.left,
      y: clampedY,
      distance: Math.abs(anchorX - annotationRect.left)
    },
    {
      x: annotationRect.right,
      y: clampedY,
      distance: Math.abs(anchorX - annotationRect.right)
    },
    {
      x: clampedX,
      y: annotationRect.top,
      distance: Math.abs(anchorY - annotationRect.top)
    },
    {
      x: clampedX,
      y: annotationRect.bottom,
      distance: Math.abs(anchorY - annotationRect.bottom)
    }
  ];

  return distances.reduce((nearest, candidate) =>
    candidate.distance < nearest.distance ? candidate : nearest
  );
}

function resolveSceneAnnotationPlacement(
  state: M8aV4GroundStationSceneState,
  viewer: Viewer
): M8aV48SceneAnchorPlacement {
  const canvas = viewer.scene.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const width = Math.max(canvasRect.width, 1);
  const height = Math.max(canvasRect.height, 1);
  const canvasLeft = canvasRect.left;
  const canvasTop = canvasRect.top;
  const canvasRight = canvasRect.left + width;
  const canvasBottom = canvasRect.top + height;
  const reviewAnchor = state.productUx.reviewViewModel.sceneAnchorState;
  const anchorActorId = reviewAnchor.selectedActorId ?? "";
  const actor = state.actors.find((candidate) => {
    return candidate.actorId === anchorActorId;
  });
  let anchorX = canvasLeft + width * 0.56;
  let anchorY = canvasTop + height * 0.42;
  let projected = false;
  let inFrontOfCamera = false;

  if (actor) {
    const point = projectSceneAnchorPoint(
      viewer,
      Cartesian3.fromElements(
        actor.renderPositionEcefMeters.x,
        actor.renderPositionEcefMeters.y,
        actor.renderPositionEcefMeters.z
      )
    );

    anchorX = point.x;
    anchorY = point.y;
    projected = point.projected;
    inFrontOfCamera = point.inFrontOfCamera;
  }

  const isNarrow = state.productUx.layout.viewportClass === "narrow";
  const annotationWidth = isNarrow ? 328 : 360;
  const annotationHeight = isNarrow ? 186 : 174;
  const minTop = isNarrow ? 214 : 174;
  const maxTop = Math.max(
    minTop,
    canvasTop + height - annotationHeight - (isNarrow ? 138 : 26)
  );
  const minLeft = canvasLeft + 14;
  const maxLeft = Math.max(
    minLeft,
    canvasRight - annotationWidth - 14
  );
  const placeLeft =
    anchorX > canvasLeft + width * 0.35 ||
    anchorX > canvasRight - annotationWidth - 42;
  const protectionRect = buildPointProtectionRect(
    anchorX,
    anchorY,
    isNarrow ? 112 : 96,
    isNarrow ? 88 : 72
  );
  const endpointPoints = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints
    .map((endpoint) =>
      projectSceneAnchorPoint(
        viewer,
        positionToCartesian(endpoint.renderMarker.displayPosition)
      )
    )
    .filter((point) => point.projected && point.inFrontOfCamera);
  const endpointCorridorRect = buildUnionProtectionRect(
    endpointPoints,
    isNarrow ? 42 : 58
  );
  const endpointLabelRects = endpointPoints.map((point) =>
    buildPointProtectionRect(
      point.x,
      point.y,
      isNarrow ? 118 : 156,
      isNarrow ? 46 : 58
    )
  );
  const geoGuardRects = state.actors
    .filter((candidate) => candidate.orbitClass === "geo")
    .map((candidate) =>
      projectSceneAnchorPoint(
        viewer,
        Cartesian3.fromElements(
          candidate.renderPositionEcefMeters.x,
          candidate.renderPositionEcefMeters.y,
          candidate.renderPositionEcefMeters.z
        )
      )
    )
    .filter((point) => point.projected && point.inFrontOfCamera)
    .map((point) =>
      buildPointProtectionRect(
        point.x,
        point.y,
        isNarrow ? 76 : 112,
        isNarrow ? 64 : 96
      )
    );
  const avoidedRects = [
    protectionRect,
    ...(endpointCorridorRect ? [endpointCorridorRect] : []),
    ...endpointLabelRects,
    ...geoGuardRects
  ];
  const candidatePlacements = [
    {
      left: anchorX + (placeLeft ? -annotationWidth - 86 : 86),
      top: anchorY - annotationHeight / 2
    },
    {
      left: anchorX + (placeLeft ? -annotationWidth - 46 : 46),
      top: anchorY - (isNarrow ? 182 : 156)
    },
    {
      left: anchorX - annotationWidth / 2,
      top: anchorY + (isNarrow ? 86 : 74)
    },
    {
      left: anchorX + (placeLeft ? 46 : -annotationWidth - 46),
      top: anchorY - annotationHeight / 2
    }
  ].map((candidate) =>
    buildRect(
      clamp(candidate.left, minLeft, maxLeft),
      clamp(candidate.top, minTop, maxTop),
      annotationWidth,
      annotationHeight
    )
  );
  const annotationRect =
    candidatePlacements.find((candidate) => {
      return avoidedRects.every((avoidRect) => {
        return !rectsIntersect(candidate, avoidRect);
      });
    }) ?? candidatePlacements[0];
  const isInsideViewport =
    anchorX >= canvasLeft &&
    anchorX <= canvasRight &&
    anchorY >= canvasTop &&
    anchorY <= canvasBottom;
  const connectorThresholdPx = isNarrow ? 32 : 24;
  const connectorStart = resolveConnectorStart(
    annotationRect,
    anchorX,
    anchorY
  );
  const connectorLength = Math.hypot(
    anchorX - connectorStart.x,
    anchorY - connectorStart.y
  );
  const connectorAngleDegrees =
    Math.atan2(anchorY - connectorStart.y, anchorX - connectorStart.x) *
    (180 / Math.PI);
  const forceFallback =
    document.documentElement.dataset.m8aV48ForceSceneAnchorFallback === "true";
  let anchorStatus: M8aV48SceneAnchorRuntimeStatus = "geometry-reliable";
  let fallbackReason: M8aV48SceneAnchorFallbackReason | "" = "";

  if (forceFallback) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-not-projected";
  } else if (!projected) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-not-projected";
  } else if (!inFrontOfCamera) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-behind-camera";
  } else if (!isInsideViewport) {
    anchorStatus = "fallback";
    fallbackReason = "anchor-outside-viewport";
  } else if (rectsIntersect(annotationRect, protectionRect)) {
    anchorStatus = "fallback";
    fallbackReason = "protection-rect-obstructed";
  }

  return {
    anchorActorId,
    anchorX,
    anchorY,
    left: annotationRect.left,
    top: annotationRect.top,
    width: annotationWidth,
    height: annotationHeight,
    projected,
    selectedAnchorType:
      anchorStatus === "geometry-reliable"
        ? reviewAnchor.selectedAnchorType
        : "non-scene-fallback",
    selectedActorId:
      anchorStatus === "geometry-reliable" && reviewAnchor.selectedActorId
        ? reviewAnchor.selectedActorId
        : "",
    selectedRelationCueId:
      anchorStatus === "geometry-reliable" && reviewAnchor.selectedRelationCueId
        ? reviewAnchor.selectedRelationCueId
        : "",
    selectedCorridorId:
      anchorStatus === "geometry-reliable" && reviewAnchor.selectedCorridorId
        ? reviewAnchor.selectedCorridorId
        : "",
    anchorStatus,
    fallbackReason,
    connectorStartX: connectorStart.x,
    connectorStartY: connectorStart.y,
    connectorEndX: anchorX,
    connectorEndY: anchorY,
    connectorLength,
    connectorAngleDegrees,
    connectorEndpointDistancePx: 0,
    connectorThresholdPx,
    protectionRect
  };
}

function resolveV49SceneNearRenderState(
  comprehension: M8aV49ProductComprehensionRuntime,
  review: M8aV48HandoverReviewViewModel,
  placement: M8aV48SceneAnchorPlacement
): M8aV49SceneNearRenderState {
  const activeCopy = comprehension.activeWindowCopy;
  const hasReliableGeometry = placement.anchorStatus === "geometry-reliable";

  if (hasReliableGeometry) {
    return {
      mode: "scene-near-meaning",
      heading: `Orbit focus: ${activeCopy.orbitClassToken}`,
      productLabel: activeCopy.productLabel,
      stateMeaning: activeCopy.firstReadMessage,
      watchCueLabel: activeCopy.watchCueLabel,
      fallbackText: "",
      meaningVisible: true,
      cueVisible: true,
      fallbackVisible: false,
      attachmentClaim:
        "display-context-cue-attachment-only-when-geometry-reliable"
    };
  }

  return {
    mode: "persistent-layer-fallback",
    heading: `Orbit focus: ${activeCopy.orbitClassToken}`,
    productLabel: activeCopy.productLabel,
    stateMeaning: activeCopy.firstReadMessage,
    watchCueLabel: "",
    fallbackText: `${review.stateOrdinalLabel}; no reliable scene attachment - use state summary.`,
    meaningVisible: true,
    cueVisible: false,
    fallbackVisible: true,
    attachmentClaim: "no-scene-attachment-claimed"
  };
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
  const stateEvidenceCopy = resolveM8aV411StateEvidenceCopy(
    productUx.activeWindowId
  );
  const railCopy = resolveM8aV411PhaseCRailCopy(productUx.activeWindowId);
  const metricsCopy = resolveM8aV411PhaseCMetricsCopy(productUx.activeWindowId);
  const countdownDerivation = deriveM8aV411CountdownRemaining({
    window: state.simulationHandoverModel.window,
    replayRatio: state.simulationHandoverModel.replayRatio,
    fullReplaySimulatedSeconds:
      M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.replayDurationMs / 1000
  });
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

  updateProductUxText(
    root,
    "[data-m8a-v47-active-label]",
    productUx.activeProductLabel
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-state-ordinal]",
    review.stateOrdinalLabel
  );
  updateProductUxText(
    root,
    "[data-m8a-v47-time-label='replay-utc']",
    productUx.playback.replayUtcDisplay
  );
  updateProductUxText(
    root,
    "[data-m8a-v47-time-label='simulated']",
    productUx.playback.simulatedReplayTimeDisplay
  );
  updateProductUxText(
    root,
    "[data-m8a-v49-inspector-current]",
    stateEvidenceCopy.paragraph
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-state-evidence-title='true']",
    stateEvidenceCopy.title
  );
  const railPanel = root.querySelector<HTMLElement>(
    "[data-m8a-v411-rail-panel='true']"
  );
  if (railPanel) {
    railPanel.dataset.m8aV411RailOrbit = railCopy.orbit;
    railPanel.dataset.m8aV411RailRole = railCopy.role;
    railPanel.dataset.m8aV411RailWindow = productUx.activeWindowId;
    railPanel.dataset.m8aV411RailCurrent = "true";
    railPanel.dataset.itriDemoFocusChoreographyVersion =
      focusChoreography.version;
    railPanel.dataset.itriDemoFocusWindowId = focusChoreography.windowId;
    railPanel.dataset.itriDemoFocusId = focusChoreography.focusId;
    railPanel.dataset.itriDemoFocusPrimaryLabel =
      focusChoreography.primaryFocusLabel;
    railPanel.dataset.itriDemoFocusVisualCue = focusChoreography.visualCue;
    railPanel.dataset.itriDemoFocusSecondaryActorPolicy =
      focusChoreography.secondaryActorPolicy;
    railPanel.setAttribute(
      "aria-label",
      `${focusChoreography.primaryFocusLabel}; ${focusChoreography.briefingLine}; ${focusChoreography.nextFocusHint}; ${railCopy.evidenceHook}`
    );
  }
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-role-glyph='true']",
    railCopy.roleGlyph
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-main-chip-text='true']",
    railCopy.mainChip
  );
  const railMainChip = root.querySelector<HTMLElement>(
    "[data-m8a-v411-rail-main-chip='true']"
  );
  if (railMainChip) {
    if (!railMainChip.dataset.m8aV411RailFocusBound) {
      railMainChip.dataset.m8aV411RailFocusBound = "true";
      railMainChip.addEventListener("focus", () => {
        railMainChip.dataset.m8aV411RailFocused = "true";
      });
      railMainChip.addEventListener("blur", () => {
        delete railMainChip.dataset.m8aV411RailFocused;
      });
    }
    railMainChip.setAttribute(
      "aria-label",
      `${railCopy.ordinalLabel} ${railCopy.mainChip}; ${railCopy.currentToken}; ${railCopy.candidateToken}; ${railCopy.fallbackToken}`
    );
  }
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='current']",
    railCopy.currentToken
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='candidate']",
    railCopy.candidateToken
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='fallback']",
    railCopy.fallbackToken
  );
  updateProductUxText(
    root,
    "[data-itri-demo-l0-current-state='true']",
    focusChoreography.primaryFocusLabel
  );
  updateProductUxText(
    root,
    "[data-itri-demo-l0-current-reason='true']",
    focusChoreography.briefingLine
  );
  updateProductUxText(
    root,
    "[data-itri-demo-l0-active-orbit='true']",
    `Active orbit: ${focusChoreography.focusOrbitClassToken} focus`
  );
  updateProductUxText(
    root,
    "[data-itri-demo-l0-rate-class='true']",
    `Modeled rate: ${f09RateSurface.currentClassLabel}`
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='next']",
    railCopy.nextPreview
  );
  updateProductUxText(
    root,
    "[data-itri-demo-l0-next-state='true']",
    railCopy.nextPreview
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='evidence']",
    railCopy.evidenceHook
  );
  updateProductUxText(
    root,
    "[data-itri-demo-l0-truth-boundary='true']",
    M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY
  );
  const l0BriefingCard = root.querySelector<HTMLElement>(
    "[data-itri-demo-l0-briefing-card='true']"
  );
  if (l0BriefingCard) {
    l0BriefingCard.dataset.itriDemoL0CurrentState =
      focusChoreography.primaryFocusLabel;
    l0BriefingCard.dataset.itriDemoL0NextState =
      focusChoreography.nextFocusHint;
    l0BriefingCard.dataset.itriDemoL0OrbitClass =
      focusChoreography.focusOrbitClassToken;
    l0BriefingCard.dataset.itriDemoL0RateClass =
      f09RateSurface.currentClassLabel;
    l0BriefingCard.dataset.itriDemoL0TruthBoundary =
      M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY;
    l0BriefingCard.dataset.itriDemoFocusChoreographyVersion =
      focusChoreography.version;
    l0BriefingCard.dataset.itriDemoFocusWindowId =
      focusChoreography.windowId;
    l0BriefingCard.dataset.itriDemoFocusId = focusChoreography.focusId;
    l0BriefingCard.dataset.itriDemoFocusVisualCue =
      focusChoreography.visualCue;
    l0BriefingCard.dataset.itriDemoFocusSecondaryActorPolicy =
      focusChoreography.secondaryActorPolicy;
    l0BriefingCard.setAttribute(
      "aria-label",
      `Handover briefing. Now: ${focusChoreography.primaryFocusLabel}. ${focusChoreography.briefingLine}. ${focusChoreography.nextFocusHint}. Modeled rate: ${f09RateSurface.currentClassLabel}. ${M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY}`
    );
  }
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-now='true']",
    focusChoreography.decisionNow
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-why='true']",
    focusChoreography.decisionWhy
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-next='true']",
    focusChoreography.nextFocusHint
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-watch='true']",
    focusChoreography.decisionWatch
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='latency-class']",
    metricsCopy.latencyClassValue
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='latency-class']",
    metricsCopy.latencyClassUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='latency-class']",
    metricsCopy.latencyClassDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='continuity-class']",
    metricsCopy.continuityClassValue
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='continuity-class']",
    metricsCopy.continuityClassUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='continuity-class']",
    metricsCopy.continuityClassDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='handover-state']",
    metricsCopy.handoverStateValue
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='handover-state']",
    metricsCopy.handoverStateUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='handover-state']",
    metricsCopy.handoverStateDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='replay-timing']",
    countdownDerivation.approximateDisplay
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='replay-timing']",
    metricsCopy.replayTimingUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='replay-timing']",
    metricsCopy.replayTimingDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-purpose]",
    review.reviewPurpose
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-representative]",
    formatReviewActor(review.representativeActor)
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-candidates]",
    formatReviewActorList(review.candidateContextActors)
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-fallbacks]",
    formatReviewActorList(review.fallbackContextActors)
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-changed]",
    review.whatChangedFromPreviousState
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-watch]",
    review.whatToWatch
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-next]",
    review.nextStateHint
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-cue]",
    placement.anchorStatus === "geometry-reliable"
      ? `${review.relationCueRole.displayLabel}; scene anchor ${placement.selectedAnchorType}; selected actor ${placement.selectedActorId}; selected cue ${placement.selectedRelationCueId || "none"}.`
      : `${review.relationCueRole.displayLabel}; no scene anchor claimed; fallback ${placement.fallbackReason}.`
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-truth-boundary]",
    review.truthBoundarySummary
  );

  const connector = getProductUxElement(
    root,
    "[data-m8a-v48-scene-connector='true']"
  );
  connector.dataset.m8aV49SceneNearAttachmentClaim =
    sceneNear.attachmentClaim;
  connector.dataset.m8aV48AnchorStatus = placement.anchorStatus;
  connector.dataset.m8aV48SelectedAnchorType = placement.selectedAnchorType;
  connector.dataset.m8aV48SelectedActorId = placement.selectedActorId;
  connector.dataset.m8aV48SelectedRelationCueId =
    placement.selectedRelationCueId;
  connector.dataset.m8aV48ConnectorStartX =
    placement.connectorStartX.toFixed(1);
  connector.dataset.m8aV48ConnectorStartY =
    placement.connectorStartY.toFixed(1);
  connector.dataset.m8aV48ConnectorEndX = placement.connectorEndX.toFixed(1);
  connector.dataset.m8aV48ConnectorEndY = placement.connectorEndY.toFixed(1);
  connector.dataset.m8aV48ConnectorLength =
    placement.connectorLength.toFixed(1);
  connector.dataset.m8aV48ConnectorAngleDegrees =
    placement.connectorAngleDegrees.toFixed(2);
  connector.dataset.m8aV48ConnectorEndpointDistancePx =
    placement.connectorEndpointDistancePx.toFixed(1);
  connector.dataset.m8aV48ConnectorThresholdPx =
    placement.connectorThresholdPx.toFixed(1);
  connector.hidden = placement.anchorStatus !== "geometry-reliable";
  connector.setAttribute(
    "aria-hidden",
    placement.anchorStatus === "geometry-reliable" ? "false" : "true"
  );
  connector.style.left = `${placement.connectorStartX.toFixed(1)}px`;
  connector.style.top = `${placement.connectorStartY.toFixed(1)}px`;
  connector.style.width = `${placement.connectorLength.toFixed(1)}px`;
  connector.style.transform = `rotate(${placement.connectorAngleDegrees.toFixed(
    2
  )}deg)`;

  renderM8aV411GlanceRankSurface({
    root,
    actors: state.actors,
    endpoints: sceneEndpoints,
    requiredPrecisionBadge:
      sceneEndpoints[0]?.renderMarker.requiredPrecisionBadge ??
      M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
    projectActor: (actor) =>
      projectSceneAnchorPoint(
        viewer,
        Cartesian3.fromElements(
          actor.renderPositionEcefMeters.x,
          actor.renderPositionEcefMeters.y,
          actor.renderPositionEcefMeters.z
        )
      ),
    projectEndpoint: (endpoint) =>
      projectSceneAnchorPoint(
        viewer,
        positionToCartesian(endpoint.renderMarker.displayPosition)
      )
  });
  syncM8aV411SceneContextChip(root);
  const focusActorRecord = state.actors.find(
    (actor) =>
      actor.actorId ===
      state.simulationHandoverModel.window.displayRepresentativeActorId
  );
  visualTokenController.update({
    activeWindowId: state.simulationHandoverModel.window.windowId,
    diagnosticsRoot: root,
    focusActor: focusActorRecord
      ? {
          actorId: focusActorRecord.actorId,
          positionEcefMeters: {
            x: focusActorRecord.renderPositionEcefMeters.x,
            y: focusActorRecord.renderPositionEcefMeters.y,
            z: focusActorRecord.renderPositionEcefMeters.z
          }
        }
      : null
  });

  renderM8aV411TransientSurfaces({
    root,
    activeTransitionEvent: transitionEvent,
    sceneCuePoint: {
      x: placement.anchorX,
      y: placement.anchorY,
      projected: placement.projected,
      anchorStatus: placement.anchorStatus,
      actorId: placement.anchorActorId
    },
    toastSuppressed: productUx.reviewerMode.toastSuppressed
  });

  syncM8aV411HoverPopoverTargets({
    root,
    activeWindow: state.simulationHandoverModel.window,
    timeline: state.simulationHandoverModel.timeline
  });

  renderM8aV411CountdownSurface({
    root,
    derivation: countdownDerivation,
    microCueRect: null
  });
  root.dataset.m8aV411CountdownSurface = M8A_V411_COUNTDOWN_SURFACE_VERSION;
  root.dataset.m8aV411CountdownDerivation = "addendum-1.1";
  root.dataset.m8aV411CountdownFullReplaySimulatedSec =
    countdownDerivation.fullReplaySimulatedSeconds.toFixed(2);
  root.dataset.m8aV411CountdownReplayRatio =
    countdownDerivation.replayRatio.toFixed(6);
  root.dataset.m8aV411CountdownWindowId = countdownDerivation.windowId;
  root.dataset.m8aV411CountdownRemainingSimulatedSec =
    countdownDerivation.remainingSimulatedSec.toFixed(2);
  root.dataset.m8aV411CountdownApproximateDisplay =
    countdownDerivation.approximateDisplay;
  root.dataset.m8aV411CountdownFootnoteText =
    M8A_V411_COUNTDOWN_FOOTNOTE_TEXT;
  root.dataset.m8aV411CountdownFontSizePx = String(
    M8A_V411_COUNTDOWN_FONT_SIZE_PX
  );
  root.dataset.m8aV411CountdownGapFromMicroCuePx = String(
    M8A_V411_COUNTDOWN_GAP_FROM_MICRO_CUE_PX
  );

  const playButton = getProductUxElement(
    root,
    "[data-m8a-v47-control-id='play-pause']"
  ) as HTMLButtonElement;
  playButton.dataset.m8aV47Action = playbackAction;
  playButton.textContent = playbackLabel;
  playButton.setAttribute("aria-label", `${playbackLabel} replay`);

  for (const speedButton of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-playback-multiplier]"
  )) {
    speedButton.setAttribute(
      "aria-pressed",
      String(Number(speedButton.dataset.m8aV47PlaybackMultiplier) === activeMultiplier)
    );
  }

  for (const progress of root.querySelectorAll<HTMLProgressElement>(
    "[data-m8a-v47-progress='true']"
  )) {
    progress.value = productUx.playback.replayRatio;
    progress.setAttribute("value", progressValue);
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-action='toggle-disclosure']"
  )) {
    toggle.setAttribute("aria-expanded", String(stateEvidenceOpen));
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-control-id='evidence-toggle']"
  )) {
    toggle.setAttribute(
      "aria-expanded",
      String(stateEvidenceOpen && selectedInspectorTab === "evidence")
    );
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-action='toggle-boundary']"
  )) {
    toggle.setAttribute("aria-expanded", String(truthBoundaryOpen));
    toggle.dataset.m8aV410BoundaryDetailsBehavior =
      boundaryAffordance.detailsBehavior;
    toggle.dataset.m8aV410BoundaryCompactCopy =
      boundaryAffordance.compactCopy;
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-action='toggle-source-provenance']"
  )) {
    toggle.setAttribute("aria-expanded", String(sourcesRoleOpen));
    toggle.dataset.m8aV411SourcesAffordance =
      "advanced-source-provenance-toggle-only";
  }

  const strip = getProductUxElement(
    root,
    "[data-m8a-v47-control-strip='true']"
  );
  strip.dataset.m8aV49PersistentLayer = "true";
  strip.dataset.m8aV410ControlsPriority =
    comprehension.firstViewportComposition.controlsPriority;
  strip.dataset.m8aV49DefaultVisibleContent = serializeList([
    ...comprehension.persistentLayer.defaultVisibleContent
  ]);
  strip.dataset.m8aV49DeniedDefaultVisibleContent = serializeList([
    ...comprehension.persistentLayer.deniedDefaultVisibleContent
  ]);


  for (const stage of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v47-window-id]"
  )) {
    stage.dataset.active = String(
      stage.dataset.m8aV47WindowId === productUx.activeWindowId
    );
  }

  renderM8aV411ReviewerMode(root, productUx);
}

function renderM8aV411ReviewerMode(
  root: HTMLElement,
  productUx: M8aV4GroundStationSceneState["productUx"]
): void {
  const reviewer = productUx.reviewerMode;
  if (!reviewer) {
    return;
  }

  const modeLabel = root.querySelector<HTMLElement>(
    "[data-m8a-v411-inspector-mode-label='true']"
  );
  const inspectorOpen = productUx.disclosure.detailsSheetState === "open";
  const showLabel =
    inspectorOpen &&
    (reviewer.replayClockMode === "inspector-pinned" ||
      reviewer.replayClockMode === "review-auto-paused" ||
      reviewer.replayClockMode === "manual-paused" ||
      reviewer.replayClockMode === "final-hold");

  if (modeLabel) {
    modeLabel.dataset.m8aV411ReplayClockMode = reviewer.replayClockMode;
    modeLabel.dataset.m8aV411InspectorModeLabelOrdinal =
      reviewer.pinnedWindowOrdinalLabel ?? "";
    if (showLabel) {
      modeLabel.hidden = false;
      modeLabel.textContent = reviewer.announcement.modeLabel;
    } else {
      modeLabel.hidden = true;
      modeLabel.textContent = "";
    }
  }

  const pauseButton = root.querySelector<HTMLElement>(
    "button[data-m8a-v47-control-id='play-pause']"
  );
  if (pauseButton) {
    if (!reviewer.controls.pauseEnabled && reviewer.controls.playEnabled) {
      pauseButton.setAttribute("aria-disabled", "false");
    } else {
      pauseButton.removeAttribute("aria-disabled");
    }
  }

  for (const speedButton of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v47-control-group='speed'] button[data-m8a-v47-action='speed']"
  )) {
    if (!reviewer.controls.speedEnabled) {
      speedButton.setAttribute("aria-disabled", "true");
      speedButton.dataset.m8aV411ReviewerSpeedDeferred = "false";
    } else if (reviewer.controls.speedAppliesAfterResume) {
      speedButton.removeAttribute("aria-disabled");
      speedButton.dataset.m8aV411ReviewerSpeedDeferred = "true";
      speedButton.title = "Applies after resume";
    } else {
      speedButton.removeAttribute("aria-disabled");
      speedButton.dataset.m8aV411ReviewerSpeedDeferred = "false";
      speedButton.removeAttribute("title");
    }
  }

  root.dataset.m8aV411ReplayClockMode = reviewer.replayClockMode;
  root.dataset.m8aV411ReviewerModeOn = String(reviewer.reviewModeOn);
  root.dataset.m8aV411ReviewerModeToastSuppressed = String(
    reviewer.toastSuppressed
  );
  root.dataset.m8aV411InspectorOpen = String(inspectorOpen);
}

function cloneActorState(
  actor: M8aV4ActorRuntimeRecord
): M8aV4ActorRuntimeRecord {
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

function cloneState(
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
          ] as typeof M8A_V410_SEQUENCE_RAIL_VISIBLE_CONTENT,
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
          ] as typeof M8A_V410_BOUNDARY_AFFORDANCE_VISIBLE_CONTENT,
          forbiddenBehavior: [
            ...state.productUx.productComprehension.boundaryAffordance
              .forbiddenBehavior
          ] as M8aV410BoundaryAffordanceRuntime["forbiddenBehavior"]
        },
        focusChoreography: {
          ...state.productUx.productComprehension.focusChoreography,
          visibleContent: [
            ...state.productUx.productComprehension.focusChoreography
              .visibleContent
          ] as typeof M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_VISIBLE_CONTENT,
          secondaryActorEmphasisRoles: [
            ...state.productUx.productComprehension.focusChoreography
              .secondaryActorEmphasisRoles
          ] as readonly ["candidate", "fallback", "context"]
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
          ] as typeof M8A_V49_PERSISTENT_ALLOWED_CONTENT,
          deniedDefaultVisibleContent: [
            ...state.productUx.productComprehension.persistentLayer
              .deniedDefaultVisibleContent
          ] as typeof M8A_V49_PERSISTENT_DENIED_DEFAULT_CONTENT
        },
        sceneNearMeaningLayer: {
          ...state.productUx.productComprehension.sceneNearMeaningLayer,
          reliableVisibleContent: [
            ...state.productUx.productComprehension.sceneNearMeaningLayer
              .reliableVisibleContent
          ] as typeof M8A_V49_SCENE_NEAR_RELIABLE_VISIBLE_CONTENT,
          fallbackVisibleContent: [
            ...state.productUx.productComprehension.sceneNearMeaningLayer
              .fallbackVisibleContent
          ] as typeof M8A_V49_SCENE_NEAR_FALLBACK_VISIBLE_CONTENT
        },
        transitionEventLayer: {
          ...state.productUx.productComprehension.transitionEventLayer,
          visibleContent: [
            ...state.productUx.productComprehension.transitionEventLayer
              .visibleContent
          ] as typeof M8A_V49_TRANSITION_EVENT_VISIBLE_CONTENT,
          deniedVisibleContent: [
            ...state.productUx.productComprehension.transitionEventLayer
              .deniedVisibleContent
          ] as typeof M8A_V49_TRANSITION_EVENT_DENIED_VISIBLE_CONTENT,
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
          ] as typeof M8A_V410_INSPECTOR_EVIDENCE_STRUCTURE,
          primaryVisibleContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .primaryVisibleContent
          ] as typeof M8A_V49_INSPECTOR_PRIMARY_VISIBLE_CONTENT,
          deniedPrimaryVisibleContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .deniedPrimaryVisibleContent
          ] as typeof M8A_V49_INSPECTOR_DENIED_PRIMARY_CONTENT,
          debugEvidenceContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .debugEvidenceContent
          ] as typeof M8A_V49_INSPECTOR_DEBUG_EVIDENCE_CONTENT,
          deniedFirstReadRoles: [
            ...state.productUx.productComprehension.inspectorLayer
              .deniedFirstReadRoles
          ] as typeof M8A_V410_INSPECTOR_DENIED_FIRST_READ_ROLES,
          notClaimedContent: [
            ...state.productUx.productComprehension.inspectorLayer
              .notClaimedContent
          ] as typeof M8A_V410_INSPECTOR_NOT_CLAIMED_CONTENT
        }
      },
      truthBadges: [...state.productUx.truthBadges] as typeof M8A_V47_TRUTH_BADGES,
      disclosure: {
        ...state.productUx.disclosure,
        sourcesFilter: {
          ...state.productUx.disclosure.sourcesFilter
        },
        lines: [
          ...state.productUx.disclosure.lines
        ] as typeof M8A_V47_DISCLOSURE_LINES
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
      ] as typeof M8A_V4_CUSTOMER_REQUIREMENT_GAP_TRUTH_LABELS,
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
      ] as typeof M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS,
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
      ] as typeof M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS,
      boundedRouteRepresentationIds: [
        ...state.acceptanceLayer.boundedRouteRepresentationIds
      ] as typeof M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS,
      f13Phase71Evidence: {
        ...state.acceptanceLayer.f13Phase71Evidence
      },
      f13RouteNativeScaleReadiness: {
        ...state.acceptanceLayer.f13RouteNativeScaleReadiness,
        knownGaps: [
          ...state.acceptanceLayer.f13RouteNativeScaleReadiness.knownGaps
        ] as typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS,
        nonClaims: [
          ...state.acceptanceLayer.f13RouteNativeScaleReadiness.nonClaims
        ] as typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS
      },
      externalValidationPackage: {
        ...state.acceptanceLayer.externalValidationPackage,
        failIds: [
          ...state.acceptanceLayer.externalValidationPackage.failIds
        ] as typeof M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS
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
      ] as typeof M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS
    },
    policyRuleControls: buildPolicyRuleControlsState(
      state.policyRuleControls.activePolicyPreset.presetId,
      state.policyRuleControls.activeRulePreset.presetId
    ),
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

function notifyListeners(
  listeners: ReadonlySet<(state: M8aV4GroundStationSceneState) => void>,
  state: M8aV4GroundStationSceneState
): void {
  for (const listener of listeners) {
    listener(cloneState(state));
  }
}

function buildEndpointState(
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

function buildReplayWindowState(
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

function buildSimulationHandoverState(
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

function buildProductUxState({
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
}: {
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
}): M8aV4GroundStationSceneState["productUx"] {
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

function createSelectedPairOverlayDebugState(
  status: SelectedPairOverlayDebugStatus,
  overrides: Partial<SelectedPairOverlayDebugState> = {}
): SelectedPairOverlayDebugState {
  return {
    status,
    satelliteCount: 0,
    actorCount: 0,
    runtimeLinkVisible: false,
    positionSampleCount: 0,
    activeSelectionSampleCount: 0,
    handoverEventCount: 0,
    linkFlowCueCount: 0,
    eventCueCount: 0,
    sourceMode: "",
    pairGeometry: "",
    errorMessage: "",
    ...overrides
  };
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

async function installSelectedPairSceneOverlay({
  dataSource,
  endpointA,
  endpointB,
  modelUri,
  replayClock,
  sceneEndpointContext,
  viewer,
  onStateChange,
  shouldSkip
}: {
  readonly dataSource: CustomDataSource;
  readonly endpointA: EndpointRenderContext;
  readonly endpointB: EndpointRenderContext;
  readonly modelUri: string;
  readonly replayClock: ReplayClock;
  readonly sceneEndpointContext: SceneEndpointContext;
  readonly viewer: Viewer;
  readonly onStateChange: (state: SelectedPairOverlayDebugState) => void;
  readonly shouldSkip: () => boolean;
}): Promise<void> {
  const pair = sceneEndpointContext.selectedPair;
  if (!pair) {
    onStateChange(createSelectedPairOverlayDebugState("not-requested"));
    return;
  }

  onStateChange(createSelectedPairOverlayDebugState("loading"));
  const sources = await loadDefaultTleSources();
  if (shouldSkip()) {
    return;
  }

  const tleRecords = parseRuntimeTleSources(sources);
  const result = computeRuntimeProjection({
    stationA: pair.stationA,
    stationB: pair.stationB,
    timeWindow: resolveSelectedPairSceneTimeWindow(),
    tleRecords,
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
          handoverEventCount: viewModel.handoverEvents.length
        })
      );
      applySelectedPairCameraHint(viewer, sceneEndpointContext, viewModel.cameraHint);
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
      pairGeometry: viewModel.cameraHint.pairGeometry
    })
  );

  applySelectedPairCameraHint(viewer, sceneEndpointContext, viewModel.cameraHint);
  viewer.scene.requestRender();
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
  const productUxRoot = createProductUxRoot();
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

  // endpointA / endpointB are reassigned by setSelectedPair so the closures
  // captured below (createRelationPositions, createLinkFlowSegmentPositions,
  // resolveLinkFlowSegmentEndpoints, etc.) read the current selected pair's
  // render positions through their .renderMarker.displayPosition lookups.
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
    dataSource.entities.add({
      id: `m8a-v4-endpoint-${endpoint.endpointId}`,
      name: endpoint.renderMarker.label,
      position: positionToCartesian(endpoint.renderMarker.displayPosition),
      billboard: createEndpointBillboardStyle(endpoint),
      ellipse: createEndpointEllipseStyle(endpoint),
      label: createEndpointLabelStyle(endpoint),
      description: new ConstantProperty(
        `${endpoint.endpointLabel}; ${endpoint.renderMarker.requiredPrecisionBadge}; display context only.`
      )
    });
  }

  dataSource.entities.add({
    id: "m8a-v4-operator-family-endpoint-context-ribbon",
    name: sceneEndpointContext.selectedPair
      ? "Selected pair endpoint context ribbon"
      : "Operator-family endpoint context ribbon",
    polyline: new PolylineGraphics({
      positions: new ConstantProperty([
        positionToCartesian(endpointA.renderMarker.displayPosition),
        positionToCartesian(endpointB.renderMarker.displayPosition)
      ]),
      width: new ConstantProperty(1.4),
      material: new PolylineDashMaterialProperty({
        color: new ConstantProperty(
          Color.fromCssColorString("#f4fbff").withAlpha(0.42)
        ),
        gapColor: new ConstantProperty(
          Color.fromCssColorString("#06121a").withAlpha(0.06)
        ),
        dashLength: 20
      }),
      arcType: ArcType.GEODESIC,
      clampToGround: false
    }),
    description: new ConstantProperty(
      sceneEndpointContext.selectedPair
        ? "Selected pair context ribbon; public registry coordinates; display context only."
        : "Endpoint pair context ribbon; operator-family precision; display context only."
    )
  });

  const initialSelectedPairOverlayGeneration = ++selectedPairOverlayInstallGeneration;
  void installSelectedPairSceneOverlay({
    dataSource,
    endpointA,
    endpointB,
    modelUri,
    replayClock,
    sceneEndpointContext,
    viewer,
    onStateChange: (state) => {
      selectedPairOverlayState = state;
    },
    shouldSkip: () =>
      disposed ||
      initialSelectedPairOverlayGeneration !== selectedPairOverlayInstallGeneration
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

        const entity = dataSource.entities.add({
          id: actor.actorId,
          name: actor.label,
          position: createActorPositionProperty(actor),
          billboard: shouldRenderActorGlow(actor)
            ? createActorGlowStyle(actor)
            : undefined,
          model: createActorModelGraphics(modelUri, actor, emphasis),
          label: shouldRenderActorLabel(actor, latestSimulationWindow)
            ? createActorLabelStyle(actor, emphasis)
            : undefined,
          description: new ConstantProperty(
            `${actor.label}: ${actor.evidenceClass}; not active satellite; not native RF handover.`
          )
        });

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

      // endpointA / endpointB are reassigned by applySelectedPair but
      // always to non-null values (the function returns early without
      // setting them undefined); the non-null assertions stay safe.
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
    const entity = dataSource.entities.add({
      id: `m8a-v46e-simulation-${relationRole}-context-ribbon`,
      name: `V4.6E ${M8A_V46E_RELATION_ROLE_LABELS[relationRole]}`,
      polyline: createRelationStyle(
        createRelationPositions(relationRole),
        relationRole
      ),
      description: new ConstantProperty(
        "V4.6E simulation display context from the repo-owned projection module."
      )
    });

    return {
      role: relationRole,
      entity
    };
  });
  const linkFlowSegmentHandles: ReadonlyArray<LinkFlowSegmentRenderHandle> =
    M8A_V4_LINK_FLOW_RELATION_ROLES.flatMap((role) =>
      M8A_V4_LINK_FLOW_DIRECTIONS.map((direction) => {
        const entity = dataSource.entities.add({
          id: `m8a-v4-link-flow-${role}-${direction}-segment`,
          name: `V4 link flow ${role} ${direction} segment`,
          polyline: createLinkFlowSegmentStyle(
            createLinkFlowSegmentPositions(role, direction),
            direction,
            role
          ),
          description: new ConstantProperty(
            `Modeled ${direction} data-flow cue; not packet capture, not measured throughput, not active gateway truth.`
          )
        });

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
          const entity = dataSource.entities.add({
            id: `m8a-v4-link-flow-${role}-${direction}-pulse-${pulseIndex}`,
            name: `V4 link flow ${role} ${direction} pulse ${pulseIndex + 1}`,
            position: createLinkFlowPulsePosition(role, direction, pulseOffset),
            billboard: createLinkFlowPulseStyle(
              direction,
              role,
              pulseIndex,
              createLinkFlowPulseRotation(role, direction)
            ),
            label:
              role === "displayRepresentative" && pulseIndex === 0
                ? createLinkFlowLabelStyle(direction)
                : undefined,
            description: new ConstantProperty(
              `Moving ${direction} pulse along a modeled ground-station/satellite link; ${M8A_V4_LINK_FLOW_TRUTH_BOUNDARY}.`
            )
          });

          return {
            role,
            direction,
            pulseIndex,
            entity
          };
        })
      )
    );
  const geoGuardCueEntity = dataSource.entities.add({
    id: "m8a-v46e-simulation-geo-guard-cue",
    name: "V4.6E GEO guard cue",
    position: createGeoGuardCuePosition(),
    billboard: createGeoGuardCueStyle(),
    description: new ConstantProperty(
      "Low-opacity GEO guard cue; simulation display context only."
    )
  });
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
      dataSource.entities.add({
        id: `m8a-v4-endpoint-${endpoint.endpointId}`,
        name: endpoint.renderMarker.label,
        position: positionToCartesian(endpoint.renderMarker.displayPosition),
        billboard: createEndpointBillboardStyle(endpoint),
        ellipse: createEndpointEllipseStyle(endpoint),
        label: createEndpointLabelStyle(endpoint),
        description: new ConstantProperty(
          `${endpoint.endpointLabel}; ${endpoint.renderMarker.requiredPrecisionBadge}; display context only.`
        )
      });
    }

    // Re-add the ribbon polyline at the new positions.
    dataSource.entities.add({
      id: "m8a-v4-operator-family-endpoint-context-ribbon",
      name: sceneEndpointContext.selectedPair
        ? "Selected pair endpoint context ribbon"
        : "Operator-family endpoint context ribbon",
      polyline: new PolylineGraphics({
        positions: new ConstantProperty([
          positionToCartesian(endpointA.renderMarker.displayPosition),
          positionToCartesian(endpointB.renderMarker.displayPosition)
        ]),
        width: new ConstantProperty(1.4),
        material: new PolylineDashMaterialProperty({
          color: new ConstantProperty(
            Color.fromCssColorString("#f4fbff").withAlpha(0.42)
          ),
          gapColor: new ConstantProperty(
            Color.fromCssColorString("#06121a").withAlpha(0.06)
          ),
          dashLength: 20
        }),
        arcType: ArcType.GEODESIC,
        clampToGround: false
      }),
      description: new ConstantProperty(
        sceneEndpointContext.selectedPair
          ? "Selected pair context ribbon; public registry coordinates; display context only."
          : "Endpoint pair context ribbon; operator-family precision; display context only."
      )
    });

    // Reset the overlay debug state to `loading` while the async overlay
    // install re-runs; the onStateChange callback below resets it to
    // `ready`/`empty`/`error` as the projection completes.
    selectedPairOverlayState = createSelectedPairOverlayDebugState(
      sceneEndpointContext.selectedPair ? "loading" : "not-requested"
    );

    const selectedPairOverlayGeneration = ++selectedPairOverlayInstallGeneration;
    void installSelectedPairSceneOverlay({
      dataSource,
      endpointA,
      endpointB,
      modelUri,
      replayClock,
      sceneEndpointContext,
      viewer,
      onStateChange: (state) => {
        selectedPairOverlayState = state;
      },
      shouldSkip: () =>
        disposed ||
        selectedPairOverlayGeneration !== selectedPairOverlayInstallGeneration
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
