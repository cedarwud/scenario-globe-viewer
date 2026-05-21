#!/usr/bin/env node
// D6 gate for selected-pair TLE-first data-completeness metadata.
//
// Usage:
//   node scripts/verify-tle-first-data-completeness.mjs [--port=9712]

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";

import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "../tests/smoke/bootstrap-smoke-browser.mjs";

const DEFAULT_SERVER_PORT = 5173;
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT_MS = 30_000;
const RUNTIME_MODE = "tle-first-runtime";
const FIXTURE_MODE = "fixture-fallback";
const TLE_SOURCE_MODES = new Set([
  "local-snapshot",
  "network-snapshot",
  "fallback-local-snapshot"
]);
const SOURCE_EVIDENCE_KINDS = new Set([
  "explicit-pair-attestation",
  "same-operator-family-inferred",
  "cross-family-geometric"
]);
const COORDINATE_SOURCE_AUTHORITIES = new Set([
  "official-filing",
  "operator-web",
  "teleport-directory",
  "secondary-web",
  "wikipedia",
  "news",
  "mixed-public",
  "unknown-public"
]);
const DEFAULT_HANDOVER_POLICY_ID = "cross-orbit-live";
const EXPECTED_CAP_DISCLOSURE = {
  perOrbitCap: { LEO: 200, MEO: 100, GEO: 60 },
  perOrbitInventory: { LEO: 600, MEO: 33, GEO: 30 },
  cappedAtRuntime: { LEO: true, MEO: false, GEO: false }
};
const EXPECTED_METRIC_ANCHORS = {
  carrierSelection: "orbit-class-default",
  capacityModel: "clear-sky-reference-with-fade-derating",
  jitterModel: "orbit-baseline-with-rain-scale",
  delayModel: "slant-range-one-way-plus-fixed-processing"
};
const EXPECTED_ELEVATION_SOURCE_KIND = "legacy-service-cache";
const EXPECTED_ELEVATION_DATASET_ID = "legacy-elevation-service-cache-v1";
const EXPECTED_ELEVATION_PROVENANCE_STATUS = "legacy-upstream-dem-unknown";
const EXPECTED_ELEVATION_SAMPLING_METHOD = "service-response";
const EXPECTED_ELEVATION_LICENSE_ID = "legacy-unverified";
const EXPECTED_ELEVATION_SOURCE_PATH =
  "public/fixtures/ground-stations/station-elevations-cache.json";
const EXPECTED_TERRAIN_MASK_SOURCE_ID = "default-unknown";
const EXPECTED_RF_FIELD_SOURCE_ID = "unavailable-pending-operator-rf-profile";
const EXPECTED_RF_CHAIN_TERM_KINDS = [
  "tx-eirp",
  "free-space-path-loss",
  "gas-absorption",
  "rain-attenuation",
  "rx-antenna-gain"
];
const EXPECTED_ATMOSPHERIC_LOOKUP_SOURCES = [
  "p835-6-annex-1",
  "p836-6-rev-2017",
  "p837-8",
  "p839-4",
  "p840-9"
];
const REGISTRY_FIXTURE_URL = new URL(
  "../public/fixtures/ground-stations/multi-orbit-public-registry.json",
  import.meta.url
);
const COORDINATE_AUTHORITY_FIXTURE_URL = new URL(
  "../public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json",
  import.meta.url
);
const DEBUG_SERVER_PROBE = process.env.SGV_DEBUG_SERVER_PROBE === "1";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const splitAt = arg.indexOf("=");
    if (splitAt < 0) {
      return [arg.replace(/^--/, ""), ""];
    }
    return [arg.slice(0, splitAt).replace(/^--/, ""), arg.slice(splitAt + 1)];
  })
);

const serverPort = Number.parseInt(args.port ?? `${DEFAULT_SERVER_PORT}`, 10);
if (!Number.isInteger(serverPort) || serverPort <= 0) {
  throw new Error(`Invalid --port value: ${args.port}`);
}

const baseUrl = `http://127.0.0.1:${serverPort}`;

async function readJsonFixture(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function assertCoordinateAuthorityFixtureCoverage() {
  const registry = await readJsonFixture(REGISTRY_FIXTURE_URL);
  const authority = await readJsonFixture(COORDINATE_AUTHORITY_FIXTURE_URL);
  const registryIds = new Set(registry.stations.map((station) => station.id));
  const authorityIds = new Set(authority.stations.map((station) => station.stationId));

  assert(registry.stations.length === 69, "registry station count should remain 69");
  assert(
    authority.stations.length === registry.stations.length,
    "coordinate authority fixture row count mismatch"
  );
  for (const station of authority.stations) {
    assert(registryIds.has(station.stationId), `orphan coordinate authority row ${station.stationId}`);
    assert(
      COORDINATE_SOURCE_AUTHORITIES.has(station.coordinateSourceAuthority),
      `invalid coordinate source authority ${station.coordinateSourceAuthority}`
    );
    assert(
      typeof station.coordinateSourceNote === "string" &&
        station.coordinateSourceNote.length > 0,
      `missing coordinate source note ${station.stationId}`
    );
  }
  for (const stationId of registryIds) {
    assert(authorityIds.has(stationId), `missing coordinate authority row ${stationId}`);
  }
}

const walkthroughCases = [
  {
    label: "Walkthrough 1 - Svalbard / Tromso ready pair",
    stationA: "ksat-svalsat-svalbard",
    stationB: "ksat-tromso",
    expectedStatus: "ready",
    expectedRuntimeLinkVisible: true,
    baselineVisibilityWindowCount: 26,
    baselineLinkSelectionEventCount: 2,
    baselineHandoverCount: 1,
    expectedStationPrecision: [
      { stationId: "ksat-svalsat-svalbard", elevationM: 0, terrainMaskDeg: 0 },
      { stationId: "ksat-tromso", elevationM: 0, terrainMaskDeg: 0 }
    ]
  },
  {
    label: "Walkthrough 2 - Svalbard / TrollSat zero-window pair",
    stationA: "ksat-svalsat-svalbard",
    stationB: "ksat-trollsat-antarctica",
    expectedStatus: "empty",
    expectedRuntimeLinkVisible: false,
    expectedEmptyReasonCode: "no-pair-intersection",
    baselineVisibilityWindowCount: 0,
    baselineLinkSelectionEventCount: 0,
    baselineHandoverCount: 0,
    expectedStationPrecision: [
      { stationId: "ksat-svalsat-svalbard", elevationM: 0, terrainMaskDeg: 0 },
      { stationId: "ksat-trollsat-antarctica", elevationM: 0, terrainMaskDeg: 0 }
    ]
  },
  {
    label: "Walkthrough 3 - Intelsat DE / US ready pair",
    stationA: "intelsat-fuchsstadt",
    stationB: "intelsat-atlanta",
    expectedStatus: "ready",
    expectedRuntimeLinkVisible: true,
    baselineVisibilityWindowCount: 15,
    baselineLinkSelectionEventCount: 3,
    baselineHandoverCount: 2,
    expectedStationPrecision: [
      { stationId: "intelsat-fuchsstadt", elevationM: 337, terrainMaskDeg: 0 },
      { stationId: "intelsat-atlanta", elevationM: 241, terrainMaskDeg: 0 }
    ]
  },
  {
    label: "Walkthrough 4 - Singtel / Measat ready pair",
    stationA: "singtel-bukit-timah",
    stationB: "measat-cyberjaya",
    expectedStatus: "ready",
    expectedRuntimeLinkVisible: true,
    baselineVisibilityWindowCount: 117,
    baselineLinkSelectionEventCount: 7,
    baselineHandoverCount: 6,
    expectedStationPrecision: [
      { stationId: "singtel-bukit-timah", elevationM: 58, terrainMaskDeg: 0 },
      { stationId: "measat-cyberjaya", elevationM: 22, terrainMaskDeg: 0 }
    ]
  },
  {
    label: "Walkthrough 5 - CHT / SANSA ready pair",
    stationA: "cht-yangmingshan",
    stationB: "sansa-hartebeesthoek",
    expectedStatus: "ready",
    expectedRuntimeLinkVisible: true,
    baselineVisibilityWindowCount: 9,
    baselineLinkSelectionEventCount: 3,
    baselineHandoverCount: 2,
    expectedStationPrecision: [
      { stationId: "cht-yangmingshan", elevationM: 470, terrainMaskDeg: 0 },
      { stationId: "sansa-hartebeesthoek", elevationM: 1538, terrainMaskDeg: 0 }
    ]
  }
];

const fixedDemoCase = {
  label: "Fixed demo fixture fallback route",
  searchParams: {
    scenePreset: "regional",
    m8aV4GroundStationScene: "1"
  }
};

const policySelectorCase = {
  ...walkthroughCases[0],
  label: "Policy selector - leo-first URL parameter",
  policy: "leo-first"
};

const compareCase = {
  ...walkthroughCases[3],
  label: "F49 comparison - pre-wave-2 split pane",
  compare: "pre-wave-2"
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerReachable() {
  return await new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: serverPort }, () => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${serverPort}: connect`);
      }
      socket.end();
      resolve(true);
    });
    socket.setTimeout(1500, () => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${serverPort}: timeout`);
      }
      socket.destroy();
      resolve(false);
    });
    socket.on("error", (error) => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${serverPort}: ${error.message}`);
      }
      resolve(false);
    });
  });
}

async function startServerIfNeeded() {
  if (await isServerReachable()) {
    return null;
  }
  const server = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", `${serverPort}`, "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (await isServerReachable()) {
      return server;
    }
    if (server.exitCode !== null) {
      if (await isServerReachable()) {
        return null;
      }
      throw new Error(`Vite server exited early for ${baseUrl}. Output: ${serverLog}`);
    }
    await sleep(250);
  }
  server.kill("SIGTERM");
  throw new Error(`Timed out waiting for Vite server on ${baseUrl}. Output: ${serverLog}`);
}

async function stopServer(server) {
  if (!server || server.killed) {
    return;
  }
  let exited = false;
  await new Promise((resolve) => {
    server.once("exit", () => {
      exited = true;
      resolve();
    });
    server.kill("SIGTERM");
    setTimeout(resolve, 1500);
  });
  if (!exited && !server.killed) {
    server.kill("SIGKILL");
  }
}

function buildSelectedPairUrl(testCase) {
  const url = new URL(baseUrl);
  url.searchParams.set("stationA", testCase.stationA);
  url.searchParams.set("stationB", testCase.stationB);
  url.searchParams.set("startUtc", "2026-05-17T00:00:00.000Z");
  url.searchParams.set("durationMinutes", "360");
  if (testCase.policy) {
    url.searchParams.set("policy", testCase.policy);
  }
  if (testCase.compare) {
    url.searchParams.set("compare", testCase.compare);
  }
  return url.href;
}

function buildFixedDemoUrl(testCase) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(testCase.searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

function csvCellValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function inventoryTextValue(value) {
  return value === null || value === undefined ? "unavailable" : String(value);
}

function expectedSourceEvidenceKindForCase(testCase) {
  if (testCase.stationA?.startsWith("ksat-") && testCase.stationB?.startsWith("ksat-")) {
    return "same-operator-family-inferred";
  }
  if (
    (testCase.stationA === "singtel-bukit-timah" &&
      testCase.stationB === "measat-cyberjaya") ||
    (testCase.stationA === "cht-yangmingshan" &&
      testCase.stationB === "sansa-hartebeesthoek")
  ) {
    return "cross-family-geometric";
  }
  return null;
}

const CSV_ORBIT_DISPLAY_ORDER = ["LEO", "MEO", "GEO"];
const CSV_POLICY_DISCLOSURE_THRESHOLD_ORDER = [
  "latencyBudgetMs",
  "hysteresisDb",
  "minVisibilityWindowMs",
  "elevationThresholdDeg"
];

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseCsvSections(text) {
  const sections = new Map();
  let currentSection = null;
  for (const row of parseCsvRows(text)) {
    if (row.length === 0 || row.every((cell) => cell === "")) {
      continue;
    }
    if (row[0]?.startsWith("# ")) {
      currentSection = { header: null, rows: [] };
      sections.set(row[0], currentSection);
      continue;
    }
    if (!currentSection) {
      continue;
    }
    if (!currentSection.header) {
      currentSection.header = row;
      continue;
    }
    const record = {};
    currentSection.header.forEach((key, index) => {
      record[key] = row[index] ?? "";
    });
    currentSection.rows.push(record);
  }
  return sections;
}

function requireCsvSection(sections, sectionName, label) {
  const section = sections.get(sectionName);
  assert(section, `${label}: CSV missing ${sectionName}`);
  return section;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await sleep(500);
  await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      for (let attempt = 0; attempt < 200; attempt += 1) {
        if (document.readyState === "complete") {
          return true;
        }
        await sleep(50);
      }
      return false;
    })()`,
    { awaitPromise: true }
  );
}

async function readSelectedPairState(client, terminalStatuses = ["ready", "empty", "error"]) {
  const serializedTerminalStatuses = JSON.stringify(terminalStatuses);
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const terminalStatuses = new Set(${serializedTerminalStatuses});
      let last = null;
      const startedAt = Date.now();
      while (Date.now() - startedAt < ${READY_TIMEOUT_MS}) {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const controller = capture?.m8aV4GroundStationScene;
        const state = controller?.getState?.();
        const overlay = state?.selectedPairOverlay ?? null;
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const footer = document.querySelector('[data-station-precision-disclosure="true"]');
        const chip = document.querySelector('[data-tle-telemetry-chip="true"]');
        const sourcesDisclosure = document.querySelector('[data-disclosure="sources-non-claims"]');
        const stationCoordinateSourceDisclosure = document.querySelector('[data-station-coordinate-source-disclosure="true"]');
        const capDisclosure = document.querySelector('[data-cap-disclosure="true"]');
        const policyDisclosure = document.querySelector('[data-policy-disclosure="true"]');
        const metricAnchorDisclosure = document.querySelector('[data-metric-anchor-disclosure="true"]');
        const comparePanes = Array.from(document.querySelectorAll('[data-compare-pane]'));
        last = {
          hasCapture: Boolean(capture),
          hasController: Boolean(controller),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          overlay,
          panel: panel
            ? {
                state: panel.dataset.state ?? null,
                routeMode: panel.dataset.dataCompletenessRouteMode ?? null,
                emptyReasonCode: panel.dataset.emptyReasonCode ?? null,
                activePolicyId: panel.dataset.activePolicyId ?? null,
                compareMode: panel.dataset.compareMode ?? null,
                sourceTier: panel.dataset.sourceTier ?? null,
                sourceEvidenceKind: panel.dataset.sourceEvidenceKind ?? null,
                sourceBadgeLabel: panel.dataset.sourceBadgeLabel ?? null
              }
            : null,
          footer: footer ? { ...footer.dataset, text: footer.textContent ?? "" } : null,
          chip: chip
            ? { ...chip.dataset, backgroundColor: getComputedStyle(chip).backgroundColor }
            : null,
          comparePanes: comparePanes.map((pane) => ({
            pane: pane.dataset.comparePane ?? null,
            row: pane.closest('[data-row]')?.dataset.row ?? null,
            text: pane.textContent ?? ""
          })),
          capDisclosure: capDisclosure
            ? { dataset: { ...capDisclosure.dataset }, text: capDisclosure.textContent ?? "" }
            : null,
          policyDisclosure: policyDisclosure
            ? { dataset: { ...policyDisclosure.dataset }, text: policyDisclosure.textContent ?? "" }
            : null,
          metricAnchorDisclosure: metricAnchorDisclosure
            ? { dataset: { ...metricAnchorDisclosure.dataset }, text: metricAnchorDisclosure.textContent ?? "" }
            : null,
          stationCoordinateSourceDisclosure: stationCoordinateSourceDisclosure
            ? {
                dataset: { ...stationCoordinateSourceDisclosure.dataset },
                text: stationCoordinateSourceDisclosure.textContent ?? ""
              }
            : null,
          sourcesDisclosureText: sourcesDisclosure?.textContent ?? ""
        };
        const panelHasDataCompleteness =
          !panel || Boolean(panel.dataset.dataCompletenessRouteMode);
        if (overlay && terminalStatuses.has(overlay.status) && panelHasDataCompleteness) {
          return last;
        }
        await sleep(100);
      }
      return last;
    })()`,
    { awaitPromise: true }
  );
}

async function readCsvEvidence(client, testCase) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const rt = await import("/src/features/multi-station-selector/runtime-projection.ts");
      const csv = await import("/src/features/multi-station-selector/runtime-projection-csv.ts");
      const tier = await import("/src/features/multi-station-selector/tier-inference.ts");
      const sources = await rt.loadDefaultTleSources();
      const tleRecords = rt.parseRuntimeTleSources(sources);
      const tleParseStats = rt.buildRuntimeTleSourceParseStats(sources);
      const stationA = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationA)});
      const stationB = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationB)});
      const result = rt.computeRuntimeProjection({
        stationA,
        stationB,
        timeWindow: {
          startUtc: "2026-05-17T00:00:00.000Z",
          endUtc: "2026-05-17T06:00:00.000Z"
        },
        tleRecords,
        tleParseStats,
        rainRateMmPerHour: 0
      });
      const text = csv.buildRuntimeProjectionCsv(result);
      const defaultWindow = rt.buildDefaultTimeWindow("2026-05-17T00:00:00.000Z");
      return {
        text,
        dataCompleteness: result.dataCompleteness,
        visibilityWindowCount: result.visibilityWindows.length,
        linkSelectionEventCount: result.handoverEvents.length,
        handoverCount: result.communicationStats.handoverCount,
        defaultWindowDurationMinutes:
          (Date.parse(defaultWindow.endUtc) - Date.parse(defaultWindow.startUtc)) / 60000
      };
    })()`,
    { awaitPromise: true }
  );
}

async function readMissingSourceEvidence(client, testCase) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const rt = await import("/src/features/multi-station-selector/runtime-projection.ts");
      const tier = await import("/src/features/multi-station-selector/tier-inference.ts");
      const stationA = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationA)});
      const stationB = tier.PUBLIC_REGISTRY_BY_ID.get(${JSON.stringify(testCase.stationB)});
      const missingSourcePaths = {
        LEO: "missing:leo",
        MEO: "unsupported:meo",
        GEO: "missing:geo"
      };
      const result = rt.computeRuntimeProjection({
        stationA,
        stationB,
        timeWindow: {
          startUtc: "2026-05-17T00:00:00.000Z",
          endUtc: "2026-05-17T06:00:00.000Z"
        },
        tleRecords: [],
        tleParseStats: [
          { sourceId: "tle:leo", sourcePath: "missing:leo", orbitClass: "LEO", rawRecordGroupCount: 0, parsedRecordCount: 0, parserFailureCount: 0 },
          { sourceId: "tle:meo", sourcePath: "unsupported:meo", orbitClass: "MEO", rawRecordGroupCount: 0, parsedRecordCount: 0, parserFailureCount: 0 },
          { sourceId: "tle:geo", sourcePath: "missing:geo", orbitClass: "GEO", rawRecordGroupCount: 0, parsedRecordCount: 0, parserFailureCount: 0 }
        ],
        sourcePaths: missingSourcePaths,
        rainRateMmPerHour: 0
      });
      return {
        emptyReasonCode: result.dataCompleteness.emptyReasonCode,
        fakeActorCount: result.dataCompleteness.actorSourceCoverage.fakeActorCount,
        sourceCount: result.dataCompleteness.tleSources.length,
        sources: result.dataCompleteness.tleSources.map((source) => ({
          orbitClass: source.orbitClass,
          sourcePath: source.sourcePath,
          parserFailureCount: source.parserFailureCount,
          health: source.health
        }))
      };
    })()`,
    { awaitPromise: true }
  );
}

async function readSourceModeResolutionEvidence(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const rt = await import("/src/features/multi-station-selector/runtime-projection.ts");
      const now = new Date().toISOString();
      const fakeTle = [
        "ISS (ZARYA)",
        "1 25544U 98067A   26138.00000000  .00010000  00000+0  10000-3 0  9991",
        "2 25544  51.6400 120.0000 0006000  40.0000  80.0000 15.50000000400000"
      ].join("\\n") + "\\n";
      const manifest = {
        generatedAtUtc: now,
        leo: { path: "leo-frozen.tle", recordCount: 1, epochRangeUtc: { startUtc: now, endUtc: now } },
        meo: { path: "meo-frozen.tle", recordCount: 1, epochRangeUtc: { startUtc: now, endUtc: now } },
        geo: { path: "geo-frozen.tle", recordCount: 1, epochRangeUtc: { startUtc: now, endUtc: now } }
      };
      const localPaths = {
        LEO: "/fixtures/satellites/leo-scale/starlink-2026-05-12T12-35-35Z.tle",
        MEO: "/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle",
        GEO: "/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle"
      };
      const networkPaths = new Set([
        "/fixtures/satellites-network/leo-frozen.tle",
        "/fixtures/satellites-network/meo-frozen.tle",
        "/fixtures/satellites-network/geo-frozen.tle"
      ]);
      const response = (body, status = 200) => new Response(body, {
        status,
        statusText: status === 200 ? "OK" : status === 404 ? "Not Found" : "Failure"
      });
      const runCase = async (label, fakeFetch) => {
        const sources = await rt.loadDefaultTleSources(fakeFetch);
        return {
          label,
          sourceMode: sources.sourceMode,
          sourcePaths: sources.sourcePaths,
          snapshotFetchedUtc: sources.snapshotFetchedUtc
        };
      };
      return [
        await runCase("offline-baseline", async (url) => {
          if (url.endsWith("/manifest.json")) return response("", 404);
          if (url.endsWith("/satcat-summary.json")) return response("", 404);
          if (Object.values(localPaths).includes(url)) return response(fakeTle);
          return response("", 404);
        }),
        await runCase("network-frozen-fresh", async (url) => {
          if (url.endsWith("/manifest.json")) return response(JSON.stringify(manifest));
          if (url.endsWith("/satcat-summary.json")) return response(JSON.stringify([]));
          if (networkPaths.has(url)) return response(fakeTle);
          if (Object.values(localPaths).includes(url)) return response(fakeTle);
          return response("", 404);
        }),
        await runCase("fallback-local-snapshot", async (url) => {
          if (url.endsWith("/manifest.json")) return response(JSON.stringify(manifest));
          if (url.endsWith("/satcat-summary.json")) return response(JSON.stringify([]));
          if (url.endsWith("/leo-frozen.tle")) return response("", 500);
          if (networkPaths.has(url)) return response(fakeTle);
          if (Object.values(localPaths).includes(url)) return response(fakeTle);
          return response("", 404);
        })
      ];
    })()`,
    { awaitPromise: true }
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectedSourceHealth(source, referenceUtc) {
  const sourceMs = Date.parse(source.sourceTimestampUtc);
  const epochMs = Date.parse(source.epochEndUtc);
  const referenceMs = Date.parse(referenceUtc);
  if (!Number.isFinite(referenceMs) || (!Number.isFinite(sourceMs) && !Number.isFinite(epochMs))) {
    return "unknown-age";
  }
  const anchorMs = Math.max(
    Number.isFinite(sourceMs) ? sourceMs : Number.NEGATIVE_INFINITY,
    Number.isFinite(epochMs) ? epochMs : Number.NEGATIVE_INFINITY
  );
  const ageDays = Math.max(0, (referenceMs - anchorMs) / 86400000);
  return ageDays <= source.healthThresholdDays ? "fresh" : "stale";
}

function assertCapDisclosurePayload(label, disclosure) {
  assert(disclosure, `${label}: capDisclosure missing`);
  for (const orbit of ["LEO", "MEO", "GEO"]) {
    assert(
      disclosure.perOrbitCap?.[orbit] === EXPECTED_CAP_DISCLOSURE.perOrbitCap[orbit],
      `${label}: ${orbit} cap mismatch`
    );
    assert(
      disclosure.perOrbitInventory?.[orbit] ===
        EXPECTED_CAP_DISCLOSURE.perOrbitInventory[orbit],
      `${label}: ${orbit} inventory mismatch`
    );
    assert(
      disclosure.cappedAtRuntime?.[orbit] ===
        EXPECTED_CAP_DISCLOSURE.cappedAtRuntime[orbit],
      `${label}: ${orbit} cappedAtRuntime mismatch`
    );
  }
}

function assertPairSourceAttributionPayload(label, attribution) {
  assert(attribution, `${label}: pairSourceAttribution missing`);
  assert(
    attribution.sourceTier === "public-disclosed" ||
      attribution.sourceTier === "geometric-derived",
    `${label}: pair source tier invalid`
  );
  assert(
    SOURCE_EVIDENCE_KINDS.has(attribution.evidenceKind),
    `${label}: pair source evidence kind invalid`
  );
  assert(
    typeof attribution.badgeLabel === "string" && attribution.badgeLabel.length > 0,
    `${label}: pair source badge label missing`
  );
  assert(
    Array.isArray(attribution.nonClaims),
    `${label}: pair source non-claims missing`
  );
}

function assertRuntimeInventoryDisclosurePayload(label, disclosure, data) {
  assert(disclosure?.perOrbit, `${label}: runtimeInventoryDisclosure missing`);
  for (const orbit of ["LEO", "MEO", "GEO"]) {
    const row = disclosure.perOrbit[orbit];
    const source = data.tleSources.find((candidate) => candidate.orbitClass === orbit);
    assert(row, `${label}: ${orbit} runtime inventory row missing`);
    assert(source, `${label}: ${orbit} TLE source missing for inventory parity`);
    assert(
      TLE_SOURCE_MODES.has(row.inventorySourceMode),
      `${label}: ${orbit} inventory source mode invalid`
    );
    assert(
      row.networkSnapshotInventoryCount === EXPECTED_CAP_DISCLOSURE.perOrbitInventory[orbit],
      `${label}: ${orbit} network snapshot inventory mismatch`
    );
    assert(
      row.localFallbackInventoryCount === null &&
        typeof row.localFallbackInventoryNote === "string" &&
        row.localFallbackInventoryNote.includes("not loaded"),
      `${label}: ${orbit} local fallback inventory should be unavailable`
    );
    assert(
      row.activeInventoryCount === source.recordCount,
      `${label}: ${orbit} active inventory should match source recordCount`
    );
    assert(
      row.acceptedRecordCount === source.acceptedRecordCount,
      `${label}: ${orbit} accepted inventory should match source acceptedRecordCount`
    );
    assert(
      row.runtimeCap === data.capDisclosure.perOrbitCap[orbit],
      `${label}: ${orbit} runtime cap parity mismatch`
    );
    assert(
      row.cappedAtRuntime === data.capDisclosure.cappedAtRuntime[orbit],
      `${label}: ${orbit} capped parity mismatch`
    );
    assert(
      Number.isInteger(row.visibleActorCount) && row.visibleActorCount >= 0,
      `${label}: ${orbit} visible actor count invalid`
    );
  }
}

function assertMetricAnchorDisclosurePayload(
  label,
  disclosure,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(disclosure, `${label}: metricAnchorDisclosure missing`);
  for (const [key, expected] of Object.entries(EXPECTED_METRIC_ANCHORS)) {
    assert(
      disclosure[key] === expected,
      `${label}: metric anchor ${key} mismatch`
    );
  }
  assert(
    disclosure.activePolicyId === expectedPolicyId,
    `${label}: metric anchor active policy mismatch`
  );
  assert(
    disclosure.policyThresholds?.latencyBudgetMs === 600 &&
      disclosure.policyThresholds?.hysteresisDb === 2 &&
      disclosure.policyThresholds?.minVisibilityWindowMs === 60_000 &&
      disclosure.policyThresholds?.elevationThresholdDeg === 10,
    `${label}: metric anchor policy thresholds mismatch`
  );
  assert(
    typeof disclosure.nonClaim === "string" &&
      disclosure.nonClaim.includes("not measured"),
    `${label}: metric anchor non-claim missing`
  );
}

function assertPolicyDisclosurePayload(
  label,
  disclosure,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(disclosure, `${label}: policyDisclosure missing`);
  assert(
    disclosure.activePolicyId === expectedPolicyId,
    `${label}: active policy mismatch ${disclosure.activePolicyId}`
  );
  const thresholds = disclosure.thresholds;
  assert(thresholds, `${label}: policy thresholds missing`);
  assert(
    thresholds.latencyBudgetMs === 600,
    `${label}: latency threshold mismatch`
  );
  assert(thresholds.hysteresisDb === 2, `${label}: hysteresis threshold mismatch`);
  assert(
    thresholds.minVisibilityWindowMs === 60_000,
    `${label}: min visibility threshold mismatch`
  );
  assert(
    thresholds.elevationThresholdDeg === 10,
    `${label}: policy elevation threshold mismatch`
  );
  for (const key of [
    "latencyBudgetMs",
    "hysteresisDb",
    "minVisibilityWindowMs",
    "elevationThresholdDeg"
  ]) {
    const source = disclosure.thresholdSources?.[key];
    assert(source?.truthClass === "modeled", `${label}: ${key} source truth missing`);
    assert(
      source?.sourceId === `handover-policy:${expectedPolicyId}`,
      `${label}: ${key} source id mismatch`
    );
  }
}

function assertElevationProvenanceMetadata(label, station) {
  assert(
    station.elevationSourceId === EXPECTED_ELEVATION_DATASET_ID,
    `${label}: station ${station.stationId} elevation source id mismatch`
  );
  assert(
    station.elevationSourcePath === EXPECTED_ELEVATION_SOURCE_PATH,
    `${label}: station ${station.stationId} elevation source path mismatch`
  );
  assert(
    typeof station.elevationSourceNote === "string" &&
      station.elevationSourceNote.includes("Legacy service-cache") &&
      !station.elevationSourceNote.includes("Open-Elevation"),
    `${label}: station ${station.stationId} elevation source note should be legacy-neutral`
  );
  assert(
    typeof station.elevationSourceAccessedUtc === "string" &&
      !Number.isNaN(Date.parse(station.elevationSourceAccessedUtc)),
    `${label}: station ${station.stationId} elevation source timestamp missing`
  );
  assert(
    station.elevationSourceKind === EXPECTED_ELEVATION_SOURCE_KIND,
    `${label}: station ${station.stationId} elevation source kind mismatch`
  );
  assert(
    station.elevationSourceKind !== "dem-derived",
    `${label}: station ${station.stationId} must not be dem-derived in TH3a`
  );
  assert(
    station.elevationDatasetId === EXPECTED_ELEVATION_DATASET_ID,
    `${label}: station ${station.stationId} elevation dataset id mismatch`
  );
  assert(
    station.elevationDatasetVersion === null &&
      station.elevationDatasetResolutionM === null &&
      station.elevationVerticalDatum === null &&
      station.elevationTileId === null &&
      station.elevationCellId === null,
    `${label}: station ${station.stationId} legacy DEM fields should remain null`
  );
  assert(
    Number.isFinite(station.elevationSampleLat) &&
      Number.isFinite(station.elevationSampleLon),
    `${label}: station ${station.stationId} elevation sample coordinate missing`
  );
  assert(
    station.elevationSamplingMethod === EXPECTED_ELEVATION_SAMPLING_METHOD,
    `${label}: station ${station.stationId} elevation sampling method mismatch`
  );
  assert(
    station.elevationSampledAtUtc === station.elevationSourceAccessedUtc &&
      station.elevationCacheGeneratedUtc === station.elevationSourceAccessedUtc,
    `${label}: station ${station.stationId} elevation timestamps should mirror source access`
  );
  assert(
    station.elevationLicenseId === EXPECTED_ELEVATION_LICENSE_ID &&
      station.elevationLicenseUrl === null,
    `${label}: station ${station.stationId} elevation license metadata mismatch`
  );
  assert(
    typeof station.elevationCitation === "string" &&
      station.elevationCitation.includes("Legacy elevation service cache") &&
      station.elevationCitation.includes("not verified"),
    `${label}: station ${station.stationId} elevation citation missing`
  );
  assert(
    station.elevationProvenanceStatus === EXPECTED_ELEVATION_PROVENANCE_STATUS,
    `${label}: station ${station.stationId} elevation provenance status mismatch`
  );
  assert(
    typeof station.elevationNonClaim === "string" &&
      station.elevationNonClaim.includes("upstream DEM") &&
      station.elevationNonClaim.includes("vertical datum") &&
      !station.elevationNonClaim.includes("Open-Elevation"),
    `${label}: station ${station.stationId} elevation non-claim missing`
  );
}

function assertStationSourceMetadata(label, station) {
  assert(
    COORDINATE_SOURCE_AUTHORITIES.has(station.coordinateSourceAuthority),
    `${label}: station ${station.stationId} coordinate source authority invalid`
  );
  assert(
    typeof station.coordinateSourceNote === "string" &&
      station.coordinateSourceNote.length > 0,
    `${label}: station ${station.stationId} coordinate source note missing`
  );
  assert(
    station.coordinateSourceUrl === null ||
      typeof station.coordinateSourceUrl === "string",
    `${label}: station ${station.stationId} coordinate source URL invalid`
  );
  assertElevationProvenanceMetadata(label, station);
  assert(
    station.terrainMaskSourceId === EXPECTED_TERRAIN_MASK_SOURCE_ID,
    `${label}: station ${station.stationId} terrain mask source mismatch`
  );
  assert(
    station.terrainMaskIsDefault === (station.terrainMaskDeg === 0),
    `${label}: station ${station.stationId} terrain mask default flag mismatch`
  );
  assert(
    typeof station.terrainMaskNote === "string" &&
      station.terrainMaskNote.includes("site-specific horizon mask"),
    `${label}: station ${station.stationId} terrain mask note missing`
  );
}

const ELEVATION_METADATA_FIELDS = [
  "elevationSourceId",
  "elevationSourcePath",
  "elevationSourceNote",
  "elevationSourceAccessedUtc",
  "elevationSourceKind",
  "elevationDatasetId",
  "elevationDatasetVersion",
  "elevationDatasetResolutionM",
  "elevationVerticalDatum",
  "elevationTileId",
  "elevationCellId",
  "elevationSampleLat",
  "elevationSampleLon",
  "elevationSamplingMethod",
  "elevationSampledAtUtc",
  "elevationCacheGeneratedUtc",
  "elevationLicenseId",
  "elevationLicenseUrl",
  "elevationCitation",
  "elevationProvenanceStatus",
  "elevationNonClaim"
];

function assertElevationMetadataParity(label, actual, expected, context) {
  assert(
    actual.elevationM === expected.elevationM,
    `${label}: ${context} elevationM mismatch`
  );
  for (const field of ELEVATION_METADATA_FIELDS) {
    assert(
      actual[field] === expected[field],
      `${label}: ${context} ${field} mismatch`
    );
  }
}

function assertA8UnavailablePlaceholders(label, data) {
  const breakdown = data.rfChainBreakdown;
  assert(breakdown, `${label}: RF chain breakdown missing`);
  assert(
    breakdown.carrierBand === null &&
      breakdown.carrierFrequencyGHz === null &&
      breakdown.receivedPowerProxyDbm === null,
    `${label}: RF chain should expose unavailable carrier/power fields`
  );
  assert(
    breakdown.provenance?.truthClass === "unavailable",
    `${label}: RF chain provenance should be unavailable`
  );
  assert(
    Array.isArray(breakdown.terms) &&
      breakdown.terms.length === EXPECTED_RF_CHAIN_TERM_KINDS.length,
    `${label}: RF chain term count mismatch`
  );
  for (const [index, term] of breakdown.terms.entries()) {
    assert(
      term.kind === EXPECTED_RF_CHAIN_TERM_KINDS[index],
      `${label}: RF chain term order mismatch at ${index}`
    );
    assert(
      term.contributionSignedDb === null &&
        term.provenance?.truthClass === "unavailable" &&
        term.provenance?.sourceId === EXPECTED_RF_FIELD_SOURCE_ID,
      `${label}: RF chain term ${term.kind} should be unavailable`
    );
    assert(
      Array.isArray(term.standardsRef) &&
        term.standardsRef.length > 0 &&
        term.nonClaim,
      `${label}: RF chain term ${term.kind} metadata incomplete`
    );
  }

  assert(
    Array.isArray(data.atmosphericLookups) &&
      data.atmosphericLookups.length === EXPECTED_ATMOSPHERIC_LOOKUP_SOURCES.length,
    `${label}: atmospheric lookup placeholder count mismatch`
  );
  for (const source of EXPECTED_ATMOSPHERIC_LOOKUP_SOURCES) {
    const lookup = data.atmosphericLookups.find((entry) => entry.source === source);
    assert(lookup, `${label}: missing atmospheric lookup ${source}`);
    assert(
      lookup.midpointLatDeg === null &&
        lookup.midpointLonDeg === null &&
        lookup.cellLatDeg === null &&
        lookup.cellLonDeg === null &&
        lookup.lookupValue === null &&
        lookup.lookupUnit === null &&
        lookup.interpolation === "unavailable" &&
        lookup.provenance?.truthClass === "unavailable",
      `${label}: atmospheric lookup ${source} should be unavailable`
    );
  }

  assert(
    Array.isArray(data.stationRfProfiles) && data.stationRfProfiles.length === 2,
    `${label}: station RF profiles missing`
  );
  const precisionById = new Map(
    data.stationPrecision.map((station) => [station.stationId, station])
  );
  for (const profile of data.stationRfProfiles) {
    const precision = precisionById.get(profile.stationId);
    assert(precision, `${label}: station RF profile ${profile.stationId} has no precision row`);
    assertElevationMetadataParity(
      label,
      profile,
      precision,
      `station RF profile ${profile.stationId}`
    );
    assert(
      profile.terrainMaskDeg === precision.terrainMaskDeg &&
        profile.terrainMaskSourceId === precision.terrainMaskSourceId &&
        profile.terrainMaskIsDefault === precision.terrainMaskIsDefault,
      `${label}: station RF profile ${profile.stationId} station truth mismatch`
    );
    assert(
      profile.antennaDiameterM === null &&
        profile.antennaDiameterSourceId === EXPECTED_RF_FIELD_SOURCE_ID &&
        profile.peakEirpDbm === null &&
        profile.peakEirpSourceId === EXPECTED_RF_FIELD_SOURCE_ID &&
        profile.txPolarization === null &&
        profile.txPolarizationSourceId === EXPECTED_RF_FIELD_SOURCE_ID &&
        profile.provenance?.truthClass === "unavailable",
      `${label}: station RF profile ${profile.stationId} RF fields should be unavailable`
    );
  }
}

function assertDataCompletenessShape(
  label,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state?.hasCapture, `${label}: missing capture seam`);
  assert(state?.hasController, `${label}: missing controller`);
  const overlay = state.overlay;
  const data = overlay?.dataCompleteness;
  assert(data, `${label}: missing dataCompleteness debug payload`);
  assert(data.routeMode === RUNTIME_MODE, `${label}: wrong routeMode ${data.routeMode}`);
  assertPairSourceAttributionPayload(label, data.pairSourceAttribution);
  assert(data.actorSourceCoverage?.fakeActorCount === 0, `${label}: fake actor count is not zero`);
  assert(Array.isArray(data.tleSources) && data.tleSources.length === 3, `${label}: expected 3 TLE sources`);
  assert(
    Array.isArray(data.tleFreshness) && data.tleFreshness.length === 3,
    `${label}: expected 3 TLE freshness rows`
  );
  assertCapDisclosurePayload(label, data.capDisclosure);
  assertRuntimeInventoryDisclosurePayload(
    label,
    data.runtimeInventoryDisclosure,
    data
  );
  assertMetricAnchorDisclosurePayload(
    label,
    data.metricAnchorDisclosure,
    expectedPolicyId
  );
  assertPolicyDisclosurePayload(label, data.policyDisclosure, expectedPolicyId);
  assertA8UnavailablePlaceholders(label, data);
  for (const freshness of data.tleFreshness) {
    assert(
      TLE_SOURCE_MODES.has(freshness.sourceMode),
      `${label}: invalid TLE sourceMode ${freshness.sourceMode}`
    );
    assert(freshness.snapshotPath, `${label}: TLE freshness snapshot path missing`);
    assert(freshness.maxEpochUtc, `${label}: TLE freshness max epoch missing`);
    assert(
      Array.isArray(freshness.noradIdRangeSummary) &&
        freshness.noradIdRangeSummary.length > 0,
      `${label}: TLE freshness NORAD summary missing`
    );
    assert(
      freshness.constellationMembership &&
        typeof freshness.constellationMembership === "object",
      `${label}: TLE freshness membership payload missing`
    );
  }
  const hasSatcatMembership = data.tleFreshness.some(
    (freshness) => Object.keys(freshness.constellationMembership).length > 0
  );
  assert(hasSatcatMembership, `${label}: SATCAT constellation membership missing`);
  assert(
    data.tleSources.every((source) => source.health && source.sourceTimestampUtc),
    `${label}: source health/timestamp missing`
  );
  const thresholdByOrbit = { LEO: 14, MEO: 30, GEO: 30 };
  for (const source of data.tleSources) {
    assert(
      source.healthThresholdDays === thresholdByOrbit[source.orbitClass],
      `${label}: ${source.orbitClass} freshness threshold mismatch`
    );
    assert(source.epochEndUtc, `${label}: ${source.orbitClass} epoch end missing`);
    assert(
      source.health === expectedSourceHealth(source, "2026-05-17T00:00:00.000Z"),
      `${label}: ${source.orbitClass} health not based on max source/epoch date`
    );
    assert(
      Number.isInteger(source.sgp4ErrorCount) && source.sgp4ErrorCount >= 0,
      `${label}: ${source.orbitClass} SGP4 error count missing`
    );
    assert(
      Array.isArray(source.noradIdRangeSummary) && source.noradIdRangeSummary.length > 0,
      `${label}: ${source.orbitClass} NORAD range summary missing`
    );
    assert(
      Number.isInteger(source.cosparDesignatorCount) &&
        source.cosparDesignatorCount > 0 &&
        Array.isArray(source.cosparDesignatorSamples) &&
        source.cosparDesignatorSamples.length > 0,
      `${label}: ${source.orbitClass} COSPAR exposure missing`
    );
    assert(
      source.classificationCounts && Object.keys(source.classificationCounts).length > 0,
      `${label}: ${source.orbitClass} classification counts missing`
    );
    assert(
      source.dragTermFieldCoverage?.meanMotionFirstDerivativeCount > 0 &&
        source.dragTermFieldCoverage?.meanMotionSecondDerivativeCount > 0 &&
        source.dragTermFieldCoverage?.bstarDragTermCount > 0,
      `${label}: ${source.orbitClass} drag-term coverage missing`
    );
  }
  assert(
    data.visibilityCadenceSecondsByOrbit?.LEO === 30 &&
      data.visibilityCadenceSecondsByOrbit?.MEO === 60 &&
      data.visibilityCadenceSecondsByOrbit?.GEO === 120,
    `${label}: per-orbit visibility cadence mismatch`
  );
  assert(
    Array.isArray(data.stationPrecision) && data.stationPrecision.length === 2,
    `${label}: station precision payload missing`
  );
  assert(
    data.stationPrecision.every((station) => station.stationId && station.disclosurePrecision),
    `${label}: station precision row incomplete`
  );
  const baseElevationThresholdDeg = Number(
    data.modeledOutputs?.find((output) => output.kind === "handover")
      ?.inputSummary?.baseElevationThresholdDeg
  );
  assert(
    Number.isFinite(baseElevationThresholdDeg),
    `${label}: base elevation threshold missing`
  );
  for (const station of data.stationPrecision) {
    assert(
      Number.isInteger(station.elevationM),
      `${label}: station ${station.stationId} elevationM is not an integer`
    );
    assert(
      Number.isInteger(station.terrainMaskDeg) &&
        station.terrainMaskDeg >= 0 &&
        station.terrainMaskDeg <= 90,
      `${label}: station ${station.stationId} terrainMaskDeg is not 0..90`
    );
    assert(
      Number.isFinite(station.effectiveElevationThresholdDeg),
      `${label}: station ${station.stationId} effective threshold missing`
    );
    assert(
      station.effectiveElevationThresholdDeg ===
        baseElevationThresholdDeg + station.terrainMaskDeg,
      `${label}: station ${station.stationId} effective threshold mismatch`
    );
    assertStationSourceMetadata(label, station);
  }
  assert(
    Array.isArray(data.actorProvenance),
    `${label}: actor provenance payload missing`
  );
  if (data.actorSourceCoverage.renderedActorCount > 0) {
    assert(
      data.actorProvenance.length === data.actorSourceCoverage.renderedActorCount,
      `${label}: actor provenance count mismatch`
    );
    assert(
      data.actorProvenance.every(
        (actor) =>
          actor.satelliteId &&
          actor.sourceId &&
          actor.propagatedSampleCount > 0 &&
          actor.sampleCadenceSeconds > 0 &&
          actor.firstPropagatedUtc &&
          actor.lastPropagatedUtc
      ),
      `${label}: actor provenance row incomplete`
    );
    assert(
      data.actorProvenance.every(
        (actor) =>
          actor.sampleCadenceSeconds ===
          data.visibilityCadenceSecondsByOrbit[actor.orbitClass]
      ),
      `${label}: actor sample cadence does not match orbit cadence`
    );
  }
  assert(
    Array.isArray(data.visibilityProvenance),
    `${label}: visibility provenance payload missing`
  );
  if (data.visibilityProvenance.length > 0) {
    assert(
      data.visibilityProvenance.every(
        (row) =>
          row.satelliteId &&
          row.sourceId &&
          row.stationAWindowSource &&
          row.stationBWindowSource &&
          row.pairIntersectionSource &&
          row.sampleCadenceSeconds > 0
      ),
      `${label}: visibility provenance row incomplete`
    );
    assert(
      data.visibilityProvenance.every(
        (row) =>
          row.sampleCadenceSeconds ===
          data.visibilityCadenceSecondsByOrbit[row.orbitClass]
      ),
      `${label}: visibility sample cadence does not match orbit cadence`
    );
  }
  const outputKinds = new Set(data.modeledOutputs?.map((output) => output.kind));
  for (const kind of ["handover", "link-budget", "throughput", "jitter", "latency", "rain-impact"]) {
    assert(outputKinds.has(kind), `${label}: missing modeled output ${kind}`);
  }
  const handoverOutput = data.modeledOutputs.find((output) => output.kind === "handover");
  assert(
    handoverOutput?.inputSummary?.activePolicyId === expectedPolicyId,
    `${label}: handover modeled output policy mismatch`
  );
  assert(
    data.modeledOutputs.every(
      (output) =>
        output.modelId &&
        output.inputSummary &&
        output.outputUnit !== undefined &&
        output.nonClaim
    ),
    `${label}: modeled output metadata incomplete`
  );
  const modeledInputSummaries = new Set(
    data.modeledOutputs.map((output) => JSON.stringify(output.inputSummary))
  );
  assert(
    modeledInputSummaries.size === data.modeledOutputs.length,
    `${label}: modeled output inputSummary objects are not per-output`
  );
  const transformIds = new Set(data.displayTransforms?.map((entry) => entry.sourceId));
  for (const sourceId of [
    "selected-pair-scene-altitude-compression",
    "selected-pair-scene-camera-framing",
    "selected-pair-scene-label-density",
    "selected-pair-scene-display-lane-offset",
    "selected-pair-scene-generic-actor-mesh"
  ]) {
    assert(transformIds.has(sourceId), `${label}: missing display transform ${sourceId}`);
  }
  const transformById = new Map(data.displayTransforms.map((entry) => [entry.sourceId, entry]));
  assert(
    transformById.get("selected-pair-scene-camera-framing")?.inputSummary?.pairGeometry ===
      state.overlay.pairGeometry,
    `${label}: camera hint not reflected in display transform payload`
  );
  assert(
    Number(transformById.get("selected-pair-scene-altitude-compression")?.inputSummary?.factor) > 0,
    `${label}: altitude compression transform missing dynamic factor`
  );
  assert(
    Number(transformById.get("selected-pair-scene-label-density")?.inputSummary?.maxVisibleActorLabels) > 0,
    `${label}: label-density transform missing dynamic label limit`
  );
}

function assertStationPrecisionFooterDataset(testCase, state) {
  assert(state.footer?.stationAId === testCase.stationA, `${testCase.label}: footer station A missing`);
  assert(state.footer?.stationBId === testCase.stationB, `${testCase.label}: footer station B missing`);
  const stationsById = new Map(
    state.overlay?.dataCompleteness?.stationPrecision?.map((station) => [
      station.stationId,
      station
    ]) ?? []
  );
  for (const slot of ["A", "B"]) {
    const stationId = state.footer?.[`station${slot}Id`];
    const expected = stationsById.get(stationId);
    const elevationM = Number(state.footer?.[`station${slot}ElevationM`]);
    const terrainMaskDeg = Number(state.footer?.[`station${slot}TerrainMaskDeg`]);
    const effectiveElevationThresholdDeg = Number(
      state.footer?.[`station${slot}EffectiveElevationThresholdDeg`]
    );
    const terrainMaskSourceId =
      state.footer?.[`station${slot}TerrainMaskSourceId`];
    const terrainMaskIsDefault =
      state.footer?.[`station${slot}TerrainMaskIsDefault`];
    assert(expected, `${testCase.label}: footer station ${slot} missing debug match`);
    assert(
      Number.isInteger(elevationM) && elevationM === expected.elevationM,
      `${testCase.label}: footer station ${slot} elevationM missing`
    );
    assert(
      ELEVATION_METADATA_FIELDS.every((field) => {
        const footerKey = `station${slot}${field[0].toUpperCase()}${field.slice(1)}`;
        return state.footer?.[footerKey] === csvCellValue(expected[field]);
      }),
      `${testCase.label}: footer station ${slot} elevation metadata mismatch`
    );
    assert(
      Number.isInteger(terrainMaskDeg) &&
        terrainMaskDeg >= 0 &&
        terrainMaskDeg <= 90 &&
        terrainMaskDeg === expected.terrainMaskDeg,
      `${testCase.label}: footer station ${slot} terrainMaskDeg missing`
    );
    assert(
      terrainMaskSourceId === expected.terrainMaskSourceId &&
        terrainMaskIsDefault === String(expected.terrainMaskIsDefault),
      `${testCase.label}: footer station ${slot} terrain mask source missing`
    );
    assert(
      Number.isFinite(effectiveElevationThresholdDeg) &&
        effectiveElevationThresholdDeg === expected.effectiveElevationThresholdDeg,
      `${testCase.label}: footer station ${slot} effective threshold missing`
    );
    assert(
      state.footer?.[`station${slot}CoordinateSourceAuthority`] ===
        expected.coordinateSourceAuthority,
      `${testCase.label}: footer station ${slot} coordinate authority mismatch`
    );
    if (expected.coordinateSourceUrl) {
      assert(
        state.footer?.[`station${slot}CoordinateSourceUrl`] ===
          expected.coordinateSourceUrl,
        `${testCase.label}: footer station ${slot} coordinate source URL mismatch`
      );
    }
    if (expected.coordinateSourceNote.length <= 180) {
      assert(
        state.footer?.[`station${slot}CoordinateSourceNote`] ===
          expected.coordinateSourceNote,
        `${testCase.label}: footer station ${slot} coordinate source note mismatch`
      );
    }
  }
}

function assertStationCoordinateSourceDisclosure(testCase, state) {
  assert(
    state.stationCoordinateSourceDisclosure,
    `${testCase.label}: Row 5 station coordinate source block missing`
  );
  assert(
    (state.stationCoordinateSourceDisclosure.text ?? "").includes(
      "Coordinate precision describes coordinate use"
    ) &&
      (state.stationCoordinateSourceDisclosure.text ?? "").includes(
        "coordinate source authority"
      ),
    `${testCase.label}: Row 5 coordinate source distinction missing`
  );
  for (const station of state.overlay.dataCompleteness.stationPrecision) {
    assert(
      (state.stationCoordinateSourceDisclosure.text ?? "").includes(station.stationId) &&
        (state.stationCoordinateSourceDisclosure.text ?? "").includes(
          station.coordinateSourceAuthority
        ),
      `${testCase.label}: Row 5 coordinate authority missing for ${station.stationId}`
    );
  }
  assert(
    (state.footer?.text ?? "").includes("precision != coord authority") ||
      (state.footer?.stationACoordinateSourceAuthority &&
        state.footer?.stationBCoordinateSourceAuthority),
    `${testCase.label}: Row 6 coordinate authority distinction missing`
  );
}

function assertSourceAttributionParity(testCase, state) {
  const attribution = state.overlay?.dataCompleteness?.pairSourceAttribution;
  assertPairSourceAttributionPayload(testCase.label, attribution);
  assert(
    state.panel?.sourceTier === attribution.sourceTier &&
      state.panel?.sourceEvidenceKind === attribution.evidenceKind &&
      state.panel?.sourceBadgeLabel === attribution.badgeLabel,
    `${testCase.label}: panel source attribution must match debug payload`
  );
  assert(
    state.footer?.sourceTier === attribution.sourceTier &&
      state.footer?.evidenceKind === attribution.evidenceKind &&
      state.footer?.badgeLabel === attribution.badgeLabel,
    `${testCase.label}: footer source attribution must match debug payload`
  );
  assert(
    state.overlay.dataCompleteness.stationPrecision.every(
      (station) => station.sourceTier === attribution.sourceTier
    ),
    `${testCase.label}: station precision rows should inherit pair source tier`
  );

  const expectedEvidenceKind = expectedSourceEvidenceKindForCase(testCase);
  if (!expectedEvidenceKind) {
    return;
  }
  assert(
    attribution.evidenceKind === expectedEvidenceKind,
    `${testCase.label}: expected ${expectedEvidenceKind}, received ${attribution.evidenceKind}`
  );
  if (expectedEvidenceKind === "same-operator-family-inferred") {
    assert(
      attribution.sourceTier === "geometric-derived" &&
        /no pair attestation/i.test(attribution.badgeLabel),
      `${testCase.label}: same-family inference should remain geometric-derived`
    );
    assert(
      (state.sourcesDisclosureText ?? "").includes("Same operator family is an inference") &&
        (state.sourcesDisclosureText ?? "").includes("not pair-level routing") &&
        (state.sourcesDisclosureText ?? "").includes("operator attestation"),
      `${testCase.label}: Row 5 non-claim should narrow same-family claim`
    );
  }
  if (expectedEvidenceKind === "cross-family-geometric") {
    assert(
      attribution.sourceTier === "geometric-derived" &&
        /visibility-derived only/i.test(attribution.badgeLabel),
      `${testCase.label}: cross-family pair should remain geometric-derived`
    );
  }
}

function assertRow5DisclosureDatasets(
  label,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state.capDisclosure, `${label}: Row 5 cap disclosure missing`);
  assert(state.policyDisclosure, `${label}: Row 5 policy disclosure missing`);
  assert(
    state.metricAnchorDisclosure,
    `${label}: Row 5 metric anchor disclosure missing`
  );
  const data = state.overlay?.dataCompleteness;
  assert(data?.runtimeInventoryDisclosure?.perOrbit, `${label}: debug inventory missing`);

  const capDataset = state.capDisclosure.dataset;
  for (const orbit of ["leo", "meo", "geo"]) {
    const key = orbit.toUpperCase();
    const inventory = data.runtimeInventoryDisclosure.perOrbit[key];
    assert(inventory, `${label}: ${key} debug inventory row missing`);
    assert(
      Number.parseInt(capDataset[`${orbit}Cap`], 10) ===
        data.capDisclosure.perOrbitCap[key],
      `${label}: Row 5 ${key} cap dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}Inventory`], 10) ===
        data.capDisclosure.perOrbitInventory[key],
      `${label}: Row 5 ${key} inventory dataset mismatch`
    );
    assert(
      capDataset[`${orbit}CappedAtRuntime`] ===
        String(data.capDisclosure.cappedAtRuntime[key]),
      `${label}: Row 5 ${key} capped dataset mismatch`
    );
    assert(
      capDataset[`${orbit}InventorySourceMode`] === inventory.inventorySourceMode &&
        TLE_SOURCE_MODES.has(inventory.inventorySourceMode),
      `${label}: Row 5 ${key} source mode dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}NetworkSnapshotInventoryCount`], 10) ===
        inventory.networkSnapshotInventoryCount,
      `${label}: Row 5 ${key} network inventory dataset mismatch`
    );
    assert(
      inventory.networkSnapshotInventoryCount ===
        EXPECTED_CAP_DISCLOSURE.perOrbitInventory[key],
      `${label}: Row 5 ${key} network inventory fixture mismatch`
    );
    assert(
      capDataset[`${orbit}LocalFallbackInventoryCount`] ===
        csvCellValue(inventory.localFallbackInventoryCount),
      `${label}: Row 5 ${key} local fallback inventory should be unavailable`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}ActiveInventoryCount`], 10) ===
        inventory.activeInventoryCount,
      `${label}: Row 5 ${key} active inventory dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}AcceptedRecordCount`], 10) ===
        inventory.acceptedRecordCount,
      `${label}: Row 5 ${key} accepted record dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}RuntimeCap`], 10) ===
        inventory.runtimeCap,
      `${label}: Row 5 ${key} runtime cap dataset mismatch`
    );
    assert(
      Number.parseInt(capDataset[`${orbit}VisibleActorCount`], 10) ===
        inventory.visibleActorCount,
      `${label}: Row 5 ${key} visible actor dataset mismatch`
    );
  }
  const leoInventory = data.runtimeInventoryDisclosure.perOrbit.LEO;
  const expectedLeoText =
    `LEO: source ${leoInventory.inventorySourceMode} · ` +
    `network ${inventoryTextValue(leoInventory.networkSnapshotInventoryCount)} · ` +
    `local fallback ${inventoryTextValue(leoInventory.localFallbackInventoryCount)} · ` +
    `active ${leoInventory.activeInventoryCount} · ` +
    `accepted ${leoInventory.acceptedRecordCount} · ` +
    `cap ${leoInventory.runtimeCap} · ` +
    `${leoInventory.cappedAtRuntime ? "capped" : "uncapped"} · ` +
    `visible ${leoInventory.visibleActorCount}`;
  assert(
    state.capDisclosure.text.includes(expectedLeoText),
    `${label}: Row 5 inventory text missing LEO count breakdown`
  );

  const policyDataset = state.policyDisclosure.dataset;
  assert(
    policyDataset.activePolicyId === expectedPolicyId,
    `${label}: Row 5 active policy dataset mismatch`
  );
  assert(
    Number.parseInt(policyDataset.latencyBudgetMs, 10) === 600,
    `${label}: Row 5 latency dataset mismatch`
  );
  assert(
    Number.parseInt(policyDataset.minVisibilityWindowMs, 10) === 60_000,
    `${label}: Row 5 min visibility dataset mismatch`
  );
  assert(
    Number(policyDataset.hysteresisDb) === 2,
    `${label}: Row 5 hysteresis dataset mismatch`
  );
  assert(
    Number(policyDataset.elevationThresholdDeg) === 10,
    `${label}: Row 5 elevation dataset mismatch`
  );
  assert(
    state.policyDisclosure.text.includes(expectedPolicyId),
    `${label}: Row 5 policy text missing active id`
  );

  const metricDataset = state.metricAnchorDisclosure.dataset;
  for (const [key, expected] of Object.entries(EXPECTED_METRIC_ANCHORS)) {
    assert(
      metricDataset[key] === expected,
      `${label}: Row 5 metric ${key} dataset mismatch`
    );
    assert(
      state.metricAnchorDisclosure.text.includes(expected),
      `${label}: Row 5 metric ${key} text missing`
    );
  }
  assert(
    metricDataset.activePolicyId === expectedPolicyId,
    `${label}: Row 5 metric active policy dataset mismatch`
  );
}

function assertTleChipVisualBand(label, state) {
  const sourceMode = state.chip?.sourceMode;
  const backgroundColor = state.chip?.backgroundColor ?? "";
  assert(TLE_SOURCE_MODES.has(sourceMode), `${label}: TLE chip source mode missing`);
  const expectedRgbByMode = {
    "network-snapshot": "19, 83, 58",
    "fallback-local-snapshot": "110, 76, 21",
    "local-snapshot": "6, 18, 28"
  };
  assert(
    backgroundColor.includes(expectedRgbByMode[sourceMode]),
    `${label}: TLE chip background ${backgroundColor} does not match ${sourceMode}`
  );
}

function assertDefaultComparisonHidden(label, state) {
  assert(
    (state.comparePanes ?? []).length === 0,
    `${label}: compare panes should be hidden without compare param`
  );
}

function assertPreWave2ComparisonVisible(label, state) {
  const panes = state.comparePanes ?? [];
  const paneKeys = new Set(panes.map((pane) => `${pane.row}:${pane.pane}`));
  for (const row of ["3", "4"]) {
    assert(
      paneKeys.has(`${row}:current`) && paneKeys.has(`${row}:pre-wave-2`),
      `${label}: missing compare panes for row ${row}`
    );
  }
  assert(
    state.panel?.compareMode === "pre-wave-2",
    `${label}: panel compare mode missing`
  );
  assert(
    panes.some((pane) => pane.text.includes("Pre-wave-2")) &&
      panes.some((pane) => pane.text.includes("Current")),
    `${label}: compare pane labels missing`
  );
  assert(
    panes.some((pane) => pane.row === "4" && pane.text.includes("ASIASTAR")),
    `${label}: pre-wave-2 event baseline missing`
  );
}

function assertExpectedStationPrecision(testCase, data) {
  const stationsById = new Map(
    data.stationPrecision.map((station) => [station.stationId, station])
  );
  for (const expected of testCase.expectedStationPrecision ?? []) {
    const actual = stationsById.get(expected.stationId);
    assert(actual, `${testCase.label}: missing station precision ${expected.stationId}`);
    assert(
      actual.elevationM === expected.elevationM,
      `${testCase.label}: station ${expected.stationId} elevationM expected ${expected.elevationM}, received ${actual.elevationM}`
    );
    assert(
      actual.terrainMaskDeg === expected.terrainMaskDeg,
      `${testCase.label}: station ${expected.stationId} terrainMaskDeg expected ${expected.terrainMaskDeg}, received ${actual.terrainMaskDeg}`
    );
    assert(
      actual.effectiveElevationThresholdDeg === 10 + expected.terrainMaskDeg,
      `${testCase.label}: station ${expected.stationId} effective threshold mismatch`
    );
  }
}

function assertReadyCase(
  testCase,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state, expectedPolicyId);
  assertExpectedStationPrecision(testCase, state.overlay.dataCompleteness);
  assert(state.panel?.routeMode === RUNTIME_MODE, `${testCase.label}: panel route mode missing`);
  assert(
    state.panel?.activePolicyId === expectedPolicyId,
    `${testCase.label}: panel active policy missing`
  );
  assertStationPrecisionFooterDataset(testCase, state);
  assertStationCoordinateSourceDisclosure(testCase, state);
  assertRow5DisclosureDatasets(testCase.label, state, expectedPolicyId);
  assertSourceAttributionParity(testCase, state);
  assert(state.chip?.sourceCount === "3", `${testCase.label}: TLE chip source count missing`);
  assert(state.chip?.sourceHealth, `${testCase.label}: TLE chip source health missing`);
  assertTleChipVisualBand(testCase.label, state);
  if (!testCase.compare) {
    assertDefaultComparisonHidden(testCase.label, state);
  }
  assert(
    TLE_SOURCE_MODES.has(state.chip?.sourceMode),
    `${testCase.label}: TLE chip sourceMode missing`
  );
  if (
    state.chip?.sourceMode === "network-snapshot" ||
    state.chip?.sourceMode === "fallback-local-snapshot"
  ) {
    assert(
      state.chip?.tleAttribution === "CelesTrak",
      `${testCase.label}: TLE chip CelesTrak attribution missing`
    );
    assert(
      state.sourcesDisclosureText.includes("CelesTrak"),
      `${testCase.label}: Row 5 sources disclosure CelesTrak attribution missing`
    );
  }
  const parserFailureCount = state.overlay.dataCompleteness.tleSources.reduce(
    (total, source) => total + (source.parserFailureCount ?? 0),
    0
  );
  assert(
    state.chip?.parserFailureCount === String(parserFailureCount),
    `${testCase.label}: TLE chip parser failure count mismatch`
  );
}

function assertEmptyCase(
  testCase,
  state,
  expectedPolicyId = DEFAULT_HANDOVER_POLICY_ID
) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state, expectedPolicyId);
  assertExpectedStationPrecision(testCase, state.overlay.dataCompleteness);
  assertStationPrecisionFooterDataset(testCase, state);
  assertStationCoordinateSourceDisclosure(testCase, state);
  assertRow5DisclosureDatasets(testCase.label, state, expectedPolicyId);
  assertSourceAttributionParity(testCase, state);
  assertTleChipVisualBand(testCase.label, state);
  if (!testCase.compare) {
    assertDefaultComparisonHidden(testCase.label, state);
  }
  assert(
    state.overlay.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: expected empty reason ${testCase.expectedEmptyReasonCode}, received ${state.overlay.emptyReasonCode}`
  );
  assert(
    state.overlay.dataCompleteness.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: debug empty reason mismatch`
  );
}

function visibilityDeltaSummary(testCase, actualCount) {
  const baseline = testCase.baselineVisibilityWindowCount;
  const delta = actualCount - baseline;
  const deltaPct =
    baseline === 0
      ? (actualCount === 0 ? 0 : Number.POSITIVE_INFINITY)
      : delta / baseline;
  return {
    baselineVisibilityWindowCount: baseline,
    visibilityWindowCount: actualCount,
    visibilityWindowDelta: delta,
    visibilityWindowDeltaPct: Number.isFinite(deltaPct)
      ? Number(deltaPct.toFixed(3))
      : "inf"
  };
}

function assertVisibilityDeltaWithinTolerance(testCase, actualCount) {
  const summary = visibilityDeltaSummary(testCase, actualCount);
  if (testCase.baselineVisibilityWindowCount === 0) {
    assert(
      actualCount === 0,
      `${testCase.label}: visibility window count changed from zero baseline to ${actualCount}`
    );
    return summary;
  }
  assert(
    Math.abs(summary.visibilityWindowDeltaPct) <= 0.5,
    `${testCase.label}: visibility window delta exceeds 50% baseline (${summary.visibilityWindowDeltaPct})`
  );
  return summary;
}

function assertCsvEvidence(label, evidence) {
  assert(evidence?.text, `${label}: CSV text missing`);
  const data = evidence.dataCompleteness;
  assert(data, `${label}: CSV reference payload missing`);
  const sections = parseCsvSections(evidence.text);

  const pairSourceAttribution = requireCsvSection(
    sections,
    "# Pair source attribution",
    label
  );
  const pairSourceByField = new Map(
    pairSourceAttribution.rows.map((row) => [row.field, row.value])
  );
  assert(
    pairSourceByField.get("sourceTier") === data.pairSourceAttribution.sourceTier,
    `${label}: CSV pair source tier mismatch`
  );
  assert(
    pairSourceByField.get("evidenceKind") ===
      data.pairSourceAttribution.evidenceKind,
    `${label}: CSV pair source evidence kind mismatch`
  );
  assert(
    pairSourceByField.get("badgeLabel") === data.pairSourceAttribution.badgeLabel,
    `${label}: CSV pair source badge label mismatch`
  );
  assert(
    pairSourceByField.get("nonClaims") ===
      JSON.stringify(data.pairSourceAttribution.nonClaims),
    `${label}: CSV pair source non-claims mismatch`
  );

  const sourceManifest = requireCsvSection(sections, "# TLE source manifest", label);
  assert(
    sourceManifest.rows.length === data.tleSources.length,
    `${label}: CSV source manifest row count mismatch`
  );
  const sourcesById = new Map(sourceManifest.rows.map((row) => [row.sourceId, row]));
  for (const source of data.tleSources) {
    const row = sourcesById.get(source.sourceId);
    assert(row, `${label}: CSV missing source row ${source.sourceId}`);
    assert(row.sourcePath === source.sourcePath, `${label}: CSV source path mismatch`);
    assert(row.orbitClass === source.orbitClass, `${label}: CSV orbit class mismatch`);
    assert(row.recordCount === csvCellValue(source.recordCount), `${label}: CSV record count mismatch`);
    assert(
      row.acceptedRecordCount === csvCellValue(source.acceptedRecordCount),
      `${label}: CSV accepted count mismatch`
    );
    assert(
      row.parserFailureCount === csvCellValue(source.parserFailureCount),
      `${label}: CSV parser failure count mismatch`
    );
    assert(
      row.excludedReasonCategories === source.excludedReasonCategories.join("|"),
      `${label}: CSV excluded reason mismatch`
    );
    assert(row.epochStartUtc === csvCellValue(source.epochStartUtc), `${label}: CSV epoch start mismatch`);
    assert(row.epochEndUtc === csvCellValue(source.epochEndUtc), `${label}: CSV epoch end mismatch`);
    assert(row.health === source.health, `${label}: CSV source health mismatch`);
    assert(row.sgp4ErrorCount === csvCellValue(source.sgp4ErrorCount), `${label}: CSV SGP4 count mismatch`);
    assert(
      row.noradIdRangeSummary === JSON.stringify(source.noradIdRangeSummary),
      `${label}: CSV NORAD summary mismatch`
    );
    assert(
      row.cosparDesignatorCount === csvCellValue(source.cosparDesignatorCount),
      `${label}: CSV COSPAR count mismatch`
    );
    assert(
      row.cosparDesignatorSamples === source.cosparDesignatorSamples.join("|"),
      `${label}: CSV COSPAR samples mismatch`
    );
    assert(
      row.classificationCounts === JSON.stringify(source.classificationCounts),
      `${label}: CSV classification counts mismatch`
    );
    assert(
      row.dragTermFieldCoverage === JSON.stringify(source.dragTermFieldCoverage),
      `${label}: CSV drag-term coverage mismatch`
    );
  }

  const tleFreshness = requireCsvSection(sections, "# TLE freshness", label);
  assert(
    tleFreshness.rows.length === data.tleFreshness.length,
    `${label}: CSV TLE freshness row count mismatch`
  );
  const freshnessBySource = new Map(
    tleFreshness.rows.map((row) => [row.sourceId, row])
  );
  for (const freshness of data.tleFreshness) {
    const row = freshnessBySource.get(freshness.provenance.sourceId);
    assert(row, `${label}: CSV missing TLE freshness ${freshness.provenance.sourceId}`);
    assert(row.sourceMode === freshness.sourceMode, `${label}: CSV TLE source mode mismatch`);
    assert(
      row.snapshotFetchedUtc === csvCellValue(freshness.snapshotFetchedUtc),
      `${label}: CSV TLE snapshot fetched mismatch`
    );
    assert(row.snapshotPath === freshness.snapshotPath, `${label}: CSV TLE snapshot path mismatch`);
    assert(row.maxEpochUtc === csvCellValue(freshness.maxEpochUtc), `${label}: CSV TLE max epoch mismatch`);
    assert(
      row.noradIdRangeSummary === JSON.stringify(freshness.noradIdRangeSummary),
      `${label}: CSV TLE NORAD summary mismatch`
    );
    assert(
      row.constellationMembership === JSON.stringify(freshness.constellationMembership),
      `${label}: CSV TLE membership mismatch`
    );
    assert(
      row.provenanceTruthClass === freshness.provenance.truthClass,
      `${label}: CSV TLE freshness truth mismatch`
    );
    assert(
      row.provenanceSourceId === freshness.provenance.sourceId,
      `${label}: CSV TLE freshness source mismatch`
    );
    assert(
      row.provenanceNonClaim === csvCellValue(freshness.provenance.nonClaim),
      `${label}: CSV TLE freshness non-claim mismatch`
    );
  }

  const stationPrecision = requireCsvSection(sections, "# Station precision", label);
  assert(
    stationPrecision.rows.length === data.stationPrecision.length,
    `${label}: CSV station precision row count mismatch`
  );
  const stationsById = new Map(stationPrecision.rows.map((row) => [row.stationId, row]));
  for (const station of data.stationPrecision) {
    const row = stationsById.get(station.stationId);
    assert(row, `${label}: CSV missing station row ${station.stationId}`);
    assert(
      row.disclosurePrecision === station.disclosurePrecision,
      `${label}: CSV disclosure precision mismatch`
    );
    assert(row.rawLat === csvCellValue(station.rawLat), `${label}: CSV raw latitude mismatch`);
    assert(row.rawLon === csvCellValue(station.rawLon), `${label}: CSV raw longitude mismatch`);
    assert(
      row.provenanceTruthClass === station.provenance.truthClass,
      `${label}: CSV station provenance class mismatch`
    );
    assert(
      row.provenanceSourceId === station.provenance.sourceId,
      `${label}: CSV station provenance source mismatch`
    );
    assert(row.elevationM === csvCellValue(station.elevationM), `${label}: CSV station elevation mismatch`);
    assert(
      row.terrainMaskDeg === csvCellValue(station.terrainMaskDeg),
      `${label}: CSV station terrain mask mismatch`
    );
    assert(
      row.effectiveElevationThresholdDeg ===
        csvCellValue(station.effectiveElevationThresholdDeg),
      `${label}: CSV station effective threshold mismatch`
    );
    for (const field of ELEVATION_METADATA_FIELDS) {
      assert(
        row[field] === csvCellValue(station[field]),
        `${label}: CSV station ${field} mismatch`
      );
    }
    assert(
      row.terrainMaskSourceId === station.terrainMaskSourceId &&
        row.terrainMaskIsDefault === csvCellValue(station.terrainMaskIsDefault) &&
        row.terrainMaskNote === station.terrainMaskNote,
      `${label}: CSV station terrain mask source mismatch`
    );
    assert(
      row.coordinateSourceAuthority === station.coordinateSourceAuthority &&
        row.coordinateSourceUrl === csvCellValue(station.coordinateSourceUrl) &&
        row.coordinateSourceNote === station.coordinateSourceNote,
      `${label}: CSV station coordinate source authority mismatch`
    );
  }

  const actorProvenance = requireCsvSection(sections, "# Actor provenance", label);
  assert(
    actorProvenance.rows.length === data.actorProvenance.length,
    `${label}: CSV actor provenance row count mismatch`
  );
  const actorsById = new Map(actorProvenance.rows.map((row) => [row.satelliteId, row]));
  for (const actor of data.actorProvenance) {
    const row = actorsById.get(actor.satelliteId);
    assert(row, `${label}: CSV missing actor row ${actor.satelliteId}`);
    assert(row.orbitClass === actor.orbitClass, `${label}: CSV actor orbit class mismatch`);
    assert(row.sourceId === actor.sourceId, `${label}: CSV actor source mismatch`);
    assert(
      row.propagatedSampleCount === csvCellValue(actor.propagatedSampleCount),
      `${label}: CSV actor sample count mismatch`
    );
    assert(
      row.sampleCadenceSeconds === csvCellValue(actor.sampleCadenceSeconds),
      `${label}: CSV actor cadence mismatch`
    );
    assert(
      row.firstPropagatedUtc === csvCellValue(actor.firstPropagatedUtc),
      `${label}: CSV actor first sample mismatch`
    );
    assert(
      row.lastPropagatedUtc === csvCellValue(actor.lastPropagatedUtc),
      `${label}: CSV actor last sample mismatch`
    );
    assert(
      row.visibilityWindowCount === csvCellValue(actor.visibilityWindowCount),
      `${label}: CSV actor visibility count mismatch`
    );
    assert(
      row.provenanceTruthClass === actor.provenance.truthClass,
      `${label}: CSV actor provenance class mismatch`
    );
  }

  const visibilityProvenance = requireCsvSection(sections, "# Visibility provenance", label);
  assert(
    data.visibilityProvenance.length === evidence.visibilityWindowCount,
    `${label}: visibility provenance count mismatch`
  );
  assert(
    visibilityProvenance.rows.length === data.visibilityProvenance.length,
    `${label}: CSV visibility provenance row count mismatch`
  );
  const visibilityRowsByKey = new Map(
    visibilityProvenance.rows.map((row) => [
      `${row.satelliteId}|${row.intersectionStartUtc}|${row.intersectionEndUtc}`,
      row
    ])
  );
  for (const rowData of data.visibilityProvenance) {
    const key = `${rowData.satelliteId}|${rowData.intersectionStartUtc}|${rowData.intersectionEndUtc}`;
    const row = visibilityRowsByKey.get(key);
    assert(row, `${label}: CSV missing visibility row ${key}`);
    assert(row.orbitClass === rowData.orbitClass, `${label}: CSV visibility orbit class mismatch`);
    assert(row.sourceId === rowData.sourceId, `${label}: CSV visibility source mismatch`);
    assert(
      row.stationAWindowSource === rowData.stationAWindowSource,
      `${label}: CSV station A window source mismatch`
    );
    assert(
      row.stationBWindowSource === rowData.stationBWindowSource,
      `${label}: CSV station B window source mismatch`
    );
    assert(
      row.pairIntersectionSource === rowData.pairIntersectionSource,
      `${label}: CSV pair intersection source mismatch`
    );
    assert(
      row.elevationThresholdDeg === csvCellValue(rowData.elevationThresholdDeg),
      `${label}: CSV visibility elevation threshold mismatch`
    );
    assert(
      row.sampleCadenceSeconds === csvCellValue(rowData.sampleCadenceSeconds),
      `${label}: CSV visibility cadence mismatch`
    );
    assert(
      row.provenanceTruthClass === rowData.provenance.truthClass,
      `${label}: CSV visibility provenance class mismatch`
    );
  }

  const modeledOutputs = requireCsvSection(sections, "# Modeled outputs", label);
  assert(
    modeledOutputs.rows.length === data.modeledOutputs.length,
    `${label}: CSV modeled output row count mismatch`
  );
  const modeledOutputsByKind = new Map(modeledOutputs.rows.map((row) => [row.kind, row]));
  for (const output of data.modeledOutputs) {
    const row = modeledOutputsByKind.get(output.kind);
    assert(row, `${label}: CSV missing modeled output ${output.kind}`);
    assert(row.modelId === output.modelId, `${label}: CSV model id mismatch`);
    assert(row.inputSummary === JSON.stringify(output.inputSummary), `${label}: CSV input summary mismatch`);
    assert(
      row.provenanceTruthClass === output.provenance.truthClass,
      `${label}: CSV output provenance class mismatch`
    );
    assert(
      row.provenanceSourceId === output.provenance.sourceId,
      `${label}: CSV output provenance source mismatch`
    );
    assert(row.nonClaim === output.nonClaim, `${label}: CSV output non-claim mismatch`);
  }

  const rfChain = requireCsvSection(sections, "# RF chain breakdown", label);
  assert(
    rfChain.rows.length === data.rfChainBreakdown.terms.length,
    `${label}: CSV RF chain row count mismatch`
  );
  for (const [index, term] of data.rfChainBreakdown.terms.entries()) {
    const row = rfChain.rows[index];
    assert(row.termKind === term.kind, `${label}: CSV RF chain term mismatch`);
    assert(
      row.carrierBand === csvCellValue(data.rfChainBreakdown.carrierBand) &&
        row.carrierFrequencyGHz ===
          csvCellValue(data.rfChainBreakdown.carrierFrequencyGHz) &&
        row.receivedPowerProxyDbm ===
          csvCellValue(data.rfChainBreakdown.receivedPowerProxyDbm),
      `${label}: CSV RF chain carrier fields mismatch`
    );
    assert(
      row.contributionSignedDb === csvCellValue(term.contributionSignedDb),
      `${label}: CSV RF chain term contribution mismatch`
    );
    assert(row.modelId === term.modelId, `${label}: CSV RF chain model mismatch`);
    assert(
      row.standardsRef === term.standardsRef.join(" | "),
      `${label}: CSV RF chain standards mismatch`
    );
    assert(
      row.inputSummary === JSON.stringify(term.inputSummary),
      `${label}: CSV RF chain input summary mismatch`
    );
    assert(
      row.provenanceTruthClass === term.provenance.truthClass &&
        row.provenanceSourceId === term.provenance.sourceId &&
        row.provenanceModelId === csvCellValue(term.provenance.modelId) &&
        row.provenanceNonClaim === csvCellValue(term.provenance.nonClaim),
      `${label}: CSV RF chain provenance mismatch`
    );
    assert(row.nonClaim === term.nonClaim, `${label}: CSV RF chain non-claim mismatch`);
  }

  const atmosphericLookups = requireCsvSection(sections, "# Atmospheric lookups", label);
  assert(
    atmosphericLookups.rows.length === data.atmosphericLookups.length,
    `${label}: CSV atmospheric lookup row count mismatch`
  );
  const lookupRowsBySource = new Map(
    atmosphericLookups.rows.map((row) => [row.source, row])
  );
  for (const lookup of data.atmosphericLookups) {
    const row = lookupRowsBySource.get(lookup.source);
    assert(row, `${label}: CSV missing atmospheric lookup ${lookup.source}`);
    assert(row.midpointLatDeg === csvCellValue(lookup.midpointLatDeg), `${label}: CSV atmospheric midpoint lat mismatch`);
    assert(row.midpointLonDeg === csvCellValue(lookup.midpointLonDeg), `${label}: CSV atmospheric midpoint lon mismatch`);
    assert(row.cellLatDeg === csvCellValue(lookup.cellLatDeg), `${label}: CSV atmospheric cell lat mismatch`);
    assert(row.cellLonDeg === csvCellValue(lookup.cellLonDeg), `${label}: CSV atmospheric cell lon mismatch`);
    assert(row.lookupValue === csvCellValue(lookup.lookupValue), `${label}: CSV atmospheric value mismatch`);
    assert(row.lookupUnit === csvCellValue(lookup.lookupUnit), `${label}: CSV atmospheric unit mismatch`);
    assert(row.interpolation === lookup.interpolation, `${label}: CSV atmospheric interpolation mismatch`);
    assert(
      row.provenanceTruthClass === lookup.provenance.truthClass &&
        row.provenanceSourceId === lookup.provenance.sourceId &&
        row.provenanceModelId === csvCellValue(lookup.provenance.modelId) &&
        row.provenanceNonClaim === csvCellValue(lookup.provenance.nonClaim),
      `${label}: CSV atmospheric provenance mismatch`
    );
  }

  const stationRfProfiles = requireCsvSection(sections, "# Station RF profile", label);
  assert(
    stationRfProfiles.rows.length === data.stationRfProfiles.length,
    `${label}: CSV station RF profile row count mismatch`
  );
  const stationRfRowsById = new Map(
    stationRfProfiles.rows.map((row) => [row.stationId, row])
  );
  const precisionByIdForRf = new Map(
    data.stationPrecision.map((station) => [station.stationId, station])
  );
  for (const profile of data.stationRfProfiles) {
    const row = stationRfRowsById.get(profile.stationId);
    const precision = precisionByIdForRf.get(profile.stationId);
    assert(row, `${label}: CSV missing station RF profile ${profile.stationId}`);
    assert(precision, `${label}: CSV station RF profile ${profile.stationId} missing precision row`);
    assertElevationMetadataParity(
      label,
      profile,
      precision,
      `CSV station RF profile ${profile.stationId}`
    );
    assert(row.elevationM === csvCellValue(profile.elevationM), `${label}: CSV station RF elevation mismatch`);
    for (const field of ELEVATION_METADATA_FIELDS) {
      assert(
        row[field] === csvCellValue(profile[field]),
        `${label}: CSV station RF ${field} mismatch`
      );
    }
    assert(row.terrainMaskDeg === csvCellValue(profile.terrainMaskDeg), `${label}: CSV station RF terrain mismatch`);
    assert(row.terrainMaskSourceId === profile.terrainMaskSourceId, `${label}: CSV station RF terrain source mismatch`);
    assert(
      row.terrainMaskIsDefault === csvCellValue(profile.terrainMaskIsDefault),
      `${label}: CSV station RF terrain default mismatch`
    );
    assert(row.antennaDiameterM === csvCellValue(profile.antennaDiameterM), `${label}: CSV station RF antenna mismatch`);
    assert(row.antennaDiameterSourceId === profile.antennaDiameterSourceId, `${label}: CSV station RF antenna source mismatch`);
    assert(row.peakEirpDbm === csvCellValue(profile.peakEirpDbm), `${label}: CSV station RF EIRP mismatch`);
    assert(row.peakEirpSourceId === profile.peakEirpSourceId, `${label}: CSV station RF EIRP source mismatch`);
    assert(row.txPolarization === csvCellValue(profile.txPolarization), `${label}: CSV station RF polarization mismatch`);
    assert(row.txPolarizationSourceId === profile.txPolarizationSourceId, `${label}: CSV station RF polarization source mismatch`);
    assert(
      row.provenanceTruthClass === profile.provenance.truthClass &&
        row.provenanceSourceId === profile.provenance.sourceId &&
        row.provenanceNonClaim === csvCellValue(profile.provenance.nonClaim),
      `${label}: CSV station RF provenance mismatch`
    );
  }

  const displayTransforms = requireCsvSection(sections, "# Display transforms", label);
  assert(
    displayTransforms.rows.length === data.displayTransforms.length,
    `${label}: CSV display transform row count mismatch`
  );
  const transformsBySourceId = new Map(displayTransforms.rows.map((row) => [row.sourceId, row]));
  for (const transform of data.displayTransforms) {
    const row = transformsBySourceId.get(transform.sourceId);
    assert(row, `${label}: CSV missing display transform ${transform.sourceId}`);
    assert(
      row.provenanceTruthClass === transform.truthClass,
      `${label}: CSV display transform truth class mismatch`
    );
    assert(
      row.inputSummary === JSON.stringify(transform.inputSummary),
      `${label}: CSV display transform input summary mismatch`
    );
  }

  const capDisclosure = requireCsvSection(sections, "# Cap disclosure", label);
  assert(
    capDisclosure.rows.length === CSV_ORBIT_DISPLAY_ORDER.length,
    `${label}: CSV cap disclosure row count mismatch`
  );
  const capRowsByOrbit = new Map(capDisclosure.rows.map((row) => [row.orbitClass, row]));
  for (const orbit of CSV_ORBIT_DISPLAY_ORDER) {
    const row = capRowsByOrbit.get(orbit);
    assert(row, `${label}: CSV missing cap disclosure row ${orbit}`);
    assert(
      row.perOrbitCap === csvCellValue(data.capDisclosure.perOrbitCap[orbit]),
      `${label}: CSV ${orbit} cap disclosure cap mismatch`
    );
    assert(
      row.perOrbitInventory ===
        csvCellValue(data.capDisclosure.perOrbitInventory[orbit]),
      `${label}: CSV ${orbit} cap disclosure inventory mismatch`
    );
    assert(
      row.cappedAtRuntime === csvCellValue(data.capDisclosure.cappedAtRuntime[orbit]),
      `${label}: CSV ${orbit} cap disclosure capped flag mismatch`
    );
  }

  const runtimeInventory = requireCsvSection(
    sections,
    "# Runtime inventory disclosure",
    label
  );
  assert(
    runtimeInventory.rows.length === CSV_ORBIT_DISPLAY_ORDER.length,
    `${label}: CSV runtime inventory row count mismatch`
  );
  const inventoryRowsByOrbit = new Map(
    runtimeInventory.rows.map((row) => [row.orbitClass, row])
  );
  for (const orbit of CSV_ORBIT_DISPLAY_ORDER) {
    const row = inventoryRowsByOrbit.get(orbit);
    const disclosure = data.runtimeInventoryDisclosure.perOrbit[orbit];
    assert(row, `${label}: CSV missing runtime inventory row ${orbit}`);
    assert(
      row.inventorySourceMode === disclosure.inventorySourceMode,
      `${label}: CSV ${orbit} runtime inventory source mode mismatch`
    );
    assert(
      row.networkSnapshotInventoryCount ===
        csvCellValue(disclosure.networkSnapshotInventoryCount),
      `${label}: CSV ${orbit} network inventory mismatch`
    );
    assert(
      row.localFallbackInventoryCount ===
        csvCellValue(disclosure.localFallbackInventoryCount),
      `${label}: CSV ${orbit} local fallback inventory mismatch`
    );
    assert(
      row.localFallbackInventoryNote === disclosure.localFallbackInventoryNote,
      `${label}: CSV ${orbit} local fallback note mismatch`
    );
    assert(
      row.activeInventoryCount === csvCellValue(disclosure.activeInventoryCount),
      `${label}: CSV ${orbit} active inventory mismatch`
    );
    assert(
      row.acceptedRecordCount === csvCellValue(disclosure.acceptedRecordCount),
      `${label}: CSV ${orbit} accepted count mismatch`
    );
    assert(
      row.runtimeCap === csvCellValue(disclosure.runtimeCap),
      `${label}: CSV ${orbit} runtime cap mismatch`
    );
    assert(
      row.cappedAtRuntime === csvCellValue(disclosure.cappedAtRuntime),
      `${label}: CSV ${orbit} runtime capped flag mismatch`
    );
    assert(
      row.visibleActorCount === csvCellValue(disclosure.visibleActorCount),
      `${label}: CSV ${orbit} visible actor mismatch`
    );
  }

  const metricAnchors = requireCsvSection(
    sections,
    "# Metric anchor disclosure",
    label
  );
  const metricAnchorByField = new Map(
    metricAnchors.rows.map((row) => [row.field, row.value])
  );
  for (const [key, expected] of Object.entries(EXPECTED_METRIC_ANCHORS)) {
    assert(
      metricAnchorByField.get(key) === expected &&
        data.metricAnchorDisclosure[key] === expected,
      `${label}: CSV metric anchor ${key} mismatch`
    );
  }
  assert(
    metricAnchorByField.get("activePolicyId") ===
      data.metricAnchorDisclosure.activePolicyId,
    `${label}: CSV metric anchor policy mismatch`
  );
  assert(
    metricAnchorByField.get("policyThresholds") ===
      JSON.stringify(data.metricAnchorDisclosure.policyThresholds),
    `${label}: CSV metric anchor threshold mismatch`
  );
  assert(
    metricAnchorByField.get("nonClaim") === data.metricAnchorDisclosure.nonClaim,
    `${label}: CSV metric anchor non-claim mismatch`
  );

  const policyDisclosure = requireCsvSection(sections, "# Policy disclosure", label);
  assert(
    policyDisclosure.rows.length === CSV_POLICY_DISCLOSURE_THRESHOLD_ORDER.length,
    `${label}: CSV policy disclosure row count mismatch`
  );
  const policyRowsByThreshold = new Map(
    policyDisclosure.rows.map((row) => [row.thresholdKey, row])
  );
  for (const thresholdKey of CSV_POLICY_DISCLOSURE_THRESHOLD_ORDER) {
    const row = policyRowsByThreshold.get(thresholdKey);
    const source = data.policyDisclosure.thresholdSources[thresholdKey];
    assert(row, `${label}: CSV missing policy disclosure row ${thresholdKey}`);
    assert(
      row.activePolicyId === data.policyDisclosure.activePolicyId,
      `${label}: CSV policy disclosure active policy mismatch`
    );
    assert(
      row.thresholdValue ===
        csvCellValue(data.policyDisclosure.thresholds[thresholdKey]),
      `${label}: CSV policy disclosure ${thresholdKey} value mismatch`
    );
    assert(
      row.sourceTruthClass === source.truthClass,
      `${label}: CSV policy disclosure ${thresholdKey} source truth mismatch`
    );
    assert(
      row.sourceId === source.sourceId,
      `${label}: CSV policy disclosure ${thresholdKey} source id mismatch`
    );
    assert(
      row.sourceModelId === csvCellValue(source.modelId),
      `${label}: CSV policy disclosure ${thresholdKey} source model mismatch`
    );
    assert(
      row.sourceNonClaim === csvCellValue(source.nonClaim),
      `${label}: CSV policy disclosure ${thresholdKey} source non-claim mismatch`
    );
  }

  const dataCompleteness = requireCsvSection(sections, "# Data completeness", label);
  const summaryByField = new Map(dataCompleteness.rows.map((row) => [row.field, row.value]));
  assert(
    summaryByField.get("fakeActorCount") === csvCellValue(data.actorSourceCoverage.fakeActorCount),
    `${label}: CSV fake actor count mismatch`
  );
  assert(
    summaryByField.get("visibilityCadenceSecondsByOrbit") ===
      JSON.stringify(data.visibilityCadenceSecondsByOrbit),
    `${label}: CSV cadence summary mismatch`
  );
  assert(
    summaryByField.get("capDisclosure") === JSON.stringify(data.capDisclosure),
    `${label}: CSV cap disclosure summary mismatch`
  );
  assert(
    summaryByField.get("pairSourceAttribution") ===
      JSON.stringify(data.pairSourceAttribution),
    `${label}: CSV pair source summary mismatch`
  );
  assert(
    summaryByField.get("runtimeInventoryDisclosure") ===
      JSON.stringify(data.runtimeInventoryDisclosure),
    `${label}: CSV runtime inventory summary mismatch`
  );
  assert(
    summaryByField.get("metricAnchorDisclosure") ===
      JSON.stringify(data.metricAnchorDisclosure),
    `${label}: CSV metric anchor summary mismatch`
  );
  assert(
    summaryByField.get("activePolicyId") === data.policyDisclosure.activePolicyId,
    `${label}: CSV active policy summary mismatch`
  );
  assert(
    summaryByField.get("policyDisclosureThresholds") ===
      JSON.stringify(data.policyDisclosure.thresholds),
    `${label}: CSV policy thresholds summary mismatch`
  );
  assert(
    summaryByField.get("rfChainTermCount") ===
      csvCellValue(data.rfChainBreakdown.terms.length),
    `${label}: CSV RF chain term summary mismatch`
  );
  assert(
    summaryByField.get("atmosphericLookupCount") ===
      csvCellValue(data.atmosphericLookups.length),
    `${label}: CSV atmospheric lookup summary mismatch`
  );
  assert(
    summaryByField.get("stationRfProfileCount") ===
      csvCellValue(data.stationRfProfiles.length),
    `${label}: CSV station RF profile summary mismatch`
  );
  assert(
    summaryByField.get("emptyReasonCode") === csvCellValue(data.emptyReasonCode),
    `${label}: CSV empty reason mismatch`
  );
  assert(
    evidence.defaultWindowDurationMinutes === 360,
    `${label}: buildDefaultTimeWindow default should be 360 minutes`
  );
}

function assertMissingSourceEvidence(label, evidence) {
  assert(
    evidence?.emptyReasonCode === "tle-source-unavailable",
    `${label}: expected missing source reason, received ${evidence?.emptyReasonCode}`
  );
  assert(evidence.fakeActorCount === 0, `${label}: missing source produced fake actor`);
  assert(evidence.sourceCount === 3, `${label}: missing source manifest count mismatch`);
  const sourcesByOrbit = new Map(evidence.sources?.map((source) => [source.orbitClass, source]));
  assert(
    sourcesByOrbit.get("LEO")?.sourcePath === "missing:leo" &&
      sourcesByOrbit.get("MEO")?.sourcePath === "unsupported:meo" &&
      sourcesByOrbit.get("GEO")?.sourcePath === "missing:geo",
    `${label}: missing/unsupported source paths were not preserved`
  );
  assert(
    [...sourcesByOrbit.values()].every((source) => source.parserFailureCount === 0),
    `${label}: missing source parser failures not propagated`
  );
  assert(
    [...sourcesByOrbit.values()].every((source) => source.health === "unknown-age"),
    `${label}: missing source health should be unknown-age`
  );
}

await assertCoordinateAuthorityFixtureCoverage();

const server = await startServerIfNeeded();
const browserCommand = findHeadlessBrowser();
const browser = await startHeadlessBrowser(browserCommand, [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`
]);

let client;
const results = [];

try {
  const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
  client = await connectCdp(pageWebSocketUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false
  });

  await navigate(client, baseUrl);
  const sourceModeEvidence = await readSourceModeResolutionEvidence(client);
  const sourceModeByLabel = new Map(
    sourceModeEvidence.map((entry) => [entry.label, entry])
  );
  assert(
    sourceModeByLabel.get("offline-baseline")?.sourceMode === "local-snapshot",
    "offline-baseline: expected local-snapshot"
  );
  assert(
    sourceModeByLabel.get("network-frozen-fresh")?.sourceMode === "network-snapshot",
    "network-frozen-fresh: expected network-snapshot"
  );
  assert(
    sourceModeByLabel.get("fallback-local-snapshot")?.sourceMode ===
      "fallback-local-snapshot",
    "fallback-local-snapshot: expected fallback-local-snapshot"
  );

  for (const testCase of walkthroughCases) {
    await navigate(client, buildSelectedPairUrl(testCase));
    const state = await readSelectedPairState(client);
    if (testCase.expectedStatus === "ready") {
      assertReadyCase(testCase, state);
    } else {
      assertEmptyCase(testCase, state);
    }
    const csvEvidence = await readCsvEvidence(client, testCase);
    assertCsvEvidence(testCase.label, csvEvidence);
    assert(
      state.overlay.handoverEventCount === csvEvidence.linkSelectionEventCount,
      `${testCase.label}: overlay link-selection event count mismatch`
    );
    const actualVisibilityWindowCount =
      state.overlay.dataCompleteness.visibilityProvenance.length;
    assert(
      actualVisibilityWindowCount === csvEvidence.visibilityWindowCount,
      `${testCase.label}: debug/CSV visibility count mismatch`
    );
    const visibilityDelta = assertVisibilityDeltaWithinTolerance(
      testCase,
      actualVisibilityWindowCount
    );
    const missingSourceEvidence =
      testCase === walkthroughCases[0]
        ? await readMissingSourceEvidence(client, testCase)
        : null;
    if (missingSourceEvidence) {
      assertMissingSourceEvidence(testCase.label, missingSourceEvidence);
    }
    results.push({
      label: testCase.label,
      status: state.overlay.status,
      emptyReasonCode: state.overlay.emptyReasonCode,
      sourceTier: state.footer?.sourceTier ?? null,
      sourceEvidenceKind: state.footer?.evidenceKind ?? null,
      sourceHealth: state.chip?.sourceHealth ?? null,
      sourceMode: state.chip?.sourceMode ?? state.overlay.sourceMode,
      modeledOutputCount: state.overlay.dataCompleteness.modeledOutputs.length,
      actorProvenanceCount: state.overlay.dataCompleteness.actorProvenance.length,
      visibilityProvenanceCount: actualVisibilityWindowCount,
      stationPrecision: state.overlay.dataCompleteness.stationPrecision.map((station) => ({
        stationId: station.stationId,
        coordinateSourceAuthority: station.coordinateSourceAuthority,
        elevationM: station.elevationM,
        terrainMaskDeg: station.terrainMaskDeg,
        effectiveElevationThresholdDeg: station.effectiveElevationThresholdDeg
      })),
      baselineLinkSelectionEventCount: testCase.baselineLinkSelectionEventCount,
      linkSelectionEventCount: csvEvidence.linkSelectionEventCount,
      baselineHandoverCount: testCase.baselineHandoverCount,
      handoverCount: csvEvidence.handoverCount,
      ...visibilityDelta,
      missingSourceReason: missingSourceEvidence?.emptyReasonCode ?? null
    });
  }

  await navigate(client, buildSelectedPairUrl(policySelectorCase));
  const policyState = await readSelectedPairState(client);
  assertReadyCase(policySelectorCase, policyState, policySelectorCase.policy);
  assert(
    policyState.panel?.activePolicyId === policySelectorCase.policy,
    `${policySelectorCase.label}: panel policy dataset mismatch`
  );
  results.push({
    label: policySelectorCase.label,
    status: policyState.overlay.status,
    activePolicyId:
      policyState.overlay.dataCompleteness.policyDisclosure.activePolicyId,
    row5PolicyId: policyState.policyDisclosure?.dataset?.activePolicyId ?? null,
    linkSelectionEventCount: policyState.overlay.handoverEventCount
  });

  await navigate(client, buildSelectedPairUrl(compareCase));
  const compareState = await readSelectedPairState(client);
  assertReadyCase(compareCase, compareState);
  assertPreWave2ComparisonVisible(compareCase.label, compareState);
  results.push({
    label: compareCase.label,
    status: compareState.overlay.status,
    compareMode: compareState.panel?.compareMode ?? null,
    comparePaneCount: compareState.comparePanes?.length ?? 0,
    currentLinkSelectionEventCount: compareState.overlay.handoverEventCount
  });

  await navigate(client, buildFixedDemoUrl(fixedDemoCase));
  const fixedState = await readSelectedPairState(client, ["not-requested", "error"]);
  assert(
    fixedState.sceneSourceMode === FIXTURE_MODE,
    `${fixedDemoCase.label}: expected fixture mode, received ${fixedState.sceneSourceMode}`
  );
  assert(
    fixedState.overlay?.status === "not-requested",
    `${fixedDemoCase.label}: selected-pair overlay should not be requested`
  );
  results.push({
    label: fixedDemoCase.label,
    status: fixedState.overlay.status,
    sourceMode: fixedState.sceneSourceMode
  });
} finally {
  if (client) {
    await client.close();
  }
  await stopHeadlessBrowser(browser);
  await stopServer(server);
}

console.log(JSON.stringify({ passed: true, baseUrl, results }, null, 2));
process.exit(0);
