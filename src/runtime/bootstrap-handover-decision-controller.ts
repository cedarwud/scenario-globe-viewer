import {
  evaluateHandoverDecisionSnapshot,
  type HandoverDecisionState
} from "../features/handover-decision/handover-decision";
import type {
  BootstrapOperatorControllerState
} from "./bootstrap-operator-controller";
import type { BootstrapScenarioCatalog } from "./resolve-bootstrap-scenario";
import {
  type BootstrapProxyHandoverDecisionSourceCatalog,
  createBootstrapProxyHandoverDecisionSourceCatalog,
  resolveBootstrapProxyHandoverDecisionSnapshot
} from "./bootstrap-handover-decision-source";

export interface BootstrapHandoverDecisionController {
  getState(): HandoverDecisionState;
  subscribe(listener: (state: HandoverDecisionState) => void): () => void;
  dispose(): void;
}

export interface BootstrapHandoverDecisionControllerOptions {
  operatorState: BootstrapHandoverDecisionStateReadable;
  scenarioCatalog: BootstrapScenarioCatalog;
}

export interface BootstrapHandoverDecisionStateReadable {
  getState(): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
}

function toIsoTimestamp(value: string | number): string {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Bootstrap handover decision controller timestamp must parse: ${value}`);
  }

  return new Date(epochMs).toISOString();
}

function seedServingCandidateIds(
  sourceCatalog: BootstrapProxyHandoverDecisionSourceCatalog
): Map<string, string> {
  const servingCandidateIds = new Map<string, string>();

  for (const entry of sourceCatalog.entries) {
    if (entry.initialServingCandidateId) {
      servingCandidateIds.set(entry.scenarioId, entry.initialServingCandidateId);
    }
  }

  return servingCandidateIds;
}

function resolveState(
  operatorState: BootstrapOperatorControllerState,
  sourceCatalog: BootstrapProxyHandoverDecisionSourceCatalog,
  servingCandidateIds: Map<string, string>
): HandoverDecisionState {
  const snapshot = resolveBootstrapProxyHandoverDecisionSnapshot(sourceCatalog, {
    scenarioId: operatorState.scenarioId,
    evaluatedAt: toIsoTimestamp(operatorState.currentTime),
    activeRange: {
      start: toIsoTimestamp(operatorState.startTime),
      stop: toIsoTimestamp(operatorState.stopTime)
    },
    currentServingCandidateId: servingCandidateIds.get(operatorState.scenarioId)
  });
  const state = evaluateHandoverDecisionSnapshot(snapshot);

  if (state.result.servingCandidateId) {
    servingCandidateIds.set(operatorState.scenarioId, state.result.servingCandidateId);
  } else {
    servingCandidateIds.delete(operatorState.scenarioId);
  }

  return state;
}

export function createBootstrapHandoverDecisionController({
  operatorState,
  scenarioCatalog
}: BootstrapHandoverDecisionControllerOptions): BootstrapHandoverDecisionController {
  const listeners = new Set<(state: HandoverDecisionState) => void>();
  const sourceCatalog = createBootstrapProxyHandoverDecisionSourceCatalog(
    scenarioCatalog.definitions
  );
  const servingCandidateIds = seedServingCandidateIds(sourceCatalog);
  let lastState = resolveState(
    operatorState.getState(),
    sourceCatalog,
    servingCandidateIds
  );

  const notify = (nextState: HandoverDecisionState): HandoverDecisionState => {
    lastState = nextState;

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribe = operatorState.subscribe((nextOperatorState) => {
    notify(resolveState(nextOperatorState, sourceCatalog, servingCandidateIds));
  });

  return {
    getState(): HandoverDecisionState {
      return lastState;
    },
    subscribe(listener: (state: HandoverDecisionState) => void): () => void {
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
