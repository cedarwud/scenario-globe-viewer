import type {
  FirstIntakeRuntimeScenarioSurface,
  ScenarioSession
} from "../features/scenario";
import { createScenarioRuntimeSession } from "./scenario-runtime-session";

const FIRST_INTAKE_ACTIVE_SCENARIO_BINDINGS = {
  setPresentation(): void {},
  setTime(): void {}
};

export function createFirstIntakeActiveScenarioSession(
  scenarioSurface: FirstIntakeRuntimeScenarioSurface
): ScenarioSession {
  const addressedEntry = scenarioSurface.getAddressedEntry();

  return createScenarioRuntimeSession({
    definitions: scenarioSurface
      .listEntries()
      .map((entry) => entry.definition),
    initialScenarioId: addressedEntry.scenarioId,
    bindings: FIRST_INTAKE_ACTIVE_SCENARIO_BINDINGS
  });
}
