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
  type LinkBudgetMetricOptions,
  type RuntimeHandoverPolicyId,
  type RuntimeProjectionResult
} from "./runtime-projection";
import {
  buildOpenEvidenceReportButton,
  buildDownloadCsvButton
} from "./v4-projection-report-actions";
import { buildTrajectoryProvenanceControl } from "./trajectory-provenance-popup";
import {
  buildPolicyDisclosure,
  buildSourceConfidenceDisclosure,
  buildHiddenMachineEvidenceBlock
} from "./v4-projection-side-panel-disclosures";

import { createRuntimeProjectionWorkerClient } from "./runtime-projection-worker-client";
import { buildReplayControlRow } from "./v4-projection-replay-controls";
import { buildCsvHelpControl } from "./v4-projection-csv-help";
import { buildEstnetSummaryCard } from "./estnet-trace-panel-section";
import {
  mountEstnetTraceDock,
  type EstnetTraceDockHandle
} from "./estnet-trace-dock";
import { createCesiumReplayClock } from "../time/cesium-replay-clock";
import {
  isEstnetTraceDisplayEnabled,
  subscribeEstnetTraceDisplay
} from "./estnet-display-mode";
import {
  WAVE1_BASELINE_BY_PAIR,
  type Wave1Baseline
} from "./v4-projection-wave1-baselines";
import { syncTleTelemetryChip } from "./chrome-telemetry";
import {
  clampPercent,
  formatCount,
  formatCountLabel,
  formatDurationMs,
  formatIsoSecond,
  formatIsoShort,
  formatMbpsValue,
  formatSatelliteShort,
  formatSignedPercent,
  formatSpeedMbps,
  formatStationPanelName,
  formatSummaryCountLabel,
  formatUtcClock,
  formatUtcClockWithSeconds,
  formatUtcMidpointClock,
  getLocalTimezoneLabel,
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
let rainHelpIdCounter = 0;

const RAIN_RATE_MIN_MM_PER_HOUR = 0;
const RAIN_RATE_MAX_MM_PER_HOUR = 100;
const RAIN_RATE_STEP_MM_PER_HOUR = 5;
const RAIN_RECOMPUTE_DEBOUNCE_MS = 150;



function createPanelShell(): HTMLElement {
  const root = document.createElement("aside");
  root.className = "v4-projection-side-panel";
  root.dataset.v4ProjectionSidePanel = "true";
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Runtime projection of the selected ground-station pair");
  return root;
}

// (removeEvidenceDrawer was removed)

function bindPanelWheelScroll(): () => void {
  return () => undefined;
}

function renderLoading(root: HTMLElement, pair: V4ResolvedStationPair): void {
  root.replaceChildren();
  root.dataset.state = "loading";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  title.textContent = "Link Projection";
  title.title = `${pair.stationA.name} ↔ ${pair.stationB.name}`;

  const status = document.createElement("p");
  status.className = "v4-projection-side-panel__status";
  status.textContent = "Loading TLE fixtures and computing visibility windows…";

  root.append(title, status);
}

function renderError(root: HTMLElement, message: string): void {
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

type PanelHandoverReasonKind =
  RuntimeProjectionResult["handoverEvents"][number]["reasonKind"];

const HANDOVER_REASON_LABELS: Readonly<Record<string, string>> = {
  "current-link-unavailable": "Current link unavailable",
  "better-candidate-available": "Better candidate available",
  "policy-tie-break": "Policy tie-break",
  "cross-orbit-migration": "Cross-orbit migration"
};

function formatPanelReasonLabel(
  reasonKind: PanelHandoverReasonKind,
  fromSatelliteId: string | null
): string {
  if (fromSatelliteId === null) {
    return "Initial acquisition";
  }
  return HANDOVER_REASON_LABELS[reasonKind] ?? reasonKind.replace(/-/g, " ");
}

function formatPanelReasonTitle(
  reasonKind: PanelHandoverReasonKind,
  fromSatelliteId: string | null
): string | undefined {
  if (fromSatelliteId !== null && reasonKind === "cross-orbit-migration") {
    return "Cross-orbit migration (V-MO1)";
  }
  return undefined;
}

interface PanelDecisionCard {
  readonly label: string;
  readonly timeLabel: string;
  readonly primary: string;
  readonly secondary: string;
  readonly modifier: string | null;
  readonly title?: string;
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

function isPrimaryProjectionDuration(durationMinutes: number): boolean {
  return durationMinutes === DEFAULT_DEMO_PROJECTION_DURATION_MINUTES;
}

function formatTimelineModeTitle(viewModel: SelectedPairPanelViewModel): string {
  return isPrimaryProjectionDuration(viewModel.durationMinutes)
    ? `${viewModel.durationLabel} Link map`
    : `${viewModel.durationLabel} Lookahead`;
}

function formatTimelineModeCaption(viewModel: SelectedPairPanelViewModel): string {
  return isPrimaryProjectionDuration(viewModel.durationMinutes)
    ? `Primary window · ${viewModel.timelineSummary}`
    : `Diagnostic lookahead · ${viewModel.timelineSummary}`;
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

// Opt-in only: the persisted display mode (toolbar toggle, seeded once from the
// legacy `?estnet=1` deep link) reveals the ESTNeT packet-trace disclosure
// section. Default-off, so absent any opt-in nothing is appended and the
// accepted 19/19 default surface is untouched. See [[estnet-display-mode]].
function resolveEstnetTraceOptIn(): boolean {
  return isEstnetTraceDisplayEnabled();
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
  if (/^\d+m$/.test(value)) {
    const mins = value.slice(0, -1);
    valueEl.innerHTML = `${mins}<span style="font-size:0; opacity:0; position:absolute;">m</span> min`;
  } else if (/^\d+m \d+s$/.test(value)) {
    const match = value.match(/^(\d+)m (\d+)s$/);
    if (match) {
      valueEl.innerHTML = `${match[1]}<span style="font-size:0; opacity:0; position:absolute;">m</span> min ${match[2]}s`;
    } else {
      valueEl.textContent = value;
    }
  } else {
    valueEl.textContent = value;
  }
  block.append(labelEl, valueEl);
  return block;
}

function resolveWave1Baseline(result: RuntimeProjectionResult): Wave1Baseline | null {
  return (
    WAVE1_BASELINE_BY_PAIR.get(
      [result.pair.stationA.id, result.pair.stationB.id].sort().join("|")
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
        label: `${formatUtcClockWithSeconds(event.handoverAtUtc)} ${getLocalTimezoneLabel(event.handoverAtUtc)} · ${formatPanelReasonLabel(event.reasonKind, event.fromSatelliteId)}`
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
    const reasonLabel = formatPanelReasonLabel(
      event.reasonKind,
      event.fromSatelliteId
    );
    const reasonTitle = formatPanelReasonTitle(
      event.reasonKind,
      event.fromSatelliteId
    );
    cards.push({
      label,
      timeLabel: `${formatUtcClockWithSeconds(event.handoverAtUtc)} ${getLocalTimezoneLabel(event.handoverAtUtc)}`,
      primary:
        event.fromSatelliteId === null
          ? `Use ${toLabel}`
          : `${fromLabel} → ${toLabel}`,
      secondary: `${resolveSatelliteOrbitClass(result, event.toSatelliteId)} · ${reasonLabel}`,
      modifier,
      title: reasonTitle
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
        timeLabel: `${formatUtcClockWithSeconds(firstWindow.intersectionStartUtc)} ${getLocalTimezoneLabel(firstWindow.intersectionStartUtc)}`,
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
  const windowLabel = `${formatUtcClock(result.timeWindow.startUtc)}-${formatUtcClock(result.timeWindow.endUtc)} ${getLocalTimezoneLabel(result.timeWindow.startUtc)} · ${durationLabel}`;
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

function computeProjectionPairMidpointHeightAboveSeaKm(
  result: RuntimeProjectionResult
): number {
  return (result.pair.stationA.elevationM + result.pair.stationB.elevationM) / 2000;
}

/**
 * WS-F display path: price the per-orbit link budget at the route's actual
 * representative geometry (SGP4-propagated satellite radius + instantaneous
 * per-station elevation + per-station rain endpoints) instead of the fixed
 * 35 deg / nominal-altitude / pair-midpoint-latitude placeholder. Falls back to
 * the pair-midpoint height when no propagated representative budget is available
 * for that orbit (e.g. no mutual-visibility window).
 */
function resolveRouteGeometryLinkBudgetOptions(
  result: RuntimeProjectionResult,
  orbit: OrbitClass,
  fallbackStationHeightAboveSeaKm: number
): LinkBudgetMetricOptions {
  const representative = result.representativeLinkBudgetByOrbit[orbit];
  if (
    !representative ||
    representative.geometrySource !== "sgp4-propagated-representative"
  ) {
    return { stationHeightAboveSeaKm: fallbackStationHeightAboveSeaKm };
  }
  return {
    representativeElevationDeg: representative.representativeElevationDeg,
    satelliteRadiusKm: representative.satelliteRadiusKm,
    stationHeightAboveSeaKm: fallbackStationHeightAboveSeaKm,
    rainEndpoints: representative.rainEndpoints.map((endpoint) => ({
      stationLabel: endpoint.stationLabel,
      latitudeDeg: endpoint.latitudeDeg,
      heightAboveSeaKm: endpoint.heightAboveSeaKm,
      elevationDeg: endpoint.elevationDeg
    }))
  };
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
    const routeGeometry = resolveRouteGeometryLinkBudgetOptions(
      result,
      orbit,
      stationHeightAboveSeaKm
    );
    const clear = computeLinkBudgetMetricsForOrbit(orbit, {
      ...routeGeometry,
      rainRateMmPerHour: 0
    });
    const wet = computeLinkBudgetMetricsForOrbit(orbit, {
      ...routeGeometry,
      rainRateMmPerHour
    });
    const dropFraction =
      clear.networkSpeedMbps > 0
        ? (clear.networkSpeedMbps - wet.networkSpeedMbps) / clear.networkSpeedMbps
        : 0;
    const rainTransparent =
      Math.abs(wet.networkSpeedMbps - clear.networkSpeedMbps) < 0.01;
    const clearSpeedLabel = formatSpeedMbps(clear.networkSpeedMbps);
    const wetSpeedLabel = formatSpeedMbps(wet.networkSpeedMbps);
    const clearSpeedValueLabel = clearSpeedLabel.replace(/ Mbps$/, "");

    const li = document.createElement("li");
    li.className = "v4-projection-side-panel__list-item";
    if (!rainTransparent) {
      li.dataset.modifier = "rain-degraded";
    }

    const primary = document.createElement("span");
    primary.className = "v4-projection-side-panel__list-primary";
    primary.textContent = rainTransparent
      ? `${orbit} ${clearSpeedLabel}`
      : `${orbit} ${clearSpeedValueLabel} → ${wetSpeedLabel}`;

    li.append(primary);
    if (!rainTransparent) {
      const secondary = document.createElement("span");
      secondary.className = "v4-projection-side-panel__list-secondary";
      
      const percentSpan = document.createElement("strong");
      percentSpan.className = "v4-projection-side-panel__list-percent";
      percentSpan.textContent = formatSignedPercent(-dropFraction);
      
      const detailsSpan = document.createElement("span");
      detailsSpan.textContent = ` · jitter ${clear.jitterMs.toFixed(1)} → ${wet.jitterMs.toFixed(1)} ms`;
      
      secondary.append(percentSpan, detailsSpan);
      li.append(secondary);
    }
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

  const titleRow = document.createElement("div");
  titleRow.className = "v4-projection-side-panel__rain-title-row";

  const label = document.createElement("label");
  label.className = "v4-projection-side-panel__rain-label";
  label.id = "v4-rain-rate-label";
  label.textContent = "Rain rate";

  rainHelpIdCounter += 1;
  const helpPopoverId = `v4-rain-rate-help-${rainHelpIdCounter}`;
  const helpTrigger = document.createElement("button");
  helpTrigger.type = "button";
  helpTrigger.className = "v4-projection-side-panel__rain-help-trigger";
  helpTrigger.setAttribute("aria-label", "開啟雨衰計算說明");
  helpTrigger.setAttribute("aria-controls", helpPopoverId);
  helpTrigger.setAttribute("aria-expanded", "false");
  helpTrigger.title = "雨衰計算說明";
  helpTrigger.textContent = "?";

  const helpPopover = document.createElement("div");
  helpPopover.id = helpPopoverId;
  helpPopover.className = "v4-projection-side-panel__rain-help-popover";
  helpPopover.hidden = true;
  helpPopover.setAttribute("role", "dialog");
  helpPopover.setAttribute("aria-label", "雨衰計算說明");
  helpPopover.innerHTML = `
    <header class="v4-projection-side-panel__rain-help-header">
      <h4>Rain attenuation model</h4>
      <button type="button" class="v4-projection-side-panel__rain-help-close" aria-label="關閉">&times;</button>
    </header>
    <div class="v4-projection-side-panel__rain-help-body">
      <p>
        這個滑桿把輸入雨率 R(mm/h) 代入 ITU-R P.838-3 的
        <span class="v4-projection-side-panel__math-inline" aria-label="gamma R equals k R to the alpha">
          <span>&gamma;<sub>R</sub></span><span>=</span><span>kR<sup>&alpha;</sup></span>
        </span>，先得到每公里雨衰 dB/km；k 和 alpha 由 carrier frequency 與 polarization 決定。
      </p>
      <p>
        接著依 ITU-R P.618-14 Earth-space slant-path 思路，用雨層高度、地面站高度與仰角估算
        effective slant path，再以
        <span class="v4-projection-side-panel__math-inline" aria-label="rain attenuation equals gamma R times slant path">
          <span>A<sub>rain</sub></span><span>=</span><span>&gamma;<sub>R</sub>L<sub>s</sub></span>
        </span> 得到雨衰 dB。
      </p>
      <div class="v4-projection-side-panel__rain-help-formulas" aria-label="Rain attenuation formulas">
        <span class="v4-projection-side-panel__rain-help-formula-label">Formula</span>
        <div class="v4-projection-side-panel__math-display" role="img" aria-label="gamma R equals k R to the alpha">
          <span>&gamma;<sub>R</sub></span>
          <span>=</span>
          <span>kR<sup>&alpha;</sup></span>
        </div>
        <div class="v4-projection-side-panel__math-display v4-projection-side-panel__math-display--cases" role="img" aria-label="slant path cases">
          <span>L<sub>s</sub> =</span>
          <span class="v4-projection-side-panel__math-case-brace">{</span>
          <span class="v4-projection-side-panel__math-cases">
            <span class="v4-projection-side-panel__math-case-row">
              <span class="v4-projection-side-panel__math-frac">
                <span>h<sub>R</sub> - h<sub>s</sub></span>
                <span>sin&nbsp;&theta;</span>
              </span>
              <span class="v4-projection-side-panel__math-condition">&theta; &ge; 5&deg;</span>
            </span>
            <span class="v4-projection-side-panel__math-case-row">
              <span class="v4-projection-side-panel__math-frac">
                <span>2(h<sub>R</sub> - h<sub>s</sub>)</span>
                <span>
                  &radic;(sin<sup>2</sup>&theta; +
                  <span class="v4-projection-side-panel__math-frac v4-projection-side-panel__math-frac--inline">
                    <span>2(h<sub>R</sub> - h<sub>s</sub>)</span>
                    <span>R<sub>e</sub></span>
                  </span>) + sin&nbsp;&theta;
                </span>
              </span>
              <span class="v4-projection-side-panel__math-condition">&theta; &lt; 5&deg;</span>
            </span>
          </span>
        </div>
        <div class="v4-projection-side-panel__math-display" role="img" aria-label="rain attenuation equals gamma R times slant path">
          <span>A<sub>rain</sub></span>
          <span>=</span>
          <span>&gamma;<sub>R</sub>L<sub>s</sub></span>
        </div>
      </div>
      <p>
        P.618 的完整輸入包含 R0.01、earth-station height、elevation angle、latitude、
        frequency 與 effective Earth radius。這個畫面把 slider 的 R 當作情境雨率，
        使用配對地面站的中點高度、代表仰角、carrier frequency，以及 Re=8500 km 的
        effective Earth radius 來做互動估算。
      </p>
      <p>
        本專案採用互動式情境模型：Rain rate 是使用者控制的即時假設值，不是完整 P.618
        長期可用度流程中的 R0.01 地區雨率、P.837 雨機率資料或實測站點降雨紀錄。
      </p>
      <p>
        目前 MEO 沒有變化，是因為本專案把 MEO 代表 carrier 設為 L-band 1.5 GHz，
        且目前只對 Ku/Ka 範圍的 10-30 GHz 套用雨衰模型；LEO 使用 Ku 12 GHz，
        GEO 使用 Ka 20 GHz，所以滑桿主要影響 LEO/GEO。
      </p>
      <p>
        這項 MEO 結果只描述本專案的代表頻段設定，不代表所有 MEO 系統的雨衰行為。
        使用 Ka/Q/V band、低仰角、強降雨或較小 fade margin 的 MEO 鏈路仍可能出現
        rain fade；L-band/S-band 鏈路通常更容易由電離層、閃爍、遮蔽與干擾等因素主導。
      </p>
      <p class="v4-projection-side-panel__rain-help-source">
        Sources: ITU-R P.618-14; ITU-R P.838-3. Runtime scope: Ku/Ka project model, not measured link assurance.
      </p>
    </div>
  `;

  const valueEl = document.createElement("span");
  valueEl.className = "v4-projection-side-panel__rain-value";
  valueEl.textContent = `${rainRateMmPerHour} mm/h`;

  titleRow.append(label, helpTrigger);
  head.append(titleRow, valueEl);

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

  control.append(head, helpPopover, slider, caption);

  const returnHelpPopoverToControl = (): void => {
    if (helpPopover.parentElement !== control) {
      control.insertBefore(helpPopover, slider);
    }
  };

  const cleanupObserver = new MutationObserver(() => {
    if (!control.isConnected) {
      helpPopover.remove();
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(control.ownerDocument.body, {
    childList: true,
    subtree: true
  });

  const setHelpOpen = (open: boolean): void => {
    if (open) {
      control.ownerDocument.body.appendChild(helpPopover);
    } else {
      returnHelpPopoverToControl();
    }
    helpPopover.hidden = !open;
    helpTrigger.setAttribute("aria-expanded", String(open));
  };

  helpTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setHelpOpen(Boolean(helpPopover.hidden));
  });

  helpPopover.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  helpPopover
    .querySelector<HTMLButtonElement>(".v4-projection-side-panel__rain-help-close")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setHelpOpen(false);
      helpTrigger.focus();
    });

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

  const titleContainer = document.createElement("div");
  titleContainer.className = "v4-projection-side-panel__title-row";

  const title = document.createElement("h2");
  title.className = "v4-projection-side-panel__title";
  const titleText = "Link Projection";
  title.textContent = titleText;
  title.title = viewModel.pairLabel;

  // Create contextual help trigger and popover
  const helpTrigger = document.createElement("button");
  helpTrigger.type = "button";
  helpTrigger.className = "gs-panel-help-trigger";
  helpTrigger.setAttribute("aria-label", "開啟鏈路投影與分析指南");
  helpTrigger.title = "鏈路投影與分析指南";
  helpTrigger.innerHTML = "?";
  helpTrigger.style.position = "relative";
  helpTrigger.style.flex = "0 0 auto";
  helpTrigger.style.marginLeft = "8px";
  helpTrigger.style.marginRight = "8px";
  helpTrigger.style.alignSelf = "center";

  const helpPopover = document.createElement("div");
  helpPopover.className =
    "gs-panel-help-popover gs-link-projection-help-popover";
  helpPopover.hidden = true;
  helpPopover.setAttribute("role", "tooltip");
  helpPopover.style.position = "absolute";
  helpPopover.style.right = "calc(2.25rem + clamp(25rem, 35vw, 30rem))";
  helpPopover.style.left = "auto";
  helpPopover.style.top = "4rem";
  helpPopover.style.width =
    "min(44rem, calc(100vw - clamp(25rem, 35vw, 30rem) - 5.25rem))";
  helpPopover.style.maxWidth =
    "calc(100vw - clamp(25rem, 35vw, 30rem) - 5.25rem)";
  helpPopover.style.height = "calc(100dvh - 8.25rem)";
  helpPopover.style.maxHeight = "calc(100dvh - 8.25rem)";
  helpPopover.style.overflowY = "auto";
  helpPopover.innerHTML = `
    <header class="gs-popover-header">
      <h4>鏈路投影與分析指南</h4>
      <button type="button" class="gs-popover-close" aria-label="關閉">&times;</button>
    </header>
    <div class="gs-popover-body">
      <ol class="gs-link-projection-help-list">
        <li>
          <strong>Header · 配對、等級、時間窗</strong>
          <span>顯示目前 Station A/B 配對、Pair source tier 標章，以及投影起訖時間。Geometry only 代表此配對只用公開測站座標、公開 TLE 與幾何可見性推導鏈路，沒有 pair-level 公開聲明或營運商實測路徑可引用；它不代表實測通訊品質。</span>
        </li>
        <li>
          <strong>Available / Handovers · 可用時間與換手次數</strong>
          <span>Available 是此時間窗內兩站同時可用的累計通訊時間；Handovers 是鏈路選擇模型在維持服務時產生的換手次數。</span>
        </li>
        <li>
          <strong>Replay · 播放與倍率</strong>
          <span>Pause、Restart 與 30x/60x/120x 會控制右側投影與地球上的重播時間，方便觀察長時間窗內的換手變化。</span>
        </li>
        <li>
          <strong>Link map · 6h/12h/24h 鏈路時間軸</strong>
          <span>LEO/MEO/GEO 三條軌道列顯示各時間段的服務鏈路；垂直標記代表換手事件。6h 是主要閱讀模式，12h/24h 是活動較稀疏時的診斷 lookahead。</span>
        </li>
        <li>
          <strong>Next 6h link plan · 目前鏈路、下一次換手、跨軌事件</strong>
          <span>這三張卡把時間軸壓成可行動摘要：目前可用鏈路、接下來的換手，以及 V-MO1 相關的跨軌遷移事件。</span>
        </li>
        <li>
          <strong>Rain impact · 雨衰滑桿與容量變化</strong>
          <span>滑桿以 mm/h 模擬降雨率，依 ITU-R P.618-14 估算 Ku/Ka 鏈路雨衰；下方列出各軌道容量與 jitter 在晴空/降雨條件下的差異。</span>
        </li>
        <li>
          <strong>Handover policy · 換手規則門檻</strong>
          <span>展開後可檢查目前使用的 policy ID、仰角門檻、hysteresis、最短可見時間窗與 latency budget。這是服務層換手模型，不是 RF-native handover claim。</span>
        </li>
        <li>
          <strong>Source boundary · 來源與非主張</strong>
          <span>列出 TLE 來源摘要、標準引用與來源邊界。完整逐列資料、模型 ID、測站座標來源與 inventory rows 放在報告中。</span>
        </li>
        <li>
          <strong>Report / CSV · 證據輸出</strong>
          <span>Report 產生自包含 HTML 證據報告；CSV 匯出可被其他工具讀取的投影資料。底部 footer 只保留座標精度與 source tier 的短標籤。</span>
        </li>
      </ol>
    </div>
  `;

  const mountPopover = () => {
    if (!helpPopover.parentElement) {
      const parent = (row.parentElement && row.parentElement.parentElement) || row.ownerDocument.body;
      parent.appendChild(helpPopover);
    }
  };

  const toggleHelp = (event: Event) => {
    event.stopPropagation();
    mountPopover();
    helpPopover.hidden = !helpPopover.hidden;
  };

  const closeHelp = (event: Event) => {
    event.stopPropagation();
    helpPopover.hidden = true;
  };

  helpTrigger.addEventListener("click", toggleHelp);
  helpPopover.querySelector(".gs-popover-close")?.addEventListener("click", closeHelp);

  const doc = row.ownerDocument;
  const handleOutsideClick = (event: Event) => {
    if (!helpTrigger.contains(event.target as Node) && !helpPopover.contains(event.target as Node)) {
      helpPopover.hidden = true;
    }
  };
  doc.addEventListener("click", handleOutsideClick);

  (row as any).__disposeHelp = () => {
    doc.removeEventListener("click", handleOutsideClick);
    if (helpPopover.parentElement) {
      helpPopover.parentElement.removeChild(helpPopover);
    }
  };

  const tierAttribution = result.dataCompleteness.pairSourceAttribution;
  const tierBadge = document.createElement("span");
  tierBadge.className = "v4-projection-side-panel__tier-badge";
  tierBadge.dataset.tier = tierAttribution.sourceTier;
  tierBadge.dataset.evidenceKind = tierAttribution.evidenceKind;
  const tierLabel = viewModel.sourceBadge;
  tierBadge.textContent = tierLabel;
  tierBadge.title = tierAttribution.badgeLabel;

  titleContainer.append(title, helpTrigger, tierBadge);

  const windowLine = document.createElement("p");
  windowLine.className = "v4-projection-side-panel__window";
  const windowText = viewModel.windowLabel;
  windowLine.textContent = windowText;
  windowLine.title = `${formatIsoSecond(result.timeWindow.startUtc)} to ${formatIsoSecond(result.timeWindow.endUtc)}`;
  row.setAttribute("aria-label", `${titleText} · ${tierLabel} · ${windowText}`);

  // A1 recompute cue: the side panel is rebuilt on every fresh worker result,
  // so this element (and its one-shot pulse animation) re-mounts on each
  // recompute — visible proof that the projection is computed live, not replayed.
  const recomputeCue = document.createElement("p");
  recomputeCue.className = "v4-projection-side-panel__recompute-cue";
  recomputeCue.dataset.recomputeCue = "true";
  const recomputedAt = new Date().toTimeString().slice(0, 8);
  recomputeCue.textContent = `↻ recomputed live ${recomputedAt}`;
  recomputeCue.title = "Recomputed live in the projection worker on this input.";

  row.append(
    titleContainer,
    buildPlainTextSeparator(),
    windowLine,
    recomputeCue
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
    `Available (modeled) ${viewModel.availabilityLabel}; handovers ${viewModel.handoverCountLabel}`
  );

  const grid = document.createElement("div");
  grid.className = "v4-projection-side-panel__outcome-grid";
  const available = buildStatBlock("Available (modeled)", viewModel.availabilityLabel);
  available.classList.add("v4-projection-side-panel__stat--hero");
  const handovers = buildStatBlock("Handovers", viewModel.handoverCountLabel);
  grid.append(available, handovers);
  row.append(grid);
  return row;
}

function buildDurationPresetControl(
  activeDurationMinutes: number,
  onDurationChange: (durationMinutes: number) => void
): HTMLElement {
  const control = document.createElement("div");
  control.className = "v4-projection-side-panel__duration-presets";
  control.dataset.durationControl = "link-map-lookahead";
  control.setAttribute("role", "group");
  control.setAttribute(
    "aria-label",
    "Link map window, with six hours as the primary mode and longer diagnostic lookahead"
  );

  for (const durationMinutes of DEMO_PROJECTION_DURATION_PRESETS_MINUTES) {
    const isPrimaryDuration = isPrimaryProjectionDuration(durationMinutes);
    const durationLabel = formatDurationPresetLabel(durationMinutes);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v4-projection-side-panel__duration-preset";
    button.dataset.durationRole = isPrimaryDuration ? "primary" : "lookahead";
    button.textContent = durationLabel;
    button.title = isPrimaryDuration
      ? "Primary six-hour link map"
      : `${durationLabel} diagnostic lookahead for sparse selected-pair activity`;
    button.setAttribute(
      "aria-label",
      isPrimaryDuration
        ? "Show primary six-hour link map"
        : `Show diagnostic ${durationLabel} lookahead`
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
  title.textContent = formatTimelineModeTitle(viewModel);
  const caption = document.createElement("p");
  caption.className = "v4-projection-side-panel__timeline-caption";
  caption.textContent = formatTimelineModeCaption(viewModel);
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
        span.title = `${formatSatelliteShort(segment.satelliteId)} · ${segment.orbitClass} · ${formatUtcClockWithSeconds(segment.startUtc)}-${formatUtcClockWithSeconds(segment.endUtc)} ${getLocalTimezoneLabel(segment.startUtc)}`;
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
  // Times only; positional order already conveys start/mid/end (axis has an
  // aria-label for the accessible equivalent).
  start.textContent = viewModel.timelineAxisStartLabel;
  const mid = document.createElement("span");
  mid.textContent = viewModel.timelineAxisMidLabel;
  const end = document.createElement("span");
  end.textContent = viewModel.timelineAxisEndLabel;
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

function getActiveSatelliteAt(
  result: RuntimeProjectionResult,
  timeMs: number
): string | null {
  const coveringWindows = result.visibilityWindows.filter(w => {
    const start = new Date(w.intersectionStartUtc).getTime();
    const end = new Date(w.intersectionEndUtc).getTime();
    return timeMs >= start && timeMs <= end;
  });
  if (coveringWindows.length === 0) {
    return null;
  }

  let activeSatId: string | null = null;
  let latestHandoverMs = -Infinity;
  for (const event of result.handoverEvents) {
    const eventMs = new Date(event.handoverAtUtc).getTime();
    if (eventMs <= timeMs && eventMs > latestHandoverMs) {
      activeSatId = event.toSatelliteId;
      latestHandoverMs = eventMs;
    }
  }

  if (activeSatId) {
    const hasWindow = coveringWindows.some(w => w.satelliteId === activeSatId);
    if (hasWindow) {
      return activeSatId;
    }
  }

  return coveringWindows[0].satelliteId;
}

function syncDynamicOutcomeAndCards(
  root: HTMLElement,
  currentDate: Date,
  result: RuntimeProjectionResult
): void {
  const currentMs = currentDate.getTime();
  const activeSatId = getActiveSatelliteAt(result, currentMs);

  // 1. Sync active link stat block
  const activeLinkStat = root.querySelector<HTMLElement>('[data-stat-role="active-link"]');
  if (activeLinkStat) {
    const valueEl = activeLinkStat.querySelector('.v4-projection-side-panel__stat-value');
    if (valueEl) {
      if (activeSatId) {
        const orbit = resolveSatelliteOrbitClass(result, activeSatId);
        const displayVal = `${formatSatelliteShort(activeSatId)} · ${orbit}`;
        valueEl.textContent = displayVal;
        activeLinkStat.title = displayVal;
      } else {
        valueEl.textContent = "—";
        activeLinkStat.title = "No active link";
      }
    }
  }

  // 2. Sync Card 0: Active Link
  const card0 = root.querySelector<HTMLElement>('[data-card-index="0"]');
  if (card0) {
    const labelEl = card0.querySelector('.v4-projection-side-panel__decision-label');
    const timeEl = card0.querySelector('.v4-projection-side-panel__decision-time');
    const primaryEl = card0.querySelector('.v4-projection-side-panel__decision-primary');
    const secondaryEl = card0.querySelector('.v4-projection-side-panel__decision-secondary');

    if (labelEl) labelEl.textContent = "Geometry link";
    if (activeSatId) {
      const orbit = resolveSatelliteOrbitClass(result, activeSatId);
      if (timeEl) timeEl.textContent = "In view now";
      if (primaryEl) {
        const val = `${formatSatelliteShort(activeSatId)} · ${orbit}`;
        primaryEl.textContent = val;
        primaryEl.setAttribute('title', val);
      }
      if (secondaryEl) {
        const text = "Geometry-visible · modeled link";
        secondaryEl.textContent = text;
        secondaryEl.setAttribute('title', text);
      }
      // Neutral accent (not success-green): the link is geometry-visible and
      // modeled, not a measured served connection.
      card0.style.borderColor = "rgba(143, 208, 255, 0.4)";
      card0.style.background = "rgba(143, 208, 255, 0.08)";
    } else {
      if (timeEl) timeEl.textContent = "Inactive";
      if (primaryEl) {
        primaryEl.textContent = "No mutual link";
        primaryEl.setAttribute('title', "No mutual link");
      }
      if (secondaryEl) {
        const text = result.visibilityWindows.length === 0
          ? "No pair intersection"
          : "Mutual visibility gap";
        secondaryEl.textContent = text;
        secondaryEl.setAttribute('title', text);
      }
      card0.style.borderColor = "rgba(157, 196, 232, 0.11)";
      card0.style.background = "rgba(157, 196, 232, 0.052)";
    }
  }

  // 3. Sync Card 1: Next Handover
  const sortedHandovers = [...result.handoverEvents]
    .filter(e => e.fromSatelliteId !== null)
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc));
  const nextHandover = sortedHandovers.find(e => Date.parse(e.handoverAtUtc) > currentMs);

  const card1 = root.querySelector<HTMLElement>('[data-card-index="1"]');
  if (card1) {
    const labelEl = card1.querySelector('.v4-projection-side-panel__decision-label');
    const timeEl = card1.querySelector('.v4-projection-side-panel__decision-time');
    const primaryEl = card1.querySelector('.v4-projection-side-panel__decision-primary');
    const secondaryEl = card1.querySelector('.v4-projection-side-panel__decision-secondary');

    if (labelEl) labelEl.textContent = "Next Handover";
    if (nextHandover) {
      const timeText = `${formatUtcClockWithSeconds(nextHandover.handoverAtUtc)} UTC`;
      const primText = `${formatSatelliteShort(nextHandover.fromSatelliteId)} → ${formatSatelliteShort(nextHandover.toSatelliteId)}`;
      const reason = formatPanelReasonLabel(nextHandover.reasonKind, nextHandover.fromSatelliteId);
      const orbit = resolveSatelliteOrbitClass(result, nextHandover.toSatelliteId);
      const secText = `${orbit} · ${reason}`;

      if (timeEl) timeEl.textContent = timeText;
      if (primaryEl) {
        primaryEl.textContent = primText;
        primaryEl.setAttribute('title', primText);
      }
      if (secondaryEl) {
        secondaryEl.textContent = secText;
        secondaryEl.setAttribute('title', secText);
      }
      const reasonTitle = formatPanelReasonTitle(nextHandover.reasonKind, nextHandover.fromSatelliteId);
      if (reasonTitle) {
        card1.setAttribute('title', reasonTitle);
      } else {
        card1.removeAttribute('title');
      }
    } else {
      if (timeEl) timeEl.textContent = "None";
      if (primaryEl) {
        primaryEl.textContent = "No upcoming handovers";
        primaryEl.setAttribute('title', "No upcoming handovers");
      }
      if (secondaryEl) {
        const secText = "Stable link for remaining window";
        secondaryEl.textContent = secText;
        secondaryEl.setAttribute('title', secText);
      }
      card1.removeAttribute('title');
    }
  }

  // 4. Sync Card 2: Next Cross-orbit
  const sortedCrossOrbit = [...result.handoverEvents]
    .filter(e => e.reasonKind === 'cross-orbit-migration')
    .sort((a, b) => Date.parse(a.handoverAtUtc) - Date.parse(b.handoverAtUtc));
  const nextCrossOrbit = sortedCrossOrbit.find(e => Date.parse(e.handoverAtUtc) > currentMs);

  const card2 = root.querySelector<HTMLElement>('[data-card-index="2"]');
  if (card2) {
    const labelEl = card2.querySelector('.v4-projection-side-panel__decision-label');
    const timeEl = card2.querySelector('.v4-projection-side-panel__decision-time');
    const primaryEl = card2.querySelector('.v4-projection-side-panel__decision-primary');
    const secondaryEl = card2.querySelector('.v4-projection-side-panel__decision-secondary');

    if (labelEl) labelEl.textContent = "Next Cross-orbit";
    if (nextCrossOrbit) {
      const timeText = `${formatUtcClockWithSeconds(nextCrossOrbit.handoverAtUtc)} UTC`;
      const primText = `${formatSatelliteShort(nextCrossOrbit.fromSatelliteId)} → ${formatSatelliteShort(nextCrossOrbit.toSatelliteId)}`;
      const orbit = resolveSatelliteOrbitClass(result, nextCrossOrbit.toSatelliteId);
      const secText = `${orbit} · Cross-orbit migration`;

      if (timeEl) timeEl.textContent = timeText;
      if (primaryEl) {
        primaryEl.textContent = primText;
        primaryEl.setAttribute('title', primText);
      }
      if (secondaryEl) {
        secondaryEl.textContent = secText;
        secondaryEl.setAttribute('title', secText);
      }
      const reasonTitle = formatPanelReasonTitle(nextCrossOrbit.reasonKind, nextCrossOrbit.fromSatelliteId);
      if (reasonTitle) {
        card2.setAttribute('title', reasonTitle);
      } else {
        card2.removeAttribute('title');
      }
    } else {
      if (timeEl) timeEl.textContent = "None";
      if (primaryEl) {
        primaryEl.textContent = "No upcoming cross-orbit";
        primaryEl.setAttribute('title', "No upcoming cross-orbit");
      }
      if (secondaryEl) {
        const secText = "Single-tier continuation";
        secondaryEl.textContent = secText;
        secondaryEl.setAttribute('title', secText);
      }
      card2.removeAttribute('title');
    }
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
    marker.title = `${formatUtcClockWithSeconds(currentUtc)} ${getLocalTimezoneLabel(currentUtc)} · current replay time`;
  }

  const result = (root as any).__latestResult as RuntimeProjectionResult | undefined;
  if (result) {
    syncDynamicOutcomeAndCards(root, currentDate, result);
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
  // Caption dropped: decision-card times are already labeled UTC.
  title.textContent = "Next 6h link plan";
  head.append(title);

  const list = document.createElement("div");
  list.className = "v4-projection-side-panel__decision-list";
  let idx = 0;
  for (const card of viewModel.decisionCards.slice(0, PANEL_DECISION_CARD_LIMIT)) {
    const item = document.createElement("article");
    item.className = "v4-projection-side-panel__decision-card";
    item.dataset.cardIndex = String(idx++);
    if (card.modifier) {
      item.dataset.modifier = card.modifier;
    }
    if (card.title) {
      item.title = card.title;
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
  // Outcome only; the rain caption above already cites ITU-R P.618-14 and the
  // evidence drawer carries the full standards reference.
  summary.textContent =
    rainRateMmPerHour <= 0
      ? "Clear-sky baseline"
      : lostMs > 0
      ? `${formatDurationMs(lostMs)} comm time lost`
      : "Throughput/jitter delta only";

  const proxyNote = document.createElement("p");
  proxyNote.className = "v4-projection-side-panel__rain-proxy-note";
  proxyNote.textContent =
    "Throughput = modeled capacity proxy (no packet test); jitter is a modeled proxy.";

  row.append(
    rainControl.control,
    summary,
    buildRainSpeedComparison(rainRateMmPerHour, result),
    proxyNote
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
      ...resolveRouteGeometryLinkBudgetOptions(result, orbit, stationHeightAboveSeaKm),
      rainRateMmPerHour: 0
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
    // The "Current" throughput is a clear-sky modeled capacity proxy, not a
    // measured rate — label it so it does not read as live served throughput.
    currentPaneChildren.push(
      currentMbps === undefined || baselineMbps === undefined
        ? buildStatBlock(`${orbit} clear-sky ref`, currentMbps === undefined ? "n/a" : formatMbpsValue(currentMbps))
        : buildCompareStatBlock(
            `${orbit} clear-sky ref`,
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
  const reasonTitle = formatPanelReasonTitle(
    event.reasonKind,
    event.fromSatelliteId
  );
  if (reasonTitle) {
    li.title = reasonTitle;
  }
  const head = document.createElement("span");
  head.className = "v4-projection-side-panel__list-primary";
  head.textContent = `${formatIsoShort(event.handoverAtUtc)}  ${event.fromSatelliteId ?? "—"} → ${event.toSatelliteId}`;
  const reason = document.createElement("span");
  reason.className = "v4-projection-side-panel__list-secondary";
  reason.textContent = formatPanelReasonLabel(
    event.reasonKind,
    event.fromSatelliteId
  );
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
    empty.textContent = "沒有鏈路選擇事件。";
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
      `此時間窗內 ${result.dataCompleteness.policyDisclosure.activePolicyId} 政策沒有觸發換手事件。`;
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
  // Plain-language precision rather than the raw enum (reads as debug output
  // otherwise). Dataset attrs above carry the machine value for smokes.
  const precisionText =
    result.truthBoundary.precisionLabel === "operator-family-precision"
      ? "Operator-precision coords"
      : "Modeled coords";
  footer.textContent = `${precisionText} · ${resolveSourceBadgeLabel(tierAttribution)}`;
  row.append(footer);
  return row;
}



function buildEvidenceEntryRow(
  result: RuntimeProjectionResult,
  tleRecords: ReadonlyArray<RuntimeOrbitRecord> | null
): HTMLElement {
  const row = buildFooterRow(result);
  const actions = document.createElement("div");
  actions.className = "v4-projection-side-panel__evidence-actions";

  const reportButton = buildOpenEvidenceReportButton(result, "Report");
  const csvButton = buildDownloadCsvButton(result, "CSV");
  const csvHelp = buildCsvHelpControl(csvButton);
  const traceControl = buildTrajectoryProvenanceControl(result, tleRecords);
  actions.append(reportButton, csvHelp.root, traceControl.root);
  (row as any).__disposeHelp = (): void => {
    csvHelp.dispose();
    traceControl.dispose();
  };
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
  readonly tleRecords: ReadonlyArray<RuntimeOrbitRecord> | null;
  /** Opens the ESTNeT trace dock; wired to the summary card's button. */
  readonly onOpenEstnetExplorer?: () => void;
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
    onDurationChange,
    tleRecords
  } = options;

  // Preserve slider focus across re-renders: the rain control node is reused,
  // not recreated, so the user can keep dragging while the panel recomputes.
  const sliderWasFocused = document.activeElement === rainControl.slider;
  const savedScrollTop = root.scrollTop;

  for (const child of Array.from(root.children)) {
    if (typeof (child as any).__disposeHelp === "function") {
      (child as any).__disposeHelp();
    }
  }

  root.replaceChildren();
  (root as any).__latestResult = result;
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

  // Panel-density fourth pass: the panel renders only the one-line summary
  // CARD — the full trace explorer (selector, chart, Δ cards, honesty
  // pointer) lives in the bottom dock the card's button opens.
  const estnetCard = resolveEstnetTraceOptIn()
    ? buildEstnetSummaryCard({
        onOpenExplorer: options.onOpenEstnetExplorer ?? (() => {})
      })
    : null;

  if (compareMode === PRE_WAVE2_COMPARE_MODE) {
    root.append(
      buildHeaderRow(result, viewModel),
      buildRainControlRow(rainControl),
      buildFlatStatsRow(result, compareMode),
      buildReplayControlRow(root.ownerDocument),
      buildSummariesRow(result, compareMode),
      buildPolicyDisclosure(result),
      buildSourceConfidenceDisclosure(result),
      ...(estnetCard ? [estnetCard] : []),
      buildEvidenceEntryRow(result, tleRecords),
      buildHiddenMachineEvidenceBlock(result)
    );
  } else {
    root.append(
      buildHeaderRow(result, viewModel),
      buildOutcomeRow(viewModel),
      buildReplayControlRow(root.ownerDocument),
      buildTimelineRow(viewModel, onDurationChange),
      buildDecisionCardsRow(viewModel),
      buildRainImpactMainRow(rainControl, result, rainRateMmPerHour, clearSky),
      buildPolicyDisclosure(result),
      buildSourceConfidenceDisclosure(result),
      ...(estnetCard ? [estnetCard] : []),
      buildEvidenceEntryRow(result, tleRecords),
      buildHiddenMachineEvidenceBlock(result)
    );
  }
  syncTimelineCurrentMarkers(root, viewer);

  // Restore the scroll position after elements have been appended to prevent jumping to top
  root.scrollTop = savedScrollTop;

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

  // ESTNeT trace dock (panel-density fourth pass): mounted/destroyed with the
  // display mode; content refreshed on every published runtime result. A LIVE
  // toggle-on (and the ?estnet=1 seed once the first result lands) auto-opens
  // it; an explicit user close is respected across later recomputes.
  let estnetDock: EstnetTraceDockHandle | null = null;
  let estnetDockUserClosed = false;
  const estnetReplayClock = () =>
    input.viewer && !input.viewer.isDestroyed()
      ? createCesiumReplayClock(input.viewer)
      : null;
  const ensureEstnetDock = (): EstnetTraceDockHandle => {
    if (!estnetDock) {
      estnetDock = mountEstnetTraceDock({
        onUserClose: () => {
          estnetDockUserClosed = true;
        }
      });
    }
    return estnetDock;
  };
  const openEstnetExplorerFromCard = (): void => {
    const dock = ensureEstnetDock();
    estnetDockUserClosed = false;
    dock.update(latestResult, estnetReplayClock());
    dock.open();
  };
  const estnetDockResultListener = (
    result: RuntimeProjectionResult | null
  ): void => {
    if (!estnetDock) {
      return;
    }
    estnetDock.update(result, estnetReplayClock());
    if (
      result &&
      !estnetDock.isOpen() &&
      !estnetDockUserClosed &&
      isEstnetTraceDisplayEnabled()
    ) {
      // First result after a toggle-on / URL seed: reveal the explorer once.
      estnetDock.open();
    }
  };
  runtimeResultListeners.add(estnetDockResultListener);

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
        onDurationChange: setProjectionDurationMinutes,
        tleRecords,
        onOpenEstnetExplorer: openEstnetExplorerFromCard
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
        onDurationChange: setProjectionDurationMinutes,
        tleRecords,
        onOpenEstnetExplorer: openEstnetExplorerFromCard
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
        onDurationChange: setProjectionDurationMinutes,
        tleRecords,
        onOpenEstnetExplorer: openEstnetExplorerFromCard
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

  // React to the ESTNeT display mode: the dock lives and dies with the mode
  // (OFF = full DOM teardown, zero estnet nodes), and the panel re-renders so
  // the summary card appears/disappears live. Before the first compute there
  // is no result yet — the dock idles hidden and the first published result
  // auto-opens it (estnetDockResultListener). With the mode OFF the render
  // output stays byte-identical to the default single-link surface.
  const unsubscribeEstnetDisplay = subscribeEstnetTraceDisplay((enabled) => {
    if (disposed) {
      return;
    }
    if (enabled) {
      ensureEstnetDock();
      // An explicit toggle-on re-arms the auto-open (a previous close was
      // scoped to that opt-in session, not to the mode itself).
      estnetDockUserClosed = false;
    } else {
      estnetDock?.destroy();
      estnetDock = null;
      estnetDockUserClosed = false;
    }
    const result = latestResult;
    const clearSky = clearSkyResult;
    if (!result || !clearSky || !rainControl) {
      return;
    }
    renderResult(root, pair, result, {
      rainRateMmPerHour: currentRainRate,
      clearSky,
      rainControl,
      durationMinutes,
      compareMode,
      viewer: input.viewer,
      onDurationChange: setProjectionDurationMinutes,
      tleRecords,
      onOpenEstnetExplorer: openEstnetExplorerFromCard
    });
    // Discoverability: a LIVE toggle-on (result already present) reveals the
    // explorer immediately — without this the toolbar toggle only added a
    // small card and looked like a no-op.
    if (enabled && estnetDock) {
      estnetDock.update(result, estnetReplayClock());
      if (!estnetDock.isOpen()) {
        estnetDock.open();
      }
    }
  });

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
      unsubscribeEstnetDisplay();
      estnetDock?.destroy();
      estnetDock = null;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      runtimeResultListeners.clear();
      projectionClient.dispose();
      disposeWheelScroll();
      disposeTimelineCurrentMarkerSync();
      for (const child of Array.from(root.children)) {
        if (typeof (child as any).__disposeHelp === "function") {
          (child as any).__disposeHelp();
        }
      }
      if (root.parentElement) {
        root.parentElement.removeChild(root);
      }
    }
  };
}
