import type { RuntimeProjectionResult } from "./runtime-projection";
import type {
  OrbitClass,
  PairVisibilityWindow,
  TleRecord
} from "./visibility-utils";
import {
  eciToEcf,
  gstime,
  propagate,
  twoline2satrec
} from "../../vendor/satellite-js-runtime";

export type SceneSourceMode = "tle-first-runtime" | "fixture-fallback";
export type SceneTruthClass =
  | "tle-derived"
  | "public-registry-derived"
  | "modeled"
  | "display-only"
  | "fixture-fallback";
export type SceneActorRole = "active" | "candidate" | "context" | "continuity";

export interface SceneEcefKm {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SceneActorSourceSample {
  readonly atUtc: string;
  readonly ecefKm: SceneEcefKm;
}

export interface SceneActorVisibilityWindow {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly maxElevationDeg: number;
}

export interface SceneActor {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly role: SceneActorRole;
  readonly sourceId: string;
  readonly sourceClass: Extract<SceneTruthClass, "tle-derived" | "fixture-fallback">;
  readonly sourceSamples: ReadonlyArray<SceneActorSourceSample>;
  readonly visibilityWindows: ReadonlyArray<SceneActorVisibilityWindow>;
  readonly displayTransform?: {
    readonly transformClass: "display-only";
    readonly reason: string;
  };
}

export interface SceneActiveLink {
  readonly fromUtc: string;
  readonly toUtc: string;
  readonly satelliteId: string;
  readonly stationAId: string;
  readonly stationBId: string;
}

export interface SceneHandoverEvent {
  readonly atUtc: string;
  readonly fromSatelliteId: string | null;
  readonly toSatelliteId: string;
  readonly reasonKind:
    | "current-link-unavailable"
    | "better-candidate-available"
    | "policy-tie-break"
    | "cross-orbit-migration";
}

export interface SceneCameraHint {
  readonly pairGeometry:
    | "short-baseline"
    | "long-baseline"
    | "polar"
    | "antipodal"
    | "empty-result";
  readonly suggestedAltitudeKm: number;
  readonly suggestedHeadingDeg: number;
  readonly suggestedPitchDeg: number;
}

export interface SceneDisplayPolicy {
  readonly maxVisibleActorLabels: number;
  readonly altitudeCompressionEnabled: boolean;
  readonly altitudeCompressionFactor: number;
  readonly suppressNonActiveTrails: boolean;
}

export interface SceneTruthBoundary {
  readonly sourceMode: SceneSourceMode;
  readonly tleCapPerOrbit: number;
  readonly modeledMetricsActive: ReadonlyArray<string>;
  readonly displayOnlyTransformsActive: ReadonlyArray<string>;
}

export interface TleFirstSceneViewModel {
  readonly sourceMode: SceneSourceMode;
  readonly pair: {
    readonly stationAId: string;
    readonly stationBId: string;
    readonly sourceClass: Extract<SceneTruthClass, "public-registry-derived" | "fixture-fallback">;
  };
  readonly timeWindow: {
    readonly startUtc: string;
    readonly endUtc: string;
    readonly sampleStepSeconds: number;
  };
  readonly actors: ReadonlyArray<SceneActor>;
  readonly activeLinks: ReadonlyArray<SceneActiveLink>;
  readonly handoverEvents: ReadonlyArray<SceneHandoverEvent>;
  readonly cameraHint: SceneCameraHint;
  readonly displayPolicy: SceneDisplayPolicy;
  readonly truthBoundary: SceneTruthBoundary;
}

export interface BuildTleFirstSceneViewModelInput {
  readonly projection?: RuntimeProjectionResult;
  readonly result?: RuntimeProjectionResult;
  readonly tleRecords: ReadonlyArray<TleRecord>;
  readonly sourceMode?: SceneSourceMode;
  readonly sampleStepSeconds?: number;
  readonly tleCapPerOrbit?: number;
  readonly maxVisibleActorLabels?: number;
}

export type SceneCameraHintProjectionInput = Pick<
  RuntimeProjectionResult,
  "pair" | "visibilityWindows" | "handoverEvents"
>;

export interface BuildSceneDisplayPolicyInput {
  readonly maxVisibleActorLabels?: number;
}

const DEFAULT_SAMPLE_STEP_SECONDS = 30;
const DEFAULT_TLE_CAP_PER_ORBIT = 60;
const DEFAULT_MAX_VISIBLE_ACTOR_LABELS = 6;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function resolveProjectionResult(
  input: BuildTleFirstSceneViewModelInput
): RuntimeProjectionResult {
  const result = input.projection ?? input.result;
  if (!result) {
    throw new Error("TLE-first scene view-model requires a runtime projection result.");
  }
  return result;
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined) {
    return fallback;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : fallback;
}

function resolveSampleTimes(
  timeWindow: RuntimeProjectionResult["timeWindow"],
  sampleStepSeconds: number
): ReadonlyArray<number> {
  const startMs = Date.parse(timeWindow.startUtc);
  const endMs = Date.parse(timeWindow.endUtc);
  const stepMs = sampleStepSeconds * 1000;
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    !Number.isFinite(stepMs) ||
    stepMs <= 0 ||
    endMs < startMs
  ) {
    return [];
  }

  const sampleTimes: number[] = [];
  for (let atMs = startMs; atMs <= endMs; atMs += stepMs) {
    sampleTimes.push(atMs);
  }
  if (sampleTimes.length === 0 || sampleTimes[sampleTimes.length - 1] !== endMs) {
    sampleTimes.push(endMs);
  }
  return sampleTimes;
}

function isFiniteEcefPosition(position: unknown): position is SceneEcefKm {
  if (!position || typeof position !== "object") {
    return false;
  }
  const candidate = position as Partial<SceneEcefKm>;
  return (
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  );
}

function buildSourceSamplesForRecord(
  record: TleRecord,
  sampleTimesMs: ReadonlyArray<number>
): ReadonlyArray<SceneActorSourceSample> {
  let satrec: ReturnType<typeof twoline2satrec> | null;
  try {
    satrec = twoline2satrec(record.tleLine1, record.tleLine2);
  } catch {
    return [];
  }
  if (!satrec || satrec.error) {
    return [];
  }

  const samples: SceneActorSourceSample[] = [];
  for (const atMs of sampleTimesMs) {
    const when = new Date(atMs);
    let propagated: ReturnType<typeof propagate> | null;
    try {
      propagated = propagate(satrec, when);
    } catch {
      continue;
    }

    const positionEci = propagated?.position;
    if (!isFiniteEcefPosition(positionEci)) {
      continue;
    }
    const positionEcf = eciToEcf(positionEci, gstime(when));
    if (!isFiniteEcefPosition(positionEcf)) {
      continue;
    }
    samples.push({
      atUtc: when.toISOString(),
      ecefKm: {
        x: positionEcf.x,
        y: positionEcf.y,
        z: positionEcf.z
      }
    });
  }
  return samples;
}

function minUtc(left: string, right: string): string {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function mergeActorWindows(
  windows: ReadonlyArray<PairVisibilityWindow>
): ReadonlyArray<SceneActorVisibilityWindow> {
  return windows
    .slice()
    .sort(
      (left, right) =>
        Date.parse(left.intersectionStartUtc) - Date.parse(right.intersectionStartUtc)
    )
    .map((window) => ({
      startUtc: window.intersectionStartUtc,
      endUtc: window.intersectionEndUtc,
      maxElevationDeg: Math.min(
        window.stationAWindow.maxElevationDeg,
        window.stationBWindow.maxElevationDeg
      )
    }));
}

function buildWindowsBySatellite(
  windows: ReadonlyArray<PairVisibilityWindow>
): Map<string, ReadonlyArray<PairVisibilityWindow>> {
  const grouped = new Map<string, PairVisibilityWindow[]>();
  for (const window of windows) {
    const entries = grouped.get(window.satelliteId) ?? [];
    entries.push(window);
    grouped.set(window.satelliteId, entries);
  }
  return grouped;
}

function earliestWindowStart(windows: ReadonlyArray<PairVisibilityWindow>): string {
  return windows.reduce(
    (earliest, window) => minUtc(earliest, window.intersectionStartUtc),
    windows[0]?.intersectionStartUtc ?? ""
  );
}

function resolveActorRole(
  satelliteId: string,
  activeIds: ReadonlySet<string>,
  continuityIds: ReadonlySet<string>,
  handoverTargetIds: ReadonlySet<string>
): SceneActorRole {
  if (activeIds.has(satelliteId)) {
    return "active";
  }
  if (continuityIds.has(satelliteId)) {
    return "continuity";
  }
  if (handoverTargetIds.has(satelliteId)) {
    return "candidate";
  }
  return "context";
}

function buildHandoverEvents(
  result: RuntimeProjectionResult,
  recordsById: ReadonlyMap<string, TleRecord>
): ReadonlyArray<SceneHandoverEvent> {
  return result.handoverEvents
    .filter((event) => recordsById.has(event.toSatelliteId))
    .map((event) => ({
      atUtc: event.handoverAtUtc,
      fromSatelliteId:
        event.fromSatelliteId && recordsById.has(event.fromSatelliteId)
          ? event.fromSatelliteId
          : null,
      toSatelliteId: event.toSatelliteId,
      reasonKind: event.reasonKind
    }));
}

function buildActiveLinks(
  result: RuntimeProjectionResult,
  actorIds: ReadonlySet<string>,
  handoverEvents: ReadonlyArray<SceneHandoverEvent>
): ReadonlyArray<SceneActiveLink> {
  const endMs = Date.parse(result.timeWindow.endUtc);
  if (!Number.isFinite(endMs) || handoverEvents.length === 0) {
    return [];
  }

  const sortedEvents = handoverEvents
    .filter((event) => actorIds.has(event.toSatelliteId))
    .slice()
    .sort((left, right) => Date.parse(left.atUtc) - Date.parse(right.atUtc));
  const links: SceneActiveLink[] = [];

  for (let i = 0; i < sortedEvents.length; i += 1) {
    const event = sortedEvents[i];
    const fromMs = Date.parse(event.atUtc);
    const nextEvent = sortedEvents[i + 1];
    const toMs = nextEvent ? Date.parse(nextEvent.atUtc) : endMs;
    if (
      !Number.isFinite(fromMs) ||
      !Number.isFinite(toMs) ||
      toMs <= fromMs
    ) {
      continue;
    }
    links.push({
      fromUtc: new Date(fromMs).toISOString(),
      toUtc: new Date(toMs).toISOString(),
      satelliteId: event.toSatelliteId,
      stationAId: result.pair.stationA.id,
      stationBId: result.pair.stationB.id
    });
  }

  return links;
}

function greatCircleDistanceDeg(
  a: { readonly lat: number; readonly lon: number },
  b: { readonly lat: number; readonly lon: number }
): number {
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const deltaLat = (b.lat - a.lat) * DEG_TO_RAD;
  const deltaLon = (b.lon - a.lon) * DEG_TO_RAD;
  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(1 - h, 0))) * RAD_TO_DEG;
}

function initialHeadingDeg(
  a: { readonly lat: number; readonly lon: number },
  b: { readonly lat: number; readonly lon: number }
): number {
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const deltaLon = (b.lon - a.lon) * DEG_TO_RAD;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const heading = Math.atan2(y, x) * RAD_TO_DEG;
  return (heading + 360) % 360;
}

export function buildSceneCameraHintForProjection(
  result: SceneCameraHintProjectionInput
): SceneCameraHint {
  const stationA = result.pair.stationA;
  const stationB = result.pair.stationB;
  const distanceDeg = greatCircleDistanceDeg(stationA, stationB);
  const hasSceneActivity =
    result.visibilityWindows.length > 0 || result.handoverEvents.length > 0;
  const pairGeometry: SceneCameraHint["pairGeometry"] = !hasSceneActivity
    ? "empty-result"
    : distanceDeg >= 160
      ? "antipodal"
      : Math.max(Math.abs(stationA.lat), Math.abs(stationB.lat)) >= 66
        ? "polar"
        : distanceDeg >= 35
          ? "long-baseline"
          : "short-baseline";

  const altitudeByGeometry: Record<SceneCameraHint["pairGeometry"], number> = {
    "short-baseline": 9_000,
    "long-baseline": 18_000,
    polar: 22_000,
    antipodal: 30_000,
    "empty-result": 26_000
  };

  return {
    pairGeometry,
    suggestedAltitudeKm: altitudeByGeometry[pairGeometry],
    suggestedHeadingDeg: initialHeadingDeg(stationA, stationB),
    suggestedPitchDeg:
      pairGeometry === "short-baseline" || pairGeometry === "long-baseline" ? -82 : -55
  };
}

export function buildSceneDisplayPolicy(
  input: BuildSceneDisplayPolicyInput = {}
): SceneDisplayPolicy {
  return {
    maxVisibleActorLabels: normalizePositiveInteger(
      input.maxVisibleActorLabels,
      DEFAULT_MAX_VISIBLE_ACTOR_LABELS
    ),
    altitudeCompressionEnabled: true,
    altitudeCompressionFactor: 0.22,
    suppressNonActiveTrails: true
  };
}

function buildTruthBoundary(
  input: BuildTleFirstSceneViewModelInput,
  sourceMode: SceneSourceMode
): SceneTruthBoundary {
  const result = resolveProjectionResult(input);
  const modeledMetricsActive = new Set<string>([
    "link-budget",
    "latency",
    "jitter",
    "network-speed",
    "handover-policy"
  ]);
  if (result.truthBoundary.nonClaims.length > 0) {
    modeledMetricsActive.add("source-boundary-copy");
  }

  return {
    sourceMode,
    tleCapPerOrbit: normalizePositiveInteger(
      input.tleCapPerOrbit,
      DEFAULT_TLE_CAP_PER_ORBIT
    ),
    modeledMetricsActive: [...modeledMetricsActive],
    displayOnlyTransformsActive: [
      "altitude-compression",
      "camera-framing",
      "label-density",
      "generic-actor-mesh"
    ]
  };
}

export function buildTleFirstSceneViewModel(
  input: BuildTleFirstSceneViewModelInput
): TleFirstSceneViewModel {
  const result = resolveProjectionResult(input);
  const sourceMode = input.sourceMode ?? "tle-first-runtime";
  const sampleStepSeconds = normalizePositiveInteger(
    input.sampleStepSeconds,
    DEFAULT_SAMPLE_STEP_SECONDS
  );
  const recordsById = new Map(
    input.tleRecords.map((record) => [record.satelliteId, record])
  );
  const windowsBySatellite = buildWindowsBySatellite(result.visibilityWindows);
  const handoverEvents = buildHandoverEvents(result, recordsById);
  const handoverTargetIds = new Set(
    handoverEvents.map((event) => event.toSatelliteId)
  );
  const continuityIds = new Set(
    handoverEvents
      .map((event) => event.fromSatelliteId)
      .filter((satelliteId): satelliteId is string => satelliteId !== null)
  );
  const activeIds = new Set(
    handoverEvents.length > 0 ? [handoverEvents[0].toSatelliteId] : []
  );
  const candidateIds = new Set([
    ...windowsBySatellite.keys(),
    ...handoverTargetIds,
    ...continuityIds
  ]);
  const sampleTimesMs = resolveSampleTimes(result.timeWindow, sampleStepSeconds);

  const actorIds = [...candidateIds]
    .filter((satelliteId) => recordsById.has(satelliteId))
    .sort((left, right) => {
      const leftActive = activeIds.has(left) ? 0 : 1;
      const rightActive = activeIds.has(right) ? 0 : 1;
      if (leftActive !== rightActive) {
        return leftActive - rightActive;
      }
      return earliestWindowStart(windowsBySatellite.get(left) ?? []).localeCompare(
        earliestWindowStart(windowsBySatellite.get(right) ?? [])
      );
    });

  const actors: SceneActor[] = [];
  for (const satelliteId of actorIds) {
    const record = recordsById.get(satelliteId);
    if (!record) {
      continue;
    }
    const pairWindows = windowsBySatellite.get(satelliteId) ?? [];
    actors.push({
      satelliteId,
      orbitClass: record.orbitClass,
      role: resolveActorRole(
        satelliteId,
        activeIds,
        continuityIds,
        handoverTargetIds
      ),
      sourceId: `tle:${record.orbitClass.toLowerCase()}`,
      sourceClass: sourceMode === "fixture-fallback" ? "fixture-fallback" : "tle-derived",
      sourceSamples: buildSourceSamplesForRecord(record, sampleTimesMs),
      visibilityWindows: mergeActorWindows(pairWindows),
      displayTransform: {
        transformClass: "display-only",
        reason: "altitude-compression-for-readable-scale"
      }
    });
  }

  const finalActorIds = new Set(actors.map((actor) => actor.satelliteId));

  return {
    sourceMode,
    pair: {
      stationAId: result.pair.stationA.id,
      stationBId: result.pair.stationB.id,
      sourceClass:
        sourceMode === "fixture-fallback"
          ? "fixture-fallback"
          : "public-registry-derived"
    },
    timeWindow: {
      startUtc: result.timeWindow.startUtc,
      endUtc: result.timeWindow.endUtc,
      sampleStepSeconds
    },
    actors,
    activeLinks: buildActiveLinks(result, finalActorIds, handoverEvents),
    handoverEvents,
    cameraHint: buildSceneCameraHintForProjection(result),
    displayPolicy: buildSceneDisplayPolicy(input),
    truthBoundary: buildTruthBoundary(input, sourceMode)
  };
}
