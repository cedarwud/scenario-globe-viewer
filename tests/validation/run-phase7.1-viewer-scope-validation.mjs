import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const distRoot = path.join(repoRoot, "dist");
const outputRoot = path.join(repoRoot, "output/validation/phase7.1");

const scenarioContractPath = path.join(
  repoRoot,
  "src/features/scenario/scenario.ts"
);
const satelliteAdapterPath = path.join(
  repoRoot,
  "src/features/satellites/adapter.ts"
);
const physicalInputPath = path.join(
  repoRoot,
  "src/features/physical-input/physical-input.ts"
);
const overlayControllerPath = path.join(
  repoRoot,
  "src/runtime/satellite-overlay-controller.ts"
);

const requiredDistFiles = [
  "index.html",
  "cesium/Assets/approximateTerrainHeights.json",
  "cesium/Assets/Images/ion-credit.png",
  "cesium/Workers/createTaskProcessorWorker.js"
];

const captureViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1
};

const VALIDATION_SCHEMA_VERSION = "phase7.1-viewer-validation-evidence.v1";
const DEFAULT_PROFILE_ID = "first-slice";
const DEFAULT_TARGET_LEO_COUNT = 500;
const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_OVERLAY_MODE = "walker-points";
const REQUIRED_ORBIT_CLASSES = ["leo", "meo", "geo"];

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const trimmed = token.slice(2);
    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex >= 0) {
      const key = trimmed.slice(0, equalsIndex);
      const value = trimmed.slice(equalsIndex + 1);
      options[key] = value;
      continue;
    }

    const nextToken = argv[index + 1];

    if (!nextToken || nextToken.startsWith("--")) {
      options[trimmed] = true;
      continue;
    }

    options[trimmed] = nextToken;
    index += 1;
  }

  return options;
}

function parseOptionalBoolean(value, label) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${label} must be true or false when provided.`);
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function resolveRunConfig(options) {
  const profileId = options.profile ?? DEFAULT_PROFILE_ID;
  assert.equal(
    profileId,
    DEFAULT_PROFILE_ID,
    "Only --profile=first-slice is supported for the current Phase 7.1 boundary."
  );

  const targetLeoCount =
    options["target-leo-count"] !== undefined
      ? parsePositiveInteger(options["target-leo-count"], "--target-leo-count")
      : DEFAULT_TARGET_LEO_COUNT;
  const retentionDays =
    options["retention-days"] !== undefined
      ? parsePositiveInteger(options["retention-days"], "--retention-days")
      : DEFAULT_RETENTION_DAYS;
  const enforcePass =
    parseOptionalBoolean(options["enforce-pass"], "--enforce-pass") ?? false;
  const runId =
    typeof options["run-id"] === "string" && options["run-id"].trim().length > 0
      ? options["run-id"].trim()
      : "phase7-1-first-slice";

  return {
    schemaVersion: VALIDATION_SCHEMA_VERSION,
    validationProfile: {
      id: profileId,
      description:
        "Viewer-side Phase 7.1 first slice. Converges orbit-scope matrix, >=500 LEO gate, retained artifact layout, and known-gap reporting without claiming closure.",
      requiredOrbitClasses: REQUIRED_ORBIT_CLASSES,
      requestedOverlayMode: DEFAULT_OVERLAY_MODE,
      retentionDays
    },
    scaleRunParams: {
      runId,
      targetLeoCount,
      requestedOverlayMode: DEFAULT_OVERLAY_MODE,
      enforcePass
    }
  };
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build` before validation.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(existsSync(absolutePath), `Missing validation fixture: dist/${relativePath}`);
    assert(statSync(absolutePath).isFile(), `Expected dist/${relativePath} to be a file`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function findHeadlessBrowser() {
  const candidates = ["google-chrome", "chromium", "chromium-browser"];

  for (const command of candidates) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });

    if (probe.status === 0) {
      return command;
    }
  }

  throw new Error(
    "Missing a supported headless browser. Install google-chrome or chromium to run Phase 7.1 validation."
  );
}

function startHeadlessBrowser(browserCommand) {
  const userDataDir = path.join(
    tmpdir(),
    `scenario-globe-viewer-phase7.1-${process.pid}-${Date.now()}`
  );
  mkdirSync(userDataDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const browserProcess = spawn(
      browserCommand,
      [
        "--headless",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-dev-shm-usage",
        "--disable-sync",
        "--metrics-recording-only",
        "--hide-scrollbars",
        "--remote-debugging-port=0",
        `--window-size=${captureViewport.width},${captureViewport.height}`,
        `--user-data-dir=${userDataDir}`,
        "about:blank"
      ],
      {
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let settled = false;
    let browserLog = "";
    const readyPattern = /DevTools listening on (ws:\/\/[^\s]+)/;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      browserProcess.kill("SIGTERM");
      rmSync(userDataDir, { recursive: true, force: true });
      reject(new Error(`Timed out waiting for headless browser. Output: ${browserLog}`));
    }, 10000);

    const handleOutput = (chunk) => {
      browserLog += chunk.toString();
      const match = browserLog.match(readyPattern);

      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          browserProcess,
          browserWebSocketUrl: match[1],
          userDataDir
        });
      }
    };

    browserProcess.stdout.on("data", handleOutput);
    browserProcess.stderr.on("data", handleOutput);
    browserProcess.once("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      rmSync(userDataDir, { recursive: true, force: true });
      reject(error);
    });
    browserProcess.once("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      rmSync(userDataDir, { recursive: true, force: true });
      reject(
        new Error(`Headless browser exited before readiness. Code: ${code}. Output: ${browserLog}`)
      );
    });
  });
}

async function stopHeadlessBrowser(browserProcess, userDataDir) {
  if (!browserProcess.killed) {
    browserProcess.kill("SIGTERM");
  }

  await new Promise((resolve) => {
    browserProcess.once("exit", () => {
      resolve();
    });

    setTimeout(() => {
      if (!browserProcess.killed) {
        browserProcess.kill("SIGKILL");
      }

      resolve();
    }, 1000);
  });

  rmSync(userDataDir, { recursive: true, force: true });
}

async function resolvePageWebSocketUrl(browserWebSocketUrl) {
  const browserUrl = new URL(browserWebSocketUrl);
  const inspectorBaseUrl = `${browserUrl.protocol === "wss:" ? "https" : "http"}://${browserUrl.host}`;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`${inspectorBaseUrl}/json/list`);
    const targets = await response.json();
    const pageTarget = targets.find((target) => target.type === "page");

    if (pageTarget?.webSocketDebuggerUrl) {
      return pageTarget.webSocketDebuggerUrl;
    }

    await sleep(100);
  }

  throw new Error(`Failed to resolve page websocket from ${browserWebSocketUrl}`);
}

function connectCdp(pageWebSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(pageWebSocketUrl);
    const pending = new Map();
    let nextId = 0;
    let settled = false;

    const rejectPending = (error) => {
      for (const deferred of pending.values()) {
        deferred.reject(error);
      }

      pending.clear();
    };

    socket.addEventListener("open", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        async send(method, params = {}) {
          const id = ++nextId;

          return await new Promise((commandResolve, commandReject) => {
            pending.set(id, {
              resolve: commandResolve,
              reject: commandReject
            });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        async close() {
          if (socket.readyState === WebSocket.CLOSED) {
            return;
          }

          socket.close();
        }
      });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);

      if (typeof payload.id !== "number") {
        return;
      }

      const deferred = pending.get(payload.id);

      if (!deferred) {
        return;
      }

      pending.delete(payload.id);

      if (payload.error) {
        deferred.reject(new Error(payload.error.message));
        return;
      }

      deferred.resolve(payload.result);
    });

    socket.addEventListener("error", () => {
      const error = new Error("CDP websocket error.");
      rejectPending(error);

      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    socket.addEventListener("close", () => {
      rejectPending(new Error("CDP websocket closed."));
    });
  });
}

async function evaluateValue(client, expression) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

  return evaluation.result.value;
}

async function setDeterministicCaptureConditions(client) {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setTimezoneOverride", {
    timezoneId: "UTC"
  });
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: captureViewport.width,
    height: captureViewport.height,
    deviceScaleFactor: captureViewport.deviceScaleFactor,
    mobile: false
  });
}

async function dismissNavigationHelpIfVisible(client) {
  const dismissed = await evaluateValue(
    client,
    `(() => {
      const visiblePanel = document.querySelector('.cesium-click-navigation-help-visible');
      const button = document.querySelector('.cesium-navigation-help-button');

      if (!visiblePanel || !(button instanceof HTMLElement)) {
        return false;
      }

      button.click();
      return true;
    })()`
  );

  if (dismissed) {
    await sleep(150);
  }
}

async function freezeNativeClock(client) {
  const frozen = await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;

      if (!capture?.viewer) {
        return false;
      }

      capture.viewer.clock.shouldAnimate = false;
      return true;
    })()`
  );

  assert(frozen, "Missing capture viewer handle while freezing the native clock.");
}

async function readBootstrapObservation(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayState = capture?.replayClock?.getState?.() ?? null;
      const scenarioState =
        capture?.scenarioSession?.getState?.() ??
        capture?.scenarioSession?.getCurrentScenario?.() ??
        null;
      const communicationState = capture?.communicationTime?.getState?.() ?? null;
      const handoverState = capture?.handoverDecision?.getState?.() ?? null;
      const validationState = capture?.validationState?.getState?.() ?? null;

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        buildingShowcaseState: root?.dataset.buildingShowcaseState ?? null,
        siteTilesetState: root?.dataset.siteTilesetState ?? null,
        captureHandles: {
          viewer: Boolean(capture?.viewer),
          replayClock: Boolean(capture?.replayClock),
          scenarioSession: Boolean(capture?.scenarioSession),
          communicationTime: Boolean(capture?.communicationTime),
          handoverDecision: Boolean(capture?.handoverDecision),
          validationState: Boolean(capture?.validationState),
          satelliteOverlay: Boolean(capture?.satelliteOverlay)
        },
        scenarioId:
          scenarioState?.currentScenario?.id ??
          scenarioState?.currentScenario?.label ??
          scenarioState?.id ??
          null,
        replayMode: replayState?.mode ?? null,
        replayPlaying:
          typeof replayState?.playing === "boolean" ? replayState.playing : null,
        communicationStatus:
          communicationState?.summary?.status ??
          communicationState?.status ??
          null,
        handoverDecisionKind:
          handoverState?.result?.decisionKind ??
          handoverState?.decisionKind ??
          null,
        validationAttachState:
          validationState?.report?.attachState ??
          validationState?.attachState ??
          null
      };
    })()`
  );
}

async function waitForBootstrapReady(client) {
  let lastObservation = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastObservation = await readBootstrapObservation(client);

    if (
      lastObservation.bootstrapState === "ready" &&
      lastObservation.scenePreset === "global" &&
      lastObservation.buildingShowcaseState === "disabled" &&
      lastObservation.siteTilesetState === "dormant" &&
      Object.values(lastObservation.captureHandles ?? {}).every(Boolean)
    ) {
      return lastObservation;
    }

    if (lastObservation.bootstrapState === "error") {
      throw new Error(
        `Phase 7.1 validation hit bootstrap error: ${JSON.stringify(lastObservation)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `Phase 7.1 validation did not reach a ready viewer: ${JSON.stringify(lastObservation)}`
  );
}

async function enableOverlay(client, requestedOverlayMode) {
  const result = await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;

      if (!capture?.satelliteOverlay) {
        return Promise.resolve({ ok: false, error: "Missing capture satellite overlay handle." });
      }

      return capture.satelliteOverlay
        .setMode(${JSON.stringify(requestedOverlayMode)})
        .then((state) => ({ ok: true, state }))
        .catch((error) => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }));
    })()`
  );

  assert(
    result?.ok === true,
    `Phase 7.1 validation failed to enable the overlay: ${JSON.stringify(result)}`
  );
}

async function readOverlayObservation(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controllerState = capture?.satelliteOverlay?.getState?.() ?? null;

      return {
        overlayMode: root?.dataset.satelliteOverlayMode ?? null,
        overlaySource: root?.dataset.satelliteOverlaySource ?? null,
        overlayState: root?.dataset.satelliteOverlayState ?? null,
        overlayRenderMode: root?.dataset.satelliteOverlayRenderMode ?? null,
        overlayPointCount: Number(root?.dataset.satelliteOverlayPointCount ?? "0"),
        controllerState
      };
    })()`
  );
}

async function waitForOverlayReady(client, requestedOverlayMode) {
  let lastObservation = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastObservation = await readOverlayObservation(client);

    if (
      lastObservation.overlayMode === requestedOverlayMode &&
      lastObservation.overlaySource === "runtime" &&
      lastObservation.overlayState === "ready" &&
      lastObservation.overlayRenderMode === "point-label-polyline" &&
      Number.isFinite(lastObservation.overlayPointCount) &&
      lastObservation.overlayPointCount > 0
    ) {
      return lastObservation;
    }

    if (lastObservation.overlayState === "error") {
      throw new Error(
        `Phase 7.1 validation hit overlay error: ${JSON.stringify(lastObservation)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `Phase 7.1 validation did not reach a ready overlay state: ${JSON.stringify(lastObservation)}`
  );
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn(
      "python3",
      ["-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", distRoot],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let settled = false;
    let serverLog = "";
    const readyPattern = /Serving HTTP on [^ ]+ port (\d+)/;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      serverProcess.kill("SIGTERM");
      reject(new Error(`Timed out waiting for validation server. Output: ${serverLog}`));
    }, 5000);

    const handleOutput = (chunk) => {
      serverLog += chunk.toString();
      const match = serverLog.match(readyPattern);

      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          server: serverProcess,
          baseUrl: `http://127.0.0.1:${match[1]}`
        });
      }
    };

    serverProcess.stdout.on("data", handleOutput);
    serverProcess.stderr.on("data", handleOutput);
    serverProcess.once("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    serverProcess.once("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(`Validation server exited before readiness. Code: ${code}. Output: ${serverLog}`)
      );
    });
  });
}

async function stopStaticServer(server) {
  server.kill("SIGTERM");

  await new Promise((resolve) => {
    server.once("exit", () => {
      resolve();
    });

    setTimeout(() => {
      if (!server.killed) {
        server.kill("SIGKILL");
      }

      resolve();
    }, 1000);
  });
}

function inspectContractSignals() {
  const scenarioSource = readFileSync(scenarioContractPath, "utf8");
  const satelliteAdapterSource = readFileSync(satelliteAdapterPath, "utf8");
  const physicalInputSource = readFileSync(physicalInputPath, "utf8");
  const overlayControllerSource = readFileSync(overlayControllerPath, "utf8");

  const signals = {
    scenarioSatelliteSourceKinds: [
      scenarioSource.includes('kind: "fixture-ref"') ? "fixture-ref" : null,
      scenarioSource.includes('kind: "feed-ref"') ? "feed-ref" : null
    ].filter(Boolean),
    satelliteFixtureKinds: [
      satelliteAdapterSource.includes('kind: "tle"') ? "tle" : null,
      satelliteAdapterSource.includes('kind: "czml"') ? "czml" : null,
      satelliteAdapterSource.includes('kind: "sample-series"')
        ? "sample-series"
        : null
    ].filter(Boolean),
    physicalInputOrbitClasses: [
      physicalInputSource.includes('"leo"') ? "leo" : null,
      physicalInputSource.includes('"meo"') ? "meo" : null,
      physicalInputSource.includes('"geo"') ? "geo" : null
    ].filter(Boolean),
    liveOverlayModes: [
      overlayControllerSource.includes('type SatelliteOverlayMode = "off" | "walker-points"')
        ? "off"
        : null,
      overlayControllerSource.includes('type SatelliteOverlayMode = "off" | "walker-points"')
        ? "walker-points"
        : null
    ].filter(Boolean),
    liveRenderModes: [
      overlayControllerSource.includes('renderMode: "point-label-polyline"')
        ? "point-label-polyline"
        : null
    ].filter(Boolean)
  };

  assert.deepEqual(
    signals.scenarioSatelliteSourceKinds,
    ["fixture-ref", "feed-ref"],
    "Scenario contract must keep fixture-ref and feed-ref source descriptors."
  );
  assert.deepEqual(
    signals.satelliteFixtureKinds,
    ["tle", "czml", "sample-series"],
    "Satellite adapter contract must keep tle/czml/sample-series fixture kinds."
  );
  assert.deepEqual(
    signals.physicalInputOrbitClasses,
    ["leo", "meo", "geo"],
    "Physical-input contract must keep leo/meo/geo orbit classes."
  );
  assert.deepEqual(
    signals.liveOverlayModes,
    ["off", "walker-points"],
    "Live overlay controller is expected to stay on the current off|walker-points runtime line for this first slice."
  );
  assert.deepEqual(
    signals.liveRenderModes,
    ["point-label-polyline"],
    "Live overlay render mode is expected to stay on point-label-polyline for this first slice."
  );

  return signals;
}

function createOrbitScopeMatrix(contractSignals, runtimeObservation) {
  const walkerOnlyLiveRuntime =
    contractSignals.liveOverlayModes.length === 2 &&
    contractSignals.liveOverlayModes.includes("off") &&
    contractSignals.liveOverlayModes.includes("walker-points");

  return REQUIRED_ORBIT_CLASSES.map((orbitClass) => {
    const orbitClassDeclared = contractSignals.physicalInputOrbitClasses.includes(
      orbitClass
    );

    if (orbitClass === "leo") {
      return {
        orbitClass,
        contractCoverage: {
          status:
            contractSignals.scenarioSatelliteSourceKinds.length === 2 &&
            contractSignals.satelliteFixtureKinds.length === 3 &&
            orbitClassDeclared
              ? "declared"
              : "missing",
          detail:
            "Scenario source descriptors reserve fixture-ref/feed-ref, the satellite adapter keeps tle/czml/sample-series fixture kinds, and physical-input declares leo orbitClass."
        },
        liveRuntimeCoverage: {
          status:
            runtimeObservation.overlayState === "ready" && walkerOnlyLiveRuntime
              ? "walker-only"
              : runtimeObservation.overlayState === "ready"
                ? "observed"
                : runtimeObservation.overlayState === "error"
                  ? "error"
                  : "not-implemented",
          detail:
            runtimeObservation.overlayState === "ready"
              ? `Live runtime observed overlayMode=${runtimeObservation.overlayMode}, renderMode=${runtimeObservation.overlayRenderMode}, pointCount=${runtimeObservation.overlayPointCount}.`
              : "Live runtime did not expose a ready satellite overlay path."
        },
        walkerOnlyKnownGap:
          walkerOnlyLiveRuntime && runtimeObservation.overlayState === "ready"
            ? "The current live LEO path is still the copied walker proof fixture. It must not be read as non-walker LEO or >=500 LEO closure."
            : null
      };
    }

    return {
      orbitClass,
      contractCoverage: {
        status: orbitClassDeclared ? "partial" : "missing",
        detail:
          "Physical-input declares the orbit class and the repo keeps generic scenario/source descriptors, but the viewer runtime does not yet wire a distinct orbit-class-specific live source."
      },
      liveRuntimeCoverage: {
        status: "not-implemented",
        detail:
          "The current viewer runtime exposes only the walker-backed overlay line and no distinct live MEO/GEO source path."
      },
      walkerOnlyKnownGap:
        "The current live runtime collapses satellite scope back to the walker proof line, so this orbit class has no live validation coverage yet."
    };
  });
}

function createKnownGaps(matrix, runtimeObservation, targetLeoCount) {
  const knownGaps = [];

  if (
    matrix.some(
      (entry) => entry.liveRuntimeCoverage.status === "walker-only"
    )
  ) {
    knownGaps.push(
      "Live runtime coverage is still bounded to off|walker-points on the copied walker fixture."
    );
  }

  if (runtimeObservation.overlayPointCount < targetLeoCount) {
    knownGaps.push(
      `Observed live runtime pointCount=${runtimeObservation.overlayPointCount} is below the Phase 7.1 target of ${targetLeoCount} LEO.`
    );
  }

  if (
    matrix.some(
      (entry) => entry.orbitClass !== "leo" && entry.liveRuntimeCoverage.status !== "observed"
    )
  ) {
    knownGaps.push(
      "MEO/GEO live runtime coverage is not implemented in the current viewer evidence path."
    );
  }

  return knownGaps;
}

function createPassFailSummary(matrix, contractSignals, runtimeObservation, config, knownGaps) {
  const captureReady = Object.values(runtimeObservation.captureHandles).every(Boolean);
  const contractScopeSignalsPassed =
    contractSignals.scenarioSatelliteSourceKinds.length === 2 &&
    contractSignals.satelliteFixtureKinds.length === 3 &&
    REQUIRED_ORBIT_CLASSES.every((orbitClass) =>
      contractSignals.physicalInputOrbitClasses.includes(orbitClass)
    );
  const overlayObserved =
    runtimeObservation.overlayState === "ready" &&
    runtimeObservation.overlayMode === config.validationProfile.requestedOverlayMode &&
    runtimeObservation.overlayRenderMode === "point-label-polyline" &&
    runtimeObservation.overlayPointCount > 0;
  const multiOrbitLiveCoveragePassed = matrix.every(
    (entry) => entry.liveRuntimeCoverage.status === "observed"
  );
  const scaleGatePassed =
    runtimeObservation.overlayPointCount >= config.scaleRunParams.targetLeoCount;
  const knownGapReportingPassed =
    multiOrbitLiveCoveragePassed && scaleGatePassed
      ? knownGaps.length === 0
      : knownGaps.length > 0;

  const gates = [
    {
      id: "contract-scope-signals",
      passed: contractScopeSignalsPassed,
      detail:
        "Repo-owned scenario/satellite/physical-input contracts still expose the required plain-data scope signals."
    },
    {
      id: "capture-ready",
      passed: captureReady,
      detail:
        "Existing viewer capture seam exposed viewer, replayClock, scenarioSession, communicationTime, handoverDecision, validationState, and satelliteOverlay."
    },
    {
      id: "overlay-observed",
      passed: overlayObserved,
      detail: `Requested overlayMode=${config.validationProfile.requestedOverlayMode}, observed overlayState=${runtimeObservation.overlayState}, observed pointCount=${runtimeObservation.overlayPointCount}.`
    },
    {
      id: "multi-orbit-live-coverage",
      passed: multiOrbitLiveCoveragePassed,
      detail:
        "Passes only when leo/meo/geo all have non-placeholder live runtime coverage. Walker-only and not-implemented rows remain failing states."
    },
    {
      id: "500-leo-scale",
      passed: scaleGatePassed,
      detail: `Observed live runtime pointCount=${runtimeObservation.overlayPointCount}; targetLeoCount=${config.scaleRunParams.targetLeoCount}.`
    },
    {
      id: "known-gap-reporting",
      passed: knownGapReportingPassed,
      detail:
        "When closure gates fail, the retained artifact must record explicit known gaps instead of implying closure."
    }
  ];

  return {
    evidenceBoundaryEstablished:
      contractScopeSignalsPassed && captureReady && overlayObserved,
    requirementGatePassed:
      multiOrbitLiveCoveragePassed && scaleGatePassed,
    enforcePass: config.scaleRunParams.enforcePass,
    gates
  };
}

function createRunDirectory(runId) {
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const outputDir = path.join(outputRoot, `${timestamp}-${runId}`);
  mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

function writeJson(outputDir, fileName, payload) {
  writeFileSync(
    path.join(outputDir, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8"
  );
}

async function observeRuntime(baseUrl, browserCommand, requestedOverlayMode) {
  const browser = await startHeadlessBrowser(browserCommand);

  try {
    const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
    const client = await connectCdp(pageWebSocketUrl);

    try {
      await setDeterministicCaptureConditions(client);
      await client.send("Page.navigate", {
        url: `${baseUrl}/`
      });
      const bootstrapObservation = await waitForBootstrapReady(client);
      await dismissNavigationHelpIfVisible(client);
      await freezeNativeClock(client);
      await enableOverlay(client, requestedOverlayMode);
      const overlayObservation = await waitForOverlayReady(client, requestedOverlayMode);

      return {
        ...bootstrapObservation,
        overlayMode: overlayObservation.overlayMode,
        overlayState: overlayObservation.overlayState,
        overlayRenderMode: overlayObservation.overlayRenderMode,
        overlayPointCount: overlayObservation.overlayPointCount,
        overlaySource: overlayObservation.overlaySource,
        overlayControllerState: overlayObservation.controllerState
      };
    } finally {
      await client.close();
    }
  } finally {
    await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = resolveRunConfig(options);
  ensureDistBuildExists();
  mkdirSync(outputRoot, { recursive: true });

  const outputDir = createRunDirectory(config.scaleRunParams.runId);
  const contractSignals = inspectContractSignals();

  writeJson(outputDir, "harness-params.json", {
    schemaVersion: config.schemaVersion,
    validationProfile: config.validationProfile,
    scaleRunParams: config.scaleRunParams,
    startedAt: new Date().toISOString()
  });
  writeJson(outputDir, "contract-signals.json", contractSignals);

  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  let runtimeObservation;

  try {
    runtimeObservation = await observeRuntime(
      baseUrl,
      browserCommand,
      config.validationProfile.requestedOverlayMode
    );
  } finally {
    await stopStaticServer(server);
  }

  const orbitScopeMatrix = createOrbitScopeMatrix(
    contractSignals,
    runtimeObservation
  );
  const knownGaps = createKnownGaps(
    orbitScopeMatrix,
    runtimeObservation,
    config.scaleRunParams.targetLeoCount
  );
  const passFailSummary = createPassFailSummary(
    orbitScopeMatrix,
    contractSignals,
    runtimeObservation,
    config,
    knownGaps
  );

  const observedRuntimeVariant = {
    bootstrapState: runtimeObservation.bootstrapState,
    bootstrapDetail: runtimeObservation.bootstrapDetail,
    scenePreset: runtimeObservation.scenePreset,
    buildingShowcaseState: runtimeObservation.buildingShowcaseState,
    siteTilesetState: runtimeObservation.siteTilesetState,
    scenarioId: runtimeObservation.scenarioId,
    replayMode: runtimeObservation.replayMode,
    communicationStatus: runtimeObservation.communicationStatus,
    handoverDecisionKind: runtimeObservation.handoverDecisionKind,
    validationAttachState: runtimeObservation.validationAttachState,
    overlayMode: runtimeObservation.overlayMode,
    overlayState: runtimeObservation.overlayState,
    overlayRenderMode: runtimeObservation.overlayRenderMode,
    overlayPointCount: runtimeObservation.overlayPointCount,
    captureHandles: runtimeObservation.captureHandles
  };

  const artifactFiles = [
    "harness-params.json",
    "contract-signals.json",
    "observed-runtime.json",
    "orbit-scope-matrix.json",
    "known-gaps.json",
    "summary.json"
  ];

  writeJson(outputDir, "observed-runtime.json", observedRuntimeVariant);
  writeJson(outputDir, "orbit-scope-matrix.json", orbitScopeMatrix);
  writeJson(outputDir, "known-gaps.json", knownGaps);

  const summary = {
    schemaVersion: config.schemaVersion,
    validationProfile: config.validationProfile,
    orbitScopeMatrix,
    scaleRunParams: {
      ...config.scaleRunParams,
      observedLeoCount: runtimeObservation.overlayPointCount,
      observedOverlayRenderMode: runtimeObservation.overlayRenderMode
    },
    observedRuntimeVariant,
    passFailSummary,
    knownGaps,
    artifactLayout: {
      outputDir,
      files: artifactFiles,
      retentionDays: config.validationProfile.retentionDays
    }
  };

  writeJson(outputDir, "summary.json", summary);

  console.log(
    `Phase 7.1 validation artifact written to ${path.relative(repoRoot, outputDir)}`
  );
  console.log(
    `evidenceBoundaryEstablished=${summary.passFailSummary.evidenceBoundaryEstablished} requirementGatePassed=${summary.passFailSummary.requirementGatePassed}`
  );

  if (
    config.scaleRunParams.enforcePass &&
    !summary.passFailSummary.requirementGatePassed
  ) {
    throw new Error(
      `Phase 7.1 requirement gate failed. See ${path.relative(repoRoot, path.join(outputDir, "summary.json"))}.`
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
