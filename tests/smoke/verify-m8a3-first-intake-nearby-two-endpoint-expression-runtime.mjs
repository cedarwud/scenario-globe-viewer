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
const DATA_SOURCE_NAME = "first-intake-nearby-second-endpoint-expression";
const CURRENT_MOBILE_CUE_ENTITY_ID = "first-intake-current-mobile-endpoint-cue";
const FIXED_ENDPOINT_ENTITY_ID = "first-intake-fixed-nearby-second-endpoint";
const RELATION_CUE_ENTITY_ID = "first-intake-nearby-endpoint-relation-cue";
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const EXPECTED_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeNearbySecondEndpointExpression";

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
        `M8A.3 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A.3 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

            let expressionState = null;

            for (let attempt = 0; attempt < 80; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              expressionState =
                capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
                null;

              if (
                capture?.firstIntakeNearbySecondEndpointExpression &&
                expressionState?.dataSourceAttached === true
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
              capture?.firstIntakeMobileEndpointTrajectory,
              "Missing mobile trajectory runtime seam."
            );
            assert(
              capture?.firstIntakeOverlayExpression,
              "Missing overlay expression runtime seam."
            );
            assert(
              capture?.firstIntakeNearbySecondEndpointExpression,
              "Missing M8A.3 nearby two-endpoint expression proof seam."
            );

            expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const scenarioSurfaceState = capture.firstIntakeScenarioSurface.getState();
            const activeScenario = capture.scenarioSession.getCurrentScenario();
            const trajectoryState =
              capture.firstIntakeMobileEndpointTrajectory.getState();
            const nearbyState = capture.firstIntakeNearbySecondEndpoint.getState();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const rootData = document.documentElement.dataset;
            const dataSource = capture.viewer.dataSources.getByName("${DATA_SOURCE_NAME}")[0];
            const entityIds = dataSource?.entities?.values?.map((entity) => entity.id) ?? [];
            const currentMobileEntity =
              dataSource?.entities?.getById?.("${CURRENT_MOBILE_CUE_ENTITY_ID}") ?? null;
            const fixedEndpointEntity =
              dataSource?.entities?.getById?.("${FIXED_ENDPOINT_ENTITY_ID}") ?? null;
            const relationCueEntity =
              dataSource?.entities?.getById?.("${RELATION_CUE_ENTITY_ID}") ?? null;
            const relationCueLabelText =
              relationCueEntity?.label?.text?.getValue?.() ?? null;
            const relationCueDescription =
              relationCueEntity?.description?.getValue?.() ?? null;
            const matchedTrajectoryPoint =
              trajectoryState.trajectory.trajectory.points.find(
                (point) =>
                  point.sequence === expressionState.currentMobileCue.waypointSequence
              ) ?? null;

            assert(
              scenarioSurfaceState.addressResolution === "matched" &&
                activeScenario?.scenarioId === "${TARGET_SCENARIO_ID}",
              "Addressed first-intake case must remain the active owner lane."
            );

            assert(
              expressionState.expressionState === "active-addressed-case" &&
                expressionState.proofSeam === "${EXPECTED_PROOF_SEAM}" &&
                expressionState.dataSourceName === "${DATA_SOURCE_NAME}" &&
                expressionState.dataSourceAttached === true,
              "M8A.3 must expose the addressed nearby two-endpoint expression proof seam and data source."
            );

            assert(
              expressionState.entityCount === 3 &&
                Array.isArray(expressionState.entityIds) &&
                expressionState.entityIds.includes("${CURRENT_MOBILE_CUE_ENTITY_ID}") &&
                expressionState.entityIds.includes("${FIXED_ENDPOINT_ENTITY_ID}") &&
                expressionState.entityIds.includes("${RELATION_CUE_ENTITY_ID}"),
              "M8A.3 must publish exactly the minimal three-element expression set."
            );

            assert(
              expressionState.currentMobileCue.endpointId ===
                trajectoryState.trajectory.endpointId &&
                expressionState.currentMobileCue.sourceSeam ===
                  trajectoryState.proofSeam &&
                expressionState.currentMobileCue.coordinateReference === "WGS84" &&
                matchedTrajectoryPoint &&
                matchedTrajectoryPoint.pointTimeUtc ===
                  expressionState.currentMobileCue.pointTimeUtc &&
                matchedTrajectoryPoint.offsetSeconds ===
                  expressionState.currentMobileCue.offsetSeconds &&
                Math.abs(
                  matchedTrajectoryPoint.lat -
                    expressionState.currentMobileCue.coordinates.lat
                ) < 1e-9 &&
                Math.abs(
                  matchedTrajectoryPoint.lon -
                    expressionState.currentMobileCue.coordinates.lon
                ) < 1e-9,
              "Current mobile cue must come only from the existing trajectory seam."
            );

            assert(
              expressionState.fixedEndpoint.endpointId ===
                nearbyState.endpoint.endpointId &&
                expressionState.fixedEndpoint.sourceSeam === nearbyState.proofSeam &&
                expressionState.fixedEndpoint.positionPrecision ===
                  nearbyState.endpoint.positionPrecision &&
                Math.abs(
                  expressionState.fixedEndpoint.coordinates.lat -
                    nearbyState.endpoint.coordinates.lat
                ) < 1e-9 &&
                Math.abs(
                  expressionState.fixedEndpoint.coordinates.lon -
                    nearbyState.endpoint.coordinates.lon
                ) < 1e-9,
              "Fixed nearby second endpoint marker must come only from the repo-owned nearby second-endpoint seam."
            );

            assert(
              expressionState.gatewayPoolSemantics ===
                overlayState.gatewayPoolSemantics &&
                expressionState.activeGatewayClaim ===
                  overlayState.activeGatewayClaim &&
                expressionState.activeGatewayClaim === "not-claimed",
              "M8A.3 must preserve the existing eligible-pool-only gateway boundary."
            );

            assert(
              expressionState.relationCue.cueKind ===
                "presentation-only-relation-cue" &&
                expressionState.relationCue.label === "Scene aid only" &&
                expressionState.relationCue.presentationBoundary ===
                  "bounded-presentation-only" &&
                expressionState.relationCue.satellitePathTruth === "not-claimed" &&
                expressionState.relationCue.activeGatewayTruth === "not-claimed" &&
                expressionState.relationCue.geoTeleportTruth === "not-claimed" &&
                expressionState.relationCue.rfBeamTruth === "not-claimed",
              "Relation cue must stay explicitly bounded to presentation-only semantics."
            );

            assert(
              expressionState.sourceLineage.nearbySecondEndpointRead ===
                "nearbySecondEndpointController.getState().endpoint" &&
                expressionState.sourceLineage.trajectoryRead ===
                  "trajectoryController.getState().trajectory.trajectory.points" &&
                expressionState.sourceLineage.overlayExpressionRead ===
                  "overlayExpressionController.getState()" &&
                expressionState.sourceLineage.replayClockRead ===
                  "replayClock.getState().currentTime" &&
                expressionState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "M8A.3 must stay on repo-owned runtime seam reads only."
            );

            assert(
              dataSource &&
                entityIds.length === 3 &&
                currentMobileEntity &&
                fixedEndpointEntity &&
                relationCueEntity,
              "M8A.3 must attach a globe-visible three-entity expression data source."
            );

            assert(
              relationCueLabelText === "Scene aid only" &&
                typeof relationCueDescription === "string" &&
                relationCueDescription.includes("Presentation-only scene aid") &&
                relationCueDescription.includes("Not claimed satellite path") &&
                relationCueDescription.includes("active gateway") &&
                relationCueDescription.includes("GEO teleport") &&
                relationCueDescription.includes("RF beam truth"),
              "Relation cue must visibly and textually stay on the presentation-only boundary."
            );

            assert(
              rootData.firstIntakeNearbySecondEndpointExpressionState ===
                "active-addressed-case" &&
                rootData.firstIntakeNearbySecondEndpointExpressionScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                rootData.firstIntakeNearbySecondEndpointExpressionCurrentMobileEndpointId ===
                  "aircraft-stack" &&
                rootData.firstIntakeNearbySecondEndpointExpressionCurrentMobileWaypointSequence ===
                  String(expressionState.currentMobileCue.waypointSequence) &&
                rootData.firstIntakeNearbySecondEndpointExpressionCurrentMobileWaypointTimeUtc ===
                  expressionState.currentMobileCue.pointTimeUtc &&
                rootData.firstIntakeNearbySecondEndpointExpressionFixedEndpointId ===
                  "endpoint-yka-operations-office" &&
                rootData.firstIntakeNearbySecondEndpointExpressionFixedEndpointPositionPrecision ===
                  "facility-known" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCueKind ===
                  "presentation-only-relation-cue" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCueLabel ===
                  "Scene aid only" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCuePresentationBoundary ===
                  "bounded-presentation-only" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCueSatellitePathTruth ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCueActiveGatewayTruth ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCueGeoTeleportTruth ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointExpressionRelationCueRfBeamTruth ===
                  "not-claimed" &&
                rootData.firstIntakeNearbySecondEndpointExpressionDataSourceAttached ===
                  "true" &&
                rootData.firstIntakeNearbySecondEndpointExpressionDataSourceName ===
                  "${DATA_SOURCE_NAME}" &&
                rootData.firstIntakeNearbySecondEndpointExpressionProofSeam ===
                  "${EXPECTED_PROOF_SEAM}",
              "Document telemetry must mirror the M8A.3 expression guardrails."
            );

            return {
              scenarioId: expressionState.scenarioId,
              entityIds,
              currentMobileCue: expressionState.currentMobileCue,
              fixedEndpoint: expressionState.fixedEndpoint,
              relationCue: expressionState.relationCue,
              documentTelemetry: {
                state:
                  rootData.firstIntakeNearbySecondEndpointExpressionState ?? null,
                proofSeam:
                  rootData.firstIntakeNearbySecondEndpointExpressionProofSeam ?? null
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
            const dataSources =
              capture?.viewer?.dataSources?.getByName?.("${DATA_SOURCE_NAME}") ?? [];

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeNearbySecondEndpointExpression === undefined,
              "Default bootstrap route must not publish the M8A.3 expression seam."
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
              dataSources.length === 0,
              "Default bootstrap route must not attach the M8A.3 expression data source."
            );
            assert(
              rootData.firstIntakeNearbySecondEndpointExpressionState ===
                undefined &&
                rootData.firstIntakeNearbySecondEndpointExpressionProofSeam ===
                  undefined,
              "Default bootstrap route must not publish M8A.3 telemetry."
            );

            return {
              addressResolution: scenarioSurfaceState?.addressResolution ?? null,
              activeScenarioId: activeScenario?.scenarioId ?? null,
              dataSourceCount: dataSources.length
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
