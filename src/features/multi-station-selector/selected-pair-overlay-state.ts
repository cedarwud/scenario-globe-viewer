export const SELECTED_PAIR_OVERLAY_CHANGE_EVENT = "selected-pair-overlay-change";

const PRODUCT_INSPECTOR_OPEN_SELECTOR = '[data-m8a-v411-inspector-open="true"]';
const STATION_INFO_CARD_SELECTOR = '[data-ground-station-info-card="true"]';
const TRAJECTORY_PROVENANCE_OPEN_SELECTOR =
  '[data-trajectory-provenance-open="true"]';

export interface SelectedPairOverlayState {
  readonly stationInfoCardOpen: boolean;
  readonly productInspectorOpen: boolean;
  readonly trajectoryProvenanceOpen: boolean;
  readonly blocksTransientHover: boolean;
}

function isVisibleElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && !element.hidden;
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

export function isSelectedPairTrajectoryProvenanceOpen(
  documentRef: Document = document
): boolean {
  return isVisibleElement(
    documentRef.querySelector(TRAJECTORY_PROVENANCE_OPEN_SELECTOR)
  );
}

export function resolveSelectedPairOverlayState(
  documentRef: Document = document
): SelectedPairOverlayState {
  const stationInfoCardOpen = isSelectedPairStationInfoCardOpen(documentRef);
  const productInspectorOpen = isSelectedPairProductInspectorOpen(documentRef);
  const trajectoryProvenanceOpen =
    isSelectedPairTrajectoryProvenanceOpen(documentRef);
  return {
    stationInfoCardOpen,
    productInspectorOpen,
    trajectoryProvenanceOpen,
    blocksTransientHover:
      stationInfoCardOpen || productInspectorOpen || trajectoryProvenanceOpen
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
