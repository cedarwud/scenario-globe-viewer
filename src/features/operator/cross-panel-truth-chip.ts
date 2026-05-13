const CROSS_PANEL_TRUTH_COPY =
  "Modeled, not measured. Communication Rate, Handover Decision, Physical Inputs, and Validation State each retain their own bounded-proxy / Repo-owned provenance.";

export function mountCrossPanelTruthChip(container: HTMLDivElement): () => void {
  container.textContent = CROSS_PANEL_TRUTH_COPY;

  return () => {};
}
