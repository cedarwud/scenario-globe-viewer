# Satellite Overlay Contract

## Purpose

`satellite-overlay` fixes the repo-facing serializable boundary for future satellite fixture ingestion and overlay runtime work without turning that runtime on in Phase 3. In the current repo state, it documents the public data shapes, the adapter interface, and the ownership split between `overlay-manager` and a later concrete satellite adapter.

## Public Shape

Current public source of truth: `src/features/satellites/adapter.ts`.

```ts
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface SatelliteSample {
  id: string;
  name?: string;
  positionEcef: Vec3;
  velocityEcef?: Vec3;
  time: ClockTimestamp;
}

type SatelliteFixture =
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

interface SatelliteOverlayAdapter {
  loadFixture(fixture: SatelliteFixture): Promise<{ satCount: number }>;
  attachToClock(clock: ReplayClock): void;
  setVisible(visible: boolean): void;
  dispose(): Promise<void>;
}
```

## Plain-Data Boundary

The public contract is intentionally serializable:

- `Vec3` is plain numeric ECEF coordinate data in meters
- `SatelliteSample` carries ids, optional names, plain position/velocity values, and a `ClockTimestamp`
- `SatelliteFixture` is a discriminated union for `tle`, `czml`, and `sample-series`
- the CZML branch is limited to `SatelliteJsonValue`, not `unknown`

The public contract does not expose Cesium runtime classes such as:

- `Viewer`
- `JulianDate`
- `Cartesian3`
- `Entity`
- `SampledPositionProperty`

The current repo state fixes the outer data contract only. Any later conversion from plain-data fixture/sample input into Cesium runtime types belongs inside a concrete adapter implementation, not in the public contract and not in `overlay-manager`.

## Ownership Boundary

### `SatelliteOverlayAdapter`

The adapter seam owns:

- fixture loading through `loadFixture(...)`
- binding itself to an external `ReplayClock`
- adapter-local visibility application
- final disposal of adapter-owned runtime resources

The adapter seam does not currently imply:

- a concrete implementation
- live runtime wiring in `src/main.ts`
- walker-specific assumptions
- overlay registry ownership

### `overlay-manager`

`overlay-manager` is a separate repo-owned seam under `src/features/overlays/`. In the current repo state, manager ownership stops at:

- adapter attach/detach lifecycle
- top-level visible/hidden state
- final manager disposal

`overlay-manager` does not own:

- fixture ingestion
- TLE parsing
- CZML interpretation
- coordinate/frame conversion
- per-satellite data modeling

That split is already reflected in source: `overlay-manager` imports the formal satellite module seam, but it does not add fixture-specific methods or a concrete runtime path.

## Current Repo State

In the current repo state:

- the public contract lives in `src/features/satellites/adapter.ts` and is re-exported from `src/features/satellites/index.ts`
- `overlay-manager` depends on the formal `SatelliteOverlayAdapter` interface through `../satellites`, not through a concrete adapter file
- no concrete satellite adapter implementation exists yet
- `src/features/satellites/walker-fixture-adapter.ts` does not exist
- no satellite or overlay runtime path is wired into `src/main.ts`
- no fixture ingestion behavior is active in the runtime

## Walker Fixture Boundary

The walker 18-sat TLE line is not part of the core contract.

- the repo-owned copied fixture asset under `public/fixtures/satellites/walker-o6-s3-i45-h698.tle` is a smoke source, not a public contract default
- the number `18` must not leak into `overlay-manager`, `scene-preset`, `replay-clock`, or other core repo contracts
- this contract does not require walker-specific ids, names, counts, or preset behavior

The current repo already preserves that separation by exposing only the generic `tle` / `czml` / `sample-series` fixture union and not shipping a walker-specific adapter.

## Not-Yet-Implemented

This contract does not currently include:

- a concrete `SatelliteOverlayAdapter` implementation
- a walker fixture adapter
- live satellite entities, primitives, or sampled properties
- TLE propagation
- coordinate/frame conversion logic
- a chosen default `epochMode`
- per-satellite visibility control
- Phase 4 fixture ingestion behavior

## Related

- [README.md](../../README.md)
- [Architecture](../architecture.md)
- [Delivery Phases](../delivery-phases.md)
- [ADR 0002: Viewer Strategy](../decisions/0002-viewer-strategy.md)
