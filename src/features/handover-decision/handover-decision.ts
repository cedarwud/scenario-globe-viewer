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
  policy: HandoverPolicyDescriptor
): HandoverDecisionSnapshot {
  return {
    ...snapshot,
    policyLabel: policy.label,
    policySummary: policy.summary,
    policyTieBreak: [...policy.tieBreak]
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
  policy: HandoverPolicyDescriptor
): RankedCandidate[] {
  const lowestLatency = Math.min(...candidates.map((candidate) => candidate.latencyMs));
  const lowestJitter = Math.min(...candidates.map((candidate) => candidate.jitterMs));
  const highestNetworkSpeed = Math.max(
    ...candidates.map((candidate) => candidate.networkSpeedMbps)
  );

  return candidates.map((candidate) => ({
    candidate,
    weightedScore:
      Number(candidate.latencyMs === lowestLatency) * policy.weights.latencyMs +
      Number(candidate.jitterMs === lowestJitter) * policy.weights.jitterMs +
      Number(candidate.networkSpeedMbps === highestNetworkSpeed) *
        policy.weights.networkSpeedMbps
  }));
}

function compareRankedCandidates(
  left: RankedCandidate,
  right: RankedCandidate,
  policy: HandoverPolicyDescriptor,
  currentServingCandidateId: string | undefined
): number {
  if (left.weightedScore !== right.weightedScore) {
    return right.weightedScore - left.weightedScore;
  }

  for (const tieBreak of policy.tieBreak) {
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
  policy: HandoverPolicyDescriptor,
  currentServingCandidateId: string | undefined
): {
  bestCandidate: HandoverCandidateMetrics;
  tieBreakUsed: boolean;
} {
  const rankedCandidates = rankCandidates(candidates, policy).sort((left, right) =>
    compareRankedCandidates(left, right, policy, currentServingCandidateId)
  );
  const bestCandidate = rankedCandidates[0];
  const runnerUp = rankedCandidates[1];

  return {
    bestCandidate: cloneCandidateMetrics(bestCandidate.candidate),
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

function createHandoverDecisionReport(
  policy: HandoverPolicyDescriptor,
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
  const clonedSnapshot = attachPolicyDescriptorToSnapshot(
    cloneSnapshot(snapshot),
    policy
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
        provenance,
        clonedSnapshot,
        result
      )
    };
  }

  const currentCandidate = resolveCurrentCandidate(clonedSnapshot);
  const { bestCandidate, tieBreakUsed } = resolveBestCandidate(
    clonedSnapshot.candidates,
    policy,
    clonedSnapshot.currentServingCandidateId
  );
  const balancedPolicy = resolveHandoverPolicyDescriptor(DEFAULT_HANDOVER_POLICY_ID);
  const balancedBestCandidate =
    policy.id === DEFAULT_HANDOVER_POLICY_ID
      ? bestCandidate
      : resolveBestCandidate(
          clonedSnapshot.candidates,
          balancedPolicy,
          clonedSnapshot.currentServingCandidateId
        ).bestCandidate;
  const policyWeightedOverrideUsed =
    policy.id !== DEFAULT_HANDOVER_POLICY_ID &&
    balancedBestCandidate.candidateId !== bestCandidate.candidateId;
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
  } else if (currentCandidate.candidateId === bestCandidate.candidateId) {
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
    report: createHandoverDecisionReport(policy, provenance, clonedSnapshot, result)
  };
}
