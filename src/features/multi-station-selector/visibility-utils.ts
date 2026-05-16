import { twoline2satrec, propagate, gstime, eciToEcf } from "../../vendor/satellite-js-runtime";

export type OrbitClass = "LEO" | "MEO" | "GEO";

export interface StationGeodetic {
  readonly lat: number;
  readonly lon: number;
  readonly altMeters?: number;
}
export interface VisibilityWindow {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly maxElevationDeg: number;
}
export interface PairVisibilityWindow {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly stationAWindow: VisibilityWindow;
  readonly stationBWindow: VisibilityWindow;
  readonly intersectionStartUtc: string;
  readonly intersectionEndUtc: string;
}
export interface TleRecord {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly tleLine1: string;
  readonly tleLine2: string;
}
export interface VisibilitySampleConfig {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly stepSeconds: number;
  readonly elevationThresholdDeg: number;
}

interface StationEcefKm {
  readonly x: number; readonly y: number; readonly z: number;
  readonly sinLat: number; readonly cosLat: number;
  readonly sinLon: number; readonly cosLon: number;
}

const WGS84_A_M = 6378137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function stationToEcefKm(station: StationGeodetic): StationEcefKm {
  const latRad = station.lat * DEG_TO_RAD;
  const lonRad = station.lon * DEG_TO_RAD;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);
  const altM = station.altMeters ?? 0;
  const n = WGS84_A_M / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const xM = (n + altM) * cosLat * cosLon;
  const yM = (n + altM) * cosLat * sinLon;
  const zM = (n * (1 - WGS84_E2) + altM) * sinLat;
  return { x: xM / 1000, y: yM / 1000, z: zM / 1000, sinLat, cosLat, sinLon, cosLon };
}

function lookAngleElevationDeg(s: StationEcefKm, sat: { x: number; y: number; z: number }): number {
  const dx = sat.x - s.x;
  const dy = sat.y - s.y;
  const dz = sat.z - s.z;
  const east = -s.sinLon * dx + s.cosLon * dy;
  const north = -s.sinLat * s.cosLon * dx - s.sinLat * s.sinLon * dy + s.cosLat * dz;
  const up = s.cosLat * s.cosLon * dx + s.cosLat * s.sinLon * dy + s.sinLat * dz;
  const range = Math.sqrt(east * east + north * north + up * up);
  if (!Number.isFinite(range) || range <= 0) return Number.NEGATIVE_INFINITY;
  const elevRad = Math.asin(up / range);
  if (!Number.isFinite(elevRad)) return Number.NEGATIVE_INFINITY;
  return elevRad * RAD_TO_DEG;
}

function emitWindow(out: VisibilityWindow[], startMs: number, endMs: number, maxElev: number, thresholdDeg: number): void {
  if (maxElev <= thresholdDeg) return;
  out.push({ startUtc: new Date(startMs).toISOString(), endUtc: new Date(endMs).toISOString(), maxElevationDeg: maxElev });
}

function collapseSamplesToWindows(sampleTimesMs: ReadonlyArray<number>, sampleElevsDeg: ReadonlyArray<number>, stepMs: number, thresholdDeg: number): ReadonlyArray<VisibilityWindow> {
  const out: VisibilityWindow[] = [];
  let runStartIdx = -1;
  let runMaxElev = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < sampleTimesMs.length; i += 1) {
    const e = sampleElevsDeg[i];
    const visible = Number.isFinite(e) && e > thresholdDeg;
    if (visible) {
      if (runStartIdx < 0) {
        runStartIdx = i;
        runMaxElev = e;
      } else if (e > runMaxElev) {
        runMaxElev = e;
      }
    } else if (runStartIdx >= 0) {
      emitWindow(out, sampleTimesMs[runStartIdx], sampleTimesMs[i - 1] + stepMs, runMaxElev, thresholdDeg);
      runStartIdx = -1;
      runMaxElev = Number.NEGATIVE_INFINITY;
    }
  }
  if (runStartIdx >= 0) {
    emitWindow(out, sampleTimesMs[runStartIdx], sampleTimesMs[sampleTimesMs.length - 1] + stepMs, runMaxElev, thresholdDeg);
  }
  return out;
}

export function computeVisibilityWindowsForStation(
  station: StationGeodetic,
  tleRecords: ReadonlyArray<TleRecord>,
  config: VisibilitySampleConfig
): Map<string, ReadonlyArray<VisibilityWindow>> {
  // WHY: uniform-step sampling is robust across LEO/MEO/GEO without per-orbit-class closed-form pass predictors that satellite.js does not expose.
  const stationEcef = stationToEcefKm(station);
  const startMs = Date.parse(config.startUtc);
  const endMs = Date.parse(config.endUtc);
  const stepMs = config.stepSeconds * 1000;
  const result = new Map<string, ReadonlyArray<VisibilityWindow>>();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || !Number.isFinite(stepMs) || stepMs <= 0 || endMs <= startMs) {
    for (const rec of tleRecords) result.set(rec.satelliteId, []);
    return result;
  }
  const sampleTimesMs: number[] = [];
  for (let t = startMs; t < endMs; t += stepMs) sampleTimesMs.push(t);
  for (const rec of tleRecords) {
    let satrec: ReturnType<typeof twoline2satrec> | null;
    try { satrec = twoline2satrec(rec.tleLine1, rec.tleLine2); }
    catch { result.set(rec.satelliteId, []); continue; }
    if (!satrec || satrec.error) { result.set(rec.satelliteId, []); continue; }
    const elevs: number[] = new Array(sampleTimesMs.length);
    for (let i = 0; i < sampleTimesMs.length; i += 1) {
      const when = new Date(sampleTimesMs[i]);
      let propagated: ReturnType<typeof propagate> | null;
      try { propagated = propagate(satrec, when); }
      catch { elevs[i] = Number.NEGATIVE_INFINITY; continue; }
      const posEci = propagated?.position;
      if (!posEci || typeof posEci !== "object" || !Number.isFinite(posEci.x) || !Number.isFinite(posEci.y) || !Number.isFinite(posEci.z)) {
        elevs[i] = Number.NEGATIVE_INFINITY;
        continue;
      }
      const posEcf = eciToEcf(posEci, gstime(when));
      if (!posEcf || !Number.isFinite(posEcf.x) || !Number.isFinite(posEcf.y) || !Number.isFinite(posEcf.z)) {
        elevs[i] = Number.NEGATIVE_INFINITY;
        continue;
      }
      elevs[i] = lookAngleElevationDeg(stationEcef, posEcf);
    }
    result.set(rec.satelliteId, collapseSamplesToWindows(sampleTimesMs, elevs, stepMs, config.elevationThresholdDeg));
  }
  return result;
}

export function intersectStationWindowsForPair(
  stationAWindows: Map<string, ReadonlyArray<VisibilityWindow>>,
  stationBWindows: Map<string, ReadonlyArray<VisibilityWindow>>,
  tleRecords: ReadonlyArray<TleRecord>
): ReadonlyArray<PairVisibilityWindow> {
  const orbitById = new Map<string, OrbitClass>();
  for (const rec of tleRecords) orbitById.set(rec.satelliteId, rec.orbitClass);
  const out: PairVisibilityWindow[] = [];
  for (const [satelliteId, aWindows] of stationAWindows) {
    const bWindows = stationBWindows.get(satelliteId);
    if (!bWindows) continue;
    const orbitClass = orbitById.get(satelliteId);
    if (!orbitClass) continue;
    for (const aw of aWindows) {
      const aStart = Date.parse(aw.startUtc);
      const aEnd = Date.parse(aw.endUtc);
      for (const bw of bWindows) {
        const bStart = Date.parse(bw.startUtc);
        const bEnd = Date.parse(bw.endUtc);
        const start = Math.max(aStart, bStart);
        const end = Math.min(aEnd, bEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;
        out.push({
          satelliteId,
          orbitClass,
          stationAWindow: aw,
          stationBWindow: bw,
          intersectionStartUtc: new Date(start).toISOString(),
          intersectionEndUtc: new Date(end).toISOString()
        });
      }
    }
  }
  return out;
}

export function parseTleListFromText(
  rawTleText: string,
  orbitClass: OrbitClass
): ReadonlyArray<TleRecord> {
  const lines = rawTleText.split(/\r?\n/).map((ln) => ln.trim()).filter((ln) => ln.length > 0);
  const out: TleRecord[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const nameLine = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!nameLine || !line1 || !line2) continue;
    if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) continue;
    out.push({ satelliteId: nameLine, orbitClass, tleLine1: line1, tleLine2: line2 });
  }
  return out;
}
