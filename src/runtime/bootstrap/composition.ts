import { createViewer } from "../../core/cesium/viewer-factory";
import { mountAppShell } from "../../features/app/app-shell";
import { mountHomepageEntryCta } from "../../features/app/homepage-entry-cta";
import { refreshLightingForSceneMode } from "../../features/globe/lighting";
import { mountLightingToggle } from "../../features/globe/lighting-toggle";
import { mountHomeButtonRouteOverride } from "../../features/globe/camera-language";
import { mountGroundStationMarkers } from "../../features/multi-station-selector/station-markers";
import { mountGroundStationInfoCard } from "../../features/multi-station-selector/station-info-card";
import { createSelectionStore } from "../../features/multi-station-selector/selection-store";
import { mountSelectionChips } from "../../features/multi-station-selector/selection-chips";
import { mountStationListPicker } from "../../features/multi-station-selector/station-list-picker";
import { mountMarkerHoverTooltip } from "../../features/multi-station-selector/marker-hover-tooltip";
import { mountMarkerFilterPanel } from "../../features/multi-station-selector/marker-filter-panel";
import {
  mountV4ProjectionSidePanel,
  type V4ProjectionSidePanelHandle
} from "../../features/multi-station-selector/v4-projection-side-panel";
import {
  mountReplayEventPill,
  type ReplayEventPillHandle
} from "../../features/multi-station-selector/replay-event-pill";
import {
  resolveV4RouteSelection,
  type V4RouteSelection
} from "../../features/multi-station-selector/v4-route-selection";
import { PUBLIC_REGISTRY_BY_ID } from "../../features/multi-station-selector/tier-inference";
import {
  subscribeDisplayState,
  type DisplayState
} from "../../features/multi-station-selector/display-state";
import { mountSelectorChromeTelemetry } from "../../features/multi-station-selector/chrome-telemetry";
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
import { createBootstrapCommunicationTimeController } from "../bootstrap-communication-time-controller";
import { createBootstrapHandoverDecisionController } from "../bootstrap-handover-decision-controller";
import { createBootstrapOperatorController } from "../bootstrap-operator-controller";
import { createBootstrapPhysicalInputController } from "../bootstrap-physical-input-controller";
import { createBootstrapSceneStarterController } from "../bootstrap-scene-starter-controller";
import { createBootstrapValidationStateController } from "../bootstrap-validation-state-controller";
import { createFirstIntakeActiveScenarioSession } from "../first-intake-active-scenario-session";
import { createFirstIntakeHandoverDecisionController } from "../first-intake-handover-decision-controller";
import { createFirstIntakeActiveCaseNarrativeController } from "../first-intake-active-case-narrative-controller";
import { createFirstIntakeNearbySecondEndpointController } from "../first-intake-nearby-second-endpoint-controller";
import { createFirstIntakeNearbySecondEndpointExpressionController } from "../first-intake-nearby-second-endpoint-expression-controller";
import { createFirstIntakeNearbySecondEndpointInfoController } from "../first-intake-nearby-second-endpoint-info-controller";
import { createFirstIntakeCinematicCameraPresetController } from "../first-intake-cinematic-camera-preset-controller";
import { createFirstIntakeMobileEndpointTrajectoryConsumerController } from "../first-intake-mobile-endpoint-trajectory-consumer-controller";
import { createFirstIntakeMobileEndpointTrajectoryController } from "../first-intake-mobile-endpoint-trajectory-controller";
import { createFirstIntakeOrbitContextActorController } from "../first-intake-orbit-context-actor-controller";
import { createFirstIntakeSatcomContextOverlayController } from "../first-intake-satcom-context-overlay-controller";
import {
  createFirstIntakeOperatorExplainerController,
  type FirstIntakeOperatorExplainerSeed
} from "../first-intake-operator-explainer-controller";
import { createFirstIntakeOverlayExpressionController } from "../first-intake-overlay-expression-controller";
import { createFirstIntakePhysicalInputController } from "../first-intake-physical-input-controller";
import { createFirstIntakeReplayTimeAuthorityController } from "../first-intake-replay-time-authority-controller";
import { createBootstrapScenarioCatalog } from "../resolve-bootstrap-scenario";
import {
  createSatelliteOverlayController,
  type SatelliteOverlayController
} from "../satellite-overlay-controller";
import { createBootstrapScenarioSession } from "../scenario-bootstrap-session";
import onewebIntelsatGeoAviationSeed from "../first-intake-oneweb-intelsat-geo-aviation-seed";
import {
  createM8aV4GroundStationSceneController,
  isM8aV4GroundStationRuntimeRequested
} from "../m8a-v4-ground-station-handover-scene-controller";
import {
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE
} from "../m8a-v4-ground-station-projection";

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
  firstIntakeNearbySecondEndpoint?:
    ReturnType<typeof createFirstIntakeNearbySecondEndpointController>;
  firstIntakeNearbySecondEndpointExpression?:
    ReturnType<typeof createFirstIntakeNearbySecondEndpointExpressionController>;
  firstIntakeNearbySecondEndpointInfo?:
    ReturnType<typeof createFirstIntakeNearbySecondEndpointInfoController>;
  firstIntakeCinematicCameraPreset?:
    ReturnType<typeof createFirstIntakeCinematicCameraPresetController>;
  firstIntakeSatcomContextOverlay?:
    ReturnType<typeof createFirstIntakeSatcomContextOverlayController>;
  firstIntakeOrbitContextActors?:
    ReturnType<typeof createFirstIntakeOrbitContextActorController>;
  m8aV4GroundStationScene?:
    ReturnType<typeof createM8aV4GroundStationSceneController>;
  firstIntakeMobileEndpointTrajectory?:
    ReturnType<typeof createFirstIntakeMobileEndpointTrajectoryController>;
  firstIntakeMobileEndpointTrajectoryConsumer?:
    ReturnType<
      typeof createFirstIntakeMobileEndpointTrajectoryConsumerController
    >;
  firstIntakeReplayTimeAuthority?:
    ReturnType<typeof createFirstIntakeReplayTimeAuthorityController>;
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

const R1V_VISUAL_ACCEPTANCE_HUD_CLEANUP_REASON =
  "r1v-visual-acceptance-addressed-route-scene-clearance";
// M8A-V3.1 first-case anchor; CTA navigates here. ADR 0010 removed the silent
// bare-`/` mapping that previously routed to the same id.
const M8A_V3_1_FIRST_CASE_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const M8A_V3_1_AUTOPLAY_QUERY_PARAM = "firstIntakeAutoplay";
const M8A_V3_1_CTA_SCENE_PRESET = "global";
const M8A_V4_GROUND_STATION_CTA_SCENE_PRESET = "regional";

function resolveBootstrapScenePreset(
  search: URLSearchParams,
  v4RouteSelection: V4RouteSelection
): ScenePresetKey {
  const request = search.get("scenePreset");
  if (request !== null) {
    return resolveScenePresetKey(request);
  }
  // Implicit V4 activation: when a short demo link resolves to a valid station
  // pair, default the scene preset to the V4 ground-station CTA preset so the
  // regional scene loads automatically.
  if (v4RouteSelection.resolvedPair) {
    return resolveScenePresetKey(M8A_V4_GROUND_STATION_CTA_SCENE_PRESET);
  }
  return resolveScenePresetKey(null);
}

function resolveFirstIntakeRequestedScenarioId(): string | undefined {
  const search = new URLSearchParams(window.location.search);
  const request = search.get(
    FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM
  );

  if (request?.trim().length) {
    return request;
  }

  return undefined;
}

function resolveFirstIntakeAutoplayRequest(): boolean {
  const search = new URLSearchParams(window.location.search);
  return search.get(M8A_V3_1_AUTOPLAY_QUERY_PARAM) === "1";
}

function buildM8aV31AddressedHref(): string {
  const params = new URLSearchParams();
  params.set(FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM, M8A_V3_1_FIRST_CASE_SCENARIO_ID);
  params.set(M8A_V3_1_AUTOPLAY_QUERY_PARAM, "1");
  params.set("scenePreset", M8A_V3_1_CTA_SCENE_PRESET);
  return `/?${params.toString()}`;
}

function buildM8aV4GroundStationAddressedHref(): string {
  const params = new URLSearchParams();
  params.set("scenePreset", M8A_V4_GROUND_STATION_CTA_SCENE_PRESET);
  params.set(
    M8A_V4_GROUND_STATION_QUERY_PARAM,
    M8A_V4_GROUND_STATION_QUERY_VALUE
  );
  return `/?${params.toString()}`;
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

function markR1vVisualAcceptanceHudSurface(
  element: HTMLElement,
  surface: string
): void {
  element.hidden = true;
  element.setAttribute("aria-hidden", "true");
  element.dataset.r1vVisualAcceptanceSurface = surface;
  element.dataset.r1vVisualAcceptancePresentation = "collapsed";
  element.dataset.r1vVisualAcceptanceReason =
    R1V_VISUAL_ACCEPTANCE_HUD_CLEANUP_REASON;
}

function applyR1vVisualAcceptanceHudCleanup({
  hudFrame,
  statusPanel
}: {
  hudFrame: HTMLElement;
  statusPanel: HTMLElement;
}): () => void {
  const surfaces = [
    {
      surface: "hud-panel--status",
      element: statusPanel
    },
    {
      surface: "timeline-hud-placeholder",
      element: statusPanel.querySelector<HTMLElement>(".timeline-hud-placeholder")
    },
    {
      surface: "communication-time-panel",
      element: statusPanel.querySelector<HTMLElement>(".communication-time-panel")
    },
    {
      surface: "physical-input-panel",
      element: statusPanel.querySelector<HTMLElement>(".physical-input-panel")
    }
  ];

  hudFrame.dataset.r1vVisualAcceptanceHudCleanup = "addressed-route";
  hudFrame.dataset.r1vVisualAcceptanceReason =
    R1V_VISUAL_ACCEPTANCE_HUD_CLEANUP_REASON;

  for (const { element, surface } of surfaces) {
    if (element) {
      markR1vVisualAcceptanceHudSurface(element, surface);
    }
  }

  return () => {
    delete hudFrame.dataset.r1vVisualAcceptanceHudCleanup;
    delete hudFrame.dataset.r1vVisualAcceptanceReason;

    for (const { element } of surfaces) {
      if (!element) {
        continue;
      }

      element.hidden = false;
      element.removeAttribute("aria-hidden");
      delete element.dataset.r1vVisualAcceptanceSurface;
      delete element.dataset.r1vVisualAcceptancePresentation;
      delete element.dataset.r1vVisualAcceptanceReason;
    }
  };
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
  statusPanel,
  mountHud
}: {
  viewer: ViewerInstance;
  replayClock: ReplayClock;
  scenePreset: ScenePresetKey;
  buildingShowcaseKey: ReturnType<typeof resolveBuildingShowcaseSelection>["key"];
  hudFrame: ReturnType<typeof mountAppShell>["hudFrame"];
  statusPanel: ReturnType<typeof mountAppShell>["statusPanel"];
  mountHud: boolean;
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
  const unmountBootstrapOperatorHud = mountHud
    ? mountBootstrapOperatorHud({
        hudFrame,
        statusPanel,
        controller: bootstrapOperatorController,
        communicationTimeController: bootstrapCommunicationTimeController,
        physicalInputController: bootstrapPhysicalInputController,
        handoverDecisionController: bootstrapHandoverDecisionController,
        sceneStarterController: bootstrapSceneStarterController,
        validationStateController: bootstrapValidationStateController
      })
    : () => {};

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
  const { viewerShell, viewerRoot, hudFrame, statusPanel } = mountAppShell(app);
  const searchParams = new URLSearchParams(window.location.search);
  const v4RouteSelection = resolveV4RouteSelection(searchParams);
  const scenePreset = resolveBootstrapScenePreset(searchParams, v4RouteSelection);
  const isM8aV4RuntimeRequest =
    isM8aV4GroundStationRuntimeRequested(searchParams);
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
  const unmountHomeButtonRouteOverride = isM8aV4RuntimeRequest
    ? mountHomeButtonRouteOverride(viewer, "/")
    : () => {};
  const replayClock = createCesiumReplayClock(viewer);
  const firstIntakeScenarioSession = createFirstIntakeActiveScenarioSession(
    firstIntakeScenarioSurface
  );
  const adoptFirstIntakeAsActiveOwner =
    shouldAdoptFirstIntakeAsActiveOwner(firstIntakeScenarioSurface);
  const mountBootstrapOperatorStatusHud = !isM8aV4RuntimeRequest;
  syncDocumentTelemetry({
    viewerMode:
      !isM8aV4RuntimeRequest && !adoptFirstIntakeAsActiveOwner
        ? "clean-home"
        : undefined
  });
  const firstIntakeMobileEndpointTrajectory = adoptFirstIntakeAsActiveOwner
    ? createFirstIntakeMobileEndpointTrajectoryController({
        scenarioSurface: firstIntakeScenarioSurface
      })
    : undefined;
  const firstIntakeReplayTimeAuthority =
    adoptFirstIntakeAsActiveOwner && firstIntakeMobileEndpointTrajectory
      ? createFirstIntakeReplayTimeAuthorityController({
          viewer,
          replayClock,
          scenarioSurface: firstIntakeScenarioSurface,
          trajectoryController: firstIntakeMobileEndpointTrajectory
        })
      : undefined;
  const firstIntakeReplayClock =
    firstIntakeReplayTimeAuthority?.replayClock ?? replayClock;
  const firstIntakePhysicalInputController =
    createFirstIntakePhysicalInputController({
      replayClock: firstIntakeReplayClock,
      scenarioSurface: firstIntakeScenarioSurface,
      seeds: [firstIntakeSeed]
    });
  const firstIntakeHandoverDecisionController =
    createFirstIntakeHandoverDecisionController({
      replayClock: firstIntakeReplayClock,
      scenarioSurface: firstIntakeScenarioSurface
    });
  const controllerGraph = createBootstrapControllerGraph({
    viewer,
    replayClock,
    scenePreset,
    buildingShowcaseKey: buildingShowcase.key,
    hudFrame,
    statusPanel,
    mountHud: mountBootstrapOperatorStatusHud
  });
  const restoreR1vVisualAcceptanceHudCleanup = adoptFirstIntakeAsActiveOwner
    ? applyR1vVisualAcceptanceHudCleanup({
        hudFrame,
        statusPanel
      })
    : () => {};
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
  const firstIntakeNearbySecondEndpoint = adoptFirstIntakeAsActiveOwner
    ? createFirstIntakeNearbySecondEndpointController({
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
  const firstIntakeNearbySecondEndpointExpression =
    adoptFirstIntakeAsActiveOwner &&
    firstIntakeNearbySecondEndpoint &&
    firstIntakeMobileEndpointTrajectory &&
    firstIntakeOverlayExpression
      ? createFirstIntakeNearbySecondEndpointExpressionController({
          viewer,
          replayClock: firstIntakeReplayClock,
          scenarioSurface: firstIntakeScenarioSurface,
          nearbySecondEndpointController: firstIntakeNearbySecondEndpoint,
          trajectoryController: firstIntakeMobileEndpointTrajectory,
          overlayExpressionController: firstIntakeOverlayExpression
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
  const firstIntakeNearbySecondEndpointInfo =
    adoptFirstIntakeAsActiveOwner &&
    firstIntakeNearbySecondEndpoint &&
    firstIntakeActiveCaseNarrative
      ? createFirstIntakeNearbySecondEndpointInfoController({
          hudFrame,
          scenarioSurface: firstIntakeScenarioSurface,
          nearbySecondEndpointController: firstIntakeNearbySecondEndpoint,
          activeCaseNarrativeController: firstIntakeActiveCaseNarrative
        })
      : undefined;
  const firstIntakeCinematicCameraPreset =
    adoptFirstIntakeAsActiveOwner &&
    firstIntakeMobileEndpointTrajectory &&
    firstIntakeNearbySecondEndpoint &&
    firstIntakeNearbySecondEndpointExpression
      ? createFirstIntakeCinematicCameraPresetController({
          viewer,
          scenarioSurface: firstIntakeScenarioSurface,
          trajectoryController: firstIntakeMobileEndpointTrajectory,
          nearbySecondEndpointController: firstIntakeNearbySecondEndpoint,
          expressionController: firstIntakeNearbySecondEndpointExpression
        })
      : undefined;
  const firstIntakeSatcomContextOverlay =
    adoptFirstIntakeAsActiveOwner &&
    firstIntakeNearbySecondEndpointInfo &&
    firstIntakeNearbySecondEndpointExpression &&
    firstIntakeReplayTimeAuthority
      ? createFirstIntakeSatcomContextOverlayController({
          hudFrame,
          scenarioSurface: firstIntakeScenarioSurface,
          nearbySecondEndpointInfoController:
            firstIntakeNearbySecondEndpointInfo,
          nearbySecondEndpointExpressionController:
            firstIntakeNearbySecondEndpointExpression,
          replayTimeAuthorityController: firstIntakeReplayTimeAuthority
        })
      : undefined;
  const firstIntakeOrbitContextActors =
    adoptFirstIntakeAsActiveOwner && firstIntakeReplayTimeAuthority
      ? createFirstIntakeOrbitContextActorController({
          viewer,
          hudFrame,
          scenarioSurface: firstIntakeScenarioSurface,
          replayClock: firstIntakeReplayTimeAuthority.replayClock,
          physicalInputController: firstIntakePhysicalInputController
        })
      : undefined;
  // wave 2: extend the V4 ground-station controller mount to subscribe
  // to the selection-store so endpoint markers + camera framing
  // re-anchor on a reselection without a full page reload. Wave 1
  // leaves this controller's startup-only behaviour intact; only the
  // V4 projection side panel below is wired into the display-state
  // subscription this round.
  let m8aV4GroundStationScene = isM8aV4RuntimeRequest
    ? createM8aV4GroundStationSceneController({
        viewer,
        hudFrame,
        replayClock: firstIntakeReplayClock
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
    replayClock: firstIntakeReplayClock,
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
    ...(firstIntakeNearbySecondEndpoint
      ? { firstIntakeNearbySecondEndpoint }
      : {}),
    ...(firstIntakeNearbySecondEndpointExpression
      ? { firstIntakeNearbySecondEndpointExpression }
      : {}),
    ...(firstIntakeNearbySecondEndpointInfo
      ? { firstIntakeNearbySecondEndpointInfo }
      : {}),
    ...(firstIntakeCinematicCameraPreset
      ? { firstIntakeCinematicCameraPreset }
      : {}),
    ...(firstIntakeSatcomContextOverlay
      ? { firstIntakeSatcomContextOverlay }
      : {}),
    ...(firstIntakeOrbitContextActors
      ? { firstIntakeOrbitContextActors }
      : {}),
    ...(m8aV4GroundStationScene ? { m8aV4GroundStationScene } : {}),
    ...(firstIntakeMobileEndpointTrajectory
      ? { firstIntakeMobileEndpointTrajectory }
      : {}),
    ...(firstIntakeMobileEndpointTrajectoryConsumer
      ? { firstIntakeMobileEndpointTrajectoryConsumer }
      : {}),
    ...(firstIntakeReplayTimeAuthority
      ? { firstIntakeReplayTimeAuthority }
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

  function ensureM8aV4GroundStationScene(): NonNullable<
    typeof m8aV4GroundStationScene
  > {
    if (!m8aV4GroundStationScene) {
      m8aV4GroundStationScene = createM8aV4GroundStationSceneController({
        viewer,
        hudFrame,
        replayClock: firstIntakeReplayClock
      });
      if (window.__SCENARIO_GLOBE_VIEWER_CAPTURE__) {
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene =
          m8aV4GroundStationScene;
      }
    }
    return m8aV4GroundStationScene;
  }

  const unmountLightingToggle = mountLightingToggle(viewer);
  const unmountOsmBuildingsShowcase = mountOptionalOsmBuildingsShowcase(
    viewer,
    buildingShowcase
  );
  const disposeLightingRefresh = bindLightingRefresh(viewer);

  // Mount unification per IA §2 + §4.1 + runtime-data-contract §A.1:
  // the marker layer, filter panel, selection chips, station list
  // picker, info card, and hover tooltip mount whenever the first-intake
  // surface is not the active owner — independent of whether the URL
  // carries stationA/stationB. The V4 projection side panel mounts on
  // top of that base only when display state enters projecting/replaying
  // (see subscribeDisplayState below).
  const mountSelectorSurfaces = !adoptFirstIntakeAsActiveOwner;
  const groundStationMarkers = mountSelectorSurfaces
    ? mountGroundStationMarkers(viewer, { initiallyVisible: true })
    : null;
  const groundStationSelectionStore = groundStationMarkers
    ? createSelectionStore()
    : null;
  const groundStationMarkerFilterPanel = groundStationMarkers
    ? mountMarkerFilterPanel(viewer.container as HTMLElement, groundStationMarkers)
    : null;
  const groundStationSelectionChips =
    groundStationMarkers && groundStationSelectionStore
      ? mountSelectionChips(viewer.container as HTMLElement, groundStationSelectionStore)
      : null;
  const groundStationListPicker =
    groundStationMarkers && groundStationSelectionStore
      ? mountStationListPicker(
          viewer.container as HTMLElement,
          groundStationSelectionStore,
          groundStationMarkers
        )
      : null;
  const groundStationInfoCard =
    groundStationMarkers && groundStationSelectionStore
      ? mountGroundStationInfoCard(viewer, groundStationMarkers, {
          selectionStore: groundStationSelectionStore
        })
      : null;
  const groundStationMarkerHoverTooltip = groundStationMarkers
    ? mountMarkerHoverTooltip(viewer, groundStationMarkers)
    : null;
  const selectorChromeTelemetry = mountSelectorSurfaces
    ? mountSelectorChromeTelemetry({
        viewerContainer: viewer.container as HTMLElement,
        viewerRoot
      })
    : null;

  // Replay event pill — IA §4.3.1. Mounts once when selector surfaces
  // mount and remains hidden until the display state enters `replaying`
  // and the V4 panel publishes a runtime projection. The display-state
  // subscription below pipes state transitions into the pill; the
  // V4 panel mount/dispose pipes the runtime-result subscription so
  // the pill always sees the latest handover-events array.
  const replayEventPill: ReplayEventPillHandle | null = mountSelectorSurfaces
    ? mountReplayEventPill(viewer.container as HTMLElement, firstIntakeReplayClock)
    : null;

  // V4 projection side panel — mounted/disposed by the display-state
  // subscription so the panel is only present in projecting/replaying.
  // The subscription also writes body[data-display-state] so CSS can
  // branch on the surface state without per-tick JS (IA §3).
  let v4ProjectionSidePanel: V4ProjectionSidePanelHandle | null = null;
  // Track the mounted pair so a reselection during an existing session
  // (state stays projecting/replaying but slot ids change) disposes the
  // stale panel and remounts with the fresh pair. Wave 2 §A.6 extension.
  let v4ProjectionSidePanelMountedPairKey: string | null = null;
  let v4ProjectionSidePanelRuntimeResultUnsubscribe: (() => void) | null = null;
  let unsubscribeDisplayState: (() => void) | null = null;
  if (groundStationSelectionStore && groundStationInfoCard) {
    const registryResolves = (id: string): boolean =>
      PUBLIC_REGISTRY_BY_ID.has(id);
    unsubscribeDisplayState = subscribeDisplayState(
      groundStationSelectionStore,
      firstIntakeReplayClock,
      groundStationInfoCard.openSignal,
      registryResolves,
      (state: DisplayState, resolvedPair) => {
        document.body.dataset.displayState = state;
        const isPanelState = state === "projecting" || state === "replaying";
        const pairKey = resolvedPair
          ? `${resolvedPair.stationA.id} ${resolvedPair.stationB.id}`
          : null;
        if (isPanelState && resolvedPair) {
          if (
            v4ProjectionSidePanel &&
            v4ProjectionSidePanelMountedPairKey !== pairKey
          ) {
            // Pair changed mid-session — dispose stale panel so it
            // remounts with the fresh pair header / window / stats.
            v4ProjectionSidePanelRuntimeResultUnsubscribe?.();
            v4ProjectionSidePanelRuntimeResultUnsubscribe = null;
            v4ProjectionSidePanel.dispose();
            v4ProjectionSidePanel = null;
            v4ProjectionSidePanelMountedPairKey = null;
            // Clear the pill's runtime result so it does not pick stale
            // events from the previous pair's projection.
            replayEventPill?.setRuntimeResult(null);
          }
          if (!v4ProjectionSidePanel) {
            v4ProjectionSidePanel = mountV4ProjectionSidePanel(
              viewer.container as HTMLElement,
              { resolvedPair }
            );
            v4ProjectionSidePanelMountedPairKey = pairKey;
            // Wire the pill to the panel's runtime-result observer so it
            // sees each successful recompute (initial + rain slider runs).
            v4ProjectionSidePanelRuntimeResultUnsubscribe =
              v4ProjectionSidePanel?.subscribeRuntimeResult((result) => {
                replayEventPill?.setRuntimeResult(result);
              }) ?? null;
          }
          // wave 2 §A.6 extension: re-anchor the V4 controller's endpoint
          // markers + ribbon + camera framing + selected-pair overlay
          // through the controller's exported setSelectedPair. The
          // controller mounts at most once per page life; this call is
          // a no-op when the resolved pair matches the controller's
          // existing endpoints because the entity-id keys land on the
          // same entities and the camera framing converges.
          ensureM8aV4GroundStationScene().setSelectedPair(resolvedPair);
        } else if (!isPanelState && v4ProjectionSidePanel) {
          v4ProjectionSidePanelRuntimeResultUnsubscribe?.();
          v4ProjectionSidePanelRuntimeResultUnsubscribe = null;
          v4ProjectionSidePanel.dispose();
          v4ProjectionSidePanel = null;
          v4ProjectionSidePanelMountedPairKey = null;
          replayEventPill?.setRuntimeResult(null);
        }
        groundStationSelectionChips?.setPanelMounted(
          v4ProjectionSidePanel !== null
        );
        // Always propagate the latest derived state to the pill so it
        // can reset to hidden when leaving replaying.
        replayEventPill?.setDisplayState(state);
      }
    );
  } else {
    // When selector surfaces are not mounted (first-intake owns the
    // viewer), still expose the derived state so downstream selectors
    // can branch off `idle` without a missing-attribute special case.
    document.body.dataset.displayState = "idle";
  }
  const unmountHomepageEntryCta =
    adoptFirstIntakeAsActiveOwner || isM8aV4RuntimeRequest
    ? () => {}
    : mountHomepageEntryCta(viewerShell, {
        addressedHref: buildM8aV31AddressedHref(),
        onEnter: () => {
          window.location.assign(buildM8aV31AddressedHref());
        },
        groundStationEntry: {
          addressedHref: buildM8aV4GroundStationAddressedHref(),
          onEnter: () => {
            window.location.assign(buildM8aV4GroundStationAddressedHref());
          }
        }
      });

  if (adoptFirstIntakeAsActiveOwner && resolveFirstIntakeAutoplayRequest()) {
    // M8A-V3.4 keeps the two-mode viewing model and makes the explicit demo
    // entry land in the existing handover close-view instead of the global
    // preset, without widening the camera preset interface.
    firstIntakeCinematicCameraPreset?.activatePreset();
    firstIntakeReplayTimeAuthority?.replayClock.play();
  }

  return {
    dispose() {
      delete window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      unmountHomeButtonRouteOverride();
      unmountHomepageEntryCta();
      unsubscribeDisplayState?.();
      v4ProjectionSidePanelRuntimeResultUnsubscribe?.();
      v4ProjectionSidePanelRuntimeResultUnsubscribe = null;
      v4ProjectionSidePanel?.dispose();
      v4ProjectionSidePanel = null;
      v4ProjectionSidePanelMountedPairKey = null;
      replayEventPill?.dispose();
      delete document.body.dataset.displayState;
      selectorChromeTelemetry?.dispose();
      groundStationMarkerHoverTooltip?.dispose();
      groundStationInfoCard?.dispose();
      groundStationListPicker?.dispose();
      groundStationSelectionChips?.dispose();
      groundStationMarkerFilterPanel?.dispose();
      groundStationSelectionStore?.dispose();
      groundStationMarkers?.dispose();
      disposeLightingRefresh();
      unmountOsmBuildingsShowcase();
      unmountLightingToggle();
      m8aV4GroundStationScene?.dispose();
      firstIntakeOrbitContextActors?.dispose();
      firstIntakeSatcomContextOverlay?.dispose();
      firstIntakeCinematicCameraPreset?.dispose();
      firstIntakeNearbySecondEndpointInfo?.dispose();
      firstIntakeActiveCaseNarrative?.dispose();
      firstIntakeOperatorExplainer?.dispose();
      firstIntakeNearbySecondEndpointExpression?.dispose();
      firstIntakeOverlayExpression?.dispose();
      firstIntakeNearbySecondEndpoint?.dispose();
      firstIntakeMobileEndpointTrajectoryConsumer?.dispose();
      firstIntakeReplayTimeAuthority?.dispose();
      firstIntakeMobileEndpointTrajectory?.dispose();
      firstIntakeHandoverDecisionController.dispose();
      firstIntakePhysicalInputController.dispose();
      restoreR1vVisualAcceptanceHudCleanup();
      controllerGraph.dispose();
      void satelliteOverlay.dispose();
      viewer.destroy();
    }
  };
}
