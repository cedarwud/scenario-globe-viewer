#!/usr/bin/env node
// Tri-orbit second-pair existence scan (READ-ONLY precheck; builds nothing).
//
// Question: does ANY registry pair have real LEO mutual (pair-intersection)
// visibility inside the pinned demo window — i.e. could a second demo pair
// carry the full LEO+MEO+GEO handover chain that CHT × SANSA cannot
// (its LEO mutual count is 0 — the half-angle wall)?
//
// Method, three stages, cheapest first:
//   1. Registry prefilter — both stations must support LEO+MEO+GEO (mirrors
//      resolveSharedSupportedOrbits' intersection rule) AND the great-circle
//      baseline must pass a GENEROUS LEO bound (h = 1230 km, per-station
//      effective mask = 10° base + terrainMaskDeg, same additive rule as
//      computeEffectiveElevationThresholdDeg).
//   2. Bitmap scan — propagate the pinned TLE snapshot once at the viewer's
//      own LEO cadence (30 s) with satellite.js (the viewer's propagator) and
//      intersect per-station visibility bitmaps per pair. Reports per-orbit
//      mutual windows.
//   3. Viewer ground truth — for the top candidates, run the REAL
//      computeRuntimeProjection (demo policy) and report LEO communicating
//      time + the handover sequence the viewer would actually render.
//
// Honesty (R12): stages 1-2 mirror the viewer's mask math and share its
// propagator but are NOT the full viewer pipeline; stage 3 is. Before any
// scenario is built from a hit, re-verify it with the independent python-sgp4
// path (as precheck_2hop_geometry_independent.py does for CHT × SANSA).
//
// Run:  node --import ./tests/helpers/register-ts-hook.mjs \
//         scripts/estnet/precheck_leo_pair_scan.mjs [--stage2-top N]
import { readFile } from "node:fs/promises";
import * as satellite from "satellite.js";

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
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_END_UTC
} from "../helpers/demo-scenario.mjs";

const STAGE2_TOP = (() => {
  const i = process.argv.indexOf("--stage2-top");
  return i >= 0 ? Number(process.argv[i + 1]) : 5;
})();
// --pair aId,bId : run stage 3 for this exact pair (in addition to the top-N)
const FORCED_PAIRS = process.argv
  .flatMap((arg, i) => (arg === "--pair" ? [process.argv[i + 1]] : []))
  .map((v) => v.split(","));

const BASE_ELEVATION_DEG = 10; // DEFAULT_ELEVATION_THRESHOLD_DEG
const STEP_SECONDS = 30; // viewer LEO visibility cadence
const LEO_BOUND_ALTITUDE_KM = 1230; // generous OneWeb upper altitude for stage-1 bound
const EARTH_RADIUS_KM = 6371;

// ---------------------------------------------------------------- stage 1
const registry = JSON.parse(
  await readFile(
    new URL("../../public/fixtures/ground-stations/multi-orbit-public-registry.json", import.meta.url),
    "utf8"
  )
);
const triOrbit = registry.stations.filter((s) =>
  ["LEO", "MEO", "GEO"].every((o) => s.supportedOrbits.includes(o))
);

function haversineKm(a, b) {
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dl = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
// max ground central angle (deg) at which a sat at altitude h is still >= e elevation
function psiDeg(elevationDeg, hKm) {
  const e = (elevationDeg * Math.PI) / 180;
  const psi = Math.acos((EARTH_RADIUS_KM / (EARTH_RADIUS_KM + hKm)) * Math.cos(e)) - e;
  return (psi * 180) / Math.PI;
}
const effMask = (s) => BASE_ELEVATION_DEG + (s.terrainMaskDeg ?? 0);

const feasible = [];
for (let i = 0; i < triOrbit.length; i++) {
  for (let j = i + 1; j < triOrbit.length; j++) {
    const a = triOrbit[i];
    const b = triOrbit[j];
    const baselineKm = haversineKm(a, b);
    const boundKm =
      (psiDeg(effMask(a), LEO_BOUND_ALTITUDE_KM) + psiDeg(effMask(b), LEO_BOUND_ALTITUDE_KM)) *
      ((EARTH_RADIUS_KM * Math.PI) / 180);
    if (baselineKm <= boundKm) feasible.push({ a, b, baselineKm });
  }
}
console.log("== STAGE 1 ==");
console.log(`  tri-orbit-capable stations: ${triOrbit.length} of ${registry.stations.length}`);
console.log(`  pairs passing the generous LEO baseline bound: ${feasible.length} of ${(triOrbit.length * (triOrbit.length - 1)) / 2}`);

// ---------------------------------------------------------------- stage 2
const sources = await loadDefaultTleSources();
const tleRecords = parseRuntimeTleSources(sources);
const tleParseStats = buildRuntimeTleSourceParseStats(sources);

const startMs = Date.parse(SELECTED_PAIR_DEMO_START_UTC);
const endMs = Date.parse(SELECTED_PAIR_DEMO_END_UTC);
const steps = Math.floor((endMs - startMs) / (STEP_SECONDS * 1000)) + 1;

const satrecs = [];
for (const r of tleRecords) {
  const rec = satellite.twoline2satrec(r.tleLine1, r.tleLine2);
  satrecs.push({ id: r.satelliteId, orbitClass: r.orbitClass, rec });
}
console.log(`\n== STAGE 2 == pinned snapshot: ${tleRecords.length} sats, window ${SELECTED_PAIR_DEMO_START_UTC} -> ${SELECTED_PAIR_DEMO_END_UTC}, ${steps} steps @ ${STEP_SECONDS}s`);

const involved = new Map();
for (const { a, b } of feasible) {
  involved.set(a.id, a);
  involved.set(b.id, b);
}
const stations = [...involved.values()].map((s) => ({
  station: s,
  geodetic: {
    latitude: (s.lat * Math.PI) / 180,
    longitude: (s.lon * Math.PI) / 180,
    height: (s.elevationM ?? 0) / 1000
  },
  maskDeg: effMask(s),
  bitmap: new Uint8Array(satrecs.length * steps)
}));

const ecfBuf = new Array(satrecs.length);
for (let t = 0; t < steps; t++) {
  const date = new Date(startMs + t * STEP_SECONDS * 1000);
  const gmst = satellite.gstime(date);
  for (let k = 0; k < satrecs.length; k++) {
    const pv = satellite.propagate(satrecs[k].rec, date);
    ecfBuf[k] = pv && pv.position ? satellite.eciToEcf(pv.position, gmst) : null;
  }
  for (const st of stations) {
    const base = t; // bitmap index = k * steps + t
    for (let k = 0; k < satrecs.length; k++) {
      const ecf = ecfBuf[k];
      if (!ecf) continue;
      const look = satellite.ecfToLookAngles(st.geodetic, ecf);
      if ((look.elevation * 180) / Math.PI >= st.maskDeg) st.bitmap[k * steps + base] = 1;
    }
  }
}
const stationBydId = new Map(stations.map((s) => [s.station.id, s]));

function mutualWindows(pairA, pairB) {
  const out = { LEO: [], MEO: [], GEO: [] };
  for (let k = 0; k < satrecs.length; k++) {
    const off = k * steps;
    let runStart = -1;
    for (let t = 0; t <= steps; t++) {
      const on = t < steps && pairA.bitmap[off + t] === 1 && pairB.bitmap[off + t] === 1;
      if (on && runStart < 0) runStart = t;
      if (!on && runStart >= 0) {
        out[satrecs[k].orbitClass].push({
          satelliteId: satrecs[k].id,
          startStep: runStart,
          endStep: t - 1,
          minutes: ((t - runStart) * STEP_SECONDS) / 60
        });
        runStart = -1;
      }
    }
  }
  return out;
}

const rows = [];
for (const { a, b, baselineKm } of feasible) {
  const wa = stationBydId.get(a.id);
  const wb = stationBydId.get(b.id);
  const mw = mutualWindows(wa, wb);
  const leoSats = new Set(mw.LEO.map((w) => w.satelliteId));
  const leoTotalMin = mw.LEO.reduce((acc, w) => acc + w.minutes, 0);
  const leoLongest = mw.LEO.reduce((acc, w) => Math.max(acc, w.minutes), 0);
  rows.push({
    a: a.id,
    b: b.id,
    coLocated: baselineKm < 1,
    baselineKm,
    leoWindows: mw.LEO.length,
    leoSats: leoSats.size,
    leoTotalMin,
    leoLongest,
    meoWindows: mw.MEO.length,
    geoSats: new Set(mw.GEO.map((w) => w.satelliteId)).size,
    triOrbit: mw.LEO.length > 0 && mw.MEO.length > 0 && mw.GEO.length > 0
  });
}
rows.sort((x, y) => y.leoLongest - x.leoLongest || y.leoTotalMin - x.leoTotalMin);

console.log("\n  pair (A x B)                                                        baseline  LEO win/sats  LEO total  longest  MEO win  GEO sats  tri-orbit");
for (const r of rows) {
  console.log(
    `  ${(r.a + " x " + r.b).padEnd(66)}` +
      `${r.baselineKm.toFixed(0).padStart(7)}km` +
      `${String(r.leoWindows).padStart(6)}/${String(r.leoSats).padEnd(5)}` +
      `${r.leoTotalMin.toFixed(1).padStart(8)}m` +
      `${r.leoLongest.toFixed(1).padStart(8)}m` +
      `${String(r.meoWindows).padStart(7)}` +
      `${String(r.geoSats).padStart(9)}` +
      `   ${r.triOrbit ? "YES" : "no"}${r.coLocated ? "  (CO-LOCATED — degenerate demo pair)" : ""}`
  );
}

// ---------------------------------------------------------------- stage 3
const candidates = rows.filter((r) => r.triOrbit && !r.coLocated).slice(0, STAGE2_TOP);
for (const [aId, bId] of FORCED_PAIRS) {
  const found = rows.find(
    (r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)
  );
  if (found && !candidates.includes(found)) candidates.push(found);
  if (!found) console.log(`  (--pair ${aId},${bId} not in the stage-2 feasible set — skipped)`);
}
console.log(`\n== STAGE 3 == viewer ground truth (computeRuntimeProjection, policy ${SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID}) for top ${candidates.length} non-co-located tri-orbit candidate(s)`);
const byId = new Map(registry.stations.map((s) => [s.id, s]));
for (const r of candidates) {
  const result = computeRuntimeProjection({
    stationA: byId.get(r.a),
    stationB: byId.get(r.b),
    timeWindow: { startUtc: SELECTED_PAIR_DEMO_START_UTC, endUtc: SELECTED_PAIR_DEMO_END_UTC },
    tleRecords,
    tleParseStats,
    rainRateMmPerHour: 0,
    policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
  });
  const byOrbitWin = { LEO: 0, MEO: 0, GEO: 0 };
  for (const w of result.visibilityWindows) byOrbitWin[w.orbitClass] += 1;
  const cs = result.communicationStats;
  const orbitOf = new Map(result.visibilityWindows.map((w) => [w.satelliteId, w.orbitClass]));
  const served = new Set(result.handoverEvents.map((e) => orbitOf.get(e.toSatelliteId) ?? "?"));
  const crossOrbit = result.handoverEvents.filter((e) => e.reasonKind === "cross-orbit-migration").length;
  console.log(
    `\n  ${r.a} x ${r.b}` +
      `\n    mutual windows LEO/MEO/GEO: ${byOrbitWin.LEO}/${byOrbitWin.MEO}/${byOrbitWin.GEO}` +
      `\n    communicating min LEO/MEO/GEO: ${(cs.byOrbit.LEO / 60000).toFixed(1)}/${(cs.byOrbit.MEO / 60000).toFixed(1)}/${(cs.byOrbit.GEO / 60000).toFixed(1)}` +
      `\n    handover events: ${result.handoverEvents.length} (cross-orbit ${crossOrbit}); orbits actually served: ${[...served].join(",")}` +
      `\n    full LEO+MEO+GEO chain under demo policy: ${["LEO", "MEO", "GEO"].every((o) => served.has(o)) ? "YES" : "no"}`
  );
  for (const e of result.handoverEvents) {
    console.log(`      ${e.handoverAtUtc.slice(11, 19)}  ${e.fromSatelliteId ?? "(none)"} -> ${e.toSatelliteId} (${orbitOf.get(e.toSatelliteId) ?? "?"})  [${e.reasonKind}]`);
  }
}

const hits = rows.filter((r) => r.triOrbit && !r.coLocated).length;
console.log(
  `\n== VERDICT == ${hits > 0
    ? `${hits} non-co-located tri-orbit candidate pair(s) exist at the bitmap level; stage-3 output above shows what the demo policy would actually serve. Before building any scenario: independent python-sgp4 re-verification (R12).`
    : "no non-co-located registry pair has LEO mutual visibility in the pinned window — the full LEO+MEO+GEO chain does not exist in the current registry; record honestly and stop."}`
);
