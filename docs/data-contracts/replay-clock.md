# Replay Clock Contract

## Purpose

`replay-clock` is the repo-owned time seam between app-facing UI/state code and the Cesium runtime clock. In the current repo state, it defines a serializable contract for reading and steering time without leaking Cesium runtime classes into repo-facing state or HUD formatting.

## Public Shape

Current public source of truth: `src/features/time/replay-clock.ts`.

```ts
type ClockMode = "real-time" | "prerecorded";
type ClockTimestamp = string | number;

interface ReplayClockState {
  mode: ClockMode;
  currentTime: ClockTimestamp;
  startTime: ClockTimestamp;
  stopTime: ClockTimestamp;
  multiplier: number;
  isPlaying: boolean;
}

interface ReplayClock {
  getState(): ReplayClockState;
  play(): void;
  pause(): void;
  setMultiplier(x: number): void;
  seek(t: ClockTimestamp): void;
  setMode(
    mode: ClockMode,
    range?: { start: ClockTimestamp; stop: ClockTimestamp }
  ): void;
  onTick(listener: (state: ReplayClockState) => void): () => void;
}
```

Field notes from the landed contract:

- `ClockTimestamp` accepts ISO 8601 strings or epoch milliseconds
- negative `multiplier` values mean reverse playback
- `setMultiplier(...)` does not imply play/pause
- `seek(...)` is absolute, not relative
- `setMode(...)` may also reset the active `startTime` / `stopTime` range

## Plain-Data Boundary

The public contract stays plain-data only:

- timestamps are `string | number`
- state is serializable
- listeners receive `ReplayClockState`, not Cesium objects

The public contract does not mention or expose:

- `Viewer`
- `JulianDate`
- `Clock`
- other Cesium runtime classes

Only the implementation boundary in `src/features/time/cesium-replay-clock.ts` converts between plain data and Cesium time values.

## Ownership Boundary

`replay-clock` owns:

- repo-facing time mode names
- serializable time state
- play/pause/seek/multiplier/mode APIs
- a tick subscription seam that emits plain state

`replay-clock` does not own:

- a second independent clock source
- preset selection
- overlay attachment
- fixture ingestion
- a full timeline control UI

The current repo-owned HUD uses this seam as a consumer only. The status-panel timeline placeholder formats `ReplayClockState` into read-only text and does not replace Cesium's native timeline or expose a complete control surface.

## Single Time Source Rule

In the current repo state, the only runtime time source is Cesium's `viewer.clock`.

The Cesium-backed implementation:

- reads `currentTime`, `startTime`, `stopTime`, `multiplier`, and `shouldAnimate` from `viewer.clock`
- maps `isPlaying` to `viewer.clock.shouldAnimate`
- keeps both modes on Cesium `SYSTEM_CLOCK_MULTIPLIER`
- emits tick updates from `viewer.clock.onTick`

There is no parallel repo-local clock, timer loop, or duplicate HUD-owned time model.

## Mode Semantics

### `real-time`

Current `real-time` behavior still runs on the same Cesium `viewer.clock`.

- `play()` sets `viewer.clock.shouldAnimate = true`
- `pause()` sets `viewer.clock.shouldAnimate = false`
- `setMultiplier(x)` writes directly to `viewer.clock.multiplier`
- `seek(t)` moves the active clock to an absolute timestamp
- `setMode("real-time", range)` updates the active Cesium `startTime` / `stopTime` interval to that range and keeps the clock on the same time source
- `setMode("real-time")` without `range` preserves the current active interval

### `prerecorded`

Current `prerecorded` behavior is also implemented on the same Cesium `viewer.clock`; it is not a separate playback engine.

- prerecorded mode applies a clamped clip on the active Cesium clock interval
- `setMode("prerecorded", range)` sets a clamped `startTime` / `stopTime` range
- `setMode("prerecorded")` without `range` reuses the active `startTime` / `stopTime` interval
- `seek(t)` clamps to the active clip bounds
- forward playback clamps at `stopTime`
- reverse playback clamps at `startTime`

This is the current Phase 3.4 reality, not a planned future shape.

## Current Repo State

In the current repo state:

- the public contract lives under `src/features/time/` and is re-exported from `src/features/time/index.ts`
- the concrete Cesium-backed implementation lives in `src/features/time/cesium-replay-clock.ts`
- the implementation currently serializes exported state timestamps as ISO 8601 strings
- the runtime exposes the adapter through `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__` for targeted validation
- the same plain-data state is also consumed locally by the read-only timeline HUD placeholder
- the native Cesium timeline, toolbar, and credits remain present in the runtime shell

## R1V.2 Addressed-Route Policy

`R1V.2` does not replace the base `ReplayClock` contract. It adds an
addressed-route policy layer in
`src/runtime/first-intake-replay-time-authority-controller.ts` for the matched
first-intake scene only.

On that addressed route:

- the capture seam still exposes `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.replayClock`
- that replay-clock seam is the bounded addressed-route authority used by the
  first-intake runtime
- replay `startTime` / `stopTime` are derived from
  `firstIntakeMobileEndpointTrajectory.trajectory.windowStartUtc` and
  `windowEndUtc`
- the route is forced onto `prerecorded` mode for this slice
- the route initializes paused at replay start with `60x`
- the first allowed multiplier set is `1x`, `10x`, `30x`, `60x`, `120x`
- Cesium's animation widget keeps those same shuttle-ring ticks
- Cesium's bottom timeline is zoomed to that same replay window
- reaching replay stop clamps and pauses
- the repo exposes
  `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeReplayTimeAuthority`
  only on that addressed route so smoke can prove reset and stop-boundary
  behavior without introducing a second timer

## Non-Goals And Not-Yet-Implemented

This contract does not currently include:

- satellite playback controls
- overlay-aware time coordination
- a repo-owned replacement for Cesium's native timeline
- scrubber widgets, transport buttons, or editable clip UI in the HUD
- fixture-driven timeline ingestion
- any Phase 4 satellite/runtime behavior

## Related

- [README.md](../../README.md)
- [Architecture](../architecture.md)
- [Delivery Phases](../delivery-phases.md)
- [ADR 0002: Viewer Strategy](../decisions/0002-viewer-strategy.md)
