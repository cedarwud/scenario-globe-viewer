import type { ClockMode } from "../time";
import {
  type ScenarioDefinition,
  type ScenarioKind,
  type ScenarioPresentationRef,
  type ScenarioSatelliteSourceRef,
  type ScenarioSiteDatasetRef,
  type ScenarioTimeRange,
  type ScenarioValidationRef,
  isScenarioKindCompatibleWithClockMode,
  resolveScenarioClockMode
} from "./scenario";

export interface ScenarioResolvedTimeInput {
  mode: ClockMode;
  range?: ScenarioTimeRange;
}

export interface ScenarioResolvedInputs {
  scenarioId: string;
  scenarioLabel: string;
  scenarioKind: ScenarioKind;
  presentation: ScenarioPresentationRef;
  time: ScenarioResolvedTimeInput;
  satellite?: ScenarioSatelliteSourceRef;
  siteDataset?: ScenarioSiteDatasetRef;
  validation?: ScenarioValidationRef;
}

export type ScenarioSwitchPlanStep =
  | { kind: "detach-validation" }
  | { kind: "detach-site-dataset" }
  | { kind: "detach-satellite-source" }
  | { kind: "set-presentation"; presentation: ScenarioPresentationRef }
  | { kind: "set-time"; time: ScenarioResolvedTimeInput }
  | { kind: "attach-satellite-source"; satellite: ScenarioSatelliteSourceRef }
  | { kind: "attach-site-dataset"; siteDataset: ScenarioSiteDatasetRef }
  | { kind: "attach-validation"; validation: ScenarioValidationRef };

export interface ScenarioSwitchPlan {
  fromScenarioId?: string;
  toScenarioId: string;
  steps: ReadonlyArray<ScenarioSwitchPlanStep>;
}

function cloneScenarioTimeRange(
  range: ScenarioTimeRange | undefined
): ScenarioTimeRange | undefined {
  if (!range) {
    return undefined;
  }
  return {
    start: range.start,
    stop: range.stop
  };
}

function cloneScenarioPresentationRef(
  presentation: ScenarioPresentationRef
): ScenarioPresentationRef {
  return {
    presetKey: presentation.presetKey
  };
}

function cloneScenarioSatelliteSource(
  satellite: ScenarioSatelliteSourceRef
): ScenarioSatelliteSourceRef {
  switch (satellite.kind) {
    case "fixture-ref":
      return {
        kind: "fixture-ref",
        fixtureType: satellite.fixtureType,
        fixtureId: satellite.fixtureId
      };
    case "feed-ref":
      return {
        kind: "feed-ref",
        feedId: satellite.feedId
      };
  }
}

function cloneScenarioSiteDatasetRef(
  siteDataset: ScenarioSiteDatasetRef
): ScenarioSiteDatasetRef {
  return {
    source: siteDataset.source,
    datasetRef: siteDataset.datasetRef
  };
}

function cloneScenarioValidationRef(
  validation: ScenarioValidationRef
): ScenarioValidationRef {
  return {
    mode: validation.mode,
    transport: validation.transport
  };
}

function sameScenarioTimeRange(
  left: ScenarioTimeRange | undefined,
  right: ScenarioTimeRange | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.start === right.start && left.stop === right.stop;
}

function sameScenarioResolvedTimeInput(
  left: ScenarioResolvedTimeInput,
  right: ScenarioResolvedTimeInput
): boolean {
  return left.mode === right.mode && sameScenarioTimeRange(left.range, right.range);
}

function sameScenarioSatelliteSource(
  left: ScenarioSatelliteSourceRef | undefined,
  right: ScenarioSatelliteSourceRef | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right || left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case "fixture-ref":
      return (
        right.kind === "fixture-ref" &&
        left.fixtureType === right.fixtureType &&
        left.fixtureId === right.fixtureId
      );
    case "feed-ref":
      return right.kind === "feed-ref" && left.feedId === right.feedId;
  }
}

function sameScenarioSiteDatasetRef(
  left: ScenarioSiteDatasetRef | undefined,
  right: ScenarioSiteDatasetRef | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.source === right.source && left.datasetRef === right.datasetRef;
}

function sameScenarioValidationRef(
  left: ScenarioValidationRef | undefined,
  right: ScenarioValidationRef | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.mode === right.mode && left.transport === right.transport;
}

export function resolveScenarioPresentationRef(
  definition: ScenarioDefinition
): ScenarioPresentationRef {
  return cloneScenarioPresentationRef(definition.presentation);
}

export function resolveScenarioTimeInput(
  definition: ScenarioDefinition
): ScenarioResolvedTimeInput {
  if (!isScenarioKindCompatibleWithClockMode(definition.kind, definition.time.mode)) {
    throw new Error(
      `Scenario kind ${definition.kind} must agree with time.mode ${definition.time.mode}.`
    );
  }

  const range = cloneScenarioTimeRange(definition.time.range);
  return {
    mode: resolveScenarioClockMode(definition),
    ...(range ? { range } : {})
  };
}

export function resolveScenarioSatelliteSource(
  definition: ScenarioDefinition
): ScenarioSatelliteSourceRef | undefined {
  return definition.sources.satellite
    ? cloneScenarioSatelliteSource(definition.sources.satellite)
    : undefined;
}

export function resolveScenarioSiteDatasetRef(
  definition: ScenarioDefinition
): ScenarioSiteDatasetRef | undefined {
  return definition.sources.siteDataset
    ? cloneScenarioSiteDatasetRef(definition.sources.siteDataset)
    : undefined;
}

export function resolveScenarioValidationRef(
  definition: ScenarioDefinition
): ScenarioValidationRef | undefined {
  return definition.sources.validation
    ? cloneScenarioValidationRef(definition.sources.validation)
    : undefined;
}

export function resolveScenarioInputs(
  definition: ScenarioDefinition
): ScenarioResolvedInputs {
  const satellite = resolveScenarioSatelliteSource(definition);
  const siteDataset = resolveScenarioSiteDatasetRef(definition);
  const validation = resolveScenarioValidationRef(definition);
  return {
    scenarioId: definition.id,
    scenarioLabel: definition.label,
    scenarioKind: definition.kind,
    presentation: resolveScenarioPresentationRef(definition),
    time: resolveScenarioTimeInput(definition),
    ...(satellite ? { satellite } : {}),
    ...(siteDataset ? { siteDataset } : {}),
    ...(validation ? { validation } : {})
  };
}

export function createScenarioSwitchPlan(
  current: ScenarioDefinition | undefined,
  next: ScenarioDefinition
): ScenarioSwitchPlan {
  const currentInputs = current ? resolveScenarioInputs(current) : undefined;
  const nextInputs = resolveScenarioInputs(next);
  const steps: ScenarioSwitchPlanStep[] = [];

  if (
    currentInputs?.validation &&
    !sameScenarioValidationRef(currentInputs.validation, nextInputs.validation)
  ) {
    steps.push({ kind: "detach-validation" });
  }

  if (
    currentInputs?.siteDataset &&
    !sameScenarioSiteDatasetRef(currentInputs.siteDataset, nextInputs.siteDataset)
  ) {
    steps.push({ kind: "detach-site-dataset" });
  }

  if (
    currentInputs?.satellite &&
    !sameScenarioSatelliteSource(currentInputs.satellite, nextInputs.satellite)
  ) {
    steps.push({ kind: "detach-satellite-source" });
  }

  if (
    !currentInputs ||
    currentInputs.presentation.presetKey !== nextInputs.presentation.presetKey
  ) {
    steps.push({
      kind: "set-presentation",
      presentation: nextInputs.presentation
    });
  }

  if (!currentInputs || !sameScenarioResolvedTimeInput(currentInputs.time, nextInputs.time)) {
    steps.push({
      kind: "set-time",
      time: nextInputs.time
    });
  }

  if (
    nextInputs.satellite &&
    !sameScenarioSatelliteSource(currentInputs?.satellite, nextInputs.satellite)
  ) {
    steps.push({
      kind: "attach-satellite-source",
      satellite: nextInputs.satellite
    });
  }

  if (
    nextInputs.siteDataset &&
    !sameScenarioSiteDatasetRef(currentInputs?.siteDataset, nextInputs.siteDataset)
  ) {
    steps.push({
      kind: "attach-site-dataset",
      siteDataset: nextInputs.siteDataset
    });
  }

  if (
    nextInputs.validation &&
    !sameScenarioValidationRef(currentInputs?.validation, nextInputs.validation)
  ) {
    steps.push({
      kind: "attach-validation",
      validation: nextInputs.validation
    });
  }

  return {
    fromScenarioId: currentInputs?.scenarioId,
    toScenarioId: nextInputs.scenarioId,
    steps
  };
}
