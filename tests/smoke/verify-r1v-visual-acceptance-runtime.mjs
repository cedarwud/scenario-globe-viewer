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
const R1V1_SUPPRESSION_REASON =
  "r1v1-default-floating-panel-suppression";
const R1V_VISUAL_ACCEPTANCE_HUD_CLEANUP_REASON =
  "r1v-visual-acceptance-addressed-route-scene-clearance";
const SUPPRESSED_PANEL_SELECTORS = {
  overlayExpression: "[data-first-intake-overlay-expression='true']",
  activeCaseNarrative: "[data-first-intake-active-case-narrative='true']",
  nearbySecondEndpointInfo:
    "[data-first-intake-nearby-second-endpoint-info='true']"
};
const OBSTRUCTIVE_HUD_SELECTORS = {
  status: ".hud-panel--status",
  time: ".timeline-hud-placeholder",
  communication: ".communication-time-panel",
  physical: ".physical-input-panel"
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
        `R1V visual acceptance validation hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `R1V visual acceptance validation did not reach a ready viewer: ${JSON.stringify(
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
            const rectToPlain = (rect) => ({
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            });
            const readSurface = (selector) => {
              const element = document.querySelector(selector);
              const rect = rectToPlain(
                element?.getBoundingClientRect?.() ?? {
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 0,
                  height: 0
                }
              );
              const computed =
                element instanceof HTMLElement ? getComputedStyle(element) : null;

              return {
                mounted: element instanceof HTMLElement,
                hidden: element?.hidden ?? false,
                ariaHidden: element?.getAttribute?.("aria-hidden") ?? null,
                display: computed?.display ?? null,
                visibility: computed?.visibility ?? null,
                opacity: computed?.opacity ?? null,
                rect,
                cleanupSurface:
                  element?.dataset?.r1vVisualAcceptanceSurface ?? null,
                cleanupPresentation:
                  element?.dataset?.r1vVisualAcceptancePresentation ?? null,
                cleanupReason:
                  element?.dataset?.r1vVisualAcceptanceReason ?? null,
                presentationSuppression:
                  element?.dataset?.presentationSuppression ?? null,
                panelVisible: element?.dataset?.panelVisible ?? null
              };
            };
            const cameraSnapshot = () => {
              const camera =
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.camera;

              return {
                x: camera.positionWC.x,
                y: camera.positionWC.y,
                z: camera.positionWC.z,
                pitchDegrees: (camera.pitch * 180) / Math.PI
              };
            };
            const cameraDistance = (left, right) =>
              Math.sqrt(
                (left.x - right.x) ** 2 +
                  (left.y - right.y) ** 2 +
                  (left.z - right.z) ** 2
              );
            const suppressedPanelSelectors = ${JSON.stringify(
              SUPPRESSED_PANEL_SELECTORS
            )};
            const obstructiveHudSelectors = ${JSON.stringify(
              OBSTRUCTIVE_HUD_SELECTORS
            )};

            for (let attempt = 0; attempt < 120; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const expressionState =
                capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
                null;
              const overlayState =
                capture?.firstIntakeSatcomContextOverlay?.getState?.() ?? null;
              const hudFrame = document.querySelector("[data-hud-frame='true']");
              const cameraButton = document.querySelector(
                "button[data-r1v-camera-preset='${CAMERA_PRESET_KEY}']"
              );

              if (
                capture?.firstIntakeReplayTimeAuthority &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                capture?.firstIntakeCinematicCameraPreset &&
                capture?.firstIntakeSatcomContextOverlay &&
                expressionState?.dataSourceAttached === true &&
                overlayState?.overlayState ===
                  "active-addressed-route-satcom-context" &&
                hudFrame?.dataset?.r1vVisualAcceptanceHudCleanup ===
                  "addressed-route" &&
                cameraButton instanceof HTMLButtonElement
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const rootData = document.documentElement.dataset;
            const hudFrame = document.querySelector("[data-hud-frame='true']");
            const toolbar = document.querySelector(".cesium-viewer-toolbar");
            const animationWidget = readSurface(".cesium-viewer-animationContainer");
            const nativeTimeline = readSurface(".cesium-viewer-timelineContainer");
            const cameraButtons = [
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
            const oldPanelStates = Object.fromEntries(
              Object.entries(suppressedPanelSelectors).map(([key, selector]) => [
                key,
                readSurface(selector)
              ])
            );
            const hudStates = Object.fromEntries(
              Object.entries(obstructiveHudSelectors).map(([key, selector]) => [
                key,
                readSurface(selector)
              ])
            );

            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Addressed first-intake route must remain the active owner lane."
            );
            assert(
              capture.firstIntakeReplayTimeAuthority &&
                capture.firstIntakeNearbySecondEndpointExpression &&
                capture.firstIntakeCinematicCameraPreset &&
                capture.firstIntakeSatcomContextOverlay,
              "R1V.2/R1V.3/R1V.4/R1V.5 capture seams must remain alive."
            );

            const timeAuthorityState =
              capture.firstIntakeReplayTimeAuthority.getState();
            const expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const cameraPresetState =
              capture.firstIntakeCinematicCameraPreset.getState();
            const satcomOverlayState =
              capture.firstIntakeSatcomContextOverlay.getState();

            assert(
              timeAuthorityState.timeAuthorityState ===
                "active-addressed-route-replay-authority" &&
                expressionState.animation.animationState ===
                  "replay-clock-driven-interpolation" &&
                cameraPresetState.presetKey === "${CAMERA_PRESET_KEY}" &&
                satcomOverlayState.overlayState ===
                  "active-addressed-route-satcom-context" &&
                rootData.firstIntakeReplayTimeAuthorityState ===
                  "active-addressed-route-replay-authority" &&
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationState ===
                  "replay-clock-driven-interpolation" &&
                rootData.firstIntakeCameraPresetKey ===
                  "${CAMERA_PRESET_KEY}" &&
                rootData.firstIntakeSatcomContextOverlayState ===
                  "active-addressed-route-satcom-context",
              "R1V capture and document telemetry seams must remain live after HUD cleanup."
            );
            assert(
              Object.values(oldPanelStates).every(
                (panel) =>
                  panel.mounted &&
                  panel.hidden === true &&
                  panel.rect.width === 0 &&
                  panel.rect.height === 0 &&
                  panel.presentationSuppression ===
                    "${R1V1_SUPPRESSION_REASON}" &&
                  panel.panelVisible === "false"
              ),
              "R1V.1-suppressed first-intake panels must remain hidden and DOM-owned."
            );
            assert(
              hudFrame?.dataset?.r1vVisualAcceptanceHudCleanup ===
                "addressed-route" &&
                hudFrame?.dataset?.r1vVisualAcceptanceReason ===
                  "${R1V_VISUAL_ACCEPTANCE_HUD_CLEANUP_REASON}",
              "Addressed route must mark R1V visual-acceptance HUD cleanup."
            );
            assert(
              Object.values(hudStates).every(
                (panel) =>
                  panel.mounted &&
                  panel.hidden === true &&
                  panel.ariaHidden === "true" &&
                  panel.rect.width === 0 &&
                  panel.rect.height === 0 &&
                  panel.cleanupPresentation === "collapsed" &&
                  panel.cleanupReason ===
                    "${R1V_VISUAL_ACCEPTANCE_HUD_CLEANUP_REASON}"
              ),
              "Obstructive bootstrap/status/time/physical HUD panels must be hidden or collapsed on the addressed route."
            );
            assert(
              animationWidget.mounted &&
                animationWidget.hidden === false &&
                animationWidget.rect.width > 0 &&
                animationWidget.rect.height > 0 &&
                animationWidget.display !== "none" &&
                animationWidget.visibility !== "hidden" &&
                nativeTimeline.mounted &&
                nativeTimeline.hidden === false &&
                nativeTimeline.rect.width > 0 &&
                nativeTimeline.rect.height > 0 &&
                nativeTimeline.display !== "none" &&
                nativeTimeline.visibility !== "hidden",
              "Cesium native animation widget and bottom timeline must remain visible."
            );
            assert(
              cameraButtons.length === 1,
              "Exactly one endpoint-relation-cinematic button must be mounted."
            );
            const cameraButton = cameraButtons[0];
            const cameraButtonRect = rectToPlain(
              cameraButton.getBoundingClientRect()
            );
            const cameraButtonStyle = getComputedStyle(cameraButton);
            const toolbarRect = rectToPlain(
              toolbar?.getBoundingClientRect?.() ?? {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0
              }
            );

            assert(
              toolbar instanceof HTMLElement &&
                toolbar.contains(cameraButton) &&
                toolbarRect.right > window.innerWidth - 16 &&
                cameraButtonRect.top < 72 &&
                cameraButtonRect.right > window.innerWidth - 360,
              "The cinematic button must stay in the upper-right viewing controls."
            );
            assert(
              cameraButtonRect.width >= 38 &&
                cameraButtonRect.height >= 38 &&
                cameraButtonStyle.display !== "none" &&
                cameraButtonStyle.visibility !== "hidden" &&
                cameraButtonStyle.opacity !== "0" &&
                cameraButton.dataset.r1vCameraPresetDiscoverable ===
                  "primary-view-control" &&
                cameraButton.getAttribute("aria-label") ===
                  "Frame endpoint relation cinematic view" &&
                cameraButton.title === "Frame endpoint relation cinematic view",
              "The cinematic affordance must be visible, discoverable, and explicitly labeled."
            );
            assert(
              selectorLikeElements.length === 0,
              "The cinematic affordance must not introduce selector, catalog, or global navigation UI."
            );

            const beforeCamera = cameraSnapshot();
            cameraButton.click();
            await sleep(120);

            const activeCameraState =
              capture.firstIntakeCinematicCameraPreset.getState();
            const afterCamera = cameraSnapshot();
            const cameraDeltaMeters = cameraDistance(beforeCamera, afterCamera);

            assert(
              activeCameraState.activation.active === true &&
                activeCameraState.activation.activationCount ===
                  cameraPresetState.activation.activationCount + 1 &&
                cameraButton.dataset.r1vCameraPresetState === "active" &&
                cameraDeltaMeters > 1000,
              "Activating the cinematic button must move the camera to the preset."
            );

            return {
              hudCleanupReason:
                hudFrame.dataset.r1vVisualAcceptanceReason ?? null,
              hudStates,
              animationWidget: animationWidget.rect,
              nativeTimeline: nativeTimeline.rect,
              cameraButtonRect,
              cameraDeltaMeters,
              seamStates: {
                time: timeAuthorityState.timeAuthorityState,
                animation: expressionState.animation.animationState,
                camera: activeCameraState.presetKey,
                overlay: satcomOverlayState.overlayState
              }
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
            const rectToPlain = (rect) => ({
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            });
            const readSurface = (selector) => {
              const element = document.querySelector(selector);
              const rect = rectToPlain(
                element?.getBoundingClientRect?.() ?? {
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 0,
                  height: 0
                }
              );

              return {
                mounted: element instanceof HTMLElement,
                hidden: element?.hidden ?? false,
                rect,
                cleanupReason:
                  element?.dataset?.r1vVisualAcceptanceReason ?? null
              };
            };
            const obstructiveHudSelectors = ${JSON.stringify(
              OBSTRUCTIVE_HUD_SELECTORS
            )};
            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const rootData = document.documentElement.dataset;
            const hudFrame = document.querySelector("[data-hud-frame='true']");
            const hudStates = Object.fromEntries(
              Object.entries(obstructiveHudSelectors).map(([key, selector]) => [
                key,
                readSurface(selector)
              ])
            );
            const cameraButtons = document.querySelectorAll(
              "button[data-r1v-camera-preset='${CAMERA_PRESET_KEY}']"
            );

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "default",
              "Default route must keep default first-intake address resolution."
            );
            assert(
              capture.firstIntakeReplayTimeAuthority === undefined &&
                capture.firstIntakeNearbySecondEndpointExpression === undefined &&
                capture.firstIntakeCinematicCameraPreset === undefined &&
                capture.firstIntakeSatcomContextOverlay === undefined,
              "Default route must not publish R1V addressed-route seams."
            );
            assert(
              rootData.firstIntakeReplayTimeAuthorityState === undefined &&
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationState ===
                  undefined &&
                rootData.firstIntakeCameraPresetKey === undefined &&
                rootData.firstIntakeSatcomContextOverlayState === undefined,
              "Default route must not publish R1V visual telemetry."
            );
            assert(
              hudFrame?.dataset?.r1vVisualAcceptanceHudCleanup === undefined &&
                Object.values(hudStates).every(
                  (panel) =>
                    panel.mounted &&
                    panel.hidden === false &&
                    panel.rect.width > 0 &&
                    panel.rect.height > 0 &&
                    panel.cleanupReason === null
                ),
              "Default route bootstrap HUD behavior must remain unchanged and visible."
            );
            assert(
              cameraButtons.length === 0,
              "Default route must not mount the R1V cinematic button."
            );

            return {
              addressResolution:
                capture.firstIntakeScenarioSurface.getState().addressResolution,
              hudStates,
              cinematicButtonCount: cameraButtons.length
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
