import type { ClockMode } from "../time";
import { resolveFirstIntakeOverlaySeeds } from "../overlays/overlay-seed-resolution";
import type {
  EndpointOverlaySeed,
  InfrastructureOverlaySeed
} from "../overlays/overlay-seeds";
import {
  assertScenarioDefinitionContext,
  type ScenarioContextRef,
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

export interface ScenarioResolvedFirstIntakeOverlaySeeds {
  resolvedEndpointSeed: EndpointOverlaySeed;
  resolvedInfrastructureSeed: InfrastructureOverlaySeed;
}

export interface ScenarioResolvedInputs {
  scenarioId: string;
  scenarioLabel: string;
  scenarioKind: ScenarioKind;
  presentation: ScenarioPresentationRef;
  time: ScenarioResolvedTimeInput;
  context?: ScenarioContextRef;
  resolvedFirstIntakeOverlaySeeds?: ScenarioResolvedFirstIntakeOverlaySeeds;
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

export type ScenarioUnloadPlanStep = Extract<
  ScenarioSwitchPlanStep,
  | { kind: "detach-validation" }
  | { kind: "detach-site-dataset" }
  | { kind: "detach-satellite-source" }
>;

export interface ScenarioUnloadPlan {
  fromScenarioId: string;
  steps: ReadonlyArray<ScenarioUnloadPlanStep>;
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

function cloneScenarioContextRef(context: ScenarioContextRef): ScenarioContextRef {
  const clone: ScenarioContextRef = {};

  if (context.vertical !== undefined) {
    clone.vertical = context.vertical;
  }

  if (context.truthBoundaryLabel !== undefined) {
    clone.truthBoundaryLabel = context.truthBoundaryLabel;
  }

  if (context.endpointProfileId !== undefined) {
    clone.endpointProfileId = context.endpointProfileId;
  }

  if (context.infrastructureProfileId !== undefined) {
    clone.infrastructureProfileId = context.infrastructureProfileId;
  }

  return clone;
}

function cloneEndpointOverlaySeed(
  seed: EndpointOverlaySeed
): EndpointOverlaySeed {
  return {
    profileId: seed.profileId,
    endpoints: seed.endpoints.map((endpoint) => ({
      endpointId: endpoint.endpointId,
      role: endpoint.role,
      entityType: endpoint.entityType,
      positionMode: endpoint.positionMode,
      mobilityKind: endpoint.mobilityKind,
      renderClass: endpoint.renderClass,
      ...(endpoint.coordinates
        ? {
            coordinates: {
              lat: endpoint.coordinates.lat,
              lon: endpoint.coordinates.lon,
              precision: endpoint.coordinates.precision
            }
          }
        : {}),
      ...(endpoint.notes !== undefined ? { notes: endpoint.notes } : {})
    }))
  };
}

function cloneInfrastructureOverlaySeed(
  seed: InfrastructureOverlaySeed
): InfrastructureOverlaySeed {
  return {
    profileId: seed.profileId,
    nodes: seed.nodes.map((node) => ({
      nodeId: node.nodeId,
      provider: node.provider,
      nodeType: node.nodeType,
      networkRoles: [...node.networkRoles],
      lat: node.lat,
      lon: node.lon,
      precision: node.precision,
      ...(node.sourceAuthority !== undefined
        ? { sourceAuthority: node.sourceAuthority }
        : {}),
      ...(node.notes !== undefined ? { notes: node.notes } : {})
    }))
  };
}

function shouldResolveFirstIntakeOverlaySeeds(
  context: ScenarioContextRef | undefined
): boolean {
  if (!context) {
    return false;
  }

  return (
    context.endpointProfileId !== undefined ||
    context.infrastructureProfileId !== undefined
  );
}

function resolveScenarioFirstIntakeOverlaySeeds(
  context: ScenarioContextRef | undefined
): ScenarioResolvedFirstIntakeOverlaySeeds | undefined {
  if (!context || !shouldResolveFirstIntakeOverlaySeeds(context)) {
    return undefined;
  }

  const resolution = resolveFirstIntakeOverlaySeeds(context);

  return {
    resolvedEndpointSeed: cloneEndpointOverlaySeed(
      resolution.resolvedEndpointSeed
    ),
    resolvedInfrastructureSeed: cloneInfrastructureOverlaySeed(
      resolution.resolvedInfrastructureSeed
    )
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
  assertScenarioDefinitionContext(definition);

  const context = definition.context
    ? cloneScenarioContextRef(definition.context)
    : undefined;
  const resolvedFirstIntakeOverlaySeeds =
    resolveScenarioFirstIntakeOverlaySeeds(context);
  const satellite = resolveScenarioSatelliteSource(definition);
  const siteDataset = resolveScenarioSiteDatasetRef(definition);
  const validation = resolveScenarioValidationRef(definition);
  return {
    scenarioId: definition.id,
    scenarioLabel: definition.label,
    scenarioKind: definition.kind,
    presentation: resolveScenarioPresentationRef(definition),
    time: resolveScenarioTimeInput(definition),
    ...(context ? { context } : {}),
    ...(resolvedFirstIntakeOverlaySeeds
      ? { resolvedFirstIntakeOverlaySeeds }
      : {}),
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

export function createScenarioUnloadPlan(
  current: ScenarioDefinition
): ScenarioUnloadPlan {
  const currentInputs = resolveScenarioInputs(current);
  const steps: ScenarioUnloadPlanStep[] = [];

  if (currentInputs.validation) {
    steps.push({ kind: "detach-validation" });
  }

  if (currentInputs.siteDataset) {
    steps.push({ kind: "detach-site-dataset" });
  }

  if (currentInputs.satellite) {
    steps.push({ kind: "detach-satellite-source" });
  }

  return {
    fromScenarioId: currentInputs.scenarioId,
    steps
  };
}
