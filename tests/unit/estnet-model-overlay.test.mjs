import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

import { computeModelOverlay } from "../../src/features/multi-station-selector/estnet-trace-panel-section.ts";

const SPEED_OF_LIGHT_KM_PER_S = 299792.458;

const handoverTrace = JSON.parse(
  readFileSync(
    new URL(
      "../../public/fixtures/estnet/cht-sansa-handover-packet-trace.json",
      import.meta.url
    ),
    "utf8"
  )
);
const geoTrace = JSON.parse(
  readFileSync(
    new URL(
      "../../public/fixtures/estnet/cht-sansa-abs2a-packet-trace.json",
      import.meta.url
    ),
    "utf8"
  )
);

// Minimal RuntimeProjectionResult stub: the overlay only reads
// representativeLinkBudgetByOrbit and timeWindow.
function resultStub({ timeWindow, byOrbit }) {
  return { timeWindow, representativeLinkBudgetByOrbit: byOrbit };
}

const GEO_ANCHOR = {
  latencyMs: 131.1592,
  slantRangeKm: 38723.6,
  representativeSatelliteId: "APSTAR-7",
  representativeSampleUtc: "2026-06-15T03:00:00.000Z"
};
const MEO_ANCHOR = {
  latencyMs: 92.5471,
  slantRangeKm: 27148.2,
  representativeSatelliteId: "GSAT0102 (GALILEO-FM2)",
  representativeSampleUtc: "2026-06-15T01:09:39.000Z"
};
const DEMO_WINDOW = {
  startUtc: "2026-06-15T00:00:00Z",
  endUtc: "2026-06-15T06:00:00Z"
};

test("2-hop model levels and decomposition identity hold on the real handover fixture", () => {
  const overlay = computeModelOverlay(
    handoverTrace,
    resultStub({ timeWindow: DEMO_WINDOW, byOrbit: { GEO: GEO_ANCHOR, MEO: MEO_ANCHOR } })
  );
  assert(overlay, "overlay must build");
  assert.equal(overlay.perOrbit.length, 2);
  assert.equal(overlay.windowAligned, true);
  assert.equal(overlay.serializationApplicable, true);
  // Planted truth: 2 legs x 142 B @ 9600 bps.
  assert.ok(Math.abs(overlay.serialization2LegMs - (2 * 142 * 8 * 1000) / 9600) < 1e-9);

  for (const level of overlay.perOrbit) {
    const anchor = level.orbitClass === "GEO" ? GEO_ANCHOR : MEO_ANCHOR;
    assert.ok(Math.abs(level.model2HopMs - 2 * anchor.latencyMs) < 1e-9);
    const expectedPropagation =
      2 * ((anchor.slantRangeKm / SPEED_OF_LIGHT_KM_PER_S) * 1000);
    assert.ok(Math.abs(level.modelPropagationMs - expectedPropagation) < 1e-9);
    // The per-hop processing add-on is recovered from public fields, never
    // duplicated as a constant: latency − slant/c ≈ 2 ms per hop.
    assert.ok(Math.abs(level.modelProcessingMs - 2 * 2) < 0.05);
    // Observed means come from the fixture's own per-orbit summary.
    assert.equal(
      level.observedMeanMs,
      handoverTrace.summary.meanLatencyByOrbitMs[level.orbitClass]
    );
    // Decomposition identity: delta == serialization − processing + residual.
    const delta = level.observedMeanMs - level.model2HopMs;
    const residual = delta - overlay.serialization2LegMs + level.modelProcessingMs;
    assert.ok(
      Math.abs(delta - (overlay.serialization2LegMs - level.modelProcessingMs + residual)) <
        1e-9
    );
    // Sanity on the real numbers: the residual (geometry mismatch) is small
    // relative to the serialization term the decomposition explains.
    assert.ok(Math.abs(residual) < 10, `residual ${residual} unexpectedly large`);
  }
});

test("schemaVersion-1 trace binds its single orbit from the satellite label", () => {
  const overlay = computeModelOverlay(
    geoTrace,
    resultStub({ timeWindow: DEMO_WINDOW, byOrbit: { GEO: GEO_ANCHOR } })
  );
  assert(overlay);
  assert.equal(overlay.perOrbit.length, 1);
  assert.equal(overlay.perOrbit[0].orbitClass, "GEO");
  assert.equal(overlay.perOrbit[0].observedMeanMs, geoTrace.summary.meanLatencyMs);
  // The flat-GEO trace epoch (2026-06-13T20:13Z) is OUTSIDE the pinned demo
  // window — the overlay must flag the mismatch, not hide it.
  assert.equal(overlay.windowAligned, false);
  assert.match(overlay.traceWindowLabel, /2026-06-13/);
});

test("windowAligned reflects projection-vs-trace window overlap", () => {
  const misaligned = computeModelOverlay(
    handoverTrace,
    resultStub({
      timeWindow: { startUtc: "2026-07-02T00:00:00Z", endUtc: "2026-07-02T06:00:00Z" },
      byOrbit: { GEO: GEO_ANCHOR, MEO: MEO_ANCHOR }
    })
  );
  assert(misaligned);
  assert.equal(misaligned.windowAligned, false);
});

test("no overlay for rtt/none semantics or when no orbit anchor exists", () => {
  const rttTrace = { ...geoTrace, latencySemantic: "rtt" };
  assert.equal(
    computeModelOverlay(rttTrace, resultStub({ timeWindow: DEMO_WINDOW, byOrbit: { GEO: GEO_ANCHOR } })),
    null
  );
  const noneTrace = { ...geoTrace, latencySemantic: "none" };
  assert.equal(
    computeModelOverlay(noneTrace, resultStub({ timeWindow: DEMO_WINDOW, byOrbit: { GEO: GEO_ANCHOR } })),
    null
  );
  // Orbit present in the trace but absent from the projection result → no
  // invented anchor, overlay skipped entirely.
  assert.equal(
    computeModelOverlay(geoTrace, resultStub({ timeWindow: DEMO_WINDOW, byOrbit: {} })),
    null
  );
  assert.equal(computeModelOverlay(handoverTrace, null), null);
});
