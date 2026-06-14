// WS-E E1 numeric coverage for the 3GPP TR 38.821 §7.3 handover policy engine
// (incl. the V-MO1 cross-orbit-live addendum). Deterministic, pure selection.
import test from "node:test";
import assert from "node:assert/strict";

import { evaluateHandoverPolicy } from "../../src/runtime/link-budget/handover-policy.ts";

const cand = (o) => ({
  id: o.id,
  orbitClass: o.orbitClass,
  elevationDeg: o.elevationDeg,
  rsrpDbm: o.rsrpDbm,
  predictedVisibilityRemainingMs: o.predictedVisibilityRemainingMs ?? 300_000,
  latencyMs: o.latencyMs ?? 30,
  jitterMs: o.jitterMs ?? 3,
});

const policy = (o) => ({
  policyId: o.policyId,
  elevationThresholdDeg: o.elevationThresholdDeg ?? 10,
  hysteresisDb: o.hysteresisDb ?? 2,
  minVisibilityWindowMs: o.minVisibilityWindowMs ?? 60_000,
  latencyBudgetMs: o.latencyBudgetMs,
});

test("cross-orbit-live migrates off a fading LEO to a clearing MEO (V-MO1)", () => {
  const decision = evaluateHandoverPolicy({
    candidates: [
      cand({ id: "leo-low", orbitClass: "LEO", elevationDeg: 8, rsrpDbm: -95, predictedVisibilityRemainingMs: 120_000, latencyMs: 30 }),
      cand({ id: "meo-mid", orbitClass: "MEO", elevationDeg: 30, rsrpDbm: -90, predictedVisibilityRemainingMs: 600_000, latencyMs: 120 }),
    ],
    currentServingId: "leo-low",
    policy: policy({ policyId: "cross-orbit-live" }),
  });
  assert.equal(decision.selectedId, "meo-mid");
  assert.equal(decision.reasonKind, "cross-orbit-migration");
});

test("cross-orbit-live keeps a healthy LEO when one still clears thresholds", () => {
  const decision = evaluateHandoverPolicy({
    candidates: [
      cand({ id: "leo-good", orbitClass: "LEO", elevationDeg: 55, rsrpDbm: -85 }),
      cand({ id: "meo-mid", orbitClass: "MEO", elevationDeg: 40, rsrpDbm: -88 }),
    ],
    currentServingId: "leo-good",
    policy: policy({ policyId: "cross-orbit-live" }),
  });
  assert.equal(decision.selectedId, "leo-good");
});

test("leo-first prefers a threshold-clearing LEO over a higher-scoring MEO", () => {
  const decision = evaluateHandoverPolicy({
    candidates: [
      cand({ id: "leo", orbitClass: "LEO", elevationDeg: 25, rsrpDbm: -92 }),
      cand({ id: "meo", orbitClass: "MEO", elevationDeg: 85, rsrpDbm: -80 }),
    ],
    policy: policy({ policyId: "leo-first" }),
  });
  assert.equal(decision.selectedId, "leo");
});

test("balanced policy switches to a clearly better candidate past hysteresis", () => {
  const decision = evaluateHandoverPolicy({
    candidates: [
      cand({ id: "cur", orbitClass: "LEO", elevationDeg: 20, rsrpDbm: -100 }),
      cand({ id: "better", orbitClass: "LEO", elevationDeg: 70, rsrpDbm: -80 }),
    ],
    currentServingId: "cur",
    policy: policy({ policyId: "bootstrap-balanced-v1", hysteresisDb: 3 }),
  });
  assert.equal(decision.selectedId, "better");
  assert.equal(decision.reasonKind, "better-candidate-available");
});

test("balanced policy holds current on a tie inside the hysteresis margin", () => {
  const decision = evaluateHandoverPolicy({
    candidates: [
      cand({ id: "cur", orbitClass: "LEO", elevationDeg: 40, rsrpDbm: -85 }),
      cand({ id: "alt", orbitClass: "LEO", elevationDeg: 41, rsrpDbm: -84 }),
    ],
    currentServingId: "cur",
    policy: policy({ policyId: "bootstrap-balanced-v1", hysteresisDb: 6 }),
  });
  assert.equal(decision.selectedId, "cur");
  assert.equal(decision.reasonKind, "policy-tie-break");
});

test("scoring is deterministic and weights sum the documented components", () => {
  const input = {
    candidates: [cand({ id: "a", orbitClass: "LEO", elevationDeg: 45, rsrpDbm: -90 })],
    policy: policy({ policyId: "demo-balanced-v1" }),
  };
  const first = evaluateHandoverPolicy(input);
  const second = evaluateHandoverPolicy(input);
  assert.deepEqual(first.scoreBreakdown, second.scoreBreakdown);
  const { score, components } = first.scoreBreakdown[0];
  const recombined =
    components.elevation * 0.38 + components.visibility * 0.28 + components.latency * 0.24 + components.jitter * 0.1;
  assert.ok(Math.abs(score - recombined) < 1e-6);
  // Component normalizers themselves: elevation = clamp(elevationDeg/90) -> 45 deg = 0.5.
  assert.ok(Math.abs(components.elevation - 45 / 90) < 1e-6, "elevation component should normalize to 0.5 at 45 deg");
});

test("invalid handover inputs throw RangeError", () => {
  assert.throws(() => evaluateHandoverPolicy({ candidates: [], policy: policy({ policyId: "leo-first" }) }), RangeError);
  assert.throws(() => evaluateHandoverPolicy({
    candidates: [cand({ id: "a", orbitClass: "LEO", elevationDeg: 45, rsrpDbm: -90 })],
    policy: policy({ policyId: "not-a-policy" }),
  }), RangeError);
  assert.throws(() => evaluateHandoverPolicy({
    candidates: [cand({ id: "", orbitClass: "LEO", elevationDeg: 45, rsrpDbm: -90 })],
    policy: policy({ policyId: "leo-first" }),
  }), RangeError);
});
