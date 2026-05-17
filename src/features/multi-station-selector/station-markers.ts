import {
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Color,
  EasingFunction,
  HeightReference,
  LabelCollection,
  LabelStyle,
  Math as CesiumMath,
  SceneTransforms,
  VerticalOrigin,
  type Billboard,
  type Label,
  type Viewer
} from "cesium";

import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";
import {
  summarizeStationHandoverCapabilities,
  type OrbitClass
} from "./station-compatibility";

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

export interface SelectedGroundStations {
  readonly stationA: string | null;
  readonly stationB: string | null;
}

const STATIONS = registry.stations as ReadonlyArray<RegistryStation>;
const HANDOVER_CAPABILITY_SUMMARY = summarizeStationHandoverCapabilities(STATIONS);

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

const RARE_TRI_ORBIT_IMAGES: ImageSet = {
  normal: drawCircle(4.5, "rgba(126,226,184,0.92)", "rgba(255,107,154,0.98)", 2.5),
  highlight: drawCircle(7, "rgba(126,226,184,0.92)", "rgba(255,209,102,0.98)", 3)
};

const RARE_DUAL_ORBIT_IMAGES: ImageSet = {
  normal: drawCircle(3.8, "rgba(155,196,232,0.90)", "rgba(255,107,154,0.98)", 2.5),
  highlight: drawCircle(5.8, "rgba(155,196,232,0.90)", "rgba(255,209,102,0.98)", 3)
};

function resolveImageSetForStation(station: RegistryStation): ImageSet {
  const capability = HANDOVER_CAPABILITY_SUMMARY.byStationId.get(station.id);
  if (capability?.kind === HANDOVER_CAPABILITY_SUMMARY.minorityKind) {
    return capability.kind === "tri-capable"
      ? RARE_TRI_ORBIT_IMAGES
      : RARE_DUAL_ORBIT_IMAGES;
  }
  return capability?.kind === "tri-capable" ? TRI_ORBIT_IMAGES : DUAL_ORBIT_IMAGES;
}

function toCartesian(station: RegistryStation): Cartesian3 {
  return Cartesian3.fromDegrees(station.lon, station.lat);
}

export interface GroundStationMarkersHandle {
  setVisible(visible: boolean): void;
  isVisible(): boolean;
  setHighlightedStation(stationId: string | null): void;
  setSelectedStations(selection: SelectedGroundStations): void;
  setStationAllowList(stationIds: ReadonlyArray<string> | null): void;
  getStationAllowList(): ReadonlyArray<string> | null;
  setOrbitFilter(allowedOrbits: ReadonlyArray<OrbitClass>): void;
  getOrbitFilter(): ReadonlyArray<OrbitClass>;
  setRegionFilter(allowedRegions: ReadonlyArray<string> | null): void;
  getRegionFilter(): ReadonlyArray<string> | null;
  setBandFilter(allowedBands: ReadonlyArray<string> | null): void;
  getBandFilter(): ReadonlyArray<string> | null;
  setSearchQuery(query: string | null): void;
  getSearchQuery(): string;
  getStationCount(): number;
  findNearestVisible(windowPosition: Cartesian2, tolerancePx: number): string | null;
  flyToStation(stationId: string): boolean;
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
  let allowedStationIds: ReadonlySet<string> | null = null;
  let searchQuery = "";
  let highlightedId: string | null = null;
  let selectedStations: SelectedGroundStations = {
    stationA: null,
    stationB: null
  };
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
    syncLabelCollectionVisibility();
  }

  function syncLabelCollectionVisibility(): void {
    labels.show =
      visible &&
      (selectedStations.stationA !== null || selectedStations.stationB !== null);
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
    const selectedSlot = getSelectedSlot(station.id);
    if (
      allowedStationIds !== null &&
      !allowedStationIds.has(station.id) &&
      selectedSlot === null
    ) {
      return false;
    }
    if (selectedSlot !== null) {
      return true;
    }
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

  function getSelectedSlot(stationId: string): "A" | "B" | null {
    if (selectedStations.stationA === stationId) {
      return "A";
    }
    if (selectedStations.stationB === stationId) {
      return "B";
    }
    return null;
  }

  function applyMarkerVisualState(stationId: string): void {
    const billboard = billboardById.get(stationId);
    const imageSet = imageSetById.get(stationId);
    const label = labelById.get(stationId);
    const station = stationById.get(stationId);
    if (!billboard || !imageSet) {
      return;
    }
    const selectedSlot = getSelectedSlot(stationId);
    billboard.image =
      selectedSlot !== null || highlightedId === stationId
        ? imageSet.highlight
        : imageSet.normal;
    if (label && station) {
      label.show = selectedSlot !== null;
      if (selectedSlot !== null) {
        label.text = `${selectedSlot} · ${station.name}`;
        label.fillColor = Color.fromCssColorString(
          selectedSlot === "A" ? "#ffd166" : "#9bc4e8"
        );
      }
    }
  }

  function collectSelectedIds(
    previous: SelectedGroundStations,
    next: SelectedGroundStations
  ): ReadonlySet<string> {
    const ids = new Set<string>();
    for (const id of [
      previous.stationA,
      previous.stationB,
      next.stationA,
      next.stationB
    ]) {
      if (id !== null) {
        ids.add(id);
      }
    }
    return ids;
  }

  attach();
  populate();
  applyFilterToMarkers();
  syncLabelCollectionVisibility();
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
        syncLabelCollectionVisibility();
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
    setStationAllowList(next: ReadonlyArray<string> | null): void {
      allowedStationIds = next === null ? null : new Set<string>(next);
      applyFilterToMarkers();
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getStationAllowList(): ReadonlyArray<string> | null {
      return allowedStationIds === null ? null : Array.from(allowedStationIds);
    },
    setSelectedStations(next: SelectedGroundStations): void {
      if (
        selectedStations.stationA === next.stationA &&
        selectedStations.stationB === next.stationB
      ) {
        return;
      }
      const previous = selectedStations;
      selectedStations = next;
      applyFilterToMarkers();
      for (const stationId of collectSelectedIds(previous, next)) {
        applyMarkerVisualState(stationId);
      }
      syncLabelCollectionVisibility();
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    setHighlightedStation(stationId: string | null): void {
      if (highlightedId === stationId) {
        return;
      }
      const previousHighlightedId = highlightedId;
      highlightedId = stationId;
      if (previousHighlightedId !== null) {
        applyMarkerVisualState(previousHighlightedId);
      }
      if (stationId !== null) {
        applyMarkerVisualState(stationId);
      }
      if (attached) {
        viewer.scene.requestRender();
      }
    },
    getStationCount(): number {
      return billboardById.size;
    },
    findNearestVisible(windowPosition: Cartesian2, tolerancePx: number): string | null {
      const cameraPos = viewer.scene.camera.positionWC;
      const EARTH_RADIUS_SQ = 6378137 * 6378137 * 0.45;
      const scratchScreen = new Cartesian2();
      const threshold = tolerancePx * tolerancePx;
      let bestId: string | null = null;
      let bestDist = threshold;
      const canvasWidth = viewer.scene.canvas.clientWidth;
      const canvasHeight = viewer.scene.canvas.clientHeight;
      for (const [stationId, billboard] of billboardById) {
        if (!billboard.show) {
          continue;
        }
        const station = stationById.get(stationId);
        if (!station) {
          continue;
        }
        const worldPos = Cartesian3.fromDegrees(station.lon, station.lat, 0);
        if (Cartesian3.dot(worldPos, cameraPos) < EARTH_RADIUS_SQ) {
          continue;
        }
        let screenPos: Cartesian2 | undefined;
        try {
          screenPos = billboard.computeScreenSpacePosition(viewer.scene, scratchScreen);
        } catch {
          screenPos = undefined;
        }
        screenPos ??= SceneTransforms.worldToWindowCoordinates(
          viewer.scene,
          worldPos,
          scratchScreen
        );
        if (!screenPos) {
          continue;
        }
        if (
          !Number.isFinite(screenPos.x) ||
          !Number.isFinite(screenPos.y) ||
          screenPos.x < -tolerancePx ||
          screenPos.x > canvasWidth + tolerancePx ||
          screenPos.y < -tolerancePx ||
          screenPos.y > canvasHeight + tolerancePx
        ) {
          continue;
        }
        const dx = screenPos.x - windowPosition.x;
        const dy = screenPos.y - windowPosition.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < bestDist) {
          bestDist = dist2;
          bestId = stationId;
        }
      }
      return bestId;
    },
    flyToStation(stationId: string): boolean {
      const station = stationById.get(stationId);
      if (!station || viewer.isDestroyed()) {
        return false;
      }
      viewer.camera.cancelFlight();
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(station.lon, station.lat, 8_000_000),
        orientation: {
          heading: 0,
          pitch: CesiumMath.toRadians(-90),
          roll: 0
        },
        duration: 0.85,
        easingFunction: EasingFunction.CUBIC_IN_OUT,
        complete: () => {
          viewer.scene.requestRender();
        }
      });
      return true;
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      highlightedId = null;
      selectedStations = {
        stationA: null,
        stationB: null
      };
      allowedStationIds = null;
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
