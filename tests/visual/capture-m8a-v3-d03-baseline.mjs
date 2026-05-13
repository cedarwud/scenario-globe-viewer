// M8A-V3 D-03 presentation polish baseline capture.
// Captures desktop-1440x900 screenshots of the V4.12+V4.13 Operator HUD
// across acceptance-relevant routes so the D-03 slice plan can reference
// concrete evidence. Reuses the headless-Chrome pattern from
// `capture-three-preset-baselines.mjs`.

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
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

function resolveProfileArg(argv) {
  const inline = argv.find((value) => value.startsWith("--profile="));

  if (inline) {
    return inline.split("=")[1];
  }

  const flagIndex = argv.indexOf("--profile");

  if (flagIndex >= 0 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1];
  }

  return "baseline";
}

const captureProfileLabel = resolveProfileArg(process.argv);
const captureProfileOutputRoots = new Map([
  ["d03-s2", "output/m8a-v3-d03/d03-s2"],
  ["d03-s4", "output/m8a-v3-d03/d03-s4"]
]);
const outputDir = path.join(
  repoRoot,
  captureProfileOutputRoots.get(captureProfileLabel) ??
    `output/m8a-v3-d03/${captureProfileLabel}`
);
const profileFilenameSuffix =
  captureProfileLabel === "baseline" ? "" : `-${captureProfileLabel}`;

const captureViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1
};

const fixedCaptureClockIso = "2026-05-13T12:00:10.250Z";
const fixedCaptureClockEpochMs = Date.parse(fixedCaptureClockIso);

const captureScenarios = [
  {
    key: "operator-hud-global",
    requestPath: "/?scenePreset=global",
    expectedScenePreset: "global",
    expectAddressedFirstIntake: false,
    outputFile: `operator-hud-global${profileFilenameSuffix}-1440x900.png`
  },
  {
    key: "operator-hud-regional",
    requestPath: "/?scenePreset=regional",
    expectedScenePreset: "regional",
    expectAddressedFirstIntake: false,
    outputFile: `operator-hud-regional${profileFilenameSuffix}-1440x900.png`
  },
  {
    key: "first-intake-addressed-global",
    requestPath:
      "/?firstIntakeRuntimeAddress=app-oneweb-intelsat-geo-aviation&firstIntakeAutoplay=1&scenePreset=global",
    expectedScenePreset: "global",
    expectAddressedFirstIntake: true,
    outputFile: `first-intake-addressed-global${profileFilenameSuffix}-1440x900.png`
  }
];

const requiredDistFiles = [
  "index.html",
  "cesium/Assets/approximateTerrainHeights.json",
  "cesium/Workers/createTaskProcessorWorker.js"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
    "Missing a supported headless browser. Install google-chrome or chromium."
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function startHeadlessBrowser(browserCommand) {
  const userDataDir = path.join(
    tmpdir(),
    `scenario-globe-viewer-d03-${process.pid}-${Date.now()}`
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
      reject(new Error(`Timed out waiting for headless browser. ${browserLog}`));
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
        new Error(`Headless browser exited before readiness. Code: ${code}.`)
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
  const inspectorBaseUrl = `${
    browserUrl.protocol === "wss:" ? "https" : "http"
  }://${browserUrl.host}`;

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
    returnByValue: true
  });

  return evaluation.result.value;
}

async function readBootstrapState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        hudVisibility:
          document.querySelector('[data-hud-frame="true"]')?.dataset
            .hudVisibility ?? null,
        firstIntakeAddressResolution:
          root?.dataset.firstIntakeAddressResolution ?? null
      };
    })()`
  );
}

async function waitForBootstrapReady(client, scenario) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await readBootstrapState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === scenario.expectedScenePreset
    ) {
      return lastState;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Bootstrap error during ${scenario.key}: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `Bootstrap did not reach ready for ${scenario.key}: ${JSON.stringify(
      lastState
    )}`
  );
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
  await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      if (capture?.viewer) {
        capture.viewer.clock.shouldAnimate = false;
      }
      return true;
    })()`
  );
}

async function readViewerCaptureState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      if (!capture?.viewer) {
        return null;
      }
      const camera = capture.viewer.camera.positionCartographic;
      return {
        tilesLoaded: capture.viewer.scene.globe.tilesLoaded,
        longitude: camera?.longitude ?? null,
        latitude: camera?.latitude ?? null,
        height: camera?.height ?? null
      };
    })()`
  );
}

function isCameraStable(previousState, nextState) {
  if (!previousState || !nextState) {
    return false;
  }
  if (
    typeof previousState.longitude !== "number" ||
    typeof previousState.latitude !== "number" ||
    typeof previousState.height !== "number" ||
    typeof nextState.longitude !== "number" ||
    typeof nextState.latitude !== "number" ||
    typeof nextState.height !== "number"
  ) {
    return false;
  }
  return (
    Math.abs(previousState.longitude - nextState.longitude) < 1.0e-6 &&
    Math.abs(previousState.latitude - nextState.latitude) < 1.0e-6 &&
    Math.abs(previousState.height - nextState.height) < 5.0
  );
}

async function waitForViewerSettle(client, scenarioKey) {
  let lastState = null;
  let stableCount = 0;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const nextState = await readViewerCaptureState(client);

    if (!nextState) {
      await sleep(250);
      continue;
    }

    if (nextState.tilesLoaded && isCameraStable(lastState, nextState)) {
      stableCount += 1;
      if (stableCount >= 5) {
        return;
      }
    } else {
      stableCount = 0;
    }

    lastState = nextState;
    await sleep(250);
  }

  throw new Error(`Timed out waiting for settled viewer for ${scenarioKey}`);
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
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const fixedNow = ${fixedCaptureClockEpochMs};
      const RealDate = Date;
      class FixedCaptureDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super(fixedNow);
            return;
          }
          super(...args);
        }
        static now() { return fixedNow; }
        static parse(value) { return RealDate.parse(value); }
        static UTC(...args) { return RealDate.UTC(...args); }
      }
      Object.defineProperty(globalThis, "Date", {
        configurable: true,
        writable: true,
        value: FixedCaptureDate
      });
    })();`
  });
}

async function captureScenario(baseUrl, browserCommand, scenario) {
  const browser = await startHeadlessBrowser(browserCommand);

  try {
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browser.browserWebSocketUrl
    );
    const client = await connectCdp(pageWebSocketUrl);

    try {
      await setDeterministicCaptureConditions(client);
      await client.send("Page.navigate", {
        url: `${baseUrl}${scenario.requestPath}`
      });
      await waitForBootstrapReady(client, scenario);
      await dismissNavigationHelpIfVisible(client);
      await freezeNativeClock(client);
      await waitForViewerSettle(client, scenario.key);

      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        fromSurface: true
      });

      const outputPath = path.join(outputDir, scenario.outputFile);
      writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
      console.log(
        `Captured ${scenario.key} -> ${path.relative(repoRoot, outputPath)}`
      );
    } finally {
      await client.close();
    }
  } finally {
    await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
  }
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build`.");
  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(
      existsSync(absolutePath),
      `Missing capture fixture: dist/${relativePath}`
    );
    assert(
      statSync(absolutePath).isFile(),
      `Expected dist/${relativePath} to be a file`
    );
  }
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn(
      "python3",
      ["-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", distRoot],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
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
      reject(new Error(`Timed out waiting for static server. ${serverLog}`));
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
      reject(new Error(`Static server exited. Code: ${code}.`));
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

async function main() {
  mkdirSync(outputDir, { recursive: true });
  ensureDistBuildExists();

  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  try {
    for (const scenario of captureScenarios) {
      await captureScenario(baseUrl, browserCommand, scenario);
    }
  } finally {
    await stopStaticServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
