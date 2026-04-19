import {
  formatCommunicationDurationLabel,
  type CommunicationTimeState
} from "./communication-time";

export interface CommunicationTimePanelViewModel {
  heading: string;
  status: string;
  available: string;
  unavailable: string;
  remaining: string;
  provenance: string;
}

// The first Phase 6.3 panel is intentionally compact: it exposes the
// bootstrap-proxy summary without implying that the proxy is already a final
// network-measurement truth source.
export function createCommunicationTimePanelViewModel(
  state: CommunicationTimeState
): CommunicationTimePanelViewModel {
  return {
    heading: state.summaryScope.label,
    status: state.currentStatus.label,
    available: formatCommunicationDurationLabel(
      state.summary.totalCommunicatingMs
    ),
    unavailable: formatCommunicationDurationLabel(
      state.summary.totalUnavailableMs
    ),
    remaining: formatCommunicationDurationLabel(
      state.summary.remainingCommunicatingMs
    ),
    provenance: state.provenance.label
  };
}
