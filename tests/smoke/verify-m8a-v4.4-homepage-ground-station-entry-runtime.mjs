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
const V4_ENTRY_HREF = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const V4_RUNTIME_STATE = "active-v4.3-continuous-multi-orbit-handover-scene";
const EXPECTED_ENDPOINT_IDS = [
  "tw-cht-multi-orbit-ground-infrastructure",
  "sg-speedcast-singapore-teleport"
];
const VIEWPORT = {
  width: 1440,
  height: 900
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
        `M8A-V4.4 homepage validation hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V4.4 homepage did not reach ready default state: ${JSON.stringify(
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
          search: window.location.search,
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
        `M8A-V4.4 V4 route validation hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V4.4 click did not enter V4.3 runtime seam: ${JSON.stringify(
      lastState
    )}`
  );
}

async function dispatchMouseClick(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
    buttons: 0
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
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
          url: `${baseUrl}${DEFAULT_REQUEST_PATH}`
        });
        await waitForHomepageReady(client);

        const homepageResult = await evaluateRuntimeValue(
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
            const root = document.querySelector(
              "[data-m8a-v44-homepage-ground-station-entry-surface='true']"
            );
            const v3Icon = document.querySelector(
              "[data-m8a-v36-homepage-handover-icon='true']"
            );
            const v4Entry = document.querySelector(
              "[data-m8a-v44-homepage-ground-station-entry='true']"
            );
            const stageStrip = document.querySelector(
              "[data-m8a-v35-orbit-context-stage-strip='true']"
            );
            const v4Href =
              v4Entry instanceof HTMLAnchorElement
                ? v4Entry.getAttribute("href")
                : null;
            const v4Url = v4Href ? new URL(v4Href, window.location.origin) : null;
            const v4Rect = rectToPlain(v4Entry);
            const v4Text = textFor(v4Entry);

            assert(capture, "Missing runtime capture seam on bare /.");
            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "default" &&
                !capture.firstIntakeOrbitContextActors &&
                !capture.m8aV4GroundStationScene &&
                !document.documentElement.dataset.m8aV4GroundStationRuntimeState &&
                !stageStrip,
              "Bare / must not silently start first-intake or V4 runtime state."
            );
            assert(
              root instanceof HTMLElement &&
                root.dataset.homepageEntryMount === "cesium-toolbar" &&
                root.dataset.m8aV44HomepageGroundStationEntrySurface === "true",
              "Homepage V4 entry must mount in the Cesium toolbar."
            );
            assert(
              v3Icon === null,
              "Homepage must not expose the historical V3.6 aviation handover icon."
            );
            assert(
              v4Entry instanceof HTMLAnchorElement &&
                v4Rect &&
                v4Rect.width >= 36 &&
                v4Rect.width <= 44 &&
                v4Rect.height >= 36 &&
                v4Rect.height <= 44 &&
                v4Rect.top <= 12 &&
                v4Rect.right >= window.innerWidth - 16 &&
                v4Href === "${V4_ENTRY_HREF}" &&
                v4Url?.pathname === "/" &&
                v4Url?.searchParams.get("scenePreset") === "regional" &&
                v4Url?.searchParams.get("m8aV4GroundStationScene") === "1" &&
                !v4Url?.searchParams.has("firstIntakeScenarioId") &&
                /v4/i.test(v4Text) &&
                /ground.station/i.test(v4Text) &&
                /multi.orbit/i.test(v4Text) &&
                /taiwan/i.test(v4Text) &&
                /singapore/i.test(v4Text),
              "V4.4 homepage entry must clearly address the ground-station multi-orbit scene: " +
                JSON.stringify({ v4Href, v4Rect, v4Text })
            );
            assert(
              !/(aircraft|aviation|yka|handset|\\bue\\b)/i.test(v4Text),
              "V4.4 entry text must not introduce aircraft, YKA, or handset UE endpoint language: " +
                JSON.stringify(v4Text)
            );

            return {
              rootAria: root.getAttribute("aria-label"),
              v3Present: v3Icon !== null,
              v4Href,
              v4Rect,
              v4Text,
              clickPoint: {
                x: v4Rect.left + v4Rect.width / 2,
                y: v4Rect.top + v4Rect.height / 2
              }
            };
          })()`
        );

        await dispatchMouseClick(client, homepageResult.clickPoint);
        await waitForV4RuntimeReady(client);

        const runtimeResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const params = new URLSearchParams(window.location.search);
            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const state = capture?.m8aV4GroundStationScene?.getState?.() ?? null;
            const endpoints = state?.endpoints ?? [];
            const endpointIds = endpoints.map((endpoint) => endpoint.endpointId);
            const endpointLabels = endpoints
              .map((endpoint) => endpoint.label)
              .join(" ");
            const visibleText = document.body.innerText;

            assert(capture, "Missing capture seam after V4 click.");
            assert(
              params.get("scenePreset") === "regional" &&
                params.get("m8aV4GroundStationScene") === "1" &&
                !params.has("firstIntakeScenarioId"),
              "V4.4 click must navigate to the exact V4 addressed route: " +
                window.location.search
            );
            assert(
              state &&
                state.runtimeState === "${V4_RUNTIME_STATE}" &&
                state.proofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene" &&
                state.directRoute.queryParam === "m8aV4GroundStationScene" &&
                state.directRoute.queryValue === "1",
              "V4.4 click must enter the V4.3 runtime seam."
            );
            assert(
              !capture.firstIntakeOrbitContextActors,
              "V4 route must not mount the historical aviation orbit-context controller."
            );
            assert(
              JSON.stringify(endpointIds) ===
                JSON.stringify(${JSON.stringify(EXPECTED_ENDPOINT_IDS)}) &&
                state.endpointCount === 2 &&
                state.endpoints.every(
                  (endpoint) =>
                    endpoint.precisionBadge === "operator-family precision" &&
                    endpoint.renderPrecision ===
                      "bounded-operator-family-display-anchor"
                ),
              "V4.4 click must land on the accepted ground-station endpoint pair: " +
                JSON.stringify(endpointIds)
            );
            assert(
              !/(aircraft|aviation|yka|handset|\\bue\\b)/i.test(endpointLabels),
              "V4 endpoint labels must not introduce aircraft, YKA, or handset UE: " +
                endpointLabels
            );
            assert(
              state.nonClaims.noAircraftEndpoint === true &&
                state.nonClaims.noYkaEndpoint === true &&
                state.nonClaims.noOrdinaryHandsetUe === true &&
                visibleText.includes("no aircraft") &&
                visibleText.includes("no YKA") &&
                visibleText.includes("no handset UE"),
              "V4 runtime must keep endpoint non-claims visible after homepage entry."
            );

            return {
              search: window.location.search,
              runtimeState: state.runtimeState,
              endpointIds,
              actorCount: state.actorCount,
              proofSeam: state.proofSeam
            };
          })()`
        );

        console.log(
          `M8A-V4.4 homepage ground-station entry smoke passed: ${JSON.stringify(
            {
              homepageResult,
              runtimeResult
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
