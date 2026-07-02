#!/usr/bin/env node
// ESTNeT handover-scenario GENERATOR — phase table from the viewer's own
// projection, scenario files emitted programmatically.
//
// Why generated: the CHT × SANSA 6-phase scenario was hand-authored (12
// contact-plan rows, 6 windowed app pairs). A pair with a LEO leg has ~25
// serving phases and ~23 relay satellites; hand-writing the .cp/.ini node and
// appWrapper cross-wiring at that size is exactly the "missed node remap =
// silent loss" failure mode. This generator derives everything from ONE
// source of truth — the viewer's computeRuntimeProjection handover timeline
// on the pinned demo window — and emits:
//
//   scenario/configs/tles/<slug>_handover.tle      TLE blocks, sat-index order
//   scenario/configs/orbit_<slug>_handover.incl    numS + SGP4 propagator + epoch
//   scenario/configs/gs_<slug>_handover.incl       both stations, contact-plan tracking
//   scenario/configs/<slug>_handover.cp            non-overlapping per-GS contacts
//   scenario/omnetpp_<slug>_handover.ini           windowed per-phase app pairs
//   scenario/<slug>_handover_scenario.json         descriptor (adapter + verifier input)
//
// Default run only PRINTS the phase table (review first); --emit writes files.
// R12: emitting files is NOT validation — run
// verify_handover_phases_independent.py (python-sgp4) on the descriptor before
// running the sim, and the crosscheck gate after the fixture exists.
//
// Baseline scenario is LOSS-FREE: send windows sit inside the serving phase
// (start+50 s / stop−10 s guards; first phase +30 s) with NO re-point overrun
// traffic (the CHT × SANSA variant models that separately).
//
// Run:
//   node --import ./tests/helpers/register-ts-hook.mjs \
//     scripts/estnet/generate_handover_scenario.mjs \
//     --station-a cht-yangmingshan --station-b cht-fangshan --slug cht_domestic [--emit]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as satellite from "satellite.js";

import {
  loadDefaultTleSources,
  parseRuntimeTleSources,
  buildRuntimeTleSourceParseStats,
  resolveDefaultTleFixturePaths
} from "../../src/features/multi-station-selector/runtime-tle-sources.ts";
import {
  computeRuntimeProjection,
  SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
} from "../../src/features/multi-station-selector/runtime-projection.ts";
import {
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_END_UTC
} from "../helpers/demo-scenario.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const STATION_A = arg("station-a", "cht-yangmingshan");
const STATION_B = arg("station-b", "cht-fangshan");
const SLUG = arg("slug", "cht_domestic");
const EMIT = process.argv.includes("--emit");
const SEND_INTERVAL_S = 10;
const FIRST_START_GUARD_S = 30;
const START_GUARD_S = 50;
const STOP_GUARD_S = 10;

const registry = JSON.parse(
  await readFile(path.join(ROOT, "public/fixtures/ground-stations/multi-orbit-public-registry.json"), "utf8")
);
const byId = new Map(registry.stations.map((s) => [s.id, s]));
const stationA = byId.get(STATION_A);
const stationB = byId.get(STATION_B);
if (!stationA || !stationB) throw new Error(`unknown station id: ${STATION_A} / ${STATION_B}`);

const sources = await loadDefaultTleSources();
const tleRecords = parseRuntimeTleSources(sources);
const tleParseStats = buildRuntimeTleSourceParseStats(sources);

const result = computeRuntimeProjection({
  stationA,
  stationB,
  timeWindow: { startUtc: SELECTED_PAIR_DEMO_START_UTC, endUtc: SELECTED_PAIR_DEMO_END_UTC },
  tleRecords,
  tleParseStats,
  rainRateMmPerHour: 0,
  policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID
});

const epochMs = Date.parse(SELECTED_PAIR_DEMO_START_UTC);
const endS = (Date.parse(SELECTED_PAIR_DEMO_END_UTC) - epochMs) / 1000;
const orbitOf = new Map(result.visibilityWindows.map((w) => [w.satelliteId, w.orbitClass]));

// serving phases = [event_i .. event_{i+1}) on the sim-seconds axis
const events = result.handoverEvents;
if (events.length === 0) throw new Error("no handover events — nothing to generate");
const phases = events.map((e, i) => {
  const startS = (Date.parse(e.handoverAtUtc) - epochMs) / 1000;
  const stopS = i + 1 < events.length ? (Date.parse(events[i + 1].handoverAtUtc) - epochMs) / 1000 : endS;
  const orbit = orbitOf.get(e.toSatelliteId);
  if (!orbit) throw new Error(`serving sat ${e.toSatelliteId} has no visibility window — refusing to fake a phase`);
  return { idx: i, satellite: e.toSatelliteId, orbit, startS, stopS, reason: e.reasonKind };
});

// sat list in first-appearance order -> sat[] index / node id
const satIndex = new Map();
for (const ph of phases) if (!satIndex.has(ph.satellite)) satIndex.set(ph.satellite, satIndex.size);
const numS = satIndex.size;
const nodeA = numS + 1;
const nodeB = numS + 2;

// send windows (loss-free baseline: inside the serving span)
for (const ph of phases) {
  ph.sendStartS = ph.startS + (ph.idx === 0 ? FIRST_START_GUARD_S : START_GUARD_S);
  ph.sendStopS = ph.stopS - STOP_GUARD_S;
  if (ph.sendStopS - ph.sendStartS < 2 * SEND_INTERVAL_S) {
    throw new Error(`phase ${ph.idx + 1} (${ph.satellite}) send span ${ph.sendStopS - ph.sendStartS}s too short`);
  }
}

// TLE block lookup — the exact files the viewer loaded (pinned snapshot)
const fixturePaths = await resolveDefaultTleFixturePaths();
const tleBlocks = new Map();
for (const rel of Object.values(fixturePaths)) {
  const text = await readFile(path.join(ROOT, "public", rel.replace(/^\//, "")), "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i + 2 < lines.length + 1; i++) {
    if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      tleBlocks.set(lines[i].trim(), [lines[i].trim(), lines[i + 1], lines[i + 2]]);
      i += 2;
    }
  }
}
for (const sat of satIndex.keys()) {
  if (!tleBlocks.has(sat)) throw new Error(`no TLE block found for serving sat "${sat}" in pinned snapshots`);
}

// Mask-compliance trim (1 s sampling): the viewer's visibility grid is 30 s,
// so a fast-moving LEO can cross below a station mask INSIDE the final grid
// step while the policy still serves it until the next grid instant. Serving
// phases keep the viewer's geometry-true boundaries, but the SEND windows are
// additionally trimmed so every transmitted packet rides a link that is
// CONTINUOUSLY above both stations' effective masks (10 deg + terrain), with
// a 2 s guard — the delivered trace then satisfies the strict mask check
// without grid-quantization exemptions.
{
  const tleParsed = new Map();
  const stations = [stationA, stationB].map((s) => ({
    geodetic: {
      latitude: (s.lat * Math.PI) / 180,
      longitude: (s.lon * Math.PI) / 180,
      height: (s.elevationM ?? 0) / 1000
    },
    maskDeg: 10 + (s.terrainMaskDeg ?? 0)
  }));
  const visibleAt = (satrec, tS) => {
    const date = new Date(epochMs + tS * 1000);
    const pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position) return false;
    const ecf = satellite.eciToEcf(pv.position, satellite.gstime(date));
    return stations.every(
      (st) => (satellite.ecfToLookAngles(st.geodetic, ecf).elevation * 180) / Math.PI >= st.maskDeg
    );
  };
  const TRIM_GUARD_S = 2;
  for (const ph of phases) {
    if (!tleParsed.has(ph.satellite)) {
      const [, l1, l2] = tleBlocks.get(ph.satellite);
      tleParsed.set(ph.satellite, satellite.twoline2satrec(l1, l2));
    }
    const rec = tleParsed.get(ph.satellite);
    let firstOk = null;
    let lastOk = null;
    for (let t = ph.sendStartS; t <= ph.sendStopS; t += 1) {
      if (visibleAt(rec, t)) {
        if (firstOk === null) firstOk = t;
        lastOk = t;
      } else if (firstOk !== null) {
        break; // contiguous compliant run ended — trim there
      }
    }
    if (firstOk === null) throw new Error(`phase ${ph.idx + 1} (${ph.satellite}) has no mask-compliant send instant`);
    const trimmedStart = firstOk === ph.sendStartS ? ph.sendStartS : firstOk + TRIM_GUARD_S;
    const trimmedStop = lastOk === ph.sendStopS ? ph.sendStopS : lastOk - TRIM_GUARD_S;
    if (trimmedStart !== ph.sendStartS || trimmedStop !== ph.sendStopS) {
      ph.maskTrimmed = { from: [ph.sendStartS, ph.sendStopS], to: [trimmedStart, trimmedStop] };
      ph.sendStartS = trimmedStart;
      ph.sendStopS = trimmedStop;
    }
    if (ph.sendStopS - ph.sendStartS < 2 * SEND_INTERVAL_S) {
      throw new Error(`phase ${ph.idx + 1} (${ph.satellite}) mask-trimmed send span too short (${ph.sendStartS}..${ph.sendStopS})`);
    }
  }
}

// per-sat wrapper counters -> uplink destAppId cross-wiring
const satWrapperCount = new Map();
for (const ph of phases) {
  const si = satIndex.get(ph.satellite);
  ph.satIdx = si;
  ph.satNode = si + 1;
  ph.satWrapper = satWrapperCount.get(si) ?? 0;
  satWrapperCount.set(si, ph.satWrapper + 1);
  ph.label = `${ph.orbit}-${ph.idx + 1}`;
}

const fmtUtc = (s) => new Date(epochMs + s * 1000).toISOString().replace(".000Z", "Z");
const orbitCounts = { LEO: 0, MEO: 0, GEO: 0 };
for (const id of satIndex.keys()) orbitCounts[orbitOf.get(id)] += 1;

console.log(`== PHASE TABLE == ${STATION_A} x ${STATION_B}, ${SELECTED_PAIR_DEMO_START_UTC} -> ${SELECTED_PAIR_DEMO_END_UTC}`);
console.log(`  policy ${SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID}; ${phases.length} phases, ${numS} relay sats (LEO ${orbitCounts.LEO} / MEO ${orbitCounts.MEO} / GEO ${orbitCounts.GEO}); GS nodes ${nodeA}/${nodeB}`);
for (const ph of phases) {
  console.log(
    `  ph${String(ph.idx + 1).padStart(2)} ${ph.label.padEnd(7)} ${ph.satellite.padEnd(28)} sat[${String(ph.satIdx).padStart(2)}]=node${String(ph.satNode).padStart(2)} ` +
      `${String(ph.startS).padStart(5)}..${String(ph.stopS).padEnd(5)}s  send ${ph.sendStartS}..${ph.sendStopS}s${ph.maskTrimmed ? " [mask-trimmed]" : ""}  (${fmtUtc(ph.startS).slice(11, 19)}..${fmtUtc(ph.stopS).slice(11, 19)}Z)`
  );
}

if (!EMIT) {
  console.log("\n(review mode — rerun with --emit to write scenario files)");
  process.exit(0);
}

// ------------------------------------------------------------------ emit
const scenDir = path.join(ROOT, "scripts/estnet/scenario");
await mkdir(path.join(scenDir, "configs/tles"), { recursive: true });

const genNote = `GENERATED by scripts/estnet/generate_handover_scenario.mjs — do not hand-edit; regenerate instead.`;

// TLE file
const tleOut = [];
for (const [sat, si] of satIndex) {
  void si;
  tleOut.push(...tleBlocks.get(sat));
}
await writeFile(path.join(scenDir, `configs/tles/${SLUG}_handover.tle`), tleOut.join("\n") + "\n");

// orbit incl
const orbitLines = [
  `# SATELLITE ORBIT — ${numS} relay sats for the ${STATION_A} x ${STATION_B} handover scenario.`,
  `# ${genNote}`,
  `# Phase source of truth: the viewer's computeRuntimeProjection (policy`,
  `# ${SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID}) on the pinned demo window; TLE blocks lifted`,
  `# verbatim from the pinned snapshot files the viewer itself loads.`,
  ...[...satIndex.entries()].map(([sat, si]) => `#   sat[${si}] = node ${si + 1} = ${sat} (${orbitOf.get(sat)})`),
  `# SIM EPOCH: explicit UTC instant (globalJulianDate.tleFile MUST stay empty,`,
  `# otherwise the first TLE epoch would override simulationStart). t=0 == ${SELECTED_PAIR_DEMO_START_UTC}.`,
  `*.numS = ${numS}`,
  `*.sat[*].networkHost.mobility.positionPropagatorType = "PositionPropagatorSGP4File"`,
  `*.sat[*].networkHost.mobility.positionPropagator.tleFile = "./configs/tles/${SLUG}_handover.tle"`,
  `*.globalJulianDate.tleFile = ""`,
  `*.globalJulianDate.simulationStart = "${SELECTED_PAIR_DEMO_START_UTC.replace(/\.000Z$|Z$/, "")}.00+00:00Z"`
];
await writeFile(path.join(scenDir, `configs/orbit_${SLUG}_handover.incl`), orbitLines.join("\n") + "\n");

// gs incl
const gsLines = [
  `# GROUND STATIONS — ${stationA.name} + ${stationB.name}.`,
  `# ${genNote}`,
  `# Node numbering with numS=${numS}: sat[0..${numS - 1}]=node 1..${numS}, cg[0]=node ${nodeA} (A), cg[1]=node ${nodeB} (B).`,
  `# internetConnection=false on BOTH so traffic goes over the RF link, not the`,
  `# terrestrial shortcut. Antenna pointing = ContactPlanBasedNodeTracking with a`,
  `# NON-OVERLAPPING per-GS contact plan — the single directional yagi re-points`,
  `# at each serving-phase boundary; the re-point IS the handover.`,
  `*.numCg = 2`,
  `*.cg[*].trackingType = "estnet.node.tracking.contactplanbased.ContactPlanBasedNodeTracking"`,
  ``,
  `# cg[0] = ${stationA.id} (node ${nodeA}) — traffic source`,
  `*.cg[0].networkHost.mobility.lat = ${stationA.lat.toFixed(4)}deg`,
  `*.cg[0].networkHost.mobility.lon = ${stationA.lon.toFixed(4)}deg`,
  `*.cg[0].networkHost.mobility.alt = ${Math.round(stationA.elevationM ?? 0)}m`,
  `*.cg[0].label = "${stationA.name}"`,
  `*.cg[0].internetConnection = false`,
  ``,
  `# cg[1] = ${stationB.id} (node ${nodeB}) — traffic destination`,
  `*.cg[1].networkHost.mobility.lat = ${stationB.lat.toFixed(4)}deg`,
  `*.cg[1].networkHost.mobility.lon = ${stationB.lon.toFixed(4)}deg`,
  `*.cg[1].networkHost.mobility.alt = ${Math.round(stationB.elevationM ?? 0)}m`,
  `*.cg[1].label = "${stationB.name}"`,
  `*.cg[1].internetConnection = false`
];
await writeFile(path.join(scenDir, `configs/gs_${SLUG}_handover.incl`), gsLines.join("\n") + "\n");

// contact plan
const cpLines = [
  `# Contact plan for the ${STATION_A} x ${STATION_B} handover scenario.`,
  `# ${genNote}`,
  `# Format (ContactPlanReader.cc): start(s) end(s) source(GS) sink(sat) rate range;`,
  `# per-GS contacts NON-OVERLAPPING so the antenna actually re-points.`,
  `# Satellites: 1 - ${numS}`,
  `# Ground Stations: ${nodeA} - ${nodeB}`,
  `# sim-time-limit: ${endS}`,
  `# start    end  source  sink  rate  range`
];
for (const gsNode of [nodeA, nodeB]) {
  for (const ph of phases) {
    cpLines.push(
      `${String(ph.startS).padStart(7)} ${String(ph.stopS).padStart(6)} ${String(gsNode).padStart(7)} ${String(ph.satNode).padStart(5)}  9600     0`
    );
  }
}
await writeFile(path.join(scenDir, `configs/${SLUG}_handover.cp`), cpLines.join("\n") + "\n");

// .ini
const ini = [];
ini.push(`[General]`);
ini.push(`# =====================================================================`);
ini.push(`# ${STATION_A} x ${STATION_B} FULL-CHAIN HANDOVER packet-trace scenario.`);
ini.push(`# ${genNote}`);
ini.push(`# Faithful replay of the viewer's ${SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID} timeline on the`);
ini.push(`# pinned demo window: ${phases.length} serving phases across ${numS} relay satellites`);
ini.push(`# (LEO ${orbitCounts.LEO} / MEO ${orbitCounts.MEO} / GEO ${orbitCounts.GEO}) — the full LEO+MEO+GEO chain this pair`);
ini.push(`# geometrically supports (CHT x SANSA cannot: its LEO mutual count is 0).`);
ini.push(`# Same architecture as omnetpp_cht_sansa_handover.ini: per-phase windowed`);
ini.push(`# uplink/downlink BasicApp pairs over two real one-hop RF legs, antenna`);
ini.push(`# re-point driven by a non-overlapping contact plan. BASELINE = LOSS-FREE:`);
ini.push(`# no re-point overrun traffic is sent (send windows sit inside each phase).`);
ini.push(`# HONESTY (R12): ESTNeT-SIMULATED, not operator-measured; route preference`);
ini.push(`# mirrors the viewer's showcase policy; 20 W EIRP + 9600 bps assumed.`);
ini.push(`# =====================================================================`);
ini.push(``);
ini.push(`sim-time-limit = ${endS}s`);
ini.push(``);
ini.push(`include configs/basic.incl`);
ini.push(``);
ini.push(`# RECORDING — app vectors only, minus the 0.1 s throughput streams the`);
ini.push(`# adapter never reads. With ${numS} satellites and ${phases.length * 2 + phases.length} apps, BasicApp's`);
ini.push(`# sentThroughput/rcvdThroughput vectors alone are ~200k rows per app over`);
ini.push(`# the 6 h window; the adapter consumes rcvdThroughput ONLY on the sink`);
ini.push(`# side (sat + cg[1]). OMNeT ini matching is first-match-wins: specific`);
ini.push(`# rules precede the global off switch.`);
ini.push(`record-eventlog = false`);
ini.push(`**.app.sentThroughput.result-recording-modes = -vector`);
ini.push(`*.cg[0].networkHost.appWrapper[*].app.rcvdThroughput.result-recording-modes = -vector`);
ini.push(`**.appWrapper[*].**.vector-recording = true`);
ini.push(`**.vector-recording = false`);
ini.push(`**.scalar-recording = true`);
ini.push(`**.statistic-recording = true`);
ini.push(`**.bin-recording = false`);
ini.push(``);
ini.push(`include configs/orbit_${SLUG}_handover.incl`);
ini.push(`include configs/gs_${SLUG}_handover.incl`);
ini.push(``);
ini.push(`*.contactPlanManager.contactPlanFile = "./configs/${SLUG}_handover.cp"`);
ini.push(``);
ini.push(`# RADIO — GEO-strengthened (sat 20 W); MEO/LEO are closer so they close with more margin`);
ini.push(`include configs/radio_geo_strong.incl`);
ini.push(`include configs/antenna_sat_isotropic.incl`);
ini.push(`include configs/antenna_gs_yagi.incl`);
ini.push(`include configs/mac_simple.incl`);
ini.push(``);
ini.push(`# PROTOCOL — unicast (broadcast would flood GSs directly and bypass the sat)`);
ini.push(`*.*.hostType = "estnet.protocol.simpleprotocol.SimpleProtocolNode"`);
ini.push(`*.*.networkHost.protocolModule.useBroadcasts = false`);
ini.push(``);
ini.push(`# APP COUNTS (per node)`);
ini.push(`*.cg[0].networkHost.numApps = ${phases.length}`);
ini.push(`*.cg[1].networkHost.numApps = ${phases.length}`);
for (const [si, count] of [...satWrapperCount.entries()].sort((a, b) => a[0] - b[0])) {
  ini.push(`*.sat[${si}].networkHost.numApps = ${count}`);
}
ini.push(`*.*.networkHost.appWrapper[*].appType = "BasicApp"`);
ini.push(``);
ini.push(`# Common app cadence`);
ini.push(`*.*.networkHost.appWrapper[*].app.sendInterval = ${SEND_INTERVAL_S}s`);
ini.push(`*.*.networkHost.appWrapper[*].app.payloadSize = 100B`);
for (const ph of phases) {
  ini.push(``);
  ini.push(`# ---- PHASE ${ph.idx + 1} : ${ph.orbit} uplink cg0(node${nodeA})->${ph.satellite}(node${ph.satNode}) ----`);
  ini.push(`*.cg[0].networkHost.appWrapper[${ph.idx}].app.sending = true`);
  ini.push(`*.cg[0].networkHost.appWrapper[${ph.idx}].app.startTime = ${ph.sendStartS}s`);
  ini.push(`*.cg[0].networkHost.appWrapper[${ph.idx}].app.stopTime = ${ph.sendStopS}s`);
  ini.push(`*.cg[0].networkHost.appWrapper[${ph.idx}].app.destinationNodes = "${ph.satNode}"`);
  ini.push(`*.cg[0].networkHost.appWrapper[${ph.idx}].app.destAppId = ${ph.satWrapper}`);
  ini.push(`# ---- PHASE ${ph.idx + 1} : ${ph.orbit} downlink ${ph.satellite}(node${ph.satNode})->cg1(node${nodeB}) ----`);
  ini.push(`*.sat[${ph.satIdx}].networkHost.appWrapper[${ph.satWrapper}].app.sending = true`);
  ini.push(`*.sat[${ph.satIdx}].networkHost.appWrapper[${ph.satWrapper}].app.startTime = ${ph.sendStartS}s`);
  ini.push(`*.sat[${ph.satIdx}].networkHost.appWrapper[${ph.satWrapper}].app.stopTime = ${ph.sendStopS}s`);
  ini.push(`*.sat[${ph.satIdx}].networkHost.appWrapper[${ph.satWrapper}].app.destinationNodes = "${nodeB}"`);
  ini.push(`*.sat[${ph.satIdx}].networkHost.appWrapper[${ph.satWrapper}].app.destAppId = ${ph.idx}`);
}
ini.push(``);
ini.push(`# ---- cg[1] receive-only sinks (one per phase, appId = wrapper index) ----`);
ini.push(`*.cg[1].networkHost.appWrapper[*].app.sending = false`);
await writeFile(path.join(scenDir, `omnetpp_${SLUG}_handover.ini`), ini.join("\n") + "\n");

// descriptor JSON (adapter + independent verifier input)
const descriptor = {
  slug: SLUG,
  generatedBy: "scripts/estnet/generate_handover_scenario.mjs",
  simEpochUtc: SELECTED_PAIR_DEMO_START_UTC.replace(".000Z", "Z"),
  simTimeLimitS: endS,
  policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
  sendIntervalS: SEND_INTERVAL_S,
  stationA: {
    id: stationA.id, name: stationA.name, lat: stationA.lat, lon: stationA.lon,
    elevationM: stationA.elevationM ?? 0,
    effectiveElevationMaskDeg: 10 + (stationA.terrainMaskDeg ?? 0)
  },
  stationB: {
    id: stationB.id, name: stationB.name, lat: stationB.lat, lon: stationB.lon,
    elevationM: stationB.elevationM ?? 0,
    effectiveElevationMaskDeg: 10 + (stationB.terrainMaskDeg ?? 0)
  },
  satellites: [...satIndex.entries()].map(([sat, si]) => ({
    satellite: sat, orbit: orbitOf.get(sat), satIndex: si, node: si + 1
  })),
  phases: phases.map((ph) => ({
    label: ph.label,
    orbit: ph.orbit,
    satellite: ph.satellite,
    startS: ph.startS,
    stopS: ph.stopS,
    sendStartS: ph.sendStartS,
    sendStopS: ph.sendStopS,
    startUtc: fmtUtc(ph.startS),
    stopUtc: fmtUtc(ph.stopS),
    reasonKind: ph.reason,
    maskTrimmed: ph.maskTrimmed ?? null,
    uplink_src: `%cg[0]%appWrapper[${ph.idx}].app`,
    uplink_sink: `%sat[${ph.satIdx}]%appWrapper[${ph.satWrapper}].app`,
    downlink_sink: `%cg[1]%appWrapper[${ph.idx}].app`
  })),
  handoverBoundariesUtc: phases.slice(1).map((ph) => fmtUtc(ph.startS)),
  pathLabel: `${stationA.name} → [ ${orbitCounts.LEO} OneWeb LEO ⇄ ${orbitCounts.MEO} Galileo MEO ⇄ ${orbitCounts.GEO} GEO relays ] → ${stationB.name}`,
  lossModel: "loss-free baseline: no re-point overrun traffic; send windows sit inside each serving phase and are additionally trimmed (1 s sampling, 2 s guard) so every transmitted packet is continuously above both stations' effective elevation masks — the serving-phase boundaries themselves remain the viewer's 30 s-grid handover instants"
};
await writeFile(path.join(scenDir, `${SLUG}_handover_scenario.json`), JSON.stringify(descriptor, null, 2) + "\n");

console.log(`\n== EMITTED ==`);
for (const f of [
  `configs/tles/${SLUG}_handover.tle`,
  `configs/orbit_${SLUG}_handover.incl`,
  `configs/gs_${SLUG}_handover.incl`,
  `configs/${SLUG}_handover.cp`,
  `omnetpp_${SLUG}_handover.ini`,
  `${SLUG}_handover_scenario.json`
]) console.log(`  scripts/estnet/scenario/${f}`);
console.log(`\nNext (R12, verify before running the sim):`);
console.log(`  python3 scripts/estnet/verify_handover_phases_independent.py scripts/estnet/scenario/${SLUG}_handover_scenario.json scripts/estnet/scenario/configs/tles/${SLUG}_handover.tle`);
