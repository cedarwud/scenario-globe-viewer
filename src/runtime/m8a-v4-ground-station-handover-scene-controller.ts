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
  type M8aV4EndpointProjection,
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
  buildF09RateWindowRows,
  escapeM8aV411MetricText,
  renderF09RateWindowRows,
  renderF16ExplicitNonClaimChips,
  renderItriAcceptanceLayer,
  renderItriF10PolicyPresetOptions,
  renderItriF11RuleParameterChips,
  renderItriF11RulePresetOptions,
  renderItriRequirementGapGroups
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
  M8A_V411_DISABLED_METRIC_TILES,
  resolveM8aV411StateEvidenceCopy,
  resolveM8aV411TruthBoundaryLines,
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
  M8A_V411_R2_READ_ONLY_CANDIDATES,
  M8A_V411_R2_READ_ONLY_LABEL,
  M8A_V411_SOURCES_ROLE_VERSION,
  resolveM8aV411ActorOperatorFamily,
  resolveM8aV411EndpointLabel,
  resolveM8aV411OrbitToken,
  resolveM8aV411SourceLevel,
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
  M8A_V410_BOUNDARY_COMPACT_COPY,
  M8A_V410_BOUNDARY_SECONDARY_COPY,
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
  resolveM8aV4ItriDemoFocusChoreography,
  resolveTimelineLabel,
  resolveV410TransitionLabel,
  resolveV48StateOrdinalLabel,
  resolveV49WindowProductCopy,
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
    endpointId: M8aV4EndpointId;
    label: string;
    markerId: string;
    precisionBadge: typeof M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
    renderPrecision: "bounded-operator-family-display-anchor";
    displayPositionIsSourceTruth: false;
    rawSourceCoordinatesRenderable: false;
    orbitEvidenceChips: ReadonlyArray<"LEO strong" | "MEO strong" | "GEO strong">;
  }>;
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

export function isM8aV4GroundStationRuntimeRequested(search: URLSearchParams): boolean {
  return (
    search.get(M8A_V4_GROUND_STATION_QUERY_PARAM) ===
      M8A_V4_GROUND_STATION_QUERY_VALUE ||
    search.get("firstIntakeScenarioId") === M8A_V4_GROUND_STATION_SCENARIO_ID
  );
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

function applyV4Camera(viewer: Viewer): void {
  viewer.camera.cancelFlight();
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

function resolveEndpointColor(endpointId: M8aV4EndpointId): Color {
  return endpointId === "tw-cht-multi-orbit-ground-infrastructure"
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

function createEndpointPointStyle(endpoint: M8aV4EndpointProjection): PointGraphics {
  return new PointGraphics({
    pixelSize: new ConstantProperty(11),
    color: new ConstantProperty(resolveEndpointColor(endpoint.endpointId)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 60_000_000)
  });
}

function createEndpointEllipseStyle(
  endpoint: M8aV4EndpointProjection
): EllipseGraphics {
  const color = resolveEndpointColor(endpoint.endpointId);

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
  _endpoint: M8aV4EndpointProjection
): LabelGraphics {
  return new LabelGraphics({
    show: new ConstantProperty(false),
    text: new ConstantProperty(M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE),
    font: "11px sans-serif",
    style: LabelStyle.FILL_AND_OUTLINE,
    fillColor: new ConstantProperty(Color.WHITE.withAlpha(0.96)),
    outlineColor: new ConstantProperty(
      Color.fromCssColorString("#06121a").withAlpha(0.96)
    ),
    outlineWidth: 2,
    showBackground: true,
    backgroundColor: new ConstantProperty(
      Color.fromCssColorString("#0b1820").withAlpha(0.68)
    ),
    backgroundPadding: new Cartesian2(7, 4),
    pixelOffset: new Cartesian2(0, -32),
    horizontalOrigin: HorizontalOrigin.CENTER,
    verticalOrigin: VerticalOrigin.BOTTOM,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, 60_000_000)
  });
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
  root.dataset.itriRequirementGapSurface =
    state.requirementGapSurface.version;
  root.dataset.itriRequirementGapOpenIds = serializeList(
    state.requirementGapSurface.openRequirementIds
  );
  root.dataset.itriAcceptanceLayer = state.acceptanceLayer.version;
  root.dataset.itriAcceptanceRequirementIds = serializeList([
    ...state.acceptanceLayer.requirementIds
  ]);
  root.dataset.itriAcceptanceExternalFailIds = serializeList([
    ...state.acceptanceLayer.externalFailIds
  ]);
  root.dataset.itriF13ScaleReadinessSurface =
    state.acceptanceLayer.f13RouteNativeScaleReadiness.version;
  root.dataset.itriF13ScaleReadinessCurrentRouteActorCount = String(
    state.acceptanceLayer.f13RouteNativeScaleReadiness.currentRouteActorCount
  );
  root.dataset.itriF13ScaleReadinessActorCount = String(
    state.acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount
  );
  root.dataset.itriF13ScaleReadinessLeoCount = String(
    state.acceptanceLayer.f13RouteNativeScaleReadiness.readinessLeoActorCount
  );
  root.dataset.itriF13ScaleReadinessTargetLeoCount = String(
    state.acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount
  );
  root.dataset.itriF13ScaleReadinessTargetReached = String(
    state.acceptanceLayer.f13RouteNativeScaleReadiness.targetReached
  );
  root.dataset.itriF13ScaleReadinessSourceType =
    state.acceptanceLayer.f13RouteNativeScaleReadiness.sourceType;
  root.dataset.itriF13ScaleReadinessBuiltAtUtc =
    state.acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc;
  root.dataset.itriF13ScaleReadinessClosureClaimed = String(
    state.acceptanceLayer.f13RouteNativeScaleReadiness
      .routeNativeScaleClosureClaimed
  );
  root.dataset.itriF09RateSurface = state.f09RateSurface.version;
  root.dataset.itriF09RateDisposition = state.f09RateSurface.disposition;
  root.dataset.itriF09ExternalTruthDisposition =
    state.f09RateSurface.externalTruthDisposition;
  root.dataset.itriF09CurrentClass =
    state.f09RateSurface.currentNetworkSpeedClass;
  root.dataset.itriF09MetricTruth = state.f09RateSurface.metricTruth;
  root.dataset.itriF09MeasuredThroughputClaimed = String(
    state.f09RateSurface.measuredThroughputClaimed
  );
  root.dataset.itriF16ExportSurface = state.f16ExportSurface.version;
  root.dataset.itriF16ExportSchemaVersion =
    state.f16ExportSurface.schemaVersion;
  root.dataset.itriF16ExportDisposition =
    state.f16ExportSurface.disposition;
  root.dataset.itriF16ExternalTruthDisposition =
    state.f16ExportSurface.externalTruthDisposition;
  root.dataset.itriF16ExportArtifactTruth =
    state.f16ExportSurface.artifactTruth;
  root.dataset.itriF16MeasuredValuesIncluded = String(
    state.f16ExportSurface.measuredValuesIncluded
  );
  root.dataset.itriF16ExternalReportTruthClaimed = String(
    state.f16ExportSurface.externalReportSystemTruthClaimed
  );
  root.dataset.itriPolicyRuleControlsSurface =
    state.policyRuleControls.version;
  root.dataset.itriPolicyRuleControlsDisposition =
    state.policyRuleControls.disposition;
  root.dataset.itriPolicyRuleTruthBoundary =
    state.policyRuleControls.truthBoundary;
  root.dataset.itriF10PolicyPresetId =
    state.policyRuleControls.activePolicyPreset.presetId;
  root.dataset.itriF10PolicyPresetMode =
    state.policyRuleControls.policyPresetMode;
  root.dataset.itriF11RulePresetId =
    state.policyRuleControls.activeRulePreset.presetId;
  root.dataset.itriF11RulePresetMode =
    state.policyRuleControls.rulePresetMode;
  root.dataset.itriPolicyRuleLiveControlClaimed = String(
    state.policyRuleControls.liveControlClaimed
  );
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

function renderTruthBadges(): string {
  return M8A_V47_TRUTH_BADGES.map(
    (badge) =>
      `<span data-m8a-v47-truth-badge="${badge}" data-m8a-v48-info-class="fixed">${badge}</span>`
  ).join("");
}

function renderM8aV411DisabledMetricTiles(): string {
  return M8A_V411_DISABLED_METRIC_TILES.map((tile) => {
    const gap = escapeM8aV411MetricText(tile.gap);
    const hookpoint = escapeM8aV411MetricText(tile.hookpoint);
    const placeholder = escapeM8aV411MetricText(tile.placeholder);
    const reachability = escapeM8aV411MetricText(tile.reachability);

    return [
      `<li class="m8a-v411-metrics__tile m8a-v411-metrics__tile--disabled"`,
      ` data-m8a-v411-disabled-metric-tile="true"`,
      ` data-m8a-v411-disabled-metric-id="${tile.id}"`,
      ` data-m8a-v411-disabled-metric-reachability="${reachability}"`,
      ` aria-disabled="true">`,
      `<span class="m8a-v411-metrics__status" data-m8a-v48-info-class="fixed">Unavailable</span>`,
      `<strong class="m8a-v411-metrics__label" data-m8a-v48-info-class="fixed">${gap}</strong>`,
      `<span class="m8a-v411-metrics__value" data-m8a-v48-info-class="dynamic">${placeholder}</span>`,
      `<p class="m8a-v411-metrics__meta" data-m8a-v48-info-class="disclosure"><span>Hookpoint</span><span>${hookpoint}</span></p>`,
      `<p class="m8a-v411-metrics__meta" data-m8a-v48-info-class="disclosure"><span>Reachability</span><span>${reachability}</span></p>`,
      `</li>`
    ].join("");
  }).join("");
}

// Conv 3: renderCompactTruthAffordance removed — Truth button no longer exists.
// Boundary toggle is now triggered by footer chip with data-m8a-v47-action="toggle-boundary".

function renderV410SequenceRailMarks(): string {
  return M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline
    .map((windowDefinition) => {
      const copy = resolveV49WindowProductCopy(windowDefinition.windowId);
      const ordinal = resolveV48StateOrdinalLabel(
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel
          .timeline,
        windowDefinition.windowId
      );
      const railLabel = resolveV410TransitionLabel(windowDefinition.windowId);

      return [
        `<li class="m8a-v410-sequence-rail__mark"`,
        ` data-m8a-v410-sequence-mark="true"`,
        ` data-m8a-v410-sequence-window-id="${windowDefinition.windowId}"`,
        ` data-m8a-v410-sequence-index="${ordinal.stateIndex}"`,
        ` data-m8a-v410-sequence-orbit="${copy.orbitClassToken}"`,
        ` data-active="false"`,
        ` data-next="false"`,
        ` data-transition-from="false"`,
        ` data-transition-to="false"`,
        ` aria-current="false"`,
        ` aria-label="${ordinal.stateOrdinalLabel}: ${copy.productLabel}">`,
        `<span class="m8a-v410-sequence-rail__number" aria-hidden="true">${ordinal.stateIndex}</span>`,
        `<strong class="m8a-v410-sequence-rail__label">${railLabel}</strong>`,
        `<small class="m8a-v410-sequence-rail__orbit">${copy.orbitClassToken}</small>`,
        `</li>`
      ].join("");
    })
    .join("");
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

function renderDisclosureLines(
  lines: readonly string[] = M8A_V47_DISCLOSURE_LINES
): string {
  return lines.map(
    (line) => `<li data-m8a-v48-info-class="disclosure">${line}</li>`
  ).join("");
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

  const hasSlice2SceneNearStructure = Boolean(
    root.querySelector("[data-m8a-v49-scene-near-meaning]")
  );
  const hasSlice3TransitionStructure = Boolean(
    root.querySelector("[data-m8a-v49-transition-event='true']")
  );
  const hasSlice4InspectorStructure = Boolean(
    root.querySelector("[data-m8a-v49-inspector-primary-body='true']") &&
      root.querySelector("[data-m8a-v49-debug-evidence='true']") &&
      root.querySelector("[data-m8a-v410-inspector-evidence-structure='true']") &&
      root.querySelector("[data-m8a-v411-inspector-role='state-evidence']") &&
      root.querySelector("[data-m8a-v411-inspector-role='truth-boundary']") &&
      root.querySelector("[data-m8a-v411-state-evidence-truth-tail='true']") &&
      root.querySelector("[data-itri-demo-l2-acceptance-layer='true']") &&
      root.querySelector("[data-itri-f13-scale-readiness-surface='true']") &&
      root.querySelector("[data-itri-requirement-gap-surface='true']") &&
      root.querySelector("[data-itri-policy-rule-controls-surface='true']") &&
      root.querySelector("[data-itri-f09-rate-surface='true']") &&
      root.querySelector("[data-itri-f16-export-surface='true']")
  );
  const hasSlice1V410SceneNarrative = Boolean(
    root.querySelector("[data-m8a-v410-scene-narrative='true']") &&
      root.querySelector("[data-m8a-v410-first-read-line='true']") &&
      root.querySelector("[data-m8a-v410-next-line='true']")
  );
  const hasSlice2V410SequenceRail = Boolean(
    root.querySelector("[data-m8a-v410-sequence-rail='true']") &&
      root.querySelectorAll("[data-m8a-v410-sequence-mark='true']").length ===
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel
          .timeline.length &&
      root.querySelector("[data-m8a-v410-sequence-active-summary='true']") &&
      root.querySelector("[data-m8a-v410-sequence-next-summary='true']")
  );
  // Conv 3: compact-line was on Truth button (now removed); check boundary surface + full disclosure only
  const hasSlice3V410BoundarySurface = Boolean(
    root.querySelector("[data-m8a-v410-boundary-surface='true']") &&
      root.querySelector("[data-m8a-v410-boundary-full-truth-disclosure='true']")
  );
  // Phase 4: reviewer mode state machine + narrow rail trigger + ARIA live region
  const hasPhase4ReviewerModeStructure = Boolean(
    root.querySelector("[data-m8a-v411-reviewer-mode-toggle='true']") &&
      root.querySelector("[data-m8a-v411-reviewer-mode-status='true']") &&
      root.querySelector("[data-m8a-v411-inspector-mode-label='true']") &&
      root.querySelector("[data-m8a-v411-narrow-rail-trigger='true']")
  );

  if (
    root.dataset.m8aV471StableControls === "true" &&
    root.dataset.m8aV49StructureVersion === M8A_V49_PRODUCT_COMPREHENSION_VERSION &&
    hasSlice2SceneNearStructure &&
    hasSlice3TransitionStructure &&
    hasSlice4InspectorStructure &&
    hasSlice1V410SceneNarrative &&
    hasSlice2V410SequenceRail &&
    hasSlice3V410BoundarySurface &&
    hasPhase4ReviewerModeStructure
  ) {
    return;
  }

  root.innerHTML = `
    <div class="m8a-v411-top-strip" data-m8a-v411-top-strip="true" data-m8a-v47-ui-surface="top-scope-strip">
      <span data-m8a-v411-top-strip-label="true" data-m8a-v48-info-class="fixed">Scenario Scope</span>
      <span data-m8a-v411-top-strip-slot="scope" data-m8a-v48-info-class="dynamic">Scope: 13-actor demo · LEO/MEO/GEO</span>
      <span data-m8a-v411-top-strip-slot="replay" data-m8a-v48-info-class="dynamic">Time: --</span>
      <span data-m8a-v411-top-strip-slot="precision" data-m8a-v48-info-class="dynamic">Precision: operator-family precision</span>
      <span data-m8a-v411-top-strip-slot="boundary" data-m8a-v48-info-class="dynamic">Boundary: repo-owned projection · not measured truth</span>
    </div>
    <button type="button" class="m8a-v411-handover-rail-scrim" data-m8a-v411-handover-rail-scrim="true" data-m8a-v47-action="close-handover-rail" data-m8a-v48-info-class="control" tabindex="-1" aria-label="Close handover rail" hidden></button>
    <aside id="m8a-v411-handover-rail-drawer" class="m8a-v411-handover-rail" data-m8a-v411-handover-rail="true" data-itri-demo-l0-briefing-card="true" data-itri-demo-l0-layer="L0-first-read-demo-stage" data-itri-demo-l0-version="${M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION}" data-m8a-v47-ui-surface="left-handover-rail" aria-label="Handover briefing">
      <div class="m8a-v411-handover-rail-header" data-m8a-v411-handover-rail-header="true">
        <span data-itri-demo-l0-eyebrow="true" data-m8a-v48-info-class="fixed">customer V4 demo</span>
        <strong data-itri-demo-l0-heading="true" data-m8a-v48-info-class="fixed">Handover briefing</strong>
        <button type="button" class="m8a-v411-handover-rail-close" data-m8a-v47-action="close-handover-rail" data-m8a-v411-handover-rail-close="true" data-m8a-v48-info-class="control" aria-label="Collapse briefing sheet">Close</button>
      </div>
      <div data-m8a-v411-handover-rail-content="true">
        <div class="m8a-v411-rail-panel" data-m8a-v411-rail-panel="true" data-m8a-v411-rail-current="true" data-itri-demo-l0-primary-surface="true" data-m8a-v48-info-class="dynamic" aria-label="Active handover briefing state">
          <div class="m8a-v411-briefing-now" data-itri-demo-l0-section="now">
            <span data-m8a-v48-info-class="fixed">Now</span>
            <strong data-itri-demo-l0-current-state="true" data-m8a-v48-info-class="dynamic"></strong>
            <p data-itri-demo-l0-current-reason="true" data-m8a-v48-info-class="dynamic"></p>
          </div>
          <div class="m8a-v411-rail-layer m8a-v411-rail-layer--judgment" data-m8a-v411-rail-layer="judgment">
            <span class="m8a-v411-rail-main-chip" data-m8a-v411-rail-main-chip="true" role="group" tabindex="0" aria-label="Active handover judgment">
              <span class="m8a-v411-rail-role-glyph" data-m8a-v411-rail-role-glyph="true" aria-hidden="true">F</span>
              <span class="m8a-v411-rail-orbit-swatch" data-m8a-v411-rail-orbit-swatch="true" aria-hidden="true"></span>
              <span data-m8a-v411-rail-main-chip-text="true">LEO · focus</span>
            </span>
            <div class="m8a-v411-rail-token-row" data-m8a-v411-rail-token-row="true" aria-label="Current candidate fallback context">
              <span class="m8a-v411-rail-subtoken" data-m8a-v411-rail-slot="current" data-m8a-v411-rail-token="current" data-m8a-v48-info-class="dynamic">Current: --</span>
              <span class="m8a-v411-rail-subtoken" data-m8a-v411-rail-slot="candidate" data-m8a-v411-rail-token="candidate" data-m8a-v48-info-class="dynamic">Candidate: --</span>
              <span class="m8a-v411-rail-subtoken" data-m8a-v411-rail-slot="fallback" data-m8a-v411-rail-token="fallback" data-m8a-v48-info-class="dynamic">Fallback: --</span>
            </div>
          </div>
          <div class="m8a-v411-briefing-grid" data-itri-demo-l0-section="quick-facts">
            <p data-itri-demo-l0-active-orbit="true" data-m8a-v48-info-class="dynamic"></p>
            <p data-itri-demo-l0-rate-class="true" data-m8a-v48-info-class="dynamic"></p>
          </div>
          <p class="m8a-v411-rail-next" data-m8a-v411-rail-layer="next" data-m8a-v411-rail-slot="next" data-itri-demo-l0-next-state="true" data-m8a-v48-info-class="dynamic">Next: --</p>
          <p class="m8a-v411-rail-evidence" data-m8a-v411-rail-layer="evidence" data-m8a-v411-rail-slot="evidence" data-m8a-v48-info-class="dynamic">modeled quality --</p>
          <p class="m8a-v411-briefing-truth" data-itri-demo-l0-truth-boundary="true" data-m8a-v48-info-class="fixed">${M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY}</p>
        </div>
      </div>
    </aside>
    <div class="m8a-v47-product-ux__scene-connector" data-m8a-v48-scene-connector="true" aria-hidden="true" hidden></div>
    <div class="m8a-v47-product-ux__transition-event" data-m8a-v49-transition-event="true" data-m8a-v47-ui-surface="transition-event" aria-live="polite" hidden>
      <strong data-m8a-v49-transition-summary="true" data-m8a-v48-info-class="dynamic"></strong>
      <small data-m8a-v49-transition-context="true" data-m8a-v48-info-class="dynamic"></small>
    </div>
    <div class="m8a-v47-product-ux__scene-annotation m8a-v410-product-ux__scene-narrative" data-m8a-v47-ui-surface="scene-near-annotation" data-m8a-v47-scene-annotation="true" data-m8a-v410-scene-narrative="true" aria-live="polite">
      <span data-m8a-v49-scene-near-orbit-token="true" data-m8a-v48-info-class="fixed">Orbit focus</span>
      <strong data-m8a-v47-active-label="scene-annotation" data-m8a-v410-scene-title="true" data-m8a-v48-info-class="dynamic"></strong>
      <p data-m8a-v49-scene-near-meaning="true" data-m8a-v410-first-read-line="true" data-m8a-v48-info-class="dynamic"></p>
      <small data-m8a-v47-annotation-context="true" data-m8a-v49-scene-near-cue="true" data-m8a-v410-watch-cue-line="true" data-m8a-v48-info-class="dynamic">Watch: representative cue.</small>
      <small data-m8a-v410-next-line="true" data-m8a-v48-info-class="dynamic"></small>
      <small data-m8a-v49-scene-near-fallback="true" data-m8a-v410-fallback-line="true" data-m8a-v48-info-class="dynamic" hidden></small>
    </div>
    <div class="m8a-v410-product-ux__sequence-rail" data-m8a-v410-sequence-rail="true" data-m8a-v47-ui-surface="handover-sequence-rail" data-m8a-v48-info-class="dynamic" aria-label="Handover sequence rail" aria-live="polite">
      <div class="m8a-v410-sequence-rail__summary">
        <span data-m8a-v48-info-class="fixed">Handover sequence</span>
        <strong data-m8a-v410-sequence-active-summary="true"></strong>
        <small data-m8a-v410-sequence-next-summary="true"></small>
      </div>
      <ol class="m8a-v410-sequence-rail__track">
        ${renderV410SequenceRailMarks()}
      </ol>
    </div>
    <div class="m8a-v47-product-ux__strip" data-m8a-v47-ui-surface="compact-control-strip" data-m8a-v47-control-strip="true">
      <div class="m8a-v47-product-ux__strip-state">
        <span data-m8a-v48-info-class="fixed">Current state</span>
        <strong data-m8a-v47-active-label="strip" data-m8a-v48-info-class="dynamic"></strong>
        <small data-m8a-v48-state-ordinal="strip" data-m8a-v48-info-class="dynamic">State 1 of 5</small>
      </div>
      <button type="button" class="m8a-v411-narrow-rail-trigger" data-m8a-v47-action="open-handover-rail" data-m8a-v411-narrow-rail-trigger="true" data-m8a-v48-info-class="control" aria-label="Expand briefing sheet" aria-expanded="false" aria-controls="m8a-v411-handover-rail-drawer">Briefing</button>
      <button type="button" class="m8a-v47-product-ux__play-toggle" data-m8a-v47-action="pause" data-m8a-v47-control-id="play-pause" data-m8a-v48-info-class="control">Pause</button>
      <button type="button" data-m8a-v47-action="restart" data-m8a-v47-control-id="restart" data-m8a-v48-info-class="control">Restart</button>
      <div class="m8a-v47-product-ux__strip-speeds" data-m8a-v47-control-group="speed">
        ${renderSpeedButtons(M8A_V47_PRODUCT_DEFAULT_MULTIPLIER)}
      </div>
      <button type="button" class="m8a-v411-reviewer-mode-toggle" data-m8a-v47-action="toggle-review-mode" data-m8a-v411-reviewer-mode-toggle="true" data-m8a-v411-reviewer-mode-on="true" data-m8a-v48-info-class="control" aria-pressed="true" title="Auto-pause replay at each window transition for review">Review mode</button>
      <progress class="m8a-v47-product-ux__progress" max="1" value="0" data-m8a-v47-progress="true" data-m8a-v48-info-class="dynamic" hidden aria-hidden="true"></progress>
      <button type="button" data-m8a-v47-action="toggle-disclosure" data-m8a-v47-control-id="details-toggle" data-m8a-v48-info-class="control" aria-expanded="false">Details</button>
      <button type="button" class="m8a-v411-evidence-toggle" data-m8a-v47-action="open-evidence" data-m8a-v47-control-id="evidence-toggle" data-m8a-v48-info-class="control" aria-expanded="false" aria-controls="m8a-v48-inspector-sheet">Evidence</button>
    </div>
    <div class="m8a-v411-reviewer-mode-status" data-m8a-v411-reviewer-mode-status="true" data-m8a-v411-reviewer-mode-version="${M8A_V411_REVIEWER_MODE_VERSION}" role="status" aria-live="polite" aria-atomic="true" data-m8a-v48-info-class="dynamic"></div>
    <aside id="m8a-v410-boundary-surface" class="m8a-v410-product-ux__boundary-surface" data-m8a-v410-boundary-surface="true" data-m8a-v47-ui-surface="boundary-surface" data-m8a-v48-info-class="disclosure" hidden>
      <div class="m8a-v410-boundary-surface__header">
        <strong data-m8a-v48-info-class="fixed">Truth boundary</strong>
        <button type="button" data-m8a-v47-action="close-boundary" data-m8a-v47-control-id="boundary-close" data-m8a-v48-info-class="control">Close</button>
      </div>
      <p class="m8a-v410-boundary-surface__summary" data-m8a-v410-boundary-summary="true" data-m8a-v48-info-class="disclosure">${M8A_V410_BOUNDARY_COMPACT_COPY}.</p>
      <p class="m8a-v410-boundary-surface__secondary" data-m8a-v410-boundary-secondary="true" data-m8a-v48-info-class="disclosure">${M8A_V410_BOUNDARY_SECONDARY_COPY}</p>
      <details class="m8a-v47-product-ux__disclosure m8a-v410-boundary-surface__full" data-m8a-v410-boundary-full-truth-disclosure="true">
        <summary data-m8a-v47-action="toggle-boundary-full-truth" data-m8a-v48-info-class="disclosure">Full truth disclosure</summary>
        <div class="m8a-v47-product-ux__badges">
          ${renderTruthBadges()}
        </div>
        <ul>
          ${renderDisclosureLines()}
        </ul>
      </details>
    </aside>
    <aside id="m8a-v48-inspector-sheet" class="m8a-v47-product-ux__sheet" data-m8a-v47-ui-surface="inspection-sheet" data-m8a-v48-inspector="true" hidden>
      <div class="m8a-v47-product-ux__sheet-header">
        <div class="m8a-v410-inspector__title">
          <span data-m8a-v48-info-class="fixed">Details</span>
          <strong data-m8a-v410-inspector-title="true" data-m8a-v48-info-class="fixed">Evidence inspector</strong>
        </div>
        <span class="m8a-v411-inspector__mode-label" data-m8a-v411-inspector-mode-label="true" data-m8a-v411-replay-clock-mode="running" data-m8a-v48-info-class="dynamic" hidden></span>
        <span class="m8a-v411-inspector__validation-badge" data-m8a-v411-inspector-validation-badge="true" data-m8a-v411-validation-status-badge="true" data-m8a-v48-info-class="fixed">驗證狀態：待補</span>
        <button type="button" data-m8a-v47-action="close-disclosure" data-m8a-v47-control-id="details-close" data-m8a-v48-info-class="control">Close</button>
      </div>
      <div class="m8a-v411-inspector__boundary-strip" data-m8a-v411-inspector-boundary-strip="true" data-m8a-v48-info-class="fixed" aria-label="Inspector boundary scope">
        <span data-m8a-v411-inspector-boundary-chip="scale">13-actor demo</span>
        <span data-m8a-v411-inspector-boundary-chip="endpoint">operator-family precision</span>
      </div>
      <div class="m8a-v411-inspector__tabs" data-m8a-v411-inspector-tabs="true" role="tablist" aria-label="Details inspector sections">
        <button type="button" id="m8a-v411-inspector-tab-decision" role="tab" data-m8a-v47-action="switch-inspector-tab" data-m8a-v411-inspector-tab="decision" aria-selected="true" aria-controls="m8a-v411-inspector-panel-decision" data-m8a-v48-info-class="control">Decision</button>
        <button type="button" id="m8a-v411-inspector-tab-metrics" role="tab" data-m8a-v47-action="switch-inspector-tab" data-m8a-v411-inspector-tab="metrics" aria-selected="false" aria-controls="m8a-v411-inspector-panel-metrics" data-m8a-v48-info-class="control">Metrics</button>
        <button type="button" id="m8a-v411-inspector-tab-evidence" role="tab" data-m8a-v47-action="switch-inspector-tab" data-m8a-v411-inspector-tab="evidence" aria-selected="false" aria-controls="m8a-v411-inspector-panel-evidence" data-m8a-v48-info-class="control">Evidence</button>
      </div>
      <div class="m8a-v47-product-ux__sheet-state">
        <span data-m8a-v48-info-class="fixed">Selected replay window</span>
        <strong data-m8a-v47-active-label="sheet" data-m8a-v48-info-class="dynamic"></strong>
        <small data-m8a-v48-state-ordinal="sheet" data-m8a-v48-info-class="dynamic">State 1 of 5</small>
        <small data-m8a-v47-time-label="replay-utc" data-m8a-v48-info-class="dynamic"></small>
        <small data-m8a-v47-time-label="simulated" data-m8a-v48-info-class="dynamic"></small>
      </div>
      <button type="button" class="m8a-v411-inspector__source-toggle" data-m8a-v47-action="toggle-source-provenance" data-m8a-v411-advanced-sources-toggle="true" data-m8a-v48-info-class="control" aria-expanded="false">Source provenance</button>
      <div class="m8a-v47-product-ux__inspector" data-m8a-v48-inspector-body="true">
        <p class="m8a-v410-inspector__lead" data-m8a-v410-inspector-lead="true" data-m8a-v48-info-class="fixed">Evidence for the selected replay window. The scene narrative and sequence rail remain primary.</p>
        <div class="m8a-v47-product-ux__inspector-primary m8a-v410-inspector__evidence-structure" data-m8a-v49-inspector-primary-body="true" data-m8a-v410-inspector-evidence-structure="true">
          <section id="m8a-v411-inspector-panel-decision" role="tabpanel" aria-labelledby="m8a-v411-inspector-tab-decision" class="m8a-v411-inspector__role m8a-v411-inspector__role--state" data-m8a-v411-inspector-role="state-evidence" data-m8a-v411-role-state="closed" data-m8a-v411-inspector-panel="decision" data-m8a-v49-inspector-primary="current-state">
            <span class="m8a-v410-inspector__group-label" data-m8a-v48-info-class="fixed">Decision · State Evidence</span>
            <strong data-m8a-v411-state-evidence-title="true" data-m8a-v48-info-class="dynamic"></strong>
            <p data-m8a-v49-inspector-current="true" data-m8a-v411-state-evidence-copy="true" data-m8a-v48-info-class="dynamic"></p>
            <div class="m8a-v411-inspector__module-list" data-m8a-v411-decision-modules="true">
              <p><strong data-m8a-v48-info-class="fixed">Now</strong><span data-m8a-v411-decision-now="true" data-m8a-v48-info-class="dynamic"></span></p>
              <p><strong data-m8a-v48-info-class="fixed">Why</strong><span data-m8a-v411-decision-why="true" data-m8a-v48-info-class="dynamic"></span></p>
              <p><strong data-m8a-v48-info-class="fixed">Next</strong><span data-m8a-v411-decision-next="true" data-m8a-v48-info-class="dynamic"></span></p>
              <p><strong data-m8a-v48-info-class="fixed">Watch</strong><span data-m8a-v411-decision-watch="true" data-m8a-v48-info-class="dynamic"></span></p>
            </div>
            <p class="m8a-v411-inspector__state-evidence-detail" data-m8a-v411-state-evidence-detail="true" data-m8a-v48-info-class="disclosure"></p>
          </section>

          <section id="m8a-v411-inspector-panel-metrics" role="tabpanel" aria-labelledby="m8a-v411-inspector-tab-metrics" class="m8a-v411-inspector__role" data-m8a-v411-inspector-panel="metrics" hidden>
            <span class="m8a-v410-inspector__group-label" data-m8a-v48-info-class="fixed">Metrics</span>
            <div class="m8a-v411-metrics" data-m8a-v411-metrics-structure="available-and-not-connected">
              <section class="m8a-v411-metrics__group" data-m8a-v411-metrics-available="true" aria-labelledby="m8a-v411-metrics-available-heading">
                <h3 id="m8a-v411-metrics-available-heading" data-m8a-v48-info-class="fixed">Available in this scene</h3>
                <div class="m8a-v411-metrics__grid">
                  <article class="m8a-v411-metrics__tile" data-m8a-v411-available-metric-tile="latency-class">
                    <strong class="m8a-v411-metrics__label" data-m8a-v48-info-class="fixed">Modeled latency class</strong>
                    <span class="m8a-v411-metrics__value" data-m8a-v411-metrics-available-value="latency-class" data-m8a-v48-info-class="dynamic"></span>
                    <span class="m8a-v411-metrics__unit" data-m8a-v411-metrics-available-unit="latency-class" data-m8a-v48-info-class="fixed"></span>
                    <p class="m8a-v411-metrics__detail" data-m8a-v411-metrics-available-detail="latency-class" data-m8a-v48-info-class="dynamic"></p>
                  </article>
                  <article class="m8a-v411-metrics__tile" data-m8a-v411-available-metric-tile="continuity-class">
                    <strong class="m8a-v411-metrics__label" data-m8a-v48-info-class="fixed">Modeled continuity class</strong>
                    <span class="m8a-v411-metrics__value" data-m8a-v411-metrics-available-value="continuity-class" data-m8a-v48-info-class="dynamic"></span>
                    <span class="m8a-v411-metrics__unit" data-m8a-v411-metrics-available-unit="continuity-class" data-m8a-v48-info-class="fixed"></span>
                    <p class="m8a-v411-metrics__detail" data-m8a-v411-metrics-available-detail="continuity-class" data-m8a-v48-info-class="dynamic"></p>
                  </article>
                  <article class="m8a-v411-metrics__tile" data-m8a-v411-available-metric-tile="handover-state">
                    <strong class="m8a-v411-metrics__label" data-m8a-v48-info-class="fixed">Modeled handover state</strong>
                    <span class="m8a-v411-metrics__value" data-m8a-v411-metrics-available-value="handover-state" data-m8a-v48-info-class="dynamic"></span>
                    <span class="m8a-v411-metrics__unit" data-m8a-v411-metrics-available-unit="handover-state" data-m8a-v48-info-class="fixed"></span>
                    <p class="m8a-v411-metrics__detail" data-m8a-v411-metrics-available-detail="handover-state" data-m8a-v48-info-class="dynamic"></p>
                  </article>
                  <article class="m8a-v411-metrics__tile" data-m8a-v411-available-metric-tile="replay-timing">
                    <strong class="m8a-v411-metrics__label" data-m8a-v48-info-class="fixed">Replay timing / countdown</strong>
                    <span class="m8a-v411-metrics__value" data-m8a-v411-metrics-available-value="replay-timing" data-m8a-v48-info-class="dynamic"></span>
                    <span class="m8a-v411-metrics__unit" data-m8a-v411-metrics-available-unit="replay-timing" data-m8a-v48-info-class="fixed"></span>
                    <p class="m8a-v411-metrics__detail" data-m8a-v411-metrics-available-detail="replay-timing" data-m8a-v48-info-class="dynamic"></p>
                  </article>
                </div>
              </section>
              <section class="m8a-v411-metrics__group" data-m8a-v411-metrics-not-connected="true" aria-labelledby="m8a-v411-metrics-not-connected-heading">
                <h3 id="m8a-v411-metrics-not-connected-heading" data-m8a-v48-info-class="fixed">Not connected in this scene</h3>
                <ol class="m8a-v411-metrics__grid m8a-v411-metrics__grid--disabled" data-m8a-v411-disabled-metric-list="true">
                  ${renderM8aV411DisabledMetricTiles()}
                </ol>
              </section>
            </div>
          </section>

          <section class="m8a-v411-inspector__role m8a-v411-inspector__role--truth" data-m8a-v411-inspector-role="truth-boundary" data-m8a-v411-role-state="closed" data-m8a-v411-state-evidence-truth-tail="true" data-m8a-v49-truth-boundary-details="true" data-m8a-v49-inspector-primary="boundary" data-m8a-v411-inspector-conv2-tail-of-state-evidence="true" aria-label="Truth boundary tail" hidden>
            <span class="m8a-v410-inspector__group-label" data-m8a-v48-info-class="fixed">Boundary · Truth Boundary</span>
            <strong data-m8a-v411-truth-boundary-title="true" data-m8a-v48-info-class="fixed">Truth boundary</strong>
            <div class="m8a-v411-inspector__module-list" data-m8a-v411-boundary-modules="true">
              <p data-m8a-v411-boundary-simulation="true">Simulation boundary: 13-actor demo, repo-owned projection, not measured truth.</p>
              <p data-m8a-v411-boundary-service="true">Service-layer boundary: modeled service handover, not native RF handover.</p>
              <p data-m8a-v411-boundary-endpoint="true">Endpoint boundary: operator-family precision, not site-level gateway claim.</p>
              <p data-m8a-v411-boundary-scale="true">Scale boundary: not >=500 LEO validation and not 24h hardware-GPU closeout.</p>
            </div>
            <div class="m8a-v47-product-ux__badges">
              ${renderTruthBadges()}
            </div>
            <ul data-m8a-v411-truth-boundary-lines="true">
              ${renderDisclosureLines()}
            </ul>
          </section>

          <section id="m8a-v411-inspector-panel-evidence" role="tabpanel" aria-labelledby="m8a-v411-inspector-tab-evidence" class="m8a-v411-inspector__role m8a-v411-inspector__role--sources" data-m8a-v411-inspector-role="sources" data-m8a-v411-role-state="closed" data-m8a-v411-inspector-panel="evidence" data-m8a-v411-sources-role="true" data-m8a-v49-inspector-primary="sources" tabindex="-1" hidden>
            <span class="m8a-v410-inspector__group-label" data-m8a-v48-info-class="fixed">Evidence</span>
            <strong data-m8a-v411-sources-title="true" data-m8a-v48-info-class="fixed">Evidence summary</strong>
            ${renderItriAcceptanceLayer()}
            <section class="m8a-v411-requirement-gap" data-itri-requirement-gap-surface="true" data-itri-requirement-gap-version="${M8A_V4_CUSTOMER_REQUIREMENT_GAP_SURFACE_VERSION}" aria-label="customer requirement route status">
              <div class="m8a-v411-requirement-gap__header">
                <strong data-m8a-v48-info-class="fixed">customer status groups</strong>
                <span data-itri-requirement-gap-demo-polish="${M8A_V4_CUSTOMER_DEMO_POLISH_DISPOSITION}" data-m8a-v48-info-class="fixed">Demo polish: no closure claim</span>
              </div>
              <ol class="m8a-v411-requirement-gap__list">
                ${renderItriRequirementGapGroups()}
              </ol>
              <section class="m8a-v411-f16-export" data-itri-f16-export-surface="true" data-itri-f16-export-version="${M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION}" data-itri-f16-export-schema-version="${M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION}" data-itri-f16-export-disposition="${M8A_V4_CUSTOMER_F16_EXPORT_DISPOSITION}" aria-labelledby="m8a-v411-f16-export-heading">
                <div class="m8a-v411-f16-export__header">
                  <span data-m8a-v48-info-class="fixed">F-16</span>
                  <strong id="m8a-v411-f16-export-heading" data-m8a-v48-info-class="fixed">Bounded Route Export</strong>
                  <small data-itri-f16-export-truth-label="true" data-m8a-v48-info-class="fixed">JSON only · not external measurement/report truth</small>
                </div>
                <p class="m8a-v411-f16-export__copy" data-itri-f16-export-label="true" data-m8a-v48-info-class="disclosure">Exports route-owned bounded state only: scenario, endpoint pair, actor counts, modeled window, requirement groups, F-09 class disposition, link-flow cue metadata, provenance, and non-claims.</p>
                <div class="m8a-v411-f16-export__actions">
                  <button type="button" class="m8a-v411-f16-export__button" data-m8a-v47-action="export-f16-bounded-route-json" data-itri-f16-export-action="true" data-m8a-v48-info-class="control">Export bounded JSON</button>
                  <span class="m8a-v411-f16-export__status" data-itri-f16-export-status="true" data-m8a-v48-info-class="dynamic" role="status" aria-live="polite">Ready: bounded route export only.</span>
                </div>
                <div data-itri-f16-export-non-claims="true" hidden>
                  ${renderF16ExplicitNonClaimChips()}
                </div>
              </section>
            </section>
            <section class="m8a-v411-policy-rule" data-itri-policy-rule-controls-surface="true" data-itri-policy-rule-controls-version="${M8A_V4_CUSTOMER_POLICY_RULE_CONTROLS_VERSION}" data-itri-policy-rule-controls-disposition="${M8A_V4_CUSTOMER_POLICY_RULE_DISPOSITION}" data-itri-policy-rule-truth-boundary="${M8A_V4_CUSTOMER_POLICY_RULE_TRUTH_BOUNDARY}" aria-labelledby="m8a-v411-policy-rule-heading">
              <div class="m8a-v411-policy-rule__header">
                <span data-m8a-v48-info-class="fixed">F-10/F-11</span>
                <strong id="m8a-v411-policy-rule-heading" data-m8a-v48-info-class="fixed">Modeled Replay Presets</strong>
                <small data-itri-policy-rule-truth-label="true" data-m8a-v48-info-class="fixed">Preset-only · not live control</small>
              </div>
              <p class="m8a-v411-policy-rule__copy" data-itri-policy-rule-copy="true" data-m8a-v48-info-class="disclosure">Route-local modeled replay preset controls. They update preview state and telemetry only; no backend side effect, rule engine, or measured decision truth.</p>
              <div class="m8a-v411-policy-rule__controls">
                <label class="m8a-v411-policy-rule__field" for="m8a-v411-f10-policy-preset">
                  <span data-m8a-v48-info-class="fixed">F-10 policy preset</span>
                  <select id="m8a-v411-f10-policy-preset" data-itri-f10-policy-selector="true" data-itri-f10-policy-preset-mode="${M8A_V4_CUSTOMER_F10_POLICY_PRESET_MODE}" data-m8a-v48-info-class="control" aria-label="F-10 modeled replay policy preset selector. Preset only; not live control.">
                    ${renderItriF10PolicyPresetOptions()}
                  </select>
                </label>
                <label class="m8a-v411-policy-rule__field" for="m8a-v411-f11-rule-preset">
                  <span data-m8a-v48-info-class="fixed">F-11 rule preset</span>
                  <select id="m8a-v411-f11-rule-preset" data-itri-f11-rule-preset="true" data-itri-f11-rule-preset-mode="${M8A_V4_CUSTOMER_F11_RULE_PRESET_MODE}" data-m8a-v48-info-class="control" aria-label="F-11 bounded replay rule and parameter preset. Preset only; not live control.">
                    ${renderItriF11RulePresetOptions()}
                  </select>
                </label>
              </div>
              <div class="m8a-v411-policy-rule__preview" data-itri-policy-rule-preview="true">
                <p data-itri-f10-policy-preview="true" data-m8a-v48-info-class="dynamic"></p>
                <p data-itri-f11-rule-preview="true" data-m8a-v48-info-class="dynamic"></p>
                <ul data-itri-f11-rule-parameter-list="true">
                  ${renderItriF11RuleParameterChips(resolveItriF11RulePreset(M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID))}
                </ul>
              </div>
              <span class="m8a-v411-policy-rule__status" data-itri-policy-rule-status="true" data-m8a-v48-info-class="dynamic" role="status" aria-live="polite">Modeled replay presets ready; preset-only, not live control.</span>
            </section>
            <section class="m8a-v411-f09-rate" data-itri-f09-rate-surface="true" data-itri-f09-rate-version="${M8A_V4_CUSTOMER_F09_RATE_SURFACE_VERSION}" aria-labelledby="m8a-v411-f09-rate-heading">
              <div class="m8a-v411-f09-rate__header">
                <span data-m8a-v48-info-class="fixed">F-09</span>
                <strong id="m8a-v411-f09-rate-heading" data-m8a-v48-info-class="fixed">Communication Rate</strong>
                <small data-itri-f09-rate-truth-label="true" data-m8a-v48-info-class="fixed">Modeled, not measured.</small>
              </div>
              <div class="m8a-v411-f09-rate__current" data-itri-f09-rate-current="true" tabindex="0" aria-describedby="m8a-v411-f09-rate-description">
                <span data-m8a-v48-info-class="fixed">Modeled network-speed class</span>
                <strong data-itri-f09-rate-current-class="true" data-m8a-v48-info-class="dynamic"></strong>
                <em data-itri-f09-rate-current-bucket="true" data-m8a-v48-info-class="dynamic"></em>
                <small id="m8a-v411-f09-rate-description" data-itri-f09-rate-description="true" data-m8a-v48-info-class="disclosure"></small>
              </div>
              <details class="m8a-v411-f09-rate__fallback" data-itri-f09-rate-fallback="true">
                <summary data-m8a-v48-info-class="disclosure">Class table fallback</summary>
                <table data-itri-f09-rate-table="true">
                  <caption>Route-local F-09 modeled communication-rate class fallback</caption>
                  <thead>
                    <tr>
                      <th scope="col">Window</th>
                      <th scope="col">State</th>
                      <th scope="col">Orbit</th>
                      <th scope="col">Class</th>
                      <th scope="col">Bucket</th>
                      <th scope="col">Source</th>
                      <th scope="col">Truth</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderF09RateWindowRows()}
                  </tbody>
                </table>
              </details>
            </section>
            <div class="m8a-v411-evidence-summary" data-m8a-v411-evidence-summary="true">
              <p data-m8a-v411-evidence-summary-line="tle" data-m8a-v411-evidence-tle-summary="true" data-m8a-v48-info-class="dynamic">TLE: CelesTrak NORAD GP · 13 actors · fetched 2026-04-26</p>
              <p data-m8a-v411-evidence-summary-line="r2" data-m8a-v411-evidence-r2-summary="true" data-m8a-v48-info-class="dynamic">R2: 5 candidate endpoints (read-only catalog)</p>
            </div>
            <details class="m8a-v411-evidence-archive" data-m8a-v411-evidence-archive="true">
              <summary data-m8a-v48-info-class="disclosure">Archive</summary>
              <p data-m8a-v411-sources-filter-summary="true" data-m8a-v48-info-class="dynamic"></p>
              <div class="m8a-v411-sources__section" data-m8a-v411-sources-tle-section="true">
                <span class="m8a-v411-sources__label" data-m8a-v48-info-class="fixed">Satellite TLE provenance</span>
                <div class="m8a-v411-sources__rows" data-m8a-v411-sources-tle-rows="true"></div>
              </div>
              <div class="m8a-v411-sources__section" data-m8a-v411-sources-ground-section="true">
                <span class="m8a-v411-sources__label" data-m8a-v48-info-class="fixed">Ground-station evidence URLs</span>
                <div data-m8a-v411-sources-ground-rows="true"></div>
              </div>
              <div class="m8a-v411-sources__section" data-m8a-v411-sources-r2-section="true">
                <span class="m8a-v411-sources__label" data-m8a-v48-info-class="fixed">R2 read-only candidate catalog</span>
                <div class="m8a-v411-sources__rows" data-m8a-v411-sources-r2-rows="true"></div>
              </div>
            </details>
          </section>
        </div>
        <details class="m8a-v47-product-ux__evidence" data-m8a-v49-debug-evidence="true">
          <summary data-m8a-v48-info-class="disclosure">Implementation evidence</summary>
          <p data-m8a-v48-info-class="disclosure">Raw ids, selected cue ids, anchor metadata, and full candidate/fallback arrays. This evidence supports tests and implementation review; it is not the primary product explanation.</p>
          <dl class="m8a-v47-product-ux__actor-list">
            <div>
              <dt data-m8a-v48-info-class="fixed">Representative actor id</dt>
              <dd data-m8a-v48-review-representative="true" data-m8a-v49-debug-representative="true" data-m8a-v48-info-class="dynamic"></dd>
            </div>
            <div>
              <dt data-m8a-v48-info-class="fixed">Candidate actor ids</dt>
              <dd data-m8a-v48-review-candidates="true" data-m8a-v49-debug-candidates="true" data-m8a-v48-info-class="dynamic"></dd>
            </div>
            <div>
              <dt data-m8a-v48-info-class="fixed">Fallback actor ids</dt>
              <dd data-m8a-v48-review-fallbacks="true" data-m8a-v49-debug-fallbacks="true" data-m8a-v48-info-class="dynamic"></dd>
            </div>
            <div>
              <dt data-m8a-v48-info-class="fixed">Scene cue ids</dt>
              <dd data-m8a-v48-review-cue="true" data-m8a-v49-debug-scene-cue="true" data-m8a-v48-info-class="dynamic"></dd>
            </div>
          </dl>
        </details>
      </div>
    </aside>
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

function createM8aV411SourceLink(url: string, label: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;
  link.dataset.m8aV411SourcesUrl = url;
  link.dataset.m8aV48InfoClass = "disclosure";
  return link;
}

function renderM8aV411SourcesTleRows(
  container: HTMLElement,
  filter: M8aV411SourcesFilter
): number {
  const actors = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.filter(
    (actor) => !filter.orbitClass || actor.orbitClass === filter.orbitClass
  );

  container.replaceChildren(
    ...actors.map((actor) => {
      const lineage = actor.sourceLineage[0];

      if (!lineage?.url) {
        throw new Error(`Missing Slice 5 TLE source URL for ${actor.actorId}.`);
      }

      const row = document.createElement("div");
      const orbitToken = resolveM8aV411OrbitToken(actor.orbitClass);
      row.className = "m8a-v411-sources__row";
      row.dataset.m8aV411SourcesTleRow = "true";
      row.dataset.m8aV411SourcesActorId = actor.actorId;
      row.dataset.m8aV411SourcesOrbitClass = orbitToken;
      row.dataset.m8aV411SourcesRecordName = lineage.sourceRecordName;
      row.dataset.m8aV411SourcesFetchedAtUtc = lineage.fetchedAtUtc;
      row.dataset.m8aV411SourcesUrl = lineage.url;
      row.append(
        `${resolveM8aV411ActorOperatorFamily(actor)} · ${orbitToken} · `
      );
      row.append(
        createM8aV411SourceLink(lineage.url, lineage.sourceRecordName)
      );
      row.append(` · fetched ${lineage.fetchedAtUtc}`);
      return row;
    })
  );

  return actors.length;
}

function renderM8aV411GroundSourceRows(
  container: HTMLElement,
  filter: M8aV411SourcesFilter
): { endpointCount: number; rowCount: number } {
  const endpoints = M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.filter(
    (endpoint) => !filter.endpointId || endpoint.endpointId === filter.endpointId
  );
  let rowCount = 0;

  container.replaceChildren(
    ...endpoints.map((endpoint) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const rows = document.createElement("div");
      const sourcesById = new Map(
        endpoint.sourceLineage.map((source) => [source.sourceRefId, source])
      );

      details.className = "m8a-v411-sources__ground";
      details.open = true;
      details.dataset.m8aV411SourcesGroundStation = "true";
      details.dataset.m8aV411SourcesEndpointId = endpoint.endpointId;
      summary.textContent = resolveM8aV411EndpointLabel(endpoint);
      summary.dataset.m8aV48InfoClass = "fixed";
      rows.className = "m8a-v411-sources__rows";

      for (const chip of endpoint.orbitEvidenceChips) {
        if (filter.orbitClass && chip.orbitClass !== filter.orbitClass) {
          continue;
        }

        const orbitSources = chip.sourceRefs
          .map((sourceRefId) => sourcesById.get(sourceRefId))
          .filter((source) => source?.url);

        if (orbitSources.length === 0) {
          throw new Error(
            `Missing Slice 5 evidence URL for ${endpoint.endpointId} ${chip.orbitClass}.`
          );
        }

        for (const source of orbitSources) {
          if (!source?.url) {
            continue;
          }

          const row = document.createElement("div");
          const orbitToken = resolveM8aV411OrbitToken(chip.orbitClass);
          const level = resolveM8aV411SourceLevel(source.sourceRefId);

          row.className = "m8a-v411-sources__row";
          row.dataset.m8aV411SourcesGroundEvidenceRow = "true";
          row.dataset.m8aV411SourcesEndpointId = endpoint.endpointId;
          row.dataset.m8aV411SourcesOrbitClass = orbitToken;
          row.dataset.m8aV411SourcesSourceRefId = source.sourceRefId;
          row.dataset.m8aV411SourcesSourceLevel = level;
          row.dataset.m8aV411SourcesUrl = source.url;
          row.append(`${orbitToken} ${chip.grade} · `);
          row.append(createM8aV411SourceLink(source.url, source.url));
          row.append(` · ${level}`);
          rows.append(row);
          rowCount += 1;
        }
      }

      details.append(summary, rows);
      return details;
    })
  );

  return {
    endpointCount: endpoints.length,
    rowCount
  };
}

function renderM8aV411R2ReadOnlyRows(container: HTMLElement): number {
  container.replaceChildren(
    ...M8A_V411_R2_READ_ONLY_CANDIDATES.map((candidate) => {
      const row = document.createElement("div");

      row.className = "m8a-v411-sources__row";
      row.dataset.m8aV411SourcesR2Row = "true";
      row.dataset.m8aV411SourcesR2CandidateId = candidate.candidateId;
      row.dataset.m8aV411SourcesR2Status = candidate.catalogStatus;
      row.dataset.m8aV411SourcesR2ReadOnly = "true";
      row.textContent = [
        candidate.stationName,
        candidate.blockedReason,
        "blocked",
        candidate.readOnlyBoundary
      ].join(" · ");
      return row;
    })
  );

  return M8A_V411_R2_READ_ONLY_CANDIDATES.length;
}

function resolveM8aV411SourcesFilterSummary(
  filter: M8aV411SourcesFilter
): string {
  const endpoint = filter.endpointId
    ? M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.find(
        (candidate) => candidate.endpointId === filter.endpointId
      )
    : undefined;
  const parts = [
    endpoint ? resolveM8aV411EndpointLabel(endpoint) : "",
    filter.orbitClass ? `${resolveM8aV411OrbitToken(filter.orbitClass)} evidence` : ""
  ].filter(Boolean);

  if (parts.length === 0) {
    return "All repo-owned projection sources.";
  }

  return `Filter: ${parts.join(" · ")}`;
}

function renderM8aV411SourcesRole(
  root: HTMLElement,
  filter: M8aV411SourcesFilter
): {
  tleRowCount: number;
  groundStationCount: number;
  groundEvidenceRowCount: number;
  r2CandidateCount: number;
} {
  const role = getProductUxElement(
    root,
    "[data-m8a-v411-inspector-role='sources']"
  );
  const filterSummary = getProductUxElement(
    role,
    "[data-m8a-v411-sources-filter-summary='true']"
  );
  const tleRows = getProductUxElement(
    role,
    "[data-m8a-v411-sources-tle-rows='true']"
  );
  const groundRows = getProductUxElement(
    role,
    "[data-m8a-v411-sources-ground-rows='true']"
  );
  const r2Rows = getProductUxElement(
    role,
    "[data-m8a-v411-sources-r2-rows='true']"
  );

  filterSummary.textContent = resolveM8aV411SourcesFilterSummary(filter);

  const tleRowCount = renderM8aV411SourcesTleRows(tleRows, filter);
  const groundStats = renderM8aV411GroundSourceRows(groundRows, filter);
  const r2CandidateCount = renderM8aV411R2ReadOnlyRows(r2Rows);

  role.dataset.m8aV411SourcesRoleVersion = M8A_V411_SOURCES_ROLE_VERSION;
  role.dataset.m8aV411SourcesFilter = JSON.stringify(filter);
  role.dataset.m8aV411SourcesTleRowCount = String(tleRowCount);
  role.dataset.m8aV411SourcesGroundStationCount = String(
    groundStats.endpointCount
  );
  role.dataset.m8aV411SourcesGroundEvidenceRowCount = String(
    groundStats.rowCount
  );
  role.dataset.m8aV411SourcesR2CandidateCount = String(r2CandidateCount);
  role.dataset.m8aV411SourcesR2ReadOnlyBoundary = M8A_V411_R2_READ_ONLY_LABEL;

  return {
    tleRowCount,
    groundStationCount: groundStats.endpointCount,
    groundEvidenceRowCount: groundStats.rowCount,
    r2CandidateCount
  };
}

function ensureV410ProductUxStructureReady(root: HTMLElement): void {
  if (
    root.dataset.m8aV410ProductUxStructureVersion ===
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION
  ) {
    return;
  }

  // Conv 3: compact-line was on Truth button (now removed); omit from required check
  const hasRequiredStructure = Boolean(
    root.querySelector("[data-m8a-v410-scene-narrative='true']") &&
      root.querySelector("[data-m8a-v49-scene-near-meaning]") &&
      root.querySelector("[data-m8a-v49-scene-near-cue='true']") &&
      root.querySelector("[data-m8a-v410-next-line='true']") &&
      root.querySelector("[data-m8a-v49-scene-near-fallback]") &&
      root.querySelector("[data-m8a-v410-sequence-rail='true']") &&
      root.querySelector("[data-m8a-v410-sequence-active-summary='true']") &&
      root.querySelector("[data-m8a-v410-sequence-next-summary='true']") &&
      root.querySelector("[data-m8a-v410-boundary-surface='true']") &&
      root.querySelector("[data-m8a-v410-inspector-evidence-structure='true']") &&
      root.querySelector("[data-itri-demo-l2-acceptance-layer='true']") &&
      root.querySelector("[data-itri-requirement-gap-surface='true']") &&
      root.querySelector("[data-itri-policy-rule-controls-surface='true']") &&
      root.querySelector("[data-itri-f09-rate-surface='true']") &&
      root.querySelector("[data-itri-f16-export-surface='true']")
  );

  if (hasRequiredStructure) {
    return;
  }

  delete root.dataset.m8aV471StableControls;
  delete root.dataset.m8aV410ProductUxStructureVersion;
  ensureProductUxStructure(root);
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

function setProductUxHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
  element.setAttribute("aria-hidden", hidden ? "true" : "false");
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

function rectFitsViewport(rect: M8aV48SceneAnchorProtectionRect): boolean {
  return (
    rect.left >= 0 &&
    rect.top >= 0 &&
    rect.right <= window.innerWidth &&
    rect.bottom <= window.innerHeight
  );
}

function placeTransitionEventAwayFromSelectedCue(
  transitionEvent: HTMLElement,
  placement: M8aV48SceneAnchorPlacement,
  root: HTMLElement
): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const gap = 16;
  const width = Math.min(340, Math.max(250, viewportWidth - gap * 2));
  const strip = root.querySelector<HTMLElement>(
    "[data-m8a-v47-control-strip='true']"
  );
  const stripRect = strip?.getBoundingClientRect();

  transitionEvent.style.width = `${width}px`;

  const measuredRect = transitionEvent.getBoundingClientRect();
  const height = Math.max(56, measuredRect.height || 64);
  const selectedCueRect =
    placement.anchorStatus === "geometry-reliable"
      ? placement.protectionRect
      : null;
  const topBelowStrip = stripRect ? stripRect.bottom + 8 : gap + 96;
  const candidates = [
    {
      placement: "below-strip-right",
      left: viewportWidth - width - gap,
      top: topBelowStrip
    },
    {
      placement: "upper-left",
      left: gap,
      top: gap + 76
    },
    {
      placement: "mid-left",
      left: gap,
      top: Math.min(
        Math.max(topBelowStrip + 72, gap),
        viewportHeight - height - 96
      )
    }
  ];
  const selected =
    candidates.find((candidate) => {
      const candidateRect = buildRect(
        candidate.left,
        candidate.top,
        width,
        height
      );

      return (
        candidateRect.left >= gap &&
        candidateRect.right <= viewportWidth - gap &&
        candidateRect.top >= gap &&
        candidateRect.bottom <= viewportHeight - gap &&
        (!selectedCueRect || !rectsIntersect(candidateRect, selectedCueRect))
      );
    }) ?? candidates[0];

  transitionEvent.style.left = `${selected.left.toFixed(1)}px`;
  transitionEvent.style.top = `${selected.top.toFixed(1)}px`;
  transitionEvent.dataset.m8aV49TransitionPlacement = selected.placement;
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

function resetInspectorSheetPlacement(sheet: HTMLElement): void {
  sheet.style.left = "";
  sheet.style.top = "";
  sheet.style.right = "";
  sheet.style.bottom = "";
  sheet.style.width = "";
  delete sheet.dataset.m8aV48InspectorPlacement;
}

function placeInspectorSheetAwayFromSelectedCue(
  sheet: HTMLElement,
  placement: M8aV48SceneAnchorPlacement,
  sheetOpen: boolean
): void {
  resetInspectorSheetPlacement(sheet);

  if (!sheetOpen || placement.anchorStatus !== "geometry-reliable") {
    return;
  }

  const rect = sheet.getBoundingClientRect();
  const width = Math.min(rect.width, window.innerWidth - 24);
  const height = Math.min(
    Math.max(rect.height, sheet.offsetHeight, sheet.scrollHeight),
    window.innerHeight - 24
  );
  const gap = 18;
  const topClearance =
    placement.protectionRect.top < window.innerHeight * 0.5 ? 152 : gap;
  const bottom = Math.max(gap, window.innerHeight - gap - height);
  const right = Math.max(gap, window.innerWidth - gap - width);
  const candidates = [
    {
      placement: "default",
      rect: buildRect(rect.left, rect.top, width, height)
    },
    {
      placement: "bottom-left",
      rect: buildRect(gap, bottom, width, height)
    },
    {
      placement: "top-right",
      rect: buildRect(right, topClearance, width, height)
    },
    {
      placement: "top-left",
      rect: buildRect(gap, topClearance, width, height)
    }
  ];
  const viewportCandidates = candidates.filter((candidate) =>
    rectFitsViewport(candidate.rect)
  );
  const selected =
    viewportCandidates.find((candidate) => {
      return !rectsIntersect(candidate.rect, placement.protectionRect);
    }) ??
    viewportCandidates[0] ??
    candidates.find((candidate) => {
      return !rectsIntersect(candidate.rect, placement.protectionRect);
    }) ??
    candidates[0];

  sheet.style.left = `${selected.rect.left.toFixed(1)}px`;
  sheet.style.top = `${selected.rect.top.toFixed(1)}px`;
  sheet.style.right = "auto";
  sheet.style.bottom = "auto";
  sheet.style.width = `${selected.rect.width.toFixed(1)}px`;
  sheet.dataset.m8aV48InspectorPlacement = selected.placement;
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
  visualTokenController: M8aV411VisualTokenController
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
  const boundarySurfaceOpen = false;
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
  const truthBoundaryLines = resolveM8aV411TruthBoundaryLines(
    productUx.activeWindowId,
    productUx.disclosure.lines
  );
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
  const sourcesStats = renderM8aV411SourcesRole(
    root,
    productUx.disclosure.sourcesFilter
  );
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
  root.dataset.m8aV411SourcesTleRowCount = String(sourcesStats.tleRowCount);
  root.dataset.m8aV411SourcesGroundStationCount = String(
    sourcesStats.groundStationCount
  );
  root.dataset.m8aV411SourcesR2CandidateCount = String(
    sourcesStats.r2CandidateCount
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
    "[data-m8a-v410-scene-title='true']",
    microCueCopy
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
    "[data-m8a-v49-scene-near-orbit-token]",
    sceneNear.heading
  );
  updateProductUxText(
    root,
    "[data-m8a-v49-scene-near-meaning]",
    sceneNear.stateMeaning
  );
  updateProductUxText(
    root,
    "[data-m8a-v47-annotation-context]",
    sceneNear.watchCueLabel
  );
  updateProductUxText(
    root,
    "[data-m8a-v410-next-line='true']",
    comprehension.activeWindowCopy.nextLine
  );
  updateProductUxText(
    root,
    "[data-m8a-v49-scene-near-fallback]",
    sceneNear.fallbackText
  );
  updateProductUxText(
    root,
    "[data-m8a-v410-sequence-active-summary='true']",
    `${sequenceRail.activeOrdinalLabel}: ${sequenceRail.activeProductLabel}`
  );
  updateProductUxText(
    root,
    "[data-m8a-v410-sequence-next-summary='true']",
    sequenceRail.nextWindowId === "leo-acquisition-context" &&
      sequenceRail.activeWindowId === "geo-continuity-guard"
      ? `Restart: ${sequenceRail.nextOrdinalLabel} ${sequenceRail.nextProductLabel}`
      : `Next: ${sequenceRail.nextOrdinalLabel} ${sequenceRail.nextProductLabel}`
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
  updateProductUxText(
    root,
    "[data-m8a-v411-top-strip-slot='scope']",
    `Scope: ${state.actorCount}-actor demo · LEO/MEO/GEO (${state.orbitActorCounts.leo}/${state.orbitActorCounts.meo}/${state.orbitActorCounts.geo})`
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-top-strip-slot='replay']",
    `Time: ${productUx.playback.simulatedReplayTimeDisplay} · replay · ${activeMultiplier}x`
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-top-strip-slot='precision']",
    "Precision: operator-family precision"
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-top-strip-slot='boundary']",
    "Boundary: repo-owned projection · not measured truth"
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
  const f16Surface = getProductUxElement(
    root,
    "[data-itri-f16-export-surface='true']"
  );
  f16Surface.dataset.itriF16ExportVersion = f16ExportSurface.version;
  f16Surface.dataset.itriF16ExportSchemaVersion =
    f16ExportSurface.schemaVersion;
  f16Surface.dataset.itriF16ExportDisposition =
    f16ExportSurface.disposition;
  f16Surface.dataset.itriF16ExternalTruthDisposition =
    f16ExportSurface.externalTruthDisposition;
  f16Surface.dataset.itriF16ExportArtifactTruth =
    f16ExportSurface.artifactTruth;
  f16Surface.dataset.itriF16ExportFormat = f16ExportSurface.exportFormat;
  f16Surface.dataset.itriF16RouteOwnedStateOnly = String(
    f16ExportSurface.routeOwnedStateOnly
  );
  f16Surface.dataset.itriF16MeasuredValuesIncluded = String(
    f16ExportSurface.measuredValuesIncluded
  );
  f16Surface.dataset.itriF16ExternalReportTruthClaimed = String(
    f16ExportSurface.externalReportSystemTruthClaimed
  );
  f16Surface.dataset.itriF16LastStatus = f16ExportSurface.lastStatus;
  f16Surface.dataset.itriF16LastGeneratedAtUtc =
    f16ExportSurface.lastGeneratedAtUtc;
  f16Surface.dataset.itriF16LastFilename = f16ExportSurface.lastFilename;
  const f16Button = getProductUxElement(
    root,
    "[data-itri-f16-export-action='true']"
  );
  f16Button.setAttribute(
    "aria-label",
    "Export bounded route JSON. Not external measurement/report truth."
  );
  const f16Status = getProductUxElement(
    root,
    "[data-itri-f16-export-status='true']"
  );
  f16Status.textContent =
    f16ExportSurface.lastStatus === "exported"
      ? `Exported bounded JSON: ${f16ExportSurface.lastGeneratedAtUtc}`
      : f16ExportSurface.lastStatus === "failed"
        ? `Export failed: ${f16ExportSurface.lastErrorMessage}`
        : "Ready: bounded route export only.";
  const policyRuleSurface = getProductUxElement(
    root,
    "[data-itri-policy-rule-controls-surface='true']"
  );
  policyRuleSurface.dataset.itriPolicyRuleControlsVersion =
    policyRuleControls.version;
  policyRuleSurface.dataset.itriPolicyRuleControlsDisposition =
    policyRuleControls.disposition;
  policyRuleSurface.dataset.itriPolicyRuleExternalTruthDisposition =
    policyRuleControls.externalTruthDisposition;
  policyRuleSurface.dataset.itriPolicyRuleTruthBoundary =
    policyRuleControls.truthBoundary;
  policyRuleSurface.dataset.itriPolicyRuleExportAdjacentTruth =
    policyRuleControls.exportAdjacentTruth;
  policyRuleSurface.dataset.itriF10PolicyPresetId =
    policyRuleControls.activePolicyPreset.presetId;
  policyRuleSurface.dataset.itriF10PolicyPresetMode =
    policyRuleControls.policyPresetMode;
  policyRuleSurface.dataset.itriF11RulePresetId =
    policyRuleControls.activeRulePreset.presetId;
  policyRuleSurface.dataset.itriF11RulePresetMode =
    policyRuleControls.rulePresetMode;
  policyRuleSurface.dataset.itriPolicyRuleRouteOwnedStateOnly = String(
    policyRuleControls.routeOwnedStateOnly
  );
  policyRuleSurface.dataset.itriPolicyRuleLiveControlClaimed = String(
    policyRuleControls.liveControlClaimed
  );
  policyRuleSurface.dataset.itriPolicyRuleArbitraryRuleEditorClaimed = String(
    policyRuleControls.arbitraryRuleEditorClaimed
  );
  policyRuleSurface.dataset.itriPolicyRuleMeasuredDecisionTruthClaimed = String(
    policyRuleControls.measuredDecisionTruthClaimed
  );
  const policySelect = getProductUxElement(
    root,
    "[data-itri-f10-policy-selector='true']"
  );
  if (policySelect instanceof HTMLSelectElement) {
    policySelect.value = policyRuleControls.activePolicyPreset.presetId;
    policySelect.dataset.itriF10PolicyPresetId =
      policyRuleControls.activePolicyPreset.presetId;
    policySelect.dataset.itriF10PolicyPresetMode =
      policyRuleControls.policyPresetMode;
    policySelect.setAttribute(
      "aria-label",
      `F-10 modeled replay policy preset selector. Active preset: ${policyRuleControls.activePolicyPreset.label}. Preset only; not live control.`
    );
  }
  const ruleSelect = getProductUxElement(
    root,
    "[data-itri-f11-rule-preset='true']"
  );
  if (ruleSelect instanceof HTMLSelectElement) {
    ruleSelect.value = policyRuleControls.activeRulePreset.presetId;
    ruleSelect.dataset.itriF11RulePresetId =
      policyRuleControls.activeRulePreset.presetId;
    ruleSelect.dataset.itriF11RulePresetMode =
      policyRuleControls.rulePresetMode;
    ruleSelect.setAttribute(
      "aria-label",
      `F-11 bounded replay rule and parameter preset. Active preset: ${policyRuleControls.activeRulePreset.label}. Preset only; not live control.`
    );
  }
  updateProductUxText(
    root,
    "[data-itri-f10-policy-preview='true']",
    policyRuleControls.activePolicyPreset.preview
  );
  updateProductUxText(
    root,
    "[data-itri-f11-rule-preview='true']",
    policyRuleControls.activeRulePreset.preview
  );
  const ruleParameterList = getProductUxElement(
    root,
    "[data-itri-f11-rule-parameter-list='true']"
  );
  ruleParameterList.innerHTML = renderItriF11RuleParameterChips(
    policyRuleControls.activeRulePreset
  );
  const policyRuleStatus = getProductUxElement(
    root,
    "[data-itri-policy-rule-status='true']"
  );
  policyRuleStatus.textContent =
    `Modeled replay presets: F-10 ${policyRuleControls.activePolicyPreset.label}; F-11 ${policyRuleControls.activeRulePreset.label}. Preset-only, not live control.`;
  const f09Surface = getProductUxElement(
    root,
    "[data-itri-f09-rate-surface='true']"
  );
  f09Surface.dataset.itriF09RateSurfaceVersion = f09RateSurface.version;
  f09Surface.dataset.itriF09RateDisposition = f09RateSurface.disposition;
  f09Surface.dataset.itriF09ExternalTruthDisposition =
    f09RateSurface.externalTruthDisposition;
  f09Surface.dataset.itriF09RateCurrentWindowId =
    f09RateSurface.currentWindowId;
  f09Surface.dataset.itriF09RateCurrentClass =
    f09RateSurface.currentNetworkSpeedClass;
  f09Surface.dataset.itriF09RateCurrentBucket =
    f09RateSurface.currentBucketLabel;
  f09Surface.dataset.itriF09RateProvenance = f09RateSurface.provenance;
  f09Surface.dataset.itriF09RateMetricTruth = f09RateSurface.metricTruth;
  f09Surface.dataset.itriF09MeasuredThroughputClaimed = String(
    f09RateSurface.measuredThroughputClaimed
  );
  updateProductUxText(
    root,
    "[data-itri-f09-rate-current-class='true']",
    f09RateSurface.currentClassLabel
  );
  updateProductUxText(
    root,
    "[data-itri-f09-rate-current-bucket='true']",
    f09RateSurface.currentBucketLabel
  );
  updateProductUxText(
    root,
    "[data-itri-f09-rate-description='true']",
    `${f09RateSurface.currentReviewLabel}. Source: ${f09RateSurface.provenance}. Truth: ${f09RateSurface.metricTruth}.`
  );
  const f09Current = getProductUxElement(
    root,
    "[data-itri-f09-rate-current='true']"
  );
  f09Current.setAttribute(
    "aria-label",
    `Communication rate. Modeled network-speed class: ${f09RateSurface.currentClassLabel}. Source: ${f09RateSurface.provenance}. Window: ${resolveTimelineLabel(
      f09RateSurface.currentWindowId
    )}. Modeled, not measured.`
  );
  for (const row of root.querySelectorAll<HTMLElement>(
    "[data-itri-f09-rate-row='true']"
  )) {
    const isActive =
      row.dataset.itriF09RateWindowId === f09RateSurface.currentWindowId;
    row.dataset.itriF09RateActive = String(isActive);
  }
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

  const annotation = getProductUxElement(
    root,
    "[data-m8a-v47-scene-annotation='true']"
  );
  annotation.dataset.m8aV47WindowId = productUx.activeWindowId;
  annotation.dataset.m8aV49SceneNearMode = sceneNear.mode;
  annotation.dataset.m8aV49SceneNearMeaningVisible = String(
    sceneNear.meaningVisible
  );
  annotation.dataset.m8aV49SceneNearCueVisible = String(sceneNear.cueVisible);
  annotation.dataset.m8aV49SceneNearFallbackVisible = String(
    sceneNear.fallbackVisible
  );
  annotation.dataset.m8aV49SceneNearMeaningText = sceneNear.stateMeaning;
  annotation.dataset.m8aV49SceneNearCueText = sceneNear.watchCueLabel;
  annotation.dataset.m8aV410FirstReadLine = sceneNear.stateMeaning;
  annotation.dataset.m8aV410WatchCueLine = sceneNear.watchCueLabel;
  annotation.dataset.m8aV410NextLine = comprehension.activeWindowCopy.nextLine;
  annotation.dataset.m8aV49SceneNearFallbackText = sceneNear.fallbackText;
  annotation.dataset.m8aV49SceneNearAttachmentClaim =
    sceneNear.attachmentClaim;
  annotation.dataset.m8aV411SceneMicroCue = "true";
  annotation.dataset.m8aV411SceneMicroCueCopy = microCueCopy;
  annotation.dataset.m8aV411SceneMicroCueMaxWidthPx = "180";
  annotation.dataset.m8aV411SceneMicroCueMaxHeightPx = "24";
  annotation.dataset.m8aV411GlanceRankSurface =
    M8A_V411_GLANCE_RANK_SURFACE_VERSION;
  annotation.setAttribute("aria-label", microCueCopy);
  annotation.dataset.m8aV47SceneAnchorKind =
    "display-representative-context-cue";
  annotation.dataset.m8aV47SceneAnchorActorId = placement.anchorActorId;
  annotation.dataset.m8aV47SceneAnchorProjected = String(placement.projected);
  annotation.dataset.m8aV47SceneAnchorX = placement.anchorX.toFixed(1);
  annotation.dataset.m8aV47SceneAnchorY = placement.anchorY.toFixed(1);
  annotation.dataset.m8aV48SceneAnchorState =
    review.sceneAnchorState.state;
  annotation.dataset.sceneAnchorState = review.sceneAnchorState.state;
  annotation.dataset.m8aV48SelectedAnchorType = placement.selectedAnchorType;
  annotation.dataset.m8aV48SelectedActorId = placement.selectedActorId;
  annotation.dataset.m8aV48SelectedRelationCueId =
    placement.selectedRelationCueId;
  annotation.dataset.m8aV48SelectedCorridorId = placement.selectedCorridorId;
  annotation.dataset.m8aV48AnchorStatus = placement.anchorStatus;
  annotation.dataset.m8aV48FallbackReason = placement.fallbackReason;
  annotation.dataset.m8aV48ConnectorThresholdPx =
    placement.connectorThresholdPx.toFixed(1);
  annotation.dataset.m8aV48ConnectorEndpointDistancePx =
    placement.connectorEndpointDistancePx.toFixed(1);
  annotation.dataset.m8aV48ProtectionRectLeft =
    placement.protectionRect.left.toFixed(1);
  annotation.dataset.m8aV48ProtectionRectTop =
    placement.protectionRect.top.toFixed(1);
  annotation.dataset.m8aV48ProtectionRectRight =
    placement.protectionRect.right.toFixed(1);
  annotation.dataset.m8aV48ProtectionRectBottom =
    placement.protectionRect.bottom.toFixed(1);
  annotation.dataset.m8aV48ProtectionRectWidth =
    placement.protectionRect.width.toFixed(1);
  annotation.dataset.m8aV48ProtectionRectHeight =
    placement.protectionRect.height.toFixed(1);
  annotation.style.left = `${placement.left.toFixed(1)}px`;
  annotation.style.top = `${placement.top.toFixed(1)}px`;

  const sceneNearMeaning = getProductUxElement(
    root,
    "[data-m8a-v49-scene-near-meaning]"
  );
  setProductUxHidden(sceneNearMeaning, true);
  const sceneNearCue = getProductUxElement(
    root,
    "[data-m8a-v47-annotation-context]"
  );
  sceneNearCue.dataset.m8aV49SceneNearCue = "true";
  setProductUxHidden(sceneNearCue, true);
  const sceneNearOrbitToken = getProductUxElement(
    root,
    "[data-m8a-v49-scene-near-orbit-token]"
  );
  setProductUxHidden(sceneNearOrbitToken, true);
  const sceneNearNext = getProductUxElement(
    root,
    "[data-m8a-v410-next-line='true']"
  );
  setProductUxHidden(sceneNearNext, true);
  const sceneNearFallback = getProductUxElement(
    root,
    "[data-m8a-v49-scene-near-fallback]"
  );
  setProductUxHidden(sceneNearFallback, true);

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
    endpoints: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints,
    requiredPrecisionBadge: M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
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

  const transitionElement = getProductUxElement(
    root,
    "[data-m8a-v49-transition-event='true']"
  );
  transitionElement.dataset.m8aV49TransitionEventVisible =
    String(transitionEventVisible);
  transitionElement.dataset.m8aV49TransitionEventDurationMs = String(
    comprehension.transitionEventLayer.durationMs
  );
  transitionElement.dataset.m8aV49TransitionEventFromLabel =
    transitionEvent?.fromProductLabel ?? "";
  transitionElement.dataset.m8aV49TransitionEventToLabel =
    transitionEvent?.toProductLabel ?? "";
  transitionElement.dataset.m8aV49TransitionEventStateTruthSource =
    comprehension.transitionEventLayer.currentStateTruthSource;
  transitionElement.dataset.m8aV49TransitionEventNonBlocking =
    comprehension.transitionEventLayer.blockingPolicy;
  updateProductUxText(
    root,
    "[data-m8a-v49-transition-summary]",
    transitionEvent?.summaryText ?? ""
  );
  updateProductUxText(
    root,
    "[data-m8a-v49-transition-context]",
    transitionEvent?.contextText ?? ""
  );
  setProductUxHidden(transitionElement, !transitionEventVisible);

  if (transitionEventVisible) {
    placeTransitionEventAwayFromSelectedCue(
      transitionElement,
      placement,
      root
    );
  }

  const sequenceRailElement = getProductUxElement(
    root,
    "[data-m8a-v410-sequence-rail='true']"
  );
  sequenceRailElement.dataset.m8aV410HandoverSequenceRail =
    sequenceRail.version;
  sequenceRailElement.dataset.m8aV410SequenceRailScope =
    sequenceRail.scope;
  sequenceRailElement.dataset.m8aV410SequenceRailVisibleContent =
    serializeList([...sequenceRail.visibleContent]);
  sequenceRailElement.dataset.m8aV410SequenceRailWindowIds =
    serializeList([...sequenceRail.windowIds]);
  sequenceRailElement.dataset.m8aV410SequenceRailActiveWindowId =
    sequenceRail.activeWindowId;
  sequenceRailElement.dataset.m8aV410SequenceRailNextWindowId =
    sequenceRail.nextWindowId;
  sequenceRailElement.dataset.m8aV410SequenceRailActiveLabel =
    sequenceRail.activeProductLabel;
  sequenceRailElement.dataset.m8aV410SequenceRailNextLabel =
    sequenceRail.nextProductLabel;
  sequenceRailElement.dataset.m8aV410SequenceRailActiveOrdinal =
    sequenceRail.activeOrdinalLabel;
  sequenceRailElement.dataset.m8aV410SequenceRailNextOrdinal =
    sequenceRail.nextOrdinalLabel;
  sequenceRailElement.dataset.m8aV410SequenceRailTransitionFromWindowId =
    sequenceRail.transitionEvent.fromWindowId;
  sequenceRailElement.dataset.m8aV410SequenceRailTransitionToWindowId =
    sequenceRail.transitionEvent.toWindowId;
  sequenceRailElement.dataset.m8aV410SequenceRailTransitionVisible = String(
    sequenceRail.transitionEvent.visible
  );
  sequenceRailElement.dataset.m8aV410SequenceRailViewportPolicy =
    sequenceRail.viewportPolicy;
  sequenceRailElement.dataset.itriDemoFocusChoreographyVersion =
    focusChoreography.version;
  sequenceRailElement.dataset.itriDemoFocusActiveWindowId =
    focusChoreography.windowId;
  sequenceRailElement.dataset.itriDemoFocusActiveId =
    focusChoreography.focusId;
  sequenceRailElement.dataset.itriDemoFocusActivePrimaryLabel =
    focusChoreography.primaryFocusLabel;
  sequenceRailElement.dataset.itriDemoFocusNextHint =
    focusChoreography.nextFocusHint;

  for (const item of sequenceRail.items) {
    const mark = getProductUxElement(
      root,
      `[data-m8a-v410-sequence-window-id="${item.windowId}"]`
    );
    const itemFocus = resolveM8aV4ItriDemoFocusChoreography(item.windowId);

    mark.dataset.active = String(item.isActive);
    mark.dataset.next = String(item.isNext);
    mark.dataset.transitionFrom = String(item.isTransitionFrom);
    mark.dataset.transitionTo = String(item.isTransitionTo);
    mark.dataset.m8aV410SequenceProductLabel = item.productLabel;
    mark.dataset.m8aV410SequenceRailLabel = item.railLabel;
    mark.dataset.m8aV410SequenceOrdinal = item.ordinalLabel;
    mark.dataset.itriDemoFocusId = itemFocus.focusId;
    mark.dataset.itriDemoFocusRole = itemFocus.focusRole;
    mark.dataset.itriDemoFocusPrimaryLabel = itemFocus.primaryFocusLabel;
    mark.dataset.itriDemoFocusVisualCue = itemFocus.visualCue;
    mark.dataset.itriDemoFocusSecondary = item.isActive
      ? "primary"
      : item.isNext
        ? "next-visible"
        : "dimmed-context";
    mark.setAttribute("aria-current", item.isActive ? "step" : "false");
    mark.setAttribute(
      "aria-label",
      `${item.ordinalLabel}: ${item.productLabel}${
        item.isActive ? " active" : item.isNext ? " next" : ""
      }`
    );
  }

  syncM8aV411HoverPopoverTargets({
    root,
    activeWindow: state.simulationHandoverModel.window,
    timeline: state.simulationHandoverModel.timeline
  });

  const microCueRectForCountdown = (() => {
    try {
      return root
        .querySelector<HTMLElement>("[data-m8a-v47-scene-annotation='true']")
        ?.getBoundingClientRect() ?? null;
    } catch (error) {
      return null;
    }
  })();
  renderM8aV411CountdownSurface({
    root,
    derivation: countdownDerivation,
    microCueRect: microCueRectForCountdown
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

  const boundarySurface = getProductUxElement(
    root,
    "[data-m8a-v410-boundary-surface='true']"
  );
  boundarySurface.dataset.m8aV410BoundaryAffordance =
    boundaryAffordance.version;
  boundarySurface.dataset.m8aV410BoundaryAffordanceScope =
    boundaryAffordance.scope;
  boundarySurface.dataset.m8aV410BoundaryVisibleContent = serializeList([
    ...boundaryAffordance.visibleContent
  ]);
  boundarySurface.dataset.m8aV410BoundaryCompactCopy =
    boundaryAffordance.compactCopy;
  boundarySurface.dataset.m8aV410BoundarySecondaryCopy =
    boundaryAffordance.secondaryCopy;
  boundarySurface.dataset.m8aV410BoundaryDetailsBehavior =
    boundaryAffordance.detailsBehavior;
  boundarySurface.dataset.m8aV410BoundarySurfaceState =
    boundaryAffordance.boundarySurfaceState;
  boundarySurface.dataset.m8aV410DetailsSheetState =
    boundaryAffordance.detailsSheetState;
  boundarySurface.dataset.m8aV410BoundaryFullTruthDisclosurePlacement =
    boundaryAffordance.fullTruthDisclosurePlacement;
  boundarySurface.dataset.m8aV410BoundaryForbiddenBehavior = serializeList([
    ...boundaryAffordance.forbiddenBehavior
  ]);
  boundarySurface.dataset.m8aV48WindowId = review.windowId;
  updateProductUxText(
    root,
    "[data-m8a-v410-boundary-summary='true']",
    `${boundaryAffordance.compactCopy}.`
  );
  updateProductUxText(
    root,
    "[data-m8a-v410-boundary-secondary='true']",
    boundaryAffordance.secondaryCopy
  );
  setProductUxHidden(boundarySurface, !boundarySurfaceOpen);

  const sheet = getProductUxElement(
    root,
    "[data-m8a-v47-ui-surface='inspection-sheet']"
  );
  sheet.dataset.m8aV49InspectorLayer = comprehension.inspectorLayer.scope;
  sheet.dataset.m8aV410InspectorEvidenceRedesign =
    comprehension.inspectorLayer.v410EvidenceRedesignVersion;
  sheet.dataset.m8aV410InspectorEvidenceStructure = serializeList([
    ...comprehension.inspectorLayer.evidenceStructure
  ]);
  sheet.dataset.m8aV410InspectorFirstReadRole =
    comprehension.inspectorLayer.firstReadRole;
  sheet.dataset.m8aV410InspectorDeniedFirstReadRoles = serializeList([
    ...comprehension.inspectorLayer.deniedFirstReadRoles
  ]);
  sheet.dataset.m8aV410InspectorNotClaimedContent = serializeList([
    ...comprehension.inspectorLayer.notClaimedContent
  ]);
  sheet.dataset.m8aV410InspectorSurfaceSeparation =
    comprehension.inspectorLayer.surfaceSeparation;
  sheet.dataset.m8aV49InspectorPrimaryVisibleContent = serializeList([
    ...comprehension.inspectorLayer.primaryVisibleContent
  ]);
  sheet.dataset.m8aV49InspectorDeniedPrimaryContent = serializeList([
    ...comprehension.inspectorLayer.deniedPrimaryVisibleContent
  ]);
  sheet.dataset.m8aV49InspectorDebugEvidenceContent = serializeList([
    ...comprehension.inspectorLayer.debugEvidenceContent
  ]);
  sheet.dataset.m8aV49InspectorDebugEvidenceDefaultOpen = String(
    comprehension.inspectorLayer.debugEvidenceDefaultOpen
  );
  sheet.dataset.m8aV49InspectorTruthBoundaryPlacement =
    comprehension.inspectorLayer.truthBoundaryPlacement;
  sheet.dataset.m8aV49InspectorMetadataPolicy =
    comprehension.inspectorLayer.metadataPolicy;
  sheet.dataset.m8aV411InspectorConcurrency =
    M8A_V411_INSPECTOR_CONCURRENCY_VERSION;
  sheet.dataset.m8aV411InspectorSliceScope =
    "slice3-inspector-concurrency";
  sheet.dataset.m8aV411InspectorRoles = serializeList([
    "state-evidence",
    "truth-boundary",
    "sources"
  ]);
  sheet.dataset.m8aV411InspectorStateEvidenceState =
    productUx.disclosure.detailsSheetState;
  sheet.dataset.m8aV411InspectorTruthBoundaryState =
    productUx.disclosure.boundarySurfaceState;
  sheet.dataset.m8aV411InspectorActiveTab = selectedInspectorTab;
  sheet.dataset.m8aV411InspectorVisiblePanels = root.dataset.m8aV411InspectorVisiblePanels ?? "";
  sheet.dataset.m8aV411SourcesRole = M8A_V411_SOURCES_ROLE_VERSION;
  sheet.dataset.m8aV411SourcesAffordance =
    "advanced-source-provenance-toggle-only";
  sheet.dataset.m8aV411SourcesRoleState =
    productUx.disclosure.sourcesRoleState;
  sheet.dataset.m8aV411SourcesFilter = JSON.stringify(
    productUx.disclosure.sourcesFilter
  );
  sheet.dataset.m8aV411InspectorCombinedOpen = String(sheetOpen);
  sheet.dataset.m8aV411InspectorImplementationEvidenceDefaultOpen = String(
    comprehension.inspectorLayer.debugEvidenceDefaultOpen
  );
  sheet.dataset.m8aV411InspectorMaxWidthPx = String(
    M8A_V411_INSPECTOR_MAX_WIDTH_PX
  );
  sheet.dataset.m8aV411InspectorMaxHeightCss =
    M8A_V411_INSPECTOR_MAX_HEIGHT_CSS;
  sheet.dataset.m8aV411InspectorMaxCanvasWidthRatio = String(
    M8A_V411_INSPECTOR_MAX_CANVAS_WIDTH_RATIO
  );
  sheet.dataset.m8aV48WindowId = review.windowId;
  sheet.dataset.m8aV48RepresentativeActorId =
    review.representativeActor.actorId;
  sheet.dataset.m8aV48CandidateContextActorIds =
    serializeList(candidateActorIds);
  sheet.dataset.m8aV48FallbackContextActorIds =
    serializeList(fallbackActorIds);
  sheet.dataset.m8aV48RelationCueRole = review.relationCueRole.displayLabel;
  sheet.dataset.m8aV48SceneAnchorState = review.sceneAnchorState.state;
  sheet.dataset.sceneAnchorState = review.sceneAnchorState.state;
  sheet.dataset.m8aV48SelectedAnchorType = placement.selectedAnchorType;
  sheet.dataset.m8aV48SelectedActorId = placement.selectedActorId;
  sheet.dataset.m8aV48SelectedRelationCueId = placement.selectedRelationCueId;
  sheet.dataset.m8aV48SelectedCorridorId = placement.selectedCorridorId;
  sheet.dataset.m8aV48AnchorStatus = placement.anchorStatus;
  sheet.dataset.m8aV48FallbackReason = placement.fallbackReason;
  sheet.dataset.m8aV4ItriDemoViewNarrow =
    M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION;
  sheet.dataset.m8aV4ItriDemoViewNarrowPresentation =
    productUx.layout.viewportClass === "narrow" ? "modal-sheet" : "side-sheet";
  sheet.setAttribute(
    "role",
    productUx.layout.viewportClass === "narrow" && sheetOpen
      ? "dialog"
      : "complementary"
  );
  sheet.setAttribute(
    "aria-modal",
    String(productUx.layout.viewportClass === "narrow" && sheetOpen)
  );
  setProductUxHidden(sheet, !sheetOpen);
  placeInspectorSheetAwayFromSelectedCue(sheet, placement, sheetOpen);

  updateProductUxText(
    root,
    "[data-m8a-v410-inspector-title='true']",
    "Inspector"
  );
  const inspectorLead = getProductUxElement(
    root,
    "[data-m8a-v410-inspector-lead='true']"
  );
  setProductUxHidden(inspectorLead, true);

  const inspectorBody = getProductUxElement(
    root,
    "[data-m8a-v48-inspector-body='true']"
  );
  inspectorBody.dataset.m8aV48WindowId = review.windowId;
  inspectorBody.dataset.m8aV48RepresentativeActorId =
    review.representativeActor.actorId;
  inspectorBody.dataset.m8aV48CandidateContextActorIds =
    serializeList(candidateActorIds);
  inspectorBody.dataset.m8aV48FallbackContextActorIds =
    serializeList(fallbackActorIds);
  inspectorBody.dataset.m8aV48SceneAnchorState =
    review.sceneAnchorState.state;
  inspectorBody.dataset.m8aV48SelectedAnchorType = placement.selectedAnchorType;
  inspectorBody.dataset.m8aV48SelectedActorId = placement.selectedActorId;
  inspectorBody.dataset.m8aV48SelectedRelationCueId =
    placement.selectedRelationCueId;
  inspectorBody.dataset.m8aV48SelectedCorridorId =
    placement.selectedCorridorId;
  inspectorBody.dataset.m8aV48AnchorStatus = placement.anchorStatus;
  inspectorBody.dataset.m8aV48FallbackReason = placement.fallbackReason;
  inspectorBody.dataset.m8aV49InspectorLayer =
    comprehension.inspectorLayer.scope;
  inspectorBody.dataset.m8aV410InspectorEvidenceRedesign =
    comprehension.inspectorLayer.v410EvidenceRedesignVersion;
  inspectorBody.dataset.m8aV410InspectorEvidenceStructure = serializeList([
    ...comprehension.inspectorLayer.evidenceStructure
  ]);
  inspectorBody.dataset.m8aV410InspectorFirstReadRole =
    comprehension.inspectorLayer.firstReadRole;
  inspectorBody.dataset.m8aV410InspectorSurfaceSeparation =
    comprehension.inspectorLayer.surfaceSeparation;
  inspectorBody.dataset.m8aV49PrimaryVisibleContent = serializeList([
    ...comprehension.inspectorLayer.primaryVisibleContent
  ]);
  inspectorBody.dataset.m8aV49DeniedPrimaryContent = serializeList([
    ...comprehension.inspectorLayer.deniedPrimaryVisibleContent
  ]);

  const primaryInspector = getProductUxElement(
    root,
    "[data-m8a-v49-inspector-primary-body='true']"
  );
  primaryInspector.dataset.m8aV48WindowId = review.windowId;
  primaryInspector.dataset.m8aV410InspectorEvidenceRedesign =
    comprehension.inspectorLayer.v410EvidenceRedesignVersion;
  primaryInspector.dataset.m8aV410InspectorEvidenceStructure = serializeList([
    ...comprehension.inspectorLayer.evidenceStructure
  ]);
  primaryInspector.dataset.m8aV410InspectorFirstReadRole =
    comprehension.inspectorLayer.firstReadRole;
  primaryInspector.dataset.m8aV410InspectorNotClaimedContent = serializeList([
    ...comprehension.inspectorLayer.notClaimedContent
  ]);
  primaryInspector.dataset.m8aV49PrimaryVisibleContent = serializeList([
    ...comprehension.inspectorLayer.primaryVisibleContent
  ]);
  primaryInspector.dataset.m8aV49DeniedPrimaryContent = serializeList([
    ...comprehension.inspectorLayer.deniedPrimaryVisibleContent
  ]);
  primaryInspector.dataset.m8aV411InspectorConcurrency =
    M8A_V411_INSPECTOR_CONCURRENCY_VERSION;
  primaryInspector.dataset.m8aV411InspectorStateEvidenceState =
    productUx.disclosure.detailsSheetState;
  primaryInspector.dataset.m8aV411InspectorTruthBoundaryState =
    productUx.disclosure.boundarySurfaceState;
  primaryInspector.dataset.m8aV411InspectorActiveTab = selectedInspectorTab;
  primaryInspector.dataset.m8aV411InspectorVisiblePanels =
    root.dataset.m8aV411InspectorVisiblePanels ?? "";
  primaryInspector.dataset.m8aV411SourcesRoleState =
    productUx.disclosure.sourcesRoleState;
  primaryInspector.dataset.m8aV411SourcesFilter = JSON.stringify(
    productUx.disclosure.sourcesFilter
  );
  primaryInspector.dataset.m8aV411InspectorCombinedOpen = String(sheetOpen);

  const stateEvidenceRole = getProductUxElement(
    root,
    "[data-m8a-v411-inspector-role='state-evidence']"
  );
  stateEvidenceRole.dataset.m8aV411RoleState = decisionPanelOpen
    ? "open"
    : "closed";
  stateEvidenceRole.dataset.m8aV411StateEvidenceWindowId =
    productUx.activeWindowId;
  stateEvidenceRole.dataset.m8aV411InspectorPrimaryRole =
    M8A_V411_INSPECTOR_PRIMARY_ROLE;
  stateEvidenceRole.dataset.m8aV411StateEvidenceTriggeredByDetails = String(
    stateEvidenceOpen
  );
  stateEvidenceRole.dataset.m8aV411StateEvidenceTriggeredByTruth = String(
    truthBoundaryOpen
  );
  setProductUxHidden(stateEvidenceRole, !decisionPanelOpen);

  const metricsRole = getProductUxElement(
    root,
    "[data-m8a-v411-inspector-panel='metrics']"
  );
  metricsRole.dataset.m8aV411RoleState = metricsPanelOpen ? "open" : "closed";
  metricsRole.dataset.m8aV411MetricsWindowId = productUx.activeWindowId;
  metricsRole.dataset.m8aV411MetricsStructure =
    "available-and-not-connected";
  metricsRole.dataset.m8aV411DisabledMetricTileCount = String(
    M8A_V411_DISABLED_METRIC_TILES.length
  );
  metricsRole.dataset.m8aV411AvailableMetricTileCount = "4";
  setProductUxHidden(metricsRole, !metricsPanelOpen);

  const stateEvidenceDetailEl = getProductUxElement(
    root,
    "[data-m8a-v411-state-evidence-detail='true']"
  );
  stateEvidenceDetailEl.textContent = stateEvidenceCopy.detail;
  stateEvidenceDetailEl.dataset.m8aV411StateEvidenceDetailWindowId =
    productUx.activeWindowId;

  const truthBoundaryRole = getProductUxElement(
    root,
    "[data-m8a-v411-inspector-role='truth-boundary']"
  );
  truthBoundaryRole.dataset.m8aV411RoleState = boundaryPanelOpen
    ? "open"
    : "closed";
  truthBoundaryRole.dataset.m8aV411TruthBoundaryWindowId =
    productUx.activeWindowId;
  truthBoundaryRole.dataset.m8aV411TruthBoundaryLineCount = String(
    truthBoundaryLines.length
  );
  truthBoundaryRole.dataset.m8aV411InspectorConv2TailOfStateEvidence = "true";
  setProductUxHidden(truthBoundaryRole, !boundaryPanelOpen);

  const sourcesRole = getProductUxElement(
    root,
    "[data-m8a-v411-inspector-role='sources']"
  );
  sourcesRole.dataset.m8aV411RoleState = evidencePanelOpen ? "open" : "closed";
  sourcesRole.dataset.m8aV411SourcesFilter = JSON.stringify(
    productUx.disclosure.sourcesFilter
  );
  setProductUxHidden(sourcesRole, !evidencePanelOpen);

  const acceptanceLayerEl = getProductUxElement(
    root,
    "[data-itri-demo-l2-acceptance-layer='true']"
  );
  acceptanceLayerEl.dataset.itriDemoL2Open = String(evidencePanelOpen);
  acceptanceLayerEl.dataset.itriDemoL2TruthBoundary =
    acceptanceLayer.truthBoundary;
  acceptanceLayerEl.dataset.itriDemoL2RequirementIds = serializeList([
    ...acceptanceLayer.requirementIds
  ]);
  acceptanceLayerEl.dataset.itriDemoL2RequirementStatuses = serializeList([
    ...acceptanceLayer.requirementStatusPairs
  ]);
  acceptanceLayerEl.dataset.itriDemoL2RequirementLayers = serializeList([
    ...acceptanceLayer.requirementLayerPairs
  ]);
  acceptanceLayerEl.dataset.itriDemoL2ExternalFailIds = serializeList([
    ...acceptanceLayer.externalFailIds
  ]);
  acceptanceLayerEl.dataset.itriDemoL2BoundedRouteIds = serializeList([
    ...acceptanceLayer.boundedRouteRepresentationIds
  ]);
  acceptanceLayerEl.dataset.itriDemoL2F13RouteNativeScaleClaimed = String(
    acceptanceLayer.f13Phase71Evidence.routeNativeScaleClaimed
  );
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessVersion =
    acceptanceLayer.f13RouteNativeScaleReadiness.version;
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessTargetReached = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetReached
  );
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessCurrentRouteActorCount =
    String(
      acceptanceLayer.f13RouteNativeScaleReadiness.currentRouteActorCount
    );
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessActorCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount
  );
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessLeoCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessLeoActorCount
  );
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessTargetLeoCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount
  );
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessSourceType =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceType;
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessSourceUrl =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceUrl;
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessPublicSourceUsed =
    String(acceptanceLayer.f13RouteNativeScaleReadiness.publicSourceUsed);
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessBuiltAtUtc =
    acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc;
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessFreshnessTimestampUtc =
    acceptanceLayer.f13RouteNativeScaleReadiness.freshnessTimestampUtc;
  acceptanceLayerEl.dataset.itriDemoL2F13ScaleReadinessClosureClaimed = String(
    acceptanceLayer.f13RouteNativeScaleReadiness
      .routeNativeScaleClosureClaimed
  );
  acceptanceLayerEl.dataset.itriDemoL2ExternalValidationStatus =
    acceptanceLayer.externalValidationPackage.status;

  const f13ScaleReadinessEl = getProductUxElement(
    root,
    "[data-itri-f13-scale-readiness-surface='true']"
  );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessVersion =
    acceptanceLayer.f13RouteNativeScaleReadiness.version;
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessTargetReached = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetReached
  );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessCurrentRouteActorCount =
    String(
      acceptanceLayer.f13RouteNativeScaleReadiness.currentRouteActorCount
    );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessActorCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessActorCount
  );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessLeoCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.readinessLeoActorCount
  );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessTargetLeoCount = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.targetLeoCount
  );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessSourceType =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceType;
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessSourceUrl =
    acceptanceLayer.f13RouteNativeScaleReadiness.sourceUrl;
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessPublicSourceUsed = String(
    acceptanceLayer.f13RouteNativeScaleReadiness.publicSourceUsed
  );
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessBuiltAtUtc =
    acceptanceLayer.f13RouteNativeScaleReadiness.builtAtUtc;
  f13ScaleReadinessEl.dataset.itriF13ScaleReadinessClosureClaimed = String(
    acceptanceLayer.f13RouteNativeScaleReadiness
      .routeNativeScaleClosureClaimed
  );

  const evidenceArchive = getProductUxElement(
    root,
    "[data-m8a-v411-evidence-archive='true']"
  ) as HTMLDetailsElement;
  const evidenceArchiveDefaultOpen =
    productUx.activeWindowId === "geo-continuity-guard";
  evidenceArchive.open = sourcesRoleOpen || evidenceArchiveDefaultOpen;
  evidenceArchive.dataset.m8aV411EvidenceArchiveDefaultOpen = String(
    evidenceArchiveDefaultOpen
  );
  evidenceArchive.dataset.m8aV411EvidenceArchiveOpen = String(
    evidenceArchive.open
  );
  evidenceArchive.dataset.m8aV411EvidenceArchiveWindowId =
    productUx.activeWindowId;

  for (const tabButton of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v411-inspector-tab]"
  )) {
    tabButton.setAttribute(
      "aria-selected",
      String(tabButton.dataset.m8aV411InspectorTab === selectedInspectorTab)
    );
  }

  const truthBoundaryList = getProductUxElement(
    root,
    "[data-m8a-v411-truth-boundary-lines='true']"
  );
  truthBoundaryList.replaceChildren(
    ...truthBoundaryLines.map((line) => {
      const item = document.createElement("li");
      item.dataset.m8aV48InfoClass = "disclosure";
      item.textContent = line;
      return item;
    })
  );

  const debugEvidence = getProductUxElement(
    root,
    "[data-m8a-v49-debug-evidence='true']"
  ) as HTMLDetailsElement;
  debugEvidence.dataset.m8aV49DebugEvidenceDefaultOpen = String(
    comprehension.inspectorLayer.debugEvidenceDefaultOpen
  );
  debugEvidence.dataset.m8aV49DebugEvidenceContent = serializeList([
    ...comprehension.inspectorLayer.debugEvidenceContent
  ]);
  debugEvidence.dataset.m8aV49DebugEvidenceOpen = String(debugEvidence.open);

  const fullTruthBoundary = getProductUxElement(
    root,
    "[data-m8a-v49-truth-boundary-details='true']"
  );
  fullTruthBoundary.dataset.m8aV49TruthBoundaryPlacement =
    comprehension.inspectorLayer.truthBoundaryPlacement;
  fullTruthBoundary.dataset.m8aV49TruthBoundaryOpen = String(truthBoundaryOpen);

  const boundaryFullTruthDisclosure = getProductUxElement(
    root,
    "[data-m8a-v410-boundary-full-truth-disclosure='true']"
  ) as HTMLDetailsElement;
  const boundaryFullTruthSummary =
    boundaryFullTruthDisclosure.querySelector<HTMLElement>("summary");

  if (!boundaryFullTruthSummary) {
    throw new Error("Missing V4.10 boundary full truth disclosure summary.");
  }

  boundaryFullTruthDisclosure.open =
    productUx.disclosure.boundaryFullTruthDisclosureState === "open";
  boundaryFullTruthDisclosure.dataset.m8aV410BoundaryFullTruthDisclosurePlacement =
    boundaryAffordance.fullTruthDisclosurePlacement;
  boundaryFullTruthDisclosure.dataset.m8aV410BoundaryFullTruthDisclosureState =
    boundaryAffordance.fullTruthDisclosureState;
  boundaryFullTruthDisclosure.dataset.m8aV410BoundaryFullTruthDisclosureOpen =
    String(boundaryFullTruthDisclosure.open);

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

  const toggle = root.querySelector<HTMLElement>(
    "[data-m8a-v411-reviewer-mode-toggle='true']"
  );
  if (toggle) {
    toggle.dataset.m8aV411ReviewerModeOn = String(reviewer.reviewModeOn);
    toggle.setAttribute("aria-pressed", String(reviewer.reviewModeOn));
    toggle.textContent = reviewer.reviewModeOn
      ? "Review mode · on"
      : "Review mode · off";
    toggle.dataset.m8aV411ReviewerModeReplayClockMode =
      reviewer.replayClockMode;
    toggle.dataset.m8aV411ReviewerModeAutoPauseMs = String(
      reviewer.autoPauseDurationMs
    );
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

  const status = root.querySelector<HTMLElement>(
    "[data-m8a-v411-reviewer-mode-status='true']"
  );
  if (status) {
    const previousMode = status.dataset.m8aV411ReviewerModeAnnouncedMode;
    const previousOrdinal =
      status.dataset.m8aV411ReviewerModeAnnouncedOrdinal ?? "";
    const currentOrdinal = reviewer.pinnedWindowOrdinalLabel ?? "";
    const announcementChanged =
      previousMode !== reviewer.replayClockMode ||
      previousOrdinal !== currentOrdinal;
    status.dataset.m8aV411ReplayClockMode = reviewer.replayClockMode;
    status.dataset.m8aV411ReviewerModeOn = String(reviewer.reviewModeOn);
    if (announcementChanged) {
      status.textContent = reviewer.announcement.ariaText;
      status.dataset.m8aV411ReviewerModeAnnouncedMode =
        reviewer.replayClockMode;
      status.dataset.m8aV411ReviewerModeAnnouncedOrdinal = currentOrdinal;
      status.dataset.m8aV411ReviewerModeAnnouncedAriaText =
        reviewer.announcement.ariaText;
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
  root.dataset.m8aV411HandoverRailDrawerState =
    productUx.layout.narrowRailDrawerState;

  const railTrigger = root.querySelector<HTMLElement>(
    "[data-m8a-v411-narrow-rail-trigger='true']"
  );
  if (railTrigger) {
    railTrigger.setAttribute(
      "aria-expanded",
      String(productUx.layout.narrowRailDrawerState === "open")
    );
  }

  const railDrawer = root.querySelector<HTMLElement>(
    "[data-m8a-v411-handover-rail='true']"
  );
  if (railDrawer) {
    railDrawer.dataset.m8aV411HandoverRailDrawerState =
      productUx.layout.narrowRailDrawerState;
    railDrawer.dataset.m8aV4ItriDemoViewNarrow =
      M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION;
    railDrawer.dataset.m8aV4ItriDemoViewNarrowPresentation =
      productUx.layout.viewportClass === "narrow"
        ? "bottom-sheet-briefing"
        : "left-briefing";
    railDrawer.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  const railScrim = root.querySelector<HTMLElement>(
    "[data-m8a-v411-handover-rail-scrim='true']"
  );
  if (railScrim) {
    railScrim.hidden = productUx.layout.narrowRailDrawerState !== "open";
  }
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

function buildEndpointState(): M8aV4GroundStationSceneState["endpoints"] {
  return M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.map((endpoint) => ({
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

export function createM8aV4GroundStationSceneController({
  viewer,
  hudFrame,
  replayClock
}: M8aV4GroundStationSceneControllerOptions): M8aV4GroundStationSceneController {
  const modelUri = resolveModelUri();
  const dataSource = new CustomDataSource(M8A_V4_GROUND_STATION_DATA_SOURCE_NAME);
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
  applyV4Camera(viewer);
  hudFrame.dataset.hudVisibility = "m8a-v4";
  hudFrame.setAttribute("aria-hidden", "false");
  hudFrame.appendChild(hudRoot);
  hudFrame.appendChild(productUxRoot);

  const endpointsById = new Map(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.map((endpoint) => [
      endpoint.endpointId,
      endpoint
    ])
  );
  const endpointA = endpointsById.get("tw-cht-multi-orbit-ground-infrastructure");
  const endpointB = endpointsById.get("sg-speedcast-singapore-teleport");

  if (!endpointA || !endpointB) {
    throw new Error("V4 ground-station scene requires both accepted endpoints.");
  }

  for (const endpoint of M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints) {
    dataSource.entities.add({
      id: `m8a-v4-endpoint-${endpoint.endpointId}`,
      name: endpoint.renderMarker.label,
      position: positionToCartesian(endpoint.renderMarker.displayPosition),
      point: createEndpointPointStyle(endpoint),
      ellipse: createEndpointEllipseStyle(endpoint),
      label: createEndpointLabelStyle(endpoint),
      description: new ConstantProperty(
        `${endpoint.endpointLabel}; ${M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE}; bounded display anchor, not exact site truth.`
      )
    });
  }

  dataSource.entities.add({
    id: "m8a-v4-operator-family-endpoint-context-ribbon",
    name: "Operator-family endpoint context ribbon",
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
      "Endpoint pair context ribbon; operator-family precision; display context only."
    )
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

  const isEndpointId = (value: string): value is M8aV4EndpointId =>
    endpointsById.has(value as M8aV4EndpointId);

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
      endpoints: buildEndpointState(),
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

    geoGuardCueEntity.show = shouldShowGeoGuardCue(latestSimulationWindow);

    renderHud(hudRoot, nextState);
    renderProductUx(productUxRoot, nextState, viewer, visualTokenController);
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
