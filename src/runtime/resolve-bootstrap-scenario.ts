import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { ClockTimestamp } from "../features/time";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";

export interface BootstrapScenarioSeedOptions {
  scenePresetKey: ScenePresetKey;
  mode?: "real-time" | "prerecorded";
  range?: {
    start: ClockTimestamp;
    stop: ClockTimestamp;
  };
}

export function createBootstrapScenarioDefinition({
  scenePresetKey,
  mode = "real-time",
  range
}: BootstrapScenarioSeedOptions): BootstrapScenarioDefinition {
  const label =
    mode === "real-time"
      ? `Bootstrap ${scenePresetKey}`
      : `Bootstrap ${scenePresetKey} Replay`;

  return {
    id: `bootstrap-${scenePresetKey}-${mode}`,
    label,
    kind: mode,
    presentation: {
      presetKey: scenePresetKey
    },
    time: {
      mode,
      ...(range ? { range } : {})
    },
    sources: {}
  };
}
