import {
  computeVisibilityWindowsForStationWithStats,
  type OrbitClass,
  type RuntimeOrbitRecord,
  type StationGeodetic,
  type StationVisibilityComputationResult,
  type TlePropagationStats,
  type VisibilityWindow
} from "./visibility-utils";

export const DEFAULT_VISIBILITY_CADENCE_SECONDS_BY_ORBIT: Readonly<Record<OrbitClass, number>> = {
  LEO: 30,
  MEO: 60,
  GEO: 120
};

export interface MultiOrbitVisibilitySampleConfig {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly elevationThresholdDeg: number;
  readonly cadenceSecondsByOrbit?: Partial<Record<OrbitClass, number>>;
}

export interface MultiOrbitVisibilityComputationResult {
  readonly windowsBySatellite: Map<string, ReadonlyArray<VisibilityWindow>>;
  readonly propagationStatsBySatellite: Map<string, TlePropagationStats>;
  readonly cadenceSecondsByOrbit: Readonly<Record<OrbitClass, number>>;
}

const ORBIT_CLASSES: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

function normalizeCadenceSeconds(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : fallback;
}

export function resolveVisibilityCadenceSecondsByOrbit(
  override?: Partial<Record<OrbitClass, number>>
): Readonly<Record<OrbitClass, number>> {
  return {
    LEO: normalizeCadenceSeconds(override?.LEO, DEFAULT_VISIBILITY_CADENCE_SECONDS_BY_ORBIT.LEO),
    MEO: normalizeCadenceSeconds(override?.MEO, DEFAULT_VISIBILITY_CADENCE_SECONDS_BY_ORBIT.MEO),
    GEO: normalizeCadenceSeconds(override?.GEO, DEFAULT_VISIBILITY_CADENCE_SECONDS_BY_ORBIT.GEO)
  };
}

function mergeResult(
  targetWindows: Map<string, ReadonlyArray<VisibilityWindow>>,
  targetStats: Map<string, TlePropagationStats>,
  source: StationVisibilityComputationResult
): void {
  for (const [satelliteId, windows] of source.windowsBySatellite.entries()) {
    targetWindows.set(satelliteId, windows);
  }
  for (const [satelliteId, stats] of source.propagationStatsBySatellite.entries()) {
    targetStats.set(satelliteId, stats);
  }
}

export function computeVisibilityWindowsForStationByOrbitCadence(
  station: StationGeodetic,
  tleRecords: ReadonlyArray<RuntimeOrbitRecord>,
  config: MultiOrbitVisibilitySampleConfig
): MultiOrbitVisibilityComputationResult {
  const cadenceSecondsByOrbit = resolveVisibilityCadenceSecondsByOrbit(
    config.cadenceSecondsByOrbit
  );
  const windowsBySatellite = new Map<string, ReadonlyArray<VisibilityWindow>>();
  const propagationStatsBySatellite = new Map<string, TlePropagationStats>();

  for (const orbitClass of ORBIT_CLASSES) {
    const recordsForOrbit = tleRecords.filter((record) => record.orbitClass === orbitClass);
    if (recordsForOrbit.length === 0) {
      continue;
    }
    mergeResult(
      windowsBySatellite,
      propagationStatsBySatellite,
      computeVisibilityWindowsForStationWithStats(station, recordsForOrbit, {
        startUtc: config.startUtc,
        endUtc: config.endUtc,
        stepSeconds: cadenceSecondsByOrbit[orbitClass],
        elevationThresholdDeg: config.elevationThresholdDeg
      })
    );
  }

  return {
    windowsBySatellite,
    propagationStatsBySatellite,
    cadenceSecondsByOrbit
  };
}
