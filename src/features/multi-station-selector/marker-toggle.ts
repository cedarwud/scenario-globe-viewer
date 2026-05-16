import type { Viewer } from "cesium";

import type { GroundStationMarkersHandle } from "./station-markers";

const MARKERS_ON_ICON = `
<svg class="ground-station-marker-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="2.4" />
  <circle cx="8" cy="10" r="1.8" />
  <circle cx="24" cy="10" r="1.8" />
  <circle cx="8" cy="22" r="1.8" />
  <circle cx="24" cy="22" r="1.8" />
  <path d="M16 4v4" />
  <path d="M16 24v4" />
  <path d="M4 16h4" />
  <path d="M24 16h4" />
</svg>
`;

const MARKERS_OFF_ICON = `
<svg class="ground-station-marker-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="2.4" />
  <circle cx="8" cy="10" r="1.8" />
  <circle cx="24" cy="10" r="1.8" />
  <circle cx="8" cy="22" r="1.8" />
  <circle cx="24" cy="22" r="1.8" />
  <path d="M16 4v4" />
  <path d="M16 24v4" />
  <path d="M4 16h4" />
  <path d="M24 16h4" />
  <path d="M6 26 26 6" />
</svg>
`;

function getToolbar(viewer: Viewer): HTMLElement | null {
  return viewer.container.querySelector<HTMLElement>(".cesium-viewer-toolbar");
}

function getInsertBeforeNode(toolbar: HTMLElement): ChildNode | null {
  const geocoderContainer = toolbar.querySelector(".cesium-viewer-geocoderContainer");
  if (!(geocoderContainer instanceof HTMLElement)) {
    return toolbar.firstChild;
  }
  return geocoderContainer.nextElementSibling;
}

function syncToggle(
  button: HTMLButtonElement,
  markers: GroundStationMarkersHandle
): void {
  const visible = markers.isVisible();
  button.dataset.markersVisible = String(visible);
  button.ariaPressed = String(visible);
  const label = visible
    ? "Hide ground-station markers"
    : "Show ground-station markers";
  button.ariaLabel = label;
  button.title = label;
  button.innerHTML = visible ? MARKERS_ON_ICON : MARKERS_OFF_ICON;
}

export function mountGroundStationMarkerToggle(
  viewer: Viewer,
  markers: GroundStationMarkersHandle
): () => void {
  const toolbar = getToolbar(viewer);
  if (!toolbar) {
    return () => {};
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cesium-button cesium-toolbar-button ground-station-marker-toggle";
  button.dataset.groundStationMarkerToggle = "true";

  const handleClick = () => {
    markers.setVisible(!markers.isVisible());
    syncToggle(button, markers);
  };

  button.addEventListener("click", handleClick);
  syncToggle(button, markers);
  toolbar.insertBefore(button, getInsertBeforeNode(toolbar));

  return () => {
    button.removeEventListener("click", handleClick);
    button.remove();
  };
}
