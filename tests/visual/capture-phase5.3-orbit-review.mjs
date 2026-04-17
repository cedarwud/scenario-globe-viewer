import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAmbientSiteTilesetUrlAllowed } from "../../scripts/site-hook-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const distRoot = path.join(repoRoot, "dist");
const outputDir = path.join(repoRoot, "docs/images/phase-5.3-orbits");
const outputFile = "global-preset-overlay-orbits.png";

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

const fixedCaptureClockIso = "2026-04-16T00:00:10.250Z";
const fixedCaptureClockEpochMs = Date.parse(fixedCaptureClockIso);
const WALKER_POLYLINE_SAMPLE_BUDGET = 49;
const WALKER_POLYLINE_CACHE_BUCKET_MS = 60_000;

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
    "Missing a supported headless browser. Install google-chrome or chromium to capture the Phase 5.3 orbit review artifact."
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
    `scenario-globe-viewer-phase5.3-orbits-${process.pid}-${Date.now()}`
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

async function readBootstrapState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        buildingShowcase: root?.dataset.buildingShowcase ?? null,
        buildingShowcaseSource: root?.dataset.buildingShowcaseSource ?? null,
        buildingShowcaseState: root?.dataset.buildingShowcaseState ?? null,
        siteTilesetState: root?.dataset.siteTilesetState ?? null,
        sceneFogActive: root?.dataset.sceneFogActive ?? null,
        sceneFogDensity: root?.dataset.sceneFogDensity ?? null,
        sceneFogVisualDensityScalar:
          root?.dataset.sceneFogVisualDensityScalar ?? null,
        sceneFogHeightScalar: root?.dataset.sceneFogHeightScalar ?? null,
        sceneFogHeightFalloff: root?.dataset.sceneFogHeightFalloff ?? null,
        sceneFogMaxHeight: root?.dataset.sceneFogMaxHeight ?? null,
        sceneFogMinimumBrightness:
          root?.dataset.sceneFogMinimumBrightness ?? null,
        sceneBloomActive: root?.dataset.sceneBloomActive ?? null
      };
    })()`
  );
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await readBootstrapState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global" &&
      lastState.buildingShowcase === "off" &&
      lastState.buildingShowcaseSource === "default-off" &&
      lastState.buildingShowcaseState === "disabled" &&
      lastState.siteTilesetState === "dormant" &&
      lastState.sceneFogActive === "true" &&
      lastState.sceneFogDensity === "0.0006" &&
      lastState.sceneFogVisualDensityScalar === "0.15" &&
      lastState.sceneFogHeightScalar === "0.001" &&
      lastState.sceneFogHeightFalloff === "0.59" &&
      lastState.sceneFogMaxHeight === "800000" &&
      lastState.sceneFogMinimumBrightness === "0.03" &&
      lastState.sceneBloomActive === "false"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Phase 5.3 orbit capture hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `Phase 5.3 orbit capture did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

async function enableOrbitOverlay(client) {
  const result = await evaluateValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;

      if (!capture?.satelliteOverlay) {
        return Promise.resolve({ ok: false, error: "Missing capture satellite overlay handle." });
      }

      return capture.satelliteOverlay
        .setMode("walker-points")
        .then((state) => ({ ok: true, state }))
        .catch((error) => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        }));
    })()`
  );

  assert(
    result?.ok === true,
    `Phase 5.3 orbit capture failed to enable the overlay: ${JSON.stringify(result)}`
  );
}

async function readOverlayCaptureState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controllerState = capture?.satelliteOverlay?.getState?.() ?? null;
      const viewer = capture?.viewer;
      let projectedPointCount = 0;
      let projectedLabelCount = 0;
      let walkerPointDataSourceCount = 0;
      let walkerPolylineEntityCount = 0;
      let maxWalkerPolylinePositionCount = 0;

      const resolvePropertyValue = (property, time) => {
        if (property && typeof property.getValue === "function") {
          return property.getValue(time);
        }

        return property ?? null;
      };

      if (viewer) {
        for (let index = 0; index < viewer.dataSources.length; index += 1) {
          const dataSource = viewer.dataSources.get(index);

          if (dataSource.name !== "walker-point-overlay") {
            continue;
          }

          walkerPointDataSourceCount += 1;

          for (const entity of dataSource.entities.values) {
            const labelText = entity.label
              ? resolvePropertyValue(entity.label.text, viewer.clock.currentTime)
              : null;
            const polylinePositions =
              entity.polyline?.positions
                ? resolvePropertyValue(entity.polyline.positions, viewer.clock.currentTime)
                : null;
            const polylinePositionCount = Array.isArray(polylinePositions)
              ? polylinePositions.length
              : 0;

            if (polylinePositionCount > 0) {
              walkerPolylineEntityCount += 1;
              maxWalkerPolylinePositionCount = Math.max(
                maxWalkerPolylinePositionCount,
                polylinePositionCount
              );
            }

            if (!entity.point || !entity.position) {
              continue;
            }

            const position =
              typeof entity.position.getValue === "function"
                ? entity.position.getValue(viewer.clock.currentTime)
                : null;
            if (!position) {
              continue;
            }

            const canvasPoint = viewer.scene.cartesianToCanvasCoordinates(position);
            if (
              canvasPoint &&
              canvasPoint.x >= 0 &&
              canvasPoint.y >= 0 &&
              canvasPoint.x <= viewer.canvas.clientWidth &&
              canvasPoint.y <= viewer.canvas.clientHeight
            ) {
              projectedPointCount += 1;
              if (
                entity.label &&
                typeof labelText === "string" &&
                labelText.length > 0
              ) {
                projectedLabelCount += 1;
              }
            }
          }
        }
      }

      return {
        overlayMode: root?.dataset.satelliteOverlayMode ?? null,
        overlaySource: root?.dataset.satelliteOverlaySource ?? null,
        overlayState: root?.dataset.satelliteOverlayState ?? null,
        overlayRenderMode: root?.dataset.satelliteOverlayRenderMode ?? null,
        overlayPointCount: Number(root?.dataset.satelliteOverlayPointCount ?? "0"),
        controllerState,
        projectedPointCount,
        projectedLabelCount,
        walkerPointDataSourceCount,
        walkerPolylineEntityCount,
        maxWalkerPolylinePositionCount
      };
    })()`
  );
}

async function waitForOverlayReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await readOverlayCaptureState(client);
    const sampleTimeMs =
      typeof lastState?.controllerState?.sampleTime === "number"
        ? lastState.controllerState.sampleTime
        : Date.parse(lastState?.controllerState?.sampleTime ?? "");

    if (
      lastState.overlayMode === "walker-points" &&
      lastState.overlaySource === "runtime" &&
      lastState.overlayState === "ready" &&
      lastState.overlayRenderMode === "point-label-polyline" &&
      lastState.overlayPointCount === 18 &&
      lastState.controllerState?.pointCount === 18 &&
      lastState.controllerState?.labelCount === 18 &&
      lastState.controllerState?.pathCount === 0 &&
      lastState.controllerState?.polylineCount === 18 &&
      lastState.controllerState?.orbitSampleBudget === WALKER_POLYLINE_SAMPLE_BUDGET &&
      lastState.controllerState?.orbitCacheBucketMs ===
        WALKER_POLYLINE_CACHE_BUCKET_MS &&
      Number.isFinite(sampleTimeMs) &&
      lastState.controllerState?.orbitCacheBucket ===
        Math.floor(sampleTimeMs / WALKER_POLYLINE_CACHE_BUCKET_MS) &&
      lastState.controllerState?.orbitCacheTrackCount === 18 &&
      lastState.controllerState?.orbitCachePositionCount ===
        18 * WALKER_POLYLINE_SAMPLE_BUDGET &&
      lastState.walkerPointDataSourceCount === 1 &&
      lastState.walkerPolylineEntityCount === 18 &&
      lastState.maxWalkerPolylinePositionCount === WALKER_POLYLINE_SAMPLE_BUDGET &&
      lastState.projectedPointCount > 0 &&
      lastState.projectedLabelCount > 0
    ) {
      return;
    }

    if (lastState.overlayState === "error") {
      throw new Error(
        `Phase 5.3 orbit capture hit overlay error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `Phase 5.3 orbit capture did not reach ready overlay state: ${JSON.stringify(lastState)}`
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

async function waitForViewerSettle(client) {
  let lastState = null;
  let stableCount = 0;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const nextState = await readViewerCaptureState(client);
    assert(nextState, "Missing capture viewer handle while settling Phase 5.3 orbit view.");

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

  throw new Error("Timed out waiting for settled Phase 5.3 orbit viewer state.");
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

        static now() {
          return fixedNow;
        }

        static parse(value) {
          return RealDate.parse(value);
        }

        static UTC(...args) {
          return RealDate.UTC(...args);
        }
      }

      Object.defineProperty(globalThis, "Date", {
        configurable: true,
        writable: true,
        value: FixedCaptureDate
      });
    })();`
  });
}

async function captureScenario(baseUrl, browserCommand) {
  const browser = await startHeadlessBrowser(browserCommand);

  try {
    const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
    const client = await connectCdp(pageWebSocketUrl);

    try {
      await setDeterministicCaptureConditions(client);
      await client.send("Page.navigate", {
        url: `${baseUrl}/`
      });
      await waitForBootstrapReady(client);
      await dismissNavigationHelpIfVisible(client);
      await freezeNativeClock(client);
      await enableOrbitOverlay(client);
      await waitForOverlayReady(client);
      await waitForViewerSettle(client);

      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        fromSurface: true
      });

      const outputPath = path.join(outputDir, outputFile);
      writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
      console.log(
        `Captured Phase 5.3 orbit review artifact at ${path.relative(repoRoot, outputPath)}`
      );
    } finally {
      await client.close();
    }
  } finally {
    await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
  }
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build` before this visual capture.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(existsSync(absolutePath), `Missing capture fixture: dist/${relativePath}`);
    assert(statSync(absolutePath).isFile(), `Expected dist/${relativePath} to be a file`);
  }
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
      reject(new Error(`Timed out waiting for visual-capture server. Output: ${serverLog}`));
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
        new Error(`Visual-capture server exited before readiness. Code: ${code}. Output: ${serverLog}`)
      );
    });
  });
}

async function main() {
  assertAmbientSiteTilesetUrlAllowed("phase5.3-orbit-capture");
  ensureDistBuildExists();
  mkdirSync(outputDir, { recursive: true });

  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  try {
    await captureScenario(baseUrl, browserCommand);
  } finally {
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
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
