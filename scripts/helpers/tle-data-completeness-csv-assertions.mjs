// CSV evidence assertions for verify-tle-first-data-completeness.mjs.

import {
  ELEVATION_METADATA_FIELDS,
  EXPECTED_METRIC_ANCHORS,
  assert,
  assertElevationMetadataParity,
  csvCellValue
} from "./tle-data-completeness-assertions.mjs";

export const CSV_ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"];
export const CSV_POLICY_DISCLOSURE_THRESHOLD_ORDER = [
  "latencyBudgetMs",
  "hysteresisDb",
  "minVisibilityWindowMs",
  "elevationThresholdDeg"
];

export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseCsvSections(text) {
  const sections = new Map();
  let currentSection = null;
  for (const row of parseCsvRows(text)) {
    if (row.length === 0 || row.every((cell) => cell === "")) {
      continue;
    }
    if (row[0]?.startsWith("# ")) {
      currentSection = { header: null, rows: [] };
      sections.set(row[0], currentSection);
      continue;
    }
    if (!currentSection) {
      continue;
    }
    if (!currentSection.header) {
      currentSection.header = row;
      continue;
    }
    const record = {};
    currentSection.header.forEach((key, index) => {
      record[key] = row[index] ?? "";
    });
    currentSection.rows.push(record);
  }
  return sections;
}

export function requireCsvSection(sections, sectionName, label) {
  const section = sections.get(sectionName);
  assert(section, `${label}: CSV missing ${sectionName}`);
  return section;
}

export function requireCsvSectionOneOf(sections, sectionNames, label) {
  for (const sectionName of sectionNames) {
    const section = sections.get(sectionName);
    if (section) {
      return section;
    }
  }
  assert(
    false,
    `${label}: CSV missing one of ${sectionNames.join(", ")}`
  );
}

export function assertCsvEvidence(label, evidence) {
  assert(evidence?.text, `${label}: CSV text missing`);
  const data = evidence.dataCompleteness;
  assert(data, `${label}: CSV reference payload missing`);
  const sections = parseCsvSections(evidence.text);

  const pairSourceAttribution = requireCsvSection(
    sections,
    "# Pair source attribution",
    label
  );
  const pairSourceByField = new Map(
    pairSourceAttribution.rows.map((row) => [row.field, row.value])
  );
  assert(
    pairSourceByField.get("sourceTier") === data.pairSourceAttribution.sourceTier,
    `${label}: CSV pair source tier mismatch`
  );
  assert(
    pairSourceByField.get("evidenceKind") ===
      data.pairSourceAttribution.evidenceKind,
    `${label}: CSV pair source evidence kind mismatch`
  );
  assert(
    pairSourceByField.get("badgeLabel") === data.pairSourceAttribution.badgeLabel,
    `${label}: CSV pair source badge label mismatch`
  );
  assert(
    pairSourceByField.get("nonClaims") ===
      JSON.stringify(data.pairSourceAttribution.nonClaims),
    `${label}: CSV pair source non-claims mismatch`
  );

  const sourceManifest = requireCsvSectionOneOf(
    sections,
    ["# Orbit source manifest", "# TLE source manifest"],
    label
  );
  assert(
    sourceManifest.rows.length === data.tleSources.length,
    `${label}: CSV source manifest row count mismatch`
  );
  const sourcesById = new Map(sourceManifest.rows.map((row) => [row.sourceId, row]));
  for (const source of data.tleSources) {
    const row = sourcesById.get(source.sourceId);
    assert(row, `${label}: CSV missing source row ${source.sourceId}`);
    assert(row.sourcePath === source.sourcePath, `${label}: CSV source path mismatch`);
    assert(row.orbitClass === source.orbitClass, `${label}: CSV orbit class mismatch`);
    assert(row.format === source.format, `${label}: CSV source format mismatch`);
    assert(row.apiClass === source.apiClass, `${label}: CSV source API class mismatch`);
    assert(row.sourcePolicy === source.sourcePolicy, `${label}: CSV source policy mismatch`);
    assert(
      row.catalogNumberCompatibility === source.catalogNumberCompatibility,
      `${label}: CSV catalog compatibility mismatch`
    );
    assert(row.recordCount === csvCellValue(source.recordCount), `${label}: CSV record count mismatch`);
    assert(
      row.acceptedRecordCount === csvCellValue(source.acceptedRecordCount),
      `${label}: CSV accepted count mismatch`
    );
    assert(
      row.parserFailureCount === csvCellValue(source.parserFailureCount),
      `${label}: CSV parser failure count mismatch`
    );
    assert(
      row.excludedReasonCategories === source.excludedReasonCategories.join("|"),
      `${label}: CSV excluded reason mismatch`
    );
    assert(row.epochStartUtc === csvCellValue(source.epochStartUtc), `${label}: CSV epoch start mismatch`);
    assert(row.epochEndUtc === csvCellValue(source.epochEndUtc), `${label}: CSV epoch end mismatch`);
    assert(row.health === source.health, `${label}: CSV source health mismatch`);
    assert(row.sgp4ErrorCount === csvCellValue(source.sgp4ErrorCount), `${label}: CSV SGP4 count mismatch`);
    assert(
      row.noradIdRangeSummary === JSON.stringify(source.noradIdRangeSummary),
      `${label}: CSV NORAD summary mismatch`
    );
    assert(
      row.cosparDesignatorCount === csvCellValue(source.cosparDesignatorCount),
      `${label}: CSV COSPAR count mismatch`
    );
    assert(
      row.cosparDesignatorSamples === source.cosparDesignatorSamples.join("|"),
      `${label}: CSV COSPAR samples mismatch`
    );
    assert(
      row.classificationCounts === JSON.stringify(source.classificationCounts),
      `${label}: CSV classification counts mismatch`
    );
    assert(
      row.dragTermFieldCoverage === JSON.stringify(source.dragTermFieldCoverage),
      `${label}: CSV drag-term coverage mismatch`
    );
  }

  const tleFreshness = requireCsvSectionOneOf(
    sections,
    ["# Orbit source freshness", "# TLE freshness"],
    label
  );
  assert(
    tleFreshness.rows.length === data.tleFreshness.length,
    `${label}: CSV TLE freshness row count mismatch`
  );
  const freshnessBySource = new Map(
    tleFreshness.rows.map((row) => [row.sourceId, row])
  );
  for (const freshness of data.tleFreshness) {
    const row = freshnessBySource.get(freshness.provenance.sourceId);
    assert(row, `${label}: CSV missing TLE freshness ${freshness.provenance.sourceId}`);
    assert(row.sourceMode === freshness.sourceMode, `${label}: CSV TLE source mode mismatch`);
    assert(row.format === freshness.format, `${label}: CSV TLE format mismatch`);
    assert(row.apiClass === freshness.apiClass, `${label}: CSV TLE API class mismatch`);
    assert(row.sourcePolicy === freshness.sourcePolicy, `${label}: CSV TLE source policy mismatch`);
    assert(
      row.catalogNumberCompatibility === freshness.catalogNumberCompatibility,
      `${label}: CSV TLE catalog compatibility mismatch`
    );
    assert(
      row.snapshotFetchedUtc === csvCellValue(freshness.snapshotFetchedUtc),
      `${label}: CSV TLE snapshot fetched mismatch`
    );
    assert(row.snapshotPath === freshness.snapshotPath, `${label}: CSV TLE snapshot path mismatch`);
    assert(row.maxEpochUtc === csvCellValue(freshness.maxEpochUtc), `${label}: CSV TLE max epoch mismatch`);
    assert(
      row.noradIdRangeSummary === JSON.stringify(freshness.noradIdRangeSummary),
      `${label}: CSV TLE NORAD summary mismatch`
    );
    assert(
      row.constellationMembership === JSON.stringify(freshness.constellationMembership),
      `${label}: CSV TLE membership mismatch`
    );
    assert(
      row.provenanceTruthClass === freshness.provenance.truthClass,
      `${label}: CSV TLE freshness truth mismatch`
    );
    assert(
      row.provenanceSourceId === freshness.provenance.sourceId,
      `${label}: CSV TLE freshness source mismatch`
    );
    assert(
      row.provenanceNonClaim === csvCellValue(freshness.provenance.nonClaim),
      `${label}: CSV TLE freshness non-claim mismatch`
    );
  }

  const stationPrecision = requireCsvSection(sections, "# Station precision", label);
  assert(
    stationPrecision.rows.length === data.stationPrecision.length,
    `${label}: CSV station precision row count mismatch`
  );
  const stationsById = new Map(stationPrecision.rows.map((row) => [row.stationId, row]));
  for (const station of data.stationPrecision) {
    const row = stationsById.get(station.stationId);
    assert(row, `${label}: CSV missing station row ${station.stationId}`);
    assert(
      row.disclosurePrecision === station.disclosurePrecision,
      `${label}: CSV disclosure precision mismatch`
    );
    assert(row.rawLat === csvCellValue(station.rawLat), `${label}: CSV raw latitude mismatch`);
    assert(row.rawLon === csvCellValue(station.rawLon), `${label}: CSV raw longitude mismatch`);
    assert(
      row.provenanceTruthClass === station.provenance.truthClass,
      `${label}: CSV station provenance class mismatch`
    );
    assert(
      row.provenanceSourceId === station.provenance.sourceId,
      `${label}: CSV station provenance source mismatch`
    );
    assert(row.elevationM === csvCellValue(station.elevationM), `${label}: CSV station elevation mismatch`);
    assert(
      row.terrainMaskDeg === csvCellValue(station.terrainMaskDeg),
      `${label}: CSV station terrain mask mismatch`
    );
    assert(
      row.effectiveElevationThresholdDeg ===
        csvCellValue(station.effectiveElevationThresholdDeg),
      `${label}: CSV station effective threshold mismatch`
    );
    for (const field of ELEVATION_METADATA_FIELDS) {
      assert(
        row[field] === csvCellValue(station[field]),
        `${label}: CSV station ${field} mismatch`
      );
    }
    assert(
      row.terrainMaskSourceId === station.terrainMaskSourceId &&
        row.terrainMaskIsDefault === csvCellValue(station.terrainMaskIsDefault) &&
        row.terrainMaskNote === station.terrainMaskNote,
      `${label}: CSV station terrain mask source mismatch`
    );
    assert(
      row.coordinateSourceAuthority === station.coordinateSourceAuthority &&
        row.coordinateSourceUrl === csvCellValue(station.coordinateSourceUrl) &&
        row.coordinateSourceNote === station.coordinateSourceNote,
      `${label}: CSV station coordinate source authority mismatch`
    );
  }

  const actorProvenance = requireCsvSection(sections, "# Actor provenance", label);
  assert(
    actorProvenance.rows.length === data.actorProvenance.length,
    `${label}: CSV actor provenance row count mismatch`
  );
  const actorsById = new Map(actorProvenance.rows.map((row) => [row.satelliteId, row]));
  for (const actor of data.actorProvenance) {
    const row = actorsById.get(actor.satelliteId);
    assert(row, `${label}: CSV missing actor row ${actor.satelliteId}`);
    assert(row.orbitClass === actor.orbitClass, `${label}: CSV actor orbit class mismatch`);
    assert(row.sourceId === actor.sourceId, `${label}: CSV actor source mismatch`);
    assert(
      row.propagatedSampleCount === csvCellValue(actor.propagatedSampleCount),
      `${label}: CSV actor sample count mismatch`
    );
    assert(
      row.sampleCadenceSeconds === csvCellValue(actor.sampleCadenceSeconds),
      `${label}: CSV actor cadence mismatch`
    );
    assert(
      row.firstPropagatedUtc === csvCellValue(actor.firstPropagatedUtc),
      `${label}: CSV actor first sample mismatch`
    );
    assert(
      row.lastPropagatedUtc === csvCellValue(actor.lastPropagatedUtc),
      `${label}: CSV actor last sample mismatch`
    );
    assert(
      row.visibilityWindowCount === csvCellValue(actor.visibilityWindowCount),
      `${label}: CSV actor visibility count mismatch`
    );
    assert(
      row.provenanceTruthClass === actor.provenance.truthClass,
      `${label}: CSV actor provenance class mismatch`
    );
  }

  const visibilityProvenance = requireCsvSection(sections, "# Visibility provenance", label);
  assert(
    data.visibilityProvenance.length === evidence.visibilityWindowCount,
    `${label}: visibility provenance count mismatch`
  );
  assert(
    visibilityProvenance.rows.length === data.visibilityProvenance.length,
    `${label}: CSV visibility provenance row count mismatch`
  );
  const visibilityRowsByKey = new Map(
    visibilityProvenance.rows.map((row) => [
      `${row.satelliteId}|${row.intersectionStartUtc}|${row.intersectionEndUtc}`,
      row
    ])
  );
  for (const rowData of data.visibilityProvenance) {
    const key = `${rowData.satelliteId}|${rowData.intersectionStartUtc}|${rowData.intersectionEndUtc}`;
    const row = visibilityRowsByKey.get(key);
    assert(row, `${label}: CSV missing visibility row ${key}`);
    assert(row.orbitClass === rowData.orbitClass, `${label}: CSV visibility orbit class mismatch`);
    assert(row.sourceId === rowData.sourceId, `${label}: CSV visibility source mismatch`);
    assert(
      row.stationAWindowSource === rowData.stationAWindowSource,
      `${label}: CSV station A window source mismatch`
    );
    assert(
      row.stationBWindowSource === rowData.stationBWindowSource,
      `${label}: CSV station B window source mismatch`
    );
    assert(
      row.pairIntersectionSource === rowData.pairIntersectionSource,
      `${label}: CSV pair intersection source mismatch`
    );
    assert(
      row.elevationThresholdDeg === csvCellValue(rowData.elevationThresholdDeg),
      `${label}: CSV visibility elevation threshold mismatch`
    );
    assert(
      row.sampleCadenceSeconds === csvCellValue(rowData.sampleCadenceSeconds),
      `${label}: CSV visibility cadence mismatch`
    );
    assert(
      row.provenanceTruthClass === rowData.provenance.truthClass,
      `${label}: CSV visibility provenance class mismatch`
    );
  }

  const modeledOutputs = requireCsvSection(sections, "# Modeled outputs", label);
  assert(
    modeledOutputs.rows.length === data.modeledOutputs.length,
    `${label}: CSV modeled output row count mismatch`
  );
  const modeledOutputsByKind = new Map(modeledOutputs.rows.map((row) => [row.kind, row]));
  for (const output of data.modeledOutputs) {
    const row = modeledOutputsByKind.get(output.kind);
    assert(row, `${label}: CSV missing modeled output ${output.kind}`);
    assert(row.modelId === output.modelId, `${label}: CSV model id mismatch`);
    assert(row.inputSummary === JSON.stringify(output.inputSummary), `${label}: CSV input summary mismatch`);
    assert(
      row.provenanceTruthClass === output.provenance.truthClass,
      `${label}: CSV output provenance class mismatch`
    );
    assert(
      row.provenanceSourceId === output.provenance.sourceId,
      `${label}: CSV output provenance source mismatch`
    );
    assert(row.nonClaim === output.nonClaim, `${label}: CSV output non-claim mismatch`);
  }

  const rfChain = requireCsvSection(sections, "# RF chain breakdown", label);
  assert(
    rfChain.rows.length === data.rfChainBreakdown.terms.length,
    `${label}: CSV RF chain row count mismatch`
  );
  for (const [index, term] of data.rfChainBreakdown.terms.entries()) {
    const row = rfChain.rows[index];
    assert(row.termKind === term.kind, `${label}: CSV RF chain term mismatch`);
    assert(
      row.carrierBand === csvCellValue(data.rfChainBreakdown.carrierBand) &&
        row.carrierFrequencyGHz ===
          csvCellValue(data.rfChainBreakdown.carrierFrequencyGHz) &&
        row.receivedPowerProxyDbm ===
          csvCellValue(data.rfChainBreakdown.receivedPowerProxyDbm),
      `${label}: CSV RF chain carrier fields mismatch`
    );
    assert(
      row.contributionSignedDb === csvCellValue(term.contributionSignedDb),
      `${label}: CSV RF chain term contribution mismatch`
    );
    assert(row.modelId === term.modelId, `${label}: CSV RF chain model mismatch`);
    assert(
      row.standardsRef === term.standardsRef.join(" | "),
      `${label}: CSV RF chain standards mismatch`
    );
    assert(
      row.inputSummary === JSON.stringify(term.inputSummary),
      `${label}: CSV RF chain input summary mismatch`
    );
    assert(
      row.provenanceTruthClass === term.provenance.truthClass &&
        row.provenanceSourceId === term.provenance.sourceId &&
        row.provenanceModelId === csvCellValue(term.provenance.modelId) &&
        row.provenanceNonClaim === csvCellValue(term.provenance.nonClaim),
      `${label}: CSV RF chain provenance mismatch`
    );
    assert(row.nonClaim === term.nonClaim, `${label}: CSV RF chain non-claim mismatch`);
  }

  const atmosphericLookups = requireCsvSection(sections, "# Atmospheric lookups", label);
  assert(
    atmosphericLookups.rows.length === data.atmosphericLookups.length,
    `${label}: CSV atmospheric lookup row count mismatch`
  );
  const lookupRowsBySource = new Map(
    atmosphericLookups.rows.map((row) => [row.source, row])
  );
  for (const lookup of data.atmosphericLookups) {
    const row = lookupRowsBySource.get(lookup.source);
    assert(row, `${label}: CSV missing atmospheric lookup ${lookup.source}`);
    assert(row.midpointLatDeg === csvCellValue(lookup.midpointLatDeg), `${label}: CSV atmospheric midpoint lat mismatch`);
    assert(row.midpointLonDeg === csvCellValue(lookup.midpointLonDeg), `${label}: CSV atmospheric midpoint lon mismatch`);
    assert(row.cellLatDeg === csvCellValue(lookup.cellLatDeg), `${label}: CSV atmospheric cell lat mismatch`);
    assert(row.cellLonDeg === csvCellValue(lookup.cellLonDeg), `${label}: CSV atmospheric cell lon mismatch`);
    assert(row.lookupValue === csvCellValue(lookup.lookupValue), `${label}: CSV atmospheric value mismatch`);
    assert(row.lookupUnit === csvCellValue(lookup.lookupUnit), `${label}: CSV atmospheric unit mismatch`);
    assert(row.interpolation === lookup.interpolation, `${label}: CSV atmospheric interpolation mismatch`);
    assert(
      row.provenanceTruthClass === lookup.provenance.truthClass &&
        row.provenanceSourceId === lookup.provenance.sourceId &&
        row.provenanceModelId === csvCellValue(lookup.provenance.modelId) &&
        row.provenanceNonClaim === csvCellValue(lookup.provenance.nonClaim),
      `${label}: CSV atmospheric provenance mismatch`
    );
  }

  const stationRfProfiles = requireCsvSection(sections, "# Station RF profile", label);
  assert(
    stationRfProfiles.rows.length === data.stationRfProfiles.length,
    `${label}: CSV station RF profile row count mismatch`
  );
  const stationRfRowsById = new Map(
    stationRfProfiles.rows.map((row) => [row.stationId, row])
  );
  const precisionByIdForRf = new Map(
    data.stationPrecision.map((station) => [station.stationId, station])
  );
  for (const profile of data.stationRfProfiles) {
    const row = stationRfRowsById.get(profile.stationId);
    const precision = precisionByIdForRf.get(profile.stationId);
    assert(row, `${label}: CSV missing station RF profile ${profile.stationId}`);
    assert(precision, `${label}: CSV station RF profile ${profile.stationId} missing precision row`);
    assertElevationMetadataParity(
      label,
      profile,
      precision,
      `CSV station RF profile ${profile.stationId}`
    );
    assert(row.elevationM === csvCellValue(profile.elevationM), `${label}: CSV station RF elevation mismatch`);
    for (const field of ELEVATION_METADATA_FIELDS) {
      assert(
        row[field] === csvCellValue(profile[field]),
        `${label}: CSV station RF ${field} mismatch`
      );
    }
    assert(row.terrainMaskDeg === csvCellValue(profile.terrainMaskDeg), `${label}: CSV station RF terrain mismatch`);
    assert(row.terrainMaskSourceId === profile.terrainMaskSourceId, `${label}: CSV station RF terrain source mismatch`);
    assert(
      row.terrainMaskIsDefault === csvCellValue(profile.terrainMaskIsDefault),
      `${label}: CSV station RF terrain default mismatch`
    );
    assert(row.antennaDiameterM === csvCellValue(profile.antennaDiameterM), `${label}: CSV station RF antenna mismatch`);
    assert(row.antennaDiameterSourceId === profile.antennaDiameterSourceId, `${label}: CSV station RF antenna source mismatch`);
    assert(row.peakEirpDbm === csvCellValue(profile.peakEirpDbm), `${label}: CSV station RF EIRP mismatch`);
    assert(row.peakEirpSourceId === profile.peakEirpSourceId, `${label}: CSV station RF EIRP source mismatch`);
    assert(row.txPolarization === csvCellValue(profile.txPolarization), `${label}: CSV station RF polarization mismatch`);
    assert(row.txPolarizationSourceId === profile.txPolarizationSourceId, `${label}: CSV station RF polarization source mismatch`);
    assert(
      row.provenanceTruthClass === profile.provenance.truthClass &&
        row.provenanceSourceId === profile.provenance.sourceId &&
        row.provenanceNonClaim === csvCellValue(profile.provenance.nonClaim),
      `${label}: CSV station RF provenance mismatch`
    );
  }

  const displayTransforms = requireCsvSection(sections, "# Display transforms", label);
  assert(
    displayTransforms.rows.length === data.displayTransforms.length,
    `${label}: CSV display transform row count mismatch`
  );
  const transformsBySourceId = new Map(displayTransforms.rows.map((row) => [row.sourceId, row]));
  for (const transform of data.displayTransforms) {
    const row = transformsBySourceId.get(transform.sourceId);
    assert(row, `${label}: CSV missing display transform ${transform.sourceId}`);
    assert(
      row.provenanceTruthClass === transform.truthClass,
      `${label}: CSV display transform truth class mismatch`
    );
    assert(
      row.inputSummary === JSON.stringify(transform.inputSummary),
      `${label}: CSV display transform input summary mismatch`
    );
  }

  const capDisclosure = requireCsvSection(sections, "# Cap disclosure", label);
  assert(
    capDisclosure.rows.length === CSV_ORBIT_DISPLAY_ORDER.length,
    `${label}: CSV cap disclosure row count mismatch`
  );
  const capRowsByOrbit = new Map(capDisclosure.rows.map((row) => [row.orbitClass, row]));
  for (const orbit of CSV_ORBIT_DISPLAY_ORDER) {
    const row = capRowsByOrbit.get(orbit);
    assert(row, `${label}: CSV missing cap disclosure row ${orbit}`);
    assert(
      row.perOrbitCap === csvCellValue(data.capDisclosure.perOrbitCap[orbit]),
      `${label}: CSV ${orbit} cap disclosure cap mismatch`
    );
    assert(
      row.perOrbitInventory ===
        csvCellValue(data.capDisclosure.perOrbitInventory[orbit]),
      `${label}: CSV ${orbit} cap disclosure inventory mismatch`
    );
    assert(
      row.cappedAtRuntime === csvCellValue(data.capDisclosure.cappedAtRuntime[orbit]),
      `${label}: CSV ${orbit} cap disclosure capped flag mismatch`
    );
  }

  const runtimeInventory = requireCsvSection(
    sections,
    "# Runtime inventory disclosure",
    label
  );
  assert(
    runtimeInventory.rows.length === CSV_ORBIT_DISPLAY_ORDER.length,
    `${label}: CSV runtime inventory row count mismatch`
  );
  const inventoryRowsByOrbit = new Map(
    runtimeInventory.rows.map((row) => [row.orbitClass, row])
  );
  for (const orbit of CSV_ORBIT_DISPLAY_ORDER) {
    const row = inventoryRowsByOrbit.get(orbit);
    const disclosure = data.runtimeInventoryDisclosure.perOrbit[orbit];
    assert(row, `${label}: CSV missing runtime inventory row ${orbit}`);
    assert(
      row.inventorySourceMode === disclosure.inventorySourceMode,
      `${label}: CSV ${orbit} runtime inventory source mode mismatch`
    );
    assert(
      row.networkSnapshotInventoryCount ===
        csvCellValue(disclosure.networkSnapshotInventoryCount),
      `${label}: CSV ${orbit} network inventory mismatch`
    );
    assert(
      row.localFallbackInventoryCount ===
        csvCellValue(disclosure.localFallbackInventoryCount),
      `${label}: CSV ${orbit} local fallback inventory mismatch`
    );
    assert(
      row.localFallbackInventoryNote === disclosure.localFallbackInventoryNote,
      `${label}: CSV ${orbit} local fallback note mismatch`
    );
    assert(
      row.activeInventoryCount === csvCellValue(disclosure.activeInventoryCount),
      `${label}: CSV ${orbit} active inventory mismatch`
    );
    assert(
      row.acceptedRecordCount === csvCellValue(disclosure.acceptedRecordCount),
      `${label}: CSV ${orbit} accepted count mismatch`
    );
    assert(
      row.runtimeCap === csvCellValue(disclosure.runtimeCap),
      `${label}: CSV ${orbit} runtime cap mismatch`
    );
    assert(
      row.cappedAtRuntime === csvCellValue(disclosure.cappedAtRuntime),
      `${label}: CSV ${orbit} runtime capped flag mismatch`
    );
    assert(
      row.visibleActorCount === csvCellValue(disclosure.visibleActorCount),
      `${label}: CSV ${orbit} visible actor mismatch`
    );
  }

  const metricAnchors = requireCsvSection(
    sections,
    "# Metric anchor disclosure",
    label
  );
  const metricAnchorByField = new Map(
    metricAnchors.rows.map((row) => [row.field, row.value])
  );
  for (const [key, expected] of Object.entries(EXPECTED_METRIC_ANCHORS)) {
    assert(
      metricAnchorByField.get(key) === expected &&
        data.metricAnchorDisclosure[key] === expected,
      `${label}: CSV metric anchor ${key} mismatch`
    );
  }
  assert(
    metricAnchorByField.get("activePolicyId") ===
      data.metricAnchorDisclosure.activePolicyId,
    `${label}: CSV metric anchor policy mismatch`
  );
  assert(
    metricAnchorByField.get("policyThresholds") ===
      JSON.stringify(data.metricAnchorDisclosure.policyThresholds),
    `${label}: CSV metric anchor threshold mismatch`
  );
  assert(
    metricAnchorByField.get("nonClaim") === data.metricAnchorDisclosure.nonClaim,
    `${label}: CSV metric anchor non-claim mismatch`
  );

  const policyDisclosure = requireCsvSection(sections, "# Policy disclosure", label);
  assert(
    policyDisclosure.rows.length === CSV_POLICY_DISCLOSURE_THRESHOLD_ORDER.length,
    `${label}: CSV policy disclosure row count mismatch`
  );
  const policyRowsByThreshold = new Map(
    policyDisclosure.rows.map((row) => [row.thresholdKey, row])
  );
  for (const thresholdKey of CSV_POLICY_DISCLOSURE_THRESHOLD_ORDER) {
    const row = policyRowsByThreshold.get(thresholdKey);
    const source = data.policyDisclosure.thresholdSources[thresholdKey];
    assert(row, `${label}: CSV missing policy disclosure row ${thresholdKey}`);
    assert(
      row.activePolicyId === data.policyDisclosure.activePolicyId,
      `${label}: CSV policy disclosure active policy mismatch`
    );
    assert(
      row.thresholdValue ===
        csvCellValue(data.policyDisclosure.thresholds[thresholdKey]),
      `${label}: CSV policy disclosure ${thresholdKey} value mismatch`
    );
    assert(
      row.sourceTruthClass === source.truthClass,
      `${label}: CSV policy disclosure ${thresholdKey} source truth mismatch`
    );
    assert(
      row.sourceId === source.sourceId,
      `${label}: CSV policy disclosure ${thresholdKey} source id mismatch`
    );
    assert(
      row.sourceModelId === csvCellValue(source.modelId),
      `${label}: CSV policy disclosure ${thresholdKey} source model mismatch`
    );
    assert(
      row.sourceNonClaim === csvCellValue(source.nonClaim),
      `${label}: CSV policy disclosure ${thresholdKey} source non-claim mismatch`
    );
  }

  const dataCompleteness = requireCsvSection(sections, "# Data completeness", label);
  const summaryByField = new Map(dataCompleteness.rows.map((row) => [row.field, row.value]));
  assert(
    summaryByField.get("fakeActorCount") === csvCellValue(data.actorSourceCoverage.fakeActorCount),
    `${label}: CSV fake actor count mismatch`
  );
  assert(
    summaryByField.get("visibilityCadenceSecondsByOrbit") ===
      JSON.stringify(data.visibilityCadenceSecondsByOrbit),
    `${label}: CSV cadence summary mismatch`
  );
  assert(
    summaryByField.get("capDisclosure") === JSON.stringify(data.capDisclosure),
    `${label}: CSV cap disclosure summary mismatch`
  );
  assert(
    summaryByField.get("pairSourceAttribution") ===
      JSON.stringify(data.pairSourceAttribution),
    `${label}: CSV pair source summary mismatch`
  );
  assert(
    summaryByField.get("runtimeInventoryDisclosure") ===
      JSON.stringify(data.runtimeInventoryDisclosure),
    `${label}: CSV runtime inventory summary mismatch`
  );
  assert(
    summaryByField.get("metricAnchorDisclosure") ===
      JSON.stringify(data.metricAnchorDisclosure),
    `${label}: CSV metric anchor summary mismatch`
  );
  assert(
    summaryByField.get("activePolicyId") === data.policyDisclosure.activePolicyId,
    `${label}: CSV active policy summary mismatch`
  );
  assert(
    summaryByField.get("policyDisclosureThresholds") ===
      JSON.stringify(data.policyDisclosure.thresholds),
    `${label}: CSV policy thresholds summary mismatch`
  );
  assert(
    summaryByField.get("rfChainTermCount") ===
      csvCellValue(data.rfChainBreakdown.terms.length),
    `${label}: CSV RF chain term summary mismatch`
  );
  assert(
    summaryByField.get("atmosphericLookupCount") ===
      csvCellValue(data.atmosphericLookups.length),
    `${label}: CSV atmospheric lookup summary mismatch`
  );
  assert(
    summaryByField.get("stationRfProfileCount") ===
      csvCellValue(data.stationRfProfiles.length),
    `${label}: CSV station RF profile summary mismatch`
  );
  assert(
    summaryByField.get("emptyReasonCode") === csvCellValue(data.emptyReasonCode),
    `${label}: CSV empty reason mismatch`
  );
  assert(
    evidence.defaultWindowDurationMinutes === 360,
    `${label}: buildDefaultTimeWindow default should be 360 minutes`
  );
}

