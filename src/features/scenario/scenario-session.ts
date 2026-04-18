import type { ScenarioDefinition } from "./scenario";
import { createScenarioFacade, type ScenarioFacade } from "./scenario-facade";
import {
  executeScenarioSwitchPlan,
  executeScenarioUnloadPlan,
  type ScenarioPlanDriver,
  type ScenarioSwitchExecutionResult,
  type ScenarioUnloadExecutionResult
} from "./scenario-plan-runner";
import {
  createScenarioSwitchPlan,
  createScenarioUnloadPlan,
  resolveScenarioInputs,
  type ScenarioResolvedInputs,
  type ScenarioSwitchPlan,
  type ScenarioUnloadPlan
} from "./resolve-scenario-inputs";

export interface ScenarioSessionState {
  scenarioIds: ReadonlyArray<string>;
  currentScenarioId?: string;
  currentScenario?: ScenarioResolvedInputs;
}

export interface ScenarioSessionSelectResult {
  state: ScenarioSessionState;
  selectedScenario: ScenarioResolvedInputs;
  switchPlan: ScenarioSwitchPlan;
  execution: ScenarioSwitchExecutionResult;
}

export interface ScenarioSessionClearResult {
  state: ScenarioSessionState;
  unloadPlan?: ScenarioUnloadPlan;
  execution?: ScenarioUnloadExecutionResult;
}

export interface ScenarioSession {
  getState(): ScenarioSessionState;
  listScenarios(): ReadonlyArray<ScenarioDefinition>;
  getScenario(id: string): ScenarioDefinition;
  previewScenario(id: string): ScenarioResolvedInputs;
  getCurrentScenario(): ScenarioResolvedInputs | undefined;
  selectScenario(id: string): Promise<ScenarioSessionSelectResult>;
  clearScenario(): Promise<ScenarioSessionClearResult>;
}

export interface ScenarioSessionOptions {
  initialScenarioId?: string;
}

function cloneScenarioSessionState(
  facade: ScenarioFacade,
  currentScenarioId: string | undefined
): ScenarioSessionState {
  const facadeState = facade.getState();
  const currentScenario = currentScenarioId
    ? facade.previewScenario(currentScenarioId)
    : undefined;

  return {
    scenarioIds: [...facadeState.scenarioIds],
    ...(currentScenarioId ? { currentScenarioId } : {}),
    ...(currentScenario ? { currentScenario } : {})
  };
}

export function createScenarioSession(
  definitions: ReadonlyArray<ScenarioDefinition>,
  driver: ScenarioPlanDriver,
  { initialScenarioId }: ScenarioSessionOptions = {}
): ScenarioSession {
  const facade = createScenarioFacade(definitions);

  if (initialScenarioId) {
    facade.getScenario(initialScenarioId);
  }

  let currentScenarioId = initialScenarioId;

  return {
    getState(): ScenarioSessionState {
      return cloneScenarioSessionState(facade, currentScenarioId);
    },
    listScenarios(): ReadonlyArray<ScenarioDefinition> {
      return facade.listScenarios();
    },
    getScenario(id: string): ScenarioDefinition {
      return facade.getScenario(id);
    },
    previewScenario(id: string): ScenarioResolvedInputs {
      return facade.previewScenario(id);
    },
    getCurrentScenario(): ScenarioResolvedInputs | undefined {
      return currentScenarioId ? facade.previewScenario(currentScenarioId) : undefined;
    },
    async selectScenario(id: string): Promise<ScenarioSessionSelectResult> {
      const nextDefinition = facade.getScenario(id);
      const currentDefinition = currentScenarioId
        ? facade.getScenario(currentScenarioId)
        : undefined;
      const switchPlan = createScenarioSwitchPlan(currentDefinition, nextDefinition);
      const execution = await executeScenarioSwitchPlan(switchPlan, driver);

      currentScenarioId = nextDefinition.id;

      return {
        state: cloneScenarioSessionState(facade, currentScenarioId),
        selectedScenario: resolveScenarioInputs(nextDefinition),
        switchPlan,
        execution
      };
    },
    async clearScenario(): Promise<ScenarioSessionClearResult> {
      if (!currentScenarioId) {
        return {
          state: cloneScenarioSessionState(facade, undefined)
        };
      }

      const currentDefinition = facade.getScenario(currentScenarioId);
      const unloadPlan = createScenarioUnloadPlan(currentDefinition);
      const execution = await executeScenarioUnloadPlan(unloadPlan, driver);

      currentScenarioId = undefined;

      return {
        state: cloneScenarioSessionState(facade, undefined),
        unloadPlan,
        execution
      };
    }
  };
}
