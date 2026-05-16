import {
  DEFAULT_HANDOVER_POLICY_ID,
  HANDOVER_DECISION_PROXY_PROVENANCE,
  evaluateHandoverDecisionSnapshot,
  type HandoverCandidateMetrics,
  type HandoverDecisionSnapshot,
  type HandoverPolicyId
} from "../handover-decision/handover-decision";

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

const NOMINAL_METRICS_BY_ORBIT: Readonly<
  Record<OrbitClass, { latencyMs: number; jitterMs: number; networkSpeedMbps: number }>
> = {
  LEO: { latencyMs: 25, jitterMs: 3, networkSpeedMbps: 200 },
  MEO: { latencyMs: 100, jitterMs: 5, networkSpeedMbps: 100 },
  GEO: { latencyMs: 280, jitterMs: 8, networkSpeedMbps: 50 }
};

const ORBIT_CLASS_TO_ENGINE: Readonly<Record<OrbitClass, "leo" | "meo" | "geo">> = {
  LEO: "leo",
  MEO: "meo",
  GEO: "geo"
};

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

function deriveHandoverEventsAtSampleStep(
  windows: ReadonlyArray<PairVisibilityWindow>,
  timeWindow: { startUtc: string; endUtc: string },
  sampleStepSeconds: number,
  policyId: HandoverPolicyId,
  scenarioId: string
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

    const candidates: HandoverCandidateMetrics[] = visibleAtSample.map((w) => {
      const metrics = NOMINAL_METRICS_BY_ORBIT[w.orbitClass];
      return {
        candidateId: w.satelliteId,
        orbitClass: ORBIT_CLASS_TO_ENGINE[w.orbitClass],
        latencyMs: metrics.latencyMs,
        jitterMs: metrics.jitterMs,
        networkSpeedMbps: metrics.networkSpeedMbps,
        provenance: HANDOVER_DECISION_PROXY_PROVENANCE
      };
    });

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
    const next = state.result.servingCandidateId;
    if (next) {
      totalCommunicatingMs += stepMs;
      const orbit = visibleAtSample.find((w) => w.satelliteId === next)?.orbitClass;
      if (orbit) {
        byOrbitMs[orbit] += stepMs;
      }
      if (next !== currentServingCandidateId) {
        const reason = currentServingCandidateId === undefined
          ? "current-link-unavailable"
          : state.result.decisionKind === "switch"
            ? "better-candidate-available"
            : "policy-tie-break";
        events.push({
          handoverAtUtc: sampleIso,
          fromSatelliteId: currentServingCandidateId ?? null,
          toSatelliteId: next,
          reasonKind: reason
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
  stationB: PublicRegistryStation
): TruthBoundary {
  const attribution = inferPairSourceTier(stationA, stationB);
  const precisionLabel: TruthBoundary["precisionLabel"] =
    attribution.sourceTier === "public-disclosed"
      ? "operator-family-precision"
      : "modeled-precision";
  return {
    precisionLabel,
    sourceTier: attribution.sourceTier,
    nonClaims: attribution.nonClaims
  };
}

export function computeRuntimeProjection(
  input: RuntimeProjectionInput
): RuntimeProjectionResult {
  const sampleStepSeconds = input.sampleStepSeconds ?? DEFAULT_SAMPLE_STEP_SECONDS;
  const elevationThresholdDeg =
    input.elevationThresholdDeg ?? DEFAULT_ELEVATION_THRESHOLD_DEG;
  const policyId = input.handoverPolicyId ?? DEFAULT_HANDOVER_POLICY_ID;

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
      scenarioId
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
    truthBoundary: buildTruthBoundary(input.stationA, input.stationB)
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
