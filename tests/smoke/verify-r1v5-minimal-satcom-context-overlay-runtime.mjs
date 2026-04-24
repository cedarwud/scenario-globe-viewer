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
const CAMERA_PRESET_KEY = "endpoint-relation-cinematic";
const DATA_SOURCE_NAME = "first-intake-nearby-second-endpoint-expression";
const CURRENT_MOBILE_CUE_ENTITY_ID = "first-intake-current-mobile-endpoint-cue";
const FIXED_ENDPOINT_ENTITY_ID = "first-intake-fixed-nearby-second-endpoint";
const RELATION_CUE_ENTITY_ID = "first-intake-nearby-endpoint-relation-cue";
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const EXPECTED_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeSatcomContextOverlay";
const R1V1_SUPPRESSION_REASON =
  "r1v1-default-floating-panel-suppression";
const ALLOWED_FACTS = [
  "OneWeb LEO + Intelsat GEO aviation",
  "service-layer switching",
  "not native RF handover",
  "presentation-only replay",
  "YKA fixed endpoint",
  "facility-known",
  "historical corridor, not live measurement",
  "relation cue is a scene aid, not a satellite path"
];
const REQUIRED_NON_CLAIMS = [
  "not measurement truth",
  "not active gateway assignment",
  "not pair-specific GEO teleport truth",
  "not RF beam truth",
  "not active onboard service proof for the replayed flight",
  "not native RF handover truth"
];
const SUPPRESSED_PANEL_SELECTORS = [
  "[data-first-intake-overlay-expression='true']",
  "[data-first-intake-active-case-narrative='true']",
  "[data-first-intake-nearby-second-endpoint-info='true']"
];

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
        `R1V.5 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `R1V.5 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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
            const rectToPlain = (rect) => ({
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            });
            const rectsOverlap = (left, right) => {
              if (!left || !right || left.width <= 0 || right.width <= 0) {
                return false;
              }

              return !(
                left.right <= right.left ||
                left.left >= right.right ||
                left.bottom <= right.top ||
                left.top >= right.bottom
              );
            };
            const pointInsideRect = (point, rect) => {
              return (
                point &&
                point.x >= rect.left &&
                point.x <= rect.right &&
                point.y >= rect.top &&
                point.y <= rect.bottom
              );
            };
            const sameStringSet = (actual, expected) => {
              return (
                Array.isArray(actual) &&
                actual.length === expected.length &&
                actual.every((value) => expected.includes(value))
              );
            };
            const readCueCanvasPoints = () => {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const viewer = capture.viewer;
              const currentTime = viewer.clock.currentTime;
              const dataSource =
                viewer.dataSources.getByName("${DATA_SOURCE_NAME}")[0] ?? null;
              const currentMobileEntity =
                dataSource?.entities?.getById?.("${CURRENT_MOBILE_CUE_ENTITY_ID}") ??
                null;
              const fixedEndpointEntity =
                dataSource?.entities?.getById?.("${FIXED_ENDPOINT_ENTITY_ID}") ??
                null;
              const relationCueEntity =
                dataSource?.entities?.getById?.("${RELATION_CUE_ENTITY_ID}") ??
                null;
              const currentMobilePosition =
                currentMobileEntity?.position?.getValue?.(currentTime) ?? null;
              const fixedEndpointPosition =
                fixedEndpointEntity?.position?.getValue?.(currentTime) ?? null;
              const relationPositions =
                relationCueEntity?.polyline?.positions?.getValue?.(currentTime) ??
                [];
              const relationMidpoint =
                relationPositions.length === 2
                  ? {
                      x: (relationPositions[0].x + relationPositions[1].x) / 2,
                      y: (relationPositions[0].y + relationPositions[1].y) / 2,
                      z: (relationPositions[0].z + relationPositions[1].z) / 2
                    }
                  : null;
              const toCanvasPoint = (cartesian) => {
                if (!cartesian) {
                  return null;
                }

                const point =
                  viewer.scene.cartesianToCanvasCoordinates(cartesian);

                return point ? { x: point.x, y: point.y } : null;
              };

              return {
                currentMobileCue: toCanvasPoint(currentMobilePosition),
                fixedEndpoint: toCanvasPoint(fixedEndpointPosition),
                relationCueStart: toCanvasPoint(relationPositions[0] ?? null),
                relationCueMidpoint: toCanvasPoint(relationMidpoint),
                relationCueEnd: toCanvasPoint(relationPositions[1] ?? null)
              };
            };
            const allowedFacts = ${JSON.stringify(ALLOWED_FACTS)};
            const requiredNonClaims = ${JSON.stringify(REQUIRED_NON_CLAIMS)};
            const suppressedPanelSelectors = ${JSON.stringify(
              SUPPRESSED_PANEL_SELECTORS
            )};

            for (let attempt = 0; attempt < 100; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const overlayState =
                capture?.firstIntakeSatcomContextOverlay?.getState?.() ?? null;
              const overlayRoot = document.querySelector(
                "[data-r1v-satcom-context-overlay='true']"
              );

              if (
                capture?.firstIntakeSatcomContextOverlay &&
                capture?.firstIntakeReplayTimeAuthority &&
                capture?.firstIntakeNearbySecondEndpointInfo &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                capture?.firstIntakeCinematicCameraPreset &&
                overlayState?.overlayState ===
                  "active-addressed-route-satcom-context" &&
                overlayRoot instanceof HTMLElement
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const overlayRoot = document.querySelector(
              "[data-r1v-satcom-context-overlay='true']"
            );
            const rootData = document.documentElement.dataset;

            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeSatcomContextOverlay,
              "Missing R1V.5 satcom context overlay seam."
            );
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "R1V.5 must keep the R1V.2 replay authority seam alive."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "R1V.5 must keep the R1V.3 expression seam alive."
            );
            assert(
              capture.firstIntakeCinematicCameraPreset,
              "R1V.5 must keep the R1V.4 cinematic affordance seam alive."
            );
            assert(
              overlayRoot instanceof HTMLElement,
              "R1V.5 overlay DOM surface must mount on the addressed route."
            );

            const overlayState =
              capture.firstIntakeSatcomContextOverlay.getState();
            const replayAuthorityState =
              capture.firstIntakeReplayTimeAuthority.getState();
            const expressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const infoState =
              capture.firstIntakeNearbySecondEndpointInfo.getState();
            const overlayRect = rectToPlain(overlayRoot.getBoundingClientRect());
            const timelineRect = rectToPlain(
              document
                .querySelector(".cesium-viewer-timelineContainer")
                ?.getBoundingClientRect?.() ?? {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0
              }
            );
            const cameraButton = document.querySelector(
              "button[data-r1v-camera-preset='${CAMERA_PRESET_KEY}']"
            );
            const cameraButtonRect = rectToPlain(
              cameraButton?.getBoundingClientRect?.() ?? {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0
              }
            );
            const overlayCenter = {
              x: overlayRect.left + overlayRect.width / 2,
              y: overlayRect.top + overlayRect.height / 2
            };
            const viewport = {
              width: window.innerWidth,
              height: window.innerHeight
            };
            const overlayText =
              overlayRoot.textContent?.replace(/\\s+/g, " ").trim() ?? "";

            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Addressed first-intake route must remain the active owner lane."
            );
            assert(
              overlayState.overlayState ===
                "active-addressed-route-satcom-context" &&
                overlayState.overlaySurface ===
                  "compact-corner-satcom-context-overlay" &&
                overlayState.proofSeam === "${EXPECTED_PROOF_SEAM}" &&
                overlayState.sourceLineage.rawPackageSideReadOwnership ===
                  "forbidden",
              "Addressed route must publish the expected R1V.5 overlay state."
            );
            assert(
              overlayState.visible === true &&
                overlayRoot.dataset.visible === "true" &&
                overlayRoot.hidden === false &&
                overlayRect.width > 0 &&
                overlayRect.height > 0 &&
                overlayRect.width <= 430 &&
                overlayRect.height <= 170,
              "R1V.5 overlay must be a compact visible surface, not a hidden or large floating panel."
            );
            assert(
              overlayState.layout.centerScreenModal === false &&
                overlayState.layout.broadDashboard === false &&
                overlayState.layout.suppressedPanelRevival === false &&
                overlayCenter.x < viewport.width * 0.42 &&
                overlayCenter.y < viewport.height * 0.32,
              "R1V.5 overlay must stay out of the center-screen modal/dashboard zone."
            );
            assert(
              !rectsOverlap(overlayRect, timelineRect) &&
                !rectsOverlap(overlayRect, cameraButtonRect) &&
                overlayState.layout.avoidsCesiumTimeline === true &&
                overlayState.layout.avoidsTopRightCinematicAffordance === true,
              "R1V.5 overlay must not overlap Cesium timeline or the top-right cinematic affordance."
            );
            capture.firstIntakeCinematicCameraPreset.activatePreset();
            await sleep(120);

            const framedCuePoints = readCueCanvasPoints();

            assert(
              Object.values(framedCuePoints).every(
                (point) => !pointInsideRect(point, overlayRect)
              ),
              "R1V.5 overlay must not overlap the moving cue, fixed YKA endpoint, or relation cue under the cinematic framing: " +
                JSON.stringify({ overlayRect, framedCuePoints })
            );
            assert(
              sameStringSet(overlayState.allowedFacts, allowedFacts) &&
                sameStringSet(overlayState.visibleFacts, [
                  "OneWeb LEO + Intelsat GEO aviation",
                  "service-layer switching",
                  "not native RF handover",
                  "presentation-only replay",
                  "YKA fixed endpoint",
                  "facility-known"
                ]) &&
                sameStringSet(overlayState.inspectableFacts, [
                  "historical corridor, not live measurement",
                  "relation cue is a scene aid, not a satellite path"
                ]) &&
                sameStringSet(overlayState.requiredNonClaims, requiredNonClaims),
              "R1V.5 overlay must expose only the allowed facts and required non-claims."
            );
            assert(
              allowedFacts.every((fact) => {
                if (fact === "YKA fixed endpoint" || fact === "facility-known") {
                  return overlayText.includes(fact);
                }

                return (
                  overlayState.visibleFacts.includes(fact) ||
                  overlayState.inspectableFacts.includes(fact)
                );
              }) &&
                requiredNonClaims.every((nonClaim) =>
                  overlayText.includes(nonClaim)
                ),
              "R1V.5 overlay visible/inspectable DOM must carry the allowed facts and required non-claims."
            );
            assert(
              infoState.firstCaseContext.caseLabel ===
                "OneWeb LEO + Intelsat GEO aviation" &&
                infoState.firstCaseContext.serviceSwitchingSemantics ===
                  "service-layer switching" &&
                infoState.endpoint.endpointLabel ===
                  "YKA Kamloops Airport Operations Office" &&
                infoState.endpoint.positionPrecision === "facility-known" &&
                expressionState.relationCue.cueKind ===
                  "presentation-only-relation-cue" &&
                expressionState.relationCue.satellitePathTruth ===
                  "not-claimed",
              "R1V.5 overlay must be backed by existing M8A.4 info and M8A.3 relation context."
            );
            assert(
              !/\\bMEO\\b/i.test(overlayText) &&
                !/active gateway (assigned|selected|serving)/i.test(
                  overlayText
                ) &&
                !/serving gateway/i.test(overlayText) &&
                !/geo teleport (assigned|selected|serving)/i.test(
                  overlayText
                ) &&
                !/measurement-truth\\s+(latency|jitter|throughput)/i.test(
                  overlayText
                ) &&
                !/endpoint-to-endpoint communication success/i.test(
                  overlayText
                ),
              "R1V.5 overlay must not introduce forbidden satcom claims."
            );
            assert(
              overlayState.replayClockBinding.timeStateSource ===
                "firstIntakeReplayTimeAuthority.getState()" &&
                overlayState.replayClockBinding.usesSharedReplayClock === true &&
                overlayState.replayClockBinding.separateTimer === false &&
                overlayState.replayClockBinding.replayClockProofSeam ===
                  replayAuthorityState.replayClockProofSeam &&
                normalizeTimestampMs(
                  overlayState.replayClockBinding.replayTimeUtc
                ) ===
                  normalizeTimestampMs(replayAuthorityState.currentTimeUtc),
              "R1V.5 overlay time-linked state must derive from the shared R1V.2 replay authority."
            );

            const replayStartMs = normalizeTimestampMs(
              replayAuthorityState.replayStartUtc
            );
            const replayStopMs = normalizeTimestampMs(
              replayAuthorityState.replayStopUtc
            );
            const targetReplayTimeMs =
              replayStartMs + Math.floor((replayStopMs - replayStartMs) / 3);

            capture.replayClock.seek(targetReplayTimeMs);
            await sleep(100);

            const shiftedOverlayState =
              capture.firstIntakeSatcomContextOverlay.getState();
            const shiftedReplayState =
              capture.firstIntakeReplayTimeAuthority.getState();

            assert(
              normalizeTimestampMs(
                shiftedOverlayState.replayClockBinding.replayTimeUtc
              ) === targetReplayTimeMs &&
                normalizeTimestampMs(shiftedReplayState.currentTimeUtc) ===
                  targetReplayTimeMs &&
                rootData.firstIntakeSatcomContextOverlayReplayTimeUtc ===
                  shiftedOverlayState.replayClockBinding.replayTimeUtc,
              "R1V.5 overlay telemetry must move with shared replay-clock seeks."
            );
            assert(
              rootData.firstIntakeSatcomContextOverlayState ===
                "active-addressed-route-satcom-context" &&
                rootData.firstIntakeSatcomContextOverlayScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                rootData.firstIntakeSatcomContextOverlayVisible === "true" &&
                rootData.firstIntakeSatcomContextOverlayUsesSharedReplayClock ===
                  "true" &&
                rootData.firstIntakeSatcomContextOverlaySuppressedPanelRevival ===
                  "false" &&
                rootData.firstIntakeSatcomContextOverlayProofSeam ===
                  "${EXPECTED_PROOF_SEAM}",
              "Document telemetry must publish the bounded R1V.5 overlay state."
            );

            const suppressedPanelStates = suppressedPanelSelectors.map(
              (selector) => {
                const panel = document.querySelector(selector);
                const rect = panel?.getBoundingClientRect?.() ?? {
                  width: -1,
                  height: -1
                };

                return {
                  selector,
                  hidden: panel?.hidden ?? false,
                  width: rect.width,
                  height: rect.height,
                  presentationState: panel?.dataset.presentationState ?? null,
                  presentationSuppression:
                    panel?.dataset.presentationSuppression ?? null
                };
              }
            );

            assert(
              suppressedPanelStates.every(
                (panel) =>
                  panel.hidden === true &&
                  panel.width === 0 &&
                  panel.height === 0 &&
                  panel.presentationState === "suppressed" &&
                  panel.presentationSuppression ===
                    "${R1V1_SUPPRESSION_REASON}"
              ),
              "R1V.5 must preserve R1V.1 suppression of the old floating panels."
            );

            return {
              overlaySurface: overlayState.overlaySurface,
              placement: overlayState.placement,
              overlayRect,
              shiftedReplayTimeUtc:
                shiftedOverlayState.replayClockBinding.replayTimeUtc,
              visibleFacts: overlayState.visibleFacts,
              requiredNonClaims: overlayState.requiredNonClaims
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
            const overlayRoot = document.querySelector(
              "[data-r1v-satcom-context-overlay='true']"
            );

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeSatcomContextOverlay === undefined,
              "Default route must not publish the R1V.5 overlay seam."
            );
            assert(
              overlayRoot === null,
              "Default route must not mount the R1V.5 overlay DOM surface."
            );
            assert(
              rootData.firstIntakeSatcomContextOverlayState === undefined &&
                rootData.firstIntakeSatcomContextOverlayProofSeam === undefined &&
                rootData.firstIntakeSatcomContextOverlayReplayTimeUtc ===
                  undefined,
              "Default route must not publish R1V.5 overlay telemetry."
            );

            return {
              addressResolution:
                capture.firstIntakeScenarioSurface?.getState?.().addressResolution ??
                null,
              overlayPublished:
                rootData.firstIntakeSatcomContextOverlayState ?? null,
              overlayMounted: Boolean(overlayRoot)
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
