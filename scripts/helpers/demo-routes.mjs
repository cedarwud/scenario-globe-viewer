import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "./demo-scenario.mjs";

// Re-exported from the demo scenario single source of truth (demo-scenario.mjs
// -> demo-scenario-config.json) so the route window can never drift from config.
export { SELECTED_PAIR_DEMO_REQUEST_PATH };

export const SELECTED_PAIR_DEMO_BASE_URL =
  `http://127.0.0.1:5173${SELECTED_PAIR_DEMO_REQUEST_PATH}`;

export const LEGACY_FIXTURE_DEMO_REQUEST_PATH =
  "/?scenePreset=regional&m8aV4GroundStationScene=1";

export const LEGACY_FIXTURE_DEMO_ROUTE_STATUS = "historical-compatibility";
