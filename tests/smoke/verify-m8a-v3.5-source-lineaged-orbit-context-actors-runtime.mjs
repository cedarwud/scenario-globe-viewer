import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

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
const DEFAULT_REQUEST_PATH = "/";
const EXPECTED_DATA_SOURCE_NAME =
  "first-intake-source-lineaged-orbit-context-actors";
const EXPECTED_PROJECTION_ID =
  "m8a-v3.5-oneweb-intelsat-source-lineaged-orbit-context-v1";
const EXPECTED_DISPLAY_PROJECTION_MODE =
  "tle-source-derived-addressed-scene-display-projection";
const EXPECTED_SOURCE_POSITION_BOUNDARY =
  "sourceOrbitPositionEcefMeters = TLE-derived source position";
const EXPECTED_RENDER_POSITION_BOUNDARY =
  "renderPositionEcefMeters = close-view display projection";
const SCREENSHOT_PATH =
  "output/m8a-v3.5-slice3-scene-composition-addressed.png";
const EXPECTED_ACTOR_IDS = [
  "oneweb-0386-leo-display-context",
  "intelsat-905-geo-display-context"
];
const EXPECTED_STATE_KEYS = [
  "geo-context",
  "dual-orbit",
  "switch-window",
  "leo-context"
];
const FORBIDDEN_VISIBLE_WORDS = [
  "SERVING",
  "PENDING",
  "handover target",
  "active gateway",
  "RF beam"
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
        `M8A-V3.5 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V3.5 validation did not reach a ready viewer: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
}

async function captureScreenshot(client, filePath) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, Buffer.from(result.data, "base64"));
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
            const parseMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);
              assert(Number.isFinite(parsed), "Timestamp must parse.");
              return parsed;
            };
            const distance3 = (left, right) => {
              return Math.hypot(
                left.x - right.x,
                left.y - right.y,
                left.z - right.z
              );
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
            const rectContainsPoint = (rect, point) => {
              return Boolean(
                rect &&
                  point &&
                  point.x >= rect.left &&
                  point.x <= rect.right &&
                  point.y >= rect.top &&
                  point.y <= rect.bottom
              );
            };
            const resolveEntityCanvasPoint = (dataSource, entityId) => {
              const entity = dataSource?.entities?.getById(entityId);
              const position = entity?.position?.getValue(
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.clock.currentTime
              );

              return toPlainPoint(
                position
                  ? window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.viewer.scene
                    .cartesianToCanvasCoordinates(position)
                  : null
              );
            };
            const seekToRatio = async (ratio) => {
              const replayState =
                window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.replayClock.getState();
              const startMs = parseMs(replayState.startTime);
              const stopMs = parseMs(replayState.stopTime);
              window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.replayClock.seek(
                new Date(startMs + (stopMs - startMs) * ratio).toISOString()
              );
              await sleep(100);
              return window.__SCENARIO_GLOBE_VIEWER_CAPTURE__
                .firstIntakeOrbitContextActors.getState();
            };

            for (let attempt = 0; attempt < 140; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const actorState =
                capture?.firstIntakeOrbitContextActors?.getState?.() ?? null;
              const dataSource = actorState
                ? capture.viewer.dataSources.getByName(actorState.dataSourceName)[0]
                : null;

              if (
                actorState?.dataSourceAttached === true &&
                dataSource?.entities?.values?.length >= 3
              ) {
                break;
              }

              await sleep(50);
            }

            await sleep(350);

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeOrbitContextActors,
              "M8A-V3.5 must expose the source-lineaged orbit context actor seam on the addressed route."
            );
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "M8A-V3.5 actors must stay on the shared replay authority."
            );

            const controller = capture.firstIntakeOrbitContextActors;
            const initialState = controller.getState();
            const dataSource = capture.viewer.dataSources.getByName(
              "${EXPECTED_DATA_SOURCE_NAME}"
            )[0];
            const actorEntities = ${JSON.stringify(EXPECTED_ACTOR_IDS)}.map(
              (actorId) => dataSource?.entities?.getById(actorId)
            );
            const relationEntity = dataSource?.entities?.getById(
              "first-intake-orbit-context-service-layer-relation-cue"
            );
            const modelUris = actorEntities.map((entity) =>
              entity?.model?.uri?.getValue(capture.viewer.clock.currentTime)
            );
            const actorScreenPoints = actorEntities.map((entity) => {
              const position = entity?.position?.getValue(capture.viewer.clock.currentTime);
              return toPlainPoint(
                position
                  ? capture.viewer.scene.cartesianToCanvasCoordinates(position)
                  : null
              );
            });
            const stageStrip = document.querySelector(
              "[data-m8a-v35-orbit-context-stage-strip='true']"
            );
            const stageRect = rectToPlain(stageStrip);
            const stageStripText = stageStrip?.innerText ?? "";
            const timelineRect = rectToPlain(
              document.querySelector(".cesium-viewer-timelineContainer")
            );
            const nearbyExpressionState =
              capture.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
              null;
            const nearbyDataSource = nearbyExpressionState
              ? capture.viewer.dataSources.getByName(
                nearbyExpressionState.dataSourceName
              )[0]
              : null;
            const endpointScreenPoints = [
              resolveEntityCanvasPoint(
                nearbyDataSource,
                "first-intake-current-mobile-endpoint-cue"
              ),
              resolveEntityCanvasPoint(
                nearbyDataSource,
                "first-intake-fixed-nearby-second-endpoint"
              )
            ];
            const visibleText = document.body.innerText;
            const forbiddenHits = ${JSON.stringify(FORBIDDEN_VISIBLE_WORDS)}
              .filter((word) => visibleText.includes(word));

            assert(
              initialState.projectionId === "${EXPECTED_PROJECTION_ID}" &&
                initialState.projectionSourceAuthority ===
                  "viewer-owned-projected-display-module" &&
                initialState.sourceLineage.displayProjectionRead ===
                  "${EXPECTED_DISPLAY_PROJECTION_MODE}" &&
                initialState.displayProjectionBoundary.sourcePosition ===
                  "${EXPECTED_SOURCE_POSITION_BOUNDARY}" &&
                initialState.displayProjectionBoundary.renderPosition ===
                  "${EXPECTED_RENDER_POSITION_BOUNDARY}" &&
                initialState.displayProjectionBoundary.renderPositionHistoricalTruth ===
                  "not-claimed" &&
                initialState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "Actor controller must consume the viewer-owned projection module only: " +
                JSON.stringify({
                  sourceLineage: initialState.sourceLineage,
                  boundary: initialState.displayProjectionBoundary
                })
            );
            assert(
              dataSource &&
                initialState.dataSourceName === "${EXPECTED_DATA_SOURCE_NAME}" &&
                initialState.actorCount === 2 &&
                JSON.stringify(initialState.actors.map((actor) => actor.actorId)) ===
                  JSON.stringify(${JSON.stringify(EXPECTED_ACTOR_IDS)}),
              "M8A-V3.5 must render exactly the first OneWeb LEO + Intelsat GEO actor pair."
            );
            assert(
              modelUris.every(
                (uri) =>
                  typeof uri === "string" &&
                  uri.includes("assets/models/generic-satellite.glb") &&
                  !uri.includes("starlink.glb") &&
                  !uri.includes("sat.glb")
              ),
              "Actors must use the copied generic satellite mesh and avoid Starlink/demo meshes: " +
                JSON.stringify(modelUris)
            );
            assert(
              initialState.modelAsset.title === "Simple Satellite Low Poly Free" &&
                initialState.modelAsset.author === "DjalalxJay" &&
                initialState.modelAsset.license === "CC-BY-4.0" &&
                initialState.modelAsset.modelTruth === "generic-satellite-mesh" &&
                initialState.modelAsset.nonClaim.includes("not OneWeb or Intelsat"),
              "Generic model attribution/non-claim metadata must stay attached."
            );

            const leoActor = initialState.actors.find(
              (actor) => actor.orbitClass === "leo"
            );
            const geoActor = initialState.actors.find(
              (actor) => actor.orbitClass === "geo"
            );
            const allActorsValid = initialState.actors.every((actor) => {
              return (
                actor.evidenceClass === "display-context" &&
                actor.sourceLineage.sourceProvider === "CelesTrak" &&
                actor.sourceLineage.sourceProduct === "NORAD GP TLE" &&
                actor.sourceLineage.sourceUrl.startsWith("https://celestrak.org/") &&
                actor.sourceEpochUtc.startsWith("2026-04-24T") &&
                actor.projectionEpochUtc === "2026-04-25T07:23:27.000Z" &&
                actor.freshnessClass ===
                  "source-epoch-offset-from-replay-marked-display-context" &&
                actor.modelTruth === "generic-satellite-mesh" &&
                actor.renderProjection ===
                  "${EXPECTED_DISPLAY_PROJECTION_MODE}" &&
                actor.sourceOrbitPositionEcefMeters &&
                actor.renderPositionEcefMeters &&
                Object.values(actor.nonClaims).every((value) => value === false)
              );
            });

            assert(
              leoActor?.displayRole === "leo-context-actor" &&
                leoActor?.operatorContext === "OneWeb" &&
                leoActor?.motionMode === "replay-driven" &&
                leoActor?.positionPrecision === "tle-propagated-display-context",
              "OneWeb actor must stay a replay-driven display-context LEO actor: " +
                JSON.stringify(leoActor)
            );
            assert(
              geoActor?.displayRole === "geo-context-anchor" &&
                geoActor?.operatorContext === "Intelsat" &&
                geoActor?.motionMode === "fixed-earth-relative" &&
                geoActor?.positionPrecision ===
                  "tle-fixed-earth-relative-display-context",
              "Intelsat actor must stay a fixed/near-fixed display-context GEO anchor: " +
                JSON.stringify(geoActor)
            );
            assert(
              allActorsValid,
              "Every visible orbit actor must carry source lineage, epoch/freshness, precision, evidence class, and machine-readable non-claims: " +
                JSON.stringify(initialState.actors)
            );
            assert(
              initialState.relationCue.cueKind ===
                "presentation-only-service-layer-context-ribbon" &&
                initialState.relationCue.satellitePathTruth === "not-claimed" &&
                initialState.relationCue.rfBeamTruth === "not-claimed" &&
                initialState.relationCue.activeGatewayTruth === "not-claimed" &&
                initialState.relationCue.geoTeleportTruth === "not-claimed" &&
                relationEntity?.polyline,
              "Relation cue must be presentation-only and must not become RF/gateway/teleport truth."
            );
            assert(
              initialState.metricCue.cueKind === "bounded-proxy-classification" &&
                initialState.metricCue.projectionMode ===
                  "bounded-proxy-classification" &&
                initialState.metricCue.latencyClass === "leo-lower" &&
                initialState.metricCue.jitterClass === "leo-lower" &&
                initialState.metricCue.speedClass === "leo-higher" &&
                Object.values(initialState.metricCue.nonClaims).every(
                  (value) => value === false
                ),
              "Metric cue must stay bounded-class-only and outside measurement truth: " +
                JSON.stringify(initialState.metricCue)
            );
            assert(
              stageStrip instanceof HTMLElement &&
                stageRect &&
                stageRect.height <= 96 &&
                stageRect.top > window.innerHeight * 0.58 &&
                (!timelineRect || stageRect.bottom < timelineRect.top) &&
                stageStrip.dataset.rawPackageSideReadOwnership === "forbidden" &&
                stageStrip.dataset.sourcePositionBoundary ===
                  "${EXPECTED_SOURCE_POSITION_BOUNDARY}" &&
                stageStrip.dataset.renderPositionBoundary ===
                  "${EXPECTED_RENDER_POSITION_BOUNDARY}" &&
                stageStrip.dataset.renderPositionHistoricalTruth ===
                  "not-claimed" &&
                stageStripText.includes("TLE source position") &&
                stageStripText.includes("close-view display projection") &&
                stageStripText.includes("historical location not claimed") &&
                endpointScreenPoints.every(
                  (point) => pointInsideViewport(point) &&
                    !rectContainsPoint(stageRect, point)
                ) &&
                !actorScreenPoints.some((point) => rectContainsPoint(stageRect, point)),
              "Stage strip must be compact and non-blocking: " +
                JSON.stringify({
                  stageRect,
                  timelineRect,
                  actorScreenPoints,
                  endpointScreenPoints,
                  stageStripDataset: stageStrip?.dataset
                })
            );
            assert(
              !relationEntity?.label,
              "The orbit-context relation cue must stay visual-only to reduce label clutter."
            );
            assert(
              actorScreenPoints.every(pointInsideViewport),
              "LEO/GEO actor positions must project into the addressed viewport: " +
                JSON.stringify(actorScreenPoints)
            );
            assert(
              forbiddenHits.length === 0,
              "Visible labels must avoid active serving/pending/gateway/RF wording: " +
                JSON.stringify(forbiddenHits)
            );

            const handoverState = capture.firstIntakeHandoverDecision.getState();
            assert(
              handoverState.snapshot.candidates.length === 0 &&
                handoverState.snapshot.isNativeRfHandover === false &&
                !handoverState.result.servingCandidateId,
              "M8A-V3.5 must not widen handover-decision into active serving truth: " +
                JSON.stringify(handoverState)
            );

            const beforeMotionState = controller.getState();
            await sleep(650);
            const afterMotionState = controller.getState();
            const beforeLeo = beforeMotionState.actors.find(
              (actor) => actor.orbitClass === "leo"
            ).currentPositionEcefMeters;
            const afterLeo = afterMotionState.actors.find(
              (actor) => actor.orbitClass === "leo"
            ).currentPositionEcefMeters;
            const beforeGeo = beforeMotionState.actors.find(
              (actor) => actor.orbitClass === "geo"
            ).currentPositionEcefMeters;
            const afterGeo = afterMotionState.actors.find(
              (actor) => actor.orbitClass === "geo"
            ).currentPositionEcefMeters;
            const leoMotionMeters = distance3(beforeLeo, afterLeo);
            const geoMotionMeters = distance3(beforeGeo, afterGeo);

            assert(
              leoMotionMeters > 100000 &&
                geoMotionMeters < 1,
              "Early replay motion must move LEO while keeping GEO fixed-earth-relative: " +
                JSON.stringify({ leoMotionMeters, geoMotionMeters })
            );

            const stageResults = [];
            for (const [ratio, expectedKey] of [
              [0.1, "geo-context"],
              [0.32, "dual-orbit"],
              [0.58, "switch-window"],
              [0.84, "leo-context"]
            ]) {
              const state = await seekToRatio(ratio);
              const activeChip = document.querySelector(
                "[data-m8a-v35-orbit-context-stage-strip='true'] [data-active='true']"
              );
              const leoEmphasis = state.actorEmphasis.find(
                (entry) => entry.orbitClass === "leo"
              );
              const geoEmphasis = state.actorEmphasis.find(
                (entry) => entry.orbitClass === "geo"
              );

              assert(
                state.presentationState.stateKey === expectedKey &&
                  activeChip?.dataset.stageKey === expectedKey,
                "Presentation stage strip must follow replay-ratio seeks: " +
                  JSON.stringify({ ratio, expectedKey, state: state.presentationState })
              );
              assert(
                state.presentationState.stateSource ===
                  "repo-owned-bounded-presentation-model" &&
                  state.presentationState.replayWindowSource ===
                    "firstIntakeReplayTimeAuthority.replayClock",
                "Presentation state must stay separate from handover-decision and bound to shared replay."
              );
              assert(
                state.metricCue.summaryLabel.length > 0 &&
                  state.overlayCue.visible === true &&
                  state.relationCue.widthPixels > 0,
                "Presentation state must drive overlay, relation, and metric cues."
              );

              stageResults.push({
                ratio,
                expectedKey,
                stateKey: state.presentationState.stateKey,
                leoEmphasis: leoEmphasis?.emphasis,
                geoEmphasis: geoEmphasis?.emphasis,
                metricCue: state.metricCue.summaryLabel,
                relationWidth: state.relationCue.widthPixels
              });
            }

            return {
              projectionId: initialState.projectionId,
              actors: initialState.actors.map((actor) => ({
                actorId: actor.actorId,
                label: actor.label,
                sourceEpochUtc: actor.sourceEpochUtc,
                freshnessClass: actor.freshnessClass,
                positionPrecision: actor.positionPrecision,
                evidenceClass: actor.evidenceClass,
                motionMode: actor.motionMode,
                sourceUrl: actor.sourceLineage.sourceUrl
              })),
              modelUris,
              actorScreenPoints,
              endpointScreenPoints,
              stageRect,
              leoMotionMeters,
              geoMotionMeters,
              stageResults,
              defaultForbiddenWords: forbiddenHits
            };
          })()`,
          { awaitPromise: true }
        );

        await captureScreenshot(
          client,
          path.resolve(SCREENSHOT_PATH)
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
            const root = document.documentElement;
            const stageStrip = document.querySelector(
              "[data-m8a-v35-orbit-context-stage-strip='true']"
            );

            assert(
              capture && !capture.firstIntakeOrbitContextActors,
              "Default route must not publish promoted satellite actor state."
            );
            assert(
              !root.dataset.firstIntakeOrbitContextActorState &&
                !root.dataset.firstIntakeOrbitContextActorProjectionId &&
                !stageStrip,
              "Default route must not leave orbit actor telemetry or stage strip mounted."
            );

            return {
              hasCapture: Boolean(capture),
              hasOrbitActorController: Boolean(capture?.firstIntakeOrbitContextActors),
              actorTelemetry: root.dataset.firstIntakeOrbitContextActorState ?? null,
              stageStripPresent: Boolean(stageStrip)
            };
          })()`
        );

        console.log(
          JSON.stringify(
            {
              addressedResult,
              defaultRouteResult,
              screenshot: SCREENSHOT_PATH
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
