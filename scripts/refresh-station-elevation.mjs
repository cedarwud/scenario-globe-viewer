#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const REGISTRY_PATH = path.join(
  PROJECT_ROOT,
  "public/fixtures/ground-stations/multi-orbit-public-registry.json"
);
const DEFAULT_CACHE_PATH = path.join(
  PROJECT_ROOT,
  "public/fixtures/ground-stations/station-elevations-cache.json"
);
const OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup";
const MAX_RATE_LIMIT_RETRIES = 5;
const REQUEST_TIMEOUT_MS = 30_000;
const MIN_ELEVATION_M = -500;
const MAX_ELEVATION_M = 5000;

function usage() {
  return [
    "Usage: node scripts/refresh-station-elevation.mjs [--dry-run] [--no-network] [--output <path>]",
    "",
    "Updates public/fixtures/ground-stations/multi-orbit-public-registry.json",
    "with integer elevationM values and writes a sidecar cache.",
    "",
    "Flags:",
    "  --dry-run     Print proposed elevations without writing files.",
    "  --output      Cache path; defaults to public/fixtures/ground-stations/station-elevations-cache.json.",
    "  --no-network  Read elevations from the cache only.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    noNetwork: false,
    outputPath: DEFAULT_CACHE_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--no-network") {
      options.noNetwork = true;
      continue;
    }
    if (arg === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--output requires a path");
      }
      options.outputPath = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

async function readRegistry() {
  const text = await readFile(REGISTRY_PATH, "utf8");
  const registry = parseJson(text, REGISTRY_PATH);
  if (!registry || !Array.isArray(registry.stations)) {
    throw new Error("Registry JSON must contain a stations array");
  }
  if (registry.stations.length !== 69) {
    throw new Error(`Expected 69 stations, found ${registry.stations.length}`);
  }
  return { registry, text };
}

function validateStation(station, index) {
  const label = station?.id ?? `stations[${index}]`;
  if (!station || typeof station !== "object" || Array.isArray(station)) {
    throw new Error(`${label}: station entry must be an object`);
  }
  if (typeof station.id !== "string" || station.id.length === 0) {
    throw new Error(`stations[${index}]: station id must be a non-empty string`);
  }
  if (!Number.isFinite(station.lat) || station.lat < -90 || station.lat > 90) {
    throw new Error(`${station.id}: lat must be a finite WGS84 latitude`);
  }
  if (!Number.isFinite(station.lon) || station.lon < -180 || station.lon > 180) {
    throw new Error(`${station.id}: lon must be a finite WGS84 longitude`);
  }
  if (
    station.terrainMaskDeg !== undefined &&
    (!Number.isInteger(station.terrainMaskDeg) ||
      station.terrainMaskDeg < 0 ||
      station.terrainMaskDeg > 90)
  ) {
    throw new Error(`${station.id}: terrainMaskDeg must be an integer from 0 to 90`);
  }
}

function validateElevation(entry, stationId) {
  if (!Number.isFinite(entry.elevationM) || !Number.isInteger(entry.elevationM)) {
    throw new Error(`${stationId}: elevationM must be an integer`);
  }
  if (entry.elevationM < MIN_ELEVATION_M || entry.elevationM > MAX_ELEVATION_M) {
    throw new Error(
      `${stationId}: elevationM ${entry.elevationM} outside sanity range ${MIN_ELEVATION_M}..${MAX_ELEVATION_M}`
    );
  }
}

function validateCacheEntries(entries, stations, cachePath) {
  if (!Array.isArray(entries)) {
    throw new Error(`${cachePath} must be an array`);
  }
  const byId = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${cachePath}: cache entries must be objects`);
    }
    if (typeof entry.stationId !== "string" || entry.stationId.length === 0) {
      throw new Error(`${cachePath}: cache entry stationId must be a non-empty string`);
    }
    if (typeof entry.sourceAccessedUtc !== "string" || Number.isNaN(Date.parse(entry.sourceAccessedUtc))) {
      throw new Error(`${entry.stationId}: sourceAccessedUtc must be an ISO timestamp`);
    }
    validateElevation(entry, entry.stationId);
    if (byId.has(entry.stationId)) {
      throw new Error(`${entry.stationId}: duplicate cache entry`);
    }
    byId.set(entry.stationId, entry);
  }

  const missing = stations.filter((station) => !byId.has(station.id)).map((station) => station.id);
  if (missing.length > 0) {
    throw new Error(`${cachePath}: missing elevations for ${missing.join(", ")}`);
  }
  if (entries.length !== stations.length) {
    throw new Error(`${cachePath}: expected ${stations.length} entries, found ${entries.length}`);
  }

  return stations.map((station) => byId.get(station.id));
}

async function readCache(cachePath, stations) {
  let text;
  try {
    text = await readFile(cachePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Cache file not found: ${cachePath}`);
    }
    throw error;
  }
  return validateCacheEntries(parseJson(text, cachePath), stations, cachePath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(response, attempt) {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 60_000);
    }
    const retryAt = Date.parse(header);
    if (!Number.isNaN(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 1000), 60_000);
    }
  }
  return Math.min(1000 * 2 ** attempt, 30_000);
}

async function postOpenElevation(stations) {
  const locations = stations.map((station) => ({
    latitude: station.lat,
    longitude: station.lon,
  }));

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(OPEN_ELEVATION_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locations }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      throw new Error(`Open-Elevation request failed: ${error.message}`);
    }
    clearTimeout(timeout);

    if (response.status === 429) {
      if (attempt === MAX_RATE_LIMIT_RETRIES) {
        throw new Error("Open-Elevation rate-limited past 5 retries");
      }
      await sleep(retryDelayMs(response, attempt));
      continue;
    }

    if (response.status >= 500 && attempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(retryDelayMs(response, attempt));
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Open-Elevation returned HTTP ${response.status}${text ? `: ${text}` : ""}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`Open-Elevation response was not JSON: ${error.message}`);
    }

    return payload;
  }

  throw new Error("Open-Elevation request did not complete");
}

function cacheEntriesFromResponse(payload, stations, sourceAccessedUtc) {
  if (!payload || !Array.isArray(payload.results)) {
    throw new Error("Open-Elevation response missing results array");
  }
  if (payload.results.length !== stations.length) {
    throw new Error(
      `Open-Elevation returned ${payload.results.length} results for ${stations.length} stations`
    );
  }

  return payload.results.map((result, index) => {
    const station = stations[index];
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error(`${station.id}: malformed Open-Elevation result`);
    }
    if (!Number.isFinite(result.elevation)) {
      throw new Error(`${station.id}: malformed Open-Elevation elevation`);
    }
    const elevationM = Math.round(result.elevation);
    const entry = {
      stationId: station.id,
      elevationM,
      sourceAccessedUtc,
    };
    validateElevation(entry, station.id);
    return entry;
  });
}

function stringifyInlineArrays(value, level = 0) {
  const indent = "  ".repeat(level);
  const nextIndent = "  ".repeat(level + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const primitiveOnly = value.every(
      (item) => item === null || ["string", "number", "boolean"].includes(typeof item)
    );
    if (primitiveOnly) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    return `[\n${value.map((item) => `${nextIndent}${stringifyInlineArrays(item, level + 1)}`).join(",\n")}\n${indent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return "{}";
    }
    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${JSON.stringify(key)}: ${stringifyInlineArrays(item, level + 1)}`)
      .join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
}

function scanTopLevelObjects(text, startIndex) {
  const ranges = [];
  let inString = false;
  let escaped = false;
  let arrayDepth = 1;
  let depth = 0;
  let objectStart = -1;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "[") {
      arrayDepth += 1;
      continue;
    }
    if (char === "]") {
      arrayDepth -= 1;
      if (arrayDepth === 0) {
        if (depth !== 0) {
          throw new Error("Registry stations array ended inside a station object");
        }
        return ranges;
      }
      if (arrayDepth < 0) {
        throw new Error("Registry stations array has unbalanced brackets");
      }
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && objectStart >= 0) {
        ranges.push([objectStart, index + 1]);
        objectStart = -1;
      }
      if (depth < 0) {
        throw new Error("Registry stations array has unbalanced object braces");
      }
    }
  }

  throw new Error("Registry text missing closing stations array bracket");
}

function stationObjectRanges(registryText, stationCount) {
  const stationsKeyIndex = registryText.indexOf("\"stations\"");
  if (stationsKeyIndex < 0) {
    throw new Error("Registry text missing stations key");
  }
  const arrayStart = registryText.indexOf("[", stationsKeyIndex);
  if (arrayStart < 0) {
    throw new Error("Registry text missing stations array");
  }
  const ranges = scanTopLevelObjects(registryText, arrayStart + 1);
  if (ranges.length !== stationCount) {
    throw new Error(`Registry text has ${ranges.length} station objects; expected ${stationCount}`);
  }
  return ranges;
}

function patchStationBlock(block, station, elevationM) {
  const elevationLine = /^(\s*)"elevationM":\s*-?\d+(?:\.\d+)?(,?)$/m;
  const terrainLine = /^(\s*)"terrainMaskDeg":\s*\d+(,?)$/m;
  const lonLine = /^(\s*)"lon":\s*[^,\n]+,$/m;

  if (elevationLine.test(block)) {
    let next = block.replace(elevationLine, `$1"elevationM": ${elevationM}$2`);
    if (!terrainLine.test(next)) {
      next = next.replace(elevationLine, `$&\n$1"terrainMaskDeg": 0,`);
    }
    return next;
  }

  const match = block.match(lonLine);
  if (!match) {
    throw new Error(`${station.id}: lon line not found`);
  }
  const indent = match[1];
  return block.replace(
    lonLine,
    `$&\n${indent}"elevationM": ${elevationM},\n${indent}"terrainMaskDeg": 0,`
  );
}

function patchRegistryText(registryText, stations, entries) {
  const byId = new Map(entries.map((entry) => [entry.stationId, entry]));
  const ranges = stationObjectRanges(registryText, stations.length);
  let next = registryText;

  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const [start, end] = ranges[index];
    const station = stations[index];
    const entry = byId.get(station.id);
    if (!entry) {
      throw new Error(`${station.id}: missing elevation entry`);
    }
    const block = registryText.slice(start, end);
    const patched = patchStationBlock(block, station, entry.elevationM);
    next = `${next.slice(0, start)}${patched}${next.slice(end)}`;
  }

  return next;
}

async function writeIfChanged(filePath, text) {
  let current = null;
  try {
    current = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  if (current === text) {
    return false;
  }
  await writeFile(filePath, text);
  return true;
}

function printDryRun(entries) {
  console.log("stationId,elevationM,sourceAccessedUtc");
  for (const entry of entries) {
    console.log(`${entry.stationId},${entry.elevationM},${entry.sourceAccessedUtc}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { registry, text: registryText } = await readRegistry();
  const stations = registry.stations;
  stations.forEach(validateStation);

  const entries = options.noNetwork
    ? await readCache(options.outputPath, stations)
    : cacheEntriesFromResponse(
        await postOpenElevation(stations),
        stations,
        new Date().toISOString()
      );

  if (options.dryRun) {
    printDryRun(entries);
    return;
  }

  const nextRegistryText = patchRegistryText(registryText, stations, entries);
  const cacheText = `${stringifyInlineArrays(entries)}\n`;

  const wroteRegistry = await writeIfChanged(REGISTRY_PATH, nextRegistryText);
  const wroteCache = options.noNetwork ? false : await writeIfChanged(options.outputPath, cacheText);

  console.log(`${wroteRegistry ? "Updated" : "Unchanged"} ${path.relative(PROJECT_ROOT, REGISTRY_PATH)}`);
  if (options.noNetwork) {
    console.log(`Read ${entries.length} cached elevations from ${path.relative(PROJECT_ROOT, options.outputPath)}`);
  } else {
    console.log(`${wroteCache ? "Updated" : "Unchanged"} ${path.relative(PROJECT_ROOT, options.outputPath)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
