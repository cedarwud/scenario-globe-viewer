import {
  ClockRange,
  ClockStep,
  JulianDate,
  type Viewer
} from "cesium";
import type {
  ClockMode,
  ClockTimestamp,
  ReplayClock,
  ReplayClockState
} from "./replay-clock";

const UNIMPLEMENTED_PRERECORDED_MESSAGE =
  "ReplayClock prerecorded mode remains pending until Phase 3.4.";

function assertFiniteTimestamp(value: ClockTimestamp): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`ReplayClock timestamp must be finite: ${value}`);
  }
}

function deserializeTimestamp(value: ClockTimestamp): JulianDate {
  assertFiniteTimestamp(value);

  return typeof value === "number"
    ? JulianDate.fromDate(new Date(value))
    : JulianDate.fromIso8601(value);
}

function serializeTimestamp(value: JulianDate): ClockTimestamp {
  return JulianDate.toIso8601(value, 3);
}

function clampToActiveRange(time: JulianDate, viewer: Viewer): JulianDate {
  const { clock } = viewer;

  if (clock.clockRange === ClockRange.UNBOUNDED) {
    return time;
  }

  if (JulianDate.lessThan(time, clock.startTime)) {
    return JulianDate.clone(clock.startTime);
  }

  if (JulianDate.greaterThan(time, clock.stopTime)) {
    return JulianDate.clone(clock.stopTime);
  }

  return time;
}

function serializeState(viewer: Viewer, mode: ClockMode): ReplayClockState {
  const { clock } = viewer;

  return {
    mode,
    currentTime: serializeTimestamp(clock.currentTime),
    startTime: serializeTimestamp(clock.startTime),
    stopTime: serializeTimestamp(clock.stopTime),
    multiplier: clock.multiplier,
    isPlaying: clock.shouldAnimate
  };
}

function ensureRealTimeClockStep(viewer: Viewer): void {
  if (viewer.clock.clockStep !== ClockStep.SYSTEM_CLOCK_MULTIPLIER) {
    viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  }
}

export function createCesiumReplayClock(viewer: Viewer): ReplayClock {
  let mode: ClockMode = "real-time";

  return {
    getState(): ReplayClockState {
      return serializeState(viewer, mode);
    },

    play(): void {
      ensureRealTimeClockStep(viewer);
      viewer.clock.shouldAnimate = true;
    },

    pause(): void {
      viewer.clock.shouldAnimate = false;
    },

    setMultiplier(x: number): void {
      if (!Number.isFinite(x)) {
        throw new Error(`ReplayClock multiplier must be finite: ${x}`);
      }

      ensureRealTimeClockStep(viewer);
      viewer.clock.multiplier = x;
    },

    seek(t: ClockTimestamp): void {
      ensureRealTimeClockStep(viewer);
      viewer.clock.currentTime = clampToActiveRange(
        deserializeTimestamp(t),
        viewer
      );
    },

    setMode(
      nextMode: ClockMode,
      range?: { start: ClockTimestamp; stop: ClockTimestamp }
    ): void {
      if (nextMode === "prerecorded") {
        throw new Error(UNIMPLEMENTED_PRERECORDED_MESSAGE);
      }

      mode = "real-time";
      ensureRealTimeClockStep(viewer);

      if (!range) {
        return;
      }

      const startTime = deserializeTimestamp(range.start);
      const stopTime = deserializeTimestamp(range.stop);

      if (JulianDate.greaterThan(startTime, stopTime)) {
        throw new Error("ReplayClock real-time range start must not exceed stop.");
      }

      viewer.clock.startTime = startTime;
      viewer.clock.stopTime = stopTime;
      viewer.clock.clockRange = ClockRange.CLAMPED;
      viewer.clock.currentTime = clampToActiveRange(viewer.clock.currentTime, viewer);
    },

    onTick(listener: (state: ReplayClockState) => void): () => void {
      return viewer.clock.onTick.addEventListener(() => {
        listener(serializeState(viewer, mode));
      });
    }
  };
}

export const PRERECORDED_MODE_PENDING_MESSAGE = UNIMPLEMENTED_PRERECORDED_MESSAGE;
