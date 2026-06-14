// WS-E E1 end-to-end invariant coverage for computeRuntimeProjection — the
// handover engine + communication-time aggregation. These are fixture-coupled
// (exact counts move when the TLE snapshot is refreshed), so this test asserts
// REFRESH-ROBUST INVARIANTS rather than golden counts: the audit-verified
// "handover count excludes the initial acquisition" rule, comm-time consistency,
// and mean-dwell derivation.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { computeRuntimeProjection, parseRuntimeOrbitSources } from "../../src/features/multi-station-selector/runtime-projection.ts";
import registry from "../../public/fixtures/ground-stations/multi-orbit-public-registry.json" with { type: "json" };

// Two co-located polar KSAT stations -> OneWeb LEOs are mutually visible -> the
// handover engine actually fires (these are the same pair the legacy
// manifest-compat test uses).
const stationA = registry.stations.find((s) => s.id === "ksat-svalsat-svalbard");
const stationB = registry.stations.find((s) => s.id === "ksat-tromso");

// First ~12 OneWeb satellites from the bundled snapshot (3 lines each).
const leoFixture = readFileSync(
  fileURLToPath(new URL("../../public/fixtures/satellites-network/leo-latest.tle", import.meta.url)),
  "utf8",
);
const leoText = leoFixture.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 36).join("\n");

const records = parseRuntimeOrbitSources({ leoTleText: leoText, meoTleText: "", geoTleText: "", sourceMode: "local-snapshot" });

const result = computeRuntimeProjection({
  stationA,
  stationB,
  timeWindow: { startUtc: "2026-05-17T00:00:00.000Z", endUtc: "2026-05-17T03:00:00.000Z" },
  tleRecords: records,
  sampleStepSeconds: 60,
  elevationThresholdDeg: 5,
});

test("the two-station pair is set up to exercise the handover engine", () => {
  assert.ok(stationA && stationB, "both KSAT stations present in registry");
  assert.ok(records.length >= 8, "enough LEO records to allow cross-satellite handover");
  assert.ok(result.visibilityWindows.length >= 1, "expected at least one mutual-visibility window");
});

test("handover count excludes the initial acquisition (fromSatelliteId === null)", () => {
  const acquisitions = result.handoverEvents.filter((e) => e.fromSatelliteId === null).length;
  const transitions = result.handoverEvents.filter((e) => e.fromSatelliteId !== null).length;
  // countServingTransitions counts only events with a real predecessor.
  assert.equal(result.communicationStats.handoverCount, transitions);
  if (result.handoverEvents.length > 0) {
    assert.equal(result.handoverEvents[0].fromSatelliteId, null, "first event is the initial acquisition");
    assert.ok(acquisitions >= 1, "at least one acquisition when any link is established");
  }
  assert.ok(result.communicationStats.handoverCount <= result.handoverEvents.length);
});

test("every handover event names a valid successor satellite", () => {
  const knownIds = new Set(records.map((r) => r.satelliteId));
  for (const e of result.handoverEvents) {
    assert.ok(knownIds.has(e.toSatelliteId), `unknown toSatelliteId ${e.toSatelliteId}`);
    assert.ok(e.fromSatelliteId === null || knownIds.has(e.fromSatelliteId), `unknown fromSatelliteId ${e.fromSatelliteId}`);
    assert.notEqual(e.toSatelliteId, e.fromSatelliteId, "a handover must change the serving satellite");
  }
});

test("communication time is consistent and within the scenario window", () => {
  const stats = result.communicationStats;
  const windowMs = Date.parse("2026-05-17T03:00:00.000Z") - Date.parse("2026-05-17T00:00:00.000Z");
  assert.ok(stats.totalCommunicatingMs >= 0);
  assert.ok(stats.totalCommunicatingMs <= windowMs + 60_000, "comm time cannot exceed the window (one serving link at a time)");
  const orbitSum = Object.values(stats.byOrbit).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(orbitSum - stats.totalCommunicatingMs) <= 1, "per-orbit comm time sums to the total");
});

test("mean link dwell follows the documented derivation", () => {
  const stats = result.communicationStats;
  const expected =
    result.handoverEvents.length === 0
      ? stats.totalCommunicatingMs
      : Math.round(stats.totalCommunicatingMs / result.handoverEvents.length);
  assert.equal(stats.meanLinkDwellMs, expected);
});
