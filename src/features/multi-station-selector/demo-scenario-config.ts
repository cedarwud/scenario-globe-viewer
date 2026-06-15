/**
 * Typed accessor for the selected-pair demo scenario single source of truth
 * (`demo-scenario-config.json`). Import the named constants from here instead of
 * re-typing the demo window / station ids / pinned TLE snapshot paths anywhere
 * else. See the JSON's `$comment` for the regeneration contract.
 */
import type { OrbitClass } from "./visibility-utils";
import config from "./demo-scenario-config.json";

export interface DemoScenarioConfig {
  readonly stationAId: string;
  readonly stationBId: string;
  readonly windowStartUtc: string;
  readonly windowDurationMinutes: number;
  readonly tleSnapshots: Readonly<Record<OrbitClass, string>>;
}

export const DEMO_SCENARIO: DemoScenarioConfig = {
  stationAId: config.stationAId,
  stationBId: config.stationBId,
  windowStartUtc: config.windowStartUtc,
  windowDurationMinutes: config.windowDurationMinutes,
  tleSnapshots: config.tleSnapshots as Readonly<Record<OrbitClass, string>>
};

export const SELECTED_PAIR_DEMO_STATION_A_ID = DEMO_SCENARIO.stationAId;
export const SELECTED_PAIR_DEMO_STATION_B_ID = DEMO_SCENARIO.stationBId;
export const SELECTED_PAIR_DEMO_START_UTC = DEMO_SCENARIO.windowStartUtc;
export const SELECTED_PAIR_DEMO_DURATION_MINUTES =
  DEMO_SCENARIO.windowDurationMinutes;

/** Derived window end (startUtc + durationMinutes). Never hardcode this. */
export const SELECTED_PAIR_DEMO_END_UTC = new Date(
  Date.parse(DEMO_SCENARIO.windowStartUtc) +
    DEMO_SCENARIO.windowDurationMinutes * 60_000
).toISOString();

export const TLE_FIXTURE_PATHS: Readonly<Record<OrbitClass, string>> =
  DEMO_SCENARIO.tleSnapshots;
