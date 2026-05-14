import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_CAP = 600;
const DEFAULT_SOURCE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle";
const outputRoot = path.join(repoRoot, "public/fixtures/satellites/leo-scale");

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value), 10);
  assert(Number.isInteger(parsed) && parsed > 0, `${label} must be a positive integer.`);
  return parsed;
}

function normalizeCapturedAt(value) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), "--captured-at must be an ISO 8601 timestamp.");
  return new Date(parsed).toISOString();
}

function toFileTimestamp(isoTimestamp) {
  return isoTimestamp.replace(/:/g, "-").replace(/\.\d{3}Z$/u, "Z");
}

function parseTleRecords(tleText) {
  const lines = tleText
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const records = [];

  for (let index = 0; index < lines.length; ) {
    let name;
    if (!lines[index]?.startsWith("1 ")) {
      name = lines[index].trim();
      index += 1;
    }

    const line1 = lines[index];
    const line2 = lines[index + 1];
    assert(
      line1?.startsWith("1 ") && line2?.startsWith("2 "),
      `Malformed TLE near non-empty line ${index + 1}.`
    );

    const noradId = Number.parseInt(line1.slice(2, 7), 10);
    assert(Number.isInteger(noradId), `Missing NORAD id for ${name ?? line1}.`);

    records.push({
      name: name ?? `SAT-${noradId}`,
      line1,
      line2,
      noradId
    });
    index += 2;
  }

  assert(records.length > 0, "Input TLE file did not contain any records.");
  return records;
}

function formatRecords(records) {
  return `${records
    .flatMap((record) => [record.name, record.line1, record.line2])
    .join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const input = options.input;
  assert(typeof input === "string" && input.length > 0, "--input is required.");

  const cap =
    options.cap === undefined
      ? DEFAULT_CAP
      : parsePositiveInteger(options.cap, "--cap");
  const capturedAt = normalizeCapturedAt(options["captured-at"] ?? new Date().toISOString());
  const sourceUrl =
    typeof options["source-url"] === "string" && options["source-url"].length > 0
      ? options["source-url"]
      : DEFAULT_SOURCE_URL;

  const records = parseTleRecords(readFileSync(input, "utf8"));
  assert(
    records.length >= cap,
    `Input TLE record count ${records.length} is below requested cap ${cap}.`
  );

  const subset = records
    .toSorted((left, right) => left.noradId - right.noradId || left.name.localeCompare(right.name))
    .slice(0, cap);
  const fixtureFile = `starlink-${toFileTimestamp(capturedAt)}.tle`;
  const fixturePath = path.join(outputRoot, fixtureFile);
  const provenancePath = path.join(outputRoot, "provenance.json");

  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(fixturePath, formatRecords(subset), "utf8");
  writeFileSync(
    provenancePath,
    `${JSON.stringify(
      {
        schemaVersion: "itri-f13-leo-scale-fixture-provenance.v1",
        source: "Celestrak",
        sourceUrl,
        capturedAt,
        fixtureFile,
        rawRecordCount: records.length,
        epochCount: subset.length,
        orbitClass: "leo",
        subsetPolicy: `deterministic first ${cap} records sorted by NORAD catalog id`,
        renderPolicy:
          "one current SGP4-propagated point primitive per copied TLE; no labels, paths, polylines, or orbit-history accumulation in leo-scale-points mode",
        refreshPolicy:
          "ad-hoc explicit refresh only; rerun this script after fetching a new Celestrak export and rerun Phase 7.1 validation",
        licenseNote:
          "Celestrak public GP/TLE data copied for bounded repo validation. This fixture is not customer authority data, live network truth, active satellite path truth, or measured performance truth."
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    `Wrote ${path.relative(repoRoot, fixturePath)} with ${subset.length}/${records.length} records.`
  );
  console.log(`Wrote ${path.relative(repoRoot, provenancePath)}.`);
}

main();
