import {
  createPhysicalInputState,
  type PhysicalInputState
} from "../features/physical-input/physical-input";
import type {
  FirstIntakePathProjectionSeed
} from "../features/physical-input/path-projection-adapter";
import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import type { ReplayClock, ReplayClockState } from "../features/time";
import {
  FIRST_INTAKE_PHYSICAL_INPUT_CONTEXT_LABEL,
  createFirstIntakePhysicalInputSourceCatalog,
  resolveFirstIntakePhysicalInputSourceEntry,
  type FirstIntakePhysicalInputSourceCatalog
} from "./first-intake-physical-input-source";

export interface FirstIntakePhysicalInputRuntimeLineage {
  seedPath: FirstIntakePhysicalInputSourceCatalog["sourceLineage"]["seedPath"];
  scenarioSurface: "createFirstIntakeRuntimeScenarioSurface";
  sourceCatalog: "createFirstIntakePhysicalInputSourceCatalog";
  sourceAdapter:
    FirstIntakePhysicalInputSourceCatalog["sourceLineage"]["adapter"];
  boundedMetricProfile:
    FirstIntakePhysicalInputSourceCatalog["sourceLineage"]["boundedMetricProfile"];
  boundedMetricProfileId: string;
  stateResolver: "createPhysicalInputState";
  bootstrapFallback:
    FirstIntakePhysicalInputSourceCatalog["sourceLineage"]["bootstrapFallback"];
}

export interface FirstIntakePhysicalInputRuntimeState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  adoptionMode: FirstIntakePhysicalInputSourceCatalog["adoptionMode"];
  physicalInput: PhysicalInputState;
  sourceLineage: FirstIntakePhysicalInputRuntimeLineage;
}

export interface FirstIntakePhysicalInputController {
  getState(): FirstIntakePhysicalInputRuntimeState;
  subscribe(
    listener: (state: FirstIntakePhysicalInputRuntimeState) => void
  ): () => void;
  dispose(): void;
}

export interface FirstIntakePhysicalInputControllerOptions {
  replayClock: ReplayClock;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  seeds: ReadonlyArray<FirstIntakePathProjectionSeed>;
}

function toIsoTimestamp(value: string | number): string {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(
      `First-intake physical-input timestamp must parse: ${value}`
    );
  }

  return new Date(epochMs).toISOString();
}

function resolveState(
  replayState: ReplayClockState,
  scenarioSurface: FirstIntakeRuntimeScenarioSurface,
  sourceCatalog: FirstIntakePhysicalInputSourceCatalog
): FirstIntakePhysicalInputRuntimeState {
  const runtimeScenarioState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const physicalInput = createPhysicalInputState({
    scenario: {
      id: addressedEntry.scenarioId,
      label: addressedEntry.definition.label
    },
    activeRange: {
      start: toIsoTimestamp(replayState.startTime),
      stop: toIsoTimestamp(replayState.stopTime)
    },
    evaluatedAt: toIsoTimestamp(replayState.currentTime),
    sourceEntry: resolveFirstIntakePhysicalInputSourceEntry(
      sourceCatalog,
      addressedEntry.scenarioId
    ),
    activeContextLabel: FIRST_INTAKE_PHYSICAL_INPUT_CONTEXT_LABEL
  });

  return {
    scenarioId: addressedEntry.scenarioId,
    scenarioLabel: addressedEntry.definition.label,
    addressQuery: addressedEntry.addressQuery,
    addressResolution: runtimeScenarioState.addressResolution,
    adoptionMode: sourceCatalog.adoptionMode,
    physicalInput,
    sourceLineage: {
      seedPath: sourceCatalog.sourceLineage.seedPath,
      scenarioSurface: "createFirstIntakeRuntimeScenarioSurface",
      sourceCatalog: "createFirstIntakePhysicalInputSourceCatalog",
      sourceAdapter: sourceCatalog.sourceLineage.adapter,
      boundedMetricProfile: sourceCatalog.sourceLineage.boundedMetricProfile,
      boundedMetricProfileId: sourceCatalog.sourceLineage.boundedMetricProfileId,
      stateResolver: "createPhysicalInputState",
      bootstrapFallback: sourceCatalog.sourceLineage.bootstrapFallback
    }
  };
}

export function createFirstIntakePhysicalInputController({
  replayClock,
  scenarioSurface,
  seeds
}: FirstIntakePhysicalInputControllerOptions): FirstIntakePhysicalInputController {
  const listeners = new Set<
    (state: FirstIntakePhysicalInputRuntimeState) => void
  >();
  const sourceCatalog = createFirstIntakePhysicalInputSourceCatalog(seeds);
  let lastState = resolveState(
    replayClock.getState(),
    scenarioSurface,
    sourceCatalog
  );

  const notify = (
    nextState: FirstIntakePhysicalInputRuntimeState
  ): FirstIntakePhysicalInputRuntimeState => {
    lastState = nextState;

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribe = replayClock.onTick((nextReplayState) => {
    notify(resolveState(nextReplayState, scenarioSurface, sourceCatalog));
  });

  return {
    getState(): FirstIntakePhysicalInputRuntimeState {
      return lastState;
    },
    subscribe(
      listener: (state: FirstIntakePhysicalInputRuntimeState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      unsubscribe();
    }
  };
}
