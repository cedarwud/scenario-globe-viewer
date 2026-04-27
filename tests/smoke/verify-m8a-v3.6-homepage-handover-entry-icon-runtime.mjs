import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

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

const TARGET_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const DEFAULT_REQUEST_PATH = "/";
const SCREENSHOT_PATH =
  "output/m8a-v3.6-homepage-handover-entry-addressed.png";
const EXPECTED_ACTOR_LABELS = [
  "OneWeb LEO context",
  "Intelsat GEO continuity anchor"
];
const VIEWPORT = {
  width: 1440,
  height: 900,
  bottomNativeUiClearance: 120
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
          scenePreset: root?.dataset.scenePreset ?? null
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M8A-V3.6 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V3.6 validation did not reach a ready viewer: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
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

async function waitForAddressedSceneReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 180; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const toPlainPoint = (point) =>
          point ? { x: point.x, y: point.y } : null;
        const pointInsideViewport = (point) => {
          return (
            point &&
            point.x >= 0 &&
            point.x <= window.innerWidth &&
            point.y >= 0 &&
            point.y <=
              window.innerHeight - ${VIEWPORT.bottomNativeUiClearance}
          );
        };
        const resolveEntityCanvasPoint = (dataSource, entityId, viewer) => {
          const entity = dataSource?.entities?.getById(entityId);
          const position = entity?.position?.getValue(viewer.clock.currentTime);

          return toPlainPoint(
            position ? viewer.scene.cartesianToCanvasCoordinates(position) : null
          );
        };

        const params = new URLSearchParams(window.location.search);
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const viewer = capture?.viewer ?? null;
        const surfaceState =
          capture?.firstIntakeScenarioSurface?.getState?.() ?? null;
        const scenarioId =
          capture?.scenarioSession?.getCurrentScenario?.()?.scenarioId ?? null;
        const replayState = capture?.replayClock?.getState?.() ?? null;
        const cameraState =
          capture?.firstIntakeCinematicCameraPreset?.getState?.() ?? null;
        const actorState =
          capture?.firstIntakeOrbitContextActors?.getState?.() ?? null;
        const expressionState =
          capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
          null;
        const nearbyDataSource =
          viewer && expressionState
            ? viewer.dataSources.getByName(expressionState.dataSourceName)[0]
            : null;
        const mobileEndpoint = viewer
          ? resolveEntityCanvasPoint(
              nearbyDataSource,
              "first-intake-current-mobile-endpoint-cue",
              viewer
            )
          : null;
        const fixedEndpoint = viewer
          ? resolveEntityCanvasPoint(
              nearbyDataSource,
              "first-intake-fixed-nearby-second-endpoint",
              viewer
            )
          : null;
        const stageStrip = document.querySelector(
          "[data-m8a-v35-orbit-context-stage-strip='true']"
        );
        const stageRect =
          stageStrip instanceof HTMLElement
            ? stageStrip.getBoundingClientRect()
            : null;
        const activeStage = document.querySelector(
          "[data-m8a-v35-orbit-context-stage-strip='true'] [data-active='true']"
        );
        const actorLabels = actorState?.actors?.map((actor) => actor.label) ?? [];

        return {
          search: window.location.search,
          queryScenarioId: params.get("firstIntakeScenarioId"),
          queryAutoplay: params.get("firstIntakeAutoplay"),
          queryScenePreset: params.get("scenePreset"),
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          surfaceResolution: surfaceState?.addressResolution ?? null,
          scenarioId,
          replayPlaying: replayState?.isPlaying ?? null,
          cameraPresetKey: cameraState?.presetKey ?? null,
          cameraActive: cameraState?.activation?.active ?? false,
          actorLabels,
          actorCount: actorState?.actorCount ?? 0,
          stageStripVisible:
            stageStrip instanceof HTMLElement &&
            stageRect.width > 0 &&
            stageRect.height > 0,
          activeStageKey:
            activeStage instanceof HTMLElement
              ? activeStage.dataset.stageKey ?? null
              : null,
          mobileEndpoint,
          fixedEndpoint,
          mobileEndpointVisible: pointInsideViewport(mobileEndpoint),
          fixedEndpointVisible: pointInsideViewport(fixedEndpoint)
        };
      })()`
    );

    if (
      lastState.queryScenarioId === TARGET_SCENARIO_ID &&
      lastState.queryAutoplay === "1" &&
      lastState.queryScenePreset === "global" &&
      lastState.bootstrapState === "ready" &&
      lastState.surfaceResolution === "matched" &&
      lastState.scenarioId === TARGET_SCENARIO_ID &&
      lastState.replayPlaying === true &&
      lastState.cameraActive === true &&
      lastState.actorCount === 2 &&
      EXPECTED_ACTOR_LABELS.every((label) =>
        lastState.actorLabels.includes(label)
      ) &&
      lastState.stageStripVisible === true &&
      lastState.mobileEndpointVisible === true &&
      lastState.fixedEndpointVisible === true
    ) {
      return lastState;
    }

    await sleep(50);
  }

  throw new Error(
    `Timed out waiting for addressed handover scene after homepage icon click: ${JSON.stringify(
      lastState
    )}`
  );
}

async function captureScreenshot(client, filePath) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, Buffer.from(result.data, "base64"));
}

async function main() {
  ensureDistBuildExists();
  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  try {
    await verifyFetches(baseUrl);
    const browser = await startHeadlessBrowser(browserCommand);

    try {
      const pageWebSocketUrl = await resolvePageWebSocketUrl(
        browser.browserWebSocketUrl
      );
      const client = await connectCdp(pageWebSocketUrl);

      try {
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          deviceScaleFactor: 1,
          mobile: false
        });

        await navigateAndWait(client, `${baseUrl}${DEFAULT_REQUEST_PATH}`);

        const homepageResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const rectToPlain = (element) => {
              if (!(element instanceof HTMLElement)) {
                return null;
              }

              const rect = element.getBoundingClientRect();

              return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
              };
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const root = document.querySelector(
              "[data-m8a-v36-homepage-handover-entry='true']"
            );
            const icon = document.querySelector(
              "[data-m8a-v36-homepage-handover-icon='true']"
            );
            const stageStrip = document.querySelector(
              "[data-m8a-v35-orbit-context-stage-strip='true']"
            );
            const href =
              icon instanceof HTMLAnchorElement ? icon.getAttribute("href") : null;
            const url = href ? new URL(href, window.location.origin) : null;
            const iconRect = rectToPlain(icon);
            const accessibleLabel =
              icon instanceof HTMLAnchorElement
                ? icon.getAttribute("aria-label") ?? ""
                : "";

            assert(capture, "Missing runtime capture seam on bare /.");
            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "default" &&
                !capture.firstIntakeOrbitContextActors &&
                !capture.firstIntakeReplayTimeAuthority &&
                !stageStrip,
              "Bare / must remain outside silent first-intake demo state."
            );
            assert(
              root instanceof HTMLElement &&
                root.dataset.homepageEntryMount === "cesium-toolbar",
              "Homepage handover entry must mount as a top-right toolbar icon host."
            );
            assert(
              icon instanceof HTMLAnchorElement &&
                iconRect &&
                iconRect.width >= 36 &&
                iconRect.width <= 44 &&
                iconRect.height >= 36 &&
                iconRect.height <= 44 &&
                iconRect.top <= 12 &&
                iconRect.right >= window.innerWidth - 16,
              "Homepage handover entry must be a compact top-right icon button: " +
                JSON.stringify(iconRect)
            );
            assert(
              url &&
                url.pathname === "/" &&
                url.searchParams.get("firstIntakeScenarioId") ===
                  "${TARGET_SCENARIO_ID}" &&
                url.searchParams.get("firstIntakeAutoplay") === "1" &&
                url.searchParams.get("scenePreset") === "global",
              "Homepage handover icon href must directly address the autoplay first-case scene: " +
                JSON.stringify(href)
            );
            assert(
              /oneweb/i.test(accessibleLabel) &&
                /intelsat/i.test(accessibleLabel) &&
                /handover/i.test(accessibleLabel) &&
                /autoplay/i.test(accessibleLabel),
              "Homepage icon accessible label must name the addressed handover autoplay target: " +
                JSON.stringify(accessibleLabel)
            );

            return {
              href,
              iconRect,
              accessibleLabel,
              addressResolution:
                capture.firstIntakeScenarioSurface.getState().addressResolution,
              hasOrbitActors: Boolean(capture.firstIntakeOrbitContextActors),
              hasReplayAuthority: Boolean(capture.firstIntakeReplayTimeAuthority),
              clickPoint: {
                x: iconRect.left + iconRect.width / 2,
                y: iconRect.top + iconRect.height / 2
              }
            };
          })()`
        );

        await dispatchMouseClick(client, homepageResult.clickPoint);

        const addressedReadyState = await waitForAddressedSceneReady(client);
        const addressedResult = await evaluateRuntimeValue(
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
            const parseMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);
              assert(Number.isFinite(parsed), "Replay timestamp must parse.");
              return parsed;
            };
            const distance3 = (left, right) => {
              return Math.hypot(
                left.x - right.x,
                left.y - right.y,
                left.z - right.z
              );
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const beforeReplayMs = parseMs(capture.replayClock.getState().currentTime);
            const beforeActorState = capture.firstIntakeOrbitContextActors.getState();
            const beforeLeo = beforeActorState.actors.find(
              (actor) => actor.orbitClass === "leo"
            ).currentPositionEcefMeters;

            await sleep(650);

            const afterReplayMs = parseMs(capture.replayClock.getState().currentTime);
            const afterActorState = capture.firstIntakeOrbitContextActors.getState();
            const afterLeo = afterActorState.actors.find(
              (actor) => actor.orbitClass === "leo"
            ).currentPositionEcefMeters;
            const replayAdvanceMs = afterReplayMs - beforeReplayMs;
            const leoMotionMeters = distance3(beforeLeo, afterLeo);
            const handoverState = capture.firstIntakeHandoverDecision.getState();
            const visibleText = document.body.innerText;
            const forbiddenHits = [
              "SERVING",
              "PENDING",
              "handover target",
              "active gateway",
              "RF beam",
              "Starlink"
            ].filter((word) => visibleText.includes(word));

            assert(
              replayAdvanceMs >= 250 && leoMotionMeters > 100000,
              "Clicked homepage entry must land in autoplay replay animation with moving LEO context: " +
                JSON.stringify({ replayAdvanceMs, leoMotionMeters })
            );
            assert(
              handoverState.snapshot.candidates.length === 0 &&
                handoverState.snapshot.isNativeRfHandover === false &&
                !handoverState.result.servingCandidateId,
              "V3.6 entry must not widen handover-decision truth: " +
                JSON.stringify(handoverState)
            );
            assert(
              forbiddenHits.length === 0,
              "V3.6 entry must not surface forbidden active-serving or fake-data wording: " +
                JSON.stringify(forbiddenHits)
            );

            return {
              scenarioId:
                capture.scenarioSession.getCurrentScenario()?.scenarioId ?? null,
              replayAdvanceMs,
              leoMotionMeters,
              actorLabels: afterActorState.actors.map((actor) => actor.label),
              presentationState: afterActorState.presentationState.stateKey,
              handoverDecisionCandidates: handoverState.snapshot.candidates.length,
              servingCandidateId: handoverState.result.servingCandidateId ?? null,
              forbiddenHits
            };
          })()`,
          { awaitPromise: true }
        );

        await captureScreenshot(client, path.resolve(SCREENSHOT_PATH));

        console.log(
          JSON.stringify(
            {
              homepageResult,
              addressedReadyState,
              addressedResult,
              screenshot: SCREENSHOT_PATH
            },
            null,
            2
          )
        );
      } finally {
        await client.close();
      }
    } finally {
      await stopHeadlessBrowser(browser);
    }
  } finally {
    await stopStaticServer(server);
  }
}

await main();
