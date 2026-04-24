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
        `R1V.3 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `R1V.3 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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
            const normalizeTimestampMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);

              assert(Number.isFinite(parsed), "Replay timestamp must parse.");
              return parsed;
            };
            const toLatLon = (cartesian) => {
              assert(cartesian, "Expected a Cartesian position.");
              const cartographic =
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.scene.globe.ellipsoid.cartesianToCartographic(
                  cartesian
                );

              assert(cartographic, "Expected cartographic coordinates.");

              return {
                lat: (cartographic.latitude * 180) / Math.PI,
                lon: (cartographic.longitude * 180) / Math.PI
              };
            };
            const sameCoordinate = (left, right, tolerance = 1e-6) => {
              return (
                Math.abs(left.lat - right.lat) <= tolerance &&
                Math.abs(left.lon - right.lon) <= tolerance
              );
            };
            const readEntitySnapshot = () => {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const dataSource = capture.viewer.dataSources.getByName("${DATA_SOURCE_NAME}")[0];
              const currentTime = capture.viewer.clock.currentTime;
              const currentMobileEntity =
                dataSource?.entities?.getById?.("${CURRENT_MOBILE_CUE_ENTITY_ID}") ??
                null;
              const fixedEndpointEntity =
                dataSource?.entities?.getById?.("${FIXED_ENDPOINT_ENTITY_ID}") ??
                null;
              const relationCueEntity =
                dataSource?.entities?.getById?.("${RELATION_CUE_ENTITY_ID}") ?? null;
              const relationCuePositions =
                relationCueEntity?.polyline?.positions?.getValue?.(currentTime) ?? [];

              assert(dataSource, "Missing R1V.3 expression data source.");
              assert(currentMobileEntity, "Missing current mobile cue entity.");
              assert(fixedEndpointEntity, "Missing fixed nearby endpoint entity.");
              assert(relationCueEntity, "Missing relation cue entity.");
              assert(
                Array.isArray(relationCuePositions) && relationCuePositions.length === 2,
                "Relation cue must publish exactly two endpoints."
              );

              return {
                currentMobile: toLatLon(
                  currentMobileEntity.position.getValue(currentTime)
                ),
                fixedEndpoint: toLatLon(
                  fixedEndpointEntity.position.getValue(currentTime)
                ),
                relationCueEndpoints: relationCuePositions.map((position) =>
                  toLatLon(position)
                )
              };
            };
            const findInterpolableSegment = (points) => {
              for (let index = 0; index < points.length - 1; index += 1) {
                const startTimeMs = normalizeTimestampMs(points[index].pointTimeUtc);
                const endTimeMs = normalizeTimestampMs(points[index + 1].pointTimeUtc);

                if (endTimeMs > startTimeMs) {
                  return {
                    startPoint: points[index],
                    endPoint: points[index + 1],
                    startTimeMs,
                    endTimeMs
                  };
                }
              }

              throw new Error(
                "R1V.3 requires at least one trajectory segment with increasing time."
              );
            };

            for (let attempt = 0; attempt < 100; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const expressionState =
                capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
                null;

              if (
                capture?.firstIntakeReplayTimeAuthority &&
                capture?.firstIntakeMobileEndpointTrajectory &&
                capture?.firstIntakeNearbySecondEndpoint &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                expressionState?.dataSourceAttached === true &&
                expressionState?.animation?.animationState ===
                  "replay-clock-driven-interpolation"
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "Missing R1V.2 replay authority seam required by R1V.3."
            );
            assert(
              capture.firstIntakeMobileEndpointTrajectory,
              "Missing first-intake mobile trajectory seam."
            );
            assert(
              capture.firstIntakeNearbySecondEndpoint,
              "Missing fixed nearby endpoint seam."
            );
            assert(
              capture.firstIntakeOverlayExpression,
              "Missing first-intake overlay expression seam."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "Missing R1V.3 expression seam."
            );

            const authority = capture.firstIntakeReplayTimeAuthority;
            const trajectoryState =
              capture.firstIntakeMobileEndpointTrajectory.getState();
            const nearbyState = capture.firstIntakeNearbySecondEndpoint.getState();
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const initialExpressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const rootData = document.documentElement.dataset;
            const segment = findInterpolableSegment(
              trajectoryState.trajectory.trajectory.points
            );
            const quarterTimeMs =
              segment.startTimeMs +
              Math.floor((segment.endTimeMs - segment.startTimeMs) * 0.25);
            const threeQuarterTimeMs =
              segment.startTimeMs +
              Math.floor((segment.endTimeMs - segment.startTimeMs) * 0.75);

            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Addressed first-intake route must remain the active owner lane."
            );

            assert(
              initialExpressionState.expressionState === "active-addressed-case" &&
                initialExpressionState.animation.animationState ===
                  "replay-clock-driven-interpolation" &&
                initialExpressionState.animation.mobileCueMode ===
                  "accepted-trajectory-time-interpolation" &&
                initialExpressionState.animation.relationCueMode ===
                  "moving-mobile-to-fixed-nearby-endpoint",
              "Addressed route must publish the expected R1V.3 animation state."
            );

            assert(
              rootData.firstIntakeNearbySecondEndpointExpressionAnimationState ===
                "replay-clock-driven-interpolation" &&
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationReplayTimeUtc ===
                  initialExpressionState.animation.replayTimeUtc &&
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationIsPlaying ===
                  "false",
              "Document telemetry must publish the bounded R1V.3 animation state."
            );

            capture.replayClock.seek(quarterTimeMs);
            await sleep(100);

            const quarterExpressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const quarterEntitySnapshot = readEntitySnapshot();

            assert(
              quarterExpressionState.currentMobileCue.samplingMode ===
                "accepted-trajectory-time-interpolation" &&
                quarterExpressionState.animation.segmentStartWaypointSequence ===
                  segment.startPoint.sequence &&
                quarterExpressionState.animation.segmentEndWaypointSequence ===
                  segment.endPoint.sequence &&
                quarterExpressionState.animation.interpolationRatio > 0 &&
                quarterExpressionState.animation.interpolationRatio < 1,
              "R1V.3 must resolve the current mobile cue through replay-time interpolation within a trajectory segment."
            );

            assert(
              sameCoordinate(
                quarterExpressionState.animation.currentMobileCoordinates,
                quarterEntitySnapshot.currentMobile
              ) &&
                sameCoordinate(
                  quarterExpressionState.animation.fixedEndpointCoordinates,
                  quarterEntitySnapshot.fixedEndpoint
                ) &&
                sameCoordinate(
                  quarterEntitySnapshot.currentMobile,
                  quarterEntitySnapshot.relationCueEndpoints[0]
                ) &&
                sameCoordinate(
                  quarterEntitySnapshot.fixedEndpoint,
                  quarterEntitySnapshot.relationCueEndpoints[1]
                ) &&
                sameCoordinate(
                  quarterExpressionState.animation.relationCueEndpoints.currentMobile,
                  quarterEntitySnapshot.relationCueEndpoints[0]
                ) &&
                sameCoordinate(
                  quarterExpressionState.animation.relationCueEndpoints.fixedEndpoint,
                  quarterEntitySnapshot.relationCueEndpoints[1]
                ),
              "Relation cue endpoints must update from the moving mobile cue and fixed nearby endpoint."
            );

            capture.replayClock.seek(threeQuarterTimeMs);
            await sleep(100);

            const threeQuarterExpressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const threeQuarterEntitySnapshot = readEntitySnapshot();

            assert(
              !sameCoordinate(
                quarterEntitySnapshot.currentMobile,
                threeQuarterEntitySnapshot.currentMobile
              ) &&
                !sameCoordinate(
                  quarterExpressionState.animation.currentMobileCoordinates,
                  threeQuarterExpressionState.animation.currentMobileCoordinates
                ),
              "Current mobile cue position must change as replay time advances."
            );

            assert(
              sameCoordinate(
                quarterEntitySnapshot.fixedEndpoint,
                threeQuarterEntitySnapshot.fixedEndpoint
              ) &&
                sameCoordinate(
                  quarterExpressionState.animation.fixedEndpointCoordinates,
                  threeQuarterExpressionState.animation.fixedEndpointCoordinates
                ) &&
                sameCoordinate(
                  threeQuarterEntitySnapshot.fixedEndpoint,
                  {
                    lat: nearbyState.endpoint.coordinates.lat,
                    lon: nearbyState.endpoint.coordinates.lon
                  }
                ),
              "Fixed YKA nearby second endpoint must remain fixed."
            );

            capture.replayClock.seek(quarterTimeMs);
            capture.replayClock.setMultiplier(120);
            capture.replayClock.play();
            await sleep(200);
            capture.replayClock.pause();
            const pausedExpressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const pausedEntitySnapshot = readEntitySnapshot();
            await sleep(150);
            const pausedEntitySnapshotAfterWait = readEntitySnapshot();
            const pausedReplayState = capture.replayClock.getState();

            assert(
              !sameCoordinate(
                quarterEntitySnapshot.currentMobile,
                pausedEntitySnapshot.currentMobile
              ) &&
                sameCoordinate(
                  pausedEntitySnapshot.currentMobile,
                  pausedEntitySnapshotAfterWait.currentMobile
                ) &&
                pausedReplayState.isPlaying === false &&
                pausedExpressionState.animation.replayClockPlaying === false,
              "Pausing replay must stop visible current mobile cue movement."
            );

            assert(
              nearbyState.endpoint.truthBoundary.activeGatewayAssignment ===
                "not-claimed" &&
                nearbyState.endpoint.truthBoundary.pairSpecificGeoTeleport ===
                  "not-claimed" &&
                nearbyState.endpoint.truthBoundary.measurementTruth ===
                  "not-claimed" &&
                overlayState.activeGatewayClaim === "not-claimed" &&
                quarterExpressionState.relationCue.satellitePathTruth ===
                  "not-claimed" &&
                quarterExpressionState.relationCue.activeGatewayTruth ===
                  "not-claimed" &&
                quarterExpressionState.relationCue.geoTeleportTruth ===
                  "not-claimed" &&
                quarterExpressionState.relationCue.rfBeamTruth === "not-claimed",
              "R1V.3 must preserve the existing non-claim fields."
            );

            return {
              animationState: initialExpressionState.animation.animationState,
              interpolationSegment: {
                startSequence:
                  quarterExpressionState.animation.segmentStartWaypointSequence,
                endSequence:
                  quarterExpressionState.animation.segmentEndWaypointSequence
              },
              quarterPosition: quarterEntitySnapshot.currentMobile,
              threeQuarterPosition: threeQuarterEntitySnapshot.currentMobile,
              pausedPosition: pausedEntitySnapshot.currentMobile
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

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeNearbySecondEndpointExpression === undefined,
              "Default route must not publish the R1V.3 expression seam."
            );
            assert(
              rootData.firstIntakeNearbySecondEndpointExpressionAnimationState ===
                undefined &&
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationReplayTimeUtc ===
                  undefined &&
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationIsPlaying ===
                  undefined,
              "Default route must not publish R1V animation telemetry."
            );

            return {
              addressResolution:
                capture.firstIntakeScenarioSurface?.getState?.().addressResolution ??
                null,
              animationStatePublished:
                rootData.firstIntakeNearbySecondEndpointExpressionAnimationState ??
                null
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
