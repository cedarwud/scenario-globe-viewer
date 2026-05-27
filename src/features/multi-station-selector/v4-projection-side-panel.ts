// V4 selected-pair panel — bounded decision surface.
//
// The default panel renders only a compact view model derived from
// RuntimeProjectionResult. Full visibility, handover, and provenance lists stay
// behind the Evidence action so the panel root can fit without scrolling.

import { JulianDate, type Viewer } from "cesium";
import "./v4-projection-side-panel.css";
import {
  buildDefaultTimeWindow,
  buildRuntimeTleSourceParseStats,
  computeLinkBudgetMetricsForOrbit,
  loadDefaultTleSources,
  parseRuntimeOrbitSources,
  resolveRuntimeHandoverPolicyId,
  SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
  type RuntimeHandoverPolicyId,
  type RuntimeProjectionResult
} from "./runtime-projection";
import {
  buildRuntimeProjectionEvidenceReportFilename,
  buildRuntimeProjectionEvidenceReportHtml
} from "./runtime-projection-evidence-report";
import { createRuntimeProjectionWorkerClient } from "./runtime-projection-worker-client";
import { buildReplayControlRow } from "./v4-projection-replay-controls";
import {
  buildDisclosuresRow,
  PANEL_EVIDENCE_DRAWER_ID,
  syncTleTelemetryChip
} from "./v4-projection-evidence-drawer";
import {
  clampPercent,
  formatCount,
  formatCountLabel,
  formatDurationMs,
  formatIsoSecond,
  formatIsoShort,
  formatMbpsValue,
  formatReasonLabel,
  formatSatelliteShort,
  formatSignedPercent,
  formatSpeedMbps,
  formatStationPanelName,
  formatSummaryCountLabel,
  formatUtcClock,
  formatUtcClockWithSeconds,
  formatUtcMidpointClock,
  sampleEvenly
} from "./v4-projection-formatters";
import type {
  OrbitClass,
  RuntimeOrbitRecord
} from "./visibility-utils";
import type { V4ResolvedStationPair } from "./v4-route-selection";

const PANEL_DECISION_CARD_LIMIT = 3;
const PANEL_TIMELINE_SEGMENT_LIMIT = 18;
const PANEL_TIMELINE_TICK_LIMIT = 12;
const PANEL_ROW4_VISIBILITY_PREVIEW_COUNT = 3;
const PANEL_ROW4_HANDOVER_PREVIEW_COUNT = 3;
const DEFAULT_DEMO_PROJECTION_DURATION_MINUTES = 360;
const MIN_DEMO_PROJECTION_DURATION_MINUTES = 20;
const MAX_DEMO_PROJECTION_DURATION_MINUTES = 1440;
const DEMO_PROJECTION_DURATION_PRESETS_MINUTES = [360, 720, 1440] as const;
const START_UTC_PARAM = "startUtc";
const DURATION_MINUTES_PARAM = "durationMinutes";
const POLICY_PARAM = "policy";
const COMPARE_PARAM = "compare";
const PRE_WAVE2_COMPARE_MODE = "pre-wave-2";

const RAIN_RATE_MIN_MM_PER_HOUR = 0;
const RAIN_RATE_MAX_MM_PER_HOUR = 100;
const RAIN_RATE_STEP_MM_PER_HOUR = 5;
const RAIN_RECOMPUTE_DEBOUNCE_MS = 150;

const RAIN_IMPACT_STANDARD_CITATION = "ITU-R P.618-14 §2.2.1";



function createPanelShell(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "v4-projection-side-panel";
  root.dataset.v4ProjectionSidePanel = "true";
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Runtime projection of the selected ground-station pair");
  return root;
}

function removeEvidenceDrawer(ownerDocument: Document): void {
  ownerDocument.getElementById(PANEL_EVIDENCE_DRAWER_ID)?.remove();
}

function bindPanelWheelScroll(): () => void {
  return () => undefined;
}

function renderLoading(root: HTMLElement, pair: V4ResolvedStationPair): void {
  removeEvidenceDrawer(root.ownerDocument);
  root.replaceChildren();
  root.dataset.state = "loading";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = `Runtime projection · ${pair.stationA.name} ↔ ${pair.stationB.name}`;

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status";
  status.textContent = "Loading TLE fixtures and computing visibility windows…";

  root.append(title, status);
}

function renderError(root: HTMLElement, message: string): void {
  removeEvidenceDrawer(root.ownerDocument);
  root.replaceChildren();
  root.dataset.state = "error";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = "Runtime projection unavailable";

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status v4-projection-side-panel__status--error";
  status.textContent = message;

  root.append(title, status);
}

interface PanelTimelineSegment {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly startUtc: string;
  readonly endUtc: string;
  readonly startPercent: number;
  readonly widthPercent: number;
  readonly modifier: string | null;
}

interface PanelTimelineTick {
  readonly handoverAtUtc: string;
  readonly leftPercent: number;
  readonly modifier: string | null;
  readonly label: string;
}


interface PanelDecisionCard {
  readonly label: string;
  readonly timeLabel: string;
  readonly primary: string;
  readonly secondary: string;
  readonly modifier: string | null;
}

interface SelectedPairPanelViewModel {
  readonly pairLabel: string;
  readonly sourceBadge: string;
  readonly windowLabel: string;
  readonly timeWindowStartUtc: string;
  readonly timeWindowEndUtc: string;
  readonly durationMinutes: number;
  readonly durationLabel: string;
  readonly timelineAxisStartLabel: string;
  readonly timelineAxisMidLabel: string;
  readonly timelineAxisEndLabel: string;
  readonly availabilityLabel: string;
  readonly handoverCountLabel: string;
  readonly nextLinkLabel: string;
  readonly timelineSummary: string;
  readonly timelineSegments: ReadonlyArray<PanelTimelineSegment>;
  readonly timelineTicks: ReadonlyArray<PanelTimelineTick>;
  readonly decisionCards: ReadonlyArray<PanelDecisionCard>;
  readonly conciseBoundary: string;
}

function buildPlainTextSeparator(): HTMLSpanElement {
  const separator = document.createElement("span");
  separator.className = "v4-projection-side-panel__plain-text-separator";
  separator.textContent = " · ";
  return separator;
}

function clampDurationMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DEMO_PROJECTION_DURATION_MINUTES;
  }
  return Math.min(
    Math.max(Math.round(value), MIN_DEMO_PROJECTION_DURATION_MINUTES),
    MAX_DEMO_PROJECTION_DURATION_MINUTES
  );
}

function formatDurationPresetLabel(durationMinutes: number): string {
  return durationMinutes % 60 === 0
    ? `${durationMinutes / 60}h`
    : `${durationMinutes}m`;
}

function syncDurationMinutesParam(durationMinutes: number): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (durationMinutes === DEFAULT_DEMO_PROJECTION_DURATION_MINUTES) {
    url.searchParams.delete(DURATION_MINUTES_PARAM);
  } else {
    url.searchParams.set(DURATION_MINUTES_PARAM, String(durationMinutes));
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function resolveProjectionTimeWindowAndDuration(): {
  window: { startUtc: string; endUtc: string };
  durationMinutes: number;
} {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const startUtcParam = search.get(START_UTC_PARAM);
  const parsedStartMs = startUtcParam ? Date.parse(startUtcParam) : NaN;
  const startUtc = Number.isFinite(parsedStartMs)
    ? new Date(parsedStartMs).toISOString()
    : new Date().toISOString();
  const durationParam = search.get(DURATION_MINUTES_PARAM);
  const durationMinutes =
    durationParam === null
      ? DEFAULT_DEMO_PROJECTION_DURATION_MINUTES
      : clampDurationMinutes(Number(durationParam));
  return {
    window: buildDefaultTimeWindow(startUtc, durationMinutes),
    durationMinutes
  };
}

function resolveProjectionPolicyId(): RuntimeHandoverPolicyId {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  return resolveRuntimeHandoverPolicyId(
    search.get(POLICY_PARAM) ?? SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
  );
}

function resolveProjectionCompareMode(): CompareMode {
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  return search.get(COMPARE_PARAM) === PRE_WAVE2_COMPARE_MODE
    ? PRE_WAVE2_COMPARE_MODE
    : null;
}

function buildStatBlock(
  label: string,
  value: string,
  modifier?: string
): HTMLElement {
  const block = document.createElement("div");
  block.className = "v4-projection-side-panel__stat";
  if (modifier) {
    block.dataset.modifier = modifier;
  }
  const labelEl = document.createElement("span");
  labelEl.className = "v4-projection-side-panel__stat-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__stat-value";
  valueEl.textContent = value;
  block.append(labelEl, valueEl);
  return block;
}

function resolveWave1Baseline(result: RuntimeProjectionResult): Wave1Baseline | null {
  return (
    WAVE1_BASELINE_BY_PAIR.get(
      baselineKey(result.pair.stationA.id, result.pair.stationB.id)
    ) ?? null
  );
}

function buildComparePane(
  title: string,
  paneId: "current" | "pre-wave-2",
  children: ReadonlyArray<Node>
): HTMLElement {
  const pane = document.createElement("section");
  pane.className = "v4-projection-side-panel__compare-pane";
  pane.dataset.comparePane = paneId;
  const heading = document.createElement("h3");
  heading.className = "v4-projection-side-panel__compare-title";
  heading.textContent = title;
  pane.append(heading, ...children);
  return pane;
}

function buildCompareDelta(delta: number, formatter: (value: number) => string): HTMLElement {
  const span = document.createElement("span");
  span.className = "v4-projection-side-panel__compare-delta";
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  span.dataset.direction = direction;
  span.textContent =
    delta === 0
      ? "Δ 0"
      : `${delta > 0 ? "↑" : "↓"} ${formatter(Math.abs(delta))}`;
  return span;
}

function buildCompareStatBlock(
  label: string,
  value: string,
  delta: number,
  formatter: (value: number) => string
): HTMLElement {
  const block = buildStatBlock(label, value);
  block.append(buildCompareDelta(delta, formatter));
  return block;
}

function downloadRuntimeProjectionEvidenceReport(
  result: RuntimeProjectionResult
): void {
  const html = buildRuntimeProjectionEvidenceReportHtml(result);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildRuntimeProjectionEvidenceReportFilename(result);
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function buildDownloadEvidenceReportButton(
  result: RuntimeProjectionResult,
  label = "Download evidence report"
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v4-projection-side-panel__download-report";
  button.textContent = label;
  button.setAttribute("aria-label", "Download evidence report");
  button.addEventListener("click", () => {
    downloadRuntimeProjectionEvidenceReport(result);
  });
  return button;
}

const ORBIT_DISPLAY_ORDER: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

function resolveSourceBadgeLabel(
  attribution: RuntimeProjectionResult["dataCompleteness"]["pairSourceAttribution"]
): string {
  if (attribution.sourceTier === "public-disclosed") {
    return "Public source";
  }
  if (attribution.evidenceKind === "same-operator-family-inferred") {
    return "Same-family inferred";
  }
  return "Geometry only";
}

function resolveSatelliteOrbitClass(
  result: RuntimeProjectionResult,
  satelliteId: string
): OrbitClass {
  const windowOrbit = result.visibilityWindows.find(
    (entry) => entry.satelliteId === satelliteId
  )?.orbitClass;
  if (windowOrbit) {
    return windowOrbit;
  }
  for (const orbit of ORBIT_DISPLAY_ORDER) {
    if (
      result.visibleConstellations[orbit].some(
        (entry) => entry.satelliteId === satelliteId
      )
    ) {
      return orbit;
    }
  }
  return result.sharedSupportedOrbits[0] ?? "LEO";
}

function createTimelineSegment(
  result: RuntimeProjectionResult,
  satelliteId: string,
  startUtc: string,
  endUtc: string,
  modifier: string | null
): PanelTimelineSegment | null {
  const windowStartMs = Date.parse(result.timeWindow.startUtc);
  const windowEndMs = Date.parse(result.timeWindow.endUtc);
  const startMs = Math.max(Date.parse(startUtc), windowStartMs);
  const endMs = Math.min(Date.parse(endUtc), windowEndMs);
  const windowDurationMs = windowEndMs - windowStartMs;
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    !Number.isFinite(windowDurationMs) ||
    windowDurationMs <= 0 ||
    endMs <= startMs
  ) {
    return null;
  }
  const startPercent = clampPercent(
    ((startMs - windowStartMs) / windowDurationMs) * 100
  );
  const endPercent = clampPercent(
    ((endMs - windowStartMs) / windowDurationMs) * 100
  );
  return {
    satelliteId,
    orbitClass: resolveSatelliteOrbitClass(result, satelliteId),
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
    startPercent,
    widthPercent: Math.max(0.2, endPercent - startPercent),
    modifier
  };
}

function mergeTimelineSegments(
  segments: ReadonlyArray<PanelTimelineSegment>
): ReadonlyArray<PanelTimelineSegment> {
  const merged: PanelTimelineSegment[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.orbitClass === segment.orbitClass &&
      previous.modifier === null &&
      segment.modifier === null &&
      Date.parse(segment.startUtc) - Date.parse(previous.endUtc) <= 90_000
    ) {
      merged[merged.length - 1] = {
        ...previous,
        endUtc: segment.endUtc,
        widthPercent:
          segment.startPercent + segment.widthPercent - previous.startPercent
      };
      continue;
    }
    merged.push(segment);
  }
  return merged;
}

function compressTimelineSegmentsForOverview(
  result: RuntimeProjectionResult,
  segments: ReadonlyArray<PanelTimelineSegment>
): ReadonlyArray<PanelTimelineSegment> {
  const merged = mergeTimelineSegments(segments);
  if (merged.length <= PANEL_TIMELINE_SEGMENT_LIMIT) {
    return merged;
  }

  const windowStartMs = Date.parse(result.timeWindow.startUtc);
  const windowEndMs = Date.parse(result.timeWindow.endUtc);
  const windowDurationMs = windowEndMs - windowStartMs;
  if (
    !Number.isFinite(windowStartMs) ||
    !Number.isFinite(windowEndMs) ||
    windowDurationMs <= 0
  ) {
    return sampleEvenly(merged, PANEL_TIMELINE_SEGMENT_LIMIT);
  }

  const compressed: PanelTimelineSegment[] = [];
  for (let index = 0; index < PANEL_TIMELINE_SEGMENT_LIMIT; index += 1) {
    const binStartMs =
      windowStartMs + (windowDurationMs * index) / PANEL_TIMELINE_SEGMENT_LIMIT;
    const binEndMs =
      windowStartMs +
      (windowDurationMs * (index + 1)) / PANEL_TIMELINE_SEGMENT_LIMIT;
    const overlapByOrbit: Record<OrbitClass, number> = {
      LEO: 0,
      MEO: 0,
      GEO: 0
    };
    const overlapBySatellite = new Map<string, number>();

    for (const segment of merged) {
      const segmentStartMs = Date.parse(segment.startUtc);
      const segmentEndMs = Date.parse(segment.endUtc);
      if (!Number.isFinite(segmentStartMs) || !Number.isFinite(segmentEndMs)) {
        continue;
      }
      const overlapMs =
        Math.min(binEndMs, segmentEndMs) -
        Math.max(binStartMs, segmentStartMs);
      if (overlapMs <= 0) {
        continue;
      }
      overlapByOrbit[segment.orbitClass] += overlapMs;
      const satelliteKey = `${segment.orbitClass}\u0000${segment.satelliteId}`;
      overlapBySatellite.set(
        satelliteKey,
        (overlapBySatellite.get(satelliteKey) ?? 0) + overlapMs
      );
    }

    const orbitClass = ORBIT_DISPLAY_ORDER.reduce((best, orbit) =>
      overlapByOrbit[orbit] > overlapByOrbit[best] ? orbit : best
    );
    if (overlapByOrbit[orbitClass] <= 0) {
      continue;
    }

    let satelliteId = "";
    let satelliteOverlapMs = -1;
    for (const [key, overlapMs] of overlapBySatellite.entries()) {
      const [orbit, candidateSatelliteId] = key.split("\u0000");
      if (orbit !== orbitClass || overlapMs <= satelliteOverlapMs) {
        continue;
      }
      satelliteId = candidateSatelliteId;
      satelliteOverlapMs = overlapMs;
    }

    if (!satelliteId) {
      continue;
    }

    const startPercent = clampPercent(
      ((binStartMs - windowStartMs) / windowDurationMs) * 100
    );
    const endPercent = clampPercent(
      ((binEndMs - windowStartMs) / windowDurationMs) * 100
    );
    compressed.push({
      satelliteId,
      orbitClass,
      startUtc: new Date(binStartMs).toISOString(),
      endUtc: new Date(binEndMs).toISOString(),
      startPercent,
      widthPercent: Math.max(0.2, endPercent - startPercent),
      modifier: null
    });
  }

  return mergeTimelineSegments(compressed);
}

function buildTimelineSegments(
  result: RuntimeProjectionResult
): ReadonlyArray<PanelTimelineSegment> {
  const sortedEvents = [...result.handoverEvents].sort(
    (a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc)
  );
  const segments: PanelTimelineSegment[] = [];

  if (sortedEvents.length > 0) {
    for (let index = 0; index < sortedEvents.length; index += 1) {
      const event = sortedEvents[index];
      const nextEvent = sortedEvents[index + 1] ?? null;
      const segment = createTimelineSegment(
        result,
        event.toSatelliteId,
        event.handoverAtUtc,
        nextEvent?.handoverAtUtc ?? result.timeWindow.endUtc,
        null
      );
      if (segment) {
        segments.push(segment);
      }
    }
  } else {
    const windows = [...result.visibilityWindows].sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) -
        Date.parse(b.intersectionStartUtc)
    );
    for (const windowEntry of windows) {
      const segment = createTimelineSegment(
        result,
        windowEntry.satelliteId,
        windowEntry.intersectionStartUtc,
        windowEntry.intersectionEndUtc,
        null
      );
      if (segment) {
        segments.push(segment);
      }
    }
  }

  return compressTimelineSegmentsForOverview(result, segments);
}

function buildTimelineTicks(
  result: RuntimeProjectionResult
): ReadonlyArray<PanelTimelineTick> {
  const windowStartMs = Date.parse(result.timeWindow.startUtc);
  const windowEndMs = Date.parse(result.timeWindow.endUtc);
  const windowDurationMs = windowEndMs - windowStartMs;
  if (!Number.isFinite(windowDurationMs) || windowDurationMs <= 0) {
    return [];
  }
  const sorted = [...result.handoverEvents]
    .filter((event) => event.fromSatelliteId !== null)
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc));
  const sampled = [...sampleEvenly(sorted, PANEL_TIMELINE_TICK_LIMIT)];
  const crossOrbit = sorted.find(
    (event) => event.reasonKind === "cross-orbit-migration"
  );
  if (
    crossOrbit &&
    !sampled.some((event) => event.handoverAtUtc === crossOrbit.handoverAtUtc)
  ) {
    sampled.splice(Math.max(sampled.length - 1, 0), 1, crossOrbit);
  }
  return sampled
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc))
    .map((event) => {
      const eventMs = Date.parse(event.handoverAtUtc);
      return {
        handoverAtUtc: event.handoverAtUtc,
        leftPercent: clampPercent(
          ((eventMs - windowStartMs) / windowDurationMs) * 100
        ),
        modifier: null,
        label: `${formatUtcClockWithSeconds(event.handoverAtUtc)} UTC · ${formatReasonLabel(event.reasonKind, event.fromSatelliteId)}`
      };
    });
}

function buildDecisionCards(
  result: RuntimeProjectionResult
): ReadonlyArray<PanelDecisionCard> {
  const sortedEvents = [...result.handoverEvents].sort(
    (a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc)
  );
  const cards: PanelDecisionCard[] = [];
  const pushEventCard = (
    label: string,
    event: RuntimeProjectionResult["handoverEvents"][number] | null
  ): void => {
    if (!event) {
      return;
    }
    const modifier =
      event.reasonKind === "cross-orbit-migration"
        ? "cross-orbit-migration"
        : null;
    const fromLabel = formatSatelliteShort(event.fromSatelliteId);
    const toLabel = formatSatelliteShort(event.toSatelliteId);
    cards.push({
      label,
      timeLabel: `${formatUtcClockWithSeconds(event.handoverAtUtc)} UTC`,
      primary:
        event.fromSatelliteId === null
          ? `Use ${toLabel}`
          : `${fromLabel} -> ${toLabel}`,
      secondary: `${resolveSatelliteOrbitClass(result, event.toSatelliteId)} · ${formatReasonLabel(event.reasonKind, event.fromSatelliteId)}`,
      modifier
    });
  };

  if (sortedEvents.length === 0) {
    const firstWindow = [...result.visibilityWindows].sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) -
        Date.parse(b.intersectionStartUtc)
    )[0];
    if (firstWindow) {
      cards.push({
        label: "Start link",
        timeLabel: `${formatUtcClockWithSeconds(firstWindow.intersectionStartUtc)} UTC`,
        primary: `${formatSatelliteShort(firstWindow.satelliteId)} · ${firstWindow.orbitClass}`,
        secondary: `${formatDurationMs(Date.parse(firstWindow.intersectionEndUtc) - Date.parse(firstWindow.intersectionStartUtc))} mutual visibility`,
        modifier: null
      });
    } else {
      cards.push({
        label: "No link",
        timeLabel: "No link",
        primary: "No mutual visibility",
        secondary:
          result.dataCompleteness.emptyReasonCode ??
          "No shared satellite window in this projection.",
        modifier: null
      });
    }
    return cards;
  }

  pushEventCard("Start link", sortedEvents[0] ?? null);
  pushEventCard(
    "Next handover",
    sortedEvents.find((event) => event.fromSatelliteId !== null) ?? null
  );
  pushEventCard(
    "Cross-orbit",
    sortedEvents.find((event) => event.reasonKind === "cross-orbit-migration") ??
      null
  );

  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.timeLabel}|${card.primary}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, PANEL_DECISION_CARD_LIMIT);
}

function buildSelectedPairPanelViewModel(
  pair: V4ResolvedStationPair,
  result: RuntimeProjectionResult,
  durationMinutes: number
): SelectedPairPanelViewModel {
  const sortedEvents = [...result.handoverEvents].sort(
    (a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc)
  );
  const nextEvent =
    sortedEvents.find((event) => event.fromSatelliteId !== null) ??
    sortedEvents[0] ??
    null;
  const firstWindow = [...result.visibilityWindows].sort(
    (a, b) =>
      Date.parse(a.intersectionStartUtc) -
      Date.parse(b.intersectionStartUtc)
  )[0];
  const attribution = result.dataCompleteness.pairSourceAttribution;
  const sourceBadge = resolveSourceBadgeLabel(attribution);
  const durationLabel = formatDurationPresetLabel(durationMinutes);
  const windowLabel = `${formatUtcClock(result.timeWindow.startUtc)}-${formatUtcClock(result.timeWindow.endUtc)} UTC · ${durationLabel}`;
  const timelineSegments = buildTimelineSegments(result);
  const handoverCount = result.communicationStats.handoverCount;

  return {
    pairLabel: `${formatStationPanelName(pair.stationA.name)} ↔ ${formatStationPanelName(pair.stationB.name)}`,
    sourceBadge,
    windowLabel,
    timeWindowStartUtc: result.timeWindow.startUtc,
    timeWindowEndUtc: result.timeWindow.endUtc,
    durationMinutes,
    durationLabel,
    timelineAxisStartLabel: formatUtcClock(result.timeWindow.startUtc),
    timelineAxisMidLabel: formatUtcMidpointClock(
      result.timeWindow.startUtc,
      result.timeWindow.endUtc
    ),
    timelineAxisEndLabel: formatUtcClock(result.timeWindow.endUtc),
    availabilityLabel: formatDurationMs(
      result.communicationStats.totalCommunicatingMs
    ),
    handoverCountLabel: String(handoverCount),
    nextLinkLabel: nextEvent
      ? formatSatelliteShort(nextEvent.toSatelliteId)
      : firstWindow
      ? formatSatelliteShort(firstWindow.satelliteId)
      : "No mutual link",
    timelineSummary:
      result.visibilityWindows.length === 0
        ? result.dataCompleteness.emptyReasonCode ?? "No pair intersection"
        : `${formatCountLabel(result.visibilityWindows.length, "window", "windows")} · ${formatCountLabel(result.handoverEvents.length, "event", "events")}`,
    timelineSegments,
    timelineTicks: buildTimelineTicks(result),
    decisionCards: buildDecisionCards(result),
    conciseBoundary:
      result.truthBoundary.nonClaims[0] ??
      `${result.truthBoundary.precisionLabel} · ${sourceBadge}`
  };
}

type CompareMode = typeof PRE_WAVE2_COMPARE_MODE | null;

interface Wave1BaselineEvent {
  readonly handoverAtUtc: string;
  readonly reasonKind: RuntimeProjectionResult["handoverEvents"][number]["reasonKind"];
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
}

interface Wave1Baseline {
  readonly stationAId: string;
  readonly stationBId: string;
  readonly totalCommunicatingMs: number;
  readonly handoverCount: number;
  readonly meanLinkDwellMs: number;
  readonly linkSelectionEventCount: number;
  readonly events: ReadonlyArray<Wave1BaselineEvent>;
  readonly throughputMbps: Readonly<Partial<Record<OrbitClass, number>>>;
}

const WAVE1_BASELINES: ReadonlyArray<Wave1Baseline> = [
  {
    stationAId: "ksat-svalsat-svalbard",
    stationBId: "ksat-tromso",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 1,
    meanLinkDwellMs: 10_800_000,
    linkSelectionEventCount: 2,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0210 (GALILEO 13)"
      },
      {
        handoverAtUtc: "2026-05-17T05:24:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0210 (GALILEO 13)",
        toSatelliteId: "GSAT0226 (GALILEO 31)"
      }
    ],
    throughputMbps: { LEO: 198.932, MEO: 99.712, GEO: 48.841 }
  },
  {
    stationAId: "ksat-svalsat-svalbard",
    stationBId: "ksat-trollsat-antarctica",
    totalCommunicatingMs: 0,
    handoverCount: 0,
    meanLinkDwellMs: 0,
    linkSelectionEventCount: 0,
    events: [],
    throughputMbps: {}
  },
  {
    stationAId: "intelsat-fuchsstadt",
    stationBId: "intelsat-atlanta",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 2,
    meanLinkDwellMs: 7_200_000,
    linkSelectionEventCount: 3,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "GSAT0213 (GALILEO 17)"
      },
      {
        handoverAtUtc: "2026-05-17T03:35:30.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0213 (GALILEO 17)",
        toSatelliteId: "GSAT0227 (GALILEO 30)"
      },
      {
        handoverAtUtc: "2026-05-17T05:20:30.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0227 (GALILEO 30)",
        toSatelliteId: "GSAT0205 (GALILEO 9)"
      }
    ],
    throughputMbps: { MEO: 99.712, GEO: 48.841 }
  },
  {
    stationAId: "singtel-bukit-timah",
    stationBId: "measat-cyberjaya",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 0,
    meanLinkDwellMs: 21_600_000,
    linkSelectionEventCount: 1,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "ASIASTAR"
      }
    ],
    throughputMbps: { LEO: 198.932, GEO: 48.841 }
  },
  {
    stationAId: "cht-yangmingshan",
    stationBId: "sansa-hartebeesthoek",
    totalCommunicatingMs: 21_600_000,
    handoverCount: 2,
    meanLinkDwellMs: 7_200_000,
    linkSelectionEventCount: 3,
    events: [
      {
        handoverAtUtc: "2026-05-17T00:00:00.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: null,
        toSatelliteId: "INMARSAT 3-F3"
      },
      {
        handoverAtUtc: "2026-05-17T02:24:30.000Z",
        reasonKind: "better-candidate-available",
        fromSatelliteId: "INMARSAT 3-F3",
        toSatelliteId: "GSAT0203 (GALILEO 7)"
      },
      {
        handoverAtUtc: "2026-05-17T04:31:30.000Z",
        reasonKind: "current-link-unavailable",
        fromSatelliteId: "GSAT0203 (GALILEO 7)",
        toSatelliteId: "INMARSAT 3-F3"
      }
    ],
    throughputMbps: { LEO: 198.932, MEO: 99.712, GEO: 48.841 }
  }
];

function baselineKey(stationAId: string, stationBId: string): string {
  return [stationAId, stationBId].sort().join("|");
}

const WAVE1_BASELINE_BY_PAIR: ReadonlyMap<string, Wave1Baseline> = new Map(
  WAVE1_BASELINES.map((baseline) => [
    baselineKey(baseline.stationAId, baseline.stationBId),
    baseline
  ])
);

function computeProjectionPairMidpointHeightAboveSeaKm(
  result: RuntimeProjectionResult
): number {
  return (result.pair.stationA.elevationM + result.pair.stationB.elevationM) / 2000;
}

/**
 * Per-orbit downlink-throughput contrast. `computeLinkBudgetMetricsForOrbit`
 * runs the same ITU-R P.618-14 model the projection uses; pricing it at
 * 0 mm/h vs the current rate makes the rain fade visible even when the
 * window's comm-time is geometry-saturated.
 */
function buildRainSpeedComparison(
  rainRateMmPerHour: number,
  result: RuntimeProjectionResult
): HTMLElement {
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";
  const allowedOrbits = new Set(result.sharedSupportedOrbits);
  const stationHeightAboveSeaKm =
    computeProjectionPairMidpointHeightAboveSeaKm(result);

  for (const orbit of ORBIT_DISPLAY_ORDER.filter((orbitClass) =>
    allowedOrbits.has(orbitClass)
  )) {
    const clear = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour: 0,
      stationHeightAboveSeaKm
    });
    const wet = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour,
      stationHeightAboveSeaKm
    });
    const dropFraction =
      clear.networkSpeedMbps > 0
        ? (clear.networkSpeedMbps - wet.networkSpeedMbps) / clear.networkSpeedMbps
        : 0;
    const rainTransparent =
      Math.abs(wet.networkSpeedMbps - clear.networkSpeedMbps) < 0.01;

    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    if (!rainTransparent) {
      li.dataset.modifier = "rain-degraded";
    }

    const primary = document.createElement("span");
    primary.className = "v4-projection-side-panel__list-primary";
    primary.textContent = `${orbit} ${formatSpeedMbps(clear.networkSpeedMbps)} -> ${formatSpeedMbps(wet.networkSpeedMbps)}`;

    const secondary = document.createElement("span");
    secondary.className = "v4-projection-side-panel__list-secondary";
    secondary.textContent = rainTransparent
      ? "No rain-band fade."
      : `${formatSignedPercent(-dropFraction)} Mbps · jitter ${clear.jitterMs.toFixed(1)} -> ${wet.jitterMs.toFixed(1)} ms`;

    li.append(primary, secondary);
    list.append(li);
  }

  return list;
}

interface RainControlElements {
  readonly control: HTMLElement;
  readonly slider: HTMLInputElement;
  readonly valueEl: HTMLSpanElement;
  readonly captionEl: HTMLParagraphElement;
}

function buildRainControl(
  rainRateMmPerHour: number,
  onInput: (rainRateMmPerHour: number) => void
): RainControlElements {
  const control = document.createElement("div");
  control.className = "v4-projection-side-panel__rain-control";
  control.dataset.rainActive = rainRateMmPerHour > 0 ? "true" : "false";

  const head = document.createElement("div");
  head.className = "v4-projection-side-panel__rain-head";

  const label = document.createElement("label");
  label.className = "v4-projection-side-panel__rain-label";
  label.id = "v4-rain-rate-label";
  label.textContent = "Rain rate";

  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__rain-value";
  valueEl.textContent = `${rainRateMmPerHour} mm/h`;

  head.append(label, valueEl);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "v4-projection-side-panel__rain-slider";
  slider.min = String(RAIN_RATE_MIN_MM_PER_HOUR);
  slider.max = String(RAIN_RATE_MAX_MM_PER_HOUR);
  slider.step = String(RAIN_RATE_STEP_MM_PER_HOUR);
  slider.value = String(rainRateMmPerHour);
  slider.setAttribute("aria-labelledby", "v4-rain-rate-label");
  slider.setAttribute("aria-valuemin", String(RAIN_RATE_MIN_MM_PER_HOUR));
  slider.setAttribute("aria-valuemax", String(RAIN_RATE_MAX_MM_PER_HOUR));
  slider.setAttribute("aria-valuenow", String(rainRateMmPerHour));

  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__rain-caption";

  control.append(head, slider, caption);

  slider.addEventListener("input", () => {
    const next = Number(slider.value);
    const normalized = Number.isFinite(next) ? next : 0;
    valueEl.textContent = `${normalized} mm/h`;
    slider.setAttribute("aria-valuenow", String(normalized));
    control.dataset.rainActive = normalized > 0 ? "true" : "false";
    onInput(normalized);
  });

  return { control, slider, valueEl, captionEl: caption };
}

function setRainControlCaption(
  elements: RainControlElements,
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number
): void {
  if (rainRateMmPerHour <= 0) {
    elements.captionEl.textContent =
      "Model ITU-R P.618-14 rain fade on Ku/Ka.";
    return;
  }
  const rainNonClaim = result.truthBoundary.nonClaims.find((note) =>
    note.toLowerCase().includes("rain")
  );
  elements.captionEl.textContent =
    rainNonClaim ?? "Rain-rate attenuation applied per ITU-R P.618-14.";
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

function buildHeaderRow(
  result: RuntimeProjectionResult,
  viewModel: SelectedPairPanelViewModel
): HTMLElement {
  const row = document.createElement("section");
  row.className =
    "v4-projection-side-panel__row v4-projection-side-panel__header";
  row.dataset.row = "1";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  const titleText = viewModel.pairLabel;
  title.textContent = titleText;
  title.title = titleText;

  const tierAttribution = result.dataCompleteness.pairSourceAttribution;
  const tierBadge = document.createElement("span");
  tierBadge.className = "v4-projection-side-panel__tier-badge";
  tierBadge.dataset.tier = tierAttribution.sourceTier;
  tierBadge.dataset.evidenceKind = tierAttribution.evidenceKind;
  const tierLabel = viewModel.sourceBadge;
  tierBadge.textContent = tierLabel;
  tierBadge.title = tierAttribution.badgeLabel;

  const windowLine = document.createElement("p");
  windowLine.className = "v4-projection-side-panel__window";
  const windowText = viewModel.windowLabel;
  windowLine.textContent = windowText;
  windowLine.title = `${formatIsoSecond(result.timeWindow.startUtc)} to ${formatIsoSecond(result.timeWindow.endUtc)}`;
  row.setAttribute("aria-label", `${titleText} · ${tierLabel} · ${windowText}`);

  row.append(
    title,
    buildPlainTextSeparator(),
    tierBadge,
    buildPlainTextSeparator(),
    windowLine
  );
  return row;
}

function buildRainControlRow(rainControl: RainControlElements): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "2";
  row.append(rainControl.control);
  return row;
}

function buildOutcomeRow(viewModel: SelectedPairPanelViewModel): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "2";
  row.setAttribute(
    "aria-label",
    `Available ${viewModel.availabilityLabel}; handovers ${viewModel.handoverCountLabel}; next link ${viewModel.nextLinkLabel}`
  );

  const grid = document.createElement("div");
  grid.className = "v4-projection-side-panel__outcome-grid";
  const available = buildStatBlock("Available", viewModel.availabilityLabel);
  const handovers = buildStatBlock("Handovers", viewModel.handoverCountLabel);
  const next = buildStatBlock("Next link", viewModel.nextLinkLabel);
  next.title = viewModel.nextLinkLabel;
  grid.append(available, handovers, next);
  row.append(grid);
  return row;
}

function buildDurationPresetControl(
  activeDurationMinutes: number,
  onDurationChange: (durationMinutes: number) => void
): HTMLElement {
  const control = document.createElement("div");
  control.className = "v4-projection-side-panel__duration-presets";
  control.setAttribute("role", "group");
  control.setAttribute("aria-label", "Projection duration");

  for (const durationMinutes of DEMO_PROJECTION_DURATION_PRESETS_MINUTES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v4-projection-side-panel__duration-preset";
    button.textContent = formatDurationPresetLabel(durationMinutes);
    button.setAttribute(
      "aria-label",
      `Show ${formatDurationPresetLabel(durationMinutes)} projection`
    );
    button.setAttribute(
      "aria-pressed",
      durationMinutes === activeDurationMinutes ? "true" : "false"
    );
    button.addEventListener("click", () => {
      if (durationMinutes !== activeDurationMinutes) {
        onDurationChange(durationMinutes);
      }
    });
    control.append(button);
  }

  return control;
}

function buildTimelineCurrentMarker(
  viewModel: SelectedPairPanelViewModel
): HTMLElement {
  const marker = document.createElement("span");
  marker.className = "v4-projection-side-panel__timeline-current";
  marker.dataset.v4TimelineCurrentMarker = "true";
  marker.dataset.windowStartUtc = viewModel.timeWindowStartUtc;
  marker.dataset.windowEndUtc = viewModel.timeWindowEndUtc;
  marker.dataset.windowState = "inside";
  marker.style.setProperty("--current-left", "0%");
  marker.setAttribute("aria-hidden", "true");
  marker.title = "Current replay time";
  return marker;
}

function buildTimelineRow(
  viewModel: SelectedPairPanelViewModel,
  onDurationChange: (durationMinutes: number) => void
): HTMLElement {
  const row = document.createElement("section");
  row.className =
    "v4-projection-side-panel__row v4-projection-side-panel__timeline-map";
  row.dataset.row = "3";
  row.dataset.timelineMap = "true";
  row.setAttribute(
    "aria-label",
    `${viewModel.durationLabel} link map: ${viewModel.timelineSummary}`
  );

  const wrapper = document.createElement("div");
  wrapper.className = "v4-projection-side-panel__timeline";
  wrapper.setAttribute(
    "aria-label",
    `Projection timeline: ${viewModel.timelineSummary}`
  );

  const head = document.createElement("div");
  head.className = "v4-projection-side-panel__timeline-head";
  const copy = document.createElement("div");
  copy.className = "v4-projection-side-panel__timeline-copy";
  const title = document.createElement("h3");
  title.className = "v4-projection-side-panel__timeline-title";
  title.textContent = `${viewModel.durationLabel} link map`;
  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__timeline-caption";
  caption.textContent = viewModel.timelineSummary;
  copy.append(title, caption);
  head.append(
    copy,
    buildDurationPresetControl(viewModel.durationMinutes, onDurationChange)
  );

  const track = document.createElement("div");
  track.className = "v4-projection-side-panel__timeline-track";
  if (viewModel.timelineSegments.length === 0) {
    const empty = document.createElement("div");
    empty.className = "v4-projection-side-panel__timeline-empty";
    empty.textContent = viewModel.timelineSummary;
    track.append(empty);
  } else {
    for (const orbitClass of ORBIT_DISPLAY_ORDER) {
      const lane = document.createElement("div");
      lane.className = "v4-projection-side-panel__timeline-lane";
      lane.dataset.orbit = orbitClass;
      const laneSegments = viewModel.timelineSegments.filter(
        (segment) => segment.orbitClass === orbitClass
      );
      lane.dataset.active = laneSegments.length > 0 ? "true" : "false";

      const label = document.createElement("span");
      label.className = "v4-projection-side-panel__timeline-lane-label";
      label.textContent = orbitClass;

      const rail = document.createElement("div");
      rail.className = "v4-projection-side-panel__timeline-lane-rail";
      for (const segment of laneSegments) {
        const span = document.createElement("span");
        span.className = "v4-projection-side-panel__timeline-segment";
        span.dataset.orbit = segment.orbitClass;
        span.dataset.satelliteId = segment.satelliteId;
        span.setAttribute("aria-hidden", "true");
        if (segment.modifier) {
          span.dataset.modifier = segment.modifier;
        }
        span.style.setProperty(
          "--segment-start",
          `${segment.startPercent.toFixed(3)}%`
        );
        span.style.setProperty(
          "--segment-width",
          `${segment.widthPercent.toFixed(3)}%`
        );
        span.title = `${formatSatelliteShort(segment.satelliteId)} · ${segment.orbitClass} · ${formatUtcClockWithSeconds(segment.startUtc)}-${formatUtcClockWithSeconds(segment.endUtc)} UTC`;
        rail.append(span);
      }

      lane.append(label, rail);
      track.append(lane);
    }

  }

  const markerLayer = document.createElement("div");
  markerLayer.className =
    "v4-projection-side-panel__timeline-marker-layer";
  markerLayer.setAttribute("aria-hidden", "true");
  markerLayer.append(buildTimelineCurrentMarker(viewModel));
  for (const tick of viewModel.timelineTicks) {
    const span = document.createElement("span");
    span.className = "v4-projection-side-panel__timeline-tick";
    if (tick.modifier) {
      span.dataset.modifier = tick.modifier;
    }
    span.style.setProperty("--tick-left", `${tick.leftPercent.toFixed(3)}%`);
    span.title = tick.label;
    markerLayer.append(span);
  }
  track.append(markerLayer);

  const axis = document.createElement("div");
  axis.className = "v4-projection-side-panel__timeline-axis";
  axis.setAttribute("aria-label", "Timeline axis labels in UTC");
  const start = document.createElement("span");
  start.textContent = `${viewModel.timelineAxisStartLabel} start`;
  const mid = document.createElement("span");
  mid.textContent = `${viewModel.timelineAxisMidLabel} mid`;
  const end = document.createElement("span");
  end.textContent = `${viewModel.timelineAxisEndLabel} end`;
  axis.append(start, mid, end);

  const legend = document.createElement("div");
  legend.className = "v4-projection-side-panel__timeline-legend";
  legend.setAttribute("aria-label", "Timeline legend");
  const addLegendItem = (label: string, kind: string): void => {
    const item = document.createElement("span");
    item.className = "v4-projection-side-panel__timeline-legend-item";
    const marker = document.createElement("span");
    marker.className = "v4-projection-side-panel__timeline-legend-marker";
    marker.dataset.kind = kind;
    marker.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = label;
    item.append(marker, text);
    legend.append(item);
  };
  addLegendItem("LEO", "LEO");
  addLegendItem("MEO", "MEO");
  addLegendItem("GEO", "GEO");
  addLegendItem("Handover", "handover");

  wrapper.append(head, track, axis, legend);
  row.append(wrapper);
  return row;
}

function getViewerClockDate(viewer: Viewer | undefined): Date {
  if (!viewer || viewer.isDestroyed()) {
    return new Date();
  }
  try {
    return JulianDate.toDate(viewer.clock.currentTime);
  } catch {
    return new Date();
  }
}

function syncTimelineCurrentMarkers(root: HTMLElement, viewer: Viewer | undefined): void {
  const currentDate = getViewerClockDate(viewer);
  const currentMs = currentDate.getTime();
  const currentUtc = currentDate.toISOString();

  for (const marker of root.querySelectorAll<HTMLElement>(
    "[data-v4-timeline-current-marker='true']"
  )) {
    const startMs = Date.parse(marker.dataset.windowStartUtc ?? "");
    const endMs = Date.parse(marker.dataset.windowEndUtc ?? "");
    const durationMs = endMs - startMs;
    if (
      !Number.isFinite(currentMs) ||
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      durationMs <= 0
    ) {
      marker.style.setProperty("--current-left", "0%");
      marker.dataset.windowState = "before";
      marker.dataset.currentUtc = currentUtc;
      continue;
    }

    const rawPercent = ((currentMs - startMs) / durationMs) * 100;
    const currentPercent = clampPercent(rawPercent);
    marker.style.setProperty("--current-left", `${currentPercent.toFixed(3)}%`);
    marker.dataset.currentUtc = currentUtc;
    marker.dataset.windowState =
      rawPercent < 0 ? "before" : rawPercent > 100 ? "after" : "inside";
    marker.title = `${formatUtcClockWithSeconds(currentUtc)} UTC · current replay time`;
  }
}

function bindTimelineCurrentMarkerSync(
  root: HTMLElement,
  viewer: Viewer | undefined
): () => void {
  syncTimelineCurrentMarkers(root, viewer);
  if (viewer && !viewer.isDestroyed()) {
    const removeClockListener = viewer.clock.onTick.addEventListener(() => {
      syncTimelineCurrentMarkers(root, viewer);
    });
    return () => {
      removeClockListener();
    };
  }

  const ownerWindow = root.ownerDocument.defaultView;
  if (!ownerWindow) {
    return () => {};
  }
  const intervalId = ownerWindow.setInterval(() => {
    syncTimelineCurrentMarkers(root, viewer);
  }, 1_000);
  return () => {
    ownerWindow.clearInterval(intervalId);
  };
}

function buildDecisionCardsRow(
  viewModel: SelectedPairPanelViewModel
): HTMLElement {
  const row = document.createElement("section");
  row.className =
    "v4-projection-side-panel__row v4-projection-side-panel__link-plan";
  row.dataset.row = "4";
  row.setAttribute(
    "aria-label",
    "Next six-hour link plan with current link and upcoming handovers"
  );

  const head = document.createElement("div");
  head.className = "v4-projection-side-panel__link-plan-head";
  const title = document.createElement("h3");
  title.className = "v4-projection-side-panel__link-plan-title";
  title.textContent = "Next 6h link plan";
  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__link-plan-caption";
  caption.textContent = "UTC schedule";
  head.append(title, caption);

  const list = document.createElement("div");
  list.className = "v4-projection-side-panel__decision-list";
  for (const card of viewModel.decisionCards.slice(0, PANEL_DECISION_CARD_LIMIT)) {
    const item = document.createElement("article");
    item.className = "v4-projection-side-panel__decision-card";
    if (card.modifier) {
      item.dataset.modifier = card.modifier;
    }
    const kicker = document.createElement("div");
    kicker.className = "v4-projection-side-panel__decision-kicker";
    const label = document.createElement("span");
    label.className = "v4-projection-side-panel__decision-label";
    label.textContent = card.label;
    const time = document.createElement("span");
    time.className = "v4-projection-side-panel__decision-time";
    time.textContent = card.timeLabel;
    kicker.append(label, time);

    const primary = document.createElement("span");
    primary.className = "v4-projection-side-panel__decision-primary";
    primary.textContent = card.primary;
    primary.title = card.primary;
    const secondary = document.createElement("span");
    secondary.className = "v4-projection-side-panel__decision-secondary";
    secondary.textContent = card.secondary;
    item.append(kicker, primary, secondary);
    list.append(item);
  }
  row.append(head, list);
  return row;
}

function buildRainImpactMainRow(
  rainControl: RainControlElements,
  result: RuntimeProjectionResult,
  rainRateMmPerHour: number,
  clearSky: RuntimeProjectionResult
): HTMLElement {
  const row = document.createElement("section");
  row.className =
    "v4-projection-side-panel__row v4-projection-side-panel__rain-impact";
  row.dataset.row = "5";

  const clearMs = clearSky.communicationStats.totalCommunicatingMs;
  const currentMs = result.communicationStats.totalCommunicatingMs;
  const lostMs = Math.max(0, clearMs - currentMs);
  const summary = document.createElement("p");
  summary.className = "v4-projection-side-panel__rain-caption";
  summary.textContent =
    rainRateMmPerHour <= 0
      ? `Clear sky baseline · ${RAIN_IMPACT_STANDARD_CITATION}`
      : lostMs > 0
      ? `${formatDurationMs(lostMs)} communication time lost · ${RAIN_IMPACT_STANDARD_CITATION}`
      : `Throughput/jitter delta only · ${RAIN_IMPACT_STANDARD_CITATION}`;

  row.append(
    rainControl.control,
    summary,
    buildRainSpeedComparison(rainRateMmPerHour, result)
  );
  return row;
}

function computeClearSkyThroughputByOrbit(
  result: RuntimeProjectionResult
): Partial<Record<OrbitClass, number>> {
  const stationHeightAboveSeaKm =
    computeProjectionPairMidpointHeightAboveSeaKm(result);
  const allowedOrbits = new Set(result.sharedSupportedOrbits);
  const values: Partial<Record<OrbitClass, number>> = {};
  for (const orbit of ORBIT_DISPLAY_ORDER) {
    if (!allowedOrbits.has(orbit)) {
      continue;
    }
    values[orbit] = computeLinkBudgetMetricsForOrbit(orbit, {
      rainRateMmPerHour: 0,
      stationHeightAboveSeaKm
    }).networkSpeedMbps;
  }
  return values;
}

function buildCompareFlatStatsRow(
  result: RuntimeProjectionResult,
  baseline: Wave1Baseline | null
): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "3";
  row.dataset.compare = PRE_WAVE2_COMPARE_MODE;

  if (!baseline) {
    const stats = document.createElement("div");
    stats.className = "v4-projection-side-panel__stats";
    stats.append(
      buildStatBlock(
        "Comm time",
        formatDurationMs(result.communicationStats.totalCommunicatingMs)
      ),
      buildStatBlock("Pre-wave-2", "baseline unavailable")
    );
    row.append(stats);
    return row;
  }

  const currentThroughput = computeClearSkyThroughputByOrbit(result);
  const currentPaneChildren: Node[] = [
    buildCompareStatBlock(
      "Comm time",
      formatDurationMs(result.communicationStats.totalCommunicatingMs),
      result.communicationStats.totalCommunicatingMs - baseline.totalCommunicatingMs,
      formatDurationMs
    ),
    buildCompareStatBlock(
      "Handovers",
      String(result.communicationStats.handoverCount),
      result.communicationStats.handoverCount - baseline.handoverCount,
      formatCount
    )
  ];
  const baselinePaneChildren: Node[] = [
    buildStatBlock("Comm time", formatDurationMs(baseline.totalCommunicatingMs)),
    buildStatBlock("Handovers", String(baseline.handoverCount))
  ];

  for (const orbit of ORBIT_DISPLAY_ORDER) {
    const currentMbps = currentThroughput[orbit];
    const baselineMbps = baseline.throughputMbps[orbit];
    if (currentMbps === undefined && baselineMbps === undefined) {
      continue;
    }
    currentPaneChildren.push(
      currentMbps === undefined || baselineMbps === undefined
        ? buildStatBlock(`${orbit} Mbps`, currentMbps === undefined ? "n/a" : formatMbpsValue(currentMbps))
        : buildCompareStatBlock(
            `${orbit} Mbps`,
            formatMbpsValue(currentMbps),
            currentMbps - baselineMbps,
            formatMbpsValue
          )
    );
    baselinePaneChildren.push(
      buildStatBlock(
        `${orbit} Mbps`,
        baselineMbps === undefined ? "n/a" : formatMbpsValue(baselineMbps)
      )
    );
  }

  const grid = document.createElement("div");
  grid.className = "v4-projection-side-panel__compare-grid";
  grid.append(
    buildComparePane("Current", "current", currentPaneChildren),
    buildComparePane("Pre-wave-2", "pre-wave-2", baselinePaneChildren)
  );
  row.append(grid);
  return row;
}

function buildFlatStatsRow(
  result: RuntimeProjectionResult,
  compareMode: CompareMode
): HTMLElement {
  if (compareMode === PRE_WAVE2_COMPARE_MODE) {
    return buildCompareFlatStatsRow(result, resolveWave1Baseline(result));
  }
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "3";

  const stats = document.createElement("div");
  stats.className = "v4-projection-side-panel__stats";
  stats.append(
    buildStatBlock(
      "Comm time",
      formatDurationMs(result.communicationStats.totalCommunicatingMs)
    ),
    buildStatBlock(
      "Handovers",
      String(result.communicationStats.handoverCount)
    )
  );
  row.append(stats);
  return row;
}

function buildVisibilityRow(
  satelliteId: string,
  orbitClass: OrbitClass,
  startUtc: string,
  endUtc: string
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "v4-projection-side-panel__list-item";
  const dur = Date.parse(endUtc) - Date.parse(startUtc);
  const sat = document.createElement("span");
  sat.className = "v4-projection-side-panel__list-primary";
  sat.textContent = `${satelliteId} · ${orbitClass}`;
  const time = document.createElement("span");
  time.className = "v4-projection-side-panel__list-secondary";
  time.textContent = `${formatIsoShort(startUtc)} – ${formatIsoShort(endUtc)}  ·  ${formatDurationMs(dur)}`;
  li.append(sat, time);
  return li;
}

function buildHandoverRow(
  event: RuntimeProjectionResult["handoverEvents"][number]
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "v4-projection-side-panel__list-item";
  if (event.reasonKind === "cross-orbit-migration") {
    li.dataset.modifier = "cross-orbit-migration";
  }
  const head = document.createElement("span");
  head.className = "v4-projection-side-panel__list-primary";
  head.textContent = `${formatIsoShort(event.handoverAtUtc)}  ${event.fromSatelliteId ?? "—"} → ${event.toSatelliteId}`;
  const reason = document.createElement("span");
  reason.className = "v4-projection-side-panel__list-secondary";
  reason.textContent =
    event.fromSatelliteId === null
      ? "initial acquisition"
      : event.reasonKind === "cross-orbit-migration"
      ? "cross-orbit migration (V-MO1)"
      : event.reasonKind.replace(/-/g, " ");
  li.append(head, reason);
  return li;
}

function pickRow4HandoverEvents(
  events: RuntimeProjectionResult["handoverEvents"]
): ReadonlyArray<RuntimeProjectionResult["handoverEvents"][number]> {
  if (events.length === 0) {
    return [];
  }
  const sortedAsc = [...events].sort(
    (a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc)
  );
  const head = sortedAsc.slice(0, PANEL_ROW4_HANDOVER_PREVIEW_COUNT);
  // Pin the most recent cross-orbit-migration event if it is not already
  // in the head — V-MO1 visibility requirement (IA §5 Row 4).
  const headIds = new Set(head.map((event) => event.handoverAtUtc));
  const latestCrossOrbit = [...sortedAsc]
    .reverse()
    .find(
      (event) =>
        event.reasonKind === "cross-orbit-migration" &&
        !headIds.has(event.handoverAtUtc)
    );
  return latestCrossOrbit ? [...head, latestCrossOrbit] : head;
}

function buildCompareEventList(
  events: ReadonlyArray<RuntimeProjectionResult["handoverEvents"][number]>
): HTMLElement {
  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No link selection events.";
    return empty;
  }
  const list = document.createElement("ul");
  list.className = "v4-projection-side-panel__list";
  for (const event of events.slice(0, PANEL_ROW4_HANDOVER_PREVIEW_COUNT)) {
    list.append(buildHandoverRow(event));
  }
  return list;
}

function buildCompareSummariesRow(
  result: RuntimeProjectionResult,
  baseline: Wave1Baseline | null
): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "4";
  row.dataset.compare = PRE_WAVE2_COMPARE_MODE;

  const currentEvents = pickRow4HandoverEvents(result.handoverEvents);
  const currentChildren: Node[] = [
    buildCompareStatBlock(
      "Events",
      String(result.handoverEvents.length),
      result.handoverEvents.length - (baseline?.linkSelectionEventCount ?? 0),
      formatCount
    ),
    buildCompareEventList(currentEvents)
  ];
  const baselineChildren: Node[] = baseline
    ? [
        buildStatBlock("Events", String(baseline.linkSelectionEventCount)),
        buildCompareEventList(baseline.events)
      ]
    : [buildStatBlock("Events", "baseline unavailable")];

  const grid = document.createElement("div");
  grid.className = "v4-projection-side-panel__compare-grid";
  grid.append(
    buildComparePane("Current", "current", currentChildren),
    buildComparePane("Pre-wave-2", "pre-wave-2", baselineChildren)
  );
  row.append(grid);
  return row;
}

function buildSummariesRow(
  result: RuntimeProjectionResult,
  compareMode: CompareMode
): HTMLElement {
  if (compareMode === PRE_WAVE2_COMPARE_MODE) {
    return buildCompareSummariesRow(result, resolveWave1Baseline(result));
  }
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "4";

  // Visibility windows summary
  const visSection = document.createElement("section");
  visSection.className = "v4-projection-side-panel__summary-section";
  const visHeading = document.createElement("h3");
  visHeading.className = "v4-projection-side-panel__summary-heading";
  visHeading.textContent = "Visibility windows";
  const visCount = document.createElement("p");
  visCount.className = "v4-projection-side-panel__list-count";
  visCount.dataset.summaryCount = "visibility";
  visCount.dataset.totalCount = String(result.visibilityWindows.length);
  visCount.dataset.previewCount = String(
    Math.min(result.visibilityWindows.length, PANEL_ROW4_VISIBILITY_PREVIEW_COUNT)
  );
  visCount.textContent = formatSummaryCountLabel(
    result.visibilityWindows.length,
    PANEL_ROW4_VISIBILITY_PREVIEW_COUNT,
    "mutual window",
    "mutual windows"
  );
  visSection.append(visHeading, visCount);
  if (result.visibilityWindows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent = "No mutual visibility in this window.";
    visSection.append(empty);
  } else {
    const sorted = [...result.visibilityWindows].sort(
      (a, b) =>
        Date.parse(a.intersectionStartUtc) -
        Date.parse(b.intersectionStartUtc)
    );
    const head = sorted.slice(0, PANEL_ROW4_VISIBILITY_PREVIEW_COUNT);
    const list = document.createElement("ul");
    list.className = "v4-projection-side-panel__list";
    for (const w of head) {
      list.append(
        buildVisibilityRow(
          w.satelliteId,
          w.orbitClass,
          w.intersectionStartUtc,
          w.intersectionEndUtc
        )
      );
    }
    visSection.append(list);
  }

  // Link selection events summary
  const handoverSection = document.createElement("section");
  handoverSection.className = "v4-projection-side-panel__summary-section";
  const handoverHeading = document.createElement("h3");
  handoverHeading.className = "v4-projection-side-panel__summary-heading";
  handoverHeading.textContent = "Link selection events";
  const handoverCount = document.createElement("p");
  handoverCount.className = "v4-projection-side-panel__list-count";
  handoverCount.dataset.summaryCount = "handover";
  handoverCount.dataset.totalCount = String(result.handoverEvents.length);
  handoverCount.dataset.previewCount = String(
    pickRow4HandoverEvents(result.handoverEvents).length
  );
  handoverCount.textContent = formatSummaryCountLabel(
    result.handoverEvents.length,
    PANEL_ROW4_HANDOVER_PREVIEW_COUNT,
    "event",
    "events"
  );
  handoverSection.append(handoverHeading, handoverCount);
  if (result.handoverEvents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "v4-projection-side-panel__empty";
    empty.textContent =
      `No handover events triggered by the ${result.dataCompleteness.policyDisclosure.activePolicyId} policy in this window.`;
    handoverSection.append(empty);
  } else {
    const head = pickRow4HandoverEvents(result.handoverEvents);
    const list = document.createElement("ul");
    list.className = "v4-projection-side-panel__list";
    for (const event of head) {
      list.append(buildHandoverRow(event));
    }
    handoverSection.append(list);
  }

  row.append(visSection, handoverSection);
  return row;
}

function maybeSetConciseDatasetValue(
  element: HTMLElement,
  key: string,
  value: string | null
): void {
  if (value && value.length <= 180) {
    element.dataset[key] = value;
  }
}

function datasetScalar(value: string | number | boolean | null): string {
  return value === null ? "" : String(value);
}

function buildFooterRow(result: RuntimeProjectionResult): HTMLElement {
  const row = document.createElement("section");
  row.className = "v4-projection-side-panel__row";
  row.dataset.row = "6";
  const footer = document.createElement("p");
  footer.className = "v4-projection-side-panel__footer";
  const tierAttribution = result.dataCompleteness.pairSourceAttribution;
  footer.dataset.stationPrecisionDisclosure = "true";
  footer.dataset.sourceTier = result.truthBoundary.sourceTier;
  footer.dataset.evidenceKind = tierAttribution.evidenceKind;
  footer.dataset.badgeLabel = tierAttribution.badgeLabel;
  for (const [index, station] of result.dataCompleteness.stationPrecision.entries()) {
    const slot = index === 0 ? "A" : "B";
    footer.dataset[`station${slot}Id`] = station.stationId;
    footer.dataset[`station${slot}Precision`] = station.disclosurePrecision;
    footer.dataset[`station${slot}RenderPositionIsSourceTruth`] = String(
      station.renderPositionIsSourceTruth
    );
    footer.dataset[`station${slot}CoordinateUse`] = station.coordinateUse;
    footer.dataset[`station${slot}ElevationM`] = String(station.elevationM);
    footer.dataset[`station${slot}ElevationSourceId`] =
      station.elevationSourceId;
    footer.dataset[`station${slot}ElevationSourcePath`] =
      station.elevationSourcePath;
    footer.dataset[`station${slot}ElevationSourceNote`] =
      station.elevationSourceNote;
    footer.dataset[`station${slot}ElevationSourceAccessedUtc`] =
      datasetScalar(station.elevationSourceAccessedUtc);
    footer.dataset[`station${slot}ElevationSourceKind`] =
      station.elevationSourceKind;
    footer.dataset[`station${slot}ElevationDatasetId`] =
      station.elevationDatasetId;
    footer.dataset[`station${slot}ElevationDatasetVersion`] =
      datasetScalar(station.elevationDatasetVersion);
    footer.dataset[`station${slot}ElevationDatasetResolutionM`] =
      datasetScalar(station.elevationDatasetResolutionM);
    footer.dataset[`station${slot}ElevationVerticalDatum`] =
      datasetScalar(station.elevationVerticalDatum);
    footer.dataset[`station${slot}ElevationTileId`] =
      datasetScalar(station.elevationTileId);
    footer.dataset[`station${slot}ElevationCellId`] =
      datasetScalar(station.elevationCellId);
    footer.dataset[`station${slot}ElevationSampleLat`] =
      datasetScalar(station.elevationSampleLat);
    footer.dataset[`station${slot}ElevationSampleLon`] =
      datasetScalar(station.elevationSampleLon);
    footer.dataset[`station${slot}ElevationSamplingMethod`] =
      station.elevationSamplingMethod;
    footer.dataset[`station${slot}ElevationSampledAtUtc`] =
      datasetScalar(station.elevationSampledAtUtc);
    footer.dataset[`station${slot}ElevationCacheGeneratedUtc`] =
      datasetScalar(station.elevationCacheGeneratedUtc);
    footer.dataset[`station${slot}ElevationLicenseId`] =
      station.elevationLicenseId;
    footer.dataset[`station${slot}ElevationLicenseUrl`] =
      datasetScalar(station.elevationLicenseUrl);
    footer.dataset[`station${slot}ElevationCitation`] =
      station.elevationCitation;
    footer.dataset[`station${slot}ElevationProvenanceStatus`] =
      station.elevationProvenanceStatus;
    footer.dataset[`station${slot}ElevationNonClaim`] =
      station.elevationNonClaim;
    footer.dataset[`station${slot}TerrainMaskDeg`] = String(
      station.terrainMaskDeg
    );
    footer.dataset[`station${slot}TerrainMaskSourceId`] =
      station.terrainMaskSourceId;
    footer.dataset[`station${slot}TerrainMaskIsDefault`] = String(
      station.terrainMaskIsDefault
    );
    footer.dataset[`station${slot}EffectiveElevationThresholdDeg`] = String(
      station.effectiveElevationThresholdDeg
    );
    footer.dataset[`station${slot}CoordinateSourceAuthority`] =
      station.coordinateSourceAuthority;
    maybeSetConciseDatasetValue(
      footer,
      `station${slot}CoordinateSourceUrl`,
      station.coordinateSourceUrl
    );
    maybeSetConciseDatasetValue(
      footer,
      `station${slot}CoordinateSourceNote`,
      station.coordinateSourceNote
    );
  }
  footer.textContent = `${result.truthBoundary.precisionLabel} · ${resolveSourceBadgeLabel(tierAttribution)}`;
  row.append(footer);
  return row;
}

function buildEvidenceEntryRow(
  result: RuntimeProjectionResult,
  evidenceDrawer: HTMLElement
): HTMLElement {
  const row = buildFooterRow(result);
  const actions = document.createElement("div");
  actions.className = "v4-projection-side-panel__evidence-actions";

  const evidenceButton = document.createElement("button");
  evidenceButton.type = "button";
  evidenceButton.className = "v4-projection-side-panel__evidence-button";
  evidenceButton.textContent = "Details & sources";
  evidenceButton.setAttribute("aria-label", "Open details and sources");
  evidenceButton.setAttribute("aria-controls", evidenceDrawer.id);
  evidenceButton.setAttribute("aria-expanded", "false");
  evidenceButton.addEventListener("click", () => {
    const opening = evidenceDrawer.hidden;
    evidenceDrawer.hidden = !opening;
    evidenceDrawer.dataset.open = opening ? "true" : "false";
    evidenceButton.setAttribute("aria-expanded", opening ? "true" : "false");
    evidenceButton.textContent = opening ? "Hide details" : "Details & sources";
    evidenceButton.setAttribute(
      "aria-label",
      opening ? "Close details and sources" : "Open details and sources"
    );
    if (opening) {
      const closeButton = evidenceDrawer.querySelector<HTMLButtonElement>(
        ".v4-projection-side-panel__evidence-close"
      );
      closeButton?.focus();
    }
  });

  const reportButton = buildDownloadEvidenceReportButton(result, "Report");
  actions.append(evidenceButton, reportButton);
  row.prepend(actions);
  return row;
}

interface RenderResultOptions {
  readonly rainRateMmPerHour: number;
  readonly clearSky: RuntimeProjectionResult;
  readonly rainControl: RainControlElements;
  readonly durationMinutes: number;
  readonly compareMode: CompareMode;
  readonly viewer?: Viewer;
  readonly onDurationChange: (durationMinutes: number) => void;
}

function renderResult(
  root: HTMLElement,
  pair: V4ResolvedStationPair,
  result: RuntimeProjectionResult,
  options: RenderResultOptions
): void {
  const {
    rainRateMmPerHour,
    clearSky,
    rainControl,
    durationMinutes,
    compareMode,
    viewer,
    onDurationChange
  } = options;

  // Preserve slider focus across re-renders: the rain control node is reused,
  // not recreated, so the user can keep dragging while the panel recomputes.
  const sliderWasFocused = document.activeElement === rainControl.slider;

  removeEvidenceDrawer(root.ownerDocument);
  root.replaceChildren();
  const tierAttribution = result.dataCompleteness.pairSourceAttribution;
  const isEmptyResult =
    result.visibilityWindows.length === 0 &&
    result.communicationStats.totalCommunicatingMs <= 0;
  root.dataset.state = isEmptyResult ? "empty-result" : "ready";
  root.dataset.sourceTier = result.truthBoundary.sourceTier;
  root.dataset.sourceEvidenceKind = tierAttribution.evidenceKind;
  root.dataset.sourceBadgeLabel = tierAttribution.badgeLabel;
  root.dataset.rainRateMmPerHour = String(rainRateMmPerHour);
  root.dataset.dataCompletenessRouteMode = result.dataCompleteness.routeMode;
  root.dataset.emptyReasonCode = result.dataCompleteness.emptyReasonCode ?? "";
  root.dataset.activePolicyId =
    result.dataCompleteness.policyDisclosure.activePolicyId;
  root.dataset.compareMode = compareMode ?? "";

  syncTleTelemetryChip(result);
  setRainControlCaption(rainControl, result, rainRateMmPerHour);
  const viewModel = buildSelectedPairPanelViewModel(
    pair,
    result,
    durationMinutes
  );
  const evidenceDrawer = buildDisclosuresRow(result, rainRateMmPerHour);

  if (compareMode === PRE_WAVE2_COMPARE_MODE) {
    root.append(
      buildHeaderRow(result, viewModel),
      buildRainControlRow(rainControl),
      buildFlatStatsRow(result, compareMode),
      buildReplayControlRow(root.ownerDocument),
      buildSummariesRow(result, compareMode),
      buildEvidenceEntryRow(result, evidenceDrawer)
    );
  } else {
    root.append(
      buildHeaderRow(result, viewModel),
      buildOutcomeRow(viewModel),
      buildReplayControlRow(root.ownerDocument),
      buildTimelineRow(viewModel, onDurationChange),
      buildDecisionCardsRow(viewModel),
      buildRainImpactMainRow(rainControl, result, rainRateMmPerHour, clearSky),
      buildEvidenceEntryRow(result, evidenceDrawer)
    );
  }

  root.ownerDocument.body.appendChild(evidenceDrawer);
  syncTimelineCurrentMarkers(root, viewer);

  if (sliderWasFocused) {
    rainControl.slider.focus();
  }
}

export interface V4ProjectionSidePanelInput {
  readonly resolvedPair: V4ResolvedStationPair | null;
  readonly viewer?: Viewer;
}

export interface V4ProjectionSidePanelHandle {
  /**
   * Subscribe to the latest runtime projection result the panel has rendered.
   * Fires immediately with the current result (if any) and again on each
   * recompute. Returns an unsubscribe function. Used by the replay event
   * pill (§4.3.1) to observe `handoverEvents` without re-running compute.
   */
  subscribeRuntimeResult(
    listener: (result: RuntimeProjectionResult | null) => void
  ): () => void;
  dispose(): void;
}

export function mountV4ProjectionSidePanel(
  viewerContainer: HTMLElement,
  input: V4ProjectionSidePanelInput
): V4ProjectionSidePanelHandle | null {
  if (!input.resolvedPair) {
    return null;
  }
  const pair = input.resolvedPair;
  const policyId = resolveProjectionPolicyId();
  const compareMode = resolveProjectionCompareMode();

  const root = createPanelShell();
  const disposeWheelScroll = bindPanelWheelScroll();
  const disposeTimelineCurrentMarkerSync = bindTimelineCurrentMarkerSync(
    root,
    input.viewer
  );
  viewerContainer.appendChild(root);

  let disposed = false;
  renderLoading(root, pair);

  // Inputs cached after the first load so the projection can re-run without
  // re-fetching TLE fixtures while the worker keeps compute off the UI thread.
  const projectionClient = createRuntimeProjectionWorkerClient();
  let tleRecords: ReadonlyArray<RuntimeOrbitRecord> | null = null;
  let tleParseStats: ReturnType<typeof buildRuntimeTleSourceParseStats> | null = null;
  let timeWindow: { startUtc: string; endUtc: string } | null = null;
  let durationMinutes = DEFAULT_DEMO_PROJECTION_DURATION_MINUTES;
  let clearSkyResult: RuntimeProjectionResult | null = null;
  let rainControl: RainControlElements | null = null;
  let currentRainRate = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let computeRequestSeq = 0;
  let latestResult: RuntimeProjectionResult | null = null;
  const runtimeResultListeners = new Set<
    (result: RuntimeProjectionResult | null) => void
  >();

  function publishRuntimeResult(result: RuntimeProjectionResult | null): void {
    latestResult = result;
    for (const listener of runtimeResultListeners) {
      try {
        listener(result);
      } catch {
        // Listener errors must not break the panel render loop.
      }
    }
  }

  async function recompute(rainRateMmPerHour: number): Promise<void> {
    if (disposed || !tleRecords || !timeWindow || !clearSkyResult || !rainControl) {
      return;
    }
    const requestSeq = ++computeRequestSeq;
    currentRainRate = rainRateMmPerHour;
    try {
      const result = await projectionClient.compute({
        stationA: pair.stationA,
        stationB: pair.stationB,
        timeWindow,
        tleRecords,
        tleParseStats: tleParseStats ?? undefined,
        rainRateMmPerHour,
        policyId
      });
      if (disposed || requestSeq !== computeRequestSeq || !rainControl) {
        return;
      }
      if (rainRateMmPerHour <= 0) {
        clearSkyResult = result;
      }
      renderResult(root, pair, result, {
        rainRateMmPerHour,
        clearSky: clearSkyResult,
        rainControl,
        durationMinutes,
        compareMode,
        viewer: input.viewer,
        onDurationChange: setProjectionDurationMinutes
      });
      publishRuntimeResult(result);
    } catch (error) {
      if (disposed || requestSeq !== computeRequestSeq) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown failure while computing runtime projection.";
      renderError(root, message);
    }
  }

  async function setProjectionDurationMinutes(
    nextDurationMinutes: number
  ): Promise<void> {
    if (disposed || !tleRecords || !timeWindow || !rainControl) {
      return;
    }
    const normalizedDurationMinutes = clampDurationMinutes(nextDurationMinutes);
    if (normalizedDurationMinutes === durationMinutes) {
      return;
    }

    const nextTimeWindow = buildDefaultTimeWindow(
      timeWindow.startUtc,
      normalizedDurationMinutes
    );
    durationMinutes = normalizedDurationMinutes;
    timeWindow = nextTimeWindow;
    syncDurationMinutesParam(normalizedDurationMinutes);
    root.dataset.state = "loading";

    const requestSeq = ++computeRequestSeq;
    try {
      const nextClearSkyResult = await projectionClient.compute({
        stationA: pair.stationA,
        stationB: pair.stationB,
        timeWindow: nextTimeWindow,
        tleRecords,
        tleParseStats: tleParseStats ?? undefined,
        rainRateMmPerHour: 0,
        policyId
      });
      if (disposed || requestSeq !== computeRequestSeq || !rainControl) {
        return;
      }
      clearSkyResult = nextClearSkyResult;
      const result =
        currentRainRate > 0
          ? await projectionClient.compute({
              stationA: pair.stationA,
              stationB: pair.stationB,
              timeWindow: nextTimeWindow,
              tleRecords,
              tleParseStats: tleParseStats ?? undefined,
              rainRateMmPerHour: currentRainRate,
              policyId
            })
          : nextClearSkyResult;
      if (disposed || requestSeq !== computeRequestSeq || !rainControl) {
        return;
      }
      renderResult(root, pair, result, {
        rainRateMmPerHour: currentRainRate,
        clearSky: nextClearSkyResult,
        rainControl,
        durationMinutes,
        compareMode,
        viewer: input.viewer,
        onDurationChange: setProjectionDurationMinutes
      });
      publishRuntimeResult(result);
    } catch (error) {
      if (disposed || requestSeq !== computeRequestSeq) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown failure while computing runtime projection.";
      renderError(root, message);
    }
  }

  function onSliderInput(rainRateMmPerHour: number): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void recompute(rainRateMmPerHour);
    }, RAIN_RECOMPUTE_DEBOUNCE_MS);
  }

  void (async () => {
    try {
      const sources = await loadDefaultTleSources();
      if (disposed) {
        return;
      }
      tleRecords = parseRuntimeOrbitSources(sources);
      tleParseStats = buildRuntimeTleSourceParseStats(sources);
      const resolved = resolveProjectionTimeWindowAndDuration();
      timeWindow = resolved.window;
      durationMinutes = resolved.durationMinutes;
      const requestSeq = ++computeRequestSeq;
      clearSkyResult = await projectionClient.compute({
        stationA: pair.stationA,
        stationB: pair.stationB,
        timeWindow,
        tleRecords,
        tleParseStats,
        rainRateMmPerHour: 0,
        policyId
      });
      if (disposed || requestSeq !== computeRequestSeq) {
        return;
      }
      rainControl = buildRainControl(currentRainRate, onSliderInput);
      renderResult(root, pair, clearSkyResult, {
        rainRateMmPerHour: currentRainRate,
        clearSky: clearSkyResult,
        rainControl,
        durationMinutes,
        compareMode,
        viewer: input.viewer,
        onDurationChange: setProjectionDurationMinutes
      });
      publishRuntimeResult(clearSkyResult);
    } catch (error) {
      if (disposed) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown failure while loading TLE fixtures.";
      renderError(root, message);
    }
  })();

  return {
    subscribeRuntimeResult(
      listener: (result: RuntimeProjectionResult | null) => void
    ): () => void {
      runtimeResultListeners.add(listener);
      // Fire immediately with the current result so the subscriber does
      // not have to wait for the next recompute to receive its first
      // observation. Mirrors the pattern in selection-store.subscribe.
      try {
        listener(latestResult);
      } catch {
        // Subscriber errors must not propagate into the mount return.
      }
      return () => {
        runtimeResultListeners.delete(listener);
      };
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      disposed = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      runtimeResultListeners.clear();
      projectionClient.dispose();
      disposeWheelScroll();
      disposeTimelineCurrentMarkerSync();
      removeEvidenceDrawer(root.ownerDocument);
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
