import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicFixturePath = new URL(
  "../public/fixtures/satellites/walker-o6-s3-i45-h698.tle",
  import.meta.url
);
const publicContractPath = new URL(
  "../src/features/satellites/adapter.ts",
  import.meta.url
);
const walkerAdapterPath = new URL(
  "../src/features/satellites/walker-fixture-adapter.ts",
  import.meta.url
);
const overlayManagerPath = new URL(
  "../src/features/overlays/overlay-manager.ts",
  import.meta.url
);
const mainPath = new URL("../src/main.ts", import.meta.url);
const WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET = 49;

const [
  { createWalkerFixtureAdapter, DEFAULT_WALKER_TLE_EPOCH_MODE },
  fixtureText,
  publicContractSource,
  walkerAdapterSource,
  overlayManagerSource,
  mainSource
] = await Promise.all([
  import(walkerAdapterPath),
  readFile(publicFixturePath, "utf8"),
  readFile(publicContractPath, "utf8"),
  readFile(walkerAdapterPath, "utf8"),
  readFile(overlayManagerPath, "utf8"),
  readFile(mainPath, "utf8")
]);

class FakeReplayClock {
  #state;
  #listeners = new Set();

  constructor(currentTime) {
    this.#state = {
      mode: "real-time",
      currentTime,
      startTime: "2026-04-17T12:00:00.000Z",
      stopTime: "2026-04-17T12:10:00.000Z",
      multiplier: 1,
      isPlaying: true
    };
  }

  getState() {
    return { ...this.#state };
  }

  play() {
    this.#state = {
      ...this.#state,
      isPlaying: true
    };
  }

  pause() {
    this.#state = {
      ...this.#state,
      isPlaying: false
    };
  }

  setMultiplier(multiplier) {
    this.#state = {
      ...this.#state,
      multiplier
    };
  }

  seek(currentTime) {
    this.#state = {
      ...this.#state,
      currentTime
    };
  }

  setMode(mode, range) {
    this.#state = {
      ...this.#state,
      mode,
      startTime: range?.start ?? this.#state.startTime,
      stopTime: range?.stop ?? this.#state.stopTime
    };
  }

  onTick(listener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  tickTo(currentTime) {
    this.seek(currentTime);
    const state = this.getState();
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}

function assertFiniteVector(label, value) {
  assert.equal(typeof value.x, "number", `${label} x must be numeric.`);
  assert.equal(typeof value.y, "number", `${label} y must be numeric.`);
  assert.equal(typeof value.z, "number", `${label} z must be numeric.`);
  assert(Number.isFinite(value.x), `${label} x must be finite.`);
  assert(Number.isFinite(value.y), `${label} y must be finite.`);
  assert(Number.isFinite(value.z), `${label} z must be finite.`);
}

assert.equal(
  DEFAULT_WALKER_TLE_EPOCH_MODE,
  "relative-to-now",
  "Phase 4.1 must keep the repo-owned walker smoke default on relative-to-now."
);
assert(
  walkerAdapterSource.includes('from "satellite.js"'),
  "Concrete walker adapter must keep propagation inside the adapter seam."
);
assert(
  walkerAdapterSource.includes("propagate(") &&
    walkerAdapterSource.includes("eciToEcf("),
  "Concrete walker adapter must keep propagation and frame conversion inside the adapter seam."
);
assert(
  !publicContractSource.includes('from "satellite.js"'),
  "Public satellite contract must stay free of concrete propagation dependencies."
);
assert(
  !overlayManagerSource.includes("walker-fixture-adapter"),
  "Overlay manager must not import or mention the concrete walker adapter."
);
assert(
  !/\bfeatures\/satellites\b/.test(mainSource) &&
    !mainSource.includes("walker-fixture-adapter"),
  "src/main.ts must stay free of Phase 4.1 satellite wiring."
);

const relativeClock = new FakeReplayClock("2026-04-17T12:00:00.000Z");
const relativeAdapter = createWalkerFixtureAdapter();
relativeAdapter.attachToClock(relativeClock);

const relativeLoadResult = await relativeAdapter.loadFixture({
  kind: "tle",
  tleText: fixtureText
});
assert.equal(relativeLoadResult.satCount, 18, "Copied walker fixture must ingest 18 satellites.");

const relativeState = relativeAdapter.getIngestionState();
assert.equal(
  relativeState.epochModeUsed,
  "relative-to-now",
  "Default walker ingestion must use relative-to-now."
);
assert.equal(relativeState.sampleTime, "2026-04-17T12:00:00.000Z");
assert.equal(relativeState.clockAnchorTime, "2026-04-17T12:00:00.000Z");
assert.match(
  relativeState.propagationTime ?? "",
  /^2014-/u,
  "Relative-to-now should anchor the walker fixture epoch rather than propagating to literal wall-clock now."
);

const relativeSamples = relativeAdapter.getCurrentSamples();
assert.equal(relativeSamples.length, 18, "Relative-mode ingestion must retain all walker satellites.");
for (const [index, sample] of relativeSamples.entries()) {
  assert.equal(
    sample.time,
    "2026-04-17T12:00:00.000Z",
    `Relative sample ${index} must stay on the replay-clock time.`
  );
  assertFiniteVector(`Relative sample ${index} positionEcef`, sample.positionEcef);
}

const boundedOrbitTracks = relativeAdapter.sampleOrbitTracks(
  "2026-04-17T12:00:00.000Z",
  9
);
assert.equal(
  boundedOrbitTracks.length,
  18,
  "Concrete walker adapter must expose bounded orbit sampling without widening the public contract."
);
for (const [index, track] of boundedOrbitTracks.entries()) {
  assert.equal(
    track.positionsEcef.length,
    9,
    `Bounded orbit track ${index} must honor the requested local sample count.`
  );
  for (const [positionIndex, position] of track.positionsEcef.entries()) {
    assertFiniteVector(
      `Bounded orbit track ${index} position ${positionIndex}`,
      position
    );
  }
}

const maxBudgetOrbitTracks = relativeAdapter.sampleOrbitTracks(
  "2026-04-17T12:00:00.000Z",
  WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET
);
assert.equal(
  maxBudgetOrbitTracks.length,
  18,
  "Concrete walker adapter must keep the fixed Phase 5.3 orbit sample budget available without widening the public contract."
);
for (const [index, track] of maxBudgetOrbitTracks.entries()) {
  assert.equal(
    track.positionsEcef.length,
    WALKER_ORBIT_POLYLINE_SAMPLE_BUDGET,
    `Fixed-budget orbit track ${index} must honor the full local sample budget.`
  );
}
assert.throws(
  () => relativeAdapter.sampleOrbitTracks("2026-04-17T12:00:00.000Z", 1),
  /sampleCount >= 2/u,
  "Walker orbit sampling must reject invalid unbounded-or-empty sample requests."
);

const initialPropagationTime = Date.parse(relativeState.propagationTime);
relativeClock.tickTo("2026-04-17T12:01:00.000Z");

const relativeTickState = relativeAdapter.getIngestionState();
assert.equal(relativeTickState.sampleTime, "2026-04-17T12:01:00.000Z");
assert.equal(
  Date.parse(relativeTickState.propagationTime) - initialPropagationTime,
  60_000,
  "Relative-to-now resampling must advance propagation in lockstep with replay-clock time."
);
for (const [index, sample] of relativeAdapter.getCurrentSamples().entries()) {
  assert.equal(
    sample.time,
    "2026-04-17T12:01:00.000Z",
    `Relative tick sample ${index} must refresh to the new replay-clock time.`
  );
}

const absoluteClock = new FakeReplayClock("2026-04-17T12:02:00.000Z");
const absoluteAdapter = createWalkerFixtureAdapter();
absoluteAdapter.attachToClock(absoluteClock);

const absoluteLoadResult = await absoluteAdapter.loadFixture({
  kind: "tle",
  tleText: fixtureText,
  epochMode: "absolute"
});
assert.equal(absoluteLoadResult.satCount, 18);

const absoluteState = absoluteAdapter.getIngestionState();
assert.equal(absoluteState.epochModeUsed, "absolute");
assert.equal(absoluteState.sampleTime, "2026-04-17T12:02:00.000Z");
assert.equal(
  absoluteState.propagationTime,
  "2026-04-17T12:02:00.000Z",
  "Absolute mode must propagate against the supplied replay-clock time directly."
);

await relativeAdapter.dispose();
await absoluteAdapter.dispose();

assert.equal(relativeAdapter.getCurrentSamples().length, 0, "dispose() must clear relative samples.");
assert.equal(absoluteAdapter.getCurrentSamples().length, 0, "dispose() must clear absolute samples.");
assert.equal(
  relativeAdapter.getIngestionState().clockAttached,
  false,
  "dispose() must release the attached clock."
);

console.log("Phase 4.1 walker fixture adapter verification passed.");
