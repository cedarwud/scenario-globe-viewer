import type { ClockTimestamp } from "../time";

export const PHYSICAL_INPUT_REPORT_SCHEMA_VERSION =
  "phase6.5-bootstrap-physical-input-report.v1";
export const PHYSICAL_INPUT_BOUNDARY_NOTE =
  "Bounded proxy physical inputs; not final physical-layer truth.";
export const PHYSICAL_INPUT_BOUNDARY_DETAIL =
  "Deterministic antenna / rain attenuation / ITU-style proxy families projected into candidate decision metrics; not calibrated measurement truth.";
export const PHYSICAL_INPUT_PROJECTION_TARGET =
  "Projected into latencyMs / jitterMs / networkSpeedMbps for the repo-owned decision layer.";

export type PhysicalInputFamily = "antenna" | "rain-attenuation" | "itu-style";
export type PhysicalInputProvenanceKind = "bounded-proxy";
export type PhysicalInputOrbitClass = "leo" | "meo" | "geo";
export type PhysicalInputPathRole = "primary" | "secondary" | "contrast";
export const PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE =
  "managed_service_switching";
export type PathControlMode =
  | typeof PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE
  | (string & {});
export type InfrastructureSelectionMode =
  | "provider-managed"
  | "eligible-pool"
  | "resolved-fixed-node";

export interface PhysicalInputProvenance {
  family: PhysicalInputFamily;
  kind: PhysicalInputProvenanceKind;
  label: string;
  detail: string;
  sourceRef?: string;
}

export interface AntennaPhysicalInputs {
  profileId: string;
  gainDb: number;
  pointingLossDb: number;
}

export interface RainPhysicalInputs {
  modelId: string;
  attenuationDb?: number;
  rainRateMmPerHr?: number;
}

export interface ItuStylePhysicalInputs {
  profileId: string;
  frequencyGHz: number;
  elevationDeg: number;
  availabilityPercent: number;
}

export interface CandidatePhysicalInputs {
  candidateId: string;
  orbitClass: PhysicalInputOrbitClass;
  pathRole?: PhysicalInputPathRole;
  pathControlMode?: PathControlMode;
  infrastructureSelectionMode?: InfrastructureSelectionMode;
  antenna: AntennaPhysicalInputs;
  rain: RainPhysicalInputs;
  itu: ItuStylePhysicalInputs;
  baseMetrics?: {
    latencyMs: number;
    jitterMs: number;
    networkSpeedMbps: number;
  };
}

export interface PhysicalInputWindow {
  startRatio: number;
  stopRatio: number;
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
}

export interface PhysicalInputSourceEntry {
  scenarioId: string;
  windows: ReadonlyArray<PhysicalInputWindow>;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
}

export interface PhysicalInputSourceCatalog {
  entries: ReadonlyArray<PhysicalInputSourceEntry>;
}

export interface ProjectedPhysicalDecisionMetrics {
  candidateId: string;
  orbitClass: PhysicalInputOrbitClass;
  latencyMs: number;
  jitterMs: number;
  networkSpeedMbps: number;
  provenanceKind: PhysicalInputProvenanceKind;
}

export interface PhysicalInputScenarioRef {
  id: string;
  label: string;
}

export interface PhysicalInputActiveWindow {
  startRatio: number;
  stopRatio: number;
  contextLabel: string;
}

export interface PhysicalInputReport {
  schemaVersion: typeof PHYSICAL_INPUT_REPORT_SCHEMA_VERSION;
  scenario: PhysicalInputScenarioRef;
  activeRange: {
    start: string;
    stop: string;
    durationMs: number;
  };
  evaluatedAt: string;
  activeWindow: PhysicalInputActiveWindow;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
  projectionTarget: typeof PHYSICAL_INPUT_PROJECTION_TARGET;
  disclaimer: string;
  candidates: ReadonlyArray<{
    candidateId: string;
    orbitClass: PhysicalInputOrbitClass;
    pathRole?: PhysicalInputPathRole;
    pathControlMode?: PathControlMode;
    infrastructureSelectionMode?: InfrastructureSelectionMode;
    antenna: AntennaPhysicalInputs;
    rain: RainPhysicalInputs;
    itu: ItuStylePhysicalInputs;
    baseMetrics: {
      latencyMs: number;
      jitterMs: number;
      networkSpeedMbps: number;
    };
    projectedMetrics: {
      latencyMs: number;
      jitterMs: number;
      networkSpeedMbps: number;
    };
  }>;
}

export interface PhysicalInputState {
  scenario: PhysicalInputScenarioRef;
  activeRange: {
    start: string;
    stop: string;
  };
  evaluatedAt: string;
  activeWindow: PhysicalInputActiveWindow;
  provenance: ReadonlyArray<PhysicalInputProvenance>;
  candidates: ReadonlyArray<CandidatePhysicalInputs>;
  projectedMetrics: ReadonlyArray<ProjectedPhysicalDecisionMetrics>;
  projectionTarget: typeof PHYSICAL_INPUT_PROJECTION_TARGET;
  disclaimer: string;
  report: PhysicalInputReport;
}

export interface PhysicalInputStateOptions {
  scenario: PhysicalInputScenarioRef;
  activeRange: {
    start: ClockTimestamp;
    stop: ClockTimestamp;
  };
  evaluatedAt: ClockTimestamp;
  sourceEntry: PhysicalInputSourceEntry;
  activeContextLabel?: string;
}

interface NormalizedTimeRange {
  startMs: number;
  stopMs: number;
  startIso: string;
  stopIso: string;
}

const DEFAULT_BASE_METRICS: Record<
  PhysicalInputOrbitClass,
  { latencyMs: number; jitterMs: number; networkSpeedMbps: number }
> = {
  leo: {
    latencyMs: 30,
    jitterMs: 4,
    networkSpeedMbps: 240
  },
  meo: {
    latencyMs: 38,
    jitterMs: 5,
    networkSpeedMbps: 220
  },
  geo: {
    latencyMs: 95,
    jitterMs: 12,
    networkSpeedMbps: 120
  }
};

function toEpochMilliseconds(value: ClockTimestamp): number {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Physical-input timestamp must parse: ${value}`);
  }

  return epochMs;
}

function normalizeTimeRange(range: {
  start: ClockTimestamp;
  stop: ClockTimestamp;
}): NormalizedTimeRange {
  const startMs = toEpochMilliseconds(range.start);
  const stopMs = toEpochMilliseconds(range.stop);

  if (startMs > stopMs) {
    throw new Error("Physical-input activeRange start must not exceed stop.");
  }

  return {
    startMs,
    stopMs,
    startIso: new Date(startMs).toISOString(),
    stopIso: new Date(stopMs).toISOString()
  };
}

function clampRatio(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function cloneAntennaInputs(inputs: AntennaPhysicalInputs): AntennaPhysicalInputs {
  return {
    profileId: inputs.profileId,
    gainDb: inputs.gainDb,
    pointingLossDb: inputs.pointingLossDb
  };
}

function cloneRainInputs(inputs: RainPhysicalInputs): RainPhysicalInputs {
  return {
    modelId: inputs.modelId,
    ...(inputs.attenuationDb !== undefined
      ? { attenuationDb: inputs.attenuationDb }
      : {}),
    ...(inputs.rainRateMmPerHr !== undefined
      ? { rainRateMmPerHr: inputs.rainRateMmPerHr }
      : {})
  };
}

function cloneItuInputs(inputs: ItuStylePhysicalInputs): ItuStylePhysicalInputs {
  return {
    profileId: inputs.profileId,
    frequencyGHz: inputs.frequencyGHz,
    elevationDeg: inputs.elevationDeg,
    availabilityPercent: inputs.availabilityPercent
  };
}

function cloneCandidatePhysicalInputs(
  candidate: CandidatePhysicalInputs
): CandidatePhysicalInputs {
  return {
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
    ...(candidate.pathRole ? { pathRole: candidate.pathRole } : {}),
    ...(candidate.pathControlMode
      ? { pathControlMode: candidate.pathControlMode }
      : {}),
    ...(candidate.infrastructureSelectionMode
      ? {
          infrastructureSelectionMode:
            candidate.infrastructureSelectionMode
        }
      : {}),
    antenna: cloneAntennaInputs(candidate.antenna),
    rain: cloneRainInputs(candidate.rain),
    itu: cloneItuInputs(candidate.itu),
    ...(candidate.baseMetrics
      ? {
          baseMetrics: {
            latencyMs: candidate.baseMetrics.latencyMs,
            jitterMs: candidate.baseMetrics.jitterMs,
            networkSpeedMbps: candidate.baseMetrics.networkSpeedMbps
          }
        }
      : {})
  };
}

function clonePhysicalInputProvenance(
  provenance: PhysicalInputProvenance
): PhysicalInputProvenance {
  return {
    family: provenance.family,
    kind: provenance.kind,
    label: provenance.label,
    detail: provenance.detail,
    ...(provenance.sourceRef ? { sourceRef: provenance.sourceRef } : {})
  };
}

function assertRatioWindow(window: PhysicalInputWindow): void {
  if (
    !Number.isFinite(window.startRatio) ||
    !Number.isFinite(window.stopRatio) ||
    window.startRatio < 0 ||
    window.stopRatio > 1 ||
    window.startRatio >= window.stopRatio
  ) {
    throw new Error(
      `Physical-input window ratios must stay within [0, 1] and preserve ordering: ${JSON.stringify(window)}`
    );
  }
}

export function assertRepoOwnedPathControlMode(
  value: PathControlMode
): asserts value is typeof PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE {
  if (value !== PHYSICAL_INPUT_FIRST_VALIDATED_PATH_CONTROL_MODE) {
    throw new Error(
      "Physical-input currently validates only the repo-owned pathControlMode managed_service_switching."
    );
  }
}

function resolveBaseMetrics(candidate: CandidatePhysicalInputs): {
  latencyMs: number;
  jitterMs: number;
  networkSpeedMbps: number;
} {
  const defaults = DEFAULT_BASE_METRICS[candidate.orbitClass];
  const baseMetrics = candidate.baseMetrics ?? defaults;

  for (const [label, value] of Object.entries(baseMetrics)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Physical-input base metrics must stay finite and positive: ${candidate.candidateId}.${label}`
      );
    }
  }

  return {
    latencyMs: baseMetrics.latencyMs,
    jitterMs: baseMetrics.jitterMs,
    networkSpeedMbps: baseMetrics.networkSpeedMbps
  };
}

function resolveRainPenalty(candidate: CandidatePhysicalInputs): number {
  const attenuationDb = candidate.rain.attenuationDb ?? 0;
  const rainRateMmPerHr = candidate.rain.rainRateMmPerHr ?? 0;
  return attenuationDb + rainRateMmPerHr * 0.06;
}

function resolveItuPenalty(candidate: CandidatePhysicalInputs): number {
  const frequencyPenalty = Math.max(0, candidate.itu.frequencyGHz - 18) * 0.45;
  const elevationPenalty = Math.max(0, 35 - candidate.itu.elevationDeg) * 0.22;
  const availabilityPenalty = Math.max(
    0,
    99.95 - candidate.itu.availabilityPercent
  ) * 6;

  return frequencyPenalty + elevationPenalty + availabilityPenalty;
}

function projectCandidateMetrics(
  candidate: CandidatePhysicalInputs
): ProjectedPhysicalDecisionMetrics {
  const baseMetrics = resolveBaseMetrics(candidate);
  const effectiveGainDb = candidate.antenna.gainDb - candidate.antenna.pointingLossDb;
  const gainDeficitDb = Math.max(0, 35 - effectiveGainDb);
  const gainBonusDb = Math.max(0, effectiveGainDb - 35);
  const rainPenalty = resolveRainPenalty(candidate);
  const ituPenalty = resolveItuPenalty(candidate);
  const latencyMs = roundMetric(
    baseMetrics.latencyMs +
      gainDeficitDb * 0.8 +
      rainPenalty * 1.7 +
      ituPenalty * 0.9 -
      Math.min(4, gainBonusDb * 0.15)
  );
  const jitterMs = roundMetric(
    Math.max(
      0.2,
      baseMetrics.jitterMs +
        gainDeficitDb * 0.2 +
        rainPenalty * 0.38 +
        ituPenalty * 0.16 -
        Math.min(1.5, gainBonusDb * 0.05)
    )
  );
  const networkSpeedMbps = roundMetric(
    Math.max(
      1,
      baseMetrics.networkSpeedMbps +
        gainBonusDb * 5.5 -
        gainDeficitDb * 3.4 -
        rainPenalty * 4.4 -
        ituPenalty * 1.9
    )
  );

  return {
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
    latencyMs,
    jitterMs,
    networkSpeedMbps,
    provenanceKind: "bounded-proxy"
  };
}

function findProjectedMetrics(
  projectedMetrics: ReadonlyArray<ProjectedPhysicalDecisionMetrics>,
  candidateId: string
): ProjectedPhysicalDecisionMetrics {
  const projected = projectedMetrics.find((candidate) => candidate.candidateId === candidateId);

  if (!projected) {
    throw new Error(`Missing projected physical metrics for candidate: ${candidateId}`);
  }

  return projected;
}

function resolveDefaultContextLabel(window: PhysicalInputWindow): string {
  const startPercent = Math.round(clampRatio(window.startRatio) * 100);
  const stopPercent = Math.round(clampRatio(window.stopRatio) * 100);
  return `Active physical window ${startPercent}-${stopPercent}%`;
}

function assertEvaluatedAtWithinRange(
  evaluatedAt: ClockTimestamp,
  normalizedRange: NormalizedTimeRange
): number {
  const evaluatedAtMs = toEpochMilliseconds(evaluatedAt);

  if (
    evaluatedAtMs < normalizedRange.startMs ||
    evaluatedAtMs > normalizedRange.stopMs
  ) {
    throw new Error(
      "Physical-input evaluatedAt must stay within the activeRange."
    );
  }

  return evaluatedAtMs;
}

export function resolvePhysicalInputProgressRatio(
  evaluatedAt: ClockTimestamp,
  activeRange: {
    start: ClockTimestamp;
    stop: ClockTimestamp;
  }
): number {
  const normalizedRange = normalizeTimeRange(activeRange);
  const evaluatedAtMs = assertEvaluatedAtWithinRange(evaluatedAt, normalizedRange);

  if (normalizedRange.startMs === normalizedRange.stopMs) {
    return 0;
  }

  return (
    (evaluatedAtMs - normalizedRange.startMs) /
    (normalizedRange.stopMs - normalizedRange.startMs)
  );
}

export function resolveActivePhysicalInputWindow(
  windows: ReadonlyArray<PhysicalInputWindow>,
  progressRatio: number
): PhysicalInputWindow {
  const ratio = clampRatio(progressRatio);
  const resolvedWindow =
    windows.find(
      (window) =>
        ratio >= window.startRatio &&
        (ratio < window.stopRatio || window.stopRatio === 1)
    ) ?? windows[windows.length - 1];

  if (!resolvedWindow) {
    throw new Error("Physical-input source must define at least one window.");
  }

  assertRatioWindow(resolvedWindow);

  return {
    startRatio: resolvedWindow.startRatio,
    stopRatio: resolvedWindow.stopRatio,
    candidates: resolvedWindow.candidates.map((candidate) =>
      cloneCandidatePhysicalInputs(candidate)
    )
  };
}

export function resolvePhysicalInputSourceEntry(
  catalog: PhysicalInputSourceCatalog,
  scenarioId: string
): PhysicalInputSourceEntry {
  const entry = catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);

  if (!entry) {
    throw new Error(`Missing physical-input source entry for scenario: ${scenarioId}`);
  }

  return {
    scenarioId: entry.scenarioId,
    windows: entry.windows.map((window) => {
      assertRatioWindow(window);

      return {
        startRatio: window.startRatio,
        stopRatio: window.stopRatio,
        candidates: window.candidates.map((candidate) =>
          cloneCandidatePhysicalInputs(candidate)
        )
      };
    }),
    provenance: entry.provenance.map((provenance) =>
      clonePhysicalInputProvenance(provenance)
    )
  };
}

export function createPhysicalInputState({
  scenario,
  activeRange,
  evaluatedAt,
  sourceEntry,
  activeContextLabel
}: PhysicalInputStateOptions): PhysicalInputState {
  const normalizedRange = normalizeTimeRange(activeRange);
  const evaluatedAtMs = assertEvaluatedAtWithinRange(evaluatedAt, normalizedRange);
  const evaluatedAtIso = new Date(evaluatedAtMs).toISOString();
  const progressRatio = resolvePhysicalInputProgressRatio(evaluatedAtIso, activeRange);
  const activeWindow = resolveActivePhysicalInputWindow(sourceEntry.windows, progressRatio);
  const candidates = activeWindow.candidates.map((candidate) =>
    cloneCandidatePhysicalInputs(candidate)
  );
  const projectedMetrics = candidates.map((candidate) =>
    projectCandidateMetrics(candidate)
  );
  const provenance = sourceEntry.provenance.map((entry) =>
    clonePhysicalInputProvenance(entry)
  );
  const contextLabel = activeContextLabel ?? resolveDefaultContextLabel(activeWindow);

  return {
    scenario: {
      id: scenario.id,
      label: scenario.label
    },
    activeRange: {
      start: normalizedRange.startIso,
      stop: normalizedRange.stopIso
    },
    evaluatedAt: evaluatedAtIso,
    activeWindow: {
      startRatio: activeWindow.startRatio,
      stopRatio: activeWindow.stopRatio,
      contextLabel
    },
    provenance,
    candidates,
    projectedMetrics,
    projectionTarget: PHYSICAL_INPUT_PROJECTION_TARGET,
    disclaimer: PHYSICAL_INPUT_BOUNDARY_NOTE,
    report: {
      schemaVersion: PHYSICAL_INPUT_REPORT_SCHEMA_VERSION,
      scenario: {
        id: scenario.id,
        label: scenario.label
      },
      activeRange: {
        start: normalizedRange.startIso,
        stop: normalizedRange.stopIso,
        durationMs: normalizedRange.stopMs - normalizedRange.startMs
      },
      evaluatedAt: evaluatedAtIso,
      activeWindow: {
        startRatio: activeWindow.startRatio,
        stopRatio: activeWindow.stopRatio,
        contextLabel
      },
      provenance,
      projectionTarget: PHYSICAL_INPUT_PROJECTION_TARGET,
      disclaimer: PHYSICAL_INPUT_BOUNDARY_NOTE,
      candidates: candidates.map((candidate) => {
        const baseMetrics = resolveBaseMetrics(candidate);
        const projected = findProjectedMetrics(
          projectedMetrics,
          candidate.candidateId
        );

        return {
          candidateId: candidate.candidateId,
          orbitClass: candidate.orbitClass,
          ...(candidate.pathRole ? { pathRole: candidate.pathRole } : {}),
          ...(candidate.pathControlMode
            ? { pathControlMode: candidate.pathControlMode }
            : {}),
          ...(candidate.infrastructureSelectionMode
            ? {
                infrastructureSelectionMode:
                  candidate.infrastructureSelectionMode
              }
            : {}),
          antenna: cloneAntennaInputs(candidate.antenna),
          rain: cloneRainInputs(candidate.rain),
          itu: cloneItuInputs(candidate.itu),
          baseMetrics,
          projectedMetrics: {
            latencyMs: projected.latencyMs,
            jitterMs: projected.jitterMs,
            networkSpeedMbps: projected.networkSpeedMbps
          }
        };
      })
    }
  };
}

export function formatPhysicalInputFamilyLabel(
  family: PhysicalInputFamily
): string {
  switch (family) {
    case "antenna":
      return "Antenna";
    case "rain-attenuation":
      return "Rain";
    case "itu-style":
      return "ITU-style";
  }
}

export function formatPhysicalInputWindowLabel(
  activeWindow: PhysicalInputActiveWindow
): string {
  const startPercent = Math.round(clampRatio(activeWindow.startRatio) * 100);
  const stopPercent = Math.round(clampRatio(activeWindow.stopRatio) * 100);
  return `${activeWindow.contextLabel} (${startPercent}-${stopPercent}%)`;
}

export function formatPhysicalInputProvenanceSummary(
  provenance: ReadonlyArray<PhysicalInputProvenance>
): string {
  return provenance
    .map((entry) => `${formatPhysicalInputFamilyLabel(entry.family)}: ${entry.kind}`)
    .join(" | ");
}

export function formatPhysicalInputProvenanceDetail(
  provenance: ReadonlyArray<PhysicalInputProvenance>
): string {
  return provenance
    .map((entry) => {
      const sourceRef = entry.sourceRef ? ` [${entry.sourceRef}]` : "";
      return `${formatPhysicalInputFamilyLabel(entry.family)}: ${entry.detail}${sourceRef}`;
    })
    .join(" | ");
}

export function formatProjectedPhysicalMetricSummary(
  state: PhysicalInputState
): string {
  return `${state.projectedMetrics.length} candidates -> latency / jitter / speed`;
}

export function createPhysicalInputSourceCatalog(
  entries: ReadonlyArray<PhysicalInputSourceEntry>
): PhysicalInputSourceCatalog {
  return {
    entries: entries.map((entry) => ({
      scenarioId: entry.scenarioId,
      windows: entry.windows.map((window) => ({
        startRatio: window.startRatio,
        stopRatio: window.stopRatio,
        candidates: window.candidates.map((candidate) =>
          cloneCandidatePhysicalInputs(candidate)
        )
      })),
      provenance: entry.provenance.map((provenance) =>
        clonePhysicalInputProvenance(provenance)
      )
    }))
  };
}
