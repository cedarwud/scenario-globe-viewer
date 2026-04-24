import {
  connectCdp,
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
const OVERLAY_DATA_SOURCE_NAME = "first-intake-overlay-expression";
const EXPECTED_GATEWAY_NODE_IDS = [
  "talkeetna-gateway",
  "clewiston-gateway",
  "southbury-gateway",
  "santa-paula-gateway",
  "paumalu-gateway",
  "yona-gateway"
];
const EXPECTED_COORDINATE_FREE_ENDPOINT_IDS = [
  "aircraft-stack",
  "aviation-service-anchor"
];
const REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function evaluateValue(client, expression, { awaitPromise = false } = {}) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true
  });

  return evaluation.result.value;
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateValue(
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
        `M4 first-intake overlay expression validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M4 first-intake overlay expression validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
  );
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
        await client.send("Page.navigate", {
          url: `${baseUrl}${REQUEST_PATH}`
        });
        await waitForBootstrapReady(client);

        const result = await evaluateValue(
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

            let overlayState = null;
            let panel = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              overlayState = capture?.firstIntakeOverlayExpression?.getState?.() ?? null;
              panel = document.querySelector('[data-first-intake-overlay-expression="true"]');

              if (
                capture?.firstIntakeOverlayExpression &&
                overlayState?.dataSourceAttached === true &&
                panel instanceof HTMLElement
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(
              capture?.firstIntakeScenarioSurface,
              "Missing first-intake runtime surface capture seam."
            );
            assert(
              capture?.firstIntakeOverlayExpression,
              "Missing first-intake overlay expression capture seam."
            );
            assert(
              capture?.firstIntakePhysicalInput,
              "Missing first-intake physical-input capture seam."
            );
            assert(
              capture?.firstIntakeHandoverDecision,
              "Missing first-intake handover capture seam."
            );
            assert(
              panel instanceof HTMLElement,
              "Missing first-intake overlay expression panel DOM ownership."
            );

            overlayState = capture.firstIntakeOverlayExpression.getState();
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const firstIntakePhysicalState = capture.firstIntakePhysicalInput.getState();
            const firstIntakeHandoverState =
              capture.firstIntakeHandoverDecision.getState();
            const panelRect = panel.getBoundingClientRect();
            const dataSources = capture.viewer.dataSources.getByName(
              "${OVERLAY_DATA_SOURCE_NAME}"
            );
            const dataSource = dataSources[0];
            const dataSourceEntityIds =
              dataSource?.entities?.values?.map((entity) => entity.id) ?? [];
            const documentTelemetry = {
              expressionState:
                document.documentElement.dataset.firstIntakeOverlayExpressionState ??
                null,
              truthBoundaryLabel:
                document.documentElement.dataset.firstIntakeOverlayTruthBoundaryLabel ??
                null,
              endpointExpressionMode:
                document.documentElement.dataset.firstIntakeOverlayEndpointExpressionMode ??
                null,
              infrastructureExpressionMode:
                document.documentElement.dataset
                  .firstIntakeOverlayInfrastructureExpressionMode ?? null,
              gatewayPoolSemantics:
                document.documentElement.dataset.firstIntakeOverlayGatewayPoolSemantics ??
                null,
              activeGatewayClaim:
                document.documentElement.dataset.firstIntakeOverlayActiveGatewayClaim ??
                null,
              panelVisible:
                document.documentElement.dataset.firstIntakeOverlayPanelVisible ??
                null,
              coordinateFreeEndpointCount:
                document.documentElement.dataset
                  .firstIntakeOverlayCoordinateFreeEndpointCount ?? null,
              coordinateFreeEndpointIds:
                document.documentElement.dataset
                  .firstIntakeOverlayCoordinateFreeEndpointIds ?? null,
              onGlobeInfrastructureNodeCount:
                document.documentElement.dataset
                  .firstIntakeOverlayOnGlobeInfrastructureNodeCount ?? null,
              infrastructureNodeIds:
                document.documentElement.dataset
                  .firstIntakeOverlayInfrastructureNodeIds ?? null,
              dataSourceAttached:
                document.documentElement.dataset.firstIntakeOverlayDataSourceAttached ??
                null,
              dataSourceName:
                document.documentElement.dataset.firstIntakeOverlayDataSourceName ??
                null
            };
            const panelDataset = {
              expressionState: panel.dataset.expressionState ?? null,
              truthBoundaryLabel: panel.dataset.truthBoundaryLabel ?? null,
              endpointExpressionMode: panel.dataset.endpointExpressionMode ?? null,
              infrastructureExpressionMode:
                panel.dataset.infrastructureExpressionMode ?? null,
              gatewayPoolSemantics: panel.dataset.gatewayPoolSemantics ?? null,
              activeGatewayClaim: panel.dataset.activeGatewayClaim ?? null,
              panelVisible: panel.dataset.panelVisible ?? null,
              presentationState: panel.dataset.presentationState ?? null,
              presentationSuppression:
                panel.dataset.presentationSuppression ?? null,
              coordinateFreeEndpointCount:
                panel.dataset.coordinateFreeEndpointCount ?? null,
              coordinateFreeEndpointIds:
                panel.dataset.coordinateFreeEndpointIds ?? null,
              onGlobeInfrastructureNodeCount:
                panel.dataset.onGlobeInfrastructureNodeCount ?? null,
              infrastructureNodeIds: panel.dataset.infrastructureNodeIds ?? null,
              dataSourceAttached: panel.dataset.dataSourceAttached ?? null,
              dataSourceName: panel.dataset.dataSourceName ?? null
            };

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the live active scenario owner."
            );
            assert(
              overlayState.expressionState === "active-addressed-case" &&
                overlayState.endpointExpressionMode === "runtime-local-panel" &&
                overlayState.infrastructureExpressionMode === "globe-pool-markers",
              "First-intake overlay expression seam must expose the M4 runtime expression modes."
            );
            assert(
              overlayState.panelVisible === false,
              "First-intake overlay expression panel presentation must be suppressed by default while the seam stays available."
            );
            assert(
              overlayState.gatewayPoolSemantics === "eligible-gateway-pool" &&
                overlayState.activeGatewayClaim === "not-claimed",
              "Gateway expression must stay bounded to an eligible pool with no active claim."
            );
            assert(
              overlayState.truthBoundaryLabel ===
                "real-pairing-bounded-runtime-projection",
              "Overlay expression must preserve the first-intake truth-boundary label."
            );
            assert(
              overlayState.coordinateFreeEndpointCount === 2 &&
                JSON.stringify(overlayState.coordinateFreeEndpointIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_COORDINATE_FREE_ENDPOINT_IDS)}),
              "Coordinate-free endpoints must remain explicit and unchanged."
            );
            assert(
              overlayState.onGlobeInfrastructureNodeCount === 6 &&
                JSON.stringify(overlayState.infrastructureNodeIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_GATEWAY_NODE_IDS)}),
              "Infrastructure markers must stay aligned with the resolved eligible gateway pool."
            );
            assert(
              overlayState.dataSourceAttached === true &&
                overlayState.infrastructureDataSourceName ===
                  "${OVERLAY_DATA_SOURCE_NAME}",
              "Infrastructure overlay expression must attach through the repo-owned runtime data-source seam."
            );
            assert(
              panel.hidden === true &&
                panelRect.width === 0 &&
                panelRect.height === 0 &&
                panel.textContent.includes("eligible pool") &&
                panel.textContent.includes("invented globe coordinates"),
              "Overlay expression runtime panel must keep populated DOM markers while hidden by R1V.1 presentation suppression."
            );
            assert(
              dataSources.length === 1 &&
                JSON.stringify(dataSourceEntityIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_GATEWAY_NODE_IDS)}),
              "Resolved infrastructure nodes must be the only on-globe entities attached by the M4 expression seam."
            );
            assert(
              !dataSourceEntityIds.some((id) =>
                ${JSON.stringify(EXPECTED_COORDINATE_FREE_ENDPOINT_IDS)}.includes(id)
              ),
              "Coordinate-free endpoints must not be promoted into globe-pinned entities."
            );
            assert(
              documentTelemetry.expressionState === "active-addressed-case" &&
                documentTelemetry.endpointExpressionMode ===
                  "runtime-local-panel" &&
                documentTelemetry.infrastructureExpressionMode ===
                  "globe-pool-markers" &&
                documentTelemetry.gatewayPoolSemantics ===
                  "eligible-gateway-pool" &&
                documentTelemetry.activeGatewayClaim === "not-claimed" &&
                documentTelemetry.panelVisible === "false" &&
                documentTelemetry.coordinateFreeEndpointCount === "2" &&
                documentTelemetry.onGlobeInfrastructureNodeCount === "6" &&
                documentTelemetry.dataSourceAttached === "true" &&
                documentTelemetry.dataSourceName === "${OVERLAY_DATA_SOURCE_NAME}",
              "Document telemetry must expose the bounded first-intake overlay expression seam."
            );
            assert(
              panelDataset.expressionState === documentTelemetry.expressionState &&
                panelDataset.truthBoundaryLabel ===
                  documentTelemetry.truthBoundaryLabel &&
                panelDataset.endpointExpressionMode ===
                  documentTelemetry.endpointExpressionMode &&
                panelDataset.infrastructureExpressionMode ===
                  documentTelemetry.infrastructureExpressionMode &&
                panelDataset.gatewayPoolSemantics ===
                  documentTelemetry.gatewayPoolSemantics &&
                panelDataset.activeGatewayClaim ===
                  documentTelemetry.activeGatewayClaim &&
                panelDataset.panelVisible === documentTelemetry.panelVisible &&
                panelDataset.presentationState === "suppressed" &&
                panelDataset.presentationSuppression ===
                  "r1v1-default-floating-panel-suppression" &&
                panelDataset.coordinateFreeEndpointCount ===
                  documentTelemetry.coordinateFreeEndpointCount &&
                panelDataset.coordinateFreeEndpointIds ===
                  documentTelemetry.coordinateFreeEndpointIds &&
                panelDataset.onGlobeInfrastructureNodeCount ===
                  documentTelemetry.onGlobeInfrastructureNodeCount &&
                panelDataset.infrastructureNodeIds ===
                  documentTelemetry.infrastructureNodeIds &&
                panelDataset.dataSourceAttached ===
                  documentTelemetry.dataSourceAttached &&
                panelDataset.dataSourceName === documentTelemetry.dataSourceName,
              "Suppressed DOM markers must stay aligned with document telemetry."
            );
            assert(
              JSON.stringify(
                firstIntakePhysicalState.physicalInput.candidates.map((candidate) => ({
                  candidateId: candidate.candidateId,
                  orbitClass: candidate.orbitClass,
                  pathRole: candidate.pathRole,
                  pathControlMode: candidate.pathControlMode,
                  infrastructureSelectionMode:
                    candidate.infrastructureSelectionMode
                }))
              ) ===
                JSON.stringify([
                  {
                    candidateId: "oneweb-leo-service-path",
                    orbitClass: "leo",
                    pathRole: "primary",
                    pathControlMode: "managed_service_switching",
                    infrastructureSelectionMode: "eligible-pool"
                  },
                  {
                    candidateId: "intelsat-geo-service-path",
                    orbitClass: "geo",
                    pathRole: "secondary",
                    pathControlMode: "managed_service_switching",
                    infrastructureSelectionMode: "provider-managed"
                  }
                ]),
              "First-intake physical-input must remain unchanged."
            );
            assert(
              firstIntakeHandoverState.snapshot.policyId ===
                "first-intake-unsupported-noop-v1" &&
                firstIntakeHandoverState.snapshot.candidates.length === 0 &&
                firstIntakeHandoverState.result.decisionKind === "unavailable" &&
                firstIntakeHandoverState.result.semanticsBridge.truthState ===
                  "unavailable",
              "First-intake handover must remain explicit unsupported/no-op."
            );

            return {
              proofSeams: [
                "capture:firstIntakeOverlayExpression",
                "suppressed-dom-markers",
                "document-telemetry"
              ],
              overlayState,
              panelSelector: '[data-first-intake-overlay-expression="true"]',
              dataSourceEntityIds,
              activeScenarioId: activeScenario.scenarioId,
              handoverPolicyId: firstIntakeHandoverState.snapshot.policyId
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(
          `M4 Slice A first-intake overlay expression validation passed: ${JSON.stringify(
            result
          )}`
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
