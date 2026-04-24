import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type {
  FirstIntakeNearbySecondEndpointExpressionController
} from "./first-intake-nearby-second-endpoint-expression-controller";
import type {
  FirstIntakeNearbySecondEndpointInfoController
} from "./first-intake-nearby-second-endpoint-info-controller";
import type {
  FirstIntakeReplayTimeAuthorityController
} from "./first-intake-replay-time-authority-controller";

const FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_TELEMETRY_KEYS = [
  "firstIntakeSatcomContextOverlayState",
  "firstIntakeSatcomContextOverlayScenarioId",
  "firstIntakeSatcomContextOverlaySurface",
  "firstIntakeSatcomContextOverlayPlacement",
  "firstIntakeSatcomContextOverlayVisible",
  "firstIntakeSatcomContextOverlayVisibleFacts",
  "firstIntakeSatcomContextOverlayInspectableFacts",
  "firstIntakeSatcomContextOverlayRequiredNonClaims",
  "firstIntakeSatcomContextOverlayReplayTimeUtc",
  "firstIntakeSatcomContextOverlayReplayClockProofSeam",
  "firstIntakeSatcomContextOverlayTimeStateSource",
  "firstIntakeSatcomContextOverlayUsesSharedReplayClock",
  "firstIntakeSatcomContextOverlaySuppressedPanelRevival",
  "firstIntakeSatcomContextOverlayAvoidsTimeline",
  "firstIntakeSatcomContextOverlayAvoidsCinematicAffordance",
  "firstIntakeSatcomContextOverlayRawPackageSideReadOwnership",
  "firstIntakeSatcomContextOverlayProofSeam"
] as const;

export const FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_STATE =
  "active-addressed-route-satcom-context";
export const FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_SURFACE =
  "compact-corner-satcom-context-overlay";
export const FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeSatcomContextOverlay";

const OVERLAY_PLACEMENT = "top-left-compact-above-scene";
const TIME_STATE_SOURCE = "firstIntakeReplayTimeAuthority.getState()";
const SUPPRESSED_PANEL_REVIVAL = "false";

const ALLOWED_FACTS = [
  "OneWeb LEO + Intelsat GEO aviation",
  "service-layer switching",
  "not native RF handover",
  "presentation-only replay",
  "YKA fixed endpoint",
  "facility-known",
  "historical corridor, not live measurement",
  "relation cue is a scene aid, not a satellite path"
] as const;

const REQUIRED_NON_CLAIMS = [
  "not measurement truth",
  "not active gateway assignment",
  "not pair-specific GEO teleport truth",
  "not RF beam truth",
  "not active onboard service proof for the replayed flight",
  "not native RF handover truth"
] as const;

const VISIBLE_FACTS = [
  "OneWeb LEO + Intelsat GEO aviation",
  "service-layer switching",
  "not native RF handover",
  "presentation-only replay",
  "YKA fixed endpoint",
  "facility-known"
] as const;

const INSPECTABLE_FACTS = [
  "historical corridor, not live measurement",
  "relation cue is a scene aid, not a satellite path"
] as const;

type AllowedFact = (typeof ALLOWED_FACTS)[number];
type RequiredNonClaim = (typeof REQUIRED_NON_CLAIMS)[number];

export interface FirstIntakeSatcomContextOverlayState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  overlayState: typeof FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_STATE;
  overlaySurface: typeof FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_SURFACE;
  placement: typeof OVERLAY_PLACEMENT;
  visible: boolean;
  allowedFacts: ReadonlyArray<AllowedFact>;
  visibleFacts: ReadonlyArray<AllowedFact>;
  inspectableFacts: ReadonlyArray<AllowedFact>;
  requiredNonClaims: ReadonlyArray<RequiredNonClaim>;
  replayClockBinding: {
    replayTimeUtc: string;
    replayClockProofSeam: string;
    timeStateSource: typeof TIME_STATE_SOURCE;
    usesSharedReplayClock: true;
    separateTimer: false;
  };
  layout: {
    avoidsCesiumTimeline: true;
    avoidsTopRightCinematicAffordance: true;
    centerScreenModal: false;
    broadDashboard: false;
    suppressedPanelRevival: false;
  };
  proofSeam: typeof FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_PROOF_SEAM;
  sourceLineage: {
    nearbySecondEndpointInfoRead:
      "nearbySecondEndpointInfoController.getState()";
    expressionRead:
      "nearbySecondEndpointExpressionController.getState().relationCue";
    replayTimeAuthorityRead:
      "firstIntakeReplayTimeAuthorityController.getState()";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeSatcomContextOverlayController {
  getState(): FirstIntakeSatcomContextOverlayState;
  subscribe(
    listener: (state: FirstIntakeSatcomContextOverlayState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeSatcomContextOverlayControllerOptions {
  hudFrame: HTMLElement;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  nearbySecondEndpointInfoController:
    FirstIntakeNearbySecondEndpointInfoController;
  nearbySecondEndpointExpressionController:
    FirstIntakeNearbySecondEndpointExpressionController;
  replayTimeAuthorityController: FirstIntakeReplayTimeAuthorityController;
}

function serializeList(values: ReadonlyArray<string>): string {
  return values.join("|");
}

function cloneState(
  state: FirstIntakeSatcomContextOverlayState
): FirstIntakeSatcomContextOverlayState {
  return {
    ...state,
    allowedFacts: [...state.allowedFacts],
    visibleFacts: [...state.visibleFacts],
    inspectableFacts: [...state.inspectableFacts],
    requiredNonClaims: [...state.requiredNonClaims],
    replayClockBinding: {
      ...state.replayClockBinding
    },
    layout: {
      ...state.layout
    },
    sourceLineage: {
      ...state.sourceLineage
    }
  };
}

function notifyListeners(
  listeners: ReadonlySet<
    (state: FirstIntakeSatcomContextOverlayState) => void
  >,
  state: FirstIntakeSatcomContextOverlayState
): void {
  for (const listener of listeners) {
    listener(cloneState(state));
  }
}

function assertStateFacts(
  state: Pick<
    FirstIntakeSatcomContextOverlayState,
    "allowedFacts" | "visibleFacts" | "inspectableFacts" | "requiredNonClaims"
  >
): void {
  const allowed = new Set<AllowedFact>(ALLOWED_FACTS);

  for (const fact of [...state.visibleFacts, ...state.inspectableFacts]) {
    if (!allowed.has(fact)) {
      throw new Error(`R1V.5 overlay fact is outside the allowed set: ${fact}`);
    }
  }

  if (
    state.allowedFacts.length !== ALLOWED_FACTS.length ||
    state.requiredNonClaims.length !== REQUIRED_NON_CLAIMS.length
  ) {
    throw new Error("R1V.5 overlay fact/non-claim set drifted.");
  }
}

function createOverlayRoot(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "r1v-satcom-context-overlay";
  root.dataset.r1vSatcomContextOverlay = "true";
  root.setAttribute("aria-label", "Satcom context overlay");
  return root;
}

function syncTelemetry(state: FirstIntakeSatcomContextOverlayState): void {
  syncDocumentTelemetry({
    firstIntakeSatcomContextOverlayState: state.overlayState,
    firstIntakeSatcomContextOverlayScenarioId: state.scenarioId,
    firstIntakeSatcomContextOverlaySurface: state.overlaySurface,
    firstIntakeSatcomContextOverlayPlacement: state.placement,
    firstIntakeSatcomContextOverlayVisible: state.visible ? "true" : "false",
    firstIntakeSatcomContextOverlayVisibleFacts: serializeList(
      state.visibleFacts
    ),
    firstIntakeSatcomContextOverlayInspectableFacts: serializeList(
      state.inspectableFacts
    ),
    firstIntakeSatcomContextOverlayRequiredNonClaims: serializeList(
      state.requiredNonClaims
    ),
    firstIntakeSatcomContextOverlayReplayTimeUtc:
      state.replayClockBinding.replayTimeUtc,
    firstIntakeSatcomContextOverlayReplayClockProofSeam:
      state.replayClockBinding.replayClockProofSeam,
    firstIntakeSatcomContextOverlayTimeStateSource:
      state.replayClockBinding.timeStateSource,
    firstIntakeSatcomContextOverlayUsesSharedReplayClock:
      state.replayClockBinding.usesSharedReplayClock ? "true" : "false",
    firstIntakeSatcomContextOverlaySuppressedPanelRevival:
      SUPPRESSED_PANEL_REVIVAL,
    firstIntakeSatcomContextOverlayAvoidsTimeline:
      state.layout.avoidsCesiumTimeline ? "true" : "false",
    firstIntakeSatcomContextOverlayAvoidsCinematicAffordance:
      state.layout.avoidsTopRightCinematicAffordance ? "true" : "false",
    firstIntakeSatcomContextOverlayRawPackageSideReadOwnership:
      state.sourceLineage.rawPackageSideReadOwnership,
    firstIntakeSatcomContextOverlayProofSeam: state.proofSeam
  });
}

function renderOverlay(
  root: HTMLElement,
  state: FirstIntakeSatcomContextOverlayState
): void {
  root.dataset.overlayState = state.overlayState;
  root.dataset.overlaySurface = state.overlaySurface;
  root.dataset.placement = state.placement;
  root.dataset.visible = state.visible ? "true" : "false";
  root.dataset.allowedFacts = serializeList(state.allowedFacts);
  root.dataset.visibleFacts = serializeList(state.visibleFacts);
  root.dataset.inspectableFacts = serializeList(state.inspectableFacts);
  root.dataset.requiredNonClaims = serializeList(state.requiredNonClaims);
  root.dataset.replayTimeUtc = state.replayClockBinding.replayTimeUtc;
  root.dataset.replayClockProofSeam =
    state.replayClockBinding.replayClockProofSeam;
  root.dataset.timeStateSource = state.replayClockBinding.timeStateSource;
  root.dataset.usesSharedReplayClock = state.replayClockBinding
    .usesSharedReplayClock
    ? "true"
    : "false";
  root.dataset.separateTimer = state.replayClockBinding.separateTimer
    ? "true"
    : "false";
  root.dataset.avoidsCesiumTimeline = state.layout.avoidsCesiumTimeline
    ? "true"
    : "false";
  root.dataset.avoidsTopRightCinematicAffordance = state.layout
    .avoidsTopRightCinematicAffordance
    ? "true"
    : "false";
  root.dataset.centerScreenModal = state.layout.centerScreenModal
    ? "true"
    : "false";
  root.dataset.broadDashboard = state.layout.broadDashboard ? "true" : "false";
  root.dataset.suppressedPanelRevival = state.layout.suppressedPanelRevival
    ? "true"
    : "false";
  root.dataset.proofSeam = state.proofSeam;
  root.dataset.lineageNearbySecondEndpointInfoRead =
    state.sourceLineage.nearbySecondEndpointInfoRead;
  root.dataset.lineageExpressionRead = state.sourceLineage.expressionRead;
  root.dataset.lineageReplayTimeAuthorityRead =
    state.sourceLineage.replayTimeAuthorityRead;
  root.dataset.lineageRawPackageSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;

  root.innerHTML = `
    <div class="r1v-satcom-context-overlay__badges" aria-label="Visible satcom context facts">
      <span class="r1v-satcom-context-overlay__badge" data-r1v-overlay-fact="case">${state.visibleFacts[0]}</span>
      <span class="r1v-satcom-context-overlay__badge" data-r1v-overlay-fact="switching">${state.visibleFacts[1]}</span>
      <span class="r1v-satcom-context-overlay__badge" data-r1v-overlay-fact="native-rf">${state.visibleFacts[2]}</span>
      <span class="r1v-satcom-context-overlay__badge" data-r1v-overlay-fact="replay">${state.visibleFacts[3]}</span>
      <span class="r1v-satcom-context-overlay__badge" data-r1v-overlay-fact="fixed-endpoint">${state.visibleFacts[4]} · ${state.visibleFacts[5]}</span>
    </div>
    <details class="r1v-satcom-context-overlay__limits">
      <summary>Limits</summary>
      <div class="r1v-satcom-context-overlay__limits-body" aria-label="Inspectable satcom context limits">
        ${state.inspectableFacts
          .map(
            (fact) =>
              `<span class="r1v-satcom-context-overlay__limit" data-r1v-overlay-inspectable-fact>${fact}</span>`
          )
          .join("")}
        ${state.requiredNonClaims
          .map(
            (nonClaim) =>
              `<span class="r1v-satcom-context-overlay__limit" data-r1v-overlay-nonclaim>${nonClaim}</span>`
          )
          .join("")}
      </div>
    </details>
  `;
}

export function createFirstIntakeSatcomContextOverlayController({
  hudFrame,
  scenarioSurface,
  nearbySecondEndpointInfoController,
  nearbySecondEndpointExpressionController,
  replayTimeAuthorityController
}: FirstIntakeSatcomContextOverlayControllerOptions): FirstIntakeSatcomContextOverlayController {
  const runtimeState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const root = createOverlayRoot();
  const listeners = new Set<
    (state: FirstIntakeSatcomContextOverlayState) => void
  >();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "R1V.5 satcom context overlay only mounts for the matched addressed case."
    );
  }

  const createState = (): FirstIntakeSatcomContextOverlayState => {
    const infoState = nearbySecondEndpointInfoController.getState();
    const expressionState = nearbySecondEndpointExpressionController.getState();
    const replayAuthorityState = replayTimeAuthorityController.getState();

    if (
      infoState.scenarioId !== addressedEntry.scenarioId ||
      expressionState.scenarioId !== addressedEntry.scenarioId ||
      replayAuthorityState.scenarioId !== addressedEntry.scenarioId
    ) {
      throw new Error(
        "R1V.5 satcom context overlay requires matched M8A.3, M8A.4, and R1V.2 seams."
      );
    }

    if (
      infoState.firstCaseContext.caseLabel !== ALLOWED_FACTS[0] ||
      infoState.firstCaseContext.serviceSwitchingSemantics !== ALLOWED_FACTS[1] ||
      infoState.firstCaseContext.nativeRfHandover !== false ||
      infoState.endpoint.endpointLabel !==
        "YKA Kamloops Airport Operations Office" ||
      infoState.endpoint.positionPrecision !== "facility-known" ||
      expressionState.relationCue.satellitePathTruth !== "not-claimed" ||
      expressionState.relationCue.cueKind !==
        "presentation-only-relation-cue"
    ) {
      throw new Error(
        "R1V.5 satcom context overlay requires the locked first-case context, YKA endpoint, and relation non-claim."
      );
    }

    const state: FirstIntakeSatcomContextOverlayState = {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      overlayState: FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_STATE,
      overlaySurface: FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_SURFACE,
      placement: OVERLAY_PLACEMENT,
      visible: root.isConnected && !root.hidden,
      allowedFacts: [...ALLOWED_FACTS],
      visibleFacts: [...VISIBLE_FACTS],
      inspectableFacts: [...INSPECTABLE_FACTS],
      requiredNonClaims: [...REQUIRED_NON_CLAIMS],
      replayClockBinding: {
        replayTimeUtc: replayAuthorityState.currentTimeUtc,
        replayClockProofSeam: replayAuthorityState.replayClockProofSeam,
        timeStateSource: TIME_STATE_SOURCE,
        usesSharedReplayClock: true,
        separateTimer: false
      },
      layout: {
        avoidsCesiumTimeline: true,
        avoidsTopRightCinematicAffordance: true,
        centerScreenModal: false,
        broadDashboard: false,
        suppressedPanelRevival: false
      },
      proofSeam: FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_PROOF_SEAM,
      sourceLineage: {
        nearbySecondEndpointInfoRead:
          "nearbySecondEndpointInfoController.getState()",
        expressionRead:
          "nearbySecondEndpointExpressionController.getState().relationCue",
        replayTimeAuthorityRead:
          "firstIntakeReplayTimeAuthorityController.getState()",
        rawPackageSideReadOwnership: "forbidden"
      }
    };

    assertStateFacts(state);
    return state;
  };

  const syncState = (): FirstIntakeSatcomContextOverlayState => {
    const nextState = createState();
    renderOverlay(root, nextState);
    syncTelemetry(nextState);
    notifyListeners(listeners, nextState);
    return nextState;
  };

  hudFrame.appendChild(root);
  syncState();

  const unsubscribeReplayTimeAuthority = replayTimeAuthorityController.subscribe(
    () => {
      syncState();
    }
  );

  return {
    getState(): FirstIntakeSatcomContextOverlayState {
      return cloneState(createState());
    },
    subscribe(
      listener: (state: FirstIntakeSatcomContextOverlayState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      unsubscribeReplayTimeAuthority();
      listeners.clear();
      root.remove();
      clearDocumentTelemetry(FIRST_INTAKE_SATCOM_CONTEXT_OVERLAY_TELEMETRY_KEYS);
    }
  };
}
