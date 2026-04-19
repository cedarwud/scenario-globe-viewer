import type { PhysicalInputState } from "../features/physical-input/physical-input";
import type { BootstrapOperatorControllerState } from "./bootstrap-operator-controller";
import type { BootstrapScenarioCatalog } from "./resolve-bootstrap-scenario";
import {
  createBootstrapPhysicalInputSourceCatalog,
  resolveBootstrapPhysicalInputState,
  type BootstrapPhysicalInputSourceCatalog
} from "./bootstrap-physical-input-source";

export interface BootstrapPhysicalInputController {
  getState(): PhysicalInputState;
  subscribe(listener: (state: PhysicalInputState) => void): () => void;
  dispose(): void;
}

export interface BootstrapPhysicalInputControllerOptions {
  operatorState: BootstrapPhysicalInputStateReadable;
  scenarioCatalog: BootstrapScenarioCatalog;
}

export interface BootstrapPhysicalInputStateReadable {
  getState(): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
}

function toIsoTimestamp(value: string | number): string {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Bootstrap physical-input timestamp must parse: ${value}`);
  }

  return new Date(epochMs).toISOString();
}

function resolveState(
  operatorState: BootstrapOperatorControllerState,
  sourceCatalog: BootstrapPhysicalInputSourceCatalog
): PhysicalInputState {
  return resolveBootstrapPhysicalInputState(sourceCatalog, {
    scenarioId: operatorState.scenarioId,
    scenarioLabel: operatorState.scenarioLabel,
    evaluatedAt: toIsoTimestamp(operatorState.currentTime),
    activeRange: {
      start: toIsoTimestamp(operatorState.startTime),
      stop: toIsoTimestamp(operatorState.stopTime)
    }
  });
}

export function createBootstrapPhysicalInputController({
  operatorState,
  scenarioCatalog
}: BootstrapPhysicalInputControllerOptions): BootstrapPhysicalInputController {
  const listeners = new Set<(state: PhysicalInputState) => void>();
  const sourceCatalog = createBootstrapPhysicalInputSourceCatalog(
    scenarioCatalog.definitions
  );
  let lastState = resolveState(operatorState.getState(), sourceCatalog);

  const notify = (nextState: PhysicalInputState): PhysicalInputState => {
    lastState = nextState;

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribe = operatorState.subscribe((nextOperatorState) => {
    notify(resolveState(nextOperatorState, sourceCatalog));
  });

  return {
    getState(): PhysicalInputState {
      return lastState;
    },
    subscribe(listener: (state: PhysicalInputState) => void): () => void {
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
