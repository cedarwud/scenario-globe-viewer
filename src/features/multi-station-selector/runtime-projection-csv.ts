import type { RuntimeProjectionResult } from "./runtime-projection";

// R1-F5 statistics report CSV export; kept DOM-free for panel downloads.
type CsvCell = string | number | null | undefined;

const CSV_LINE_ENDING = "\r\n";
const ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"] as const;

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
    ["sourceTier", result.truthBoundary.sourceTier],
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
      "effectiveElevationThresholdDeg"
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
      station.effectiveElevationThresholdDeg
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
    ["# Data completeness"],
    ["field", "value"],
    ["routeMode", result.dataCompleteness.routeMode],
    ["fakeActorCount", result.dataCompleteness.actorSourceCoverage.fakeActorCount],
    [
      "visibilityCadenceSecondsByOrbit",
      JSON.stringify(result.dataCompleteness.visibilityCadenceSecondsByOrbit)
    ],
    ["capDisclosure", JSON.stringify(result.dataCompleteness.capDisclosure)],
    ["activePolicyId", result.dataCompleteness.policyDisclosure.activePolicyId],
    [
      "policyDisclosureThresholds",
      JSON.stringify(result.dataCompleteness.policyDisclosure.thresholds)
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
