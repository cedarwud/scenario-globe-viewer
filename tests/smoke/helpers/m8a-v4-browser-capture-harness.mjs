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

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

    return await callback({ client, baseUrl: serverHandle.baseUrl });
  } finally {
    if (client) {
      await client.close();
    }

    await stopHeadlessBrowser(browserHandle);
    await stopStaticServer(serverHandle.server);
  }
}
