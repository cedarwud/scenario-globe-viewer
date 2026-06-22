#!/usr/bin/env node
// ESTNeT 2-hop geometry pre-check (GROUND TRUTH = the viewer's own model).
//
// Runs the viewer's REAL computeRuntimeProjection on the pinned demo snapshot
// (demo-scenario-config.json) for the CHT x SANSA pair and reports which
// satellites achieve MUTUAL (pair-intersection) visibility, per orbit, plus the
// handover sequence the demo will actually render. This answers, with the
// shipped model rather than a re-derivation:
//   - can any LEO 2-hop CHT-SANSA?  (geometry guard)
//   - is there a real MEO co-visibility window (AOS) inside the demo window?
//   - does a GEO<->MEO cross-orbit handover sequence actually emerge?
//
// Run:  node --import ./tests/helpers/register-ts-hook.mjs \
//         scripts/estnet/precheck_2hop_geometry.mjs
import { readFile } from "node:fs/promises";

import {
  loadDefaultTleSources,
  parseRuntimeTleSources,
  buildRuntimeTleSourceParseStats
} from "../../src/features/multi-station-selector/runtime-tle-sources.ts";
import {
  computeRuntimeProjection,
  SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
} from "../../src/features/multi-station-selector/runtime-projection.ts";
import {
  SELECTED_PAIR_DEMO_STATION_A_ID,
  SELECTED_PAIR_DEMO_STATION_B_ID,
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_END_UTC
} from "../helpers/demo-scenario.mjs";

const registry = JSON.parse(
  await readFile(
    new URL(
      "../../public/fixtures/ground-stations/multi-orbit-public-registry.json",
      import.meta.url
    ),
    "utf8"
  )
);
const byId = new Map(registry.stations.map((s) => [s.id, s]));
const stationA = byId.get(SELECTED_PAIR_DEMO_STATION_A_ID);
const stationB = byId.get(SELECTED_PAIR_DEMO_STATION_B_ID);

const sources = await loadDefaultTleSources();
const tleRecords = parseRuntimeTleSources(sources);
const tleParseStats = buildRuntimeTleSourceParseStats(sources);

const byOrbitParsed = { LEO: 0, MEO: 0, GEO: 0 };
for (const r of tleRecords) byOrbitParsed[r.orbitClass] += 1;

const result = computeRuntimeProjection({
  stationA,
  stationB,
  timeWindow: { startUtc: SELECTED_PAIR_DEMO_START_UTC, endUtc: SELECTED_PAIR_DEMO_END_UTC },
  tleRecords,
  tleParseStats,
  rainRateMmPerHour: 0,
  policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
});

const fmtMin = (ms) => (ms / 60000).toFixed(1);
console.log("== PAIR ==", stationA.id, "(mask", stationA.terrainMaskDeg, "-> eff 10+mask) x",
  stationB.id, "(mask", stationB.terrainMaskDeg, ")");
console.log("== WINDOW ==", SELECTED_PAIR_DEMO_START_UTC, "->", SELECTED_PAIR_DEMO_END_UTC);
console.log("== PARSED SATS == LEO", byOrbitParsed.LEO, "MEO", byOrbitParsed.MEO, "GEO", byOrbitParsed.GEO);

// Mutual (pair-intersection) windows = a single sat seen from BOTH stations.
const pair = result.visibilityWindows;
const byOrbitPair = { LEO: [], MEO: [], GEO: [] };
for (const w of pair) byOrbitPair[w.orbitClass].push(w);
console.log("\n== MUTUAL 2-HOP WINDOWS (single sat sees BOTH) ==");
for (const orbit of ["LEO", "MEO", "GEO"]) {
  const ws = byOrbitPair[orbit];
  const sats = new Set(ws.map((w) => w.satelliteId));
  console.log(`  ${orbit}: ${ws.length} window(s) across ${sats.size} sat(s)`);
  for (const w of ws.slice(0, 12)) {
    const dur = (Date.parse(w.intersectionEndUtc) - Date.parse(w.intersectionStartUtc));
    console.log(
      `     ${w.satelliteId}  ${w.intersectionStartUtc.slice(11, 19)}->${w.intersectionEndUtc.slice(11, 19)}  (${fmtMin(dur)} min)`
    );
  }
}

const cs = result.communicationStats;
console.log("\n== COMMUNICATING TIME BY ORBIT (demo policy:", SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID, ") ==");
for (const orbit of ["LEO", "MEO", "GEO"]) {
  console.log(`  ${orbit}: ${fmtMin(cs.byOrbit[orbit])} min`);
}
console.log(`  total: ${fmtMin(cs.totalCommunicatingMs)} min  meanDwell: ${fmtMin(cs.meanLinkDwellMs)} min`);

const orbitOf = new Map();
for (const w of pair) orbitOf.set(w.satelliteId, w.orbitClass);
console.log("\n== HANDOVER SEQUENCE ==", "events:", result.handoverEvents.length,
  "handoverCount:", cs.handoverCount);
for (const e of result.handoverEvents) {
  const toOrbit = orbitOf.get(e.toSatelliteId) ?? "?";
  console.log(`  ${e.handoverAtUtc.slice(11, 19)}  ${e.fromSatelliteId ?? "(none)"} -> ${e.toSatelliteId} (${toOrbit})  [${e.reasonKind}]`);
}
const crossOrbit = result.handoverEvents.filter((e) => e.reasonKind === "cross-orbit-migration");
console.log("\n== CROSS-ORBIT MIGRATIONS ==", crossOrbit.length);
console.log("\n== REPRESENTATIVE LINK BUDGET (per orbit) ==");
for (const [orbit, b] of Object.entries(result.representativeLinkBudgetByOrbit)) {
  console.log(`  ${orbit}: ${b.representativeSatelliteId}  slant ${b.slantRangeKm} km  latency ${b.latencyMs} ms  thrpt ${b.illustrativeThroughputMbps} Mbps`);
}
