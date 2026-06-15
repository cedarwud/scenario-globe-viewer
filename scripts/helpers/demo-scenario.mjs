// Shared reader for the selected-pair demo scenario single source of truth
// (src/features/multi-station-selector/demo-scenario-config.json). Node scripts
// and .mjs tests import from here instead of re-typing the demo window / station
// ids / pinned TLE snapshot paths. Keep this the ONLY .mjs copy of those values.
import config from "../../src/features/multi-station-selector/demo-scenario-config.json" with { type: "json" };

export const DEMO_SCENARIO = config;
export const SELECTED_PAIR_DEMO_STATION_A_ID = config.stationAId;
export const SELECTED_PAIR_DEMO_STATION_B_ID = config.stationBId;
export const SELECTED_PAIR_DEMO_START_UTC = config.windowStartUtc;
export const SELECTED_PAIR_DEMO_DURATION_MINUTES = config.windowDurationMinutes;
export const SELECTED_PAIR_DEMO_END_UTC = new Date(
  Date.parse(config.windowStartUtc) + config.windowDurationMinutes * 60_000
).toISOString();
export const TLE_FIXTURE_PATHS = config.tleSnapshots;

// Canonical demo request path (URL-encoded startUtc), derived from the config so
// it can never drift from the window. Matches the historical literal exactly.
export const SELECTED_PAIR_DEMO_REQUEST_PATH =
  `/?stationA=${config.stationAId}&stationB=${config.stationBId}` +
  `&startUtc=${encodeURIComponent(config.windowStartUtc)}` +
  `&durationMinutes=${config.windowDurationMinutes}`;
