import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type {
  NearbySecondEndpointSourceEntry
} from "../features/nearby-second-endpoint/nearby-second-endpoint";
import {
  createFirstIntakeNearbySecondEndpointSourceCatalog,
  resolveFirstIntakeNearbySecondEndpointSourceEntry,
  type FirstIntakeNearbySecondEndpointSourceCatalog
} from "./first-intake-nearby-second-endpoint-source";

const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_TELEMETRY_KEYS = [
  "firstIntakeNearbySecondEndpointState",
  "firstIntakeNearbySecondEndpointScenarioId",
  "firstIntakeNearbySecondEndpointEndpointId",
  "firstIntakeNearbySecondEndpointEndpointLabel",
  "firstIntakeNearbySecondEndpointEndpointType",
  "firstIntakeNearbySecondEndpointGeographyBucket",
  "firstIntakeNearbySecondEndpointPositionPrecision",
  "firstIntakeNearbySecondEndpointCoordinateReference",
  "firstIntakeNearbySecondEndpointNarrativeRole",
  "firstIntakeNearbySecondEndpointActiveGatewayAssignment",
  "firstIntakeNearbySecondEndpointPairSpecificGeoTeleport",
  "firstIntakeNearbySecondEndpointMeasurementTruth",
  "firstIntakeNearbySecondEndpointProofSeam",
  "firstIntakeNearbySecondEndpointSourceLineage"
] as const;

export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_RUNTIME_STATE =
  "accepted-nearby-second-endpoint-package-ingested";
export const FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpoint";

export interface FirstIntakeNearbySecondEndpointRuntimeState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  runtimeState: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_RUNTIME_STATE;
  contractSeam:
    FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["contractSeam"];
  ingestionSeam:
    FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["adapter"];
  proofSeam: typeof FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PROOF_SEAM;
  adoptionMode: FirstIntakeNearbySecondEndpointSourceCatalog["adoptionMode"];
  endpoint: NearbySecondEndpointSourceEntry;
  sourceLineage: {
    packageRoot:
      FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["packageRoot"];
    authorityPackagePath:
      FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["authorityPackagePath"];
    positionPath:
      FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["positionPath"];
    nonClaimsPath:
      FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["nonClaimsPath"];
    adapter: FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["adapter"];
    contractSeam:
      FirstIntakeNearbySecondEndpointSourceCatalog["sourceLineage"]["contractSeam"];
  };
}

export interface FirstIntakeNearbySecondEndpointController {
  getState(): FirstIntakeNearbySecondEndpointRuntimeState;
  subscribe(
    listener: (state: FirstIntakeNearbySecondEndpointRuntimeState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakeNearbySecondEndpointControllerOptions {
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
}

function createSourceLineageText(
  state: FirstIntakeNearbySecondEndpointRuntimeState
): string {
  return [
    state.sourceLineage.packageRoot,
    state.sourceLineage.positionPath,
    state.sourceLineage.adapter,
    state.sourceLineage.contractSeam
  ].join(" -> ");
}

function syncTelemetry(
  state: FirstIntakeNearbySecondEndpointRuntimeState
): void {
  syncDocumentTelemetry({
    firstIntakeNearbySecondEndpointState: state.runtimeState,
    firstIntakeNearbySecondEndpointScenarioId: state.scenarioId,
    firstIntakeNearbySecondEndpointEndpointId: state.endpoint.endpointId,
    firstIntakeNearbySecondEndpointEndpointLabel: state.endpoint.endpointLabel,
    firstIntakeNearbySecondEndpointEndpointType: state.endpoint.endpointType,
    firstIntakeNearbySecondEndpointGeographyBucket:
      state.endpoint.geographyBucket,
    firstIntakeNearbySecondEndpointPositionPrecision:
      state.endpoint.positionPrecision,
    firstIntakeNearbySecondEndpointCoordinateReference:
      state.endpoint.coordinateReference,
    firstIntakeNearbySecondEndpointNarrativeRole: state.endpoint.narrativeRole,
    firstIntakeNearbySecondEndpointActiveGatewayAssignment:
      state.endpoint.truthBoundary.activeGatewayAssignment,
    firstIntakeNearbySecondEndpointPairSpecificGeoTeleport:
      state.endpoint.truthBoundary.pairSpecificGeoTeleport,
    firstIntakeNearbySecondEndpointMeasurementTruth:
      state.endpoint.truthBoundary.measurementTruth,
    firstIntakeNearbySecondEndpointProofSeam: state.proofSeam,
    firstIntakeNearbySecondEndpointSourceLineage: createSourceLineageText(state)
  });
}

function resolveState(
  scenarioSurface: FirstIntakeRuntimeScenarioSurface,
  sourceCatalog: FirstIntakeNearbySecondEndpointSourceCatalog
): FirstIntakeNearbySecondEndpointRuntimeState {
  const runtimeScenarioState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const endpoint = resolveFirstIntakeNearbySecondEndpointSourceEntry(
    sourceCatalog,
    addressedEntry.scenarioId as NearbySecondEndpointSourceEntry["scenarioId"]
  );

  return {
    scenarioId: addressedEntry.scenarioId,
    scenarioLabel: addressedEntry.definition.label,
    addressQuery: addressedEntry.addressQuery,
    addressResolution: runtimeScenarioState.addressResolution,
    runtimeState: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_RUNTIME_STATE,
    contractSeam: sourceCatalog.sourceLineage.contractSeam,
    ingestionSeam: sourceCatalog.sourceLineage.adapter,
    proofSeam: FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_PROOF_SEAM,
    adoptionMode: sourceCatalog.adoptionMode,
    endpoint,
    sourceLineage: {
      packageRoot: sourceCatalog.sourceLineage.packageRoot,
      authorityPackagePath: sourceCatalog.sourceLineage.authorityPackagePath,
      positionPath: sourceCatalog.sourceLineage.positionPath,
      nonClaimsPath: sourceCatalog.sourceLineage.nonClaimsPath,
      adapter: sourceCatalog.sourceLineage.adapter,
      contractSeam: sourceCatalog.sourceLineage.contractSeam
    }
  };
}

export function createFirstIntakeNearbySecondEndpointController({
  scenarioSurface
}: FirstIntakeNearbySecondEndpointControllerOptions): FirstIntakeNearbySecondEndpointController {
  const listeners = new Set<
    (state: FirstIntakeNearbySecondEndpointRuntimeState) => void
  >();
  const sourceCatalog = createFirstIntakeNearbySecondEndpointSourceCatalog();
  const state = resolveState(scenarioSurface, sourceCatalog);
  syncTelemetry(state);

  return {
    getState(): FirstIntakeNearbySecondEndpointRuntimeState {
      return {
        ...state,
        endpoint: {
          ...state.endpoint,
          coordinates: {
            ...state.endpoint.coordinates
          },
          truthBoundary: {
            ...state.endpoint.truthBoundary
          }
        },
        sourceLineage: {
          ...state.sourceLineage
        }
      };
    },
    subscribe(
      listener: (state: FirstIntakeNearbySecondEndpointRuntimeState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      clearDocumentTelemetry(FIRST_INTAKE_NEARBY_SECOND_ENDPOINT_TELEMETRY_KEYS);
    }
  };
}
