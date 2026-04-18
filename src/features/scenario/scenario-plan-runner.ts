import type {
  ScenarioResolvedTimeInput,
  ScenarioSwitchPlan,
  ScenarioSwitchPlanStep,
  ScenarioUnloadPlan,
  ScenarioUnloadPlanStep
} from "./resolve-scenario-inputs";
import type {
  ScenarioPresentationRef,
  ScenarioSatelliteSourceRef,
  ScenarioSiteDatasetRef,
  ScenarioValidationRef
} from "./scenario";

export interface ScenarioPlanDriver {
  detachValidation(): Promise<void> | void;
  detachSiteDataset(): Promise<void> | void;
  detachSatelliteSource(): Promise<void> | void;
  setPresentation(presentation: ScenarioPresentationRef): Promise<void> | void;
  setTime(time: ScenarioResolvedTimeInput): Promise<void> | void;
  attachSatelliteSource(
    satellite: ScenarioSatelliteSourceRef
  ): Promise<void> | void;
  attachSiteDataset(siteDataset: ScenarioSiteDatasetRef): Promise<void> | void;
  attachValidation(validation: ScenarioValidationRef): Promise<void> | void;
}

export interface ScenarioPlanExecutionTraceStep {
  kind: ScenarioSwitchPlanStep["kind"];
}

export interface ScenarioSwitchExecutionResult {
  fromScenarioId?: string;
  toScenarioId: string;
  appliedSteps: ReadonlyArray<ScenarioPlanExecutionTraceStep>;
}

export interface ScenarioUnloadExecutionResult {
  fromScenarioId: string;
  appliedSteps: ReadonlyArray<ScenarioPlanExecutionTraceStep>;
}

async function executeScenarioStep(
  step: ScenarioSwitchPlanStep | ScenarioUnloadPlanStep,
  driver: ScenarioPlanDriver
): Promise<void> {
  switch (step.kind) {
    case "detach-validation":
      await driver.detachValidation();
      return;
    case "detach-site-dataset":
      await driver.detachSiteDataset();
      return;
    case "detach-satellite-source":
      await driver.detachSatelliteSource();
      return;
    case "set-presentation":
      await driver.setPresentation(step.presentation);
      return;
    case "set-time":
      await driver.setTime(step.time);
      return;
    case "attach-satellite-source":
      await driver.attachSatelliteSource(step.satellite);
      return;
    case "attach-site-dataset":
      await driver.attachSiteDataset(step.siteDataset);
      return;
    case "attach-validation":
      await driver.attachValidation(step.validation);
      return;
  }
}

export async function executeScenarioSwitchPlan(
  plan: ScenarioSwitchPlan,
  driver: ScenarioPlanDriver
): Promise<ScenarioSwitchExecutionResult> {
  const appliedSteps: ScenarioPlanExecutionTraceStep[] = [];

  for (const step of plan.steps) {
    await executeScenarioStep(step, driver);
    appliedSteps.push({ kind: step.kind });
  }

  return {
    ...(plan.fromScenarioId ? { fromScenarioId: plan.fromScenarioId } : {}),
    toScenarioId: plan.toScenarioId,
    appliedSteps
  };
}

export async function executeScenarioUnloadPlan(
  plan: ScenarioUnloadPlan,
  driver: ScenarioPlanDriver
): Promise<ScenarioUnloadExecutionResult> {
  const appliedSteps: ScenarioPlanExecutionTraceStep[] = [];

  for (const step of plan.steps) {
    await executeScenarioStep(step, driver);
    appliedSteps.push({ kind: step.kind });
  }

  return {
    fromScenarioId: plan.fromScenarioId,
    appliedSteps
  };
}
