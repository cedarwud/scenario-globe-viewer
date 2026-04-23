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
const EXPECTED_RECORD_ID = "ac-cgojz-crj900-c06aa4-2026-04-21";
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
        `M6 slice A validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M6 slice A validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

            let trajectoryState = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              trajectoryState =
                capture?.firstIntakeMobileEndpointTrajectory?.getState?.() ?? null;

              if (
                capture?.firstIntakeMobileEndpointTrajectory &&
                trajectoryState?.trajectory?.trajectory?.waypointCount === 447
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
              capture?.firstIntakeOverlayExpression,
              "Missing first-intake overlay expression capture seam."
            );
            assert(
              capture?.firstIntakeMobileEndpointTrajectory,
              "Missing first-intake mobile-endpoint trajectory proof seam."
            );

            trajectoryState = capture.firstIntakeMobileEndpointTrajectory.getState();
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const addressedEntry = capture.firstIntakeScenarioSurface.getAddressedEntry();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const physicalState = capture.firstIntakePhysicalInput.getState();
            const handoverState = capture.firstIntakeHandoverDecision.getState();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const rootData = document.documentElement.dataset;

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the active scenario owner."
            );

            assert(
              trajectoryState.runtimeState === "accepted-corridor-package-ingested" &&
                trajectoryState.contractSeam ===
                  "MobileEndpointTrajectorySourceEntry" &&
                trajectoryState.ingestionSeam ===
                  "adaptAcceptedCorridorPackageToMobileEndpointTrajectorySourceEntry" &&
                trajectoryState.proofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectory",
              "M6 slice A must expose the dedicated contract seam, ingestion seam, and named proof seam."
            );

            assert(
              trajectoryState.scenarioId === "${TARGET_SCENARIO_ID}" &&
                trajectoryState.addressResolution === "matched" &&
                trajectoryState.trajectory.scenarioId === "${TARGET_SCENARIO_ID}" &&
                trajectoryState.trajectory.endpointId === "aircraft-stack" &&
                trajectoryState.trajectory.endpointRole === "endpoint-a" &&
                trajectoryState.trajectory.mobilityKind === "mobile",
              "Trajectory seam must stay bound to the first-intake aircraft mobile endpoint."
            );

            assert(
              trajectoryState.trajectory.trajectory.recordId === "${EXPECTED_RECORD_ID}" &&
                trajectoryState.trajectory.trajectory.seedId === "${TARGET_SCENARIO_ID}" &&
                trajectoryState.trajectory.trajectory.truthKind ===
                  "historical-corridor-package" &&
                trajectoryState.trajectory.trajectory.coordinateReference ===
                  "WGS84" &&
                trajectoryState.trajectory.trajectory.waypointCount === 447 &&
                trajectoryState.trajectory.trajectory.points.length === 447 &&
                trajectoryState.trajectory.trajectory.artifactType === "GeoJSON" &&
                trajectoryState.trajectory.trajectory.artifactHashSha256 ===
                  "c16f562448fff8a7813e01691ba3c034cf4d93a7f814f91213430e003cb05b84",
              "Accepted corridor package must be ingested through the dedicated trajectory seam with frozen provenance."
            );

            assert(
              trajectoryState.trajectory.truthBoundary.corridorTruth ===
                "replayable-historical-trajectory-package" &&
                trajectoryState.trajectory.truthBoundary.equipageTruth ===
                  "not-proven-at-tail-level" &&
                trajectoryState.trajectory.truthBoundary.serviceTruth ===
                  "not-proven-active-on-this-flight" &&
                trajectoryState.trajectory.truthBoundary.identifierSemantics ===
                  "audit-only" &&
                trajectoryState.trajectory.truthBoundary.onewebGatewaySemantics ===
                  "eligible-pool-only" &&
                trajectoryState.trajectory.truthBoundary.geoAnchorSemantics ===
                  "provider-managed-anchor" &&
                trajectoryState.trajectory.truthBoundary.activeGatewayAssignment ===
                  "not-claimed" &&
                trajectoryState.trajectory.truthBoundary.pairSpecificGeoTeleport ===
                  "not-claimed",
              "Corridor truth must stay separate from equipage, service, gateway, and GEO-anchor overclaims."
            );

            assert(
              rootData.firstIntakeMobileTrajectoryState ===
                "accepted-corridor-package-ingested" &&
                rootData.firstIntakeMobileTrajectoryScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                rootData.firstIntakeMobileTrajectoryRecordId ===
                  "${EXPECTED_RECORD_ID}" &&
                rootData.firstIntakeMobileTrajectoryWaypointCount === "447" &&
                rootData.firstIntakeMobileTrajectoryCoordinateReference ===
                  "WGS84" &&
                rootData.firstIntakeMobileTrajectoryCorridorTruth ===
                  "replayable-historical-trajectory-package" &&
                rootData.firstIntakeMobileTrajectoryEquipageTruth ===
                  "not-proven-at-tail-level" &&
                rootData.firstIntakeMobileTrajectoryServiceTruth ===
                  "not-proven-active-on-this-flight" &&
                rootData.firstIntakeMobileTrajectoryProofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeMobileEndpointTrajectory",
              "Document telemetry must expose the same ingested corridor package proof."
            );

            assert(
              !("trajectory" in addressedEntry.definition) &&
                !("mobileEndpointTrajectory" in addressedEntry.definition) &&
                !("trajectory" in (addressedEntry.resolvedInputs.context ?? {})),
              "Scenario seam must not absorb mobile trajectory ownership."
            );

            const endpointSeed =
              addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds
                ?.resolvedEndpointSeed;
            const infrastructureSeed =
              addressedEntry.resolvedInputs.resolvedFirstIntakeOverlaySeeds
                ?.resolvedInfrastructureSeed;

            assert(
              endpointSeed &&
                infrastructureSeed &&
                !("trajectory" in endpointSeed) &&
                !("mobileEndpointTrajectory" in endpointSeed) &&
                !("trajectory" in infrastructureSeed) &&
                !("mobileEndpointTrajectory" in infrastructureSeed),
              "Overlay seed resolution must not absorb mobile trajectory ownership."
            );

            assert(
              !("trajectory" in physicalState) &&
                !("mobileEndpointTrajectory" in physicalState) &&
                !("trajectory" in physicalState.physicalInput) &&
                JSON.stringify(
                  physicalState.physicalInput.provenance.map((entry) => entry.family)
                ) ===
                  JSON.stringify([
                    "antenna",
                    "rain-attenuation",
                    "itu-style"
                  ]),
              "Physical-input seam must remain unchanged and trajectory-free."
            );

            assert(
              handoverState.snapshot.policyId ===
                "first-intake-unsupported-noop-v1" &&
                handoverState.snapshot.decisionModel ===
                  "service-layer-switching" &&
                handoverState.snapshot.isNativeRfHandover === false &&
                handoverState.snapshot.candidates.length === 0 &&
                handoverState.result.decisionKind === "unavailable" &&
                handoverState.result.semanticsBridge.truthState === "unavailable",
              "First-intake handover runtime must stay unchanged."
            );

            assert(
              overlayState.expressionState === "active-addressed-case" &&
                overlayState.endpointExpressionMode === "runtime-local-panel" &&
                overlayState.infrastructureExpressionMode ===
                  "globe-pool-markers" &&
                overlayState.gatewayPoolSemantics === "eligible-gateway-pool" &&
                overlayState.activeGatewayClaim === "not-claimed",
              "M4 overlay expression must stay unchanged."
            );

            return {
              captureProofSeam: Boolean(
                capture.firstIntakeMobileEndpointTrajectory
              ),
              scenarioId: trajectoryState.scenarioId,
              recordId: trajectoryState.trajectory.trajectory.recordId,
              waypointCount: trajectoryState.trajectory.trajectory.waypointCount,
              sourceLineage: trajectoryState.sourceLineage,
              documentTelemetry: {
                state: rootData.firstIntakeMobileTrajectoryState ?? null,
                proofSeam: rootData.firstIntakeMobileTrajectoryProofSeam ?? null
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
              capture.firstIntakeMobileEndpointTrajectory === undefined,
              "Default bootstrap route must not adopt the M6 mobile-endpoint trajectory seam."
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
              rootData.firstIntakeMobileTrajectoryState === undefined &&
                rootData.firstIntakeMobileTrajectoryProofSeam === undefined,
              "Default bootstrap route must not publish M6 mobile trajectory telemetry."
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
