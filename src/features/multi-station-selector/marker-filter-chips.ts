import registry from "../../../public/fixtures/ground-stations/multi-orbit-public-registry.json";
import type { GroundStationMarkersHandle } from "./station-markers";

type OrbitClass = "LEO" | "MEO" | "GEO";

interface RegistryStationLite {
  readonly supportedOrbits: ReadonlyArray<OrbitClass>;
}

const ORBIT_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

function computeOrbitCounts(): Record<OrbitClass, number> {
  const stations = registry.stations as ReadonlyArray<RegistryStationLite>;
  const counts: Record<OrbitClass, number> = { LEO: 0, MEO: 0, GEO: 0 };
  for (const station of stations) {
    for (const orbit of ORBIT_ORDER) {
      if (station.supportedOrbits.includes(orbit)) {
        counts[orbit] += 1;
      }
    }
  }
  return counts;
}

export function mountMarkerFilterChips(
  viewerContainer: HTMLElement,
  markers: GroundStationMarkersHandle
): { dispose(): void } {
  const counts = computeOrbitCounts();
  const initial = markers.getOrbitFilter();
  const active = new Set<OrbitClass>(initial);

  const container = document.createElement("aside");
  container.className = "ground-station-orbit-filter";

  const chipByOrbit = new Map<OrbitClass, HTMLButtonElement>();
  const listeners: Array<{ el: HTMLButtonElement; fn: (event: Event) => void }> = [];

  function syncActiveAttribute(): void {
    for (const orbit of ORBIT_ORDER) {
      const chip = chipByOrbit.get(orbit);
      if (chip) {
        chip.setAttribute("data-active", active.has(orbit) ? "true" : "false");
        chip.setAttribute("aria-pressed", active.has(orbit) ? "true" : "false");
      }
    }
  }

  for (const orbit of ORBIT_ORDER) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ground-station-orbit-filter__chip";
    chip.setAttribute("data-orbit", orbit);

    const labelNode = document.createTextNode(orbit);
    chip.appendChild(labelNode);

    const countNode = document.createElement("span");
    countNode.className = "ground-station-orbit-filter__count";
    countNode.textContent = `(${counts[orbit]})`;
    chip.appendChild(countNode);

    const handler = (event: Event): void => {
      event.preventDefault();
      if (active.has(orbit)) {
        active.delete(orbit);
      } else {
        active.add(orbit);
      }
      const next: ReadonlyArray<OrbitClass> = ORBIT_ORDER.filter((o) => active.has(o));
      markers.setOrbitFilter(next);
      syncActiveAttribute();
    };

    chip.addEventListener("click", handler);
    listeners.push({ el: chip, fn: handler });
    chipByOrbit.set(orbit, chip);
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
      chipByOrbit.clear();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
}
