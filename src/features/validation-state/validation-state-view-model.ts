import {
  formatValidationAttachStateLabel,
  formatValidationDutKindLabel,
  formatValidationEnvironmentModeLabel,
  formatValidationTransportKindLabel,
  type ValidationState
} from "./validation-state";

export interface ValidationStatePanelViewModel {
  heading: string;
  note: string;
  environmentMode: string;
  transportKind: string;
  dutKind: string;
  attachState: string;
  servingCandidate: string;
  provenance: string;
  provenanceDetail: string;
}

export function createValidationStatePanelViewModel(
  state: ValidationState
): ValidationStatePanelViewModel {
  return {
    heading: "Validation Boundary",
    note: state.ownershipNote,
    environmentMode: formatValidationEnvironmentModeLabel(state.environmentMode),
    transportKind: formatValidationTransportKindLabel(state.transportKind),
    dutKind: formatValidationDutKindLabel(state.dutKind),
    attachState: formatValidationAttachStateLabel(state.attachState),
    servingCandidate: state.servingCandidateId ?? "Unavailable",
    provenance: state.provenance.label,
    provenanceDetail: state.provenance.detail
  };
}

