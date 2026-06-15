import type { SelectionSnapshot } from "./selection-store";
import {
  SELECTED_PAIR_DEMO_STATION_A_ID,
  SELECTED_PAIR_DEMO_STATION_B_ID,
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_DURATION_MINUTES
} from "./demo-scenario-config";

const STATION_A_PARAM = "stationA";
const STATION_B_PARAM = "stationB";
const START_UTC_PARAM = "startUtc";
const DURATION_MINUTES_PARAM = "durationMinutes";

// Re-exported from the single source of truth (demo-scenario-config.json) so
// existing importers of these names keep working; do not redefine here.
export {
  SELECTED_PAIR_DEMO_STATION_A_ID,
  SELECTED_PAIR_DEMO_STATION_B_ID,
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_DURATION_MINUTES
};

export interface BuildV4PairHrefInput {
  readonly stationAId: string;
  readonly stationBId: string;
  readonly startUtc?: string;
  readonly durationMinutes?: number;
}

export function buildV4PairHref(input: BuildV4PairHrefInput): string {
  const params = new URLSearchParams();
  params.set(STATION_A_PARAM, input.stationAId);
  params.set(STATION_B_PARAM, input.stationBId);
  if (input.startUtc) {
    params.set(START_UTC_PARAM, input.startUtc);
  }
  if (Number.isFinite(input.durationMinutes)) {
    params.set(DURATION_MINUTES_PARAM, String(input.durationMinutes));
  }
  return `/?${params.toString()}`;
}

export const SELECTED_PAIR_DEMO_HREF = buildV4PairHref({
  stationAId: SELECTED_PAIR_DEMO_STATION_A_ID,
  stationBId: SELECTED_PAIR_DEMO_STATION_B_ID,
  startUtc: SELECTED_PAIR_DEMO_START_UTC,
  durationMinutes: SELECTED_PAIR_DEMO_DURATION_MINUTES
});

export function buildV4PairHrefFromSnapshot(
  snapshot: SelectionSnapshot
): string | null {
  if (!snapshot.stationA || !snapshot.stationB) {
    return null;
  }
  return buildV4PairHref({
    stationAId: snapshot.stationA,
    stationBId: snapshot.stationB
  });
}
