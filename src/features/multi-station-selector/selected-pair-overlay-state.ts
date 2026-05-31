export const PANEL_EVIDENCE_DRAWER_ID = "v4-selected-pair-evidence";
export const SELECTED_PAIR_OVERLAY_CHANGE_EVENT = "selected-pair-overlay-change";

const PRODUCT_INSPECTOR_OPEN_SELECTOR = '[data-m8a-v411-inspector-open="true"]';
const STATION_INFO_CARD_SELECTOR = '[data-ground-station-info-card="true"]';

export interface SelectedPairOverlayState {
  readonly evidenceDrawerOpen: boolean;
  readonly stationInfoCardOpen: boolean;
  readonly productInspectorOpen: boolean;
  readonly blocksTransientHover: boolean;
}

interface EvidenceDrawerFocusOptions {
  readonly focusTarget?: "close-button" | "trigger" | "none";
}

function isVisibleElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && !element.hidden;
}

function resolveEvidenceDrawerTrigger(
  drawer: HTMLElement
): HTMLButtonElement | null {
  return drawer.ownerDocument.querySelector<HTMLButtonElement>(
    `[aria-controls="${drawer.id}"]`
  );
}

export function isSelectedPairEvidenceDrawerOpen(
  documentRef: Document = document
): boolean {
  return isVisibleElement(documentRef.getElementById(PANEL_EVIDENCE_DRAWER_ID));
}

export function isSelectedPairStationInfoCardOpen(
  documentRef: Document = document
): boolean {
  return isVisibleElement(
    documentRef.querySelector(STATION_INFO_CARD_SELECTOR)
  );
}

export function isSelectedPairProductInspectorOpen(
  documentRef: Document = document
): boolean {
  return Boolean(documentRef.querySelector(PRODUCT_INSPECTOR_OPEN_SELECTOR));
}

export function resolveSelectedPairOverlayState(
  documentRef: Document = document
): SelectedPairOverlayState {
  const evidenceDrawerOpen = isSelectedPairEvidenceDrawerOpen(documentRef);
  const stationInfoCardOpen = isSelectedPairStationInfoCardOpen(documentRef);
  const productInspectorOpen = isSelectedPairProductInspectorOpen(documentRef);
  return {
    evidenceDrawerOpen,
    stationInfoCardOpen,
    productInspectorOpen,
    blocksTransientHover:
      evidenceDrawerOpen || stationInfoCardOpen || productInspectorOpen
  };
}

export function isSelectedPairBlockingOverlayOpen(
  documentRef: Document = document
): boolean {
  return resolveSelectedPairOverlayState(documentRef).blocksTransientHover;
}

export function dispatchSelectedPairOverlayChange(
  documentRef: Document = document
): void {
  documentRef.dispatchEvent(
    new CustomEvent<SelectedPairOverlayState>(
      SELECTED_PAIR_OVERLAY_CHANGE_EVENT,
      { detail: resolveSelectedPairOverlayState(documentRef) }
    )
  );
}

export function setSelectedPairEvidenceDrawerOpen(
  drawer: HTMLElement,
  open: boolean,
  options: EvidenceDrawerFocusOptions = {}
): void {
  const wasOpen = !drawer.hidden;
  drawer.hidden = !open;
  drawer.dataset.open = open ? "true" : "false";

  const trigger = resolveEvidenceDrawerTrigger(drawer);
  if (trigger) {
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    trigger.textContent = open ? "Hide details" : "Details & sources";
    trigger.setAttribute(
      "aria-label",
      open ? "Close details and sources" : "Open details and sources"
    );
  }

  if (options.focusTarget === "close-button") {
    drawer
      .querySelector<HTMLButtonElement>(".v4-projection-side-panel__evidence-close")
      ?.focus();
  } else if (options.focusTarget === "trigger") {
    trigger?.focus();
  }

  if (wasOpen !== open) {
    dispatchSelectedPairOverlayChange(drawer.ownerDocument);
  }
}
