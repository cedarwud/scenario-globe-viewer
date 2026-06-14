#!/usr/bin/env python3
"""Generate independent SGP4 reference ECI vectors for the unit test E3 and the
WS-G provenance trace inspector.

Independence is the point: these expected vectors are produced by python-sgp4
(Brandon Rhodes' wrapper around Vallado's AIAA 2006 reference C++ SGP4), a
codebase completely separate from the app's satellite.js. The E3 unit test
asserts satellite.js reproduces these to within tolerance; agreement is the
proof that the in-app TLE->ECI propagation is doing the real published math, not
replaying a recording.

Run (offline, one-shot — output is committed as the golden artifact):
    /tmp/sgp4venv/bin/python scripts/gen-sgp4-reference-vectors.py

Regenerate only if the chosen TLEs or sample times change; commit the JSON.
"""
import json
import sys
from pathlib import Path

from sgp4 import __version__ as sgp4_version
from sgp4.api import Satrec, jday, WGS72
from datetime import datetime, timezone

# Representative demo satellites, one per orbit class, with literal TLE lines so
# the golden artifact is self-contained (independent of fixture-file churn).
SATELLITES = [
    {
        "label": "ONEWEB-0012",
        "orbitClass": "LEO",
        "noradId": 44057,
        "line1": "1 44057U 19010A   26164.90931097  .00000066  00000+0  13814-3 0  9999",
        "line2": "2 44057  87.9097 229.4364 0002037  86.1004 274.0360 13.16594739351136",
    },
    {
        "label": "GSAT0101 (GALILEO-PFM)",
        "orbitClass": "MEO",
        "noradId": 37846,
        "line1": "1 37846U 11060A   26163.74233043 -.00000071  00000+0  00000+0 0  9997",
        "line2": "2 37846  56.9957 341.8816 0003117  51.3749 308.6629  1.70475562 91048",
    },
    {
        "label": "TDRS 3",
        "orbitClass": "GEO",
        "noradId": 19548,
        "line1": "1 19548U 88091B   26164.89471543 -.00000298  00000+0  00000+0 0  9991",
        "line2": "2 19548  12.6045 341.0236 0038404 356.0041 198.4347  1.00274232125357",
    },
]

# Fixed sample instants inside the demo window (2026-05-17 00:00Z + 0/180/360 min).
SAMPLE_TIMES_UTC = [
    "2026-05-17T00:00:00.000Z",
    "2026-05-17T03:00:00.000Z",
    "2026-05-17T06:00:00.000Z",
]


def parse_iso_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def main() -> int:
    samples = []
    for sat in SATELLITES:
        satrec = Satrec.twoline2rv(sat["line1"], sat["line2"], WGS72)
        for iso in SAMPLE_TIMES_UTC:
            dt = parse_iso_utc(iso)
            jd, fr = jday(
                dt.year, dt.month, dt.day,
                dt.hour, dt.minute, dt.second + dt.microsecond / 1e6,
            )
            error, position_km, velocity_km_s = satrec.sgp4(jd, fr)
            if error != 0:
                print(f"SGP4 error {error} for {sat['label']} @ {iso}", file=sys.stderr)
                return 1
            samples.append({
                "label": sat["label"],
                "orbitClass": sat["orbitClass"],
                "noradId": sat["noradId"],
                "line1": sat["line1"],
                "line2": sat["line2"],
                "timeUtc": iso,
                "julianDate": jd,
                "julianFraction": fr,
                "positionEciKm": {"x": position_km[0], "y": position_km[1], "z": position_km[2]},
                "velocityEciKmPerSec": {"x": velocity_km_s[0], "y": velocity_km_s[1], "z": velocity_km_s[2]},
            })

    artifact = {
        "schema": "sgp4-reference-vectors/v1",
        "purpose": (
            "Independent SGP4 ECI reference vectors. Expected values for the E3 unit "
            "test (satellite.js must reproduce these) and the WS-G provenance trace "
            "inspector side-by-side reproducibility proof."
        ),
        "frame": "TEME (true equator, mean equinox) — same frame satellite.js propagate() returns",
        "units": {"position": "km", "velocity": "km/s"},
        "reference": {
            "generator": "python-sgp4",
            "generatorVersion": sgp4_version,
            "algorithm": "SGP4 (Vallado et al., AIAA 2006 reference implementation)",
            "gravityModel": "WGS72",
            "independentFrom": "satellite.js (the app's propagator)",
        },
        "toleranceKm": 1.0,
        "samples": samples,
    }

    out = Path(__file__).resolve().parent.parent / "tests" / "golden" / "sgp4-reference-vectors.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"Wrote {len(samples)} reference samples -> {out}")
    print(f"python-sgp4 {sgp4_version}, gravity WGS72")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
