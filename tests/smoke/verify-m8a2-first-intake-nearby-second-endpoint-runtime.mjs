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
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";

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
        `M8A.2 runtime validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A.2 runtime validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

        const addressedResult = await evaluateValue(
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

            let nearbyState = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              nearbyState =
                capture?.firstIntakeNearbySecondEndpoint?.getState?.() ?? null;

              if (
                capture?.firstIntakeNearbySecondEndpoint &&
                nearbyState?.endpoint?.endpointId ===
                  "endpoint-yka-operations-office"
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
              capture?.firstIntakePhysicalInput,
              "Missing first-intake physical-input capture seam."
            );
            assert(
              capture?.firstIntakeHandoverDecision,
              "Missing first-intake handover capture seam."
            );
            assert(
              capture?.firstIntakeMobileEndpointTrajectory,
              "Missing first-intake mobile-endpoint trajectory capture seam."
            );
            assert(
              capture?.firstIntakeNearbySecondEndpoint,
              "Missing first-intake nearby second-endpoint proof seam."
            );

            nearbyState = capture.firstIntakeNearbySecondEndpoint.getState();
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const addressedEntry = capture.firstIntakeScenarioSurface.getAddressedEntry();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const physicalState = capture.firstIntakePhysicalInput.getState();
            const handoverState = capture.firstIntakeHandoverDecision.getState();
            const trajectoryState =
              capture.firstIntakeMobileEndpointTrajectory.getState();
            const rootData = document.documentElement.dataset;

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the active scenario owner."
            );

            assert(
              nearbyState.runtimeState ===
                "accepted-nearby-second-endpoint-package-ingested" &&
                nearbyState.contractSeam === "NearbySecondEndpointSourceEntry" &&
                nearbyState.ingestionSeam ===
                  "adaptAcceptedNearbySecondEndpointPackageToSourceEntry" &&
                nearbyState.proofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpoint",
              "M8A.2 must expose the dedicated nearby second-endpoint contract seam, ingestion seam, and proof seam."
            );

            assert(
              nearbyState.scenarioId === "${TARGET_SCENARIO_ID}" &&
                nearbyState.addressResolution === "matched" &&
                nearbyState.endpoint.scenarioId === "${TARGET_SCENARIO_ID}" &&
                nearbyState.endpoint.endpointId ===
                  "endpoint-yka-operations-office" &&
                nearbyState.endpoint.endpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                nearbyState.endpoint.endpointType ===
                  "airport-adjacent-fixed-service-endpoint" &&
                nearbyState.endpoint.geographyBucket ===
                  "interior-bc-corridor-adjacent" &&
                nearbyState.endpoint.positionPrecision === "facility-known" &&
                nearbyState.endpoint.coordinateReference === "WGS84" &&
                nearbyState.endpoint.narrativeRole ===
                  "nearby-fixed-second-endpoint",
              "Nearby second-endpoint seam must stay bound to the accepted YKA package."
            );

            assert(
              Math.abs(nearbyState.endpoint.coordinates.lat - 50.703) < 1e-9 &&
                Math.abs(nearbyState.endpoint.coordinates.lon + 120.4486) < 1e-9,
              "Nearby second-endpoint seam must preserve the accepted WGS84 coordinates."
            );

            assert(
              nearbyState.endpoint.truthBoundary.activeGatewayAssignment ===
                "not-claimed" &&
                nearbyState.endpoint.truthBoundary.pairSpecificGeoTeleport ===
                  "not-claimed" &&
                nearbyState.endpoint.truthBoundary.measurementTruth ===
                  "not-claimed",
              "Nearby second-endpoint seam must preserve the accepted non-claims."
            );

            assert(
              rootData.firstIntakeNearbySecondEndpointState ===
                "accepted-nearby-second-endpoint-package-ingested" &&
                rootData.firstIntakeNearbySecondEndpointScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                rootData.firstIntakeNearbySecondEndpointEndpointId ===
                  "endpoint-yka-operations-office" &&
                rootData.firstIntakeNearbySecondEndpointEndpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                rootData.firstIntakeNearbySecondEndpointEndpointType ===
                  "airport-adjacent-fixed-service-endpoint" &&
                rootData.firstIntakeNearbySecondEndpointGeographyBucket ===
                  "interior-bc-corridor-adjacent" &&
                rootData.firstIntakeNearbySecondEndpointPositionPrecision ===
                  "facility-known" &&
                rootData.firstIntakeNearbySecondEndpointCoordinateReference ===
                  "WGS84" &&
                rootData.firstIntakeNearbySecondEndpointNarrativeRole ===
                  "nearby-fixed-second-endpoint" &&
                rootData.firstIntakeNearbySecondEndpointActiveGatewayAssignment ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointPairSpecificGeoTeleport ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointMeasurementTruth ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointProofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpoint",
              "Document telemetry must expose the same nearby second-endpoint proof lineage."
            );

            assert(
              trajectoryState.trajectory.endpointId === "aircraft-stack" &&
                nearbyState.endpoint.endpointId !==
                  trajectoryState.trajectory.endpointId,
              "Nearby second endpoint must land as an additional seam, not a rewrite of the aircraft trajectory seam."
            );

            assert(
              handoverState.snapshot.policyId ===
                "first-intake-unsupported-noop-v1" &&
                handoverState.snapshot.decisionModel ===
                  "service-layer-switching" &&
                handoverState.snapshot.isNativeRfHandover === false,
              "Handover runtime must stay unchanged by M8A.2."
            );

            assert(
              !("nearbySecondEndpoint" in addressedEntry.definition) &&
                !("nearbySecondEndpoint" in (addressedEntry.resolvedInputs.context ?? {})) &&
                !("nearbySecondEndpoint" in physicalState) &&
                !("nearbySecondEndpoint" in trajectoryState),
              "Scenario, physical-input, and mobile-trajectory seams must not absorb nearby second-endpoint ownership."
            );

            return {
              captureProofSeam: Boolean(
                capture.firstIntakeNearbySecondEndpoint
              ),
              scenarioId: nearbyState.scenarioId,
              endpointId: nearbyState.endpoint.endpointId,
              positionPrecision: nearbyState.endpoint.positionPrecision,
              sourceLineage: nearbyState.sourceLineage,
              documentTelemetry: {
                state:
                  rootData.firstIntakeNearbySecondEndpointState ?? null,
                proofSeam:
                  rootData.firstIntakeNearbySecondEndpointProofSeam ?? null
              }
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${DEFAULT_REQUEST_PATH}`);

        const defaultRouteResult = await evaluateValue(
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

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeNearbySecondEndpoint === undefined,
              "Default bootstrap route must not adopt the M8A.2 nearby second-endpoint seam."
            );
            assert(
              scenarioSurfaceState?.addressResolution === "default",
              "Default route must preserve the default first-intake address resolution."
            );
            assert(
              activeScenario?.scenarioId !== "${TARGET_SCENARIO_ID}",
              "Default bootstrap route must keep the bootstrap-owned active scenario."
            );
            assert(
              rootData.firstIntakeNearbySecondEndpointState === undefined &&
                rootData.firstIntakeNearbySecondEndpointProofSeam === undefined,
              "Default bootstrap route must not publish M8A.2 nearby second-endpoint telemetry."
            );

            return {
              addressResolution: scenarioSurfaceState?.addressResolution ?? null,
              activeScenarioId: activeScenario?.scenarioId ?? null
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
        client.close();
      }
    } finally {
      await stopHeadlessBrowser(browser.browserProcess);
    }
  } finally {
    await stopStaticServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
