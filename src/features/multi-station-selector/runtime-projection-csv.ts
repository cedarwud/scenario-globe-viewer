import type { RuntimeProjectionResult } from "./runtime-projection";

// R1-F5 statistics report CSV export; kept DOM-free for panel downloads.
type CsvCell = string | number | null | undefined;

const CSV_LINE_ENDING = "\r\n";
const ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"] as const;
const POLICY_DISCLOSURE_THRESHOLD_ORDER = [
  "latencyBudgetMs",
  "hysteresisDb",
  "minVisibilityWindowMs",
  "elevationThresholdDeg"
] as const;

function quoteCsvCell(value: CsvCell): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function serializeCsvRows(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  return rows.map((row) => row.map(quoteCsvCell).join(",")).join(CSV_LINE_ENDING);
}

function durationMs(startUtc: string, endUtc: string): number | string {
  const startMs = Date.parse(startUtc);
  const endMs = Date.parse(endUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return "";
  }
  return Math.max(0, endMs - startMs);
}

function sanitizeFilenameSegment(segment: string): string {
  const sanitized = segment.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "unknown";
}

function compactUtcForFilename(utc: string): string {
  const parsedMs = Date.parse(utc);
  const normalized = Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : utc;
  return sanitizeFilenameSegment(
    normalized.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  );
}

export function buildRuntimeProjectionCsv(result: RuntimeProjectionResult): string {
  const pairSourceAttribution = result.dataCompleteness.pairSourceAttribution;
  const rows: CsvCell[][] = [
    ["# Runtime projection"],
    ["field", "value"],
    ["stationAName", result.pair.stationA.name],
    ["stationAId", result.pair.stationA.id],
    ["stationBName", result.pair.stationB.name],
    ["stationBId", result.pair.stationB.id],
    ["timeWindowStartUtc", result.timeWindow.startUtc],
    ["timeWindowEndUtc", result.timeWindow.endUtc],
    [
      "timeWindowDurationMs",
      durationMs(result.timeWindow.startUtc, result.timeWindow.endUtc)
    ],
    ["sharedSupportedOrbits", result.sharedSupportedOrbits.join("/")],
    ["sourceTier", pairSourceAttribution.sourceTier],
    ["sourceEvidenceKind", pairSourceAttribution.evidenceKind],
    ["sourceBadgeLabel", pairSourceAttribution.badgeLabel],
    ["precisionLabel", result.truthBoundary.precisionLabel],
    [],
    ["# Communication stats"],
    ["metric", "value"],
    ["totalCommunicatingMs", result.communicationStats.totalCommunicatingMs],
    ["handoverCount", result.communicationStats.handoverCount],
    ["meanLinkDwellMs", result.communicationStats.meanLinkDwellMs]
  ];

  for (const orbitClass of ORBIT_DISPLAY_ORDER) {
    rows.push([
      `${orbitClass.toLowerCase()}CommunicatingMs`,
      result.communicationStats.byOrbit[orbitClass]
    ]);
  }

  rows.push(
    [],
    ["# Visibility windows"],
    [
      "satelliteId",
      "orbitClass",
      "intersectionStartUtc",
      "intersectionEndUtc",
      "durationMs"
    ]
  );

  for (const window of result.visibilityWindows) {
    rows.push([
      window.satelliteId,
      window.orbitClass,
      window.intersectionStartUtc,
      window.intersectionEndUtc,
      durationMs(window.intersectionStartUtc, window.intersectionEndUtc)
    ]);
  }

  rows.push(
    [],
    ["# Link selection events"],
    ["handoverAtUtc", "fromSatelliteId", "toSatelliteId", "reasonKind"]
  );

  for (const event of result.handoverEvents) {
    rows.push([
      event.handoverAtUtc,
      event.fromSatelliteId,
      event.toSatelliteId,
      event.reasonKind
    ]);
  }

  rows.push([], ["# Non-claims"], ["nonClaim"]);

  for (const nonClaim of result.truthBoundary.nonClaims) {
    rows.push([nonClaim]);
  }

  rows.push(
    [],
    ["# Pair source attribution"],
    ["field", "value"],
    ["sourceTier", pairSourceAttribution.sourceTier],
    ["evidenceKind", pairSourceAttribution.evidenceKind],
    ["badgeLabel", pairSourceAttribution.badgeLabel],
    ["nonClaims", JSON.stringify(pairSourceAttribution.nonClaims)]
  );

  rows.push(
    [],
    ["# TLE source manifest"],
    [
      "sourceId",
      "sourcePath",
      "orbitClass",
      "recordCount",
      "acceptedRecordCount",
      "rejectedRecordCount",
      "parserFailureCount",
      "capApplied",
      "excludedReasonCategories",
      "epochStartUtc",
      "epochEndUtc",
      "sourceTimestampUtc",
      "healthThresholdDays",
      "health",
      "sgp4ErrorCount",
      "noradIdRangeSummary",
      "cosparDesignatorCount",
      "cosparDesignatorSamples",
      "classificationCounts",
      "dragTermFieldCoverage"
    ]
  );
  for (const source of result.dataCompleteness.tleSources) {
    rows.push([
      source.sourceId,
      source.sourcePath,
      source.orbitClass,
      source.recordCount,
      source.acceptedRecordCount,
      source.rejectedRecordCount,
      source.parserFailureCount,
      source.capApplied,
      source.excludedReasonCategories.join("|"),
      source.epochStartUtc,
      source.epochEndUtc,
      source.sourceTimestampUtc,
      source.healthThresholdDays,
      source.health,
      source.sgp4ErrorCount,
      JSON.stringify(source.noradIdRangeSummary),
      source.cosparDesignatorCount,
      source.cosparDesignatorSamples.join("|"),
      JSON.stringify(source.classificationCounts),
      JSON.stringify(source.dragTermFieldCoverage)
    ]);
  }

  rows.push(
    [],
    ["# TLE freshness"],
    [
      "sourceId",
      "sourceMode",
      "snapshotFetchedUtc",
      "snapshotPath",
      "maxEpochUtc",
      "noradIdRangeSummary",
      "constellationMembership",
      "provenanceTruthClass",
      "provenanceSourceId",
      "provenanceNonClaim"
    ]
  );
  for (const freshness of result.dataCompleteness.tleFreshness) {
    rows.push([
      freshness.provenance.sourceId,
      freshness.sourceMode,
      freshness.snapshotFetchedUtc,
      freshness.snapshotPath,
      freshness.maxEpochUtc,
      JSON.stringify(freshness.noradIdRangeSummary),
      JSON.stringify(freshness.constellationMembership),
      freshness.provenance.truthClass,
      freshness.provenance.sourceId,
      freshness.provenance.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# Station precision"],
    [
      "stationId",
      "disclosurePrecision",
      "sourceTier",
      "rawLat",
      "rawLon",
      "renderPositionIsSourceTruth",
      "coordinateUse",
      "provenanceTruthClass",
      "provenanceSourceId",
      "elevationM",
      "terrainMaskDeg",
      "effectiveElevationThresholdDeg",
      "elevationSourceId",
      "elevationSourcePath",
      "elevationSourceNote",
      "terrainMaskSourceId",
      "terrainMaskIsDefault",
      "terrainMaskNote"
    ]
  );
  for (const station of result.dataCompleteness.stationPrecision) {
    rows.push([
      station.stationId,
      station.disclosurePrecision,
      station.sourceTier,
      station.rawLat,
      station.rawLon,
      station.renderPositionIsSourceTruth ? "true" : "false",
      station.coordinateUse,
      station.provenance.truthClass,
      station.provenance.sourceId,
      station.elevationM,
      station.terrainMaskDeg,
      station.effectiveElevationThresholdDeg,
      station.elevationSourceId,
      station.elevationSourcePath,
      station.elevationSourceNote,
      station.terrainMaskSourceId,
      station.terrainMaskIsDefault ? "true" : "false",
      station.terrainMaskNote
    ]);
  }

  rows.push(
    [],
    ["# Actor provenance"],
    [
      "satelliteId",
      "orbitClass",
      "sourceId",
      "propagatedSampleCount",
      "sampleCadenceSeconds",
      "firstPropagatedUtc",
      "lastPropagatedUtc",
      "visibilityWindowCount",
      "provenanceTruthClass"
    ]
  );
  for (const actor of result.dataCompleteness.actorProvenance) {
    rows.push([
      actor.satelliteId,
      actor.orbitClass,
      actor.sourceId,
      actor.propagatedSampleCount,
      actor.sampleCadenceSeconds,
      actor.firstPropagatedUtc,
      actor.lastPropagatedUtc,
      actor.visibilityWindowCount,
      actor.provenance.truthClass
    ]);
  }

  rows.push(
    [],
    ["# Visibility provenance"],
    [
      "satelliteId",
      "orbitClass",
      "sourceId",
      "stationAWindowSource",
      "stationBWindowSource",
      "pairIntersectionSource",
      "elevationThresholdDeg",
      "sampleCadenceSeconds",
      "intersectionStartUtc",
      "intersectionEndUtc",
      "provenanceTruthClass"
    ]
  );
  for (const row of result.dataCompleteness.visibilityProvenance) {
    rows.push([
      row.satelliteId,
      row.orbitClass,
      row.sourceId,
      row.stationAWindowSource,
      row.stationBWindowSource,
      row.pairIntersectionSource,
      row.elevationThresholdDeg,
      row.sampleCadenceSeconds,
      row.intersectionStartUtc,
      row.intersectionEndUtc,
      row.provenance.truthClass
    ]);
  }

  rows.push(
    [],
    ["# Modeled outputs"],
    [
      "kind",
      "modelId",
      "standardsRef",
      "inputSummary",
      "outputUnit",
      "rainRateControlMode",
      "provenanceTruthClass",
      "provenanceSourceId",
      "provenanceModelId",
      "nonClaim"
    ]
  );
  for (const output of result.dataCompleteness.modeledOutputs) {
    rows.push([
      output.kind,
      output.modelId,
      output.standardsRef.join(" | "),
      JSON.stringify(output.inputSummary),
      output.outputUnit,
      output.rainRateControlMode,
      output.provenance.truthClass,
      output.provenance.sourceId,
      output.provenance.modelId,
      output.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# RF chain breakdown"],
    [
      "carrierBand",
      "carrierFrequencyGHz",
      "receivedPowerProxyDbm",
      "termKind",
      "contributionSignedDb",
      "modelId",
      "standardsRef",
      "inputSummary",
      "provenanceTruthClass",
      "provenanceSourceId",
      "provenanceModelId",
      "provenanceNonClaim",
      "nonClaim"
    ]
  );
  for (const term of result.dataCompleteness.rfChainBreakdown.terms) {
    rows.push([
      result.dataCompleteness.rfChainBreakdown.carrierBand,
      result.dataCompleteness.rfChainBreakdown.carrierFrequencyGHz,
      result.dataCompleteness.rfChainBreakdown.receivedPowerProxyDbm,
      term.kind,
      term.contributionSignedDb,
      term.modelId,
      term.standardsRef.join(" | "),
      JSON.stringify(term.inputSummary),
      term.provenance.truthClass,
      term.provenance.sourceId,
      term.provenance.modelId,
      term.provenance.nonClaim,
      term.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# Atmospheric lookups"],
    [
      "source",
      "midpointLatDeg",
      "midpointLonDeg",
      "cellLatDeg",
      "cellLonDeg",
      "lookupValue",
      "lookupUnit",
      "interpolation",
      "provenanceTruthClass",
      "provenanceSourceId",
      "provenanceModelId",
      "provenanceNonClaim"
    ]
  );
  for (const lookup of result.dataCompleteness.atmosphericLookups) {
    rows.push([
      lookup.source,
      lookup.midpointLatDeg,
      lookup.midpointLonDeg,
      lookup.cellLatDeg,
      lookup.cellLonDeg,
      lookup.lookupValue,
      lookup.lookupUnit,
      lookup.interpolation,
      lookup.provenance.truthClass,
      lookup.provenance.sourceId,
      lookup.provenance.modelId,
      lookup.provenance.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# Station RF profile"],
    [
      "stationId",
      "elevationM",
      "elevationSourceId",
      "elevationSourcePath",
      "terrainMaskDeg",
      "terrainMaskSourceId",
      "terrainMaskIsDefault",
      "antennaDiameterM",
      "antennaDiameterSourceId",
      "peakEirpDbm",
      "peakEirpSourceId",
      "txPolarization",
      "txPolarizationSourceId",
      "provenanceTruthClass",
      "provenanceSourceId",
      "provenanceNonClaim"
    ]
  );
  for (const station of result.dataCompleteness.stationRfProfiles) {
    rows.push([
      station.stationId,
      station.elevationM,
      station.elevationSourceId,
      station.elevationSourcePath,
      station.terrainMaskDeg,
      station.terrainMaskSourceId,
      station.terrainMaskIsDefault ? "true" : "false",
      station.antennaDiameterM,
      station.antennaDiameterSourceId,
      station.peakEirpDbm,
      station.peakEirpSourceId,
      station.txPolarization,
      station.txPolarizationSourceId,
      station.provenance.truthClass,
      station.provenance.sourceId,
      station.provenance.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# Display transforms"],
    [
      "sourceId",
      "provenanceTruthClass",
      "provenanceModelId",
      "inputSummary",
      "nonClaim"
    ]
  );
  for (const transform of result.dataCompleteness.displayTransforms) {
    rows.push([
      transform.sourceId,
      transform.truthClass,
      transform.modelId,
      JSON.stringify(transform.inputSummary),
      transform.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# Cap disclosure"],
    ["orbitClass", "perOrbitCap", "perOrbitInventory", "cappedAtRuntime"]
  );
  for (const orbitClass of ORBIT_DISPLAY_ORDER) {
    const disclosure = result.dataCompleteness.capDisclosure;
    rows.push([
      orbitClass,
      disclosure.perOrbitCap[orbitClass],
      disclosure.perOrbitInventory[orbitClass],
      disclosure.cappedAtRuntime[orbitClass] ? "true" : "false"
    ]);
  }

  rows.push(
    [],
    ["# Runtime inventory disclosure"],
    [
      "orbitClass",
      "inventorySourceMode",
      "networkSnapshotInventoryCount",
      "localFallbackInventoryCount",
      "localFallbackInventoryNote",
      "activeInventoryCount",
      "acceptedRecordCount",
      "runtimeCap",
      "cappedAtRuntime",
      "visibleActorCount"
    ]
  );
  for (const orbitClass of ORBIT_DISPLAY_ORDER) {
    const disclosure =
      result.dataCompleteness.runtimeInventoryDisclosure.perOrbit[orbitClass];
    rows.push([
      orbitClass,
      disclosure.inventorySourceMode,
      disclosure.networkSnapshotInventoryCount,
      disclosure.localFallbackInventoryCount,
      disclosure.localFallbackInventoryNote,
      disclosure.activeInventoryCount,
      disclosure.acceptedRecordCount,
      disclosure.runtimeCap,
      disclosure.cappedAtRuntime ? "true" : "false",
      disclosure.visibleActorCount
    ]);
  }

  rows.push(
    [],
    ["# Metric anchor disclosure"],
    ["field", "value"],
    [
      "carrierSelection",
      result.dataCompleteness.metricAnchorDisclosure.carrierSelection
    ],
    ["capacityModel", result.dataCompleteness.metricAnchorDisclosure.capacityModel],
    ["jitterModel", result.dataCompleteness.metricAnchorDisclosure.jitterModel],
    ["delayModel", result.dataCompleteness.metricAnchorDisclosure.delayModel],
    [
      "activePolicyId",
      result.dataCompleteness.metricAnchorDisclosure.activePolicyId
    ],
    [
      "policyThresholds",
      JSON.stringify(result.dataCompleteness.metricAnchorDisclosure.policyThresholds)
    ],
    ["nonClaim", result.dataCompleteness.metricAnchorDisclosure.nonClaim]
  );

  rows.push(
    [],
    ["# Policy disclosure"],
    [
      "activePolicyId",
      "thresholdKey",
      "thresholdValue",
      "sourceTruthClass",
      "sourceId",
      "sourceModelId",
      "sourceNonClaim"
    ]
  );
  for (const thresholdKey of POLICY_DISCLOSURE_THRESHOLD_ORDER) {
    const disclosure = result.dataCompleteness.policyDisclosure;
    const source = disclosure.thresholdSources[thresholdKey];
    rows.push([
      disclosure.activePolicyId,
      thresholdKey,
      disclosure.thresholds[thresholdKey],
      source.truthClass,
      source.sourceId,
      source.modelId,
      source.nonClaim
    ]);
  }

  rows.push(
    [],
    ["# Data completeness"],
    ["field", "value"],
    ["routeMode", result.dataCompleteness.routeMode],
    ["fakeActorCount", result.dataCompleteness.actorSourceCoverage.fakeActorCount],
    [
      "visibilityCadenceSecondsByOrbit",
      JSON.stringify(result.dataCompleteness.visibilityCadenceSecondsByOrbit)
    ],
    ["capDisclosure", JSON.stringify(result.dataCompleteness.capDisclosure)],
    [
      "pairSourceAttribution",
      JSON.stringify(result.dataCompleteness.pairSourceAttribution)
    ],
    [
      "runtimeInventoryDisclosure",
      JSON.stringify(result.dataCompleteness.runtimeInventoryDisclosure)
    ],
    [
      "metricAnchorDisclosure",
      JSON.stringify(result.dataCompleteness.metricAnchorDisclosure)
    ],
    ["activePolicyId", result.dataCompleteness.policyDisclosure.activePolicyId],
    [
      "policyDisclosureThresholds",
      JSON.stringify(result.dataCompleteness.policyDisclosure.thresholds)
    ],
    [
      "rfChainTermCount",
      result.dataCompleteness.rfChainBreakdown.terms.length
    ],
    [
      "atmosphericLookupCount",
      result.dataCompleteness.atmosphericLookups.length
    ],
    [
      "stationRfProfileCount",
      result.dataCompleteness.stationRfProfiles.length
    ],
    ["emptyReasonCode", result.dataCompleteness.emptyReasonCode]
  );

  return serializeCsvRows(rows);
}

export function buildRuntimeProjectionCsvFilename(
  result: RuntimeProjectionResult
): string {
  const stationAId = sanitizeFilenameSegment(result.pair.stationA.id);
  const stationBId = sanitizeFilenameSegment(result.pair.stationB.id);
  const startUtc = compactUtcForFilename(result.timeWindow.startUtc);
  const durationValue = durationMs(
    result.timeWindow.startUtc,
    result.timeWindow.endUtc
  );
  const durationMinutes =
    typeof durationValue === "number"
      ? Math.round(durationValue / 60_000)
      : "unknown";
  return `runtime-projection-${stationAId}-${stationBId}-${startUtc}-${durationMinutes}m.csv`;
}
