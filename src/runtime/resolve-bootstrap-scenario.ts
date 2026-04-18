import type { ScenePresetKey } from "../features/globe/scene-preset";
import type { ClockTimestamp, ReplayClockState } from "../features/time";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";

export type BootstrapScenarioMode = "real-time" | "prerecorded";

export interface BootstrapScenarioRange {
  start: ClockTimestamp;
  stop: ClockTimestamp;
}

export interface BootstrapScenarioSeedOptions {
  scenePresetKey: ScenePresetKey;
  mode?: BootstrapScenarioMode;
  range?: BootstrapScenarioRange;
}

export interface BootstrapScenarioOption {
  presetKey: ScenePresetKey;
  label: string;
  scenarioIdsByMode: Record<BootstrapScenarioMode, string>;
}

export interface BootstrapScenarioCatalog {
  definitions: ReadonlyArray<BootstrapScenarioDefinition>;
  options: ReadonlyArray<BootstrapScenarioOption>;
  initialScenarioId: string;
}

export interface BootstrapScenarioCatalogOptions {
  initialScenePresetKey: ScenePresetKey;
  baselineTime: Pick<
    ReplayClockState,
    "currentTime" | "startTime" | "stopTime"
  >;
  prerecordedWindowMs?: number;
}

export const BOOTSTRAP_SCENARIO_PRESET_KEYS = [
  "global",
  "regional",
  "site"
] as const satisfies ReadonlyArray<ScenePresetKey>;

const BOOTSTRAP_SCENARIO_LABELS: Record<ScenePresetKey, string> = {
  global: "Global",
  regional: "Regional",
  site: "Site"
};

const DEFAULT_PRERECORDED_WINDOW_MS = 20 * 60 * 1000;

function toEpochMilliseconds(value: ClockTimestamp): number {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Bootstrap scenario timestamp must parse: ${value}`);
  }

  return epochMs;
}

function toIsoTimestamp(value: ClockTimestamp): string {
  return new Date(toEpochMilliseconds(value)).toISOString();
}

function createBootstrapScenarioId(
  scenePresetKey: ScenePresetKey,
  mode: BootstrapScenarioMode
): string {
  return `bootstrap-${scenePresetKey}-${mode}`;
}

function resolveBootstrapScenarioLabel(
  scenePresetKey: ScenePresetKey,
  mode: BootstrapScenarioMode
): string {
  const basisLabel = BOOTSTRAP_SCENARIO_LABELS[scenePresetKey];
  return mode === "real-time"
    ? `Bootstrap ${basisLabel}`
    : `Bootstrap ${basisLabel} Replay`;
}

function createBaselineRange(
  baselineTime: Pick<ReplayClockState, "startTime" | "stopTime">
): BootstrapScenarioRange {
  const start = toIsoTimestamp(baselineTime.startTime);
  const stop = toIsoTimestamp(baselineTime.stopTime);

  if (toEpochMilliseconds(start) > toEpochMilliseconds(stop)) {
    throw new Error("Bootstrap baseline range start must not exceed stop.");
  }

  return { start, stop };
}

function createPrerecordedRange(
  baselineTime: Pick<ReplayClockState, "currentTime" | "startTime" | "stopTime">,
  requestedWindowMs: number
): BootstrapScenarioRange {
  if (!Number.isFinite(requestedWindowMs) || requestedWindowMs <= 0) {
    throw new Error(
      `Bootstrap prerecorded window must be a positive finite number: ${requestedWindowMs}`
    );
  }

  const baselineStartMs = toEpochMilliseconds(baselineTime.startTime);
  const baselineStopMs = toEpochMilliseconds(baselineTime.stopTime);

  if (baselineStartMs > baselineStopMs) {
    throw new Error("Bootstrap prerecorded range start must not exceed stop.");
  }

  const currentTimeMs = Math.min(
    Math.max(toEpochMilliseconds(baselineTime.currentTime), baselineStartMs),
    baselineStopMs
  );
  const availableWindowMs = Math.max(1000, baselineStopMs - baselineStartMs);
  const clippedWindowMs = Math.min(requestedWindowMs, availableWindowMs);

  let startMs = Math.max(
    baselineStartMs,
    currentTimeMs - Math.floor(clippedWindowMs / 3)
  );
  let stopMs = startMs + clippedWindowMs;

  if (stopMs > baselineStopMs) {
    stopMs = baselineStopMs;
    startMs = Math.max(baselineStartMs, stopMs - clippedWindowMs);
  }

  return {
    start: new Date(startMs).toISOString(),
    stop: new Date(stopMs).toISOString()
  };
}

export function createBootstrapScenarioDefinition({
  scenePresetKey,
  mode = "real-time",
  range
}: BootstrapScenarioSeedOptions): BootstrapScenarioDefinition {
  const label = resolveBootstrapScenarioLabel(scenePresetKey, mode);

  return {
    id: createBootstrapScenarioId(scenePresetKey, mode),
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

export function createBootstrapScenarioCatalog({
  initialScenePresetKey,
  baselineTime,
  prerecordedWindowMs = DEFAULT_PRERECORDED_WINDOW_MS
}: BootstrapScenarioCatalogOptions): BootstrapScenarioCatalog {
  const realTimeRange = createBaselineRange(baselineTime);
  const prerecordedRange = createPrerecordedRange(
    baselineTime,
    prerecordedWindowMs
  );
  const definitions: BootstrapScenarioDefinition[] = [];
  const options: BootstrapScenarioOption[] = [];

  for (const presetKey of BOOTSTRAP_SCENARIO_PRESET_KEYS) {
    const scenarioIdsByMode = {
      "real-time": createBootstrapScenarioId(presetKey, "real-time"),
      prerecorded: createBootstrapScenarioId(presetKey, "prerecorded")
    } as const satisfies Record<BootstrapScenarioMode, string>;

    definitions.push(
      createBootstrapScenarioDefinition({
        scenePresetKey: presetKey,
        mode: "real-time",
        range: realTimeRange
      }),
      createBootstrapScenarioDefinition({
        scenePresetKey: presetKey,
        mode: "prerecorded",
        range: prerecordedRange
      })
    );

    options.push({
      presetKey,
      label: BOOTSTRAP_SCENARIO_LABELS[presetKey],
      scenarioIdsByMode
    });
  }

  return {
    definitions,
    options,
    initialScenarioId: createBootstrapScenarioId(initialScenePresetKey, "real-time")
  };
}
