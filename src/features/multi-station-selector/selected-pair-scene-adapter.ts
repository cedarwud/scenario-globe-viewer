import type {
  RuntimeProjectionResult,
  HandoverEvent
} from "./runtime-projection";
import type { OrbitClass, PairVisibilityWindow, TleRecord } from "./visibility-utils";
import {
  eciToEcf,
  gstime,
  propagate,
  twoline2satrec
} from "../../vendor/satellite-js-runtime";

export type SelectedPairSceneSatelliteRole =
  | "link-selection-event"
  | "visibility-context";

export interface SelectedPairSceneSatellite {
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly tleLine1: string;
  readonly tleLine2: string;
  readonly role: SelectedPairSceneSatelliteRole;
  readonly visibleDurationMs: number;
}

export interface SelectedPairSceneLinkEvent {
  readonly atUtc: string;
  readonly satelliteId: string;
  readonly reasonKind: HandoverEvent["reasonKind"] | "initial-acquisition";
}

export interface SelectedPairSceneEcefPositionKm {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SelectedPairScenePositionSample {
  readonly atUtc: string;
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly positionEcefKm: SelectedPairSceneEcefPositionKm;
}

export interface SelectedPairSceneActiveSelectionSample {
  readonly atUtc: string;
  readonly satelliteId: string;
  readonly orbitClass: OrbitClass;
  readonly positionEcefKm: SelectedPairSceneEcefPositionKm;
}

export interface SelectedPairSceneOverlay {
  readonly timeWindow: RuntimeProjectionResult["timeWindow"];
  readonly satellites: ReadonlyArray<SelectedPairSceneSatellite>;
  readonly linkEvents: ReadonlyArray<SelectedPairSceneLinkEvent>;
  readonly positionSampleStepSeconds: number;
  readonly positionSamples: ReadonlyArray<SelectedPairScenePositionSample>;
  readonly activeSelectionSamples: ReadonlyArray<SelectedPairSceneActiveSelectionSample>;
  readonly windowCount: number;
}

export interface SelectedPairSceneOverlayOptions {
  readonly satelliteLimit?: number;
  readonly sampleStepSeconds?: number;
}

const DEFAULT_SCENE_SATELLITE_LIMIT = 6;
const DEFAULT_POSITION_SAMPLE_STEP_SECONDS = 30;

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined) {
    return fallback;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : fallback;
}

function resolveOverlayOptions(
  limitOrOptions: number | SelectedPairSceneOverlayOptions
): Required<SelectedPairSceneOverlayOptions> {
  if (typeof limitOrOptions === "number") {
    return {
      satelliteLimit: normalizePositiveInteger(
        limitOrOptions,
        DEFAULT_SCENE_SATELLITE_LIMIT
      ),
      sampleStepSeconds: DEFAULT_POSITION_SAMPLE_STEP_SECONDS
    };
  }

  return {
    satelliteLimit: normalizePositiveInteger(
      limitOrOptions.satelliteLimit,
      DEFAULT_SCENE_SATELLITE_LIMIT
    ),
    sampleStepSeconds: normalizePositiveInteger(
      limitOrOptions.sampleStepSeconds,
      DEFAULT_POSITION_SAMPLE_STEP_SECONDS
    )
  };
}

function windowDurationMs(window: PairVisibilityWindow): number {
  const startMs = Date.parse(window.intersectionStartUtc);
  const endMs = Date.parse(window.intersectionEndUtc);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return endMs - startMs;
}

function buildVisibleDurationBySatellite(
  windows: ReadonlyArray<PairVisibilityWindow>
): Map<string, number> {
  const durations = new Map<string, number>();
  for (const window of windows) {
    durations.set(
      window.satelliteId,
      (durations.get(window.satelliteId) ?? 0) + windowDurationMs(window)
    );
  }
  return durations;
}

function resolveOrbitForSatellite(
  satelliteId: string,
  windows: ReadonlyArray<PairVisibilityWindow>,
  fallback: OrbitClass
): OrbitClass {
  return windows.find((window) => window.satelliteId === satelliteId)?.orbitClass ?? fallback;
}

function createSatellite(
  record: TleRecord,
  result: RuntimeProjectionResult,
  role: SelectedPairSceneSatelliteRole,
  durations: ReadonlyMap<string, number>
): SelectedPairSceneSatellite {
  return {
    satelliteId: record.satelliteId,
    orbitClass: resolveOrbitForSatellite(
      record.satelliteId,
      result.visibilityWindows,
      record.orbitClass
    ),
    tleLine1: record.tleLine1,
    tleLine2: record.tleLine2,
    role,
    visibleDurationMs: durations.get(record.satelliteId) ?? 0
  };
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
  if (sampleTimes[sampleTimes.length - 1] !== endMs) {
    sampleTimes.push(endMs);
  }
  return sampleTimes;
}

function isFiniteEcefPosition(
  position: unknown
): position is SelectedPairSceneEcefPositionKm {
  if (!position || typeof position !== "object") {
    return false;
  }
  const candidate = position as Partial<SelectedPairSceneEcefPositionKm>;
  return (
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.z)
  );
}

function buildPositionSamplesForSatellite(
  satellite: SelectedPairSceneSatellite,
  sampleTimesMs: ReadonlyArray<number>
): ReadonlyArray<SelectedPairScenePositionSample> {
  let satrec: ReturnType<typeof twoline2satrec> | null;
  try {
    satrec = twoline2satrec(satellite.tleLine1, satellite.tleLine2);
  } catch {
    return [];
  }

  if (!satrec || satrec.error) {
    return [];
  }

  const samples: SelectedPairScenePositionSample[] = [];
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
      satelliteId: satellite.satelliteId,
      orbitClass: satellite.orbitClass,
      positionEcefKm: {
        x: positionEcf.x,
        y: positionEcf.y,
        z: positionEcf.z
      }
    });
  }

  return samples;
}

function buildPositionSamples(
  timeWindow: RuntimeProjectionResult["timeWindow"],
  satellites: ReadonlyArray<SelectedPairSceneSatellite>,
  sampleStepSeconds: number
): ReadonlyArray<SelectedPairScenePositionSample> {
  const sampleTimesMs = resolveSampleTimes(timeWindow, sampleStepSeconds);
  return satellites.flatMap((satellite) =>
    buildPositionSamplesForSatellite(satellite, sampleTimesMs)
  );
}

function positionSampleKey(atUtc: string, satelliteId: string): string {
  return `${atUtc}\u0000${satelliteId}`;
}

function resolveActiveSatelliteIdAt(
  linkEvents: ReadonlyArray<SelectedPairSceneLinkEvent>,
  fallbackSatelliteId: string | null,
  atMs: number
): string | null {
  let activeSatelliteId: string | null = null;
  for (const event of linkEvents) {
    const eventMs = Date.parse(event.atUtc);
    if (Number.isFinite(eventMs) && eventMs <= atMs) {
      activeSatelliteId = event.satelliteId;
    }
  }
  return activeSatelliteId ?? fallbackSatelliteId;
}

function buildActiveSelectionSamples(
  timeWindow: RuntimeProjectionResult["timeWindow"],
  satellites: ReadonlyArray<SelectedPairSceneSatellite>,
  linkEvents: ReadonlyArray<SelectedPairSceneLinkEvent>,
  positionSamples: ReadonlyArray<SelectedPairScenePositionSample>,
  sampleStepSeconds: number
): ReadonlyArray<SelectedPairSceneActiveSelectionSample> {
  const fallbackSatelliteId = satellites[0]?.satelliteId ?? null;
  const sampleTimesMs = resolveSampleTimes(timeWindow, sampleStepSeconds);
  const positionSamplesByTimeAndSatellite = new Map(
    positionSamples.map((sample) => [
      positionSampleKey(sample.atUtc, sample.satelliteId),
      sample
    ])
  );
  const activeSamples: SelectedPairSceneActiveSelectionSample[] = [];

  for (const atMs of sampleTimesMs) {
    const atUtc = new Date(atMs).toISOString();
    const satelliteId = resolveActiveSatelliteIdAt(
      linkEvents,
      fallbackSatelliteId,
      atMs
    );
    if (!satelliteId) {
      continue;
    }

    const positionSample = positionSamplesByTimeAndSatellite.get(
      positionSampleKey(atUtc, satelliteId)
    );
    if (!positionSample) {
      continue;
    }

    activeSamples.push({
      atUtc,
      satelliteId,
      orbitClass: positionSample.orbitClass,
      positionEcefKm: positionSample.positionEcefKm
    });
  }

  return activeSamples;
}

export function buildSelectedPairSceneOverlay(
  result: RuntimeProjectionResult,
  tleRecords: ReadonlyArray<TleRecord>,
  limitOrOptions: number | SelectedPairSceneOverlayOptions = DEFAULT_SCENE_SATELLITE_LIMIT
): SelectedPairSceneOverlay {
  const options = resolveOverlayOptions(limitOrOptions);
  const recordsById = new Map(tleRecords.map((record) => [record.satelliteId, record]));
  const durations = buildVisibleDurationBySatellite(result.visibilityWindows);
  const selectedIds = new Set(result.handoverEvents.map((event) => event.toSatelliteId));
  const satellites: SelectedPairSceneSatellite[] = [];

  for (const satelliteId of selectedIds) {
    const record = recordsById.get(satelliteId);
    if (record) {
      satellites.push(createSatellite(record, result, "link-selection-event", durations));
    }
  }

  const remainingSlots = Math.max(options.satelliteLimit - satellites.length, 0);
  const selectedLookup = new Set(satellites.map((satellite) => satellite.satelliteId));
  const contextIds = [...durations.entries()]
    .filter(([satelliteId]) => !selectedLookup.has(satelliteId))
    .sort((left, right) => right[1] - left[1])
    .slice(0, remainingSlots)
    .map(([satelliteId]) => satelliteId);

  for (const satelliteId of contextIds) {
    const record = recordsById.get(satelliteId);
    if (record) {
      satellites.push(createSatellite(record, result, "visibility-context", durations));
    }
  }

  const linkEvents: SelectedPairSceneLinkEvent[] = result.handoverEvents.map((event) => ({
    atUtc: event.handoverAtUtc,
    satelliteId: event.toSatelliteId,
    reasonKind:
      event.fromSatelliteId === null ? "initial-acquisition" : event.reasonKind
  }));
  const positionSamples = buildPositionSamples(
    result.timeWindow,
    satellites,
    options.sampleStepSeconds
  );
  const activeSelectionSamples = buildActiveSelectionSamples(
    result.timeWindow,
    satellites,
    linkEvents,
    positionSamples,
    options.sampleStepSeconds
  );

  return {
    timeWindow: result.timeWindow,
    satellites,
    linkEvents,
    positionSampleStepSeconds: options.sampleStepSeconds,
    positionSamples,
    activeSelectionSamples,
    windowCount: result.visibilityWindows.length
  };
}
