import type { M8aV46dSimulationHandoverWindowId } from "./m8a-v4-ground-station-projection";

export const M8A_V411_REVIEWER_MODE_VERSION =
  "m8a-v4.11-reviewer-mode-impl-phase4-runtime.v1";

export const M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS = 9_500;
export const M8A_V411_REVIEWER_MODE_DEFAULT_ON = true;
export const M8A_V411_REVIEWER_MODE_STORAGE_KEY =
  "m8a-v411-reviewer-mode-on";

export type M8aV411ReplayClockMode =
  | "running"
  | "review-auto-paused"
  | "inspector-pinned"
  | "manual-paused"
  | "final-hold";

export type M8aV411PauseSource =
  | "review-mode-auto"
  | "inspector-open"
  | "user-pause-button"
  | null;

export interface M8aV411ReviewerModeState {
  replayClockMode: M8aV411ReplayClockMode;
  pinnedWindowId: M8aV46dSimulationHandoverWindowId | null;
  pinnedReplayRatio: number | null;
  previousPlaybackState: M8aV411ReplayClockMode | null;
  pauseSource: M8aV411PauseSource;
  toastSuppressed: boolean;
  reviewModeOn: boolean;
  reviewAutoPauseStartedAtEpochMs: number | null;
  manualPauseSpeedDeferred: boolean;
  lastModeChangeAtEpochMs: number;
}

export interface M8aV411ModeChangeAnnouncement {
  modeLabel: string;
  ariaText: string;
  pinnedWindowOrdinalLabel: string | null;
}

const M8A_V411_WINDOW_ORDINAL_LABELS: Record<
  M8aV46dSimulationHandoverWindowId,
  string
> = {
  "leo-acquisition-context": "W1",
  "leo-aging-pressure": "W2",
  "meo-continuity-hold": "W3",
  "leo-reentry-candidate": "W4",
  "geo-continuity-guard": "W5"
};

export function resolveM8aV411WindowOrdinalLabel(
  windowId: M8aV46dSimulationHandoverWindowId | null
): string | null {
  if (!windowId) {
    return null;
  }

  return M8A_V411_WINDOW_ORDINAL_LABELS[windowId] ?? null;
}

export function createM8aV411ReviewerModeInitialState({
  reviewModeOn,
  nowEpochMs
}: {
  reviewModeOn: boolean;
  nowEpochMs: number;
}): M8aV411ReviewerModeState {
  return {
    replayClockMode: "running",
    pinnedWindowId: null,
    pinnedReplayRatio: null,
    previousPlaybackState: null,
    pauseSource: null,
    toastSuppressed: false,
    reviewModeOn,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function readM8aV411ReviewerModePersistedToggle(
  storage: Pick<Storage, "getItem"> | null
): boolean {
  if (!storage) {
    return M8A_V411_REVIEWER_MODE_DEFAULT_ON;
  }

  try {
    const raw = storage.getItem(M8A_V411_REVIEWER_MODE_STORAGE_KEY);

    if (raw === "off") {
      return false;
    }

    if (raw === "on") {
      return true;
    }
  } catch {
    // Access blocked (private mode etc) — keep default-on.
  }

  return M8A_V411_REVIEWER_MODE_DEFAULT_ON;
}

export function writeM8aV411ReviewerModePersistedToggle(
  storage: Pick<Storage, "setItem"> | null,
  reviewModeOn: boolean
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      M8A_V411_REVIEWER_MODE_STORAGE_KEY,
      reviewModeOn ? "on" : "off"
    );
  } catch {
    // Access blocked — ignore.
  }
}

export function transitionForInspectorOpen(
  current: M8aV411ReviewerModeState,
  {
    pinnedWindowId,
    pinnedReplayRatio,
    nowEpochMs
  }: {
    pinnedWindowId: M8aV46dSimulationHandoverWindowId;
    pinnedReplayRatio: number;
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode === "final-hold") {
    return current;
  }

  return {
    ...current,
    replayClockMode: "inspector-pinned",
    pinnedWindowId,
    pinnedReplayRatio,
    previousPlaybackState:
      current.replayClockMode === "inspector-pinned"
        ? current.previousPlaybackState
        : current.replayClockMode,
    pauseSource: "inspector-open",
    toastSuppressed: true,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForInspectorClose(
  current: M8aV411ReviewerModeState,
  {
    nowEpochMs
  }: {
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode !== "inspector-pinned") {
    return {
      ...current,
      pinnedWindowId: null,
      pinnedReplayRatio: null,
      toastSuppressed: false,
      lastModeChangeAtEpochMs: nowEpochMs
    };
  }

  const restoreMode: M8aV411ReplayClockMode =
    current.previousPlaybackState === "manual-paused"
      ? "manual-paused"
      : current.previousPlaybackState === "review-auto-paused"
        ? "manual-paused"
        : "running";

  return {
    ...current,
    replayClockMode: restoreMode,
    pinnedWindowId: null,
    pinnedReplayRatio: null,
    previousPlaybackState: null,
    pauseSource:
      restoreMode === "manual-paused" ? "user-pause-button" : null,
    toastSuppressed: false,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForReviewAutoPauseStart(
  current: M8aV411ReviewerModeState,
  {
    nowEpochMs
  }: {
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode !== "running" || !current.reviewModeOn) {
    return current;
  }

  return {
    ...current,
    replayClockMode: "review-auto-paused",
    previousPlaybackState: "running",
    pauseSource: "review-mode-auto",
    toastSuppressed: false,
    reviewAutoPauseStartedAtEpochMs: nowEpochMs,
    manualPauseSpeedDeferred: true,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForReviewAutoPauseElapsed(
  current: M8aV411ReviewerModeState,
  {
    nowEpochMs
  }: {
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode !== "review-auto-paused") {
    return current;
  }

  return {
    ...current,
    replayClockMode: "running",
    previousPlaybackState: null,
    pauseSource: null,
    toastSuppressed: false,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForUserPause(
  current: M8aV411ReviewerModeState,
  {
    nowEpochMs
  }: {
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode === "final-hold") {
    return current;
  }

  return {
    ...current,
    replayClockMode: "manual-paused",
    previousPlaybackState:
      current.replayClockMode === "manual-paused"
        ? current.previousPlaybackState
        : current.replayClockMode,
    pauseSource: "user-pause-button",
    toastSuppressed: false,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForUserPlay(
  current: M8aV411ReviewerModeState,
  {
    nowEpochMs
  }: {
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode === "final-hold") {
    return {
      ...current,
      replayClockMode: "running",
      previousPlaybackState: null,
      pauseSource: null,
      toastSuppressed: false,
      reviewAutoPauseStartedAtEpochMs: null,
      manualPauseSpeedDeferred: false,
      lastModeChangeAtEpochMs: nowEpochMs
    };
  }

  if (
    current.replayClockMode === "running" ||
    current.replayClockMode === "inspector-pinned"
  ) {
    return current;
  }

  return {
    ...current,
    replayClockMode: "running",
    previousPlaybackState: null,
    pauseSource: null,
    toastSuppressed: false,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForFinalHoldEnter(
  current: M8aV411ReviewerModeState,
  {
    nowEpochMs
  }: {
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.replayClockMode === "final-hold") {
    return current;
  }

  return {
    ...current,
    replayClockMode: "final-hold",
    previousPlaybackState: null,
    pauseSource: null,
    toastSuppressed: false,
    reviewAutoPauseStartedAtEpochMs: null,
    manualPauseSpeedDeferred: false,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function transitionForReviewModeToggle(
  current: M8aV411ReviewerModeState,
  {
    reviewModeOn,
    nowEpochMs
  }: {
    reviewModeOn: boolean;
    nowEpochMs: number;
  }
): M8aV411ReviewerModeState {
  if (current.reviewModeOn === reviewModeOn) {
    return current;
  }

  if (
    !reviewModeOn &&
    current.replayClockMode === "review-auto-paused"
  ) {
    return {
      ...current,
      replayClockMode: "running",
      previousPlaybackState: null,
      pauseSource: null,
      toastSuppressed: false,
      reviewAutoPauseStartedAtEpochMs: null,
      manualPauseSpeedDeferred: false,
      reviewModeOn,
      lastModeChangeAtEpochMs: nowEpochMs
    };
  }

  return {
    ...current,
    reviewModeOn,
    lastModeChangeAtEpochMs: nowEpochMs
  };
}

export function isM8aV411ReviewAutoPauseElapsed(
  state: M8aV411ReviewerModeState,
  nowEpochMs: number
): boolean {
  if (
    state.replayClockMode !== "review-auto-paused" ||
    typeof state.reviewAutoPauseStartedAtEpochMs !== "number"
  ) {
    return false;
  }

  return (
    nowEpochMs - state.reviewAutoPauseStartedAtEpochMs >=
    M8A_V411_REVIEW_AUTO_PAUSE_DURATION_MS
  );
}

export function resolveM8aV411ModeAnnouncement(
  state: M8aV411ReviewerModeState
): M8aV411ModeChangeAnnouncement {
  const ordinal = resolveM8aV411WindowOrdinalLabel(state.pinnedWindowId);

  switch (state.replayClockMode) {
    case "inspector-pinned": {
      const ordinalLabel = ordinal ?? "current window";
      return {
        modeLabel: `Pinned to ${ordinalLabel}`,
        ariaText: `Reviewer pinned to ${ordinalLabel}`,
        pinnedWindowOrdinalLabel: ordinal
      };
    }
    case "review-auto-paused":
      return {
        modeLabel: "Auto-pause: review mode",
        ariaText: "Auto-pause: review mode",
        pinnedWindowOrdinalLabel: null
      };
    case "manual-paused":
      return {
        modeLabel: "Paused by user",
        ariaText: "Paused by user",
        pinnedWindowOrdinalLabel: null
      };
    case "final-hold":
      return {
        modeLabel: "Final hold · restart",
        ariaText: "Final hold; press restart to replay from the start",
        pinnedWindowOrdinalLabel: null
      };
    case "running":
    default:
      return {
        modeLabel: "Replaying",
        ariaText: "Resumed",
        pinnedWindowOrdinalLabel: null
      };
  }
}

export function resolveM8aV411ControlAvailability(
  state: M8aV411ReviewerModeState
): {
  playEnabled: boolean;
  pauseEnabled: boolean;
  restartEnabled: boolean;
  speedEnabled: boolean;
  speedAppliesAfterResume: boolean;
  reviewToggleEnabled: boolean;
  closeInspectorEnabled: boolean;
} {
  switch (state.replayClockMode) {
    case "running":
      return {
        playEnabled: false,
        pauseEnabled: true,
        restartEnabled: true,
        speedEnabled: true,
        speedAppliesAfterResume: false,
        reviewToggleEnabled: true,
        closeInspectorEnabled: false
      };
    case "review-auto-paused":
      return {
        playEnabled: true,
        pauseEnabled: true,
        restartEnabled: true,
        speedEnabled: true,
        speedAppliesAfterResume: state.manualPauseSpeedDeferred,
        reviewToggleEnabled: true,
        closeInspectorEnabled: false
      };
    case "inspector-pinned":
      return {
        playEnabled: true,
        pauseEnabled: false,
        restartEnabled: true,
        speedEnabled: true,
        speedAppliesAfterResume: true,
        reviewToggleEnabled: true,
        closeInspectorEnabled: true
      };
    case "manual-paused":
      return {
        playEnabled: true,
        pauseEnabled: false,
        restartEnabled: true,
        speedEnabled: true,
        speedAppliesAfterResume: false,
        reviewToggleEnabled: true,
        closeInspectorEnabled: false
      };
    case "final-hold":
      return {
        playEnabled: true,
        pauseEnabled: false,
        restartEnabled: true,
        speedEnabled: false,
        speedAppliesAfterResume: false,
        reviewToggleEnabled: true,
        closeInspectorEnabled: false
      };
  }
}
