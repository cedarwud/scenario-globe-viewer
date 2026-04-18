import {
  createScenarioSession,
  type ScenarioDefinition,
  type ScenarioSession
} from "../features/scenario";
import {
  createScenarioRuntimePlanDriver,
  createViewerScenarioRuntimePlanDriver,
  type ScenarioRuntimePlanBindings,
  type ScenarioRuntimePlanDriverOptions
} from "./scenario-runtime-plan-driver";

export interface ScenarioRuntimeSessionOptions {
  definitions: ReadonlyArray<ScenarioDefinition>;
  bindings: ScenarioRuntimePlanBindings;
}

export interface ViewerScenarioRuntimeSessionOptions
  extends ScenarioRuntimePlanDriverOptions {
  definitions: ReadonlyArray<ScenarioDefinition>;
}

// This is the first bounded runtime consumer of the Phase 6.1 scenario session
// seam. It composes the repo-owned session host with explicit runtime bindings,
// but still leaves top-level orchestration and app-shell ownership to a later
// slice instead of wiring anything through main.ts.
export function createScenarioRuntimeSession({
  definitions,
  bindings
}: ScenarioRuntimeSessionOptions): ScenarioSession {
  return createScenarioSession(
    definitions,
    createScenarioRuntimePlanDriver(bindings)
  );
}

export function createViewerScenarioRuntimeSession({
  definitions,
  ...driverOptions
}: ViewerScenarioRuntimeSessionOptions): ScenarioSession {
  return createScenarioSession(
    definitions,
    createViewerScenarioRuntimePlanDriver(driverOptions)
  );
}
