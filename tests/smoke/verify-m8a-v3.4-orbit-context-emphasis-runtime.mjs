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
const REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}&firstIntakeAutoplay=1`;
const ORBIT_CONTEXT_LAYER_ID =
  "first-intake-overlay-expression-display-context-orbit-altitude-layer";
const OVERLAY_DATA_SOURCE_NAME = "first-intake-overlay-expression";
const NEARBY_DATA_SOURCE_NAME = "first-intake-nearby-second-endpoint-expression";
const EXPECTED_NEARBY_ENTITY_IDS = [
  "first-intake-current-mobile-endpoint-cue",
  "first-intake-fixed-nearby-second-endpoint",
  "first-intake-nearby-endpoint-relation-cue"
];
const FORBIDDEN_ORBIT_CONTEXT_LABEL_WORDS = [
  "oneweb",
  "intelsat",
  "norad",
  "tle",
  "walker",
  "satellite",
  "sat-",
  "oneweb-",
  "intelsat-",
  "0042"
];
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
        `M8A-V3.4 orbit context validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V3.4 orbit context validation did not reach a ready viewer: ${JSON.stringify(
      lastState
    )}`
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
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          deviceScaleFactor: 1,
          mobile: false
        });
        await client.send("Page.navigate", {
          url: `${baseUrl}${REQUEST_PATH}`
        });
        await waitForBootstrapReady(client);

        const result = await evaluateRuntimeValue(
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
            const toPlainPoint = (point) =>
              point ? { x: point.x, y: point.y } : null;
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
              for (let index = 0; index < layer.length; index += 1) {
                const child = layer.get(index);

                if (child?.[propertyName] === true) {
                  return child;
                }
              }

              return null;
            };
            const collectTaggedChildren = (layer, propertyName) => {
              const children = [];

              for (let index = 0; index < layer.length; index += 1) {
                const child = layer.get(index);

                if (child?.[propertyName] === true) {
                  children.push(child);
                }
              }

              return children;
            };
            const collectLabels = (labelCollection, scene) => {
              const labels = [];

              for (let index = 0; index < labelCollection.length; index += 1) {
                const label = labelCollection.get(index);

                labels.push({
                  text: label.text,
                  id: label.id,
                  screen: toPlainPoint(label.computeScreenSpacePosition(scene))
                });
              }

              return labels;
            };
            const summarizePolylines = (polylineCollection, scene) => {
              return polylineCollection.map((polyline) => {
                const summary =
                  polyline.__firstIntakeOverlayOrbitContextPolylineSummary;
                const visibleSamples = summary.positions
                  .map((position) =>
                    toPlainPoint(scene.cartesianToCanvasCoordinates(position))
                  )
                  .filter(pointInsideViewport);

                return {
                  id: summary.id,
                  width: summary.width,
                  positionCount: summary.positions.length,
                  visibleSampleCount: visibleSamples.length,
                  firstVisibleSample: visibleSamples[0] ?? null
                };
              });
            };
            const resolveEntityCanvasPoint = (dataSource, entityId, viewer) => {
              const entity = dataSource.entities.getById(entityId);
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
            const insideRect = (point, rect) => {
              return (
                point &&
                point.x >= rect.left &&
                point.x <= rect.right &&
                point.y >= rect.top &&
                point.y <= rect.bottom
              );
            };

            let capture = null;
            let layer = null;

            for (let attempt = 0; attempt < 120; attempt += 1) {
              capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              layer = capture?.viewer
                ? findOrbitLayer(capture.viewer.scene.primitives)
                : null;

              if (
                capture?.firstIntakeOverlayExpression &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                capture?.firstIntakeCinematicCameraPreset?.getState?.()
                  ?.activation?.active === true &&
                layer
              ) {
                break;
              }

              await sleep(50);
            }

            await sleep(180);

            capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeOverlayExpression,
              "M8A-V3.4 orbit context must be owned by overlay-expression."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "M8A-V3.4 orbit context validation requires nearby expression to remain bounded."
            );

            const viewer = capture.viewer;
            layer = findOrbitLayer(viewer.scene.primitives);
            const metadata = layer?.__firstIntakeOverlayOrbitContext ?? null;
            const labels = findTaggedChild(
              layer,
              "__firstIntakeOverlayOrbitContextLabels"
            );
            const polylines = collectTaggedChildren(
              layer,
              "__firstIntakeOverlayOrbitContextPolyline"
            );
            const points = findTaggedChild(
              layer,
              "__firstIntakeOverlayOrbitContextPoints"
            );
            const overlayState = capture.firstIntakeOverlayExpression.getState();
            const nearbyState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const overlayDataSource = viewer.dataSources.getByName(
              "${OVERLAY_DATA_SOURCE_NAME}"
            )[0];
            const nearbyDataSource = viewer.dataSources.getByName(
              "${NEARBY_DATA_SOURCE_NAME}"
            )[0];
            const nearbyEntityIds =
              nearbyDataSource?.entities?.values?.map((entity) => entity.id) ??
              [];
            const labelSummaries = collectLabels(labels, viewer.scene);
            const polylineSummaries = summarizePolylines(polylines, viewer.scene);
            const leoLabel = labelSummaries.find(
              (label) => label.text === "LEO context"
            );
            const geoLabel = labelSummaries.find(
              (label) => label.text === "GEO continuity"
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
            const handoverZone = {
              left: Math.min(mobileCue.x, fixedEndpoint.x, relationCue.x) - 90,
              right: Math.max(mobileCue.x, fixedEndpoint.x, relationCue.x) + 90,
              top: Math.min(mobileCue.y, fixedEndpoint.y, relationCue.y) - 90,
              bottom: Math.max(mobileCue.y, fixedEndpoint.y, relationCue.y) + 90
            };
            const forbiddenLabelHits = labelSummaries.flatMap((label) => {
              const text = label.text.toLowerCase();

              return ${JSON.stringify(FORBIDDEN_ORBIT_CONTEXT_LABEL_WORDS)}
                .filter((word) => text.includes(word))
                .map((word) => ({ text: label.text, word }));
            });
            const truthClaimValues = metadata
              ? Object.values(metadata.truthClaims)
              : [];
            const documentTelemetry = {
              owner:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextLayerOwner ?? null,
              layerKind:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextLayerKind ?? null,
              boundary:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextBoundary ?? null,
              bandCount:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextBandCount ?? null,
              labels:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextLabels ?? null,
              altitudes:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextAltitudesMeters ?? null,
              truthClaims:
                document.documentElement.dataset
                  .firstIntakeOverlayOrbitContextTruthClaims ?? null
            };

            assert(
              metadata?.layerId === "${ORBIT_CONTEXT_LAYER_ID}" &&
                metadata.owner === "first-intake-overlay-expression-controller" &&
                metadata.layerKind === "display-context-altitude-band" &&
                metadata.displayContextBoundary ===
                  "representative-altitude-band-not-satellite-actor",
              "Orbit-class altitude emphasis must mount from overlay-expression as display-context, not endpoint semantics: " +
                JSON.stringify(metadata)
            );
            assert(
              metadata.bandCount === 2 &&
                JSON.stringify(metadata.altitudeMeters) ===
                  JSON.stringify([1200000, 35786000]) &&
                JSON.stringify(metadata.labelTexts) ===
                  JSON.stringify([
                    "LEO context",
                    "display-context",
                    "GEO continuity",
                    "display-context"
                  ]),
              "Orbit context metadata must expose only LEO/GEO display-context altitude bands."
            );
            assert(
              truthClaimValues.length === 8 &&
                truthClaimValues.every((value) => value === "not-claimed"),
              "Orbit context metadata must keep all V3.4 truth claims explicitly unpromoted: " +
                JSON.stringify(metadata.truthClaims)
            );
            assert(
              labels?.length === 4 &&
                polylines.length === 2 &&
                points?.length === 1,
              "Orbit context layer must be Cesium primitive geometry with compact labels and a distinct GEO continuity marker."
            );
            assert(
              polylineSummaries.every(
                (polyline) =>
                  polyline.positionCount >= 30 &&
                  polyline.visibleSampleCount >= 6
              ),
              "LEO/GEO altitude bands must have visible primitive samples in close view: " +
                JSON.stringify(polylineSummaries)
            );
            assert(
              leoLabel &&
                geoLabel &&
                pointInsideViewport(leoLabel.screen) &&
                pointInsideViewport(geoLabel.screen) &&
                geoLabel.screen.y < leoLabel.screen.y &&
                leoLabel.screen.y < window.innerHeight * 0.55 &&
                geoLabel.screen.y < window.innerHeight * 0.45,
              "LEO/GEO labels must be visible in close view with altitude separation: " +
                JSON.stringify({ leoLabel, geoLabel })
            );
            assert(
              ![leoLabel.screen, geoLabel.screen].some((point) =>
                insideRect(point, handoverZone)
              ),
              "Orbit context labels must not cover the active endpoint handover zone: " +
                JSON.stringify({ leoLabel, geoLabel, handoverZone })
            );
            assert(
              forbiddenLabelHits.length === 0,
              "Orbit context labels must not promote specific actors, TLEs, NORAD IDs, or walker-derived satellite wording: " +
                JSON.stringify(forbiddenLabelHits)
            );
            assert(
              overlayDataSource?.entities?.values?.length === 6 &&
                overlayState.infrastructureExpressionMode ===
                  "globe-pool-markers",
              "Overlay-expression must keep its existing gateway-pool data source semantics while owning the display-context primitive layer."
            );
            assert(
              JSON.stringify(nearbyEntityIds) ===
                JSON.stringify(${JSON.stringify(EXPECTED_NEARBY_ENTITY_IDS)}) &&
                JSON.stringify(nearbyState.entityIds) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_NEARBY_ENTITY_IDS)}) &&
                !nearbyEntityIds.some((id) =>
                  /leo|geo|orbit|altitude|sat/i.test(id)
                ),
              "Nearby-second-endpoint expression must not gain orbit-class or altitude-band ownership."
            );
            assert(
              nearbyState.relationCue.satellitePathTruth === "not-claimed" &&
                nearbyState.relationCue.activeGatewayTruth === "not-claimed" &&
                nearbyState.relationCue.geoTeleportTruth === "not-claimed" &&
                nearbyState.relationCue.rfBeamTruth === "not-claimed",
              "Endpoint relation cue must remain bounded and must not absorb orbit-context truth."
            );
            assert(
              documentTelemetry.owner === metadata.owner &&
                documentTelemetry.layerKind === metadata.layerKind &&
                documentTelemetry.boundary === metadata.displayContextBoundary &&
                documentTelemetry.bandCount === String(metadata.bandCount) &&
                documentTelemetry.labels ===
                  JSON.stringify(metadata.labelTexts) &&
                documentTelemetry.altitudes ===
                  JSON.stringify(metadata.altitudeMeters) &&
                documentTelemetry.truthClaims ===
                  JSON.stringify(metadata.truthClaims),
              "Document telemetry must expose the orbit context display-boundary without changing controller interfaces."
            );

            return {
              metadata,
              labelSummaries,
              polylineSummaries,
              pointCount: points.length,
              nearbyEntityIds,
              handoverZone,
              documentTelemetry
            };
          })()`,
          { awaitPromise: true }
        );

        console.log(JSON.stringify(result, null, 2));
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
