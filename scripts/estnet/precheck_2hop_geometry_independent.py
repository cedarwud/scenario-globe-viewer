#!/usr/bin/env python3
"""Independent 2-hop co-visibility cross-check (R12).

Re-derives CHT x SANSA mutual visibility for the demo's serving Galileo MEO +
APSTAR-7 GEO from a SEPARATE SGP4 path (python sgp4, own GMST/TEME->ECEF), to
verify the viewer's computeRuntimeProjection rather than trust its own output.
Thresholds mirror the viewer: effective elevation = 10 deg base + station
terrainMaskDeg (CHT 21 -> 31 deg, SANSA 1 -> 11 deg), strict '>' gate.

Run:  python3 scripts/estnet/precheck_2hop_geometry_independent.py
"""
import math
from datetime import datetime, timedelta, timezone
from sgp4.api import Satrec, jday

DEG = math.pi / 180.0
WGS84_A = 6378137.0          # m
WGS84_E2 = 6.69437999014e-3  # first eccentricity squared

# Stations (registry: multi-orbit-public-registry.json) lat, lon, elevM, maskDeg
STATIONS = {
    "CHT":   dict(lat=25.155,  lon=121.55,  alt=489.0,  mask=21),
    "SANSA": dict(lat=-25.8872, lon=27.7075, alt=1553.0, mask=1),
}
BASE_ELEV = 10.0

TLES = {
    "GSAT0102 (MEO)": (
        "1 37847U 11060B   26158.40220003 -.00000063  00000+0  00000+0 0  9998",
        "2 37847  57.0009 342.0270 0003434  13.7700 354.5257  1.70476015 90968"),
    "GSAT0232 (MEO)": (
        "1 61182U 24167A   26164.82370293  .00000062  00000+0  00000+0 0  9997",
        "2 61182  55.1857 221.4063 0006204 226.3974 198.0484  1.70474188 10829"),
    "GSAT0209 (MEO)": (
        "1 41174U 15079A   26162.75947448  .00000007  00000+0  00000+0 0  9999",
        "2 41174  55.8242 101.4109 0005369 341.4474  18.4942  1.70473724 64688"),
    "APSTAR-7 (GEO)": (
        "1 38107U 12013A   26164.95681424  .00000000  00000+0  00000+0 0  9992",
        "2 38107   0.0212 352.0420 0002521 100.4420 230.7219  1.00271645 51773"),
}

WINDOW_START = datetime(2026, 6, 15, 0, 0, 0, tzinfo=timezone.utc)
WINDOW_MIN = 360
STEP_S = 30


def station_ecef(s):
    lat, lon, alt = s["lat"] * DEG, s["lon"] * DEG, s["alt"]
    sl, cl, so, co = math.sin(lat), math.cos(lat), math.sin(lon), math.cos(lon)
    n = WGS84_A / math.sqrt(1 - WGS84_E2 * sl * sl)
    x = (n + alt) * cl * co
    y = (n + alt) * cl * so
    z = (n * (1 - WGS84_E2) + alt) * sl
    return (x / 1000.0, y / 1000.0, z / 1000.0, sl, cl, so, co)


def gmst_rad(jd, fr):
    # IAU-82 GMST, matches satellite.js gstime.
    tut1 = (jd + fr - 2451545.0) / 36525.0
    sec = (-6.2e-6 * tut1**3 + 0.093104 * tut1**2
           + (876600.0 * 3600 + 8640184.812866) * tut1 + 67310.54841)
    rad = math.radians(sec / 240.0) % (2 * math.pi)
    return rad + 2 * math.pi if rad < 0 else rad


def teme_to_ecef(r, theta):
    x, y, z = r
    return (math.cos(theta) * x + math.sin(theta) * y,
            -math.sin(theta) * x + math.cos(theta) * y, z)


def elevation_deg(st, sat):
    x, y, z, sl, cl, so, co = st
    dx, dy, dz = sat[0] - x, sat[1] - y, sat[2] - z
    up = cl * co * dx + cl * so * dy + sl * dz
    east = -so * dx + co * dy
    north = -sl * co * dx - sl * so * dy + cl * dz
    rng = math.sqrt(east * east + north * north + up * up)
    return math.degrees(math.asin(up / rng)) if rng > 0 else -90.0


def intervals(flags, times):
    out, run = [], None
    for f, t in zip(flags, times):
        if f and run is None:
            run = t
        elif not f and run is not None:
            out.append((run, t))
            run = None
    if run is not None:
        out.append((run, times[-1]))
    return out


cht_e = station_ecef(STATIONS["CHT"])
sansa_e = station_ecef(STATIONS["SANSA"])
cht_thr = BASE_ELEV + STATIONS["CHT"]["mask"]
sansa_thr = BASE_ELEV + STATIONS["SANSA"]["mask"]
print(f"thresholds: CHT>{cht_thr}  SANSA>{sansa_thr}  step {STEP_S}s")

times = [WINDOW_START + timedelta(seconds=s)
         for s in range(0, WINDOW_MIN * 60, STEP_S)]

for name, (l1, l2) in TLES.items():
    sat = Satrec.twoline2rv(l1, l2)
    covis = []
    for t in times:
        jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute,
                      t.second + t.microsecond * 1e-6)
        e, r, _ = sat.sgp4(jd, fr)
        if e != 0:
            covis.append(False)
            continue
        ecef = teme_to_ecef(r, gmst_rad(jd, fr))
        ec = elevation_deg(cht_e, ecef)
        es = elevation_deg(sansa_e, ecef)
        covis.append(ec > cht_thr and es > sansa_thr)
    iv = intervals(covis, times)
    tag = "CO-VISIBLE" if iv else "never co-visible"
    print(f"\n{name}: {tag}")
    for a, b in iv:
        dur = (b - a).total_seconds() / 60.0
        print(f"   {a.strftime('%H:%M:%S')} -> {b.strftime('%H:%M:%S')}  ({dur:.1f} min)")
