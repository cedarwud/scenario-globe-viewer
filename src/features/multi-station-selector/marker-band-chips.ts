import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";
import type { GroundStationMarkersHandle } from "./station-markers";

interface RegistryStationLite {
  readonly supportedBands: ReadonlyArray<string>;
}

interface BandDescriptor {
  readonly id: string;
  readonly label: string;
}

const BAND_ORDER: ReadonlyArray<BandDescriptor> = [
  { id: "Ka", label: "Ka" },
  { id: "Ku", label: "Ku" },
  { id: "C", label: "C" },
  { id: "X", label: "X" },
  { id: "S", label: "S" },
  { id: "L", label: "L" }
];

function computeBandCounts(): Record<string, number> {
  const stations = registry.stations as ReadonlyArray<RegistryStationLite>;
  const counts: Record<string, number> = {};
  for (const descriptor of BAND_ORDER) {
    counts[descriptor.id] = 0;
  }
  for (const station of stations) {
    for (const band of station.supportedBands) {
      if (counts[band] !== undefined) {
        counts[band] += 1;
      }
    }
  }
  return counts;
}

export function mountMarkerBandChips(
  viewerContainer: HTMLElement,
  markers: GroundStationMarkersHandle
): { dispose(): void } {
  const counts = computeBandCounts();
  const allBandIds = BAND_ORDER.map((d) => d.id);
  const initialFilter = markers.getBandFilter();
  const active = new Set<string>(
    initialFilter === null ? allBandIds : initialFilter
  );

  const container = document.createElement("div");
  container.className = "ground-station-band-filter";

  const chipById = new Map<string, HTMLButtonElement>();
  const listeners: Array<{ el: HTMLButtonElement; fn: (event: Event) => void }> = [];

  function syncActiveAttribute(): void {
    for (const descriptor of BAND_ORDER) {
      const chip = chipById.get(descriptor.id);
      if (chip) {
        chip.setAttribute("data-active", active.has(descriptor.id) ? "true" : "false");
        chip.setAttribute("aria-pressed", active.has(descriptor.id) ? "true" : "false");
      }
    }
  }

  function commitFilter(): void {
    const next = allBandIds.filter((id) => active.has(id));
    markers.setBandFilter(next.length === allBandIds.length ? null : next);
  }

  for (const descriptor of BAND_ORDER) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ground-station-band-filter__chip";
    chip.setAttribute("data-band", descriptor.id);

    chip.appendChild(document.createTextNode(descriptor.label));

    const countNode = document.createElement("span");
    countNode.className = "ground-station-band-filter__count";
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

  syncActiveAttribute();
  viewerContainer.appendChild(container);

  return {
    dispose(): void {
      for (const { el, fn } of listeners) {
        el.removeEventListener("click", fn);
      }
      listeners.length = 0;
      chipById.clear();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
}
