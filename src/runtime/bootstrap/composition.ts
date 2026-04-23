import { createViewer } from "../../core/cesium/viewer-factory";
import { mountAppShell } from "../../features/app/app-shell";
import { refreshLightingForSceneMode } from "../../features/globe/lighting";
import { mountLightingToggle } from "../../features/globe/lighting-toggle";
import {
  mountOptionalOsmBuildingsShowcase,
  resolveBuildingShowcaseSelection
} from "../../features/globe/osm-buildings-showcase";
import {
  type FirstIntakePathProjectionSeed
} from "../../features/physical-input/path-projection-adapter";
import {
  resolveScenePresetKey,
  type ScenePresetKey
} from "../../features/globe/scene-preset";
import { mountBootstrapOperatorHud } from "../../features/operator/bootstrap-operator-hud";
import {
  createFirstIntakeRuntimeScenarioSurface,
  FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM,
  type ScenarioSession,
  type FirstIntakeRuntimeScenarioSurface,
  type FirstIntakeScenarioSeed
} from "../../features/scenario";
import type { HandoverDecisionState } from "../../features/handover-decision/handover-decision";
import type { PhysicalInputState } from "../../features/physical-input/physical-input";
import { syncDocumentTelemetry } from "../../features/telemetry/document-telemetry";
import { createCesiumReplayClock } from "../../features/time/cesium-replay-clock";
import type { ReplayClock } from "../../features/time";
import onewebIntelsatGeoAviationSeed from "../../../../itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json";
import { createBootstrapCommunicationTimeController } from "../bootstrap-communication-time-controller";
import { createBootstrapHandoverDecisionController } from "../bootstrap-handover-decision-controller";
import { createBootstrapOperatorController } from "../bootstrap-operator-controller";
import { createBootstrapPhysicalInputController } from "../bootstrap-physical-input-controller";
import { createBootstrapSceneStarterController } from "../bootstrap-scene-starter-controller";
import { createBootstrapValidationStateController } from "../bootstrap-validation-state-controller";
import { createFirstIntakeActiveScenarioSession } from "../first-intake-active-scenario-session";
import { createFirstIntakeHandoverDecisionController } from "../first-intake-handover-decision-controller";
import { createFirstIntakeActiveCaseNarrativeController } from "../first-intake-active-case-narrative-controller";
import { createFirstIntakeMobileEndpointTrajectoryConsumerController } from "../first-intake-mobile-endpoint-trajectory-consumer-controller";
import { createFirstIntakeMobileEndpointTrajectoryController } from "../first-intake-mobile-endpoint-trajectory-controller";
import {
  createFirstIntakeOperatorExplainerController,
  type FirstIntakeOperatorExplainerSeed
} from "../first-intake-operator-explainer-controller";
import { createFirstIntakeOverlayExpressionController } from "../first-intake-overlay-expression-controller";
import { createFirstIntakePhysicalInputController } from "../first-intake-physical-input-controller";
import { createBootstrapScenarioCatalog } from "../resolve-bootstrap-scenario";
import {
  createSatelliteOverlayController,
  type SatelliteOverlayController
} from "../satellite-overlay-controller";
import { createBootstrapScenarioSession } from "../scenario-bootstrap-session";

type ViewerInstance = ReturnType<typeof createViewer>;

interface ActivePhysicalInputController {
  getState(): PhysicalInputState;
  subscribe(listener: (state: PhysicalInputState) => void): () => void;
  dispose(): void;
}

interface ActiveHandoverDecisionController {
  getState(): HandoverDecisionState;
  subscribe(listener: (state: HandoverDecisionState) => void): () => void;
  dispose(): void;
}

export interface BootstrapCapture {
  viewer: ViewerInstance;
  replayClock: ReplayClock;
  satelliteOverlay: SatelliteOverlayController;
  scenarioSession: ScenarioSession;
  firstIntakeScenarioSurface: FirstIntakeRuntimeScenarioSurface;
  firstIntakeOverlayExpression?:
    ReturnType<typeof createFirstIntakeOverlayExpressionController>;
  firstIntakeOperatorExplainer?:
    ReturnType<typeof createFirstIntakeOperatorExplainerController>;
  firstIntakeActiveCaseNarrative?:
    ReturnType<typeof createFirstIntakeActiveCaseNarrativeController>;
  firstIntakeMobileEndpointTrajectory?:
    ReturnType<typeof createFirstIntakeMobileEndpointTrajectoryController>;
  firstIntakeMobileEndpointTrajectoryConsumer?:
    ReturnType<
      typeof createFirstIntakeMobileEndpointTrajectoryConsumerController
    >;
  firstIntakePhysicalInput:
    ReturnType<typeof createFirstIntakePhysicalInputController>;
  firstIntakeHandoverDecision:
    ReturnType<typeof createFirstIntakeHandoverDecisionController>;
  communicationTime: ReturnType<typeof createBootstrapCommunicationTimeController>;
  physicalInput: ActivePhysicalInputController;
  handoverDecision: ActiveHandoverDecisionController;
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

function resolveFirstIntakeRequestedScenarioId(): string | undefined {
  const request = new URLSearchParams(window.location.search).get(
    FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM
  );

  return request?.trim().length ? request : undefined;
}

function syncFirstIntakeRuntimeTelemetry(
  firstIntakeScenarioSurface: FirstIntakeRuntimeScenarioSurface
): void {
  const state = firstIntakeScenarioSurface.getState();
  const addressedEntry = firstIntakeScenarioSurface.getAddressedEntry();

  syncDocumentTelemetry({
    firstIntakeRuntimeState: state.runtimeState,
    firstIntakeScenarioId: addressedEntry.scenarioId,
    firstIntakeAddressParam: state.queryParam,
    firstIntakeAddressableEntry: addressedEntry.addressQuery,
    firstIntakeAddressResolution: state.addressResolution,
    firstIntakeAdoptionMode: state.adoptionMode,
    firstIntakeTruthBoundaryLabel:
      addressedEntry.resolvedInputs.context?.truthBoundaryLabel,
    firstIntakeSourceLineage: [
      state.sourceLineage.seedPath,
      state.sourceLineage.adapter,
      state.sourceLineage.resolver
    ].join(" -> ")
  });
}

function syncVisualBaselineState(viewer: ViewerInstance): void {
  syncDocumentTelemetry({
    sceneFogActive: viewer.scene.fog.enabled ? "true" : "false",
    sceneFogDensity: String(viewer.scene.fog.density),
    sceneFogVisualDensityScalar: String(viewer.scene.fog.visualDensityScalar),
    sceneFogHeightScalar: String(viewer.scene.fog.heightScalar),
    sceneFogHeightFalloff: String(viewer.scene.fog.heightFalloff),
    sceneFogMaxHeight: String(viewer.scene.fog.maxHeight),
    sceneFogMinimumBrightness: String(viewer.scene.fog.minimumBrightness),
    sceneBloomActive: viewer.scene.postProcessStages.bloom.enabled ? "true" : "false"
  });
}

function shouldAdoptFirstIntakeAsActiveOwner(
  firstIntakeScenarioSurface: FirstIntakeRuntimeScenarioSurface
): boolean {
  return firstIntakeScenarioSurface.getState().addressResolution === "matched";
}

function createActiveFirstIntakePhysicalInputController(
  controller: ReturnType<typeof createFirstIntakePhysicalInputController>
): ActivePhysicalInputController {
  return {
    getState(): PhysicalInputState {
      return controller.getState().physicalInput;
    },
    subscribe(listener: (state: PhysicalInputState) => void): () => void {
      return controller.subscribe((state) => {
        listener(state.physicalInput);
      });
    },
    dispose(): void {}
  };
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
  const firstIntakeSeed = onewebIntelsatGeoAviationSeed as
    FirstIntakeScenarioSeed &
    FirstIntakePathProjectionSeed &
    FirstIntakeOperatorExplainerSeed;
  const firstIntakeScenarioSurface = createFirstIntakeRuntimeScenarioSurface({
    seeds: [firstIntakeSeed],
    requestedScenarioId: resolveFirstIntakeRequestedScenarioId()
  });
  syncDocumentTelemetry({
    scenePreset
  });
  syncFirstIntakeRuntimeTelemetry(firstIntakeScenarioSurface);
  const buildingShowcase = resolveBuildingShowcaseSelection();
  const viewer = createViewer({
    container: viewerRoot,
    scenePresetKey: scenePreset,
    buildingShowcaseKey: buildingShowcase.key
  });
  const replayClock = createCesiumReplayClock(viewer);
  const firstIntakePhysicalInputController =
    createFirstIntakePhysicalInputController({
      replayClock,
      scenarioSurface: firstIntakeScenarioSurface,
      seeds: [firstIntakeSeed]
    });
  const firstIntakeScenarioSession = createFirstIntakeActiveScenarioSession(
    firstIntakeScenarioSurface
  );
  const firstIntakeHandoverDecisionController =
    createFirstIntakeHandoverDecisionController({
      replayClock,
      scenarioSurface: firstIntakeScenarioSurface
    });
  const controllerGraph = createBootstrapControllerGraph({
    viewer,
    replayClock,
    scenePreset,
    buildingShowcaseKey: buildingShowcase.key,
    hudFrame,
    statusPanel
  });
  const adoptFirstIntakeAsActiveOwner =
    shouldAdoptFirstIntakeAsActiveOwner(firstIntakeScenarioSurface);
  const activeScenarioSession = adoptFirstIntakeAsActiveOwner
    ? firstIntakeScenarioSession
    : controllerGraph.scenarioSession;
  const activePhysicalInputController = adoptFirstIntakeAsActiveOwner
    ? createActiveFirstIntakePhysicalInputController(
        firstIntakePhysicalInputController
      )
    : controllerGraph.physicalInputController;
  const activeHandoverDecisionController = adoptFirstIntakeAsActiveOwner
    ? firstIntakeHandoverDecisionController
    : controllerGraph.handoverDecisionController;
  const firstIntakeMobileEndpointTrajectory = adoptFirstIntakeAsActiveOwner
    ? createFirstIntakeMobileEndpointTrajectoryController({
        scenarioSurface: firstIntakeScenarioSurface
      })
    : undefined;
  const firstIntakeMobileEndpointTrajectoryConsumer =
    adoptFirstIntakeAsActiveOwner && firstIntakeMobileEndpointTrajectory
      ? createFirstIntakeMobileEndpointTrajectoryConsumerController({
          hudFrame,
          scenarioSession: firstIntakeScenarioSession,
          scenarioSurface: firstIntakeScenarioSurface,
          trajectoryController: firstIntakeMobileEndpointTrajectory,
          // M7 slice B keeps the older M6 seam capture-owned while the
          // integrated narrative owns the viewer-facing first-case panel.
          mountPanel: false
        })
      : undefined;
  const firstIntakeOverlayExpression = adoptFirstIntakeAsActiveOwner
    ? createFirstIntakeOverlayExpressionController({
        viewer,
        hudFrame,
        scenarioSurface: firstIntakeScenarioSurface
      })
    : undefined;
  const firstIntakeOperatorExplainer = adoptFirstIntakeAsActiveOwner
    ? createFirstIntakeOperatorExplainerController({
        hudFrame,
        scenarioSession: firstIntakeScenarioSession,
        scenarioSurface: firstIntakeScenarioSurface,
        physicalInputController: firstIntakePhysicalInputController,
        handoverDecisionController: firstIntakeHandoverDecisionController,
        seed: firstIntakeSeed,
        // M7 slice B keeps the older M5 seam capture-owned while the
        // integrated narrative owns the viewer-facing first-case panel.
        mountPanel: false
      })
    : undefined;
  const firstIntakeActiveCaseNarrative =
    adoptFirstIntakeAsActiveOwner &&
    firstIntakeOverlayExpression &&
    firstIntakeMobileEndpointTrajectory &&
    firstIntakeMobileEndpointTrajectoryConsumer
      ? createFirstIntakeActiveCaseNarrativeController({
          hudFrame,
          scenarioSession: firstIntakeScenarioSession,
          scenarioSurface: firstIntakeScenarioSurface,
          physicalInputController: firstIntakePhysicalInputController,
          handoverDecisionController: firstIntakeHandoverDecisionController,
          overlayExpressionController: firstIntakeOverlayExpression,
          trajectoryController: firstIntakeMobileEndpointTrajectory,
          trajectoryConsumerController:
            firstIntakeMobileEndpointTrajectoryConsumer
        })
      : undefined;
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
    scenarioSession: activeScenarioSession,
    firstIntakeScenarioSurface,
    ...(firstIntakeOverlayExpression
      ? { firstIntakeOverlayExpression }
      : {}),
    ...(firstIntakeOperatorExplainer
      ? { firstIntakeOperatorExplainer }
      : {}),
    ...(firstIntakeActiveCaseNarrative
      ? { firstIntakeActiveCaseNarrative }
      : {}),
    ...(firstIntakeMobileEndpointTrajectory
      ? { firstIntakeMobileEndpointTrajectory }
      : {}),
    ...(firstIntakeMobileEndpointTrajectoryConsumer
      ? { firstIntakeMobileEndpointTrajectoryConsumer }
      : {}),
    firstIntakePhysicalInput: firstIntakePhysicalInputController,
    firstIntakeHandoverDecision: firstIntakeHandoverDecisionController,
    communicationTime: controllerGraph.communicationTimeController,
    physicalInput: activePhysicalInputController,
    handoverDecision: activeHandoverDecisionController,
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
      firstIntakeActiveCaseNarrative?.dispose();
      firstIntakeOperatorExplainer?.dispose();
      firstIntakeOverlayExpression?.dispose();
      firstIntakeMobileEndpointTrajectoryConsumer?.dispose();
      firstIntakeMobileEndpointTrajectory?.dispose();
      firstIntakeHandoverDecisionController.dispose();
      firstIntakePhysicalInputController.dispose();
      controllerGraph.dispose();
      void satelliteOverlay.dispose();
      viewer.destroy();
    }
  };
}
