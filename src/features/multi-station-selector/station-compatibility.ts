export interface StationCompatibilityProfile {
  readonly id: string;
  readonly lat: number;
  readonly lon: number;
  readonly supportedOrbits: ReadonlyArray<string>;
  readonly supportedBands: ReadonlyArray<string>;
}

export type OrbitClass = "LEO" | "MEO" | "GEO";
export type StationHandoverCapabilityKind = "tri-capable" | "dual-only" | "none";
export type HandoverOrbitFilterKind = "2-orbit" | "3-orbit";

export interface StationHandoverCapability {
  readonly kind: StationHandoverCapabilityKind;
  readonly compatiblePairCount: number;
  readonly maxCompatibleOrbitCount: number;
}

export interface StationHandoverCapabilitySummary {
  readonly byStationId: ReadonlyMap<string, StationHandoverCapability>;
  readonly counts: Readonly<Record<StationHandoverCapabilityKind, number>>;
  readonly minorityKind: Exclude<StationHandoverCapabilityKind, "none"> | null;
}

interface LongitudeInterval {
  readonly startDeg: number;
  readonly endDeg: number;
}

const EARTH_RADIUS_KM = 6371;
const MIN_ELEVATION_DEG = 10;
const FOOTPRINT_MARGIN_DEG = 2;
const ORBIT_ALTITUDE_KM: Readonly<Record<OrbitClass, number>> = {
  LEO: 1200,
  MEO: 20200,
  GEO: 35786
};
const CROSS_ORBIT_HANDOVER_ORBITS: ReadonlyArray<OrbitClass> = ["LEO", "MEO", "GEO"];

function isKnownOrbitClass(orbit: string): orbit is OrbitClass {
  return orbit === "LEO" || orbit === "MEO" || orbit === "GEO";
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

function normaliseLongitude360(lonDeg: number): number {
  return ((lonDeg % 360) + 360) % 360;
}

export function computeGeodesicCentralAngleDeg(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): number {
  const latA = toRadians(stationA.lat);
  const latB = toRadians(stationB.lat);
  const deltaLat = latB - latA;
  const deltaLon = toRadians(stationB.lon - stationA.lon);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const hav =
    sinLat * sinLat +
    Math.cos(latA) * Math.cos(latB) * sinLon * sinLon;
  return toDegrees(2 * Math.asin(Math.min(1, Math.sqrt(hav))));
}

function computeSatelliteFootprintCentralAngleDeg(
  altitudeKm: number
): number {
  const minElevationRad = toRadians(MIN_ELEVATION_DEG);
  const orbitalRadiusKm = EARTH_RADIUS_KM + altitudeKm;
  const radiusRatio = EARTH_RADIUS_KM / orbitalRadiusKm;
  return toDegrees(
    Math.acos(radiusRatio * Math.cos(minElevationRad)) - minElevationRad
  );
}

function splitLongitudeInterval(
  centerDeg: number,
  halfWidthDeg: number
): ReadonlyArray<LongitudeInterval> {
  const startDeg = centerDeg - halfWidthDeg;
  const endDeg = centerDeg + halfWidthDeg;
  if (startDeg < 0) {
    return [
      { startDeg: startDeg + 360, endDeg: 360 },
      { startDeg: 0, endDeg }
    ];
  }
  if (endDeg >= 360) {
    return [
      { startDeg, endDeg: 360 },
      { startDeg: 0, endDeg: endDeg - 360 }
    ];
  }
  return [{ startDeg, endDeg }];
}

function getVisibleGeoLongitudeIntervals(
  station: StationCompatibilityProfile
): ReadonlyArray<LongitudeInterval> {
  const footprintRad = toRadians(
    computeSatelliteFootprintCentralAngleDeg(ORBIT_ALTITUDE_KM.GEO) +
      FOOTPRINT_MARGIN_DEG / 2
  );
  const stationLatRad = toRadians(Math.abs(station.lat));
  if (stationLatRad > footprintRad) {
    return [];
  }
  const halfWidthDeg = toDegrees(
    Math.acos(
      Math.min(1, Math.max(-1, Math.cos(footprintRad) / Math.cos(stationLatRad)))
    )
  );
  return splitLongitudeInterval(normaliseLongitude360(station.lon), halfWidthDeg);
}

function intervalsOverlap(
  intervalA: LongitudeInterval,
  intervalB: LongitudeInterval
): boolean {
  return Math.max(intervalA.startDeg, intervalB.startDeg) <=
    Math.min(intervalA.endDeg, intervalB.endDeg);
}

function stationPairHasSharedGeoRingVisibility(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  const intervalsA = getVisibleGeoLongitudeIntervals(stationA);
  const intervalsB = getVisibleGeoLongitudeIntervals(stationB);
  return intervalsA.some((intervalA) =>
    intervalsB.some((intervalB) => intervalsOverlap(intervalA, intervalB))
  );
}

export function getOrbitPairSeparationThresholdDeg(orbit: string): number {
  if (!isKnownOrbitClass(orbit)) {
    return 0;
  }
  return 2 * computeSatelliteFootprintCentralAngleDeg(ORBIT_ALTITUDE_KM[orbit]) +
    FOOTPRINT_MARGIN_DEG;
}

export function stationPairHasSharedOrbit(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  return stationA.supportedOrbits.some((orbit) =>
    stationB.supportedOrbits.includes(orbit)
  );
}

export function stationPairHasSharedBand(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  return stationA.supportedBands.some((band) =>
    stationB.supportedBands.includes(band)
  );
}

function getSharedKnownOrbitClasses(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): ReadonlyArray<OrbitClass> {
  return CROSS_ORBIT_HANDOVER_ORBITS.filter((orbit) =>
    stationA.supportedOrbits.includes(orbit) &&
      stationB.supportedOrbits.includes(orbit)
  );
}

function orbitGeometryPasses(
  orbit: OrbitClass,
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile,
  pairSeparationDeg: number
): boolean {
  if (pairSeparationDeg > getOrbitPairSeparationThresholdDeg(orbit)) {
    return false;
  }
  return orbit !== "GEO" ||
    stationPairHasSharedGeoRingVisibility(stationA, stationB);
}

export function getCompatibleHandoverOrbits(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): ReadonlyArray<OrbitClass> {
  const sharedOrbits = getSharedKnownOrbitClasses(stationA, stationB);
  const pairSeparationDeg = computeGeodesicCentralAngleDeg(stationA, stationB);
  return sharedOrbits.filter((orbit) =>
    orbitGeometryPasses(orbit, stationA, stationB, pairSeparationDeg)
  );
}

export function getStationCapabilityKindForFilter(
  kind: StationHandoverCapabilityKind
): HandoverOrbitFilterKind | null {
  if (kind === "tri-capable") {
    return "3-orbit";
  }
  if (kind === "dual-only") {
    return "2-orbit";
  }
  return null;
}

export function getHandoverFilterKindForPair(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): HandoverOrbitFilterKind | null {
  if (stationA.id === stationB.id || !stationPairHasSharedBand(stationA, stationB)) {
    return null;
  }
  const compatibleOrbitCount =
    getCompatibleHandoverOrbits(stationA, stationB).length;
  if (compatibleOrbitCount === 3) {
    return "3-orbit";
  }
  if (compatibleOrbitCount === 2) {
    return "2-orbit";
  }
  return null;
}

export function stationPairSupportsCrossOrbitHandoverGeometry(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  return getCompatibleHandoverOrbits(stationA, stationB).length >= 2;
}

export function stationPairSupportsTriOrbitHandoverGeometry(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  return getCompatibleHandoverOrbits(stationA, stationB).length ===
    CROSS_ORBIT_HANDOVER_ORBITS.length;
}

export function stationPairHasCompatibleSharedOrbitGeometry(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  return stationPairSupportsCrossOrbitHandoverGeometry(stationA, stationB);
}

export function areStationsCompatible(
  stationA: StationCompatibilityProfile,
  stationB: StationCompatibilityProfile
): boolean {
  return stationA.id !== stationB.id &&
    stationPairHasSharedBand(stationA, stationB) &&
    getCompatibleHandoverOrbits(stationA, stationB).length >= 2;
}

function createEmptyStationCapability(): StationHandoverCapability {
  return {
    kind: "none",
    compatiblePairCount: 0,
    maxCompatibleOrbitCount: 0
  };
}

export function summarizeStationHandoverCapabilities(
  stations: ReadonlyArray<StationCompatibilityProfile>
): StationHandoverCapabilitySummary {
  const byStationId = new Map<string, StationHandoverCapability>();
  const mutable = new Map<
    string,
    { compatiblePairCount: number; maxCompatibleOrbitCount: number }
  >();
  for (const station of stations) {
    mutable.set(station.id, {
      compatiblePairCount: 0,
      maxCompatibleOrbitCount: 0
    });
  }

  for (let i = 0; i < stations.length; i += 1) {
    const stationA = stations[i]!;
    for (let j = i + 1; j < stations.length; j += 1) {
      const stationB = stations[j]!;
      if (!stationPairHasSharedBand(stationA, stationB)) {
        continue;
      }
      const compatibleOrbitCount =
        getCompatibleHandoverOrbits(stationA, stationB).length;
      if (compatibleOrbitCount < 2) {
        continue;
      }
      for (const station of [stationA, stationB]) {
        const current = mutable.get(station.id);
        if (!current) {
          continue;
        }
        current.compatiblePairCount += 1;
        current.maxCompatibleOrbitCount = Math.max(
          current.maxCompatibleOrbitCount,
          compatibleOrbitCount
        );
      }
    }
  }

  const counts: Record<StationHandoverCapabilityKind, number> = {
    "tri-capable": 0,
    "dual-only": 0,
    none: 0
  };
  for (const station of stations) {
    const current = mutable.get(station.id);
    if (!current) {
      byStationId.set(station.id, createEmptyStationCapability());
      counts.none += 1;
      continue;
    }
    const kind: StationHandoverCapabilityKind =
      current.maxCompatibleOrbitCount >= 3
        ? "tri-capable"
        : current.maxCompatibleOrbitCount >= 2
        ? "dual-only"
        : "none";
    counts[kind] += 1;
    byStationId.set(station.id, {
      kind,
      compatiblePairCount: current.compatiblePairCount,
      maxCompatibleOrbitCount: current.maxCompatibleOrbitCount
    });
  }

  const triCount = counts["tri-capable"];
  const dualCount = counts["dual-only"];
  const minorityKind =
    triCount > 0 && dualCount > 0
      ? triCount <= dualCount
        ? "tri-capable"
        : "dual-only"
      : null;

  return { byStationId, counts, minorityKind };
}
