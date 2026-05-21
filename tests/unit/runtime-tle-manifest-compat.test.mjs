import assert from "node:assert/strict";
import test from "node:test";

import stationRegistry from "../../public/fixtures/ground-stations/multi-orbit-public-registry.json" with { type: "json" };
import {
  buildRuntimeTleSourceParseStats,
  computeRuntimeProjection,
  loadDefaultTleSources,
  parseRuntimeTleSources
} from "../../src/features/multi-station-selector/runtime-projection.ts";
import { buildRuntimeProjectionCsv } from "../../src/features/multi-station-selector/runtime-projection-csv.ts";

const EXPECTED_TLE_METADATA = {
  format: "tle-3le",
  apiClass: "celestrak-gp-tle",
  catalogNumberCompatibility: "tle-limited-5-digit-catalog"
};

const TLE_TEXT = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26138.00000000  .00010000  00000+0  10000-3 0  9991",
  "2 25544  51.6400 120.0000 0006000  40.0000  80.0000 15.50000000400000"
].join("\n");

function oldManifest() {
  return {
    comment: "# CelesTrak network snapshot",
    generatedAtUtc: "2026-05-20T00:00:00.000Z",
    leo: {
      path: "leo-old.tle",
      recordCount: 1,
      epochRangeUtc: {
        startUtc: "2026-05-20T00:00:00.000Z",
        endUtc: "2026-05-20T00:00:00.000Z"
      }
    },
    meo: {
      path: "meo-old.tle",
      recordCount: 1,
      epochRangeUtc: {
        startUtc: "2026-05-20T00:00:00.000Z",
        endUtc: "2026-05-20T00:00:00.000Z"
      }
    },
    geo: {
      path: "geo-old.tle",
      recordCount: 1,
      epochRangeUtc: {
        startUtc: "2026-05-20T00:00:00.000Z",
        endUtc: "2026-05-20T00:00:00.000Z"
      }
    }
  };
}

function freshManifest() {
  const manifest = oldManifest();
  for (const key of ["leo", "meo", "geo"]) {
    Object.assign(manifest[key], {
      format: "tle-3le",
      apiClass: "celestrak-gp-tle",
      sourcePolicy: "refresh-artifact",
      catalogNumberCompatibility: "tle-limited-5-digit-catalog"
    });
  }
  return manifest;
}

function response(status, body) {
  return new Response(body, {
    status,
    statusText: status === 200 ? "OK" : "error"
  });
}

function fetchFromMap(routes) {
  return async (path) => {
    const value = routes.get(String(path));
    if (value instanceof Response) {
      return value;
    }
    if (value !== undefined) {
      return response(200, value);
    }
    return response(404, "missing");
  };
}

function networkRoutes(manifest) {
  return new Map([
    ["/fixtures/satellites-network/manifest.json", JSON.stringify(manifest)],
    ["/fixtures/satellites-network/satcat-summary.json", "[]"],
    ["/fixtures/satellites-network/leo-old.tle", TLE_TEXT],
    ["/fixtures/satellites-network/meo-old.tle", TLE_TEXT],
    ["/fixtures/satellites-network/geo-old.tle", TLE_TEXT]
  ]);
}

function fallbackRoutes(manifest) {
  return new Map([
    ["/fixtures/satellites-network/manifest.json", JSON.stringify(manifest)],
    ["/fixtures/satellites-network/satcat-summary.json", "[]"],
    ["/fixtures/satellites-network/leo-old.tle", response(500, "failed")],
    ["/fixtures/satellites-network/meo-old.tle", response(500, "failed")],
    ["/fixtures/satellites-network/geo-old.tle", response(500, "failed")],
    [
      "/fixtures/satellites/leo-scale/starlink-2026-05-12T12-35-35Z.tle",
      TLE_TEXT
    ],
    [
      "/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle",
      TLE_TEXT
    ],
    [
      "/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle",
      TLE_TEXT
    ]
  ]);
}

function localRoutes() {
  return fallbackRoutes(oldManifest()).set(
    "/fixtures/satellites-network/manifest.json",
    response(404, "missing")
  );
}

function assertTleDefaults(stats, sourcePolicy) {
  for (const source of stats) {
    assert.equal(source.format, EXPECTED_TLE_METADATA.format);
    assert.equal(source.apiClass, EXPECTED_TLE_METADATA.apiClass);
    assert.equal(source.sourcePolicy, sourcePolicy);
    assert.equal(
      source.catalogNumberCompatibility,
      EXPECTED_TLE_METADATA.catalogNumberCompatibility
    );
  }
}

test("old manifest shape still resolves network snapshot with TLE defaults", async () => {
  const sources = await loadDefaultTleSources(fetchFromMap(networkRoutes(oldManifest())));
  const stats = buildRuntimeTleSourceParseStats(sources);

  assert.equal(sources.sourceMode, "network-snapshot");
  assert.deepEqual(sources.sourcePaths, {
    LEO: "/fixtures/satellites-network/leo-old.tle",
    MEO: "/fixtures/satellites-network/meo-old.tle",
    GEO: "/fixtures/satellites-network/geo-old.tle"
  });
  assertTleDefaults(stats, "refresh-artifact");
});

test("missing manifest uses local snapshot defaults", async () => {
  const sources = await loadDefaultTleSources(fetchFromMap(localRoutes()));
  const stats = buildRuntimeTleSourceParseStats(sources);

  assert.equal(sources.sourceMode, "local-snapshot");
  assert.ok(sources.sourcePaths.LEO.endsWith(".tle"));
  assert.ok(!sources.sourcePaths.LEO.includes(".csv"));
  assert.ok(!sources.sourcePaths.LEO.includes("omm"));
  assertTleDefaults(stats, "bundled-snapshot");
});

test("fresh manifest with failed TLE fetch falls back to local snapshot", async () => {
  const sources = await loadDefaultTleSources(fetchFromMap(fallbackRoutes(freshManifest())));
  const stats = buildRuntimeTleSourceParseStats(sources);

  assert.equal(sources.sourceMode, "fallback-local-snapshot");
  assert.equal(sources.snapshotFetchedUtc, "2026-05-20T00:00:00.000Z");
  assert.ok(sources.sourcePaths.GEO.endsWith(".tle"));
  assertTleDefaults(stats, "fallback-local-snapshot");
});

test("manifest metadata flows through parse stats, data completeness, and CSV", async () => {
  const sources = await loadDefaultTleSources(fetchFromMap(networkRoutes(freshManifest())));
  const records = parseRuntimeTleSources(sources);
  const stats = buildRuntimeTleSourceParseStats(sources);
  const [stationA, stationB] = stationRegistry.stations.filter((station) =>
    ["ksat-svalsat-svalbard", "ksat-tromso"].includes(station.id)
  );

  const result = computeRuntimeProjection({
    stationA,
    stationB,
    timeWindow: {
      startUtc: "2026-05-20T00:00:00.000Z",
      endUtc: "2026-05-20T00:01:00.000Z"
    },
    tleRecords: records,
    tleParseStats: stats,
    sourcePaths: sources.sourcePaths,
    sampleStepSeconds: 60
  });
  const csv = buildRuntimeProjectionCsv(result);

  for (const source of result.dataCompleteness.tleSources) {
    assert.equal(source.format, "tle-3le");
    assert.equal(source.apiClass, "celestrak-gp-tle");
    assert.equal(source.sourcePolicy, "refresh-artifact");
    assert.equal(
      source.catalogNumberCompatibility,
      "tle-limited-5-digit-catalog"
    );
  }
  for (const freshness of result.dataCompleteness.tleFreshness) {
    assert.equal(freshness.format, "tle-3le");
    assert.equal(freshness.apiClass, "celestrak-gp-tle");
    assert.equal(freshness.sourcePolicy, "refresh-artifact");
    assert.equal(
      freshness.catalogNumberCompatibility,
      "tle-limited-5-digit-catalog"
    );
  }
  assert.match(csv, /tle-3le/);
  assert.match(csv, /celestrak-gp-tle/);
  assert.match(csv, /refresh-artifact/);
  assert.match(csv, /tle-limited-5-digit-catalog/);
});

test("default source behavior has no OMM, CSV, or Space-Track source path", async () => {
  const sources = await loadDefaultTleSources(fetchFromMap(networkRoutes(freshManifest())));
  for (const path of Object.values(sources.sourcePaths)) {
    assert.ok(path.endsWith(".tle"));
    assert.ok(!path.toLowerCase().includes("omm"));
    assert.ok(!path.toLowerCase().includes("csv"));
    assert.ok(!path.toLowerCase().includes("space-track"));
  }
});
