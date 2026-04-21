import type {
  CandidatePhysicalInputs,
  PhysicalInputProvenance
} from "../features/physical-input/physical-input";

export interface BootstrapPhysicalWindowSeed {
  startRatio: number;
  stopRatio: number;
  contextLabel: string;
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
}

function createCandidate(
  candidateId: string,
  orbitClass: CandidatePhysicalInputs["orbitClass"],
  antenna: {
    gainDb: number;
    pointingLossDb: number;
  },
  rain: {
    attenuationDb: number;
    rainRateMmPerHr: number;
  },
  itu: {
    frequencyGHz: number;
    elevationDeg: number;
    availabilityPercent: number;
  },
  baseMetrics: {
    latencyMs: number;
    jitterMs: number;
    networkSpeedMbps: number;
  }
): CandidatePhysicalInputs {
  return {
    candidateId,
    orbitClass,
    antenna: {
      profileId: `${candidateId}-antenna`,
      gainDb: antenna.gainDb,
      pointingLossDb: antenna.pointingLossDb
    },
    rain: {
      modelId: `${candidateId}-rain`,
      attenuationDb: rain.attenuationDb,
      rainRateMmPerHr: rain.rainRateMmPerHr
    },
    itu: {
      profileId: `${candidateId}-itu`,
      frequencyGHz: itu.frequencyGHz,
      elevationDeg: itu.elevationDeg,
      availabilityPercent: itu.availabilityPercent
    },
    baseMetrics
  };
}

function createWindowSeed(
  startRatio: number,
  stopRatio: number,
  contextLabel: string,
  candidates: ReadonlyArray<CandidatePhysicalInputs>
): BootstrapPhysicalWindowSeed {
  return {
    startRatio,
    stopRatio,
    contextLabel,
    candidates
  };
}

export const BOOTSTRAP_PHYSICAL_INPUT_PROVENANCE: ReadonlyArray<PhysicalInputProvenance> = [
  {
    family: "antenna",
    kind: "bounded-proxy",
    label: "antenna bounded proxy",
    detail:
      "Antenna gain / pointing-loss family required by kickoff.pptx slide 2/6; the numeric values here are repo-owned bounded proxies, not measured antenna truth."
  },
  {
    family: "rain-attenuation",
    kind: "bounded-proxy",
    label: "rain attenuation bounded proxy",
    detail:
      "Rain attenuation / rain-rate family required by kickoff.pptx slide 2/6; the numeric values here are repo-owned bounded proxies, not measured weather truth."
  },
  {
    family: "itu-style",
    kind: "bounded-proxy",
    label: "itu-style bounded proxy",
    detail:
      "ITU-style frequency / elevation / availability family required by kickoff.pptx slide 2/6; the numeric values here are repo-owned bounded proxies, not final ITU calibration truth."
  }
];

export const BOOTSTRAP_PHYSICAL_SOURCE_SEEDS: Record<
  string,
  ReadonlyArray<BootstrapPhysicalWindowSeed>
> = {
  "bootstrap-global-real-time": [
    createWindowSeed(0, 0.34, "Global clear-sky primary", [
      createCandidate(
        "global-leo-primary",
        "leo",
        { gainDb: 37.2, pointingLossDb: 1 },
        { attenuationDb: 1.8, rainRateMmPerHr: 7 },
        { frequencyGHz: 20.4, elevationDeg: 47, availabilityPercent: 99.94 },
        { latencyMs: 29, jitterMs: 4, networkSpeedMbps: 242 }
      ),
      createCandidate(
        "global-meo-bridge",
        "meo",
        { gainDb: 34.6, pointingLossDb: 1.7 },
        { attenuationDb: 4.6, rainRateMmPerHr: 15 },
        { frequencyGHz: 19.2, elevationDeg: 36, availabilityPercent: 99.82 },
        { latencyMs: 43, jitterMs: 7, networkSpeedMbps: 188 }
      ),
      createCandidate(
        "global-geo-anchor",
        "geo",
        { gainDb: 38.1, pointingLossDb: 1.2 },
        { attenuationDb: 3.1, rainRateMmPerHr: 10 },
        { frequencyGHz: 12.6, elevationDeg: 50, availabilityPercent: 99.9 },
        { latencyMs: 102, jitterMs: 15, networkSpeedMbps: 94 }
      )
    ]),
    createWindowSeed(0.34, 0.7, "Global rain-stressed bridge", [
      createCandidate(
        "global-leo-primary",
        "leo",
        { gainDb: 34.3, pointingLossDb: 2.2 },
        { attenuationDb: 8.2, rainRateMmPerHr: 28 },
        { frequencyGHz: 25.8, elevationDeg: 25, availabilityPercent: 99.56 },
        { latencyMs: 44, jitterMs: 8, networkSpeedMbps: 174 }
      ),
      createCandidate(
        "global-meo-bridge",
        "meo",
        { gainDb: 36.4, pointingLossDb: 0.9 },
        { attenuationDb: 3.3, rainRateMmPerHr: 11 },
        { frequencyGHz: 19.8, elevationDeg: 42, availabilityPercent: 99.87 },
        { latencyMs: 33, jitterMs: 5, networkSpeedMbps: 224 }
      ),
      createCandidate(
        "global-geo-anchor",
        "geo",
        { gainDb: 38.5, pointingLossDb: 1.1 },
        { attenuationDb: 4.7, rainRateMmPerHr: 16 },
        { frequencyGHz: 12.7, elevationDeg: 49, availabilityPercent: 99.91 },
        { latencyMs: 99, jitterMs: 14, networkSpeedMbps: 96 }
      )
    ]),
    createWindowSeed(0.7, 1, "Global recovery tail", [
      createCandidate(
        "global-leo-primary",
        "leo",
        { gainDb: 36.7, pointingLossDb: 1.1 },
        { attenuationDb: 2.5, rainRateMmPerHr: 9 },
        { frequencyGHz: 20.5, elevationDeg: 44, availabilityPercent: 99.93 },
        { latencyMs: 31, jitterMs: 5, networkSpeedMbps: 236 }
      ),
      createCandidate(
        "global-geo-anchor",
        "geo",
        { gainDb: 38.6, pointingLossDb: 1 },
        { attenuationDb: 2.8, rainRateMmPerHr: 9 },
        { frequencyGHz: 12.4, elevationDeg: 51, availabilityPercent: 99.93 },
        { latencyMs: 98, jitterMs: 14, networkSpeedMbps: 99 }
      )
    ])
  ],
  "bootstrap-global-prerecorded": [
    createWindowSeed(0, 0.3, "Global replay ingress", [
      createCandidate(
        "global-leo-primary",
        "leo",
        { gainDb: 37.5, pointingLossDb: 0.9 },
        { attenuationDb: 1.6, rainRateMmPerHr: 6 },
        { frequencyGHz: 20.3, elevationDeg: 48, availabilityPercent: 99.95 },
        { latencyMs: 27, jitterMs: 4, networkSpeedMbps: 251 }
      ),
      createCandidate(
        "global-meo-bridge",
        "meo",
        { gainDb: 35.1, pointingLossDb: 1.4 },
        { attenuationDb: 3.5, rainRateMmPerHr: 12 },
        { frequencyGHz: 19, elevationDeg: 39, availabilityPercent: 99.86 },
        { latencyMs: 39, jitterMs: 6, networkSpeedMbps: 204 }
      ),
      createCandidate(
        "global-geo-anchor",
        "geo",
        { gainDb: 38.3, pointingLossDb: 1 },
        { attenuationDb: 2.3, rainRateMmPerHr: 8 },
        { frequencyGHz: 12.4, elevationDeg: 51, availabilityPercent: 99.92 },
        { latencyMs: 100, jitterMs: 15, networkSpeedMbps: 101 }
      )
    ]),
    createWindowSeed(0.3, 0.62, "Global replay bridge", [
      createCandidate(
        "global-leo-primary",
        "leo",
        { gainDb: 34.8, pointingLossDb: 1.9 },
        { attenuationDb: 7.1, rainRateMmPerHr: 24 },
        { frequencyGHz: 24.8, elevationDeg: 28, availabilityPercent: 99.62 },
        { latencyMs: 40, jitterMs: 7, networkSpeedMbps: 186 }
      ),
      createCandidate(
        "global-meo-bridge",
        "meo",
        { gainDb: 36.1, pointingLossDb: 1 },
        { attenuationDb: 3.7, rainRateMmPerHr: 12 },
        { frequencyGHz: 19.7, elevationDeg: 41, availabilityPercent: 99.86 },
        { latencyMs: 34, jitterMs: 5, networkSpeedMbps: 218 }
      ),
      createCandidate(
        "global-geo-anchor",
        "geo",
        { gainDb: 38.6, pointingLossDb: 1 },
        { attenuationDb: 4.1, rainRateMmPerHr: 14 },
        { frequencyGHz: 12.5, elevationDeg: 50, availabilityPercent: 99.92 },
        { latencyMs: 96, jitterMs: 13, networkSpeedMbps: 106 }
      )
    ]),
    createWindowSeed(0.62, 1, "Global replay recovery", [
      createCandidate(
        "global-leo-primary",
        "leo",
        { gainDb: 37, pointingLossDb: 1 },
        { attenuationDb: 2, rainRateMmPerHr: 8 },
        { frequencyGHz: 20.2, elevationDeg: 46, availabilityPercent: 99.94 },
        { latencyMs: 29, jitterMs: 4, networkSpeedMbps: 244 }
      ),
      createCandidate(
        "global-meo-bridge",
        "meo",
        { gainDb: 35.6, pointingLossDb: 1.2 },
        { attenuationDb: 3.1, rainRateMmPerHr: 10 },
        { frequencyGHz: 19.1, elevationDeg: 40, availabilityPercent: 99.88 },
        { latencyMs: 37, jitterMs: 6, networkSpeedMbps: 211 }
      ),
      createCandidate(
        "global-geo-anchor",
        "geo",
        { gainDb: 38.7, pointingLossDb: 0.9 },
        { attenuationDb: 2.4, rainRateMmPerHr: 8 },
        { frequencyGHz: 12.3, elevationDeg: 51, availabilityPercent: 99.94 },
        { latencyMs: 97, jitterMs: 14, networkSpeedMbps: 102 }
      )
    ])
  ],
  "bootstrap-regional-real-time": [
    createWindowSeed(0, 0.36, "Regional clear-sky ingress", [
      createCandidate(
        "regional-leo-primary",
        "leo",
        { gainDb: 37.8, pointingLossDb: 0.8 },
        { attenuationDb: 1.4, rainRateMmPerHr: 6 },
        { frequencyGHz: 20, elevationDeg: 50, availabilityPercent: 99.96 },
        { latencyMs: 24, jitterMs: 3, networkSpeedMbps: 278 }
      ),
      createCandidate(
        "regional-meo-bridge",
        "meo",
        { gainDb: 35.7, pointingLossDb: 1.1 },
        { attenuationDb: 2.6, rainRateMmPerHr: 9 },
        { frequencyGHz: 18.7, elevationDeg: 41, availabilityPercent: 99.9 },
        { latencyMs: 36, jitterMs: 5, networkSpeedMbps: 221 }
      ),
      createCandidate(
        "regional-geo-anchor",
        "geo",
        { gainDb: 38.9, pointingLossDb: 0.9 },
        { attenuationDb: 1.9, rainRateMmPerHr: 7 },
        { frequencyGHz: 12.1, elevationDeg: 53, availabilityPercent: 99.95 },
        { latencyMs: 91, jitterMs: 12, networkSpeedMbps: 110 }
      )
    ]),
    createWindowSeed(0.36, 0.74, "Regional bridge weather pocket", [
      createCandidate(
        "regional-leo-primary",
        "leo",
        { gainDb: 35.3, pointingLossDb: 1.6 },
        { attenuationDb: 5.6, rainRateMmPerHr: 20 },
        { frequencyGHz: 22.5, elevationDeg: 34, availabilityPercent: 99.73 },
        { latencyMs: 35, jitterMs: 6, networkSpeedMbps: 192 }
      ),
      createCandidate(
        "regional-meo-bridge",
        "meo",
        { gainDb: 36.8, pointingLossDb: 0.8 },
        { attenuationDb: 2.4, rainRateMmPerHr: 8 },
        { frequencyGHz: 18.9, elevationDeg: 44, availabilityPercent: 99.91 },
        { latencyMs: 29, jitterMs: 4, networkSpeedMbps: 238 }
      ),
      createCandidate(
        "regional-geo-anchor",
        "geo",
        { gainDb: 39, pointingLossDb: 0.9 },
        { attenuationDb: 2.6, rainRateMmPerHr: 9 },
        { frequencyGHz: 12.2, elevationDeg: 53, availabilityPercent: 99.95 },
        { latencyMs: 89, jitterMs: 12, networkSpeedMbps: 112 }
      )
    ]),
    createWindowSeed(0.74, 1, "Regional recovery sweep", [
      createCandidate(
        "regional-leo-primary",
        "leo",
        { gainDb: 37, pointingLossDb: 0.9 },
        { attenuationDb: 2, rainRateMmPerHr: 8 },
        { frequencyGHz: 20.1, elevationDeg: 47, availabilityPercent: 99.94 },
        { latencyMs: 25, jitterMs: 3, networkSpeedMbps: 269 }
      ),
      createCandidate(
        "regional-meo-bridge",
        "meo",
        { gainDb: 36.4, pointingLossDb: 0.9 },
        { attenuationDb: 2.5, rainRateMmPerHr: 8 },
        { frequencyGHz: 18.8, elevationDeg: 43, availabilityPercent: 99.92 },
        { latencyMs: 33, jitterMs: 4, networkSpeedMbps: 228 }
      ),
      createCandidate(
        "regional-geo-anchor",
        "geo",
        { gainDb: 39.1, pointingLossDb: 0.8 },
        { attenuationDb: 2, rainRateMmPerHr: 7 },
        { frequencyGHz: 12, elevationDeg: 54, availabilityPercent: 99.96 },
        { latencyMs: 88, jitterMs: 11, networkSpeedMbps: 114 }
      )
    ])
  ],
  "bootstrap-regional-prerecorded": [
    createWindowSeed(0, 0.28, "Regional replay ingress", [
      createCandidate(
        "regional-leo-primary",
        "leo",
        { gainDb: 38, pointingLossDb: 0.8 },
        { attenuationDb: 1.3, rainRateMmPerHr: 5 },
        { frequencyGHz: 20, elevationDeg: 51, availabilityPercent: 99.97 },
        { latencyMs: 23, jitterMs: 3, networkSpeedMbps: 282 }
      ),
      createCandidate(
        "regional-meo-bridge",
        "meo",
        { gainDb: 36, pointingLossDb: 1 },
        { attenuationDb: 2.2, rainRateMmPerHr: 8 },
        { frequencyGHz: 18.6, elevationDeg: 43, availabilityPercent: 99.92 },
        { latencyMs: 35, jitterMs: 5, networkSpeedMbps: 227 }
      ),
      createCandidate(
        "regional-geo-anchor",
        "geo",
        { gainDb: 39, pointingLossDb: 0.8 },
        { attenuationDb: 1.7, rainRateMmPerHr: 6 },
        { frequencyGHz: 12, elevationDeg: 54, availabilityPercent: 99.96 },
        { latencyMs: 90, jitterMs: 11, networkSpeedMbps: 115 }
      )
    ]),
    createWindowSeed(0.28, 0.66, "Regional replay bridge", [
      createCandidate(
        "regional-leo-primary",
        "leo",
        { gainDb: 35.6, pointingLossDb: 1.5 },
        { attenuationDb: 4.8, rainRateMmPerHr: 18 },
        { frequencyGHz: 21.8, elevationDeg: 36, availabilityPercent: 99.78 },
        { latencyMs: 34, jitterMs: 5, networkSpeedMbps: 198 }
      ),
      createCandidate(
        "regional-meo-bridge",
        "meo",
        { gainDb: 37, pointingLossDb: 0.8 },
        { attenuationDb: 2.1, rainRateMmPerHr: 7 },
        { frequencyGHz: 18.7, elevationDeg: 45, availabilityPercent: 99.93 },
        { latencyMs: 28, jitterMs: 4, networkSpeedMbps: 242 }
      ),
      createCandidate(
        "regional-geo-anchor",
        "geo",
        { gainDb: 39.2, pointingLossDb: 0.8 },
        { attenuationDb: 2, rainRateMmPerHr: 7 },
        { frequencyGHz: 12.1, elevationDeg: 54, availabilityPercent: 99.96 },
        { latencyMs: 87, jitterMs: 11, networkSpeedMbps: 118 }
      )
    ]),
    createWindowSeed(0.66, 1, "Regional replay recovery", [
      createCandidate(
        "regional-leo-primary",
        "leo",
        { gainDb: 37.6, pointingLossDb: 0.8 },
        { attenuationDb: 1.5, rainRateMmPerHr: 6 },
        { frequencyGHz: 20, elevationDeg: 49, availabilityPercent: 99.96 },
        { latencyMs: 24, jitterMs: 3, networkSpeedMbps: 276 }
      ),
      createCandidate(
        "regional-meo-bridge",
        "meo",
        { gainDb: 36.6, pointingLossDb: 0.8 },
        { attenuationDb: 2, rainRateMmPerHr: 7 },
        { frequencyGHz: 18.6, elevationDeg: 44, availabilityPercent: 99.94 },
        { latencyMs: 31, jitterMs: 4, networkSpeedMbps: 234 }
      ),
      createCandidate(
        "regional-geo-anchor",
        "geo",
        { gainDb: 39.2, pointingLossDb: 0.8 },
        { attenuationDb: 1.8, rainRateMmPerHr: 6 },
        { frequencyGHz: 12, elevationDeg: 55, availabilityPercent: 99.97 },
        { latencyMs: 86, jitterMs: 11, networkSpeedMbps: 119 }
      )
    ])
  ],
  "bootstrap-site-real-time": [
    createWindowSeed(0, 0.4, "Site ingress clear channel", [
      createCandidate(
        "site-leo-primary",
        "leo",
        { gainDb: 38.6, pointingLossDb: 0.7 },
        { attenuationDb: 1.1, rainRateMmPerHr: 5 },
        { frequencyGHz: 20.1, elevationDeg: 53, availabilityPercent: 99.97 },
        { latencyMs: 18, jitterMs: 3, networkSpeedMbps: 304 }
      ),
      createCandidate(
        "site-meo-bridge",
        "meo",
        { gainDb: 36.1, pointingLossDb: 0.9 },
        { attenuationDb: 2.5, rainRateMmPerHr: 8 },
        { frequencyGHz: 18.7, elevationDeg: 44, availabilityPercent: 99.92 },
        { latencyMs: 33, jitterMs: 5, networkSpeedMbps: 214 }
      ),
      createCandidate(
        "site-geo-anchor",
        "geo",
        { gainDb: 39, pointingLossDb: 0.8 },
        { attenuationDb: 1.8, rainRateMmPerHr: 6 },
        { frequencyGHz: 11.9, elevationDeg: 56, availabilityPercent: 99.96 },
        { latencyMs: 86, jitterMs: 11, networkSpeedMbps: 123 }
      )
    ]),
    createWindowSeed(0.4, 0.78, "Site rain-stressed bridge", [
      createCandidate(
        "site-leo-primary",
        "leo",
        { gainDb: 35.8, pointingLossDb: 1.5 },
        { attenuationDb: 4.9, rainRateMmPerHr: 17 },
        { frequencyGHz: 21.9, elevationDeg: 37, availabilityPercent: 99.79 },
        { latencyMs: 27, jitterMs: 5, networkSpeedMbps: 224 }
      ),
      createCandidate(
        "site-meo-bridge",
        "meo",
        { gainDb: 37.4, pointingLossDb: 0.7 },
        { attenuationDb: 1.9, rainRateMmPerHr: 6 },
        { frequencyGHz: 18.5, elevationDeg: 47, availabilityPercent: 99.95 },
        { latencyMs: 22, jitterMs: 4, networkSpeedMbps: 246 }
      ),
      createCandidate(
        "site-geo-anchor",
        "geo",
        { gainDb: 39.2, pointingLossDb: 0.8 },
        { attenuationDb: 1.9, rainRateMmPerHr: 6 },
        { frequencyGHz: 11.9, elevationDeg: 57, availabilityPercent: 99.97 },
        { latencyMs: 84, jitterMs: 11, networkSpeedMbps: 126 }
      )
    ]),
    createWindowSeed(0.78, 1, "Site recovery tail", [
      createCandidate(
        "site-leo-primary",
        "leo",
        { gainDb: 38.4, pointingLossDb: 0.7 },
        { attenuationDb: 1.2, rainRateMmPerHr: 5 },
        { frequencyGHz: 20, elevationDeg: 52, availabilityPercent: 99.97 },
        { latencyMs: 19, jitterMs: 3, networkSpeedMbps: 296 }
      ),
      createCandidate(
        "site-geo-anchor",
        "geo",
        { gainDb: 39.3, pointingLossDb: 0.8 },
        { attenuationDb: 1.6, rainRateMmPerHr: 5 },
        { frequencyGHz: 11.8, elevationDeg: 57, availabilityPercent: 99.97 },
        { latencyMs: 83, jitterMs: 10, networkSpeedMbps: 128 }
      )
    ])
  ],
  "bootstrap-site-prerecorded": [
    createWindowSeed(0, 0.32, "Site replay ingress", [
      createCandidate(
        "site-leo-primary",
        "leo",
        { gainDb: 38.8, pointingLossDb: 0.6 },
        { attenuationDb: 0.9, rainRateMmPerHr: 4 },
        { frequencyGHz: 20, elevationDeg: 54, availabilityPercent: 99.98 },
        { latencyMs: 17, jitterMs: 3, networkSpeedMbps: 311 }
      ),
      createCandidate(
        "site-meo-bridge",
        "meo",
        { gainDb: 36.5, pointingLossDb: 0.8 },
        { attenuationDb: 2.1, rainRateMmPerHr: 7 },
        { frequencyGHz: 18.6, elevationDeg: 46, availabilityPercent: 99.94 },
        { latencyMs: 31, jitterMs: 5, networkSpeedMbps: 221 }
      ),
      createCandidate(
        "site-geo-anchor",
        "geo",
        { gainDb: 39.3, pointingLossDb: 0.7 },
        { attenuationDb: 1.5, rainRateMmPerHr: 5 },
        { frequencyGHz: 11.8, elevationDeg: 57, availabilityPercent: 99.97 },
        { latencyMs: 84, jitterMs: 10, networkSpeedMbps: 129 }
      )
    ]),
    createWindowSeed(0.32, 0.72, "Site replay bridge", [
      createCandidate(
        "site-leo-primary",
        "leo",
        { gainDb: 36, pointingLossDb: 1.4 },
        { attenuationDb: 4.4, rainRateMmPerHr: 15 },
        { frequencyGHz: 21.4, elevationDeg: 39, availabilityPercent: 99.82 },
        { latencyMs: 28, jitterMs: 5, networkSpeedMbps: 218 }
      ),
      createCandidate(
        "site-meo-bridge",
        "meo",
        { gainDb: 37.8, pointingLossDb: 0.7 },
        { attenuationDb: 1.6, rainRateMmPerHr: 5 },
        { frequencyGHz: 18.4, elevationDeg: 48, availabilityPercent: 99.96 },
        { latencyMs: 21, jitterMs: 4, networkSpeedMbps: 251 }
      ),
      createCandidate(
        "site-geo-anchor",
        "geo",
        { gainDb: 39.4, pointingLossDb: 0.7 },
        { attenuationDb: 1.6, rainRateMmPerHr: 5 },
        { frequencyGHz: 11.8, elevationDeg: 58, availabilityPercent: 99.98 },
        { latencyMs: 82, jitterMs: 10, networkSpeedMbps: 131 }
      )
    ]),
    createWindowSeed(0.72, 1, "Site replay recovery", [
      createCandidate(
        "site-leo-primary",
        "leo",
        { gainDb: 38.7, pointingLossDb: 0.6 },
        { attenuationDb: 1, rainRateMmPerHr: 4 },
        { frequencyGHz: 19.9, elevationDeg: 53, availabilityPercent: 99.98 },
        { latencyMs: 18, jitterMs: 3, networkSpeedMbps: 303 }
      ),
      createCandidate(
        "site-geo-anchor",
        "geo",
        { gainDb: 39.4, pointingLossDb: 0.7 },
        { attenuationDb: 1.5, rainRateMmPerHr: 5 },
        { frequencyGHz: 11.7, elevationDeg: 58, availabilityPercent: 99.98 },
        { latencyMs: 81, jitterMs: 10, networkSpeedMbps: 133 }
      )
    ])
  ]
};
