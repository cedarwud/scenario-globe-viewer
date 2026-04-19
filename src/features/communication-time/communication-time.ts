import type { ScenePresetKey } from "../globe/scene-preset";
import type { ClockMode, ClockTimestamp } from "../time";

export const COMMUNICATION_TIME_REPORT_SCHEMA_VERSION =
  "phase6.3-bootstrap-communication-time-report.v1";
export const BOOTSTRAP_PROXY_PROVENANCE_DETAIL =
  "Deterministic bootstrap communication windows projected from the active scenario range; not a real network measurement.";
export const BOOTSTRAP_PROXY_PROVENANCE_NOTE = "Proxy only; not measured.";

export type CommunicationTimeSourceKind = "bootstrap-proxy";
export type CommunicationTimeStatusKind = "communicating" | "unavailable";

export interface CommunicationTimeRange {
  start: ClockTimestamp;
  stop: ClockTimestamp;
}

export interface CommunicationTimeWindowTemplate {
  startRatio: number;
  stopRatio: number;
}

export interface CommunicationTimeWindow {
  start: ClockTimestamp;
  stop: ClockTimestamp;
  durationMs: number;
  sourceKind: CommunicationTimeSourceKind;
}

export interface CommunicationTimeScenarioRef {
  id: string;
  label: string;
  presetKey: ScenePresetKey;
  mode: ClockMode;
}

export interface CommunicationTimeSummaryScope {
  kind: "scenario-bounded";
  label: string;
}

export interface CommunicationTimeProvenance {
  sourceKind: CommunicationTimeSourceKind;
  label: string;
  detail: string;
}

export interface CommunicationTimeCurrentStatus {
  kind: CommunicationTimeStatusKind;
  label: string;
  at: ClockTimestamp;
  windowRemainingMs: number;
  nextChangeAt: ClockTimestamp;
}

export interface CommunicationTimeSummary {
  totalRangeMs: number;
  totalCommunicatingMs: number;
  totalUnavailableMs: number;
  elapsedCommunicatingMs: number;
  remainingCommunicatingMs: number;
  availabilityRatio: number;
  windowCount: number;
}

export interface CommunicationTimeReport {
  schemaVersion: typeof COMMUNICATION_TIME_REPORT_SCHEMA_VERSION;
  sourceKind: CommunicationTimeSourceKind;
  scenario: {
    id: string;
    label: string;
    presetKey: ScenePresetKey;
    mode: ClockMode;
  };
  activeRange: {
    start: string;
    stop: string;
    durationMs: number;
  };
  currentTime: string;
  summaryScope: CommunicationTimeSummaryScope;
  provenance: CommunicationTimeProvenance;
  currentStatus: {
    kind: CommunicationTimeStatusKind;
    at: string;
    windowRemainingMs: number;
    nextChangeAt: string;
  };
  summary: CommunicationTimeSummary;
  windows: ReadonlyArray<{
    start: string;
    stop: string;
    durationMs: number;
    sourceKind: CommunicationTimeSourceKind;
  }>;
}

export interface CommunicationTimeState {
  scenario: CommunicationTimeScenarioRef;
  activeRange: CommunicationTimeRange;
  currentTime: ClockTimestamp;
  summaryScope: CommunicationTimeSummaryScope;
  provenance: CommunicationTimeProvenance;
  currentStatus: CommunicationTimeCurrentStatus;
  summary: CommunicationTimeSummary;
  windows: ReadonlyArray<CommunicationTimeWindow>;
  report: CommunicationTimeReport;
}

export interface CommunicationTimeStateOptions {
  scenario: CommunicationTimeScenarioRef;
  activeRange: CommunicationTimeRange;
  currentTime: ClockTimestamp;
  sourceKind: CommunicationTimeSourceKind;
  windowTemplates: ReadonlyArray<CommunicationTimeWindowTemplate>;
}

interface NormalizedRange {
  startMs: number;
  stopMs: number;
  startIso: string;
  stopIso: string;
}

interface NormalizedWindow {
  startMs: number;
  stopMs: number;
  startIso: string;
  stopIso: string;
}

function toEpochMilliseconds(value: ClockTimestamp): number {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Communication-time timestamp must parse: ${value}`);
  }

  return epochMs;
}

function normalizeRange(range: CommunicationTimeRange): NormalizedRange {
  const startMs = toEpochMilliseconds(range.start);
  const stopMs = toEpochMilliseconds(range.stop);

  if (startMs > stopMs) {
    throw new Error("Communication-time range start must not exceed stop.");
  }

  return {
    startMs,
    stopMs,
    startIso: new Date(startMs).toISOString(),
    stopIso: new Date(stopMs).toISOString()
  };
}

function clampToRange(valueMs: number, range: NormalizedRange): number {
  return Math.min(Math.max(valueMs, range.startMs), range.stopMs);
}

function validateWindowTemplate(
  template: CommunicationTimeWindowTemplate
): CommunicationTimeWindowTemplate {
  if (
    !Number.isFinite(template.startRatio) ||
    !Number.isFinite(template.stopRatio) ||
    template.startRatio < 0 ||
    template.stopRatio > 1 ||
    template.startRatio >= template.stopRatio
  ) {
    throw new Error(
      `Communication-time window ratios must stay within [0, 1] and preserve ordering: ${JSON.stringify(
        template
      )}`
    );
  }

  return {
    startRatio: template.startRatio,
    stopRatio: template.stopRatio
  };
}

function normalizeWindows(
  range: NormalizedRange,
  templates: ReadonlyArray<CommunicationTimeWindowTemplate>
): NormalizedWindow[] {
  const totalRangeMs = range.stopMs - range.startMs;

  const projected = templates
    .map(validateWindowTemplate)
    .map((template) => {
      const startMs = range.startMs + Math.round(totalRangeMs * template.startRatio);
      const stopMs = range.startMs + Math.round(totalRangeMs * template.stopRatio);

      if (stopMs <= startMs) {
        throw new Error(
          `Communication-time window collapsed after projection: ${JSON.stringify(
            template
          )}`
        );
      }

      return {
        startMs,
        stopMs,
        startIso: new Date(startMs).toISOString(),
        stopIso: new Date(stopMs).toISOString()
      };
    })
    .sort((left, right) => left.startMs - right.startMs);

  const merged: NormalizedWindow[] = [];

  for (const window of projected) {
    const previous = merged.at(-1);

    if (!previous || window.startMs > previous.stopMs) {
      merged.push(window);
      continue;
    }

    previous.stopMs = Math.max(previous.stopMs, window.stopMs);
    previous.stopIso = new Date(previous.stopMs).toISOString();
  }

  return merged;
}

function measureOverlapMs(
  rangeStartMs: number,
  rangeStopMs: number,
  window: NormalizedWindow
): number {
  const startMs = Math.max(rangeStartMs, window.startMs);
  const stopMs = Math.min(rangeStopMs, window.stopMs);
  return Math.max(0, stopMs - startMs);
}

function createSummary(
  range: NormalizedRange,
  currentTimeMs: number,
  windows: ReadonlyArray<NormalizedWindow>
): CommunicationTimeSummary {
  const totalRangeMs = range.stopMs - range.startMs;
  const totalCommunicatingMs = windows.reduce((total, window) => {
    return total + measureOverlapMs(range.startMs, range.stopMs, window);
  }, 0);
  const elapsedCommunicatingMs = windows.reduce((total, window) => {
    return total + measureOverlapMs(range.startMs, currentTimeMs, window);
  }, 0);
  const remainingCommunicatingMs = windows.reduce((total, window) => {
    return total + measureOverlapMs(currentTimeMs, range.stopMs, window);
  }, 0);
  const totalUnavailableMs = Math.max(0, totalRangeMs - totalCommunicatingMs);

  return {
    totalRangeMs,
    totalCommunicatingMs,
    totalUnavailableMs,
    elapsedCommunicatingMs,
    remainingCommunicatingMs,
    availabilityRatio:
      totalRangeMs > 0 ? totalCommunicatingMs / totalRangeMs : 0,
    windowCount: windows.length
  };
}

function createCurrentStatus(
  range: NormalizedRange,
  currentTimeMs: number,
  windows: ReadonlyArray<NormalizedWindow>
): CommunicationTimeCurrentStatus {
  const activeWindow = windows.find(
    (window) => currentTimeMs >= window.startMs && currentTimeMs <= window.stopMs
  );

  if (activeWindow) {
    return {
      kind: "communicating",
      label: "Communicating",
      at: new Date(currentTimeMs).toISOString(),
      windowRemainingMs: Math.max(0, activeWindow.stopMs - currentTimeMs),
      nextChangeAt: activeWindow.stopIso
    };
  }

  const nextWindow = windows.find((window) => window.startMs > currentTimeMs);

  return {
    kind: "unavailable",
    label: "Unavailable",
    at: new Date(currentTimeMs).toISOString(),
    windowRemainingMs: 0,
    nextChangeAt: nextWindow ? nextWindow.startIso : range.stopIso
  };
}

function createSummaryScope(
  scenario: CommunicationTimeScenarioRef
): CommunicationTimeSummaryScope {
  return {
    kind: "scenario-bounded",
    label: `${scenario.label} active range`
  };
}

function createProvenance(
  sourceKind: CommunicationTimeSourceKind
): CommunicationTimeProvenance {
  return {
    sourceKind,
    label: sourceKind,
    detail: BOOTSTRAP_PROXY_PROVENANCE_DETAIL
  };
}

function createReport(
  scenario: CommunicationTimeScenarioRef,
  range: NormalizedRange,
  currentTimeIso: string,
  summaryScope: CommunicationTimeSummaryScope,
  provenance: CommunicationTimeProvenance,
  currentStatus: CommunicationTimeCurrentStatus,
  summary: CommunicationTimeSummary,
  windows: ReadonlyArray<CommunicationTimeWindow>
): CommunicationTimeReport {
  return {
    schemaVersion: COMMUNICATION_TIME_REPORT_SCHEMA_VERSION,
    sourceKind: provenance.sourceKind,
    scenario: {
      id: scenario.id,
      label: scenario.label,
      presetKey: scenario.presetKey,
      mode: scenario.mode
    },
    activeRange: {
      start: range.startIso,
      stop: range.stopIso,
      durationMs: summary.totalRangeMs
    },
    currentTime: currentTimeIso,
    summaryScope,
    provenance,
    currentStatus: {
      kind: currentStatus.kind,
      at: currentStatus.at as string,
      windowRemainingMs: currentStatus.windowRemainingMs,
      nextChangeAt: currentStatus.nextChangeAt as string
    },
    summary,
    windows: windows.map((window) => ({
      start: window.start as string,
      stop: window.stop as string,
      durationMs: window.durationMs,
      sourceKind: window.sourceKind
    }))
  };
}

export function formatCommunicationDurationLabel(durationMs: number): string {
  const safeDurationMs = Math.max(0, Math.round(durationMs));
  const totalSeconds = Math.floor(safeDurationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
      .toString()
      .padStart(2, "0")}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function createCommunicationTimeState({
  scenario,
  activeRange,
  currentTime,
  sourceKind,
  windowTemplates
}: CommunicationTimeStateOptions): CommunicationTimeState {
  const normalizedRange = normalizeRange(activeRange);
  const currentTimeMs = clampToRange(
    toEpochMilliseconds(currentTime),
    normalizedRange
  );
  const normalizedWindows = normalizeWindows(normalizedRange, windowTemplates);
  const windows: CommunicationTimeWindow[] = normalizedWindows.map((window) => ({
    start: window.startIso,
    stop: window.stopIso,
    durationMs: window.stopMs - window.startMs,
    sourceKind
  }));
  const summary = createSummary(normalizedRange, currentTimeMs, normalizedWindows);
  const currentStatus = createCurrentStatus(
    normalizedRange,
    currentTimeMs,
    normalizedWindows
  );
  const summaryScope = createSummaryScope(scenario);
  const provenance = createProvenance(sourceKind);
  const currentTimeIso = new Date(currentTimeMs).toISOString();

  return {
    scenario,
    activeRange: {
      start: normalizedRange.startIso,
      stop: normalizedRange.stopIso
    },
    currentTime: currentTimeIso,
    summaryScope,
    provenance,
    currentStatus,
    summary,
    windows,
    report: createReport(
      scenario,
      normalizedRange,
      currentTimeIso,
      summaryScope,
      provenance,
      currentStatus,
      summary,
      windows
    )
  };
}
