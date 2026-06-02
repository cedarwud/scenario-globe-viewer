#!/usr/bin/env node
// Import locally cached TLE files into the viewer-owned satellite-network fixture.

import { homedir } from "node:os";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  epochRangeUtc,
  parseTleGroups,
  withSnapshotMetadataForManifest
} from "./refresh-tle.mjs";

const DEFAULT_SOURCE_DIR = join(homedir(), "satellite/tle_data");
const DEFAULT_OUTPUT_DIR = "public/fixtures/satellites-network";
const DEFAULT_RETAIN_COUNT = 3;
const ATTRIBUTION_COMMENT =
  "# Data source: CelesTrak (celestrak.org), Terms of Use: https://celestrak.org/terms-of-use.php";

const LOCAL_SOURCES_BY_GROUP = {
  leo: ["oneweb", "starlink"],
  meo: ["gnss"],
  geo: ["geo"]
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
    if (key === "dry-run" || key === "skip-missing") {
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

function parseGroups(value) {
  if (!value) {
    return ["leo"];
  }
  const groups = value.split(",").map((group) => group.trim().toLowerCase());
  for (const group of groups) {
    if (!Object.hasOwn(LOCAL_SOURCES_BY_GROUP, group)) {
      throw new Error(`Unknown --groups entry: ${group}`);
    }
  }
  return [...new Set(groups)];
}

function parsePositiveInteger(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parseDate(value) {
  if (!value || value === "latest") {
    return null;
  }
  if (!/^\d{8}$/.test(value)) {
    throw new Error(`Invalid --date: ${value}`);
  }
  return value;
}

function isoDateFromCompact(compactDate) {
  const year = compactDate.slice(0, 4);
  const month = compactDate.slice(4, 6);
  const day = compactDate.slice(6, 8);
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

function parseCandidateName(sourceName, fileName) {
  const match = fileName.match(new RegExp(`^${sourceName}_(\\d{8})\\.tle$`));
  return match ? match[1] : null;
}

async function readExistingManifest(outputDir) {
  try {
    return JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function listSourceCandidates(sourceDir, sourceName, requestedDate) {
  const tleDir = join(sourceDir, sourceName, "tle");
  let fileNames;
  try {
    fileNames = await readdir(tleDir);
  } catch {
    return [];
  }
  return fileNames
    .map((fileName) => {
      const compactDate = parseCandidateName(sourceName, fileName);
      if (!compactDate || (requestedDate && compactDate !== requestedDate)) {
        return null;
      }
      return {
        sourceName,
        compactDate,
        path: join(tleDir, fileName)
      };
    })
    .filter((candidate) => candidate !== null);
}

async function resolveLocalCandidate(sourceDir, groupKey, options) {
  const configuredSources = LOCAL_SOURCES_BY_GROUP[groupKey];
  const sourceOverride = options[`${groupKey}-source`];
  const sourceNames =
    sourceOverride && sourceOverride !== "latest"
      ? [sourceOverride]
      : configuredSources;
  for (const sourceName of sourceNames) {
    if (!configuredSources.includes(sourceName)) {
      throw new Error(`Unsupported --${groupKey}-source: ${sourceName}`);
    }
  }
  const requestedDate = parseDate(options.date);
  const candidates = (
    await Promise.all(
      sourceNames.map((sourceName) =>
        listSourceCandidates(sourceDir, sourceName, requestedDate)
      )
    )
  ).flat();
  candidates.sort(
    (left, right) =>
      right.compactDate.localeCompare(left.compactDate) ||
      sourceNames.indexOf(left.sourceName) - sourceNames.indexOf(right.sourceName)
  );
  return candidates[0] ?? null;
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

function manifestGeneratedAtUtc(manifest) {
  const generatedAtUtc = manifest?.generatedAtUtc;
  if (typeof generatedAtUtc !== "string") {
    return null;
  }
  return Number.isFinite(Date.parse(generatedAtUtc)) ? generatedAtUtc : null;
}

async function buildLocalSnapshot(groupKey, candidate, options) {
  const text = await readFile(candidate.path, "utf8");
  const records = parseTleGroups(text, options.maxRecords);
  const body = `${records.map((record) => record.join("\n")).join("\n")}\n`;
  const path = STABLE_SNAPSHOT_PATHS[groupKey];
  const sourceDateUtc = isoDateFromCompact(candidate.compactDate);
  const epochRange = epochRangeUtc(records);
  return {
    path,
    body,
    importedSourcePath: candidate.path,
    manifestEntry: {
      path,
      recordCount: records.length,
      epochRangeUtc: epochRange,
      latestTleEpochUtc: epochRange.endUtc,
      localSourceConstellation: candidate.sourceName,
      localSourcePath: candidate.path,
      localSourceDateUtc: sourceDateUtc,
      ...(options.maxRecords
        ? { sourceRecordLimit: options.maxRecords }
        : {})
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceDir = resolve(args["source-dir"] ?? DEFAULT_SOURCE_DIR);
  const outputDir = resolve(args["output-dir"] ?? DEFAULT_OUTPUT_DIR);
  const groups = parseGroups(args.groups);
  parsePositiveInteger(args.retain, DEFAULT_RETAIN_COUNT, "--retain");
  const maxRecords = parsePositiveInteger(
    args["max-records"],
    null,
    "--max-records"
  );
  const importedAtUtc = new Date().toISOString();
  const existingManifest = await readExistingManifest(outputDir);
  if (!existingManifest) {
    throw new Error(
      `Missing existing manifest in ${outputDir}; run npm run refresh:tle first.`
    );
  }

  const snapshots = new Map();
  const localImports = [];
  const manifest = {
    ...existingManifest,
    comment: ATTRIBUTION_COMMENT,
    generatedAtUtc:
      manifestGeneratedAtUtc(existingManifest) ?? importedAtUtc,
    partialRefreshAtUtc: importedAtUtc
  };

  for (const groupKey of groups) {
    const candidate = await resolveLocalCandidate(sourceDir, groupKey, args);
    if (!candidate) {
      if (args["skip-missing"]) {
        console.error(
          `No local ${groupKey} TLE candidate found in ${sourceDir}; skipped.`
        );
        continue;
      }
      throw new Error(
        `No local ${groupKey} TLE candidate found in ${sourceDir}`
      );
    }
    const snapshot = await buildLocalSnapshot(groupKey, candidate, {
      maxRecords
    });
    snapshots.set(groupKey, snapshot);
    manifest[groupKey] = snapshot.manifestEntry;
    localImports.push({
      group: groupKey,
      path: snapshot.path,
      sourceConstellation: candidate.sourceName,
      sourcePath: candidate.path,
      sourceDateUtc: isoDateFromCompact(candidate.compactDate),
      recordCount: snapshot.manifestEntry.recordCount
    });
  }

  if (localImports.length === 0) {
    console.error(`No local TLE imports were applied from ${sourceDir}.`);
  }
  manifest.localImports = localImports;
  const manifestText = `${JSON.stringify(withSnapshotMetadataForManifest(manifest), null, 2)}\n`;
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
  console.log(
    JSON.stringify(
      {
        outputDir,
        manifestPath: join(outputDir, "manifest.json"),
        groups,
        localImports
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
