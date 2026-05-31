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
const outputRoot = path.join(repoRoot, "output/selected-pair-evidence-drawer");

const REQUEST_PATH = SELECTED_PAIR_DEMO_REQUEST_PATH;
const EXPECTED_SCENE_SOURCE_MODE = "tle-first-runtime";
const EXPECTED_SOURCE_TIER = "geometric-derived";
const REQUIRED_DRAWER_HEADINGS = [
  "Evidence summary",
  "Handover events",
  "Handover policy gates",
  "Rain impact evidence",
  "Evidence package",
  "Source boundary"
];
const REQUIRED_REPORT_TEXT = [
  "Selected-pair evidence report",
  "Visibility windows",
  "Handover events",
  "Sources",
  "Assumptions",
  "Models",
  "Runtime data",
  "Raw JSON payload",
  "Download HTML"
];
const FORBIDDEN_POSITIVE_PHRASES = [
  "operator-validated",
  "operator validated",
  "operator-stated capability",
  "operator stated capability",
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "active gateway assignment",
  "pair-specific teleport path",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "native RF handover"
];
const VIEWPORTS = [
  {
    name: "desktop-1440x900",
    width: 1440,
    height: 900,
    screenshot: "desktop-drawer-open.png"
  },
  {
    name: "narrow-390x844",
    width: 390,
    height: 844,
    screenshot: "narrow-drawer-open.png"
  }
];

function serializeRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function assertScreenshot(absolutePath, viewport) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 10_000,
    `Selected-pair evidence drawer screenshot is unexpectedly small: ${JSON.stringify({
      viewport: viewport.name,
      path: serializeRelative(absolutePath),
      size: stats.size
    })}`
  );
}

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 160), index)
      .toLowerCase();

    return /\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\b/.test(
      prefix
    );
  };

  for (const phrase of FORBIDDEN_POSITIVE_PHRASES) {
    const needle = phrase.toLowerCase();
    let index = lowered.indexOf(needle);

    while (index !== -1) {
      if (!isNegated(index)) {
        hits.push({
          phrase,
          context: sourceText
            .slice(Math.max(0, index - 80), index + needle.length + 80)
            .replace(/\s+/g, " ")
            .trim()
        });
      }

      index = lowered.indexOf(needle, index + needle.length);
    }
  }

  return hits;
}

async function waitForSelectedPairEvidenceReady(client) {
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
        const reportButtons = Array.from(
          document.querySelectorAll(".v4-projection-side-panel__download-report[data-report-action='open-html']")
        );

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
          reportButtonCount: reportButtons.length
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
      lastState?.reportButtonCount >= 1
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Selected-pair evidence drawer route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Selected-pair evidence drawer route did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
}

async function installOverlayEventRecorder(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      window.__SELECTED_PAIR_DRAWER_EVENTS__ = [];
      document.addEventListener("selected-pair-overlay-change", (event) => {
        window.__SELECTED_PAIR_DRAWER_EVENTS__.push({
          evidenceDrawerOpen: Boolean(event.detail?.evidenceDrawerOpen),
          stationInfoCardOpen: Boolean(event.detail?.stationInfoCardOpen),
          productInspectorOpen: Boolean(event.detail?.productInspectorOpen),
          blocksTransientHover: Boolean(event.detail?.blocksTransientHover)
        });
      });
    })()`
  );
}

async function inspectEvidenceDrawer(client, label) {
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
      const visibleTextNodes = (scope) => {
        const nodes = [];
        if (!scope) {
          return nodes;
        }
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const parent = node.parentElement;
          const text = normalize(node.textContent);
          if (text && parent && isVisible(parent)) {
            nodes.push(text);
          }
        }
        return nodes;
      };
      const readElement = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect:
          element instanceof HTMLElement
            ? rectToPlain(element.getBoundingClientRect())
            : null,
        text: element instanceof HTMLElement ? normalize(element.textContent) : "",
        visibleText:
          element instanceof HTMLElement ? visibleTextNodes(element).join(" ") : ""
      });

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const drawer = document.getElementById("v4-selected-pair-evidence");
      const trigger = panel?.querySelector(".v4-projection-side-panel__evidence-button");
      const close = drawer?.querySelector(".v4-projection-side-panel__evidence-close");
      const openReportButton = drawer?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      const csvButton = drawer?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='download-csv']"
      );
      const sourceBoundary = drawer?.querySelector("[data-disclosure='sources-non-claims']");
      const hiddenMachineHooks = drawer?.querySelector(
        ".v4-projection-side-panel__evidence-machine-hooks"
      );
      const headings = Array.from(
        drawer?.querySelectorAll(".v4-projection-side-panel__evidence-heading, .v4-projection-side-panel__details-summary") ??
          []
      ).map((element) => normalize(element.textContent));
      const metricLabels = Array.from(
        drawer?.querySelectorAll(".v4-projection-side-panel__evidence-metric-label") ??
          []
      ).map((element) => normalize(element.textContent));
      const healthLabels = Array.from(
        drawer?.querySelectorAll(".v4-projection-side-panel__evidence-health-label") ??
          []
      ).map((element) => normalize(element.textContent));
      const eventRows = Array.from(
        drawer?.querySelectorAll(".v4-projection-side-panel__evidence-row-item") ??
          []
      ).map((element) => normalize(element.textContent));

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
            drawer instanceof HTMLElement ? drawer.dataset.evidenceDrawer ?? null : null,
          scrollHeight: drawer instanceof HTMLElement ? drawer.scrollHeight : null,
          clientHeight: drawer instanceof HTMLElement ? drawer.clientHeight : null
        },
        close: readElement(close),
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
        sourceBoundary: {
          ...readElement(sourceBoundary),
          open: sourceBoundary instanceof HTMLDetailsElement ? sourceBoundary.open : null
        },
        hiddenMachineHooks: readElement(hiddenMachineHooks),
        headings,
        metricLabels,
        healthLabels,
        eventRows,
        activeElement:
          document.activeElement === close
            ? "close"
            : document.activeElement === trigger
              ? "trigger"
              : document.activeElement?.tagName?.toLowerCase() ?? null,
        overlayEvents: window.__SELECTED_PAIR_DRAWER_EVENTS__ ?? []
      };
    })(${JSON.stringify(label)})`
  );
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

async function captureReportOpen(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const drawer = document.getElementById("v4-selected-pair-evidence");
      const button = drawer?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing drawer evidence report button.");
      }

      const originalOpen = window.open;
      let openArgs = null;
      let writtenHtml = "";
      let focused = false;
      let openerValue = "unchanged";
      const fakeWindow = {
        document: {
          open() {
            writtenHtml = "";
          },
          write(value) {
            writtenHtml += String(value);
          },
          close() {}
        },
        focus() {
          focused = true;
        },
        set opener(value) {
          openerValue = value;
        },
        get opener() {
          return openerValue;
        }
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
        openArgs,
        focused,
        openerValue,
        prefix: writtenHtml.slice(0, 120),
        text: writtenHtml
      };
    })()`,
    { awaitPromise: true }
  );
}

function assertDefaultClosed(state, viewport) {
  assert(
    state.route === REQUEST_PATH &&
      state.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      state.panel.state === "ready" &&
      state.panel.sourceTier === EXPECTED_SOURCE_TIER,
    `${viewport.name} must load selected-pair runtime projection state: ${JSON.stringify(
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
    `${viewport.name} evidence drawer must be mounted as closed dialog by default: ${JSON.stringify(
      state.drawer
    )}`
  );
  assert(
    state.trigger.exists &&
      state.trigger.ariaControls === "v4-selected-pair-evidence" &&
      state.trigger.ariaExpanded === "false" &&
      state.trigger.text === "Details & sources",
    `${viewport.name} evidence trigger must point at the drawer and start collapsed: ${JSON.stringify(
      state.trigger
    )}`
  );
}

function assertDrawerOpen(state, viewport) {
  const missingHeadings = REQUIRED_DRAWER_HEADINGS.filter(
    (heading) => !state.headings.includes(heading)
  );
  const missingMetricLabels = ["Available", "Handovers", "Windows", "Events"].filter(
    (label) => !state.metricLabels.includes(label)
  );
  const missingHealthLabels = ["Source tier", "TLE health", "Policy"].filter(
    (label) => !state.healthLabels.includes(label)
  );
  const claimHits = collectPositiveClaimHits(state.drawer.visibleText);

  assert(
    state.drawer.visible &&
      state.drawer.hidden === false &&
      state.drawer.datasetOpen === "true" &&
      state.trigger.ariaExpanded === "true" &&
      state.trigger.text === "Hide details" &&
      state.trigger.ariaLabel === "Close details and sources",
    `${viewport.name} Details & sources trigger must open the drawer through shared overlay state: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger
      }
    )}`
  );
  assert(
    state.activeElement === "close" && state.close.visible,
    `${viewport.name} drawer open must move focus to the close button: ${JSON.stringify(
      {
        activeElement: state.activeElement,
        close: state.close
      }
    )}`
  );
  assertRectInsideViewport(
    state.drawer.rect,
    viewport,
    "selected-pair evidence drawer",
    "Selected-pair evidence drawer smoke"
  );
  assert(
    missingHeadings.length === 0 &&
      missingMetricLabels.length === 0 &&
      missingHealthLabels.length === 0,
    `${viewport.name} drawer must expose evidence summary, handover, policy, rain, package, and source surfaces: ${JSON.stringify(
      {
        missingHeadings,
        headings: state.headings,
        missingMetricLabels,
        metricLabels: state.metricLabels,
        missingHealthLabels,
        healthLabels: state.healthLabels
      }
    )}`
  );
  assert(
    state.openReportButton.visible &&
      state.openReportButton.action === "open-html" &&
      state.csvButton.visible &&
      state.csvButton.action === "download-csv",
    `${viewport.name} drawer must keep report and CSV actions inside the evidence package: ${JSON.stringify(
      {
        openReportButton: state.openReportButton,
        csvButton: state.csvButton
      }
    )}`
  );
  assert(
    state.sourceBoundary.exists &&
      state.sourceBoundary.open === false &&
      /Geometric pair|visibility-derived|Source boundary/i.test(
        state.sourceBoundary.text
      ),
    `${viewport.name} source boundary must stay collapsed but inspectable: ${JSON.stringify(
      state.sourceBoundary
    )}`
  );
  assert(
    state.hiddenMachineHooks.exists &&
      state.hiddenMachineHooks.hidden === true &&
      state.hiddenMachineHooks.visible === false,
    `${viewport.name} machine evidence hooks must not become the primary drawer reading layer: ${JSON.stringify(
      state.hiddenMachineHooks
    )}`
  );
  assert(
    state.overlayEvents.some(
      (event) =>
        event.evidenceDrawerOpen === true &&
        event.blocksTransientHover === true
    ),
    `${viewport.name} drawer open must dispatch selected-pair overlay state: ${JSON.stringify(
      state.overlayEvents
    )}`
  );
  assert(
    claimHits.length === 0,
    `${viewport.name} visible drawer text must not promote operator or measured-service claims: ${JSON.stringify(
      claimHits
    )}`
  );
}

function assertReportOpen(report, viewport) {
  const missingText = REQUIRED_REPORT_TEXT.filter(
    (text) => !report.text.includes(text)
  );

  assert(
    report.openArgs?.target === "_blank" &&
      report.openerValue === null &&
      report.focused === true &&
      report.text.trimStart().startsWith("<!doctype html>") &&
      report.text.includes('data-report-filename="runtime-projection-evidence') &&
      missingText.length === 0,
    `${viewport.name} evidence report action must open a complete selected-pair HTML artifact: ${JSON.stringify(
      {
        openArgs: report.openArgs,
        focused: report.focused,
        openerValue: report.openerValue,
        prefix: report.prefix,
        missingText
      }
    )}`
  );
}

function assertDrawerClosedAfterEscape(state, viewport) {
  assert(
    state.drawer.hidden === true &&
      state.drawer.visible === false &&
      state.drawer.datasetOpen === "false" &&
      state.trigger.ariaExpanded === "false" &&
      state.trigger.text === "Details & sources" &&
      state.trigger.ariaLabel === "Open details and sources" &&
      state.activeElement === "trigger",
    `${viewport.name} Escape must close drawer and return focus to trigger: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger,
        activeElement: state.activeElement
      }
    )}`
  );
  assert(
    state.overlayEvents.some(
      (event) =>
        event.evidenceDrawerOpen === false &&
        event.blocksTransientHover === false
    ),
    `${viewport.name} drawer close must dispatch selected-pair overlay state: ${JSON.stringify(
      state.overlayEvents
    )}`
  );
}

async function verifyViewport(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForSelectedPairEvidenceReady(client);
  await waitForGlobeReady(client, "Selected-pair evidence drawer smoke");
  await installOverlayEventRecorder(client);

  const closed = await inspectEvidenceDrawer(client, `${viewport.name}-closed`);
  assertDefaultClosed(closed, viewport);

  await openEvidenceDrawer(client);
  const open = await inspectEvidenceDrawer(client, `${viewport.name}-open`);
  assertDrawerOpen(open, viewport);

  const report = await captureReportOpen(client);
  assertReportOpen(report, viewport);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    viewport.screenshot
  );
  assertScreenshot(screenshotPath, viewport);

  await closeEvidenceDrawerWithEscape(client);
  const closedAfterEscape = await inspectEvidenceDrawer(
    client,
    `${viewport.name}-closed-after-escape`
  );
  assertDrawerClosedAfterEscape(closedAfterEscape, viewport);

  return {
    viewport: viewport.name,
    route: REQUEST_PATH,
    screenshot: serializeRelative(screenshotPath),
    sourceTier: open.panel.sourceTier,
    sceneSourceMode: open.sceneSourceMode,
    drawerHeadings: open.headings,
    metricLabels: open.metricLabels,
    healthLabels: open.healthLabels,
    eventRowCount: open.eventRows.length,
    reportPrefix: report.prefix,
    overlayEvents: closedAfterEscape.overlayEvents
  };
}

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  ensureOutputRoot(outputRoot);
  const results = [];

  for (const viewport of VIEWPORTS) {
    results.push(await verifyViewport(client, baseUrl, viewport));
  }

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    generatedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    results
  });

  console.log(
    `Selected-pair evidence drawer smoke passed. Manifest: ${serializeRelative(
      manifestPath
    )}`
  );
});
