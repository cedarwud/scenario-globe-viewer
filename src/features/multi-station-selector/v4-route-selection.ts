import {
  PUBLIC_REGISTRY_BY_ID,
  type PublicRegistryStation
} from "./tier-inference";

const STATION_A_PARAM = "stationA";
const STATION_B_PARAM = "stationB";

export interface V4ResolvedStationPair {
  readonly stationA: PublicRegistryStation;
  readonly stationB: PublicRegistryStation;
}

export interface V4RouteSelection {
  readonly rawStationAId: string | null;
  readonly rawStationBId: string | null;
  readonly hasStationPairParams: boolean;
  readonly resolvedPair: V4ResolvedStationPair | null;
}

function normalizeStationId(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveV4RouteSelection(
  search: URLSearchParams
): V4RouteSelection {
  const rawStationAId = search.get(STATION_A_PARAM);
  const rawStationBId = search.get(STATION_B_PARAM);
  const stationAId = normalizeStationId(rawStationAId);
  const stationBId = normalizeStationId(rawStationBId);
  const hasStationPairParams = Boolean(stationAId && stationBId);

  if (!stationAId || !stationBId || stationAId === stationBId) {
    return {
      rawStationAId,
      rawStationBId,
      hasStationPairParams,
      resolvedPair: null
    };
  }

  const stationA = PUBLIC_REGISTRY_BY_ID.get(stationAId);
  const stationB = PUBLIC_REGISTRY_BY_ID.get(stationBId);

  return {
    rawStationAId,
    rawStationBId,
    hasStationPairParams,
    resolvedPair:
      stationA && stationB
        ? {
            stationA,
            stationB
          }
        : null
  };
}
