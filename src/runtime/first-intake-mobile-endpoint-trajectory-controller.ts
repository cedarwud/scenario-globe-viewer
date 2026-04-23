import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type {
  MobileEndpointTrajectorySourceEntry
} from "../features/mobile-endpoint-trajectory/mobile-endpoint-trajectory";
import {
  createFirstIntakeMobileEndpointTrajectorySourceCatalog,
  resolveFirstIntakeMobileEndpointTrajectorySourceEntry,
  type FirstIntakeMobileEndpointTrajectorySourceCatalog
} from "./first-intake-mobile-endpoint-trajectory-source";

const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_TELEMETRY_KEYS = [
  "firstIntakeMobileTrajectoryState",
  "firstIntakeMobileTrajectoryScenarioId",
  "firstIntakeMobileTrajectoryEndpointId",
  "firstIntakeMobileTrajectoryRecordId",
  "firstIntakeMobileTrajectoryWaypointCount",
  "firstIntakeMobileTrajectoryCoordinateReference",
  "firstIntakeMobileTrajectoryCorridorTruth",
  "firstIntakeMobileTrajectoryEquipageTruth",
  "firstIntakeMobileTrajectoryServiceTruth",
  "firstIntakeMobileTrajectoryProofSeam",
  "firstIntakeMobileTrajectorySourceLineage"
] as const;

export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_RUNTIME_STATE =
  "accepted-corridor-package-ingested";
export const FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectory";

export interface FirstIntakeMobileEndpointTrajectoryRuntimeState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  runtimeState: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_RUNTIME_STATE;
  contractSeam:
    FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["contractSeam"];
  ingestionSeam:
    FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["adapter"];
  proofSeam: typeof FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PROOF_SEAM;
  adoptionMode: FirstIntakeMobileEndpointTrajectorySourceCatalog["adoptionMode"];
  trajectory: MobileEndpointTrajectorySourceEntry;
  sourceLineage: {
    packageRoot:
      FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["packageRoot"];
    freezeRecordPath:
      FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["freezeRecordPath"];
    sourceRecordPath:
      FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["sourceRecordPath"];
    truthBoundaryPath:
      FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["truthBoundaryPath"];
    replayArtifactPath:
      FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["replayArtifactPath"];
    adapter: FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["adapter"];
    contractSeam:
      FirstIntakeMobileEndpointTrajectorySourceCatalog["sourceLineage"]["contractSeam"];
  };
}

export interface FirstIntakeMobileEndpointTrajectoryController {
  getState(): FirstIntakeMobileEndpointTrajectoryRuntimeState;
  subscribe(
    listener: (state: FirstIntakeMobileEndpointTrajectoryRuntimeState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeMobileEndpointTrajectoryControllerOptions {
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
}

function createSourceLineageText(
  state: FirstIntakeMobileEndpointTrajectoryRuntimeState
): string {
  return [
    state.sourceLineage.packageRoot,
    state.sourceLineage.sourceRecordPath,
    state.sourceLineage.adapter,
    state.sourceLineage.contractSeam
  ].join(" -> ");
}

function syncTelemetry(
  state: FirstIntakeMobileEndpointTrajectoryRuntimeState
): void {
  syncDocumentTelemetry({
    firstIntakeMobileTrajectoryState: state.runtimeState,
    firstIntakeMobileTrajectoryScenarioId: state.scenarioId,
    firstIntakeMobileTrajectoryEndpointId: state.trajectory.endpointId,
    firstIntakeMobileTrajectoryRecordId: state.trajectory.trajectory.recordId,
    firstIntakeMobileTrajectoryWaypointCount: String(
      state.trajectory.trajectory.waypointCount
    ),
    firstIntakeMobileTrajectoryCoordinateReference:
      state.trajectory.trajectory.coordinateReference,
    firstIntakeMobileTrajectoryCorridorTruth:
      state.trajectory.truthBoundary.corridorTruth,
    firstIntakeMobileTrajectoryEquipageTruth:
      state.trajectory.truthBoundary.equipageTruth,
    firstIntakeMobileTrajectoryServiceTruth:
      state.trajectory.truthBoundary.serviceTruth,
    firstIntakeMobileTrajectoryProofSeam: state.proofSeam,
    firstIntakeMobileTrajectorySourceLineage: createSourceLineageText(state)
  });
}

function resolveState(
  scenarioSurface: FirstIntakeRuntimeScenarioSurface,
  sourceCatalog: FirstIntakeMobileEndpointTrajectorySourceCatalog
): FirstIntakeMobileEndpointTrajectoryRuntimeState {
  const runtimeScenarioState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const trajectory = resolveFirstIntakeMobileEndpointTrajectorySourceEntry(
    sourceCatalog,
    addressedEntry.scenarioId
  );

  return {
    scenarioId: addressedEntry.scenarioId,
    scenarioLabel: addressedEntry.definition.label,
    addressQuery: addressedEntry.addressQuery,
    addressResolution: runtimeScenarioState.addressResolution,
    runtimeState: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_RUNTIME_STATE,
    contractSeam: sourceCatalog.sourceLineage.contractSeam,
    ingestionSeam: sourceCatalog.sourceLineage.adapter,
    proofSeam: FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_PROOF_SEAM,
    adoptionMode: sourceCatalog.adoptionMode,
    trajectory,
    sourceLineage: {
      packageRoot: sourceCatalog.sourceLineage.packageRoot,
      freezeRecordPath: sourceCatalog.sourceLineage.freezeRecordPath,
      sourceRecordPath: sourceCatalog.sourceLineage.sourceRecordPath,
      truthBoundaryPath: sourceCatalog.sourceLineage.truthBoundaryPath,
      replayArtifactPath: sourceCatalog.sourceLineage.replayArtifactPath,
      adapter: sourceCatalog.sourceLineage.adapter,
      contractSeam: sourceCatalog.sourceLineage.contractSeam
    }
  };
}

export function createFirstIntakeMobileEndpointTrajectoryController({
  scenarioSurface
}: FirstIntakeMobileEndpointTrajectoryControllerOptions): FirstIntakeMobileEndpointTrajectoryController {
  const listeners = new Set<
    (state: FirstIntakeMobileEndpointTrajectoryRuntimeState) => void
  >();
  const sourceCatalog = createFirstIntakeMobileEndpointTrajectorySourceCatalog();
  const state = resolveState(scenarioSurface, sourceCatalog);
  syncTelemetry(state);

  return {
    getState(): FirstIntakeMobileEndpointTrajectoryRuntimeState {
      return {
        ...state,
        trajectory: {
          ...state.trajectory,
          trajectory: {
            ...state.trajectory.trajectory,
            points: state.trajectory.trajectory.points.map((point) => ({ ...point }))
          },
          truthBoundary: {
            ...state.trajectory.truthBoundary
          }
        },
        sourceLineage: {
          ...state.sourceLineage
        }
      };
    },
    subscribe(
      listener: (state: FirstIntakeMobileEndpointTrajectoryRuntimeState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      clearDocumentTelemetry(FIRST_INTAKE_MOBILE_ENDPOINT_TRAJECTORY_TELEMETRY_KEYS);
    }
  };
}
