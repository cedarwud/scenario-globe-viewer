import {
  assertRepoOwnedPathControlMode,
  PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
  type CandidatePhysicalInputs,
  type PhysicalInputFamily,
  type PhysicalInputProvenance,
  type PhysicalInputProvenanceKind
} from "./physical-input";

export type FirstIntakePhysicalInputCaseId =
  "app-oneweb-intelsat-geo-aviation";
export type StaticBoundedMetricCalibrationState = "non-calibrated";

export interface PhysicalInputStaticBoundedMetricProfile {
  profileId: string;
  intakeCaseId: FirstIntakePhysicalInputCaseId;
  provenanceKind: PhysicalInputProvenanceKind;
  calibrationState: StaticBoundedMetricCalibrationState;
  measurementTruth: false;
  note: string;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
}

const REQUIRED_PROVENANCE_FAMILIES: ReadonlyArray<PhysicalInputFamily> = [
  "antenna",
  "rain-attenuation",
  "itu-style"
];

const REQUIRED_CANDIDATE_IDS = [
  "oneweb-leo-service-path",
  "intelsat-geo-service-path"
] as const;

export const ONEWEB_INTELSAT_GEO_AVIATION_STATIC_BOUNDED_METRIC_PROFILE: PhysicalInputStaticBoundedMetricProfile =
  {
    profileId: "oneweb-intelsat-geo-aviation-service-switching-v1",
    intakeCaseId: "app-oneweb-intelsat-geo-aviation",
    provenanceKind: "bounded-proxy",
    calibrationState: "non-calibrated",
    measurementTruth: false,
    note:
      "First-intake-only bounded proxy profile for the OneWeb + Intelsat GEO aviation case; non-calibrated and explicitly not measurement truth.",
    provenance: [
      {
        family: "antenna",
        kind: "bounded-proxy",
        label: "aviation antenna bounded proxy",
        detail:
          "Repo-owned bounded aviation ESA proxy for the first real-world OneWeb + Intelsat GEO contract case."
      },
      {
        family: "rain-attenuation",
        kind: "bounded-proxy",
        label: "aviation rain bounded proxy",
        detail:
          "Repo-owned bounded rain projection for the first real-world OneWeb + Intelsat GEO contract case."
      },
      {
        family: "itu-style",
        kind: "bounded-proxy",
        label: "aviation itu-style bounded proxy",
        detail:
          "Repo-owned bounded ITU-style projection for the first real-world OneWeb + Intelsat GEO contract case."
      }
    ],
    candidates: [
      {
        candidateId: "oneweb-leo-service-path",
        orbitClass: "leo",
        pathRole: "primary",
        pathControlMode: PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
        infrastructureSelectionMode: "eligible-pool",
        antenna: {
          profileId: "aviation-esa-oneweb-bounded",
          gainDb: 37,
          pointingLossDb: 1.1
        },
        rain: {
          modelId: "aviation-rain-bounded",
          attenuationDb: 2.6,
          rainRateMmPerHr: 9
        },
        itu: {
          profileId: "aviation-ka-bounded",
          frequencyGHz: 20.4,
          elevationDeg: 46,
          availabilityPercent: 99.93
        },
        baseMetrics: {
          latencyMs: 31,
          jitterMs: 4.5,
          networkSpeedMbps: 235
        }
      },
      {
        candidateId: "intelsat-geo-service-path",
        orbitClass: "geo",
        pathRole: "secondary",
        pathControlMode: PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE,
        infrastructureSelectionMode: "provider-managed",
        antenna: {
          profileId: "aviation-esa-geo-bounded",
          gainDb: 38.4,
          pointingLossDb: 1
        },
        rain: {
          modelId: "aviation-rain-bounded",
          attenuationDb: 2.3,
          rainRateMmPerHr: 8
        },
        itu: {
          profileId: "aviation-ku-ka-bounded",
          frequencyGHz: 12.5,
          elevationDeg: 50,
          availabilityPercent: 99.92
        },
        baseMetrics: {
          latencyMs: 97,
          jitterMs: 13,
          networkSpeedMbps: 104
        }
      }
    ]
  };

function assertFinitePositiveMetric(
  value: number,
  label: string,
  candidateId: string
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Static bounded metric profile requires finite positive ${label}: ${candidateId}.${label}`
    );
  }
}

export function assertPhysicalInputStaticBoundedMetricProfile(
  profile: PhysicalInputStaticBoundedMetricProfile
): void {
  if (profile.intakeCaseId !== "app-oneweb-intelsat-geo-aviation") {
    throw new Error(
      "Static bounded metric profile must stay first-intake-only for app-oneweb-intelsat-geo-aviation."
    );
  }

  if (profile.provenanceKind !== "bounded-proxy") {
    throw new Error(
      "Static bounded metric profile must stay bounded-proxy in the first slice."
    );
  }

  if (profile.calibrationState !== "non-calibrated") {
    throw new Error(
      "Static bounded metric profile must stay explicitly non-calibrated."
    );
  }

  if (profile.measurementTruth !== false) {
    throw new Error(
      "Static bounded metric profile must stay explicitly outside measurement truth."
    );
  }

  const provenanceFamilies = profile.provenance.map((entry) => entry.family);
  const candidateIds = profile.candidates.map((candidate) => candidate.candidateId);

  if (
    provenanceFamilies.length !== REQUIRED_PROVENANCE_FAMILIES.length ||
    REQUIRED_PROVENANCE_FAMILIES.some(
      (family, index) => provenanceFamilies[index] !== family
    )
  ) {
    throw new Error(
      "Static bounded metric profile must keep explicit antenna / rain-attenuation / itu-style provenance ordering."
    );
  }

  if (
    candidateIds.length !== REQUIRED_CANDIDATE_IDS.length ||
    REQUIRED_CANDIDATE_IDS.some((candidateId, index) => candidateIds[index] !== candidateId)
  ) {
    throw new Error(
      "Static bounded metric profile must stay limited to the first OneWeb LEO + Intelsat GEO aviation candidate set."
    );
  }

  for (const provenance of profile.provenance) {
    if (provenance.kind !== profile.provenanceKind) {
      throw new Error(
        `Static bounded metric profile provenance must stay ${profile.provenanceKind}: ${provenance.family}`
      );
    }
  }

  for (const candidate of profile.candidates) {
    if (!candidate.pathRole) {
      throw new Error(
        `Static bounded metric profile requires pathRole for ${candidate.candidateId}.`
      );
    }

    if (!candidate.pathControlMode) {
      throw new Error(
        `Static bounded metric profile requires pathControlMode for ${candidate.candidateId}.`
      );
    }

    assertRepoOwnedPathControlMode(candidate.pathControlMode);

    if (!candidate.infrastructureSelectionMode) {
      throw new Error(
        `Static bounded metric profile requires infrastructureSelectionMode for ${candidate.candidateId}.`
      );
    }

    if (candidate.orbitClass === "meo") {
      throw new Error(
        "Static bounded metric profile must stay bounded to the OneWeb LEO + Intelsat GEO case."
      );
    }

    if (!candidate.baseMetrics) {
      throw new Error(
        `Static bounded metric profile requires baseMetrics for ${candidate.candidateId}.`
      );
    }

    assertFinitePositiveMetric(
      candidate.baseMetrics.latencyMs,
      "latencyMs",
      candidate.candidateId
    );
    assertFinitePositiveMetric(
      candidate.baseMetrics.jitterMs,
      "jitterMs",
      candidate.candidateId
    );
    assertFinitePositiveMetric(
      candidate.baseMetrics.networkSpeedMbps,
      "networkSpeedMbps",
      candidate.candidateId
    );
  }
}
