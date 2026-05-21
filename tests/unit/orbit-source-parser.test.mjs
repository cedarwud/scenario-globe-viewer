import { test } from "node:test";
import { strict as assert } from "node:assert";

import {
  parseOrbitSourceText,
  toRuntimeOrbitRecords,
  toTleRecords
} from "../../src/features/multi-station-selector/orbit-source-parser.ts";

const TLE_TEXT = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26138.00000000  .00010000  00000+0  10000-3 0  9991",
  "2 25544  51.6400 120.0000 0006000  40.0000  80.0000 15.50000000400000"
].join("\n");

const OMM_ROW = {
  OBJECT_NAME: "GP DEMO 123456",
  OBJECT_ID: "2026-001A",
  NORAD_CAT_ID: 123456,
  CLASSIFICATION_TYPE: "U",
  EPOCH: "2026-05-17T00:00:00.000",
  MEAN_MOTION: 15.5,
  ECCENTRICITY: 0.0006,
  INCLINATION: 51.64,
  RA_OF_ASC_NODE: 120,
  ARG_OF_PERICENTER: 40,
  MEAN_ANOMALY: 80,
  EPHEMERIS_TYPE: 0,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 40000,
  BSTAR: 0.0001,
  MEAN_MOTION_DOT: 0.0001,
  MEAN_MOTION_DDOT: 0
};

const OMM_CSV = [
  "OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,CLASSIFICATION_TYPE,EPOCH,MEAN_MOTION,ECCENTRICITY,INCLINATION,RA_OF_ASC_NODE,ARG_OF_PERICENTER,MEAN_ANOMALY,EPHEMERIS_TYPE,ELEMENT_SET_NO,REV_AT_EPOCH,BSTAR,MEAN_MOTION_DOT,MEAN_MOTION_DDOT",
  "GP DEMO 123456,2026-001A,123456,U,2026-05-17T00:00:00.000,15.5,0.0006,51.64,120,40,80,0,999,40000,0.0001,0.0001,0"
].join("\n");

test("legacy TLE source parses into TLE records and legacy metadata", () => {
  const parsed = parseOrbitSourceText(TLE_TEXT, { orbitClass: "LEO" });

  assert.equal(parsed.format, "tle-3le");
  assert.equal(parsed.apiClass, "celestrak-gp-tle");
  assert.equal(parsed.catalogNumberCompatibility, "tle-limited-5-digit-catalog");
  assert.equal(parsed.stats.rawRecordGroupCount, 1);
  assert.equal(parsed.stats.parsedRecordCount, 1);
  assert.equal(parsed.stats.parserFailureCount, 0);
  assert.equal(parsed.records[0].noradCatalogId, 25544);
  assert.equal(toTleRecords(parsed.records).length, 1);
});

test("OMM JSON source parses and preserves a 6-digit catalog number", () => {
  const parsed = parseOrbitSourceText(JSON.stringify([OMM_ROW]), {
    orbitClass: "LEO",
    format: "omm-json",
    sourcePolicy: "refresh-artifact"
  });

  assert.equal(parsed.format, "omm-json");
  assert.equal(parsed.apiClass, "celestrak-gp");
  assert.equal(parsed.sourcePolicy, "refresh-artifact");
  assert.equal(parsed.catalogNumberCompatibility, "omm-nine-digit-catalog-capable");
  assert.equal(parsed.stats.parsedRecordCount, 1);
  assert.equal(parsed.stats.parserFailureCount, 0);
  assert.equal(parsed.records[0].noradCatalogId, 123456);
  assert.deepEqual(parsed.stats.noradIdRangeSummary, [
    { start: 123456, end: 123456, count: 1 }
  ]);
  const runtimeRecords = toRuntimeOrbitRecords(parsed.records);
  assert.equal(runtimeRecords.length, 1);
  assert.equal(runtimeRecords[0].format, "omm-json");
  assert.equal(runtimeRecords[0].noradCatalogId, 123456);
  assert.equal(runtimeRecords[0].ommFields.NORAD_CAT_ID, 123456);
  assert.equal(toTleRecords(parsed.records).length, 0);
});

test("OMM CSV source parses with the same metadata as OMM JSON and converts to runtime records", () => {
  const parsed = parseOrbitSourceText(OMM_CSV, {
    orbitClass: "LEO",
    format: "omm-csv",
    sourcePolicy: "refresh-artifact"
  });

  assert.equal(parsed.format, "omm-csv");
  assert.equal(parsed.apiClass, "celestrak-gp");
  assert.equal(parsed.catalogNumberCompatibility, "omm-nine-digit-catalog-capable");
  assert.equal(parsed.stats.parsedRecordCount, 1);
  assert.equal(parsed.stats.parserFailureCount, 0);
  assert.equal(parsed.records[0].noradCatalogId, 123456);
  const runtimeRecords = toRuntimeOrbitRecords(parsed.records);
  assert.equal(runtimeRecords.length, 1);
  assert.equal(runtimeRecords[0].format, "omm-csv");
  assert.equal(runtimeRecords[0].noradCatalogId, 123456);
  assert.equal(runtimeRecords[0].ommFields.NORAD_CAT_ID, "123456");
  assert.equal(toTleRecords(parsed.records).length, 0);
});

test("malformed TLE input increments parser failure count", () => {
  const parsed = parseOrbitSourceText("BROKEN\n1 25544U\nnot-line-2\n", {
    orbitClass: "LEO",
    format: "tle-3le"
  });

  assert.equal(parsed.stats.parsedRecordCount, 0);
  assert.equal(parsed.stats.parserFailureCount, 1);
});

test("malformed OMM input increments parser failure count or rejects explicitly", () => {
  const malformed = parseOrbitSourceText(
    JSON.stringify([{ OBJECT_NAME: "missing required orbit fields" }]),
    { orbitClass: "LEO", format: "omm-json" }
  );

  assert.equal(malformed.stats.parsedRecordCount, 0);
  assert.equal(malformed.stats.parserFailureCount, 1);
  assert.throws(
    () => parseOrbitSourceText("{not json", { orbitClass: "LEO", format: "omm-json" }),
    /JSON/
  );
});

test("mixed OMM JSON source keeps valid rows and counts invalid rows", () => {
  const parsed = parseOrbitSourceText(
    JSON.stringify([OMM_ROW, { OBJECT_NAME: "missing required orbit fields" }]),
    {
      orbitClass: "LEO",
      format: "omm-json",
      sourcePolicy: "refresh-artifact"
    }
  );

  assert.equal(parsed.stats.parsedRecordCount, 1);
  assert.equal(parsed.stats.parserFailureCount, 1);
  assert.equal(parsed.records[0].noradCatalogId, 123456);
});
