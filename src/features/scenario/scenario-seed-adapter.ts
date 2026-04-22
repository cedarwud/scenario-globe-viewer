import type { ScenePresetKey } from "../globe/scene-preset";
import {
  assertScenarioDefinitionContext,
  type ScenarioDefinition,
  type ScenarioTruthBoundaryLabel
} from "./scenario";

export const FIRST_INTAKE_ENDPOINT_OVERLAY_PROFILE_ID =
  "aviation-endpoint-overlay-profile";

export const FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_PROFILE_ID =
  "oneweb-gateway-pool-profile";

export type ScenarioSeedRecommendedMode = "real-time" | "prerecorded";

export interface FirstIntakeScenarioSeed {
  scenario: {
    id: string;
    label: string;
    presentation: {
      presetKey: ScenePresetKey;
    };
    time: {
      recommendedMode: ScenarioSeedRecommendedMode;
    };
    vertical: string;
  };
  handoverPolicy: {
    truthBoundaryLabel: ScenarioTruthBoundaryLabel;
  };
}

function assertPlainObject(
  value: unknown,
  fieldName: string
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be a plain object.`);
  }
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function assertScenarioSeedRecommendedMode(
  value: unknown
): asserts value is ScenarioSeedRecommendedMode {
  if (value !== "real-time" && value !== "prerecorded") {
    throw new Error(
      `scenario.time.recommendedMode must be real-time or prerecorded.`
    );
  }
}

function normalizeFirstIntakeScenarioSeed(
  seed: FirstIntakeScenarioSeed
): FirstIntakeScenarioSeed {
  assertPlainObject(seed, "seed");
  assertPlainObject(seed.scenario, "seed.scenario");
  assertPlainObject(seed.scenario.presentation, "seed.scenario.presentation");
  assertPlainObject(seed.scenario.time, "seed.scenario.time");
  assertPlainObject(seed.handoverPolicy, "seed.handoverPolicy");

  assertNonEmptyString(seed.scenario.id, "seed.scenario.id");
  assertNonEmptyString(seed.scenario.label, "seed.scenario.label");
  assertNonEmptyString(
    seed.scenario.presentation.presetKey,
    "seed.scenario.presentation.presetKey"
  );
  assertScenarioSeedRecommendedMode(seed.scenario.time.recommendedMode);
  assertNonEmptyString(seed.scenario.vertical, "seed.scenario.vertical");
  assertNonEmptyString(
    seed.handoverPolicy.truthBoundaryLabel,
    "seed.handoverPolicy.truthBoundaryLabel"
  );

  return seed;
}

export function adaptFirstIntakeScenarioSeedToDefinition(
  seed: FirstIntakeScenarioSeed
): ScenarioDefinition {
  const normalizedSeed = normalizeFirstIntakeScenarioSeed(seed);
  const mode = normalizedSeed.scenario.time.recommendedMode;
  const definition: ScenarioDefinition = {
    id: normalizedSeed.scenario.id,
    label: normalizedSeed.scenario.label,
    kind: mode,
    presentation: {
      presetKey: normalizedSeed.scenario.presentation.presetKey
    },
    time: {
      mode
    },
    context: {
      vertical: normalizedSeed.scenario.vertical,
      truthBoundaryLabel: normalizedSeed.handoverPolicy.truthBoundaryLabel,
      endpointProfileId: FIRST_INTAKE_ENDPOINT_OVERLAY_PROFILE_ID,
      infrastructureProfileId: FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_PROFILE_ID
    },
    // The first intake keeps scenario sources as a repo-owned empty stub only.
    sources: {}
  };

  assertScenarioDefinitionContext(definition);

  return definition;
}
