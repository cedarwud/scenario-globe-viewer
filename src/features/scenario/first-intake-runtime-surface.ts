import {
  adaptFirstIntakeScenarioSeedToDefinition,
  type FirstIntakeScenarioSeed
} from "./scenario-seed-adapter";
import { createScenarioFacade } from "./scenario-facade";
import type { ScenarioDefinition } from "./scenario";
import type { ScenarioResolvedInputs } from "./resolve-scenario-inputs";

export const FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM =
  "firstIntakeScenarioId";
export const FIRST_INTAKE_RUNTIME_STATE = "active-addressed-case";
export const FIRST_INTAKE_RUNTIME_ADOPTION_MODE =
  "url-addressed-live-runtime-entry";
export const FIRST_INTAKE_RUNTIME_SEED_PATH =
  "itri/multi-orbit/prep/seeds/oneweb-intelsat-geo-aviation.seed.json";

export type FirstIntakeRuntimeAddressResolution =
  | "default"
  | "matched"
  | "unsupported";

export interface FirstIntakeRuntimeScenarioEntry {
  scenarioId: string;
  definition: ScenarioDefinition;
  resolvedInputs: ScenarioResolvedInputs;
  addressQuery: string;
}

export interface FirstIntakeRuntimeScenarioSurfaceState {
  runtimeState: typeof FIRST_INTAKE_RUNTIME_STATE;
  scenarioIds: ReadonlyArray<string>;
  queryParam: typeof FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM;
  resolvedScenarioId: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  requestedScenarioId?: string;
  adoptionMode: typeof FIRST_INTAKE_RUNTIME_ADOPTION_MODE;
  sourceLineage: {
    seedPath: typeof FIRST_INTAKE_RUNTIME_SEED_PATH;
    adapter: "adaptFirstIntakeScenarioSeedToDefinition";
    resolver: "scenario-facade.previewScenario";
  };
}

export interface FirstIntakeRuntimeScenarioSurface {
  getState(): FirstIntakeRuntimeScenarioSurfaceState;
  listEntries(): ReadonlyArray<FirstIntakeRuntimeScenarioEntry>;
  getEntry(scenarioId: string): FirstIntakeRuntimeScenarioEntry;
  getAddressedEntry(): FirstIntakeRuntimeScenarioEntry;
}

export interface FirstIntakeRuntimeScenarioSurfaceOptions {
  seeds: ReadonlyArray<FirstIntakeScenarioSeed>;
  requestedScenarioId?: string;
}

function buildAddressQuery(scenarioId: string): string {
  return `${FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM}=${encodeURIComponent(
    scenarioId
  )}`;
}

function normalizeRequestedScenarioId(
  requestedScenarioId: string | undefined
): string | undefined {
  if (requestedScenarioId === undefined) {
    return undefined;
  }

  const normalized = requestedScenarioId.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function createFirstIntakeRuntimeScenarioSurface({
  seeds,
  requestedScenarioId
}: FirstIntakeRuntimeScenarioSurfaceOptions): FirstIntakeRuntimeScenarioSurface {
  const definitions = seeds.map((seed) =>
    adaptFirstIntakeScenarioSeedToDefinition(seed)
  );
  const facade = createScenarioFacade(definitions);
  const scenarioIds = [...facade.getState().scenarioIds];
  const defaultScenarioId = scenarioIds[0];

  if (!defaultScenarioId) {
    throw new Error(
      "First-intake runtime surface requires at least one adapted scenario."
    );
  }

  const normalizedRequestedScenarioId =
    normalizeRequestedScenarioId(requestedScenarioId);
  const resolvedScenarioId =
    normalizedRequestedScenarioId &&
    scenarioIds.includes(normalizedRequestedScenarioId)
      ? normalizedRequestedScenarioId
      : defaultScenarioId;
  const addressResolution: FirstIntakeRuntimeAddressResolution =
    normalizedRequestedScenarioId === undefined
      ? "default"
      : resolvedScenarioId === normalizedRequestedScenarioId
        ? "matched"
        : "unsupported";

  const buildEntry = (scenarioId: string): FirstIntakeRuntimeScenarioEntry => ({
    scenarioId,
    definition: facade.getScenario(scenarioId),
    resolvedInputs: facade.previewScenario(scenarioId),
    addressQuery: buildAddressQuery(scenarioId)
  });

  return {
    getState(): FirstIntakeRuntimeScenarioSurfaceState {
      return {
        runtimeState: FIRST_INTAKE_RUNTIME_STATE,
        scenarioIds: [...scenarioIds],
        queryParam: FIRST_INTAKE_RUNTIME_ADDRESS_QUERY_PARAM,
        resolvedScenarioId,
        addressResolution,
        ...(normalizedRequestedScenarioId
          ? { requestedScenarioId: normalizedRequestedScenarioId }
          : {}),
        adoptionMode: FIRST_INTAKE_RUNTIME_ADOPTION_MODE,
        sourceLineage: {
          seedPath: FIRST_INTAKE_RUNTIME_SEED_PATH,
          adapter: "adaptFirstIntakeScenarioSeedToDefinition",
          resolver: "scenario-facade.previewScenario"
        }
      };
    },
    listEntries(): ReadonlyArray<FirstIntakeRuntimeScenarioEntry> {
      return scenarioIds.map((scenarioId) => buildEntry(scenarioId));
    },
    getEntry(scenarioId: string): FirstIntakeRuntimeScenarioEntry {
      return buildEntry(scenarioId);
    },
    getAddressedEntry(): FirstIntakeRuntimeScenarioEntry {
      return buildEntry(resolvedScenarioId);
    }
  };
}
