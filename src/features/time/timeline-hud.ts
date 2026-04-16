import type { ClockTimestamp, ReplayClockState } from "./replay-clock";

export interface TimelineHudPlaceholderViewModel {
  heading: string;
  mode: string;
  currentTime: string;
  activeRange: string;
  playbackState: string;
}

function normalizeTimestamp(value: ClockTimestamp): string {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Date(parsed).toISOString();
}

function formatTimestampLabel(value: ClockTimestamp): string {
  return normalizeTimestamp(value).replace("T", " ").replace("Z", " UTC");
}

function formatModeLabel(mode: ReplayClockState["mode"]): string {
  return mode === "real-time" ? "Real-time" : "Prerecorded";
}

function formatPlaybackStateLabel(state: ReplayClockState): string {
  const playback = state.isPlaying ? "Playing" : "Paused";
  const multiplier = Number.isInteger(state.multiplier)
    ? state.multiplier.toFixed(0)
    : state.multiplier.toFixed(2);

  return `${playback} @ ${multiplier}x`;
}

// Repo-owned HUD formatting stays on plain ReplayClockState data and does not
// pull Cesium runtime classes into the app-facing placeholder surface.
export function createTimelineHudPlaceholderViewModel(
  state: ReplayClockState
): TimelineHudPlaceholderViewModel {
  return {
    heading: "Timeline",
    mode: formatModeLabel(state.mode),
    currentTime: formatTimestampLabel(state.currentTime),
    activeRange: `${formatTimestampLabel(state.startTime)} -> ${formatTimestampLabel(
      state.stopTime
    )}`,
    playbackState: formatPlaybackStateLabel(state)
  };
}
