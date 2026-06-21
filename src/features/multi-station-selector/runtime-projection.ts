import {
  ORBIT_CLASS_CARRIER_DEFAULTS,
  computeFreeSpacePathLossDb
} from "../../runtime/link-budget/free-space-path-loss";
import {
  computeEarthStationAntennaGainDb,
  computeSatelliteAntennaGainDb
} from "../../runtime/link-budget/antenna-pattern";
import { computeGasAbsorptionDb } from "../../runtime/link-budget/gas-absorption";
import { computeRainAttenuationDb } from "../../runtime/link-budget/rain-attenuation";
import { TLE_FIXTURE_PATHS } from "./demo-scenario-config";
import {
  inferPairSourceTier,
  type PairSourceTierAttribution,
  type PublicRegistryStation
} from "./tier-inference";

import {
  computeInstantaneousSatelliteGeometry,
  intersectStationWindowsForPair,
  stationToEcefKm,
  type InstantaneousSatelliteGeometry,
  type OrbitClass,
  type PairVisibilityWindow,
  type RuntimeOrbitRecord,
  type StationEcefKm,
  type StationGeodetic,
  type TleRecord,
  type VisibilityWindow
} from "./visibility-utils";
import { createRuntimeSatrec } from "./orbit-propagation";
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
  toRuntimeOrbitRecords,
  type OrbitSourceMetadata,
  type OrbitSourcePolicy
} from "./orbit-source-parser";
import {
  buildRuntimeHandoverPolicyConfig,
  resolveRuntimeHandoverPolicyId,
  selectRuntimeHandoverDecision,
  type HandoverCandidate,
  type HandoverPolicyConfig,
  type RuntimeHandoverPolicyId
} from "./runtime-handover-policy";
import {
  RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS,
  RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID,
  RUNTIME_ANTENNA_ASSUMPTIONS_BY_ORBIT
} from "./runtime-antenna-assumptions";

export {
  resolveRuntimeHandoverPolicyId,
  SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
} from "./runtime-handover-policy";
export type { RuntimeHandoverPolicyId } from "./runtime-handover-policy";

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
const RANKING_VISIBILITY_CADENCE_SECONDS_BY_ORBIT: Readonly<Record<OrbitClass, number>> = {
  LEO: 120,
  MEO: 300,
  GEO: 600
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
const S465_PATTERN_MIN_FREQUENCY_GHZ = 2;
const S465_PATTERN_MAX_FREQUENCY_GHZ = 31;
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

// Pinned demo TLE snapshot paths live in the single source of truth
// (demo-scenario-config.json); imported above, re-exported for existing importers.
export { TLE_FIXTURE_PATHS };

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

/** Per-endpoint rain geometry + attenuation for the route-representative link budget. */
export interface RepresentativeRainEndpoint {
  readonly stationLabel: "A" | "B";
  readonly latitudeDeg: number;
  readonly heightAboveSeaKm: number;
  /** Instantaneous look-angle elevation at this station at the representative sample (deg). */
  readonly elevationDeg: number;
  /** This endpoint's modeled rain attenuation at the current rate (dB); 0 when rate is 0. */
  readonly rainAttenuationDb: number;
}

/**
 * Route-representative per-orbit link budget, computed from the dominant
 * mutual-visibility window using the SGP4-propagated satellite radius (F1) and
 * the instantaneous per-station elevation at the window mid-time (F2), with rain
 * taken from the binding (worse) endpoint (F3). All magnitudes are MODELED /
 * standard-derived, never measured: throughput is an illustrative capacity proxy
 * (no packet test) and receivedPowerProxyDbm is a relative proxy (EIRP unknown).
 */
export interface RepresentativeLinkBudget {
  readonly orbitClass: OrbitClass;
  readonly representativeElevationDeg: number;
  readonly satelliteAltitudeKm: number;
  readonly satelliteRadiusKm: number;
  readonly slantRangeKm: number;
  readonly carrierFrequencyGHz: number;
  readonly freeSpacePathLossDb: number;
  readonly gasAbsorptionDb: number;
  readonly rainAttenuationDb: number;
  readonly rainBindingStation: "A" | "B" | null;
  readonly totalPathLossDb: number;
  readonly combinedAntennaGainDb: number;
  readonly receivedPowerProxyDbm: number;
  readonly latencyMs: number;
  readonly jitterMs: number;
  readonly illustrativeThroughputMbps: number;
  readonly rainEndpoints: ReadonlyArray<RepresentativeRainEndpoint>;
  readonly geometrySource: "sgp4-propagated-representative" | "nominal-fallback";
  readonly representativeSatelliteId: string;
  readonly representativeSampleUtc: string;
}

export interface RuntimeProjectionInput {
  readonly stationA: PublicRegistryStation;
  readonly stationB: PublicRegistryStation;
  readonly timeWindow: { startUtc: string; endUtc: string };
  readonly tleRecords: ReadonlyArray<RuntimeOrbitRecord>;
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
  readonly representativeLinkBudgetByOrbit: Readonly<
    Partial<Record<OrbitClass, RepresentativeLinkBudget>>
  >;
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

/** One ground-station endpoint for the per-station (F3) rain-attenuation pass. */
export interface LinkBudgetRainEndpoint {
  readonly stationLabel: "A" | "B";
  readonly latitudeDeg: number;
  readonly heightAboveSeaKm: number;
  readonly elevationDeg: number;
}

export interface LinkBudgetMetricOptions {
  readonly representativeElevationDeg?: number;
  readonly rainRateMmPerHour?: number;
  readonly stationHeightAboveSeaKm?: number;
  readonly stationLatitudeDeg?: number;
  /**
   * F1 (WS-F): SGP4-propagated satellite geocentric radius (km). When present it
   * overrides the nominal class altitude in the slant-range geometry.
   */
  readonly satelliteRadiusKm?: number;
  /**
   * F3 (WS-F): per-station rain endpoints. When present, rain attenuation is
   * computed at each endpoint's own latitude/height/elevation and the binding
   * (worse) station is reported, instead of a single pair-midpoint latitude.
   */
  readonly rainEndpoints?: ReadonlyArray<LinkBudgetRainEndpoint>;
}

export interface LinkBudgetMetrics {
  readonly latencyMs: number;
  readonly jitterMs: number;
  readonly networkSpeedMbps: number;
}

interface LinkBudgetDetails extends LinkBudgetMetrics {
  readonly representativeElevationDeg: number;
  readonly slantRangeKm: number;
  readonly satelliteRadiusKm: number;
  readonly geometrySource: "sgp4-propagated-representative" | "nominal-fallback";
  readonly totalPathLossDb: number;
  readonly freeSpacePathLossDb: number;
  readonly gasAbsorptionDb: number;
  readonly rainAttenuationDb: number;
  readonly rainBindingStation: "A" | "B" | null;
  readonly satelliteAntennaPeakGainDb: number;
  readonly satelliteAntennaBeamwidthDeg: number;
  readonly satelliteAntennaOffAxisAngleDeg: number;
  readonly satelliteAntennaGainDb: number;
  readonly earthStationAntennaPeakGainDb: number;
  readonly earthStationAntennaDiameterM: number;
  readonly earthStationAntennaOffAxisAngleDeg: number;
  readonly earthStationAntennaPatternFrequencyGHz: number;
  readonly earthStationAntennaGainDb: number;
  readonly peakCombinedAntennaGainDb: number;
  readonly combinedAntennaGainDb: number;
  readonly antennaOffAxisLossDb: number;
  readonly antennaAssumptionSourceId: typeof RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID;
  readonly antennaAssumptionSourceClass: typeof RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS;
  readonly receivedPowerProxyDbm: number;
}

/**
 * Geometry inputs the handover loop needs to re-propagate each visible satellite
 * at each sample instant (F2): the per-satellite satrec, both station ECEF
 * positions, and each station's latitude/height for the per-station rain pass.
 */
interface HandoverSampleGeometry {
  readonly satrecById: ReadonlyMap<
    string,
    Parameters<typeof computeInstantaneousSatelliteGeometry>[0]
  >;
  readonly stationAEcef: StationEcefKm;
  readonly stationBEcef: StationEcefKm;
  readonly stationALatitudeDeg: number;
  readonly stationBLatitudeDeg: number;
  readonly stationAHeightAboveSeaKm: number;
  readonly stationBHeightAboveSeaKm: number;
}

interface HandoverSampleOptions {
  readonly policy: HandoverPolicyConfig;
  readonly rainRateMmPerHour: number;
  // Pair-midpoint fallbacks, used only if re-propagation fails at an instant.
  readonly stationHeightAboveSeaKm: number;
  readonly stationLatitudeDeg: number;
  readonly geometry: HandoverSampleGeometry;
}

interface CandidateGeometryRankScore {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  sourceIndex: number;
  pairVisibleMs: number;
  pairWindowCount: number;
  maxPairMinElevationDeg: number;
  stationVisibleMs: number;
}

function toStationGeodetic(station: PublicRegistryStation): StationGeodetic {
  return { lat: station.lat, lon: station.lon, altMeters: station.elevationM };
}

function visibilityDurationMs(window: VisibilityWindow): number {
  const startMs = Date.parse(window.startUtc);
  const endMs = Date.parse(window.endUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return endMs - startMs;
}

function pairVisibilityDurationMs(window: PairVisibilityWindow): number {
  const startMs = Date.parse(window.intersectionStartUtc);
  const endMs = Date.parse(window.intersectionEndUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return endMs - startMs;
}

function sumVisibilityDurationMs(
  windows: ReadonlyArray<VisibilityWindow>
): number {
  return windows.reduce((sum, window) => sum + visibilityDurationMs(window), 0);
}

function buildCandidateGeometryRankScores(
  records: ReadonlyArray<RuntimeOrbitRecord>,
  stationAWindows: ReadonlyMap<string, ReadonlyArray<VisibilityWindow>>,
  stationBWindows: ReadonlyMap<string, ReadonlyArray<VisibilityWindow>>,
  pairWindows: ReadonlyArray<PairVisibilityWindow>
): Map<string, CandidateGeometryRankScore> {
  const scores = new Map<string, CandidateGeometryRankScore>();
  records.forEach((record, sourceIndex) => {
    const aWindows = stationAWindows.get(record.satelliteId) ?? [];
    const bWindows = stationBWindows.get(record.satelliteId) ?? [];
    scores.set(record.satelliteId, {
      satelliteId: record.satelliteId,
      orbitClass: record.orbitClass,
      sourceIndex,
      pairVisibleMs: 0,
      pairWindowCount: 0,
      maxPairMinElevationDeg: Number.NEGATIVE_INFINITY,
      stationVisibleMs:
        sumVisibilityDurationMs(aWindows) + sumVisibilityDurationMs(bWindows)
    });
  });
  for (const window of pairWindows) {
    const score = scores.get(window.satelliteId);
    if (!score) {
      continue;
    }
    score.pairVisibleMs += pairVisibilityDurationMs(window);
    score.pairWindowCount += 1;
    score.maxPairMinElevationDeg = Math.max(
      score.maxPairMinElevationDeg,
      Math.min(
        window.stationAWindow.maxElevationDeg,
        window.stationBWindow.maxElevationDeg
      )
    );
  }
  return scores;
}

function compareRankedCandidateRecords(
  scores: ReadonlyMap<string, CandidateGeometryRankScore>,
  left: RuntimeOrbitRecord,
  right: RuntimeOrbitRecord
): number {
  const leftScore = scores.get(left.satelliteId);
  const rightScore = scores.get(right.satelliteId);
  if (!leftScore || !rightScore) {
    return (leftScore?.sourceIndex ?? 0) - (rightScore?.sourceIndex ?? 0);
  }
  return (
    rightScore.pairVisibleMs - leftScore.pairVisibleMs ||
    rightScore.pairWindowCount - leftScore.pairWindowCount ||
    rightScore.maxPairMinElevationDeg - leftScore.maxPairMinElevationDeg ||
    rightScore.stationVisibleMs - leftScore.stationVisibleMs ||
    leftScore.sourceIndex - rightScore.sourceIndex ||
    left.satelliteId.localeCompare(right.satelliteId)
  );
}

function rankTleRecordsForSelectedPair(
  records: ReadonlyArray<RuntimeOrbitRecord>,
  options: {
    readonly stationA: PublicRegistryStation;
    readonly stationB: PublicRegistryStation;
    readonly timeWindow: RuntimeProjectionInput["timeWindow"];
    readonly sharedSupportedOrbits: ReadonlyArray<OrbitClass>;
    readonly stationAEffectiveElevationThresholdDeg: number;
    readonly stationBEffectiveElevationThresholdDeg: number;
  }
): ReadonlyArray<RuntimeOrbitRecord> {
  if (records.length === 0 || options.sharedSupportedOrbits.length === 0) {
    return records;
  }
  const rankableRecords = filterRecordsByOrbit(
    records,
    options.sharedSupportedOrbits
  );
  if (rankableRecords.length === 0) {
    return records;
  }
  const sampleConfigBase = {
    startUtc: options.timeWindow.startUtc,
    endUtc: options.timeWindow.endUtc,
    cadenceSecondsByOrbit: RANKING_VISIBILITY_CADENCE_SECONDS_BY_ORBIT
  };
  const stationAVisibility = computeVisibilityWindowsForStationByOrbitCadence(
    toStationGeodetic(options.stationA),
    rankableRecords,
    {
      ...sampleConfigBase,
      elevationThresholdDeg: options.stationAEffectiveElevationThresholdDeg
    }
  );
  const stationBVisibility = computeVisibilityWindowsForStationByOrbitCadence(
    toStationGeodetic(options.stationB),
    rankableRecords,
    {
      ...sampleConfigBase,
      elevationThresholdDeg: options.stationBEffectiveElevationThresholdDeg
    }
  );
  const pairWindows = intersectStationWindowsForPair(
    stationAVisibility.windowsBySatellite,
    stationBVisibility.windowsBySatellite,
    rankableRecords
  );
  const scores = buildCandidateGeometryRankScores(
    records,
    stationAVisibility.windowsBySatellite,
    stationBVisibility.windowsBySatellite,
    pairWindows
  );

  return ORBIT_CLASSES.flatMap((orbitClass) =>
    records
      .filter((record) => record.orbitClass === orbitClass)
      .sort((left, right) => compareRankedCandidateRecords(scores, left, right))
  );
}

function capTleRecords(
  records: ReadonlyArray<RuntimeOrbitRecord>,
  caps: Record<OrbitClass, number>
): ReadonlyArray<RuntimeOrbitRecord> {
  const counts: Record<OrbitClass, number> = { LEO: 0, MEO: 0, GEO: 0 };
  const kept: RuntimeOrbitRecord[] = [];
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
  elevationDeg: number,
  satelliteRadiusKm?: number
): number {
  // F1 (WS-F): when the SGP4-propagated geocentric radius is supplied, use it
  // directly so slant range reflects the satellite's actual instantaneous
  // altitude instead of the NOMINAL per-class altitude. The propagated radius is
  // already computed for the visibility/elevation gate, so this adds no new
  // assumption. Falls back to Re + nominal altitude when no propagated radius is
  // available (e.g. the standalone computeLinkBudgetMetricsForOrbit entry point).
  const earthToSatelliteRadiusKm =
    satelliteRadiusKm !== undefined &&
    Number.isFinite(satelliteRadiusKm) &&
    satelliteRadiusKm > EARTH_RADIUS_KM
      ? satelliteRadiusKm
      : EARTH_RADIUS_KM + NOMINAL_ALTITUDE_KM_BY_ORBIT[orbitClass];
  const elevationRad = (elevationDeg * Math.PI) / 180;

  // 3GPP TR 38.811 §6.6.2 (Eq 6.6-3) -- spherical-earth slant range geometry.
  // (Range feeds one-way delay; delay treatment is clause 5.3.1.1. §6.7 is the
  // fast-fading model, NOT propagation delay -- earlier §6.7 citation was wrong.)
  // Spherical-earth geometry: rho = sqrt((Re+h)^2 - (Re*cos(E))^2) - Re*sin(E),
  // where E is station elevation, (Re+h) is the satellite geocentric radius
  // (propagated when available, else Re + nominal altitude), and Re is 6371 km.
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
  readonly stationLatitudeDeg?: number;
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

  // ITU-R P.618-14 §2.2.1.1 path method -- specific attenuation + r0.01/v0.01 effective path.
  // Rain attenuation uses one representative link-path height; only negative altitude is clamped for the rain model.
  return computeRainAttenuationDb({
    rainRateMmPerHour,
    carrierFrequencyGHz: options.carrierFrequencyGHz,
    elevationDeg: options.elevationDeg,
    stationHeightAboveSeaKm: normalizeRainModelStationHeightAboveSeaKm(
      options.stationHeightAboveSeaKm
    ),
    polarization: "circular",
    stationLatitudeDeg: options.stationLatitudeDeg
  });
}

function computeBindingRainAttenuationDb(input: {
  readonly rainRateMmPerHour: number;
  readonly carrierFrequencyGHz: number;
  readonly representativeElevationDeg: number;
  readonly stationHeightAboveSeaKm: number;
  readonly stationLatitudeDeg?: number;
  readonly rainEndpoints?: ReadonlyArray<LinkBudgetRainEndpoint>;
}): { readonly rainAttenuationDb: number; readonly rainBindingStation: "A" | "B" | null } {
  if (input.rainEndpoints && input.rainEndpoints.length > 0) {
    let worstDb = 0;
    let rainBindingStation: "A" | "B" | null = null;
    for (const endpoint of input.rainEndpoints) {
      const endpointDb = computeRainAttenuationForCarrierDb({
        rainRateMmPerHour: input.rainRateMmPerHour,
        carrierFrequencyGHz: input.carrierFrequencyGHz,
        // Per-station elevation can dip below the model floor near a window edge;
        // normalize to the [1, 90] modeling band the rain path requires.
        elevationDeg: normalizeElevationDeg(endpoint.elevationDeg),
        stationHeightAboveSeaKm: endpoint.heightAboveSeaKm,
        stationLatitudeDeg: endpoint.latitudeDeg
      });
      if (endpointDb > worstDb) {
        worstDb = endpointDb;
        rainBindingStation = endpoint.stationLabel;
      }
    }
    return { rainAttenuationDb: worstDb, rainBindingStation };
  }
  return {
    rainAttenuationDb: computeRainAttenuationForCarrierDb({
      rainRateMmPerHour: input.rainRateMmPerHour,
      carrierFrequencyGHz: input.carrierFrequencyGHz,
      elevationDeg: input.representativeElevationDeg,
      stationHeightAboveSeaKm: input.stationHeightAboveSeaKm,
      stationLatitudeDeg: input.stationLatitudeDeg
    }),
    rainBindingStation: null
  };
}

function computeAssumedAntennaGainDetailsForOrbit(
  orbitClass: OrbitClass,
  carrierFrequencyGHz: number
): Pick<
  LinkBudgetDetails,
  | "satelliteAntennaPeakGainDb"
  | "satelliteAntennaBeamwidthDeg"
  | "satelliteAntennaOffAxisAngleDeg"
  | "satelliteAntennaGainDb"
  | "earthStationAntennaPeakGainDb"
  | "earthStationAntennaDiameterM"
  | "earthStationAntennaOffAxisAngleDeg"
  | "earthStationAntennaPatternFrequencyGHz"
  | "earthStationAntennaGainDb"
  | "peakCombinedAntennaGainDb"
  | "combinedAntennaGainDb"
  | "antennaOffAxisLossDb"
  | "antennaAssumptionSourceId"
  | "antennaAssumptionSourceClass"
> {
  const assumption = RUNTIME_ANTENNA_ASSUMPTIONS_BY_ORBIT[orbitClass];
  const earthStationAntennaPatternFrequencyGHz = Math.min(
    S465_PATTERN_MAX_FREQUENCY_GHZ,
    Math.max(S465_PATTERN_MIN_FREQUENCY_GHZ, carrierFrequencyGHz)
  );
  const satelliteAntennaGainDb = computeSatelliteAntennaGainDb({
    peakGainDb: assumption.satellitePeakGainDb,
    beamwidthDeg: assumption.satelliteBeamwidthDeg,
    offAxisAngleDeg: assumption.satelliteOffAxisAngleDeg,
    rolloffModel: assumption.satelliteRolloffModel
  });
  const earthStationAntennaGainDb = computeEarthStationAntennaGainDb({
    peakGainDb: assumption.earthStationPeakGainDb,
    offAxisAngleDeg: assumption.earthStationOffAxisAngleDeg,
    antennaDiameterM: assumption.earthStationDiameterM,
    carrierFrequencyGHz: earthStationAntennaPatternFrequencyGHz
  });
  const peakCombinedAntennaGainDb =
    assumption.satellitePeakGainDb + assumption.earthStationPeakGainDb;
  const combinedAntennaGainDb =
    satelliteAntennaGainDb + earthStationAntennaGainDb;

  return {
    satelliteAntennaPeakGainDb: assumption.satellitePeakGainDb,
    satelliteAntennaBeamwidthDeg: assumption.satelliteBeamwidthDeg,
    satelliteAntennaOffAxisAngleDeg: assumption.satelliteOffAxisAngleDeg,
    satelliteAntennaGainDb,
    earthStationAntennaPeakGainDb: assumption.earthStationPeakGainDb,
    earthStationAntennaDiameterM: assumption.earthStationDiameterM,
    earthStationAntennaOffAxisAngleDeg: assumption.earthStationOffAxisAngleDeg,
    earthStationAntennaPatternFrequencyGHz,
    earthStationAntennaGainDb,
    peakCombinedAntennaGainDb,
    combinedAntennaGainDb,
    antennaOffAxisLossDb: Math.max(
      0,
      peakCombinedAntennaGainDb - combinedAntennaGainDb
    ),
    antennaAssumptionSourceId: RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID,
    antennaAssumptionSourceClass: RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS
  };
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
  const usePropagatedRadius =
    options.satelliteRadiusKm !== undefined &&
    Number.isFinite(options.satelliteRadiusKm) &&
    options.satelliteRadiusKm > EARTH_RADIUS_KM;
  const geometrySource: LinkBudgetDetails["geometrySource"] = usePropagatedRadius
    ? "sgp4-propagated-representative"
    : "nominal-fallback";
  const satelliteRadiusKm = usePropagatedRadius
    ? (options.satelliteRadiusKm as number)
    : EARTH_RADIUS_KM + NOMINAL_ALTITUDE_KM_BY_ORBIT[orbitClass];
  const slantRangeKm = computeRepresentativeSlantRangeKm(
    orbitClass,
    representativeElevationDeg,
    options.satelliteRadiusKm
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
  // F3 (WS-F): when per-station rain endpoints are supplied, compute rain at each
  // endpoint's own latitude/height/elevation and bind to the worse (higher) one,
  // instead of a single pair-midpoint latitude (physically meaningless on
  // near-antipodal routes). Falls back to the single representative pass.
  const { rainAttenuationDb, rainBindingStation } = computeBindingRainAttenuationDb({
    rainRateMmPerHour,
    carrierFrequencyGHz,
    representativeElevationDeg,
    stationHeightAboveSeaKm,
    stationLatitudeDeg: options.stationLatitudeDeg,
    rainEndpoints: options.rainEndpoints
  });
  const antennaGainDetails = computeAssumedAntennaGainDetailsForOrbit(
    orbitClass,
    carrierFrequencyGHz
  );
  const totalPathLossDb =
    freeSpacePathLossDb + gasAbsorptionDb + rainAttenuationDb;
  const receivedPowerProxyDbm =
    RELATIVE_RSRP_REFERENCE_DBM +
    antennaGainDetails.combinedAntennaGainDb -
    totalPathLossDb;

  // One-way propagation delay = slantRange / c (range per TR 38.811 §6.6.2 Eq 6.6-3;
  // delay treatment clause 5.3.1.1), not RTT. FIXED_PROCESSING_DELAY_MS is a
  // non-standard modeling add-on, not a TR 38.811 quantity.
  const latencyMs =
    (slantRangeKm / SPEED_OF_LIGHT_KM_PER_SECOND) * 1000 +
    FIXED_PROCESSING_DELAY_MS;
  const excessAttenuationDb = gasAbsorptionDb + rainAttenuationDb;
  const modelDeratingDb =
    excessAttenuationDb + antennaGainDetails.antennaOffAxisLossDb;
  // Reference capacity is the old clear-sky anchor; atmospheric fade plus
  // assumed antenna off-axis loss apply a soft exponential de-rating.
  const networkSpeedMbps = Math.max(
    MIN_NETWORK_SPEED_MBPS,
    CLEAR_SKY_REFERENCE_CAPACITY_MBPS_BY_ORBIT[orbitClass] *
      Math.exp(-modelDeratingDb / 20)
  );
  const jitterScale = 1 + Math.min(rainAttenuationDb / 20, 3);
  const jitterMs = BASELINE_JITTER_MS_BY_ORBIT[orbitClass] * jitterScale;

  return {
    latencyMs: roundMetric(latencyMs),
    jitterMs: roundMetric(jitterMs),
    networkSpeedMbps: roundMetric(networkSpeedMbps),
    representativeElevationDeg,
    slantRangeKm: roundMetric(slantRangeKm),
    satelliteRadiusKm: roundMetric(satelliteRadiusKm),
    geometrySource,
    totalPathLossDb: roundMetric(totalPathLossDb),
    freeSpacePathLossDb: roundMetric(freeSpacePathLossDb),
    gasAbsorptionDb: roundMetric(gasAbsorptionDb),
    rainAttenuationDb: roundMetric(rainAttenuationDb),
    rainBindingStation,
    satelliteAntennaPeakGainDb: roundMetric(
      antennaGainDetails.satelliteAntennaPeakGainDb
    ),
    satelliteAntennaBeamwidthDeg: roundMetric(
      antennaGainDetails.satelliteAntennaBeamwidthDeg
    ),
    satelliteAntennaOffAxisAngleDeg: roundMetric(
      antennaGainDetails.satelliteAntennaOffAxisAngleDeg
    ),
    satelliteAntennaGainDb: roundMetric(
      antennaGainDetails.satelliteAntennaGainDb
    ),
    earthStationAntennaPeakGainDb: roundMetric(
      antennaGainDetails.earthStationAntennaPeakGainDb
    ),
    earthStationAntennaDiameterM: roundMetric(
      antennaGainDetails.earthStationAntennaDiameterM
    ),
    earthStationAntennaOffAxisAngleDeg: roundMetric(
      antennaGainDetails.earthStationAntennaOffAxisAngleDeg
    ),
    earthStationAntennaPatternFrequencyGHz: roundMetric(
      antennaGainDetails.earthStationAntennaPatternFrequencyGHz
    ),
    earthStationAntennaGainDb: roundMetric(
      antennaGainDetails.earthStationAntennaGainDb
    ),
    peakCombinedAntennaGainDb: roundMetric(
      antennaGainDetails.peakCombinedAntennaGainDb
    ),
    combinedAntennaGainDb: roundMetric(
      antennaGainDetails.combinedAntennaGainDb
    ),
    antennaOffAxisLossDb: roundMetric(
      antennaGainDetails.antennaOffAxisLossDb
    ),
    antennaAssumptionSourceId: antennaGainDetails.antennaAssumptionSourceId,
    antennaAssumptionSourceClass:
      antennaGainDetails.antennaAssumptionSourceClass,
    receivedPowerProxyDbm: roundMetric(receivedPowerProxyDbm)
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
  records: ReadonlyArray<RuntimeOrbitRecord>
): Record<
  OrbitClass,
  ReadonlyArray<{ readonly satelliteId: string; readonly tleSource: string }>
> {
  const tleSourceById = new Map<string, string>();
  for (const r of records) {
    const sourceSnippet =
      "ommFields" in r
        ? `${r.format}:NORAD ${r.noradCatalogId ?? "unknown"}`
        : `${r.tleLine1.slice(0, 16)}…/${r.tleLine2.slice(0, 8)}…`;
    tleSourceById.set(
      r.satelliteId,
      sourceSnippet
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
  stationHeightAboveSeaKm: number,
  stationLatitudeDeg: number
): LinkBudgetDetails {
  return computeLinkBudgetDetailsForOrbit(window.orbitClass, {
    representativeElevationDeg: computeRepresentativeElevationDeg(window),
    rainRateMmPerHour,
    stationHeightAboveSeaKm,
    stationLatitudeDeg
  });
}

/**
 * F1+F2+F3 (WS-F): link budget at one sample instant. Re-propagates the
 * satellite to get its instantaneous geocentric radius (F1) and the
 * instantaneous per-station elevation (F2 -- representative = the worse, lower
 * elevation of the two stations), and runs rain per station to bind the worse
 * one (F3). Falls back to the window's pass-maximum representative if
 * re-propagation fails at this instant.
 */
function computeLinkBudgetDetailsAtSample(
  window: PairVisibilityWindow,
  sampleTimeMs: number,
  geometry: HandoverSampleGeometry,
  rainRateMmPerHour: number,
  fallbackStationHeightAboveSeaKm: number,
  fallbackStationLatitudeDeg: number
): LinkBudgetDetails {
  const satrec = geometry.satrecById.get(window.satelliteId);
  const instantaneous = satrec
    ? computeInstantaneousSatelliteGeometry(
        satrec,
        geometry.stationAEcef,
        geometry.stationBEcef,
        new Date(sampleTimeMs)
      )
    : null;
  if (instantaneous) {
    return computeLinkBudgetDetailsForOrbit(window.orbitClass, {
      representativeElevationDeg: Math.min(
        instantaneous.elevationStationADeg,
        instantaneous.elevationStationBDeg
      ),
      satelliteRadiusKm: instantaneous.satelliteRadiusKm,
      rainRateMmPerHour,
      rainEndpoints: [
        {
          stationLabel: "A",
          latitudeDeg: geometry.stationALatitudeDeg,
          heightAboveSeaKm: geometry.stationAHeightAboveSeaKm,
          elevationDeg: instantaneous.elevationStationADeg
        },
        {
          stationLabel: "B",
          latitudeDeg: geometry.stationBLatitudeDeg,
          heightAboveSeaKm: geometry.stationBHeightAboveSeaKm,
          elevationDeg: instantaneous.elevationStationBDeg
        }
      ]
    });
  }
  return computeLinkBudgetDetailsForWindow(
    window,
    rainRateMmPerHour,
    fallbackStationHeightAboveSeaKm,
    fallbackStationLatitudeDeg
  );
}

/**
 * Route-representative per-orbit link budget (drives the side-panel display and
 * the evidence report). For each shared orbit class it evaluates the dominant
 * (longest) mutual-visibility window at its mid-time using the SGP4-propagated
 * geometry, so the displayed numbers reflect the actual route rather than a
 * fixed 35 deg / nominal-altitude placeholder. All magnitudes are modeled /
 * standard-derived; throughput and RSRP remain proxies (see field docs).
 */
function buildRepresentativeLinkBudgetByOrbit(
  visibilityWindows: ReadonlyArray<PairVisibilityWindow>,
  sharedSupportedOrbits: ReadonlyArray<OrbitClass>,
  rainRateMmPerHour: number,
  geometry: HandoverSampleGeometry,
  fallbackStationHeightAboveSeaKm: number,
  fallbackStationLatitudeDeg: number
): Partial<Record<OrbitClass, RepresentativeLinkBudget>> {
  const byOrbit: Partial<Record<OrbitClass, RepresentativeLinkBudget>> = {};
  for (const orbitClass of sharedSupportedOrbits) {
    const windowsForOrbit = visibilityWindows.filter(
      (window) => window.orbitClass === orbitClass
    );
    if (windowsForOrbit.length === 0) {
      continue;
    }
    const dominant = windowsForOrbit.reduce((best, candidate) => {
      const bestDuration = pairVisibilityDurationMs(best);
      const candidateDuration = pairVisibilityDurationMs(candidate);
      if (candidateDuration > bestDuration) {
        return candidate;
      }
      if (
        candidateDuration === bestDuration &&
        candidate.satelliteId.localeCompare(best.satelliteId) < 0
      ) {
        return candidate;
      }
      return best;
    });
    const startMs = Date.parse(dominant.intersectionStartUtc);
    const endMs = Date.parse(dominant.intersectionEndUtc);
    const sampleMs =
      Number.isFinite(startMs) && Number.isFinite(endMs)
        ? Math.round((startMs + endMs) / 2)
        : startMs;
    const details = computeLinkBudgetDetailsAtSample(
      dominant,
      sampleMs,
      geometry,
      rainRateMmPerHour,
      fallbackStationHeightAboveSeaKm,
      fallbackStationLatitudeDeg
    );
    const satrec = geometry.satrecById.get(dominant.satelliteId);
    const instantaneous = satrec
      ? computeInstantaneousSatelliteGeometry(
          satrec,
          geometry.stationAEcef,
          geometry.stationBEcef,
          new Date(sampleMs)
        )
      : null;
    byOrbit[orbitClass] = {
      orbitClass,
      representativeElevationDeg: details.representativeElevationDeg,
      satelliteAltitudeKm: roundMetric(details.satelliteRadiusKm - EARTH_RADIUS_KM),
      satelliteRadiusKm: details.satelliteRadiusKm,
      slantRangeKm: details.slantRangeKm,
      carrierFrequencyGHz:
        ORBIT_CLASS_CARRIER_DEFAULTS[orbitClass].carrierFrequencyGHz,
      freeSpacePathLossDb: details.freeSpacePathLossDb,
      gasAbsorptionDb: details.gasAbsorptionDb,
      rainAttenuationDb: details.rainAttenuationDb,
      rainBindingStation: details.rainBindingStation,
      totalPathLossDb: details.totalPathLossDb,
      combinedAntennaGainDb: details.combinedAntennaGainDb,
      receivedPowerProxyDbm: details.receivedPowerProxyDbm,
      latencyMs: details.latencyMs,
      jitterMs: details.jitterMs,
      illustrativeThroughputMbps: details.networkSpeedMbps,
      rainEndpoints: buildRepresentativeRainEndpoints(
        geometry,
        instantaneous,
        rainRateMmPerHour,
        orbitClass
      ),
      geometrySource: details.geometrySource,
      representativeSatelliteId: dominant.satelliteId,
      representativeSampleUtc: new Date(sampleMs).toISOString()
    };
  }
  return byOrbit;
}

function buildRepresentativeRainEndpoints(
  geometry: HandoverSampleGeometry,
  instantaneous: InstantaneousSatelliteGeometry | null,
  rainRateMmPerHour: number,
  orbitClass: OrbitClass
): ReadonlyArray<RepresentativeRainEndpoint> {
  const carrierFrequencyGHz =
    ORBIT_CLASS_CARRIER_DEFAULTS[orbitClass].carrierFrequencyGHz;
  const endpoints: Array<{
    readonly stationLabel: "A" | "B";
    readonly latitudeDeg: number;
    readonly heightAboveSeaKm: number;
    readonly elevationDeg: number;
  }> = [
    {
      stationLabel: "A",
      latitudeDeg: geometry.stationALatitudeDeg,
      heightAboveSeaKm: geometry.stationAHeightAboveSeaKm,
      elevationDeg: instantaneous?.elevationStationADeg ?? REPRESENTATIVE_ELEVATION_DEG
    },
    {
      stationLabel: "B",
      latitudeDeg: geometry.stationBLatitudeDeg,
      heightAboveSeaKm: geometry.stationBHeightAboveSeaKm,
      elevationDeg: instantaneous?.elevationStationBDeg ?? REPRESENTATIVE_ELEVATION_DEG
    }
  ];
  return endpoints.map((endpoint) => ({
    stationLabel: endpoint.stationLabel,
    latitudeDeg: roundMetric(endpoint.latitudeDeg),
    heightAboveSeaKm: roundMetric(endpoint.heightAboveSeaKm),
    elevationDeg: roundMetric(endpoint.elevationDeg),
    rainAttenuationDb: roundMetric(
      computeRainAttenuationForCarrierDb({
        rainRateMmPerHour,
        carrierFrequencyGHz,
        elevationDeg: normalizeElevationDeg(endpoint.elevationDeg),
        stationHeightAboveSeaKm: endpoint.heightAboveSeaKm,
        stationLatitudeDeg: endpoint.latitudeDeg
      })
    )
  }));
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
    // Relative RSRP proxy: EIRP remains unknown, while antenna gain uses disclosed Tier-B defaults.
    rsrpDbm: roundMetric(details.receivedPowerProxyDbm),
    predictedVisibilityRemainingMs,
    latencyMs: details.latencyMs,
    jitterMs: details.jitterMs
  };
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
  const availableOrbits = ORBIT_CLASSES.filter((orbitClass) =>
    windows.some((window) => window.orbitClass === orbitClass)
  );
  const usedActiveOrbits = new Set<OrbitClass>();
  let totalCommunicatingMs = 0;
  let currentServingCandidateId: string | undefined;
  let currentServingOrbit: OrbitClass | undefined;
  let currentOrbitSinceMs: number | null = null;

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
      details: computeLinkBudgetDetailsAtSample(
        w,
        t,
        options.geometry,
        options.rainRateMmPerHour,
        options.stationHeightAboveSeaKm,
        options.stationLatitudeDeg
      )
    }));

    let next: string | undefined;
    let eventReason: HandoverEvent["reasonKind"] | undefined;

    if (linkBudgetRows.length > 0) {
      const candidates = linkBudgetRows.map((row) =>
        toLivePolicyCandidate(row.window, row.details, t)
      );
      const decision = selectRuntimeHandoverDecision({
        candidates,
        currentServingId: currentServingCandidateId,
        currentServingOrbit,
        currentOrbitSinceMs,
        usedActiveOrbits,
        availableOrbits,
        policy: options.policy,
        sampleTimeMs: t,
        nowUtc: sampleIso
      });
      next = decision.selectedId;
      eventReason = decision.reasonKind;
    }

    if (next) {
      totalCommunicatingMs += stepMs;
      const orbit = visibleAtSample.find((w) => w.satelliteId === next)?.orbitClass;
      if (orbit) {
        byOrbitMs[orbit] += stepMs;
        usedActiveOrbits.add(orbit);
      }
      if (next !== currentServingCandidateId) {
        const previousServingCandidateId = currentServingCandidateId ?? null;
        const previousServingOrbit = currentServingOrbit;
        events.push({
          handoverAtUtc: sampleIso,
          fromSatelliteId: previousServingCandidateId,
          toSatelliteId: next,
          reasonKind:
            previousServingCandidateId &&
            previousServingOrbit &&
            orbit &&
            previousServingOrbit !== orbit
              ? "cross-orbit-migration"
              : eventReason ?? "policy-tie-break"
        });
        if (orbit !== currentServingOrbit) {
          currentOrbitSinceMs = t;
        }
        currentServingCandidateId = next;
        currentServingOrbit = orbit;
      }
    } else {
      currentServingCandidateId = undefined;
      currentServingOrbit = undefined;
      currentOrbitSinceMs = null;
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
    `Per-orbit communication metrics are modeled-precision via 3GPP TR 38.811 + ITU-R P.618-14 / P.676-13 plus assumed Tier-B antenna pattern parameters (ITU-R S.1528 / S.465-6), and handover decisions use the ${handoverPolicyId} policy (TR 38.821 §7.3.2.2 + V-MO1 verbal addendum), not measured service telemetry.`,
    `Communication time and handover timing are quantized to the ${DEFAULT_SAMPLE_STEP_SECONDS}-second default simulation sample step (candidate visibility ranking uses a coarser per-orbit cadence of ${RANKING_VISIBILITY_CADENCE_SECONDS_BY_ORBIT.LEO}/${RANKING_VISIBILITY_CADENCE_SECONDS_BY_ORBIT.MEO}/${RANKING_VISIBILITY_CADENCE_SECONDS_BY_ORBIT.GEO} s for LEO/MEO/GEO); reported durations carry a ±one-sample-step granularity, not continuous-time resolution.`,
    `Per-orbit latency includes a fixed ${FIXED_PROCESSING_DELAY_MS} ms processing constant (a non-standard modeling add-on, not a TR 38.811 quantity) and is displayed to sub-millisecond digits that reflect arithmetic rounding, not measured timing accuracy.`,
    "Assumed antenna parameters are model inputs only; real station RF hardware, EIRP, dish size, and polarization remain source gaps.",
    `Satellite candidates are limited to orbit classes disclosed by both selected stations (${sharedSupportedOrbits.join("/") || "none"}), ranked by TLE/SGP4 pair-visibility geometry, then capped at LEO ${DEFAULT_TLE_CAPS.LEO}, MEO ${DEFAULT_TLE_CAPS.MEO}, GEO ${DEFAULT_TLE_CAPS.GEO} records for interactive compute.`,
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
  records: ReadonlyArray<RuntimeOrbitRecord>,
  allowedOrbits: ReadonlyArray<OrbitClass>
): ReadonlyArray<RuntimeOrbitRecord> {
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
  const pairMidpointLatitudeDeg =
    (input.stationA.lat + input.stationB.lat) / 2;
  const rainRateMmPerHour = normalizeRainRateMmPerHour(input.rainRateMmPerHour);

  const sharedSupportedOrbits = resolveSharedSupportedOrbits(
    input.stationA,
    input.stationB
  );
  const rankedTleRecords = rankTleRecordsForSelectedPair(input.tleRecords, {
    stationA: input.stationA,
    stationB: input.stationB,
    timeWindow: input.timeWindow,
    sharedSupportedOrbits,
    stationAEffectiveElevationThresholdDeg,
    stationBEffectiveElevationThresholdDeg
  });
  const cappedAllRecords = capTleRecords(rankedTleRecords, {
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

  // F1/F2/F3 (WS-F): geometry inputs for per-sample re-propagation in the link
  // budget. satrecs are built once from the capped, orbit-filtered records that
  // can actually appear in a mutual-visibility window.
  const handoverSatrecById = new Map<
    string,
    Parameters<typeof computeInstantaneousSatelliteGeometry>[0]
  >();
  for (const record of cappedRecords) {
    const { satrec } = createRuntimeSatrec(record);
    if (satrec) {
      handoverSatrecById.set(record.satelliteId, satrec);
    }
  }
  const handoverGeometry: HandoverSampleGeometry = {
    satrecById: handoverSatrecById,
    stationAEcef: stationToEcefKm(toStationGeodetic(input.stationA)),
    stationBEcef: stationToEcefKm(toStationGeodetic(input.stationB)),
    stationALatitudeDeg: input.stationA.lat,
    stationBLatitudeDeg: input.stationB.lat,
    stationAHeightAboveSeaKm: input.stationA.elevationM / 1000,
    stationBHeightAboveSeaKm: input.stationB.elevationM / 1000
  };

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
        stationHeightAboveSeaKm: pairMidpointHeightAboveSeaKm,
        stationLatitudeDeg: pairMidpointLatitudeDeg,
        geometry: handoverGeometry
      }
    );

  const representativeLinkBudgetByOrbit = buildRepresentativeLinkBudgetByOrbit(
    visibilityWindows,
    sharedSupportedOrbits,
    rainRateMmPerHour,
    handoverGeometry,
    pairMidpointHeightAboveSeaKm,
    pairMidpointLatitudeDeg
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
    representativeLinkBudgetByOrbit,
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

/** URL query parameter that opts the runtime into the live-refreshed network TLE catalog. */
const TLE_SOURCE_QUERY_PARAM = "tleSource";
const TLE_SOURCE_NETWORK_OPT_IN_VALUE = "network";

export interface LoadDefaultTleSourcesOptions {
  /**
   * Force the network-snapshot resolution path on/off, bypassing the
   * `?tleSource=network` URL probe. Tests and gates that exercise the network
   * fallback contract head-on pass `true`; production callers omit it and inherit
   * the URL-driven default (off).
   */
  readonly networkOptIn?: boolean;
}

/**
 * The delivered demo consumes the pinned bundled TLE snapshots
 * (demo-scenario-config.json) by DEFAULT so the scene is byte-reproducible across
 * runs and wall-clock dates — the runtime never silently swaps in a live-refreshed
 * catalog (honors docs/decisions/0014 decision #6). The network catalog under
 * /fixtures/satellites-network/ stays reachable as an explicit OPT-IN overlay via
 * `?tleSource=network`, preserving the fresh-data (F7) capability without mutating
 * the default delivery surface. Resolved from the URL on first load; node /
 * non-browser contexts default off.
 */
function isNetworkTleSourceOptInRequested(): boolean {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }
  try {
    return (
      new URLSearchParams(window.location.search).get(TLE_SOURCE_QUERY_PARAM) ===
      TLE_SOURCE_NETWORK_OPT_IN_VALUE
    );
  } catch {
    return false;
  }
}

async function loadDefaultTleSourcesUncached(
  fetchImpl: typeof fetch,
  networkOptIn: boolean
): Promise<RuntimeTleSources> {
  const selection = networkOptIn
    ? await resolveTleSourceSelection(fetchImpl)
    : localTleSourceSelection("local-snapshot", null);
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
  fetchImpl: typeof fetch = fetch,
  options: LoadDefaultTleSourcesOptions = {}
): Promise<RuntimeTleSources> {
  const networkOptIn = options.networkOptIn ?? isNetworkTleSourceOptInRequested();
  // Only the canonical production call (real fetch, URL-driven opt-in) shares the
  // module cache; an explicit networkOptIn override bypasses it so a test/gate
  // probe can never poison the default-route promise.
  if (fetchImpl === fetch && options.networkOptIn === undefined) {
    defaultTleSourcesPromise ??= loadDefaultTleSourcesUncached(fetchImpl, networkOptIn);
    return defaultTleSourcesPromise;
  }
  return loadDefaultTleSourcesUncached(fetchImpl, networkOptIn);
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
    ...parseRuntimeTleText(sources.leoTleText, "LEO", sources),
    ...parseRuntimeTleText(sources.meoTleText, "MEO", sources),
    ...parseRuntimeTleText(sources.geoTleText, "GEO", sources)
  ];
}

function parseRuntimeTleText(
  rawText: string,
  orbitClass: OrbitClass,
  sources: RuntimeTleSources
): ReadonlyArray<TleRecord> {
  const metadata = sources.sourceMetadataByOrbit?.[orbitClass];
  return toTleRecords(
    parseOrbitSourceText(rawText, {
      orbitClass,
      format: metadata?.format,
      sourcePolicy:
        metadata?.sourcePolicy ??
        sourcePolicyForMode(sources.sourceMode ?? "local-snapshot")
    }).records
  );
}

function parseRuntimeOrbitText(
  rawText: string,
  orbitClass: OrbitClass,
  sources: RuntimeTleSources
): ReadonlyArray<RuntimeOrbitRecord> {
  const metadata = sources.sourceMetadataByOrbit?.[orbitClass];
  return toRuntimeOrbitRecords(
    parseOrbitSourceText(rawText, {
      orbitClass,
      format: metadata?.format,
      sourcePolicy:
        metadata?.sourcePolicy ??
        sourcePolicyForMode(sources.sourceMode ?? "local-snapshot")
    }).records
  );
}

export function parseRuntimeOrbitSources(
  sources: RuntimeTleSources
): ReadonlyArray<RuntimeOrbitRecord> {
  return [
    ...parseRuntimeOrbitText(sources.leoTleText, "LEO", sources),
    ...parseRuntimeOrbitText(sources.meoTleText, "MEO", sources),
    ...parseRuntimeOrbitText(sources.geoTleText, "GEO", sources)
  ];
}

function sourcePolicyForMode(sourceMode: TleSourceMode): OrbitSourcePolicy {
  if (sourceMode === "network-snapshot") return "refresh-artifact";
  if (sourceMode === "fallback-local-snapshot") return "fallback-local-snapshot";
  return "bundled-snapshot";
}

function resolveOrbitSourceId(
  orbitClass: OrbitClass,
  format: OrbitSourceMetadata["format"]
): string {
  const prefix = format === "omm-json" || format === "omm-csv" ? "omm" : "tle";
  return `${prefix}:${orbitClass.toLowerCase()}`;
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
    sourceId: resolveOrbitSourceId(orbitClass, orbitSourceMetadata.format),
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
