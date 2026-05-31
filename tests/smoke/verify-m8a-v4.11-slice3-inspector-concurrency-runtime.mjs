import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assert,
  assertRectInsideViewport,
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
  screenshot: "overlay-concurrency-drawer-open.png"
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
        const drawer = document.getElementById("v4-selected-pair-evidence");
        const trigger = panel?.querySelector(".v4-projection-side-panel__evidence-button");
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
          drawerExists: drawer instanceof HTMLElement,
          drawerHidden: drawer instanceof HTMLElement ? drawer.hidden : null,
          triggerExists: trigger instanceof HTMLButtonElement,
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
      lastState?.drawerExists &&
      lastState?.drawerHidden === true &&
      lastState?.triggerExists &&
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
          evidenceDrawerOpen: Boolean(event.detail?.evidenceDrawerOpen),
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
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const readElement = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect:
          element instanceof HTMLElement
            ? rectToPlain(element.getBoundingClientRect())
            : null,
        text: element instanceof HTMLElement ? normalize(element.textContent) : ""
      });

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const drawer = document.getElementById("v4-selected-pair-evidence");
      const trigger = panel?.querySelector(".v4-projection-side-panel__evidence-button");
      const close = drawer?.querySelector(".v4-projection-side-panel__evidence-close");
      const tooltip = document.querySelector(".ground-station-marker-tooltip");
      const stationCard = document.querySelector("[data-ground-station-info-card='true']");
      const openReportButton = drawer?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      const csvButton = drawer?.querySelector(
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
        trigger: {
          ...readElement(trigger),
          ariaControls:
            trigger instanceof HTMLElement ? trigger.getAttribute("aria-controls") : null,
          ariaExpanded:
            trigger instanceof HTMLElement ? trigger.getAttribute("aria-expanded") : null,
          ariaLabel:
            trigger instanceof HTMLElement ? trigger.getAttribute("aria-label") : null
        },
        drawer: {
          ...readElement(drawer),
          role: drawer instanceof HTMLElement ? drawer.getAttribute("role") : null,
          ariaModal:
            drawer instanceof HTMLElement ? drawer.getAttribute("aria-modal") : null,
          ariaLabel:
            drawer instanceof HTMLElement ? drawer.getAttribute("aria-label") : null,
          datasetOpen:
            drawer instanceof HTMLElement ? drawer.dataset.open ?? null : null,
          datasetEvidenceDrawer:
            drawer instanceof HTMLElement ? drawer.dataset.evidenceDrawer ?? null : null
        },
        close: readElement(close),
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
        activeElement:
          document.activeElement === close
            ? "close"
            : document.activeElement === trigger
              ? "trigger"
              : document.activeElement?.tagName?.toLowerCase() ?? null,
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

async function openEvidenceDrawer(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const trigger = document.querySelector(".v4-projection-side-panel__evidence-button");
      if (!(trigger instanceof HTMLButtonElement)) {
        throw new Error("Missing selected-pair Details & sources trigger.");
      }
      trigger.click();
    })()`
  );
  await sleep(180);
}

async function closeEvidenceDrawerWithEscape(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const drawer = document.getElementById("v4-selected-pair-evidence");
      if (!(drawer instanceof HTMLElement)) {
        throw new Error("Missing selected-pair evidence drawer.");
      }
      drawer.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true
        })
      );
    })()`
  );
  await sleep(180);
}

async function forceStationInfoCardBlockingState(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const stationCard = document.querySelector("[data-ground-station-info-card='true']");
      if (!(stationCard instanceof HTMLElement)) {
        throw new Error("Missing selected-pair station info card root.");
      }
      stationCard.hidden = false;
      stationCard.dataset.smokeForcedOpen = "true";
    })()`
  );
  await sleep(60);
}

async function captureReportActionWithoutOverlayMutation(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const drawer = document.getElementById("v4-selected-pair-evidence");
      const trigger = document.querySelector(".v4-projection-side-panel__evidence-button");
      const button = drawer?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      if (!(drawer instanceof HTMLElement) || !(trigger instanceof HTMLElement)) {
        throw new Error("Missing selected-pair drawer or trigger.");
      }
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing selected-pair report button.");
      }

      const beforeEvents = window.__SELECTED_PAIR_OVERLAY_EVENTS__?.length ?? 0;
      const before = {
        drawerHidden: drawer.hidden,
        drawerOpen: drawer.dataset.open ?? null,
        triggerExpanded: trigger.getAttribute("aria-expanded")
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

      return {
        before,
        after: {
          drawerHidden: drawer.hidden,
          drawerOpen: drawer.dataset.open ?? null,
          triggerExpanded: trigger.getAttribute("aria-expanded")
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
    state.drawer.exists &&
      state.drawer.hidden === true &&
      state.drawer.visible === false &&
      state.drawer.datasetEvidenceDrawer === "true" &&
      state.drawer.role === "dialog" &&
      state.drawer.ariaModal === "false" &&
      state.drawer.ariaLabel === "Selected-pair details and sources",
    `Evidence drawer must start closed as the shared overlay dialog: ${JSON.stringify(
      state.drawer
    )}`
  );
  assert(
    state.trigger.exists &&
      state.trigger.ariaControls === "v4-selected-pair-evidence" &&
      state.trigger.ariaExpanded === "false" &&
      state.trigger.text === "Details & sources",
    `Evidence trigger must point at the drawer and start collapsed: ${JSON.stringify(
      state.trigger
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

function assertDrawerOpenSuppressesHover(state) {
  assert(
    state.drawer.visible &&
      state.drawer.hidden === false &&
      state.drawer.datasetOpen === "true" &&
      state.trigger.ariaExpanded === "true" &&
      state.trigger.text === "Hide details" &&
      state.trigger.ariaLabel === "Close details and sources" &&
      state.activeElement === "close",
    `Opening Details & sources must use the shared drawer state and focus close: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger,
        activeElement: state.activeElement
      }
    )}`
  );
  assertRectInsideViewport(
    state.drawer.rect,
    VIEWPORT,
    "selected-pair evidence drawer",
    "Selected-pair overlay concurrency smoke"
  );
  assert(
    state.tooltip.hidden === true &&
      state.overlayEvents.some(
        (event) =>
          event.evidenceDrawerOpen === true &&
          event.stationInfoCardOpen === false &&
          event.productInspectorOpen === false &&
          event.blocksTransientHover === true
      ),
    `Drawer open must suppress transient hover through selected-pair overlay state: ${JSON.stringify(
      {
        tooltip: state.tooltip,
        overlayEvents: state.overlayEvents
      }
    )}`
  );
  assert(
    state.openReportButton.visible &&
      state.openReportButton.action === "open-html" &&
      state.csvButton.visible &&
      state.csvButton.action === "download-csv",
    `Report actions must stay inside the evidence drawer as actions, not overlay owners: ${JSON.stringify(
      {
        openReportButton: state.openReportButton,
        csvButton: state.csvButton
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
    reportState.before.drawerHidden === false &&
      reportState.before.drawerOpen === "true" &&
      reportState.before.triggerExpanded === "true" &&
      JSON.stringify(reportState.before) === JSON.stringify(reportState.after) &&
      reportState.eventCountBefore === reportState.eventCountAfter,
    `Report action must not change overlay open state or dispatch overlay arbitration events: ${JSON.stringify(
      reportState
    )}`
  );
}

function assertDrawerClosedWhileStationCardBlocks(state) {
  assert(
    state.drawer.hidden === true &&
      state.drawer.visible === false &&
      state.drawer.datasetOpen === "false" &&
      state.trigger.ariaExpanded === "false" &&
      state.trigger.text === "Details & sources" &&
      state.activeElement === "trigger",
    `Escape must close the drawer and return focus to the trigger: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger,
        activeElement: state.activeElement
      }
    )}`
  );
  assert(
    state.stationCard.hidden === false &&
      state.overlayEvents.some(
        (event) =>
          event.evidenceDrawerOpen === false &&
          event.stationInfoCardOpen === true &&
          event.productInspectorOpen === false &&
          event.blocksTransientHover === true
      ),
    `Drawer close must preserve blocking state while the station card is visible: ${JSON.stringify(
      {
        stationCard: state.stationCard,
        overlayEvents: state.overlayEvents
      }
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

  await forceTransientHoverVisible(client);
  await openEvidenceDrawer(client);
  const open = await inspectOverlayState(client, "drawer-open-hover-suppressed");
  assertDrawerOpenSuppressesHover(open);

  const reportState = await captureReportActionWithoutOverlayMutation(client);
  assertReportActionDoesNotMutateOverlay(reportState);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    VIEWPORT.screenshot
  );
  assertScreenshot(screenshotPath);

  await forceStationInfoCardBlockingState(client);
  await closeEvidenceDrawerWithEscape(client);
  const closedWithStationCard = await inspectOverlayState(
    client,
    "drawer-closed-station-card-blocks"
  );
  assertDrawerClosedWhileStationCardBlocks(closedWithStationCard);

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    generatedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    viewport: VIEWPORT.name,
    screenshot: serializeRelative(screenshotPath),
    states: {
      closed,
      open,
      reportState,
      closedWithStationCard
    }
  });

  console.log(
    `Selected-pair overlay concurrency smoke passed. Manifest: ${serializeRelative(
      manifestPath
    )}`
  );
});
