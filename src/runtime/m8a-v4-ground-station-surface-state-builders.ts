// Pure product-UX surface-state + F16 export-bundle builders, extracted from
// the scene controller. No DOM / Cesium / captured state — they read module
// constants + params and return plain state objects, so they are unit-testable.
// Locked by scene-surface-state-builders-golden.test.mjs.
import {
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  type M8aV4OrbitClass,
  type M8aV46dSimulationHandoverWindow
} from "./m8a-v4-ground-station-projection";
import {
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
  resolveRequirementF10PolicyPreset,
  resolveRequirementF11RulePreset,
  type M8aV4RequirementF10PolicyPresetId,
  type M8aV4RequirementF11RulePresetId,
  type M8aV4RequirementF16ExportRecord,
  type M8aV4RequirementF16RouteExportBundle
} from "./m8a-v4-requirement-demo-surfaces";
import {
  buildF09RateWindowRows
} from "./m8a-v4-requirement-demo-renderers";
import {
  resolveTimelineLabel
} from "./m8a-v4-product-ux-model";
import {
  type M8aV4GroundStationSceneState
} from "./m8a-v4-ground-station-scene-state";

export function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function resolveFallbackGuardCueMode(
  simulationWindow: M8aV46dSimulationHandoverWindow
): M8aV4GroundStationSceneState["relationCues"]["fallbackGuardCueMode"] {
  return simulationWindow.windowId === "geo-continuity-guard"
    ? "representative-context-ribbon-in-geo-continuity-guard"
    : "low-opacity-geo-guard-cue";
}

export function buildRequirementGapSurfaceState(): M8aV4GroundStationSceneState["requirementGapSurface"] {
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

export function buildAcceptanceLayerState(
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
      sourceAuthorityClaimed: false
    },
    externalValidationPackage: {
      artifact: M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT,
      status: M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS,
      failIds: M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS
    }
  };
}

export function buildF09RateSurfaceState(
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

export function buildF16ExportSurfaceState(
  latestExportRecord: M8aV4RequirementF16ExportRecord | null
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

export function buildPolicyRuleControlsState(
  activePolicyPresetId: M8aV4RequirementF10PolicyPresetId,
  activeRulePresetId: M8aV4RequirementF11RulePresetId
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
    activePolicyPreset: resolveRequirementF10PolicyPreset(activePolicyPresetId),
    activeRulePreset: resolveRequirementF11RulePreset(activeRulePresetId),
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

  return `requirement-demo-route-f16-bounded-${state.simulationHandoverModel.endpointPairId}-${timestamp}.json`;
}

export function buildF16RouteExportBundle(
  state: M8aV4GroundStationSceneState,
  generatedAtUtc: string
): M8aV4RequirementF16RouteExportBundle {
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
      sourceAuthorityClaimed:
        state.acceptanceLayer.f13RouteNativeScaleReadiness.sourceAuthorityClaimed
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
