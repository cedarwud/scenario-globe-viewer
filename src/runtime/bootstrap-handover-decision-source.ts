import type { ScenePresetKey } from "../features/globe/scene-preset";
import {
  HANDOVER_DECISION_PROXY_PROVENANCE,
  type HandoverCandidateMetrics,
  type HandoverDecisionSnapshot,
  type OrbitClass
} from "../features/handover-decision/handover-decision";
import type { BootstrapScenarioMode } from "./resolve-bootstrap-scenario";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";

export const BOOTSTRAP_HANDOVER_POLICY_ID = "bootstrap-balanced-v1";

export interface BootstrapProxyHandoverDecisionWindow {
  startRatio: number;
  stopRatio: number;
  candidates: ReadonlyArray<HandoverCandidateMetrics>;
}

export interface BootstrapProxyHandoverDecisionSourceEntry {
  scenarioId: string;
  policyId: string;
  initialServingCandidateId?: string;
  windows: ReadonlyArray<BootstrapProxyHandoverDecisionWindow>;
}

export interface BootstrapProxyHandoverDecisionSourceCatalog {
  entries: ReadonlyArray<BootstrapProxyHandoverDecisionSourceEntry>;
}

interface BootstrapProxyHandoverCandidateSeed {
  candidateId: string;
  orbitClass: OrbitClass;
  latencyMs: number;
  jitterMs: number;
  networkSpeedMbps: number;
}

interface BootstrapProxyHandoverWindowSeed {
  startRatio: number;
  stopRatio: number;
  candidates: ReadonlyArray<BootstrapProxyHandoverCandidateSeed>;
}

const BOOTSTRAP_HANDOVER_WINDOW_SEEDS: Record<
  ScenePresetKey,
  Record<BootstrapScenarioMode, ReadonlyArray<BootstrapProxyHandoverWindowSeed>>
> = {
  global: {
    "real-time": [
      {
        startRatio: 0,
        stopRatio: 0.34,
        candidates: [
          createCandidateSeed("global-leo-primary", "leo", 29, 4, 242),
          createCandidateSeed("global-meo-bridge", "meo", 43, 7, 188),
          createCandidateSeed("global-geo-anchor", "geo", 102, 15, 94)
        ]
      },
      {
        startRatio: 0.34,
        stopRatio: 0.7,
        candidates: [
          createCandidateSeed("global-leo-primary", "leo", 44, 8, 174),
          createCandidateSeed("global-meo-bridge", "meo", 33, 5, 224),
          createCandidateSeed("global-geo-anchor", "geo", 99, 14, 96)
        ]
      },
      {
        startRatio: 0.7,
        stopRatio: 1,
        candidates: [
          createCandidateSeed("global-leo-primary", "leo", 31, 5, 236),
          createCandidateSeed("global-geo-anchor", "geo", 98, 14, 99)
        ]
      }
    ],
    prerecorded: [
      {
        startRatio: 0,
        stopRatio: 0.3,
        candidates: [
          createCandidateSeed("global-leo-primary", "leo", 27, 4, 251),
          createCandidateSeed("global-meo-bridge", "meo", 39, 6, 204),
          createCandidateSeed("global-geo-anchor", "geo", 100, 15, 101)
        ]
      },
      {
        startRatio: 0.3,
        stopRatio: 0.62,
        candidates: [
          createCandidateSeed("global-leo-primary", "leo", 40, 7, 186),
          createCandidateSeed("global-meo-bridge", "meo", 34, 5, 218),
          createCandidateSeed("global-geo-anchor", "geo", 96, 13, 106)
        ]
      },
      {
        startRatio: 0.62,
        stopRatio: 1,
        candidates: [
          createCandidateSeed("global-leo-primary", "leo", 29, 4, 244),
          createCandidateSeed("global-meo-bridge", "meo", 37, 6, 211),
          createCandidateSeed("global-geo-anchor", "geo", 97, 14, 102)
        ]
      }
    ]
  },
  regional: {
    "real-time": [
      {
        startRatio: 0,
        stopRatio: 0.36,
        candidates: [
          createCandidateSeed("regional-leo-primary", "leo", 24, 3, 278),
          createCandidateSeed("regional-meo-bridge", "meo", 36, 5, 221),
          createCandidateSeed("regional-geo-anchor", "geo", 91, 12, 110)
        ]
      },
      {
        startRatio: 0.36,
        stopRatio: 0.74,
        candidates: [
          createCandidateSeed("regional-leo-primary", "leo", 35, 6, 192),
          createCandidateSeed("regional-meo-bridge", "meo", 29, 4, 238),
          createCandidateSeed("regional-geo-anchor", "geo", 89, 12, 112)
        ]
      },
      {
        startRatio: 0.74,
        stopRatio: 1,
        candidates: [
          createCandidateSeed("regional-leo-primary", "leo", 25, 3, 269),
          createCandidateSeed("regional-meo-bridge", "meo", 33, 4, 228),
          createCandidateSeed("regional-geo-anchor", "geo", 88, 11, 114)
        ]
      }
    ],
    prerecorded: [
      {
        startRatio: 0,
        stopRatio: 0.28,
        candidates: [
          createCandidateSeed("regional-leo-primary", "leo", 23, 3, 282),
          createCandidateSeed("regional-meo-bridge", "meo", 35, 5, 227),
          createCandidateSeed("regional-geo-anchor", "geo", 90, 11, 115)
        ]
      },
      {
        startRatio: 0.28,
        stopRatio: 0.66,
        candidates: [
          createCandidateSeed("regional-leo-primary", "leo", 34, 5, 198),
          createCandidateSeed("regional-meo-bridge", "meo", 28, 4, 242),
          createCandidateSeed("regional-geo-anchor", "geo", 87, 11, 118)
        ]
      },
      {
        startRatio: 0.66,
        stopRatio: 1,
        candidates: [
          createCandidateSeed("regional-leo-primary", "leo", 24, 3, 276),
          createCandidateSeed("regional-meo-bridge", "meo", 31, 4, 234),
          createCandidateSeed("regional-geo-anchor", "geo", 86, 11, 119)
        ]
      }
    ]
  },
  site: {
    "real-time": [
      {
        startRatio: 0,
        stopRatio: 0.4,
        candidates: [
          createCandidateSeed("site-leo-primary", "leo", 18, 3, 304),
          createCandidateSeed("site-meo-bridge", "meo", 33, 5, 214),
          createCandidateSeed("site-geo-anchor", "geo", 86, 11, 123)
        ]
      },
      {
        startRatio: 0.4,
        stopRatio: 0.78,
        candidates: [
          createCandidateSeed("site-leo-primary", "leo", 27, 5, 224),
          createCandidateSeed("site-meo-bridge", "meo", 22, 4, 246),
          createCandidateSeed("site-geo-anchor", "geo", 84, 11, 126)
        ]
      },
      {
        startRatio: 0.78,
        stopRatio: 1,
        candidates: [
          createCandidateSeed("site-leo-primary", "leo", 19, 3, 296),
          createCandidateSeed("site-geo-anchor", "geo", 83, 10, 128)
        ]
      }
    ],
    prerecorded: [
      {
        startRatio: 0,
        stopRatio: 0.32,
        candidates: [
          createCandidateSeed("site-leo-primary", "leo", 17, 3, 311),
          createCandidateSeed("site-meo-bridge", "meo", 31, 5, 221),
          createCandidateSeed("site-geo-anchor", "geo", 84, 10, 129)
        ]
      },
      {
        startRatio: 0.32,
        stopRatio: 0.72,
        candidates: [
          createCandidateSeed("site-leo-primary", "leo", 28, 5, 218),
          createCandidateSeed("site-meo-bridge", "meo", 21, 4, 251),
          createCandidateSeed("site-geo-anchor", "geo", 82, 10, 131)
        ]
      },
      {
        startRatio: 0.72,
        stopRatio: 1,
        candidates: [
          createCandidateSeed("site-leo-primary", "leo", 18, 3, 303),
          createCandidateSeed("site-geo-anchor", "geo", 81, 10, 133)
        ]
      }
    ]
  }
};

function createCandidateSeed(
  candidateId: string,
  orbitClass: OrbitClass,
  latencyMs: number,
  jitterMs: number,
  networkSpeedMbps: number
): BootstrapProxyHandoverCandidateSeed {
  return {
    candidateId,
    orbitClass,
    latencyMs,
    jitterMs,
    networkSpeedMbps
  };
}

function toEpochMilliseconds(value: string): number {
  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Bootstrap handover decision timestamp must parse: ${value}`);
  }

  return epochMs;
}

function assertRatioWindow(window: BootstrapProxyHandoverWindowSeed): void {
  if (
    !Number.isFinite(window.startRatio) ||
    !Number.isFinite(window.stopRatio) ||
    window.startRatio < 0 ||
    window.stopRatio > 1 ||
    window.startRatio >= window.stopRatio
  ) {
    throw new Error(
      `Bootstrap handover decision ratios must stay within [0, 1] and preserve ordering: ${JSON.stringify(window)}`
    );
  }
}

function cloneCandidates(
  candidates: ReadonlyArray<BootstrapProxyHandoverCandidateSeed>
): HandoverCandidateMetrics[] {
  return candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
    latencyMs: candidate.latencyMs,
    jitterMs: candidate.jitterMs,
    networkSpeedMbps: candidate.networkSpeedMbps,
    provenance: HANDOVER_DECISION_PROXY_PROVENANCE
  }));
}

function cloneWindows(
  windows: ReadonlyArray<BootstrapProxyHandoverWindowSeed>
): BootstrapProxyHandoverDecisionWindow[] {
  return windows.map((window) => {
    assertRatioWindow(window);

    return {
      startRatio: window.startRatio,
      stopRatio: window.stopRatio,
      candidates: cloneCandidates(window.candidates)
    };
  });
}

function resolveBootstrapScenarioMode(
  definition: BootstrapScenarioDefinition
): BootstrapScenarioMode {
  if (
    definition.kind !== "real-time" &&
    definition.kind !== "prerecorded"
  ) {
    throw new Error(
      `Bootstrap handover decision source must stay on bootstrap-safe scenario kinds: ${definition.id}`
    );
  }

  if (
    definition.time.mode !== "real-time" &&
    definition.time.mode !== "prerecorded"
  ) {
    throw new Error(
      `Bootstrap handover decision source must stay bounded to real-time/prerecorded modes: ${definition.id}`
    );
  }

  return definition.time.mode;
}

function assertBootstrapDecisionSources(
  definition: BootstrapScenarioDefinition
): void {
  if (definition.sources.satellite) {
    throw new Error(
      `Bootstrap handover decision source must not attach satellite sources: ${definition.id}`
    );
  }

  if (definition.sources.siteDataset) {
    throw new Error(
      `Bootstrap handover decision source must not attach site datasets: ${definition.id}`
    );
  }

  if (definition.sources.validation) {
    throw new Error(
      `Bootstrap handover decision source must not attach validation refs: ${definition.id}`
    );
  }
}

function resolveProgressRatio(
  evaluatedAt: string,
  activeRange: { start: string; stop: string }
): number {
  const startMs = toEpochMilliseconds(activeRange.start);
  const stopMs = toEpochMilliseconds(activeRange.stop);
  const evaluatedAtMs = toEpochMilliseconds(evaluatedAt);

  if (startMs > stopMs) {
    throw new Error(
      "Bootstrap handover decision activeRange start must not exceed stop."
    );
  }

  if (evaluatedAtMs < startMs || evaluatedAtMs > stopMs) {
    throw new Error(
      "Bootstrap handover decision evaluatedAt must stay within the activeRange."
    );
  }

  if (startMs === stopMs) {
    return 0;
  }

  return (evaluatedAtMs - startMs) / (stopMs - startMs);
}

function resolveWindowForRatio(
  windows: ReadonlyArray<BootstrapProxyHandoverDecisionWindow>,
  ratio: number
): BootstrapProxyHandoverDecisionWindow {
  const resolvedWindow =
    windows.find(
      (window) =>
        ratio >= window.startRatio &&
        (ratio < window.stopRatio || window.stopRatio === 1)
    ) ?? windows[windows.length - 1];

  if (!resolvedWindow) {
    throw new Error("Bootstrap handover decision source must define at least one window.");
  }

  return {
    startRatio: resolvedWindow.startRatio,
    stopRatio: resolvedWindow.stopRatio,
    candidates: resolvedWindow.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      orbitClass: candidate.orbitClass,
      latencyMs: candidate.latencyMs,
      jitterMs: candidate.jitterMs,
      networkSpeedMbps: candidate.networkSpeedMbps,
      provenance: candidate.provenance
    }))
  };
}

export function createBootstrapProxyHandoverDecisionSourceCatalog(
  definitions: ReadonlyArray<BootstrapScenarioDefinition>
): BootstrapProxyHandoverDecisionSourceCatalog {
  return {
    entries: definitions.map((definition) => {
      assertBootstrapDecisionSources(definition);
      const mode = resolveBootstrapScenarioMode(definition);

      if (definition.kind !== mode) {
        throw new Error(
          `Bootstrap handover decision source must keep scenario kind aligned with replay mode: ${definition.id}`
        );
      }

      const windows = cloneWindows(
        BOOTSTRAP_HANDOVER_WINDOW_SEEDS[definition.presentation.presetKey][mode]
      );

      return {
        scenarioId: definition.id,
        policyId: BOOTSTRAP_HANDOVER_POLICY_ID,
        initialServingCandidateId: windows[0]?.candidates[0]?.candidateId,
        windows
      };
    })
  };
}

export function resolveBootstrapProxyHandoverDecisionSourceEntry(
  catalog: BootstrapProxyHandoverDecisionSourceCatalog,
  scenarioId: string
): BootstrapProxyHandoverDecisionSourceEntry {
  const entry = catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);

  if (!entry) {
    throw new Error(
      `Missing bootstrap handover decision source for scenario: ${scenarioId}`
    );
  }

  return {
    scenarioId: entry.scenarioId,
    policyId: entry.policyId,
    ...(entry.initialServingCandidateId
      ? { initialServingCandidateId: entry.initialServingCandidateId }
      : {}),
    windows: entry.windows.map((window) => ({
      startRatio: window.startRatio,
      stopRatio: window.stopRatio,
      candidates: window.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        orbitClass: candidate.orbitClass,
        latencyMs: candidate.latencyMs,
        jitterMs: candidate.jitterMs,
        networkSpeedMbps: candidate.networkSpeedMbps,
        provenance: candidate.provenance
      }))
    }))
  };
}

export function resolveBootstrapProxyHandoverDecisionSnapshot(
  catalog: BootstrapProxyHandoverDecisionSourceCatalog,
  options: {
    scenarioId: string;
    evaluatedAt: string;
    activeRange: {
      start: string;
      stop: string;
    };
    currentServingCandidateId?: string;
  }
): HandoverDecisionSnapshot {
  const entry = resolveBootstrapProxyHandoverDecisionSourceEntry(
    catalog,
    options.scenarioId
  );
  const progressRatio = resolveProgressRatio(options.evaluatedAt, options.activeRange);
  const activeWindow = resolveWindowForRatio(entry.windows, progressRatio);

  return {
    scenarioId: entry.scenarioId,
    evaluatedAt: options.evaluatedAt,
    activeRange: {
      start: options.activeRange.start,
      stop: options.activeRange.stop
    },
    ...(options.currentServingCandidateId ?? entry.initialServingCandidateId
      ? {
          currentServingCandidateId:
            options.currentServingCandidateId ?? entry.initialServingCandidateId
        }
      : {}),
    policyId: entry.policyId,
    candidates: activeWindow.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      orbitClass: candidate.orbitClass,
      latencyMs: candidate.latencyMs,
      jitterMs: candidate.jitterMs,
      networkSpeedMbps: candidate.networkSpeedMbps,
      provenance: candidate.provenance
    }))
  };
}
