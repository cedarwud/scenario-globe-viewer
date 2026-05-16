import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

import type {
  SelectionSlot,
  SelectionSnapshot,
  SelectionStore
} from "./selection-store";
import { inferPairSourceTierById } from "./tier-inference";
import { buildV4PairHrefFromSnapshot } from "./v4-route-href";

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

interface TierBadgeElements {
  readonly root: HTMLElement;
  readonly label: HTMLSpanElement;
}

function createTierBadge(): TierBadgeElements {
  const root = document.createElement("div");
  root.className = "ground-station-selection-chip ground-station-selection-chip--tier";
  root.dataset.tier = "";
  root.hidden = true;

  const slotLabel = document.createElement("span");
  slotLabel.className = "ground-station-selection-chip__slot";
  slotLabel.textContent = "Tier";

  const label = document.createElement("span");
  label.className = "ground-station-selection-chip__name";
  label.textContent = "—";

  root.append(slotLabel, label);
  return { root, label };
}

interface ApplyButtonElements {
  readonly root: HTMLButtonElement;
}

function createApplyButton(): ApplyButtonElements {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "ground-station-selection-apply";
  root.textContent = "Apply pair →";
  root.title = "Enter the V4 multi-orbit ground-station scene with the selected pair";
  root.setAttribute("aria-label", "Apply selected ground-station pair and enter the V4 multi-orbit scene");
  root.disabled = true;
  return { root };
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
  const tierBadge = createTierBadge();
  const applyButton = createApplyButton();

  root.append(stationA.root, stationB.root, tierBadge.root, applyButton.root);
  viewerContainer.appendChild(root);

  function applyTierBadge(snapshot: SelectionSnapshot): void {
    if (!snapshot.stationA || !snapshot.stationB) {
      tierBadge.root.hidden = true;
      tierBadge.root.dataset.tier = "";
      tierBadge.label.textContent = "—";
      return;
    }
    const attribution = inferPairSourceTierById(snapshot.stationA, snapshot.stationB);
    if (!attribution) {
      tierBadge.root.hidden = true;
      return;
    }
    tierBadge.root.hidden = false;
    tierBadge.root.dataset.tier = attribution.sourceTier;
    tierBadge.label.textContent = attribution.badgeLabel;
  }

  function applyButtonState(snapshot: SelectionSnapshot): void {
    const ready = Boolean(snapshot.stationA && snapshot.stationB);
    applyButton.root.disabled = !ready;
    applyButton.root.dataset.ready = String(ready);
  }

  function apply(snapshot: SelectionSnapshot): void {
    renderChip(stationA, snapshot.stationA);
    renderChip(stationB, snapshot.stationB);
    applyTierBadge(snapshot);
    applyButtonState(snapshot);
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
  const handleApplyClick = (): void => {
    const snapshot = store.getSnapshot();
    const href = buildV4PairHrefFromSnapshot(snapshot);
    if (!href) {
      return;
    }
    window.location.assign(href);
  };

  stationA.clearButton.addEventListener("click", handleClearA);
  stationB.clearButton.addEventListener("click", handleClearB);
  applyButton.root.addEventListener("click", handleApplyClick);

  const unsubscribe = store.subscribe(apply);

  return {
    dispose(): void {
      unsubscribe();
      stationA.clearButton.removeEventListener("click", handleClearA);
      stationB.clearButton.removeEventListener("click", handleClearB);
      applyButton.root.removeEventListener("click", handleApplyClick);
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
