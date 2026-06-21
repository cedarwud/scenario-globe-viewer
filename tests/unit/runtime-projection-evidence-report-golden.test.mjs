// Evidence-report HTML SAFETY-NET golden.
//
// buildRuntimeProjectionEvidenceReportHtml is the pure renderer behind the
// customer-facing evidence package (the downloadable HTML report + its sha256
// in deliverable/selected-pair-source-evidence/evidence-manifest.json). It is a
// 4.4k-line builder that runs in ZERO `npm test` coverage today: the delivered
// HTML is regenerated through a browser (update-evidence.mjs needs chromium),
// so the node suite never exercises the renderer itself. This golden closes
// that gap and LOCKS the exact rendered HTML so the planned behavior-preserving
// split of runtime-projection-evidence-report.ts into sibling tab modules is
// provably byte-identical pre/post.
//
// The rendered report is ~0.9 MB (the Raw-data tab dumps every propagated
// actor), so the golden is stored as a byte-exact sha256 + byte length rather
// than a committed 25k-line HTML file: same byte-exact guarantee, no git bloat
// or noisy diffs, and a human-viewable copy already ships in
// deliverable/selected-pair-source-evidence/.
//
// BASIS = the SAME pinned-demo RuntimeProjectionResult that
// runtime-projection-demo-golden.test.mjs (D1) locks at the data level — the
// real delivered demo pair (CHT x SANSA, 06-15 +360m) over the COMMITTED,
// FROZEN pinned demo TLE snapshots declared in demo-scenario-config.json. The
// input is centralized in that config + its fixtures, so this test and D1 can
// never silently diverge on input; only the rendered OUTPUT is captured here.
//
// generatedAtUtc is injected (the renderer's only wall-clock input, excluded
// from the payload checksum) so the snapshot is fully deterministic.
//
// RE-BASELINE ONLY on a deliberate demo regen (npm run repin:demo) or an
// INTENDED report-format change. Regenerate with:
//     UPDATE_GOLDENS=1 node --import ./tests/helpers/register-ts-hook.mjs \
//       --test tests/unit/runtime-projection-evidence-report-golden.test.mjs
// A diff here from an ordinary refactor means the refactor was NOT
// behavior-preserving — regenerate locally and `git diff` the report to see
// what moved; do not blindly update.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildRuntimeProjectionEvidenceReportHtml,
} from "../../src/features/multi-station-selector/runtime-projection-evidence-report.ts";
import {
  computeRuntimeProjection,
  parseRuntimeTleSources,
  buildRuntimeTleSourceParseStats,
  SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
} from "../../src/features/multi-station-selector/runtime-projection.ts";
import { PUBLIC_REGISTRY_BY_ID } from "../../src/features/multi-station-selector/tier-inference.ts";
import config from "../../src/features/multi-station-selector/demo-scenario-config.json" with { type: "json" };

const readFixture = (publicRelativePath) =>
  readFileSync(
    fileURLToPath(new URL("../../public" + publicRelativePath, import.meta.url)),
    "utf8",
  );

// --- Reproduce the delivered pinned-demo result (mirrors D1 exactly). ---
const demoEndUtc = new Date(
  Date.parse(config.windowStartUtc) + config.windowDurationMinutes * 60_000,
).toISOString();
const demoSources = {
  leoTleText: readFixture(config.tleSnapshots.LEO),
  meoTleText: readFixture(config.tleSnapshots.MEO),
  geoTleText: readFixture(config.tleSnapshots.GEO),
  sourceMode: "local-snapshot",
  sourcePaths: config.tleSnapshots,
};
const demoResult = computeRuntimeProjection({
  stationA: PUBLIC_REGISTRY_BY_ID.get(config.stationAId),
  stationB: PUBLIC_REGISTRY_BY_ID.get(config.stationBId),
  timeWindow: { startUtc: config.windowStartUtc, endUtc: demoEndUtc },
  tleRecords: parseRuntimeTleSources(demoSources),
  tleParseStats: buildRuntimeTleSourceParseStats(demoSources),
  policyId: SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
  rainRateMmPerHour: 0,
});

// Fixed injected generation timestamp — keeps the snapshot deterministic.
const FIXED_GENERATED_AT_UTC = "2026-06-15T00:00:00.000Z";

const GOLDEN_PATH = fileURLToPath(
  new URL("../golden/runtime-projection-evidence-report.sha256.json", import.meta.url),
);
const UPDATE = process.env.UPDATE_GOLDENS === "1" || process.env.UPDATE_GOLDEN === "1";

const actualHtml = buildRuntimeProjectionEvidenceReportHtml(
  demoResult,
  FIXED_GENERATED_AT_UTC,
);
const actualSha256 = createHash("sha256").update(actualHtml, "utf8").digest("hex");
const actualByteLength = Buffer.byteLength(actualHtml, "utf8");

if (UPDATE || !existsSync(GOLDEN_PATH)) {
  writeFileSync(
    GOLDEN_PATH,
    JSON.stringify(
      {
        description:
          "Byte-exact sha256 of buildRuntimeProjectionEvidenceReportHtml(pinned demo, fixed timestamp). Refactor safety net; re-baseline with UPDATE_GOLDENS=1 on an intended report-format or demo-regen change.",
        fixedGeneratedAtUtc: FIXED_GENERATED_AT_UTC,
        byteLength: actualByteLength,
        sha256: actualSha256,
      },
      null,
      2,
    ) + "\n",
  );
}

test("evidence-report HTML renderer is deterministic + structurally complete", () => {
  // Cheap structural guards so a truncated/empty render can never pass silently.
  assert.ok(actualHtml.startsWith("<!doctype html>"), "expected an HTML document");
  assert.ok(actualHtml.length > 20_000, `report unexpectedly small (${actualHtml.length} chars)`);
  for (const tabId of ["summary", "requirements", "visibility", "handover", "sources", "models", "audit", "runtime"]) {
    assert.ok(
      actualHtml.includes(`aria-controls="${tabId}"`),
      `missing tab control: ${tabId}`,
    );
  }
  // The injected timestamp is the only wall-clock input and must round-trip.
  assert.ok(
    actualHtml.includes(FIXED_GENERATED_AT_UTC),
    "injected generation timestamp not rendered",
  );
  // Re-rendering with the same inputs is byte-identical (no hidden non-determinism).
  assert.equal(
    buildRuntimeProjectionEvidenceReportHtml(demoResult, FIXED_GENERATED_AT_UTC),
    actualHtml,
    "renderer is non-deterministic for fixed inputs",
  );
});

test("evidence-report HTML matches the committed byte-exact golden (sha256)", () => {
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
  assert.equal(
    actualByteLength,
    golden.byteLength,
    `evidence-report byte length drifted (${actualByteLength} vs golden ${golden.byteLength}).`,
  );
  assert.equal(
    actualSha256,
    golden.sha256,
    "evidence-report HTML drifted from the golden sha256 — if this was an " +
      "intended report-format or demo-regen change, re-baseline with " +
      "UPDATE_GOLDENS=1 and `git diff`; otherwise the change was NOT " +
      "behavior-preserving.",
  );
});
