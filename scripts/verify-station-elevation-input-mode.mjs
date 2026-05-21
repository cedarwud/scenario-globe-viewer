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

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
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
      elevationDatasetId: "copernicus-dem-glo-30-dged-prep-sample",
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
  const inputPath = path.join(tempDir, "dem-derived-sample.json");
  const legacyInputPath = path.join(tempDir, "legacy-sample.json");
  await writeFile(inputPath, `${JSON.stringify(sampleRows, null, 2)}\n`);
  await writeFile(legacyInputPath, `${JSON.stringify(cache, null, 2)}\n`);

  const output = [];
  const previousCwd = process.cwd();
  process.chdir(PROJECT_ROOT);
  try {
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

    let legacyRejected = false;
    try {
      await runRefreshStationElevation(
        [
          "--input",
          legacyInputPath,
          "--dry-run",
          "--output",
          CACHE_PATH
        ],
        { log: () => {} }
      );
    } catch (error) {
      legacyRejected = true;
      if (!String(error.message).includes("input elevationSourceKind must be dem-derived")) {
        throw new Error(`legacy input failed with unexpected error: ${error.message}`);
      }
    }
    if (!legacyRejected) {
      throw new Error("legacy input unexpectedly passed strict input validation");
    }
  } finally {
    process.chdir(previousCwd);
  }

  const lines = [...output];
  const header = lines.shift();
  if (
    header !==
    "stationId,elevationM,sourceAccessedUtc,elevationSourceKind,elevationDatasetId,elevationProvenanceStatus"
  ) {
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
  if (
    changedLine !==
    `${CHANGED_SAMPLE_STATION_ID},${CHANGED_SAMPLE_ELEVATION_M},${SAMPLE_TIMESTAMP},dem-derived,copernicus-dem-glo-30-dged-prep-sample,dem-provenance-complete`
  ) {
    throw new Error(`changed DEM-derived row was not preserved in dry-run output: ${changedLine}`);
  }

  console.log(
    `PASS station elevation input mode: ${demRows.length} DEM-derived rows validated; legacy input rejected`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
