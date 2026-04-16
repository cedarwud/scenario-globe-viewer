// App-facing replay-clock contracts stay plain-data and serializable.
export type ClockMode = "real-time" | "prerecorded";

// ISO 8601 string or epoch milliseconds.
export type ClockTimestamp = string | number;

export interface ReplayClockState {
  mode: ClockMode;
  currentTime: ClockTimestamp;
  startTime: ClockTimestamp;
  stopTime: ClockTimestamp;
  // Negative multipliers indicate reverse playback.
  multiplier: number;
  isPlaying: boolean;
}

export interface ReplayClock {
  getState(): ReplayClockState;
  play(): void;
  pause(): void;
  // Changing speed does not imply play/pause state changes.
  setMultiplier(x: number): void;
  // Seek uses absolute positioning, not relative offsets.
  seek(t: ClockTimestamp): void;
  // Switching mode may also reset the active start/stop range.
  setMode(
    mode: ClockMode,
    range?: { start: ClockTimestamp; stop: ClockTimestamp }
  ): void;
  onTick(listener: (state: ReplayClockState) => void): () => void;
}
