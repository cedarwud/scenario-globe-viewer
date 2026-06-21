// Shared assertion helpers for verify-tle-first-data-completeness.mjs.

import { SELECTED_PAIR_DEMO_START_UTC } from "./demo-scenario.mjs";

export const RUNTIME_MODE = "tle-first-runtime";
export const FIXTURE_MODE = "fixture-fallback";
export const TLE_SOURCE_MODES = new Set([
  "local-snapshot",
  "network-snapshot",
  "fallback-local-snapshot"
]);
export const SOURCE_EVIDENCE_KINDS = new Set([
  "explicit-pair-attestation",
  "same-operator-family-inferred",
  "cross-family-geometric"
]);
export const COORDINATE_SOURCE_AUTHORITIES = new Set([
  "official-filing",
  "operator-web",
  "teleport-directory",
  "secondary-web",
  "wikipedia",
  "news",
  "mixed-public",
  "unknown-public"
]);
export const DEFAULT_HANDOVER_POLICY_ID = "demo-balanced-v1";
// Inventory mirrors the live CelesTrak fixture (public/fixtures/satellites-network/
// manifest.json). 2026-06-14 refresh: LEO oneweb 600->651, GEO 30 (hand-curated) ->
// 574 (full geostationary group), MEO galileo 33 unchanged. GEO now exceeds its
// runtime cap (574 > 60) so cappedAtRuntime.GEO flips false->true.
export const EXPECTED_CAP_DISCLOSURE = {
  perOrbitCap: { LEO: 200, MEO: 100, GEO: 60 },
  // ACTIVE source inventory = the pinned local snapshot (the default delivery
  // surface after the TLE-source opt-in change): OneWeb LEO 600, Galileo MEO 33,
  // full commercial GEO subset 249.
  perOrbitInventory: { LEO: 600, MEO: 33, GEO: 249 },
  cappedAtRuntime: { LEO: true, MEO: false, GEO: true }
};

// The bundled CelesTrak network manifest (src/fixtures/satellites-network/
// manifest.json) record counts. The runtime inventory disclosure surfaces these
// as the opt-in (?tleSource=network) catalog size regardless of the active
// source — it is a static import, so it is unaffected by the local-snapshot
// default flip and stays the network catalog's own counts.
export const EXPECTED_NETWORK_SNAPSHOT_INVENTORY = { LEO: 651, MEO: 33, GEO: 574 };
export const EXPECTED_METRIC_ANCHORS = {
  carrierSelection: "orbit-class-default",
  antennaModel: "S.1528/S.465-6 assumed Tier-B per-orbit antenna pattern",
  antennaParameterSource: "assumed-tier-b-antenna-params-selected-pair-v1",
  capacityModel: "clear-sky-reference-with-atmospheric-and-assumed-antenna-derating",
  jitterModel: "orbit-baseline-with-rain-scale",
  delayModel: "slant-range-one-way-plus-fixed-processing"
};
export const EXPECTED_ELEVATION_SOURCE_KIND = "legacy-service-cache";
export const EXPECTED_ELEVATION_DATASET_ID = "legacy-elevation-service-cache-v1";
export const EXPECTED_ELEVATION_PROVENANCE_STATUS = "legacy-upstream-dem-unknown";
export const EXPECTED_ELEVATION_SAMPLING_METHOD = "service-response";
export const EXPECTED_ELEVATION_LICENSE_ID = "legacy-unverified";
export const EXPECTED_MISSING_ELEVATION_SOURCE_KIND = "legacy-unknown";
export const EXPECTED_MISSING_ELEVATION_DATASET_ID = "legacy-elevation-cache-missing";
export const EXPECTED_MISSING_ELEVATION_SAMPLING_METHOD = "unavailable";
export const EXPECTED_MISSING_ELEVATION_PROVENANCE_STATUS = "legacy-unknown";
export const EXPECTED_ELEVATION_SOURCE_PATH =
  "public/fixtures/ground-stations/station-elevations-cache.json";
export const EXPECTED_TERRAIN_MASK_SOURCE_ID = "default-unknown";
export const EXPECTED_DEM_TERRAIN_MASK_SOURCE_ID =
  "copernicus-dem-glo-30-terrain-mask-selected-pair-v1";
export const EXPECTED_RF_FIELD_SOURCE_ID = "unavailable-pending-operator-rf-profile";
export const EXPECTED_RF_CHAIN_TERM_KINDS = [
  "tx-eirp",
  "free-space-path-loss",
  "gas-absorption",
  "rain-attenuation",
  "satellite-antenna-gain",
  "rx-antenna-gain"
];
export const EXPECTED_ATMOSPHERIC_LOOKUP_SOURCES = [
  "p835-6-annex-1",
  "p836-6-rev-2017",
  "p837-8",
  "p839-4",
  "p840-9"
];

export function csvCellValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

export function inventoryTextValue(value) {
  return value === null || value === undefined ? "unavailable" : String(value);
}

export function expectedSourceEvidenceKindForCase(testCase) {
  if (testCase.stationA?.startsWith("ksat-") && testCase.stationB?.startsWith("ksat-")) {
    return "same-operator-family-inferred";
  }
  if (
    (testCase.stationA === "singtel-bukit-timah" &&
      testCase.stationB === "measat-cyberjaya") ||
    (testCase.stationA === "cht-yangmingshan" &&
      testCase.stationB === "sansa-hartebeesthoek")
  ) {
    return "cross-family-geometric";
  }
  return null;
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function expectedSourceHealth(source, referenceUtc) {
  const sourceMs = Date.parse(source.sourceTimestampUtc);
  const epochMs = Date.parse(source.epochEndUtc);
  const referenceMs = Date.parse(referenceUtc);
  if (!Number.isFinite(referenceMs) || (!Number.isFinite(sourceMs) && !Number.isFinite(epochMs))) {
    return "unknown-age";
  }
  const anchorMs = Math.max(
    Number.isFinite(sourceMs) ? sourceMs : Number.NEGATIVE_INFINITY,
    Number.isFinite(epochMs) ? epochMs : Number.NEGATIVE_INFINITY
  );
  const ageDays = Math.max(0, (referenceMs - anchorMs) / 86400000);
  return ageDays <= source.healthThresholdDays ? "fresh" : "stale";
}

export function assertCapDisclosurePayload(label, disclosure) {
  assert(disclosure, `${label}: capDisclosure missing`);
  for (const orbit of ["LEO", "MEO", "GEO"]) {
    assert(
      disclosure.perOrbitCap?.[orbit] === EXPECTED_CAP_DISCLOSURE.perOrbitCap[orbit],
      `${label}: ${orbit} cap mismatch`
    );
    assert(
      disclosure.perOrbitInventory?.[orbit] ===
        EXPECTED_CAP_DISCLOSURE.perOrbitInventory[orbit],
      `${label}: ${orbit} inventory mismatch`
    );
    assert(
      disclosure.cappedAtRuntime?.[orbit] ===
        EXPECTED_CAP_DISCLOSURE.cappedAtRuntime[orbit],
      `${label}: ${orbit} cappedAtRuntime mismatch`
    );
  }
}

export function assertPairSourceAttributionPayload(label, attribution) {
  assert(attribution, `${label}: pairSourceAttribution missing`);
  assert(
    attribution.sourceTier === "public-disclosed" ||
      attribution.sourceTier === "geometric-derived",
    `${label}: pair source tier invalid`
  );
  assert(
    SOURCE_EVIDENCE_KINDS.has(attribution.evidenceKind),
    `${label}: pair source evidence kind invalid`
  );
  assert(
    typeof attribution.badgeLabel === "string" && attribution.badgeLabel.length > 0,
    `${label}: pair source badge label missing`
  );
  assert(
    Array.isArray(attribution.nonClaims),
    `${label}: pair source non-claims missing`
  );
}

export function assertRuntimeInventoryDisclosurePayload(label, disclosure, data) {
  assert(disclosure?.perOrbit, `${label}: runtimeInventoryDisclosure missing`);
  for (const orbit of ["LEO", "MEO", "GEO"]) {
    const row = disclosure.perOrbit[orbit];
    const source = data.tleSources.find((candidate) => candidate.orbitClass === orbit);
    assert(row, `${label}: ${orbit} runtime inventory row missing`);
    assert(source, `${label}: ${orbit} TLE source missing for inventory parity`);
    assert(
      TLE_SOURCE_MODES.has(row.inventorySourceMode),
      `${label}: ${orbit} inventory source mode invalid`
    );
    assert(
      row.networkSnapshotInventoryCount === EXPECTED_NETWORK_SNAPSHOT_INVENTORY[orbit],
      `${label}: ${orbit} network snapshot inventory mismatch`
    );
    assert(
      row.localFallbackInventoryCount === null &&
        typeof row.localFallbackInventoryNote === "string" &&
        row.localFallbackInventoryNote.includes("not loaded"),
      `${label}: ${orbit} local fallback inventory should be unavailable`
    );
    assert(
      row.activeInventoryCount === source.recordCount,
      `${label}: ${orbit} active inventory should match source recordCount`
    );
    assert(
      row.acceptedRecordCount === source.acceptedRecordCount,
      `${label}: ${orbit} accepted inventory should match source acceptedRecordCount`
    );
    assert(
      row.runtimeCap === data.capDisclosure.perOrbitCap[orbit],
      `${label}: ${orbit} runtime cap parity mismatch`
    );
    assert(
      row.cappedAtRuntime === data.capDisclosure.cappedAtRuntime[orbit],
      `${label}: ${orbit} capped parity mismatch`
    );
    assert(
      Number.isInteger(row.visibleActorCount) && row.visibleActorCount >= 0,
      `${label}: ${orbit} visible actor count invalid`
    );
  }
}

export function assertMetricAnchorDisclosurePayload(
  label,
  disclosure,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(disclosure, `${label}: metricAnchorDisclosure missing`);
  for (const [key, expected] of Object.entries(EXPECTED_METRIC_ANCHORS)) {
    assert(
      disclosure[key] === expected,
      `${label}: metric anchor ${key} mismatch`
    );
  }
  assert(
    disclosure.activePolicyId === expectedPolicyId,
    `${label}: metric anchor active policy mismatch (${disclosure.activePolicyId} !== ${expectedPolicyId})`
  );
  assert(
    disclosure.policyThresholds?.latencyBudgetMs === 600 &&
      disclosure.policyThresholds?.hysteresisDb === 2 &&
      disclosure.policyThresholds?.minVisibilityWindowMs === 60_000 &&
      disclosure.policyThresholds?.elevationThresholdDeg === 10,
    `${label}: metric anchor policy thresholds mismatch`
  );
  assert(
    typeof disclosure.nonClaim === "string" &&
      disclosure.nonClaim.includes("not measured"),
    `${label}: metric anchor non-claim missing`
  );
}

export function assertPolicyDisclosurePayload(
  label,
  disclosure,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(disclosure, `${label}: policyDisclosure missing`);
  assert(
    disclosure.activePolicyId === expectedPolicyId,
    `${label}: active policy mismatch ${disclosure.activePolicyId}`
  );
  const thresholds = disclosure.thresholds;
  assert(thresholds, `${label}: policy thresholds missing`);
  assert(
    thresholds.latencyBudgetMs === 600,
    `${label}: latency threshold mismatch`
  );
  assert(thresholds.hysteresisDb === 2, `${label}: hysteresis threshold mismatch`);
  assert(
    thresholds.minVisibilityWindowMs === 60_000,
    `${label}: min visibility threshold mismatch`
  );
  assert(
    thresholds.elevationThresholdDeg === 10,
    `${label}: policy elevation threshold mismatch`
  );
  for (const key of [
    "latencyBudgetMs",
    "hysteresisDb",
    "minVisibilityWindowMs",
    "elevationThresholdDeg"
  ]) {
    const source = disclosure.thresholdSources?.[key];
    assert(source?.truthClass === "modeled", `${label}: ${key} source truth missing`);
    assert(
      source?.sourceId === `handover-policy:${expectedPolicyId}`,
      `${label}: ${key} source id mismatch`
    );
  }
}

export function assertElevationProvenanceMetadata(label, station) {
  if (station.elevationSourceKind === EXPECTED_MISSING_ELEVATION_SOURCE_KIND) {
    assert(
      station.elevationSourceId === EXPECTED_MISSING_ELEVATION_DATASET_ID &&
        station.elevationDatasetId === EXPECTED_MISSING_ELEVATION_DATASET_ID,
      `${label}: station ${station.stationId} missing elevation source id mismatch`
    );
    assert(
      station.elevationSourcePath === EXPECTED_ELEVATION_SOURCE_PATH,
      `${label}: station ${station.stationId} missing elevation source path mismatch`
    );
    assert(
      typeof station.elevationSourceNote === "string" &&
        station.elevationSourceNote.includes("No elevation cache row") &&
        station.elevationSourceNote.includes("legacy-unknown"),
      `${label}: station ${station.stationId} missing elevation source note mismatch`
    );
    assert(
      station.elevationSourceAccessedUtc === null &&
        station.elevationSampledAtUtc === null &&
        station.elevationCacheGeneratedUtc === null,
      `${label}: station ${station.stationId} missing elevation timestamps should stay null`
    );
    assert(
      station.elevationDatasetVersion === null &&
        station.elevationDatasetResolutionM === null &&
        station.elevationVerticalDatum === null &&
        station.elevationTileId === null &&
        station.elevationCellId === null,
      `${label}: station ${station.stationId} missing elevation DEM fields should stay null`
    );
    assert(
      Number.isFinite(station.elevationSampleLat) &&
        Number.isFinite(station.elevationSampleLon),
      `${label}: station ${station.stationId} missing elevation sample coordinate missing`
    );
    assert(
      station.elevationSamplingMethod === EXPECTED_MISSING_ELEVATION_SAMPLING_METHOD,
      `${label}: station ${station.stationId} missing elevation sampling method mismatch`
    );
    assert(
      station.elevationLicenseId === EXPECTED_ELEVATION_LICENSE_ID &&
        station.elevationLicenseUrl === null,
      `${label}: station ${station.stationId} missing elevation license metadata mismatch`
    );
    assert(
      typeof station.elevationCitation === "string" &&
        station.elevationCitation.includes("without a matching elevation-cache row"),
      `${label}: station ${station.stationId} missing elevation citation mismatch`
    );
    assert(
      station.elevationProvenanceStatus === EXPECTED_MISSING_ELEVATION_PROVENANCE_STATUS,
      `${label}: station ${station.stationId} missing elevation provenance status mismatch`
    );
    assert(
      typeof station.elevationNonClaim === "string" &&
        station.elevationNonClaim.includes("No elevation cache metadata") &&
        station.elevationNonClaim.includes("upstream DEM"),
      `${label}: station ${station.stationId} missing elevation non-claim mismatch`
    );
    return;
  }
  if (station.elevationSourceKind === "dem-derived") {
    assert(
      station.elevationSourceId === "copernicus-dem-glo-30-public-selected-pair-v1" &&
        station.elevationDatasetId === "copernicus-dem-glo-30-public-selected-pair-v1",
      `${label}: station ${station.stationId} DEM elevation source id mismatch`
    );
    assert(
      station.elevationSourcePath === EXPECTED_ELEVATION_SOURCE_PATH,
      `${label}: station ${station.stationId} DEM elevation source path mismatch`
    );
    assert(
      typeof station.elevationSourceNote === "string" &&
        station.elevationSourceNote.includes("DEM-derived elevation") &&
        station.elevationSourceNote.includes("datum"),
      `${label}: station ${station.stationId} DEM elevation source note mismatch`
    );
    assert(
      station.elevationDatasetVersion === "Copernicus DEM 2021 release" &&
        station.elevationDatasetResolutionM === 30 &&
        station.elevationVerticalDatum === "EGM2008 / EPSG:3855" &&
        typeof station.elevationTileId === "string" &&
        typeof station.elevationCellId === "string",
      `${label}: station ${station.stationId} DEM metadata mismatch`
    );
    assert(
      station.elevationSamplingMethod === "nearest-cell-cog-range-read",
      `${label}: station ${station.stationId} DEM sampling method mismatch`
    );
    assert(
      station.elevationLicenseId === "copernicus-dem-public" &&
        typeof station.elevationLicenseUrl === "string",
      `${label}: station ${station.stationId} DEM license metadata mismatch`
    );
    assert(
      station.elevationProvenanceStatus === "public-dem-derived-selected-pair",
      `${label}: station ${station.stationId} DEM provenance status mismatch`
    );
    assert(
      typeof station.elevationNonClaim === "string" &&
        station.elevationNonClaim.includes("not operator-measured") &&
        station.elevationNonClaim.includes("surveyed RF horizon"),
      `${label}: station ${station.stationId} DEM non-claim missing`
    );
    return;
  }
  if (station.elevationSourceKind === "operator-stated") {
    assert(
      station.elevationSourceId === "sansa-operator-altitude-public-page-v1" &&
        station.elevationDatasetId === "sansa-operator-altitude-public-page-v1",
      `${label}: station ${station.stationId} operator elevation source id mismatch`
    );
    assert(
      typeof station.elevationSourceNote === "string" &&
        station.elevationSourceNote.includes("Operator-stated station altitude"),
      `${label}: station ${station.stationId} operator elevation source note mismatch`
    );
    assert(
      station.elevationSamplingMethod ===
        "operator-web-altitude-plus-dem-terrain-comparison",
      `${label}: station ${station.stationId} operator sampling method mismatch`
    );
    assert(
      station.elevationLicenseId === "operator-public-web" &&
        typeof station.elevationLicenseUrl === "string",
      `${label}: station ${station.stationId} operator license metadata mismatch`
    );
    assert(
      station.elevationProvenanceStatus ===
        "operator-stated-altitude-with-public-dem-terrain",
      `${label}: station ${station.stationId} operator provenance status mismatch`
    );
    assert(
      typeof station.elevationNonClaim === "string" &&
        station.elevationNonClaim.includes("not a surveyed RF horizon"),
      `${label}: station ${station.stationId} operator non-claim missing`
    );
    return;
  }
  assert(
    station.elevationSourceId === EXPECTED_ELEVATION_DATASET_ID,
    `${label}: station ${station.stationId} elevation source id mismatch`
  );
  assert(
    station.elevationSourcePath === EXPECTED_ELEVATION_SOURCE_PATH,
    `${label}: station ${station.stationId} elevation source path mismatch`
  );
  assert(
    typeof station.elevationSourceNote === "string" &&
      station.elevationSourceNote.includes("Legacy service-cache") &&
      !station.elevationSourceNote.includes("Open-Elevation"),
    `${label}: station ${station.stationId} elevation source note should be legacy-neutral`
  );
  assert(
    typeof station.elevationSourceAccessedUtc === "string" &&
      !Number.isNaN(Date.parse(station.elevationSourceAccessedUtc)),
    `${label}: station ${station.stationId} elevation source timestamp missing`
  );
  assert(
    station.elevationSourceKind === EXPECTED_ELEVATION_SOURCE_KIND,
    `${label}: station ${station.stationId} elevation source kind mismatch`
  );
  assert(
    station.elevationSourceKind !== "dem-derived",
    `${label}: station ${station.stationId} must not be dem-derived in TH3a`
  );
  assert(
    station.elevationDatasetId === EXPECTED_ELEVATION_DATASET_ID,
    `${label}: station ${station.stationId} elevation dataset id mismatch`
  );
  assert(
    station.elevationDatasetVersion === null &&
      station.elevationDatasetResolutionM === null &&
      station.elevationVerticalDatum === null &&
      station.elevationTileId === null &&
      station.elevationCellId === null,
    `${label}: station ${station.stationId} legacy DEM fields should remain null`
  );
  assert(
    Number.isFinite(station.elevationSampleLat) &&
      Number.isFinite(station.elevationSampleLon),
    `${label}: station ${station.stationId} elevation sample coordinate missing`
  );
  assert(
    station.elevationSamplingMethod === EXPECTED_ELEVATION_SAMPLING_METHOD,
    `${label}: station ${station.stationId} elevation sampling method mismatch`
  );
  assert(
    station.elevationSampledAtUtc === station.elevationSourceAccessedUtc &&
      station.elevationCacheGeneratedUtc === station.elevationSourceAccessedUtc,
    `${label}: station ${station.stationId} elevation timestamps should mirror source access`
  );
  assert(
    station.elevationLicenseId === EXPECTED_ELEVATION_LICENSE_ID &&
      station.elevationLicenseUrl === null,
    `${label}: station ${station.stationId} elevation license metadata mismatch`
  );
  assert(
    typeof station.elevationCitation === "string" &&
      station.elevationCitation.includes("Legacy elevation service cache") &&
      station.elevationCitation.includes("not verified"),
    `${label}: station ${station.stationId} elevation citation missing`
  );
  assert(
    station.elevationProvenanceStatus === EXPECTED_ELEVATION_PROVENANCE_STATUS,
    `${label}: station ${station.stationId} elevation provenance status mismatch`
  );
  assert(
    typeof station.elevationNonClaim === "string" &&
      station.elevationNonClaim.includes("upstream DEM") &&
      station.elevationNonClaim.includes("vertical datum") &&
      !station.elevationNonClaim.includes("Open-Elevation"),
    `${label}: station ${station.stationId} elevation non-claim missing`
  );
}

export function assertStationSourceMetadata(label, station) {
  assert(
    COORDINATE_SOURCE_AUTHORITIES.has(station.coordinateSourceAuthority),
    `${label}: station ${station.stationId} coordinate source authority invalid`
  );
  assert(
    typeof station.coordinateSourceNote === "string" &&
      station.coordinateSourceNote.length > 0,
    `${label}: station ${station.stationId} coordinate source note missing`
  );
  assert(
    station.coordinateSourceUrl === null ||
      typeof station.coordinateSourceUrl === "string",
    `${label}: station ${station.stationId} coordinate source URL invalid`
  );
  assertElevationProvenanceMetadata(label, station);
  const expectedTerrainSourceId =
    station.terrainMaskDeg === 0
      ? EXPECTED_TERRAIN_MASK_SOURCE_ID
      : EXPECTED_DEM_TERRAIN_MASK_SOURCE_ID;
  assert(
    station.terrainMaskSourceId === expectedTerrainSourceId,
    `${label}: station ${station.stationId} terrain mask source mismatch`
  );
  assert(
    station.terrainMaskIsDefault === (station.terrainMaskDeg === 0),
    `${label}: station ${station.stationId} terrain mask default flag mismatch`
  );
  if (station.terrainMaskDeg === 0) {
    assert(
      typeof station.terrainMaskNote === "string" &&
        station.terrainMaskNote.includes("site-specific horizon mask"),
      `${label}: station ${station.stationId} terrain mask note missing`
    );
  } else {
    assert(
      typeof station.terrainMaskNote === "string" &&
        station.terrainMaskNote.includes("Copernicus DEM GLO-30") &&
        station.terrainMaskNote.includes("not a surveyed RF horizon"),
      `${label}: station ${station.stationId} DEM terrain mask note missing`
    );
  }
}

export const ELEVATION_METADATA_FIELDS = [
  "elevationSourceId",
  "elevationSourcePath",
  "elevationSourceNote",
  "elevationSourceAccessedUtc",
  "elevationSourceKind",
  "elevationDatasetId",
  "elevationDatasetVersion",
  "elevationDatasetResolutionM",
  "elevationVerticalDatum",
  "elevationTileId",
  "elevationCellId",
  "elevationSampleLat",
  "elevationSampleLon",
  "elevationSamplingMethod",
  "elevationSampledAtUtc",
  "elevationCacheGeneratedUtc",
  "elevationLicenseId",
  "elevationLicenseUrl",
  "elevationCitation",
  "elevationProvenanceStatus",
  "elevationNonClaim"
];

export function assertElevationMetadataParity(label, actual, expected, context) {
  assert(
    actual.elevationM === expected.elevationM,
    `${label}: ${context} elevationM mismatch`
  );
  for (const field of ELEVATION_METADATA_FIELDS) {
    assert(
      actual[field] === expected[field],
      `${label}: ${context} ${field} mismatch`
    );
  }
}

export function assertA8UnavailablePlaceholders(label, data) {
  const breakdown = data.rfChainBreakdown;
  assert(breakdown, `${label}: RF chain breakdown missing`);
  assert(
    breakdown.carrierBand === "orbit-class-default" &&
      breakdown.carrierFrequencyGHz === null &&
      breakdown.receivedPowerProxyDbm === null,
    `${label}: RF chain should expose modeled carrier and unavailable per-link power fields`
  );
  assert(
    breakdown.provenance?.truthClass === "modeled" &&
      breakdown.provenance?.sourceId === "runtime-projection" &&
      breakdown.provenance?.modelId === "fspl-rain-gas-assumed-antenna-link-budget-v1",
    `${label}: RF chain provenance should disclose the runtime antenna/link model`
  );
  assert(
    Array.isArray(breakdown.terms) &&
      breakdown.terms.length === EXPECTED_RF_CHAIN_TERM_KINDS.length,
    `${label}: RF chain term count mismatch`
  );
  for (const [index, term] of breakdown.terms.entries()) {
    assert(
      term.kind === EXPECTED_RF_CHAIN_TERM_KINDS[index],
      `${label}: RF chain term order mismatch at ${index}`
    );
    if (term.kind === "tx-eirp") {
      assert(
        term.contributionSignedDb === null &&
          term.provenance?.truthClass === "unavailable" &&
          term.provenance?.sourceId === EXPECTED_RF_FIELD_SOURCE_ID,
        `${label}: RF chain term ${term.kind} should preserve the station EIRP gap`
      );
    } else {
      assert(
        term.contributionSignedDb === null &&
          term.provenance?.truthClass === "modeled" &&
          term.provenance?.sourceId === "runtime-projection",
        `${label}: RF chain term ${term.kind} should disclose modeled provenance`
      );
    }
    if (term.kind.includes("antenna")) {
      assert(
        term.inputSummary?.antennaParameterSource ===
          EXPECTED_METRIC_ANCHORS.antennaParameterSource &&
          term.inputSummary?.antennaSourceClass === "assumed-Tier-B",
        `${label}: RF chain antenna term ${term.kind} assumption source missing`
      );
    }
    assert(
      Array.isArray(term.standardsRef) &&
        term.standardsRef.length > 0 &&
        term.nonClaim,
      `${label}: RF chain term ${term.kind} metadata incomplete`
    );
  }

  assert(
    Array.isArray(data.atmosphericLookups) &&
      data.atmosphericLookups.length === EXPECTED_ATMOSPHERIC_LOOKUP_SOURCES.length,
    `${label}: atmospheric lookup placeholder count mismatch`
  );
  for (const source of EXPECTED_ATMOSPHERIC_LOOKUP_SOURCES) {
    const lookup = data.atmosphericLookups.find((entry) => entry.source === source);
    assert(lookup, `${label}: missing atmospheric lookup ${source}`);
    assert(
      lookup.midpointLatDeg === null &&
        lookup.midpointLonDeg === null &&
        lookup.cellLatDeg === null &&
        lookup.cellLonDeg === null &&
        lookup.lookupValue === null &&
        lookup.lookupUnit === null &&
        lookup.interpolation === "unavailable" &&
        lookup.provenance?.truthClass === "unavailable",
      `${label}: atmospheric lookup ${source} should be unavailable`
    );
  }

  assert(
    Array.isArray(data.stationRfProfiles) && data.stationRfProfiles.length === 2,
    `${label}: station RF profiles missing`
  );
  const precisionById = new Map(
    data.stationPrecision.map((station) => [station.stationId, station])
  );
  for (const profile of data.stationRfProfiles) {
    const precision = precisionById.get(profile.stationId);
    assert(precision, `${label}: station RF profile ${profile.stationId} has no precision row`);
    assertElevationMetadataParity(
      label,
      profile,
      precision,
      `station RF profile ${profile.stationId}`
    );
    assert(
      profile.terrainMaskDeg === precision.terrainMaskDeg &&
        profile.terrainMaskSourceId === precision.terrainMaskSourceId &&
        profile.terrainMaskIsDefault === precision.terrainMaskIsDefault,
      `${label}: station RF profile ${profile.stationId} station truth mismatch`
    );
    assert(
      profile.antennaDiameterM === null &&
        profile.antennaDiameterSourceId === EXPECTED_RF_FIELD_SOURCE_ID &&
        profile.peakEirpDbm === null &&
        profile.peakEirpSourceId === EXPECTED_RF_FIELD_SOURCE_ID &&
        profile.txPolarization === null &&
        profile.txPolarizationSourceId === EXPECTED_RF_FIELD_SOURCE_ID &&
        profile.provenance?.truthClass === "unavailable",
      `${label}: station RF profile ${profile.stationId} RF fields should be unavailable`
    );
  }
}

export function assertDataCompletenessShape(
  label,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state?.hasCapture, `${label}: missing capture seam`);
  assert(state?.hasController, `${label}: missing controller`);
  const overlay = state.overlay;
  const data = overlay?.dataCompleteness;
  assert(data, `${label}: missing dataCompleteness debug payload`);
  assert(data.routeMode === RUNTIME_MODE, `${label}: wrong routeMode ${data.routeMode}`);
  assertPairSourceAttributionPayload(label, data.pairSourceAttribution);
  assert(data.actorSourceCoverage?.fakeActorCount === 0, `${label}: fake actor count is not zero`);
  assert(Array.isArray(data.tleSources) && data.tleSources.length === 3, `${label}: expected 3 TLE sources`);
  assert(
    Array.isArray(data.tleFreshness) && data.tleFreshness.length === 3,
    `${label}: expected 3 TLE freshness rows`
  );
  for (const source of data.tleSources) {
    assert(source.format === "tle-3le", `${label}: expected TLE source format`);
    assert(source.apiClass === "celestrak-gp-tle", `${label}: expected TLE API class`);
    assert(source.sourcePolicy, `${label}: source policy missing`);
    assert(
      source.catalogNumberCompatibility === "tle-limited-5-digit-catalog",
      `${label}: expected TLE catalog compatibility disclosure`
    );
  }
  assertCapDisclosurePayload(label, data.capDisclosure);
  assertRuntimeInventoryDisclosurePayload(
    label,
    data.runtimeInventoryDisclosure,
    data
  );
  assertMetricAnchorDisclosurePayload(
    label,
    data.metricAnchorDisclosure,
    expectedPolicyId
  );
  assertPolicyDisclosurePayload(label, data.policyDisclosure, expectedPolicyId);
  assertA8UnavailablePlaceholders(label, data);
  for (const freshness of data.tleFreshness) {
    assert(
      TLE_SOURCE_MODES.has(freshness.sourceMode),
      `${label}: invalid TLE sourceMode ${freshness.sourceMode}`
    );
    assert(freshness.format === "tle-3le", `${label}: TLE freshness format missing`);
    assert(freshness.apiClass === "celestrak-gp-tle", `${label}: TLE freshness API class missing`);
    assert(freshness.sourcePolicy, `${label}: TLE freshness source policy missing`);
    assert(
      freshness.catalogNumberCompatibility === "tle-limited-5-digit-catalog",
      `${label}: TLE freshness catalog compatibility missing`
    );
    assert(freshness.snapshotPath, `${label}: TLE freshness snapshot path missing`);
    assert(freshness.maxEpochUtc, `${label}: TLE freshness max epoch missing`);
    assert(
      Array.isArray(freshness.noradIdRangeSummary) &&
        freshness.noradIdRangeSummary.length > 0,
      `${label}: TLE freshness NORAD summary missing`
    );
    assert(
      freshness.constellationMembership &&
        typeof freshness.constellationMembership === "object",
      `${label}: TLE freshness membership payload missing`
    );
  }
  const hasSatcatMembership = data.tleFreshness.some(
    (freshness) => Object.keys(freshness.constellationMembership).length > 0
  );
  assert(hasSatcatMembership, `${label}: SATCAT constellation membership missing`);
  assert(
    data.tleSources.every((source) => source.health && source.sourceTimestampUtc),
    `${label}: source health/timestamp missing`
  );
  const thresholdByOrbit = { LEO: 14, MEO: 30, GEO: 30 };
  for (const source of data.tleSources) {
    assert(
      source.healthThresholdDays === thresholdByOrbit[source.orbitClass],
      `${label}: ${source.orbitClass} freshness threshold mismatch`
    );
    assert(source.epochEndUtc, `${label}: ${source.orbitClass} epoch end missing`);
    assert(
      source.health === expectedSourceHealth(source, SELECTED_PAIR_DEMO_START_UTC),
      `${label}: ${source.orbitClass} health not based on max source/epoch date`
    );
    assert(
      Number.isInteger(source.sgp4ErrorCount) && source.sgp4ErrorCount >= 0,
      `${label}: ${source.orbitClass} SGP4 error count missing`
    );
    assert(
      Array.isArray(source.noradIdRangeSummary) && source.noradIdRangeSummary.length > 0,
      `${label}: ${source.orbitClass} NORAD range summary missing`
    );
    assert(
      Number.isInteger(source.cosparDesignatorCount) &&
        source.cosparDesignatorCount > 0 &&
        Array.isArray(source.cosparDesignatorSamples) &&
        source.cosparDesignatorSamples.length > 0,
      `${label}: ${source.orbitClass} COSPAR exposure missing`
    );
    assert(
      source.classificationCounts && Object.keys(source.classificationCounts).length > 0,
      `${label}: ${source.orbitClass} classification counts missing`
    );
    assert(
      source.dragTermFieldCoverage?.meanMotionFirstDerivativeCount > 0 &&
        source.dragTermFieldCoverage?.meanMotionSecondDerivativeCount > 0 &&
        source.dragTermFieldCoverage?.bstarDragTermCount > 0,
      `${label}: ${source.orbitClass} drag-term coverage missing`
    );
  }
  assert(
    data.visibilityCadenceSecondsByOrbit?.LEO === 30 &&
      data.visibilityCadenceSecondsByOrbit?.MEO === 60 &&
      data.visibilityCadenceSecondsByOrbit?.GEO === 120,
    `${label}: per-orbit visibility cadence mismatch`
  );
  assert(
    Array.isArray(data.stationPrecision) && data.stationPrecision.length === 2,
    `${label}: station precision payload missing`
  );
  assert(
    data.stationPrecision.every((station) => station.stationId && station.disclosurePrecision),
    `${label}: station precision row incomplete`
  );
  const baseElevationThresholdDeg = Number(
    data.modeledOutputs?.find((output) => output.kind === "handover")
      ?.inputSummary?.baseElevationThresholdDeg
  );
  assert(
    Number.isFinite(baseElevationThresholdDeg),
    `${label}: base elevation threshold missing`
  );
  for (const station of data.stationPrecision) {
    assert(
      Number.isInteger(station.elevationM),
      `${label}: station ${station.stationId} elevationM is not an integer`
    );
    assert(
      Number.isInteger(station.terrainMaskDeg) &&
        station.terrainMaskDeg >= 0 &&
        station.terrainMaskDeg <= 90,
      `${label}: station ${station.stationId} terrainMaskDeg is not 0..90`
    );
    assert(
      Number.isFinite(station.effectiveElevationThresholdDeg),
      `${label}: station ${station.stationId} effective threshold missing`
    );
    assert(
      station.effectiveElevationThresholdDeg ===
        baseElevationThresholdDeg + station.terrainMaskDeg,
      `${label}: station ${station.stationId} effective threshold mismatch`
    );
    assertStationSourceMetadata(label, station);
  }
  assert(
    Array.isArray(data.actorProvenance),
    `${label}: actor provenance payload missing`
  );
  if (data.actorSourceCoverage.renderedActorCount > 0) {
    assert(
      data.actorProvenance.length === data.actorSourceCoverage.renderedActorCount,
      `${label}: actor provenance count mismatch`
    );
    assert(
      data.actorProvenance.every(
        (actor) =>
          actor.satelliteId &&
          actor.sourceId &&
          actor.propagatedSampleCount > 0 &&
          actor.sampleCadenceSeconds > 0 &&
          actor.firstPropagatedUtc &&
          actor.lastPropagatedUtc
      ),
      `${label}: actor provenance row incomplete`
    );
    assert(
      data.actorProvenance.every(
        (actor) =>
          actor.sampleCadenceSeconds ===
          data.visibilityCadenceSecondsByOrbit[actor.orbitClass]
      ),
      `${label}: actor sample cadence does not match orbit cadence`
    );
  }
  assert(
    Array.isArray(data.visibilityProvenance),
    `${label}: visibility provenance payload missing`
  );
  if (data.visibilityProvenance.length > 0) {
    assert(
      data.visibilityProvenance.every(
        (row) =>
          row.satelliteId &&
          row.sourceId &&
          row.stationAWindowSource &&
          row.stationBWindowSource &&
          row.pairIntersectionSource &&
          row.sampleCadenceSeconds > 0
      ),
      `${label}: visibility provenance row incomplete`
    );
    assert(
      data.visibilityProvenance.every(
        (row) =>
          row.sampleCadenceSeconds ===
          data.visibilityCadenceSecondsByOrbit[row.orbitClass]
      ),
      `${label}: visibility sample cadence does not match orbit cadence`
    );
  }
  const outputKinds = new Set(data.modeledOutputs?.map((output) => output.kind));
  for (const kind of ["handover", "link-budget", "throughput", "jitter", "latency", "rain-impact"]) {
    assert(outputKinds.has(kind), `${label}: missing modeled output ${kind}`);
  }
  const handoverOutput = data.modeledOutputs.find((output) => output.kind === "handover");
  assert(
    handoverOutput?.inputSummary?.activePolicyId === expectedPolicyId,
    `${label}: handover modeled output policy mismatch`
  );
  assert(
    data.modeledOutputs.every(
      (output) =>
        output.modelId &&
        output.inputSummary &&
        output.outputUnit !== undefined &&
        output.nonClaim
    ),
    `${label}: modeled output metadata incomplete`
  );
  const modeledInputSummaries = new Set(
    data.modeledOutputs.map((output) => JSON.stringify(output.inputSummary))
  );
  assert(
    modeledInputSummaries.size === data.modeledOutputs.length,
    `${label}: modeled output inputSummary objects are not per-output`
  );
  const transformIds = new Set(data.displayTransforms?.map((entry) => entry.sourceId));
  for (const sourceId of [
    "selected-pair-scene-altitude-compression",
    "selected-pair-scene-camera-framing",
    "selected-pair-scene-label-density",
    "selected-pair-scene-display-lane-offset",
    "selected-pair-scene-generic-actor-mesh"
  ]) {
    assert(transformIds.has(sourceId), `${label}: missing display transform ${sourceId}`);
  }
  const transformById = new Map(data.displayTransforms.map((entry) => [entry.sourceId, entry]));
  assert(
    transformById.get("selected-pair-scene-camera-framing")?.inputSummary?.pairGeometry ===
      state.overlay.pairGeometry,
    `${label}: camera hint not reflected in display transform payload`
  );
  assert(
    Number(transformById.get("selected-pair-scene-altitude-compression")?.inputSummary?.factor) > 0,
    `${label}: altitude compression transform missing dynamic factor`
  );
  assert(
    Number(transformById.get("selected-pair-scene-label-density")?.inputSummary?.maxVisibleActorLabels) > 0,
    `${label}: label-density transform missing dynamic label limit`
  );
}

export function assertStationPrecisionFooterDataset(testCase, state) {
  assert(state.footer?.stationAId === testCase.stationA, `${testCase.label}: footer station A missing`);
  assert(state.footer?.stationBId === testCase.stationB, `${testCase.label}: footer station B missing`);
  const stationsById = new Map(
    state.overlay?.dataCompleteness?.stationPrecision?.map((station) => [
      station.stationId,
      station
    ]) ?? []
  );
  for (const slot of ["A", "B"]) {
    const stationId = state.footer?.[`station${slot}Id`];
    const expected = stationsById.get(stationId);
    const elevationM = Number(state.footer?.[`station${slot}ElevationM`]);
    const terrainMaskDeg = Number(state.footer?.[`station${slot}TerrainMaskDeg`]);
    const effectiveElevationThresholdDeg = Number(
      state.footer?.[`station${slot}EffectiveElevationThresholdDeg`]
    );
    const terrainMaskSourceId =
      state.footer?.[`station${slot}TerrainMaskSourceId`];
    const terrainMaskIsDefault =
      state.footer?.[`station${slot}TerrainMaskIsDefault`];
    assert(expected, `${testCase.label}: footer station ${slot} missing debug match`);
    assert(
      Number.isInteger(elevationM) && elevationM === expected.elevationM,
      `${testCase.label}: footer station ${slot} elevationM missing`
    );
    assert(
      ELEVATION_METADATA_FIELDS.every((field) => {
        const footerKey = `station${slot}${field[0].toUpperCase()}${field.slice(1)}`;
        return state.footer?.[footerKey] === csvCellValue(expected[field]);
      }),
      `${testCase.label}: footer station ${slot} elevation metadata mismatch`
    );
    assert(
      Number.isInteger(terrainMaskDeg) &&
        terrainMaskDeg >= 0 &&
        terrainMaskDeg <= 90 &&
        terrainMaskDeg === expected.terrainMaskDeg,
      `${testCase.label}: footer station ${slot} terrainMaskDeg missing`
    );
    assert(
      terrainMaskSourceId === expected.terrainMaskSourceId &&
        terrainMaskIsDefault === String(expected.terrainMaskIsDefault),
      `${testCase.label}: footer station ${slot} terrain mask source missing`
    );
    assert(
      Number.isFinite(effectiveElevationThresholdDeg) &&
        effectiveElevationThresholdDeg === expected.effectiveElevationThresholdDeg,
      `${testCase.label}: footer station ${slot} effective threshold missing`
    );
    assert(
      state.footer?.[`station${slot}CoordinateSourceAuthority`] ===
        expected.coordinateSourceAuthority,
      `${testCase.label}: footer station ${slot} coordinate authority mismatch`
    );
    if (expected.coordinateSourceUrl) {
      assert(
        state.footer?.[`station${slot}CoordinateSourceUrl`] ===
          expected.coordinateSourceUrl,
        `${testCase.label}: footer station ${slot} coordinate source URL mismatch`
      );
    }
    if (expected.coordinateSourceNote.length <= 180) {
      assert(
        state.footer?.[`station${slot}CoordinateSourceNote`] ===
          expected.coordinateSourceNote,
        `${testCase.label}: footer station ${slot} coordinate source note mismatch`
      );
    }
  }
}

export function assertStationCoordinateSourceDisclosure(testCase, state) {
  assert(
    state.stationCoordinateSourceDisclosure,
    `${testCase.label}: Row 5 station coordinate source block missing`
  );
  assert(
    (state.stationCoordinateSourceDisclosure.text ?? "").includes(
      "Coordinate precision describes coordinate use"
    ) &&
      (state.stationCoordinateSourceDisclosure.text ?? "").includes(
        "coordinate source authority"
      ),
    `${testCase.label}: Row 5 coordinate source distinction missing`
  );
  for (const station of state.overlay.dataCompleteness.stationPrecision) {
    assert(
      (state.stationCoordinateSourceDisclosure.text ?? "").includes(station.stationId) &&
        (state.stationCoordinateSourceDisclosure.text ?? "").includes(
          station.coordinateSourceAuthority
        ),
      `${testCase.label}: Row 5 coordinate authority missing for ${station.stationId}`
    );
  }
  assert(
    (state.footer?.text ?? "").includes("precision != coord authority") ||
      (state.footer?.stationACoordinateSourceAuthority &&
        state.footer?.stationBCoordinateSourceAuthority),
    `${testCase.label}: Row 6 coordinate authority distinction missing`
  );
}

export function assertSourceAttributionParity(testCase, state) {
  const attribution = state.overlay?.dataCompleteness?.pairSourceAttribution;
  assertPairSourceAttributionPayload(testCase.label, attribution);
  assert(
    state.panel?.sourceTier === attribution.sourceTier &&
      state.panel?.sourceEvidenceKind === attribution.evidenceKind &&
      state.panel?.sourceBadgeLabel === attribution.badgeLabel,
    `${testCase.label}: panel source attribution must match debug payload`
  );
  assert(
    state.footer?.sourceTier === attribution.sourceTier &&
      state.footer?.evidenceKind === attribution.evidenceKind &&
      state.footer?.badgeLabel === attribution.badgeLabel,
    `${testCase.label}: footer source attribution must match debug payload`
  );
  assert(
    state.overlay.dataCompleteness.stationPrecision.every(
      (station) => station.sourceTier === attribution.sourceTier
    ),
    `${testCase.label}: station precision rows should inherit pair source tier`
  );

  const expectedEvidenceKind = expectedSourceEvidenceKindForCase(testCase);
  if (!expectedEvidenceKind) {
    return;
  }
  assert(
    attribution.evidenceKind === expectedEvidenceKind,
    `${testCase.label}: expected ${expectedEvidenceKind}, received ${attribution.evidenceKind}`
  );
  if (expectedEvidenceKind === "same-operator-family-inferred") {
    const disclosureText = [
      state.sourcesDisclosureText ?? "",
      state.assumptionsDisclosureText ?? ""
    ].join("\n");
    assert(
      attribution.sourceTier === "geometric-derived" &&
        /no pair attestation/i.test(attribution.badgeLabel),
      `${testCase.label}: same-family inference should remain geometric-derived`
    );
    assert(
      disclosureText.includes("Same operator family is an inference") &&
        disclosureText.includes("not pair-level routing") &&
        disclosureText.includes("operator attestation"),
      `${testCase.label}: Row 5 non-claim should narrow same-family claim`
    );
  }
  if (expectedEvidenceKind === "cross-family-geometric") {
    assert(
      attribution.sourceTier === "geometric-derived" &&
        /visibility-derived only/i.test(attribution.badgeLabel),
      `${testCase.label}: cross-family pair should remain geometric-derived`
    );
  }
}

export function assertRow5DisclosureDatasets(
  label,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state.capDisclosure, `${label}: Row 5 cap disclosure missing`);
  assert(state.policyDisclosure, `${label}: Row 5 policy disclosure missing`);
  assert(
    state.metricAnchorDisclosure,
    `${label}: Row 5 metric anchor disclosure missing`
  );
  const data = state.overlay?.dataCompleteness;
  assert(data?.runtimeInventoryDisclosure?.perOrbit, `${label}: debug inventory missing`);

  const capDataset = state.capDisclosure.dataset;
  for (const orbit of ["leo", "meo", "geo"]) {
    const key = orbit.toUpperCase();
    const inventory = data.runtimeInventoryDisclosure.perOrbit[key];
    assert(inventory, `${label}: ${key} debug inventory row missing`);
    assert(
      Number.parseInt(capDataset[`${orbit}Cap`], 10) ===
        data.capDisclosure.perOrbitCap[key],
      `${label}: Row 5 ${key} cap dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}Inventory`], 10) ===
        data.capDisclosure.perOrbitInventory[key],
      `${label}: Row 5 ${key} inventory dataset mismatch`
    );
    assert(
      capDataset[`${orbit}CappedAtRuntime`] ===
        String(data.capDisclosure.cappedAtRuntime[key]),
      `${label}: Row 5 ${key} capped dataset mismatch`
    );
    assert(
      capDataset[`${orbit}InventorySourceMode`] === inventory.inventorySourceMode &&
        TLE_SOURCE_MODES.has(inventory.inventorySourceMode),
      `${label}: Row 5 ${key} source mode dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}NetworkSnapshotInventoryCount`], 10) ===
        inventory.networkSnapshotInventoryCount,
      `${label}: Row 5 ${key} network inventory dataset mismatch`
    );
    assert(
      inventory.networkSnapshotInventoryCount ===
        EXPECTED_NETWORK_SNAPSHOT_INVENTORY[key],
      `${label}: Row 5 ${key} network inventory fixture mismatch`
    );
    assert(
      capDataset[`${orbit}LocalFallbackInventoryCount`] ===
        csvCellValue(inventory.localFallbackInventoryCount),
      `${label}: Row 5 ${key} local fallback inventory should be unavailable`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}ActiveInventoryCount`], 10) ===
        inventory.activeInventoryCount,
      `${label}: Row 5 ${key} active inventory dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}AcceptedRecordCount`], 10) ===
        inventory.acceptedRecordCount,
      `${label}: Row 5 ${key} accepted record dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}RuntimeCap`], 10) ===
        inventory.runtimeCap,
      `${label}: Row 5 ${key} runtime cap dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}VisibleActorCount`], 10) ===
        inventory.visibleActorCount,
      `${label}: Row 5 ${key} visible actor dataset mismatch`
    );
  }
  const leoInventory = data.runtimeInventoryDisclosure.perOrbit.LEO;
  const expectedLeoText =
    `LEO: source ${leoInventory.inventorySourceMode} · ` +
    `network ${inventoryTextValue(leoInventory.networkSnapshotInventoryCount)} · ` +
    `local fallback ${inventoryTextValue(leoInventory.localFallbackInventoryCount)} · ` +
    `active ${leoInventory.activeInventoryCount} · ` +
    `accepted ${leoInventory.acceptedRecordCount} · ` +
    `cap ${leoInventory.runtimeCap} · ` +
    `${leoInventory.cappedAtRuntime ? "capped" : "uncapped"} · ` +
    `visible ${leoInventory.visibleActorCount}`;
  assert(
    state.capDisclosure.text.includes(expectedLeoText),
    `${label}: Row 5 inventory text missing LEO count breakdown`
  );

  const policyDataset = state.policyDisclosure.dataset;
  assert(
    policyDataset.activePolicyId === expectedPolicyId,
    `${label}: Row 5 active policy dataset mismatch`
  );
  assert(
    Number.parseInt(policyDataset.latencyBudgetMs, 10) === 600,
    `${label}: Row 5 latency dataset mismatch`
  );
  assert(
    Number.parseInt(policyDataset.minVisibilityWindowMs, 10) === 60_000,
    `${label}: Row 5 min visibility dataset mismatch`
  );
  assert(
    Number(policyDataset.hysteresisDb) === 2,
    `${label}: Row 5 hysteresis dataset mismatch`
  );
  assert(
    Number(policyDataset.elevationThresholdDeg) === 10,
    `${label}: Row 5 elevation dataset mismatch`
  );
  assert(
    state.policyDisclosure.text.includes(expectedPolicyId),
    `${label}: Row 5 policy text missing active id`
  );

  const metricDataset = state.metricAnchorDisclosure.dataset;
  for (const [key, expected] of Object.entries(EXPECTED_METRIC_ANCHORS)) {
    assert(
      metricDataset[key] === expected,
      `${label}: Row 5 metric ${key} dataset mismatch`
    );
    assert(
      state.metricAnchorDisclosure.text.includes(expected),
      `${label}: Row 5 metric ${key} text missing`
    );
  }
  assert(
    metricDataset.activePolicyId === expectedPolicyId,
    `${label}: Row 5 metric active policy dataset mismatch`
  );
}

export function assertTleChipVisualBand(label, state) {
  const sourceMode = state.chip?.sourceMode;
  const backgroundColor = state.chip?.backgroundColor ?? "";
  assert(TLE_SOURCE_MODES.has(sourceMode), `${label}: TLE chip source mode missing`);
  const expectedRgbByMode = {
    "network-snapshot": "19, 83, 58",
    "fallback-local-snapshot": "110, 76, 21",
    "local-snapshot": "6, 18, 28"
  };
  assert(
    backgroundColor.includes(expectedRgbByMode[sourceMode]),
    `${label}: TLE chip background ${backgroundColor} does not match ${sourceMode}`
  );
}

export function assertDefaultComparisonHidden(label, state) {
  assert(
    (state.comparePanes ?? []).length === 0,
    `${label}: compare panes should be hidden without compare param`
  );
}

export function assertPreWave2ComparisonVisible(label, state) {
  const panes = state.comparePanes ?? [];
  const paneKeys = new Set(panes.map((pane) => `${pane.row}:${pane.pane}`));
  for (const row of ["3", "4"]) {
    assert(
      paneKeys.has(`${row}:current`) && paneKeys.has(`${row}:pre-wave-2`),
      `${label}: missing compare panes for row ${row}`
    );
  }
  assert(
    state.panel?.compareMode === "pre-wave-2",
    `${label}: panel compare mode missing`
  );
  assert(
    panes.some((pane) => pane.text.includes("Pre-wave-2")) &&
      panes.some((pane) => pane.text.includes("Current")),
    `${label}: compare pane labels missing`
  );
  assert(
    panes.some((pane) => pane.row === "4" && pane.text.includes("ASIASTAR")),
    `${label}: pre-wave-2 event baseline missing`
  );
}

export function assertExpectedStationPrecision(testCase, data) {
  const stationsById = new Map(
    data.stationPrecision.map((station) => [station.stationId, station])
  );
  for (const expected of testCase.expectedStationPrecision ?? []) {
    const actual = stationsById.get(expected.stationId);
    assert(actual, `${testCase.label}: missing station precision ${expected.stationId}`);
    assert(
      actual.elevationM === expected.elevationM,
      `${testCase.label}: station ${expected.stationId} elevationM expected ${expected.elevationM}, received ${actual.elevationM}`
    );
    assert(
      actual.terrainMaskDeg === expected.terrainMaskDeg,
      `${testCase.label}: station ${expected.stationId} terrainMaskDeg expected ${expected.terrainMaskDeg}, received ${actual.terrainMaskDeg}`
    );
    assert(
      actual.effectiveElevationThresholdDeg === 10 + expected.terrainMaskDeg,
      `${testCase.label}: station ${expected.stationId} effective threshold mismatch`
    );
  }
}

export function assertReadyCase(
  testCase,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state, expectedPolicyId);
  assertExpectedStationPrecision(testCase, state.overlay.dataCompleteness);
  assert(state.panel?.routeMode === RUNTIME_MODE, `${testCase.label}: panel route mode missing`);
  assert(
    state.panel?.activePolicyId === expectedPolicyId,
    `${testCase.label}: panel active policy missing`
  );
  assertStationPrecisionFooterDataset(testCase, state);
  assertStationCoordinateSourceDisclosure(testCase, state);
  assertRow5DisclosureDatasets(testCase.label, state, expectedPolicyId);
  assertSourceAttributionParity(testCase, state);
  assert(state.chip?.sourceCount === "3", `${testCase.label}: TLE chip source count missing`);
  assert(state.chip?.sourceHealth, `${testCase.label}: TLE chip source health missing`);
  assertTleChipVisualBand(testCase.label, state);
  if (!testCase.compare) {
    assertDefaultComparisonHidden(testCase.label, state);
  }
  assert(
    TLE_SOURCE_MODES.has(state.chip?.sourceMode),
    `${testCase.label}: TLE chip sourceMode missing`
  );
  if (
    state.chip?.sourceMode === "network-snapshot" ||
    state.chip?.sourceMode === "fallback-local-snapshot"
  ) {
    const disclosureText = [
      state.sourcesDisclosureText ?? "",
      state.assumptionsDisclosureText ?? ""
    ].join("\n");
    assert(
      state.chip?.tleAttribution === "CelesTrak",
      `${testCase.label}: TLE chip CelesTrak attribution missing`
    );
    assert(
      disclosureText.includes("CelesTrak"),
      `${testCase.label}: Row 5 sources disclosure CelesTrak attribution missing`
    );
  }
  const parserFailureCount = state.overlay.dataCompleteness.tleSources.reduce(
    (total, source) => total + (source.parserFailureCount ?? 0),
    0
  );
  assert(
    state.chip?.parserFailureCount === String(parserFailureCount),
    `${testCase.label}: TLE chip parser failure count mismatch`
  );
}

export function assertEmptyCase(
  testCase,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state, expectedPolicyId);
  assertExpectedStationPrecision(testCase, state.overlay.dataCompleteness);
  assertStationPrecisionFooterDataset(testCase, state);
  assertStationCoordinateSourceDisclosure(testCase, state);
  assertRow5DisclosureDatasets(testCase.label, state, expectedPolicyId);
  assertSourceAttributionParity(testCase, state);
  assertTleChipVisualBand(testCase.label, state);
  if (!testCase.compare) {
    assertDefaultComparisonHidden(testCase.label, state);
  }
  assert(
    state.overlay.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: expected empty reason ${testCase.expectedEmptyReasonCode}, received ${state.overlay.emptyReasonCode}`
  );
  assert(
    state.overlay.dataCompleteness.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: debug empty reason mismatch`
  );
}

export function visibilityDeltaSummary(testCase, actualCount) {
  const baseline = testCase.baselineVisibilityWindowCount;
  const delta = actualCount - baseline;
  const deltaPct =
    baseline === 0
      ? (actualCount === 0 ? 0 : Number.POSITIVE_INFINITY)
      : delta / baseline;
  return {
    baselineVisibilityWindowCount: baseline,
    visibilityWindowCount: actualCount,
    visibilityWindowDelta: delta,
    visibilityWindowDeltaPct: Number.isFinite(deltaPct)
      ? Number(deltaPct.toFixed(3))
      : "inf"
  };
}

export function assertVisibilityDeltaWithinTolerance(testCase, actualCount) {
  const summary = visibilityDeltaSummary(testCase, actualCount);
  // Re-baseline capture mode: `TLE_DEBUG=1 npm run verify:tle` logs every case's
  // actual counts (and skips the assertion) so the fixture-coupled anchors above
  // can be refreshed after an intentional `npm run refresh:tle`. Off by default.
  if (process.env.TLE_DEBUG) {
    console.error(
      `[TLE_DEBUG vis] ${testCase.label}: ` +
        `baseline=${summary.baselineVisibilityWindowCount} ` +
        `actual=${summary.visibilityWindowCount} deltaPct=${summary.visibilityWindowDeltaPct}`
    );
    return summary;
  }
  if (testCase.baselineVisibilityWindowCount === 0) {
    assert(
      actualCount === 0,
      `${testCase.label}: visibility window count changed from zero baseline to ${actualCount}`
    );
    return summary;
  }
  assert(
    Math.abs(summary.visibilityWindowDeltaPct) <= 0.5,
    `${testCase.label}: visibility window delta exceeds 50% baseline (${summary.visibilityWindowDeltaPct})`
  );
  return summary;
}

export function assertMissingSourceEvidence(label, evidence) {
  assert(
    evidence?.emptyReasonCode === "tle-source-unavailable",
    `${label}: expected missing source reason, received ${evidence?.emptyReasonCode}`
  );
  assert(evidence.fakeActorCount === 0, `${label}: missing source produced fake actor`);
  assert(evidence.sourceCount === 3, `${label}: missing source manifest count mismatch`);
  const sourcesByOrbit = new Map(evidence.sources?.map((source) => [source.orbitClass, source]));
  assert(
    sourcesByOrbit.get("LEO")?.sourcePath === "missing:leo" &&
      sourcesByOrbit.get("MEO")?.sourcePath === "unsupported:meo" &&
      sourcesByOrbit.get("GEO")?.sourcePath === "missing:geo",
    `${label}: missing/unsupported source paths were not preserved`
  );
  assert(
    [...sourcesByOrbit.values()].every((source) => source.parserFailureCount === 0),
    `${label}: missing source parser failures not propagated`
  );
  assert(
    [...sourcesByOrbit.values()].every((source) => source.health === "unknown-age"),
    `${label}: missing source health should be unknown-age`
  );
  assert(
    [...sourcesByOrbit.values()].every(
      (source) =>
        source.format === "tle-3le" &&
        source.apiClass === "celestrak-gp-tle" &&
        source.sourcePolicy === "bundled-snapshot" &&
        source.catalogNumberCompatibility === "tle-limited-5-digit-catalog"
    ),
    `${label}: missing source metadata fallback mismatch`
  );
}
