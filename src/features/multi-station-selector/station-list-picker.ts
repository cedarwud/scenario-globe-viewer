import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";

import type {
  SelectionSnapshot,
  SelectionStore
} from "./selection-store";
import type { GroundStationMarkersHandle } from "./station-markers";
import {
  areStationsCompatible,
  getHandoverFilterKindForPair,
  getStationCapabilityKindForFilter,
  summarizeStationHandoverCapabilities,
  type HandoverOrbitFilterKind,
  type OrbitClass
} from "./station-compatibility";
type FilterDimension = "orbit" | "region" | "band" | "handover";

interface FilterDescriptor<T extends string> {
  readonly id: T;
  readonly label: string;
}

interface RegistryStation {
  readonly id: string;
  readonly name: string;
  readonly operator: string;
  readonly region: string;
  readonly lat: number;
  readonly lon: number;
  readonly supportedOrbits: ReadonlyArray<OrbitClass>;
  readonly supportedBands: ReadonlyArray<string>;
}

interface PickerElements {
  readonly root: HTMLElement;
  readonly selectA: HTMLSelectElement;
  readonly selectB: HTMLSelectElement;
  readonly visibilityToggle: HTMLButtonElement;
  readonly filtersButton: HTMLButtonElement;
  readonly filtersBody: HTMLElement;
  readonly orbitChips: ReadonlyMap<OrbitClass, HTMLButtonElement>;
  readonly handoverChips: ReadonlyMap<HandoverOrbitFilterKind, HTMLButtonElement>;
  readonly regionChips: ReadonlyMap<string, HTMLButtonElement>;
  readonly bandChips: ReadonlyMap<string, HTMLButtonElement>;
}

interface FilterState {
  readonly allowedOrbits: ReadonlyArray<OrbitClass>;
  readonly allowedHandoverKinds: ReadonlyArray<HandoverOrbitFilterKind>;
  readonly allowedRegions: ReadonlyArray<string> | null;
  readonly allowedBands: ReadonlyArray<string> | null;
}

interface UserFilterSelections {
  readonly selectedOrbits: ReadonlySet<OrbitClass>;
  readonly selectedHandoverKinds: ReadonlySet<HandoverOrbitFilterKind>;
  readonly selectedRegions: ReadonlySet<string>;
  readonly selectedBands: ReadonlySet<string>;
}

const STATIONS: ReadonlyArray<RegistryStation> = [
  ...(registry.stations as ReadonlyArray<RegistryStation>)
].sort((a, b) => a.name.localeCompare(b.name));

const STATION_BY_ID: ReadonlyMap<string, RegistryStation> = new Map(
  STATIONS.map((station) => [station.id, station])
);
const HANDOVER_CAPABILITY_SUMMARY = summarizeStationHandoverCapabilities(STATIONS);

const ORBIT_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

const HANDOVER_ORDER: ReadonlyArray<FilterDescriptor<HandoverOrbitFilterKind>> = [
  { id: "2-orbit", label: "2-orbit" },
  { id: "3-orbit", label: "3-orbit" }
];

const REGION_ORDER: ReadonlyArray<FilterDescriptor<string>> = [
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
  { id: "europe", label: "Europe" },
  { id: "north-america", label: "N. America" },
  { id: "oceania", label: "Oceania" },
  { id: "polar-antarctic", label: "Antarctic" },
  { id: "polar-arctic", label: "Arctic" },
  { id: "south-america", label: "S. America" }
];

const BAND_ORDER: ReadonlyArray<FilterDescriptor<string>> = [
  { id: "Ka", label: "Ka" },
  { id: "Ku", label: "Ku" },
  { id: "C", label: "C" },
  { id: "X", label: "X" },
  { id: "S", label: "S" },
  { id: "L", label: "L" }
];

const ALL_REGION_IDS = REGION_ORDER.map((descriptor) => descriptor.id);
const ALL_BAND_IDS = BAND_ORDER.map((descriptor) => descriptor.id);
const ALL_HANDOVER_IDS = HANDOVER_ORDER.map((descriptor) => descriptor.id);

function isStationAValid(
  snapshot: SelectionSnapshot
): boolean {
  if (!snapshot.stationA) {
    return true;
  }
  const stationA = STATION_BY_ID.get(snapshot.stationA);
  if (!stationA) {
    return false;
  }
  if (!snapshot.stationB) {
    return true;
  }
  const stationB = STATION_BY_ID.get(snapshot.stationB);
  return stationB !== undefined && areStationsCompatible(stationA, stationB);
}

function isStationBValid(
  snapshot: SelectionSnapshot
): boolean {
  if (!snapshot.stationB) {
    return true;
  }
  const stationB = STATION_BY_ID.get(snapshot.stationB);
  if (!stationB) {
    return false;
  }
  if (!snapshot.stationA) {
    return true;
  }
  const stationA = STATION_BY_ID.get(snapshot.stationA);
  return stationA !== undefined && areStationsCompatible(stationA, stationB);
}

function createField(
  id: string,
  labelText: string,
  select: HTMLSelectElement
): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "ground-station-list-picker__field";
  label.htmlFor = id;

  const text = document.createElement("span");
  text.className = "ground-station-list-picker__label";
  text.textContent = labelText;

  label.append(text, select);
  return label;
}

function createSelect(id: string, ariaLabel: string): HTMLSelectElement {
  const select = document.createElement("select");
  select.id = id;
  select.className = "ground-station-list-picker__select";
  select.setAttribute("aria-label", ariaLabel);
  return select;
}

function appendPlaceholder(
  select: HTMLSelectElement,
  label: string,
  disabled = false
): void {
  const option = document.createElement("option");
  option.value = "";
  option.textContent = label;
  option.disabled = disabled;
  select.appendChild(option);
}

function getSelectedAnchorStations(
  snapshot: SelectionSnapshot
): ReadonlyArray<RegistryStation> {
  const anchors: RegistryStation[] = [];
  const stationA = snapshot.stationA ? STATION_BY_ID.get(snapshot.stationA) : undefined;
  const stationB = snapshot.stationB ? STATION_BY_ID.get(snapshot.stationB) : undefined;
  if (stationA) {
    anchors.push(stationA);
  }
  if (stationB && stationB.id !== stationA?.id) {
    anchors.push(stationB);
  }
  return anchors;
}

function getStationHandoverFilterKinds(
  station: RegistryStation,
  snapshot: SelectionSnapshot
): ReadonlyArray<HandoverOrbitFilterKind> {
  const anchors = getSelectedAnchorStations(snapshot);
  if (anchors.length === 0) {
    const capability = HANDOVER_CAPABILITY_SUMMARY.byStationId.get(station.id);
    const kind = capability
      ? getStationCapabilityKindForFilter(capability.kind)
      : null;
    return kind ? [kind] : [];
  }

  const kinds = new Set<HandoverOrbitFilterKind>();
  for (const anchor of anchors) {
    if (anchor.id === station.id) {
      continue;
    }
    const kind = getHandoverFilterKindForPair(anchor, station);
    if (kind) {
      kinds.add(kind);
    }
  }
  return Array.from(kinds);
}

function formatStationOptionText(
  station: RegistryStation,
  snapshot: SelectionSnapshot
): string {
  const pairKinds = getStationHandoverFilterKinds(station, snapshot);
  if (getSelectedAnchorStations(snapshot).length > 0) {
    if (pairKinds.length === 1) {
      return `${station.name} · ${pairKinds[0]} pair`;
    }
    if (pairKinds.length > 1) {
      return `${station.name} · 2/3-orbit pairs`;
    }
  }

  const capability = HANDOVER_CAPABILITY_SUMMARY.byStationId.get(station.id);
  if (!capability || capability.kind === "none") {
    return `${station.name} · no handover pair`;
  }
  if (capability.kind !== HANDOVER_CAPABILITY_SUMMARY.minorityKind) {
    return station.name;
  }
  return capability.kind === "tri-capable"
    ? `${station.name} · rare 3-orbit`
    : `${station.name} · rare 2-orbit`;
}

function renderHiddenSelect(select: HTMLSelectElement): void {
  select.replaceChildren();
  appendPlaceholder(select, "Stations hidden", true);
  select.value = "";
  select.disabled = true;
}

function renderOptions(
  select: HTMLSelectElement,
  stations: ReadonlyArray<RegistryStation>,
  value: string | null,
  placeholder: string,
  emptyLabel: string,
  optionSnapshot: SelectionSnapshot
): void {
  select.replaceChildren();
  const selectedStation = value ? STATION_BY_ID.get(value) : undefined;
  const hasSelectedOption =
    selectedStation !== undefined &&
    stations.some((station) => station.id === selectedStation.id);

  if (stations.length === 0) {
    if (selectedStation) {
      appendPlaceholder(select, placeholder);
      const option = document.createElement("option");
      option.value = selectedStation.id;
      option.textContent = formatStationOptionText(selectedStation, optionSnapshot);
      option.title = selectedStation.operator;
      select.appendChild(option);
      select.value = selectedStation.id;
      select.disabled = false;
      return;
    }
    appendPlaceholder(select, emptyLabel, true);
    select.value = "";
    select.disabled = true;
    return;
  }

  appendPlaceholder(select, placeholder);
  for (const station of stations) {
    const option = document.createElement("option");
    option.value = station.id;
    option.textContent = formatStationOptionText(station, optionSnapshot);
    option.title = station.operator;
    select.appendChild(option);
  }
  if (selectedStation && !hasSelectedOption) {
    const option = document.createElement("option");
    option.value = selectedStation.id;
    option.textContent = formatStationOptionText(selectedStation, optionSnapshot);
    option.title = selectedStation.operator;
    select.appendChild(option);
  }

  select.disabled = false;
  select.value = value && selectedStation ? value : "";
}

function stationMatchesFilters(
  station: RegistryStation,
  filters: FilterState,
  snapshot: SelectionSnapshot
): boolean {
  const allowedOrbits = new Set(filters.allowedOrbits);
  const hasAllowedOrbit = station.supportedOrbits.some((orbit) =>
    allowedOrbits.has(orbit)
  );
  if (!hasAllowedOrbit) {
    return false;
  }

  const allowedRegions = filters.allowedRegions;
  if (allowedRegions !== null && !allowedRegions.includes(station.region)) {
    return false;
  }

  const allowedBands = filters.allowedBands;
  if (
    allowedBands !== null &&
    !station.supportedBands.some((band) => allowedBands.includes(band))
  ) {
    return false;
  }

  const allowedHandoverKinds = new Set(filters.allowedHandoverKinds);
  const handoverKinds = getStationHandoverFilterKinds(station, snapshot);
  if (!handoverKinds.some((kind) => allowedHandoverKinds.has(kind))) {
    return false;
  }

  return true;
}

function getFilteredStations(
  filters: FilterState,
  snapshot: SelectionSnapshot
): ReadonlyArray<RegistryStation> {
  return STATIONS.filter((station) =>
    stationMatchesFilters(station, filters, snapshot)
  );
}

function isFilterValueActive(
  station: RegistryStation,
  dimension: FilterDimension,
  value: string,
  snapshot: SelectionSnapshot
): boolean {
  if (dimension === "orbit") {
    return station.supportedOrbits.includes(value as OrbitClass);
  }
  if (dimension === "region") {
    return station.region === value;
  }
  if (dimension === "band") {
    return station.supportedBands.includes(value);
  }
  return getStationHandoverFilterKinds(station, snapshot).includes(
    value as HandoverOrbitFilterKind
  );
}

function stationMatchesOtherFilters(
  station: RegistryStation,
  filters: FilterState,
  dimension: FilterDimension,
  snapshot: SelectionSnapshot
): boolean {
  if (
    dimension !== "orbit" &&
    !station.supportedOrbits.some((orbit) => filters.allowedOrbits.includes(orbit))
  ) {
    return false;
  }

  if (
    dimension !== "region" &&
    filters.allowedRegions !== null &&
    !filters.allowedRegions.includes(station.region)
  ) {
    return false;
  }

  if (
    dimension !== "band" &&
    filters.allowedBands !== null &&
    !station.supportedBands.some((band) => filters.allowedBands?.includes(band))
  ) {
    return false;
  }

  if (
    dimension !== "handover" &&
    !getStationHandoverFilterKinds(station, snapshot).some((kind) =>
      filters.allowedHandoverKinds.includes(kind)
    )
  ) {
    return false;
  }

  return true;
}

function getFacetCounts<T extends string>(
  descriptors: ReadonlyArray<FilterDescriptor<T>>,
  dimension: FilterDimension,
  filters: FilterState,
  pool: ReadonlyArray<RegistryStation>,
  snapshot: SelectionSnapshot
): ReadonlyMap<T, number> {
  const counts = new Map<T, number>();
  for (const descriptor of descriptors) {
    const count = pool.filter(
      (station) =>
        stationMatchesOtherFilters(station, filters, dimension, snapshot) &&
        isFilterValueActive(station, dimension, descriptor.id, snapshot)
    ).length;
    counts.set(descriptor.id, count);
  }
  return counts;
}

function compactFilterState(
  allowedOrbits: ReadonlyArray<OrbitClass>,
  allowedHandoverKinds: ReadonlyArray<HandoverOrbitFilterKind>,
  allowedRegions: ReadonlyArray<string>,
  allowedBands: ReadonlyArray<string>
): FilterState {
  return {
    allowedOrbits,
    allowedHandoverKinds,
    allowedRegions: allowedRegions.length === ALL_REGION_IDS.length ? null : allowedRegions,
    allowedBands: allowedBands.length === ALL_BAND_IDS.length ? null : allowedBands
  };
}

function filterStatesEqual(a: FilterState, b: FilterState): boolean {
  return a.allowedOrbits.join("|") === b.allowedOrbits.join("|") &&
    a.allowedHandoverKinds.join("|") === b.allowedHandoverKinds.join("|") &&
    (a.allowedRegions ?? ALL_REGION_IDS).join("|") ===
      (b.allowedRegions ?? ALL_REGION_IDS).join("|") &&
    (a.allowedBands ?? ALL_BAND_IDS).join("|") ===
      (b.allowedBands ?? ALL_BAND_IDS).join("|");
}

function deriveFilterState(
  selections: UserFilterSelections,
  pool: ReadonlyArray<RegistryStation> = STATIONS,
  snapshot: SelectionSnapshot = { stationA: null, stationB: null }
): FilterState {
  const selectedOrbits = ORBIT_ORDER.filter((orbit) =>
    selections.selectedOrbits.has(orbit)
  );
  const selectedHandoverKinds = ALL_HANDOVER_IDS.filter((kind) =>
    selections.selectedHandoverKinds.has(kind)
  );
  const selectedRegions = ALL_REGION_IDS.filter((region) =>
    selections.selectedRegions.has(region)
  );
  const selectedBands = ALL_BAND_IDS.filter((band) =>
    selections.selectedBands.has(band)
  );
  if (
    selectedOrbits.length === 0 ||
    selectedHandoverKinds.length === 0 ||
    selectedRegions.length === 0 ||
    selectedBands.length === 0
  ) {
    return compactFilterState(
      selectedOrbits,
      selectedHandoverKinds,
      selectedRegions,
      selectedBands
    );
  }

  let next = compactFilterState(
    selectedOrbits,
    selectedHandoverKinds,
    selectedRegions,
    selectedBands
  );
  for (let index = 0; index < 4; index += 1) {
    const orbitCounts = getFacetCounts(
      ORBIT_ORDER.map((orbit) => ({ id: orbit, label: orbit })),
      "orbit",
      next,
      pool,
      snapshot
    );
    const handoverCounts = getFacetCounts(
      HANDOVER_ORDER,
      "handover",
      next,
      pool,
      snapshot
    );
    const regionCounts = getFacetCounts(
      REGION_ORDER,
      "region",
      next,
      pool,
      snapshot
    );
    const bandCounts = getFacetCounts(BAND_ORDER, "band", next, pool, snapshot);
    const nextOrbits = selectedOrbits.filter(
      (orbit) => (orbitCounts.get(orbit) ?? 0) > 0
    );
    const nextHandoverKinds = selectedHandoverKinds.filter(
      (kind) => (handoverCounts.get(kind) ?? 0) > 0
    );
    const nextRegions = selectedRegions.filter(
      (region) => (regionCounts.get(region) ?? 0) > 0
    );
    const nextBands = selectedBands.filter(
      (band) => (bandCounts.get(band) ?? 0) > 0
    );
    const normalized = compactFilterState(
      nextOrbits,
      nextHandoverKinds,
      nextRegions,
      nextBands
    );
    if (filterStatesEqual(normalized, next)) {
      return normalized;
    }
    next = normalized;
  }
  return next;
}

function createAllUserFilterSelections(): UserFilterSelections {
  return {
    selectedOrbits: new Set(ORBIT_ORDER),
    selectedHandoverKinds: new Set(ALL_HANDOVER_IDS),
    selectedRegions: new Set(ALL_REGION_IDS),
    selectedBands: new Set(ALL_BAND_IDS)
  };
}

function createSeededUserFilterSelections(
  dimension: FilterDimension,
  value: string
): UserFilterSelections {
  return {
    selectedOrbits: new Set(
      dimension === "orbit" ? [value as OrbitClass] : ORBIT_ORDER
    ),
    selectedHandoverKinds: new Set(
      dimension === "handover"
        ? [value as HandoverOrbitFilterKind]
        : ALL_HANDOVER_IDS
    ),
    selectedRegions: new Set(
      dimension === "region" ? [value] : ALL_REGION_IDS
    ),
    selectedBands: new Set(
      dimension === "band" ? [value] : ALL_BAND_IDS
    )
  };
}

function getStationAOptions(
  snapshot: SelectionSnapshot,
  filters: FilterState
): ReadonlyArray<RegistryStation> {
  const optionSnapshot: SelectionSnapshot = {
    stationA: null,
    stationB: snapshot.stationB
  };
  const stations = getFilteredStations(filters, optionSnapshot);
  if (!snapshot.stationB) {
    return stations;
  }
  const stationB = STATION_BY_ID.get(snapshot.stationB);
  if (!stationB) {
    return stations;
  }
  return stations.filter((station) => areStationsCompatible(station, stationB));
}

function getStationBOptions(
  snapshot: SelectionSnapshot,
  filters: FilterState
): ReadonlyArray<RegistryStation> {
  const optionSnapshot: SelectionSnapshot = {
    stationA: snapshot.stationA,
    stationB: null
  };
  const stations = getFilteredStations(filters, optionSnapshot);
  if (!snapshot.stationA) {
    return stations;
  }
  const stationA = STATION_BY_ID.get(snapshot.stationA);
  if (!stationA) {
    return stations;
  }
  return stations.filter(
    (station) => areStationsCompatible(stationA, station)
  );
}

function getCompatibilityPoolForSnapshot(
  snapshot: SelectionSnapshot
): ReadonlyArray<RegistryStation> {
  const stationA = snapshot.stationA ? STATION_BY_ID.get(snapshot.stationA) : undefined;
  const stationB = snapshot.stationB ? STATION_BY_ID.get(snapshot.stationB) : undefined;

  if (stationA && !stationB) {
    return STATIONS.filter((station) => areStationsCompatible(stationA, station));
  }
  if (stationB && !stationA) {
    return STATIONS.filter((station) => areStationsCompatible(station, stationB));
  }
  if (stationA && stationB) {
    return STATIONS.filter(
      (station) =>
        areStationsCompatible(stationA, station) ||
        areStationsCompatible(station, stationB)
    );
  }
  return STATIONS;
}

function buildMarkerAllowList(
  snapshot: SelectionSnapshot,
  filters: FilterState
): ReadonlyArray<string> {
  const ids = new Set<string>();
  if (snapshot.stationA) {
    ids.add(snapshot.stationA);
  }
  if (snapshot.stationB) {
    ids.add(snapshot.stationB);
  }
  for (const station of getCompatibilityPoolForSnapshot(snapshot)) {
    if (stationMatchesFilters(station, filters, snapshot)) {
      ids.add(station.id);
    }
  }
  return Array.from(ids);
}

function createFilterGroup<T extends string>(
  labelText: string,
  containerClassName: string,
  chipClassName: string,
  dataName: string,
  descriptors: ReadonlyArray<FilterDescriptor<T>>
): { readonly group: HTMLElement; readonly chips: ReadonlyMap<T, HTMLButtonElement> } {
  const group = document.createElement("div");
  group.className = "gs-filter-group";

  const groupLabel = document.createElement("span");
  groupLabel.className = "gs-filter-group__label";
  groupLabel.textContent = labelText;

  const container = document.createElement("div");
  container.className = containerClassName;

  const chips = new Map<T, HTMLButtonElement>();
  for (const descriptor of descriptors) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = chipClassName;
    chip.setAttribute(`data-${dataName}`, descriptor.id);
    chip.setAttribute("data-active", "false");
    chip.setAttribute("aria-pressed", "false");
    chip.setAttribute("aria-label", `Toggle ${descriptor.label} ${labelText.toLowerCase()} filter`);
    chip.textContent = descriptor.label;
    container.appendChild(chip);
    chips.set(descriptor.id, chip);
  }

  group.append(groupLabel, container);
  return { group, chips };
}

function createPickerElements(): PickerElements {
  const root = document.createElement("aside");
  root.className = "ground-station-list-picker";
  root.setAttribute("aria-label", "Keyboard station picker");

  const header = document.createElement("div");
  header.className = "ground-station-list-picker__header";

  const title = document.createElement("span");
  title.className = "ground-station-list-picker__title";
  title.textContent = "Ground Stations";

  const visibilityToggle = document.createElement("button");
  visibilityToggle.type = "button";
  visibilityToggle.className = "gs-filter-panel__vis-toggle";
  visibilityToggle.innerHTML =
    `<span class="gs-toggle__track" aria-hidden="true"><span class="gs-toggle__thumb"></span></span>`;

  header.append(title, visibilityToggle);

  const selectA = createSelect(
    "ground-station-list-picker-station-a",
    "Select Station A"
  );
  const selectB = createSelect(
    "ground-station-list-picker-station-b",
    "Select Station B"
  );

  const filtersButton = document.createElement("button");
  filtersButton.type = "button";
  filtersButton.className = "ground-station-list-picker__filters-button";
  filtersButton.setAttribute("data-open", "false");
  filtersButton.setAttribute("aria-expanded", "false");
  filtersButton.innerHTML =
    `Filters <span class="ground-station-list-picker__chevron" aria-hidden="true">▾</span>`;

  const filtersBody = document.createElement("div");
  filtersBody.className = "ground-station-list-picker__filters-body";
  filtersBody.hidden = true;

  const orbitFilter = createFilterGroup(
    "Orbit",
    "ground-station-orbit-filter",
    "ground-station-orbit-filter__chip",
    "orbit",
    ORBIT_ORDER.map((orbit) => ({ id: orbit, label: orbit }))
  );
  const handoverFilter = createFilterGroup(
    "Handover",
    "ground-station-band-filter",
    "ground-station-band-filter__chip",
    "handover",
    HANDOVER_ORDER
  );
  const regionFilter = createFilterGroup(
    "Region",
    "ground-station-region-filter",
    "ground-station-region-filter__chip",
    "region",
    REGION_ORDER
  );
  const bandFilter = createFilterGroup(
    "Band",
    "ground-station-band-filter",
    "ground-station-band-filter__chip",
    "band",
    BAND_ORDER
  );
  filtersBody.append(
    orbitFilter.group,
    handoverFilter.group,
    regionFilter.group,
    bandFilter.group
  );

  root.append(
    header,
    createField(selectA.id, "Station A", selectA),
    createField(selectB.id, "Station B", selectB),
    filtersButton,
    filtersBody
  );

  return {
    root,
    selectA,
    selectB,
    visibilityToggle,
    filtersButton,
    filtersBody,
    orbitChips: orbitFilter.chips,
    handoverChips: handoverFilter.chips,
    regionChips: regionFilter.chips,
    bandChips: bandFilter.chips
  };
}

export interface StationListPickerHandle {
  dispose(): void;
}

export function mountStationListPicker(
  viewerContainer: HTMLElement,
  store: SelectionStore,
  markers: GroundStationMarkersHandle
): StationListPickerHandle {
  const elements = createPickerElements();
  viewerContainer.appendChild(elements.root);
  let userSelections = createAllUserFilterSelections();
  let filterState: FilterState = deriveFilterState(
    userSelections,
    STATIONS,
    store.getSnapshot()
  );

  function syncMarkers(snapshot: SelectionSnapshot): void {
    markers.setSelectedStations({
      stationA: snapshot.stationA,
      stationB: snapshot.stationB
    });
    markers.setStationAllowList(buildMarkerAllowList(snapshot, filterState));
  }

  function recalculateFilters(snapshot: SelectionSnapshot): void {
    filterState = deriveFilterState(
      userSelections,
      getCompatibilityPoolForSnapshot(snapshot),
      snapshot
    );
    markers.setOrbitFilter(filterState.allowedOrbits);
    markers.setRegionFilter(filterState.allowedRegions);
    markers.setBandFilter(filterState.allowedBands);
    syncMarkers(snapshot);
  }

  function render(snapshot: SelectionSnapshot): void {
    if (!markers.isVisible()) {
      renderHiddenSelect(elements.selectA);
      renderHiddenSelect(elements.selectB);
      return;
    }
    const stationAOptionSnapshot: SelectionSnapshot = {
      stationA: null,
      stationB: snapshot.stationB
    };
    const stationBOptionSnapshot: SelectionSnapshot = {
      stationA: snapshot.stationA,
      stationB: null
    };
    renderOptions(
      elements.selectA,
      getStationAOptions(snapshot, filterState),
      snapshot.stationA,
      "Choose Station A",
      "No Station A options",
      stationAOptionSnapshot
    );
    renderOptions(
      elements.selectB,
      getStationBOptions(snapshot, filterState),
      snapshot.stationB,
      snapshot.stationA ? "Choose compatible Station B" : "Choose Station B",
      "No compatible Station B",
      stationBOptionSnapshot
    );
  }

  function clearInvalidSelections(snapshot: SelectionSnapshot): boolean {
    if (snapshot.stationA && !STATION_BY_ID.has(snapshot.stationA)) {
      store.clear("stationA");
      return true;
    }
    if (snapshot.stationB && !STATION_BY_ID.has(snapshot.stationB)) {
      store.clear("stationB");
      return true;
    }
    if (!isStationBValid(snapshot)) {
      store.clear("stationB");
      return true;
    }
    return false;
  }

  function reconcile(snapshot: SelectionSnapshot): void {
    recalculateFilters(snapshot);
    if (markers.isVisible() && clearInvalidSelections(snapshot)) {
      return;
    }
    syncFilterChips(snapshot);
    render(snapshot);
  }

  function resetFiltersToAll(): void {
    userSelections = createAllUserFilterSelections();
    recalculateFilters(store.getSnapshot());
  }

  function syncFilters(): void {
    reconcile(store.getSnapshot());
  }

  function syncFilterChips(snapshot: SelectionSnapshot): void {
    const visible = markers.isVisible();
    const pool = visible
      ? getCompatibilityPoolForSnapshot(snapshot)
      : STATIONS;
    const displayFilterState = visible
      ? filterState
      : deriveFilterState(createAllUserFilterSelections(), STATIONS, snapshot);
    const activeRegions = filterState.allowedRegions ?? ALL_REGION_IDS;
    const activeBands = filterState.allowedBands ?? ALL_BAND_IDS;
    const orbitCounts = getFacetCounts(
      ORBIT_ORDER.map((orbit) => ({ id: orbit, label: orbit })),
      "orbit",
      displayFilterState,
      pool,
      snapshot
    );
    const handoverCounts = getFacetCounts(
      HANDOVER_ORDER,
      "handover",
      displayFilterState,
      pool,
      snapshot
    );
    const regionCounts = getFacetCounts(
      REGION_ORDER,
      "region",
      displayFilterState,
      pool,
      snapshot
    );
    const bandCounts = getFacetCounts(
      BAND_ORDER,
      "band",
      displayFilterState,
      pool,
      snapshot
    );

    for (const orbit of ORBIT_ORDER) {
      const chip = elements.orbitChips.get(orbit);
      const count = orbitCounts.get(orbit) ?? 0;
      const available = count > 0;
      const active = visible && available && filterState.allowedOrbits.includes(orbit);
      if (chip) {
        chip.textContent = `${orbit} (${count})`;
        chip.disabled = !available;
        chip.setAttribute("aria-disabled", String(!available));
        chip.setAttribute("data-active", String(active));
        chip.setAttribute("aria-pressed", String(active));
        chip.setAttribute("aria-label", `Toggle ${orbit} orbit filter, ${count} stations`);
      }
    }
    for (const descriptor of HANDOVER_ORDER) {
      const chip = elements.handoverChips.get(descriptor.id);
      const count = handoverCounts.get(descriptor.id) ?? 0;
      const available = count > 0;
      const active =
        visible &&
        available &&
        filterState.allowedHandoverKinds.includes(descriptor.id);
      if (chip) {
        chip.textContent = `${descriptor.label} (${count})`;
        chip.disabled = !available;
        chip.setAttribute("aria-disabled", String(!available));
        chip.setAttribute("data-active", String(active));
        chip.setAttribute("aria-pressed", String(active));
        chip.setAttribute(
          "aria-label",
          `Toggle ${descriptor.label} handover filter, ${count} stations`
        );
      }
    }
    for (const descriptor of REGION_ORDER) {
      const chip = elements.regionChips.get(descriptor.id);
      const count = regionCounts.get(descriptor.id) ?? 0;
      const available = count > 0;
      const active = visible && available && activeRegions.includes(descriptor.id);
      if (chip) {
        chip.textContent = `${descriptor.label} (${count})`;
        chip.disabled = !available;
        chip.setAttribute("aria-disabled", String(!available));
        chip.setAttribute("data-active", String(active));
        chip.setAttribute("aria-pressed", String(active));
        chip.setAttribute(
          "aria-label",
          `Toggle ${descriptor.label} region filter, ${count} stations`
        );
      }
    }
    for (const descriptor of BAND_ORDER) {
      const chip = elements.bandChips.get(descriptor.id);
      const count = bandCounts.get(descriptor.id) ?? 0;
      const available = count > 0;
      const active = visible && available && activeBands.includes(descriptor.id);
      if (chip) {
        chip.textContent = `${descriptor.label} (${count})`;
        chip.disabled = !available;
        chip.setAttribute("aria-disabled", String(!available));
        chip.setAttribute("data-active", String(active));
        chip.setAttribute("aria-pressed", String(active));
        chip.setAttribute(
          "aria-label",
          `Toggle ${descriptor.label} band filter, ${count} stations`
        );
      }
    }
  }

  function syncVisibilityToggle(): void {
    const visible = markers.isVisible();
    elements.visibilityToggle.setAttribute("data-active", visible ? "true" : "false");
    elements.visibilityToggle.setAttribute("aria-pressed", visible ? "true" : "false");
    elements.visibilityToggle.setAttribute(
      "aria-label",
      visible ? "Hide ground stations" : "Show ground stations"
    );
    elements.visibilityToggle.title = visible ? "Hide ground stations" : "Show ground stations";
    elements.filtersButton.disabled = false;
    elements.filtersButton.setAttribute("aria-disabled", "false");
    viewerContainer.dataset.gsVisible = visible ? "true" : "false";
  }

  function toggleFilterValue(dimension: FilterDimension, value: string): void {
    if (!markers.isVisible()) {
      markers.setVisible(true);
      userSelections = createSeededUserFilterSelections(dimension, value);
      syncVisibilityToggle();
      syncFilters();
      return;
    }

    if (dimension === "orbit") {
      const active = new Set(userSelections.selectedOrbits);
      if (active.has(value as OrbitClass)) {
        active.delete(value as OrbitClass);
      } else {
        active.add(value as OrbitClass);
      }
      userSelections = {
        ...userSelections,
        selectedOrbits: new Set(ORBIT_ORDER.filter((orbit) => active.has(orbit)))
      };
      if (userSelections.selectedOrbits.size === 0) {
        markers.setVisible(false);
        store.clearAll();
        syncVisibilityToggle();
        reconcile(store.getSnapshot());
        return;
      }
      syncFilters();
      return;
    }

    if (dimension === "region") {
      const active = new Set(userSelections.selectedRegions);
      if (active.has(value)) {
        active.delete(value);
      } else {
        active.add(value);
      }
      userSelections = {
        ...userSelections,
        selectedRegions: new Set(ALL_REGION_IDS.filter((region) => active.has(region)))
      };
      syncFilters();
      return;
    }

    if (dimension === "handover") {
      const active = new Set(userSelections.selectedHandoverKinds);
      if (active.has(value as HandoverOrbitFilterKind)) {
        active.delete(value as HandoverOrbitFilterKind);
      } else {
        active.add(value as HandoverOrbitFilterKind);
      }
      userSelections = {
        ...userSelections,
        selectedHandoverKinds: new Set(
          ALL_HANDOVER_IDS.filter((kind) => active.has(kind))
        )
      };
      syncFilters();
      return;
    }

    const active = new Set(userSelections.selectedBands);
    if (active.has(value)) {
      active.delete(value);
    } else {
      active.add(value);
    }
    userSelections = {
      ...userSelections,
      selectedBands: new Set(ALL_BAND_IDS.filter((band) => active.has(band)))
    };
    syncFilters();
  }

  const handleVisibilityToggle = (event: Event): void => {
    event.preventDefault();
    const nextVisible = !markers.isVisible();
    markers.setVisible(nextVisible);
    if (!nextVisible) {
      store.clearAll();
    } else {
      resetFiltersToAll();
    }
    syncVisibilityToggle();
    reconcile(store.getSnapshot());
  };

  const handleFiltersToggle = (event: Event): void => {
    event.preventDefault();
    const next = elements.filtersButton.getAttribute("data-open") !== "true";
    elements.filtersButton.setAttribute("data-open", String(next));
    elements.filtersButton.setAttribute("aria-expanded", String(next));
    elements.filtersBody.hidden = !next;
    const chevron = elements.filtersButton.querySelector(
      ".ground-station-list-picker__chevron"
    );
    if (chevron) {
      chevron.textContent = next ? "▴" : "▾";
    }
  };

  const handleStationAChange = (): void => {
    const nextStationA = elements.selectA.value || null;
    const previousStationB = store.getSnapshot().stationB;
    store.setStation("stationA", nextStationA);
    const nextSnapshot = store.getSnapshot();
    if (nextStationA) {
      markers.flyToStation(nextStationA);
    }
    if (
      previousStationB &&
      nextSnapshot.stationA &&
      !isStationBValid(nextSnapshot)
    ) {
      store.clear("stationB");
    }
  };

  const handleStationBChange = (): void => {
    const nextStationB = elements.selectB.value || null;
    const previousStationA = store.getSnapshot().stationA;
    store.setStation("stationB", nextStationB);
    const nextSnapshot = store.getSnapshot();
    if (nextStationB) {
      markers.flyToStation(nextStationB);
    }
    if (
      previousStationA &&
      nextSnapshot.stationB &&
      !isStationAValid(nextSnapshot)
    ) {
      store.clear("stationA");
    }
  };

  elements.selectA.addEventListener("change", handleStationAChange);
  elements.selectB.addEventListener("change", handleStationBChange);
  elements.visibilityToggle.addEventListener("click", handleVisibilityToggle);
  elements.filtersButton.addEventListener("click", handleFiltersToggle);
  for (const [orbit, chip] of elements.orbitChips) {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFilterValue("orbit", orbit);
    });
  }
  for (const [handoverKind, chip] of elements.handoverChips) {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFilterValue("handover", handoverKind);
    });
  }
  for (const [region, chip] of elements.regionChips) {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFilterValue("region", region);
    });
  }
  for (const [band, chip] of elements.bandChips) {
    chip.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFilterValue("band", band);
    });
  }

  syncFilters();
  syncVisibilityToggle();
  reconcile(store.getSnapshot());
  const unsubscribe = store.subscribe(reconcile);

  return {
    dispose(): void {
      unsubscribe();
      elements.selectA.removeEventListener("change", handleStationAChange);
      elements.selectB.removeEventListener("change", handleStationBChange);
      elements.visibilityToggle.removeEventListener("click", handleVisibilityToggle);
      elements.filtersButton.removeEventListener("click", handleFiltersToggle);
      delete viewerContainer.dataset.gsVisible;
      if (elements.root.parentElement) {
        elements.root.parentElement.removeChild(elements.root);
      }
    }
  };
}
