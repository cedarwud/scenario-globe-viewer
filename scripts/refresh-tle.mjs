#!/usr/bin/env node
// Build-time CelesTrak GP downloader for SDD Slice F7.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const GROUPS = {
  leo: {
    orbitClass: "LEO",
    celestrakGroup: "active",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
  },
  meo: {
    orbitClass: "MEO",
    celestrakGroup: "gnss",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=gnss&FORMAT=tle"
  },
  geo: {
    orbitClass: "GEO",
    celestrakGroup: "geo",
    url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle"
  }
};

const DEFAULT_OUTPUT_DIR = "public/fixtures/satellites-network";
const DEFAULT_RETAIN_COUNT = 3;
const ATTRIBUTION_COMMENT =
  "# Data source: CelesTrak (celestrak.org), Terms of Use: https://celestrak.org/terms-of-use.php";
const CELESTRAK_USER_AGENT = "scenario-globe-viewer-f7-refresh/1.0";

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

function parsePositiveInteger(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
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

function filenameUtc(isoUtc) {
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

function parseTleGroups(text, sampleLimit) {
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

function epochRangeUtc(groups) {
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

async function buildGroupSnapshot(groupKey, generatedAtUtc, sampleLimit) {
  const group = GROUPS[groupKey];
  const text = await fetchText(group.url);
  const records = parseTleGroups(text, sampleLimit);
  const body = `${records.map((record) => record.join("\n")).join("\n")}\n`;
  const path = `${groupKey}-${filenameUtc(generatedAtUtc)}.tle`;
  return {
    path,
    body,
    manifestEntry: {
      path,
      recordCount: records.length,
      epochRangeUtc: epochRangeUtc(records)
    }
  };
}

async function retainRecentSnapshots(outputDir, groupKey, retainCount) {
  const entries = await readdir(outputDir, { withFileTypes: true });
  const snapshots = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`${groupKey}-`) && name.endsWith(".tle"))
    .sort()
    .reverse();
  for (const name of snapshots.slice(retainCount)) {
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

  if (args["no-network"]) {
    const manifestPath = join(outputDir, "manifest.json");
    const manifest = await readFile(manifestPath, "utf8");
    console.log(manifest);
    return;
  }

  const generatedAtUtc = new Date().toISOString();
  const snapshots = new Map();
  const priorManifest = groups.length < Object.keys(GROUPS).length
    ? await readExistingManifest(outputDir)
    : null;
  const manifest = {
    ...(priorManifest ?? {}),
    comment: ATTRIBUTION_COMMENT,
    generatedAtUtc
  };

  for (const groupKey of groups) {
    const snapshot = await buildGroupSnapshot(groupKey, generatedAtUtc, sampleLimit);
    snapshots.set(groupKey, snapshot);
    manifest[groupKey] = snapshot.manifestEntry;
  }
  for (const groupKey of Object.keys(GROUPS)) {
    if (!manifest[groupKey]) {
      throw new Error(
        `Manifest missing ${groupKey}; run without --groups first or include all groups.`
      );
    }
  }

  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  if (args["dry-run"]) {
    console.log(manifestText);
    return;
  }

  await mkdir(outputDir, { recursive: true });
  for (const [groupKey, snapshot] of snapshots) {
    await writeFile(join(outputDir, snapshot.path), snapshot.body, "utf8");
    await retainRecentSnapshots(outputDir, groupKey, retainCount);
  }
  await writeFile(join(outputDir, "manifest.json"), manifestText, "utf8");
  console.log(
    JSON.stringify(
      {
        outputDir,
        manifestPath: join(outputDir, "manifest.json"),
        groups
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
