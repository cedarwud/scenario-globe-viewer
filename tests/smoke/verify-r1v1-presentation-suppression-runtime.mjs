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
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const R1V1_SUPPRESSION_REASON =
  "r1v1-default-floating-panel-suppression";
const PANEL_SELECTORS = {
  overlayExpression: "[data-first-intake-overlay-expression='true']",
  activeCaseNarrative: "[data-first-intake-active-case-narrative='true']",
  nearbySecondEndpointInfo:
    "[data-first-intake-nearby-second-endpoint-info='true']"
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
        `R1V.1 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `R1V.1 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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
            const panelSelectors = ${JSON.stringify(PANEL_SELECTORS)};
            const expectedSuppressionReason = ${JSON.stringify(
              R1V1_SUPPRESSION_REASON
            )};

            let expressionState = null;
            let infoState = null;

            for (let attempt = 0; attempt < 100; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              expressionState =
                capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
                null;
              infoState =
                capture?.firstIntakeNearbySecondEndpointInfo?.getState?.() ??
                null;

              if (
                capture?.firstIntakeOverlayExpression &&
                capture?.firstIntakeActiveCaseNarrative &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                capture?.firstIntakeNearbySecondEndpointInfo &&
                expressionState?.dataSourceAttached === true &&
                infoState?.endpoint?.endpointLabel ===
                  "YKA Kamloops Airport Operations Office"
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "Missing M8A.3 expression capture seam."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointInfo,
              "Missing M8A.4 info capture seam."
            );

            const scenarioSurfaceState =
              capture.firstIntakeScenarioSurface.getState();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const narrativeState =
              capture.firstIntakeActiveCaseNarrative.getState();
            expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            infoState = capture.firstIntakeNearbySecondEndpointInfo.getState();
            const rootData = document.documentElement.dataset;
            const panels = Object.fromEntries(
              Object.entries(panelSelectors).map(([key, selector]) => {
                const panel = document.querySelector(selector);
                const rect = panel?.getBoundingClientRect?.() ?? {
                  width: -1,
                  height: -1
                };

                return [
                  key,
                  {
                    mounted: panel instanceof HTMLElement,
                    hidden: panel?.hidden ?? false,
                    width: rect.width,
                    height: rect.height,
                    presentationState: panel?.dataset.presentationState ?? null,
                    presentationSuppression:
                      panel?.dataset.presentationSuppression ?? null,
                    panelVisible: panel?.dataset.panelVisible ?? null,
                    text: panel?.textContent?.replace(/\\s+/g, " ").trim() ?? ""
                  }
                ];
              })
            );

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake route must remain the active owner lane."
            );
            assert(
              expressionState.expressionState === "active-addressed-case" &&
                expressionState.dataSourceAttached === true &&
                expressionState.proofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointExpression" &&
                expressionState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "M8A.3 expression capture and telemetry seam must remain active."
            );
            assert(
              infoState.infoState === "active-addressed-case" &&
                infoState.panelVisible === false &&
                infoState.proofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointInfo" &&
                infoState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "M8A.4 info ownership must remain active while presentation is hidden."
            );
            assert(
              overlayState.panelVisible === false &&
                narrativeState.panelVisible === false,
              "Existing first-intake floating panels must report hidden presentation by default."
            );
            assert(
              Object.values(panels).every(
                (panel) =>
                  panel.mounted &&
                  panel.hidden === true &&
                  panel.width === 0 &&
                  panel.height === 0 &&
                  panel.presentationState === "suppressed" &&
                  panel.presentationSuppression === expectedSuppressionReason &&
                  panel.panelVisible === "false"
              ),
              "Intrusive first-intake panels must stay DOM-owned but hidden/collapsed by default."
            );
            assert(
              panels.overlayExpression.text.includes("eligible pool") &&
                panels.activeCaseNarrative.text.includes(
                  "OneWeb LEO + Intelsat GEO aviation"
                ) &&
                panels.nearbySecondEndpointInfo.text.includes(
                  "YKA Kamloops Airport Operations Office"
                ),
              "Suppressed presentation must not erase the existing panel data contracts."
            );
            assert(
              rootData.firstIntakeNearbySecondEndpointExpressionState ===
                "active-addressed-case" &&
                rootData.firstIntakeNearbySecondEndpointInfoState ===
                  "active-addressed-case" &&
                rootData.firstIntakeOverlayPanelVisible === "false" &&
                rootData.firstIntakeNearbySecondEndpointInfoPanelVisible ===
                  "false",
              "Document telemetry must keep M8A proof seams alive while recording hidden presentation."
            );

            return {
              activeScenarioId: activeScenario.scenarioId,
              expressionDataSourceAttached: expressionState.dataSourceAttached,
              infoPanelVisible: infoState.panelVisible,
              overlayPanelVisible: overlayState.panelVisible,
              narrativePanelVisible: narrativeState.panelVisible,
              panels
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
            const scenarioSurfaceState =
              capture?.firstIntakeScenarioSurface?.getState?.();
            const activeScenario = capture?.scenarioSession?.getCurrentScenario?.();
            const suppressedPanels = document.querySelectorAll(
              "[data-presentation-suppression='${R1V1_SUPPRESSION_REASON}']"
            );

            assert(capture, "Missing capture seam on default route.");
            assert(
              scenarioSurfaceState?.addressResolution === "default" &&
                activeScenario?.scenarioId !== "${TARGET_SCENARIO_ID}",
              "Default route must keep bootstrap ownership."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression === undefined &&
                capture.firstIntakeNearbySecondEndpointInfo === undefined &&
                capture.firstIntakeOverlayExpression === undefined &&
                capture.firstIntakeActiveCaseNarrative === undefined,
              "Default route must not publish M8A/R1V first-intake presentation capture state."
            );
            assert(
              suppressedPanels.length === 0,
              "Default route must not mount R1V.1 suppressed presentation panels."
            );
            assert(
              rootData.firstIntakeNearbySecondEndpointExpressionState ===
                undefined &&
                rootData.firstIntakeNearbySecondEndpointInfoState ===
                  undefined &&
                rootData.firstIntakeOverlayPanelVisible === undefined &&
                rootData.firstIntakeNearbySecondEndpointInfoPanelVisible ===
                  undefined,
              "Default route must not publish M8A/R1V presentation telemetry."
            );

            return {
              addressResolution: scenarioSurfaceState?.addressResolution ?? null,
              activeScenarioId: activeScenario?.scenarioId ?? null,
              suppressedPanelCount: suppressedPanels.length
            };
          })()`,
          { awaitPromise: true }
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
