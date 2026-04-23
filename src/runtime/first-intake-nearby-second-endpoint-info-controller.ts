import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type {
  FirstIntakeActiveCaseNarrativeController
} from "./first-intake-active-case-narrative-controller";
import type {
  FirstIntakeNearbySecondEndpointController
} from "./first-intake-nearby-second-endpoint-controller";

const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_TELEMETRY_KEYS = [
  "firstIntakeNearbySecondEndpointInfoState",
  "firstIntakeNearbySecondEndpointInfoScenarioId",
  "firstIntakeNearbySecondEndpointInfoEndpointLabel",
  "firstIntakeNearbySecondEndpointInfoEndpointType",
  "firstIntakeNearbySecondEndpointInfoPositionPrecision",
  "firstIntakeNearbySecondEndpointInfoGeographyBucket",
  "firstIntakeNearbySecondEndpointInfoNarrativeRole",
  "firstIntakeNearbySecondEndpointInfoNearbyRelation",
  "firstIntakeNearbySecondEndpointInfoActiveGatewayAssignment",
  "firstIntakeNearbySecondEndpointInfoPairSpecificGeoTeleport",
  "firstIntakeNearbySecondEndpointInfoMeasurementTruth",
  "firstIntakeNearbySecondEndpointInfoFirstCaseLabel",
  "firstIntakeNearbySecondEndpointInfoServiceSwitchingSemantics",
  "firstIntakeNearbySecondEndpointInfoNativeRfHandover",
  "firstIntakeNearbySecondEndpointInfoTruthBoundaryMode",
  "firstIntakeNearbySecondEndpointInfoProofSeam"
] as const;

export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_SURFACE =
  "supplemental-nearby-second-endpoint-info-panel";
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointInfo";

const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_STATE =
  "active-addressed-case";
const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_NEARBY_RELATION =
  "first-corridor-nearby-second-endpoint";

interface NearbySecondEndpointInfoEndpointState {
  endpointLabel: "YKA Kamloops Airport Operations Office";
  endpointType: "airport-adjacent-fixed-service-endpoint";
  positionPrecision: "facility-known";
  geographyBucket: "interior-bc-corridor-adjacent";
  narrativeRole: "nearby-fixed-second-endpoint";
}

interface NearbySecondEndpointInfoNonClaimsState {
  activeGatewayAssignment: "not-claimed";
  pairSpecificGeoTeleport: "not-claimed";
  measurementTruth: "not-claimed";
  activeGatewayAssignmentLabel: "No active gateway assignment";
  pairSpecificGeoTeleportLabel: "No pair-specific GEO teleport";
  measurementTruthPerformanceLabel:
    "No measurement-truth performance claim";
}

interface NearbySecondEndpointInfoFirstCaseContextState {
  caseLabel: "OneWeb LEO + Intelsat GEO aviation";
  serviceSwitchingSemantics: "service-layer switching";
  nativeRfHandover: false;
  truthBoundaryMode: "bounded-proxy";
  measurementTruthClaim: "not-measurement-truth";
}

export interface FirstIntakeNearbySecondEndpointInfoState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  infoState: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_STATE;
  infoSurface: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_SURFACE;
  panelVisible: boolean;
  endpoint: NearbySecondEndpointInfoEndpointState;
  nearbyRelation: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_NEARBY_RELATION;
  nearbyExplanation: string;
  firstCaseContext: NearbySecondEndpointInfoFirstCaseContextState;
  nonClaims: NearbySecondEndpointInfoNonClaimsState;
  proofSeam: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_PROOF_SEAM;
  sourceLineage: {
    nearbySecondEndpointRead:
      "nearbySecondEndpointController.getState().endpoint";
    firstCaseNarrativeRead:
      "activeCaseNarrativeController.getState()";
    scenarioRuntimeRead:
      "scenarioSurface.getState()+scenarioSurface.getAddressedEntry()";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeNearbySecondEndpointInfoController {
  getState(): FirstIntakeNearbySecondEndpointInfoState;
  subscribe(
    listener: (state: FirstIntakeNearbySecondEndpointInfoState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeNearbySecondEndpointInfoControllerOptions {
  hudFrame: HTMLElement;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  nearbySecondEndpointController: FirstIntakeNearbySecondEndpointController;
  activeCaseNarrativeController: FirstIntakeActiveCaseNarrativeController;
}

function createPanelRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "hud-panel first-intake-nearby-second-endpoint-info";
  root.dataset.firstIntakeNearbySecondEndpointInfo = "true";
  root.setAttribute(
    "aria-label",
    "Nearby second-endpoint information"
  );
  return root;
}

function resolveEndpointInfo(
  nearbySecondEndpointController: FirstIntakeNearbySecondEndpointController
): NearbySecondEndpointInfoEndpointState {
  const { endpoint } = nearbySecondEndpointController.getState();

  if (
    endpoint.endpointLabel !== "YKA Kamloops Airport Operations Office" ||
    endpoint.endpointType !==
      "airport-adjacent-fixed-service-endpoint" ||
    endpoint.positionPrecision !== "facility-known" ||
    endpoint.geographyBucket !== "interior-bc-corridor-adjacent" ||
    endpoint.narrativeRole !== "nearby-fixed-second-endpoint"
  ) {
    throw new Error(
      "Nearby second-endpoint info requires the accepted YKA nearby second endpoint."
    );
  }

  return {
    endpointLabel: endpoint.endpointLabel,
    endpointType: endpoint.endpointType,
    positionPrecision: endpoint.positionPrecision,
    geographyBucket: endpoint.geographyBucket,
    narrativeRole: endpoint.narrativeRole
  };
}

function resolveNonClaims(
  nearbySecondEndpointController: FirstIntakeNearbySecondEndpointController
): NearbySecondEndpointInfoNonClaimsState {
  const { endpoint } = nearbySecondEndpointController.getState();

  if (
    endpoint.truthBoundary.activeGatewayAssignment !== "not-claimed" ||
    endpoint.truthBoundary.pairSpecificGeoTeleport !== "not-claimed" ||
    endpoint.truthBoundary.measurementTruth !== "not-claimed"
  ) {
    throw new Error(
      "Nearby second-endpoint info requires active gateway, GEO teleport, and measurement-truth non-claims."
    );
  }

  return {
    activeGatewayAssignment:
      endpoint.truthBoundary.activeGatewayAssignment,
    pairSpecificGeoTeleport:
      endpoint.truthBoundary.pairSpecificGeoTeleport,
    measurementTruth: endpoint.truthBoundary.measurementTruth,
    activeGatewayAssignmentLabel: "No active gateway assignment",
    pairSpecificGeoTeleportLabel: "No pair-specific GEO teleport",
    measurementTruthPerformanceLabel:
      "No measurement-truth performance claim"
  };
}

function resolveFirstCaseContext(
  activeCaseNarrativeController: FirstIntakeActiveCaseNarrativeController
): NearbySecondEndpointInfoFirstCaseContextState {
  const activeCaseState = activeCaseNarrativeController.getState();

  if (
    activeCaseState.caseLabel !== "OneWeb LEO + Intelsat GEO aviation" ||
    activeCaseState.serviceSwitchingSemantics !==
      "service-layer switching" ||
    activeCaseState.nativeRfHandover !== false ||
    activeCaseState.truthBoundaryMode !== "bounded-proxy" ||
    activeCaseState.measurementTruthClaim !== "not-measurement-truth"
  ) {
    throw new Error(
      "Nearby second-endpoint info requires the locked first-case truth boundary."
    );
  }

  return {
    caseLabel: activeCaseState.caseLabel,
    serviceSwitchingSemantics:
      activeCaseState.serviceSwitchingSemantics,
    nativeRfHandover: activeCaseState.nativeRfHandover,
    truthBoundaryMode: activeCaseState.truthBoundaryMode,
    measurementTruthClaim: activeCaseState.measurementTruthClaim
  };
}

function cloneState(
  state: FirstIntakeNearbySecondEndpointInfoState
): FirstIntakeNearbySecondEndpointInfoState {
  return {
    ...state,
    endpoint: {
      ...state.endpoint
    },
    firstCaseContext: {
      ...state.firstCaseContext
    },
    nonClaims: {
      ...state.nonClaims
    },
    sourceLineage: {
      ...state.sourceLineage
    }
  };
}

function notifyListeners(
  listeners: ReadonlySet<
    (state: FirstIntakeNearbySecondEndpointInfoState) => void
  >,
  state: FirstIntakeNearbySecondEndpointInfoState
): void {
  for (const listener of listeners) {
    listener(cloneState(state));
  }
}

function syncTelemetry(
  state: FirstIntakeNearbySecondEndpointInfoState
): void {
  syncDocumentTelemetry({
    firstIntakeNearbySecondEndpointInfoState: state.infoState,
    firstIntakeNearbySecondEndpointInfoScenarioId: state.scenarioId,
    firstIntakeNearbySecondEndpointInfoEndpointLabel:
      state.endpoint.endpointLabel,
    firstIntakeNearbySecondEndpointInfoEndpointType:
      state.endpoint.endpointType,
    firstIntakeNearbySecondEndpointInfoPositionPrecision:
      state.endpoint.positionPrecision,
    firstIntakeNearbySecondEndpointInfoGeographyBucket:
      state.endpoint.geographyBucket,
    firstIntakeNearbySecondEndpointInfoNarrativeRole:
      state.endpoint.narrativeRole,
    firstIntakeNearbySecondEndpointInfoNearbyRelation:
      state.nearbyRelation,
    firstIntakeNearbySecondEndpointInfoActiveGatewayAssignment:
      state.nonClaims.activeGatewayAssignment,
    firstIntakeNearbySecondEndpointInfoPairSpecificGeoTeleport:
      state.nonClaims.pairSpecificGeoTeleport,
    firstIntakeNearbySecondEndpointInfoMeasurementTruth:
      state.nonClaims.measurementTruth,
    firstIntakeNearbySecondEndpointInfoFirstCaseLabel:
      state.firstCaseContext.caseLabel,
    firstIntakeNearbySecondEndpointInfoServiceSwitchingSemantics:
      state.firstCaseContext.serviceSwitchingSemantics,
    firstIntakeNearbySecondEndpointInfoNativeRfHandover:
      String(state.firstCaseContext.nativeRfHandover),
    firstIntakeNearbySecondEndpointInfoTruthBoundaryMode:
      state.firstCaseContext.truthBoundaryMode,
    firstIntakeNearbySecondEndpointInfoProofSeam: state.proofSeam
  });
}

function renderPanel(
  root: HTMLElement,
  state: FirstIntakeNearbySecondEndpointInfoState
): void {
  root.dataset.scenarioId = state.scenarioId;
  root.dataset.addressResolution = state.addressResolution;
  root.dataset.infoState = state.infoState;
  root.dataset.infoSurface = state.infoSurface;
  root.dataset.endpointLabel = state.endpoint.endpointLabel;
  root.dataset.endpointType = state.endpoint.endpointType;
  root.dataset.positionPrecision = state.endpoint.positionPrecision;
  root.dataset.geographyBucket = state.endpoint.geographyBucket;
  root.dataset.narrativeRole = state.endpoint.narrativeRole;
  root.dataset.nearbyRelation = state.nearbyRelation;
  root.dataset.activeGatewayAssignment =
    state.nonClaims.activeGatewayAssignment;
  root.dataset.pairSpecificGeoTeleport =
    state.nonClaims.pairSpecificGeoTeleport;
  root.dataset.measurementTruth = state.nonClaims.measurementTruth;
  root.dataset.firstCaseLabel = state.firstCaseContext.caseLabel;
  root.dataset.serviceSwitchingSemantics =
    state.firstCaseContext.serviceSwitchingSemantics;
  root.dataset.nativeRfHandover = String(
    state.firstCaseContext.nativeRfHandover
  );
  root.dataset.truthBoundaryMode =
    state.firstCaseContext.truthBoundaryMode;
  root.dataset.proofSeam = state.proofSeam;
  root.dataset.lineageNearbySecondEndpointRead =
    state.sourceLineage.nearbySecondEndpointRead;
  root.dataset.lineageFirstCaseNarrativeRead =
    state.sourceLineage.firstCaseNarrativeRead;
  root.dataset.lineageScenarioRuntimeRead =
    state.sourceLineage.scenarioRuntimeRead;
  root.dataset.lineageRawPackageSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;

  root.innerHTML = `
    <div class="first-intake-nearby-second-endpoint-info__eyebrow">
      Nearby Second Endpoint
    </div>
    <h2 class="first-intake-nearby-second-endpoint-info__heading">
      ${state.endpoint.endpointLabel}
    </h2>
    <p class="first-intake-nearby-second-endpoint-info__summary">
      This is the ${state.nearbyRelation} for
      ${state.firstCaseContext.caseLabel}. ${state.nearbyExplanation}
    </p>
    <div class="first-intake-nearby-second-endpoint-info__facts">
      <div class="first-intake-nearby-second-endpoint-info__fact" data-fact="endpoint-type">
        <span class="first-intake-nearby-second-endpoint-info__fact-label">Endpoint type</span>
        <span class="first-intake-nearby-second-endpoint-info__fact-value">${state.endpoint.endpointType}</span>
      </div>
      <div class="first-intake-nearby-second-endpoint-info__fact" data-fact="accepted-precision">
        <span class="first-intake-nearby-second-endpoint-info__fact-label">Accepted precision</span>
        <span class="first-intake-nearby-second-endpoint-info__fact-value">${state.endpoint.positionPrecision}</span>
      </div>
      <div class="first-intake-nearby-second-endpoint-info__fact" data-fact="geography-bucket">
        <span class="first-intake-nearby-second-endpoint-info__fact-label">Geography bucket</span>
        <span class="first-intake-nearby-second-endpoint-info__fact-value">${state.endpoint.geographyBucket}</span>
      </div>
    </div>
    <div class="first-intake-nearby-second-endpoint-info__nonclaims" aria-label="Nearby second-endpoint non-claims">
      <span class="first-intake-nearby-second-endpoint-info__nonclaim" data-nonclaim="active-gateway">
        ${state.nonClaims.activeGatewayAssignmentLabel}
      </span>
      <span class="first-intake-nearby-second-endpoint-info__nonclaim" data-nonclaim="geo-teleport">
        ${state.nonClaims.pairSpecificGeoTeleportLabel}
      </span>
      <span class="first-intake-nearby-second-endpoint-info__nonclaim" data-nonclaim="measurement-truth">
        ${state.nonClaims.measurementTruthPerformanceLabel}
      </span>
    </div>
    <div class="first-intake-nearby-second-endpoint-info__boundary">
      First-case boundary remains ${state.firstCaseContext.serviceSwitchingSemantics},
      isNativeRfHandover = ${String(state.firstCaseContext.nativeRfHandover)},
      ${state.firstCaseContext.truthBoundaryMode}. Runtime seams only; no raw
      package side-read.
    </div>
  `;
}

export function createFirstIntakeNearbySecondEndpointInfoController({
  hudFrame,
  scenarioSurface,
  nearbySecondEndpointController,
  activeCaseNarrativeController
}: FirstIntakeNearbySecondEndpointInfoControllerOptions): FirstIntakeNearbySecondEndpointInfoController {
  const runtimeState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const nearbySecondEndpointState =
    nearbySecondEndpointController.getState();
  const activeCaseState = activeCaseNarrativeController.getState();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "Nearby second-endpoint info only mounts for the matched addressed case."
    );
  }

  if (
    nearbySecondEndpointState.scenarioId !== addressedEntry.scenarioId ||
    nearbySecondEndpointState.addressResolution !== "matched"
  ) {
    throw new Error(
      "Nearby second-endpoint info requires the matched nearby second-endpoint seam."
    );
  }

  if (
    activeCaseState.scenarioId !== addressedEntry.scenarioId ||
    activeCaseState.addressResolution !== "matched"
  ) {
    throw new Error(
      "Nearby second-endpoint info requires the matched first-case narrative seam."
    );
  }

  const panelRoot = createPanelRoot();
  const listeners = new Set<
    (state: FirstIntakeNearbySecondEndpointInfoState) => void
  >();

  const createState = (): FirstIntakeNearbySecondEndpointInfoState => {
    const endpoint = resolveEndpointInfo(nearbySecondEndpointController);

    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      infoState: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_STATE,
      infoSurface: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_SURFACE,
      panelVisible: panelRoot.isConnected,
      endpoint,
      nearbyRelation:
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_NEARBY_RELATION,
      nearbyExplanation:
        `It is a fixed endpoint in the ${endpoint.geographyBucket} geography bucket, adjacent to the accepted first corridor, with ${endpoint.positionPrecision} placement precision.`,
      firstCaseContext: resolveFirstCaseContext(
        activeCaseNarrativeController
      ),
      nonClaims: resolveNonClaims(nearbySecondEndpointController),
      proofSeam: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_PROOF_SEAM,
      sourceLineage: {
        nearbySecondEndpointRead:
          "nearbySecondEndpointController.getState().endpoint",
        firstCaseNarrativeRead:
          "activeCaseNarrativeController.getState()",
        scenarioRuntimeRead:
          "scenarioSurface.getState()+scenarioSurface.getAddressedEntry()",
        rawPackageSideReadOwnership: "forbidden"
      }
    };
  };

  hudFrame.appendChild(panelRoot);
  const initialState = createState();
  renderPanel(panelRoot, initialState);
  syncTelemetry(initialState);
  notifyListeners(listeners, initialState);

  return {
    getState(): FirstIntakeNearbySecondEndpointInfoState {
      return cloneState(createState());
    },
    subscribe(
      listener: (state: FirstIntakeNearbySecondEndpointInfoState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      clearDocumentTelemetry(
        FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_INFO_TELEMETRY_KEYS
      );
      panelRoot.remove();
    }
  };
}
