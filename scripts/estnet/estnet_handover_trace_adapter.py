#!/usr/bin/env python3
"""
ESTNeT -> PacketTrace adapter, GEO<->MEO HANDOVER variant.

Reads the ESTNeT/OMNeT++ SQLite vector result (.vec) for the CHT x SANSA
GEO<->MEO handover scenario (omnetpp_cht_sansa_handover.ini) and emits a
PacketTrace JSON whose end-to-end latency STEPS as the active relay hands over
GEO -> MEO -> GEO.

The scenario routes each handover phase through a different relay satellite via
its own windowed uplink/downlink BasicApp pair (see the .ini header). This
adapter reads each phase's two one-hop legs, composes them (latency = uplink +
downlink, like the single-GEO adapter), tags every sample with the serving
satellite + orbit class, and concatenates the phases on the sim-time axis.

    phase 1 (GEO APSTAR-7): CHT--cg0.app0-->sat0.app0 ; sat0.app0-->SANSA.app0
    phase 2 (MEO GSAT0102): CHT--cg0.app1-->sat1.app0 ; sat1.app0-->SANSA.app1
    phase 3 (GEO APSTAR-7): CHT--cg0.app2-->sat0.app1 ; sat0.app1-->SANSA.app2
    phase 4 (MEO GSAT0232): CHT--cg0.app3-->sat2.app0 ; sat2.app0-->SANSA.app3
    phase 5 (GEO APSTAR-7): CHT--cg0.app4-->sat0.app2 ; sat0.app2-->SANSA.app4
    phase 6 (MEO GSAT0209): CHT--cg0.app5-->sat3.app0 ; sat3.app0-->SANSA.app5

tMs is ABSOLUTE sim time (t=0 == 2026-06-15T00:00:00Z), so the handover
boundaries land at the geometry-true times (MEO mutual-visibility windows
2970..5400 / 11310..13620 / 21180..21600 s).

RE-POINT GAP LOSS: phases 2/3/5 deliberately keep sending ~45 s PAST their
contact-plan boundary (5400/11310/21180 s) while both GS dishes have already
re-pointed to the next relay, so those frames are genuinely dropped by the RF
model (mispointed yagi). The cross-window sequence statistics below (union of
sent + both legs' received seqs) surface them as linkUp=false samples whose
cluster STARTS at the geometry-true handover instant. At the other two
boundaries the old relay stays angularly close enough to the new pointing that
overrun frames still deliver (verified on the .vec) — and a delivered
below-mask MEO frame would break golden-D1 mask alignment — so phases 1/4
send no overrun traffic. Next streams start 50 s after their boundary,
keeping phase send-spans non-overlapping.

HONESTY (R12): ESTNeT-SIMULATED, not operator-measured. The GEO<->MEO route
preference mirrors the viewer's demo-balanced-v1 SHOWCASE policy -- it is NOT an
RF-failure-driven handover (the GEO stays visible the whole run); the relay
switch is the single directional dish re-pointing to the lower-latency Galileo
MEO while it is mutually visible (independently SGP4-verified). jitter + loss are
adapter-derived; the e2e is a composition of two one-hop legs, not one relayed
packet; 20 W EIRP + 9600 bps are assumed link params.

Usage:
    python3 scripts/estnet/estnet_handover_trace_adapter.py \
        --vec /home/u24/papers/estnet-bootstrap-kit/estnet-template/simulations/results/General-0.vec \
        --out public/fixtures/estnet/cht-sansa-handover-packet-trace.json

GENERIC SCENARIO MODE (--scenario): pass a scenario descriptor JSON emitted by
generate_handover_scenario.mjs and the phase map + all prose/metadata are built
from the descriptor instead of the hardcoded CHT x SANSA constants below. The
default (no --scenario) path is byte-for-byte unchanged.

    python3 scripts/estnet/estnet_handover_trace_adapter.py \
        --vec .../results/General-0.vec \
        --scenario scripts/estnet/scenario/cht_domestic_handover_scenario.json \
        --out public/fixtures/estnet/cht-domestic-handover-packet-trace.json
"""
import argparse
import json
import sqlite3

SIM_EPOCH_UTC = "2026-06-15T00:00:00Z"  # explicit simulationStart = sim t=0

# Phase map (see omnetpp_cht_sansa_handover.ini). Module-name LIKE patterns.
PHASES = [
    {"label": "GEO-1", "orbit": "GEO", "satellite": "APSTAR-7",
     "uplink_src":   "%cg[0]%appWrapper[0].app",
     "uplink_sink":  "%sat[0]%appWrapper[0].app",
     "downlink_sink": "%cg[1]%appWrapper[0].app"},
    {"label": "MEO-2", "orbit": "MEO", "satellite": "GSAT0102 (GALILEO-FM2)",
     "uplink_src":   "%cg[0]%appWrapper[1].app",
     "uplink_sink":  "%sat[1]%appWrapper[0].app",
     "downlink_sink": "%cg[1]%appWrapper[1].app"},
    {"label": "GEO-3", "orbit": "GEO", "satellite": "APSTAR-7",
     "uplink_src":   "%cg[0]%appWrapper[2].app",
     "uplink_sink":  "%sat[0]%appWrapper[1].app",
     "downlink_sink": "%cg[1]%appWrapper[2].app"},
    {"label": "MEO-4", "orbit": "MEO", "satellite": "GSAT0232 (GALILEO 32)",
     "uplink_src":   "%cg[0]%appWrapper[3].app",
     "uplink_sink":  "%sat[2]%appWrapper[0].app",
     "downlink_sink": "%cg[1]%appWrapper[3].app"},
    {"label": "GEO-5", "orbit": "GEO", "satellite": "APSTAR-7",
     "uplink_src":   "%cg[0]%appWrapper[4].app",
     "uplink_sink":  "%sat[0]%appWrapper[2].app",
     "downlink_sink": "%cg[1]%appWrapper[4].app"},
    {"label": "MEO-6", "orbit": "MEO", "satellite": "GSAT0209 (GALILEO 12)",
     "uplink_src":   "%cg[0]%appWrapper[5].app",
     "uplink_sink":  "%sat[3]%appWrapper[0].app",
     "downlink_sink": "%cg[1]%appWrapper[5].app"},
]


def _scale(cur):
    return 10.0 ** list(cur.execute("select simtimeExp from run"))[0][0]


def _vid(cur, module_like, vector_name):
    rows = list(cur.execute(
        "select vectorId from vector where moduleName like ? and vectorName=?",
        (module_like, vector_name)))
    return rows[0][0] if rows else None


def _series(cur, vid, scale):
    if vid is None:
        return []
    return [(t * scale, v) for t, v in cur.execute(
        "select simtimeRaw,value from vectordata where vectorId=? order by eventNumber",
        (vid,))]


def _leg(cur, sink_module, scale):
    """Per-leg dict keyed by sequence number: {seq: {t_rx, lat_s, hops}} + tput series."""
    lat = _series(cur, _vid(cur, sink_module, "rcvdPkLifetime:vector"), scale)
    seq = _series(cur, _vid(cur, sink_module, "rcvdPk:vector(pktSequenceNumber)"), scale)
    hops = _series(cur, _vid(cur, sink_module, "rcvdPkNumHops:vector"), scale)
    tput = _series(cur, _vid(cur, sink_module, "rcvdThroughput:vector"), scale)
    out = {}
    for i, (t_rx, lat_s) in enumerate(lat):
        s = int(round(seq[i][1])) if i < len(seq) else i
        out[s] = {"t_rx": t_rx, "lat_s": lat_s,
                  "hops": int(round(hops[i][1])) if i < len(hops) else None}
    return out, tput


def _sent_times(cur, src_module, scale):
    sv = _vid(cur, src_module, "sentPk:vector(pktSequenceNumber)")
    out = {}
    if sv is None:
        return out
    for t, v in cur.execute(
            "select simtimeRaw,value from vectordata where vectorId=? order by eventNumber", (sv,)):
        out[int(round(v))] = t * scale
    return out


def _tput_at(tput_series, t, tol=0.6):
    best = 0.0
    for ts, v in tput_series:
        if t - tol <= ts <= t + tol:
            best = max(best, v)
        elif ts > t + tol:
            break
    return best


def _scenario_trace(scenario, vec_path, segments, summary, samples):
    """Trace envelope for a generated scenario (descriptor-driven prose/metadata)."""
    orbits = {}
    for sat in scenario["satellites"]:
        orbits.setdefault(sat["orbit"], []).append(sat["satellite"])
    counts = " / ".join(f"{o} {len(orbits[o])}" for o in ("LEO", "MEO", "GEO") if o in orbits)
    policy = scenario.get("policyId", "demo-balanced-v1")
    n_phases = len(scenario["phases"])
    return {
        "schemaVersion": 2,
        "pathLabel": scenario["pathLabel"],
        "sourceClass": "external-simulator-derived",
        "toolProvenance": "estnet-inet",
        "handover": True,
        "assumptionSet": (
            f"ESTNeT v1.0 (OMNeT++/INET) handover model, faithful replay of the viewer's "
            f"{policy} timeline on the pinned demo window: {n_phases} serving phases across "
            f"{len(scenario['satellites'])} relay satellites ({counts}), TLEs lifted verbatim "
            f"from the pinned snapshot the viewer itself loads. Each phase is two one-hop "
            f"unicast RF legs (uplink+downlink) composed in the adapter; the single "
            f"directional GS yagi re-points at each phase boundary via a non-overlapping "
            f"contact plan — the re-point IS the modeled handover. Assumed 20 W sat EIRP + "
            f"9600 bps GMSK UHF PHY (latency ≈ 2× one-way propagation + ~236 ms "
            f"serialization). LOSS-FREE BASELINE: send windows sit inside each serving phase "
            f"(start +50 s / stop −10 s guards); no re-point overrun traffic is sent."
        ),
        "nonClaims": [
            "SIMULATION, not operator-measured (not Tier-A).",
            f"The handover sequence is a SHOWCASE route preference (mirrors the viewer's {policy} policy), NOT an RF-failure-driven handover.",
            "Every serving satellite is genuinely mutually visible from both stations for its whole phase (independently python-sgp4-verified, verify_handover_phases_independent.py), but a single dish can only point one way — the re-point IS the modeled handover.",
            "jitter and loss are adapter-derived, not native ESTNeT signals.",
            "each phase's end-to-end is a composition of two independent one-hop RF legs, not a single relayed packet.",
            "RF EIRP/bitrate are assumed link parameters chosen so all links close.",
            "loss-free baseline: no re-point overrun traffic is modeled in this scenario, so zero packet loss is a scenario design choice, not an RF robustness claim.",
        ],
        "metadata": {
            "simEpochUtc": scenario["simEpochUtc"],
            "policyId": policy,
            "generatedBy": scenario.get("generatedBy"),
            "satellites": {o: ", ".join(v) for o, v in orbits.items()},
            "stationA": {"id": scenario["stationA"]["id"], "lat": scenario["stationA"]["lat"], "lon": scenario["stationA"]["lon"]},
            "stationB": {"id": scenario["stationB"]["id"], "lat": scenario["stationB"]["lat"], "lon": scenario["stationB"]["lon"]},
            "handoverWindowUtc": scenario["handoverBoundariesUtc"],
            "lossModel": scenario.get("lossModel"),
            "vecSource": vec_path,
        },
        "segments": segments,
        "summary": summary,
        "samples": samples,
    }


def build_trace(vec_path, scenario=None):
    db = sqlite3.connect(vec_path)
    cur = db.cursor()
    scale = _scale(cur)

    phases = scenario["phases"] if scenario else PHASES

    # Build a flat, time-ordered list of composed e2e samples across phases.
    raw = []   # (t_birth_s, sample_dict_without_jitter, orbit, satellite)
    segments = []
    per_orbit_lat = {}
    for ph in phases:
        per_orbit_lat.setdefault(ph["orbit"], [])

    for ph in phases:
        up, up_tput = _leg(cur, ph["uplink_sink"], scale)
        dn, dn_tput = _leg(cur, ph["downlink_sink"], scale)
        sent = _sent_times(cur, ph["uplink_src"], scale)
        seqs = sorted(set(up) | set(dn) | set(sent))
        if not seqs:
            continue
        seg_births = []
        seg_delivered = 0
        for seq in seqs:
            u, d = up.get(seq), dn.get(seq)
            t_birth = sent.get(seq)
            if t_birth is None:
                # no send record (shouldn't happen) -> approximate from rx
                t_birth = (u or d or {}).get("t_rx", 0.0)
            seg_births.append(t_birth)
            delivered = (u is not None) and (d is not None)
            if delivered:
                seg_delivered += 1
                lat_s = u["lat_s"] + d["lat_s"]
                per_orbit_lat[ph["orbit"]].append(lat_s * 1000.0)
                tp = min(_tput_at(up_tput, u["t_rx"]), _tput_at(dn_tput, d["t_rx"]))
                raw.append((t_birth, {
                    "latencyMs": round(lat_s * 1000.0, 4),
                    "throughputMbps": round(tp / 1e6, 9),
                    "linkUp": True,
                    "hops": (u["hops"] or 0) + (d["hops"] or 0),
                }, ph["orbit"], ph["satellite"]))
            else:
                raw.append((t_birth, {
                    "latencyMs": None, "throughputMbps": 0.0,
                    "linkUp": False, "hops": None,
                }, ph["orbit"], ph["satellite"]))
        segments.append({
            "label": ph["label"], "orbitClass": ph["orbit"], "satellite": ph["satellite"],
            "startMs": round(min(seg_births) * 1000.0, 3),
            "endMs": round(max(seg_births) * 1000.0, 3),
            "deliveredPackets": seg_delivered,
        })

    if not raw:
        raise SystemExit("No packets in result -- did the links close / recording on?")

    raw.sort(key=lambda r: r[0])
    t0 = 0.0  # absolute sim time axis (t=0 == SIM_EPOCH_UTC)

    samples = []
    rfc_jitter = 0.0
    prev_transit = None
    loss_window = []
    delivered_total = 0
    handover_count = 0
    prev_orbit = None
    for t_birth, s, orbit, satellite in raw:
        delivered = s["linkUp"]
        delivered_total += 1 if delivered else 0
        loss_window.append(0 if delivered else 1)
        if len(loss_window) > 10:
            loss_window.pop(0)
        if prev_orbit is not None and orbit != prev_orbit:
            handover_count += 1
        prev_orbit = orbit
        if delivered and s["latencyMs"] is not None:
            lat_s = s["latencyMs"] / 1000.0
            if prev_transit is not None:
                rfc_jitter += (abs(lat_s - prev_transit) - rfc_jitter) / 16.0
            prev_transit = lat_s
        samples.append({
            "tMs": round((t_birth - t0) * 1000.0, 3),
            "latencyMs": s["latencyMs"],
            "jitterMs": round(rfc_jitter * 1000.0, 4),
            "throughputMbps": s["throughputMbps"],
            "packetLossRatio": round(sum(loss_window) / len(loss_window), 4),
            "linkUp": s["linkUp"],
            "hops": s["hops"],
            "servingSatellite": satellite,
            "orbitClass": orbit,
        })

    def _mean(a):
        return round(sum(a) / len(a), 4) if a else None

    n_sent = len(samples)
    all_lats = [x for v in per_orbit_lat.values() for x in v]
    summary = {
        "sentPackets": n_sent,
        "deliveredEndToEnd": delivered_total,
        "overallPacketLossRatio": round(1.0 - delivered_total / n_sent, 6),
        "handoverCount": handover_count,
        "meanLatencyMs": _mean([s["latencyMs"] for s in samples if s["latencyMs"] is not None]),
        "meanLatencyByOrbitMs": {k: _mean(v) for k, v in per_orbit_lat.items() if v},
        "minLatencyMs": round(min(all_lats), 4),
        "maxLatencyMs": round(max(all_lats), 4),
        "finalJitterMs": round(rfc_jitter * 1000.0, 4),
    }

    if scenario:
        return _scenario_trace(scenario, vec_path, segments, summary, samples)

    return {
        "schemaVersion": 2,
        "pathLabel": "CHT-Yangmingshan → [ APSTAR-7 GEO ⇄ Galileo MEO (GSAT0102/0232/0209) ] → SANSA-Hartebeesthoek",
        "sourceClass": "external-simulator-derived",
        "toolProvenance": "estnet-inet",
        "handover": True,
        "assumptionSet": (
            "ESTNeT v1.0 (OMNeT++/INET) GEO↔MEO handover model, full 6-hour demo "
            "timeline. Relay satellites: APSTAR-7 (~76.5°E GEO, continuous) and three "
            "Galileo MEOs (GSAT0102, GSAT0232, GSAT0209), all from the pinned "
            "scenario-globe-viewer snapshot. The single directional GS yagi re-points "
            "from the GEO to whichever Galileo MEO is mutually visible, then back — six "
            "serving phases over the window (MEO mutual-vis 00:49:30..01:30:00Z, "
            "03:08:30..03:47:00Z, 05:53:00..06:00:00Z), reproducing the viewer's six "
            "handover events. Each phase is two one-hop unicast RF legs (uplink+downlink) "
            "composed in the adapter; assumed 20 W sat EIRP + 9600 bps GMSK UHF PHY "
            "(latency ≈ 2× one-way propagation + ~236 ms serialization). The lower MEO "
            "range (~27,100 km vs GEO ~38,700 km) is why the latency steps down ~81 ms. "
            "Three phases keep sending ~45 s past their contact-plan boundary while both "
            "dishes have re-pointed to the next relay, so the RF model drops those "
            "frames — a real packet-loss spike starting at the handover instant "
            "(boundaries at 01:30 / 03:08:30 / 05:53); at the other two boundaries the "
            "old relay stays angularly close to the new pointing and overrun frames "
            "would still deliver, so no overrun traffic is sent there. Each next stream "
            "starts 50 s after its boundary."
        ),
        "nonClaims": [
            "SIMULATION, not operator-measured (not Tier-A).",
            "The GEO↔MEO handover is a SHOWCASE route preference (mirrors the viewer's demo-balanced-v1 policy), NOT an RF-failure-driven handover — the GEO stays visible the whole run.",
            "The GEO and the serving Galileo MEO are genuinely mutually visible at each handover time (independently SGP4-verified), but a single dish can only point one way, so the re-point IS the modeled handover.",
            "jitter and loss are adapter-derived, not native ESTNeT signals.",
            "each phase's end-to-end is a composition of two independent one-hop RF legs, not a single relayed packet.",
            "RF EIRP/bitrate are assumed link parameters chosen so both links close.",
            "packet loss occurs ONLY in the deliberate ~45 s re-point overrun windows (traffic addressed to the previous relay after both dishes re-pointed) — a modeling consequence of a single dish sending through the handover, not an RF fade or congestion measurement.",
            "the overrun is modeled at the three boundaries where the RF model actually drops the mispointed frames (verified on the simulation output); at the other two the old relay stays angularly close to the new pointing and overrun frames would still deliver, so no overrun traffic is sent there — the antenna-pattern geometry decides, nothing is scripted to fail.",
        ],
        "metadata": {
            "simEpochUtc": SIM_EPOCH_UTC,
            "satellites": {
                "GEO": "APSTAR-7, NORAD 38107, ~76.5°E GEO",
                "MEO": "GSAT0102 / GSAT0232 / GSAT0209 (Galileo, ~23,222 km)",
            },
            "stationA": {"id": "cht-yangmingshan", "lat": 25.155, "lon": 121.55},
            "stationB": {"id": "sansa-hartebeesthoek", "lat": -25.8872, "lon": 27.7075},
            "handoverWindowUtc": [
                "2026-06-15T00:49:30Z", "2026-06-15T01:30:00Z",
                "2026-06-15T03:08:30Z", "2026-06-15T03:47:00Z",
                "2026-06-15T05:53:00Z", "2026-06-15T06:00:00Z",
            ],
            "repointOverrunSeconds": 45,
            "postHandoverStartDelaySeconds": 50,
            "vecSource": vec_path,
        },
        "segments": segments,
        "summary": summary,
        "samples": samples,
    }


def main():
    ap = argparse.ArgumentParser(description="ESTNeT .vec -> handover PacketTrace JSON")
    ap.add_argument("--vec", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scenario", help="scenario descriptor JSON (generate_handover_scenario.mjs output); default = built-in CHT x SANSA phase map")
    args = ap.parse_args()
    scenario = None
    if args.scenario:
        with open(args.scenario, encoding="utf-8") as f:
            scenario = json.load(f)
    trace = build_trace(args.vec, scenario)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(trace, f, ensure_ascii=False, indent=2)
        f.write("\n")
    s = trace["summary"]
    print(f"Wrote {args.out}")
    print(f"  samples={len(trace['samples'])} delivered={s['deliveredEndToEnd']} "
          f"loss={s['overallPacketLossRatio']} handovers={s['handoverCount']}")
    print(f"  latency by orbit (ms) = {s['meanLatencyByOrbitMs']}  overall mean={s['meanLatencyMs']}")
    for seg in trace["segments"]:
        print(f"  segment {seg['label']} {seg['orbitClass']} {seg['satellite']}: "
              f"{seg['startMs']/1000:.0f}s..{seg['endMs']/1000:.0f}s")


if __name__ == "__main__":
    main()
