import {
  eciToEcf,
  gstime,
  invjday,
  propagate,
  twoline2satrec,
  type SatRec
} from "satellite.js";

import type { ReplayClock, ClockTimestamp } from "../time";
import type { SatelliteFixture, SatelliteOverlayAdapter, SatelliteSample } from "./adapter";

type TleEpochMode = "absolute" | "relative-to-now";

interface WalkerTleRecord {
  id: string;
  name?: string;
  line1: string;
  line2: string;
  satrec: SatRec;
  epochMs: number;
}

interface LoadedWalkerFixture {
  epochMode: TleEpochMode;
  propagator: "sgp4";
  clockAnchorMs: number;
  clockAnchorTime: ClockTimestamp;
  records: ReadonlyArray<WalkerTleRecord>;
}

interface WalkerOrbitTrackSample {
  id: string;
  positionsEcef: ReadonlyArray<SatelliteSample["positionEcef"]>;
}

export interface WalkerFixtureAdapterState {
  fixtureKind: SatelliteFixture["kind"] | null;
  satCount: number;
  visible: boolean;
  clockAttached: boolean;
  propagator: "sgp4" | null;
  epochModeUsed: TleEpochMode | null;
  clockAnchorTime: ClockTimestamp | null;
  sampleTime: ClockTimestamp | null;
  propagationTime: string | null;
}

export const DEFAULT_WALKER_TLE_EPOCH_MODE = "relative-to-now";
const FULL_ORBIT_RADIANS = Math.PI * 2;

function assertFiniteTimestamp(value: ClockTimestamp): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Satellite timestamp must be finite: ${value}`);
  }
}

function normalizeClockTimestamp(value: ClockTimestamp): ClockTimestamp {
  assertFiniteTimestamp(value);

  if (typeof value === "number") {
    return value;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Satellite timestamp must be ISO 8601 or epoch milliseconds: ${value}`);
  }

  return new Date(parsed).toISOString();
}

function toEpochMilliseconds(value: ClockTimestamp): number {
  return typeof value === "number" ? value : Date.parse(value);
}

function toVectorMeters(vector: { x: number; y: number; z: number }) {
  return {
    x: vector.x * 1000,
    y: vector.y * 1000,
    z: vector.z * 1000
  };
}

function parseWalkerTleRecords(tleText: string): ReadonlyArray<WalkerTleRecord> {
  const lines = tleText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const records: WalkerTleRecord[] = [];

  for (let index = 0; index < lines.length; ) {
    let name: string | undefined;

    if (!lines[index]?.startsWith("1 ")) {
      name = lines[index];
      index += 1;
    }

    const line1 = lines[index];
    const line2 = lines[index + 1];

    if (!line1?.startsWith("1 ") || !line2?.startsWith("2 ")) {
      throw new Error(
        `Malformed TLE fixture near line ${index + 1}: expected line 1/line 2 pair.`
      );
    }

    const satrec = twoline2satrec(line1, line2);
    const epochDate = invjday(satrec.jdsatepoch);
    const trimmedName = name?.trim();

    records.push({
      id: trimmedName && trimmedName.length > 0 ? trimmedName : `sat-${satrec.satnum}`,
      name: trimmedName && trimmedName.length > 0 ? trimmedName : undefined,
      line1,
      line2,
      satrec,
      epochMs: epochDate.valueOf()
    });
    index += 2;
  }

  if (records.length === 0) {
    throw new Error("Walker fixture ingestion requires at least one TLE record.");
  }

  return records;
}

function resolveClockAnchorTime(clock?: ReplayClock): ClockTimestamp {
  if (clock) {
    return normalizeClockTimestamp(clock.getState().currentTime);
  }

  return new Date().toISOString();
}

function resolveInitialSampleTime(
  epochMode: TleEpochMode,
  records: ReadonlyArray<WalkerTleRecord>,
  clock?: ReplayClock
): ClockTimestamp {
  if (clock) {
    return normalizeClockTimestamp(clock.getState().currentTime);
  }

  if (epochMode === "absolute") {
    return new Date(records[0].epochMs).toISOString();
  }

  return new Date().toISOString();
}

function resolvePropagationDate(
  record: WalkerTleRecord,
  epochMode: TleEpochMode,
  sampleTime: ClockTimestamp,
  clockAnchorMs: number
): Date {
  const sampleMs = toEpochMilliseconds(sampleTime);
  if (epochMode === "absolute") {
    return new Date(sampleMs);
  }

  // Relative-to-now keeps the aged TLE anchored to the active repo clock.
  return new Date(record.epochMs + (sampleMs - clockAnchorMs));
}

function propagateWalkerSample(
  record: WalkerTleRecord,
  epochMode: TleEpochMode,
  sampleTime: ClockTimestamp,
  clockAnchorMs: number
): { sample: SatelliteSample; propagationTime: string } {
  const propagationDate = resolvePropagationDate(
    record,
    epochMode,
    sampleTime,
    clockAnchorMs
  );
  const propagated = propagate(record.satrec, propagationDate);

  if (!propagated) {
    throw new Error(`SGP4 propagation failed for ${record.id}.`);
  }

  const positionEci = propagated.position;
  if (!positionEci) {
    throw new Error(`SGP4 propagation did not return a position for ${record.id}.`);
  }

  const positionEcf = eciToEcf(positionEci, gstime(propagationDate));

  return {
    sample: {
      id: record.id,
      name: record.name,
      positionEcef: toVectorMeters(positionEcf),
      time: sampleTime
    },
    propagationTime: propagationDate.toISOString()
  };
}

function resolveOrbitPeriodMs(record: WalkerTleRecord): number {
  const meanMotionRadPerMinute = record.satrec.no;
  if (!Number.isFinite(meanMotionRadPerMinute) || meanMotionRadPerMinute <= 0) {
    throw new Error(`Walker orbit period is unavailable for ${record.id}.`);
  }

  return (FULL_ORBIT_RADIANS / meanMotionRadPerMinute) * 60_000;
}

export class WalkerFixtureAdapter implements SatelliteOverlayAdapter {
  private attachedClock?: ReplayClock;
  private detachTickListener?: () => void;
  private loadedFixture?: LoadedWalkerFixture;
  private currentSamples: ReadonlyArray<SatelliteSample> = [];
  private state: WalkerFixtureAdapterState = {
    fixtureKind: null,
    satCount: 0,
    visible: true,
    clockAttached: false,
    propagator: null,
    epochModeUsed: null,
    clockAnchorTime: null,
    sampleTime: null,
    propagationTime: null
  };

  async loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }> {
    if (fixture.kind !== "tle") {
      throw new Error("WalkerFixtureAdapter only supports TLE fixtures.");
    }

    const propagator = fixture.propagator ?? "sgp4";
    if (propagator !== "sgp4") {
      throw new Error(`Unsupported walker propagator: ${propagator}`);
    }

    if (typeof fixture.tleText !== "string") {
      throw new Error("WalkerFixtureAdapter requires an inline TLE fixture.");
    }

    const records = parseWalkerTleRecords(fixture.tleText);
    const epochMode = fixture.epochMode ?? DEFAULT_WALKER_TLE_EPOCH_MODE;
    const clockAnchorTime = resolveClockAnchorTime(this.attachedClock);
    this.loadedFixture = {
      epochMode,
      propagator,
      clockAnchorMs: toEpochMilliseconds(clockAnchorTime),
      clockAnchorTime,
      records
    };

    const initialSampleTime = resolveInitialSampleTime(
      epochMode,
      records,
      this.attachedClock
    );
    this.resample(initialSampleTime);

    return { satCount: this.currentSamples.length };
  }

  attachToClock(clock: ReplayClock): void {
    this.detachTickListener?.();
    this.attachedClock = clock;
    this.state = {
      ...this.state,
      clockAttached: true
    };

    this.detachTickListener = clock.onTick((nextState) => {
      this.resample(nextState.currentTime);
    });

    if (this.loadedFixture) {
      this.resample(clock.getState().currentTime);
    }
  }

  setVisible(visible: boolean): void {
    this.state = {
      ...this.state,
      visible
    };
  }

  getCurrentSamples(): ReadonlyArray<SatelliteSample> {
    return this.currentSamples;
  }

  sampleOrbitTracks(
    referenceTime: ClockTimestamp,
    sampleCount: number
  ): ReadonlyArray<WalkerOrbitTrackSample> {
    if (!this.loadedFixture) {
      return [];
    }

    if (!Number.isInteger(sampleCount) || sampleCount < 2) {
      throw new Error(`Walker orbit sampling requires an integer sampleCount >= 2: ${sampleCount}`);
    }

    const normalizedReferenceTime = normalizeClockTimestamp(referenceTime);
    const referenceTimeMs = toEpochMilliseconds(normalizedReferenceTime);

    return this.loadedFixture.records.map((record) => {
      const orbitPeriodMs = resolveOrbitPeriodMs(record);
      const orbitStartMs = referenceTimeMs - orbitPeriodMs / 2;
      const stepMs = orbitPeriodMs / (sampleCount - 1);
      const positionsEcef = Array.from({ length: sampleCount }, (_, index) => {
        const orbitSampleTime = new Date(orbitStartMs + stepMs * index).toISOString();
        return propagateWalkerSample(
          record,
          this.loadedFixture!.epochMode,
          orbitSampleTime,
          this.loadedFixture!.clockAnchorMs
        ).sample.positionEcef;
      });

      return {
        id: record.id,
        positionsEcef
      };
    });
  }

  getIngestionState(): WalkerFixtureAdapterState {
    return { ...this.state };
  }

  async dispose(): Promise<void> {
    this.detachTickListener?.();
    this.detachTickListener = undefined;
    this.attachedClock = undefined;
    this.loadedFixture = undefined;
    this.currentSamples = [];
    this.state = {
      fixtureKind: null,
      satCount: 0,
      visible: this.state.visible,
      clockAttached: false,
      propagator: null,
      epochModeUsed: null,
      clockAnchorTime: null,
      sampleTime: null,
      propagationTime: null
    };
  }

  private resample(sampleTime: ClockTimestamp): void {
    if (!this.loadedFixture) {
      return;
    }

    const normalizedSampleTime = normalizeClockTimestamp(sampleTime);
    const samples = this.loadedFixture.records.map((record) =>
      propagateWalkerSample(
        record,
        this.loadedFixture!.epochMode,
        normalizedSampleTime,
        this.loadedFixture!.clockAnchorMs
      )
    );

    this.currentSamples = samples.map((entry) => entry.sample);
    this.state = {
      fixtureKind: "tle",
      satCount: this.currentSamples.length,
      visible: this.state.visible,
      clockAttached: Boolean(this.attachedClock),
      propagator: this.loadedFixture.propagator,
      epochModeUsed: this.loadedFixture.epochMode,
      clockAnchorTime: this.loadedFixture.clockAnchorTime,
      sampleTime: normalizedSampleTime,
      propagationTime: samples[0]?.propagationTime ?? null
    };
  }
}

export function createWalkerFixtureAdapter(): WalkerFixtureAdapter {
  return new WalkerFixtureAdapter();
}
