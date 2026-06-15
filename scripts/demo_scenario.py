"""Python reader for the selected-pair demo scenario single source of truth
(src/features/multi-station-selector/demo-scenario-config.json).

Slide builders and other Python tooling import these instead of re-typing the
demo window / station ids. Keeps the deck date in lockstep with the app + tests.
"""
import json
import os
from datetime import datetime, timedelta

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
_CONFIG_PATH = os.path.join(
    _ROOT, "src", "features", "multi-station-selector", "demo-scenario-config.json"
)

with open(_CONFIG_PATH, encoding="utf-8") as _f:
    CONFIG = json.load(_f)

STATION_A_ID = CONFIG["stationAId"]
STATION_B_ID = CONFIG["stationBId"]
WINDOW_START_UTC = CONFIG["windowStartUtc"]            # e.g. 2026-05-17T00:00:00.000Z
WINDOW_DURATION_MIN = int(CONFIG["windowDurationMinutes"])
TLE_SNAPSHOTS = CONFIG["tleSnapshots"]

_start = datetime.fromisoformat(WINDOW_START_UTC.replace("Z", "+00:00"))
_end = _start + timedelta(minutes=WINDOW_DURATION_MIN)
WINDOW_END_UTC = _end.strftime("%Y-%m-%dT%H:%M:%S.000Z")

DATE_YMD = _start.strftime("%Y-%m-%d")     # 2026-05-17
START_HM = _start.strftime("%H:%M")        # 00:00
END_HM = _end.strftime("%H:%M")            # 06:00
DURATION_H = WINDOW_DURATION_MIN // 60     # 6

# Canonical demo route (matches v4-route-href / demo-scenario.mjs output).
DEMO_ROUTE = (
    f"/?stationA={STATION_A_ID}&stationB={STATION_B_ID}"
    f"&startUtc={WINDOW_START_UTC}&durationMinutes={WINDOW_DURATION_MIN}"
)

# Reusable zh-TW window labels for slides.
WINDOW_LABEL_ZH = f"{DATE_YMD} {START_HM} → {END_HM} UTC（{DURATION_H} 小時預錄）"
WINDOW_LABEL_COMPACT = f"{DATE_YMD} {START_HM}–{END_HM} UTC · {WINDOW_DURATION_MIN} min"
