#!/usr/bin/env node
// D6 gate for selected-pair TLE-first data-completeness metadata.
//
// Usage:
//   node scripts/verify-tle-first-data-completeness.mjs [--port=9712]

import { spawn } from "node:child_process";
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

const readyCase = {
  label: "Svalbard / Tromso ready pair",
  stationA: "ksat-svalsat-svalbard",
  stationB: "ksat-tromso",
  expectedStatus: "ready",
  expectedRuntimeLinkVisible: true
};

const emptyCase = {
  label: "Svalbard / TrollSat zero-window pair",
  stationA: "ksat-svalsat-svalbard",
  stationB: "ksat-trollsat-antarctica",
  expectedStatus: "empty",
  expectedRuntimeLinkVisible: false,
  expectedEmptyReasonCode: "no-pair-intersection"
};

const fixedDemoCase = {
  label: "Fixed demo fixture fallback route",
  searchParams: {
    scenePreset: "regional",
    m8aV4GroundStationScene: "1"
  }
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
        last = {
          hasCapture: Boolean(capture),
          hasController: Boolean(controller),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          overlay,
          panel: panel
            ? {
                state: panel.dataset.state ?? null,
                routeMode: panel.dataset.dataCompletenessRouteMode ?? null,
                emptyReasonCode: panel.dataset.emptyReasonCode ?? null
              }
            : null,
          footer: footer ? { ...footer.dataset } : null,
          chip: chip ? { ...chip.dataset } : null
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
        rainRateMmPerHour: 0
      });
      const text = csv.buildRuntimeProjectionCsv(result);
      return {
        hasSourceManifest: text.includes("# TLE source manifest"),
        hasStationPrecision: text.includes("# Station precision"),
        hasModeledOutputs: text.includes("# Modeled outputs"),
        hasFakeActorCount: text.includes("fakeActorCount"),
        modeledOutputCount: result.dataCompleteness.modeledOutputs.length
      };
    })()`,
    { awaitPromise: true }
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDataCompletenessShape(label, state) {
  assert(state?.hasCapture, `${label}: missing capture seam`);
  assert(state?.hasController, `${label}: missing controller`);
  const overlay = state.overlay;
  const data = overlay?.dataCompleteness;
  assert(data, `${label}: missing dataCompleteness debug payload`);
  assert(data.routeMode === RUNTIME_MODE, `${label}: wrong routeMode ${data.routeMode}`);
  assert(data.actorSourceCoverage?.fakeActorCount === 0, `${label}: fake actor count is not zero`);
  assert(Array.isArray(data.tleSources) && data.tleSources.length === 3, `${label}: expected 3 TLE sources`);
  assert(
    data.tleSources.every((source) => source.health && source.sourceTimestampUtc),
    `${label}: source health/timestamp missing`
  );
  assert(
    Array.isArray(data.stationPrecision) && data.stationPrecision.length === 2,
    `${label}: station precision payload missing`
  );
  assert(
    data.stationPrecision.every((station) => station.stationId && station.disclosurePrecision),
    `${label}: station precision row incomplete`
  );
  const outputKinds = new Set(data.modeledOutputs?.map((output) => output.kind));
  for (const kind of ["handover", "link-budget", "throughput", "jitter", "latency", "rain-impact"]) {
    assert(outputKinds.has(kind), `${label}: missing modeled output ${kind}`);
  }
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
}

function assertReadyCase(testCase, state) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state);
  assert(state.panel?.routeMode === RUNTIME_MODE, `${testCase.label}: panel route mode missing`);
  assert(state.footer?.stationAId === testCase.stationA, `${testCase.label}: footer station A missing`);
  assert(state.footer?.stationBId === testCase.stationB, `${testCase.label}: footer station B missing`);
  assert(state.chip?.sourceCount === "3", `${testCase.label}: TLE chip source count missing`);
  assert(state.chip?.sourceHealth, `${testCase.label}: TLE chip source health missing`);
}

function assertEmptyCase(testCase, state) {
  assert(state.overlay?.status === testCase.expectedStatus, `${testCase.label}: status mismatch`);
  assert(
    state.overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: runtimeLinkVisible mismatch`
  );
  assertDataCompletenessShape(testCase.label, state);
  assert(
    state.overlay.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: expected empty reason ${testCase.expectedEmptyReasonCode}, received ${state.overlay.emptyReasonCode}`
  );
  assert(
    state.overlay.dataCompleteness.emptyReasonCode === testCase.expectedEmptyReasonCode,
    `${testCase.label}: debug empty reason mismatch`
  );
}

function assertCsvEvidence(label, evidence) {
  assert(evidence?.hasSourceManifest, `${label}: CSV missing source manifest`);
  assert(evidence?.hasStationPrecision, `${label}: CSV missing station precision`);
  assert(evidence?.hasModeledOutputs, `${label}: CSV missing modeled outputs`);
  assert(evidence?.hasFakeActorCount, `${label}: CSV missing fakeActorCount`);
  assert(evidence?.modeledOutputCount >= 6, `${label}: modeled output count too small`);
}

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

  await navigate(client, buildSelectedPairUrl(readyCase));
  const readyState = await readSelectedPairState(client);
  assertReadyCase(readyCase, readyState);
  const readyCsv = await readCsvEvidence(client, readyCase);
  assertCsvEvidence(readyCase.label, readyCsv);
  results.push({
    label: readyCase.label,
    status: readyState.overlay.status,
    emptyReasonCode: readyState.overlay.emptyReasonCode,
    sourceHealth: readyState.chip.sourceHealth,
    modeledOutputCount: readyState.overlay.dataCompleteness.modeledOutputs.length
  });

  await navigate(client, buildSelectedPairUrl(emptyCase));
  const emptyState = await readSelectedPairState(client);
  assertEmptyCase(emptyCase, emptyState);
  results.push({
    label: emptyCase.label,
    status: emptyState.overlay.status,
    emptyReasonCode: emptyState.overlay.emptyReasonCode,
    fakeActorCount: emptyState.overlay.dataCompleteness.actorSourceCoverage.fakeActorCount
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
