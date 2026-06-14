#!/usr/bin/env node
// Build-time CelesTrak GP downloader for SDD Slice F7.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const GROUPS = {
  leo: {
    orbitClass: "LEO",
    celestrakGroup: "oneweb",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle"
  },
  meo: {
    orbitClass: "MEO",
    // Galileo is a pure-MEO constellation; the broad `gnss` group mixes in
    // GPS/GLONASS/BeiDou plus IGSO/GEO SBAS sats, which would mislabel non-MEO
    // orbits as MEO. Keep MEO = Galileo (matches the curated source design).
    celestrakGroup: "galileo",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle"
  },
  geo: {
    orbitClass: "GEO",
    celestrakGroup: "geo",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle"
  }
};

const DEFAULT_OUTPUT_DIR = "public/fixtures/satellites-network";
// The runtime bundles a compile-time copy of the per-orbit manifest for its
// network-snapshot inventory disclosure (imported by
// src/features/multi-station-selector/runtime-data-completeness.ts). Keep it in
// sync with the public fixture so networkSnapshotInventoryCount matches the
// actually-loaded inventory after every refresh.
const RUNTIME_MANIFEST_MIRROR = "src/fixtures/satellites-network/manifest.json";
const DEFAULT_RETAIN_COUNT = 3;
const ATTRIBUTION_COMMENT =
  "# Data source: CelesTrak (celestrak.org), Terms of Use: https://celestrak.org/terms-of-use.php";
const CELESTRAK_USER_AGENT = "scenario-globe-viewer-f7-refresh/1.0";
const SNAPSHOT_MANIFEST_METADATA = {
  format: "tle-3le",
  apiClass: "celestrak-gp-tle",
  sourcePolicy: "refresh-artifact",
  catalogNumberCompatibility: "tle-limited-5-digit-catalog"
};
const STABLE_SNAPSHOT_PATHS = {
  leo: "leo-latest.tle",
  meo: "meo-latest.tle",
  geo: "geo-latest.tle"
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    if (key === "dry-run" || key === "no-network" || key === "offline-cached") {
      args[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function parsePositiveNumber(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parsePositiveInteger(value, fallback, label) {
  const parsed = parsePositiveNumber(value, fallback, label);
  if (parsed === null) {
    return parsed;
  }
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parseReferenceUtc(value) {
  const referenceUtc = value ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(referenceUtc))) {
    throw new Error(`Invalid --reference-utc: ${value}`);
  }
  return referenceUtc;
}

function parseGroups(value) {
  if (!value) {
    return Object.keys(GROUPS);
  }
  const groups = value.split(",").map((group) => group.trim().toLowerCase());
  for (const group of groups) {
    if (!Object.hasOwn(GROUPS, group)) {
      throw new Error(`Unknown --groups entry: ${group}`);
    }
  }
  return [...new Set(groups)];
}

export function filenameUtc(isoUtc) {
  return isoUtc.replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

function parseTleEpochUtc(line1) {
  const yearPart = Number(line1.slice(18, 20));
  const dayPart = Number(line1.slice(20, 32));
  if (!Number.isFinite(yearPart) || !Number.isFinite(dayPart)) {
    return null;
  }
  const year = yearPart < 57 ? 2000 + yearPart : 1900 + yearPart;
  const wholeDay = Math.floor(dayPart);
  const dayFraction = dayPart - wholeDay;
  const epoch = new Date(Date.UTC(year, 0, 1));
  epoch.setUTCDate(epoch.getUTCDate() + wholeDay - 1);
  epoch.setUTCMilliseconds(dayFraction * 86_400_000);
  return epoch.toISOString();
}

export function parseTleGroups(text, sampleLimit) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const groups = [];
  for (let index = 0; index < lines.length; index += 3) {
    const group = lines.slice(index, index + 3);
    if (group.length !== 3) {
      throw new Error(`Malformed trailing TLE group with ${group.length} lines`);
    }
    const [, line1, line2] = group;
    if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) {
      throw new Error(`Malformed TLE group near line ${index + 1}`);
    }
    if (parseTleEpochUtc(line1) === null) {
      throw new Error(`Malformed TLE epoch near line ${index + 2}`);
    }
    groups.push(group);
    if (sampleLimit && groups.length >= sampleLimit) {
      break;
    }
  }
  if (groups.length === 0) {
    throw new Error("No valid TLE records returned");
  }
  return groups;
}

export function epochRangeUtc(groups) {
  const epochs = groups
    .map((group) => parseTleEpochUtc(group[1]))
    .filter((epoch) => epoch !== null)
    .sort();
  return {
    startUtc: epochs[0] ?? null,
    endUtc: epochs.length > 0 ? epochs[epochs.length - 1] : null
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": CELESTRAK_USER_AGENT }
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}

async function buildGroupSnapshot(groupKey, sampleLimit) {
  const group = GROUPS[groupKey];
  const text = await fetchText(group.url);
  const records = parseTleGroups(text, sampleLimit);
  const body = `${records.map((record) => record.join("\n")).join("\n")}\n`;
  const path = STABLE_SNAPSHOT_PATHS[groupKey];
  const epochRange = epochRangeUtc(records);
  return {
    path,
    body,
    manifestEntry: {
      path,
      ...SNAPSHOT_MANIFEST_METADATA,
      recordCount: records.length,
      epochRangeUtc: epochRange,
      latestTleEpochUtc: epochRange.endUtc
    }
  };
}

function withSnapshotManifestMetadata(entry) {
  if (!entry || typeof entry !== "object") {
    return entry;
  }
  const epochRange = entry.epochRangeUtc;
  const latestTleEpochUtc =
    typeof entry.latestTleEpochUtc === "string"
      ? entry.latestTleEpochUtc
      : epochRange &&
          typeof epochRange === "object" &&
          typeof epochRange.endUtc === "string"
        ? epochRange.endUtc
        : null;
  return {
    ...entry,
    ...SNAPSHOT_MANIFEST_METADATA,
    latestTleEpochUtc
  };
}

export function withSnapshotMetadataForManifest(manifest) {
  const normalized = { ...manifest };
  for (const groupKey of Object.keys(GROUPS)) {
    normalized[groupKey] = withSnapshotManifestMetadata(normalized[groupKey]);
  }
  return normalized;
}

async function removeNonCurrentSnapshots(outputDir, groupKey, currentPath) {
  const entries = await readdir(outputDir, { withFileTypes: true });
  const snapshots = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name.startsWith(`${groupKey}-`) &&
        name.endsWith(".tle") &&
        name !== currentPath
    );
  for (const name of snapshots) {
    await rm(join(outputDir, name), { force: true });
  }
}

async function readExistingManifest(outputDir) {
  try {
    return JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

function isUsableManifestEntry(entry) {
  return Boolean(
    entry &&
      typeof entry === "object" &&
      typeof entry.path === "string" &&
      entry.path.endsWith(".tle")
  );
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function manifestGeneratedAtUtc(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }
  const generatedAtUtc = manifest.generatedAtUtc;
  if (typeof generatedAtUtc !== "string") {
    return null;
  }
  return Number.isFinite(Date.parse(generatedAtUtc)) ? generatedAtUtc : null;
}

function ageHoursSince(generatedAtUtc, referenceUtc) {
  const generatedMs = Date.parse(generatedAtUtc);
  const referenceMs = Date.parse(referenceUtc);
  if (!Number.isFinite(generatedMs) || !Number.isFinite(referenceMs)) {
    return null;
  }
  return Math.max(0, (referenceMs - generatedMs) / 3_600_000);
}

function refreshSkipReason(manifest, options) {
  const generatedAtUtc = manifestGeneratedAtUtc(manifest);
  if (!generatedAtUtc) {
    return null;
  }
  const ageHours = ageHoursSince(generatedAtUtc, options.referenceUtc);
  if (ageHours === null) {
    return null;
  }
  if (
    options.minRefreshIntervalHours !== null &&
    ageHours < options.minRefreshIntervalHours
  ) {
    return {
      reason: "min-refresh-interval",
      generatedAtUtc,
      ageHours,
      thresholdHours: options.minRefreshIntervalHours
    };
  }
  if (
    options.ifOlderThanDays !== null &&
    ageHours / 24 < options.ifOlderThanDays
  ) {
    return {
      reason: "snapshot-fresh",
      generatedAtUtc,
      ageHours,
      thresholdDays: options.ifOlderThanDays
    };
  }
  return null;
}

function printNoop(skip, outputDir, groups, referenceUtc) {
  console.log(
    JSON.stringify(
      {
        status: "noop",
        reason: skip.reason,
        outputDir,
        groups,
        referenceUtc,
        generatedAtUtc: skip.generatedAtUtc,
        ageHours: Number(skip.ageHours.toFixed(3)),
        thresholdHours: skip.thresholdHours,
        thresholdDays: skip.thresholdDays
      },
      null,
      2
    )
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args["no-network"] && !args["offline-cached"]) {
    console.error("--no-network requires explicit --offline-cached");
    process.exit(1);
  }

  const outputDir = resolve(args["output-dir"] ?? DEFAULT_OUTPUT_DIR);
  const groups = parseGroups(args.groups);
  const retainCount = parsePositiveInteger(
    args.retain,
    DEFAULT_RETAIN_COUNT,
    "--retain"
  );
  const sampleLimit = parsePositiveInteger(args["sample-limit"], null, "--sample-limit");
  const ifOlderThanDays = parsePositiveNumber(
    args["if-older-than-days"],
    null,
    "--if-older-than-days"
  );
  const minRefreshIntervalHours = parsePositiveNumber(
    args["min-refresh-interval-hours"],
    null,
    "--min-refresh-interval-hours"
  );
  const referenceUtc = parseReferenceUtc(args["reference-utc"]);

  if (args["no-network"]) {
    const manifestPath = join(outputDir, "manifest.json");
    const manifest = await readFile(manifestPath, "utf8");
    console.log(manifest);
    return;
  }

  const existingManifest = await readExistingManifest(outputDir);
  const skip = refreshSkipReason(existingManifest, {
    ifOlderThanDays,
    minRefreshIntervalHours,
    referenceUtc
  });
  if (skip) {
    printNoop(skip, outputDir, groups, referenceUtc);
    return;
  }

  const generatedAtUtc = new Date().toISOString();
  const snapshots = new Map();
  const priorManifest = groups.length < Object.keys(GROUPS).length
    ? existingManifest
    : null;
  const fetchFallbacks = [];
  const manifest = {
    ...(priorManifest ?? existingManifest ?? {}),
    comment: ATTRIBUTION_COMMENT,
    generatedAtUtc:
      manifestGeneratedAtUtc(priorManifest ?? existingManifest) ?? generatedAtUtc
  };

  for (const groupKey of groups) {
    try {
      const snapshot = await buildGroupSnapshot(groupKey, sampleLimit);
      snapshots.set(groupKey, snapshot);
      manifest[groupKey] = snapshot.manifestEntry;
    } catch (error) {
      const existingEntry = existingManifest?.[groupKey];
      if (!isUsableManifestEntry(existingEntry)) {
        throw new Error(
          `${errorMessage(error)}; no cached ${groupKey} snapshot is available in ${outputDir}`
        );
      }
      const fallback = {
        group: groupKey,
        path: existingEntry.path,
        reason: errorMessage(error)
      };
      fetchFallbacks.push(fallback);
      manifest[groupKey] = withSnapshotManifestMetadata(existingEntry);
      console.error(
        `CelesTrak fetch failed for ${groupKey}; reused cached snapshot ${existingEntry.path}. ${fallback.reason}`
      );
    }
  }
  if (fetchFallbacks.length === 0) {
    manifest.generatedAtUtc = generatedAtUtc;
    delete manifest.partialRefreshAtUtc;
    delete manifest.fetchFallbacks;
  } else {
    manifest.partialRefreshAtUtc = generatedAtUtc;
    manifest.fetchFallbacks = fetchFallbacks;
  }
  for (const groupKey of Object.keys(GROUPS)) {
    if (!manifest[groupKey]) {
      throw new Error(
        `Manifest missing ${groupKey}; run without --groups first or include all groups.`
      );
    }
  }

  const finalManifest = withSnapshotMetadataForManifest(manifest);
  const manifestText = `${JSON.stringify(finalManifest, null, 2)}\n`;
  if (args["dry-run"]) {
    console.log(manifestText);
    return;
  }

  await mkdir(outputDir, { recursive: true });
  for (const [groupKey, snapshot] of snapshots) {
    await writeFile(join(outputDir, snapshot.path), snapshot.body, "utf8");
    await removeNonCurrentSnapshots(outputDir, groupKey, snapshot.path);
  }
  await writeFile(join(outputDir, "manifest.json"), manifestText, "utf8");
  // Mirror the per-orbit blocks into the runtime-bundled manifest so the
  // network-snapshot inventory disclosure stays consistent with the loaded
  // fixture. Only mirror the canonical public refresh, not custom output dirs.
  let runtimeMirrorPath = null;
  if (resolve(outputDir) === resolve(DEFAULT_OUTPUT_DIR)) {
    const runtimeMirror = {
      comment: finalManifest.comment,
      generatedAtUtc: finalManifest.generatedAtUtc,
      leo: finalManifest.leo,
      meo: finalManifest.meo,
      geo: finalManifest.geo
    };
    await mkdir(dirname(RUNTIME_MANIFEST_MIRROR), { recursive: true });
    await writeFile(
      RUNTIME_MANIFEST_MIRROR,
      `${JSON.stringify(runtimeMirror, null, 2)}\n`,
      "utf8"
    );
    runtimeMirrorPath = RUNTIME_MANIFEST_MIRROR;
  }
  console.log(
    JSON.stringify(
      {
        outputDir,
        manifestPath: join(outputDir, "manifest.json"),
        runtimeMirrorPath,
        groups,
        fetchFallbacks
      },
      null,
      2
    )
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
