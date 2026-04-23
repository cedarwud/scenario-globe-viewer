import {
  type CandidatePhysicalInputs,
  PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
  type PhysicalInputProvenanceKind
} from "../features/physical-input/physical-input";
import type {
  FirstIntakeRuntimeScenarioSurface,
  ScenarioSession
} from "../features/scenario";
import type {
  FirstIntakeHandoverDecisionController
} from "./first-intake-handover-decision-controller";
import type {
  FirstIntakeMobileEndpointTrajectoryConsumerController
} from "./first-intake-mobile-endpoint-trajectory-consumer-controller";
import type {
  FirstIntakeMobileEndpointTrajectoryController
} from "./first-intake-mobile-endpoint-trajectory-controller";
import type {
  FirstIntakeOverlayExpressionController
} from "./first-intake-overlay-expression-controller";
import type {
  FirstIntakePhysicalInputController
} from "./first-intake-physical-input-controller";

const FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_BOUNDARY_MODE = "bounded-proxy";
const FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_MEASUREMENT_TRUTH_CLAIM =
  "not-measurement-truth";

export const FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_SURFACE =
  "integrated-active-case-narrative-panel";
export const FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeActiveCaseNarrative";

const FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_COMPOSED_RUNTIME_SEAMS = [
  "createFirstIntakeRuntimeScenarioSurface",
  "createFirstIntakeActiveScenarioSession",
  "createFirstIntakePhysicalInputController",
  "createFirstIntakeHandoverDecisionController",
  "createFirstIntakeOverlayExpressionController",
  "createFirstIntakeMobileEndpointTrajectoryController",
  "createFirstIntakeMobileEndpointTrajectoryConsumerController"
] as const;

export interface FirstIntakeActiveCaseNarrativeState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: ReturnType<
    FirstIntakeRuntimeScenarioSurface["getState"]
  >["addressResolution"];
  activeScenarioId: string;
  narrativeState: "active-addressed-case";
  narrativeSurface: typeof FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_SURFACE;
  panelVisible: boolean;
  caseLabel: string;
  serviceSwitchingSemantics: "service-layer switching";
  pathControlMode: typeof PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE;
  nativeRfHandover: false;
  truthBoundaryLabel: string;
  truthBoundaryMode: typeof FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_BOUNDARY_MODE;
  measurementTruthClaim:
    typeof FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_MEASUREMENT_TRUTH_CLAIM;
  onewebGatewayPoolSemantics: "eligible-gateway-pool";
  geoAnchorSemantics: "provider-managed-anchor";
  acceptedCorridorPackageId: string;
  acceptedCorridorPackageNature: "historical-replay-package";
  equipageTruth: "not-proven-at-tail-level";
  serviceTruth: "not-proven-active-on-this-flight";
  proofSeam: typeof FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_PROOF_SEAM;
  composedRuntimeSeams:
    ReadonlyArray<
      typeof FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_COMPOSED_RUNTIME_SEAMS[number]
    >;
  sourceLineage: {
    activeOwner: "createFirstIntakeActiveScenarioSession";
    scenarioRuntimeRead:
      "scenarioSurface.getState()+scenarioSurface.getAddressedEntry()";
    physicalInputRead: "physicalInputController.getState().physicalInput";
    handoverRead: "handoverDecisionController.getState()";
    overlayRead: "overlayExpressionController.getState()";
    trajectoryRead: "trajectoryController.getState().trajectory";
    trajectoryConsumerRead: "trajectoryConsumerController.getState()";
    trajectoryProofSeam: string;
    trajectoryConsumerProofSeam: string;
    rawSeedSideReadOwnership: "forbidden";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeActiveCaseNarrativeController {
  getState(): FirstIntakeActiveCaseNarrativeState;
  subscribe(
    listener: (state: FirstIntakeActiveCaseNarrativeState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeActiveCaseNarrativeControllerOptions {
  hudFrame: HTMLElement;
  scenarioSession: ScenarioSession;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  physicalInputController: FirstIntakePhysicalInputController;
  handoverDecisionController: FirstIntakeHandoverDecisionController;
  overlayExpressionController: FirstIntakeOverlayExpressionController;
  trajectoryController: FirstIntakeMobileEndpointTrajectoryController;
  trajectoryConsumerController: FirstIntakeMobileEndpointTrajectoryConsumerController;
}

function createPanelRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "hud-panel first-intake-active-case-narrative";
  root.dataset.firstIntakeActiveCaseNarrative = "true";
  root.setAttribute("aria-label", "First-intake active-case narrative");
  return root;
}

function notifyListeners(
  listeners: ReadonlySet<
    (state: FirstIntakeActiveCaseNarrativeState) => void
  >,
  state: FirstIntakeActiveCaseNarrativeState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function renderPanel(
  root: HTMLElement,
  state: FirstIntakeActiveCaseNarrativeState
): void {
  root.dataset.scenarioId = state.scenarioId;
  root.dataset.addressResolution = state.addressResolution;
  root.dataset.activeScenarioId = state.activeScenarioId;
  root.dataset.narrativeState = state.narrativeState;
  root.dataset.narrativeSurface = state.narrativeSurface;
  root.dataset.caseLabel = state.caseLabel;
  root.dataset.serviceSwitchingSemantics = state.serviceSwitchingSemantics;
  root.dataset.pathControlMode = state.pathControlMode;
  root.dataset.nativeRfHandover = String(state.nativeRfHandover);
  root.dataset.truthBoundaryLabel = state.truthBoundaryLabel;
  root.dataset.truthBoundaryMode = state.truthBoundaryMode;
  root.dataset.measurementTruthClaim = state.measurementTruthClaim;
  root.dataset.onewebGatewayPoolSemantics = state.onewebGatewayPoolSemantics;
  root.dataset.geoAnchorSemantics = state.geoAnchorSemantics;
  root.dataset.acceptedCorridorPackageId = state.acceptedCorridorPackageId;
  root.dataset.acceptedCorridorPackageNature =
    state.acceptedCorridorPackageNature;
  root.dataset.equipageTruth = state.equipageTruth;
  root.dataset.serviceTruth = state.serviceTruth;
  root.dataset.proofSeam = state.proofSeam;
  root.dataset.composedRuntimeSeams = JSON.stringify(state.composedRuntimeSeams);
  root.dataset.lineageActiveOwner = state.sourceLineage.activeOwner;
  root.dataset.lineageScenarioRuntimeRead =
    state.sourceLineage.scenarioRuntimeRead;
  root.dataset.lineagePhysicalInputRead = state.sourceLineage.physicalInputRead;
  root.dataset.lineageHandoverRead = state.sourceLineage.handoverRead;
  root.dataset.lineageOverlayRead = state.sourceLineage.overlayRead;
  root.dataset.lineageTrajectoryRead = state.sourceLineage.trajectoryRead;
  root.dataset.lineageTrajectoryConsumerRead =
    state.sourceLineage.trajectoryConsumerRead;
  root.dataset.lineageTrajectoryProofSeam =
    state.sourceLineage.trajectoryProofSeam;
  root.dataset.lineageTrajectoryConsumerProofSeam =
    state.sourceLineage.trajectoryConsumerProofSeam;
  root.dataset.lineageRawSeedSideReadOwnership =
    state.sourceLineage.rawSeedSideReadOwnership;
  root.dataset.lineageRawPackageSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;

  root.innerHTML = `
    <div class="first-intake-active-case-narrative__eyebrow">
      Integrated Active-Case Narrative
    </div>
    <h2 class="first-intake-active-case-narrative__heading">
      ${state.caseLabel}
    </h2>
    <p class="first-intake-active-case-narrative__summary">
      This active first-intake case reads repo-owned runtime seams only:
      ${state.serviceSwitchingSemantics}, not native RF handover, and
      bounded-proxy, not measurement truth.
    </p>
    <div class="first-intake-active-case-narrative__tokens">
      <span class="first-intake-active-case-narrative__token" data-fact="oneweb-side">
        OneWeb = eligible gateway pool
      </span>
      <span class="first-intake-active-case-narrative__token" data-fact="geo-side">
        GEO = provider-managed anchor
      </span>
      <span class="first-intake-active-case-narrative__token" data-fact="corridor-package">
        accepted corridor package = historical replay package
      </span>
      <span class="first-intake-active-case-narrative__token" data-fact="equipage-truth">
        not-proven-at-tail-level
      </span>
      <span class="first-intake-active-case-narrative__token" data-fact="service-truth">
        not-proven-active-on-this-flight
      </span>
    </div>
    <div class="first-intake-active-case-narrative__meta">
      Package id: ${state.acceptedCorridorPackageId} · Truth label:
      ${state.truthBoundaryLabel} · Path control mode: ${state.pathControlMode}
    </div>
    <div class="first-intake-active-case-narrative__lineage">
      Runtime seams only: scenario owner + physical-input + handover +
      overlay expression + mobile trajectory seam + corridor consumer. No raw
      seed/package side-reads.
    </div>
  `;
}

function humanizeProviderId(value: string): string {
  if (value === "oneweb") {
    return "OneWeb";
  }

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

  return vertical
    .split(/[_-]+/g)
    .filter((token) => token.length > 0)
    .join(" ")
    .toLowerCase();
}

function requireNarrativeCandidate(
  candidates: ReadonlyArray<CandidatePhysicalInputs>,
  pathRole: "primary" | "secondary"
): CandidatePhysicalInputs {
  const candidate = candidates.find((entry) => entry.pathRole === pathRole);

  if (!candidate) {
    throw new Error(
      `First-intake active-case narrative requires the ${pathRole} runtime physical-input candidate.`
    );
  }

  return candidate;
}

function resolveCaseLabel({
  candidates,
  vertical
}: {
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
  vertical: string;
}): string {
  const primaryCandidate = requireNarrativeCandidate(candidates, "primary");
  const secondaryCandidate = requireNarrativeCandidate(candidates, "secondary");
  const primaryProvider = humanizeProviderId(
    primaryCandidate.candidateId.split("-")[0] ?? ""
  );
  const secondaryProvider = humanizeProviderId(
    secondaryCandidate.candidateId.split("-")[0] ?? ""
  );
  const caseLabel = `${primaryProvider} ${primaryCandidate.orbitClass.toUpperCase()} + ${secondaryProvider} ${secondaryCandidate.orbitClass.toUpperCase()} ${resolveVerticalNarrativeLabel(
    vertical
  )}`;

  if (caseLabel !== "OneWeb LEO + Intelsat GEO aviation") {
    throw new Error(
      "First-intake active-case narrative requires the locked first-case narrative label."
    );
  }

  return caseLabel;
}

function resolveServiceSwitchingSemantics(
  decisionModel: string | undefined
): "service-layer switching" {
  if (decisionModel !== "service-layer-switching") {
    throw new Error(
      "First-intake active-case narrative requires service-layer-switching semantics from the handover runtime seam."
    );
  }

  return "service-layer switching";
}

function resolvePathControlMode(
  candidatePathControlModes: ReadonlyArray<string>
): typeof PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE {
  if (
    candidatePathControlModes.length !== 1 ||
    candidatePathControlModes[0] !== PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE
  ) {
    throw new Error(
      "First-intake active-case narrative requires the single approved managed_service_switching physical-input mode."
    );
  }

  return PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE;
}

function resolveProvenanceKind(
  provenanceKinds: ReadonlyArray<PhysicalInputProvenanceKind>
): typeof FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_BOUNDARY_MODE {
  if (
    provenanceKinds.length !== 1 ||
    provenanceKinds[0] !== FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_BOUNDARY_MODE
  ) {
    throw new Error(
      "First-intake active-case narrative requires bounded-proxy physical-input provenance only."
    );
  }

  return FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_BOUNDARY_MODE;
}

function resolveNativeRfHandover(value: boolean | undefined): false {
  if (value !== false) {
    throw new Error(
      "First-intake active-case narrative must preserve the non-native-RF handover boundary."
    );
  }

  return false;
}

function resolveTruthBoundaryLabel(
  value: string | undefined,
  expectedTruthBoundaryLabel: string
): string {
  if (value !== expectedTruthBoundaryLabel) {
    throw new Error(
      "First-intake active-case narrative requires the handover truth-boundary label to stay aligned with the active runtime case."
    );
  }

  return value;
}

function resolveGeoAnchorSemantics(
  positionMode: string
): "provider-managed-anchor" {
  if (positionMode !== "provider-managed-anchor") {
    throw new Error(
      "First-intake active-case narrative requires the provider-managed GEO anchor overlay endpoint."
    );
  }

  return positionMode;
}

function resolveEquipageTruth(value: string): "not-proven-at-tail-level" {
  if (value !== "not-proven-at-tail-level") {
    throw new Error(
      "First-intake active-case narrative must preserve the accepted corridor equipage truth boundary."
    );
  }

  return value;
}

function resolveServiceTruth(
  value: string
): "not-proven-active-on-this-flight" {
  if (value !== "not-proven-active-on-this-flight") {
    throw new Error(
      "First-intake active-case narrative must preserve the accepted corridor service truth boundary."
    );
  }

  return value;
}

export function createFirstIntakeActiveCaseNarrativeController({
  hudFrame,
  scenarioSession,
  scenarioSurface,
  physicalInputController,
  handoverDecisionController,
  overlayExpressionController,
  trajectoryController,
  trajectoryConsumerController
}: FirstIntakeActiveCaseNarrativeControllerOptions): FirstIntakeActiveCaseNarrativeController {
  const panelRoot = createPanelRoot();
  const listeners = new Set<
    (state: FirstIntakeActiveCaseNarrativeState) => void
  >();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const runtimeState = scenarioSurface.getState();
  const activeScenario = scenarioSession.getCurrentScenario();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "First-intake active-case narrative only mounts for the matched addressed case."
    );
  }

  if (!activeScenario || activeScenario.scenarioId !== addressedEntry.scenarioId) {
    throw new Error(
      "First-intake active-case narrative requires the addressed case to own the active scenario session."
    );
  }

  const expectedTruthBoundaryLabel =
    addressedEntry.resolvedInputs.context?.truthBoundaryLabel;

  if (!expectedTruthBoundaryLabel) {
    throw new Error(
      "First-intake active-case narrative requires the active runtime truth-boundary label."
    );
  }

  const createState = (): FirstIntakeActiveCaseNarrativeState => {
    const physicalRuntimeState = physicalInputController.getState();
    const handoverState = handoverDecisionController.getState();
    const overlayState = overlayExpressionController.getState();
    const trajectoryState = trajectoryController.getState();
    const trajectoryConsumerState = trajectoryConsumerController.getState();

    if (physicalRuntimeState.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake active-case narrative requires the first-intake physical-input owner seam."
      );
    }
    const vertical =
      addressedEntry.resolvedInputs.context?.vertical ??
      addressedEntry.definition.context?.vertical;

    if (!vertical) {
      throw new Error(
        "First-intake active-case narrative requires the active runtime case vertical."
      );
    }

    const pathControlModes = [
      ...new Set(
        physicalRuntimeState.physicalInput.candidates
          .map((candidate) => candidate.pathControlMode)
          .filter((mode): mode is string => Boolean(mode))
      )
    ];
    const truthBoundaryMode = resolveProvenanceKind([
      ...new Set(
        physicalRuntimeState.physicalInput.provenance.map((entry) => entry.kind)
      )
    ]);
    const eligiblePoolCandidateCount =
      physicalRuntimeState.physicalInput.candidates.filter(
        (candidate) => candidate.infrastructureSelectionMode === "eligible-pool"
      ).length;
    const providerManagedCandidateCount =
      physicalRuntimeState.physicalInput.candidates.filter(
        (candidate) => candidate.infrastructureSelectionMode === "provider-managed"
      ).length;

    if (eligiblePoolCandidateCount !== 1 || providerManagedCandidateCount !== 1) {
      throw new Error(
        "First-intake active-case narrative requires the existing eligible-pool and provider-managed physical-input path split."
      );
    }

    if (handoverState.snapshot.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake active-case narrative requires the first-intake handover owner seam."
      );
    }

    const nativeRfHandover = resolveNativeRfHandover(
      handoverState.snapshot.isNativeRfHandover
    );
    const truthBoundaryLabel = resolveTruthBoundaryLabel(
      handoverState.result.semanticsBridge.truthBoundaryLabel,
      expectedTruthBoundaryLabel
    );

    if (overlayState.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake active-case narrative requires the first-intake overlay expression seam."
      );
    }

    if (
      overlayState.gatewayPoolSemantics !== "eligible-gateway-pool" ||
      overlayState.activeGatewayClaim !== "not-claimed"
    ) {
      throw new Error(
        "First-intake active-case narrative must preserve OneWeb gateway-pool-only overlay semantics."
      );
    }

    const geoAnchorEndpoint = overlayState.endpoints.find(
      (endpoint) => endpoint.role === "endpoint-b"
    );

    if (!geoAnchorEndpoint) {
      throw new Error(
        "First-intake active-case narrative requires the provider-managed GEO anchor overlay endpoint."
      );
    }
    const geoAnchorSemantics = resolveGeoAnchorSemantics(
      geoAnchorEndpoint.positionMode
    );

    if (trajectoryState.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake active-case narrative requires the dedicated mobile trajectory runtime seam."
      );
    }

    if (trajectoryConsumerState.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake active-case narrative requires the first-intake mobile trajectory consumer seam."
      );
    }

    if (
      trajectoryConsumerState.acceptedCorridorPackageId !==
        trajectoryState.trajectory.trajectory.recordId ||
      resolveEquipageTruth(trajectoryConsumerState.equipageTruth) !==
        trajectoryState.trajectory.truthBoundary.equipageTruth ||
      resolveServiceTruth(trajectoryConsumerState.serviceTruth) !==
        trajectoryState.trajectory.truthBoundary.serviceTruth
    ) {
      throw new Error(
        "First-intake active-case narrative must read corridor package identity and truth boundaries from the runtime trajectory seams, not package side-reads."
      );
    }

    if (
      trajectoryConsumerState.sourceLineage.rawPackageSideReadOwnership !==
      "forbidden"
    ) {
      throw new Error(
        "First-intake active-case narrative must keep raw package side-read ownership forbidden."
      );
    }

    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      activeScenarioId: activeScenario.scenarioId,
      narrativeState: "active-addressed-case",
      narrativeSurface: FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_SURFACE,
      panelVisible: panelRoot.isConnected,
      caseLabel: resolveCaseLabel({
        candidates: physicalRuntimeState.physicalInput.candidates,
        vertical
      }),
      serviceSwitchingSemantics: resolveServiceSwitchingSemantics(
        handoverState.snapshot.decisionModel
      ),
      pathControlMode: resolvePathControlMode(pathControlModes),
      nativeRfHandover,
      truthBoundaryLabel,
      truthBoundaryMode,
      measurementTruthClaim:
        FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_MEASUREMENT_TRUTH_CLAIM,
      onewebGatewayPoolSemantics: overlayState.gatewayPoolSemantics,
      geoAnchorSemantics,
      acceptedCorridorPackageId:
        trajectoryConsumerState.acceptedCorridorPackageId,
      acceptedCorridorPackageNature: trajectoryConsumerState.packageNature,
      equipageTruth: resolveEquipageTruth(trajectoryConsumerState.equipageTruth),
      serviceTruth: resolveServiceTruth(trajectoryConsumerState.serviceTruth),
      proofSeam: FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_PROOF_SEAM,
      composedRuntimeSeams: [
        ...FIRST_INTAKE_ACTIVE_CASE_NARRATIVE_COMPOSED_RUNTIME_SEAMS
      ],
      sourceLineage: {
        activeOwner: "createFirstIntakeActiveScenarioSession",
        scenarioRuntimeRead:
          "scenarioSurface.getState()+scenarioSurface.getAddressedEntry()",
        physicalInputRead: "physicalInputController.getState().physicalInput",
        handoverRead: "handoverDecisionController.getState()",
        overlayRead: "overlayExpressionController.getState()",
        trajectoryRead: "trajectoryController.getState().trajectory",
        trajectoryConsumerRead: "trajectoryConsumerController.getState()",
        trajectoryProofSeam: trajectoryState.proofSeam,
        trajectoryConsumerProofSeam: trajectoryConsumerState.proofSeam,
        rawSeedSideReadOwnership: "forbidden",
        rawPackageSideReadOwnership:
          trajectoryConsumerState.sourceLineage.rawPackageSideReadOwnership
      }
    };
  };

  hudFrame.appendChild(panelRoot);
  const initialState = createState();
  renderPanel(panelRoot, initialState);
  notifyListeners(listeners, initialState);

  return {
    getState(): FirstIntakeActiveCaseNarrativeState {
      return createState();
    },
    subscribe(
      listener: (state: FirstIntakeActiveCaseNarrativeState) => void
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
