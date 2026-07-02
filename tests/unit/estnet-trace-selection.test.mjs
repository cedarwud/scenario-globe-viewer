import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

import {
  computeModelOverlay,
  pairCompatibilityDisclosure,
  selectManifestEntryForRoute
} from "../../src/features/multi-station-selector/estnet-trace-panel-section.ts";

const realManifest = JSON.parse(
  readFileSync(
    new URL("../../public/fixtures/estnet/manifest.json", import.meta.url),
    "utf8"
  )
);
const handoverTrace = JSON.parse(
  readFileSync(
    new URL(
      "../../public/fixtures/estnet/cht-sansa-handover-packet-trace.json",
      import.meta.url
    ),
    "utf8"
  )
);
const pingTrace = JSON.parse(
  readFileSync(
    new URL(
      "../../public/fixtures/estnet/loopback-ping-packet-trace.json",
      import.meta.url
    ),
    "utf8"
  )
);

const SANSA_ROUTE = {
  stationAId: "cht-yangmingshan",
  stationBId: "sansa-hartebeesthoek"
};
const DOMESTIC_ROUTE = {
  stationAId: "cht-yangmingshan",
  stationBId: "cht-fangshan"
};
const UNKNOWN_ROUTE = { stationAId: null, stationBId: null };

test("route pre-selection on the REAL manifest: same-pair trace wins over global default", () => {
  // CHT x SANSA carries TWO manifest traces (handover default:true + geo) —
  // the default:true one wins the tie.
  assert.equal(
    selectManifestEntryForRoute(realManifest, SANSA_ROUTE).id,
    "handover"
  );
  // The domestic route pre-selects its own trace, NOT the global default.
  assert.equal(
    selectManifestEntryForRoute(realManifest, DOMESTIC_ROUTE).id,
    "cht-domestic"
  );
  // Order-agnostic: swapped route sides still match.
  assert.equal(
    selectManifestEntryForRoute(realManifest, {
      stationAId: "cht-fangshan",
      stationBId: "cht-yangmingshan"
    }).id,
    "cht-domestic"
  );
});

test("route pre-selection falls back to the global default", () => {
  // Unidentified route: never guess a pair.
  assert.equal(
    selectManifestEntryForRoute(realManifest, UNKNOWN_ROUTE).id,
    "handover"
  );
  assert.equal(
    selectManifestEntryForRoute(realManifest, {
      stationAId: "cht-yangmingshan",
      stationBId: null
    }).id,
    "handover"
  );
  // A pair no trace declares (loopback entries carry no hints, so they can
  // never match a route).
  assert.equal(
    selectManifestEntryForRoute(realManifest, {
      stationAId: "ksat-svalsat-svalbard",
      stationBId: "sansa-hartebeesthoek"
    }).id,
    "handover"
  );
});

test("tie-breaker without a default among the matches: manifest order, first wins", () => {
  const synthetic = {
    schemaVersion: 1,
    traces: [
      { id: "other", label: "other pair", url: "/fixtures/estnet/x.json", default: true },
      {
        id: "pair-first",
        label: "first",
        url: "/fixtures/estnet/a.json",
        stationA: "cht-yangmingshan",
        stationB: "sansa-hartebeesthoek"
      },
      {
        id: "pair-second",
        label: "second",
        url: "/fixtures/estnet/b.json",
        stationA: "sansa-hartebeesthoek",
        stationB: "cht-yangmingshan"
      }
    ]
  };
  // Both hint entries match the route; neither is default:true — the earlier
  // manifest entry wins, and the global default (a different pair) never
  // overrides a same-pair match.
  assert.equal(selectManifestEntryForRoute(synthetic, SANSA_ROUTE).id, "pair-first");
  // A default:true entry INSIDE the matching pair set beats manifest order.
  const withPairDefault = {
    schemaVersion: 1,
    traces: [
      synthetic.traces[1],
      { ...synthetic.traces[2], default: true }
    ]
  };
  assert.equal(
    selectManifestEntryForRoute(withPairDefault, SANSA_ROUTE).id,
    "pair-second"
  );
});

test("pair disclosure: null on match (order-agnostic) and on endpoint-less traces", () => {
  assert.equal(pairCompatibilityDisclosure(handoverTrace, SANSA_ROUTE), null);
  assert.equal(
    pairCompatibilityDisclosure(handoverTrace, {
      stationAId: "sansa-hartebeesthoek",
      stationBId: "cht-yangmingshan"
    }),
    null
  );
  // Loopback captures declare no endpoints — nothing to reconcile, any route.
  assert.equal(pairCompatibilityDisclosure(pingTrace, SANSA_ROUTE), null);
  assert.equal(pairCompatibilityDisclosure(pingTrace, UNKNOWN_ROUTE), null);
});

test("pair disclosure: explicit one-line mismatch text", () => {
  const line = pairCompatibilityDisclosure(handoverTrace, DOMESTIC_ROUTE);
  assert.equal(
    line,
    "trace endpoints cht-yangmingshan / sansa-hartebeesthoek ≠ current route " +
      "cht-yangmingshan / cht-fangshan — viewer-model overlay hidden"
  );
  // Fail-closed unidentified route: still disclosed, sides shown as unknown.
  const unknownLine = pairCompatibilityDisclosure(handoverTrace, UNKNOWN_ROUTE);
  assert.match(unknownLine, /unknown \/ unknown — viewer-model overlay hidden$/);
});

test("disclosure and overlay suppression stay in lock-step on the real fixture", () => {
  const anchors = {
    GEO: {
      latencyMs: 131.1592,
      slantRangeKm: 38723.6,
      representativeSatelliteId: "APSTAR-7",
      representativeSampleUtc: "2026-06-15T03:00:00.000Z"
    },
    MEO: {
      latencyMs: 92.5471,
      slantRangeKm: 27148.2,
      representativeSatelliteId: "GSAT0102 (GALILEO-FM2)",
      representativeSampleUtc: "2026-06-15T01:09:39.000Z"
    }
  };
  const resultFor = (route) => ({
    timeWindow: {
      startUtc: "2026-06-15T00:00:00Z",
      endUtc: "2026-06-15T06:00:00Z"
    },
    representativeLinkBudgetByOrbit: anchors,
    pair: {
      stationA: { id: route.stationAId },
      stationB: { id: route.stationBId }
    }
  });
  // Same pair: overlay renders AND no disclosure line.
  assert.notEqual(computeModelOverlay(handoverTrace, resultFor(SANSA_ROUTE)), null);
  assert.equal(pairCompatibilityDisclosure(handoverTrace, SANSA_ROUTE), null);
  // Different pair: overlay suppressed AND the suppression is disclosed.
  assert.equal(computeModelOverlay(handoverTrace, resultFor(DOMESTIC_ROUTE)), null);
  assert.notEqual(pairCompatibilityDisclosure(handoverTrace, DOMESTIC_ROUTE), null);
});
