#!/usr/bin/env python3
"""
ESTNeT -> PacketTrace adapter (Step 2 of the ESTNeT-trace pipeline).

Reads an ESTNeT/OMNeT++ SQLite vector result (.vec) for the CHT x SANSA
two-leg GEO scenario and emits a PacketTrace JSON that the scenario-globe-viewer
2D packet-trace panel consumes.

WHY TWO LEGS (see omnetpp_cht_sansa.ini header for the full story):
stock ESTNeT cannot relay one broadcast packet GS-A -> Sat -> GS-B (RadioHost
floods ground stations directly on broadcast, bypassing the satellite), so the
end-to-end path is simulated as two genuine one-hop unicast RF legs:
    Leg 1 (uplink):   CHT  (node 2) --> SAT (node 1)     sink = sat[0] app
    Leg 2 (downlink): SAT  (node 1) --> SANSA (node 3)   sink = cg[1] app
This adapter aligns the two legs by packet sequence number (same cadence/count)
and COMPOSES them into the end-to-end GS-A -> Sat -> GS-B trace:
    latencyMs        = uplink_lifetime + downlink_lifetime
    packetLossRatio  = 1 - (delivered_uplink AND delivered_downlink) / sent
    throughputMbps   = bottleneck = min(uplink, downlink) rcvd throughput
    jitterMs         = RFC-3550 running estimate over the end-to-end latency
    linkUp           = both legs delivered this sequence number

HONESTY (R12): sourceClass = "external-simulator-derived". ESTNeT is a
SIMULATION, not operator-measured; jitter and loss are OUR derivations; the
20 W sat EIRP is an assumed link config; per-leg latency is dominated by the
stock 9600 bps cubesat serialization on top of the real GEO propagation.

Usage:
    python3 scripts/estnet/estnet_trace_adapter.py \
        --vec /home/u24/papers/estnet-bootstrap-kit/estnet-template/simulations/results/General-0.vec \
        --out public/fixtures/estnet/cht-sansa-abs2a-packet-trace.json
"""
import argparse
import json
import sqlite3
import sys

# Default scenario node identity (see omnetpp_cht_sansa.ini).
UPLINK_SINK_MODULE = "%sat[0]%appWrapper[0].app"     # sat receives CHT (leg 1)
DOWNLINK_SINK_MODULE = "%cg[1]%appWrapper[0].app"    # SANSA receives sat (leg 2)
UPLINK_SRC_MODULE = "%cg[0]%appWrapper[0].app"       # CHT sends (leg 1 source)
DOWNLINK_SRC_MODULE = "%sat[0]%appWrapper[0].app"    # sat sends (leg 2 source)

PROPAGATION_PER_HOP_MS = 128.7   # geometry pre-check: ABS-2A <-> CHT/SANSA one-way
SIM_EPOCH_UTC = "2026-06-13T20:13:00Z"  # ABS-2A TLE epoch = sim t=0


def _scale(cur):
    exp = list(cur.execute("select simtimeExp from run"))[0][0]
    return 10.0 ** exp


def _vector_id(cur, module_like, vector_name):
    rows = list(cur.execute(
        "select vectorId from vector where moduleName like ? and vectorName=?",
        (module_like, vector_name)))
    return rows[0][0] if rows else None


def _series(cur, vid, scale):
    """Return [(t_seconds, value)] ordered by event number (reception order)."""
    if vid is None:
        return []
    return [(t * scale, v) for t, v in cur.execute(
        "select simtimeRaw,value from vectordata where vectorId=? order by eventNumber",
        (vid,))]


def _leg(cur, sink_module, scale):
    """Per-leg dict keyed by sequence number: {seq: {t_rx, lat_s, hops}}."""
    lat = _series(cur, _vector_id(cur, sink_module, "rcvdPkLifetime:vector"), scale)
    seq = _series(cur, _vector_id(cur, sink_module, "rcvdPk:vector(pktSequenceNumber)"), scale)
    hops = _series(cur, _vector_id(cur, sink_module, "rcvdPkNumHops:vector"), scale)
    tput = _series(cur, _vector_id(cur, sink_module, "rcvdThroughput:vector"), scale)
    out = {}
    for i, (t_rx, lat_s) in enumerate(lat):
        s = int(round(seq[i][1])) if i < len(seq) else i
        out[s] = {"t_rx": t_rx, "lat_s": lat_s,
                  "hops": int(round(hops[i][1])) if i < len(hops) else None}
    return out, tput


def _sent_times(cur, src_module, scale):
    """{seq: send_time_seconds} from the source app's sentPk vector."""
    sv = _vector_id(cur, src_module, "sentPk:vector(pktSequenceNumber)")
    out = {}
    if sv is None:
        return out
    for t, v in cur.execute(
            "select simtimeRaw,value from vectordata where vectorId=? order by eventNumber", (sv,)):
        out[int(round(v))] = t * scale
    return out


def _tput_at(tput_series, t, tol=0.6):
    """Throughput (bps) for the reception near time t.

    ESTNeT's rcvdThroughput is ~0 everywhere with one windowed-throughput spike
    per reception, landing on the 0.1 s sample grid just AFTER the lifetime
    event. So take the max within +/-tol seconds of the reception, not the
    at-or-before value (which would catch the preceding 0)."""
    best = 0.0
    for ts, v in tput_series:
        if t - tol <= ts <= t + tol:
            best = max(best, v)
        elif ts > t + tol:
            break
    return best


def build_trace(vec_path):
    db = sqlite3.connect(vec_path)
    cur = db.cursor()
    scale = _scale(cur)

    up, up_tput = _leg(cur, UPLINK_SINK_MODULE, scale)
    dn, dn_tput = _leg(cur, DOWNLINK_SINK_MODULE, scale)
    up_sent = _sent_times(cur, UPLINK_SRC_MODULE, scale)
    dn_sent = _sent_times(cur, DOWNLINK_SRC_MODULE, scale)

    n_sent = max(len(up_sent), len(dn_sent),
                 (max(up) + 1) if up else 0, (max(dn) + 1) if dn else 0)
    if n_sent == 0:
        raise SystemExit("No packets in result -- did the link close / recording on?")

    samples = []
    rfc_jitter = 0.0          # RFC-3550 running jitter estimate (seconds)
    prev_transit = None       # previous end-to-end latency (seconds)
    loss_window = []          # rolling delivered/lost flags (last 10 cycles)
    t0 = min([t for t in up_sent.values()] + [t for t in dn_sent.values()]) if (up_sent or dn_sent) else 0.0

    delivered_total = 0
    for seq in range(n_sent):
        u = up.get(seq)
        d = dn.get(seq)
        delivered = (u is not None) and (d is not None)
        delivered_total += 1 if delivered else 0
        loss_window.append(0 if delivered else 1)
        if len(loss_window) > 10:
            loss_window.pop(0)

        # birth time of the logical end-to-end packet = CHT uplink emission
        t_birth = up_sent.get(seq, dn_sent.get(seq, t0))
        t_ms = round((t_birth - t0) * 1000.0, 3)

        if delivered:
            lat_s = u["lat_s"] + d["lat_s"]
            if prev_transit is not None:
                diff = abs(lat_s - prev_transit)
                rfc_jitter += (diff - rfc_jitter) / 16.0
            prev_transit = lat_s
            tp = min(_tput_at(up_tput, u["t_rx"]), _tput_at(dn_tput, d["t_rx"]))
            samples.append({
                "tMs": t_ms,
                "latencyMs": round(lat_s * 1000.0, 4),
                "jitterMs": round(rfc_jitter * 1000.0, 4),
                "throughputMbps": round(tp / 1e6, 9),
                "packetLossRatio": round(sum(loss_window) / len(loss_window), 4),
                "linkUp": True,
                "hops": (u["hops"] or 0) + (d["hops"] or 0),
            })
        else:
            samples.append({
                "tMs": t_ms,
                "latencyMs": None,
                "jitterMs": round(rfc_jitter * 1000.0, 4),
                "throughputMbps": 0.0,
                "packetLossRatio": round(sum(loss_window) / len(loss_window), 4),
                "linkUp": False,
                "hops": None,
            })

    delivered_latencies = [s["latencyMs"] for s in samples if s["latencyMs"] is not None]
    summary = {
        "sentPackets": n_sent,
        "deliveredEndToEnd": delivered_total,
        "overallPacketLossRatio": round(1.0 - delivered_total / n_sent, 6),
        "meanLatencyMs": round(sum(delivered_latencies) / len(delivered_latencies), 4) if delivered_latencies else None,
        "minLatencyMs": round(min(delivered_latencies), 4) if delivered_latencies else None,
        "maxLatencyMs": round(max(delivered_latencies), 4) if delivered_latencies else None,
        "finalJitterMs": round(rfc_jitter * 1000.0, 4),
    }

    return {
        "schemaVersion": 1,
        "pathLabel": "CHT-Yangmingshan → ABS-2A (GEO) → SANSA-Hartebeesthoek",
        "sourceClass": "external-simulator-derived",
        "toolProvenance": "estnet-inet",
        "assumptionSet": (
            "ESTNeT v1.0 (OMNeT++/INET) GEO two-leg model: ABS-2A ~75E from the "
            "pinned commercial-geo snapshot; assumed 20 W sat EIRP to close the link; "
            "stock 9600 bps GMSK UHF PHY (latency = ~128.7 ms/hop GEO propagation + "
            "~118 ms/hop serialization); two one-hop unicast RF legs composed "
            "(uplink+downlink) because stock ESTNeT cannot relay a broadcast via the sat."
        ),
        "nonClaims": [
            "SIMULATION, not operator-measured (not Tier-A).",
            "jitter and loss are adapter-derived, not native ESTNeT signals.",
            "end-to-end is a composition of two independent one-hop RF legs, not a single relayed packet.",
            "RF EIRP/bitrate are assumed link parameters chosen so the GEO link closes.",
        ],
        "metadata": {
            "simEpochUtc": SIM_EPOCH_UTC,
            "satellite": "ABS-2A (MONGOLSAT-1), NORAD 41588, ~75E GEO, incl 0.0256deg",
            "stationA": {"id": "cht-yangmingshan", "lat": 25.155, "lon": 121.55},
            "stationB": {"id": "sansa-hartebeesthoek", "lat": -25.8872, "lon": 27.7075},
            "propagationPerHopMs": PROPAGATION_PER_HOP_MS,
            "vecSource": vec_path,
        },
        "summary": summary,
        "samples": samples,
    }


def main():
    ap = argparse.ArgumentParser(description="ESTNeT .vec -> PacketTrace JSON adapter")
    ap.add_argument("--vec", required=True, help="path to ESTNeT General-0.vec (SQLite)")
    ap.add_argument("--out", required=True, help="output PacketTrace JSON path")
    args = ap.parse_args()

    trace = build_trace(args.vec)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(trace, f, ensure_ascii=False, indent=2)
        f.write("\n")

    s = trace["summary"]
    print(f"Wrote {args.out}")
    print(f"  samples={len(trace['samples'])} sent={s['sentPackets']} "
          f"deliveredE2E={s['deliveredEndToEnd']} loss={s['overallPacketLossRatio']}")
    print(f"  latency mean/min/max = {s['meanLatencyMs']}/{s['minLatencyMs']}/{s['maxLatencyMs']} ms "
          f"finalJitter={s['finalJitterMs']} ms")


if __name__ == "__main__":
    main()
