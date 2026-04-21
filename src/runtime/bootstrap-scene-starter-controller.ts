import type { BootstrapOperatorControllerState } from "./bootstrap-operator-controller";
import {
  BOOTSTRAP_SCENE_STARTER_FEED,
  BOOTSTRAP_SCENE_STARTER_SCOPE
} from "./bootstrap-scene-starter-source";
import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { ClockMode } from "../features/time";
import {
  createBootstrapSceneStarterState,
  type BootstrapSceneStarterState
} from "../features/scene-starter/scene-starter";

export interface BootstrapSceneStarterController {
  getState(): BootstrapSceneStarterState;
  subscribe(listener: (state: BootstrapSceneStarterState) => void): () => void;
  dispose(): void;
}

export interface BootstrapSceneStarterControllerOptions {
  operatorState: BootstrapSceneStarterOperatorReadable;
}

export interface BootstrapSceneStarterOperatorReadable {
  getState(): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
}

function isScopedScenarioActive(options: {
  scenarioId: string;
  presetKey: ScenePresetKey;
  replayMode: ClockMode;
}): boolean {
  return (
    options.scenarioId === BOOTSTRAP_SCENE_STARTER_SCOPE.scenarioId &&
    options.presetKey === BOOTSTRAP_SCENE_STARTER_SCOPE.presetKey &&
    options.replayMode === BOOTSTRAP_SCENE_STARTER_SCOPE.replayMode
  );
}

function resolveState(
  operatorState: BootstrapOperatorControllerState
): BootstrapSceneStarterState {
  return createBootstrapSceneStarterState({
    scenario: {
      id: operatorState.scenarioId,
      label: operatorState.scenarioLabel,
      presetKey: operatorState.scenePresetKey,
      replayMode: operatorState.replayMode,
      isScopeActive: isScopedScenarioActive({
        scenarioId: operatorState.scenarioId,
        presetKey: operatorState.scenePresetKey,
        replayMode: operatorState.replayMode
      })
    },
    starterFeed: BOOTSTRAP_SCENE_STARTER_FEED
  });
}

export function createBootstrapSceneStarterController({
  operatorState
}: BootstrapSceneStarterControllerOptions): BootstrapSceneStarterController {
  const listeners = new Set<(state: BootstrapSceneStarterState) => void>();
  let lastState = resolveState(operatorState.getState());

  const notify = (nextState: BootstrapSceneStarterState) => {
    lastState = nextState;

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribe = operatorState.subscribe((nextOperatorState) => {
    notify(resolveState(nextOperatorState));
  });

  return {
    getState(): BootstrapSceneStarterState {
      return lastState;
    },
    subscribe(listener: (state: BootstrapSceneStarterState) => void): () => void {
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
