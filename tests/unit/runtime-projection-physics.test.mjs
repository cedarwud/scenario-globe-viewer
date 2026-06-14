// WS-E E1 numeric coverage for the runtime-projection link-budget integration
// (computeLinkBudgetMetricsForOrbit) — the one exported physics entry point that
// composes slant-range geometry, FSPL, gas, rain and the antenna proxy into the
// latency / jitter / throughput the side panel renders.
//
// The slant-range geometry (TR 38.811 §6.6.2 spherical-earth) is closed-form, so
// the one-way-delay golden is derived independently here from the published
// formula and the documented nominal class altitudes.
import test from "node:test";
import assert from "node:assert/strict";

import { computeLinkBudgetMetricsForOrbit } from "../../src/features/multi-station-selector/runtime-projection.ts";

const EARTH_RADIUS_KM = 6371;
const C_KM_S = 299_792.458;
const PROCESSING_DELAY_MS = 2;
const NOMINAL_ALT = { LEO: 550, MEO: 23222, GEO: 35786 };
const BASELINE_JITTER = { LEO: 3, MEO: 5, GEO: 8 };

function expectedSlantKm(orbit, elevationDeg) {
  const R = EARTH_RADIUS_KM + NOMINAL_ALT[orbit];
  const e = (elevationDeg * Math.PI) / 180;
  return Math.sqrt(R * R - (EARTH_RADIUS_KM * Math.cos(e)) ** 2) - EARTH_RADIUS_KM * Math.sin(e);
}

test("one-way delay equals slantRange/c + 2 ms processing for each orbit class", () => {
  for (const orbit of ["LEO", "MEO", "GEO"]) {
    const m = computeLinkBudgetMetricsForOrbit(orbit, { representativeElevationDeg: 35, rainRateMmPerHour: 0 });
    const expectedLatency = (expectedSlantKm(orbit, 35) / C_KM_S) * 1000 + PROCESSING_DELAY_MS;
    assert.ok(Math.abs(m.latencyMs - expectedLatency) < 5e-3, `${orbit} latency ${m.latencyMs} vs ${expectedLatency}`);
  }
});

test("delay ordering reflects orbit altitude (LEO < MEO < GEO)", () => {
  const leo = computeLinkBudgetMetricsForOrbit("LEO", { representativeElevationDeg: 35 });
  const meo = computeLinkBudgetMetricsForOrbit("MEO", { representativeElevationDeg: 35 });
  const geo = computeLinkBudgetMetricsForOrbit("GEO", { representativeElevationDeg: 35 });
  assert.ok(leo.latencyMs < meo.latencyMs && meo.latencyMs < geo.latencyMs);
  // audited anchors
  assert.ok(Math.abs(leo.latencyMs - 4.974) < 0.01);
  assert.ok(Math.abs(geo.latencyMs - 129.35) < 0.05);
});

test("clear-sky jitter is the per-orbit baseline; rain inflates it up to the 4x cap", () => {
  // clear == baseline is a deliberate regression-lock on the per-orbit constant.
  for (const orbit of ["LEO", "MEO", "GEO"]) {
    const clear = computeLinkBudgetMetricsForOrbit(orbit, { representativeElevationDeg: 35, rainRateMmPerHour: 0 });
    assert.equal(clear.jitterMs, BASELINE_JITTER[orbit]);
  }
  // jitterScale = 1 + min(rainAtten/20, 3), so jitter is bounded to baseline x [1, 4].
  const rainy = computeLinkBudgetMetricsForOrbit("GEO", { representativeElevationDeg: 45, rainRateMmPerHour: 50 });
  assert.ok(rainy.jitterMs > BASELINE_JITTER.GEO, "rain should inflate jitter above the baseline");
  assert.ok(rainy.jitterMs <= BASELINE_JITTER.GEO * 4 + 1e-9, "jitter scale is capped at 4x baseline");
});

test("throughput proxy is the audited value, de-rates under rain, and stays strictly below the reference cap", () => {
  const clear = computeLinkBudgetMetricsForOrbit("GEO", { representativeElevationDeg: 35, rainRateMmPerHour: 0 });
  // Audited regression-lock: GEO el35 clear sky -> 44.009 Mbps proxy (reference 50, de-rated by
  // gas + antenna off-axis loss). A change to the 50 Mbps reference constant would break this.
  assert.ok(Math.abs(clear.networkSpeedMbps - 44.009) < 0.05, `expected ~44.009, got ${clear.networkSpeedMbps}`);
  // strictly below the 50 Mbps clear-sky reference (gas + antenna loss always de-rate it).
  assert.ok(clear.networkSpeedMbps < 50, "clear-sky proxy must be strictly below the 50 Mbps reference");
  const rainy = computeLinkBudgetMetricsForOrbit("GEO", { representativeElevationDeg: 35, rainRateMmPerHour: 50 });
  assert.ok(rainy.networkSpeedMbps < clear.networkSpeedMbps, "rain must reduce the throughput proxy");
  assert.ok(rainy.networkSpeedMbps >= 0.1, "throughput proxy floored at MIN_NETWORK_SPEED_MBPS");
});

test("throughput proxy never drops below the documented floor under extreme fade", () => {
  const extreme = computeLinkBudgetMetricsForOrbit("GEO", { representativeElevationDeg: 5, rainRateMmPerHour: 150 });
  assert.ok(extreme.networkSpeedMbps >= 0.1);
});

test("missing elevation falls back to the representative default without throwing", () => {
  const m = computeLinkBudgetMetricsForOrbit("LEO", {});
  assert.ok(Number.isFinite(m.latencyMs) && Number.isFinite(m.jitterMs) && Number.isFinite(m.networkSpeedMbps));
});

// --- WS-F coverage -----------------------------------------------------------
// The goldens above (4.974 / 129.35 / 44.009) intentionally pin the NOMINAL
// closed form: the calls omit satelliteRadiusKm, so the slant-range geometry
// falls back to Re + nominal class altitude. WS-F adds an OPTIONAL propagated
// geocentric radius (F1) and per-station rain endpoints (F3); these tests cover
// those new inputs without disturbing the nominal-fallback regression locks.

test("F1: supplying the SGP4-propagated geocentric radius drives slant range / one-way delay", () => {
  const radiusKm = EARTH_RADIUS_KM + 1200; // a non-nominal LEO altitude (550 nominal)
  const m = computeLinkBudgetMetricsForOrbit("LEO", {
    representativeElevationDeg: 35,
    rainRateMmPerHour: 0,
    satelliteRadiusKm: radiusKm,
  });
  const e = (35 * Math.PI) / 180;
  const expectedSlant = Math.sqrt(radiusKm * radiusKm - (EARTH_RADIUS_KM * Math.cos(e)) ** 2) - EARTH_RADIUS_KM * Math.sin(e);
  const expectedLatency = (expectedSlant / C_KM_S) * 1000 + PROCESSING_DELAY_MS;
  assert.ok(Math.abs(m.latencyMs - expectedLatency) < 5e-3, `propagated-radius latency ${m.latencyMs} vs ${expectedLatency}`);
  const nominal = computeLinkBudgetMetricsForOrbit("LEO", { representativeElevationDeg: 35 });
  assert.ok(m.latencyMs > nominal.latencyMs, "a 1200 km satellite is farther than the 550 km nominal LEO");
});

test("F1: a radius at or below Earth radius is ignored and the nominal altitude is used", () => {
  const nominal = computeLinkBudgetMetricsForOrbit("LEO", { representativeElevationDeg: 35 });
  const ignored = computeLinkBudgetMetricsForOrbit("LEO", { representativeElevationDeg: 35, satelliteRadiusKm: 1000 });
  assert.equal(ignored.latencyMs, nominal.latencyMs);
});

test("F3: per-station rain endpoints bind to the worse (more-attenuated) station", () => {
  const base = { representativeElevationDeg: 30, rainRateMmPerHour: 50, stationHeightAboveSeaKm: 0 };
  const tropical = computeLinkBudgetMetricsForOrbit("GEO", { ...base, stationLatitudeDeg: 0 });
  const polar = computeLinkBudgetMetricsForOrbit("GEO", { ...base, stationLatitudeDeg: 60 });
  // The two latitudes must produce a genuinely different rain attenuation, else
  // the binding test would be vacuous.
  assert.notEqual(tropical.networkSpeedMbps, polar.networkSpeedMbps);
  const worseThroughput = Math.min(tropical.networkSpeedMbps, polar.networkSpeedMbps);
  const bound = computeLinkBudgetMetricsForOrbit("GEO", {
    ...base,
    rainEndpoints: [
      { stationLabel: "A", latitudeDeg: 0, heightAboveSeaKm: 0, elevationDeg: 30 },
      { stationLabel: "B", latitudeDeg: 60, heightAboveSeaKm: 0, elevationDeg: 30 },
    ],
  });
  assert.ok(
    Math.abs(bound.networkSpeedMbps - worseThroughput) < 1e-9,
    `binding endpoint throughput ${bound.networkSpeedMbps} should equal the worse single-station ${worseThroughput}`,
  );
  // Clear sky with endpoints: no rain -> back to the clear-sky proxy.
  const clearBound = computeLinkBudgetMetricsForOrbit("GEO", {
    representativeElevationDeg: 30,
    rainRateMmPerHour: 0,
    rainEndpoints: [
      { stationLabel: "A", latitudeDeg: 0, heightAboveSeaKm: 0, elevationDeg: 30 },
      { stationLabel: "B", latitudeDeg: 60, heightAboveSeaKm: 0, elevationDeg: 30 },
    ],
  });
  assert.ok(clearBound.networkSpeedMbps > bound.networkSpeedMbps, "rain must reduce throughput below clear sky");
});
