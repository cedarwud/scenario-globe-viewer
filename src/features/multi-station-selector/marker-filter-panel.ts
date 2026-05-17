import type { GroundStationMarkersHandle } from "./station-markers";
import { mountMarkerFilterChips } from "./marker-filter-chips";
import { mountMarkerRegionChips } from "./marker-region-chips";
import { mountMarkerBandChips } from "./marker-band-chips";

export function mountMarkerFilterPanel(
  viewerContainer: HTMLElement,
  markers: GroundStationMarkersHandle
): { dispose(): void } {
  const panel = document.createElement("aside");
  panel.className = "gs-filter-panel";

  const header = document.createElement("div");
  header.className = "gs-filter-panel__header";

  const titleLabel = document.createElement("span");
  titleLabel.className = "gs-filter-panel__title";
  titleLabel.textContent = "Ground Stations";

  const visToggle = document.createElement("button");
  visToggle.type = "button";
  visToggle.className = "gs-filter-panel__vis-toggle";
  visToggle.innerHTML =
    `<span class="gs-toggle__track" aria-hidden="true"><span class="gs-toggle__thumb"></span></span>`;

  function syncVisToggle(): void {
    const visible = markers.isVisible();
    visToggle.setAttribute("data-active", visible ? "true" : "false");
    visToggle.setAttribute("aria-pressed", visible ? "true" : "false");
    visToggle.setAttribute("aria-label", visible ? "Hide ground stations" : "Show ground stations");
    visToggle.title = visible ? "Hide ground stations" : "Show ground stations";
    viewerContainer.dataset.gsVisible = visible ? "true" : "false";
  }

  const visHandler = (e: Event): void => {
    e.preventDefault();
    markers.setVisible(!markers.isVisible());
    syncVisToggle();
  };
  visToggle.addEventListener("click", visHandler);
  syncVisToggle();

  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "gs-filter-panel__expand-btn";
  expandBtn.setAttribute("data-open", "false");
  expandBtn.setAttribute("aria-expanded", "false");
  expandBtn.innerHTML =
    `Filters <span class="gs-filter-panel__chevron" aria-hidden="true">▾</span>`;

  const body = document.createElement("div");
  body.className = "gs-filter-panel__body";
  body.hidden = true;

  const expandHandler = (e: Event): void => {
    e.preventDefault();
    const isOpen = expandBtn.getAttribute("data-open") === "true";
    const next = !isOpen;
    expandBtn.setAttribute("data-open", String(next));
    expandBtn.setAttribute("aria-expanded", String(next));
    body.hidden = !next;
    const chevron = expandBtn.querySelector(".gs-filter-panel__chevron");
    if (chevron) {
      chevron.textContent = next ? "▴" : "▾";
    }
  };
  expandBtn.addEventListener("click", expandHandler);

  const controls = document.createElement("div");
  controls.className = "gs-filter-panel__controls";
  controls.appendChild(visToggle);
  controls.appendChild(expandBtn);

  header.appendChild(titleLabel);
  header.appendChild(controls);
  panel.appendChild(header);
  panel.appendChild(body);
  viewerContainer.appendChild(panel);

  const orbitChips = mountMarkerFilterChips(body, markers);
  const regionChips = mountMarkerRegionChips(body, markers);
  const bandChips = mountMarkerBandChips(body, markers);

  return {
    dispose(): void {
      bandChips.dispose();
      regionChips.dispose();
      orbitChips.dispose();
      visToggle.removeEventListener("click", visHandler);
      expandBtn.removeEventListener("click", expandHandler);
      delete viewerContainer.dataset.gsVisible;
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
    }
  };
}
