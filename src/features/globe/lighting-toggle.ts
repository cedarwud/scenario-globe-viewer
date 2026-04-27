import type { Viewer } from "cesium";
import { isLightingEnabled, setLightingEnabled } from "./lighting";

const LIGHT_ON_ICON = `
<svg class="viewer-lighting-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="4.6" />
  <path d="M16 3.8v4" />
  <path d="M16 24.2v4" />
  <path d="M3.8 16h4" />
  <path d="M24.2 16h4" />
  <path d="m7.4 7.4 2.8 2.8" />
  <path d="m21.8 21.8 2.8 2.8" />
  <path d="m24.6 7.4-2.8 2.8" />
  <path d="m10.2 21.8-2.8 2.8" />
</svg>
`;

const LIGHT_OFF_ICON = `
<svg class="viewer-lighting-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="4.6" />
  <path d="M16 3.8v4" />
  <path d="M16 24.2v4" />
  <path d="M3.8 16h4" />
  <path d="M24.2 16h4" />
  <path d="m7.4 7.4 2.8 2.8" />
  <path d="m21.8 21.8 2.8 2.8" />
  <path d="m24.6 7.4-2.8 2.8" />
  <path d="m10.2 21.8-2.8 2.8" />
  <path d="M7.5 24.5 24.5 7.5" />
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

function syncLightingToggle(button: HTMLButtonElement, viewer: Viewer): void {
  const enabled = isLightingEnabled(viewer);
  button.dataset.lightingEnabled = String(enabled);
  button.ariaPressed = String(enabled);
  button.ariaLabel = enabled ? "Disable day/night lighting" : "Enable day/night lighting";
  button.title = enabled ? "Disable day/night lighting" : "Enable day/night lighting";
  button.innerHTML = enabled ? LIGHT_ON_ICON : LIGHT_OFF_ICON;
}

export function mountLightingToggle(viewer: Viewer): () => void {
  const toolbar = getToolbar(viewer);
  if (!toolbar) {
    return () => {};
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cesium-button cesium-toolbar-button viewer-lighting-toggle";
  button.dataset.lightingToggle = "true";

  // Mount the repo-owned toggle inside Cesium's existing toolbar container so
  // the control stays in the native shell instead of introducing a second
  // floating panel.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/Viewer/Viewer.js:560-562
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/widgets/Source/shared.css:10-24
  const handleClick = () => {
    setLightingEnabled(viewer, !isLightingEnabled(viewer));
    syncLightingToggle(button, viewer);
  };

  button.addEventListener("click", handleClick);
  syncLightingToggle(button, viewer);
  toolbar.insertBefore(button, getInsertBeforeNode(toolbar));

  return () => {
    button.removeEventListener("click", handleClick);
    button.remove();
  };
}
