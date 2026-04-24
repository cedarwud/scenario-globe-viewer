import type { Viewer } from "cesium";

import type {
  FirstIntakeRuntimeAddressResolution,
  FirstIntakeRuntimeScenarioSurface
} from "../features/scenario";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../features/telemetry/document-telemetry";
import type { ClockTimestamp, ReplayClock, ReplayClockState } from "../features/time";
import type {
  FirstIntakeMobileEndpointTrajectoryController
} from "./first-intake-mobile-endpoint-trajectory-controller";

const FIRST_INTAKE_REPLAY_TIME_AUTHORITY_TELEMETRY_KEYS = [
  "firstIntakeReplayTimeAuthorityState",
  "firstIntakeReplayTimeAuthorityScenarioId",
  "firstIntakeReplayTimeAuthorityReplayStartUtc",
  "firstIntakeReplayTimeAuthorityReplayStopUtc",
  "firstIntakeReplayTimeAuthorityCurrentTimeUtc",
  "firstIntakeReplayTimeAuthorityMode",
  "firstIntakeReplayTimeAuthorityMultiplier",
  "firstIntakeReplayTimeAuthorityIsPlaying",
  "firstIntakeReplayTimeAuthorityDefaultMultiplier",
  "firstIntakeReplayTimeAuthorityAllowedMultipliers",
  "firstIntakeReplayTimeAuthorityAnimationWidgetBound",
  "firstIntakeReplayTimeAuthorityTimelineBound",
  "firstIntakeReplayTimeAuthorityResetPolicy",
  "firstIntakeReplayTimeAuthorityStopBehavior",
  "firstIntakeReplayTimeAuthorityTrajectoryProofSeam",
  "firstIntakeReplayTimeAuthorityReplayClockProofSeam",
  "firstIntakeReplayTimeAuthorityProofSeam"
] as const;

export const FIRST_INTAKE_REPLAY_TIME_AUTHORITY_RUNTIME_STATE =
  "active-addressed-route-replay-authority";
export const FIRST_INTAKE_REPLAY_TIME_AUTHORITY_REPLAY_CLOCK_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.replayClock";
export const FIRST_INTAKE_REPLAY_TIME_AUTHORITY_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeReplayTimeAuthority";
export const FIRST_INTAKE_REPLAY_TIME_AUTHORITY_DEFAULT_MULTIPLIER = 60;
export const FIRST_INTAKE_REPLAY_TIME_AUTHORITY_ALLOWED_MULTIPLIERS = [
  1,
  10,
  30,
  60,
  120
] as const;

type FirstIntakeReplayTimeAuthorityAllowedMultiplier =
  (typeof FIRST_INTAKE_REPLAY_TIME_AUTHORITY_ALLOWED_MULTIPLIERS)[number];

type ReplayClockRange = {
  start: ClockTimestamp;
  stop: ClockTimestamp;
};

interface TimelineEventTarget {
  addEventListener(
    type: string,
    listener: (event: Event) => void,
    useCapture?: boolean
  ): void;
  removeEventListener(
    type: string,
    listener: (event: Event) => void,
    useCapture?: boolean
  ): void;
}

export interface FirstIntakeReplayTimeAuthorityState {
  scenarioId: string;
  scenarioLabel: string;
  addressQuery: string;
  addressResolution: FirstIntakeRuntimeAddressResolution;
  timeAuthorityState: typeof FIRST_INTAKE_REPLAY_TIME_AUTHORITY_RUNTIME_STATE;
  replayStartUtc: string;
  replayStopUtc: string;
  currentTimeUtc: string;
  mode: ReplayClockState["mode"];
  multiplier: number;
  isPlaying: boolean;
  defaultMultiplier: typeof FIRST_INTAKE_REPLAY_TIME_AUTHORITY_DEFAULT_MULTIPLIER;
  allowedMultipliers:
    ReadonlyArray<FirstIntakeReplayTimeAuthorityAllowedMultiplier>;
  resetPolicy: "pause-seek-start-restore-60x";
  stopBehavior: "clamp-and-pause";
  animationWidgetBound: boolean;
  timelineBound: boolean;
  trajectoryProofSeam: string;
  replayClockProofSeam:
    typeof FIRST_INTAKE_REPLAY_TIME_AUTHORITY_REPLAY_CLOCK_PROOF_SEAM;
  proofSeam: typeof FIRST_INTAKE_REPLAY_TIME_AUTHORITY_PROOF_SEAM;
  sourceLineage: {
    trajectoryRead:
      "trajectoryController.getState().trajectory.trajectory.windowStartUtc/windowEndUtc";
    replayClockRead: "replayClock.getState()";
    animationWidgetRead: "viewer.animation.viewModel";
    timelineRead: "viewer.timeline";
    rawPackageSideReadOwnership: "forbidden";
  };
}

export interface FirstIntakeReplayTimeAuthorityController {
  replayClock: ReplayClock;
  getState(): FirstIntakeReplayTimeAuthorityState;
  subscribe(
    listener: (state: FirstIntakeReplayTimeAuthorityState) => void
  ): () => void;
  reset(): void;
  dispose(): void;
}

export interface FirstIntakeReplayTimeAuthorityControllerOptions {
  viewer: Viewer;
  replayClock: ReplayClock;
  scenarioSurface: FirstIntakeRuntimeScenarioSurface;
  trajectoryController: FirstIntakeMobileEndpointTrajectoryController;
}

function toEpochMilliseconds(value: ClockTimestamp): number {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(
      `First-intake replay time authority timestamp must parse: ${value}`
    );
  }

  return epochMs;
}

function toIsoTimestamp(value: ClockTimestamp): string {
  return new Date(toEpochMilliseconds(value)).toISOString();
}

function isAllowedMultiplier(
  value: number
): value is FirstIntakeReplayTimeAuthorityAllowedMultiplier {
  return FIRST_INTAKE_REPLAY_TIME_AUTHORITY_ALLOWED_MULTIPLIERS.includes(
    value as FirstIntakeReplayTimeAuthorityAllowedMultiplier
  );
}

function assertAllowedMultiplier(
  value: number
): asserts value is FirstIntakeReplayTimeAuthorityAllowedMultiplier {
  if (!isAllowedMultiplier(value)) {
    throw new Error(
      `First-intake replay multiplier must stay on addressed-route presets: ${value}`
    );
  }
}

function sameReplayRange(
  left: ReplayClockRange,
  right: ReplayClockRange
): boolean {
  return (
    toEpochMilliseconds(left.start) === toEpochMilliseconds(right.start) &&
    toEpochMilliseconds(left.stop) === toEpochMilliseconds(right.stop)
  );
}

function cloneState(
  state: FirstIntakeReplayTimeAuthorityState
): FirstIntakeReplayTimeAuthorityState {
  return {
    ...state,
    allowedMultipliers: [...state.allowedMultipliers],
    sourceLineage: {
      ...state.sourceLineage
    }
  };
}

function notifyListeners(
  listeners: ReadonlySet<(state: FirstIntakeReplayTimeAuthorityState) => void>,
  state: FirstIntakeReplayTimeAuthorityState
): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function syncTelemetry(state: FirstIntakeReplayTimeAuthorityState): void {
  syncDocumentTelemetry({
    firstIntakeReplayTimeAuthorityState: state.timeAuthorityState,
    firstIntakeReplayTimeAuthorityScenarioId: state.scenarioId,
    firstIntakeReplayTimeAuthorityReplayStartUtc: state.replayStartUtc,
    firstIntakeReplayTimeAuthorityReplayStopUtc: state.replayStopUtc,
    firstIntakeReplayTimeAuthorityCurrentTimeUtc: state.currentTimeUtc,
    firstIntakeReplayTimeAuthorityMode: state.mode,
    firstIntakeReplayTimeAuthorityMultiplier: String(state.multiplier),
    firstIntakeReplayTimeAuthorityIsPlaying: state.isPlaying ? "true" : "false",
    firstIntakeReplayTimeAuthorityDefaultMultiplier: String(
      state.defaultMultiplier
    ),
    firstIntakeReplayTimeAuthorityAllowedMultipliers: state.allowedMultipliers
      .map((multiplier) => `${multiplier}x`)
      .join("|"),
    firstIntakeReplayTimeAuthorityAnimationWidgetBound:
      state.animationWidgetBound ? "true" : "false",
    firstIntakeReplayTimeAuthorityTimelineBound: state.timelineBound
      ? "true"
      : "false",
    firstIntakeReplayTimeAuthorityResetPolicy: state.resetPolicy,
    firstIntakeReplayTimeAuthorityStopBehavior: state.stopBehavior,
    firstIntakeReplayTimeAuthorityTrajectoryProofSeam: state.trajectoryProofSeam,
    firstIntakeReplayTimeAuthorityReplayClockProofSeam:
      state.replayClockProofSeam,
    firstIntakeReplayTimeAuthorityProofSeam: state.proofSeam
  });
}

export function createFirstIntakeReplayTimeAuthorityController({
  viewer,
  replayClock,
  scenarioSurface,
  trajectoryController
}: FirstIntakeReplayTimeAuthorityControllerOptions): FirstIntakeReplayTimeAuthorityController {
  const listeners = new Set<
    (state: FirstIntakeReplayTimeAuthorityState) => void
  >();
  const runtimeState = scenarioSurface.getState();
  const addressedEntry = scenarioSurface.getAddressedEntry();
  const trajectoryState = trajectoryController.getState();
  const canonicalRange = {
    start: trajectoryState.trajectory.trajectory.windowStartUtc,
    stop: trajectoryState.trajectory.trajectory.windowEndUtc
  } satisfies ReplayClockRange;
  let disposed = false;

  if (runtimeState.addressResolution !== "matched") {
    throw new Error(
      "First-intake replay time authority only mounts for the matched addressed case."
    );
  }

  if (
    trajectoryState.scenarioId !== addressedEntry.scenarioId ||
    trajectoryState.addressResolution !== "matched"
  ) {
    throw new Error(
      "First-intake replay time authority requires the matched mobile trajectory seam."
    );
  }

  const syncCesiumWidgets = (): void => {
    viewer.animation?.viewModel?.setShuttleRingTicks([
      ...FIRST_INTAKE_REPLAY_TIME_AUTHORITY_ALLOWED_MULTIPLIERS
    ]);
    viewer.timeline?.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
  };

  const applyRouteDefaults = (): void => {
    replayClock.setMode("prerecorded", canonicalRange);
    replayClock.seek(canonicalRange.start);
    replayClock.pause();
    replayClock.setMultiplier(
      FIRST_INTAKE_REPLAY_TIME_AUTHORITY_DEFAULT_MULTIPLIER
    );
    syncCesiumWidgets();
  };

  const createState = (): FirstIntakeReplayTimeAuthorityState => {
    const replayState = replayClock.getState();

    return {
      scenarioId: addressedEntry.scenarioId,
      scenarioLabel: addressedEntry.definition.label,
      addressQuery: addressedEntry.addressQuery,
      addressResolution: runtimeState.addressResolution,
      timeAuthorityState: FIRST_INTAKE_REPLAY_TIME_AUTHORITY_RUNTIME_STATE,
      replayStartUtc: canonicalRange.start,
      replayStopUtc: canonicalRange.stop,
      currentTimeUtc: toIsoTimestamp(replayState.currentTime),
      mode: replayState.mode,
      multiplier: replayState.multiplier,
      isPlaying: replayState.isPlaying,
      defaultMultiplier: FIRST_INTAKE_REPLAY_TIME_AUTHORITY_DEFAULT_MULTIPLIER,
      allowedMultipliers: [
        ...FIRST_INTAKE_REPLAY_TIME_AUTHORITY_ALLOWED_MULTIPLIERS
      ],
      resetPolicy: "pause-seek-start-restore-60x",
      stopBehavior: "clamp-and-pause",
      animationWidgetBound: Boolean(viewer.animation?.viewModel),
      timelineBound: Boolean(viewer.timeline),
      trajectoryProofSeam: trajectoryState.proofSeam,
      replayClockProofSeam:
        FIRST_INTAKE_REPLAY_TIME_AUTHORITY_REPLAY_CLOCK_PROOF_SEAM,
      proofSeam: FIRST_INTAKE_REPLAY_TIME_AUTHORITY_PROOF_SEAM,
      sourceLineage: {
        trajectoryRead:
          "trajectoryController.getState().trajectory.trajectory.windowStartUtc/windowEndUtc",
        replayClockRead: "replayClock.getState()",
        animationWidgetRead: "viewer.animation.viewModel",
        timelineRead: "viewer.timeline",
        rawPackageSideReadOwnership: "forbidden"
      }
    };
  };

  const syncState = (): void => {
    const nextState = createState();
    syncTelemetry(nextState);
    notifyListeners(listeners, cloneState(nextState));

    if (!viewer.isDestroyed()) {
      viewer.scene.requestRender();
    }
  };

  const boundedReplayClock: ReplayClock = {
    getState(): ReplayClockState {
      return replayClock.getState();
    },
    play(): void {
      const replayState = replayClock.getState();

      if (!isAllowedMultiplier(replayState.multiplier)) {
        replayClock.setMultiplier(
          FIRST_INTAKE_REPLAY_TIME_AUTHORITY_DEFAULT_MULTIPLIER
        );
      }

      replayClock.play();
      syncState();
    },
    pause(): void {
      replayClock.pause();
      syncState();
    },
    setMultiplier(multiplier: number): void {
      assertAllowedMultiplier(multiplier);
      replayClock.setMultiplier(multiplier);
      syncState();
    },
    seek(time: ClockTimestamp): void {
      replayClock.seek(time);
      syncState();
    },
    setMode(
      mode: ReplayClockState["mode"],
      range?: ReplayClockRange
    ): void {
      if (mode !== "prerecorded") {
        throw new Error(
          "First-intake replay time authority must stay in prerecorded mode for R1V.2."
        );
      }

      if (range && !sameReplayRange(range, canonicalRange)) {
        throw new Error(
          "First-intake replay time authority must stay on the trajectory seam replay window."
        );
      }

      replayClock.setMode("prerecorded", canonicalRange);
      syncCesiumWidgets();
      syncState();
    },
    onTick(listener: (state: ReplayClockState) => void): () => void {
      return replayClock.onTick(listener);
    }
  };

  applyRouteDefaults();
  syncState();

  const removeClockStopListener = viewer.clock.onStop.addEventListener(() => {
    if (disposed) {
      return;
    }

    replayClock.pause();
    syncState();
  });
  const unsubscribeReplayClock = replayClock.onTick(() => {
    if (!disposed) {
      syncState();
    }
  });
  const handleTimelineSetTime = () => {
    if (!disposed) {
      syncState();
    }
  };
  const timelineEventTarget = viewer.timeline as
    | (typeof viewer.timeline & TimelineEventTarget)
    | undefined;

  timelineEventTarget?.addEventListener("settime", handleTimelineSetTime, false);

  return {
    replayClock: boundedReplayClock,
    getState(): FirstIntakeReplayTimeAuthorityState {
      return cloneState(createState());
    },
    subscribe(
      listener: (state: FirstIntakeReplayTimeAuthorityState) => void
    ): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset(): void {
      applyRouteDefaults();
      syncState();
    },
    dispose(): void {
      disposed = true;
      listeners.clear();
      timelineEventTarget?.removeEventListener(
        "settime",
        handleTimelineSetTime,
        false
      );
      unsubscribeReplayClock();
      removeClockStopListener();
      clearDocumentTelemetry(FIRST_INTAKE_REPLAY_TIME_AUTHORITY_TELEMETRY_KEYS);
    }
  };
}
