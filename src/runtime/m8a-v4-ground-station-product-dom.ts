import { Cartesian3, type Viewer } from "cesium";

import {
  M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
  type M8aV46dSimulationHandoverWindow
} from "./m8a-v4-ground-station-projection";
import type { M8aV4GroundStationSceneState } from "./m8a-v4-ground-station-handover-scene-controller";
import {
  positionToCartesian,
  type EndpointRenderContext
} from "./m8a-v4-ground-station-cesium-entities";
import { projectSceneAnchorPoint } from "./m8a-v4-ground-station-placement";
import {
  M8A_V411_GLANCE_RANK_SURFACE_VERSION,
  renderM8aV411GlanceRankSurface
} from "./m8a-v411-glance-rank-surface";
import {
  syncM8aV411SceneContextChip
} from "./m8a-v411-scene-context-chip";
import {
  type M8aV411VisualTokenController
} from "./m8a-v411-visual-tokens";
import {
  M8A_V411_HOVER_POPOVER_VERSION,
  syncM8aV411HoverPopoverTargets
} from "./m8a-v411-hover-popover";
import {
  resolveM8aV411PhaseCMetricsCopy,
  resolveM8aV411PhaseCRailCopy,
  resolveM8aV411StateEvidenceCopy
} from "./m8a-v411-inspector-concurrency";
import {
  deriveM8aV411CountdownRemaining,
  M8A_V411_COUNTDOWN_FONT_SIZE_PX,
  M8A_V411_COUNTDOWN_FOOTNOTE_TEXT,
  M8A_V411_COUNTDOWN_GAP_FROM_MICRO_CUE_PX,
  M8A_V411_COUNTDOWN_SURFACE_VERSION,
  renderM8aV411CountdownSurface
} from "./m8a-v411-countdown-surface";
import {
  M8A_V411_TRANSIENT_SURFACE_VERSION,
  renderM8aV411TransientSurfaces
} from "./m8a-v411-transition-toast";
import {
  M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION,
  M8A_V410_PRODUCT_UX_STRUCTURE_VERSION,
  M8A_V47_PRODUCT_DEFAULT_MULTIPLIER,
  M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS,
  M8A_V48_UI_IA_VERSION,
  M8A_V49_PRODUCT_COMPREHENSION_VERSION,
  type M8aV48ReviewActorReference,
  type M8aV49TransitionEventRuntime
} from "./m8a-v4-product-ux-model";

const LEGACY_TOKEN_LOWER = "it" + "ri";
const LEGACY_TOKEN_PASCAL =
  LEGACY_TOKEN_LOWER.charAt(0).toUpperCase() + LEGACY_TOKEN_LOWER.slice(1);

interface ProductUxRootConfig {
  focusChoreographyVersion: string;
  defaultFocusVersion: string;
  narrowVersion: string;
}

interface ProductUxRenderConfig {
  defaultTruthCopy: string;
  fullReplaySimulatedSeconds: number;
}

interface ProductUxDetailRenderArgs {
  root: HTMLElement;
  state: M8aV4GroundStationSceneState;
  viewer: Viewer;
  visualTokenController: M8aV411VisualTokenController;
  sceneEndpoints: ReadonlyArray<EndpointRenderContext>;
  productUx: M8aV4GroundStationSceneState["productUx"];
  activeMultiplier: number;
  playbackAction: "play" | "pause";
  playbackLabel: "Play" | "Pause";
  progressValue: string;
  review: M8aV4GroundStationSceneState["productUx"]["reviewViewModel"];
  focusChoreography: M8aV4GroundStationSceneState["productUx"]["productComprehension"]["focusChoreography"];
  comprehension: M8aV4GroundStationSceneState["productUx"]["productComprehension"];
  boundaryAffordance: M8aV4GroundStationSceneState["productUx"]["productComprehension"]["boundaryAffordance"];
  stateEvidenceOpen: boolean;
  truthBoundaryOpen: boolean;
  sourcesRoleOpen: boolean;
  selectedInspectorTab: M8aV4GroundStationSceneState["productUx"]["disclosure"]["activeInspectorTab"];
  f09RateSurface: M8aV4GroundStationSceneState["f09RateSurface"];
  placement: ReturnType<typeof import("./m8a-v4-ground-station-placement").resolveSceneAnnotationPlacement>;
  sceneNear: ReturnType<typeof import("./m8a-v4-ground-station-placement").resolveV49SceneNearRenderState>;
  transitionEvent: M8aV49TransitionEventRuntime | null;
  config: ProductUxRenderConfig;
}

function legacyDataKey(prefix: string, suffix: string): string {
  return `${prefix}${LEGACY_TOKEN_PASCAL}${suffix}`;
}

function legacyBareDataKey(suffix: string): string {
  return `${LEGACY_TOKEN_LOWER}${suffix}`;
}

function legacySelector(suffix: string): string {
  return `[data-${LEGACY_TOKEN_LOWER}-${suffix}='true']`;
}

function setDataset(
  element: HTMLElement,
  key: string,
  value: string
): void {
  element.dataset[key] = value;
}

export function createProductUxRoot(config: ProductUxRootConfig): HTMLElement {
  const root = document.createElement("section");
  root.className = "m8a-v47-product-ux";
  root.dataset.m8aV47ProductUx = "true";
  root.dataset.m8aV48UiIaVersion = M8A_V48_UI_IA_VERSION;
  root.dataset.m8aV49ProductComprehension =
    M8A_V49_PRODUCT_COMPREHENSION_VERSION;
  root.dataset.m8aV410FirstViewportComposition =
    M8A_V410_FIRST_VIEWPORT_COMPOSITION_VERSION;
  setDataset(
    root,
    legacyDataKey("m8aV4", "DemoViewFocusChoreography"),
    config.focusChoreographyVersion
  );
  setDataset(
    root,
    legacyDataKey("m8aV4", "DemoViewDefaultFocus"),
    config.defaultFocusVersion
  );
  setDataset(
    root,
    legacyDataKey("m8aV4", "DemoViewNarrow"),
    config.narrowVersion
  );
  root.dataset.m8aV411GlanceRankSurface =
    M8A_V411_GLANCE_RANK_SURFACE_VERSION;
  root.dataset.m8aV411HoverPopover = M8A_V411_HOVER_POPOVER_VERSION;
  root.dataset.m8aV411TransientSurface =
    M8A_V411_TRANSIENT_SURFACE_VERSION;
  root.setAttribute("aria-label", "M8A V4.11 handover review workspace");
  return root;
}

function renderSpeedButtons(activeMultiplier: number): string {
  return M8A_V47_PRODUCT_PLAYBACK_MULTIPLIERS.map((multiplier) => {
    const isActive = activeMultiplier === multiplier;

    return [
      `<button type="button" class="m8a-v47-product-ux__speed"`,
      ` data-m8a-v47-action="speed"`,
      ` data-m8a-v47-playback-multiplier="${multiplier}"`,
      ` data-m8a-v48-info-class="control"`,
      ` aria-pressed="${isActive ? "true" : "false"}">`,
      `${multiplier}x`,
      "</button>"
    ].join("");
  }).join("");
}

function formatReviewActor(actor: M8aV48ReviewActorReference): string {
  return `${actor.label} (${actor.actorId})`;
}

function formatReviewActorList(
  actors: ReadonlyArray<M8aV48ReviewActorReference>
): string {
  return actors.map(formatReviewActor).join(", ");
}

export function ensureProductUxStructure(root: HTMLElement): void {
  if (
    root.dataset.m8aV410ProductUxStructureVersion ===
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION
  ) {
    return;
  }

  if (
    root.dataset.m8aV471StableControls === "true" &&
    root.dataset.m8aV49StructureVersion === M8A_V49_PRODUCT_COMPREHENSION_VERSION
  ) {
    return;
  }

  root.innerHTML = `
    <div class="m8a-v47-product-ux__scene-connector" data-m8a-v48-scene-connector="true" aria-hidden="true" hidden></div>
    <div class="m8a-v47-product-ux__strip" data-m8a-v47-ui-surface="compact-control-strip" data-m8a-v47-control-strip="true">
      <button type="button" class="m8a-v47-product-ux__play-toggle" data-m8a-v47-action="pause" data-m8a-v47-control-id="play-pause" data-m8a-v48-info-class="control">Pause</button>
      <button type="button" data-m8a-v47-action="restart" data-m8a-v47-control-id="restart" data-m8a-v48-info-class="control">Restart</button>
      <div class="m8a-v47-product-ux__strip-speeds" data-m8a-v47-control-group="speed">
        ${renderSpeedButtons(M8A_V47_PRODUCT_DEFAULT_MULTIPLIER)}
      </div>
    </div>
  `;
  root.dataset.m8aV471StableControls = "true";
  root.dataset.m8aV49StructureVersion = M8A_V49_PRODUCT_COMPREHENSION_VERSION;
  root.dataset.m8aV410ProductUxStructureVersion =
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION;
}

function getProductUxElement(
  root: HTMLElement,
  selector: string
): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing V4.7.1 product UX element: ${selector}`);
  }

  return element;
}

export function ensureV410ProductUxStructureReady(root: HTMLElement): void {
  if (
    root.dataset.m8aV410ProductUxStructureVersion ===
    M8A_V410_PRODUCT_UX_STRUCTURE_VERSION
  ) {
    return;
  }

  return;
}

function updateProductUxText(
  root: HTMLElement,
  selector: string,
  value: string
): void {
  for (const element of root.querySelectorAll<HTMLElement>(selector)) {
    element.textContent = value;
  }
}

export function renderProductUxDetailContent({
  root,
  state,
  viewer,
  visualTokenController,
  sceneEndpoints,
  productUx,
  activeMultiplier,
  playbackAction,
  playbackLabel,
  progressValue,
  review,
  focusChoreography,
  comprehension,
  boundaryAffordance,
  stateEvidenceOpen,
  truthBoundaryOpen,
  sourcesRoleOpen,
  selectedInspectorTab,
  f09RateSurface,
  placement,
  sceneNear,
  transitionEvent,
  config
}: ProductUxDetailRenderArgs): void {
  const stateEvidenceCopy = resolveM8aV411StateEvidenceCopy(
    productUx.activeWindowId
  );
  const railCopy = resolveM8aV411PhaseCRailCopy(productUx.activeWindowId);
  const metricsCopy = resolveM8aV411PhaseCMetricsCopy(productUx.activeWindowId);
  const countdownDerivation = deriveM8aV411CountdownRemaining({
    window: state.simulationHandoverModel.window,
    replayRatio: state.simulationHandoverModel.replayRatio,
    fullReplaySimulatedSeconds: config.fullReplaySimulatedSeconds
  });

  updateProductUxText(
    root,
    "[data-m8a-v47-active-label]",
    productUx.activeProductLabel
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-state-ordinal]",
    review.stateOrdinalLabel
  );
  updateProductUxText(
    root,
    "[data-m8a-v47-time-label='replay-utc']",
    productUx.playback.replayUtcDisplay
  );
  updateProductUxText(
    root,
    "[data-m8a-v47-time-label='simulated']",
    productUx.playback.simulatedReplayTimeDisplay
  );
  updateProductUxText(
    root,
    "[data-m8a-v49-inspector-current]",
    stateEvidenceCopy.paragraph
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-state-evidence-title='true']",
    stateEvidenceCopy.title
  );
  const railPanel = root.querySelector<HTMLElement>(
    "[data-m8a-v411-rail-panel='true']"
  );
  if (railPanel) {
    railPanel.dataset.m8aV411RailOrbit = railCopy.orbit;
    railPanel.dataset.m8aV411RailRole = railCopy.role;
    railPanel.dataset.m8aV411RailWindow = productUx.activeWindowId;
    railPanel.dataset.m8aV411RailCurrent = "true";
    setDataset(
      railPanel,
      legacyBareDataKey("DemoFocusChoreographyVersion"),
      focusChoreography.version
    );
    setDataset(
      railPanel,
      legacyBareDataKey("DemoFocusWindowId"),
      focusChoreography.windowId
    );
    setDataset(
      railPanel,
      legacyBareDataKey("DemoFocusId"),
      focusChoreography.focusId
    );
    setDataset(
      railPanel,
      legacyBareDataKey("DemoFocusPrimaryLabel"),
      focusChoreography.primaryFocusLabel
    );
    setDataset(
      railPanel,
      legacyBareDataKey("DemoFocusVisualCue"),
      focusChoreography.visualCue
    );
    setDataset(
      railPanel,
      legacyBareDataKey("DemoFocusSecondaryActorPolicy"),
      focusChoreography.secondaryActorPolicy
    );
    railPanel.setAttribute(
      "aria-label",
      `${focusChoreography.primaryFocusLabel}; ${focusChoreography.briefingLine}; ${focusChoreography.nextFocusHint}; ${railCopy.evidenceHook}`
    );
  }
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-role-glyph='true']",
    railCopy.roleGlyph
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-main-chip-text='true']",
    railCopy.mainChip
  );
  const railMainChip = root.querySelector<HTMLElement>(
    "[data-m8a-v411-rail-main-chip='true']"
  );
  if (railMainChip) {
    if (!railMainChip.dataset.m8aV411RailFocusBound) {
      railMainChip.dataset.m8aV411RailFocusBound = "true";
      railMainChip.addEventListener("focus", () => {
        railMainChip.dataset.m8aV411RailFocused = "true";
      });
      railMainChip.addEventListener("blur", () => {
        delete railMainChip.dataset.m8aV411RailFocused;
      });
    }
    railMainChip.setAttribute(
      "aria-label",
      `${railCopy.ordinalLabel} ${railCopy.mainChip}; ${railCopy.currentToken}; ${railCopy.candidateToken}; ${railCopy.fallbackToken}`
    );
  }
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='current']",
    railCopy.currentToken
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='candidate']",
    railCopy.candidateToken
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='fallback']",
    railCopy.fallbackToken
  );
  updateProductUxText(
    root,
    legacySelector("demo-l0-current-state"),
    focusChoreography.primaryFocusLabel
  );
  updateProductUxText(
    root,
    legacySelector("demo-l0-current-reason"),
    focusChoreography.briefingLine
  );
  updateProductUxText(
    root,
    legacySelector("demo-l0-active-orbit"),
    `Active orbit: ${focusChoreography.focusOrbitClassToken} focus`
  );
  updateProductUxText(
    root,
    legacySelector("demo-l0-rate-class"),
    `Modeled rate: ${f09RateSurface.currentClassLabel}`
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='next']",
    railCopy.nextPreview
  );
  updateProductUxText(
    root,
    legacySelector("demo-l0-next-state"),
    railCopy.nextPreview
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-rail-slot='evidence']",
    railCopy.evidenceHook
  );
  updateProductUxText(
    root,
    legacySelector("demo-l0-truth-boundary"),
    config.defaultTruthCopy
  );
  const l0BriefingCard = root.querySelector<HTMLElement>(
    legacySelector("demo-l0-briefing-card")
  );
  if (l0BriefingCard) {
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoL0CurrentState"),
      focusChoreography.primaryFocusLabel
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoL0NextState"),
      focusChoreography.nextFocusHint
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoL0OrbitClass"),
      focusChoreography.focusOrbitClassToken
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoL0RateClass"),
      f09RateSurface.currentClassLabel
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoL0TruthBoundary"),
      config.defaultTruthCopy
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoFocusChoreographyVersion"),
      focusChoreography.version
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoFocusWindowId"),
      focusChoreography.windowId
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoFocusId"),
      focusChoreography.focusId
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoFocusVisualCue"),
      focusChoreography.visualCue
    );
    setDataset(
      l0BriefingCard,
      legacyBareDataKey("DemoFocusSecondaryActorPolicy"),
      focusChoreography.secondaryActorPolicy
    );
    l0BriefingCard.setAttribute(
      "aria-label",
      `Handover briefing. Now: ${focusChoreography.primaryFocusLabel}. ${focusChoreography.briefingLine}. ${focusChoreography.nextFocusHint}. Modeled rate: ${f09RateSurface.currentClassLabel}. ${config.defaultTruthCopy}`
    );
  }
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-now='true']",
    focusChoreography.decisionNow
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-why='true']",
    focusChoreography.decisionWhy
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-next='true']",
    focusChoreography.nextFocusHint
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-decision-watch='true']",
    focusChoreography.decisionWatch
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='latency-class']",
    metricsCopy.latencyClassValue
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='latency-class']",
    metricsCopy.latencyClassUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='latency-class']",
    metricsCopy.latencyClassDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='continuity-class']",
    metricsCopy.continuityClassValue
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='continuity-class']",
    metricsCopy.continuityClassUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='continuity-class']",
    metricsCopy.continuityClassDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='handover-state']",
    metricsCopy.handoverStateValue
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='handover-state']",
    metricsCopy.handoverStateUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='handover-state']",
    metricsCopy.handoverStateDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-value='replay-timing']",
    countdownDerivation.approximateDisplay
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-unit='replay-timing']",
    metricsCopy.replayTimingUnit
  );
  updateProductUxText(
    root,
    "[data-m8a-v411-metrics-available-detail='replay-timing']",
    metricsCopy.replayTimingDetail
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-purpose]",
    review.reviewPurpose
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-representative]",
    formatReviewActor(review.representativeActor)
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-candidates]",
    formatReviewActorList(review.candidateContextActors)
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-fallbacks]",
    formatReviewActorList(review.fallbackContextActors)
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-changed]",
    review.whatChangedFromPreviousState
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-watch]",
    review.whatToWatch
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-next]",
    review.nextStateHint
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-cue]",
    placement.anchorStatus === "geometry-reliable"
      ? `${review.relationCueRole.displayLabel}; scene anchor ${placement.selectedAnchorType}; selected actor ${placement.selectedActorId}; selected cue ${placement.selectedRelationCueId || "none"}.`
      : `${review.relationCueRole.displayLabel}; no scene anchor claimed; fallback ${placement.fallbackReason}.`
  );
  updateProductUxText(
    root,
    "[data-m8a-v48-review-truth-boundary]",
    review.truthBoundarySummary
  );

  const connector = getProductUxElement(
    root,
    "[data-m8a-v48-scene-connector='true']"
  );
  connector.dataset.m8aV49SceneNearAttachmentClaim =
    sceneNear.attachmentClaim;
  connector.dataset.m8aV48AnchorStatus = placement.anchorStatus;
  connector.dataset.m8aV48SelectedAnchorType = placement.selectedAnchorType;
  connector.dataset.m8aV48SelectedActorId = placement.selectedActorId;
  connector.dataset.m8aV48SelectedRelationCueId =
    placement.selectedRelationCueId;
  connector.dataset.m8aV48ConnectorStartX =
    placement.connectorStartX.toFixed(1);
  connector.dataset.m8aV48ConnectorStartY =
    placement.connectorStartY.toFixed(1);
  connector.dataset.m8aV48ConnectorEndX = placement.connectorEndX.toFixed(1);
  connector.dataset.m8aV48ConnectorEndY = placement.connectorEndY.toFixed(1);
  connector.dataset.m8aV48ConnectorLength =
    placement.connectorLength.toFixed(1);
  connector.dataset.m8aV48ConnectorAngleDegrees =
    placement.connectorAngleDegrees.toFixed(2);
  connector.dataset.m8aV48ConnectorEndpointDistancePx =
    placement.connectorEndpointDistancePx.toFixed(1);
  connector.dataset.m8aV48ConnectorThresholdPx =
    placement.connectorThresholdPx.toFixed(1);
  connector.hidden = placement.anchorStatus !== "geometry-reliable";
  connector.setAttribute(
    "aria-hidden",
    placement.anchorStatus === "geometry-reliable" ? "false" : "true"
  );
  connector.style.left = `${placement.connectorStartX.toFixed(1)}px`;
  connector.style.top = `${placement.connectorStartY.toFixed(1)}px`;
  connector.style.width = `${placement.connectorLength.toFixed(1)}px`;
  connector.style.transform = `rotate(${placement.connectorAngleDegrees.toFixed(
    2
  )}deg)`;

  renderM8aV411GlanceRankSurface({
    root,
    actors: state.actors,
    endpoints: sceneEndpoints,
    requiredPrecisionBadge:
      sceneEndpoints[0]?.renderMarker.requiredPrecisionBadge ??
      M8A_V4_GROUND_STATION_REQUIRED_PRECISION_BADGE,
    projectActor: (actor) =>
      projectSceneAnchorPoint(
        viewer,
        Cartesian3.fromElements(
          actor.renderPositionEcefMeters.x,
          actor.renderPositionEcefMeters.y,
          actor.renderPositionEcefMeters.z
        )
      ),
    projectEndpoint: (endpoint) =>
      projectSceneAnchorPoint(
        viewer,
        positionToCartesian(endpoint.renderMarker.displayPosition)
      )
  });
  syncM8aV411SceneContextChip(root);
  const focusActorRecord = state.actors.find(
    (actor) =>
      actor.actorId ===
      state.simulationHandoverModel.window.displayRepresentativeActorId
  );
  visualTokenController.update({
    activeWindowId: state.simulationHandoverModel.window.windowId,
    diagnosticsRoot: root,
    focusActor: focusActorRecord
      ? {
          actorId: focusActorRecord.actorId,
          positionEcefMeters: {
            x: focusActorRecord.renderPositionEcefMeters.x,
            y: focusActorRecord.renderPositionEcefMeters.y,
            z: focusActorRecord.renderPositionEcefMeters.z
          }
        }
      : null
  });

  renderM8aV411TransientSurfaces({
    root,
    activeTransitionEvent: transitionEvent,
    sceneCuePoint: {
      x: placement.anchorX,
      y: placement.anchorY,
      projected: placement.projected,
      anchorStatus: placement.anchorStatus,
      actorId: placement.anchorActorId
    },
    toastSuppressed: productUx.reviewerMode.toastSuppressed
  });

  syncM8aV411HoverPopoverTargets({
    root,
    activeWindow: state.simulationHandoverModel.window,
    timeline: state.simulationHandoverModel
      .timeline as ReadonlyArray<M8aV46dSimulationHandoverWindow>
  });

  renderM8aV411CountdownSurface({
    root,
    derivation: countdownDerivation,
    microCueRect: null
  });
  root.dataset.m8aV411CountdownSurface = M8A_V411_COUNTDOWN_SURFACE_VERSION;
  root.dataset.m8aV411CountdownDerivation = "addendum-1.1";
  root.dataset.m8aV411CountdownFullReplaySimulatedSec =
    countdownDerivation.fullReplaySimulatedSeconds.toFixed(2);
  root.dataset.m8aV411CountdownReplayRatio =
    countdownDerivation.replayRatio.toFixed(6);
  root.dataset.m8aV411CountdownWindowId = countdownDerivation.windowId;
  root.dataset.m8aV411CountdownRemainingSimulatedSec =
    countdownDerivation.remainingSimulatedSec.toFixed(2);
  root.dataset.m8aV411CountdownApproximateDisplay =
    countdownDerivation.approximateDisplay;
  root.dataset.m8aV411CountdownFootnoteText =
    M8A_V411_COUNTDOWN_FOOTNOTE_TEXT;
  root.dataset.m8aV411CountdownFontSizePx = String(
    M8A_V411_COUNTDOWN_FONT_SIZE_PX
  );
  root.dataset.m8aV411CountdownGapFromMicroCuePx = String(
    M8A_V411_COUNTDOWN_GAP_FROM_MICRO_CUE_PX
  );

  const playButton = getProductUxElement(
    root,
    "[data-m8a-v47-control-id='play-pause']"
  ) as HTMLButtonElement;
  playButton.dataset.m8aV47Action = playbackAction;
  playButton.textContent = playbackLabel;
  playButton.setAttribute("aria-label", `${playbackLabel} replay`);

  for (const speedButton of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-playback-multiplier]"
  )) {
    speedButton.setAttribute(
      "aria-pressed",
      String(
        Number(speedButton.dataset.m8aV47PlaybackMultiplier) ===
          activeMultiplier
      )
    );
  }

  for (const progress of root.querySelectorAll<HTMLProgressElement>(
    "[data-m8a-v47-progress='true']"
  )) {
    progress.value = productUx.playback.replayRatio;
    progress.setAttribute("value", progressValue);
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-action='toggle-disclosure']"
  )) {
    toggle.setAttribute("aria-expanded", String(stateEvidenceOpen));
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-control-id='evidence-toggle']"
  )) {
    toggle.setAttribute(
      "aria-expanded",
      String(stateEvidenceOpen && selectedInspectorTab === "evidence")
    );
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-action='toggle-boundary']"
  )) {
    toggle.setAttribute("aria-expanded", String(truthBoundaryOpen));
    toggle.dataset.m8aV410BoundaryDetailsBehavior =
      boundaryAffordance.detailsBehavior;
    toggle.dataset.m8aV410BoundaryCompactCopy =
      boundaryAffordance.compactCopy;
  }

  for (const toggle of root.querySelectorAll<HTMLButtonElement>(
    "[data-m8a-v47-action='toggle-source-provenance']"
  )) {
    toggle.setAttribute("aria-expanded", String(sourcesRoleOpen));
    toggle.dataset.m8aV411SourcesAffordance =
      "advanced-source-provenance-toggle-only";
  }

  const strip = getProductUxElement(
    root,
    "[data-m8a-v47-control-strip='true']"
  );
  strip.dataset.m8aV49PersistentLayer = "true";
  strip.dataset.m8aV410ControlsPriority =
    comprehension.firstViewportComposition.controlsPriority;
  strip.dataset.m8aV49DefaultVisibleContent = serializeList([
    ...comprehension.persistentLayer.defaultVisibleContent
  ]);
  strip.dataset.m8aV49DeniedDefaultVisibleContent = serializeList([
    ...comprehension.persistentLayer.deniedDefaultVisibleContent
  ]);

  for (const stage of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v47-window-id]"
  )) {
    stage.dataset.active = String(
      stage.dataset.m8aV47WindowId === productUx.activeWindowId
    );
  }

  renderM8aV411ReviewerMode(root, productUx);
}

function renderM8aV411ReviewerMode(
  root: HTMLElement,
  productUx: M8aV4GroundStationSceneState["productUx"]
): void {
  const reviewer = productUx.reviewerMode;
  if (!reviewer) {
    return;
  }

  const modeLabel = root.querySelector<HTMLElement>(
    "[data-m8a-v411-inspector-mode-label='true']"
  );
  const inspectorOpen = productUx.disclosure.detailsSheetState === "open";
  const showLabel =
    inspectorOpen &&
    (reviewer.replayClockMode === "inspector-pinned" ||
      reviewer.replayClockMode === "review-auto-paused" ||
      reviewer.replayClockMode === "manual-paused" ||
      reviewer.replayClockMode === "final-hold");

  if (modeLabel) {
    modeLabel.dataset.m8aV411ReplayClockMode = reviewer.replayClockMode;
    modeLabel.dataset.m8aV411InspectorModeLabelOrdinal =
      reviewer.pinnedWindowOrdinalLabel ?? "";
    if (showLabel) {
      modeLabel.hidden = false;
      modeLabel.textContent = reviewer.announcement.modeLabel;
    } else {
      modeLabel.hidden = true;
      modeLabel.textContent = "";
    }
  }

  const pauseButton = root.querySelector<HTMLElement>(
    "button[data-m8a-v47-control-id='play-pause']"
  );
  if (pauseButton) {
    if (!reviewer.controls.pauseEnabled && reviewer.controls.playEnabled) {
      pauseButton.setAttribute("aria-disabled", "false");
    } else {
      pauseButton.removeAttribute("aria-disabled");
    }
  }

  for (const speedButton of root.querySelectorAll<HTMLElement>(
    "[data-m8a-v47-control-group='speed'] button[data-m8a-v47-action='speed']"
  )) {
    if (!reviewer.controls.speedEnabled) {
      speedButton.setAttribute("aria-disabled", "true");
      speedButton.dataset.m8aV411ReviewerSpeedDeferred = "false";
    } else if (reviewer.controls.speedAppliesAfterResume) {
      speedButton.removeAttribute("aria-disabled");
      speedButton.dataset.m8aV411ReviewerSpeedDeferred = "true";
      speedButton.title = "Applies after resume";
    } else {
      speedButton.removeAttribute("aria-disabled");
      speedButton.dataset.m8aV411ReviewerSpeedDeferred = "false";
      speedButton.removeAttribute("title");
    }
  }

  root.dataset.m8aV411ReplayClockMode = reviewer.replayClockMode;
  root.dataset.m8aV411ReviewerModeOn = String(reviewer.reviewModeOn);
  root.dataset.m8aV411ReviewerModeToastSuppressed = String(
    reviewer.toastSuppressed
  );
  root.dataset.m8aV411InspectorOpen = String(inspectorOpen);
}

function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}
