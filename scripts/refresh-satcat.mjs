#!/usr/bin/env node
// Build-time CelesTrak SATCAT summarizer for SDD Slice F7.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_OUTPUT_DIR = "public/fixtures/satellites-network";
const SATCAT_CSV_URL = "https://celestrak.org/pub/satcat.csv";
const SUMMARY_FILENAME = "satcat-summary.json";
const CELESTRAK_USER_AGENT = "scenario-globe-viewer-f7-refresh/1.0";

const REQUIRED_COLUMNS = [
  "OBJECT_NAME",
  "OBJECT_ID",
  "NORAD_CAT_ID",
  "OBJECT_TYPE",
  "OPS_STATUS_CODE",
  "OWNER",
  "DECAY_DATE",
  "PERIOD",
  "APOGEE",
  "PERIGEE"
];

const OPERATOR_ALIASES = [
  { family: "STARLINK", constellation: "STARLINK", name: /\bSTARLINK\b/ },
  { family: "ONEWEB", constellation: "ONEWEB", name: /\bONEWEB\b|EUTELSAT ONEWEB/ },
  { family: "GPS", constellation: "GPS", name: /\bGPS\b|\bNAVSTAR\b/ },
  { family: "GALILEO", constellation: "GALILEO", name: /\bGALILEO\b|\bGSAT0/ },
  { family: "GLONASS", constellation: "GLONASS", name: /\bGLONASS\b/ },
  { family: "BEIDOU", constellation: "BEIDOU", name: /\bBEIDOU\b/ },
  { family: "QZSS", constellation: "QZSS", name: /\bQZS\b|\bQZSS\b/ },
  { family: "NAVIC", constellation: "NAVIC", name: /\bIRNSS\b|\bNVS-/ },
  { family: "SES", constellation: "SES", name: /\bSES\b/, owners: ["SES"] },
  { family: "EUTELSAT", constellation: "EUTELSAT", name: /\bEUTELSAT\b/, owners: ["EUTE"] },
  { family: "INTELSAT", constellation: "INTELSAT", name: /\bINTELSAT\b/, owners: ["ITSO"] },
  { family: "INMARSAT", constellation: "INMARSAT", name: /\bINMARSAT\b/, owners: ["IM"] },
  { family: "VIASAT", constellation: "VIASAT", name: /\bVIASAT\b/ },
  { family: "TDRS", constellation: "TDRS", name: /\bTDRS\b/ },
  { family: "US_GOV", constellation: "US_GOV", name: /\bMILSTAR\b|\bUFO\b|\bUSA\b/ }
];

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

function parseCsvRows(text) {
  const rows = [];
  let row = [];
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
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((rowValue) => rowValue.some((cellValue) => cellValue.length > 0));
}

function parseCsvRecords(text) {
  const rows = parseCsvRows(text);
  const header = rows[0] ?? [];
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`SATCAT CSV missing required column ${column}`);
    }
  }
  return rows.slice(1).map((row) => {
    const record = {};
    header.forEach((column, index) => {
      record[column] = row[index] ?? "";
    });
    return record;
  });
}

function parseNoradIdFromTleLine(line) {
  if (!line.startsWith("1 ")) {
    return null;
  }
  const parsed = Number.parseInt(line.slice(2, 7).trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

async function readManifestNoradIds(outputDir) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8"));
  } catch {
    return new Set();
  }
  const ids = new Set();
  for (const groupKey of ["leo", "meo", "geo"]) {
    const path = manifest[groupKey]?.path;
    if (typeof path !== "string") {
      continue;
    }
    const text = await readFile(join(outputDir, path), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const id = parseNoradIdFromTleLine(line.trim());
      if (id !== null) {
        ids.add(id);
      }
    }
  }
  return ids;
}

function inferOperator(row) {
  const name = row.OBJECT_NAME.toUpperCase();
  const owner = row.OWNER.toUpperCase();
  const alias = OPERATOR_ALIASES.find(
    (entry) =>
      entry.name.test(name) || (entry.owners ?? []).includes(owner)
  );
  if (alias) {
    return {
      operatorFamily: alias.family,
      constellationName: alias.constellation
    };
  }
  const fallback = owner || "UNKNOWN";
  return {
    operatorFamily: fallback,
    constellationName: fallback
  };
}

function classifyOrbit(row) {
  const period = Number.parseFloat(row.PERIOD);
  const apogee = Number.parseFloat(row.APOGEE);
  const perigee = Number.parseFloat(row.PERIGEE);
  if (
    (Number.isFinite(period) && period >= 1200 && period <= 1600) ||
    (Number.isFinite(apogee) && apogee >= 30_000) ||
    (Number.isFinite(perigee) && perigee >= 30_000)
  ) {
    return "GEO";
  }
  if (
    (Number.isFinite(period) && period >= 240) ||
    (Number.isFinite(apogee) && apogee >= 2_000) ||
    (Number.isFinite(perigee) && perigee >= 2_000)
  ) {
    return "MEO";
  }
  return "LEO";
}

async function fetchSatcatCsv() {
  const response = await fetch(SATCAT_CSV_URL, {
    headers: { "User-Agent": CELESTRAK_USER_AGENT }
  });
  if (!response.ok) {
    throw new Error(`SATCAT fetch failed ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function buildSummary(records, noradFilter) {
  const hasFilter = noradFilter.size > 0;
  return records
    .map((row) => {
      const noradId = Number.parseInt(row.NORAD_CAT_ID, 10);
      if (!Number.isInteger(noradId) || (hasFilter && !noradFilter.has(noradId))) {
        return null;
      }
      const operator = inferOperator(row);
      return {
        noradId,
        objectName: row.OBJECT_NAME,
        operatorFamily: operator.operatorFamily,
        constellationName: operator.constellationName,
        orbitClass: classifyOrbit(row),
        decayDate: row.DECAY_DATE || null
      };
    })
    .filter((entry) => entry !== null)
    .sort((left, right) => left.noradId - right.noradId);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolve(args["output-dir"] ?? DEFAULT_OUTPUT_DIR);
  if (args["no-network"] && !args["offline-cached"]) {
    console.error("--no-network requires explicit --offline-cached");
    process.exit(1);
  }
  if (args["no-network"]) {
    console.log(await readFile(join(outputDir, SUMMARY_FILENAME), "utf8"));
    return;
  }

  const [csvText, noradFilter] = await Promise.all([
    fetchSatcatCsv(),
    readManifestNoradIds(outputDir)
  ]);
  const summary = buildSummary(parseCsvRecords(csvText), noradFilter);
  if (summary.length === 0) {
    throw new Error("SATCAT summary would be empty");
  }
  const text = `${JSON.stringify(summary)}\n`;
  if (args["dry-run"]) {
    console.log(text);
    return;
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, SUMMARY_FILENAME), text, "utf8");
  console.log(
    JSON.stringify(
      {
        outputDir,
        summaryPath: join(outputDir, SUMMARY_FILENAME),
        recordCount: summary.length,
        filteredToManifestNoradIds: noradFilter.size > 0
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
