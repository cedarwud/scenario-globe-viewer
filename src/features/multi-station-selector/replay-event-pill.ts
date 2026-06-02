// A single transient pill anchored at chrome.bottomRight that surfaces
// the most recent handover-event emission during the `replaying` display
// state. The pill mounts once per viewer lifetime, hidden by default; it
// only exposes attribute mutations on a stable root (no per-event mount
// churn).
//
// Lifecycle:
// - bootstrap creates the root, hidden;
// - when display state is `replaying` AND the panel emits a runtime
//   projection result, the module watches replayClock.getState().
//   currentTime and picks the event whose handoverAtUtc is the largest
//   value ≤ now;
// - on each new picked-event identity, sets data-event-utc/event-kind/
//   fade-state=visible, schedules a 3 s timer to fading and a 4 s timer
//   to hidden;
// - a new event before the 4 s cycle completes cancels the timers and
//   restarts the cycle;
// - leaving `replaying` resets the pill to hidden immediately.
//
// DOM-only. Tests probe the data-* attributes; no internal observer API
// is exposed.

import type { ReplayClock } from "../time";
import type { DisplayState } from "./display-state";
import type { HandoverEvent, RuntimeProjectionResult } from "./runtime-projection";

const ROOT_DATA_ATTR = "data-replay-event-pill";
const VISIBLE_HOLD_MS = 3000;
const FADE_DURATION_MS = 1000;
const TOTAL_VISIBLE_PLUS_FADE_MS = VISIBLE_HOLD_MS + FADE_DURATION_MS;

type FadeState = "visible" | "fading" | "hidden";

export interface ReplayEventPillHandle {
  /**
   * Set the current display state. Pill clears immediately when the state
   * leaves `replaying`; otherwise it begins observing handover events.
   */
  setDisplayState(state: DisplayState): void;
  /**
   * Publish the latest runtime projection result. The pill re-derives its
   * picked event from the projection's `handoverEvents` array each time
   * the replay clock ticks; this entry only swaps which events array is
   * being read.
   */
  setRuntimeResult(result: RuntimeProjectionResult | null): void;
  dispose(): void;
}

const REASON_KIND_HUMAN_LABEL: Readonly<
  Record<HandoverEvent["reasonKind"] | "initial-acquisition", string>
> = {
  "initial-acquisition": "Initial acquisition",
  "current-link-unavailable": "Current link unavailable",
  "better-candidate-available": "Better candidate available",
  "policy-tie-break": "Policy tie-break",
  "cross-orbit-migration": "Cross-orbit migration"
};

function resolveEventKindLabel(
  event: HandoverEvent
): string {
  // The initial-acquisition kind is signalled by a null fromSatelliteId
  // even though the underlying reasonKind is one of the four post-policy
  // values — render that as "Initial acquisition" for the operator HUD.
  if (event.fromSatelliteId === null) {
    return REASON_KIND_HUMAN_LABEL["initial-acquisition"];
  }
  return (
    REASON_KIND_HUMAN_LABEL[event.reasonKind] ?? "Link selection event"
  );
}

function resolveDataEventKind(
  event: HandoverEvent
): string {
  if (event.fromSatelliteId === null) {
    return "initial-acquisition";
  }
  return event.reasonKind;
}

function formatClockTimeHmsUtc(value: string | number | undefined): string {
  if (value === undefined) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function buildRoot(): HTMLDivElement {
  const root = document.createElement("div");
  root.setAttribute(ROOT_DATA_ATTR, "true");
  root.dataset.fadeState = "hidden";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-atomic", "true");
  root.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "replay-event-pill__label";

  const chip = document.createElement("span");
  chip.className = "replay-event-pill__chip";

  root.append(label, chip);
  return root;
}

function readClockNowMs(replayClock: ReplayClock): number | null {
  try {
    const state = replayClock.getState();
    const current = state.currentTime;
    if (typeof current === "number") {
      return Number.isFinite(current) ? current : null;
    }
    const parsed = new Date(current).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function pickEventAtOrBefore(
  events: ReadonlyArray<HandoverEvent>,
  nowMs: number
): HandoverEvent | null {
  let best: HandoverEvent | null = null;
  let bestMs = -Infinity;
  for (const event of events) {
    const eventMs = new Date(event.handoverAtUtc).getTime();
    if (!Number.isFinite(eventMs) || eventMs > nowMs) {
      continue;
    }
    if (eventMs > bestMs) {
      best = event;
      bestMs = eventMs;
    }
  }
  return best;
}

function eventIdentity(event: HandoverEvent | null): string | null {
  if (!event) {
    return null;
  }
  return `${event.handoverAtUtc}|${event.fromSatelliteId ?? "-"}|${event.toSatelliteId}|${event.reasonKind}`;
}

export function mountReplayEventPill(
  viewerContainer: HTMLElement,
  replayClock: ReplayClock
): ReplayEventPillHandle {
  const root = buildRoot();
  const label = root.querySelector<HTMLSpanElement>(".replay-event-pill__label");
  const chip = root.querySelector<HTMLSpanElement>(".replay-event-pill__chip");
  viewerContainer.appendChild(root);

  let disposed = false;
  let displayState: DisplayState = "idle";
  let runtimeResult: RuntimeProjectionResult | null = null;
  let pickedIdentity: string | null = null;
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (fadeTimer !== null) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function setFadeState(state: FadeState): void {
    root.dataset.fadeState = state;
    root.setAttribute("aria-hidden", state === "visible" ? "false" : "true");
  }

  function resetToHidden(): void {
    clearTimers();
    pickedIdentity = null;
    delete root.dataset.eventKind;
    delete root.dataset.eventUtc;
    delete root.dataset.vMo1;
    setFadeState("hidden");
  }

  function applyEvent(event: HandoverEvent): void {
    const dataEventKind = resolveDataEventKind(event);
    root.dataset.eventKind = dataEventKind;
    root.dataset.eventUtc = event.handoverAtUtc;
    if (dataEventKind === "cross-orbit-migration") {
      root.dataset.vMo1 = "true";
    } else {
      delete root.dataset.vMo1;
    }
    if (label) {
      label.textContent = `${resolveEventKindLabel(event)} at ${formatClockTimeHmsUtc(event.handoverAtUtc)} UTC`;
    }
    if (chip) {
      const fromText = event.fromSatelliteId ?? "—";
      chip.textContent = `${fromText} → ${event.toSatelliteId}`;
    }
    setFadeState("visible");
    clearTimers();
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      if (disposed) return;
      setFadeState("fading");
    }, VISIBLE_HOLD_MS);
    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (disposed) return;
      setFadeState("hidden");
    }, TOTAL_VISIBLE_PLUS_FADE_MS);
  }

  function maybeRender(): void {
    if (disposed) return;
    if (displayState !== "replaying") {
      if (pickedIdentity !== null) {
        resetToHidden();
      }
      return;
    }
    const events = runtimeResult?.handoverEvents;
    if (!events || events.length === 0) {
      return;
    }
    const nowMs = readClockNowMs(replayClock);
    if (nowMs === null) {
      return;
    }
    const next = pickEventAtOrBefore(events, nowMs);
    const nextIdentity = eventIdentity(next);
    if (nextIdentity === null || nextIdentity === pickedIdentity) {
      return;
    }
    if (next === null) {
      return;
    }
    pickedIdentity = nextIdentity;
    applyEvent(next);
  }

  const unsubscribeReplayClock = replayClock.onTick(() => {
    maybeRender();
  });

  return {
    setDisplayState(state: DisplayState): void {
      if (displayState === state) {
        return;
      }
      displayState = state;
      if (state !== "replaying") {
        resetToHidden();
        return;
      }
      // Re-evaluate immediately on the transition into replaying so a
      // pre-existing event in the window surfaces without waiting for
      // the next replay-clock tick.
      maybeRender();
    },
    setRuntimeResult(result: RuntimeProjectionResult | null): void {
      runtimeResult = result;
      // A new runtime result invalidates the previously-picked identity
      // because the handoverAtUtc keys may have shifted (rain slider
      // re-run, pair re-anchor, etc.). Clear so the next pick fires the
      // visible cycle.
      pickedIdentity = null;
      if (displayState === "replaying") {
        maybeRender();
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribeReplayClock();
      clearTimers();
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
