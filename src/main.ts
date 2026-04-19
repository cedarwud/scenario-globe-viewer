import { initializeCesiumBootstrap } from "./core/cesium/bootstrap";
import { createViewer } from "./core/cesium/viewer-factory";
import {
  resolveScenePresetKey,
  type ScenePresetKey
} from "./features/globe/scene-preset";
import { mountAppShell } from "./features/app/app-shell";
import { refreshLightingForSceneMode } from "./features/globe/lighting";
import { mountLightingToggle } from "./features/globe/lighting-toggle";
import {
  mountOptionalOsmBuildingsShowcase,
  resolveBuildingShowcaseSelection
} from "./features/globe/osm-buildings-showcase";
import { createCesiumReplayClock } from "./features/time/cesium-replay-clock";
import type { ReplayClock } from "./features/time";
import { mountBootstrapOperatorHud } from "./features/operator/bootstrap-operator-hud";
import {
  createSatelliteOverlayController,
  type SatelliteOverlayController
} from "./runtime/satellite-overlay-controller";
import { createBootstrapOperatorController } from "./runtime/bootstrap-operator-controller";
import { createBootstrapCommunicationTimeController } from "./runtime/bootstrap-communication-time-controller";
import { createBootstrapHandoverDecisionController } from "./runtime/bootstrap-handover-decision-controller";
import { createBootstrapPhysicalInputController } from "./runtime/bootstrap-physical-input-controller";
import { createBootstrapScenarioSession } from "./runtime/scenario-bootstrap-session";
import { createBootstrapScenarioCatalog } from "./runtime/resolve-bootstrap-scenario";
import "./styles.css";

type BootstrapState = "booting" | "ready" | "error";
type ViewerInstance = ReturnType<typeof createViewer>;

declare global {
  interface Window {
    __SCENARIO_GLOBE_VIEWER_CAPTURE__?: {
      viewer: ViewerInstance;
      replayClock: ReplayClock;
      satelliteOverlay: SatelliteOverlayController;
      scenarioSession: ReturnType<typeof createBootstrapScenarioSession>;
      communicationTime: ReturnType<typeof createBootstrapCommunicationTimeController>;
      physicalInput: ReturnType<typeof createBootstrapPhysicalInputController>;
      handoverDecision: ReturnType<typeof createBootstrapHandoverDecisionController>;
    };
  }
}

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

const { viewerRoot, hudFrame, statusPanel } = mountAppShell(app);

const scenePreset = resolveBootstrapScenePreset();
document.documentElement.dataset.scenePreset = scenePreset;
const buildingShowcase = resolveBuildingShowcaseSelection();

const viewer = createViewer({
  container: viewerRoot,
  scenePresetKey: scenePreset,
  buildingShowcaseKey: buildingShowcase.key
});
const replayClock = createCesiumReplayClock(viewer);
const bootstrapScenarioCatalog = createBootstrapScenarioCatalog({
  initialScenePresetKey: scenePreset,
  baselineTime: replayClock.getState()
});
const scenarioSession = createBootstrapScenarioSession({
  definitions: bootstrapScenarioCatalog.definitions,
  initialScenarioId: bootstrapScenarioCatalog.initialScenarioId,
  viewer,
  replayClock,
  scenePresetRuntime: {
    buildingShowcaseKey: buildingShowcase.key
  }
});
const bootstrapOperatorController = createBootstrapOperatorController({
  scenarioSession,
  scenarioCatalog: bootstrapScenarioCatalog,
  replayClock
});
const bootstrapCommunicationTimeController = createBootstrapCommunicationTimeController({
  operatorState: bootstrapOperatorController,
  scenarioCatalog: bootstrapScenarioCatalog
});
const bootstrapPhysicalInputController = createBootstrapPhysicalInputController({
  operatorState: bootstrapOperatorController,
  scenarioCatalog: bootstrapScenarioCatalog
});
const bootstrapHandoverDecisionController = createBootstrapHandoverDecisionController({
  operatorState: bootstrapOperatorController,
  scenarioCatalog: bootstrapScenarioCatalog
});
const unmountBootstrapOperatorHud = mountBootstrapOperatorHud({
  hudFrame,
  statusPanel,
  controller: bootstrapOperatorController,
  communicationTimeController: bootstrapCommunicationTimeController,
  physicalInputController: bootstrapPhysicalInputController,
  handoverDecisionController: bootstrapHandoverDecisionController
});
const satelliteOverlay = createSatelliteOverlayController({
  viewer,
  replayClock
});
// Phase 2.12 capture harnesses need a narrow viewer handle so they can wait for
// the active camera/tiles state to settle without rewriting preset framing or
// the native shell. The replay-clock stays on that same narrow capture seam for
// targeted validation even though Phase 3.5 now also reads plain clock state
// locally for the repo-owned status-panel placeholder.
window.__SCENARIO_GLOBE_VIEWER_CAPTURE__ = {
  viewer,
  replayClock,
  satelliteOverlay,
  scenarioSession,
  communicationTime: bootstrapCommunicationTimeController,
  physicalInput: bootstrapPhysicalInputController,
  handoverDecision: bootstrapHandoverDecisionController
};
syncVisualBaselineState(viewer);
const unmountLightingToggle = mountLightingToggle(viewer);
const unmountOsmBuildingsShowcase = mountOptionalOsmBuildingsShowcase(
  viewer,
  buildingShowcase
);
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
    delete window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
    removeImageryLayerRemovedListener();
    removeImageryLayerAddedListener();
    removeMorphCompleteListener();
    unmountOsmBuildingsShowcase();
    unmountLightingToggle();
    unmountBootstrapOperatorHud();
    bootstrapHandoverDecisionController.dispose();
    bootstrapPhysicalInputController.dispose();
    bootstrapCommunicationTimeController.dispose();
    bootstrapOperatorController.dispose();
    void satelliteOverlay.dispose();
    viewer.destroy();
  });
}
