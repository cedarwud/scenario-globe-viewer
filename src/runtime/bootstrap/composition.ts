import { createViewer } from "../../core/cesium/viewer-factory";
import { mountAppShell } from "../../features/app/app-shell";
import { refreshLightingForSceneMode } from "../../features/globe/lighting";
import { mountLightingToggle } from "../../features/globe/lighting-toggle";
import {
  mountOptionalOsmBuildingsShowcase,
  resolveBuildingShowcaseSelection
} from "../../features/globe/osm-buildings-showcase";
import {
  resolveScenePresetKey,
  type ScenePresetKey
} from "../../features/globe/scene-preset";
import { mountBootstrapOperatorHud } from "../../features/operator/bootstrap-operator-hud";
import { createCesiumReplayClock } from "../../features/time/cesium-replay-clock";
import type { ReplayClock } from "../../features/time";
import { createBootstrapCommunicationTimeController } from "../bootstrap-communication-time-controller";
import { createBootstrapHandoverDecisionController } from "../bootstrap-handover-decision-controller";
import { createBootstrapOperatorController } from "../bootstrap-operator-controller";
import { createBootstrapPhysicalInputController } from "../bootstrap-physical-input-controller";
import { createBootstrapSceneStarterController } from "../bootstrap-scene-starter-controller";
import { createBootstrapValidationStateController } from "../bootstrap-validation-state-controller";
import { createBootstrapScenarioCatalog } from "../resolve-bootstrap-scenario";
import {
  createSatelliteOverlayController,
  type SatelliteOverlayController
} from "../satellite-overlay-controller";
import { createBootstrapScenarioSession } from "../scenario-bootstrap-session";

type ViewerInstance = ReturnType<typeof createViewer>;

export interface BootstrapCapture {
  viewer: ViewerInstance;
  replayClock: ReplayClock;
  satelliteOverlay: SatelliteOverlayController;
  scenarioSession: ReturnType<typeof createBootstrapScenarioSession>;
  communicationTime: ReturnType<typeof createBootstrapCommunicationTimeController>;
  physicalInput: ReturnType<typeof createBootstrapPhysicalInputController>;
  handoverDecision: ReturnType<typeof createBootstrapHandoverDecisionController>;
  sceneStarter: ReturnType<typeof createBootstrapSceneStarterController>;
  validationState: ReturnType<typeof createBootstrapValidationStateController>;
}

export interface BootstrapComposition {
  dispose(): void;
}

declare global {
  interface Window {
    __SCENARIO_GLOBE_VIEWER_CAPTURE__?: BootstrapCapture;
  }
}

interface BootstrapControllerGraph {
  scenarioSession: ReturnType<typeof createBootstrapScenarioSession>;
  communicationTimeController: ReturnType<typeof createBootstrapCommunicationTimeController>;
  physicalInputController: ReturnType<typeof createBootstrapPhysicalInputController>;
  handoverDecisionController: ReturnType<typeof createBootstrapHandoverDecisionController>;
  sceneStarterController: ReturnType<typeof createBootstrapSceneStarterController>;
  validationStateController: ReturnType<typeof createBootstrapValidationStateController>;
  dispose(): void;
}

function resolveBootstrapScenePreset(): ScenePresetKey {
  const request = new URLSearchParams(window.location.search).get("scenePreset");
  return resolveScenePresetKey(request);
}

function syncVisualBaselineState(viewer: ViewerInstance): void {
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

function createValidationServingContext(
  handoverDecisionController: ReturnType<typeof createBootstrapHandoverDecisionController>
) {
  return {
    getState() {
      const state = handoverDecisionController.getState();
      return {
        scenarioId: state.snapshot.scenarioId,
        servingCandidateId: state.result.servingCandidateId
      };
    },
    subscribe(
      listener: (state: {
        scenarioId: string;
        servingCandidateId?: string;
      }) => void
    ) {
      return handoverDecisionController.subscribe((state) => {
        listener({
          scenarioId: state.snapshot.scenarioId,
          servingCandidateId: state.result.servingCandidateId
        });
      });
    }
  };
}

function createBootstrapControllerGraph({
  viewer,
  replayClock,
  scenePreset,
  buildingShowcaseKey,
  hudFrame,
  statusPanel
}: {
  viewer: ViewerInstance;
  replayClock: ReplayClock;
  scenePreset: ScenePresetKey;
  buildingShowcaseKey: ReturnType<typeof resolveBuildingShowcaseSelection>["key"];
  hudFrame: ReturnType<typeof mountAppShell>["hudFrame"];
  statusPanel: ReturnType<typeof mountAppShell>["statusPanel"];
}): BootstrapControllerGraph {
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
      buildingShowcaseKey
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
  const bootstrapSceneStarterController = createBootstrapSceneStarterController({
    operatorState: bootstrapOperatorController
  });
  const bootstrapValidationStateController = createBootstrapValidationStateController({
    operatorState: bootstrapOperatorController,
    servingContext: createValidationServingContext(bootstrapHandoverDecisionController),
    scenarioCatalog: bootstrapScenarioCatalog
  });
  const unmountBootstrapOperatorHud = mountBootstrapOperatorHud({
    hudFrame,
    statusPanel,
    controller: bootstrapOperatorController,
    communicationTimeController: bootstrapCommunicationTimeController,
    physicalInputController: bootstrapPhysicalInputController,
    handoverDecisionController: bootstrapHandoverDecisionController,
    sceneStarterController: bootstrapSceneStarterController,
    validationStateController: bootstrapValidationStateController
  });

  return {
    scenarioSession,
    communicationTimeController: bootstrapCommunicationTimeController,
    physicalInputController: bootstrapPhysicalInputController,
    handoverDecisionController: bootstrapHandoverDecisionController,
    sceneStarterController: bootstrapSceneStarterController,
    validationStateController: bootstrapValidationStateController,
    dispose() {
      unmountBootstrapOperatorHud();
      bootstrapValidationStateController.dispose();
      bootstrapSceneStarterController.dispose();
      bootstrapHandoverDecisionController.dispose();
      bootstrapPhysicalInputController.dispose();
      bootstrapCommunicationTimeController.dispose();
      bootstrapOperatorController.dispose();
    }
  };
}

function bindLightingRefresh(viewer: ViewerInstance): () => void {
  const removeMorphCompleteListener = viewer.scene.morphComplete.addEventListener(() => {
    refreshLightingForSceneMode(viewer);
  });
  const removeImageryLayerAddedListener = viewer.imageryLayers.layerAdded.addEventListener(() => {
    refreshLightingForSceneMode(viewer);
  });
  const removeImageryLayerRemovedListener = viewer.imageryLayers.layerRemoved.addEventListener(() => {
    refreshLightingForSceneMode(viewer);
  });

  return () => {
    removeImageryLayerRemovedListener();
    removeImageryLayerAddedListener();
    removeMorphCompleteListener();
  };
}

export function startBootstrapComposition(app: HTMLDivElement): BootstrapComposition {
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
  const controllerGraph = createBootstrapControllerGraph({
    viewer,
    replayClock,
    scenePreset,
    buildingShowcaseKey: buildingShowcase.key,
    hudFrame,
    statusPanel
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
    scenarioSession: controllerGraph.scenarioSession,
    communicationTime: controllerGraph.communicationTimeController,
    physicalInput: controllerGraph.physicalInputController,
    handoverDecision: controllerGraph.handoverDecisionController,
    sceneStarter: controllerGraph.sceneStarterController,
    validationState: controllerGraph.validationStateController
  };
  syncVisualBaselineState(viewer);
  const unmountLightingToggle = mountLightingToggle(viewer);
  const unmountOsmBuildingsShowcase = mountOptionalOsmBuildingsShowcase(
    viewer,
    buildingShowcase
  );
  const disposeLightingRefresh = bindLightingRefresh(viewer);

  return {
    dispose() {
      delete window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      disposeLightingRefresh();
      unmountOsmBuildingsShowcase();
      unmountLightingToggle();
      controllerGraph.dispose();
      void satelliteOverlay.dispose();
      viewer.destroy();
    }
  };
}
