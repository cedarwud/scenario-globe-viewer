import {
  formatPhysicalInputProvenanceDetail,
  formatPhysicalInputProvenanceSummary,
  formatPhysicalInputWindowLabel,
  formatProjectedPhysicalMetricSummary,
  type PhysicalInputState
} from "./physical-input";

export interface PhysicalInputPanelViewModel {
  heading: string;
  note: string;
  context: string;
  families: string;
  projection: string;
  provenance: string;
  provenanceDetail: string;
}

export function createPhysicalInputPanelViewModel(
  state: PhysicalInputState
): PhysicalInputPanelViewModel {
  const familyLabels = state.provenance
    .map((entry) => entry.family)
    .join(" / ");

  return {
    heading: `${state.scenario.label} physical context`,
    note: state.disclaimer,
    context: formatPhysicalInputWindowLabel(state.activeWindow),
    families: familyLabels,
    projection: formatProjectedPhysicalMetricSummary(state),
    provenance: formatPhysicalInputProvenanceSummary(state.provenance),
    provenanceDetail: formatPhysicalInputProvenanceDetail(state.provenance)
  };
}
