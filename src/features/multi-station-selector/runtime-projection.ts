import {
  DEFAULT_HANDOVER_POLICY_ID,
  HANDOVER_DECISION_PROXY_PROVENANCE,
  evaluateHandoverDecisionSnapshot,
  type HandoverCandidateMetrics,
  type HandoverDecisionSnapshot,
  type HandoverPolicyId
} from "../handover-decision/handover-decision";

import {
  ORBIT_CLASS_CARRIER_DEFAULTS,
  computeFreeSpacePathLossDb
} from "../../runtime/link-budget/free-space-path-loss";
import { computeGasAbsorptionDb } from "../../runtime/link-budget/gas-absorption";
import { computeRainAttenuationDb } from "../../runtime/link-budget/rain-attenuation";
import {
  evaluateHandoverPolicy,
  type HandoverCandidate,
  type HandoverDecision as LinkBudgetHandoverDecision
} from "../../runtime/link-budget/handover-policy";

import {
  inferPairSourceTier,
  type PairSourceTierAttribution,
  type PublicRegistryStation
} from "./tier-inference";

import {
  computeVisibilityWindowsForStation,
  intersectStationWindowsForPair,
  parseTleListFromText,
  type OrbitClass,
  type PairVisibilityWindow,
  type StationGeodetic,
  type TleRecord
} from "./visibility-utils";

const DEFAULT_SAMPLE_STEP_SECONDS = 30;
const DEFAULT_ELEVATION_THRESHOLD_DEG = 10;
const DEFAULT_LEO_CAP = 60;
const DEFAULT_MEO_CAP = 60;
const DEFAULT_GEO_CAP = 60;
const EARTH_RADIUS_KM = 6371;
const SPEED_OF_LIGHT_KM_PER_SECOND = 299_792.458;
const FIXED_PROCESSING_DELAY_MS = 2;
const REPRESENTATIVE_ELEVATION_DEG = 35;
const MIN_ELEVATION_FOR_MODEL_DEG = 1;
const MIN_NETWORK_SPEED_MBPS = 0.1;
const RAIN_MODEL_MIN_FREQUENCY_GHZ = 10;
const RAIN_MODEL_MAX_FREQUENCY_GHZ = 30;
const RELATIVE_RSRP_REFERENCE_DBM = 0;

const NOMINAL_ALTITUDE_KM_BY_ORBIT: Readonly<Record<OrbitClass, number>> = {
  LEO: 550,
  MEO: 23222,
  GEO: 35786
};

const CLEAR_SKY_REFERENCE_CAPACITY_MBPS_BY_ORBIT: Readonly<Record<OrbitClass, number>> = {
  LEO: 200,
  MEO: 100,
  GEO: 50
};

const BASELINE_JITTER_MS_BY_ORBIT: Readonly<Record<OrbitClass, number>> = {
  LEO: 3,
  MEO: 5,
  GEO: 8
};

const ORBIT_CLASS_TO_ENGINE: Readonly<Record<OrbitClass, "leo" | "meo" | "geo">> = {
  LEO: "leo",
  MEO: "meo",
  GEO: "geo"
};

const CROSS_ORBIT_LIVE_POLICY_CONFIG = {
  policyId: "cross-orbit-live",
  hysteresisDb: 2,
  minVisibilityWindowMs: 60_000,
  latencyBudgetMs: 600
} as const;

const TLE_FIXTURE_PATHS: Readonly<Record<OrbitClass, string>> = {
  LEO: "/fixtures/satellites/leo-scale/starlink-2026-05-12T12-35-35Z.tle",
  MEO: "/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle",
  GEO: "/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle"
};

export interface HandoverEvent {
  readonly handoverAtUtc: string;
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
  readonly reasonKind:
    | "current-link-unavailable"
    | "better-candidate-available"
    | "policy-tie-break";
}

export interface CommunicationStats {
  readonly totalCommunicatingMs: number;
  readonly byOrbit: Record<OrbitClass, number>;
  readonly handoverCount: number;
  readonly meanLinkDwellMs: number;
}

export interface TruthBoundary {
  readonly precisionLabel: "operator-family-precision" | "modeled-precision";
  readonly sourceTier: PairSourceTierAttribution["sourceTier"];
  readonly nonClaims: ReadonlyArray<string>;
}

export interface RuntimeProjectionInput {
  readonly stationA: PublicRegistryStation;
  readonly stationB: PublicRegistryStation;
  readonly timeWindow: { startUtc: string; endUtc: string };
  readonly tleRecords: ReadonlyArray<TleRecord>;
  readonly sampleStepSeconds?: number;
  readonly elevationThresholdDeg?: number;
  readonly handoverPolicyId?: HandoverPolicyId;
  readonly rainRateMmPerHour?: number;
  readonly enableCrossOrbitLivePolicy?: boolean;
}

export interface RuntimeProjectionResult {
  readonly pair: {
    readonly stationA: PublicRegistryStation;
    readonly stationB: PublicRegistryStation;
  };
  readonly timeWindow: { readonly startUtc: string; readonly endUtc: string };
  readonly visibleConstellations: Readonly<
    Record<
      OrbitClass,
      ReadonlyArray<{ readonly satelliteId: string; readonly tleSource: string }>
    >
  >;
  readonly visibilityWindows: ReadonlyArray<PairVisibilityWindow>;
  readonly handoverEvents: ReadonlyArray<HandoverEvent>;
  readonly communicationStats: CommunicationStats;
  readonly truthBoundary: TruthBoundary;
}

export interface RuntimeTleSources {
  readonly leoTleText: string;
  readonly meoTleText: string;
  readonly geoTleText: string;
}

export interface LinkBudgetMetricOptions {
  readonly representativeElevationDeg?: number;
  readonly rainRateMmPerHour?: number;
}

export interface LinkBudgetMetrics {
  readonly latencyMs: number;
  readonly jitterMs: number;
  readonly networkSpeedMbps: number;
}

interface LinkBudgetDetails extends LinkBudgetMetrics {
  readonly representativeElevationDeg: number;
  readonly slantRangeKm: number;
  readonly totalPathLossDb: number;
  readonly freeSpacePathLossDb: number;
  readonly gasAbsorptionDb: number;
  readonly rainAttenuationDb: number;
}

interface HandoverSampleOptions {
  readonly elevationThresholdDeg: number;
  readonly rainRateMmPerHour: number;
  readonly enableCrossOrbitLivePolicy: boolean;
}

function toStationGeodetic(station: PublicRegistryStation): StationGeodetic {
  return { lat: station.lat, lon: station.lon };
}

function capTleRecords(
  records: ReadonlyArray<TleRecord>,
  caps: Record<OrbitClass, number>
): ReadonlyArray<TleRecord> {
  const counts: Record<OrbitClass, number> = { LEO: 0, MEO: 0, GEO: 0 };
  const kept: TleRecord[] = [];
  for (const record of records) {
    const c = counts[record.orbitClass];
    if (c >= caps[record.orbitClass]) {
      continue;
    }
    counts[record.orbitClass] = c + 1;
    kept.push(record);
  }
  return kept;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}

function normalizeRainRateMmPerHour(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

function normalizeElevationDeg(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return REPRESENTATIVE_ELEVATION_DEG;
  }
  return clampNumber(value, MIN_ELEVATION_FOR_MODEL_DEG, 90);
}

function computeRepresentativeElevationDeg(
  window: PairVisibilityWindow | undefined
): number {
  if (!window) {
    return REPRESENTATIVE_ELEVATION_DEG;
  }

  return normalizeElevationDeg(
    Math.min(
      window.stationAWindow.maxElevationDeg,
      window.stationBWindow.maxElevationDeg
    )
  );
}

function computeRepresentativeSlantRangeKm(
  orbitClass: OrbitClass,
  elevationDeg: number
): number {
  const altitudeKm = NOMINAL_ALTITUDE_KM_BY_ORBIT[orbitClass];
  const earthToSatelliteRadiusKm = EARTH_RADIUS_KM + altitudeKm;
  const elevationRad = (elevationDeg * Math.PI) / 180;

  // 3GPP TR 38.811 §6.7 -- propagation delay from slant range.
  // Spherical-earth geometry: rho = sqrt((Re+h)^2 - (Re*cos(E))^2) - Re*sin(E),
  // where E is station elevation, h is nominal orbit altitude, and Re is 6371 km.
  return (
    Math.sqrt(
      earthToSatelliteRadiusKm * earthToSatelliteRadiusKm -
        Math.pow(EARTH_RADIUS_KM * Math.cos(elevationRad), 2)
    ) -
    EARTH_RADIUS_KM * Math.sin(elevationRad)
  );
}

function computeRainAttenuationForCarrierDb(options: {
  readonly rainRateMmPerHour: number;
  readonly carrierFrequencyGHz: number;
  readonly elevationDeg: number;
}): number {
  const rainRateMmPerHour = normalizeRainRateMmPerHour(options.rainRateMmPerHour);
  if (rainRateMmPerHour === 0) {
    return 0;
  }

  if (
    options.carrierFrequencyGHz < RAIN_MODEL_MIN_FREQUENCY_GHZ ||
    options.carrierFrequencyGHz > RAIN_MODEL_MAX_FREQUENCY_GHZ
  ) {
    return 0;
  }

  // ITU-R P.618-14 §2.2.1.1 / §2.2.1.2 -- rain specific attenuation and effective slant path.
  return computeRainAttenuationDb({
    rainRateMmPerHour,
    carrierFrequencyGHz: options.carrierFrequencyGHz,
    elevationDeg: options.elevationDeg,
    stationHeightAboveSeaKm: 0,
    polarization: "circular"
  });
}

function computeLinkBudgetDetailsForOrbit(
  orbitClass: OrbitClass,
  options: LinkBudgetMetricOptions = {}
): LinkBudgetDetails {
  const representativeElevationDeg = normalizeElevationDeg(
    options.representativeElevationDeg
  );
  const rainRateMmPerHour = normalizeRainRateMmPerHour(options.rainRateMmPerHour);
  const carrierFrequencyGHz =
    ORBIT_CLASS_CARRIER_DEFAULTS[orbitClass].carrierFrequencyGHz;
  const slantRangeKm = computeRepresentativeSlantRangeKm(
    orbitClass,
    representativeElevationDeg
  );

  const freeSpacePathLossDb = computeFreeSpacePathLossDb({
    slantRangeKm,
    carrierFrequencyGHz
  });
  // ITU-R P.676-13 Annex 2 -- simplified clear-air slant-path gas absorption.
  const gasAbsorptionDb = computeGasAbsorptionDb({
    carrierFrequencyGHz,
    elevationDeg: representativeElevationDeg
  });
  const rainAttenuationDb = computeRainAttenuationForCarrierDb({
    rainRateMmPerHour,
    carrierFrequencyGHz,
    elevationDeg: representativeElevationDeg
  });
  const totalPathLossDb =
    freeSpacePathLossDb + gasAbsorptionDb + rainAttenuationDb;

  // 3GPP TR 38.811 §6.7 -- one-way propagation delay, not RTT; add a small fixed processing term.
  const latencyMs =
    (slantRangeKm / SPEED_OF_LIGHT_KM_PER_SECOND) * 1000 +
    FIXED_PROCESSING_DELAY_MS;
  const excessAttenuationDb = gasAbsorptionDb + rainAttenuationDb;
  // Reference capacity is the old clear-sky anchor; atmospheric fade applies a soft exponential de-rating.
  const networkSpeedMbps = Math.max(
    MIN_NETWORK_SPEED_MBPS,
    CLEAR_SKY_REFERENCE_CAPACITY_MBPS_BY_ORBIT[orbitClass] *
      Math.exp(-excessAttenuationDb / 20)
  );
  const jitterScale = 1 + Math.min(rainAttenuationDb / 20, 3);
  const jitterMs = BASELINE_JITTER_MS_BY_ORBIT[orbitClass] * jitterScale;

  return {
    latencyMs: roundMetric(latencyMs),
    jitterMs: roundMetric(jitterMs),
    networkSpeedMbps: roundMetric(networkSpeedMbps),
    representativeElevationDeg,
    slantRangeKm: roundMetric(slantRangeKm),
    totalPathLossDb: roundMetric(totalPathLossDb),
    freeSpacePathLossDb: roundMetric(freeSpacePathLossDb),
    gasAbsorptionDb: roundMetric(gasAbsorptionDb),
    rainAttenuationDb: roundMetric(rainAttenuationDb)
  };
}

export function computeLinkBudgetMetricsForOrbit(
  orbitClass: OrbitClass,
  options: LinkBudgetMetricOptions = {}
): LinkBudgetMetrics {
  const details = computeLinkBudgetDetailsForOrbit(orbitClass, options);
  return {
    latencyMs: details.latencyMs,
    jitterMs: details.jitterMs,
    networkSpeedMbps: details.networkSpeedMbps
  };
}

function selectVisibleConstellations(
  windows: ReadonlyArray<PairVisibilityWindow>,
  records: ReadonlyArray<TleRecord>
): Record<
  OrbitClass,
  ReadonlyArray<{ readonly satelliteId: string; readonly tleSource: string }>
> {
  const tleSourceById = new Map<string, string>();
  for (const r of records) {
    tleSourceById.set(
      r.satelliteId,
      `${r.tleLine1.slice(0, 16)}…/${r.tleLine2.slice(0, 8)}…`
    );
  }
  const seenByOrbit: Record<OrbitClass, Set<string>> = {
    LEO: new Set(),
    MEO: new Set(),
    GEO: new Set()
  };
  for (const w of windows) {
    seenByOrbit[w.orbitClass].add(w.satelliteId);
  }
  const result: Record<
    OrbitClass,
    Array<{ satelliteId: string; tleSource: string }>
  > = { LEO: [], MEO: [], GEO: [] };
  for (const orbit of ["LEO", "MEO", "GEO"] as OrbitClass[]) {
    for (const id of seenByOrbit[orbit]) {
      result[orbit].push({
        satelliteId: id,
        tleSource: tleSourceById.get(id) ?? "unknown"
      });
    }
    result[orbit].sort((a, b) => a.satelliteId.localeCompare(b.satelliteId));
  }
  return result;
}

function computeLinkBudgetDetailsForWindow(
  window: PairVisibilityWindow,
  rainRateMmPerHour: number
): LinkBudgetDetails {
  return computeLinkBudgetDetailsForOrbit(window.orbitClass, {
    representativeElevationDeg: computeRepresentativeElevationDeg(window),
    rainRateMmPerHour
  });
}

function toSnapshotCandidate(
  window: PairVisibilityWindow,
  details: LinkBudgetDetails
): HandoverCandidateMetrics {
  return {
    candidateId: window.satelliteId,
    orbitClass: ORBIT_CLASS_TO_ENGINE[window.orbitClass],
    latencyMs: details.latencyMs,
    jitterMs: details.jitterMs,
    networkSpeedMbps: details.networkSpeedMbps,
    provenance: HANDOVER_DECISION_PROXY_PROVENANCE
  };
}

function toLivePolicyCandidate(
  window: PairVisibilityWindow,
  details: LinkBudgetDetails,
  sampleTimeMs: number
): HandoverCandidate {
  const intersectionEndMs = Date.parse(window.intersectionEndUtc);
  const predictedVisibilityRemainingMs = Number.isFinite(intersectionEndMs)
    ? Math.max(0, intersectionEndMs - sampleTimeMs)
    : 0;

  return {
    id: window.satelliteId,
    orbitClass: window.orbitClass,
    elevationDeg: details.representativeElevationDeg,
    // Relative RSRP proxy: unknown EIRP and antenna gains collapse to a constant offset.
    rsrpDbm: roundMetric(RELATIVE_RSRP_REFERENCE_DBM - details.totalPathLossDb),
    predictedVisibilityRemainingMs,
    latencyMs: details.latencyMs,
    jitterMs: details.jitterMs
  };
}

function mapPolicyReasonToHandoverEventReason(
  reasonKind: LinkBudgetHandoverDecision["reasonKind"]
): HandoverEvent["reasonKind"] {
  if (reasonKind === "cross-orbit-migration") {
    // HandoverEvent is consumed by the existing panel with a narrower reason union.
    return "better-candidate-available";
  }
  return reasonKind;
}

function deriveHandoverEventsAtSampleStep(
  windows: ReadonlyArray<PairVisibilityWindow>,
  timeWindow: { startUtc: string; endUtc: string },
  sampleStepSeconds: number,
  policyId: HandoverPolicyId,
  scenarioId: string,
  options: HandoverSampleOptions
): {
  readonly handoverEvents: ReadonlyArray<HandoverEvent>;
  readonly totalCommunicatingMs: number;
  readonly byOrbitMs: Record<OrbitClass, number>;
} {
  const startMs = Date.parse(timeWindow.startUtc);
  const endMs = Date.parse(timeWindow.endUtc);
  const stepMs = sampleStepSeconds * 1000;
  const events: HandoverEvent[] = [];
  const byOrbitMs: Record<OrbitClass, number> = { LEO: 0, MEO: 0, GEO: 0 };
  let totalCommunicatingMs = 0;
  let currentServingCandidateId: string | undefined;

  for (let t = startMs; t < endMs; t += stepMs) {
    const sampleIso = new Date(t).toISOString();
    const visibleAtSample: PairVisibilityWindow[] = [];
    for (const w of windows) {
      const wStart = Date.parse(w.intersectionStartUtc);
      const wEnd = Date.parse(w.intersectionEndUtc);
      if (t >= wStart && t < wEnd) {
        visibleAtSample.push(w);
      }
    }

    const linkBudgetRows = visibleAtSample.map((w) => ({
      window: w,
      details: computeLinkBudgetDetailsForWindow(w, options.rainRateMmPerHour)
    }));

    let next: string | undefined;
    let eventReason: HandoverEvent["reasonKind"] | undefined;

    if (options.enableCrossOrbitLivePolicy) {
      if (linkBudgetRows.length > 0) {
        const decision = evaluateHandoverPolicy({
          candidates: linkBudgetRows.map((row) =>
            toLivePolicyCandidate(row.window, row.details, t)
          ),
          currentServingId: currentServingCandidateId,
          policy: {
            ...CROSS_ORBIT_LIVE_POLICY_CONFIG,
            elevationThresholdDeg: options.elevationThresholdDeg,
            minVisibilityWindowMs: Math.max(
              CROSS_ORBIT_LIVE_POLICY_CONFIG.minVisibilityWindowMs,
              stepMs
            )
          },
          nowUtc: sampleIso
        });
        next = decision.selectedId;
        eventReason = mapPolicyReasonToHandoverEventReason(decision.reasonKind);
      }
    } else {
      const candidates: HandoverCandidateMetrics[] = linkBudgetRows.map((row) =>
        toSnapshotCandidate(row.window, row.details)
      );

      const snapshot: HandoverDecisionSnapshot = {
        scenarioId,
        evaluatedAt: sampleIso,
        activeRange: {
          start: timeWindow.startUtc,
          stop: timeWindow.endUtc
        },
        currentServingCandidateId,
        policyId,
        candidates
      };

      const state = evaluateHandoverDecisionSnapshot(snapshot);
      next = state.result.servingCandidateId;
      eventReason =
        currentServingCandidateId === undefined
          ? "current-link-unavailable"
          : state.result.decisionKind === "switch"
            ? "better-candidate-available"
            : "policy-tie-break";
    }

    if (next) {
      totalCommunicatingMs += stepMs;
      const orbit = visibleAtSample.find((w) => w.satelliteId === next)?.orbitClass;
      if (orbit) {
        byOrbitMs[orbit] += stepMs;
      }
      if (next !== currentServingCandidateId) {
        events.push({
          handoverAtUtc: sampleIso,
          fromSatelliteId: currentServingCandidateId ?? null,
          toSatelliteId: next,
          reasonKind: eventReason ?? "policy-tie-break"
        });
        currentServingCandidateId = next;
      }
    } else {
      currentServingCandidateId = undefined;
    }
  }

  return { handoverEvents: events, totalCommunicatingMs, byOrbitMs };
}

function buildTruthBoundary(
  stationA: PublicRegistryStation,
  stationB: PublicRegistryStation,
  rainRateMmPerHour: number
): TruthBoundary {
  const attribution = inferPairSourceTier(stationA, stationB);
  const precisionLabel: TruthBoundary["precisionLabel"] =
    attribution.sourceTier === "public-disclosed"
      ? "operator-family-precision"
      : "modeled-precision";
  const metricNonClaims = [
    "Per-orbit communication metrics are modeled-precision via 3GPP TR 38.811 + ITU-R P.618-14 / P.676-13, not flat nominal constants or measured service telemetry.",
    ...(rainRateMmPerHour > 0
      ? [
          "Rain-rate attenuation uses the ITU-R P.837 global default context when supplied without local calibration."
        ]
      : [])
  ];
  return {
    precisionLabel,
    sourceTier: attribution.sourceTier,
    nonClaims: [...attribution.nonClaims, ...metricNonClaims]
  };
}

export function computeRuntimeProjection(
  input: RuntimeProjectionInput
): RuntimeProjectionResult {
  const sampleStepSeconds = input.sampleStepSeconds ?? DEFAULT_SAMPLE_STEP_SECONDS;
  const elevationThresholdDeg =
    input.elevationThresholdDeg ?? DEFAULT_ELEVATION_THRESHOLD_DEG;
  const policyId = input.handoverPolicyId ?? DEFAULT_HANDOVER_POLICY_ID;
  const rainRateMmPerHour = normalizeRainRateMmPerHour(input.rainRateMmPerHour);
  const enableCrossOrbitLivePolicy = input.enableCrossOrbitLivePolicy ?? false;

  const cappedRecords = capTleRecords(input.tleRecords, {
    LEO: DEFAULT_LEO_CAP,
    MEO: DEFAULT_MEO_CAP,
    GEO: DEFAULT_GEO_CAP
  });

  const sampleConfig = {
    startUtc: input.timeWindow.startUtc,
    endUtc: input.timeWindow.endUtc,
    stepSeconds: sampleStepSeconds,
    elevationThresholdDeg
  };

  const stationAWindows = computeVisibilityWindowsForStation(
    toStationGeodetic(input.stationA),
    cappedRecords,
    sampleConfig
  );
  const stationBWindows = computeVisibilityWindowsForStation(
    toStationGeodetic(input.stationB),
    cappedRecords,
    sampleConfig
  );

  const visibilityWindows = intersectStationWindowsForPair(
    stationAWindows,
    stationBWindows,
    cappedRecords
  );

  const scenarioId = `runtime-projection:${input.stationA.id}:${input.stationB.id}`;
  const { handoverEvents, totalCommunicatingMs, byOrbitMs } =
    deriveHandoverEventsAtSampleStep(
      visibilityWindows,
      input.timeWindow,
      sampleStepSeconds,
      policyId,
      scenarioId,
      {
        elevationThresholdDeg,
        rainRateMmPerHour,
        enableCrossOrbitLivePolicy
      }
    );

  const meanLinkDwellMs =
    handoverEvents.length === 0
      ? totalCommunicatingMs
      : Math.round(totalCommunicatingMs / Math.max(handoverEvents.length, 1));

  const communicationStats: CommunicationStats = {
    totalCommunicatingMs,
    byOrbit: byOrbitMs,
    handoverCount: handoverEvents.length,
    meanLinkDwellMs
  };

  return {
    pair: { stationA: input.stationA, stationB: input.stationB },
    timeWindow: input.timeWindow,
    visibleConstellations: selectVisibleConstellations(
      visibilityWindows,
      cappedRecords
    ),
    visibilityWindows,
    handoverEvents,
    communicationStats,
    truthBoundary: buildTruthBoundary(
      input.stationA,
      input.stationB,
      rainRateMmPerHour
    )
  };
}

export async function loadDefaultTleSources(
  fetchImpl: typeof fetch = fetch
): Promise<RuntimeTleSources> {
  const [leoTleText, meoTleText, geoTleText] = await Promise.all([
    fetchImpl(TLE_FIXTURE_PATHS.LEO).then((r) => r.text()),
    fetchImpl(TLE_FIXTURE_PATHS.MEO).then((r) => r.text()),
    fetchImpl(TLE_FIXTURE_PATHS.GEO).then((r) => r.text())
  ]);
  return { leoTleText, meoTleText, geoTleText };
}

export function parseRuntimeTleSources(
  sources: RuntimeTleSources
): ReadonlyArray<TleRecord> {
  return [
    ...parseTleListFromText(sources.leoTleText, "LEO"),
    ...parseTleListFromText(sources.meoTleText, "MEO"),
    ...parseTleListFromText(sources.geoTleText, "GEO")
  ];
}

export function buildDefaultTimeWindow(
  startUtc: string = new Date().toISOString(),
  durationMinutes: number = 20
): { startUtc: string; endUtc: string } {
  const startMs = Date.parse(startUtc);
  return {
    startUtc,
    endUtc: new Date(startMs + durationMinutes * 60_000).toISOString()
  };
}

export { type PairVisibilityWindow, type VisibilityWindow } from "./visibility-utils";
