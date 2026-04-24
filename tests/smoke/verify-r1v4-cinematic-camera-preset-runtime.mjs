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
const CAMERA_PRESET_KEY = "endpoint-relation-cinematic";
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const EXPECTED_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeCinematicCameraPreset";

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
        `R1V.4 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `R1V.4 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false
        });

        await navigateAndWait(client, `${baseUrl}${EXPECTED_REQUEST_PATH}`);

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
            const toCameraSnapshot = () => {
              const camera =
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.camera;

              return {
                x: camera.positionWC.x,
                y: camera.positionWC.y,
                z: camera.positionWC.z,
                headingDegrees: (camera.heading * 180) / Math.PI,
                pitchDegrees: (camera.pitch * 180) / Math.PI
              };
            };
            const distance = (left, right) => {
              return Math.sqrt(
                (left.x - right.x) ** 2 +
                  (left.y - right.y) ** 2 +
                  (left.z - right.z) ** 2
              );
            };
            const boundsContain = (bounds, coordinate) => {
              return (
                coordinate.lon >= bounds.west &&
                coordinate.lon <= bounds.east &&
                coordinate.lat >= bounds.south &&
                coordinate.lat <= bounds.north
              );
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
                capture?.firstIntakeMobileEndpointTrajectory &&
                capture?.firstIntakeNearbySecondEndpoint &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                presetState?.affordance?.mounted === true &&
                expressionState?.dataSourceAttached === true
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeCinematicCameraPreset,
              "Missing R1V.4 cinematic camera preset seam."
            );
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "R1V.4 must keep the R1V.2 replay authority seam alive."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "R1V.4 must keep the R1V.3 animated expression seam alive."
            );

            const cameraPreset = capture.firstIntakeCinematicCameraPreset;
            const trajectoryState =
              capture.firstIntakeMobileEndpointTrajectory.getState();
            const fixedEndpointState =
              capture.firstIntakeNearbySecondEndpoint.getState();
            const expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const initialPresetState = cameraPreset.getState();
            const rootData = document.documentElement.dataset;
            const toolbar = document.querySelector(".cesium-viewer-toolbar");
            const buttons = [
              ...document.querySelectorAll(
                "button[data-r1v-camera-preset='${CAMERA_PRESET_KEY}']"
              )
            ];
            const selectorLikeElements = document.querySelectorAll(
              [
                "[data-r1v-camera-preset-selector]",
                "[data-r1v-endpoint-selector]",
                "[data-r1v-endpoint-catalog]",
                "[data-r1v-global-endpoint-navigation]",
                "select[data-r1v-camera-preset]"
              ].join(",")
            );

            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Addressed first-intake route must remain the active owner lane."
            );
            assert(
              initialPresetState.presetState ===
                "active-addressed-route-camera-preset" &&
                initialPresetState.presetKey === "${CAMERA_PRESET_KEY}" &&
                initialPresetState.proofSeam === "${EXPECTED_PROOF_SEAM}" &&
                initialPresetState.selectionModel === "single-bounded-preset" &&
                initialPresetState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "Addressed route must publish the expected bounded R1V.4 camera preset state."
            );
            assert(
              initialPresetState.affordance.mounted === true &&
                initialPresetState.affordance.placement ===
                  "cesium-top-right-toolbar" &&
                initialPresetState.affordance.controlKind === "single-button" &&
                initialPresetState.affordance.exposesSelector === false &&
                initialPresetState.affordance.exposesCatalog === false &&
                initialPresetState.affordance.exposesGlobalEndpointNavigation ===
                  false,
              "R1V.4 affordance must be one top-right button without selector or catalog behavior."
            );
            assert(
              buttons.length === 1,
              "Exactly one endpoint-relation-cinematic affordance must exist."
            );
            assert(
              toolbar instanceof HTMLElement &&
                toolbar.contains(buttons[0]) &&
                buttons[0].getBoundingClientRect().top < 48,
              "The cinematic affordance must live in the native top-right toolbar."
            );
            assert(
              selectorLikeElements.length === 0,
              "R1V.4 must not expose selector, catalog, or global endpoint navigation elements."
            );

            const bounds = initialPresetState.fit.boundsDegrees;
            const trajectoryCoordinates =
              trajectoryState.trajectory.trajectory.points.map((point) => ({
                lat: point.lat,
                lon: point.lon
              }));
            const fixedEndpointCoordinate = {
              lat: fixedEndpointState.endpoint.coordinates.lat,
              lon: fixedEndpointState.endpoint.coordinates.lon
            };

            assert(
              initialPresetState.fit.strategy ===
                "stable-bounding-accepted-scene-extent" &&
                initialPresetState.includedSceneObjects.mobileEndpointId ===
                  trajectoryState.trajectory.endpointId &&
                initialPresetState.includedSceneObjects.fixedEndpointId ===
                  "endpoint-yka-operations-office" &&
                initialPresetState.includedSceneObjects.fixedEndpointId ===
                  fixedEndpointState.endpoint.endpointId &&
                initialPresetState.includedSceneObjects.relationCueKind ===
                  expressionState.animation.relationCueMode &&
                initialPresetState.includedSceneObjects.trajectoryWaypointCount ===
                  trajectoryCoordinates.length,
              "R1V.4 preset state must name only the accepted first-intake scene objects."
            );
            assert(
              trajectoryCoordinates.every((coordinate) =>
                boundsContain(bounds, coordinate)
              ) && boundsContain(bounds, fixedEndpointCoordinate),
              "R1V.4 stable bounds must contain the full accepted trajectory and fixed YKA endpoint."
            );
            assert(
              rootData.firstIntakeCameraPresetState ===
                "active-addressed-route-camera-preset" &&
                rootData.firstIntakeCameraPresetKey ===
                  "${CAMERA_PRESET_KEY}" &&
                rootData.firstIntakeCameraPresetAffordanceMounted === "true" &&
                rootData.firstIntakeCameraPresetSelectionModel ===
                  "single-bounded-preset" &&
                rootData.firstIntakeCameraPresetActivationState ===
                  "available" &&
                rootData.firstIntakeCameraPresetMobileEndpointId ===
                  trajectoryState.trajectory.endpointId &&
                rootData.firstIntakeCameraPresetFixedEndpointId ===
                  "endpoint-yka-operations-office" &&
                rootData.firstIntakeCameraPresetRelationCueKind ===
                  "moving-mobile-to-fixed-nearby-endpoint" &&
                rootData.firstIntakeCameraPresetProofSeam ===
                  "${EXPECTED_PROOF_SEAM}",
              "Document telemetry must publish the bounded R1V.4 camera preset state."
            );

            const beforeCamera = toCameraSnapshot();
            buttons[0].click();
            await sleep(120);

            const activePresetState = cameraPreset.getState();
            const afterCamera = toCameraSnapshot();
            const cameraDeltaMeters = distance(beforeCamera, afterCamera);
            const expectedPitchDelta = Math.abs(
              afterCamera.pitchDegrees - activePresetState.fit.pitchDegrees
            );

            assert(
              activePresetState.activation.active === true &&
                activePresetState.activation.activationCount ===
                  initialPresetState.activation.activationCount + 1 &&
                document.documentElement.dataset
                  .firstIntakeCameraPresetActivationState === "active" &&
                buttons[0].dataset.r1vCameraPresetState === "active",
              "Activating the affordance must publish active camera preset state."
            );
            assert(
              cameraDeltaMeters > 1000 &&
                expectedPitchDelta < 4 &&
                activePresetState.fit.rangeMeters >= 18000,
              "Activating the affordance must move the camera to the accepted cinematic preset: " +
                JSON.stringify({
                cameraDeltaMeters,
                beforeCamera,
                afterCamera,
                expectedPitchDelta,
                fit: activePresetState.fit
              })
            );

            return {
              presetKey: activePresetState.presetKey,
              activationCount: activePresetState.activation.activationCount,
              cameraDeltaMeters,
              fixedEndpointId:
                activePresetState.includedSceneObjects.fixedEndpointId,
              trajectoryWaypointCount:
                activePresetState.includedSceneObjects.trajectoryWaypointCount
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${DEFAULT_REQUEST_PATH}`);

        const defaultRouteResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const rootData = document.documentElement.dataset;
            const cinematicButtons = document.querySelectorAll(
              "button[data-r1v-camera-preset='${CAMERA_PRESET_KEY}']"
            );

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeCinematicCameraPreset === undefined,
              "Default route must not publish the R1V.4 camera preset seam."
            );
            assert(
              cinematicButtons.length === 0,
              "Default route must not mount the R1V.4 cinematic affordance."
            );
            assert(
              rootData.firstIntakeCameraPresetState === undefined &&
                rootData.firstIntakeCameraPresetKey === undefined &&
                rootData.firstIntakeCameraPresetProofSeam === undefined,
              "Default route must not publish R1V camera-preset telemetry."
            );

            return {
              addressResolution:
                capture.firstIntakeScenarioSurface?.getState?.().addressResolution ??
                null,
              cameraPresetPublished:
                rootData.firstIntakeCameraPresetState ?? null,
              cinematicButtonCount: cinematicButtons.length
            };
          })()`
        );

        console.log(
          JSON.stringify(
            {
              addressedResult,
              defaultRouteResult
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
