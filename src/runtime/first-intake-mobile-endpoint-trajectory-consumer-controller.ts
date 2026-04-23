import type {
  FirstIntakeRuntimeScenarioSurface,
  ScenarioSession
} from "../features/scenario";
import type {
  FirstIntakeMobileEndpointTrajectoryController
} from "./first-intake-mobile-endpoint-trajectory-controller";

export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONSUMER_SURFACE =
  "runtime-local-corridor-provenance-panel";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONSUMER_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectoryConsumer";

export interface FirstIntakeMobileEndpointTrajectoryConsumerState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: ReturnType<
    FirstIntakeRuntimeScenarioSurface["getState"]
  >["addressResolution"];
  activeScenarioId: string;
  consumerState: "active-addressed-case";
  consumerSurface:
    typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONSUMER_SURFACE;
  panelVisible: boolean;
  acceptedCorridorPackageId: string;
  packageNature: "historical-replay-package";
  waypointCount: number;
  windowStartUtc: string;
  windowEndUtc: string;
  sourceFamily: string;
  sourceService: string;
  coordinateReference: string;
  corridorTruth: string;
  equipageTruth: string;
  serviceTruth: string;
  trajectoryProofSeam: string;
  proofSeam:
    typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONSUMER_PROOF_SEAM;
  sourceLineage: {
    activeOwner: "createFirstIntakeActiveScenarioSession";
    runtimeTrajectorySeam: "createFirstIntakeMobileEndpointTrajectoryController";
    runtimeTrajectoryRead: "trajectoryController.getState().trajectory";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeMobileEndpointTrajectoryConsumerController {
  getState(): FirstIntakeMobileEndpointTrajectoryConsumerState;
  subscribe(
    listener: (state: FirstIntakeMobileEndpointTrajectoryConsumerState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeMobileEndpointTrajectoryConsumerControllerOptions {
  hudFrame: HTMLElement;
  scenarioSession: ScenarioSession;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  trajectoryController: FirstIntakeMobileEndpointTrajectoryController;
  mountPanel?: boolean;
}

function createPanelRoot(): HTMLElement {
  const root = document.createElement("section");
  root.className = "hud-panel first-intake-mobile-endpoint-trajectory-consumer";
  root.dataset.firstIntakeMobileEndpointTrajectoryConsumer = "true";
  root.setAttribute("aria-label", "First-intake mobile-endpoint trajectory consumer");
  return root;
}

function renderPanel(
  root: HTMLElement,
  state: FirstIntakeMobileEndpointTrajectoryConsumerState
): void {
  root.dataset.scenarioId = state.scenarioId;
  root.dataset.addressResolution = state.addressResolution;
  root.dataset.activeScenarioId = state.activeScenarioId;
  root.dataset.consumerState = state.consumerState;
  root.dataset.consumerSurface = state.consumerSurface;
  root.dataset.acceptedCorridorPackageId = state.acceptedCorridorPackageId;
  root.dataset.packageNature = state.packageNature;
  root.dataset.waypointCount = String(state.waypointCount);
  root.dataset.windowStartUtc = state.windowStartUtc;
  root.dataset.windowEndUtc = state.windowEndUtc;
  root.dataset.sourceFamily = state.sourceFamily;
  root.dataset.sourceService = state.sourceService;
  root.dataset.coordinateReference = state.coordinateReference;
  root.dataset.corridorTruth = state.corridorTruth;
  root.dataset.equipageTruth = state.equipageTruth;
  root.dataset.serviceTruth = state.serviceTruth;
  root.dataset.trajectoryProofSeam = state.trajectoryProofSeam;
  root.dataset.proofSeam = state.proofSeam;
  root.dataset.lineageActiveOwner = state.sourceLineage.activeOwner;
  root.dataset.lineageRuntimeTrajectorySeam =
    state.sourceLineage.runtimeTrajectorySeam;
  root.dataset.lineageRuntimeTrajectoryRead =
    state.sourceLineage.runtimeTrajectoryRead;
  root.dataset.lineageRawPackageSideReadOwnership =
    state.sourceLineage.rawPackageSideReadOwnership;

  root.innerHTML = `
    <div class="first-intake-mobile-endpoint-trajectory-consumer__eyebrow">
      Active Corridor Consumer
    </div>
    <h2 class="first-intake-mobile-endpoint-trajectory-consumer__heading">
      Accepted corridor package stays a historical replay package.
    </h2>
    <p class="first-intake-mobile-endpoint-trajectory-consumer__summary">
      This runtime-local panel reads the ingested first-intake mobile-endpoint trajectory seam and keeps corridor provenance separate from tail equipage or active onboard service claims.
    </p>
    <div class="first-intake-mobile-endpoint-trajectory-consumer__facts">
      <article class="first-intake-mobile-endpoint-trajectory-consumer__fact" data-fact="package-id">
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-label">Accepted package id</div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-value">
          ${state.acceptedCorridorPackageId}
        </div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-detail">
          Active first-intake owner only
        </div>
      </article>
      <article class="first-intake-mobile-endpoint-trajectory-consumer__fact" data-fact="package-nature">
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-label">Package nature</div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-value">
          historical replay package
        </div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-detail">
          ${state.waypointCount} waypoints preserved as ${state.coordinateReference} corridor provenance
        </div>
      </article>
      <article class="first-intake-mobile-endpoint-trajectory-consumer__fact" data-fact="window-provenance">
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-label">Waypoint/window provenance</div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-value">
          ${state.windowStartUtc} -> ${state.windowEndUtc}
        </div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-detail">
          ${state.sourceFamily} via ${state.sourceService}
        </div>
      </article>
      <article class="first-intake-mobile-endpoint-trajectory-consumer__fact" data-fact="truth-boundary">
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-label">Truth boundary</div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-value">
          ${state.equipageTruth} / ${state.serviceTruth}
        </div>
        <div class="first-intake-mobile-endpoint-trajectory-consumer__fact-detail">
          Corridor truth stays ${state.corridorTruth}
        </div>
      </article>
    </div>
  `;
}

function notifyListeners(
  listeners: ReadonlySet<
    (state: FirstIntakeMobileEndpointTrajectoryConsumerState) => void
  >,
  state: FirstIntakeMobileEndpointTrajectoryConsumerState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function resolvePackageNature(trajectoryTruthKind: string): "historical-replay-package" {
  if (trajectoryTruthKind !== "historical-corridor-package") {
    throw new Error(
      "First-intake mobile-endpoint trajectory consumer requires historical-corridor-package truth."
    );
  }

  return "historical-replay-package";
}

export function createFirstIntakeMobileEndpointTrajectoryConsumerController({
  hudFrame,
  scenarioSession,
  scenarioSurface,
  trajectoryController,
  mountPanel = true
}: FirstIntakeMobileEndpointTrajectoryConsumerControllerOptions): FirstIntakeMobileEndpointTrajectoryConsumerController {
  const listeners = new Set<
    (state: FirstIntakeMobileEndpointTrajectoryConsumerState) => void
  >();
  const panelRoot = createPanelRoot();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const runtimeState = scenarioSurface.getState();
  const activeScenario = scenarioSession.getCurrentScenario();

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "First-intake mobile-endpoint trajectory consumer only mounts for the matched addressed case."
    );
  }

  if (!activeScenario || activeScenario.scenarioId !== addressedEntry.scenarioId) {
    throw new Error(
      "First-intake mobile-endpoint trajectory consumer requires the addressed case to own the active scenario session."
    );
  }

  const createState = (): FirstIntakeMobileEndpointTrajectoryConsumerState => {
    const trajectoryState = trajectoryController.getState();

    if (trajectoryState.scenarioId !== addressedEntry.scenarioId) {
      throw new Error(
        "First-intake mobile-endpoint trajectory consumer requires the dedicated trajectory runtime seam for the addressed case."
      );
    }

    if (trajectoryState.addressResolution !== "matched") {
      throw new Error(
        "First-intake mobile-endpoint trajectory consumer requires the matched addressed trajectory seam."
      );
    }

    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      activeScenarioId: activeScenario.scenarioId,
      consumerState: "active-addressed-case",
      consumerSurface: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONSUMER_SURFACE,
      panelVisible: panelRoot.isConnected,
      acceptedCorridorPackageId: trajectoryState.trajectory.trajectory.recordId,
      packageNature: resolvePackageNature(
        trajectoryState.trajectory.trajectory.truthKind
      ),
      waypointCount: trajectoryState.trajectory.trajectory.waypointCount,
      windowStartUtc: trajectoryState.trajectory.trajectory.windowStartUtc,
      windowEndUtc: trajectoryState.trajectory.trajectory.windowEndUtc,
      sourceFamily: trajectoryState.trajectory.trajectory.sourceFamily,
      sourceService: trajectoryState.trajectory.trajectory.sourceService,
      coordinateReference:
        trajectoryState.trajectory.trajectory.coordinateReference,
      corridorTruth: trajectoryState.trajectory.truthBoundary.corridorTruth,
      equipageTruth: trajectoryState.trajectory.truthBoundary.equipageTruth,
      serviceTruth: trajectoryState.trajectory.truthBoundary.serviceTruth,
      trajectoryProofSeam: trajectoryState.proofSeam,
      proofSeam:
        FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_CONSUMER_PROOF_SEAM,
      sourceLineage: {
        activeOwner: "createFirstIntakeActiveScenarioSession",
        runtimeTrajectorySeam:
          "createFirstIntakeMobileEndpointTrajectoryController",
        runtimeTrajectoryRead: "trajectoryController.getState().trajectory",
        rawPackageSideReadOwnership: "forbidden"
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
    getState(): FirstIntakeMobileEndpointTrajectoryConsumerState {
      return createState();
    },
    subscribe(
      listener: (state: FirstIntakeMobileEndpointTrajectoryConsumerState) => void
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
