import {
  createCommunicationTimeState,
  type CommunicationTimeState
} from "../features/communication-time/communication-time";
import type {
  BootstrapOperatorControllerState
} from "./bootstrap-operator-controller";
import type { BootstrapScenarioCatalog } from "./resolve-bootstrap-scenario";
import {
  type BootstrapProxyCommunicationTimeSourceCatalog,
  createBootstrapProxyCommunicationTimeSourceCatalog,
  resolveBootstrapProxyCommunicationTimeSourceEntry
} from "./bootstrap-communication-time-source";

export interface BootstrapCommunicationTimeController {
  getState(): CommunicationTimeState;
  subscribe(listener: (state: CommunicationTimeState) => void): () => void;
  dispose(): void;
}

export interface BootstrapCommunicationTimeControllerOptions {
  operatorState: BootstrapCommunicationTimeStateReadable;
  scenarioCatalog: BootstrapScenarioCatalog;
}

export interface BootstrapCommunicationTimeStateReadable {
  getState(): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
}

function resolveState(
  operatorState: BootstrapOperatorControllerState,
  sourceCatalog: BootstrapProxyCommunicationTimeSourceCatalog
): CommunicationTimeState {
  const sourceEntry = resolveBootstrapProxyCommunicationTimeSourceEntry(
    sourceCatalog,
    operatorState.scenarioId
  );

  return createCommunicationTimeState({
    scenario: {
      id: operatorState.scenarioId,
      label: operatorState.scenarioLabel,
      presetKey: operatorState.scenePresetKey,
      mode: operatorState.replayMode
    },
    activeRange: {
      start: operatorState.startTime,
      stop: operatorState.stopTime
    },
    currentTime: operatorState.currentTime,
    sourceKind: sourceEntry.sourceKind,
    windowTemplates: sourceEntry.windowTemplates
  });
}

export function createBootstrapCommunicationTimeController({
  operatorState,
  scenarioCatalog
}: BootstrapCommunicationTimeControllerOptions): BootstrapCommunicationTimeController {
  const listeners = new Set<(state: CommunicationTimeState) => void>();
  const sourceCatalog =
    createBootstrapProxyCommunicationTimeSourceCatalog(scenarioCatalog.definitions);
  let lastState = resolveState(operatorState.getState(), sourceCatalog);

  const notify = (nextState: CommunicationTimeState): CommunicationTimeState => {
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
    getState(): CommunicationTimeState {
      return lastState;
    },
    subscribe(listener: (state: CommunicationTimeState) => void): () => void {
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
