import { twoline2satrec } from "../../vendor/satellite-js-runtime";
import type {
  SceneCameraHint,
  SceneDisplayPolicy,
  SceneSourceMode
} from "./tle-first-scene-view-model";
import type {
  PairSourceTierAttribution,
  PublicRegistryStation
} from "./tier-inference";
import type {
  OrbitClass,
  PairVisibilityWindow,
  TlePropagationStats,
  TleRecord
} from "./visibility-utils";

export type RuntimeTruthClass =
  | "tle-derived"
  | "public-registry-derived"
  | "modeled"
  | "display-only"
  | "fixture-fallback"
  | "unavailable";

export type TleSourceHealth = "fresh" | "stale" | "unknown-age" | "rejected";

export type TleSourceMode =
  | "local-snapshot"
  | "network-snapshot"
  | "fallback-local-snapshot";

export type RuntimeEmptyReasonCode =
  | "no-shared-supported-orbit"
  | "tle-source-unavailable"
  | "no-visibility-windows"
  | "no-pair-intersection"
  | "no-handover-event";

export interface RuntimeNoradIdRangeSummary {
  readonly start: number;
  readonly end: number;
  readonly count: number;
}

export interface RuntimeTleDragTermFieldCoverage {
  readonly meanMotionFirstDerivativeCount: number;
  readonly meanMotionSecondDerivativeCount: number;
  readonly bstarDragTermCount: number;
}

export interface RuntimeTleSourceManifestEntry {
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly orbitClass: OrbitClass;
  readonly recordCount: number;
  readonly acceptedRecordCount: number;
  readonly rejectedRecordCount: number;
  readonly parserFailureCount: number | null;
  readonly capApplied: number | null;
  readonly excludedRecordCount: number;
  readonly excludedReasonCategories: ReadonlyArray<string>;
  readonly epochStartUtc: string | null;
  readonly epochEndUtc: string | null;
  readonly sourceTimestampUtc: string | null;
  readonly healthThresholdDays: number;
  readonly health: TleSourceHealth;
  readonly sgp4ErrorCount: number;
  readonly noradIdRangeSummary: ReadonlyArray<RuntimeNoradIdRangeSummary>;
  readonly cosparDesignatorCount: number;
  readonly cosparDesignatorSamples: ReadonlyArray<string>;
  readonly classificationCounts: Readonly<Record<string, number>>;
  readonly dragTermFieldCoverage: RuntimeTleDragTermFieldCoverage;
}

export interface RuntimeTleSourceFreshness {
  readonly sourceMode: TleSourceMode;
  readonly snapshotFetchedUtc: string | null;
  readonly snapshotPath: string;
  readonly maxEpochUtc: string | null;
  readonly noradIdRangeSummary: ReadonlyArray<RuntimeNoradIdRangeSummary>;
  readonly constellationMembership: Readonly<Record<string, number>>;
  readonly provenance: RuntimeProvenanceTag;
}

export interface RuntimeTleSourceParseStats {
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly orbitClass: OrbitClass;
  readonly sourceMode?: TleSourceMode;
  readonly snapshotFetchedUtc?: string | null;
  readonly snapshotPath?: string;
  readonly rawRecordGroupCount: number;
  readonly parsedRecordCount: number;
  readonly parserFailureCount: number;
  readonly noradIdRangeSummary: ReadonlyArray<RuntimeNoradIdRangeSummary>;
  readonly constellationMembership?: Readonly<Record<string, number>>;
  readonly cosparDesignatorCount: number;
  readonly cosparDesignatorSamples: ReadonlyArray<string>;
  readonly classificationCounts: Readonly<Record<string, number>>;
  readonly dragTermFieldCoverage: RuntimeTleDragTermFieldCoverage;
}

export interface RuntimeProvenanceTag {
  readonly truthClass: RuntimeTruthClass;
  readonly sourceId: string;
  readonly modelId?: string;
  readonly nonClaim?: string;
}

export interface RuntimeDisplayTransformMetadata extends RuntimeProvenanceTag {
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
}

export type RuntimeModeledOutputKind =
  | "handover"
  | "link-budget"
  | "throughput"
  | "jitter"
  | "latency"
  | "rain-impact";

export type RuntimeRainRateControlMode =
  | "user-controlled"
  | "fixture-default"
  | "unavailable";

export interface RuntimeModeledOutputMetadata {
  readonly kind: RuntimeModeledOutputKind;
  readonly modelId: string;
  readonly standardsRef: ReadonlyArray<string>;
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
  readonly outputUnit: string | null;
  readonly rainRateControlMode?: RuntimeRainRateControlMode;
  readonly provenance: RuntimeProvenanceTag;
  readonly nonClaim: string;
}

export interface RuntimeStationPrecisionState {
  readonly stationId: string;
  readonly disclosurePrecision: PublicRegistryStation["disclosurePrecision"];
  readonly sourceTier: PairSourceTierAttribution["sourceTier"];
  readonly rawLat: number;
  readonly rawLon: number;
  readonly renderPositionIsSourceTruth: boolean;
  readonly coordinateUse:
    | "source-coordinate"
    | "operator-family-coordinate"
    | "regional-coordinate";
  readonly provenance: RuntimeProvenanceTag;
}

export interface RuntimeActorProvenanceState {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly sourceId: string;
  readonly propagatedSampleCount: number;
  readonly sampleCadenceSeconds: number;
  readonly firstPropagatedUtc: string | null;
  readonly lastPropagatedUtc: string | null;
  readonly visibilityWindowCount: number;
  readonly provenance: RuntimeProvenanceTag;
}

export interface RuntimeVisibilityProvenanceState {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly sourceId: string;
  readonly stationAWindowSource: string;
  readonly stationBWindowSource: string;
  readonly pairIntersectionSource: string;
  readonly elevationThresholdDeg: number;
  readonly sampleCadenceSeconds: number;
  readonly intersectionStartUtc: string;
  readonly intersectionEndUtc: string;
  readonly provenance: RuntimeProvenanceTag;
}

export interface RuntimeDataCompletenessState {
  readonly routeMode: SceneSourceMode;
  readonly stationPrecision: ReadonlyArray<RuntimeStationPrecisionState>;
  readonly tleSources: ReadonlyArray<RuntimeTleSourceManifestEntry>;
  readonly tleFreshness: ReadonlyArray<RuntimeTleSourceFreshness>;
  readonly actorSourceCoverage: {
    readonly renderedActorCount: number;
    readonly tleBackedActorCount: number;
    readonly fakeActorCount: 0;
  };
  readonly actorProvenance: ReadonlyArray<RuntimeActorProvenanceState>;
  readonly visibilityProvenance: ReadonlyArray<RuntimeVisibilityProvenanceState>;
  readonly modeledOutputs: ReadonlyArray<RuntimeModeledOutputMetadata>;
  readonly displayTransforms: ReadonlyArray<RuntimeDisplayTransformMetadata>;
  readonly visibilityCadenceSecondsByOrbit: Readonly<Record<OrbitClass, number>>;
  readonly emptyReasonCode: RuntimeEmptyReasonCode | null;
}

export interface BuildRuntimeDataCompletenessInput {
  readonly routeMode: SceneSourceMode;
  readonly stationA: PublicRegistryStation;
  readonly stationB: PublicRegistryStation;
  readonly pairSourceTier: PairSourceTierAttribution["sourceTier"];
  readonly allTleRecords: ReadonlyArray<TleRecord>;
  readonly cappedTleRecords: ReadonlyArray<TleRecord>;
  readonly acceptedTleRecords: ReadonlyArray<TleRecord>;
  readonly tleParseStats?: ReadonlyArray<RuntimeTleSourceParseStats>;
  readonly sourcePaths: Readonly<Record<OrbitClass, string>>;
  readonly tleSourceMode?: TleSourceMode;
  readonly snapshotFetchedUtc?: string | null;
  readonly caps: Readonly<Record<OrbitClass, number>>;
  readonly referenceUtc: string;
  readonly timeWindow: { readonly startUtc: string; readonly endUtc: string };
  readonly sharedSupportedOrbits: ReadonlyArray<OrbitClass>;
  readonly stationAVisibilityWindowCount: number;
  readonly stationBVisibilityWindowCount: number;
  readonly visibilityWindows: ReadonlyArray<PairVisibilityWindow>;
  readonly handoverEventCount: number;
  readonly rainRateMmPerHour: number;
  readonly rainRateControlMode: RuntimeRainRateControlMode;
  readonly sampleStepSeconds: number;
  readonly sampleCadenceSecondsByOrbit: Readonly<Record<OrbitClass, number>>;
  readonly elevationThresholdDeg: number;
  readonly propagationStatsBySatellite?: ReadonlyMap<string, TlePropagationStats>;
  readonly sourceHealthThresholdDays?: Partial<Record<OrbitClass, number>>;
  readonly sceneCameraHint?: SceneCameraHint;
  readonly sceneDisplayPolicy?: SceneDisplayPolicy;
}

const ORBIT_CLASSES: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

const SOURCE_HEALTH_THRESHOLD_DAYS: Readonly<Record<OrbitClass, number>> = {
  LEO: 14,
  MEO: 30,
  GEO: 30
};

function countByOrbit(records: ReadonlyArray<TleRecord>): Record<OrbitClass, number> {
  const counts: Record<OrbitClass, number> = { LEO: 0, MEO: 0, GEO: 0 };
  for (const record of records) {
    counts[record.orbitClass] += 1;
  }
  return counts;
}

function parseTleEpochUtc(line1: string): string | null {
  const yearPart = Number(line1.slice(18, 20));
  const dayPart = Number(line1.slice(20, 32));
  if (!Number.isFinite(yearPart) || !Number.isFinite(dayPart)) {
    return null;
  }
  const year = yearPart < 57 ? 2000 + yearPart : 1900 + yearPart;
  const wholeDay = Math.floor(dayPart);
  const dayFraction = dayPart - wholeDay;
  const epoch = new Date(Date.UTC(year, 0, 1));
  epoch.setUTCDate(epoch.getUTCDate() + wholeDay - 1);
  epoch.setUTCMilliseconds(dayFraction * 86_400_000);
  return epoch.toISOString();
}

function resolveEpochRange(
  records: ReadonlyArray<TleRecord>
): { epochStartUtc: string | null; epochEndUtc: string | null } {
  const epochs = records
    .map((record) => parseTleEpochUtc(record.tleLine1))
    .filter((epoch): epoch is string => epoch !== null)
    .sort();
  return {
    epochStartUtc: epochs[0] ?? null,
    epochEndUtc: epochs.length > 0 ? epochs[epochs.length - 1] : null
  };
}

function extractSourceTimestampUtc(sourcePath: string): string | null {
  const match = sourcePath.match(/(\d{4}-\d{2}-\d{2})T/);
  return match ? `${match[1]}T00:00:00.000Z` : null;
}

function maxUtc(
  ...values: ReadonlyArray<string | null | undefined>
): string | null {
  const times = values
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter((value) => Number.isFinite(value));
  if (times.length === 0) {
    return null;
  }
  return new Date(Math.max(...times)).toISOString();
}

function resolveTleSourceHealth(options: {
  readonly sourceTimestampUtc: string | null;
  readonly epochEndUtc: string | null;
  readonly referenceUtc: string;
  readonly thresholdDays: number;
}): TleSourceHealth {
  const freshnessAnchorUtc = maxUtc(options.sourceTimestampUtc, options.epochEndUtc);
  if (!freshnessAnchorUtc) {
    return "unknown-age";
  }
  const sourceMs = Date.parse(freshnessAnchorUtc);
  const referenceMs = Date.parse(options.referenceUtc);
  if (!Number.isFinite(sourceMs) || !Number.isFinite(referenceMs)) {
    return "unknown-age";
  }
  const ageDays = Math.max(0, (referenceMs - sourceMs) / 86_400_000);
  return ageDays <= options.thresholdDays ? "fresh" : "stale";
}

function resolveHealthThresholdDays(
  orbitClass: OrbitClass,
  overrides?: Partial<Record<OrbitClass, number>>
): number {
  const override = overrides?.[orbitClass];
  if (Number.isFinite(override) && override !== undefined && override > 0) {
    return override;
  }
  return SOURCE_HEALTH_THRESHOLD_DAYS[orbitClass];
}

function summarizeNoradIds(
  records: ReadonlyArray<TleRecord>
): ReadonlyArray<RuntimeNoradIdRangeSummary> {
  const ids = records
    .map((record) => record.noradCatalogId)
    .filter((id): id is number => Number.isInteger(id))
    .sort((left, right) => left - right);
  if (ids.length === 0) {
    return [];
  }
  const ranges: RuntimeNoradIdRangeSummary[] = [];
  let start = ids[0];
  let end = ids[0];
  let count = 1;
  for (let index = 1; index < ids.length; index += 1) {
    const id = ids[index];
    if (id === end + 1) {
      end = id;
      count += 1;
      continue;
    }
    ranges.push({ start, end, count });
    start = id;
    end = id;
    count = 1;
  }
  ranges.push({ start, end, count });
  return ranges;
}

function countClassification(records: ReadonlyArray<TleRecord>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    const key = record.classification || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildDragTermCoverage(
  records: ReadonlyArray<TleRecord>
): RuntimeTleDragTermFieldCoverage {
  return {
    meanMotionFirstDerivativeCount: records.filter(
      (record) => record.meanMotionFirstDerivative !== null && record.meanMotionFirstDerivative !== undefined
    ).length,
    meanMotionSecondDerivativeCount: records.filter(
      (record) => record.meanMotionSecondDerivative !== null && record.meanMotionSecondDerivative !== undefined
    ).length,
    bstarDragTermCount: records.filter(
      (record) => record.bstarDragTerm !== null && record.bstarDragTerm !== undefined
    ).length
  };
}

function resolveCosparSamples(records: ReadonlyArray<TleRecord>): ReadonlyArray<string> {
  return [
    ...new Set(
      records
        .map((record) => record.cosparDesignator)
        .filter((value): value is string => Boolean(value))
    )
  ].slice(0, 8);
}

function countSgp4ErrorRecords(records: ReadonlyArray<TleRecord>): number {
  let count = 0;
  for (const record of records) {
    try {
      const satrec = twoline2satrec(record.tleLine1, record.tleLine2);
      if (satrec?.error) {
        count += 1;
      }
    } catch {
      count += 1;
    }
  }
  return count;
}

function resolveCoordinateUse(
  disclosurePrecision: PublicRegistryStation["disclosurePrecision"]
): RuntimeStationPrecisionState["coordinateUse"] {
  if (disclosurePrecision === "exact-coords") {
    return "source-coordinate";
  }
  if (disclosurePrecision === "operator-family-region") {
    return "operator-family-coordinate";
  }
  return "regional-coordinate";
}

function buildStationPrecisionState(
  station: PublicRegistryStation,
  pairSourceTier: PairSourceTierAttribution["sourceTier"]
): RuntimeStationPrecisionState {
  const coordinateUse = resolveCoordinateUse(station.disclosurePrecision);
  return {
    stationId: station.id,
    disclosurePrecision: station.disclosurePrecision,
    sourceTier: pairSourceTier,
    rawLat: station.lat,
    rawLon: station.lon,
    renderPositionIsSourceTruth: coordinateUse === "source-coordinate",
    coordinateUse,
    provenance: {
      truthClass: "public-registry-derived",
      sourceId: `station-registry:${station.id}`
    }
  };
}

function buildTleSourceManifest(
  input: BuildRuntimeDataCompletenessInput
): ReadonlyArray<RuntimeTleSourceManifestEntry> {
  const totalByOrbit = countByOrbit(input.allTleRecords);
  const cappedByOrbit = countByOrbit(input.cappedTleRecords);
  const acceptedByOrbit = countByOrbit(input.acceptedTleRecords);

  return ORBIT_CLASSES.map((orbitClass) => {
    const parseStats = input.tleParseStats?.find(
      (stats) => stats.orbitClass === orbitClass
    );
    const allRecords = input.allTleRecords.filter(
      (record) => record.orbitClass === orbitClass
    );
    const totalCount = totalByOrbit[orbitClass];
    const cappedCount = cappedByOrbit[orbitClass];
    const acceptedCount = acceptedByOrbit[orbitClass];
    const capExcludedCount = Math.max(0, totalCount - cappedCount);
    const unsupportedOrbitCount = Math.max(0, cappedCount - acceptedCount);
    const excludedReasonCategories = [
      ...(capExcludedCount > 0 ? ["per-orbit-cap"] : []),
      ...(unsupportedOrbitCount > 0 ? ["not-shared-supported-orbit"] : [])
    ];
    const sourcePath = input.sourcePaths[orbitClass];
    const sourceTimestampUtc = extractSourceTimestampUtc(sourcePath);
    const healthThresholdDays = resolveHealthThresholdDays(
      orbitClass,
      input.sourceHealthThresholdDays
    );
    const epochRange = resolveEpochRange(allRecords);
    const cosparDesignatorSamples =
      parseStats?.cosparDesignatorSamples ?? resolveCosparSamples(allRecords);
    return {
      sourceId: `tle:${orbitClass.toLowerCase()}`,
      sourcePath,
      orbitClass,
      recordCount: totalCount,
      acceptedRecordCount: acceptedCount,
      rejectedRecordCount: capExcludedCount + unsupportedOrbitCount,
      parserFailureCount: parseStats?.parserFailureCount ?? null,
      capApplied: input.caps[orbitClass] ?? null,
      excludedRecordCount: capExcludedCount + unsupportedOrbitCount,
      excludedReasonCategories,
      ...epochRange,
      sourceTimestampUtc,
      healthThresholdDays,
      health: resolveTleSourceHealth({
        sourceTimestampUtc,
        epochEndUtc: epochRange.epochEndUtc,
        referenceUtc: input.referenceUtc,
        thresholdDays: healthThresholdDays
      }),
      sgp4ErrorCount: countSgp4ErrorRecords(allRecords),
      noradIdRangeSummary:
        parseStats?.noradIdRangeSummary ?? summarizeNoradIds(allRecords),
      cosparDesignatorCount:
        parseStats?.cosparDesignatorCount ?? cosparDesignatorSamples.length,
      cosparDesignatorSamples,
      classificationCounts:
        parseStats?.classificationCounts ?? countClassification(allRecords),
      dragTermFieldCoverage:
        parseStats?.dragTermFieldCoverage ?? buildDragTermCoverage(allRecords)
    };
  });
}

function resolveTleSourceMode(input: BuildRuntimeDataCompletenessInput): TleSourceMode {
  if (input.tleSourceMode) {
    return input.tleSourceMode;
  }
  const modes = [
    ...new Set(
      (input.tleParseStats ?? [])
        .map((stats) => stats.sourceMode)
        .filter((mode): mode is TleSourceMode => Boolean(mode))
    )
  ];
  return modes.length === 1 ? modes[0] : "local-snapshot";
}

function resolveSnapshotFetchedUtc(
  input: BuildRuntimeDataCompletenessInput
): string | null {
  if (input.snapshotFetchedUtc !== undefined) {
    return input.snapshotFetchedUtc;
  }
  const fetchedValues = [
    ...new Set(
      (input.tleParseStats ?? [])
        .map((stats) => stats.snapshotFetchedUtc)
        .filter((value): value is string => Boolean(value))
    )
  ];
  return fetchedValues.length === 1 ? fetchedValues[0] : null;
}

function resolveConstellationMembership(
  stats: RuntimeTleSourceParseStats | undefined
): Readonly<Record<string, number>> {
  if (!stats?.constellationMembership) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(stats.constellationMembership)
      .filter(([, count]) => Number.isInteger(count) && count > 0)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  );
}

export function buildRuntimeTleSourceFreshness(
  input: BuildRuntimeDataCompletenessInput,
  sources: ReadonlyArray<RuntimeTleSourceManifestEntry> = buildTleSourceManifest(input)
): ReadonlyArray<RuntimeTleSourceFreshness> {
  const sourceMode = resolveTleSourceMode(input);
  const snapshotFetchedUtc = resolveSnapshotFetchedUtc(input);
  return sources.map((source) => {
    const stats = input.tleParseStats?.find(
      (candidate) => candidate.orbitClass === source.orbitClass
    );
    return {
      sourceMode,
      snapshotFetchedUtc,
      snapshotPath: stats?.snapshotPath ?? source.sourcePath,
      maxEpochUtc: source.epochEndUtc,
      noradIdRangeSummary: source.noradIdRangeSummary,
      constellationMembership: resolveConstellationMembership(stats),
      provenance: {
        truthClass: "tle-derived",
        sourceId: source.sourceId,
        nonClaim:
          sourceMode === "local-snapshot"
            ? "Bundled TLE snapshot selected at bootstrap."
            : "Bundled network-refresh artifact selected at bootstrap; no live orbital-data fetch occurs in the browser."
      }
    };
  });
}

function resolveSourceIdForOrbit(orbitClass: OrbitClass): string {
  return `tle:${orbitClass.toLowerCase()}`;
}

function resolveProjectionSampleCount(
  input: BuildRuntimeDataCompletenessInput,
  orbitClass: OrbitClass = "LEO"
): number {
  const startMs = Date.parse(input.timeWindow.startUtc);
  const endMs = Date.parse(input.timeWindow.endUtc);
  const stepMs = input.sampleCadenceSecondsByOrbit[orbitClass] * 1000;
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    !Number.isFinite(stepMs) ||
    stepMs <= 0 ||
    endMs <= startMs
  ) {
    return 0;
  }
  return Math.ceil((endMs - startMs) / stepMs);
}

function buildActorProvenance(
  input: BuildRuntimeDataCompletenessInput
): ReadonlyArray<RuntimeActorProvenanceState> {
  const windowsBySatellite = new Map<string, ReadonlyArray<PairVisibilityWindow>>();
  for (const window of input.visibilityWindows) {
    windowsBySatellite.set(window.satelliteId, [
      ...(windowsBySatellite.get(window.satelliteId) ?? []),
      window
    ]);
  }
  return [...windowsBySatellite.entries()]
    .map((entry): RuntimeActorProvenanceState => {
      const [satelliteId, windows] = entry;
      const orbitClass = windows[0]?.orbitClass ?? "LEO";
      const sourceId = resolveSourceIdForOrbit(orbitClass);
      const propagationStats = input.propagationStatsBySatellite?.get(satelliteId);
      const sampleCount = resolveProjectionSampleCount(input, orbitClass);
      return {
        satelliteId,
        orbitClass,
        sourceId,
        propagatedSampleCount:
          propagationStats?.propagatedSampleCount ?? sampleCount,
        sampleCadenceSeconds:
          propagationStats?.sampleCadenceSeconds ??
          input.sampleCadenceSecondsByOrbit[orbitClass],
        firstPropagatedUtc:
          propagationStats?.firstPropagatedUtc ??
          (sampleCount > 0 ? input.timeWindow.startUtc : null),
        lastPropagatedUtc:
          propagationStats?.lastPropagatedUtc ??
          (sampleCount > 0 ? input.timeWindow.endUtc : null),
        visibilityWindowCount: windows.length,
        provenance: {
          truthClass: "tle-derived",
          sourceId
        }
      };
    })
    .sort((left, right) => left.satelliteId.localeCompare(right.satelliteId));
}

function buildVisibilityProvenance(
  input: BuildRuntimeDataCompletenessInput
): ReadonlyArray<RuntimeVisibilityProvenanceState> {
  return input.visibilityWindows.map((window) => {
    const sourceId = resolveSourceIdForOrbit(window.orbitClass);
    return {
      satelliteId: window.satelliteId,
      orbitClass: window.orbitClass,
      sourceId,
      stationAWindowSource: `visibility:${input.stationA.id}:${window.satelliteId}`,
      stationBWindowSource: `visibility:${input.stationB.id}:${window.satelliteId}`,
      pairIntersectionSource: `pair-intersection:${input.stationA.id}:${input.stationB.id}:${window.satelliteId}`,
      elevationThresholdDeg: input.elevationThresholdDeg,
      sampleCadenceSeconds: input.sampleCadenceSecondsByOrbit[window.orbitClass],
      intersectionStartUtc: window.intersectionStartUtc,
      intersectionEndUtc: window.intersectionEndUtc,
      provenance: {
        truthClass: "tle-derived",
        sourceId
      }
    };
  });
}

function buildModeledOutputs(
  input: BuildRuntimeDataCompletenessInput
): ReadonlyArray<RuntimeModeledOutputMetadata> {
  const baseInputSummary = () => ({
    rainRateMmPerHour: input.rainRateMmPerHour,
    handoverSampleStepSeconds: input.sampleStepSeconds,
    leoCadenceSeconds: input.sampleCadenceSecondsByOrbit.LEO,
    meoCadenceSeconds: input.sampleCadenceSecondsByOrbit.MEO,
    geoCadenceSeconds: input.sampleCadenceSecondsByOrbit.GEO,
    elevationThresholdDeg: input.elevationThresholdDeg
  });
  const modelNonClaim =
    "Modeled output only; not measured operator telemetry or private schedule truth.";
  const provenance = (modelId: string): RuntimeProvenanceTag => ({
    truthClass: "modeled",
    sourceId: "runtime-projection",
    modelId,
    nonClaim: modelNonClaim
  });

  return [
    {
      kind: "handover",
      modelId: "cross-orbit-live-policy",
      standardsRef: ["3GPP TR 38.821 §7.3", "V-MO1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "handover",
        eventCount: input.handoverEventCount
      },
      outputUnit: "event",
      provenance: provenance("cross-orbit-live-policy"),
      nonClaim: modelNonClaim
    },
    {
      kind: "link-budget",
      modelId: "fspl-rain-gas-link-budget-v1",
      standardsRef: [
        "3GPP TR 38.811 §6.6.2",
        "ITU-R P.618-14 §2.2.1",
        "ITU-R P.676-13 Annex 2"
      ],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "link-budget",
        carrierSelection: "orbit-class-default"
      },
      outputUnit: "dB",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance("fspl-rain-gas-link-budget-v1"),
      nonClaim: modelNonClaim
    },
    {
      kind: "throughput",
      modelId: "selected-pair-throughput-estimate-v1",
      standardsRef: ["3GPP TR 38.811 §6.6.2", "ITU-R P.618-14 §2.2.1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "throughput",
        capacityModel: "clear-sky-reference-with-fade-derating"
      },
      outputUnit: "Mbps",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance("selected-pair-throughput-estimate-v1"),
      nonClaim: modelNonClaim
    },
    {
      kind: "jitter",
      modelId: "selected-pair-jitter-estimate-v1",
      standardsRef: ["ITU-R P.618-14 §2.2.1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "jitter",
        jitterModel: "orbit-baseline-with-rain-scale"
      },
      outputUnit: "ms",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance("selected-pair-jitter-estimate-v1"),
      nonClaim: modelNonClaim
    },
    {
      kind: "latency",
      modelId: "selected-pair-propagation-delay-v1",
      standardsRef: ["3GPP TR 38.811 §6.7"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "latency",
        delayModel: "slant-range-one-way-plus-fixed-processing"
      },
      outputUnit: "ms",
      provenance: provenance("selected-pair-propagation-delay-v1"),
      nonClaim: modelNonClaim
    },
    {
      kind: "rain-impact",
      modelId: "selected-pair-rain-impact-v1",
      standardsRef: ["ITU-R P.618-14 §2.2.1"],
      inputSummary: {
        ...baseInputSummary(),
        outputKind: "rain-impact",
        rainRateControlMode: input.rainRateControlMode
      },
      outputUnit: "dB",
      rainRateControlMode: input.rainRateControlMode,
      provenance: provenance("selected-pair-rain-impact-v1"),
      nonClaim: modelNonClaim
    }
  ];
}

function buildDisplayTransforms(
  input: BuildRuntimeDataCompletenessInput
): ReadonlyArray<RuntimeDisplayTransformMetadata> {
  const cameraHint = input.sceneCameraHint;
  const displayPolicy = input.sceneDisplayPolicy;
  return [
    {
      truthClass: "display-only",
      sourceId: "selected-pair-scene-altitude-compression",
      inputSummary: {
        enabled: displayPolicy?.altitudeCompressionEnabled ?? null,
        factor: displayPolicy?.altitudeCompressionFactor ?? null
      },
      nonClaim: "Renderer transform only; source ECEF samples remain separate."
    },
    {
      truthClass: "display-only",
      sourceId: "selected-pair-scene-camera-framing",
      inputSummary: {
        pairGeometry: cameraHint?.pairGeometry ?? null,
        suggestedAltitudeKm: cameraHint?.suggestedAltitudeKm ?? null,
        suggestedHeadingDeg: cameraHint?.suggestedHeadingDeg ?? null,
        suggestedPitchDeg: cameraHint?.suggestedPitchDeg ?? null
      },
      nonClaim: "Camera framing only; it does not alter station or satellite truth."
    },
    {
      truthClass: "display-only",
      sourceId: "selected-pair-scene-label-density",
      inputSummary: {
        maxVisibleActorLabels: displayPolicy?.maxVisibleActorLabels ?? null,
        suppressNonActiveTrails: displayPolicy?.suppressNonActiveTrails ?? null
      },
      nonClaim: "Label-density choice only; it does not alter computed visibility."
    },
    {
      truthClass: "display-only",
      sourceId: "selected-pair-scene-display-lane-offset",
      inputSummary: {
        leoCadenceSeconds: input.sampleCadenceSecondsByOrbit.LEO,
        meoCadenceSeconds: input.sampleCadenceSecondsByOrbit.MEO,
        geoCadenceSeconds: input.sampleCadenceSecondsByOrbit.GEO
      },
      nonClaim: "Display lane or label offset only; source coordinates remain separate."
    },
    {
      truthClass: "display-only",
      sourceId: "selected-pair-scene-generic-actor-mesh",
      inputSummary: {
        meshClass: "generic-satellite",
        sourceMode: input.routeMode
      },
      nonClaim: "Generic mesh choice only; it is not operator hardware truth."
    }
  ];
}

function resolveEmptyReasonCode(
  input: BuildRuntimeDataCompletenessInput
): RuntimeEmptyReasonCode | null {
  if (input.sharedSupportedOrbits.length === 0) {
    return "no-shared-supported-orbit";
  }
  if (input.acceptedTleRecords.length === 0) {
    return "tle-source-unavailable";
  }
  if (
    input.stationAVisibilityWindowCount === 0 &&
    input.stationBVisibilityWindowCount === 0
  ) {
    return "no-visibility-windows";
  }
  if (input.visibilityWindows.length === 0) {
    return "no-pair-intersection";
  }
  if (input.handoverEventCount === 0) {
    return "no-handover-event";
  }
  return null;
}

export function buildRuntimeDataCompletenessState(
  input: BuildRuntimeDataCompletenessInput
): RuntimeDataCompletenessState {
  const visibleSatelliteIds = new Set(
    input.visibilityWindows.map((window) => window.satelliteId)
  );
  const tleSources = buildTleSourceManifest(input);
  return {
    routeMode: input.routeMode,
    stationPrecision: [
      buildStationPrecisionState(input.stationA, input.pairSourceTier),
      buildStationPrecisionState(input.stationB, input.pairSourceTier)
    ],
    tleSources,
    tleFreshness: buildRuntimeTleSourceFreshness(input, tleSources),
    actorSourceCoverage: {
      renderedActorCount: visibleSatelliteIds.size,
      tleBackedActorCount: visibleSatelliteIds.size,
      fakeActorCount: 0
    },
    actorProvenance: buildActorProvenance(input),
    visibilityProvenance: buildVisibilityProvenance(input),
    modeledOutputs: buildModeledOutputs(input),
    displayTransforms: buildDisplayTransforms(input),
    visibilityCadenceSecondsByOrbit: input.sampleCadenceSecondsByOrbit,
    emptyReasonCode: resolveEmptyReasonCode(input)
  };
}
