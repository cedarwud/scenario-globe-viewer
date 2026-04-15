import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import { createViewer } from "./core/cesium/viewer-factory";
import {
  resolveScenePresetKey,
  type ScenePresetKey
} from "./features/globe/scene-preset";
import { refreshLightingForSceneMode } from "./features/globe/lighting";
import { mountLightingToggle } from "./features/globe/lighting-toggle";
import "./styles.css";

type BootstrapState = "booting" | "ready" | "error";

function setBootstrapState(state: BootstrapState, detail?: string): void {
  document.documentElement.dataset.bootstrapState = state;

  if (detail) {
    document.documentElement.dataset.bootstrapDetail = detail.slice(0, 240);
  } else {
    delete document.documentElement.dataset.bootstrapDetail;
  }
}

function syncVisualBaselineState(viewer: ReturnType<typeof createViewer>): void {
  document.documentElement.dataset.sceneFogActive = viewer.scene.fog.enabled
    ? "true"
    : "false";
  document.documentElement.dataset.sceneFogDensity = String(viewer.scene.fog.density);
  document.documentElement.dataset.sceneFogVisualDensityScalar = String(
    viewer.scene.fog.visualDensityScalar
  );
  document.documentElement.dataset.sceneFogHeightScalar = String(
    viewer.scene.fog.heightScalar
  );
  document.documentElement.dataset.sceneFogHeightFalloff = String(
    viewer.scene.fog.heightFalloff
  );
  document.documentElement.dataset.sceneFogMaxHeight = String(viewer.scene.fog.maxHeight);
  document.documentElement.dataset.sceneFogMinimumBrightness = String(
    viewer.scene.fog.minimumBrightness
  );
  document.documentElement.dataset.sceneBloomActive =
    viewer.scene.postProcessStages.bloom.enabled ? "true" : "false";
}

function serializeBootstrapError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown bootstrap error";
  }
}

function resolveBootstrapScenePreset(): ScenePresetKey {
  const request = new URLSearchParams(window.location.search).get("scenePreset");
  return resolveScenePresetKey(request);
}

setBootstrapState("booting");

window.addEventListener("error", (event) => {
  setBootstrapState("error", serializeBootstrapError(event.error ?? event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  setBootstrapState("error", serializeBootstrapError(event.reason));
});

initializeCesiumBootstrap();

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="viewer-shell">
    <div class="viewer-root" data-viewer-root></div>
  </main>
`;

const viewerRoot = app.querySelector<HTMLDivElement>("[data-viewer-root]");

if (!viewerRoot) {
  throw new Error("Missing viewer root");
}

const scenePreset = resolveBootstrapScenePreset();
document.documentElement.dataset.scenePreset = scenePreset;

const viewer = createViewer({
  container: viewerRoot,
  scenePresetKey: scenePreset
});
syncVisualBaselineState(viewer);
const unmountLightingToggle = mountLightingToggle(viewer);
const removeMorphCompleteListener = viewer.scene.morphComplete.addEventListener(() => {
  refreshLightingForSceneMode(viewer);
});
const removeImageryLayerAddedListener = viewer.imageryLayers.layerAdded.addEventListener(() => {
  refreshLightingForSceneMode(viewer);
});
const removeImageryLayerRemovedListener = viewer.imageryLayers.layerRemoved.addEventListener(() => {
  refreshLightingForSceneMode(viewer);
});

setBootstrapState("ready");

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    removeImageryLayerRemovedListener();
    removeImageryLayerAddedListener();
    removeMorphCompleteListener();
    unmountLightingToggle();
    viewer.destroy();
  });
}
