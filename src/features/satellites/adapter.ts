import type { ClockTimestamp, ReplayClock } from "../time";

/** Plain-data ECEF coordinates in meters. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type SatelliteJsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<SatelliteJsonValue>
  | { readonly [key: string]: SatelliteJsonValue };

export interface SatelliteSample {
  id: string;
  name?: string;
  positionEcef: Vec3;
  velocityEcef?: Vec3;
  time: ClockTimestamp;
}

export type SatelliteFixture =
  | {
      kind: "tle";
      tleText: string;
      propagator?: "sgp4";
      epochMode?: "absolute" | "relative-to-now";
    }
  | {
      kind: "czml";
      czml: SatelliteJsonValue;
    }
  | {
      kind: "sample-series";
      samples: ReadonlyArray<SatelliteSample>;
    };

// Phase 3.7 stops at the repo-owned adapter boundary. External callers hand
// over serializable fixture shapes now, but actual ingestion/runtime work stays
// inside a later concrete implementation.
export interface SatelliteOverlayAdapter {
  loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }>;
  attachToClock(clock: ReplayClock): void;
  setVisible(visible: boolean): void;
  dispose(): Promise<void>;
}
