import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

import type {
  SelectionSlot,
  SelectionSnapshot,
  SelectionStore
} from "./selection-store";

interface RegistryStation {
  readonly id: string;
  readonly name: string;
}

const STATION_NAME_BY_ID: ReadonlyMap<string, string> = new Map(
  (registry.stations as ReadonlyArray<RegistryStation>).map((s) => [s.id, s.name])
);

const SLOT_LABEL: Readonly<Record<SelectionSlot, string>> = {
  stationA: "Station A",
  stationB: "Station B"
};

interface ChipElements {
  readonly root: HTMLElement;
  readonly nameSpan: HTMLSpanElement;
  readonly clearButton: HTMLButtonElement;
}

function createChip(slot: SelectionSlot): ChipElements {
  const root = document.createElement("div");
  root.className = "ground-station-selection-chip";
  root.dataset.slot = slot;
  root.dataset.empty = "true";

  const slotLabel = document.createElement("span");
  slotLabel.className = "ground-station-selection-chip__slot";
  slotLabel.textContent = SLOT_LABEL[slot];

  const nameSpan = document.createElement("span");
  nameSpan.className = "ground-station-selection-chip__name";
  nameSpan.textContent = "—";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "ground-station-selection-chip__clear";
  clearButton.textContent = "×";
  clearButton.setAttribute("aria-label", `Clear ${SLOT_LABEL[slot]}`);
  clearButton.title = `Clear ${SLOT_LABEL[slot]}`;
  clearButton.hidden = true;

  root.append(slotLabel, nameSpan, clearButton);
  return { root, nameSpan, clearButton };
}

function renderChip(elements: ChipElements, stationId: string | null): void {
  if (stationId === null) {
    elements.root.dataset.empty = "true";
    elements.nameSpan.textContent = "—";
    elements.clearButton.hidden = true;
    return;
  }
  elements.root.dataset.empty = "false";
  elements.nameSpan.textContent =
    STATION_NAME_BY_ID.get(stationId) ?? stationId;
  elements.clearButton.hidden = false;
}

export interface SelectionChipsHandle {
  dispose(): void;
}

export function mountSelectionChips(
  viewerContainer: HTMLElement,
  store: SelectionStore
): SelectionChipsHandle {
  const root = document.createElement("aside");
  root.className = "ground-station-selection-chips";
  root.setAttribute("aria-label", "Selected ground-station pair");

  const stationA = createChip("stationA");
  const stationB = createChip("stationB");

  root.append(stationA.root, stationB.root);
  viewerContainer.appendChild(root);

  function apply(snapshot: SelectionSnapshot): void {
    renderChip(stationA, snapshot.stationA);
    renderChip(stationB, snapshot.stationB);
    root.dataset.bothEmpty =
      snapshot.stationA === null && snapshot.stationB === null ? "true" : "false";
  }

  apply(store.getSnapshot());

  const handleClearA = (): void => {
    store.clear("stationA");
  };
  const handleClearB = (): void => {
    store.clear("stationB");
  };

  stationA.clearButton.addEventListener("click", handleClearA);
  stationB.clearButton.addEventListener("click", handleClearB);

  const unsubscribe = store.subscribe(apply);

  return {
    dispose(): void {
      unsubscribe();
      stationA.clearButton.removeEventListener("click", handleClearA);
      stationB.clearButton.removeEventListener("click", handleClearB);
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
