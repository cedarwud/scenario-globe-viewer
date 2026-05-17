import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Cartesian2,
  type Viewer
} from "cesium";

import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

import type { GroundStationMarkersHandle } from "./station-markers";

const MARKER_PICK_ID_PREFIX = "ground-station-marker:";
const STYLE_MARKER_ATTR = "data-ground-station-marker-tooltip-style";
const CURSOR_OFFSET_X = 14;
const CURSOR_OFFSET_Y = -8;

type OrbitClass = "LEO" | "MEO" | "GEO";

interface RegistryStationLite {
  readonly id: string;
  readonly name: string;
  readonly operator: string;
  readonly supportedOrbits: ReadonlyArray<OrbitClass>;
  readonly supportedBands: ReadonlyArray<string>;
}

const ORBIT_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

const STATIONS_BY_ID: ReadonlyMap<string, RegistryStationLite> = new Map(
  (registry.stations as ReadonlyArray<RegistryStationLite>).map((s) => [s.id, s])
);

const CSS_TEXT = `
.ground-station-marker-tooltip {
  position: absolute;
  background: rgba(6,18,28,0.92);
  border: 1px solid rgba(126,226,184,0.4);
  border-radius: 0.35rem;
  padding: 0.4rem 0.55rem;
  color: #dde9f1;
  font: 0.78rem "IBM Plex Sans", system-ui, sans-serif;
  line-height: 1.3;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 6px 14px rgba(0,0,0,0.45);
  max-width: 16rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ground-station-marker-tooltip[hidden] { display: none; }
.ground-station-marker-tooltip__name {
  font-weight: 600;
  color: #f0f7fb;
}
.ground-station-marker-tooltip__operator {
  font-size: 0.7rem;
  color: rgba(157,196,232,0.85);
  display: block;
  margin-top: 0.15rem;
}
.ground-station-marker-tooltip__orbits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.25rem;
}
.ground-station-marker-tooltip__orbit {
  border: 1px solid rgba(126,226,184,0.42);
  border-radius: 999px;
  background: rgba(126,226,184,0.14);
  color: #7ee2b8;
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.25;
  padding: 0.04rem 0.25rem;
}
.ground-station-marker-tooltip__bands {
  display: block;
  margin-top: 0.18rem;
  color: rgba(255,209,102,0.9);
  font-size: 0.66rem;
}
`;

function injectStyleOnce(): void {
  if (document.head.querySelector(`[${STYLE_MARKER_ATTR}="true"]`)) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute(STYLE_MARKER_ATTR, "true");
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
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

function createTooltipRoot(): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "ground-station-marker-tooltip";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");

  const nameEl = document.createElement("span");
  nameEl.className = "ground-station-marker-tooltip__name";

  const operatorEl = document.createElement("span");
  operatorEl.className = "ground-station-marker-tooltip__operator";

  const orbitsEl = document.createElement("span");
  orbitsEl.className = "ground-station-marker-tooltip__orbits";

  const bandsEl = document.createElement("span");
  bandsEl.className = "ground-station-marker-tooltip__bands";

  root.append(nameEl, operatorEl, orbitsEl, bandsEl);
  return root;
}

export function mountMarkerHoverTooltip(
  viewer: Viewer,
  markers: GroundStationMarkersHandle
): { dispose(): void } {
  injectStyleOnce();

  const container = viewer.container as HTMLElement;
  const root = createTooltipRoot();
  container.appendChild(root);

  const nameEl = root.querySelector(
    ".ground-station-marker-tooltip__name"
  ) as HTMLSpanElement;
  const operatorEl = root.querySelector(
    ".ground-station-marker-tooltip__operator"
  ) as HTMLSpanElement;
  const orbitsEl = root.querySelector(
    ".ground-station-marker-tooltip__orbits"
  ) as HTMLSpanElement;
  const bandsEl = root.querySelector(
    ".ground-station-marker-tooltip__bands"
  ) as HTMLSpanElement;

  let currentStationId: string | null = null;
  let disposed = false;

  function hide(): void {
    if (root.hidden) {
      return;
    }
    root.hidden = true;
    currentStationId = null;
    nameEl.textContent = "";
    operatorEl.textContent = "";
    orbitsEl.replaceChildren();
    bandsEl.textContent = "";
  }

  function show(station: RegistryStationLite, x: number, y: number): void {
    if (currentStationId !== station.id) {
      currentStationId = station.id;
      nameEl.textContent = station.name;
      operatorEl.textContent = station.operator;
      orbitsEl.replaceChildren(
        ...ORBIT_ORDER.filter((orbit) => station.supportedOrbits.includes(orbit)).map(
          (orbit) => {
            const badge = document.createElement("span");
            badge.className = "ground-station-marker-tooltip__orbit";
            badge.textContent = orbit;
            return badge;
          }
        )
      );
      bandsEl.textContent = station.supportedBands.join(" · ");
    }
    root.style.left = `${x + CURSOR_OFFSET_X}px`;
    root.style.top = `${y + CURSOR_OFFSET_Y}px`;
    if (root.hidden) {
      root.hidden = false;
    }
  }

  const eventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  eventHandler.setInputAction((movement: { endPosition: Cartesian2 }) => {
    if (!markers.isVisible()) {
      hide();
      return;
    }
    const endPosition = movement.endPosition;
    if (!endPosition) {
      hide();
      return;
    }
    const picked = viewer.scene.pick(endPosition);
    const stationId =
      extractStationId(picked?.id) ??
      markers.findNearestVisible(endPosition, 32);
    if (!stationId) {
      hide();
      return;
    }
    const station = STATIONS_BY_ID.get(stationId);
    if (!station) {
      hide();
      return;
    }
    const canvasRect = viewer.scene.canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    show(station, endPosition.x + offsetX, endPosition.y + offsetY);
  }, ScreenSpaceEventType.MOUSE_MOVE);

  return {
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      eventHandler.destroy();
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
