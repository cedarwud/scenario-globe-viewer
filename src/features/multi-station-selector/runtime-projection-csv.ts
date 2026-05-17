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
    ["# Handover events"],
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

  return serializeCsvRows(rows);
}

export function buildRuntimeProjectionCsvFilename(
  result: RuntimeProjectionResult
): string {
  const stationAId = sanitizeFilenameSegment(result.pair.stationA.id);
  const stationBId = sanitizeFilenameSegment(result.pair.stationB.id);
  const startUtc = compactUtcForFilename(result.timeWindow.startUtc);
  return `runtime-projection-${stationAId}-${stationBId}-${startUtc}.csv`;
}
