// WS-E E1 coverage for the visibility geometry pipeline: the ENU look-angle /
// window-collapse path (computeVisibilityWindowsForStation) and the pair-window
// intersection (intersectStationWindowsForPair). These feed every comm-time and
// handover figure the demo renders, yet had no numeric unit coverage.
import test from "node:test";
import assert from "node:assert/strict";

import {
  computeVisibilityWindowsForStation,
  computeVisibilityWindowsForStationWithStats,
  intersectStationWindowsForPair,
} from "../../src/features/multi-station-selector/visibility-utils.ts";
import { parseRuntimeOrbitSources } from "../../src/features/multi-station-selector/runtime-projection.ts";
import reference from "../golden/sgp4-reference-vectors.json" with { type: "json" };

function tleText(orbitClass) {
  const sat = reference.samples.find((s) => s.orbitClass === orbitClass);
  return `${sat.label}\n${sat.line1}\n${sat.line2}`;
}

const SOURCES = {
  leoTleText: tleText("LEO"),
  meoTleText: tleText("MEO"),
  geoTleText: tleText("GEO"),
  sourceMode: "local-snapshot",
};
const RECORDS = parseRuntimeOrbitSources(SOURCES);
const LEO_RECORD = RECORDS.filter((r) => r.orbitClass === "LEO");
const SVALBARD = { lat: 78.23, lon: 15.39, altMeters: 480 }; // KSAT SvalSat — polar, sees OneWeb
const WINDOW = { startUtc: "2026-05-17T00:00:00.000Z", endUtc: "2026-05-17T03:00:00.000Z" };

test("polar OneWeb pass over Svalbard yields a window with physical elevation", () => {
  const windows = computeVisibilityWindowsForStation(SVALBARD, LEO_RECORD, {
    ...WINDOW,
    stepSeconds: 30,
    elevationThresholdDeg: 10,
  });
  const sat = LEO_RECORD[0];
  const passes = windows.get(sat.satelliteId) ?? [];
  assert.ok(passes.length >= 1, "polar OneWeb should rise over Svalbard at least once in 3 h");
  for (const w of passes) {
    assert.ok(w.maxElevationDeg > 10 && w.maxElevationDeg <= 90, `elevation ${w.maxElevationDeg} out of band`);
    assert.ok(Date.parse(w.startUtc) < Date.parse(w.endUtc), "window end after start");
    assert.ok(Date.parse(w.startUtc) >= Date.parse(WINDOW.startUtc) - 30_000);
    assert.ok(Date.parse(w.endUtc) <= Date.parse(WINDOW.endUtc) + 30_000);
  }
});

test("raising the elevation threshold cannot increase pass count or duration", () => {
  const sat = LEO_RECORD[0].satelliteId;
  const low = (computeVisibilityWindowsForStation(SVALBARD, LEO_RECORD, { ...WINDOW, stepSeconds: 30, elevationThresholdDeg: 5 }).get(sat) ?? []);
  const high = (computeVisibilityWindowsForStation(SVALBARD, LEO_RECORD, { ...WINDOW, stepSeconds: 30, elevationThresholdDeg: 40 }).get(sat) ?? []);
  const dur = (ws) => ws.reduce((s, w) => s + (Date.parse(w.endUtc) - Date.parse(w.startUtc)), 0);
  assert.ok(dur(high) <= dur(low), "a stricter elevation gate must not lengthen visibility");
});

test("propagation stats account for every attempted sample", () => {
  const { propagationStatsBySatellite } = computeVisibilityWindowsForStationWithStats(SVALBARD, LEO_RECORD, {
    ...WINDOW,
    stepSeconds: 60,
    elevationThresholdDeg: 10,
  });
  const stats = propagationStatsBySatellite.get(LEO_RECORD[0].satelliteId);
  assert.ok(stats);
  assert.equal(stats.attemptedSampleCount, stats.propagatedSampleCount + stats.failedSampleCount);
  assert.ok(stats.propagatedSampleCount > 0, "a valid TLE should propagate");
});

test("intersectStationWindowsForPair returns the overlap of per-station windows", () => {
  const records = [{ satelliteId: "sat-1", orbitClass: "LEO" }];
  const a = new Map([["sat-1", [{ startUtc: "2026-05-17T00:00:00.000Z", endUtc: "2026-05-17T00:10:00.000Z", maxElevationDeg: 40 }]]]);
  const b = new Map([["sat-1", [{ startUtc: "2026-05-17T00:05:00.000Z", endUtc: "2026-05-17T00:20:00.000Z", maxElevationDeg: 30 }]]]);
  const pair = intersectStationWindowsForPair(a, b, records);
  assert.equal(pair.length, 1);
  assert.equal(pair[0].intersectionStartUtc, "2026-05-17T00:05:00.000Z");
  assert.equal(pair[0].intersectionEndUtc, "2026-05-17T00:10:00.000Z");
  assert.equal(pair[0].orbitClass, "LEO");
});

test("intersectStationWindowsForPair drops non-overlapping windows", () => {
  const records = [{ satelliteId: "sat-1", orbitClass: "LEO" }];
  const a = new Map([["sat-1", [{ startUtc: "2026-05-17T00:00:00.000Z", endUtc: "2026-05-17T00:05:00.000Z", maxElevationDeg: 40 }]]]);
  const b = new Map([["sat-1", [{ startUtc: "2026-05-17T00:10:00.000Z", endUtc: "2026-05-17T00:15:00.000Z", maxElevationDeg: 30 }]]]);
  assert.equal(intersectStationWindowsForPair(a, b, records).length, 0);
  // a satellite visible to only one station never produces a pair window
  const onlyA = new Map([["sat-2", [{ startUtc: "2026-05-17T00:00:00.000Z", endUtc: "2026-05-17T00:05:00.000Z", maxElevationDeg: 40 }]]]);
  assert.equal(intersectStationWindowsForPair(onlyA, new Map(), [{ satelliteId: "sat-2", orbitClass: "LEO" }]).length, 0);
});
