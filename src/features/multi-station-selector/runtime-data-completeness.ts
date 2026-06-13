import { createRuntimeSatrec } from "./orbit-propagation";
import networkTleManifest from "../../fixtures/satellites-network/manifest.json";
import stationCoordinateAuthorityFixture from "../../fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json";
import stationElevationCacheFixture from "../../fixtures/ground-stations/station-elevations-cache.json";
import type { HandoverPolicyConfig } from "../../runtime/link-budget/handover-policy";
import type {
  SceneCameraHint,
  SceneDisplayPolicy,
  SceneSourceMode
} from "./tle-first-scene-view-model";
import {
  inferPairSourceTier,
  type PairSourceEvidenceKind,
  type PairSourceTierAttribution,
  type PublicRegistryStation
} from "./tier-inference";
import type {
  OrbitClass,
  PairVisibilityWindow,
  RuntimeOrbitRecord,
  TlePropagationStats,
} from "./visibility-utils";
import type {
  CatalogNumberCompatibility,
  OrbitSourceApiClass,
  OrbitSourceFormat,
  OrbitSourcePolicy,
  RuntimeNoradIdRangeSummary,
  RuntimeTleDragTermFieldCoverage
} from "./orbit-source-parser";
import {
  buildMetricAnchorDisclosure,
  buildModeledOutputs,
  type RuntimeMetricAnchorDisclosureState,
  type RuntimeModeledOutputMetadata,
  type RuntimePolicyDisclosureState,
  type RuntimeProvenanceTag,
  type RuntimeRainRateControlMode,
  type RuntimeTruthClass
} from "./runtime-modeled-output";
import {
  RUNTIME_ANTENNA_ASSUMPTION_MODEL_LABEL,
  RUNTIME_ANTENNA_ASSUMPTION_NON_CLAIM,
  RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS,
  RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID,
  formatRuntimeAntennaAssumptionSetSummary
} from "./runtime-antenna-assumptions";

export type {
  RuntimeMetricAnchorDisclosureState,
  RuntimeModeledOutputMetadata,
  RuntimeModeledOutputKind,
  RuntimePolicyDisclosureState,
  RuntimePolicyDisclosureThresholds,
  RuntimeProvenanceTag,
  RuntimeRainRateControlMode,
  RuntimeTruthClass
} from "./runtime-modeled-output";

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

export type RuntimeCoordinateSourceAuthority =
  | "official-filing"
  | "operator-web"
  | "teleport-directory"
  | "secondary-web"
  | "wikipedia"
  | "news"
  | "mixed-public"
  | "unknown-public";

export type RuntimeElevationSourceKind =
  | "legacy-service-cache"
  | "dem-derived"
  | "operator-stated"
  | "legacy-unknown";

export type RuntimeElevationSamplingMethod =
  | "service-response"
  | "dem-cell-sample"
  | "nearest-cell-cog-range-read"
  | "operator-web-altitude-plus-dem-terrain-comparison"
  | "unavailable";

export type RuntimeElevationProvenanceStatus =
  | "legacy-upstream-dem-unknown"
  | "dem-provenance-complete"
  | "public-dem-derived-selected-pair"
  | "operator-stated-altitude-with-public-dem-terrain"
  | "legacy-unknown";

interface StationCoordinateAuthorityEntry {
  readonly stationId: string;
  readonly coordinateSourceAuthority: RuntimeCoordinateSourceAuthority;
  readonly coordinateSourceUrl: string | null;
  readonly coordinateSourceNote: string;
}

interface StationElevationCacheEntry {
  readonly stationId: string;
  readonly elevationM: number;
  readonly sourceAccessedUtc: string;
  readonly elevationSourceKind: RuntimeElevationSourceKind;
  readonly elevationDatasetId: string;
  readonly elevationDatasetVersion: string | null;
  readonly elevationDatasetResolutionM: number | null;
  readonly elevationVerticalDatum: string | null;
  readonly elevationTileId: string | null;
  readonly elevationCellId: string | null;
  readonly elevationSampleLat: number | null;
  readonly elevationSampleLon: number | null;
  readonly elevationSamplingMethod: RuntimeElevationSamplingMethod;
  readonly elevationSampledAtUtc: string | null;
  readonly elevationCacheGeneratedUtc: string | null;
  readonly elevationLicenseId: string;
  readonly elevationLicenseUrl: string | null;
  readonly elevationCitation: string;
  readonly elevationProvenanceStatus: RuntimeElevationProvenanceStatus;
  readonly elevationNonClaim: string;
}

export interface RuntimeStationElevationMetadata {
  readonly elevationM: number;
  readonly elevationSourceId: string;
  readonly elevationSourcePath: string;
  readonly elevationSourceNote: string;
  readonly elevationSourceAccessedUtc: string | null;
  readonly elevationSourceKind: RuntimeElevationSourceKind;
  readonly elevationDatasetId: string;
  readonly elevationDatasetVersion: string | null;
  readonly elevationDatasetResolutionM: number | null;
  readonly elevationVerticalDatum: string | null;
  readonly elevationTileId: string | null;
  readonly elevationCellId: string | null;
  readonly elevationSampleLat: number | null;
  readonly elevationSampleLon: number | null;
  readonly elevationSamplingMethod: RuntimeElevationSamplingMethod;
  readonly elevationSampledAtUtc: string | null;
  readonly elevationCacheGeneratedUtc: string | null;
  readonly elevationLicenseId: string;
  readonly elevationLicenseUrl: string | null;
  readonly elevationCitation: string;
  readonly elevationProvenanceStatus: RuntimeElevationProvenanceStatus;
  readonly elevationNonClaim: string;
}

export interface RuntimeTleSourceManifestEntry {
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly orbitClass: OrbitClass;
  readonly format: OrbitSourceFormat;
  readonly apiClass: OrbitSourceApiClass;
  readonly sourcePolicy: OrbitSourcePolicy;
  readonly catalogNumberCompatibility: CatalogNumberCompatibility;
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
  readonly format: OrbitSourceFormat;
  readonly apiClass: OrbitSourceApiClass;
  readonly sourcePolicy: OrbitSourcePolicy;
  readonly catalogNumberCompatibility: CatalogNumberCompatibility;
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
  readonly format: OrbitSourceFormat;
  readonly apiClass: OrbitSourceApiClass;
  readonly sourcePolicy: OrbitSourcePolicy;
  readonly catalogNumberCompatibility: CatalogNumberCompatibility;
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

export interface RuntimeDisplayTransformMetadata extends RuntimeProvenanceTag {
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
}

export interface RuntimeStationPrecisionState {
  readonly stationId: string;
  readonly disclosurePrecision: PublicRegistryStation["disclosurePrecision"];
  readonly sourceTier: PairSourceTierAttribution["sourceTier"];
  readonly coordinateSourceAuthority: RuntimeCoordinateSourceAuthority;
  readonly coordinateSourceUrl: string | null;
  readonly coordinateSourceNote: string;
  readonly rawLat: number;
  readonly rawLon: number;
  readonly elevationM: RuntimeStationElevationMetadata["elevationM"];
  readonly elevationSourceId: RuntimeStationElevationMetadata["elevationSourceId"];
  readonly elevationSourcePath: RuntimeStationElevationMetadata["elevationSourcePath"];
  readonly elevationSourceNote: RuntimeStationElevationMetadata["elevationSourceNote"];
  readonly elevationSourceAccessedUtc: RuntimeStationElevationMetadata["elevationSourceAccessedUtc"];
  readonly elevationSourceKind: RuntimeStationElevationMetadata["elevationSourceKind"];
  readonly elevationDatasetId: RuntimeStationElevationMetadata["elevationDatasetId"];
  readonly elevationDatasetVersion: RuntimeStationElevationMetadata["elevationDatasetVersion"];
  readonly elevationDatasetResolutionM: RuntimeStationElevationMetadata["elevationDatasetResolutionM"];
  readonly elevationVerticalDatum: RuntimeStationElevationMetadata["elevationVerticalDatum"];
  readonly elevationTileId: RuntimeStationElevationMetadata["elevationTileId"];
  readonly elevationCellId: RuntimeStationElevationMetadata["elevationCellId"];
  readonly elevationSampleLat: RuntimeStationElevationMetadata["elevationSampleLat"];
  readonly elevationSampleLon: RuntimeStationElevationMetadata["elevationSampleLon"];
  readonly elevationSamplingMethod: RuntimeStationElevationMetadata["elevationSamplingMethod"];
  readonly elevationSampledAtUtc: RuntimeStationElevationMetadata["elevationSampledAtUtc"];
  readonly elevationCacheGeneratedUtc: RuntimeStationElevationMetadata["elevationCacheGeneratedUtc"];
  readonly elevationLicenseId: RuntimeStationElevationMetadata["elevationLicenseId"];
  readonly elevationLicenseUrl: RuntimeStationElevationMetadata["elevationLicenseUrl"];
  readonly elevationCitation: RuntimeStationElevationMetadata["elevationCitation"];
  readonly elevationProvenanceStatus: RuntimeStationElevationMetadata["elevationProvenanceStatus"];
  readonly elevationNonClaim: RuntimeStationElevationMetadata["elevationNonClaim"];
  readonly terrainMaskDeg: number;
  readonly terrainMaskSourceId: string;
  readonly terrainMaskIsDefault: boolean;
  readonly terrainMaskNote: string;
  readonly effectiveElevationThresholdDeg: number;
  readonly renderPositionIsSourceTruth: boolean;
  readonly coordinateUse:
    | "source-coordinate"
    | "operator-family-coordinate"
    | "regional-coordinate";
  readonly provenance: RuntimeProvenanceTag;
}

export interface RuntimePairSourceAttributionState {
  readonly sourceTier: PairSourceTierAttribution["sourceTier"];
  readonly evidenceKind: PairSourceEvidenceKind;
  readonly badgeLabel: string;
  readonly nonClaims: ReadonlyArray<string>;
}

export interface RuntimeCapDisclosureState {
  readonly perOrbitCap: Readonly<Record<OrbitClass, number>>;
  readonly perOrbitInventory: Readonly<Record<OrbitClass, number>>;
  readonly cappedAtRuntime: Readonly<Record<OrbitClass, boolean>>;
}

export interface RuntimeInventoryDisclosureOrbitState {
  readonly orbitClass: OrbitClass;
  readonly inventorySourceMode: TleSourceMode;
  readonly networkSnapshotInventoryCount: number | null;
  readonly localFallbackInventoryCount: number | null;
  readonly localFallbackInventoryNote: string;
  readonly activeInventoryCount: number;
  readonly acceptedRecordCount: number;
  readonly runtimeCap: number;
  readonly cappedAtRuntime: boolean;
  readonly visibleActorCount: number;
}

export interface RuntimeInventoryDisclosureState {
  readonly perOrbit: Readonly<Record<OrbitClass, RuntimeInventoryDisclosureOrbitState>>;
  readonly note: string;
}

export type RuntimeRfChainTermKind =
  | "tx-eirp"
  | "free-space-path-loss"
  | "gas-absorption"
  | "rain-attenuation"
  | "satellite-antenna-gain"
  | "rx-antenna-gain";

export interface RuntimeRfChainTermState {
  readonly kind: RuntimeRfChainTermKind;
  readonly contributionSignedDb: number | null;
  readonly modelId: string;
  readonly standardsRef: ReadonlyArray<string>;
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
  readonly provenance: RuntimeProvenanceTag;
  readonly nonClaim: string;
}

export interface RuntimeRfChainBreakdownState {
  readonly carrierBand: string | null;
  readonly carrierFrequencyGHz: number | null;
  readonly receivedPowerProxyDbm: number | null;
  readonly terms: ReadonlyArray<RuntimeRfChainTermState>;
  readonly provenance: RuntimeProvenanceTag;
}

export type RuntimeAtmosphericLookupSource =
  | "p835-6-annex-1"
  | "p836-6-rev-2017"
  | "p837-8"
  | "p839-4"
  | "p840-9";

export interface RuntimeAtmosphericLookupState {
  readonly source: RuntimeAtmosphericLookupSource;
  readonly midpointLatDeg: number | null;
  readonly midpointLonDeg: number | null;
  readonly cellLatDeg: number | null;
  readonly cellLonDeg: number | null;
  readonly lookupValue: number | null;
  readonly lookupUnit: string | null;
  readonly interpolation: "unavailable";
  readonly provenance: RuntimeProvenanceTag;
}

export interface RuntimeStationRfProfileState {
  readonly stationId: string;
  readonly elevationM: RuntimeStationElevationMetadata["elevationM"];
  readonly elevationSourceId: RuntimeStationElevationMetadata["elevationSourceId"];
  readonly elevationSourcePath: RuntimeStationElevationMetadata["elevationSourcePath"];
  readonly elevationSourceNote: RuntimeStationElevationMetadata["elevationSourceNote"];
  readonly elevationSourceAccessedUtc: RuntimeStationElevationMetadata["elevationSourceAccessedUtc"];
  readonly elevationSourceKind: RuntimeStationElevationMetadata["elevationSourceKind"];
  readonly elevationDatasetId: RuntimeStationElevationMetadata["elevationDatasetId"];
  readonly elevationDatasetVersion: RuntimeStationElevationMetadata["elevationDatasetVersion"];
  readonly elevationDatasetResolutionM: RuntimeStationElevationMetadata["elevationDatasetResolutionM"];
  readonly elevationVerticalDatum: RuntimeStationElevationMetadata["elevationVerticalDatum"];
  readonly elevationTileId: RuntimeStationElevationMetadata["elevationTileId"];
  readonly elevationCellId: RuntimeStationElevationMetadata["elevationCellId"];
  readonly elevationSampleLat: RuntimeStationElevationMetadata["elevationSampleLat"];
  readonly elevationSampleLon: RuntimeStationElevationMetadata["elevationSampleLon"];
  readonly elevationSamplingMethod: RuntimeStationElevationMetadata["elevationSamplingMethod"];
  readonly elevationSampledAtUtc: RuntimeStationElevationMetadata["elevationSampledAtUtc"];
  readonly elevationCacheGeneratedUtc: RuntimeStationElevationMetadata["elevationCacheGeneratedUtc"];
  readonly elevationLicenseId: RuntimeStationElevationMetadata["elevationLicenseId"];
  readonly elevationLicenseUrl: RuntimeStationElevationMetadata["elevationLicenseUrl"];
  readonly elevationCitation: RuntimeStationElevationMetadata["elevationCitation"];
  readonly elevationProvenanceStatus: RuntimeStationElevationMetadata["elevationProvenanceStatus"];
  readonly elevationNonClaim: RuntimeStationElevationMetadata["elevationNonClaim"];
  readonly terrainMaskDeg: number;
  readonly terrainMaskSourceId: string;
  readonly terrainMaskIsDefault: boolean;
  readonly terrainMaskNote: string;
  readonly antennaDiameterM: number | null;
  readonly antennaDiameterSourceId: string;
  readonly peakEirpDbm: number | null;
  readonly peakEirpSourceId: string;
  readonly txPolarization: string | null;
  readonly txPolarizationSourceId: string;
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
  readonly pairSourceAttribution: RuntimePairSourceAttributionState;
  readonly stationPrecision: ReadonlyArray<RuntimeStationPrecisionState>;
  readonly tleSources: ReadonlyArray<RuntimeTleSourceManifestEntry>;
  readonly tleFreshness: ReadonlyArray<RuntimeTleSourceFreshness>;
  readonly rfChainBreakdown: RuntimeRfChainBreakdownState;
  readonly atmosphericLookups: ReadonlyArray<RuntimeAtmosphericLookupState>;
  readonly stationRfProfiles: ReadonlyArray<RuntimeStationRfProfileState>;
  readonly actorSourceCoverage: {
    readonly renderedActorCount: number;
    readonly tleBackedActorCount: number;
    readonly fakeActorCount: 0;
  };
  readonly actorProvenance: ReadonlyArray<RuntimeActorProvenanceState>;
  readonly visibilityProvenance: ReadonlyArray<RuntimeVisibilityProvenanceState>;
  readonly modeledOutputs: ReadonlyArray<RuntimeModeledOutputMetadata>;
  readonly displayTransforms: ReadonlyArray<RuntimeDisplayTransformMetadata>;
  readonly capDisclosure: RuntimeCapDisclosureState;
  readonly runtimeInventoryDisclosure: RuntimeInventoryDisclosureState;
  readonly metricAnchorDisclosure: RuntimeMetricAnchorDisclosureState;
  readonly policyDisclosure: RuntimePolicyDisclosureState;
  readonly visibilityCadenceSecondsByOrbit: Readonly<Record<OrbitClass, number>>;
  readonly emptyReasonCode: RuntimeEmptyReasonCode | null;
}

export interface BuildRuntimeDataCompletenessInput {
  readonly routeMode: SceneSourceMode;
  readonly stationA: PublicRegistryStation;
  readonly stationB: PublicRegistryStation;
  readonly pairSourceTier: PairSourceTierAttribution["sourceTier"];
  readonly allTleRecords: ReadonlyArray<RuntimeOrbitRecord>;
  readonly cappedTleRecords: ReadonlyArray<RuntimeOrbitRecord>;
  readonly acceptedTleRecords: ReadonlyArray<RuntimeOrbitRecord>;
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
  readonly baseElevationThresholdDeg: number;
  readonly stationAEffectiveElevationThresholdDeg: number;
  readonly stationBEffectiveElevationThresholdDeg: number;
  readonly elevationThresholdDeg: number;
  readonly handoverPolicy: HandoverPolicyConfig;
  readonly propagationStatsBySatellite?: ReadonlyMap<string, TlePropagationStats>;
  readonly sourceHealthThresholdDays?: Partial<Record<OrbitClass, number>>;
  readonly sceneCameraHint?: SceneCameraHint;
  readonly sceneDisplayPolicy?: SceneDisplayPolicy;
}

const ORBIT_CLASSES: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];
const ATMOSPHERIC_LOOKUP_SOURCES: ReadonlyArray<RuntimeAtmosphericLookupSource> = [
  "p835-6-annex-1",
  "p836-6-rev-2017",
  "p837-8",
  "p839-4",
  "p840-9"
];
const STATION_ELEVATION_SOURCE_PATH =
  "public/fixtures/ground-stations/station-elevations-cache.json";
const STATION_ELEVATION_SOURCE_NOTE =
  "Legacy service-cache elevation; upstream DEM source, tile, version, resolution, and vertical datum are unverified.";
const DEM_STATION_ELEVATION_SOURCE_NOTE =
  "DEM-derived elevation with row-level dataset, version, resolution, datum, tile/cell, license, citation, and non-claim metadata.";
const MISSING_STATION_ELEVATION_SOURCE_ID = "legacy-elevation-cache-missing";
const MISSING_STATION_ELEVATION_SOURCE_NOTE =
  "No elevation cache row is available for this station; registry elevation is carried with legacy-unknown provenance.";
const MISSING_STATION_ELEVATION_NON_CLAIM =
  "No elevation cache metadata is available for this station; upstream DEM, tile, version, resolution, and vertical datum are not verified.";
const TERRAIN_MASK_SOURCE_ID = "default-unknown";
const TERRAIN_MASK_SOURCE_NOTE =
  "0 means no site-specific horizon mask is available.";
const DEM_TERRAIN_MASK_SOURCE_ID =
  "copernicus-dem-glo-30-terrain-mask-selected-pair-v1";
const DEM_TERRAIN_MASK_SOURCE_NOTE =
  "Public Copernicus DEM GLO-30 selected-pair terrain mask; not a surveyed RF horizon.";
const RF_FIELD_SOURCE_ID = "unavailable-pending-operator-rf-profile";
const ATMOSPHERIC_LOOKUP_SOURCE_ID = "unavailable-pending-itu-grid-bundle";
const LOCAL_FALLBACK_INVENTORY_NOTE =
  "Separate local fallback inventory is not loaded beside the active runtime source in this disclosure slice.";
const UNKNOWN_COORDINATE_AUTHORITY: StationCoordinateAuthorityEntry = {
  stationId: "",
  coordinateSourceAuthority: "unknown-public",
  coordinateSourceUrl: null,
  coordinateSourceNote:
    "Coordinate authority fixture has no row for this station; source authority is unknown."
};
const STATION_COORDINATE_AUTHORITY_BY_ID: ReadonlyMap<
  string,
  StationCoordinateAuthorityEntry
> = new Map(
  (
    stationCoordinateAuthorityFixture as {
      readonly stations: ReadonlyArray<StationCoordinateAuthorityEntry>;
    }
  ).stations.map((entry) => [entry.stationId, entry])
);
const STATION_ELEVATION_CACHE_BY_ID: ReadonlyMap<
  string,
  StationElevationCacheEntry
> = new Map(
  (stationElevationCacheFixture as ReadonlyArray<StationElevationCacheEntry>).map(
    (entry) => [entry.stationId, entry]
  )
);

const SOURCE_HEALTH_THRESHOLD_DAYS: Readonly<Record<OrbitClass, number>> = {
  LEO: 14,
  MEO: 30,
  GEO: 30
};

const NETWORK_MANIFEST_KEY_BY_ORBIT: Readonly<Record<OrbitClass, "leo" | "meo" | "geo">> = {
  LEO: "leo",
  MEO: "meo",
  GEO: "geo"
};

function sourcePolicyForMode(sourceMode: TleSourceMode): OrbitSourcePolicy {
  if (sourceMode === "network-snapshot") return "refresh-artifact";
  if (sourceMode === "fallback-local-snapshot") return "fallback-local-snapshot";
  return "bundled-snapshot";
}

function countByOrbit(records: ReadonlyArray<RuntimeOrbitRecord>): Record<OrbitClass, number> {
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
  records: ReadonlyArray<RuntimeOrbitRecord>
): { epochStartUtc: string | null; epochEndUtc: string | null } {
  const epochs = records
    .map((record) =>
      "tleLine1" in record ? parseTleEpochUtc(record.tleLine1) : record.epochUtc
    )
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
  records: ReadonlyArray<RuntimeOrbitRecord>
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

function countClassification(records: ReadonlyArray<RuntimeOrbitRecord>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    const key = record.classification || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildDragTermCoverage(
  records: ReadonlyArray<RuntimeOrbitRecord>
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

function resolveCosparSamples(records: ReadonlyArray<RuntimeOrbitRecord>): ReadonlyArray<string> {
  return [
    ...new Set(
      records
        .map((record) => record.cosparDesignator)
        .filter((value): value is string => Boolean(value))
    )
  ].slice(0, 8);
}

function countSgp4ErrorRecords(records: ReadonlyArray<RuntimeOrbitRecord>): number {
  let count = 0;
  for (const record of records) {
    if (!createRuntimeSatrec(record).satrec) {
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

function resolveCoordinateSourceAuthority(
  stationId: string
): StationCoordinateAuthorityEntry {
  return STATION_COORDINATE_AUTHORITY_BY_ID.get(stationId) ?? UNKNOWN_COORDINATE_AUTHORITY;
}

function buildMissingElevationMetadata(
  station: PublicRegistryStation
): RuntimeStationElevationMetadata {
  return {
    elevationM: station.elevationM,
    elevationSourceId: MISSING_STATION_ELEVATION_SOURCE_ID,
    elevationSourcePath: STATION_ELEVATION_SOURCE_PATH,
    elevationSourceNote: MISSING_STATION_ELEVATION_SOURCE_NOTE,
    elevationSourceAccessedUtc: null,
    elevationSourceKind: "legacy-unknown",
    elevationDatasetId: MISSING_STATION_ELEVATION_SOURCE_ID,
    elevationDatasetVersion: null,
    elevationDatasetResolutionM: null,
    elevationVerticalDatum: null,
    elevationTileId: null,
    elevationCellId: null,
    elevationSampleLat: station.lat,
    elevationSampleLon: station.lon,
    elevationSamplingMethod: "unavailable",
    elevationSampledAtUtc: null,
    elevationCacheGeneratedUtc: null,
    elevationLicenseId: "legacy-unverified",
    elevationLicenseUrl: null,
    elevationCitation: "Registry elevation carried without a matching elevation-cache row.",
    elevationProvenanceStatus: "legacy-unknown",
    elevationNonClaim: MISSING_STATION_ELEVATION_NON_CLAIM
  };
}

function resolveStationElevationMetadata(
  station: PublicRegistryStation
): RuntimeStationElevationMetadata {
  const entry = STATION_ELEVATION_CACHE_BY_ID.get(station.id);
  if (!entry || entry.elevationM !== station.elevationM) {
    return buildMissingElevationMetadata(station);
  }
  return {
    elevationM: entry.elevationM,
    elevationSourceId: entry.elevationDatasetId,
    elevationSourcePath: STATION_ELEVATION_SOURCE_PATH,
    elevationSourceNote: resolveStationElevationSourceNote(entry),
    elevationSourceAccessedUtc: entry.sourceAccessedUtc,
    elevationSourceKind: entry.elevationSourceKind,
    elevationDatasetId: entry.elevationDatasetId,
    elevationDatasetVersion: entry.elevationDatasetVersion,
    elevationDatasetResolutionM: entry.elevationDatasetResolutionM,
    elevationVerticalDatum: entry.elevationVerticalDatum,
    elevationTileId: entry.elevationTileId,
    elevationCellId: entry.elevationCellId,
    elevationSampleLat: entry.elevationSampleLat,
    elevationSampleLon: entry.elevationSampleLon,
    elevationSamplingMethod: entry.elevationSamplingMethod,
    elevationSampledAtUtc: entry.elevationSampledAtUtc,
    elevationCacheGeneratedUtc: entry.elevationCacheGeneratedUtc,
    elevationLicenseId: entry.elevationLicenseId,
    elevationLicenseUrl: entry.elevationLicenseUrl,
    elevationCitation: entry.elevationCitation,
    elevationProvenanceStatus: entry.elevationProvenanceStatus,
    elevationNonClaim: entry.elevationNonClaim
  };
}

function resolveStationElevationSourceNote(
  entry: StationElevationCacheEntry
): string {
  if (entry.elevationSourceKind === "dem-derived") {
    return DEM_STATION_ELEVATION_SOURCE_NOTE;
  }
  if (entry.elevationSourceKind === "operator-stated") {
    return "Operator-stated station altitude with public source citation; surrounding DEM terrain remains a separate derived mask.";
  }
  return STATION_ELEVATION_SOURCE_NOTE;
}

function resolveTerrainMaskSourceId(station: PublicRegistryStation): string {
  return station.terrainMaskDeg === 0
    ? TERRAIN_MASK_SOURCE_ID
    : DEM_TERRAIN_MASK_SOURCE_ID;
}

function resolveTerrainMaskNote(station: PublicRegistryStation): string {
  return station.terrainMaskDeg === 0
    ? TERRAIN_MASK_SOURCE_NOTE
    : DEM_TERRAIN_MASK_SOURCE_NOTE;
}

function buildStationPrecisionState(
  station: PublicRegistryStation,
  pairSourceTier: PairSourceTierAttribution["sourceTier"],
  effectiveElevationThresholdDeg: number
): RuntimeStationPrecisionState {
  const coordinateUse = resolveCoordinateUse(station.disclosurePrecision);
  const coordinateSource = resolveCoordinateSourceAuthority(station.id);
  const elevationMetadata = resolveStationElevationMetadata(station);
  return {
    stationId: station.id,
    disclosurePrecision: station.disclosurePrecision,
    sourceTier: pairSourceTier,
    coordinateSourceAuthority: coordinateSource.coordinateSourceAuthority,
    coordinateSourceUrl: coordinateSource.coordinateSourceUrl,
    coordinateSourceNote: coordinateSource.coordinateSourceNote,
    rawLat: station.lat,
    rawLon: station.lon,
    ...elevationMetadata,
    terrainMaskDeg: station.terrainMaskDeg,
    terrainMaskSourceId: resolveTerrainMaskSourceId(station),
    terrainMaskIsDefault: station.terrainMaskDeg === 0,
    terrainMaskNote: resolveTerrainMaskNote(station),
    effectiveElevationThresholdDeg,
    renderPositionIsSourceTruth: coordinateUse === "source-coordinate",
    coordinateUse,
    provenance: {
      truthClass: "public-registry-derived",
      sourceId: `station-registry:${station.id}`
    }
  };
}

function buildPairSourceAttributionState(
  input: BuildRuntimeDataCompletenessInput
): RuntimePairSourceAttributionState {
  const attribution = inferPairSourceTier(input.stationA, input.stationB);
  return {
    sourceTier: attribution.sourceTier,
    evidenceKind: attribution.evidenceKind,
    badgeLabel: attribution.badgeLabel,
    nonClaims: [...attribution.nonClaims]
  };
}

function buildAssumedRfChainBreakdown(): RuntimeRfChainBreakdownState {
  const modelNonClaim =
    "RF-chain terms are model components, not measured received-power truth.";
  const unavailableRfNonClaim =
    "Station EIRP remains unavailable; assumed antenna gains do not provide operator RF hardware truth.";
  const modelProvenance: RuntimeProvenanceTag = {
    truthClass: "modeled",
    sourceId: "runtime-projection",
    modelId: "fspl-rain-gas-assumed-antenna-link-budget-v1",
    nonClaim: modelNonClaim
  };
  const unavailableProvenance: RuntimeProvenanceTag = {
    truthClass: "unavailable",
    sourceId: RF_FIELD_SOURCE_ID,
    nonClaim: unavailableRfNonClaim
  };
  const modelTerm = (
    kind: RuntimeRfChainTermKind,
    modelId: string,
    standardsRef: ReadonlyArray<string>,
    inputSummary: Readonly<Record<string, string | number | boolean | null>> = {}
  ): RuntimeRfChainTermState => ({
    kind,
    contributionSignedDb: null,
    modelId,
    standardsRef,
    inputSummary,
    provenance: modelProvenance,
    nonClaim: modelNonClaim
  });
  const unavailableTerm = (
    kind: RuntimeRfChainTermKind,
    modelId: string,
    standardsRef: ReadonlyArray<string>
  ): RuntimeRfChainTermState => ({
    kind,
    contributionSignedDb: null,
    modelId,
    standardsRef,
    inputSummary: {
      unavailableReason: "missing-station-eirp"
    },
    provenance: unavailableProvenance,
    nonClaim: unavailableRfNonClaim
  });
  const antennaInputSummary = {
    antennaModel: RUNTIME_ANTENNA_ASSUMPTION_MODEL_LABEL,
    antennaParameterSource: RUNTIME_ANTENNA_ASSUMPTION_SOURCE_ID,
    antennaSourceClass: RUNTIME_ANTENNA_ASSUMPTION_SOURCE_CLASS,
    earthStationPatternFrequencyPolicy:
      "S.465 validation uses carrier frequency when 2-31 GHz; MEO L-band uses 2 GHz lower-bound reference for antenna-pattern validation only",
    antennaAssumptionSet: formatRuntimeAntennaAssumptionSetSummary()
  };
  return {
    carrierBand: "orbit-class-default",
    carrierFrequencyGHz: null,
    receivedPowerProxyDbm: null,
    terms: [
      unavailableTerm("tx-eirp", "pending-station-eirp", [
        "3GPP TR 38.821 §6.1"
      ]),
      modelTerm("free-space-path-loss", "runtime-fspl-term", [
        "3GPP TR 38.811 §6.6.2"
      ]),
      modelTerm("gas-absorption", "runtime-gas-absorption-term", [
        "ITU-R P.676-13 Annex 2"
      ]),
      modelTerm("rain-attenuation", "runtime-rain-attenuation-term", [
        "ITU-R P.618-14 §2.2.1.1"
      ]),
      modelTerm("satellite-antenna-gain", "runtime-assumed-satellite-antenna-term", [
        "ITU-R S.1528-0 Annex 1"
      ], antennaInputSummary),
      modelTerm("rx-antenna-gain", "runtime-assumed-earth-station-antenna-term", [
        "ITU-R S.465-6"
      ], antennaInputSummary)
    ],
    provenance: {
      truthClass: "modeled",
      sourceId: "runtime-projection",
      modelId: "fspl-rain-gas-assumed-antenna-link-budget-v1",
      nonClaim: `${modelNonClaim} ${RUNTIME_ANTENNA_ASSUMPTION_NON_CLAIM}`
    }
  };
}

function buildAtmosphericLookups(): ReadonlyArray<RuntimeAtmosphericLookupState> {
  return ATMOSPHERIC_LOOKUP_SOURCES.map((source) => ({
    source,
    midpointLatDeg: null,
    midpointLonDeg: null,
    cellLatDeg: null,
    cellLonDeg: null,
    lookupValue: null,
    lookupUnit: null,
    interpolation: "unavailable",
    provenance: {
      truthClass: "unavailable",
      sourceId: `${ATMOSPHERIC_LOOKUP_SOURCE_ID}:${source}`,
      nonClaim:
        "Atmospheric grid lookup is not bundled; no grid cell value is claimed."
    }
  }));
}

function buildStationRfProfileState(
  station: RuntimeStationPrecisionState
): RuntimeStationRfProfileState {
  return {
    stationId: station.stationId,
    elevationM: station.elevationM,
    elevationSourceId: station.elevationSourceId,
    elevationSourcePath: station.elevationSourcePath,
    elevationSourceNote: station.elevationSourceNote,
    elevationSourceAccessedUtc: station.elevationSourceAccessedUtc,
    elevationSourceKind: station.elevationSourceKind,
    elevationDatasetId: station.elevationDatasetId,
    elevationDatasetVersion: station.elevationDatasetVersion,
    elevationDatasetResolutionM: station.elevationDatasetResolutionM,
    elevationVerticalDatum: station.elevationVerticalDatum,
    elevationTileId: station.elevationTileId,
    elevationCellId: station.elevationCellId,
    elevationSampleLat: station.elevationSampleLat,
    elevationSampleLon: station.elevationSampleLon,
    elevationSamplingMethod: station.elevationSamplingMethod,
    elevationSampledAtUtc: station.elevationSampledAtUtc,
    elevationCacheGeneratedUtc: station.elevationCacheGeneratedUtc,
    elevationLicenseId: station.elevationLicenseId,
    elevationLicenseUrl: station.elevationLicenseUrl,
    elevationCitation: station.elevationCitation,
    elevationProvenanceStatus: station.elevationProvenanceStatus,
    elevationNonClaim: station.elevationNonClaim,
    terrainMaskDeg: station.terrainMaskDeg,
    terrainMaskSourceId: station.terrainMaskSourceId,
    terrainMaskIsDefault: station.terrainMaskIsDefault,
    terrainMaskNote: station.terrainMaskNote,
    antennaDiameterM: null,
    antennaDiameterSourceId: RF_FIELD_SOURCE_ID,
    peakEirpDbm: null,
    peakEirpSourceId: RF_FIELD_SOURCE_ID,
    txPolarization: null,
    txPolarizationSourceId: RF_FIELD_SOURCE_ID,
    provenance: {
      truthClass: "unavailable",
      sourceId: `station-rf-profile:${station.stationId}`,
      nonClaim:
        "Station RF hardware fields are unavailable; only elevation and terrain-mask registry fields are populated."
    }
  };
}

function buildCapDisclosure(
  input: BuildRuntimeDataCompletenessInput
): RuntimeCapDisclosureState {
  const inventory = countByOrbit(input.allTleRecords);
  const caps: Record<OrbitClass, number> = {
    LEO: input.caps.LEO,
    MEO: input.caps.MEO,
    GEO: input.caps.GEO
  };
  return {
    perOrbitCap: caps,
    perOrbitInventory: inventory,
    cappedAtRuntime: {
      LEO: inventory.LEO > caps.LEO,
      MEO: inventory.MEO > caps.MEO,
      GEO: inventory.GEO > caps.GEO
    }
  };
}

function resolveNetworkSnapshotInventoryCount(orbitClass: OrbitClass): number | null {
  const key = NETWORK_MANIFEST_KEY_BY_ORBIT[orbitClass];
  const entry = (
    networkTleManifest as Readonly<
      Record<string, { readonly recordCount?: number | undefined }>
    >
  )[key];
  return Number.isInteger(entry?.recordCount) ? entry.recordCount ?? null : null;
}

function countVisibleActorsByOrbit(
  windows: ReadonlyArray<PairVisibilityWindow>
): Record<OrbitClass, number> {
  const idsByOrbit: Record<OrbitClass, Set<string>> = {
    LEO: new Set(),
    MEO: new Set(),
    GEO: new Set()
  };
  for (const window of windows) {
    idsByOrbit[window.orbitClass].add(window.satelliteId);
  }
  return {
    LEO: idsByOrbit.LEO.size,
    MEO: idsByOrbit.MEO.size,
    GEO: idsByOrbit.GEO.size
  };
}

function buildRuntimeInventoryDisclosure(
  input: BuildRuntimeDataCompletenessInput
): RuntimeInventoryDisclosureState {
  const sourceMode = resolveTleSourceMode(input);
  const activeInventory = countByOrbit(input.allTleRecords);
  const acceptedInventory = countByOrbit(input.acceptedTleRecords);
  const visibleActors = countVisibleActorsByOrbit(input.visibilityWindows);
  const perOrbit = Object.fromEntries(
    ORBIT_CLASSES.map((orbitClass) => {
      const runtimeCap = input.caps[orbitClass];
      const activeInventoryCount = activeInventory[orbitClass];
      const row: RuntimeInventoryDisclosureOrbitState = {
        orbitClass,
        inventorySourceMode: sourceMode,
        networkSnapshotInventoryCount:
          resolveNetworkSnapshotInventoryCount(orbitClass),
        localFallbackInventoryCount: null,
        localFallbackInventoryNote: LOCAL_FALLBACK_INVENTORY_NOTE,
        activeInventoryCount,
        acceptedRecordCount: acceptedInventory[orbitClass],
        runtimeCap,
        cappedAtRuntime: activeInventoryCount > runtimeCap,
        visibleActorCount: visibleActors[orbitClass]
      };
      return [orbitClass, row];
    })
  ) as Record<OrbitClass, RuntimeInventoryDisclosureOrbitState>;
  return {
    perOrbit,
    note:
      "Network snapshot inventory, active runtime inventory, accepted records, runtime cap, and visible actor count are separate counts."
  };
}

function buildPolicyDisclosure(
  input: BuildRuntimeDataCompletenessInput
): RuntimePolicyDisclosureState {
  const policy = input.handoverPolicy;
  const provenance: RuntimeProvenanceTag = {
    truthClass: "modeled",
    sourceId: `handover-policy:${policy.policyId}`,
    modelId: "3gpp-tr-38.821-v-mo1-policy",
    nonClaim: "Runtime policy thresholds are modeled controls, not operator SLA."
  };
  return {
    activePolicyId: policy.policyId,
    thresholds: {
      latencyBudgetMs: policy.latencyBudgetMs ?? null,
      hysteresisDb: policy.hysteresisDb,
      minVisibilityWindowMs: policy.minVisibilityWindowMs,
      elevationThresholdDeg: policy.elevationThresholdDeg
    },
    thresholdSources: {
      latencyBudgetMs: provenance,
      hysteresisDb: provenance,
      minVisibilityWindowMs: provenance,
      elevationThresholdDeg: provenance
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
    const format =
      parseStats?.format ?? allRecords[0]?.format ?? "tle-3le";
    const sourcePath = input.sourcePaths[orbitClass];
    const healthThresholdDays = resolveHealthThresholdDays(
      orbitClass,
      input.sourceHealthThresholdDays
    );
    const epochRange = resolveEpochRange(allRecords);
    const sourceTimestampUtc =
      extractSourceTimestampUtc(sourcePath) ??
      epochRange.epochEndUtc ??
      parseStats?.snapshotFetchedUtc ??
      null;
    const cosparDesignatorSamples =
      parseStats?.cosparDesignatorSamples ?? resolveCosparSamples(allRecords);
    return {
      sourceId: resolveSourceIdForOrbit(orbitClass, format),
      sourcePath,
      orbitClass,
      format,
      apiClass: parseStats?.apiClass ?? "celestrak-gp-tle",
      sourcePolicy:
        parseStats?.sourcePolicy ?? sourcePolicyForMode(resolveTleSourceMode(input)),
      catalogNumberCompatibility:
        parseStats?.catalogNumberCompatibility ?? "tle-limited-5-digit-catalog",
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
      format: source.format,
      apiClass: source.apiClass,
      sourcePolicy: source.sourcePolicy,
      catalogNumberCompatibility: source.catalogNumberCompatibility,
      snapshotFetchedUtc,
      snapshotPath: stats?.snapshotPath ?? source.sourcePath,
      maxEpochUtc: source.epochEndUtc,
      noradIdRangeSummary: source.noradIdRangeSummary,
      constellationMembership: resolveConstellationMembership(stats),
      provenance: {
        truthClass: resolveTruthClassForFormat(source.format),
        sourceId: source.sourceId,
        nonClaim:
          sourceMode === "local-snapshot"
            ? "Bundled TLE snapshot selected at bootstrap."
            : "Bundled network-refresh artifact selected at bootstrap; no live orbital-data fetch occurs in the browser."
      }
    };
  });
}

function resolveTruthClassForFormat(
  format: OrbitSourceFormat | undefined
): Extract<RuntimeTruthClass, "tle-derived" | "omm-derived"> {
  return format === "omm-json" || format === "omm-csv"
    ? "omm-derived"
    : "tle-derived";
}

function resolveSourceIdForOrbit(
  orbitClass: OrbitClass,
  format: OrbitSourceFormat | undefined
): string {
  const prefix = format === "omm-json" || format === "omm-csv" ? "omm" : "tle";
  return `${prefix}:${orbitClass.toLowerCase()}`;
}

function buildAcceptedRecordBySatelliteId(
  records: ReadonlyArray<RuntimeOrbitRecord>
): ReadonlyMap<string, RuntimeOrbitRecord> {
  return new Map(records.map((record) => [record.satelliteId, record]));
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
  const acceptedRecordBySatelliteId = buildAcceptedRecordBySatelliteId(
    input.acceptedTleRecords
  );
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
      const record = acceptedRecordBySatelliteId.get(satelliteId);
      const format = record?.format ?? "tle-3le";
      const sourceId = resolveSourceIdForOrbit(orbitClass, format);
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
          truthClass: resolveTruthClassForFormat(format),
          sourceId
        }
      };
    })
    .sort((left, right) => left.satelliteId.localeCompare(right.satelliteId));
}

function buildVisibilityProvenance(
  input: BuildRuntimeDataCompletenessInput
): ReadonlyArray<RuntimeVisibilityProvenanceState> {
  const acceptedRecordBySatelliteId = buildAcceptedRecordBySatelliteId(
    input.acceptedTleRecords
  );
  return input.visibilityWindows.map((window) => {
    const format =
      acceptedRecordBySatelliteId.get(window.satelliteId)?.format ?? "tle-3le";
    const sourceId = resolveSourceIdForOrbit(window.orbitClass, format);
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
        truthClass: resolveTruthClassForFormat(format),
        sourceId
      }
    };
  });
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
  const modeledOutputs = buildModeledOutputs(input);
  const policyDisclosure = buildPolicyDisclosure(input);
  const pairSourceAttribution = buildPairSourceAttributionState(input);
  const stationPrecision = [
    buildStationPrecisionState(
      input.stationA,
      pairSourceAttribution.sourceTier,
      input.stationAEffectiveElevationThresholdDeg
    ),
    buildStationPrecisionState(
      input.stationB,
      pairSourceAttribution.sourceTier,
      input.stationBEffectiveElevationThresholdDeg
    )
  ] as const;
  return {
    routeMode: input.routeMode,
    pairSourceAttribution,
    stationPrecision,
    tleSources,
    tleFreshness: buildRuntimeTleSourceFreshness(input, tleSources),
    rfChainBreakdown: buildAssumedRfChainBreakdown(),
    atmosphericLookups: buildAtmosphericLookups(),
    stationRfProfiles: [
      buildStationRfProfileState(stationPrecision[0]),
      buildStationRfProfileState(stationPrecision[1])
    ],
    actorSourceCoverage: {
      renderedActorCount: visibleSatelliteIds.size,
      tleBackedActorCount: visibleSatelliteIds.size,
      fakeActorCount: 0
    },
    actorProvenance: buildActorProvenance(input),
    visibilityProvenance: buildVisibilityProvenance(input),
    modeledOutputs,
    displayTransforms: buildDisplayTransforms(input),
    capDisclosure: buildCapDisclosure(input),
    runtimeInventoryDisclosure: buildRuntimeInventoryDisclosure(input),
    metricAnchorDisclosure: buildMetricAnchorDisclosure(
      modeledOutputs,
      policyDisclosure
    ),
    policyDisclosure,
    visibilityCadenceSecondsByOrbit: input.sampleCadenceSecondsByOrbit,
    emptyReasonCode: resolveEmptyReasonCode(input)
  };
}
