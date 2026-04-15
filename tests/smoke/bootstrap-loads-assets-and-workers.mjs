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

const smokeFetches = [
  {
    pathname: "/",
    verify: async (response) => {
      const html = await response.text();
      assert(
        html.includes('window.CESIUM_BASE_URL = "/cesium/";'),
        "Expected dist index.html to reserve CESIUM_BASE_URL"
      );
    }
  },
  {
    pathname: "/cesium/Assets/approximateTerrainHeights.json"
  },
  {
    pathname: "/cesium/Assets/Images/ion-credit.png"
  },
  {
    pathname: "/cesium/Workers/createTaskProcessorWorker.js",
    verify: async (response) => {
      const workerScript = await response.text();
      assert(
        workerScript.includes("Cesium - https://github.com/CesiumGS/cesium"),
        "Expected worker smoke target to be a Cesium worker module"
      );
    }
  }
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
    "Missing a supported headless browser. Install google-chrome or chromium to run Phase 1 smoke."
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function startHeadlessBrowser(browserCommand, extraArgs = []) {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "scenario-globe-viewer-chrome-"));

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
        ...extraArgs,
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
      reject(new Error(`Headless browser exited before readiness. Code: ${code}. Output: ${browserLog}`));
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

async function readBootstrapState(client) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const root = document.documentElement;
      const lightingToggle = document.querySelector('[data-lighting-toggle="true"]');

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        sceneFogActive: root?.dataset.sceneFogActive ?? null,
        sceneFogDensity: root?.dataset.sceneFogDensity ?? null,
        sceneFogVisualDensityScalar:
          root?.dataset.sceneFogVisualDensityScalar ?? null,
        sceneFogHeightScalar: root?.dataset.sceneFogHeightScalar ?? null,
        sceneFogHeightFalloff: root?.dataset.sceneFogHeightFalloff ?? null,
        sceneFogMaxHeight: root?.dataset.sceneFogMaxHeight ?? null,
        sceneFogMinimumBrightness:
          root?.dataset.sceneFogMinimumBrightness ?? null,
        sceneBloomActive: root?.dataset.sceneBloomActive ?? null,
        hasViewerShell: Boolean(document.querySelector('.cesium-viewer')),
        hasLightingToggle: Boolean(lightingToggle),
        hasLightingToggleDisabled:
          lightingToggle?.getAttribute('data-lighting-enabled') === 'false',
        hasUnpressedLightingToggle:
          lightingToggle?.getAttribute('aria-pressed') === 'false'
      };
    })()`,
    returnByValue: true
  });

  return evaluation.result.value;
}

async function waitForBootstrapReady(client, expectedScenePreset, scenarioLabel, attemptLabel) {
  let lastState = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastState = await readBootstrapState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === expectedScenePreset &&
      lastState.sceneFogActive === "true" &&
      lastState.sceneFogDensity === "0.0006" &&
      lastState.sceneFogVisualDensityScalar === "0.15" &&
      lastState.sceneFogHeightScalar === "0.001" &&
      lastState.sceneFogHeightFalloff === "0.59" &&
      lastState.sceneFogMaxHeight === "800000" &&
      lastState.sceneFogMinimumBrightness === "0.03" &&
      lastState.sceneBloomActive === "false" &&
      lastState.hasViewerShell &&
      lastState.hasLightingToggle &&
      lastState.hasLightingToggleDisabled &&
      lastState.hasUnpressedLightingToggle
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Phase 1 smoke hit bootstrap error during ${scenarioLabel}/${attemptLabel}: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(250);
  }

  throw new Error(
    `Phase 1 smoke did not reach a ready viewer during ${scenarioLabel}/${attemptLabel}: ${JSON.stringify(lastState)}`
  );
}

function ensureDistBuildExists() {
  assert(existsSync(distRoot), "Missing dist/. Run `npm run build` before this smoke test.");

  for (const relativePath of requiredDistFiles) {
    const absolutePath = path.join(distRoot, relativePath);
    assert(existsSync(absolutePath), `Missing smoke fixture: dist/${relativePath}`);
    assert(statSync(absolutePath).isFile(), `Expected dist/${relativePath} to be a file`);
  }
}

async function verifyFetches(baseUrl) {
  for (const target of smokeFetches) {
    const response = await fetch(`${baseUrl}${target.pathname}`);
    assert(response.ok, `Expected ${target.pathname} to return 200, received ${response.status}`);

    if (target.verify) {
      await target.verify(response);
    }
  }
}

async function verifyBootstrapInHeadlessBrowser(baseUrl) {
  const browserCommand = findHeadlessBrowser();
  const attempts = [
    {
      label: "swiftshader-headless",
      extraArgs: [
        "--disable-gpu",
        "--use-angle=swiftshader",
        "--enable-webgl"
      ]
    }
  ];

  const scenarios = [
    {
      label: "default-global",
      requestPath: "/",
      expectedScenePreset: "global"
    },
    {
      label: "regional-query",
      requestPath: "/?scenePreset=regional",
      expectedScenePreset: "regional"
    },
    {
      label: "site-query",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site"
    }
  ];

  for (const scenario of scenarios) {
    for (const attempt of attempts) {
      const browser = await startHeadlessBrowser(browserCommand, attempt.extraArgs);
      const requestUrl = `${baseUrl}${scenario.requestPath}`;

      try {
        const pageWebSocketUrl = await resolvePageWebSocketUrl(browser.browserWebSocketUrl);
        const client = await connectCdp(pageWebSocketUrl);

        try {
          await client.send("Page.enable");
          await client.send("Runtime.enable");
          await client.send("Page.navigate", { url: requestUrl });
          await waitForBootstrapReady(
            client,
            scenario.expectedScenePreset,
            scenario.label,
            attempt.label
          );
        } finally {
          await client.close();
        }
      } finally {
        await stopHeadlessBrowser(browser.browserProcess, browser.userDataDir);
      }
    }
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
      reject(new Error(`Timed out waiting for smoke server. Output: ${serverLog}`));
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
      reject(new Error(`Smoke server exited before readiness. Code: ${code}. Output: ${serverLog}`));
    });
  });
}

async function main() {
  ensureDistBuildExists();

  // Cesium resolves runtime assets from CESIUM_BASE_URL and derives worker
  // module imports from the Workers/ prefix under that same base path.
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/sandcastle/gallery/offline/main.js:10-17
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/buildModuleUrl.js:42-46
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:91-125
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Source/Core/TaskProcessor.js:237-245
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/buildModuleUrlSpec.js:42-70
  // Evidence: /home/u24/papers/project/home-globe-reference-repos/cesium/packages/engine/Specs/Core/TaskProcessorSpec.js:48-90
  const { server, baseUrl } = await startStaticServer();

  try {
    await verifyFetches(baseUrl);
    await verifyBootstrapInHeadlessBrowser(baseUrl);
    console.log("Phase 1 smoke verification passed.");
  } finally {
    await new Promise((resolve) => {
      server.once("exit", () => {
        resolve();
      });
      server.kill("SIGTERM");
    });
  }
}

await main();
