import assert from "node:assert/strict";
import test from "node:test";

import stationRegistry from "../../public/fixtures/ground-stations/multi-orbit-public-registry.json" with { type: "json" };
import {
  buildRuntimeTleSourceParseStats,
  computeRuntimeProjection,
  loadDefaultTleSources,
  parseRuntimeOrbitSources,
  parseRuntimeTleSources,
  TLE_FIXTURE_PATHS
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

const OMM_ROW = {
  OBJECT_NAME: "GP DEMO 123456",
  OBJECT_ID: "2026-001A",
  NORAD_CAT_ID: 123456,
  CLASSIFICATION_TYPE: "U",
  EPOCH: "2026-05-20T00:00:00.000",
  MEAN_MOTION: 15.5,
  ECCENTRICITY: 0.0006,
  INCLINATION: 51.64,
  RA_OF_ASC_NODE: 120,
  ARG_OF_PERICENTER: 40,
  MEAN_ANOMALY: 80,
  EPHEMERIS_TYPE: 0,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 40000,
  BSTAR: 0.0001,
  MEAN_MOTION_DOT: 0.0001,
  MEAN_MOTION_DDOT: 0
};

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
    [TLE_FIXTURE_PATHS.LEO, TLE_TEXT],
    [TLE_FIXTURE_PATHS.MEO, TLE_TEXT],
    [TLE_FIXTURE_PATHS.GEO, TLE_TEXT]
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

test("OMM JSON source metadata flows to runtime accepted propagation records", () => {
  const sources = {
    leoTleText: JSON.stringify([OMM_ROW]),
    meoTleText: TLE_TEXT,
    geoTleText: TLE_TEXT,
    sourceMode: "network-snapshot",
    sourcePaths: {
      LEO: "/fixtures/satellites-network/leo-old.json",
      MEO: "/fixtures/satellites-network/meo-old.tle",
      GEO: "/fixtures/satellites-network/geo-old.tle"
    },
    snapshotFetchedUtc: "2026-05-20T00:00:00.000Z",
    manifestPath: "/fixtures/satellites-network/manifest.json",
    sourceMetadataByOrbit: {
      LEO: {
        format: "omm-json",
        apiClass: "celestrak-gp",
        sourcePolicy: "refresh-artifact",
        catalogNumberCompatibility: "omm-nine-digit-catalog-capable"
      },
      MEO: {
        format: "tle-3le",
        apiClass: "celestrak-gp-tle",
        sourcePolicy: "refresh-artifact",
        catalogNumberCompatibility: "tle-limited-5-digit-catalog"
      },
      GEO: {
        format: "tle-3le",
        apiClass: "celestrak-gp-tle",
        sourcePolicy: "refresh-artifact",
        catalogNumberCompatibility: "tle-limited-5-digit-catalog"
      }
    }
  };
  const runtimeRecords = parseRuntimeOrbitSources(sources);
  const legacyNamedRecords = parseRuntimeTleSources(sources);
  const stats = buildRuntimeTleSourceParseStats(sources);
  const [stationA, stationB] = stationRegistry.stations.filter((station) =>
    ["ksat-dubai", "oneweb-tabuk-snp"].includes(station.id)
  );

  assert.equal(runtimeRecords.length, 3);
  assert.equal(runtimeRecords[0].format, "omm-json");
  assert.equal(runtimeRecords[0].noradCatalogId, 123456);
  assert.equal(legacyNamedRecords.length, 2);
  assert.ok(legacyNamedRecords.every((record) => record.format !== "omm-json"));
  assert.equal(stats[0].format, "omm-json");
  assert.equal(stats[0].sourceId, "omm:leo");
  assert.equal(stats[0].parsedRecordCount, 1);
  assert.equal(stats[0].parserFailureCount, 0);

  const result = computeRuntimeProjection({
    stationA,
    stationB,
    timeWindow: {
      startUtc: "2026-05-20T00:00:00.000Z",
      endUtc: "2026-05-20T01:00:00.000Z"
    },
    tleRecords: runtimeRecords,
    tleParseStats: stats,
    sourcePaths: sources.sourcePaths,
    sampleStepSeconds: 60
  });

  const leoSource = result.dataCompleteness.tleSources.find(
    (source) => source.orbitClass === "LEO"
  );
  assert.equal(leoSource?.format, "omm-json");
  assert.equal(leoSource?.sourceId, "omm:leo");
  assert.equal(leoSource?.apiClass, "celestrak-gp");
  assert.equal(
    leoSource?.catalogNumberCompatibility,
    "omm-nine-digit-catalog-capable"
  );
  assert.equal(leoSource?.recordCount, 1);
  assert.equal(leoSource?.acceptedRecordCount, 1);
  assert.equal(leoSource?.sgp4ErrorCount, 0);

  const leoFreshness = result.dataCompleteness.tleFreshness.find(
    (freshness) => freshness.format === "omm-json"
  );
  assert.equal(leoFreshness?.provenance.truthClass, "omm-derived");
  assert.equal(leoFreshness?.provenance.sourceId, "omm:leo");

  const ommActorProvenance = result.dataCompleteness.actorProvenance.filter(
    (row) => row.orbitClass === "LEO"
  );
  assert.ok(ommActorProvenance.length > 0, "expected OMM LEO actor provenance");
  for (const actor of ommActorProvenance) {
    assert.equal(actor.sourceId, "omm:leo");
    assert.equal(actor.provenance.truthClass, "omm-derived");
    assert.equal(actor.provenance.sourceId, "omm:leo");
  }
  const ommVisibilityProvenance =
    result.dataCompleteness.visibilityProvenance.filter(
      (row) => row.orbitClass === "LEO"
    );
  assert.ok(
    ommVisibilityProvenance.length > 0,
    "expected OMM LEO visibility provenance"
  );
  for (const visibility of ommVisibilityProvenance) {
    assert.equal(visibility.sourceId, "omm:leo");
    assert.equal(visibility.provenance.truthClass, "omm-derived");
    assert.equal(visibility.provenance.sourceId, "omm:leo");
  }

  const csv = buildRuntimeProjectionCsv(result);
  assert.match(csv, /omm:leo/);
  assert.match(csv, /omm-derived/);
  assert.doesNotMatch(csv, /tle:leo/);
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
