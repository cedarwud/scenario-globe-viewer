import type { ValidationState } from "../features/validation-state";
import type { BootstrapOperatorControllerState } from "./bootstrap-operator-controller";
import type { BootstrapScenarioCatalog } from "./resolve-bootstrap-scenario";
import {
  createBootstrapValidationStateSourceCatalog,
  resolveBootstrapValidationState,
  type BootstrapValidationStateSourceCatalog
} from "./bootstrap-validation-state-source";

export interface BootstrapValidationStateController {
  getState(): ValidationState;
  subscribe(listener: (state: ValidationState) => void): () => void;
  dispose(): void;
}

export interface BootstrapValidationServingContextState {
  scenarioId: string;
  servingCandidateId?: string;
}

export interface BootstrapValidationStateControllerOptions {
  operatorState: BootstrapValidationStateOperatorReadable;
  servingContext: BootstrapValidationServingContextReadable;
  scenarioCatalog: BootstrapScenarioCatalog;
}

export interface BootstrapValidationStateOperatorReadable {
  getState(): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
}

export interface BootstrapValidationServingContextReadable {
  getState(): BootstrapValidationServingContextState;
  subscribe(
    listener: (state: BootstrapValidationServingContextState) => void
  ): () => void;
}

function toIsoTimestamp(value: string | number): string {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Bootstrap validation-state timestamp must parse: ${value}`);
  }

  return new Date(epochMs).toISOString();
}

function resolveServingCandidateId(
  operatorState: BootstrapOperatorControllerState,
  servingContext: BootstrapValidationServingContextState
): string | undefined {
  if (servingContext.scenarioId !== operatorState.scenarioId) {
    return undefined;
  }

  return servingContext.servingCandidateId;
}

function resolveState(
  operatorState: BootstrapOperatorControllerState,
  servingContext: BootstrapValidationServingContextState,
  sourceCatalog: BootstrapValidationStateSourceCatalog
): ValidationState {
  return resolveBootstrapValidationState(sourceCatalog, {
    scenarioId: operatorState.scenarioId,
    evaluatedAt: toIsoTimestamp(operatorState.currentTime),
    activeRange: {
      start: toIsoTimestamp(operatorState.startTime),
      stop: toIsoTimestamp(operatorState.stopTime)
    },
    servingCandidateId: resolveServingCandidateId(
      operatorState,
      servingContext
    )
  });
}

export function createBootstrapValidationStateController({
  operatorState,
  servingContext,
  scenarioCatalog
}: BootstrapValidationStateControllerOptions): BootstrapValidationStateController {
  const listeners = new Set<(state: ValidationState) => void>();
  const sourceCatalog = createBootstrapValidationStateSourceCatalog(
    scenarioCatalog.definitions
  );
  let currentOperatorState = operatorState.getState();
  let currentServingContext = servingContext.getState();
  let lastState = resolveState(
    currentOperatorState,
    currentServingContext,
    sourceCatalog
  );

  const notify = (): ValidationState => {
    lastState = resolveState(
      currentOperatorState,
      currentServingContext,
      sourceCatalog
    );

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribeOperator = operatorState.subscribe((nextOperatorState) => {
    currentOperatorState = nextOperatorState;
    notify();
  });
  const unsubscribeServingContext = servingContext.subscribe(
    (nextServingContext) => {
      currentServingContext = nextServingContext;
      notify();
    }
  );

  return {
    getState(): ValidationState {
      return lastState;
    },
    subscribe(listener: (state: ValidationState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      unsubscribeServingContext();
      unsubscribeOperator();
    }
  };
}
