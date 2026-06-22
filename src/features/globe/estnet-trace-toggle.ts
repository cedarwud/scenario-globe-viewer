import type { Viewer } from "cesium";

import {
  isEstnetTraceDisplayEnabled,
  subscribeEstnetTraceDisplay,
  toggleEstnetTraceDisplay
} from "../multi-station-selector/estnet-display-mode";

// Latency-trace pulse glyph (a packet time-series). Stroke is driven by
// `currentColor` via the shared toolbar-icon CSS, like the lighting toggle.
const ICON = `
<svg class="viewer-estnet-trace-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M3 18h5l3-10 3 10h4l2-5 2 5h5" />
</svg>
`;

function getToolbar(viewer: Viewer): HTMLElement | null {
  return viewer.container.querySelector<HTMLElement>(".cesium-viewer-toolbar");
}

// Place the toggle BETWEEN the geocoder (magnifier) and the lighting (sun)
// toggle, so the toolbar reads: geocoder | ESTNeT | lighting. The lighting
// toggle is mounted just before this one (composition.ts), so it exists as the
// insert anchor. Falls back to just after the geocoder, then the toolbar head.
function getInsertBeforeNode(toolbar: HTMLElement): ChildNode | null {
  const lightingToggle = toolbar.querySelector(".viewer-lighting-toggle");
  if (lightingToggle) {
    return lightingToggle;
  }
  const geocoderContainer = toolbar.querySelector(
    ".cesium-viewer-geocoderContainer"
  );
  if (geocoderContainer instanceof HTMLElement) {
    return geocoderContainer.nextElementSibling;
  }
  return toolbar.firstChild;
}

function syncToggle(button: HTMLButtonElement): void {
  const enabled = isEstnetTraceDisplayEnabled();
  button.dataset.estnetEnabled = String(enabled);
  button.ariaPressed = String(enabled);
  const label = enabled
    ? "Hide ESTNeT packet trace"
    : "Show ESTNeT packet trace";
  button.ariaLabel = label;
  button.title = label;
}

/**
 * Mounts the opt-in ESTNeT packet-trace toolbar toggle into Cesium's native
 * toolbar. Clicking flips the persisted display mode
 * ([[estnet-display-mode]]); the side panel subscribes to the same store and
 * re-renders to add/remove its disclosure section. Default-off, so absent any
 * interaction the accepted single-link surface is untouched. Returns a teardown
 * function.
 */
export function mountEstnetTraceToggle(viewer: Viewer): () => void {
  const toolbar = getToolbar(viewer);
  if (!toolbar) {
    return () => {};
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cesium-button cesium-toolbar-button viewer-estnet-trace-toggle";
  button.dataset.estnetTraceToggle = "true";
  button.innerHTML = ICON;

  const handleClick = (): void => {
    toggleEstnetTraceDisplay();
    syncToggle(button);
  };
  button.addEventListener("click", handleClick);

  // Keep the icon state in sync if the mode is flipped elsewhere; the immediate
  // fire also sets the initial pressed/label state.
  const unsubscribe = subscribeEstnetTraceDisplay(() => syncToggle(button));

  toolbar.insertBefore(button, getInsertBeforeNode(toolbar));

  return () => {
    unsubscribe();
    button.removeEventListener("click", handleClick);
    button.remove();
  };
}
