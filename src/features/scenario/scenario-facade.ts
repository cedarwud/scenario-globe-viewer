import type { ScenarioDefinition } from "./scenario";
import {
  createScenarioSwitchPlan,
  createScenarioUnloadPlan,
  resolveScenarioInputs,
  type ScenarioResolvedInputs,
  type ScenarioSwitchPlan,
  type ScenarioUnloadPlan
} from "./resolve-scenario-inputs";

export interface ScenarioFacadeState {
  scenarioIds: ReadonlyArray<string>;
  currentScenarioId?: string;
}

export interface ScenarioSelectionResult {
  state: ScenarioFacadeState;
  selectedScenario: ScenarioResolvedInputs;
  switchPlan: ScenarioSwitchPlan;
}

export interface ScenarioClearResult {
  state: ScenarioFacadeState;
  unloadPlan?: ScenarioUnloadPlan;
}

export interface ScenarioFacade {
  getState(): ScenarioFacadeState;
  listScenarios(): ReadonlyArray<ScenarioDefinition>;
  getScenario(id: string): ScenarioDefinition;
  previewScenario(id: string): ScenarioResolvedInputs;
  selectScenario(id: string): ScenarioSelectionResult;
  clearScenario(): ScenarioClearResult;
}

export interface ScenarioFacadeOptions {
  initialScenarioId?: string;
}

function cloneScenarioFacadeState(
  scenarioIds: ReadonlyArray<string>,
  currentScenarioId: string | undefined
): ScenarioFacadeState {
  return {
    scenarioIds: [...scenarioIds],
    ...(currentScenarioId ? { currentScenarioId } : {})
  };
}

function resolveScenarioDefinition(
  definitionsById: ReadonlyMap<string, ScenarioDefinition>,
  id: string
): ScenarioDefinition {
  const definition = definitionsById.get(id);
  if (!definition) {
    throw new Error(`Unknown scenario id: ${id}`);
  }
  return definition;
}

export function createScenarioFacade(
  definitions: ReadonlyArray<ScenarioDefinition>,
  { initialScenarioId }: ScenarioFacadeOptions = {}
): ScenarioFacade {
  const definitionsById = new Map<string, ScenarioDefinition>();
  const scenarioIds: string[] = [];

  for (const definition of definitions) {
    if (definitionsById.has(definition.id)) {
      throw new Error(`Duplicate scenario id: ${definition.id}`);
    }
    definitionsById.set(definition.id, definition);
    scenarioIds.push(definition.id);
  }

  if (initialScenarioId) {
    resolveScenarioDefinition(definitionsById, initialScenarioId);
  }

  let currentScenarioId = initialScenarioId;

  return {
    getState(): ScenarioFacadeState {
      return cloneScenarioFacadeState(scenarioIds, currentScenarioId);
    },
    listScenarios(): ReadonlyArray<ScenarioDefinition> {
      return scenarioIds.map((id) => resolveScenarioDefinition(definitionsById, id));
    },
    getScenario(id: string): ScenarioDefinition {
      return resolveScenarioDefinition(definitionsById, id);
    },
    previewScenario(id: string): ScenarioResolvedInputs {
      return resolveScenarioInputs(resolveScenarioDefinition(definitionsById, id));
    },
    selectScenario(id: string): ScenarioSelectionResult {
      const nextDefinition = resolveScenarioDefinition(definitionsById, id);
      const currentDefinition = currentScenarioId
        ? resolveScenarioDefinition(definitionsById, currentScenarioId)
        : undefined;
      const switchPlan = createScenarioSwitchPlan(currentDefinition, nextDefinition);

      currentScenarioId = nextDefinition.id;

      return {
        state: cloneScenarioFacadeState(scenarioIds, currentScenarioId),
        selectedScenario: resolveScenarioInputs(nextDefinition),
        switchPlan
      };
    },
    clearScenario(): ScenarioClearResult {
      if (!currentScenarioId) {
        return {
          state: cloneScenarioFacadeState(scenarioIds, undefined)
        };
      }

      const currentDefinition = resolveScenarioDefinition(
        definitionsById,
        currentScenarioId
      );
      const unloadPlan = createScenarioUnloadPlan(currentDefinition);

      currentScenarioId = undefined;

      return {
        state: cloneScenarioFacadeState(scenarioIds, undefined),
        unloadPlan
      };
    }
  };
}
