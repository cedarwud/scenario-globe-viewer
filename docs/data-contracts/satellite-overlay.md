# Satellite Overlay Contract

## Purpose

`satellite-overlay` fixes the repo-facing serializable boundary for future satellite fixture ingestion and later overlay runtime work without claiming that either path is active in the current repo. In the current repo reality, Phase 3 stops at the public data shapes, the adapter interface, and the ownership split between `overlay-manager` and a later concrete satellite adapter. Phase 4 wording here records the smallest allowed fixture-ingestion seam while keeping Phase 5 as the first overlay runtime/rendering phase.

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

If a future fixture source arrives as TLE / SGP4 / TEME / ECI data rather than repo-facing samples, the adapter owns:

- parsing the source fixture
- propagation and time application
- frame conversion into repo-facing ECEF sample data or other adapter-local Cesium-consumable forms
- any later construction of Cesium runtime classes after that conversion

That responsibility does not move into `overlay-manager`, and it does not widen this public contract to expose Cesium runtime classes.

## Ownership Boundary

### `SatelliteOverlayAdapter`

The adapter seam owns:

- fixture loading through `loadFixture(...)`
- binding itself to an external `ReplayClock`
- adapter-local visibility application
- adapter-local parsing, propagation, and frame conversion when the source is not already repo-facing sample data
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
- SGP4 propagation
- TEME / ECI to repo-facing ECEF or other Cesium-consumable conversion
- Cesium runtime object construction for satellite data
- per-satellite data modeling

That split is already reflected in source: `overlay-manager` imports the formal satellite module seam, but it does not add fixture-specific methods or a concrete runtime path.

## Current Repo State

In the current repo state:

- the public contract lives in `src/features/satellites/adapter.ts` and is re-exported from `src/features/satellites/index.ts`
- `overlay-manager` depends on the formal `SatelliteOverlayAdapter` interface through `../satellites`, not through a concrete adapter file
- a concrete Phase 4.1 walker fixture adapter now exists at `src/features/satellites/walker-fixture-adapter.ts`
- no satellite or overlay runtime path is wired into `src/main.ts`
- fixture ingestion now exists only inside that adapter seam; it is still inactive on the live runtime path

## Walker Fixture Boundary

The walker 18-sat TLE line is a Phase 4 smoke/source fixture, not part of the core contract.

- the repo-owned copied fixture asset under `public/fixtures/satellites/walker-o6-s3-i45-h698.tle` is a smoke source for future fixture ingestion, not a public contract default
- any walker-specific handling belongs inside a future `walker-fixture-adapter`-style ingestion seam rather than in `overlay-manager`, `replay-clock`, `scene-preset`, or the general satellite contract
- the number `18` must not leak into `overlay-manager`, `scene-preset`, `replay-clock`, or other core repo contracts
- this contract does not require walker-specific ids, names, counts, or preset behavior

The current repo preserves that separation by exposing only the generic `tle` / `czml` / `sample-series` fixture union while keeping the concrete walker ingestion path in its own adapter file rather than widening the shared contract.

## Phase 4 Smoke Default

For the future Phase 4 smoke/source ingestion path that uses the copied walker TLE fixture, the repo-owned default is `epochMode: "relative-to-now"`.

- this default is scoped to the TLE smoke/fixture ingestion path only
- it is not an immutable core-contract rule for all future adapters or fixture kinds
- later formal/regression feeds may set `epochMode: "absolute"` or another explicit policy as needed
- the current Phase 4.1 walker adapter now implements this default inside the adapter seam

## Phase 4 And Phase 5 Boundary

Current repo reality remains unchanged:

- a concrete Phase 4.1 walker fixture adapter now exists at `src/features/satellites/walker-fixture-adapter.ts`
- no satellite or overlay runtime path is wired into `src/main.ts`
- runtime overlay activation is still inactive; fixture ingestion remains adapter-local only

Hard boundary for the future Phase 4.1 slice:

- Phase 4.1 stops at the walker fixture adapter ingestion seam
- that seam may load the copied walker TLE through `loadFixture(...)` and keep parsing, propagation, frame conversion, and ingestion-local bookkeeping inside the adapter
- Phase 4.1 does not imply runtime overlay activation, `src/main.ts` wiring, entity/primitive/orbit rendering, HUD controls, or per-satellite UI
- Phase 5 is the first phase that may introduce overlay runtime/rendering work on top of the Phase 4 ingestion seam

## Not-Yet-Implemented

This contract does not currently include:

- live satellite entities, primitives, or sampled properties
- `src/main.ts` wiring for fixture ingestion or overlay activation
- per-satellite visibility control
- HUD controls or per-satellite UI

## Related

- [README.md](../../README.md)
- [Architecture](../architecture.md)
- [Delivery Phases](../delivery-phases.md)
- [ADR 0002: Viewer Strategy](../decisions/0002-viewer-strategy.md)
