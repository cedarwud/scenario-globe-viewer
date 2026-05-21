import { json2satrec } from "../../vendor/satellite-js-runtime";
import {
  parseTleRecordMetadata,
  type OrbitClass,
  type TleRecord
} from "./visibility-utils";
import type {
  RuntimeNoradIdRangeSummary,
  RuntimeTleDragTermFieldCoverage
} from "./runtime-data-completeness";

export type OrbitSourceFormat = "tle-3le" | "omm-json" | "omm-csv";
export type OrbitSourceApiClass = "celestrak-gp-tle" | "celestrak-gp";
export type OrbitSourcePolicy =
  | "bundled-snapshot"
  | "refresh-artifact"
  | "fallback-local-snapshot";
export type CatalogNumberCompatibility =
  | "tle-limited-5-digit-catalog"
  | "omm-nine-digit-catalog-capable";

export interface OrbitSourceMetadata {
  readonly format: OrbitSourceFormat;
  readonly apiClass: OrbitSourceApiClass;
  readonly sourcePolicy: OrbitSourcePolicy;
  readonly catalogNumberCompatibility: CatalogNumberCompatibility;
}

export interface OrbitSourceRecord {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly format: OrbitSourceFormat;
  readonly noradCatalogId: number | null;
  readonly classification: string | null;
  readonly cosparDesignator: string | null;
  readonly epochUtc: string | null;
  readonly meanMotionFirstDerivative: number | null;
  readonly meanMotionFirstDerivativeRaw: string | null;
  readonly meanMotionSecondDerivative: number | null;
  readonly meanMotionSecondDerivativeRaw: string | null;
  readonly bstarDragTerm: number | null;
  readonly bstarDragTermRaw: string | null;
  readonly tleLine1?: string;
  readonly tleLine2?: string;
}

export interface OrbitSourceParseStats extends OrbitSourceMetadata {
  readonly rawRecordGroupCount: number;
  readonly parsedRecordCount: number;
  readonly parserFailureCount: number;
  readonly noradIdRangeSummary: ReadonlyArray<RuntimeNoradIdRangeSummary>;
  readonly cosparDesignatorCount: number;
  readonly cosparDesignatorSamples: ReadonlyArray<string>;
  readonly classificationCounts: Readonly<Record<string, number>>;
  readonly dragTermFieldCoverage: RuntimeTleDragTermFieldCoverage;
}

export interface ParsedOrbitSource extends OrbitSourceMetadata {
  readonly records: ReadonlyArray<OrbitSourceRecord>;
  readonly stats: OrbitSourceParseStats;
}

interface ParseOptions {
  readonly orbitClass: OrbitClass;
  readonly format?: OrbitSourceFormat;
  readonly sourcePolicy?: OrbitSourcePolicy;
}

type OmmRow = Record<string, unknown>;

const FORMAT_METADATA: Readonly<
  Record<OrbitSourceFormat, Pick<OrbitSourceMetadata, "apiClass" | "catalogNumberCompatibility">>
> = {
  "tle-3le": {
    apiClass: "celestrak-gp-tle",
    catalogNumberCompatibility: "tle-limited-5-digit-catalog"
  },
  "omm-json": {
    apiClass: "celestrak-gp",
    catalogNumberCompatibility: "omm-nine-digit-catalog-capable"
  },
  "omm-csv": {
    apiClass: "celestrak-gp",
    catalogNumberCompatibility: "omm-nine-digit-catalog-capable"
  }
};

function metadataFor(
  format: OrbitSourceFormat,
  sourcePolicy: OrbitSourcePolicy = "bundled-snapshot"
): OrbitSourceMetadata {
  return { format, sourcePolicy, ...FORMAT_METADATA[format] };
}

function summarizeNoradIds(
  ids: ReadonlyArray<number>
): ReadonlyArray<RuntimeNoradIdRangeSummary> {
  const sorted = ids.slice().sort((left, right) => left - right);
  if (sorted.length === 0) return [];
  const ranges: RuntimeNoradIdRangeSummary[] = [];
  let start = sorted[0];
  let end = sorted[0];
  let count = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const id = sorted[index];
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

function buildStats(
  records: ReadonlyArray<OrbitSourceRecord>,
  rawRecordGroupCount: number,
  parserFailureCount: number,
  metadata: OrbitSourceMetadata
): OrbitSourceParseStats {
  const noradIds = records
    .map((record) => record.noradCatalogId)
    .filter((id): id is number => Number.isInteger(id));
  const cosparDesignators = [
    ...new Set(
      records
        .map((record) => record.cosparDesignator)
        .filter((value): value is string => Boolean(value))
    )
  ];
  const classificationCounts: Record<string, number> = {};
  for (const record of records) {
    const classification = record.classification || "unknown";
    classificationCounts[classification] =
      (classificationCounts[classification] ?? 0) + 1;
  }
  return {
    ...metadata,
    rawRecordGroupCount,
    parsedRecordCount: records.length,
    parserFailureCount,
    noradIdRangeSummary: summarizeNoradIds(noradIds),
    cosparDesignatorCount: cosparDesignators.length,
    cosparDesignatorSamples: cosparDesignators.slice(0, 8),
    classificationCounts,
    dragTermFieldCoverage: {
      meanMotionFirstDerivativeCount: records.filter(
        (record) => record.meanMotionFirstDerivative !== null
      ).length,
      meanMotionSecondDerivativeCount: records.filter(
        (record) => record.meanMotionSecondDerivative !== null
      ).length,
      bstarDragTermCount: records.filter((record) => record.bstarDragTerm !== null)
        .length
    }
  };
}

function epochUtcFromTleLine1(line1: string): string | null {
  const yearPart = Number(line1.slice(18, 20));
  const dayPart = Number(line1.slice(20, 32));
  if (!Number.isFinite(yearPart) || !Number.isFinite(dayPart)) return null;
  const year = yearPart < 57 ? 2000 + yearPart : 1900 + yearPart;
  const wholeDay = Math.floor(dayPart);
  const dayFraction = dayPart - wholeDay;
  const epoch = new Date(Date.UTC(year, 0, 1));
  epoch.setUTCDate(epoch.getUTCDate() + wholeDay - 1);
  epoch.setUTCMilliseconds(dayFraction * 86_400_000);
  return epoch.toISOString();
}

function parseTleSourceText(
  text: string,
  metadata: OrbitSourceMetadata,
  orbitClass: OrbitClass
): ParsedOrbitSource {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const records: OrbitSourceRecord[] = [];
  let rawRecordGroupCount = 0;
  let parserFailureCount = 0;
  for (let index = 0; index < lines.length; ) {
    const current = lines[index];
    const isTwoLineBlock = current?.startsWith("1 ") && lines[index + 1]?.startsWith("2 ");
    const nameLine = isTwoLineBlock ? null : current;
    const line1 = isTwoLineBlock ? current : lines[index + 1];
    const line2 = isTwoLineBlock ? lines[index + 1] : lines[index + 2];
    const stride = isTwoLineBlock ? 2 : 3;
    rawRecordGroupCount += 1;
    if (line1?.startsWith("1 ") && line2?.startsWith("2 ")) {
      const recordMetadata = parseTleRecordMetadata(line1);
      records.push({
        satelliteId: nameLine || `NORAD ${recordMetadata.noradCatalogId ?? "unknown"}`,
        orbitClass,
        format: metadata.format,
        tleLine1: line1,
        tleLine2: line2,
        epochUtc: epochUtcFromTleLine1(line1),
        ...recordMetadata
      });
    } else {
      parserFailureCount += 1;
    }
    index += stride;
  }
  return {
    ...metadata,
    records,
    stats: buildStats(records, rawRecordGroupCount, parserFailureCount, metadata)
  };
}

function readString(row: OmmRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function readNumber(row: OmmRow, key: string): number | null {
  const text = readString(row, key);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOmmRow(row: OmmRow): OmmRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toUpperCase(), value])
  );
}

function parseOmmRows(
  rows: ReadonlyArray<OmmRow>,
  metadata: OrbitSourceMetadata,
  orbitClass: OrbitClass
): ParsedOrbitSource {
  const records: OrbitSourceRecord[] = [];
  let parserFailureCount = 0;
  for (const rawRow of rows) {
    const row = normalizeOmmRow(rawRow);
    const noradCatalogId = readNumber(row, "NORAD_CAT_ID");
    const epochUtc = readString(row, "EPOCH");
    if (!Number.isInteger(noradCatalogId) || !epochUtc) {
      parserFailureCount += 1;
      continue;
    }
    try {
      const satrec = json2satrec(row as Parameters<typeof json2satrec>[0]);
      if (!satrec || satrec.error) {
        parserFailureCount += 1;
        continue;
      }
    } catch {
      parserFailureCount += 1;
      continue;
    }
    records.push({
      satelliteId:
        readString(row, "OBJECT_NAME") ?? readString(row, "OBJECT_ID") ?? `NORAD ${noradCatalogId}`,
      orbitClass,
      format: metadata.format,
      noradCatalogId,
      classification: readString(row, "CLASSIFICATION_TYPE"),
      cosparDesignator: readString(row, "OBJECT_ID"),
      epochUtc: new Date(epochUtc.endsWith("Z") ? epochUtc : `${epochUtc}Z`).toISOString(),
      meanMotionFirstDerivative: readNumber(row, "MEAN_MOTION_DOT"),
      meanMotionFirstDerivativeRaw: readString(row, "MEAN_MOTION_DOT"),
      meanMotionSecondDerivative: readNumber(row, "MEAN_MOTION_DDOT"),
      meanMotionSecondDerivativeRaw: readString(row, "MEAN_MOTION_DDOT"),
      bstarDragTerm: readNumber(row, "BSTAR"),
      bstarDragTermRaw: readString(row, "BSTAR")
    });
  }
  return {
    ...metadata,
    records,
    stats: buildStats(records, rows.length, parserFailureCount, metadata)
  };
}

function parseOmmJsonText(
  text: string,
  metadata: OrbitSourceMetadata,
  orbitClass: OrbitClass
): ParsedOrbitSource {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  if (!rows.every((row): row is OmmRow => Boolean(row) && typeof row === "object")) {
    throw new Error("OMM JSON source must contain an object or object array");
  }
  return parseOmmRows(rows, metadata, orbitClass);
}

function parseCsvRows(text: string): ReadonlyArray<ReadonlyArray<string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
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
      if (char === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value.trim().length > 0));
}

function parseOmmCsvText(
  text: string,
  metadata: OrbitSourceMetadata,
  orbitClass: OrbitClass
): ParsedOrbitSource {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new Error("OMM CSV source is empty");
  }
  const headers = rows[0].map((header) => header.trim().toUpperCase());
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
  return parseOmmRows(records, metadata, orbitClass);
}

function inferFormat(text: string): OrbitSourceFormat {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "omm-json";
  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.toUpperCase() ?? "";
  if (firstLine.includes("NORAD_CAT_ID") && firstLine.includes(",")) return "omm-csv";
  return "tle-3le";
}

export function parseOrbitSourceText(
  text: string,
  options: ParseOptions
): ParsedOrbitSource {
  const format = options.format ?? inferFormat(text);
  const metadata = metadataFor(format, options.sourcePolicy);
  if (format === "omm-json") {
    return parseOmmJsonText(text, metadata, options.orbitClass);
  }
  if (format === "omm-csv") {
    return parseOmmCsvText(text, metadata, options.orbitClass);
  }
  return parseTleSourceText(text, metadata, options.orbitClass);
}

export function toTleRecords(
  records: ReadonlyArray<OrbitSourceRecord>
): ReadonlyArray<TleRecord> {
  return records
    .filter(
      (record): record is OrbitSourceRecord & { readonly tleLine1: string; readonly tleLine2: string } =>
        Boolean(record.tleLine1 && record.tleLine2)
    )
    .map((record) => ({
      satelliteId: record.satelliteId,
      orbitClass: record.orbitClass,
      tleLine1: record.tleLine1,
      tleLine2: record.tleLine2,
      noradCatalogId: record.noradCatalogId,
      classification: record.classification,
      cosparDesignator: record.cosparDesignator,
      meanMotionFirstDerivative: record.meanMotionFirstDerivative,
      meanMotionFirstDerivativeRaw: record.meanMotionFirstDerivativeRaw,
      meanMotionSecondDerivative: record.meanMotionSecondDerivative,
      meanMotionSecondDerivativeRaw: record.meanMotionSecondDerivativeRaw,
      bstarDragTerm: record.bstarDragTerm,
      bstarDragTermRaw: record.bstarDragTermRaw
    }));
}
