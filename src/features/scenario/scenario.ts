import type { ScenePresetKey, SceneSite3DTilesSource } from "../globe/scene-preset";
import type { SatelliteFixture } from "../satellites";
import type { ClockMode, ClockTimestamp } from "../time";

// Transitional flat union for Phase 6.1. It currently mixes time-family values
// with broader scenario-intent families until runtime coordination proves
// whether these should split into separate fields.
export type ScenarioKind =
  | "prerecorded"
  | "real-time"
  | "site-dataset"
  | "validation-bridge";

export interface ScenarioPresentationRef {
  presetKey: ScenePresetKey;
}

export interface ScenarioTimeRange {
  start: ClockTimestamp;
  stop: ClockTimestamp;
}

export interface ScenarioTimeDefinition {
  mode: ClockMode;
  range?: ScenarioTimeRange;
}

const ACCEPTED_SCENARIO_TRUTH_BOUNDARY_LABEL =
  "real-pairing-bounded-runtime-projection";

export type ScenarioTruthBoundaryLabel =
  typeof ACCEPTED_SCENARIO_TRUTH_BOUNDARY_LABEL;

// First multi-orbit intake keeps scenario-owned metadata narrow and top-level.
export interface ScenarioContextRef {
  vertical?: string;
  truthBoundaryLabel?: ScenarioTruthBoundaryLabel;
  endpointProfileId?: string;
  infrastructureProfileId?: string;
}

const ALLOWED_SCENARIO_CONTEXT_KEYS = [
  "vertical",
  "truthBoundaryLabel",
  "endpointProfileId",
  "infrastructureProfileId"
] as const satisfies ReadonlyArray<keyof ScenarioContextRef>;

export type ScenarioSatelliteFixtureType = SatelliteFixture["kind"];

export type ScenarioSatelliteSourceRef =
  | {
      kind: "fixture-ref";
      fixtureType: ScenarioSatelliteFixtureType;
      fixtureId: string;
    }
  | {
      kind: "feed-ref";
      feedId: string;
    };

export interface ScenarioSiteDatasetRef {
  source: SceneSite3DTilesSource;
  datasetRef: string;
}

// Phase 6.1 only reserves the validation shape slot. Phase 6.6 owns the
// concrete DUT/NAT/tunnel/bridge sub-taxonomy.
export interface ScenarioValidationRef {
  mode: string;
  transport: string;
}

export interface ScenarioDefinition {
  id: string;
  label: string;
  // If `kind` is "prerecorded" or "real-time", it must agree with `time.mode`.
  // If `kind` is "site-dataset" or "validation-bridge", `time.mode` is chosen
  // independently and `kind` expresses the broader scenario intent.
  kind: ScenarioKind;
  presentation: ScenarioPresentationRef;
  time: ScenarioTimeDefinition;
  // First multi-orbit intake widens scenario only with a narrow optional
  // metadata block that stays parallel to presentation/time/sources.
  context?: ScenarioContextRef;
  sources: {
    satellite?: ScenarioSatelliteSourceRef;
    siteDataset?: ScenarioSiteDatasetRef;
    validation?: ScenarioValidationRef;
  };
}

function assertOptionalScenarioContextStringField(
  definition: ScenarioDefinition,
  fieldName: keyof ScenarioContextRef,
  value: unknown
): void {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(
      `Scenario ${definition.id} context.${fieldName} must be a string when provided.`
    );
  }
}

export function assertScenarioDefinitionContext(
  definition: ScenarioDefinition
): void {
  const rawContext = definition.context as unknown;

  if (rawContext === undefined) {
    return;
  }

  if (
    typeof rawContext !== "object" ||
    rawContext === null ||
    Array.isArray(rawContext)
  ) {
    throw new Error(
      `Scenario ${definition.id} context must be a plain object when provided.`
    );
  }

  const contextRecord = rawContext as Record<string, unknown>;
  const unsupportedKeys = Object.keys(contextRecord).filter(
    (key) =>
      !ALLOWED_SCENARIO_CONTEXT_KEYS.includes(key as keyof ScenarioContextRef)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `Scenario ${definition.id} context must not include unsupported keys: ${unsupportedKeys.join(", ")}.`
    );
  }

  const {
    vertical,
    truthBoundaryLabel,
    endpointProfileId,
    infrastructureProfileId
  } = contextRecord as ScenarioContextRef;

  assertOptionalScenarioContextStringField(definition, "vertical", vertical);
  assertOptionalScenarioContextStringField(
    definition,
    "truthBoundaryLabel",
    truthBoundaryLabel
  );
  assertOptionalScenarioContextStringField(
    definition,
    "endpointProfileId",
    endpointProfileId
  );
  assertOptionalScenarioContextStringField(
    definition,
    "infrastructureProfileId",
    infrastructureProfileId
  );

  if (
    truthBoundaryLabel !== undefined &&
    truthBoundaryLabel !== ACCEPTED_SCENARIO_TRUTH_BOUNDARY_LABEL
  ) {
    throw new Error(
      `Scenario ${definition.id} context.truthBoundaryLabel must be ${ACCEPTED_SCENARIO_TRUTH_BOUNDARY_LABEL}.`
    );
  }
}

export const TIER1_CONFIRMED_SCENARIO_KINDS = [
  "prerecorded",
  "real-time"
] as const satisfies ReadonlyArray<ScenarioKind>;

export const PROVISIONAL_SCENARIO_KINDS = [
  "site-dataset",
  "validation-bridge"
] as const satisfies ReadonlyArray<ScenarioKind>;

export function isScenarioKindCompatibleWithClockMode(
  kind: ScenarioKind,
  mode: ClockMode
): boolean {
  switch (kind) {
    case "prerecorded":
    case "real-time":
      return kind === mode;
    case "site-dataset":
    case "validation-bridge":
      return true;
  }
}

export function resolveScenarioClockMode(
  definition: ScenarioDefinition
): ClockMode {
  switch (definition.kind) {
    case "prerecorded":
    case "real-time":
      return definition.kind;
    case "site-dataset":
    case "validation-bridge":
      return definition.time.mode;
  }
}
