// WS-E E1 numeric coverage for the ITU-R S.1528-0 / S.465-6 antenna patterns.
// The S.465-6 roll-off (32 - 25 log10(phi)) and the S.1528 parabolic main lobe
// (Gm - 3*(psi/psi_b)^2) are closed-form, so those goldens are computed
// independently here.
import test from "node:test";
import assert from "node:assert/strict";

import {
  computeSatelliteAntennaGainDb,
  computeEarthStationAntennaGainDb,
} from "../../src/runtime/link-budget/antenna-pattern.ts";

const near = (a, b, tol) => Math.abs(a - b) <= tol;

test("S.1528-A main lobe follows Gm - 3*(psi/psi_b)^2 near boresight", () => {
  const peak = 35;
  const beamwidth = 3.2; // psi_b = 1.6 deg
  assert.equal(computeSatelliteAntennaGainDb({ peakGainDb: peak, beamwidthDeg: beamwidth, offAxisAngleDeg: 0 }), peak);
  // at psi = psi_b (1.6 deg), normalized = 1 -> Gm - 3.
  assert.ok(near(
    computeSatelliteAntennaGainDb({ peakGainDb: peak, beamwidthDeg: beamwidth, offAxisAngleDeg: 1.6 }),
    peak - 3, 1e-9,
  ));
});

test("S.1528-A reaches its 5 dBi floor near 20.4 deg (sanity comment)", () => {
  const g = computeSatelliteAntennaGainDb({ peakGainDb: 35, beamwidthDeg: 3.2, offAxisAngleDeg: 20.4 });
  assert.ok(near(g, 5, 0.05), `expected ~5 dBi floor, got ${g}`);
  // well past the floor angle it sits exactly on the floor
  assert.equal(computeSatelliteAntennaGainDb({ peakGainDb: 35, beamwidthDeg: 3.2, offAxisAngleDeg: 90 }), 5);
});

test("S.465-6 earth-station roll-off boundaries", () => {
  const common = { peakGainDb: 40, antennaDiameterM: 2.4, carrierFrequencyGHz: 12 };
  assert.equal(computeEarthStationAntennaGainDb({ ...common, offAxisAngleDeg: 0.5 }), 40); // < 1 deg -> peak
  assert.ok(near(computeEarthStationAntennaGainDb({ ...common, offAxisAngleDeg: 1 }), 32, 1e-9)); // 32 - 25log10(1)
  assert.ok(near(computeEarthStationAntennaGainDb({ ...common, offAxisAngleDeg: 10 }), 32 - 25, 1e-9)); // 32 - 25log10(10)=7
  assert.equal(computeEarthStationAntennaGainDb({ ...common, offAxisAngleDeg: 60 }), -10); // > 48 deg floor
});

test("S.1528 gain is monotonically non-increasing with off-axis angle", () => {
  let prev = Infinity;
  for (const phi of [0, 0.5, 1, 1.6, 3, 6, 12, 20.4, 45, 90]) {
    const g = computeSatelliteAntennaGainDb({ peakGainDb: 35, beamwidthDeg: 3.2, offAxisAngleDeg: phi });
    assert.ok(g <= prev + 1e-9, `gain rose at ${phi} deg (${g} > ${prev})`);
    prev = g;
  }
});

test("invalid antenna inputs throw RangeError", () => {
  assert.throws(() => computeSatelliteAntennaGainDb({ peakGainDb: 35, beamwidthDeg: Number.NaN, offAxisAngleDeg: 1 }), RangeError);
  assert.throws(() => computeSatelliteAntennaGainDb({ peakGainDb: 35, beamwidthDeg: 3.2, offAxisAngleDeg: 200 }), RangeError);
  assert.throws(() => computeEarthStationAntennaGainDb({ peakGainDb: 20, offAxisAngleDeg: 5, antennaDiameterM: 2.4, carrierFrequencyGHz: 12 }), RangeError); // peak < 32
  assert.throws(() => computeEarthStationAntennaGainDb({ peakGainDb: 40, offAxisAngleDeg: 5, antennaDiameterM: 2.4, carrierFrequencyGHz: 40 }), RangeError); // freq out of 2-31 GHz
});
