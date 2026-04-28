import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "./bootstrap-smoke-browser.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "./bootstrap-smoke-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ROUTE = REQUEST_PATH;
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_PRODUCT_MULTIPLIERS = [30, 60, 120];
const EXPECTED_DEBUG_MULTIPLIER = 240;
const EXPECTED_LABELS = {
  "leo-acquisition-context": "LEO acquire",
  "leo-aging-pressure": "LEO pressure",
  "meo-continuity-hold": "MEO hold",
  "leo-reentry-candidate": "LEO re-entry",
  "geo-continuity-guard": "GEO guard"
};
const REQUIRED_BADGES = [
  "simulation output",
  "operator-family precision",
  "display-context actors"
];
const VIEWPORTS = [
  {
    name: "desktop-1440x900",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshotPath: "output/m8a-v4.7-desktop-1440x900-product-ux.png"
  },
  {
    name: "desktop-1280x720",
    width: 1280,
    height: 720,
    expectedViewportClass: "desktop",
    screenshotPath: "output/m8a-v4.7-desktop-1280x720-product-ux.png"
  },
  {
    name: "narrow-390x844",
    width: 390,
    height: 844,
    expectedViewportClass: "narrow",
    screenshotPath: "output/m8a-v4.7-narrow-390x844-product-ux.png"
  }
];
const FORBIDDEN_POSITIVE_PHRASES = [
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "serving satellite",
  "active gateway assignment",
  "active gateway",
  "pair-specific teleport path",
  "teleport path",
  "native rf handover",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "measured continuity",
  "live network time",
  "operator event time",
  "r2 runtime selector"
];
const FORBIDDEN_UNIT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*ms\b/i,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i,
  /\bmeasured\s+\d+(?:\.\d+)?\s*%/i
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 480
  });
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          v47ProductUx: root?.dataset.m8aV47ProductUx ?? null,
          hasV4Seam: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.v47ProductUx === "m8a-v4.7-handover-product-ux-runtime.v1" &&
      lastState?.hasV4Seam === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.7 route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.7 validation did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function waitForGlobeReady(client) {
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

  throw new Error(
    `M8A-V4.7 globe did not settle: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client);
}

async function captureScreenshot(client, relativePath) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  const absolutePath = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, Buffer.from(result.data, "base64"));
  return absolutePath;
}

async function seekReplayRatio(client, ratio, pause = true) {
  await evaluateRuntimeValue(
    client,
    `((ratio, pause) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();
      const startMs = Date.parse(replayState.startTime);
      const stopMs = Date.parse(replayState.stopTime);
      const targetMs = startMs + (stopMs - startMs) * ratio;

      if (pause) {
        capture.m8aV4GroundStationScene.pause();
      }

      replayClock.seek(new Date(targetMs).toISOString());
    })(${JSON.stringify(ratio)}, ${JSON.stringify(pause)})`
  );
  await sleep(180);
}

async function inspectProductUx(client, viewport) {
  return await evaluateRuntimeValue(
    client,
    `((config) => {
      const assert = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const elementRect = (element) =>
        element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null;
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
      const pointToRect = (point, width, height, label) => ({
        label,
        left: point.x - width / 2,
        right: point.x + width / 2,
        top: point.y - height / 2,
        bottom: point.y + height / 2,
        width,
        height
      });
      const unionRect = (points, padding, label) => {
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);

        return {
          label,
          left: Math.min(...xs) - padding,
          right: Math.max(...xs) + padding,
          top: Math.min(...ys) - padding,
          bottom: Math.max(...ys) + padding,
          width: Math.max(...xs) - Math.min(...xs) + padding * 2,
          height: Math.max(...ys) - Math.min(...ys) + padding * 2
        };
      };
      const intersects = (left, right) =>
        !(
          left.right <= right.left ||
          left.left >= right.right ||
          left.bottom <= right.top ||
          left.top >= right.bottom
        );
      const isNegated = (text, index) => {
        const prefix = text
          .slice(Math.max(0, index - 110), index)
          .toLowerCase();

        return /\\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\\b/.test(
          prefix
        );
      };
      const collectPositiveClaimHits = (text) => {
        const sourceText = String(text ?? "");
        const lowered = sourceText.toLowerCase();
        const hits = [];

        for (const phrase of config.forbiddenPositivePhrases) {
          const needle = phrase.toLowerCase();
          let index = lowered.indexOf(needle);

          while (index !== -1) {
            if (!isNegated(sourceText, index)) {
              hits.push({
                phrase,
                context: sourceText
                  .slice(Math.max(0, index - 70), index + needle.length + 70)
                  .replace(/\\s+/g, " ")
                  .trim()
              });
            }

            index = lowered.indexOf(needle, index + needle.length);
          }
        }

        return hits;
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controller = capture?.m8aV4GroundStationScene;
      const state = controller?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const v46eRoot = document.querySelector("[data-m8a-v4-ground-station-scene='true']");
      const dataSource = capture?.viewer?.dataSources?.getByName?.(
        state?.dataSourceName
      )?.[0];
      const entityPoint = (entityId) => {
        const entity = dataSource?.entities?.getById?.(entityId);
        const position = entity?.position?.getValue?.(
          capture.viewer.clock.currentTime
        );
        const point = position
          ? capture.viewer.scene.cartesianToCanvasCoordinates(position)
          : null;

        return point ? { x: point.x, y: point.y } : null;
      };

      assert(state, "Missing V4.7 runtime state.");
      assert(productRoot instanceof HTMLElement, "Missing V4.7 product UX root.");
      assert(
        v46eRoot instanceof HTMLElement &&
          v46eRoot.hidden === true &&
          v46eRoot.getAttribute("aria-hidden") === "true",
        "V4.6E floating HUD seam must remain hidden."
      );
      assert(
        state.simulationHandoverModel.route === config.expectedRoute &&
          state.simulationHandoverModel.endpointPairId ===
            config.expectedEndpointPairId &&
          state.simulationHandoverModel.acceptedPairPrecision ===
            config.expectedPrecision &&
          state.simulationHandoverModel.modelTruth ===
            "simulation-output-not-operator-log" &&
          state.simulationHandoverModel.modelId === config.expectedModelId,
        "V4.7 must preserve V4.6D route, endpoint, precision, and model truth."
      );
      assert(
        JSON.stringify(state.orbitActorCounts) ===
          JSON.stringify(config.expectedActorCounts),
        "V4.7 actor set must remain 6 LEO / 5 MEO / 2 GEO: " +
          JSON.stringify(state.orbitActorCounts)
      );
      assert(
        state.productUx.playbackPolicy.defaultMultiplier === 60 &&
          JSON.stringify(state.productUx.playbackPolicy.productMultipliers) ===
            JSON.stringify(config.expectedProductMultipliers) &&
          state.productUx.playbackPolicy.debugTestMultiplier ===
            config.expectedDebugMultiplier &&
          state.productUx.playbackPolicy.normalControlsExposeDebugMultiplier === false &&
          state.productUx.playbackPolicy.finalHoldDurationMs >= 3000 &&
          state.productUx.playbackPolicy.finalHoldDurationMs <= 5000,
        "V4.7 playback policy changed: " +
          JSON.stringify(state.productUx.playbackPolicy)
      );
      assert(
        JSON.stringify(state.productUx.stateLabels) ===
          JSON.stringify(config.expectedLabels),
        "V4.7 product label mapping must stay bound to V4.6D windows: " +
          JSON.stringify(state.productUx.stateLabels)
      );
      assert(
        state.productUx.activeProductLabel ===
          config.expectedLabels[state.productUx.activeWindowId],
        "V4.7 active label does not map to active V4.6D window."
      );
      assert(
        state.productUx.layout.viewportClass === config.expectedViewportClass,
        "V4.7 viewport class mismatch: " +
          JSON.stringify(state.productUx.layout)
      );

      const normalSpeedButtons = Array.from(
        productRoot.querySelectorAll("[data-m8a-v47-playback-multiplier]")
      ).filter(isVisible);
      const normalSpeedValues = normalSpeedButtons.map((button) =>
        Number(button.getAttribute("data-m8a-v47-playback-multiplier"))
      );

      assert(
        normalSpeedValues.every((value) =>
          config.expectedProductMultipliers.includes(value)
        ) &&
          !normalSpeedValues.includes(config.expectedDebugMultiplier),
        "V4.7 normal product controls must not expose the 240x debug speed: " +
          JSON.stringify(normalSpeedValues)
      );

      const visibleText = document.body.innerText;
      const visiblePositiveHits = collectPositiveClaimHits(visibleText);
      const forbiddenUnitHits = config.forbiddenUnitPatterns
        .map((pattern) => new RegExp(pattern.source, pattern.flags))
        .filter((pattern) => pattern.test(visibleText))
        .map((pattern) => pattern.toString());

      assert(
        !/240x/.test(visibleText),
        "V4.7 default product UI must not visibly expose 240x."
      );
      assert(
        visiblePositiveHits.length === 0 && forbiddenUnitHits.length === 0,
        "V4.7 visible forbidden-claim scan failed: " +
          JSON.stringify({ visiblePositiveHits, forbiddenUnitHits, visibleText })
      );

      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));
      assert(
        resourceHits.length === 0,
        "V4.7 runtime fetched a raw source or live external resource: " +
          JSON.stringify(resourceHits)
      );

      const visibleSurfaceRects = Array.from(
        productRoot.querySelectorAll("[data-m8a-v47-ui-surface]")
      )
        .filter(isVisible)
        .map((element) => ({
          label: element.getAttribute("data-m8a-v47-ui-surface"),
          ...elementRect(element)
        }));
      const nativeControlRects = Array.from(
        document.querySelectorAll(
          [
            ".cesium-viewer-toolbar",
            ".cesium-viewer-animationContainer",
            ".cesium-viewer-timelineContainer",
            ".cesium-viewer-bottom"
          ].join(", ")
        )
      )
        .filter(isVisible)
        .map((element) => ({
          label:
            element.getAttribute("class")?.split(/\\s+/).find((name) =>
              name.startsWith("cesium-viewer")
            ) ?? "cesium-native-control",
          ...elementRect(element)
        }));
      const visibleBadgeTexts = Array.from(
        productRoot.querySelectorAll("[data-m8a-v47-truth-badge]")
      )
        .filter(isVisible)
        .map((element) => element.textContent.trim());
      const endpointPoints = [
        entityPoint("m8a-v4-endpoint-tw-cht-multi-orbit-ground-infrastructure"),
        entityPoint("m8a-v4-endpoint-sg-speedcast-singapore-teleport")
      ].filter(Boolean);
      const geoPoints = [
        entityPoint("st-2-geo-continuity-anchor"),
        entityPoint("ses-9-geo-display-context")
      ].filter(Boolean);
      const activeActorPoint = entityPoint(
        state.simulationHandoverModel.window.displayRepresentativeActorId
      );

      assert(endpointPoints.length === 2, "Missing endpoint canvas points.");
      assert(geoPoints.length >= 1, "Missing GEO guard canvas points.");
      assert(activeActorPoint, "Missing active representative canvas point.");

      const protectedRects = [
        unionRect(endpointPoints, config.expectedViewportClass === "narrow" ? 42 : 58, "endpoint-corridor"),
        ...geoPoints.map((point, index) =>
          pointToRect(point, config.expectedViewportClass === "narrow" ? 76 : 112, config.expectedViewportClass === "narrow" ? 64 : 96, \`geo-guard-\${index}\`)
        ),
        ...endpointPoints.map((point, index) =>
          pointToRect(point, config.expectedViewportClass === "narrow" ? 118 : 156, config.expectedViewportClass === "narrow" ? 46 : 58, \`endpoint-label-\${index}\`)
        ),
        pointToRect(activeActorPoint, config.expectedViewportClass === "narrow" ? 110 : 142, config.expectedViewportClass === "narrow" ? 44 : 56, "active-actor-label"),
        ...nativeControlRects
      ];
      const obstructionHits = [];

      for (const uiRect of visibleSurfaceRects) {
        for (const protectedRect of protectedRects) {
          if (intersects(uiRect, protectedRect)) {
            obstructionHits.push({ uiRect, protectedRect });
          }
        }
      }

      assert(
        obstructionHits.length === 0,
        "V4.7 UI intersects a protected scene zone: " +
          JSON.stringify({
            viewport: config.name,
            obstructionHits,
            visibleSurfaceRects,
            protectedRects,
            nativeControlRects
          })
      );

      if (config.expectedViewportClass === "desktop") {
        assert(
          visibleSurfaceRects.some((rect) => rect.label === "desktop-rail") &&
            !visibleSurfaceRects.some((rect) => rect.label === "narrow-strip"),
          "Desktop V4.7 layout must use the review rail as the normal surface."
        );
        assert(
          config.requiredBadges.every((badge) => visibleBadgeTexts.includes(badge)),
          "Desktop V4.7 badges must be visible: " +
            JSON.stringify(visibleBadgeTexts)
        );
      } else {
        assert(
          visibleSurfaceRects.some((rect) => rect.label === "narrow-strip") &&
            !visibleSurfaceRects.some((rect) => rect.label === "desktop-rail"),
          "Narrow V4.7 layout must use the minimal strip as the normal surface."
        );
      }

      return {
        viewport: {
          name: config.name,
          width: window.innerWidth,
          height: window.innerHeight,
          class: state.productUx.layout.viewportClass
        },
        playback: state.productUx.playback,
        activeWindowId: state.productUx.activeWindowId,
        activeProductLabel: state.productUx.activeProductLabel,
        visibleSurfaceRects,
        protectedRects,
        visibleBadgeTexts,
        normalSpeedValues,
        resourceHits
      };
    })(${JSON.stringify({
      name: viewport.name,
      expectedViewportClass: viewport.expectedViewportClass,
      expectedRoute: EXPECTED_ROUTE,
      expectedEndpointPairId: EXPECTED_ENDPOINT_PAIR_ID,
      expectedPrecision: EXPECTED_PRECISION,
      expectedModelId: EXPECTED_MODEL_ID,
      expectedActorCounts: EXPECTED_ACTOR_COUNTS,
      expectedProductMultipliers: EXPECTED_PRODUCT_MULTIPLIERS,
      expectedDebugMultiplier: EXPECTED_DEBUG_MULTIPLIER,
      expectedLabels: EXPECTED_LABELS,
      requiredBadges: REQUIRED_BADGES,
      forbiddenPositivePhrases: FORBIDDEN_POSITIVE_PHRASES,
      forbiddenUnitPatterns: FORBIDDEN_UNIT_PATTERNS.map((pattern) => ({
        source: pattern.source,
        flags: pattern.flags
      }))
    })})`
  );
}

async function verifyProductLabelMapping(client) {
  const samples = [
    { ratio: 0.1, windowId: "leo-acquisition-context" },
    { ratio: 0.3, windowId: "leo-aging-pressure" },
    { ratio: 0.5, windowId: "meo-continuity-hold" },
    { ratio: 0.7, windowId: "leo-reentry-candidate" },
    { ratio: 0.92, windowId: "geo-continuity-guard" }
  ];
  const results = [];

  for (const sample of samples) {
    await seekReplayRatio(client, sample.ratio);
    const result = await evaluateRuntimeValue(
      client,
      `(() => {
        const state =
          window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState();
        const root = document.querySelector("[data-m8a-v47-product-ux='true']");

        return {
          expectedWindowId: ${JSON.stringify(sample.windowId)},
          activeWindowId: state.productUx.activeWindowId,
          activeProductLabel: state.productUx.activeProductLabel,
          domActiveWindowId: root.dataset.activeWindowId,
          domActiveProductLabel: root.dataset.activeProductLabel
        };
      })()`
    );

    assert(
      result.activeWindowId === sample.windowId &&
        result.domActiveWindowId === sample.windowId &&
        result.activeProductLabel === EXPECTED_LABELS[sample.windowId] &&
        result.domActiveProductLabel === EXPECTED_LABELS[sample.windowId],
      "V4.7 product label did not map to the accepted V4.6D window: " +
        JSON.stringify(result)
    );
    results.push(result);
  }

  return results;
}

async function verifyPlaybackPolicy(client) {
  const initial = await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controller = capture.m8aV4GroundStationScene;
      const state = controller.getState();

      return {
        replayClock: capture.replayClock.getState(),
        productUx: state.productUx
      };
    })()`
  );

  assert(
    initial.replayClock.mode === "prerecorded" &&
      initial.replayClock.multiplier === 60 &&
      initial.productUx.playback.multiplier === 60 &&
      initial.productUx.playback.mode === "product-default" &&
      initial.productUx.playback.status === "playing",
    "V4.7 route entry must autoplay at 60x product default: " +
      JSON.stringify(initial)
  );

  const speedResults = [];

  for (const multiplier of [30, 120, 60]) {
    const result = await evaluateRuntimeValue(
      client,
      `((multiplier) => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const controller = capture.m8aV4GroundStationScene;

        controller.setPlaybackMultiplier(multiplier);

        return {
          replayClock: capture.replayClock.getState(),
          productUx: controller.getState().productUx
        };
      })(${JSON.stringify(multiplier)})`
    );

    assert(
      result.replayClock.multiplier === multiplier &&
        result.productUx.playback.multiplier === multiplier,
      "V4.7 product playback speed change failed: " +
        JSON.stringify(result)
    );
    speedResults.push(result.productUx.playback);
  }

  const debugResult = await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controller = capture.m8aV4GroundStationScene;

      controller.setDebugPlaybackMultiplier(240);

      return {
        replayClock: capture.replayClock.getState(),
        productUx: controller.getState().productUx,
        visibleText: document.body.innerText
      };
    })()`
  );

  assert(
    debugResult.replayClock.multiplier === 240 &&
      debugResult.productUx.playback.mode === "debug-test" &&
      !/240x/.test(debugResult.visibleText),
    "V4.7 240x must be debug/test-only and absent from normal visible controls: " +
      JSON.stringify(debugResult)
  );

  await evaluateRuntimeValue(
    client,
    `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.setPlaybackMultiplier(60)`
  );
  await seekReplayRatio(client, 0.34);
  const pausedA = await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controller = capture.m8aV4GroundStationScene;

      controller.pause();

      return controller.getState().productUx.playback;
    })()`
  );
  await sleep(650);
  const pausedB = await evaluateRuntimeValue(
    client,
    `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState().productUx.playback`
  );

  assert(
    pausedB.status === "paused" &&
      Math.abs(pausedA.replayRatio - pausedB.replayRatio) < 0.000001 &&
      pausedA.simulatedReplayTimeDisplay === pausedB.simulatedReplayTimeDisplay,
    "V4.7 pause must freeze ratio, state, and time display: " +
      JSON.stringify({ pausedA, pausedB })
  );

  const pausedRestart = await evaluateRuntimeValue(
    client,
    `(() => {
      const controller =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene;

      controller.restart();

      return controller.getState().productUx.playback;
    })()`
  );

  assert(
    pausedRestart.status === "paused" && pausedRestart.replayRatio === 0,
    "V4.7 restart while paused must return to ratio 0 and remain paused: " +
      JSON.stringify(pausedRestart)
  );

  const playingRestart = await evaluateRuntimeValue(
    client,
    `(() => {
      const controller =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene;

      controller.play();
      controller.restart();

      return controller.getState().productUx.playback;
    })()`
  );

  assert(
    playingRestart.status === "playing" && playingRestart.replayRatio < 0.01,
    "V4.7 restart while playing must restart and continue playing: " +
      JSON.stringify(playingRestart)
  );

  return { initial: initial.productUx.playback, speedResults, debugResult };
}

async function verifyFinalHold(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const controller = capture.m8aV4GroundStationScene;
      const replayClock = capture.replayClock;
      const replayState = replayClock.getState();
      const startMs = Date.parse(replayState.startTime);
      const stopMs = Date.parse(replayState.stopTime);

      controller.setDebugPlaybackMultiplier(240);
      replayClock.seek(new Date(startMs + (stopMs - startMs) * 0.9995).toISOString());
      controller.play();
    })()`
  );

  let holdState = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    holdState = await evaluateRuntimeValue(
      client,
      `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState().productUx`
    );

    if (holdState.playback.status === "final-hold") {
      break;
    }

    await sleep(100);
  }

  assert(
    holdState?.playback.status === "final-hold" &&
      holdState.playback.finalHoldActive === true &&
      holdState.playback.replayRatio === 1 &&
      holdState.activeWindowId === "geo-continuity-guard" &&
      holdState.activeProductLabel === "GEO guard",
    "V4.7 final hold must freeze ratio 1 at GEO guard: " +
      JSON.stringify(holdState)
  );

  const holdStartedAt = holdState.playback.finalHoldStartedAtEpochMs;
  await sleep(3200);
  const stillHolding = await evaluateRuntimeValue(
    client,
    `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState().productUx`
  );

  assert(
    stillHolding.playback.status === "final-hold" &&
      stillHolding.playback.replayRatio === 1 &&
      stillHolding.activeWindowId === "geo-continuity-guard",
    "V4.7 final hold ended before the accepted 3s lower bound: " +
      JSON.stringify(stillHolding)
  );

  let loopedState = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    loopedState = await evaluateRuntimeValue(
      client,
      `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState().productUx`
    );

    if (
      loopedState.playback.finalHoldActive === false &&
      loopedState.playback.finalHoldLoopCount > holdState.playback.finalHoldLoopCount
    ) {
      break;
    }

    await sleep(100);
  }

  const holdDuration =
    loopedState.playback.finalHoldCompletedAtEpochMs - holdStartedAt;

  assert(
    holdDuration >= 3000 &&
      holdDuration <= 5000 &&
      loopedState.playback.replayRatio < 0.05 &&
      loopedState.playback.status === "playing",
    "V4.7 final hold must last 3-5s, then loop from ratio 0 while playing: " +
      JSON.stringify({ holdDuration, loopedState })
  );

  await evaluateRuntimeValue(
    client,
    `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.setPlaybackMultiplier(60)`
  );

  return {
    holdStartedAt,
    holdDuration,
    loopedPlayback: loopedState.playback
  };
}

async function verifyDisclosure(client, viewport) {
  const result = await evaluateRuntimeValue(
    client,
    `((config) => {
      const assert = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };
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
      const controller =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene;
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const toggle = root.querySelector("[data-m8a-v47-action='toggle-disclosure']");

      toggle.click();

      const state = controller.getState();
      const sheet = root.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const sheetText = sheet?.innerText ?? "";
      const badgeTexts = Array.from(
        sheet.querySelectorAll("[data-m8a-v47-truth-badge]")
      )
        .filter(isVisible)
        .map((element) => element.textContent.trim());

      assert(isVisible(sheet), "V4.7 disclosure sheet must be inspectable.");
      assert(
        config.requiredBadges.every((badge) => badgeTexts.includes(badge)),
        "V4.7 disclosure sheet must include truth-boundary badges: " +
          JSON.stringify(badgeTexts)
      );
      assert(
        state.productUx.disclosure.state === "open" &&
          state.productUx.disclosure.lines.every((line) => sheetText.includes(line)),
        "V4.7 disclosure sheet must expose the accepted truth boundary lines: " +
          JSON.stringify({ state: state.productUx.disclosure, sheetText })
      );

      root
        .querySelector("[data-m8a-v47-action='close-disclosure']")
        .click();

      return {
        viewport: config.viewport,
        disclosure: state.productUx.disclosure,
        badgeTexts,
        sheetText
      };
    })(${JSON.stringify({
      requiredBadges: REQUIRED_BADGES,
      viewport: {
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        expectedViewportClass: viewport.expectedViewportClass
      }
    })})`
  );
  await sleep(120);
  return result;
}

async function main() {
  ensureDistBuildExists();

  const browserCommand = findHeadlessBrowser();
  let serverHandle = null;
  let browserHandle = null;
  let client = null;

  try {
    serverHandle = await startStaticServer();
    await verifyFetches(serverHandle.baseUrl);

    browserHandle = await startHeadlessBrowser(browserCommand);
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );
    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await setViewport(client, VIEWPORTS[0]);
    await navigateAndWait(client, serverHandle.baseUrl);

    const playbackPolicy = await verifyPlaybackPolicy(client);
    const labelMapping = await verifyProductLabelMapping(client);
    const finalHold = await verifyFinalHold(client);
    const disclosure = await verifyDisclosure(client, VIEWPORTS[0]);

    const viewportResults = [];
    let narrowDisclosure = null;

    for (const viewport of VIEWPORTS) {
      await setViewport(client, viewport);
      await navigateAndWait(client, serverHandle.baseUrl);

      const inspection = await inspectProductUx(client, viewport);
      const screenshotPath = await captureScreenshot(
        client,
        viewport.screenshotPath
      );

      viewportResults.push({
        ...inspection,
        screenshotPath: path.relative(repoRoot, screenshotPath)
      });

      if (viewport.expectedViewportClass === "narrow") {
        narrowDisclosure = await verifyDisclosure(client, viewport);
      }
    }

    assert(
      narrowDisclosure,
      "V4.7 smoke must verify narrow disclosure badges at 390x844."
    );

    console.log(
      `M8A-V4.7 handover product UX runtime smoke passed: ${JSON.stringify(
        {
          playbackPolicy,
          labelMapping,
          finalHold,
          disclosure: {
            viewport: disclosure.viewport,
            badgeTexts: disclosure.badgeTexts,
            lineCount: disclosure.disclosure.lines.length
          },
          narrowDisclosure: {
            viewport: narrowDisclosure.viewport,
            badgeTexts: narrowDisclosure.badgeTexts,
            lineCount: narrowDisclosure.disclosure.lines.length
          },
          viewportResults,
          runtimeProcessFacts: {
            serverPid: serverHandle.server.pid,
            browserPid: browserHandle.browserProcess.pid
          }
        }
      )}`
    );
  } finally {
    if (client) {
      await client.close();
    }

    if (browserHandle) {
      await stopHeadlessBrowser(browserHandle);
    }

    if (serverHandle) {
      await stopStaticServer(serverHandle.server);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
