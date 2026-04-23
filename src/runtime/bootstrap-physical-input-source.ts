import {
  createPhysicalInputState,
  resolveActivePhysicalInputWindow,
  resolvePhysicalInputProgressRatio,
  type CandidatePhysicalInputs,
  type PhysicalInputProvenance,
  type PhysicalInputState,
  type PhysicalInputWindow
} from "../features/physical-input/physical-input";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";
import {
  BOOTSTRAP_PHYSICAL_INPUT_PROVENANCE,
  BOOTSTRAP_PHYSICAL_SOURCE_SEEDS,
  type BootstrapPhysicalWindowSeed
} from "./bootstrap-physical-input-seeds";

export interface BootstrapPhysicalInputWindow extends PhysicalInputWindow {
  contextLabel: string;
}

export interface BootstrapPhysicalInputSourceEntry {
  scenarioId: string;
  windows: ReadonlyArray<BootstrapPhysicalInputWindow>;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
}

export interface BootstrapPhysicalInputSourceCatalog {
  entries: ReadonlyArray<BootstrapPhysicalInputSourceEntry>;
}

export const BOOTSTRAP_PHYSICAL_INPUT_INACTIVE_CONTEXT_LABEL =
  "Bootstrap physical-input inactive for unsupported scenarioId";

function cloneCandidate(candidate: CandidatePhysicalInputs): CandidatePhysicalInputs {
  return {
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
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
  provenance: ReadonlyArray<PhysicalInputProvenance>
): PhysicalInputProvenance[] {
  return provenance.map((entry) => ({
    family: entry.family,
    kind: entry.kind,
    label: entry.label,
    detail: entry.detail,
    ...(entry.sourceRef ? { sourceRef: entry.sourceRef } : {})
  }));
}

function cloneWindows(
  windows: ReadonlyArray<BootstrapPhysicalWindowSeed>
): BootstrapPhysicalInputWindow[] {
  return windows.map((window) => ({
    startRatio: window.startRatio,
    stopRatio: window.stopRatio,
    contextLabel: window.contextLabel,
    candidates: window.candidates.map((candidate) => cloneCandidate(candidate))
  }));
}

function findContextLabel(
  entry: BootstrapPhysicalInputSourceEntry,
  activeWindow: PhysicalInputWindow
): string {
  const matchingWindow = entry.windows.find(
    (window) =>
      window.startRatio === activeWindow.startRatio &&
      window.stopRatio === activeWindow.stopRatio
  );

  return matchingWindow?.contextLabel ?? "Active physical window";
}

function findBootstrapPhysicalInputSourceEntry(
  catalog: BootstrapPhysicalInputSourceCatalog,
  scenarioId: string
): BootstrapPhysicalInputSourceEntry | undefined {
  return catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);
}

function cloneEntry(
  entry: BootstrapPhysicalInputSourceEntry
): BootstrapPhysicalInputSourceEntry {
  return {
    scenarioId: entry.scenarioId,
    windows: entry.windows.map((window) => ({
      startRatio: window.startRatio,
      stopRatio: window.stopRatio,
      contextLabel: window.contextLabel,
      candidates: window.candidates.map((candidate) => cloneCandidate(candidate))
    })),
    provenance: cloneProvenance(entry.provenance)
  };
}

function assertBootstrapPhysicalInputSources(
  definition: BootstrapScenarioDefinition
): void {
  if (definition.sources.satellite) {
    throw new Error(
      `Bootstrap physical-input source must not attach satellite sources: ${definition.id}`
    );
  }

  if (definition.sources.siteDataset) {
    throw new Error(
      `Bootstrap physical-input source must not attach site datasets: ${definition.id}`
    );
  }

  if (definition.sources.validation) {
    throw new Error(
      `Bootstrap physical-input source must not attach validation refs: ${definition.id}`
    );
  }
}

export function createBootstrapPhysicalInputSourceCatalog(
  definitions: ReadonlyArray<BootstrapScenarioDefinition>
): BootstrapPhysicalInputSourceCatalog {
  return {
    entries: definitions.map((definition) => {
      assertBootstrapPhysicalInputSources(definition);
      const windows = BOOTSTRAP_PHYSICAL_SOURCE_SEEDS[definition.id];

      if (!windows) {
        throw new Error(
          `Missing bootstrap physical-input seed windows for scenario: ${definition.id}`
        );
      }

      return {
        scenarioId: definition.id,
        windows: cloneWindows(windows),
        provenance: cloneProvenance(BOOTSTRAP_PHYSICAL_INPUT_PROVENANCE)
      };
    })
  };
}

export function resolveBootstrapPhysicalInputSourceEntry(
  catalog: BootstrapPhysicalInputSourceCatalog,
  scenarioId: string
): BootstrapPhysicalInputSourceEntry {
  const entry = findBootstrapPhysicalInputSourceEntry(catalog, scenarioId);

  if (!entry) {
    throw new Error(
      `Missing bootstrap physical-input source for scenario: ${scenarioId}`
    );
  }

  return cloneEntry(entry);
}

function createInactiveBootstrapPhysicalInputState(options: {
  scenarioId: string;
  scenarioLabel: string;
  evaluatedAt: string;
  activeRange: {
    start: string;
    stop: string;
  };
}): PhysicalInputState {
  // Unsupported scenario ids stay outside bootstrap-owned catalogs and resolve
  // to an explicit empty window instead of borrowing another bootstrap seed.
  return createPhysicalInputState({
    scenario: {
      id: options.scenarioId,
      label: options.scenarioLabel
    },
    activeRange: options.activeRange,
    evaluatedAt: options.evaluatedAt,
    sourceEntry: {
      scenarioId: options.scenarioId,
      windows: [
        {
          startRatio: 0,
          stopRatio: 1,
          candidates: []
        }
      ],
      provenance: []
    },
    activeContextLabel: BOOTSTRAP_PHYSICAL_INPUT_INACTIVE_CONTEXT_LABEL
  });
}

export function resolveBootstrapPhysicalInputState(
  catalog: BootstrapPhysicalInputSourceCatalog,
  options: {
    scenarioId: string;
    scenarioLabel: string;
    evaluatedAt: string;
    activeRange: {
      start: string;
      stop: string;
    };
  }
): PhysicalInputState {
  const entry = findBootstrapPhysicalInputSourceEntry(catalog, options.scenarioId);

  if (!entry) {
    return createInactiveBootstrapPhysicalInputState(options);
  }

  const progressRatio = resolvePhysicalInputProgressRatio(
    options.evaluatedAt,
    options.activeRange
  );
  const activeWindow = resolveActivePhysicalInputWindow(entry.windows, progressRatio);
  const contextLabel = findContextLabel(entry, activeWindow);

  return createPhysicalInputState({
    scenario: {
      id: options.scenarioId,
      label: options.scenarioLabel
    },
    activeRange: options.activeRange,
    evaluatedAt: options.evaluatedAt,
    sourceEntry: {
      scenarioId: entry.scenarioId,
      windows: entry.windows.map((window) => ({
        startRatio: window.startRatio,
        stopRatio: window.stopRatio,
        candidates: window.candidates
      })),
      provenance: entry.provenance
    },
    activeContextLabel: contextLabel
  });
}

export function resolveBootstrapPhysicalProjectedMetrics(
  catalog: BootstrapPhysicalInputSourceCatalog,
  options: {
    scenarioId: string;
    scenarioLabel: string;
    evaluatedAt: string;
    activeRange: {
      start: string;
      stop: string;
    };
  }
): PhysicalInputState["projectedMetrics"] {
  return resolveBootstrapPhysicalInputState(catalog, options).projectedMetrics;
}
