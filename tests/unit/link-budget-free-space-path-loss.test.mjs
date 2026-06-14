// WS-E E1 numeric coverage for the free-space path-loss model.
// Standard: 3GPP TR 38.811 §6.6.2  FSPL_dB = 20log10(d_km) + 20log10(f_GHz) + 92.45.
// FSPL is a closed-form expression, so these goldens are computed independently
// here (not lifted from the module) — a genuine cross-check, not a tautology.
import test from "node:test";
import assert from "node:assert/strict";

import {
  computeFreeSpacePathLossDb,
  computeLeoKuFreeSpacePathLossDb,
  computeMeoLFreeSpacePathLossDb,
  computeGeoKaFreeSpacePathLossDb,
  computeOrbitClassFreeSpacePathLossDb,
  ORBIT_CLASS_CARRIER_DEFAULTS,
} from "../../src/runtime/link-budget/free-space-path-loss.ts";

const TOL = 1e-9;
const fsplExpected = (d, f) => 20 * Math.log10(d) + 20 * Math.log10(f) + 92.45;

test("FSPL matches the TR 38.811 §6.6.2 closed form", () => {
  for (const [d, f] of [[550, 12], [35786, 20], [23222, 1.5], [1, 1], [1200, 30]]) {
    assert.ok(
      Math.abs(computeFreeSpacePathLossDb({ slantRangeKm: d, carrierFrequencyGHz: f }) - fsplExpected(d, f)) < TOL,
      `FSPL(${d},${f})`,
    );
  }
});

test("FSPL sanity anchors reproduce the audited values", () => {
  // Audit reproductions: LEO 550 km @ 12 GHz ~= 168.8 dB, GEO 35786 km @ 20 GHz ~= 209.5 dB.
  assert.ok(Math.abs(computeFreeSpacePathLossDb({ slantRangeKm: 550, carrierFrequencyGHz: 12 }) - 168.840879) < 1e-5);
  assert.ok(Math.abs(computeFreeSpacePathLossDb({ slantRangeKm: 35786, carrierFrequencyGHz: 20 }) - 209.544863) < 1e-5);
});

test("orbit-class helpers apply the documented carrier defaults", () => {
  assert.ok(Math.abs(computeLeoKuFreeSpacePathLossDb({ slantRangeKm: 550 }) - fsplExpected(550, 12)) < TOL);
  assert.ok(Math.abs(computeMeoLFreeSpacePathLossDb({ slantRangeKm: 23222 }) - fsplExpected(23222, 1.5)) < TOL);
  assert.ok(Math.abs(computeGeoKaFreeSpacePathLossDb({ slantRangeKm: 35786 }) - fsplExpected(35786, 20)) < TOL);
  // explicit override beats the default
  assert.ok(Math.abs(computeLeoKuFreeSpacePathLossDb({ slantRangeKm: 550, carrierFrequencyGHz: 30 }) - fsplExpected(550, 30)) < TOL);
  assert.equal(ORBIT_CLASS_CARRIER_DEFAULTS.LEO.carrierFrequencyGHz, 12);
  assert.equal(ORBIT_CLASS_CARRIER_DEFAULTS.MEO.carrierFrequencyGHz, 1.5);
  assert.equal(ORBIT_CLASS_CARRIER_DEFAULTS.GEO.carrierFrequencyGHz, 20);
});

test("FSPL is monotonic in range and frequency (+6 dB per doubling)", () => {
  const base = computeFreeSpacePathLossDb({ slantRangeKm: 1000, carrierFrequencyGHz: 10 });
  const doubleRange = computeFreeSpacePathLossDb({ slantRangeKm: 2000, carrierFrequencyGHz: 10 });
  const doubleFreq = computeFreeSpacePathLossDb({ slantRangeKm: 1000, carrierFrequencyGHz: 20 });
  assert.ok(Math.abs(doubleRange - base - 20 * Math.log10(2)) < TOL);
  assert.ok(Math.abs(doubleFreq - base - 20 * Math.log10(2)) < TOL);
});

test("non-positive / non-finite inputs throw RangeError", () => {
  assert.throws(() => computeFreeSpacePathLossDb({ slantRangeKm: 0, carrierFrequencyGHz: 12 }), RangeError);
  assert.throws(() => computeFreeSpacePathLossDb({ slantRangeKm: -5, carrierFrequencyGHz: 12 }), RangeError);
  assert.throws(() => computeFreeSpacePathLossDb({ slantRangeKm: 550, carrierFrequencyGHz: 0 }), RangeError);
  assert.throws(() => computeFreeSpacePathLossDb({ slantRangeKm: Number.NaN, carrierFrequencyGHz: 12 }), RangeError);
  assert.throws(() => computeOrbitClassFreeSpacePathLossDb("LEO", { slantRangeKm: Number.POSITIVE_INFINITY }), RangeError);
});
