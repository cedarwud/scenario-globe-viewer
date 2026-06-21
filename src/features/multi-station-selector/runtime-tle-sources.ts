// Runtime TLE source loading, parsing, and source-metadata resolution.
//
// Extracted verbatim from runtime-projection.ts (behavior-preserving split for
// the pre-acceptance large-file-budget refactor). This is the bootstrap / parse
// path — text fixtures + an optional network manifest -> RuntimeOrbitRecord[] +
// source metadata — and is NOT called by computeRuntimeProjection (which
// consumes already-parsed records). The public API is re-exported from
// runtime-projection.ts so existing importers keep working.
import { TLE_FIXTURE_PATHS } from "./demo-scenario-config";
import {
  type OrbitClass,
  type RuntimeOrbitRecord,
  type TleRecord
} from "./visibility-utils";
import {
  type RuntimeTleSourceParseStats,
  type TleSourceMode
} from "./runtime-data-completeness";
import {
  parseOrbitSourceText,
  toTleRecords,
  toRuntimeOrbitRecords,
  type OrbitSourceMetadata,
  type OrbitSourcePolicy
} from "./orbit-source-parser";

// Mirrors the orbit-class ordering in runtime-projection.ts; kept local to avoid
// a re-export import cycle (runtime-projection re-exports this module's API).
const ORBIT_CLASSES: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

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
