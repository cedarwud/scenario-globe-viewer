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
export type HandoverReasonSignalCode =
  | "latency-better"
  | "jitter-better"
  | "network-speed-better"
  | "current-link-unavailable"
  | "policy-hold"
  | "tie-break";

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
  metricWins: number;
}

const REASON_SIGNAL_ORDER = [
  "current-link-unavailable",
  "latency-better",
  "jitter-better",
  "network-speed-better",
  "policy-hold",
  "tie-break"
] as const satisfies ReadonlyArray<HandoverReasonSignalCode>;

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
    ...(snapshot.decisionModel
      ? { decisionModel: snapshot.decisionModel }
      : {}),
    ...(snapshot.isNativeRfHandover !== undefined
      ? { isNativeRfHandover: snapshot.isNativeRfHandover }
      : {}),
    candidates: snapshot.candidates.map((candidate) => cloneCandidateMetrics(candidate))
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
  candidates: ReadonlyArray<HandoverCandidateMetrics>
): RankedCandidate[] {
  const lowestLatency = Math.min(...candidates.map((candidate) => candidate.latencyMs));
  const lowestJitter = Math.min(...candidates.map((candidate) => candidate.jitterMs));
  const highestNetworkSpeed = Math.max(
    ...candidates.map((candidate) => candidate.networkSpeedMbps)
  );

  return candidates.map((candidate) => ({
    candidate,
    metricWins:
      Number(candidate.latencyMs === lowestLatency) +
      Number(candidate.jitterMs === lowestJitter) +
      Number(candidate.networkSpeedMbps === highestNetworkSpeed)
  }));
}

function compareRankedCandidates(left: RankedCandidate, right: RankedCandidate): number {
  if (left.metricWins !== right.metricWins) {
    return right.metricWins - left.metricWins;
  }

  if (left.candidate.latencyMs !== right.candidate.latencyMs) {
    return left.candidate.latencyMs - right.candidate.latencyMs;
  }

  if (left.candidate.jitterMs !== right.candidate.jitterMs) {
    return left.candidate.jitterMs - right.candidate.jitterMs;
  }

  if (left.candidate.networkSpeedMbps !== right.candidate.networkSpeedMbps) {
    return right.candidate.networkSpeedMbps - left.candidate.networkSpeedMbps;
  }

  return left.candidate.candidateId.localeCompare(right.candidate.candidateId);
}

function resolveBestCandidate(
  candidates: ReadonlyArray<HandoverCandidateMetrics>
): {
  bestCandidate: HandoverCandidateMetrics;
  tieBreakUsed: boolean;
} {
  const rankedCandidates = rankCandidates(candidates).sort(compareRankedCandidates);
  const bestCandidate = rankedCandidates[0];
  const runnerUp = rankedCandidates[1];

  return {
    bestCandidate: cloneCandidateMetrics(bestCandidate.candidate),
    tieBreakUsed:
      runnerUp !== undefined &&
      runnerUp.metricWins === bestCandidate.metricWins &&
      runnerUp.candidate.latencyMs === bestCandidate.candidate.latencyMs &&
      runnerUp.candidate.jitterMs === bestCandidate.candidate.jitterMs &&
      runnerUp.candidate.networkSpeedMbps ===
        bestCandidate.candidate.networkSpeedMbps
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

export function evaluateHandoverDecisionSnapshot(
  snapshot: HandoverDecisionSnapshot
): HandoverDecisionState {
  assertSnapshot(snapshot);

  const clonedSnapshot = cloneSnapshot(snapshot);

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
      report: {
        schemaVersion: HANDOVER_DECISION_REPORT_SCHEMA_VERSION,
        provenance,
        snapshot: cloneSnapshot(clonedSnapshot),
        result: cloneResult(result)
      }
    };
  }

  const currentCandidate = resolveCurrentCandidate(clonedSnapshot);
  const { bestCandidate, tieBreakUsed } = resolveBestCandidate(clonedSnapshot.candidates);
  const reasonCodes = new Set<HandoverReasonSignalCode>();

  let result: HandoverDecisionResult;

  if (!currentCandidate) {
    if (clonedSnapshot.currentServingCandidateId) {
      reasonCodes.add("current-link-unavailable");
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
    report: {
      schemaVersion: HANDOVER_DECISION_REPORT_SCHEMA_VERSION,
      provenance,
      snapshot: cloneSnapshot(clonedSnapshot),
      result: cloneResult(result)
    }
  };
}
