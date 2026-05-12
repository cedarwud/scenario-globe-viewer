import type {
  HandoverDecisionKind,
  HandoverDecisionState,
  HandoverReasonSignalCode,
  OrbitClass
} from "./handover-decision";

export interface HandoverDecisionPanelViewModel {
  heading: string;
  note: string;
  decisionKind: string;
  servingCandidate: string;
  servingOrbitClass: string;
  previousCandidate: string;
  reasons: string;
  policy: string;
  policyDetail: string;
  provenance: string;
  provenanceDetail: string;
}

const REASON_SIGNAL_LABELS: Record<HandoverReasonSignalCode, string> = {
  "latency-better": "Latency better",
  "jitter-better": "Jitter better",
  "network-speed-better": "Network speed better",
  "current-link-unavailable": "Current link unavailable",
  "policy-weighted-override": "Policy weighted override",
  "policy-hold": "Hold",
  "tie-break": "Tie break"
};

function formatDecisionKindLabel(kind: HandoverDecisionKind): string {
  switch (kind) {
    case "hold":
      return "Hold";
    case "switch":
      return "Switch";
    case "unavailable":
      return "Unavailable";
  }
}

function formatOrbitClassLabel(orbitClass: OrbitClass | undefined): string {
  if (!orbitClass) {
    return "Unavailable";
  }

  return orbitClass.toUpperCase();
}

function formatReasonSignals(state: HandoverDecisionState): string {
  if (state.result.reasonSignals.length === 0) {
    return "Unavailable";
  }

  return state.result.reasonSignals
    .map((signal) => REASON_SIGNAL_LABELS[signal.code])
    .join(", ");
}

export function createHandoverDecisionPanelViewModel(
  state: HandoverDecisionState
): HandoverDecisionPanelViewModel {
  return {
    heading: "Decision State",
    note: state.provenance.note,
    decisionKind: formatDecisionKindLabel(state.result.decisionKind),
    servingCandidate: state.result.servingCandidateId ?? "Unavailable",
    servingOrbitClass: formatOrbitClassLabel(state.result.servingOrbitClass),
    previousCandidate: state.result.previousCandidateId ?? "None",
    reasons: formatReasonSignals(state),
    policy: state.report.policyLabel,
    policyDetail: state.report.policySummary,
    provenance: state.provenance.label,
    provenanceDetail: state.provenance.detail
  };
}
