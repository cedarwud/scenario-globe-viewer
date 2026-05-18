#!/usr/bin/env node
// Slice 2 runtime smoke for the selected-pair TLE-first scene debug state.
//
// Usage:
//   node scripts/verify-tle-first-scene-view-model-runtime.mjs [--port=9705]

import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";

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

const cases = [
  {
    label: "Svalbard / Tromso ready pair",
    stationA: "ksat-svalsat-svalbard",
    stationB: "ksat-tromso",
    startUtc: "2026-05-17T00:00:00.000Z",
    durationMinutes: "360",
    expectedStatus: "ready",
    expectedActorRelation: "positive",
    expectedRuntimeLinkVisible: true,
    expectedPairGeometry: "polar"
  },
  {
    label: "Svalbard / TrollSat zero-window pair",
    stationA: "ksat-svalsat-svalbard",
    stationB: "ksat-trollsat-antarctica",
    startUtc: "2026-05-17T00:00:00.000Z",
    durationMinutes: "360",
    expectedStatus: "empty",
    expectedActorRelation: "zero",
    expectedRuntimeLinkVisible: false,
    expectedPairGeometry: "empty-result"
  },
  {
    label: "Singtel / MEASAT short-baseline pair",
    stationA: "singtel-bukit-timah",
    stationB: "measat-cyberjaya",
    startUtc: "2026-05-17T00:00:00.000Z",
    durationMinutes: "360",
    expectedStatus: "ready",
    expectedActorRelation: "positive",
    expectedRuntimeLinkVisible: true,
    expectedPairGeometry: "short-baseline"
  }
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function isServerReachable() {
  return await new Promise((resolve) => {
    const request = httpGet(baseUrl, (response) => {
      response.resume();
      const reachable = response.statusCode >= 200 && response.statusCode < 500;
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${baseUrl}: ${response.statusCode} reachable=${reachable}`);
      }
      resolve(reachable);
    });
    request.setTimeout(1500, () => {
      request.destroy();
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${baseUrl}: timeout`);
      }
      resolve(false);
    });
    request.on("error", (error) => {
      if (DEBUG_SERVER_PROBE) {
        console.error(`server probe ${baseUrl}: ${error.message}`);
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
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
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

  await new Promise((resolve) => {
    server.once("exit", () => {
      resolve();
    });
    server.kill("SIGTERM");
    setTimeout(resolve, 1000);
  });
}

function buildCaseUrl(testCase) {
  const url = new URL(baseUrl);
  url.searchParams.set("stationA", testCase.stationA);
  url.searchParams.set("stationB", testCase.stationB);
  url.searchParams.set("startUtc", testCase.startUtc);
  url.searchParams.set("durationMinutes", testCase.durationMinutes);
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

async function readOverlayState(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      let last = null;
      const startedAt = Date.now();

      while (Date.now() - startedAt < ${READY_TIMEOUT_MS}) {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const controller = capture?.m8aV4GroundStationScene;
        const state = controller?.getState?.();
        const overlay = state?.selectedPairOverlay ?? null;
        last = {
          hasCapture: Boolean(capture),
          hasController: Boolean(controller),
          overlay
        };

        if (
          overlay &&
          ["ready", "empty", "error"].includes(overlay.status)
        ) {
          return last;
        }

        await sleep(100);
      }

      return last;
    })()`,
    { awaitPromise: true }
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertCase(testCase, result) {
  assert(result?.hasCapture, `${testCase.label}: missing runtime capture seam`);
  assert(result?.hasController, `${testCase.label}: missing scene controller`);

  const overlay = result.overlay;
  const overlayEvidence = JSON.stringify(overlay);
  assert(overlay, `${testCase.label}: missing selectedPairOverlay`);
  assert(
    ["ready", "empty"].includes(overlay.status),
    `${testCase.label}: expected status ready/empty, received ${overlay.status}; overlay=${overlayEvidence}`
  );
  assert(
    overlay.status === testCase.expectedStatus,
    `${testCase.label}: expected status ${testCase.expectedStatus}, received ${overlay.status}`
  );

  if (Object.hasOwn(overlay, "sourceMode")) {
    assert(
      overlay.sourceMode === RUNTIME_MODE,
      `${testCase.label}: expected sourceMode ${RUNTIME_MODE}, received ${overlay.sourceMode}`
    );
  }

  assert(
    overlay.pairGeometry === testCase.expectedPairGeometry,
    `${testCase.label}: expected pairGeometry ${testCase.expectedPairGeometry}, received ${overlay.pairGeometry}`
  );

  assert(
    typeof overlay.runtimeLinkVisible === "boolean",
    `${testCase.label}: runtimeLinkVisible must be boolean`
  );
  assert(
    overlay.runtimeLinkVisible === testCase.expectedRuntimeLinkVisible,
    `${testCase.label}: expected runtimeLinkVisible ${testCase.expectedRuntimeLinkVisible}, received ${overlay.runtimeLinkVisible}`
  );

  const actorCount = overlay.actorCount ?? overlay.satelliteCount;
  assert(
    Number.isInteger(actorCount),
    `${testCase.label}: expected actorCount or satelliteCount integer`
  );

  if (testCase.expectedActorRelation === "zero") {
    assert(actorCount === 0, `${testCase.label}: expected zero actors, received ${actorCount}`);
  } else {
    assert(actorCount > 0, `${testCase.label}: expected actors, received ${actorCount}`);
  }
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

  for (const testCase of cases) {
    await navigate(client, buildCaseUrl(testCase));
    const state = await readOverlayState(client);
    assertCase(testCase, state);
    const overlay = state.overlay;
    results.push({
      label: testCase.label,
      status: overlay.status,
      sourceMode: overlay.sourceMode ?? null,
      pairGeometry: overlay.pairGeometry,
      actorCount: overlay.actorCount ?? overlay.satelliteCount,
      runtimeLinkVisible: overlay.runtimeLinkVisible
    });
  }
} finally {
  if (client) {
    await client.close();
  }
  await stopHeadlessBrowser(browser);
  await stopServer(server);
}

console.log(JSON.stringify({ passed: true, baseUrl, results }, null, 2));
