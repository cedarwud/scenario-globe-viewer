import type { SelectionSnapshot } from "./selection-store";

const STATION_A_PARAM = "stationA";
const STATION_B_PARAM = "stationB";

export interface BuildV4PairHrefInput {
  readonly stationAId: string;
  readonly stationBId: string;
}

export function buildV4PairHref(input: BuildV4PairHrefInput): string {
  const params = new URLSearchParams();
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
