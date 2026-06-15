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
import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "../../scripts/helpers/demo-routes.mjs";
import {
  SELECTED_PAIR_DEMO_STATION_A_ID,
  SELECTED_PAIR_DEMO_STATION_B_ID,
  SELECTED_PAIR_DEMO_START_UTC,
  SELECTED_PAIR_DEMO_DURATION_MINUTES
} from "../../scripts/helpers/demo-scenario.mjs";

const DEFAULT_REQUEST_PATH = "/";
const V4_ENTRY_HREF = SELECTED_PAIR_DEMO_REQUEST_PATH;
const V4_RUNTIME_STATE = "active-v4.3-continuous-multi-orbit-handover-scene";
const EXPECTED_STATION_A_ID = SELECTED_PAIR_DEMO_STATION_A_ID;
const EXPECTED_STATION_B_ID = SELECTED_PAIR_DEMO_STATION_B_ID;
const EXPECTED_START_UTC = SELECTED_PAIR_DEMO_START_UTC;
const EXPECTED_DURATION = String(SELECTED_PAIR_DEMO_DURATION_MINUTES);
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

  for (let attempt = 0; attempt < 600; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const state =
          window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.getState?.() ?? null;
        return {
          search: window.location.search,
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          v4RuntimeState: root?.dataset.m8aV4GroundStationRuntimeState ?? null,
          sceneSourceMode: state?.sceneSourceMode ?? null,
          selectedPairOverlayStatus: state?.selectedPairOverlay?.status ?? null,
          projectionPanelMounted: Boolean(
            document.querySelector("[data-v4-projection-side-panel='true']")
          ),
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
      lastState.sceneSourceMode === "tle-first-runtime" &&
      ["ready", "empty"].includes(lastState.selectedPairOverlayStatus) &&
      lastState.projectionPanelMounted === true &&
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
            const v4Entries = Array.from(
              document.querySelectorAll(
                "[data-m8a-v44-homepage-ground-station-entry='true']"
              )
            );
            const v4Entry = v4Entries[0] ?? null;
            const homeButton = document.querySelector(".cesium-home-button");
            const lightingToggle = document.querySelector(
              "[data-lighting-toggle='true']"
            );
            const lightingIcon = lightingToggle?.querySelector(
              ".viewer-lighting-toggle-icon"
            );
            const hudFrame = document.querySelector("[data-hud-frame='true']");
            const statusPanel = document.querySelector(
              "[data-hud-panel='status']"
            );
            const statusPanelComputedVisibility =
              statusPanel instanceof HTMLElement
                ? getComputedStyle(statusPanel).visibility
                : null;
            const statusPanelComputedOpacity =
              statusPanel instanceof HTMLElement
                ? Number.parseFloat(getComputedStyle(statusPanel).opacity)
                : null;
            const timelinePlaceholder = document.querySelector(
              "[data-time-placeholder='true']"
            );
            const stageStrip = document.querySelector(
              "[data-m8a-v35-orbit-context-stage-strip='true']"
            );
            const leoActorCountChip = document.querySelector(
              "[data-leo-actor-count-chip='true']"
            );
            const tleTelemetryChip = document.querySelector(
              "[data-tle-telemetry-chip='true']"
            );
            const viewerMode =
              document.documentElement.dataset.viewerMode ?? null;
            const v4Href =
              v4Entry instanceof HTMLAnchorElement
                ? v4Entry.getAttribute("href")
                : null;
            const v4Url = v4Href ? new URL(v4Href, window.location.origin) : null;
            const v4Rect = rectToPlain(v4Entry);
            const v4Option =
              v4Entry instanceof HTMLElement
                ? v4Entry.dataset.m8aV44HomepageGroundStationIconOption ?? ""
                : "";
            const homeRect = rectToPlain(homeButton);
            const statusRect = rectToPlain(statusPanel);
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
                root.dataset.homepageEntryPlacement === "before-home-button" &&
                root.dataset.m8aV44HomepageGroundStationEntrySurface === "true",
              "Homepage V4 entry must mount in the Cesium toolbar."
            );
            // Post-wave-1 IA: chrome telemetry chips (LEO actor count + TLE
            // date) mount on the homepage and the operator HUD mounts in
            // status-only mode but is visually suppressed via
            // data-viewer-mode="clean-home" (visibility:hidden + opacity:0).
            // The pre-IA legacy path (display:none via hudVisibility="hidden"
            // with width/height=0) remains a valid alternative the assertion
            // accepts. The user-visible truth — "no bottom status HUD on the
            // bare homepage" — is preserved in either path.
            const hudVisuallySuppressedLegacy =
              hudFrame instanceof HTMLElement &&
              hudFrame.dataset.hudVisibility === "hidden" &&
              timelinePlaceholder === null &&
              statusRect &&
              statusRect.width === 0 &&
              statusRect.height === 0;
            const hudVisuallySuppressedPostWave1Chrome =
              hudFrame instanceof HTMLElement &&
              hudFrame.dataset.hudVisibility === "status-only" &&
              viewerMode === "clean-home" &&
              statusPanelComputedVisibility === "hidden" &&
              statusPanelComputedOpacity === 0 &&
              leoActorCountChip instanceof HTMLElement &&
              tleTelemetryChip instanceof HTMLElement;
            assert(
              hudVisuallySuppressedLegacy || hudVisuallySuppressedPostWave1Chrome,
              "Bare homepage must not show the bottom status HUD: " +
                JSON.stringify({
                  hudVisibility: hudFrame?.dataset?.hudVisibility,
                  hasTimelinePlaceholder: timelinePlaceholder !== null,
                  statusRect,
                  viewerMode,
                  statusPanelComputedVisibility,
                  statusPanelComputedOpacity,
                  hasLeoActorCountChip: leoActorCountChip !== null,
                  hasTleTelemetryChip: tleTelemetryChip !== null
                })
            );
            assert(
              v3Icon === null,
              "Homepage must not expose the historical V3.6 aviation handover icon."
            );
            assert(
              v4Entry instanceof HTMLAnchorElement &&
                v4Entries.length === 1 &&
                homeButton instanceof HTMLElement &&
                v4Rect &&
                homeRect &&
                v4Option === "orbit" &&
                v4Rect.width >= 36 &&
                v4Rect.width <= 44 &&
                v4Rect.height >= 36 &&
                v4Rect.height <= 44 &&
                v4Rect.top <= 12 &&
                v4Rect.right <= homeRect.left &&
                homeRect.top <= 12 &&
                v4Href === "${V4_ENTRY_HREF}" &&
                v4Url?.pathname === "/" &&
                v4Url?.searchParams.get("stationA") === "${EXPECTED_STATION_A_ID}" &&
                v4Url?.searchParams.get("stationB") === "${EXPECTED_STATION_B_ID}" &&
                v4Url?.searchParams.get("startUtc") ===
                  "${EXPECTED_START_UTC}" &&
                v4Url?.searchParams.get("durationMinutes") === "${EXPECTED_DURATION}" &&
                !v4Url?.searchParams.has("m8aV4GroundStationScene") &&
                !v4Url?.searchParams.has("firstIntakeScenarioId") &&
                /selected.pair/i.test(v4Text) &&
                /cross.orbit/i.test(v4Text) &&
                /taiwan/i.test(v4Text) &&
                /sansa/i.test(v4Text),
              "V4.4 homepage entry must clearly address the selected-pair projection: " +
                JSON.stringify({ v4Href, v4Rect, v4Option, homeRect, v4Text })
            );
            assert(
              lightingToggle instanceof HTMLButtonElement &&
                lightingIcon instanceof SVGSVGElement &&
                lightingIcon.querySelector("circle") instanceof SVGCircleElement,
              "Lighting toggle must use a sun icon, not the old lightbulb icon."
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
              v4Option,
              homeRect,
              statusRect,
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
            const endpointLabels = endpoints
              .map((endpoint) => endpoint.label)
              .join(" ");
            const projectionPanel = document.querySelector(
              "[data-v4-projection-side-panel='true']"
            );
            const telemetryNonClaims =
              document.documentElement.dataset.m8aV4GroundStationNonClaims ?? "";

            assert(capture, "Missing capture seam after V4 click.");
            assert(
              params.get("stationA") === "${EXPECTED_STATION_A_ID}" &&
                params.get("stationB") === "${EXPECTED_STATION_B_ID}" &&
                params.get("startUtc") === "${EXPECTED_START_UTC}" &&
                params.get("durationMinutes") === "${EXPECTED_DURATION}" &&
                !params.has("m8aV4GroundStationScene") &&
                !params.has("firstIntakeScenarioId"),
              "V4.4 click must navigate to the selected-pair route: " +
                window.location.search
            );
            assert(
              state &&
                state.runtimeState === "${V4_RUNTIME_STATE}" &&
                state.proofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene" &&
                state.sceneSourceMode === "tle-first-runtime" &&
                ["ready", "empty"].includes(state.selectedPairOverlay.status),
              "V4.4 click must enter the selected-pair runtime seam."
            );
            assert(
              !capture.firstIntakeOrbitContextActors,
              "Selected-pair route must not mount the historical aviation orbit-context controller."
            );
            assert(
              state.endpointCount === 2 &&
                /yangmingshan/i.test(endpointLabels) &&
                /sansa|hartebeesthoek/i.test(endpointLabels) &&
                projectionPanel instanceof HTMLElement,
              "V4.4 click must land on the Taiwan selected-pair projection: " +
                JSON.stringify({ endpointLabels, panel: Boolean(projectionPanel) })
            );
            assert(
              !/(aircraft|aviation|yka|handset|\\bue\\b)/i.test(endpointLabels),
              "Selected-pair endpoint labels must not introduce aircraft, YKA, or handset UE: " +
                endpointLabels
            );
            assert(
              state.nonClaims.noAircraftEndpoint === true &&
                state.nonClaims.noYkaEndpoint === true &&
                state.nonClaims.noOrdinaryHandsetUe === true &&
                telemetryNonClaims.includes('"noAircraftEndpoint":true') &&
                telemetryNonClaims.includes('"noYkaEndpoint":true') &&
                telemetryNonClaims.includes('"noOrdinaryHandsetUe":true'),
              "V4 runtime must keep endpoint non-claims machine-readable after homepage entry."
            );

            return {
              search: window.location.search,
              runtimeState: state.runtimeState,
              sceneSourceMode: state.sceneSourceMode,
              selectedPairOverlay: state.selectedPairOverlay,
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
