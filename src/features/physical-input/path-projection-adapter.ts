import type {
  CandidatePhysicalInputs,
  InfrastructureSelectionMode,
  PathControlMode,
  PhysicalInputOrbitClass,
  PhysicalInputPathRole,
  PhysicalInputProvenance,
  PhysicalInputSourceEntry,
  PhysicalInputWindow
} from "./physical-input";
import {
  assertPhysicalInputStaticBoundedMetricProfile,
  type FirstIntakePhysicalInputCaseId,
  type PhysicalInputStaticBoundedMetricProfile
} from "./static-bounded-metric-profile";

export const FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS = [
  "oneweb-leo-service-path",
  "intelsat-geo-service-path"
] as const;

export type FirstIntakePathProjectionCandidateId =
  (typeof FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS)[number];

export interface FirstIntakePathProjectionCandidatePath {
  candidateId: FirstIntakePathProjectionCandidateId;
  orbitClass: PhysicalInputOrbitClass;
  pathRole: PhysicalInputPathRole;
  pathControlMode: PathControlMode;
  infrastructureSelectionMode: InfrastructureSelectionMode;
}

export interface FirstIntakePathProjectionSeed {
  scenario: {
    id: FirstIntakePhysicalInputCaseId;
  };
  candidatePaths: ReadonlyArray<FirstIntakePathProjectionCandidatePath>;
}

interface ValidatedFirstIntakePathProjection {
  scenarioId: FirstIntakePhysicalInputCaseId;
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
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

function assertOrbitClass(
  value: unknown,
  fieldName: string
): asserts value is PhysicalInputOrbitClass {
  if (value !== "leo" && value !== "meo" && value !== "geo") {
    throw new Error(`${fieldName} must be leo, meo, or geo.`);
  }
}

function assertPathRole(
  value: unknown,
  fieldName: string
): asserts value is PhysicalInputPathRole {
  if (value !== "primary" && value !== "secondary" && value !== "contrast") {
    throw new Error(`${fieldName} must be primary, secondary, or contrast.`);
  }
}

function assertInfrastructureSelectionMode(
  value: unknown,
  fieldName: string
): asserts value is InfrastructureSelectionMode {
  if (
    value !== "provider-managed" &&
    value !== "eligible-pool" &&
    value !== "resolved-fixed-node"
  ) {
    throw new Error(
      `${fieldName} must be provider-managed, eligible-pool, or resolved-fixed-node.`
    );
  }
}

function normalizeFirstIntakePathProjectionSeed(
  seed: FirstIntakePathProjectionSeed
): FirstIntakePathProjectionSeed {
  assertPlainObject(seed, "seed");
  assertPlainObject(seed.scenario, "seed.scenario");
  assertNonEmptyString(seed.scenario.id, "seed.scenario.id");

  if (!Array.isArray(seed.candidatePaths)) {
    throw new Error("seed.candidatePaths must be an array.");
  }

  if (
    seed.candidatePaths.length !== FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS.length
  ) {
    throw new Error(
      "First-intake path projection must stay limited to the OneWeb LEO + Intelsat GEO candidate set."
    );
  }

  seed.candidatePaths.forEach((candidatePath, index) => {
    assertPlainObject(
      candidatePath,
      `seed.candidatePaths[${index}]`
    );
    assertNonEmptyString(
      candidatePath.candidateId,
      `seed.candidatePaths[${index}].candidateId`
    );
    assertOrbitClass(
      candidatePath.orbitClass,
      `seed.candidatePaths[${index}].orbitClass`
    );
    assertPathRole(
      candidatePath.pathRole,
      `seed.candidatePaths[${index}].pathRole`
    );
    assertNonEmptyString(
      candidatePath.pathControlMode,
      `seed.candidatePaths[${index}].pathControlMode`
    );
    assertInfrastructureSelectionMode(
      candidatePath.infrastructureSelectionMode,
      `seed.candidatePaths[${index}].infrastructureSelectionMode`
    );

    const expectedCandidateId = FIRST_INTAKE_PATH_PROJECTION_CANDIDATE_IDS[index];

    if (candidatePath.candidateId !== expectedCandidateId) {
      throw new Error(
        `First-intake path projection must preserve candidate ordering: expected ${expectedCandidateId} at index ${index}.`
      );
    }
  });

  return seed;
}

function cloneCandidate(
  candidate: CandidatePhysicalInputs
): CandidatePhysicalInputs {
  return {
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
    ...(candidate.pathRole ? { pathRole: candidate.pathRole } : {}),
    ...(candidate.pathControlMode
      ? { pathControlMode: candidate.pathControlMode }
      : {}),
    ...(candidate.infrastructureSelectionMode
      ? {
          infrastructureSelectionMode:
            candidate.infrastructureSelectionMode
        }
      : {}),
    antenna: {
      profileId: candidate.antenna.profileId,
      gainDb: candidate.antenna.gainDb,
      pointingLossDb: candidate.antenna.pointingLossDb
    },
    rain: {
      modelId: candidate.rain.modelId,
      ...(candidate.rain.attenuationDb !== undefined
        ? { attenuationDb: candidate.rain.attenuationDb }
        : {}),
      ...(candidate.rain.rainRateMmPerHr !== undefined
        ? { rainRateMmPerHr: candidate.rain.rainRateMmPerHr }
        : {})
    },
    itu: {
      profileId: candidate.itu.profileId,
      frequencyGHz: candidate.itu.frequencyGHz,
      elevationDeg: candidate.itu.elevationDeg,
      availabilityPercent: candidate.itu.availabilityPercent
    },
    ...(candidate.baseMetrics
      ? {
          baseMetrics: {
            latencyMs: candidate.baseMetrics.latencyMs,
            jitterMs: candidate.baseMetrics.jitterMs,
            networkSpeedMbps: candidate.baseMetrics.networkSpeedMbps
          }
        }
      : {})
  };
}

function cloneProvenance(
  provenance: PhysicalInputProvenance
): PhysicalInputProvenance {
  return {
    family: provenance.family,
    kind: provenance.kind,
    label: provenance.label,
    detail: provenance.detail,
    ...(provenance.sourceRef ? { sourceRef: provenance.sourceRef } : {})
  };
}

function assertMatchingCandidatePath(
  candidatePath: FirstIntakePathProjectionCandidatePath,
  profileCandidate: CandidatePhysicalInputs
): void {
  if (candidatePath.candidateId !== profileCandidate.candidateId) {
    throw new Error(
      `Seed/profile candidateId mismatch for ${candidatePath.candidateId}.`
    );
  }

  if (candidatePath.orbitClass !== profileCandidate.orbitClass) {
    throw new Error(
      `Seed/profile orbitClass mismatch for ${candidatePath.candidateId}.`
    );
  }

  if (candidatePath.pathRole !== profileCandidate.pathRole) {
    throw new Error(
      `Seed/profile pathRole mismatch for ${candidatePath.candidateId}.`
    );
  }

  if (candidatePath.pathControlMode !== profileCandidate.pathControlMode) {
    throw new Error(
      `Seed/profile pathControlMode mismatch for ${candidatePath.candidateId}.`
    );
  }

  if (
    candidatePath.infrastructureSelectionMode !==
    profileCandidate.infrastructureSelectionMode
  ) {
    throw new Error(
      `Seed/profile infrastructureSelectionMode mismatch for ${candidatePath.candidateId}.`
    );
  }
}

function resolveValidatedFirstIntakePathProjection(
  seed: FirstIntakePathProjectionSeed,
  profile: PhysicalInputStaticBoundedMetricProfile
): ValidatedFirstIntakePathProjection {
  const normalizedSeed = normalizeFirstIntakePathProjectionSeed(seed);

  assertPhysicalInputStaticBoundedMetricProfile(profile);

  if (normalizedSeed.scenario.id !== profile.intakeCaseId) {
    throw new Error(
      "First-intake path projection seed scenario.id must match the static bounded metric profile intakeCaseId."
    );
  }

  if (normalizedSeed.candidatePaths.length !== profile.candidates.length) {
    throw new Error(
      "First-intake path projection seed/profile candidate counts must match."
    );
  }

  normalizedSeed.candidatePaths.forEach((candidatePath, index) => {
    const profileCandidate = profile.candidates[index];

    if (!profileCandidate) {
      throw new Error(
        `Missing static bounded profile candidate at index ${index}.`
      );
    }

    assertMatchingCandidatePath(candidatePath, profileCandidate);
  });

  return {
    scenarioId: normalizedSeed.scenario.id,
    candidates: profile.candidates,
    provenance: profile.provenance
  };
}

function createFirstIntakePhysicalInputWindow(
  candidates: ReadonlyArray<CandidatePhysicalInputs>
): PhysicalInputWindow {
  // The first intake stays on one full-range window until a later slice owns transitions.
  return {
    startRatio: 0,
    stopRatio: 1,
    candidates: candidates.map((candidate) => cloneCandidate(candidate))
  };
}

export function adaptFirstIntakeSeedToCandidatePhysicalInputs(
  seed: FirstIntakePathProjectionSeed,
  profile: PhysicalInputStaticBoundedMetricProfile
): CandidatePhysicalInputs[] {
  return resolveValidatedFirstIntakePathProjection(seed, profile).candidates.map(
    (candidate) => cloneCandidate(candidate)
  );
}

export function adaptFirstIntakeSeedToPhysicalInputWindows(
  seed: FirstIntakePathProjectionSeed,
  profile: PhysicalInputStaticBoundedMetricProfile
): PhysicalInputWindow[] {
  const resolved = resolveValidatedFirstIntakePathProjection(seed, profile);

  return [createFirstIntakePhysicalInputWindow(resolved.candidates)];
}

export function adaptFirstIntakeSeedToPhysicalInputSourceEntry(
  seed: FirstIntakePathProjectionSeed,
  profile: PhysicalInputStaticBoundedMetricProfile
): PhysicalInputSourceEntry {
  const resolved = resolveValidatedFirstIntakePathProjection(seed, profile);

  return {
    scenarioId: resolved.scenarioId,
    windows: [createFirstIntakePhysicalInputWindow(resolved.candidates)],
    provenance: resolved.provenance.map((entry) => cloneProvenance(entry))
  };
}
