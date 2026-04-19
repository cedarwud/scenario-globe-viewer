import {
  createValidationState,
  type ValidationAttachState,
  type ValidationDutKind,
  type ValidationEnvironmentMode,
  type ValidationProvenance,
  type ValidationState,
  type ValidationTransportKind
} from "../features/validation-state";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";

export interface BootstrapValidationStateWindow {
  startRatio: number;
  stopRatio: number;
  attachState: ValidationAttachState;
}

export interface BootstrapValidationStateSourceEntry {
  scenarioId: string;
  environmentMode: ValidationEnvironmentMode;
  transportKind: ValidationTransportKind;
  dutKind: ValidationDutKind;
  windows: ReadonlyArray<BootstrapValidationStateWindow>;
  provenance: ValidationProvenance;
}

export interface BootstrapValidationStateSourceCatalog {
  entries: ReadonlyArray<BootstrapValidationStateSourceEntry>;
}

interface BootstrapValidationModeSeed {
  environmentMode: ValidationEnvironmentMode;
  transportKind: ValidationTransportKind;
  dutKind: ValidationDutKind;
  windows: ReadonlyArray<BootstrapValidationStateWindow>;
}

const BOOTSTRAP_VALIDATION_PROVENANCE: ValidationProvenance = {
  kind: "bounded-proxy",
  label: "validation bounded proxy",
  detail:
    "Scenario-bounded validation state materialized from repo-owned environment-mode, transport-kind, DUT-kind, and attach-state definitions; NAT/tunnel/bridge implementation remains external."
};

const BOOTSTRAP_VALIDATION_MODE_SEEDS: Record<
  string,
  BootstrapValidationModeSeed
> = {
  "bootstrap-global-real-time": {
    environmentMode: "linux-direct",
    transportKind: "direct",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.18, attachState: "detached" },
      { startRatio: 0.18, stopRatio: 0.82, attachState: "attached" },
      { startRatio: 0.82, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-global-prerecorded": {
    environmentMode: "linux-direct",
    transportKind: "direct",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.12, attachState: "detached" },
      { startRatio: 0.12, stopRatio: 0.88, attachState: "attached" },
      { startRatio: 0.88, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-regional-real-time": {
    environmentMode: "windows-wsl-tunnel",
    transportKind: "tunnel",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.14, attachState: "detached" },
      { startRatio: 0.14, stopRatio: 0.76, attachState: "attached" },
      { startRatio: 0.76, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-regional-prerecorded": {
    environmentMode: "windows-wsl-tunnel",
    transportKind: "tunnel",
    dutKind: "virtual",
    windows: [
      { startRatio: 0, stopRatio: 0.1, attachState: "detached" },
      { startRatio: 0.1, stopRatio: 0.72, attachState: "attached" },
      { startRatio: 0.72, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-site-real-time": {
    environmentMode: "inet-nat-bridge",
    transportKind: "nat-bridge",
    dutKind: "physical",
    windows: [
      { startRatio: 0, stopRatio: 0.22, attachState: "detached" },
      { startRatio: 0.22, stopRatio: 0.87, attachState: "bridged" },
      { startRatio: 0.87, stopRatio: 1, attachState: "detached" }
    ]
  },
  "bootstrap-site-prerecorded": {
    environmentMode: "inet-nat-bridge",
    transportKind: "nat-bridge",
    dutKind: "physical",
    windows: [
      { startRatio: 0, stopRatio: 0.18, attachState: "detached" },
      { startRatio: 0.18, stopRatio: 0.82, attachState: "bridged" },
      { startRatio: 0.82, stopRatio: 1, attachState: "detached" }
    ]
  }
};

function toEpochMilliseconds(value: string): number {
  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Bootstrap validation-state timestamp must parse: ${value}`);
  }

  return epochMs;
}

function assertBootstrapValidationSources(
  definition: BootstrapScenarioDefinition
): void {
  if (definition.sources.satellite) {
    throw new Error(
      `Bootstrap validation-state source must not attach satellite sources: ${definition.id}`
    );
  }

  if (definition.sources.siteDataset) {
    throw new Error(
      `Bootstrap validation-state source must not attach site datasets: ${definition.id}`
    );
  }

  if (definition.sources.validation) {
    throw new Error(
      `Bootstrap validation-state source must not attach validation refs: ${definition.id}`
    );
  }
}

function cloneWindow(
  window: BootstrapValidationStateWindow
): BootstrapValidationStateWindow {
  return {
    startRatio: window.startRatio,
    stopRatio: window.stopRatio,
    attachState: window.attachState
  };
}

function cloneProvenance(
  provenance: ValidationProvenance
): ValidationProvenance {
  return {
    kind: provenance.kind,
    label: provenance.label,
    detail: provenance.detail
  };
}

function clampRatio(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function resolveValidationProgressRatio(options: {
  activeRange: { start: string; stop: string };
  evaluatedAt: string;
}): number {
  const startMs = toEpochMilliseconds(options.activeRange.start);
  const stopMs = toEpochMilliseconds(options.activeRange.stop);
  const evaluatedAtMs = toEpochMilliseconds(options.evaluatedAt);

  if (startMs > stopMs) {
    throw new Error("Bootstrap validation-state range start must not exceed stop.");
  }

  if (startMs === stopMs) {
    return 1;
  }

  return clampRatio((evaluatedAtMs - startMs) / (stopMs - startMs));
}

function resolveActiveValidationWindow(
  windows: ReadonlyArray<BootstrapValidationStateWindow>,
  progressRatio: number
): BootstrapValidationStateWindow {
  const activeWindow =
    windows.find((window, index) => {
      const isLastWindow = index === windows.length - 1;
      return isLastWindow
        ? progressRatio >= window.startRatio && progressRatio <= window.stopRatio
        : progressRatio >= window.startRatio && progressRatio < window.stopRatio;
    }) ?? windows.at(-1);

  if (!activeWindow) {
    throw new Error("Bootstrap validation-state source must define at least one window.");
  }

  return cloneWindow(activeWindow);
}

export function createBootstrapValidationStateSourceCatalog(
  definitions: ReadonlyArray<BootstrapScenarioDefinition>
): BootstrapValidationStateSourceCatalog {
  return {
    entries: definitions.map((definition) => {
      assertBootstrapValidationSources(definition);
      const seed = BOOTSTRAP_VALIDATION_MODE_SEEDS[definition.id];

      if (!seed) {
        throw new Error(
          `Bootstrap validation-state source is missing a repo-owned seed for scenario: ${definition.id}`
        );
      }

      return {
        scenarioId: definition.id,
        environmentMode: seed.environmentMode,
        transportKind: seed.transportKind,
        dutKind: seed.dutKind,
        windows: seed.windows.map((window) => cloneWindow(window)),
        provenance: cloneProvenance(BOOTSTRAP_VALIDATION_PROVENANCE)
      };
    })
  };
}

export function resolveBootstrapValidationStateSourceEntry(
  catalog: BootstrapValidationStateSourceCatalog,
  scenarioId: string
): BootstrapValidationStateSourceEntry {
  const entry = catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);

  if (!entry) {
    throw new Error(
      `Missing bootstrap validation-state source for scenario: ${scenarioId}`
    );
  }

  return {
    scenarioId: entry.scenarioId,
    environmentMode: entry.environmentMode,
    transportKind: entry.transportKind,
    dutKind: entry.dutKind,
    windows: entry.windows.map((window) => cloneWindow(window)),
    provenance: cloneProvenance(entry.provenance)
  };
}

export function resolveBootstrapValidationState(
  catalog: BootstrapValidationStateSourceCatalog,
  options: {
    scenarioId: string;
    evaluatedAt: string;
    activeRange: {
      start: string;
      stop: string;
    };
    servingCandidateId?: string;
  }
): ValidationState {
  const entry = resolveBootstrapValidationStateSourceEntry(
    catalog,
    options.scenarioId
  );
  const progressRatio = resolveValidationProgressRatio({
    activeRange: options.activeRange,
    evaluatedAt: options.evaluatedAt
  });
  const activeWindow = resolveActiveValidationWindow(entry.windows, progressRatio);

  return createValidationState({
    scenarioId: entry.scenarioId,
    evaluatedAt: options.evaluatedAt,
    environmentMode: entry.environmentMode,
    transportKind: entry.transportKind,
    dutKind: entry.dutKind,
    attachState: activeWindow.attachState,
    ...(activeWindow.attachState !== "detached" && options.servingCandidateId
      ? { servingCandidateId: options.servingCandidateId }
      : {}),
    provenance: cloneProvenance(entry.provenance)
  });
}
