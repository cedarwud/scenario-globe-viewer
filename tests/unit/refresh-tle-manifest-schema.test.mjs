import assert from "node:assert/strict";
import test from "node:test";

import { withSnapshotMetadataForManifest } from "../../scripts/refresh-tle.mjs";

const EXPECTED_METADATA = {
  format: "tle-3le",
  apiClass: "celestrak-gp-tle",
  sourcePolicy: "refresh-artifact",
  catalogNumberCompatibility: "tle-limited-5-digit-catalog"
};

function manifestEntry(path, recordCount = 1) {
  return {
    path,
    recordCount,
    epochRangeUtc: {
      startUtc: "2026-05-20T00:00:00.000Z",
      endUtc: "2026-05-20T01:00:00.000Z"
    }
  };
}

function assertEntry(entry, path) {
  assert.equal(entry.path, path);
  assert.ok(entry.path.endsWith(".tle"));
  assert.ok(entry.recordCount > 0);
  assert.ok(
    entry.epochRangeUtc.startUtc === null ||
      Number.isFinite(Date.parse(entry.epochRangeUtc.startUtc))
  );
  assert.ok(
    entry.epochRangeUtc.endUtc === null ||
      Number.isFinite(Date.parse(entry.epochRangeUtc.endUtc))
  );
  assert.deepEqual(
    {
      format: entry.format,
      apiClass: entry.apiClass,
      sourcePolicy: entry.sourcePolicy,
      catalogNumberCompatibility: entry.catalogNumberCompatibility
    },
    EXPECTED_METADATA
  );
}

test("generated manifest schema includes TLE snapshot metadata", () => {
  const manifest = withSnapshotMetadataForManifest({
    comment:
      "# Data source: CelesTrak (celestrak.org), Terms of Use: https://celestrak.org/terms-of-use.php",
    generatedAtUtc: "2026-05-20T02:00:00.000Z",
    leo: manifestEntry("leo-2026-05-20T02-00-00Z.tle", 600),
    meo: manifestEntry("meo-2026-05-20T02-00-00Z.tle", 33),
    geo: manifestEntry("geo-2026-05-20T02-00-00Z.tle", 30)
  });

  assert.equal(typeof manifest.comment, "string");
  assert.ok(manifest.comment.length > 0);
  assert.ok(Number.isFinite(Date.parse(manifest.generatedAtUtc)));
  assertEntry(manifest.leo, "leo-2026-05-20T02-00-00Z.tle");
  assertEntry(manifest.meo, "meo-2026-05-20T02-00-00Z.tle");
  assertEntry(manifest.geo, "geo-2026-05-20T02-00-00Z.tle");
});

test("partial group merge preserves non-selected paths and adds metadata defaults", () => {
  const merged = withSnapshotMetadataForManifest({
    comment: "# merged",
    generatedAtUtc: "2026-05-20T03:00:00.000Z",
    leo: {
      ...manifestEntry("leo-2026-05-20T03-00-00Z.tle", 10),
      ...EXPECTED_METADATA
    },
    meo: manifestEntry("meo-old.tle", 20),
    geo: manifestEntry("geo-old.tle", 30)
  });

  assertEntry(merged.leo, "leo-2026-05-20T03-00-00Z.tle");
  assertEntry(merged.meo, "meo-old.tle");
  assertEntry(merged.geo, "geo-old.tle");
  assert.equal(merged.meo.recordCount, 20);
  assert.equal(merged.geo.recordCount, 30);
});

test("partial refresh fallback markers remain in normalized manifest", () => {
  const normalized = withSnapshotMetadataForManifest({
    comment: "# partial",
    generatedAtUtc: "2026-05-18T22:36:10.000Z",
    partialRefreshAtUtc: "2026-06-02T03:58:00.000Z",
    fetchFallbacks: [
      {
        group: "leo",
        path: "leo-2026-05-18T22-36-10Z.tle",
        reason:
          "Fetch failed 500 Internal Server Error: https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle"
      }
    ],
    leo: manifestEntry("leo-2026-05-18T22-36-10Z.tle", 600),
    meo: manifestEntry("meo-2026-06-02T03-58-00Z.tle", 33),
    geo: manifestEntry("geo-2026-06-02T03-58-00Z.tle", 30)
  });

  assert.equal(normalized.generatedAtUtc, "2026-05-18T22:36:10.000Z");
  assert.equal(normalized.partialRefreshAtUtc, "2026-06-02T03:58:00.000Z");
  assert.deepEqual(normalized.fetchFallbacks, [
    {
      group: "leo",
      path: "leo-2026-05-18T22-36-10Z.tle",
      reason:
        "Fetch failed 500 Internal Server Error: https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle"
    }
  ]);
  assertEntry(normalized.leo, "leo-2026-05-18T22-36-10Z.tle");
  assertEntry(normalized.meo, "meo-2026-06-02T03-58-00Z.tle");
  assertEntry(normalized.geo, "geo-2026-06-02T03-58-00Z.tle");
});
