import { test } from "node:test";
import { strict as assert } from "node:assert";

import {
  PUBLIC_REGISTRY_BY_ID,
  inferPairSourceTier
} from "../../src/features/multi-station-selector/tier-inference.ts";

function station(id) {
  const value = PUBLIC_REGISTRY_BY_ID.get(id);
  assert(value, `missing registry station ${id}`);
  return value;
}

test("same operator family without pair attestation narrows to geometric-derived", () => {
  const attribution = inferPairSourceTier(
    station("ksat-svalsat-svalbard"),
    station("ksat-tromso")
  );

  assert.equal(attribution.sourceTier, "geometric-derived");
  assert.equal(attribution.evidenceKind, "same-operator-family-inferred");
  assert.match(attribution.badgeLabel, /no pair attestation/i);
  assert(
    attribution.nonClaims.some((claim) =>
      claim.includes("not pair-level routing")
    )
  );
});

test("explicit pair attestation gates public-disclosed compatibility tier", () => {
  const attribution = inferPairSourceTier(
    station("ksat-svalsat-svalbard"),
    station("ksat-tromso"),
    [
      {
        stationAId: "ksat-tromso",
        stationBId: "ksat-svalsat-svalbard",
        sourceUrl: "https://example.invalid/pair-attestation"
      }
    ]
  );

  assert.equal(attribution.sourceTier, "public-disclosed");
  assert.equal(attribution.evidenceKind, "explicit-pair-attestation");
});

test("malformed pair attestation rows are ignored", () => {
  const attribution = inferPairSourceTier(
    station("ksat-svalsat-svalbard"),
    station("ksat-tromso"),
    [
      null,
      {},
      { stationAId: "", stationBId: "ksat-tromso" },
      { stationAId: "ksat-svalsat-svalbard" },
      {
        stationAId: "ksat-svalsat-svalbard",
        stationBId: "ksat-tromso"
      }
    ]
  );

  assert.equal(attribution.sourceTier, "public-disclosed");
  assert.equal(attribution.evidenceKind, "explicit-pair-attestation");
});

test("cross-family pair remains geometric-derived", () => {
  const attribution = inferPairSourceTier(
    station("singtel-bukit-timah"),
    station("measat-cyberjaya")
  );

  assert.equal(attribution.sourceTier, "geometric-derived");
  assert.equal(attribution.evidenceKind, "cross-family-geometric");
});
