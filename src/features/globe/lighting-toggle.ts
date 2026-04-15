import type { Viewer } from "cesium";
import { isLightingEnabled, setLightingEnabled } from "./lighting";

const LIGHT_ON_ICON = `
<svg class="viewer-lighting-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M16 4.75v2.5" />
  <path d="M10.5 10 8.75 8.25" />
  <path d="M21.5 10 23.25 8.25" />
  <path d="M7 16h2.5" />
  <path d="M22.5 16H25" />
  <path d="M11.5 15.5a4.5 4.5 0 1 1 9 0c0 1.48-.62 2.84-1.69 3.8-.8.72-1.33 1.62-1.5 2.7h-2.62c-.17-1.08-.7-1.98-1.5-2.7a5.1 5.1 0 0 1-1.69-3.8Z" />
  <path d="M13.5 25h5" />
  <path d="M14.25 27.75h3.5" />
</svg>
`;

const LIGHT_OFF_ICON = `
<svg class="viewer-lighting-toggle-icon" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M11.5 15.5a4.5 4.5 0 1 1 9 0c0 1.48-.62 2.84-1.69 3.8-.8.72-1.33 1.62-1.5 2.7h-2.62c-.17-1.08-.7-1.98-1.5-2.7a5.1 5.1 0 0 1-1.69-3.8Z" />
  <path d="M13.5 25h5" />
  <path d="M14.25 27.75h3.5" />
  <path d="M9 9 23 23" />
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
