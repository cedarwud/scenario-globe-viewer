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

// M8A-V3.4 close-view convergence lock. The explicit addressed autoplay entry
// must land in the existing handover close-view camera preset without requiring
// the user to discover and click the R1V.4 affordance.
const TARGET_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const CAMERA_PRESET_KEY = "endpoint-relation-cinematic";
const AUTOPLAY_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}&firstIntakeAutoplay=1`;
const PAUSED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const CLOSE_VIEW_MAX_CAMERA_HEIGHT_METERS = 1_200_000;
const CLOSE_VIEW_MIN_ENDPOINT_SCREEN_SPAN_PX = 110;
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
        `M8A-V3.4 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V3.4 validation did not reach a ready viewer: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
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

        await navigateAndWait(client, `${baseUrl}${AUTOPLAY_REQUEST_PATH}`);

        const autoplayResult = await evaluateRuntimeValue(
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
            const resolveEntityCanvasPoint = (dataSource, entityId) => {
              const entity = dataSource.entities.getById(entityId);
              const position = entity?.position?.getValue(
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.clock.currentTime
              );

              if (!position) {
                return null;
              }

              return toPlainPoint(
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.scene.cartesianToCanvasCoordinates(
                  position
                )
              );
            };
            const distance = (left, right) => {
              return Math.hypot(left.x - right.x, left.y - right.y);
            };

            for (let attempt = 0; attempt < 100; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const presetState =
                capture?.firstIntakeCinematicCameraPreset?.getState?.() ??
                null;
              const expressionState =
                capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
                null;

              if (
                capture?.firstIntakeCinematicCameraPreset &&
                capture?.firstIntakeReplayTimeAuthority &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                presetState?.activation?.active === true &&
                expressionState?.dataSourceAttached === true
              ) {
                break;
              }

              await sleep(50);
            }

            await sleep(120);

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam on autoplay route.");
            assert(
              capture.firstIntakeCinematicCameraPreset,
              "Missing M8A-V3.4 camera preset seam on autoplay route."
            );
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "M8A-V3.4 must keep the replay authority seam alive."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "M8A-V3.4 must keep the endpoint relation expression seam alive."
            );

            const cameraPresetState =
              capture.firstIntakeCinematicCameraPreset.getState();
            const replayAuthorityState =
              capture.firstIntakeReplayTimeAuthority.getState();
            const expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const viewer = capture.viewer;
            const cameraHeightMeters = viewer.camera.positionCartographic.height;
            const pitchDegrees = (viewer.camera.pitch * 180) / Math.PI;
            const dataSource = viewer.dataSources.getByName(
              expressionState.dataSourceName
            )[0];

            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Autoplay route must remain the addressed first-intake owner lane."
            );
            assert(
              replayAuthorityState.isPlaying === true,
              "M8A-V3.4 autoplay route must still start replay motion."
            );
            assert(
              cameraPresetState.presetKey === "${CAMERA_PRESET_KEY}" &&
                cameraPresetState.activation.active === true &&
                cameraPresetState.activation.activationCount === 1 &&
                document.documentElement.dataset
                  .firstIntakeCameraPresetActivationState === "active",
              "M8A-V3.4 autoplay route must automatically activate the existing close-view camera preset."
            );
            assert(
              cameraHeightMeters > 0 &&
                cameraHeightMeters < ${CLOSE_VIEW_MAX_CAMERA_HEIGHT_METERS} &&
                Math.abs(pitchDegrees - cameraPresetState.fit.pitchDegrees) < 4,
              "M8A-V3.4 close-view camera must leave global overview height and match the bounded preset pitch: " +
                JSON.stringify({
                  cameraHeightMeters,
                  pitchDegrees,
                  fit: cameraPresetState.fit
                })
            );
            assert(
              dataSource,
              "M8A-V3.4 close-view check requires the existing relation data source."
            );

            const mobileCue = resolveEntityCanvasPoint(
              dataSource,
              "first-intake-current-mobile-endpoint-cue"
            );
            const fixedEndpoint = resolveEntityCanvasPoint(
              dataSource,
              "first-intake-fixed-nearby-second-endpoint"
            );
            const relationCue = resolveEntityCanvasPoint(
              dataSource,
              "first-intake-nearby-endpoint-relation-cue"
            );
            const endpointSpanPx =
              mobileCue && fixedEndpoint ? distance(mobileCue, fixedEndpoint) : 0;

            assert(
              [mobileCue, fixedEndpoint, relationCue].every(pointInsideViewport) &&
                endpointSpanPx >= ${CLOSE_VIEW_MIN_ENDPOINT_SCREEN_SPAN_PX},
              "M8A-V3.4 close-view must keep the mobile cue, YKA endpoint, and relation cue visible without leaving them as global-view specks: " +
                JSON.stringify({
                  mobileCue,
                  fixedEndpoint,
                  relationCue,
                  endpointSpanPx,
                  viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                  }
                })
            );

            return {
              activation: cameraPresetState.activation,
              cameraHeightMeters,
              pitchDegrees,
              endpointSpanPx,
              mobileCue,
              fixedEndpoint,
              relationCue
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${PAUSED_REQUEST_PATH}`);

        const pausedResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const cameraPresetState =
              capture?.firstIntakeCinematicCameraPreset?.getState?.() ?? null;
            const replayAuthorityState =
              capture?.firstIntakeReplayTimeAuthority?.getState?.() ?? null;

            assert(capture, "Missing runtime capture seam on paused route.");
            assert(
              cameraPresetState?.activation?.active === false &&
                cameraPresetState?.activation?.activationCount === 0 &&
                document.documentElement.dataset
                  .firstIntakeCameraPresetActivationState === "available",
              "M8A-V3.4 must keep no-flag addressed route from auto-activating the close-view preset."
            );
            assert(
              replayAuthorityState?.isPlaying === false,
              "M8A-V3.4 must keep the R1V.2 paused-default behavior on the no-flag route."
            );

            return {
              activation: cameraPresetState.activation,
              isPlaying: replayAuthorityState.isPlaying
            };
          })()`
        );

        console.log(
          JSON.stringify(
            {
              autoplayResult,
              pausedResult
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
