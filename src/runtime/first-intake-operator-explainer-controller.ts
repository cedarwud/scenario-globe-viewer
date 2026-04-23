import {
  PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
  type PhysicalInputProvenanceKind
} from "../features/physical-input/physical-input";
import type {
  FirstIntakePathProjectionSeed
} from "../features/physical-input/path-projection-adapter";
import type {
  FirstIntakeScenarioSeed,
  FirstIntakeRuntimeScenarioSurface,
  ScenarioSession
} from "../features/scenario";
import { FIRST_INTAKE_RUNTIME_SEED_PATH } from "../features/scenario";
import type {
  FirstIntakePhysicalInputController
} from "./first-intake-physical-input-controller";
import type {
  FirstIntakeHandoverDecisionController
} from "./first-intake-handover-decision-controller";

const FIRST_INTAKE_OPERATOR_EXPLAINER_BOUNDARY_MODE = "bounded-proxy";
const FIRST_INTAKE_OPERATOR_EXPLAINER_MEASUREMENT_TRUTH_CLAIM =
  "not-measurement-truth";
const FIRST_INTAKE_OPERATOR_EXPLAINER_GATEWAY_POOL_SEMANTICS = "eligible-pool";
const FIRST_INTAKE_OPERATOR_EXPLAINER_GEO_ANCHOR_SEMANTICS =
  "provider-managed-anchor";

type FirstIntakeOperatorExplainerCandidate = {
  candidateId: string;
  provider: string;
  orbitClass: "leo" | "meo" | "geo";
  pathControlMode: string;
  infrastructureSelectionMode: string;
  switchSemantics: ReadonlyArray<string>;
};

type FirstIntakeOperatorExplainerEndpoint = {
  endpointId: string;
  role: "endpoint-a" | "endpoint-b";
  positionMode: string;
};

export type FirstIntakeOperatorExplainerSeed =
  FirstIntakeScenarioSeed &
  FirstIntakePathProjectionSeed & {
    endpoints: ReadonlyArray<FirstIntakeOperatorExplainerEndpoint>;
    candidatePaths: ReadonlyArray<FirstIntakeOperatorExplainerCandidate>;
  };

export interface FirstIntakeOperatorExplainerState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: ReturnType<
    FirstIntakeRuntimeScenarioSurface["getState"]
  >["addressResolution"];
  activeScenarioId: string;
  caseLabel: string;
  serviceSwitchingSemantics: string;
  decisionModel: string;
  pathControlMode: typeof PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE;
  nativeRfHandover: false;
  truthBoundaryLabel: string;
  truthBoundaryMode: typeof FIRST_INTAKE_OPERATOR_EXPLAINER_BOUNDARY_MODE;
  measurementTruthClaim:
    typeof FIRST_INTAKE_OPERATOR_EXPLAINER_MEASUREMENT_TRUTH_CLAIM;
  onewebGatewayPoolSemantics:
    typeof FIRST_INTAKE_OPERATOR_EXPLAINER_GATEWAY_POOL_SEMANTICS;
  geoAnchorSemantics:
    typeof FIRST_INTAKE_OPERATOR_EXPLAINER_GEO_ANCHOR_SEMANTICS;
  provenanceKinds: ReadonlyArray<PhysicalInputProvenanceKind>;
  panelVisible: boolean;
  sourceLineage: {
    seedPath: typeof FIRST_INTAKE_RUNTIME_SEED_PATH;
    scenarioSurface: "createFirstIntakeRuntimeScenarioSurface";
    activeOwner: "createFirstIntakeActiveScenarioSession";
    physicalInput: "createFirstIntakePhysicalInputSourceCatalog";
    physicalState: "createPhysicalInputState";
    handoverState: "createFirstIntakeHandoverDecisionController";
    handoverSemantics:
      "snapshot.decisionModel+snapshot.isNativeRfHandover+result.semanticsBridge.truthBoundaryLabel";
  };
}

export interface FirstIntakeOperatorExplainerController {
  getState(): FirstIntakeOperatorExplainerState;
  subscribe(
    listener: (state: FirstIntakeOperatorExplainerState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeOperatorExplainerControllerOptions {
  hudFrame: HTMLElement;
  scenarioSession: ScenarioSession;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  physicalInputController: FirstIntakePhysicalInputController;
  handoverDecisionController: FirstIntakeHandoverDecisionController;
  seed: FirstIntakeOperatorExplainerSeed;
  mountPanel?: boolean;
}

function createPanelRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "hud-panel first-intake-operator-explainer";
  root.dataset.firstIntakeOperatorExplainer = "true";
  root.setAttribute("aria-label", "First-intake operator explainer");
  return root;
}

function humanizeToken(value: string): string {
  return value
    .split(/[_-]+/g)
    .filter((token) => token.length > 0)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");
}

function resolveVerticalNarrativeLabel(vertical: string): string {
  if (vertical.endsWith("_aviation")) {
    return "aviation";
  }

  return humanizeToken(vertical).toLowerCase();
}

function requireCandidate(
  candidates: ReadonlyArray<FirstIntakeOperatorExplainerCandidate>,
  candidateId: string
): FirstIntakeOperatorExplainerCandidate {
  const candidate = candidates.find((entry) => entry.candidateId === candidateId);

  if (!candidate) {
    throw new Error(
      `First-intake operator explainer requires candidate ${candidateId}.`
    );
  }

  return candidate;
}

function requireEndpoint(
  endpoints: ReadonlyArray<FirstIntakeOperatorExplainerEndpoint>,
  role: "endpoint-a" | "endpoint-b"
): FirstIntakeOperatorExplainerEndpoint {
  const endpoint = endpoints.find((entry) => entry.role === role);

  if (!endpoint) {
    throw new Error(
      `First-intake operator explainer requires endpoint role ${role}.`
    );
  }

  return endpoint;
}

function resolveServiceSwitchingSemantics(
  decisionModel: string
): string {
  if (decisionModel !== "service-layer-switching") {
    throw new Error(
      "First-intake operator explainer requires the approved service-layer-switching handover decision model."
    );
  }

  return "service-layer switching";
}

function renderPanel(
  root: HTMLElement,
  state: FirstIntakeOperatorExplainerState
): void {
  const provenanceKinds = JSON.stringify(state.provenanceKinds);

  root.dataset.scenarioId = state.scenarioId;
  root.dataset.addressResolution = state.addressResolution;
  root.dataset.activeScenarioId = state.activeScenarioId;
  root.dataset.caseLabel = state.caseLabel;
  root.dataset.serviceSwitchingSemantics = state.serviceSwitchingSemantics;
  root.dataset.decisionModel = state.decisionModel;
  root.dataset.pathControlMode = state.pathControlMode;
  root.dataset.nativeRfHandover = String(state.nativeRfHandover);
  root.dataset.truthBoundaryMode = state.truthBoundaryMode;
  root.dataset.truthBoundaryLabel = state.truthBoundaryLabel;
  root.dataset.measurementTruthClaim = state.measurementTruthClaim;
  root.dataset.onewebGatewayPoolSemantics = state.onewebGatewayPoolSemantics;
  root.dataset.geoAnchorSemantics = state.geoAnchorSemantics;
  root.dataset.provenanceKinds = provenanceKinds;
  root.dataset.lineageSeedPath = state.sourceLineage.seedPath;
  root.dataset.lineageScenarioSurface = state.sourceLineage.scenarioSurface;
  root.dataset.lineageActiveOwner = state.sourceLineage.activeOwner;
  root.dataset.lineagePhysicalInput = state.sourceLineage.physicalInput;
  root.dataset.lineagePhysicalState = state.sourceLineage.physicalState;
  root.dataset.lineageHandoverState = state.sourceLineage.handoverState;
  root.dataset.lineageHandoverSemantics =
    state.sourceLineage.handoverSemantics;

  root.innerHTML = `
    <div class="first-intake-operator-explainer__eyebrow">
      Active First-Intake Explainer
    </div>
    <h2 class="first-intake-operator-explainer__heading">
      ${state.caseLabel}
    </h2>
    <p class="first-intake-operator-explainer__summary">
      This active first-intake case stays on ${state.serviceSwitchingSemantics}, is not native RF handover, and remains bounded-proxy, not measurement truth.
    </p>
    <div class="first-intake-operator-explainer__facts">
      <article class="first-intake-operator-explainer__fact" data-fact="switching">
        <div class="first-intake-operator-explainer__fact-label">Switching model</div>
        <div class="first-intake-operator-explainer__fact-value">
          ${state.serviceSwitchingSemantics}
        </div>
        <div class="first-intake-operator-explainer__fact-detail">
          Path control mode: ${state.pathControlMode}
        </div>
      </article>
      <article class="first-intake-operator-explainer__fact" data-fact="rf-boundary">
        <div class="first-intake-operator-explainer__fact-label">RF boundary</div>
        <div class="first-intake-operator-explainer__fact-value">
          not native RF handover
        </div>
        <div class="first-intake-operator-explainer__fact-detail">
          Repo-owned explanation input only
        </div>
      </article>
      <article class="first-intake-operator-explainer__fact" data-fact="truth-boundary">
        <div class="first-intake-operator-explainer__fact-label">Truth boundary</div>
        <div class="first-intake-operator-explainer__fact-value">
          bounded-proxy, not measurement truth
        </div>
        <div class="first-intake-operator-explainer__fact-detail">
          ${state.truthBoundaryLabel}
        </div>
      </article>
      <article class="first-intake-operator-explainer__fact" data-fact="oneweb-side">
        <div class="first-intake-operator-explainer__fact-label">OneWeb side</div>
        <div class="first-intake-operator-explainer__fact-value">
          OneWeb side is an eligible gateway pool
        </div>
        <div class="first-intake-operator-explainer__fact-detail">
          No active gateway assignment is claimed
        </div>
      </article>
      <article class="first-intake-operator-explainer__fact" data-fact="geo-side">
        <div class="first-intake-operator-explainer__fact-label">GEO side</div>
        <div class="first-intake-operator-explainer__fact-value">
          GEO side is a provider-managed anchor
        </div>
        <div class="first-intake-operator-explainer__fact-detail">
          Provider-managed anchor semantics stay coordinate-bounded
        </div>
      </article>
      <article class="first-intake-operator-explainer__fact" data-fact="lineage">
        <div class="first-intake-operator-explainer__fact-label">Lineage</div>
        <div class="first-intake-operator-explainer__fact-value">
          Seed -> active case owner -> bounded-proxy physical-input
        </div>
        <div class="first-intake-operator-explainer__fact-detail">
          ${state.sourceLineage.seedPath}
        </div>
      </article>
    </div>
  `;
}

function notifyListeners(
  listeners: ReadonlySet<(state: FirstIntakeOperatorExplainerState) => void>,
  state: FirstIntakeOperatorExplainerState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function createFirstIntakeOperatorExplainerController({
  hudFrame,
  scenarioSession,
  scenarioSurface,
  physicalInputController,
  handoverDecisionController,
  seed,
  mountPanel = true
}: FirstIntakeOperatorExplainerControllerOptions): FirstIntakeOperatorExplainerController {
  const panelRoot = createPanelRoot();
  const listeners = new Set<
    (state: FirstIntakeOperatorExplainerState) => void
  >();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const runtimeState = scenarioSurface.getState();
  const activeScenario = scenarioSession.getCurrentScenario();
  const physicalState = physicalInputController.getState();
  const onewebCandidate = requireCandidate(
    seed.candidatePaths,
    "oneweb-leo-service-path"
  );
  const geoCandidate = requireCandidate(
    seed.candidatePaths,
    "intelsat-geo-service-path"
  );
  const providerManagedAnchor = requireEndpoint(seed.endpoints, "endpoint-b");

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "First-intake operator explainer only mounts for the matched addressed case."
    );
  }

  if (!activeScenario || activeScenario.scenarioId !== addressedEntry.scenarioId) {
    throw new Error(
      "First-intake operator explainer requires the addressed case to own the active scenario session."
    );
  }

  if (seed.scenario.id !== addressedEntry.scenarioId) {
    throw new Error(
      "First-intake operator explainer seed must match the addressed scenario id."
    );
  }

  if (physicalState.scenarioId !== addressedEntry.scenarioId) {
    throw new Error(
      "First-intake operator explainer requires the first-intake physical-input owner seam."
    );
  }

  if (
    onewebCandidate.infrastructureSelectionMode !==
      FIRST_INTAKE_OPERATOR_EXPLAINER_GATEWAY_POOL_SEMANTICS ||
    geoCandidate.infrastructureSelectionMode !== "provider-managed" ||
    providerManagedAnchor.positionMode !==
      FIRST_INTAKE_OPERATOR_EXPLAINER_GEO_ANCHOR_SEMANTICS
  ) {
    throw new Error(
      "First-intake operator explainer must preserve gateway-pool and provider-managed-anchor semantics."
    );
  }

  if (
    onewebCandidate.pathControlMode !==
      PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE ||
    geoCandidate.pathControlMode !== PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE
  ) {
    throw new Error(
      "First-intake operator explainer must preserve the first validated path-control mode."
    );
  }

  const provenanceKinds = [
    ...new Set(physicalState.physicalInput.provenance.map((entry) => entry.kind))
  ];

  if (
    provenanceKinds.length !== 1 ||
    provenanceKinds[0] !== FIRST_INTAKE_OPERATOR_EXPLAINER_BOUNDARY_MODE
  ) {
    throw new Error(
      "First-intake operator explainer requires bounded-proxy physical-input provenance."
    );
  }

  const expectedTruthBoundaryLabel =
    addressedEntry.resolvedInputs.context?.truthBoundaryLabel;

  if (!expectedTruthBoundaryLabel) {
    throw new Error(
      "First-intake operator explainer requires the active runtime case truth-boundary label."
    );
  }

  const createState = (): FirstIntakeOperatorExplainerState => {
    const handoverState = handoverDecisionController.getState();

    if (handoverState.snapshot.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake operator explainer requires the first-intake handover owner seam."
      );
    }

    if (
      handoverState.result.decisionKind !== "unavailable" ||
      handoverState.result.semanticsBridge.truthState !== "unavailable"
    ) {
      throw new Error(
        "First-intake operator explainer must preserve the unsupported/no-op handover decision state."
      );
    }

    if (handoverState.snapshot.decisionModel !== "service-layer-switching") {
      throw new Error(
        "First-intake operator explainer requires the widened handover decisionModel seam."
      );
    }

    if (handoverState.snapshot.isNativeRfHandover !== false) {
      throw new Error(
        "First-intake operator explainer must preserve non-native-RF semantics through the handover runtime seam."
      );
    }

    if (
      handoverState.result.semanticsBridge.truthBoundaryLabel !==
      expectedTruthBoundaryLabel
    ) {
      throw new Error(
        "First-intake operator explainer truth-boundary label must come from the widened handover runtime seam and stay aligned with the active runtime case."
      );
    }

    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      activeScenarioId: activeScenario.scenarioId,
      caseLabel: `${onewebCandidate.provider} ${onewebCandidate.orbitClass.toUpperCase()} + ${geoCandidate.provider} ${geoCandidate.orbitClass.toUpperCase()} ${resolveVerticalNarrativeLabel(seed.scenario.vertical)}`,
      serviceSwitchingSemantics: resolveServiceSwitchingSemantics(
        handoverState.snapshot.decisionModel
      ),
      decisionModel: handoverState.snapshot.decisionModel,
      pathControlMode: PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
      nativeRfHandover: handoverState.snapshot.isNativeRfHandover,
      truthBoundaryLabel: handoverState.result.semanticsBridge.truthBoundaryLabel,
      truthBoundaryMode: FIRST_INTAKE_OPERATOR_EXPLAINER_BOUNDARY_MODE,
      measurementTruthClaim:
        FIRST_INTAKE_OPERATOR_EXPLAINER_MEASUREMENT_TRUTH_CLAIM,
      onewebGatewayPoolSemantics:
        FIRST_INTAKE_OPERATOR_EXPLAINER_GATEWAY_POOL_SEMANTICS,
      geoAnchorSemantics: FIRST_INTAKE_OPERATOR_EXPLAINER_GEO_ANCHOR_SEMANTICS,
      provenanceKinds,
      panelVisible: panelRoot.isConnected,
      sourceLineage: {
        seedPath: FIRST_INTAKE_RUNTIME_SEED_PATH,
        scenarioSurface: "createFirstIntakeRuntimeScenarioSurface",
        activeOwner: "createFirstIntakeActiveScenarioSession",
        physicalInput: "createFirstIntakePhysicalInputSourceCatalog",
        physicalState: "createPhysicalInputState",
        handoverState: "createFirstIntakeHandoverDecisionController",
        handoverSemantics:
          "snapshot.decisionModel+snapshot.isNativeRfHandover+result.semanticsBridge.truthBoundaryLabel"
      }
    };
  };

  if (mountPanel) {
    hudFrame.appendChild(panelRoot);
  }
  const initialState = createState();
  renderPanel(panelRoot, initialState);
  notifyListeners(listeners, initialState);

  return {
    getState(): FirstIntakeOperatorExplainerState {
      return createState();
    },
    subscribe(
      listener: (state: FirstIntakeOperatorExplainerState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      panelRoot.remove();
    }
  };
}
