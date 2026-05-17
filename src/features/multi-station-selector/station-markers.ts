import {
  BillboardCollection,
  Cartesian3,
  Color,
  HeightReference,
  LabelCollection,
  LabelStyle,
  VerticalOrigin,
  type Billboard,
  type Label,
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

interface ImageSet {
  readonly normal: string;
  readonly highlight: string;
}

const STATIONS = registry.stations as ReadonlyArray<RegistryStation>;

function drawCircle(
  radius: number,
  fillCss: string,
  outlineCss: string,
  outlineWidth: number
): string {
  const pad = Math.ceil(outlineWidth) + 1;
  const total = (radius + pad) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, total, total);
  ctx.beginPath();
  ctx.arc(total / 2, total / 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillCss;
  ctx.fill();
  ctx.strokeStyle = outlineCss;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();
  return canvas.toDataURL();
}

const TRI_ORBIT_IMAGES: ImageSet = {
  normal: drawCircle(4.5, "rgba(126,226,184,0.92)", "rgba(2,20,31,0.94)", 1.5),
  highlight: drawCircle(7, "rgba(126,226,184,0.92)", "rgba(255,209,102,0.98)", 3)
};

const DUAL_ORBIT_IMAGES: ImageSet = {
  normal: drawCircle(3.5, "rgba(155,196,232,0.86)", "rgba(2,20,31,0.90)", 1.25),
  highlight: drawCircle(5.5, "rgba(155,196,232,0.86)", "rgba(255,209,102,0.98)", 3)
};

function resolveImageSetForStation(station: RegistryStation): ImageSet {
  return station.supportedOrbits.length >= 3 ? TRI_ORBIT_IMAGES : DUAL_ORBIT_IMAGES;
}

function toCartesian(station: RegistryStation): Cartesian3 {
  return Cartesian3.fromDegrees(station.lon, station.lat);
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
  const billboards = new BillboardCollection({ scene: viewer.scene });
  const labels = new LabelCollection({ show: false });
  const billboardById = new Map<string, Billboard>();
  const labelById = new Map<string, Label>();

  const imageSetById = new Map<string, ImageSet>();
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
    viewer.scene.primitives.add(billboards);
    viewer.scene.primitives.add(labels);
    attached = true;
    billboards.show = visible;
    labels.show = false;
  }

  function populate(): void {
    for (const station of STATIONS) {
      const position = toCartesian(station);
      const imageSet = resolveImageSetForStation(station);

      const billboard = billboards.add({
        position,
        image: imageSet.normal,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
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

      billboardById.set(station.id, billboard);
      labelById.set(station.id, label);
      imageSetById.set(station.id, imageSet);
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
    for (const [stationId, billboard] of billboardById) {
      const station = stationById.get(stationId);
      billboard.show = station ? stationPassesFilter(station) : false;
    }
  }

  function applyBaseStyle(stationId: string): void {
    const billboard = billboardById.get(stationId);
    const imageSet = imageSetById.get(stationId);
    if (!billboard || !imageSet) {
      return;
    }
    billboard.image = imageSet.normal;
  }

  function applyHighlightStyle(stationId: string): void {
    const billboard = billboardById.get(stationId);
    const imageSet = imageSetById.get(stationId);
    if (!billboard || !imageSet) {
      return;
    }
    billboard.image = imageSet.highlight;
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
          billboards.show = true;
          applyFilterToMarkers();
        } else {
          billboards.show = false;
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
      return billboardById.size;
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      highlightedId = null;
      billboardById.clear();
      labelById.clear();
      imageSetById.clear();
      stationById.clear();
      billboards.removeAll();
      labels.removeAll();
      if (attached && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(billboards);
        viewer.scene.primitives.remove(labels);
        viewer.scene.requestRender();
      }
      attached = false;
    }
  };
}
