import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assert,
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";
import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "../../scripts/helpers/demo-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/selected-pair-overlay-concurrency");

const REQUEST_PATH = SELECTED_PAIR_DEMO_REQUEST_PATH;
const EXPECTED_SCENE_SOURCE_MODE = "tle-first-runtime";
const EXPECTED_SOURCE_TIER = "geometric-derived";
const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900,
  screenshot: "overlay-concurrency-station-card-blocks.png"
};

function serializeRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function assertScreenshot(absolutePath) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 10_000,
    `Selected-pair overlay concurrency screenshot is unexpectedly small: ${JSON.stringify({
      path: serializeRelative(absolutePath),
      size: stats.size
    })}`
  );
}

async function waitForSelectedPairOverlayReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const panel = document.querySelector("[data-v4-projection-side-panel='true']");
        const reportButtons = Array.from(
          document.querySelectorAll(".v4-projection-side-panel__download-report[data-report-action='open-html']")
        );
        const tooltip = document.querySelector(".ground-station-marker-tooltip");
        const stationCard = document.querySelector("[data-ground-station-info-card='true']");

        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          route: window.location.pathname + window.location.search,
          hasViewer: Boolean(capture?.viewer),
          hasScene: Boolean(state),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          selectedPairOverlayStatus: state?.selectedPairOverlay?.status ?? null,
          panelState: panel?.dataset.state ?? null,
          sourceTier: panel?.dataset.sourceTier ?? null,
          reportButtonCount: reportButtons.length,
          tooltipExists: tooltip instanceof HTMLElement,
          stationCardExists: stationCard instanceof HTMLElement
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.route === REQUEST_PATH &&
      lastState?.hasViewer &&
      lastState?.hasScene &&
      lastState?.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      lastState?.selectedPairOverlayStatus === "ready" &&
      lastState?.panelState === "ready" &&
      lastState?.sourceTier === EXPECTED_SOURCE_TIER &&
      lastState?.reportButtonCount >= 1 &&
      lastState?.tooltipExists &&
      lastState?.stationCardExists
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Selected-pair overlay concurrency route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Selected-pair overlay concurrency route did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
}

async function installOverlayEventRecorder(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      window.__SELECTED_PAIR_OVERLAY_EVENTS__ = [];
      document.addEventListener("selected-pair-overlay-change", (event) => {
        window.__SELECTED_PAIR_OVERLAY_EVENTS__.push({
          stationInfoCardOpen: Boolean(event.detail?.stationInfoCardOpen),
          productInspectorOpen: Boolean(event.detail?.productInspectorOpen),
          blocksTransientHover: Boolean(event.detail?.blocksTransientHover)
        });
      });
    })()`
  );
}

async function inspectOverlayState(client, label) {
  return await evaluateRuntimeValue(
    client,
    `((label) => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          element.hidden !== true &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const readElement = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        text: element instanceof HTMLElement ? normalize(element.textContent) : ""
      });

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const tooltip = document.querySelector(".ground-station-marker-tooltip");
      const stationCard = document.querySelector("[data-ground-station-info-card='true']");
      const openReportButton = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      const csvButton = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='download-csv']"
      );
      const productInspector = document.querySelector(
        "[data-m8a-v411-inspector-open='true']"
      );

      return {
        label,
        route: window.location.pathname + window.location.search,
        sceneSourceMode: state?.sceneSourceMode ?? null,
        selectedPairOverlay: state?.selectedPairOverlay ?? null,
        panel: {
          ...readElement(panel),
          state: panel?.dataset.state ?? null,
          sourceTier: panel?.dataset.sourceTier ?? null
        },
        tooltip: readElement(tooltip),
        stationCard: readElement(stationCard),
        productInspector: readElement(productInspector),
        openReportButton: {
          ...readElement(openReportButton),
          action:
            openReportButton instanceof HTMLElement
              ? openReportButton.dataset.reportAction ?? null
              : null
        },
        csvButton: {
          ...readElement(csvButton),
          action:
            csvButton instanceof HTMLElement ? csvButton.dataset.reportAction ?? null : null
        },
        overlayEvents: window.__SELECTED_PAIR_OVERLAY_EVENTS__ ?? []
      };
    })(${JSON.stringify(label)})`
  );
}

async function forceTransientHoverVisible(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const tooltip = document.querySelector(".ground-station-marker-tooltip");
      if (!(tooltip instanceof HTMLElement)) {
        throw new Error("Missing selected-pair marker hover tooltip root.");
      }
      tooltip.hidden = false;
      tooltip.style.left = "120px";
      tooltip.style.top = "120px";
      tooltip.dataset.smokeForcedHover = "true";
    })()`
  );
  await sleep(60);
}

async function openStationInfoCardAndDispatch(client) {
  // Mirror the runtime station-info-card open transition: make the card
  // visible, then publish the canonical overlay-change event the same way
  // station-info-card.broadcastOpen() does, so marker hover suppression and
  // overlay arbitration consumers react exactly as in production.
  await evaluateRuntimeValue(
    client,
    `(() => {
      const stationCard = document.querySelector("[data-ground-station-info-card='true']");
      if (!(stationCard instanceof HTMLElement)) {
        throw new Error("Missing selected-pair station info card root.");
      }
      stationCard.hidden = false;
      stationCard.dataset.smokeForcedOpen = "true";
      document.dispatchEvent(
        new CustomEvent("selected-pair-overlay-change", {
          detail: {
            stationInfoCardOpen: true,
            productInspectorOpen: false,
            blocksTransientHover: true
          }
        })
      );
    })()`
  );
  await sleep(180);
}

async function captureReportActionWithoutOverlayMutation(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const button = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing selected-pair report button.");
      }

      const beforeEvents = window.__SELECTED_PAIR_OVERLAY_EVENTS__?.length ?? 0;
      const tooltip = document.querySelector(".ground-station-marker-tooltip");
      const stationCard = document.querySelector("[data-ground-station-info-card='true']");
      const before = {
        tooltipHidden: tooltip instanceof HTMLElement ? tooltip.hidden : null,
        stationCardHidden:
          stationCard instanceof HTMLElement ? stationCard.hidden : null
      };
      const originalOpen = window.open;
      let openArgs = null;
      let focused = false;
      const fakeWindow = {
        document: {
          open() {},
          write() {},
          close() {}
        },
        focus() {
          focused = true;
        },
        set opener(value) {
          this._opener = value;
        },
        get opener() {
          return this._opener;
        },
        _opener: "unchanged"
      };

      try {
        window.open = (url, target, features) => {
          openArgs = { url, target, features };
          return fakeWindow;
        };
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      } finally {
        window.open = originalOpen;
      }

      const tooltipAfter = document.querySelector(".ground-station-marker-tooltip");
      const stationCardAfter = document.querySelector(
        "[data-ground-station-info-card='true']"
      );

      return {
        before,
        after: {
          tooltipHidden:
            tooltipAfter instanceof HTMLElement ? tooltipAfter.hidden : null,
          stationCardHidden:
            stationCardAfter instanceof HTMLElement ? stationCardAfter.hidden : null
        },
        eventCountBefore: beforeEvents,
        eventCountAfter: window.__SELECTED_PAIR_OVERLAY_EVENTS__?.length ?? 0,
        openArgs,
        focused,
        openerValue: fakeWindow._opener
      };
    })()`,
    { awaitPromise: true }
  );
}

function assertDefaultClosed(state) {
  assert(
    state.route === REQUEST_PATH &&
      state.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      state.selectedPairOverlay?.status === "ready" &&
      state.selectedPairOverlay?.sourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      state.panel.state === "ready" &&
      state.panel.sourceTier === EXPECTED_SOURCE_TIER,
    `Selected-pair overlay concurrency smoke must load the selected-pair route: ${JSON.stringify(
      state
    )}`
  );
  assert(
    state.openReportButton.exists &&
      state.openReportButton.visible &&
      state.openReportButton.action === "open-html" &&
      state.csvButton.exists &&
      state.csvButton.visible &&
      state.csvButton.action === "download-csv",
    `Report actions must render inline in the panel footer as actions, not as overlay owners: ${JSON.stringify(
      {
        openReportButton: state.openReportButton,
        csvButton: state.csvButton
      }
    )}`
  );
  assert(
    state.tooltip.exists &&
      state.tooltip.hidden === true &&
      state.stationCard.exists &&
      state.stationCard.hidden === true &&
      state.productInspector.exists === false,
    `Blocking overlays must start closed without the legacy product inspector: ${JSON.stringify(
      {
        tooltip: state.tooltip,
        stationCard: state.stationCard,
        productInspector: state.productInspector
      }
    )}`
  );
}

function assertReportActionDoesNotMutateOverlay(reportState) {
  assert(
    reportState.openArgs?.target === "_blank" &&
      reportState.focused === true &&
      reportState.openerValue === null,
    `Report action must open an external evidence artifact safely: ${JSON.stringify(
      reportState
    )}`
  );
  assert(
    JSON.stringify(reportState.before) === JSON.stringify(reportState.after) &&
      reportState.eventCountBefore === reportState.eventCountAfter,
    `Report action must not change overlay open state or dispatch overlay arbitration events: ${JSON.stringify(
      reportState
    )}`
  );
}

function assertStationCardBlocksTransientHover(state) {
  assert(
    state.stationCard.exists &&
      state.stationCard.hidden === false &&
      state.overlayEvents.some(
        (event) =>
          event.stationInfoCardOpen === true &&
          event.productInspectorOpen === false &&
          event.blocksTransientHover === true
      ),
    `Opening the station info card must mark the overlay as blocking transient hover: ${JSON.stringify(
      {
        stationCard: state.stationCard,
        overlayEvents: state.overlayEvents
      }
    )}`
  );
  assert(
    state.tooltip.hidden === true && state.tooltip.visible === false,
    `Station info card blocking state must suppress the transient hover tooltip: ${JSON.stringify(
      state.tooltip
    )}`
  );
}

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  ensureOutputRoot(outputRoot);
  await setViewport(client, VIEWPORT);
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForSelectedPairOverlayReady(client);
  await waitForGlobeReady(client, "Selected-pair overlay concurrency smoke");
  await installOverlayEventRecorder(client);

  const closed = await inspectOverlayState(client, "closed");
  assertDefaultClosed(closed);

  const reportState = await captureReportActionWithoutOverlayMutation(client);
  assertReportActionDoesNotMutateOverlay(reportState);

  await forceTransientHoverVisible(client);
  await openStationInfoCardAndDispatch(client);
  const stationCardBlocks = await inspectOverlayState(
    client,
    "station-card-blocks-transient-hover"
  );
  assertStationCardBlocksTransientHover(stationCardBlocks);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    VIEWPORT.screenshot
  );
  assertScreenshot(screenshotPath);

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    generatedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    viewport: VIEWPORT.name,
    screenshot: serializeRelative(screenshotPath),
    states: {
      closed,
      reportState,
      stationCardBlocks
    }
  });

  console.log(
    `Selected-pair overlay concurrency smoke passed. Manifest: ${serializeRelative(
      manifestPath
    )}`
  );
});
