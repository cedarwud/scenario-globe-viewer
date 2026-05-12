export const HANDOVER_DECISION_REPORT_SCHEMA_VERSION =
  "phase6.4-bootstrap-handover-decision-report.v1";
export const HANDOVER_DECISION_PROXY_PROVENANCE = "bounded-proxy" as const;
export const HANDOVER_DECISION_PROXY_PROVENANCE_LABEL =
  HANDOVER_DECISION_PROXY_PROVENANCE;
export const HANDOVER_DECISION_PROXY_PROVENANCE_NOTE =
  "Bounded proxy inputs; not final network truth.";
export const HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL =
  "Deterministic bootstrap candidate metrics used for repo-owned handover evaluation; not measured latency, jitter, or throughput truth.";

export type OrbitClass = "leo" | "meo" | "geo";
export type DecisionInputProvenance = typeof HANDOVER_DECISION_PROXY_PROVENANCE;
export type HandoverDecisionKind = "hold" | "switch" | "unavailable";
export type HandoverDecisionModel = "service-layer-switching";
export type HandoverTruthState = "serving" | "switching" | "unavailable";
export type HandoverTruthBoundaryLabel =
  "real-pairing-bounded-runtime-projection";
export type SelectableHandoverPolicyId =
  (typeof SELECTABLE_HANDOVER_POLICY_IDS)[number];
export type HandoverPolicyId =
  | SelectableHandoverPolicyId
  | typeof HANDOVER_UNSUPPORTED_POLICY_ID;
export type HandoverPolicyTieBreak =
  | "latency"
  | "jitter"
  | "speed"
  | "stable-serving";
export type HandoverReasonSignalCode =
  | "latency-better"
  | "jitter-better"
  | "network-speed-better"
  | "current-link-unavailable"
  | "policy-weighted-override"
  | "policy-hold"
  | "tie-break";

export interface HandoverPolicyWeights {
  latencyMs: number;
  jitterMs: number;
  networkSpeedMbps: number;
}

export interface HandoverPolicyDescriptor {
  id: HandoverPolicyId;
  label: string;
  summary: string;
  weights: HandoverPolicyWeights;
  tieBreak: ReadonlyArray<HandoverPolicyTieBreak>;
}

export interface HandoverRuleConfig {
  policyId: HandoverPolicyId;
  weights: HandoverPolicyWeights;
  tieBreakOrder: ReadonlyArray<HandoverPolicyTieBreak>;
  minDwellTicks: number;
  hysteresisMargin: number;
  appliedAt: string;
  provenanceKind: DecisionInputProvenance;
}

export interface HandoverRuleConfigValidationIssue {
  field: string;
  message: string;
}

export const HANDOVER_RULE_CONFIG_SCHEMA_VERSION =
  "m8a-v4.12-f11-handover-rule-config.v1";
export const HANDOVER_RULE_CONFIG_DEFAULT_APPLIED_AT =
  "2026-05-12T00:00:00.000Z";
export const HANDOVER_RULE_CONFIG_WEIGHT_RANGE = {
  min: 0,
  max: 10,
  step: 0.1
} as const;
export const HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE = {
  min: 0,
  max: 60,
  step: 1
} as const;
export const HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE = {
  min: 0,
  max: 10,
  step: 0.1
} as const;
export const HANDOVER_RULE_CONFIG_TIE_BREAK_ORDER: ReadonlyArray<HandoverPolicyTieBreak> = [
  "latency",
  "jitter",
  "speed",
  "stable-serving"
];

export const SELECTABLE_HANDOVER_POLICY_IDS = [
  "bootstrap-balanced-v1",
  "bootstrap-latency-priority-v1",
  "bootstrap-throughput-priority-v1"
] as const;
export const DEFAULT_HANDOVER_POLICY_ID: SelectableHandoverPolicyId =
  "bootstrap-balanced-v1";
export const HANDOVER_UNSUPPORTED_POLICY_ID =
  "bootstrap-unsupported-scenario-noop-v1" as const;

export const HANDOVER_POLICY_DESCRIPTORS: ReadonlyArray<HandoverPolicyDescriptor> = [
  {
    id: "bootstrap-balanced-v1",
    label: "Balanced handover policy",
    summary:
      "Weights latency, jitter, and modeled speed evenly for bounded service-layer selection.",
    weights: {
      latencyMs: 1,
      jitterMs: 1,
      networkSpeedMbps: 1
    },
    tieBreak: ["latency", "jitter", "speed", "stable-serving"]
  },
  {
    id: "bootstrap-latency-priority-v1",
    label: "Latency priority policy",
    summary:
      "Prioritizes lower bounded latency while still considering jitter and modeled speed.",
    weights: {
      latencyMs: 3,
      jitterMs: 1,
      networkSpeedMbps: 1
    },
    tieBreak: ["latency", "jitter", "stable-serving", "speed"]
  },
  {
    id: "bootstrap-throughput-priority-v1",
    label: "Throughput priority policy",
    summary:
      "Prioritizes higher modeled network speed while staying inside bounded proxy inputs.",
    weights: {
      latencyMs: 1,
      jitterMs: 1,
      networkSpeedMbps: 3
    },
    tieBreak: ["speed", "latency", "jitter", "stable-serving"]
  }
];

const HANDOVER_UNSUPPORTED_POLICY_DESCRIPTOR: HandoverPolicyDescriptor = {
  id: HANDOVER_UNSUPPORTED_POLICY_ID,
  label: "Unsupported scenario no-op policy",
  summary:
    "No bounded bootstrap handover policy is available for this scenario.",
  weights: {
    latencyMs: 0,
    jitterMs: 0,
    networkSpeedMbps: 0
  },
  tieBreak: []
};

const HANDOVER_POLICY_DESCRIPTOR_BY_ID = new Map<string, HandoverPolicyDescriptor>(
  [
    ...HANDOVER_POLICY_DESCRIPTORS,
    HANDOVER_UNSUPPORTED_POLICY_DESCRIPTOR
  ].map((descriptor) => [descriptor.id, descriptor])
);

function createDefaultRuleConfig(
  policy: HandoverPolicyDescriptor,
  appliedAt: string = HANDOVER_RULE_CONFIG_DEFAULT_APPLIED_AT
): HandoverRuleConfig {
  return {
    policyId: policy.id,
    weights: {
      latencyMs: policy.weights.latencyMs,
      jitterMs: policy.weights.jitterMs,
      networkSpeedMbps: policy.weights.networkSpeedMbps
    },
    tieBreakOrder:
      policy.tieBreak.length > 0
        ? [...policy.tieBreak]
        : [...HANDOVER_RULE_CONFIG_TIE_BREAK_ORDER],
    minDwellTicks: 0,
    hysteresisMargin: 0,
    appliedAt,
    provenanceKind: HANDOVER_DECISION_PROXY_PROVENANCE
  };
}

export const DEFAULT_HANDOVER_RULE_CONFIGS: ReadonlyArray<HandoverRuleConfig> =
  HANDOVER_POLICY_DESCRIPTORS.map((policy) => createDefaultRuleConfig(policy));

const DEFAULT_HANDOVER_RULE_CONFIG_BY_ID = new Map<string, HandoverRuleConfig>(
  [
    ...DEFAULT_HANDOVER_RULE_CONFIGS,
    createDefaultRuleConfig(HANDOVER_UNSUPPORTED_POLICY_DESCRIPTOR)
  ].map((config) => [config.policyId, config])
);

export interface HandoverCandidateMetrics {
  candidateId: string;
  orbitClass: OrbitClass;
  latencyMs: number;
  jitterMs: number;
  networkSpeedMbps: number;
  provenance: DecisionInputProvenance;
}

export interface HandoverDecisionSnapshot {
  scenarioId: string;
  evaluatedAt: string;
  activeRange: {
    start: string;
    stop: string;
  };
  currentServingCandidateId?: string;
  policyId: string;
  policyLabel?: string;
  policySummary?: string;
  policyTieBreak?: ReadonlyArray<HandoverPolicyTieBreak>;
  appliedRuleConfig?: HandoverRuleConfig;
  decisionModel?: HandoverDecisionModel;
  isNativeRfHandover?: boolean;
  candidates: ReadonlyArray<HandoverCandidateMetrics>;
}

export interface HandoverReasonSignal {
  code: HandoverReasonSignalCode;
}

export interface HandoverDecisionResult {
  decisionKind: HandoverDecisionKind;
  servingCandidateId?: string;
  servingOrbitClass?: OrbitClass;
  previousCandidateId?: string;
  reasonSignals: ReadonlyArray<HandoverReasonSignal>;
  semanticsBridge: {
    truthState: HandoverTruthState;
    truthBoundaryLabel?: HandoverTruthBoundaryLabel;
  };
}

export interface HandoverDecisionProvenance {
  inputKind: DecisionInputProvenance;
  label: string;
  note: string;
  detail: string;
}

export interface HandoverDecisionReport {
  schemaVersion: typeof HANDOVER_DECISION_REPORT_SCHEMA_VERSION;
  policyId: string;
  policyLabel: string;
  policySummary: string;
  policyTieBreak: ReadonlyArray<HandoverPolicyTieBreak>;
  appliedRuleConfig: HandoverRuleConfig;
  provenance: HandoverDecisionProvenance;
  snapshot: HandoverDecisionSnapshot;
  result: HandoverDecisionResult;
}

export interface HandoverDecisionState {
  snapshot: HandoverDecisionSnapshot;
  result: HandoverDecisionResult;
  provenance: HandoverDecisionProvenance;
  report: HandoverDecisionReport;
}

interface RankedCandidate {
  candidate: HandoverCandidateMetrics;
  weightedScore: number;
}

const REASON_SIGNAL_ORDER = [
  "current-link-unavailable",
  "latency-better",
  "jitter-better",
  "network-speed-better",
  "policy-weighted-override",
  "policy-hold",
  "tie-break"
] as const satisfies ReadonlyArray<HandoverReasonSignalCode>;

export function isSelectableHandoverPolicyId(
  value: string
): value is SelectableHandoverPolicyId {
  return SELECTABLE_HANDOVER_POLICY_IDS.includes(
    value as SelectableHandoverPolicyId
  );
}

export function resolveHandoverPolicyDescriptor(
  policyId: string
): HandoverPolicyDescriptor {
  const descriptor = HANDOVER_POLICY_DESCRIPTOR_BY_ID.get(policyId);

  if (!descriptor) {
    throw new Error(`Unsupported handover policy id: ${policyId}`);
  }

  return descriptor;
}

export function listHandoverPolicyDescriptors(): ReadonlyArray<HandoverPolicyDescriptor> {
  return HANDOVER_POLICY_DESCRIPTORS;
}

export function resolveDefaultHandoverRuleConfig(
  policyId: string,
  appliedAt: string = HANDOVER_RULE_CONFIG_DEFAULT_APPLIED_AT
): HandoverRuleConfig {
  const defaultConfig = DEFAULT_HANDOVER_RULE_CONFIG_BY_ID.get(policyId);

  if (!defaultConfig) {
    throw new Error(`Unsupported handover rule config policy id: ${policyId}`);
  }

  return {
    ...cloneHandoverRuleConfig(defaultConfig),
    appliedAt
  };
}

export function listDefaultHandoverRuleConfigs(): ReadonlyArray<HandoverRuleConfig> {
  return DEFAULT_HANDOVER_RULE_CONFIGS.map((config) =>
    cloneHandoverRuleConfig(config)
  );
}

function hasAtMostOneDecimalPlace(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < Number.EPSILON;
}

function validateBoundedNumber(options: {
  value: number;
  field: string;
  label: string;
  min: number;
  max: number;
  decimal: boolean;
}): HandoverRuleConfigValidationIssue[] {
  const issues: HandoverRuleConfigValidationIssue[] = [];

  if (!Number.isFinite(options.value)) {
    return [
      {
        field: options.field,
        message: `${options.label} must be a finite number.`
      }
    ];
  }

  if (options.value < options.min || options.value > options.max) {
    issues.push({
      field: options.field,
      message: `${options.label} must be between ${options.min} and ${options.max}.`
    });
  }

  if (options.decimal) {
    if (!hasAtMostOneDecimalPlace(options.value)) {
      issues.push({
        field: options.field,
        message: `${options.label} supports one decimal place.`
      });
    }
  } else if (!Number.isInteger(options.value)) {
    issues.push({
      field: options.field,
      message: `${options.label} must be an integer.`
    });
  }

  return issues;
}

function validateTieBreakOrder(
  tieBreakOrder: ReadonlyArray<HandoverPolicyTieBreak>
): HandoverRuleConfigValidationIssue[] {
  const expected = [...HANDOVER_RULE_CONFIG_TIE_BREAK_ORDER].sort();
  const actual = [...tieBreakOrder].sort();

  if (
    tieBreakOrder.length !== HANDOVER_RULE_CONFIG_TIE_BREAK_ORDER.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    return [
      {
        field: "tieBreakOrder",
        message:
          "Tie-break order must use latency, jitter, speed, and stable-serving exactly once."
      }
    ];
  }

  return [];
}

export function validateHandoverRuleConfig(
  config: HandoverRuleConfig
): ReadonlyArray<HandoverRuleConfigValidationIssue> {
  const issues: HandoverRuleConfigValidationIssue[] = [];

  try {
    resolveHandoverPolicyDescriptor(config.policyId);
  } catch {
    issues.push({
      field: "policyId",
      message: `Unsupported handover rule policy id: ${config.policyId}`
    });
  }

  if (config.provenanceKind !== HANDOVER_DECISION_PROXY_PROVENANCE) {
    issues.push({
      field: "provenanceKind",
      message: "Rule config provenance must stay bounded-proxy."
    });
  }

  issues.push(
    ...validateBoundedNumber({
      value: config.weights.latencyMs,
      field: "weights.latencyMs",
      label: "Latency weight",
      min: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.min,
      max: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.max,
      decimal: true
    }),
    ...validateBoundedNumber({
      value: config.weights.jitterMs,
      field: "weights.jitterMs",
      label: "Jitter weight",
      min: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.min,
      max: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.max,
      decimal: true
    }),
    ...validateBoundedNumber({
      value: config.weights.networkSpeedMbps,
      field: "weights.networkSpeedMbps",
      label: "Modeled speed weight",
      min: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.min,
      max: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.max,
      decimal: true
    }),
    ...validateBoundedNumber({
      value: config.minDwellTicks,
      field: "minDwellTicks",
      label: "Minimum dwell ticks",
      min: HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE.min,
      max: HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE.max,
      decimal: false
    }),
    ...validateBoundedNumber({
      value: config.hysteresisMargin,
      field: "hysteresisMargin",
      label: "Hysteresis margin",
      min: HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE.min,
      max: HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE.max,
      decimal: true
    }),
    ...validateTieBreakOrder(config.tieBreakOrder)
  );

  if (
    config.weights.latencyMs === 0 &&
    config.weights.jitterMs === 0 &&
    config.weights.networkSpeedMbps === 0 &&
    config.policyId !== HANDOVER_UNSUPPORTED_POLICY_ID
  ) {
    issues.push({
      field: "weights",
      message: "At least one rule weight must be greater than zero."
    });
  }

  if (!config.appliedAt.trim()) {
    issues.push({
      field: "appliedAt",
      message: "Applied timestamp is required."
    });
  }

  return issues;
}

export function assertHandoverRuleConfig(config: HandoverRuleConfig): void {
  const issues = validateHandoverRuleConfig(config);

  if (issues.length > 0) {
    throw new Error(
      `Invalid handover rule config: ${issues
        .map((issue) => `${issue.field}: ${issue.message}`)
        .join("; ")}`
    );
  }
}

function toEpochMilliseconds(value: string): number {
  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Handover decision timestamp must parse: ${value}`);
  }

  return epochMs;
}

function cloneCandidateMetrics(
  candidate: HandoverCandidateMetrics
): HandoverCandidateMetrics {
  return {
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
    latencyMs: candidate.latencyMs,
    jitterMs: candidate.jitterMs,
    networkSpeedMbps: candidate.networkSpeedMbps,
    provenance: candidate.provenance
  };
}

export function cloneHandoverRuleConfig(
  config: HandoverRuleConfig
): HandoverRuleConfig {
  return {
    policyId: config.policyId,
    weights: {
      latencyMs: config.weights.latencyMs,
      jitterMs: config.weights.jitterMs,
      networkSpeedMbps: config.weights.networkSpeedMbps
    },
    tieBreakOrder: [...config.tieBreakOrder],
    minDwellTicks: config.minDwellTicks,
    hysteresisMargin: config.hysteresisMargin,
    appliedAt: config.appliedAt,
    provenanceKind: config.provenanceKind
  };
}

function cloneSnapshot(
  snapshot: HandoverDecisionSnapshot
): HandoverDecisionSnapshot {
  return {
    scenarioId: snapshot.scenarioId,
    evaluatedAt: snapshot.evaluatedAt,
    activeRange: {
      start: snapshot.activeRange.start,
      stop: snapshot.activeRange.stop
    },
    ...(snapshot.currentServingCandidateId
      ? { currentServingCandidateId: snapshot.currentServingCandidateId }
      : {}),
    policyId: snapshot.policyId,
    ...(snapshot.policyLabel ? { policyLabel: snapshot.policyLabel } : {}),
    ...(snapshot.policySummary ? { policySummary: snapshot.policySummary } : {}),
    ...(snapshot.policyTieBreak
      ? { policyTieBreak: [...snapshot.policyTieBreak] }
      : {}),
    ...(snapshot.appliedRuleConfig
      ? { appliedRuleConfig: cloneHandoverRuleConfig(snapshot.appliedRuleConfig) }
      : {}),
    ...(snapshot.decisionModel
      ? { decisionModel: snapshot.decisionModel }
      : {}),
    ...(snapshot.isNativeRfHandover !== undefined
      ? { isNativeRfHandover: snapshot.isNativeRfHandover }
      : {}),
    candidates: snapshot.candidates.map((candidate) => cloneCandidateMetrics(candidate))
  };
}

function attachPolicyDescriptorToSnapshot(
  snapshot: HandoverDecisionSnapshot,
  policy: HandoverPolicyDescriptor,
  ruleConfig: HandoverRuleConfig
): HandoverDecisionSnapshot {
  return {
    ...snapshot,
    policyLabel: policy.label,
    policySummary: policy.summary,
    policyTieBreak: [...policy.tieBreak],
    appliedRuleConfig: cloneHandoverRuleConfig(ruleConfig)
  };
}

function cloneResult(result: HandoverDecisionResult): HandoverDecisionResult {
  return {
    decisionKind: result.decisionKind,
    ...(result.servingCandidateId
      ? { servingCandidateId: result.servingCandidateId }
      : {}),
    ...(result.servingOrbitClass
      ? { servingOrbitClass: result.servingOrbitClass }
      : {}),
    ...(result.previousCandidateId
      ? { previousCandidateId: result.previousCandidateId }
      : {}),
    reasonSignals: result.reasonSignals.map((signal) => ({
      code: signal.code
    })),
    semanticsBridge: {
      truthState: result.semanticsBridge.truthState,
      ...(result.semanticsBridge.truthBoundaryLabel
        ? {
            truthBoundaryLabel: result.semanticsBridge.truthBoundaryLabel
          }
        : {})
    }
  };
}

function assertFiniteMetric(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Handover decision metric must stay finite and non-negative: ${label}`);
  }
}

function assertSnapshot(snapshot: HandoverDecisionSnapshot): void {
  if (!snapshot.scenarioId) {
    throw new Error("Handover decision snapshot must include a scenarioId.");
  }

  if (!snapshot.policyId) {
    throw new Error("Handover decision snapshot must include a policyId.");
  }

  resolveHandoverPolicyDescriptor(snapshot.policyId);

  if (snapshot.appliedRuleConfig) {
    assertHandoverRuleConfig(snapshot.appliedRuleConfig);

    if (snapshot.appliedRuleConfig.policyId !== snapshot.policyId) {
      throw new Error(
        "Handover decision applied rule config policyId must match snapshot policyId."
      );
    }
  }

  if (
    snapshot.decisionModel !== undefined &&
    snapshot.decisionModel !== "service-layer-switching"
  ) {
    throw new Error(
      "Handover decision snapshot decisionModel must stay on the approved bounded value."
    );
  }

  if (
    snapshot.isNativeRfHandover !== undefined &&
    typeof snapshot.isNativeRfHandover !== "boolean"
  ) {
    throw new Error(
      "Handover decision snapshot isNativeRfHandover must stay boolean when provided."
    );
  }

  const startMs = toEpochMilliseconds(snapshot.activeRange.start);
  const stopMs = toEpochMilliseconds(snapshot.activeRange.stop);
  const evaluatedAtMs = toEpochMilliseconds(snapshot.evaluatedAt);

  if (startMs > stopMs) {
    throw new Error("Handover decision activeRange start must not exceed stop.");
  }

  if (evaluatedAtMs < startMs || evaluatedAtMs > stopMs) {
    throw new Error(
      "Handover decision evaluatedAt must stay within the activeRange."
    );
  }

  const candidateIds = new Set<string>();

  for (const candidate of snapshot.candidates) {
    if (!candidate.candidateId) {
      throw new Error("Handover decision candidates must include candidateId.");
    }

    if (candidateIds.has(candidate.candidateId)) {
      throw new Error(
        `Handover decision candidate ids must stay unique: ${candidate.candidateId}`
      );
    }

    if (candidate.provenance !== HANDOVER_DECISION_PROXY_PROVENANCE) {
      throw new Error(
        `Handover decision candidate provenance must stay bounded-proxy: ${candidate.candidateId}`
      );
    }

    assertFiniteMetric(candidate.latencyMs, `${candidate.candidateId}.latencyMs`);
    assertFiniteMetric(candidate.jitterMs, `${candidate.candidateId}.jitterMs`);
    assertFiniteMetric(
      candidate.networkSpeedMbps,
      `${candidate.candidateId}.networkSpeedMbps`
    );
    candidateIds.add(candidate.candidateId);
  }
}

function rankCandidates(
  candidates: ReadonlyArray<HandoverCandidateMetrics>,
  ruleConfig: HandoverRuleConfig
): RankedCandidate[] {
  const lowestLatency = Math.min(...candidates.map((candidate) => candidate.latencyMs));
  const lowestJitter = Math.min(...candidates.map((candidate) => candidate.jitterMs));
  const highestNetworkSpeed = Math.max(
    ...candidates.map((candidate) => candidate.networkSpeedMbps)
  );

  return candidates.map((candidate) => ({
    candidate,
    weightedScore:
      Number(candidate.latencyMs === lowestLatency) *
        ruleConfig.weights.latencyMs +
      Number(candidate.jitterMs === lowestJitter) * ruleConfig.weights.jitterMs +
      Number(candidate.networkSpeedMbps === highestNetworkSpeed) *
        ruleConfig.weights.networkSpeedMbps
  }));
}

function compareRankedCandidates(
  left: RankedCandidate,
  right: RankedCandidate,
  ruleConfig: HandoverRuleConfig,
  currentServingCandidateId: string | undefined
): number {
  if (left.weightedScore !== right.weightedScore) {
    return right.weightedScore - left.weightedScore;
  }

  for (const tieBreak of ruleConfig.tieBreakOrder) {
    switch (tieBreak) {
      case "latency":
        if (left.candidate.latencyMs !== right.candidate.latencyMs) {
          return left.candidate.latencyMs - right.candidate.latencyMs;
        }
        break;
      case "jitter":
        if (left.candidate.jitterMs !== right.candidate.jitterMs) {
          return left.candidate.jitterMs - right.candidate.jitterMs;
        }
        break;
      case "speed":
        if (left.candidate.networkSpeedMbps !== right.candidate.networkSpeedMbps) {
          return (
            right.candidate.networkSpeedMbps - left.candidate.networkSpeedMbps
          );
        }
        break;
      case "stable-serving": {
        const leftStable =
          left.candidate.candidateId === currentServingCandidateId ? 1 : 0;
        const rightStable =
          right.candidate.candidateId === currentServingCandidateId ? 1 : 0;

        if (leftStable !== rightStable) {
          return rightStable - leftStable;
        }
        break;
      }
    }
  }

  return left.candidate.candidateId.localeCompare(right.candidate.candidateId);
}

function resolveBestCandidate(
  candidates: ReadonlyArray<HandoverCandidateMetrics>,
  ruleConfig: HandoverRuleConfig,
  currentServingCandidateId: string | undefined
): {
  bestCandidate: HandoverCandidateMetrics;
  bestWeightedScore: number;
  currentWeightedScore?: number;
  tieBreakUsed: boolean;
} {
  const rankedCandidates = rankCandidates(candidates, ruleConfig).sort((left, right) =>
    compareRankedCandidates(left, right, ruleConfig, currentServingCandidateId)
  );
  const bestCandidate = rankedCandidates[0];
  const runnerUp = rankedCandidates[1];
  const currentRankedCandidate = rankedCandidates.find(
    (rankedCandidate) =>
      rankedCandidate.candidate.candidateId === currentServingCandidateId
  );

  return {
    bestCandidate: cloneCandidateMetrics(bestCandidate.candidate),
    bestWeightedScore: bestCandidate.weightedScore,
    ...(currentRankedCandidate
      ? { currentWeightedScore: currentRankedCandidate.weightedScore }
      : {}),
    tieBreakUsed:
      runnerUp !== undefined &&
      runnerUp.weightedScore === bestCandidate.weightedScore
  };
}

function resolveReasonSignals(
  codes: ReadonlySet<HandoverReasonSignalCode>
): ReadonlyArray<HandoverReasonSignal> {
  return REASON_SIGNAL_ORDER.filter((code) => codes.has(code)).map((code) => ({
    code
  }));
}

function resolveCurrentCandidate(
  snapshot: HandoverDecisionSnapshot
): HandoverCandidateMetrics | undefined {
  if (!snapshot.currentServingCandidateId) {
    return undefined;
  }

  const currentCandidate = snapshot.candidates.find(
    (candidate) => candidate.candidateId === snapshot.currentServingCandidateId
  );

  return currentCandidate ? cloneCandidateMetrics(currentCandidate) : undefined;
}

function createUnavailableResult(
  snapshot: HandoverDecisionSnapshot
): HandoverDecisionResult {
  const reasonCodes = new Set<HandoverReasonSignalCode>();

  if (snapshot.currentServingCandidateId) {
    reasonCodes.add("current-link-unavailable");
  }

  return {
    decisionKind: "unavailable",
    ...(snapshot.currentServingCandidateId
      ? { previousCandidateId: snapshot.currentServingCandidateId }
      : {}),
    reasonSignals: resolveReasonSignals(reasonCodes),
    semanticsBridge: {
      truthState: "unavailable"
    }
  };
}

function resolveRuleConfigForSnapshot(
  snapshot: HandoverDecisionSnapshot
): HandoverRuleConfig {
  return snapshot.appliedRuleConfig
    ? cloneHandoverRuleConfig(snapshot.appliedRuleConfig)
    : resolveDefaultHandoverRuleConfig(snapshot.policyId);
}

function resolveModeledDwellTicks(snapshot: HandoverDecisionSnapshot): number {
  const startMs = toEpochMilliseconds(snapshot.activeRange.start);
  const stopMs = toEpochMilliseconds(snapshot.activeRange.stop);
  const evaluatedAtMs = toEpochMilliseconds(snapshot.evaluatedAt);
  const activeRangeMs = Math.max(1, stopMs - startMs);
  const elapsedRatio = Math.max(
    0,
    Math.min(1, (evaluatedAtMs - startMs) / activeRangeMs)
  );

  return Math.floor(elapsedRatio * HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE.max);
}

function shouldHoldForRuleWindow(options: {
  snapshot: HandoverDecisionSnapshot;
  ruleConfig: HandoverRuleConfig;
  currentCandidate: HandoverCandidateMetrics | undefined;
  bestCandidate: HandoverCandidateMetrics;
  bestWeightedScore: number;
  currentWeightedScore?: number;
}): boolean {
  if (
    !options.currentCandidate ||
    options.currentCandidate.candidateId === options.bestCandidate.candidateId
  ) {
    return false;
  }

  if (
    options.ruleConfig.minDwellTicks > 0 &&
    resolveModeledDwellTicks(options.snapshot) < options.ruleConfig.minDwellTicks
  ) {
    return true;
  }

  if (
    options.ruleConfig.hysteresisMargin > 0 &&
    options.currentWeightedScore !== undefined &&
    options.bestWeightedScore - options.currentWeightedScore <=
      options.ruleConfig.hysteresisMargin
  ) {
    return true;
  }

  return false;
}

function createHandoverDecisionReport(
  policy: HandoverPolicyDescriptor,
  ruleConfig: HandoverRuleConfig,
  provenance: HandoverDecisionProvenance,
  snapshot: HandoverDecisionSnapshot,
  result: HandoverDecisionResult
): HandoverDecisionReport {
  return {
    schemaVersion: HANDOVER_DECISION_REPORT_SCHEMA_VERSION,
    policyId: snapshot.policyId,
    policyLabel: policy.label,
    policySummary: policy.summary,
    policyTieBreak: [...policy.tieBreak],
    appliedRuleConfig: cloneHandoverRuleConfig(ruleConfig),
    provenance,
    snapshot: cloneSnapshot(snapshot),
    result: cloneResult(result)
  };
}

export function evaluateHandoverDecisionSnapshot(
  snapshot: HandoverDecisionSnapshot
): HandoverDecisionState {
  assertSnapshot(snapshot);

  const policy = resolveHandoverPolicyDescriptor(snapshot.policyId);
  const ruleConfig = resolveRuleConfigForSnapshot(snapshot);
  const clonedSnapshot = attachPolicyDescriptorToSnapshot(
    cloneSnapshot(snapshot),
    policy,
    ruleConfig
  );

  if (clonedSnapshot.candidates.length === 0) {
    const result = createUnavailableResult(clonedSnapshot);
    const provenance: HandoverDecisionProvenance = {
      inputKind: HANDOVER_DECISION_PROXY_PROVENANCE,
      label: HANDOVER_DECISION_PROXY_PROVENANCE_LABEL,
      note: HANDOVER_DECISION_PROXY_PROVENANCE_NOTE,
      detail: HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL
    };

    return {
      snapshot: clonedSnapshot,
      result,
      provenance,
      report: createHandoverDecisionReport(
        policy,
        ruleConfig,
        provenance,
        clonedSnapshot,
        result
      )
    };
  }

  const currentCandidate = resolveCurrentCandidate(clonedSnapshot);
  const {
    bestCandidate,
    bestWeightedScore,
    currentWeightedScore,
    tieBreakUsed
  } = resolveBestCandidate(
    clonedSnapshot.candidates,
    ruleConfig,
    clonedSnapshot.currentServingCandidateId
  );
  const balancedPolicy = resolveHandoverPolicyDescriptor(DEFAULT_HANDOVER_POLICY_ID);
  const balancedRuleConfig = resolveDefaultHandoverRuleConfig(balancedPolicy.id);
  const balancedBestCandidate =
    ruleConfig.policyId === DEFAULT_HANDOVER_POLICY_ID &&
    ruleConfig.weights.latencyMs === balancedRuleConfig.weights.latencyMs &&
    ruleConfig.weights.jitterMs === balancedRuleConfig.weights.jitterMs &&
    ruleConfig.weights.networkSpeedMbps ===
      balancedRuleConfig.weights.networkSpeedMbps &&
    ruleConfig.tieBreakOrder.join(",") ===
      balancedRuleConfig.tieBreakOrder.join(",")
      ? bestCandidate
      : resolveBestCandidate(
          clonedSnapshot.candidates,
          balancedRuleConfig,
          clonedSnapshot.currentServingCandidateId
        ).bestCandidate;
  const policyWeightedOverrideUsed =
    balancedBestCandidate.candidateId !== bestCandidate.candidateId;
  const ruleWindowHold = shouldHoldForRuleWindow({
    snapshot: clonedSnapshot,
    ruleConfig,
    currentCandidate,
    bestCandidate,
    bestWeightedScore,
    currentWeightedScore
  });
  const reasonCodes = new Set<HandoverReasonSignalCode>();

  let result: HandoverDecisionResult;

  if (!currentCandidate) {
    if (clonedSnapshot.currentServingCandidateId) {
      reasonCodes.add("current-link-unavailable");
      if (policyWeightedOverrideUsed) {
        reasonCodes.add("policy-weighted-override");
      }
      if (tieBreakUsed) {
        reasonCodes.add("tie-break");
      }

      result = {
        decisionKind: "switch",
        servingCandidateId: bestCandidate.candidateId,
        servingOrbitClass: bestCandidate.orbitClass,
        previousCandidateId: clonedSnapshot.currentServingCandidateId,
        reasonSignals: resolveReasonSignals(reasonCodes),
        semanticsBridge: {
          truthState: "switching"
        }
      };
    } else {
      reasonCodes.add("policy-hold");
      if (policyWeightedOverrideUsed) {
        reasonCodes.add("policy-weighted-override");
      }
      if (tieBreakUsed) {
        reasonCodes.add("tie-break");
      }

      result = {
        decisionKind: "hold",
        servingCandidateId: bestCandidate.candidateId,
        servingOrbitClass: bestCandidate.orbitClass,
        reasonSignals: resolveReasonSignals(reasonCodes),
        semanticsBridge: {
          truthState: "serving"
        }
      };
    }
  } else if (
    currentCandidate.candidateId === bestCandidate.candidateId ||
    ruleWindowHold
  ) {
    reasonCodes.add("policy-hold");
    if (policyWeightedOverrideUsed) {
      reasonCodes.add("policy-weighted-override");
    }
    if (tieBreakUsed) {
      reasonCodes.add("tie-break");
    }

    result = {
      decisionKind: "hold",
      servingCandidateId: currentCandidate.candidateId,
      servingOrbitClass: currentCandidate.orbitClass,
      reasonSignals: resolveReasonSignals(reasonCodes),
      semanticsBridge: {
        truthState: "serving"
      }
    };
  } else {
    if (bestCandidate.latencyMs < currentCandidate.latencyMs) {
      reasonCodes.add("latency-better");
    }
    if (bestCandidate.jitterMs < currentCandidate.jitterMs) {
      reasonCodes.add("jitter-better");
    }
    if (bestCandidate.networkSpeedMbps > currentCandidate.networkSpeedMbps) {
      reasonCodes.add("network-speed-better");
    }
    if (policyWeightedOverrideUsed) {
      reasonCodes.add("policy-weighted-override");
    }
    if (reasonCodes.size === 0 || tieBreakUsed) {
      reasonCodes.add("tie-break");
    }

    result = {
      decisionKind: "switch",
      servingCandidateId: bestCandidate.candidateId,
      servingOrbitClass: bestCandidate.orbitClass,
      previousCandidateId: currentCandidate.candidateId,
      reasonSignals: resolveReasonSignals(reasonCodes),
      semanticsBridge: {
        truthState: "switching"
      }
    };
  }

  const provenance: HandoverDecisionProvenance = {
    inputKind: HANDOVER_DECISION_PROXY_PROVENANCE,
    label: HANDOVER_DECISION_PROXY_PROVENANCE_LABEL,
    note: HANDOVER_DECISION_PROXY_PROVENANCE_NOTE,
    detail: HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL
  };

  return {
    snapshot: clonedSnapshot,
    result,
    provenance,
    report: createHandoverDecisionReport(
      policy,
      ruleConfig,
      provenance,
      clonedSnapshot,
      result
    )
  };
}
