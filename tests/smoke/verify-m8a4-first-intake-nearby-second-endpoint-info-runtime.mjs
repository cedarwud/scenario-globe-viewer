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
const EXPECTED_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointInfo";

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
        `M8A.4 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A.4 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

            let infoState = null;
            let infoPanel = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              infoState =
                capture?.firstIntakeNearbySecondEndpointInfo?.getState?.() ??
                null;
              infoPanel = document.querySelector(
                ".first-intake-nearby-second-endpoint-info"
              );

              if (
                capture?.firstIntakeNearbySecondEndpointInfo &&
                infoState?.endpoint?.endpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                infoPanel
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
              capture?.firstIntakeNearbySecondEndpoint,
              "Missing nearby second-endpoint runtime seam."
            );
            assert(
              capture?.firstIntakeActiveCaseNarrative,
              "Missing active first-case narrative seam."
            );
            assert(
              capture?.firstIntakeNearbySecondEndpointInfo,
              "Missing M8A.4 nearby second-endpoint info proof seam."
            );

            infoState =
              capture.firstIntakeNearbySecondEndpointInfo.getState();
            const nearbyState = capture.firstIntakeNearbySecondEndpoint.getState();
            const activeNarrativeState =
              capture.firstIntakeActiveCaseNarrative.getState();
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const rootData = document.documentElement.dataset;
            infoPanel = document.querySelector(
              ".first-intake-nearby-second-endpoint-info"
            );
            const panelData = infoPanel?.dataset ?? {};
            const panelText = infoPanel?.textContent?.replace(/\\s+/g, " ").trim() ?? "";
            const panelRect = infoPanel?.getBoundingClientRect?.() ?? {
              width: -1,
              height: -1
            };

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the active owner lane."
            );

            assert(
              infoState.infoState === "active-addressed-case" &&
                infoState.infoSurface ===
                  "supplemental-nearby-second-endpoint-info-panel" &&
                infoState.panelVisible === false &&
                infoState.proofSeam === "${EXPECTED_PROOF_SEAM}" &&
                infoState.scenarioId === "${TARGET_SCENARIO_ID}",
              "M8A.4 must expose the addressed supplemental info proof seam."
            );

            assert(
              infoState.endpoint.endpointLabel ===
                "YKA Kamloops Airport Operations Office" &&
                infoState.endpoint.endpointType ===
                  "airport-adjacent-fixed-service-endpoint" &&
                infoState.endpoint.positionPrecision === "facility-known" &&
                infoState.endpoint.geographyBucket ===
                  "interior-bc-corridor-adjacent" &&
                infoState.endpoint.narrativeRole ===
                  "nearby-fixed-second-endpoint" &&
                infoState.nearbyRelation ===
                  "first-corridor-nearby-second-endpoint",
              "M8A.4 info state must explain the accepted YKA second endpoint, precision, geography bucket, and relation."
            );

            assert(
              infoState.endpoint.endpointLabel ===
                nearbyState.endpoint.endpointLabel &&
                infoState.endpoint.endpointType ===
                  nearbyState.endpoint.endpointType &&
                infoState.endpoint.positionPrecision ===
                  nearbyState.endpoint.positionPrecision &&
                infoState.endpoint.geographyBucket ===
                  nearbyState.endpoint.geographyBucket,
              "M8A.4 info surface must consume the existing nearby second-endpoint seam."
            );

            assert(
              infoState.firstCaseContext.caseLabel ===
                "OneWeb LEO + Intelsat GEO aviation" &&
                infoState.firstCaseContext.caseLabel ===
                  activeNarrativeState.caseLabel &&
                infoState.firstCaseContext.serviceSwitchingSemantics ===
                  "service-layer switching" &&
                infoState.firstCaseContext.nativeRfHandover === false &&
                infoState.firstCaseContext.truthBoundaryMode ===
                  "bounded-proxy" &&
                infoState.firstCaseContext.measurementTruthClaim ===
                  "not-measurement-truth",
              "M8A.4 info surface must preserve the first-case truth boundary."
            );

            assert(
              infoState.nonClaims.activeGatewayAssignment === "not-claimed" &&
                infoState.nonClaims.pairSpecificGeoTeleport === "not-claimed" &&
                infoState.nonClaims.measurementTruth === "not-claimed" &&
                infoState.nonClaims.activeGatewayAssignmentLabel ===
                  "No active gateway assignment" &&
                infoState.nonClaims.pairSpecificGeoTeleportLabel ===
                  "No pair-specific GEO teleport" &&
                infoState.nonClaims.measurementTruthPerformanceLabel ===
                  "No measurement-truth performance claim",
              "M8A.4 info surface must expose the required non-claims."
            );

            assert(
              infoState.sourceLineage.nearbySecondEndpointRead ===
                "nearbySecondEndpointController.getState().endpoint" &&
                infoState.sourceLineage.firstCaseNarrativeRead ===
                  "activeCaseNarrativeController.getState()" &&
                infoState.sourceLineage.scenarioRuntimeRead ===
                  "scenarioSurface.getState()+scenarioSurface.getAddressedEntry()" &&
                infoState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "M8A.4 info surface must stay on repo-owned runtime seams only."
            );

            assert(
              infoPanel &&
                panelData.endpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                panelData.endpointType ===
                  "airport-adjacent-fixed-service-endpoint" &&
                panelData.positionPrecision === "facility-known" &&
                panelData.geographyBucket ===
                  "interior-bc-corridor-adjacent" &&
                panelData.nearbyRelation ===
                  "first-corridor-nearby-second-endpoint" &&
                panelData.panelVisible === "false" &&
                panelData.presentationState === "suppressed" &&
                panelData.presentationSuppression ===
                  "r1v1-default-floating-panel-suppression" &&
                panelData.activeGatewayAssignment === "not-claimed" &&
                panelData.pairSpecificGeoTeleport === "not-claimed" &&
                panelData.measurementTruth === "not-claimed" &&
                panelData.proofSeam === "${EXPECTED_PROOF_SEAM}",
              "M8A.4 info panel DOM dataset must mirror the proof surface."
            );

            assert(
              infoPanel.hidden === true &&
                panelRect.width === 0 &&
                panelRect.height === 0 &&
                panelText.includes("YKA Kamloops Airport Operations Office") &&
                panelText.includes(
                  "airport-adjacent-fixed-service-endpoint"
                ) &&
                panelText.includes("facility-known") &&
                panelText.includes("interior-bc-corridor-adjacent") &&
                panelText.includes(
                  "first-corridor-nearby-second-endpoint"
                ) &&
                panelText.includes("No active gateway assignment") &&
                panelText.includes("No pair-specific GEO teleport") &&
                panelText.includes(
                  "No measurement-truth performance claim"
                ),
              "M8A.4 info panel must keep endpoint facts, precision, nearby relation, and non-claims populated while hidden by R1V.1 presentation suppression."
            );

            assert(
              !panelText.includes("MEO") &&
                !panelText.includes("50.703") &&
                !panelText.includes("120.4486") &&
                !/measurement-truth\\s+(latency|jitter|throughput)/i.test(panelText) &&
                !/active gateway (assigned|selected|serving)/i.test(panelText) &&
                !/serving gateway/i.test(panelText) &&
                !/geo teleport (assigned|selected|serving)/i.test(panelText),
              "M8A.4 info panel must not expose forbidden MEO, exact coordinate, active gateway, GEO teleport, or measurement-performance wording."
            );

            assert(
              rootData.firstIntakeNearbySecondEndpointInfoState ===
                "active-addressed-case" &&
                rootData.firstIntakeNearbySecondEndpointInfoScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                rootData.firstIntakeNearbySecondEndpointInfoPanelVisible ===
                  "false" &&
                rootData.firstIntakeNearbySecondEndpointInfoEndpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                rootData.firstIntakeNearbySecondEndpointInfoEndpointType ===
                  "airport-adjacent-fixed-service-endpoint" &&
                rootData.firstIntakeNearbySecondEndpointInfoPositionPrecision ===
                  "facility-known" &&
                rootData.firstIntakeNearbySecondEndpointInfoGeographyBucket ===
                  "interior-bc-corridor-adjacent" &&
                rootData.firstIntakeNearbySecondEndpointInfoNarrativeRole ===
                  "nearby-fixed-second-endpoint" &&
                rootData.firstIntakeNearbySecondEndpointInfoNearbyRelation ===
                  "first-corridor-nearby-second-endpoint" &&
                rootData.firstIntakeNearbySecondEndpointInfoActiveGatewayAssignment ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointInfoPairSpecificGeoTeleport ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointInfoMeasurementTruth ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointInfoFirstCaseLabel ===
                  "OneWeb LEO + Intelsat GEO aviation" &&
                rootData.firstIntakeNearbySecondEndpointInfoServiceSwitchingSemantics ===
                  "service-layer switching" &&
                rootData.firstIntakeNearbySecondEndpointInfoNativeRfHandover ===
                  "false" &&
                rootData.firstIntakeNearbySecondEndpointInfoTruthBoundaryMode ===
                  "bounded-proxy" &&
                rootData.firstIntakeNearbySecondEndpointInfoProofSeam ===
                  "${EXPECTED_PROOF_SEAM}",
              "Document telemetry must mirror the M8A.4 info guardrails."
            );

            return {
              scenarioId: infoState.scenarioId,
              endpoint: infoState.endpoint,
              firstCaseContext: infoState.firstCaseContext,
              nonClaims: infoState.nonClaims,
              documentTelemetry: {
                state:
                  rootData.firstIntakeNearbySecondEndpointInfoState ?? null,
                proofSeam:
                  rootData.firstIntakeNearbySecondEndpointInfoProofSeam ?? null
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

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const scenarioSurfaceState =
              capture?.firstIntakeScenarioSurface?.getState?.();
            const activeScenario = capture?.scenarioSession?.getCurrentScenario?.();
            const rootData = document.documentElement.dataset;
            const infoPanel = document.querySelector(
              ".first-intake-nearby-second-endpoint-info"
            );

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeNearbySecondEndpointInfo === undefined,
              "Default bootstrap route must not publish the M8A.4 info seam."
            );
            assert(
              infoPanel === null,
              "Default bootstrap route must not mount the M8A.4 info panel."
            );
            assert(
              scenarioSurfaceState?.addressResolution === "default",
              "Default bootstrap route must preserve the default first-intake address resolution."
            );
            assert(
              activeScenario?.scenarioId !== "${TARGET_SCENARIO_ID}",
              "Default bootstrap route must keep bootstrap ownership."
            );
            assert(
              rootData.firstIntakeNearbySecondEndpointInfoState ===
                undefined &&
                rootData.firstIntakeNearbySecondEndpointInfoProofSeam ===
                  undefined,
              "Default bootstrap route must not publish M8A.4 telemetry."
            );

            return {
              addressResolution: scenarioSurfaceState?.addressResolution ?? null,
              activeScenarioId: activeScenario?.scenarioId ?? null,
              infoPanelMounted: Boolean(infoPanel)
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
