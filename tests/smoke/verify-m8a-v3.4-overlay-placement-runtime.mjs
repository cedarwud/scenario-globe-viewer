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
const ADDRESSED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}&firstIntakeAutoplay=1`;
const BARE_ENTRY_REQUEST_PATH = "/";
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
        `M8A-V3.4 overlay placement validation hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V3.4 overlay placement validation did not reach a ready viewer: ${JSON.stringify(
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

        await navigateAndWait(client, `${baseUrl}${ADDRESSED_REQUEST_PATH}`);

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
                height: rect.height,
                hidden: element.hidden,
                display: getComputedStyle(element).display,
                visibility: getComputedStyle(element).visibility,
                opacity: getComputedStyle(element).opacity
              };
            };
            const toPlainPoint = (point) =>
              point ? { x: point.x, y: point.y } : null;
            const rectsOverlap = (left, right) => {
              return Boolean(
                left &&
                  right &&
                  left.width > 0 &&
                  left.height > 0 &&
                  right.width > 0 &&
                  right.height > 0 &&
                  left.left < right.right &&
                  left.right > right.left &&
                  left.top < right.bottom &&
                  left.bottom > right.top
              );
            };
            const padRect = (rect, paddingX, paddingY = paddingX) => ({
              left: rect.left - paddingX,
              top: rect.top - paddingY,
              right: rect.right + paddingX,
              bottom: rect.bottom + paddingY,
              width: rect.width + 2 * paddingX,
              height: rect.height + 2 * paddingY
            });
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
            const elementIsVisible = (element) => {
              if (!(element instanceof HTMLElement)) {
                return false;
              }

              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);

              return (
                !element.hidden &&
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) !== 0
              );
            };
            const findOrbitLayer = (collection) => {
              for (let index = 0; index < collection.length; index += 1) {
                const primitive = collection.get(index);

                if (primitive?.__firstIntakeOverlayOrbitContext) {
                  return primitive;
                }

                if (
                  primitive &&
                  typeof primitive.length === "number" &&
                  typeof primitive.get === "function"
                ) {
                  const nested = findOrbitLayer(primitive);

                  if (nested) {
                    return nested;
                  }
                }
              }

              return null;
            };
            const findTaggedChild = (layer, propertyName) => {
              if (!layer) {
                return null;
              }

              for (let index = 0; index < layer.length; index += 1) {
                const child = layer.get(index);

                if (child?.[propertyName] === true) {
                  return child;
                }
              }

              return null;
            };
            const collectLabels = (labelCollection, scene) => {
              if (!labelCollection) {
                return [];
              }

              const labels = [];

              for (let index = 0; index < labelCollection.length; index += 1) {
                const label = labelCollection.get(index);

                labels.push({
                  text: label.text,
                  screen: toPlainPoint(label.computeScreenSpacePosition(scene))
                });
              }

              return labels;
            };
            const resolveEntityCanvasPoint = (dataSource, entityId, viewer) => {
              const entity = dataSource?.entities?.getById(entityId);
              const position = entity?.position?.getValue(
                viewer.clock.currentTime
              );

              if (!position) {
                return null;
              }

              return toPlainPoint(
                viewer.scene.cartesianToCanvasCoordinates(position)
              );
            };
            const navigationHelpVisiblePanels = () =>
              Array.from(
                document.querySelectorAll(
                  ".cesium-click-navigation-help-visible, .cesium-touch-navigation-help-visible"
                )
              ).filter(elementIsVisible);

            let capture = null;
            let layer = null;

            for (let attempt = 0; attempt < 140; attempt += 1) {
              capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              layer = capture?.viewer
                ? findOrbitLayer(capture.viewer.scene.primitives)
                : null;

              const satcomState =
                capture?.firstIntakeSatcomContextOverlay?.getState?.() ??
                null;
              const infoState =
                capture?.firstIntakeNearbySecondEndpointInfo?.getState?.() ??
                null;

              if (
                capture?.firstIntakeSatcomContextOverlay &&
                capture?.firstIntakeNearbySecondEndpointInfo &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                capture?.firstIntakeOverlayExpression &&
                capture?.firstIntakeCinematicCameraPreset?.getState?.()
                  ?.activation?.active === true &&
                satcomState?.overlayState ===
                  "active-addressed-route-satcom-context" &&
                infoState?.endpoint?.endpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                layer
              ) {
                break;
              }

              await sleep(50);
            }

            await sleep(160);

            capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");

            const viewer = capture.viewer;
            const satcomRoot = document.querySelector(
              "[data-r1v-satcom-context-overlay='true']"
            );
            const nearbyInfoRoot = document.querySelector(
              "[data-first-intake-nearby-second-endpoint-info='true']"
            );
            const addressedCta = document.querySelector(
              "[data-m8a-v31-homepage-cta='true']"
            );
            const timelineRect = rectToPlain(
              document.querySelector(".cesium-viewer-timelineContainer")
            );
            const animationRect = rectToPlain(
              document.querySelector(".cesium-viewer-animationContainer")
            );
            const satcomRect = rectToPlain(satcomRoot);
            const nearbyInfoRect = rectToPlain(nearbyInfoRoot);
            const navigationHelpButton = document.querySelector(
              ".cesium-navigation-help-button"
            );
            const overlayState =
              capture.firstIntakeSatcomContextOverlay.getState();
            const infoState =
              capture.firstIntakeNearbySecondEndpointInfo.getState();
            const expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const nearbyDataSource = viewer.dataSources.getByName(
              expressionState.dataSourceName
            )[0];

            layer = findOrbitLayer(viewer.scene.primitives);
            const labels = collectLabels(
              findTaggedChild(
                layer,
                "__firstIntakeOverlayOrbitContextLabels"
              ),
              viewer.scene
            );
            const mobileCue = resolveEntityCanvasPoint(
              nearbyDataSource,
              "first-intake-current-mobile-endpoint-cue",
              viewer
            );
            const fixedEndpoint = resolveEntityCanvasPoint(
              nearbyDataSource,
              "first-intake-fixed-nearby-second-endpoint",
              viewer
            );
            const relationCue = resolveEntityCanvasPoint(
              nearbyDataSource,
              "first-intake-nearby-endpoint-relation-cue",
              viewer
            );
            const cueBounds = {
              left: Math.min(mobileCue.x, fixedEndpoint.x, relationCue.x),
              top: Math.min(mobileCue.y, fixedEndpoint.y, relationCue.y),
              right: Math.max(mobileCue.x, fixedEndpoint.x, relationCue.x),
              bottom: Math.max(mobileCue.y, fixedEndpoint.y, relationCue.y)
            };
            cueBounds.width = cueBounds.right - cueBounds.left;
            cueBounds.height = cueBounds.bottom - cueBounds.top;
            const handoverGuard = padRect(cueBounds, 44);
            const orbitLabelGuards = labels.map((label) => ({
              text: label.text,
              rect: {
                left: label.screen.x - 96,
                top: label.screen.y - 28,
                right: label.screen.x + 96,
                bottom: label.screen.y + 28,
                width: 192,
                height: 56
              }
            }));
            const overlappedOrbitLabels = orbitLabelGuards
              .filter(({ rect }) => rectsOverlap(satcomRect, rect))
              .map(({ text }) => text);
            const visibleNavigationPanels = navigationHelpVisiblePanels();

            assert(
              capture.firstIntakeScenarioSurface.getState()
                .addressResolution === "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Overlay placement audit must run on the addressed first-intake owner lane."
            );
            assert(
              satcomRoot instanceof HTMLElement &&
                satcomRoot.hidden === false &&
                satcomRect.width > 0 &&
                satcomRect.height > 0 &&
                satcomRect.width <= 320 &&
                satcomRect.height <= 220,
              "Satcom context overlay must stay visible and compact in close view: " +
                JSON.stringify(satcomRect)
            );
            assert(
              overlayState.layout.avoidsCesiumTimeline === true &&
                overlayState.layout.centerScreenModal === false &&
                overlayState.layout.broadDashboard === false,
              "Satcom context overlay state must remain secondary, not a revived primary panel."
            );
            assert(
              [mobileCue, fixedEndpoint, relationCue].every(
                pointInsideViewport
              ),
              "Close-view audit requires the mobile endpoint, YKA endpoint, and accepted relation cue to be visible: " +
                JSON.stringify({ mobileCue, fixedEndpoint, relationCue })
            );
            assert(
              cueBounds.left - satcomRect.right >= 56 &&
                !rectsOverlap(satcomRect, handoverGuard),
              "Satcom context overlay must not cover the active handover zone in close view: " +
                JSON.stringify({ satcomRect, cueBounds, handoverGuard })
            );
            assert(
              labels.length === 4 &&
                labels.every((label) => pointInsideViewport(label.screen)) &&
                overlappedOrbitLabels.length === 0,
              "Satcom context overlay must not cover LEO/GEO display-context labels: " +
                JSON.stringify({ satcomRect, labels, overlappedOrbitLabels })
            );
            assert(
              !rectsOverlap(satcomRect, timelineRect) &&
                !rectsOverlap(satcomRect, animationRect),
              "Satcom context overlay must not cover Cesium native timeline or animation widgets: " +
                JSON.stringify({ satcomRect, timelineRect, animationRect })
            );
            assert(
              nearbyInfoRoot instanceof HTMLElement &&
                nearbyInfoRoot.hidden === true &&
                nearbyInfoRect.width === 0 &&
                nearbyInfoRect.height === 0 &&
                infoState.panelVisible === false,
              "Nearby endpoint info remains mounted but presentation-suppressed, so it cannot cover close-view handover cues: " +
                JSON.stringify({ nearbyInfoRect, infoState })
            );
            assert(
              addressedCta === null,
              "Addressed close-view route must not keep the V3.1 homepage CTA target mounted."
            );
            assert(
              navigationHelpButton instanceof HTMLElement &&
                elementIsVisible(navigationHelpButton) &&
                visibleNavigationPanels.length === 0,
              "Cesium navigation-help instructions must be collapsed by default; the native button remains available."
            );

            return {
              satcomRect,
              nearbyInfoRect,
              cueBounds,
              labels,
              timelineRect,
              animationRect,
              navigationHelpVisiblePanelCount: visibleNavigationPanels.length,
              addressedCtaMounted: Boolean(addressedCta)
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${BARE_ENTRY_REQUEST_PATH}`);

        const bareEntryResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const elementIsVisible = (element) => {
              if (!(element instanceof HTMLElement)) {
                return false;
              }

              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);

              return (
                !element.hidden &&
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) !== 0
              );
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
            const visibleNavigationPanels = Array.from(
              document.querySelectorAll(
                ".cesium-click-navigation-help-visible, .cesium-touch-navigation-help-visible"
              )
            ).filter(elementIsVisible);
            const ctaRoot = document.querySelector(
              "[data-m8a-v31-homepage-cta='true']"
            );
            const satcomRoot = document.querySelector(
              "[data-r1v-satcom-context-overlay='true']"
            );
            const nearbyInfoRoot = document.querySelector(
              "[data-first-intake-nearby-second-endpoint-info='true']"
            );

            assert(
              ctaRoot instanceof HTMLElement && elementIsVisible(ctaRoot),
              "Bare / entry must keep the V3.1 CTA visible after returning from addressed close-view."
            );
            assert(
              satcomRoot === null && nearbyInfoRoot === null,
              "Bare / entry must not retain addressed-route satcom or nearby endpoint overlays."
            );
            assert(
              visibleNavigationPanels.length === 0,
              "Cesium navigation-help instructions must also be collapsed on bare /."
            );

            return {
              ctaRect: rectToPlain(ctaRoot),
              satcomMounted: Boolean(satcomRoot),
              nearbyInfoMounted: Boolean(nearbyInfoRoot),
              navigationHelpVisiblePanelCount: visibleNavigationPanels.length
            };
          })()`
        );

        console.log(
          JSON.stringify(
            {
              addressedResult,
              bareEntryResult
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
