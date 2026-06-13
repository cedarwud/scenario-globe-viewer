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

import {
  COORDINATE_SOURCE_AUTHORITIES,
  FIXTURE_MODE,
  assert,
  assertEmptyCase,
  assertMissingSourceEvidence,
  assertPreWave2ComparisonVisible,
  assertReadyCase,
  assertVisibilityDeltaWithinTolerance
} from "./helpers/tle-data-completeness-assertions.mjs";
import { assertCsvEvidence } from "./helpers/tle-data-completeness-csv-assertions.mjs";

const DEFAULT_SERVER_PORT = 5173;
const VIEWPORT = { width: 1440, height: 900 };
const READY_TIMEOUT_MS = 30_000;
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
    baselineVisibilityWindowCount: 709,
    baselineLinkSelectionEventCount: 25,
    baselineHandoverCount: 24,
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
    baselineLinkSelectionEventCount: 9,
    baselineHandoverCount: 8,
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
    baselineVisibilityWindowCount: 358,
    baselineLinkSelectionEventCount: 16,
    baselineHandoverCount: 15,
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
    baselineLinkSelectionEventCount: 9,
    baselineHandoverCount: 8,
    expectedStationPrecision: [
      { stationId: "cht-yangmingshan", elevationM: 489, terrainMaskDeg: 21 },
      { stationId: "sansa-hartebeesthoek", elevationM: 1553, terrainMaskDeg: 1 }
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
        const assumptionsDisclosure = document.querySelector('[data-disclosure="assumptions-limits"]');
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
          sourcesDisclosureText: sourcesDisclosure?.textContent ?? "",
          assumptionsDisclosureText: assumptionsDisclosure?.textContent ?? ""
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
        policyId: rt.SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
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
        policyId: rt.SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID,
        rainRateMmPerHour: 0
      });
      return {
        emptyReasonCode: result.dataCompleteness.emptyReasonCode,
        fakeActorCount: result.dataCompleteness.actorSourceCoverage.fakeActorCount,
        sourceCount: result.dataCompleteness.tleSources.length,
        sources: result.dataCompleteness.tleSources.map((source) => ({
          orbitClass: source.orbitClass,
          sourcePath: source.sourcePath,
          format: source.format,
          apiClass: source.apiClass,
          sourcePolicy: source.sourcePolicy,
          catalogNumberCompatibility: source.catalogNumberCompatibility,
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
        LEO: "/fixtures/satellites/leo-scale/oneweb-2026-05-15T12-00-00Z.tle",
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
