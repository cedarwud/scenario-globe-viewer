import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Cartesian2,
  type Viewer
} from "cesium";

import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

import type { GroundStationMarkersHandle } from "./station-markers";

const MARKER_PICK_ID_PREFIX = "ground-station-marker:";

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

function renderCard(root: HTMLElement, station: RegistryStation): void {
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

export interface GroundStationInfoCardHandle {
  open(stationId: string): void;
  close(): void;
  dispose(): void;
}

export function mountGroundStationInfoCard(
  viewer: Viewer,
  markers: GroundStationMarkersHandle
): GroundStationInfoCardHandle {
  const root = createCardRoot();
  viewer.container.appendChild(root);

  let activeStationId: string | null = null;
  let disposed = false;

  function open(stationId: string): void {
    const station = STATIONS_BY_ID.get(stationId);
    if (!station) {
      return;
    }
    renderCard(root, station);
    root.hidden = false;
    activeStationId = stationId;
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
  }

  function handleRootClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.closest("[data-ground-station-info-card-close]")) {
      event.preventDefault();
      close();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") {
      return;
    }
    if (activeStationId === null) {
      return;
    }
    close();
  }

  root.addEventListener("click", handleRootClick);
  window.addEventListener("keydown", handleKeydown);

  const eventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  eventHandler.setInputAction((movement: { position: Cartesian2 }) => {
    if (!markers.isVisible()) {
      return;
    }
    const picked = viewer.scene.pick(movement.position);
    const pickedId = picked?.id;
    const stationId = extractStationId(pickedId);
    if (stationId) {
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
      eventHandler.destroy();
      root.removeEventListener("click", handleRootClick);
      window.removeEventListener("keydown", handleKeydown);
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
      markers.setHighlightedStation(null);
    }
  };
}
