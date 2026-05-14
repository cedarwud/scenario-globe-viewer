import type {
  M8aV4EndpointId,
  M8aV4OrbitClass,
  M8aV4RuntimeNarrativeNonClaims,
  M8aV46dSimulationHandoverWindowId,
  M8aV46dWindowMetricClasses
} from "./m8a-v4-ground-station-projection";
import {
  MULTI_ORBIT_SCALE_OVERLAY_COUNTS,
  MULTI_ORBIT_SCALE_OVERLAY_MODE
} from "./leo-scale-overlay-fixture";

export const M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION =
  "itri-demo-view-default-focus-runtime.v1";
export const M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION =
  "itri-demo-view-narrow-runtime.v1";
export const M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY =
  "Modeled route review; no live traffic metric.";
export const M8A_V4_CUSTOMER_REQUIREMENT_GAP_SURFACE_VERSION =
  "itri-demo-route-requirement-gap-surface-runtime.v1";
export const M8A_V4_CUSTOMER_F09_RATE_SURFACE_VERSION =
  "itri-demo-route-f09-rate-disposition-runtime.v1";
export const M8A_V4_CUSTOMER_F09_RATE_DISPOSITION =
  "bounded-route-representation";
export const M8A_V4_CUSTOMER_F09_EXTERNAL_TRUTH_DISPOSITION =
  "external-validation-required";
export const M8A_V4_CUSTOMER_F09_PROVENANCE = "modeled bounded proxy";
export const M8A_V4_CUSTOMER_F09_METRIC_TRUTH =
  "modeled-bounded-class-not-measured";
export const M8A_V4_CUSTOMER_F09_MEASURED_THROUGHPUT_CLAIMED = false;
export const M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION =
  "itri-demo-route-f16-export-disposition-runtime.v1";
export const M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION =
  "itri-demo-route-bounded-export.v1";
export const M8A_V4_CUSTOMER_F16_EXPORT_DISPOSITION =
  "bounded-route-representation";
export const M8A_V4_CUSTOMER_F16_EXTERNAL_TRUTH_DISPOSITION =
  "external-validation-required";
export const M8A_V4_CUSTOMER_F16_EXPORT_ARTIFACT_TRUTH =
  "bounded-proxy-report-export";
export const M8A_V4_CUSTOMER_F16_EXPORT_FORMAT = "json";
export const M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE =
  "route-owned bounded state from V4 demo controller";
export const M8A_V4_CUSTOMER_F16_ROUTE_OWNED_STATE_ONLY = true;
export const M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED = false;
export const M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED = false;
export const M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS = [
  "No external measurement report truth is claimed.",
  "No live iperf or ping truth is claimed.",
  "No active gateway, active serving satellite, or pair-specific teleport path is claimed.",
  "No native RF handover or >=500 LEO validation is claimed.",
  "F-09 rate fields are modeled classes only; no Mbps or Gbps values are exported.",
  "Latency and jitter are not exported as measured ms values."
] as const;
export const M8A_V4_CUSTOMER_POLICY_RULE_CONTROLS_VERSION =
  "itri-demo-route-policy-rule-controls-runtime.v1";
export const M8A_V4_CUSTOMER_POLICY_RULE_DISPOSITION =
  "bounded-route-representation";
export const M8A_V4_CUSTOMER_POLICY_RULE_EXTERNAL_TRUTH_DISPOSITION =
  "external-validation-required";
export const M8A_V4_CUSTOMER_POLICY_RULE_TRUTH_BOUNDARY =
  "modeled-policy-demo-not-live-control";
export const M8A_V4_CUSTOMER_POLICY_RULE_EXPORT_ADJACENT_TRUTH =
  "modeled-replay-preset-state-not-live-control";
export const M8A_V4_CUSTOMER_F10_POLICY_PRESET_MODE =
  "modeled-replay-policy-preset-not-live-control";
export const M8A_V4_CUSTOMER_F11_RULE_PRESET_MODE =
  "bounded-replay-rule-parameter-preset-not-live-control";
export const M8A_V4_CUSTOMER_POLICY_RULE_ROUTE_OWNED_STATE_ONLY = true;
export const M8A_V4_CUSTOMER_POLICY_RULE_LIVE_CONTROL_CLAIMED = false;
export const M8A_V4_CUSTOMER_POLICY_RULE_BACKEND_CONTROL_CLAIMED = false;
export const M8A_V4_CUSTOMER_POLICY_RULE_NETWORK_CONTROL_CLAIMED = false;
export const M8A_V4_CUSTOMER_POLICY_RULE_ARBITRARY_EDITOR_CLAIMED = false;
export const M8A_V4_CUSTOMER_POLICY_RULE_MEASURED_DECISION_TRUTH_CLAIMED = false;
export const M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID =
  "balanced-continuity-review";
export const M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID =
  "standard-window-thresholds";
export const M8A_V4_CUSTOMER_F10_POLICY_PRESETS = [
  {
    presetId: "balanced-continuity-review",
    label: "Balanced continuity review",
    summary:
      "Default modeled replay preset balancing candidate review and continuity guard; not live control.",
    preview:
      "Modeled replay preview keeps candidate and continuity review balanced. Preset only; not live control."
  },
  {
    presetId: "candidate-first-review",
    label: "Candidate-first review",
    summary:
      "Modeled replay preset that foregrounds candidate review copy; not live control.",
    preview:
      "Modeled replay preview foregrounds candidate review. Preset only; not live control."
  },
  {
    presetId: "continuity-guard-review",
    label: "Continuity guard review",
    summary:
      "Modeled replay preset that foregrounds continuity guard copy; not live control.",
    preview:
      "Modeled replay preview foregrounds continuity guard. Preset only; not live control."
  }
] as const;
export const M8A_V4_CUSTOMER_F11_RULE_PRESETS = [
  {
    presetId: "standard-window-thresholds",
    label: "Standard window thresholds",
    summary:
      "Default bounded replay rule preset for standard review windows; not live control.",
    parameterChips: [
      "candidate review preset: standard",
      "continuity guard preset: standard",
      "replay hold preset: standard"
    ],
    preview:
      "Bounded replay rule preset keeps standard review windows. Preset only; not live control."
  },
  {
    presetId: "early-candidate-review",
    label: "Early candidate review",
    summary:
      "Bounded replay rule preset that reviews candidate context earlier; not live control.",
    parameterChips: [
      "candidate review preset: early",
      "continuity guard preset: standard",
      "replay hold preset: standard"
    ],
    preview:
      "Bounded replay rule preset previews earlier candidate review. Preset only; not live control."
  },
  {
    presetId: "guard-hold-review",
    label: "Guard hold review",
    summary:
      "Bounded replay rule preset that holds guard review emphasis; not live control.",
    parameterChips: [
      "candidate review preset: standard",
      "continuity guard preset: hold",
      "replay hold preset: guard"
    ],
    preview:
      "Bounded replay rule preset previews guard-hold review. Preset only; not live control."
  }
] as const;
export const M8A_V4_CUSTOMER_REQUIREMENT_GAP_TRUTH_LABELS = [
  "bounded-route-representation",
  "bounded-repo-owned-seam",
  "external-validation-required"
] as const;
export const M8A_V4_CUSTOMER_DEMO_POLISH_DISPOSITION =
  "demo-polish-no-requirement-closure";
export const M8A_V4_CUSTOMER_ROUTE_NATIVE_MEASURED_TRUTH_CLAIMED = false;

export type M8aV4ItriRequirementDisposition =
  | "true-route-closure"
  | "bounded-route-representation"
  | "bounded-repo-owned-seam"
  | "external-validation-required"
  | "demo-polish-no-requirement-closure"
  | "not-in-this-route";

export type M8aV4ItriRequirementGroupId =
  | "route-owned-visual-baseline"
  | "bounded-route-representation"
  | "bounded-repo-owned-seam"
  | "not-mounted-route-gap"
  | "external-validation-gap";
export type M8aV4F09NetworkSpeedClass =
  M8aV46dWindowMetricClasses["networkSpeedClass"];
export type M8aV4ItriF10PolicyPreset =
  (typeof M8A_V4_CUSTOMER_F10_POLICY_PRESETS)[number];
export type M8aV4ItriF10PolicyPresetId = M8aV4ItriF10PolicyPreset["presetId"];
export type M8aV4ItriF11RulePreset =
  (typeof M8A_V4_CUSTOMER_F11_RULE_PRESETS)[number];
export type M8aV4ItriF11RulePresetId = M8aV4ItriF11RulePreset["presetId"];

export interface M8aV4F09RateClassCopy {
  classLabel: string;
  bucketLabel: string;
  reviewLabel: string;
}

export interface M8aV4F09RateWindowRow {
  windowId: M8aV46dSimulationHandoverWindowId;
  ordinalLabel: string;
  windowLabel: string;
  orbitClass: M8aV4OrbitClass;
  networkSpeedClass: M8aV4F09NetworkSpeedClass;
  classLabel: string;
  bucketLabel: string;
  provenance: typeof M8A_V4_CUSTOMER_F09_PROVENANCE;
  metricTruth: typeof M8A_V4_CUSTOMER_F09_METRIC_TRUTH;
}

export interface M8aV4ItriRequirementStatusGroup {
  groupId: M8aV4ItriRequirementGroupId;
  label: string;
  disposition: M8aV4ItriRequirementDisposition;
  status: "closed" | "bounded" | "open";
  requirementIds: readonly string[];
  routeClaim: string;
}

export interface M8aV4ItriF16ExportRecord {
  generatedAtUtc: string;
  filename: string;
  status: "exported" | "failed";
  errorMessage: string;
}

export interface M8aV4ItriF16BoundedRateDisposition {
  requirementId: "F-09";
  disposition: typeof M8A_V4_CUSTOMER_F09_RATE_DISPOSITION;
  externalTruthDisposition:
    typeof M8A_V4_CUSTOMER_F09_EXTERNAL_TRUTH_DISPOSITION;
  currentWindowId: M8aV46dSimulationHandoverWindowId;
  currentNetworkSpeedClass: M8aV4F09NetworkSpeedClass;
  currentClassLabel: string;
  currentBucketLabel: string;
  provenance: typeof M8A_V4_CUSTOMER_F09_PROVENANCE;
  metricTruth: typeof M8A_V4_CUSTOMER_F09_METRIC_TRUTH;
  measuredThroughputClaimed:
    typeof M8A_V4_CUSTOMER_F09_MEASURED_THROUGHPUT_CLAIMED;
  rows: ReadonlyArray<M8aV4F09RateWindowRow>;
}

export interface M8aV4ItriF16RouteExportBundle {
  schemaVersion: typeof M8A_V4_CUSTOMER_F16_EXPORT_SCHEMA_VERSION;
  version: typeof M8A_V4_CUSTOMER_F16_EXPORT_SURFACE_VERSION;
  generatedAtUtc: string;
  routeId: string;
  scenarioId: string;
  endpointPair: {
    endpointPairId: string;
    precision: "operator-family-only";
    endpoints: ReadonlyArray<{
      endpointId: M8aV4EndpointId;
      label: string;
      precisionBadge: string;
      renderPrecision: "bounded-operator-family-display-anchor";
      displayPositionIsSourceTruth: false;
      rawSourceCoordinatesRenderable: false;
      orbitEvidenceChips: ReadonlyArray<string>;
    }>;
  };
  precision: "operator-family-only";
  actorCounts: Record<M8aV4OrbitClass | "total", number>;
  activeModeledWindow: {
    windowId: M8aV46dSimulationHandoverWindowId;
    windowLabel: string;
    currentPrimaryOrbitClass: M8aV4OrbitClass;
    nextCandidateOrbitClass: M8aV4OrbitClass | null;
    continuityFallbackOrbitClass: M8aV4OrbitClass;
    displayRepresentativeOrbitClass: M8aV4OrbitClass;
    boundedMetricClasses: M8aV46dWindowMetricClasses;
    modelTruth: "simulation-output-not-operator-log";
  };
  requirementStatusGroups: ReadonlyArray<M8aV4ItriRequirementStatusGroup>;
  f13ScaleReadiness: {
    version: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION;
    currentRouteActorCount: number;
    currentRouteLeoActorCount: number;
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
    publicSourceUsed:
      typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED;
    builtAtUtc: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC;
    freshnessTimestampUtc:
      typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC;
    licenseNotes: typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES;
    freshnessNotes:
      typeof M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES;
    knownGaps: ReadonlyArray<string>;
    routeNativeScaleClosureClaimed: false;
    externalValidationClosureClaimed: false;
    itriAuthorityClaimed: false;
  };
  f09BoundedRateDisposition: M8aV4ItriF16BoundedRateDisposition;
  policyRuleControls: {
    version: typeof M8A_V4_CUSTOMER_POLICY_RULE_CONTROLS_VERSION;
    disposition: typeof M8A_V4_CUSTOMER_POLICY_RULE_DISPOSITION;
    externalTruthDisposition:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_EXTERNAL_TRUTH_DISPOSITION;
    truthBoundary: typeof M8A_V4_CUSTOMER_POLICY_RULE_TRUTH_BOUNDARY;
    exportAdjacentTruth:
      typeof M8A_V4_CUSTOMER_POLICY_RULE_EXPORT_ADJACENT_TRUTH;
    activePolicyPresetId: M8aV4ItriF10PolicyPresetId;
    activeRulePresetId: M8aV4ItriF11RulePresetId;
    policyPresetMode: typeof M8A_V4_CUSTOMER_F10_POLICY_PRESET_MODE;
    rulePresetMode: typeof M8A_V4_CUSTOMER_F11_RULE_PRESET_MODE;
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
  linkFlowCueMetadata: {
    version: string;
    mode: string;
    directions: readonly string[];
    pulseCount: number;
    truthBoundary: string;
  };
  provenance: {
    exportProvenance: typeof M8A_V4_CUSTOMER_F16_EXPORT_PROVENANCE;
    generatedFromArtifactId: string;
    projectionId: string;
    projectionRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
    serviceStateRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline";
    simulationHandoverRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline";
    rawPackageSideReadOwnership: "forbidden";
    rawSourcePathsIncluded: false;
  };
  nonClaims: {
    explicitNonClaims: typeof M8A_V4_CUSTOMER_F16_EXPLICIT_NON_CLAIMS;
    routeNarrativeNonClaims: M8aV4RuntimeNarrativeNonClaims;
    measuredValuesIncluded:
      typeof M8A_V4_CUSTOMER_F16_MEASURED_VALUES_INCLUDED;
    externalReportSystemTruthClaimed:
      typeof M8A_V4_CUSTOMER_F16_EXTERNAL_REPORT_TRUTH_CLAIMED;
  };
  exportFile: {
    format: typeof M8A_V4_CUSTOMER_F16_EXPORT_FORMAT;
    filename: string;
  };
}

const M8A_V4_CUSTOMER_F09_RATE_CLASS_COPY = {
  "candidate-capacity-context-class": {
    classLabel: "Candidate capacity context",
    bucketLabel: "Candidate class",
    reviewLabel: "LEO candidate capacity proxy"
  },
  "continuity-context-class": {
    classLabel: "Continuity context",
    bucketLabel: "Continuity class",
    reviewLabel: "MEO continuity speed proxy"
  },
  "guard-context-class": {
    classLabel: "Guard context",
    bucketLabel: "Guard class",
    reviewLabel: "GEO guard speed proxy"
  }
} as const satisfies Record<M8aV4F09NetworkSpeedClass, M8aV4F09RateClassCopy>;

export function isM8aV4ItriF10PolicyPresetId(
  value: string
): value is M8aV4ItriF10PolicyPresetId {
  return M8A_V4_CUSTOMER_F10_POLICY_PRESETS.some(
    (preset) => preset.presetId === value
  );
}

export function isM8aV4ItriF11RulePresetId(
  value: string
): value is M8aV4ItriF11RulePresetId {
  return M8A_V4_CUSTOMER_F11_RULE_PRESETS.some(
    (preset) => preset.presetId === value
  );
}

export function resolveItriF10PolicyPreset(
  presetId: M8aV4ItriF10PolicyPresetId
): M8aV4ItriF10PolicyPreset {
  return M8A_V4_CUSTOMER_F10_POLICY_PRESETS.find(
    (preset) => preset.presetId === presetId
  ) ?? M8A_V4_CUSTOMER_F10_POLICY_PRESETS[0];
}

export function resolveItriF11RulePreset(
  presetId: M8aV4ItriF11RulePresetId
): M8aV4ItriF11RulePreset {
  return M8A_V4_CUSTOMER_F11_RULE_PRESETS.find(
    (preset) => preset.presetId === presetId
  ) ?? M8A_V4_CUSTOMER_F11_RULE_PRESETS[0];
}

export function resolveF09RateClassCopy(
  networkSpeedClass: M8aV4F09NetworkSpeedClass
): M8aV4F09RateClassCopy {
  return M8A_V4_CUSTOMER_F09_RATE_CLASS_COPY[networkSpeedClass];
}

export const M8A_V4_CUSTOMER_REQUIREMENT_STATUS_GROUPS = [
  {
    groupId: "route-owned-visual-baseline",
    label: "Route baseline",
    disposition: "true-route-closure",
    status: "closed",
    requirementIds: ["F-04", "F-05", "F-14", "V-01", "D-01"],
    routeClaim: "scene UI and replay baseline only"
  },
  {
    groupId: "bounded-route-representation",
    label: "Bounded route",
    disposition: "bounded-route-representation",
    status: "bounded",
    requirementIds: [
      "F-02",
      "F-03",
      "F-06",
      "F-09",
      "F-10",
      "F-11",
      "F-12",
      "F-15",
      "F-16",
      "D-02",
      "D-03"
    ],
    routeClaim:
      "modeled route context, F-09 class, F-10/F-11 replay presets, and F-16 JSON export; no route-native measurement or live control"
  },
  {
    groupId: "bounded-repo-owned-seam",
    label: "Repo seam",
    disposition: "bounded-repo-owned-seam",
    status: "open",
    requirementIds: ["F-07", "F-08", "F-17", "F-18", "P-01", "P-02", "P-03"],
    routeClaim: "named gap, not mounted here"
  },
  {
    groupId: "not-mounted-route-gap",
    label: "Not mounted",
    disposition: "not-in-this-route",
    status: "open",
    requirementIds: [],
    routeClaim: "no F-10/F-11 route gap after Phase 5; live control remains out of scope"
  },
  {
    groupId: "external-validation-gap",
    label: "External validation",
    disposition: "external-validation-required",
    status: "open",
    requirementIds: [
      "F-01",
      "F-09",
      "F-10",
      "F-11",
      "F-13",
      "F-16",
      "V-02",
      "V-03",
      "V-04",
      "V-05",
      "V-06"
    ],
    routeClaim: "outside this scene or external/live truth not claimed"
  }
] as const satisfies readonly M8aV4ItriRequirementStatusGroup[];

export const M8A_V4_CUSTOMER_REQUIREMENT_OPEN_IDS =
  M8A_V4_CUSTOMER_REQUIREMENT_STATUS_GROUPS.filter(
    (group) => group.status === "open"
  ).flatMap((group) => group.requirementIds);

export const M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_VERSION =
  "itri-demo-view-acceptance-layer-runtime.v1";
export const M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID =
  "L2-acceptance-evidence";
export const M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_TRUTH_BOUNDARY =
  "route-local bounded closure with retained external gaps";
export const M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_ARTIFACT =
  "output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json";
export const M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_GENERATED_AT_UTC =
  "2026-05-11T16:43:23.879Z";
export const M8A_V4_CUSTOMER_PHASE7_1_F13_EVIDENCE_STALE_AFTER_UTC =
  "2026-05-25T16:43:23.879Z";
export const M8A_V4_CUSTOMER_PHASE7_1_F13_LEO_COUNT = 540;
export const M8A_V4_CUSTOMER_PHASE7_1_F13_TOTAL_COUNT = 549;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_VERSION =
  "itri-demo-route-f13-scale-readiness-runtime.v1";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_TARGET_LEO_COUNT = 500;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_MODE =
  MULTI_ORBIT_SCALE_OVERLAY_MODE;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_TYPE =
  "fixture/model-backed";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_SOURCE_URL =
  "not-applicable-repo-local-fixture";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_PUBLIC_SOURCE_USED = false;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC =
  "2026-05-12T09:53:20Z";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_TIMESTAMP_UTC =
  M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_BUILT_AT_UTC;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_DATA_SOURCE_LABEL =
  "repo-local walker-derived multi-orbit scale fixture";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_FRESHNESS_NOTES =
  "Static fixture/model-backed demo input; no public-source retrieval was used for this implementation.";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_LICENSE_NOTES =
  "Uses the repo-local bundled walker TLE fixture as model input; not customer authority and not public-source authority.";
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_KNOWN_GAPS = [
  "Readiness surface only; not route-native >=500 LEO closure/proof.",
  "The handover scene remains the 13-actor service demonstration.",
  "No customer orbit-model integration or external validation closure.",
  "No live network truth, active satellite, active gateway, pair-specific path, or network performance samples.",
  "If customer requires authority-backed constellation input, controlled customer/testbed artifacts are still required."
] as const;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_NON_CLAIMS = [
  "not external validation closure",
  "not customer orbit-model integration",
  "not live network truth",
  "not active satellite/gateway/path",
  "not measured network-performance samples"
] as const;
export const M8A_V4_CUSTOMER_F13_ROUTE_NATIVE_SCALE_READINESS_COUNTS = {
  leo: MULTI_ORBIT_SCALE_OVERLAY_COUNTS.leo,
  meo: MULTI_ORBIT_SCALE_OVERLAY_COUNTS.meo,
  geo: MULTI_ORBIT_SCALE_OVERLAY_COUNTS.geo,
  total:
    MULTI_ORBIT_SCALE_OVERLAY_COUNTS.leo +
    MULTI_ORBIT_SCALE_OVERLAY_COUNTS.meo +
    MULTI_ORBIT_SCALE_OVERLAY_COUNTS.geo
} as const;
export const M8A_V4_CUSTOMER_EXTERNAL_V02_V06_VALIDATION_ARTIFACT =
  "output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/summary.json";
export const M8A_V4_CUSTOMER_EXTERNAL_V02_V06_STATUS =
  "explicit-fail-no-retained-pass";
export const M8A_V4_CUSTOMER_ACCEPTANCE_EXTERNAL_FAIL_IDS = [
  "V-02",
  "V-03",
  "V-04",
  "V-05",
  "V-06"
] as const;
export const M8A_V4_CUSTOMER_ACCEPTANCE_BOUNDED_ROUTE_REPRESENTATION_IDS = [
  "F-09",
  "F-10",
  "F-11",
  "F-16"
] as const;
export const M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS = [
  "F-01",
  "F-02",
  "F-03",
  "F-04",
  "F-05",
  "F-06",
  "F-07",
  "F-08",
  "F-09",
  "F-10",
  "F-11",
  "F-12",
  "F-13",
  "F-14",
  "F-15",
  "F-16",
  "F-17",
  "F-18",
  "V-01",
  "V-02",
  "V-03",
  "V-04",
  "V-05",
  "V-06",
  "P-01",
  "P-02",
  "P-03",
  "D-01",
  "D-02",
  "D-03"
] as const;

export type M8aV4ItriRequirementId =
  (typeof M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_IDS)[number];
export type M8aV4ItriAcceptanceLayerId =
  | "L0-first-read-demo-stage"
  | "L1-focus-inspector"
  | typeof M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID
  | "L3-engineering-archive";
export type M8aV4ItriAcceptanceStatus =
  | "closed"
  | "bounded"
  | "readiness"
  | "seam-open"
  | "external-gap"
  | "external-fail"
  | "external-evidence";
export type M8aV4ItriAcceptanceDisposition =
  | "route-local-closed"
  | "bounded-route-representation"
  | "route-native-scale-readiness"
  | "bounded-repo-owned-seam"
  | "external-integration-gap"
  | "external-validation-fail"
  | "external-phase7-1-evidence";

export interface M8aV4ItriAcceptanceCoverageRecord {
  requirementId: M8aV4ItriRequirementId;
  primaryLayer: M8aV4ItriAcceptanceLayerId;
  status: M8aV4ItriAcceptanceStatus;
  disposition: M8aV4ItriAcceptanceDisposition;
  surface: string;
  routeReality: string;
  evidenceBoundary: string;
}

export const M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS = [
  {
    requirementId: "F-01",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "external-gap",
    disposition: "external-integration-gap",
    surface: "acceptance-boundary",
    routeReality: "No live customer orbit-model integration in this route.",
    evidenceBoundary: "Integration remains outside route-local demo closure."
  },
  {
    requirementId: "F-02",
    primaryLayer: "L0-first-read-demo-stage",
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "globe-and-briefing",
    routeReality: "LEO, MEO, and GEO display-context actors are present.",
    evidenceBoundary: "Representation is the 13-actor route set, not fleet truth."
  },
  {
    requirementId: "F-03",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "source-lineage",
    routeReality: "Display actors carry source lineage.",
    evidenceBoundary: "No general TLE upload or live source workflow is mounted."
  },
  {
    requirementId: "F-04",
    primaryLayer: "L0-first-read-demo-stage",
    status: "closed",
    disposition: "route-local-closed",
    surface: "interactive-globe",
    routeReality: "Interactive 3D route is the visual center.",
    evidenceBoundary: "Closure is route-local visual/demo behavior."
  },
  {
    requirementId: "F-05",
    primaryLayer: "L0-first-read-demo-stage",
    status: "closed",
    disposition: "route-local-closed",
    surface: "default-focus-view",
    routeReality: "Default view is staged as a readable briefing.",
    evidenceBoundary: "UI closure does not close external validation."
  },
  {
    requirementId: "F-06",
    primaryLayer: "L0-first-read-demo-stage",
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "replay-controls",
    routeReality: "Pause, restart, speed, and review-mode controls are present.",
    evidenceBoundary: "Controls operate route replay only."
  },
  {
    requirementId: "F-07",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "timing-boundary",
    routeReality: "Modeled replay timing exists.",
    evidenceBoundary: "Measured communication time is not claimed."
  },
  {
    requirementId: "F-08",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "timing-statistics-boundary",
    routeReality: "Modeled timing context exists.",
    evidenceBoundary: "Communication-time statistics are not route-owned closure."
  },
  {
    requirementId: "F-09",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "f09-rate",
    routeReality: "Modeled network-speed class/proxy is displayed.",
    evidenceBoundary: "No throughput sample, ping result, or iperf truth."
  },
  {
    requirementId: "F-10",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "policy-preset",
    routeReality: "Modeled policy preset selector is mounted.",
    evidenceBoundary: "Preset-only; no live policy control."
  },
  {
    requirementId: "F-11",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "rule-preset",
    routeReality: "Bounded rule/parameter preset surface is mounted.",
    evidenceBoundary: "No arbitrary rule editor or backend rule engine."
  },
  {
    requirementId: "F-12",
    primaryLayer: "L1-focus-inspector",
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "metrics-tab",
    routeReality: "Modeled latency, continuity, rate, and state classes exist.",
    evidenceBoundary: "No latency, jitter, or throughput sample values."
  },
  {
    requirementId: "F-13",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "readiness",
    disposition: "route-native-scale-readiness",
    surface: "f13-scale-readiness",
    routeReality:
      "Route-native readiness surface reports 540 LEO / 549 total fixture/model-backed scale points.",
    evidenceBoundary:
      "Readiness only; not route-native >=500 LEO closure/proof or external validation closure."
  },
  {
    requirementId: "F-14",
    primaryLayer: "L0-first-read-demo-stage",
    status: "closed",
    disposition: "route-local-closed",
    surface: "replay-speed-controls",
    routeReality: "Replay speed controls are visible in the default route.",
    evidenceBoundary: "Replay speed is demo playback, not network timing truth."
  },
  {
    requirementId: "F-15",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "demo-mode-boundary",
    routeReality: "Bounded prerecorded/replay demo mode exists.",
    evidenceBoundary: "No full source switching workflow is mounted."
  },
  {
    requirementId: "F-16",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "f16-export",
    routeReality: "Bounded route JSON export is available.",
    evidenceBoundary: "Not external report-system or measured-result truth."
  },
  {
    requirementId: "F-17",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "rain-seam",
    routeReality: "Rain attenuation remains a named seam.",
    evidenceBoundary: "Not mounted as physical-layer truth in this route."
  },
  {
    requirementId: "F-18",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "stability-boundary",
    routeReality: "Stability evidence is retained outside this route.",
    evidenceBoundary: "No route-native 24h hardware/GPU proof."
  },
  {
    requirementId: "V-01",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "closed",
    disposition: "route-local-closed",
    surface: "local-dev-baseline",
    routeReality: "Linux/dev baseline is retained for the demo route.",
    evidenceBoundary: "This does not imply Windows/WSL or DUT closure."
  },
  {
    requirementId: "V-02",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "external-fail",
    disposition: "external-validation-fail",
    surface: "external-v02-v06",
    routeReality: "Windows/WSL retained pass evidence is missing.",
    evidenceBoundary: "Current retained package records fail/gap."
  },
  {
    requirementId: "V-03",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "external-fail",
    disposition: "external-validation-fail",
    surface: "external-v02-v06",
    routeReality: "Tunnel/bridge retained pass evidence is missing.",
    evidenceBoundary: "Current retained package records fail/gap."
  },
  {
    requirementId: "V-04",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "external-fail",
    disposition: "external-validation-fail",
    surface: "external-v02-v06",
    routeReality: "NAT/ESTNeT/INET retained pass evidence is missing.",
    evidenceBoundary: "Current retained package records fail/gap."
  },
  {
    requirementId: "V-05",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "external-fail",
    disposition: "external-validation-fail",
    surface: "external-v02-v06",
    routeReality: "Virtual DUT retained pass evidence is missing.",
    evidenceBoundary: "Current retained package records fail/gap."
  },
  {
    requirementId: "V-06",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "external-fail",
    disposition: "external-validation-fail",
    surface: "external-v02-v06",
    routeReality: "Physical DUT/NE-ONE retained pass evidence is missing.",
    evidenceBoundary: "Current retained package records fail/gap."
  },
  {
    requirementId: "P-01",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "physical-layer-seam",
    routeReality: "Antenna parameters are a named seam.",
    evidenceBoundary: "Not physical-layer truth in this route."
  },
  {
    requirementId: "P-02",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "physical-layer-seam",
    routeReality: "Rain attenuation is a named seam.",
    evidenceBoundary: "Not physical-layer truth in this route."
  },
  {
    requirementId: "P-03",
    primaryLayer: M8A_V4_CUSTOMER_DEMO_VIEW_ACCEPTANCE_LAYER_ID,
    status: "seam-open",
    disposition: "bounded-repo-owned-seam",
    surface: "physical-layer-seam",
    routeReality: "ITU factors are a named seam.",
    evidenceBoundary: "Not physical-layer truth in this route."
  },
  {
    requirementId: "D-01",
    primaryLayer: "L0-first-read-demo-stage",
    status: "closed",
    disposition: "route-local-closed",
    surface: "default-focus-view",
    routeReality: "Visual/demo value is staged as the primary route view.",
    evidenceBoundary: "Demo quality does not close external validation."
  },
  {
    requirementId: "D-02",
    primaryLayer: "L0-first-read-demo-stage",
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "replay-demo-mode",
    routeReality: "Bounded replay demo is present.",
    evidenceBoundary: "Replay is not live network truth."
  },
  {
    requirementId: "D-03",
    primaryLayer: "L0-first-read-demo-stage",
    status: "bounded",
    disposition: "bounded-route-representation",
    surface: "handover-briefing",
    routeReality: "Communication, switch, satellite, and link state are expressed.",
    evidenceBoundary: "Expression is staged route context, not measured state."
  }
] as const satisfies readonly M8aV4ItriAcceptanceCoverageRecord[];

export const M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_STATUS_PAIRS =
  M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS.map(
    (record) => `${record.requirementId}:${record.status}`
  );
export const M8A_V4_CUSTOMER_ACCEPTANCE_REQUIREMENT_LAYER_PAIRS =
  M8A_V4_CUSTOMER_ACCEPTANCE_COVERAGE_RECORDS.map(
    (record) => `${record.requirementId}:${record.primaryLayer}`
  );
