import {
  ORBIT_CLASS_CARRIER_DEFAULTS,
  computeFreeSpacePathLossDb
} from "../../runtime/link-budget/free-space-path-loss";
import { computeGasAbsorptionDb } from "../../runtime/link-budget/gas-absorption";
import { computeRainAttenuationDb } from "../../runtime/link-budget/rain-attenuation";
import {
  evaluateHandoverPolicy,
  type HandoverCandidate,
  type HandoverDecision as LinkBudgetHandoverDecision,
  type HandoverPolicyConfig
} from "../../runtime/link-budget/handover-policy";

import {
  inferPairSourceTier,
  type PairSourceTierAttribution,
  type PublicRegistryStation
} from "./tier-inference";

import {
  intersectStationWindowsForPair,
  type OrbitClass,
  type PairVisibilityWindow,
  type StationGeodetic,
  type TleRecord
} from "./visibility-utils";
import {
  computeVisibilityWindowsForStationByOrbitCadence,
  resolveVisibilityCadenceSecondsByOrbit
} from "./visibility-cadence-multi";
import {
  buildRuntimeDataCompletenessState,
  type RuntimeDataCompletenessState,
  type RuntimeTleSourceParseStats,
  type TleSourceMode,
  type RuntimeRainRateControlMode
} from "./runtime-data-completeness";
import {
  buildSceneCameraHintForProjection,
  buildSceneDisplayPolicy
} from "./tle-first-scene-view-model";
import {
  parseOrbitSourceText,
  toTleRecords,
  type OrbitSourceMetadata,
  type OrbitSourcePolicy
} from "./orbit-source-parser";

const DEFAULT_SAMPLE_STEP_SECONDS = 30;
const DEFAULT_ELEVATION_THRESHOLD_DEG = 10;
const DEFAULT_LEO_CAP = 200;
const DEFAULT_MEO_CAP = 100;
const DEFAULT_GEO_CAP = 60;
const DEFAULT_TLE_CAPS: Readonly<Record<OrbitClass, number>> = {
  LEO: DEFAULT_LEO_CAP,
  MEO: DEFAULT_MEO_CAP,
  GEO: DEFAULT_GEO_CAP
};
const ORBIT_CLASSES: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];
const EARTH_RADIUS_KM = 6371;
const SPEED_OF_LIGHT_KM_PER_SECOND = 299_792.458;
const FIXED_PROCESSING_DELAY_MS = 2;
const REPRESENTATIVE_ELEVATION_DEG = 35;
const MIN_ELEVATION_FOR_MODEL_DEG = 1;
const MIN_NETWORK_SPEED_MBPS = 0.1;
const RAIN_MODEL_MIN_FREQUENCY_GHZ = 10;
const RAIN_MODEL_MAX_FREQUENCY_GHZ = 30;
const RELATIVE_RSRP_REFERENCE_DBM = 0;

export type RuntimeHandoverPolicyId = HandoverPolicyConfig["policyId"];

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

type RuntimeHandoverPolicyProfile = Omit<
  HandoverPolicyConfig,
  "elevationThresholdDeg"
>;

const DEFAULT_RUNTIME_HANDOVER_POLICY_ID: RuntimeHandoverPolicyId =
  "cross-orbit-live";

const HANDOVER_POLICY_PROFILES: Readonly<
  Record<RuntimeHandoverPolicyId, RuntimeHandoverPolicyProfile>
> = {
  "cross-orbit-live": {
    policyId: "cross-orbit-live",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  },
  "leo-first": {
    policyId: "leo-first",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  },
  "bootstrap-balanced-v1": {
    policyId: "bootstrap-balanced-v1",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  }
};

export const TLE_FIXTURE_PATHS: Readonly<Record<OrbitClass, string>> = {
  LEO: "/fixtures/satellites/leo-scale/starlink-2026-05-12T12-35-35Z.tle",
  MEO: "/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle",
  GEO: "/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle"
};

const NETWORK_TLE_MANIFEST_PATH = "/fixtures/satellites-network/manifest.json";
const NETWORK_TLE_BASE_PATH = "/fixtures/satellites-network/";
const NETWORK_SATCAT_SUMMARY_PATH =
  "/fixtures/satellites-network/satcat-summary.json";
const DEFAULT_TLE_SOURCE_METADATA: OrbitSourceMetadata = {
  format: "tle-3le",
  apiClass: "celestrak-gp-tle",
  sourcePolicy: "refresh-artifact",
  catalogNumberCompatibility: "tle-limited-5-digit-catalog"
};

const SOURCE_HEALTH_THRESHOLD_DAYS: Readonly<Record<OrbitClass, number>> = {
  LEO: 14,
  MEO: 30,
  GEO: 30
};

export interface HandoverEvent {
  readonly handoverAtUtc: string;
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
  readonly reasonKind:
    | "current-link-unavailable"
    | "better-candidate-available"
    | "policy-tie-break"
    | "cross-orbit-migration";
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
  readonly tleParseStats?: ReadonlyArray<RuntimeTleSourceParseStats>;
  readonly sourcePaths?: Readonly<Record<OrbitClass, string>>;
  readonly sampleStepSeconds?: number;
  readonly sampleCadenceSecondsByOrbit?: Partial<Record<OrbitClass, number>>;
  readonly elevationThresholdDeg?: number;
  readonly rainRateMmPerHour?: number;
  readonly policyId?: RuntimeHandoverPolicyId | string | null;
}

export interface RuntimeProjectionResult {
  readonly pair: {
    readonly stationA: PublicRegistryStation;
    readonly stationB: PublicRegistryStation;
  };
  readonly timeWindow: { readonly startUtc: string; readonly endUtc: string };
  readonly sharedSupportedOrbits: ReadonlyArray<OrbitClass>;
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
  readonly dataCompleteness: RuntimeDataCompletenessState;
}

export interface RuntimeTleSources {
  readonly leoTleText: string;
  readonly meoTleText: string;
  readonly geoTleText: string;
  readonly sourceMode?: TleSourceMode;
  readonly sourcePaths?: Readonly<Record<OrbitClass, string>>;
  readonly snapshotFetchedUtc?: string | null;
  readonly manifestPath?: string | null;
  readonly sourceMetadataByOrbit?: Readonly<Record<OrbitClass, OrbitSourceMetadata>>;
  readonly satcatSummaryPath?: string | null;
  readonly satcatSummary?: ReadonlyArray<RuntimeSatcatSummaryEntry>;
}

export interface RuntimeSatcatSummaryEntry {
  readonly noradId: number;
  readonly objectName: string;
  readonly operatorFamily: string;
  readonly constellationName: string;
  readonly orbitClass: OrbitClass;
  readonly decayDate: string | null;
}

interface RuntimeTleNetworkManifestEntry {
  readonly path: string;
  readonly format?: OrbitSourceMetadata["format"];
  readonly apiClass?: OrbitSourceMetadata["apiClass"];
  readonly sourcePolicy?: OrbitSourceMetadata["sourcePolicy"];
  readonly catalogNumberCompatibility?: OrbitSourceMetadata["catalogNumberCompatibility"];
  readonly recordCount: number;
  readonly epochRangeUtc: {
    readonly startUtc: string | null;
    readonly endUtc: string | null;
  };
}

interface RuntimeTleNetworkManifest {
  readonly generatedAtUtc: string;
  readonly leo: RuntimeTleNetworkManifestEntry;
  readonly meo: RuntimeTleNetworkManifestEntry;
  readonly geo: RuntimeTleNetworkManifestEntry;
}

interface RuntimeTleSourceSelection {
  readonly sourceMode: TleSourceMode;
  readonly sourcePaths: Readonly<Record<OrbitClass, string>>;
  readonly snapshotFetchedUtc: string | null;
  readonly manifestPath: string | null;
  readonly manifest: RuntimeTleNetworkManifest | null;
  readonly sourceMetadataByOrbit: Readonly<Record<OrbitClass, OrbitSourceMetadata>>;
}

export interface LinkBudgetMetricOptions {
  readonly representativeElevationDeg?: number;
  readonly rainRateMmPerHour?: number;
  readonly stationHeightAboveSeaKm?: number;
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
  readonly policy: HandoverPolicyConfig;
  readonly rainRateMmPerHour: number;
  readonly stationHeightAboveSeaKm: number;
}

function toStationGeodetic(station: PublicRegistryStation): StationGeodetic {
  return { lat: station.lat, lon: station.lon, altMeters: station.elevationM };
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

function resolveBaseElevationThresholdDeg(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_ELEVATION_THRESHOLD_DEG;
  }
  return value;
}

export function resolveRuntimeHandoverPolicyId(
  value: string | null | undefined
): RuntimeHandoverPolicyId {
  if (
    value === "cross-orbit-live" ||
    value === "leo-first" ||
    value === "bootstrap-balanced-v1"
  ) {
    return value;
  }
  return DEFAULT_RUNTIME_HANDOVER_POLICY_ID;
}

function buildRuntimeHandoverPolicyConfig(
  policyId: RuntimeHandoverPolicyId,
  elevationThresholdDeg: number,
  sampleStepSeconds: number
): HandoverPolicyConfig {
  const profile = HANDOVER_POLICY_PROFILES[policyId];
  return {
    ...profile,
    elevationThresholdDeg,
    minVisibilityWindowMs: Math.max(
      profile.minVisibilityWindowMs,
      sampleStepSeconds * 1000
    )
  };
}

function computeEffectiveElevationThresholdDeg(
  baseElevationThresholdDeg: number,
  station: PublicRegistryStation
): number {
  return baseElevationThresholdDeg + station.terrainMaskDeg;
}

function normalizeElevationDeg(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return REPRESENTATIVE_ELEVATION_DEG;
  }
  return clampNumber(value, MIN_ELEVATION_FOR_MODEL_DEG, 90);
}

function computePairMidpointHeightAboveSeaKm(
  stationA: PublicRegistryStation,
  stationB: PublicRegistryStation
): number {
  return (stationA.elevationM + stationB.elevationM) / 2000;
}

function normalizeRainModelStationHeightAboveSeaKm(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
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
  readonly stationHeightAboveSeaKm: number;
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
  // Rain attenuation uses one representative link-path height; only negative altitude is clamped for the rain model.
  return computeRainAttenuationDb({
    rainRateMmPerHour,
    carrierFrequencyGHz: options.carrierFrequencyGHz,
    elevationDeg: options.elevationDeg,
    stationHeightAboveSeaKm: normalizeRainModelStationHeightAboveSeaKm(
      options.stationHeightAboveSeaKm
    ),
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
  const stationHeightAboveSeaKm =
    options.stationHeightAboveSeaKm === undefined ||
    !Number.isFinite(options.stationHeightAboveSeaKm)
      ? 0
      : options.stationHeightAboveSeaKm;
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
    elevationDeg: representativeElevationDeg,
    stationHeightAboveSeaKm
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
  rainRateMmPerHour: number,
  stationHeightAboveSeaKm: number
): LinkBudgetDetails {
  return computeLinkBudgetDetailsForOrbit(window.orbitClass, {
    representativeElevationDeg: computeRepresentativeElevationDeg(window),
    rainRateMmPerHour,
    stationHeightAboveSeaKm
  });
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
  // HandoverEvent.reasonKind now includes "cross-orbit-migration" so V-MO1
  // events keep their distinct reason in the side panel instead of
  // collapsing into "better-candidate-available". Identity mapping.
  return reasonKind;
}

function deriveHandoverEventsAtSampleStep(
  windows: ReadonlyArray<PairVisibilityWindow>,
  timeWindow: { startUtc: string; endUtc: string },
  sampleStepSeconds: number,
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
      details: computeLinkBudgetDetailsForWindow(
        w,
        options.rainRateMmPerHour,
        options.stationHeightAboveSeaKm
      )
    }));

    let next: string | undefined;
    let eventReason: HandoverEvent["reasonKind"] | undefined;

    if (linkBudgetRows.length > 0) {
      const decision = evaluateHandoverPolicy({
        candidates: linkBudgetRows.map((row) =>
          toLivePolicyCandidate(row.window, row.details, t)
        ),
        currentServingId: currentServingCandidateId,
        policy: options.policy,
        nowUtc: sampleIso
      });
      next = decision.selectedId;
      eventReason = mapPolicyReasonToHandoverEventReason(decision.reasonKind);
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
  rainRateMmPerHour: number,
  sharedSupportedOrbits: ReadonlyArray<OrbitClass>,
  tleSourceMode: TleSourceMode,
  tleParseStats: ReadonlyArray<RuntimeTleSourceParseStats> | undefined,
  handoverPolicyId: RuntimeHandoverPolicyId
): TruthBoundary {
  const attribution = inferPairSourceTier(stationA, stationB);
  const precisionLabel: TruthBoundary["precisionLabel"] =
    attribution.sourceTier === "public-disclosed"
      ? "operator-family-precision"
      : "modeled-precision";
  const membershipSummary = summarizeConstellationMembership(tleParseStats);
  const sourceAttributionNonClaims =
    tleSourceMode === "local-snapshot"
      ? []
      : [
          "TLE snapshot artifacts are attributed to CelesTrak public GP data; the browser reads bundled files only.",
          ...(membershipSummary
            ? [`SATCAT constellation membership in this TLE snapshot: ${membershipSummary}.`]
            : [])
        ];
  const metricNonClaims = [
    `Per-orbit communication metrics are modeled-precision via 3GPP TR 38.811 + ITU-R P.618-14 / P.676-13 and handover decisions use the ${handoverPolicyId} policy (TR 38.821 §7.3 + V-MO1 verbal addendum), not measured service telemetry.`,
    `Satellite candidates are limited to orbit classes disclosed by both selected stations (${sharedSupportedOrbits.join("/") || "none"}) and capped at LEO ${DEFAULT_TLE_CAPS.LEO}, MEO ${DEFAULT_TLE_CAPS.MEO}, GEO ${DEFAULT_TLE_CAPS.GEO} records for interactive compute.`,
    ...sourceAttributionNonClaims,
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

function summarizeConstellationMembership(
  tleParseStats: ReadonlyArray<RuntimeTleSourceParseStats> | undefined
): string | null {
  const counts = new Map<string, number>();
  for (const stats of tleParseStats ?? []) {
    for (const [family, count] of Object.entries(stats.constellationMembership ?? {})) {
      if (!family || !Number.isFinite(count) || count <= 0) {
        continue;
      }
      counts.set(family, (counts.get(family) ?? 0) + count);
    }
  }
  const top = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3);
  if (top.length === 0) {
    return null;
  }
  return top.map(([family, count]) => `${count} ${family}`).join(", ");
}

function resolveRainRateControlMode(
  rainRateMmPerHour: number | undefined
): RuntimeRainRateControlMode {
  return rainRateMmPerHour === undefined ? "fixture-default" : "user-controlled";
}

function resolveSharedSupportedOrbits(
  stationA: PublicRegistryStation,
  stationB: PublicRegistryStation
): ReadonlyArray<OrbitClass> {
  const stationAOrbits = new Set(stationA.supportedOrbits);
  const stationBOrbits = new Set(stationB.supportedOrbits);
  return ORBIT_CLASSES.filter(
    (orbitClass) =>
      stationAOrbits.has(orbitClass) && stationBOrbits.has(orbitClass)
  );
}

function filterRecordsByOrbit(
  records: ReadonlyArray<TleRecord>,
  allowedOrbits: ReadonlyArray<OrbitClass>
): ReadonlyArray<TleRecord> {
  const allowed = new Set(allowedOrbits);
  return records.filter((record) => allowed.has(record.orbitClass));
}

function resolveRuntimeVisibilityCadenceSecondsByOrbit(
  input: RuntimeProjectionInput
): Readonly<Record<OrbitClass, number>> {
  if (input.sampleCadenceSecondsByOrbit) {
    return resolveVisibilityCadenceSecondsByOrbit(input.sampleCadenceSecondsByOrbit);
  }
  if (input.sampleStepSeconds !== undefined) {
    return resolveVisibilityCadenceSecondsByOrbit({
      LEO: input.sampleStepSeconds,
      MEO: input.sampleStepSeconds,
      GEO: input.sampleStepSeconds
    });
  }
  return resolveVisibilityCadenceSecondsByOrbit();
}

function countServingTransitions(
  events: ReadonlyArray<HandoverEvent>
): number {
  return events.filter((event) => event.fromSatelliteId !== null).length;
}

function countVisibilityWindows(
  windowsBySatellite: ReadonlyMap<string, ReadonlyArray<unknown>>
): number {
  let count = 0;
  for (const windows of windowsBySatellite.values()) {
    count += windows.length;
  }
  return count;
}

function resolveProjectionSourcePaths(
  input: RuntimeProjectionInput
): Readonly<Record<OrbitClass, string>> {
  if (input.sourcePaths) {
    return input.sourcePaths;
  }
  const paths = { ...TLE_FIXTURE_PATHS };
  for (const stats of input.tleParseStats ?? []) {
    paths[stats.orbitClass] = stats.sourcePath;
  }
  return paths;
}

function resolveProjectionTleSourceMode(input: RuntimeProjectionInput): TleSourceMode {
  const modes = [
    ...new Set(
      (input.tleParseStats ?? [])
        .map((stats) => stats.sourceMode)
        .filter((mode): mode is TleSourceMode => Boolean(mode))
    )
  ];
  return modes.length === 1 ? modes[0] : "local-snapshot";
}

function resolveProjectionSnapshotFetchedUtc(
  input: RuntimeProjectionInput
): string | null {
  const values = [
    ...new Set(
      (input.tleParseStats ?? [])
        .map((stats) => stats.snapshotFetchedUtc)
        .filter((value): value is string => Boolean(value))
    )
  ];
  return values.length === 1 ? values[0] : null;
}

export function computeRuntimeProjection(
  input: RuntimeProjectionInput
): RuntimeProjectionResult {
  const sampleStepSeconds = input.sampleStepSeconds ?? DEFAULT_SAMPLE_STEP_SECONDS;
  const sampleCadenceSecondsByOrbit =
    resolveRuntimeVisibilityCadenceSecondsByOrbit(input);
  const baseElevationThresholdDeg = resolveBaseElevationThresholdDeg(
    input.elevationThresholdDeg
  );
  const stationAEffectiveElevationThresholdDeg =
    computeEffectiveElevationThresholdDeg(baseElevationThresholdDeg, input.stationA);
  const stationBEffectiveElevationThresholdDeg =
    computeEffectiveElevationThresholdDeg(baseElevationThresholdDeg, input.stationB);
  const handoverPolicyId = resolveRuntimeHandoverPolicyId(input.policyId);
  const handoverPolicy = buildRuntimeHandoverPolicyConfig(
    handoverPolicyId,
    baseElevationThresholdDeg,
    sampleStepSeconds
  );
  const pairMidpointHeightAboveSeaKm = computePairMidpointHeightAboveSeaKm(
    input.stationA,
    input.stationB
  );
  const rainRateMmPerHour = normalizeRainRateMmPerHour(input.rainRateMmPerHour);

  const sharedSupportedOrbits = resolveSharedSupportedOrbits(
    input.stationA,
    input.stationB
  );
  const cappedAllRecords = capTleRecords(input.tleRecords, {
    LEO: DEFAULT_TLE_CAPS.LEO,
    MEO: DEFAULT_TLE_CAPS.MEO,
    GEO: DEFAULT_TLE_CAPS.GEO
  });
  const cappedRecords = filterRecordsByOrbit(
    cappedAllRecords,
    sharedSupportedOrbits
  );

  const sampleConfigBase = {
    startUtc: input.timeWindow.startUtc,
    endUtc: input.timeWindow.endUtc,
    cadenceSecondsByOrbit: sampleCadenceSecondsByOrbit
  };
  const stationASampleConfig = {
    ...sampleConfigBase,
    elevationThresholdDeg: stationAEffectiveElevationThresholdDeg
  };
  const stationBSampleConfig = {
    ...sampleConfigBase,
    elevationThresholdDeg: stationBEffectiveElevationThresholdDeg
  };

  const stationAVisibility = computeVisibilityWindowsForStationByOrbitCadence(
    toStationGeodetic(input.stationA),
    cappedRecords,
    stationASampleConfig
  );
  const stationBVisibility = computeVisibilityWindowsForStationByOrbitCadence(
    toStationGeodetic(input.stationB),
    cappedRecords,
    stationBSampleConfig
  );

  const visibilityWindows = intersectStationWindowsForPair(
    stationAVisibility.windowsBySatellite,
    stationBVisibility.windowsBySatellite,
    cappedRecords
  );

  const { handoverEvents, totalCommunicatingMs, byOrbitMs } =
    deriveHandoverEventsAtSampleStep(
      visibilityWindows,
      input.timeWindow,
      sampleStepSeconds,
      {
        // Station-specific terrain masks are already applied when pair windows
        // are sampled. Keep the policy gate at the base threshold so one
        // station's mask does not globally raise the other station's gate.
        policy: handoverPolicy,
        rainRateMmPerHour,
        stationHeightAboveSeaKm: pairMidpointHeightAboveSeaKm
      }
    );

  const meanLinkDwellMs =
    handoverEvents.length === 0
      ? totalCommunicatingMs
      : Math.round(totalCommunicatingMs / Math.max(handoverEvents.length, 1));

  const communicationStats: CommunicationStats = {
    totalCommunicatingMs,
    byOrbit: byOrbitMs,
    handoverCount: countServingTransitions(handoverEvents),
    meanLinkDwellMs
  };

  const tleSourceMode = resolveProjectionTleSourceMode(input);
  const truthBoundary = buildTruthBoundary(
    input.stationA,
    input.stationB,
    rainRateMmPerHour,
    sharedSupportedOrbits,
    tleSourceMode,
    input.tleParseStats,
    handoverPolicyId
  );
  const sourcePaths = resolveProjectionSourcePaths(input);
  const sceneCameraHint = buildSceneCameraHintForProjection({
    pair: { stationA: input.stationA, stationB: input.stationB },
    visibilityWindows,
    handoverEvents
  });
  const sceneDisplayPolicy = buildSceneDisplayPolicy();
  const dataCompleteness = buildRuntimeDataCompletenessState({
    routeMode: "tle-first-runtime",
    stationA: input.stationA,
    stationB: input.stationB,
    pairSourceTier: truthBoundary.sourceTier,
    allTleRecords: input.tleRecords,
    cappedTleRecords: cappedAllRecords,
    acceptedTleRecords: cappedRecords,
    tleParseStats: input.tleParseStats,
    sourcePaths,
    tleSourceMode,
    snapshotFetchedUtc: resolveProjectionSnapshotFetchedUtc(input),
    caps: DEFAULT_TLE_CAPS,
    referenceUtc: input.timeWindow.startUtc,
    timeWindow: input.timeWindow,
    sharedSupportedOrbits,
    stationAVisibilityWindowCount: countVisibilityWindows(
      stationAVisibility.windowsBySatellite
    ),
    stationBVisibilityWindowCount: countVisibilityWindows(
      stationBVisibility.windowsBySatellite
    ),
    visibilityWindows,
    handoverEventCount: handoverEvents.length,
    rainRateMmPerHour,
    rainRateControlMode: resolveRainRateControlMode(input.rainRateMmPerHour),
    sampleStepSeconds,
    sampleCadenceSecondsByOrbit,
    baseElevationThresholdDeg,
    stationAEffectiveElevationThresholdDeg,
    stationBEffectiveElevationThresholdDeg,
    elevationThresholdDeg: baseElevationThresholdDeg,
    handoverPolicy,
    propagationStatsBySatellite: stationAVisibility.propagationStatsBySatellite,
    sceneCameraHint,
    sceneDisplayPolicy
  });

  return {
    pair: { stationA: input.stationA, stationB: input.stationB },
    timeWindow: input.timeWindow,
    sharedSupportedOrbits,
    visibleConstellations: selectVisibleConstellations(
      visibilityWindows,
      cappedRecords
    ),
    visibilityWindows,
    handoverEvents,
    communicationStats,
    truthBoundary,
    dataCompleteness
  };
}

let defaultTleSourcesPromise: Promise<RuntimeTleSources> | null = null;

function parseJsonWithOptionalHeader(text: string): unknown {
  return JSON.parse(text.replace(/^(?:#.*(?:\r?\n|$))+/, ""));
}

function isIsoOrNull(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)));
}

function isSupportedManifestMetadata(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RuntimeTleNetworkManifestEntry>;
  return (
    (candidate.format === undefined || candidate.format === "tle-3le") &&
    (candidate.apiClass === undefined ||
      candidate.apiClass === "celestrak-gp-tle") &&
    (candidate.sourcePolicy === undefined ||
      candidate.sourcePolicy === "refresh-artifact") &&
    (candidate.catalogNumberCompatibility === undefined ||
      candidate.catalogNumberCompatibility === "tle-limited-5-digit-catalog")
  );
}

function isManifestEntry(value: unknown): value is RuntimeTleNetworkManifestEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RuntimeTleNetworkManifestEntry>;
  const recordCount = candidate.recordCount;
  return (
    typeof candidate.path === "string" &&
    candidate.path.endsWith(".tle") &&
    !candidate.path.includes("..") &&
    Number.isInteger(recordCount) &&
    recordCount !== undefined &&
    recordCount > 0 &&
    Boolean(candidate.epochRangeUtc) &&
    isIsoOrNull(candidate.epochRangeUtc?.startUtc) &&
    isIsoOrNull(candidate.epochRangeUtc?.endUtc) &&
    isSupportedManifestMetadata(value)
  );
}

function isNetworkManifest(value: unknown): value is RuntimeTleNetworkManifest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RuntimeTleNetworkManifest>;
  return (
    typeof candidate.generatedAtUtc === "string" &&
    Number.isFinite(Date.parse(candidate.generatedAtUtc)) &&
    isManifestEntry(candidate.leo) &&
    isManifestEntry(candidate.meo) &&
    isManifestEntry(candidate.geo)
  );
}

function manifestEntryForOrbit(
  manifest: RuntimeTleNetworkManifest,
  orbitClass: OrbitClass
): RuntimeTleNetworkManifestEntry {
  return manifest[orbitClass.toLowerCase() as "leo" | "meo" | "geo"];
}

function manifestSourceMetadataForOrbit(
  manifest: RuntimeTleNetworkManifest,
  orbitClass: OrbitClass
): OrbitSourceMetadata {
  const entry = manifestEntryForOrbit(manifest, orbitClass);
  return {
    format: entry.format ?? DEFAULT_TLE_SOURCE_METADATA.format,
    apiClass: entry.apiClass ?? DEFAULT_TLE_SOURCE_METADATA.apiClass,
    sourcePolicy: entry.sourcePolicy ?? DEFAULT_TLE_SOURCE_METADATA.sourcePolicy,
    catalogNumberCompatibility:
      entry.catalogNumberCompatibility ??
      DEFAULT_TLE_SOURCE_METADATA.catalogNumberCompatibility
  };
}

function defaultTleSourceMetadataByOrbit(
  sourcePolicy: OrbitSourcePolicy
): Readonly<Record<OrbitClass, OrbitSourceMetadata>> {
  return {
    LEO: { ...DEFAULT_TLE_SOURCE_METADATA, sourcePolicy },
    MEO: { ...DEFAULT_TLE_SOURCE_METADATA, sourcePolicy },
    GEO: { ...DEFAULT_TLE_SOURCE_METADATA, sourcePolicy }
  };
}

function manifestSourceMetadataByOrbit(
  manifest: RuntimeTleNetworkManifest
): Readonly<Record<OrbitClass, OrbitSourceMetadata>> {
  return {
    LEO: manifestSourceMetadataForOrbit(manifest, "LEO"),
    MEO: manifestSourceMetadataForOrbit(manifest, "MEO"),
    GEO: manifestSourceMetadataForOrbit(manifest, "GEO")
  };
}

function normalizeNetworkTlePath(path: string): string {
  return path.startsWith("/") ? path : `${NETWORK_TLE_BASE_PATH}${path}`;
}

function manifestSourcePaths(
  manifest: RuntimeTleNetworkManifest
): Readonly<Record<OrbitClass, string>> {
  return {
    LEO: normalizeNetworkTlePath(manifest.leo.path),
    MEO: normalizeNetworkTlePath(manifest.meo.path),
    GEO: normalizeNetworkTlePath(manifest.geo.path)
  };
}

function isManifestEntryFresh(
  manifest: RuntimeTleNetworkManifest,
  orbitClass: OrbitClass,
  referenceUtc: string
): boolean {
  const entry = manifestEntryForOrbit(manifest, orbitClass);
  const candidates = [manifest.generatedAtUtc, entry.epochRangeUtc.endUtc]
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter((value) => Number.isFinite(value));
  const referenceMs = Date.parse(referenceUtc);
  if (candidates.length === 0 || !Number.isFinite(referenceMs)) {
    return false;
  }
  const anchorMs = Math.max(...candidates);
  const ageDays = Math.max(0, (referenceMs - anchorMs) / 86_400_000);
  return ageDays <= SOURCE_HEALTH_THRESHOLD_DAYS[orbitClass];
}

function localTleSourceSelection(
  sourceMode: TleSourceMode,
  manifest: RuntimeTleNetworkManifest | null
): RuntimeTleSourceSelection {
  return {
    sourceMode,
    sourcePaths: TLE_FIXTURE_PATHS,
    snapshotFetchedUtc: manifest?.generatedAtUtc ?? null,
    manifestPath: manifest ? NETWORK_TLE_MANIFEST_PATH : null,
    manifest,
    sourceMetadataByOrbit: defaultTleSourceMetadataByOrbit(
      sourcePolicyForMode(sourceMode)
    )
  };
}

async function resolveTleSourceSelection(
  fetchImpl: typeof fetch,
  referenceUtc: string = new Date().toISOString()
): Promise<RuntimeTleSourceSelection> {
  let response: Response;
  try {
    response = await fetchImpl(NETWORK_TLE_MANIFEST_PATH);
  } catch {
    return localTleSourceSelection("fallback-local-snapshot", null);
  }
  if (response.status === 404) {
    return localTleSourceSelection("local-snapshot", null);
  }
  if (!response.ok) {
    return localTleSourceSelection("fallback-local-snapshot", null);
  }
  let manifest: RuntimeTleNetworkManifest;
  try {
    const parsed = parseJsonWithOptionalHeader(await response.text());
    if (!isNetworkManifest(parsed)) {
      return localTleSourceSelection("fallback-local-snapshot", null);
    }
    manifest = parsed;
  } catch {
    return localTleSourceSelection("fallback-local-snapshot", null);
  }
  if (!ORBIT_CLASSES.every((orbitClass) => isManifestEntryFresh(manifest, orbitClass, referenceUtc))) {
    return localTleSourceSelection("fallback-local-snapshot", manifest);
  }
  return {
    sourceMode: "network-snapshot",
    sourcePaths: manifestSourcePaths(manifest),
    snapshotFetchedUtc: manifest.generatedAtUtc,
    manifestPath: NETWORK_TLE_MANIFEST_PATH,
    manifest,
    sourceMetadataByOrbit: manifestSourceMetadataByOrbit(manifest)
  };
}

async function fetchTleText(
  fetchImpl: typeof fetch,
  path: string
): Promise<string> {
  const response = await fetchImpl(path);
  if (!response.ok) {
    throw new Error(`TLE fetch failed (${response.status} ${response.statusText}) for ${path}`);
  }
  return response.text();
}

async function fetchTleTexts(
  fetchImpl: typeof fetch,
  sourcePaths: Readonly<Record<OrbitClass, string>>
): Promise<Pick<RuntimeTleSources, "leoTleText" | "meoTleText" | "geoTleText">> {
  const [leoTleText, meoTleText, geoTleText] = await Promise.all([
    fetchTleText(fetchImpl, sourcePaths.LEO),
    fetchTleText(fetchImpl, sourcePaths.MEO),
    fetchTleText(fetchImpl, sourcePaths.GEO)
  ]);
  return { leoTleText, meoTleText, geoTleText };
}

function isSatcatSummaryEntry(value: unknown): value is RuntimeSatcatSummaryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RuntimeSatcatSummaryEntry>;
  return (
    Number.isInteger(candidate.noradId) &&
    typeof candidate.objectName === "string" &&
    typeof candidate.operatorFamily === "string" &&
    typeof candidate.constellationName === "string" &&
    ORBIT_CLASSES.includes(candidate.orbitClass as OrbitClass) &&
    (candidate.decayDate === null || typeof candidate.decayDate === "string")
  );
}

async function loadRuntimeSatcatSummary(
  fetchImpl: typeof fetch
): Promise<ReadonlyArray<RuntimeSatcatSummaryEntry>> {
  try {
    const response = await fetchImpl(NETWORK_SATCAT_SUMMARY_PATH);
    if (!response.ok) {
      return [];
    }
    const parsed = parseJsonWithOptionalHeader(await response.text());
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isSatcatSummaryEntry);
  } catch {
    return [];
  }
}

async function loadDefaultTleSourcesUncached(
  fetchImpl: typeof fetch
): Promise<RuntimeTleSources> {
  const selection = await resolveTleSourceSelection(fetchImpl);
  const satcatSummary = await loadRuntimeSatcatSummary(fetchImpl);
  if (selection.sourceMode === "network-snapshot") {
    try {
      const texts = await fetchTleTexts(fetchImpl, selection.sourcePaths);
      return {
        ...texts,
        sourceMode: selection.sourceMode,
        sourcePaths: selection.sourcePaths,
        snapshotFetchedUtc: selection.snapshotFetchedUtc,
        manifestPath: selection.manifestPath,
        sourceMetadataByOrbit: selection.sourceMetadataByOrbit,
        satcatSummaryPath: satcatSummary.length > 0 ? NETWORK_SATCAT_SUMMARY_PATH : null,
        satcatSummary
      };
    } catch {
      const fallback = await fetchTleTexts(fetchImpl, TLE_FIXTURE_PATHS);
      return {
        ...fallback,
        sourceMode: "fallback-local-snapshot",
        sourcePaths: TLE_FIXTURE_PATHS,
        snapshotFetchedUtc: selection.snapshotFetchedUtc,
        manifestPath: selection.manifestPath,
        sourceMetadataByOrbit: defaultTleSourceMetadataByOrbit(
          sourcePolicyForMode("fallback-local-snapshot")
        ),
        satcatSummaryPath: satcatSummary.length > 0 ? NETWORK_SATCAT_SUMMARY_PATH : null,
        satcatSummary
      };
    }
  }
  const texts = await fetchTleTexts(fetchImpl, selection.sourcePaths);
  return {
    ...texts,
    sourceMode: selection.sourceMode,
    sourcePaths: selection.sourcePaths,
    snapshotFetchedUtc: selection.snapshotFetchedUtc,
    manifestPath: selection.manifestPath,
    sourceMetadataByOrbit: selection.sourceMetadataByOrbit,
    satcatSummaryPath: satcatSummary.length > 0 ? NETWORK_SATCAT_SUMMARY_PATH : null,
    satcatSummary
  };
}

export async function loadDefaultTleSources(
  fetchImpl: typeof fetch = fetch
): Promise<RuntimeTleSources> {
  if (fetchImpl === fetch) {
    defaultTleSourcesPromise ??= loadDefaultTleSourcesUncached(fetchImpl);
    return defaultTleSourcesPromise;
  }
  return loadDefaultTleSourcesUncached(fetchImpl);
}

export async function resolveDefaultTleFixturePaths(
  fetchImpl: typeof fetch = fetch
): Promise<Readonly<Record<OrbitClass, string>>> {
  const sources = await loadDefaultTleSources(fetchImpl);
  return sources.sourcePaths ?? TLE_FIXTURE_PATHS;
}

export function parseRuntimeTleSources(
  sources: RuntimeTleSources
): ReadonlyArray<TleRecord> {
  return [
    ...toTleRecords(parseOrbitSourceText(sources.leoTleText, {
      orbitClass: "LEO",
      sourcePolicy: sourcePolicyForMode(sources.sourceMode ?? "local-snapshot")
    }).records),
    ...toTleRecords(parseOrbitSourceText(sources.meoTleText, {
      orbitClass: "MEO",
      sourcePolicy: sourcePolicyForMode(sources.sourceMode ?? "local-snapshot")
    }).records),
    ...toTleRecords(parseOrbitSourceText(sources.geoTleText, {
      orbitClass: "GEO",
      sourcePolicy: sourcePolicyForMode(sources.sourceMode ?? "local-snapshot")
    }).records)
  ];
}

function sourcePolicyForMode(sourceMode: TleSourceMode): OrbitSourcePolicy {
  if (sourceMode === "network-snapshot") return "refresh-artifact";
  if (sourceMode === "fallback-local-snapshot") return "fallback-local-snapshot";
  return "bundled-snapshot";
}

function buildTleSourceParseStatsForText(
  rawText: string,
  orbitClass: OrbitClass,
  sourcePath: string,
  sourceMetadata: {
    readonly sourceMode: TleSourceMode;
    readonly snapshotFetchedUtc: string | null;
    readonly snapshotPath: string;
    readonly orbitSourceMetadata?: OrbitSourceMetadata;
    readonly satcatByNoradId: ReadonlyMap<number, RuntimeSatcatSummaryEntry>;
  }
): RuntimeTleSourceParseStats {
  const constellationMembership: Record<string, number> = {};
  const orbitSourceMetadata = sourceMetadata.orbitSourceMetadata ?? {
    ...DEFAULT_TLE_SOURCE_METADATA,
    sourcePolicy: sourcePolicyForMode(sourceMetadata.sourceMode)
  };
  const parsed = parseOrbitSourceText(rawText, {
    orbitClass,
    format: orbitSourceMetadata.format,
    sourcePolicy: orbitSourceMetadata.sourcePolicy
  });
  for (const record of parsed.records) {
    if (record.noradCatalogId !== null) {
      const satcatEntry = sourceMetadata.satcatByNoradId.get(record.noradCatalogId);
      if (satcatEntry?.operatorFamily) {
        constellationMembership[satcatEntry.operatorFamily] =
          (constellationMembership[satcatEntry.operatorFamily] ?? 0) + 1;
      }
    }
  }
  return {
    sourceId: `tle:${orbitClass.toLowerCase()}`,
    sourcePath,
    orbitClass,
    sourceMode: sourceMetadata.sourceMode,
    snapshotFetchedUtc: sourceMetadata.snapshotFetchedUtc,
    snapshotPath: sourceMetadata.snapshotPath,
    rawRecordGroupCount: parsed.stats.rawRecordGroupCount,
    parsedRecordCount: parsed.stats.parsedRecordCount,
    parserFailureCount: parsed.stats.parserFailureCount,
    format: orbitSourceMetadata.format,
    apiClass: orbitSourceMetadata.apiClass,
    sourcePolicy: orbitSourceMetadata.sourcePolicy,
    catalogNumberCompatibility: orbitSourceMetadata.catalogNumberCompatibility,
    noradIdRangeSummary: parsed.stats.noradIdRangeSummary,
    constellationMembership,
    cosparDesignatorCount: parsed.stats.cosparDesignatorCount,
    cosparDesignatorSamples: parsed.stats.cosparDesignatorSamples,
    classificationCounts: parsed.stats.classificationCounts,
    dragTermFieldCoverage: parsed.stats.dragTermFieldCoverage
  };
}

export function buildRuntimeTleSourceParseStats(
  sources: RuntimeTleSources
): ReadonlyArray<RuntimeTleSourceParseStats> {
  const sourcePaths = sources.sourcePaths ?? TLE_FIXTURE_PATHS;
  const fallbackMetadataByOrbit = defaultTleSourceMetadataByOrbit(
    sourcePolicyForMode(sources.sourceMode ?? "local-snapshot")
  );
  const sourceMetadataByOrbit =
    sources.sourceMetadataByOrbit ?? fallbackMetadataByOrbit;
  const sourceMetadata = {
    sourceMode: sources.sourceMode ?? "local-snapshot",
    snapshotFetchedUtc: sources.snapshotFetchedUtc ?? null,
    snapshotPath: sources.manifestPath ?? sourcePaths.LEO,
    satcatByNoradId: new Map(
      (sources.satcatSummary ?? []).map((entry) => [entry.noradId, entry])
    )
  };
  return [
    buildTleSourceParseStatsForText(
      sources.leoTleText,
      "LEO",
      sourcePaths.LEO,
      {
        ...sourceMetadata,
        snapshotPath: sourcePaths.LEO,
        orbitSourceMetadata: sourceMetadataByOrbit.LEO
      }
    ),
    buildTleSourceParseStatsForText(
      sources.meoTleText,
      "MEO",
      sourcePaths.MEO,
      {
        ...sourceMetadata,
        snapshotPath: sourcePaths.MEO,
        orbitSourceMetadata: sourceMetadataByOrbit.MEO
      }
    ),
    buildTleSourceParseStatsForText(
      sources.geoTleText,
      "GEO",
      sourcePaths.GEO,
      {
        ...sourceMetadata,
        snapshotPath: sourcePaths.GEO,
        orbitSourceMetadata: sourceMetadataByOrbit.GEO
      }
    )
  ];
}

export function buildDefaultTimeWindow(
  startUtc: string = new Date().toISOString(),
  durationMinutes: number = 360
): { startUtc: string; endUtc: string } {
  const startMs = Date.parse(startUtc);
  return {
    startUtc,
    endUtc: new Date(startMs + durationMinutes * 60_000).toISOString()
  };
}

export { type PairVisibilityWindow, type VisibilityWindow } from "./visibility-utils";
