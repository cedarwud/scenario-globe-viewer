import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Cartesian2,
  type Viewer
} from "cesium";

import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

import type { GroundStationMarkersHandle } from "./station-markers";
import { areStationsCompatible } from "./station-compatibility";
import type {
  SelectionSlot,
  SelectionSnapshot,
  SelectionStore
} from "./selection-store";
import {
  inferPairSourceTierById,
  type PairSourceTierAttribution
} from "./tier-inference";

const MARKER_PICK_ID_PREFIX = "ground-station-marker:";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

type OrbitClass = "LEO" | "MEO" | "GEO";

interface RegistryStation {
  readonly id: string;
  readonly name: string;
  readonly operator: string;
  readonly operatorFamily: string;
  readonly country: string;
  readonly region: string;
  readonly lat: number;
  readonly lon: number;
  readonly supportedOrbits: ReadonlyArray<OrbitClass>;
  readonly supportedBands: ReadonlyArray<string>;
  readonly primaryUseCase?: string;
  readonly sourceUrl: string;
  readonly sourceTier?: string;
  readonly disclosurePrecision: string;
  readonly publicDisclosureNotes?: string;
}

const STATIONS_BY_ID: ReadonlyMap<string, RegistryStation> = new Map(
  (registry.stations as ReadonlyArray<RegistryStation>).map((s) => [s.id, s])
);

const REGION_LABEL: Readonly<Record<string, string>> = {
  "north-america": "North America",
  "south-america": "South America",
  europe: "Europe",
  africa: "Africa",
  asia: "Asia",
  oceania: "Oceania",
  "polar-arctic": "Arctic",
  "polar-antarctic": "Antarctic"
};

const DISCLOSURE_LABEL: Readonly<Record<string, string>> = {
  "exact-coords": "Exact coordinates (operator-published)",
  "operator-family-region": "Operator-family region",
  "region-only": "Region only"
};

const SLOT_LABEL: Readonly<Record<SelectionSlot, string>> = {
  stationA: "Station A",
  stationB: "Station B"
};

function getOtherSlot(slot: SelectionSlot): SelectionSlot {
  return slot === "stationA" ? "stationB" : "stationA";
}

function canAssignStationToSlot(
  station: RegistryStation,
  slot: SelectionSlot,
  snapshot: SelectionSnapshot
): boolean {
  const otherId = snapshot[getOtherSlot(slot)];
  if (!otherId) {
    return true;
  }
  const otherStation = STATIONS_BY_ID.get(otherId);
  return otherStation !== undefined && areStationsCompatible(station, otherStation);
}

function resolveOpenSlotAssignment(
  stationId: string,
  snapshot: SelectionSnapshot
): SelectionSlot | null {
  const station = STATIONS_BY_ID.get(stationId);
  if (!station) {
    return null;
  }
  if (snapshot.stationA && !snapshot.stationB) {
    if (snapshot.stationA === stationId) {
      return null;
    }
    const stationA = STATIONS_BY_ID.get(snapshot.stationA);
    return stationA && areStationsCompatible(stationA, station)
      ? "stationB"
      : null;
  }
  if (snapshot.stationB && !snapshot.stationA) {
    if (snapshot.stationB === stationId) {
      return null;
    }
    const stationB = STATIONS_BY_ID.get(snapshot.stationB);
    return stationB && areStationsCompatible(station, stationB)
      ? "stationA"
      : null;
  }
  return null;
}

function formatRegion(region: string): string {
  return REGION_LABEL[region] ?? region;
}

function formatDisclosure(precision: string): string {
  return DISCLOSURE_LABEL[precision] ?? precision;
}

function formatCoord(value: number, posSuffix: string, negSuffix: string): string {
  const abs = Math.abs(value);
  const suffix = value >= 0 ? posSuffix : negSuffix;
  return `${abs.toFixed(4)}° ${suffix}`;
}

function extractStationId(pickedId: unknown): string | null {
  if (typeof pickedId !== "string") {
    return null;
  }
  if (!pickedId.startsWith(MARKER_PICK_ID_PREFIX)) {
    return null;
  }
  return pickedId.slice(MARKER_PICK_ID_PREFIX.length);
}

function createCardRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "ground-station-info-card";
  root.dataset.groundStationInfoCard = "true";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "false");
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-label", "Ground station details");
  root.tabIndex = -1;
  return root;
}

function buildFieldList(station: RegistryStation): HTMLElement {
  const list = document.createElement("dl");
  list.className = "ground-station-info-card__fields";

  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: "Operator", value: station.operator },
    {
      label: "Operator family",
      value: station.operatorFamily
    },
    { label: "Country", value: station.country },
    { label: "Region", value: formatRegion(station.region) },
    {
      label: "Coordinates",
      value: `${formatCoord(station.lat, "N", "S")}  ·  ${formatCoord(
        station.lon,
        "E",
        "W"
      )}`
    },
    {
      label: "Supported orbits",
      value: station.supportedOrbits.join(" · ")
    },
    {
      label: "Supported bands",
      value: station.supportedBands.join(" · ")
    },
    {
      label: "Disclosure precision",
      value: formatDisclosure(station.disclosurePrecision)
    }
  ];

  for (const row of rows) {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    list.append(dt, dd);
  }

  return list;
}

function buildActionRow(
  station: RegistryStation,
  snapshot: SelectionSnapshot
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ground-station-info-card__actions";

  for (const slot of ["stationA", "stationB"] as ReadonlyArray<SelectionSlot>) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ground-station-info-card__action";
    button.dataset.groundStationInfoCardAction = slot;
    button.dataset.stationId = station.id;

    const isThisStationInSlot = snapshot[slot] === station.id;
    const canAssign = isThisStationInSlot ||
      canAssignStationToSlot(station, slot, snapshot);
    button.dataset.active = String(isThisStationInSlot);
    button.setAttribute("aria-pressed", String(isThisStationInSlot));
    button.disabled = !canAssign;
    button.setAttribute("aria-disabled", String(!canAssign));

    if (isThisStationInSlot) {
      button.textContent = `✓ ${SLOT_LABEL[slot]} · click to clear`;
      button.title = `${station.name} is currently ${SLOT_LABEL[slot]}. Click to clear.`;
    } else if (!canAssign) {
      button.textContent = `Unavailable for ${SLOT_LABEL[slot]}`;
      button.title =
        `${station.name} requires a shared band plus at least two orbit handover geometry with the current other station.`;
    } else {
      button.textContent = `Select as ${SLOT_LABEL[slot]}`;
      button.title = `Set ${station.name} as ${SLOT_LABEL[slot]}.`;
    }

    wrapper.append(button);
  }

  return wrapper;
}

function resolvePairTierForCard(
  station: RegistryStation,
  snapshot: SelectionSnapshot
): PairSourceTierAttribution | null {
  if (!snapshot.stationA || !snapshot.stationB) {
    return null;
  }
  if (snapshot.stationA !== station.id && snapshot.stationB !== station.id) {
    return null;
  }
  return inferPairSourceTierById(snapshot.stationA, snapshot.stationB);
}

function buildTierBadge(attribution: PairSourceTierAttribution): HTMLElement {
  const badge = document.createElement("p");
  badge.className = "ground-station-info-card__tier-badge";
  badge.dataset.tier = attribution.sourceTier;
  badge.textContent = attribution.badgeLabel;
  return badge;
}

function renderCard(
  root: HTMLElement,
  station: RegistryStation,
  snapshot: SelectionSnapshot
): void {
  root.replaceChildren();
  root.dataset.activeStationId = station.id;

  const header = document.createElement("header");
  header.className = "ground-station-info-card__header";

  const title = document.createElement("h2");
  title.className = "ground-station-info-card__title";
  title.textContent = station.name;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "ground-station-info-card__close";
  closeButton.setAttribute("aria-label", "Close station details");
  closeButton.title = "Close";
  closeButton.textContent = "×";
  closeButton.dataset.groundStationInfoCardClose = "true";

  header.append(title, closeButton);

  const body = document.createElement("div");
  body.className = "ground-station-info-card__body";

  const tierAttribution = resolvePairTierForCard(station, snapshot);
  if (tierAttribution) {
    body.append(buildTierBadge(tierAttribution));
  }

  body.append(buildFieldList(station));

  if (station.primaryUseCase) {
    const useCase = document.createElement("p");
    useCase.className = "ground-station-info-card__use-case";
    useCase.textContent = station.primaryUseCase;
    body.append(useCase);
  }

  if (station.publicDisclosureNotes) {
    const notes = document.createElement("p");
    notes.className = "ground-station-info-card__notes";
    notes.textContent = station.publicDisclosureNotes;
    body.append(notes);
  }

  body.append(buildActionRow(station, snapshot));

  const footer = document.createElement("footer");
  footer.className = "ground-station-info-card__footer";

  const sourceLink = document.createElement("a");
  sourceLink.className = "ground-station-info-card__source";
  sourceLink.href = station.sourceUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.textContent = station.sourceTier
    ? `Public source · ${station.sourceTier}`
    : "Public source";
  footer.append(sourceLink);

  const tierNote = document.createElement("p");
  tierNote.className = "ground-station-info-card__tier-note";
  tierNote.textContent =
    "Public-disclosure registry · coordinates at operator-stated precision · commercial routing not validated by this surface.";
  footer.append(tierNote);

  root.append(header, body, footer);
}

export interface GroundStationInfoCardOptions {
  readonly selectionStore: SelectionStore;
}

export interface GroundStationInfoCardHandle {
  open(stationId: string): void;
  close(): void;
  dispose(): void;
}

export function mountGroundStationInfoCard(
  viewer: Viewer,
  markers: GroundStationMarkersHandle,
  options: GroundStationInfoCardOptions
): GroundStationInfoCardHandle {
  const { selectionStore } = options;

  const root = createCardRoot();
  viewer.container.appendChild(root);

  let activeStationId: string | null = null;
  let previouslyFocusedElement: HTMLElement | null = null;
  let disposed = false;

  function getFocusableElements(): ReadonlyArray<HTMLElement> {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hidden && el.offsetParent !== null
    );
  }

  function focusCard(): void {
    const [firstFocusable] = getFocusableElements();
    (firstFocusable ?? root).focus({ preventScroll: true });
  }

  function restorePreviousFocus(): void {
    const target = previouslyFocusedElement;
    previouslyFocusedElement = null;
    if (target && target.isConnected) {
      target.focus({ preventScroll: true });
    }
  }

  function trapFocus(event: KeyboardEvent): void {
    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      root.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const activeElement = document.activeElement;
    if (activeElement === root) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return;
    }
    if (!(activeElement instanceof HTMLElement) || !root.contains(activeElement)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }
    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function open(stationId: string): void {
    const station = STATIONS_BY_ID.get(stationId);
    if (!station) {
      return;
    }
    const wasHidden = root.hidden;
    if (wasHidden) {
      previouslyFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    activeStationId = stationId;
    renderCard(root, station, selectionStore.getSnapshot());
    root.hidden = false;
    if (wasHidden) {
      focusCard();
    }
    markers.setHighlightedStation(stationId);
    viewer.scene.requestRender();
  }

  function close(): void {
    if (root.hidden) {
      return;
    }
    root.hidden = true;
    root.replaceChildren();
    delete root.dataset.activeStationId;
    activeStationId = null;
    markers.setHighlightedStation(null);
    viewer.scene.requestRender();
    restorePreviousFocus();
  }

  function handleRootClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.closest("[data-ground-station-info-card-close]")) {
      event.preventDefault();
      close();
      return;
    }
    const actionButton = target.closest<HTMLButtonElement>(
      "[data-ground-station-info-card-action]"
    );
    if (actionButton) {
      event.preventDefault();
      const slot = actionButton.dataset.groundStationInfoCardAction as
        | SelectionSlot
        | undefined;
      const stationId = actionButton.dataset.stationId;
      if (!slot || !stationId) {
        return;
      }
      const snapshot = selectionStore.getSnapshot();
      if (snapshot[slot] === stationId) {
        selectionStore.clear(slot);
      } else {
        const station = STATIONS_BY_ID.get(stationId);
        if (!station || !canAssignStationToSlot(station, slot, snapshot)) {
          return;
        }
        selectionStore.setStation(slot, stationId);
        markers.flyToStation(stationId);
      }
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (activeStationId === null) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  root.addEventListener("click", handleRootClick);
  document.addEventListener("keydown", handleKeydown);

  const unsubscribeStore = selectionStore.subscribe((snapshot) => {
    markers.setSelectedStations({
      stationA: snapshot.stationA,
      stationB: snapshot.stationB
    });
    if (activeStationId === null) {
      return;
    }
    const station = STATIONS_BY_ID.get(activeStationId);
    if (!station) {
      return;
    }
    const hadFocusInside =
      document.activeElement instanceof HTMLElement &&
      root.contains(document.activeElement);
    renderCard(root, station, snapshot);
    if (hadFocusInside) {
      focusCard();
    }
  });

  const eventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  eventHandler.setInputAction((movement: { position: Cartesian2 }) => {
    if (!markers.isVisible()) {
      return;
    }
    const snapId = markers.findNearestVisible(movement.position, 36);
    const picked = viewer.scene.pick(movement.position);
    const directId = extractStationId(picked?.id);
    const stationId = directId ?? snapId;
    if (stationId) {
      const snapshot = selectionStore.getSnapshot();
      const slot = resolveOpenSlotAssignment(stationId, snapshot);
      if (slot) {
        selectionStore.setStation(slot, stationId);
        markers.flyToStation(stationId);
        if (activeStationId !== null) {
          close();
        }
        return;
      }
      open(stationId);
      return;
    }
    if (activeStationId !== null) {
      close();
    }
  }, ScreenSpaceEventType.LEFT_CLICK);

  return {
    open,
    close,
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      if (!root.hidden) {
        close();
      }
      eventHandler.destroy();
      unsubscribeStore();
      root.removeEventListener("click", handleRootClick);
      document.removeEventListener("keydown", handleKeydown);
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
      markers.setHighlightedStation(null);
    }
  };
}
