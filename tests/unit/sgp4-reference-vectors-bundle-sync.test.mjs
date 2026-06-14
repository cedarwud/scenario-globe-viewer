// WS-G drift guard: the in-app SGP4 reference mirror
// (src/features/multi-station-selector/sgp4-reference-vectors.ts) must stay
// byte-equivalent to the committed golden (tests/golden/sgp4-reference-vectors.json).
// Both are emitted by scripts/gen-sgp4-reference-vectors.py; this catches a
// hand-edit or a stale regeneration of one but not the other.
import test from "node:test";
import assert from "node:assert/strict";

import golden from "../golden/sgp4-reference-vectors.json" with { type: "json" };
import { SGP4_REFERENCE_VECTORS } from "../../src/features/multi-station-selector/sgp4-reference-vectors.ts";

test("in-app mirror matches the golden reference block", () => {
  assert.deepEqual(SGP4_REFERENCE_VECTORS.reference, golden.reference);
  assert.equal(SGP4_REFERENCE_VECTORS.toleranceKm, golden.toleranceKm);
});

test("in-app mirror matches the golden samples exactly", () => {
  assert.equal(SGP4_REFERENCE_VECTORS.samples.length, golden.samples.length);
  for (let i = 0; i < golden.samples.length; i += 1) {
    const g = golden.samples[i];
    const m = SGP4_REFERENCE_VECTORS.samples[i];
    assert.deepEqual(
      {
        label: m.label, orbitClass: m.orbitClass, noradId: m.noradId,
        line1: m.line1, line2: m.line2, timeUtc: m.timeUtc,
        positionEciKm: m.positionEciKm, velocityEciKmPerSec: m.velocityEciKmPerSec,
      },
      {
        label: g.label, orbitClass: g.orbitClass, noradId: g.noradId,
        line1: g.line1, line2: g.line2, timeUtc: g.timeUtc,
        positionEciKm: g.positionEciKm, velocityEciKmPerSec: g.velocityEciKmPerSec,
      },
      `sample ${i} (${g.label} @ ${g.timeUtc}) drifted`,
    );
  }
});
