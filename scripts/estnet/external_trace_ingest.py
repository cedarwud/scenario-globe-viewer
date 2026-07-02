#!/usr/bin/env python3
"""
External packet-trace ingestion -> PacketTrace JSON (requirement-data readiness layer).

The committed ESTNeT adapters (estnet_trace_adapter.py / estnet_handover_
trace_adapter.py) are scenario-specific: they compose OUR two-leg CHT x SANSA
runs. This tool is the generic front door for trace artifacts we did NOT
produce ourselves — rehearsed now so that when the requirement side
delivers real ESTNeT output, ingestion is a data step, not a dev project.

Supported input formats (--format):
  vec-single      OMNeT++/ESTNeT SQLite .vec, ONE sink module's received flow
                  (rcvdPkLifetime / pktSequenceNumber / rcvdThroughput). No
                  two-leg composition assumption — works on any ESTNeT run.
  scavetool-csv   `opp_scavetool export -F CSV-R` of the same vectors (for
                  deliveries that arrive as CSV instead of the SQLite .vec).
  ping            iputils `ping` text output (K-B1 bridge style: real ICMP
                  through the simulated tunnel). latencyMs = RTT, disclosed.
  iperf3          `iperf3 --json` output (UDP mode carries throughput /
                  jitter / loss; NO latency signal — disclosed).

Provenance (R12 — the ingest layer must not launder tiers):
  --source-class is REQUIRED and limited to classes this chain can honestly
  produce. `operator-measured` is structurally REFUSED: nothing that passes
  through this tool becomes an operator RF measurement. Every output embeds
  the input artifact's sha256 (audit chain: retained artefact + command),
  the mandatory per-class + per-format nonClaims, and a latencySemantic tag
  (`one-way` / `rtt` / `none`) so a consumer can never mistake RTT for
  one-way latency.

Usage examples:
  python3 scripts/estnet/external_trace_ingest.py \
      --format vec-single --in results/General-0.vec \
      --module '%cg[1]%appWrapper[0].app' --sent-module '%cg[0]%appWrapper[0].app' \
      --source-class external-simulator-derived \
      --out /tmp/trace.json

  python3 scripts/estnet/external_trace_ingest.py \
      --format ping --in ping-capture.txt \
      --source-class network-test-derived --delivered-by requirement \
      --out /tmp/ping-trace.json
"""
import argparse
import csv
import hashlib
import json
import os
import re
import sqlite3
import sys

SCHEMA_VERSION = 1
INGEST_TOOL = "external_trace_ingest.py v1"

ALLOWED_SOURCE_CLASSES = (
    # ESTNeT/OMNeT++ simulation output that WE ran (rehearsal on the kit).
    "external-simulator-derived",
    # ESTNeT artifacts delivered by the requirement side. Still a
    # SIMULATION — delivery does not upgrade the tier (R12).
    "requirement-provided-estnet",
    # ping/iperf-class network-test tool output (e.g. the K-B1 tun bridge:
    # real ICMP/UDP through a SIMULATED satellite network, or a local
    # rehearsal capture). Not an operator RF measurement.
    "network-test-derived",
)
REFUSED_SOURCE_CLASSES = ("operator-measured",)

# Format x provenance matrix: a ping/iperf capture is a network-test tool
# output, never an ESTNeT artifact — even when the requirement side delivered
# it. Prevents cross-labeling (codex review finding #1).
FORMAT_ALLOWED_CLASSES = {
    "vec-single": ("external-simulator-derived", "requirement-provided-estnet"),
    "scavetool-csv": ("external-simulator-derived", "requirement-provided-estnet"),
    "ping": ("network-test-derived",),
    "iperf3": ("network-test-derived",),
}

CLASS_NON_CLAIMS = {
    "external-simulator-derived": [
        "SIMULATION, not operator-measured (not Tier-A).",
    ],
    "requirement-provided-estnet": [
        "Requirement-delivered ESTNeT artifact: still a SIMULATION, not operator-measured (not Tier-A).",
        "Ingested by this project's adapter; derived fields below are our derivations, not the requirement's.",
    ],
    "network-test-derived": [
        "Network-test tool output (ping/iperf class), not an operator RF measurement.",
    ],
}


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def rfc3550_fold(samples):
    """Fill jitterMs (RFC 3550 running estimate) over delivered latencies, in order."""
    jitter_s = 0.0
    prev = None
    for s in samples:
        lat = s.get("latencyMs")
        if s.get("linkUp") and lat is not None:
            lat_s = lat / 1000.0
            if prev is not None:
                jitter_s += (abs(lat_s - prev) - jitter_s) / 16.0
            prev = lat_s
        s["jitterMs"] = round(jitter_s * 1000.0, 4)
    return jitter_s * 1000.0


def windowed_loss_fold(samples, window=10):
    """Fill packetLossRatio as the rolling lost-fraction of the last `window` samples."""
    flags = []
    for s in samples:
        flags.append(0 if s.get("linkUp") else 1)
        if len(flags) > window:
            flags.pop(0)
        s["packetLossRatio"] = round(sum(flags) / len(flags), 4)


def summarize(samples, sent_packets, extra=None):
    delivered = sum(1 for s in samples if s.get("linkUp"))
    lats = [s["latencyMs"] for s in samples if s.get("latencyMs") is not None]
    summary = {
        "sentPackets": sent_packets,
        "deliveredEndToEnd": delivered,
        "overallPacketLossRatio": round(1.0 - delivered / sent_packets, 6) if sent_packets else None,
        "meanLatencyMs": round(sum(lats) / len(lats), 4) if lats else None,
        "minLatencyMs": round(min(lats), 4) if lats else None,
        "maxLatencyMs": round(max(lats), 4) if lats else None,
        "finalJitterMs": samples[-1]["jitterMs"] if samples else 0.0,
    }
    if extra:
        summary.update(extra)
    return summary


# ---------------------------------------------------------------- vec / csv

VECTOR_NAMES = {
    "lifetime": "rcvdPkLifetime:vector",
    "seq": "rcvdPk:vector(pktSequenceNumber)",
    "hops": "rcvdPkNumHops:vector",
    "tput": "rcvdThroughput:vector",
    "sent": "sentPk:vector(pktSequenceNumber)",
}


def read_vec_single(path, module_like, sent_module_like):
    """SQLite .vec -> (rx map, tput series, sent times). Same read model as the
    committed adapters (vector/vectordata tables, simtimeExp scaling)."""
    db = sqlite3.connect(path)
    cur = db.cursor()
    scale = 10.0 ** list(cur.execute("select simtimeExp from run"))[0][0]

    def vid(module, name):
        rows = list(cur.execute(
            "select vectorId from vector where moduleName like ? and vectorName=?",
            (module, name)))
        return rows[0][0] if rows else None

    def series(v):
        if v is None:
            return []
        return [(t * scale, val) for t, val in cur.execute(
            "select simtimeRaw,value from vectordata where vectorId=? order by eventNumber", (v,))]

    lat = series(vid(module_like, VECTOR_NAMES["lifetime"]))
    seq = series(vid(module_like, VECTOR_NAMES["seq"]))
    hops = series(vid(module_like, VECTOR_NAMES["hops"]))
    tput = series(vid(module_like, VECTOR_NAMES["tput"]))
    sent = {}
    if sent_module_like:
        for t, v in series(vid(sent_module_like, VECTOR_NAMES["sent"])):
            sent[int(round(v))] = t
    return _rx_map(lat, seq, hops), tput, sent


def _rx_map(lat, seq, hops):
    """Join lifetime + sequence + hops series into {seq: {...}}.

    The sequence vector is REQUIRED (contract §5) and must pair 1:1 with the
    lifetime vector — a positional fallback would silently misnumber packets
    and move losses to the wrong place (probed by review), so refuse instead."""
    if lat and len(seq) != len(lat):
        raise SystemExit(
            f"sequence/lifetime vector mismatch (rcvdPk pktSequenceNumber: {len(seq)} rows, "
            f"rcvdPkLifetime: {len(lat)} rows) — the sequence vector is required 1:1; "
            "refusing positional fallback (would silently misnumber packets).")
    rx = {}
    for i, (t_rx, lat_s) in enumerate(lat):
        s = int(round(seq[i][1]))
        rx[s] = {"t_rx": t_rx, "lat_s": lat_s,
                 "hops": int(round(hops[i][1])) if i < len(hops) else None}
    return rx


def read_scavetool_csv(path, module_substr, sent_module_substr):
    """`opp_scavetool export -F CSV-R` -> same (rx, tput, sent) shape.

    CSV-R vector rows carry the whole series in two space-separated columns:
    vectime + vecvalue. Module matching is substring-based (deliveries use
    full module paths like SpaceTerrestrialNetwork.cg[1].networkHost....)."""
    vectors = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("type") != "vector":
                continue
            module = row.get("module") or ""
            name = row.get("name") or ""
            times = [float(x) for x in (row.get("vectime") or "").split()]
            values = [float(x) for x in (row.get("vecvalue") or "").split()]
            if len(times) != len(values):
                raise SystemExit(
                    f"CSV-R row {module} / {name}: vectime has {len(times)} entries but "
                    f"vecvalue has {len(values)} — truncated or corrupt export, refusing.")
            vectors[(module, name)] = list(zip(times, values))

    def find(substr, name):
        for (module, vname), data in vectors.items():
            if vname == name and substr in module:
                return data
        return []

    lat = find(module_substr, VECTOR_NAMES["lifetime"])
    seq = find(module_substr, VECTOR_NAMES["seq"])
    hops = find(module_substr, VECTOR_NAMES["hops"])
    tput = find(module_substr, VECTOR_NAMES["tput"])
    sent = {}
    if sent_module_substr:
        for t, v in find(sent_module_substr, VECTOR_NAMES["sent"]):
            sent[int(round(v))] = t
    return _rx_map(lat, seq, hops), tput, sent


def tput_at(tput_series, t, tol=0.6):
    """rcvdThroughput is an impulse on a 0.1 s grid just after the reception —
    take the max within +/-tol s (same read as the committed adapters)."""
    best = 0.0
    for ts, v in tput_series:
        if t - tol <= ts <= t + tol:
            best = max(best, v)
        elif ts > t + tol:
            break
    return best


def _interpolated_births(rx):
    """Birth times for every seq 0..max(rx) when no sender vector exists.

    Delivered packets have an exact birth (t_rx - lifetime). Lost packets
    (sequence gaps) get a birth interpolated from the received cadence —
    exact for a fixed-interval sender (ESTNeT BasicApp), disclosed as an
    estimate in the nonClaims either way."""
    known = {s: v["t_rx"] - v["lat_s"] for s, v in rx.items()}
    seqs = sorted(known)
    if len(seqs) >= 2:
        steps = [(known[b] - known[a]) / (b - a) for a, b in zip(seqs, seqs[1:]) if b > a]
        steps.sort()
        step = steps[len(steps) // 2]
    else:
        step = 0.0
    births = {}
    for s in range(max(rx) + 1):
        if s in known:
            births[s] = known[s]
            continue
        anchor = min(seqs, key=lambda k: abs(k - s))
        births[s] = known[anchor] + (s - anchor) * step
    return births


def build_single_flow(rx, tput, sent):
    """Compose one received flow into PacketTrace samples (single leg, one-way)."""
    if sent:
        n_sent = len(sent)
        seqs = sorted(sent)
        births = dict(sent)
        loss_denominator = "sender sentPk vector"
    elif rx:
        n_sent = max(rx) + 1
        seqs = list(range(n_sent))
        births = _interpolated_births(rx)
        loss_denominator = ("max received sequence number + 1 (heuristic; sender vector not "
                            "provided; lost-packet timestamps interpolated from received cadence)")
    else:
        raise SystemExit("No packets found — wrong module filter, or recording was off.")

    t0 = min(births.values())

    samples = []
    for s in seqs:
        r = rx.get(s)
        t_birth = births.get(s, (r["t_rx"] - r["lat_s"]) if r else None)
        if t_birth is None:
            continue  # unreachable defensively: births covers every seq in seqs
        if r:
            samples.append({
                "tMs": round((t_birth - t0) * 1000.0, 3),
                "latencyMs": round(r["lat_s"] * 1000.0, 4),
                "throughputMbps": round(tput_at(tput, r["t_rx"]) / 1e6, 9),
                "linkUp": True,
                "hops": r["hops"],
            })
        else:
            samples.append({
                "tMs": round((t_birth - t0) * 1000.0, 3),
                "latencyMs": None,
                "throughputMbps": 0.0,
                "linkUp": False,
                "hops": None,
            })
    samples.sort(key=lambda x: x["tMs"])
    return samples, n_sent, loss_denominator


# ---------------------------------------------------------------------- ping

PING_REPLY_RE = re.compile(
    r"(?:\[(?P<epoch>\d+\.\d+)\]\s*)?\d+ bytes from .*?icmp_seq=(?P<seq>\d+).*?time=(?P<ms>[\d.]+)\s*ms")
PING_STATS_RE = re.compile(
    r"(?P<tx>\d+) packets transmitted, (?P<rx>\d+) (?:packets )?received.*?(?P<loss>[\d.]+)% packet loss")
PING_RTT_RE = re.compile(
    r"rtt min/avg/max/mdev = (?P<min>[\d.]+)/(?P<avg>[\d.]+)/(?P<max>[\d.]+)/(?P<mdev>[\d.]+) ms")


PING_ELAPSED_RE = re.compile(r"packet loss(?:, time (?P<ms>\d+)ms)?")


def build_ping(path, interval_ms):
    text = open(path, encoding="utf-8", errors="replace").read()
    replies = {}
    epochs = {}
    for m in PING_REPLY_RE.finditer(text):
        seq = int(m.group("seq"))
        if seq in replies:
            continue  # ignore DUP! lines — first reply wins
        replies[seq] = float(m.group("ms"))
        if m.group("epoch"):
            epochs[seq] = float(m.group("epoch"))

    stats = PING_STATS_RE.search(text)
    if not replies and not stats:
        raise SystemExit("Not a ping capture (no icmp_seq replies, no summary line).")
    tx = int(stats.group("tx")) if stats else max(replies)

    # iputils numbers icmp_seq from 1. Anchoring the range at min(replies)
    # would silently relocate LEADING losses to the tail (review finding), so
    # the base is seq 1 unless the capture really contains a lower seq.
    base_seq = min([1] + list(replies)) if replies else 1
    seqs = list(range(base_seq, base_seq + tx))

    extra_non_claims = []
    if epochs:
        # nearest delivered epoch anchors lost packets' timestamps
        eseqs = sorted(epochs)
        def offset_s(seq):
            if seq in epochs:
                return epochs[seq]
            anchor = min(eseqs, key=lambda k: abs(k - seq))
            return epochs[anchor] + (seq - anchor) * (interval_ms / 1000.0)
        offsets = {s: offset_s(s) for s in seqs}
        t0 = min(offsets.values())
        t_ms_map = {s: round((offsets[s] - t0) * 1000.0, 3) for s in seqs}
        if any(s not in epochs for s in seqs):
            extra_non_claims.append(
                "lost-echo timestamps are extrapolated from the nearest received -D epoch "
                f"at the assumed {interval_ms:.0f} ms cadence.")
    else:
        t_ms_map = {s: round((s - base_seq) * interval_ms, 3) for s in seqs}
        extra_non_claims.append(
            f"no -D epoch timestamps in the capture; time axis assumes a {interval_ms:.0f} ms "
            "send cadence (--ping-interval-ms).")
        elapsed = PING_ELAPSED_RE.search(text)
        if elapsed and elapsed.group("ms") is not None and tx > 1:
            reported = float(elapsed.group("ms"))
            expected = (tx - 1) * interval_ms
            if expected > 0 and abs(reported - expected) / expected > 0.2:
                print(f"WARNING: ping-reported elapsed {reported:.0f} ms differs from the "
                      f"assumed cadence total {expected:.0f} ms by >20% — check --ping-interval-ms",
                      file=sys.stderr)
                extra_non_claims.append(
                    f"assumed cadence disagrees with the ping-reported elapsed time "
                    f"({expected:.0f} vs {reported:.0f} ms); the time axis is approximate.")

    samples = []
    for seq in seqs:
        rtt = replies.get(seq)
        samples.append({
            "tMs": t_ms_map[seq],
            "latencyMs": rtt,           # RTT — latencySemantic discloses this
            "throughputMbps": None,     # ping carries no throughput signal
            "linkUp": rtt is not None,
            "hops": None,
        })
    samples.sort(key=lambda s: s["tMs"])

    extra = {}
    rtt_line = PING_RTT_RE.search(text)
    if rtt_line:
        extra["pingRttAvgMs"] = float(rtt_line.group("avg"))
        extra["pingRttMdevMs"] = float(rtt_line.group("mdev"))
    return samples, tx, extra, extra_non_claims


# -------------------------------------------------------------------- iperf3

def build_iperf3(path):
    doc = json.load(open(path, encoding="utf-8"))
    proto = ((doc.get("start") or {}).get("test_start") or {}).get("protocol")
    if proto != "UDP":
        raise SystemExit(
            f"REFUSED: iperf3 protocol {proto!r} — only UDP mode is supported. TCP carries "
            "no per-packet loss/jitter semantics for this contract; request `iperf3 -u --json`.")
    intervals = doc.get("intervals") or []
    if not intervals:
        raise SystemExit("Not an iperf3 --json result (no intervals[]).")
    samples = []
    for iv in intervals:
        s = iv.get("sum") or {}
        bps = float(s.get("bits_per_second") or 0.0)
        packets = s.get("packets")
        lost = s.get("lost_packets")
        samples.append({
            "tMs": round(float(s.get("start", 0.0)) * 1000.0, 3),
            "latencyMs": None,          # iperf3 carries no latency signal
            "jitterMs": round(float(s["jitter_ms"]), 4) if s.get("jitter_ms") is not None else None,
            "throughputMbps": round(bps / 1e6, 6),
            "packetLossRatio": (round(lost / packets, 4)
                                if packets not in (None, 0) and lost is not None else None),
            "linkUp": bps > 0.0,
            "hops": None,
        })

    end_sum = (doc.get("end") or {}).get("sum") or {}
    sent = end_sum.get("packets")
    lost = end_sum.get("lost_packets")
    delivered = (sent - lost) if (sent is not None and lost is not None) else None
    summary = {
        "sentPackets": sent,
        "deliveredEndToEnd": delivered,
        "overallPacketLossRatio": (round(float(end_sum["lost_percent"]) / 100.0, 6)
                                   if end_sum.get("lost_percent") is not None else None),
        "meanLatencyMs": None,
        "minLatencyMs": None,
        "maxLatencyMs": None,
        "finalJitterMs": (round(float(end_sum["jitter_ms"]), 4)
                          if end_sum.get("jitter_ms") is not None else None),
        "meanThroughputMbps": (round(float(end_sum["bits_per_second"]) / 1e6, 6)
                               if end_sum.get("bits_per_second") is not None else None),
    }
    return samples, summary


# ---------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(
        description="External trace -> PacketTrace JSON (multi-format ingestion)")
    ap.add_argument("--format", required=True,
                    choices=["vec-single", "scavetool-csv", "ping", "iperf3"])
    ap.add_argument("--in", dest="input", required=True, help="input artifact path")
    ap.add_argument("--out", required=True, help="output PacketTrace JSON path")
    ap.add_argument("--source-class", required=True,
                    choices=list(ALLOWED_SOURCE_CLASSES) + list(REFUSED_SOURCE_CLASSES),
                    help="provenance class (operator-measured is refused by design)")
    ap.add_argument("--delivered-by", default="local-rehearsal",
                    help='who produced/delivered the artifact (e.g. "requirement", default "local-rehearsal")')
    ap.add_argument("--path-label", default=None, help="human path label for the panel")
    ap.add_argument("--sim-epoch-utc", default=None, help="UTC instant of t=0, if known")
    ap.add_argument("--module", default=None,
                    help="sink module filter (vec-single: SQL LIKE; scavetool-csv: substring)")
    ap.add_argument("--sent-module", default=None,
                    help="sender module filter for the loss denominator (optional)")
    ap.add_argument("--ping-interval-ms", type=float, default=1000.0,
                    help="ping cadence for the time axis when no -D epoch timestamps (default 1000)")
    args = ap.parse_args()

    if args.source_class in REFUSED_SOURCE_CLASSES:
        raise SystemExit(
            "REFUSED: this ingestion chain cannot produce operator-measured data. "
            "Nothing that passes through a simulator or a local tool capture is an "
            "operator RF measurement (R12 — reuse does not upgrade provenance).")
    if args.source_class not in FORMAT_ALLOWED_CLASSES[args.format]:
        raise SystemExit(
            f"REFUSED: --format {args.format} cannot carry sourceClass "
            f"'{args.source_class}' (allowed: {', '.join(FORMAT_ALLOWED_CLASSES[args.format])}). "
            "ping/iperf outputs are network-test tool captures, not ESTNeT artifacts; "
            ".vec/CSV are simulator artifacts — the label must match what the artifact IS.")

    non_claims = list(CLASS_NON_CLAIMS[args.source_class])
    non_claims.append(f"Artifact delivered by: {args.delivered_by}.")
    tool_provenance = {
        "vec-single": "estnet-inet",
        "scavetool-csv": "estnet-inet (opp_scavetool CSV-R export)",
        "ping": "iputils-ping",
        "iperf3": "iperf3",
    }[args.format]

    extra_summary = {}
    if args.format in ("vec-single", "scavetool-csv"):
        if not args.module:
            raise SystemExit(f"--module is required for --format {args.format}")
        reader = read_vec_single if args.format == "vec-single" else read_scavetool_csv
        rx, tput, sent = reader(args.input, args.module, args.sent_module)
        samples, n_sent, loss_denominator = build_single_flow(rx, tput, sent)
        latency_semantic = "one-way"
        non_claims += [
            f"Single-flow trace read from one sink module; loss denominator = {loss_denominator}.",
            "jitter is adapter-derived (RFC 3550 over latency), not a native signal.",
        ]
        rfc3550_fold(samples)
        windowed_loss_fold(samples)
        summary = summarize(samples, n_sent, extra_summary)
        default_label = f"single-flow trace ({args.module})"
    elif args.format == "ping":
        samples, n_sent, extra_summary, ping_non_claims = build_ping(args.input, args.ping_interval_ms)
        latency_semantic = "rtt"
        non_claims += [
            "latencyMs is ROUND-TRIP time (RTT), not one-way latency.",
            "jitter is adapter-derived (RFC 3550 over RTT), not a tool signal.",
            "ping carries no throughput signal; throughputMbps is null.",
        ] + ping_non_claims
        rfc3550_fold(samples)
        windowed_loss_fold(samples)
        summary = summarize(samples, n_sent, extra_summary)
        default_label = "ping RTT capture"
    else:  # iperf3
        samples, summary = build_iperf3(args.input)
        latency_semantic = "none"
        non_claims += [
            "iperf3 reports throughput/jitter/loss; it carries NO latency signal — latencyMs is null.",
            "per-interval jitter/loss are the tool's own UDP report fields when present.",
        ]
        default_label = "iperf3 throughput/jitter capture"

    trace = {
        "schemaVersion": SCHEMA_VERSION,
        "pathLabel": args.path_label or default_label,
        "sourceClass": args.source_class,
        "toolProvenance": tool_provenance,
        "latencySemantic": latency_semantic,
        "assumptionSet": (
            f"Ingested from a {args.format} artifact by {INGEST_TOOL}; "
            "field derivations and semantics are disclosed in nonClaims; "
            "the input artifact is identified by sha256 in metadata.inputArtifact."
        ),
        "nonClaims": non_claims,
        "metadata": {
            **({"simEpochUtc": args.sim_epoch_utc} if args.sim_epoch_utc else {}),
            "ingestTool": INGEST_TOOL,
            "ingestFormat": args.format,
            "deliveredBy": args.delivered_by,
            "inputArtifact": {
                "name": os.path.basename(args.input),
                "sha256": sha256_of(args.input),
                "bytes": os.path.getsize(args.input),
            },
        },
        "summary": summary,
        "samples": samples,
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(trace, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {args.out}")
    print(f"  format={args.format} sourceClass={args.source_class} "
          f"latencySemantic={latency_semantic} samples={len(samples)}")
    s = trace["summary"]
    print(f"  sent={s.get('sentPackets')} delivered={s.get('deliveredEndToEnd')} "
          f"loss={s.get('overallPacketLossRatio')} meanLatency={s.get('meanLatencyMs')} ms")


if __name__ == "__main__":
    main()
