#!/usr/bin/env python3
"""
Independent phase-table verification (R12) for a generated handover scenario.

Reads the scenario descriptor JSON (generate_handover_scenario.mjs output) and
the scenario TLE file, then re-derives — with python-sgp4, a fully independent
implementation from the viewer's satellite.js path — whether every serving
phase's satellite is MUTUALLY visible from both ground stations, above each
station's effective elevation mask (10 deg base + terrain mask, the viewer's
additive rule), for the phase's whole serving span.

This is the guard against building a scenario around a fake handover: an app
window outside real mutual visibility would simulate traffic through a relay
neither dish could actually see.

Sampling: 30 s grid (the viewer's LEO cadence). The first/last grid sample of
each phase may sit exactly on the policy switch instant, so one grid step of
tolerance is allowed at each boundary; every interior sample must pass.

Agreement here is implementation cross-proof between two SGP4 stacks — it is
NOT a measurement claim (both are models over the same pinned TLE snapshot).

Usage:
  python3 scripts/estnet/verify_handover_phases_independent.py \
    scripts/estnet/scenario/cht_domestic_handover_scenario.json \
    scripts/estnet/scenario/configs/tles/cht_domestic_handover.tle
"""
import json
import math
import sys
from datetime import datetime, timedelta, timezone

from sgp4.api import Satrec, jday

STEP_S = 30
BOUNDARY_TOLERANCE_STEPS = 1

WGS84_A = 6378.137  # km
WGS84_F = 1.0 / 298.257223563
WGS84_E2 = WGS84_F * (2.0 - WGS84_F)


def site_ecef(lat_deg, lon_deg, alt_km):
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    n = WGS84_A / math.sqrt(1.0 - WGS84_E2 * math.sin(lat) ** 2)
    x = (n + alt_km) * math.cos(lat) * math.cos(lon)
    y = (n + alt_km) * math.cos(lat) * math.sin(lon)
    z = (n * (1.0 - WGS84_E2) + alt_km) * math.sin(lat)
    return (x, y, z), (lat, lon)


def gmst_rad(dt):
    # IAU 1982 GMST; adequate at the 30 s / 0.1 deg level of this check.
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute,
                  dt.second + dt.microsecond / 1e6)
    t = (jd + fr - 2451545.0) / 36525.0
    g = 280.46061837 + 360.98564736629 * (jd + fr - 2451545.0) \
        + 0.000387933 * t * t - t * t * t / 38710000.0
    return math.radians(g % 360.0)


def teme_to_ecef(r_teme, dt):
    g = gmst_rad(dt)
    c, s = math.cos(g), math.sin(g)
    x, y, z = r_teme
    return (c * x + s * y, -s * x + c * y, z)


def elevation_deg(site, site_geo, r_ecef):
    lat, lon = site_geo
    dx = r_ecef[0] - site[0]
    dy = r_ecef[1] - site[1]
    dz = r_ecef[2] - site[2]
    # ENU
    e = -math.sin(lon) * dx + math.cos(lon) * dy
    n = -math.sin(lat) * math.cos(lon) * dx - math.sin(lat) * math.sin(lon) * dy + math.cos(lat) * dz
    u = math.cos(lat) * math.cos(lon) * dx + math.cos(lat) * math.sin(lon) * dy + math.sin(lat) * dz
    rng = math.sqrt(e * e + n * n + u * u)
    return math.degrees(math.asin(u / rng)), rng


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    descriptor = json.load(open(sys.argv[1], encoding="utf-8"))
    tle_lines = [ln.rstrip("\n") for ln in open(sys.argv[2], encoding="utf-8")]

    sats = {}
    i = 0
    while i + 2 < len(tle_lines) + 1:
        if i + 2 < len(tle_lines) and tle_lines[i + 1].startswith("1 ") and tle_lines[i + 2].startswith("2 "):
            sats[tle_lines[i].strip()] = Satrec.twoline2rv(tle_lines[i + 1], tle_lines[i + 2])
            i += 3
        else:
            i += 1

    epoch = datetime.strptime(descriptor["simEpochUtc"], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc) \
        if "." in descriptor["simEpochUtc"] else \
        datetime.strptime(descriptor["simEpochUtc"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)

    stations = []
    for key in ("stationA", "stationB"):
        st = descriptor[key]
        site, geo = site_ecef(st["lat"], st["lon"], st.get("elevationM", 0) / 1000.0)
        stations.append((st["id"], site, geo, st["effectiveElevationMaskDeg"]))

    failures = 0
    checks = 0
    print(f"== INDEPENDENT PHASE VERIFY (python-sgp4) == {descriptor['stationA']['id']} x {descriptor['stationB']['id']}")
    print(f"  epoch {descriptor['simEpochUtc']}; masks {stations[0][3]} / {stations[1][3]} deg; grid {STEP_S}s, boundary tolerance {BOUNDARY_TOLERANCE_STEPS} step")

    for ph in descriptor["phases"]:
        sat = sats.get(ph["satellite"])
        if sat is None:
            print(f"  FAIL ph {ph['label']}: no TLE block for {ph['satellite']}")
            failures += 1
            continue
        t = ph["startS"]
        samples = []
        while t <= ph["stopS"]:
            dt = epoch + timedelta(seconds=t)
            jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute,
                          dt.second + dt.microsecond / 1e6)
            err, r, _v = sat.sgp4(jd, fr)
            if err != 0:
                samples.append((t, None, None, f"sgp4 err {err}"))
            else:
                r_ecef = teme_to_ecef(r, dt)
                els = []
                for _sid, site, geo, mask in stations:
                    el, _rng = elevation_deg(site, geo, r_ecef)
                    els.append((el, mask))
                ok = all(el >= mask for el, mask in els)
                samples.append((t, els[0][0], els[1][0], "ok" if ok else "below-mask"))
            t += STEP_S

        interior = samples[BOUNDARY_TOLERANCE_STEPS: len(samples) - BOUNDARY_TOLERANCE_STEPS] or samples
        bad = [s for s in interior if s[3] != "ok"]
        checks += len(interior)
        min_a = min((s[1] for s in interior if s[1] is not None), default=float("nan"))
        min_b = min((s[2] for s in interior if s[2] is not None), default=float("nan"))
        if bad:
            failures += len(bad)
            worst = min(bad, key=lambda s: min(s[1] or 99, s[2] or 99))
            print(f"  FAIL ph {ph['label']:<7} {ph['satellite']:<28} {len(bad)}/{len(interior)} interior samples fail "
                  f"(worst t={worst[0]}s elevA={worst[1]:.2f} elevB={worst[2]:.2f})")
        else:
            print(f"  ok   ph {ph['label']:<7} {ph['satellite']:<28} interior {len(interior):>3} samples, "
                  f"min elev A {min_a:6.2f} / B {min_b:6.2f} deg")

    print(f"\n{'PASS' if failures == 0 else 'FAIL'} — {checks} interior samples checked, {failures} failures "
          f"(mutual visibility above viewer masks, python-sgp4 independent path)")
    sys.exit(0 if failures == 0 else 1)


if __name__ == "__main__":
    main()
