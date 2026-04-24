export const R1V_PRESENTATION_SUPPRESSION_REASON =
  "r1v1-default-floating-panel-suppression";

export type FirstIntakeSuppressedPanelSurface =
  | "first-intake-overlay-expression"
  | "first-intake-active-case-narrative"
  | "first-intake-nearby-second-endpoint-info";

export function suppressFirstIntakeFloatingPanelPresentation(
  panelRoot: HTMLElement,
  surface: FirstIntakeSuppressedPanelSurface
): void {
  panelRoot.hidden = true;
  panelRoot.style.display = "none";
  panelRoot.setAttribute("aria-hidden", "true");
  panelRoot.dataset.presentationState = "suppressed";
  panelRoot.dataset.presentationSuppression =
    R1V_PRESENTATION_SUPPRESSION_REASON;
  panelRoot.dataset.presentationSurface = surface;
}

export function isFirstIntakeFloatingPanelPresentationVisible(
  panelRoot: HTMLElement
): boolean {
  return panelRoot.isConnected && !panelRoot.hidden;
}
