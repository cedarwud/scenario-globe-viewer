// D — physics / projection SAFETY-NET goldens for the G refactor.
//
// computeRuntimeProjection is the public seam over three internal helpers that
// previously had ZERO direct test coverage and feed the delivered side-panel /
// report / CSV numbers:
//   - buildRepresentativeLinkBudgetByOrbit  (dominant-window selection + budget)
//   - deriveHandoverEventsAtSampleStep      (the handover engine)
//   - the communication-time aggregation    (commTime / byOrbit / meanDwell)
// These goldens LOCK the exact output so the planned behavior-preserving split
// of runtime-projection.ts into sibling modules (runtime-link-budget /
// tle-selection / handover-events) is provably identical pre/post.
//
// BASIS = the COMMITTED, FROZEN pinned demo TLE snapshots declared in
// demo-scenario-config.json (public/fixtures/satellites/...), NOT
// loadDefaultTleSources(). That matters:
//   * The pinned snapshots are frozen demo geometry — date-independent, so these
//     goldens are CI-stable.
//   * loadDefaultTleSources() resolves network-snapshot (satellites-network
//     catalog) WHILE that manifest is fresh and only falls back to these pinned
//     snapshots once it goes stale — i.e. the live browser's numbers are
//     wall-clock-date-dependent. That browser path is covered by the verify:tle
//     gate (E); it is intentionally NOT what this golden locks.
//
// RE-BASELINE ONLY on a deliberate demo regen (npm run repin:demo / a frozen-
// snapshot refresh). A change here from an ordinary refactor means the refactor
// was NOT behavior-preserving — investigate, do not blindly update.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  computeRuntimeProjection,
  parseRuntimeTleSources,
  parseRuntimeOrbitSources,
  buildRuntimeTleSourceParseStats,
  SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
} from "../../src/features/multi-station-selector/runtime-projection.ts";
import { PUBLIC_REGISTRY_BY_ID } from "../../src/features/multi-station-selector/tier-inference.ts";
import config from "../../src/features/multi-station-selector/demo-scenario-config.json" with { type: "json" };

const readFixture = (publicRelativePath) =>
  readFileSync(
    fileURLToPath(new URL("../../public" + publicRelativePath, import.meta.url)),
    "utf8",
  );

const demoEndUtc = new Date(
  Date.parse(config.windowStartUtc) + config.windowDurationMinutes * 60_000,
).toISOString();

// ---------------------------------------------------------------------------
// Scenario 1 (D1): the actual pinned demo pair over the full pinned snapshots.
// Faithfully reproduces the delivered CSV path (parseRuntimeTleSources +
// buildRuntimeTleSourceParseStats + PUBLIC_REGISTRY_BY_ID + demo policy).
// Comm time is MEO-driven (33 Galileo records, under the MEO cap) so it is not
// sensitive to the LEO 600->200 ranking cap.
// ---------------------------------------------------------------------------
const demoSources = {
  leoTleText: readFixture(config.tleSnapshots.LEO),
  meoTleText: readFixture(config.tleSnapshots.MEO),
  geoTleText: readFixture(config.tleSnapshots.GEO),
  sourceMode: "local-snapshot",
  sourcePaths: config.tleSnapshots,
};
const demoResult = computeRuntimeProjection({
  stationA: PUBLIC_REGISTRY_BY_ID.get(config.stationAId),
  stationB: PUBLIC_REGISTRY_BY_ID.get(config.stationBId),
  timeWindow: { startUtc: config.windowStartUtc, endUtc: demoEndUtc },
  tleRecords: parseRuntimeTleSources(demoSources),
  tleParseStats: buildRuntimeTleSourceParseStats(demoSources),
  policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
  rainRateMmPerHour: 0,
});

test("D1 pinned demo (CHT x SANSA, 06-15 +360m): communication-time golden", () => {
  assert.deepEqual([...demoResult.sharedSupportedOrbits], ["LEO", "MEO", "GEO"]);
  assert.equal(demoResult.visibilityWindows.length, 5);
  assert.equal(demoResult.handoverEvents.length, 3);
  assert.deepEqual(demoResult.communicationStats, {
    totalCommunicatingMs: 5_160_000,
    byOrbit: { LEO: 0, MEO: 5_160_000, GEO: 0 },
    handoverCount: 0,
    meanLinkDwellMs: 1_720_000,
  });
  // All three events are fresh acquisitions (no within-link transition), so the
  // audit rule "handoverCount excludes the initial acquisition" yields 0.
  assert.equal(
    demoResult.handoverEvents.filter((e) => e.fromSatelliteId === null).length,
    3,
  );
});

test("D1 pinned demo: representative link budget is MEO-only and matches the budget golden", () => {
  // CHT (Taiwan) + SANSA (South Africa) are too far apart for LEO/GEO mutual
  // visibility above their masks; only Galileo MEO yields a representative window.
  assert.deepEqual(Object.keys(demoResult.representativeLinkBudgetByOrbit), ["MEO"]);
  const meo = demoResult.representativeLinkBudgetByOrbit.MEO;
  assert.equal(meo.representativeSatelliteId, "GSAT0102 (GALILEO-FM2)");
  assert.equal(meo.geometrySource, "sgp4-propagated-representative");
  assert.equal(meo.slantRangeKm, 27_148.416);
  assert.equal(meo.latencyMs, 92.557);
  assert.equal(meo.jitterMs, 5);
  assert.equal(meo.illustrativeThroughputMbps, 89.583);
  assert.equal(meo.totalPathLossDb, 184.764);
  assert.equal(meo.receivedPowerProxyDbm, -100.847);
});

// ---------------------------------------------------------------------------
// Scenario 2 (D2 + D3): a small, FIXED 12-satellite OneWeb slice of the pinned
// snapshot with the co-located KSAT polar pair. 12 records is well under the LEO
// ranking cap (200), so the candidate set + ranking are deterministic and the
// exact handover sequence is a safe golden (no cap-cutoff sensitivity). This is
// the "fixed small geometry" exercise of the handover engine + the LEO branch of
// buildRepresentativeLinkBudgetByOrbit.
// ---------------------------------------------------------------------------
const oneWebLines = readFixture(config.tleSnapshots.LEO)
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0);
const smallLeoText = oneWebLines.slice(0, 36).join("\n"); // 12 satellites x 3 lines
const smallEndUtc = new Date(Date.parse(config.windowStartUtc) + 180 * 60_000).toISOString();
const handoverResult = computeRuntimeProjection({
  stationA: PUBLIC_REGISTRY_BY_ID.get("ksat-svalsat-svalbard"),
  stationB: PUBLIC_REGISTRY_BY_ID.get("ksat-tromso"),
  timeWindow: { startUtc: config.windowStartUtc, endUtc: smallEndUtc },
  tleRecords: parseRuntimeOrbitSources({
    leoTleText: smallLeoText,
    meoTleText: "",
    geoTleText: "",
    sourceMode: "local-snapshot",
  }),
  policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
  rainRateMmPerHour: 0,
});

const HANDOVER_TO_SAT_SEQUENCE = [
  "ONEWEB-0006", "ONEWEB-0020", "ONEWEB-0010", "ONEWEB-0021", "ONEWEB-0023",
  "ONEWEB-0017", "ONEWEB-0008", "ONEWEB-0011", "ONEWEB-0013", "ONEWEB-0012",
  "ONEWEB-0007", "ONEWEB-0006", "ONEWEB-0020", "ONEWEB-0010", "ONEWEB-0023",
  "ONEWEB-0017", "ONEWEB-0008", "ONEWEB-0011",
];

test("D3 small-geometry handover engine golden (12 OneWeb x KSAT polar pair, +180m)", () => {
  assert.equal(handoverResult.visibilityWindows.length, 23);
  assert.equal(handoverResult.handoverEvents.length, 18);
  assert.deepEqual(handoverResult.communicationStats, {
    totalCommunicatingMs: 7_710_000,
    byOrbit: { LEO: 7_710_000, MEO: 0, GEO: 0 },
    handoverCount: 10,
    meanLinkDwellMs: 428_333,
  });
  // 8 acquisitions (fromSatelliteId === null) + 10 transitions = 18 events;
  // handoverCount counts only the 10 transitions.
  assert.equal(
    handoverResult.handoverEvents.filter((e) => e.fromSatelliteId === null).length,
    8,
  );
  assert.equal(
    handoverResult.handoverEvents.filter((e) => e.fromSatelliteId !== null).length,
    10,
  );
  assert.deepEqual(
    handoverResult.handoverEvents.map((e) => e.toSatelliteId),
    HANDOVER_TO_SAT_SEQUENCE,
  );
  const first = handoverResult.handoverEvents[0];
  assert.equal(first.fromSatelliteId, null);
  assert.equal(first.toSatelliteId, "ONEWEB-0006");
  assert.equal(first.handoverAtUtc, "2026-06-15T00:00:00.000Z");
});

test("D3 handover events stay structurally valid (every successor known, serving changes)", () => {
  const knownIds = new Set(
    parseRuntimeOrbitSources({
      leoTleText: smallLeoText,
      meoTleText: "",
      geoTleText: "",
      sourceMode: "local-snapshot",
    }).map((r) => r.satelliteId),
  );
  for (const event of handoverResult.handoverEvents) {
    assert.ok(knownIds.has(event.toSatelliteId), `unknown toSatelliteId ${event.toSatelliteId}`);
    assert.notEqual(event.toSatelliteId, event.fromSatelliteId);
  }
  // meanLinkDwell follows the documented derivation (round(total / events)).
  assert.equal(
    handoverResult.communicationStats.meanLinkDwellMs,
    Math.round(7_710_000 / handoverResult.handoverEvents.length),
  );
});

test("D2 representative LEO link budget golden (buildRepresentativeLinkBudgetByOrbit, LEO branch)", () => {
  const leo = handoverResult.representativeLinkBudgetByOrbit.LEO;
  assert.ok(leo, "expected a LEO representative link budget");
  // Dominant (longest mutual-visibility) LEO satellite selection.
  assert.equal(leo.representativeSatelliteId, "ONEWEB-0011");
  assert.equal(leo.representativeSampleUtc, "2026-06-15T01:05:45.019Z");
  assert.equal(leo.geometrySource, "sgp4-propagated-representative");
  assert.equal(leo.carrierFrequencyGHz, 12);
  // SGP4-propagated geometry.
  assert.equal(leo.satelliteAltitudeKm, 1_200.425);
  assert.equal(leo.satelliteRadiusKm, 7_571.425);
  assert.equal(leo.slantRangeKm, 1_776.529);
  assert.ok(Math.abs(leo.representativeElevationDeg - 36.866_284_921) < 1e-6);
  // Link-budget magnitudes (modeled / standard-derived).
  assert.equal(leo.freeSpacePathLossDb, 179.025);
  assert.equal(leo.gasAbsorptionDb, 0.102);
  assert.equal(leo.rainAttenuationDb, 0);
  assert.equal(leo.rainBindingStation, null);
  assert.equal(leo.totalPathLossDb, 179.127);
  assert.equal(leo.combinedAntennaGainDb, 75.703);
  assert.equal(leo.receivedPowerProxyDbm, -103.424);
  assert.equal(leo.latencyMs, 7.926);
  assert.equal(leo.jitterMs, 3);
  assert.equal(leo.illustrativeThroughputMbps, 177.391);
  // Per-station (F3) rain endpoints, clear-sky.
  assert.equal(leo.rainEndpoints.length, 2);
  assert.deepEqual(
    leo.rainEndpoints.map((e) => e.stationLabel),
    ["A", "B"],
  );
  for (const endpoint of leo.rainEndpoints) {
    assert.equal(endpoint.rainAttenuationDb, 0);
  }
});
