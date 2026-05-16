import {
  M8A_V4_GROUND_STATION_QUERY_PARAM,
  M8A_V4_GROUND_STATION_QUERY_VALUE
} from "../../runtime/m8a-v4-ground-station-projection";

import type { SelectionSnapshot } from "./selection-store";

const SCENE_PRESET_PARAM = "scenePreset";
const SCENE_PRESET_VALUE = "regional";
const STATION_A_PARAM = "stationA";
const STATION_B_PARAM = "stationB";

export interface BuildV4PairHrefInput {
  readonly stationAId: string;
  readonly stationBId: string;
}

export function buildV4PairHref(input: BuildV4PairHrefInput): string {
  const params = new URLSearchParams();
  params.set(SCENE_PRESET_PARAM, SCENE_PRESET_VALUE);
  params.set(
    M8A_V4_GROUND_STATION_QUERY_PARAM,
    M8A_V4_GROUND_STATION_QUERY_VALUE
  );
  params.set(STATION_A_PARAM, input.stationAId);
  params.set(STATION_B_PARAM, input.stationBId);
  return `/?${params.toString()}`;
}

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
