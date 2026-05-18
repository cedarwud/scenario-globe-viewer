import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "../bootstrap-smoke-browser.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "../bootstrap-smoke-server.mjs";

export { evaluateRuntimeValue };

const DEFAULT_BROWSER_ARGS = [
  "--use-angle=swiftshader-webgl",
  "--enable-unsafe-swiftshader"
];

export const DOM_CAPTURE_HELPERS_SCRIPT = String.raw`
const normalize = (value) => (value ?? "").replace(/\s+/g, " ").trim();
const isVisible = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    element.hidden !== true &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
};
const rectToPlain = (rect) => ({
  left: rect.left,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height
});
const visibleTextNodes = (scope) => {
  const nodes = [];
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = normalize(node.textContent);
    const parent = node.parentElement;

    if (text && parent && isVisible(parent)) {
      nodes.push(text);
    }
  }

  return nodes;
};
const visibleTextClassificationFailures = (scope) => {
  const failures = [];
  const validInfoClasses = new Set([
    "fixed",
    "dynamic",
    "disclosure",
    "control"
  ]);
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = normalize(node.textContent);
    const parent = node.parentElement;

    if (!text || !parent || !isVisible(parent)) {
      continue;
    }

    const classified = parent.closest("[data-m8a-v48-info-class]");
    const infoClass =
      classified?.getAttribute("data-m8a-v48-info-class") ?? null;

    if (!validInfoClasses.has(infoClass)) {
      failures.push({
        text,
        parent: parent.tagName.toLowerCase(),
        infoClass
      });
    }
  }

  return failures;
};
const readSurface = (selector) => {
  const element = document.querySelector(selector);

  if (!(element instanceof HTMLElement)) {
    return {
      selector,
      mounted: false,
      visible: false,
      rect: null,
      text: ""
    };
  }

  return {
    selector,
    mounted: true,
    visible: isVisible(element),
    rect: rectToPlain(element.getBoundingClientRect()),
    text: normalize(element.innerText)
  };
};
`;

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function ensureOutputRoot(outputRoot) {
  mkdirSync(outputRoot, { recursive: true });
}

export async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 480
  });
}

export async function waitForGlobeReady(client, label = "runtime smoke") {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const viewer = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.viewer;

        return {
          hasViewer: Boolean(viewer),
          tilesLoaded: viewer?.scene?.globe?.tilesLoaded === true,
          imageryLayerCount: viewer?.imageryLayers?.length ?? null
        };
      })()`
    );

    if (lastState?.hasViewer && lastState?.tilesLoaded) {
      await sleep(250);
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`${label} globe did not settle: ${JSON.stringify(lastState)}`);
}

export function rectsOverlap(first, second) {
  if (!first || !second || first.width <= 0 || second.width <= 0) {
    return false;
  }

  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

export function assertRectInsideViewport(rect, viewport, context, label = "runtime smoke") {
  assert(
    rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.left >= -1 &&
      rect.top >= -1 &&
      rect.right <= viewport.width + 1 &&
      rect.bottom <= viewport.height + 1,
    `${label} visual surface escaped the viewport matrix bounds: ${JSON.stringify({
      context,
      viewport,
      rect
    })}`
  );
}

export async function clickAt(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  });
}

export async function captureScreenshot(client, outputRoot, filename) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  const absolutePath = path.join(outputRoot, filename);

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, Buffer.from(result.data, "base64"));

  return absolutePath;
}

export function writeJsonArtifact(outputRoot, filename, payload) {
  mkdirSync(outputRoot, { recursive: true });

  const absolutePath = path.join(outputRoot, filename);

  writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);

  return absolutePath;
}

export async function withStaticSmokeBrowser(callback, options = {}) {
  ensureDistBuildExists();

  const serverHandle = await startStaticServer();
  const browserCommand = findHeadlessBrowser();
  const browserHandle = await startHeadlessBrowser(
    browserCommand,
    options.browserArgs ?? DEFAULT_BROWSER_ARGS
  );
  let client;

  try {
    await verifyFetches(serverHandle.baseUrl);

    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );

    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    return await callback({
      client,
      baseUrl: serverHandle.baseUrl,
      browserCommand,
      browserHandle,
      serverHandle
    });
  } finally {
    if (client) {
      await client.close();
    }

    await stopHeadlessBrowser(browserHandle);
    await stopStaticServer(serverHandle.server);
  }
}
