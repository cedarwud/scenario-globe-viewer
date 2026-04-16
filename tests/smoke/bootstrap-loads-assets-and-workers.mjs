import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAmbientSiteTilesetUrlAllowed } from "../../scripts/site-hook-guard.mjs";

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

const desktopViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1
};

const shortViewport = {
  width: 1440,
  height: 760,
  deviceScaleFactor: 1
};

const OSM_BUILDINGS_PRE_ATTACH_FAILURE_INIT_SCRIPT = `
(() => {
  const shouldFail = (url) =>
    typeof url === "string" && url.includes("/v1/assets/96188");

  const OriginalXMLHttpRequest = window.XMLHttpRequest;
  class FailingOsmBuildingsXMLHttpRequest extends OriginalXMLHttpRequest {
    open(method, url, ...rest) {
      this.__scenarioGlobeViewerUrl = typeof url === "string" ? url : String(url);
      return super.open(method, url, ...rest);
    }

    send(...args) {
      if (shouldFail(this.__scenarioGlobeViewerUrl)) {
        queueMicrotask(() => {
          this.dispatchEvent(new ProgressEvent("error"));
        });
        return;
      }

      return super.send(...args);
    }
  }

  window.XMLHttpRequest = FailingOsmBuildingsXMLHttpRequest;
})();
`;

const OSM_BUILDINGS_POST_ATTACH_FAILURE_INIT_SCRIPT = `
(() => {
  const shouldFail = (url) => {
    if (typeof url !== "string" || url.includes("/v1/assets/96188")) {
      return false;
    }

    if (url.includes("tileset.json")) {
      return false;
    }

    return (
      url.includes("96188") ||
      /\\.(b3dm|cmpt|glb|i3dm|pnts|subtree)(\\?|$)/i.test(url)
    );
  };

  const OriginalXMLHttpRequest = window.XMLHttpRequest;
  class FailingOsmBuildingsContentXMLHttpRequest extends OriginalXMLHttpRequest {
    open(method, url, ...rest) {
      this.__scenarioGlobeViewerUrl = typeof url === "string" ? url : String(url);
      return super.open(method, url, ...rest);
    }

    send(...args) {
      if (shouldFail(this.__scenarioGlobeViewerUrl)) {
        queueMicrotask(() => {
          this.dispatchEvent(new ProgressEvent("error"));
        });
        return;
      }

      return super.send(...args);
    }
  }

  window.XMLHttpRequest = FailingOsmBuildingsContentXMLHttpRequest;
})();
`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveSmokeSuite() {
  const requestedSuite = process.argv.find((argument) =>
    argument.startsWith("--suite=")
  );
  const suite = requestedSuite?.slice("--suite=".length) ?? "baseline";

  assert(
    suite === "baseline" ||
      suite === "cleanup-baseline" ||
      suite === "showcase" ||
      suite === "showcase-env" ||
      suite === "site-dataset" ||
      suite === "site-hook-conflict",
    `Unsupported smoke suite: ${suite}`
  );

  return suite;
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

async function evaluateValue(client, expression) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true
  });

  return evaluation.result.value;
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
  return await evaluateValue(
    client,
    `(() => {
      const root = document.documentElement;
      const lightingToggle = document.querySelector('[data-lighting-toggle="true"]');
      const hudFrame = document.querySelector('[data-hud-frame="true"]');
      const timePlaceholder = document.querySelector('[data-time-placeholder="true"]');

      return {
        bootstrapState: root?.dataset.bootstrapState ?? null,
        bootstrapDetail: root?.dataset.bootstrapDetail ?? null,
        scenePreset: root?.dataset.scenePreset ?? null,
        buildingShowcase: root?.dataset.buildingShowcase ?? null,
        buildingShowcaseSource: root?.dataset.buildingShowcaseSource ?? null,
        buildingShowcaseState: root?.dataset.buildingShowcaseState ?? null,
        buildingShowcaseDetail: root?.dataset.buildingShowcaseDetail ?? null,
        siteTilesetState: root?.dataset.siteTilesetState ?? null,
        siteTilesetDetail: root?.dataset.siteTilesetDetail ?? null,
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
        hasHudFrame: Boolean(hudFrame),
        hudVisibility:
          hudFrame instanceof HTMLElement
            ? hudFrame.getAttribute('data-hud-visibility')
            : null,
        isHudFrameHidden:
          hudFrame instanceof HTMLElement
            ? getComputedStyle(hudFrame).display === 'none'
            : false,
        hudPanelCount: document.querySelectorAll('[data-hud-panel]').length,
        hasTimePlaceholder: Boolean(timePlaceholder),
        timePlaceholderFieldCount: timePlaceholder
          ? timePlaceholder.querySelectorAll('[data-time-field]').length
          : 0,
        hasLightingToggle: Boolean(lightingToggle),
        hasLightingToggleDisabled:
          lightingToggle?.getAttribute('data-lighting-enabled') === 'false',
        hasUnpressedLightingToggle:
          lightingToggle?.getAttribute('aria-pressed') === 'false'
      };
    })()`
  );
}

async function readHudLayoutState(client) {
  return await evaluateValue(
    client,
    `(() => {
      const pickRect = (selector) => {
        const element = document.querySelector(selector);

        if (!element) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          zIndex: style.zIndex,
          pointerEvents: style.pointerEvents
        };
      };

      const describeElementAt = (x, y) => {
        const element = document.elementFromPoint(x, y);

        if (!element) {
          return null;
        }

        return {
          tagName: element.tagName,
          className: typeof element.className === "string" ? element.className : "",
          title:
            typeof element.getAttribute === "function"
              ? element.getAttribute("title")
              : null,
          dataHudPanel:
            typeof element.getAttribute === "function"
              ? element.getAttribute("data-hud-panel")
              : null
        };
      };

      const leftPanel = pickRect(".hud-panel--left");
      const rightPanel = pickRect(".hud-panel--right");
      const statusPanel = pickRect(".hud-panel--status");
      const timePlaceholder = document.querySelector('[data-time-placeholder="true"]');
      const activeElement = document.activeElement;
      const geocoderInput = document.querySelector(".cesium-geocoder-input");
      const geocoderRect = pickRect(".cesium-geocoder-input");
      const geocoderSearchButton = pickRect(".cesium-geocoder-searchButton");
      const baseLayerPickerToggle = pickRect(".cesium-baseLayerPicker-selected");
      const baseLayerDropdown = pickRect(".cesium-baseLayerPicker-dropDown");

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        hudFrame: pickRect(".hud-frame"),
        hudVisibility:
          document
            .querySelector(".hud-frame")
            ?.getAttribute("data-hud-visibility") ?? null,
        leftPanel,
        rightPanel,
        statusPanel,
        timePlaceholder: pickRect('[data-time-placeholder="true"]'),
        timePlaceholderText:
          timePlaceholder instanceof HTMLElement ? timePlaceholder.innerText : "",
        timePlaceholderInteractiveCount:
          timePlaceholder instanceof HTMLElement
            ? timePlaceholder.querySelectorAll("button, input, select").length
            : 0,
        toolbar: pickRect(".cesium-viewer-toolbar"),
        animation: pickRect(".cesium-viewer-animationContainer"),
        timeline: pickRect(".cesium-viewer-timelineContainer"),
        bottom: pickRect(".cesium-viewer-bottom"),
        creditText: pickRect(".cesium-credit-textContainer"),
        activeElement:
          activeElement instanceof HTMLElement
            ? {
                tagName: activeElement.tagName,
                className:
                  typeof activeElement.className === "string" ? activeElement.className : ""
              }
            : null,
        geocoderInput: geocoderRect
          ? {
              ...geocoderRect,
              value: geocoderInput instanceof HTMLInputElement ? geocoderInput.value : "",
              className: geocoderInput instanceof HTMLInputElement ? geocoderInput.className : ""
            }
          : null,
        geocoderSearchButton,
        baseLayerPickerToggle,
        baseLayerDropdown,
        leftPanelCenterElement:
          leftPanel && leftPanel.width > 0 && leftPanel.height > 0
            ? describeElementAt(
                leftPanel.left + leftPanel.width / 2,
                leftPanel.top + leftPanel.height / 2
              )
            : null,
        rightPanelCenterElement:
          rightPanel && rightPanel.width > 0 && rightPanel.height > 0
            ? describeElementAt(
                rightPanel.left + rightPanel.width / 2,
                rightPanel.top + rightPanel.height / 2
              )
            : null,
        geocoderCenterElement:
          geocoderRect && geocoderRect.width > 0 && geocoderRect.height > 0
            ? describeElementAt(
                geocoderRect.left + Math.min(geocoderRect.width / 2, geocoderRect.width - 8),
                geocoderRect.top + geocoderRect.height / 2
              )
            : null,
        geocoderSearchButtonCenterElement:
          geocoderSearchButton &&
          geocoderSearchButton.width > 0 &&
          geocoderSearchButton.height > 0
            ? describeElementAt(
                geocoderSearchButton.left + geocoderSearchButton.width / 2,
                geocoderSearchButton.top + geocoderSearchButton.height / 2
              )
            : null,
        baseLayerPickerToggleCenterElement:
          baseLayerPickerToggle &&
          baseLayerPickerToggle.width > 0 &&
          baseLayerPickerToggle.height > 0
            ? describeElementAt(
                baseLayerPickerToggle.left + baseLayerPickerToggle.width / 2,
                baseLayerPickerToggle.top + baseLayerPickerToggle.height / 2
              )
            : null
      };
    })()`
  );
}

async function waitForCondition(client, description, predicateExpression, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const matched = await evaluateValue(client, predicateExpression);

    if (matched) {
      return;
    }

    await sleep(100);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

function assertStatusOnlyHudShell(layoutState, scenarioLabel) {
  assert(layoutState.hudFrame, `Missing HUD frame during ${scenarioLabel}.`);
  assert(
    layoutState.hudVisibility === "status-only",
    `Expected HUD shell to advertise status-only placeholder state during ${scenarioLabel}: ${JSON.stringify(layoutState.hudVisibility)}`
  );
  assert(
    layoutState.hudFrame.display !== "none",
    `Expected HUD frame to stay mounted during ${scenarioLabel}: ${JSON.stringify(layoutState.hudFrame)}`
  );
  assert(layoutState.leftPanel, `Missing left HUD panel during ${scenarioLabel}.`);
  assert(layoutState.rightPanel, `Missing right HUD panel during ${scenarioLabel}.`);
  assert(layoutState.statusPanel, `Missing status HUD panel during ${scenarioLabel}.`);
  assert(
    layoutState.leftPanel.width === 0 && layoutState.leftPanel.height === 0,
    `Expected hidden left HUD panel to take no layout area during ${scenarioLabel}: ${JSON.stringify(layoutState.leftPanel)}`
  );
  assert(
    layoutState.rightPanel.width === 0 && layoutState.rightPanel.height === 0,
    `Expected hidden right HUD panel to take no layout area during ${scenarioLabel}: ${JSON.stringify(layoutState.rightPanel)}`
  );
}

function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

async function dispatchMouseClick(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
    buttons: 0
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
}

function assertStatusOnlyHudReadout(layoutState, scenarioLabel) {
  assert(
    layoutState.statusPanel.width > 0 && layoutState.statusPanel.height > 0,
    `Expected status HUD panel to stay visible during ${scenarioLabel}: ${JSON.stringify(layoutState.statusPanel)}`
  );
  assert(
    layoutState.timePlaceholder &&
      layoutState.timePlaceholder.width > 0 &&
      layoutState.timePlaceholder.height > 0,
    `Expected time placeholder to stay visible during ${scenarioLabel}: ${JSON.stringify(layoutState.timePlaceholder)}`
  );
  assert(
    layoutState.timePlaceholderInteractiveCount === 0,
    `Expected time placeholder to stay read-only during ${scenarioLabel}: ${JSON.stringify(layoutState.timePlaceholderInteractiveCount)}`
  );
  assert(
    /timeline/i.test(layoutState.timePlaceholderText) &&
      /mode/i.test(layoutState.timePlaceholderText) &&
      /current/i.test(layoutState.timePlaceholderText) &&
      /range/i.test(layoutState.timePlaceholderText) &&
      /state/i.test(layoutState.timePlaceholderText),
    `Expected time placeholder text fields during ${scenarioLabel}: ${JSON.stringify(layoutState.timePlaceholderText)}`
  );
}

function assertDesktopHudStatusOnlyState(layoutState, scenarioLabel) {
  assert(layoutState.viewport.width === 1440, `Expected desktop width during ${scenarioLabel}.`);
  assert(layoutState.viewport.height === 900, `Expected desktop height during ${scenarioLabel}.`);
  assertStatusOnlyHudShell(layoutState, scenarioLabel);
  assertStatusOnlyHudReadout(layoutState, scenarioLabel);
  assert(
    layoutState.toolbar && layoutState.toolbar.width > 0 && layoutState.toolbar.height > 0,
    `Expected native toolbar to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.toolbar)}`
  );
  assert(
    layoutState.timeline &&
      layoutState.timeline.width > 0 &&
      layoutState.timeline.height > 0,
    `Expected native timeline to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.timeline)}`
  );
  assert(
    layoutState.bottom && layoutState.bottom.width > 0 && layoutState.bottom.height > 0,
    `Expected native credits band to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.bottom)}`
  );
}

function assertShortHudStatusOnlyState(layoutState, scenarioLabel) {
  assert(layoutState.viewport.width === 1440, `Expected short width during ${scenarioLabel}.`);
  assert(layoutState.viewport.height === 760, `Expected short height during ${scenarioLabel}.`);
  assertStatusOnlyHudShell(layoutState, scenarioLabel);
  assertStatusOnlyHudReadout(layoutState, scenarioLabel);
  assert(
    layoutState.toolbar && layoutState.toolbar.width > 0 && layoutState.toolbar.height > 0,
    `Expected native toolbar to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.toolbar)}`
  );
  assert(
    layoutState.timeline &&
      layoutState.timeline.width > 0 &&
      layoutState.timeline.height > 0,
    `Expected native timeline to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.timeline)}`
  );
  assert(
    layoutState.bottom && layoutState.bottom.width > 0 && layoutState.bottom.height > 0,
    `Expected native credits band to remain visible during ${scenarioLabel}: ${JSON.stringify(layoutState.bottom)}`
  );
}

async function activateGeocoderAndInsertText(client, value) {
  let layoutState = await readHudLayoutState(client);
  assert(
    layoutState.geocoderSearchButton &&
      layoutState.geocoderSearchButton.width > 0 &&
      layoutState.geocoderSearchButton.height > 0,
    `Missing a user-reachable native geocoder search button: ${JSON.stringify(layoutState.geocoderSearchButton)}`
  );
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: rectCenter(layoutState.geocoderSearchButton).x,
    y: rectCenter(layoutState.geocoderSearchButton).y,
    button: "none",
    buttons: 0
  });
  await waitForCondition(
    client,
    "hover-expanded geocoder input",
    `(() => {
      const input = document.querySelector(".cesium-geocoder-input");
      return input instanceof HTMLInputElement &&
        input.getBoundingClientRect().width >= 200;
    })()`
  );
  layoutState = await readHudLayoutState(client);
  assert(
    layoutState.geocoderInput &&
      layoutState.geocoderInput.width >= 200 &&
      layoutState.geocoderInput.height > 0,
    `Expected hover-expanded geocoder input geometry before pointer focus: ${JSON.stringify(layoutState.geocoderInput)}`
  );
  assert(
    layoutState.geocoderCenterElement?.tagName === "INPUT",
    `Expected hover-expanded geocoder input to expose a real input hit target: ${JSON.stringify(layoutState.geocoderCenterElement)}`
  );
  await dispatchMouseClick(client, {
    x: layoutState.geocoderInput.left + Math.min(32, layoutState.geocoderInput.width / 4),
    y: layoutState.geocoderInput.top + layoutState.geocoderInput.height / 2
  });
  await waitForCondition(
    client,
    "pointer-focused geocoder input",
    `(() => {
      const input = document.querySelector(".cesium-geocoder-input");
      return input instanceof HTMLInputElement &&
        document.activeElement === input;
    })()`
  );
  await client.send("Input.insertText", { text: value });
  await waitForCondition(
    client,
    "expanded geocoder input",
    `(() => {
      const input = document.querySelector(".cesium-geocoder-input");
      return input instanceof HTMLInputElement &&
        input.value === ${JSON.stringify(value)} &&
        input.classList.contains("cesium-geocoder-input-wide");
    })()`
  );
}

async function toggleBaseLayerPicker(client) {
  const layoutState = await readHudLayoutState(client);
  assert(
    layoutState.baseLayerPickerToggle &&
      layoutState.baseLayerPickerToggle.width > 0 &&
      layoutState.baseLayerPickerToggle.height > 0,
    `Missing a user-reachable native BaseLayerPicker toggle: ${JSON.stringify(layoutState.baseLayerPickerToggle)}`
  );
  await dispatchMouseClick(client, rectCenter(layoutState.baseLayerPickerToggle));
}

async function dismissBaseLayerPicker(client) {
  const closed = await evaluateValue(
    client,
    `(() => {
      const toggle = document.querySelector(".cesium-baseLayerPicker-selected");
      if (!(toggle instanceof HTMLElement)) {
        return false;
      }

      toggle.click();
      return true;
    })()`
  );

  assert(closed, "Expected BaseLayerPicker toggle to exist while dismissing dropdown.");
}

async function dismissNavigationHelpIfVisible(client) {
  const dismissed = await evaluateValue(
    client,
    `(() => {
      const visiblePanel = document.querySelector(".cesium-click-navigation-help-visible");
      const button = document.querySelector(".cesium-navigation-help-button");

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

async function runDesktopNativeControlChecks(client, scenarioLabel) {
  await activateGeocoderAndInsertText(client, "Taipei");
  let layoutState = await readHudLayoutState(client);

  assert(
    layoutState.geocoderInput?.className.includes("cesium-geocoder-input-wide"),
    `Expected geocoder input to stay expanded during ${scenarioLabel}: ${JSON.stringify(layoutState.geocoderInput)}`
  );
  assert(
    layoutState.activeElement?.tagName === "INPUT" &&
      layoutState.activeElement.className.includes("cesium-geocoder-input"),
    `Expected pointer click on the native geocoder control to focus the input during ${scenarioLabel}: ${JSON.stringify(layoutState.activeElement)}`
  );
  assert(
    layoutState.geocoderCenterElement?.tagName === "INPUT",
    `Expected geocoder input to remain directly reachable with the status-only HUD placeholder during ${scenarioLabel}: ${JSON.stringify(layoutState.geocoderCenterElement)}`
  );
  assert(
    layoutState.geocoderSearchButtonCenterElement !== null,
    `Expected a concrete geocoder search-button hit target during ${scenarioLabel}.`
  );
  assertStatusOnlyHudShell(layoutState, `${scenarioLabel}/geocoder`);
  assertStatusOnlyHudReadout(layoutState, `${scenarioLabel}/geocoder`);

  await toggleBaseLayerPicker(client);
  await waitForCondition(
    client,
    "opened BaseLayerPicker",
    `(() => {
      const dropdown = document.querySelector(".cesium-baseLayerPicker-dropDown");
      return dropdown instanceof HTMLElement && getComputedStyle(dropdown).visibility === "visible";
    })()`
  );

  layoutState = await readHudLayoutState(client);
  assert(
    layoutState.baseLayerDropdown?.visibility === "visible",
    `Expected BaseLayerPicker dropdown to be visible during ${scenarioLabel}: ${JSON.stringify(layoutState.baseLayerDropdown)}`
  );
  assert(
    layoutState.baseLayerPickerToggleCenterElement !== null,
    `Expected a concrete BaseLayerPicker toggle hit target during ${scenarioLabel}.`
  );
  assert(
    layoutState.baseLayerDropdown &&
      layoutState.baseLayerDropdown.width > 0 &&
      layoutState.baseLayerDropdown.height > 0,
    `Expected opened BaseLayerPicker dropdown to remain visible with the status-only HUD placeholder during ${scenarioLabel}: ${JSON.stringify(layoutState.baseLayerDropdown)}`
  );
  assertStatusOnlyHudShell(layoutState, `${scenarioLabel}/base-layer-picker`);
  assertStatusOnlyHudReadout(layoutState, `${scenarioLabel}/base-layer-picker`);

  await dismissBaseLayerPicker(client);
  await waitForCondition(
    client,
    "closed BaseLayerPicker",
    `(() => {
      const dropdown = document.querySelector(".cesium-baseLayerPicker-dropDown");
      return dropdown instanceof HTMLElement && getComputedStyle(dropdown).visibility !== "visible";
    })()`
  );
}

function buildingShowcaseMatchesExpectation(lastState, expectedBuildingShowcase) {
  return (
    lastState.buildingShowcase === expectedBuildingShowcase.key &&
    lastState.buildingShowcaseSource === expectedBuildingShowcase.source &&
    expectedBuildingShowcase.allowedStates.includes(lastState.buildingShowcaseState)
  );
}

function siteTilesetMatchesExpectation(lastState, expectedSiteTileset) {
  return (
    expectedSiteTileset.allowedStates.includes(lastState.siteTilesetState) &&
    (!expectedSiteTileset.detailSubstring ||
      lastState.siteTilesetDetail?.includes(expectedSiteTileset.detailSubstring))
  );
}

function baselineShellMatchesExpectation(lastState) {
  return (
    lastState.sceneFogActive === "true" &&
    lastState.sceneFogDensity === "0.0006" &&
    lastState.sceneFogVisualDensityScalar === "0.15" &&
    lastState.sceneFogHeightScalar === "0.001" &&
    lastState.sceneFogHeightFalloff === "0.59" &&
    lastState.sceneFogMaxHeight === "800000" &&
    lastState.sceneFogMinimumBrightness === "0.03" &&
    lastState.sceneBloomActive === "false" &&
    lastState.hasViewerShell &&
    lastState.hasHudFrame &&
    lastState.hudVisibility === "status-only" &&
    !lastState.isHudFrameHidden &&
    lastState.hudPanelCount >= 3 &&
    lastState.hasTimePlaceholder &&
    lastState.timePlaceholderFieldCount === 5 &&
    lastState.hasLightingToggle &&
    lastState.hasLightingToggleDisabled &&
    lastState.hasUnpressedLightingToggle
  );
}

async function waitForBootstrapReady(client, scenario, attemptLabel) {
  let lastState = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastState = await readBootstrapState(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === scenario.expectedScenePreset &&
      buildingShowcaseMatchesExpectation(
        lastState,
        scenario.expectedBuildingShowcase
      ) &&
      siteTilesetMatchesExpectation(lastState, scenario.expectedSiteTileset) &&
      (!scenario.requireFullBaselineState ||
        baselineShellMatchesExpectation(lastState))
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `Phase 1 smoke hit bootstrap error during ${scenario.label}/${attemptLabel}: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(250);
  }

  throw new Error(
    `Phase 1 smoke did not reach a ready viewer during ${scenario.label}/${attemptLabel}: ${JSON.stringify(lastState)}`
  );
}

async function verifyInjectedOsmBuildingsFailure(
  client,
  scenarioLabel,
  expectedStates,
  expectedDetailSubstring
) {
  await waitForCondition(
    client,
    `${scenarioLabel} OSM Buildings fallback`,
    `(() => {
      const root = document.documentElement;
      return root?.dataset.bootstrapState === "ready" &&
        root?.dataset.buildingShowcase === "osm" &&
        ${JSON.stringify(expectedStates)}.includes(root?.dataset.buildingShowcaseState ?? "") &&
        ${
          expectedDetailSubstring
            ? `typeof root?.dataset.buildingShowcaseDetail === "string" &&
              root.dataset.buildingShowcaseDetail.includes(${JSON.stringify(expectedDetailSubstring)})`
            : "true"
        };
    })()`
  );

  const lastState = await readBootstrapState(client);
  assert(
    lastState.bootstrapState === "ready",
    `Expected bootstrap to stay ready after OSM Buildings failure during ${scenarioLabel}: ${JSON.stringify(lastState)}`
  );
  assert(
    expectedStates.includes(lastState.buildingShowcaseState),
    `Expected injected OSM Buildings failure to surface as an opt-in showcase error during ${scenarioLabel}: ${JSON.stringify(lastState)}`
  );
  assert(
    lastState.buildingShowcaseState !== "ready",
    `Expected injected OSM Buildings failure to avoid a ready showcase state during ${scenarioLabel}: ${JSON.stringify(lastState)}`
  );
  if (expectedDetailSubstring) {
    assert(
      lastState.buildingShowcaseDetail?.includes(expectedDetailSubstring),
      `Expected injected OSM Buildings failure detail to mention ${expectedDetailSubstring} during ${scenarioLabel}: ${JSON.stringify(lastState)}`
    );
  }
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

async function verifyBootstrapInHeadlessBrowser(baseUrl, suite) {
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
  const dormantSiteTileset = {
    allowedStates: ["dormant"]
  };

  const baselineScenarios = [
    {
      label: "default-global",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      validateLayout: (layoutState) => {
        assertDesktopHudStatusOnlyState(layoutState, "default-global");
      },
      runInteractiveChecks: async (client) => {
        await runDesktopNativeControlChecks(client, "default-global");
      },
      requireFullBaselineState: true
    },
    {
      label: "regional-query",
      requestPath: "/?scenePreset=regional",
      expectedScenePreset: "regional",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      requireFullBaselineState: true
    },
    {
      label: "site-query",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      requireFullBaselineState: true
    },
    {
      label: "default-global-short",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: shortViewport,
      validateLayout: (layoutState) => {
        assertShortHudStatusOnlyState(layoutState, "default-global-short");
      },
      requireFullBaselineState: true
    }
  ];
  const cleanupBaselineScenarios = [
    {
      label: "cleanup-baseline-default-global",
      requestPath: "/",
      expectedScenePreset: "global",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      requireFullBaselineState: false
    }
  ];
  const showcaseScenarios = [
    // The live ion-backed showcase path is not a hard happy-path gate.
    // This scenario only proves that an explicit opt-in is wired into
    // bootstrap and surfaces a non-disabled showcase state without breaking
    // the baseline viewer shell. Deterministic failure-state handling is
    // covered by the injected-failure scenarios below.
    {
      label: "site-osm-buildings-opt-in-wiring",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "ready", "degraded", "error"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport
    },
    {
      label: "site-osm-buildings-preattach-fallback",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "error"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      initScript: OSM_BUILDINGS_PRE_ATTACH_FAILURE_INIT_SCRIPT,
      runAfterReady: async (client) => {
        await verifyInjectedOsmBuildingsFailure(
          client,
          "site-osm-buildings-preattach-fallback",
          ["error"]
        );
      }
    },
    {
      label: "site-osm-buildings-postattach-fallback",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "error", "degraded"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport,
      initScript: OSM_BUILDINGS_POST_ATTACH_FAILURE_INIT_SCRIPT,
      runAfterReady: async (client) => {
        await verifyInjectedOsmBuildingsFailure(
          client,
          "site-osm-buildings-postattach-fallback",
          ["error", "degraded"],
          "Tile/content failure after attachment"
        );
      }
    }
  ];
  const showcaseEnvScenarios = [
    {
      label: "site-osm-buildings-env-opt-in-wiring",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "env",
        allowedStates: ["loading", "ready", "degraded", "error"]
      },
      expectedSiteTileset: dormantSiteTileset,
      viewport: desktopViewport
    }
  ];
  const siteHookConflictScenarios = [
    {
      label: "site-osm-buildings-blocks-configured-site-hook",
      requestPath: "/?scenePreset=site&buildingShowcase=osm",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "osm",
        source: "query-param",
        allowedStates: ["loading", "ready", "degraded", "error"]
      },
      expectedSiteTileset: {
        allowedStates: ["blocked"],
        detailSubstring: "OSM Buildings showcase is active"
      },
      viewport: desktopViewport
    }
  ];
  const siteDatasetScenarios = [
    {
      label: "site-configured-dataset-ready",
      requestPath: "/?scenePreset=site",
      expectedScenePreset: "site",
      expectedBuildingShowcase: {
        key: "off",
        source: "default-off",
        allowedStates: ["disabled"]
      },
      expectedSiteTileset: {
        allowedStates: ["ready"],
        detailSubstring: "Loaded configured site dataset"
      },
      viewport: desktopViewport,
      requireFullBaselineState: true
    }
  ];
  const scenarios =
    suite === "baseline"
      ? baselineScenarios
      : suite === "cleanup-baseline"
        ? cleanupBaselineScenarios
        : suite === "showcase"
        ? showcaseScenarios
        : suite === "showcase-env"
          ? showcaseEnvScenarios
          : suite === "site-dataset"
            ? siteDatasetScenarios
          : siteHookConflictScenarios;

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
          if (scenario.initScript) {
            await client.send("Page.addScriptToEvaluateOnNewDocument", {
              source: scenario.initScript
            });
          }
          await client.send("Emulation.setDeviceMetricsOverride", {
            width: scenario.viewport.width,
            height: scenario.viewport.height,
            deviceScaleFactor: scenario.viewport.deviceScaleFactor,
            mobile: false
          });
          await client.send("Page.navigate", { url: requestUrl });
          await waitForBootstrapReady(client, scenario, attempt.label);
          await dismissNavigationHelpIfVisible(client);
          if (scenario.validateLayout) {
            scenario.validateLayout(await readHudLayoutState(client));
          }
          if (scenario.runInteractiveChecks) {
            await scenario.runInteractiveChecks(client);
          }
          if (scenario.runAfterReady) {
            await scenario.runAfterReady(client);
          }
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
  const suite = resolveSmokeSuite();
  assertAmbientSiteTilesetUrlAllowed(`Phase 1 ${suite} smoke`, {
    allowConfiguredSiteTileset:
      suite === "site-hook-conflict" || suite === "site-dataset"
  });
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
    await verifyBootstrapInHeadlessBrowser(baseUrl, suite);
    console.log(`Phase 1 ${suite} smoke verification passed.`);
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
