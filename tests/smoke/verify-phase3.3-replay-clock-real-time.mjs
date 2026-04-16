import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const distRoot = path.join(repoRoot, "dist");

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

function findHeadlessBrowser() {
  const candidates = ["google-chrome", "chromium", "chromium-browser"];

  for (const command of candidates) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });

    if (probe.status === 0) {
      return command;
    }
  }

  throw new Error(
    "Missing a supported headless browser. Install google-chrome or chromium to run Phase 3.3 validation."
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build` before this validation.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(existsSync(absolutePath), `Missing Phase 3.3 fixture: dist/${relativePath}`);
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
      reject(new Error(`Timed out waiting for Phase 3.3 server. Output: ${serverLog}`));
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
        new Error(`Phase 3.3 server exited before readiness. Code: ${code}. Output: ${serverLog}`)
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
  const userDataDir = mkdtempSync(path.join(tmpdir(), "scenario-globe-viewer-phase3.3-"));

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

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateValue(
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
          siteTilesetState: root?.dataset.siteTilesetState ?? null
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global" &&
      lastState.buildingShowcase === "off" &&
      lastState.buildingShowcaseSource === "default-off" &&
      lastState.buildingShowcaseState === "disabled" &&
      lastState.siteTilesetState === "dormant"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Phase 3.3 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `Phase 3.3 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
  );
}

async function runReplayClockChecks(client) {
  return await evaluateValue(
    client,
    `(async () => {
      const sleep = (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        });

      const assert = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      assert(capture?.viewer, "Missing capture viewer handle.");
      assert(capture?.replayClock, "Missing replayClock capture seam.");

      const normalizeTimestampMs = (value) =>
        typeof value === "number" ? value : Date.parse(value);

      const assertSerializableState = (state, label) => {
        assert(state && typeof state === "object", label + ": missing replay clock state.");
        assert(state.mode === "real-time", label + ": expected real-time mode.");
        assert(
          typeof state.currentTime === "string" || typeof state.currentTime === "number",
          label + ": currentTime must stay plain-data."
        );
        assert(
          typeof state.startTime === "string" || typeof state.startTime === "number",
          label + ": startTime must stay plain-data."
        );
        assert(
          typeof state.stopTime === "string" || typeof state.stopTime === "number",
          label + ": stopTime must stay plain-data."
        );
        assert(typeof state.multiplier === "number", label + ": multiplier must stay numeric.");
        assert(typeof state.isPlaying === "boolean", label + ": isPlaying must stay boolean.");
        JSON.stringify(state);
      };

      const snapshotRawClock = () => ({
        dayNumber: capture.viewer.clock.currentTime.dayNumber,
        secondsOfDay: capture.viewer.clock.currentTime.secondsOfDay,
        shouldAnimate: capture.viewer.clock.shouldAnimate,
        multiplier: capture.viewer.clock.multiplier,
        clockRange: capture.viewer.clock.clockRange
      });

      const initialState = capture.replayClock.getState();
      assertSerializableState(initialState, "initial");
      assert(initialState.isPlaying === false, "Initial replay clock should start paused.");
      assert(capture.viewer.clock.shouldAnimate === false, "Initial viewer clock should start paused.");

      const rangeStartMs = normalizeTimestampMs(initialState.currentTime);
      assert(Number.isFinite(rangeStartMs), "Initial replay-clock timestamp must parse.");
      const rangeStopMs = rangeStartMs + 60000;

      capture.replayClock.setMode("real-time", {
        start: rangeStartMs,
        stop: rangeStopMs
      });
      const stateAfterMode = capture.replayClock.getState();
      assertSerializableState(stateAfterMode, "after setMode(real-time, range)");
      assert(
        normalizeTimestampMs(stateAfterMode.startTime) === rangeStartMs,
        "setMode(real-time, range) must update startTime."
      );
      assert(
        normalizeTimestampMs(stateAfterMode.stopTime) === rangeStopMs,
        "setMode(real-time, range) must update stopTime."
      );
      assert(
        capture.viewer.clock.clockRange === 1,
        "setMode(real-time, range) must clamp the active viewer clock range."
      );

      capture.replayClock.setMode("real-time");
      const stateAfterModeWithoutRange = capture.replayClock.getState();
      assert(
        normalizeTimestampMs(stateAfterModeWithoutRange.startTime) === rangeStartMs,
        "setMode(real-time) without range must preserve the active startTime."
      );
      assert(
        normalizeTimestampMs(stateAfterModeWithoutRange.stopTime) === rangeStopMs,
        "setMode(real-time) without range must preserve the active stopTime."
      );

      const rawBeforeSeek = snapshotRawClock();
      const seekTargetMs = rangeStartMs + 15000;
      capture.replayClock.seek(seekTargetMs);
      const stateAfterSeek = capture.replayClock.getState();
      const rawAfterSeek = snapshotRawClock();
      assertSerializableState(stateAfterSeek, "after seek");
      assert(
        normalizeTimestampMs(stateAfterSeek.currentTime) === seekTargetMs,
        "seek must update replay-clock currentTime."
      );
      assert(
        rawAfterSeek.dayNumber !== rawBeforeSeek.dayNumber ||
          Math.abs(rawAfterSeek.secondsOfDay - rawBeforeSeek.secondsOfDay) > 0.0001,
        "seek must update the underlying viewer.clock currentTime."
      );

      capture.replayClock.setMultiplier(4.5);
      const stateAfterMultiplier = capture.replayClock.getState();
      assertSerializableState(stateAfterMultiplier, "after setMultiplier");
      assert(
        capture.viewer.clock.multiplier === 4.5,
        "setMultiplier must update the underlying viewer.clock multiplier."
      );
      assert(
        stateAfterMultiplier.multiplier === 4.5,
        "setMultiplier must update replay-clock state mapping."
      );
      assert(
        stateAfterMultiplier.isPlaying === false,
        "setMultiplier must not auto-play the clock."
      );

      let tickCount = 0;
      let lastTickState = null;
      const unsubscribe = capture.replayClock.onTick((state) => {
        tickCount += 1;
        lastTickState = state;
      });

      const rawBeforePlay = snapshotRawClock();
      capture.replayClock.play();
      await sleep(250);
      const rawAfterPlay = snapshotRawClock();
      assert(
        capture.viewer.clock.shouldAnimate === true,
        "play must update the underlying viewer.clock shouldAnimate flag."
      );
      assert(tickCount > 0, "onTick listener must receive updates while active.");
      assertSerializableState(lastTickState, "tick listener");
      assert(
        rawAfterPlay.dayNumber !== rawBeforePlay.dayNumber ||
          Math.abs(rawAfterPlay.secondsOfDay - rawBeforePlay.secondsOfDay) > 0.0001,
        "play must advance the underlying viewer.clock currentTime."
      );

      capture.replayClock.pause();
      const pausedState = capture.replayClock.getState();
      const rawAfterPause = snapshotRawClock();
      await sleep(150);
      const rawAfterPauseWait = snapshotRawClock();
      assertSerializableState(pausedState, "after pause");
      assert(
        capture.viewer.clock.shouldAnimate === false,
        "pause must update the underlying viewer.clock shouldAnimate flag."
      );
      assert(pausedState.isPlaying === false, "pause must update replay-clock play state.");
      assert(
        rawAfterPause.dayNumber === rawAfterPauseWait.dayNumber &&
          Math.abs(rawAfterPause.secondsOfDay - rawAfterPauseWait.secondsOfDay) < 0.0001,
        "pause must stop viewer.clock time advancement."
      );

      const tickCountBeforeUnsubscribe = tickCount;
      unsubscribe();
      await sleep(150);
      assert(
        tickCount === tickCountBeforeUnsubscribe,
        "onTick unsubscribe must stop further replay-clock callbacks."
      );

      let prerecordedMessage = null;
      try {
        capture.replayClock.setMode("prerecorded");
      } catch (error) {
        prerecordedMessage = error instanceof Error ? error.message : String(error);
      }

      assert(
        typeof prerecordedMessage === "string" && prerecordedMessage.includes("Phase 3.4"),
        "setMode(prerecorded) must fail with an explicit pending boundary."
      );
      const stateAfterPrerecordedAttempt = capture.replayClock.getState();
      assertSerializableState(stateAfterPrerecordedAttempt, "after prerecorded rejection");
      assert(
        stateAfterPrerecordedAttempt.mode === "real-time",
        "Failed prerecorded mode switch must leave the clock in real-time mode."
      );

      return {
        initialState,
        stateAfterMode,
        stateAfterSeek,
        stateAfterMultiplier,
        pausedState,
        tickCount,
        prerecordedMessage
      };
    })()`,
    { awaitPromise: true }
  );
}

async function runValidation(baseUrl, browserCommand) {
  const browser = await startHeadlessBrowser(browserCommand);

  try {
    const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
    const client = await connectCdp(pageWebSocketUrl);

    try {
      await client.send("Page.enable");
      await client.send("Runtime.enable");
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        mobile: false
      });
      await client.send("Page.navigate", {
        url: `${baseUrl}/`
      });
      await waitForBootstrapReady(client);
      const result = await runReplayClockChecks(client);
      console.log(
        `Phase 3.3 replay-clock real-time validation passed: ${JSON.stringify(result)}`
      );
    } finally {
      await client.close();
    }
  } finally {
    await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
  }
}

async function main() {
  ensureDistBuildExists();
  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  try {
    await runValidation(baseUrl, browserCommand);
  } finally {
    await stopStaticServer(server);
  }
}

await main();
