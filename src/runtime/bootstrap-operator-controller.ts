import type { ScenePresetKey } from "../features/globe/scene-preset";
import {
  DEFAULT_HANDOVER_POLICY_ID,
  HANDOVER_POLICY_DESCRIPTORS,
  isSelectableHandoverPolicyId,
  resolveHandoverPolicyDescriptor,
  type HandoverPolicyDescriptor,
  type SelectableHandoverPolicyId
} from "../features/handover-decision";
import type { ScenarioSession } from "../features/scenario";
import type {
  ClockMode,
  ClockTimestamp,
  ReplayClock
} from "../features/time";
import type {
  BootstrapScenarioCatalog,
  BootstrapScenarioMode,
  BootstrapScenarioOption
} from "./resolve-bootstrap-scenario";

export const BOOTSTRAP_REPLAY_SPEED_PRESETS = [
  0.25,
  0.5,
  1,
  2,
  4
] as const;

export type BootstrapReplaySpeedPreset =
  (typeof BOOTSTRAP_REPLAY_SPEED_PRESETS)[number];

export interface BootstrapOperatorControllerState {
  scenarioId: string;
  scenarioLabel: string;
  scenePresetKey: ScenePresetKey;
  replayMode: ClockMode;
  currentTime: ClockTimestamp;
  startTime: ClockTimestamp;
  stopTime: ClockTimestamp;
  replayMultiplier: number;
  isPlaying: boolean;
  handoverPolicyId: SelectableHandoverPolicyId;
  handoverPolicyLabel: string;
  handoverPolicySummary: string;
}

export interface BootstrapOperatorController {
  getState(): BootstrapOperatorControllerState;
  getScenarioOptions(): ReadonlyArray<BootstrapScenarioOption>;
  getReplaySpeedPresets(): ReadonlyArray<BootstrapReplaySpeedPreset>;
  getHandoverPolicyOptions(): ReadonlyArray<HandoverPolicyDescriptor>;
  selectScenarioPreset(
    presetKey: ScenePresetKey
  ): Promise<BootstrapOperatorControllerState>;
  selectReplayMode(
    mode: BootstrapScenarioMode
  ): Promise<BootstrapOperatorControllerState>;
  selectReplaySpeed(
    multiplier: BootstrapReplaySpeedPreset
  ): BootstrapOperatorControllerState;
  selectHandoverPolicy(
    policyId: SelectableHandoverPolicyId
  ): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
  dispose(): void;
}

export interface BootstrapOperatorControllerOptions {
  replayClock: ReplayClock;
  scenarioSession: ScenarioSession;
  scenarioCatalog: BootstrapScenarioCatalog;
}

function isBootstrapReplaySpeedPreset(
  value: number
): value is BootstrapReplaySpeedPreset {
  return BOOTSTRAP_REPLAY_SPEED_PRESETS.includes(
    value as BootstrapReplaySpeedPreset
  );
}

function resolveScenarioOption(
  options: ReadonlyArray<BootstrapScenarioOption>,
  presetKey: ScenePresetKey
): BootstrapScenarioOption {
  const option = options.find((entry) => entry.presetKey === presetKey);

  if (!option) {
    throw new Error(`Unknown bootstrap scenario preset: ${presetKey}`);
  }

  return option;
}

function resolveScenarioId(
  options: ReadonlyArray<BootstrapScenarioOption>,
  presetKey: ScenePresetKey,
  mode: BootstrapScenarioMode
): string {
  return resolveScenarioOption(options, presetKey).scenarioIdsByMode[mode];
}

function readState(
  replayClock: ReplayClock,
  scenarioSession: ScenarioSession,
  scenarioCatalog: BootstrapScenarioCatalog,
  handoverPolicyId: SelectableHandoverPolicyId
): BootstrapOperatorControllerState {
  const currentScenario =
    scenarioSession.getCurrentScenario() ??
    scenarioSession.previewScenario(scenarioCatalog.initialScenarioId);
  const clockState = replayClock.getState();
  const policy = resolveHandoverPolicyDescriptor(handoverPolicyId);

  // `scenario` stays the single plain-data source of truth for active scenario
  // identity and replay mode. The replay-clock only contributes live time and
  // multiplier state; it must not silently remap scenario identity on its own.
  return {
    scenarioId: currentScenario.scenarioId,
    scenarioLabel: currentScenario.scenarioLabel,
    scenePresetKey: currentScenario.presentation.presetKey,
    replayMode: currentScenario.time.mode,
    currentTime: clockState.currentTime,
    startTime: clockState.startTime,
    stopTime: clockState.stopTime,
    replayMultiplier: clockState.multiplier,
    isPlaying: clockState.isPlaying,
    handoverPolicyId,
    handoverPolicyLabel: policy.label,
    handoverPolicySummary: policy.summary
  };
}

export function createBootstrapOperatorController({
  replayClock,
  scenarioSession,
  scenarioCatalog
}: BootstrapOperatorControllerOptions): BootstrapOperatorController {
  const listeners = new Set<
    (state: BootstrapOperatorControllerState) => void
  >();
  let selectedHandoverPolicyId: SelectableHandoverPolicyId =
    DEFAULT_HANDOVER_POLICY_ID;
  let lastState = readState(
    replayClock,
    scenarioSession,
    scenarioCatalog,
    selectedHandoverPolicyId
  );
  let selectionQueue = Promise.resolve(lastState);

  const notify = (): BootstrapOperatorControllerState => {
    lastState = readState(
      replayClock,
      scenarioSession,
      scenarioCatalog,
      selectedHandoverPolicyId
    );

    for (const listener of listeners) {
      listener(lastState);
    }

    return lastState;
  };

  const unsubscribeClock = replayClock.onTick(() => {
    notify();
  });

  const runSelection = (
    operation: () => Promise<BootstrapOperatorControllerState>
  ): Promise<BootstrapOperatorControllerState> => {
    selectionQueue = selectionQueue
      .catch(() => lastState)
      .then(operation);

    return selectionQueue;
  };

  return {
    getState(): BootstrapOperatorControllerState {
      return lastState;
    },
    getScenarioOptions(): ReadonlyArray<BootstrapScenarioOption> {
      return scenarioCatalog.options;
    },
    getReplaySpeedPresets(): ReadonlyArray<BootstrapReplaySpeedPreset> {
      return BOOTSTRAP_REPLAY_SPEED_PRESETS;
    },
    getHandoverPolicyOptions(): ReadonlyArray<HandoverPolicyDescriptor> {
      return HANDOVER_POLICY_DESCRIPTORS;
    },
    async selectScenarioPreset(
      presetKey: ScenePresetKey
    ): Promise<BootstrapOperatorControllerState> {
      return runSelection(async () => {
        const targetScenarioId = resolveScenarioId(
          scenarioCatalog.options,
          presetKey,
          lastState.replayMode as BootstrapScenarioMode
        );

        await scenarioSession.selectScenario(targetScenarioId);
        return notify();
      });
    },
    async selectReplayMode(
      mode: BootstrapScenarioMode
    ): Promise<BootstrapOperatorControllerState> {
      return runSelection(async () => {
        const targetScenarioId = resolveScenarioId(
          scenarioCatalog.options,
          lastState.scenePresetKey,
          mode
        );

        await scenarioSession.selectScenario(targetScenarioId);
        return notify();
      });
    },
    selectReplaySpeed(
      multiplier: BootstrapReplaySpeedPreset
    ): BootstrapOperatorControllerState {
      if (!isBootstrapReplaySpeedPreset(multiplier)) {
        throw new Error(
          `Bootstrap replay speed must stay on bounded presets: ${multiplier}`
        );
      }

      replayClock.setMultiplier(multiplier);
      return notify();
    },
    selectHandoverPolicy(
      policyId: SelectableHandoverPolicyId
    ): BootstrapOperatorControllerState {
      if (!isSelectableHandoverPolicyId(policyId)) {
        throw new Error(`Bootstrap handover policy is not selectable: ${policyId}`);
      }

      selectedHandoverPolicyId = policyId;
      return notify();
    },
    subscribe(
      listener: (state: BootstrapOperatorControllerState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      unsubscribeClock();
    }
  };
}
