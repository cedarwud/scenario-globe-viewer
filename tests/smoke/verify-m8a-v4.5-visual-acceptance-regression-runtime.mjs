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

const DEFAULT_REQUEST_PATH = "/";
const V4_REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const V4_ENTRY_HREF = V4_REQUEST_PATH;
const V3_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const V4_RUNTIME_STATE = "active-v4.3-continuous-multi-orbit-handover-scene";
const EXPECTED_DATA_SOURCE_NAME =
  "m8a-v4-ground-station-multi-orbit-handover-scene";
const EXPECTED_ENDPOINT_IDS = [
  "tw-cht-multi-orbit-ground-infrastructure",
  "sg-speedcast-singapore-teleport"
];
const EXPECTED_ACTOR_IDS = [
  "oneweb-0386-leo-display-context",
  "oneweb-0537-leo-display-context",
  "oneweb-0701-leo-display-context",
  "o3b-mpower-f6-meo-display-context",
  "st-2-geo-continuity-anchor"
];
const EXPECTED_WINDOW_IDS = [
  "v4-modeled-window-01-leo-to-meo-context",
  "v4-modeled-window-02-meo-continuity-context",
  "v4-modeled-window-03-leo-candidate-aging",
  "v4-modeled-window-04-geo-fallback-continuity"
];
const REQUIRED_VISIBLE_NON_CLAIMS = [
  "no aircraft",
  "no YKA",
  "no handset UE",
  "not active satellite",
  "not active gateway",
  "no pair-specific teleport path",
  "no measured latency/jitter/throughput",
  "not native RF handover"
];
const FORBIDDEN_CLAIM_PHRASES = [
  "aircraft endpoint",
  "YKA endpoint",
  "handset UE endpoint",
  "active serving satellite",
  "active gateway assignment",
  "active gateway",
  "pair-specific teleport path truth",
  "pair-specific teleport path",
  "measured latency/jitter/throughput truth",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "native RF handover"
];
const DESKTOP_VIEWPORT = {
  width: 1440,
  height: 900
};
const NARROW_VIEWPORT = {
  width: 390,
  height: 740
};
const DESKTOP_SCREENSHOT_PATH =
  "output/m8a-v4.5-desktop-visual-acceptance.png";
const NARROW_SCREENSHOT_PATH =
  "output/m8a-v4.5-narrow-visual-regression.png";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 480
  });
}

async function waitForHomepageReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          v4RuntimeState: root?.dataset.m8aV4GroundStationRuntimeState ?? null
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global" &&
      lastState.v4RuntimeState === null
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.5 homepage validation hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V4.5 homepage did not reach ready default state: ${JSON.stringify(
      lastState
    )}`
  );
}

async function waitForV4RuntimeReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          v4RuntimeState: root?.dataset.m8aV4GroundStationRuntimeState ?? null,
          hasV4Seam: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "regional" &&
      lastState.v4RuntimeState === V4_RUNTIME_STATE &&
      lastState.hasV4Seam === true
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.5 V4 route validation hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V4.5 V4 route did not reach the ready runtime seam: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateHomepage(client, baseUrl) {
  await client.send("Page.navigate", {
    url: `${baseUrl}${DEFAULT_REQUEST_PATH}`
  });
  await waitForHomepageReady(client);
}

async function navigateV4Route(client, baseUrl) {
  await client.send("Page.navigate", {
    url: `${baseUrl}${V4_REQUEST_PATH}`
  });
  await waitForV4RuntimeReady(client);
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

        await setViewport(client, DESKTOP_VIEWPORT);
        await navigateV4Route(client, baseUrl);

        const desktopV4Result = await evaluateRuntimeValue(
          client,
          `((config) => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
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
            const collectEntityText = (dataSource) =>
              (dataSource?.entities?.values ?? [])
                .map((entity) => {
                  const description =
                    entity.description?.getValue?.() ??
                    entity.description?._value ??
                    "";
                  return [entity.id, entity.name, String(description)].join(" ");
                })
                .join(" ");
            const isNegated = (text, index) => {
              const prefix = text
                .slice(Math.max(0, index - 120), index)
                .toLowerCase();
              return /\\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\\b/.test(
                prefix
              );
            };
            const collectForbiddenClaimHits = (sources) => {
              const hits = [];

              for (const source of sources) {
                const sourceText = String(source.text ?? "");
                const lowered = sourceText.toLowerCase();

                for (const phrase of config.forbiddenClaimPhrases) {
                  const needle = phrase.toLowerCase();
                  let index = lowered.indexOf(needle);

                  while (index !== -1) {
                    if (!isNegated(sourceText, index)) {
                      hits.push({
                        source: source.label,
                        phrase,
                        context: sourceText
                          .slice(Math.max(0, index - 60), index + phrase.length + 60)
                          .replace(/\\s+/g, " ")
                          .trim()
                      });
                    }

                    index = lowered.indexOf(needle, index + needle.length);
                  }
                }
              }

              return hits;
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.m8aV4GroundStationScene,
              "V4.5 desktop route must expose the V4 runtime seam."
            );
            assert(
              !capture.firstIntakeOrbitContextActors,
              "V4.5 desktop route must not mount the historical V3.5 controller."
            );

            const controller = capture.m8aV4GroundStationScene;
            const state = controller.getState();
            const dataSource = capture.viewer.dataSources.getByName(
              config.expectedDataSourceName
            )[0];
            const endpointIds = state.endpoints.map(
              (endpoint) => endpoint.endpointId
            );
            const actorIds = state.actors.map((actor) => actor.actorId);
            const endpointEntities = config.expectedEndpointIds.map(
              (endpointId) =>
                dataSource?.entities?.getById(\`m8a-v4-endpoint-\${endpointId}\`)
            );
            const actorEntities = config.expectedActorIds.map((actorId) =>
              dataSource?.entities?.getById(actorId)
            );
            const hud = document.querySelector(
              "[data-m8a-v4-ground-station-scene='true']"
            );
            const stageNodes = Array.from(
              document.querySelectorAll(".m8a-v4-ground-station-scene__stage")
            );
            const nonClaimNodes = Array.from(
              document.querySelectorAll(".m8a-v4-ground-station-scene__nonclaims span")
            );
            const hudText = hud?.textContent?.replace(/\\s+/g, " ").trim() ?? "";
            const visibleText = document.body.innerText;
            const entityText = collectEntityText(dataSource);
            const forbiddenClaimHits = collectForbiddenClaimHits([
              { label: "visible-text", text: visibleText },
              { label: "v4-entity-text", text: entityText },
              {
                label: "v4-state-labels",
                text: [
                  ...state.endpoints.map((endpoint) => endpoint.label),
                  ...state.actors.map((actor) => actor.actorId),
                  state.serviceState.window.handoverPressureReason
                ].join(" ")
              }
            ]);

            assert(
              dataSource &&
                state.dataSourceName === config.expectedDataSourceName &&
                state.dataSourceAttached === true,
              "V4.5 desktop route must attach the V4 data source."
            );
            assert(
              state.endpointCount === 2 &&
                JSON.stringify(endpointIds) ===
                  JSON.stringify(config.expectedEndpointIds) &&
                endpointEntities.every(Boolean) &&
                state.endpoints.every(
                  (endpoint) =>
                    endpoint.precisionBadge === "operator-family precision" &&
                    endpoint.displayPositionIsSourceTruth === false &&
                    endpoint.rawSourceCoordinatesRenderable === false
                ),
              "V4.5 desktop route must render the two accepted ground endpoints: " +
                JSON.stringify(endpointIds)
            );
            assert(
              state.actorCount === 5 &&
                state.orbitActorCounts.leo === 3 &&
                state.orbitActorCounts.meo === 1 &&
                state.orbitActorCounts.geo === 1 &&
                JSON.stringify(actorIds) ===
                  JSON.stringify(config.expectedActorIds) &&
                actorEntities.every(Boolean),
              "V4.5 desktop route must expose 3 LEO, 1 MEO, and 1 GEO actor presence: " +
                JSON.stringify({ actorIds, counts: state.orbitActorCounts })
            );
            assert(
              state.serviceState.truthState === "modeled" &&
                state.serviceState.isNativeRfHandover === false &&
                state.serviceState.measuredLatency === false &&
                state.serviceState.measuredJitter === false &&
                state.serviceState.measuredThroughput === false &&
                JSON.stringify(state.serviceState.timelineWindowIds) ===
                  JSON.stringify(config.expectedWindowIds) &&
                stageNodes.length === config.expectedWindowIds.length &&
                stageNodes.some(
                  (node) =>
                    node instanceof HTMLElement &&
                    node.dataset.active === "true" &&
                    node.getBoundingClientRect().width > 0
                ),
              "V4.5 desktop route must keep the modeled service-state timeline visible."
            );
            assert(
              hud instanceof HTMLElement &&
                rectToPlain(hud).height > 0 &&
                hudText.includes("operator-family precision") &&
                hudText.includes("LEO x3") &&
                hudText.includes("MEO x1") &&
                hudText.includes("GEO x1") &&
                config.requiredVisibleNonClaims.every((claim) =>
                  hudText.includes(claim)
                ) &&
                nonClaimNodes.length === config.requiredVisibleNonClaims.length,
              "V4.5 desktop route must keep compact truth boundary and non-claims visible: " +
                hudText
            );
            assert(
              state.nonClaims.noAircraftEndpoint === true &&
                state.nonClaims.noYkaEndpoint === true &&
                state.nonClaims.noOrdinaryHandsetUe === true &&
                state.nonClaims.noActiveServingSatelliteIdentity === true &&
                state.nonClaims.noActiveGatewayAssignment === true &&
                state.nonClaims.noPairSpecificTeleportPathTruth === true &&
                state.nonClaims.noMeasuredLatencyJitterThroughputTruth === true &&
                state.nonClaims.noNativeRfHandover === true,
              "V4.5 desktop route must keep all forbidden-claim non-claims machine-readable."
            );
            assert(
              forbiddenClaimHits.length === 0,
              "V4.5 forbidden-claim scan found promoted claim text: " +
                JSON.stringify(forbiddenClaimHits)
            );

            return {
              endpoints: endpointIds,
              orbitActorCounts: state.orbitActorCounts,
              timelineWindows: state.serviceState.timelineWindowIds,
              hudRect: rectToPlain(hud),
              nonClaimCount: nonClaimNodes.length
            };
          })(${JSON.stringify({
            expectedDataSourceName: EXPECTED_DATA_SOURCE_NAME,
            expectedEndpointIds: EXPECTED_ENDPOINT_IDS,
            expectedActorIds: EXPECTED_ACTOR_IDS,
            expectedWindowIds: EXPECTED_WINDOW_IDS,
            requiredVisibleNonClaims: REQUIRED_VISIBLE_NON_CLAIMS,
            forbiddenClaimPhrases: FORBIDDEN_CLAIM_PHRASES
          })})`
        );

        await captureScreenshot(client, DESKTOP_SCREENSHOT_PATH);

        await navigateHomepage(client, baseUrl);

        const desktopHomepageResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
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
            const textFor = (element) =>
              element instanceof HTMLElement
                ? [
                    element.innerText,
                    element.getAttribute("aria-label") ?? "",
                    element.getAttribute("title") ?? ""
                  ].join(" ")
                : "";

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const stageStrip = document.querySelector(
              "[data-m8a-v35-orbit-context-stage-strip='true']"
            );
            const v3Icon = document.querySelector(
              "[data-m8a-v36-homepage-handover-icon='true']"
            );
            const v4Entry = document.querySelector(
              "[data-m8a-v44-homepage-ground-station-entry='true']"
            );
            const v3Href =
              v3Icon instanceof HTMLAnchorElement
                ? v3Icon.getAttribute("href")
                : null;
            const v4Href =
              v4Entry instanceof HTMLAnchorElement
                ? v4Entry.getAttribute("href")
                : null;
            const v3Url = v3Href ? new URL(v3Href, window.location.origin) : null;
            const v4Url = v4Href ? new URL(v4Href, window.location.origin) : null;
            const v3Text = textFor(v3Icon);
            const v4Text = textFor(v4Entry);
            const v3Rect = rectToPlain(v3Icon);
            const v4Rect = rectToPlain(v4Entry);

            assert(capture, "Missing runtime capture seam on bare /.");
            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "default" &&
                !capture.firstIntakeOrbitContextActors &&
                !capture.m8aV4GroundStationScene &&
                !document.documentElement.dataset.m8aV4GroundStationRuntimeState &&
                !stageStrip,
              "Bare / must not automatically start V4 or a historical addressed scene."
            );
            assert(
              v4Entry instanceof HTMLAnchorElement &&
                v4Rect &&
                v4Rect.width >= 120 &&
                v4Rect.height >= 36 &&
                v4Href === "${V4_ENTRY_HREF}" &&
                v4Url?.searchParams.get("scenePreset") === "regional" &&
                v4Url?.searchParams.get("m8aV4GroundStationScene") === "1" &&
                /v4/i.test(v4Text) &&
                /ground.station/i.test(v4Text) &&
                /multi.orbit/i.test(v4Text),
              "Homepage must expose the V4 ground-station entry: " +
                JSON.stringify({ v4Href, v4Rect, v4Text })
            );
            assert(
              v3Icon instanceof HTMLAnchorElement &&
                v3Rect &&
                v3Rect.width >= 36 &&
                v3Rect.height >= 36 &&
                v3Url?.searchParams.get("firstIntakeScenarioId") ===
                  "${V3_SCENARIO_ID}" &&
                v3Url?.searchParams.get("firstIntakeAutoplay") === "1" &&
                /historical/i.test(v3Text) &&
                /aviation/i.test(v3Text),
              "Homepage must keep the V3.6 historical aviation entry visible: " +
                JSON.stringify({ v3Href, v3Rect, v3Text })
            );
            assert(
              !/(aircraft endpoint|yka endpoint|handset ue endpoint)/i.test(
                v4Text
              ),
              "V4 homepage entry must not introduce forbidden endpoint claims: " +
                v4Text
            );

            return {
              v3Href,
              v3Rect,
              v4Href,
              v4Rect,
              v4Text
            };
          })()`
        );

        await setViewport(client, NARROW_VIEWPORT);
        await navigateHomepage(client, baseUrl);

        const narrowHomepageResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
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
            const insideViewport = (rect) =>
              rect &&
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= window.innerWidth &&
              rect.bottom <= window.innerHeight;

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const v3Icon = document.querySelector(
              "[data-m8a-v36-homepage-handover-icon='true']"
            );
            const v4Entry = document.querySelector(
              "[data-m8a-v44-homepage-ground-station-entry='true']"
            );
            const v3Rect = rectToPlain(v3Icon);
            const v4Rect = rectToPlain(v4Entry);

            assert(capture, "Missing runtime capture seam on narrow bare /.");
            assert(
              !capture.m8aV4GroundStationScene &&
                !document.documentElement.dataset.m8aV4GroundStationRuntimeState,
              "Narrow bare / must not automatically start V4."
            );
            assert(
              v3Icon instanceof HTMLAnchorElement &&
                v4Entry instanceof HTMLAnchorElement &&
                insideViewport(v3Rect) &&
                insideViewport(v4Rect) &&
                !rectsOverlap(v3Rect, v4Rect),
              "Narrow homepage entry controls must be visible and non-overlapping: " +
                JSON.stringify({ v3Rect, v4Rect })
            );

            return {
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight
              },
              v3Rect,
              v4Rect
            };
          })()`
        );

        await navigateV4Route(client, baseUrl);

        const narrowV4Result = await evaluateRuntimeValue(
          client,
          `((config) => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
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
            const insideViewport = (rect) =>
              rect &&
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= window.innerWidth &&
              rect.bottom <= window.innerHeight;
            const selectedLabelRects = () =>
              Array.from(
                document.querySelectorAll(
                  [
                    ".m8a-v4-ground-station-scene__header",
                    ".m8a-v4-ground-station-scene__endpoint",
                    ".m8a-v4-ground-station-scene__orbit-strip > *",
                    ".m8a-v4-ground-station-scene__stage",
                    ".m8a-v4-ground-station-scene__nonclaims > span"
                  ].join(", ")
                )
              )
                .filter(
                  (element) =>
                    element instanceof HTMLElement &&
                    getComputedStyle(element).display !== "none" &&
                    element.getBoundingClientRect().width > 0 &&
                    element.getBoundingClientRect().height > 0
                )
                .map((element, index) => ({
                  index,
                  text: element.textContent?.replace(/\\s+/g, " ").trim() ?? "",
                  rect: rectToPlain(element)
                }));

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const state =
              capture?.m8aV4GroundStationScene?.getState?.() ?? null;
            const hud = document.querySelector(
              "[data-m8a-v4-ground-station-scene='true']"
            );
            const hudRect = rectToPlain(hud);
            const labelRects = selectedLabelRects();
            const overlaps = [];

            for (let leftIndex = 0; leftIndex < labelRects.length; leftIndex += 1) {
              for (
                let rightIndex = leftIndex + 1;
                rightIndex < labelRects.length;
                rightIndex += 1
              ) {
                const left = labelRects[leftIndex];
                const right = labelRects[rightIndex];

                if (rectsOverlap(left.rect, right.rect)) {
                  overlaps.push({ left, right });
                }
              }
            }

            const protectedCoreSceneRect = {
              left: window.innerWidth * 0.16,
              top: window.innerHeight * 0.18,
              right: window.innerWidth * 0.84,
              bottom: window.innerHeight * 0.62,
              width: window.innerWidth * 0.68,
              height: window.innerHeight * 0.44
            };
            const hudText = hud?.textContent?.replace(/\\s+/g, " ").trim() ?? "";

            assert(capture, "Missing runtime capture seam on narrow V4 route.");
            assert(
              state &&
                state.runtimeState === "${V4_RUNTIME_STATE}" &&
                state.endpointCount === 2 &&
                state.actorCount === 5 &&
                state.orbitActorCounts.leo === 3 &&
                state.orbitActorCounts.meo === 1 &&
                state.orbitActorCounts.geo === 1,
              "Narrow V4 route must keep accepted endpoint and orbit-actor counts."
            );
            assert(
              hud instanceof HTMLElement &&
                hudRect &&
                insideViewport(hudRect) &&
                hudRect.height <= window.innerHeight * 0.36,
              "Narrow V4 HUD must stay compact and inside the viewport: " +
                JSON.stringify({ hudRect, viewport: window.innerHeight })
            );
            assert(
              !rectsOverlap(hudRect, protectedCoreSceneRect),
              "Narrow V4 HUD must not occlude the core scene area: " +
                JSON.stringify({ hudRect, protectedCoreSceneRect })
            );
            assert(
              labelRects.length >= 18 &&
                labelRects.every((entry) => insideViewport(entry.rect)) &&
                overlaps.length === 0,
              "Narrow V4 key labels must not overlap or leave the viewport: " +
                JSON.stringify({ overlaps, labelRects })
            );
            assert(
              config.requiredVisibleNonClaims.every((claim) =>
                hudText.includes(claim)
              ) &&
                hudText.includes("LEO x3") &&
                hudText.includes("MEO x1") &&
                hudText.includes("GEO x1"),
              "Narrow V4 HUD must keep actor counts and non-claim labels visible: " +
                hudText
            );

            return {
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight
              },
              hudRect,
              protectedCoreSceneRect,
              labelCount: labelRects.length
            };
          })(${JSON.stringify({
            requiredVisibleNonClaims: REQUIRED_VISIBLE_NON_CLAIMS
          })})`
        );

        await captureScreenshot(client, NARROW_SCREENSHOT_PATH);

        console.log(
          `M8A-V4.5 visual acceptance/regression smoke passed: ${JSON.stringify(
            {
              desktopV4Result,
              desktopHomepageResult,
              narrowHomepageResult,
              narrowV4Result,
              screenshots: [DESKTOP_SCREENSHOT_PATH, NARROW_SCREENSHOT_PATH]
            },
            null,
            2
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
  process.exit(1);
});
