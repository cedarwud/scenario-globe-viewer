// WS-E E1 numeric coverage for the ITU-R P.676-13 gaseous-absorption model.
// The line-by-line oxygen/water-vapour sum is not hand-closed-form, so the
// clear-sky magnitude golden is a regression lock anchored to the audit's
// reproduced value; the behavioural assertions (oxygen 60 GHz band dominance,
// elevation/path-length scaling, default atmosphere) are physical properties.
import test from "node:test";
import assert from "node:assert/strict";

import { computeGasAbsorptionDb, GAS_ABSORPTION_DEFAULTS } from "../../src/runtime/link-budget/gas-absorption.ts";

const near = (a, b, tol) => Math.abs(a - b) <= tol;

test("clear-sky slant absorption at 20 GHz / 30 deg matches the audited ~0.5 dB", () => {
  assert.ok(near(computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 30 }), 0.538251, 1e-4));
});

test("the 60 GHz oxygen band is far stronger than the 20 GHz window", () => {
  const window20 = computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 30 });
  const oxygenBand60 = computeGasAbsorptionDb({ carrierFrequencyGHz: 60, elevationDeg: 30 });
  assert.ok(oxygenBand60 > 50, `60 GHz oxygen band ${oxygenBand60} dB should be tens of dB`);
  assert.ok(oxygenBand60 > 50 * window20, "oxygen band must dominate the window frequency");
});

test("lower elevation -> longer slant path -> more absorption (1/sin scaling)", () => {
  const high = computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 90 });
  const mid = computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 30 });
  const low = computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 10 });
  assert.ok(low > mid && mid > high, `expected low(${low}) > mid(${mid}) > high(${high})`);
  // zenith vs 30 deg should scale roughly by 1/sin(30) = 2x (path-length geometry).
  assert.ok(near(mid / high, 1 / Math.sin((30 * Math.PI) / 180), 0.05));
});

test("default standard atmosphere is P.835 surface values", () => {
  assert.equal(GAS_ABSORPTION_DEFAULTS.surfacePressureHPa, 1013.25);
  assert.equal(GAS_ABSORPTION_DEFAULTS.surfaceTemperatureC, 15);
  assert.equal(GAS_ABSORPTION_DEFAULTS.surfaceWaterVaporDensityGM3, 7.5);
  // passing the defaults explicitly equals omitting them
  assert.equal(
    computeGasAbsorptionDb({ carrierFrequencyGHz: 12, elevationDeg: 35 }),
    computeGasAbsorptionDb({ carrierFrequencyGHz: 12, elevationDeg: 35, ...GAS_ABSORPTION_DEFAULTS }),
  );
});

test("drier air reduces water-vapour absorption", () => {
  const humid = computeGasAbsorptionDb({ carrierFrequencyGHz: 22, elevationDeg: 30, surfaceWaterVaporDensityGM3: 15 });
  const dry = computeGasAbsorptionDb({ carrierFrequencyGHz: 22, elevationDeg: 30, surfaceWaterVaporDensityGM3: 1 });
  assert.ok(humid > dry, "near the 22 GHz water line, humid air should absorb more");
});

test("invalid inputs throw RangeError", () => {
  assert.throws(() => computeGasAbsorptionDb({ carrierFrequencyGHz: 0.5, elevationDeg: 30 }), RangeError);
  assert.throws(() => computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 0 }), RangeError);
  assert.throws(() => computeGasAbsorptionDb({ carrierFrequencyGHz: 20, elevationDeg: 30, surfacePressureHPa: -1 }), RangeError);
});
