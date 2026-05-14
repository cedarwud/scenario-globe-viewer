import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const GPS_OPS_SOURCE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle";
const GALILEO_SOURCE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle";
const GEO_SOURCE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle";

const GEO_CAP = 30;
const outputRoot = path.join(repoRoot, "public/fixtures/satellites/multi-orbit");

const commercialGeoNamePatterns = [
  /^ABS[-\s]/iu,
  /^AMC[-\s]/iu,
  /^AMAZONAS/iu,
  /^ANIK/iu,
  /^APSTAR/iu,
  /^ARABSAT/iu,
  /^ASIASTAR/iu,
  /^ASIASAT/iu,
  /^ASTRA/iu,
  /^BADR/iu,
  /^CHINASAT/iu,
  /^DIRECTV/iu,
  /^ECHOSTAR/iu,
  /^EUTELSAT/iu,
  /^EXPRESS/iu,
  /^GALAXY/iu,
  /^HISPASAT/iu,
  /^HOTBIRD/iu,
  /^INMARSAT/iu,
  /^INTELSAT/iu,
  /^JCSAT/iu,
  /^KOREASAT/iu,
  /^LAOSAT/iu,
  /^MEASAT/iu,
  /^NIGCOMSAT/iu,
  /^NILESAT/iu,
  /^NIMIQ/iu,
  /^NSS[-\s]/iu,
  /^OPTUS/iu,
  /^SES[-\s]/iu,
  /^SKY/iu,
  /^TELSTAR/iu,
  /^THAICOM/iu,
  /^TURKSAT/iu,
  /^VINASAT/iu,
  /^YAHSAT/iu,
  /^YAMAL/iu
];

const excludedGeoNamePatterns = [
  /\bAKM\b/iu,
  /\bDEB\b/iu,
  /\bDSP\b/iu,
  /\bFLTSATCOM\b/iu,
  /\bMILSTAR\b/iu,
  /\bPKM\b/iu,
  /\bR\/B\b/iu,
  /\bSBIRS\b/iu,
  /\bTDRS\b/iu,
  /\bUFO\b/iu,
  /\bUSA\b/iu,
  /\bWGS\b/iu,
  /^SKYNET\b/iu
];

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

function normalizeCapturedAt(value) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), "--captured-at must be an ISO 8601 timestamp.");
  return new Date(parsed).toISOString();
}

function toFileTimestamp(isoTimestamp) {
  return isoTimestamp.replace(/:/g, "-").replace(/\.\d{3}Z$/u, "Z");
}

function parseTleRecords(tleText, sourceId) {
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
      `Malformed TLE near non-empty line ${index + 1} in ${sourceId}.`
    );

    const noradId = Number.parseInt(line1.slice(2, 7), 10);
    assert(Number.isInteger(noradId), `Missing NORAD id for ${name ?? line1}.`);

    const fields = line2.trim().split(/\s+/u);
    const meanMotionRevPerDay = Number.parseFloat(fields[7] ?? "");
    assert(
      Number.isFinite(meanMotionRevPerDay),
      `Missing mean motion for ${name ?? `SAT-${noradId}`} in ${sourceId}.`
    );

    records.push({
      name: name ?? `SAT-${noradId}`,
      line1,
      line2,
      noradId,
      meanMotionRevPerDay,
      sourceId
    });
    index += 2;
  }

  assert(records.length > 0, `${sourceId} input TLE did not contain any records.`);
  return records;
}

function deriveOrbitClass(meanMotionRevPerDay) {
  if (meanMotionRevPerDay > 11) {
    return "leo";
  }

  if (meanMotionRevPerDay >= 0.9 && meanMotionRevPerDay <= 1.1) {
    return "geo";
  }

  if (meanMotionRevPerDay > 1.1 && meanMotionRevPerDay <= 11) {
    return "meo";
  }

  return "out-of-scope";
}

function isCommercialGeoRecord(record) {
  return (
    deriveOrbitClass(record.meanMotionRevPerDay) === "geo" &&
    commercialGeoNamePatterns.some((pattern) => pattern.test(record.name)) &&
    !excludedGeoNamePatterns.some((pattern) => pattern.test(record.name))
  );
}

function sortByNoradThenName(left, right) {
  return left.noradId - right.noradId || left.name.localeCompare(right.name);
}

function dedupeRecords(records) {
  const seen = new Set();
  const deduped = [];
  let duplicateCount = 0;

  for (const record of records) {
    if (seen.has(record.noradId)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(record.noradId);
    deduped.push(record);
  }

  return {
    deduped,
    duplicateCount
  };
}

function formatRecords(records) {
  return `${records
    .flatMap((record) => [record.name, record.line1, record.line2])
    .join("\n")}\n`;
}

function writeJson(filePath, payload) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeReadme() {
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(
    path.join(outputRoot, "README.md"),
    `# M8A V4.13 Multi-Orbit Public TLE Fixtures

These fixtures are copied public Celestrak GP/TLE subsets for the bounded
Phase 7.1 multi-orbit viewer gate.

- LEO remains sourced from \`public/fixtures/satellites/leo-scale/\`.
- MEO uses \`gps-ops\` plus \`galileo\` catalogs.
- GEO uses a deterministic top-${GEO_CAP} active commercial subset from the
  Celestrak \`geo\` catalog.

These files are not customer orbit-model data, measured network truth,
radio-layer handover evidence, or external validation closure.
`,
    "utf8"
  );
}

function writeCatalog(outputDir, fixtureFile, records) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, fixtureFile), formatRecords(records), "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const gpsInput = options["gps-ops-input"];
  const galileoInput = options["galileo-input"];
  const geoInput = options["geo-input"];
  assert(typeof gpsInput === "string" && gpsInput.length > 0, "--gps-ops-input is required.");
  assert(typeof galileoInput === "string" && galileoInput.length > 0, "--galileo-input is required.");
  assert(typeof geoInput === "string" && geoInput.length > 0, "--geo-input is required.");

  const capturedAt = normalizeCapturedAt(options["captured-at"] ?? new Date().toISOString());
  const fileTimestamp = toFileTimestamp(capturedAt);
  const meoOutputDir = path.join(outputRoot, "meo");
  const geoOutputDir = path.join(outputRoot, "geo");

  const gpsRecords = parseTleRecords(readFileSync(gpsInput, "utf8"), "gps-ops");
  const galileoRecords = parseTleRecords(readFileSync(galileoInput, "utf8"), "galileo");
  const geoRecords = parseTleRecords(readFileSync(geoInput, "utf8"), "geo");

  const gpsMeoRecords = gpsRecords
    .filter((record) => deriveOrbitClass(record.meanMotionRevPerDay) === "meo")
    .toSorted(sortByNoradThenName);
  const galileoMeoRecords = galileoRecords
    .filter((record) => deriveOrbitClass(record.meanMotionRevPerDay) === "meo")
    .toSorted(sortByNoradThenName);
  const meoDedupe = dedupeRecords([...gpsMeoRecords, ...galileoMeoRecords]);
  assert(
    meoDedupe.deduped.length >= 30,
    `MEO fixture needs at least 30 records, got ${meoDedupe.deduped.length}.`
  );

  const commercialGeoRecords = geoRecords
    .filter(isCommercialGeoRecord)
    .toSorted(sortByNoradThenName)
    .slice(0, GEO_CAP);
  assert(
    commercialGeoRecords.length >= 20,
    `GEO fixture needs at least 20 records, got ${commercialGeoRecords.length}.`
  );

  const gpsFixtureFile = `gps-ops-${fileTimestamp}.tle`;
  const galileoFixtureFile = `galileo-${fileTimestamp}.tle`;
  const geoFixtureFile = `commercial-geo-top30-${fileTimestamp}.tle`;

  const gpsFixtureRecords = meoDedupe.deduped.filter(
    (record) => record.sourceId === "gps-ops"
  );
  const galileoFixtureRecords = meoDedupe.deduped.filter(
    (record) => record.sourceId === "galileo"
  );

  writeReadme();
  writeCatalog(meoOutputDir, gpsFixtureFile, gpsFixtureRecords);
  writeCatalog(meoOutputDir, galileoFixtureFile, galileoFixtureRecords);
  writeCatalog(geoOutputDir, geoFixtureFile, commercialGeoRecords);

  writeJson(path.join(meoOutputDir, "provenance.json"), {
    schemaVersion: "itri-v4.13-multi-orbit-fixture-provenance.v1",
    orbitClass: "meo",
    capturedAt,
    epochCount: meoDedupe.deduped.length,
    targetCount: 30,
    sourceSet: ["gps-ops", "galileo"],
    catalogs: [
      {
        sourceId: "gps-ops",
        source: "Celestrak",
        sourceUrl: GPS_OPS_SOURCE_URL,
        fixtureFile: gpsFixtureFile,
        rawRecordCount: gpsRecords.length,
        epochCount: gpsFixtureRecords.length
      },
      {
        sourceId: "galileo",
        source: "Celestrak",
        sourceUrl: GALILEO_SOURCE_URL,
        fixtureFile: galileoFixtureFile,
        rawRecordCount: galileoRecords.length,
        epochCount: galileoFixtureRecords.length
      }
    ],
    dedupePolicy:
      "source order gps-ops then galileo; duplicate NORAD catalog ids skipped with earlier source precedence",
    duplicateNoradSkipped: meoDedupe.duplicateCount,
    classTagDerivation:
      "meanMotionRevPerDay > 11 => leo; 0.9..1.1 => geo; >1.1..11 => meo; out-of-band records are outside this gate",
    subsetPolicy:
      "deterministic public MEO catalog set; all gps-ops and galileo records matching the V4.13 MEO mean-motion rule are retained",
    renderPolicy:
      "one current SGP4-propagated point primitive per copied TLE; no labels, paths, polylines, or orbit-history accumulation in multi-orbit-scale-points mode",
    licenseNote:
      "Celestrak public GP/TLE data copied for bounded repo validation. This fixture is not customer authority data, live network truth, active satellite path truth, or measured performance truth."
  });

  writeJson(path.join(geoOutputDir, "provenance.json"), {
    schemaVersion: "itri-v4.13-multi-orbit-fixture-provenance.v1",
    orbitClass: "geo",
    capturedAt,
    epochCount: commercialGeoRecords.length,
    targetCount: 20,
    sourceSet: ["geo"],
    catalogs: [
      {
        sourceId: "geo-commercial-top30",
        source: "Celestrak",
        sourceUrl: GEO_SOURCE_URL,
        fixtureFile: geoFixtureFile,
        rawRecordCount: geoRecords.length,
        commercialCandidateCount: geoRecords.filter(isCommercialGeoRecord).length,
        epochCount: commercialGeoRecords.length
      }
    ],
    classTagDerivation:
      "meanMotionRevPerDay > 11 => leo; 0.9..1.1 => geo; >1.1..11 => meo; out-of-band records are outside this gate",
    subsetPolicy:
      `deterministic top-${GEO_CAP} active commercial GEO records sorted by NORAD catalog id; excludes obvious debris, rocket bodies, transfer objects, and military/government-only names by repo-owned name filters`,
    renderPolicy:
      "one current SGP4-propagated point primitive per copied TLE; no labels, paths, polylines, or orbit-history accumulation in multi-orbit-scale-points mode",
    licenseNote:
      "Celestrak public GP/TLE data copied for bounded repo validation. This fixture is not customer authority data, live network truth, active satellite path truth, or measured performance truth."
  });

  console.log(
    `Wrote MEO fixture with ${meoDedupe.deduped.length} records (${gpsFixtureRecords.length} gps-ops, ${galileoFixtureRecords.length} galileo).`
  );
  console.log(`Wrote GEO fixture with ${commercialGeoRecords.length} records.`);
}

main();
