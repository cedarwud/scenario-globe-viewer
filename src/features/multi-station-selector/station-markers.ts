import {
  Cartesian3,
  Color,
  LabelCollection,
  LabelStyle,
  PointPrimitiveCollection,
  VerticalOrigin,
  type Label,
  type PointPrimitive,
  type Viewer
} from "cesium";

import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

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
  readonly disclosurePrecision: string;
  readonly primaryUseCase: string;
}

interface MarkerStyle {
  pixelSize: number;
  color: Color;
  outlineColor: Color;
  outlineWidth: number;
}

const STATIONS = registry.stations as ReadonlyArray<RegistryStation>;

const STYLE_TRI_ORBIT: MarkerStyle = {
  pixelSize: 9,
  color: Color.fromCssColorString("#7ee2b8").withAlpha(0.92),
  outlineColor: Color.fromCssColorString("#02141f").withAlpha(0.94),
  outlineWidth: 1.5
};

const STYLE_DUAL_ORBIT: MarkerStyle = {
  pixelSize: 7,
  color: Color.fromCssColorString("#9bc4e8").withAlpha(0.86),
  outlineColor: Color.fromCssColorString("#02141f").withAlpha(0.9),
  outlineWidth: 1.25
};

const HIGHLIGHT_OUTLINE_COLOR = Color.fromCssColorString("#ffd166").withAlpha(0.98);
const HIGHLIGHT_OUTLINE_WIDTH = 3;
const HIGHLIGHT_PIXEL_SIZE_BONUS = 5;

function resolveStyleForStation(station: RegistryStation): MarkerStyle {
  return station.supportedOrbits.length >= 3 ? STYLE_TRI_ORBIT : STYLE_DUAL_ORBIT;
}

function toCartesian(station: RegistryStation): Cartesian3 {
  return Cartesian3.fromDegrees(station.lon, station.lat, 0);
}

export interface GroundStationMarkersHandle {
  setVisible(visible: boolean): void;
  isVisible(): boolean;
  setHighlightedStation(stationId: string | null): void;
  setOrbitFilter(allowedOrbits: ReadonlyArray<OrbitClass>): void;
  getOrbitFilter(): ReadonlyArray<OrbitClass>;
  setRegionFilter(allowedRegions: ReadonlyArray<string> | null): void;
  getRegionFilter(): ReadonlyArray<string> | null;
  setBandFilter(allowedBands: ReadonlyArray<string> | null): void;
  getBandFilter(): ReadonlyArray<string> | null;
  setSearchQuery(query: string | null): void;
  getSearchQuery(): string;
  getStationCount(): number;
  dispose(): void;
}

function normaliseSearchQuery(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }
  return raw.trim().toLowerCase();
}

function stationMatchesSearchQuery(
  station: RegistryStation,
  normalised: string
): boolean {
  if (!normalised) {
    return true;
  }
  if (station.name.toLowerCase().includes(normalised)) {
    return true;
  }
  if (station.operator.toLowerCase().includes(normalised)) {
    return true;
  }
  if (station.country.toLowerCase().includes(normalised)) {
    return true;
  }
  if (station.region.toLowerCase().includes(normalised)) {
    return true;
  }
  if (station.primaryUseCase.toLowerCase().includes(normalised)) {
    return true;
  }
  return false;
}

export function mountGroundStationMarkers(
  viewer: Viewer,
  options: { initiallyVisible?: boolean } = {}
): GroundStationMarkersHandle {
  const points = new PointPrimitiveCollection({ show: true });
  const labels = new LabelCollection({ show: false });
  const pointById = new Map<string, PointPrimitive>();
  const labelById = new Map<string, Label>();

  const baseStyleById = new Map<string, MarkerStyle>();
  const stationById = new Map<string, RegistryStation>();

  let visible = options.initiallyVisible ?? true;
  let allowedOrbits: ReadonlySet<OrbitClass> = new Set<OrbitClass>(["LEO", "MEO", "GEO"]);
  let allowedRegions: ReadonlySet<string> | null = null;
  let allowedBands: ReadonlySet<string> | null = null;
  let searchQuery = "";
  let highlightedId: string | null = null;
  let attached = false;
  let disposed = false;

  function attach(): void {
    if (disposed || attached) {
      return;
    }
    viewer.scene.primitives.add(points);
    viewer.scene.primitives.add(labels);
    attached = true;
    points.show = visible;
    labels.show = false;
  }

  function populate(): void {
    for (const station of STATIONS) {
      const position = toCartesian(station);
      const style = resolveStyleForStation(station);

      const point = points.add({
        position,
        pixelSize: style.pixelSize,
        color: style.color,
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
        id: `ground-station-marker:${station.id}`
      });

      const label = labels.add({
        position,
        text: station.name,
        font: "13px Inter, system-ui, sans-serif",
        fillColor: Color.fromCssColorString("#dde9f1"),
        outlineColor: Color.fromCssColorString("#02141f"),
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian3(0, -10, 0),
        show: false
      });

      pointById.set(station.id, point);
      labelById.set(station.id, label);
      baseStyleById.set(station.id, style);
      stationById.set(station.id, station);
    }
  }

  function stationPassesFilter(station: RegistryStation): boolean {
    let orbitMatch = false;
    for (const orbit of station.supportedOrbits) {
      if (allowedOrbits.has(orbit)) {
        orbitMatch = true;
        break;
      }
    }
    if (!orbitMatch) {
      return false;
    }
    if (allowedRegions !== null && !allowedRegions.has(station.region)) {
      return false;
    }
    if (allowedBands !== null) {
      const hasBand = station.supportedBands.some((b) => allowedBands!.has(b));
      if (!hasBand) {
        return false;
      }
    }
    if (!stationMatchesSearchQuery(station, searchQuery)) {
      return false;
    }
    return true;
  }

  function applyFilterToMarkers(): void {
    for (const [stationId, point] of pointById) {
      const station = stationById.get(stationId);
      point.show = station ? stationPassesFilter(station) : false;
    }
  }

  function applyBaseStyle(stationId: string): void {
    const point = pointById.get(stationId);
    const base = baseStyleById.get(stationId);
    if (!point || !base) {
      return;
    }
    point.pixelSize = base.pixelSize;
    point.color = base.color;
    point.outlineColor = base.outlineColor;
    point.outlineWidth = base.outlineWidth;
  }

  function applyHighlightStyle(stationId: string): void {
    const point = pointById.get(stationId);
    const base = baseStyleById.get(stationId);
    if (!point || !base) {
      return;
    }
    point.pixelSize = base.pixelSize + HIGHLIGHT_PIXEL_SIZE_BONUS;
    point.color = base.color;
    point.outlineColor = HIGHLIGHT_OUTLINE_COLOR;
    point.outlineWidth = HIGHLIGHT_OUTLINE_WIDTH;
  }

  attach();
  populate();
  applyFilterToMarkers();
  viewer.scene.requestRender();

  return {
    setVisible(next: boolean): void {
      visible = next;
      if (attached) {
        if (next) {
          points.show = true;
          applyFilterToMarkers();
        } else {
          points.show = false;
        }
        viewer.scene.requestRender();
      }
    },
    isVisible(): boolean {
      return visible;
    },
    setOrbitFilter(next: ReadonlyArray<OrbitClass>): void {
      allowedOrbits = new Set<OrbitClass>(next);
      applyFilterToMarkers();
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getOrbitFilter(): ReadonlyArray<OrbitClass> {
      return Array.from(allowedOrbits);
    },
    setRegionFilter(next: ReadonlyArray<string> | null): void {
      allowedRegions = next === null ? null : new Set<string>(next);
      applyFilterToMarkers();
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getRegionFilter(): ReadonlyArray<string> | null {
      return allowedRegions === null ? null : Array.from(allowedRegions);
    },
    setBandFilter(next: ReadonlyArray<string> | null): void {
      allowedBands = next === null ? null : new Set<string>(next);
      applyFilterToMarkers();
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getBandFilter(): ReadonlyArray<string> | null {
      return allowedBands === null ? null : Array.from(allowedBands);
    },
    setSearchQuery(next: string | null): void {
      searchQuery = normaliseSearchQuery(next);
      applyFilterToMarkers();
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getSearchQuery(): string {
      return searchQuery;
    },
    setHighlightedStation(stationId: string | null): void {
      if (highlightedId === stationId) {
        return;
      }
      if (highlightedId !== null) {
        applyBaseStyle(highlightedId);
      }
      highlightedId = stationId;
      if (stationId !== null) {
        applyHighlightStyle(stationId);
      }
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getStationCount(): number {
      return pointById.size;
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      highlightedId = null;
      pointById.clear();
      labelById.clear();
      baseStyleById.clear();
      stationById.clear();
      points.removeAll();
      labels.removeAll();
      if (attached && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(points);
        viewer.scene.primitives.remove(labels);
        viewer.scene.requestRender();
      }
      attached = false;
    }
  };
}
