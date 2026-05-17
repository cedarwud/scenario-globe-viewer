import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";
import type { GroundStationMarkersHandle } from "./station-markers";

interface RegistryStationLite {
  readonly region: string;
}

interface RegionDescriptor {
  readonly id: string;
  readonly label: string;
}

const REGION_ORDER: ReadonlyArray<RegionDescriptor> = [
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
  { id: "europe", label: "Europe" },
  { id: "north-america", label: "N. America" },
  { id: "oceania", label: "Oceania" },
  { id: "polar-antarctic", label: "Antarctic" },
  { id: "polar-arctic", label: "Arctic" },
  { id: "south-america", label: "S. America" }
];

function computeRegionCounts(): Record<string, number> {
  const stations = registry.stations as ReadonlyArray<RegistryStationLite>;
  const counts: Record<string, number> = {};
  for (const descriptor of REGION_ORDER) {
    counts[descriptor.id] = 0;
  }
  for (const station of stations) {
    if (counts[station.region] !== undefined) {
      counts[station.region] += 1;
    }
  }
  return counts;
}

export function mountMarkerRegionChips(
  viewerContainer: HTMLElement,
  markers: GroundStationMarkersHandle
): { dispose(): void } {
  const counts = computeRegionCounts();
  const allRegionIds = REGION_ORDER.map((descriptor) => descriptor.id);
  const initialFilter = markers.getRegionFilter();
  const active = new Set<string>(
    initialFilter === null ? allRegionIds : initialFilter
  );

  const container = document.createElement("aside");
  container.className = "ground-station-region-filter";

  const chipById = new Map<string, HTMLButtonElement>();
  const listeners: Array<{ el: HTMLButtonElement; fn: (event: Event) => void }> = [];

  function syncActiveAttribute(): void {
    for (const descriptor of REGION_ORDER) {
      const chip = chipById.get(descriptor.id);
      if (chip) {
        chip.setAttribute("data-active", active.has(descriptor.id) ? "true" : "false");
        chip.setAttribute("aria-pressed", active.has(descriptor.id) ? "true" : "false");
      }
    }
  }

  function commitFilter(): void {
    const next = allRegionIds.filter((id) => active.has(id));
    if (next.length === allRegionIds.length) {
      markers.setRegionFilter(null);
    } else {
      markers.setRegionFilter(next);
    }
  }

  for (const descriptor of REGION_ORDER) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ground-station-region-filter__chip";
    chip.setAttribute("data-region", descriptor.id);

    const labelNode = document.createTextNode(descriptor.label);
    chip.appendChild(labelNode);

    const countNode = document.createElement("span");
    countNode.className = "ground-station-region-filter__count";
    countNode.textContent = `(${counts[descriptor.id]})`;
    chip.appendChild(countNode);

    const handler = (event: Event): void => {
      event.preventDefault();
      if (active.has(descriptor.id)) {
        active.delete(descriptor.id);
      } else {
        active.add(descriptor.id);
      }
      commitFilter();
      syncActiveAttribute();
    };

    chip.addEventListener("click", handler);
    listeners.push({ el: chip, fn: handler });
    chipById.set(descriptor.id, chip);
    container.appendChild(chip);
  }

  const group = document.createElement("div");
  group.className = "gs-filter-group";
  const groupLabel = document.createElement("span");
  groupLabel.className = "gs-filter-group__label";
  groupLabel.textContent = "Region";
  group.appendChild(groupLabel);
  group.appendChild(container);

  syncActiveAttribute();
  viewerContainer.appendChild(group);

  return {
    dispose(): void {
      for (const { el, fn } of listeners) {
        el.removeEventListener("click", fn);
      }
      listeners.length = 0;
      chipById.clear();
      if (group.parentNode) {
        group.parentNode.removeChild(group);
      }
    }
  };
}
