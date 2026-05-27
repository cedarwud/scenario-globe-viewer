import type { SceneSourceMode } from "../features/multi-station-selector/tle-first-scene-view-model";
import type { SelectedPairOverlayDebugState } from "./m8a-v4-ground-station-overlay-debug";
import type {
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION_ID,
  M8A_V4_GROUND_STATION_SCENARIO_ID,
  M8A_V46D_SIMULATION_HANDOVER_MODEL_ID,
  M8aV4ActorDisplayRole,
  M8aV4OrbitActorProjection,
  M8aV4OrbitClass,
  M8aV4RuntimeNarrativeNonClaims,
  M8aV4ServiceStateWindow,
  M8aV46dActorId,
  M8aV46dSimulationHandoverWindow,
  M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";
import type {
  M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS,
  M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS,
  M8A_V4_CUSTOMER_DEMO_POLISH_DISPOSITION,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_TRUTH_BOUNDARY,
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
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL,
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT,
  M8A_V4_CUSTOMER_F16_EXPORT_ARTIFACT_TRUTH,
  M8A_V4_CUSTOMER_F16_EXPORT_DISPOSITION,
  M8A_V4_CUSTOMER_F16_EXPORT_FORMAT,
  M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE,
  M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION,
  M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION,
  M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS,
  M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED,
  M8A_V4_CUSTOMER_F16_EXTERNAL_TRUTH_DISPOSITION,
  M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED,
  M8A_V4_CUSTOMER_F16_ROUTE_OWNED_STATE_ONLY,
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
  M8A_V4_CUSTOMER_ROUTE_NATIVE_MEASURED_TRUTH_CLAIMED,
  M8aV4F09NetworkSpeedClass,
  M8aV4F09RateWindowRow,
  M8aV4ItriF10PolicyPreset,
  M8aV4ItriF11RulePreset,
  M8aV4ItriF16ExportRecord,
  M8aV4ItriAcceptanceCoverageRecord,
  M8aV4ItriRequirementStatusGroup
} from "./m8a-v4-itri-demo-surfaces";
import type { M8aV411SourcesFilter } from "./m8a-v411-sources-role";
import type {
  M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS,
  M8A_V411_REVIEWER_MODE_VERSION,
  M8aV411ReplayClockMode,
  M8aV411ReviewerModeState,
  resolveM8aV411ControlAvailability,
  resolveM8aV411ModeAnnouncement
} from "./m8a-v411-reviewer-mode";
import type {
  M8A_V4_LINK_FLOW_CUE_MODE,
  M8A_V4_LINK_FLOW_CUE_VERSION,
  M8A_V4_LINK_FLOW_DIRECTIONS,
  M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
  M8A_V47_DEBUG_TEST_MULTIPLIER,
  M8A_V47_DISCLOSURE_LINES,
  M8A_V47_FINAL_HOLD_DURATION_MS,
  M8A_V47_FINAL_HOLD_MAX_MS,
  M8A_V47_FINAL_HOLD_MIN_MS,
  M8A_V47_GUIDED_REVIEW_MULTIPLIER,
  M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
  M8A_V47_PRODUCT_UX_VERSION,
  M8A_V47_QUICK_SCAN_MULTIPLIER,
  M8A_V47_TRUTH_BADGES,
  M8A_V48_UI_IA_VERSION,
  M8aV411InspectorTab,
  M8aV47DisclosureState,
  M8aV47PlaybackMode,
  M8aV47PlaybackMultiplier,
  M8aV47PlaybackStatus,
  M8aV47ProductPlaybackMultiplier,
  M8aV48HandoverReviewViewModel,
  M8aV48InfoClass,
  M8aV49ProductComprehensionRuntime
} from "./m8a-v4-product-ux-model";

export const M8A_V4_GROUND_STATION_DATA_SOURCE_NAME =
  "m8a-v4-ground-station-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_RUNTIME_STATE =
  "active-v4.3-continuous-multi-orbit-handover-scene";
export const M8A_V4_GROUND_STATION_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene";

export interface M8aV4ActorRuntimeState {
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
  displayMotion: {
    policy:
      | "monotonic-wrapped-display-pass"
      | "near-fixed-geo-guard";
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
  };
  propagationTimeUtc: string;
  emphasis: "candidate" | "context" | "fallback" | "representative";
  labelVisibility: "always-visible" | "hidden-context";
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
  actors: ReadonlyArray<M8aV4ActorRuntimeState>;
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
