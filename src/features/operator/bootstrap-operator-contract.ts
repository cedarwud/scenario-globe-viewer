import type { ScenePresetKey } from "../globe/scene-preset";
import type {
  HandoverPolicyDescriptor,
  HandoverRuleConfig,
  SelectableHandoverPolicyId
} from "../handover-decision";
import type { ClockMode, ClockTimestamp } from "../time";

export type BootstrapScenarioMode = "real-time" | "prerecorded";

export interface BootstrapScenarioOption {
  presetKey: ScenePresetKey;
  label: string;
  scenarioIdsByMode: Record<BootstrapScenarioMode, string>;
}

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
  handoverRuleConfig: HandoverRuleConfig;
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
  applyHandoverRuleConfig(
    config: HandoverRuleConfig
  ): BootstrapOperatorControllerState;
  resetHandoverRuleConfig(): BootstrapOperatorControllerState;
  subscribe(
    listener: (state: BootstrapOperatorControllerState) => void
  ): () => void;
  dispose(): void;
}
