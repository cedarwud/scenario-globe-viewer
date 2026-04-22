import type { ScenarioContextRef } from "../scenario";
import {
  FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS,
  FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS
} from "./first-intake-overlay-seeds";
import type {
  EndpointOverlaySeed,
  InfrastructureOverlaySeed
} from "./overlay-seeds";

export type FirstIntakeOverlaySeedResolutionInput = Pick<
  ScenarioContextRef,
  "endpointProfileId" | "infrastructureProfileId"
>;

export interface FirstIntakeOverlaySeedResolution {
  resolvedEndpointSeed: EndpointOverlaySeed;
  resolvedInfrastructureSeed: InfrastructureOverlaySeed;
}

function requireProfileId(
  profileId: string | undefined,
  fieldName: "endpointProfileId" | "infrastructureProfileId"
): string {
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new Error(
      `Missing ${fieldName} for first-intake overlay seed resolution.`
    );
  }

  return profileId;
}

function resolveEndpointSeedByProfileId(profileId: string): EndpointOverlaySeed {
  const matches = FIRST_INTAKE_ENDPOINT_OVERLAY_SEEDS.filter(
    (seed) => seed.profileId === profileId
  );

  if (matches.length === 0) {
    throw new Error(
      `Unsupported endpointProfileId "${profileId}" for first-intake overlay seed resolution.`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Duplicate endpointProfileId "${profileId}" found in first-intake endpoint overlay seeds.`
    );
  }

  return matches[0];
}

function resolveInfrastructureSeedByProfileId(
  profileId: string
): InfrastructureOverlaySeed {
  const matches = FIRST_INTAKE_INFRASTRUCTURE_OVERLAY_SEEDS.filter(
    (seed) => seed.profileId === profileId
  );

  if (matches.length === 0) {
    throw new Error(
      `Unsupported infrastructureProfileId "${profileId}" for first-intake overlay seed resolution.`
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Duplicate infrastructureProfileId "${profileId}" found in first-intake infrastructure overlay seeds.`
    );
  }

  return matches[0];
}

export function resolveFirstIntakeOverlaySeeds(
  context: FirstIntakeOverlaySeedResolutionInput
): FirstIntakeOverlaySeedResolution {
  const endpointProfileId = requireProfileId(
    context.endpointProfileId,
    "endpointProfileId"
  );
  const infrastructureProfileId = requireProfileId(
    context.infrastructureProfileId,
    "infrastructureProfileId"
  );

  return {
    resolvedEndpointSeed: resolveEndpointSeedByProfileId(endpointProfileId),
    resolvedInfrastructureSeed:
      resolveInfrastructureSeedByProfileId(infrastructureProfileId)
  };
}
