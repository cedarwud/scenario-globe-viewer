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

interface ReplayClockRange {
  startTime: JulianDate;
  stopTime: JulianDate;
}

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

function validateRange(range: ReplayClockRange, modeLabel: string): void {
  if (JulianDate.greaterThan(range.startTime, range.stopTime)) {
    throw new Error(
      `ReplayClock ${modeLabel} range start must not exceed stop.`
    );
  }
}

function deserializeRange(range: {
  start: ClockTimestamp;
  stop: ClockTimestamp;
}): ReplayClockRange {
  const resolvedRange = {
    startTime: deserializeTimestamp(range.start),
    stopTime: deserializeTimestamp(range.stop)
  };

  validateRange(resolvedRange, "requested");
  return resolvedRange;
}

function cloneActiveRange(viewer: Viewer): ReplayClockRange {
  return {
    startTime: JulianDate.clone(viewer.clock.startTime),
    stopTime: JulianDate.clone(viewer.clock.stopTime)
  };
}

// Phase 3.4 reuses the current Cesium clock interval when prerecorded mode is
// selected without an explicit range, so range resolution is centralized here
// before that runtime path is enabled.
function resolveRequestedOrActiveRange(
  viewer: Viewer,
  range?: { start: ClockTimestamp; stop: ClockTimestamp }
): ReplayClockRange {
  return range ? deserializeRange(range) : cloneActiveRange(viewer);
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

// Both replay modes stay on Cesium's system-time-multiplier path so the public
// multiplier continues to behave like a speed factor instead of seconds/frame.
function ensureReplayClockStep(viewer: Viewer): void {
  if (viewer.clock.clockStep !== ClockStep.SYSTEM_CLOCK_MULTIPLIER) {
    viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  }
}

function applyClampedRange(viewer: Viewer, range: ReplayClockRange): void {
  validateRange(range, "active");
  viewer.clock.startTime = range.startTime;
  viewer.clock.stopTime = range.stopTime;
  viewer.clock.clockRange = ClockRange.CLAMPED;
  viewer.clock.currentTime = clampToActiveRange(viewer.clock.currentTime, viewer);
}

function applyRealTimeMode(
  viewer: Viewer,
  range?: { start: ClockTimestamp; stop: ClockTimestamp }
): void {
  ensureReplayClockStep(viewer);

  if (!range) {
    return;
  }

  applyClampedRange(viewer, deserializeRange(range));
}

function applyPrerecordedMode(
  viewer: Viewer,
  range?: { start: ClockTimestamp; stop: ClockTimestamp }
): void {
  ensureReplayClockStep(viewer);
  applyClampedRange(viewer, resolveRequestedOrActiveRange(viewer, range));
}

export function createCesiumReplayClock(viewer: Viewer): ReplayClock {
  let mode: ClockMode = "real-time";

  return {
    getState(): ReplayClockState {
      return serializeState(viewer, mode);
    },

    play(): void {
      ensureReplayClockStep(viewer);
      viewer.clock.shouldAnimate = true;
    },

    pause(): void {
      viewer.clock.shouldAnimate = false;
    },

    setMultiplier(x: number): void {
      if (!Number.isFinite(x)) {
        throw new Error(`ReplayClock multiplier must be finite: ${x}`);
      }

      ensureReplayClockStep(viewer);
      viewer.clock.multiplier = x;
    },

    seek(t: ClockTimestamp): void {
      ensureReplayClockStep(viewer);
      viewer.clock.currentTime = clampToActiveRange(
        deserializeTimestamp(t),
        viewer
      );
    },

    setMode(
      nextMode: ClockMode,
      range?: { start: ClockTimestamp; stop: ClockTimestamp }
    ): void {
      if (nextMode === "real-time") {
        applyRealTimeMode(viewer, range);
        mode = "real-time";
        return;
      }

      applyPrerecordedMode(viewer, range);
      mode = "prerecorded";
    },

    onTick(listener: (state: ReplayClockState) => void): () => void {
      return viewer.clock.onTick.addEventListener(() => {
        listener(serializeState(viewer, mode));
      });
    }
  };
}
