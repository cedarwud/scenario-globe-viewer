#!/usr/bin/env node
// verify:estnet — PacketTrace contract + honesty gate for the ESTNeT-trace
// pipeline (opt-in track; NOT part of the accepted 19/19 surface).
//
// Validates three layers:
//   1. The two committed ESTNeT fixtures conform to the PacketTrace contract
//      (scripts/estnet/PACKET-TRACE-CONTRACT.md): schema, sample invariants,
//      summary self-consistency, segment coverage, and the mandatory honesty
//      disclosures (sourceClass tier + "not operator-measured" nonClaims).
//   2. The multi-format ingestion tool (external_trace_ingest.py) still
//      round-trips every rehearsal format — vec-single (hermetic synthetic
//      .vec), scavetool CSV, ping, iperf3 — to contract-conforming output
//      with the right latencySemantic and provenance fields.
//   3. The provenance guard holds: --source-class operator-measured is
//      REFUSED (this chain must never launder simulation into measurement).
//
// Node-only, no browser, no ESTNeT kit required (kit-based live ingest runs
// only when kit results are present, and is loudly skipped otherwise).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = [
  {
    file: "public/fixtures/estnet/cht-sansa-abs2a-packet-trace.json",
    pins: { schemaVersion: 1, samples: 59, overallPacketLossRatio: 0 },
  },
  {
    file: "public/fixtures/estnet/cht-sansa-handover-packet-trace.json",
    pins: { schemaVersion: 2, samples: 2140, handoverCount: 5, distinctMeoSatellites: 3 },
  },
];
const ALLOWED_SOURCE_CLASSES = new Set([
  "external-simulator-derived",
  "requirement-provided-estnet",
  "network-test-derived",
]);
const LATENCY_SEMANTICS = new Set(["one-way", "rtt", "none"]);
const NOT_MEASURED_RE = /not operator[- ]measured|not an operator RF measurement/i;

let failures = 0;
let checks = 0;
function check(target, cond, msg) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  FAIL [${target}] ${msg}`);
  }
}
function section(title) {
  console.log(`== ${title}`);
}

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function validateTrace(target, trace, { ingest = false } = {}) {
  const failuresBefore = failures;
  check(target, trace.schemaVersion === 1 || trace.schemaVersion === 2, "schemaVersion must be 1 or 2");
  check(target, typeof trace.pathLabel === "string" && trace.pathLabel.length > 0, "pathLabel required");
  check(target, ALLOWED_SOURCE_CLASSES.has(trace.sourceClass), `sourceClass "${trace.sourceClass}" not in allowed tier enum`);
  check(target, typeof trace.toolProvenance === "string" && trace.toolProvenance.length > 0, "toolProvenance required");
  check(target, typeof trace.assumptionSet === "string" && trace.assumptionSet.length > 0, "assumptionSet required");
  check(target, Array.isArray(trace.nonClaims) && trace.nonClaims.length > 0 && trace.nonClaims.every((n) => typeof n === "string"), "nonClaims must be a non-empty string array");
  check(target, trace.nonClaims.some((n) => NOT_MEASURED_RE.test(n)), 'nonClaims must state "not operator-measured" / "not an operator RF measurement"');
  check(target, trace.metadata && typeof trace.metadata === "object", "metadata required");
  check(target, trace.summary && typeof trace.summary === "object", "summary required");
  check(target, Array.isArray(trace.samples) && trace.samples.length > 0, "samples must be non-empty");
  if (failures > failuresBefore) return; // structural failure here — deeper checks would just cascade

  const semantic = trace.latencySemantic;
  if (ingest) {
    check(target, LATENCY_SEMANTICS.has(semantic), `ingest output must carry latencySemantic (got ${JSON.stringify(semantic)})`);
    const artifact = trace.metadata.inputArtifact;
    check(target, artifact && /^[0-9a-f]{64}$/.test(artifact.sha256 ?? ""), "metadata.inputArtifact.sha256 (audit chain) required");
    check(target, typeof trace.metadata.deliveredBy === "string", "metadata.deliveredBy required");
  } else if (semantic !== undefined) {
    check(target, LATENCY_SEMANTICS.has(semantic), `latencySemantic "${semantic}" invalid`);
  }

  let prevT = -Infinity;
  let delivered = 0;
  for (const [i, s] of trace.samples.entries()) {
    const at = `samples[${i}]`;
    check(target, isFiniteNumber(s.tMs), `${at}.tMs must be finite`);
    check(target, s.tMs >= prevT, `${at}.tMs must be non-decreasing`);
    prevT = s.tMs;
    check(target, typeof s.linkUp === "boolean", `${at}.linkUp must be boolean`);
    if (s.linkUp) delivered += 1;
    if (s.latencyMs === null || s.latencyMs === undefined) {
      // no latency: only legal for a lost packet or a latency-less semantic
      check(target, !s.linkUp || semantic === "none", `${at}: delivered sample missing latencyMs (semantic=${semantic})`);
    } else {
      check(target, isFiniteNumber(s.latencyMs) && s.latencyMs > 0, `${at}.latencyMs must be finite > 0`);
      check(target, s.linkUp, `${at}: latencyMs present on a lost sample`);
    }
    if (s.jitterMs !== null && s.jitterMs !== undefined) {
      check(target, isFiniteNumber(s.jitterMs) && s.jitterMs >= 0, `${at}.jitterMs must be finite >= 0`);
    }
    if (s.throughputMbps !== null && s.throughputMbps !== undefined) {
      check(target, isFiniteNumber(s.throughputMbps) && s.throughputMbps >= 0, `${at}.throughputMbps must be finite >= 0`);
    }
    if (s.packetLossRatio !== null && s.packetLossRatio !== undefined) {
      check(target, isFiniteNumber(s.packetLossRatio) && s.packetLossRatio >= 0 && s.packetLossRatio <= 1, `${at}.packetLossRatio must be in [0,1]`);
    }
  }

  // summary self-consistency (packet-per-sample traces only; iperf3 samples
  // are per-interval aggregates, so the identity does not apply there)
  const su = trace.summary;
  const perPacket = trace.metadata?.ingestFormat !== "iperf3";
  if (perPacket && isFiniteNumber(su.sentPackets)) {
    check(target, su.sentPackets === trace.samples.length, `summary.sentPackets ${su.sentPackets} != samples.length ${trace.samples.length}`);
    check(target, su.deliveredEndToEnd === delivered, `summary.deliveredEndToEnd ${su.deliveredEndToEnd} != linkUp count ${delivered}`);
    const loss = 1 - delivered / su.sentPackets;
    check(target, Math.abs(su.overallPacketLossRatio - loss) < 1e-6, `summary.overallPacketLossRatio ${su.overallPacketLossRatio} != recomputed ${loss}`);
  } else if (!perPacket && isFiniteNumber(su.sentPackets)) {
    // iperf3 samples are per-interval aggregates, so the per-packet identities
    // don't apply — but the summary must still be internally consistent
    check(target, isFiniteNumber(su.deliveredEndToEnd) && su.deliveredEndToEnd >= 0 && su.deliveredEndToEnd <= su.sentPackets, `iperf3 summary delivered ${su.deliveredEndToEnd} outside [0, sent ${su.sentPackets}]`);
    if (isFiniteNumber(su.overallPacketLossRatio)) {
      const loss = 1 - su.deliveredEndToEnd / su.sentPackets;
      check(target, Math.abs(su.overallPacketLossRatio - loss) < 1e-3, `iperf3 summary loss ${su.overallPacketLossRatio} != (sent-delivered)/sent ${loss.toFixed(6)}`);
    }
  }
  const lats = trace.samples.map((s) => s.latencyMs).filter((v) => isFiniteNumber(v));
  if (lats.length > 0 && isFiniteNumber(su.meanLatencyMs)) {
    const mean = lats.reduce((a, b) => a + b, 0) / lats.length;
    check(target, Math.abs(su.meanLatencyMs - mean) < 1e-2, `summary.meanLatencyMs ${su.meanLatencyMs} != recomputed ${mean.toFixed(4)}`);
    check(target, Math.abs(su.minLatencyMs - Math.min(...lats)) < 1e-3, "summary.minLatencyMs != recomputed min");
    check(target, Math.abs(su.maxLatencyMs - Math.max(...lats)) < 1e-3, "summary.maxLatencyMs != recomputed max");
  }

  if (trace.schemaVersion === 2) {
    check(target, trace.handover === true, "schemaVersion 2 must set handover: true");
    check(target, Array.isArray(trace.segments) && trace.segments.length > 0, "segments required for schemaVersion 2");
    let prevEnd = -Infinity;
    for (const [i, seg] of (trace.segments ?? []).entries()) {
      const at = `segments[${i}]`;
      check(target, typeof seg.label === "string" && typeof seg.satellite === "string", `${at} label/satellite required`);
      check(target, ["GEO", "MEO", "LEO"].includes(seg.orbitClass), `${at}.orbitClass invalid`);
      check(target, isFiniteNumber(seg.startMs) && isFiniteNumber(seg.endMs) && seg.startMs <= seg.endMs, `${at} start/end invalid`);
      check(target, seg.startMs >= prevEnd, `${at} overlaps previous segment`);
      prevEnd = seg.endMs;
    }
    // every sample must fall INSIDE a segment whose satellite + orbit match
    // its own tags (membership alone would let a shifted segment band tell
    // the wrong handover story — codex review finding #5)
    let transitions = 0;
    let prevOrbit = null;
    const perSegmentDelivered = new Map();
    for (const s of trace.samples) {
      const seg = (trace.segments ?? []).find((g) => s.tMs >= g.startMs && s.tMs <= g.endMs);
      check(target, seg !== undefined, `sample at tMs ${s.tMs} falls inside no segment`);
      if (seg) {
        check(target, seg.satellite === s.servingSatellite && seg.orbitClass === s.orbitClass,
          `sample at tMs ${s.tMs} tagged ${s.servingSatellite}/${s.orbitClass} but its segment ${seg.label} is ${seg.satellite}/${seg.orbitClass}`);
        if (s.linkUp) perSegmentDelivered.set(seg.label, (perSegmentDelivered.get(seg.label) ?? 0) + 1);
      }
      if (prevOrbit !== null && s.orbitClass !== prevOrbit) transitions += 1;
      prevOrbit = s.orbitClass;
    }
    for (const seg of trace.segments ?? []) {
      check(target, (perSegmentDelivered.get(seg.label) ?? 0) === seg.deliveredPackets,
        `segment ${seg.label} deliveredPackets ${seg.deliveredPackets} != recounted ${perSegmentDelivered.get(seg.label) ?? 0}`);
    }
    check(target, su.handoverCount === transitions, `summary.handoverCount ${su.handoverCount} != recomputed orbit transitions ${transitions}`);
  }
}

function runIngest(args) {
  const res = spawnSync("python3", ["scripts/estnet/external_trace_ingest.py", ...args], {
    cwd: ROOT,
    encoding: "utf-8",
  });
  return res;
}

// ---------------------------------------------------------------- layer 1
section("committed ESTNeT fixtures");
for (const { file, pins } of FIXTURES) {
  const target = path.basename(file);
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    check(target, false, "fixture missing");
    continue;
  }
  const trace = JSON.parse(fs.readFileSync(abs, "utf-8"));
  validateTrace(target, trace);
  check(target, trace.sourceClass === "external-simulator-derived", "committed fixtures are self-run ESTNeT → external-simulator-derived");
  check(target, trace.schemaVersion === pins.schemaVersion, `pinned schemaVersion ${pins.schemaVersion}`);
  check(target, trace.samples.length === pins.samples, `pinned sample count ${pins.samples} (got ${trace.samples.length}) — regen drift? update pin CONSCIOUSLY`);
  if (pins.overallPacketLossRatio !== undefined) {
    check(target, trace.summary.overallPacketLossRatio === pins.overallPacketLossRatio, `pinned loss ${pins.overallPacketLossRatio}`);
  }
  if (pins.handoverCount !== undefined) {
    check(target, trace.summary.handoverCount === pins.handoverCount, `pinned handoverCount ${pins.handoverCount}`);
  }
  if (pins.distinctMeoSatellites !== undefined) {
    const meo = new Set(trace.segments.filter((s) => s.orbitClass === "MEO").map((s) => s.satellite));
    check(target, meo.size === pins.distinctMeoSatellites, `pinned ${pins.distinctMeoSatellites} distinct MEO satellites (got ${meo.size})`);
  }
  console.log(`  ${target}: samples=${trace.samples.length} sourceClass=${trace.sourceClass}`);
}

// ---------------------------------------------------------------- layer 2
section("ingest regression (all rehearsal formats)");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "estnet-gate-"));

// vec-single on a hermetic synthetic .vec with planted truth
{
  const vec = path.join(tmp, "mini.vec");
  const built = spawnSync("python3", ["scripts/estnet/testdata/make_mini_vec.py", vec], { cwd: ROOT, encoding: "utf-8" });
  check("mini-vec", built.status === 0, `make_mini_vec.py failed: ${built.stderr}`);
  const out = path.join(tmp, "mini-trace.json");
  const res = runIngest([
    "--format", "vec-single", "--in", vec, "--out", out,
    "--module", "%cg[1]%appWrapper[0].app", "--sent-module", "%cg[0]%appWrapper[0].app",
    "--source-class", "external-simulator-derived",
  ]);
  check("vec-single", res.status === 0, `ingest failed: ${res.stderr}`);
  if (res.status === 0) {
    const trace = JSON.parse(fs.readFileSync(out, "utf-8"));
    validateTrace("vec-single", trace, { ingest: true });
    check("vec-single", trace.latencySemantic === "one-way", "latencySemantic must be one-way");
    check("vec-single", trace.summary.sentPackets === 12 && trace.summary.deliveredEndToEnd === 11, `planted truth 12 sent / 11 delivered (got ${trace.summary.sentPackets}/${trace.summary.deliveredEndToEnd})`);
    check("vec-single", Math.abs(trace.summary.meanLatencyMs - 493.9) < 0.11, `planted latency ~493.9 ms (got ${trace.summary.meanLatencyMs})`);
    const lost = trace.samples.filter((s) => !s.linkUp);
    check("vec-single", lost.length === 1 && lost[0].tMs === 70000, "planted lost packet at seq 7 (tMs 70000)");
    console.log(`  vec-single: 12 sent / 11 delivered / mean ${trace.summary.meanLatencyMs} ms ✓`);
  }
}

// scavetool CSV export of a real kit run (format-true committed sample)
{
  const sample = path.join(ROOT, "scripts/estnet/testdata/sample-scavetool-single-flow.csv");
  if (!fs.existsSync(sample)) {
    check("scavetool-csv", false, "testdata/sample-scavetool-single-flow.csv missing");
  } else {
    const out = path.join(tmp, "csv-trace.json");
    const res = runIngest([
      "--format", "scavetool-csv", "--in", sample, "--out", out,
      "--module", "cg[1].networkHost.appWrapper[0].app",
      "--sent-module", "cg[0].networkHost.appWrapper[0].app",
      "--source-class", "external-simulator-derived",
    ]);
    check("scavetool-csv", res.status === 0, `ingest failed: ${res.stderr}`);
    if (res.status === 0) {
      const trace = JSON.parse(fs.readFileSync(out, "utf-8"));
      validateTrace("scavetool-csv", trace, { ingest: true });
      check("scavetool-csv", trace.latencySemantic === "one-way", "latencySemantic must be one-way");
      check("scavetool-csv", trace.samples.length > 0 && trace.summary.meanLatencyMs > 0, "must recover a latency series from CSV");
      console.log(`  scavetool-csv: samples=${trace.samples.length} mean ${trace.summary.meanLatencyMs} ms ✓`);
    }
  }
}

// ping text capture (RTT semantics)
{
  const sample = path.join(ROOT, "scripts/estnet/testdata/sample-ping.txt");
  if (!fs.existsSync(sample)) {
    check("ping", false, "testdata/sample-ping.txt missing");
  } else {
    const out = path.join(tmp, "ping-trace.json");
    const res = runIngest([
      "--format", "ping", "--in", sample, "--out", out,
      "--source-class", "network-test-derived",
    ]);
    check("ping", res.status === 0, `ingest failed: ${res.stderr}`);
    if (res.status === 0) {
      const trace = JSON.parse(fs.readFileSync(out, "utf-8"));
      validateTrace("ping", trace, { ingest: true });
      check("ping", trace.latencySemantic === "rtt", "latencySemantic must be rtt");
      check("ping", trace.summary.sentPackets === 8, `rehearsal capture is -c 8 (got ${trace.summary.sentPackets})`);
      check("ping", trace.nonClaims.some((n) => /ROUND-TRIP|RTT/.test(n)), "nonClaims must disclose RTT semantics");
      check("ping", trace.samples.every((s) => s.throughputMbps === null), "ping carries no throughput signal");
      console.log(`  ping: ${trace.summary.sentPackets} echoes, mean RTT ${trace.summary.meanLatencyMs} ms ✓`);
    }
  }
}

// iperf3 --json (throughput/jitter/loss, NO latency)
{
  const sample = path.join(ROOT, "scripts/estnet/testdata/sample-iperf3-udp.json");
  const out = path.join(tmp, "iperf3-trace.json");
  const res = runIngest([
    "--format", "iperf3", "--in", sample, "--out", out,
    "--source-class", "network-test-derived",
  ]);
  check("iperf3", res.status === 0, `ingest failed: ${res.stderr}`);
  if (res.status === 0) {
    const trace = JSON.parse(fs.readFileSync(out, "utf-8"));
    validateTrace("iperf3", trace, { ingest: true });
    check("iperf3", trace.latencySemantic === "none", "latencySemantic must be none");
    check("iperf3", trace.samples.length === 5, `5 intervals (got ${trace.samples.length})`);
    check("iperf3", trace.samples.every((s) => s.latencyMs === null), "iperf3 has no latency signal");
    check("iperf3", trace.summary.sentPackets === 464 && Math.abs(trace.summary.overallPacketLossRatio - 0.015086) < 1e-6, "end.sum packets/loss must round-trip");
    check("iperf3", Math.abs(trace.summary.finalJitterMs - 0.226) < 1e-9, "end.sum jitter must round-trip");
    console.log(`  iperf3: ${trace.samples.length} intervals, loss ${trace.summary.overallPacketLossRatio} ✓`);
  }
}

// live kit results, when present (loudly skipped otherwise — no silent caps)
{
  const kitVec = process.env.ESTNET_KIT
    ? path.join(process.env.ESTNET_KIT, "estnet-template/simulations/results/General-0.vec")
    : "/home/u24/papers/estnet-bootstrap-kit/estnet-template/simulations/results/General-0.vec";
  if (!fs.existsSync(kitVec)) {
    console.log("  kit-live: SKIPPED (no kit results at " + kitVec + ") — hermetic checks above still cover the parser");
  } else {
    const out = path.join(tmp, "kit-live-trace.json");
    const res = runIngest([
      "--format", "vec-single", "--in", kitVec, "--out", out,
      "--module", "%cg[1]%appWrapper[0].app", "--sent-module", "%cg[0]%appWrapper[0].app",
      "--source-class", "external-simulator-derived",
    ]);
    check("kit-live", res.status === 0, `ingest failed on real kit .vec: ${res.stderr}`);
    if (res.status === 0) {
      const trace = JSON.parse(fs.readFileSync(out, "utf-8"));
      validateTrace("kit-live", trace, { ingest: true });
      console.log(`  kit-live: real .vec ingested, samples=${trace.samples.length} mean ${trace.summary.meanLatencyMs} ms ✓`);
    }
  }
}

// ---------------------------------------------------------------- layer 3
section("provenance guard");
{
  const vec = path.join(tmp, "mini2.vec");
  spawnSync("python3", ["scripts/estnet/testdata/make_mini_vec.py", vec], { cwd: ROOT, encoding: "utf-8" });
  const res = runIngest([
    "--format", "vec-single", "--in", vec, "--out", path.join(tmp, "refused.json"),
    "--module", "%cg[1]%appWrapper[0].app",
    "--source-class", "operator-measured",
  ]);
  check("refusal", res.status !== 0, "operator-measured must be refused (exit non-zero)");
  check("refusal", /REFUSED/.test(res.stderr + res.stdout), "refusal message must state REFUSED");
  check("refusal", !fs.existsSync(path.join(tmp, "refused.json")), "refused ingest must not write output");
  console.log("  operator-measured → refused ✓");
}

// format x provenance matrix: a ping capture must not be labelable as a
// requirement-provided ESTNeT artifact
{
  const res = runIngest([
    "--format", "ping", "--in", "scripts/estnet/testdata/sample-ping.txt",
    "--out", path.join(tmp, "mislabeled.json"),
    "--source-class", "requirement-provided-estnet",
  ]);
  check("matrix", res.status !== 0 && /REFUSED/.test(res.stderr + res.stdout), "ping + requirement-provided-estnet must be refused");
  check("matrix", !fs.existsSync(path.join(tmp, "mislabeled.json")), "refused mislabel must not write output");
  console.log("  ping labeled as ESTNeT artifact → refused ✓");
}

// iperf3 TCP shape: only UDP mode carries the loss/jitter semantics this
// contract documents
{
  const tcp = path.join(tmp, "tcp.json");
  fs.writeFileSync(tcp, JSON.stringify({
    start: { test_start: { protocol: "TCP" } },
    intervals: [{ sum: { start: 0, end: 1, bits_per_second: 1e6 } }],
    end: { sum: {} },
  }));
  const res = runIngest([
    "--format", "iperf3", "--in", tcp, "--out", path.join(tmp, "tcp-trace.json"),
    "--source-class", "network-test-derived",
  ]);
  check("iperf3-tcp", res.status !== 0 && /REFUSED/.test(res.stderr + res.stdout), "iperf3 TCP must be refused (UDP-only contract)");
  console.log("  iperf3 TCP shape → refused ✓");
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\nverify:estnet — ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
console.log("PASS");
