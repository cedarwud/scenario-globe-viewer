import {
  CustomDataSource,
  type Viewer
} from "cesium";

import { clearDocumentTelemetry } from "../features/telemetry/document-telemetry";
import type { ReplayClock } from "../features/time";
import type { V4ResolvedStationPair } from "../features/multi-station-selector/v4-route-selection";
import type { SceneCameraHint } from "../features/multi-station-selector/tle-first-scene-view-model";
import {
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE,
  M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
  M8A_V4_GROUND_STATION_RUNTIME_PROJECTION,
  M8A_V4_GROUND_STATION_SCENARIO_ID,
  type M8aV4EndpointId,
  type M8aV4OrbitClass,
  type M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";
import { M8A_V4_TELEMETRY_KEYS } from "./m8a-v4-ground-station-telemetry-keys";
import { syncTelemetry } from "./m8a-v4-ground-station-telemetry-sync";
import {
  isM8aV4RequirementF10PolicyPresetId,
  isM8aV4RequirementF11RulePresetId,
  M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
  M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY,
  M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION,
  M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID,
  M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID,
  type M8aV4RequirementF10PolicyPresetId,
  type M8aV4RequirementF11RulePresetId,
  type M8aV4RequirementF16ExportRecord,
  type M8aV4RequirementF16RouteExportBundle
} from "./m8a-v4-requirement-demo-surfaces";
import {
  installM8aV411VisualTokens,
  type M8aV411VisualTokenController
} from "./m8a-v411-visual-tokens";
import {
  installM8aV411HoverPopoverController
} from "./m8a-v411-hover-popover";
import {
  disposeM8aV411TransientSurfaces
} from "./m8a-v411-transition-toast";
import {
  createM8aV411DefaultSourcesFilter,
  type M8aV411SourcesFilter,
  type M8aV411SourcesTrigger
} from "./m8a-v411-sources-role";
import {
  applySelectedPairCameraHint,
  applyV4Camera,
  buildSceneEndpointContext,
  configureReplayClock,
  configureSelectedPairReplayClock,
  createSelectedPairEndpointContext,
  isM8aV4GroundStationRuntimeRequested,
  resolveModelUri,
  resolveViewportClass
} from "./m8a-v4-ground-station-scene-frame";
import { installSelectedPairTleFirstSceneLayer } from "./m8a-v4-ground-station-selected-pair-layer";
import {
  createSelectedPairOverlayDebugState
} from "./m8a-v4-ground-station-overlay-debug";
import {
  createProductUxRoot
} from "./m8a-v4-ground-station-product-dom";
import { renderProductUx } from "./m8a-v4-ground-station-product-sync";
import {
  buildEndpointState,
  buildProductUxState,
  buildReplayWindowState,
  buildSimulationHandoverState,
  cloneState,
  M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE,
  notifyListeners,
  resolveReplayWindowRatio,
  resolveServiceStateWindow,
  resolveSimulationHandoverWindow,
  toEpochMilliseconds
} from "./m8a-v4-ground-station-state-builders";
import {
  createGroundStationOrbitRenderLayer
} from "./m8a-v4-ground-station-orbit-render-layer";
import {
  createEndpointContextRibbonEntityOptions,
  createEndpointEntityOptions
} from "./m8a-v4-ground-station-cesium-entities";
import {
  createM8aV411ReviewerModeInitialState,
  isM8aV411ReviewAutoPauseElapsed,
  M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS,
  readM8aV411ReviewerModePersistedToggle,
  transitionForFinalHoldEnter,
  transitionForInspectorClose,
  transitionForInspectorOpen,
  transitionForReviewAutoPauseElapsed,
  transitionForReviewAutoPauseStart,
  transitionForReviewModeToggle,
  transitionForUserPause,
  transitionForUserPlay,
  writeM8aV411ReviewerModePersistedToggle,
  type M8aV411ReviewerModeState
} from "./m8a-v411-reviewer-mode";
import {
  buildV49TransitionEvent,
  M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
  M8A_V4_LINK_FLOW_CUE_MODE,
  M8A_V4_LINK_FLOW_CUE_VERSION,
  M8A_V4_LINK_FLOW_DIRECTIONS,
  M8A_V4_LINK_FLOW_PULSE_OFFSETS,
  M8A_V4_LINK_FLOW_RELATION_ROLES,
  M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
  M8A_V411_INSPECTOR_TABS,
  M8A_V47_DEBUG_TEST_MULTIPLIER,
  M8A_V47_FINAL_HOLD_DURATION_MS,
  M8A_V47_GUIDED_REVIEW_MULTIPLIER,
  M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
  M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS,
  M8A_V47_QUICK_SCAN_MULTIPLIER,
  M8A_V49_TRANSITION_EVENT_DURATION_MS,
  resolveTimelineLabel,
  type M8aV411InspectorTab,
  type M8aV47ProductPlaybackMultiplier,
  type M8aV49TransitionEventRuntime
} from "./m8a-v4-product-ux-model";
import {
  M8A_V4_GROUND_STATION_DATA_SOURCE_NAME,
  M8A_V4_GROUND_STATION_PROOF_SEAM,
  M8A_V4_GROUND_STATION_RUNTIME_STATE,
  type M8aV4GroundStationSceneState
} from "./m8a-v4-ground-station-scene-state";

import {
  serializeList,
  serializeJson,
  resolveFallbackGuardCueMode,
  buildRequirementGapSurfaceState,
  buildAcceptanceLayerState,
  buildF09RateSurfaceState,
  buildF16ExportSurfaceState,
  buildPolicyRuleControlsState,
  buildF16RouteExportBundle
} from "./m8a-v4-ground-station-surface-state-builders";

export { isM8aV4GroundStationRuntimeRequested };
export {
  M8A_V4_GROUND_STATION_DATA_SOURCE_NAME,
  M8A_V4_GROUND_STATION_PROOF_SEAM,
  M8A_V4_GROUND_STATION_RUNTIME_STATE
} from "./m8a-v4-ground-station-scene-state";
export type {
  M8aV4GroundStationSceneState
} from "./m8a-v4-ground-station-scene-state";

const M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS = 1;
const M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 3;
const M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS = 1;

export interface M8aV4GroundStationSceneController {
  getState(): M8aV4GroundStationSceneState;
  getLastF16RouteExport(): M8aV4RequirementF16RouteExportBundle | null;
  exportF16RouteState(): M8aV4RequirementF16RouteExportBundle;
  subscribe(listener: (state: M8aV4GroundStationSceneState) => void): () => void;
  play(): void;
  pause(): void;
  restart(): void;
  setPlaybackMultiplier(multiplier: M8aV47ProductPlaybackMultiplier): void;
  setDebugPlaybackMultiplier(
    multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
  ): void;
  /**
   * Re-anchor the V4 scene's selected-pair surfaces (endpoint A/B
   * markers, ribbon polyline, camera framing, selected-pair satellite
   * overlay) to a new resolved pair without a page reload. Wave 2 §A.6
   * extension — composition wires this to the selection-store so a
   * reselection during an existing session hot-mounts new endpoints.
   *
   * Passing `null` is a no-op; selection clear continues to dispose the
   * V4 controller via display-state.
   */
  setSelectedPair(pair: V4ResolvedStationPair | null): void;
  dispose(): void;
}

export interface M8aV4GroundStationSceneControllerOptions {
  viewer: Viewer;
  hudFrame: HTMLElement;
  replayClock: ReplayClock;
}

function createHudRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "m8a-v4-ground-station-scene";
  root.dataset.m8aV4GroundStationScene = "true";
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.dataset.m8aV46eVisualLanguage = "true";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-label", "M8A V4.6E hidden runtime state seam");
  return root;
}

function renderHud(root: HTMLElement, state: M8aV4GroundStationSceneState): void {
  const activeStateLabel = resolveTimelineLabel(
    state.simulationHandoverModel.window.windowId
  );

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  root.dataset.m8aV4GroundStationSceneVisibility = "hidden";
  root.dataset.m8aV46eVisualLanguage = "true";
  root.dataset.activeStateLabel = activeStateLabel;
  root.dataset.sceneSourceMode = state.sceneSourceMode;
  root.dataset.serviceWindowId = state.serviceState.window.windowId;
  root.dataset.simulationHandoverModelId =
    state.simulationHandoverModel.modelId;
  root.dataset.simulationHandoverWindowId =
    state.simulationHandoverModel.window.windowId;
  root.dataset.displayRepresentativeActorId =
    state.simulationHandoverModel.window.displayRepresentativeActorId;
  root.dataset.candidateContextActorIds = serializeList(
    state.simulationHandoverModel.window.candidateContextActorIds
  );
  root.dataset.fallbackContextActorIds = serializeList(
    state.simulationHandoverModel.window.fallbackContextActorIds
  );
  root.dataset.currentPrimaryOrbit =
    state.serviceState.window.currentPrimaryOrbitClass;
  root.dataset.nextCandidateOrbit =
    state.serviceState.window.nextCandidateOrbitClass;
  root.dataset.precisionBadge = M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE;
  root.dataset.visibleContextRibbonCount = String(
    state.relationCues.visibleContextRibbonCount
  );
  root.dataset.linkFlowCue = state.relationCues.dataFlowCueVersion;
  root.dataset.linkFlowCueMode = state.relationCues.dataFlowCueMode;
  root.dataset.linkFlowDirections = serializeList([
    ...state.relationCues.dataFlowDirections
  ]);
  root.dataset.linkFlowPulseCount = String(state.relationCues.dataFlowPulseCount);
  root.dataset.linkFlowTruthBoundary =
    state.relationCues.dataFlowTruthBoundary;
  root.dataset.fallbackGuardCueMode = state.relationCues.fallbackGuardCueMode;
  root.dataset.visibleActorLabelCount = String(
    state.actorLabelDensity.visibleActorLabelCount
  );
  root.dataset.visibleActorLabelIds = serializeList(
    state.actorLabelDensity.visibleActorLabelIds
  );
  root.dataset.rawRequirementSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;
  root.dataset.nonClaims = serializeJson(state.nonClaims);
  root.innerHTML = "";
}

function downloadF16RouteExportBundle(
  bundle: M8aV4RequirementF16RouteExportBundle
): void {
  const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = bundle.exportFile.filename;
  link.rel = "noopener";
  link.dataset.requirementF16DownloadLink = "true";
  link.style.display = "none";
  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
}

export function createM8aV4GroundStationSceneController({
  viewer,
  hudFrame,
  replayClock
}: M8aV4GroundStationSceneControllerOptions): M8aV4GroundStationSceneController {
  const modelUri = resolveModelUri();
  const dataSource = new CustomDataSource(M8A_V4_GROUND_STATION_DATA_SOURCE_NAME);
  // sceneEndpointContext is reassigned by setSelectedPair (wave 2 §A.6
  // extension) so endpoint A/B markers + ribbon + camera framing can
  // re-anchor on a reselection without a page reload.
  let sceneEndpointContext = buildSceneEndpointContext();
  const visualTokenController: M8aV411VisualTokenController =
    installM8aV411VisualTokens(viewer);
  const hudRoot = createHudRoot();
  const productUxRoot = createProductUxRoot({
    focusChoreographyVersion:
      M8A_V4_CUSTOMER_DEMO_VIEW_FOCUS_CHOREOGRAPHY_VERSION,
    defaultFocusVersion: M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
    narrowVersion: M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION
  });
  const listeners = new Set<(state: M8aV4GroundStationSceneState) => void>();
  let disposed = false;
  let dataSourceAttached = false;
  let selectedPairOverlayState = createSelectedPairOverlayDebugState(
    sceneEndpointContext.selectedPair ? "loading" : "not-requested"
  );
  let selectedPairOverlayInstallGeneration = 0;
  let latestCameraHint: SceneCameraHint | null = null;

  const handleResize = () => {
    if (disposed) return;
    if (latestCameraHint) {
      applySelectedPairCameraHint(viewer, sceneEndpointContext, latestCameraHint);
    } else {
      applyV4Camera(viewer, sceneEndpointContext);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("resize", handleResize);
  }
  let detailsDisclosureOpen = false;
  let boundaryDisclosureOpen = false;
  let sourcesDisclosureOpen = false;
  let activeInspectorTab: M8aV411InspectorTab = "decision";
  let sourcesFilter = createM8aV411DefaultSourcesFilter(
    "advanced-source-provenance"
  );
  let boundaryFullTruthDisclosureOpen = false;
  let finalHoldActive = false;
  let finalHoldStartedAtEpochMs: number | null = null;
  let finalHoldCompletedAtEpochMs: number | null = null;
  let finalHoldLoopCount = 0;
  let finalHoldTimeoutId: number | undefined;
  let resumeAfterFinalHold = true;
  let productLoopArmed = true;
  let latestSimulationWindow = resolveSimulationHandoverWindow(
    replayClock.getState()
  );
  let activeTransitionEvent: M8aV49TransitionEventRuntime | null = null;
  let transitionTimeoutId: number | undefined;
  let refreshAfterTransitionTimeout: (() => void) | null = null;
  let lastPointerActivatedControl: HTMLElement | null = null;
  let lastPointerActivatedAt = 0;
  let narrowRailDrawerOpen = false;
  let lastDetailsTriggerElement: HTMLElement | null = null;
  let lastRailTriggerElement: HTMLElement | null = null;
  let lastSyncReplayRatio = resolveReplayWindowRatio(replayClock.getState());
  let latestF16ExportRecord: M8aV4RequirementF16ExportRecord | null = null;
  let latestF16ExportBundle: M8aV4RequirementF16RouteExportBundle | null = null;
  let activePolicyPresetId: M8aV4RequirementF10PolicyPresetId =
    M8A_V4_CUSTOMER_F10_POLICY_DEFAULT_PRESET_ID;
  let activeRulePresetId: M8aV4RequirementF11RulePresetId =
    M8A_V4_CUSTOMER_F11_RULE_DEFAULT_PRESET_ID;

  const reviewerModeStorage: Pick<Storage, "getItem" | "setItem"> | null =
    typeof window !== "undefined" && typeof window.localStorage === "object"
      ? window.localStorage
      : null;
  let reviewerModeState: M8aV411ReviewerModeState =
    createM8aV411ReviewerModeInitialState({
      reviewModeOn: readM8aV411ReviewerModePersistedToggle(reviewerModeStorage),
      nowEpochMs: Date.now()
    });
  let reviewAutoPauseTimeoutId: number | undefined;

  if (sceneEndpointContext.selectedPair) {
    configureSelectedPairReplayClock(viewer, replayClock);
  } else {
    configureReplayClock(viewer, replayClock);
  }
  applyV4Camera(viewer, sceneEndpointContext);
  hudFrame.dataset.hudVisibility = "m8a-v4";
  hudFrame.setAttribute("aria-hidden", "false");
  hudFrame.appendChild(hudRoot);
  hudFrame.appendChild(productUxRoot);

  let endpointA = sceneEndpointContext.endpoints.find(
    (endpoint) => endpoint.endpointRole === "endpoint-a"
  );
  let endpointB = sceneEndpointContext.endpoints.find(
    (endpoint) => endpoint.endpointRole === "endpoint-b"
  );

  if (!endpointA || !endpointB) {
    throw new Error("V4 ground-station scene requires both endpoint roles.");
  }

  for (const endpoint of sceneEndpointContext.endpoints) {
    dataSource.entities.add(createEndpointEntityOptions(endpoint));
  }

  dataSource.entities.add(
    createEndpointContextRibbonEntityOptions({
      endpointA,
      endpointB,
      selectedPairActive: sceneEndpointContext.selectedPair !== null
    })
  );

  const initialSelectedPairOverlayGeneration = ++selectedPairOverlayInstallGeneration;
  void installSelectedPairTleFirstSceneLayer({
    dataSource,
    endpointA,
    endpointB,
    modelUri,
    replayClock,
    selectedPair: sceneEndpointContext.selectedPair,
    viewer,
    onStateChange: (state) => {
      selectedPairOverlayState = state;
    },
    shouldSkip: () =>
      disposed ||
      initialSelectedPairOverlayGeneration !== selectedPairOverlayInstallGeneration,
    applyCameraHint: (cameraHint) => {
      latestCameraHint = cameraHint;
      applySelectedPairCameraHint(viewer, sceneEndpointContext, cameraHint);
    }
  }).catch((error) => {
    selectedPairOverlayState = createSelectedPairOverlayDebugState("error", {
      errorMessage: error instanceof Error ? error.message : "unknown overlay error"
    });
  });

  const orbitRenderLayer = createGroundStationOrbitRenderLayer({
    dataSource,
    endpointA,
    endpointB,
    modelUri,
    initialSimulationWindow: latestSimulationWindow,
    replayClock,
    viewer
  });

  function setFixtureDrivenEntitiesVisible(visible: boolean): void {
    orbitRenderLayer.setFixtureDrivenEntitiesVisible(
      visible,
      latestSimulationWindow
    );
  }

  const clearFinalHoldTimer = (): void => {
    if (typeof finalHoldTimeoutId === "number") {
      window.clearTimeout(finalHoldTimeoutId);
      finalHoldTimeoutId = undefined;
    }
  };

  const finishFinalHold = (): void => {
    if (disposed || !finalHoldActive) {
      return;
    }

    const shouldResume = resumeAfterFinalHold;
    finalHoldActive = false;
    finalHoldCompletedAtEpochMs = Date.now();
    finalHoldStartedAtEpochMs = null;
    finalHoldLoopCount += 1;
    finalHoldTimeoutId = undefined;
    replayClock.seek(replayClock.getState().startTime);

    if (shouldResume) {
      productLoopArmed = true;
      reviewerModeState = transitionForUserPlay(reviewerModeState, {
        nowEpochMs: Date.now()
      });
      replayClock.play();
    } else {
      productLoopArmed = false;
      replayClock.pause();
    }

    syncState();
  };

  const completeFinalHoldIfElapsed = (): boolean => {
    if (
      !finalHoldActive ||
      typeof finalHoldStartedAtEpochMs !== "number" ||
      Date.now() - finalHoldStartedAtEpochMs < M8A_V47_FINAL_HOLD_DURATION_MS
    ) {
      return false;
    }

    finishFinalHold();
    return true;
  };

  const startFinalHold = (): void => {
    if (disposed || finalHoldActive) {
      return;
    }

    finalHoldActive = true;
    finalHoldStartedAtEpochMs = Date.now();
    finalHoldCompletedAtEpochMs = null;
    resumeAfterFinalHold = true;
    productLoopArmed = true;
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForFinalHoldEnter(reviewerModeState, {
      nowEpochMs: Date.now()
    });
    replayClock.seek(replayClock.getState().stopTime);
    replayClock.pause();
    syncState();
    clearFinalHoldTimer();
    finalHoldTimeoutId = window.setTimeout(
      completeFinalHoldIfElapsed,
      M8A_V47_FINAL_HOLD_DURATION_MS
    );
  };

  const cancelFinalHold = (): void => {
    if (!finalHoldActive) {
      clearFinalHoldTimer();
      return;
    }

    finalHoldActive = false;
    finalHoldStartedAtEpochMs = null;
    resumeAfterFinalHold = false;
    productLoopArmed = false;
    clearFinalHoldTimer();
  };

  const setProductPlaybackMultiplier = (
    multiplier: M8aV47ProductPlaybackMultiplier
  ): void => {
    if (!M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS.includes(multiplier)) {
      throw new Error(`Unsupported V4.7 product playback multiplier: ${multiplier}`);
    }

    replayClock.setMultiplier(multiplier);
    syncState();
  };

  const setDebugTestPlaybackMultiplier = (
    multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
  ): void => {
    if (multiplier !== M8A_V47_DEBUG_TEST_MULTIPLIER) {
      throw new Error(`Unsupported V4.7 debug playback multiplier: ${multiplier}`);
    }

    replayClock.setMultiplier(multiplier);
    syncState();
  };

  const clearReviewAutoPauseTimer = (): void => {
    if (typeof reviewAutoPauseTimeoutId === "number") {
      window.clearTimeout(reviewAutoPauseTimeoutId);
      reviewAutoPauseTimeoutId = undefined;
    }
  };

  const scheduleReviewAutoPauseElapsed = (): void => {
    clearReviewAutoPauseTimer();
    reviewAutoPauseTimeoutId = window.setTimeout(() => {
      reviewAutoPauseTimeoutId = undefined;
      if (
        reviewerModeState.replayClockMode === "review-auto-paused" &&
        isM8aV411ReviewAutoPauseElapsed(reviewerModeState, Date.now())
      ) {
        reviewerModeState = transitionForReviewAutoPauseElapsed(
          reviewerModeState,
          { nowEpochMs: Date.now() }
        );
        productLoopArmed = true;
        replayClock.play();
        syncState();
      }
    }, M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS + 60);
  };

  const playProductReplay = (): void => {
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForUserPlay(reviewerModeState, {
      nowEpochMs: Date.now()
    });

    if (finalHoldActive) {
      resumeAfterFinalHold = true;
      productLoopArmed = true;
      syncState();
      return;
    }

    if (resolveReplayWindowRatio(replayClock.getState()) >= 1) {
      replayClock.seek(replayClock.getState().startTime);
    }

    productLoopArmed = true;
    replayClock.play();
    syncState();
  };

  const pauseProductReplay = (): void => {
    cancelFinalHold();
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForUserPause(reviewerModeState, {
      nowEpochMs: Date.now()
    });
    productLoopArmed = false;
    replayClock.pause();
    syncState();
  };

  const restartProductReplay = (): void => {
    const replayState = replayClock.getState();
    const shouldPlayAfterRestart = finalHoldActive || replayState.isPlaying;
    cancelFinalHold();
    clearReviewAutoPauseTimer();
    reviewerModeState = transitionForUserPlay(reviewerModeState, {
      nowEpochMs: Date.now()
    });
    replayClock.seek(replayState.startTime);

    if (shouldPlayAfterRestart) {
      productLoopArmed = true;
      replayClock.play();
    } else {
      productLoopArmed = false;
      replayClock.pause();
    }

    syncState();
  };

  const openInspectorDisclosure = (tab: M8aV411InspectorTab): void => {
    detailsDisclosureOpen = true;
    activeInspectorTab = tab;
    boundaryDisclosureOpen = false;
    sourcesDisclosureOpen = false;
    boundaryFullTruthDisclosureOpen = false;
    clearReviewAutoPauseTimer();
    const replayState = replayClock.getState();
    const pinnedRatio = resolveReplayWindowRatio(replayState);
    const pinnedWindow = resolveSimulationHandoverWindow(replayState);
    reviewerModeState = transitionForInspectorOpen(reviewerModeState, {
      pinnedWindowId: pinnedWindow.windowId,
      pinnedReplayRatio: pinnedRatio,
      nowEpochMs: Date.now()
    });
    productLoopArmed = false;
    replayClock.pause();
    syncState();
    const inspectorSheet = productUxRoot.querySelector<HTMLElement>(
      "[data-m8a-v48-inspector='true']"
    );
    if (inspectorSheet) {
      inspectorSheet.scrollTop = 0;
    }
  };

  const toggleDetailsDisclosure = (): void => {
    openInspectorDisclosure("decision");
  };

  const closeDetailsDisclosure = (): void => {
    detailsDisclosureOpen = false;
    boundaryDisclosureOpen = false;
    sourcesDisclosureOpen = false;
    boundaryFullTruthDisclosureOpen = false;
    activeInspectorTab = "decision";

    const wasPinned =
      reviewerModeState.replayClockMode === "inspector-pinned";
    const pinnedRatio = reviewerModeState.pinnedReplayRatio;
    reviewerModeState = transitionForInspectorClose(reviewerModeState, {
      nowEpochMs: Date.now()
    });

    if (wasPinned && typeof pinnedRatio === "number") {
      const replayState = replayClock.getState();
      const startMs = toEpochMilliseconds(replayState.startTime);
      const stopMs = toEpochMilliseconds(replayState.stopTime);
      const targetMs = startMs + (stopMs - startMs) * pinnedRatio;
      replayClock.seek(new Date(targetMs).toISOString());
    }

    if (
      reviewerModeState.replayClockMode === "running" &&
      !finalHoldActive
    ) {
      productLoopArmed = true;
      replayClock.play();
    }

    syncState();
  };

  const toggleReviewerMode = (): void => {
    const next = !reviewerModeState.reviewModeOn;
    reviewerModeState = transitionForReviewModeToggle(reviewerModeState, {
      reviewModeOn: next,
      nowEpochMs: Date.now()
    });
    writeM8aV411ReviewerModePersistedToggle(reviewerModeStorage, next);

    if (
      !next &&
      reviewerModeState.replayClockMode === "running" &&
      !finalHoldActive &&
      !replayClock.getState().isPlaying
    ) {
      productLoopArmed = true;
      replayClock.play();
    }

    clearReviewAutoPauseTimer();
    syncState();
  };

  const enterReviewAutoPauseIfApplicable = (): void => {
    if (
      !reviewerModeState.reviewModeOn ||
      reviewerModeState.replayClockMode !== "running" ||
      finalHoldActive
    ) {
      return;
    }

    reviewerModeState = transitionForReviewAutoPauseStart(reviewerModeState, {
      nowEpochMs: Date.now()
    });

    if (reviewerModeState.replayClockMode === "review-auto-paused") {
      productLoopArmed = false;
      replayClock.pause();
      scheduleReviewAutoPauseElapsed();
    }
  };

  const toggleBoundaryDisclosure = (): void => {
    boundaryDisclosureOpen = true;
    boundaryFullTruthDisclosureOpen = false;
    activeInspectorTab = "decision";
    // Conv 3: toggle-boundary is now triggered by footer chip (Truth button removed)
    productUxRoot.dataset.m8aV411FooterChipBoundaryBehavior =
      "footer-chip-opens-state-evidence-with-truth-tail-visible";
    syncState();
    productUxRoot
      .querySelector<HTMLElement>("[data-m8a-v411-inspector-role='state-evidence']")
      ?.scrollIntoView({ block: "nearest" });
  };

  const closeBoundaryDisclosure = (): void => {
    detailsDisclosureOpen = false;
    boundaryDisclosureOpen = false;
    sourcesDisclosureOpen = false;
    boundaryFullTruthDisclosureOpen = false;
    activeInspectorTab = "decision";
    syncState();
  };

  const focusSourcesRole = (): void => {
    const role = productUxRoot.querySelector<HTMLElement>(
      "[data-m8a-v411-inspector-role='sources']"
    );

    role?.scrollIntoView({ block: "nearest" });
    role?.focus({ preventScroll: true });
  };

  const sourceEndpointIds = new Set(
    M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints.map(
      (endpoint) => endpoint.endpointId
    )
  );
  const isEndpointId = (value: string): value is M8aV4EndpointId =>
    sourceEndpointIds.has(value as M8aV4EndpointId);

  const isOrbitClass = (value: string): value is M8aV4OrbitClass =>
    value === "leo" || value === "meo" || value === "geo";

  const resolveSourcesFilterFromElement = (
    element: HTMLElement,
    fallbackTrigger: M8aV411SourcesTrigger
  ): M8aV411SourcesFilter => {
    const trigger =
      (element.dataset.m8aV411SourcesTrigger as M8aV411SourcesTrigger | undefined) ??
      fallbackTrigger;
    const endpointCandidate =
      element.dataset.m8aV411SourcesEndpointId ??
      element.dataset.m8aV411HoverTargetId ??
      "";
    const orbitCandidate = element.dataset.m8aV411SourcesOrbitClass ?? "";

    return {
      trigger,
      endpointId: isEndpointId(endpointCandidate) ? endpointCandidate : "",
      orbitClass: isOrbitClass(orbitCandidate) ? orbitCandidate : ""
    };
  };

  const openSourcesDisclosure = (filter: M8aV411SourcesFilter): void => {
    detailsDisclosureOpen = true;
    sourcesDisclosureOpen = true;
    activeInspectorTab = "evidence";
    sourcesFilter = filter;
    productUxRoot.dataset.m8aV411PinnedHoverRole = "sources";
    productUxRoot.dataset.m8aV411PinnedSourcesTrigger = filter.trigger;
    productUxRoot.dataset.m8aV411SourcesAffordance =
      "advanced-source-provenance-toggle-only";
    syncState();
    focusSourcesRole();
  };

  const openSourcesFromElement = (
    element: HTMLElement,
    fallbackTrigger: M8aV411SourcesTrigger
  ): void => {
    openSourcesDisclosure(resolveSourcesFilterFromElement(element, fallbackTrigger));
  };

  const toggleSourceProvenanceDisclosure = (control: HTMLElement): void => {
    if (sourcesDisclosureOpen) {
      sourcesDisclosureOpen = false;
      syncState();
      return;
    }

    openSourcesFromElement(control, "advanced-source-provenance");
  };

  const hoverPopoverController = installM8aV411HoverPopoverController(
    productUxRoot,
    {
      pinStateEvidence: (target) => {
        detailsDisclosureOpen = true;
        productUxRoot.dataset.m8aV411PinnedHoverTargetKind =
          target.dataset.m8aV411HoverTargetKind ?? "";
        productUxRoot.dataset.m8aV411PinnedHoverTargetId =
          target.dataset.m8aV411HoverTargetId ?? "";
        productUxRoot.dataset.m8aV411PinnedHoverRole = "state-evidence";
        syncState();
      }
    }
  );

  const clearTransitionTimer = (): void => {
    if (typeof transitionTimeoutId === "number") {
      window.clearTimeout(transitionTimeoutId);
      transitionTimeoutId = undefined;
    }
  };

  const resolveVisibleTransitionEvent =
    (): M8aV49TransitionEventRuntime | null => {
      if (!activeTransitionEvent) {
        return null;
      }

      if (Date.now() >= activeTransitionEvent.expiresAtEpochMs) {
        return null;
      }

      return activeTransitionEvent;
    };

  const startTransitionEvent = (
    fromWindowId: M8aV46dSimulationHandoverWindowId,
    toWindowId: M8aV46dSimulationHandoverWindowId
  ): void => {
    if (fromWindowId === toWindowId) {
      return;
    }

    clearTransitionTimer();
    activeTransitionEvent = buildV49TransitionEvent(
      fromWindowId,
      toWindowId,
      Date.now()
    );
    transitionTimeoutId = window.setTimeout(() => {
      activeTransitionEvent = null;
      transitionTimeoutId = undefined;
      refreshAfterTransitionTimeout?.();
    }, M8A_V49_TRANSITION_EVENT_DURATION_MS);
  };

  const createState = (): M8aV4GroundStationSceneState => {
    const replayState = replayClock.getState();
    const serviceWindow = resolveServiceStateWindow(replayState);
    const simulationHandoverModel = buildSimulationHandoverState(replayState);
    const simulationWindow = simulationHandoverModel.window;
    const viewportClass = resolveViewportClass();
    const productUx = buildProductUxState({
      replayState,
      simulationHandoverModel,
      viewportClass,
      finalHoldActive,
      finalHoldStartedAtEpochMs,
      finalHoldCompletedAtEpochMs,
      finalHoldLoopCount,
      detailsDisclosureOpen,
      boundaryDisclosureOpen,
      sourcesDisclosureOpen,
      sourcesFilter,
      boundaryFullTruthDisclosureOpen,
      activeInspectorTab,
      activeTransitionEvent: resolveVisibleTransitionEvent(),
      reviewerModeState,
      narrowRailDrawerOpen
    });
    const actors = orbitRenderLayer.buildActorRuntimeRecords(
      replayState,
      simulationWindow
    );
    const orbitActorCounts = {
      leo: actors.filter((actor) => actor.orbitClass === "leo").length,
      meo: actors.filter((actor) => actor.orbitClass === "meo").length,
      geo: actors.filter((actor) => actor.orbitClass === "geo").length
    };
    const visibleActorLabelIds = actors
      .filter((actor) => actor.labelVisibility === "always-visible")
      .map((actor) => actor.actorId);
    const hiddenContextActorLabelCount = actors.filter(
      (actor) => actor.labelVisibility === "hidden-context"
    ).length;

    return {
      scenarioId: M8A_V4_GROUND_STATION_SCENARIO_ID,
      runtimeState: M8A_V4_GROUND_STATION_RUNTIME_STATE,
      directRoute: {
        queryParam: M8A_V4_GROUND_STATION_QUERY_PARAM,
        queryValue: M8A_V4_GROUND_STATION_QUERY_VALUE
      },
      projectionId: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.projectionId,
      generatedFromArtifactId:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.generatedFromArtifactId,
      projectionSourceAuthority:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.sourceAuthority,
      sceneSourceMode: sceneEndpointContext.selectedPair
        ? "tle-first-runtime"
        : "fixture-fallback",
      dataSourceName: M8A_V4_GROUND_STATION_DATA_SOURCE_NAME,
      dataSourceAttached,
      endpointCount: 2,
      endpoints: buildEndpointState(sceneEndpointContext.endpoints),
      selectedPairOverlay: selectedPairOverlayState,
      actorCount: actors.length,
      orbitActorCounts,
      actors,
      actorLabelDensity: {
        policy: "representative-orbit-class-labels-only",
        v46ePolicy: "active-representative-label-with-endpoint-priority",
        viewportClass,
        endpointLabelsPriority: true,
        candidateLabelsVisibleByDefault: false,
        fallbackLabelPolicy: "geo-representative-or-guard-state-only",
        preferredVisibleActorLabelCount:
          M8A_V46E_PREFERRED_VISIBLE_ACTOR_LABELS,
        visibleActorLabelCount: visibleActorLabelIds.length,
        visibleActorLabelIds,
        alwaysVisibleActorLabelCount: visibleActorLabelIds.length,
        alwaysVisibleActorLabelIds: visibleActorLabelIds,
        hiddenContextActorLabelCount,
        desktopMaxAlwaysVisibleActorLabels:
          M8A_V4_DESKTOP_MAX_ALWAYS_VISIBLE_ACTOR_LABELS,
        narrowMaxAlwaysVisibleActorLabels:
          M8A_V4_NARROW_MAX_ALWAYS_VISIBLE_ACTOR_LABELS
      },
      serviceState: {
        modelId:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.modelId,
        truthState:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.truthState,
        truthBoundaryLabel:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel
            .truthBoundaryLabel,
        window: serviceWindow,
        timelineWindowIds:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline.map(
            (windowDefinition) => windowDefinition.windowId
          ),
        isNativeRfHandover:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel
            .isNativeRfHandover,
        measuredLatency:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.metricPolicy
            .measuredLatency,
        measuredJitter:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.metricPolicy
            .measuredJitter,
        measuredThroughput:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.metricPolicy
            .measuredThroughput
      },
      simulationHandoverModel,
      replayWindow: buildReplayWindowState(replayState),
      productUx,
      relationCues: {
        cueKind: "v4.6e-handover-visual-language-context-ribbons",
        displayRepresentativeActorId:
          simulationWindow.displayRepresentativeActorId,
        candidateContextActorId: simulationWindow.candidateContextActorIds[0],
        fallbackContextActorId: simulationWindow.fallbackContextActorIds[0],
        visibleContextRibbonCount: 2,
        visibleContextRibbonRoles: [
          "displayRepresentative",
          "candidateContext"
        ] as const,
        dataFlowCueVersion: M8A_V4_LINK_FLOW_CUE_VERSION,
        dataFlowCueMode: M8A_V4_LINK_FLOW_CUE_MODE,
        dataFlowDirections: M8A_V4_LINK_FLOW_DIRECTIONS,
        dataFlowPulseCount:
          M8A_V4_LINK_FLOW_RELATION_ROLES.length *
          M8A_V4_LINK_FLOW_DIRECTIONS.length *
          M8A_V4_LINK_FLOW_PULSE_OFFSETS.length,
        dataFlowTruthBoundary: M8A_V4_LINK_FLOW_TRUTH_BOUNDARY,
        fallbackGuardCueMode: resolveFallbackGuardCueMode(simulationWindow),
        fallbackFullRibbonVisible: false,
        activeSatelliteTruth: "not-claimed",
        activeGatewayTruth: "not-claimed",
        pairSpecificTeleportPathTruth: "not-claimed",
        nativeRfHandoverTruth: "not-claimed"
      },
      requirementGapSurface: buildRequirementGapSurfaceState(),
      acceptanceLayer: buildAcceptanceLayerState(actors.length, orbitActorCounts),
      f09RateSurface: buildF09RateSurfaceState(simulationHandoverModel),
      f16ExportSurface: buildF16ExportSurfaceState(latestF16ExportRecord),
      policyRuleControls: buildPolicyRuleControlsState(
        activePolicyPresetId,
        activeRulePresetId
      ),
      nonClaims:
        M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.runtimeNarrativeNonClaims,
      proofSeam: M8A_V4_GROUND_STATION_PROOF_SEAM,
      sourceLineage: {
        projectionRead: "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION",
        serviceStateRead:
          "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.serviceStateModel.timeline",
        simulationHandoverRead:
          "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.simulationHandoverModel.timeline",
        rawPackageSideReadOwnership: "forbidden",
        rawSourcePathsIncluded:
          M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.rawSourcePathsIncluded
      },
      modelAsset: {
        ...M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.modelAsset,
        uri: modelUri
      }
    };
  };

  const syncState = (): M8aV4GroundStationSceneState => {
    let nextState = createState();
    const previousWindowId = latestSimulationWindow.windowId;
    const nextWindowId = nextState.simulationHandoverModel.window.windowId;

    if (previousWindowId !== nextWindowId) {
      const nextRatio = nextState.productUx.playback.replayRatio;
      const ratioJump = Math.abs(nextRatio - lastSyncReplayRatio);
      // Only auto-pause for natural replay progression. A large jump (e.g.
      // user seek, controller.play after seek) is not a natural transition.
      const isNaturalProgression = ratioJump < 0.05;
      startTransitionEvent(previousWindowId, nextWindowId);
      if (isNaturalProgression) {
        enterReviewAutoPauseIfApplicable();
      }
      nextState = createState();
    }
    lastSyncReplayRatio = nextState.productUx.playback.replayRatio;

    latestSimulationWindow = nextState.simulationHandoverModel.window;
    orbitRenderLayer.sync(latestSimulationWindow);
    setFixtureDrivenEntitiesVisible(!sceneEndpointContext.selectedPair);

    renderHud(hudRoot, nextState);
    renderProductUx(
      productUxRoot,
      nextState,
      viewer,
      visualTokenController,
      sceneEndpointContext.endpoints,
      {
        defaultFocusVersion: M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_FOCUS_VERSION,
        narrowVersion: M8A_V4_CUSTOMER_DEMO_VIEW_NARROW_VERSION,
        defaultTruthCopy: M8A_V4_CUSTOMER_DEMO_VIEW_DEFAULT_TRUTH_COPY,
        fullReplaySimulatedSeconds:
          M8A_V4_FULL_LEO_ORBIT_REPLAY_PROFILE.replayDurationMs / 1000
      }
    );
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }

    return nextState;
  };
  const exportF16BoundedRouteJson = (): M8aV4RequirementF16RouteExportBundle => {
    const stateForExport = syncState();
    const generatedAtUtc = new Date().toISOString();
    const bundle = buildF16RouteExportBundle(stateForExport, generatedAtUtc);

    try {
      downloadF16RouteExportBundle(bundle);
      latestF16ExportRecord = {
        generatedAtUtc,
        filename: bundle.exportFile.filename,
        status: "exported",
        errorMessage: ""
      };
      latestF16ExportBundle = bundle;
    } catch (error) {
      latestF16ExportRecord = {
        generatedAtUtc,
        filename: bundle.exportFile.filename,
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "unknown export error"
      };
      latestF16ExportBundle = bundle;
    }

    syncState();
    return bundle;
  };
  const setRequirementF10PolicyPreset = (
    presetId: M8aV4RequirementF10PolicyPresetId
  ): void => {
    activePolicyPresetId = presetId;
    syncState();
  };
  const setRequirementF11RulePreset = (
    presetId: M8aV4RequirementF11RulePresetId
  ): void => {
    activeRulePresetId = presetId;
    syncState();
  };
  refreshAfterTransitionTimeout = () => {
    if (!disposed) {
      syncState();
    }
  };

  const activateProductUxControl = (
    control: HTMLElement,
    event: MouseEvent | KeyboardEvent
  ): void => {
    const action = control.dataset.m8aV47Action;

    switch (action) {
      case "play":
        playProductReplay();
        break;
      case "pause":
        pauseProductReplay();
        break;
      case "restart":
        restartProductReplay();
        break;
      case "speed": {
        const multiplier = Number(control.dataset.m8aV47PlaybackMultiplier);

        if (
          multiplier === M8A_V47_GUIDED_REVIEW_MULTIPLIER ||
          multiplier === M8A_V47_PRODUCT_DEFAULT_MULTIPLIER ||
          multiplier === M8A_V47_QUICK_SCAN_MULTIPLIER
        ) {
          setProductPlaybackMultiplier(multiplier);
        }

        break;
      }
      case "toggle-disclosure":
        if (control instanceof HTMLElement) {
          lastDetailsTriggerElement = control;
        }
        toggleDetailsDisclosure();
        break;
      case "close-disclosure":
        closeDetailsDisclosure();
        if (lastDetailsTriggerElement) {
          window.setTimeout(() => {
            if (lastDetailsTriggerElement) {
              lastDetailsTriggerElement.focus({ preventScroll: true });
              lastDetailsTriggerElement = null;
            }
          }, 0);
        }
        break;
      case "toggle-boundary":
        toggleBoundaryDisclosure();
        break;
      case "toggle-source-provenance":
        toggleSourceProvenanceDisclosure(control);
        break;
      case "toggle-boundary-full-truth": {
        event.preventDefault();
        if (boundaryDisclosureOpen) {
          boundaryFullTruthDisclosureOpen = true;
          syncState();
        }

        break;
      }
      case "close-boundary":
        closeBoundaryDisclosure();
        break;
      case "switch-inspector-tab": {
        const tab = control.dataset.m8aV411InspectorTab;
        if (
          M8A_V411_INSPECTOR_TABS.includes(tab as M8aV411InspectorTab)
        ) {
          activeInspectorTab = tab as M8aV411InspectorTab;
          detailsDisclosureOpen = true;
          boundaryDisclosureOpen = false;
          sourcesDisclosureOpen = false;
          boundaryFullTruthDisclosureOpen = false;
          syncState();
        }
        break;
      }
      case "open-evidence": {
        openInspectorDisclosure("evidence");
        break;
      }
      case "toggle-review-mode": {
        toggleReviewerMode();
        break;
      }
      case "export-f16-bounded-route-json": {
        event.preventDefault();
        exportF16BoundedRouteJson();
        break;
      }
      case "open-handover-rail": {
        if (control instanceof HTMLElement) {
          lastRailTriggerElement = control;
        }
        narrowRailDrawerOpen = true;
        syncState();
        const drawer = productUxRoot.querySelector<HTMLElement>(
          "[data-m8a-v411-handover-rail='true']"
        );
        if (drawer) {
          window.setTimeout(() => {
            const focusTarget =
              drawer.querySelector<HTMLElement>(
                "[data-m8a-v411-rail-main-chip='true']"
              ) ?? drawer;
            if (focusTarget instanceof HTMLElement) {
              if (!focusTarget.hasAttribute("tabindex")) {
                focusTarget.setAttribute("tabindex", "-1");
              }
              focusTarget.focus({ preventScroll: true });
            }
          }, 0);
        }
        break;
      }
      case "close-handover-rail": {
        narrowRailDrawerOpen = false;
        syncState();
        if (lastRailTriggerElement) {
          lastRailTriggerElement.focus({ preventScroll: true });
          lastRailTriggerElement = null;
        }
        break;
      }
    }
  };

  const resolveProductUxControl = (event: MouseEvent): HTMLElement | null => {
    if (!(event.target instanceof Element)) {
      return null;
    }

    const control = event.target.closest<HTMLElement>("[data-m8a-v47-action]");

    if (!control || !productUxRoot.contains(control)) {
      return null;
    }

    return control;
  };

  const handleProductUxMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    const control = resolveProductUxControl(event);

    if (!control) {
      return;
    }

    lastPointerActivatedControl = control;
    lastPointerActivatedAt = window.performance.now();
    activateProductUxControl(control, event);
    window.setTimeout(() => {
      if (!disposed) {
        syncState();
      }
      if (lastPointerActivatedControl === control) {
        lastPointerActivatedControl = null;
      }
    }, 0);
  };

  const handleProductUxClick = (event: MouseEvent): void => {
    const control = resolveProductUxControl(event);

    if (!control) {
      return;
    }

    if (
      lastPointerActivatedControl === control &&
      window.performance.now() - lastPointerActivatedAt < 500
    ) {
      event.preventDefault();
      lastPointerActivatedControl = null;
      return;
    }

    activateProductUxControl(control, event);
  };

  const handleProductUxChange = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement) || !productUxRoot.contains(target)) {
      return;
    }

    if (target.matches("[data-requirement-f10-policy-selector='true']")) {
      if (isM8aV4RequirementF10PolicyPresetId(target.value)) {
        setRequirementF10PolicyPreset(target.value);
      }
      return;
    }

    if (target.matches("[data-requirement-f11-rule-preset='true']")) {
      if (isM8aV4RequirementF11RulePresetId(target.value)) {
        setRequirementF11RulePreset(target.value);
      }
    }
  };

  const matchMediaSafe = (query: string): boolean => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };

  const isNarrowModalActive = (): boolean => {
    if (!detailsDisclosureOpen) {
      return false;
    }
    return matchMediaSafe("(max-width: 1023px)");
  };

  const collectFocusableModalTargets = (
    container: HTMLElement
  ): HTMLElement[] => {
    const candidates = container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
        "details > summary"
      ].join(", ")
    );
    return Array.from(candidates).filter((element) => {
      if (element.hasAttribute("disabled")) {
        return false;
      }
      if (element.getAttribute("aria-hidden") === "true") {
        return false;
      }
      if (element.hidden) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return false;
      }
      return true;
    });
  };

  const handleProductUxKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (detailsDisclosureOpen) {
        event.preventDefault();
        closeDetailsDisclosure();
        if (lastDetailsTriggerElement) {
          window.setTimeout(() => {
            if (lastDetailsTriggerElement) {
              lastDetailsTriggerElement.focus({ preventScroll: true });
              lastDetailsTriggerElement = null;
            }
          }, 0);
        }
        return;
      }
      if (narrowRailDrawerOpen) {
        event.preventDefault();
        narrowRailDrawerOpen = false;
        syncState();
        if (lastRailTriggerElement) {
          lastRailTriggerElement.focus({ preventScroll: true });
          lastRailTriggerElement = null;
        }
        return;
      }
    }

    if (event.key === "Tab" && isNarrowModalActive()) {
      const sheet = productUxRoot.querySelector<HTMLElement>(
        "aside[data-m8a-v411-inspector-concurrency]"
      );
      if (sheet) {
        const focusables = collectFocusableModalTargets(sheet);
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
          return;
        }
        if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
          return;
        }
        if (active && !sheet.contains(active)) {
          event.preventDefault();
          first.focus({ preventScroll: true });
          return;
        }
      }
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const control = target.closest<HTMLElement>("[data-m8a-v47-action]");

    if (
      !control ||
      !productUxRoot.contains(control) ||
      control instanceof HTMLButtonElement
    ) {
      return;
    }

    event.preventDefault();
    activateProductUxControl(control, event);
  };

  productUxRoot.addEventListener("mouseup", handleProductUxMouseUp);
  productUxRoot.addEventListener("click", handleProductUxClick);
  productUxRoot.addEventListener("change", handleProductUxChange);
  productUxRoot.addEventListener("keydown", handleProductUxKeyDown);
  const removeFinalHoldClockListener = viewer.clock.onTick.addEventListener(
    () => {
      completeFinalHoldIfElapsed();
    }
  );

  syncState();

  void viewer.dataSources.add(dataSource).then(() => {
    if (disposed || viewer.isDestroyed()) {
      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }
      dataSourceAttached = false;
      return;
    }

    dataSourceAttached = true;
    dataSource.show = true;
    syncState();
  }).catch(() => {
    if (!disposed) {
      dataSourceAttached = false;
      syncState();
    }
  });

  const unsubscribeReplayClock = replayClock.onTick((replayState) => {
    if (
      productLoopArmed &&
      !finalHoldActive &&
      resolveReplayWindowRatio(replayState) >= 1
    ) {
      startFinalHold();
      return;
    }

    syncState();
  });

  /**
   * Wave-2 selection re-anchor: rebuild the endpoint markers, ribbon
   * polyline, camera framing, and selected-pair satellite overlay from a
   * freshly resolved pair without disposing the controller. Touches the
   * minimum entity surface — endpoint entities, ribbon entity, and the
   * selected-pair overlay entities. Fixture-driven actors, relations,
   * link-flow segments, and the productUx HUD are left untouched.
   */
  function applySelectedPair(pair: V4ResolvedStationPair | null): void {
    if (disposed) {
      return;
    }
    const currentPairKey = sceneEndpointContext.selectedPair
      ? [
          sceneEndpointContext.selectedPair.stationA.id,
          sceneEndpointContext.selectedPair.stationB.id
        ].join("::")
      : null;
    const nextPairKey = pair
      ? [pair.stationA.id, pair.stationB.id].join("::")
      : null;
    if (currentPairKey === nextPairKey) {
      return;
    }
    // Remove the existing endpoint + ribbon + selected-pair overlay
    // entities. The selected-pair overlay tags its satellite entities with
    // `m8a-v4-selected-pair-*` entity ids; iterate over a snapshot because
    // removeById mutates the live list.
    if (endpointA) {
      dataSource.entities.removeById(`m8a-v4-endpoint-${endpointA.endpointId}`);
    }
    if (endpointB) {
      dataSource.entities.removeById(`m8a-v4-endpoint-${endpointB.endpointId}`);
    }
    dataSource.entities.removeById(
      "m8a-v4-operator-family-endpoint-context-ribbon"
    );
    const overlayEntityIds = dataSource.entities.values
      .map((entity) => entity.id)
      .filter((id) =>
        typeof id === "string" &&
        (id.startsWith("m8a-v4-selected-pair-satellite-") ||
          id.startsWith("m8a-v4-selected-pair-link-flow-") ||
          id.startsWith("m8a-v4-selected-pair-handover-cue-"))
      );
    for (const id of overlayEntityIds) {
      dataSource.entities.removeById(id);
    }

    // Rebuild the scene endpoint context from the new pair. When pair is
    // null, the runtime projection's fixture-driven endpoints take over,
    // matching the bootstrap-time fallback shape from buildSceneEndpointContext.
    if (pair) {
      configureSelectedPairReplayClock(viewer, replayClock);
      setFixtureDrivenEntitiesVisible(false);
      sceneEndpointContext = {
        endpoints: [
          createSelectedPairEndpointContext(pair.stationA, "endpoint-a"),
          createSelectedPairEndpointContext(pair.stationB, "endpoint-b")
        ],
        selectedPair: pair
      };
    } else {
      configureReplayClock(viewer, replayClock);
      setFixtureDrivenEntitiesVisible(true);
      sceneEndpointContext = {
        endpoints: M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.endpoints,
        selectedPair: null
      };
    }

    endpointA = sceneEndpointContext.endpoints.find(
      (endpoint) => endpoint.endpointRole === "endpoint-a"
    );
    endpointB = sceneEndpointContext.endpoints.find(
      (endpoint) => endpoint.endpointRole === "endpoint-b"
    );

    if (!endpointA || !endpointB) {
      return;
    }

    // Re-add the endpoint entities at the new positions.
    for (const endpoint of sceneEndpointContext.endpoints) {
      dataSource.entities.add(createEndpointEntityOptions(endpoint));
    }

    // Re-add the ribbon polyline at the new positions.
    dataSource.entities.add(
      createEndpointContextRibbonEntityOptions({
        endpointA,
        endpointB,
        selectedPairActive: sceneEndpointContext.selectedPair !== null
      })
    );

    latestCameraHint = null;

    // Reset the overlay debug state to `loading` while the async overlay
    // install re-runs; the onStateChange callback below resets it to
    // `ready`/`empty`/`error` as the projection completes.
    selectedPairOverlayState = createSelectedPairOverlayDebugState(
      sceneEndpointContext.selectedPair ? "loading" : "not-requested"
    );

    const selectedPairOverlayGeneration = ++selectedPairOverlayInstallGeneration;
    void installSelectedPairTleFirstSceneLayer({
      dataSource,
      endpointA,
      endpointB,
      modelUri,
      replayClock,
      selectedPair: sceneEndpointContext.selectedPair,
      viewer,
      onStateChange: (state) => {
        selectedPairOverlayState = state;
      },
      shouldSkip: () =>
        disposed ||
        selectedPairOverlayGeneration !== selectedPairOverlayInstallGeneration,
      applyCameraHint: (cameraHint) => {
        latestCameraHint = cameraHint;
        applySelectedPairCameraHint(viewer, sceneEndpointContext, cameraHint);
      }
    }).catch((error) => {
      selectedPairOverlayState = createSelectedPairOverlayDebugState("error", {
        errorMessage:
          error instanceof Error ? error.message : "unknown overlay error"
      });
    });

    applyV4Camera(viewer, sceneEndpointContext);
    viewer.scene.requestRender();
  }

  return {
    getState(): M8aV4GroundStationSceneState {
      completeFinalHoldIfElapsed();
      return cloneState(createState());
    },
    getLastF16RouteExport(): M8aV4RequirementF16RouteExportBundle | null {
      return latestF16ExportBundle
        ? JSON.parse(JSON.stringify(latestF16ExportBundle))
        : null;
    },
    exportF16RouteState(): M8aV4RequirementF16RouteExportBundle {
      return exportF16BoundedRouteJson();
    },
    subscribe(listener: (state: M8aV4GroundStationSceneState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play(): void {
      playProductReplay();
    },
    pause(): void {
      pauseProductReplay();
    },
    restart(): void {
      restartProductReplay();
    },
    setPlaybackMultiplier(multiplier: M8aV47ProductPlaybackMultiplier): void {
      setProductPlaybackMultiplier(multiplier);
    },
    setDebugPlaybackMultiplier(
      multiplier: typeof M8A_V47_DEBUG_TEST_MULTIPLIER
    ): void {
      setDebugTestPlaybackMultiplier(multiplier);
    },
    setSelectedPair(pair: V4ResolvedStationPair | null): void {
      applySelectedPair(pair);
    },
    dispose(): void {
      disposed = true;
      clearFinalHoldTimer();
      clearTransitionTimer();
      clearReviewAutoPauseTimer();
      activeTransitionEvent = null;
      refreshAfterTransitionTimeout = null;
      removeFinalHoldClockListener();
      unsubscribeReplayClock();
      listeners.clear();
      hoverPopoverController.dispose();
      visualTokenController.dispose();
      disposeM8aV411TransientSurfaces(productUxRoot);
      productUxRoot.removeEventListener("mouseup", handleProductUxMouseUp);
      productUxRoot.removeEventListener("click", handleProductUxClick);
      productUxRoot.removeEventListener("change", handleProductUxChange);
      productUxRoot.removeEventListener("keydown", handleProductUxKeyDown);
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
      hudRoot.remove();
      productUxRoot.remove();
      clearDocumentTelemetry(M8A_V4_TELEMETRY_KEYS);
      dataSourceAttached = false;
      dataSource.show = false;
      dataSource.entities.removeAll();

      if (!viewer.isDestroyed() && viewer.dataSources.contains(dataSource)) {
        viewer.dataSources.remove(dataSource);
      }

      if (!viewer.isDestroyed()) {
        viewer.scene.requestRender();
      }
    }
  };
}
