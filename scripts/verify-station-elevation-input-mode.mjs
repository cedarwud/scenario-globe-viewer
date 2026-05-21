#!/usr/bin/env node

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runRefreshStationElevation } from "./refresh-station-elevation.mjs";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const REGISTRY_PATH = path.join(
  PROJECT_ROOT,
  "public/fixtures/ground-stations/multi-orbit-public-registry.json"
);
const CACHE_PATH = path.join(
  PROJECT_ROOT,
  "public/fixtures/ground-stations/station-elevations-cache.json"
);
const SAMPLE_TIMESTAMP = "2026-05-21T00:00:00.000Z";
const CHANGED_SAMPLE_STATION_ID = "ksat-svalsat-svalbard";
const CHANGED_SAMPLE_ELEVATION_M = 11;
const NEGATIVE_SAMPLE_STATION_ID = "ksat-trollsat-antarctica";
const NEGATIVE_SAMPLE_ELEVATION_M = -12;
const DEM_DATASET_ID = "copernicus-dem-glo-30-dged-prep-sample";
const EXPECTED_DRY_RUN_COLUMNS = [
  "stationId",
  "elevationM",
  "sourceAccessedUtc",
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

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function cloneRows(rows) {
  return JSON.parse(JSON.stringify(rows));
}

async function main() {
  const registry = parseJson(await readFile(REGISTRY_PATH, "utf8"), REGISTRY_PATH);
  const cache = parseJson(await readFile(CACHE_PATH, "utf8"), CACHE_PATH);

  const stationById = new Map(registry.stations.map((station) => [station.id, station]));
  const changedStation = stationById.get(CHANGED_SAMPLE_STATION_ID);
  const currentChangedEntry = cache.find((entry) => entry.stationId === CHANGED_SAMPLE_STATION_ID);
  if (!changedStation || !currentChangedEntry) {
    throw new Error(`${CHANGED_SAMPLE_STATION_ID}: changed sample station missing from registry or cache`);
  }
  if (
    changedStation.elevationM === CHANGED_SAMPLE_ELEVATION_M ||
    currentChangedEntry.elevationM === CHANGED_SAMPLE_ELEVATION_M
  ) {
    throw new Error(`${CHANGED_SAMPLE_STATION_ID}: changed sample elevation must differ from current fixtures`);
  }

  const sampleRows = cache.map((entry) => {
    const station = stationById.get(entry.stationId);
    if (!station) {
      throw new Error(`${entry.stationId}: cache row is not present in registry`);
    }
    return {
      ...entry,
      elevationM:
        entry.stationId === CHANGED_SAMPLE_STATION_ID
          ? CHANGED_SAMPLE_ELEVATION_M
          : entry.elevationM,
      sourceAccessedUtc: SAMPLE_TIMESTAMP,
      elevationSourceKind: "dem-derived",
      elevationDatasetId: DEM_DATASET_ID,
      elevationDatasetVersion: "prep-sample",
      elevationDatasetResolutionM: 30,
      elevationVerticalDatum: "EGM2008",
      elevationTileId: `prep:${entry.stationId}`,
      elevationCellId: `prep-cell:${entry.stationId}`,
      elevationSampleLat: station.lat,
      elevationSampleLon: station.lon,
      elevationSamplingMethod: "dem-cell-sample",
      elevationSampledAtUtc: SAMPLE_TIMESTAMP,
      elevationCacheGeneratedUtc: SAMPLE_TIMESTAMP,
      elevationLicenseId: "copernicus-dem-glo-30-free-open-prep",
      elevationLicenseUrl: "https://docs.sentinel-hub.com/api/latest/static/files/data/dem/resources/license/License-COPDEM-30.pdf",
      elevationCitation: "Copernicus DEM GLO-30 prep sample derived from current cache elevations.",
      elevationProvenanceStatus: "dem-provenance-complete",
      elevationNonClaim: "Verifier sample exercises DEM-derived metadata validation only; it does not replace numeric elevations."
    };
  });

  const tempDir = await mkdtemp(path.join(tmpdir(), "station-elevation-input-"));
  let fixtureIndex = 0;

  async function writeRows(label, rows) {
    fixtureIndex += 1;
    const filePath = path.join(tempDir, `${String(fixtureIndex).padStart(2, "0")}-${label}.json`);
    await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`);
    return filePath;
  }

  async function runInput(rows, { collectOutput = false } = {}) {
    const inputPath = await writeRows("input", rows);
    const output = [];
    await runRefreshStationElevation(
      [
        "--input",
        inputPath,
        "--dry-run",
        "--output",
        CACHE_PATH
      ],
      { log: (line) => output.push(line) }
    );
    return collectOutput ? output : [];
  }

  async function assertReject(label, rows, expectedMessagePart) {
    try {
      await runInput(rows);
    } catch (error) {
      if (!String(error.message).includes(expectedMessagePart)) {
        throw new Error(`${label} failed with unexpected error: ${error.message}`);
      }
      return;
    }
    throw new Error(`${label} unexpectedly passed strict input validation`);
  }

  function rowsWithFirstPatch(patch) {
    const rows = cloneRows(sampleRows);
    Object.assign(rows[0], patch);
    return rows;
  }

  const output = [];
  const previousCwd = process.cwd();
  process.chdir(PROJECT_ROOT);
  try {
    output.push(...await runInput(sampleRows, { collectOutput: true }));

    const negativeRows = cloneRows(sampleRows);
    const negativeRow = negativeRows.find((row) => row.stationId === NEGATIVE_SAMPLE_STATION_ID);
    if (!negativeRow) {
      throw new Error(`${NEGATIVE_SAMPLE_STATION_ID}: negative sample station missing`);
    }
    negativeRow.elevationM = NEGATIVE_SAMPLE_ELEVATION_M;
    await runInput(negativeRows);

    await assertReject(
      "legacy input",
      cache,
      "input elevationSourceKind must be dem-derived"
    );
    await assertReject(
      "partial DEM metadata",
      rowsWithFirstPatch({ elevationTileId: undefined }).map((row) => {
        if (row.elevationTileId === undefined) {
          delete row.elevationTileId;
        }
        return row;
      }),
      "input row must contain complete DEM metadata"
    );
    await assertReject(
      "invalid source timestamp",
      rowsWithFirstPatch({ sourceAccessedUtc: "2026-05-21" }),
      "sourceAccessedUtc must be an ISO UTC timestamp"
    );
    await assertReject(
      "invalid sampled timestamp",
      rowsWithFirstPatch({ elevationSampledAtUtc: "2026-13-21T00:00:00.000Z" }),
      "elevationSampledAtUtc must be a valid ISO UTC timestamp"
    );
    await assertReject(
      "invalid sample latitude",
      rowsWithFirstPatch({ elevationSampleLat: 91 }),
      "elevationSampleLat must be a WGS84 latitude"
    );
    await assertReject(
      "invalid sample longitude",
      rowsWithFirstPatch({ elevationSampleLon: 181 }),
      "elevationSampleLon must be a WGS84 longitude"
    );
    await assertReject(
      "invalid dataset resolution",
      rowsWithFirstPatch({ elevationDatasetResolutionM: 0 }),
      "elevationDatasetResolutionM must be greater than 0"
    );
    await assertReject(
      "legacy dataset marker",
      rowsWithFirstPatch({ elevationDatasetId: "legacy-dem-marker" }),
      "elevationDatasetId must not carry a legacy marker"
    );
    await assertReject(
      "legacy sampling marker",
      rowsWithFirstPatch({ elevationSamplingMethod: "service-response" }),
      "dem-derived elevationSamplingMethod must be dem-cell-sample"
    );
    await assertReject(
      "legacy status marker",
      rowsWithFirstPatch({ elevationProvenanceStatus: "legacy-upstream-dem-unknown" }),
      "input elevationProvenanceStatus must be dem-provenance-complete"
    );
    await assertReject(
      "duplicate station row",
      [...sampleRows, sampleRows[0]],
      "duplicate cache entry"
    );
    await assertReject(
      "orphan station row",
      rowsWithFirstPatch({ stationId: "unknown-station" }),
      "elevation row is not present in registry"
    );
    await assertReject(
      "missing station row",
      sampleRows.slice(1),
      "missing elevations for"
    );
  } finally {
    process.chdir(previousCwd);
  }

  const lines = [...output];
  const header = lines.shift();
  const expectedHeader = EXPECTED_DRY_RUN_COLUMNS.join(",");
  if (header !== expectedHeader) {
    throw new Error(`dry-run output header changed unexpectedly: ${JSON.stringify(header)}`);
  }
  if (lines.length !== registry.stations.length) {
    throw new Error(`expected ${registry.stations.length} dry-run rows, found ${lines.length}`);
  }
  const legacyRows = lines.filter((line) => line.includes(",legacy-service-cache,"));
  const demRows = lines.filter((line) => line.includes(",dem-derived,"));
  if (legacyRows.length > 0) {
    throw new Error(`expected no legacy rows, found ${legacyRows.length}`);
  }
  if (demRows.length !== registry.stations.length) {
    throw new Error(`expected ${registry.stations.length} DEM-derived rows, found ${demRows.length}`);
  }
  const changedLine = lines.find((line) => line.startsWith(`${CHANGED_SAMPLE_STATION_ID},`));
  const changedColumns = changedLine?.split(",");
  if (!changedColumns) {
    throw new Error(`changed DEM-derived row was not preserved in dry-run output: ${changedLine}`);
  }
  const changedByColumn = new Map(EXPECTED_DRY_RUN_COLUMNS.map((column, index) => [column, changedColumns[index]]));
  const expectedChangedValues = new Map([
    ["stationId", CHANGED_SAMPLE_STATION_ID],
    ["elevationM", String(CHANGED_SAMPLE_ELEVATION_M)],
    ["sourceAccessedUtc", SAMPLE_TIMESTAMP],
    ["elevationSourceKind", "dem-derived"],
    ["elevationDatasetId", DEM_DATASET_ID],
    ["elevationDatasetVersion", "prep-sample"],
    ["elevationDatasetResolutionM", "30"],
    ["elevationVerticalDatum", "EGM2008"],
    ["elevationTileId", `prep:${CHANGED_SAMPLE_STATION_ID}`],
    ["elevationCellId", `prep-cell:${CHANGED_SAMPLE_STATION_ID}`],
    ["elevationSamplingMethod", "dem-cell-sample"],
    ["elevationSampledAtUtc", SAMPLE_TIMESTAMP],
    ["elevationCacheGeneratedUtc", SAMPLE_TIMESTAMP],
    ["elevationLicenseId", "copernicus-dem-glo-30-free-open-prep"],
    [
      "elevationLicenseUrl",
      "https://docs.sentinel-hub.com/api/latest/static/files/data/dem/resources/license/License-COPDEM-30.pdf"
    ],
    ["elevationProvenanceStatus", "dem-provenance-complete"]
  ]);
  for (const [column, expected] of expectedChangedValues) {
    const actual = changedByColumn.get(column);
    if (actual !== expected) {
      throw new Error(`${column} was not preserved in dry-run output: ${actual}`);
    }
  }

  console.log(
    `PASS station elevation input mode: ${demRows.length} DEM-derived rows validated; rejection cases covered`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
