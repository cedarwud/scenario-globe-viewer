import type {
  M8aV46dSimulationHandoverWindow,
  M8aV46dSimulationHandoverWindowId
} from "./m8a-v4-ground-station-projection";

export const M8A_V411_COUNTDOWN_SURFACE_VERSION =
  "m8a-v4.11-countdown-surface-conv2-runtime.v1";
export const M8A_V411_COUNTDOWN_FOOTNOTE_TEXT = "~ 為模擬推演值";
export const M8A_V411_COUNTDOWN_FONT_SIZE_PX = 14;
export const M8A_V411_COUNTDOWN_GAP_FROM_MICRO_CUE_PX = 8;

export interface M8aV411CountdownDerivation {
  windowId: M8aV46dSimulationHandoverWindowId;
  replayRatio: number;
  startRatioInclusive: number;
  stopRatioExclusive: number;
  fullReplaySimulatedSeconds: number;
  withinWindowFraction: number;
  remainingFraction: number;
  remainingSimulatedSec: number;
  approximateDisplay: string;
  unit: "minute" | "second";
}

export interface M8aV411CountdownPhraseCopy {
  prefix: string;
  appendix: string;
}

const M8A_V411_COUNTDOWN_PHRASE_COPY = {
  "leo-acquisition-context": {
    prefix: "服務時間",
    appendix: "下一段：訊號減弱"
  },
  "leo-aging-pressure": {
    prefix: "切換到 MEO",
    appendix: "位置條件變差"
  },
  "meo-continuity-hold": {
    prefix: "暫時接住",
    appendix: "新 LEO 即將回來"
  },
  "leo-reentry-candidate": {
    prefix: "若切回",
    appendix: "MEO 仍接住可緩決定"
  },
  "geo-continuity-guard": {
    prefix: "序列結束",
    appendix: "重新開始可以再看一次"
  }
} satisfies Record<M8aV46dSimulationHandoverWindowId, M8aV411CountdownPhraseCopy>;

export function resolveM8aV411CountdownPhraseCopy(
  windowId: M8aV46dSimulationHandoverWindowId
): M8aV411CountdownPhraseCopy {
  return M8A_V411_COUNTDOWN_PHRASE_COPY[windowId];
}

export function formatApproximateRemainingDuration(
  seconds: number
): { display: string; unit: "minute" | "second" } {
  const safeSeconds = Math.max(0, seconds);

  if (safeSeconds <= 60) {
    const display = `~${Math.max(1, Math.round(safeSeconds))} 秒`;
    return { display, unit: "second" };
  }

  const minutes = Math.max(1, Math.round(safeSeconds / 60));
  return { display: `~${minutes} 分鐘`, unit: "minute" };
}

export function deriveM8aV411CountdownRemaining({
  window,
  replayRatio,
  fullReplaySimulatedSeconds
}: {
  window: M8aV46dSimulationHandoverWindow;
  replayRatio: number;
  fullReplaySimulatedSeconds: number;
}): M8aV411CountdownDerivation {
  const start = window.startRatioInclusive;
  const stop = window.stopRatioExclusive;
  const span = stop - start;
  const safeSpan = span > 0 ? span : 1;
  const clampedRatio = Math.min(Math.max(replayRatio, start), stop);
  const withinWindowFraction = (clampedRatio - start) / safeSpan;
  const clampedWithin = Math.min(Math.max(withinWindowFraction, 0), 1);
  const remainingFraction = 1 - clampedWithin;
  const remainingSimulatedSec =
    remainingFraction * span * fullReplaySimulatedSeconds;
  const formatted = formatApproximateRemainingDuration(remainingSimulatedSec);

  return {
    windowId: window.windowId,
    replayRatio: clampedRatio,
    startRatioInclusive: start,
    stopRatioExclusive: stop,
    fullReplaySimulatedSeconds,
    withinWindowFraction: clampedWithin,
    remainingFraction,
    remainingSimulatedSec,
    approximateDisplay: formatted.display,
    unit: formatted.unit
  };
}

export interface M8aV411CountdownSurfaceRenderState {
  derivation: M8aV411CountdownDerivation;
  phrase: M8aV411CountdownPhraseCopy;
  primaryText: string;
  appendixText: string;
}

const M8A_V411_COUNTDOWN_SURFACE_ID = "m8a-v411-countdown-surface";

export function ensureM8aV411CountdownSurfaceStructure(
  root: HTMLElement
): HTMLElement {
  let surface = root.querySelector<HTMLElement>(
    "[data-m8a-v411-countdown-surface='true']"
  );

  if (!surface) {
    surface = document.createElement("div");
    surface.id = M8A_V411_COUNTDOWN_SURFACE_ID;
    surface.className = "m8a-v411-product-ux__countdown-surface";
    surface.dataset.m8aV411CountdownSurface = "true";
    surface.dataset.m8aV411CountdownSurfaceVersion =
      M8A_V411_COUNTDOWN_SURFACE_VERSION;
    surface.dataset.m8aV411CountdownDerivation = "addendum-1.1";
    surface.setAttribute("aria-live", "polite");

    const primary = document.createElement("strong");
    primary.dataset.m8aV411CountdownPrimary = "true";
    primary.dataset.m8aV48InfoClass = "dynamic";
    surface.appendChild(primary);

    const appendix = document.createElement("span");
    appendix.dataset.m8aV411CountdownAppendix = "true";
    appendix.dataset.m8aV48InfoClass = "dynamic";
    surface.appendChild(appendix);

    const footnote = document.createElement("small");
    footnote.dataset.m8aV411CountdownFootnote = "true";
    footnote.dataset.m8aV48InfoClass = "disclosure";
    footnote.textContent = M8A_V411_COUNTDOWN_FOOTNOTE_TEXT;
    surface.appendChild(footnote);

    root.appendChild(surface);
  }

  return surface;
}

export function renderM8aV411CountdownSurface({
  root,
  derivation,
  microCueRect
}: {
  root: HTMLElement;
  derivation: M8aV411CountdownDerivation;
  microCueRect?: DOMRect | null;
}): M8aV411CountdownSurfaceRenderState {
  const surface = ensureM8aV411CountdownSurfaceStructure(root);
  const phrase = resolveM8aV411CountdownPhraseCopy(derivation.windowId);
  const primaryText = `${phrase.prefix}：${derivation.approximateDisplay}`;
  const appendixText = phrase.appendix;

  const primary = surface.querySelector<HTMLElement>(
    "[data-m8a-v411-countdown-primary='true']"
  );
  const appendix = surface.querySelector<HTMLElement>(
    "[data-m8a-v411-countdown-appendix='true']"
  );
  const footnote = surface.querySelector<HTMLElement>(
    "[data-m8a-v411-countdown-footnote='true']"
  );

  if (primary) {
    primary.textContent = primaryText;
  }

  if (appendix) {
    appendix.textContent = appendixText;
  }

  if (footnote) {
    footnote.textContent = M8A_V411_COUNTDOWN_FOOTNOTE_TEXT;
  }

  surface.dataset.m8aV411CountdownWindowId = derivation.windowId;
  surface.dataset.m8aV411CountdownReplayRatio =
    derivation.replayRatio.toFixed(6);
  surface.dataset.m8aV411CountdownStartRatio =
    derivation.startRatioInclusive.toFixed(6);
  surface.dataset.m8aV411CountdownStopRatio =
    derivation.stopRatioExclusive.toFixed(6);
  surface.dataset.m8aV411CountdownWithinWindowFraction =
    derivation.withinWindowFraction.toFixed(6);
  surface.dataset.m8aV411CountdownRemainingFraction =
    derivation.remainingFraction.toFixed(6);
  surface.dataset.m8aV411CountdownRemainingSimulatedSec =
    derivation.remainingSimulatedSec.toFixed(2);
  surface.dataset.m8aV411CountdownFullReplaySimulatedSec =
    derivation.fullReplaySimulatedSeconds.toFixed(2);
  surface.dataset.m8aV411CountdownApproximateDisplay =
    derivation.approximateDisplay;
  surface.dataset.m8aV411CountdownUnit = derivation.unit;
  surface.dataset.m8aV411CountdownPrimaryText = primaryText;
  surface.dataset.m8aV411CountdownAppendixText = appendixText;
  surface.dataset.m8aV411CountdownFootnoteText =
    M8A_V411_COUNTDOWN_FOOTNOTE_TEXT;
  surface.dataset.m8aV411CountdownFontSizePx = String(
    M8A_V411_COUNTDOWN_FONT_SIZE_PX
  );
  surface.dataset.m8aV411CountdownGapFromMicroCuePx = String(
    M8A_V411_COUNTDOWN_GAP_FROM_MICRO_CUE_PX
  );

  if (microCueRect) {
    surface.dataset.m8aV411CountdownMicroCueRectLeft =
      microCueRect.left.toFixed(1);
    surface.dataset.m8aV411CountdownMicroCueRectTop =
      microCueRect.top.toFixed(1);
    surface.dataset.m8aV411CountdownMicroCueRectWidth =
      microCueRect.width.toFixed(1);
    surface.dataset.m8aV411CountdownMicroCueRectHeight =
      microCueRect.height.toFixed(1);
  }

  return {
    derivation,
    phrase,
    primaryText,
    appendixText
  };
}
