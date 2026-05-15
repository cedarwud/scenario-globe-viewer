import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
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

function robustRmSync(dirPath) {
  try {
    rmSync(dirPath, { recursive: true, force: true });
  } catch {
    try {
      execFileSync("rm", ["-rf", dirPath]);
    } catch {
      // best-effort cleanup
    }
  }
}

const requiredDistFiles = [
  "index.html",
  "cesium/Assets/approximateTerrainHeights.json",
  "cesium/Assets/Images/ion-credit.png",
  "cesium/Workers/createTaskProcessorWorker.js"
];

const viewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1
};

const SOAK_SCHEMA_VERSION = "phase7.0-soak-evidence.v1";
const DEFAULT_MEMORY_THRESHOLD_MB = 512;
const MIN_STALE_WINDOW_MS = 45_000;
const BOOTSTRAP_READY_TIMEOUT_MS = 12_000;
const TERMINATION_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"];
const FAILURE_BUFFER_INIT_SCRIPT = `(() => {
  const serialize = (value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: typeof value.stack === "string" ? value.stack : null
      };
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  };

  const pushFailure = (entry) => {
    const buffer = Array.isArray(window.__SCENARIO_GLOBE_SOAK_FAILURES__)
      ? window.__SCENARIO_GLOBE_SOAK_FAILURES__
      : [];

    buffer.push(entry);

    if (buffer.length > 200) {
      buffer.splice(0, buffer.length - 200);
    }

    window.__SCENARIO_GLOBE_SOAK_FAILURES__ = buffer;
  };

  window.__SCENARIO_GLOBE_SOAK_FAILURES__ = [];

  window.addEventListener("error", (event) => {
    pushFailure({
      timestamp: new Date().toISOString(),
      kind: "window-error",
      message:
        typeof event.message === "string" && event.message.length > 0
          ? event.message
          : "Window error",
      detail: {
        source: event.filename || null,
        line: Number.isFinite(event.lineno) ? event.lineno : null,
        column: Number.isFinite(event.colno) ? event.colno : null,
        error: serialize(event.error)
      }
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const serializedReason = serialize(event.reason);

    pushFailure({
      timestamp: new Date().toISOString(),
      kind: "unhandledrejection",
      message:
        typeof serializedReason === "string" && serializedReason.length > 0
          ? serializedReason
          : "Unhandled promise rejection",
      detail: {
        reason: serializedReason
      }
    });
  });
})();`;

const PROFILE_DEFAULTS = {
  rehearsal: {
    runId: "phase7-0-rehearsal",
    durationMs: 180_000,
    sampleIntervalMs: 15_000,
    maxFailures: 0,
    retentionDays: 14,
    screenshotOnFailure: false
  },
  full: {
    runId: "phase7-0-full",
    durationMs: 24 * 60 * 60 * 1000,
    sampleIntervalMs: 60_000,
    maxFailures: 0,
    retentionDays: 30,
    screenshotOnFailure: false
  }
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createTerminationController() {
  let requestedSignal = null;
  let resolveTermination;
  const terminationPromise = new Promise((resolve) => {
    resolveTermination = resolve;
  });

  return {
    request(signal) {
      if (requestedSignal) {
        return false;
      }

      requestedSignal = signal;
      resolveTermination(signal);
      return true;
    },
    wait() {
      return terminationPromise;
    },
    get requested() {
      return requestedSignal !== null;
    },
    get signal() {
      return requestedSignal;
    }
  };
}

function installTerminationHandlers(termination) {
  const handlers = TERMINATION_SIGNALS.map((signal) => {
    const handler = () => {
      termination.request(signal);
    };

    process.on(signal, handler);
    return { signal, handler };
  });

  return () => {
    for (const { signal, handler } of handlers) {
      process.off(signal, handler);
    }
  };
}

function createTerminationError(signal) {
  const error = new Error(`Soak harness received ${signal} before completion.`);
  error.name = "SoakTerminationError";
  error.signal = signal;
  return error;
}

function isTerminationError(error) {
  return error instanceof Error && error.name === "SoakTerminationError";
}

function throwIfTerminationRequested(termination) {
  if (termination.requested) {
    throw createTerminationError(termination.signal);
  }
}

async function waitForNextSample(waitMs, termination) {
  if (waitMs <= 0) {
    return;
  }

  throwIfTerminationRequested(termination);
  await Promise.race([sleep(waitMs), termination.wait()]);
  throwIfTerminationRequested(termination);
}

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

  throw new Error(`${label} must be true or false.`);
}

function parseOptionalPositiveInteger(value, label) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function parseOptionalNonNegativeInteger(value, label) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function sanitizeRunId(runId) {
  const sanitized = runId.trim().replace(/[^A-Za-z0-9._-]+/g, "-");
  return sanitized.replace(/^-+/, "").replace(/-+$/, "") || "soak-run";
}

function resolveRunParams(options) {
  const profile = typeof options.profile === "string" ? options.profile : "rehearsal";
  const defaults = PROFILE_DEFAULTS[profile];

  if (!defaults) {
    throw new Error(`Unknown soak profile: ${profile}`);
  }

  const runId =
    typeof options["run-id"] === "string" ? options["run-id"].trim() : defaults.runId;

  if (!runId) {
    throw new Error("run-id must be non-empty.");
  }

  const durationMs =
    parseOptionalPositiveInteger(options["duration-ms"], "duration-ms") ??
    defaults.durationMs;
  const sampleIntervalMs =
    parseOptionalPositiveInteger(
      options["sample-interval-ms"],
      "sample-interval-ms"
    ) ?? defaults.sampleIntervalMs;
  const maxFailures =
    parseOptionalNonNegativeInteger(options["max-failures"], "max-failures") ??
    defaults.maxFailures;
  const retentionDays =
    parseOptionalPositiveInteger(options["retention-days"], "retention-days") ??
    defaults.retentionDays;
  const screenshotOnFailure =
    parseOptionalBoolean(
      options["screenshot-on-failure"],
      "screenshot-on-failure"
    ) ?? defaults.screenshotOnFailure;

  if (sampleIntervalMs > durationMs) {
    throw new Error("sample-interval-ms must not exceed duration-ms.");
  }

  return {
    runId,
    profile,
    durationMs,
    sampleIntervalMs,
    maxFailures,
    retentionDays,
    screenshotOnFailure
  };
}

function resolveHarnessPolicy(params) {
  return {
    memoryThresholdMb: DEFAULT_MEMORY_THRESHOLD_MB,
    staleWindowMs: Math.max(params.sampleIntervalMs * 3, MIN_STALE_WINDOW_MS),
    staleRuleArmCondition: "replayPlaying === true"
  };
}

function resolveOutputPaths(options, params) {
  const startedAtToken = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultRelativePath = path.join(
    "output",
    "soak",
    `${startedAtToken}-${sanitizeRunId(params.runId)}`
  );
  const requestedOutputDir =
    typeof options["output-dir"] === "string" && options["output-dir"].trim().length > 0
      ? options["output-dir"].trim()
      : defaultRelativePath;
  const absoluteOutputDir = path.isAbsolute(requestedOutputDir)
    ? requestedOutputDir
    : path.resolve(repoRoot, requestedOutputDir);
  const relativeOutputDir = path.relative(repoRoot, absoluteOutputDir) || ".";

  return {
    absoluteOutputDir,
    relativeOutputDir,
    paramsFile: path.join(absoluteOutputDir, "harness-params.json"),
    summaryFile: path.join(absoluteOutputDir, "summary.json"),
    samplesFile: path.join(absoluteOutputDir, "samples.ndjson"),
    errorsFile: path.join(absoluteOutputDir, "errors.ndjson"),
    screenshotsDir: path.join(absoluteOutputDir, "screenshots")
  };
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build` before this validation.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(existsSync(absolutePath), `Missing soak harness fixture: dist/${relativePath}`);
    assert(statSync(absolutePath).isFile(), `Expected dist/${relativePath} to be a file`);
  }
}

function ensureArtifactDirectory(outputPaths) {
  mkdirSync(outputPaths.absoluteOutputDir, { recursive: true });
  writeFileSync(outputPaths.samplesFile, "", "utf8");
  writeFileSync(outputPaths.errorsFile, "", "utf8");
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeHarnessMetadata(filePath, params, policy, runtimeVariant) {
  writeJson(filePath, {
    params,
    policy,
    runtimeVariant
  });
}

function appendNdjson(filePath, value) {
  appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
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
    "Missing a supported headless browser. Install google-chrome or chromium to run soak validation."
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
      reject(new Error(`Timed out waiting for soak server. Output: ${serverLog}`));
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
        new Error(`Soak server exited before readiness. Code: ${code}. Output: ${serverLog}`)
      );
    });
  });
}

async function stopStaticServer(server) {
  if (!server.killed) {
    server.kill("SIGTERM");
  }

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

function startHeadlessBrowser(browserCommand) {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "scenario-globe-viewer-soak-"));

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
        "--remote-debugging-port=0",
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
      robustRmSync(userDataDir);
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
      robustRmSync(userDataDir);
      reject(error);
    });
    browserProcess.once("exit", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      robustRmSync(userDataDir);
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

  robustRmSync(userDataDir);
}

async function resolvePageWebSocketUrl(browserWebSocketUrl) {
  const browserUrl = new URL(browserWebSocketUrl);
  const inspectorBaseUrl = `${browserUrl.protocol === "wss:" ? "https" : "http"}://${browserUrl.host}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
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

async function evaluateValue(client, expression, { awaitPromise = false } = {}) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });

  return evaluation.result.value;
}

async function waitForBootstrapReady(client) {
  let lastState = null;
  const attempts = Math.ceil(BOOTSTRAP_READY_TIMEOUT_MS / 100);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastState = await evaluateValue(
      client,
      `(() => {
        const root = document.documentElement;
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
          // Keep the ready gate aligned with the Phase 7.0 evidence surfaces the
          // harness actually samples, instead of coupling readiness to unrelated
          // runtime attachments.
          captureReady: Boolean(
            capture?.viewer &&
              capture?.replayClock &&
              capture?.scenarioSession &&
              capture?.communicationTime &&
              capture?.handoverDecision &&
              capture?.validationState
          )
        };
      })()`
    );

    if (lastState.bootstrapState === "ready" && lastState.captureReady) {
      return lastState;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Soak harness hit bootstrap error before readiness: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Soak harness did not reach a ready viewer: ${JSON.stringify(lastState)}`
  );
}

async function takeSoakSample(client) {
  const pageState = await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const scenarioState =
        capture?.scenarioSession?.getCurrentScenario?.() ??
        capture?.scenarioSession?.getState?.()?.currentScenario ??
        null;
      const replayState = capture?.replayClock?.getState?.() ?? null;
      const communicationState = capture?.communicationTime?.getState?.() ?? null;
      const handoverState = capture?.handoverDecision?.getState?.() ?? null;
      const validationState = capture?.validationState?.getState?.() ?? null;

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
        scenarioId: scenarioState?.scenarioId ?? null,
        replayTime:
          typeof replayState?.currentTime === "string" ? replayState.currentTime : null,
        replayPlaying:
          typeof replayState?.isPlaying === "boolean" ? replayState.isPlaying : null,
        communicationStatus: communicationState?.currentStatus?.kind ?? null,
        handoverDecisionKind: handoverState?.result?.decisionKind ?? null,
        validationAttachState: validationState?.attachState ?? null
      };
    })()`
  );

  let memoryUsageMb;

  try {
    const heapUsage = await client.send("Runtime.getHeapUsage");

    if (typeof heapUsage.usedSize === "number") {
      memoryUsageMb = Math.round((heapUsage.usedSize / (1024 * 1024)) * 10) / 10;
    }
  } catch {
    memoryUsageMb = undefined;
  }

  return {
    sample: {
      timestamp: new Date().toISOString(),
      bootstrapState: pageState.bootstrapState ?? "unknown",
      ...(pageState.scenarioId ? { scenarioId: pageState.scenarioId } : {}),
      ...(pageState.replayTime ? { replayTime: pageState.replayTime } : {}),
      ...(typeof pageState.replayPlaying === "boolean"
        ? { replayPlaying: pageState.replayPlaying }
        : {}),
      ...(pageState.communicationStatus
        ? { communicationStatus: pageState.communicationStatus }
        : {}),
      ...(pageState.handoverDecisionKind
        ? { handoverDecisionKind: pageState.handoverDecisionKind }
        : {}),
      ...(pageState.validationAttachState
        ? { validationAttachState: pageState.validationAttachState }
        : {}),
      ...(typeof memoryUsageMb === "number" ? { memoryUsageMb } : {})
    },
    bootstrapDetail:
      typeof pageState.bootstrapDetail === "string" ? pageState.bootstrapDetail : undefined
  };
}

async function resolveRuntimeVariant(client) {
  const runtimeVariant = await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        buildingShowcase: root?.dataset.buildingShowcase ?? null,
        buildingShowcaseSource: root?.dataset.buildingShowcaseSource ?? null,
        buildingShowcaseState: root?.dataset.buildingShowcaseState ?? null,
        siteTilesetState: root?.dataset.siteTilesetState ?? null
      };
    })()`
  );

  return runtimeVariant && typeof runtimeVariant === "object"
    ? runtimeVariant
    : null;
}

async function drainPageFailures(client) {
  const failures = await evaluateValue(
    client,
    `(() => {
      if (!Array.isArray(window.__SCENARIO_GLOBE_SOAK_FAILURES__)) {
        return [];
      }

      return window.__SCENARIO_GLOBE_SOAK_FAILURES__.splice(
        0,
        window.__SCENARIO_GLOBE_SOAK_FAILURES__.length
      );
    })()`
  );

  return Array.isArray(failures) ? failures : [];
}

function serializeErrorDetail(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(typeof error.signal === "string" ? { signal: error.signal } : {})
    };
  }

  return {
    reason: String(error)
  };
}

function sanitizeFileToken(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
}

async function captureFailureScreenshot(client, outputPaths, failure) {
  mkdirSync(outputPaths.screenshotsDir, { recursive: true });
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });
  const screenshotPath = path.join(
    outputPaths.screenshotsDir,
    `${sanitizeFileToken(failure.timestamp)}-${sanitizeFileToken(failure.kind)}.png`
  );
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
}

async function recordFailure({
  failure,
  failures,
  outputPaths,
  params,
  client
}) {
  failures.push(failure);
  appendNdjson(outputPaths.errorsFile, failure);

  if (params.screenshotOnFailure && client) {
    try {
      await captureFailureScreenshot(client, outputPaths, failure);
    } catch {
      // Screenshot capture is optional evidence only.
    }
  }
}

function createBootstrapErrorFailure(message, detail) {
  return {
    timestamp: new Date().toISOString(),
    kind: "bootstrap-error",
    message,
    ...(detail ? { detail } : {})
  };
}

function createTerminationFailure(signal) {
  return createBootstrapErrorFailure(
    `Soak harness received ${signal} before completion.`,
    {
      signal
    }
  );
}

function createTeardownFailure(stage, error) {
  return createBootstrapErrorFailure(`Soak harness failed during ${stage}.`, {
    stage,
    error: serializeErrorDetail(error)
  });
}

async function runSoakHarness({
  params,
  outputPaths,
  policy
}) {
  ensureDistBuildExists();
  ensureArtifactDirectory(outputPaths);
  writeHarnessMetadata(outputPaths.paramsFile, params, policy, null);

  const browserCommand = findHeadlessBrowser();
  const termination = createTerminationController();
  const removeTerminationHandlers = installTerminationHandlers(termination);
  const failures = [];
  let sampleCount = 0;
  let server;
  let browser;
  let client;
  let lastReplayTime;
  let lastReplayTimeAdvanceAtMs = Date.now();
  const startedAt = new Date().toISOString();

  try {
    throwIfTerminationRequested(termination);
    const startedServer = await startStaticServer();
    server = startedServer.server;
    throwIfTerminationRequested(termination);

    browser = await startHeadlessBrowser(browserCommand);
    throwIfTerminationRequested(termination);

    const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
    throwIfTerminationRequested(termination);
    client = await connectCdp(pageWebSocketUrl);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      mobile: false
    });
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: FAILURE_BUFFER_INIT_SCRIPT
    });
    await client.send("Page.navigate", {
      url: `${startedServer.baseUrl}/`
    });

    await waitForBootstrapReady(client);
    throwIfTerminationRequested(termination);
    writeHarnessMetadata(
      outputPaths.paramsFile,
      params,
      policy,
      await resolveRuntimeVariant(client)
    );

    const deadlineMs = Date.now() + params.durationMs;

    while (true) {
      throwIfTerminationRequested(termination);
      const { sample, bootstrapDetail } = await takeSoakSample(client);
      sampleCount += 1;
      appendNdjson(outputPaths.samplesFile, sample);

      const pageFailures = await drainPageFailures(client);
      const sawPageFailure = pageFailures.length > 0;

      for (const failure of pageFailures) {
        await recordFailure({
          failure,
          failures,
          outputPaths,
          params,
          client
        });
      }

      if (sample.bootstrapState === "error" && !sawPageFailure) {
        await recordFailure({
          failure: createBootstrapErrorFailure(
            bootstrapDetail || "bootstrapState entered error",
            {
              bootstrapState: sample.bootstrapState
            }
          ),
          failures,
          outputPaths,
          params,
          client
        });
      }

      if (sample.replayTime) {
        if (sample.replayTime !== lastReplayTime) {
          lastReplayTime = sample.replayTime;
          lastReplayTimeAdvanceAtMs = Date.now();
        } else if (
          sample.replayPlaying === true &&
          Date.now() - lastReplayTimeAdvanceAtMs >= policy.staleWindowMs
        ) {
          await recordFailure({
            failure: {
              timestamp: new Date().toISOString(),
              kind: "state-stale",
              message:
                "Replay state stopped advancing while the soak harness expected active playback.",
              detail: {
                replayTime: sample.replayTime,
                staleWindowMs: policy.staleWindowMs,
                sampleIntervalMs: params.sampleIntervalMs
              }
            },
            failures,
            outputPaths,
            params,
            client
          });
        }
      }

      if (
        typeof sample.memoryUsageMb === "number" &&
        sample.memoryUsageMb > policy.memoryThresholdMb
      ) {
        await recordFailure({
          failure: {
            timestamp: new Date().toISOString(),
            kind: "memory-threshold",
            message: `JS heap usage exceeded the soak threshold (${policy.memoryThresholdMb} MB).`,
            detail: {
              observedMemoryUsageMb: sample.memoryUsageMb,
              memoryThresholdMb: policy.memoryThresholdMb
            }
          },
          failures,
          outputPaths,
          params,
          client
        });
      }

      if (failures.length > params.maxFailures) {
        break;
      }

      const nowMs = Date.now();

      if (nowMs >= deadlineMs) {
        break;
      }

      await waitForNextSample(
        Math.min(params.sampleIntervalMs, deadlineMs - nowMs),
        termination
      );
    }
  } catch (error) {
    await recordFailure({
      failure:
        isTerminationError(error) && typeof error.signal === "string"
          ? createTerminationFailure(error.signal)
          : createBootstrapErrorFailure(
              error instanceof Error ? error.message : "Soak harness failed",
              serializeErrorDetail(error)
            ),
      failures,
      outputPaths,
      params,
      client: isTerminationError(error) ? undefined : client
    });
  } finally {
    removeTerminationHandlers();

    const teardownFailures = [];

    if (client) {
      try {
        await client.close();
      } catch (error) {
        teardownFailures.push(createTeardownFailure("CDP client close", error));
      }
    }

    if (browser) {
      try {
        await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
      } catch (error) {
        teardownFailures.push(createTeardownFailure("headless browser stop", error));
      }
    }

    if (server) {
      try {
        await stopStaticServer(server);
      } catch (error) {
        teardownFailures.push(createTeardownFailure("static server stop", error));
      }
    }

    for (const failure of teardownFailures) {
      await recordFailure({
        failure,
        failures,
        outputPaths,
        params
      });
    }
  }

  const summary = {
    schemaVersion: SOAK_SCHEMA_VERSION,
    runId: params.runId,
    profile: params.profile,
    durationMs: params.durationMs,
    sampleIntervalMs: params.sampleIntervalMs,
    passed: failures.length <= params.maxFailures,
    failureCount: failures.length,
    sampleCount,
    startedAt,
    endedAt: new Date().toISOString(),
    outputDir: outputPaths.relativeOutputDir
  };

  writeJson(outputPaths.summaryFile, summary);
  return summary;
}

function isMainModule() {
  return typeof process.argv[1] === "string" && path.resolve(process.argv[1]) === __filename;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const params = resolveRunParams(options);
  const outputPaths = resolveOutputPaths(options, params);
  const policy = resolveHarnessPolicy(params);

  if (options["dry-run"]) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          params,
          policy,
          outputDir: outputPaths.relativeOutputDir
        },
        null,
        2
      )
    );
    return;
  }

  const summary = await runSoakHarness({
    params,
    outputPaths,
    policy
  });

  if (!summary.passed) {
    throw new Error(
      `Soak ${params.profile} failed with ${summary.failureCount} failures. See ${summary.outputDir}.`
    );
  }

  console.log(
    `Phase 7.0 ${params.profile} soak passed: ${JSON.stringify(summary)}`
  );
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
