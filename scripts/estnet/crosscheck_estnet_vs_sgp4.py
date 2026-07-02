#!/usr/bin/env python3
"""
ESTNeT trace <-> independent SGP4 cross-check (R12 dual-model consistency).

Validates that the committed ESTNeT packet-trace fixtures are PHYSICALLY
consistent with an INDEPENDENT orbit propagation: for every delivered sample,
the end-to-end latency must equal

    latency(t) = [range_GS-A->sat(t) + range_sat->GS-B(t)] / c  +  2 * serial

where the ranges come from python-sgp4 (own GMST / TEME->ECEF, the same
independent path as precheck_2hop_geometry_independent.py — NOT the viewer,
NOT ESTNeT) and `serial` is the single constant per-leg serialization delay of
the 9600 bps PHY. `serial` is fitted from the GEO samples (one free constant),
then the SAME constant must explain every non-GEO (MEO / LEO) segment,
including the range slope while each satellite moves. Hundreds of samples,
many independent geometries, one degree of freedom.

What agreement DOES prove: ESTNeT's internal SGP4+timing and our independent
SGP4 implementation are consistent — an implementation-correctness cross-proof
for the trace geometry (K-A2-adjacent latency story).
What it does NOT prove (R12): nothing here is operator-measured; both sides
are models fed by the same pinned TLEs. Agreement never upgrades the tier.

Checks:
  C1 station coords in the fixture == the registry coords used here.
  C2 serial constant fitted on GEO is physically sane (frame 100..300 bytes
     at 9600 bps, payload is 100 B).
  C3 per-segment median residual |lat_obs - lat_pred| < 0.5 ms.
  C4 overall p95 |residual| < 1.0 ms.
  C5 (v2) every non-GEO (MEO / LEO) segment's DELIVERED span lies inside
     that satellite's independently computed mutual-visibility window
     (elevation thresholds mirror the viewer: 10 deg base + per-station
     terrain mask, strict >). Lost samples are exempt BY DESIGN: the deliberate re-point
     overrun sends frames to the previous relay after the dishes re-pointed
     (they are dropped, latency=null), so a segment's raw span may extend a
     few tens of seconds past LOS while its delivered traffic never does —
     the overrun must be disclosed in the fixture's nonClaims or C5 fails.

Usage:
  python3 scripts/estnet/crosscheck_estnet_vs_sgp4.py            # handover fixture
  python3 scripts/estnet/crosscheck_estnet_vs_sgp4.py \
      --fixture public/fixtures/estnet/cht-sansa-apstar7-packet-trace.json \
      --tle scripts/estnet/scenario/configs/tles/apstar7_geo.tle
  (flat v1 fixture: since the 2026-07-02 APSTAR-7 re-pick its scenario pins an
   explicit simulationStart, so tMs is absolute on the same pinned-demo axis as
   the handover trace.)
"""
import argparse
import json
import math
import sys
from datetime import datetime, timedelta, timezone

try:
    from sgp4.api import Satrec, jday
except ImportError:
    raise SystemExit("python-sgp4 required (same dependency as precheck_2hop_geometry_independent.py)")

DEG = math.pi / 180.0
WGS84_A = 6378137.0
WGS84_E2 = 6.69437999014e-3
C_KM_S = 299792.458

# Same registry constants as precheck_2hop_geometry_independent.py
STATIONS = {
    "cht-yangmingshan":      dict(lat=25.155,  lon=121.55,  alt=489.0,  mask=21),
    "sansa-hartebeesthoek":  dict(lat=-25.8872, lon=27.7075, alt=1553.0, mask=1),
    "cht-fangshan":          dict(lat=22.27,   lon=120.71,  alt=230.0,  mask=0),
}
BASE_ELEV = 10.0
PHY_BPS = 9600.0
PAYLOAD_BYTES = 100


def station_ecef(s):
    lat, lon, alt = s["lat"] * DEG, s["lon"] * DEG, s["alt"]
    sl, cl, so, co = math.sin(lat), math.cos(lat), math.sin(lon), math.cos(lon)
    n = WGS84_A / math.sqrt(1 - WGS84_E2 * sl * sl)
    return ((n + alt) * cl * co / 1000.0,
            (n + alt) * cl * so / 1000.0,
            (n * (1 - WGS84_E2) + alt) * sl / 1000.0,
            sl, cl, so, co)


def gmst_rad(jd, fr):
    tut1 = (jd + fr - 2451545.0) / 36525.0
    sec = (-6.2e-6 * tut1**3 + 0.093104 * tut1**2
           + (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841)
    rad = math.radians(sec / 240.0) % (2 * math.pi)
    return rad + 2 * math.pi if rad < 0 else rad


def teme_to_ecef(r, theta):
    x, y, z = r
    return (math.cos(theta) * x + math.sin(theta) * y,
            -math.sin(theta) * x + math.cos(theta) * y, z)


def range_and_elev(st, sat_ecef):
    x, y, z, sl, cl, so, co = st
    dx, dy, dz = sat_ecef[0] - x, sat_ecef[1] - y, sat_ecef[2] - z
    up = cl * co * dx + cl * so * dy + sl * dz
    east = -so * dx + co * dy
    north = -sl * co * dx - sl * so * dy + cl * dz
    rng = math.sqrt(east * east + north * north + up * up)
    elev = math.degrees(math.asin(up / rng)) if rng > 0 else -90.0
    return rng, elev


def load_tles(path):
    lines = [ln.rstrip() for ln in open(path, encoding="utf-8") if ln.strip()]
    out = {}
    for i in range(0, len(lines) - 2, 3):
        name = lines[i].strip()
        out[name] = Satrec.twoline2rv(lines[i + 1], lines[i + 2])
    return out


def sat_ecef_at(sat, t_utc):
    jd, fr = jday(t_utc.year, t_utc.month, t_utc.day,
                  t_utc.hour, t_utc.minute, t_utc.second + t_utc.microsecond * 1e-6)
    e, r, _ = sat.sgp4(jd, fr)
    if e != 0:
        return None
    return teme_to_ecef(r, gmst_rad(jd, fr))


def percentile(sorted_vals, p):
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * p
    lo, hi = math.floor(k), math.ceil(k)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] * (hi - k) + sorted_vals[hi] * (k - lo)


def main():
    ap = argparse.ArgumentParser(description="ESTNeT trace vs independent SGP4 cross-check")
    ap.add_argument("--fixture", default="public/fixtures/estnet/cht-sansa-handover-packet-trace.json")
    ap.add_argument("--tle", default="scripts/estnet/scenario/configs/tles/geo_meo_handover.tle")
    ap.add_argument("--median-tol-ms", type=float, default=0.5, help="C3 per-segment |median residual| bound")
    ap.add_argument("--p95-tol-ms", type=float, default=1.0, help="C4 overall p95 |residual| bound")
    ap.add_argument("--elev-margin-deg", type=float, default=0.05,
                    help="C6 boundary margin: the serving windows were derived on a 30 s grid "
                         "by the viewer's model, so a segment-edge sample can sit a few "
                         "hundredths of a degree below the mask under THIS independent model")
    args = ap.parse_args()

    fx = json.load(open(args.fixture, encoding="utf-8"))
    tles = load_tles(args.tle)
    failures = []

    def check(cond, label):
        print(("  ok   " if cond else "  FAIL ") + label)
        if not cond:
            failures.append(label)

    # C1 — station identity guard: the fixture names its own endpoints; both
    # must be known registry constants here and the coords must match.
    meta = fx["metadata"]
    ids = {}
    for key in ("stationA", "stationB"):
        m = meta[key]
        st = m.get("id")
        ids[key] = st
        ref = STATIONS.get(st)
        if ref is None:
            check(False, f"C1 {key} id {st!r} not in this script's registry constants")
            return finish(failures)
        check(abs(m["lat"] - ref["lat"]) < 1e-6 and abs(m["lon"] - ref["lon"]) < 1e-6,
              f"C1 {key} == registry {st}")

    epoch = datetime.strptime(meta["simEpochUtc"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    v2 = fx.get("schemaVersion") == 2
    if not v2:
        print("  note v1 fixture: single-sat steady-state trace; tMs is absolute "
              "(explicit simulationStart == metadata.simEpochUtc).")

    # resolve serving satellite per sample
    def sat_for(sample):
        if v2:
            name = sample["servingSatellite"]
            if name in tles:
                return name
            for t in tles:
                if t.startswith(name):
                    return t
            raise SystemExit(f"sample servingSatellite {name!r} not in TLE file")
        # v1: single satellite named in metadata.satellite ("APSTAR-7, NORAD ...")
        for t in tles:
            if meta["satellite"].startswith(t):
                return t
        raise SystemExit(f"metadata.satellite {meta['satellite']!r} not matched in TLE file")

    id_a, id_b = ids["stationA"], ids["stationB"]
    st_a = station_ecef(STATIONS[id_a])
    st_b = station_ecef(STATIONS[id_b])
    thr_a = BASE_ELEV + STATIONS[id_a]["mask"]
    thr_b = BASE_ELEV + STATIONS[id_b]["mask"]

    # pass 1 — propagate every delivered sample once
    rows = []  # (tMs, satName, orbit, lat_obs_ms, prop_ms)
    min_ea, min_eb = 90.0, 90.0
    for s in fx["samples"]:
        if not s.get("linkUp") or s.get("latencyMs") is None:
            continue
        name = sat_for(s)
        t_utc = epoch + timedelta(milliseconds=s["tMs"])
        ecef = sat_ecef_at(tles[name], t_utc)
        if ecef is None:
            failures.append(f"sgp4 error at tMs={s['tMs']}")
            continue
        ra, ea = range_and_elev(st_a, ecef)
        rb, eb = range_and_elev(st_b, ecef)
        min_ea, min_eb = min(min_ea, ea), min(min_eb, eb)
        prop_ms = (ra + rb) / C_KM_S * 1000.0
        rows.append((s["tMs"], name, s.get("orbitClass", "GEO"), s["latencyMs"], prop_ms))
    check(len(rows) > 0, "delivered samples propagated")
    if not rows:
        return finish(failures)

    # C6 — hard physical floor: every delivered sample's serving sat above the
    # 10 deg base elevation at BOTH stations under this independent model
    # (catches fabricated visibility outright).
    m = args.elev_margin_deg
    check(min_ea > BASE_ELEV - m and min_eb > BASE_ELEV - m,
          f"C6 every delivered sample above the {BASE_ELEV:.0f} deg base elevation "
          f"(min A[{id_a}] {min_ea:.4f}, B[{id_b}] {min_eb:.4f})")

    # C7 — viewer-mask POLICY comparison (10 deg base + per-station terrain
    # mask). The handover trace claims golden-D1 alignment, so it must comply
    # (within the disclosed 30 s boundary-quantization margin). The flat-GEO
    # trace may sit below the mask only if the fixture itself DISCLOSES the
    # shortfall in nonClaims; an undisclosed shortfall fails. (The original
    # ABS-2A steady-state pick tripped exactly this and was superseded by
    # APSTAR-7 2026-07-02.)
    mask_ok = min_ea > thr_a - m and min_eb > thr_b - m
    if v2:
        check(mask_ok,
              f"C7 viewer-mask policy compliance within {m:.2f} deg margin "
              f"(min A[{id_a}] {min_ea:.4f} vs {thr_a:.0f}, B[{id_b}] {min_eb:.4f} vs {thr_b:.0f})")
    elif mask_ok:
        check(True, f"C7 viewer-mask policy compliance (min A[{id_a}] {min_ea:.4f} vs {thr_a:.0f})")
    else:
        disclosed = any("mask" in n.lower() for n in fx.get("nonClaims", []))
        check(disclosed,
              f"C7 below the viewer-mask policy (min A[{id_a}] {min_ea:.4f} vs {thr_a:.0f}) — "
              "fixture nonClaims MUST disclose the mask shortfall (undisclosed = fail)")
        if disclosed:
            print(f"  note C7: below viewer-mask policy (min A[{id_a}] {min_ea:.4f} vs {thr_a:.0f}) "
                  "and DISCLOSED in the fixture's nonClaims — kept as the steady-state PHY "
                  "signature; the handover trace is the viewer-aligned one.")

    # C2 — fit the single serialization constant on GEO samples
    geo_serials = [(lat - prop) / 2.0 for (_, _, orbit, lat, prop) in rows if orbit == "GEO"]
    if not geo_serials:  # pure-MEO trace: fit on everything
        geo_serials = [(lat - prop) / 2.0 for (_, _, _, lat, prop) in rows]
    geo_serials.sort()
    serial_ms = geo_serials[len(geo_serials) // 2]
    frame_bytes = serial_ms / 1000.0 * PHY_BPS / 8.0
    print(f"  fitted per-leg serialization = {serial_ms:.4f} ms -> implied frame {frame_bytes:.1f} B "
          f"(payload {PAYLOAD_BYTES} B @ {PHY_BPS:.0f} bps)")
    check(100.0 <= frame_bytes <= 300.0, "C2 implied frame size physically sane (100..300 B)")

    # C3/C4 — residuals with the ONE fitted constant across all segments
    residuals = [lat - (prop + 2.0 * serial_ms) for (_, _, _, lat, prop) in rows]
    by_seg = {}
    for (t, name, orbit, lat, prop), r in zip(rows, residuals):
        by_seg.setdefault(name, []).append(r)
    for name, rs in by_seg.items():
        rs_sorted = sorted(rs)
        med = rs_sorted[len(rs_sorted) // 2]
        check(abs(med) <= args.median_tol_ms,
              f"C3 {name}: median residual {med:+.4f} ms (n={len(rs)}) within ±{args.median_tol_ms}")
    abs_sorted = sorted(abs(r) for r in residuals)
    p95 = percentile(abs_sorted, 0.95)
    check(p95 <= args.p95_tol_ms, f"C4 overall p95 |residual| {p95:.4f} ms within {args.p95_tol_ms}")

    # C5 — (v2) every non-GEO (MEO/LEO) segment's DELIVERED span must sit inside
    # independently computed co-visibility. Lost samples (the disclosed
    # re-point overrun: frames to the previous relay after the dishes
    # re-pointed) are exempt — but only if the fixture DISCLOSES the overrun.
    if v2:
        for seg in fx.get("segments", []):
            if seg["orbitClass"] == "GEO":
                continue  # GEO co-visibility is continuous; MEO/LEO spans are the real check
            candidates = [t for t in tles if t == seg["satellite"] or t.startswith(seg["satellite"])]
            if not candidates:
                check(False, f"C5 {seg['label']}: satellite {seg['satellite']!r} not in TLE file")
                continue
            name = candidates[0]
            delivered_ts = [s["tMs"] for s in fx["samples"]
                            if s.get("linkUp") and seg["startMs"] <= s["tMs"] <= seg["endMs"]]
            if not delivered_ts:
                check(False, f"C5 {seg['label']}: no delivered samples in segment")
                continue
            span_lo, span_hi = min(delivered_ts), max(delivered_ts)
            if span_lo > seg["startMs"] or span_hi < seg["endMs"]:
                lost_n = sum(1 for s in fx["samples"]
                             if s.get("linkUp") is False and seg["startMs"] <= s["tMs"] <= seg["endMs"])
                disclosed = any("re-point overrun" in n.lower() for n in fx.get("nonClaims", []))
                check(disclosed,
                      f"C5 {seg['label']}: segment span exceeds its delivered span "
                      f"({lost_n} lost) — the re-point overrun must be disclosed in nonClaims")
                print(f"  note C5 {seg['label']}: delivered span {span_lo/1000:.0f}..{span_hi/1000:.0f}s "
                      f"< segment span {seg['startMs']/1000:.0f}..{seg['endMs']/1000:.0f}s "
                      f"({lost_n} lost re-point-overrun frames exempt, disclosed)")
            ok = True
            t_ms = span_lo
            while t_ms <= span_hi:
                ecef = sat_ecef_at(tles[name], epoch + timedelta(milliseconds=t_ms))
                if ecef is None:
                    ok = False
                    break
                _, ea = range_and_elev(st_a, ecef)
                _, eb = range_and_elev(st_b, ecef)
                if not (ea > thr_a and eb > thr_b):
                    ok = False
                    break
                t_ms += 30_000
            # Close the 30 s grid: check the exact delivered-span endpoint too.
            if ok:
                ecef = sat_ecef_at(tles[name], epoch + timedelta(milliseconds=span_hi))
                if ecef is None:
                    ok = False
                else:
                    _, ea = range_and_elev(st_a, ecef)
                    _, eb = range_and_elev(st_b, ecef)
                    ok = ea > thr_a - args.elev_margin_deg and eb > thr_b - args.elev_margin_deg
            check(ok, f"C5 {seg['label']} {name}: delivered span inside independent co-visibility "
                      f"(A[{id_a}]>{thr_a} B[{id_b}]>{thr_b})")

    return finish(failures)


def finish(failures):
    print()
    if failures:
        print(f"CROSSCHECK FAIL ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("CROSSCHECK PASS — ESTNeT trace consistent with independent SGP4 geometry "
          "(dual-model consistency; SIMULATION, not measurement).")


if __name__ == "__main__":
    main()
